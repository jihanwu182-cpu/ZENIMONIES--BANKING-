
const {
  createOnboardingSession,
  getLatestSessionByUserId,
  getSessionById,
} = require('../services/alat/onboardingSessionService');

// ============================================================
// ZENIMONIES — ALAT ONBOARDING CONTROLLER
// ============================================================

// Create an onboarding session
const createSession = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { verificationType } = req.body || {};

    // Validate verification type at controller boundary.
    const normalizedType =
      typeof verificationType === 'string'
        ? verificationType.trim().toUpperCase()
        : '';

    if (!['BVN', 'NIN'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Verification type must be BVN or NIN.',
      });
    }

    const session = await createOnboardingSession({
      userId,
      verificationType: normalizedType,
    });

    return res.status(201).json({
      success: true,
      message: 'Onboarding session created.',
      session,
    });
  } catch (error) {
    console.error(
      'ALAT onboarding session creation failed:',
      error?.code || 'UNKNOWN_ERROR'
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to create onboarding session.',
    });
  }
};

// Get the customer's latest onboarding session
const getLatestSession = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const session = await getLatestSessionByUserId(userId);

    return res.status(200).json({
      success: true,
      session: session || null,
    });
  } catch (error) {
    console.error(
      'ALAT latest onboarding session retrieval failed:',
      error?.code || 'UNKNOWN_ERROR'
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve onboarding session.',
    });
  }
};

// Get a specific session, restricted to its owner
const getSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Validate UUID format before querying PostgreSQL.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(sessionId || '')) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding session not found.',
      });
    }

    const session = await getSessionById(sessionId);

    // String comparison handles UUID values returned in different representations.
    if (!session || String(session.user_id) !== String(userId)) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding session not found.',
      });
    }

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error(
      'ALAT onboarding session retrieval failed:',
      error?.code || 'UNKNOWN_ERROR'
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve onboarding session.',
    });
  }
};

module.exports = {
  createSession,
  getLatestSession,
  getSession,
};
