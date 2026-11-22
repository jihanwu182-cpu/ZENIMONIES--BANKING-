

const express = require('express');
const {
  getAlatAccountDetails,
} = require('../controllers/alatAccountController');

const {
  createSession,
  getLatestSession,
  getSession,
} = require('../controllers/alatOnboardingController');

const { authenticateToken } = require('../utils/authMiddleware');

const router = express.Router();

// Existing ALAT account endpoint
router.get('/account', authenticateToken, getAlatAccountDetails);

// ALAT onboarding session endpoints
router.post('/onboarding/session', authenticateToken, createSession);
router.get('/onboarding/session', authenticateToken, getLatestSession);
router.get('/onboarding/session/:sessionId', authenticateToken, getSession);

module.exports = router;
