const crypto = require('crypto');

const pool = require('../config/database');

// ============================================================
// SOGO ELECTRICITY PROVIDER MAPPING
// ============================================================

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

// ============================================================
// HELPERS
// ============================================================

const createReference = () => {
  return `ZEL-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

const isValidMeterNumber = (value) => {
  if (!value) {
    return false;
  }

  return /^[A-Za-z0-9-]{5,50}$/.test(
    String(value).trim()
  );
};

// ============================================================
// PURCHASE ELECTRICITY
// ============================================================

const purchaseElectricity = async (req, res) => {
  res.setHeader(
    'X-Zenimonies-Electricity-Version',
    'electricity-controller-2026-09-22-v5'
  );

  console.log(
    '🔥 ZENIMONIES ELECTRICITY CONTROLLER V5 REACHED 🔥'
  );

  console.log(
    '========== ZENIMONIES ELECTRICITY PAYMENT START =========='
  );

  console.log(
    'ELECTRICITY PAYMENT REQUEST:',
    JSON.stringify({
      provider: req.body?.provider,
      meter_type: req.body?.meter_type,
      amount: req.body?.amount,
      user_id:
        req.user?.id ||
        req.user?.user_id ||
        null,
    })
  );

  let client = null;

  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const userId =
      req.user?.id ||
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // ========================================================
    // REQUEST
    // ========================================================

    const {
      provider,
      meter_number,
      meter_type,
      amount,
    } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message:
          'Electricity provider is required.',
      });
    }

    if (!meter_number) {
      return res.status(400).json({
        success: false,
        message:
          'Meter number is required.',
      });
    }

    if (!meter_type) {
      return res.status(400).json({
        success: false,
        message:
          'Meter type is required.',
      });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount is required.',
      });
    }

    // ========================================================
    // NORMALIZE
    // ========================================================

    const normalizedProvider =
      String(provider)
        .trim()
        .toUpperCase();

    const normalizedMeterNumber =
      String(meter_number).trim();

    const normalizedMeterType =
      String(meter_type)
        .trim()
        .toLowerCase();

    const numericAmount = Number(amount);

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !SOGO_DISCO_SLUGS[
        normalizedProvider
      ]
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unsupported electricity provider.',
      });
    }

    if (
      ![
        'prepaid',
        'postpaid',
      ].includes(normalizedMeterType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Meter type must be prepaid or postpaid.',
      });
    }

    if (
      !isValidMeterNumber(
        normalizedMeterNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid meter number.',
      });
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid payment amount.',
      });
    }

    if (numericAmount > 1000000) {
      return res.status(400).json({
        success: false,
        message:
          'Amount exceeds the current electricity payment limit.',
      });
    }

    // ========================================================
    // SOGO CONFIGURATION
    // ========================================================

    const sogoApiKey =
      process.env.SOGO_API_KEY;

    const sogoBaseUrl =
      process.env.SOGO_API_BASE_URL ||
      'https://sandbox.sogo.africa/v1';

    if (!sogoApiKey) {
      console.error(
        'SOGO_API_KEY is missing.'
      );

      return res.status(500).json({
        success: false,
        message:
          'Electricity payment service is not configured.',
      });
    }

    const discoSlug =
      SOGO_DISCO_SLUGS[
        normalizedProvider
      ];

    // ========================================================
    // VERIFY METER WITH SOGO
    // ========================================================

    console.log(
      'SOGO ELECTRICITY VERIFICATION START:',
      JSON.stringify({
        disco_slug: discoSlug,
        meter_number:
          normalizedMeterNumber,
        meter_type:
          normalizedMeterType,
      })
    );

    let verificationResponse;

    try {
      verificationResponse =
        await fetch(
          `${sogoBaseUrl}/bills/electricity/verify-meter`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${sogoApiKey}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              disco_slug:
                discoSlug,
              meter_number:
                normalizedMeterNumber,
              meter_type:
                normalizedMeterType,
            }),
          }
        );
    } catch (error) {
      console.error(
        'Sogo verification network error:',
        error
      );

      return res.status(502).json({
        success: false,
        message:
          'Unable to verify the electricity meter. Please try again.',
      });
    }

    let verificationResult = null;

    try {
      verificationResult =
        await verificationResponse.json();
    } catch (error) {
      verificationResult = null;
    }

    console.log(
      'SOGO ELECTRICITY VERIFICATION HTTP STATUS:',
      verificationResponse.status
    );

    console.log(
      'SOGO ELECTRICITY VERIFICATION RESPONSE:',
      JSON.stringify(
        verificationResult
      )
    );

    if (!verificationResponse.ok) {
      console.error(
        'Sogo verification failed:',
        JSON.stringify(
          verificationResult
        )
      );

      return res.status(502).json({
        success: false,
        message:
          verificationResult?.error?.message ||
          verificationResult?.message ||
          'Electricity meter verification failed.',
      });
    }

    const verification =
      verificationResult?.verification ||
      verificationResult?.data?.verification ||
      verificationResult?.data;

    if (!verification) {
      return res.status(502).json({
        success: false,
        message:
          'Invalid verification response from electricity provider.',
      });
    }

    // ========================================================
    // START DATABASE TRANSACTION
    // ========================================================

    client = await pool.connect();

    await client.query('BEGIN');

    // ========================================================
    // LOCK CUSTOMER ACCOUNT
    // ========================================================

    const accountResult =
      await client.query(
        `
          SELECT
            id,
            user_id,
            account_number,
            balance,
            currency,
            status
          FROM accounts
          WHERE user_id = $1
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
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Active NGN account not found.',
      });
    }

    const account =
      accountResult.rows[0];

    const balanceBefore =
      Number(account.balance);

    if (
      !Number.isFinite(balanceBefore) ||
      balanceBefore < numericAmount
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Insufficient account balance.',
      });
    }

    // ========================================================
    // CREATE REFERENCES
    // ========================================================

    const reference =
      createReference();

    const idempotencyKey =
      crypto.randomUUID();

    console.log(
      'ELECTRICITY PAYMENT REFERENCES:',
      JSON.stringify({
        reference,
        idempotency_key:
          idempotencyKey,
      })
    );

    // ========================================================
    // FIND ELECTRICITY BILLER
    // ========================================================

    const billerResult =
      await client.query(
        `
          SELECT id
          FROM billers
          WHERE category = 'electricity'
            AND is_active = true
          ORDER BY created_at ASC
          LIMIT 1
        `
      );

    const billerId =
      billerResult.rows[0]?.id ||
      null;

    // ========================================================
    // CREATE BILL PAYMENT
    // ========================================================

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
            verified_customer_address
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
            $5,
            $11
          )
          RETURNING id
        `,
        [
          account.id,
          billerId,
          normalizedProvider,
          normalizedMeterNumber,
          verification.customer_name ||
            null,
          numericAmount,
          reference,
          idempotencyKey,
          normalizedMeterType,
          normalizedMeterNumber,
          verification.address ||
            null,
        ]
      );

    const billPaymentId =
      billResult.rows[0].id;

    // ========================================================
    // DEBIT CUSTOMER ACCOUNT
    // ========================================================

    const balanceAfter =
      balanceBefore -
      numericAmount;

    await client.query(
      `
        UPDATE accounts
        SET
          balance = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        balanceAfter,
        account.id,
      ]
    );

    // ========================================================
    // CREATE TRANSACTION
    // ========================================================

    const transactionResult =
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
            balance_after,
            transaction_fee
          )
          VALUES (
            $1,
            'electricity_payment',
            $2,
            'NGN',
            $3,
            $4,
            'processing',
            $5,
            $6,
            0
          )
          RETURNING id
        `,
        [
          account.id,
          numericAmount,
          reference,
          `Electricity payment - ${normalizedProvider} - ${normalizedMeterNumber}`,
          balanceBefore,
          balanceAfter,
        ]
      );

    const transactionId =
      transactionResult.rows[0].id;

    await client.query('COMMIT');

    client.release();
    client = null;

    console.log(
      'LOCAL ELECTRICITY PAYMENT COMMITTED:',
      JSON.stringify({
        reference,
        bill_payment_id:
          billPaymentId,
        transaction_id:
          transactionId,
        amount:
          numericAmount,
      })
    );

    // ========================================================
    // CALL SOGO ELECTRICITY PURCHASE
    // ========================================================

    console.error(
      '🔥🔥🔥 ZENIMONIES SOGO PURCHASE REACHED 🔥🔥🔥'
    );

    console.error(
      'SOGO BASE URL:',
      sogoBaseUrl
    );

    console.error(
      'SOGO DISCO:',
      discoSlug
    );

    console.error(
      'SOGO METER:',
      normalizedMeterNumber
    );

    console.error(
      'SOGO AMOUNT:',
      numericAmount
    );

    console.error(
      'SOGO IDEMPOTENCY KEY:',
      idempotencyKey
    );

    let purchaseResponse;

    try {
      purchaseResponse =
        await fetch(
          `${sogoBaseUrl}/bills/electricity`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${sogoApiKey}`,
              'Content-Type':
                'application/json',
              'Idempotency-Key':
                idempotencyKey,
            },
            body: JSON.stringify({
              disco_slug:
                discoSlug,
              meter_number:
                normalizedMeterNumber,
              meter_type:
                normalizedMeterType,
              amount:
                numericAmount,
            }),
          }
        );
    } catch (error) {
      console.error(
        'SOGO ELECTRICITY PURCHASE NETWORK ERROR:',
        error
      );

      /*
       * No HTTP response was received.
       *
       * Do not retry automatically.
       * Do not automatically refund.
       * The same idempotency key must be reconciled
       * before any retry.
       */

      return res.status(202).json({
        success: true,
        test_mode:
          sogoBaseUrl.includes(
            'sandbox'
          ),
        message:
          'Electricity payment is processing. Please do not retry.',
        data: {
          reference,
          provider_request_id:
            idempotencyKey,
          status:
            'processing',
          amount:
            numericAmount,
          currency:
            'NGN',
        },
      });
    }

    // ========================================================
    // READ SOGO RESPONSE
    // ========================================================

    let purchaseResult = null;

    try {
      purchaseResult =
        await purchaseResponse.json();
    } catch (error) {
      purchaseResult = null;

      console.error(
        'SOGO RESPONSE JSON PARSE ERROR:',
        error
      );
    }

    // ========================================================
    // SOGO DIAGNOSTICS
    // ========================================================

    console.error(
      '========== SOGO ELECTRICITY PURCHASE RESPONSE =========='
    );

    console.error(
      'SOGO ELECTRICITY PURCHASE HTTP STATUS:',
      purchaseResponse.status
    );

    console.error(
      'SOGO ELECTRICITY PURCHASE OK:',
      purchaseResponse.ok
    );

    console.error(
      'SOGO ELECTRICITY PURCHASE RESPONSE:',
      JSON.stringify(
        purchaseResult
      )
    );

    // ========================================================
    // NORMALIZE SOGO RESPONSE
    // ========================================================

    /*
     * Sogo can return bill purchase data in different
     * wrapper shapes.
     *
     * The actual response we observed from Sogo is:
     *
     * {
     *   "message": "...",
     *   "transaction": {
     *     "status": {
     *       "value": "completed",
     *       "is_final": true
     *     },
     *     "reference": "SBX..."
     *   }
     * }
     *
     * Therefore we explicitly support:
     *
     * purchaseResult.transaction
     * purchaseResult.data.transaction
     * purchaseResult.data
     * purchaseResult
     */

    const rawProviderData =
      purchaseResult?.data ||
      purchaseResult ||
      {};

    const purchaseData =
      rawProviderData?.transaction ||
      purchaseResult?.transaction ||
      rawProviderData;

    // ========================================================
    // PROVIDER STATUS
    // ========================================================

    const providerStatus =
      String(
        purchaseData?.status?.value ||
        purchaseData?.status ||
        rawProviderData?.status?.value ||
        rawProviderData?.status ||
        purchaseResult?.status?.value ||
        purchaseResult?.status ||
        ''
      )
        .trim()
        .toLowerCase();

    // ========================================================
    // PROVIDER REFERENCE
    // ========================================================

    const providerReference =
      purchaseData?.reference ||
      rawProviderData?.reference ||
      purchaseResult?.reference ||
      null;

    // ========================================================
    // PROVIDER MESSAGE
    // ========================================================

    const providerMessage =
      purchaseResult?.message ||
      purchaseData?.message ||
      rawProviderData?.message ||
      null;

    // ========================================================
    // ELECTRICITY TOKEN
    // ========================================================

    const electricityToken =
      purchaseData?.token ||
      purchaseData?.electricity_token ||
      purchaseData?.token_code ||
      purchaseData?.prepaid_token ||
      purchaseData?.pin ||
      rawProviderData?.token ||
      rawProviderData?.electricity_token ||
      rawProviderData?.token_code ||
      rawProviderData?.prepaid_token ||
      purchaseResult?.token ||
      purchaseResult?.electricity_token ||
      null;

    // ========================================================
    // UNITS
    // ========================================================

    const units =
      purchaseData?.units ||
      purchaseData?.unit ||
      purchaseData?.kwh ||
      rawProviderData?.units ||
      rawProviderData?.unit ||
      rawProviderData?.kwh ||
      purchaseResult?.units ||
      purchaseResult?.unit ||
      purchaseResult?.kwh ||
      null;

    // ========================================================
    // FINAL STATUS DIAGNOSTICS
    // ========================================================

    console.error(
      '========== NORMALIZED SOGO ELECTRICITY RESPONSE =========='
    );

    console.error(
      'RAW PROVIDER DATA:',
      JSON.stringify(
        rawProviderData
      )
    );

    console.error(
      'NORMALIZED PROVIDER DATA:',
      JSON.stringify(
        purchaseData
      )
    );

    console.error(
      'NORMALIZED PROVIDER STATUS:',
      providerStatus
    );

    console.error(
      'NORMALIZED PROVIDER REFERENCE:',
      providerReference
    );

    console.error(
      'ELECTRICITY TOKEN PRESENT:',
      Boolean(
        electricityToken
      )
    );

    console.error(
      'ELECTRICITY UNITS:',
      units
    );

    // ========================================================
    // COMPLETED
    // ========================================================

    if (
      purchaseResponse.status >= 200 &&
      purchaseResponse.status < 300 &&
      providerStatus === 'completed'
    ) {
      console.log(
        '✅ SOGO ELECTRICITY PAYMENT CONFIRMED COMPLETED'
      );

      const completeClient =
        await pool.connect();

      try {
        await completeClient.query(
          'BEGIN'
        );

        await completeClient.query(
          `
            UPDATE bill_payments
            SET
              status = 'completed',
              provider_reference = $1,
              provider_response = $2,
              provider_response_message = $3,
              electricity_token = $4,
              units = $5,
              completed_at = CURRENT_TIMESTAMP
            WHERE id = $6
          `,
          [
            providerReference,
            purchaseResult,
            providerMessage,
            electricityToken,
            units,
            billPaymentId,
          ]
        );

        await completeClient.query(
          `
            UPDATE transactions
            SET
              status = 'completed'
            WHERE id = $1
          `,
          [transactionId]
        );

        await completeClient.query(
          'COMMIT'
        );
      } catch (error) {
        try {
          await completeClient.query(
            'ROLLBACK'
          );
        } catch (rollbackError) {
          console.error(
            'Completion rollback error:',
            rollbackError
          );
        }

        console.error(
          'Electricity completion database error:',
          error
        );

        /*
         * Sogo already completed the payment.
         *
         * Never refund merely because our local
         * database update failed.
         */

        return res.status(202).json({
          success: true,
          message:
            'Electricity payment was completed and is being finalized.',
          data: {
            reference,
            provider_reference:
              providerReference,
            status:
              'completed',
            electricity_token:
              electricityToken,
            units,
          },
        });
      } finally {
        completeClient.release();
      }

      return res.status(200).json({
        success: true,

        test_mode:
          sogoBaseUrl.includes(
            'sandbox'
          ),

        message:
          'Electricity payment successful.',

        data: {
          reference,

          provider_reference:
            providerReference,

          provider:
            normalizedProvider,

          disco_slug:
            discoSlug,

          customer_name:
            verification.customer_name ||
            null,

          address:
            verification.address ||
            null,

          meter_number:
            normalizedMeterNumber,

          meter_type:
            normalizedMeterType,

          amount:
            numericAmount,

          currency:
            'NGN',

          status:
            'completed',

          electricity_token:
            electricityToken,

          units,

          provider_message:
            providerMessage,
        },
      });
    }

    // ========================================================
    // PROCESSING / PENDING
    // ========================================================

    if (
      purchaseResponse.status >= 200 &&
      purchaseResponse.status < 300 &&
      (
        providerStatus === 'processing' ||
        providerStatus === 'pending'
      )
    ) {
      await pool.query(
        `
          UPDATE bill_payments
          SET
            status = 'processing',
            provider_reference = $1,
            provider_response = $2,
            provider_response_message = $3
          WHERE id = $4
        `,
        [
          providerReference,
          purchaseResult,
          providerMessage,
          billPaymentId,
        ]
      );

      await pool.query(
        `
          UPDATE transactions
          SET
            status = 'processing'
          WHERE id = $1
        `,
        [transactionId]
      );

      return res.status(202).json({
        success: true,

        test_mode:
          sogoBaseUrl.includes(
            'sandbox'
          ),

        message:
          'Electricity payment is processing. Please do not retry.',

        data: {
          reference,

          provider_reference:
            providerReference,

          provider:
            normalizedProvider,

          meter_number:
            normalizedMeterNumber,

          meter_type:
            normalizedMeterType,

          amount:
            numericAmount,

          currency:
            'NGN',

          status:
            'processing',
        },
      });
    }

    // ========================================================
    // PROVIDER FAILED
    // ========================================================

    if (
      providerStatus === 'failed'
    ) {
      console.error(
        'SOGO ELECTRICITY PAYMENT FAILED:',
        JSON.stringify(
          purchaseResult
        )
      );

      const refundClient =
        await pool.connect();

      try {
        await refundClient.query(
          'BEGIN'
        );

        const refundAccountResult =
          await refundClient.query(
            `
              SELECT
                id,
                balance
              FROM accounts
              WHERE id = $1
              FOR UPDATE
            `,
            [account.id]
          );

        if (
          refundAccountResult.rows.length === 0
        ) {
          throw new Error(
            'Customer account not found during electricity refund.'
          );
        }

        const currentBalance =
          Number(
            refundAccountResult.rows[0]
              .balance
          );

        const refundedBalance =
          currentBalance +
          numericAmount;

        await refundClient.query(
          `
            UPDATE accounts
            SET
              balance = $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `,
          [
            refundedBalance,
            account.id,
          ]
        );

        await refundClient.query(
          `
            UPDATE bill_payments
            SET
              status = 'failed',
              provider_reference = $1,
              provider_response = $2,
              provider_response_message = $3,
              failure_reason = $3
            WHERE id = $4
          `,
          [
            providerReference,
            purchaseResult,
            providerMessage ||
              'Electricity provider rejected the payment.',
            billPaymentId,
          ]
        );

        await refundClient.query(
          `
            UPDATE transactions
            SET
              status = 'failed'
            WHERE id = $1
          `,
          [transactionId]
        );

        await refundClient.query(
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
              balance_after,
              transaction_fee
            )
            VALUES (
              $1,
              'electricity_payment_refund',
              $2,
              'NGN',
              $3,
              $4,
              'completed',
              $5,
              $6,
              0
            )
          `,
          [
            account.id,
            numericAmount,
            `${reference}-REFUND`,
            `Refund for failed electricity payment ${reference}`,
            currentBalance,
            refundedBalance,
          ]
        );

        await refundClient.query(
          'COMMIT'
        );
      } catch (error) {
        try {
          await refundClient.query(
            'ROLLBACK'
          );
        } catch (rollbackError) {
          console.error(
            'Electricity failure refund rollback error:',
            rollbackError
          );
        }

        console.error(
          'Electricity failure refund database error:',
          error
        );

        return res.status(500).json({
          success: false,
          message:
            'The electricity provider rejected the payment, but the local refund could not be completed automatically. Please contact Zenimonies support.',
          data: {
            reference,
            provider_reference:
              providerReference,
            status:
              'refund_pending',
          },
        });
      } finally {
        refundClient.release();
      }

      return res.status(502).json({
        success: false,

        message:
          providerMessage ||
          'Electricity payment failed. Your funds have been returned.',

        data: {
          reference,

          provider_reference:
            providerReference,

          status:
            'failed',
        },
      });
    }

    // ========================================================
    // PROVIDER REFUNDED
    // ========================================================

    if (
      providerStatus === 'refunded'
    ) {
      console.error(
        'SOGO ELECTRICITY PAYMENT REFUNDED:',
        JSON.stringify(
          purchaseResult
        )
      );

      const refundClient =
        await pool.connect();

      try {
        await refundClient.query(
          'BEGIN'
        );

        const refundAccountResult =
          await refundClient.query(
            `
              SELECT
                id,
                balance
              FROM accounts
              WHERE id = $1
              FOR UPDATE
            `,
            [account.id]
          );

        if (
          refundAccountResult.rows.length === 0
        ) {
          throw new Error(
            'Customer account not found during provider refund.'
          );
        }

        const currentBalance =
          Number(
            refundAccountResult.rows[0]
              .balance
          );

        const refundedBalance =
          currentBalance +
          numericAmount;

        await refundClient.query(
          `
            UPDATE accounts
            SET
              balance = $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `,
          [
            refundedBalance,
            account.id,
          ]
        );

        await refundClient.query(
          `
            UPDATE bill_payments
            SET
              status = 'refunded',
              provider_reference = $1,
              provider_response = $2,
              provider_response_message = $3,
              completed_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `,
          [
            providerReference,
            purchaseResult,
            providerMessage,
            billPaymentId,
          ]
        );

        await refundClient.query(
          `
            UPDATE transactions
            SET
              status = 'refunded'
            WHERE id = $1
          `,
          [transactionId]
        );

        await refundClient.query(
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
              balance_after,
              transaction_fee
            )
            VALUES (
              $1,
              'electricity_payment_refund',
              $2,
              'NGN',
              $3,
              $4,
              'completed',
              $5,
              $6,
              0
            )
          `,
          [
            account.id,
            numericAmount,
            `${reference}-REFUND`,
            `Refund for electricity payment ${reference}`,
            currentBalance,
            refundedBalance,
          ]
        );

        await refundClient.query(
          'COMMIT'
        );
      } catch (error) {
        try {
          await refundClient.query(
            'ROLLBACK'
          );
        } catch (rollbackError) {
          console.error(
            'Provider refund rollback error:',
            rollbackError
          );
        }

        console.error(
          'Provider refund database error:',
          error
        );

        return res.status(500).json({
          success: false,

          message:
            'The electricity provider refunded the payment, but the local refund could not be completed automatically. Please contact Zenimonies support.',

          data: {
            reference,

            provider_reference:
              providerReference,

            status:
              'refund_pending',
          },
        });
      } finally {
        refundClient.release();
      }

      return res.status(502).json({
        success: false,

        message:
          'The electricity provider refunded this payment. Your funds have been returned.',

        data: {
          reference,

          provider_reference:
            providerReference,

          status:
            'refunded',
        },
      });
    }

    // ========================================================
    // UNEXPECTED PROVIDER RESPONSE
    // ========================================================

    console.error(
      '========== UNEXPECTED SOGO ELECTRICITY RESPONSE =========='
    );

    console.error(
      'SOGO HTTP STATUS:',
      purchaseResponse.status
    );

    console.error(
      'SOGO PROVIDER STATUS:',
      providerStatus
    );

    console.error(
      'SOGO PROVIDER REFERENCE:',
      providerReference
    );

    console.error(
      'SOGO FULL RESPONSE:',
      JSON.stringify(
        purchaseResult
      )
    );

    /*
     * IMPORTANT:
     *
     * We do NOT automatically refund an unknown response.
     *
     * The provider may have accepted the payment even though
     * the response format was unexpected.
     *
     * The payment must be reconciled before any local refund.
     */

    await pool.query(
      `
        UPDATE bill_payments
        SET
          status = 'provider_response_unrecognized',
          provider_reference = $1,
          provider_response = $2,
          provider_response_message = $3
        WHERE id = $4
      `,
      [
        providerReference,
        purchaseResult,
        providerMessage,
        billPaymentId,
      ]
    );

    await pool.query(
      `
        UPDATE transactions
        SET
          status = 'provider_response_unrecognized'
        WHERE id = $1
      `,
      [transactionId]
    );

    return res.status(502).json({
      success: false,

      message:
        'The electricity provider returned an unexpected payment status. Your payment has not been confirmed. Please contact Zenimonies support before trying again.',

      data: {
        reference,

        provider_reference:
          providerReference,

        provider_http_status:
          purchaseResponse.status,

        provider_status:
          providerStatus ||
          null,

        status:
          'provider_response_unrecognized',
      },
    });
  } catch (error) {
    console.error(
      '============================================================'
    );

    console.error(
      'ELECTRICITY PURCHASE ERROR:',
      error
    );

    console.error(
      '============================================================'
    );

    if (client) {
      try {
        await client.query(
          'ROLLBACK'
        );
      } catch (rollbackError) {
        console.error(
          'Rollback error:',
          rollbackError
        );
      }

      client.release();
      client = null;
    }

    return res.status(500).json({
      success: false,

      message:
        'Unable to process electricity payment.',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  purchaseElectricity,
};
