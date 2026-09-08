const express = require('express');

const {
  findUserByPhone,
  transferToZenimoniesUser,
} = require('../controllers/internalTransferController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const router = express.Router();

/*
 * Find a Zenimonies user by registered phone number.
 *
 * GET:
 * /api/internal-transfers/user?phone=08012345678
 */
router.get(
  '/user',
  authenticateToken,
  findUserByPhone
);

/*
 * Send money to another Zenimonies user.
 *
 * POST:
 * /api/internal-transfers
 */
router.post(
  '/',
  authenticateToken,
  transferToZenimoniesUser
);

module.exports = router;
