const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// SOGO WEBHOOK CONTROLLER
// ============================================================
//
// Receives Sogo webhook events and updates Zenimonies
// electricity bill payments.
//
// IMPORTANT:
// The route must use express.raw() BEFORE express.json()
// so that Sogo's signature can be verified against the
// original request body.
// ============================================================


// ============================================================
// VERIFY SOGO SIGNATURE
// ============================================================

const verifySogoSignature = (req) => {
  const webhookSecret =
    process.env.SOGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      'SOGO_WEBHOOK_SECRET is not configured.'
    );

    return false;
  }

  const signature =
    req.headers['x-sogo-signature-256'];

  if (!signature) {
    console.error(
      'Missing X-Sogo-Signature-256 header.'
    );

    return false;
  }

  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    console.error(
      'Sogo webhook body is not a raw Buffer.'
    );

    return false;
  }

  const expectedSignature =
    `sha256=${crypto
      .createHmac(
        'sha256',
        webhookSecret
      )
      .update(rawBody)
      .digest('hex')}`;

  const receivedBuffer =
    Buffer.from(signature);

  const expectedBuffer =
    Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
};


// ============================================================
// SAFE VALUE HELPER
// ============================================================

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


// ============================================================
// SOGO WEBHOOK HANDLER
// ============================================================

const handleSogoWebhook = async (
  req,
  res
) => {
  try {
    // ========================================================
    // VERIFY SIGNATURE
    // ========================================================

    const signatureValid =
      verifySogoSignature(req);

    if (!signatureValid) {
      console.error(
        'Invalid Sogo webhook signature.'
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid webhook signature.',
      });
    }


    // ========================================================
    // PARSE RAW BODY
    // ========================================================

    let payload;

    try {
      payload = JSON.parse(
        req.body.toString('utf8')
      );
    } catch (error) {
      console.error(
        'Unable to parse Sogo webhook body:',
        error
      );

      return res.status(400).json({
        success: false,
        message:
          'Invalid webhook payload.',
      });
    }


    // ========================================================
    // WEBHOOK HEADERS
    // ========================================================

    const eventHeader =
      req.headers['x-sogo-event'];

    const deliveryId =
      req.headers['x-sogo-delivery'];

    const timestamp =
      req.headers['x-sogo-timestamp'];


    console.log(
      '============================================================'
    );

    console.log(
      'SOGO WEBHOOK RECEIVED'
    );

    console.log(
      'Event:',
      eventHeader || payload.event || 'unknown'
    );

    console.log(
      'Delivery:',
      deliveryId || 'unknown'
    );

    console.log(
      'Timestamp:',
      timestamp || 'unknown'
    );

    console.log(
      '============================================================'
    );


    // ========================================================
    // EVENT
    // ========================================================

    const event =
      payload.event ||
      eventHeader ||
      null;


    // ========================================================
    // EVENT DATA
    // ========================================================

    const eventData =
      payload.data ||
      payload.payload ||
      {};


    // ========================================================
    // TRANSACTION OBJECT
    // ========================================================

    const transaction =
      eventData.transaction ||
      eventData.data ||
      eventData.object ||
      eventData;


    // ========================================================
    // STATUS
    // ========================================================

    const statusValue =
      transaction?.status?.value ||
      transaction?.status ||
      eventData?.status?.value ||
      eventData?.status ||
      payload?.status?.value ||
      payload?.status ||
      null;


    const normalizedStatus =
      String(
        statusValue || ''
      )
        .trim()
        .toLowerCase();


    // ========================================================
    // PROVIDER REFERENCE
    // ========================================================

    const providerReference =
      firstValue(
        transaction?.reference,
        transaction?.provider_reference,
        eventData?.reference,
        eventData?.provider_reference,
        payload?.reference,
        payload?.provider_reference,
        transaction?.id
      );


    // ========================================================
    // PROVIDER MESSAGE
    // ========================================================

    const providerMessage =
      firstValue(
        transaction?.message,
        eventData?.message,
        payload?.message
      );


    // ========================================================
    // ELECTRICITY TOKEN
    // ========================================================

    const electricityToken =
      firstValue(

        // Direct transaction fields
        transaction?.token,
        transaction?.electricity_token,
        transaction?.token_code,
        transaction?.prepaid_token,
        transaction?.prepaid_token_code,
        transaction?.pin,

        // Nested electricity object
        transaction?.electricity?.token,
        transaction?.electricity?.electricity_token,
        transaction?.electricity?.token_code,
        transaction?.electricity?.prepaid_token,
        transaction?.electricity?.prepaid_token_code,
        transaction?.electricity?.pin,

        // Event data
        eventData?.token,
        eventData?.electricity_token,
        eventData?.token_code,
        eventData?.prepaid_token,
        eventData?.prepaid_token_code,
        eventData?.pin,

        // Payload
        payload?.token,
        payload?.electricity_token,
        payload?.token_code,
        payload?.prepaid_token,
        payload?.prepaid_token_code,
        payload?.pin
      );


    // ========================================================
    // ELECTRICITY UNITS
    // ========================================================

    const units =
      firstValue(

        transaction?.units,
        transaction?.unit,
        transaction?.kwh,

        transaction?.electricity?.units,
        transaction?.electricity?.unit,
        transaction?.electricity?.kwh,

        eventData?.units,
        eventData?.unit,
        eventData?.kwh,

        payload?.units,
        payload?.unit,
        payload?.kwh
      );


    // ========================================================
    // LOG IMPORTANT DATA
    // ========================================================

    console.log(
      'Sogo event:',
      event
    );

    console.log(
      'Sogo provider reference:',
      providerReference
    );

    console.log(
      'Sogo status:',
      normalizedStatus
    );

    console.log(
      'Electricity token present:',
      Boolean(electricityToken)
    );

    console.log(
      'Electricity units:',
      units
    );


    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (!event) {
      console.error(
        'Sogo webhook event is missing.'
      );

      return res.status(400).json({
        success: false,
        message:
          'Webhook event is missing.',
      });
    }


    // ========================================================
    // WE ONLY PROCESS BILL PAYMENTS
    // ========================================================

    const transactionType =
      firstValue(
        transaction?.type,
        eventData?.type,
        payload?.type
      );

    if (
      transactionType &&
      transactionType !== 'bill_payment'
    ) {
      console.log(
        'Ignoring non-bill-payment Sogo webhook:',
        transactionType
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook received and ignored.',
      });
    }


    // ========================================================
    // PROVIDER REFERENCE REQUIRED
    // ========================================================

    if (!providerReference) {
      console.error(
        'Sogo webhook does not contain a provider reference.'
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook received but no transaction reference was available.',
      });
    }


    // ========================================================
    // FIND LOCAL BILL PAYMENT
    // ========================================================

    const billResult =
      await pool.query(
        `
          SELECT
            id,
            account_id,
            reference,
            provider_reference,
            status,
            category
          FROM bill_payments
          WHERE
            provider_reference = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          providerReference,
        ]
      );


    if (
      billResult.rows.length === 0
    ) {
      console.warn(
        'No local bill payment found for Sogo provider reference:',
        providerReference
      );

      // Return 200 so Sogo does not repeatedly retry
      // a webhook for a transaction that Zenimonies
      // does not currently know about.

      return res.status(200).json({
        success: true,
        message:
          'Webhook received. No matching local transaction found.',
      });
    }


    const billPayment =
      billResult.rows[0];


    // ========================================================
    // UPDATE COMPLETED PAYMENT
    // ========================================================

    if (
      event === 'transaction.completed' ||
      normalizedStatus === 'completed'
    ) {

      console.log(
        'Processing completed Sogo bill payment:',
        billPayment.reference
      );


      await pool.query(
        `
          UPDATE bill_payments
          SET
            status = 'completed',

            provider_reference = COALESCE(
              provider_reference,
              $1
            ),

            provider_response = $2,

            provider_response_message =
              COALESCE(
                $3,
                provider_response_message
              ),

            electricity_token =
              COALESCE(
                $4,
                electricity_token
              ),

            units =
              COALESCE(
                $5,
                units
              ),

            completed_at =
              COALESCE(
                completed_at,
                CURRENT_TIMESTAMP
              )

          WHERE id = $6
        `,
        [
          providerReference,
          payload,
          providerMessage,
          electricityToken,
          units,
          billPayment.id,
        ]
      );


      // ======================================================
      // UPDATE TRANSACTION HISTORY
      // ======================================================

      await pool.query(
        `
          UPDATE transactions
          SET
            status = 'completed'
          WHERE
            reference = $1
            AND status IN (
              'processing',
              'pending',
              'provider_response_unrecognized'
            )
        `,
        [
          billPayment.reference,
        ]
      );


      console.log(
        '✅ Sogo completed payment updated successfully.'
      );

      console.log(
        'Zenimonies reference:',
        billPayment.reference
      );

      console.log(
        'Electricity token saved:',
        Boolean(electricityToken)
      );

      console.log(
        'Electricity units saved:',
        units
      );


      return res.status(200).json({
        success: true,
        message:
          'Sogo completed webhook processed.',
      });
    }


    // ========================================================
    // PROCESSING
    // ========================================================

    if (
      event === 'transaction.processing' ||
      normalizedStatus === 'processing' ||
      normalizedStatus === 'pending'
    ) {

      await pool.query(
        `
          UPDATE bill_payments
          SET
            status = 'processing',
            provider_response = $1,
            provider_response_message =
              COALESCE(
                $2,
                provider_response_message
              )
          WHERE id = $3
        `,
        [
          payload,
          providerMessage,
          billPayment.id,
        ]
      );


      await pool.query(
        `
          UPDATE transactions
          SET
            status = 'processing'
          WHERE
            reference = $1
        `,
        [
          billPayment.reference,
        ]
      );


      console.log(
        'Sogo electricity payment remains processing:',
        billPayment.reference
      );


      return res.status(200).json({
        success: true,
        message:
          'Sogo processing webhook received.',
      });
    }


    // ========================================================
    // FAILED
    // ========================================================

    if (
      event === 'transaction.failed' ||
      normalizedStatus === 'failed'
    ) {

      await pool.query(
        `
          UPDATE bill_payments
          SET
            status = 'failed',
            provider_response = $1,
            provider_response_message =
              COALESCE(
                $2,
                provider_response_message
              ),
            failure_reason =
              COALESCE(
                $2,
                failure_reason
              )
          WHERE id = $3
        `,
        [
          payload,
          providerMessage,
          billPayment.id,
        ]
      );


      await pool.query(
        `
          UPDATE transactions
          SET
            status = 'failed'
          WHERE
            reference = $1
            AND status IN (
              'processing',
              'pending'
            )
        `,
        [
          billPayment.reference,
        ]
      );


      console.log(
        'Sogo failed transaction recorded:',
        billPayment.reference
      );


      return res.status(200).json({
        success: true,
        message:
          'Sogo failed webhook processed.',
      });
    }


    // ========================================================
    // CANCELLED
    // ========================================================

    if (
      event === 'transaction.cancelled' ||
      normalizedStatus === 'cancelled'
    ) {

      await pool.query(
        `
          UPDATE bill_payments
          SET
            status = 'cancelled',
            provider_response = $1,
            provider_response_message =
              COALESCE(
                $2,
                provider_response_message
              )
          WHERE id = $3
        `,
        [
          payload,
          providerMessage,
          billPayment.id,
        ]
      );


      await pool.query(
        `
          UPDATE transactions
          SET
            status = 'cancelled'
          WHERE
            reference = $1
            AND status IN (
              'processing',
              'pending'
            )
        `,
        [
          billPayment.reference,
        ]
      );


      console.log(
        'Sogo cancelled transaction recorded:',
        billPayment.reference
      );


      return res.status(200).json({
        success: true,
        message:
          'Sogo cancelled webhook processed.',
      });
    }


    // ========================================================
    // REFUNDED
    // ========================================================
    //
    // IMPORTANT:
    // We only update the status here.
    //
    // We do NOT add money back to the customer's account
    // from the webhook because the existing electricity
    // controller already handles refunds for synchronous
    // failed/refunded responses.
    //
    // This prevents duplicate refunds if Sogo sends both
    // the purchase response and a refund webhook.
    // ========================================================

    if (
      event === 'transaction.refunded' ||
      normalizedStatus === 'refunded'
    ) {

      await pool.query(
        `
          UPDATE bill_payments
          SET
            status = 'refunded',
            provider_response = $1,
            provider_response_message =
              COALESCE(
                $2,
                provider_response_message
              ),
            completed_at =
              COALESCE(
                completed_at,
                CURRENT_TIMESTAMP
              )
          WHERE id = $3
        `,
        [
          payload,
          providerMessage,
          billPayment.id,
        ]
      );


      await pool.query(
        `
          UPDATE transactions
          SET
            status = 'refunded'
          WHERE
            reference = $1
        `,
        [
          billPayment.reference,
        ]
      );


      console.log(
        'Sogo refunded transaction recorded:',
        billPayment.reference
      );


      return res.status(200).json({
        success: true,
        message:
          'Sogo refunded webhook processed.',
      });
    }


    // ========================================================
    // UNKNOWN EVENT
    // ========================================================

    console.log(
      'Sogo webhook received with an unhandled event:',
      event
    );


    return res.status(200).json({
      success: true,
      message:
        'Sogo webhook received.',
    });

  } catch (error) {

    console.error(
      '============================================================'
    );

    console.error(
      'SOGO WEBHOOK ERROR:',
      error
    );

    console.error(
      '============================================================'
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to process Sogo webhook.',
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  handleSogoWebhook,
};
