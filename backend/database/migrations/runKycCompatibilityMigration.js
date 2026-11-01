'use strict';

const fs = require('fs');
const path = require('path');

const MIGRATION_KEY = '20261101_kyc_schema_compatibility';
const ADVISORY_LOCK_KEY = 726193041;

async function runKycCompatibilityMigration(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('KYC compatibility migration requires a PostgreSQL pool.');
  }

  const sqlPath = path.join(__dirname, '20261101_kyc_schema_compatibility.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  if (!sql.trim()) {
    throw new Error('KYC compatibility migration SQL file is empty.');
  }

  const client = await pool.connect();
  let transactionStarted = false;
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    lockAcquired = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        migration_key VARCHAR(150) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existing = await client.query(
      'SELECT migration_key FROM app_schema_migrations WHERE migration_key = $1',
      [MIGRATION_KEY]
    );

    if (existing.rowCount > 0) {
      console.log('KYC compatibility migration already applied; skipping.');
      return { applied: false, alreadyApplied: true };
    }

    await client.query('BEGIN');
    transactionStarted = true;

    await client.query(sql);

    await client.query(
      'INSERT INTO app_schema_migrations (migration_key) VALUES ($1)',
      [MIGRATION_KEY]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    console.log('KYC compatibility migration applied successfully.');
    return { applied: true, alreadyApplied: false };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('KYC migration rollback failed:', rollbackError.message);
      }
    }

    console.error('KYC compatibility migration failed:', error.message);
    throw error;
  } finally {
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
      } catch (unlockError) {
        console.error('KYC migration advisory lock release failed:', unlockError.message);
      }
    }

    client.release();
  }
}

module.exports = { runKycCompatibilityMigration };
