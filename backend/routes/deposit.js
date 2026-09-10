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
// DEPOSIT ROUTES
// Base URL:
// /api/deposits
// ============================================================


// ============================================================
// DEPOSIT API TEST
// GET /api/deposits
//
// This is a public route used to confirm that the
// deposit router is loaded correctly.
// ============================================================

router.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Deposit route is working',
  });
});


// ============================================================
// GET DEDICATED DEPOSIT ACCOUNT
// GET /api/deposits/account
//
// Requires:
// Authorization: Bearer YOUR_JWT_TOKEN
//
// Returns the logged-in user's dedicated receiving
// account information.
// ============================================================

router.get(
  '/account',
  authenticateToken,
  getDepositAccount
);


// ============================================================
// CREATE DEPOSIT
// POST /api/deposits
//
// Requires:
// Authorization: Bearer YOUR_JWT_TOKEN
//
// Creates a deposit request for the authenticated user.
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
