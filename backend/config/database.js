
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

let initializationPromise = null;

const applyNinMigration = async (client) => {
  console.log('Applying NIN and KYC compatibility migration...');

  await client.query('BEGIN');

  try {
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS nin VARCHAR(11),
        ADD COLUMN IF NOT EXISTS nin_verified
          BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE kyc_records
        ADD COLUMN IF NOT EXISTS nin VARCHAR(11),
        ADD COLUMN IF NOT EXISTS nin_verification_status
          VARCHAR(30) NOT NULL DEFAULT 'not_verified',
        ADD COLUMN IF NOT EXISTS nin_verified_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS nin_rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS nin_provider_validation_result
          VARCHAR(30),
        ADD COLUMN IF NOT EXISTS bvn_provider_validation_result
          VARCHAR(30),
        ADD COLUMN IF NOT EXISTS dojah_reference VARCHAR(150),
        ADD COLUMN IF NOT EXISTS dojah_verification_type
          VARCHAR(30),
        ADD COLUMN IF NOT EXISTS dojah_started_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS dojah_checked_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS tier_3_document_public_id
          VARCHAR(500),
        ADD COLUMN IF NOT EXISTS tier_3_document_resource_type
          VARCHAR(30),
        ADD COLUMN IF NOT EXISTS tier_3_document_format
          VARCHAR(30),
        ADD COLUMN IF NOT EXISTS tier_3_selfie_public_id
          VARCHAR(500),
        ADD COLUMN IF NOT EXISTS tier_3_selfie_resource_type
          VARCHAR(30),
        ADD COLUMN IF NOT EXISTS tier_3_selfie_format
          VARCHAR(30);

      CREATE INDEX IF NOT EXISTS idx_kyc_records_user_nin
        ON kyc_records(user_id, nin_verification_status);

      CREATE INDEX IF NOT EXISTS idx_kyc_records_nin
        ON kyc_records(nin)
        WHERE nin IS NOT NULL AND nin <> '';

      CREATE INDEX IF NOT EXISTS idx_kyc_records_dojah_reference
        ON kyc_records(dojah_reference)
        WHERE dojah_reference IS NOT NULL;
    `);

    // Tier 1 accepts either verified BVN or verified NIN.
    // Only promote users with an already verified NIN.
    // Do not downgrade or reset previously approved accounts.
    await client.query(`
      UPDATE users
      SET
        kyc_status = 'verified',
        is_verified = TRUE,
        kyc_tier = GREATEST(COALESCE(kyc_tier, 0), 1),
        account_limit = CASE
          WHEN COALESCE(kyc_tier, 0) < 1
            THEN 300000.00
          ELSE account_limit
        END,
        daily_transfer_limit = CASE
          WHEN COALESCE(kyc_tier, 0) < 1
            THEN 50000.00
          ELSE daily_transfer_limit
        END
      WHERE nin_verified = TRUE
        AND kyc_status IN (
          'pending',
          'under_review',
          'not_verified',
          'rejected',
          'approved'
        );
    `);

    await client.query('COMMIT');

    console.log(
      'NIN and KYC compatibility migration completed successfully.'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const initializeDatabase = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const schemaPath = path.join(
      __dirname,
      '../database/schema.sql'
    );

    let client;
    let lockAcquired = false;

    try {
      console.log('Starting database initialization...');

      if (!process.env.DATABASE_URL) {
        throw new Error(
          'DATABASE_URL is not configured.'
        );
      }

      if (!fs.existsSync(schemaPath)) {
        throw new Error(
          `Database schema file not found: ${schemaPath}`
        );
      }

      client = await pool.connect();

      await client.query(
        'SELECT pg_advisory_lock($1, $2)',
        [712345, 9009]
      );

      lockAcquired = true;

      const schema = fs.readFileSync(
        schemaPath,
        'utf8'
      );

      if (!schema.trim()) {
        throw new Error(
          'Database schema file is empty.'
        );
      }

      console.log('Applying database schema...');
      await client.query(schema);

      console.log(
        'Checking users.phone_verified column...'
      );

      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_verified
        BOOLEAN NOT NULL DEFAULT false;
      `);

      // Existing NIN and KYC migration.
      await applyNinMigration(client);

      // New announcement migration.
      // This uses the existing pool and does not replace
      // or modify the customer notification system.
      console.log('Applying announcement migration...');

      const {
        runAnnouncementMigration,
      } = require(
        '../database/migrations/runAnnouncementMigration'
      );

      await runAnnouncementMigration();
  // ========================================================
// PUSH DEVICE REGISTRATION MIGRATION
// ========================================================

console.log('Applying push device migration...');

const {
  runPushDeviceMigration,
} = require(
  '../database/migrations/runPushDeviceMigration'
);

await runPushDeviceMigration();
      // Existing account-number diagnostic checks.
      const accountNumberCheck = await client.query(`
        SELECT
          column_name,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'accounts'
          AND column_name = 'account_number';
      `);

      const accountTriggerCheck = await client.query(`
        SELECT
          trigger_name,
          action_timing,
          event_manipulation,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
          AND event_object_table = 'accounts';
      `);

      console.log(
        'ACCOUNT NUMBER COLUMN CHECK:',
        JSON.stringify(accountNumberCheck.rows)
      );

      console.log(
        'ACCOUNT NUMBER TRIGGER CHECK:',
        JSON.stringify(accountTriggerCheck.rows)
      );

      console.log(
        'Database initialization completed successfully.'
      );
    } catch (error) {
      console.error(
        'Database initialization failed:',
        error.message
      );

      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          // No open transaction may exist.
        }
      }

      initializationPromise = null;
      throw error;
    } finally {
      if (client) {
        if (lockAcquired) {
          try {
            await client.query(
              'SELECT pg_advisory_unlock($1, $2)',
              [712345, 9009]
            );
          } catch (error) {
            console.error(
              'Could not release database initialization lock:',
              error.message
            );
          }
        }

        client.release();
      }
    }
  })();

  return initializationPromise;
};

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;
