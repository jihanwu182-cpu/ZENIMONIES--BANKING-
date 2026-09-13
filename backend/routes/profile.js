const express = require('express');

const {
  getProfile,
  updateProfile,
} = require('../controllers/profileController');

const {
  uploadProfilePhoto,
  handlePhotoUpload,
} = require('../controllers/profilePhotoController');

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

module.exports = router;
