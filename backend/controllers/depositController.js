const pool = require('../config/database');
const crypto = require('crypto');

const generateReference = () => {
  return `ZEN-DEP-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

const createDeposit = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    const { amount, method } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      !method
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount and payment method are required',
      });
    }

    const depositAmount = Number(amount);

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Deposit amount must be greater than zero',
      });
    }

    if (depositAmount > 100000000) {
      return res.status(400).json({
        success: false,
        message:
          'Deposit amount is too large',
      });
    }

    const allowedMethods = [
      'card',
      'bank_transfer',
    ];

    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid payment method',
      });
    }

    await client.query('BEGIN');

    const accountResult = await client.query(
      `SELECT
        id,
        account_number,
        currency,
        status
       FROM accounts
       WHERE user_id = $1
         AND status = 'active'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Active account not found',
      });
    }

    const account = accountResult.rows[0];

    const reference = generateReference();

    const transactionResult = await client.query(
      `INSERT INTO transactions (
        account_id,
        transaction_reference,
        transaction_type,
        amount,
        currency,
        payment_method,
        status,
        description
      )
      VALUES (
        $1,
        $2,
        'DEPOSIT',
        $3,
        $4,
        $5,
        'PENDING',
        $6
      )
      RETURNING
        id,
        account_id,
        transaction_reference,
        transaction_type,
        amount,
        currency,
        payment_method,
        status,
        description,
        created_at`,
      [
        account.id,
        reference,
        depositAmount,
        account.currency,
        method,
        'User deposit request',
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Deposit request created successfully and is pending processing.',
      deposit: transactionResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Deposit rollback error:',
        rollbackError
      );
    }

    console.error(
      'CREATE DEPOSIT ERROR:',
      error
    );

    return res.status(500).json({
      success: false,

      // TEMPORARY: exposes the actual database/server error
      // so we can identify the problem.
      message:
        error?.message ||
        'Unable to create deposit request',

      error_code:
        error?.code || null,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createDeposit,
};
