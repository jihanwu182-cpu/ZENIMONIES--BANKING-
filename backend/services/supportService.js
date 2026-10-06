const pool = require('../config/database');

const {
  generateTicketNumber,
} = require('../utils/generateTicketNumber');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER SUPPORT SERVICE
// ============================================================

async function createTicket({
  userId,
  categoryId,
  subject,
  description,
  priority = 'normal',
  transactionId = null,
}) {
  if (!userId) {
    throw new Error(
      'Customer ID is required.'
    );
  }

  if (!subject || !subject.trim()) {
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

    let ticketNumber;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate =
        generateTicketNumber();

      const existing =
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
        existing.rows.length === 0
      ) {
        ticketNumber =
          candidate;
        break;
      }
    }

    if (!ticketNumber) {
      throw new Error(
        'Unable to generate a unique support ticket number.'
      );
    }

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
          last_message_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'open',
          $6,
          $7,
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
          transactionId || null,
        ]
      );

    const ticket =
      ticketResult.rows[0];

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
        'Customer created support ticket.'
      )
      `,
      [
        ticket.id,
        userId,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return ticket;
  } catch (error) {
    await client.query(
      'ROLLBACK'
    );

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
        sc.name AS category_name
      FROM support_tickets st
      LEFT JOIN support_categories sc
        ON sc.id = st.category_id
      WHERE st.user_id = $1
      ORDER BY st.created_at DESC
      `,
      [userId]
    );

  return result.rows;
}

// ============================================================
// GET SINGLE CUSTOMER TICKET
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
        sc.name AS category_name
      FROM support_tickets st
      LEFT JOIN support_categories sc
        ON sc.id = st.category_id
      WHERE st.id = $1
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
        sm.created_at
      FROM support_messages sm
      WHERE sm.ticket_id = $1
        AND sm.is_internal = FALSE
      ORDER BY sm.created_at ASC
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
// CUSTOMER REPLY
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
          status
        FROM support_tickets
        WHERE id = $1
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

    await client.query(
      `
      UPDATE support_tickets
      SET
        status = CASE
          WHEN status = 'resolved'
            THEN 'open'
          ELSE status
        END,
        last_message_at = CURRENT_TIMESTAMP,
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
        'customer_message',
        $3,
        NULL,
        'Customer replied to support ticket.'
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

    return messageResult.rows[0];
  } catch (error) {
    await client.query(
      'ROLLBACK'
    );

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createTicket,
  getCustomerTickets,
  getCustomerTicket,
  addCustomerMessage,
};
