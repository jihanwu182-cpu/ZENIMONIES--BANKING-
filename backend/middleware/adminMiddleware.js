const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const adminMiddleware = async (req, res, next) => {
  try {
    // --------------------------------------------------------
    // CHECK AUTHORIZATION HEADER
    // --------------------------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing',
      });
    }

    // --------------------------------------------------------
    // CHECK JWT SECRET
    // --------------------------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured',
      });
    }

    // --------------------------------------------------------
    // VERIFY TOKEN
    // --------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    // --------------------------------------------------------
    // GET USER FROM DATABASE
    // --------------------------------------------------------

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        status
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    // --------------------------------------------------------
    // CHECK ADMIN ROLE
    // --------------------------------------------------------

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator access required',
      });
    }

    // --------------------------------------------------------
    // CHECK ACCOUNT STATUS
    // --------------------------------------------------------

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Administrator account is not active',
      });
    }

    // --------------------------------------------------------
    // ATTACH ADMIN TO REQUEST
    // --------------------------------------------------------

    req.user = user;

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to authenticate administrator',
    });
  }
};

module.exports = adminMiddleware;
