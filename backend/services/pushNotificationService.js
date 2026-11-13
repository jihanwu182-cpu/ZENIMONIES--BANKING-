const pool = require('../config/database');

const EXPO_PUSH_URL =
  'https://exp.host/--/api/v2/push/send';

const BATCH_SIZE = 100;

// ======================================================
// DEACTIVATE INVALID DEVICE TOKEN
// ======================================================

const deactivateInvalidToken = async (token) => {
  await pool.query(
    `
    UPDATE push_devices
    SET
      is_active = FALSE,
      updated_at = CURRENT_TIMESTAMP
    WHERE expo_push_token = $1
    `,
    [token]
  );
};

// ======================================================
// SEND PUSH NOTIFICATION TO A CUSTOMER
// ======================================================

const sendPushNotificationToUser = async ({
  userId,
  title,
  body,
  data = {},
}) => {
  try {
    if (!userId || !title || !body) {
      return {
        success: false,
        accepted: 0,
        failed: 0,
        message: 'User, title and message are required.',
      };
    }

    const devicesResult = await pool.query(
      `
      SELECT
        expo_push_token,
        platform
      FROM push_devices
      WHERE user_id = $1
        AND is_active = TRUE
      `,
      [userId]
    );

    const devices = devicesResult.rows || [];

    if (devices.length === 0) {
      return {
        success: true,
        accepted: 0,
        failed: 0,
        message: 'No active notification devices.',
      };
    }

    let accepted = 0;
    let failed = 0;

    for (
      let i = 0;
      i < devices.length;
      i += BATCH_SIZE
    ) {
      const batch = devices.slice(
        i,
        i + BATCH_SIZE
      );

      const messages = batch.map((device) => ({
        to: device.expo_push_token,
        title: String(title).slice(0, 100),
        body: String(body).slice(0, 500),

        sound: 'default',

        priority: 'high',

        ...(device.platform === 'android'
          ? { channelId: 'default' }
          : {}),

        data:
          data &&
          typeof data === 'object' &&
          !Array.isArray(data)
            ? data
            : {},
      }));

      const response = await fetch(
        EXPO_PUSH_URL,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        }
      );

      const result = await response.json();

      if (!response.ok || !Array.isArray(result.data)) {
        throw new Error(
          result.message ||
            'Expo push notification request failed.'
        );
      }

      for (let j = 0; j < batch.length; j++) {
        const ticket = result.data[j];
        const device = batch[j];

        if (ticket?.status === 'ok') {
          accepted++;
          continue;
        }

        failed++;

        if (
          ticket?.details?.error ===
          'DeviceNotRegistered'
        ) {
          await deactivateInvalidToken(
            device.expo_push_token
          );
        }
      }
    }

    return {
      success: failed === 0,
      accepted,
      failed,
      message:
        'Push notification submission processed.',
    };
  } catch (error) {
    console.error(
      'PUSH NOTIFICATION SERVICE ERROR:',
      error.message
    );

    return {
      success: false,
      accepted: 0,
      failed: 0,
      message:
        'Unable to submit push notifications.',
    };
  }
};

module.exports = {
  sendPushNotificationToUser,
};
