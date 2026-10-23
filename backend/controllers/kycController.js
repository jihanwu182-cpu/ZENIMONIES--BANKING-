 const pool = require('../config/database');
const crypto = require('crypto');

const {
  verifyBvn,
  validateBvn,
  getDojahVerification,
} = require('../services/dojahService');
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
  if (result?.success !== true) {
    return {
      status: 'pending',
      reason: 'lookup_unavailable',
    };
  }

  const data = result.data;

  if (!data || typeof data !== 'object') {
    return {
      status: 'pending',
      reason: 'missing_validation_result',
    };
  }

  const entity = data.entity;

  if (!entity || typeof entity !== 'object') {
    return {
      status: 'pending',
      reason: 'missing_validation_result',
    };
  }

  // Only accept explicit boolean match flags.
  // Do not approve based on HTTP success alone.
  const matchFlags = [
    entity.is_bvn_match,
    entity.is_bvn_valid,
    entity.is_match,
  ];

  if (matchFlags.includes(false)) {
    return {
      status: 'rejected',
      reason: 'provider_match_failed',
    };
  }

  if (matchFlags.includes(true)) {
    return {
      status: 'verified',
      reason: 'provider_explicit_match',
    };
  }

  return {
    status: 'pending',
    reason: 'provider_match_fields_unconfirmed',
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
        AND dojah_verification_type = 'identity'
      ORDER BY created_at DESC
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
            record?.bvn_verification_status
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
            record?.tier_3_verification_status
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

    const verified =
      kycStatus === 'verified';

    const tier = Number(user.kyc_tier || 0);

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

        tier: verified ? tier : 0,

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
          record?.bvn_rejection_reason || null,

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
    // DOJAH BVN LOOKUP
    //
    // Dojah is contacted before the submission is committed.
    //
    // IMPORTANT:
    // A successful API response does NOT automatically mean
    // the customer is verified.
    //
    // The Zenimonies BVN state remains PENDING until the
    // authoritative Dojah result is processed.
    // ========================================================

    
    const dojahResult = await validateBvn({
      bvn,
      firstName: String(user.full_name || '')
        .trim()
        .split(/\s+/)[0],
      lastName: String(user.full_name || '')
        .trim()
        .split(/\s+/)
        .slice(1)
        .join(' '),
      dateOfBirth: user.date_of_birth
        ? new Date(user.date_of_birth)
            .toISOString()
            .slice(0, 10)
        : '',
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
        message:
          'We could not validate your BVN at this time. Please try again later.',
      });
    }

    // SAFE DIAGNOSTIC: field names and types only.
// Never log BVN, names, DOB, or identity data.
const validationData = dojahResult.data;

const validationEntity =
  validationData &&
  typeof validationData === 'object'
    ? validationData.entity
    : null;

console.info('Tier 1 BVN result structure:', {
  success: dojahResult.success === true,
  status: dojahResult.status ?? null,
  topLevelKeys:
    validationData && typeof validationData === 'object'
      ? Object.keys(validationData).slice(0, 30)
      : [],
  entityFields:
    validationEntity && typeof validationEntity === 'object'
      ? Object.fromEntries(
          Object.entries(validationEntity).map(
            ([key, value]) => [
              key,
              value === null
                ? 'null'
                : Array.isArray(value)
                  ? 'array'
                  : typeof value,
            ]
          )
        )
      : {},
});
    // ========================================================
    // DOJAH RESPONDED SUCCESSFULLY
    //
    // Save the Zenimonies verification as PENDING.
    //
    // We deliberately do NOT set bvn_verified = true here.
    // ========================================================

    let kycId;

    // ========================================================
    // UPDATE EXISTING RECORD
    //
    // ONLY BVN fields are changed.
    //
    // Tier 2 and Tier 3 remain untouched.
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
    // BVN submission = PENDING.
    //
    // DO NOT CHANGE:
    //
    // id_verified
    // tier_3_verified
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
        'BVN submitted to Dojah for Tier 1 verification. Awaiting Dojah verification result.',
      ]
    );

    await client.query('COMMIT');

    // ========================================================
    // RESPONSE
    // ========================================================

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

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, id_verified
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

    if (userResult.rows[0].id_verified === true) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Your identity is already verified.',
      });
    }

    const existing = await client.query(
      `SELECT id, id_verification_status
       FROM kyc_records
       WHERE user_id = $1
         AND dojah_verification_type = 'identity'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    const record = existing.rows[0];

    if (
      record &&
      normalizeKycStatus(record.id_verification_status) ===
        'verified'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Your identity is already verified.',
      });
    }

    if (
      record &&
      normalizeKycStatus(record.id_verification_status) ===
        'pending'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'An identity verification is already pending.',
      });
    }

    const referenceId = `zen_${crypto.randomUUID()}`;
    let kycRecordId;

    if (record) {
      kycRecordId = record.id;

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
         WHERE id = $2`,
        [referenceId, kycRecordId]
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO kyc_records (
           user_id,
           dojah_reference,
           dojah_verification_type,
           dojah_started_at,
           id_verification_status,
           liveness_status,
           bvn_verification_status,
           tier_3_verification_status,
           verification_status
         )
         VALUES (
           $1, $2, 'identity',
           CURRENT_TIMESTAMP,
           'pending', 'pending',
           'not_verified', 'not_verified',
           'pending'
         )
         RETURNING id`,
        [userId, referenceId]
      );

      kycRecordId = inserted.rows[0].id;
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
        'An identity verification session was initiated.',
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      reference_id: referenceId,
      kyc_record_id: kycRecordId,
      status: 'pending',
      message:
        'Verification session created. Continue with the verification widget.',
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    console.error('Start identity verification failed.');

    return res.status(500).json({
      success: false,
      message: 'Unable to start identity verification.',
    });
  } finally {
    if (client) {
      client.release();
    }
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
    console.log('[KYC DEBUG] Identity confirmation endpoint reached.');
  console.log('[KYC DEBUG] Request method:', req.method);
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

  if (clientReference.length > 150) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification reference.',
    });
  }

  let client;

  try {
    client = await pool.connect();

    // Read the authenticated user's current session.
    const result = await client.query(
      `
      SELECT
        id,
        dojah_reference,
        id_verification_status,
        liveness_status
      FROM kyc_records
      WHERE user_id = $1
        AND dojah_verification_type = 'identity'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    const record = result.rows[0];

    if (!record || !record.dojah_reference) {
      return res.status(404).json({
        success: false,
        message: 'No identity verification session was found.',
      });
    }

    if (
      clientReference &&
      clientReference !== record.dojah_reference
    ) {
      return res.status(409).json({
        success: false,
        message:
          'The verification session does not match your active session.',
      });
    }

    const lookupReference = record.dojah_reference;
     
const providerResult =
  await getDojahVerification(lookupReference);

console.log(
  'Dojah identity result lookup:',
  {
    success: providerResult?.success === true,
    hasData: Boolean(providerResult?.data),
    referencePresent: Boolean(lookupReference),
    providerStatus:
      providerResult?.status || null,
    errorCode:
      providerResult?.code || null,
  }
);

   
    // Find a verification payload inside common response wrappers.
    const candidates = [];
    const queue = [providerResult.data];
    const visited = new Set();

    while (queue.length > 0 && visited.size < 30) {
      const item = queue.shift();

      if (
        !item ||
        typeof item !== 'object' ||
        visited.has(item)
      ) {
        continue;
      }

      visited.add(item);
      candidates.push(item);

      for (const key of ['data', 'result', 'response']) {
        if (
          item[key] &&
          typeof item[key] === 'object'
        ) {
          queue.push(item[key]);
        }
      }
    }

    const verification = candidates.find(
      item =>
        item.government_data ||
        item.selfie ||
        item.verification_status
    ) || providerResult.data;

    const returnedReference = String(
      verification?.reference_id ||
      verification?.data?.reference_id ||
      ''
    ).trim();

    if (
      returnedReference &&
      returnedReference !== lookupReference
    ) {
      return res.status(502).json({
        success: false,
        status: 'pending',
        message:
          'The verification result could not be matched to this session.',
      });
    }

    const sessionStatus = String(
      verification?.verification_status ||
      verification?.data?.verification_status ||
      ''
    ).trim().toLowerCase();

    const governmentData =
      verification?.government_data ||
      verification?.data?.government_data;

    const selfieData =
      verification?.selfie ||
      verification?.data?.selfie;

    const outcome = step => {
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

    let idStatus = 'pending';
    let livenessStatus = 'pending';

    if (
      ['completed', 'complete'].includes(sessionStatus)
    ) {
      idStatus = outcome(governmentData);
      livenessStatus = outcome(selfieData);
    } else if (
      ['failed', 'abandoned', 'rejected'].includes(
        sessionStatus
      )
    ) {
      idStatus = 'rejected';
      livenessStatus = 'rejected';
    }

    const score = value => {
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

    // Re-lock the exact session. A newer session must not be
    // overwritten by a delayed result from an older session.
    await client.query('BEGIN');

    const locked = await client.query(
      `
      SELECT
        id_verification_status,
        liveness_status
      FROM kyc_records
      WHERE id = $1
        AND user_id = $2
        AND dojah_reference = $3
        AND dojah_verification_type = 'identity'
      FOR UPDATE
      `,
      [record.id, userId, lookupReference]
    );

    if (!locked.rows.length) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'The verification session changed. Please try again.',
      });
    }

    await client.query(
      `
      UPDATE kyc_records
      SET
        id_verification_status = CASE
          WHEN id_verification_status IN ('verified', 'approved')
            THEN id_verification_status
          WHEN $2 <> 'pending' THEN $2
          ELSE id_verification_status
        END,

        id_verified_at = CASE
          WHEN id_verification_status IN ('verified', 'approved')
            THEN id_verified_at
          WHEN $2 = 'verified'
            THEN COALESCE(id_verified_at, CURRENT_TIMESTAMP)
          ELSE id_verified_at
        END,

        id_rejection_reason = CASE
          WHEN id_verification_status IN ('verified', 'approved')
            THEN id_rejection_reason
          WHEN $2 = 'rejected'
            THEN 'Identity check did not pass provider verification.'
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
      `,
      [
        record.id,
        idStatus,
        livenessStatus,
        livenessScore,
        selfieMatchScore,
      ]
    );

    const savedStatuses = await client.query(
      `
      SELECT
        id_verification_status,
        liveness_status
      FROM kyc_records
      WHERE id = $1
        AND user_id = $2
      `,
      [record.id, userId]
    );

    if (!savedStatuses.rows.length) {
      throw new Error(
        'Verification record could not be confirmed.'
      );
    }

    const savedIdStatus = String(
      savedStatuses.rows[0].id_verification_status || ''
    ).toLowerCase();

    const savedLivenessStatus = String(
      savedStatuses.rows[0].liveness_status || ''
    ).toLowerCase();

    const finalId = ['verified', 'approved'].includes(
      savedIdStatus
    ) ? 'verified' : savedIdStatus;

    const finalLiveness = ['verified', 'approved'].includes(
      savedLivenessStatus
    ) ? 'verified' : savedLivenessStatus;

    if (
      finalId === 'verified' &&
      finalLiveness === 'verified'
    ) {
      await client.query(
        `
        UPDATE users
        SET
          id_verified = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [userId]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      status:
        finalId === 'verified' &&
        finalLiveness === 'verified'
          ? 'verified'
          : finalId === 'rejected' ||
              finalLiveness === 'rejected'
            ? 'rejected'
            : 'pending',
      verified:
        finalId === 'verified' &&
        finalLiveness === 'verified',
      id_verification_status: finalId,
      liveness_status: finalLiveness,
      liveness_score: livenessScore,
      selfie_match_score: selfieMatchScore,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    console.error(
      'Confirm identity verification failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve verification status.',
    });
  } finally {
    if (client) {
      client.release();
    }
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
