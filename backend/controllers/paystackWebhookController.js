
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// PAYSTACK WEBHOOK SIGNATURE
// ============================================================

const verifyPaystackSignature = (req) => {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    if (!secretKey || !signature) {
      return false;
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    const received = Buffer.from(String(signature), 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');

    if (received.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(received, expected);
  } catch (error) {
    console.error(
      'Paystack signature verification error:',
      error
    );

    return false;
  }
};

// ============================================================
// PARSE PAYSTACK BODY
// ============================================================

const parsePaystackBody = (req) => {
  try {
    if (Buffer.isBuffer(req.body)) {
      return JSON.parse(req.body.toString('utf8'));
    }

    if (typeof req.body === 'string') {
      return JSON.parse(req.body);
    }

    return req.body;
  } catch (error) {
    console.error(
      'Unable to parse Paystack webhook body:',
      error
    );

    return null;
  }
};

// ============================================================
// ACCOUNT BALANCE LIMIT
// ============================================================

const getAccountLimit = (kycStatus, kycTier) => {
  const status = String(kycStatus || '').toLowerCase();
  const tier = Number(kycTier || 0);

  const verified =
    status === 'verified' ||
    status === 'approved' ||
    status === 'completed';

  if (!verified) {
    return 50000;
  }

  if (tier >= 3) {
    return null;
  }

  if (tier === 2) {
    return 500000;
  }

  if (tier === 1) {
    return 200000;
  }

  return 50000;
};

// ============================================================
// PROCESS SUCCESSFUL PAYSTACK CHARGE
// ============================================================

const handleSuccessfulCharge = async (eventData) => {
  const reference = eventData?.reference;

  if (!reference) {
    return {
      handled: false,
      message: 'Charge received without a reference',
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const depositResult = await client.query(
      `
      SELECT
        d.id,
        d.account_id,
        d.amount,
        d.currency,
        d.reference,
        d.payment_method,
        d.status,
        a.user_id,
        a.balance,
        a.currency AS account_currency,
        a.status AS account_status,
        u.kyc_status,
        u.kyc_tier
      FROM deposits d
      INNER JOIN accounts a
        ON a.id = d.account_id
      INNER JOIN users u
        ON u.id = a.user_id
      WHERE d.reference = $1
      FOR UPDATE OF d, a
      `,
      [reference]
    );

    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return {
        handled: false,
        message: 'Deposit reference not found',
      };
    }

    const deposit = depositResult.rows[0];

    if (deposit.status === 'completed') {
      await client.query('ROLLBACK');

      return {
        handled: true,
        alreadyProcessed: true,
        message: 'Deposit already processed',
      };
    }

    if (deposit.status !== 'pending') {
      await client.query('ROLLBACK');

      return {
        handled: false,
        message: 'Deposit is not pending',
      };
    }

    if (deposit.account_status !== 'active') {
      throw new Error(
        'Cannot credit an inactive account'
      );
    }

    const expectedAmount = Number(deposit.amount);
    const paidAmount = Number(eventData.amount || 0) / 100;

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0
    ) {
      throw new Error(
        'Invalid Paystack payment amount'
      );
    }

    if (
      !Number.isFinite(expectedAmount) ||
      Math.abs(paidAmount - expectedAmount) > 0.01
    ) {
      throw new Error(
        `Paystack amount mismatch. Expected ${expectedAmount}, received ${paidAmount}`
      );
    }

    const paymentCurrency = String(
      eventData.currency || ''
    ).toUpperCase();

    const accountCurrency = String(
      deposit.account_currency || deposit.currency || ''
    ).toUpperCase();

    if (
      paymentCurrency &&
      accountCurrency &&
      paymentCurrency !== accountCurrency
    ) {
      throw new Error(
        `Currency mismatch. Expected ${accountCurrency}, received ${paymentCurrency}`
      );
    }

    const currentBalance = Number(deposit.balance || 0);

    if (
      !Number.isFinite(currentBalance) ||
      currentBalance < 0
    ) {
      throw new Error('Invalid account balance');
    }

    const accountLimit = getAccountLimit(
      deposit.kyc_status,
      deposit.kyc_tier
    );

    const projectedBalance = currentBalance + paidAmount;

    if (
      accountLimit !== null &&
      projectedBalance > accountLimit
    ) {
      throw new Error(
        `Payment would exceed account balance limit of ${accountLimit}`
      );
    }

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [projectedBalance, deposit.account_id]
    );

    await client.query(
      `
      UPDATE deposits
      SET status = 'completed'
      WHERE id = $1
      `,
      [deposit.id]
    );

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
        'deposit',
        $2,
        $3,
        $4,
        $5,
        'completed',
        $6,
        $7
      )
      `,
      [
        deposit.account_id,
        paidAmount,
        accountCurrency || 'NGN',
        reference,
        `Paystack deposit ${reference}`,
        currentBalance,
        projectedBalance,
      ]
    );

    try {
      await client.query(
        `
        INSERT INTO audit_logs (
          user_id,
          action,
          description
        )
        VALUES ($1, 'deposit_completed', $2)
        `,
        [
          deposit.user_id,
          `Paystack deposit ${reference} completed. Amount: ${paidAmount} ${accountCurrency || 'NGN'}. Balance changed from ${currentBalance} to ${projectedBalance}.`,
        ]
      );
    } catch (auditError) {
      console.error(
        'Paystack deposit audit log error:',
        auditError
      );
    }

    await client.query('COMMIT');

    console.log(
      `Paystack deposit ${reference} completed. ` +
      `Credited ${paidAmount} ${accountCurrency || 'NGN'} ` +
      `to account ${deposit.account_id}`
    );

    return {
      handled: true,
      alreadyProcessed: false,
      message: 'Deposit successfully credited',
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Deposit rollback error:',
        rollbackError
      );
    }

    console.error(
      'PAYSTACK CHARGE PROCESSING ERROR:',
      error
    );

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// TRANSFER SUCCESS
// ============================================================

const handleTransferSuccess = async (eventData) => {
  const reference = eventData?.reference;

  if (!reference) {
    return {
      message: 'Transfer webhook received without reference',
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const transferResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        currency,
        reference,
        status,
        provider_reference
      FROM bank_transfers
      WHERE reference = $1
      FOR UPDATE
      `,
      [reference]
    );

    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return {
        message: 'Transfer reference not found',
      };
    }

    const transfer = transferResult.rows[0];

    // A completed transfer must never be processed twice.
    if (transfer.status === 'completed') {
      await client.query('ROLLBACK');

      return {
        message: 'Transfer already processed',
      };
    }

    // Do not resurrect a failed or reversed transfer.
    if (
      transfer.status === 'failed' ||
      transfer.status === 'reversed' ||
      transfer.status === 'cancelled'
    ) {
      await client.query('ROLLBACK');

      console.error(
        `Paystack success received for terminal transfer ${reference}, status=${transfer.status}`
      );

      return {
        message:
          'Transfer is already in a terminal state; manual reconciliation required',
      };
    }

    // Only transfers awaiting provider confirmation can complete.
    if (
      transfer.status !== 'processing' &&
      transfer.status !== 'pending'
    ) {
      await client.query('ROLLBACK');

      return {
        message: 'Transfer is not awaiting confirmation',
      };
    }

    await client.query(
      `
      UPDATE bank_transfers
      SET
        status = 'completed',
        provider_reference = $1,
        completed_at = CURRENT_TIMESTAMP,
        failure_reason = NULL
      WHERE id = $2
      `,
      [
        eventData.transfer_code ||
          eventData.reference ||
          reference,
        transfer.id,
      ]
    );

    await client.query(
      `
      UPDATE transactions
      SET status = 'completed'
      WHERE reference = $1
        AND type = 'transfer'
        AND status IN ('pending', 'processing')
      `,
      [reference]
    );

    await client.query('COMMIT');

    console.log(
      `Paystack transfer ${reference} completed`
    );

    return {
      message: 'Transfer success processed',
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Transfer success rollback error:',
        rollbackError
      );
    }

    console.error(
      'Transfer success processing error:',
      error
    );

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// TRANSFER FAILED
// ============================================================
//
// SAFETY RULES:
//
// 1. Lock the transfer row before making a decision.
// 2. Never refund a completed transfer.
// 3. Never refund a transfer twice.
// 4. Only refund an eligible pending/processing transfer.
// 5. Lock the account before calculating its new balance.
// 6. Update the transfer, ledger and refund atomically.
//
// IMPORTANT:
// A provider's failure event must be genuine and final.
// Transfers with uncertain provider outcomes require
// reconciliation before a refund is issued.
// ============================================================

const handleTransferFailed = async (eventData) => {
  const reference = eventData?.reference;

  if (!reference) {
    return {
      message: 'Transfer webhook received without reference',
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ========================================================
    // LOCK TRANSFER
    // ========================================================

    const transferResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        currency,
        reference,
        status
      FROM bank_transfers
      WHERE reference = $1
      FOR UPDATE
      `,
      [reference]
    );

    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return {
        message: 'Transfer reference not found',
      };
    }

    const transfer = transferResult.rows[0];

    // ========================================================
    // NEVER REFUND A COMPLETED TRANSFER
    // ========================================================

    if (transfer.status === 'completed') {
      await client.query('ROLLBACK');

      console.error(
        `Rejected late failure webhook for completed transfer ${reference}. Reconciliation required.`
      );

      return {
        message:
          'Transfer already completed. No refund issued.',
      };
    }

    // ========================================================
    // PREVENT DUPLICATE REFUNDS
    // ========================================================

    if (
      transfer.status === 'failed' ||
      transfer.status === 'reversed' ||
      transfer.status === 'cancelled'
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Transfer already in a terminal state. No refund issued.',
      };
    }

    // ========================================================
    // ONLY REFUND PENDING OR PROCESSING TRANSFERS
    // ========================================================

    if (
      transfer.status !== 'pending' &&
      transfer.status !== 'processing'
    ) {
      await client.query('ROLLBACK');

      console.error(
        `Transfer ${reference} has unexpected status ${transfer.status}. No refund issued.`
      );

      return {
        message:
          'Transfer status is not eligible for automatic refund',
      };
    }

    // ========================================================
    // LOCK ORIGINAL TRANSACTION
    // ========================================================

    const transactionResult = await client.query(
      `
      SELECT
        id,
        account_id,
        amount,
        currency,
        status,
        balance_before,
        balance_after
      FROM transactions
      WHERE reference = $1
        AND type = 'transfer'
      FOR UPDATE
      `,
      [reference]
    );

    if (transactionResult.rows.length === 0) {
      throw new Error(
        'Original transfer transaction not found'
      );
    }

    const originalTransaction =
      transactionResult.rows[0];

    // Verify that the ledger and transfer refer to the same account.
    if (
      String(originalTransaction.account_id) !==
      String(transfer.account_id)
    ) {
      throw new Error(
        'Transfer account does not match original ledger transaction'
      );
    }

    // A completed ledger transaction cannot be refunded automatically.
    if (originalTransaction.status === 'completed') {
      await client.query('ROLLBACK');

      console.error(
        `Transfer ${reference} has a completed ledger transaction. No automatic refund issued.`
      );

      return {
        message:
          'Ledger transaction is completed. Manual reconciliation required.',
      };
    }

    if (
      originalTransaction.status !== 'pending' &&
      originalTransaction.status !== 'processing'
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Original transaction is not eligible for automatic refund',
      };
    }

    // ========================================================
    // VALIDATE REFUND AMOUNT
    // ========================================================

    const refundAmount = Number(
      originalTransaction.amount
    );

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      throw new Error(
        'Invalid transfer refund amount'
      );
    }

    // ========================================================
    // LOCK ACCOUNT
    // ========================================================

    const accountResult = await client.query(
      `
      SELECT
        id,
        balance,
        currency
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [transfer.account_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error(
        'Account for failed transfer not found'
      );
    }

    const account = accountResult.rows[0];

    const oldBalance = Number(account.balance);

    if (
      !Number.isFinite(oldBalance) ||
      oldBalance < 0
    ) {
      throw new Error(
        'Invalid account balance during refund'
      );
    }

    const newBalance = oldBalance + refundAmount;

    if (!Number.isFinite(newBalance)) {
      throw new Error(
        'Invalid resulting account balance'
      );
    }

    // ========================================================
    // MARK TRANSFER FAILED
    // ========================================================

    const failureReason =
      eventData.reason ||
      eventData.failure_reason ||
      'Paystack transfer failed';

    await client.query(
      `
      UPDATE bank_transfers
      SET
        status = 'failed',
        provider_reference = COALESCE(
          $1,
          provider_reference
        ),
        failure_reason = $2
      WHERE id = $3
      `,
      [
        eventData.transfer_code ||
          eventData.reference ||
          reference,
        String(failureReason).slice(0, 1000),
        transfer.id,
      ]
    );

    // ========================================================
    // REFUND THE ORIGINAL ACCOUNT
    // ========================================================

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [newBalance, account.id]
    );

    // ========================================================
    // MARK ORIGINAL TRANSACTION FAILED
    // ========================================================

    await client.query(
      `
      UPDATE transactions
      SET status = 'failed'
      WHERE id = $1
      `,
      [originalTransaction.id]
    );

    // ========================================================
    // CREATE REFUND LEDGER ENTRY
    // ========================================================

    const refundReference =
      `ZEN-REF-${crypto.randomUUID()}`;

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
        'transfer_refund',
        $2,
        $3,
        $4,
        $5,
        'completed',
        $6,
        $7
      )
      `,
      [
        account.id,
        refundAmount,
        transfer.currency ||
          originalTransaction.currency ||
          account.currency,
        refundReference,
        `Refund for failed bank transfer ${reference}`,
        oldBalance,
        newBalance,
      ]
    );

    // ========================================================
    // COMMIT ALL CHANGES TOGETHER
    // ========================================================

    await client.query('COMMIT');

    console.log(
      `Paystack transfer ${reference} failed. ` +
      `Refunded ${refundAmount} to account ${account.id}`
    );

    return {
      message:
        'Transfer failure processed and balance refunded',
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Transfer failure rollback error:',
        rollbackError
      );
    }

    console.error(
      'Transfer failure processing error:',
      error
    );

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// MAIN PAYSTACK WEBHOOK
// ============================================================

const handlePaystackWebhook = async (req, res) => {
  if (!verifyPaystackSignature(req)) {
    console.error(
      'Rejected Paystack webhook: invalid signature'
    );

    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature',
    });
  }

  const event = parsePaystackBody(req);

  if (!event || !event.event) {
    return res.status(400).json({
      success: false,
      message: 'Invalid webhook payload',
    });
  }

  console.log(
    `Paystack webhook received: ${event.event}`
  );

  try {
    if (event.event === 'charge.success') {
      const result = await handleSuccessfulCharge(
        event.data || {}
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    }

    if (event.event === 'transfer.success') {
      const result = await handleTransferSuccess(
        event.data || {}
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    }

    if (event.event === 'transfer.failed') {
      const result = await handleTransferFailed(
        event.data || {}
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    }

    console.log(
      `Paystack event acknowledged without processing: ${event.event}`
    );

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error(
      'PAYSTACK WEBHOOK PROCESSING ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  handlePaystackWebhook,
};
