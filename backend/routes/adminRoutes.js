const express = require('express');

const router = express.Router();

const adminMiddleware = require('../middleware/adminMiddleware');

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
// ADMIN SECURITY
// ============================================================

router.use(adminMiddleware);


// ============================================================
// ADMIN DASHBOARD
// ============================================================

router.get(
  '/dashboard',
  getDashboard
);


// ============================================================
// USERS
// ============================================================

router.get(
  '/users',
  getUsers
);

router.get(
  '/users/:id',
  getUser
);

router.patch(
  '/users/:id/status',
  updateUserStatus
);


// ============================================================
// KYC
// ============================================================

router.get(
  '/kyc',
  getKycRecords
);


// ============================================================
// TRANSACTIONS
// ============================================================

router.get(
  '/transactions',
  getTransactions
);


// ============================================================
// AUDIT LOGS
// ============================================================

router.get(
  '/audit-logs',
  getAuditLogs
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
