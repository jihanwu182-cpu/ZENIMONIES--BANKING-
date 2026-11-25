
const pool = require('../config/database');

const {
  requeryElectricityTransaction,
} = require('../services/electricityService');

// ============================================================
// ZENIMONIES — VTPASS ELECTRICITY REQUERY
//
// - Does not initiate another purchase.
// - Uses the original saved VTPass request ID.
// - Checks transaction ownership.
// - Completes confirmed deliveries.
// - Refunds confirmed failures exactly once.
// - Keeps uncertain responses pending.
// ============================================================

const FINAL_FAILURE_CODES = new Set([
  '010',
  '011',
  '012',
  '013',
  '016',
  '017',
  '018',
  '021',
  '022',
  '023',
  '024',
  '027',
  '028',
  '030',
  '034',
  '035',
  '040',
  '091',
]);


const getTransactionStatus = (result) => {
  const code = String(result?.code || '').trim();
  const status = String(result?.status || '')
    .trim()
    .toLowerCase();

  if (
    ['000', '001'].includes(code) &&
    status === 'delivered'
  ) {
    return 'completed';
  }

  if (FINAL_FAILURE_CODES.has(code)) {
    return 'failed';
  }

  // Initiated, pending, unknown, and unclear responses
  // must never trigger an automatic refund.
  return 'processing';
};

const getProviderMessage = (result) =>
  result?.responseDescription ||
  result?.rawResponse?.response_description ||
  result?.rawResponse?.message ||
  null;

const getProviderReference = (result) =>
  result?.providerTransactionId ||
  result?.rawResponse?.content?.transactions?.transactionId ||
  null;

const getElectricityToken = (result) =>
  result?.token ||
  result?.rawResponse?.token ||
  result?.rawResponse?.purchased_code ||
  result?.rawResponse?.content?.transactions?.token ||
  null;

const getElectricityUnits = (result) =>
  result?.units ||
  result?.rawResponse?.units ||
  result?.rawResponse?.content?.transactions?.units ||
  null;

const serializeResponse = (result) => {
  try {
    return JSON.stringify(result?.rawResponse || result || {});
  } catch (_) {
    return JSON.stringify({
      message: 'Unable to serialize VTPass response.',
    });
  }
};

// ============================================================
// REQUERY PENDING ELECTRICITY PAYMENT
// POST /api/bills/electricity/requery/:reference
// ============================================================

const requeryElectricityPayment = async (req, res) => {
  const userId =
    req.user?.id ||
    req.user?.user_id;

  const reference = String(
    req.params?.reference || ''
  ).trim();

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!reference) {
    return res.status(400).json({
      success: false,
      message: 'Transaction reference is required.',
    });
  }

  // ==========================================================
  // STEP 1 — FIND CUSTOMER'S TRANSACTION
  // ==========================================================

  let bill;

  try {
    const result = await pool.query(
      `
      SELECT
        bp.id,
        bp.account_id,
        bp.reference,
        bp.provider_request_id,
        bp.provider_reference,
        bp.amount,
        bp.currency,
        bp.status,
        bp.electricity_token,
        bp.units
      FROM bill_payments bp
      INNER JOIN accounts a
        ON a.id = bp.account_id
      WHERE
        bp.reference = $1
        AND bp.category = 'electricity'
        AND a.user_id = $2
      LIMIT 1
      `,
      [reference, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Electricity transaction not found.',
      });
    }

    bill = result.rows[0];
  } catch (error) {
    console.error(
      'Electricity requery lookup error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to find electricity transaction.',
    });
  }

  // ==========================================================
  // STEP 2 — RETURN ALREADY FINAL TRANSACTIONS
  // ==========================================================

  const finalStatuses = [
    'completed',
    'failed',
    'cancelled',
    'refunded',
  ];

  if (finalStatuses.includes(bill.status)) {
    return res.status(200).json({
      success: true,
      status: bill.status,
      message: 'This transaction has already been resolved.',
      reference: bill.reference,
      electricity_token: bill.electricity_token,
      token: bill.electricity_token,
      units: bill.units,
    });
  }

  // ==========================================================
  // STEP 3 — CHECK SAVED VTPASS REQUEST ID
  // ==========================================================

  if (!bill.provider_request_id) {
    return res.status(409).json({
      success: false,
      processing: true,
      status: 'processing',
      message:
        'This transaction does not have a saved VTPass request ID. Manual reconciliation is required.',
      reference: bill.reference,
    });
  }

  // ==========================================================
  // STEP 4 — QUERY VTPASS
  // ==========================================================

  let providerResult;

  try {
    providerResult = await requeryElectricityTransaction(
      bill.provider_request_id
    );
  } catch (error) {
    console.error(
      'VTPass Electricity requery error:',
      error.message
    );

    // A requery error is not proof of a failed purchase.
    return res.status(202).json({
      success: true,
      processing: true,
      status: 'processing',
      message:
        'Your electricity payment is still being checked. Please do not submit another payment.',
      reference: bill.reference,
    });
  }

  const resolvedStatus =
    getTransactionStatus(providerResult);

  const providerReference =
    getProviderReference(providerResult);

  const providerMessage =
    getProviderMessage(providerResult);

  const electricityToken =
    getElectricityToken(providerResult);

  const units =
    getElectricityUnits(providerResult);

  const providerResponse =
    serializeResponse(providerResult);

  // ==========================================================
  // STEP 5 — COMPLETE CONFIRMED DELIVERY
  // ==========================================================

  if (resolvedStatus === 'completed') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const lockedBill = await client.query(
        `
        SELECT
          id,
          account_id,
          reference,
          status
        FROM bill_payments
        WHERE id = $1
        FOR UPDATE
        `,
        [bill.id]
      );

      if (lockedBill.rows.length === 0) {
        throw new Error('Electricity transaction not found.');
      }

      const currentBill = lockedBill.rows[0];

      if (
        ['completed', 'failed', 'cancelled', 'refunded']
          .includes(currentBill.status)
      ) {
        await client.query('COMMIT');

        return res.status(200).json({
          success: true,
          status: currentBill.status,
          message: 'Transaction has already been resolved.',
          reference: bill.reference,
        });
      }

      const updateBill = await client.query(
        `
        UPDATE bill_payments
        SET
          status = 'completed',
          provider_reference =
            COALESCE($1, provider_reference),
          provider_response = $2::jsonb,
          provider_response_message = $3,
          electricity_token =
            COALESCE($4, electricity_token),
          units =
            COALESCE($5, units),
          completed_at = CURRENT_TIMESTAMP
        WHERE id = $6
          AND status IN (
            'processing',
            'pending',
            'provider_response_unrecognized'
          )
        `,
        [
          providerReference,
          providerResponse,
          providerMessage,
          electricityToken,
          units,
          bill.id,
        ]
      );

      if (updateBill.rowCount !== 1) {
        throw new Error(
          'Electricity payment status could not be updated.'
        );
      }

      const updateTransaction = await client.query(
        `
        UPDATE transactions
        SET status = 'completed'
        WHERE reference = $1
        `,
        [bill.reference]
      );

      if (updateTransaction.rowCount !== 1) {
        throw new Error(
          'Central transaction record could not be updated.'
        );
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        status: 'completed',
        message:
          providerMessage ||
          'Electricity payment confirmed successfully.',
        reference: bill.reference,
        provider_reference: providerReference,
        electricity_token: electricityToken,
        token: electricityToken,
        units,
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}

      console.error(
        'Electricity completion reconciliation error:',
        error.message
      );

      return res.status(202).json({
        success: true,
        processing: true,
        status: 'processing',
        message:
          'VTPass confirmed the transaction, but local confirmation is still being completed.',
        reference: bill.reference,
      });
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // STEP 6 — REFUND CONFIRMED FAILURE
  // ==========================================================

  if (resolvedStatus === 'failed') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const lockedBill = await client.query(
        `
        SELECT
          id,
          account_id,
          reference,
          amount,
          status
        FROM bill_payments
        WHERE id = $1
        FOR UPDATE
        `,
        [bill.id]
      );

      if (lockedBill.rows.length === 0) {
        throw new Error('Electricity transaction not found.');
      }

      const currentBill = lockedBill.rows[0];

      // A final status means the refund must not run again.
      if (
        ['completed', 'failed', 'cancelled', 'refunded']
          .includes(currentBill.status)
      ) {
        await client.query('COMMIT');

        return res.status(200).json({
          success: true,
          status: currentBill.status,
          message: 'Transaction has already been resolved.',
          reference: bill.reference,
        });
      }

      const refundAmount = Number(currentBill.amount);

      if (
        !Number.isFinite(refundAmount) ||
        refundAmount <= 0
      ) {
        throw new Error('Invalid refund amount.');
      }

      const accountUpdate = await client.query(
        `
        UPDATE accounts
        SET
          balance = balance + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          refundAmount,
          currentBill.account_id,
        ]
      );

      if (accountUpdate.rowCount !== 1) {
        throw new Error('Customer wallet refund failed.');
      }

      // Deterministic reference prevents duplicate refund entries.
      await client.query(
        `
        INSERT INTO transactions (
          account_id,
          type,
          amount,
          currency,
          reference,
          status,
          description
        )
        VALUES (
          $1,
          'electricity_refund',
          $2,
          'NGN',
          $3,
          'completed',
          $4
        )
        `,
        [
          currentBill.account_id,
          refundAmount,
          `REF-${bill.reference}`,
          `VTPass Electricity refund - ${bill.reference}`,
        ]
      );

      const updateBill = await client.query(
        `
        UPDATE bill_payments
        SET
          status = 'failed',
          provider_reference =
            COALESCE($1, provider_reference),
          provider_response = $2::jsonb,
          provider_response_message = $3
        WHERE id = $4
          AND status IN (
            'processing',
            'pending',
            'provider_response_unrecognized'
          )
        `,
        [
          providerReference,
          providerResponse,
          providerMessage,
          bill.id,
        ]
      );

      if (updateBill.rowCount !== 1) {
        throw new Error(
          'Failed to update Electricity payment status.'
        );
      }

      const updateTransaction = await client.query(
        `
        UPDATE transactions
        SET status = 'failed'
        WHERE reference = $1
        `,
        [bill.reference]
      );

      if (updateTransaction.rowCount !== 1) {
        throw new Error(
          'Original transaction could not be updated.'
        );
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        status: 'failed',
        refunded: true,
        message:
          providerMessage ||
          'Electricity payment failed. Your wallet has been refunded.',
        reference: bill.reference,
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}

      console.error(
        'Electricity refund reconciliation error:',
        error.message
      );

      return res.status(202).json({
        success: true,
        processing: true,
        status: 'processing',
        message:
          'The provider reported a failed transaction, but the refund is still being reconciled. Please do not submit another payment.',
        reference: bill.reference,
      });
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // STEP 7 — PENDING OR UNKNOWN RESPONSE
  // ==========================================================

  try {
    await pool.query(
      `
      UPDATE bill_payments
      SET
        status = 'processing',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2::jsonb,
        provider_response_message = $3
      WHERE id = $4
        AND status IN (
          'processing',
          'pending',
          'provider_response_unrecognized'
        )
      `,
      [
        providerReference,
        providerResponse,
        providerMessage,
        bill.id,
      ]
    );
  } catch (error) {
    console.error(
      'Unable to save pending Electricity requery response:',
      error.message
    );
  }

  return res.status(202).json({
    success: true,
    processing: true,
    status: 'processing',
    message:
      providerMessage ||
      'Your electricity payment is still processing. Please check again later.',
    reference: bill.reference,
  });
};

module.exports = {
  requeryElectricityPayment,
};
