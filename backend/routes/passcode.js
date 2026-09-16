const express = require('express');

const {
  getStatus,
  setup,
  verify,
  change,
} = require('../controllers/passcodeController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// ACCOUNT UNLOCK PASSCODE
// ============================================================
//
// This route group is ONLY for the 6-digit Account Unlock
// Passcode.
//
// It is NOT the 4-digit Transaction PIN.
// ============================================================


// GET /api/passcode/status
// Check whether the user has an Account Unlock Passcode.
router.get(
  '/status',
  authMiddleware,
  getStatus
);


// POST /api/passcode/setup
// Create the user's 6-digit Account Unlock Passcode.
router.post(
  '/setup',
  authMiddleware,
  setup
);


// POST /api/passcode/verify
// Verify the user's 6-digit Account Unlock Passcode.
router.post(
  '/verify',
  authMiddleware,
  verify
);


// POST /api/passcode/change
// Change the existing 6-digit Account Unlock Passcode.
router.post(
  '/change',
  authMiddleware,
  change
);


module.exports = router;
