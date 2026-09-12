const express = require('express');

const {
  register,
  login,
  getMe,
  sendPhoneOtp,
  verifyPhone,
  resendPhoneOtp,
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// AUTHENTICATION ROUTES
// Base URL:
// /api/auth
// ============================================================


// ============================================================
// REGISTER
// POST /api/auth/register
//
// Public route
// ============================================================

router.post(
  '/register',
  register
);


// ============================================================
// LOGIN
// POST /api/auth/login
//
// Public route
// ============================================================

router.post(
  '/login',
  login
);


// ============================================================
// CURRENT USER
// GET /api/auth/me
//
// Protected route
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
// ============================================================

router.get(
  '/me',
  authMiddleware,
  getMe
);


// ============================================================
// SEND PHONE OTP
// POST /api/auth/send-phone-otp
//
// Protected route
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
// ============================================================

router.post(
  '/send-phone-otp',
  authMiddleware,
  sendPhoneOtp
);


// ============================================================
// VERIFY PHONE
// POST /api/auth/verify-phone
//
// Protected route
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
//
// Body:
// {
//   "otp": "123456"
// }
// ============================================================

router.post(
  '/verify-phone',
  authMiddleware,
  verifyPhone
);


// ============================================================
// VERIFY PHONE OTP
// POST /api/auth/verify-phone-otp
//
// Protected route
//
// This is the endpoint currently used by VerifyPhone.tsx.
// ============================================================

router.post(
  '/verify-phone-otp',
  authMiddleware,
  verifyPhone
);


// ============================================================
// RESEND PHONE OTP
// POST /api/auth/resend-phone-otp
//
// Protected route
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
// ============================================================

router.post(
  '/resend-phone-otp',
  authMiddleware,
  resendPhoneOtp
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
