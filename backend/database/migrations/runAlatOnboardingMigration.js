
const pool = require('../../config/database');

// ============================================================
// ZENIMONIES — ALAT ONBOARDING SESSION MIGRATION
// ============================================================

const runAlatOnboardingMigration = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS alat_onboarding_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id UUID NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        verification_type VARCHAR(10) NOT NULL
          CHECK (verification_type IN ('BVN', 'NIN')),

        correlation_id VARCHAR(255) UNIQUE,

        status VARCHAR(30) NOT NULL DEFAULT 'initiated'
          CHECK (
            status IN (
              'initiated',
              'verified',
              'pending',
              'completed',
              'failed',
              'expired'
            )
          ),

        callback_success BOOLEAN,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        completed_at TIMESTAMP
      );
    `);

    // Prevent multiple active sessions for one customer.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_alat_onboarding_one_active_session_per_user
      ON alat_onboarding_sessions(user_id)
      WHERE status IN (
        'initiated',
        'verified',
        'pending'
      );
    `);

    // Efficiently locate a session by correlation ID.
    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_alat_onboarding_correlation_id
      ON alat_onboarding_sessions(correlation_id)
      WHERE correlation_id IS NOT NULL;
    `);

    // Efficiently retrieve a customer's onboarding history.
    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_alat_onboarding_user_created
      ON alat_onboarding_sessions(user_id, created_at DESC);
    `);

    await client.query('COMMIT');

    console.log(
      'ALAT onboarding-session migration completed successfully.'
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'ALAT migration rollback failed:',
        rollbackError.message
      );
    }

    console.error(
      'ALAT onboarding-session migration failed:',
      error.message
    );

    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  runAlatOnboardingMigration,
};
