const pool = require('../config/database');

// ============================================================
// GET NOTIFICATIONS
// ============================================================

const getNotifications = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const limit = Math.min(
      Number(req.query.limit) || 30,
      100
    );

    const result = await pool.query(
      `
      SELECT
        id,
        type,
        title,
        message,
        is_read,
        created_at,
        read_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    const unreadResult = await pool.query(
      `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = false
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      notifications: result.rows,
      unread_count:
        unreadResult.rows[0]?.unread_count || 0,
    });
  } catch (error) {
    console.error(
      'Get notifications error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load notifications.',
    });
  }
};

// ============================================================
// GET UNREAD COUNT
// ============================================================

const getUnreadCount = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = false
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      unread_count:
        result.rows[0]?.unread_count || 0,
    });
  } catch (error) {
    console.error(
      'Get unread notification count error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load notification count.',
    });
  }
};

// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

const markNotificationAsRead = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    const notificationId =
      req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message:
          'Notification ID is required.',
      });
    }

    const result = await pool.query(
      `
      UPDATE notifications
      SET
        is_read = true,
        read_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        type,
        title,
        message,
        is_read,
        created_at,
        read_at
      `,
      [
        notificationId,
        userId,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message:
          'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Notification marked as read.',
      notification:
        result.rows[0],
    });
  } catch (error) {
    console.error(
      'Mark notification as read error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to update notification.',
    });
  }
};

// ============================================================
// MARK ALL AS READ
// ============================================================

const markAllNotificationsAsRead =
  async (req, res) => {
    try {
      const userId =
        req.user?.id ||
        req.userId ||
        req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required.',
        });
      }

      await pool.query(
        `
        UPDATE notifications
        SET
          is_read = true,
          read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND is_read = false
        `,
        [userId]
      );

      return res.status(200).json({
        success: true,
        message:
          'All notifications marked as read.',
      });
    } catch (error) {
      console.error(
        'Mark all notifications as read error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update notifications.',
      });
    }
  };

// ============================================================
// DELETE NOTIFICATION
// ============================================================

const deleteNotification = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    const notificationId =
      req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        notificationId,
        userId,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message:
          'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Notification deleted.',
    });
  } catch (error) {
    console.error(
      'Delete notification error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to delete notification.',
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
