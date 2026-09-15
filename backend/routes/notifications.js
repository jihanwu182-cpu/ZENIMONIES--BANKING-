const express = require('express');

const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Get notifications
router.get(
  '/',
  authMiddleware,
  getNotifications
);

// Get unread count
router.get(
  '/unread-count',
  authMiddleware,
  getUnreadCount
);

// Mark all as read
router.patch(
  '/read-all',
  authMiddleware,
  markAllNotificationsAsRead
);

// Mark one as read
router.patch(
  '/:id/read',
  authMiddleware,
  markNotificationAsRead
);

// Delete one
router.delete(
  '/:id',
  authMiddleware,
  deleteNotification
);

module.exports = router;
