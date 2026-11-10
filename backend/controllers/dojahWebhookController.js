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
// Tier 2 is automatically approved when all required checks pass.
// Tier 3 liveness remains separate from Tier 3 document review.
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

  for (const value of candidates) {
    if (value === true) return 'verified';
    if (value === false) return 'failed';

    if (typeof value !== 'string') continue;

    const status = value.trim().toLowerCase();

    if (
      ['success', 'successful', 'verified', 'completed', 'complete', 'approved', 'passed'].includes(status)
    ) {
      return 'verified';
    }

    if (
      ['failed', 'failure', 'rejected', 'declined', 'abandoned', 'error'].includes(status)
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
        completed &&
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
        completed &&
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
    // TIER 2 — AUTOMATIC APPROVAL
    //
    // Approval requires:
    // 1. Existing Tier 1 BVN is verified.
    // 2. Submitted BVN matches the stored Tier 1 BVN.
    // 3. Dojah-returned BVN matches the stored Tier 1 BVN.
    // 4. Government ID verification passes.
    // 5. Facial liveness passes.
    // 6. Dojah reports a completed, successful verification.
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

    const governmentIdStatus = getStepStatus(idData);
    const livenessProviderStatus = getStepStatus(selfieData);
    const governmentBvnStatus = getStepStatus(governmentData);

    const normalizeBvn = (value) => {
      if (typeof value !== 'string') return null;

      const normalized = value.trim();

      return /^\d{11}$/.test(normalized)
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
      tier1Bvn !== null &&
      submittedBvn === tier1Bvn &&
      submittedBvnCandidates.every(
        (value) => value === tier1Bvn
      );

    const returnedBvnMatchesTier1 =
      returnedBvn !== null &&
      tier1Bvn !== null &&
      returnedBvn === tier1Bvn;

    const tier2BvnVerified =
  !failed &&
  completed &&
  tier1BvnAlreadyVerified &&
  submittedBvnMatchesTier1 &&
  returnedBvnMatchesTier1 &&
  governmentBvnStatus === 'verified';

const bvnEvidenceMismatch =
  (
    submittedBvnValid &&
    tier1Bvn !== null &&
    !submittedBvnMatchesTier1
  ) ||
  (
    returnedBvn !== null &&
    tier1Bvn !== null &&
    !returnedBvnMatchesTier1
  );

const bvnEvidenceInvalid =
  submittedBvnCandidates.length > 0 &&
  !submittedBvnValid;

const tier2BvnProviderResult = preserveVerified(
  record.tier_2_bvn_provider_validation_result,
  tier2BvnVerified
    ? 'verified'
    : (
        failed ||
        governmentBvnStatus === 'failed' ||
        bvnEvidenceMismatch ||
        bvnEvidenceInvalid
      )
      ? 'failed'
      : 'pending'
);

const tier2EvidenceComplete =
  tier2BvnVerified &&
  governmentIdStatus === 'verified' &&
  livenessProviderStatus === 'verified' &&
  !failed &&
  completed;

const identityProviderResult = failed
  ? 'failed'
  : governmentIdStatus;

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

// Never downgrade an already verified or rejected identity.
const savedIdentityStatus =
  record.id_verification_status === 'verified'
    ? 'verified'
    : record.id_verification_status === 'rejected'
      ? 'rejected'
      : tier2EvidenceComplete
        ? 'verified'
        : 'pending';

    const tier2Approved =
  tier2EvidenceComplete &&
  savedIdentityStatus === 'verified' &&
  savedTier2LivenessStatus === 'verified';

const tier2ProviderFailure =
  failed ||
  governmentIdStatus === 'failed' ||
  livenessProviderStatus === 'failed' ||
  governmentBvnStatus === 'failed' ||
  bvnEvidenceMismatch ||
  bvnEvidenceInvalid;

// Preserve an existing administrator rejection.
const administratorRejected =
  record.id_verification_status === 'rejected';

// Save all provider results and approval status atomically.
await client.query(
  `UPDATE kyc_records
   SET
     tier_2_bvn_provider_validation_result = $1::text,

     id_verification_status = $2::text,

     id_provider_validation_result = $3::text,

     id_verified_at = CASE
       WHEN $2::text = 'verified'
         THEN COALESCE(id_verified_at, NOW())
       ELSE id_verified_at
     END,

     id_rejection_reason = CASE
       WHEN $2::text = 'verified'
         THEN NULL
       ELSE id_rejection_reason
     END,

     tier_2_liveness_status = $4::text,

     tier_2_liveness_rejection_reason = CASE
       WHEN $4::text = 'failed'
         THEN $5::text
       WHEN $4::text = 'verified'
         THEN NULL
       ELSE tier_2_liveness_rejection_reason
     END,

verification_status = CASE
  WHEN $11::boolean = TRUE
    THEN 'rejected'
  WHEN verification_status = 'rejected'
    THEN 'rejected'
  WHEN $6::boolean = TRUE
    THEN 'verified'
  WHEN verification_status = 'verified'
    THEN 'verified'
  WHEN $7::boolean = TRUE
    THEN 'failed'
  ELSE 'pending'
END,

     selfie_match_score = COALESCE(
       $8,
       selfie_match_score
     ),

     liveness_score = COALESCE(
       $9,
       liveness_score
     ),

     dojah_checked_at = NOW(),
     updated_at = NOW()

   WHERE id = $10`,
  [
    tier2BvnProviderResult,
    savedIdentityStatus,
    identityProviderResult,
    savedTier2LivenessStatus,
    tier2FailureReason,
    tier2Approved,
    tier2ProviderFailure,
    selfieMatchScore,
    livenessScore,
    record.id,
    administratorRejected,
  ]
);

// Automatically upgrade the user only after every
// required provider check has passed.
if (tier2Approved) {
  const userUpdate = await client.query(
    `UPDATE users
     SET
       id_verified = TRUE,
       kyc_tier = GREATEST(COALESCE(kyc_tier, 0), 2),
       kyc_status = 'verified',
       updated_at = NOW()
     WHERE id = $1
       AND bvn_verified = TRUE`,
    [record.user_id]
  );

  if (userUpdate.rowCount !== 1) {
    throw new Error(
      'Tier 2 approval failed: user record was not updated.'
    );
  }

await client.query(
  `INSERT INTO audit_logs (
     user_id,
     action,
     description
   )
   SELECT $1, $2, $3
   WHERE NOT EXISTS (
     SELECT 1
     FROM audit_logs
     WHERE user_id = $1
       AND action = $2
   )`,
  [
    record.user_id,
    'kyc_tier2_auto_approved',
    'Tier 2 automatically approved after successful BVN match, government identity verification, and facial liveness verification by Dojah.',
  ]
);
}

console.info(
  '[KYC webhook] Tier 2 processing completed.',
  {
    reference,
    tier2BvnProviderResult,
    governmentIdProviderResult: identityProviderResult,
    livenessStatus: savedTier2LivenessStatus,
    tier2Approved,
    administratorRejected,

    // Safe diagnostic information — no customer BVN exposed.
    tier2EvidenceComplete,
    tier2BvnVerified,
    tier1BvnAlreadyVerified,
    submittedBvnValid,
    submittedBvnMatchesTier1,
    returnedBvnMatchesTier1,
    governmentBvnStatus,
    governmentIdStatus,
    livenessProviderStatus,
    verificationCompleted: completed,
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
  identityStatus: savedIdentityStatus,
  livenessStatus: savedTier2LivenessStatus,
  tier2Approved,
  administratorReviewRequired: false,
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
