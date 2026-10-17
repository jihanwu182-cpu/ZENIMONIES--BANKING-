
const crypto = require('crypto');
const pool = require('../config/database');

const getWebhookSecret = () => {
  const value = process.env.DOJAH_WEBHOOK_SECRET;
  return typeof value === 'string' && value.trim()
    ? value
    : null;
};

const verifySignature = (signature, rawBody, secret) => {
  if (typeof signature !== 'string') return false;

  const received = signature.trim().replace(/^sha256=/i, '');

  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest();

  const actual = Buffer.from(received, 'hex');

  return actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected);
};

const getReference = (body) => {
  const values = [
    body?.reference_id,
    body?.data?.reference_id,
    body?.metadata?.reference_id,
  ];

  return values.find(
    value =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      value.trim().length <= 150
  )?.trim() || null;
};

// Only accept explicit, recognized outcomes.
const checkOutcome = (value) => {
  if (value === true) return 'verified';
  if (value === false) return 'rejected';

  if (typeof value !== 'string') return 'pending';

  const normalized = value.trim().toLowerCase();

  if (['success', 'successful', 'verified', 'passed', 'pass'].includes(normalized)) {
    return 'verified';
  }

  if (['failed', 'failure', 'rejected', 'declined', 'fail'].includes(normalized)) {
    return 'rejected';
  }

  return 'pending';
};

const getStepStatus = (step) => {
  if (!step || typeof step !== 'object') return 'pending';

  // Do not treat a generic message or score as a pass.
  return checkOutcome(step.status);
};

const getScore = (value) => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    return null;
  }

  return value;
};

const handleDojahWebhook = async (req, res) => {
  const secret = getWebhookSecret();

  if (!secret) {
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

  if (!verifySignature(
    req.headers['x-dojah-signature'],
    req.rawBody,
    secret
  )) {
    return res.status(401).json({
      success: false,
      message: 'Webhook signature is missing or invalid.',
    });
  }

  const body = req.body;
  const reference = getReference(body);

  if (!reference) {
    // Authenticated delivery, but no safe correlation is possible.
    return res.status(200).json({ success: true, received: true });
  }

  const sessionStatus = String(
    body?.verification_status || ''
  ).trim().toLowerCase();

  const data = body?.data || {};


  // Match the actual EasyOnboard webhook payload.
  const governmentData = data.government_data || {};
  const selfieData = data.selfie || {};

  const idStatus = getStepStatus(governmentData);
  const livenessStatus = getStepStatus(selfieData);

  // Scores are inside selfie.data in the provider payload.
  const livenessScore = getScore(
    selfieData.data?.liveness_score
  );

  const selfieMatchScore = getScore(
    selfieData.data?.match_score
  );


  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT id, user_id, id_verification_status, liveness_status
       FROM kyc_records
       WHERE dojah_reference = $1
         AND dojah_verification_type = 'identity'
       FOR UPDATE`,
      [reference]
    );

    if (!found.rows.length) {
      await client.query('ROLLBACK');

      // Do not reveal whether a customer/reference exists.
      return res.status(200).json({
        success: true,
        received: true,
      });
    }

    const record = found.rows[0];

    // A final, already verified check must not be downgraded by
    // a later or duplicate event.
    const currentId = String(
      record.id_verification_status || ''
    ).toLowerCase();

    const currentLiveness = String(
      record.liveness_status || ''
    ).toLowerCase();

    const sessionCompleted = sessionStatus === 'completed';
const sessionFailed = ['failed', 'abandoned'].includes(sessionStatus);

    const nextId =
      sessionCompleted && idStatus !== 'pending'
        ? idStatus
        : 'pending';

    const nextLiveness =
      sessionCompleted && livenessStatus !== 'pending'
        ? livenessStatus
        : 'pending';

    const preserveId = ['verified', 'approved'].includes(currentId);
    const preserveLiveness = ['verified', 'approved'].includes(currentLiveness);

    await client.query(
      `UPDATE kyc_records
       SET
         id_verification_status = CASE
           WHEN $2 = TRUE THEN id_verification_status
           WHEN $3 <> 'pending' THEN $3
           ELSE id_verification_status
         END,
         id_verified_at = CASE
           WHEN $2 = TRUE THEN id_verified_at
           WHEN $3 = 'verified' THEN COALESCE(id_verified_at, CURRENT_TIMESTAMP)
           ELSE id_verified_at
         END,
         id_rejection_reason = CASE
           WHEN $2 = TRUE THEN id_rejection_reason
           WHEN $3 = 'rejected' THEN 'Identity check did not pass provider verification.'
           ELSE id_rejection_reason
         END,
         liveness_status = CASE
           WHEN $4 = TRUE THEN liveness_status
           WHEN $5 <> 'pending' THEN $5
           ELSE liveness_status
         END,
         dojah_checked_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        record.id,
        preserveId,
        nextId,
        preserveLiveness,
        nextLiveness,
      ]
    );

    // Update only the individual ID flag.
    // Do not approve the whole account or change its tier/limits.
    if (!preserveId && nextId === 'verified') {
      await client.query(
        `UPDATE users
         SET id_verified = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [record.user_id]
      );
    } else if (!preserveId && nextId === 'rejected') {
      await client.query(
        `UPDATE users
         SET id_verified = FALSE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [record.user_id]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      received: true,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error('KYC webhook processing failed.');

    return res.status(500).json({
      success: false,
      message: 'Unable to process webhook.',
    });
  } finally {
    client.release();
  }
};

module.exports = { handleDojahWebhook };
