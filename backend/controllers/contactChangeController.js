
const crypto = require('crypto');
const pool = require('../config/database');
const { sendPhoneOtp, formatPhone } = require('../services/termiiService');

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const getUserId = (req) =>
  req.user?.id || req.user?.userId || req.userId || null;

const normalizePhone = (value) => {
  const phone = String(value || '').replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(phone)) return null;

  const normalized = formatPhone(phone);
  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) return null;

  return normalized;
};

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const sendPhoneChangeOtp = async (req, res) => {
  const userId = getUserId(req);
  const phone = normalizePhone(req.body?.phone);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Please sign in again.' });
  }
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Enter a valid phone number with country code.' });
  }

  let client;
  let otp;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT phone, phone_verified, phone_change_used
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const user = result.rows[0];

    if (user.phone_change_used) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        code: 'PHONE_CHANGE_ALREADY_USED',
        message: 'Your one-time phone change has already been used. Contact support if you need assistance.'
      });
    }

    if (normalizePhone(user.phone) === phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Enter a different phone number.' });
    }

    const existing = await client.query(
      `SELECT id FROM users WHERE phone = $1 AND id <> $2 LIMIT 1`,
      [phone, userId]
    );

    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
    }

    const pending = await client.query(
      `SELECT created_at FROM security_tokens
       WHERE user_id = $1 AND token_type = 'phone_change'
         AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (pending.rowCount) {
      const ageSeconds = (Date.now() - new Date(pending.rows[0].created_at).getTime()) / 1000;
      if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another code.',
          retry_after_seconds: Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds)
        });
      }
    }

    await client.query(
      `UPDATE security_tokens SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND token_type = 'phone_change' AND used_at IS NULL`,
      [userId]
    );

    otp = createOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await client.query(
      `INSERT INTO security_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1, $2, 'phone_change', $3)`,
      [userId, hashOtp(otp), expiresAt]
    );

    await client.query(
      `UPDATE users SET pending_phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [phone, userId]
    );

    await client.query('COMMIT');

    try {
      await sendPhoneOtp({ phone, otp });
    } catch (smsError) {
      console.error('Phone-change SMS delivery failed:', smsError.message);

      await pool.query(
        `UPDATE security_tokens SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND token_type = 'phone_change' AND used_at IS NULL`,
        [userId]
      );

      await pool.query(
        `UPDATE users SET pending_phone = NULL WHERE id = $1 AND pending_phone = $2`,
        [userId, phone]
      );

      return res.status(502).json({
        success: false,
        message: 'We could not send your verification code. Your current phone number has not changed. Please try again.'
      });
    }

    return res.json({
      success: true,
      message: 'A verification code has been sent to your new phone number.',
      expires_in_seconds: OTP_EXPIRY_MINUTES * 60
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('Start phone change error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to start the phone-number change.' });
  } finally {
    if (client) client.release();
  }
};

const verifyPhoneChangeOtp = async (req, res) => {
  const userId = getUserId(req);
  const otp = String(req.body?.otp || '').trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Please sign in again.' });
  }
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'Enter the six-digit verification code.' });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT phone, pending_phone, phone_change_used
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (!userResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const user = userResult.rows[0];

    if (user.phone_change_used) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        code: 'PHONE_CHANGE_ALREADY_USED',
        message: 'Your one-time phone change has already been used.'
      });
    }

    if (!user.pending_phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Start a phone-number change first.' });
    }

    const tokenResult = await client.query(
      `SELECT id, token_hash FROM security_tokens
       WHERE user_id = $1 AND token_type = 'phone_change'
         AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [userId]
    );

    if (!tokenResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Your code has expired. Request a new one.' });
    }

    const token = tokenResult.rows[0];
    const suppliedHash = hashOtp(otp);

    const matches = crypto.timingSafeEqual(
      Buffer.from(token.token_hash, 'hex'),
      Buffer.from(suppliedHash, 'hex')
    );

    if (!matches) {
      const attempts = await client.query(
        `SELECT COUNT(*)::int AS count FROM security_tokens
         WHERE user_id = $1 AND token_type = 'phone_change'
           AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'`,
        [userId]
      );

      if (attempts.rows[0].count >= MAX_ATTEMPTS) {
        await client.query(
          `UPDATE security_tokens SET used_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND token_type = 'phone_change' AND used_at IS NULL`,
          [userId]
        );
        await client.query(
          `UPDATE users SET pending_phone = NULL WHERE id = $1`,
          [userId]
        );
      }

      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'The verification code is incorrect.' });
    }

    const duplicate = await client.query(
      `SELECT id FROM users WHERE phone = $1 AND id <> $2 LIMIT 1`,
      [user.pending_phone, userId]
    );

    if (duplicate.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
    }

    await client.query(
      `UPDATE users
       SET phone = pending_phone,
           pending_phone = NULL,
           phone_verified = TRUE,
           phone_change_used = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE security_tokens SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND token_type = 'phone_change' AND used_at IS NULL`,
      [userId]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, description, ip_address, user_agent)
       VALUES ($1, 'PHONE_NUMBER_CHANGED', 'Customer verified and changed registered phone number.', $2, $3)`,
      [userId, req.ip || null, req.get('user-agent') || null]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Your phone number has been changed and verified. Further self-service phone changes are disabled.',
      phone_verified: true,
      phone_change_used: true
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('Verify phone change error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify the new phone number.' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  sendPhoneChangeOtp,
  verifyPhoneChangeOtp
};
