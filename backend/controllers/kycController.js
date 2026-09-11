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
// ============================================================
//
// IMPORTANT:
//
// pending       = NOT verified
// rejected      = NOT verified
// not_verified  = NOT verified
// under_review  = NOT verified
//
// Only approved / verified / completed are treated as verified.
//

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
// FILE VALIDATION HELPERS
// ============================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
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

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.mimetype
    )
  ) {
    return {
      valid: false,
      message:
        'ID document must be a JPG, JPEG, or PNG image.',
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
// VALIDATE PROOF OF ADDRESS FILE
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
        'Proof of address must be a PDF, JPG, JPEG, or PNG document.',
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

        tier:
          verified
            ? tier
            : 0,

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
// POST /api/kyc/bvn
//
// IMPORTANT:
//
// This endpoint ONLY submits the BVN.
//
// It DOES NOT verify the BVN.
//
// The actual BVN provider must confirm:
//
// - BVN exists
// - BVN belongs to the user
// - name matches
// - date of birth matches
//
// Until provider confirmation:
//
// bvn_verified = false
// kyc_status = pending
//
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

  const client =
    await pool.connect();

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

    const user =
      userResult.rows[0];

    if (
      normalizeKycStatus(
        user.kyc_status
      ) === 'verified' &&
      user.bvn_verified === true
    ) {
      await client.query(
        'ROLLBACK'
      );

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

    if (
      existingKyc.rows.length > 0
    ) {
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

    await client.query(
      'COMMIT'
    );

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
// POST /api/kyc/tier-2
//
// multipart/form-data
//
// Fields:
//
// document_type
// document_number
//
// Files:
//
// id_front
// id_back (optional)
//
// IMPORTANT:
//
// There are NO document URLs.
//
// The frontend uploads the actual files.
//
// ============================================================

const submitTier2 = async (req, res) => {
  const userId = req.user.id;

  const documentType =
    String(
      req.body?.document_type || ''
    ).trim();

  const documentNumber =
    String(
      req.body?.document_number || ''
    ).trim();

  const allowedDocumentTypes = [
    'national_id',
    'nin',
    'drivers_license',
    'international_passport',
    'voters_card',
  ];

  // ----------------------------------------------------------
  // DOCUMENT TYPE
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // DOCUMENT NUMBER
  // ----------------------------------------------------------

  if (!documentNumber) {
    return res.status(400).json({
      success: false,
      code: 'DOCUMENT_NUMBER_REQUIRED',
      message:
        'Document number is required',
    });
  }

  // ----------------------------------------------------------
  // FILES
  // ----------------------------------------------------------

  const idFrontFile =
    req.files?.id_front?.[0] ||
    null;

  const idBackFile =
    req.files?.id_back?.[0] ||
    null;

  const frontValidation =
    validateIdFile(
      idFrontFile
    );

  if (!frontValidation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ID_FRONT',
      message:
        frontValidation.message,
    });
  }

  // ----------------------------------------------------------
  // BACK OF ID
  //
  // Passport generally does not require a back.
  // Other IDs may require one.
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
      validateIdFile(
        idBackFile
      );

    if (!backValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID_BACK',
        message:
          backValidation.message,
      });
    }
  }

  // ----------------------------------------------------------
  // REAL LIVENESS
  // ----------------------------------------------------------
  //
  // We intentionally DO NOT accept:
  //
  // req.body.liveness_status
  // req.body.selfie_url
  // req.body.selfie
  //
  // A user cannot tell the backend that they passed liveness.
  //
  // A real liveness provider must return the result.
  //
  // Until provider integration is connected:
  //
  // liveness_status = pending
  //
  // ==========================================================

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
          kyc_tier,
          id_verified
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

    const user =
      userResult.rows[0];

    // --------------------------------------------------------
    // PREVENT RESUBMISSION AFTER SUCCESSFUL VERIFICATION
    // --------------------------------------------------------

    if (
      user.id_verified === true
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Your identity verification has already been completed.',
      });
    }

    // --------------------------------------------------------
    // FIND EXISTING KYC RECORD
    // --------------------------------------------------------

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

    /*
     * IMPORTANT SECURITY NOTE:
     *
     * We do not put the actual image bytes into PostgreSQL.
     *
     * The files are currently held in multer memory.
     *
     * Before production verification is enabled, these files
     * should be securely sent to an approved KYC provider or
     * encrypted object storage.
     *
     * Only the resulting secure provider/storage reference
     * should be stored in document_front_url/document_back_url.
     *
     * The frontend never supplies those URLs.
     */

    if (
      existingKyc.rows.length > 0
    ) {
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
    // Submission does NOT verify identity.
    //
    // We explicitly set:
    //
    // id_verified = false
    // liveness_status = pending
    // kyc_status = pending
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
        `Tier 2 government ID submitted using ${documentType}. Actual ID files received. Awaiting identity and liveness verification.`,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return res.status(200).json({
      success: true,

      message:
        'Your ID documents have been received. Facial liveness and identity verification must be completed before your account can be verified.',

      kyc_record_id:
        kycId,

      tier: 2,

      status: 'pending',

      verified: false,

      liveness_status:
        'pending',

      id_verification_status:
        'pending',
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
// POST /api/kyc/tier-3
//
// multipart/form-data
//
// Fields:
//
// tier_3_method
//
// File:
//
// proof_of_address
//
// NO URL IS ACCEPTED FROM THE FRONTEND.
//
// ============================================================

const submitTier3 = async (req, res) => {
  const userId = req.user.id;

  const method =
    String(
      req.body?.tier_3_method || ''
    ).trim();

  const allowedMethods = [
    'bank_statement',
    'utility_bill',
    'proof_of_address',
  ];

  // ----------------------------------------------------------
  // METHOD
  // ----------------------------------------------------------

  if (
    !allowedMethods.includes(
      method
    )
  ) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TIER_3_METHOD',
      message:
        'Choose bank statement, utility bill, or proof of address',
    });
  }

  // ----------------------------------------------------------
  // ACTUAL FILE
  // ----------------------------------------------------------

  const proofOfAddressFile =
    req.file || null;

  const validation =
    validateProofOfAddressFile(
      proofOfAddressFile
    );

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PROOF_OF_ADDRESS',
      message:
        validation.message,
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
          kyc_tier,
          tier_3_verified
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

    const user =
      userResult.rows[0];

    // --------------------------------------------------------
    // PREVENT RESUBMISSION AFTER SUCCESSFUL VERIFICATION
    // --------------------------------------------------------

    if (
      user.tier_3_verified === true
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Your Tier 3 verification has already been completed.',
      });
    }

    // --------------------------------------------------------
    // FIND EXISTING KYC RECORD
    // --------------------------------------------------------

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

    /*
     * IMPORTANT:
     *
     * We do NOT accept tier_3_document_url from the client.
     *
     * The actual file is in:
     *
     * req.file
     *
     * The file should be securely uploaded to approved storage
     * or a KYC provider.
     *
     * The resulting secure reference can then be stored in
     * tier_3_document_url.
     */

    if (
      existingKyc.rows.length > 0
    ) {
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
            tier_3_verification_status,
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
            method,
          ]
        );

      kycId =
        insertResult.rows[0].id;
    }

    // --------------------------------------------------------
    // SUBMISSION ≠ VERIFICATION
    // --------------------------------------------------------

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
        `Tier 3 proof-of-address document received using ${method}. Awaiting review.`,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return res.status(200).json({
      success: true,

      message:
        'Your proof-of-address document has been received and is awaiting review.',

      kyc_record_id:
        kycId,

      tier: 3,

      status: 'pending',

      verified: false,

      method,

      verification_status:
        'pending',
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
