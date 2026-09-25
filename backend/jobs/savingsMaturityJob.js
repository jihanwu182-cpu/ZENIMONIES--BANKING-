
const cron = require('node-cron');
const crypto = require('crypto');
const pool = require('../config/database');

let isRunning = false;
let scheduledTask = null;

// ============================================================
// GENERATE UNIQUE MATURITY REFERENCE
// ============================================================

const generateReference = () => {
  return `ZEN-SAV-MATURITY-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
};

// ============================================================
// PROCESS ONE MATURED SAVINGS PLAN
// Each plan has its own database transaction.
// ============================================================

const processOneMaturedPlan = async (plan) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock and verify the savings plan again.

    const planResult = await client.query(
      `SELECT
         id,
         user_id,
         account_id,
         amount,
         currency,
         status,
         maturity_date
       FROM savings_plans
       WHERE id = $1
       FOR UPDATE`,
      [plan.id]
    );

    if (planResult.rowCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }

    const lockedPlan = planResult.rows[0];

    // Never release a plan more than once.

    if (
      lockedPlan.status !== 'active' ||
      new Date(lockedPlan.maturity_date) > new Date()
    ) {
      await client.query('ROLLBACK');
      return false;
    }

    if (lockedPlan.currency !== 'NGN') {
      throw new Error(
        `Unsupported savings currency for plan ${lockedPlan.id}`
      );
    }

    // Lock the customer's original wallet.

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
        lockedPlan.account_id,
        lockedPlan.user_id,
      ]
    );

    if (accountResult.rowCount !== 1) {
      throw new Error(
        `Original wallet not found for savings plan ${lockedPlan.id}`
      );
    }

    const account = accountResult.rows[0];

    if (
      account.currency !== 'NGN' ||
      account.status !== 'active'
    ) {
      throw new Error(
        `Original wallet is not active for savings plan ${lockedPlan.id}`
      );
    }

    const amount = lockedPlan.amount;
    const balanceBefore = account.balance;
    const reference = generateReference();

    // Credit the customer's wallet.

    const creditResult = await client.query(
      `UPDATE accounts
       SET
         balance = balance + $1::numeric,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND user_id = $3
         AND currency = 'NGN'
         AND status = 'active'
       RETURNING balance`,
      [
        amount,
        lockedPlan.account_id,
        lockedPlan.user_id,
      ]
    );

    if (creditResult.rowCount !== 1) {
      throw new Error(
        `Wallet credit failed for savings plan ${lockedPlan.id}`
      );
    }

    const balanceAfter = creditResult.rows[0].balance;

    // Record the wallet credit.

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
        lockedPlan.account_id,
        amount,
        reference,
        'Matured Savings principal released to wallet',
        balanceBefore,
        balanceAfter,
      ]
    );

    // Mark the plan completed in the same transaction.

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
        lockedPlan.id,
        lockedPlan.user_id,
      ]
    );

    if (completedResult.rowCount !== 1) {
      throw new Error(
        `Could not complete savings plan ${lockedPlan.id}`
      );
    }

    // Notify the customer.

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
        lockedPlan.user_id,
        'Savings matured',
        'Your matured Savings principal has been returned to your wallet.',
        'savings',
      ]
    );

    await client.query('COMMIT');

    console.log(
      `Savings maturity processed successfully: ${lockedPlan.id}`
    );

    return true;

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Savings maturity rollback failed:',
        rollbackError.message
      );
    }

    throw error;

  } finally {
    client.release();
  }
};

// ============================================================
// PROCESS MATURED SAVINGS
// Checks for matured plans and processes them individually.
// ============================================================

const processMaturedSavings = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  let client;

  try {
    client = await pool.connect();

    // Find matured plans without locking them here.
    // Each plan is locked inside its own transaction.

    const maturedResult = await client.query(
      `SELECT id
       FROM savings_plans
       WHERE status = 'active'
         AND maturity_date <= NOW()
       ORDER BY maturity_date ASC, id ASC
       LIMIT 50`
    );

    client.release();
    client = null;

    let processedCount = 0;

    for (const row of maturedResult.rows) {
      try {
        const processed = await processOneMaturedPlan(row);

        if (processed) {
          processedCount += 1;
        }
      } catch (planError) {
        console.error(
          `Savings plan ${row.id} failed:`,
          planError.message
        );
      }
    }

    if (processedCount > 0) {
      console.log(
        `Savings maturity job completed. Released ${processedCount} plan(s).`
      );
    }

  } catch (error) {
    console.error(
      'Savings maturity job error:',
      error.message
    );

  } finally {
    if (client) {
      client.release();
    }

    isRunning = false;
  }
};

// ============================================================
// START AUTOMATIC MATURITY SCHEDULER
// Runs every minute.
// ============================================================

const startSavingsMaturityJob = () => {
  if (scheduledTask) {
    console.log(
      'Savings maturity scheduler is already running.'
    );

    return scheduledTask;
  }

  console.log(
    'Savings maturity scheduler started. Checking every minute.'
  );

  // Check immediately after startup.

  processMaturedSavings();

  // Check every minute using node-cron.

  scheduledTask = cron.schedule(
    '* * * * *',
    () => {
      processMaturedSavings();
    },
    {
      noOverlap: true,
    }
  );

  return scheduledTask;
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  startSavingsMaturityJob,
  processMaturedSavings,
};
