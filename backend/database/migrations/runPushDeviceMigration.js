
const pool = require('../../config/database');

// ============================================================
// ZENIMONIES BANKING — PUSH DEVICE MIGRATION
// ============================================================
//
// Stores registered push notification devices.
//
// This migration does NOT:
// - Send push notifications
// - Change transaction notifications
// - Modify customer balances or KYC
// - Automatically enable notification permissions
//
// A token belongs to one user at a time.
// ============================================================

const runPushDeviceMigration = async () => {
  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS push_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id UUID NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        expo_push_token TEXT NOT NULL UNIQUE,

        platform VARCHAR(20) NOT NULL
          CHECK (platform IN ('ios', 'android')),

        device_id VARCHAR(255),

        is_active BOOLEAN NOT NULL DEFAULT TRUE,

        created_at TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        last_seen_at TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS
        idx_push_devices_user
      ON push_devices(user_id);

      CREATE INDEX IF NOT EXISTS
        idx_push_devices_active
      ON push_devices(user_id, is_active);
    `);

    await client.query('COMMIT');

    console.log(
      'ZENIMONIES push device migration completed.'
    );
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    console.error(
      'Push device migration failed:',
      error
    );

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  runPushDeviceMigration,
};
