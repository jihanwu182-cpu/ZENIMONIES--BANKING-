
const pool = require('../config/database');

// ============================================================
// ZENIMONIES ACCOUNT STATEMENT SERVICE
// ============================================================

const MAX_STATEMENT_DAYS = 365;

// All monetary calculations use kobo internally
// to avoid floating-point rounding errors.

const toKobo = (value) => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      'Invalid monetary amount found.'
    );
  }

  return Math.round(
    (amount + Number.EPSILON) * 100
  );
};

const fromKobo = (value) => {
  return Number(
    (value / 100).toFixed(2)
  );
};

// ============================================================
// DATE VALIDATION
// ============================================================

const validateStatementDates = (
  startDate,
  endDate
) => {
  if (
    typeof startDate !== 'string' ||
    typeof endDate !== 'string'
  ) {
    throw new Error(
      'Start date and end date are required.'
    );
  }

  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(startDate) ||
    !datePattern.test(endDate)
  ) {
    throw new Error(
      'Dates must use YYYY-MM-DD format.'
    );
  }

  const start = new Date(
    `${startDate}T00:00:00.000Z`
  );

  const end = new Date(
    `${endDate}T00:00:00.000Z`
  );

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.toISOString().slice(0, 10) !==
      startDate ||
    end.toISOString().slice(0, 10) !==
      endDate
  ) {
    throw new Error(
      'Invalid statement dates.'
    );
  }

  if (start > end) {
    throw new Error(
      'Start date cannot be after end date.'
    );
  }

  const days =
    Math.floor(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  if (days > MAX_STATEMENT_DAYS) {
    throw new Error(
      'Statement period cannot exceed 365 days.'
    );
  }

  return {
    startDate,
    endDate,
  };
};

// ============================================================
// LOAD CUSTOMER ACCOUNT
// ============================================================

const getCustomerAccount = async (
  userId,
  client = pool
) => {
  if (!userId) {
    throw new Error(
      'Authenticated customer is required.'
    );
  }

  const result = await client.query(
    `
    SELECT
      u.id AS user_id,
      u.full_name,
      u.email,

      a.id AS account_id,
      a.account_number,
      a.currency,
      a.balance,
      a.status AS account_status

    FROM users u

    INNER JOIN accounts a
      ON a.user_id = u.id

    WHERE u.id = $1
      AND a.status = 'active'

    ORDER BY
      a.created_at ASC,
      a.id ASC

    LIMIT 1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      'No active customer account was found.'
    );
  }

  return result.rows[0];
};

// ============================================================
// GET COMPLETED TRANSACTIONS
// ============================================================

const getStatementTransactions = async (
  accountId,
  startDate,
  endDate,
  client = pool
) => {
  const result = await client.query(
    `
    SELECT
      t.id,
      t.account_id,
      t.type,
      t.amount,
      t.currency,
      t.reference,
      t.description,
      t.status,
      t.balance_before,
      t.balance_after,
      t.transaction_fee,
      t.created_at,

      bt.recipient_name AS counterparty

    FROM transactions t

    LEFT JOIN bank_transfers bt
      ON bt.reference = t.reference
      AND t.type = 'transfer'

    WHERE t.account_id = $1
      AND t.status = 'completed'

      AND t.created_at >=
        ($2::date)::timestamp

      AND t.created_at <
        (
          ($3::date + INTERVAL '1 day')
          ::timestamp
        )

    ORDER BY
      t.created_at ASC,
      t.id ASC
    `,
    [
      accountId,
      startDate,
      endDate,
    ]
  );

  return result.rows;
};

// ============================================================
// GET OPENING BALANCE
// ============================================================

const getOpeningBalance = async (
  accountId,
  startDate,
  client = pool
) => {
  /*
   * The opening balance is the balance immediately
   * before the selected statement period.
   *
   * If there are no transactions during the period,
   * the previous completed transaction still provides
   * the historical balance.
   *
   * If no previous transaction exists, the opening
   * balance is zero.
   */

  const result = await client.query(
    `
    SELECT
      balance_after

    FROM transactions

    WHERE account_id = $1
      AND status = 'completed'
      AND created_at <
        ($2::date)::timestamp

    ORDER BY
      created_at DESC,
      id DESC

    LIMIT 1
    `,
    [
      accountId,
      startDate,
    ]
  );

  if (result.rows.length === 0) {
    return 0;
  }

  return toKobo(
    result.rows[0].balance_after || 0
  );
};

// ============================================================
// TRANSACTION CLASSIFICATION
// ============================================================

const CREDIT_TYPES = new Set([
  'deposit',
  'transfer_refund',
  'refund',
  'credit',
  'data_refund',
  'airtime_refund',
  'bill_refund',
  'savings_maturity_release',
]);

const DEBIT_TYPES = new Set([
  'transfer',
  'withdrawal',
  'airtime_purchase',
  'data_purchase',
  'bill_payment',
  'savings_lock',
]);

const classifyTransaction = (
  transactionType
) => {
  const type =
    String(
      transactionType || ''
    ).toLowerCase();

  if (CREDIT_TYPES.has(type)) {
    return 'credit';
  }

  if (DEBIT_TYPES.has(type)) {
    return 'debit';
  }

  /*
   * Unknown transaction types are not silently
   * treated as credits.
   *
   * They are classified as debits for display,
   * so new transaction types must be reviewed
   * and added to the appropriate list.
   */

  return 'debit';
};

// ============================================================
// CALCULATE STATEMENT TOTALS
// ============================================================

const calculateStatementBalances = (
  transactions,
  openingBalanceKobo = 0
) => {
  if (!Array.isArray(transactions)) {
    throw new Error(
      'Invalid statement transactions.'
    );
  }

  let totalCreditsKobo = 0;
  let totalDebitsKobo = 0;
  let totalFeesKobo = 0;

  const formattedTransactions =
    transactions.map((transaction) => {
      const amountKobo =
        toKobo(transaction.amount);

      const feeKobo =
        toKobo(
          transaction.transaction_fee || 0
        );

      const balanceBeforeKobo =
        toKobo(
          transaction.balance_before || 0
        );

      const balanceAfterKobo =
        toKobo(
          transaction.balance_after || 0
        );

      const classification =
        classifyTransaction(
          transaction.type
        );

      const isCredit =
        classification === 'credit';

      const creditKobo =
        isCredit ? amountKobo : 0;

      const debitKobo =
        isCredit
          ? 0
          : amountKobo;

      totalCreditsKobo += creditKobo;
      totalDebitsKobo += debitKobo;

      totalFeesKobo += feeKobo;

      return {
        id: transaction.id,

        date:
          transaction.created_at,

        type:
          transaction.type,

        reference:
          transaction.reference,

        description:
          transaction.description ||
          transaction.type,

        counterparty:
          transaction.counterparty || '',

        currency:
          transaction.currency || 'NGN',

        debit:
          fromKobo(debitKobo),

        credit:
          fromKobo(creditKobo),

        fee:
          fromKobo(feeKobo),

        balance:
          fromKobo(balanceAfterKobo),

        balanceBefore:
          fromKobo(balanceBeforeKobo),

        status:
          transaction.status,
      };
    });

  /*
   * Use the final recorded ledger balance
   * for the closing balance when transactions
   * exist within the statement period.
   */

  let closingBalanceKobo =
    openingBalanceKobo;

  if (transactions.length > 0) {
    closingBalanceKobo =
      toKobo(
        transactions[
          transactions.length - 1
        ].balance_after || 0
      );
  }

  return {
    openingBalance:
      fromKobo(openingBalanceKobo),

    totalCredits:
      fromKobo(totalCreditsKobo),

    totalDebits:
      fromKobo(totalDebitsKobo),

    totalFees:
      fromKobo(totalFeesKobo),

    closingBalance:
      fromKobo(closingBalanceKobo),

    transactions:
      formattedTransactions,
  };
};

// ============================================================
// BUILD ACCOUNT STATEMENT
// ============================================================

const buildAccountStatement = async ({
  userId,
  startDate,
  endDate,
}) => {
  const dates =
    validateStatementDates(
      startDate,
      endDate
    );

  const account =
    await getCustomerAccount(
      userId
    );

  const openingBalanceKobo =
    await getOpeningBalance(
      account.account_id,
      dates.startDate
    );

  const transactions =
    await getStatementTransactions(
      account.account_id,
      dates.startDate,
      dates.endDate
    );

  const balances =
    calculateStatementBalances(
      transactions,
      openingBalanceKobo
    );

  return {
    customer: {
      userId:
        account.user_id,

      fullName:
        account.full_name,

      email:
        account.email,
    },

    account: {
      accountId:
        account.account_id,

      accountNumber:
        account.account_number,

      currency:
        account.currency || 'NGN',
    },

    statement: {
      startDate:
        dates.startDate,

      endDate:
        dates.endDate,

      generatedAt:
        new Date().toISOString(),

      openingBalance:
        balances.openingBalance,

      totalCredits:
        balances.totalCredits,

      totalDebits:
        balances.totalDebits,

      totalFees:
        balances.totalFees,

      closingBalance:
        balances.closingBalance,

      transactions:
        balances.transactions,
    },
  };
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  validateStatementDates,
  getCustomerAccount,
  getStatementTransactions,
  getOpeningBalance,
  classifyTransaction,
  calculateStatementBalances,
  buildAccountStatement,
};
