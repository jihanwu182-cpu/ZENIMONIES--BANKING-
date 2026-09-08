const express = require('express');

const {
  createDeposit,
} = require('../controllers/depositController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();

// Create a deposit request
router.post(
  '/',
  authenticateToken,
  createDeposit
);

module.exports = router;
