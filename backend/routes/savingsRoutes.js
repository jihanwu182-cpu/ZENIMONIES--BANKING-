
const express = require('express');

const router = express.Router();

const savingsController = require(
  '../controllers/savingsController'
);

// IMPORTANT:
// Replace this import with the exact authentication
// middleware path already used by your other routes.

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  savingsController.getSavings
);

router.post(
  '/',
  authMiddleware,
  savingsController.createSavings
);

module.exports = router;
