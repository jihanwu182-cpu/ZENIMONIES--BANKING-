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

// Deposit API test
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Deposit route is working',
  });
});

// Get the logged-in user's dedicated deposit account
router.get(
  '/account',
  authenticateToken,
  getDepositAccount
);

// Create a deposit request
router.post(
  '/',
  authenticateToken,
  createDeposit
);

module.exports = router;
