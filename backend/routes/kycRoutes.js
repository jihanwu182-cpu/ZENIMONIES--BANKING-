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

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
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
// TIER 2 — GOVERNMENT ID + SELFIE
// ============================================================
//
// Frontend field names:
//
// document_front
// document_back
// selfie
//
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
// Frontend field name:
//
// tier_3_document
//
// ============================================================

router.post(
  '/tier-3',
  authMiddleware,
  upload.single('tier_3_document'),
  submitTier3
);

// ============================================================
// MULTER ERROR HANDLER
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

module.exports = router;
