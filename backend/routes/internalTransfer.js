
const express = require('express');

const {
  findUserByPhone,
  transferToZenimoniesUser,
  getRecentRecipients,
} = require('../controllers/internalTransferController');

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

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
 * Get recent successful internal transfer recipients.
 *
 * GET:
 * /api/internal-transfers/recent
 */
router.get(
  '/recent',
  authenticateToken,
  getRecentRecipients
);

/*
 * Send money to another Zenimonies user.
 *
 * Transaction PIN middleware remains enabled.
 *
 * POST:
 * /api/internal-transfers
 */
router.post(
  '/',
  authenticateToken,
  transactionPinMiddleware,
  transferToZenimoniesUser
);

module.exports = router;
