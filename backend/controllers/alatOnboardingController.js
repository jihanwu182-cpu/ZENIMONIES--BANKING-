
const {
  createOnboardingSession,
  getLatestSessionByUserId,
  getSessionById,
} = require('../services/alat/onboardingSessionService');

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

    const session = await createOnboardingSession({
      userId,
      verificationType,
    });

    return res.status(201).json({
      success: true,
      message: 'Onboarding session created.',
      session,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to create onboarding session.',
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
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const session = await getSessionById(sessionId);

    if (!session || session.user_id !== userId) {
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
