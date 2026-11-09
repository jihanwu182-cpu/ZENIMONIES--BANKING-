const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — DOJAH WEBHOOK CONTROLLER
//
// Tier 1: BVN / NIN — automatic approval after both checks pass
// Tier 2: Identity + Tier 2 liveness
// Tier 3: Tier 3 liveness
//
// Provider failures are stored as "failed".
// Tier 2 and Tier 3 review workflows remain separate.
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
         tier_2_bvn_provider_validation_result,

         nin_verification_status,
         nin_provider_validation_result,

         tier_1_liveness_status,
         tier_1_liveness_verified_at,
         tier_1_liveness_rejection_reason,

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
      // A previous attempt may have been archived when the customer
      // started a newer verification. Never apply an archived webhook
      // to the current kyc_records row.
      const archivedResult = await client.query(
        `SELECT
           id,
           kyc_record_id,
           verification_type,
           attempt_status,
           archived_at
         FROM kyc_verification_attempts
         WHERE reference = $1
         LIMIT 1`,
        [reference]
      );

      if (archivedResult.rows.length > 0) {
        const archivedAttempt = archivedResult.rows[0];

        await client.query('ROLLBACK');
        transactionStarted = false;

        console.info(
          '[KYC webhook] Reference belongs to an archived verification attempt; no current KYC record was changed.',
          {
            archivedAttemptFound: true,
            verificationType:
              archivedAttempt.verification_type || null,
            attemptStatus:
              archivedAttempt.attempt_status || null,
            archivedAt:
              archivedAttempt.archived_at || null,
          }
        );

        return res.status(200).json({
          received: true,
          matched: false,
          archived: true,
          updated: false,
        });
      }

      const typeMismatchResult = await client.query(
        `SELECT
           id,
           dojah_verification_type
         FROM kyc_records
         WHERE dojah_reference = $1
         LIMIT 1`,
        [reference]
      );

      await client.query('ROLLBACK');
      transactionStarted = false;

      if (typeMismatchResult.rows.length > 0) {
        console.warn(
          '[KYC webhook] Reference exists on a current KYC record with an unsupported or unexpected verification type.',
          {
            currentRecordFound: true,
            verificationType:
              typeMismatchResult.rows[0].dojah_verification_type || null,
          }
        );
      } else {
        console.warn(
          '[KYC webhook] Reference was not found in active or archived KYC attempts.',
          {
            activeMatch: false,
            archivedMatch: false,
          }
        );
      }

      return res.status(200).json({
        received: true,
        matched: false,
        archived: false,
        updated: false,
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
    // Automatic approval only when:
    // 1. The webhook is completed successfully.
    // 2. Government NIN verification passes.
    // 3. Facial liveness passes.
    // ========================================================

    if (record.dojah_verification_type === 'nin') {
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

      const governmentStatus =
        getStepStatus(governmentData);

      const livenessStatus =
        getStepStatus(selfieData);

      const providerStatus = failed
        ? 'failed'
        : governmentStatus;

      const savedProviderResult = preserveVerified(
        record.nin_provider_validation_result,
        providerStatus
      );

      const savedLivenessStatus = preserveVerified(
        record.tier_1_liveness_status,
        failed ? 'failed' : livenessStatus
      );

      const checksPassed =
        !failed &&
        verificationStatus === 'completed' &&
        governmentStatus === 'verified' &&
        livenessStatus === 'verified';

      const reviewStatus =
        record.nin_verification_status === 'verified'
          ? 'verified'
          : record.nin_verification_status === 'rejected'
            ? 'rejected'
            : checksPassed
              ? 'verified'
              : 'pending';

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

             tier_1_liveness_status = $3::text,

             tier_1_liveness_verified_at = CASE
               WHEN $3::text = 'verified'
                 THEN COALESCE(tier_1_liveness_verified_at, NOW())
               ELSE tier_1_liveness_verified_at
             END,

             tier_1_liveness_rejection_reason = CASE
               WHEN $3::text = 'failed'
                 THEN $4::text
               WHEN $3::text = 'verified'
                 THEN NULL
               ELSE tier_1_liveness_rejection_reason
             END,

             dojah_checked_at = NOW(),
             updated_at = NOW()

         WHERE id = $5`,
        [
          savedProviderResult,
          reviewStatus,
          savedLivenessStatus,
          failureReason,
          record.id,
        ]
      );

      if (reviewStatus === 'verified') {
        await client.query(
          `UPDATE users
           SET nin_verified = TRUE,
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
        verificationType: 'nin',
        providerResult: savedProviderResult,
        livenessStatus: savedLivenessStatus,
        status: reviewStatus,
        tier1Approved: reviewStatus === 'verified',
      });
    }

    // ========================================================
    // TIER 1 — BVN
    // Automatic approval only when:
    // 1. The webhook is completed successfully.
    // 2. Government BVN verification passes.
    // 3. Facial liveness passes.
    // ========================================================

    if (record.dojah_verification_type === 'bvn') {
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

      const governmentStatus =
        getStepStatus(governmentData);

      const livenessStatus =
        getStepStatus(selfieData);

      const providerStatus = failed
        ? 'failed'
        : governmentStatus;

      const savedProviderResult = preserveVerified(
        record.bvn_provider_validation_result,
        providerStatus
      );

      const savedLivenessStatus = preserveVerified(
        record.tier_1_liveness_status,
        failed ? 'failed' : livenessStatus
      );

      const checksPassed =
        !failed &&
        verificationStatus === 'completed' &&
        governmentStatus === 'verified' &&
        livenessStatus === 'verified';

      const reviewStatus =
        record.bvn_verification_status === 'verified'
          ? 'verified'
          : record.bvn_verification_status === 'rejected'
            ? 'rejected'
            : checksPassed
              ? 'verified'
              : 'pending';

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

             tier_1_liveness_status = $3::text,

             tier_1_liveness_verified_at = CASE
               WHEN $3::text = 'verified'
                 THEN COALESCE(tier_1_liveness_verified_at, NOW())
               ELSE tier_1_liveness_verified_at
             END,

             tier_1_liveness_rejection_reason = CASE
               WHEN $3::text = 'failed'
                 THEN $4::text
               WHEN $3::text = 'verified'
                 THEN NULL
               ELSE tier_1_liveness_rejection_reason
             END,

             dojah_checked_at = NOW(),
             updated_at = NOW()

         WHERE id = $5`,
        [
          reviewStatus,
          savedProviderResult,
          savedLivenessStatus,
          failureReason,
          record.id,
        ]
      );

      if (reviewStatus === 'verified') {
        await client.query(
          `UPDATE users
           SET bvn_verified = TRUE,
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
        providerResult: savedProviderResult,
        livenessStatus: savedLivenessStatus,
        status: reviewStatus,
        tier1Approved: reviewStatus === 'verified',
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
    // TIER 2 — BVN MATCH + GOVERNMENT ID + LIVENESS
    //
    // Provider checks:
    // 1. Submitted BVN matches existing verified Tier 1 BVN.
    // 2. Returned government BVN matches existing Tier 1 BVN.
    // 3. Government-issued ID verification passes.
    // 4. Selfie/liveness verification passes.
    //
    // Final Tier 2 approval remains administrator-controlled.
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

    const idData =
      data.id &&
      typeof data.id === 'object'
        ? data.id
        : {};

    const governmentIdStatus =
      getStepStatus(idData);

    const livenessProviderStatus =
      getStepStatus(selfieData);

    // --------------------------------------------------------
    // TIER 1 BVN MATCH
    // --------------------------------------------------------

    const normalizeBvn = (value) => {
      if (
        typeof value !== 'string' &&
        typeof value !== 'number'
      ) {
        return null;
      }

      const normalized = String(value).replace(/\D/g, '');

      return normalized.length === 11
        ? normalized
        : null;
    };

    const submittedBvnCandidates = [
      body.value,
      body.verification_value,
      data.value,
      data.verification_value,
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ''
      )
      .map(normalizeBvn);

    const submittedBvnValid =
      submittedBvnCandidates.length > 0 &&
      submittedBvnCandidates.every(Boolean);

    const submittedBvn =
      submittedBvnValid
        ? submittedBvnCandidates[0]
        : null;

    const returnedBvn = normalizeBvn(
      governmentData?.data?.bvn?.entity?.bvn
    );

    const tier1Bvn = normalizeBvn(record.bvn);

    const tier1BvnAlreadyVerified =
      String(record.bvn_verification_status || '')
        .trim()
        .toLowerCase() === 'verified';

    const submittedBvnMatchesTier1 =
      submittedBvnValid &&
      submittedBvn === tier1Bvn &&
      submittedBvnCandidates.every(
        (value) => value === tier1Bvn
      );

    const returnedBvnMatchesTier1 =
      returnedBvn !== null &&
      returnedBvn === tier1Bvn;

    const governmentBvnVerified =
      getStepStatus(governmentData) === 'verified';

    const tier2BvnVerified =
      !failed &&
      verificationStatus === 'completed' &&
      tier1BvnAlreadyVerified &&
      tier1Bvn !== null &&
      submittedBvnMatchesTier1 &&
      returnedBvnMatchesTier1 &&
      governmentBvnVerified;

    const tier2BvnProviderResult =
      tier2BvnVerified
        ? 'verified'
        : (
            failed ||
            (
              submittedBvnValid &&
              returnedBvn !== null
            )
          )
          ? 'failed'
          : 'pending';

    // --------------------------------------------------------
    // GOVERNMENT ID PROVIDER RESULT
    // --------------------------------------------------------

    const identityProviderResult = failed
      ? 'failed'
      : governmentIdStatus;

    // --------------------------------------------------------
    // TIER 2 LIVENESS
    // --------------------------------------------------------

    const selfieMatchScore = getScore(
      selfieResult.match_score ??
      selfieData.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score ??
      selfieData.liveness_score
    );

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

    const savedTier2LivenessStatus =
      preserveVerified(
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

    // --------------------------------------------------------
    // ADMINISTRATOR REVIEW
    //
    // Do not automatically approve Tier 2.
    // Preserve existing administrator decisions.
    // --------------------------------------------------------

    const savedIdentityReviewStatus =
      record.id_verification_status === 'verified'
        ? 'verified'
        : record.id_verification_status === 'rejected'
          ? 'rejected'
          : 'pending';

    const tier2ProviderFailure =
      failed ||
      tier2BvnProviderResult === 'failed' ||
      identityProviderResult === 'failed' ||
      savedTier2LivenessStatus === 'failed';

    await client.query(
      `UPDATE kyc_records
       SET
         tier_2_bvn_provider_validation_result = $1::text,

         id_verification_status = $2::text,

         id_provider_validation_result = $3::text,

         tier_2_liveness_status = $4::text,

         tier_2_liveness_rejection_reason = CASE
           WHEN $4::text = 'failed'
             THEN $5::text
           WHEN $4::text = 'verified'
             THEN NULL
           ELSE tier_2_liveness_rejection_reason
         END,

         verification_status = CASE
           WHEN $6::boolean = TRUE
             THEN 'failed'
           ELSE 'pending'
         END,

         selfie_match_score = COALESCE(
           $7,
           selfie_match_score
         ),

         liveness_score = COALESCE(
           $8,
           liveness_score
         ),

         dojah_checked_at = NOW(),
         updated_at = NOW()

       WHERE id = $9`,
      [
        tier2BvnProviderResult,
        savedIdentityReviewStatus,
        identityProviderResult,
        savedTier2LivenessStatus,
        tier2FailureReason,
        tier2ProviderFailure,
        selfieMatchScore,
        livenessScore,
        record.id,
      ]
    );

    console.info(
      '[KYC webhook] Tier 2 results saved.',
      {
        reference,
        tier2BvnProviderResult,
        tier1BvnWasVerified: tier1BvnAlreadyVerified,
        submittedBvnMatchesTier1,
        returnedBvnMatchesTier1,
        governmentIdProviderResult:
          identityProviderResult,
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
      tier2BvnProviderResult,
      identityProviderResult,
      identityStatus: savedIdentityReviewStatus,
      livenessStatus: savedTier2LivenessStatus,
      administratorReviewRequired: true,
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
