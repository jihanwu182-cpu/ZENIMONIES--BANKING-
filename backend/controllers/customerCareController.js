const pool = require('../config/database');

const {
  buildAgentJoinedMessage,
} = require('../services/supportService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE CONTROLLER
// ============================================================
//
// ROLE:
//   customer_care
//
// SECURITY:
//   Customer Care is a support/investigation role.
//
// Customer Care CAN:
//   - view available support cases
//   - take cases
//   - view customer information required for support
//   - view masked account information
//   - view KYC status
//   - investigate transactions READ-ONLY
//   - communicate with customers
//   - wait for customer
//   - resolve normal support cases
//   - close normal support cases
//   - forward cases to Administration
//
// Customer Care CANNOT:
//   - access Admin Dashboard
//   - change balances
//   - execute transfers
//   - reverse transactions
//   - change transaction status
//   - approve/reject KYC
//   - suspend accounts
//   - access full account numbers
//   - access balances
//   - access balance_before / balance_after
//   - access passwords/PIN/OTP/session IDs
//   - modify Administration-owned cases
//
// ============================================================


// ============================================================
// HELPERS
// ============================================================

function getAgentId(req) {
  return (
    req.user?.id ||
    req.userId ||
    req.user?.userId ||
    req.user?.user_id
  );
}


// ============================================================
// MASK PHONE
// ============================================================

function maskPhone(phone) {
  if (!phone) return null;

  const value = String(phone).trim();

  if (!value) return null;

  if (value.length <= 4) {
    return '****';
  }

  return '****' + value.slice(-4);
}


// ============================================================
// GET AVAILABLE CUSTOMER CARE CASES
// GET /api/customer-care/tickets
// ============================================================

async function getAvailableCases(req, res) {
  try {
    const search =
      String(req.query.search || '').trim();

    const status =
      String(req.query.status || '').trim();

    const priority =
      String(req.query.priority || '').trim();

    const values = [];

    const conditions = [
      `st.connected_to_customer_care = TRUE`,

      `(st.escalated_to_admin = FALSE
        OR st.escalated_to_admin IS NULL)`,

      `st.assigned_to IS NULL`,

      `st.status NOT IN ('resolved', 'closed')`,
    ];

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

    const result = await pool.query(
      `
      SELECT
        st.id,
        st.ticket_number,
        st.user_id,

        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        u.kyc_status,

        sc.name AS category_name,

        st.subject,
        st.description,
        st.status,
        st.priority,

        st.assigned_to,

        assigned_user.full_name
          AS assigned_agent_name,

        st.connected_to_customer_care,

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
        st.last_message_at

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

      WHERE ${conditions.join(' AND ')}

      ORDER BY
        CASE
          WHEN st.priority = 'urgent' THEN 1
          WHEN st.priority = 'high' THEN 2
          WHEN st.priority = 'normal' THEN 3
          ELSE 4
        END,

        st.created_at ASC

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
      'Customer Care available cases error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load available Customer Care cases.',
    });
  }
}


// ============================================================
// GET MY CUSTOMER CARE CASES
// GET /api/customer-care/tickets/mine
// ============================================================

async function getMyCases(req, res) {
  try {
    const agentId = getAgentId(req);

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    const result = await pool.query(
      `
      SELECT
        st.id,
        st.ticket_number,
        st.user_id,

        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        u.kyc_status,

        sc.name AS category_name,

        st.subject,
        st.description,
        st.status,
        st.priority,

        st.assigned_to,

        assigned_user.full_name
          AS assigned_agent_name,

        st.connected_to_customer_care,

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
        st.closed_at,
        st.last_message_at

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

      WHERE
        st.assigned_to = $1
        OR st.escalated_by = $1

      ORDER BY
        CASE
          WHEN st.escalated_to_admin = TRUE THEN 1
          ELSE 0
        END,

        st.updated_at DESC

      LIMIT 300
      `,
      [agentId]
    );

    return res.status(200).json({
      success: true,
      tickets: result.rows,
    });
  } catch (error) {
    console.error(
      'Customer Care my cases error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load your Customer Care cases.',
    });
  }
}


// ============================================================
// TAKE CASE
// POST /api/customer-care/tickets/:ticketId/take
// ============================================================

async function takeCase(req, res) {
  const client = await pool.connect();

  try {
    const agentId = getAgentId(req);
    const { ticketId } = req.params;

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message:
          'Ticket ID is required.',
      });
    }

    await client.query('BEGIN');

    const agentResult = await client.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        status
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Customer Care agent account not found.',
      });
    }

    const agent = agentResult.rows[0];

    if (agent.role !== 'customer_care') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Customer Care access is required.',
      });
    }

    if (agent.status !== 'active') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Your Customer Care account is not active.',
      });
    }

    const ticketResult = await client.query(
      `
      SELECT
        id,
        ticket_number,
        user_id,
        status,
        priority,
        assigned_to,
        connected_to_customer_care,
        escalated_to_admin,
        assigned_admin_id
      FROM support_tickets
      WHERE id = $1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support ticket not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case has already been forwarded to Administration and cannot be taken by Customer Care.',
      });
    }

    if (!ticket.connected_to_customer_care) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case is not available to Customer Care.',
      });
    }

    if (
      ticket.status === 'closed' ||
      ticket.status === 'resolved'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This support case is already closed or resolved.',
      });
    }

    if (ticket.assigned_to) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case has already been taken by another Customer Care agent.',
      });
    }

    const updateResult = await client.query(
      `
      UPDATE support_tickets
      SET
        assigned_to = $1,
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP,
        last_agent_message_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        ticket_number,
        status,
        priority,
        assigned_to,
        escalated_to_admin
      `,
      [
        agentId,
        ticketId,
      ]
    );

    const agentMessage =
      buildAgentJoinedMessage(
        agent.full_name
      );

    const messageResult = await client.query(
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
        'agent',
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
        ticketId,
        agentId,
        agentMessage,
      ]
    );

    // IMPORTANT:
    // support_ticket_events does NOT use a metadata column.
    // Use the existing note column.
    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        note
      )
      VALUES (
        $1,
        $2,
        'case_taken',
        $3,
        'in_progress',
        $4
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
        `Customer Care agent ${agent.full_name} took the case.`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care case taken successfully.',
      ticket:
        updateResult.rows[0],
      agent_message:
        messageResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Customer Care take case error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to take Customer Care case.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// GET CASE DETAILS
// GET /api/customer-care/tickets/:ticketId
// ============================================================

async function getCaseDetails(req, res) {
  try {
    const agentId = getAgentId(req);
    const { ticketId } = req.params;

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message:
          'Ticket ID is required.',
      });
    }

    const agentResult = await pool.query(
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
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          'Customer Care agent account not found.',
      });
    }

    const agent = agentResult.rows[0];

    if (agent.role !== 'customer_care') {
      return res.status(403).json({
        success: false,
        message:
          'Customer Care access is required.',
      });
    }

    if (
      agent.status &&
      String(agent.status).toLowerCase() !==
        'active'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Your Customer Care account is not active.',
      });
    }

    const ticketResult = await pool.query(
      `
      SELECT
        st.id,
        st.ticket_number,
        st.user_id,
        st.category_id,

        st.subject,
        st.description,
        st.status,
        st.priority,

        st.assigned_to,
        st.connected_to_customer_care,

        st.waiting_since,
        st.reminder_sent_at,
        st.customer_response_due_at,

        st.auto_closed_at,
        st.auto_close_reason,

        st.last_customer_message_at,
        st.last_agent_message_at,

        st.escalated_to_admin,
        st.escalated_at,
        st.escalated_by,
        st.admin_taken_at,
        st.escalation_reason,
        st.assigned_admin_id,

        st.created_at,
        st.updated_at,
        st.resolved_at,
        st.closed_at,
        st.last_message_at,

        sc.name AS category_name,

        customer.id AS customer_id,
        customer.full_name AS customer_name,
        customer.email AS customer_email,
        customer.phone AS customer_phone,
        customer.kyc_status AS customer_kyc_status,

        assigned_agent.full_name
          AS assigned_agent_name,

        escalated_agent.full_name
          AS escalated_by_name,

        admin_user.full_name
          AS assigned_admin_name,

        customer_account.account_number
          AS masked_account_number

      FROM support_tickets st

      INNER JOIN users customer
        ON customer.id = st.user_id

      LEFT JOIN support_categories sc
        ON sc.id = st.category_id

      LEFT JOIN users assigned_agent
        ON assigned_agent.id = st.assigned_to

      LEFT JOIN users escalated_agent
        ON escalated_agent.id = st.escalated_by

      LEFT JOIN users admin_user
        ON admin_user.id = st.assigned_admin_id

      LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN account_number IS NULL
              THEN NULL

            WHEN LENGTH(account_number) <= 4
              THEN '****'

            ELSE
              '****' ||
              RIGHT(account_number, 4)
          END AS account_number

        FROM accounts

        WHERE user_id = customer.id

        ORDER BY created_at ASC

        LIMIT 1
      ) customer_account
        ON TRUE

      WHERE
        (
          st.id::text = $1
          OR st.ticket_number = $1
        )

      LIMIT 1
      `,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Customer Care case not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    const isAvailableCase =
      ticket.connected_to_customer_care === true &&
      !ticket.assigned_to &&
      !ticket.escalated_to_admin &&
      !['resolved', 'closed'].includes(
        ticket.status
      );

    const isAssignedToThisAgent =
      ticket.assigned_to &&
      String(ticket.assigned_to) ===
        String(agentId);

    const isEscalatedByThisAgent =
      ticket.escalated_to_admin === true &&
      ticket.escalated_by &&
      String(ticket.escalated_by) ===
        String(agentId);

    const hasAccess =
      isAvailableCase ||
      isAssignedToThisAgent ||
      isEscalatedByThisAgent;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have access to this Customer Care case.',
      });
    }

    const messagesResult = await pool.query(
      `
      SELECT
        sm.id,
        sm.ticket_id,
        sm.sender_user_id,
        sm.sender_type,
        sm.message,
        sm.is_internal,
        sm.created_at,

        sender.full_name
          AS sender_name

      FROM support_messages sm

      LEFT JOIN users sender
        ON sender.id = sm.sender_user_id

      WHERE
        sm.ticket_id = $1
        AND sm.is_internal = FALSE

      ORDER BY
        sm.created_at ASC
      `,
      [ticketId]
    );

    const eventsResult = await pool.query(
      `
      SELECT
        ste.id,
        ste.ticket_id,
        ste.event_type,
        ste.old_value,
        ste.new_value,
        ste.note,
        ste.created_at,

        actor.full_name
          AS actor_name,

        actor.role
          AS actor_role

      FROM support_ticket_events ste

      LEFT JOIN users actor
        ON actor.id = ste.actor_user_id

      WHERE ste.ticket_id = $1

      ORDER BY
        ste.created_at ASC
      `,
      [ticketId]
    );

    const customer = {
      id:
        ticket.customer_id,

      full_name:
        ticket.customer_name,

      email:
        ticket.customer_email,

      phone:
        maskPhone(ticket.customer_phone),

      kyc_status:
        ticket.customer_kyc_status,

      account_number:
        ticket.masked_account_number ||
        null,
    };

    const safeTicket = {
      id:
        ticket.id,

      ticket_number:
        ticket.ticket_number,

      subject:
        ticket.subject,

      description:
        ticket.description,

      status:
        ticket.status,

      priority:
        ticket.priority,

      category_name:
        ticket.category_name,

      customer_name:
        ticket.customer_name,

      full_name:
        ticket.customer_name,

      email:
        ticket.customer_email,

      phone:
        maskPhone(ticket.customer_phone),

      assigned_to:
        ticket.assigned_to,

      assigned_agent_name:
        ticket.assigned_agent_name,

      connected_to_customer_care:
        ticket.connected_to_customer_care,

      waiting_since:
        ticket.waiting_since,

      reminder_sent_at:
        ticket.reminder_sent_at,

      customer_response_due_at:
        ticket.customer_response_due_at,

      auto_closed_at:
        ticket.auto_closed_at,

      auto_close_reason:
        ticket.auto_close_reason,

      last_customer_message_at:
        ticket.last_customer_message_at,

      last_agent_message_at:
        ticket.last_agent_message_at,

      last_message_at:
        ticket.last_message_at,

      escalated_to_admin:
        ticket.escalated_to_admin,

      escalated_at:
        ticket.escalated_at,

      escalated_by:
        ticket.escalated_by,

      escalated_by_name:
        ticket.escalated_by_name,

      escalation_reason:
        ticket.escalation_reason,

      assigned_admin_id:
        ticket.assigned_admin_id,

      assigned_admin_name:
        ticket.assigned_admin_name,

      admin_taken_at:
        ticket.admin_taken_at,

      created_at:
        ticket.created_at,

      updated_at:
        ticket.updated_at,

      resolved_at:
        ticket.resolved_at,

      closed_at:
        ticket.closed_at,

      read_only_after_admin_escalation:
        Boolean(
          ticket.escalated_to_admin
        ),
    };

    return res.status(200).json({
      success: true,

      ticket:
        safeTicket,

      customer,

      messages:
        messagesResult.rows,

      events:
        eventsResult.rows,

      transaction:
        null,

      read_only:
        Boolean(
          ticket.escalated_to_admin
        ),
    });
  } catch (error) {
    console.error(
      'Customer Care get case details error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load Customer Care case.',
    });
  }
}


// ============================================================
// REPLY TO CUSTOMER
// POST /api/customer-care/tickets/:ticketId/reply
// ============================================================

async function replyToCustomer(req, res) {
  const client = await pool.connect();

  try {
    const agentId = getAgentId(req);
    const { ticketId } = req.params;

    const message =
      String(
        req.body?.message || ''
      ).trim();

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message:
          'A message is required.',
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          'Message is too long.',
      });
    }

    await client.query('BEGIN');

    const ticketResult = await client.query(
      `
      SELECT
        id,
        ticket_number,
        user_id,
        status,
        assigned_to,
        escalated_to_admin,
        assigned_admin_id
      FROM support_tickets
      WHERE id = $1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support case not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case has been forwarded to Administration. Customer Care can no longer reply to or modify this case.',
      });
    }

    if (
      String(ticket.assigned_to) !==
      String(agentId)
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case is not assigned to you.',
      });
    }

    if (ticket.status === 'closed') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This support case is closed.',
      });
    }

    const messageResult = await client.query(
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
        'agent',
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
        ticketId,
        agentId,
        message,
      ]
    );

    await client.query(
      `
      UPDATE support_tickets
      SET
        status = 'in_progress',
        waiting_since = NULL,
        reminder_sent_at = NULL,
        customer_response_due_at = NULL,
        last_agent_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [ticketId]
    );

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        note
      )
      VALUES (
        $1,
        $2,
        'agent_reply',
        $3,
        'in_progress',
        $4
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
        `Customer Care agent sent message ${messageResult.rows[0].id}.`,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Reply sent successfully.',
      support_message:
        messageResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Customer Care reply error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to send Customer Care reply.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// WAIT FOR CUSTOMER
// PATCH /api/customer-care/tickets/:ticketId/waiting
// ============================================================

async function waitForCustomer(req, res) {
  const client = await pool.connect();

  try {
    const agentId = getAgentId(req);
    const { ticketId } = req.params;

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    await client.query('BEGIN');

    const ticketResult = await client.query(
      `
      SELECT
        id,
        ticket_number,
        status,
        assigned_to,
        escalated_to_admin,
        assigned_admin_id
      FROM support_tickets
      WHERE id = $1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support case not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case has been forwarded to Administration. Customer Care can no longer modify it.',
      });
    }

    if (
      String(ticket.assigned_to) !==
      String(agentId)
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case is not assigned to you.',
      });
    }

    if (ticket.status === 'closed') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This support case is closed.',
      });
    }

    const reminderHours = Number(
      process.env.SUPPORT_CUSTOMER_REMINDER_HOURS ||
      12
    );

    const timeoutHours = Number(
      process.env.SUPPORT_CUSTOMER_RESPONSE_TIMEOUT_HOURS ||
      24
    );

    const now = new Date();

    const reminderAt =
      new Date(
        now.getTime() +
        reminderHours *
          60 *
          60 *
          1000
      );

    const responseDueAt =
      new Date(
        now.getTime() +
        timeoutHours *
          60 *
          60 *
          1000
      );

    await client.query(
      `
      UPDATE support_tickets
      SET
        status = 'pending',
        waiting_since = CURRENT_TIMESTAMP,
        reminder_sent_at = NULL,
        customer_response_due_at = $1,
        last_agent_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        responseDueAt,
        ticketId,
      ]
    );

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        note
      )
      VALUES (
        $1,
        $2,
        'waiting_for_customer',
        $3,
        'pending',
        $4
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
        `Customer response reminder scheduled for ${reminderAt.toISOString()}. Automatic closure due at ${responseDueAt.toISOString()}.`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Case is now waiting for the customer.',
      reminder_at:
        reminderAt.toISOString(),
      response_due_at:
        responseDueAt.toISOString(),
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Customer Care waiting error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to place case into waiting status.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// RESOLVE CASE
// PATCH /api/customer-care/tickets/:ticketId/resolve
// ============================================================

async function resolveCase(req, res) {
  const client = await pool.connect();

  try {
    const agentId = getAgentId(req);
    const { ticketId } = req.params;

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    await client.query('BEGIN');

    const ticketResult = await client.query(
      `
      SELECT
        id,
        ticket_number,
        user_id,
        status,
        assigned_to,
        escalated_to_admin,
        assigned_admin_id
      FROM support_tickets
      WHERE id = $1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support case not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case has been forwarded to Administration. Customer Care cannot resolve it.',
      });
    }

    if (
      String(ticket.assigned_to) !==
      String(agentId)
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case is not assigned to you.',
      });
    }

    if (ticket.status === 'closed') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This support case is already closed.',
      });
    }

    await client.query(
      `
      UPDATE support_tickets
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        waiting_since = NULL,
        reminder_sent_at = NULL,
        customer_response_due_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [ticketId]
    );

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        note
      )
      VALUES (
        $1,
        $2,
        'case_resolved',
        $3,
        'resolved',
        $4
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
        `Customer Care resolved support ticket ${ticket.ticket_number}.`,
      ]
    );

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
        'customer_care_case_resolved',
        $2,
        $3,
        $4
      )
      `,
      [
        agentId,
        `Customer Care resolved support ticket ${ticket.ticket_number}.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care case resolved successfully.',
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Customer Care resolve case error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to resolve Customer Care case.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// CLOSE CASE
// PATCH /api/customer-care/tickets/:ticketId/close
// ============================================================

async function closeCase(req, res) {
  const client = await pool.connect();

  try {
    const agentId = getAgentId(req);
    const { ticketId } = req.params;

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care identity could not be determined.',
      });
    }

    await client.query('BEGIN');

    const ticketResult = await client.query(
      `
      SELECT
        id,
        ticket_number,
        user_id,
        status,
        assigned_to,
        escalated_to_admin,
        assigned_admin_id
      FROM support_tickets
      WHERE id = $1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Support case not found.',
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case has been forwarded to Administration. Customer Care cannot close it.',
      });
    }

    if (
      String(ticket.assigned_to) !==
      String(agentId)
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'This case is not assigned to you.',
      });
    }

    if (ticket.status === 'closed') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This support case is already closed.',
      });
    }

    await client.query(
      `
      UPDATE support_tickets
      SET
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP,
        waiting_since = NULL,
        reminder_sent_at = NULL,
        customer_response_due_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [ticketId]
    );

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        old_value,
        new_value,
        note
      )
      VALUES (
        $1,
        $2,
        'case_closed',
        $3,
        'closed',
        $4
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
        `Customer Care closed support ticket ${ticket.ticket_number}.`,
      ]
    );

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
        'customer_care_case_closed',
        $2,
        $3,
        $4
      )
      `,
      [
        agentId,
        `Customer Care closed support ticket ${ticket.ticket_number}.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care case closed successfully.',
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Customer Care close case error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to close Customer Care case.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// SECURE TRANSACTION INVESTIGATION
// GET /api/customer-care/transactions/investigate
// ============================================================
//
// Supports:
//   - internal_transfer
//   - internal_transfer_received
//   - external bank transfer
//   - pending
//   - processing
//   - completed
//   - failed
//
// NEVER RETURN:
//   - balance
//   - balance_before
//   - balance_after
//   - full account number
//   - PIN
//   - OTP
//   - password
//   - session ID
// ============================================================

async function investigateTransaction(req, res) {
  try {
    const reference =
      String(
        req.query.reference || ''
      ).trim();

    if (!reference) {
      return res.status(400).json({
        success: false,
        message:
          'Transaction reference is required.',
      });
    }

    const transactionResult =
      await pool.query(
        `
        SELECT
          transaction_id,
          customer_id,
          customer_name,
          customer_email,
          customer_phone,
          kyc_status,
          masked_account_number,

          transaction_reference,
          transaction_type,
          transaction_amount,
          transaction_currency,
          transaction_description,
          transaction_status,
          transaction_created_at,

          bank_transfer_id,
          recipient_name,
          masked_recipient_account_number,
          recipient_bank_name,
          recipient_bank_code,
          bank_transfer_status,
          provider_reference,
          failure_reason,
          transfer_created_at,
          transfer_completed_at

        FROM agent_transactions_view

        WHERE
          transaction_reference = $1
          OR provider_reference = $1

        ORDER BY
          transaction_created_at DESC

        LIMIT 1
        `,
        [reference]
      );

    let transaction =
      transactionResult.rows[0] ||
      null;

    let bankTransfer = null;

    if (!transaction) {
      const transferResult =
        await pool.query(
          `
          SELECT
            bank_transfer_id,
            customer_id,
            customer_name,
            customer_email,
            customer_phone,
            kyc_status,
            masked_account_number,

            transaction_reference,
            provider_reference,

            recipient_name,
            masked_recipient_account_number,
            recipient_bank_name,
            recipient_bank_code,

            amount,
            currency,
            narration,
            status,
            failure_reason,
            created_at,
            completed_at

          FROM agent_bank_transfers_view

          WHERE
            transaction_reference = $1
            OR provider_reference = $1

          ORDER BY
            created_at DESC

          LIMIT 1
          `,
          [reference]
        );

      bankTransfer =
        transferResult.rows[0] ||
        null;
    }

    if (
      !transaction &&
      !bankTransfer
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Transaction could not be found.',
      });
    }

    const source =
      transaction ||
      bankTransfer;

    const transactionType =
      transaction?.transaction_type ||
      'bank_transfer';

    const status =
      transaction?.transaction_status ||
      transaction?.bank_transfer_status ||
      bankTransfer?.status ||
      'unknown';

    const amount =
      transaction?.transaction_amount ??
      bankTransfer?.amount ??
      null;

    const currency =
      transaction?.transaction_currency ||
      bankTransfer?.currency ||
      'NGN';

    const transactionReference =
      transaction?.transaction_reference ||
      bankTransfer?.transaction_reference ||
      reference;

    const isInternalTransfer =
      transactionType === 'internal_transfer' ||
      transactionType ===
        'internal_transfer_received';

    let recipient = {
      name:
        transaction?.recipient_name ||
        bankTransfer?.recipient_name ||
        null,

      account_number:
        transaction?.masked_recipient_account_number ||
        bankTransfer?.masked_recipient_account_number ||
        null,

      bank_name:
        transaction?.recipient_bank_name ||
        bankTransfer?.recipient_bank_name ||
        null,

      bank_code:
        transaction?.recipient_bank_code ||
        bankTransfer?.recipient_bank_code ||
        null,
    };

    // ----------------------------------------------------------
    // INTERNAL TRANSFER COUNTERPART
    // ----------------------------------------------------------

    if (
      isInternalTransfer &&
      !recipient.name
    ) {
      const counterpartResult =
        await pool.query(
          `
          SELECT
            t.id AS transaction_id,

            u.id AS customer_id,
            u.full_name AS customer_name,

            CASE
              WHEN a.account_number IS NULL
                THEN NULL

              WHEN LENGTH(a.account_number) <= 4
                THEN '****'

              ELSE
                '****' ||
                RIGHT(a.account_number, 4)
            END AS masked_account_number

          FROM transactions t

          INNER JOIN accounts a
            ON a.id = t.account_id

          INNER JOIN users u
            ON u.id = a.user_id

          WHERE
            t.reference = $1
            AND a.user_id <> $2

          ORDER BY
            t.created_at ASC

          LIMIT 1
          `,
          [
            transactionReference,
            source.customer_id,
          ]
        );

      if (
        counterpartResult.rows.length > 0
      ) {
        const counterpart =
          counterpartResult.rows[0];

        recipient = {
          name:
            counterpart.customer_name ||
            null,

          account_number:
            counterpart.masked_account_number ||
            null,

          bank_name:
            'ZENIMONIES',

          bank_code:
            null,
        };
      }
    }

    // ----------------------------------------------------------
    // MASK CUSTOMER PHONE
    // ----------------------------------------------------------

    const customerPhone =
      maskPhone(
        source.customer_phone
      );

    // ----------------------------------------------------------
    // TRANSACTION FLOW
    // ----------------------------------------------------------

    let flow = [];

    if (isInternalTransfer) {
      flow = [
        {
          step:
            'Transfer initiated',
          label:
            'Transfer initiated',
          status:
            'completed',
        },

        {
          step:
            'ZENIMONIES account transfer processed',
          label:
            'ZENIMONIES account transfer processed',
          status:
            status === 'failed'
              ? 'failed'
              : 'completed',
        },

        {
          step:
            'Recipient account credited',
          label:
            'Recipient account credited',
          status:
            status === 'completed' ||
            status === 'successful'
              ? 'completed'
              : status === 'failed'
              ? 'failed'
              : 'pending',
        },
      ];
    } else {
      flow = [
        {
          step:
            'Transfer initiated',
          label:
            'Transfer initiated',
          status:
            'completed',
        },

        {
          step:
            'Account debit recorded',
          label:
            'Account debit recorded',
          status:
            transaction
              ? 'completed'
              : 'pending',
        },
      ];

      if (status === 'failed') {
        flow.push({
          step:
            'Bank transfer submitted',
          label:
            'Bank transfer submitted',
          status:
            'completed',
        });

        flow.push({
          step:
            'Interbank processing',
          label:
            'Interbank processing',
          status:
            'failed',
        });

        flow.push({
          step:
            'Recipient credit',
          label:
            'Recipient credit',
          status:
            'failed',
        });
      } else if (
        status === 'completed' ||
        status === 'successful'
      ) {
        flow.push({
          step:
            'Bank transfer submitted',
          label:
            'Bank transfer submitted',
          status:
            'completed',
        });

        flow.push({
          step:
            'Interbank processing',
          label:
            'Interbank processing',
          status:
            'completed',
        });

        flow.push({
          step:
            'Recipient credit',
          label:
            'Recipient credit',
          status:
            'completed',
        });
      } else {
        flow.push({
          step:
            'Bank transfer submitted',
          label:
            'Bank transfer submitted',
          status:
            'completed',
        });

        flow.push({
          step:
            'Interbank processing',
          label:
            'Interbank processing',
          status:
            'processing',
        });

        flow.push({
          step:
            'Recipient credit',
          label:
            'Recipient credit',
          status:
            'pending',
        });
      }
    }

    return res.status(200).json({
      success: true,

      transaction: {
        id:
          transaction?.transaction_id ||
          bankTransfer?.bank_transfer_id ||
          null,

        reference:
          transactionReference,

        type:
          transactionType,

        amount,

        currency,

        status,

        status_label:
          status === 'completed' ||
          status === 'successful'
            ? 'Completed'
            : status === 'processing'
            ? 'Processing'
            : status === 'pending'
            ? 'Pending'
            : status === 'failed'
            ? 'Failed'
            : 'Unknown',

        description:
          transaction?.transaction_description ||
          bankTransfer?.narration ||
          null,

        created_at:
          transaction?.transaction_created_at ||
          bankTransfer?.created_at ||
          null,

        initiated_at:
          transaction?.transaction_created_at ||
          bankTransfer?.created_at ||
          null,

        provider_reference:
          transaction?.provider_reference ||
          bankTransfer?.provider_reference ||
          null,

        failure_reason:
          transaction?.failure_reason ||
          bankTransfer?.failure_reason ||
          null,

        completed_at:
          transaction?.transfer_completed_at ||
          bankTransfer?.completed_at ||
          null,
      },

      customer: {
        id:
          source.customer_id,

        full_name:
          source.customer_name,

        email:
          source.customer_email,

        phone:
          customerPhone,

        kyc_status:
          source.kyc_status,

        account_number:
          source.masked_account_number ||
          null,
      },

      recipient,

      flow,

      read_only: true,
    });
  } catch (error) {
    console.error(
      'Customer Care transaction investigation error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to investigate transaction.',
    });
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAvailableCases,
  getMyCases,
  takeCase,
  getCaseDetails,
  replyToCustomer,
  waitForCustomer,
  resolveCase,
  closeCase,
  investigateTransaction,
};
