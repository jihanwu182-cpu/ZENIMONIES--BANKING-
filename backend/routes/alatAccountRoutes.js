
const express = require('express');

const {
  getAlatAccountDetails,
} = require('../controllers/alatAccountController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();

// ============================================================
// ZENIMONIES — ALAT ACCOUNT ROUTES
// ============================================================

// Retrieve the authenticated customer's ALAT bank account.
router.get(
  '/account',
  authenticateToken,
  getAlatAccountDetails
);

module.exports = router;
