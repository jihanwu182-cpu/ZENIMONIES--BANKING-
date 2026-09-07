const express = require('express');

const {
  getAccount,
  getTransactions,
} = require('../controllers/accountController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  getAccount
);

router.get(
  '/transactions',
  authenticateToken,
  getTransactions
);

module.exports = router;
