
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES SAVINGS CONTROLLER
// Minimum: ₦5,000
// Lock periods: 30, 60, 90, 180, 365 days
// Interest: None
// Early withdrawal: Not allowed
// ============================================================

const ALLOWED_PERIODS = [30, 60, 90, 180, 365];
const MINIMUM_AMOUNT = 5000;

// ============================================================
// GENERATE UNIQUE SAVINGS TRANSACTION REFERENCE
// ============================================================

const generateReference = (type) => {
  return `ZEN-SAV-${type}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
};

// ============================================================
// LOG DATABASE ERRORS
// Detailed information is for backend logs only.
// Never expose database details to customers.
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
// GET /api/savings
//
// Releases matured savings automatically when the customer
// loads their Savings page.
//
// Wallet credit, transaction record, savings status change,
// and notification are committed together.
// ============================================================

exports.getSavings = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    // --------------------------------------------------------
    // DATABASE CONNECTION
    // --------------------------------------------------------

    client = await pool.connect();

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // --------------------------------------------------------
    // BEGIN TRANSACTION
    // --------------------------------------------------------

    await client.query('BEGIN');
    transactionStarted = true;

    // --------------------------------------------------------
    // FIND AND LOCK MATURED SAVINGS PLANS
    // --------------------------------------------------------

    const maturedPlans = await client.query(
      `SELECT
          id,
          account_id,
          amount,
          currency
       FROM savings_plans
       WHERE user_id = $1
         AND status = 'active'
         AND maturity_date <= NOW()
       ORDER BY maturity_date ASC
       FOR UPDATE`,
      [userId]
    );

    // --------------------------------------------------------
    // PROCESS MATURED PLANS
    // --------------------------------------------------------

    for (const plan of maturedPlans.rows) {
      const savingsAmount = Number(plan.amount);

      if (
        !Number.isFinite(savingsAmount) ||
        savingsAmount <= 0
      ) {
        throw new Error(
          'Invalid savings amount for maturity release.'
        );
      }

      if (plan.currency !== 'NGN') {
        throw new Error(
          'Unsupported savings currency for maturity release.'
        );
      }

      // Lock the original wallet account.
      const accountResult = await client.query(
        `SELECT
            id,
            balance,
            currency,
            status
         FROM accounts
         WHERE id = $1
           AND user_id = $2
         FOR UPDATE`,
        [
          plan.account_id,
          userId,
        ]
      );

      if (accountResult.rowCount !== 1) {
        throw new Error(
          'Savings wallet account could not be found.'
        );
      }

      const account = accountResult.rows[0];

      if (
        account.currency !== 'NGN' ||
        account.status !== 'active'
      ) {
        throw new Error(
          'Savings wallet is not eligible for maturity release.'
        );
      }

      const balanceBefore = Number(account.balance);

      const balanceAfter =
        balanceBefore + savingsAmount;

      // Generate a unique maturity reference.
      const reference = generateReference('MATURITY');

      // ------------------------------------------------------
      // CREDIT ORIGINAL WALLET
      // ------------------------------------------------------

      const creditResult = await client.query(
        `UPDATE accounts
         SET
           balance = balance + $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND user_id = $3
           AND currency = 'NGN'
           AND status = 'active'
         RETURNING balance`,
        [
          savingsAmount,
          plan.account_id,
          userId,
        ]
      );

      if (creditResult.rowCount !== 1) {
        throw new Error(
          'Unable to release matured savings.'
        );
      }

      // ------------------------------------------------------
      // RECORD MATURITY TRANSACTION
      // ------------------------------------------------------

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
          'savings_maturity_release',
          $2,
          'NGN',
          $3,
          $4,
          'completed',
          $5,
          $6,
          0
        )`,
        [
          plan.account_id,
          savingsAmount,
          reference,
          'Matured Savings principal released to wallet',
          balanceBefore,
          balanceAfter,
        ]
      );

      // ------------------------------------------------------
      // MARK SAVINGS PLAN COMPLETED
      // ------------------------------------------------------

      const completedResult = await client.query(
        `UPDATE savings_plans
         SET
           status = 'completed',
           maturity_transaction_reference = $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
           AND user_id = $3
           AND status = 'active'
           AND maturity_date <= NOW()
         RETURNING id`,
        [
          reference,
          plan.id,
          userId,
        ]
      );

      if (completedResult.rowCount !== 1) {
        throw new Error(
          'Unable to complete matured savings.'
        );
      }

      // ------------------------------------------------------
      // CUSTOMER NOTIFICATION
      // ------------------------------------------------------

      await client.query(
        `INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          is_read
        )
        VALUES ($1, $2, $3, $4, false)`,
        [
          userId,
          'Savings matured',
          `Your matured savings of ₦${savingsAmount.toLocaleString(
            'en-NG',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )} has been returned to your wallet.`,
          'savings',
        ]
      );
    }

    // --------------------------------------------------------
    // FETCH CUSTOMER SAVINGS PLANS
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      savings: result.rows,
    });

  } catch (error) {
    // --------------------------------------------------------
    // ROLLBACK ON ERROR
    // --------------------------------------------------------

    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logSavingsError(
          'Savings loading rollback error:',
          rollbackError
        );
      }
    }

    // Detailed error is logged privately on the backend.
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
// POST /api/savings
//
// Wallet debit, savings plan creation, and transaction
// history record are committed atomically.
// ============================================================

exports.createSavings = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    // --------------------------------------------------------
    // DATABASE CONNECTION
    // --------------------------------------------------------

    client = await pool.connect();

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
      Math.round(amount * 100) !== amount * 100 ||
      amount > 100000000
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
    // BEGIN DATABASE TRANSACTION
    // --------------------------------------------------------

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

    const balanceAfter =
      balanceBefore - amount;

    // --------------------------------------------------------
    // DEBIT WALLET
    // --------------------------------------------------------

    const debitResult = await client.query(
      `UPDATE accounts
       SET
         balance = balance - $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND user_id = $3
         AND currency = 'NGN'
         AND status = 'active'
         AND balance >= $1
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
          $3,
          'NGN',
          $4,
          NOW(),
          NOW() + ($4 * INTERVAL '1 day'),
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
    // RECORD SAVINGS TRANSACTION
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
          $2,
          'NGN',
          $3,
          $4,
          'completed',
          $5,
          $6,
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
    // COMMIT
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
    // --------------------------------------------------------
    // ROLLBACK ON ERROR
    // --------------------------------------------------------

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

    // Detailed error is logged privately on the backend.
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
