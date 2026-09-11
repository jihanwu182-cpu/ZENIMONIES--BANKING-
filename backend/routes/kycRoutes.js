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
// Files are received directly from the user's device.
//
// Memory storage is used so uploaded KYC files are not written
// to Render's temporary/local filesystem.
//
// The controller should pass files to secure storage or an
// approved verification provider.
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    // Maximum individual file size: 10 MB
    fileSize: 10 * 1024 * 1024,

    // Maximum files in one request
    files: 5,
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

router.post(
  '/bvn',
  authMiddleware,
  submitBvn
);

// ============================================================
// TIER 2 — ID + SELFIE
// ============================================================
//
// IMPORTANT:
// These names MUST match the FormData names in the frontend.
//
// Frontend sends:
//
// document_front
// document_back
// selfie
//
// The selfie is only an uploaded image. It must NOT automatically
// be treated as successful liveness verification.
//
// Actual identity/liveness verification must be performed by
// the backend/provider before the account becomes verified.
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
// TIER 3 — PROOF OF ADDRESS
// ============================================================
//
// IMPORTANT:
// This matches the frontend:
//
// formData.append('tier_3_document', tier3Document)
//
// ============================================================

router.post(
  '/tier-3',
  authMiddleware,
  upload.single('tier_3_document'),
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
      message: error.message,
    });
  }

  next();
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
