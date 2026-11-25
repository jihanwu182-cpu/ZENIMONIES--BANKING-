
const crypto = require('crypto');
const pool = require('../config/database');

const {
  verifyElectricityMeter: verifyVTPassMeter,
  purchaseElectricity: purchaseVTPassElectricity,
  generateElectricityRequestId,
} = require('../services/electricityService');

// ============================================================
// ZENIMONIES — ELECTRICITY CONTROLLER
// VTPASS INTEGRATION
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
// PROVIDER STATUS
// ============================================================

const getProviderStatus = (result) => {
  const code = String(result?.code || '');
  const status = String(result?.status || '')
    .trim()
    .toLowerCase();

  if (code === '000' && status === 'delivered') {
    return 'completed';
  }

  if (
    code === '016' ||
    code === '091' ||
    code === '040'
  ) {
    return 'failed';
  }

  return 'pending';
};

const getProviderMessage = (result) =>
  firstValue(
    result?.responseDescription,
    result?.rawResponse?.response_description,
    result?.rawResponse?.message
  );

const getProviderReference = (result) =>
  firstValue(
    result?.providerTransactionId,
    result?.rawResponse?.content?.transactions?.transactionId
  );

const safeJson = (value) => {
  try {
    return JSON.stringify(value || {});
  } catch (_) {
    return JSON.stringify({
      message: 'Provider response could not be serialized',
    });
  }
};

// ============================================================
// SAVE PROVIDER RESPONSE
// ============================================================

const saveProviderResponse = async ({
  billId,
  reference,
  result,
  status,
}) => {
  const providerReference =
    getProviderReference(result);

  const providerMessage =
    getProviderMessage(result);

  const token = firstValue(
    result?.token,
    result?.rawResponse?.token,
    result?.rawResponse?.purchased_code
  );

  const units = firstValue(
    result?.units,
    result?.rawResponse?.units
  );

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const billUpdate = await client.query(
      `
      UPDATE bill_payments
      SET
        status = $1,
        provider_reference =
          COALESCE($2, provider_reference),
        provider_response = $3,
        provider_response_message = $4,
        electricity_token =
          COALESCE($5, electricity_token),
        units =
          COALESCE($6, units),
        completed_at =
          CASE
            WHEN $8::boolean = TRUE
            THEN CURRENT_TIMESTAMP
            ELSE completed_at
          END
      WHERE
        id = $7
        AND status = 'processing'
      `,
      [
        status,
        providerReference,
        safeJson(result?.rawResponse || result),
        providerMessage,
        token,
        units,
        billId,
        status === 'completed',
      ]
    );

    if (billUpdate.rowCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }

    const transactionUpdate = await client.query(
      `
      UPDATE transactions
      SET status = $1
      WHERE reference = $2
      `,
      [status, reference]
    );

    if (transactionUpdate.rowCount !== 1) {
      throw new Error(
        'Electricity transaction ledger record was not updated.'
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    throw error;
  } finally {
    client.release();
  }
};


// ============================================================
// REFUND CONFIRMED FAILED TRANSACTION
// ============================================================

const refundElectricity = async ({
  billId,
  reference,
  providerResult,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const billResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        status
      FROM bill_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [billId]
    );

    if (billResult.rows.length === 0) {
      throw new Error('Electricity payment record not found.');
    }

    const bill = billResult.rows[0];

    if (bill.status !== 'processing') {
      await client.query('COMMIT');
      return false;
    }

    const amount = Number(bill.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid electricity refund amount.');
    }

    const accountUpdate = await client.query(
      `
      UPDATE accounts
      SET
        balance = balance + $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [amount, bill.account_id]
    );

    if (accountUpdate.rowCount !== 1) {
      throw new Error('Customer account could not be refunded.');
    }

    const refundReference = `REF-${reference}`;

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
        bill.account_id,
        amount,
        refundReference,
        `VTPass electricity payment refund - ${reference}`,
      ]
    );

    const providerReference =
      getProviderReference(providerResult);

    const providerMessage =
      getProviderMessage(providerResult);

    await client.query(
      `
      UPDATE bill_payments
      SET
        status = 'failed',
        provider_reference =
          COALESCE($1, provider_reference),
        provider_response = $2,
        provider_response_message = $3
      WHERE id = $4
      `,
      [
        providerReference,
        safeJson(providerResult?.rawResponse || providerResult),
        providerMessage,
        billId,
      ]
    );

    const originalTransactionUpdate = await client.query(
      `
      UPDATE transactions
      SET status = 'failed'
      WHERE reference = $1
      `,
      [reference]
    );

    if (originalTransactionUpdate.rowCount !== 1) {
      throw new Error(
        'Original electricity transaction could not be updated.'
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// PURCHASE ELECTRICITY
// ============================================================

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

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const normalizedProvider = String(provider || '')
    .trim()
    .toUpperCase();

  // The mobile app uses PHEDC.
  // VTPass uses PHED.
  const vtpassProvider =
    normalizedProvider === 'PHEDC'
      ? 'PHED'
      : normalizedProvider;

  const normalizedMeterNumber = String(meter_number || '')
    .trim();

  const normalizedMeterType = String(meter_type || '')
    .trim()
    .toLowerCase();

  const numericAmount = Number(amount);

  if (!normalizedProvider) {
    return res.status(400).json({
      success: false,
      message: 'Electricity provider is required.',
    });
  }

  if (!['prepaid', 'postpaid'].includes(normalizedMeterType)) {
    return res.status(400).json({
      success: false,
      message: 'Meter type must be prepaid or postpaid.',
    });
  }

  if (!/^[A-Za-z0-9-]{5,50}$/.test(normalizedMeterNumber)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid meter/account number.',
    });
  }

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 1000000
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid electricity amount.',
    });
  }

  // ==========================================================
  // GET CUSTOMER PHONE
  // ==========================================================

  let phone;

  try {
    const userResult = await pool.query(
      `
      SELECT phone
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    phone = String(
      req.body?.phone ||
      userResult.rows[0]?.phone ||
      ''
    ).replace(/\D/g, '');

    if (!/^0\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message:
          'A valid Nigerian phone number is required for this electricity payment.',
      });
    }
  } catch (error) {
    console.error(
      'Electricity customer phone lookup failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve customer details.',
    });
  }

  // ==========================================================
  // STEP 1 — VERIFY METER THROUGH VTPASS
  // ==========================================================

  let verification;

  try {
    verification = await verifyVTPassMeter({
      provider: vtpassProvider,
      meterNumber: normalizedMeterNumber,
      meterType: normalizedMeterType,
    });

    if (
      !verification ||
      !['000', '020'].includes(
        String(verification.code || '').trim()
      ) ||
      verification.verified !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          'VTPass could not confirm this electricity meter. Please check the provider and meter number.',
        verification_code: verification?.code || null,
      });
    }
  } catch (error) {
    console.error(
      'VTPass meter verification error:',
      error.message
    );

    return res.status(502).json({
      success: false,
      message:
        'Unable to verify this electricity meter at the moment. Please try again.',
    });
  }

  const customerName =
    firstValue(verification.customerName);

  const customerAddress =
    firstValue(verification.customerAddress);

  const tariffClass = firstValue(
    verification.rawResponse?.content?.Tariff_Class,
    verification.rawResponse?.content?.tariff_class
  );

  // ==========================================================
  // STEP 2 — CREATE LOCAL TRANSACTION AND DEBIT WALLET
  // ==========================================================

  const client = await pool.connect();

  let billId;
  let transactionReference;
  let providerRequestId;

  try {
    await client.query('BEGIN');

    const accountResult = await client.query(
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

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Active NGN account not found.',
      });
    }

    const account = accountResult.rows[0];
    const balance = Number(account.balance);

    if (
      !Number.isFinite(balance) ||
      balance < numericAmount
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Insufficient balance.',
      });
    }

    transactionReference =
      `ZEL-${Date.now()}-${crypto
        .randomBytes(5)
        .toString('hex')
        .toUpperCase()}`;

    // Generate the VTPass ID before the provider request.
    providerRequestId = generateElectricityRequestId();

    const billerResult = await client.query(
      `
      SELECT id, name
      FROM billers
      WHERE
        category = 'electricity'
        AND UPPER(name) LIKE $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [`%${normalizedProvider}%`]
    );

    const fallbackBillerResult =
      billerResult.rows.length === 0
        ? await client.query(
            `
            SELECT id, name
            FROM billers
            WHERE category = 'electricity'
            ORDER BY created_at ASC
            LIMIT 1
            `
          )
        : null;

    const biller =
      billerResult.rows[0] ||
      fallbackBillerResult?.rows[0] ||
      null;

    const billResult = await client.query(
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
        $1, $2, 'electricity', $3, $4, $5,
        $6, 'NGN', $7, $8, 'processing',
        $9, $10, 'verified', $11, $12, $13
      )
      RETURNING id
      `,
      [
        account.id,
        biller?.id || null,
        normalizedProvider,
        normalizedMeterNumber,
        customerName,
        numericAmount,
        transactionReference,
        providerRequestId,
        normalizedMeterType,
        normalizedMeterNumber,
        customerName,
        customerAddress,
        tariffClass,
      ]
    );

    billId = billResult.rows[0].id;

    const debitResult = await client.query(
      `
      UPDATE accounts
      SET
        balance = balance - $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        id = $2
        AND balance >= $1
      `,
      [numericAmount, account.id]
    );

    if (debitResult.rowCount !== 1) {
      throw new Error('Wallet debit failed.');
    }

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

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error(
      'Electricity local transaction failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to create electricity payment.',
    });
  } finally {
    client.release();
  }

  // ==========================================================
  // STEP 3 — SEND PURCHASE TO VTPASS
  // ==========================================================

  let purchaseResult;

  try {
    purchaseResult = await purchaseVTPassElectricity({
      provider: vtpassProvider,
      meterNumber: normalizedMeterNumber,
      meterType: normalizedMeterType,
      amount: numericAmount,
      phone,
      requestId: providerRequestId,
    });
  } catch (error) {
    // Never automatically refund a timeout or network error.
    // VTPass may have received and processed the request.

    console.error(
      'VTPass Electricity purchase uncertain:',
      error.message
    );

    return res.status(202).json({
      success: true,
      processing: true,
      status: 'processing',
      message:
        'Your electricity payment is being processed. Please do not submit it again.',
      reference: transactionReference,
      provider_request_id: providerRequestId,
    });
  }

  // ==========================================================
  // STEP 4 — INTERPRET VTPASS RESPONSE
  // ==========================================================

  const providerStatus =
    getProviderStatus(purchaseResult);

  const providerReference =
    getProviderReference(purchaseResult);

  const providerMessage =
    getProviderMessage(purchaseResult);

  if (providerStatus === 'completed') {
    try {
      await saveProviderResponse({
        billId,
        reference: transactionReference,
        result: purchaseResult,
        status: 'completed',
      });
    } catch (error) {
      console.error(
        'VTPass completed but local update failed:',
        error.message
      );

      return res.status(202).json({
        success: true,
        processing: true,
        status: 'processing',
        message:
          'Your payment was received and is being confirmed. Please do not submit it again.',
        reference: transactionReference,
        provider_request_id: providerRequestId,
      });
    }

    const token = firstValue(
      purchaseResult.token,
      purchaseResult.rawResponse?.token,
      purchaseResult.rawResponse?.purchased_code
    );

    const units = firstValue(
      purchaseResult.units,
      purchaseResult.rawResponse?.units
    );

    return res.status(200).json({
      success: true,
      status: 'completed',
      message:
        providerMessage ||
        'Electricity payment successful.',
      reference: transactionReference,
      provider_reference: providerReference,
      provider_request_id: providerRequestId,
      electricity_token: token,
      token,
      units,
      customer_name: customerName,
      customer_address: customerAddress,
      meter_number: normalizedMeterNumber,
      meter_type: normalizedMeterType,
      provider: normalizedProvider,
    });
  }

  if (providerStatus === 'failed') {
    try {
      await refundElectricity({
        billId,
        reference: transactionReference,
        providerResult: purchaseResult,
      });
    } catch (error) {
      console.error(
        'Electricity refund failed:',
        error.message
      );

      return res.status(202).json({
        success: true,
        processing: true,
        status: 'processing',
        message:
          'The provider reported a failed transaction. Your refund is being reconciled.',
        reference: transactionReference,
        provider_request_id: providerRequestId,
      });
    }

    return res.status(200).json({
      success: true,
      status: 'failed',
      refunded: true,
      message:
        providerMessage ||
        'Electricity payment failed. Your wallet has been refunded.',
      reference: transactionReference,
      provider_reference: providerReference,
    });
  }

  // Unknown or pending responses remain processing.
  // Do not automatically refund uncertain transactions.

  try {
    await saveProviderResponse({
      billId,
      reference: transactionReference,
      result: purchaseResult,
      status: 'processing',
    });
  } catch (error) {
    console.error(
      'Unable to save pending VTPass response:',
      error.message
    );
  }

  return res.status(202).json({
    success: true,
    processing: true,
    status: 'processing',
    message:
      providerMessage ||
      'Your electricity payment is still processing. Please do not submit it again.',
    reference: transactionReference,
    provider_reference: providerReference,
    provider_request_id: providerRequestId,
  });
};

module.exports = {
  purchaseElectricity,
};
