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
// GET /api/admin/dashboard
// ============================================================

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
// GET /api/admin/kyc
// ============================================================

router.get(
  '/kyc',
  getKycRecords
);

// ============================================================
// TRANSACTIONS
// GET /api/admin/transactions
// ============================================================

router.get(
  '/transactions',
  getTransactions
);

// ============================================================
// AUDIT LOGS
// GET /api/admin/audit-logs
// ============================================================

router.get(
  '/audit-logs',
  getAuditLogs
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
