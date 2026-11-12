
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES — DATABASE-BACKED REGISTRATION RATE LIMITER
// ============================================================

const createRegistrationRateLimit = ({
  windowSeconds,
  maxRequests,
  bucket,
}) => {
  if (
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    !Number.isInteger(maxRequests) ||
    maxRequests < 1 ||
    typeof bucket !== 'string' ||
    !bucket.trim()
  ) {
    throw new Error('Invalid registration rate-limit configuration.');
  }

  return async (req, res, next) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';

      // Store only a hash, not the raw IP address.
      const keyHash = crypto
        .createHash('sha256')
        .update(`${bucket}:${ip}`)
        .digest('hex');

      const result = await pool.query(
        `
        INSERT INTO api_rate_limits (
          key_hash,
          window_start,
          request_count
        )
        VALUES (
          $1,
          CURRENT_TIMESTAMP,
          1
        )
        ON CONFLICT (key_hash)
        DO UPDATE SET
          window_start = CASE
            WHEN api_rate_limits.window_start <=
              CURRENT_TIMESTAMP - ($2 * INTERVAL '1 second')
            THEN CURRENT_TIMESTAMP
            ELSE api_rate_limits.window_start
          END,
          request_count = CASE
            WHEN api_rate_limits.window_start <=
              CURRENT_TIMESTAMP - ($2 * INTERVAL '1 second')
            THEN 1
            ELSE api_rate_limits.request_count + 1
          END
        RETURNING
          request_count,
          window_start
        `,
        [keyHash, windowSeconds]
      );

      const count = Number(result.rows[0].request_count);

      if (count > maxRequests) {
        const retryAfter = Math.max(
          1,
          Math.ceil(
            (
              new Date(result.rows[0].window_start).getTime() +
              windowSeconds * 1000 -
              Date.now()
            ) / 1000
          )
        );

        res.set('Retry-After', String(retryAfter));

        return res.status(429).json({
          success: false,
          message: 'Too many registration requests. Please try again later.',
          retry_after_seconds: retryAfter,
        });
      }

      return next();
    } catch (error) {
      console.error(
        'Registration rate limiter database error:',
        error.message
      );

      // Fail closed: do not allow unprotected registration
      // requests when the rate-limit database check fails.
      return res.status(503).json({
        success: false,
        message: 'Registration security service is temporarily unavailable. Please try again.',
      });
    }
  };
};

module.exports = {
  createRegistrationRateLimit,
};
