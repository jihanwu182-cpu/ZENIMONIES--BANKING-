const express = require('express');

const router = express.Router();

const customerCareMiddleware = require('../middleware/customerCareMiddleware');

const {
  getAvailableCases,
  getMyCases,
  takeCase,
  getCaseDetails,
  replyToCustomer,
  waitForCustomer,
  resolveCase,
  closeCase,
} = require('../controllers/customerCareController');


// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE AGENT ROUTES
// ============================================================
//
// IMPORTANT:
//
// These routes are protected by:
//
// customerCareMiddleware
//
// Therefore:
//
// role = customer_care
//        ↓
// Customer Care workspace
//
// role = admin
//        ↓
// NOT automatically allowed here
//
// role = user
//        ↓
// NOT allowed
//
// Admin routes remain protected separately by:
// adminMiddleware
// ============================================================


// ============================================================
// ALL CUSTOMER CARE ROUTES REQUIRE CUSTOMER CARE ROLE
// ============================================================

router.use(
  customerCareMiddleware
);


// ============================================================
// AVAILABLE CASES
// GET /api/customer-care/tickets
// ============================================================

router.get(
  '/tickets',
  getAvailableCases
);


// ============================================================
// MY ASSIGNED CASES
// GET /api/customer-care/tickets/mine
// ============================================================
//
// IMPORTANT:
// This route MUST come before:
// /tickets/:ticketId
//
// Otherwise "mine" could be interpreted as a ticket ID.
// ============================================================

router.get(
  '/tickets/mine',
  getMyCases
);


// ============================================================
// CASE DETAILS
// GET /api/customer-care/tickets/:ticketId
// ============================================================

router.get(
  '/tickets/:ticketId',
  getCaseDetails
);


// ============================================================
// TAKE / JOIN CASE
// POST /api/customer-care/tickets/:ticketId/take
// ============================================================

router.post(
  '/tickets/:ticketId/take',
  takeCase
);


// ============================================================
// AGENT REPLY
// POST /api/customer-care/tickets/:ticketId/reply
// ============================================================

router.post(
  '/tickets/:ticketId/reply',
  replyToCustomer
);


// ============================================================
// WAITING FOR CUSTOMER
// PATCH /api/customer-care/tickets/:ticketId/waiting
// ============================================================

router.patch(
  '/tickets/:ticketId/waiting',
  waitForCustomer
);


// ============================================================
// RESOLVE CASE
// PATCH /api/customer-care/tickets/:ticketId/resolve
// ============================================================

router.patch(
  '/tickets/:ticketId/resolve',
  resolveCase
);


// ============================================================
// CLOSE CASE
// PATCH /api/customer-care/tickets/:ticketId/close
// ============================================================

router.patch(
  '/tickets/:ticketId/close',
  closeCase
);


module.exports = router;
