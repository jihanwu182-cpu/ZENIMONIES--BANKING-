
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// SMS ALERT PREFERENCES CONTROLLER
// ============================================================

// GET /api/sms-preferences
// Load preferences for the authenticated user.

const getSmsPreferences = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await pool.query(
      `
        SELECT
          transaction_alerts,
          security_alerts,
          promotional_alerts
        FROM sms_preferences
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );

    // A new user may not have a preferences row yet.
    // Return the same defaults as the SQL migration.
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        preferences: {
          transaction_alerts: true,
          security_alerts: true,
          promotional_alerts: false,
        },
      });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      preferences: {
        transaction_alerts:
          row.transaction_alerts === true,

        security_alerts:
          row.security_alerts === true,

        promotional_alerts:
          row.promotional_alerts === true,
      },
    });
  } catch (error) {
    console.error(
      'Get SMS preferences error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load SMS preferences.',
    });
  }
};

// PUT /api/sms-preferences
// Create or update preferences for the authenticated user.

const updateSmsPreferences = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      transaction_alerts,
      security_alerts,
      promotional_alerts,
    } = req.body || {};

    // Require actual booleans, not strings such as "true".
    if (
      typeof transaction_alerts !== 'boolean' ||
      typeof security_alerts !== 'boolean' ||
      typeof promotional_alerts !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'All SMS preference fields must be true or false.',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO sms_preferences (
          user_id,
          transaction_alerts,
          security_alerts,
          promotional_alerts,
          updated_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)

        ON CONFLICT (user_id)
        DO UPDATE SET
          transaction_alerts = EXCLUDED.transaction_alerts,
          security_alerts = EXCLUDED.security_alerts,
          promotional_alerts = EXCLUDED.promotional_alerts,
          updated_at = CURRENT_TIMESTAMP

        RETURNING
          transaction_alerts,
          security_alerts,
          promotional_alerts
      `,
      [
        userId,
        transaction_alerts,
        security_alerts,
        promotional_alerts,
      ]
    );

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      message: 'SMS preferences saved successfully.',
      preferences: {
        transaction_alerts:
          row.transaction_alerts === true,

        security_alerts:
          row.security_alerts === true,

        promotional_alerts:
          row.promotional_alerts === true,
      },
    });
  } catch (error) {
    console.error(
      'Update SMS preferences error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to save SMS preferences.',
    });
  }
};

module.exports = {
  getSmsPreferences,
  updateSmsPreferences,
};
