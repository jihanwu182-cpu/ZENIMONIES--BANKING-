const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const {
  validateAndRefreshSession,
} = require('../services/sessionService');


// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
//
// Responsibilities:
//
// 1. Validate the Bearer JWT.
// 2. Read the user ID and session ID.
// 3. Confirm the user still exists.
// 4. Confirm the account is active.
// 5. Confirm the server-side session is still active.
// 6. Refresh the 5-minute inactivity timer.
//
// IMPORTANT:
//
// The JWT alone is NOT enough to authenticate a request.
//
// The auth_sessions database record is also required.
// This allows Zenimonies to lock an inactive account after
// 5 minutes without activity.
// ============================================================

const authMiddleware = async (
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
          'Authentication token is required',
      });
    }


    // ========================================================
    // EXTRACT TOKEN
    // ========================================================

    const token =
      authHeader
        .substring(7)
        .trim();


    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication token is required',
      });
    }


    // ========================================================
    // JWT SECRET
    // ========================================================

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured',
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

      return res.status(401).json({
        success: false,
        message:
          'Invalid or expired authentication token',
      });
    }


    // ========================================================
    // EXTRACT USER ID
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
          'Invalid authentication token',
      });
    }


    // ========================================================
    // EXTRACT SESSION ID
    // ========================================================

    const sessionId =
      decoded?.sessionId ||
      decoded?.session_id ||
      decoded?.sid;


    // --------------------------------------------------------
    // Sessions are now required for authenticated requests.
    // --------------------------------------------------------

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
    // LOAD USER
    // ========================================================

    const userResult =
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


    if (
      userResult.rows.length === 0
    ) {

      return res.status(401).json({
        success: false,
        message:
          'User account could not be found',
      });
    }


    const user =
      userResult.rows[0];


    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (
      user.status &&
      user.status !== 'active'
    ) {

      return res.status(403).json({
        success: false,
        message:
          'Your account is not active',
      });
    }


    // ========================================================
    // VALIDATE SERVER SESSION
    // ========================================================
    //
    // This checks whether the user has been inactive for
    // more than 5 minutes.
    //
    // If valid:
    //     inactivity timer is refreshed.
    //
    // If expired:
    //     request is rejected.
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
            'Your account has been locked because there was no activity for 5 minutes. Please unlock your account to continue.',
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
    // ATTACH AUTHENTICATED USER
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

    next();

  } catch (error) {

    console.error(
      'Authentication middleware error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Authentication service temporarily unavailable',
    });
  }
};


module.exports =
  authMiddleware;
