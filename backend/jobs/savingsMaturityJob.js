
const crypto = require('crypto');
const pool = require('../config/database');

let isRunning = false;

const generateReference = () => {
  return `ZEN-SAV-MATURITY-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
};

// ============================================================
// PROCESS MATURED SAVINGS
// Runs automatically from server.js.
//
// Each release is processed in a database transaction.
// A matured plan can only be released once.
// ============================================================

const processMaturedSavings = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  let client;

  try {
    client = await pool.connect();

    // Find matured plans and lock them.
    // SKIP LOCKED prevents competing workers from
    // processing the same plan simultaneously.

    await client.query('BEGIN');

    const maturedResult = await client.query(`
      SELECT
        id,
        user_id,
        account_id,
        amount,
        currency
      FROM savings_plans
      WHERE status = 'active'
        AND maturity_date <= NOW()
      ORDER BY maturity_date ASC, id ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    `);

    for (const plan of maturedResult.rows) {
      try {
        if (plan.currency !== 'NGN') {
          throw new Error(
            'Unsupported savings maturity currency.'
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
            plan.account_id,
            plan.user_id,
          ]
        );

        if (accountResult.rowCount !== 1) {
          throw new Error(
            'Original savings wallet not found.'
          );
        }

        const account = accountResult.rows[0];

        if (
          account.currency !== 'NGN' ||
          account.status !== 'active'
        ) {
          throw new Error(
            'Savings wallet is not active.'
          );
        }

        const balanceBefore = account.balance;
        const reference = generateReference();

        // Credit the original wallet.

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
            plan.amount,
            plan.account_id,
            plan.user_id,
          ]
        );

        if (creditResult.rowCount !== 1) {
          throw new Error(
            'Unable to credit matured savings.'
          );
        }

        const balanceAfter =
          creditResult.rows[0].balance;

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
            plan.account_id,
            plan.amount,
            reference,
            'Matured Savings principal released to wallet',
            balanceBefore,
            balanceAfter,
          ]
        );

        // Mark the plan completed.
        // This update and the wallet credit commit together.

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
            plan.user_id,
          ]
        );

        if (completedResult.rowCount !== 1) {
          throw new Error(
            'Unable to mark savings as completed.'
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
            plan.user_id,
            'Savings matured',
            'Your matured Savings principal has been returned to your wallet.',
            'savings',
          ]
        );

        console.log(
          `Savings maturity processed: ${plan.id}`
        );

      } catch (planError) {
        // A failure for one plan must not result
        // in a partial wallet credit.

        throw planError;
      }
    }

    await client.query('COMMIT');

    if (maturedResult.rowCount > 0) {
      console.log(
        `Savings maturity job completed. Processed ${maturedResult.rowCount} plan(s).`
      );
    }

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Savings maturity rollback failed:',
          rollbackError.message
        );
      }
    }

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
// START AUTOMATIC MATURITY CHECK
// Check every 60 seconds.
// ============================================================

const startSavingsMaturityJob = () => {
  console.log(
    'Savings maturity scheduler started.'
  );

  // Check immediately after server startup.

  processMaturedSavings();

  // Continue checking every minute.

  const timer = setInterval(() => {
    processMaturedSavings();
  }, 60 * 1000);

  return timer;
};

module.exports = {
  startSavingsMaturityJob,
  processMaturedSavings,
};
