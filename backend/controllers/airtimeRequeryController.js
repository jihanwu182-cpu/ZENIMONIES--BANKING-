const pool = require('../config/database');

const {
  requeryAirtimeTransaction,
} = require('../services/airtimeService');


// ============================================================
// GET USER ID
// ============================================================

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    null
  );
};


// ============================================================
// PROVIDER STATUS
// ============================================================

const getProviderStatus = (response) => {

  const code = String(
    response?.code ??
      response?.response_code ??
      response?.responseCode ??
      response?.content?.code ??
      ''
  )
    .trim()
    .toLowerCase();


  const status = String(
    response?.content?.transactions?.status ||
      response?.content?.transaction?.status ||
      response?.content?.status ||
      response?.status ||
      ''
  )
    .trim()
    .toLowerCase();


  // ----------------------------------------------------------
  // COMPLETED
  // ----------------------------------------------------------

  if (
  (
    code === '000' ||
    code === '001'
  ) &&
  (
    status === 'delivered' ||
    status === 'completed' ||
    status === 'successful' ||
    status === 'success'
  )
) {
  return 'completed';
}


  // ----------------------------------------------------------
  // PENDING
  // ----------------------------------------------------------

  
if (
  code === '099' ||
  code === '001' ||
  status === 'pending' ||
  status === 'initiated' ||
  status === 'processing'
) {
  return 'pending';
}

  // ----------------------------------------------------------
  // EXPLICIT FAILURE
  // ----------------------------------------------------------

  if (
  code === '015' ||
  code === '016' ||
  code === '091' ||
  code === '040'
) {
  return 'failed';
}


  // ----------------------------------------------------------
  // UNKNOWN
  // ----------------------------------------------------------

  return 'unknown';
};


// ============================================================
// PROVIDER REFERENCE
// ============================================================

const getProviderReference = (
  response,
  fallback
) => {

  return (
    response?.content?.transactions
      ?.transactionId ||

    response?.content?.transactionId ||

    response?.content?.transactions
      ?.requestId ||

    response?.requestId ||

    response?.transactionId ||

    fallback ||

    null
  );
};


// ============================================================
// COMMISSION DETAILS
// ============================================================

const getCommissionDetails = (
  response
) => {

  const content =
    response?.content || {};


  return (
    content?.transactions
      ?.commissionDetails ||

    content?.transactions
      ?.commission_details ||

    content?.commissionDetails ||

    content?.commission_details ||

    response?.commissionDetails ||

    response?.commission_details ||

    null
  );
};


// ============================================================
// REQUERY PENDING AIRTIME
//
// POST /api/airtime/requery/:reference
// ============================================================

const requeryPendingAirtime = async (
  req,
  res
) => {

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
  // REFERENCE
  // ==========================================================

  const reference =
    String(
      req.params?.reference ||
        ''
    ).trim();


  if (!reference) {

    return res.status(400).json({
      success: false,
      message:
        'Transaction reference is required.',
    });

  }


  // ==========================================================
  // FIND AIRTIME TRANSACTION
  //
  // IMPORTANT:
  //
  // We identify ownership through:
  //
  // airtime_transactions.account_id
  //        ↓
  // accounts.user_id
  //
  // This avoids depending on a user_id column inside
  // airtime_transactions.
  // ==========================================================

  let transactionResult;

  try {

    transactionResult =
      await pool.query(
        `
        SELECT
          at.id,
          at.account_id,
          at.network,
          at.phone_number,
          at.amount,
          at.currency,
          at.reference,
          at.status,
          at.provider_reference,
          at.provider_request_id,

          a.user_id,
          a.balance

        FROM airtime_transactions at

        INNER JOIN accounts a
          ON a.id = at.account_id

        WHERE at.reference = $1
          AND a.user_id = $2

        LIMIT 1
        `,
        [
          reference,
          userId,
        ]
      );

  } catch (error) {

    console.error(
      'Airtime requery database lookup failed:',
      error?.message ||
        'Unknown database error'
    );


    return res.status(500).json({
      success: false,
      code:
        'AIRTIME_TRANSACTION_LOOKUP_FAILED',
      message:
        'Unable to look up the airtime transaction.',
    });

  }


  // ==========================================================
  // TRANSACTION NOT FOUND
  // ==========================================================

  if (
    transactionResult.rows.length === 0
  ) {

    return res.status(404).json({
      success: false,
      code:
        'AIRTIME_TRANSACTION_NOT_FOUND',
      message:
        'Airtime transaction not found.',
    });

  }


  const transaction =
    transactionResult.rows[0];


  // ==========================================================
  // ALREADY COMPLETED
  // ==========================================================

  if (
    transaction.status ===
    'completed'
  ) {

    return res.status(200).json({
      success: true,
      status:
        'completed',
      reference,
      message:
        'This airtime transaction is already completed.',
    });

  }


  // ==========================================================
  // ALREADY FAILED
  // ==========================================================

  if (
    transaction.status ===
    'failed'
  ) {

    return res.status(200).json({
      success: true,
      status:
        'failed',
      reference,
      message:
        'This airtime transaction has already been resolved as failed.',
    });

  }


  // ==========================================================
  // ONLY PENDING TRANSACTIONS CAN BE REQUERIED
  // ==========================================================

  if (
    transaction.status !==
    'pending'
  ) {

    return res.status(400).json({
      success: false,
      code:
        'INVALID_AIRTIME_STATUS',
      message:
        'Only pending airtime transactions can be checked.',
    });

  }


  // ==========================================================
  // PROVIDER REQUEST ID
  // ==========================================================

  if (
    !transaction.provider_request_id
  ) {

    return res.status(409).json({
      success: false,
      code:
        'PROVIDER_REQUEST_ID_MISSING',
      status:
        'pending',
      reference,
      message:
        'This transaction does not have a VTpass request ID and requires manual reconciliation. No refund has been made.',
    });

  }


  // ==========================================================
  // REQUERY VTPASS
  // ==========================================================

  let providerResult;

  try {

    providerResult =
      await requeryAirtimeTransaction({
        requestId:
          transaction.provider_request_id,
      });

} catch (error) {
  console.error('Airtime requery diagnostic:', {
    code: error?.code || null,
    status: error?.status || error?.response?.status || null,
    providerCode:
      error?.providerCode ||
      error?.response?.data?.code ||
      error?.response?.data?.response_code ||
      error?.response?.code ||
      null,
    providerDescription:
      error?.providerDescription ||
      error?.response?.data?.response_description ||
      error?.response?.data?.message ||
      error?.response?.message ||
      null,
  });

  return res.status(202).json({
    success: true,
    status: 'pending',
    reference: transaction.reference,
    message:
      'VTpass could not confirm the final status yet. Your wallet has not been refunded automatically.',
    diagnostic: {
      requestId: transaction.provider_request_id,
      errorCode: error?.code || null,
      httpStatus:
        error?.status ||
        error?.response?.status ||
        null,
      providerCode:
        error?.providerCode ||
        error?.response?.data?.code ||
        error?.response?.data?.response_code ||
        error?.response?.code ||
        null,
      providerDescription:
        error?.providerDescription ||
        error?.response?.data?.response_description ||
        error?.response?.data?.message ||
        error?.response?.message ||
        null,
    },
  });
}

// ==========================================================
// GET ACTUAL PROVIDER RESPONSE
// ==========================================================

const providerResponse =
  providerResult?.response ||
  providerResult;


  if (!providerResponse) {

    return res.status(202).json({
      success: true,
      status:
        'pending',
      reference,
      message:
        'VTpass did not return a usable response. The transaction remains pending and has not been automatically refunded.',
    });

  }


  // ==========================================================
  // PROVIDER INFORMATION
  // ==========================================================

  const providerStatus =
    getProviderStatus(
      providerResponse
    );


  const providerReference =
    getProviderReference(
      providerResponse,
      transaction.provider_request_id
    );


  const commissionDetails =
    getCommissionDetails(
      providerResponse
    );


  // ==========================================================
  // PROVIDER STILL PENDING
  // ==========================================================

  if (
    providerStatus ===
    'pending'
  ) {

    await pool.query(
      `
      UPDATE airtime_transactions
      SET
        provider_reference = $1,
        provider_request_id = $2,
        commission_details = $3::jsonb,
        provider_response = $4::jsonb,
        status = 'pending'
      WHERE id = $5
        AND status = 'pending'
      `,
      [
        providerReference,

        transaction.provider_request_id,

        commissionDetails
          ? JSON.stringify(
              commissionDetails
            )
          : null,

        JSON.stringify(
          providerResponse
        ),

        transaction.id,
      ]
    );


    return res.status(202).json({
      success: true,
      status:
        'pending',
      reference,
      providerReference,
      message:
        'VTpass still reports this transaction as pending. No refund has been made.',
    });

  }


  // ==========================================================
  // UNKNOWN PROVIDER RESPONSE
  //
  // NEVER REFUND AN UNCLEAR RESPONSE.
  // ==========================================================

  if (
    providerStatus ===
    'unknown'
  ) {

    await pool.query(
      `
      UPDATE airtime_transactions
      SET
        provider_reference = $1,
        provider_request_id = $2,
        commission_details = $3::jsonb,
        provider_response = $4::jsonb
      WHERE id = $5
        AND status = 'pending'
      `,
      [
        providerReference,

        transaction.provider_request_id,

        commissionDetails
          ? JSON.stringify(
              commissionDetails
            )
          : null,

        JSON.stringify(
          providerResponse
        ),

        transaction.id,
      ]
    );


    return res.status(202).json({
      success: true,
      status:
        'pending',
      reference,
      providerReference,
      message:
        'VTpass returned an unclear status. The transaction remains pending and has not been automatically refunded.',
    });

  }


  // ==========================================================
  // COMPLETED
  // ==========================================================

  if (
    providerStatus ===
    'completed'
  ) {

    const client =
      await pool.connect();


    try {

      await client.query(
        'BEGIN'
      );


      // ------------------------------------------------------
      // LOCK AIRTIME TRANSACTION
      // ------------------------------------------------------

      const lockedResult =
        await client.query(
          `
          SELECT
            id,
            account_id,
            amount,
            status
          FROM airtime_transactions
          WHERE id = $1
          FOR UPDATE
          `,
          [
            transaction.id,
          ]
        );


      if (
        lockedResult.rows.length === 0
      ) {

        throw new Error(
          'Airtime transaction disappeared during reconciliation.'
        );

      }


      const lockedTransaction =
        lockedResult.rows[0];


      // ------------------------------------------------------
      // ALREADY COMPLETED
      // ------------------------------------------------------

      if (
        lockedTransaction.status ===
        'completed'
      ) {

        await client.query(
          'COMMIT'
        );


        return res.status(200).json({
          success: true,
          status:
            'completed',
          reference,
          message:
            'This airtime transaction has already been completed.',
        });

      }


      // ------------------------------------------------------
      // MUST STILL BE PENDING
      // ------------------------------------------------------

      if (
        lockedTransaction.status !==
        'pending'
      ) {

        await client.query(
          'ROLLBACK'
        );


        return res.status(409).json({
          success: false,
          message:
            'This transaction is no longer pending.',
        });

      }


      // ------------------------------------------------------
      // MARK AIRTIME COMPLETED
      // ------------------------------------------------------

      await client.query(
        `
        UPDATE airtime_transactions
        SET
          provider_reference = $1,
          provider_request_id = $2,
          commission_details = $3::jsonb,
          provider_response = $4::jsonb,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $5
          AND status = 'pending'
        `,
        [
          providerReference,

          transaction.provider_request_id,

          commissionDetails
            ? JSON.stringify(
                commissionDetails
              )
            : null,

          JSON.stringify(
            providerResponse
          ),

          transaction.id,
        ]
      );


      // ------------------------------------------------------
      // MARK CENTRAL TRANSACTION COMPLETED
      // ------------------------------------------------------

      await client.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
          AND status = 'pending'
        `,
        [
          reference,
        ]
      );


      await client.query(
        'COMMIT'
      );


      return res.status(200).json({
        success: true,
        status:
          'completed',
        reference,
        providerReference,
        network:
          transaction.network,
        phone:
          transaction.phone_number,
        amount:
          Number(
            transaction.amount
          ),
        message:
          'Airtime purchase confirmed successfully.',
      });


    } catch (error) {

      try {
        await client.query(
          'ROLLBACK'
        );
      } catch (_) {
        // Ignore rollback errors.
      }


      console.error(
        'Airtime completion reconciliation error:',
        error?.message ||
          'Unknown error'
      );


      return res.status(500).json({
        success: false,
        code:
          'AIRTIME_RECONCILIATION_FAILED',
        reference,
        message:
          'VTpass confirmed the airtime, but account reconciliation requires attention. No refund was made.',
      });


    } finally {

      client.release();

    }

  }


  // ==========================================================
  // EXPLICIT PROVIDER FAILURE
  //
  // REFUND EXACTLY ONCE
  // ==========================================================

  if (
    providerStatus ===
    'failed'
  ) {

    const client =
      await pool.connect();


    try {

      await client.query(
        'BEGIN'
      );


      // ------------------------------------------------------
      // LOCK AIRTIME TRANSACTION
      // ------------------------------------------------------

      const lockedResult =
        await client.query(
          `
          SELECT
            id,
            account_id,
            amount,
            status
          FROM airtime_transactions
          WHERE id = $1
          FOR UPDATE
          `,
          [
            transaction.id,
          ]
        );


      if (
        lockedResult.rows.length === 0
      ) {

        throw new Error(
          'Airtime transaction disappeared during refund reconciliation.'
        );

      }


      const lockedTransaction =
        lockedResult.rows[0];


      // ------------------------------------------------------
      // ALREADY RESOLVED
      // ------------------------------------------------------

      if (
        lockedTransaction.status !==
        'pending'
      ) {

        await client.query(
          'COMMIT'
        );


        return res.status(409).json({
          success: false,
          message:
            'This transaction has already been resolved and will not be refunded again.',
        });

      }


      // ------------------------------------------------------
      // LOCK WALLET
      // ------------------------------------------------------

      const accountResult =
        await client.query(
          `
          SELECT
            id,
            balance
          FROM accounts
          WHERE id = $1
          FOR UPDATE
          `,
          [
            lockedTransaction.account_id,
          ]
        );


      if (
        accountResult.rows.length === 0
      ) {

        throw new Error(
          'Wallet account not found during Airtime refund.'
        );

      }


      const currentBalance =
        Number(
          accountResult.rows[0]
            .balance
        );


      const amount =
        Number(
          lockedTransaction.amount
        );


      if (
        !Number.isFinite(
          currentBalance
        ) ||
        !Number.isFinite(
          amount
        )
      ) {

        throw new Error(
          'Invalid wallet amount during Airtime refund.'
        );

      }


      const refundedBalance =
        Number(
          (
            currentBalance +
            amount
          ).toFixed(2)
        );


      // ------------------------------------------------------
      // REFUND WALLET
      // ------------------------------------------------------

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
          lockedTransaction.account_id,
        ]
      );


      // ------------------------------------------------------
      // MARK AIRTIME FAILED
      // ------------------------------------------------------

      await client.query(
        `
        UPDATE airtime_transactions
        SET
          provider_reference = $1,
          provider_request_id = $2,
          commission_details = $3::jsonb,
          provider_response = $4::jsonb,
          status = 'failed'
        WHERE id = $5
          AND status = 'pending'
        `,
        [
          providerReference,

          transaction.provider_request_id,

          commissionDetails
            ? JSON.stringify(
                commissionDetails
              )
            : null,

          JSON.stringify(
            providerResponse
          ),

          transaction.id,
        ]
      );


      // ------------------------------------------------------
      // MARK CENTRAL TRANSACTION FAILED
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // CREATE REFUND LEDGER
      // ------------------------------------------------------

      const refundReference =
        `REFUND-${reference}`;


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
          'airtime_refund',
          $2,
          'NGN',
          $3,
          $4,
          'completed',
          $5,
          $6
        )
        `,
        [
          lockedTransaction.account_id,

          amount,

          refundReference,

          `Refund for failed Airtime purchase ${reference}`,

          currentBalance,

          refundedBalance,
        ]
      );


      await client.query(
        'COMMIT'
      );


      return res.status(200).json({
        success: true,
        status:
          'failed',
        refunded:
          true,
        reference,
        amount,
        refundReference,
        message:
          'VTpass confirmed the airtime failed. Your wallet has been refunded.',
      });


    } catch (error) {

      try {
        await client.query(
          'ROLLBACK'
        );
      } catch (_) {
        // Ignore rollback errors.
      }


      console.error(
        'Airtime refund reconciliation error:',
        error?.message ||
          'Unknown error'
      );


      return res.status(500).json({
        success: false,
        code:
          'AIRTIME_REFUND_RECONCILIATION_FAILED',
        reference,
        message:
          'The provider confirmed a failure, but the wallet refund requires reconciliation. No automatic second refund was made.',
      });


    } finally {

      client.release();

    }

  }


  // ==========================================================
  // SAFETY FALLBACK
  // ==========================================================

  return res.status(202).json({
    success: true,
    status:
      'pending',
    reference,
    message:
      'The transaction remains pending. No automatic refund was made.',
  });
};


// ============================================================
// TEMPORARY AIRTIME RECONCILIATION DIAGNOSTIC
// Read-only endpoint for checking old pending transactions.
// REMOVE THIS AFTER RECONCILIATION IS COMPLETE.
// ============================================================

const getPendingAirtimeForReconciliation = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await pool.query(
      `
      SELECT
        at.id,
        at.reference,
        at.network,
        at.phone_number,
        at.amount,
        at.currency,
        at.status,
        at.provider_request_id,
        at.provider_reference,
        at.provider_response,
        at.created_at
      FROM airtime_transactions at
      INNER JOIN accounts a
        ON a.id = at.account_id
      WHERE a.user_id = $1
        AND at.status = 'pending'
      ORDER BY at.created_at ASC
      `,
      [userId]
    );

    const transactions = result.rows.map((transaction) => ({
      id: transaction.id,
      reference: transaction.reference,
      network: transaction.network,
      phone_number: transaction.phone_number
        ? `******${String(transaction.phone_number).slice(-4)}`
        : null,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      provider_request_id: transaction.provider_request_id || null,
      provider_reference: transaction.provider_reference || null,
      provider_response_exists: Boolean(transaction.provider_response),
      created_at: transaction.created_at,
    }));

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error(
      'Temporary Airtime reconciliation diagnostic error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve pending Airtime transactions.',
    });
  }
};

module.exports = {
  requeryPendingAirtime,
  getPendingAirtimeForReconciliation,
};
