const pool = require('../config/database');


// ============================================================
// TIER LIMITS
// ============================================================

const TIER_LIMITS = {
  1: {
    accountLimit: 200000,
    dailyTransferLimit: 50000,
  },

  2: {
    accountLimit: 500000,
    dailyTransferLimit: 200000,
  },

  3: {
    accountLimit: null,
    dailyTransferLimit: 5000000,
  },
};


// ============================================================
// HELPER
// ============================================================

const getTierLimits = (tier) => {
  return (
    TIER_LIMITS[Number(tier)] ||
    TIER_LIMITS[1]
  );
};


// ============================================================
// GET KYC STATUS
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

    const limits = getTierLimits(
      user.kyc_tier
    );

    const kycResult = await pool.query(
      `
      SELECT
        id,
        bvn_verification_status,
        bvn_verified_at,
        document_type,
        document_number,
        id_verification_status,
        id_verified_at,
        tier_3_method,
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

    return res.json({
      success: true,

      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
      },

      kyc: {
        status: user.kyc_status,
        tier: Number(user.kyc_tier),
        bvn_verified: user.bvn_verified,
        id_verified: user.id_verified,
        tier_3_verified: user.tier_3_verified,
        tier_3_method: user.tier_3_method,
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
                    user.daily_transfer_used ||
                      0
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
      message: 'Unable to get KYC status',
    });
  }
};


// ============================================================
// SUBMIT BVN
//
// Tier 1 verification.
//
// IMPORTANT:
// This endpoint records the BVN for verification.
// It should NOT pretend that a BVN is verified unless an
// approved BVN verification provider has actually confirmed it.
// ============================================================

const submitBvn = async (req, res) => {
  const userId = req.user.id;

  const bvn = String(
    req.body?.bvn || ''
  ).trim();

  if (!/^\d{11}$/.test(bvn)) {
    return res.status(400).json({
      success: false,
      message: 'BVN must contain exactly 11 digits',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
      SELECT
        id,
        kyc_tier,
        kyc_status
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
      kycId = existingKyc.rows[0].id;

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
        [bvn, kycId]
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
          [userId, bvn]
        );

      kycId =
        insertResult.rows[0].id;
    }

    await client.query(
      `
      UPDATE users
      SET
        bvn = $1,
        bvn_verified = false,
        kyc_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [bvn, userId]
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
        'BVN submitted for Tier 1 verification',
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'BVN submitted successfully and is pending verification',
      kyc_record_id: kycId,
      tier: 1,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Submit BVN error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to submit BVN',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// SUBMIT TIER 2 ID
//
// Tier 2 requires:
// - ID document
// - KYC information
//
// Verification remains pending until approved.
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

  if (!documentType) {
    return res.status(400).json({
      success: false,
      message: 'Document type is required',
    });
  }

  if (!documentNumber) {
    return res.status(400).json({
      success: false,
      message: 'Document number is required',
    });
  }

  if (!documentFrontUrl) {
    return res.status(400).json({
      success: false,
      message:
        'Front of ID document is required',
    });
  }

  if (!selfieUrl) {
    return res.status(400).json({
      success: false,
      message: 'Selfie is required',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
      SELECT
        id,
        kyc_tier
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

    if (existingKyc.rows.length > 0) {
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

    await client.query(
      `
      UPDATE users
      SET
        id_verified = false,
        kyc_status = 'pending',
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
        `Tier 2 ID verification submitted using ${documentType}`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Tier 2 verification submitted and is pending review',
      tier: 2,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
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
// User chooses ONE:
// - bank_statement
// - utility_bill
// - proof_of_address
//
// Tier 3 is NOT automatically approved.
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

  if (!allowedMethods.includes(method)) {
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
        'Tier 3 verification document is required',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
      SELECT id
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

    if (existingKyc.rows.length > 0) {
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [method, userId]
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
        `Tier 3 verification submitted using ${method}`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Tier 3 verification submitted and is pending review',
      tier: 3,
      method,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
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
