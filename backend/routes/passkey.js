const express = require('express');

const {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getPasskeys,
} = require('../controllers/passkeyController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// PASSKEY REGISTRATION
// ============================================================

// Create WebAuthn registration challenge/options
router.post(
  '/register/options',
  authMiddleware,
  getRegistrationOptions
);

// Verify and save the new passkey
router.post(
  '/register/verify',
  authMiddleware,
  verifyRegistration
);

// ============================================================
// PASSKEY AUTHENTICATION
// ============================================================

// Create WebAuthn authentication challenge/options
router.post(
  '/authenticate/options',
  authMiddleware,
  getAuthenticationOptions
);

// Verify the passkey authentication response
router.post(
  '/authenticate/verify',
  authMiddleware,
  verifyAuthentication
);

// ============================================================
// PASSKEY MANAGEMENT
// ============================================================

// Get the user's registered passkeys
router.get(
  '/',
  authMiddleware,
  getPasskeys
);

module.exports = router;
