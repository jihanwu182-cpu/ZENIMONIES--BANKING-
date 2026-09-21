const express = require('express');

const router = express.Router();

const {
  createBillPayment,
  verifyElectricityMeter,
} = require('../controllers/billController');

const {
  purchaseElectricity,
} = require('../controllers/electricityController');

const {
  getElectricityReconciliation,
} = require('../controllers/electricityReconciliationController');

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
// ELECTRICITY RECONCILIATION
// ============================================================
// READ ONLY
// Does not debit, refund, create, or change payments.
// ============================================================

router.get(
  '/electricity/reconciliation',
  authMiddleware,
  getElectricityReconciliation
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
