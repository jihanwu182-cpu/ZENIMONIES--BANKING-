const express = require('express');

const {
  getBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
} = require('../controllers/beneficiaryController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();


/*
 * GET:
 * /api/beneficiaries
 *
 * Get the logged-in user's beneficiaries.
 */

router.get(
  '/',
  authenticateToken,
  getBeneficiaries
);


/*
 * POST:
 * /api/beneficiaries
 *
 * Save a new beneficiary.
 */

router.post(
  '/',
  authenticateToken,
  addBeneficiary
);


/*
 * DELETE:
 * /api/beneficiaries/:id
 *
 * Delete only the logged-in user's
 * beneficiary.
 */

router.delete(
  '/:id',
  authenticateToken,
  deleteBeneficiary
);


module.exports = router;
