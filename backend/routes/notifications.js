const express = require('express');

const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Get the authenticated customer's notifications.
router.get(
  '/',
  authMiddleware,
  getNotifications
);

// Get unread notification count.
router.get(
  '/unread-count',
  authMiddleware,
  getUnreadCount
);

// Mark all notifications as read.
router.patch(
  '/read-all',
  authMiddleware,
  markAllNotificationsAsRead
);

// Mark one notification as read.
router.patch(
  '/:id/read',
  authMiddleware,
  markNotificationAsRead
);

module.exports = router;
