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
  // Store session
  // ----------------------------------------------------------
  //
  // IMPORTANT:
  //
  // PostgreSQL calculates the expiry time itself.
  //
  // This prevents a Node.js / PostgreSQL timezone mismatch.
  //
  // ----------------------------------------------------------

  const sessionResult =
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
        CURRENT_TIMESTAMP + INTERVAL '5 minutes'
      )
      RETURNING
        expires_at
      `,
      [
        user.id,
        sessionTokenHash,
      ]
    );


  const expiresAt =
    sessionResult.rows[0]?.expires_at;


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
//
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


  // ----------------------------------------------------------
  // Find session
  // ----------------------------------------------------------

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
  //
  // IMPORTANT:
  //
  // Compare the database timestamp against PostgreSQL's
  // CURRENT_TIMESTAMP.
  //
  // We do NOT compare it against Date.now().
  //
  // ----------------------------------------------------------

  const expiryCheck =
    await pool.query(
      `
      SELECT
        (
          expires_at <= CURRENT_TIMESTAMP
        ) AS expired
      FROM auth_sessions
      WHERE id = $1
      LIMIT 1
      `,
      [
        session.id,
      ]
    );


  const expired =
    expiryCheck.rows[0]?.expired === true;


  if (expired) {

    return {
      valid: false,
      reason: 'SESSION_EXPIRED',
    };
  }


  // ----------------------------------------------------------
  // Refresh inactivity timer
  // ----------------------------------------------------------
  //
  // PostgreSQL calculates the new expiry time.
  //
  // ----------------------------------------------------------

  const refreshResult =
    await pool.query(
      `
      UPDATE auth_sessions
      SET
        last_activity_at = CURRENT_TIMESTAMP,
        expires_at =
          CURRENT_TIMESTAMP + INTERVAL '5 minutes'
      WHERE id = $1
        AND revoked_at IS NULL
      RETURNING
        expires_at
      `,
      [
        session.id,
      ]
    );


  if (
    refreshResult.rows.length === 0
  ) {
    return {
      valid: false,
      reason: 'SESSION_INVALID',
    };
  }


  const newExpiresAt =
    refreshResult.rows[0]?.expires_at;


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
    [
      userId,
    ]
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
