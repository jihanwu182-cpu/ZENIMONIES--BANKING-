
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// Signed verification webhook
//
// Supports:
//   Tier 1: BVN verification
//   Tier 2: Identity and liveness verification
//
// Security:
//   - Verifies HMAC SHA-256 against the raw request body.
//   - Matches the backend-created reference to a saved KYC record.
//   - Never approves a verification from session completion alone.
// ============================================================

const getWebhookSecret = () => {
  const value = process.env.DOJAH_WEBHOOK_SECRET;

  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
};

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
    received = received.slice('sha256='.length);
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

// Prefer the backend-created reference supplied in metadata.
// A provider-generated reference must not be assumed to be
// the same as the reference stored by Zenimonies.
const getReference = (body) => {
  const candidates = [
    body?.metadata?.reference_id,
    body?.data?.metadata?.reference_id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  // These fallback fields are accepted only if they actually
  // match a saved backend reference in the database below.
  const fallbackCandidates = [
    body?.reference_id,
    body?.data?.reference_id,
  ];

  for (const candidate of fallbackCandidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return null;
};

const isCompleted = (body) => {
  const status = String(
    body?.verification_status || ''
  ).toLowerCase();

  return ['completed', 'complete'].includes(status);
};

const getStepStatus = (step) => {
  if (!step || typeof step !== 'object') {
    return 'pending';
  }

  if (step.status === true) {
    return 'verified';
  }

  if (step.status === false) {
    return 'rejected';
  }

  const status = String(
    step.status || step.verification_status || ''
  ).toLowerCase();

  if (
    ['verified', 'success', 'successful', 'approved', 'passed'].includes(status)
  ) {
    return 'verified';
  }

  if (
    ['rejected', 'failed', 'failure', 'declined'].includes(status)
  ) {
    return 'rejected';
  }

  return 'pending';
};

const getScore = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  if (number < 0 || number > 100) {
    return null;
  }

  return number;
};

const handleDojahWebhook = async (req, res) => {
  const secret = getWebhookSecret();
  const rawBody = req.rawBody;
  const signature =
    req.headers['x-dojah-signature'];

  if (!secret) {
    console.error(
      '[KYC webhook] Webhook secret is not configured.'
    );

    return res.status(500).json({
      received: false,
      message: 'Webhook configuration error.',
    });
  }

  if (!Buffer.isBuffer(rawBody)) {
    console.error(
      '[KYC webhook] Raw request body is unavailable.'
    );

    return res.status(400).json({
      received: false,
      message: 'Invalid webhook request.',
    });
  }

  if (!verifySignature(signature, rawBody, secret)) {
    console.warn(
      '[KYC webhook] Invalid webhook signature.'
    );

    return res.status(401).json({
      received: false,
      message: 'Invalid signature.',
    });
  }

  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      received: false,
      message: 'Invalid webhook payload.',
    });
  }

  const reference = getReference(body);

  if (!reference) {
    console.warn(
      '[KYC webhook] No usable verification reference.'
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

const completed = isCompleted(body);

// Diagnostic information only.
// Never log the BVN, identity documents, full payload,
// webhook signature, or secrets.
console.info('[KYC webhook] Received verification event:', {
  topLevelKeys: Object.keys(body),
  dataKeys: Object.keys(data),
  verificationStatus:
    typeof body.verification_status === 'string'
      ? body.verification_status
      : null,
  dataVerificationStatus:
    typeof data.verification_status === 'string'
      ? data.verification_status
      : null,
  completed,
  hasMetadataReference:
    typeof body?.metadata?.reference_id === 'string' ||
    typeof data?.metadata?.reference_id === 'string',
});


    // ========================================================
    // TIER 1 — BVN
    // ========================================================
    if (record.dojah_verification_type === 'bvn') {
      
      const governmentData =
        data.government_data &&
        typeof data.government_data === 'object'
          ? data.government_data
          : {};

      const bvnEntityCandidates = [
        governmentData?.data?.bvn?.entity,
        governmentData?.bvn?.entity,
        data?.bvn?.entity,
      ];

      const bvnEntity =
        bvnEntityCandidates.find(
          (candidate) =>
            candidate &&
            typeof candidate === 'object' &&
            typeof candidate.bvn === 'string'
        ) || {};

      const storedBvn =
        typeof record.bvn === 'string'
          ? record.bvn.trim()
          : '';

      const returnedBvn =
        typeof bvnEntity.bvn === 'string'
          ? bvnEntity.bvn.trim()
          : '';

      const providerStatus =
        getStepStatus(governmentData);

      const exactBvnMatch =
        /^\d{11}$/.test(storedBvn) &&
        /^\d{11}$/.test(returnedBvn) &&
        storedBvn === returnedBvn;

      // Approve only when the provider confirms completion,
      // its government-data check passes, and the returned
      // BVN exactly matches the saved BVN.
      const approved =
        completed &&
        providerStatus === 'verified' &&
        exactBvnMatch;

      const explicitlyRejected =
        completed &&
        providerStatus === 'rejected';

      const nextStatus = approved
        ? 'verified'
        : explicitlyRejected
          ? 'rejected'
          : 'pending';

      console.info('[KYC webhook] BVN decision:', {
        completed,
        providerStatus,
        returnedBvnPresent: Boolean(returnedBvn),
        storedBvnValid: /^\d{11}$/.test(storedBvn),
        returnedBvnValid: /^\d{11}$/.test(returnedBvn),
        exactBvnMatch,
        nextStatus,
      });

      await client.query(
        `UPDATE kyc_records
         SET bvn_verification_status = $1,
             bvn_verified_at = CASE
               WHEN $1 = 'verified'
                 THEN COALESCE(bvn_verified_at, NOW())
               ELSE bvn_verified_at
             END,
             bvn_rejection_reason = CASE
               WHEN $1 = 'rejected'
                 THEN 'provider_bvn_check_failed'
               ELSE NULL
             END,
             dojah_checked_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [nextStatus, record.id]
      );

      if (approved) {
        await client.query(
          `UPDATE users
           SET bvn_verified = TRUE,
               updated_at = NOW()
           WHERE id = $1`,
          [record.user_id]
        );
      }

      if (explicitlyRejected) {
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

      return res.status(200).json({
        received: true,
      });
    }

    // ========================================================
    // TIER 2 — IDENTITY AND LIVENESS
    // Preserve the existing Tier 2 workflow.
    // ========================================================
    const governmentData =
      data.government_data || {};

    const selfieData =
      data.selfie || {};

    const selfieResult =
      selfieData.data || {};

    const identityStatus = completed
      ? getStepStatus(governmentData)
      : 'pending';

    const livenessStatus = completed
      ? getStepStatus(selfieData)
      : 'pending';

    const identityScore = getScore(
      governmentData.match_score ??
      governmentData.data?.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score
    );

    const savedIdentityStatus =
      record.id_verification_status === 'verified'
        ? 'verified'
        : identityStatus;

    const savedLivenessStatus =
      record.liveness_status === 'verified'
        ? 'verified'
        : livenessStatus;

    const identityRejected =
      savedIdentityStatus === 'rejected';

    const livenessRejected =
      savedLivenessStatus === 'rejected';

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
           identity_match_score = COALESCE($3, identity_match_score),
           liveness_score = COALESCE($4, liveness_score),
           dojah_checked_at = NOW(),
           updated_at = NOW()
       WHERE id = $5`,
      [
        savedIdentityStatus,
        savedLivenessStatus,
        identityScore,
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
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id]
      );
    }

    if (identityRejected || livenessRejected) {
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

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        '[KYC webhook] Transaction rollback failed.'
      );
    }

    console.error(
      '[KYC webhook] Processing failed:',
      error.message
    );

    return res.status(500).json({
      received: false,
      message: 'Webhook processing failed.',
    });
  } finally {
    client.release();
  }
};

module.exports = {
  handleDojahWebhook,
};
