const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  listSupportCategories,
  supportHealth,
} = require('../controllers/supportController');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER SUPPORT ROUTES
// ============================================================

// ============================================================
// HEALTH CHECK
// GET /api/support/health
// ============================================================

router.get(
  '/health',
  supportHealth
);

// ============================================================
// SUPPORT CATEGORIES
// GET /api/support/categories
// ============================================================

router.get(
  '/categories',
  authMiddleware,
  listSupportCategories
);

// ============================================================
// CREATE SUPPORT TICKET
// POST /api/support/tickets
// ============================================================

router.post(
  '/tickets',
  authMiddleware,
  createSupportTicket
);

// ============================================================
// GET CUSTOMER SUPPORT TICKETS
// GET /api/support/tickets
// ============================================================

router.get(
  '/tickets',
  authMiddleware,
  listSupportTickets
);

// ============================================================
// GET SINGLE SUPPORT TICKET
// GET /api/support/tickets/:ticketId
// ============================================================

router.get(
  '/tickets/:ticketId',
  authMiddleware,
  getSupportTicket
);

// ============================================================
// CUSTOMER REPLY
// POST /api/support/tickets/:ticketId/messages
// ============================================================

router.post(
  '/tickets/:ticketId/messages',
  authMiddleware,
  replyToSupportTicket
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
