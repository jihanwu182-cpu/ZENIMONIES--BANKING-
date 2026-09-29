
const express = require('express');

const router = express.Router();

// ============================================================
// ZENIMONIES BANKING
// INTERNET BILLS ROUTES
// ============================================================

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

// Controller will handle Internet provider operations.
const {
  getInternetProviders,
  getInternetPlans,
  verifyInternetAccount,
  purchaseInternet,
} = require('../controllers/internetBillsController');

// ============================================================
// GET INTERNET PROVIDERS
// ============================================================
// GET /api/internet-bills/providers
// ============================================================

router.get(
  '/providers',
  authenticateToken,
  getInternetProviders
);

// ============================================================
// GET INTERNET PLANS
// ============================================================
// GET /api/internet-bills/plans/:provider
// ============================================================

router.get(
  '/plans/:provider',
  authenticateToken,
  getInternetPlans
);

// ============================================================
// VERIFY INTERNET ACCOUNT
// ============================================================
// POST /api/internet-bills/verify
// ============================================================

router.post(
  '/verify',
  authenticateToken,
  verifyInternetAccount
);

// ============================================================
// PURCHASE INTERNET SUBSCRIPTION
// ============================================================
// POST /api/internet-bills/pay
// ============================================================

router.post(
  '/pay',
  authenticateToken,
  transactionPinMiddleware,
  purchaseInternet
);

module.exports = router;
