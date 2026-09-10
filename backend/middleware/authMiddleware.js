const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    // ============================================================
    // 1. CHECK AUTHORIZATION HEADER
    // ============================================================

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader
      .substring(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing',
      });
    }

    // ============================================================
    // 2. CHECK JWT SECRET
    // ============================================================

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured',
      });
    }

    // ============================================================
    // 3. VERIFY JWT
    // ============================================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (jwtError) {
      console.error(
        'JWT verification failed:',
        jwtError.message
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid or expired authentication token',
      });
    }

    // ============================================================
    // 4. GET USER ID FROM TOKEN
    // ============================================================

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded.user_id ||
      decoded.sub;

    if (!userId) {
      console.error(
        'JWT does not contain a user ID:',
        decoded
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid authentication token',
      });
    }

    // ============================================================
    // 5. LOAD USER
    //
    // IMPORTANT:
    // Only use columns that are required for authentication.
    // KYC-specific fields are loaded separately by KYC routes.
    // ============================================================

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status
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
    // 6. CHECK ACCOUNT STATUS
    // ============================================================

    if (
      user.status &&
      String(user.status).toLowerCase() !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Your account is not active',
      });
    }

    // ============================================================
    // 7. ATTACH USER TO REQUEST
    // ============================================================

    req.user = user;
    req.userId = user.id;

    // ============================================================
    // 8. CONTINUE
    // ============================================================

    next();
  } catch (error) {
    console.error(
      'User authentication error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to authenticate user',
    });
  }
};

module.exports = authMiddleware;
