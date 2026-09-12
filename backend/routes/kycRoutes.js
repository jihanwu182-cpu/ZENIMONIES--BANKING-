const express = require('express');
const multer = require('multer');

const {
  getKycStatus,
  submitBvn,
  submitTier2,
  submitTier3,
} = require('../controllers/kycController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// MULTER CONFIGURATION
// ============================================================
//
// Files are kept in memory temporarily.
//
// IMPORTANT:
// These files must NOT be treated as verified merely because
// they were uploaded. The KYC provider must verify them.
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 3,
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Unsupported file type. Please upload JPG, PNG, WEBP, or PDF.'
        )
      );
    }

    cb(null, true);
  },
});

// ============================================================
// GET KYC STATUS
// ============================================================

router.get(
  '/status',
  authMiddleware,
  getKycStatus
);

// ============================================================
// TIER 1 — BVN
// ============================================================
//
// POST /api/kyc/bvn
//
// Body:
// bvn
//
// BVN submission does NOT automatically verify the user.
// ============================================================

router.post(
  '/bvn',
  authMiddleware,
  submitBvn
);

// ============================================================
// TIER 2 — GOVERNMENT ID + SELFIE/LIVENESS
// ============================================================
//
// POST /api/kyc/tier-2
//
// Expected fields:
//
// document_type
// document_number
//
// Files:
//
// document_front
// document_back
// selfie
//
// document_back is optional for passports.
// ============================================================

router.post(
  '/tier-2',
  authMiddleware,
  upload.fields([
    {
      name: 'document_front',
      maxCount: 1,
    },
    {
      name: 'document_back',
      maxCount: 1,
    },
    {
      name: 'selfie',
      maxCount: 1,
    },
  ]),
  submitTier2
);

// ============================================================
// TIER 3 — PROOF OF ADDRESS + LIVENESS
// ============================================================
//
// POST /api/kyc/tier-3
//
// Expected field:
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
// Accepted methods:
//
// bank_statement
// utility_bill
// proof_of_address
//
// ============================================================
//
// IMPORTANT:
//
// Tier 3 requires:
//
// 1. Proof-of-address document
// 2. Liveness/selfie submission
//
// Uploading either file DOES NOT mean verification succeeded.
//
// The actual document and liveness verification must happen
// through the approved KYC verification process/provider.
// ============================================================

router.post(
  '/tier-3',
  authMiddleware,
  upload.fields([
    {
      name: 'tier_3_document',
      maxCount: 1,
    },
    {
      name: 'tier_3_selfie',
      maxCount: 1,
    },
  ]),
  submitTier3
);

// ============================================================
// MULTER / FILE UPLOAD ERROR HANDLER
// ============================================================

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: 'FILE_TOO_LARGE',
        message:
          'File is too large. Maximum allowed size is 10 MB.',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        code: 'TOO_MANY_FILES',
        message:
          'Too many files were uploaded.',
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        code: 'UNEXPECTED_FILE',
        message:
          'An unexpected file field was received.',
      });
    }

    return res.status(400).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      code: 'FILE_UPLOAD_ERROR',
      message:
        error.message ||
        'Unable to process file upload.',
    });
  }

  next(error);
});

module.exports = router;
