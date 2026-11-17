
const crypto = require('crypto');
const pool = require('../config/database');

const {
  purchaseAirtime,
  generateRequestId,
} = require('../services/airtimeService');

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => (
  req.user?.id ||
  req.user?.userId ||
  req.user?.user_id ||
  null
);

const normalizePhone = (phone) => {
  if (!phone) return '';

  return String(phone)
    .trim()
    .replace(/\s+/g, '')
    .replace(/^\+234/, '0')
    .replace(/^234/, '0');
};

const normalizeNetwork = (network) => {
  const value = String(network || '')
    .trim()
    .toLowerCase();

  if (value === 'mtn') return 'MTN';
  if (value === 'airtel') return 'Airtel';
  if (value === 'glo') return 'Glo';

  if (
    value === '9mobile' ||
    value === 'etisalat' ||
    value === 't2' ||
    value === 't2mobile'
  ) {
    return '9mobile';
  }

  return '';
};

const generateReference = () => (
  `ZEN-AIRTIME-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`
);

const generateRefundReference = (reference) => (
  `ZEN-AIRTIME-REFUND-${reference}`
);

const isValidNigerianPhone = (phone) => (
  /^0[789][01]\d{8}$/.test(phone)
);

// ============================================================
// SOGO RESPONSE HELPERS
// ============================================================

const getSogoTransaction = (response) => (
  response?.transaction ||
  response?.data?.transaction ||
  response?.data ||
  response ||
  {}
);

const getProviderStatus = (response) => {
  const transaction = getSogoTransaction(response);

  const status = String(
    transaction?.status ||
    response?.status ||
    ''
  ).trim().toLowerCase();

  if (
    ['completed', 'complete', 'successful', 'success'].includes(status)
  ) {
    return 'completed';
  }

  if (
    ['processing', 'pending', 'initiated', 'queued'].includes(status)
  ) {
    return 'pending';
  }

  if (
    ['failed', 'failure', 'declined'].includes(status)
  ) {
    return 'failed';
  }

  if (status === 'refunded') {
    return 'refunded';
  }

  if (status === 'cancelled' || status === 'canceled') {
    return 'failed';
  }

  // Unknown responses must never trigger an automatic refund.
  return 'unknown';
};

const getProviderReference = (response, fallback) => {
  const transaction = getSogoTransaction(response);

  return (
    transaction?.id ||
    transaction?.transaction_id ||
    transaction?.reference ||
    response?.reference ||
    response?.transaction_id ||
    fallback ||
    null
  );
};

const getProviderMessage = (response) => {
  const transaction = getSogoTransaction(response);

  return (
    transaction?.message ||
    transaction?.description ||
    response?.message ||
    response?.description ||
    null
  );
};

// ============================================================
// SAVE PROVIDER RESPONSE
// ============================================================

const saveProviderResponse = async ({
  reference,
  providerReference,
  providerRequestId,
  providerResponse,
  status,
}) => {
  await pool.query(
    `
    UPDATE airtime_transactions
    SET
      provider_reference = $1,
      provider_request_id = $2,
      provider_response = $3::jsonb,
      status = $4
    WHERE reference = $5
      AND status = 'pending'
    `,
    [
      providerReference,
      providerRequestId,
      JSON.stringify(providerResponse || {}),
      status,
      reference,
    ]
  );
};

// ============================================================
// COMPLETE AIRTIME TRANSACTION
// ============================================================

const completeAirtimeTransaction = async ({
  reference,
  providerReference,
  providerRequestId,
  providerResponse,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockedResult = await client.query(
      `
      SELECT id, status
      FROM airtime_transactions
      WHERE reference = $1
      FOR UPDATE
      `,
      [reference]
    );

    if (lockedResult.rows.length === 0) {
      throw new Error(
        'Airtime transaction not found during completion.'
      );
    }

    const currentStatus = lockedResult.rows[0].status;

    if (currentStatus === 'completed') {
      await client.query('COMMIT');
      return { status: 'completed', alreadyProcessed: true };
    }

    if (currentStatus !== 'pending') {
      await client.query('ROLLBACK');

      return {
        status: currentStatus,
        alreadyProcessed: true,
      };
    }

    await client.query(
      `
      UPDATE airtime_transactions
      SET
        provider_reference = $1,
        provider_request_id = $2,
        provider_response = $3::jsonb,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE reference = $4
        AND status = 'pending'
      `,
      [
        providerReference,
        providerRequestId,
        JSON.stringify(providerResponse || {}),
        reference,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND status = 'pending'
      `,
      [reference]
    );

    await client.query('COMMIT');

    return {
      status: 'completed',
      alreadyProcessed: false,
    };

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback error.
    }

    throw error;

  } finally {
    client.release();
  }
};

// ============================================================
// REFUND AIRTIME TRANSACTION
//
// Refund only after an explicit Sogo failed/refunded status.
// The database row lock prevents duplicate refunds.
// ============================================================

const refundAirtimeTransaction = async ({
  reference,
  providerReference,
  providerRequestId,
  providerResponse,
  finalStatus,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockedResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        status
      FROM airtime_transactions
      WHERE reference = $1
      FOR UPDATE
      `,
      [reference]
    );

    if (lockedResult.rows.length === 0) {
      throw new Error(
        'Airtime transaction not found during refund.'
      );
    }

    const airtimeRecord = lockedResult.rows[0];

    if (airtimeRecord.status === 'failed' ||
        airtimeRecord.status === 'refunded') {
      await client.query('COMMIT');

      return {
        status: airtimeRecord.status,
        refunded: true,
        alreadyProcessed: true,
      };
    }

    if (airtimeRecord.status === 'completed') {
      await client.query('COMMIT');

      return {
        status: 'completed',
        refunded: false,
        alreadyProcessed: true,
      };
    }

    if (airtimeRecord.status !== 'pending') {
      await client.query('ROLLBACK');

      return {
        status: airtimeRecord.status,
        refunded: false,
        alreadyProcessed: true,
      };
    }

    const accountResult = await client.query(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [airtimeRecord.account_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error(
        'Wallet account not found during Airtime refund.'
      );
    }

    const currentBalance = Number(
      accountResult.rows[0].balance
    );

    const refundAmount = Number(
      airtimeRecord.amount
    );

    if (
      !Number.isFinite(currentBalance) ||
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      throw new Error(
        'Invalid wallet balance or refund amount.'
      );
    }

    const refundedBalance = Number(
      (currentBalance + refundAmount).toFixed(2)
    );

    // Credit wallet.
    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        refundedBalance,
        airtimeRecord.account_id,
      ]
    );

    // Update Airtime transaction.
    await client.query(
      `
      UPDATE airtime_transactions
      SET
        provider_reference = $1,
        provider_request_id = $2,
        provider_response = $3::jsonb,
        status = $4
      WHERE id = $5
        AND status = 'pending'
      `,
      [
        providerReference,
        providerRequestId,
        JSON.stringify(providerResponse || {}),
        finalStatus,
        airtimeRecord.id,
      ]
    );

    // Update original central transaction.
    await client.query(
      `
      UPDATE transactions
      SET
        status = 'failed',
        balance_after = $1
      WHERE reference = $2
        AND status = 'pending'
      `,
      [
        refundedBalance,
        reference,
      ]
    );

    // Create refund ledger entry.
    const refundReference =
      generateRefundReference(reference);

    await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after,
        created_at
      )
      VALUES (
        $1,
        'airtime_refund',
        $2,
        'NGN',
        $3,
        $4,
        'completed',
        $5,
        $6,
        CURRENT_TIMESTAMP
      )
      `,
      [
        airtimeRecord.account_id,
        refundAmount,
        refundReference,
        `Sogo Airtime refund - ${reference}`,
        currentBalance,
        refundedBalance,
      ]
    );

    await client.query('COMMIT');

    return {
      status: finalStatus,
      refunded: true,
      alreadyProcessed: false,
      refundReference,
      refundedBalance,
    };

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback error.
    }

    throw error;

  } finally {
    client.release();
  }
};

// ============================================================
// BUY AIRTIME
// POST /api/airtime
// ============================================================

const buyAirtime = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const {
    network,
    phone,
    amount,
  } = req.body || {};

  const normalizedNetwork = normalizeNetwork(network);
  const normalizedPhone = normalizePhone(phone);
  const numericAmount = Number(amount);

  // ----------------------------------------------------------
  // INPUT VALIDATION
  // ----------------------------------------------------------

  if (!normalizedNetwork) {
    return res.status(400).json({
      success: false,
      message: 'Please select a valid network.',
    });
  }

  if (!isValidNigerianPhone(normalizedPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid Nigerian phone number.',
    });
  }

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 50 ||
    numericAmount > 50000
  ) {
    return res.status(400).json({
      success: false,
      message: 'Airtime amount must be between ₦50 and ₦50,000.',
    });
  }

  if (
    Math.round(numericAmount * 100) !==
    numericAmount * 100
  ) {
    return res.status(400).json({
      success: false,
      message: 'Airtime amount can have a maximum of two decimal places.',
    });
  }

  // ----------------------------------------------------------
  // REFERENCES
  // ----------------------------------------------------------

  const reference = generateReference();
  const providerRequestId = generateRequestId();

  const client = await pool.connect();
  let transactionStarted = false;

  let account;
  let transactionResult;
  let balanceBefore;
  let balanceAfter;

  try {
    // --------------------------------------------------------
    // LOCK ACCOUNT
    // --------------------------------------------------------

    await client.query('BEGIN');
    transactionStarted = true;

    const accountResult = await client.query(
      `
      SELECT
        id,
        user_id,
        currency,
        balance,
        status
      FROM accounts
      WHERE user_id = $1
        AND currency = 'NGN'
        AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'Active NGN account not found.',
      });
    }

    account = accountResult.rows[0];

    const balance = Number(account.balance);

    if (!Number.isFinite(balance)) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(500).json({
        success: false,
        message: 'Unable to verify account balance.',
      });
    }

    if (balance < numericAmount) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Insufficient balance.',
      });
    }

    balanceBefore = balance;

    balanceAfter = Number(
      (balance - numericAmount).toFixed(2)
    );

    // --------------------------------------------------------
    // CREATE AIRTIME RECORD
    // --------------------------------------------------------

    await client.query(
      `
      INSERT INTO airtime_transactions (
        account_id,
        reference,
        provider_request_id,
        network,
        phone_number,
        amount,
        currency,
        status,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'NGN',
        'pending',
        CURRENT_TIMESTAMP
      )
      `,
      [
        account.id,
        reference,
        providerRequestId,
        normalizedNetwork,
        normalizedPhone,
        numericAmount,
      ]
    );

    // --------------------------------------------------------
    // CREATE CENTRAL TRANSACTION
    // --------------------------------------------------------

    transactionResult = await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after,
        created_at
      )
      VALUES (
        $1,
        'airtime_purchase',
        $2,
        'NGN',
        $3,
        $4,
        'pending',
        $5,
        $6,
        CURRENT_TIMESTAMP
      )
      RETURNING id, created_at
      `,
      [
        account.id,
        numericAmount,
        reference,
        `Airtime purchase - ${normalizedNetwork} - ${normalizedPhone}`,
        balanceBefore,
        balanceAfter,
      ]
    );

    // --------------------------------------------------------
    // DEBIT WALLET
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        balanceAfter,
        account.id,
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

  } catch (databaseError) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback error.
      }
    }

    console.error(
      'Airtime initial database transaction failed:',
      databaseError?.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to create Airtime transaction.',
    });

  } finally {
    client.release();
  }

  // ==========================================================
  // CALL SOGO
  // ==========================================================

  let providerResult;

  try {
    providerResult = await purchaseAirtime({
      network: normalizedNetwork,
      phone: normalizedPhone,
      amount: numericAmount,
      requestId: providerRequestId,
    });

  } catch (providerError) {
    // Do not refund a timeout or ambiguous provider error.
    console.error('Sogo Airtime request outcome requires reconciliation:', {
      code: providerError?.code || null,
      status: providerError?.status || null,
      message: providerError?.message || 'Unknown provider error',
    });

    return res.status(202).json({
      success: true,
      message: 'Airtime purchase is pending Sogo confirmation. Please do not retry.',
      transaction: {
        id: transactionResult.rows[0]?.id,
        reference,
        provider_request_id: providerRequestId,
        network: normalizedNetwork,
        phone: normalizedPhone,
        amount: numericAmount,
        currency: 'NGN',
        status: 'pending',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        created_at: transactionResult.rows[0]?.created_at,
      },
    });
  }

  // ==========================================================
  // INTERPRET SOGO RESPONSE
  // ==========================================================

  const providerResponse = providerResult?.response || null;

  if (!providerResponse) {
    return res.status(202).json({
      success: true,
      message: 'Sogo did not return a usable response. The transaction remains pending.',
      reference,
      status: 'pending',
    });
  }

  const providerStatus = getProviderStatus(providerResponse);

  const providerReference = getProviderReference(
    providerResponse,
    providerRequestId
  );

  const providerMessage = getProviderMessage(providerResponse);

  // ==========================================================
  // COMPLETED
  // ==========================================================

  if (providerStatus === 'completed') {
    try {
      const result = await completeAirtimeTransaction({
        reference,
        providerReference,
        providerRequestId,
        providerResponse,
      });

      if (result.status !== 'completed') {
        return res.status(409).json({
          success: false,
          message: 'The transaction was already resolved and requires reconciliation.',
          reference,
          status: result.status,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Airtime purchase completed successfully.',
        transaction: {
          id: transactionResult.rows[0]?.id,
          reference,
          provider_reference: providerReference,
          provider_request_id: providerRequestId,
          network: normalizedNetwork,
          phone: normalizedPhone,
          amount: numericAmount,
          currency: 'NGN',
          status: 'completed',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          created_at: transactionResult.rows[0]?.created_at,
        },
      });

    } catch (error) {
      console.error(
        'Sogo Airtime completion reconciliation failed:',
        error?.message
      );

      return res.status(202).json({
        success: true,
        message: 'Sogo reported completion, but local reconciliation requires attention. Do not retry this purchase.',
        reference,
        status: 'reconciliation_required',
      });
    }
  }

  // ==========================================================
  // EXPLICIT FAILURE OR REFUND
  // ==========================================================

  if (
    providerStatus === 'failed' ||
    providerStatus === 'refunded'
  ) {
    try {
      const result = await refundAirtimeTransaction({
        reference,
        providerReference,
        providerRequestId,
        providerResponse,
        finalStatus: providerStatus,
      });

      if (result.status === 'completed') {
        return res.status(409).json({
          success: false,
          message: 'The Airtime transaction was already completed. No refund was made.',
          reference,
          status: 'completed',
        });
      }

      if (result.alreadyProcessed) {
        return res.status(200).json({
          success: false,
          message: 'This Airtime transaction has already been refunded.',
          reference,
          status: result.status,
          refunded: true,
        });
      }

      return res.status(200).json({
        success: false,
        message: 'Sogo confirmed the Airtime transaction failed. Your wallet has been refunded.',
        transaction: {
          reference,
          provider_reference: providerReference,
          provider_request_id: providerRequestId,
          network: normalizedNetwork,
          phone: normalizedPhone,
          amount: numericAmount,
          currency: 'NGN',
          status: providerStatus,
          refunded: true,
          refund_reference: result.refundReference,
          balance_after: result.refundedBalance,
        },
      });

    } catch (refundError) {
      console.error(
        'Sogo Airtime refund reconciliation failed:',
        refundError?.message
      );

      return res.status(500).json({
        success: false,
        message: 'Sogo reported a failure, but the wallet refund requires reconciliation. Do not retry the purchase.',
        reference,
        status: 'reconciliation_required',
      });
    }
  }

  // ==========================================================
  // PROCESSING / UNKNOWN
  //
  // Never refund an unclear provider response.
  // ==========================================================

  try {
    await saveProviderResponse({
      reference,
      providerReference,
      providerRequestId,
      providerResponse,
      status: 'pending',
    });
  } catch (error) {
    console.error(
      'Unable to save Sogo Airtime response:',
      error?.message
    );
  }

  return res.status(202).json({
    success: true,
    message: providerMessage ||
      'Airtime purchase is awaiting Sogo confirmation. Please do not retry.',
    transaction: {
      id: transactionResult.rows[0]?.id,
      reference,
      provider_reference: providerReference,
      provider_request_id: providerRequestId,
      network: normalizedNetwork,
      phone: normalizedPhone,
      amount: numericAmount,
      currency: 'NGN',
      status: 'pending',
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_at: transactionResult.rows[0]?.created_at,
    },
  });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  buyAirtime,
};
