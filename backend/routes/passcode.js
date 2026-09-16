const express = require('express');

const {
  getStatus,
  setup,
  verify,
  unlock,
  change,
} = require('../controllers/passcodeController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * ============================================================
 * ACCOUNT UNLOCK PASSCODE
 * ============================================================
 *
 * The Account Unlock Passcode is separate from:
 *
 * - Transaction PIN
 * - Card PIN
 * - Password
 *
 * IMPORTANT:
 *
 * /unlock intentionally does NOT use the normal authMiddleware.
 *
 * Why?
 *
 * The user reaches the Account Locked screen AFTER the
 * 5-minute server session has expired.
 *
 * The unlock endpoint validates the still-valid JWT identity,
 * verifies the 6-digit Account Unlock Passcode, and creates
 * a completely new server-side authentication session.
 *
 * ============================================================
 */


/*
 * ============================================================
 * PASSCODE STATUS
 * ============================================================
 *
 * GET /api/passcode/status
 *
 * Used by Settings.
 *
 * Requires an active session.
 * ============================================================
 */

router.get(
  '/status',
  authMiddleware,
  getStatus
);


/*
 * ============================================================
 * CREATE ACCOUNT UNLOCK PASSCODE
 * ============================================================
 *
 * POST /api/passcode/setup
 *
 * Requires an active session.
 * ============================================================
 */

router.post(
  '/setup',
  authMiddleware,
  setup
);


/*
 * ============================================================
 * ACCOUNT UNLOCK
 * ============================================================
 *
 * POST /api/passcode/unlock
 *
 * This is specifically for the Account Locked screen.
 *
 * It must NOT use authMiddleware because the inactivity
 * session has already expired.
 * ============================================================
 */

router.post(
  '/unlock',
  unlock
);


/*
 * ============================================================
 * NORMAL PASSCODE VERIFICATION
 * ============================================================
 *
 * POST /api/passcode/verify
 *
 * This remains protected by the normal authentication
 * middleware and can continue to be used by authenticated
 * application flows where appropriate.
 * ============================================================
 */

router.post(
  '/verify',
  authMiddleware,
  verify
);


/*
 * ============================================================
 * CHANGE ACCOUNT UNLOCK PASSCODE
 * ============================================================
 *
 * POST /api/passcode/change
 *
 * Requires an active session.
 * ============================================================
 */

router.post(
  '/change',
  authMiddleware,
  change
);


module.exports = router;
