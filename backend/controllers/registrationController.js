
const bcrypt = require('bcryptjs');

const pool = require('../config/database');

const registrationService = require('../services/registrationService');

const {
  createAuthSession,
} = require('../services/sessionService');

// ============================================================
// ZENIMONIES BANKING — STAGED REGISTRATION CONTROLLER
// ============================================================

const handleRegistrationError = (res, error, fallbackMessage) => {
  console.error(
    'Registration controller error:',
    error.message
  );

  const status =
    Number.isInteger(error.status)
      ? error.status
      : error.code === '23505'
        ? 409
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
    const { phone, otp } = req.body || {};

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verification code are required.',
      });
    }

    const result =
      await registrationService.verifyPhoneOtp(phone, otp);

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
    const { phone, email } = req.body || {};

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
    const { phone, email, otp } = req.body || {};

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
// COMPLETE REGISTRATION
// POST /api/auth/registration/complete
//
// Creates the customer and personal account only after
// phone and email verification have both succeeded.
// ============================================================

const completeRegistration = async (req, res) => {
  const body = req.body || {};

  const phoneInput = body.phone;

  const firstName = String(body.first_name || '')
    .trim()
    .replace(/\s+/g, ' ');

  const middleName = body.middle_name
    ? String(body.middle_name)
        .trim()
        .replace(/\s+/g, ' ')
    : null;

  const surname = String(body.surname || '')
    .trim()
    .replace(/\s+/g, ' ');

  const password = String(body.password || '');

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!phoneInput || !firstName || !surname || !password) {
    return res.status(400).json({
      success: false,
      message:
        'Phone, first name, surname and password are required.',
    });
  }

  if (firstName.length < 2 || firstName.length > 100) {
    return res.status(400).json({
      success: false,
      message:
        'First name must be between 2 and 100 characters.',
    });
  }

  if (surname.length < 2 || surname.length > 100) {
    return res.status(400).json({
      success: false,
      message:
        'Surname must be between 2 and 100 characters.',
    });
  }

  if (
    middleName &&
    (middleName.length < 2 || middleName.length > 100)
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Middle name must be between 2 and 100 characters.',
    });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      success: false,
      message:
        'Password must be between 8 and 128 characters.',
    });
  }

  let phone;

  try {
    phone = registrationService.normalizePhone(phoneInput);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  const fullName = [
    firstName,
    middleName,
    surname,
  ]
    .filter(Boolean)
    .join(' ');

  // ----------------------------------------------------------
  // HASH PASSWORD
  // ----------------------------------------------------------

  let passwordHash;

  try {
    passwordHash = await bcrypt.hash(password, 12);
  } catch (error) {
    console.error(
      'Registration password hashing failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Registration could not be completed. Please try again.',
    });
  }

  // ----------------------------------------------------------
  // DATABASE TRANSACTION
  // ----------------------------------------------------------

  let client;

  try {
    client = await pool.connect();
  } catch (error) {
    console.error(
      'Registration database connection failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Registration service is temporarily unavailable.',
    });
  }

  let transactionOpen = false;
  let user;
  let account;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    // Serialize finalization attempts for this phone.
    await client.query(
      `
      SELECT pg_advisory_xact_lock(
        hashtext($1),
        hashtext('zenimonies-registration-finalize')
      )
      `,
      [phone]
    );

    // --------------------------------------------------------
    // LOCK VERIFIED REGISTRATION
    // --------------------------------------------------------

    const pendingResult = await client.query(
      `
      SELECT
        id,
        phone,
        email,
        phone_verified_at,
        email_verified_at
      FROM pending_registrations
      WHERE phone = $1
        AND phone_verified_at IS NOT NULL
        AND email_verified_at IS NOT NULL
        AND completed_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [phone]
    );

    if (!pendingResult.rows.length) {
      const error = new Error(
        'Your phone and email must both be verified before you create your account. Please restart registration if the session expired.'
      );

      error.status = 400;
      throw error;
    }

    const pending = pendingResult.rows[0];

    const email = String(pending.email || '')
      .trim()
      .toLowerCase();

    // --------------------------------------------------------
    // CHECK FOR EXISTING CUSTOMER
    // --------------------------------------------------------

    const duplicateResult = await client.query(
      `
      SELECT id, email, phone
      FROM users
      WHERE LOWER(email) = $1
         OR regexp_replace(phone, '[^0-9]', '', 'g') =
            regexp_replace($2, '[^0-9]', '', 'g')
      LIMIT 1
      `,
      [email, phone]
    );

    if (duplicateResult.rows.length) {
      const error = new Error(
        'An account already exists with these registration details. Please log in or contact support.'
      );

      error.status = 409;
      throw error;
    }

    // --------------------------------------------------------
    // CREATE USER
    // Gender is intentionally NULL.
    // Customer can complete gender in Profile later.
    // --------------------------------------------------------

    const userResult = await client.query(
      `
      INSERT INTO users (
        first_name,
        middle_name,
        surname,
        full_name,
        gender,
        email,
        phone,
        password_hash,
        role,
        status,
        registration_account_type,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        is_verified,
        account_limit,
        daily_transfer_limit,
        daily_transfer_used,
        daily_transfer_reset_at,
        password_changed_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NULL,
        $5,
        $6,
        $7,
        'user',
        'active',
        'personal',
        'not_verified',
        0,
        false,
        false,
        false,
        false,
        50000.00,
        50000.00,
        0.00,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        first_name,
        middle_name,
        surname,
        full_name,
        gender,
        email,
        phone,
        role,
        status,
        registration_account_type,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        is_verified,
        created_at
      `,
      [
        firstName,
        middleName,
        surname,
        fullName,
        email,
        phone,
        passwordHash,
      ]
    );

    user = userResult.rows[0];

    // --------------------------------------------------------
    // CREATE PERSONAL ACCOUNT
    //
    // No locally generated account number.
    // The official number must be supplied by an approved
    // banking provider integration in the future.
    // --------------------------------------------------------
    const userResult = await client.query(
      `
      INSERT INTO users (
        first_name,
        middle_name,
        surname,
        full_name,
        gender,
        email,
        phone,
        phone_verified,
        password_hash,
        role,
        status,
        registration_account_type,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        is_verified,
        account_limit,
        daily_transfer_limit,
        daily_transfer_used,
        daily_transfer_reset_at,
        password_changed_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NULL,
        $5,
        $6,
        true,
        $7,
        'user',
        'active',
        'personal',
        'not_verified',
        0,
        false,
        false,
        false,
        false,
        50000.00,
        50000.00,
        0.00,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        first_name,
        middle_name,
        surname,
        full_name,
        gender,
        email,
        phone,
        phone_verified,
        role,
        status,
        registration_account_type,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        is_verified,
        created_at
      `,
      [
        firstName,
        middleName,
        surname,
        fullName,
        email,
        phone,
        passwordHash,
      ]
    );

    user = userResult.rows[0];

    
    // --------------------------------------------------------
    // MARK REGISTRATION AS COMPLETED
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE pending_registrations
      SET
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND completed_at IS NULL
      `,
      [pending.id]
    );

    // --------------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------------

        try {
      await client.query(
        `
        INSERT INTO audit_logs (
          user_id,
          action,
          description,
          created_at
        )
        VALUES (
          $1,
          'account_registration',
          $2,
          CURRENT_TIMESTAMP
        )
        `,
        [
          user.id,
          JSON.stringify({
            registration_account_type: 'personal',
            phone_verified: true,
            email_verified: true,
            kyc_status: 'not_verified',
            kyc_tier: 0,
          }),
        ]
      );
    } catch (auditError) {
      console.error(
        'Registration audit log could not be written:',
        auditError.message
      );
    }
    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query('COMMIT');
    transactionOpen = false;

  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Registration rollback failed:',
          rollbackError.message
        );
      }
    }

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message:
          'An account already exists with these registration details. Please log in or contact support.',
      });
    }

    return handleRegistrationError(
      res,
      error,
      'Registration could not be completed. Please try again.'
    );

  } finally {
    client.release();
  }

  // ----------------------------------------------------------
  // CREATE LOGIN SESSION AFTER COMMIT
  // ----------------------------------------------------------

  let authSession = null;

  try {
    authSession = await createAuthSession(user);
  } catch (error) {
    console.error(
      'Registration completed but automatic login failed:',
      error.message
    );
  }

  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  const response = {
    success: true,

    message: authSession
      ? 'Your Zenimonies personal account has been created successfully.'
      : 'Your account has been created. Please log in to continue.',

    registration_complete: true,
    login_required: !authSession,

    user,
    account,
  };

  if (authSession) {
    response.token = authSession.token;
    response.access_token = authSession.token;
    response.session_expires_at = authSession.expiresAt;
    response.inactivity_timeout_minutes = 5;
  }

  return res.status(201).json(response);
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
  completeRegistration,
};
