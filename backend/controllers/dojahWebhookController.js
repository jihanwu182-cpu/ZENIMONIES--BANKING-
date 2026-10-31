
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — DOJAH WEBHOOK CONTROLLER
//
// Tier 1: BVN / NIN provider evidence
// Tier 2: Automatic approval when identity AND liveness pass
// Tier 3: Liveness result only; address review stays separate
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
// PAYLOAD HELPERS
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

// Only explicit positive or negative provider results are accepted.
// Unknown values remain pending.
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
// WEBHOOK HANDLER
// ============================================================

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
      '[KYC webhook] Original request body is unavailable.'
    );

    return res.status(400).json({
      received: false,
      message: 'Invalid webhook request.',
    });
  }

  if (!verifySignature(signature, rawBody, secret)) {
    console.warn(
      '[KYC webhook] Signature validation failed.'
    );

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

  // Acknowledge test events without changing customer records.
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

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // Match only the currently active reference.
    // Old references cannot update a newer attempt.
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
         tier_3_verification_status,
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

      return res.status(200).json({
        received: true,
        matched: false,
      });
    }

    const record = recordResult.rows[0];

    // Ignore nonterminal events. Do not approve from a
    // started, processing, or otherwise incomplete callback.
    if (!completed) {
      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        received: true,
        matched: true,
        updated: false,
        status: 'pending',
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

      const providerResult =
        record.nin_verification_status === 'verified' ||
        record.nin_provider_validation_result === 'verified'
          ? 'verified'
          : !failed && providerStatus === 'verified'
            ? 'verified'
            : failed || providerStatus === 'rejected'
              ? 'rejected'
              : 'pending';

      // Tier 1 NIN still follows the existing administrator
      // approval process. The callback records provider evidence.
      const reviewStatus =
        record.nin_verification_status === 'verified'
          ? 'verified'
          : providerResult === 'rejected'
            ? 'rejected'
            : 'pending';

      await client.query(
        `UPDATE kyc_records
         SET
           nin_provider_validation_result = $1::text,
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

      const explicitlyRejected =
        failed || providerStatus === 'rejected';

      const approved =
        !failed && providerStatus === 'verified';

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

      await client.query(
        `UPDATE kyc_records
         SET
           bvn_verification_status = $1::text,
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

      // Existing Tier 1 administrator approval is preserved.
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
    // Address approval remains separate.
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

      // A delayed callback must not downgrade an already
      // verified liveness result.
      const savedLivenessStatus =
        record.liveness_status === 'verified'
          ? 'verified'
          : nextLivenessStatus;

      await client.query(
        `UPDATE kyc_records
         SET
           liveness_status = $1::text,
           dojah_checked_at = NOW(),
           updated_at = NOW()
         WHERE id = $2`,
        [savedLivenessStatus, record.id]
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
    // NEW RULE:
    // Both checks must explicitly pass before automatic
    // approval is granted.
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

    // Preserve a previously verified step. A terminal failed
    // session rejects any step that has not already passed.
    const savedIdentityStatus =
      record.id_verification_status === 'verified'
        ? 'verified'
        : failed || identityProviderStatus === 'rejected'
          ? 'rejected'
          : identityProviderStatus === 'verified'
            ? 'verified'
            : 'pending';

    const savedLivenessStatus =
      record.liveness_status === 'verified'
        ? 'verified'
        : failed || livenessProviderStatus === 'rejected'
          ? 'rejected'
          : livenessProviderStatus === 'verified'
            ? 'verified'
            : 'pending';

    const selfieMatchScore = getScore(
      selfieResult.match_score ?? selfieData.match_score
    );

    const livenessScore = getScore(
      selfieResult.liveness_score ?? selfieData.liveness_score
    );

    const tier2Approved =
      savedIdentityStatus === 'verified' &&
      savedLivenessStatus === 'verified';

    const tier2Rejected =
      savedIdentityStatus === 'rejected' ||
      savedLivenessStatus === 'rejected';

    const overallTier2Status = tier2Approved
      ? 'verified'
      : tier2Rejected
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
         id_rejection_reason = CASE
           WHEN $1::text = 'rejected'
             THEN 'provider_identity_check_failed'
           ELSE NULL
         END,
         liveness_status = $2::text,
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

    // AUTOMATIC TIER 2 APPROVAL:
    // The customer is approved only when both provider checks
    // have explicit positive results.
    //
    // Do not change Tier 1 flags or Tier 3 address status here.
    if (tier2Approved) {
      await client.query(
        `UPDATE users
         SET id_verified = TRUE,
             updated_at = NOW()
         WHERE id = $1`,
        [record.user_id]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    console.info('[KYC webhook] Tier 2 result processed.', {
      reference,
      identityStatus: savedIdentityStatus,
      livenessStatus: savedLivenessStatus,
      tier2Status: overallTier2Status,
    });

    return res.status(200).json({
      received: true,
      matched: true,
      verificationType: 'identity',
      identityStatus: savedIdentityStatus,
      livenessStatus: savedLivenessStatus,
      tier2Status: overallTier2Status,
      automaticallyApproved: tier2Approved,
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          '[KYC webhook] Database rollback failed.',
          {
            code: rollbackError?.code || null,
          }
        );
      }
    }

    // Do not log the webhook payload, signature, BVN, NIN,
    // identity documents, selfie data, or secrets.
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
