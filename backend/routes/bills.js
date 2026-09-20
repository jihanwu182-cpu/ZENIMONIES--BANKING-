const express = require('express');

const router = express.Router();

const {
  createBillPayment,
  verifyElectricityMeter,
} = require('../controllers/billController');

const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// ELECTRICITY METER VERIFICATION
// ============================================================

router.post(
  '/electricity/verify',
  authMiddleware,
  verifyElectricityMeter
);

// ============================================================
// BILL PAYMENT
// ============================================================

router.post(
  '/',
  authMiddleware,
  createBillPayment
);

module.exports = router;
