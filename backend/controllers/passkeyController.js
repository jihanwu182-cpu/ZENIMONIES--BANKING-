const passkeyService = require('../services/passkeyService');

// ============================================================
// PASSWORDLESS LOGIN OPTIONS
// POST /api/passkeys/login/options
// ============================================================

const getLoginAuthenticationOptions = async (req, res) => {
  try {
    const {
      email,
    } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const result =
      await passkeyService.createLoginAuthenticationOptions(
        email
      );

    return res.status(200).json({
      success: true,
      options: result.options,
    });
  } catch (error) {
    console.error(
      'Passkey login options error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unable to start passkey login.',
    });
  }
};

// ============================================================
// PASSWORDLESS LOGIN VERIFY
// POST /api/passkeys/login/verify
// ============================================================

const verifyLoginAuthentication = async (req, res) => {
  try {
    const response = req.body;

    if (
      !response ||
      typeof response !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'WebAuthn authentication response is required.',
      });
    }

    const result =
      await passkeyService.verifyLoginAuthentication({
        response,
      });

    return res.status(200).json({
      success: true,

      message:
        'Passkey login successful.',

      token:
        result.token,

      session_expires_at:
        result.session_expires_at ||
        result.sessionExpiresAt ||
        null,

      inactivity_timeout_minutes:
        result.inactivity_timeout_minutes ||
        5,

      user:
        result.user,

      passkey_id:
        result.passkeyId,

      credential_id:
        result.credentialId,
    });
  } catch (error) {
    console.error(
      'Passkey login verification error:',
      error
    );

    return res.status(401).json({
      success: false,
      message:
        error.message ||
        'Passkey login failed.',
    });
  }
};

// ============================================================
// GET USER ID
// ============================================================

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.userId ||
    req.user?.userId ||
    null
  );
};

// ============================================================
// CREATE PASSKEY REGISTRATION OPTIONS
// POST /api/passkeys/register/options
// ============================================================

const getRegistrationOptions = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const options =
      await passkeyService.createRegistrationOptions(
        userId
      );

    return res.status(200).json({
      success: true,
      options,
    });
  } catch (error) {
    console.error(
      'Passkey registration options error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to create passkey registration options.',
    });
  }
};

// ============================================================
// VERIFY PASSKEY REGISTRATION
// POST /api/passkeys/register/verify
// ============================================================

const verifyRegistration = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const response = req.body;

    if (
      !response ||
      typeof response !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'WebAuthn registration response is required.',
      });
    }

    const result =
      await passkeyService.verifyRegistration({
        userId,
        response,
      });

    return res.status(201).json({
      success: true,

      message:
        'Passkey registered successfully.',

      verified:
        result.verified,

      passkey:
        result.passkey,
    });
  } catch (error) {
    console.error(
      'Passkey registration verification error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Passkey registration failed.',
    });
  }
};

// ============================================================
// CREATE PASSKEY AUTHENTICATION OPTIONS
// POST /api/passkeys/authenticate/options
// ============================================================

const getAuthenticationOptions = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const options =
      await passkeyService.createAuthenticationOptions(
        userId
      );

    return res.status(200).json({
      success: true,
      options,
    });
  } catch (error) {
    console.error(
      'Passkey authentication options error:',
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unable to create passkey authentication options.',
    });
  }
};

// ============================================================
// VERIFY PASSKEY AUTHENTICATION
// POST /api/passkeys/authenticate/verify
// ============================================================

const verifyAuthentication = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const response = req.body;

    if (
      !response ||
      typeof response !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'WebAuthn authentication response is required.',
      });
    }

    const result =
      await passkeyService.verifyAuthentication({
        userId,
        response,
      });

    return res.status(200).json({
      success: true,

      message:
        'Passkey authentication successful.',

      verified:
        result.verified,

      passkey_id:
        result.passkeyId,

      credential_id:
        result.credentialId,

      device_type:
        result.deviceType,

      backed_up:
        result.backedUp,
    });
  } catch (error) {
    console.error(
      'Passkey authentication verification error:',
      error
    );

    return res.status(401).json({
      success: false,
      message:
        error.message ||
        'Passkey authentication failed.',
    });
  }
};

// ============================================================
// GET REGISTERED PASSKEYS
// GET /api/passkeys
// ============================================================

const getPasskeys = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const passkeys =
      await passkeyService.getUserPasskeys(
        userId
      );

    return res.status(200).json({
      success: true,

      passkeys: passkeys.map((passkey) => ({
        id:
          passkey.id,

        credential_id:
          passkey.credential_id,

        device_type:
          passkey.device_type,

        backed_up:
          passkey.backed_up,

        transports:
          passkey.transports,

        created_at:
          passkey.created_at,

        last_used_at:
          passkey.last_used_at,
      })),
    });
  } catch (error) {
    console.error(
      'Get passkeys error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve registered passkeys.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getLoginAuthenticationOptions,
  verifyLoginAuthentication,
  getPasskeys,
};
