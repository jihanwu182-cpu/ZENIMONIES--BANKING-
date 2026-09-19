const pool = require('../config/database');

const {
  requeryAirtimeTransaction,
} = require('../services/airtimeService');


// ============================================================
// HELPERS
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
      response?.responseCode ??
      response?.content?.code ??
      ''
  )
    .trim()
    .toLowerCase();

  const content =
    response?.content || {};

  const status = String(
    content?.transactions?.status ||
      content?.transaction?.status ||
      content?.status ||
      response?.status ||
      ''
  )
    .trim()
    .toLowerCase();


  // ----------------------------------------------------------
  // COMPLETED
  // ----------------------------------------------------------

  if (
    code === '000' &&
    (
      status === '' ||
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
    status === 'pending' ||
    status === 'initiated' ||
    status === 'processing'
  ) {
    return 'pending';
  }


  // ----------------------------------------------------------
  // UNKNOWN
  // ----------------------------------------------------------
  //
  // We do NOT automatically treat every unknown provider
  // response as a failure.
  //
  // This prevents an accidental refund when VTpass gives
  // us an unexpected response.
  // ----------------------------------------------------------

  const knownFailureCodes = [
    '016',
    '091',
    '040',
  ];

  if (
    knownFailureCodes.includes(code)
  ) {
    return 'failed';
  }


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
    fallback
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
// REQUERY AIRTIME
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

  const reference = String(
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
  // FIND TRANSACTION
  // ==========================================================
  //
  // IMPORTANT:
  //
  // The existing Airtime transaction records use:
  //
  //   user_id
  //   phone
  //
  // We keep those names consistent with the current purchase
  // controller instead of changing the live purchase structure.
  // ==========================================================

  let transactionResult;

  try {
    transactionResult =
      await pool.query(
        `
        SELECT
          at.id,
          at.account_id,
          at.user_id,
          at.network,
          at.phone,
          at.amount,
          at.currency,
          at.reference,
          at.status,
          at.provider_reference,
          at.provider_request_id,

          a.user_id AS account_user_id,
          a.balance

        FROM airtime_transactions at

        INNER JOIN accounts a
          ON a.id = at.account_id

        WHERE at.reference = $1
          AND (
            at.user_id = $2
            OR a.user_id = $2
          )

        LIMIT 1
        `,
        [
          reference,
          userId,
        ]
      );

  } catch (error) {

    console.error(
      'Airtime transaction lookup error:',
      error?.message ||
        'Unknown error'
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
  // NOT FOUND
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
  // ONLY PENDING
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
  // CALL VTPASS REQUERY
  // ==========================================================

  let providerResult;

  try {

    providerResult =
      await requeryAirtimeTransaction({
        requestId:
          transaction.provider_request_id,
      });

  } catch (error) {

    console.error(
      'VTpass airtime requery error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );

    return res.status(202).json({
      success: true,
      status:
        'pending',
      reference,
      message:
        'The provider could not confirm the final status yet. Your wallet has not been refunded automatically.',
    });
  }


  // ==========================================================
  // PROVIDER RESPONSE
  // ==========================================================

  const providerResponse =
    providerResult?.response;


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
  // STILL PENDING
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
  // UNKNOWN RESPONSE
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
      // Already completed
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
      // Must still be pending
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
      // Mark Airtime completed
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
      // Mark central transaction completed
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
          transaction.phone,
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
  // EXPLICIT FAILURE
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
      // Lock transaction
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
      // Already resolved
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
      // Lock wallet
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
      // Refund wallet
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
      // Mark Airtime failed
      // ------------------------------------------------------

      await client.query(
        `
        UPDATE airtime_transactions
        SET
          provider_reference = $1,
          provider_request_id = $2,
          commission_details = $3::jsonb,
          provider_response = $4::jsonb,
          status = 'failed',
          failure_reason = $5
        WHERE id = $6
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

          providerResponse
            ?.response_description ||
            providerResponse?.message ||
            providerResponse
              ?.content
              ?.errors ||
            'VTpass confirmed that the airtime transaction failed.',

          transaction.id,
        ]
      );


      // ------------------------------------------------------
      // Mark central transaction failed
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
      // Refund ledger
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
// EXPORT
// ============================================================

module.exports = {
  requeryPendingAirtime,
};
