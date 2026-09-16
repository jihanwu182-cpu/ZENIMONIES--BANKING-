const passkeyService = require('../services/passkeyService');

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.userId ||
    req.user?.userId
  );
};

// ============================================================
// STANDARD PASSKEY ERROR RESPONSE
// ============================================================

const sendPasskeyError = (res, error) => {
  const statusCode =
    error?.code === 'PASSKEY_FALLBACK_REQUIRED'
      ? 429
      : error?.code === 'PASSKEY_AUTH_FAILED'
        ? 401
        : 400;

  return res.status(statusCode).json({
    success: false,

    code:
      error?.code ||
      'PASSKEY_ERROR',

    message:
      error?.message ||
      'Passkey authentication failed.',

    failed_attempts:
      Number(
        error?.failedAttempts || 0
      ),

    max_failed_attempts: 3,

    fallback_required:
      error?.code ===
      'PASSKEY_FALLBACK_REQUIRED',

    locked_until:
      error?.lockedUntil ||
      null,
  });
};

// ============================================================
// PASSKEY REGISTRATION OPTIONS
// ============================================================

const getRegistrationOptions = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        code:
          'AUTHENTICATION_REQUIRED',
        message:
          'Authentication required.',
      });
    }

    const userName =
      req.user?.email ||
      req.user?.phone ||
      `user-${userId}`;

    const userDisplayName =
      req.user?.full_name ||
      req.user?.email ||
      'Zenimonies User';

    const options =
      await passkeyService.createRegistrationOptions({
        userId,
        userName,
        userDisplayName,
      });

    return res.json({
      success: true,
      options,
    });
  } catch (error) {
    console.error(
      'Passkey registration options error:',
      error
    );

    return res.status(400).json({
      success: false,
      code:
        error?.code ||
        'PASSKEY_REGISTRATION_OPTIONS_ERROR',
      message:
        error?.message ||
        'Unable to create Passkey registration options.',
    });
  }
};

// ============================================================
// VERIFY PASSKEY REGISTRATION
// ============================================================

const verifyRegistration = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        code:
          'AUTHENTICATION_REQUIRED',
        message:
          'Authentication required.',
      });
    }

    // IMPORTANT:
    // The complete WebAuthn credential must be passed
    // unchanged to SimpleWebAuthn.
    //
    // The object contains:
    // id
    // rawId
    // response
    // type
    //
    // Do NOT use req.body.response here because that
    // removes the top-level credential ID.
    const response = req.body;

    if (
      !response ||
      typeof response !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        code:
          'PASSKEY_RESPONSE_REQUIRED',
        message:
          'Passkey registration response is required.',
      });
    }

    if (!response.id) {
      return res.status(400).json({
        success: false,
        code:
          'PASSKEY_CREDENTIAL_ID_MISSING',
        message:
          'Passkey credential ID is missing.',
      });
    }

    const result =
      await passkeyService.verifyRegistration({
        userId,
        response,
      });

    return res.json({
      success: true,

      message:
        'Passkey registered successfully.',

      verified: true,

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

      code:
        error?.code ||
        'PASSKEY_REGISTRATION_ERROR',

      message:
        error?.message ||
        'Passkey registration failed.',
    });
  }
};

// ============================================================
// AUTHENTICATED PASSKEY OPTIONS
// ============================================================

const getAuthenticationOptions = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        code:
          'AUTHENTICATION_REQUIRED',
        message:
          'Authentication required.',
      });
    }

    const options =
      await passkeyService.createAuthenticationOptions({
        userId,
      });

    return res.json({
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

      code:
        error?.code ||
        'PASSKEY_AUTHENTICATION_OPTIONS_ERROR',

      message:
        error?.message ||
        'Unable to create Passkey authentication options.',
    });
  }
};

// ============================================================
// VERIFY AUTHENTICATED PASSKEY
// ============================================================

const verifyAuthentication = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        code:
          'AUTHENTICATION_REQUIRED',
        message:
          'Authentication required.',
      });
    }

    // IMPORTANT:
    // Pass the complete WebAuthn credential unchanged.
    //
    // Required fields include:
    // id
    // rawId
    // response
    // type
    const response = req.body;

    if (
      !response ||
      typeof response !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        code:
          'PASSKEY_RESPONSE_REQUIRED',
        message:
          'Passkey authentication response is required.',
      });
    }

    if (!response.id) {
      return res.status(400).json({
        success: false,
        code:
          'PASSKEY_CREDENTIAL_ID_MISSING',
        message:
          'Passkey credential ID is missing.',
      });
    }

    const result =
      await passkeyService.verifyAuthentication({
        userId,
        response,
      });

    return res.json({
      success: true,

      message:
        'Passkey authentication successful.',

      verified: true,

      passkey_id:
        result.passkeyId,

      credential_id:
        result.credentialId,
    });
  } catch (error) {
    console.error(
      'Passkey authentication verification error:',
      error
    );

    return sendPasskeyError(
      res,
      error
    );
  }
};

// ============================================================
// PASSWORDLESS LOGIN OPTIONS
// ============================================================

const getLoginAuthenticationOptions =
  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body?.email ||
          ''
        )
          .trim()
          .toLowerCase();

      if (!email) {
        return res.status(400).json({
          success: false,

          code:
            'EMAIL_REQUIRED',

          message:
            'Email address is required.',
        });
      }

      const result =
        await passkeyService.createLoginAuthenticationOptions({
          email,
        });

      return res.json({
        success: true,

        options:
          result.options,
      });
    } catch (error) {
      console.error(
        'Passkey login options error:',
        error
      );

      if (
        error?.code ===
        'PASSKEY_FALLBACK_REQUIRED'
      ) {
        return res.status(429).json({
          success: false,

          code:
            'PASSKEY_FALLBACK_REQUIRED',

          message:
            'Passkey authentication is temporarily unavailable. Please use your password.',

          failed_attempts:
            Number(
              error.failedAttempts || 3
            ),

          max_failed_attempts: 3,

          fallback_required:
            true,

          locked_until:
            error.lockedUntil ||
            null,
        });
      }

      return res.status(400).json({
        success: false,

        code:
          error?.code ||
          'PASSKEY_LOGIN_OPTIONS_ERROR',

        message:
          error?.message ||
          'Unable to start Passkey login.',
      });
    }
  };

// ============================================================
// PASSWORDLESS LOGIN VERIFY
// ============================================================

const verifyLoginAuthentication =
  async (
    req,
    res
  ) => {
    try {
      /*
       * Login sends:
       *
       * {
       *   email: "...",
       *   response: {
       *     id: "...",
       *     rawId: "...",
       *     response: {...},
       *     type: "public-key"
       *   }
       * }
       *
       * Therefore we intentionally extract req.body.response
       * for this endpoint.
       */
      const response =
        req.body?.response ||
        req.body;

      if (!response) {
        return res.status(400).json({
          success: false,

          code:
            'PASSKEY_RESPONSE_REQUIRED',

          message:
            'Passkey authentication response is required.',
        });
      }

      const result =
        await passkeyService.verifyLoginAuthentication({
          response,
        });

      return res.json({
        success: true,

        message:
          'Passkey login successful.',

        verified: true,

        token:
          result.token,

        session_expires_at:
          result.sessionExpiresAt,

        inactivity_timeout_minutes:
          result.inactivityTimeoutMinutes,

        user:
          result.user,

        passkey_id:
          result.passkeyId,

        credential_id:
          result.credentialId,

        failed_attempts: 0,

        max_failed_attempts: 3,

        fallback_required: false,

        locked_until: null,
      });
    } catch (error) {
      console.error(
        'Passkey login verification error:',
        error
      );

      return sendPasskeyError(
        res,
        error
      );
    }
  };

// ============================================================
// GET USER PASSKEYS
// ============================================================

const getPasskeys = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        code:
          'AUTHENTICATION_REQUIRED',

        message:
          'Authentication required.',
      });
    }

    const passkeys =
      await passkeyService.getUserPasskeys(
        userId
      );

    return res.json({
      success: true,
      passkeys,
    });
  } catch (error) {
    console.error(
      'Get Passkeys error:',
      error
    );

    return res.status(500).json({
      success: false,

      code:
        'PASSKEY_LIST_ERROR',

      message:
        'Unable to retrieve Passkeys.',
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
