const express = require('express');

const router = express.Router();

const {
  createBillPayment,
} = require('../controllers/billController');

const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// BILL PAYMENT
// ============================================================

// POST /api/bills
router.post(
  '/',
  authMiddleware,
  createBillPayment
);

module.exports = router;
