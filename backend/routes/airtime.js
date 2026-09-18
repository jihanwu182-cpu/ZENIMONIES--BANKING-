const express = require('express');

const {
  buyAirtime,
} = require('../controllers/airtimeController');

const {
  requeryPendingAirtime,
} = require('../controllers/airtimeRequeryController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

const router = express.Router();


// ============================================================
// BUY AIRTIME
// ============================================================

router.post(
  '/',
  authenticateToken,
  transactionPinMiddleware,
  buyAirtime
);


// ============================================================
// REQUERY PENDING AIRTIME
// ============================================================

router.post(
  '/requery/:reference',
  authenticateToken,
  requeryPendingAirtime
);


module.exports = router;
