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
// PROFILE COMPLETENESS
//
// BVN submission requires the user's personal profile to be
// completed first.
//
// This check is performed on the BACKEND.
// ============================================================

const getMissingProfileFields = (user) => {
  const requiredFields = [
    {
      key: 'full_name',
      label: 'Full Legal Name',
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
    },
    {
      key: 'phone',
      label: 'Phone Number',
    },
    {
      key: 'email',
      label: 'Email Address',
    },
    {
      key: 'address',
      label: 'Address',
    },
    {
      key: 'city',
      label: 'City',
    },
    {
      key: 'state',
      label: 'State',
    },
    {
      key: 'lga',
      label: 'LGA',
    },
    {
      key: 'country',
      label: 'Country',
    },
  ];

  return requiredFields
    .filter(({ key }) => {
      const value = user?.[key];

      if (
        value === null ||
        value === undefined
      ) {
        return true;
      }

      return String(value).trim() === '';
    })
    .map(({ label }) => label);
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
      message:
        'The uploaded selfie is empty.',
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
    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // ========================================================
    // GET USER
    // ========================================================

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

    // ========================================================
    // GET LATEST KYC RECORD
    // ========================================================

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

    const record =
      kycResult.rows.length > 0
        ? kycResult.rows[0]
        : null;

    // ========================================================
    // INDIVIDUAL VERIFICATION STATES
    //
    // NOT VERIFIED
    // PENDING
    // VERIFIED
    // REJECTED
    // ========================================================

    const bvnStatus =
      user.bvn_verified === true
        ? 'verified'
        : normalizeKycStatus(
            record?.bvn_verification_status
          );

    const idStatus =
      user.id_verified === true
        ? 'verified'
        : normalizeKycStatus(
            record?.id_verification_status
          );

    const tier3Status =
      user.tier_3_verified === true
        ? 'verified'
        : normalizeKycStatus(
            record?.tier_3_verification_status
          );

    // ========================================================
    // INDIVIDUAL LOCK RULES
    //
    // PENDING  = LOCKED
    // VERIFIED = PERMANENTLY LOCKED
    // REJECTED = CAN RESUBMIT
    // NOT VERIFIED = CAN SUBMIT
    // ========================================================

    const bvnLocked =
      bvnStatus === 'pending' ||
      bvnStatus === 'verified';

    const idLocked =
      idStatus === 'pending' ||
      idStatus === 'verified';

    const tier3Locked =
      tier3Status === 'pending' ||
      tier3Status === 'verified';

    // ========================================================
    // OVERALL KYC STATUS
    // ========================================================

    const kycStatus =
      normalizeKycStatus(
        user.kyc_status
      );

    const verified =
      kycStatus === 'verified';

    const tier = Number(
      user.kyc_tier || 0
    );

    const limits = getTierLimits(
      verified ? tier : 0
    );

    // ========================================================
    // RESPONSE
    // ========================================================

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

        tier: verified
          ? tier
          : 0,

        submitted_tier: tier,

        // ----------------------------------------------------
        // BVN
        // ----------------------------------------------------

        bvn_verified:
          user.bvn_verified === true,

        bvn_status:
          bvnStatus,

        bvn_locked:
          bvnLocked,

        bvn_rejection_reason:
          record?.bvn_rejection_reason ||
          null,

        // ----------------------------------------------------
        // ID
        // ----------------------------------------------------

        id_verified:
          user.id_verified === true,

        id_status:
          idStatus,

        id_locked:
          idLocked,

        id_rejection_reason:
          record?.id_rejection_reason ||
          null,

        // ----------------------------------------------------
        // TIER 3
        // ----------------------------------------------------

        tier_3_verified:
          user.tier_3_verified === true,

        tier_3_status:
          tier3Status,

        tier_3_locked:
          tier3Locked,

        tier_3_method:
          user.tier_3_method ||
          record?.tier_3_method ||
          null,

        tier_3_rejection_reason:
          record?.tier_3_rejection_reason ||
          null,
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

      record,
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
// BVN LIFECYCLE:
//
// NOT VERIFIED
//      ↓
//   SUBMIT
//      ↓
// PENDING 🔒
//      ↓
// ┌───────────────┐
// ↓               ↓
// VERIFIED      REJECTED
//   🔒              ↓
// permanent      correct/resubmit
//                    ↓
//                 PENDING 🔒
//
// BVN submission does NOT verify the BVN.
// The provider/admin verification result determines the
// final state.
// ============================================================

const submitBvn = async (req, res) => {
  const userId =
    req.user?.id ||
    req.userId ||
    req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

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

    // ========================================================
    // LOCK USER
    // ========================================================

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          date_of_birth,
          address,
          city,
          state,
          lga,
          country,
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

    const user =
      userResult.rows[0];

    // ========================================================
    // GET CURRENT BVN VERIFICATION RECORD
    // ========================================================

    const existingKyc =
      await client.query(
        `
        SELECT
          id,
          bvn_verification_status,
          bvn_verified_at,
          bvn_rejection_reason
        FROM kyc_records
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [userId]
      );

    const existingRecord =
      existingKyc.rows.length > 0
        ? existingKyc.rows[0]
        : null;

    const currentBvnStatus =
      normalizeKycStatus(
        existingRecord?.bvn_verification_status
      );

    // ========================================================
    // VERIFIED = PERMANENT LOCK
    // ========================================================

    if (
      user.bvn_verified === true ||
      currentBvnStatus === 'verified'
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        code: 'BVN_ALREADY_VERIFIED',
        message:
          'Your BVN has already been verified and cannot be changed.',
        status: 'verified',
        verified: true,
        locked: true,
      });
    }

    // ========================================================
    // PENDING = LOCK
    // ========================================================

    if (
      currentBvnStatus === 'pending'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        code: 'BVN_VERIFICATION_PENDING',
        message:
          'Your BVN verification is currently pending. You cannot submit another BVN while verification is in progress.',
        status: 'pending',
        verified: false,
        locked: true,
      });
    }

    // ========================================================
    // PROFILE COMPLETENESS CHECK
    //
    // This happens BEFORE accepting a new BVN submission.
    // ========================================================

    const missingProfileFields =
      getMissingProfileFields(user);

    if (
      missingProfileFields.length > 0
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        message:
          'Please complete your personal profile before submitting your BVN.',
        missing_fields:
          missingProfileFields,
      });
    }

    // ========================================================
    // ONLY THESE STATES CAN SUBMIT:
    //
    // NOT VERIFIED
    // REJECTED
    // ========================================================

    let kycId;

    // ========================================================
    // UPDATE EXISTING RECORD
    //
    // IMPORTANT:
    // ONLY BVN fields are changed here.
    //
    // Tier 2 and Tier 3 statuses remain untouched.
    // ========================================================

    if (existingRecord) {
      kycId =
        existingRecord.id;

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
        [
          bvn,
          kycId,
        ]
      );
    }

    // ========================================================
    // CREATE NEW KYC RECORD
    //
    // IMPORTANT:
    // EVERY OTHER VERIFICATION STARTS AS NOT VERIFIED.
    //
    // This prevents a BVN submission from accidentally locking
    // Tier 2 or Tier 3.
    // ========================================================

    else {
      const insertResult =
        await client.query(
          `
          INSERT INTO kyc_records (
            user_id,
            bvn,

            bvn_verification_status,

            id_verification_status,

            liveness_status,

            tier_3_verification_status,

            verification_status
          )
          VALUES (
            $1,
            $2,

            'pending',

            'not_verified',

            'not_verified',

            'not_verified',

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

    // ========================================================
    // UPDATE USER
    //
    // BVN submission means PENDING.
    // It does NOT mean VERIFIED.
    //
    // IMPORTANT:
    // We do not change id_verified or tier_3_verified.
    // ========================================================

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
        'BVN submitted successfully. Your BVN verification is now pending.',

      kyc_record_id:
        kycId,

      tier: 1,

      status: 'pending',

      verified: false,

      locked: true,
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
  const userId =
    req.user?.id ||
    req.userId ||
    req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

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

  // ==========================================================
  // FRONT
  // ==========================================================

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

  // ==========================================================
  // SELFIE
  // ==========================================================

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

  // ==========================================================
  // BACK
  // ==========================================================

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

    const user =
      userResult.rows[0];

    // ========================================================
    // GET CURRENT ID STATUS
    // ========================================================

    const existingKyc =
      await client.query(
        `
        SELECT
          id,
          id_verification_status,
          id_verified_at,
          id_rejection_reason
        FROM kyc_records
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [userId]
      );

    const existingRecord =
      existingKyc.rows.length > 0
        ? existingKyc.rows[0]
        : null;

    const currentIdStatus =
      normalizeKycStatus(
        existingRecord?.id_verification_status
      );

    // ========================================================
    // VERIFIED = PERMANENT LOCK
    // ========================================================

    if (
      user.id_verified === true ||
      currentIdStatus === 'verified'
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        code: 'ID_ALREADY_VERIFIED',
        message:
          'Your identity verification has already been completed and cannot be changed.',
        status: 'verified',
        verified: true,
        locked: true,
      });
    }

    // ========================================================
    // PENDING = LOCK
    // ========================================================

    if (
      currentIdStatus === 'pending'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        code: 'ID_VERIFICATION_PENDING',
        message:
          'Your identity verification is currently pending. You cannot submit another identity verification while verification is in progress.',
        status: 'pending',
        verified: false,
        locked: true,
      });
    }

    // ========================================================
    // UPDATE EXISTING RECORD
    //
    // ONLY Tier 2 fields are changed.
    // ========================================================

    let kycId;

    if (existingRecord) {
      kycId =
        existingRecord.id;

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
    }

    // ========================================================
    // CREATE NEW RECORD
    //
    // Tier 1 and Tier 3 explicitly start as NOT VERIFIED.
    // ========================================================

    else {
      const insertResult =
        await client.query(
          `
          INSERT INTO kyc_records (
            user_id,

            document_type,
            document_number,

            bvn_verification_status,

            id_verification_status,

            liveness_status,

            tier_3_verification_status,

            verification_status
          )
          VALUES (
            $1,

            $2,
            $3,

            'not_verified',

            'pending',

            'pending',

            'not_verified',

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

    // ========================================================
    // SUBMISSION = PENDING
    //
    // IMPORTANT:
    // Do not change BVN or Tier 3 verification flags.
    // ========================================================

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

      kyc_record_id:
        kycId,

      tier: 2,

      status: 'pending',

      verified: false,

      locked: true,

      liveness_status:
        'pending',

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

const submitTier3 = async (req, res) => {
  const userId =
    req.user?.id ||
    req.userId ||
    req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

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
  // TIER 3 REQUIREMENTS
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

    const user =
      userResult.rows[0];

    // ========================================================
    // GET CURRENT TIER 3 STATUS
    // ========================================================

    const existingKyc =
      await client.query(
        `
        SELECT
          id,
          tier_3_verification_status,
          tier_3_verified_at,
          tier_3_rejection_reason
        FROM kyc_records
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [userId]
      );

    const existingRecord =
      existingKyc.rows.length > 0
        ? existingKyc.rows[0]
        : null;

    const currentTier3Status =
      normalizeKycStatus(
        existingRecord?.tier_3_verification_status
      );

    // ========================================================
    // VERIFIED = PERMANENT LOCK
    // ========================================================

    if (
      user.tier_3_verified === true ||
      currentTier3Status === 'verified'
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        code: 'TIER_3_ALREADY_VERIFIED',
        message:
          'Your Tier 3 verification has already been completed and cannot be changed.',
        status: 'verified',
        verified: true,
        locked: true,
      });
    }

    // ========================================================
    // PENDING = LOCK
    // ========================================================

    if (
      currentTier3Status === 'pending'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        code: 'TIER_3_VERIFICATION_PENDING',
        message:
          'Your Tier 3 verification is currently pending. You cannot submit another Tier 3 verification while verification is in progress.',
        status: 'pending',
        verified: false,
        locked: true,
      });
    }

    // ========================================================
    // CREATE OR UPDATE RECORD
    //
    // ONLY Tier 3 fields are changed.
    // ========================================================

    let kycId;

    if (existingRecord) {
      kycId =
        existingRecord.id;

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
    } else {
      const insertResult =
        await client.query(
          `
          INSERT INTO kyc_records (
            user_id,

            tier_3_method,

            bvn_verification_status,

            id_verification_status,

            liveness_status,

            tier_3_verification_status,

            verification_status
          )
          VALUES (
            $1,

            $2,

            'not_verified',

            'not_verified',

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
    //
    // IMPORTANT:
    // Do not change BVN or Tier 2 verification flags.
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

      locked: true,

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
