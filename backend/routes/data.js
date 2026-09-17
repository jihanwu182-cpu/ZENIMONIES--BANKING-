const express = require('express');

const {
  getPlans,
  buyData,
} = require('../controllers/dataController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

const router = express.Router();


// ============================================================
// GET DATA PLANS
// Example:
// GET /api/data/plans?network=MTN
//
// Authentication required.
// ============================================================

router.get(
  '/plans',
  authenticateToken,
  getPlans
);


// ============================================================
// BUY DATA
// POST /api/data
//
// Authentication required.
// Transaction PIN required.
// ============================================================

router.post(
  '/',
  authenticateToken,
  transactionPinMiddleware,
  buyData
);


module.exports = router;
