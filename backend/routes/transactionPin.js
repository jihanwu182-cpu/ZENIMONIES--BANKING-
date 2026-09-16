const express = require('express');

const {
  getStatus,
  setup,
  change,
  verify,
} = require('../controllers/transactionPinController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ============================================================
// TRANSACTION PIN ROUTES
// ============================================================
//
// Transaction PIN:
// - Exactly 4 digits
// - Separate from Account Unlock Passcode
// - Used to authorize money movement
//
// ============================================================

// Get current Transaction PIN status
router.get(
  '/status',
  authMiddleware,
  getStatus
);

// Create Transaction PIN
router.post(
  '/setup',
  authMiddleware,
  setup
);

// Change Transaction PIN
router.post(
  '/change',
  authMiddleware,
  change
);

// Verify Transaction PIN
router.post(
  '/verify',
  authMiddleware,
  verify
);

module.exports = router;
