const pool = require('../config/database');
const crypto = require('crypto');

const generateReference = () => {
  return `ZEN-DEP-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

/*
 * ============================================================
 * GET DEPOSIT ACCOUNT
 * ============================================================
 *
 * Returns the provider-issued deposit account belonging
 * to the currently authenticated user.
 *
 * IMPORTANT:
 * We do not create or invent bank account numbers here.
 * A real provider such as Paystack will supply the account
 * details after the appropriate onboarding/approval.
 *
 */
const getDepositAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        id,
        account_number,
        account_name,
        bank_name,
        bank_code,
        currency,
        status,
        provider,
        provider_customer_code,
        provider_account_id,
        created_at,
        updated_at
       FROM deposit_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        active: false,
        message:
          'Deposit account is not activated yet.',
        deposit_account: null,
      });
    }

    return res.status(200).json({
      success: true,
      active: true,
      message: 'Deposit account found.',
      deposit_account: result.rows[0],
    });
  } catch (error) {
    console.error(
      'GET DEPOSIT ACCOUNT ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve deposit account',
      error_code:
        error?.code || null,
    });
  }
};


/*
 * ============================================================
 * CREATE DEPOSIT
 * ============================================================
 */

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
        message:
          'Active account not found',
      });
    }

    const account = accountResult.rows[0];

    const reference = generateReference();

    /*
     * Create a pending deposit request.
     *
     * IMPORTANT:
     * The account balance is NOT increased here.
     *
     * A real payment provider must confirm the payment
     * before the balance is credited.
     */

    const depositResult = await client.query(
      `INSERT INTO deposits (
        account_id,
        amount,
        currency,
        reference,
        payment_method,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'pending'
      )
      RETURNING
        id,
        account_id,
        amount,
        currency,
        reference,
        payment_method,
        status,
        created_at`,
      [
        account.id,
        depositAmount,
        account.currency,
        reference,
        method,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Deposit request created successfully and is pending processing.',
      deposit: depositResult.rows[0],
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
  getDepositAccount,
  createDeposit,
};
