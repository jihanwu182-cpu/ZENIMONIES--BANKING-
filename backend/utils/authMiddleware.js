const jwt = require('jsonwebtoken');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// Requires:
// Authorization: Bearer YOUR_JWT_TOKEN
//
// On success:
// req.user = {
//   id: decoded.userId,
//   role: decoded.role
// }
// ============================================================

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // --------------------------------------------------------
    // CHECK AUTHORIZATION HEADER
    // --------------------------------------------------------

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // --------------------------------------------------------
    // EXTRACT TOKEN
    // --------------------------------------------------------

    const token = authHeader.substring(7).trim();

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
      console.error(
        'JWT_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured',
      });
    }

    // --------------------------------------------------------
    // VERIFY TOKEN
    // --------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // --------------------------------------------------------
    // CHECK USER ID
    // --------------------------------------------------------

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authentication token',
      });
    }

    // --------------------------------------------------------
    // ATTACH USER TO REQUEST
    // --------------------------------------------------------

    req.user = {
      id: decoded.userId,
      role: decoded.role || 'user',
    };

    // --------------------------------------------------------
    // CONTINUE
    // --------------------------------------------------------

    return next();

  } catch (error) {
    console.error(
      'Authentication error:',
      error
    );

    // --------------------------------------------------------
    // EXPIRED TOKEN
    // --------------------------------------------------------

    if (
      error &&
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication token has expired',
      });
    }

    // --------------------------------------------------------
    // INVALID TOKEN
    // --------------------------------------------------------

    return res.status(401).json({
      success: false,
      message:
        'Invalid authentication token',
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  authenticateToken,
};
