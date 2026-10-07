const pool = require('../config/database');
const { generateTicketNumber } = require('../utils/generateTicketNumber');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE SERVICE
// ============================================================
//
// CUSTOMER SUPPORT WORKFLOW
//
// Customer complaint
//      ↓
// Ticket created
//      ↓
// Automatic Support Assistant acknowledgement
//      ↓
// Customer chooses Customer Care
//      ↓
// Customer Care queue
//      ↓
// Agent takes case
//      ↓
// Customer ↔ Agent conversation
//      ↓
// Waiting for Customer
//      ↓
// Reminder
//      ↓
// Automatic closure if customer does not respond
//
// ESCALATION
//
// Customer Care
//      ↓
// Forward to Administration
//      ↓
// Administration queue
//      ↓
// Administrator takes case
//      ↓
// Administration owns case
//
// IMPORTANT SECURITY:
//
// Customer Care must NEVER receive:
// - full account numbers
// - account balances
// - available balances
// - ledger balances
// - balance_before
// - balance_after
// - PIN
// - password
// - OTP
// - CVV
// - session ID
//
// Transaction investigation is handled separately through
// secure database views.
// ============================================================


// ============================================================
// CONSTANTS
// ============================================================

const CUSTOMER_RESPONSE_TIMEOUT_HOURS =
  Number(
    process.env.SUPPORT_CUSTOMER_RESPONSE_TIMEOUT_HOURS ||
      24
  );

const CUSTOMER_RESPONSE_REMINDER_HOURS =
  Number(
    process.env.SUPPORT_CUSTOMER_REMINDER_HOURS ||
      12
  );


// ============================================================
// AUTOMATED ASSISTANT MESSAGES
// ============================================================

function buildInitialAssistantMessage(
  ticketNumber
) {
  return [
    '🤖 ZENIMONIES Support Assistant',
    '',
    'Thank you for contacting ZENIMONIES Customer Care. I have received your complaint and created your support case.',
    '',
    `Ticket ID: ${ticketNumber}`,
    '',
    "I'm unable to resolve this issue automatically.",
    '',
    'Would you like me to connect you with a Customer Care agent?',
  ].join('\n');
}


function buildConnectedAssistantMessage() {
  return [
    '🤖 ZENIMONIES Support Assistant',
    '',
    "Certainly. I've connected your case to Customer Care.",
    '',
    'A Customer Care agent will join this conversation shortly.',
  ].join('\n');
}


function buildReminderMessage() {
  return [
    '🤖 ZENIMONIES Support Assistant',
    '',
    "We haven't received a response from you yet.",
    '',
    'If you still need assistance, please reply to this conversation so our Customer Care team can continue helping you.',
  ].join('\n');
}


function buildAutoClosedMessage() {
  return [
    '🤖 ZENIMONIES Support Assistant',
    '',
    "This conversation has been closed because we haven't received a response from you within the required response period.",
    '',
    'If you still need assistance, please create a new Customer Care complaint.',
  ].join('\n');
}


function buildAgentJoinedMessage(
  agentName
) {
  return [
    `👤 ${agentName}`,
    '',
    'Customer Care Agent',
    '',
    `Hello, I'm ${agentName} from ZENIMONIES Customer Care. I've taken responsibility for your case and I'm reviewing your complaint now.`,
  ].join('\n');
}


// ============================================================
// GENERATE UNIQUE TICKET NUMBER
// ============================================================

async function generateUniqueTicketNumber(
  client
) {
  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const candidate =
      generateTicketNumber();

    const result =
      await client.query(
        `
        SELECT id
        FROM support_tickets
        WHERE ticket_number = $1
        LIMIT 1
        `,
        [candidate]
      );

    if (
      result.rows.length === 0
    ) {
      return candidate;
    }
  }

  throw new Error(
    'Unable to generate a unique support ticket number.'
  );
}


// ============================================================
// CREATE CUSTOMER COMPLAINT
// ============================================================

async function createTicket({
  userId,
  categoryId,
  subject,
  description,
  priority = 'normal',
}) {
  if (!userId) {
    throw new Error(
      'Customer ID is required.'
    );
  }

  if (
    !subject ||
    !subject.trim()
  ) {
    throw new Error(
      'Support ticket subject is required.'
    );
  }

  if (
    !description ||
    !description.trim()
  ) {
    throw new Error(
      'Support ticket description is required.'
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    // --------------------------------------------------------
    // Validate category
    // --------------------------------------------------------

    if (categoryId) {
      const categoryResult =
        await client.query(
          `
          SELECT id
          FROM support_categories
          WHERE id = $1
            AND is_active = TRUE
          LIMIT 1
          `,
          [categoryId]
        );

      if (
        categoryResult.rows.length ===
        0
      ) {
        throw new Error(
          'Invalid support category.'
        );
      }
    }

    // --------------------------------------------------------
    // Ticket number
    // --------------------------------------------------------

    const ticketNumber =
      await generateUniqueTicketNumber(
        client
      );

    // --------------------------------------------------------
    // Create ticket
    //
    // IMPORTANT:
    // Customer does NOT provide transaction_id here.
    // Transaction references are requested securely later
    // when required by Customer Care.
    // --------------------------------------------------------

    const ticketResult =
      await client.query(
        `
        INSERT INTO support_tickets (
          ticket_number,
          user_id,
          category_id,
          subject,
          description,
          status,
          priority,
          transaction_id,
          connected_to_customer_care,
          last_message_at,
          last_customer_message_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'open',
          $6,
          NULL,
          FALSE,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
        `,
        [
          ticketNumber,
          userId,
          categoryId || null,
          subject.trim(),
          description.trim(),
          priority,
        ]
      );

    const ticket =
      ticketResult.rows[0];

    // --------------------------------------------------------
    // Customer complaint message
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
        'customer',
        $3,
        FALSE
      )
      `,
      [
        ticket.id,
        userId,
        description.trim(),
      ]
    );

    // --------------------------------------------------------
    // Automatic assistant acknowledgement
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
        NULL,
        'assistant',
        $2,
        FALSE
      )
      `,
      [
        ticket.id,
        buildInitialAssistantMessage(
          ticket.ticket_number
        ),
      ]
    );

    // --------------------------------------------------------
    // Ticket event
    // --------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        new_value,
        note
      )
      VALUES (
        $1,
        $2,
        'ticket_created',
        'open',
        'Customer created a Customer Care complaint.'
      )
      `,
      [
        ticket.id,
        userId,
      ]
    );

    // --------------------------------------------------------
    // Assistant event
    // --------------------------------------------------------

    await client.query(
      `
      INSERT INTO support_ticket_events (
        ticket_id,
        actor_user_id,
        event_type,
        new_value,
        note
      )
      VALUES (
        $1,
        NULL,
        'assistant_acknowledgement',
        'assistant',
        'ZENIMONIES Support Assistant automatically acknowledged the complaint.'
      )
      `,
      [ticket.id]
    );

    await client.query(
      'COMMIT'
    );

    return ticket;
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}


// ============================================================
// GET CUSTOMER TICKETS
// ============================================================

async function getCustomerTickets(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT
        st.*,

        sc.name AS category_name,

        assigned_user.full_name
          AS assigned_agent_name,

        escalated_user.full_name
          AS escalated_by_name,

        assigned_admin.full_name
          AS assigned_admin_name

      FROM support_tickets st

      LEFT JOIN support_categories sc
        ON sc.id = st.category_id

      LEFT JOIN users assigned_user
        ON assigned_user.id =
           st.assigned_to

      LEFT JOIN users escalated_user
        ON escalated_user.id =
           st.escalated_by

      LEFT JOIN users assigned_admin
        ON assigned_admin.id =
           st.assigned_admin_id

      WHERE st.user_id = $1

      ORDER BY
        st.created_at DESC
      `,
      [userId]
    );

  return result.rows;
}


// ============================================================
// GET CUSTOMER TICKET
// ============================================================

async function getCustomerTicket(
  userId,
  ticketId
) {
  const ticketResult =
    await pool.query(
      `
      SELECT
        st.*,

        sc.name AS category_name,

        assigned_user.full_name
          AS assigned_agent_name,

        escalated_user.full_name
          AS escalated_by_name,

        assigned_admin.full_name
          AS assigned_admin_name

      FROM support_tickets st

      LEFT JOIN support_categories sc
        ON sc.id = st.category_id

      LEFT JOIN users assigned_user
        ON assigned_user.id =
           st.assigned_to

      LEFT JOIN users escalated_user
        ON escalated_user.id =
           st.escalated_by

      LEFT JOIN users assigned_admin
        ON assigned_admin.id =
           st.assigned_admin_id

      WHERE
        st.id = $1
        AND st.user_id = $2

      LIMIT 1
      `,
      [
        ticketId,
        userId,
      ]
    );

  if (
    ticketResult.rows.length ===
    0
  ) {
    return null;
  }

  const ticket =
    ticketResult.rows[0];

  // ----------------------------------------------------------
  // Customer-visible conversation only
  // ----------------------------------------------------------
  //
  // Internal messages are NEVER returned to the customer.
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
        sm.is_internal,
        sm.created_at,

        CASE
          WHEN sm.sender_type = 'assistant'
            THEN 'ZENIMONIES Support Assistant'

          WHEN sm.sender_type = 'customer'
            THEN customer.full_name

          WHEN sm.sender_type = 'agent'
            THEN agent.full_name

          WHEN sm.sender_type = 'admin'
            THEN admin_user.full_name

          ELSE COALESCE(
            agent.full_name,
            admin_user.full_name,
            customer.full_name
          )
        END AS sender_name

      FROM support_messages sm

      LEFT JOIN users customer
        ON customer.id =
           sm.sender_user_id
       AND sm.sender_type =
           'customer'

      LEFT JOIN users agent
        ON agent.id =
           sm.sender_user_id
       AND sm.sender_type =
           'agent'

      LEFT JOIN users admin_user
        ON admin_user.id =
           sm.sender_user_id
       AND sm.sender_type =
           'admin'

      WHERE
        sm.ticket_id = $1
        AND sm.is_internal = FALSE

      ORDER BY
        sm.created_at ASC
      `,
      [ticketId]
    );

  return {
    ...ticket,

    messages:
      messagesResult.rows,
  };
}


// ============================================================
// CUSTOMER CONNECTS TO CUSTOMER CARE
// ============================================================

async function connectToCustomerCare({
  userId,
  ticketId,
}) {
  if (!userId) {
    throw new Error(
      'Customer ID is required.'
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const ticketResult =
      await client.query(
        `
        SELECT
          id,
          ticket_number,
          status,
          connected_to_customer_care,
          escalated_to_admin

        FROM support_tickets

        WHERE
          id = $1
          AND user_id = $2

        FOR UPDATE
        `,
        [
          ticketId,
          userId,
        ]
      );

    if (
      ticketResult.rows.length ===
      0
    ) {
      throw new Error(
        'Support ticket not found.'
      );
    }

    const ticket =
      ticketResult.rows[0];

    if (
      ticket.status ===
      'closed'
    ) {
      throw new Error(
        'This support ticket is closed.'
      );
    }

    // --------------------------------------------------------
    // Already escalated
    //
    // Customer does not need to "connect" again.
    // Administration is already handling the case.
    // --------------------------------------------------------

    if (
      ticket.escalated_to_admin
    ) {
      await client.query(
        'COMMIT'
      );

      return ticket;
    }

    if (
      ticket.connected_to_customer_care
    ) {
      await client.query(
        'COMMIT'
      );

      return ticket;
    }

    // --------------------------------------------------------
    // Connect to Customer Care
    // --------------------------------------------------------

    const updatedTicketResult =
      await client.query(
        `
        UPDATE support_tickets

        SET
          connected_to_customer_care =
            TRUE,

          status =
            'pending',

          waiting_since =
            NULL,

          reminder_sent_at =
            NULL,

          customer_response_due_at =
            NULL,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $1

        RETURNING *
        `,
        [ticketId]
      );

    // --------------------------------------------------------
    // Assistant message
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
        NULL,
        'assistant',
        $2,
        FALSE
      )
      `,
      [
        ticketId,
        buildConnectedAssistantMessage(),
      ]
    );

    // --------------------------------------------------------
    // Event
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
        'customer_connected_to_care',
        $3,
        'pending',
        'Customer requested connection to Customer Care.'
      )
      `,
      [
        ticketId,
        userId,
        ticket.status,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return updatedTicketResult.rows[0];
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}


// ============================================================
// CUSTOMER SENDS MESSAGE
// ============================================================

async function addCustomerMessage({
  userId,
  ticketId,
  message,
}) {
  if (
    !message ||
    !message.trim()
  ) {
    throw new Error(
      'Message is required.'
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const ticketResult =
      await client.query(
        `
        SELECT
          id,
          status,
          assigned_to,
          connected_to_customer_care,
          escalated_to_admin,
          assigned_admin_id

        FROM support_tickets

        WHERE
          id = $1
          AND user_id = $2

        FOR UPDATE
        `,
        [
          ticketId,
          userId,
        ]
      );

    if (
      ticketResult.rows.length ===
      0
    ) {
      throw new Error(
        'Support ticket not found.'
      );
    }

    const ticket =
      ticketResult.rows[0];

    if (
      ticket.status ===
      'closed'
    ) {
      throw new Error(
        'This support ticket is closed.'
      );
    }

    // --------------------------------------------------------
    // IMPORTANT:
    //
    // If Administration has taken the case, the customer's
    // reply must remain with Administration.
    //
    // Never move it back to Customer Care.
    // --------------------------------------------------------

    let newStatus;

    if (
      ticket.escalated_to_admin
    ) {
      newStatus =
        ticket.status ===
          'resolved'
          ? 'in_progress'
          : ticket.status ===
              'pending'
            ? 'in_progress'
            : ticket.status;
    } else {
      newStatus =
        ticket.status ===
          'resolved'
          ? 'open'
          : ticket.status ===
              'pending'
            ? 'in_progress'
            : ticket.status;
    }

    // --------------------------------------------------------
    // Customer message
    // --------------------------------------------------------

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
          'customer',
          $3,
          FALSE
        )
        RETURNING *
        `,
        [
          ticketId,
          userId,
          message.trim(),
        ]
      );

    // --------------------------------------------------------
    // Customer response resets timeout.
    //
    // This is correct whether the case is with Customer Care
    // or Administration.
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE support_tickets

      SET
        status = $2,

        last_message_at =
          CURRENT_TIMESTAMP,

        last_customer_message_at =
          CURRENT_TIMESTAMP,

        waiting_since =
          NULL,

        reminder_sent_at =
          NULL,

        customer_response_due_at =
          NULL,

        auto_closed_at =
          NULL,

        auto_close_reason =
          NULL,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = $1
      `,
      [
        ticketId,
        newStatus,
      ]
    );

    // --------------------------------------------------------
    // Event
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
        'customer_message',
        $3,
        $4,
        'Customer replied to the support case.'
      )
      `,
      [
        ticketId,
        userId,
        ticket.status,
        newStatus,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return messageResult.rows[0];
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}


// ============================================================
// BEGIN WAITING FOR CUSTOMER
// ============================================================

async function startWaitingForCustomer({
  ticketId,
  agentId,
}) {
  if (!agentId) {
    throw new Error(
      'Agent ID is required.'
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const result =
      await client.query(
        `
        SELECT
          id,
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

    if (
      result.rows.length ===
      0
    ) {
      throw new Error(
        'Support ticket not found.'
      );
    }

    const ticket =
      result.rows[0];

    // --------------------------------------------------------
    // Administration owns escalated cases.
    // --------------------------------------------------------

    if (
      ticket.escalated_to_admin
    ) {
      throw new Error(
        'This case has been forwarded to Administration.'
      );
    }

    if (
      String(ticket.assigned_to) !==
      String(agentId)
    ) {
      throw new Error(
        'You are not assigned to this case.'
      );
    }

    if (
      ticket.status ===
      'closed'
    ) {
      throw new Error(
        'This support case is closed.'
      );
    }

    const now =
      new Date();

    const reminderAt =
      new Date(
        now.getTime() +
          CUSTOMER_RESPONSE_REMINDER_HOURS *
            60 *
            60 *
            1000
      );

    const responseDueAt =
      new Date(
        now.getTime() +
          CUSTOMER_RESPONSE_TIMEOUT_HOURS *
            60 *
            60 *
            1000
      );

    await client.query(
      `
      UPDATE support_tickets

      SET
        status =
          'pending',

        waiting_since =
          CURRENT_TIMESTAMP,

        reminder_sent_at =
          NULL,

        customer_response_due_at =
          $2,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = $1
      `,
      [
        ticketId,
        responseDueAt,
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
        'Customer Care agent is waiting for a customer response.'
      )
      `,
      [
        ticketId,
        agentId,
        ticket.status,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return {
      success: true,
      reminderAt,
      responseDueAt,
    };
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}


// ============================================================
// SEND AUTOMATIC REMINDER
// ============================================================

async function sendCustomerResponseReminder(
  ticketId
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const result =
      await client.query(
        `
        SELECT
          id,
          status,
          reminder_sent_at,
          waiting_since,
          customer_response_due_at,
          escalated_to_admin,
          assigned_admin_id

        FROM support_tickets

        WHERE id = $1

        FOR UPDATE
        `,
        [ticketId]
      );

    if (
      result.rows.length ===
      0
    ) {
      throw new Error(
        'Support ticket not found.'
      );
    }

    const ticket =
      result.rows[0];

    if (
      ticket.status !==
      'pending'
    ) {
      await client.query(
        'COMMIT'
      );

      return {
        sent: false,
        reason:
          'Ticket is not waiting for customer.',
      };
    }

    if (
      ticket.reminder_sent_at
    ) {
      await client.query(
        'COMMIT'
      );

      return {
        sent: false,
        reason:
          'Reminder already sent.',
      };
    }

    // --------------------------------------------------------
    // The reminder may be used for both Customer Care and
    // Administration cases.
    //
    // It is a neutral automated reminder.
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
        NULL,
        'assistant',
        $2,
        FALSE
      )
      `,
      [
        ticketId,
        buildReminderMessage(),
      ]
    );

    await client.query(
      `
      UPDATE support_tickets

      SET
        reminder_sent_at =
          CURRENT_TIMESTAMP,

        updated_at =
          CURRENT_TIMESTAMP

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
        new_value,
        note
      )
      VALUES (
        $1,
        NULL,
        'customer_response_reminder',
        'reminder_sent',
        'Automatic reminder sent because the customer has not responded.'
      )
      `,
      [ticketId]
    );

    await client.query(
      'COMMIT'
    );

    return {
      sent: true,
    };
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}


// ============================================================
// AUTOMATICALLY CLOSE CUSTOMER CASE
// ============================================================

async function autoCloseInactiveTicket(
  ticketId
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const result =
      await client.query(
        `
        SELECT
          id,
          status,
          customer_response_due_at,
          escalated_to_admin,
          assigned_admin_id

        FROM support_tickets

        WHERE id = $1

        FOR UPDATE
        `,
        [ticketId]
      );

    if (
      result.rows.length ===
      0
    ) {
      throw new Error(
        'Support ticket not found.'
      );
    }

    const ticket =
      result.rows[0];

    if (
      ticket.status !==
      'pending'
    ) {
      await client.query(
        'COMMIT'
      );

      return {
        closed: false,
        reason:
          'Ticket is no longer waiting for customer.',
      };
    }

    if (
      !ticket.customer_response_due_at ||
      new Date(
        ticket.customer_response_due_at
      ) > new Date()
    ) {
      await client.query(
        'COMMIT'
      );

      return {
        closed: false,
        reason:
          'Customer response period has not expired.',
      };
    }

    // --------------------------------------------------------
    // Automatic closure message
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
        NULL,
        'assistant',
        $2,
        FALSE
      )
      `,
      [
        ticketId,
        buildAutoClosedMessage(),
      ]
    );

    // --------------------------------------------------------
    // Close case
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE support_tickets

      SET
        status =
          'closed',

        auto_closed_at =
          CURRENT_TIMESTAMP,

        auto_close_reason =
          'Customer did not respond within the required response period.',

        updated_at =
          CURRENT_TIMESTAMP,

        closed_at =
          CURRENT_TIMESTAMP

      WHERE id = $1
      `,
      [ticketId]
    );

    // --------------------------------------------------------
    // Audit event
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
        NULL,
        'automatic_closure',
        'pending',
        'closed',
        'Case automatically closed because the customer did not respond within the required response period.'
      )
      `,
      [ticketId]
    );

    await client.query(
      'COMMIT'
    );

    return {
      closed: true,
    };
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createTicket,
  getCustomerTickets,
  getCustomerTicket,
  connectToCustomerCare,
  addCustomerMessage,
  startWaitingForCustomer,
  sendCustomerResponseReminder,
  autoCloseInactiveTicket,
  buildAgentJoinedMessage,
};
