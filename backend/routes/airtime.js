const express = require('express');

const {
  buyAirtime,
} = require('../controllers/airtimeController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

const router = express.Router();


// ============================================================
// BUY AIRTIME
// POST /api/airtime
//
// Authentication
//      ↓
// Transaction PIN verification
//      ↓
// Airtime controller
// ============================================================

router.post(
  '/',
  authenticateToken,
  transactionPinMiddleware,
  buyAirtime
);


module.exports = router;
