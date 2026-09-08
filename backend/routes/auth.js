const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const {
  register,
  login,
} = require('../controllers/authController');

const pool = require('../config/database');

const router = express.Router();


// ============================================================
// REGISTER
// ============================================================

router.post('/register', register);


// ============================================================
// LOGIN
// ============================================================

router.post('/login', login);


// ============================================================
// SEND PHONE OTP
// POST /api/auth/send-phone-otp
//
// The user must already be authenticated.
// The OTP is generated securely and stored as a hash.
// ============================================================

router.post('/send-phone-otp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }


    // ========================================================
    // GET USER
    // ========================================================

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        is_verified
      FROM users
      WHERE id = $1
      `,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const user = userResult.rows[0];

    if (!user.phone) {
      return res.status(400).json({
        success: false,
        message: 'No phone number is registered on this account',
      });
    }


    // ========================================================
    // CHECK WHETHER ALREADY VERIFIED
    // ========================================================

    if (user.is_verified === true) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already verified',
      });
    }


    // ========================================================
    // GENERATE OTP
    // ========================================================

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    const tokenHash = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');


    // ========================================================
    // OTP EXPIRATION
    // 10 MINUTES
    // ========================================================

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );


    // ========================================================
    // INVALIDATE PREVIOUS PHONE OTPs
    // ========================================================

    await pool.query(
      `
      UPDATE security_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_type = 'phone_verification'
        AND used_at IS NULL
      `,
      [user.id]
    );


    // ========================================================
    // STORE HASHED OTP
    // ========================================================

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
        user.id,
        tokenHash,
        expiresAt,
      ]
    );


    // ========================================================
    // AUDIT LOG
    // ========================================================

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
        'Phone verification OTP requested',
        $2,
        $3
      )
      `,
      [
        user.id,
        req.ip || null,
        req.headers['user-agent'] || null,
      ]
    );


    // ========================================================
    // DEVELOPMENT / TESTING
    //
    // IMPORTANT:
    // In production, DO NOT return the OTP.
    // Connect this section to your approved SMS provider.
    // ========================================================

    const response = {
      success: true,
      message:
        'Verification code sent to your registered phone number',
      expires_in: 600,
    };

    if (
      process.env.NODE_ENV !== 'production'
    ) {
      response.test_otp = otp;
    }


    return res.status(200).json(response);

  } catch (error) {
    console.error(
      'Send phone OTP error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to send verification code',
    });
  }
});


// ============================================================
// VERIFY PHONE OTP
// POST /api/auth/verify-phone-otp
//
// Body:
// {
//   "otp": "123456"
// }
// ============================================================

router.post('/verify-phone-otp', async (req, res) => {
  const client = await pool.connect();

  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }


    // ========================================================
    // VALIDATE OTP
    // ========================================================

    const otp = String(
      req.body?.otp || ''
    ).trim();

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must contain exactly 6 digits',
      });
    }


    // ========================================================
    // HASH PROVIDED OTP
    // ========================================================

    const tokenHash = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');


    await client.query('BEGIN');


    // ========================================================
    // GET USER
    // ========================================================

    const userResult = await client.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        is_verified
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const user = userResult.rows[0];


    // ========================================================
    // ALREADY VERIFIED
    // ========================================================

    if (user.is_verified === true) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Phone number is already verified',
      });
    }


    // ========================================================
    // FIND VALID OTP
    // ========================================================

    const tokenResult = await client.query(
      `
      SELECT
        id,
        expires_at
      FROM security_tokens
      WHERE user_id = $1
        AND token_hash = $2
        AND token_type = 'phone_verification'
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [
        user.id,
        tokenHash,
      ]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Invalid or expired verification code',
      });
    }

    const securityToken =
      tokenResult.rows[0];


    // ========================================================
    // MARK OTP AS USED
    // ========================================================

    await client.query(
      `
      UPDATE security_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [securityToken.id]
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
      [user.id]
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
        'Phone number successfully verified using OTP',
        $2,
        $3
      )
      `,
      [
        user.id,
        req.ip || null,
        req.headers['user-agent'] || null,
      ]
    );


    // ========================================================
    // COMMIT
    // ========================================================

    await client.query('COMMIT');


    return res.status(200).json({
      success: true,
      message:
        'Phone number verified successfully',
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
});


// ============================================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================================

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }


    // ========================================================
    // GET USER
    // ========================================================

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        tier_3_method,
        account_limit,
        daily_transfer_limit,
        daily_transfer_used,
        daily_transfer_reset_at,
        is_verified,
        created_at
      FROM users
      WHERE id = $1
      `,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const user = userResult.rows[0];


    // ========================================================
    // GET USER ACCOUNTS
    // ========================================================

    const accountResult = await pool.query(
      `
      SELECT
        id,
        account_number,
        account_type,
        currency,
        balance,
        status,
        created_at
      FROM accounts
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [user.id]
    );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,
      user,
      accounts: accountResult.rows,
    });

  } catch (error) {
    console.error(
      'Get current user error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load account information',
    });
  }
});


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
