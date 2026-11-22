
const pool = require('../config/database');

// ============================================================
// ZENIMONIES — ALAT ONBOARDING SESSION REPOSITORY
// ============================================================

const ALLOWED_TRANSITIONS = {
  initiated: ['verified', 'pending', 'failed', 'expired'],
  verified: ['pending', 'completed', 'failed', 'expired'],
  pending: ['verified', 'completed', 'failed', 'expired'],
  completed: [],
  failed: [],
  expired: [],
};

const ALLOWED_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

const ACTIVE_STATUSES = ['initiated', 'verified', 'pending'];

// ------------------------------------------------------------
// CREATE SESSION
// ------------------------------------------------------------

const create = async ({ userId, verificationType }) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  if (!['BVN', 'NIN'].includes(verificationType)) {
    throw new Error('Invalid verification type.');
  }

  // Expire overdue sessions for this user first.
  await pool.query(
    `UPDATE alat_onboarding_sessions
     SET status = 'expired',
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND status IN ('initiated', 'verified', 'pending')
       AND expires_at IS NOT NULL
       AND expires_at <= CURRENT_TIMESTAMP`,
    [userId]
  );

  // Create new session, protected by the partial unique index.
  const result = await pool.query(
    `INSERT INTO alat_onboarding_sessions
       (user_id, verification_type, status)
     VALUES ($1, $2, 'initiated')
     ON CONFLICT (user_id)
       WHERE status IN ('initiated', 'verified', 'pending')
     DO NOTHING
     RETURNING *`,
    [userId, verificationType]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  // If an active session already exists, return it.
  const existing = await pool.query(
    `SELECT *
     FROM alat_onboarding_sessions
     WHERE user_id = $1
       AND status IN ('initiated', 'verified', 'pending')
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return existing.rows[0] || null;
};

// ------------------------------------------------------------
// FIND LATEST SESSION BY USER
// ------------------------------------------------------------

const findLatestByUserId = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const result = await pool.query(
    `SELECT *
     FROM alat_onboarding_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

// ------------------------------------------------------------
// FIND SESSION BY ID
// ------------------------------------------------------------

const findById = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Session ID is required.');
  }

  const result = await pool.query(
    `SELECT *
     FROM alat_onboarding_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId]
  );

  return result.rows[0] || null;
};

// ------------------------------------------------------------
// SAVE CORRELATION ID
// ------------------------------------------------------------

const saveCorrelationId = async (sessionId, correlationId) => {
  if (
    typeof sessionId !== 'string' ||
    !sessionId.trim() ||
    typeof correlationId !== 'string' ||
    !correlationId.trim()
  ) {
    throw new Error('Session ID and correlation ID are required.');
  }

  const normalizedCorrelationId = correlationId.trim();

  const result = await pool.query(
    `UPDATE alat_onboarding_sessions
     SET correlation_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND status IN ('initiated', 'verified', 'pending')
       AND (
         correlation_id IS NULL
         OR correlation_id = $2
       )
     RETURNING *`,
    [sessionId.trim(), normalizedCorrelationId]
  );

  return result.rows[0] || null;
};

// ------------------------------------------------------------
// UPDATE SESSION STATUS
// ------------------------------------------------------------

const updateStatus = async (sessionId, status) => {
  if (
    typeof sessionId !== 'string' ||
    !sessionId.trim()
  ) {
    throw new Error('Session ID is required.');
  }

  if (
    typeof status !== 'string' ||
    !ALLOWED_STATUSES.includes(status)
  ) {
    throw new Error('Invalid onboarding status.');
  }

  // Find valid previous states for this requested status.
  const allowedPreviousStatuses = Object.entries(
    ALLOWED_TRANSITIONS
  )
    .filter(([, nextStatuses]) => nextStatuses.includes(status))
    .map(([previousStatus]) => previousStatus);

  // Atomically enforce the transition.
  const result = await pool.query(
    `UPDATE alat_onboarding_sessions
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP,
         completed_at = CASE
           WHEN $2 = 'completed'
             THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
           ELSE completed_at
         END
     WHERE id = $1
       AND (
         status = $2
         OR status = ANY($3::varchar[])
       )
     RETURNING *`,
    [sessionId.trim(), status, allowedPreviousStatuses]
  );

  return result.rows[0] || null;
};

// ------------------------------------------------------------
// EXPIRE DUE SESSIONS
// ------------------------------------------------------------

const expireDueSessions = async () => {
  const result = await pool.query(
    `UPDATE alat_onboarding_sessions
     SET status = 'expired',
         updated_at = CURRENT_TIMESTAMP
     WHERE status IN ('initiated', 'verified', 'pending')
       AND expires_at IS NOT NULL
       AND expires_at <= CURRENT_TIMESTAMP
     RETURNING id, user_id, status, expires_at`
  );

  return result.rows;
};

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------

module.exports = {
  create,
  findLatestByUserId,
  findById,
  saveCorrelationId,
  updateStatus,
  expireDueSessions,
};
