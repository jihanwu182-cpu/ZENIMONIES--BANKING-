
const pool = require('../../config/database');

const runAlatSessionExpirationMigration = async () => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    await client.query(`
      ALTER TABLE alat_onboarding_sessions
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alat_sessions_expiration
      ON alat_onboarding_sessions (status, expires_at)
      WHERE expires_at IS NOT NULL;
    `);

    await client.query('COMMIT');
    transactionStarted = false;

    console.log('ALAT session expiration migration applied.');
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }

    console.error('ALAT session expiration migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  runAlatSessionExpirationMigration,
};
