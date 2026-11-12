
const crypto = require('crypto');

const pool = require('../config/database');

const {
  sendPhoneOtp,
} = require('./termiiService');

const {
  sendRegistrationEmailOtp,
} = require('./emailService');

// ============================================================
// ZENIMONIES — STAGED REGISTRATION SERVICE
// ============================================================

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;
const REGISTRATION_LIFETIME_MINUTES = 30;

// ============================================================
// HELPERS
// ============================================================

const generateOtp = () => {
  return String(
    crypto.randomInt(100000, 1000000)
  );
};

const hashOtp = (otp) => {
  return crypto
    .createHash('sha256')
    .update(String(otp))
    .digest('hex');
};

const verifyOtpHash = (otp, storedHash) => {
  if (
    typeof storedHash !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  const supplied = Buffer.from(hashOtp(otp), 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  return (
    supplied.length === stored.length &&
    crypto.timingSafeEqual(supplied, stored)
  );
};

const normalizePhone = (phone) => {
  let value = String(phone || '')
    .trim()
    .replace(/[\s()-]/g, '');

  if (/^0\d{10}$/.test(value)) {
    value = `+234${value.substring(1)}`;
  } else if (/^234\d{10}$/.test(value)) {
    value = `+${value}`;
  }

  if (!/^\+234\d{10}$/.test(value)) {
    throw new Error(
      'Please enter a valid Nigerian phone number.'
    );
  }

  return value;
};

const normalizeEmail = (email) => {
  const value = String(email || '')
    .trim()
    .toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ) {
    throw new Error('Please enter a valid email address.');
  }

  return value;
};

const validateOtp = (otp) => {
  const value = String(otp || '').trim();

  if (!/^\d{6}$/.test(value)) {
    throw new Error(
      'Please enter the six-digit verification code.'
    );
  }

  return value;
};

const getDevelopmentOtp = (otp) => {
  return process.env.NODE_ENV !== 'production'
    ? otp
    : undefined;
};

// ============================================================
// CHECK PHONE ALREADY REGISTERED
// ============================================================

const checkPhoneExists = async (client, phone) => {
  const result = await client.query(
    `
    SELECT id
    FROM users
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') =
          regexp_replace($1, '[^0-9]', '', 'g')
    LIMIT 1
    `,
    [phone]
  );

  return result.rows.length > 0;
};

// ============================================================
// CHECK EMAIL ALREADY REGISTERED
// ============================================================

const checkEmailExists = async (client, email) => {
  const result = await client.query(
    `
    SELECT id
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows.length > 0;
};

// ============================================================
// START PHONE VERIFICATION
// POST /api/auth/registration/phone
// ============================================================

const startPhoneVerification = async (phoneInput) => {
  const phone = normalizePhone(phoneInput);

  const client = await pool.connect();

  let otp;

  try {
    await client.query('BEGIN');

    // Serialize attempts for this phone number.
    await client.query(
      `
      SELECT pg_advisory_xact_lock(
        hashtext($1),
        hashtext('zenimonies-registration-phone')
      )
      `,
      [phone]
    );

    if (await checkPhoneExists(client, phone)) {
      throw new Error(
        'This phone number is already registered. Please log in.'
      );
    }

    const existing = await client.query(
      `
      SELECT *
      FROM pending_registrations
      WHERE phone = $1
        AND completed_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [phone]
    );

    const pending = existing.rows[0];

    if (
      pending?.phone_otp_sent_at &&
      pending.phone_otp_expires_at &&
      new Date(pending.phone_otp_expires_at) > new Date()
    ) {
      const elapsed = Math.floor(
        (
          Date.now() -
          new Date(pending.phone_otp_sent_at).getTime()
        ) / 1000
      );

      if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        const error = new Error(
          'Please wait before requesting another verification code.'
        );

        error.status = 429;
        error.retryAfter =
          OTP_RESEND_COOLDOWN_SECONDS - elapsed;

        throw error;
      }
    }

    otp = generateOtp();

    const otpHash = hashOtp(otp);

    if (pending) {
      await client.query(
        `
        UPDATE pending_registrations
        SET
          phone_otp_hash = $2,
          phone_otp_expires_at =
            CURRENT_TIMESTAMP + INTERVAL '10 minutes',
          phone_otp_attempts = 0,
          phone_otp_sent_at = CURRENT_TIMESTAMP,
          phone_verified_at = NULL,
          email = NULL,
          email_otp_hash = NULL,
          email_otp_expires_at = NULL,
          email_otp_attempts = 0,
          email_otp_sent_at = NULL,
          email_verified_at = NULL,
          expires_at =
            CURRENT_TIMESTAMP + INTERVAL '30 minutes',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [pending.id, otpHash]
      );
    } else {
      await client.query(
        `
        INSERT INTO pending_registrations (
          phone,
          phone_otp_hash,
          phone_otp_expires_at,
          phone_otp_attempts,
          phone_otp_sent_at,
          expires_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP + INTERVAL '10 minutes',
          0,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP + INTERVAL '30 minutes'
        )
        `,
        [phone, otpHash]
      );
    }

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Send only after the database transaction commits.
  try {
    await sendPhoneOtp({
      phone,
      otp,
    });
  } catch (error) {
    console.error(
      'Registration phone OTP delivery failed:',
      error.message
    );

    await pool.query(
      `
      UPDATE pending_registrations
      SET
        phone_otp_hash = NULL,
        phone_otp_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE phone = $1
        AND completed_at IS NULL
        AND phone_otp_hash = $2
      `,
      [phone, hashOtp(otp)]
    );

    throw new Error(
      'We could not send your phone verification code. Please try again.'
    );
  }

  return {
    success: true,
    message: 'A verification code has been sent to your phone.',
    registration_step: 'phone_verification',
    expires_in_seconds: OTP_EXPIRY_MINUTES * 60,
    development_otp: getDevelopmentOtp(otp),
  };
};

// ============================================================
// VERIFY PHONE OTP
// POST /api/auth/registration/phone/verify
// ============================================================

const verifyPhoneOtp = async (phoneInput, otpInput) => {
  const phone = normalizePhone(phoneInput);
  const otp = validateOtp(otpInput);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT *
      FROM pending_registrations
      WHERE phone = $1
        AND completed_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [phone]
    );

    if (!result.rows.length) {
      throw new Error(
        'Registration session expired. Please start again.'
      );
    }

    const pending = result.rows[0];

    if (pending.phone_verified_at) {
      await client.query('COMMIT');

      return {
        success: true,
        phone_verified: true,
        message: 'Phone number already verified.',
      };
    }

    if (
      !pending.phone_otp_hash ||
      !pending.phone_otp_expires_at ||
      new Date(pending.phone_otp_expires_at) <= new Date()
    ) {
      throw new Error(
        'Your phone verification code has expired. Please request another.'
      );
    }

    if (
      pending.phone_otp_attempts >= MAX_OTP_ATTEMPTS
    ) {
      throw new Error(
        'Too many incorrect attempts. Please request a new code.'
      );
    }

    if (!verifyOtpHash(otp, pending.phone_otp_hash)) {
      await client.query(
        `
        UPDATE pending_registrations
        SET
          phone_otp_attempts = phone_otp_attempts + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [pending.id]
      );

      await client.query('COMMIT');

      const error = new Error(
        'Incorrect phone verification code.'
      );

      error.status = 400;
      throw error;
    }

    await client.query(
      `
      UPDATE pending_registrations
      SET
        phone_verified_at = CURRENT_TIMESTAMP,
        phone_otp_hash = NULL,
        phone_otp_expires_at = NULL,
        phone_otp_attempts = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [pending.id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      phone_verified: true,
      message: 'Phone number verified successfully.',
      registration_step: 'email',
    };

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Transaction may already be committed.
    }

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// START EMAIL VERIFICATION
// POST /api/auth/registration/email
// ============================================================

const startEmailVerification = async (
  phoneInput,
  emailInput
) => {
  const phone = normalizePhone(phoneInput);
  const email = normalizeEmail(emailInput);

  const client = await pool.connect();

  let otp;
  let pendingId;

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT *
      FROM pending_registrations
      WHERE phone = $1
        AND completed_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [phone]
    );

    if (!result.rows.length) {
      throw new Error(
        'Please complete phone verification first.'
      );
    }

    const pending = result.rows[0];

    if (!pending.phone_verified_at) {
      throw new Error(
        'Please verify your phone number before continuing.'
      );
    }

    if (
      pending.email_otp_sent_at &&
      pending.email &&
      pending.email.toLowerCase() === email &&
      pending.email_otp_expires_at &&
      new Date(pending.email_otp_expires_at) > new Date()
    ) {
      const elapsed = Math.floor(
        (
          Date.now() -
          new Date(pending.email_otp_sent_at).getTime()
        ) / 1000
      );

      if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
        const error = new Error(
          'Please wait before requesting another email code.'
        );

        error.status = 429;
        error.retryAfter =
          OTP_RESEND_COOLDOWN_SECONDS - elapsed;

        throw error;
      }
    }

    if (await checkEmailExists(client, email)) {
      throw new Error(
        'This email address is already registered. Please log in.'
      );
    }

    otp = generateOtp();
    pendingId = pending.id;

    await client.query(
      `
      UPDATE pending_registrations
      SET
        email = $2,
        email_otp_hash = $3,
        email_otp_expires_at =
          CURRENT_TIMESTAMP + INTERVAL '10 minutes',
        email_otp_attempts = 0,
        email_otp_sent_at = CURRENT_TIMESTAMP,
        email_verified_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [pendingId, email, hashOtp(otp)]
    );

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendRegistrationEmailOtp({
      to: email,
      otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error(
      'Registration email OTP delivery failed:',
      error.message
    );

    await pool.query(
      `
      UPDATE pending_registrations
      SET
        email_otp_hash = NULL,
        email_otp_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND email_otp_hash = $2
      `,
      [pendingId, hashOtp(otp)]
    );

    throw new Error(
      'We could not send your email verification code. Please try again.'
    );
  }

  return {
    success: true,
    message: 'A verification code has been sent to your email.',
    registration_step: 'email_verification',
    expires_in_seconds: OTP_EXPIRY_MINUTES * 60,
    development_otp: getDevelopmentOtp(otp),
  };
};

// ============================================================
// VERIFY EMAIL OTP
// POST /api/auth/registration/email/verify
// ============================================================

const verifyEmailOtp = async (
  phoneInput,
  emailInput,
  otpInput
) => {
  const phone = normalizePhone(phoneInput);
  const email = normalizeEmail(emailInput);
  const otp = validateOtp(otpInput);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT *
      FROM pending_registrations
      WHERE phone = $1
        AND LOWER(email) = LOWER($2)
        AND completed_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [phone, email]
    );

    if (!result.rows.length) {
      throw new Error(
        'Registration session not found or expired.'
      );
    }

    const pending = result.rows[0];

    if (!pending.phone_verified_at) {
      throw new Error(
        'Phone verification must be completed first.'
      );
    }

    if (pending.email_verified_at) {
      await client.query('COMMIT');

      return {
        success: true,
        phone_verified: true,
        email_verified: true,
        message: 'Email address already verified.',
      };
    }

    if (
      !pending.email_otp_hash ||
      !pending.email_otp_expires_at ||
      new Date(pending.email_otp_expires_at) <= new Date()
    ) {
      throw new Error(
        'Your email verification code has expired. Please request another.'
      );
    }

    if (
      pending.email_otp_attempts >= MAX_OTP_ATTEMPTS
    ) {
      throw new Error(
        'Too many incorrect attempts. Please request a new code.'
      );
    }

    if (!verifyOtpHash(otp, pending.email_otp_hash)) {
      await client.query(
        `
        UPDATE pending_registrations
        SET
          email_otp_attempts = email_otp_attempts + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [pending.id]
      );

      await client.query('COMMIT');

      const error = new Error(
        'Incorrect email verification code.'
      );

      error.status = 400;
      throw error;
    }

    await client.query(
      `
      UPDATE pending_registrations
      SET
        email_verified_at = CURRENT_TIMESTAMP,
        email_otp_hash = NULL,
        email_otp_expires_at = NULL,
        email_otp_attempts = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [pending.id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      phone_verified: true,
      email_verified: true,
      message: 'Email address verified successfully.',
      registration_step: 'profile',
    };

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Transaction may already be committed.
    }

    throw error;
  } finally {
    client.release();
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
  normalizePhone,
  normalizeEmail,
};
