const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 10;
const BCRYPT_ROUNDS = 12;

/**
 * ============================================================
 * ACCOUNT UNLOCK PASSCODE SERVICE
 * ============================================================
 *
 * Purpose:
 * - 6-digit Account Unlock Passcode ONLY
 *
 * NOT used for:
 * - Transaction authorization
 * - Transaction PIN
 * - Virtual card PIN
 * - Password login
 *
 * Security:
 * - Plaintext passcodes are never stored.
 * - Passcodes are hashed with bcrypt.
 * - Failed attempts are tracked server-side.
 * - Temporary lockout is enforced server-side.
 * - Audit events never contain the actual passcode.
 */

// ============================================================
// VALIDATION
// ============================================================

const isValidPasscode = (passcode) => {
  return /^\d{6}$/.test(String(passcode || '').trim());
};

const normalizePasscode = (passcode) => {
  return String(passcode || '').trim();
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
      'Account Passcode audit log error:',
      error.message
    );
  }
};

// ============================================================
// GET PASSCODE RECORD
// ============================================================

const getPasscodeRecord = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        passcode_hash,
        failed_attempts,
        locked_until,
        last_failed_at,
        last_used_at,
        created_at,
        updated_at
      FROM account_passcodes
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

  const lockedUntil = new Date(record.locked_until);

  if (Number.isNaN(lockedUntil.getTime())) {
    return {
      locked: false,
      lockedUntil: null,
    };
  }

  if (Date.now() >= lockedUntil.getTime()) {
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
// CREATE ACCOUNT PASSCODE
// ============================================================

const createPasscode = async ({
  userId,
  passcode,
  ipAddress,
  userAgent,
}) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const normalizedPasscode = normalizePasscode(passcode);

  if (!isValidPasscode(normalizedPasscode)) {
    const error = new Error(
      'Account Passcode must contain exactly 6 digits.'
    );

    error.code = 'INVALID_PASSCODE';
    throw error;
  }

  const existingRecord = await getPasscodeRecord(userId);

  if (existingRecord) {
    const error = new Error(
      'An Account Passcode already exists.'
    );

    error.code = 'PASSCODE_ALREADY_EXISTS';
    throw error;
  }

  const passcodeHash = await bcrypt.hash(
    normalizedPasscode,
    BCRYPT_ROUNDS
  );

  const result = await pool.query(
    `
      INSERT INTO account_passcodes (
        user_id,
        passcode_hash,
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
    [userId, passcodeHash]
  );

  await writeAuditLog({
    userId,
    action: 'account_passcode_created',
    description:
      'A 6-digit Account Unlock Passcode was created.',
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    passcodeId: result.rows[0].id,
    failedAttempts: 0,
    lockedUntil: null,
  };
};

// ============================================================
// CHANGE ACCOUNT PASSCODE
// ============================================================

const changePasscode = async ({
  userId,
  currentPasscode,
  newPasscode,
  ipAddress,
  userAgent,
}) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const normalizedCurrentPasscode =
    normalizePasscode(currentPasscode);

  const normalizedNewPasscode =
    normalizePasscode(newPasscode);

  if (!isValidPasscode(normalizedCurrentPasscode)) {
    const error = new Error(
      'Current Account Passcode must contain exactly 6 digits.'
    );

    error.code = 'INVALID_CURRENT_PASSCODE';
    throw error;
  }

  if (!isValidPasscode(normalizedNewPasscode)) {
    const error = new Error(
      'New Account Passcode must contain exactly 6 digits.'
    );

    error.code = 'INVALID_NEW_PASSCODE';
    throw error;
  }

  if (
    normalizedCurrentPasscode ===
    normalizedNewPasscode
  ) {
    const error = new Error(
      'New Account Passcode must be different from the current Passcode.'
    );

    error.code = 'SAME_PASSCODE';
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT
          id,
          user_id,
          passcode_hash,
          failed_attempts,
          locked_until
        FROM account_passcodes
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (!result.rows.length) {
      const error = new Error(
        'Account Passcode has not been created yet.'
      );

      error.code = 'PASSCODE_NOT_SET';
      throw error;
    }

    const record = result.rows[0];

    const lockStatus = getLockStatus(record);

    if (lockStatus.locked) {
      const error = new Error(
        'Account Passcode is temporarily locked.'
      );

      error.code = 'PASSCODE_LOCKED';
      error.lockedUntil =
        lockStatus.lockedUntil.toISOString();

      throw error;
    }

    const currentMatches = await bcrypt.compare(
      normalizedCurrentPasscode,
      record.passcode_hash
    );

    if (!currentMatches) {
      const failedAttempts =
        Number(record.failed_attempts || 0) + 1;

      let lockedUntil = null;

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(
          Date.now() +
            LOCK_DURATION_MINUTES * 60 * 1000
        );
      }

      await client.query(
        `
          UPDATE account_passcodes
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

      await client.query('COMMIT');

      await writeAuditLog({
        userId,
        action: 'account_passcode_change_failed',
        description:
          failedAttempts >= MAX_FAILED_ATTEMPTS
            ? 'Account Passcode change failed and the Passcode was temporarily locked.'
            : 'Account Passcode change failed because the current Passcode was incorrect.',
        ipAddress,
        userAgent,
      });

      const error = new Error(
        failedAttempts >= MAX_FAILED_ATTEMPTS
          ? 'Account Passcode is temporarily locked.'
          : 'Current Account Passcode is incorrect.'
      );

      error.code =
        failedAttempts >= MAX_FAILED_ATTEMPTS
          ? 'PASSCODE_LOCKED'
          : 'INCORRECT_PASSCODE';

      error.failedAttempts = failedAttempts;
      error.maxFailedAttempts =
        MAX_FAILED_ATTEMPTS;

      if (lockedUntil) {
        error.lockedUntil =
          lockedUntil.toISOString();
      }

      throw error;
    }

    const newPasscodeHash = await bcrypt.hash(
      normalizedNewPasscode,
      BCRYPT_ROUNDS
    );

    await client.query(
      `
        UPDATE account_passcodes
        SET
          passcode_hash = $1,
          failed_attempts = 0,
          locked_until = NULL,
          last_failed_at = NULL,
          last_used_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [newPasscodeHash, record.id]
    );

    await client.query('COMMIT');

    await writeAuditLog({
      userId,
      action: 'account_passcode_changed',
      description:
        'The 6-digit Account Unlock Passcode was changed successfully.',
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
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Account Passcode rollback error:',
        rollbackError.message
      );
    }

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// VERIFY ACCOUNT PASSCODE
// ============================================================

const verifyPasscode = async ({
  userId,
  passcode,
  ipAddress,
  userAgent,
}) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const normalizedPasscode = normalizePasscode(passcode);

  if (!isValidPasscode(normalizedPasscode)) {
    const error = new Error(
      'Account Passcode must contain exactly 6 digits.'
    );

    error.code = 'INVALID_PASSCODE';
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT
          id,
          user_id,
          passcode_hash,
          failed_attempts,
          locked_until
        FROM account_passcodes
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');

      const error = new Error(
        'Account Passcode has not been created.'
      );

      error.code = 'PASSCODE_NOT_SET';
      throw error;
    }

    const record = result.rows[0];

    const lockStatus = getLockStatus(record);

    if (lockStatus.locked) {
      await client.query('ROLLBACK');

      const error = new Error(
        'Account Passcode is temporarily locked.'
      );

      error.code = 'PASSCODE_LOCKED';
      error.failedAttempts =
        Number(record.failed_attempts || 0);
      error.maxFailedAttempts =
        MAX_FAILED_ATTEMPTS;
      error.lockedUntil =
        lockStatus.lockedUntil.toISOString();

      throw error;
    }

    /*
     * bcrypt comparison is performed against the stored hash.
     * The plaintext Passcode is never written to the database
     * or audit log.
     */
    const matches = await bcrypt.compare(
      normalizedPasscode,
      record.passcode_hash
    );

    if (!matches) {
      const failedAttempts =
        Number(record.failed_attempts || 0) + 1;

      let lockedUntil = null;

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(
          Date.now() +
            LOCK_DURATION_MINUTES * 60 * 1000
        );
      }

      await client.query(
        `
          UPDATE account_passcodes
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

      await client.query('COMMIT');

      await writeAuditLog({
        userId,
        action: 'account_passcode_failed',
        description:
          failedAttempts >= MAX_FAILED_ATTEMPTS
            ? 'Incorrect Account Passcode entered. Passcode temporarily locked.'
            : 'Incorrect Account Passcode entered.',
        ipAddress,
        userAgent,
      });

      const error = new Error(
        failedAttempts >= MAX_FAILED_ATTEMPTS
          ? 'Account Passcode is temporarily locked.'
          : 'Incorrect Account Passcode.'
      );

      error.code =
        failedAttempts >= MAX_FAILED_ATTEMPTS
          ? 'PASSCODE_LOCKED'
          : 'INCORRECT_PASSCODE';

      error.failedAttempts = failedAttempts;

      error.remainingAttempts =
        Math.max(
          MAX_FAILED_ATTEMPTS - failedAttempts,
          0
        );

      error.maxFailedAttempts =
        MAX_FAILED_ATTEMPTS;

      error.fallbackRequired =
        failedAttempts >= MAX_FAILED_ATTEMPTS;

      if (lockedUntil) {
        error.lockedUntil =
          lockedUntil.toISOString();
      }

      throw error;
    }

    // Successful verification resets the failure counter.
    await client.query(
      `
        UPDATE account_passcodes
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

    await client.query('COMMIT');

    await writeAuditLog({
      userId,
      action: 'account_passcode_verified',
      description:
        'The 6-digit Account Unlock Passcode was verified successfully.',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      verified: true,
      failedAttempts: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      maxFailedAttempts: MAX_FAILED_ATTEMPTS,
      fallbackRequired: false,
      lockedUntil: null,
    };
  } catch (error) {
    if (
      error?.code === 'INCORRECT_PASSCODE' ||
      error?.code === 'PASSCODE_LOCKED'
    ) {
      throw error;
    }

    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Account Passcode verification rollback error:',
        rollbackError.message
      );
    }

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// PASSCODE STATUS
// ============================================================

const getPasscodeStatus = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const record = await getPasscodeRecord(userId);

  if (!record) {
    return {
      exists: false,
      failedAttempts: 0,
      maxFailedAttempts: MAX_FAILED_ATTEMPTS,
      locked: false,
      lockedUntil: null,
      lastUsedAt: null,
      createdAt: null,
    };
  }

  const lockStatus = getLockStatus(record);

  return {
    exists: true,
    failedAttempts: Number(
      record.failed_attempts || 0
    ),
    maxFailedAttempts: MAX_FAILED_ATTEMPTS,
    locked: lockStatus.locked,
    lockedUntil: lockStatus.locked
      ? lockStatus.lockedUntil.toISOString()
      : null,
    lastUsedAt: record.last_used_at
      ? new Date(record.last_used_at).toISOString()
      : null,
    createdAt: record.created_at
      ? new Date(record.created_at).toISOString()
      : null,
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createPasscode,
  changePasscode,
  verifyPasscode,
  getPasscodeStatus,
  isValidPasscode,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MINUTES,
};
