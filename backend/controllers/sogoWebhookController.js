
const crypto = require('crypto');
const axios = require('axios');
const pool = require('../config/database');

const SOGO_API_BASE_URL =
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1';

const SOGO_API_KEY = process.env.SOGO_API_KEY;

// ============================================================
// HELPERS
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

const safeJson = (value) => JSON.stringify(value || {});

const isFinalStatus = (status) =>
  [
    'completed',
    'failed',
    'refunded',
    'cancelled',
  ].includes(
    String(status || '').toLowerCase()
  );

const normalizeStatus = (event, status) => {
  const value = String(status || '').toLowerCase();

  if (
    event === 'transaction.completed' ||
    [
      'completed',
      'success',
      'successful',
      'succeeded',
    ].includes(value)
  ) {
    return 'completed';
  }

  if (
    event === 'transaction.processing' ||
    [
      'processing',
      'pending',
      'initiated',
      'queued',
    ].includes(value)
  ) {
    return 'processing';
  }

  if (
    event === 'transaction.cancelled' ||
    ['cancelled', 'canceled'].includes(value)
  ) {
    return 'cancelled';
  }

  if (
    event === 'transaction.refunded' ||
    value === 'refunded'
  ) {
    return 'refunded';
  }

  if (
    event === 'transaction.failed' ||
    [
      'failed',
      'failure',
      'declined',
    ].includes(value)
  ) {
    return 'failed';
  }

  return value || 'unknown';
};

// ============================================================
// WEBHOOK PAYLOAD EXTRACTION
// ============================================================

const extractTransaction = (payload) => {
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

const extractProviderReference = (
  transaction,
  eventData,
  payload
) =>
  firstValue(
    transaction?.reference,
    transaction?.provider_reference,
    transaction?.providerReference,

    eventData?.reference,
    eventData?.provider_reference,
    eventData?.providerReference,

    payload?.reference,
    payload?.provider_reference,
    payload?.providerReference,

    transaction?.id,
    eventData?.id
  );

const extractIdempotencyKey = (
  transaction,
  eventData,
  payload
) =>
  firstValue(
    transaction?.idempotency_key,
    transaction?.idempotencyKey,

    eventData?.idempotency_key,
    eventData?.idempotencyKey,

    payload?.idempotency_key
  );

const extractProviderMessage = (
  transaction,
  eventData,
  payload
) =>
  firstValue(
    transaction?.message,
    transaction?.description,

    eventData?.message,
    eventData?.description,

    payload?.message,
    payload?.description
  );

const extractProviderStatus = (
  transaction,
  eventData,
  payload
) => {
  const rawStatus = firstValue(
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
        rawStatus.value,
        rawStatus.status
      ) || ''
    )
      .trim()
      .toLowerCase();
  }

  return String(rawStatus || '')
    .trim()
    .toLowerCase();
};

// ============================================================
// ELECTRICITY TOKEN / UNITS EXTRACTION
// ============================================================

const extractElectricityToken = (payload) => {
  const candidates = [
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
    payload?.data?.receipt?.token,
    payload?.data?.delivery?.token,
    payload?.data?.metadata?.token,

    payload?.transaction?.token,
    payload?.transaction?.electricity_token,
    payload?.transaction?.token_code,
    payload?.transaction?.prepaid_token,
    payload?.transaction?.pin,

    payload?.transaction?.details?.token,
    payload?.transaction?.receipt?.token,
    payload?.transaction?.delivery?.token,
    payload?.transaction?.metadata?.token,

    payload?.object?.token,
    payload?.object?.electricity_token,
    payload?.metadata?.token,
  ];

  return firstValue(...candidates);
};

const extractUnits = (payload) => {
  const candidates = [
    payload?.units,
    payload?.unit,
    payload?.kwh,
    payload?.kilowatt_hours,

    payload?.data?.units,
    payload?.data?.unit,
    payload?.data?.kwh,
    payload?.data?.kilowatt_hours,

    payload?.data?.details?.units,
    payload?.data?.receipt?.units,
    payload?.data?.delivery?.units,

    payload?.transaction?.units,
    payload?.transaction?.unit,
    payload?.transaction?.kwh,
    payload?.transaction?.kilowatt_hours,

    payload?.transaction?.details?.units,
    payload?.transaction?.receipt?.units,
    payload?.transaction?.delivery?.units,

    payload?.object?.units,
    payload?.object?.unit,
    payload?.object?.kwh,
    payload?.metadata?.units,
  ];

  return firstValue(...candidates);
};

// ============================================================
// SIGNATURE VERIFICATION
// ============================================================

const verifySignature = (
  rawBody,
  signature,
  secret
) => {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(String(signature));

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

// ============================================================
// LIVE SOGO TRANSACTION LOOKUP
// ============================================================

const fetchSogoTransaction = async (reference) => {
  if (!reference || !SOGO_API_KEY) {
    return null;
  }

  if (
    SOGO_API_BASE_URL
      .toLowerCase()
      .includes('sandbox.sogo.africa')
  ) {
    console.log(
      'Sogo sandbox: transaction lookup skipped.'
    );

    return null;
  }

  try {
    const response = await axios.get(
      `${SOGO_API_BASE_URL}/transactions/${encodeURIComponent(
        reference
      )}?type=bill_payment`,
      {
        headers: {
          Authorization: `Bearer ${SOGO_API_KEY}`,
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    );

    return response?.data || null;
  } catch (error) {
    console.error(
      'Sogo transaction lookup failed:',
      error?.response?.data || error?.message
    );

    return null;
  }
};

// ============================================================
// FIND AIRTIME / DATA TRANSACTION
// ============================================================

const findSeparateTransaction = async (
  idempotencyKey,
  reference
) => {
  if (idempotencyKey) {
    const airtime = await pool.query(
      `
      SELECT *
      FROM airtime_transactions
      WHERE provider_request_id = $1
      LIMIT 1
      `,
      [idempotencyKey]
    );

    if (airtime.rows.length) {
      return {
        kind: 'airtime',
        row: airtime.rows[0],
      };
    }

    const data = await pool.query(
      `
      SELECT *
      FROM data_transactions
      WHERE provider_request_id = $1
      LIMIT 1
      `,
      [idempotencyKey]
    );

    if (data.rows.length) {
      return {
        kind: 'data',
        row: data.rows[0],
      };
    }
  }

  // Legacy fallback: match the Sogo provider reference.
  if (reference) {
    const airtime = await pool.query(
      `
      SELECT *
      FROM airtime_transactions
      WHERE provider_reference = $1
      LIMIT 1
      `,
      [reference]
    );

    if (airtime.rows.length) {
      return {
        kind: 'airtime',
        row: airtime.rows[0],
      };
    }

    const data = await pool.query(
      `
      SELECT *
      FROM data_transactions
      WHERE provider_reference = $1
      LIMIT 1
      `,
      [reference]
    );

    if (data.rows.length) {
      return {
        kind: 'data',
        row: data.rows[0],
      };
    }
  }

  return null;
};

// ============================================================
// COMPLETE AIRTIME / DATA
// ============================================================

const completeSeparateTransaction = async (
  kind,
  row,
  payload,
  providerReference,
  providerMessage
) => {
  const table =
    kind === 'airtime'
      ? 'airtime_transactions'
      : 'data_transactions';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `
      SELECT *
      FROM ${table}
      WHERE id = $1
      FOR UPDATE
      `,
      [row.id]
    );

    if (!locked.rows.length) {
      await client.query('ROLLBACK');
      return;
    }

    const current = locked.rows[0];

    if (isFinalStatus(current.status)) {
      await client.query('COMMIT');
      return;
    }

    await client.query(
      `
      UPDATE ${table}
      SET
        status = 'completed',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        completed_at =
          COALESCE(completed_at, CURRENT_TIMESTAMP)
      WHERE id = $3
      `,
      [
        providerReference,
        safeJson(payload),
        current.id,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND status NOT IN (
          'failed',
          'refunded',
          'cancelled'
        )
      `,
      [current.reference]
    );

    await client.query('COMMIT');

    console.log(
      `${kind} transaction completed:`,
      current.reference
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// REFUND AIRTIME / DATA — EXACTLY ONCE
// ============================================================

const refundSeparateTransaction = async (
  kind,
  row,
  payload,
  providerReference,
  providerMessage
) => {
  const table =
    kind === 'airtime'
      ? 'airtime_transactions'
      : 'data_transactions';

  const refundType =
    kind === 'airtime'
      ? 'airtime_refund'
      : 'data_refund';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `
      SELECT *
      FROM ${table}
      WHERE id = $1
      FOR UPDATE
      `,
      [row.id]
    );

    if (!locked.rows.length) {
      await client.query('ROLLBACK');
      return;
    }

    const current = locked.rows[0];

    if (isFinalStatus(current.status)) {
      await client.query('COMMIT');

      console.log(
        `${kind} final transaction already processed.`
      );

      return;
    }

    const accountResult = await client.query(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [current.account_id]
    );

    if (!accountResult.rows.length) {
      throw new Error(
        `${kind} refund account not found`
      );
    }

    const amount = Number(current.amount);
    const balance = Number(
      accountResult.rows[0].balance
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(balance)
    ) {
      throw new Error(
        `Invalid ${kind} refund amount or balance`
      );
    }

    await client.query(
      `
      UPDATE accounts
      SET
        balance = balance + $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [amount, current.account_id]
    );

    const refundReference =
      `ZEN-${kind.toUpperCase()}-REFUND-${crypto.randomUUID()}`;

    await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status
      )
      VALUES ($1, $2, $3, 'NGN', $4, $5, 'completed')
      `,
      [
        current.account_id,
        refundType,
        amount,
        refundReference,
        `${kind} purchase refund - ${current.reference}`,
      ]
    );

    await client.query(
      `
      UPDATE ${table}
      SET
        status = 'failed',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        failure_reason = $3,
        completed_at =
          COALESCE(completed_at, CURRENT_TIMESTAMP)
      WHERE id = $4
      `,
      [
        providerReference,
        safeJson(payload),
        providerMessage || 'Sogo transaction failed',
        current.id,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'failed'
      WHERE reference = $1
      `,
      [current.reference]
    );

    await client.query('COMMIT');

    console.log(
      `${kind} wallet refund completed:`,
      refundReference
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// FIND BILL PAYMENT
// ============================================================

const findBillPayment = async (
  idempotencyKey,
  providerReference
) => {
  if (idempotencyKey) {
    const result = await pool.query(
      `
      SELECT *
      FROM bill_payments
      WHERE provider_request_id = $1
      LIMIT 1
      `,
      [idempotencyKey]
    );

    if (result.rows.length) {
      return result.rows[0];
    }
  }

  if (providerReference) {
    const result = await pool.query(
      `
      SELECT *
      FROM bill_payments
      WHERE provider_reference = $1
      LIMIT 1
      `,
      [providerReference]
    );

    if (result.rows.length) {
      return result.rows[0];
    }
  }

  return null;
};

// ============================================================
// COMPLETE BILL PAYMENT
// ============================================================

const completeBillPayment = async (
  bill,
  payload,
  providerReference,
  providerMessage,
  electricityToken,
  units
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT *
      FROM bill_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [bill.id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return;
    }

    const current = result.rows[0];

    if (isFinalStatus(current.status)) {
      await client.query('COMMIT');
      return;
    }

    await client.query(
      `
      UPDATE bill_payments
      SET
        status = 'completed',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        provider_response_message = $3,
        electricity_token =
          COALESCE(electricity_token, $4),
        units = COALESCE(units, $5),
        completed_at =
          COALESCE(completed_at, CURRENT_TIMESTAMP)
      WHERE id = $6
      `,
      [
        providerReference,
        safeJson(payload),
        providerMessage,
        electricityToken,
        units,
        current.id,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND status NOT IN (
          'failed',
          'refunded',
          'cancelled'
        )
      `,
      [current.reference]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// REFUND BILL PAYMENT — ELECTRICITY / TV / EDUCATION / BETTING
// Row lock prevents duplicate wallet refunds.
// ============================================================

const refundBillPayment = async (
  bill,
  payload,
  providerReference,
  providerMessage
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      SELECT *
      FROM bill_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [bill.id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return;
    }

    const current = result.rows[0];
    const currentStatus = String(
      current.status || ''
    ).toLowerCase();

    // A previous controller action or webhook may
    // already have finalized and refunded this payment.
    if (isFinalStatus(currentStatus)) {
      await client.query('COMMIT');

      console.log(
        'Bill payment already finalized; duplicate refund ignored:',
        current.reference
      );

      return;
    }

    const category = String(
      current.category || ''
    ).toLowerCase();

    let refundType;
    let prefix;

    if (category === 'electricity') {
      refundType = 'electricity_refund';
      prefix = 'ZEL';
    } else if (category === 'betting') {
      refundType = 'betting_refund';
      prefix = 'ZBET';
    } else if (category === 'cable_tv') {
      refundType = 'tv_refund';
      prefix = 'ZEN-TV';
    } else if (category === 'education') {
      refundType = 'education_refund';
      prefix = 'ZEDU';
    } else {
      throw new Error(
        `Unsupported bill refund category: ${category}`
      );
    }

    const accountResult = await client.query(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [current.account_id]
    );

    if (!accountResult.rows.length) {
      throw new Error('Bill refund account not found');
    }

    const amount = Number(current.amount);
    const balance = Number(
      accountResult.rows[0].balance
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(balance)
    ) {
      throw new Error(
        'Invalid bill refund amount or account balance'
      );
    }

    // Credit the customer wallet.
    await client.query(
      `
      UPDATE accounts
      SET
        balance = balance + $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [amount, current.account_id]
    );

    const refundReference =
      `${prefix}-REFUND-${crypto.randomUUID()}`;

    // Create the refund ledger entry.
    await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status
      )
      VALUES ($1, $2, $3, 'NGN', $4, $5, 'completed')
      `,
      [
        current.account_id,
        refundType,
        amount,
        refundReference,
        `${category} payment refund - ${current.reference}`,
      ]
    );

    // Mark the original bill as refunded.
    await client.query(
      `
      UPDATE bill_payments
      SET
        status = 'refunded',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        provider_response_message = $3,
        completed_at =
          COALESCE(completed_at, CURRENT_TIMESTAMP)
      WHERE id = $4
      `,
      [
        providerReference,
        safeJson(payload),
        providerMessage || 'Sogo transaction failed or refunded',
        current.id,
      ]
    );

    // Update the original transaction.
    await client.query(
      `
      UPDATE transactions
      SET status = 'refunded'
      WHERE reference = $1
      `,
      [current.reference]
    );

    await client.query('COMMIT');

    console.log(
      `${category} wallet refund completed:`,
      refundReference
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// UPDATE PROCESSING STATUS
// ============================================================

const markProcessing = async (
  table,
  row,
  payload,
  providerReference,
  message
) => {
  const allowedTables = [
    'airtime_transactions',
    'data_transactions',
    'bill_payments',
  ];

  if (!allowedTables.includes(table)) {
    throw new Error('Invalid transaction table');
  }

  if (table === 'bill_payments') {
    await pool.query(
      `
      UPDATE bill_payments
      SET
        status = 'processing',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        provider_response_message = $3
      WHERE id = $4
        AND status NOT IN (
          'completed',
          'failed',
          'refunded',
          'cancelled'
        )
      `,
      [
        providerReference,
        safeJson(payload),
        message,
        row.id,
      ]
    );

    return;
  }

  await pool.query(
    `
    UPDATE ${table}
    SET
      status = 'processing',
      provider_reference =
        COALESCE($1, provider_reference),
      provider_response = $2
    WHERE id = $3
      AND status NOT IN (
        'completed',
        'failed',
        'refunded',
        'cancelled'
      )
    `,
    [
      providerReference,
      safeJson(payload),
      row.id,
    ]
  );
};

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================

const handleSogoWebhook = async (req, res) => {
  const webhookSecret =
    process.env.SOGO_WEBHOOK_SECRET;

  try {
    if (!webhookSecret) {
      console.error(
        'SOGO_WEBHOOK_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message: 'Webhook secret is not configured',
      });
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body || {})
        );

    const signature =
      req.headers['x-sogo-signature-256'];

    if (
      !verifySignature(
        rawBody,
        signature,
        webhookSecret
      )
    ) {
      console.error(
        'Invalid Sogo webhook signature'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    let payload;

    try {
      payload = JSON.parse(
        rawBody.toString('utf8')
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook JSON',
      });
    }

    const event =
      payload?.event ||
      req.headers['x-sogo-event'] ||
      '';

    const supportedEvents = [
      'transaction.completed',
      'transaction.processing',
      'transaction.failed',
      'transaction.cancelled',
      'transaction.refunded',
    ];

    if (!supportedEvents.includes(event)) {
      return res.status(200).json({
        success: true,
        message: 'Event received',
      });
    }

    const eventData =
      payload?.data ||
      payload?.payload ||
      {};

    const transaction =
      extractTransaction(payload);

    const providerReference =
      extractProviderReference(
        transaction,
        eventData,
        payload
      );

    const idempotencyKey =
      extractIdempotencyKey(
        transaction,
        eventData,
        payload
      );

    const providerMessage =
      extractProviderMessage(
        transaction,
        eventData,
        payload
      );

    const providerStatus =
      extractProviderStatus(
        transaction,
        eventData,
        payload
      );

    const status = normalizeStatus(
      event,
      providerStatus
    );

    console.log('Sogo webhook received:', {
      event,
      status,
      providerReference,
      idempotencyKey,
    });

    if (
      !providerReference &&
      !idempotencyKey
    ) {
      console.warn(
        'Sogo webhook has no transaction reference or idempotency key'
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook received without transaction identifiers',
      });
    }

    // --------------------------------------------------------
    // 1. AIRTIME / DATA
    // --------------------------------------------------------

    const separate =
      await findSeparateTransaction(
        idempotencyKey,
        providerReference
      );

    if (separate) {
      if (status === 'completed') {
        await completeSeparateTransaction(
          separate.kind,
          separate.row,
          payload,
          providerReference,
          providerMessage
        );
      } else if (
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'refunded'
      ) {
        await refundSeparateTransaction(
          separate.kind,
          separate.row,
          payload,
          providerReference,
          providerMessage
        );
      } else if (status === 'processing') {
        // IMPORTANT: pass actual database table names.
        await markProcessing(
          separate.kind === 'airtime'
            ? 'airtime_transactions'
            : 'data_transactions',
          separate.row,
          payload,
          providerReference,
          providerMessage
        );
      }

      return res.status(200).json({
        success: true,
        message:
          `${separate.kind} webhook processed`,
      });
    }

    // --------------------------------------------------------
    // 2. BILL PAYMENTS
    // TV, EDUCATION, ELECTRICITY, BETTING
    // --------------------------------------------------------

    const bill = await findBillPayment(
      idempotencyKey,
      providerReference
    );

    if (!bill) {
      console.warn(
        'No local Sogo transaction found:',
        {
          providerReference,
          idempotencyKey,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          'Webhook received; local transaction not found',
      });
    }

    const category = String(
      bill.category || ''
    ).toLowerCase();

    const isBetting =
      category === 'betting';

    const isElectricity =
      category === 'electricity';

    const isTV =
      category === 'cable_tv';

    const isEducation =
      category === 'education';

    // --------------------------------------------------------
    // BILL PAYMENT COMPLETED
    // --------------------------------------------------------

    if (status === 'completed') {
      let electricityToken =
        extractElectricityToken(payload);

      let units =
        extractUnits(payload);

      if (
        isElectricity &&
        (!electricityToken || !units)
      ) {
        // Prefer the original idempotency key for lookup.
        const lookup = await fetchSogoTransaction(
          idempotencyKey || providerReference
        );

        if (lookup) {
          electricityToken =
            electricityToken ||
            extractElectricityToken(lookup);

          units =
            units ||
            extractUnits(lookup);
        }
      }

      await completeBillPayment(
        bill,
        payload,
        providerReference,
        providerMessage,
        isElectricity ? electricityToken : null,
        isElectricity ? units : null
      );

      return res.status(200).json({
        success: true,
        message:
          `${category} transaction completed`,
      });
    }

    // --------------------------------------------------------
    // BILL PAYMENT PROCESSING
    // --------------------------------------------------------

    if (status === 'processing') {
      await markProcessing(
        'bill_payments',
        bill,
        payload,
        providerReference,
        providerMessage
      );

      return res.status(200).json({
        success: true,
        message:
          `${category} transaction still processing`,
      });
    }

    // --------------------------------------------------------
    // ELECTRICITY FAILURE / CANCELLATION / REFUND
    //
    // IMPORTANT:
    // Electricity may fail asynchronously after the original
    // controller has already returned a processing response.
    //
    // Refund through the shared row-locked helper.
    // The original electricity controller's immediate refund
    // is protected because it also finalizes the same bill row.
    // --------------------------------------------------------

    if (
      isElectricity &&
      (
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'refunded'
      )
    ) {
      await refundBillPayment(
        bill,
        payload,
        providerReference,
        providerMessage
      );

      return res.status(200).json({
        success: true,
        message:
          'Electricity refund event processed safely',
      });
    }

    // --------------------------------------------------------
    // BETTING / TV / EDUCATION FAILURE OR REFUND
    // --------------------------------------------------------

    if (
      (isBetting || isTV || isEducation) &&
      (
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'refunded'
      )
    ) {
      await refundBillPayment(
        bill,
        payload,
        providerReference,
        providerMessage
      );

      return res.status(200).json({
        success: true,
        message:
          `${category} refund event processed`,
      });
    }

    // --------------------------------------------------------
    // UNKNOWN CATEGORY / STATUS
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE bill_payments
      SET
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        provider_response_message = $3
      WHERE id = $4
      `,
      [
        providerReference,
        safeJson(payload),
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
      'SOGO WEBHOOK ERROR:',
      error?.response?.data ||
      error?.message ||
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  handleSogoWebhook,
};
