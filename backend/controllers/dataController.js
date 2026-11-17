
const crypto = require('crypto');
const pool = require('../config/database');

const {
  getDataPlans,
  purchaseDataPlan,
  generateRequestId,
} = require('../services/sogoDataService');

// ============================================================
// ZENIMONIES — SOGO DATA CONTROLLER
// ============================================================

// ============================================================
// HELPERS
// ============================================================

const createReference = () => {
  return `ZEN-DATA-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
};

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    null
  );
};

const cleanPhoneNumber = (phone) => {
  return String(phone || '')
    .replace(/\s+/g, '')
    .trim();
};

const getTransactionData = (response) => {
  return (
    response?.data?.data ||
    response?.data?.transaction ||
    response?.data ||
    response?.transaction ||
    response ||
    {}
  );
};

const getProviderStatus = (providerResponse) => {
  const transaction = getTransactionData(providerResponse);

  const status = String(
    transaction?.status ||
    transaction?.transaction_status ||
    providerResponse?.status ||
    ''
  ).trim().toLowerCase();

  if (
    ['completed', 'successful', 'success', 'succeeded'].includes(status)
  ) {
    return 'completed';
  }

  if (
    ['processing', 'pending', 'initiated', 'queued'].includes(status)
  ) {
    return 'pending';
  }

  if (
    [
      'failed',
      'failure',
      'declined',
      'cancelled',
      'canceled',
      'refunded',
    ].includes(status)
  ) {
    return 'failed';
  }

  // Unknown or missing provider status must never trigger
  // an automatic refund.
  return 'pending';
};

const getProviderReference = (providerResponse) => {
  const transaction = getTransactionData(providerResponse);

  return (
    transaction?.reference ||
    transaction?.provider_reference ||
    transaction?.providerReference ||
    transaction?.id ||
    transaction?.transaction_id ||
    null
  );
};

const getProviderMessage = (providerResponse) => {
  const transaction = getTransactionData(providerResponse);

  return (
    transaction?.message ||
    transaction?.description ||
    providerResponse?.message ||
    providerResponse?.response_description ||
    null
  );
};

// ============================================================
// GET DATA PLANS
// GET /api/data/plans?network=MTN
// ============================================================

const getPlans = async (req, res) => {
  try {
    const network = req.query?.network;

    if (!network) {
      return res.status(400).json({
        success: false,
        message: 'Network is required.',
      });
    }

    const result = await getDataPlans(network);

    return res.status(200).json({
      success: true,
      network: result.network,
      serviceID: result.serviceID,
      plans: result.plans,
      diagnostic: {
        totalPlans: result.plans.length,
      },
    });
  } catch (error) {
    console.error(
      'Sogo Data plans error:',
      error?.code || error?.message || 'Unknown error'
    );

    const statusMap = {
      UNSUPPORTED_NETWORK: 400,
      SOGO_CONFIGURATION_ERROR: 500,
      SOGO_ENVIRONMENT_MISMATCH: 500,
      SOGO_TIMEOUT: 504,
      SOGO_NETWORK_ERROR: 503,
      SOGO_EMPTY_DATA_CATALOGUE: 502,
    };

    return res.status(statusMap[error?.code] || 502).json({
      success: false,
      code: error?.code || 'DATA_PLANS_ERROR',
      message: error?.message || 'Unable to load data plans.',
    });
  }
};

// ============================================================
// COMPLETE DATA TRANSACTION
// ============================================================

const completeDataTransaction = async ({
  reference,
  transactionId,
  providerReference,
  providerResponse,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `
      SELECT id, status
      FROM data_transactions
      WHERE id = $1
        AND reference = $2
      FOR UPDATE
      `,
      [transactionId, reference]
    );

    if (!locked.rows.length) {
      throw new Error('Data transaction not found.');
    }

    const currentStatus = String(
      locked.rows[0].status || ''
    ).toLowerCase();

    if (currentStatus === 'completed') {
      await client.query('COMMIT');
      return { alreadyProcessed: true };
    }

    // Never reverse a previous failure/refund automatically.
    if (['failed', 'refunded'].includes(currentStatus)) {
      await client.query('COMMIT');
      return { alreadyProcessed: true };
    }

    await client.query(
      `
      UPDATE data_transactions
      SET
        provider_reference = COALESCE($1, provider_reference),
        provider_response = $2::jsonb,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        providerReference,
        JSON.stringify(providerResponse || {}),
        transactionId,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND status <> 'failed'
      `,
      [reference]
    );

    await client.query('COMMIT');

    return { alreadyProcessed: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// REFUND FAILED DATA TRANSACTION
// EXACT-ONCE WALLET REFUND
// ============================================================

const refundDataTransaction = async ({
  reference,
  transactionId,
  accountId,
  amount,
  providerReference,
  providerResponse,
  failureReason,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the original data transaction first.
    const dataResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        status
      FROM data_transactions
      WHERE id = $1
        AND reference = $2
      FOR UPDATE
      `,
      [transactionId, reference]
    );

    if (!dataResult.rows.length) {
      throw new Error('Data transaction not found for refund.');
    }

    const dataTransaction = dataResult.rows[0];

    const currentStatus = String(
      dataTransaction.status || ''
    ).toLowerCase();

    if (
      ['failed', 'refunded', 'completed'].includes(currentStatus)
    ) {
      await client.query('COMMIT');

      return {
        alreadyProcessed: true,
        status: currentStatus,
      };
    }

    // Always use the account recorded on the original transaction.
    const originalAccountId = dataTransaction.account_id;

    if (!originalAccountId) {
      throw new Error('Original wallet account is missing.');
    }

    // Verify that the supplied account matches the original account.
    if (
      accountId &&
      String(accountId) !== String(originalAccountId)
    ) {
      throw new Error(
        'Refund account does not match the original transaction account.'
      );
    }

    const refundAmount = Number(dataTransaction.amount);

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      throw new Error('Invalid data transaction refund amount.');
    }

    // Lock the original wallet account.
    const lockedAccount = await client.query(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [originalAccountId]
    );

    if (!lockedAccount.rows.length) {
      throw new Error('Original wallet account not found.');
    }

    const currentBalance = Number(
      lockedAccount.rows[0].balance
    );

    if (!Number.isFinite(currentBalance)) {
      throw new Error('Invalid wallet balance during refund.');
    }

    const balanceAfter = currentBalance + refundAmount;

    const refundReference = `ZEN-DATA-REFUND-${reference}`;

    // IMPORTANT:
    // Create the refund ledger entry FIRST.
    // ON CONFLICT prevents a duplicate refund reference.
    const refundLedger = await client.query(
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
        balance_after
      )
      VALUES (
        $1,
        'data_refund',
        $2,
        'NGN',
        $3,
        $4,
        'completed',
        $5,
        $6
      )
      ON CONFLICT (reference) DO NOTHING
      RETURNING id
      `,
      [
        originalAccountId,
        refundAmount,
        refundReference,
        `Refund for failed data purchase ${reference}`,
        currentBalance,
        balanceAfter,
      ]
    );

    // A refund ledger entry already exists.
    // Do not credit the wallet a second time.
    if (!refundLedger.rows.length) {
      await client.query(
        `
        UPDATE data_transactions
        SET
          provider_reference = COALESCE($1, provider_reference),
          provider_response = $2::jsonb,
          status = 'failed',
          failure_reason = $3
        WHERE id = $4
        `,
        [
          providerReference,
          JSON.stringify(providerResponse || {}),
          failureReason || 'Sogo reported that the data purchase failed.',
          transactionId,
        ]
      );

      await client.query(
        `
        UPDATE transactions
        SET status = 'failed'
        WHERE reference = $1
          AND type = 'data_purchase'
        `,
        [reference]
      );

      await client.query('COMMIT');

      return {
        alreadyProcessed: true,
        status: 'failed',
      };
    }

    // Credit the original wallet only after the refund ledger
    // entry has been successfully inserted.
    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [balanceAfter, originalAccountId]
    );

    // Mark the original data transaction as failed.
    await client.query(
      `
      UPDATE data_transactions
      SET
        provider_reference = COALESCE($1, provider_reference),
        provider_response = $2::jsonb,
        status = 'failed',
        failure_reason = $3
      WHERE id = $4
      `,
      [
        providerReference,
        JSON.stringify(providerResponse || {}),
        failureReason || 'Sogo reported that the data purchase failed.',
        transactionId,
      ]
    );

    // Mark the original central transaction as failed.
    await client.query(
      `
      UPDATE transactions
      SET status = 'failed'
      WHERE reference = $1
        AND type = 'data_purchase'
      `,
      [reference]
    );

    await client.query('COMMIT');

    return {
      alreadyProcessed: false,
      status: 'failed',
      refundedAmount: refundAmount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// BUY DATA
// POST /api/data
// ============================================================

const buyData = async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const network = req.body?.network;

  const phone = cleanPhoneNumber(req.body?.phone);

  const variationCode = String(
    req.body?.variation_code ||
    req.body?.plan_id ||
    ''
  ).trim();

  if (!network) {
    return res.status(400).json({
      success: false,
      message: 'Network is required.',
    });
  }

  if (!/^0\d{10}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid Nigerian phone number.',
    });
  }

  if (!variationCode) {
    return res.status(400).json({
      success: false,
      message: 'Data plan is required.',
    });
  }

  // ----------------------------------------------------------
  // VERIFY PLAN AND PRICE DIRECTLY WITH SOGO
  // ----------------------------------------------------------

  let plansResult;

  try {
    plansResult = await getDataPlans(network);
  } catch (error) {
    console.error(
      'Sogo Data plan verification error:',
      error?.code || error?.message
    );

    return res.status(502).json({
      success: false,
      code: error?.code || 'DATA_PLAN_LOOKUP_FAILED',
      message:
        'Unable to verify this data plan right now. Please try again.',
    });
  }

  const selectedPlan = plansResult.plans.find(
    (plan) =>
      String(plan.variation_code) === variationCode
  );

  if (!selectedPlan) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DATA_PLAN',
      message:
        'The selected data plan is no longer available. Please refresh the plans.',
    });
  }

  const amount = Number(selectedPlan.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DATA_PLAN_AMOUNT',
      message: 'The selected data plan has an invalid price.',
    });
  }

  // Generate and save the idempotency key BEFORE contacting Sogo.
  const reference = createReference();
  const providerRequestId = generateRequestId();

  let account;
  let transactionId;

  // ----------------------------------------------------------
  // STEP 1 — DEBIT WALLET AND CREATE PENDING RECORDS
  // ----------------------------------------------------------

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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

    if (!accountResult.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Active NGN wallet account not found.',
      });
    }

    account = accountResult.rows[0];

    const balanceBefore = Number(account.balance);

    if (!Number.isFinite(balanceBefore)) {
      await client.query('ROLLBACK');

      return res.status(500).json({
        success: false,
        message: 'Unable to read wallet balance.',
      });
    }

    if (balanceBefore < amount) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient wallet balance.',
      });
    }

    const balanceAfter = balanceBefore - amount;

    const dataResult = await client.query(
      `
      INSERT INTO data_transactions (
        account_id,
        network,
        phone_number,
        plan_code,
        plan_name,
        amount,
        currency,
        reference,
        provider_request_id,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        'NGN', $7, $8, 'pending'
      )
      RETURNING id
      `,
      [
        account.id,
        plansResult.network,
        phone,
        selectedPlan.variation_code,
        selectedPlan.name,
        amount,
        reference,
        providerRequestId,
      ]
    );

    transactionId = dataResult.rows[0].id;

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [balanceAfter, account.id]
    );

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
        balance_after
      )
      VALUES (
        $1,
        'data_purchase',
        $2,
        'NGN',
        $3,
        $4,
        'pending',
        $5,
        $6
      )
      `,
      [
        account.id,
        amount,
        reference,
        `Data purchase - ${plansResult.network} ${selectedPlan.name} for ${phone}`,
        balanceBefore,
        balanceAfter,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback errors.
    }

    console.error(
      'Data wallet transaction error:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code: 'DATA_WALLET_TRANSACTION_FAILED',
      message: 'Unable to start the data purchase.',
    });
  } finally {
    client.release();
  }

  // ----------------------------------------------------------
  // STEP 2 — SUBMIT PURCHASE TO SOGO
  // ----------------------------------------------------------

  let providerResult;

  try {
    providerResult = await purchaseDataPlan({
      network: plansResult.network,
      phone,
      variationCode: selectedPlan.variation_code,
      amount,
      idempotencyKey: providerRequestId,
    });
  } catch (error) {
    console.error(
      'Sogo Data purchase error:',
      error?.code || error?.message || 'Unknown error'
    );

    // A timeout or network error does not prove failure.
    // Keep the customer's transaction pending.
    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      message:
        'Your data purchase is being processed. Please check your transaction history for confirmation.',
    });
  }

  const providerResponse = providerResult.response;

  const providerStatus = getProviderStatus(providerResponse);

  const providerReference = getProviderReference(providerResponse);

  const providerMessage = getProviderMessage(providerResponse);

  // ----------------------------------------------------------
  // STEP 3 — SUCCESS
  // ----------------------------------------------------------

  if (providerStatus === 'completed') {
    try {
      await completeDataTransaction({
        reference,
        transactionId,
        providerReference,
        providerResponse,
      });
    } catch (error) {
      console.error(
        'Data completion update error:',
        error?.message
      );

      // Provider may already have delivered the data.
      // Do not refund because of a local database error.
      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'The provider processed your data purchase. Account confirmation is being finalized.',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'completed',
      reference,
      providerReference,
      network: plansResult.network,
      phone,
      plan: {
        code: selectedPlan.variation_code,
        name: selectedPlan.name,
        amount,
      },
      message: 'Data purchase successful.',
    });
  }

  // ----------------------------------------------------------
  // STEP 4 — PENDING / PROCESSING
  // ----------------------------------------------------------

  if (providerStatus === 'pending') {
    await pool.query(
      `
      UPDATE data_transactions
      SET
        provider_reference = COALESCE($1, provider_reference),
        provider_response = $2::jsonb,
        status = 'pending'
      WHERE id = $3
        AND status = 'pending'
      `,
      [
        providerReference,
        JSON.stringify(providerResponse || {}),
        transactionId,
      ]
    );

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      network: plansResult.network,
      phone,
      plan: {
        code: selectedPlan.variation_code,
        name: selectedPlan.name,
        amount,
      },
      message:
        'Your data purchase is being processed. Please check your transaction history for the final status.',
    });
  }

  // ----------------------------------------------------------
  // STEP 5 — EXPLICIT PROVIDER FAILURE
  // ----------------------------------------------------------

  try {
    const refundResult = await refundDataTransaction({
      reference,
      transactionId,
      accountId: account.id,
      amount,
      providerReference,
      providerResponse,
      failureReason:
        providerMessage || 'Sogo rejected the data purchase.',
    });

    if (refundResult.alreadyProcessed) {
      return res.status(200).json({
        success: true,
        status: refundResult.status,
        reference,
        message:
          'This transaction has already been reconciled.',
      });
    }
  } catch (error) {
    console.error(
      'Data refund error:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code: 'DATA_PURCHASE_REFUND_PENDING',
      reference,
      message:
        'The provider reported a failure, but wallet reconciliation requires attention. Please contact support with this transaction reference.',
    });
  }

  return res.status(400).json({
    success: false,
    status: 'failed',
    reference,
    network: plansResult.network,
    phone,
    plan: {
      code: selectedPlan.variation_code,
      name: selectedPlan.name,
      amount,
    },
    message:
      providerMessage ||
      'Data purchase failed. Your wallet has been refunded.',
  });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getPlans,
  buyData,
};
