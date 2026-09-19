const express = require('express');

const {
  buyAirtime,
} = require('../controllers/airtimeController');

const {
  requeryPendingAirtime,
  getPendingAirtimeForReconciliation,
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

// TEMPORARY - REMOVE AFTER RECONCILIATION
router.get(
  '/reconciliation/pending',
  authenticateToken,
  getPendingAirtimeForReconciliation
);

module.exports = router;
