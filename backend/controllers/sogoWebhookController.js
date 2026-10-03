const crypto = require('crypto');
const axios = require('axios');
const pool = require('../config/database');

/**
 * ============================================================
 * ZENIMONIES — SOGO WEBHOOK CONTROLLER
 * Version: 2026-10-03-v4
 *
 * Handles:
 * - transaction.completed
 * - transaction.processing
 * - transaction.failed
 * - transaction.cancelled
 * - transaction.refunded
 *
 * Supports:
 * - Electricity
 * - Betting
 *
 * ELECTRICITY:
 * - Saves electricity token when available
 * - Saves electricity units/kWh when available
 * - Retrieves completed transaction in LIVE mode when
 *   sensitive delivery information is omitted
 *
 * BETTING:
 * - Marks funding completed when Sogo completes it
 * - Keeps processing transactions processing
 * - Automatically refunds failed/cancelled/refunded funding
 * - Prevents duplicate refunds
 *
 * IMPORTANT:
 * Sandbox transactions are not persisted by Sogo.
 * Therefore transaction lookup is NOT attempted in sandbox.
 * ============================================================
 */

const SOGO_API_BASE_URL =
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1';

const SOGO_API_KEY =
  process.env.SOGO_API_KEY;

/**
 * ============================================================
 * GENERIC HELPER
 * ============================================================
 */

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
 * ============================================================
 * ELECTRICITY TOKEN
 * ============================================================
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

    payload?.data?.delivery?.token,
    payload?.data?.delivery?.electricity_token,
    payload?.data?.delivery?.token_code,
    payload?.data?.delivery?.prepaid_token,

    payload?.data?.metadata?.token,
    payload?.data?.metadata?.electricity_token,

    payload?.transaction?.token,
    payload?.transaction?.electricity_token,
    payload?.transaction?.token_code,
    payload?.transaction?.prepaid_token,
    payload?.transaction?.pin,

    payload?.transaction?.details?.token,
    payload?.transaction?.details?.electricity_token,

    payload?.transaction?.receipt?.token,
    payload?.transaction?.receipt?.electricity_token,

    payload?.transaction?.delivery?.token,
    payload?.transaction?.delivery?.electricity_token,
    payload?.transaction?.delivery?.token_code,
    payload?.transaction?.delivery?.prepaid_token,

    payload?.transaction?.metadata?.token,
    payload?.transaction?.metadata?.electricity_token,

    payload?.object?.token,
    payload?.object?.electricity_token,

    payload?.metadata?.token,
    payload?.metadata?.electricity_token
  );
};

/**
 * ============================================================
 * ELECTRICITY UNITS / KWH
 * ============================================================
 */

const extractUnits = (payload) => {
  return firstValue(
    payload?.units,
    payload?.unit,
    payload?.kwh,
    payload?.kilowatt_hours,

    payload?.data?.units,
    payload?.data?.unit,
    payload?.data?.kwh,
    payload?.data?.kilowatt_hours,

    payload?.data?.details?.units,
    payload?.data?.details?.unit,
    payload?.data?.details?.kwh,
    payload?.data?.details?.kilowatt_hours,

    payload?.data?.receipt?.units,
    payload?.data?.receipt?.unit,
    payload?.data?.receipt?.kwh,

    payload?.data?.delivery?.units,
    payload?.data?.delivery?.unit,
    payload?.data?.delivery?.kwh,

    payload?.transaction?.units,
    payload?.transaction?.unit,
    payload?.transaction?.kwh,
    payload?.transaction?.kilowatt_hours,

    payload?.transaction?.details?.units,
    payload?.transaction?.details?.unit,
    payload?.transaction?.details?.kwh,

    payload?.transaction?.receipt?.units,
    payload?.transaction?.receipt?.unit,
    payload?.transaction?.receipt?.kwh,

    payload?.transaction?.delivery?.units,
    payload?.transaction?.delivery?.unit,
    payload?.transaction?.delivery?.kwh,

    payload?.object?.units,
    payload?.object?.unit,
    payload?.object?.kwh,

    payload?.metadata?.units,
    payload?.metadata?.unit,
    payload?.metadata?.kwh
  );
};

/**
 * ============================================================
 * SIGNATURE VERIFICATION
 * ============================================================
 */

const verifySignature = (
  rawBody,
  signature,
  secret
) => {
  if (
    !rawBody ||
    !signature ||
    !secret
  ) {
    return false;
  }

  const expectedSignature =
    'sha256=' +
    crypto
      .createHmac(
        'sha256',
        secret
      )
      .update(rawBody)
      .digest('hex');

  const expectedBuffer =
    Buffer.from(
      expectedSignature
    );

  const receivedBuffer =
    Buffer.from(
      String(signature)
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
};

/**
 * ============================================================
 * EXTRACT TRANSACTION OBJECT
 * ============================================================
 */

const extractTransaction = (
  payload
) => {
  const eventData =
    payload?.data ||
    payload?.payload ||
    {};

  return (
    eventData?.transaction ||
    eventData?.data ||
    eventData?.object ||
    eventData
  );
};

/**
 * ============================================================
 * PROVIDER REFERENCE
 * ============================================================
 */

const extractProviderReference = (
  transaction,
  eventData,
  payload
) => {
  return firstValue(
    transaction?.reference,
    transaction?.provider_reference,
    transaction?.providerReference,

    eventData?.reference,
    eventData?.provider_reference,
    eventData?.providerReference,

    payload?.reference,
    payload?.provider_reference,
    payload?.providerReference
  );
};

/**
 * ============================================================
 * PROVIDER MESSAGE
 * ============================================================
 */

const extractProviderMessage = (
  transaction,
  eventData,
  payload
) => {
  return firstValue(
    transaction?.message,
    transaction?.description,

    eventData?.message,
    eventData?.description,

    payload?.message,
    payload?.description
  );
};

/**
 * ============================================================
 * PROVIDER STATUS
 * ============================================================
 */

const extractProviderStatus = (
  transaction,
  eventData,
  payload
) => {
  const rawStatus =
    firstValue(
      transaction?.status,
      eventData?.status,
      payload?.status
    );

  if (
    rawStatus &&
    typeof rawStatus === 'object'
  ) {
    return String(
      firstValue(
        rawStatus?.value,
        rawStatus?.status
      ) || ''
    )
      .trim()
      .toLowerCase();
  }

  return String(
    rawStatus || ''
  )
    .trim()
    .toLowerCase();
};

/**
 * ============================================================
 * LIVE SOGO TRANSACTION LOOKUP
 * ============================================================
 */

const fetchSogoTransaction = async (
  reference
) => {
  if (
    !reference ||
    !SOGO_API_KEY
  ) {
    return null;
  }

  const isSandbox =
    SOGO_API_BASE_URL
      .toLowerCase()
      .includes(
        'sandbox.sogo.africa'
      );

  if (isSandbox) {
    console.log(
      'ℹ️ Sogo sandbox detected — transaction lookup skipped because sandbox transactions are not persisted.'
    );

    return null;
  }

  try {
    console.log(
      '🔎 Fetching completed Sogo transaction:',
      reference
    );

    const response =
      await axios.get(
        `${SOGO_API_BASE_URL}/transactions/${encodeURIComponent(
          reference
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${SOGO_API_KEY}`,
            Accept:
              'application/json',
          },
          timeout: 30000,
        }
      );

    console.log(
      '✅ Sogo transaction lookup successful'
    );

    return (
      response?.data ||
      null
    );
  } catch (error) {
    console.error(
      '⚠️ Sogo transaction lookup failed:',
      error?.response?.data ||
        error?.message
    );

    return null;
  }
};

/**
 * ============================================================
 * MAIN WEBHOOK
 * ============================================================
 */

const handleSogoWebhook = async (
  req,
  res
) => {
  const webhookSecret =
    process.env.SOGO_WEBHOOK_SECRET;

  try {
    console.log(
      '============================================================'
    );

    console.log(
      '🔥 ZENIMONIES SOGO WEBHOOK RECEIVED'
    );

    console.log(
      '============================================================'
    );

    /**
     * --------------------------------------------------------
     * 1. WEBHOOK SECRET
     * --------------------------------------------------------
     */

    if (!webhookSecret) {
      console.error(
        '❌ SOGO_WEBHOOK_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message:
          'Webhook secret is not configured',
      });
    }

    /**
     * --------------------------------------------------------
     * 2. RAW BODY
     * --------------------------------------------------------
     */

    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(
            typeof req.body ===
              'string'
              ? req.body
              : JSON.stringify(
                  req.body || {}
                )
          );

    /**
     * --------------------------------------------------------
     * 3. SIGNATURE
     * --------------------------------------------------------
     */

    const signature =
      req.headers[
        'x-sogo-signature-256'
      ];

    const isValidSignature =
      verifySignature(
        rawBody,
        signature,
        webhookSecret
      );

    if (!isValidSignature) {
      console.error(
        '❌ INVALID SOGO WEBHOOK SIGNATURE'
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid webhook signature',
      });
    }

    console.log(
      '✅ Sogo webhook signature verified'
    );

    /**
     * --------------------------------------------------------
     * 4. PARSE PAYLOAD
     * --------------------------------------------------------
     */

    let payload;

    try {
      payload =
        JSON.parse(
          rawBody.toString(
            'utf8'
          )
        );
    } catch (error) {
      console.error(
        '❌ Invalid Sogo webhook JSON:',
        error?.message
      );

      return res.status(400).json({
        success: false,
        message:
          'Invalid webhook JSON',
      });
    }

    /**
     * --------------------------------------------------------
     * 5. WEBHOOK META
     * --------------------------------------------------------
     */

    const event =
      payload?.event ||
      req.headers[
        'x-sogo-event'
      ] ||
      '';

    const deliveryId =
      req.headers[
        'x-sogo-delivery'
      ] ||
      '';

    const timestamp =
      req.headers[
        'x-sogo-timestamp'
      ] ||
      '';

    console.log(
      '📩 Sogo event:',
      event
    );

    console.log(
      '📦 Delivery:',
      deliveryId
    );

    console.log(
      '🕐 Timestamp:',
      timestamp
    );

    /**
     * --------------------------------------------------------
     * 6. EVENT DATA
     * --------------------------------------------------------
     */

    const eventData =
      payload?.data ||
      payload?.payload ||
      {};

    const transaction =
      extractTransaction(
        payload
      );

    /**
     * --------------------------------------------------------
     * 7. STATUS
     * --------------------------------------------------------
     */

    const normalizedStatus =
      extractProviderStatus(
        transaction,
        eventData,
        payload
      );

    /**
     * --------------------------------------------------------
     * 8. PROVIDER REFERENCE
     * --------------------------------------------------------
     */

    const providerReference =
      extractProviderReference(
        transaction,
        eventData,
        payload
      );

    /**
     * --------------------------------------------------------
     * 9. PROVIDER MESSAGE
     * --------------------------------------------------------
     */

    const providerMessage =
      extractProviderMessage(
        transaction,
        eventData,
        payload
      );

    /**
     * --------------------------------------------------------
     * 10. ELECTRICITY DATA
     * --------------------------------------------------------
     */

    let electricityToken =
      extractElectricityToken(
        payload
      );

    let units =
      extractUnits(
        payload
      );

    console.log(
      '📌 Provider reference:',
      providerReference
    );

    console.log(
      '📌 Provider status:',
      normalizedStatus
    );

    /**
     * --------------------------------------------------------
     * 11. SUPPORTED EVENTS
     * --------------------------------------------------------
     */

    const supportedEvents = [
      'transaction.completed',
      'transaction.processing',
      'transaction.failed',
      'transaction.cancelled',
      'transaction.refunded',
    ];

    if (
      event &&
      !supportedEvents.includes(
        event
      )
    ) {
      console.log(
        'ℹ️ Unsupported Sogo event:',
        event
      );

      return res.status(200).json({
        success: true,
        message:
          'Event received',
      });
    }

    /**
     * --------------------------------------------------------
     * 12. REFERENCE REQUIRED
     * --------------------------------------------------------
     */

    if (!providerReference) {
      console.warn(
        '⚠️ Sogo webhook has no provider reference'
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook received without reference',
      });
    }

    /**
     * --------------------------------------------------------
     * 13. FIND LOCAL PAYMENT
     * --------------------------------------------------------
     *
     * We include category so Betting and Electricity can be
     * handled differently without affecting each other.
     */

    const billResult =
      await pool.query(
        `
        SELECT
          id,
          account_id,
          category,
          amount,
          reference,
          status,
          provider_reference,
          provider_response,
          electricity_token,
          units
        FROM bill_payments
        WHERE provider_reference = $1
        LIMIT 1
        `,
        [
          providerReference,
        ]
      );

    if (
      billResult.rows.length ===
      0
    ) {
      console.warn(
        '⚠️ No local bill payment found for provider reference:',
        providerReference
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook received; local transaction not found',
      });
    }

    const bill =
      billResult.rows[0];

    const isBetting =
      String(
        bill.category || ''
      ).toLowerCase() ===
      'betting';

    const isElectricity =
      String(
        bill.category || ''
      ).toLowerCase() ===
      'electricity';

    console.log(
      '✅ Local bill payment found:',
      bill.id
    );

    console.log(
      '📂 Bill category:',
      bill.category
    );

    /**
     * ========================================================
     * BETTING — COMPLETED
     * ========================================================
     */

    if (
      isBetting &&
      (
        event ===
          'transaction.completed' ||
        normalizedStatus ===
          'completed'
      )
    ) {
      console.log(
        '🎉 BETTING FUNDING COMPLETED'
      );

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'completed',
          provider_response = $1,
          provider_response_message = $2,
          completed_at =
            COALESCE(
              completed_at,
              CURRENT_TIMESTAMP
            )
        WHERE id = $3
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          bill.id,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
        `,
        [
          bill.reference,
        ]
      );

      console.log(
        '✅ Betting transaction marked completed'
      );

      return res.status(200).json({
        success: true,
        message:
          'Betting transaction completed',
      });
    }

    /**
     * ========================================================
     * BETTING — PROCESSING
     * ========================================================
     */

    if (
      isBetting &&
      (
        event ===
          'transaction.processing' ||
        normalizedStatus ===
          'processing' ||
        normalizedStatus ===
          'pending'
      )
    ) {
      console.log(
        '⏳ BETTING FUNDING STILL PROCESSING'
      );

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'processing',
          provider_response = $1,
          provider_response_message = $2
        WHERE id = $3
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          bill.id,
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          'Betting transaction still processing',
      });
    }

    /**
     * ========================================================
     * BETTING — FAILED / CANCELLED / REFUNDED
     * ========================================================
     *
     * Money is refunded here.
     *
     * The refund is protected by checking the existing local
     * status inside a database transaction.
     *
     * Only a locally "processing" betting payment can trigger
     * the automatic refund.
     *
     * This prevents duplicate refunds if Sogo retries the same
     * webhook.
     */

    if (
      isBetting &&
      (
        event ===
          'transaction.failed' ||
        event ===
          'transaction.cancelled' ||
        event ===
          'transaction.refunded' ||
        normalizedStatus ===
          'failed' ||
        normalizedStatus ===
          'cancelled' ||
        normalizedStatus ===
          'refunded'
      )
    ) {
      console.log(
        '↩️ BETTING FUNDING REQUIRES REFUND'
      );

      const client =
        await pool.connect();

      try {
        await client.query(
          'BEGIN'
        );

        /**
         * ------------------------------------------------------
         * Lock the bill payment.
         * ------------------------------------------------------
         */

        const lockedBillResult =
          await client.query(
            `
            SELECT
              id,
              account_id,
              amount,
              reference,
              category,
              status
            FROM bill_payments
            WHERE id = $1
            FOR UPDATE
            `,
            [
              bill.id,
            ]
          );

        if (
          lockedBillResult.rows.length ===
          0
        ) {
          await client.query(
            'ROLLBACK'
          );

          return res.status(200).json({
            success: true,
            message:
              'Betting payment no longer exists',
          });
        }

        const lockedBill =
          lockedBillResult.rows[0];

        /**
         * ------------------------------------------------------
         * If it has already been refunded, do nothing.
         * ------------------------------------------------------
         */

        if (
          lockedBill.status ===
            'refunded'
        ) {
          await client.query(
            'COMMIT'
          );

          console.log(
            'ℹ️ Betting refund already processed — duplicate webhook ignored'
          );

          return res.status(200).json({
            success: true,
            message:
              'Betting refund already processed',
          });
        }

        /**
         * ------------------------------------------------------
         * If it is already completed, do not blindly refund.
         *
         * A completed transaction must be handled through a
         * proper provider refund/reversal flow rather than
         * treating a later webhook as a fresh failure.
         * ------------------------------------------------------
         */

        if (
          lockedBill.status ===
            'completed'
        ) {
          await client.query(
            `
            UPDATE bill_payments
            SET
              provider_response = $1,
              provider_response_message = $2
            WHERE id = $3
            `,
            [
              JSON.stringify(
                payload
              ),
              providerMessage,
              lockedBill.id,
            ]
          );

          await client.query(
            'COMMIT'
          );

          console.warn(
            '⚠️ Betting payment was already completed; automatic duplicate refund was prevented.'
          );

          return res.status(200).json({
            success: true,
            message:
              'Completed betting payment preserved',
          });
        }

        /**
         * ------------------------------------------------------
         * Lock the customer's account.
         * ------------------------------------------------------
         */

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
              lockedBill.account_id,
            ]
          );

        if (
          accountResult.rows.length ===
          0
        ) {
          throw new Error(
            'Customer account not found during betting refund'
          );
        }

        const account =
          accountResult.rows[0];

        const refundAmount =
          Number(
            lockedBill.amount
          );

        const currentBalance =
          Number(
            account.balance
          );

        const newBalance =
          currentBalance +
          refundAmount;

        /**
         * ------------------------------------------------------
         * Refund the customer's main account.
         * ------------------------------------------------------
         */

        await client.query(
          `
          UPDATE accounts
          SET
            balance = $1
          WHERE id = $2
          `,
          [
            newBalance,
            lockedBill.account_id,
          ]
        );

        /**
         * ------------------------------------------------------
         * Create refund transaction.
         *
         * IMPORTANT:
         * This is an audit record and is never deleted.
         * ------------------------------------------------------
         */

        const refundReference =
          `ZBET-REFUND-${Date.now()}-${crypto
            .randomBytes(5)
            .toString('hex')
            .toUpperCase()}`;

        await client.query(
          `
          INSERT INTO transactions (
            account_id,
            type,
            amount,
            reference,
            description,
            status
          )
          VALUES (
            $1,
            'betting_refund',
            $2,
            $3,
            $4,
            'completed'
          )
          `,
          [
            lockedBill.account_id,
            refundAmount,
            refundReference,
            `Betting funding refund - ${lockedBill.reference}`,
          ]
        );

        /**
         * ------------------------------------------------------
         * Mark original payment refunded.
         * ------------------------------------------------------
         */

        await client.query(
          `
          UPDATE bill_payments
          SET
            status = 'refunded',
            provider_response = $1,
            provider_response_message = $2,
            completed_at =
              COALESCE(
                completed_at,
                CURRENT_TIMESTAMP
              )
          WHERE id = $3
          `,
          [
            JSON.stringify(
              payload
            ),
            providerMessage ||
              'Betting funding refunded by provider',
            lockedBill.id,
          ]
        );

        /**
         * ------------------------------------------------------
         * Mark original transaction refunded.
         * ------------------------------------------------------
         */

        await client.query(
          `
          UPDATE transactions
          SET
            status = 'refunded'
          WHERE reference = $1
          `,
          [
            lockedBill.reference,
          ]
        );

        await client.query(
          'COMMIT'
        );

        console.log(
          '💰 BETTING REFUND COMPLETED'
        );

        console.log(
          '💵 Refund amount:',
          refundAmount
        );

        console.log(
          '🧾 Refund reference:',
          refundReference
        );

        return res.status(200).json({
          success: true,
          message:
            'Betting transaction refunded successfully',
          refundReference,
        });
      } catch (error) {
        try {
          await client.query(
            'ROLLBACK'
          );
        } catch (_) {}

        console.error(
          '❌ BETTING REFUND ERROR:',
          error
        );

        throw error;
      } finally {
        client.release();
      }
    }

    /**
     * ========================================================
     * ELECTRICITY — COMPLETED
     * ========================================================
     */

    if (
      isElectricity &&
      (
        event ===
          'transaction.completed' ||
        normalizedStatus ===
          'completed'
      )
    ) {
      console.log(
        '🎉 ELECTRICITY TRANSACTION COMPLETED'
      );

      /**
       * Sogo may omit sensitive electricity delivery data
       * from the webhook.
       *
       * In LIVE mode, retrieve it from the transaction API.
       */

      if (
        !electricityToken ||
        !units
      ) {
        const fetchedTransaction =
          await fetchSogoTransaction(
            providerReference
          );

        if (
          fetchedTransaction
        ) {
          const fetchedToken =
            extractElectricityToken(
              fetchedTransaction
            );

          const fetchedUnits =
            extractUnits(
              fetchedTransaction
            );

          electricityToken =
            electricityToken ||
            fetchedToken;

          units =
            units ||
            fetchedUnits;

          console.log(
            '🔎 Retrieved token:',
            electricityToken
              ? '[PRESENT]'
              : '[NOT PRESENT]'
          );

          console.log(
            '🔎 Retrieved units:',
            units ||
              '[NOT PRESENT]'
          );
        }
      }

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'completed',

          provider_response =
            COALESCE(
              provider_response,
              $1
            ),

          provider_response_message =
            COALESCE(
              provider_response_message,
              $2
            ),

          electricity_token =
            COALESCE(
              electricity_token,
              $3
            ),

          units =
            COALESCE(
              units,
              $4
            ),

          completed_at =
            COALESCE(
              completed_at,
              CURRENT_TIMESTAMP
            )

        WHERE id = $5
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          electricityToken,
          units,
          bill.id,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = $1
        `,
        [
          bill.reference,
        ]
      );

      console.log(
        '✅ Local electricity payment marked completed'
      );

      return res.status(200).json({
        success: true,
        message:
          'Electricity transaction completed',
      });
    }

    /**
     * ========================================================
     * ELECTRICITY — PROCESSING
     * ========================================================
     */

    if (
      isElectricity &&
      (
        event ===
          'transaction.processing' ||
        normalizedStatus ===
          'processing' ||
        normalizedStatus ===
          'pending'
      )
    ) {
      console.log(
        '⏳ ELECTRICITY TRANSACTION STILL PROCESSING'
      );

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'processing',

          provider_response =
            COALESCE(
              provider_response,
              $1
            ),

          provider_response_message =
            COALESCE(
              provider_response_message,
              $2
            )

        WHERE id = $3
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          bill.id,
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          'Electricity transaction still processing',
      });
    }

    /**
     * ========================================================
     * ELECTRICITY — FAILED
     * ========================================================
     *
     * Electricity's existing purchase flow handles definitive
     * provider failures/refunds.
     *
     * We only record the webhook result here.
     * ========================================================
     */

    if (
      isElectricity &&
      (
        event ===
          'transaction.failed' ||
        normalizedStatus ===
          'failed'
      )
    ) {
      console.log(
        '❌ ELECTRICITY TRANSACTION FAILED'
      );

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'failed',

          provider_response =
            COALESCE(
              provider_response,
              $1
            ),

          provider_response_message =
            COALESCE(
              provider_response_message,
              $2
            )

        WHERE id = $3
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          bill.id,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'failed'
        WHERE reference = $1
        `,
        [
          bill.reference,
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          'Electricity failed transaction recorded',
      });
    }

    /**
     * ========================================================
     * ELECTRICITY — CANCELLED
     * ========================================================
     */

    if (
      isElectricity &&
      (
        event ===
          'transaction.cancelled' ||
        normalizedStatus ===
          'cancelled'
      )
    ) {
      console.log(
        '🚫 ELECTRICITY TRANSACTION CANCELLED'
      );

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'cancelled',

          provider_response =
            COALESCE(
              provider_response,
              $1
            ),

          provider_response_message =
            COALESCE(
              provider_response_message,
              $2
            )

        WHERE id = $3
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          bill.id,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'cancelled'
        WHERE reference = $1
        `,
        [
          bill.reference,
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          'Electricity cancelled transaction recorded',
      });
    }

    /**
     * ========================================================
     * ELECTRICITY — REFUNDED
     * ========================================================
     */

    if (
      isElectricity &&
      (
        event ===
          'transaction.refunded' ||
        normalizedStatus ===
          'refunded'
      )
    ) {
      console.log(
        '↩️ ELECTRICITY TRANSACTION REFUNDED'
      );

      await pool.query(
        `
        UPDATE bill_payments
        SET
          status = 'refunded',

          provider_response =
            COALESCE(
              provider_response,
              $1
            ),

          provider_response_message =
            COALESCE(
              provider_response_message,
              $2
            )

        WHERE id = $3
        `,
        [
          JSON.stringify(
            payload
          ),
          providerMessage,
          bill.id,
        ]
      );

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'refunded'
        WHERE reference = $1
        `,
        [
          bill.reference,
        ]
      );

      return res.status(200).json({
        success: true,
        message:
          'Electricity refunded transaction recorded',
      });
    }

    /**
     * ========================================================
     * UNKNOWN / FALLBACK
     * ========================================================
     */

    console.log(
      'ℹ️ Sogo webhook received with unhandled status:',
      normalizedStatus
    );

    await pool.query(
      `
      UPDATE bill_payments
      SET
        provider_response =
          COALESCE(
            provider_response,
            $1
          ),

        provider_response_message =
          COALESCE(
            provider_response_message,
            $2
          )

      WHERE id = $3
      `,
      [
        JSON.stringify(
          payload
        ),
        providerMessage,
        bill.id,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        'Webhook received',
    });

  } catch (error) {
    console.error(
      '❌ SOGO WEBHOOK ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Webhook processing failed',
    });
  }
};

module.exports = {
  handleSogoWebhook,
};
