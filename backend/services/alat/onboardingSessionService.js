
const repository = require('../../repositories/alatOnboardingSessionRepository');

const ALLOWED_VERIFICATION_TYPES = ['BVN', 'NIN'];

const ALLOWED_STATUSES = [
  'initiated',
  'verified',
  'pending',
  'completed',
  'failed',
  'expired',
];

const createOnboardingSession = async ({ userId, verificationType }) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const normalizedType = String(verificationType || '').toUpperCase();

  if (!ALLOWED_VERIFICATION_TYPES.includes(normalizedType)) {
    throw new Error('Verification type must be BVN or NIN.');
  }

  try {
    return await repository.create({
      userId,
      verificationType: normalizedType,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new Error(
        'An active ALAT onboarding session already exists for this user.'
      );
    }

    throw error;
  }
};

const saveCorrelationId = async ({ sessionId, correlationId }) => {
  if (!sessionId || !correlationId) {
    throw new Error('Session ID and correlation ID are required.');
  }

  const session = await repository.saveCorrelationId(
    sessionId,
    String(correlationId)
  );

  if (!session) {
    throw new Error('ALAT onboarding session not found.');
  }

  return session;
};

const updateSessionStatus = async ({ sessionId, status }) => {
  if (!sessionId) {
    throw new Error('Session ID is required.');
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error('Invalid onboarding status.');
  }

  const session = await repository.updateStatus(sessionId, status);

  if (!session) {
    throw new Error('ALAT onboarding session not found.');
  }

  return session;
};

const getLatestSessionByUserId = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  return repository.findLatestByUserId(userId);
};

const getSessionById = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Session ID is required.');
  }

  return repository.findById(sessionId);
};

module.exports = {
  createOnboardingSession,
  saveCorrelationId,
  updateSessionStatus,
  getLatestSessionByUserId,
  getSessionById,
};
