const express = require('express');

const {
  register,
  login,
  getMe,
  sendPhoneOtp,
  verifyPhone,
  resendPhoneOtp,
} = require('../controllers/authController');

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
// Body:
// {
//   "full_name": "John Doe",
//   "email": "john@example.com",
//   "phone": "08012345678",
//   "password": "password123"
// }
// ============================================================

router.post(
  '/register',
  register
);


// ============================================================
// LOGIN
// POST /api/auth/login
//
// Body:
// {
//   "email": "john@example.com",
//   "password": "password123"
// }
// ============================================================

router.post(
  '/login',
  login
);


// ============================================================
// CURRENT USER
// GET /api/auth/me
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
// ============================================================

router.get(
  '/me',
  getMe
);


// ============================================================
// SEND PHONE OTP
// POST /api/auth/send-phone-otp
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
//
// Generates a new phone verification OTP.
// ============================================================

router.post(
  '/send-phone-otp',
  sendPhoneOtp
);


// ============================================================
// VERIFY PHONE
// POST /api/auth/verify-phone
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
  verifyPhone
);


// ============================================================
// VERIFY PHONE OTP
// POST /api/auth/verify-phone-otp
//
// This alias is kept so the frontend can use either:
//
// /api/auth/verify-phone
//
// or:
//
// /api/auth/verify-phone-otp
//
// ============================================================

router.post(
  '/verify-phone-otp',
  verifyPhone
);


// ============================================================
// RESEND PHONE OTP
// POST /api/auth/resend-phone-otp
//
// Header:
// Authorization: Bearer YOUR_JWT_TOKEN
// ============================================================

router.post(
  '/resend-phone-otp',
  resendPhoneOtp
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
