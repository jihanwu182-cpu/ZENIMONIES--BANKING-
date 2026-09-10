const express = require('express');

const {
  createDeposit,
} = require('../controllers/depositController');

const {
  getDepositAccount,
} = require('../controllers/depositAccountController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();


// ============================================================
// DEPOSIT ROUTE TEST
// GET /api/deposits
// ============================================================

router.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Deposit route is working',
  });
});


// ============================================================
// GET USER'S DEDICATED DEPOSIT ACCOUNT
// GET /api/deposits/account
// ============================================================

router.get(
  '/account',
  authenticateToken,
  getDepositAccount
);


// ============================================================
// CREATE DEPOSIT REQUEST
// POST /api/deposits
// ============================================================

router.post(
  '/',
  authenticateToken,
  createDeposit
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
