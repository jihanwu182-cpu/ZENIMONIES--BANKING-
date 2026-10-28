
const crypto = require('crypto');
const pool = require('../config/database');
const {
  sendContactChangeEmail,
} = require('../services/contactChangeEmailService');

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const getUserId = (req) =>
  req.user?.id || req.user?.userId || req.userId || null;

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return email;
};

const createOtp = () =>
  String(crypto.randomInt(100000, 1000000));

const sendEmailChangeOtp = async (req, res) => {
  const userId = getUserId(req);
  const email = normalizeEmail(req.body?.email);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Please sign in again.',
    });
  }

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email address.',
    });
  }

  let client;
  let otp;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT email
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (!userResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    if (normalizeEmail(userResult.rows[0].email) === email) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Enter an email address different from your current one.',
      });
    }

    const duplicate = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = $1 AND id <> $2
       LIMIT 1`,
      [email, userId]
    );

    if (duplicate.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered.',
      });
    }

    const pendingDuplicate = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(pending_email) = $1 AND id <> $2
       LIMIT 1`,
      [email, userId]
    );

    if (pendingDuplicate.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'This email address is already being verified for another account.',
      });
    }

    const recent = await client.query(
      `SELECT created_at
       FROM security_tokens
       WHERE user_id = $1
         AND token_type = 'email_change'
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (recent.rowCount) {
      const ageSeconds =
        (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000;

      if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another code.',
          retry_after_seconds: Math.ceil(
            RESEND_COOLDOWN_SECONDS - ageSeconds
          ),
        });
      }
    }

    await client.query(
      `UPDATE security_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND token_type = 'email_change'
         AND used_at IS NULL`,
      [userId]
    );

    otp = createOtp();
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    await client.query(
      `INSERT INTO security_tokens
         (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, 'email_change', $3)`,
      [userId, hashOtp(otp), expiresAt]
    );

    await client.query(
      `UPDATE users
       SET pending_email = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [email, userId]
    );

    await client.query('COMMIT');

    try {
      await sendContactChangeEmail({ to: email, otp });
    } catch (emailError) {
      console.error(
        'Email-change delivery failed:',
        emailError.message
      );

      await pool.query(
        `UPDATE security_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND token_type = 'email_change'
           AND used_at IS NULL`,
        [userId]
      );

      await pool.query(
        `UPDATE users
         SET pending_email = NULL
         WHERE id = $1 AND pending_email = $2`,
        [userId, email]
      );

      return res.status(502).json({
        success: false,
        message: 'We could not send the verification email. Your current email has not changed.',
      });
    }

    return res.json({
      success: true,
      message: 'A verification code has been sent to your new email address.',
      expires_in_seconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    console.error('Start email change error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to start the email change.',
    });
  } finally {
    if (client) client.release();
  }
};

const verifyEmailChangeOtp = async (req, res) => {
  const userId = getUserId(req);
  const otp = String(req.body?.otp || '').trim();

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Please sign in again.',
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Enter the six-digit verification code.',
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT email, pending_email
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (!userResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    const user = userResult.rows[0];

    if (!user.pending_email) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Start an email change first.',
      });
    }

    const tokenResult = await client.query(
      `SELECT id, token_hash, attempts
       FROM security_tokens
       WHERE user_id = $1
         AND token_type = 'email_change'
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (!tokenResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Your code has expired. Request a new one.',
      });
    }

    const token = tokenResult.rows[0];
    const attempts = Number(token.attempts || 0);

    if (attempts >= MAX_ATTEMPTS) {
      await client.query(
        `UPDATE security_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [token.id]
      );

      await client.query(
        `UPDATE users SET pending_email = NULL WHERE id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect codes. Request a new verification code.',
      });
    }

    const storedHash = Buffer.from(
      String(token.token_hash || ''),
      'hex'
    );
    const suppliedHash = Buffer.from(hashOtp(otp), 'hex');

    const matches =
      storedHash.length === 32 &&
      storedHash.length === suppliedHash.length &&
      crypto.timingSafeEqual(storedHash, suppliedHash);

    if (!matches) {
      const nextAttempts = attempts + 1;
      const exhausted = nextAttempts >= MAX_ATTEMPTS;

      await client.query(
        `UPDATE security_tokens
         SET attempts = $2,
             used_at = CASE
               WHEN $2 >= $3 THEN CURRENT_TIMESTAMP
               ELSE used_at
             END
         WHERE id = $1`,
        [token.id, nextAttempts, MAX_ATTEMPTS]
      );

      if (exhausted) {
        await client.query(
          `UPDATE users SET pending_email = NULL WHERE id = $1`,
          [userId]
        );
      }

      await client.query('COMMIT');

      return res.status(exhausted ? 429 : 400).json({
        success: false,
        message: exhausted
          ? 'Too many incorrect codes. Request a new verification code.'
          : 'The verification code is incorrect.',
        attempts_remaining: Math.max(
          0,
          MAX_ATTEMPTS - nextAttempts
        ),
      });
    }

    const duplicate = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = $1 AND id <> $2
       LIMIT 1`,
      [normalizeEmail(user.pending_email), userId]
    );

    if (duplicate.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered.',
      });
    }

    await client.query(
      `UPDATE users
       SET email = pending_email,
           pending_email = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE security_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND token_type = 'email_change'
         AND used_at IS NULL`,
      [userId]
    );

    await client.query(
      `INSERT INTO audit_logs
         (user_id, action, description, ip_address, user_agent)
       VALUES
         ($1, 'EMAIL_ADDRESS_CHANGED',
          'Customer verified and changed registered email address.',
          $2, $3)`,
      [userId, req.ip || null, req.get('user-agent') || null]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Your email address has been changed successfully.',
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    console.error('Verify email change error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to verify the new email address.',
    });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
};
