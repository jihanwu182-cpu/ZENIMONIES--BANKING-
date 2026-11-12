
const registrationService = require('../services/registrationService');

// ============================================================
// ZENIMONIES BANKING — REGISTRATION CONTROLLER
// ============================================================

// ============================================================
// STANDARD ERROR RESPONSE
// ============================================================

const handleRegistrationError = (res, error, fallbackMessage) => {
  console.error(
    'Registration controller error:',
    error.message
  );

  const status =
    Number.isInteger(error.status)
      ? error.status
      : error.code
        ? 500
        : 400;

  const response = {
    success: false,
    message:
      status >= 500
        ? fallbackMessage
        : error.message || fallbackMessage,
  };

  if (error.retryAfter) {
    response.retry_after_seconds = error.retryAfter;
  }

  return res.status(status).json(response);
};

// ============================================================
// START PHONE VERIFICATION
// POST /api/auth/registration/phone
// ============================================================

const startPhoneVerification = async (req, res) => {
  try {
    const phone = req.body?.phone;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }

    const result =
      await registrationService.startPhoneVerification(phone);

    return res.status(200).json(result);

  } catch (error) {
    return handleRegistrationError(
      res,
      error,
      'Unable to send phone verification code. Please try again.'
    );
  }
};

// ============================================================
// VERIFY PHONE OTP
// POST /api/auth/registration/phone/verify
// ============================================================

const verifyPhoneOtp = async (req, res) => {
  try {
    const phone = req.body?.phone;
    const otp = req.body?.otp;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verification code are required.',
      });
    }

    const result =
      await registrationService.verifyPhoneOtp(
        phone,
        otp
      );

    return res.status(200).json(result);

  } catch (error) {
    return handleRegistrationError(
      res,
      error,
      'Unable to verify phone number. Please try again.'
    );
  }
};

// ============================================================
// START EMAIL VERIFICATION
// POST /api/auth/registration/email
// ============================================================

const startEmailVerification = async (req, res) => {
  try {
    const phone = req.body?.phone;
    const email = req.body?.email;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and email address are required.',
      });
    }

    const result =
      await registrationService.startEmailVerification(
        phone,
        email
      );

    return res.status(200).json(result);

  } catch (error) {
    return handleRegistrationError(
      res,
      error,
      'Unable to send email verification code. Please try again.'
    );
  }
};

// ============================================================
// VERIFY EMAIL OTP
// POST /api/auth/registration/email/verify
// ============================================================

const verifyEmailOtp = async (req, res) => {
  try {
    const phone = req.body?.phone;
    const email = req.body?.email;
    const otp = req.body?.otp;

    if (!phone || !email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          'Phone number, email address and verification code are required.',
      });
    }

    const result =
      await registrationService.verifyEmailOtp(
        phone,
        email,
        otp
      );

    return res.status(200).json(result);

  } catch (error) {
    return handleRegistrationError(
      res,
      error,
      'Unable to verify email address. Please try again.'
    );
  }
};

// ============================================================
// CHECK REGISTRATION VERIFICATION STATUS
// POST /api/auth/registration/status
// ============================================================

const getRegistrationStatus = async (req, res) => {
  try {
    const phone = req.body?.phone;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }

    const registration =
      await registrationService.getVerifiedRegistration(phone);

    if (!registration) {
      return res.status(404).json({
        success: false,
        phone_verified: false,
        email_verified: false,
        registration_complete: false,
        message:
          'Phone and email verification must be completed before continuing.',
      });
    }

    return res.status(200).json({
      success: true,
      phone_verified: true,
      email_verified: true,
      registration_complete: false,
      registration_step: 'profile',
      message:
        'Phone and email verified. You can continue with your profile.',
    });

  } catch (error) {
    return handleRegistrationError(
      res,
      error,
      'Unable to check registration status.'
    );
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  startPhoneVerification,
  verifyPhoneOtp,
  startEmailVerification,
  verifyEmailOtp,
  getRegistrationStatus,
};
