const {
  createTicket,
  getCustomerTickets,
  getCustomerTicket,
  addCustomerMessage,
} = require('../services/supportService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER SUPPORT CONTROLLER
// ============================================================

// ============================================================
// CREATE SUPPORT TICKET
// POST /api/support/tickets
// ============================================================

async function createSupportTicket(req, res) {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      category_id,
      subject,
      description,
      priority,
      transaction_id,
    } = req.body || {};

    const ticket =
      await createTicket({
        userId,
        categoryId: category_id,
        subject,
        description,
        priority: priority || 'normal',
        transactionId: transaction_id || null,
      });

    return res.status(201).json({
      success: true,
      message:
        'Support ticket created successfully.',
      data: ticket,
    });
  } catch (error) {
    console.error(
      'Create support ticket error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unable to create support ticket.',
    });
  }
}

// ============================================================
// GET CUSTOMER TICKETS
// GET /api/support/tickets
// ============================================================

async function listSupportTickets(req, res) {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const tickets =
      await getCustomerTickets(
        userId
      );

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error(
      'Get support tickets error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve support tickets.',
    });
  }
}

// ============================================================
// GET SINGLE CUSTOMER TICKET
// GET /api/support/tickets/:ticketId
// ============================================================

async function getSupportTicket(req, res) {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId;

    const {
      ticketId,
    } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message:
          'Support ticket ID is required.',
      });
    }

    const ticket =
      await getCustomerTicket(
        userId,
        ticketId
      );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message:
          'Support ticket not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error(
      'Get support ticket error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve support ticket.',
    });
  }
}

// ============================================================
// CUSTOMER REPLY
// POST /api/support/tickets/:ticketId/messages
// ============================================================

async function replyToSupportTicket(
  req,
  res
) {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId;

    const {
      ticketId,
    } = req.params;

    const {
      message,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message:
          'Support ticket ID is required.',
      });
    }

    if (
      !message ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Message is required.',
      });
    }

    const newMessage =
      await addCustomerMessage({
        userId,
        ticketId,
        message,
      });

    return res.status(201).json({
      success: true,
      message:
        'Message sent successfully.',
      data: newMessage,
    });
  } catch (error) {
    console.error(
      'Reply to support ticket error:',
      error
    );

    const statusCode =
      error.message ===
      'Support ticket not found.'
        ? 404
        : error.message ===
          'This support ticket is closed.'
        ? 400
        : 400;

    return res.status(
      statusCode
    ).json({
      success: false,
      message:
        error.message ||
        'Unable to send message.',
    });
  }
}

// ============================================================
// HEALTH CHECK
// GET /api/support/health
// ============================================================

function supportHealth(req, res) {
  return res.status(200).json({
    success: true,
    service: 'customer-support',
    status: 'ready',
  });
}

module.exports = {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  replyToSupportTicket,
  supportHealth,
};
