const pool = require('../config/database');


// ============================================================
// KYC / ACCOUNT LIMITS
// ============================================================

const TIER_LIMITS = {
  // NOT VERIFIED
  0: {
    accountLimit: 50000,
    dailyTransferLimit: 25000,
  },

  // TIER 1
  1: {
    accountLimit: 200000,
    dailyTransferLimit: 50000,
  },

  // TIER 2
  2: {
    accountLimit: 500000,
    dailyTransferLimit: 200000,
  },

  // TIER 3
  3: {
    accountLimit: null,
    dailyTransferLimit: 5000000,
  },
};


// ============================================================
// GET TIER LIMITS
// ============================================================

const getTierLimits = (tier) => {
  const numericTier = Number(tier);

  return (
    TIER_LIMITS[numericTier] ||
    TIER_LIMITS[0]
  );
};


// ============================================================
// NORMALIZE KYC STATUS
//
// IMPORTANT:
//
// "pending" is NOT verified.
// "rejected" is NOT verified.
// "not_verified" is NOT verified.
// Only "verified" / "approved" is verified.
// ============================================================

const normalizeKycStatus = (status) => {
  const value = String(status || '')
    .trim()
    .toLowerCase();

  if (
    value === 'verified' ||
    value === 'approved' ||
    value === 'completed'
  ) {
    return 'verified';
  }

  if (value === 'pending') {
    return 'pending';
  }

  if (value === 'rejected') {
    return 'rejected';
  }

  return 'not_verified';
};


// ============================================================
// GET CURRENT KYC STATUS
//
// GET /api/kyc/status
// ============================================================

const getKycStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        tier_3_method,
        account_limit,
        daily_transfer_limit,
        daily_transfer_used,
        daily_transfer_reset_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    const kycStatus = normalizeKycStatus(
      user.kyc_status
    );

    /*
     * IMPORTANT:
     *
     * We do NOT determine verification from kyc_tier.
     *
     * A user can have kyc_tier = 1 while still being
     * pending/not verified.
     */

    const verified =
      kycStatus === 'verified';

    const tier = Number(
      user.kyc_tier || 0
    );

    const limits = getTierLimits(
      verified ? tier : 0
    );

    const kycResult = await pool.query(
      `
      SELECT
        id,
        bvn_verification_status,
        bvn_verified_at,
        document_type,
        document_number,
        document_front_url,
        document_back_url,
        selfie_url,
        id_verification_status,
        id_verified_at,
        tier_3_method,
        tier_3_document_url,
        tier_3_verification_status,
        tier_3_verified_at,
        verification_status,
        rejection_reason,
        created_at,
        updated_at
      FROM kyc_records
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
      },

      kyc: {
        status: kycStatus,

        /*
         * Only expose an active verified tier when
         * the KYC status is actually verified.
         */
        tier: verified ? tier : 0,

        submitted_tier: tier,

        bvn_verified:
          user.bvn_verified === true,

        id_verified:
          user.id_verified === true,

        tier_3_verified:
          user.tier_3_verified === true,

        tier_3_method:
          user.tier_3_method || null,
      },

      limits: {
        account_limit:
          limits.accountLimit,

        daily_transfer_limit:
          limits.dailyTransferLimit,

        daily_transfer_used:
          Number(
            user.daily_transfer_used || 0
          ),

        daily_transfer_remaining:
          limits.dailyTransferLimit === null
            ? null
            : Math.max(
                limits.dailyTransferLimit -
                  Number(
                    user.daily_transfer_used || 0
                  ),
                0
              ),
      },

      record:
        kycResult.rows.length > 0
          ? kycResult.rows[0]
          : null,
    });

  } catch (error) {
    console.error(
      'Get KYC status error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to get KYC status',
    });
  }
};


// ============================================================
// SUBMIT BVN
//
// Tier 1
//
// IMPORTANT:
//
// Submitting a BVN DOES NOT mean the user is verified.
//
// Until Dojah/approved BVN provider confirms:
// - BVN is valid
// - BVN belongs to the user
// - name matches
// - date of birth matches
//
// the account remains NOT VERIFIED.
// ============================================================

const submitBvn = async (req, res) => {
  const userId = req.user.id;

  const bvn = String(
    req.body?.bvn || ''
  ).trim();

  if (!/^\d{11}$/.test(bvn)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_BVN',
      message:
        'BVN must contain exactly 11 digits',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
      SELECT
        id,
        full_name,
        date_of_birth,
        kyc_status,
        kyc_tier,
        bvn_verified
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    /*
     * Do not allow another BVN submission after
     * the account has already been successfully verified.
     */
    if (
      normalizeKycStatus(
        user.kyc_status
      ) === 'verified' &&
      user.bvn_verified === true
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Your BVN verification has already been completed',
      });
    }

    const existingKyc =
      await client.query(
        `
        SELECT id
        FROM kyc_records
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );

    let kycId;

    if (existingKyc.rows.length > 0) {
      kycId =
        existingKyc.rows[0].id;

      await client.query(
        `
        UPDATE kyc_records
        SET
          bvn = $1,
          bvn_verification_status = 'pending',
          verification_status = 'pending',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          bvn,
          kycId,
        ]
      );
    } else {
      const insertResult =
        await client.query(
          `
          INSERT INTO kyc_records (
            user_id,
            bvn,
            bvn_verification_status,
            verification_status
          )
          VALUES (
            $1,
            $2,
            'pending',
            'pending'
          )
          RETURNING id
          `,
          [
            userId,
            bvn,
          ]
        );

      kycId =
        insertResult.rows[0].id;
    }

    /*
     * CRITICAL:
     *
     * BVN submission alone does NOT set:
     *
     * bvn_verified = true
     * kyc_status = verified
     *
     * It remains pending until the actual provider
     * confirms the BVN.
     */

    await client.query(
      `
      UPDATE users
      SET
        bvn = $1,
        bvn_verified = false,
        kyc_status = 'pending',
        kyc_tier = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        bvn,
        userId,
      ]
    );

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description
      )
      VALUES (
        $1,
        'kyc_bvn_submitted',
        $2
      )
      `,
      [
        userId,
        'BVN submitted for Tier 1 verification. Awaiting provider verification.',
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,

      message:
        'BVN submitted successfully. Your account remains pending until the BVN is verified.',

      kyc_record_id:
        kycId,

      tier: 1,

      status: 'pending',

      verified: false,
    });

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    console.error(
      'Submit BVN error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to submit BVN',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// SUBMIT TIER 2
//
// Tier 2 requires:
//
// 1. Valid ID document
// 2. Front of ID
// 3. Back of ID where applicable
// 4. Facial verification / liveness
//
// IMPORTANT:
//
// The frontend must upload actual files.
//
// Do NOT trust arbitrary document URLs supplied by a user.
//
// The actual storage/upload middleware can be connected
// separately.
// ============================================================

const submitTier2 = async (req, res) => {
  const userId = req.user.id;

  const documentType = String(
    req.body?.document_type || ''
  ).trim();

  const documentNumber = String(
    req.body?.document_number || ''
  ).trim();

  const documentFrontUrl = String(
    req.body?.document_front_url || ''
  ).trim();

  const documentBackUrl = String(
    req.body?.document_back_url || ''
  ).trim();

  const selfieUrl = String(
    req.body?.selfie_url || ''
  ).trim();

  const livenessStatus = String(
    req.body?.liveness_status || ''
  ).trim().toLowerCase();

  // ----------------------------------------------------------
  // DOCUMENT TYPE
  // ----------------------------------------------------------

  const allowedDocumentTypes = [
    'national_id',
    'nin',
    'drivers_license',
    'international_passport',
    'voters_card',
  ];

  if (
    !allowedDocumentTypes.includes(
      documentType
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Please select a valid government-issued ID',
    });
  }

  // ----------------------------------------------------------
  // DOCUMENT NUMBER
  // ----------------------------------------------------------

  if (!documentNumber) {
    return res.status(400).json({
      success: false,
      message:
        'Document number is required',
    });
  }

  // ----------------------------------------------------------
  // FRONT DOCUMENT
  // ----------------------------------------------------------

  if (!documentFrontUrl) {
    return res.status(400).json({
      success: false,
      message:
        'Front of ID document is required',
    });
  }

  // ----------------------------------------------------------
  // BACK DOCUMENT
  //
  // Some documents do not have a back side.
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // LIVENESS
  // ----------------------------------------------------------

  if (!selfieUrl) {
    return res.status(400).json({
      success: false,
      message:
        'Facial verification is required',
    });
  }

  /*
   * We do not automatically accept a selfie simply because
   * a URL was provided.
   *
   * The liveness provider will later return "passed".
   */

  if (
    livenessStatus &&
    ![
      'pending',
      'passed',
      'verified',
    ].includes(livenessStatus)
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid facial verification status',
    });
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          date_of_birth,
          kyc_status,
          kyc_tier
        FROM users
        WHERE id = $1
        FOR UPDATE
        `,
        [userId]
      );

    if (
      userResult.rows.length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'User not found',
      });
    }

    const existingKyc =
      await client.query(
        `
        SELECT id
        FROM kyc_records
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );

    if (
      existingKyc.rows.length > 0
    ) {
      await client.query(
        `
        UPDATE kyc_records
        SET
          document_type = $1,
          document_number = $2,
          document_front_url = $3,
          document_back_url = $4,
          selfie_url = $5,
          id_verification_status = 'pending',
          verification_status = 'pending',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        `,
        [
          documentType,
          documentNumber,
          documentFrontUrl,
          documentBackUrl || null,
          selfieUrl,
          existingKyc.rows[0].id,
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO kyc_records (
          user_id,
          document_type,
          document_number,
          document_front_url,
          document_back_url,
          selfie_url,
          id_verification_status,
          verification_status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'pending',
          'pending'
        )
        `,
        [
          userId,
          documentType,
          documentNumber,
          documentFrontUrl,
          documentBackUrl || null,
          selfieUrl,
        ]
      );
    }

    /*
     * ID has been SUBMITTED.
     *
     * It is NOT verified yet.
     */

    await client.query(
      `
      UPDATE users
      SET
        id_verified = false,
        kyc_status = 'pending',
        kyc_tier = 2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [userId]
    );

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description
      )
      VALUES (
        $1,
        'kyc_tier2_submitted',
        $2
      )
      `,
      [
        userId,
        `Tier 2 ID and facial verification submitted using ${documentType}. Awaiting verification.`,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return res.status(200).json({
      success: true,

      message:
        'ID and facial verification submitted successfully. Your account is now pending review.',

      tier: 2,

      status: 'pending',

      verified: false,
    });

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    console.error(
      'Submit Tier 2 error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to submit Tier 2 verification',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// SUBMIT TIER 3
//
// Tier 3 requires:
//
// ONE proof-of-address document:
//
// - Bank statement
// - Utility bill
// - Proof of address
//
// IMPORTANT:
//
// Tier 3 does NOT accept:
// - Screenshot
// - Camera photo
// - Random image
//
// The frontend/storage layer should enforce PDF/document
// uploads.
// ============================================================

const submitTier3 = async (req, res) => {
  const userId = req.user.id;

  const method = String(
    req.body?.tier_3_method || ''
  ).trim();

  const documentUrl = String(
    req.body?.tier_3_document_url || ''
  ).trim();

  const allowedMethods = [
    'bank_statement',
    'utility_bill',
    'proof_of_address',
  ];

  if (
    !allowedMethods.includes(
      method
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Choose bank statement, utility bill, or proof of address',
    });
  }

  if (!documentUrl) {
    return res.status(400).json({
      success: false,
      message:
        'Tier 3 document is required',
    });
  }

  /*
   * The upload middleware should provide the actual
   * file metadata.
   *
   * If your frontend currently sends only a URL,
   * keep this check here temporarily and connect the
   * real file-upload middleware next.
   */

  const fileType = String(
    req.body?.file_type || ''
  ).trim().toLowerCase();

  if (
    fileType &&
    fileType !== 'application/pdf' &&
    fileType !== 'pdf'
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Tier 3 accepts PDF documents only. Screenshots and photos are not accepted.',
    });
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const userResult =
      await client.query(
        `
        SELECT
          id,
          kyc_status,
          kyc_tier
        FROM users
        WHERE id = $1
        FOR UPDATE
        `,
        [userId]
      );

    if (
      userResult.rows.length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'User not found',
      });
    }

    const existingKyc =
      await client.query(
        `
        SELECT id
        FROM kyc_records
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );

    if (
      existingKyc.rows.length > 0
    ) {
      await client.query(
        `
        UPDATE kyc_records
        SET
          tier_3_method = $1,
          tier_3_document_url = $2,
          tier_3_verification_status = 'pending',
          verification_status = 'pending',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [
          method,
          documentUrl,
          existingKyc.rows[0].id,
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO kyc_records (
          user_id,
          tier_3_method,
          tier_3_document_url,
          tier_3_verification_status,
          verification_status
        )
        VALUES (
          $1,
          $2,
          $3,
          'pending',
          'pending'
        )
        `,
        [
          userId,
          method,
          documentUrl,
        ]
      );
    }

    await client.query(
      `
      UPDATE users
      SET
        tier_3_verified = false,
        tier_3_method = $1,
        kyc_status = 'pending',
        kyc_tier = 3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        method,
        userId,
      ]
    );

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description
      )
      VALUES (
        $1,
        'kyc_tier3_submitted',
        $2
      )
      `,
      [
        userId,
        `Tier 3 proof-of-address document submitted using ${method}. Awaiting review.`,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return res.status(200).json({
      success: true,

      message:
        'Tier 3 document submitted successfully. Your account is now pending review.',

      tier: 3,

      status: 'pending',

      verified: false,

      method,
    });

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    console.error(
      'Submit Tier 3 error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to submit Tier 3 verification',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getKycStatus,
  submitBvn,
  submitTier2,
  submitTier3,
  getTierLimits,
};
