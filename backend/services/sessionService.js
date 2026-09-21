const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');

// ============================================================
// SESSION CONFIGURATION
// ============================================================

const INACTIVITY_TIMEOUT_MINUTES = 5;

// JWT itself can remain valid for 24 hours.
// The database session controls the 5-minute inactivity period.
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

  // Generate a unique server-side session ID.
  const sessionId = crypto.randomUUID();

  const sessionTokenHash =
    hashSessionId(sessionId);

  // PostgreSQL creates the timestamps.
  const sessionResult = await pool.query(
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

  // Create JWT containing the server-side session ID.
  const token = jwt.sign(
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

  console.log(
    'ZENIMONIES AUTH SESSION CREATED:',
    {
      userId: user.id,
      sessionId: createdSession?.id,
      expiresAt: createdSession?.expires_at,
    }
  );

  return {
    token,
    sessionId,
    expiresAt:
      createdSession?.expires_at,
  };
};


// ============================================================
// VALIDATE AND REFRESH SESSION
// ============================================================
//
// IMPORTANT:
//
// The session is checked and refreshed using PostgreSQL's
// clock in one UPDATE operation.
//
// This prevents the application server clock and database
// clock from disagreeing about whether the session expired.
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

  const sessionTokenHash =
    hashSessionId(sessionId);

  // ----------------------------------------------------------
  // Atomically validate + refresh the session.
  // ----------------------------------------------------------

  const refreshResult = await pool.query(
    `
    UPDATE auth_sessions
    SET
      last_activity_at = CURRENT_TIMESTAMP,
      expires_at =
        CURRENT_TIMESTAMP + INTERVAL '5 minutes'
    WHERE
      user_id = $1
      AND session_token_hash = $2
      AND revoked_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    RETURNING
      id,
      user_id,
      last_activity_at,
      expires_at
    `,
    [
      userId,
      sessionTokenHash,
    ]
  );

  // ----------------------------------------------------------
  // Session is valid.
  // ----------------------------------------------------------

  if (refreshResult.rows.length > 0) {
    const session =
      refreshResult.rows[0];

    console.log(
      'ZENIMONIES SESSION VALID:',
      {
        userId,
        sessionId: session.id,
        expiresAt:
          session.expires_at,
      }
    );

    return {
      valid: true,
      sessionId,
      expiresAt:
        session.expires_at,
    };
  }

  // ----------------------------------------------------------
  // The session wasn't refreshed.
  //
  // Find out why so the middleware can return the correct
  // security response.
  // ----------------------------------------------------------

  const lookupResult = await pool.query(
    `
    SELECT
      id,
      user_id,
      expires_at,
      revoked_at
    FROM auth_sessions
    WHERE
      user_id = $1
      AND session_token_hash = $2
    LIMIT 1
    `,
    [
      userId,
      sessionTokenHash,
    ]
  );

  // ----------------------------------------------------------
  // Session doesn't exist.
  // ----------------------------------------------------------

  if (lookupResult.rows.length === 0) {
    console.log(
      'ZENIMONIES SESSION INVALID: SESSION_NOT_FOUND',
      {
        userId,
      }
    );

    return {
      valid: false,
      reason: 'SESSION_NOT_FOUND',
    };
  }

  const session =
    lookupResult.rows[0];

  // ----------------------------------------------------------
  // Session was revoked.
  // ----------------------------------------------------------

  if (session.revoked_at) {
    console.log(
      'ZENIMONIES SESSION INVALID: SESSION_REVOKED',
      {
        userId,
        sessionId: session.id,
      }
    );

    return {
      valid: false,
      reason: 'SESSION_REVOKED',
    };
  }

  // ----------------------------------------------------------
  // Session expired.
  // ----------------------------------------------------------

  console.log(
    'ZENIMONIES SESSION INVALID: SESSION_EXPIRED',
    {
      userId,
      sessionId: session.id,
      expiresAt:
        session.expires_at,
    }
  );

  return {
    valid: false,
    reason: 'SESSION_EXPIRED',
  };
};


// ============================================================
// REVOKE ONE SESSION
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
    WHERE
      session_token_hash = $1
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
    WHERE
      user_id = $1
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
