const {
  verifyTransactionPin,
} = require('../services/transactionPinService');

/*
 * ============================================================
 * TRANSACTION PIN AUTHORIZATION MIDDLEWARE
 * ============================================================
 *
 * This protects money-moving endpoints.
 *
 * The frontend PIN screen is NOT the security boundary.
 * The backend verifies the PIN before the transfer controller
 * is allowed to execute.
 *
 * Expected request body:
 *
 * {
 *   transaction_pin: "1234"
 * }
 *
 * After successful verification, the plaintext PIN is removed
 * from req.body so it is not passed to the transfer controller.
 * ============================================================
 */

const transactionPinMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id ||
      null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const transactionPin = String(
      req.body?.transaction_pin || ''
    ).trim();

    if (!transactionPin) {
      return res.status(400).json({
        success: false,
        message:
          'Transaction PIN is required.',
      });
    }

    const ipAddress =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      null;

    const userAgent =
      req.headers['user-agent'] ||
      null;

    await verifyTransactionPin({
      userId,
      pin: transactionPin,
      ipAddress,
      userAgent,
    });

    /*
     * Remove the plaintext PIN immediately.
     * The transfer controller does not need it.
     */
    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(
        req.body,
        'transaction_pin'
      )
    ) {
      delete req.body.transaction_pin;
    }

    req.transactionPinVerified = true;

    return next();
  } catch (error) {
    console.error(
      'Transaction PIN authorization error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );

    const statusMap = {
      INVALID_TRANSACTION_PIN: 400,
      TRANSACTION_PIN_NOT_SET: 400,
      TRANSACTION_PIN_LOCKED: 423,
      INCORRECT_TRANSACTION_PIN: 401,
    };

    const status =
      statusMap[error?.code] || 500;

    const response = {
      success: false,
      message:
        error?.message ||
        'Unable to authorize this transaction.',
    };

    if (
      error?.failedAttempts !==
      undefined
    ) {
      response.failedAttempts =
        error.failedAttempts;
    }

    if (
      error?.remainingAttempts !==
      undefined
    ) {
      response.remainingAttempts =
        error.remainingAttempts;
    }

    if (
      error?.maxFailedAttempts !==
      undefined
    ) {
      response.maxFailedAttempts =
        error.maxFailedAttempts;
    }

    if (error?.lockedUntil) {
      response.lockedUntil =
        error.lockedUntil;
    }

    if (
      error?.fallbackRequired !==
      undefined
    ) {
      response.fallbackRequired =
        error.fallbackRequired;
    }

    return res
      .status(status)
      .json(response);
  }
};

module.exports =
  transactionPinMiddleware;
