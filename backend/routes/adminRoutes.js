const express = require('express');

const router = express.Router();

// ============================================================
// ZENIMONIES BANKING
// ADMIN ROUTES
// ============================================================

const adminMiddleware = require('../middleware/adminMiddleware');

const {
  getDashboard,
  getUsers,
  getUser,
  updateUserStatus,

  // KYC
  getKycRecords,
  verifyBvn,
  rejectBvn,
  verifyTier2,
  rejectTier2,
  verifyTier3,
  rejectTier3,

  // Transactions
  getTransactions,
  getTransaction,
  reportTransactionFraud,

  // Audit
  getAuditLogs,
} = require('../controllers/adminController');


// ============================================================
// CUSTOMER CARE ADMIN CONTROLLERS
// ============================================================

const {
  listCustomerCareAgents,
  assignCustomerCareRole,
  removeCustomerCareRole,
} = require('../controllers/customerCareAdminController');


// ============================================================
// ADMIN SUPPORT CONTROLLERS
// ============================================================

const {
  getSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
} = require('../controllers/adminSupportController');


// ============================================================
// ADMIN SUPPORT ESCALATION CONTROLLERS
// ============================================================

const {
  getEscalatedSupportTickets,
  getEscalatedSupportTicket,
  takeEscalatedSupportTicket,
} = require('../controllers/adminSupportEscalationController');


// ============================================================
// ADMIN AUTHENTICATION
//
// Everything in this router requires:
// Authorization: Bearer <admin JWT>
//
// adminMiddleware also validates the server session and
// confirms the authenticated user has role = admin.
// ============================================================

router.use(adminMiddleware);


// ============================================================
// ADMIN DASHBOARD
// ============================================================

// GET /api/admin/dashboard
router.get(
  '/dashboard',
  getDashboard
);


// ============================================================
// CUSTOMERS
// ============================================================

// GET /api/admin/users
router.get(
  '/users',
  getUsers
);


// GET /api/admin/users/:id
router.get(
  '/users/:id',
  getUser
);


// PATCH /api/admin/users/:id/status
router.patch(
  '/users/:id/status',
  updateUserStatus
);


// ============================================================
// KYC & VERIFICATION
// ============================================================

// GET /api/admin/kyc
router.get(
  '/kyc',
  getKycRecords
);


// ------------------------------------------------------------
// BVN
// ------------------------------------------------------------

// POST /api/admin/kyc/:id/bvn/verify
router.post(
  '/kyc/:id/bvn/verify',
  verifyBvn
);


// POST /api/admin/kyc/:id/bvn/reject
router.post(
  '/kyc/:id/bvn/reject',
  rejectBvn
);


// ------------------------------------------------------------
// TIER 2
// ------------------------------------------------------------

// POST /api/admin/kyc/:id/tier2/verify
router.post(
  '/kyc/:id/tier2/verify',
  verifyTier2
);


// POST /api/admin/kyc/:id/tier2/reject
router.post(
  '/kyc/:id/tier2/reject',
  rejectTier2
);


// ------------------------------------------------------------
// TIER 3
// ------------------------------------------------------------

// POST /api/admin/kyc/:id/tier3/verify
router.post(
  '/kyc/:id/tier3/verify',
  verifyTier3
);


// POST /api/admin/kyc/:id/tier3/reject
router.post(
  '/kyc/:id/tier3/reject',
  rejectTier3
);


// ============================================================
// TRANSACTIONS
// ============================================================

// GET /api/admin/transactions
//
// Supports:
// ?status=pending
// ?status=processing
// ?status=completed
// ?status=failed
// ?type=transfer
// ?search=reference/customer/account
//
router.get(
  '/transactions',
  getTransactions
);


// GET /api/admin/transactions/:id
//
// Full authorized transaction investigation view.
router.get(
  '/transactions/:id',
  getTransaction
);


// POST /api/admin/transactions/:id/report-fraud
//
// Creates a fraud investigation case.
// This does NOT automatically declare the customer fraudulent
// and does NOT automatically reverse the transaction.
router.post(
  '/transactions/:id/report-fraud',
  reportTransactionFraud
);


// ============================================================
// CUSTOMER CARE AGENTS
// ============================================================

// GET /api/admin/customer-care/agents
router.get(
  '/customer-care/agents',
  listCustomerCareAgents
);


// POST /api/admin/customer-care/agents/:id/assign
router.post(
  '/customer-care/agents/:id/assign',
  assignCustomerCareRole
);


// POST /api/admin/customer-care/agents/:id/remove
router.post(
  '/customer-care/agents/:id/remove',
  removeCustomerCareRole
);


// ============================================================
// CUSTOMER CARE SUPPORT CASES
// ============================================================

// GET /api/admin/support
router.get(
  '/support',
  getSupportTickets
);


// GET /api/admin/support/:id
router.get(
  '/support/:id',
  getSupportTicket
);


// POST /api/admin/support/:id/reply
router.post(
  '/support/:id/reply',
  replyToSupportTicket
);


// PATCH /api/admin/support/:id/status
router.patch(
  '/support/:id/status',
  updateSupportTicketStatus
);


// PATCH /api/admin/support/:id/priority
router.patch(
  '/support/:id/priority',
  updateSupportTicketPriority
);


// ============================================================
// ESCALATED CUSTOMER CARE CASES
// ============================================================

// GET /api/admin/support/escalated
router.get(
  '/support/escalated',
  getEscalatedSupportTickets
);


// GET /api/admin/support/escalated/:id
router.get(
  '/support/escalated/:id',
  getEscalatedSupportTicket
);


// POST /api/admin/support/escalated/:id/take
router.post(
  '/support/escalated/:id/take',
  takeEscalatedSupportTicket
);


// ============================================================
// AUDIT LOGS
// ============================================================

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  getAuditLogs
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
