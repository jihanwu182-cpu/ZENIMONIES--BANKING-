const express = require('express');

const {
  getBanks,
  resolveBankAccount,
} = require('../controllers/bankController');

const router = express.Router();

/*
 * GET /api/banks
 *
 * Returns the supported Nigerian banks.
 */
router.get('/', getBanks);

/*
 * POST /api/banks/resolve
 *
 * Resolves a Nigerian bank account number.
 */
router.post(
  '/resolve',
  resolveBankAccount
);

module.exports = router;
