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

const {
  requeryElectricityPayment,
} = require('../controllers/electricityRequeryController');

const authMiddleware = require('../middleware/authMiddleware');

const transactionPinMiddleware = require('../middleware/transactionPinMiddleware');

// ============================================================
// ELECTRICITY METER VERIFICATION
// ============================================================
// POST /api/bills/electricity/verify
// Authentication required.
// No transaction PIN required for verification.
// ============================================================

router.post(
  '/electricity/verify',
  authMiddleware,
  verifyElectricityMeter
);

// ============================================================
// ELECTRICITY PAYMENT
// ============================================================
// POST /api/bills/electricity/pay
//
// Authentication required.
// Transaction PIN verification required.
// ============================================================

router.post(
  '/electricity/pay',
  authMiddleware,
  transactionPinMiddleware,
  purchaseElectricity
);

// ============================================================
// ELECTRICITY RECONCILIATION
// ============================================================
// GET /api/bills/electricity/reconciliation
// Authentication required.
// ============================================================

router.get(
  '/electricity/reconciliation',
  authMiddleware,
  getElectricityReconciliation
);
// ============================================================
// ELECTRICITY PAYMENT REQUERY
// ============================================================
// POST /api/bills/electricity/requery/:reference
// Authentication required.
// ============================================================

router.post(
  '/electricity/requery/:reference',
  authMiddleware,
  requeryElectricityPayment
);
// ============================================================
// GENERIC BILL PAYMENT
// ============================================================
// POST /api/bills
// Existing route preserved.
// ============================================================

router.post(
  '/',
  authMiddleware,
  createBillPayment
);

module.exports = router;
