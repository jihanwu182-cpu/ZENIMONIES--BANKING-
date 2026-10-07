const express = require('express');

const router = express.Router();

const adminMiddleware =
  require('../middleware/adminMiddleware');

// ============================================================
// ADMIN CONTROLLER
// ============================================================

const {
  getDashboard,
  getUsers,
  getUser,
  updateUserStatus,
  getKycRecords,
  getTransactions,
  getAuditLogs,
} = require('../controllers/adminController');


// ============================================================
// CUSTOMER CARE ADMINISTRATION
// ============================================================

const {
  listCustomerCareAgents,
  assignCustomerCareRole,
  removeCustomerCareRole,
} = require('../controllers/customerCareAdminController');


// ============================================================
// ADMIN CUSTOMER SUPPORT
// ============================================================

const {
  getSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
} = require('../controllers/adminSupportController');


// ============================================================
// CUSTOMER CARE → ADMINISTRATION ESCALATION
// ============================================================

const {
  getEscalatedSupportTickets,
  getEscalatedSupportTicket,
  takeEscalatedSupportTicket,
} = require('../controllers/adminSupportEscalationController');


// ============================================================
// ADMIN AUTHENTICATION
// ============================================================
//
// EVERYTHING BELOW this middleware requires an authenticated
// administrator.
//
// Customer Care users cannot access these routes.
//
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
// USERS
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
// KYC
// ============================================================

// GET /api/admin/kyc

router.get(
  '/kyc',
  getKycRecords
);


// ============================================================
// TRANSACTIONS
// ============================================================

// GET /api/admin/transactions

router.get(
  '/transactions',
  getTransactions
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
// CUSTOMER CARE AGENT MANAGEMENT
// ============================================================
//
// Administration controls who receives the
// customer_care role.
//
// Customer Care users do NOT receive admin permissions.
//
// ============================================================

// GET /api/admin/customer-care/agents

router.get(
  '/customer-care/agents',
  listCustomerCareAgents
);


// PATCH /api/admin/customer-care/agents/:id

router.patch(
  '/customer-care/agents/:id',
  assignCustomerCareRole
);


// PATCH /api/admin/customer-care/agents/:id/remove

router.patch(
  '/customer-care/agents/:id/remove',
  removeCustomerCareRole
);


// ============================================================
// CUSTOMER SUPPORT
// ============================================================
//
// These are the existing Administration support controls.
//
// ============================================================

// GET /api/admin/support/tickets

router.get(
  '/support/tickets',
  getSupportTickets
);


// GET /api/admin/support/tickets/:id

router.get(
  '/support/tickets/:id',
  getSupportTicket
);


// POST /api/admin/support/tickets/:id/reply

router.post(
  '/support/tickets/:id/reply',
  replyToSupportTicket
);


// PATCH /api/admin/support/tickets/:id/status

router.patch(
  '/support/tickets/:id/status',
  updateSupportTicketStatus
);


// PATCH /api/admin/support/tickets/:id/priority

router.patch(
  '/support/tickets/:id/priority',
  updateSupportTicketPriority
);


// ============================================================
// CUSTOMER CARE → ADMINISTRATION ESCALATION QUEUE
// ============================================================
//
// Escalated cases are separate from ordinary support tickets.
//
// Flow:
//
// Customer
//    ↓
// Customer Care
//    ↓
// Forward to Administration
//    ↓
// Administration Queue
//    ↓
// Admin Take Case
//
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
// EXPORT
// ============================================================

module.exports = router;
