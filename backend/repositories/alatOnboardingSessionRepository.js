
const pool = require('../config/database');

// Create a new onboarding session
const create = async ({ userId, verificationType }) => {
  const result = await pool.query(
    `INSERT INTO alat_onboarding_sessions
       (user_id, verification_type, status)
     VALUES ($1, $2, 'initiated')
     RETURNING *`,
    [userId, verificationType]
  );

  return result.rows[0];
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
     RETURNING *`,
    [sessionId, correlationId]
  );

  return result.rows[0] || null;
};

// Update session status
const updateStatus = async (sessionId, status) => {
  const result = await pool.query(
    `UPDATE alat_onboarding_sessions
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP,
         completed_at = CASE
           WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP
           ELSE NULL
         END
     WHERE id = $1
     RETURNING *`,
    [sessionId, status]
  );

  return result.rows[0] || null;
};

module.exports = {
  create,
  findLatestByUserId,
  findById,
  saveCorrelationId,
  updateStatus,
};
