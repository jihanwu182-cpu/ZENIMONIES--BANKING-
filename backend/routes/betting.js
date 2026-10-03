const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const transactionPinMiddleware = require('../middleware/transactionPinMiddleware');

const {
  getProviders,
  verifyAccount,
  fundAccount,
} = require('../controllers/bettingController');

// ============================================================
// ZENIMONIES BANKING
// BETTING ROUTES
// ============================================================

// ------------------------------------------------------------
// GET /api/betting/providers
// Get available betting providers from Sogo
// ------------------------------------------------------------
router.get(
  '/providers',
  authMiddleware,
  getProviders
);

// ------------------------------------------------------------
// POST /api/betting/verify
// Verify a customer's betting account before funding
//
// Body:
// {
//   "provider": "bet9ja",
//   "accountId": "123456789"
// }
// ------------------------------------------------------------
router.post(
  '/verify',
  authMiddleware,
  verifyAccount
);

// ------------------------------------------------------------
// POST /api/betting/fund
// Fund a verified betting account
//
// Transaction PIN is required before money is deducted.
//
// Body:
// {
//   "provider": "bet9ja",
//   "accountId": "123456789",
//   "amount": 1000
// }
// ------------------------------------------------------------
router.post(
  '/fund',
  authMiddleware,
  transactionPinMiddleware,
  fundAccount
);

module.exports = router;
