const express = require('express');

const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  sendPhoneOtp,
  verifyPhone,
  resendPhoneOtp,
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Register
router.post(
  '/register',
  register
);

// Login
router.post(
  '/login',
  login
);

// Forgot Password
router.post(
  '/forgot-password',
  forgotPassword
);

// Reset Password
router.post(
  '/reset-password',
  resetPassword
);


// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// Get current user
router.get(
  '/me',
  authMiddleware,
  getMe
);

// Send phone verification OTP
router.post(
  '/send-phone-otp',
  authMiddleware,
  sendPhoneOtp
);

// Verify phone
router.post(
  '/verify-phone',
  authMiddleware,
  verifyPhone
);

// Verify phone OTP
router.post(
  '/verify-phone-otp',
  authMiddleware,
  verifyPhone
);

// Resend phone verification OTP
router.post(
  '/resend-phone-otp',
  authMiddleware,
  resendPhoneOtp
);


module.exports = router;
