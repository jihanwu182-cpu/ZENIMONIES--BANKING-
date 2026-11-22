
const pool = require('../config/database');

// Allowed status transitions
const ALLOWED_TRANSITIONS = {
  initiated: ['verified', 'pending', 'failed', 'expired'],
  verified: ['pending', 'completed', 'failed', 'expired'],
  pending: ['verified', 'completed', 'failed', 'expired'],
  completed: [],
  failed: [],
  expired: [],
};

// Create a new onboarding session

const create = async ({ userId, verificationType }) => {
  // 1. Expire overdue sessions for this user first
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

  // 2. Try to create a new session
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

  // 3. If an active session already exists, return it
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



// Find latest session for a user
const findLatestByUserId = async (userId) => {
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

// Find session by ID
const findById = async (sessionId) => {
  const result = await pool.query(
    `SELECT *
     FROM alat_onboarding_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId]
  );

  return result.rows[0] || null;
};

// Save provider correlation ID

const saveCorrelationId = async (sessionId, correlationId) => {
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
    [sessionId, correlationId]
  );

  return result.rows[0] || null;
};


// Safely update onboarding status atomically
const updateStatus = async (sessionId, status) => {
  // Find all statuses that are allowed to transition to the target status
  const allowedPreviousStatuses = Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, allowedNextStatuses]) =>
      allowedNextStatuses.includes(status)
    )
    .map(([previousStatus]) => previousStatus);

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
    [sessionId, status, allowedPreviousStatuses]
  );

  return result.rows[0] || null;
};
// Expire only sessions whose explicit expiration time has passed
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

module.exports = {
  create,
  findLatestByUserId,
  findById,
  saveCorrelationId,
  updateStatus,
  expireDueSessions,
};
