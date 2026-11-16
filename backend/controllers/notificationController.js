
const pool = require('../config/database');

// Keep the latest 100 read notifications per customer.
// Unread notifications are always preserved.
const READ_NOTIFICATION_LIMIT = 100;

// ============================================================
// HELPERS
// ============================================================

const getAuthenticatedUserId = (req) => {
  return (
    req.user?.id ||
    req.userId ||
    req.user?.userId ||
    null
  );
};

const getUnreadNotificationCount = async (userId) => {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS unread_count
    FROM notifications
    WHERE user_id = $1
      AND is_read = false
    `,
    [userId]
  );

  return result.rows[0]?.unread_count || 0;
};

const cleanupReadNotifications = async (userId) => {
  await pool.query(
    `
    DELETE FROM notifications
    WHERE user_id = $1
      AND is_read = true
      AND id IN (
        SELECT id
        FROM notifications
        WHERE user_id = $1
          AND is_read = true
        ORDER BY created_at DESC, id DESC
        OFFSET $2
      )
    `,
    [userId, READ_NOTIFICATION_LIMIT]
  );
};

// ============================================================
// GET NOTIFICATIONS
// GET /api/notifications
// ============================================================

const getNotifications = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Remove only older read notifications.
    // Unread notifications are never removed.
    await cleanupReadNotifications(userId);

    const parsedLimit = Number.parseInt(
      req.query.limit,
      10
    );

    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 30;

    const result = await pool.query(
      `
      SELECT
        id,
        type,
        title,
        message,
        transaction_id,
        is_read,
        created_at,
        read_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    const unreadCount =
      await getUnreadNotificationCount(userId);

    return res.status(200).json({
      success: true,
      notifications: result.rows,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error(
      'Get notifications error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load notifications.',
    });
  }
};

// ============================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// ============================================================

const getUnreadCount = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const unreadCount =
      await getUnreadNotificationCount(userId);

    return res.status(200).json({
      success: true,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error(
      'Get unread notification count error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load notification count.',
    });
  }
};

// ============================================================
// MARK ONE NOTIFICATION AS READ
// PATCH /api/notifications/:id/read
// ============================================================

const markNotificationAsRead = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required.',
      });
    }

    // The user_id condition ensures customers
    // cannot mark another customer's notification.
    const result = await pool.query(
      `
      UPDATE notifications
      SET
        is_read = true,
        read_at = COALESCE(
          read_at,
          CURRENT_TIMESTAMP
        )
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        type,
        title,
        message,
        transaction_id,
        is_read,
        created_at,
        read_at
      `,
      [notificationId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    await cleanupReadNotifications(userId);

    const unreadCount =
      await getUnreadNotificationCount(userId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification: result.rows[0],
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error(
      'Mark notification as read error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to update notification.',
    });
  }
};

// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// PATCH /api/notifications/read-all
// ============================================================

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    await pool.query(
      `
      UPDATE notifications
      SET
        is_read = true,
        read_at = COALESCE(
          read_at,
          CURRENT_TIMESTAMP
        )
      WHERE user_id = $1
        AND is_read = false
      `,
      [userId]
    );

    await cleanupReadNotifications(userId);

    const unreadCount =
      await getUnreadNotificationCount(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error(
      'Mark all notifications as read error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to update notifications.',
    });
  }
};

// ============================================================
// EXPORT CONTROLLERS
// No delete controller is provided.
// ============================================================

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
