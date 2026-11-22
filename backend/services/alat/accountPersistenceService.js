

const pool = require('../../config/database');

async function saveAlatAccountNumber(userId, accountNumber) {
  if (!userId || typeof accountNumber !== 'string') {
    throw new Error(
      'User ID and bank-issued account number are required.'
    );
  }

  const number = accountNumber.trim();

  // Account numbers must remain strings to preserve their exact digits.
  if (!/^\d{10}$/.test(number)) {
    throw new Error(
      'Invalid bank account number returned by provider.'
    );
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    // Lock the existing customer's account row.
    const existingResult = await client.query(
      `SELECT id, account_number
       FROM accounts
       WHERE user_id = $1
       ORDER BY id
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('Existing customer account not found.');
    }

    const existingAccount = existingResult.rows[0];

    // Idempotent: same account number already assigned.
    if (existingAccount.account_number === number) {
      await client.query('COMMIT');
      transactionStarted = false;

      return {
        success: true,
        alreadyAssigned: true,
        accountNumber: number,
      };
    }

    // Never overwrite an existing account number.
    if (existingAccount.account_number !== null &&
        existingAccount.account_number !== undefined &&
        existingAccount.account_number !== '') {
      throw new Error(
        'Customer already has an account number. Manual review required.'
      );
    }

    // Protect against assignment to another customer.
    const duplicateResult = await client.query(
      `SELECT id
       FROM accounts
       WHERE account_number = $1
         AND id <> $2
       LIMIT 1`,
      [number, existingAccount.id]
    );

    if (duplicateResult.rows.length > 0) {
      throw new Error(
        'Bank account number is already linked to another account.'
      );
    }

    // Update ONLY the account number of the locked account.
    const updateResult = await client.query(
      `UPDATE accounts
       SET account_number = $1
       WHERE id = $2
         AND user_id = $3
         AND (
           account_number IS NULL
           OR account_number = ''
         )
       RETURNING account_number`,
      [number, existingAccount.id, userId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error(
        'Account number assignment failed. Manual review required.'
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return {
      success: true,
      alreadyAssigned: false,
      accountNumber: updateResult.rows[0].account_number,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'ALAT account persistence rollback failed:',
          rollbackError.message
        );
      }
    }

    // PostgreSQL unique-constraint protection against concurrent assignments.
    if (error.code === '23505') {
      throw new Error(
        'Bank account number is already assigned. Manual review required.'
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  saveAlatAccountNumber,
};
