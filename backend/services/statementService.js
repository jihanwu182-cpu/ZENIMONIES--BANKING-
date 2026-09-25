
const pool = require('../config/database');

// ============================================================
// ZENIMONIES ACCOUNT STATEMENT SERVICE
// ============================================================

const MAX_STATEMENT_DAYS = 365;

// ============================================================
// MONEY HELPERS
// ============================================================

const toKobo = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid monetary amount found.');
  }

  return Math.round((amount + Number.EPSILON) * 100);
};

const fromKobo = (value) => {
  return Number((value / 100).toFixed(2));
};

const toNullableMoney = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return fromKobo(toKobo(value));
};

// ============================================================
// DATE VALIDATION
// ============================================================

const validateStatementDates = (startDate, endDate) => {
  if (
    typeof startDate !== 'string' ||
    typeof endDate !== 'string'
  ) {
    throw new Error(
      'Start date and end date are required.'
    );
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(startDate) ||
    !datePattern.test(endDate)
  ) {
    throw new Error(
      'Dates must use YYYY-MM-DD format.'
    );
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.toISOString().slice(0, 10) !== startDate ||
    end.toISOString().slice(0, 10) !== endDate
  ) {
    throw new Error('Invalid statement dates.');
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
// LOAD CUSTOMER ACCOUNT AND REGISTERED ADDRESS
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

      u.address,
      u.city,
      u.state,
      u.lga,
      u.country,

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

  const account = result.rows[0];

  const addressParts = [
    account.address,
    account.city,
    account.lga,
    account.state,
    account.country,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  return {
    ...account,
    registered_address:
      addressParts.length > 0
        ? [...new Set(addressParts)].join(', ')
        : 'Address not provided',
  };
};

// ============================================================
// GET COMPLETED TRANSACTIONS WITH METADATA
//
// The central transactions table is the authoritative
// statement ledger.
//
// Operational tables are only used to enrich the ledger.
// They are not independently counted as transactions.
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

      -- BANK TRANSFERS
      bt.recipient_name AS transfer_beneficiary,
      bt.recipient_bank_name AS transfer_bank,
      bt.recipient_account_number AS transfer_account_number,

      -- AIRTIME
      airt.network AS airtime_network,
      airt.phone_number AS airtime_phone,

      -- DATA
      data_tx.network AS data_network,
      data_tx.phone_number AS data_phone,
      data_tx.plan_name AS data_plan_name,

      -- ELECTRICITY AND OTHER BILLS
      bill.category AS bill_category,
      bill.biller_name AS biller_name,
      bill.customer_reference AS bill_customer_reference,
      bill.customer_name AS bill_customer_name,
      bill.meter_number AS bill_meter_number,
      bill.electricity_token AS electricity_token,
      bill.units AS electricity_units,

      -- WITHDRAWALS
      w.destination_bank_name AS withdrawal_bank,
      w.destination_account_name AS withdrawal_beneficiary,
      w.destination_account_number AS withdrawal_account_number

    FROM transactions t

    LEFT JOIN bank_transfers bt
      ON bt.reference = t.reference
      AND bt.account_id = t.account_id
      AND t.type IN (
        'transfer',
        'internal_transfer',
        'internal_transfer_received'
      )

    LEFT JOIN airtime_transactions airt
      ON airt.reference = t.reference
      AND t.type = 'airtime_purchase'

    LEFT JOIN data_transactions data_tx
      ON data_tx.reference = t.reference
      AND t.type = 'data_purchase'

    LEFT JOIN bill_payments bill
      ON (
        bill.reference = t.reference
        OR (
          t.type = 'electricity_refund'
          AND bill.reference =
            REGEXP_REPLACE(t.reference, '^REF-', '')
        )
      )
      AND bill.account_id = t.account_id

    LEFT JOIN withdrawals w
      ON w.reference = t.reference
      AND w.account_id = t.account_id
      AND t.type = 'withdrawal'

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

  if (result.rows[0].balance_after === null) {
    throw new Error(
      'The opening balance cannot be verified because the latest prior ledger entry has no balance snapshot.'
    );
  }

  return toKobo(
    result.rows[0].balance_after
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

  'internal_transfer_received',

  'data_refund',
  'airtime_refund',
  'bill_refund',
  'electricity_refund',

  'savings_maturity_release',
]);

const DEBIT_TYPES = new Set([
  'transfer',
  'withdrawal',

  'internal_transfer',

  'airtime_purchase',
  'data_purchase',

  'bill_payment',
  'electricity_payment',

  'savings_lock',
]);

const classifyTransaction = (transactionType) => {
  const type = String(
    transactionType || ''
  ).toLowerCase();

  if (CREDIT_TYPES.has(type)) {
    return 'credit';
  }

  if (DEBIT_TYPES.has(type)) {
    return 'debit';
  }

  throw new Error(
    `Unreviewed transaction type "${type}" found. Statement generation stopped to prevent incorrect debit or credit reporting.`
  );
};

// ============================================================
// TRANSACTION DESCRIPTION
// ============================================================

const getTransactionDescription = (transaction) => {
  const type = String(
    transaction.type || ''
  ).toLowerCase();

  if (
    type === 'airtime_purchase' &&
    transaction.airtime_network
  ) {
    return `Airtime purchase - ${transaction.airtime_network}`;
  }

  if (
    type === 'data_purchase' &&
    transaction.data_network
  ) {
    return [
      'Data purchase',
      transaction.data_network,
      transaction.data_plan_name,
    ]
      .filter(Boolean)
      .join(' - ');
  }

  if (
    type === 'electricity_payment' &&
    transaction.biller_name
  ) {
    return `Electricity payment - ${transaction.biller_name}`;
  }

  if (
    type === 'savings_lock'
  ) {
    return transaction.description ||
      'Savings locked';
  }

  if (
    type === 'savings_maturity_release'
  ) {
    return 'Matured savings principal released';
  }

  return transaction.description ||
    transaction.type ||
    'Account transaction';
};

// ============================================================
// BENEFICIARY AND INSTITUTION
// ============================================================

const getBeneficiary = (transaction) => {
  const type = String(
    transaction.type || ''
  ).toLowerCase();

  if (
    type === 'transfer' ||
    type === 'internal_transfer'
  ) {
    return transaction.transfer_beneficiary || '';
  }

  if (type === 'internal_transfer_received') {
    return transaction.transfer_beneficiary || '';
  }

  if (type === 'withdrawal') {
    return transaction.withdrawal_beneficiary || '';
  }

  if (type === 'airtime_purchase') {
    return transaction.airtime_phone || '';
  }

  if (type === 'data_purchase') {
    return transaction.data_phone || '';
  }

  if (
    type === 'electricity_payment' ||
    type === 'bill_payment'
  ) {
    return (
      transaction.bill_customer_name ||
      transaction.bill_customer_reference ||
      transaction.bill_meter_number ||
      ''
    );
  }

  return '';
};

const getInstitution = (transaction) => {
  const type = String(
    transaction.type || ''
  ).toLowerCase();

  if (
    type === 'transfer' ||
    type === 'internal_transfer' ||
    type === 'internal_transfer_received'
  ) {
    return transaction.transfer_bank || '';
  }

  if (type === 'withdrawal') {
    return transaction.withdrawal_bank || '';
  }

  if (
    type === 'airtime_purchase'
  ) {
    return transaction.airtime_network || '';
  }

  if (
    type === 'data_purchase'
  ) {
    return transaction.data_network || '';
  }

  if (
    type === 'electricity_payment' ||
    type === 'bill_payment'
  ) {
    return transaction.biller_name || '';
  }

  return '';
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

  const formattedTransactions =
    transactions.map((transaction) => {
      const amountKobo =
        toKobo(transaction.amount);

      const feeKobo =
        toKobo(
          transaction.transaction_fee || 0
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
        isCredit ? 0 : amountKobo;

      totalCreditsKobo += creditKobo;
      totalDebitsKobo += debitKobo;

      const hasBalanceSnapshot =
        transaction.balance_after !== null &&
        transaction.balance_after !== undefined;

      return {
        id: transaction.id,

        date:
          transaction.created_at,

        type:
          transaction.type,

        reference:
          transaction.reference,

        description:
          getTransactionDescription(
            transaction
          ),

        counterparty:
          getBeneficiary(transaction),

        institution:
          getInstitution(transaction),

        currency:
          transaction.currency || 'NGN',

        debit:
          fromKobo(debitKobo),

        credit:
          fromKobo(creditKobo),

        fee:
          fromKobo(feeKobo),

        // Never fabricate a zero balance when
        // the transaction has no recorded snapshot.
        balance:
          hasBalanceSnapshot
            ? toNullableMoney(
                transaction.balance_after
              )
            : null,

        balanceBefore:
          toNullableMoney(
            transaction.balance_before
          ),

        status:
          transaction.status,
      };
    });

  // ----------------------------------------------------------
  // CLOSING BALANCE
  // ----------------------------------------------------------

  let closingBalanceKobo =
    openingBalanceKobo;

  if (transactions.length > 0) {
    const lastTransaction =
      transactions[transactions.length - 1];

    if (
      lastTransaction.balance_after === null ||
      lastTransaction.balance_after === undefined
    ) {
      throw new Error(
        'The closing balance cannot be verified because the latest statement transaction has no recorded balance snapshot.'
      );
    }

    closingBalanceKobo =
      toKobo(
        lastTransaction.balance_after
      );
  }

  return {
    openingBalance:
      fromKobo(openingBalanceKobo),

    totalCredits:
      fromKobo(totalCreditsKobo),

    totalDebits:
      fromKobo(totalDebitsKobo),

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

      address:
        account.registered_address,
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

      closingBalance:
        balances.closingBalance,

      transactions:
        balances.transactions,
    },
  };
};

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
