const crypto = require('crypto');
const pool = require('../config/database');

const {
  getBettingProviders,
  verifyBettingAccount,
  fundBettingAccount,
  getSogoTransaction,
  createIdempotencyKey,
} = require('../services/bettingService');

/**
 * ============================================================
 * ZENIMONIES — BETTING CONTROLLER
 * ============================================================
 *
 * Sogo betting-account funding.
 *
 * Flow:
 *
 * 1. Load supported betting providers
 * 2. Verify betting account
 * 3. Customer confirms verified account
 * 4. Lock ZENIMONIES account
 * 5. Check balance
 * 6. Create local processing transaction
 * 7. Debit customer
 * 8. Fund betting account through Sogo
 * 9. Keep processing until Sogo confirms final result
 * 10. Webhook/reconciliation completes or refunds transaction
 *
 * IMPORTANT:
 * - Sogo secret key never reaches the frontend.
 * - Account verification happens BEFORE debit.
 * - Idempotency prevents duplicate provider funding.
 * - Failed provider transactions are refunded.
 * ============================================================
 */

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

const normalizeProvider = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase();
};

const normalizeAccountId = (value) => {
  return String(value || '')
    .trim();
};

const normalizeAmount = (value) => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return Math.round(
    amount * 100
  ) / 100;
};

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.user_id ||
    null
  );
};

/**
 * Extract Sogo status from a normalized service response.
 */
const normalizeProviderStatus = (
  result
) => {
  return String(
    result?.status ||
    result?.providerData?.status ||
    result?.providerResponse?.status ||
    ''
  )
    .trim()
    .toLowerCase();
};

/**
 * ============================================================
 * GET BETTING PROVIDERS
 * ============================================================
 *
 * GET /api/betting/providers
 *
 * Requires:
 * bills:read
 * ============================================================
 */

const getProviders = async (
  req,
  res
) => {
  try {
    const result =
      await getBettingProviders();

    return res.status(200).json({
      success: true,
      providers:
        result.providers || [],
    });

  } catch (error) {
    console.error(
      '❌ Betting providers error:',
      error
    );

    return res.status(
      error?.status || 502
    ).json({
      success: false,
      message:
        error?.message ||
        'Unable to load betting providers',
    });
  }
};

/**
 * ============================================================
 * VERIFY BETTING ACCOUNT
 * ============================================================
 *
 * POST /api/betting/verify
 *
 * Body:
 * {
 *   provider: "bet9ja",
 *   account_id: "12341234"
 * }
 *
 * No customer money is touched here.
 * ============================================================
 */

const verifyAccount = async (
  req,
  res
) => {
  const provider =
    normalizeProvider(
      req.body?.provider
    );

  const accountId =
    normalizeAccountId(
      req.body?.account_id
    );

  if (!provider) {
    return res.status(400).json({
      success: false,
      message:
        'Betting provider is required',
    });
  }

  if (!accountId) {
    return res.status(400).json({
      success: false,
      message:
        'Betting account ID is required',
    });
  }

  /**
   * Basic protection against extremely large identifiers.
   */
  if (
    accountId.length < 3 ||
    accountId.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid betting account ID',
    });
  }

  try {
    const result =
      await verifyBettingAccount({
        provider,
        accountId,
      });

    return res.status(200).json({
      success: true,

      verified: true,

      provider,

      account_id:
        accountId,

      username:
        result.username ||
        null,

      verification:
        result.verification ||
        null,
    });

  } catch (error) {
    console.error(
      '❌ Betting account verification error:',
      error
    );

    return res.status(
      error?.status || 502
    ).json({
      success: false,

      verified: false,

      message:
        error?.message ||
        'Unable to verify betting account',
    });
  }
};

/**
 * ============================================================
 * FUND BETTING ACCOUNT
 * ============================================================
 *
 * POST /api/betting/fund
 *
 * Body:
 * {
 *   provider: "bet9ja",
 *   account_id: "12341234",
 *   amount: 1000
 * }
 *
 * Transaction PIN middleware will be added at the route level.
 * ============================================================
 */

const fundAccount = async (
  req,
  res
) => {
  const userId =
    getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required',
    });
  }

  const provider =
    normalizeProvider(
      req.body?.provider
    );

  const accountId =
    normalizeAccountId(
      req.body?.account_id
    );

  const amount =
    normalizeAmount(
      req.body?.amount
    );

  /**
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  if (!provider) {
    return res.status(400).json({
      success: false,
      message:
        'Betting provider is required',
    });
  }

  if (!accountId) {
    return res.status(400).json({
      success: false,
      message:
        'Betting account ID is required',
    });
  }

  if (
    accountId.length < 3 ||
    accountId.length > 100
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid betting account ID',
    });
  }

  if (amount === null) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid betting funding amount',
    });
  }

  /**
   * Keep customer funding limits conservative.
   *
   * We can change these later if our business rules
   * require different limits.
   */
  if (amount < 100) {
    return res.status(400).json({
      success: false,
      message:
        'Minimum betting funding amount is ₦100',
    });
  }

  if (amount > 500000) {
    return res.status(400).json({
      success: false,
      message:
        'Maximum betting funding amount is ₦500,000',
    });
  }

  /**
   * ==========================================================
   * IMPORTANT:
   *
   * We verify the betting account AGAIN immediately before
   * taking the customer's money.
   *
   * This prevents someone from bypassing the frontend
   * verification step and submitting an arbitrary account.
   * ==========================================================
   */

  let verification;

  try {
    verification =
      await verifyBettingAccount({
        provider,
        accountId,
      });

  } catch (error) {
    console.error(
      '❌ Betting account could not be verified before funding:',
      error
    );

    return res.status(
      error?.status || 502
    ).json({
      success: false,
      message:
        error?.message ||
        'Unable to verify betting account. Your account has not been charged.',
    });
  }

  const verifiedUsername =
    verification?.username ||
    null;

  /**
   * ==========================================================
   * CREATE LOCAL TRANSACTION
   * ==========================================================
   */

  const client =
    await pool.connect();

  let accountIdDb;
  let localTransactionReference;
  let idempotencyKey;
  let localBillId;

  try {
    await client.query(
      'BEGIN'
    );

    /**
     * --------------------------------------------------------
     * LOCK CUSTOMER NGN ACCOUNT
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

    accountIdDb =
      account.id;

    const balance =
      Number(account.balance);

    /**
     * --------------------------------------------------------
     * BALANCE CHECK
     * --------------------------------------------------------
     */

    if (
      !Number.isFinite(balance) ||
      balance < amount
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

    localTransactionReference =
      `ZBET-${Date.now()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;

    idempotencyKey =
      createIdempotencyKey();

    /**
     * --------------------------------------------------------
     * CREATE BILL PAYMENT RECORD
     * --------------------------------------------------------
     *
     * We use the existing bill_payments table so Betting
     * remains part of the same reconciliation system as
     * Electricity and Education.
     * --------------------------------------------------------
     */

    const billResult =
      await client.query(
        `
        INSERT INTO bill_payments (
          account_id,
          category,
          biller_name,
          customer_reference,
          customer_name,
          amount,
          currency,
          reference,
          provider_request_id,
          status,
          provider_response_message
        )
        VALUES (
          $1,
          'betting',
          $2,
          $3,
          $4,
          $5,
          'NGN',
          $6,
          $7,
          'processing',
          $8
        )
        RETURNING id
        `,
        [
          accountIdDb,

          provider,

          accountId,

          verifiedUsername,

          amount,

          localTransactionReference,

          idempotencyKey,

          `Betting account funding - ${provider}`,
        ]
      );

    localBillId =
      billResult.rows[0].id;

    /**
     * --------------------------------------------------------
     * DEBIT CUSTOMER
     * --------------------------------------------------------
     *
     * The account is locked, so concurrent requests cannot
     * spend the same balance.
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
        amount,
        accountIdDb,
      ]
    );

    /**
     * --------------------------------------------------------
     * CREATE MAIN TRANSACTION RECORD
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
        'betting_funding',
        $2,
        'NGN',
        $3,
        'processing',
        $4
      )
      `,
      [
        accountIdDb,

        amount,

        localTransactionReference,

        `Betting account funding - ${provider} - ${accountId}`,
      ]
    );

    await client.query(
      'COMMIT'
    );

    console.log(
      '💰 Betting customer account debited:',
      localTransactionReference
    );

  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (_) {}

    console.error(
      '❌ Betting local transaction failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to create betting transaction. Your account has not been charged.',
    });

  } finally {
    client.release();
  }

  /**
   * ==========================================================
   * SEND FUNDING REQUEST TO SOGO
   * ==========================================================
   */

  let providerResult;

  try {
    providerResult =
      await fundBettingAccount({
        provider,

        accountId,

        amount,

        idempotencyKey,
      });

  } catch (error) {
    /**
     * --------------------------------------------------------
     * IMPORTANT:
     *
     * A network error does NOT automatically mean the Sogo
     * transaction failed.
     *
     * The request may have reached Sogo.
     *
     * Therefore we keep the transaction processing until
     * reconciliation determines the final result.
     * --------------------------------------------------------
     */

    console.error(
      '⚠️ Sogo betting funding request error:',
      error
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
          error?.providerResponse ||
          {}
        ),

        error?.message ||
          'Betting funding request is being processed',

        localBillId,
      ]
    );

    return res.status(202).json({
      success: true,

      processing: true,

      message:
        'Your betting account funding is being processed. Please do not submit it again.',

      reference:
        localTransactionReference,

      provider:
        provider,

      account_id:
        accountId,

      amount,

      username:
        verifiedUsername,
    });
  }

  /**
   * ==========================================================
   * NORMALIZE PROVIDER RESPONSE
   * ==========================================================
   */

  const providerStatus =
    normalizeProviderStatus(
      providerResult
    );

  const providerReference =
    providerResult?.reference ||
    null;

  const providerMessage =
    providerResult?.message ||
    null;

  /**
   * Save provider response regardless of immediate status.
   */

  await pool.query(
    `
    UPDATE bill_payments
    SET
      provider_reference = COALESCE($1, provider_reference),
      provider_response = $2,
      provider_response_message = $3
    WHERE id = $4
    `,
    [
      providerReference,

      JSON.stringify(
        providerResult?.providerResponse ||
        providerResult
      ),

      providerMessage,

      localBillId,
    ]
  );

  /**
   * ==========================================================
   * SOGO PURCHASES ARE ASYNCHRONOUS
   * ==========================================================
   *
   * Current Sogo documentation says bill purchases return
   * processing initially and final status is delivered by
   * webhook / transaction lookup.
   *
   * So even if the service response looks successful,
   * we do not tell the customer the betting account was
   * definitely funded until final confirmation.
   * ==========================================================
   */

  if (
    providerStatus === 'completed' ||
    providerStatus === 'success' ||
    providerStatus === 'successful'
  ) {
    /**
     * This branch protects us if Sogo ever returns an
     * immediately completed response.
     */

    await pool.query(
      `
      UPDATE bill_payments
      SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [localBillId]
    );

    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'completed'
      WHERE reference = $1
      `,
      [localTransactionReference]
    );

    return res.status(200).json({
      success: true,

      status:
        'completed',

      message:
        providerMessage ||
        'Betting account funded successfully.',

      reference:
        localTransactionReference,

      provider_reference:
        providerReference,

      provider,

      account_id:
        accountId,

      username:
        verifiedUsername,

      amount,
    });
  }

  /**
   * ==========================================================
   * PROCESSING / PENDING
   * ==========================================================
   */

  if (
    providerStatus === 'processing' ||
    providerStatus === 'pending' ||
    !providerStatus
  ) {
    await pool.query(
      `
      UPDATE bill_payments
      SET
        status = 'processing'
      WHERE id = $1
      `,
      [localBillId]
    );

    await pool.query(
      `
      UPDATE transactions
      SET
        status = 'processing'
      WHERE reference = $1
      `,
      [localTransactionReference]
    );

    return res.status(202).json({
      success: true,

      processing: true,

      status:
        'processing',

      message:
        'Your betting account funding is being processed. Please do not submit it again.',

      reference:
        localTransactionReference,

      provider_reference:
        providerReference,

      provider,

      account_id:
        accountId,

      username:
        verifiedUsername,

      amount,
    });
  }

  /**
   * ==========================================================
   * DEFINITIVE FAILURE
   * ==========================================================
   *
   * If Sogo explicitly says failed/cancelled/refunded,
   * refund the customer's ZENIMONIES account atomically.
   * ==========================================================
   */

  if (
    providerStatus === 'failed' ||
    providerStatus === 'cancelled' ||
    providerStatus === 'refunded'
  ) {
    const refundClient =
      await pool.connect();

    try {
      await refundClient.query(
        'BEGIN'
      );

      /**
       * Lock the bill.
       */
      const billResult =
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
        billResult.rows.length > 0 &&
        billResult.rows[0].status ===
          'processing'
      ) {
        const refundAccountId =
          billResult.rows[0].account_id;

        const refundAmount =
          Number(
            billResult.rows[0].amount
          );

        /**
         * Refund balance.
         */
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

        /**
         * Create refund transaction.
         */
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
            'betting_refund',
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

            `REF-${localTransactionReference}`,

            `Betting account funding refund - ${provider}`,
          ]
        );

        /**
         * Mark original transaction failed/refunded.
         */
        await refundClient.query(
          `
          UPDATE transactions
          SET
            status = $1
          WHERE reference = $2
          `,
          [
            providerStatus === 'refunded'
              ? 'refunded'
              : 'failed',

            localTransactionReference,
          ]
        );

        /**
         * Mark bill.
         */
        await refundClient.query(
          `
          UPDATE bill_payments
          SET
            status = $1
          WHERE id = $2
          `,
          [
            providerStatus === 'refunded'
              ? 'refunded'
              : 'failed',

            localBillId,
          ]
        );
      }

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
        '❌ Betting refund failed:',
        refundError
      );

      return res.status(500).json({
        success: false,
        message:
          'The betting provider rejected the transaction, but the refund is still being processed. Please do not submit the transaction again.',
        reference:
          localTransactionReference,
      });

    } finally {
      refundClient.release();
    }

    return res.status(502).json({
      success: false,

      status:
        providerStatus,

      message:
        providerMessage ||
        'Betting account funding failed. Your account has been refunded.',

      reference:
        localTransactionReference,

      provider_reference:
        providerReference,
    });
  }

  /**
   * ==========================================================
   * UNKNOWN PROVIDER RESPONSE
   * ==========================================================
   *
   * Never guess that money was successfully delivered.
   * Keep the transaction processing and reconcile it.
   * ==========================================================
   */

  console.warn(
    '⚠️ Unexpected Sogo betting response:',
    JSON.stringify(
      providerResult,
      null,
      2
    )
  );

  await pool.query(
    `
    UPDATE bill_payments
    SET
      status = 'processing'
    WHERE id = $1
    `,
    [localBillId]
  );

  await pool.query(
    `
    UPDATE transactions
    SET
      status = 'processing'
    WHERE reference = $1
    `,
    [localTransactionReference]
  );

  return res.status(202).json({
    success: true,

    processing: true,

    message:
      'Your betting account funding is being verified. Please do not submit it again.',

    reference:
      localTransactionReference,

    provider_reference:
      providerReference,

    provider,

    account_id:
      accountId,

    username:
      verifiedUsername,

    amount,
  });
};

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  getProviders,
  verifyAccount,
  fundAccount,
};
