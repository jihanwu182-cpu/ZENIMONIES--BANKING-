
const pool = require('../../config/database');

const ALLOWED_VERIFICATION_TYPES = ['BVN', 'NIN'];

const ALLOWED_STATUSES = [
  'initiated',
  'verified',
  'pending',
  'completed',
  'failed',
  'expired',
];

// Create a new onboarding session
const createOnboardingSession = async ({ userId, verificationType }) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const normalizedType = String(verificationType || '').toUpperCase();

  if (!ALLOWED_VERIFICATION_TYPES.includes(normalizedType)) {
    throw new Error('Verification type must be BVN or NIN.');
  }

  try {
    const result = await pool.query(
      `INSERT INTO alat_onboarding_sessions
        (user_id, verification_type, status)
       VALUES ($1, $2, 'initiated')
       RETURNING id, user_id, verification_type, correlation_id,
                 status, created_at, updated_at`,
      [userId, normalizedType]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error(
        'An active ALAT onboarding session already exists for this user.'
      );
    }

    throw error;
  }
};

// Save or update the provider correlation ID
const saveCorrelationId = async ({ sessionId, correlationId }) => {
  if (!sessionId || !correlationId) {
    throw new Error('Session ID and correlation ID are required.');
  }

  const result = await pool.query(
    `UPDATE alat_onboarding_sessions
     SET correlation_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, user_id, verification_type, correlation_id,
               status, created_at, updated_at`,
    [sessionId, String(correlationId)]
  );

  if (result.rowCount === 0) {
    throw new Error('ALAT onboarding session not found.');
  }

  return result.rows[0];
};

// Update onboarding session status
const updateSessionStatus = async ({ sessionId, status }) => {
  if (!sessionId) {
    throw new Error('Session ID is required.');
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error('Invalid onboarding status.');
  }

  const completedAt =
    status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';

  const result = await pool.query(
    `UPDATE alat_onboarding_sessions
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP,
         completed_at = ${completedAt}
     WHERE id = $1
     RETURNING id, user_id, verification_type, correlation_id,
               status, created_at, updated_at, completed_at`,
    [sessionId, status]
  );

  if (result.rowCount === 0) {
    throw new Error('ALAT onboarding session not found.');
  }

  return result.rows[0];
};

// Get the latest onboarding session for a user
const getLatestSessionByUserId = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const result = await pool.query(
    `SELECT id, user_id, verification_type, correlation_id,
            status, created_at, updated_at, completed_at
     FROM alat_onboarding_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

// Get a session by ID
const getSessionById = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Session ID is required.');
  }

  const result = await pool.query(
    `SELECT id, user_id, verification_type, correlation_id,
            status, created_at, updated_at, completed_at
     FROM alat_onboarding_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createOnboardingSession,
  saveCorrelationId,
  updateSessionStatus,
  getLatestSessionByUserId,
  getSessionById,
};
