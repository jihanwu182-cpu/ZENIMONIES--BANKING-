// ============================================================
// REQUERY PENDING AIRTIME
//
// POST /api/airtime/requery/:reference
//
// This checks a pending airtime transaction directly with
// VTpass using the saved provider request ID.
//
// IMPORTANT:
// - Successful provider result -> complete transaction
// - Failed provider result -> refund customer
// - Pending provider result -> remain pending
// - Never refund twice
// ============================================================

const requeryPendingAirtime = async (
  req,
  res
) => {

  const userId =
    getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
  }

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

  // ----------------------------------------------------------
  // Find customer's pending airtime transaction
  // ----------------------------------------------------------

  let transaction;

  try {

    const result =
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
          at.provider_request_id,
          at.provider_reference,
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

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Airtime transaction not found.',
      });
    }

    transaction =
      result.rows[0];

  } catch (error) {

    console.error(
      'Airtime requery lookup error:',
      error?.message ||
        'Unknown error'
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to find the airtime transaction.',
    });
  }

  // ----------------------------------------------------------
  // Only pending transactions may be requeried
  // ----------------------------------------------------------

  if (
    transaction.status !==
    'pending'
  ) {
    return res.status(200).json({
      success: true,
      status:
        transaction.status,
      reference:
        transaction.reference,
      message:
        'This airtime transaction has already been resolved.',
    });
  }

  // ----------------------------------------------------------
  // Provider request ID is required
  // ----------------------------------------------------------

  if (
    !transaction.provider_request_id
  ) {
    return res.status(409).json({
      success: false,
      code:
        'PROVIDER_REQUEST_ID_MISSING',
      status: 'pending',
      reference:
        transaction.reference,
      message:
        'This transaction is pending, but the provider request ID is not available yet.',
    });
  }

  // ----------------------------------------------------------
  // Ask VTpass for the current status
  // ----------------------------------------------------------

  let providerResponse;

  try {

    const {
      requeryAirtimeTransaction,
    } = require('../services/airtimeService');

    providerResponse =
      await requeryAirtimeTransaction(
        transaction.provider_request_id
      );

  } catch (error) {

    console.error(
      'VTpass airtime requery error:',
      error?.code ||
        error?.message ||
        'Unknown error'
    );

    // Do not change the wallet when the provider
    // cannot be contacted.

    return res.status(202).json({
      success: true,
      status: 'pending',
      reference:
        transaction.reference,
      message:
        'The provider could not be reached. The transaction remains pending and will be checked again.',
    });
  }

  // ----------------------------------------------------------
  // Determine provider status
  // ----------------------------------------------------------

  const providerStatus =
    getProviderStatus(
      providerResponse
    );

  const providerReference =
    getProviderReference(
      providerResponse,
      transaction.provider_request_id
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
  // SUCCESS
  // ==========================================================

  if (
    providerStatus ===
    'completed'
  ) {

    try {

      const client =
        await pool.connect();

      try {

        await client.query(
          'BEGIN'
        );

        // Lock the transaction so two
        // simultaneous requeries cannot
        // process it twice.

        const locked =
          await client.query(
            `
            SELECT
              id,
              account_id,
              status
            FROM airtime_transactions
            WHERE id = $1
            FOR UPDATE
            `,
            [transaction.id]
          );

        if (
          locked.rows.length === 0
        ) {
          throw new Error(
            'Airtime transaction disappeared during reconciliation.'
          );
        }

        // Another request may have already
        // completed it.

        if (
          locked.rows[0].status !==
          'pending'
        ) {

          await client.query(
            'COMMIT'
          );

          return res.status(200).json({
            success: true,
            status:
              locked.rows[0].status,
            reference:
              transaction.reference,
            message:
              'This transaction has already been resolved.',
          });
        }

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

        await client.query(
          `
          UPDATE transactions
          SET
            status = 'completed'
          WHERE reference = $1
            AND status = 'pending'
          `,
          [
            transaction.reference,
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

        throw error;

      } finally {

        client.release();

      }

      return res.status(200).json({
        success: true,
        status: 'completed',
        reference:
          transaction.reference,
        providerReference,
        message:
          'Airtime purchase confirmed successfully.',
      });

    } catch (error) {

      console.error(
        'Airtime successful reconciliation error:',
        error?.message ||
          'Unknown error'
      );

      return res.status(202).json({
        success: true,
        status: 'pending',
        reference:
          transaction.reference,
        message:
          'VTpass confirmed the airtime, but Zenimonies is still finalizing the transaction.',
      });
    }
  }

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
      status: 'pending',
      reference:
        transaction.reference,
      message:
        'The provider is still processing this airtime transaction.',
    });
  }

  // ==========================================================
  // EXPLICIT FAILURE
  //
  // Refund exactly once.
  // ==========================================================

  const client =
    await pool.connect();

  try {

    await client.query(
      'BEGIN'
    );

    // --------------------------------------------------------
    // Lock airtime transaction
    // --------------------------------------------------------

    const lockedTransaction =
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
        [transaction.id]
      );

    if (
      lockedTransaction.rows.length === 0
    ) {
      throw new Error(
        'Airtime transaction not found during refund.'
      );
    }

    const locked =
      lockedTransaction.rows[0];

    // --------------------------------------------------------
    // IMPORTANT:
    // If another process already resolved this transaction,
    // do not refund again.
    // --------------------------------------------------------

    if (
      locked.status !==
      'pending'
    ) {

      await client.query(
        'COMMIT'
      );

      return res.status(200).json({
        success: true,
        status:
          locked.status,
        reference:
          transaction.reference,
        message:
          'This transaction has already been resolved.',
      });
    }

    // --------------------------------------------------------
    // Lock wallet
    // --------------------------------------------------------

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
        [locked.account_id]
      );

    if (
      accountResult.rows.length === 0
    ) {
      throw new Error(
        'Customer wallet not found during airtime refund.'
      );
    }

    const currentBalance =
      Number(
        accountResult.rows[0].balance
      );

    const refundAmount =
      Number(
        locked.amount
      );

    if (
      !Number.isFinite(
        currentBalance
      ) ||
      !Number.isFinite(
        refundAmount
      )
    ) {
      throw new Error(
        'Invalid wallet balance or airtime amount during refund.'
      );
    }

    const refundedBalance =
      currentBalance +
      refundAmount;

    // --------------------------------------------------------
    // Refund wallet
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
        refundedBalance,
        locked.account_id,
      ]
    );

    // --------------------------------------------------------
    // Mark airtime transaction failed
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE airtime_transactions
      SET
        provider_reference = $1,
        provider_request_id = $2,
        provider_response = $3::jsonb,
        status = 'failed'
      WHERE id = $4
        AND status = 'pending'
      `,
      [
        providerReference,
        transaction.provider_request_id,
        JSON.stringify(
          providerResponse
        ),
        locked.id,
      ]
    );

    // --------------------------------------------------------
    // Mark central transaction failed
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE transactions
      SET
        status = 'failed'
      WHERE reference = $1
        AND status = 'pending'
      `,
      [
        transaction.reference,
      ]
    );

    // --------------------------------------------------------
    // Record refund in central transaction ledger
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
        locked.account_id,
        refundAmount,
        `ZEN-REFUND-${transaction.reference}`,
        `Refund for failed airtime purchase ${transaction.reference}`,
        currentBalance,
        refundedBalance,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return res.status(200).json({
      success: true,
      status: 'failed',
      reference:
        transaction.reference,
      refunded: true,
      refundAmount,
      providerMessage,
      message:
        'The airtime purchase failed and the wallet has been refunded.',
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
        'AIRTIME_RECONCILIATION_FAILED',
      status: 'pending',
      reference:
        transaction.reference,
      message:
        'The transaction could not be reconciled automatically. No refund was made.',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  buyAirtime,
  requeryPendingAirtime,
};
