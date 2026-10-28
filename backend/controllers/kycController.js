 const pool = require('../config/database');
const crypto = require('crypto');

const {
  verifyBvn,
  validateBvn,
  getDojahVerification,
} = require('../services/dojahService');
const {
  uploadKycFile,
  deleteKycFile,
} = require('../services/cloudinaryStorageService');
// ============================================================
// KYC / ACCOUNT LIMITS
// ============================================================

const TIER_LIMITS = {
  0: {
    accountLimit: 50000,
    dailyTransferLimit: 20000,
  },

  1: {
    accountLimit: 300000,
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


const interpretBvnLookup = (result) => {
  if (
    result?.success !== true ||
    !result.data ||
    typeof result.data !== 'object'
  ) {
    return {
      status: 'pending',
      reason: 'lookup_unavailable',
    };
  }

  const entity = result.data.entity;

  if (!entity || typeof entity !== 'object') {
    return {
      status: 'pending',
      reason: 'missing_validation_result',
    };
  }

  const bvnStatus = entity.bvn?.status;
  const firstNameStatus = entity.first_name?.status;
  const lastNameStatus = entity.last_name?.status;

  // Reject only when the provider explicitly reports a mismatch.
  if (
    bvnStatus === false ||
    firstNameStatus === false ||
    lastNameStatus === false ||
    entity.dob?.status === false
  ) {
    return {
      status: 'rejected',
      reason: 'provider_match_failed',
    };
  }

  // Require explicit positive evidence for the BVN and names.
  if (
    bvnStatus !== true ||
    firstNameStatus !== true ||
    lastNameStatus !== true
  ) {
    return {
      status: 'pending',
      reason: 'provider_result_incomplete',
    };
  }

  // If the provider returns a DOB match flag, it must be true.
  if (
    entity.dob &&
    entity.dob.status !== true
  ) {
    return {
      status: 'pending',
      reason: 'dob_match_unconfirmed',
    };
  }

  return {
    status: 'verified',
    reason: 'provider_confirmed_bvn_and_names',
  };
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
    // Used for BVN, Tier 3 and general record information.
    // ========================================================

    
    
    // General KYC record: newest record for the user's overall KYC details.
    const kycResult = await pool.query(
      `
      SELECT
        id,
        bvn_verification_status,
        bvn_verified_at,
        bvn_rejection_reason,
        document_type,
        id_verification_status,
        id_verified_at,
        id_rejection_reason,
        liveness_status,
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

    // Dedicated BVN record: prefer the record with a completed BVN result.
    const bvnResult = await pool.query(
      `
      SELECT
        id,
        bvn_verification_status,
        bvn_verified_at,
        bvn_rejection_reason
      FROM kyc_records
      WHERE user_id = $1
        AND bvn IS NOT NULL
        AND bvn <> ''
      ORDER BY
        CASE
          WHEN bvn_verification_status IN ('verified', 'approved')
            THEN 0
          WHEN bvn_verification_status = 'pending'
            THEN 1
          ELSE 2
        END,
        created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    const bvnRecord =
      bvnResult.rows.length > 0
        ? bvnResult.rows[0]
        : null;

    // Dedicated Tier 3 record.
    const tier3Result = await pool.query(
      `
      SELECT
        id,
        tier_3_method,
        tier_3_verification_status,
        tier_3_verified_at,
        tier_3_rejection_reason
      FROM kyc_records
      WHERE user_id = $1
        AND tier_3_method IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    const tier3Record =
      tier3Result.rows.length > 0
        ? tier3Result.rows[0]
        : null;


    // ========================================================
    // GET LATEST IDENTITY VERIFICATION RECORD
    // Specifically matches the record updated by Dojah.
    // ========================================================

    const identityResult = await pool.query(
  `
  SELECT
    id,
    id_verification_status,
    id_verified_at,
    id_rejection_reason,
    liveness_status,
    dojah_checked_at,
    created_at,
    updated_at
  FROM kyc_records
  WHERE user_id = $1
    AND document_type IS NOT NULL
    AND document_number IS NOT NULL
    AND document_number <> ''
  ORDER BY
    CASE
      WHEN id_verification_status IN (
        'pending',
        'verified',
        'approved',
        'rejected'
      ) THEN 0
      ELSE 1
    END,
    updated_at DESC,
    created_at DESC
  LIMIT 1
  `,
  [userId]
);

const identityRecord =
  identityResult.rows.length > 0
    ? identityResult.rows[0]
    : null;

    // ========================================================
    // INDIVIDUAL VERIFICATION STATES
    // ========================================================

    const bvnStatus =
  user.bvn_verified === true
    ? 'verified'
    : normalizeKycStatus(
        bvnRecord?.bvn_verification_status
      );

const idStatus =
  user.id_verified === true
    ? 'verified'
    : normalizeKycStatus(
        identityRecord?.id_verification_status
      );

const tier3Status =
  user.tier_3_verified === true
    ? 'verified'
    : normalizeKycStatus(
        tier3Record?.tier_3_verification_status
      );

    // ========================================================
    // INDIVIDUAL LOCK RULES
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
    // Do not approve the entire account from identity alone.
    // ========================================================
    const kycStatus =
  normalizeKycStatus(user.kyc_status);

const storedTier = Math.max(
  0,
  Number(user.kyc_tier || 0)
);

// A verified BVN establishes Tier 1 verification only.
// Higher tiers still require their own verification.
const verifiedTier =
  tier3Status === 'verified'
    ? 3
    : idStatus === 'verified'
      ? 2
      : bvnStatus === 'verified'
        ? 1
        : 0;

const tier = verifiedTier;

const limits = getTierLimits(tier);
    

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

          tier,

          submitted_tier: storedTier,
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
  bvnRecord?.bvn_rejection_reason || null,

        // ----------------------------------------------------
        // IDENTITY
        // ----------------------------------------------------

        id_verified:
          user.id_verified === true,

        id_status:
          idStatus,

        id_locked:
          idLocked,

        id_rejection_reason:
          identityRecord?.id_rejection_reason ||
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
  tier3Record?.tier_3_method ||
  null,

tier_3_rejection_reason:
  tier3Record?.tier_3_rejection_reason ||
  null,
      },

      limits: {
        account_limit:
          limits.accountLimit,

        daily_transfer_limit:
          limits.dailyTransferLimit,

        daily_transfer_used:
          Number(user.daily_transfer_used || 0),

        daily_transfer_remaining:
          limits.dailyTransferLimit === null
            ? null
            : Math.max(
                limits.dailyTransferLimit -
                  Number(user.daily_transfer_used || 0),
                0
              ),
      },

      record,
    });
  }catch (error) {
  console.error('Get KYC status error:', {
  message: error.message,
  code: error.code,
  detail: error.detail,
  position: error.position,
});

    return res.status(500).json({
      success: false,
      message: 'Unable to get KYC status',
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
// IMPORTANT:
// Dojah is the verification authority.
//
// This endpoint sends the BVN to Dojah and places the
// Zenimonies verification into PENDING state.
//
// It does NOT automatically mark the BVN as VERIFIED.
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

  const bvn = String(req.body?.bvn || '').trim();

  if (!/^\d{11}$/.test(bvn)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_BVN',
      message: 'BVN must contain exactly 11 digits',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ========================================================
    // LOCK USER
    // ========================================================
    const userResult = await client.query(
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

    const user = userResult.rows[0];

    // ========================================================
    // GET CURRENT BVN RECORD
    // ========================================================
    const existingKyc = await client.query(
      `
      SELECT
        id,
        bvn_verification_status,
        bvn_verified_at,
        bvn_rejection_reason,
        bvn_provider_reference
      FROM kyc_records
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    const existingRecord =
      existingKyc.rows.length > 0 ? existingKyc.rows[0] : null;

    const currentBvnStatus = normalizeKycStatus(
      existingRecord?.bvn_verification_status
    );

    // ========================================================
    // ALREADY VERIFIED → LOCK
    // ========================================================
    if (user.bvn_verified === true || currentBvnStatus === 'verified') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        code: 'BVN_ALREADY_VERIFIED',
        message: 'Your BVN has already been verified and cannot be changed.',
        status: 'verified',
        verified: true,
        locked: true,
      });
    }

    // ========================================================
    // ALREADY PENDING → LOCK
    // ========================================================
    if (currentBvnStatus === 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        code: 'BVN_VERIFICATION_PENDING',
        message: 'Your BVN verification is still being processed.',
        status: 'pending',
        verified: false,
        locked: true,
      });
    }

    // ========================================================
    // PROFILE COMPLETENESS
    // ========================================================
    const missingProfileFields = getMissingProfileFields(user);

    if (missingProfileFields.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        message: 'Please complete your personal profile before submitting your BVN.',
        missing_fields: missingProfileFields,
      });
    }

    // ========================================================
    // PREPARE NAME + DOB FOR DOJAH
    // ========================================================
    const nameParts = String(user.full_name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const firstName = nameParts[0] || '';
    const lastName =
      nameParts.length > 1
        ? nameParts.slice(1).join(' ')
        : nameParts[0] || '';

    const dateOfBirth = user.date_of_birth
      ? new Date(user.date_of_birth).toISOString().slice(0, 10)
      : '';

    if (!firstName || !lastName || !dateOfBirth) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        message: 'Full name and date of birth are required for BVN verification.',
      });
    }

    // ========================================================
    // CALL DOJAH
    // ========================================================
    const dojahResult = await validateBvn({
      bvn,
      firstName,
      lastName,
      dateOfBirth,
    });
console.log('[KYC BVN DEBUG]', {
  success: dojahResult?.success === true,
  httpStatus: dojahResult?.status ?? null,
  topLevelKeys:
    dojahResult?.data &&
    typeof dojahResult.data === 'object'
      ? Object.keys(dojahResult.data)
      : [],
  entityKeys:
    dojahResult?.data?.entity &&
    typeof dojahResult.data.entity === 'object'
      ? Object.keys(dojahResult.data.entity)
      : [],
  bvnStatusType:
    typeof dojahResult?.data?.entity?.bvn?.status,
  firstNameStatusType:
    typeof dojahResult?.data?.entity?.first_name?.status,
  lastNameStatusType:
    typeof dojahResult?.data?.entity?.last_name?.status,
  dobStatusType:
    typeof dojahResult?.data?.entity?.dob?.status,
});



    if (!dojahResult?.success) {
      await client.query('ROLLBACK');

      console.error('Dojah BVN validation failed:', {
        status: dojahResult?.status || null,
        message: dojahResult?.message || null,
      });

      return res.status(502).json({
        success: false,
        code: 'DOJAH_BVN_VALIDATION_FAILED',
        message: 'We could not validate your BVN at this time. Please try again later.',
      });
    }

    // ========================================================
    // INTERPRET RESULT
    // ========================================================
    const bvnDecision = interpretBvnLookup(dojahResult);
    const finalBvnStatus = bvnDecision.status; // 'verified' | 'rejected' | 'pending'

    let kycId;

    // ========================================================
    // UPDATE OR CREATE KYC RECORD
    // ========================================================
    if (existingRecord) {
      kycId = existingRecord.id;

      await client.query(
        `
        UPDATE kyc_records
        SET
          bvn = $1,
          bvn_provider_reference = NULL,
          bvn_verified_name = NULL,
          bvn_verified_date_of_birth = NULL,
          bvn_provider_validation_result = $2,
          bvn_verification_status = $3,
          bvn_verified_at = CASE
            WHEN $3 = 'verified' THEN CURRENT_TIMESTAMP
            ELSE NULL
          END,
          bvn_rejection_reason = CASE
            WHEN $3 = 'rejected' THEN $4
            ELSE NULL
          END,
          verification_status = CASE
            WHEN $3 = 'rejected' THEN 'rejected'
            ELSE 'pending'
          END,
          rejection_reason = CASE
            WHEN $3 = 'rejected' THEN $4
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        `,
        [
          bvn,
          finalBvnStatus,
          finalBvnStatus,
          finalBvnStatus === 'rejected' ? bvnDecision.reason : null,
          kycId,
        ]
      );
    } else {
      const insertResult = await client.query(
        `
        INSERT INTO kyc_records (
          user_id,
          bvn,
          bvn_provider_validation_result,
          bvn_verification_status,
          bvn_verified_at,
          bvn_rejection_reason,
          id_verification_status,
          liveness_status,
          tier_3_verification_status,
          verification_status,
          rejection_reason
        )
        VALUES (
          $1, $2, $3, $4,
          CASE WHEN $4 = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END,
          $5,
          'not_verified',
          'not_verified',
          'not_verified',
          CASE WHEN $4 = 'rejected' THEN 'rejected' ELSE 'pending' END,
          $5
        )
        RETURNING id
        `,
        [
          userId,
          bvn,
          finalBvnStatus,
          finalBvnStatus,
          finalBvnStatus === 'rejected' ? bvnDecision.reason : null,
        ]
      );

      kycId = insertResult.rows[0].id;
    }

    // ========================================================
    // UPDATE USER
    // ========================================================
    await client.query(
      `
      UPDATE users
      SET
        bvn = $1,
        bvn_verified = $2,
        kyc_status = CASE
          WHEN $3 = 'rejected' THEN 'rejected'
          ELSE 'pending'
        END,
        kyc_tier = CASE
          WHEN $2 = true THEN GREATEST(kyc_tier, 1)
          ELSE 1
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      `,
      [
        bvn,
        finalBvnStatus === 'verified',
        finalBvnStatus,
        userId,
      ]
    );

    // ========================================================
    // AUDIT LOG
    // ========================================================
    await client.query(
      `
      INSERT INTO audit_logs (user_id, action, description)
      VALUES ($1, 'kyc_bvn_submitted', $2)
      `,
      [
        userId,
        `BVN submitted. Status: ${finalBvnStatus}. Reason: ${bvnDecision.reason || 'n/a'}`,
      ]
    );

    await client.query('COMMIT');

    // ========================================================
    // RESPONSE
    // ========================================================
    return res.status(200).json({
      success: true,
      message:
        finalBvnStatus === 'verified'
          ? 'Your BVN has been verified successfully.'
          : finalBvnStatus === 'rejected'
          ? 'Your BVN could not be verified. Please check your details or contact support.'
          : 'Your BVN submission is awaiting verification review.',
      kyc_record_id: kycId,
      tier: 1,
      status: finalBvnStatus,
      verified: finalBvnStatus === 'verified',
      locked: finalBvnStatus === 'verified' || finalBvnStatus === 'pending',
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error('Submit BVN error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to submit BVN',
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
  ).trim().toLowerCase();

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

  if (!allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DOCUMENT_TYPE',
      message: 'Please select a valid government-issued ID.',
    });
  }

  const isNin =
    documentType === 'nin' ||
    documentType === 'national_id';

  // NIN must contain exactly 11 digits.
  if (
    isNin &&
    !/^\d{11}$/.test(documentNumber)
  ) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_NIN',
      message: 'NIN must contain exactly 11 digits.',
    });
  }

  if (!documentNumber) {
    return res.status(400).json({
      success: false,
      code: 'DOCUMENT_NUMBER_REQUIRED',
      message: 'Document number is required.',
    });
  }

  const idFrontFile =
    req.files?.document_front?.[0] || null;

  const idBackFile =
    req.files?.document_back?.[0] || null;

  const selfieFile =
    req.files?.selfie?.[0] || null;

  // NIN does not require ID images.
  if (!isNin) {
    const frontValidation =
      validateIdFile(idFrontFile);

    if (!frontValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_FRONT',
        message: frontValidation.message,
      });
    }
  }
 // Only NIN is number-only.
// All other supported IDs require front and back images.
const documentsWithoutBack = [
  'nin',
  'national_id',
];

  if (!documentsWithoutBack.includes(documentType)) {
    if (!idBackFile) {
      return res.status(400).json({
        success: false,
        code: 'ID_BACK_REQUIRED',
        message: 'The back of your ID document is required.',
      });
    }

    const backValidation =
      validateIdFile(idBackFile);

    if (!backValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_BACK',
        message: backValidation.message,
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
      SELECT
        id,
        full_name,
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
        message: 'User not found.',
      });
    }

    const user = userResult.rows[0];

    const existingKyc = await client.query(
      `
      SELECT
        id,
        id_verification_status
      FROM kyc_records
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    const existingRecord =
      existingKyc.rows[0] || null;

    const currentIdStatus =
      normalizeKycStatus(
        existingRecord?.id_verification_status
      );

    if (
      user.id_verified === true ||
      currentIdStatus === 'verified' ||
      currentIdStatus === 'approved'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        code: 'ID_ALREADY_VERIFIED',
        message:
          'Your identity verification has already been completed.',
        status: 'verified',
        locked: true,
      });
    }

    if (currentIdStatus === 'pending') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        code: 'ID_VERIFICATION_PENDING',
        message:
          'Your identity verification is already being processed.',
        status: 'pending',
        locked: true,
      });
    }

    let kycId;

    if (existingRecord) {
      kycId = existingRecord.id;

      await client.query(
        `
        
UPDATE kyc_records
SET
  document_type = $1,
  document_number = $2,
  dojah_reference = NULL,
  dojah_verification_type = NULL,
  dojah_started_at = NULL,
  dojah_checked_at = NULL,
  id_verification_status = 'pending',
          id_verified_at = NULL,
          id_rejection_reason = NULL,
          liveness_status = 'pending',
          liveness_provider_reference = NULL,
          verification_status = 'pending',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND user_id = $4
        `,
        [
          documentType,
          documentNumber,
          kycId,
          userId,
        ]
      );
    } else {
      const insertResult = await client.query(
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

      kycId = insertResult.rows[0].id;
    }

    // Do not elevate the customer's verified tier here.
    // Tier 2 must be approved by the trusted verification process.
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
      VALUES ($1, $2, $3)
      `,
      [
        userId,
        'kyc_tier2_submitted',
        `Tier 2 ${isNin ? 'NIN' : 'government ID'} submission received. Identity and liveness checks are pending.`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Your details and selfie have been received. Identity and liveness verification must be completed before approval.',
      kyc_record_id: kycId,
      tier: 2,
      status: 'pending',
      verified: false,
      locked: true,
      id_verification_status: 'pending',
      liveness_status: 'pending',
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Tier 2 rollback failed:',
        rollbackError.message
      );
    }

    console.error('Submit Tier 2 error:', {
      message: error.message,
      code: error.code,
    });

    return res.status(500).json({
      success: false,
      message: 'Unable to submit Tier 2 verification.',
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

  const documentType = String(
    req.body?.tier_3_document_type || ''
  ).trim();

  const allowedMethods = [
    'bank_statement',
    'utility_bill',
    'proof_of_address',
    'address_document',
  ];

  const allowedDocumentTypes = [
    'bank_statement',
    'utility_bill',
    'tax_proof',
    'rent_receipt_or_agreement',
  ];

  if (!allowedMethods.includes(method)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_METHOD',
      message: 'Please select a valid Tier 3 verification method.',
    });
  }

  if (!allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_DOCUMENT_TYPE',
      message: 'Please select a valid proof of address document.',
    });
  }

  const employmentStatus = String(
    req.body?.employment_status || ''
  ).trim();

  const occupation = String(
    req.body?.occupation || ''
  ).trim();

  const annualIncomeRange = String(
    req.body?.annual_income_range || ''
  ).trim();

  const allowedEmploymentStatuses = [
    'employed',
    'self_employed',
    'business_owner',
    'student',
    'unemployed',
    'retired',
    'other',
  ];

  const allowedIncomeRanges = [
    'below_500000',
    '500000_999999',
    '1000000_2999999',
    '3000000_4999999',
    '5000000_9999999',
    '10000000_plus',
    'prefer_not_to_say',
  ];

  if (
    !allowedEmploymentStatuses.includes(employmentStatus) ||
    !occupation ||
    occupation.length > 120 ||
    !allowedIncomeRanges.includes(annualIncomeRange)
  ) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_EMPLOYMENT_INCOME',
      message:
        'Please provide a valid employment status, occupation, and annual income range.',
    });
  }

  const tier3Document =
    req.files?.tier_3_document?.[0] || null;

  const tier3Selfie =
    req.files?.tier_3_selfie?.[0] || null;

  const documentValidation =
    validateProofOfAddressFile(tier3Document);

  if (!documentValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_DOCUMENT',
      message: documentValidation.message,
    });
  }

  const selfieValidation =
    validateSelfieFile(tier3Selfie);

  if (!selfieValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_SELFIE',
      message: selfieValidation.message,
    });
  }

  // Keep the selected document requirements visible to the user.
  const tier3Requirements = {
    bank_statement: {
      accepted:
        'Bank statement dated within the last 90 days.',
      rejected:
        'Screenshots or statements older than 90 days.',
    },
    utility_bill: {
      accepted:
        'Electricity, water, or waste bill issued by the relevant service provider and dated within the last 90 days.',
      rejected:
        'Bills older than 90 days or bills that do not meet proof-of-address requirements.',
    },
    tax_proof: {
      accepted:
        'Valid tax document that meets proof-of-address review requirements.',
      rejected:
        'Invalid, outdated, or insufficient documents.',
    },
    rent_receipt_or_agreement: {
      accepted:
        'Valid rent receipt or tenancy agreement showing the address.',
      rejected:
        'Invalid documents or documents that do not establish the applicant’s address.',
    },
  };

  let client;
  let transactionStarted = false;
  let transactionCommitted = false;
  let uploadedDocument = null;
  let uploadedSelfie = null;

  const cleanupUploadedFiles = async () => {
    const files = [
      uploadedSelfie,
      uploadedDocument,
    ].filter(Boolean);

    for (const file of files) {
      try {
        await deleteKycFile({
          publicId: file.publicId,
          resourceType: file.resourceType,
        });
      } catch (cleanupError) {
        // Do not log file contents, credentials, or customer documents.
        console.error(
          'KYC storage cleanup failed. Manual storage review may be required.'
        );
      }
    }
  };

  try {
    client = await pool.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // Lock the user to prevent concurrent Tier 3 submissions.
    const userResult = await client.query(
      `
      SELECT id, tier_3_verified
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const user = userResult.rows[0];

    const existingKyc = await client.query(
      `
      SELECT
        id,
        tier_3_verification_status
      FROM kyc_records
      WHERE user_id = $1
        AND tier_3_method IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    const existingRecord =
      existingKyc.rows[0] || null;

    const currentTier3Status =
      normalizeKycStatus(
        existingRecord?.tier_3_verification_status
      );

    if (
      user.tier_3_verified === true ||
      currentTier3Status === 'verified'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

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

    if (currentTier3Status === 'pending') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        code: 'TIER_3_VERIFICATION_PENDING',
        message:
          'Your Tier 3 verification is pending. Please wait for the review to finish.',
        status: 'pending',
        verified: false,
        locked: true,
      });
    }

    // Upload both files as authenticated Cloudinary assets.
    // Do not save or return public delivery URLs.
    uploadedDocument = await uploadKycFile({
      file: tier3Document,
      userId,
      documentKind: 'proof_of_address',
    });

    uploadedSelfie = await uploadKycFile({
      file: tier3Selfie,
      userId,
      documentKind: 'selfie',
    });

    let kycId;

    
if (existingRecord) {
  kycId = existingRecord.id;

  await client.query(
    `
    UPDATE kyc_records
    SET
      tier_3_method = $1,
      tier_3_document_type = $2,
      employment_status = $3,
      occupation = $4,
      annual_income_range = $5,

      tier_3_document_asset_id = $6,
      tier_3_document_public_id = $7,
      tier_3_document_resource_type = $8,
      tier_3_document_format = $9,

      tier_3_selfie_asset_id = $10,
      tier_3_selfie_public_id = $11,
      tier_3_selfie_resource_type = $12,
      tier_3_selfie_format = $13,

      tier_3_document_url = NULL,
      tier_3_verification_status = 'pending',
      tier_3_verified_at = NULL,
      tier_3_rejection_reason = NULL,

      liveness_status = 'pending',
      liveness_provider_reference = NULL,
      verification_status = 'pending',
      rejection_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $14
      AND user_id = $15
    `,
    [
      method,
      documentType,
      employmentStatus,
      occupation,
      annualIncomeRange,

      uploadedDocument.assetId,
      uploadedDocument.publicId,
      uploadedDocument.resourceType,
      uploadedDocument.format,

      uploadedSelfie.assetId,
      uploadedSelfie.publicId,
      uploadedSelfie.resourceType,
      uploadedSelfie.format,

      kycId,
      userId,
    ]
  );
} else {
  const insertResult = await client.query(
    `
    INSERT INTO kyc_records (
      user_id,
      tier_3_method,
      tier_3_document_type,
      employment_status,
      occupation,
      annual_income_range,

      tier_3_document_asset_id,
      tier_3_document_public_id,
      tier_3_document_resource_type,
      tier_3_document_format,

      tier_3_selfie_asset_id,
      tier_3_selfie_public_id,
      tier_3_selfie_resource_type,
      tier_3_selfie_format,

      bvn_verification_status,
      id_verification_status,
      liveness_status,
      tier_3_verification_status,
      verification_status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14,
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
      documentType,
      employmentStatus,
      occupation,
      annualIncomeRange,

      uploadedDocument.assetId,
      uploadedDocument.publicId,
      uploadedDocument.resourceType,
      uploadedDocument.format,

      uploadedSelfie.assetId,
      uploadedSelfie.publicId,
      uploadedSelfie.resourceType,
      uploadedSelfie.format,
    ]
  );

  kycId = insertResult.rows[0].id;
}


    await client.query(
      `
      UPDATE users
      SET
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
      VALUES ($1, 'kyc_tier3_submitted', $2)
      `,
      [
        userId,
        `Tier 3 ${method} submission received. Document type: ${documentType}. Employment and income information received. Private document and selfie uploads completed; verification remains pending.`,
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    transactionCommitted = true;

    return res.status(200).json({
      success: true,
      message:
        'Your Tier 3 information has been received. Verification is pending.',
      kyc_record_id: kycId,
      tier: 3,
      status: 'pending',
      verified: false,
      locked: true,
      method,
      document_type: documentType,
      tier_3_verification_status: 'pending',
      liveness_status: 'pending',
      requirements: tier3Requirements[documentType],
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      transactionStarted = false;
    }

    // If the database operation failed before commit, remove new assets.
    if (!transactionCommitted) {
      await cleanupUploadedFiles();
    }

    // Never return internal storage details or credentials to the client.
    console.error(
      'Submit Tier 3 failed:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to submit Tier 3 verification. Please try again later.',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};
// ============================================================
// DOJAH WIDGET SESSION
// START VERIFICATION
//
// POST /api/kyc/dojah/start
//
// The reference is generated on the backend.
// The frontend must never choose another user's reference.
// ============================================================

const startDojahVerification = async (req, res) => {
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

  const verificationType = String(
    req.body?.verification_type || 'tier_2'
  ).trim().toLowerCase();

  const allowedTypes = [
    'tier_1',
    'tier_2',
    'tier_3',
  ];

  if (!allowedTypes.includes(verificationType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification type.',
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, id_verified, bvn_verified, tier_3_verified
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (!userResult.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const user = userResult.rows[0];

    if (
      verificationType === 'tier_1' &&
      user.bvn_verified === true
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Your BVN is already verified.',
      });
    }

    if (
      verificationType === 'tier_2' &&
      user.id_verified === true
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Your identity is already verified.',
      });
    }

    if (
      verificationType === 'tier_3' &&
      user.tier_3_verified === true
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Your Tier 3 verification is already complete.',
      });
    }

    let recordResult;

    if (verificationType === 'tier_1') {
      recordResult = await client.query(
        `SELECT
           id,
           bvn,
           bvn_verification_status,
           bvn_provider_reference,
           dojah_reference,
           dojah_verification_type
         FROM kyc_records
         WHERE user_id = $1
           AND bvn IS NOT NULL
           AND bvn <> ''
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [userId]
      );
    } else if (verificationType === 'tier_2') {
      recordResult = await client.query(
        `SELECT
           id,
           id_verification_status,
           dojah_reference,
           dojah_verification_type
         FROM kyc_records
         WHERE user_id = $1
           AND document_type IS NOT NULL
           AND document_number IS NOT NULL
           AND document_number <> ''
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [userId]
      );
    } else {
      recordResult = await client.query(
        `SELECT
           id,
           tier_3_method,
           tier_3_verification_status,
           liveness_status,
           dojah_reference,
           dojah_verification_type
         FROM kyc_records
         WHERE user_id = $1
           AND tier_3_method IS NOT NULL
           AND tier_3_document_asset_id IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [userId]
      );
    }

    const record = recordResult.rows[0];

    if (!record) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          verificationType === 'tier_1'
            ? 'Submit your BVN before starting verification.'
            : verificationType === 'tier_2'
              ? 'Submit your identity details before starting verification.'
              : 'Submit your Tier 3 documents before starting verification.',
      });
    }

    const expectedType =
      verificationType === 'tier_1'
        ? 'bvn'
        : verificationType === 'tier_2'
          ? 'identity'
          : 'tier_3_liveness';

    const currentStatus = String(
      verificationType === 'tier_1'
        ? record.bvn_verification_status || ''
        : verificationType === 'tier_2'
          ? record.id_verification_status || ''
          : record.liveness_status || ''
    ).trim().toLowerCase();

    if (
      verificationType !== 'tier_3' &&
      ['verified', 'approved'].includes(currentStatus)
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'This verification is already approved.',
      });
    }

    if (
      verificationType === 'tier_3' &&
      ['verified', 'approved'].includes(currentStatus)
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Tier 3 liveness has already been verified.',
      });
    }

    const existingReference = String(
      record.dojah_reference || ''
    ).trim();

    if (
      existingReference &&
      record.dojah_verification_type === expectedType &&
      currentStatus === 'pending'
    ) {
      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        reference_id: existingReference,
        kyc_record_id: record.id,
        verification_type: verificationType,
        status: 'pending',
        already_pending: true,
        message: 'Continuing the existing verification session.',
      });
    }

    const referenceId = `zen_${crypto.randomUUID()}`;

    if (verificationType === 'tier_1') {
      await client.query(
        `UPDATE kyc_records
         SET
           dojah_reference = $1,
           dojah_verification_type = 'bvn',
           bvn_provider_reference = $1,
           dojah_started_at = CURRENT_TIMESTAMP,
           dojah_checked_at = NULL,
           bvn_verification_status = 'pending',
           bvn_rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND user_id = $3`,
        [referenceId, record.id, userId]
      );
    } else if (verificationType === 'tier_2') {
      await client.query(
        `UPDATE kyc_records
         SET
           dojah_reference = $1,
           dojah_verification_type = 'identity',
           dojah_started_at = CURRENT_TIMESTAMP,
           dojah_checked_at = NULL,
           id_verification_status = 'pending',
           liveness_status = 'pending',
           liveness_score = NULL,
           selfie_match_score = NULL,
           id_verified_at = NULL,
           id_rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND user_id = $3`,
        [referenceId, record.id, userId]
      );
    } else {
      await client.query(
        `UPDATE kyc_records
         SET
           dojah_reference = $1,
           dojah_verification_type = 'tier_3_liveness',
           dojah_started_at = CURRENT_TIMESTAMP,
           dojah_checked_at = NULL,
           liveness_status = 'pending',
           liveness_score = NULL,
           selfie_match_score = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND user_id = $3`,
        [referenceId, record.id, userId]
      );
    }

    await client.query(
      `UPDATE users
       SET
         kyc_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    await client.query(
      `INSERT INTO audit_logs (
         user_id,
         action,
         description
       )
       VALUES ($1, $2, $3)`,
      [
        userId,
        'dojah_verification_started',
        verificationType === 'tier_1'
          ? 'Tier 1 BVN verification session initiated.'
          : verificationType === 'tier_2'
            ? 'Tier 2 identity verification session initiated.'
            : 'Tier 3 liveness verification session initiated.',
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      reference_id: referenceId,
      kyc_record_id: record.id,
      verification_type: verificationType,
      status: 'pending',
      message: 'Verification session created.',
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    console.error('Start verification session failed:', {
      code: error?.code || null,
      message: error?.message || 'Unknown error',
    });

    return res.status(500).json({
      success: false,
      message: 'Unable to start verification.',
    });
  } finally {
    if (client) client.release();
  }
};

// ============================================================
// DOJAH WIDGET VERIFICATION
// CONFIRM / FETCH PROVIDER RESULT
//
// POST /api/kyc/dojah/confirm
//
// The server uses the logged-in user's stored reference.
// It does not trust a reference supplied by the browser.
// ============================================================


const confirmDojahVerification = async (req, res) => {
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

  const clientReference = String(
    req.body?.reference_id || ''
  ).trim();

  const requestedType = String(
    req.body?.verification_type || 'tier_2'
  ).trim().toLowerCase();

  if (
    clientReference.length > 150 ||
    !['tier_2', 'tier_3'].includes(requestedType)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification request.',
    });
  }

  const sessionType =
    requestedType === 'tier_3'
      ? 'tier_3_liveness'
      : 'identity';

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `SELECT
         id,
         dojah_reference,
         dojah_verification_type,
         id_verification_status,
         liveness_status,
         tier_3_verification_status
       FROM kyc_records
       WHERE user_id = $1
         AND dojah_verification_type = $2
       ORDER BY dojah_started_at DESC NULLS LAST,
                updated_at DESC
       LIMIT 1`,
      [userId, sessionType]
    );

    const record = result.rows[0];

    if (!record || !record.dojah_reference) {
      return res.status(404).json({
        success: false,
        message: 'No matching verification session was found.',
      });
    }

    if (
      clientReference &&
      clientReference !== record.dojah_reference
    ) {
      return res.status(409).json({
        success: false,
        message: 'The verification session does not match.',
      });
    }

    const lookupReference = record.dojah_reference;
    const providerResult =
      await getDojahVerification(lookupReference);

    if (
      providerResult?.success !== true ||
      !providerResult.data ||
      typeof providerResult.data !== 'object' ||
      Array.isArray(providerResult.data)
    ) {
      return res.status(502).json({
        success: false,
        status: 'pending',
        message: 'The verification result is not available yet.',
      });
    }

    const verification = providerResult.data;

    const returnedReference = String(
      verification.reference_id || ''
    ).trim();

    if (
      !returnedReference ||
      returnedReference !== lookupReference
    ) {
      return res.status(502).json({
        success: false,
        status: 'pending',
        message: 'The verification result could not be matched.',
      });
    }

    const sessionStatus = String(
      verification.verification_status || ''
    ).trim().toLowerCase();

    const resultData = verification.data || {};
    const governmentData = resultData.government_data;
    const selfieData = resultData.selfie;

    const outcome = (step) => {
      const value = step?.status;

      if (value === true) return 'verified';
      if (value === false) return 'rejected';

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (
          [
            'success',
            'successful',
            'verified',
            'passed',
            'pass',
            'approved',
          ].includes(normalized)
        ) {
          return 'verified';
        }

        if (
          [
            'failed',
            'failure',
            'rejected',
            'declined',
            'fail',
          ].includes(normalized)
        ) {
          return 'rejected';
        }
      }

      return 'pending';
    };

    const score = (value) => {
      const number = Number(value);

      return value !== null &&
        value !== undefined &&
        value !== '' &&
        Number.isFinite(number) &&
        number >= 0 &&
        number <= 100
        ? number
        : null;
    };

    const livenessScore = score(
      selfieData?.data?.liveness_score
    );

    const selfieMatchScore = score(
      selfieData?.data?.match_score
    );

    const sessionCompleted = [
      'completed',
      'complete',
    ].includes(sessionStatus);

    const sessionFailed = [
      'failed',
      'abandoned',
      'rejected',
    ].includes(sessionStatus);

    let idStatus = 'pending';
    let livenessStatus = 'pending';

    if (sessionCompleted) {
      livenessStatus = outcome(selfieData);

      if (requestedType === 'tier_2') {
        idStatus = outcome(governmentData);
      }
    } else if (sessionFailed) {
      livenessStatus = 'rejected';

      if (requestedType === 'tier_2') {
        idStatus = 'rejected';
      }
    }

    // A missing liveness result must never be treated as success.
    if (!selfieData || typeof selfieData !== 'object') {
      livenessStatus = 'pending';
    }

    await client.query('BEGIN');

    const locked = await client.query(
      `SELECT
         id,
         dojah_reference,
         dojah_verification_type,
         id_verification_status,
         liveness_status,
         tier_3_verification_status
       FROM kyc_records
       WHERE id = $1
         AND user_id = $2
         AND dojah_reference = $3
         AND dojah_verification_type = $4
       FOR UPDATE`,
      [
        record.id,
        userId,
        lookupReference,
        sessionType,
      ]
    );

    if (!locked.rows.length) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'The verification session changed. Please try again.',
      });
    }

    let savedIdStatus = 'not_verified';
    let savedLivenessStatus = 'pending';
    let savedTier3Status = null;

    if (requestedType === 'tier_2') {
      await client.query(
        `UPDATE kyc_records
         SET
           id_verification_status = CASE
             WHEN id_verification_status IN ('verified', 'approved')
               THEN id_verification_status
             WHEN $2 <> 'pending' THEN $2
             ELSE id_verification_status
           END,
           id_verified_at = CASE
             WHEN $2 = 'verified'
               THEN COALESCE(id_verified_at, CURRENT_TIMESTAMP)
             ELSE id_verified_at
           END,
           id_rejection_reason = CASE
             WHEN $2 = 'rejected'
               THEN 'Identity check did not pass verification.'
             WHEN $2 = 'verified' THEN NULL
             ELSE id_rejection_reason
           END,
           liveness_status = CASE
             WHEN liveness_status IN ('verified', 'approved')
               THEN liveness_status
             WHEN $3 <> 'pending' THEN $3
             ELSE liveness_status
           END,
           liveness_score = COALESCE($4, liveness_score),
           selfie_match_score = COALESCE($5, selfie_match_score),
           dojah_checked_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND user_id = $6
           AND dojah_reference = $7
           AND dojah_verification_type = 'identity'`,
        [
          record.id,
          idStatus,
          livenessStatus,
          livenessScore,
          selfieMatchScore,
          userId,
          lookupReference,
        ]
      );

      const saved = await client.query(
        `SELECT id_verification_status, liveness_status
         FROM kyc_records
         WHERE id = $1 AND user_id = $2`,
        [record.id, userId]
      );

      savedIdStatus = String(
        saved.rows[0]?.id_verification_status || ''
      ).toLowerCase();

      savedLivenessStatus = String(
        saved.rows[0]?.liveness_status || ''
      ).toLowerCase();

      if (
        ['verified', 'approved'].includes(savedIdStatus) &&
        ['verified', 'approved'].includes(savedLivenessStatus)
      ) {
        await client.query(
          `UPDATE users
           SET id_verified = TRUE,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [userId]
        );
      }
    } else {
      // Tier 3 liveness only. Do not approve the address document here.
      await client.query(
        `UPDATE kyc_records
         SET
           liveness_status = CASE
             WHEN liveness_status IN ('verified', 'approved')
               THEN liveness_status
             WHEN $2 <> 'pending' THEN $2
             ELSE liveness_status
           END,
           liveness_score = COALESCE($3, liveness_score),
           selfie_match_score = COALESCE($4, selfie_match_score),
           tier_3_verification_status = CASE
             WHEN tier_3_verification_status IN ('verified', 'approved')
               THEN tier_3_verification_status
             WHEN $2 = 'rejected' THEN 'rejected'
             ELSE tier_3_verification_status
           END,
           tier_3_rejection_reason = CASE
             WHEN $2 = 'rejected'
               THEN 'Liveness verification did not pass.'
             ELSE tier_3_rejection_reason
           END,
           dojah_checked_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND user_id = $5
           AND dojah_reference = $6
           AND dojah_verification_type = 'tier_3_liveness'`,
        [
          record.id,
          livenessStatus,
          livenessScore,
          selfieMatchScore,
          userId,
          lookupReference,
        ]
      );

      const saved = await client.query(
        `SELECT liveness_status, tier_3_verification_status
         FROM kyc_records
         WHERE id = $1 AND user_id = $2`,
        [record.id, userId]
      );

      savedLivenessStatus = String(
        saved.rows[0]?.liveness_status || 'pending'
      ).toLowerCase();

      savedTier3Status = String(
        saved.rows[0]?.tier_3_verification_status || 'pending'
      ).toLowerCase();
    }

    await client.query('COMMIT');

    const livenessVerified = [
      'verified',
      'approved',
    ].includes(savedLivenessStatus);

    const identityVerified = [
      'verified',
      'approved',
    ].includes(savedIdStatus);

    return res.status(200).json({
      success: true,
      verification_type: requestedType,
      status:
        requestedType === 'tier_2'
          ? identityVerified && livenessVerified
            ? 'verified'
            : savedIdStatus === 'rejected' ||
                savedLivenessStatus === 'rejected'
              ? 'rejected'
              : 'pending'
          : savedLivenessStatus === 'rejected'
            ? 'rejected'
            : 'pending',
      verified:
        requestedType === 'tier_2'
          ? identityVerified && livenessVerified
          : false,
      id_verification_status:
        requestedType === 'tier_2'
          ? savedIdStatus
          : undefined,
      liveness_status: savedLivenessStatus,
      tier_3_status:
        requestedType === 'tier_3'
          ? savedTier3Status
          : undefined,
      liveness_score: livenessScore,
      selfie_match_score: selfieMatchScore,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    console.error('Confirm verification failed:', {
      code: error?.code || null,
      message: error?.message || 'Unknown error',
    });

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve verification status.',
    });
  } finally {
    if (client) client.release();
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

  // Dojah verification
  startDojahVerification,
  confirmDojahVerification,
};
