const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// ADMINISTRATION — CUSTOMER CARE ESCALATION
//
// Administration receives cases forwarded by Customer Care.
//
// SECURITY:
// - Admin authentication is enforced by adminMiddleware
//   on the admin routes.
// - Customer Care cannot call these endpoints successfully.
// - Taking a case assigns administrative responsibility.
// - The original Customer Care conversation is retained.
// - All takeover actions are audited.
// ============================================================


// ============================================================
// GET ESCALATED CASES
// ============================================================

async function getEscalatedSupportTickets(req, res) {
  try {
    const {
      search = '',
      priority = '',
    } = req.query;

    const values = [];
    const conditions = [
      'st.escalated_to_admin = TRUE',
      "st.status NOT IN ('closed', 'resolved')",
    ];

    if (search.trim()) {
      values.push(`%${search.trim()}%`);

      conditions.push(`
        (
          st.ticket_number ILIKE $${values.length}
          OR st.subject ILIKE $${values.length}
          OR u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
        )
      `);
    }

    if (priority.trim()) {
      values.push(priority.trim());

      conditions.push(
        `st.priority = $${values.length}`
      );
    }

    const result = await pool.query(
      `
      SELECT
        st.id,
        st.ticket_number,
        st.subject,
        st.description,
        st.status,
        st.priority,
        st.created_at,
        st.updated_at,
        st.escalated_to_admin,
        st.escalated_at,
        st.escalation_reason,
        st.admin_taken_at,
        st.assigned_admin_id,

        c.name AS category_name,

        u.id AS customer_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        u.kyc_status,

        -- Customer Care agent who escalated the case
        esc.full_name AS escalated_by_name,

        -- Administrator currently responsible
        adm.full_name AS assigned_admin_name

      FROM support_tickets st

      LEFT JOIN support_categories c
        ON c.id = st.category_id

      LEFT JOIN users u
        ON u.id = st.user_id

      LEFT JOIN users esc
        ON esc.id = st.escalated_by

      LEFT JOIN users adm
        ON adm.id = st.assigned_admin_id

      WHERE ${conditions.join(' AND ')}

      ORDER BY
        CASE st.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        st.escalated_at ASC

      LIMIT 300
      `,
      values
    );

    return res.json({
      success: true,
      tickets: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin escalated support tickets error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load escalated support cases',
    });
  }
}


// ============================================================
// GET ONE ESCALATED CASE
// ============================================================

async function getEscalatedSupportTicket(req, res) {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      `
      SELECT
        st.*,

        c.name AS category_name,
        c.description AS category_description,

        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        u.kyc_status,

        esc.full_name AS escalated_by_name,
        esc.email AS escalated_by_email,

        adm.full_name AS assigned_admin_name,
        adm.email AS assigned_admin_email

      FROM support_tickets st

      LEFT JOIN support_categories c
        ON c.id = st.category_id

      LEFT JOIN users u
        ON u.id = st.user_id

      LEFT JOIN users esc
        ON esc.id = st.escalated_by

      LEFT JOIN users adm
        ON adm.id = st.assigned_admin_id

      WHERE st.id = $1
        AND st.escalated_to_admin = TRUE

      LIMIT 1
      `,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Escalated support case not found',
      });
    }

    const ticket = ticketResult.rows[0];

    // ----------------------------------------------------------
    // CONVERSATION
    // ----------------------------------------------------------

    const messagesResult = await pool.query(
      `
      SELECT
        sm.id,
        sm.sender_user_id,
        sm.sender_type,
        sm.message,
        sm.is_internal,
        sm.created_at,

        CASE
          WHEN sm.sender_type = 'assistant'
            THEN 'ZENIMONIES Support Assistant'

          ELSE COALESCE(
            u.full_name,
            CASE
              WHEN sm.sender_type = 'customer'
                THEN 'Customer'
              WHEN sm.sender_type = 'agent'
                THEN 'Customer Care Agent'
              WHEN sm.sender_type = 'admin'
                THEN 'Administration'
              ELSE 'ZENIMONIES Support'
            END
          )
        END AS sender_name

      FROM support_messages sm

      LEFT JOIN users u
        ON u.id = sm.sender_user_id

      WHERE sm.ticket_id = $1

      ORDER BY sm.created_at ASC
      `,
      [id]
    );

    // ----------------------------------------------------------
    // AUDIT / EVENT HISTORY
    // ----------------------------------------------------------

    const eventsResult = await pool.query(
      `
      SELECT
        ste.id,
        ste.event_type,
        ste.old_value,
        ste.new_value,
        ste.note,
        ste.created_at,
        u.full_name AS actor_name,
        u.role AS actor_role

      FROM support_ticket_events ste

      LEFT JOIN users u
        ON u.id = ste.actor_user_id

      WHERE ste.ticket_id = $1

      ORDER BY ste.created_at ASC
      `,
      [id]
    );

    return res.json({
      success: true,

      ticket,

      messages: messagesResult.rows,

      events: eventsResult.rows,
    });
  } catch (error) {
    console.error(
      'Admin escalated support ticket error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load escalated support case',
    });
  }
}


// ============================================================
// ADMIN TAKES ESCALATED CASE
// ============================================================

async function takeEscalatedSupportTicket(req, res) {
  const client = await pool.connect();

  try {
    const adminId =
      req.user?.id ||
      req.user?.userId ||
      req.userId;

    const { id } = req.params;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message:
          'Administration authentication required',
      });
    }

    await client.query('BEGIN');

    // ----------------------------------------------------------
    // LOCK CASE
    // ----------------------------------------------------------

    const ticketResult = await client.query(
      `
      SELECT
        id,
        ticket_number,
        user_id,
        status,
        assigned_to,
        assigned_admin_id,
        escalated_to_admin,
        escalated_by,
        escalated_at,
        admin_taken_at,
        escalation_reason
      FROM support_tickets
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Support case not found',
      });
    }

    const ticket = ticketResult.rows[0];

    // ----------------------------------------------------------
    // MUST BE ESCALATED
    // ----------------------------------------------------------

    if (!ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case has not been escalated to Administration',
      });
    }

    // ----------------------------------------------------------
    // ALREADY TAKEN BY ANOTHER ADMIN
    // ----------------------------------------------------------

    if (ticket.assigned_admin_id) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case has already been taken by another administrator',
      });
    }

    // ----------------------------------------------------------
    // CLOSED / RESOLVED
    // ----------------------------------------------------------

    if (
      ticket.status === 'closed' ||
      ticket.status === 'resolved'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'Resolved or closed cases cannot be taken',
      });
    }

    // ----------------------------------------------------------
    // VERIFY ADMIN
    // ----------------------------------------------------------

    const adminResult = await client.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        status
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [adminId]
    );

    if (adminResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message: 'Administrator account not found',
      });
    }

    const admin = adminResult.rows[0];

    if (admin.role !== 'admin') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Only administrators can take escalated cases',
      });
    }

    if (admin.status !== 'active') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Administrator account is not active',
      });
    }

    // ----------------------------------------------------------
    // ADMIN TAKES CONTROL
    // ----------------------------------------------------------

    const updatedResult = await client.query(
      `
      UPDATE support_tickets
      SET
        assigned_admin_id = $1,
        admin_taken_at = NOW(),

        -- Customer Care assignment is cleared because
        -- Administration now owns the case.
        assigned_to = NULL,

        status = 'in_progress',
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        ticket_number,
        status,
        assigned_to,
        assigned_admin_id,
        escalated_to_admin,
        escalated_at,
        admin_taken_at,
        escalation_reason
      `,
      [adminId, id]
    );

    const updatedTicket =
      updatedResult.rows[0];

    // ----------------------------------------------------------
    // ADMIN TAKEOVER EVENT
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        note,
        created_at
      )
      VALUES (
        $1,
        $2,
        'admin_took_case',
        'customer_care',
        'administration',
        $3,
        NOW()
      )
      `,
      [
        id,
        adminId,
        `Administration took responsibility for case ${ticket.ticket_number}.`,
      ]
    );

    // ----------------------------------------------------------
    // ADMIN SYSTEM MESSAGE
    // ----------------------------------------------------------
    // This becomes part of the same conversation.
    // It does not expose internal security information.
    // ----------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_messages (
        ticket_id,
        sender_user_id,
        sender_type,
        message,
        is_internal,
        created_at
      )
      VALUES (
        $1,
        $2,
        'admin',
        $3,
        FALSE,
        NOW()
      )
      `,
      [
        id,
        adminId,
        `Hello, I'm ${admin.full_name} from ZENIMONIES Administration. I've taken responsibility for this case and will continue reviewing it.`,
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,

      message:
        'Administration has taken responsibility for this case',

      ticket: updatedTicket,

      administrator: {
        id: admin.id,
        full_name: admin.full_name,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Admin take escalated support ticket error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to take escalated support case',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getEscalatedSupportTickets,
  getEscalatedSupportTicket,
  takeEscalatedSupportTicket,
};
