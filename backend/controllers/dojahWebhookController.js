const crypto = require('crypto');

// ============================================================
// ZENIMONIES BANKING — SECURE DOJAH WEBHOOK RECEIVER
// ============================================================
// - Verifies the webhook signature against the exact raw body.
// - Uses DOJAH_WEBHOOK_SECRET, NOT DOJAH_SECRET_KEY.
// - Does not log customer information or KYC payloads.
// - Does not approve or reject customer KYC automatically.
// ============================================================

const getWebhookSecret = () => {
  const secret = process.env.DOJAH_WEBHOOK_SECRET;

  if (!secret || !secret.trim()) {
    return null;
  }

  return secret;
};

const safeEqualHex = (receivedSignature, expectedSignature) => {
  if (
    typeof receivedSignature !== 'string' ||
    typeof expectedSignature !== 'string'
  ) {
    return false;
  }

  // Support a possible "sha256=" prefix.
  const received = receivedSignature
    .trim()
    .replace(/^sha256=/i, '');

  // SHA-256 HMAC hex signatures contain exactly 64 hex characters.
  if (!/^[a-f0-9]{64}$/i.test(received)) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

const handleDojahWebhook = async (req, res) => {
  try {
    const secret = getWebhookSecret();

    // Fail closed if the webhook secret is missing.
    if (!secret) {
      console.error(
        'Dojah webhook rejected: webhook secret is not configured.'
      );

      return res.status(503).json({
        success: false,
        message: 'Webhook verification is temporarily unavailable.',
      });
    }

    // server.js must preserve the exact incoming request bytes
    // in req.rawBody before express.json() parses the JSON.
    if (!Buffer.isBuffer(req.rawBody)) {
      console.error(
        'Dojah webhook rejected: original request body is unavailable.'
      );

      return res.status(400).json({
        success: false,
        message: 'Unable to verify webhook request.',
      });
    }

    const signature = req.headers['x-dojah-signature'];

    if (typeof signature !== 'string' || !signature.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Webhook signature is missing or invalid.',
      });
    }

    // Dojah webhook signature: HMAC-SHA256 of the exact raw body.
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

    if (!safeEqualHex(signature, expectedSignature)) {
      console.warn('Dojah webhook rejected: signature verification failed.');

      return res.status(401).json({
        success: false,
        message: 'Webhook signature is missing or invalid.',
      });
    }

    // Signature verified. Do not log the body, identity data,
    // BVN, selfie data, or other sensitive customer information.
    console.info('Dojah webhook signature verified.');

    // IMPORTANT:
    // A valid signature proves the request's authenticity,
    // not that the customer's identity checks passed.
    // Keep this receiver non-mutating until the exact final
    // Dojah event schema and reference correlation are confirmed.
    return res.status(200).json({
      success: true,
      received: true,
      message: 'Webhook signature verified.',
    });
  } catch (error) {
    console.error('Dojah webhook processing failed.');

    return res.status(500).json({
      success: false,
      message: 'Unable to process webhook.',
    });
  }
};

module.exports = { handleDojahWebhook };
