const express = require('express');

const {
  transferToBank,
  getTransfers,
} = require('../controllers/transferController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();

// Create a bank transfer
router.post(
  '/',
  authenticateToken,
  transferToBank
);

// Get the logged-in user's bank transfers
router.get(
  '/',
  authenticateToken,
  getTransfers
);

module.exports = router;
