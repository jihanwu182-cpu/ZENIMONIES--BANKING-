const express = require('express');

const {
  getPlans,
  verifyAccount,
  buyTV,
} = require('../controllers/tvController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

const router = express.Router();

// ============================================================
// GET TV PLANS
// GET /api/tv/plans?provider=DSTV
// ============================================================

router.get(
  '/plans',
  authenticateToken,
  getPlans
);

// ============================================================
// VERIFY TV ACCOUNT
// POST /api/tv/verify
// ============================================================

router.post(
  '/verify',
  authenticateToken,
  verifyAccount
);

// ============================================================
// BUY TV SUBSCRIPTION
// POST /api/tv
// ============================================================

router.post(
  '/',
  authenticateToken,
  transactionPinMiddleware,
  buyTV
);

module.exports = router;
