
const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  getCustomerAnnouncements,
  markAnnouncementAsRead,
} = require('../controllers/announcementController');

// ============================================================
// ZENIMONIES BANKING — CUSTOMER ANNOUNCEMENTS
// ============================================================
//
// All routes require an authenticated customer.
//
// These announcements are separate from:
// - transaction notifications
// - security alerts
// - KYC verification notifications
// ============================================================

// GET /api/announcements
// Retrieve announcements matching the customer's audience.
router.get(
  '/',
  authMiddleware,
  getCustomerAnnouncements
);

// PATCH /api/announcements/:id/read
// Mark an announcement as read.
router.patch(
  '/:id/read',
  authMiddleware,
  markAnnouncementAsRead
);

module.exports = router;
