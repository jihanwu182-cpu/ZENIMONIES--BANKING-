
const express = require('express');
const multer = require('multer');

const {
  getKycStatus,
  submitBvn,
  submitNin,
  submitTier2,
  submitTier3,
  startDojahVerification,
  confirmDojahVerification,
} = require('../controllers/kycController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const DOCUMENT_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'application/pdf',
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,
    fields: 20,
    parts: 25,
  },

  fileFilter: (req, file, cb) => {
    const fieldName = file.fieldname;

    // Tier 2 government ID front and back.
    if (
      fieldName === 'document_front' ||
      fieldName === 'document_back'
    ) {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        const error = new Error('Invalid ID image format.');
        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    // Tier 2 selfie.
    if (fieldName === 'selfie') {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        const error = new Error('Invalid selfie image format.');
        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    // Tier 3 proof of address.
    if (fieldName === 'tier_3_document') {
      if (!DOCUMENT_MIME_TYPES.has(file.mimetype)) {
        const error = new Error('Invalid proof of address format.');
        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    // Tier 3 selfie.
    if (fieldName === 'tier_3_selfie') {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        const error = new Error('Invalid selfie image format.');
        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    const error = new Error('Unsupported file field.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error);
  },
});

// GET KYC STATUS
router.get('/status', authMiddleware, getKycStatus);

// TIER 1 — BVN
router.post('/bvn', authMiddleware, submitBvn);

// TIER 1 — NIN
router.post('/nin', authMiddleware, submitNin);

// TIER 2 — GOVERNMENT ID
router.post(
  '/tier-2',
  authMiddleware,
  upload.fields([
    { name: 'document_front', maxCount: 1 },
    { name: 'document_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  submitTier2
);

// TIER 3 — PROOF OF ADDRESS AND SELFIE
router.post(
  '/tier-3',
  authMiddleware,
  upload.fields([
    { name: 'tier_3_document', maxCount: 1 },
    { name: 'tier_3_selfie', maxCount: 1 },
  ]),
  submitTier3
);

// START VERIFICATION
router.post(
  '/dojah/start',
  authMiddleware,
  startDojahVerification
);

// CONFIRM VERIFICATION
router.post(
  '/dojah/confirm',
  authMiddleware,
  confirmDojahVerification
);

// MULTER ERROR HANDLER
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: 'FILE_TOO_LARGE',
        message: 'Each file must be 10 MB or smaller.',
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        code: 'TOO_MANY_FILES',
        message: 'Too many files were uploaded.',
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        code: 'UNEXPECTED_FILE',
        message: 'An unsupported file field was received.',
      });
    }

    if (
      error.code === 'LIMIT_FIELD_COUNT' ||
      error.code === 'LIMIT_PART_COUNT' ||
      error.code === 'LIMIT_FIELD_KEY' ||
      error.code === 'LIMIT_FIELD_VALUE'
    ) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_UPLOAD_REQUEST',
        message: 'The upload request is invalid.',
      });
    }

    return res.status(400).json({
      success: false,
      code: 'FILE_UPLOAD_ERROR',
      message: 'The uploaded files could not be processed.',
    });
  }

  if (error && error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_FILE_TYPE',
      message: 'Please check the file type and try again.',
    });
  }

  return next(error);
});

module.exports = router;
