
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — DOJAH WEBHOOK CONTROLLER
//
// Tier 1: BVN / NIN
// Tier 2: Identity + Tier 2 liveness
// Tier 3: Tier 3 liveness
//
// Provider failures are stored as "failed".
// Administrator decisions remain separate.
// ============================================================

// ============================================================
// WEBHOOK SECRET
// ============================================================

const getWebhookSecret = () => {
  const value = process.env.DOJAH_WEBHOOK_SECRET;

  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
};

// ============================================================
// SIGNATURE VERIFICATION
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
// PROVIDER STATUS
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
  [
    'failed',
    'abandoned',
    'rejected',
  ].includes(getVerificationStatus(body));

// ============================================================
// STEP STATUS
// Returns:
// verified | failed | pending
// ============================================================

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
    if (candidate === false) return 'failed';

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
        'abandoned',
        'unsuccessful',
      ].includes(value)
    ) {
      return 'failed';
    }
  }

  return 'pending';
};

// ============================================================
// SCORE VALIDATION
// ============================================================

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
// SAFE FAILURE REASON
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

  return 'Liveness verification failed. Please retry.';
};

// ============================================================
// PRESERVE SUCCESSFUL RESULTS
// ============================================================
const preserveVerified = (currentStatus, newStatus) => {
  const current = String(currentStatus || '')
    .trim()
    .toLowerCase();

  if (current === 'verified') {
    return 'verified';
  }

  return newStatus;
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
    return res.status(400).json({
      received: false,
      message: 'Invalid webhook payload.',
    });
  }

  const reference = getReference(body);

  // ========================================================
  // TEST EVENTS
  // ========================================================

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
      return res.status(200).json({
        received: true,
        test: true,
      });
    }

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

  console.info('[KYC webhook] Event received.', {
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
    //
    // liveness_status is read ONLY as a legacy fallback
    // for previously saved Tier 2 results.
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
         id_provider_validation_result,

         tier_2_liveness_status,
         tier_2_liveness_rejection_reason,

         tier_3_verification_status,
         tier_3_liveness_status,
         tier_3_liveness_rejection_reason,

         liveness_status,

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
        '[KYC webhook] No matching KYC record found.'
      );

      return res.status(200).json({
        received: true,
        matched: false,
      });
    }

    const record = recordResult.rows[0];

    // Do not change status for an event still processing.
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
    // ========================================================

    if (record.dojah_verification_type === 'nin') {
      const governmentData =
        data.government_data &&
        typeof data.government_data === 'object'
          ? data.government_data
          : {};

      const providerStatus = getStepStatus(governmentData);

      const nextProviderResult = failed
        ? 'failed'
        : providerStatus;

      const savedProviderResult =
        record.nin_provider_validation_result === 'verified'
          ? 'verified'
          : preserveVerified(
              record.nin_provider_validation_result,
              nextProviderResult
            );

      // Provider evidence is separate from admin approval.
     
const reviewStatus =
  record.nin_verification_status === 'verified'
    ? 'verified'
    : record.nin_verification_status === 'rejected'
      ? 'rejected'
      : 'pending';
      
      await client.query(
        `UPDATE kyc_records
         SET nin_provider_validation_result = $1::text,

             nin_verification_status = $2::text,

             nin_verified_at = CASE
               WHEN $2::text = 'verified'
                 THEN COALESCE(nin_verified_at, NOW())
               ELSE nin_verified_at
             END,

             nin_rejection_reason = CASE
               WHEN $2::text = 'rejected'
                 THEN nin_rejection_reason
               ELSE NULL
             END,

             dojah_checked_at = NOW(),
             updated_at = NOW()

         WHERE id = $3`,
        [
          savedProviderResult,
          reviewStatus,
          record.id,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        verificationType: 'nin',
        providerResult: savedProviderResult,
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

      const nextProviderResult = failed
        ? 'failed'
        : providerStatus;

      const savedProviderResult =
        record.bvn_provider_validation_result === 'verified'
          ? 'verified'
          : preserveVerified(
              record.bvn_provider_validation_result,
              nextProviderResult
            );

      // Final BVN approval remains an administrator action.
      const nextStatus =
  record.bvn_verification_status === 'verified'
    ? 'verified'
    : record.bvn_verification_status === 'rejected'
      ? 'rejected'
      : 'pending';
      
      await client.query(
        `UPDATE kyc_records
         SET bvn_verification_status = $1::text,

             bvn_verified_at = CASE
               WHEN $1::text = 'verified'
                 THEN COALESCE(bvn_verified_at, NOW())
               ELSE bvn_verified_at
             END,

             bvn_provider_validation_result = $2::text,

             bvn_rejection_reason = CASE
               WHEN $1::text = 'rejected'
                 THEN bvn_rejection_reason
               ELSE NULL
             END,

             dojah_checked_at = NOW(),
             updated_at = NOW()

         WHERE id = $3`,
        [
          nextStatus,
          savedProviderResult,
          record.id,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        verificationType: 'bvn',
        providerResult: savedProviderResult,
        status: nextStatus,
      });
    }

    // ========================================================
    // TIER 3 — LIVENESS ONLY
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
        ? 'failed'
        : providerLivenessStatus;

      const savedLivenessStatus = preserveVerified(
        record.tier_3_liveness_status,
        nextLivenessStatus
      );

      const failureReason =
        savedLivenessStatus === 'failed'
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
               WHEN $1::text = 'failed'
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
          failureReason,
          record.id,
        ]
      );

      console.info(
        '[KYC webhook] Tier 3 liveness result saved.',
        {
          reference,
          providerLivenessStatus,
          savedLivenessStatus,
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
      selfieResult.match_score ??
      selfieData.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score ??
      selfieData.liveness_score
    );

    // Preserve identity provider success.
    const nextIdentityProviderResult = failed
      ? 'failed'
      : identityProviderStatus;

    const savedIdentityProviderResult =
      record.id_provider_validation_result === 'verified'
        ? 'verified'
        : preserveVerified(
            record.id_provider_validation_result,
            nextIdentityProviderResult
          );

    // Preserve old Tier 2 liveness result where necessary.
    const currentTier2LivenessStatus =
      record.tier_2_liveness_status === 'verified' ||
      record.tier_2_liveness_status === 'failed'
        ? record.tier_2_liveness_status
        : record.liveness_status === 'verified'
          ? 'verified'
          : record.liveness_status === 'failed'
            ? 'failed'
            : record.tier_2_liveness_status;

    const nextTier2LivenessStatus = failed
      ? 'failed'
      : livenessProviderStatus;

    const savedTier2LivenessStatus = preserveVerified(
      currentTier2LivenessStatus,
      nextTier2LivenessStatus
    );

    const tier2FailureReason =
      savedTier2LivenessStatus === 'failed'
        ? getLivenessFailureReason(
            body,
            data,
            selfieData
          )
        : null;

    // Identity document review status remains separate
    // from the provider's identity validation result.
    const savedIdentityReviewStatus =
      record.id_verification_status === 'verified'
        ? 'verified'
        : record.id_verification_status === 'rejected'
          ? 'rejected'
          : 'pending';

    await client.query(
      `UPDATE kyc_records
       SET

         id_verification_status = $1::text,

         id_verified_at = CASE
           WHEN $1::text = 'verified'
             THEN COALESCE(id_verified_at, NOW())
           ELSE id_verified_at
         END,

         id_provider_validation_result = $2::text,

         tier_2_liveness_status = $3::text,

         tier_2_liveness_rejection_reason = CASE
           WHEN $3::text = 'failed'
             THEN $4::text
           WHEN $3::text = 'verified'
             THEN NULL
           ELSE tier_2_liveness_rejection_reason
         END,

         verification_status = CASE
           WHEN $2::text = 'failed'
             OR $3::text = 'failed'
             THEN 'failed'
           ELSE 'pending'
         END,

         selfie_match_score = COALESCE(
           $5,
           selfie_match_score
         ),

         liveness_score = COALESCE(
           $6,
           liveness_score
         ),

         dojah_checked_at = NOW(),
         updated_at = NOW()

       WHERE id = $7`,
      [
        savedIdentityReviewStatus,
        savedIdentityProviderResult,
        savedTier2LivenessStatus,
        tier2FailureReason,
        selfieMatchScore,
        livenessScore,
        record.id,
      ]
    );

    console.info(
      '[KYC webhook] Tier 2 results saved.',
      {
        reference,
        identityProviderResult:
          savedIdentityProviderResult,
        identityReviewStatus:
          savedIdentityReviewStatus,
        tier2LivenessStatus:
          savedTier2LivenessStatus,
      }
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      received: true,
      matched: true,
      verificationType: 'identity',
      identityProviderResult:
        savedIdentityProviderResult,
      identityStatus:
        savedIdentityReviewStatus,
      livenessStatus:
        savedTier2LivenessStatus,
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

    // Never log webhook payloads, signatures,
    // BVN, selfie data, or secrets.
    console.error(
      '[KYC webhook] Processing failed.',
      {
        name: error?.name || 'UnknownError',
        code: error?.code || null,
      }
    );

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
