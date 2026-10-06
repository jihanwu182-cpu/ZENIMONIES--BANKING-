const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const {
  validateAndRefreshSession,
} = require('../services/sessionService');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE AUTHENTICATION MIDDLEWARE
// ============================================================
//
// Customer Care is deliberately separated from Admin.
//
// Allowed:
//   role = customer_care
//
// Not allowed:
//   role = admin
//   role = user
//
// This middleware protects Customer Care APIs only.
//
// IMPORTANT:
// Customer Care agents do NOT receive Admin Dashboard access.
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
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care authentication required.',
      });
    }

    const token =
      authHeader
        .substring(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication token is missing.',
      });
    }

    // ========================================================
    // JWT SECRET
    // ========================================================

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET is not configured.'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured.',
      });
    }

    // ========================================================
    // VERIFY JWT
    // ========================================================

    let decoded;

    try {
      decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );
    } catch (error) {
      console.error(
        'Customer Care JWT verification failed:',
        error?.message
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid or expired authentication token.',
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
        message:
          'Invalid authentication token.',
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
        code:
          'SESSION_REQUIRED',
        message:
          'Your session is no longer valid. Please sign in again.',
      });
    }

    // ========================================================
    // LOAD CUSTOMER CARE USER
    // ========================================================

    const result =
      await pool.query(
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

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          'Customer Care account could not be found.',
      });
    }

    const user =
      result.rows[0];

    // ========================================================
    // CUSTOMER CARE ROLE
    // ========================================================

    if (
      user.role !== 'customer_care'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Customer Care access required.',
      });
    }

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (
      user.status !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Customer Care account is not active.',
      });
    }

    // ========================================================
    // VALIDATE SERVER SESSION
    // ========================================================

    const session =
      await validateAndRefreshSession({
        userId,
        sessionId,
      });

    if (!session.valid) {
      if (
        session.reason ===
        'SESSION_EXPIRED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'SESSION_EXPIRED',
          message:
            'Your session has expired. Please sign in again.',
        });
      }

      if (
        session.reason ===
        'SESSION_REVOKED'
      ) {
        return res.status(401).json({
          success: false,
          code:
            'SESSION_REVOKED',
          message:
            'Your session has been ended. Please sign in again.',
        });
      }

      return res.status(401).json({
        success: false,
        code:
          'SESSION_INVALID',
        message:
          'Your session is no longer valid. Please sign in again.',
      });
    }

    // ========================================================
    // ATTACH CUSTOMER CARE USER
    // ========================================================

    req.user = user;

    req.userId =
      user.id;

    req.sessionId =
      sessionId;

    req.session =
      session;

    // ========================================================
    // CONTINUE
    // ========================================================

    return next();

  } catch (error) {
    console.error(
      'Customer Care authentication error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to authenticate Customer Care agent.',
    });
  }
};

module.exports =
  customerCareMiddleware;
