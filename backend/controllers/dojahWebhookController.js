const crypto = require('crypto');

// ============================================================
// DOJAH WEBHOOK RECEIVER
// ============================================================
//
// This first receiver is intentionally non-mutating.
//
// We do NOT mark a customer as verified from an unknown payload
// shape. The exact Dojah KYC Widget webhook payload must first be
// observed from the Sandbox subscription.
//
// Once the real payload is confirmed, this handler will be
// extended to update the correct KYC record and user status.
// ============================================================

const getPayloadKeys = (value, prefix = '') => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const keys = [];

  for (const key of Object.keys(value)) {
    const path = prefix
      ? `${prefix}.${key}`
      : key;

    keys.push(path);

    if (
      value[key] &&
      typeof value[key] === 'object' &&
      !Array.isArray(value[key])
    ) {
      keys.push(
        ...getPayloadKeys(
          value[key],
          path
        )
      );
    }
  }

  return keys;
};

const getRequestFingerprint = (req) => {
  try {
    const body = JSON.stringify(
      req.body || {}
    );

    return crypto
      .createHash('sha256')
      .update(body)
      .digest('hex');
  } catch {
    return null;
  }
};

const handleDojahWebhook = async (
  req,
  res
) => {
  try {
    const payload =
      req.body || {};

    const fingerprint =
      getRequestFingerprint(req);

    const payloadKeys =
      getPayloadKeys(payload);

    // ----------------------------------------------------------
    // SECURITY
    // ----------------------------------------------------------
    //
    // NEVER log the complete Dojah payload.
    //
    // KYC payloads can contain sensitive information such as:
    //
    // - BVN
    // - NIN
    // - phone number
    // - date of birth
    // - identity information
    // - document information
    // - biometric information
    //
    // ----------------------------------------------------------

    console.log(
      '============================================'
    );

    console.log(
      'DOJAH WEBHOOK RECEIVED'
    );

    console.log(
      '============================================'
    );

    console.log(
      'Content-Type:',
      req.headers[
        'content-type'
      ] || null
    );

    console.log(
      'Event header:',
      req.headers[
        'x-dojah-event'
      ] || null
    );

    console.log(
      'Webhook signature header present:',
      Boolean(
        req.headers[
          'x-dojah-signature'
        ]
      )
    );

    console.log(
      'Payload fingerprint:',
      fingerprint
    );

    console.log(
      'Payload key paths:',
      payloadKeys
    );

    console.log(
      '============================================'
    );

    // ----------------------------------------------------------
    // IMPORTANT
    // ----------------------------------------------------------
    //
    // We intentionally acknowledge the webhook without changing
    // any customer record.
    //
    // We first need the real Dojah Sandbox payload so we can map
    // the actual provider result correctly.
    //
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      received: true,

      message:
        'Dojah webhook received successfully.',
    });
  } catch (error) {
    console.error(
      'Dojah webhook receiver error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Unable to process Dojah webhook.',
    });
  }
};

module.exports = {
  handleDojahWebhook,
};
