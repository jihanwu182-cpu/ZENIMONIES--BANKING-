const express = require('express');

const router = express.Router();

const authMiddleware =
  require('../middleware/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

const {
  getPlans,
  verifyJamb,
  purchase,
  requery,
} = require('../controllers/educationController');


// ============================================================
// ZENIMONIES BANKING
// EDUCATION PAYMENT ROUTES
// ============================================================


// ============================================================
// GET EDUCATION PLANS
//
// GET /api/education/plans?service=waec
// GET /api/education/plans?service=waec-registration
// GET /api/education/plans?service=jamb
//
// Authentication required.
// No money is moved.
// ============================================================

router.get(
  '/plans',
  authMiddleware,
  getPlans
);


// ============================================================
// VERIFY JAMB PROFILE
//
// POST /api/education/jamb/verify
//
// Body:
// {
//   "profile_id": "0123456789"
// }
//
// Authentication required.
// No money is moved.
// ============================================================

router.post(
  '/jamb/verify',
  authMiddleware,
  verifyJamb
);


// ============================================================
// PURCHASE EDUCATION PRODUCT
//
// POST /api/education
//
// Authentication required.
// Transaction PIN required.
//
// Body example:
//
// {
//   "service": "jamb",
//   "variation_code": "utme-no-mock",
//   "profile_id": "0123456789",
//   "phone": "08012345678",
//   "transaction_pin": "1234"
// }
//
// The transaction PIN middleware removes the PIN before
// the controller receives the request.
// ============================================================

router.post(
  '/',
  authMiddleware,
  transactionPinMiddleware,
  purchase
);


// ============================================================
// REQUERY PENDING EDUCATION TRANSACTION
//
// POST /api/education/requery
//
// Authentication required.
//
// This endpoint checks the provider status of a transaction
// that previously returned pending/unclear.
// ============================================================

router.post(
  '/requery',
  authMiddleware,
  requery
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
