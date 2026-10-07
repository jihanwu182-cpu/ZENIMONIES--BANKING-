const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// ADMIN CUSTOMER CARE CONTROLLER
// ============================================================
//
// ADMINISTRATION SUPPORT RULES
//
// 1. Admins can view support cases.
// 2. Customer Care escalated cases appear in the Administration
//    queue.
// 3. An administrator must TAKE an escalated case before
//    modifying it.
// 4. Once an administrator takes an escalated case, ONLY that
//    administrator can:
//      - reply
//      - change status
//      - change priority
//      - resolve
//      - close
//
// 5. Other administrators can still VIEW the case.
// 6. This controller does NOT give Customer Care admin access.
// ============================================================


// ============================================================
// ADMIN CASE OWNERSHIP SECURITY
// ============================================================
//
// For normal support tickets:
//     Any administrator may manage the ticket.
//
// For escalated tickets:
//
//     escalated_to_admin = true
//
//     assigned_admin_id = NULL
//         -> No administrator has taken the case yet.
//         -> Administrator must TAKE CASE first.
//
//     assigned_admin_id = adminId
//         -> This administrator owns the case.
//
//     assigned_admin_id = another admin
//         -> Modification is rejected.
//
// ============================================================

async function assertAdminCanOperateOnTicket(
  client,
  ticket,
  adminId
) {
  // ----------------------------------------------------------
  // Normal non-escalated support ticket.
  // ----------------------------------------------------------

  if (!ticket.escalated_to_admin) {
    return {
      allowed: true,
    };
  }

  // ----------------------------------------------------------
  // Escalated case has not been taken yet.
  // ----------------------------------------------------------

  if (!ticket.assigned_admin_id) {
    return {
      allowed: false,
      status: 409,
      message:
        'This escalated case must be taken by an administrator before it can be modified.',
    };
  }

  // ----------------------------------------------------------
  // Another administrator owns the case.
  // ----------------------------------------------------------

  if (
    String(ticket.assigned_admin_id) !==
    String(adminId)
  ) {
    return {
      allowed: false,
      status: 403,
      message:
        'This escalated case is currently assigned to another administrator.',
    };
  }

  return {
    allowed: true,
  };
}


// ============================================================
// GET SUPPORT TICKETS
// GET /api/admin/support/tickets
// ============================================================

const getSupportTickets = async (req, res) => {
  try {
    const status =
      String(req.query.status || '').trim();

    const priority =
      String(req.query.priority || '').trim();

    const search =
      String(req.query.search || '').trim();

    const values = [];
    const conditions = [];

    if (status) {
      values.push(status);

      conditions.push(
        `st.status = $${values.length}`
      );
    }

    if (priority) {
      values.push(priority);

      conditions.push(
        `st.priority = $${values.length}`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          st.ticket_number ILIKE $${values.length}
          OR st.subject ILIKE $${values.length}
          OR u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
          OR u.phone ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const result = await pool.query(
      `
      SELECT
        st.id,
        st.ticket_number,
        st.user_id,

        u.full_name,
        u.email,
        u.phone,

        st.category_id,
        sc.name AS category_name,

        st.subject,
        st.description,
        st.status,
        st.priority,

        st.transaction_id,

        st.assigned_to,

        assigned_user.full_name
          AS assigned_agent_name,

        st.escalated_to_admin,
        st.escalated_at,
        st.escalated_by,
        escalated_user.full_name
          AS escalated_by_name,

        st.escalation_reason,

        st.assigned_admin_id,
        assigned_admin.full_name
          AS assigned_admin_name,

        st.admin_taken_at,

        st.created_at,
        st.updated_at,
        st.resolved_at,
        st.closed_at

      FROM support_tickets st

      INNER JOIN users u
        ON u.id = st.user_id

      LEFT JOIN support_categories sc
        ON sc.id = st.category_id

      LEFT JOIN users assigned_user
        ON assigned_user.id = st.assigned_to

      LEFT JOIN users escalated_user
        ON escalated_user.id = st.escalated_by

      LEFT JOIN users assigned_admin
        ON assigned_admin.id = st.assigned_admin_id

      ${whereClause}

      ORDER BY
        CASE
          WHEN st.escalated_to_admin = TRUE
            THEN 0
          ELSE 1
        END,

        CASE
          WHEN st.priority = 'urgent'
            THEN 1
          WHEN st.priority = 'high'
            THEN 2
          WHEN st.priority = 'normal'
            THEN 3
          ELSE 4
        END,

        st.created_at DESC

      LIMIT 300
      `,
      values
    );

    return res.status(200).json({
      success: true,
      tickets: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin support tickets error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load customer support tickets',
    });
  }
};


// ============================================================
// GET SINGLE SUPPORT TICKET
// GET /api/admin/support/tickets/:id
// ============================================================

const getSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      `
      SELECT
        st.id,
        st.ticket_number,
        st.user_id,

        u.full_name,
        u.email,
        u.phone,
        u.status AS user_status,
        u.kyc_status,
        u.kyc_tier,

        st.category_id,
        sc.name AS category_name,

        st.subject,
        st.description,
        st.status,
        st.priority,

        st.transaction_id,

        st.assigned_to,

        assigned_user.full_name
          AS assigned_agent_name,

        st.escalated_to_admin,
        st.escalated_at,
        st.escalated_by,

        escalated_user.full_name
          AS escalated_by_name,

        st.escalation_reason,

        st.assigned_admin_id,

        assigned_admin.full_name
          AS assigned_admin_name,

        st.admin_taken_at,

        st.created_at,
        st.updated_at,
        st.resolved_at,
        st.closed_at

      FROM support_tickets st

      INNER JOIN users u
        ON u.id = st.user_id

      LEFT JOIN support_categories sc
        ON sc.id = st.category_id

      LEFT JOIN users assigned_user
        ON assigned_user.id = st.assigned_to

      LEFT JOIN users escalated_user
        ON escalated_user.id = st.escalated_by

      LEFT JOIN users assigned_admin
        ON assigned_admin.id = st.assigned_admin_id

      WHERE st.id = $1

      LIMIT 1
      `,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Support ticket not found',
      });
    }

    const ticket =
      ticketResult.rows[0];

    // ----------------------------------------------------------
    // MESSAGES
    // ----------------------------------------------------------

    const messagesResult =
      await pool.query(
        `
        SELECT
          sm.id,
          sm.ticket_id,
          sm.sender_user_id,
          sm.sender_type,
          sm.message,
          sm.created_at,

          sender.full_name
            AS sender_name

        FROM support_messages sm

        LEFT JOIN users sender
          ON sender.id = sm.sender_user_id

        WHERE sm.ticket_id = $1

        ORDER BY sm.created_at ASC
        `,
        [id]
      );

    // ----------------------------------------------------------
    // EVENTS
    // ----------------------------------------------------------

    const eventsResult =
      await pool.query(
        `
        SELECT
          ste.id,
          ste.ticket_id,
          ste.event_type,
          ste.old_value,
          ste.new_value,
          ste.metadata,
          ste.created_at,

          actor.full_name
            AS actor_name

        FROM support_ticket_events ste

        LEFT JOIN users actor
          ON actor.id = ste.actor_user_id

        WHERE ste.ticket_id = $1

        ORDER BY ste.created_at ASC
        `,
        [id]
      );

    // ----------------------------------------------------------
    // LINKED TRANSACTION
    // ----------------------------------------------------------
    //
    // Admins may see the linked transaction.
    // Customer Care security restrictions do NOT apply here.
    //
    // This remains read-only.
    // ----------------------------------------------------------

    let transaction = null;

    if (ticket.transaction_id) {
      const transactionResult =
        await pool.query(
          `
          SELECT
            t.id,
            t.reference,
            t.type,
            t.amount,
            t.currency,
            t.description,
            t.status,
            t.created_at,
            t.balance_before,
            t.balance_after

          FROM transactions t

          WHERE t.id = $1

          LIMIT 1
          `,
          [ticket.transaction_id]
        );

      if (
        transactionResult.rows.length > 0
      ) {
        transaction =
          transactionResult.rows[0];
      }
    }

    return res.status(200).json({
      success: true,

      ticket: {
        ...ticket,

        messages:
          messagesResult.rows,

        events:
          eventsResult.rows,

        transaction,
      },
    });
  } catch (error) {
    console.error(
      'Admin get support ticket error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load support ticket',
    });
  }
};


// ============================================================
// REPLY TO SUPPORT TICKET
// POST /api/admin/support/tickets/:id/reply
// ============================================================

const replyToSupportTicket = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const message = String(
      req.body?.message || ''
    ).trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message:
          'A support message is required',
      });
    }

    const adminId =
      req.user?.id ||
      req.user?.userId ||
      req.userId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message:
          'Administrator identity could not be determined',
      });
    }

    await client.query('BEGIN');

    const ticketResult =
      await client.query(
        `
        SELECT
          id,
          ticket_number,
          user_id,
          status,
          escalated_to_admin,
          assigned_admin_id

        FROM support_tickets

        WHERE id = $1

        FOR UPDATE
        `,
        [id]
      );

    if (
      ticketResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support ticket not found',
      });
    }

    const ticket =
      ticketResult.rows[0];

    // ----------------------------------------------------------
    // ADMIN OWNERSHIP CHECK
    // ----------------------------------------------------------

    const permission =
      await assertAdminCanOperateOnTicket(
        client,
        ticket,
        adminId
      );

    if (!permission.allowed) {
      await client.query('ROLLBACK');

      return res.status(
        permission.status
      ).json({
        success: false,
        message:
          permission.message,
      });
    }

    if (ticket.status === 'closed') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This support ticket is closed',
      });
    }

    // ----------------------------------------------------------
    // ADD MESSAGE
    // ----------------------------------------------------------

    const messageResult =
      await client.query(
        `
        INSERT INTO support_messages (
          ticket_id,
          sender_user_id,
          sender_type,
          message
        )
        VALUES (
          $1,
          $2,
          'admin',
          $3
        )
        RETURNING
          id,
          ticket_id,
          sender_user_id,
          sender_type,
          message,
          created_at
        `,
        [
          id,
          adminId,
          message,
        ]
      );

    // ----------------------------------------------------------
    // MOVE TICKET TO IN PROGRESS
    // ----------------------------------------------------------

    const oldStatus =
      ticket.status;

    await client.query(
      `
      UPDATE support_tickets
      SET
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $1
      `,
      [id]
    );

    // ----------------------------------------------------------
    // EVENT
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        metadata
      )
      VALUES (
        $1,
        $2,
        'admin_reply',
        $3,
        'in_progress',
        $4::jsonb
      )
      `,
      [
        id,
        adminId,
        oldStatus,
        JSON.stringify({
          message_id:
            messageResult.rows[0].id,
        }),
      ]
    );

    // ----------------------------------------------------------
    // AUDIT LOG
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'admin_support_reply',
        $2,
        $3,
        $4
      )
      `,
      [
        ticket.user_id,
        `Administrator replied to support ticket ${ticket.ticket_number}.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Reply sent successfully',

      support_message:
        messageResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Admin support reply error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to send support reply',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// UPDATE TICKET STATUS
// PATCH /api/admin/support/tickets/:id/status
// ============================================================

const updateSupportTicketStatus = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const status = String(
      req.body?.status || ''
    ).trim();

    const allowedStatuses = [
      'open',
      'pending',
      'in_progress',
      'resolved',
      'closed',
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid support ticket status',
      });
    }

    const adminId =
      req.user?.id ||
      req.user?.userId ||
      req.userId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message:
          'Administrator identity could not be determined',
      });
    }

    await client.query('BEGIN');

    const existingResult =
      await client.query(
        `
        SELECT
          id,
          ticket_number,
          user_id,
          status,
          escalated_to_admin,
          assigned_admin_id

        FROM support_tickets

        WHERE id = $1

        FOR UPDATE
        `,
        [id]
      );

    if (
      existingResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support ticket not found',
      });
    }

    const existing =
      existingResult.rows[0];

    // ----------------------------------------------------------
    // ADMIN OWNERSHIP CHECK
    // ----------------------------------------------------------

    const permission =
      await assertAdminCanOperateOnTicket(
        client,
        existing,
        adminId
      );

    if (!permission.allowed) {
      await client.query('ROLLBACK');

      return res.status(
        permission.status
      ).json({
        success: false,
        message:
          permission.message,
      });
    }

    if (
      existing.status === status
    ) {
      await client.query('ROLLBACK');

      return res.status(200).json({
        success: true,
        message:
          'Support ticket status is already set to this value',
        status,
      });
    }

    // ----------------------------------------------------------
    // UPDATE STATUS
    // ----------------------------------------------------------

    const result =
      await client.query(
        `
        UPDATE support_tickets

        SET
          status = $1,

          resolved_at =
            CASE
              WHEN $1 = 'resolved'
                THEN CURRENT_TIMESTAMP

              WHEN $1 IN (
                'open',
                'pending',
                'in_progress'
              )
                THEN NULL

              ELSE resolved_at
            END,

          closed_at =
            CASE
              WHEN $1 = 'closed'
                THEN CURRENT_TIMESTAMP

              WHEN $1 IN (
                'open',
                'pending',
                'in_progress',
                'resolved'
              )
                THEN NULL

              ELSE closed_at
            END,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $2

        RETURNING
          id,
          ticket_number,
          status,
          priority,
          updated_at,
          resolved_at,
          closed_at
        `,
        [
          status,
          id,
        ]
      );

    // ----------------------------------------------------------
    // EVENT
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        metadata
      )
      VALUES (
        $1,
        $2,
        'status_changed',
        $3,
        $4,
        '{}'::jsonb
      )
      `,
      [
        id,
        adminId,
        existing.status,
        status,
      ]
    );

    // ----------------------------------------------------------
    // AUDIT
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'admin_support_status_changed',
        $2,
        $3,
        $4
      )
      `,
      [
        existing.user_id,
        `Support ticket ${existing.ticket_number} status changed from ${existing.status} to ${status}.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Support ticket status updated successfully',

      ticket:
        result.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Admin support status error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to update support ticket status',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// UPDATE TICKET PRIORITY
// PATCH /api/admin/support/tickets/:id/priority
// ============================================================

const updateSupportTicketPriority = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const priority = String(
      req.body?.priority || ''
    ).trim();

    const allowedPriorities = [
      'low',
      'normal',
      'high',
      'urgent',
    ];

    if (
      !allowedPriorities.includes(
        priority
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid support ticket priority',
      });
    }

    const adminId =
      req.user?.id ||
      req.user?.userId ||
      req.userId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message:
          'Administrator identity could not be determined',
      });
    }

    await client.query('BEGIN');

    const existingResult =
      await client.query(
        `
        SELECT
          id,
          ticket_number,
          user_id,
          priority,
          escalated_to_admin,
          assigned_admin_id

        FROM support_tickets

        WHERE id = $1

        FOR UPDATE
        `,
        [id]
      );

    if (
      existingResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support ticket not found',
      });
    }

    const existing =
      existingResult.rows[0];

    // ----------------------------------------------------------
    // ADMIN OWNERSHIP CHECK
    // ----------------------------------------------------------

    const permission =
      await assertAdminCanOperateOnTicket(
        client,
        existing,
        adminId
      );

    if (!permission.allowed) {
      await client.query('ROLLBACK');

      return res.status(
        permission.status
      ).json({
        success: false,
        message:
          permission.message,
      });
    }

    // ----------------------------------------------------------
    // UPDATE PRIORITY
    // ----------------------------------------------------------

    const result =
      await client.query(
        `
        UPDATE support_tickets

        SET
          priority = $1,
          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $2

        RETURNING
          id,
          ticket_number,
          priority,
          updated_at
        `,
        [
          priority,
          id,
        ]
      );

    // ----------------------------------------------------------
    // EVENT
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        metadata
      )
      VALUES (
        $1,
        $2,
        'priority_changed',
        $3,
        $4,
        '{}'::jsonb
      )
      `,
      [
        id,
        adminId,
        existing.priority,
        priority,
      ]
    );

    // ----------------------------------------------------------
    // AUDIT
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'admin_support_priority_changed',
        $2,
        $3,
        $4
      )
      `,
      [
        existing.user_id,
        `Support ticket ${existing.ticket_number} priority changed from ${existing.priority} to ${priority}.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Support ticket priority updated successfully',

      ticket:
        result.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Admin support priority error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to update support ticket priority',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
};
