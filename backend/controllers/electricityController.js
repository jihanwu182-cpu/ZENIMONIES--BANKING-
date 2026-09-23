const crypto = require('crypto');
const axios = require('axios');
const pool = require('../config/database');

/**
 * ============================================================
 * ZENIMONIES — ELECTRICITY CONTROLLER
 * Version: 2026-09-23-v7
 *
 * Uses the existing bill_payments table.
 * Does NOT require provider_webhook_response.
 * ============================================================
 */

const SOGO_API_BASE_URL =
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1';

const SOGO_API_KEY =
  process.env.SOGO_API_KEY;

const SOGO_DISCO_SLUGS = {
  APLE: 'abedc',
  AEDC: 'aedc',
  BEDC: 'bedc',
  EKEDC: 'ekedc',
  EEDC: 'eedc',
  IBEDC: 'ibedc',
  IKEDC: 'ikedc',
  JED: 'jed',
  KAEDCO: 'kaedco',
  KEDCO: 'kedco',
  PHEDC: 'phed',
  YEDC: 'yedc',
};

const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
};

/**
 * Extract electricity token from all known/possible
 * Sogo response locations.
 */
const extractElectricityToken = (payload) => {
  return firstValue(
    payload?.token,
    payload?.electricity_token,
    payload?.token_code,
    payload?.prepaid_token,
    payload?.pin,

    payload?.data?.token,
    payload?.data?.electricity_token,
    payload?.data?.token_code,
    payload?.data?.prepaid_token,
    payload?.data?.pin,

    payload?.data?.details?.token,
    payload?.data?.details?.electricity_token,
    payload?.data?.details?.token_code,
    payload?.data?.details?.prepaid_token,

    payload?.data?.receipt?.token,
    payload?.data?.receipt?.electricity_token,

    payload?.transaction?.token,
    payload?.transaction?.electricity_token,
    payload?.transaction?.token_code,
    payload?.transaction?.prepaid_token,
    payload?.transaction?.pin,

    payload?.transaction?.details?.token,
    payload?.transaction?.details?.electricity_token,

    payload?.object?.token,
    payload?.object?.electricity_token,

    payload?.metadata?.token,
    payload?.metadata?.electricity_token,

    payload?.data?.metadata?.token,
    payload?.data?.metadata?.electricity_token
  );
};

/**
 * Extract electricity units / kWh.
 */
const extractUnits = (payload) => {
  return firstValue(
    payload?.units,
    payload?.unit,
    payload?.kwh,

    payload?.data?.units,
    payload?.data?.unit,
    payload?.data?.kwh,

    payload?.data?.details?.units,
    payload?.data?.details?.unit,
    payload?.data?.details?.kwh,

    payload?.transaction?.units,
    payload?.transaction?.unit,
    payload?.transaction?.kwh,

    payload?.transaction?.details?.units,
    payload?.transaction?.details?.unit,
    payload?.transaction?.details?.kwh
  );
};

/**
 * Extract provider transaction object.
 */
const extractProviderData = (response) => {
  if (!response) {
    return {};
  }

  return (
    response?.data?.transaction ||
    response?.data?.data ||
    response?.data?.object ||
    response?.data ||
    response?.transaction ||
    response?.object ||
    response
  );
};

/**
 * Normalize provider status.
 */
const extractProviderStatus = (providerData, rawResponse) => {
  const rawStatus = firstValue(
    providerData?.status,
    rawResponse?.status,
    rawResponse?.data?.status
  );

  if (rawStatus && typeof rawStatus === 'object') {
    return String(
      firstValue(
        rawStatus?.value,
        rawStatus?.status,
        ''
      )
    )
      .trim()
      .toLowerCase();
  }

  return String(rawStatus || '')
    .trim()
    .toLowerCase();
};

/**
 * Extract provider reference.
 */
const extractProviderReference = (
  providerData,
  rawResponse
) => {
  return firstValue(
    providerData?.reference,
    providerData?.provider_reference,
    providerData?.providerReference,

    rawResponse?.reference,
    rawResponse?.provider_reference,
    rawResponse?.providerReference,

    rawResponse?.data?.reference,
    rawResponse?.data?.provider_reference,

    rawResponse?.transaction?.reference
  );
};

/**
 * Extract provider message.
 */
const extractProviderMessage = (
  providerData,
  rawResponse
) => {
  return firstValue(
    // Prefer Sogo's actual message first
    rawResponse?.message,

    rawResponse?.data?.message,

    // Then transaction-level message
    providerData?.message,

    // Description is only a fallback
    rawResponse?.description,
    rawResponse?.data?.description,
    providerData?.description
  );
};

/**
 * ============================================================
 * PURCHASE ELECTRICITY
 * ============================================================
 */
const purchaseElectricity = async (req, res) => {
  const userId =
    req.user?.id ||
    req.user?.user_id;

  const {
    provider,
    meter_number,
    meter_type,
    amount,
  } = req.body || {};

  console.log(
    '🔥 ZENIMONIES ELECTRICITY CONTROLLER V7 REACHED 🔥'
  );

  /**
   * ----------------------------------------------------------
   * BASIC AUTHENTICATION
   * ----------------------------------------------------------
   */
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  /**
   * ----------------------------------------------------------
   * ENVIRONMENT CHECK
   * ----------------------------------------------------------
   */
  if (!SOGO_API_KEY) {
    console.error(
      '❌ SOGO_API_KEY is missing'
    );

    return res.status(500).json({
      success: false,
      message: 'Electricity provider is not configured',
    });
  }

  /**
   * ----------------------------------------------------------
   * VALIDATE PROVIDER
   * ----------------------------------------------------------
   */
  const normalizedProvider =
    String(provider || '')
      .trim()
      .toUpperCase();

  const discoSlug =
    SOGO_DISCO_SLUGS[normalizedProvider];

  if (!discoSlug) {
    return res.status(400).json({
      success: false,
      message: 'Invalid electricity provider',
    });
  }

  /**
   * ----------------------------------------------------------
   * VALIDATE METER TYPE
   * ----------------------------------------------------------
   */
  const normalizedMeterType =
    String(meter_type || '')
      .trim()
      .toLowerCase();

  if (
    !['prepaid', 'postpaid'].includes(
      normalizedMeterType
    )
  ) {
    return res.status(400).json({
      success: false,
      message: 'Meter type must be prepaid or postpaid',
    });
  }

  /**
   * ----------------------------------------------------------
   * VALIDATE METER NUMBER
   * ----------------------------------------------------------
   */
  const normalizedMeterNumber =
    String(meter_number || '')
      .trim();

  if (
    !/^[A-Za-z0-9\-]{5,50}$/.test(
      normalizedMeterNumber
    )
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid meter/account number',
    });
  }

  /**
   * ----------------------------------------------------------
   * VALIDATE AMOUNT
   * ----------------------------------------------------------
   */
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid electricity amount',
    });
  }

  if (numericAmount > 1000000) {
    return res.status(400).json({
      success: false,
      message:
        'Electricity amount cannot exceed ₦1,000,000',
    });
  }

  /**
   * ----------------------------------------------------------
   * STEP 1 — VERIFY METER FIRST
   * ----------------------------------------------------------
   */
  let verification;

  try {
    console.log(
      '🔎 Verifying electricity meter:',
      normalizedMeterNumber
    );

    const verifyResponse = await axios.post(
      `${SOGO_API_BASE_URL}/bills/electricity/verify-meter`,
      {
        disco_slug: discoSlug,
        meter_number: normalizedMeterNumber,
        meter_type: normalizedMeterType,
      },
      {
        headers: {
          Authorization:
            `Bearer ${SOGO_API_KEY}`,
          'Content-Type':
            'application/json',
        },
        timeout: 30000,
      }
    );

    verification =
      verifyResponse?.data;

    console.log(
      '✅ Electricity meter verification successful'
    );

  } catch (error) {
    console.error(
      '❌ Electricity meter verification failed:',
      error?.response?.data ||
        error?.message
    );

    return res.status(
      error?.response?.status >= 400 &&
      error?.response?.status < 500
        ? error.response.status
        : 502
    ).json({
      success: false,
      message:
        error?.response?.data?.message ||
        'Unable to verify electricity meter',
      provider_response:
        error?.response?.data || null,
    });
  }

  /**
   * ----------------------------------------------------------
   * EXTRACT VERIFIED CUSTOMER INFORMATION
   * ----------------------------------------------------------
   */
  const verificationData =
    verification?.data ||
    verification?.transaction ||
    verification;

  const customerName =
    firstValue(
      verificationData?.customer_name,
      verificationData?.customerName,
      verificationData?.name,

      verificationData?.customer?.name,

      verification?.customer_name,
      verification?.customerName
    );

  const customerAddress =
    firstValue(
      verificationData?.customer_address,
      verificationData?.address,

      verificationData?.customer?.address,

      verification?.customer_address,
      verification?.address
    );

  const tariffClass =
    firstValue(
      verificationData?.tariff_class,
      verificationData?.tariffClass,

      verificationData?.customer?.tariff_class
    );

  /**
   * ----------------------------------------------------------
   * DATABASE TRANSACTION
   * ----------------------------------------------------------
   */
  const client =
    await pool.connect();

  let localBillId;
  let transactionReference;
  let idempotencyKey;

  try {
    await client.query(
      'BEGIN'
    );

    /**
     * --------------------------------------------------------
     * LOCK USER ACCOUNT
     * --------------------------------------------------------
     */
    const accountResult =
      await client.query(
        `
        SELECT
          id,
          balance,
          currency,
          status
        FROM accounts
        WHERE
          user_id = $1
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
          'Active NGN account not found',
      });
    }

    const account =
      accountResult.rows[0];

    const balance =
      Number(account.balance);

    /**
     * --------------------------------------------------------
     * CHECK BALANCE
     * --------------------------------------------------------
     */
    if (
      !Number.isFinite(balance) ||
      balance < numericAmount
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Insufficient balance',
      });
    }

    /**
     * --------------------------------------------------------
     * CREATE REFERENCES
     * --------------------------------------------------------
     */
    transactionReference =
      `ZEL-${Date.now()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;

    idempotencyKey =
      crypto.randomUUID();

    /**
     * --------------------------------------------------------
     * FIND ELECTRICITY BILLER
     * --------------------------------------------------------
     */
    const billerResult =
      await client.query(
        `
        SELECT
          id,
          name
        FROM billers
        WHERE
          category = 'electricity'
        ORDER BY created_at ASC
        LIMIT 1
        `
      );

    const biller =
      billerResult.rows[0] || null;

    /**
     * --------------------------------------------------------
     * CREATE PENDING/PROCESSING BILL
     * --------------------------------------------------------
     */
    const billResult =
      await client.query(
        `
        INSERT INTO bill_payments (
          account_id,
          biller_id,
          category,
          biller_name,
          customer_reference,
          customer_name,
          amount,
          currency,
          reference,
          provider_request_id,
          status,
          meter_type,
          meter_number,
          verification_status,
          verified_customer_name,
          verified_customer_address,
          tariff_class
        )
        VALUES (
          $1,
          $2,
          'electricity',
          $3,
          $4,
          $5,
          $6,
          'NGN',
          $7,
          $8,
          'processing',
          $9,
          $10,
          'verified',
          $11,
          $12,
          $13
        )
        RETURNING id
        `,
        [
          account.id,
          biller?.id || null,
          normalizedProvider,
          normalizedMeterNumber,
          customerName || null,
          numericAmount,
          transactionReference,
          idempotencyKey,
          normalizedMeterType,
          normalizedMeterNumber,
          customerName || null,
          customerAddress || null,
          tariffClass || null,
        ]
      );

    localBillId =
      billResult.rows[0].id;

    /**
     * --------------------------------------------------------
     * DEBIT CUSTOMER
     * --------------------------------------------------------
     */
    await client.query(
      `
      UPDATE accounts
      SET
        balance = balance - $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        numericAmount,
        account.id,
      ]
    );

    /**
     * --------------------------------------------------------
     * CREATE TRANSACTION RECORD
     * --------------------------------------------------------
     */
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
        'electricity_payment',
        $2,
        'NGN',
        $3,
        'processing',
        $4
      )
      `,
      [
        account.id,
        numericAmount,
        transactionReference,
        `Electricity - ${normalizedProvider} (${normalizedMeterNumber})`,
      ]
    );

    await client.query(
      'COMMIT'
    );

    console.log(
      '💰 Customer account debited'
    );

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (_) {}

    console.error(
      '❌ Electricity local transaction failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to create electricity payment',
    });
  } finally {
    client.release();
  }

  /**
   * ----------------------------------------------------------
   * STEP 2 — PURCHASE THROUGH SOGO
   * ----------------------------------------------------------
   */
  let purchaseResult;

  try {
    console.log(
      '⚡ Sending electricity purchase to Sogo'
    );

    const response =
      await axios.post(
        `${SOGO_API_BASE_URL}/bills/electricity`,
        {
          disco_slug: discoSlug,
          meter_number:
            normalizedMeterNumber,
          meter_type:
            normalizedMeterType,
          amount: numericAmount,
        },
        {
          headers: {
            Authorization:
              `Bearer ${SOGO_API_KEY}`,

            'Content-Type':
              'application/json',

            'Idempotency-Key':
              idempotencyKey,
          },

          timeout: 60000,
        }
      );

    purchaseResult =
      response?.data;

    console.log(
      '✅ Sogo electricity purchase response received'
    );

  } catch (error) {
    /**
     * --------------------------------------------------------
     * NETWORK/TIMEOUT CASE
     * --------------------------------------------------------
     *
     * We DO NOT refund here because the request may have
     * reached Sogo and could still complete.
     */
    console.error(
      '⚠️ Sogo electricity request/network error:',
      error?.message
    );

    return res.status(202).json({
      success: true,
      processing: true,
      message:
        'Your electricity payment is being processed. Please do not submit it again.',
      reference:
        transactionReference,
      provider_request_id:
        idempotencyKey,
    });
  }

  /**
   * ----------------------------------------------------------
   * STEP 3 — NORMALIZE SOGO RESPONSE
   * ----------------------------------------------------------
   */
  const providerData =
    extractProviderData(
      purchaseResult
    );

  const providerStatus =
    extractProviderStatus(
      providerData,
      purchaseResult
    );

  const providerReference =
    extractProviderReference(
      providerData,
      purchaseResult
    );

  const providerMessage =
    extractProviderMessage(
      providerData,
      purchaseResult
    );

  const electricityToken =
    extractElectricityToken(
      purchaseResult
    );

  const units =
    extractUnits(
      purchaseResult
    );

  console.log(
    '📌 Sogo status:',
    providerStatus
  );

  console.log(
    '📌 Sogo reference:',
    providerReference
  );

  console.log(
    '📌 Electricity token:',
    electricityToken
      ? '[PRESENT]'
      : '[NOT PRESENT]'
  );

  console.log(
    '📌 Electricity units:',
    units || '[NOT PRESENT]'
  );

  /**
   * ----------------------------------------------------------
   * STEP 4 — COMPLETED
   * ----------------------------------------------------------
   */
  if (
    providerStatus === 'completed' ||
    providerStatus === 'success' ||
    providerStatus === 'successful'
  ) {
    await pool.query(
      `
      UPDATE bill_payments
      SET
        status = 'completed',
        provider_reference = $1,
        provider_response = $2,
        provider_response_message = $3,
        electricity_token = COALESCE($4, electricity_token),
        units = COALESCE($5, units),
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $6
      `,
      [
        providerReference,
        JSON.stringify(
          purchaseResult
        ),
        providerMessage,
        electricityToken,
        units,
        localBillId,
      ]
    );

    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'completed'
      WHERE reference = $1
      `,
      [transactionReference]
    );

    console.log(
      '🎉 ELECTRICITY PAYMENT COMPLETED'
    );

    return res.status(200).json({
      success: true,
      status: 'completed',
      message:
        providerMessage ||
        'Electricity payment successful',
      reference:
        transactionReference,
      provider_reference:
        providerReference,
      electricity_token:
        electricityToken,
      token:
        electricityToken,
      units,
      customer_name:
        customerName,
      customer_address:
        customerAddress,
      meter_number:
        normalizedMeterNumber,
      meter_type:
        normalizedMeterType,
      provider:
        normalizedProvider,
    });
  }

  /**
   * ----------------------------------------------------------
   * STEP 5 — PROCESSING
   * ----------------------------------------------------------
   */
  if (
    providerStatus === 'processing' ||
    providerStatus === 'pending'
  ) {
    await pool.query(
      `
      UPDATE bill_payments
      SET
        status = 'processing',
        provider_reference = COALESCE($1, provider_reference),
        provider_response = $2,
        provider_response_message = $3
      WHERE id = $4
      `,
      [
        providerReference,
        JSON.stringify(
          purchaseResult
        ),
        providerMessage,
        localBillId,
      ]
    );

    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'processing'
      WHERE reference = $1
      `,
      [transactionReference]
    );

    console.log(
      '⏳ ELECTRICITY PAYMENT PROCESSING'
    );

    return res.status(202).json({
      success: true,
      processing: true,
      status: 'processing',
      message:
        providerMessage ||
        'Electricity payment is still processing. Please do not submit it again.',
      reference:
        transactionReference,
      provider_reference:
        providerReference,
    });
  }

  /**
   * ----------------------------------------------------------
   * STEP 6 — FAILED
   * ----------------------------------------------------------
   */
  if (
    providerStatus === 'failed' ||
    providerStatus === 'cancelled'
  ) {
    const refundClient =
      await pool.connect();

    try {
      await refundClient.query(
        'BEGIN'
      );

      /**
       * Lock the account before refunding.
       */
      const billAccount =
        await refundClient.query(
          `
          SELECT
            account_id,
            amount
          FROM bill_payments
          WHERE id = $1
          FOR UPDATE
          `,
          [localBillId]
        );

      if (
        billAccount.rows.length > 0
      ) {
        const refundAccountId =
          billAccount.rows[0].account_id;

        const refundAmount =
          Number(
            billAccount.rows[0].amount
          );

        /**
         * Refund only if the bill is still processing.
         * This protects against duplicate refunds.
         */
        const statusCheck =
          await refundClient.query(
            `
            SELECT status
            FROM bill_payments
            WHERE id = $1
            FOR UPDATE
            `,
            [localBillId]
          );

        if (
          statusCheck.rows[0]?.status ===
          'processing'
        ) {
          await refundClient.query(
            `
            UPDATE accounts
            SET
              balance = balance + $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            `,
            [
              refundAmount,
              refundAccountId,
            ]
          );

          await refundClient.query(
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
              refundAccountId,
              refundAmount,
              `REF-${transactionReference}`,
              `Electricity payment refund - ${normalizedProvider}`,
            ]
          );
        }
      }

      await refundClient.query(
        `
        UPDATE bill_payments
        SET
          status = $1,
          provider_reference = COALESCE($2, provider_reference),
          provider_response = $3,
          provider_response_message = $4
        WHERE id = $5
        `,
        [
          providerStatus === 'cancelled'
            ? 'cancelled'
            : 'failed',
          providerReference,
          JSON.stringify(
            purchaseResult
          ),
          providerMessage,
          localBillId,
        ]
      );

      await refundClient.query(
        `
        UPDATE transactions
        SET
          status = $1
        WHERE reference = $2
        `,
        [
          providerStatus === 'cancelled'
            ? 'cancelled'
            : 'failed',
          transactionReference,
        ]
      );

      await refundClient.query(
        'COMMIT'
      );

    } catch (refundError) {
      try {
        await refundClient.query(
          'ROLLBACK'
        );
      } catch (_) {}

      console.error(
        '❌ Electricity refund processing failed:',
        refundError
      );
    } finally {
      refundClient.release();
    }

    return res.status(502).json({
      success: false,
      status:
        providerStatus === 'cancelled'
          ? 'cancelled'
          : 'failed',
      message:
        providerMessage ||
        'Electricity payment failed. Your account has been refunded.',
      reference:
        transactionReference,
      provider_reference:
        providerReference,
    });
  }

  /**
   * ----------------------------------------------------------
   * STEP 7 — REFUNDED
   * ----------------------------------------------------------
   */
  if (
    providerStatus === 'refunded'
  ) {
    const refundClient =
      await pool.connect();

    try {
      await refundClient.query(
        'BEGIN'
      );

      const billAccount =
        await refundClient.query(
          `
          SELECT
            account_id,
            amount,
            status
          FROM bill_payments
          WHERE id = $1
          FOR UPDATE
          `,
          [localBillId]
        );

      if (
        billAccount.rows.length > 0 &&
        billAccount.rows[0].status ===
          'processing'
      ) {
        const refundAmount =
          Number(
            billAccount.rows[0].amount
          );

        await refundClient.query(
          `
          UPDATE accounts
          SET
            balance = balance + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          `,
          [
            refundAmount,
            billAccount.rows[0].account_id,
          ]
        );

        await refundClient.query(
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
            billAccount.rows[0].account_id,
            refundAmount,
            `REF-${transactionReference}`,
            `Electricity payment refund - ${normalizedProvider}`,
          ]
        );
      }

      await refundClient.query(
        `
        UPDATE bill_payments
        SET
          status = 'refunded',
          provider_reference = COALESCE($1, provider_reference),
          provider_response = $2,
          provider_response_message = $3
        WHERE id = $4
        `,
        [
          providerReference,
          JSON.stringify(
            purchaseResult
          ),
          providerMessage,
          localBillId,
        ]
      );

      await refundClient.query(
        `
        UPDATE transactions
        SET
          status = 'refunded'
        WHERE reference = $1
        `,
        [transactionReference]
      );

      await refundClient.query(
        'COMMIT'
      );

    } catch (refundError) {
      try {
        await refundClient.query(
          'ROLLBACK'
        );
      } catch (_) {}

      console.error(
        '❌ Electricity refund failed:',
        refundError
      );
    } finally {
      refundClient.release();
    }

    return res.status(200).json({
      success: true,
      status: 'refunded',
      message:
        'Electricity payment was refunded.',
      reference:
        transactionReference,
      provider_reference:
        providerReference,
    });
  }

  /**
   * ----------------------------------------------------------
   * STEP 8 — UNKNOWN PROVIDER RESPONSE
   * ----------------------------------------------------------
   */
  console.error(
    '⚠️ Unexpected Sogo electricity response:',
    JSON.stringify(
      purchaseResult,
      null,
      2
    )
  );

  await pool.query(
    `
    UPDATE bill_payments
    SET
      status = 'provider_response_unrecognized',
      provider_reference = COALESCE($1, provider_reference),
      provider_response = $2,
      provider_response_message = $3
    WHERE id = $4
    `,
    [
      providerReference,
      JSON.stringify(
        purchaseResult
      ),
      providerMessage,
      localBillId,
    ]
  );

  return res.status(502).json({
    success: false,
    status:
      'provider_response_unrecognized',
    message:
      'The electricity provider returned an unexpected response. Please do not submit the payment again while we verify the transaction.',
    reference:
      transactionReference,
    provider_reference:
      providerReference,
  });
};

module.exports = {
  purchaseElectricity,
};
