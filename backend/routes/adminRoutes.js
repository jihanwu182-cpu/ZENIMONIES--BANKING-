const express = require('express');

const router = express.Router();

const adminMiddleware = require('../middleware/adminMiddleware');

// ============================================================
// EXISTING ADMIN CONTROLLERS
// ============================================================

// KEEP ALL YOUR EXISTING IMPORTS HERE.

// Example:
//
// const {
//   getDashboard,
//   getUsers,
//   getUser,
//   updateUserStatus,
//   getKycRecords,
//   ...
// } = require('../controllers/adminController');


// ============================================================
// CUSTOMER CARE ROLE MANAGEMENT
// ============================================================

const {
  listCustomerCareAgents,
  assignCustomerCareRole,
  removeCustomerCareRole,
} = require('../controllers/customerCareAdminController');


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

router.use(adminMiddleware);


// ============================================================
// YOUR EXISTING ADMIN ROUTES
// ============================================================
//
// KEEP ALL OF YOUR CURRENT ADMIN ROUTES HERE.
// DO NOT DELETE OR REPLACE THEM.
//
// Examples:
//
// router.get('/dashboard', getDashboard);
// router.get('/users', getUsers);
// router.get('/users/:id', getUser);
// router.patch('/users/:id/status', updateUserStatus);
// router.get('/kyc', getKycRecords);
//
// etc.
//
// ============================================================


// ============================================================
// CUSTOMER CARE AGENT MANAGEMENT
// ============================================================

router.get(
  '/customer-care/agents',
  listCustomerCareAgents
);

router.patch(
  '/customer-care/agents/:id',
  assignCustomerCareRole
);

router.patch(
  '/customer-care/agents/:id/remove',
  removeCustomerCareRole
);


// ============================================================
// EXISTING ADMIN CUSTOMER SUPPORT
// ============================================================
//
// KEEP YOUR EXISTING SUPPORT ROUTES.
//
// Example:
//
// router.get(
//   '/support/tickets',
//   getSupportTickets
// );
//
// router.get(
//   '/support/tickets/:id',
//   getSupportTicket
// );
//
// router.post(
//   '/support/tickets/:id/reply',
//   replyToSupportTicket
// );
//
// router.patch(
//   '/support/tickets/:id/status',
//   updateSupportTicketStatus
// );
//
// router.patch(
//   '/support/tickets/:id/priority',
//   updateSupportTicketPriority
// );


// ============================================================
// CUSTOMER CARE → ADMINISTRATION ESCALATION
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
// EXPORT
// ============================================================

module.exports = router;
