const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 10;
const BCRYPT_ROUNDS = 12;

// ============================================================
// TRANSACTION PIN SERVICE
// ============================================================
//
// Purpose:
// - 4-digit Transaction PIN ONLY
//
// NOT used for:
// - Account Unlock Passcode
// - Password
// - Passkey
// - Virtual Card PIN
//
// Security:
// - Plaintext PIN is never stored.
// - PIN is hashed with bcrypt.
// - Failed attempts are tracked server-side.
// - Temporary lockout is enforced server-side.
// - Audit logs never contain the actual PIN.
// ============================================================

// ============================================================
// VALIDATION
// ============================================================

const isValidTransactionPin = (pin) => {
  return /^\d{4}$/.test(
    String(pin || '').trim()
  );
};

const normalizeTransactionPin = (pin) => {
  return String(pin || '').trim();
};

// ============================================================
// AUDIT LOG
// ============================================================

const writeAuditLog = async ({
  userId,
  action,
  description,
  ipAddress,
  userAgent,
}) => {
  try {
    await pool.query(
      `
        INSERT INTO audit_logs (
          user_id,
          action,
          description,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        userId || null,
        action,
        description || null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (error) {
    console.error(
      'Transaction PIN audit log error:',
      error.message
    );
  }
};

// ============================================================
// GET TRANSACTION PIN RECORD
// ============================================================

const getTransactionPinRecord = async (
  userId
) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        pin_hash,
        failed_attempts,
        locked_until,
        last_failed_at,
        last_used_at,
        created_at,
        updated_at
      FROM transaction_pins
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

// ============================================================
// CHECK LOCK STATUS
// ============================================================

const getLockStatus = (record) => {
  if (!record?.locked_until) {
    return {
      locked: false,
      lockedUntil: null,
    };
  }

  const lockedUntil = new Date(
    record.locked_until
  );

  if (
    Number.isNaN(
      lockedUntil.getTime()
    )
  ) {
    return {
      locked: false,
      lockedUntil: null,
    };
  }

  if (
    Date.now() >=
    lockedUntil.getTime()
  ) {
    return {
      locked: false,
      lockedUntil: null,
    };
  }

  return {
    locked: true,
    lockedUntil,
  };
};

// ============================================================
// CREATE TRANSACTION PIN
// ============================================================

const createTransactionPin = async ({
  userId,
  pin,
  ipAddress,
  userAgent,
}) => {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  const normalizedPin =
    normalizeTransactionPin(pin);

  if (
    !isValidTransactionPin(
      normalizedPin
    )
  ) {
    const error = new Error(
      'Transaction PIN must contain exactly 4 digits.'
    );

    error.code =
      'INVALID_TRANSACTION_PIN';

    throw error;
  }

  const existingRecord =
    await getTransactionPinRecord(
      userId
    );

  if (existingRecord) {
    const error = new Error(
      'A Transaction PIN already exists.'
    );

    error.code =
      'TRANSACTION_PIN_ALREADY_EXISTS';

    throw error;
  }

  const pinHash =
    await bcrypt.hash(
      normalizedPin,
      BCRYPT_ROUNDS
    );

  const result = await pool.query(
    `
      INSERT INTO transaction_pins (
        user_id,
        pin_hash,
        failed_attempts,
        locked_until,
        last_failed_at,
        last_used_at
      )
      VALUES (
        $1,
        $2,
        0,
        NULL,
        NULL,
        NULL
      )
      RETURNING
        id,
        user_id,
        failed_attempts,
        locked_until,
        created_at,
        updated_at
    `,
    [
      userId,
      pinHash,
    ]
  );

  await writeAuditLog({
    userId,
    action:
      'transaction_pin_created',
    description:
      'A 4-digit Transaction PIN was created.',
    ipAddress,
    userAgent,
  });

  return {
    success: true,

    transactionPinId:
      result.rows[0].id,

    failedAttempts: 0,

    lockedUntil: null,
  };
};

// ============================================================
// CHANGE TRANSACTION PIN
// ============================================================

const changeTransactionPin = async ({
  userId,
  currentPin,
  newPin,
  ipAddress,
  userAgent,
}) => {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  const normalizedCurrentPin =
    normalizeTransactionPin(
      currentPin
    );

  const normalizedNewPin =
    normalizeTransactionPin(
      newPin
    );

  if (
    !isValidTransactionPin(
      normalizedCurrentPin
    )
  ) {
    const error = new Error(
      'Current Transaction PIN must contain exactly 4 digits.'
    );

    error.code =
      'INVALID_CURRENT_TRANSACTION_PIN';

    throw error;
  }

  if (
    !isValidTransactionPin(
      normalizedNewPin
    )
  ) {
    const error = new Error(
      'New Transaction PIN must contain exactly 4 digits.'
    );

    error.code =
      'INVALID_NEW_TRANSACTION_PIN';

    throw error;
  }

  if (
    normalizedCurrentPin ===
    normalizedNewPin
  ) {
    const error = new Error(
      'Your new Transaction PIN must be different from the current PIN.'
    );

    error.code =
      'SAME_TRANSACTION_PIN';

    throw error;
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const result =
      await client.query(
        `
          SELECT
            id,
            user_id,
            pin_hash,
            failed_attempts,
            locked_until
          FROM transaction_pins
          WHERE user_id = $1
          FOR UPDATE
        `,
        [userId]
      );

    if (!result.rows.length) {
      const error = new Error(
        'Transaction PIN has not been created yet.'
      );

      error.code =
        'TRANSACTION_PIN_NOT_SET';

      throw error;
    }

    const record =
      result.rows[0];

    const lockStatus =
      getLockStatus(record);

    if (lockStatus.locked) {
      const error = new Error(
        'Transaction PIN is temporarily locked.'
      );

      error.code =
        'TRANSACTION_PIN_LOCKED';

      error.lockedUntil =
        lockStatus.lockedUntil.toISOString();

      throw error;
    }

    const currentMatches =
      await bcrypt.compare(
        normalizedCurrentPin,
        record.pin_hash
      );

    if (!currentMatches) {
      const failedAttempts =
        Number(
          record.failed_attempts || 0
        ) + 1;

      let lockedUntil = null;

      if (
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
      ) {
        lockedUntil =
          new Date(
            Date.now() +
              LOCK_DURATION_MINUTES *
                60 *
                1000
          );
      }

      await client.query(
        `
          UPDATE transaction_pins
          SET
            failed_attempts = $1,
            locked_until = $2,
            last_failed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `,
        [
          failedAttempts,
          lockedUntil,
          record.id,
        ]
      );

      await client.query(
        'COMMIT'
      );

      await writeAuditLog({
        userId,
        action:
          'transaction_pin_change_failed',
        description:
          failedAttempts >=
          MAX_FAILED_ATTEMPTS
            ? 'Transaction PIN change failed and the PIN was temporarily locked.'
            : 'Transaction PIN change failed because the current PIN was incorrect.',
        ipAddress,
        userAgent,
      });

      const error = new Error(
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
          ? 'Transaction PIN is temporarily locked.'
          : 'Current Transaction PIN is incorrect.'
      );

      error.code =
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
          ? 'TRANSACTION_PIN_LOCKED'
          : 'INCORRECT_TRANSACTION_PIN';

      error.failedAttempts =
        failedAttempts;

      error.maxFailedAttempts =
        MAX_FAILED_ATTEMPTS;

      error.remainingAttempts =
        Math.max(
          MAX_FAILED_ATTEMPTS -
            failedAttempts,
          0
        );

      if (lockedUntil) {
        error.lockedUntil =
          lockedUntil.toISOString();
      }

      throw error;
    }

    const newPinHash =
      await bcrypt.hash(
        normalizedNewPin,
        BCRYPT_ROUNDS
      );

    await client.query(
      `
        UPDATE transaction_pins
        SET
          pin_hash = $1,
          failed_attempts = 0,
          locked_until = NULL,
          last_failed_at = NULL,
          last_used_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        newPinHash,
        record.id,
      ]
    );

    await client.query(
      'COMMIT'
    );

    await writeAuditLog({
      userId,
      action:
        'transaction_pin_changed',
      description:
        'The 4-digit Transaction PIN was changed successfully.',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      failedAttempts: 0,
      lockedUntil: null,
    };
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Transaction PIN rollback error:',
        rollbackError.message
      );
    }

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// VERIFY TRANSACTION PIN
// ============================================================
//
// This will later be used by transfers, payments,
// bills, airtime, data, and other money-moving operations.
// ============================================================

const verifyTransactionPin = async ({
  userId,
  pin,
  ipAddress,
  userAgent,
}) => {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  const normalizedPin =
    normalizeTransactionPin(pin);

  if (
    !isValidTransactionPin(
      normalizedPin
    )
  ) {
    const error = new Error(
      'Transaction PIN must contain exactly 4 digits.'
    );

    error.code =
      'INVALID_TRANSACTION_PIN';

    throw error;
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const result =
      await client.query(
        `
          SELECT
            id,
            user_id,
            pin_hash,
            failed_attempts,
            locked_until
          FROM transaction_pins
          WHERE user_id = $1
          FOR UPDATE
        `,
        [userId]
      );

    if (!result.rows.length) {
      await client.query(
        'ROLLBACK'
      );

      const error = new Error(
        'Transaction PIN has not been created.'
      );

      error.code =
        'TRANSACTION_PIN_NOT_SET';

      throw error;
    }

    const record =
      result.rows[0];

    const lockStatus =
      getLockStatus(record);

    if (lockStatus.locked) {
      await client.query(
        'ROLLBACK'
      );

      const error = new Error(
        'Transaction PIN is temporarily locked.'
      );

      error.code =
        'TRANSACTION_PIN_LOCKED';

      error.failedAttempts =
        Number(
          record.failed_attempts || 0
        );

      error.maxFailedAttempts =
        MAX_FAILED_ATTEMPTS;

      error.lockedUntil =
        lockStatus.lockedUntil.toISOString();

      throw error;
    }

    const matches =
      await bcrypt.compare(
        normalizedPin,
        record.pin_hash
      );

    if (!matches) {
      const failedAttempts =
        Number(
          record.failed_attempts || 0
        ) + 1;

      let lockedUntil = null;

      if (
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
      ) {
        lockedUntil =
          new Date(
            Date.now() +
              LOCK_DURATION_MINUTES *
                60 *
                1000
          );
      }

      await client.query(
        `
          UPDATE transaction_pins
          SET
            failed_attempts = $1,
            locked_until = $2,
            last_failed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `,
        [
          failedAttempts,
          lockedUntil,
          record.id,
        ]
      );

      await client.query(
        'COMMIT'
      );

      await writeAuditLog({
        userId,
        action:
          'transaction_pin_failed',
        description:
          failedAttempts >=
          MAX_FAILED_ATTEMPTS
            ? 'Incorrect Transaction PIN entered. PIN temporarily locked.'
            : 'Incorrect Transaction PIN entered.',
        ipAddress,
        userAgent,
      });

      const error = new Error(
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
          ? 'Transaction PIN is temporarily locked.'
          : 'Incorrect Transaction PIN.'
      );

      error.code =
        failedAttempts >=
        MAX_FAILED_ATTEMPTS
          ? 'TRANSACTION_PIN_LOCKED'
          : 'INCORRECT_TRANSACTION_PIN';

      error.failedAttempts =
        failedAttempts;

      error.remainingAttempts =
        Math.max(
          MAX_FAILED_ATTEMPTS -
            failedAttempts,
          0
        );

      error.maxFailedAttempts =
        MAX_FAILED_ATTEMPTS;

      error.fallbackRequired =
        failedAttempts >=
        MAX_FAILED_ATTEMPTS;

      if (lockedUntil) {
        error.lockedUntil =
          lockedUntil.toISOString();
      }

      throw error;
    }

    await client.query(
      `
        UPDATE transaction_pins
        SET
          failed_attempts = 0,
          locked_until = NULL,
          last_failed_at = NULL,
          last_used_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [record.id]
    );

    await client.query(
      'COMMIT'
    );

    await writeAuditLog({
      userId,
      action:
        'transaction_pin_verified',
      description:
        'The 4-digit Transaction PIN was verified successfully.',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      verified: true,
      failedAttempts: 0,
      remainingAttempts:
        MAX_FAILED_ATTEMPTS,
      maxFailedAttempts:
        MAX_FAILED_ATTEMPTS,
      fallbackRequired: false,
      lockedUntil: null,
    };
  } catch (error) {
    if (
      error?.code ===
        'INCORRECT_TRANSACTION_PIN' ||
      error?.code ===
        'TRANSACTION_PIN_LOCKED'
    ) {
      throw error;
    }

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Transaction PIN verification rollback error:',
        rollbackError.message
      );
    }

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// TRANSACTION PIN STATUS
// ============================================================

const getTransactionPinStatus =
  async (userId) => {
    if (!userId) {
      throw new Error(
        'User ID is required.'
      );
    }

    const record =
      await getTransactionPinRecord(
        userId
      );

    if (!record) {
      return {
        exists: false,
        failedAttempts: 0,
        maxFailedAttempts:
          MAX_FAILED_ATTEMPTS,
        locked: false,
        lockedUntil: null,
        lastUsedAt: null,
        createdAt: null,
      };
    }

    const lockStatus =
      getLockStatus(record);

    return {
      exists: true,

      failedAttempts:
        Number(
          record.failed_attempts || 0
        ),

      maxFailedAttempts:
        MAX_FAILED_ATTEMPTS,

      locked:
        lockStatus.locked,

      lockedUntil:
        lockStatus.locked
          ? lockStatus.lockedUntil.toISOString()
          : null,

      lastUsedAt:
        record.last_used_at
          ? new Date(
              record.last_used_at
            ).toISOString()
          : null,

      createdAt:
        record.created_at
          ? new Date(
              record.created_at
            ).toISOString()
          : null,
    };
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createTransactionPin,
  changeTransactionPin,
  verifyTransactionPin,
  getTransactionPinStatus,
  isValidTransactionPin,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MINUTES,
};
