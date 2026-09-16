const {
  createTransactionPin,
  changeTransactionPin,
  verifyTransactionPin,
  getTransactionPinStatus,
} = require('../services/transactionPinService');

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
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
      req.headers['user-agent'] ||
      null,
  };
};

// ============================================================
// ERROR HANDLER
// ============================================================

const handleTransactionPinError = (
  res,
  error,
  fallbackMessage
) => {
  console.error(
    'Transaction PIN error:',
    error
  );

  const statusMap = {
    INVALID_TRANSACTION_PIN: 400,

    INVALID_CURRENT_TRANSACTION_PIN: 400,

    INVALID_NEW_TRANSACTION_PIN: 400,

    SAME_TRANSACTION_PIN: 400,

    TRANSACTION_PIN_ALREADY_EXISTS: 409,

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
      fallbackMessage ||
      'An error occurred while processing the Transaction PIN.',
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
};

// ============================================================
// GET TRANSACTION PIN STATUS
// GET /api/transaction-pin/status
// ============================================================

const getStatus = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Authentication required.',
        });
    }

    const status =
      await getTransactionPinStatus(
        userId
      );

    return res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    return handleTransactionPinError(
      res,
      error,
      'Unable to retrieve Transaction PIN status.'
    );
  }
};

// ============================================================
// CREATE TRANSACTION PIN
// POST /api/transaction-pin/setup
// ============================================================

const setup = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Authentication required.',
        });
    }

    const {
      pin,
      confirmPin,
    } = req.body || {};

    if (!pin || !confirmPin) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Transaction PIN and confirmation are required.',
        });
    }

    if (
      String(pin) !==
      String(confirmPin)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Transaction PINs do not match.',
        });
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestMetadata(req);

    const result =
      await createTransactionPin({
        userId,
        pin,
        ipAddress,
        userAgent,
      });

    return res
      .status(201)
      .json({
        success: true,
        message:
          'Transaction PIN created successfully.',
        ...result,
      });
  } catch (error) {
    return handleTransactionPinError(
      res,
      error,
      'Unable to create Transaction PIN.'
    );
  }
};

// ============================================================
// CHANGE TRANSACTION PIN
// POST /api/transaction-pin/change
// ============================================================

const change = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Authentication required.',
        });
    }

    const {
      currentPin,
      newPin,
      confirmPin,
    } = req.body || {};

    if (
      !currentPin ||
      !newPin ||
      !confirmPin
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Current PIN, new PIN and confirmation are required.',
        });
    }

    if (
      String(newPin) !==
      String(confirmPin)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'New Transaction PINs do not match.',
        });
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestMetadata(req);

    const result =
      await changeTransactionPin({
        userId,
        currentPin,
        newPin,
        ipAddress,
        userAgent,
      });

    return res.json({
      success: true,
      message:
        'Transaction PIN changed successfully.',
      ...result,
    });
  } catch (error) {
    return handleTransactionPinError(
      res,
      error,
      'Unable to change Transaction PIN.'
    );
  }
};

// ============================================================
// VERIFY TRANSACTION PIN
// POST /api/transaction-pin/verify
// ============================================================
//
// This endpoint will later be called by:
// - Bank transfers
// - Internal transfers
// - Payments
// - Airtime
// - Data
// - Bills
// - Other money-moving operations
//
// ============================================================

const verify = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Authentication required.',
        });
    }

    const {
      pin,
    } = req.body || {};

    if (!pin) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Transaction PIN is required.',
        });
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestMetadata(req);

    const result =
      await verifyTransactionPin({
        userId,
        pin,
        ipAddress,
        userAgent,
      });

    return res.json({
      success: true,
      message:
        'Transaction PIN verified successfully.',
      ...result,
    });
  } catch (error) {
    return handleTransactionPinError(
      res,
      error,
      'Unable to verify Transaction PIN.'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getStatus,
  setup,
  change,
  verify,
};
