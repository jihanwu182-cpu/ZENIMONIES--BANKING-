const pool = require('../config/database');

const {
  createPasscode,
  changePasscode,
  verifyPasscode,
  getPasscodeStatus,
} = require('../services/passcodeService');


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
// EXPORTS
// ============================================================

module.exports = {

  getStatus,

  setup,

  verify,

  change,
};
