
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
  completeRegistration,
} = require('../controllers/registrationController');

const {
  createRegistrationRateLimit,
} = require('../middleware/registrationRateLimit');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// DATABASE-BACKED REGISTRATION RATE LIMITS
// ============================================================

// Phone OTP sending:
// Maximum 5 requests per 15 minutes per IP and phone number.
const phoneStartLimit = createRegistrationRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 5,
  bucket: 'registration-phone-start',
  identityField: 'phone',
  maxIdentityRequests: 5,
});

// Phone OTP verification:
// Maximum 10 requests per 15 minutes per IP and phone number.
const phoneVerifyLimit = createRegistrationRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 10,
  bucket: 'registration-phone-verify',
  identityField: 'phone',
  maxIdentityRequests: 10,
});

// Email OTP sending:
// Maximum 5 requests per 15 minutes per IP and email address.
const emailStartLimit = createRegistrationRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 5,
  bucket: 'registration-email-start',
  identityField: 'email',
  maxIdentityRequests: 5,
});

// Email OTP verification:
// Maximum 10 requests per 15 minutes per IP and email address.
const emailVerifyLimit = createRegistrationRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 10,
  bucket: 'registration-email-verify',
  identityField: 'email',
  maxIdentityRequests: 10,
});

// Account completion:
// Maximum 5 requests per 15 minutes per IP and phone number.
const registrationCompleteLimit = createRegistrationRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 5,
  bucket: 'registration-complete',
  identityField: 'phone',
  maxIdentityRequests: 5,
});

// ============================================================
// PUBLIC STAGED REGISTRATION ROUTES
// ============================================================

// Step 1: Send phone verification code
router.post(
  '/registration/phone',
  phoneStartLimit,
  startPhoneVerification
);

// Step 2: Verify phone code
router.post(
  '/registration/phone/verify',
  phoneVerifyLimit,
  verifyRegistrationPhoneOtp
);

// Step 3: Send email verification code
router.post(
  '/registration/email',
  emailStartLimit,
  startEmailVerification
);

// Step 4: Verify email code
router.post(
  '/registration/email/verify',
  emailVerifyLimit,
  verifyRegistrationEmailOtp
);

// Step 5: Create personal account after both OTPs are verified
router.post(
  '/registration/complete',
  registrationCompleteLimit,
  completeRegistration
);

// ============================================================
// EXISTING PUBLIC AUTH ROUTES
// ============================================================

// Keep existing registration temporarily until
// staged registration is fully connected and tested.
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

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
