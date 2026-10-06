const pool = require('../config/database');

const {
  startWaitingForCustomer,
  buildAgentJoinedMessage,
} = require('../services/supportService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE AGENT CONTROLLER
// ============================================================
//
// IMPORTANT:
//
// Customer Care is NOT Admin.
//
// Customer Care agents can:
// - View support cases
// - Take cases
// - Reply to customers
// - Investigate transaction information
// - Wait for customer
// - Resolve cases
// - Close cases
//
// Customer Care agents CANNOT:
// - Change balances
// - Execute transfers
// - Reverse transactions
// - Approve KYC
// - Change transaction status
// - Access Admin Dashboard
// ============================================================


// ============================================================
// AUTHENTICATED AGENT
// ============================================================

function getAgentId(req) {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.userId
  );
}


// ============================================================
// AVAILABLE CASES
// GET /api/customer-care/tickets
// ============================================================

async function getAvailableCases(req, res) {
  try {
    const agentId = getAgentId(req);

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message: 'Customer Care authentication required.',
      });
    }

    const {
      search = '',
      status = 'all',
      priority = 'all',
    } = req.query || {};

    const values = [];
    const conditions = [];

    // --------------------------------------------------------
    // Only cases that have requested Customer Care.
    // --------------------------------------------------------

    conditions.push(
      `st.connected_to_customer_care = TRUE`
    );

    // --------------------------------------------------------
    // Available means not currently assigned.
    // --------------------------------------------------------

    conditions.push(
      `st.assigned_to IS NULL`
    );

    // --------------------------------------------------------
    // Status filter.
    // --------------------------------------------------------

    if (status && status !== 'all') {
      values.push(status);
      conditions.push(
        `st.status = $${values.length}`
      );
    } else {
      conditions.push(
        `st.status IN ('open', 'pending')`
      );
    }

    // --------------------------------------------------------
    // Priority filter.
    // --------------------------------------------------------

    if (priority && priority !== 'all') {
      values.push(priority);
      conditions.push(
        `st.priority = $${values.length}`
      );
    }

    // --------------------------------------------------------
    // Search.
    // Ticket ID / customer name / email.
    // --------------------------------------------------------

    if (search.trim()) {
      values.push(
        `%${search.trim()}%`
      );

      const searchParam =
        `$${values.length}`;

      conditions.push(`
        (
          st.ticket_number ILIKE ${searchParam}
          OR u.full_name ILIKE ${searchParam}
          OR u.email ILIKE ${searchParam}
          OR u.phone ILIKE ${searchParam}
          OR st.subject ILIKE ${searchParam}
        )
      `);
    }

    const result =
      await pool.query(
        `
        SELECT
          st.id,
          st.ticket_number,
          st.user_id,
          st.subject,
          st.description,
          st.status,
          st.priority,
          st.connected_to_customer_care,
          st.created_at,
          st.updated_at,
          st.last_message_at,

          u.full_name AS customer_name,
          u.email AS customer_email,
          u.phone AS customer_phone,

          sc.name AS category_name

        FROM support_tickets st

        INNER JOIN users u
          ON u.id = st.user_id

        LEFT JOIN support_categories sc
          ON sc.id = st.category_id

        WHERE ${conditions.join(' AND ')}

        ORDER BY
          CASE st.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          st.created_at ASC

        LIMIT 300
        `,
        values
      );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error(
      'Get Customer Care available cases error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve available Customer Care cases.',
    });
  }
}


// ============================================================
// MY CASES
// GET /api/customer-care/tickets/mine
// ============================================================

async function getMyCases(req, res) {
  try {
    const agentId = getAgentId(req);

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message: 'Customer Care authentication required.',
      });
    }

    const result =
      await pool.query(
        `
        SELECT
          st.id,
          st.ticket_number,
          st.user_id,
          st.subject,
          st.description,
          st.status,
          st.priority,
          st.connected_to_customer_care,
          st.created_at,
          st.updated_at,
          st.waiting_since,
          st.customer_response_due_at,
          st.last_message_at,

          u.full_name AS customer_name,
          u.email AS customer_email,
          u.phone AS customer_phone,

          sc.name AS category_name

        FROM support_tickets st

        INNER JOIN users u
          ON u.id = st.user_id

        LEFT JOIN support_categories sc
          ON sc.id = st.category_id

        WHERE st.assigned_to = $1
          AND st.status != 'closed'

        ORDER BY st.updated_at DESC

        LIMIT 300
        `,
        [agentId]
      );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error(
      'Get Customer Care assigned cases error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve your Customer Care cases.',
    });
  }
}


// ============================================================
// TAKE / JOIN CASE
// POST /api/customer-care/tickets/:ticketId/take
// ============================================================

async function takeCase(req, res) {
  const agentId = getAgentId(req);

  if (!agentId) {
    return res.status(401).json({
      success: false,
      message: 'Customer Care authentication required.',
    });
  }

  const { ticketId } = req.params;

  if (!ticketId) {
    return res.status(400).json({
      success: false,
      message: 'Support ticket ID is required.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --------------------------------------------------------
    // Lock the ticket.
    //
    // This prevents two agents from taking the same case
    // simultaneously.
    // --------------------------------------------------------

    const ticketResult =
      await client.query(
        `
        SELECT
          st.id,
          st.ticket_number,
          st.status,
          st.assigned_to,
          st.connected_to_customer_care,
          st.user_id,

          u.full_name AS customer_name

        FROM support_tickets st

        INNER JOIN users u
          ON u.id = st.user_id

        WHERE st.id = $1

        FOR UPDATE
        `,
        [ticketId]
      );

    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Customer Care case not found.',
      });
    }

    const ticket =
      ticketResult.rows[0];

    // --------------------------------------------------------
    // Must have been connected by customer.
    // --------------------------------------------------------

    if (!ticket.connected_to_customer_care) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'This case has not been connected to Customer Care.',
      });
    }

    // --------------------------------------------------------
    // Already assigned.
    // --------------------------------------------------------

    if (ticket.assigned_to) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case has already been assigned to another Customer Care agent.',
      });
    }

    // --------------------------------------------------------
    // Agent information.
    // --------------------------------------------------------

    const agentResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          email
        FROM users
        WHERE id = $1
          AND role = 'customer_care'
          AND status = 'active'
        LIMIT 1
        `,
        [agentId]
      );

    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Active Customer Care agent account required.',
      });
    }

    const agent =
      agentResult.rows[0];

    // --------------------------------------------------------
    // Assign case.
    // --------------------------------------------------------

    const updatedResult =
      await client.query(
        `
        UPDATE support_tickets

        SET
          assigned_to = $2,
          status = 'in_progress',
          waiting_since = NULL,
          reminder_sent_at = NULL,
          customer_response_due_at = NULL,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = $1

        RETURNING *
        `,
        [
          ticketId,
          agentId,
        ]
      );

    // --------------------------------------------------------
    // Agent joined message.
    // --------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_messages (
        ticket_id,
        sender_user_id,
        sender_type,
        message,
        is_internal
      )
      VALUES (
        $1,
        $2,
        'agent',
        $3,
        FALSE
      )
      `,
      [
        ticketId,
        agentId,
        buildAgentJoinedMessage(
          agent.full_name
        ),
      ]
    );

    // --------------------------------------------------------
    // Audit event.
    // --------------------------------------------------------

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
        `Customer Care case assigned to ${agent.full_name}.`,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care case assigned successfully.',
      data: {
        ticket:
          updatedResult.rows[0],
        agent: {
          id: agent.id,
          name: agent.full_name,
          email: agent.email,
        },
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Take Customer Care case error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to take this Customer Care case.',
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

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message: 'Customer Care authentication required.',
      });
    }

    const { ticketId } = req.params;

    const result =
      await pool.query(
        `
        SELECT
          st.*,

          customer.full_name AS customer_name,
          customer.email AS customer_email,
          customer.phone AS customer_phone,
          customer.role AS customer_role,

          assigned.full_name AS assigned_agent_name,
          assigned.email AS assigned_agent_email,

          sc.name AS category_name,
          sc.description AS category_description

        FROM support_tickets st

        INNER JOIN users customer
          ON customer.id = st.user_id

        LEFT JOIN users assigned
          ON assigned.id = st.assigned_to

        LEFT JOIN support_categories sc
          ON sc.id = st.category_id

        WHERE st.id = $1

        LIMIT 1
        `,
        [ticketId]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer Care case not found.',
      });
    }

    const ticket =
      result.rows[0];

    // --------------------------------------------------------
    // Security:
    //
    // An agent can see:
    // - an unassigned Customer Care case
    // - a case assigned to them
    //
    // They cannot open another agent's private case unless
    // it is explicitly transferred later.
    // --------------------------------------------------------

    if (
      ticket.assigned_to &&
      ticket.assigned_to !== agentId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'This case is assigned to another Customer Care agent.',
      });
    }

    // --------------------------------------------------------
    // Conversation.
    // --------------------------------------------------------

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

          CASE
            WHEN sm.sender_type = 'assistant'
              THEN 'ZENIMONIES Support Assistant'

            ELSE sender.full_name
          END AS sender_name

        FROM support_messages sm

        LEFT JOIN users sender
          ON sender.id = sm.sender_user_id

        WHERE sm.ticket_id = $1
          AND sm.is_internal = FALSE

        ORDER BY sm.created_at ASC
        `,
        [ticketId]
      );

    // --------------------------------------------------------
    // Internal activity history.
    // --------------------------------------------------------

    const eventsResult =
      await pool.query(
        `
        SELECT
          ste.id,
          ste.ticket_id,
          ste.actor_user_id,
          ste.event_type,
          ste.old_value,
          ste.new_value,
          ste.note,
          ste.created_at,

          actor.full_name AS actor_name

        FROM support_ticket_events ste

        LEFT JOIN users actor
          ON actor.id = ste.actor_user_id

        WHERE ste.ticket_id = $1

        ORDER BY ste.created_at ASC
        `,
        [ticketId]
      );

    // --------------------------------------------------------
    // Transaction investigation.
    //
    // READ ONLY.
    //
    // We return only information needed by Customer Care.
    // No update operation is exposed.
    // --------------------------------------------------------

    let transaction = null;

    if (ticket.transaction_id) {
      const transactionResult =
        await pool.query(
          `
          SELECT
            id,
            reference,
            type,
            amount,
            currency,
            status,
            created_at
          FROM transactions
          WHERE id = $1
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
      data: {
        ticket,
        messages:
          messagesResult.rows,
        events:
          eventsResult.rows,
        transaction,
      },
    });

  } catch (error) {
    console.error(
      'Get Customer Care case details error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve Customer Care case.',
    });
  }
}


// ============================================================
// AGENT REPLY
// POST /api/customer-care/tickets/:ticketId/reply
// ============================================================

async function replyToCustomer(req, res) {
  const agentId = getAgentId(req);

  if (!agentId) {
    return res.status(401).json({
      success: false,
      message: 'Customer Care authentication required.',
    });
  }

  const { ticketId } = req.params;

  const {
    message,
  } = req.body || {};

  if (
    !message ||
    !message.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Message is required.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ticketResult =
      await client.query(
        `
        SELECT
          id,
          status,
          assigned_to
        FROM support_tickets
        WHERE id = $1
        FOR UPDATE
        `,
        [ticketId]
      );

    if (
      ticketResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Customer Care case not found.',
      });
    }

    const ticket =
      ticketResult.rows[0];

    if (
      ticket.assigned_to !== agentId
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'You are not assigned to this case.',
      });
    }

    if (
      ticket.status === 'closed'
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'This Customer Care case is closed.',
      });
    }

    const messageResult =
      await client.query(
        `
        INSERT INTO support_messages (
          ticket_id,
          sender_user_id,
          sender_type,
          message,
          is_internal
        )
        VALUES (
          $1,
          $2,
          'agent',
          $3,
          FALSE
        )
        RETURNING *
        `,
        [
          ticketId,
          agentId,
          message.trim(),
        ]
      );

    await client.query(
      `
      UPDATE support_tickets

      SET
        status = 'in_progress',
        last_message_at = CURRENT_TIMESTAMP,
        last_agent_message_at = CURRENT_TIMESTAMP,
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
        'agent_message',
        $3,
        'in_progress',
        'Customer Care agent replied to the customer.'
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Customer Care response sent.',
      data: messageResult.rows[0],
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Customer Care agent reply error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to send Customer Care response.',
    });

  } finally {
    client.release();
  }
}


// ============================================================
// WAITING FOR CUSTOMER
// PATCH /api/customer-care/tickets/:ticketId/waiting
// ============================================================

async function waitForCustomer(req, res) {
  try {
    const agentId = getAgentId(req);

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care authentication required.',
      });
    }

    const { ticketId } = req.params;

    const result =
      await startWaitingForCustomer({
        ticketId,
        agentId,
      });

    return res.status(200).json({
      success: true,
      message:
        'Case is now waiting for customer response.',
      data: result,
    });

  } catch (error) {
    console.error(
      'Wait for customer error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unable to place case into waiting status.',
    });
  }
}


// ============================================================
// RESOLVE CASE
// PATCH /api/customer-care/tickets/:ticketId/resolve
// ============================================================

async function resolveCase(req, res) {
  const agentId = getAgentId(req);

  if (!agentId) {
    return res.status(401).json({
      success: false,
      message:
        'Customer Care authentication required.',
    });
  }

  const { ticketId } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result =
      await client.query(
        `
        SELECT
          id,
          status,
          assigned_to
        FROM support_tickets
        WHERE id = $1
        FOR UPDATE
        `,
        [ticketId]
      );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Customer Care case not found.',
      });
    }

    const ticket =
      result.rows[0];

    if (
      ticket.assigned_to !== agentId
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'You are not assigned to this case.',
      });
    }

    await client.query(
      `
      UPDATE support_tickets

      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        waiting_since = NULL,
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
        'Customer Care agent resolved the case.'
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care case resolved.',
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Resolve Customer Care case error:',
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
  const agentId = getAgentId(req);

  if (!agentId) {
    return res.status(401).json({
      success: false,
      message:
        'Customer Care authentication required.',
    });
  }

  const { ticketId } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result =
      await client.query(
        `
        SELECT
          id,
          status,
          assigned_to
        FROM support_tickets
        WHERE id = $1
        FOR UPDATE
        `,
        [ticketId]
      );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Customer Care case not found.',
      });
    }

    const ticket =
      result.rows[0];

    if (
      ticket.assigned_to !== agentId
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'You are not assigned to this case.',
      });
    }

    await client.query(
      `
      UPDATE support_tickets

      SET
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP,
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
        'Customer Care agent closed the case.'
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care case closed.',
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Close Customer Care case error:',
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
};
