const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// OTP SETTINGS
// ============================================================

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;


// ============================================================
// HELPERS
// ============================================================

const generateOtp = () => {
  return crypto
    .randomInt(0, 1000000)
    .toString()
    .padStart(OTP_LENGTH, '0');
};


const hashOtp = (otp) => {
  return crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
};


// ============================================================
// SEND PHONE OTP
//
// POST /api/auth/send-phone-otp
//
// The OTP is generated securely and stored as a hash.
// In production, connect the sendOtp() section to an approved
// SMS provider. We do NOT expose the OTP in the API response.
// ============================================================

const sendPhoneOtp = async (req, res) => {
  const userId = req.user.id;

  try {
    const userResult = await pool.query(
      `
      SELECT
        id,
        phone,
        is_verified
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already verified',
      });
    }

    if (!user.phone) {
      return res.status(400).json({
        success: false,
        message: 'No phone number is registered on this account',
      });
    }

    // Invalidate previous unused phone OTPs.
    await pool.query(
      `
      UPDATE security_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_type = 'phone_verification'
        AND used_at IS NULL
      `,
      [userId]
    );

    const otp = generateOtp();
    const tokenHash = hashOtp(otp);

    const expiresAt = new Date(
      Date.now() +
        OTP_EXPIRY_MINUTES * 60 * 1000
    );

    await pool.query(
      `
      INSERT INTO security_tokens (
        user_id,
        token_hash,
        token_type,
        expires_at
      )
      VALUES (
        $1,
        $2,
        'phone_verification',
        $3
      )
      `,
      [
        userId,
        tokenHash,
        expiresAt,
      ]
    );

    // ========================================================
    // SMS PROVIDER INTEGRATION
    // ========================================================
    //
    // Connect an approved SMS provider here.
    //
    // Example:
    //
    // await sendSms(
    //   user.phone,
    //   `Your Zenimonies verification code is ${otp}`
    // );
    //
    // IMPORTANT:
    // Never return the OTP from this endpoint in production.
    //
    // ========================================================

    console.log(
      `Phone OTP generated for user ${userId}`
    );

    await pool.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'phone_otp_requested',
        $2,
        $3,
        $4
      )
      `,
      [
        userId,
        'Phone verification OTP requested',
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        'Verification code has been sent to your registered phone number.',
      expires_in_minutes:
        OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error(
      'Send phone OTP error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to send verification code',
    });
  }
};


// ============================================================
// VERIFY PHONE OTP
//
// POST /api/auth/verify-phone
//
// Body:
// {
//   "otp": "123456"
// }
// ============================================================

const verifyPhoneOtp = async (req, res) => {
  const userId = req.user.id;

  const otp = String(
    req.body?.otp || ''
  ).trim();

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message:
        'OTP must contain exactly 6 digits',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
      SELECT
        id,
        phone,
        is_verified
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Phone number is already verified',
      });
    }

    const tokenHash = hashOtp(otp);

    const tokenResult = await client.query(
      `
      SELECT
        id,
        token_hash,
        expires_at,
        used_at
      FROM security_tokens
      WHERE user_id = $1
        AND token_type = 'phone_verification'
        AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'No active verification code found. Please request a new code.',
      });
    }

    const token = tokenResult.rows[0];

    // ========================================================
    // CHECK EXPIRATION
    // ========================================================

    if (
      new Date(token.expires_at).getTime() <=
      Date.now()
    ) {
      await client.query(
        `
        UPDATE security_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [token.id]
      );

      await client.query('COMMIT');

      return res.status(400).json({
        success: false,
        message:
          'Verification code has expired. Please request a new code.',
      });
    }

    // ========================================================
    // CHECK OTP
    // ========================================================

    if (token.token_hash !== tokenHash) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Invalid verification code.',
      });
    }

    // ========================================================
    // MARK OTP AS USED
    // ========================================================

    await client.query(
      `
      UPDATE security_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [token.id]
    );

    // ========================================================
    // VERIFY USER PHONE
    // ========================================================

    await client.query(
      `
      UPDATE users
      SET
        is_verified = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [userId]
    );

    // ========================================================
    // AUDIT LOG
    // ========================================================

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'phone_verified',
        $2,
        $3,
        $4
      )
      `,
      [
        userId,
        'Phone number successfully verified using OTP',
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Phone number verified successfully.',
      verified: true,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error(
      'Verify phone OTP error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to verify phone number',
    });
  } finally {
    client.release();
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtp,
};
