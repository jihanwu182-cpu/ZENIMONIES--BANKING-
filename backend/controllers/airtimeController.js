const crypto = require('crypto');

const pool = require('../config/database');

const {
  purchaseAirtime,
} = require('../services/airtimeService');


// ============================================================
// HELPERS
// ============================================================

const createReference = () => {
  return `ZEN-AIRTIME-${Date.now()}-${crypto
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


// ============================================================
// PROVIDER STATUS
// ============================================================

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


  // ----------------------------------------------------------
  // Successfully delivered
  // ----------------------------------------------------------

  if (
    code === '000' &&
    transactionStatus === 'delivered'
  ) {
    return 'completed';
  }


  // ----------------------------------------------------------
  // Provider accepted transaction but it is still processing
  // ----------------------------------------------------------

  if (
    code === '099' ||
    transactionStatus === 'pending' ||
    transactionStatus === 'initiated'
  ) {
    return 'pending';
  }


  // ----------------------------------------------------------
  // Explicit provider failure
  // ----------------------------------------------------------

  return 'failed';
};


// ============================================================
// COMMISSION EXTRACTION
// ============================================================

const getCommissionDetails = (
  providerResponse
) => {
  return (
    providerResponse
      ?.content
      ?.transactions
      ?.commission_details ||
    providerResponse
      ?.content
      ?.commission_details ||
    providerResponse
      ?.commission_details ||
    null
  );
};


// ============================================================
// PROVIDER REFERENCE
// ============================================================

const getProviderReference = (
  providerResponse,
  requestId
) => {
  return (
    providerResponse
      ?.content
      ?.transactions
      ?.transactionId ||
    providerResponse?.transactionId ||
    providerResponse?.requestId ||
    requestId ||
    null
  );
};


// ============================================================
// BUY AIRTIME
//
// POST /api/airtime
//
// Transaction PIN middleware should run BEFORE this controller.
// ============================================================

const buyAirtime = async (req, res) => {

  const userId =
    getUserId(req);


  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
  }


  // ==========================================================
  // INPUT
  // ==========================================================

  const network =
    req.body?.network;

  const phone =
    cleanPhoneNumber(
      req.body?.phone
    );

  const amount =
    Number(
      req.body?.amount
    );


  // ==========================================================
  // NETWORK VALIDATION
  // ==========================================================

  if (!network) {
    return res.status(400).json({
      success: false,
      message:
        'Network is required.',
    });
  }


  // ==========================================================
  // PHONE VALIDATION
  // ==========================================================

  if (
    !/^0\d{10}$/.test(phone)
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Enter a valid Nigerian phone number.',
    });
  }


  // ==========================================================
  // AMOUNT VALIDATION
  // ==========================================================

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Enter a valid airtime amount.',
    });
  }


  // ==========================================================
  // SAFETY LIMIT
  //
  // This prevents accidental extremely large requests.
  // We can adjust this later based on the final product rules.
  // ==========================================================

  if (amount > 100000) {
    return res.status(400).json({
      success: false,
      code:
        'AIRTIME_AMOUNT_TOO_HIGH',
      message:
        'The maximum airtime amount per transaction is ₦100,000.',
    });
  }


  // ==========================================================
  // CREATE ZENIMONIES REFERENCE
  // ==========================================================

  const reference =
    createReference();


  let account;
  let transactionId;


  // ==========================================================
  // STEP 1
  // LOCK AND DEDUCT CUSTOMER WALLET
  // ==========================================================

  const client =
    await pool.connect();


  try {

    await client.query(
      'BEGIN'
    );


    // --------------------------------------------------------
    // Lock active NGN account
    // --------------------------------------------------------

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
      Number(
        account.balance
      );


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


    // --------------------------------------------------------
    // Check balance
    // --------------------------------------------------------

    if (
      balance < amount
    ) {

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


    // ========================================================
    // CREATE AIRTIME TRANSACTION
    //
    // We use the central transactions table.
    // ========================================================

    const transactionResult =
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
          'airtime_purchase',
          $2,
          'NGN',
          $3,
          $4,
          'pending',
          $5,
          $6
        )
        RETURNING id
        `,
        [
          account.id,
          amount,
          reference,
          `Airtime purchase - ${network} for ${phone}`,
          balanceBefore,
          balanceAfter,
        ]
      );


    transactionId =
      transactionResult.rows[0].id;


    // ========================================================
    // DEDUCT WALLET
    // ========================================================

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
      'Airtime wallet transaction error:',
      error?.message ||
        'Unknown error'
    );


    return res.status(500).json({
      success: false,
      code:
        'AIRTIME_WALLET_TRANSACTION_FAILED',
      message:
        'Unable to start the airtime purchase.',
    });


  } finally {

    client.release();

  }


  // ==========================================================
  // STEP 2
  // SEND AIRTIME TO VTPASS
  // ==========================================================

  let providerResult;


  try {

    providerResult =
      await purchaseAirtime({
        network,
        phone,
        amount,
      });


  } catch (error) {

    console.error(
      'VTpass airtime purchase error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );


    // --------------------------------------------------------
    // IMPORTANT
    //
    // If the provider request times out or the network fails,
    // we DO NOT immediately refund.
    //
    // The provider may have received the transaction.
    // The transaction therefore remains pending for requery.
    // --------------------------------------------------------

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      message:
        'Your airtime purchase is being processed. Please check your transaction history for the final status.',
    });
  }


  const providerResponse =
    providerResult.response;


  const providerStatus =
    getProviderStatus(
      providerResponse
    );


  const providerReference =
    getProviderReference(
      providerResponse,
      providerResult.requestId
    );


  const providerMessage =
    providerResponse
      ?.response_description ||
    providerResponse?.message ||
    null;


  const commissionDetails =
    getCommissionDetails(
      providerResponse
    );


  // ==========================================================
  // STEP 3
  // SUCCESSFUL AIRTIME
  // ==========================================================

  if (
    providerStatus ===
    'completed'
  ) {

    try {

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed',
          description = $1
        WHERE id = $2
        `,
        [
          `Airtime purchase - ${network} for ${phone}${
            commissionDetails
              ? ` | Commission: ${JSON.stringify(
                  commissionDetails
                )}`
              : ''
          }`,
          transactionId,
        ]
      );


    } catch (error) {

      console.error(
        'Airtime completion update error:',
        error?.message ||
          'Unknown error'
      );


      // Provider already delivered airtime.
      // Never automatically refund here.

      return res.status(202).json({
        success: true,
        status: 'pending',
        reference,
        message:
          'The airtime was processed by the provider and is being finalized in your account.',
      });
    }


    return res.status(200).json({
      success: true,
      status: 'completed',
      reference,
      providerReference,
      network:
        providerResult.network,
      phone,
      amount,
      commissionDetails,
      message:
        'Airtime purchase successful.',
    });
  }


  // ==========================================================
  // STEP 4
  // PENDING
  // ==========================================================

  if (
    providerStatus ===
    'pending'
  ) {

    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'pending'
      WHERE id = $1
      `,
      [transactionId]
    );


    return res.status(202).json({
      success: true,
      status: 'pending',
      reference,
      providerReference,
      network:
        providerResult.network,
      phone,
      amount,
      message:
        'Your airtime purchase is being processed. Please check your transaction history for the final status.',
    });
  }


  // ==========================================================
  // STEP 5
  // EXPLICIT PROVIDER FAILURE
  //
  // VTpass rejected the transaction.
  // Refund the customer's wallet.
  // ==========================================================

  const refundClient =
    await pool.connect();


  try {

    await refundClient.query(
      'BEGIN'
    );


    // --------------------------------------------------------
    // Lock account again
    // --------------------------------------------------------

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
        'Account disappeared during airtime refund.'
      );
    }


    const currentBalance =
      Number(
        lockedAccount.rows[0]
          .balance
      );


    const refundedBalance =
      currentBalance + amount;


    // --------------------------------------------------------
    // Refund wallet
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Mark transaction failed
    // --------------------------------------------------------

    await refundClient.query(
      `
      UPDATE transactions
      SET
        status = 'failed',
        description = $1
      WHERE id = $2
      `,
      [
        `Airtime purchase failed - ${
          providerMessage ||
          'VTpass rejected the transaction.'
        }`,
        transactionId,
      ]
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
      'Airtime refund error:',
      error?.message ||
        'Unknown error'
    );


    // Do not pretend refund succeeded.

    return res.status(500).json({
      success: false,
      code:
        'AIRTIME_REFUND_PENDING',
      reference,
      message:
        'The provider rejected the purchase, but wallet reconciliation requires attention. Please contact support with the transaction reference.',
    });


  } finally {

    refundClient.release();

  }


  // ==========================================================
  // FINAL FAILURE RESPONSE
  // ==========================================================

  return res.status(400).json({
    success: false,
    status: 'failed',
    reference,
    network:
      providerResult.network,
    phone,
    amount,
    message:
      providerMessage ||
      'Airtime purchase failed. Your wallet has been refunded.',
  });
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  buyAirtime,
};
