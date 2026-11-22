
const pool = require('../../config/database');

async function saveAlatAccountNumber(userId, accountNumber) {
  if (!userId || !accountNumber) {
    throw new Error('User ID and bank-issued account number are required.');
  }

  const number = String(accountNumber).trim();

  if (!/^\d{10}$/.test(number)) {
    throw new Error('Invalid bank account number returned by provider.');
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
    if (existingAccount.account_number) {
      throw new Error(
        'Customer already has an account number. Manual review required.'
      );
    }

    // Protect against assignment to another customer.
    const duplicateResult = await client.query(
      `SELECT id
       FROM accounts
       WHERE account_number = $1
       LIMIT 1`,
      [number]
    );

    if (duplicateResult.rows.length > 0) {
      throw new Error(
        'Bank account number is already linked to another account.'
      );
    }

    // Assign the bank-issued number to the existing account.
    const updateResult = await client.query(
      `UPDATE accounts
       SET account_number = $1
       WHERE id = $2
         AND account_number IS NULL
       RETURNING account_number`,
      [number, existingAccount.id]
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

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  saveAlatAccountNumber,
};
