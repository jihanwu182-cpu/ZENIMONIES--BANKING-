
const express = require('express');

const router = express.Router();

const savingsController = require(
  '../controllers/savingsController'
);

const {
  authenticateToken,
} = require('../utils/authMiddleware');

// Get the authenticated user's savings plans
router.get(
  '/',
  authenticateToken,
  savingsController.getSavings
);

// Create a savings plan
router.post(
  '/',
  authenticateToken,
  savingsController.createSavings
);

module.exports = router;
