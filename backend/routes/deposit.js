const express = require('express');

const router = express.Router();

const {
  getDepositAccount,
} = require('../controllers/depositAccountController');

const {
  createDeposit,
  getDeposits,
} = require('../controllers/depositController');

const authMiddleware =
  require('../middleware/authMiddleware');

router.get(
  '/account',
  authMiddleware,
  getDepositAccount
);

router.post(
  '/',
  authMiddleware,
  createDeposit
);

router.get(
  '/',
  authMiddleware,
  getDeposits
);

module.exports = router;
