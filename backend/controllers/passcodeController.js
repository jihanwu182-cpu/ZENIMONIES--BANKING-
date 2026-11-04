
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = require('../config/database');

const {
  createPasscode,
  changePasscode,
  verifyPasscode,
  getPasscodeStatus,
} = require('../services/passcodeService');

const {
  createAuthSession,
} = require('../services/sessionService');

const MAX_PASSCODE_ATTEMPTS = 3;
const MAX_JWT_LIFETIME_SECONDS = 24 * 60 * 60;

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.userId ||
    req.user?.userId ||
    null
  );
};

const getRequestMetadata = (req) => {
  return {
    ipAddress:
      req.ip ||
      req.headers['x-forwarded-for'] ||
      null,

    userAgent:
      req.get('user-agent') ||
      null,
  };
};

// ============================================================
// ERROR RESPONSE
// ============================================================

const handlePasscodeError = (res, error) => {
  console.error(
    'Account Passcode error:',
    error?.message || error
  );

  switch (error?.code) {
    case 'INVALID_PASSCODE':
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSCODE',
        message:
          'Account Passcode must contain exactly 6 digits.',
      });

    case 'INVALID_CURRENT_PASSCODE':
      return res.status(400).json({
        success: false,
        code: 'INVALID_CURRENT_PASSCODE',
        message:
          'Current Account Passcode must contain exactly 6 digits.',
      });

    case 'INVALID_NEW_PASSCODE':
      return res.status(400).json({
        success: false,
        code: 'INVALID_NEW_PASSCODE',
        message:
          'New Account Passcode must contain exactly 6 digits.',
      });

    case 'PASSCODE_ALREADY_EXISTS':
      return res.status(409).json({
        success: false,
        code: 'PASSCODE_ALREADY_EXISTS',
        message:
          'An Account Passcode already exists.',
      });

    case 'PASSCODE_NOT_SET':
      return res.status(404).json({
        success: false,
        code: 'PASSCODE_NOT_SET',
        message:
          'You have not created an Account Passcode yet.',
      });

    case 'SAME_PASSCODE':
      return res.status(400).json({
        success: false,
        code: 'SAME_PASSCODE',
        message:
          'Your new Account Passcode must be different from the current Passcode.',
      });

    case 'INCORRECT_PASSCODE':
      return res.status(401).json({
        success: false,
        code: 'INCORRECT_PASSCODE',
        message:
          'Incorrect passcode.',
        failed_attempts:
          error.failedAttempts || 0,
        remaining_attempts:
          error.remainingAttempts ?? 0,
        max_failed_attempts:
          error.maxFailedAttempts || 3,
        fallback_required:
          error.fallbackRequired === true,
      });

    case 'PASSCODE_LOCKED':
      return res.status(429).json({
        success: false,
        code: 'PASSCODE_LOCKED',
        message:
          'Account Passcode is temporarily locked.',
        failed_attempts:
          error.failedAttempts || 3,
        max_failed_attempts:
          error.maxFailedAttempts || 3,
        fallback_required: true,
        locked_until:
          error.lockedUntil || null,
      });

    default:
      return res.status(500).json({
        success: false,
        message:
          'Unable to process Account Passcode request.',
      });
  }
};

// ============================================================
// GET PASSCODE STATUS
// GET /api/passcode/status
// ============================================================

const getStatus = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication is required.',
      });
    }

    const status =
      await getPasscodeStatus(userId);

    return res.status(200).json({
      success: true,

      passcode: {
        exists:
          status.exists,

        failed_attempts:
          status.failedAttempts,

        max_failed_attempts:
          status.maxFailedAttempts,

        locked:
          status.locked,

        locked_until:
          status.lockedUntil,

        last_used_at:
          status.lastUsedAt,

        created_at:
          status.createdAt,
      },
    });

  } catch (error) {
    return handlePasscodeError(res, error);
  }
};

// ============================================================
// SET UP ACCOUNT PASSCODE
// POST /api/passcode/setup
// ============================================================

const setup = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication is required.',
      });
    }

    const {
      passcode,
      confirm_passcode,
    } = req.body || {};

    const normalizedPasscode =
      String(passcode || '').trim();

    const normalizedConfirmation =
      String(confirm_passcode || '').trim();

    if (!/^\d{6}$/.test(normalizedPasscode)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSCODE',
        message:
          'Your Account Passcode must be exactly 6 digits.',
      });
    }

    if (
      normalizedPasscode !==
      normalizedConfirmation
    ) {
      return res.status(400).json({
        success: false,
        code: 'PASSCODE_CONFIRMATION_MISMATCH',
        message:
          'Passcodes do not match.',
      });
    }

    const metadata = getRequestMetadata(req);

    const result = await createPasscode({
      userId,
      passcode: normalizedPasscode,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return res.status(201).json({
      success: true,

      message:
        'Your 6-digit Account Passcode has been created successfully.',

      passcode: {
        exists: true,
        failed_attempts:
          result.failedAttempts,
        max_failed_attempts:
          MAX_PASSCODE_ATTEMPTS,
        locked: false,
        locked_until: null,
      },
    });

  } catch (error) {
    return handlePasscodeError(res, error);
  }
};

// ============================================================
// VERIFY ACCOUNT PASSCODE
// POST /api/passcode/verify
// ============================================================

const verify = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication is required.',
      });
    }

    const passcode =
      String(req.body?.passcode || '').trim();

    if (!/^\d{6}$/.test(passcode)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSCODE',
        message:
          'Please enter your 6-digit passcode.',
      });
    }

    const metadata = getRequestMetadata(req);

    const result = await verifyPasscode({
      userId,
      passcode,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return res.status(200).json({
      success: true,
      verified: true,

      message:
        'Passcode verified successfully.',

      failed_attempts:
        result.failedAttempts,

      remaining_attempts:
        result.remainingAttempts,

      max_failed_attempts:
        result.maxFailedAttempts,

      fallback_required: false,
      locked_until: null,
    });

  } catch (error) {
    return handlePasscodeError(res, error);
  }
};

// ============================================================
// CHANGE ACCOUNT PASSCODE
// POST /api/passcode/change
// ============================================================

const change = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication is required.',
      });
    }

    const {
      current_passcode,
      new_passcode,
      confirm_passcode,
    } = req.body || {};

    const currentPasscode =
      String(current_passcode || '').trim();

    const newPasscode =
      String(new_passcode || '').trim();

    const confirmation =
      String(confirm_passcode || '').trim();

    if (!/^\d{6}$/.test(currentPasscode)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CURRENT_PASSCODE',
        message:
          'Current Account Passcode must be exactly 6 digits.',
      });
    }

    if (!/^\d{6}$/.test(newPasscode)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_NEW_PASSCODE',
        message:
          'New Account Passcode must be exactly 6 digits.',
      });
    }

    if (newPasscode !== confirmation) {
      return res.status(400).json({
        success: false,
        code: 'PASSCODE_CONFIRMATION_MISMATCH',
        message:
          'New Passcodes do not match.',
      });
    }

    const metadata = getRequestMetadata(req);

    const result = await changePasscode({
      userId,
      currentPasscode,
      newPasscode,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return res.status(200).json({
      success: true,

      message:
        'Your Account Passcode has been changed successfully.',

      passcode: {
        exists: true,
        failed_attempts:
          result.failedAttempts,
        max_failed_attempts:
          MAX_PASSCODE_ATTEMPTS,
        locked: false,
        locked_until: null,
      },
    });

  } catch (error) {
    return handlePasscodeError(res, error);
  }
};

// ============================================================
// ACCOUNT UNLOCK
// POST /api/passcode/unlock
// ============================================================
//
// This endpoint intentionally does NOT use authMiddleware.
//
// Rules:
//
// 1. JWT signature must be valid.
// 2. JWT must still be within its 24-hour lifetime.
// 3. JWT must contain valid timing claims.
// 4. User must exist and be active.
// 5. Original database session must exist.
// 6. Original database session must not be revoked.
// 7. Original database session must have expired through
//    the five-minute inactivity timeout.
// 8. Account Unlock Passcode must be correct.
// 9. A completely new authentication session is created.
//
// The original session is never reused.
// ============================================================

const unlock = async (req, res) => {
  try {
    // ========================================================
    // AUTHORIZATION HEADER
    // ========================================================

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
        message:
          'Authentication is required to unlock this session.',
      });
    }

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
        message:
          'Authentication is required to unlock this session.',
      });
    }

    // ========================================================
    // JWT SECRET
    // ========================================================

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET is not configured.'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured.',
      });
    }

    // ========================================================
    // VERIFY JWT SIGNATURE AND EXPIRATION
    // ========================================================

    let decoded;

    try {
      // Normal verification enforces the 24-hour JWT expiry.
      // Do NOT use ignoreExpiration here.

      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'AUTHENTICATION_TOKEN_EXPIRED',
          message:
            'Your authentication has expired. Please sign in again.',
        });
      }

      return res.status(401).json({
        success: false,
        code: 'INVALID_AUTHENTICATION_TOKEN',
        message:
          'Your authentication token is invalid. Please sign in again.',
      });
    }

    // ========================================================
    // VERIFY JWT TIMING CLAIMS
    // ========================================================

    const currentTime =
      Math.floor(Date.now() / 1000);

    const tokenIssuedAt =
      decoded?.iat;

    const tokenExpiresAt =
      decoded?.exp;

    if (
      !Number.isInteger(tokenIssuedAt) ||
      !Number.isInteger(tokenExpiresAt) ||
      tokenIssuedAt > currentTime + 60 ||
      tokenExpiresAt <= tokenIssuedAt ||
      tokenExpiresAt - tokenIssuedAt >
        MAX_JWT_LIFETIME_SECONDS
    ) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_AUTHENTICATION_TOKEN',
        message:
          'Your authentication token is invalid. Please sign in again.',
      });
    }

    // ========================================================
    // USER ID
    // ========================================================

    const userId =
      decoded?.userId ||
      decoded?.id ||
      decoded?.user_id ||
      decoded?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_AUTHENTICATION_TOKEN',
        message:
          'Your authentication token is invalid.',
      });
    }

    // ========================================================
    // SESSION ID
    // ========================================================

    const sessionId =
      decoded?.sessionId;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_AUTHENTICATION_TOKEN',
        message:
          'Your authentication session could not be identified. Please sign in again.',
      });
    }

    // ========================================================
    // CONFIRM USER
    // ========================================================

    const userResult = await pool.query(
      `
        SELECT
          id,
          full_name,
          email,
          phone,
          role,
          status
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message:
          'Your account could not be found.',
      });
    }

    const user = userResult.rows[0];

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (
      user.status &&
      user.status !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_NOT_ACTIVE',
        message:
          'Your account is not active.',
      });
    }

    // ========================================================
    // CONFIRM ORIGINAL DATABASE SESSION
    // ========================================================

    const sessionTokenHash = crypto
      .createHash('sha256')
      .update(String(sessionId))
      .digest('hex');

    const sessionResult = await pool.query(
      `
        SELECT
          id,
          user_id,
          last_activity_at,
          expires_at,
          revoked_at
        FROM auth_sessions
        WHERE user_id = $1
          AND session_token_hash = $2
        LIMIT 1
      `,
      [
        userId,
        sessionTokenHash,
      ]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_NOT_FOUND',
        message:
          'Your secure session could not be found. Please sign in again.',
      });
    }

    const session = sessionResult.rows[0];

    // ========================================================
    // REVOKED SESSION
    // ========================================================

    if (session.revoked_at) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_REVOKED',
        message:
          'This secure session has already been ended. Please sign in again.',
      });
    }

    // ========================================================
    // SESSION EXPIRY CHECK
    // ========================================================
    //
    // Use PostgreSQL's clock, matching sessionService.js.
    //
    // The application server clock and database clock can
    // differ, so the database decides whether the session
    // has expired.
    // ========================================================

    const expiryCheckResult = await pool.query(
      `
        SELECT
          expires_at <= CURRENT_TIMESTAMP AS expired
        FROM auth_sessions
        WHERE id = $1
        LIMIT 1
      `,
      [session.id]
    );

    const sessionExpired =
      expiryCheckResult.rows[0]?.expired === true;

    // ========================================================
    // SESSION IS STILL ACTIVE
    // ========================================================

    if (!sessionExpired) {
      return res.status(400).json({
        success: false,
        code: 'SESSION_NOT_LOCKED',
        message:
          'Your secure session is still active.',
      });
    }

    // ========================================================
    // PASSCODE VALIDATION
    // ========================================================

    const passcode =
      String(req.body?.passcode || '').trim();

    if (!/^\d{6}$/.test(passcode)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSCODE',
        message:
          'Please enter your 6-digit Account Unlock Passcode.',
      });
    }

    // ========================================================
    // REQUEST METADATA
    // ========================================================

    const metadata =
      getRequestMetadata(req);

    // ========================================================
    // VERIFY ACCOUNT UNLOCK PASSCODE
    // ========================================================

    let passcodeResult;

    try {
      passcodeResult = await verifyPasscode({
        userId,
        passcode,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

    } catch (error) {
      return handlePasscodeError(res, error);
    }

    // ========================================================
    // PASSCODE FAILURE
    // ========================================================

    if (
      !passcodeResult?.success ||
      !passcodeResult?.verified
    ) {
      return res.status(401).json({
        success: false,
        code: 'INCORRECT_PASSCODE',
        message:
          'Incorrect passcode.',
        failed_attempts:
          passcodeResult?.failedAttempts || 0,
        remaining_attempts:
          passcodeResult?.remainingAttempts || 0,
        max_failed_attempts:
          passcodeResult?.maxFailedAttempts || 3,
      });
    }

    // ========================================================
    // REVOKE OLD SESSION
    // ========================================================

    await pool.query(
      `
        UPDATE auth_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND revoked_at IS NULL
      `,
      [session.id]
    );

    // ========================================================
    // CREATE BRAND-NEW AUTHENTICATION SESSION
    // ========================================================

    const newSession = await createAuthSession({
      id: user.id,
      role: user.role,
    });

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(200).json({
      success: true,
      verified: true,
      unlocked: true,

      message:
        'Account unlocked successfully.',

      token:
        newSession.token,

      user: {
        id:
          user.id,

        full_name:
          user.full_name,

        email:
          user.email,

        phone:
          user.phone,

        role:
          user.role,
      },

      session: {
        session_id:
          newSession.sessionId,

        expires_at:
          newSession.expiresAt,
      },

      failed_attempts: 0,

      remaining_attempts:
        MAX_PASSCODE_ATTEMPTS,

      max_failed_attempts:
        MAX_PASSCODE_ATTEMPTS,

      fallback_required: false,

      locked_until: null,
    });

  } catch (error) {
    console.error(
      'Account unlock error:',
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to unlock your account at this time.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getStatus,
  setup,
  verify,
  change,
  unlock,
};
