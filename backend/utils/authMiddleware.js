const jwt = require('jsonwebtoken');
// ============================================================
// ZENIMONIES BANKING — AUTHENTICATION MIDDLEWARE
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
  const authHeader = req.headers.authorization;
  // ----------------------------------------------------------
  // CHECK AUTHORIZATION HEADER
  // ----------------------------------------------------------
  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }
  // ----------------------------------------------------------
  // EXTRACT TOKEN
  // ----------------------------------------------------------
  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is missing',
      code: 'TOKEN_MISSING',
    });
  }
  // ----------------------------------------------------------
  // CHECK JWT SECRET
  // ----------------------------------------------------------
  const jwtSecret = process.env.JWT_SECRET;
  if (
    typeof jwtSecret !== 'string' ||
    !jwtSecret.trim()
  ) {
    console.error(
      '[AUTH] JWT_SECRET is not configured'
    );
    return res.status(500).json({
      success: false,
      message: 'Authentication service is unavailable',
      code: 'AUTH_CONFIGURATION_ERROR',
    });
  }
  // ----------------------------------------------------------
  // VERIFY JWT
  // ----------------------------------------------------------
  try {
    const decoded = jwt.verify(
      token,
      jwtSecret
    );
    // --------------------------------------------------------
    // VALIDATE TOKEN PAYLOAD
    // --------------------------------------------------------
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof decoded.userId !== 'string' ||
      !decoded.userId.trim()
    ) {
      console.warn(
        '[AUTH] Token contains an invalid user payload'
      );
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        code: 'TOKEN_INVALID',
      });
    }
    // --------------------------------------------------------
    // ATTACH AUTHENTICATED USER
    // --------------------------------------------------------
    req.user = {
      id: decoded.userId,
      role: decoded.role || 'user',
    };
    return next();
  } catch (error) {
    // --------------------------------------------------------
    // EXPIRED TOKEN
    // --------------------------------------------------------
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    // --------------------------------------------------------
    // INVALID TOKEN
    // --------------------------------------------------------
    if (error.name === 'JsonWebTokenError') {
      console.warn(
        '[AUTH] Invalid JWT rejected'
      );
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        code: 'TOKEN_INVALID',
      });
    }
    // --------------------------------------------------------
    // OTHER AUTHENTICATION ERRORS
    // --------------------------------------------------------
    console.error(
      '[AUTH] Unexpected verification error:',
      error.message
    );
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};
// ============================================================
// EXPORT
// ============================================================
module.exports = {
  authenticateToken,
};
