
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// ACCOUNT STATEMENT SERVICE
//
// Includes completed, pending and processing transactions.
//
// Pending transactions are displayed but are not treated as
// posted ledger entries for statement balance calculations.
// ============================================================

const MAX_STATEMENT_DAYS = 365;

// ============================================================
// TRANSACTION STATUSES
// ============================================================

const VISIBLE_STATUSES = new Set([
  'completed',
  'pending',
  'processing',
]);

const POSTED_STATUS = 'completed';

// ============================================================
// TRANSACTION TYPES
// ============================================================

const CREDIT_TYPES = new Set([
  'deposit',
  'transfer_refund',
  'refund',
  'credit',

  'internal_transfer_received',

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
  'airtime_purchase',
  'data_purchase',
  'tv_subscription',
  'bill_payment',
  'electricity_payment',
  'savings_lock',
]);

// ============================================================
// MONEY HELPERS
// ============================================================

function toKobo(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new Error(
      'Invalid monetary amount in statement.'
    );
  }

  return Math.round(amount * 100);
}

function fromKobo(value) {
  return Number((value / 100).toFixed(2));
}

// ============================================================
// NORMALIZATION HELPERS
// ============================================================

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase();
}

function formatAddress(customer) {
  const parts = [
    customer.address,
    customer.city,
    customer.lga,
    customer.state,
    customer.country,
  ];

  const cleaned = parts
    .filter((part) => typeof part === 'string')
    .map((part) => part.trim())
    .filter(Boolean);

  return cleaned.length
    ? [...new Set(cleaned)].join(', ')
    : 'Address not provided';
}

// ============================================================
// DATE VALIDATION
// ============================================================

function isValidDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateStatementDates(
  startDate,
  endDate
) {
  if (
    !isValidDateString(startDate) ||
    !isValidDateString(endDate)
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
      (end - start) / 86400000
    ) + 1;

  if (days > MAX_STATEMENT_DAYS) {
    throw new Error(
      'Statements cannot exceed 365 days.'
    );
  }

  return {
    startDate,
    endDate,
  };
}

// ============================================================
// CUSTOMER AND ACCOUNT
// ============================================================

async function getCustomerAccount(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.address,
        u.city,
        u.lga,
        u.state,
        u.country,

        a.id AS account_id,
        a.account_number,
        a.currency,
        a.balance AS current_account_balance,
        a.status AS account_status

      FROM users u

      INNER JOIN accounts a
        ON a.user_id = u.id

      WHERE
        u.id = $1
        AND a.status = 'active'

      ORDER BY a.created_at ASC

      LIMIT 1
    `,
    [userId]
  );

  if (!result.rows.length) {
    throw new Error(
      'No active account was found for this customer.'
    );
  }

  const row = result.rows[0];

  return {
    userId: row.user_id,

    fullName: row.full_name,
    email: row.email,

    address: formatAddress(row),

    accountId: row.account_id,
    accountNumber: row.account_number,
    currency: row.currency,

    currentAccountBalance:
      row.current_account_balance === null ||
      row.current_account_balance === undefined
        ? null
        : Number(row.current_account_balance),

    accountStatus: row.account_status,
  };
}

// ============================================================
// TRANSACTION CLASSIFICATION
// ============================================================

function classifyTransaction(type) {
  if (CREDIT_TYPES.has(type)) {
    return 'credit';
  }

  if (DEBIT_TYPES.has(type)) {
    return 'debit';
  }

  throw new Error(
    `Unsupported statement transaction type: ${type}`
  );
}

// ============================================================
// FETCH STATEMENT TRANSACTIONS
//
// Central transactions table is the source of truth.
//
// Completed, pending and processing transactions are
// displayed in the statement.
//
// Only completed transactions are used for posted balances.
//
// Supplemental tables provide details only.
// ============================================================

async function getStatementTransactions(
  accountId,
  startDate,
  endDate
) {
  const result = await pool.query(
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

        -- Bank transfer details
        bt.recipient_name
          AS transfer_recipient_name,

        bt.recipient_bank_name
          AS transfer_bank_name,

        bt.recipient_account_number
          AS transfer_account_number,

        -- Deposit details
        d.payment_method
          AS deposit_payment_method,

        -- Withdrawal details
        w.destination_bank_name
          AS withdrawal_bank_name,

        w.destination_account_name
          AS withdrawal_account_name,

        w.destination_account_number
          AS withdrawal_account_number,

        -- Airtime details
        airtime.network
          AS airtime_network,

        airtime.phone_number
          AS airtime_phone,

        -- Data details
        data.network
          AS data_network,

        data.phone_number
          AS data_phone,

        data.plan_name
          AS data_plan_name,

        -- Bill and electricity details
        bill.category
          AS bill_category,

        bill.biller_name
          AS biller_name,

        bill.customer_reference
          AS bill_customer_reference,

        bill.customer_name
          AS bill_customer_name,

        bill.meter_number
          AS bill_meter_number,

        bill.units
          AS electricity_units

      FROM transactions t

      LEFT JOIN bank_transfers bt
        ON bt.reference = t.reference
        AND bt.account_id = t.account_id

      LEFT JOIN deposits d
        ON d.reference = t.reference
        AND d.account_id = t.account_id

      LEFT JOIN withdrawals w
        ON w.reference = t.reference
        AND w.account_id = t.account_id

      LEFT JOIN airtime_transactions airtime
        ON airtime.reference = t.reference
        AND airtime.account_id = t.account_id

      LEFT JOIN data_transactions data
        ON data.reference = t.reference
        AND data.account_id = t.account_id

      LEFT JOIN bill_payments bill
        ON bill.account_id = t.account_id
        AND (
          bill.reference = t.reference

          OR (
            t.type = 'electricity_refund'
            AND bill.reference =
              regexp_replace(
                t.reference,
                '^REF-',
                ''
              )
          )
        )

      WHERE
        t.account_id = $1

        AND LOWER(TRIM(t.status)) IN (
          'completed',
          'pending',
          'processing'
        )

        AND t.created_at >= $2::date

        AND t.created_at <
          ($3::date + INTERVAL '1 day')

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
}

// ============================================================
// OPENING BALANCE
//
// Only completed ledger entries can establish the opening
// balance.
//
// Pending and processing transactions are excluded.
// ============================================================

async function getOpeningBalance(
  accountId,
  startDate
) {
  const result = await pool.query(
    `
      SELECT
        balance_after

      FROM transactions

      WHERE
        account_id = $1

        AND LOWER(TRIM(status)) = 'completed'

        AND created_at < $2::date

        AND balance_after IS NOT NULL

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

  if (!result.rows.length) {
    return null;
  }

  return Number(
    result.rows[0].balance_after
  );
}

// ============================================================
// TRANSACTION DESCRIPTION AND DETAILS
// ============================================================

function buildTransactionDetails(transaction) {
  const type = transaction.type;

  let description =
    transaction.description ||
    'Account transaction';

  let beneficiary = '';
  let institution = '';

  // ----------------------------------------------------------
  // BANK TRANSFERS
  // ----------------------------------------------------------

  if (
    type === 'transfer' ||
    type === 'internal_transfer'
  ) {
    beneficiary =
      transaction.transfer_recipient_name || '';

    institution =
      transaction.transfer_bank_name || '';

    if (
      !institution &&
      type === 'internal_transfer'
    ) {
      institution = 'Zenimonies';
    }
  }

  // ----------------------------------------------------------
  // INTERNAL TRANSFER RECEIVED
  // ----------------------------------------------------------

  if (type === 'internal_transfer_received') {
    institution = 'Zenimonies';
  }

  // ----------------------------------------------------------
  // TRANSFER REFUNDS
  // ----------------------------------------------------------

  if (type === 'transfer_refund') {
    institution =
      transaction.transfer_bank_name ||
      'Bank transfer';
  }

  // ----------------------------------------------------------
  // WITHDRAWALS
  // ----------------------------------------------------------

  if (type === 'withdrawal') {
    beneficiary =
      transaction.withdrawal_account_name || '';

    institution =
      transaction.withdrawal_bank_name || '';
  }

  // ----------------------------------------------------------
  // DEPOSITS
  // ----------------------------------------------------------

  if (type === 'deposit') {
    institution =
      transaction.deposit_payment_method || '';
  }

  // ----------------------------------------------------------
  // AIRTIME
  // ----------------------------------------------------------

  if (
    type === 'airtime_purchase' ||
    type === 'airtime_refund'
  ) {
    institution =
      transaction.airtime_network || '';

    beneficiary =
      transaction.airtime_phone || '';
  }

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  if (
    type === 'data_purchase' ||
    type === 'data_refund'
  ) {
    institution =
      transaction.data_network || '';

    beneficiary =
      transaction.data_phone || '';

    if (transaction.data_plan_name) {
      description =
        `${description} - ${transaction.data_plan_name}`;
    }
  }

  // ----------------------------------------------------------
  // TV SUBSCRIPTIONS AND REFUNDS
  // ----------------------------------------------------------

  if (
    type === 'tv_subscription' ||
    type === 'tv_refund'
  ) {
    institution =
      transaction.biller_name ||
      transaction.bill_category ||
      'TV subscription';

    beneficiary =
      transaction.bill_customer_name ||
      transaction.bill_customer_reference ||
      '';
  }

  // ----------------------------------------------------------
  // ELECTRICITY AND OTHER BILLS
  //
  // Electricity tokens are never returned.
  // Electricity units may be shown when available.
  // ----------------------------------------------------------

  if (
    type === 'electricity_payment' ||
    type === 'electricity_refund' ||
    type === 'bill_payment' ||
    type === 'bill_refund'
  ) {
    institution =
      transaction.biller_name ||
      transaction.bill_category ||
      '';

    beneficiary =
      transaction.bill_customer_name ||
      transaction.bill_customer_reference ||
      transaction.bill_meter_number ||
      '';

    if (
      transaction.electricity_units &&
      (
        type === 'electricity_payment' ||
        type === 'electricity_refund'
      )
    ) {
      description =
        `${description} | Units: ${transaction.electricity_units}`;
    }
  }

  // ----------------------------------------------------------
  // SAVINGS
  // ----------------------------------------------------------

  if (
    type === 'savings_lock' ||
    type === 'savings_maturity_release'
  ) {
    institution = 'Zenimonies Savings';
  }

  // ----------------------------------------------------------
  // RETURN STATEMENT DETAILS
  // ----------------------------------------------------------

  return {
    description,
    beneficiary,
    institution,
  };
}

// ============================================================
// CALCULATE STATEMENT TOTALS
//
// Pending and processing transactions appear in the history.
//
// Only completed transactions affect posted credit and
// debit totals.
//
// Transaction fees remain separately displayed.
// ============================================================

function calculateStatementBalances(
  openingBalance,
  transactions
) {
  let totalCreditsKobo = 0;
  let totalDebitsKobo = 0;

  const formattedTransactions =
    transactions.map((transaction) => {
      const type = classifyTransaction(
        transaction.type
      );

      const status = normalizeStatus(
        transaction.status
      );

      if (!VISIBLE_STATUSES.has(status)) {
        throw new Error(
          `Unsupported statement transaction status: ${status}`
        );
      }

      const amountKobo = toKobo(
        transaction.amount
      );

      const feeKobo = toKobo(
        transaction.transaction_fee ?? 0
      );

      // ------------------------------------------------------
      // POSTED TOTALS
      //
      // Pending and processing transactions do not change
      // the posted statement totals.
      // ------------------------------------------------------

      if (status === POSTED_STATUS) {
        if (type === 'credit') {
          totalCreditsKobo += amountKobo;
        } else {
          totalDebitsKobo +=
            amountKobo + feeKobo;
        }
      }

      const details =
        buildTransactionDetails(transaction);

      return {
        id: transaction.id,

        date: transaction.created_at,

        reference: transaction.reference,

        type: transaction.type,

        status,

        description: details.description,

        beneficiary: details.beneficiary,

        institution: details.institution,

        // Show the transaction amount in the history,
        // including pending and processing transactions.
        //
        // These displayed amounts do not automatically
        // mean the funds have been posted to the ledger.

        debit:
          type === 'debit'
            ? fromKobo(amountKobo)
            : 0,

        credit:
          type === 'credit'
            ? fromKobo(amountKobo)
            : 0,

        fee: fromKobo(feeKobo),

        balance:
          status !== POSTED_STATUS ||
          transaction.balance_after === null ||
          transaction.balance_after === undefined
            ? null
            : Number(transaction.balance_after),

        currency: transaction.currency,
      };
    });

  return {
    openingBalance,

    totalCredits:
      fromKobo(totalCreditsKobo),

    totalDebits:
      fromKobo(totalDebitsKobo),

    transactions: formattedTransactions,
  };
}

// ============================================================
// BUILD ACCOUNT STATEMENT
// ============================================================

async function buildAccountStatement({
  userId,
  startDate,
  endDate,
}) {
  validateStatementDates(
    startDate,
    endDate
  );

  if (!userId) {
    throw new Error(
      'Authenticated customer ID is required.'
    );
  }

  const customer =
    await getCustomerAccount(userId);

  const openingBalance =
    await getOpeningBalance(
      customer.accountId,
      startDate
    );

  const transactions =
    await getStatementTransactions(
      customer.accountId,
      startDate,
      endDate
    );

  const balances =
    calculateStatementBalances(
      openingBalance,
      transactions
    );

  // ----------------------------------------------------------
  // CLOSING BALANCE
  //
  // Pending and processing transactions must not overwrite
  // the last completed transaction balance.
  //
  // The closing balance is the latest completed ledger
  // snapshot within the statement period.
  //
  // If there is no completed transaction during the period,
  // retain the opening balance.
  // ----------------------------------------------------------

  const completedTransactions =
    transactions.filter(
      (transaction) =>
        normalizeStatus(transaction.status) ===
        POSTED_STATUS
    );

  const lastTransaction =
    completedTransactions.length > 0
      ? completedTransactions[
          completedTransactions.length - 1
        ]
      : null;

  let closingBalance = openingBalance;

  if (lastTransaction) {
    closingBalance =
      lastTransaction.balance_after === null ||
      lastTransaction.balance_after === undefined
        ? null
        : Number(lastTransaction.balance_after);
  }

  // ----------------------------------------------------------
  // RETURN STATEMENT
  // ----------------------------------------------------------

  return {
    customer: {
      userId: customer.userId,

      fullName: customer.fullName,

      email: customer.email,

      address: customer.address,
    },

    account: {
      id: customer.accountId,

      accountNumber: customer.accountNumber,

      currency: customer.currency,
    },

    statement: {
      startDate,

      endDate,

      openingBalance:
        openingBalance === null
          ? null
          : Number(openingBalance),

      totalCredits:
        balances.totalCredits,

      totalDebits:
        balances.totalDebits,

      closingBalance,

      transactions:
        balances.transactions,
    },
  };
}

// ============================================================
// EXPORTS
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
