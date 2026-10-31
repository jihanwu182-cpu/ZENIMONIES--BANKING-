const express = require('express');

const router = express.Router();

// ============================================================
// ZENIMONIES BANKING — ADMIN ROUTES
// All routes require an authenticated, active administrator.
// ============================================================

const adminMiddleware = require('../middleware/adminMiddleware');

const {
  getDashboard,
  getUsers,
  getUser,
  updateUserStatus,

  // KYC
  getKycRecords,
  getPrivateTier3Document,
  verifyBvn,
  rejectBvn,
  verifyNin,
  rejectNin,
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

// Customer Care administration
const {
  listCustomerCareAgents,
  assignCustomerCareRole,
  removeCustomerCareRole,
} = require('../controllers/customerCareAdminController');

// Customer Care support
const {
  getSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
} = require('../controllers/adminSupportController');

// Escalated support
const {
  getEscalatedSupportTickets,
  getEscalatedSupportTicket,
  takeEscalatedSupportTicket,
} = require('../controllers/adminSupportEscalationController');

// Revenue accounting and approvals
const {
  getRevenueSummary,
  getRevenueEntries,
  getPendingRevenueApprovals,
  prepareRevenueApproval,
  decideRevenueApproval,
  postRevenueEntry,
  reverseRevenueEntry,
  reconcileHistoricalTransferRevenue,
  checkRevenueLedgerSchema,
} = require('../controllers/adminRevenueController');

// ============================================================
// ADMIN AUTHENTICATION
// Protect every route below this line.
// ============================================================

router.use(adminMiddleware);

// ============================================================
// ADMIN DASHBOARD
// ============================================================

router.get('/dashboard', getDashboard);

// ============================================================
// CUSTOMERS
// ============================================================

router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id/status', updateUserStatus);

// ============================================================
// KYC & VERIFICATION
// ============================================================

router.get('/kyc', getKycRecords);

router.get(
  '/kyc/:id/private-document/:document',
  getPrivateTier3Document
);
// BVN
router.post('/kyc/:id/bvn/verify', verifyBvn);
router.post('/kyc/:id/bvn/reject', rejectBvn);

// NIN
router.post('/kyc/:id/nin/verify', verifyNin);
router.post('/kyc/:id/nin/reject', rejectNin);

// Tier 2
router.post('/kyc/:id/tier2/verify', verifyTier2);
router.post('/kyc/:id/tier2/reject', rejectTier2);

// Tier 3
router.post('/kyc/:id/tier3/verify', verifyTier3);
router.post('/kyc/:id/tier3/reject', rejectTier3);

// ============================================================
// TRANSACTIONS
// ============================================================

router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransaction);

router.post(
  '/transactions/:id/report-fraud',
  reportTransactionFraud
);
router.post(
  '/revenue/reconcile-transfers',
  reconcileHistoricalTransferRevenue
);
  
router.get('/revenue/schema-check', checkRevenueLedgerSchema
);

// ============================================================
// CUSTOMER CARE AGENTS
// ============================================================

router.get(
  '/customer-care/agents',
  listCustomerCareAgents
);

router.post(
  '/customer-care/agents/:id/assign',
  assignCustomerCareRole
);

router.post(
  '/customer-care/agents/:id/remove',
  removeCustomerCareRole
);

// ============================================================
// CUSTOMER CARE SUPPORT
// ============================================================

router.get('/support', getSupportTickets);
router.get('/support/:id', getSupportTicket);

router.post('/support/:id/reply', replyToSupportTicket);

router.patch(
  '/support/:id/status',
  updateSupportTicketStatus
);

router.patch(
  '/support/:id/priority',
  updateSupportTicketPriority
);

// ============================================================
// ESCALATED CUSTOMER CARE CASES
// ============================================================

router.get(
  '/support/escalated',
  getEscalatedSupportTickets
);

router.get(
  '/support/escalated/:id',
  getEscalatedSupportTicket
);

router.post(
  '/support/escalated/:id/take',
  takeEscalatedSupportTicket
);

// ============================================================
// AUDIT LOGS
// ============================================================

router.get('/audit-logs', getAuditLogs);

// ============================================================
// REVENUE REPORTING
// ============================================================

// GET /api/admin/revenue/summary
router.get('/revenue/summary', getRevenueSummary);

// GET /api/admin/revenue/entries
router.get('/revenue/entries', getRevenueEntries);

// ============================================================
// REVENUE APPROVAL WORKFLOW
// ============================================================

// GET /api/admin/revenue/approvals/pending
router.get(
  '/revenue/approvals/pending',
  getPendingRevenueApprovals
);

// POST /api/admin/revenue/entries/:id/prepare-approval
router.post(
  '/revenue/entries/:id/prepare-approval',
  prepareRevenueApproval
);

// PATCH /api/admin/revenue/approvals/:id/decision
router.patch(
  '/revenue/approvals/:id/decision',
  decideRevenueApproval
);

// POST /api/admin/revenue/entries/:id/post
router.post(
  '/revenue/entries/:id/post',
  postRevenueEntry
);

// POST /api/admin/revenue/entries/:id/reverse
router.post(
  '/revenue/entries/:id/reverse',
  reverseRevenueEntry
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
