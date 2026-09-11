const pool = require('../config/database');

// ============================================================
// KYC / ACCOUNT LIMITS
// ============================================================

const TIER_LIMITS = {
  0: {
    accountLimit: 50000,
    dailyTransferLimit: 25000,
  },

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
// GET TIER LIMITS
// ============================================================

const getTierLimits = (tier) => {
  const numericTier = Number(tier);

  return TIER_LIMITS[numericTier] || TIER_LIMITS[0];
};

// ============================================================
// NORMALIZE KYC STATUS
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

  if (
    value === 'pending' ||
    value === 'under_review'
  ) {
    return 'pending';
  }

  if (value === 'rejected') {
    return 'rejected';
  }

  return 'not_verified';
};

// ============================================================
// FILE TYPES
// ============================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// ============================================================
// VALIDATE ID FILE
// ============================================================

const validateIdFile = (file) => {
  if (!file) {
    return {
      valid: false,
      message: 'ID document file is required.',
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      message:
        'ID document must be a JPG, JPEG, PNG, or WEBP image.',
    };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      message:
        'The uploaded ID document is empty.',
    };
  }

  return {
    valid: true,
  };
};

// ============================================================
// VALIDATE SELFIE
// ============================================================

const validateSelfieFile = (file) => {
  if (!file) {
    return {
      valid: false,
      message: 'Selfie photo is required.',
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      message:
        'Selfie must be a JPG, JPEG, PNG, or WEBP image.',
    };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      message: 'The uploaded selfie is empty.',
    };
  }

  return {
    valid: true,
  };
};

// ============================================================
// VALIDATE PROOF OF ADDRESS
// ============================================================

const validateProofOfAddressFile = (file) => {
  if (!file) {
    return {
      valid: false,
      message:
        'Proof-of-address document is required.',
    };
  }

  if (
    !ALLOWED_DOCUMENT_TYPES.includes(
      file.mimetype
    )
  ) {
    return {
      valid: false,
      message:
        'Proof of address must be a PDF, JPG, JPEG, PNG, or WEBP document.',
    };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      message:
        'The uploaded document is empty.',
    };
  }

  return {
    valid: true,
  };
};

// ============================================================
// GET CURRENT KYC STATUS
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

    const verified = kycStatus === 'verified';

    const tier = Number(user.kyc_tier || 0);

    const limits = getTierLimits(
      verified ? tier : 0
    );

    const kycResult = await pool.query(
      `
      SELECT
        id,
        bvn_verification_status,
        bvn_verified_at,
        bvn_rejection_reason,
        document_type,
        document_number,
        id_verification_status,
        id_verified_at,
        id_rejection_reason,
        liveness_status,
        liveness_provider_reference,
        tier_3_method,
        tier_3_verification_status,
        tier_3_verified_at,
        tier_3_rejection_reason,
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

    const userResult =
      await client.query(
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
          bvn_verified_at = NULL,
          bvn_rejection_reason = NULL,
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
        kyc_tier = 1,
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
        'BVN submitted for Tier 1 verification. Awaiting provider verification.',
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,

      message:
        'BVN submitted successfully. Your account remains pending until the BVN is verified.',

      kyc_record_id: kycId,

      tier: 1,

      status: 'pending',

      verified: false,
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
// Actual uploaded files:
//
// document_front
// document_back
// selfie
//
// ============================================================

const submitTier2 = async (req, res) => {
  const userId = req.user.id;

  const documentType = String(
    req.body?.document_type || ''
  ).trim();

  const documentNumber = String(
    req.body?.document_number || ''
  ).trim();

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
      code: 'INVALID_DOCUMENT_TYPE',
      message:
        'Please select a valid government-issued ID',
    });
  }

  if (!documentNumber) {
    return res.status(400).json({
      success: false,
      code: 'DOCUMENT_NUMBER_REQUIRED',
      message:
        'Document number is required',
    });
  }

  const idFrontFile =
    req.files?.document_front?.[0] ||
    null;

  const idBackFile =
    req.files?.document_back?.[0] ||
    null;

  const selfieFile =
    req.files?.selfie?.[0] ||
    null;

  // ----------------------------------------------------------
  // FRONT
  // ----------------------------------------------------------

  const frontValidation =
    validateIdFile(idFrontFile);

  if (!frontValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ID_FRONT',
      message:
        frontValidation.message,
    });
  }

  // ----------------------------------------------------------
  // SELFIE
  // ----------------------------------------------------------

  const selfieValidation =
    validateSelfieFile(selfieFile);

  if (!selfieValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_SELFIE',
      message:
        selfieValidation.message,
    });
  }

  // ----------------------------------------------------------
  // BACK
  // ----------------------------------------------------------

  const documentsWithoutBack = [
    'international_passport',
  ];

  if (
    !documentsWithoutBack.includes(
      documentType
    )
  ) {
    if (!idBackFile) {
      return res.status(400).json({
        success: false,
        code: 'ID_BACK_REQUIRED',
        message:
          'Back of ID document is required for this document type.',
      });
    }
  }

  if (idBackFile) {
    const backValidation =
      validateIdFile(idBackFile);

    if (!backValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_BACK',
        message:
          backValidation.message,
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          date_of_birth,
          kyc_status,
          kyc_tier,
          id_verified
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

    if (user.id_verified === true) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Your identity verification has already been completed.',
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
          document_type = $1,
          document_number = $2,
          id_verification_status = 'pending',
          id_verified_at = NULL,
          id_rejection_reason = NULL,
          liveness_status = 'pending',
          liveness_provider_reference = NULL,
          verification_status = 'pending',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [
          documentType,
          documentNumber,
          kycId,
        ]
      );
    } else {
      const insertResult =
        await client.query(
          `
          INSERT INTO kyc_records (
            user_id,
            document_type,
            document_number,
            id_verification_status,
            liveness_status,
            verification_status
          )
          VALUES (
            $1,
            $2,
            $3,
            'pending',
            'pending',
            'pending'
          )
          RETURNING id
          `,
          [
            userId,
            documentType,
            documentNumber,
          ]
        );

      kycId =
        insertResult.rows[0].id;
    }

    // --------------------------------------------------------
    // IMPORTANT
    // --------------------------------------------------------
    //
    // Files are received successfully by Multer.
    //
    // We DO NOT mark the user as verified merely because files
    // were uploaded.
    //
    // Real identity/liveness verification must happen through
    // an approved verification process.
    //
    // --------------------------------------------------------

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
        `Tier 2 government ID and selfie received using ${documentType}. Awaiting identity and liveness verification.`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,

      message:
        'Your ID documents and selfie have been received. Identity and liveness verification are pending.',

      kyc_record_id: kycId,

      tier: 2,

      status: 'pending',

      verified: false,

      liveness_status: 'pending',

      id_verification_status:
        'pending',
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
// POST /api/kyc/tier-3
//
// multipart/form-data
//
// Fields:
//
// tier_3_method
//
// Files:
//
// tier_3_document
// tier_3_selfie
//
// ============================================================
//
// ACCEPTED METHODS
//
// 1. bank_statement
// 2. utility_bill
// 3. proof_of_address
//
// ============================================================
//
// IMPORTANT:
//
// Tier 3 requires BOTH:
//
// - Proof-of-address document
// - Liveness submission
//
// Uploading the files DOES NOT mean verification succeeded.
//
// Both remain pending until the actual verification process
// confirms them.
// ============================================================

const submitTier3 = async (req, res) => {
  const userId = req.user.id;

  const method = String(
    req.body?.tier_3_method || ''
  ).trim();

  // ==========================================================
  // ALLOWED TIER 3 METHODS
  // ==========================================================

  const allowedMethods = [
    'bank_statement',
    'utility_bill',
    'proof_of_address',
  ];

  if (!allowedMethods.includes(method)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_METHOD',
      message:
        'Choose bank statement, utility bill, or proof of address.',
    });
  }

  // ==========================================================
  // FILES
  // ==========================================================

  const tier3Document =
    req.files?.tier_3_document?.[0] ||
    null;

  const tier3Selfie =
    req.files?.tier_3_selfie?.[0] ||
    null;

  // ==========================================================
  // DOCUMENT VALIDATION
  // ==========================================================

  const documentValidation =
    validateProofOfAddressFile(
      tier3Document
    );

  if (!documentValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_DOCUMENT',
      message:
        documentValidation.message,
    });
  }

  // ==========================================================
  // LIVENESS / SELFIE VALIDATION
  // ==========================================================
  //
  // This confirms that a selfie file was submitted.
  //
  // It does NOT claim that liveness succeeded.
  //
  // Actual liveness verification must be performed by the
  // approved verification provider.
  // ==========================================================

  const selfieValidation =
    validateSelfieFile(
      tier3Selfie
    );

  if (!selfieValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_SELFIE',
      message:
        selfieValidation.message,
    });
  }

  // ==========================================================
  // TIER 3 DOCUMENT REQUIREMENTS
  // ==========================================================
  //
  // These requirements describe what our review process accepts.
  //
  // Automated code should NOT falsely claim that a document
  // contains a genuine stamp, belongs to the user, or is
  // authentic.
  //
  // Those checks require document analysis/provider/manual review.
  // ==========================================================

  const tier3Requirements = {
    bank_statement: {
      accepted:
        'Stamped PDF from bank app, dated within 90 days.',
      rejected:
        'Screenshots or statements older than 90 days.',
    },

    utility_bill: {
      accepted:
        'Provider-issued PHED, water, DSTV, or gas bill.',
      rejected:
        'Old bills or bills not in the user’s name.',
    },

    proof_of_address: {
      accepted:
        'Stamped tenancy agreement or government letter.',
      rejected:
        'Letters from friends or documents without an address.',
    },
  };

  // ==========================================================
  // DATABASE
  // ==========================================================

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ========================================================
    // LOCK USER
    // ========================================================

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          date_of_birth,
          kyc_status,
          kyc_tier,
          tier_3_verified
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
        message:
          'User not found.',
      });
    }

    const user = userResult.rows[0];

    // ========================================================
    // ALREADY VERIFIED
    // ========================================================

    if (user.tier_3_verified === true) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Your Tier 3 verification has already been completed.',
      });
    }

    // ========================================================
    // FIND EXISTING KYC RECORD
    // ========================================================

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

    // ========================================================
    // UPDATE EXISTING RECORD
    // ========================================================

    if (existingKyc.rows.length > 0) {
      kycId =
        existingKyc.rows[0].id;

      await client.query(
        `
        UPDATE kyc_records
        SET
          tier_3_method = $1,

          tier_3_verification_status = 'pending',

          tier_3_verified_at = NULL,

          tier_3_rejection_reason = NULL,

          liveness_status = 'pending',

          liveness_provider_reference = NULL,

          verification_status = 'pending',

          rejection_reason = NULL,

          updated_at = CURRENT_TIMESTAMP

        WHERE id = $2
        `,
        [
          method,
          kycId,
        ]
      );
    }

    // ========================================================
    // CREATE NEW RECORD
    // ========================================================

    else {
      const insertResult =
        await client.query(
          `
          INSERT INTO kyc_records (
            user_id,
            tier_3_method,
            tier_3_verification_status,
            liveness_status,
            verification_status
          )
          VALUES (
            $1,
            $2,
            'pending',
            'pending',
            'pending'
          )
          RETURNING id
          `,
          [
            userId,
            method,
          ]
        );

      kycId =
        insertResult.rows[0].id;
    }

    // ========================================================
    // UPDATE USER
    // ========================================================
    //
    // IMPORTANT:
    //
    // Submission is NOT verification.
    //
    // ========================================================

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

    // ========================================================
    // AUDIT LOG
    // ========================================================

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
        `Tier 3 ${method} document and liveness selfie were received. Document review and liveness verification are pending.`,
      ]
    );

    await client.query('COMMIT');

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      message:
        'Your Tier 3 document and liveness submission have been received. Verification is pending.',

      kyc_record_id:
        kycId,

      tier: 3,

      status: 'pending',

      verified: false,

      method,

      tier_3_verification_status:
        'pending',

      liveness_status:
        'pending',

      requirements:
        tier3Requirements[method],
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
        'Unable to submit Tier 3 verification.',
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
