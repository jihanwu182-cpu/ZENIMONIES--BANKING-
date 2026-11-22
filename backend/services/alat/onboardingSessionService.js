
const repository = require('../../repositories/alatOnboardingSessionRepository');

// ============================================================
// ZENIMONIES — ALAT ONBOARDING SESSION SERVICE
// ============================================================

const ALLOWED_VERIFICATION_TYPES = ['BVN', 'NIN'];

const ALLOWED_STATUSES = [
  'initiated',
  'verified',
  'pending',
  'completed',
  'failed',
  'expired',
];

// ------------------------------------------------------------
// CREATE ONBOARDING SESSION
// ------------------------------------------------------------

const createOnboardingSession = async ({ userId, verificationType }) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const normalizedType =
    typeof verificationType === 'string'
      ? verificationType.trim().toUpperCase()
      : '';

  if (!ALLOWED_VERIFICATION_TYPES.includes(normalizedType)) {
    throw new Error('Verification type must be BVN or NIN.');
  }

  try {
    const session = await repository.create({
      userId,
      verificationType: normalizedType,
    });

    if (!session) {
      throw new Error('Unable to create or retrieve onboarding session.');
    }

    if (session.verification_type !== normalizedType) {
      throw new Error(
        `An active ${session.verification_type} onboarding session already exists. Please continue that verification or wait until it expires before starting ${normalizedType}.`
      );
    }

    return session;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error(
        'An active ALAT onboarding session already exists. Please try again.'
      );
    }

    throw error;
  }
};

// ------------------------------------------------------------
// SAVE PROVIDER CORRELATION ID
// ------------------------------------------------------------

const saveCorrelationId = async ({ sessionId, correlationId }) => {
  if (
    typeof sessionId !== 'string' ||
    !sessionId.trim() ||
    typeof correlationId !== 'string' ||
    !correlationId.trim()
  ) {
    throw new Error('Session ID and correlation ID are required.');
  }

  const normalizedCorrelationId = correlationId.trim();

  const session = await repository.saveCorrelationId(
    sessionId.trim(),
    normalizedCorrelationId
  );

  if (!session) {
    throw new Error(
      'Unable to save correlation ID. Session may not exist or may no longer be active.'
    );
  }

  return session;
};

// ------------------------------------------------------------
// UPDATE ONBOARDING STATUS
// ------------------------------------------------------------

const updateSessionStatus = async ({ sessionId, status }) => {
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

  const session = await repository.updateStatus(
    sessionId.trim(),
    status
  );

  if (!session) {
    throw new Error(
      'Unable to update onboarding session. The session may not exist or the status transition may not be allowed.'
    );
  }

  return session;
};

// ------------------------------------------------------------
// GET LATEST USER SESSION
// ------------------------------------------------------------

const getLatestSessionByUserId = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  return repository.findLatestByUserId(userId);
};

// ------------------------------------------------------------
// GET SESSION BY ID
// ------------------------------------------------------------

const getSessionById = async (sessionId) => {
  if (
    typeof sessionId !== 'string' ||
    !sessionId.trim()
  ) {
    throw new Error('Session ID is required.');
  }

  return repository.findById(sessionId.trim());
};

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------

module.exports = {
  createOnboardingSession,
  saveCorrelationId,
  updateSessionStatus,
  getLatestSessionByUserId,
  getSessionById,
};
