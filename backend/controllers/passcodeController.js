const jwt = require('jsonwebtoken');

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
        fallback_required:
          true,
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
//
// Used by Settings and account-security screens.
//
// Returns whether the user has created a 6-digit Account
// Unlock Passcode.
//
// Does NOT return the Passcode or its hash.
// ============================================================

const getStatus = async (req, res) => {

  try {

    const userId =
      getUserId(req);


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

    return handlePasscodeError(
      res,
      error
    );
  }
};


// ============================================================
// SET UP ACCOUNT PASSCODE
// POST /api/passcode/setup
// ============================================================
//
// Creates the user's 6-digit Account Unlock Passcode.
//
// This is NOT the Transaction PIN.
// ============================================================

const setup = async (req, res) => {

  try {

    const userId =
      getUserId(req);


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
      String(
        confirm_passcode || ''
      ).trim();


    // ========================================================
    // VALIDATE FORMAT
    // ========================================================

    if (
      !/^\d{6}$/.test(
        normalizedPasscode
      )
    ) {

      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSCODE',
        message:
          'Your Account Passcode must be exactly 6 digits.',
      });
    }


    // ========================================================
    // CONFIRM PASSCODE
    // ========================================================

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


    const metadata =
      getRequestMetadata(req);


    const result =
      await createPasscode({

        userId,

        passcode:
          normalizedPasscode,

        ipAddress:
          metadata.ipAddress,

        userAgent:
          metadata.userAgent,
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
          3,

        locked:
          false,

        locked_until:
          null,
      },
    });


  } catch (error) {

    return handlePasscodeError(
      res,
      error
    );
  }
};


// ============================================================
// VERIFY ACCOUNT PASSCODE
// POST /api/passcode/verify
// ============================================================
//
// Used specifically by the Account Locked screen.
//
// Successful verification means:
// the 6-digit Account Unlock Passcode was correct.
//
// It does NOT authorize a transaction.
// It does NOT replace the Transaction PIN.
// ============================================================

const verify = async (req, res) => {

  try {

    const userId =
      getUserId(req);


    if (!userId) {

      return res.status(401).json({
        success: false,
        message:
          'Authentication is required.',
      });
    }


    const passcode =
      String(
        req.body?.passcode || ''
      ).trim();


    if (
      !/^\d{6}$/.test(passcode)
    ) {

      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSCODE',
        message:
          'Please enter your 6-digit passcode.',
      });
    }


    const metadata =
      getRequestMetadata(req);


    const result =
      await verifyPasscode({

        userId,

        passcode,

        ipAddress:
          metadata.ipAddress,

        userAgent:
          metadata.userAgent,
      });


    return res.status(200).json({

      success: true,

      verified: true,

      message:
        'Passcode verified successfully. Account unlocked.',

      failed_attempts:
        result.failedAttempts,

      remaining_attempts:
        result.remainingAttempts,

      max_failed_attempts:
        result.maxFailedAttempts,

      fallback_required:
        false,

      locked_until:
        null,
    });


  } catch (error) {

    return handlePasscodeError(
      res,
      error
    );
  }
};


// ============================================================
// CHANGE ACCOUNT PASSCODE
// POST /api/passcode/change
// ============================================================
//
// Allows an authenticated user to change their existing
// 6-digit Account Unlock Passcode.
//
// This is NOT the Transaction PIN.
// ============================================================

const change = async (req, res) => {

  try {

    const userId =
      getUserId(req);


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
      String(
        current_passcode || ''
      ).trim();


    const newPasscode =
      String(
        new_passcode || ''
      ).trim();


    const confirmation =
      String(
        confirm_passcode || ''
      ).trim();


    if (
      !/^\d{6}$/.test(
        currentPasscode
      )
    ) {

      return res.status(400).json({
        success: false,
        code: 'INVALID_CURRENT_PASSCODE',
        message:
          'Current Account Passcode must be exactly 6 digits.',
      });
    }


    if (
      !/^\d{6}$/.test(
        newPasscode
      )
    ) {

      return res.status(400).json({
        success: false,
        code: 'INVALID_NEW_PASSCODE',
        message:
          'New Account Passcode must be exactly 6 digits.',
      });
    }


    if (
      newPasscode !==
      confirmation
    ) {

      return res.status(400).json({
        success: false,
        code: 'PASSCODE_CONFIRMATION_MISMATCH',
        message:
          'New Passcodes do not match.',
      });
    }


    const metadata =
      getRequestMetadata(req);


    const result =
      await changePasscode({

        userId,

        currentPasscode,

        newPasscode,

        ipAddress:
          metadata.ipAddress,

        userAgent:
          metadata.userAgent,
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
          3,

        locked:
          false,

        locked_until:
          null,
      },
    });


  } catch (error) {

    return handlePasscodeError(
      res,
      error
    );
  }
};
// ============================================================
// ACCOUNT UNLOCK
// POST /api/passcode/unlock
// ============================================================
//
// IMPORTANT:
//
// This endpoint intentionally does NOT use authMiddleware.
//
// The user's 5-minute inactivity session has already expired.
//
// We therefore:
//
// 1. Validate the JWT.
// 2. Extract the user ID.
// 3. Confirm the user still exists and is active.
// 4. Verify the 6-digit Account Unlock Passcode.
// 5. Create a brand-new server authentication session.
// 6. Return a brand-new JWT.
//
// The old expired session is never reused.
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

    // ========================================================
    // EXTRACT JWT
    // ========================================================

    const token =
      authHeader
        .substring(7)
        .trim();

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
        'JWT_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured.',
      });
    }

    // ========================================================
    // VERIFY JWT
    // ========================================================

    let decoded;

    try {
      decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );
    } catch (error) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message:
          'Your secure authentication token has expired. Please sign in again.',
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
    // LOAD USER
    // ========================================================

    const userResult =
      await pool.query(
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

    if (
      userResult.rows.length === 0
    ) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message:
          'Your account could not be found.',
      });
    }

    const user =
      userResult.rows[0];

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
    // PASSCODE
    // ========================================================

    const passcode =
      String(
        req.body?.passcode || ''
      ).trim();

    if (
      !/^\d{6}$/.test(passcode)
    ) {
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
      passcodeResult =
        await verifyPasscode({
          userId,

          passcode,

          ipAddress:
            metadata.ipAddress,

          userAgent:
            metadata.userAgent,
        });
    } catch (error) {
      /*
       * Preserve the existing secure Passcode
       * failure handling.
       */

      return handlePasscodeError(
        res,
        error
      );
    }

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
    // CREATE BRAND-NEW AUTH SESSION
    // ========================================================

    const newSession =
      await createAuthSession({
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

      failed_attempts:
        0,

      remaining_attempts:
        MAX_PASSCODE_ATTEMPTS,

      max_failed_attempts:
        MAX_PASSCODE_ATTEMPTS,

      fallback_required:
        false,

      locked_until:
        null,
    });

  } catch (error) {
    console.error(
      'Account unlock error:',
      error
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
