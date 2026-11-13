
const pool = require('../config/database');

// ============================================================
// PUSH DEVICE CONTROLLER
// ============================================================
//
// Device ownership always comes from authMiddleware.
// Never accept a customer user_id from the request body.
//
// Only Expo push tokens are accepted here.
// ============================================================

const isValidExpoPushToken = (token) => {
  if (typeof token !== 'string') {
    return false;
  }

  return /^Expo(nent)?PushToken\[[^\]\s]+\]$/.test(
    token.trim()
  );
};

const getAuthenticatedUserId = (req) => {
  return req.user?.id || req.userId || null;
};

// ============================================================
// REGISTER OR UPDATE A DEVICE
// POST /api/push-devices/register
// ============================================================

const registerPushDevice = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      expo_push_token,
      platform,
      device_id,
    } = req.body || {};

    const token =
      typeof expo_push_token === 'string'
        ? expo_push_token.trim()
        : '';

    const normalizedPlatform =
      typeof platform === 'string'
        ? platform.trim().toLowerCase()
        : '';

    if (!isValidExpoPushToken(token)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Expo push token is required.',
      });
    }

    if (!['ios', 'android'].includes(normalizedPlatform)) {
      return res.status(400).json({
        success: false,
        message: 'Platform must be ios or android.',
      });
    }

    const normalizedDeviceId =
      typeof device_id === 'string'
        ? device_id.trim().slice(0, 255) || null
        : null;

    // A token is uniquely owned by one account.
    // If the same device is now authenticated as another
    // customer, ownership is updated to the authenticated user.
    await pool.query(
      `
      INSERT INTO push_devices (
        user_id,
        expo_push_token,
        platform,
        device_id,
        is_active,
        last_seen_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

      ON CONFLICT (expo_push_token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        device_id = EXCLUDED.device_id,
        is_active = TRUE,
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        token,
        normalizedPlatform,
        normalizedDeviceId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Push device registered successfully.',
    });
  } catch (error) {
    console.error(
      'Register push device error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to register this device.',
    });
  }
};

// ============================================================
// DEACTIVATE A DEVICE
// DELETE /api/push-devices
// ============================================================
//
// The token is deactivated, not deleted.
// This preserves the device registration record while
// preventing future push delivery to that device.
// ============================================================

const unregisterPushDevice = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      expo_push_token,
    } = req.body || {};

    const token =
      typeof expo_push_token === 'string'
        ? expo_push_token.trim()
        : '';

    if (!isValidExpoPushToken(token)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Expo push token is required.',
      });
    }

    await pool.query(
      `
      UPDATE push_devices
      SET
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        user_id = $1
        AND expo_push_token = $2
      `,
      [userId, token]
    );

    return res.status(200).json({
      success: true,
      message: 'Push device deactivated successfully.',
    });
  } catch (error) {
    console.error(
      'Unregister push device error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to deactivate this device.',
    });
  }
};

module.exports = {
  registerPushDevice,
  unregisterPushDevice,
};
