
const pool = require('../config/database');

// ============================================================
// ZENIMONIES ACCOUNT STATEMENT SERVICE
// ============================================================

// Supported statement period: maximum 365 days.
const MAX_STATEMENT_DAYS = 365;

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
    start.toISOString().slice(0, 10) !== startDate ||
    end.toISOString().slice(0, 10) !== endDate
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
    ORDER BY a.created_at ASC
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

      CASE
        WHEN t.type = 'transfer'
          THEN COALESCE(
            bt.recipient_name,
            'Bank transfer'
          )

        WHEN t.type = 'transfer_refund'
          THEN COALESCE(
            bt.recipient_name,
            'Bank transfer refund'
          )

        ELSE NULL
      END AS counterparty

    FROM transactions t

    LEFT JOIN bank_transfers bt
      ON bt.reference = t.reference
      OR (
        t.type = 'transfer_refund'
        AND t.description LIKE
          '%' || bt.reference || '%'
      )

    WHERE t.account_id = $1
      AND t.status = 'completed'
      AND t.created_at >=
        ($2::date)::timestamp

      AND t.created_at <
        (($3::date + INTERVAL '1 day')::timestamp)

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
// CALCULATE STATEMENT BALANCES
// ============================================================

const calculateStatementBalances = (
  transactions
) => {
  if (!Array.isArray(transactions)) {
    throw new Error(
      'Invalid statement transactions.'
    );
  }

  let openingBalance = 0;
  let closingBalance = 0;

  if (transactions.length > 0) {
    const firstTransaction =
      transactions[0];

    openingBalance =
      Number(
        firstTransaction.balance_before || 0
      );

    const lastTransaction =
      transactions[
        transactions.length - 1
      ];

    closingBalance =
      Number(
        lastTransaction.balance_after || 0
      );
  }

  let totalCredits = 0;
  let totalDebits = 0;

  const formattedTransactions =
    transactions.map((transaction) => {
      const amount =
        Number(transaction.amount);

      const fee =
        Number(
          transaction.transaction_fee || 0
        );

      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        !Number.isFinite(fee) ||
        fee < 0
      ) {
        throw new Error(
          'Invalid transaction amount found.'
        );
      }

      const type =
        String(
          transaction.type || ''
        ).toLowerCase();

      const isCredit =
        type === 'deposit' ||
        type === 'transfer_refund' ||
        type === 'refund' ||
        type === 'credit';

      const debit =
        isCredit ? 0 : amount;

      const credit =
        isCredit ? amount : 0;

      totalDebits += debit;
      totalCredits += credit;

      return {
        id: transaction.id,
        date: transaction.created_at,
        type: transaction.type,
        reference: transaction.reference,
        description:
          transaction.description ||
          transaction.type,
        counterparty:
          transaction.counterparty || '',
        currency:
          transaction.currency || 'NGN',
        debit,
        credit,
        fee,
        balance:
          Number(
            transaction.balance_after || 0
          ),
        status: transaction.status,
      };
    });

  return {
    openingBalance,
    totalCredits,
    totalDebits,
    closingBalance,
    transactions: formattedTransactions,
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
    await getCustomerAccount(userId);

  const transactions =
    await getStatementTransactions(
      account.account_id,
      dates.startDate,
      dates.endDate
    );

  const balances =
    calculateStatementBalances(
      transactions
    );

  return {
    customer: {
      userId: account.user_id,
      fullName: account.full_name,
      email: account.email,
    },

    account: {
      accountId: account.account_id,
      accountNumber:
        account.account_number,
      currency:
        account.currency || 'NGN',
    },

    statement: {
      startDate: dates.startDate,
      endDate: dates.endDate,
      generatedAt: new Date().toISOString(),
      openingBalance:
        balances.openingBalance,
      totalCredits:
        balances.totalCredits,
      totalDebits:
        balances.totalDebits,
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
  calculateStatementBalances,
  buildAccountStatement,
};
