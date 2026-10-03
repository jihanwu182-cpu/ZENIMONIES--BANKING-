const crypto = require('crypto');
const axios = require('axios');
const pool = require('../config/database');

/**
 * ============================================================
 * ZENIMONIES — SOGO WEBHOOK CONTROLLER
 * Version: 2026-10-03-v3
 *
 * Handles:
 * - transaction.completed
 * - transaction.processing
 * - transaction.failed
 * - transaction.cancelled
 * - transaction.refunded
 *
 * Electricity:
 * - Saves electricity token when available
 * - Saves electricity units/kWh when available
 * - In LIVE mode, retrieves the completed transaction from
 *   Sogo when sensitive delivery data is omitted from webhook
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
 * EXTRACT PROVIDER REFERENCE
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
 * EXTRACT PROVIDER MESSAGE
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
 * EXTRACT STATUS
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
 * LIVE TRANSACTION LOOKUP
 * ============================================================
 *
 * Sogo documents that sensitive electricity tokens are omitted
 * from webhook payloads and should be retrieved from the
 * transaction lookup endpoint.
 *
 * IMPORTANT:
 * Sandbox transactions are not persisted and lookup returns
 * 404, so this is ONLY attempted against a non-sandbox base URL.
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
      .includes('sandbox.sogo.africa');

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
     * 8. REFERENCE
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
     * 9. MESSAGE
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
     * 10. TOKEN + UNITS FROM WEBHOOK
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

    console.log(
      '📌 Electricity token:',
      electricityToken
        ? '[PRESENT]'
        : '[NOT PRESENT]'
    );

    console.log(
      '📌 Electricity units:',
      units ||
        '[NOT PRESENT]'
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
     */

    const billResult =
      await pool.query(
        `
        SELECT
          id,
          account_id,
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

    console.log(
      '✅ Local bill payment found:',
      bill.id
    );

    /**
     * --------------------------------------------------------
     * 14. COMPLETED
     * --------------------------------------------------------
     */

    if (
      event ===
        'transaction.completed' ||
      normalizedStatus ===
        'completed'
    ) {
      console.log(
        '🎉 SOGO TRANSACTION COMPLETED'
      );

      /**
       * ------------------------------------------------------
       * IMPORTANT:
       *
       * Sogo's webhook may intentionally omit sensitive
       * electricity token data.
       *
       * In LIVE mode, retrieve the completed transaction.
       * ------------------------------------------------------
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

      /**
       * ------------------------------------------------------
       * SAVE COMPLETED PAYMENT
       * ------------------------------------------------------
       */

      const updateResult =
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

          RETURNING
            id,
            status,
            electricity_token,
            units
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

      /**
       * ------------------------------------------------------
       * UPDATE MAIN TRANSACTION
       * ------------------------------------------------------
       */

      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'completed'
        WHERE reference = (
          SELECT reference
          FROM bill_payments
          WHERE id = $1
        )
        `,
        [bill.id]
      );

      console.log(
        '✅ Local electricity payment marked completed'
      );

      console.log(
        '🎟️ Token saved:',
        updateResult.rows[0]
          ?.electricity_token
          ? 'YES'
          : 'NO'
      );

      console.log(
        '⚡ Units saved:',
        updateResult.rows[0]
          ?.units || 'NO'
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook processed successfully',
      });
    }

    /**
     * --------------------------------------------------------
     * 15. PROCESSING
     * --------------------------------------------------------
     */

    if (
      event ===
        'transaction.processing' ||
      normalizedStatus ===
        'processing' ||
      normalizedStatus ===
        'pending'
    ) {
      console.log(
        '⏳ Sogo transaction still processing'
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
          'Transaction still processing',
      });
    }

    /**
     * --------------------------------------------------------
     * 16. FAILED
     * --------------------------------------------------------
     */

    if (
      event ===
        'transaction.failed' ||
      normalizedStatus ===
        'failed'
    ) {
      console.log(
        '❌ Sogo transaction failed'
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
        WHERE reference = (
          SELECT reference
          FROM bill_payments
          WHERE id = $1
        )
        `,
        [bill.id]
      );

      return res.status(200).json({
        success: true,
        message:
          'Failed transaction recorded',
      });
    }

    /**
     * --------------------------------------------------------
     * 17. CANCELLED
     * --------------------------------------------------------
     */

    if (
      event ===
        'transaction.cancelled' ||
      normalizedStatus ===
        'cancelled'
    ) {
      console.log(
        '🚫 Sogo transaction cancelled'
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
        WHERE reference = (
          SELECT reference
          FROM bill_payments
          WHERE id = $1
        )
        `,
        [bill.id]
      );

      return res.status(200).json({
        success: true,
        message:
          'Cancelled transaction recorded',
      });
    }

    /**
     * --------------------------------------------------------
     * 18. REFUNDED
     * --------------------------------------------------------
     */

    if (
      event ===
        'transaction.refunded' ||
      normalizedStatus ===
        'refunded'
    ) {
      console.log(
        '↩️ Sogo transaction refunded'
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
        WHERE reference = (
          SELECT reference
          FROM bill_payments
          WHERE id = $1
        )
        `,
        [bill.id]
      );

      return res.status(200).json({
        success: true,
        message:
          'Refunded transaction recorded',
      });
    }

    /**
     * --------------------------------------------------------
     * 19. UNKNOWN STATUS
     * --------------------------------------------------------
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
