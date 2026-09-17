const crypto = require('crypto');

const pool = require('../config/database');

const {
  getDataPlans,
  purchaseDataPlan,
} = require('../services/vtpassService');


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


const getProviderStatus = (providerResponse) => {
  const code = String(
    providerResponse?.code ||
      providerResponse?.response_code ||
      ''
  ).trim();

  const transactionStatus = String(
    providerResponse
      ?.content
      ?.transactions
      ?.status ||
      ''
  )
    .trim()
    .toLowerCase();

  // Successfully delivered
  if (
    code === '000' &&
    transactionStatus === 'delivered'
  ) {
    return 'completed';
  }

  // Provider accepted the transaction but
  // it is still being processed.
  if (
    code === '099' ||
    transactionStatus === 'pending' ||
    transactionStatus === 'initiated'
  ) {
    return 'pending';
  }

  // Explicit provider failure.
  return 'failed';
};


// ============================================================
// GET DATA PLANS
// GET /api/data/plans?network=MTN
// ============================================================

const getPlans = async (req, res) => {
  try {
    const network =
      req.query?.network;

    if (!network) {
      return res.status(400).json({
        success: false,
        message:
          'Network is required.',
      });
    }

    const result =
      await getDataPlans(network);

    return res.status(200).json({
  success: true,
  network: result.network,
  serviceID: result.serviceID,
  plans: result.plans,

  // TEMPORARY DIAGNOSTIC
  diagnostic: {
    totalPlans: result.plans.length,
    airtelPlans: result.plans
      .filter(
        (plan) =>
          String(plan.variation_code || '')
            .toLowerCase()
            .includes('airtel')
      )
      .map((plan) => ({
        code: plan.variation_code,
        name: plan.name,
        amount: plan.amount,
      })),
  },
});

  } catch (error) {
    console.error(
      'Get data plans error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );

    const statusMap = {
      UNSUPPORTED_NETWORK: 400,
      VTPASS_CONFIGURATION_ERROR: 500,
      VTPASS_TIMEOUT: 504,
    };

    const status =
      statusMap[error?.code] || 500;

    return res.status(status).json({
      success: false,
      code:
        error?.code ||
        'DATA_PLANS_ERROR',
      message:
        error?.message ||
        'Unable to load data plans.',
    });
  }
};


// ============================================================
// BUY DATA
// POST /api/data
//
// Transaction PIN middleware should run BEFORE this controller.
// ============================================================

const buyData = async (req, res) => {
  const userId =
    getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
  }

  const network =
    req.body?.network;

  const phone =
    cleanPhoneNumber(
      req.body?.phone
    );

  const variationCode =
    String(
      req.body?.variation_code ||
        req.body?.plan_id ||
        ''
    ).trim();

  if (!network) {
    return res.status(400).json({
      success: false,
      message:
        'Network is required.',
    });
  }

  if (!/^0\d{10}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message:
        'Enter a valid Nigerian phone number.',
    });
  }

  if (!variationCode) {
    return res.status(400).json({
      success: false,
      message:
        'Data plan is required.',
    });
  }


  // ==========================================================
  // IMPORTANT:
  // Do NOT trust the amount sent by the frontend.
  //
  // We retrieve the current VTpass catalogue and find the
  // selected variation code. This prevents a user from
  // modifying the price in the browser.
  // ==========================================================

  let plansResult;

  try {
    plansResult =
      await getDataPlans(network);
  } catch (error) {
    console.error(
      'Data plan verification error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );

    return res.status(502).json({
      success: false,
      code:
        error?.code ||
        'DATA_PLAN_LOOKUP_FAILED',
      message:
        'Unable to verify this data plan right now. Please try again.',
    });
  }


  const selectedPlan =
    plansResult.plans.find(
      (plan) =>
        String(
          plan.variation_code
        ) === variationCode
    );

  if (!selectedPlan) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_DATA_PLAN',
      message:
        'The selected data plan is no longer available. Please refresh the plans and try again.',
    });
  }


  const amount =
    Number(
      selectedPlan.amount
    );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      code:
        'INVALID_DATA_PLAN_AMOUNT',
      message:
        'The selected data plan has an invalid price.',
    });
  }


  const reference =
    createReference();

  let account;
  let transactionId;


  // ==========================================================
  // STEP 1
  // Reserve/deduct the customer's Zenimonies balance.
  //
  // We lock the account row so two simultaneous requests
  // cannot spend the same balance.
  // ==========================================================

  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const accountResult =
      await client.query(
        `
        SELECT
          id,
          user_id,
          account_number,
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

    if (
      accountResult.rows.length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'Active NGN wallet account not found.',
      });
    }

    account =
      accountResult.rows[0];

    const balance =
      Number(account.balance);

    if (
      !Number.isFinite(balance)
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to read wallet balance.',
      });
    }

    if (balance < amount) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        code:
          'INSUFFICIENT_BALANCE',
        message:
          'Insufficient wallet balance.',
      });
    }


    const balanceBefore =
      balance;

    const balanceAfter =
      balance - amount;


    // --------------------------------------------------------
    // Create pending data transaction
    // --------------------------------------------------------

    const dataResult =
      await client.query(
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
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'NGN',
          $7,
          'pending'
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
        ]
      );

    transactionId =
      dataResult.rows[0].id;


    // --------------------------------------------------------
    // Update wallet
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


    // --------------------------------------------------------
    // Central transaction history
    // --------------------------------------------------------

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


    await client.query(
      'COMMIT'
    );

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (_) {
      // Ignore rollback errors.
    }

    console.error(
      'Data wallet transaction error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      code:
        'DATA_WALLET_TRANSACTION_FAILED',
      message:
        'Unable to start the data purchase.',
    });

  } finally {
    client.release();
  }


  // ==========================================================
  // STEP 2
  // Send the data purchase to VTpass.
  //
  // IMPORTANT:
  // The wallet has already been placed into a pending
  // transaction state.
  //
  // If VTpass says it is pending, we KEEP the transaction
  // pending and do not refund automatically.
  //
  // This is safer because VTpass specifically says timeouts
  // and unclear responses should be requeried.
  // ==========================================================

  let providerResult;

  try {
    providerResult =
      await purchaseDataPlan({
        network:
          plansResult.network,

        phone,

        variationCode:
          selectedPlan.variation_code,

        amount,
      });

  } catch (error) {
    console.error(
      'VTpass data purchase error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );

    // --------------------------------------------------------
    // Provider/network error:
    // Keep the transaction pending so it can be requeried.
    // --------------------------------------------------------

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      message:
        'Your data purchase is being processed. We are checking the provider status.',
    });
  }


  const providerResponse =
    providerResult.response;

  const providerStatus =
    getProviderStatus(
      providerResponse
    );


  const providerReference =
    providerResponse
      ?.content
      ?.transactions
      ?.transactionId ||
    providerResponse?.transactionId ||
    providerResponse?.requestId ||
    providerResult.requestId ||
    null;


  const providerMessage =
    providerResponse
      ?.response_description ||
    providerResponse?.message ||
    null;


  // ==========================================================
  // STEP 3
  // Update Zenimonies transaction status.
  // ==========================================================

  if (
    providerStatus ===
    'completed'
  ) {
    try {
      await pool.query(
        `
        UPDATE data_transactions
        SET
          provider_reference = $1,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          providerReference,
          transactionId,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
        `,
        [reference]
      );

    } catch (error) {
      console.error(
        'Data completion update error:',
        error?.message ||
          'Unknown error'
      );

      // The provider has already delivered the service.
      // Do not refund automatically here.
      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'The data purchase was processed by the provider and is being finalized in your account.',
      });
    }


    return res.status(200).json({
      success: true,
      status: 'completed',
      reference,
      providerReference,
      network:
        plansResult.network,
      phone,
      plan: {
        code:
          selectedPlan.variation_code,
        name:
          selectedPlan.name,
        amount,
      },
      message:
        'Data purchase successful.',
    });
  }


  // ==========================================================
  // PENDING
  // ==========================================================

  if (
    providerStatus ===
    'pending'
  ) {
    await pool.query(
      `
      UPDATE data_transactions
      SET
        provider_reference = $1,
        status = 'pending'
      WHERE id = $2
      `,
      [
        providerReference,
        transactionId,
      ]
    );

    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'pending'
      WHERE reference = $1
      `,
      [reference]
    );

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      network:
        plansResult.network,
      phone,
      plan: {
        code:
          selectedPlan.variation_code,
        name:
          selectedPlan.name,
        amount,
      },
      message:
        'Your data purchase is being processed. Please check your transaction history for the final status.',
    });
  }


  // ==========================================================
  // EXPLICIT PROVIDER FAILURE
  //
  // Refund the customer's Zenimonies balance because VTpass
  // explicitly rejected the transaction.
  // ==========================================================

  const refundClient =
    await pool.connect();

  try {
    await refundClient.query(
      'BEGIN'
    );

    const lockedAccount =
      await refundClient.query(
        `
        SELECT
          id,
          balance
        FROM accounts
        WHERE id = $1
        FOR UPDATE
        `,
        [account.id]
      );

    if (
      lockedAccount.rows.length === 0
    ) {
      throw new Error(
        'Account disappeared during data refund.'
      );
    }

    const currentBalance =
      Number(
        lockedAccount.rows[0]
          .balance
      );

    const refundedBalance =
      currentBalance + amount;


    await refundClient.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        refundedBalance,
        account.id,
      ]
    );


    await refundClient.query(
      `
      UPDATE data_transactions
      SET
        provider_reference = $1,
        status = 'failed',
        failure_reason = $2
      WHERE id = $3
      `,
      [
        providerReference,
        providerMessage ||
          'VTpass rejected the data purchase.',
        transactionId,
      ]
    );


    await refundClient.query(
      `
      UPDATE transactions
      SET
        status = 'failed'
      WHERE reference = $1
      `,
      [reference]
    );


    await refundClient.query(
      'COMMIT'
    );

  } catch (error) {
    try {
      await refundClient.query(
        'ROLLBACK'
      );
    } catch (_) {
      // Ignore rollback errors.
    }

    console.error(
      'Data purchase refund error:',
      error?.message ||
        'Unknown error'
    );

    // Do NOT pretend the refund succeeded.
    // The transaction remains something that the
    // reconciliation process must investigate.
    return res.status(500).json({
      success: false,
      code:
        'DATA_PURCHASE_REFUND_PENDING',
      reference,
      message:
        'The provider rejected the purchase, but the wallet reconciliation requires attention. Please contact support with the transaction reference.',
    });

  } finally {
    refundClient.release();
  }


  return res.status(400).json({
    success: false,
    status: 'failed',
    reference,
    network:
      plansResult.network,
    phone,
    plan: {
      code:
        selectedPlan.variation_code,
      name:
        selectedPlan.name,
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
