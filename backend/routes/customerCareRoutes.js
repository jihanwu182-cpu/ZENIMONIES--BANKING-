const express = require('express');

const router = express.Router();

const customerCareMiddleware =
  require('../middleware/customerCareMiddleware');

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

const {
  escalateCaseToAdministration,
} = require('../controllers/customerCareEscalationController');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE ROUTES
// ============================================================
//
// IMPORTANT:
//
// Every route in this file is protected by
// customerCareMiddleware.
//
// Only users with:
//
//     role = customer_care
//
// can access these endpoints.
//
// Customer Care does NOT receive Admin Dashboard access.
//
// Customer Care and Administration are separate roles.
// ============================================================

router.use(customerCareMiddleware);


// ============================================================
// AVAILABLE CASES
// GET /api/customer-care/tickets
// ============================================================
//
// Shows cases connected to Customer Care that are available
// for an agent to take.
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
// Shows cases assigned to the authenticated Customer Care
// agent.
//
// This route must appear BEFORE:
//
//     /tickets/:ticketId
//
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
// Customer Care can investigate a transaction without receiving
// access to:
//
// - customer balance
// - available balance
// - ledger balance
// - balance_before
// - balance_after
// - full account number
// - security secrets
//
// Account numbers are masked.
//
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
// Returns:
//
// - case information
// - customer information
// - masked account information
// - KYC status
// - conversation
// - assigned Customer Care agent
// - Administration escalation information
// - case events
//
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
//
// Once taken, the case belongs to that Customer Care agent.
//
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
// Sends a message from the authenticated Customer Care agent.
//
// Customer Care cannot reply after the case has been escalated
// to Administration.
//
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
//
// Reminder:
//     configured reminder period
//
// Auto-close:
//     configured response timeout
//
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
// Customer Care can resolve normal support cases.
//
// Escalated Administration cases cannot be resolved by
// Customer Care.
//
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
// Customer Care can close normal support cases.
//
// Escalated cases are controlled by Administration.
//
// ============================================================

router.patch(
  '/tickets/:ticketId/close',
  closeCase
);


// ============================================================
// FORWARD TO ADMINISTRATION
// POST /api/customer-care/tickets/:ticketId/escalate
// ============================================================
//
// Transfers administrative responsibility for the case.
//
// Customer Care provides an escalation reason.
//
// After successful escalation:
//
// - escalated_to_admin = true
// - Customer Care loses operational control
// - Administration receives the case
// - customer conversation is retained
// - escalation event is recorded
// - customer receives an automated notification
//
// IMPORTANT:
//
// Forwarding a case does NOT give Customer Care Admin access.
//
// ============================================================

router.post(
  '/tickets/:ticketId/escalate',
  escalateCaseToAdministration
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
