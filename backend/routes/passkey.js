const express = require('express');

const {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getLoginAuthenticationOptions,
  verifyLoginAuthentication,
  getPasskeys,
} = require('../controllers/passkeyController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// PASSWORDLESS LOGIN
// These routes MUST NOT use authMiddleware
// ============================================================

// Create login challenge
router.post(
  '/login/options',
  getLoginAuthenticationOptions
);

// Verify passkey and create session
router.post(
  '/login/verify',
  verifyLoginAuthentication
);


// ============================================================
// PASSKEY REGISTRATION
// These routes require the user to already be logged in
// ============================================================

router.post(
  '/register/options',
  authMiddleware,
  getRegistrationOptions
);

router.post(
  '/register/verify',
  authMiddleware,
  verifyRegistration
);


// ============================================================
// AUTHENTICATED PASSKEY TEST
// ============================================================

router.post(
  '/authenticate/options',
  authMiddleware,
  getAuthenticationOptions
);

router.post(
  '/authenticate/verify',
  authMiddleware,
  verifyAuthentication
);


// ============================================================
// LIST REGISTERED PASSKEYS
// ============================================================

router.get(
  '/',
  authMiddleware,
  getPasskeys
);


module.exports = router;
