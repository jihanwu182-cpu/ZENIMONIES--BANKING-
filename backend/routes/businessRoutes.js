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

// Register a business.
router.post(
  '/',
  authMiddleware,
  createBusiness
);

// List the logged-in user's businesses.
router.get(
  '/',
  authMiddleware,
  getMyBusinesses
);

// Admin routes must be before /:id.
router.get(
  '/admin/all',
  authMiddleware,
  adminListBusinesses
);

router.post(
  '/admin/:id/review',
  authMiddleware,
  adminReviewBusiness
);

// Get one business by ID.
router.get(
  '/:id',
  authMiddleware,
  getBusinessById
);

module.exports = router;
