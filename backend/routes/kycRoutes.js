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
// We use memory storage here so the backend can pass the
// uploaded files to secure cloud/object storage or a KYC
// verification provider.
//
// DO NOT save sensitive KYC files permanently to Render's
// local filesystem.
//

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    // Maximum individual file size: 10 MB
    fileSize: 10 * 1024 * 1024,

    // Maximum number of uploaded files in one request
    files: 5,
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Unsupported file type. Please upload JPG, PNG, or PDF.'
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
// TIER 2
//
// Actual files:
//
// id_front  -> front of government ID
// id_back   -> back of ID where applicable
//
// selfie is NOT treated as successful liveness by itself.
//
// Real liveness verification must happen through the approved
// liveness/identity verification provider.
// ============================================================

router.post(
  '/tier-2',
  authMiddleware,

  upload.fields([
    {
      upload.fields([
  {
    name: 'id_front',
    maxCount: 1,
  },
  {
    name: 'id_back',
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
// TIER 3
//
// Actual proof-of-address file.
//
// Field:
//
// proof_of_address
//
// Accepted formats are controlled by the controller/provider.
// ============================================================

router.post(
  '/tier-3',
  authMiddleware,

  upload.single('proof_of_address'),

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
