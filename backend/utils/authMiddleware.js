const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
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

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured',
      });
    }

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

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }
};

module.exports = {
  authenticateToken,
};
