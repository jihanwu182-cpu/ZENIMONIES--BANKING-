
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
// GET CUSTOMER SAVINGS
// GET /api/savings
// ============================================================

exports.getSavings = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    await client.query('BEGIN');

    // Find matured savings plans and lock their records.
    const maturedPlans = await client.query(
      `SELECT
          id,
          account_id,
          amount
       FROM savings_plans
       WHERE user_id = $1
         AND status = 'active'
         AND maturity_date <= NOW()
       ORDER BY maturity_date
       FOR UPDATE`,
      [userId]
    );

    // Release matured principal to the customer's
    // original NGN account.
    for (const plan of maturedPlans.rows) {
      const creditResult = await client.query(
        `UPDATE accounts
         SET balance = balance + $1
         WHERE id = $2
           AND user_id = $3
           AND currency = 'NGN'
           AND status = 'active'
         RETURNING id`,
        [
          plan.amount,
          plan.account_id,
          userId,
        ]
      );

      if (creditResult.rowCount !== 1) {
        throw new Error(
          'Unable to release matured savings.'
        );
      }

      const completedResult = await client.query(
        `UPDATE savings_plans
         SET status = 'completed',
             updated_at = NOW()
         WHERE id = $1
           AND user_id = $2
           AND status = 'active'`,
        [
          plan.id,
          userId,
        ]
      );

      if (completedResult.rowCount !== 1) {
        throw new Error(
          'Unable to complete matured savings.'
        );
      }
    }

    // Retrieve all savings plans for this customer.
    const result = await client.query(
      `SELECT
          id,
          amount,
          currency,
          duration_days,
          start_date,
          maturity_date,
          status,
          created_at
       FROM savings_plans
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      savings: result.rows,
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Get Savings Error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load your Savings.',
    });

  } finally {
    client.release();
  }
};


// ============================================================
// CREATE SAVINGS PLAN
// POST /api/savings
// ============================================================

exports.createSavings = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    const amountInput = req.body.amount;
    const durationDays = Number(
      req.body.duration_days
    );

    // Validate amount input.
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
      Math.round(amount * 100) !==
        amount * 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Minimum Savings amount is ₦5,000. Please enter a valid amount.',
      });
    }

    // Validate the selected lock period.
    if (!ALLOWED_PERIODS.includes(durationDays)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid Savings lock period.',
      });
    }

    await client.query('BEGIN');

    // Lock the customer's NGN account.
    // This prevents simultaneous Savings requests
    // from spending the same available balance.
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
       ORDER BY created_at
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (accountResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'No active NGN account was found.',
      });
    }

    const account = accountResult.rows[0];

    // Check available balance.
    if (Number(account.balance) < amount) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Insufficient available balance.',
      });
    }

    // Deduct the Savings amount from the wallet.
    const debitResult = await client.query(
      `UPDATE accounts
       SET balance = balance - $1
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

    // Create the Savings plan.
    // Dates are calculated using the database clock.
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

    // Both the wallet debit and Savings record
    // are committed together.
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Savings plan created successfully.',
      savings: savingsResult.rows[0],
      available_balance: Number(
        debitResult.rows[0].balance
      ),
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Create Savings Error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to create your Savings plan.',
    });

  } finally {
    client.release();
  }
};
