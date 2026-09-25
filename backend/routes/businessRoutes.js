
const express = require('express');

const router = express.Router();

// ============================================================
// ZENIMONIES BANKING
// BUSINESS ROUTES
// ============================================================

const authMiddleware =
  require('../middleware/authMiddleware');

// ============================================================
// BUSINESS CONTROLLERS
// ============================================================

const {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  adminListBusinesses,
  adminReviewBusiness,
} = require('../controllers/businessController');

// ============================================================
// BUSINESS TRANSACTION CONTROLLER
// ============================================================

const {
  getBusinessTransactions,
} = require('../controllers/businessTransactionController');

// ============================================================
// REGISTER A BUSINESS
// POST /api/businesses
// ============================================================

router.post(
  '/',
  authMiddleware,
  createBusiness
);

// ============================================================
// GET LOGGED-IN USER'S BUSINESSES
// GET /api/businesses
// ============================================================

router.get(
  '/',
  authMiddleware,
  getMyBusinesses
);

// ============================================================
// ADMIN: LIST ALL BUSINESSES
// GET /api/businesses/admin/all
// ============================================================

router.get(
  '/admin/all',
  authMiddleware,
  adminListBusinesses
);

// ============================================================
// ADMIN: REVIEW A BUSINESS
// POST /api/businesses/admin/:id/review
// ============================================================

router.post(
  '/admin/:id/review',
  authMiddleware,
  adminReviewBusiness
);

// ============================================================
// GET BUSINESS TRANSACTION HISTORY
// GET /api/businesses/:id/transactions
// ============================================================

router.get(
  '/:id/transactions',
  authMiddleware,
  getBusinessTransactions
);

// ============================================================
// GET ONE BUSINESS BY ID
// GET /api/businesses/:id
// ============================================================

router.get(
  '/:id',
  authMiddleware,
  getBusinessById
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
