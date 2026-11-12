
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

const {
  startPhoneVerification,
  verifyPhoneOtp: verifyRegistrationPhoneOtp,
  startEmailVerification,
  verifyEmailOtp: verifyRegistrationEmailOtp,
  getRegistrationStatus,
  completeRegistration,
} = require('../controllers/registrationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// PUBLIC STAGED REGISTRATION ROUTES
// ============================================================

// Step 1: Send phone verification code
router.post(
  '/registration/phone',
  startPhoneVerification
);

// Step 2: Verify phone code
router.post(
  '/registration/phone/verify',
  verifyRegistrationPhoneOtp
);

// Step 3: Send email verification code
router.post(
  '/registration/email',
  startEmailVerification
);

// Step 4: Verify email code
router.post(
  '/registration/email/verify',
  verifyRegistrationEmailOtp
);

// Step 5: Check verified registration status
router.post(
  '/registration/status',
  getRegistrationStatus
);

// ============================================================
// EXISTING PUBLIC AUTH ROUTES
// ============================================================

// Existing registration endpoint.
// Keep temporarily until staged registration is fully connected.
router.post(
  '/register',
  register
);

// Login
router.post(
  '/login',
  login
);

// Forgot password
router.post(
  '/forgot-password',
  forgotPassword
);

// Reset password
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
// Step 6: Create the personal account after both OTPs are verified
router.post(
  '/registration/complete',
  completeRegistration
);
// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
