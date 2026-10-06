const express = require('express');

const router = express.Router();

const authMiddleware = require(
  '../middleware/authMiddleware'
);

const {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  supportHealth,
} = require(
  '../controllers/supportController'
);

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER SUPPORT ROUTES
// ============================================================
//
// Customer support uses the existing ZENIMONIES authentication
// and server-side session system.
//
// IMPORTANT:
// Customer requests MUST pass through authMiddleware.
//
// This prevents one customer from accessing another customer's
// support tickets.
// ============================================================


// ============================================================
// SUPPORT HEALTH CHECK
// GET /api/support/health
// ============================================================
//
// Public health endpoint.
// Does not expose customer information.
// ============================================================

router.get(
  '/health',
  supportHealth
);


// ============================================================
// CUSTOMER SUPPORT
// ============================================================
//
// All routes below require:
// 1. Valid JWT
// 2. Valid server-side session
// 3. Active customer account
// 4. Valid 5-minute activity session
// ============================================================


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
// GET CUSTOMER'S SUPPORT TICKETS
// GET /api/support/tickets
// ============================================================

router.get(
  '/tickets',
  authMiddleware,
  listSupportTickets
);


// ============================================================
// GET ONE CUSTOMER'S SUPPORT TICKET
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


module.exports = router;
