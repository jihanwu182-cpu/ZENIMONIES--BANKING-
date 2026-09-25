
const express = require('express');

const router = express.Router();

const authMiddleware =
  require('../middleware/authMiddleware');

const {
  registerTerminal,
  getBusinessTerminals,
  getTerminalStatus,
  activateTerminal,
  disableTerminal,
} = require('../controllers/posTerminalController');

// ============================================================
// ZENIMONIES POS ROUTES
// ============================================================

// Business owner registers a terminal.
router.post(
  '/terminals/register',
  authMiddleware,
  registerTerminal
);

// Business owner lists their own terminals.
router.get(
  '/terminals',
  authMiddleware,
  getBusinessTerminals
);

// Terminal authenticates using its own credentials.
// This endpoint does not use customer JWT authentication.
router.get(
  '/terminals/:terminalId/status',
  getTerminalStatus
);

// Administrator activates a registered terminal.
router.post(
  '/admin/terminals/:id/activate',
  authMiddleware,
  activateTerminal
);

// Administrator disables a terminal.
router.post(
  '/admin/terminals/:id/disable',
  authMiddleware,
  disableTerminal
);

module.exports = router;
