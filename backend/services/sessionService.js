const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');

// ============================================================
// SESSION CONFIGURATION
// ============================================================

const INACTIVITY_TIMEOUT_MINUTES = 5;

// JWT can remain longer-lived.
// The database session is what enforces the 5-minute
// inactivity lock.
const JWT_EXPIRY = '24h';


// ============================================================
// HASH SESSION ID
// ============================================================

const hashSessionId = (sessionId) => {
  return crypto
    .createHash('sha256')
    .update(String(sessionId))
    .digest('hex');
};


// ============================================================
// CREATE AUTHENTICATION SESSION
// ============================================================

const createAuthSession = async (user) => {

  if (!user?.id) {
    throw new Error(
      'User ID is required to create an authentication session'
    );
  }

  if (!user?.role) {
    throw new Error(
      'User role is required to create an authentication session'
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is not configured'
    );
  }


  // ----------------------------------------------------------
  // Generate unique server-side session ID
  // ----------------------------------------------------------

  const sessionId =
    crypto.randomUUID();


  const sessionTokenHash =
    hashSessionId(sessionId);


  // ----------------------------------------------------------
  // Session expiry
  // ----------------------------------------------------------

  const expiresAt =
    new Date(
      Date.now() +
      INACTIVITY_TIMEOUT_MINUTES *
      60 *
      1000
    );


  // ----------------------------------------------------------
  // Store session
  // ----------------------------------------------------------

  await pool.query(
    `
    INSERT INTO auth_sessions (
      user_id,
      session_token_hash,
      last_activity_at,
      expires_at
    )
    VALUES (
      $1,
      $2,
      CURRENT_TIMESTAMP,
      $3
    )
    `,
    [
      user.id,
      sessionTokenHash,
      expiresAt,
    ]
  );


  // ----------------------------------------------------------
  // Create JWT
  // ----------------------------------------------------------

  const token =
    jwt.sign(
      {
        userId: user.id,
        role: user.role,
        sessionId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
      }
    );


  return {
    token,
    sessionId,
    expiresAt,
  };
};


// ============================================================
// VALIDATE AND REFRESH SESSION
// ============================================================
//
// Called by authentication middleware.
//
// Every valid authenticated request updates the session's
// inactivity timer.
//
// Example:
//
// Request at 10:00
// → expires at 10:05
//
// Request at 10:03
// → expires at 10:08
//
// No request after 10:03
// → locked at 10:08
// ============================================================

const validateAndRefreshSession = async ({
  userId,
  sessionId,
}) => {

  if (!userId || !sessionId) {
    return {
      valid: false,
      reason: 'SESSION_REQUIRED',
    };
  }


  const sessionResult =
    await pool.query(
      `
      SELECT
        id,
        user_id,
        last_activity_at,
        expires_at,
        revoked_at
      FROM auth_sessions
      WHERE user_id = $1
        AND session_token_hash = $2
      LIMIT 1
      `,
      [
        userId,
        hashSessionId(sessionId),
      ]
    );


  if (
    sessionResult.rows.length === 0
  ) {
    return {
      valid: false,
      reason: 'SESSION_NOT_FOUND',
    };
  }


  const session =
    sessionResult.rows[0];


  // ----------------------------------------------------------
  // Revoked session
  // ----------------------------------------------------------

  if (session.revoked_at) {
    return {
      valid: false,
      reason: 'SESSION_REVOKED',
    };
  }


  // ----------------------------------------------------------
  // Inactivity timeout
  // ----------------------------------------------------------

  const now =
    Date.now();

  const expiresAt =
    new Date(
      session.expires_at
    ).getTime();

if (now >= expiresAt) {

  return {
    valid: false,
    reason: 'SESSION_EXPIRED',
  };
}
  

  // ----------------------------------------------------------
  // Refresh inactivity timer
  // ----------------------------------------------------------

  const newExpiresAt =
    new Date(
      now +
      INACTIVITY_TIMEOUT_MINUTES *
      60 *
      1000
    );


  await pool.query(
    `
    UPDATE auth_sessions
    SET
      last_activity_at = CURRENT_TIMESTAMP,
      expires_at = $1
    WHERE id = $2
      AND revoked_at IS NULL
    `,
    [
      newExpiresAt,
      session.id,
    ]
  );


  return {
    valid: true,
    sessionId,
    expiresAt:
      newExpiresAt,
  };
};


// ============================================================
// REVOKE SESSION
// ============================================================

const revokeSession = async (
  sessionId
) => {

  if (!sessionId) {
    return;
  }


  await pool.query(
    `
    UPDATE auth_sessions
    SET
      revoked_at = CURRENT_TIMESTAMP
    WHERE session_token_hash = $1
      AND revoked_at IS NULL
    `,
    [
      hashSessionId(sessionId),
    ]
  );
};


// ============================================================
// REVOKE ALL USER SESSIONS
// ============================================================

const revokeAllUserSessions = async (
  userId
) => {

  if (!userId) {
    return;
  }


  await pool.query(
    `
    UPDATE auth_sessions
    SET
      revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
      AND revoked_at IS NULL
    `,
    [userId]
  );
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createAuthSession,
  validateAndRefreshSession,
  revokeSession,
  revokeAllUserSessions,
  INACTIVITY_TIMEOUT_MINUTES,
};
