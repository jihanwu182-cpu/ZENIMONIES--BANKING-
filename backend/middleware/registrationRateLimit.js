
const crypto = require('crypto');
const pool = require('../config/database');

// ZENIMONIES — DATABASE-BACKED REGISTRATION RATE LIMITER
// Counts client IP and customer identity.
// Raw IPs, phone numbers and emails are never stored.

let cleanupCounter = 0;

// ============================================================
// NORMALIZE CUSTOMER IDENTITY
// ============================================================

const normalizeIdentity = (value, field) => {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) return null;

  if (field === 'phone') {
    const digits = normalized.replace(/[^0-9]/g, '');

    // Nigerian local format: 08012345678
    if (/^0\d{10}$/.test(digits)) {
      return `234${digits.substring(1)}`;
    }

    // Nigerian international format: 2348012345678
    // Also handles +2348012345678 after punctuation removal.
    if (/^234\d{10}$/.test(digits)) {
      return digits;
    }

    // Retain a consistent digits-only identity for invalid
    // inputs too, so formatting changes do not bypass limits.
    return digits.length >= 7 ? digits : null;
  }

  if (field === 'email') {
    return normalized.toLowerCase();
  }

  return normalized.toLowerCase();
};

// ============================================================
// HASH RATE-LIMIT KEYS
// ============================================================

const hashKey = (value) =>
  crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');

// ============================================================
// RATE LIMIT FACTORY
// ============================================================

const createRegistrationRateLimit = ({
  windowSeconds,
  maxRequests,
  bucket,
  identityField,
  maxIdentityRequests,
}) => {
  if (
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    !Number.isInteger(maxRequests) ||
    maxRequests < 1 ||
    typeof bucket !== 'string' ||
    !bucket.trim() ||
    (
      identityField !== undefined &&
      !['phone', 'email'].includes(identityField)
    ) ||
    (
      maxIdentityRequests !== undefined &&
      (
        !Number.isInteger(maxIdentityRequests) ||
        maxIdentityRequests < 1
      )
    )
  ) {
    throw new Error(
      'Invalid registration rate-limit configuration.'
    );
  }

  return async (req, res, next) => {
    let client;

    try {
      const ip =
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      const counters = [
        {
          keyHash: hashKey(`${bucket}:ip:${ip}`),
          limit: maxRequests,
        },
      ];

      if (identityField) {
        const identity = normalizeIdentity(
          req.body?.[identityField],
          identityField
        );

        if (identity) {
          counters.push({
            keyHash: hashKey(
              `${bucket}:${identityField}:${identity}`
            ),
            limit:
              maxIdentityRequests || maxRequests,
          });
        }
      }

      client = await pool.connect();

      await client.query('BEGIN');

      let blocked = null;

      for (const counter of counters) {
        const result = await client.query(
          `
          INSERT INTO api_rate_limits (
            key_hash,
            window_start,
            request_count,
            updated_at
          )
          VALUES (
            $1,
            CURRENT_TIMESTAMP,
            1,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (key_hash)
          DO UPDATE SET
            window_start = CASE
              WHEN api_rate_limits.window_start <=
                CURRENT_TIMESTAMP -
                ($2 * INTERVAL '1 second')
              THEN CURRENT_TIMESTAMP
              ELSE api_rate_limits.window_start
            END,
            request_count = CASE
              WHEN api_rate_limits.window_start <=
                CURRENT_TIMESTAMP -
                ($2 * INTERVAL '1 second')
              THEN 1
              ELSE api_rate_limits.request_count + 1
            END,
            updated_at = CURRENT_TIMESTAMP
          RETURNING request_count, window_start
          `,
          [counter.keyHash, windowSeconds]
        );

        const count = Number(
          result.rows[0].request_count
        );

        if (count > counter.limit) {
          const retryAfter = Math.max(
            1,
            Math.ceil(
              (
                new Date(
                  result.rows[0].window_start
                ).getTime() +
                windowSeconds * 1000 -
                Date.now()
              ) / 1000
            )
          );

          blocked = retryAfter;
          break;
        }
      }

      await client.query('COMMIT');

      if (blocked !== null) {
        res.set('Retry-After', String(blocked));

        return res.status(429).json({
          success: false,
          message:
            'Too many registration requests. Please try again later.',
          retry_after_seconds: blocked,
        });
      }

      cleanupCounter += 1;

      if (cleanupCounter % 500 === 0) {
        pool.query(
          `
          DELETE FROM api_rate_limits
          WHERE window_start <
            CURRENT_TIMESTAMP - INTERVAL '2 days'
          `
        ).catch((error) => {
          console.error(
            'Registration rate-limit cleanup failed:',
            error.message
          );
        });
      }

      return next();

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          // Transaction may already be closed.
        }
      }

      console.error(
        'Registration rate limiter database error:',
        error.message
      );

      return res.status(503).json({
        success: false,
        message:
          'Registration security service is temporarily unavailable. Please try again.',
      });

    } finally {
      if (client) {
        client.release();
      }
    }
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createRegistrationRateLimit,
};
