const express = require('express');

const router = express.Router();

const {
  createBillPayment,
  verifyElectricityMeter,
} = require('../controllers/billController');

const {
  purchaseElectricity,
} = require('../controllers/electricityController');

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
// ELECTRICITY PAYMENT
// ============================================================

router.post(
  '/electricity/pay',
  authMiddleware,
  purchaseElectricity
);

// ============================================================
// GENERAL BILL PAYMENT
// ============================================================

router.post(
  '/',
  authMiddleware,
  createBillPayment
);

module.exports = router;
