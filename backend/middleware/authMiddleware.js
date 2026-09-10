const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    // ============================================================
    // CHECK AUTHORIZATION HEADER
    // ============================================================

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing',
      });
    }

    // ============================================================
    // CHECK JWT SECRET
    // ============================================================

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured',
      });
    }

    // ============================================================
    // VERIFY JWT
    // ============================================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    // ============================================================
    // GET CURRENT USER
    // ============================================================

    const result = await pool.query(
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
        tier,
        is_verified
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    // ============================================================
    // CHECK ACCOUNT STATUS
    // ============================================================

    if (
      user.status &&
      String(user.status).toLowerCase() !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active',
      });
    }

    // ============================================================
    // ATTACH USER TO REQUEST
    // ============================================================

    req.user = user;

    // Keep the authenticated user ID easily available.
    req.userId = user.id;

    next();
  } catch (error) {
    console.error(
      'User authentication error:',
      error
    );

    // ============================================================
    // JWT ERRORS
    // ============================================================

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    // ============================================================
    // DATABASE / SERVER ERROR
    // ============================================================

    return res.status(500).json({
      success: false,
      message: 'Unable to authenticate user',
    });
  }
};

module.exports = authMiddleware;
