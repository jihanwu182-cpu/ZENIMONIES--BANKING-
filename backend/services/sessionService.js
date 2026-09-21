const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');

// ============================================================
// SESSION CONFIGURATION
// ============================================================

const INACTIVITY_TIMEOUT_MINUTES = 5;

// JWT remains longer-lived.
// The database session controls the 5-minute inactivity timeout.
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
  // Create database session
  // ----------------------------------------------------------
  //
  // PostgreSQL calculates the expiry time.
  //
  // This keeps creation and validation on the same database
  // clock and avoids Node/PostgreSQL timezone differences.
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
        id,
        user_id,
        last_activity_at,
        expires_at
      `,
      [
        user.id,
        sessionTokenHash,
      ]
    );


  const createdSession =
    sessionResult.rows[0];


  const expiresAt =
    createdSession?.expires_at;


  // ==========================================================
  // SESSION CREATION DIAGNOSTICS
  // ==========================================================

  console.log(
    '========== ZENIMONIES SESSION CREATED =========='
  );

  console.log(
    'Session created for user:',
    user.id
  );

  console.log(
    'Session database ID:',
    createdSession?.id
  );

  console.log(
    'Session last activity:',
    createdSession?.last_activity_at
  );

  console.log(
    'Session expires at:',
    expiresAt
  );


  const sessionClock =
    await pool.query(
      `
      SELECT
        CURRENT_TIMESTAMP AS db_now,
        CURRENT_SETTING('TIMEZONE') AS db_timezone
      `
    );


  console.log(
    'Database current time:',
    sessionClock.rows[0]?.db_now
  );

  console.log(
    'Database timezone:',
    sessionClock.rows[0]?.db_timezone
  );

  console.log(
    '================================================='
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
// Every valid authenticated request refreshes the inactivity
// timer for another 5 minutes.
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
    console.log(
      'ZENIMONIES SESSION CHECK: session not found'
    );

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

    console.log(
      'ZENIMONIES SESSION CHECK: session revoked'
    );

    return {
      valid: false,
      reason: 'SESSION_REVOKED',
    };
  }


  // ----------------------------------------------------------
  // Check expiration using PostgreSQL
  // ----------------------------------------------------------

  const expiryCheck =
    await pool.query(
      `
      SELECT
        expires_at <= CURRENT_TIMESTAMP AS expired,
        CURRENT_TIMESTAMP AS db_now,
        CURRENT_SETTING('TIMEZONE') AS db_timezone
      FROM auth_sessions
      WHERE id = $1
      LIMIT 1
      `,
      [
        session.id,
      ]
    );


  const expiryData =
    expiryCheck.rows[0];


  const expired =
    expiryData?.expired === true;


  // ==========================================================
  // SESSION VALIDATION DIAGNOSTICS
  // ==========================================================

  console.log(
    '========== ZENIMONIES SESSION CHECK =========='
  );

  console.log(
    'User:',
    userId
  );

  console.log(
    'Session last activity:',
    session.last_activity_at
  );

  console.log(
    'Session expires at:',
    session.expires_at
  );

  console.log(
    'Database current time:',
    expiryData?.db_now
  );

  console.log(
    'Database timezone:',
    expiryData?.db_timezone
  );

  console.log(
    'Database says expired:',
    expired
  );

  console.log(
    '==============================================='
  );


  // ----------------------------------------------------------
  // Session expired
  // ----------------------------------------------------------

  if (expired) {

    console.log(
      'ZENIMONIES SESSION RESULT: SESSION_EXPIRED'
    );

    return {
      valid: false,
      reason: 'SESSION_EXPIRED',
    };
  }


  // ----------------------------------------------------------
  // Refresh inactivity timer
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
        expires_at,
        last_activity_at
      `,
      [
        session.id,
      ]
    );


  if (
    refreshResult.rows.length === 0
  ) {

    console.log(
      'ZENIMONIES SESSION RESULT: SESSION_INVALID'
    );

    return {
      valid: false,
      reason: 'SESSION_INVALID',
    };
  }


  const refreshedSession =
    refreshResult.rows[0];


  console.log(
    'ZENIMONIES SESSION RESULT: SESSION_VALID'
  );

  console.log(
    'New session last activity:',
    refreshedSession.last_activity_at
  );

  console.log(
    'New session expiry:',
    refreshedSession.expires_at
  );


  return {
    valid: true,
    sessionId,
    expiresAt:
      refreshedSession.expires_at,
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
