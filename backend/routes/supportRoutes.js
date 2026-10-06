const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  connectCustomerToCare,
  replyToSupportTicket,
  listSupportCategories,
  supportHealth,
} = require('../controllers/supportController');


// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE ROUTES
// ============================================================


// ============================================================
// HEALTH
// GET /api/support/health
// ============================================================

router.get(
  '/health',
  supportHealth
);


// ============================================================
// CATEGORIES
// GET /api/support/categories
// ============================================================

router.get(
  '/categories',
  authMiddleware,
  listSupportCategories
);


// ============================================================
// CREATE COMPLAINT
// POST /api/support/tickets
// ============================================================

router.post(
  '/tickets',
  authMiddleware,
  createSupportTicket
);


// ============================================================
// CUSTOMER'S CASES
// GET /api/support/tickets
// ============================================================

router.get(
  '/tickets',
  authMiddleware,
  listSupportTickets
);


// ============================================================
// SINGLE CASE
// GET /api/support/tickets/:ticketId
// ============================================================

router.get(
  '/tickets/:ticketId',
  authMiddleware,
  getSupportTicket
);


// ============================================================
// CONNECT TO CUSTOMER CARE
// POST /api/support/tickets/:ticketId/connect
// ============================================================

router.post(
  '/tickets/:ticketId/connect',
  authMiddleware,
  connectCustomerToCare
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


module.exports = router;
