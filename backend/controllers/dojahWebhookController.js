
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — DOJAH WEBHOOK CONTROLLER
// Handles Tier 1 BVN and Tier 2 identity/liveness callbacks.
// Signature verification remains mandatory.
// ============================================================

const getWebhookSecret = () => {
  const value = process.env.DOJAH_WEBHOOK_SECRET;
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
};

// ------------------------------------------------------------
// Verify the signature against the original request bytes.
// Never disable this check to make a webhook succeed.
// ------------------------------------------------------------
const verifySignature = (signature, rawBody, secret) => {
  if (
    typeof signature !== 'string' ||
    !Buffer.isBuffer(rawBody) ||
    !secret
  ) {
    return false;
  }

  let received = signature.trim();

  if (received.startsWith('sha256=')) {
    received = received.slice(7);
  }

  if (!/^[a-fA-F0-9]{64}$/.test(received)) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest();

  const actual = Buffer.from(received, 'hex');

  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
};

// ------------------------------------------------------------
// Extract the verification reference from supported locations.
// ------------------------------------------------------------
const getReference = (body) => {
  const candidates = [
    body?.metadata?.reference_id,
    body?.data?.metadata?.reference_id,
    body?.reference_id,
    body?.data?.reference_id,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getVerificationStatus = (body) =>
  String(
    body?.verification_status ??
    body?.data?.verification_status ??
    ''
  ).trim().toLowerCase();

const isCompleted = (body) =>
  [
    'completed',
    'complete',
    'failed',
    'abandoned',
    'rejected',
  ].includes(getVerificationStatus(body));

const isFailed = (body) =>
  ['failed', 'abandoned', 'rejected'].includes(
    getVerificationStatus(body)
  );

// ------------------------------------------------------------
// Read step statuses, including Dojah's nested data structure.
//
// Example:
// data.government_data.status === true
// data.selfie.status === true
//
// A completed flow alone is NOT proof of successful verification.
// ------------------------------------------------------------
const getStepStatus = (step) => {
  if (!step || typeof step !== 'object') {
    return 'pending';
  }

  const candidates = [
    step.status,
    step.verification_status,
    step.data?.status,
    step.data?.verification_status,
  ];

  for (const candidate of candidates) {
    if (candidate === true) return 'verified';
    if (candidate === false) return 'rejected';

    const value = String(candidate ?? '')
      .trim()
      .toLowerCase();

    if (
      [
        'verified',
        'success',
        'successful',
        'approved',
        'passed',
      ].includes(value)
    ) {
      return 'verified';
    }

    if (
      [
        'rejected',
        'failed',
        'failure',
        'declined',
      ].includes(value)
    ) {
      return 'rejected';
    }
  }

  return 'pending';
};

const getScore = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 && number <= 100
    ? number
    : null;
};

// ============================================================
// WEBHOOK HANDLER
// ============================================================
const handleDojahWebhook = async (req, res) => {
  const secret = getWebhookSecret();
  const rawBody = req.rawBody;
  const signature =
    req.headers['x-dojah-signature'];

  // 1. Check server configuration.
  if (!secret) {
    console.error(
      '[KYC webhook] DOJAH_WEBHOOK_SECRET is not configured.'
    );

    return res.status(500).json({
      received: false,
      message: 'Webhook configuration error.',
    });
  }

  // 2. Require the original request body.
  if (!Buffer.isBuffer(rawBody)) {
    console.error(
      '[KYC webhook] Original request body is unavailable.'
    );

    return res.status(400).json({
      received: false,
      message: 'Invalid webhook request.',
    });
  }

  // 3. Verify authenticity before processing any payload.
  if (!verifySignature(signature, rawBody, secret)) {
    console.warn('[KYC webhook] Signature validation failed.', {
      signatureHeaderPresent: typeof signature === 'string',
      rawBodyIsBuffer: Buffer.isBuffer(rawBody),
      rawBodyLength: rawBody.length,
    });

    return res.status(401).json({
      received: false,
      message: 'Invalid signature.',
    });
  }

  // 4. Validate the parsed payload.
  const body = req.body;

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    console.warn('[KYC webhook] Invalid JSON payload.');

    return res.status(400).json({
      received: false,
      message: 'Invalid webhook payload.',
    });
  }

  
  // Extract the verification reference.
  const reference = getReference(body);

  // Dojah test/diagnostic events may contain only event and source.
  // Acknowledge them without modifying any customer's KYC status.
  if (!reference) {
    const eventName =
      typeof body.event === 'string'
        ? body.event.trim().toLowerCase()
        : '';

    const source =
      typeof body.source === 'string'
        ? body.source.trim().toLowerCase()
        : '';

    const isTestEvent =
      eventName.includes('test') ||
      eventName.includes('ping') ||
      source.includes('test');

    if (isTestEvent) {
      console.info('[KYC webhook] Test event acknowledged.', {
        eventName: eventName || null,
        source: source || null,
      });

      return res.status(200).json({
        received: true,
        test: true,
      });
    }

    console.warn(
      '[KYC webhook] Verification reference is missing.',
      {
        topLevelKeys: Object.keys(body).slice(0, 40),
        eventName: eventName || null,
        source: source || null,
      }
    );

    return res.status(400).json({
      received: false,
      message: 'Verification reference is missing.',
    });
  }
  const data =
    body.data && typeof body.data === 'object'
      ? body.data
      : {};

  const verificationStatus = getVerificationStatus(body);
  const completed = isCompleted(body);
  const failed = isFailed(body);

  console.info('[KYC webhook] Verified event received.', {
    reference,
    verificationStatus: verificationStatus || null,
    completed,
    failed,
  });

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // 5. Match the provider reference to an existing KYC record.
    const recordResult = await client.query(
      `SELECT
         id,
         user_id,
         bvn,
         bvn_verification_status,
         id_verification_status,
         liveness_status,
         dojah_reference,
         dojah_verification_type
       FROM kyc_records
       WHERE dojah_reference = $1
         AND dojah_verification_type IN ('bvn', 'identity')
       FOR UPDATE`,
      [reference]
    );

    if (recordResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      console.warn(
        '[KYC webhook] No matching KYC record found.',
        { reference }
      );

      // A validly signed event can be acknowledged without
      // changing any user or KYC record.
      return res.status(200).json({
        received: true,
        matched: false,
      });
    }

    const record = recordResult.rows[0];

    // Do not update KYC based on a nonterminal event.
    if (!completed) {
      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        updated: false,
      });
    }

    // ========================================================
    // TIER 1 — BVN
    // ========================================================
    if (record.dojah_verification_type === 'bvn') {
      const governmentData =
        data.government_data &&
        typeof data.government_data === 'object'
          ? data.government_data
          : {};

      const providerStatus = getStepStatus(governmentData);

      // Approval requires both a completed, nonfailed event
      // and an explicitly successful government-data step.
      const approved =
        !failed && providerStatus === 'verified';

      const explicitlyRejected =
        failed || providerStatus === 'rejected';

      // Unknown/incomplete results remain pending.
      const nextStatus = approved
        ? 'verified'
        : explicitlyRejected
          ? 'rejected'
          : 'pending';

      console.info('[KYC webhook] BVN decision.', {
        reference,
        providerStatus,
        nextStatus,
      });

      
await client.query(
  `UPDATE kyc_records
   SET bvn_verification_status = $1,
       bvn_verified_at = CASE
         WHEN $1::text = 'verified'
           THEN COALESCE(bvn_verified_at, NOW())
         ELSE NULL
       END,
       bvn_provider_validation_result = $2,
       bvn_rejection_reason = CASE
         WHEN $1::text = 'rejected'
           THEN 'provider_bvn_check_failed'
         ELSE NULL
       END,
       dojah_checked_at = NOW(),
       updated_at = NOW()
   WHERE id = $3`,
  [nextStatus, nextStatus, record.id]
);


      if (approved) {
        
await client.query(
  `UPDATE users
   SET bvn_verified = TRUE,
       kyc_tier = GREATEST(kyc_tier, 1),
       updated_at = NOW()
   WHERE id = $1::uuid`,
  [record.user_id]
);

      } else if (explicitlyRejected) {
        await client.query(
          `UPDATE users
           SET bvn_verified = FALSE,
               kyc_status = 'rejected',
               updated_at = NOW()
           WHERE id = $1`,
          [record.user_id]
        );
      }

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        verificationType: 'bvn',
        status: nextStatus,
      });
    }

    // ========================================================
    // TIER 2 — IDENTITY + LIVENESS
    // ========================================================
    const governmentData =
      data.government_data &&
      typeof data.government_data === 'object'
        ? data.government_data
        : {};

    const selfieData =
      data.selfie && typeof data.selfie === 'object'
        ? data.selfie
        : {};

    const selfieResult =
      selfieData.data &&
      typeof selfieData.data === 'object'
        ? selfieData.data
        : {};

    const identityProviderStatus =
      getStepStatus(governmentData);

    const livenessProviderStatus =
      getStepStatus(selfieData);

    const identityStatus = failed
      ? 'rejected'
      : identityProviderStatus;

    const livenessStatus = failed
      ? 'rejected'
      : livenessProviderStatus;

    const selfieMatchScore = getScore(
      selfieResult.match_score ?? selfieData.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score ?? selfieData.liveness_score
    );

    // Preserve an already verified step unless there is an
    // explicit failed event. Never promote pending to verified
    // without a successful provider step status.
    const savedIdentityStatus = failed
      ? 'rejected'
      : record.id_verification_status === 'verified'
        ? 'verified'
        : identityStatus;

    const savedLivenessStatus = failed
      ? 'rejected'
      : record.liveness_status === 'verified'
        ? 'verified'
        : livenessStatus;

    await client.query(
      `UPDATE kyc_records
       SET id_verification_status = $1,
           id_verified_at = CASE
             WHEN $1 = 'verified'
               THEN COALESCE(id_verified_at, NOW())
             ELSE id_verified_at
           END,
           id_rejection_reason = CASE
             WHEN $1 = 'rejected'
               THEN 'provider_identity_check_failed'
             ELSE NULL
           END,
           liveness_status = $2,
           selfie_match_score = COALESCE($3, selfie_match_score),
           liveness_score = COALESCE($4, liveness_score),
           dojah_checked_at = NOW(),
           updated_at = NOW()
       WHERE id = $5`,
      [
        savedIdentityStatus,
        savedLivenessStatus,
        selfieMatchScore,
        livenessScore,
        record.id,
      ]
    );

    if (
      savedIdentityStatus === 'verified' &&
      savedLivenessStatus === 'verified'
    ) {
      await client.query(
        `UPDATE users
         SET id_verified = TRUE,
             kyc_tier = GREATEST(kyc_tier, 2),
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id]
      );
    } else if (
      savedIdentityStatus === 'rejected' ||
      savedLivenessStatus === 'rejected'
    ) {
      await client.query(
        `UPDATE users
         SET id_verified = FALSE,
             kyc_status = 'rejected',
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      received: true,
      matched: true,
      verificationType: 'identity',
      identityStatus: savedIdentityStatus,
      livenessStatus: savedLivenessStatus,
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          '[KYC webhook] Database rollback failed.',
          {
            code: rollbackError.code || null,
          }
        );
      }
    }

    // Log diagnostic details without logging the incoming
    // payload, signature, BVN, selfie, or webhook secret.
    console.error('[KYC webhook] Processing failed.', {
  name: error?.name || 'UnknownError',
  code: error?.code || null,
  message: String(error?.message || 'Unknown processing error'),
  stack: error?.stack || null,
});
    return res.status(500).json({
      received: false,
      message: 'Webhook processing failed.',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  handleDojahWebhook,
};
