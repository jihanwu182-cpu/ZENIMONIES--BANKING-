const express = require('express');

const {
  getKycStatus,
  submitBvn,
  submitTier2,
  submitTier3,
} = require('../controllers/kycController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * ============================================================
 * KYC ROUTES
 * ============================================================
 *
 * All KYC endpoints require the user to be logged in.
 *
 * Tier 1:
 *   POST /api/kyc/bvn
 *
 * Tier 2:
 *   POST /api/kyc/tier-2
 *
 * Tier 3:
 *   POST /api/kyc/tier-3
 *
 * Status:
 *   GET /api/kyc/status
 * ============================================================
 */


/*
 * GET KYC STATUS
 */
router.get(
  '/status',
  authMiddleware,
  getKycStatus
);


/*
 * TIER 1 — BVN
 */
router.post(
  '/bvn',
  authMiddleware,
  submitBvn
);


/*
 * TIER 2 — ID DOCUMENT + KYC
 */
router.post(
  '/tier-2',
  authMiddleware,
  submitTier2
);


/*
 * TIER 3 — USER CHOOSES:
 *
 * bank_statement
 * utility_bill
 * proof_of_address
 */
router.post(
  '/tier-3',
  authMiddleware,
  submitTier3
);


module.exports = router;
