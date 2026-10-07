const jwt = require('jsonwebtoken');

const pool = require('../config/database');

const {
  validateAndRefreshSession,
} = require('../services/sessionService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE AUTHENTICATION MIDDLEWARE
//
// Only users with:
//   role = customer_care
//
// can access /api/customer-care/*
//
// Customer Care is NOT Admin.
// ============================================================

const customerCareMiddleware = async (
  req,
  res,
  next
) => {
  try {
    // ========================================================
    // AUTHORIZATION HEADER
    // ========================================================

    const authHeader =
      req.headers.authorization || '';

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // ========================================================
    // VERIFY JWT
    // ========================================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session.',
      });
    }

    // ========================================================
    // USER ID
    // ========================================================

    const userId =
      decoded?.userId ||
      decoded?.id ||
      decoded?.user_id ||
      decoded?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // ========================================================
    // SESSION ID
    // ========================================================

    const sessionId =
      decoded?.sessionId ||
      decoded?.session_id ||
      decoded?.sid;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Secure session required.',
      });
    }

    // ========================================================
    // LOAD USER
    // ========================================================

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const user = userResult.rows[0];

    // ========================================================
    // CUSTOMER CARE ROLE CHECK
    // ========================================================

    if (
      String(user.role || '')
        .trim()
        .toLowerCase() !== 'customer_care'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Customer Care access is restricted to authorized Customer Care agents.',
      });
    }

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (
      String(user.status || '')
        .trim()
        .toLowerCase() !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active.',
      });
    }

    // ========================================================
    // SERVER SESSION VALIDATION
    // ========================================================

    const session =
      await validateAndRefreshSession({
        userId,
        sessionId,
      });

    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          'Your secure session has expired. Please log in again.',
      });
    }

    // ========================================================
    // ATTACH AUTHENTICATED USER
    // ========================================================

    req.user = user;
    req.userId = user.id;
    req.sessionId = sessionId;
    req.session = session;

    next();
  } catch (error) {
    console.error(
      'Customer Care authentication error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Customer Care authentication failed.',
    });
  }
};

module.exports =
  customerCareMiddleware;
