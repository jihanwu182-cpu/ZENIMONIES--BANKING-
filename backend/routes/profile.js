const express = require('express');

const {
  getProfile,
  updateProfile,
} = require('../controllers/profileController');

const {
  uploadProfilePhoto,
  handlePhotoUpload,
} = require('../controllers/profilePhotoController');
const {
  sendPhoneChangeOtp,
  verifyPhoneChangeOtp,
} = require('../controllers/contactChangeController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// GET PROFILE
// GET /api/profile
// ============================================================

router.get(
  '/',
  authMiddleware,
  getProfile
);

// ============================================================
// UPDATE PROFILE
// PUT /api/profile
// ============================================================

router.put(
  '/',
  authMiddleware,
  updateProfile
);

// ============================================================
// UPDATE PROFILE PHOTO
// POST /api/profile/photo
// ============================================================

router.post(
  '/photo',
  authMiddleware,
  handlePhotoUpload,
  uploadProfilePhoto
);

router.post(
  '/contact/phone/start',
  authMiddleware,
  sendPhoneChangeOtp
);

router.post(
  '/contact/phone/verify',
  authMiddleware,
  verifyPhoneChangeOtp
);
module.exports = router;
