const pool = require('../config/database');

const {
  createTicket,
  getCustomerTickets,
  getCustomerTicket,
  connectToCustomerCare,
  addCustomerMessage,
} = require('../services/supportService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE CONTROLLER
// ============================================================
//
// Customer workflow:
//
// Complaint
//    ↓
// Ticket ID generated
//    ↓
// Automatic Support Assistant response
//    ↓
// Customer chooses "Connect me to Customer Care"
//    ↓
// Customer Care queue
//    ↓
// Authorized Customer Care agent takes case
//    ↓
// Agent/customer conversation
//
// IMPORTANT:
// Customer does NOT provide:
// - Transaction ID on initial complaint
// - Session ID
// - Password
// - PIN
// - OTP
// - CVV
// ============================================================


// ============================================================
// GET AUTHENTICATED CUSTOMER ID
// ============================================================

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id
  );
}


// ============================================================
// CREATE SUPPORT TICKET
// POST /api/support/tickets
// ============================================================

async function createSupportTicket(req, res) {
  try {
    const userId =
      getAuthenticatedUserId(req);

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
    } = req.body || {};

    // --------------------------------------------------------
    // Customer-facing complaint creation intentionally does
    // NOT accept transaction_id.
    //
    // If the complaint concerns a transaction, the Customer
    // Care agent can request the transaction reference later
    // inside the secure conversation.
    // --------------------------------------------------------

    const ticket =
      await createTicket({
        userId,
        categoryId: category_id,
        subject,
        description,
        priority:
          priority || 'normal',
      });

    return res.status(201).json({
      success: true,
      message:
        'Your complaint has been received and your Customer Care case has been created.',
      data: ticket,
    });
  } catch (error) {
    console.error(
      'Create Customer Care ticket error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unable to create Customer Care case.',
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
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const tickets =
      await getCustomerTickets(userId);

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error(
      'Get Customer Care tickets error:',
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
// GET SINGLE CUSTOMER TICKET
// GET /api/support/tickets/:ticketId
// ============================================================

async function getSupportTicket(req, res) {
  try {
    const userId =
      getAuthenticatedUserId(req);

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
          'Customer Care case not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error(
      'Get Customer Care ticket error:',
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
// CUSTOMER CONNECTS TO CUSTOMER CARE
// POST /api/support/tickets/:ticketId/connect
// ============================================================

async function connectCustomerToCare(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(req);

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
      await connectToCustomerCare({
        userId,
        ticketId,
      });

    return res.status(200).json({
      success: true,
      message:
        'Your case has been connected to Customer Care.',
      data: ticket,
    });
  } catch (error) {
    console.error(
      'Connect customer to Customer Care error:',
      error
    );

    let statusCode = 400;

    if (
      error.message ===
      'Support ticket not found.'
    ) {
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        'Unable to connect your case to Customer Care.',
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
      getAuthenticatedUserId(req);

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
      'Customer Care reply error:',
      error
    );

    let statusCode = 400;

    if (
      error.message ===
      'Support ticket not found.'
    ) {
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        'Unable to send message.',
    });
  }
}


// ============================================================
// GET SUPPORT CATEGORIES
// GET /api/support/categories
// ============================================================

async function listSupportCategories(
  req,
  res
) {
  try {
    const result =
      await pool.query(
        `
          SELECT
            id,
            name,
            description
          FROM support_categories
          WHERE is_active = TRUE
          ORDER BY name ASC
        `
      );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      'Get Customer Care categories error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load Customer Care categories.',
    });
  }
}


// ============================================================
// CUSTOMER CARE HEALTH CHECK
// GET /api/support/health
// ============================================================

function supportHealth(req, res) {
  return res.status(200).json({
    success: true,
    service: 'customer-care',
    status: 'ready',
  });
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  connectCustomerToCare,
  replyToSupportTicket,
  listSupportCategories,
  supportHealth,
};
