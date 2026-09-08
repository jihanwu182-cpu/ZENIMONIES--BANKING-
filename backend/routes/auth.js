const express = require('express');
const jwt = require('jsonwebtoken');

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
// GET CURRENT USER
// GET /api/auth/me
// ============================================================

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      `SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status,
        kyc_status,
        is_verified,
        created_at
       FROM users
       WHERE id = $1`,
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
      `SELECT
        id,
        account_number,
        account_type,
        currency,
        balance,
        status,
        created_at
       FROM accounts
       WHERE user_id = $1
       ORDER BY created_at ASC`,
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
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load account information',
    });
  }
});


module.exports = router;
