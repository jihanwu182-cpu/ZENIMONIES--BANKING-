
const express = require('express');

const router = express.Router();

// ============================================================
// ZENIMONIES BANKING — ADMIN ROUTES
// All routes require an authenticated, active administrator.
// ============================================================

const adminMiddleware = require('../middleware/adminMiddleware');

// ============================================================
// ADMIN CONTROLLER
// ============================================================

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

// ============================================================
// ANNOUNCEMENT CONTROLLER
// ============================================================

const {
  createAnnouncement,
  getAdminAnnouncements,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  getAnnouncementStatistics,
} = require('../controllers/announcementController');

// ============================================================
// CUSTOMER CARE ADMINISTRATION
// ============================================================

const {
  listCustomerCareAgents,
  assignCustomerCareRole,
  removeCustomerCareRole,
} = require('../controllers/customerCareAdminController');

// ============================================================
// CUSTOMER CARE SUPPORT
// ============================================================

const {
  getSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
} = require('../controllers/adminSupportController');

// ============================================================
// ESCALATED SUPPORT
// ============================================================

const {
  getEscalatedSupportTickets,
  getEscalatedSupportTicket,
  takeEscalatedSupportTicket,
} = require('../controllers/adminSupportEscalationController');

// ============================================================
// REVENUE ACCOUNTING AND APPROVALS
// ============================================================

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
// ANNOUNCEMENT MANAGEMENT
// All endpoints are protected by adminMiddleware.
// ============================================================

// GET /api/admin/announcements
router.get(
  '/announcements',
  getAdminAnnouncements
);

// POST /api/admin/announcements
router.post(
  '/announcements',
  createAnnouncement
);

// PATCH /api/admin/announcements/:id
router.patch(
  '/announcements/:id',
  updateAnnouncement
);

// POST /api/admin/announcements/:id/publish
router.post(
  '/announcements/:id/publish',
  publishAnnouncement
);

// POST /api/admin/announcements/:id/archive
router.post(
  '/announcements/:id/archive',
  archiveAnnouncement
);

// GET /api/admin/announcements/:id/statistics
router.get(
  '/announcements/:id/statistics',
  getAnnouncementStatistics
);

// ============================================================
// TRANSACTIONS
// ============================================================

router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransaction);

router.post(
  '/transactions/:id/report-fraud',
  reportTransactionFraud
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

router.post(
  '/support/:id/reply',
  replyToSupportTicket
);

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

router.get(
  '/revenue/summary',
  getRevenueSummary
);

router.get(
  '/revenue/entries',
  getRevenueEntries
);

router.post(
  '/revenue/reconcile-transfers',
  reconcileHistoricalTransferRevenue
);

router.get(
  '/revenue/schema-check',
  checkRevenueLedgerSchema
);

// ============================================================
// REVENUE APPROVAL WORKFLOW
// ============================================================

router.get(
  '/revenue/approvals/pending',
  getPendingRevenueApprovals
);

router.post(
  '/revenue/entries/:id/prepare-approval',
  prepareRevenueApproval
);

router.patch(
  '/revenue/approvals/:id/decision',
  decideRevenueApproval
);

router.post(
  '/revenue/entries/:id/post',
  postRevenueEntry
);

router.post(
  '/revenue/entries/:id/reverse',
  reverseRevenueEntry
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
