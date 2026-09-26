const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// BUSINESS STATEMENT SERVICE
// ============================================================

const MAX_STATEMENT_DAYS = 365;

// ============================================================
// TRANSACTION TYPES
// ============================================================

const CREDIT_TYPES = new Set([
  'deposit',
  'credit',
  'refund',
  'transfer_refund',
  'internal_transfer_received',
  'business_transfer_received',
  'airtime_refund',
  'data_refund',
  'bill_refund',
  'electricity_refund',
  'tv_refund',
  'savings_maturity_release',
]);

const DEBIT_TYPES = new Set([
  'transfer',
  'transfer_fee',
  'withdrawal',
  'internal_transfer',
  'business_transfer',
  'airtime_purchase',
  'data_purchase',
  'tv_subscription',
  'bill_payment',
  'electricity_payment',
  'savings_lock',
  'pos_payment',
  'pos_settlement_fee',
]);

// ============================================================
// HELPERS
// ============================================================

const moneyToCents = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
};

const centsToMoney = (value) =>
  Number((Number(value || 0) / 100).toFixed(2));

const normalizeType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const isValidDate = (value) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// ============================================================
// VALIDATE STATEMENT DATES
// ============================================================

const validateBusinessStatementDates = (
  startDate,
  endDate
) => {
  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    throw new Error(
      'Please provide valid statement start and end dates.'
    );
  }

  if (startDate > endDate) {
    throw new Error(
      'Statement start date cannot be after the end date.'
    );
  }

  const start = new Date(
    `${startDate}T00:00:00.000Z`
  );

  const end = new Date(
    `${endDate}T00:00:00.000Z`
  );

  const days =
    Math.floor(
      (end.getTime() - start.getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1;

  if (days > MAX_STATEMENT_DAYS) {
    throw new Error(
      `Business statements cannot exceed ${MAX_STATEMENT_DAYS} days.`
    );
  }

  return {
    startDate,
    endDate,
  };
};

// ============================================================
// GET BUSINESS ACCOUNT
// Verifies that the authenticated user owns the business.
// ============================================================

const getBusinessStatementAccount = async ({
  businessId,
  userId,
}) => {
  if (!businessId || !userId) {
    throw new Error(
      'Business account and authenticated user are required.'
    );
  }

  const result = await pool.query(
    `
      SELECT
        b.id AS business_id,
        b.owner_user_id,
        b.business_account_id,
        b.business_name,
        b.currency,
        b.status AS business_status,
        b.verification_status,
        a.account_number,
        a.account_type,
        a.balance,
        a.status AS account_status
      FROM businesses b
      INNER JOIN accounts a
        ON a.id = b.business_account_id
      WHERE b.id = $1
        AND b.owner_user_id = $2
        AND a.account_type = 'business'
      LIMIT 1
    `,
    [businessId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error(
      'Business account not found or access denied.'
    );

    error.statusCode = 404;

    throw error;
  }

  return result.rows[0];
};

// ============================================================
// GET OPENING BALANCE
// Finds the last completed ledger balance before the
// statement start date.
// ============================================================

const getBusinessOpeningBalance = async ({
  accountId,
  startDate,
}) => {
  const result = await pool.query(
    `
      SELECT balance_after
      FROM transactions
      WHERE account_id = $1
        AND status = 'completed'
        AND balance_after IS NOT NULL
        AND created_at < $2::date
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [accountId, startDate]
  );

  if (result.rows.length > 0) {
    return moneyToCents(
      result.rows[0].balance_after
    );
  }

  // If there are no earlier completed transactions,
  // the opening balance is zero.
  return 0;
};

// ============================================================
// GET BUSINESS LEDGER TRANSACTIONS
// Only transactions belonging to the business account.
// ============================================================

const getBusinessLedgerTransactions = async ({
  accountId,
  startDate,
  endDate,
}) => {
  const result = await pool.query(
    `
      SELECT
        id,
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after,
        fee,
        created_at
      FROM transactions
      WHERE account_id = $1
        AND status IN (
          'completed',
          'pending',
          'processing'
        )
        AND created_at >= $2::date
        AND created_at < (
          $3::date + INTERVAL '1 day'
        )
      ORDER BY created_at ASC, id ASC
    `,
    [accountId, startDate, endDate]
  );

  return result.rows;
};

// ============================================================
// CLASSIFY TRANSACTION
// ============================================================

const classifyBusinessTransaction = (
  transaction
) => {
  const type = normalizeType(
    transaction.type
  );

  if (CREDIT_TYPES.has(type)) {
    return 'credit';
  }

  if (DEBIT_TYPES.has(type)) {
    return 'debit';
  }

  // Unknown transaction types are not silently counted
  // as credits or debits. They remain visible in the
  // statement with no effect on calculated totals.
  return 'other';
};

// ============================================================
// BUILD STATEMENT TRANSACTIONS
// ============================================================

const buildBusinessStatementTransactions = (
  transactions
) => {
  return transactions.map((transaction) => {
    const type = normalizeType(
      transaction.type
    );

    const direction =
      classifyBusinessTransaction(transaction);

    const amountCents = moneyToCents(
      transaction.amount
    );

    const feeCents = moneyToCents(
      transaction.fee
    );

    const isCompleted =
      String(transaction.status || '')
        .toLowerCase() === 'completed';

    const debitCents =
      direction === 'debit'
        ? amountCents
        : 0;

    const creditCents =
      direction === 'credit'
        ? amountCents
        : 0;

    return {
      id: transaction.id,
      date: transaction.created_at,
      reference:
        transaction.reference || '',
      description:
        transaction.description ||
        type.replace(/_/g, ' '),
      beneficiary: '',
      institution: '',
      type,
      status: transaction.status,
      debit: centsToMoney(debitCents),
      credit: centsToMoney(creditCents),
      fee: centsToMoney(feeCents),
      balance:
        transaction.balance_after == null
          ? null
          : Number(transaction.balance_after),
      currency:
        transaction.currency || 'NGN',
      _direction: direction,
      _amountCents: amountCents,
      _feeCents: feeCents,
      _isCompleted: isCompleted,
    };
  });
};

// ============================================================
// CALCULATE BUSINESS STATEMENT TOTALS
// Only completed transactions affect posted totals.
// ============================================================

const calculateBusinessStatementBalances = ({
  openingBalanceCents,
  transactions,
}) => {
  let totalCreditsCents = 0;
  let totalDebitsCents = 0;
  let totalFeesCents = 0;

  let closingBalanceCents =
    openingBalanceCents;

  for (const transaction of transactions) {
    if (!transaction._isCompleted) {
      continue;
    }

    if (
      transaction._direction === 'credit'
    ) {
      totalCreditsCents +=
        transaction._amountCents;
    }

    if (
      transaction._direction === 'debit'
    ) {
      totalDebitsCents +=
        transaction._amountCents;
    }

    totalFeesCents +=
      transaction._feeCents;

    if (transaction.balance != null) {
      closingBalanceCents =
        moneyToCents(transaction.balance);
    }
  }

  return {
    openingBalance: centsToMoney(
      openingBalanceCents
    ),
    totalCredits: centsToMoney(
      totalCreditsCents
    ),
    totalDebits: centsToMoney(
      totalDebitsCents
    ),
    totalFees: centsToMoney(
      totalFeesCents
    ),
    closingBalance: centsToMoney(
      closingBalanceCents
    ),
  };
};

// ============================================================
// BUILD BUSINESS ACCOUNT STATEMENT
// ============================================================

const buildBusinessAccountStatement = async ({
  userId,
  businessId,
  startDate,
  endDate,
}) => {
  validateBusinessStatementDates(
    startDate,
    endDate
  );

  // Verify ownership before reading ledger information.
  const business =
    await getBusinessStatementAccount({
      businessId,
      userId,
    });

  const openingBalanceCents =
    await getBusinessOpeningBalance({
      accountId: business.business_account_id,
      startDate,
    });

  const ledgerTransactions =
    await getBusinessLedgerTransactions({
      accountId: business.business_account_id,
      startDate,
      endDate,
    });

  const statementTransactions =
    buildBusinessStatementTransactions(
      ledgerTransactions
    );

  const balances =
    calculateBusinessStatementBalances({
      openingBalanceCents,
      transactions: statementTransactions,
    });

  const transactions =
    statementTransactions.map(
      ({
        _direction,
        _amountCents,
        _feeCents,
        _isCompleted,
        ...transaction
      }) => transaction
    );

  return {
    customer: {
      fullName: business.business_name,
      email: '',
      phone: '',
      address: '',
    },

    account: {
      accountNumber:
        business.account_number || '',
      currency: business.currency || 'NGN',
      accountType: 'Business Account',
    },

    business: {
      id: business.business_id,
      businessName: business.business_name,
      verificationStatus:
        business.verification_status,
      businessStatus: business.business_status,
      accountStatus: business.account_status,
    },

    statement: {
      startDate,
      endDate,
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
      currency: business.currency || 'NGN',
      transactions,
    },
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  MAX_STATEMENT_DAYS,
  validateBusinessStatementDates,
  getBusinessStatementAccount,
  buildBusinessAccountStatement,
};
