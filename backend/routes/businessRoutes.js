const express = require('express');

const router = express.Router();

const authMiddleware =
  require('../middleware/authMiddleware');

const {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  adminListBusinesses,
  adminReviewBusiness,
} = require('../controllers/businessController');

// ============================================================
// ZENIMONIES BUSINESS ACCOUNT ROUTES
// ============================================================

// Register a new business and create its separate account.
router.post(
  '/',
  authMiddleware,
  createBusiness
);

// List businesses belonging to the logged-in user.
router.get(
  '/',
  authMiddleware,
  getMyBusinesses
);

// View a specific business (owner or admin).
router.get(
  '/:id',
  authMiddleware,
  getBusinessById
);

// Admin: list all business applications.
router.get(
  '/admin/all',
  authMiddleware,
  adminListBusinesses
);

// Admin: approve or reject a business application.
router.post(
  '/admin/:id/review',
  authMiddleware,
  adminReviewBusiness
);

module.exports = router;
