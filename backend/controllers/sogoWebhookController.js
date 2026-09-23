const crypto = require('crypto');
const pool = require('../config/database');

/**
 * ============================================================
 * ZENIMONIES — SOGO WEBHOOK CONTROLLER
 * Version: 2026-09-23-v2
 *
 * Uses the existing bill_payments table.
 * Does NOT require provider_webhook_response.
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
 * Extract electricity token from different possible
 * Sogo response/webhook structures.
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
 * Verify Sogo webhook signature.
 *
 * Signature format:
 * sha256=<HMAC-SHA256>
 */
const verifySignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  const expectedSignature =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(String(signature));

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
};

/**
 * Main Sogo webhook handler.
 */
const handleSogoWebhook = async (req, res) => {
  const webhookSecret = process.env.SOGO_WEBHOOK_SECRET;

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
     * 1. CHECK WEBHOOK SECRET
     * --------------------------------------------------------
     */
    if (!webhookSecret) {
      console.error(
        '❌ SOGO_WEBHOOK_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message: 'Webhook secret is not configured',
      });
    }

    /**
     * --------------------------------------------------------
     * 2. GET RAW REQUEST BODY
     * --------------------------------------------------------
     *
     * server.js must use:
     *
     * express.raw({ type: 'application/json' })
     *
     * BEFORE express.json().
     */
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body || {})
        );

    /**
     * --------------------------------------------------------
     * 3. VERIFY SIGNATURE
     * --------------------------------------------------------
     */
    const signature =
      req.headers['x-sogo-signature-256'];

    const isValidSignature = verifySignature(
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
        message: 'Invalid webhook signature',
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
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (parseError) {
      console.error(
        '❌ Could not parse Sogo webhook JSON:',
        parseError.message
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid webhook JSON',
      });
    }

    /**
     * --------------------------------------------------------
     * 5. WEBHOOK INFORMATION
     * --------------------------------------------------------
     */
    const event =
      payload?.event ||
      req.headers['x-sogo-event'] ||
      '';

    const deliveryId =
      req.headers['x-sogo-delivery'] ||
      '';

    const timestamp =
      req.headers['x-sogo-timestamp'] ||
      '';

    console.log('📩 Sogo event:', event);
    console.log('📦 Delivery:', deliveryId);
    console.log('🕐 Timestamp:', timestamp);

    /**
     * --------------------------------------------------------
     * 6. FIND TRANSACTION DATA
     * --------------------------------------------------------
     */
    const eventData =
      payload?.data ||
      payload?.payload ||
      {};

    const transaction =
      eventData?.transaction ||
      eventData?.data ||
      eventData?.object ||
      eventData;

    /**
     * --------------------------------------------------------
     * 7. EXTRACT STATUS
     * --------------------------------------------------------
     */
    const rawStatus =
      transaction?.status ||
      eventData?.status ||
      payload?.status ||
      '';

    const providerStatus =
      typeof rawStatus === 'object'
        ? rawStatus?.value ||
          rawStatus?.status ||
          ''
        : rawStatus;

    const normalizedStatus =
      String(providerStatus || '')
        .trim()
        .toLowerCase();

    /**
     * --------------------------------------------------------
     * 8. PROVIDER REFERENCE
     * --------------------------------------------------------
     */
    const providerReference =
      firstValue(
        transaction?.reference,
        transaction?.provider_reference,
        transaction?.providerReference,

        eventData?.reference,
        eventData?.provider_reference,

        payload?.reference,
        payload?.provider_reference
      );

    /**
     * --------------------------------------------------------
     * 9. PROVIDER MESSAGE
     * --------------------------------------------------------
     */
    const providerMessage =
      firstValue(
        transaction?.message,
        transaction?.description,

        eventData?.message,
        eventData?.description,

        payload?.message,
        payload?.description
      );

    /**
     * --------------------------------------------------------
     * 10. TOKEN + UNITS
     * --------------------------------------------------------
     */
    const electricityToken =
      extractElectricityToken(payload);

    const units =
      extractUnits(payload);

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
      units || '[NOT PRESENT]'
    );

    /**
     * --------------------------------------------------------
     * 11. IGNORE EVENTS WE DON'T HANDLE
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
      !supportedEvents.includes(event)
    ) {
      console.log(
        'ℹ️ Unsupported Sogo event:',
        event
      );

      return res.status(200).json({
        success: true,
        message: 'Event received',
      });
    }

    /**
     * --------------------------------------------------------
     * 12. PROVIDER REFERENCE IS REQUIRED
     * --------------------------------------------------------
     */
    if (!providerReference) {
      console.warn(
        '⚠️ Sogo webhook has no provider reference'
      );

      return res.status(200).json({
        success: true,
        message: 'Webhook received without reference',
      });
    }

    /**
     * --------------------------------------------------------
     * 13. FIND LOCAL BILL PAYMENT
     * --------------------------------------------------------
     */
    const billResult = await pool.query(
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
      [providerReference]
    );

    if (billResult.rows.length === 0) {
      console.warn(
        '⚠️ No local bill payment found for provider reference:',
        providerReference
      );

      /**
       * We return 200 so Sogo does not repeatedly retry
       * the webhook forever.
       */
      return res.status(200).json({
        success: true,
        message: 'Webhook received; local transaction not found',
      });
    }

    const bill = billResult.rows[0];

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
      event === 'transaction.completed' ||
      normalizedStatus === 'completed'
    ) {
      console.log(
        '🎉 SOGO ELECTRICITY PAYMENT COMPLETED'
      );

      const updateResult = await pool.query(
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
          JSON.stringify(payload),
          providerMessage,
          electricityToken,
          units,
          bill.id,
        ]
      );

      /**
       * Update the corresponding transaction.
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
        '✅ Local bill payment marked completed'
      );

      console.log(
        '🎟️ Token saved:',
        updateResult.rows[0]?.electricity_token
          ? 'YES'
          : 'NO'
      );

      console.log(
        '⚡ Units saved:',
        updateResult.rows[0]?.units || 'NO'
      );

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    }

    /**
     * --------------------------------------------------------
     * 15. PROCESSING
     * --------------------------------------------------------
     */
    if (
      event === 'transaction.processing' ||
      normalizedStatus === 'processing' ||
      normalizedStatus === 'pending'
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
          JSON.stringify(payload),
          providerMessage,
          bill.id,
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Transaction still processing',
      });
    }

    /**
     * --------------------------------------------------------
     * 16. FAILED
     * --------------------------------------------------------
     */
    if (
      event === 'transaction.failed' ||
      normalizedStatus === 'failed'
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
          JSON.stringify(payload),
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
        message: 'Failed transaction recorded',
      });
    }

    /**
     * --------------------------------------------------------
     * 17. CANCELLED
     * --------------------------------------------------------
     */
    if (
      event === 'transaction.cancelled' ||
      normalizedStatus === 'cancelled'
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
          JSON.stringify(payload),
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
        message: 'Cancelled transaction recorded',
      });
    }

    /**
     * --------------------------------------------------------
     * 18. REFUNDED
     * --------------------------------------------------------
     *
     * We only update the status here.
     *
     * The electricity controller already handles local
     * balance refunds when Sogo immediately reports a
     * refunded result.
     *
     * This prevents double-refunding the customer.
     */
    if (
      event === 'transaction.refunded' ||
      normalizedStatus === 'refunded'
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
          JSON.stringify(payload),
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
        message: 'Refunded transaction recorded',
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
        JSON.stringify(payload),
        providerMessage,
        bill.id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });

  } catch (error) {
    console.error(
      '❌ SOGO WEBHOOK ERROR:',
      error
    );

    /**
     * Returning 500 allows Sogo to retry when the error
     * is genuinely server-side.
     */
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

module.exports = {
  handleSogoWebhook,
};
