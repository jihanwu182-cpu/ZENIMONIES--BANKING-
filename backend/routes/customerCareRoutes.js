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
  investigateTransaction,
} = require('../controllers/customerCareController');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE ROUTES
// ============================================================
//
// IMPORTANT:
// Every route in this file is protected by
// customerCareMiddleware.
//
// Only users with:
//     role = customer_care
//
// can access these endpoints.
//
// Customer Care agents do NOT receive Admin Dashboard access.
// ============================================================

router.use(customerCareMiddleware);

// ============================================================
// AVAILABLE CASES
// GET /api/customer-care/tickets
// ============================================================
//
// Shows Customer Care cases that are connected to Customer Care
// and are currently available for an agent to take.
//
// ============================================================

router.get(
  '/tickets',
  getAvailableCases
);

// ============================================================
// MY CASES
// GET /api/customer-care/tickets/mine
// ============================================================
//
// Shows cases currently assigned to the authenticated
// Customer Care agent.
//
// IMPORTANT:
// This route must appear BEFORE /tickets/:ticketId.
// ============================================================

router.get(
  '/tickets/mine',
  getMyCases
);

// ============================================================
// TRANSACTION INVESTIGATION
// GET /api/customer-care/transactions/investigate?reference=...
// ============================================================
//
// READ-ONLY.
//
// Allows a Customer Care agent to investigate a customer's
// bank transfer using the transaction/reference number.
//
// It does NOT:
// - change balances
// - reverse transactions
// - change transaction status
// - resend transfers
// - modify recipients
// - execute financial operations
//
// Account numbers returned by the controller are masked.
// ============================================================

router.get(
  '/transactions/investigate',
  investigateTransaction
);

// ============================================================
// CASE DETAILS
// GET /api/customer-care/tickets/:ticketId
// ============================================================
//
// Returns the case, customer information, conversation,
// assigned agent, events and linked transaction information.
// ============================================================

router.get(
  '/tickets/:ticketId',
  getCaseDetails
);

// ============================================================
// TAKE CASE
// POST /api/customer-care/tickets/:ticketId/take
// ============================================================
//
// Allows an available Customer Care agent to take ownership
// of a case.
// ============================================================

router.post(
  '/tickets/:ticketId/take',
  takeCase
);

// ============================================================
// REPLY TO CUSTOMER
// POST /api/customer-care/tickets/:ticketId/reply
// ============================================================
//
// Sends a message from the authenticated Customer Care agent
// to the customer.
// ============================================================

router.post(
  '/tickets/:ticketId/reply',
  replyToCustomer
);

// ============================================================
// WAITING FOR CUSTOMER
// PATCH /api/customer-care/tickets/:ticketId/waiting
// ============================================================
//
// Places the case into the waiting-for-customer state.
//
// The backend starts the customer response timer.
// If the customer does not respond within the configured
// period, the automated support workflow can remind the
// customer and eventually close the case.
// ============================================================

router.patch(
  '/tickets/:ticketId/waiting',
  waitForCustomer
);

// ============================================================
// RESOLVE CASE
// PATCH /api/customer-care/tickets/:ticketId/resolve
// ============================================================
//
// Marks the case as resolved.
// ============================================================

router.patch(
  '/tickets/:ticketId/resolve',
  resolveCase
);

// ============================================================
// CLOSE CASE
// PATCH /api/customer-care/tickets/:ticketId/close
// ============================================================
//
// Permanently closes the support case.
// ============================================================

router.patch(
  '/tickets/:ticketId/close',
  closeCase
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
