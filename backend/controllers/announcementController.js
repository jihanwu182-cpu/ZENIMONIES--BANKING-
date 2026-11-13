
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING — ANNOUNCEMENT CONTROLLER
// ============================================================
//
// Separate from transaction/security notifications.
//
// ADMIN FUNCTIONS:
// - Create announcement
// - List announcements
// - Edit draft or scheduled announcement
// - Publish immediately
// - Schedule publication
// - Archive announcement
// - View read statistics
//
// CUSTOMER FUNCTIONS:
// - Get announcements for the authenticated customer
// - Mark an announcement as read
//
// SECURITY:
// - Admin routes MUST use the existing adminMiddleware.
// - Customer routes MUST use the existing authMiddleware.
// - All SQL values are parameterized.
// - Customer responses only contain announcements matching
//   their audience.
// ============================================================

const VALID_PRIORITIES = [
  'normal',
  'important',
  'urgent',
];

const VALID_AUDIENCES = [
  'all',
  'personal',
  'business',
  'verification_tier',
];

const VALID_STATUSES = [
  'draft',
  'scheduled',
];

// ============================================================
// HELPERS
// ============================================================

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

const getUserId = (req) => {
  return req.userId || req.user?.id || null;
};

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const validateAnnouncement = ({
  title,
  message,
  priority,
  audience_type,
  audience_value,
}) => {
  if (!title || title.length > 200) {
    return 'Title is required and must not exceed 200 characters.';
  }

  if (!message) {
    return 'Announcement message is required.';
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return 'Invalid announcement priority.';
  }

  if (!VALID_AUDIENCES.includes(audience_type)) {
    return 'Invalid announcement audience.';
  }

  if (audience_type === 'verification_tier') {
    const tier = Number(audience_value);

    if (![1, 2, 3].includes(tier)) {
      return 'Verification tier must be 1, 2, or 3.';
    }
  }

  if (
    audience_type !== 'verification_tier' &&
    audience_value
  ) {
    return 'Audience value is only required for verification tier targeting.';
  }

  return null;
};

const parseScheduledDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (date.getTime() <= Date.now()) {
    return false;
  }

  return date;
};

const writeAdminAuditLog = async ({
  client,
  req,
  adminId,
  action,
  description,
}) => {
  await client.query(
    `
    INSERT INTO audit_logs (
      user_id,
      action,
      description,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      adminId,
      action,
      description,
      req.ip || null,
      req.get('user-agent') || null,
    ]
  );
};

// ============================================================
// AUDIENCE FILTER
// ============================================================
//
// Personal/business targeting uses the customer's existing
// accounts.account_type field.
//
// Verification tier targeting uses users.kyc_tier.
//
// No new customer accounts are created.
// ============================================================

const CUSTOMER_AUDIENCE_SQL = `
  (
    a.audience_type = 'all'

    OR (
      a.audience_type = 'personal'
      AND EXISTS (
        SELECT 1
        FROM accounts acc
        WHERE acc.user_id = $1
          AND acc.account_type = 'personal'
      )
    )

    OR (
      a.audience_type = 'business'
      AND EXISTS (
        SELECT 1
        FROM accounts acc
        WHERE acc.user_id = $1
          AND acc.account_type = 'business'
      )
    )

    OR (
      a.audience_type = 'verification_tier'
      AND u.kyc_tier = a.audience_value::INTEGER
    )
  )
`;

// ============================================================
// ADMIN: CREATE ANNOUNCEMENT
// POST /api/admin/announcements
// ============================================================

const createAnnouncement = async (req, res) => {
  try {
    const adminId = getUserId(req);

    if (!adminId) {
      return sendError(
        res,
        401,
        'Administrator authentication is required.'
      );
    }

    const title = normalizeText(req.body?.title);
    const message = normalizeText(req.body?.message);

    const priority =
      req.body?.priority || 'normal';

    const audience_type =
      req.body?.audience_type || 'all';

    const audience_value =
      req.body?.audience_value === undefined ||
      req.body?.audience_value === null
        ? null
        : String(req.body.audience_value).trim();

    const status =
      req.body?.status || 'draft';

    const validationError = validateAnnouncement({
      title,
      message,
      priority,
      audience_type,
      audience_value,
    });

    if (validationError) {
      return sendError(
        res,
        400,
        validationError
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return sendError(
        res,
        400,
        'New announcements can only be created as drafts or scheduled announcements.'
      );
    }

    let scheduledAt = null;

    if (status === 'scheduled') {
      scheduledAt = parseScheduledDate(
        req.body?.scheduled_at
      );

      if (!scheduledAt) {
        return sendError(
          res,
          400,
          'A valid future scheduled date and time are required.'
        );
      }
    }

    const result = await pool.query(
      `
      INSERT INTO announcements (
        title,
        message,
        priority,
        audience_type,
        audience_value,
        status,
        scheduled_at,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        title,
        message,
        priority,
        audience_type,
        audience_value,
        status,
        scheduledAt,
        adminId,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        status === 'scheduled'
          ? 'Announcement scheduled successfully.'
          : 'Announcement saved as a draft.',
      announcement: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Create announcement error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to create announcement.'
    );
  }
};

// ============================================================
// ADMIN: LIST ANNOUNCEMENTS
// GET /api/admin/announcements
// ============================================================

const getAdminAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,

        COALESCE(read_stats.read_count, 0)::INTEGER
          AS read_count

      FROM announcements a

      LEFT JOIN (
        SELECT
          announcement_id,
          COUNT(*) AS read_count
        FROM announcement_reads
        GROUP BY announcement_id
      ) read_stats
        ON read_stats.announcement_id = a.id

      ORDER BY a.created_at DESC

      LIMIT 200
    `);

    return res.json({
      success: true,
      announcements: result.rows,
    });
  } catch (error) {
    console.error(
      'Get admin announcements error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to retrieve announcements.'
    );
  }
};

// ============================================================
// ADMIN: EDIT DRAFT OR SCHEDULED ANNOUNCEMENT
// PATCH /api/admin/announcements/:id
// ============================================================

const updateAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;

    if (!announcementId) {
      return sendError(
        res,
        400,
        'Announcement ID is required.'
      );
    }

    const existing = await pool.query(
      `
      SELECT *
      FROM announcements
      WHERE id = $1
      LIMIT 1
      `,
      [announcementId]
    );

    if (!existing.rows.length) {
      return sendError(
        res,
        404,
        'Announcement not found.'
      );
    }

    const current = existing.rows[0];

    if (
      !['draft', 'scheduled'].includes(current.status)
    ) {
      return sendError(
        res,
        409,
        'Only draft or scheduled announcements can be edited.'
      );
    }

    const title =
      req.body?.title === undefined
        ? current.title
        : normalizeText(req.body.title);

    const message =
      req.body?.message === undefined
        ? current.message
        : normalizeText(req.body.message);

    const priority =
      req.body?.priority === undefined
        ? current.priority
        : req.body.priority;

    const audience_type =
      req.body?.audience_type === undefined
        ? current.audience_type
        : req.body.audience_type;

    const audience_value =
      req.body?.audience_value === undefined
        ? current.audience_value
        : req.body.audience_value === null
          ? null
          : String(req.body.audience_value).trim();

    const validationError = validateAnnouncement({
      title,
      message,
      priority,
      audience_type,
      audience_value,
    });

    if (validationError) {
      return sendError(
        res,
        400,
        validationError
      );
    }

    let scheduledAt = current.scheduled_at;
    let status = current.status;

    if (req.body?.status !== undefined) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        return sendError(
          res,
          400,
          'Invalid announcement status.'
        );
      }

      status = req.body.status;
    }

    if (
      req.body?.scheduled_at !== undefined ||
      status !== current.status
    ) {
      if (status === 'scheduled') {
        scheduledAt = parseScheduledDate(
          req.body?.scheduled_at ??
            current.scheduled_at
        );

        if (!scheduledAt) {
          return sendError(
            res,
            400,
            'A valid future scheduled date and time are required.'
          );
        }
      } else {
        scheduledAt = null;
      }
    }

    const result = await pool.query(
      `
      UPDATE announcements
      SET
        title = $1,
        message = $2,
        priority = $3,
        audience_type = $4,
        audience_value = $5,
        status = $6,
        scheduled_at = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
        AND status IN ('draft', 'scheduled')
      RETURNING *
      `,
      [
        title,
        message,
        priority,
        audience_type,
        audience_value,
        status,
        scheduledAt,
        announcementId,
      ]
    );

    if (!result.rows.length) {
      return sendError(
        res,
        409,
        'Announcement could not be updated because its status changed.'
      );
    }

    return res.json({
      success: true,
      message: 'Announcement updated successfully.',
      announcement: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Update announcement error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to update announcement.'
    );
  }
};

// ============================================================
// ADMIN: PUBLISH IMMEDIATELY
// POST /api/admin/announcements/:id/publish
// ============================================================

const publishAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;

    const result = await pool.query(
      `
      UPDATE announcements
      SET
        status = 'published',
        published_at = CURRENT_TIMESTAMP,
        scheduled_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND status IN ('draft', 'scheduled')
      RETURNING *
      `,
      [announcementId]
    );

    if (!result.rows.length) {
      const exists = await pool.query(
        `
        SELECT id, status
        FROM announcements
        WHERE id = $1
        LIMIT 1
        `,
        [announcementId]
      );

      if (!exists.rows.length) {
        return sendError(
          res,
          404,
          'Announcement not found.'
        );
      }

      return sendError(
        res,
        409,
        'This announcement cannot be published in its current status.'
      );
    }

    return res.json({
      success: true,
      message: 'Announcement published successfully.',
      announcement: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Publish announcement error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to publish announcement.'
    );
  }
};

// ============================================================
// ADMIN: ARCHIVE ANNOUNCEMENT
// POST /api/admin/announcements/:id/archive
// ============================================================

const archiveAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;

    const result = await pool.query(
      `
      UPDATE announcements
      SET
        status = 'archived',
        scheduled_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND status <> 'archived'
      RETURNING *
      `,
      [announcementId]
    );

    if (!result.rows.length) {
      return sendError(
        res,
        404,
        'Announcement not found or already archived.'
      );
    }

    return res.json({
      success: true,
      message: 'Announcement archived successfully.',
      announcement: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Archive announcement error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to archive announcement.'
    );
  }
};

// ============================================================
// CUSTOMER: GET ANNOUNCEMENTS
// GET /api/announcements
// ============================================================
//
// Scheduled announcements are visible only after their
// scheduled time has arrived.
//
// Archived and draft announcements are never shown.
// ============================================================

const getCustomerAnnouncements = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        'Authentication is required.'
      );
    }

    const requestedLimit = Number(req.query?.limit || 30);

    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 30;

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.message,
        a.priority,
        a.audience_type,
        a.published_at,
        a.scheduled_at,
        a.created_at,

        CASE
          WHEN ar.id IS NULL THEN FALSE
          ELSE TRUE
        END AS is_read,

        ar.read_at

      FROM announcements a

      INNER JOIN users u
        ON u.id = $1

      LEFT JOIN announcement_reads ar
        ON ar.announcement_id = a.id
        AND ar.user_id = $1

      WHERE
        (
          a.status = 'published'
          OR (
            a.status = 'scheduled'
            AND a.scheduled_at <= CURRENT_TIMESTAMP
          )
        )

        AND ${CUSTOMER_AUDIENCE_SQL}

      ORDER BY
        COALESCE(a.published_at, a.scheduled_at) DESC,
        a.created_at DESC

      LIMIT $2
      `,
      [userId, limit]
    );

    const unreadCount = result.rows.filter(
      (announcement) => !announcement.is_read
    ).length;

    return res.json({
      success: true,
      announcements: result.rows,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error(
      'Get customer announcements error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to retrieve announcements.'
    );
  }
};

// ============================================================
// CUSTOMER: MARK ANNOUNCEMENT AS READ
// PATCH /api/announcements/:id/read
// ============================================================

const markAnnouncementAsRead = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = getUserId(req);
    const announcementId = req.params.id;

    if (!userId) {
      return sendError(
        res,
        401,
        'Authentication is required.'
      );
    }

    await client.query('BEGIN');

    const visibleAnnouncement = await client.query(
      `
      SELECT a.id

      FROM announcements a

      INNER JOIN users u
        ON u.id = $1

      WHERE a.id = $2

        AND (
          a.status = 'published'
          OR (
            a.status = 'scheduled'
            AND a.scheduled_at <= CURRENT_TIMESTAMP
          )
        )

        AND ${CUSTOMER_AUDIENCE_SQL}

      LIMIT 1
      `,
      [userId, announcementId]
    );

    if (!visibleAnnouncement.rows.length) {
      await client.query('ROLLBACK');

      return sendError(
        res,
        404,
        'Announcement not found.'
      );
    }

    await client.query(
      `
      INSERT INTO announcement_reads (
        announcement_id,
        user_id
      )
      VALUES ($1, $2)

      ON CONFLICT (
        announcement_id,
        user_id
      )
      DO NOTHING
      `,
      [announcementId, userId]
    );

    const readResult = await client.query(
      `
      SELECT read_at
      FROM announcement_reads
      WHERE announcement_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [announcementId, userId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Announcement marked as read.',
      announcement_id: announcementId,
      read_at: readResult.rows[0]?.read_at || null,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // No active transaction may exist.
    }

    console.error(
      'Mark announcement as read error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to mark announcement as read.'
    );
  } finally {
    client.release();
  }
};

// ============================================================
// ADMIN: ANNOUNCEMENT READ STATISTICS
// GET /api/admin/announcements/:id/statistics
// ============================================================

const getAnnouncementStatistics = async (req, res) => {
  try {
    const announcementId = req.params.id;

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.status,
        a.audience_type,
        a.audience_value,

        COUNT(DISTINCT ar.user_id)::INTEGER
          AS read_count

      FROM announcements a

      LEFT JOIN announcement_reads ar
        ON ar.announcement_id = a.id

      WHERE a.id = $1

      GROUP BY a.id

      LIMIT 1
      `,
      [announcementId]
    );

    if (!result.rows.length) {
      return sendError(
        res,
        404,
        'Announcement not found.'
      );
    }

    return res.json({
      success: true,
      statistics: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Announcement statistics error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to retrieve announcement statistics.'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createAnnouncement,
  getAdminAnnouncements,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  getCustomerAnnouncements,
  markAnnouncementAsRead,
  getAnnouncementStatistics,
};
