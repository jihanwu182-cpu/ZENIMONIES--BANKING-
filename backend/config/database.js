
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

const initializeDatabase = async () => {
  // Avoid repeating initialization in the same application process.
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

      // Serialize initialization across application instances.
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

      // Use the repository's existing schema.
      // Do not automatically execute draft migrations 008 or 009.
      console.log('Applying database schema...');
      await client.query(schema);

      // Preserve the existing phone verification column migration.
      console.log(
        'Checking users.phone_verified column...'
      );

      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_verified
        BOOLEAN NOT NULL DEFAULT false;
      `);

      console.log(
        'Database initialization completed successfully.'
      );
    } catch (error) {
      console.error(
        'Database initialization failed:',
        error.message
      );

      // Clear an open failed transaction, if any.
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          // There may be no open transaction to roll back.
        }
      }

      // Permit a later retry if initialization failed.
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
