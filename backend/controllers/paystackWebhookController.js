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

    const received = Buffer.from(
      String(signature),
      'utf8'
    );

    const expected = Buffer.from(
      expectedSignature,
      'utf8'
    );

    if (received.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      received,
      expected
    );
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
      return JSON.parse(
        req.body.toString('utf8')
      );
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

const getAccountLimit = (
  kycStatus,
  kycTier
) => {
  const status = String(
    kycStatus || ''
  ).toLowerCase();

  const tier = Number(
    kycTier || 0
  );

  const verified =
    status === 'verified' ||
    status === 'approved' ||
    status === 'completed';

  // ----------------------------------------------------------
  // NOT VERIFIED
  // ----------------------------------------------------------

  if (!verified) {
    return 50000;
  }

  // ----------------------------------------------------------
  // TIER 3
  // ----------------------------------------------------------

  if (tier >= 3) {
    return null;
  }

  // ----------------------------------------------------------
  // TIER 2
  // ----------------------------------------------------------

  if (tier === 2) {
    return 500000;
  }

  // ----------------------------------------------------------
  // TIER 1
  // ----------------------------------------------------------

  if (tier === 1) {
    return 200000;
  }

  return 50000;
};

// ============================================================
// PROCESS SUCCESSFUL PAYSTACK CHARGE
// ============================================================
//
// IMPORTANT:
//
// This handler only credits a deposit when:
//
// 1. Paystack's webhook signature is valid.
// 2. The deposit reference exists in Zenimonies.
// 3. The deposit is still pending.
// 4. The Paystack amount matches the requested amount.
// 5. The account is active.
// 6. The resulting balance does not exceed the KYC limit.
//
// The frontend cannot directly credit the balance.
// ============================================================

const handleSuccessfulCharge = async (
  eventData
) => {
  const reference =
    eventData?.reference;

  if (!reference) {
    return {
      handled: false,
      message:
        'Charge received without a reference',
    };
  }

  const client =
    await pool.connect();

  try {
    await client.query('BEGIN');

    // ========================================================
    // FIND AND LOCK DEPOSIT
    // ========================================================

    const depositResult =
      await client.query(
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
        FOR UPDATE
        `,
        [reference]
      );

    if (
      depositResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return {
        handled: false,
        message:
          'Deposit reference not found',
      };
    }

    const deposit =
      depositResult.rows[0];

    // ========================================================
    // IDEMPOTENCY
    // ========================================================

    if (
      deposit.status === 'completed'
    ) {
      await client.query('ROLLBACK');

      return {
        handled: true,
        alreadyProcessed: true,
        message:
          'Deposit already processed',
      };
    }

    // ========================================================
    // ONLY PENDING DEPOSITS CAN BE CREDITED
    // ========================================================

    if (
      deposit.status !== 'pending'
    ) {
      await client.query('ROLLBACK');

      return {
        handled: false,
        message:
          'Deposit is not pending',
      };
    }

    // ========================================================
    // ACCOUNT MUST BE ACTIVE
    // ========================================================

    if (
      deposit.account_status !== 'active'
    ) {
      throw new Error(
        'Cannot credit an inactive account'
      );
    }

    // ========================================================
    // VALIDATE PAYMENT AMOUNT
    // ========================================================

    const expectedAmount =
      Number(deposit.amount);

    const paidAmount =
      Number(
        eventData.amount || 0
      ) / 100;

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount <= 0
    ) {
      throw new Error(
        'Invalid Paystack payment amount'
      );
    }

    if (
      Math.abs(
        paidAmount -
          expectedAmount
      ) > 0.01
    ) {
      throw new Error(
        `Paystack amount mismatch. Expected ${expectedAmount}, received ${paidAmount}`
      );
    }

    // ========================================================
    // VALIDATE CURRENCY
    // ========================================================

    const paymentCurrency =
      String(
        eventData.currency ||
          ''
      ).toUpperCase();

    const accountCurrency =
      String(
        deposit.account_currency ||
          deposit.currency ||
          ''
      ).toUpperCase();

    if (
      paymentCurrency &&
      accountCurrency &&
      paymentCurrency !==
        accountCurrency
    ) {
      throw new Error(
        `Currency mismatch. Expected ${accountCurrency}, received ${paymentCurrency}`
      );
    }

    // ========================================================
    // CURRENT BALANCE
    // ========================================================

    const currentBalance =
      Number(
        deposit.balance || 0
      );

    if (
      !Number.isFinite(
        currentBalance
      ) ||
      currentBalance < 0
    ) {
      throw new Error(
        'Invalid account balance'
      );
    }

    // ========================================================
    // ACCOUNT LIMIT
    // ========================================================

    const accountLimit =
      getAccountLimit(
        deposit.kyc_status,
        deposit.kyc_tier
      );

    const projectedBalance =
      currentBalance +
      paidAmount;

    // ========================================================
    // ENFORCE BALANCE LIMIT
    // ========================================================

    if (
      accountLimit !== null &&
      projectedBalance >
        accountLimit
    ) {
      throw new Error(
        `Payment would exceed account balance limit of ${accountLimit}`
      );
    }

    // ========================================================
    // CREDIT ACCOUNT
    // ========================================================

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        projectedBalance,
        deposit.account_id,
      ]
    );

    // ========================================================
    // MARK DEPOSIT COMPLETED
    // ========================================================

    await client.query(
      `
      UPDATE deposits
      SET
        status = 'completed'
      WHERE id = $1
      `,
      [deposit.id]
    );

    // ========================================================
    // CREATE COMPLETED TRANSACTION
    // ========================================================

    const transactionReference =
      `ZEN-DEP-${reference}`;

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
        transactionReference,
        `Paystack deposit ${reference}`,
        currentBalance,
        projectedBalance,
      ]
    );

    // ========================================================
    // AUDIT LOG
    // ========================================================

    try {
      await client.query(
        `
        INSERT INTO audit_logs (
          user_id,
          action,
          description
        )
        VALUES (
          $1,
          'deposit_completed',
          $2
        )
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

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query('COMMIT');

    console.log(
      `Paystack deposit ${reference} completed. ` +
      `Credited ${paidAmount} ${accountCurrency || 'NGN'} ` +
      `to account ${deposit.account_id}`
    );

    return {
      handled: true,
      alreadyProcessed: false,
      message:
        'Deposit successfully credited',
    };

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

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

const handleTransferSuccess = async (
  eventData
) => {
  const reference =
    eventData?.reference;

  if (!reference) {
    return {
      message:
        'Transfer webhook received without reference',
    };
  }

  const client =
    await pool.connect();

  try {
    await client.query('BEGIN');

    const transferResult =
      await client.query(
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

    if (
      transferResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Transfer reference not found',
      };
    }

    const transfer =
      transferResult.rows[0];

    // ========================================================
    // IDEMPOTENCY
    // ========================================================

    if (
      transfer.status === 'completed'
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Transfer already processed',
      };
    }

    // ========================================================
    // COMPLETE TRANSFER
    // ========================================================

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
        reference,
        transfer.id,
      ]
    );

    // ========================================================
    // COMPLETE ORIGINAL TRANSACTION
    // ========================================================

    await client.query(
      `
      UPDATE transactions
      SET
        status = 'completed'
      WHERE reference = $1
      `,
      [reference]
    );

    await client.query('COMMIT');

    console.log(
      `Paystack transfer ${reference} completed`
    );

    return {
      message:
        'Transfer success processed',
    };

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch {}

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

const handleTransferFailed = async (
  eventData
) => {
  const reference =
    eventData?.reference;

  if (!reference) {
    return {
      message:
        'Transfer webhook received without reference',
    };
  }

  const client =
    await pool.connect();

  try {
    await client.query('BEGIN');

    // ========================================================
    // LOCK TRANSFER
    // ========================================================

    const transferResult =
      await client.query(
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

    if (
      transferResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Transfer reference not found',
      };
    }

    const transfer =
      transferResult.rows[0];

    // ========================================================
    // IDEMPOTENCY
    // ========================================================

    if (
      transfer.status === 'failed'
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Transfer already marked failed',
      };
    }

    // ========================================================
    // GET ORIGINAL TRANSACTION
    // ========================================================

    const transactionResult =
      await client.query(
        `
        SELECT
          id,
          amount,
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

    if (
      transactionResult.rows.length === 0
    ) {
      throw new Error(
        'Original transfer transaction not found'
      );
    }

    const originalTransaction =
      transactionResult.rows[0];

    // ========================================================
    // PREVENT DOUBLE REFUND
    // ========================================================

    if (
      originalTransaction.status ===
      'failed'
    ) {
      await client.query('ROLLBACK');

      return {
        message:
          'Original transfer already failed/refunded',
      };
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
        provider_reference = $1,
        failure_reason = $2
      WHERE id = $3
      `,
      [
        reference,
        failureReason,
        transfer.id,
      ]
    );

    // ========================================================
    // LOCK ACCOUNT
    // ========================================================

    const accountResult =
      await client.query(
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

    if (
      accountResult.rows.length === 0
    ) {
      throw new Error(
        'Account for failed transfer not found'
      );
    }

    const account =
      accountResult.rows[0];

    const oldBalance =
      Number(account.balance);

    const refundAmount =
      Number(
        originalTransaction.amount
      );

    if (
      !Number.isFinite(
        refundAmount
      ) ||
      refundAmount <= 0
    ) {
      throw new Error(
        'Invalid transfer refund amount'
      );
    }

    // ========================================================
    // REFUND
    // ========================================================

    const newBalance =
      oldBalance +
      refundAmount;

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        newBalance,
        account.id,
      ]
    );

    // ========================================================
    // MARK ORIGINAL TRANSACTION FAILED
    // ========================================================

    await client.query(
      `
      UPDATE transactions
      SET
        status = 'failed'
      WHERE id = $1
      `,
      [originalTransaction.id]
    );

    // ========================================================
    // REFUND TRANSACTION
    // ========================================================

    const refundReference =
      `ZEN-REF-${Date.now()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;

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
          account.currency,
        refundReference,
        `Refund for failed bank transfer ${reference}`,
        oldBalance,
        newBalance,
      ]
    );

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
      await client.query(
        'ROLLBACK'
      );
    } catch {}

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

const handlePaystackWebhook = async (
  req,
  res
) => {
  // ==========================================================
  // SIGNATURE MUST BE VALID
  // ==========================================================

  if (
    !verifyPaystackSignature(req)
  ) {
    console.error(
      'Rejected Paystack webhook: invalid signature'
    );

    return res.status(401).json({
      success: false,
      message:
        'Invalid webhook signature',
    });
  }

  // ==========================================================
  // PARSE EVENT
  // ==========================================================

  const event =
    parsePaystackBody(req);

  if (
    !event ||
    !event.event
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid webhook payload',
    });
  }

  console.log(
    `Paystack webhook received: ${event.event}`
  );

  try {
    // ========================================================
    // SUCCESSFUL PAYMENT / CHECKOUT
    // ========================================================

    if (
      event.event ===
      'charge.success'
    ) {
      const result =
        await handleSuccessfulCharge(
          event.data || {}
        );

      return res.status(200).json({
        success: true,
        message:
          result.message,
      });
    }

    // ========================================================
    // TRANSFER SUCCESS
    // ========================================================

    if (
      event.event ===
      'transfer.success'
    ) {
      const result =
        await handleTransferSuccess(
          event.data || {}
        );

      return res.status(200).json({
        success: true,
        message:
          result.message,
      });
    }

    // ========================================================
    // TRANSFER FAILED
    // ========================================================

    if (
      event.event ===
      'transfer.failed'
    ) {
      const result =
        await handleTransferFailed(
          event.data || {}
        );

      return res.status(200).json({
        success: true,
        message:
          result.message,
      });
    }

    // ========================================================
    // OTHER PAYSTACK EVENTS
    // ========================================================

    console.log(
      `Paystack event acknowledged without processing: ${event.event}`
    );

    return res.status(200).json({
      success: true,
      message:
        'Webhook received',
    });

  } catch (error) {
    console.error(
      'PAYSTACK WEBHOOK PROCESSING ERROR:',
      error
    );

    /*
     * Return 500 so Paystack can retry the webhook.
     *
     * We deliberately do NOT acknowledge a payment that
     * failed to process internally.
     */

    return res.status(500).json({
      success: false,
      message:
        'Webhook processing failed',
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  handlePaystackWebhook,
};
