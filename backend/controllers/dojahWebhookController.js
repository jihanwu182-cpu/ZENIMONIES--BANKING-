
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// Signed KYC webhook
//
// Tier 1: BVN
// Tier 2: Identity and liveness
//
// Security:
// - Verify the signature against the original request body.
// - Match the backend-created reference to a saved KYC record.
// - Never approve BVN from session completion alone.
// - Never log BVNs, identity documents, signatures or secrets.
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

const isCompleted = (body) => {
  const candidates = [
    body?.verification_status,
    body?.data?.verification_status,
  ];

  return candidates.some((value) =>
    ['completed', 'complete'].includes(
      String(value || '').trim().toLowerCase()
    )
  );
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

  const value = String(
    step.status || step.verification_status || ''
  ).trim().toLowerCase();

  if (
    ['verified', 'success', 'successful', 'approved', 'passed']
      .includes(value)
  ) {
    return 'verified';
  }

  if (
    ['rejected', 'failed', 'failure', 'declined']
      .includes(value)
  ) {
    return 'rejected';
  }

  return 'pending';
};

const getScore = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) &&
    number >= 0 &&
    number <= 100
    ? number
    : null;
};

const handleDojahWebhook = async (req, res) => {
  const secret = getWebhookSecret();
  const rawBody = req.rawBody;
  const signature = req.headers['x-dojah-signature'];

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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      received: false,
      message: 'Invalid webhook payload.',
    });
  }

  const reference = getReference(body);

  if (!reference) {
    console.warn(
      '[KYC webhook] Verification reference is missing.'
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
    hasMetadataReference: Boolean(
      body?.metadata?.reference_id ||
      data?.metadata?.reference_id
    ),
  });

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // Match only the exact reference created by our backend.
    const recordResult = await client.query(
      `SELECT
         id,
         user_id,
         bvn,
         bvn_verification_status,
         bvn_provider_reference,
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
        '[KYC webhook] No matching KYC record found.'
      );

      // Acknowledge an authenticated event that does not match
      // a record, so it cannot update another customer's KYC.
      return res.status(200).json({
        received: true,
        matched: false,
      });
    }

    const record = recordResult.rows[0];

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

      const bvnEntity = bvnEntityCandidates.find(
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

      const providerStatus = getStepStatus(governmentData);

      const exactBvnMatch =
        /^\d{11}$/.test(storedBvn) &&
        /^\d{11}$/.test(returnedBvn) &&
        storedBvn === returnedBvn;

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
               ELSE NULL
             END,
             bvn_provider_validation_result = $2,
             bvn_rejection_reason = CASE
               WHEN $1 = 'rejected'
                 THEN 'provider_bvn_check_failed'
               ELSE NULL
             END,
             dojah_checked_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [
          nextStatus,
          nextStatus,
          record.id,
        ]
      );

      if (approved) {
        await client.query(
          `UPDATE users
           SET bvn_verified = TRUE,
               updated_at = NOW()
           WHERE id = $1`,
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
      });
    }

    // ========================================================
    // TIER 2 — IDENTITY AND LIVENESS
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

    const identityStatus = completed
      ? getStepStatus(governmentData)
      : 'pending';

    const livenessStatus = completed
      ? getStepStatus(selfieData)
      : 'pending';

    const selfieMatchScore = getScore(
      selfieResult.match_score ??
      selfieData.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score ??
      selfieData.liveness_score
    );

    // Do not downgrade a previously verified step on a later
    // incomplete or unrecognized webhook event.
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
           selfie_match_score =
             COALESCE($3, selfie_match_score),
           liveness_score =
             COALESCE($4, liveness_score),
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
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id]
      );
    } else if (identityRejected || livenessRejected) {
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
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        console.error(
          '[KYC webhook] Transaction rollback failed.'
        );
      }
    }

    // Do not log payloads, BVNs, signatures, or secrets.
    console.error(
      '[KYC webhook] Processing failed:',
      error.message
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
