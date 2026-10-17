
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — SECURE DOJAH WEBHOOK RECEIVER
// ============================================================
// Verifies the exact raw request body.
// Correlates events using the saved Dojah reference.
// Never logs customer identity data or the webhook payload.
// Does not automatically approve or reject KYC.
// ============================================================

const getWebhookSecret = () => {
  const secret = process.env.DOJAH_WEBHOOK_SECRET;
  return typeof secret === 'string' && secret.trim()
    ? secret
    : null;
};

const safeEqualHex = (receivedSignature, expectedSignature) => {
  if (
    typeof receivedSignature !== 'string' ||
    typeof expectedSignature !== 'string'
  ) {
    return false;
  }

  const received = receivedSignature
    .trim()
    .replace(/^sha256=/i, '');

  if (!/^[a-f0-9]{64}$/i.test(received)) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const getReferenceId = (body) => {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidates = [
    body.reference_id,
    body.data?.reference_id,
    body.metadata?.reference_id,
    body.data?.metadata?.reference_id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim() &&
      candidate.trim().length <= 150
    ) {
      return candidate.trim();
    }
  }

  return null;
};

const handleDojahWebhook = async (req, res) => {
  try {
    const secret = getWebhookSecret();

    if (!secret) {
      console.error(
        'KYC webhook unavailable: signing secret is not configured.'
      );

      return res.status(503).json({
        success: false,
        message: 'Webhook verification is temporarily unavailable.',
      });
    }

    if (!Buffer.isBuffer(req.rawBody)) {
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

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');

    if (!safeEqualHex(signature, expectedSignature)) {
      console.warn('KYC webhook rejected: signature verification failed.');

      return res.status(401).json({
        success: false,
        message: 'Webhook signature is missing or invalid.',
      });
    }

    // The signature is valid. Only use the reference for correlation.
    const referenceId = getReferenceId(req.body);

    if (!referenceId) {
      console.warn(
        'KYC webhook accepted but no supported reference was found.'
      );

      // Acknowledge the authenticated delivery without changing KYC.
      return res.status(200).json({
        success: true,
        received: true,
      });
    }

    // Only touch the KYC record associated with this exact reference.
    // Do not change verification status based on an unvalidated event.
    const result = await pool.query(
      `UPDATE kyc_records
       SET dojah_checked_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE dojah_reference = $1
         AND dojah_verification_type = 'identity'
       RETURNING id`,
      [referenceId]
    );

    if (result.rowCount === 0) {
      // Do not disclose whether a reference belongs to a customer.
      console.warn(
        'KYC webhook received with no matching active identity reference.'
      );
    } else {
      console.info('KYC webhook correlated with an identity record.');
    }

    return res.status(200).json({
      success: true,
      received: true,
    });
  } catch (error) {
    // Do not log request bodies, SQL parameters, or identity information.
    console.error('KYC webhook processing failed.');

    return res.status(500).json({
      success: false,
      message: 'Unable to process webhook.',
    });
  }
};

module.exports = { handleDojahWebhook };
