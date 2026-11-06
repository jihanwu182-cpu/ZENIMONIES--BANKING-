
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — DOJAH WEBHOOK CONTROLLER
// Handles Tier 1 BVN/NIN and Tier 2/Tier 3 verification callbacks.
// Tier 2 and Tier 3 liveness statuses are stored separately.
// ============================================================

const getWebhookSecret = () => {
  const value = process.env.DOJAH_WEBHOOK_SECRET;

  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
};

// ============================================================
// SIGNATURE VERIFICATION
// Verify against the original request bytes.
// ============================================================

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

// ============================================================
// REFERENCE EXTRACTION
// ============================================================

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

// ============================================================
// PROVIDER STATUS HELPERS
// ============================================================

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

// A completed flow alone is not proof of successful verification.
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
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) &&
    number >= 0 &&
    number <= 100
    ? number
    : null;
};

// ============================================================
// SAFE LIVENESS FAILURE REASON
// Never save the complete webhook payload or sensitive identifiers.
// ============================================================

const getLivenessFailureReason = (
  body,
  data,
  selfieData
) => {
  const candidates = [
    selfieData?.message,
    selfieData?.reason,
    selfieData?.error_description,
    selfieData?.error?.message,
    selfieData?.data?.message,
    selfieData?.data?.reason,
    data?.message,
    data?.reason,
    data?.error?.message,
    body?.message,
    body?.reason,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;

    const reason = candidate
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
        '[redacted]'
      )
      .replace(
        /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g,
        '[redacted]'
      )
      .replace(/\b\d{6,}\b/g, '[redacted]')
      .replace(/https?:\/\/\S+/gi, '[redacted]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);

    if (reason) return reason;
  }

  return 'Liveness verification was unsuccessful. Please retry.';
};

// ============================================================
// WEBHOOK HANDLER
// ============================================================

const handleDojahWebhook = async (req, res) => {
  console.info('[KYC webhook] Handler entered.', {
    legacySignaturePresent:
      typeof req.headers['x-dojah-signature'] === 'string',

    v2SignaturePresent:
      typeof req.headers['x-dojah-signature-v2'] === 'string',

    rawBodyAvailable: Buffer.isBuffer(req.rawBody),

    webhookSecretConfigured: Boolean(getWebhookSecret()),
  });

  const secret = getWebhookSecret();
  const rawBody = req.rawBody;
  const signature = req.headers['x-dojah-signature'];

  if (!secret) {
    console.error(
      '[KYC webhook] DOJAH_WEBHOOK_SECRET is not configured.'
    );

    return res.status(500).json({
      received: false,
      message: 'Webhook configuration error.',
    });
  }

  if (!Buffer.isBuffer(rawBody)) {
    console.error(
      '[KYC webhook] Original request body is unavailable.'
    );

    return res.status(400).json({
      received: false,
      message: 'Invalid webhook request.',
    });
  }

  // Signature verification remains mandatory.
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

  const reference = getReference(body);

  // Acknowledge test events without modifying customer KYC.
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

    // ========================================================
    // FIND AND LOCK MATCHING KYC RECORD
    // ========================================================

    const recordResult = await client.query(
      `SELECT
         id,
         user_id,
         bvn,
         bvn_verification_status,
         bvn_provider_validation_result,
         nin_verification_status,
         nin_provider_validation_result,
         id_verification_status,
         tier_2_liveness_status,
         tier_3_verification_status,
         tier_3_liveness_status,
         dojah_reference,
         dojah_verification_type
       FROM kyc_records
       WHERE dojah_reference = $1
         AND dojah_verification_type IN (
           'bvn',
           'nin',
           'identity',
           'tier_3_liveness'
         )
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

      return res.status(200).json({
        received: true,
        matched: false,
      });
    }

    const record = recordResult.rows[0];

    // Do not change KYC status for a nonterminal event.
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
    // TIER 1 — NIN
    // A completed widget flow is not approval.
    // Require an explicit positive government_data status.
    // ========================================================

    if (record.dojah_verification_type === 'nin') {
      const governmentData =
        data.government_data &&
        typeof data.government_data === 'object'
          ? data.government_data
          : {};

      const providerStatus = getStepStatus(governmentData);

      const providerResult =
        record.nin_verification_status === 'verified' ||
        record.nin_provider_validation_result === 'verified'
          ? 'verified'
          : !failed && providerStatus === 'verified'
            ? 'verified'
            : failed || providerStatus === 'rejected'
              ? 'rejected'
              : 'pending';

      // A positive Dojah result is evidence for the admin queue,
      // not final account approval.
      const reviewStatus =
        record.nin_verification_status === 'verified'
          ? 'verified'
          : providerResult === 'rejected'
            ? 'rejected'
            : 'pending';

      await client.query(
        `UPDATE kyc_records
         SET nin_provider_validation_result = CASE
               WHEN $1::text = 'pending'
                 THEN COALESCE(nin_provider_validation_result, 'pending')
               ELSE $1::text
             END,
             nin_verification_status = $2::text,
             nin_verified_at = CASE
               WHEN $2::text = 'verified'
                 THEN COALESCE(nin_verified_at, NOW())
               ELSE NULL
             END,
             nin_rejection_reason = CASE
               WHEN $1::text = 'rejected'
                 THEN 'provider_nin_check_failed'
               ELSE NULL
             END,
             dojah_checked_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [providerResult, reviewStatus, record.id]
      );

      // The administrator decision endpoint owns nin_verified.

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        verificationType: 'nin',
        providerResult,
        status: reviewStatus,
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

      const approved =
        !failed && providerStatus === 'verified';

      const explicitlyRejected =
        failed || providerStatus === 'rejected';

      const nextStatus =
        record.bvn_verification_status === 'verified'
          ? 'verified'
          : explicitlyRejected
            ? 'rejected'
            : 'pending';

      const providerResult =
        record.bvn_verification_status === 'verified' ||
        record.bvn_provider_validation_result === 'verified'
          ? 'verified'
          : approved
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
         SET bvn_verification_status = $1::text,
             bvn_verified_at = CASE
               WHEN $1::text = 'verified'
                 THEN COALESCE(bvn_verified_at, NOW())
               ELSE NULL
             END,
             bvn_provider_validation_result = $2::text,
             bvn_rejection_reason = CASE
               WHEN $1::text = 'rejected'
                 THEN 'provider_bvn_check_failed'
               ELSE NULL
             END,
             dojah_checked_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [nextStatus, providerResult, record.id]
      );

      // Do not set or clear users.bvn_verified here.
      // Final approval remains with the administrator.

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
    // TIER 3 — LIVENESS ONLY
    // Address-document approval remains a separate admin action.
    //
    // IMPORTANT:
    // This branch writes ONLY to Tier 3 liveness fields.
    // It does not modify Tier 2 liveness.
    // ========================================================

    if (
      record.dojah_verification_type === 'tier_3_liveness'
    ) {
      const selfieData =
        data.selfie &&
        typeof data.selfie === 'object'
          ? data.selfie
          : {};

      const providerLivenessStatus =
        getStepStatus(selfieData);

      const nextLivenessStatus = failed
        ? 'rejected'
        : providerLivenessStatus;

      // Never downgrade previously verified Tier 3 liveness.
      const savedLivenessStatus =
        record.tier_3_liveness_status === 'verified'
          ? 'verified'
          : nextLivenessStatus;

      const livenessFailureReason =
        savedLivenessStatus === 'rejected'
          ? getLivenessFailureReason(
              body,
              data,
              selfieData
            )
          : null;

      await client.query(
        `UPDATE kyc_records
         SET tier_3_liveness_status = $1::text,

             tier_3_liveness_rejection_reason = CASE
               WHEN $1::text = 'rejected'
                 THEN $2::text
               WHEN $1::text = 'verified'
                 THEN NULL
               ELSE tier_3_liveness_rejection_reason
             END,

             dojah_checked_at = NOW(),
             updated_at = NOW()

         WHERE id = $3`,
        [
          savedLivenessStatus,
          livenessFailureReason,
          record.id,
        ]
      );

      console.info(
        '[KYC webhook] Tier 3 liveness result saved.',
        {
          reference,
          providerLivenessStatus,
          savedLivenessStatus,
          failureReasonCaptured:
            Boolean(livenessFailureReason),
        }
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        verificationType: 'tier_3_liveness',
        livenessStatus: savedLivenessStatus,
        documentReviewRequired: true,
      });
    }

    // ========================================================
    // TIER 2 — IDENTITY + LIVENESS
    //
    // IMPORTANT:
    // This branch writes ONLY to Tier 2 liveness fields.
    // It does not modify Tier 3 liveness.
    // ========================================================

    const governmentData =
      data.government_data &&
      typeof data.government_data === 'object'
        ? data.government_data
        : {};

    const selfieData =
      data.selfie &&
      typeof data.selfie === 'object'
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

    const selfieMatchScore = getScore(
      selfieResult.match_score ?? selfieData.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score ?? selfieData.liveness_score
    );

    // Preserve previously verified identity evidence.
    const savedIdentityStatus =
      record.id_verification_status === 'verified'
        ? 'verified'
        : (
            failed ||
            identityProviderStatus === 'rejected'
          )
          ? 'rejected'
          : identityProviderStatus === 'verified'
            ? 'verified'
            : 'pending';

    // Preserve previously verified Tier 2 liveness evidence.
    // Never read or write the old shared liveness_status field.
    const savedTier2LivenessStatus =
      record.tier_2_liveness_status === 'verified'
        ? 'verified'
        : failed
          ? 'rejected'
          : livenessProviderStatus;

    const tier2LivenessFailureReason =
      savedTier2LivenessStatus === 'rejected'
        ? getLivenessFailureReason(
            body,
            data,
            selfieData
          )
        : null;

    await client.query(
      `UPDATE kyc_records
       SET id_verification_status = $1::text,

           id_verified_at = CASE
             WHEN $1::text = 'verified'
               THEN COALESCE(id_verified_at, NOW())
             ELSE id_verified_at
           END,

           id_rejection_reason = CASE
             WHEN $1::text = 'rejected'
               THEN 'provider_identity_check_failed'
             ELSE NULL
           END,

           tier_2_liveness_status = $2::text,

           tier_2_liveness_rejection_reason = CASE
             WHEN $2::text = 'rejected'
               THEN $3::text
             WHEN $2::text = 'verified'
               THEN NULL
             ELSE tier_2_liveness_rejection_reason
           END,

           id_provider_validation_result = CASE
             WHEN $1::text = 'verified' THEN 'verified'
             WHEN $1::text = 'rejected' THEN 'rejected'
             ELSE id_provider_validation_result
           END,

           verification_status = CASE
             WHEN $1::text = 'rejected'
               OR $2::text = 'rejected'
               THEN 'rejected'
             WHEN $1::text = 'verified'
               AND $2::text = 'verified'
               THEN 'pending'
             ELSE 'pending'
           END,

           selfie_match_score = COALESCE($4, selfie_match_score),

           liveness_score = COALESCE($5, liveness_score),

           dojah_checked_at = NOW(),
           updated_at = NOW()

       WHERE id = $6`,
      [
        savedIdentityStatus,
        savedTier2LivenessStatus,
        tier2LivenessFailureReason,
        selfieMatchScore,
        livenessScore,
        record.id,
      ]
    );

    // The webhook records provider evidence only.
    // It must never approve the user's account, change
    // users.id_verified, or advance kyc_tier.
    // Final approval belongs to the administrator endpoint.

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      received: true,
      matched: true,
      verificationType: 'identity',
      identityStatus: savedIdentityStatus,
      livenessStatus: savedTier2LivenessStatus,
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

    // Never log the payload, signature, BVN, selfie, or secret.
    console.error('[KYC webhook] Processing failed.', {
      name: error?.name || 'UnknownError',
      code: error?.code || null,
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
