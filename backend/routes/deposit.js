const express = require('express');
const router = express.Router();

const {
  getDepositAccount,
} = require('../controllers/depositAccountController');

const {
  createDeposit,
  getDeposits,
} = require('../controllers/depositController');

const authMiddleware = require('../middleware/authMiddleware');

// Get user's real deposit bank account
router.get(
  '/account',
  authMiddleware,
  getDepositAccount
);

// Create a deposit request
router.post(
  '/',
  authMiddleware,
  createDeposit
);

// Get deposit history
router.get(
  '/',
  authMiddleware,
  getDeposits
);

module.exports = router;
