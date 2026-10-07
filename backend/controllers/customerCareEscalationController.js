const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE → ADMINISTRATION ESCALATION
//
// SECURITY RULES
// ------------------------------------------------------------
// Customer Care can:
//   - Forward an assigned case to Administration
//   - Provide an escalation reason
//
// Customer Care cannot:
//   - Give itself admin access
//   - Change balances
//   - Reverse transactions
//   - Change transaction status
//   - Approve KYC
//   - Suspend accounts
//
// Once Administration takes the case:
//   - Customer Care cannot reply
//   - Customer Care cannot resolve
//   - Customer Care cannot close
//   - Administration becomes responsible
// ============================================================


// ============================================================
// FORWARD CASE TO ADMINISTRATION
// ============================================================

async function escalateCaseToAdministration(req, res) {
  const client = await pool.connect();

  try {
    const agentId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    const { ticketId } = req.params;
    const reason = String(
      req.body?.reason || ''
    ).trim();

    if (!agentId) {
      return res.status(401).json({
        success: false,
        message: 'Customer Care authentication required',
      });
    }

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'An escalation reason is required',
      });
    }

    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a meaningful escalation reason',
      });
    }

    await client.query('BEGIN');

    // ----------------------------------------------------------
    // LOCK THE CASE
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
        closed_at
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
        message: 'Support case not found',
      });
    }

    const ticket = ticketResult.rows[0];

    // ----------------------------------------------------------
    // MUST BELONG TO THIS CUSTOMER CARE AGENT
    // ----------------------------------------------------------

    if (
      String(ticket.assigned_to) !==
      String(agentId)
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'You can only forward a case assigned to you',
      });
    }

    // ----------------------------------------------------------
    // CLOSED CASE
    // ----------------------------------------------------------

    if (ticket.status === 'closed') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Closed cases cannot be escalated',
      });
    }

    // ----------------------------------------------------------
    // ALREADY ESCALATED
    // ----------------------------------------------------------

    if (ticket.escalated_to_admin) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This case has already been forwarded to Administration',
      });
    }

    // ----------------------------------------------------------
    // VERIFY CUSTOMER CARE AGENT
    // ----------------------------------------------------------

    const agentResult = await client.query(
      `
      SELECT
        id,
        full_name,
        role,
        status
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message: 'Customer Care agent not found',
      });
    }

    const agent = agentResult.rows[0];

    if (agent.role !== 'customer_care') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Only Customer Care agents can escalate cases',
      });
    }

    if (agent.status !== 'active') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Your Customer Care account is not active',
      });
    }

    // ----------------------------------------------------------
    // ESCALATE
    //
    // We keep the existing ticket status system intact.
    // escalated_to_admin identifies the administrative queue.
    // ----------------------------------------------------------

    const updatedResult = await client.query(
      `
      UPDATE support_tickets
      SET
        escalated_to_admin = TRUE,
        escalated_at = NOW(),
        escalated_by = $1,
        escalation_reason = $2,

        -- Administration has not taken it yet.
        assigned_admin_id = NULL,
        admin_taken_at = NULL,

        updated_at = NOW()
      WHERE id = $3
      RETURNING
        id,
        ticket_number,
        status,
        escalated_to_admin,
        escalated_at,
        escalated_by,
        assigned_admin_id,
        admin_taken_at,
        escalation_reason
      `,
      [
        agentId,
        reason,
        ticketId,
      ]
    );

    const updatedTicket =
      updatedResult.rows[0];

    // ----------------------------------------------------------
    // CASE EVENT
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
        'case_escalated_to_admin',
        'customer_care',
        'administration',
        $3,
        NOW()
      )
      `,
      [
        ticketId,
        agentId,
        reason,
      ]
    );

    // ----------------------------------------------------------
    // CUSTOMER-FACING SYSTEM MESSAGE
    //
    // Do not expose the internal escalation reason.
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
        NULL,
        'assistant',
        $2,
        FALSE,
        NOW()
      )
      `,
      [
        ticketId,
        '🤖 ZENIMONIES Support Assistant\n\nYour case has been forwarded to our Administration team for further review. Your existing conversation has been retained, and the appropriate team will take charge of your case.',
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message:
        'Case successfully forwarded to Administration',
      ticket: updatedTicket,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Customer Care escalation error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to forward case to Administration',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  escalateCaseToAdministration,
};
