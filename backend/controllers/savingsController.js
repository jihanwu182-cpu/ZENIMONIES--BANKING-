
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES SAVINGS CONTROLLER
//
// Minimum: ₦5,000
// Lock periods: 30, 60, 90, 180, 365 days
// Interest: None
// Early withdrawal: Not allowed
//
// Matured savings are released by:
// backend/jobs/savingsMaturityJob.js
// ============================================================

const ALLOWED_PERIODS = [30, 60, 90, 180, 365];
const MINIMUM_AMOUNT = 5000;
const MAXIMUM_AMOUNT = 100000000;

// ============================================================
// GENERATE UNIQUE TRANSACTION REFERENCE
// ============================================================

const generateReference = (type) => {
  return `ZEN-SAV-${type}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
};

// ============================================================
// PRIVATE DATABASE ERROR LOGGING
// ============================================================

const logSavingsError = (label, error) => {
  console.error(label, {
    message: error?.message,
    code: error?.code,
    detail: error?.detail,
    constraint: error?.constraint,
    table: error?.table,
    column: error?.column,
    stack: error?.stack,
  });
};

// ============================================================
// GET CUSTOMER SAVINGS
//
// GET /api/savings
//
// This endpoint ONLY retrieves the authenticated customer's
// savings plans.
//
// It does not release matured savings.
// The maturity scheduler handles releases separately.
// ============================================================

exports.getSavings = async (req, res) => {
  let client;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    client = await pool.connect();

    const result = await client.query(
      `SELECT
         id,
         amount,
         currency,
         duration_days,
         start_date,
         maturity_date,
         status,
         maturity_transaction_reference,
         created_at
       FROM savings_plans
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      savings: result.rows,
    });

  } catch (error) {
    logSavingsError(
      'Get Savings Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load your Savings.',
      error_code: error?.code || 'UNKNOWN_ERROR',
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};

// ============================================================
// CREATE SAVINGS PLAN
//
// POST /api/savings
//
// Wallet debit, savings plan creation, and transaction
// history record are committed atomically.
// ============================================================

exports.createSavings = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // --------------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------------

    const amountInput = req.body?.amount;

    const durationDays = Number(
      req.body?.duration_days
    );

    if (
      amountInput === undefined ||
      amountInput === null ||
      String(amountInput).trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a Savings amount.',
      });
    }

    const amount = Number(amountInput);

    if (
      !Number.isFinite(amount) ||
      amount < MINIMUM_AMOUNT ||
      amount > MAXIMUM_AMOUNT ||
      Math.round(amount * 100) !== amount * 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Minimum Savings is ₦5,000. Enter a valid amount with no more than two decimal places.',
      });
    }

    // --------------------------------------------------------
    // VALIDATE LOCK PERIOD
    // --------------------------------------------------------

    if (!ALLOWED_PERIODS.includes(durationDays)) {
      return res.status(400).json({
        success: false,
        message:
          'Please select a valid Savings lock period.',
      });
    }

    // --------------------------------------------------------
    // CONNECT TO DATABASE
    // --------------------------------------------------------

    client = await pool.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // --------------------------------------------------------
    // LOCK CUSTOMER WALLET
    // --------------------------------------------------------

    const accountResult = await client.query(
      `SELECT
         id,
         balance,
         currency,
         status
       FROM accounts
       WHERE user_id = $1
         AND currency = 'NGN'
         AND status = 'active'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (accountResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'No active NGN account was found.',
      });
    }

    const account = accountResult.rows[0];

    const balanceBefore = Number(account.balance);

    if (
      !Number.isFinite(balanceBefore) ||
      balanceBefore < amount
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Insufficient available balance.',
      });
    }

    // --------------------------------------------------------
    // DEBIT CUSTOMER WALLET
    // --------------------------------------------------------

    const debitResult = await client.query(
      `UPDATE accounts
       SET
         balance = balance - $1::numeric,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND user_id = $3
         AND currency = 'NGN'
         AND status = 'active'
         AND balance >= $1::numeric
       RETURNING balance`,
      [
        amount,
        account.id,
        userId,
      ]
    );

    if (debitResult.rowCount !== 1) {
      throw new Error(
        'Unable to debit the Savings amount.'
      );
    }

    const balanceAfter =
      Number(debitResult.rows[0].balance);

    // --------------------------------------------------------
    // CREATE SAVINGS PLAN
    // --------------------------------------------------------

    const savingsResult = await client.query(
      `INSERT INTO savings_plans (
         user_id,
         account_id,
         amount,
         currency,
         duration_days,
         start_date,
         maturity_date,
         status
       )
       VALUES (
         $1,
         $2,
         $3::numeric,
         'NGN',
         $4::integer,
         NOW(),
         NOW() + make_interval(days => $4::integer),
         'active'
       )
       RETURNING
         id,
         amount,
         currency,
         duration_days,
         start_date,
         maturity_date,
         status`,
      [
        userId,
        account.id,
        amount,
        durationDays,
      ]
    );

    const savings = savingsResult.rows[0];

    if (!savings) {
      throw new Error(
        'Savings plan was not returned after creation.'
      );
    }

    // --------------------------------------------------------
    // RECORD SAVINGS LOCK TRANSACTION
    // --------------------------------------------------------

    const reference = generateReference('LOCK');

    await client.query(
      `INSERT INTO transactions (
         account_id,
         type,
         amount,
         currency,
         reference,
         description,
         status,
         balance_before,
         balance_after,
         transaction_fee
       )
       VALUES (
         $1,
         'savings_lock',
         $2::numeric,
         'NGN',
         $3,
         $4,
         'completed',
         $5::numeric,
         $6::numeric,
         0
       )`,
      [
        account.id,
        amount,
        reference,
        `Savings locked for ${durationDays} days`,
        balanceBefore,
        balanceAfter,
      ]
    );

    // --------------------------------------------------------
    // COMMIT TRANSACTION
    // --------------------------------------------------------

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'Savings plan created successfully.',
      savings,
      available_balance: balanceAfter,
      transaction_reference: reference,
    });

  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logSavingsError(
          'Savings creation rollback error:',
          rollbackError
        );
      }
    }

    logSavingsError(
      'Create Savings Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to create your Savings plan.',
      error_code: error?.code || 'UNKNOWN_ERROR',
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};
