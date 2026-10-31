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

// ============================================================
// ZENIMONIES BANKING — KYC ROUTES
// ============================================================
//
// Security rules:
// 1. Every KYC route requires authentication.
// 2. Uploading a document never automatically approves KYC.
// 3. ID front/back uploads must be images.
// 4. Tier 3 proof-of-address documents may be images or PDFs.
// 5. Provider verification and approval remain backend-controlled.
// 6. Do not expose provider names or internal error details
//    in customer-facing upload responses.
// ============================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

// ============================================================
// MULTER CONFIGURATION
// ============================================================

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

    // Tier 2 government ID images must be images only.
    if (
      fieldName === 'document_front' ||
      fieldName === 'document_back'
    ) {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        const error = new Error(
          'ID front and back files must be JPG, PNG, or WEBP images.'
        );

        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    // Tier 3 proof-of-address documents may be images or PDFs.
    if (fieldName === 'tier_3_document') {
      if (!DOCUMENT_MIME_TYPES.has(file.mimetype)) {
        const error = new Error(
          'Proof-of-address file must be JPG, PNG, WEBP, or PDF.'
        );

        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    // Tier 3 selfie must be an image.
    if (fieldName === 'tier_3_selfie') {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        const error = new Error(
          'The selfie must be a JPG, PNG, or WEBP image.'
        );

        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }

    // Reject any file field that is not explicitly supported.
    const error = new Error('Unsupported file field.');
    error.code = 'INVALID_FILE_TYPE';

    return cb(error);
  },
});

// ============================================================
// GET KYC STATUS
// ============================================================
//
// GET /api/kyc/status
//
// Returns the authenticated customer's KYC status.
// ============================================================

router.get(
  '/status',
  authMiddleware,
  getKycStatus
);

// ============================================================
// TIER 1 — BVN SUBMISSION
// ============================================================
//
// POST /api/kyc/bvn
//
// Expected body:
// {
//   "bvn": "customer BVN"
// }
//
// Submitting a BVN is not, by itself, proof that identity
// verification or liveness verification has succeeded.
// ============================================================

router.post(
  '/bvn',
  authMiddleware,
  submitBvn
);

// ============================================================
// TIER 1 — NIN SUBMISSION
// ============================================================
//
// POST /api/kyc/nin
//
// BVN and NIN are alternative Tier 1 verification methods.
// A customer only needs one successfully verified method.
// ============================================================

router.post(
  '/nin',
  authMiddleware,
  submitNin
);

// ============================================================
// TIER 2 — GOVERNMENT IDENTITY VERIFICATION
// ============================================================
//
// POST /api/kyc/tier-2
//
// Expected text fields:
//   document_type
//   document_number
//
// Optional/conditional files:
//   document_front
//   document_back
//
// Rules:
// - NIN: number only; no ID image uploads required.
// - Other supported IDs: front AND back images required.
// - International passport also requires front AND back
//   images under the product requirements.
// - Liveness and identity approval must be confirmed by the
//   backend verification process.
// - This route does not itself approve KYC.
//
// The controller must enforce the conditional requirements
// according to document_type.
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
  ]),
  submitTier2
);

// ============================================================
// TIER 3 — PROOF OF ADDRESS AND LIVENESS
// ============================================================
//
// POST /api/kyc/tier-3
//
// Expected text field:
//   tier_3_method
//
// Supported file fields:
//   tier_3_document
//   tier_3_selfie
//
// The controller must validate the accepted proof-of-address
// method, store sensitive files privately, and verify the
// required evidence before approving the customer.
//
// Uploading files alone never completes Tier 3 verification.
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
// SECURE IDENTITY VERIFICATION SESSION
// ============================================================
//
// POST /api/kyc/dojah/start
//
// Starts the backend-controlled verification process.
// Provider credentials and verification references must be
// handled securely and must not be exposed in error messages.
// ============================================================

router.post(
  '/dojah/start',
  authMiddleware,
  startDojahVerification
);

// ============================================================
// CONFIRM IDENTITY VERIFICATION
// ============================================================
//
// POST /api/kyc/dojah/confirm
//
// The controller must obtain and validate the authoritative
// verification result on the backend. A client callback or
// uploaded file alone must never be treated as approval.
// ============================================================

router.post(
  '/dojah/confirm',
  authMiddleware,
  confirmDojahVerification
);

// ============================================================
// MULTER AND FILE UPLOAD ERROR HANDLER
// ============================================================

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

    if (error.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({
        success: false,
        code: 'TOO_MANY_FIELDS',
        message: 'Too many form fields were submitted.',
      });
    }

    if (
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
    // Use a generic customer-facing message. The detailed
    // validation rule remains in the server-side configuration.
    return res.status(400).json({
      success: false,
      code: 'INVALID_FILE_TYPE',
      message: 'Please check the file type and try again.',
    });
  }

  // Let the application's central error handler process
  // unrelated errors rather than disguising them as upload errors.
  return next(error);
});

module.exports = router;
