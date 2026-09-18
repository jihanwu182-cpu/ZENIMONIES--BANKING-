const crypto = require('crypto');

const pool = require('../config/database');

const {
  purchaseAirtime,
  generateRequestId,
} = require('../services/airtimeService');


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    null
  );
};


const normalizePhone = (phone) => {
  if (!phone) {
    return '';
  }

  return String(phone)
    .trim()
    .replace(/\s+/g, '')
    .replace(/^\+234/, '0')
    .replace(/^234/, '0');
};


const normalizeNetwork = (network) => {
  const value =
    String(network || '')
      .trim()
      .toLowerCase();

  if (value === 'mtn') {
    return 'MTN';
  }

  if (value === 'airtel') {
    return 'Airtel';
  }

  if (value === 'glo') {
    return 'Glo';
  }

  if (
    value === '9mobile' ||
    value === 'etisalat'
  ) {
    return '9mobile';
  }

  return '';
};


const generateReference = () => {
  return `ZEN-AIRTIME-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
};


const isValidNigerianPhone = (
  phone
) => {
  return /^0[789][01]\d{8}$/.test(
    phone
  );
};


const getProviderStatus = (
  response
) => {
  const code = String(
    response?.code ??
      response?.responseCode ??
      response?.content?.code ??
      ''
  )
    .trim()
    .toLowerCase();

  const content =
    response?.content || {};

  const status = String(
    content?.transactions?.status ||
      content?.transaction?.status ||
      content?.status ||
      response?.status ||
      ''
  )
    .trim()
    .toLowerCase();


  /*
   * VTpass successful response.
   */

  if (
    code === '000' &&
    (
      status === '' ||
      status === 'delivered' ||
      status === 'completed' ||
      status === 'successful' ||
      status === 'success'
    )
  ) {
    return 'completed';
  }


  /*
   * VTpass pending response.
   */

  if (
    code === '099' ||
    status === 'pending' ||
    status === 'initiated' ||
    status === 'processing'
  ) {
    return 'pending';
  }


  /*
   * Explicit failed response.
   */

  return 'failed';
};


const getProviderReference = (
  response,
  fallback
) => {
  return (
    response?.content?.transactions
      ?.transactionId ||
    response?.content?.transactionId ||
    response?.content?.transactions
      ?.requestId ||
    response?.requestId ||
    response?.transactionId ||
    fallback
  );
};


const getCommissionDetails = (
  response
) => {
  const content =
    response?.content || {};

  return (
    content?.transactions
      ?.commissionDetails ||
    content?.transactions
      ?.commission_details ||
    content?.commissionDetails ||
    content?.commission_details ||
    response?.commissionDetails ||
    response?.commission_details ||
    null
  );
};


/*
 * ============================================================
 * BUY AIRTIME
 * ============================================================
 */

const buyAirtime = async (
  req,
  res
) => {
  const userId =
    getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message:
        'Authentication required.',
    });
  }


  /*
   * ----------------------------------------------------------
   * INPUT
   * ----------------------------------------------------------
   */

  const {
    network,
    phone,
    amount,
  } = req.body || {};


  const normalizedNetwork =
    normalizeNetwork(
      network
    );


  const normalizedPhone =
    normalizePhone(
      phone
    );


  const numericAmount =
    Number(amount);


  /*
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  if (!normalizedNetwork) {
    return res.status(400).json({
      success: false,
      message:
        'Please select a valid network.',
    });
  }


  if (
    !isValidNigerianPhone(
      normalizedPhone
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Please enter a valid Nigerian phone number.',
    });
  }


  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Please enter a valid airtime amount.',
    });
  }


  if (
    numericAmount > 100000
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Airtime amount cannot exceed ₦100,000.',
    });
  }


  if (
    Math.round(
      numericAmount * 100
    ) !==
    numericAmount * 100
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Airtime amount can have a maximum of two decimal places.',
    });
  }


  /*
   * ----------------------------------------------------------
   * REFERENCES
   * ----------------------------------------------------------
   */

  const reference =
    generateReference();

  const providerRequestId =
    generateRequestId();


  /*
   * ----------------------------------------------------------
   * DATABASE CLIENT
   * ----------------------------------------------------------
   */

  const client =
    await pool.connect();


  let transactionStarted =
    false;


  try {

    /*
     * ========================================================
     * LOCK SENDER ACCOUNT
     * ========================================================
     */

    await client.query(
      'BEGIN'
    );

    transactionStarted = true;


    const accountResult =
      await client.query(
        `
        SELECT
          id,
          user_id,
          account_number,
          account_type,
          currency,
          balance,
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
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'Active NGN account not found.',
      });
    }


    const account =
      accountResult.rows[0];


    const balance =
      Number(
        account.balance
      );


    /*
     * ========================================================
     * BALANCE CHECK
     * ========================================================
     */

    if (
      !Number.isFinite(balance)
    ) {
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(500).json({
        success: false,
        message:
          'Unable to verify account balance.',
      });
    }


    if (
      balance <
      numericAmount
    ) {
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Insufficient balance.',
      });
    }


    /*
     * ========================================================
     * BALANCE VALUES
     * ========================================================
     */

    const balanceBefore =
      balance;


    const balanceAfter =
      Number(
        (
          balance -
          numericAmount
        ).toFixed(2)
      );


    /*
     * ========================================================
     * CREATE AIRTIME TRANSACTION
     * ========================================================
     */

    await client.query(
      `
      INSERT INTO airtime_transactions (
        account_id,
        user_id,
        reference,
        provider_request_id,
        network,
        phone,
        amount,
        currency,
        status,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        'NGN',
        'pending',
        CURRENT_TIMESTAMP
      )
      `,
      [
        account.id,
        userId,
        reference,
        providerRequestId,
        normalizedNetwork,
        normalizedPhone,
        numericAmount,
      ]
    );


    /*
     * ========================================================
     * CREATE CENTRAL TRANSACTION
     * ========================================================
     */

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
          created_at
        )
        VALUES (
          $1,
          'airtime_purchase',
          $2,
          'NGN',
          $3,
          $4,
          'pending',
          $5,
          $6,
          CURRENT_TIMESTAMP
        )
        RETURNING
          id,
          created_at
        `,
        [
          account.id,
          numericAmount,
          reference,
          `Airtime purchase - ${normalizedNetwork} - ${normalizedPhone}`,
          balanceBefore,
          balanceAfter,
        ]
      );


    /*
     * ========================================================
     * DEDUCT WALLET
     * ========================================================
     */

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


    /*
     * ========================================================
     * COMMIT WALLET DEDUCTION
     * ========================================================
     *
     * The wallet deduction and pending records are committed
     * before contacting VTpass.
     *
     * If VTpass times out, the transaction remains pending and
     * can later be resolved through the requery endpoint.
     */

    await client.query(
      'COMMIT'
    );

    transactionStarted = false;


    /*
     * ========================================================
     * CALL VTPASS
     * ========================================================
     */

    let providerResponse;


    try {

      providerResponse =
        await purchaseAirtime({
          network:
            normalizedNetwork,

          phone:
            normalizedPhone,

          amount:
            numericAmount,

          requestId:
            providerRequestId,
        });

    } catch (providerError) {

      /*
       * IMPORTANT:
       *
       * The provider may have received the transaction even
       * when our HTTP request timed out.
       *
       * Therefore we DO NOT automatically refund here.
       *
       * The transaction stays pending and can be re-queried.
       */

      console.error(
        'Airtime provider request failed:',
        providerError?.message ||
          providerError
      );


      return res.status(202).json({
        success: true,

        message:
          'Airtime purchase is pending provider confirmation.',

        transaction: {
          id:
            transactionResult.rows[0]?.id,

          reference,

          provider_request_id:
            providerRequestId,

          network:
            normalizedNetwork,

          phone:
            normalizedPhone,

          amount:
            numericAmount,

          currency:
            'NGN',

          status:
            'pending',

          balance_before:
            balanceBefore,

          balance_after:
            balanceAfter,

          created_at:
            transactionResult.rows[0]?.created_at,
        },
      });
    }


    /*
     * ========================================================
     * PROVIDER STATUS
     * ========================================================
     */

    const providerStatus =
      getProviderStatus(
        providerResponse
      );


    const providerReference =
      getProviderReference(
        providerResponse,
        providerRequestId
      );


    const commissionDetails =
      getCommissionDetails(
        providerResponse
      );


    /*
     * ========================================================
     * COMPLETED
     * ========================================================
     */

    if (
      providerStatus ===
      'completed'
    ) {

      const updateClient =
        await pool.connect();

      try {

        await updateClient.query(
          'BEGIN'
        );


        const lockedResult =
          await updateClient.query(
            `
            SELECT
              id,
              status
            FROM airtime_transactions
            WHERE reference = $1
            FOR UPDATE
            `,
            [reference]
          );


        if (
          lockedResult.rows.length === 0
        ) {
          await updateClient.query(
            'ROLLBACK'
          );

          return res.status(500).json({
            success: false,
            message:
              'Airtime transaction record could not be found.',
          });
        }


        const currentStatus =
          lockedResult.rows[0].status;


        /*
         * Idempotency protection:
         * do not process a completed transaction twice.
         */

        if (
          currentStatus ===
          'completed'
        ) {
          await updateClient.query(
            'ROLLBACK'
          );

          return res.json({
            success: true,
            message:
              'Airtime purchase completed successfully.',
            reference,
            status:
              'completed',
          });
        }


        await updateClient.query(
          `
          UPDATE airtime_transactions
          SET
            provider_reference = $1,
            provider_request_id = $2,
            commission_details = $3,
            provider_response = $4,
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP
          WHERE reference = $5
          `,
          [
            providerReference,
            providerRequestId,
            commissionDetails
              ? JSON.stringify(
                  commissionDetails
                )
              : null,
            JSON.stringify(
              providerResponse
            ),
            reference,
          ]
        );


        await updateClient.query(
          `
          UPDATE transactions
          SET
            status = 'completed'
          WHERE reference = $1
          `,
          [reference]
        );


        await updateClient.query(
          'COMMIT'
        );


        return res.json({
          success: true,

          message:
            'Airtime purchase completed successfully.',

          transaction: {
            id:
              transactionResult.rows[0]?.id,

            reference,

            provider_reference:
              providerReference,

            provider_request_id:
              providerRequestId,

            network:
              normalizedNetwork,

            phone:
              normalizedPhone,

            amount:
              numericAmount,

            currency:
              'NGN',

            status:
              'completed',

            balance_before:
              balanceBefore,

            balance_after:
              balanceAfter,

            created_at:
              transactionResult.rows[0]?.created_at,
          },

          commissionDetails:
            commissionDetails ||
            null,
        });

      } catch (updateError) {

        try {
          await updateClient.query(
            'ROLLBACK'
          );
        } catch {
          // Ignore rollback error.
        }

        throw updateError;

      } finally {

        updateClient.release();
      }
    }


    /*
     * ========================================================
     * PENDING
     * ========================================================
     */

    if (
      providerStatus ===
      'pending'
    ) {

      await pool.query(
        `
        UPDATE airtime_transactions
        SET
          provider_reference = $1,
          provider_request_id = $2,
          commission_details = $3,
          provider_response = $4,
          status = 'pending'
        WHERE reference = $5
        `,
        [
          providerReference,
          providerRequestId,
          commissionDetails
            ? JSON.stringify(
                commissionDetails
              )
            : null,
          JSON.stringify(
            providerResponse
          ),
          reference,
        ]
      );


      await pool.query(
        `
        UPDATE transactions
        SET
          status = 'pending'
        WHERE reference = $1
        `,
        [reference]
      );


      return res.status(202).json({
        success: true,

        message:
          'Airtime purchase is pending provider confirmation.',

        transaction: {
          id:
            transactionResult.rows[0]?.id,

          reference,

          provider_reference:
            providerReference,

          provider_request_id:
            providerRequestId,

          network:
            normalizedNetwork,

          phone:
            normalizedPhone,

          amount:
            numericAmount,

          currency:
            'NGN',

          status:
            'pending',

          balance_before:
            balanceBefore,

          balance_after:
            balanceAfter,

          created_at:
            transactionResult.rows[0]?.created_at,
        },
      });
    }


    /*
     * ========================================================
     * FAILED
     * ========================================================
     *
     * The provider explicitly rejected the purchase.
     *
     * We refund the exact airtime amount once.
     */

    const refundClient =
      await pool.connect();

    try {

      await refundClient.query(
        'BEGIN'
      );


      const lockedResult =
        await refundClient.query(
          `
          SELECT
            id,
            account_id,
            amount,
            status
          FROM airtime_transactions
          WHERE reference = $1
          FOR UPDATE
          `,
          [reference]
        );


      if (
        lockedResult.rows.length === 0
      ) {
        await refundClient.query(
          'ROLLBACK'
        );

        return res.status(500).json({
          success: false,
          message:
            'Airtime transaction record could not be found for refund.',
        });
      }


      const airtimeRecord =
        lockedResult.rows[0];


      /*
       * Never refund a transaction that has already been
       * completed or failed.
       */

      if (
        airtimeRecord.status ===
          'completed' ||
        airtimeRecord.status ===
          'failed'
      ) {

        await refundClient.query(
          'ROLLBACK'
        );

        return res.status(400).json({
          success: false,
          message:
            'This airtime transaction has already been processed.',
        });
      }


      const lockedAccountResult =
        await refundClient.query(
          `
          SELECT
            id,
            balance
          FROM accounts
          WHERE id = $1
          FOR UPDATE
          `,
          [
            airtimeRecord.account_id,
          ]
        );


      if (
        lockedAccountResult.rows.length === 0
      ) {
        await refundClient.query(
          'ROLLBACK'
        );

        return res.status(500).json({
          success: false,
          message:
            'Account could not be found for refund reconciliation.',
        });
      }


      const currentBalance =
        Number(
          lockedAccountResult.rows[0]
            .balance
        );


      const refundAmount =
        Number(
          airtimeRecord.amount
        );


      const refundedBalance =
        Number(
          (
            currentBalance +
            refundAmount
          ).toFixed(2)
        );


      /*
       * Refund wallet.
       */

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
          airtimeRecord.account_id,
        ]
      );


      /*
       * Mark airtime transaction failed.
       */

      await refundClient.query(
        `
        UPDATE airtime_transactions
        SET
          provider_reference = $1,
          provider_request_id = $2,
          commission_details = $3,
          provider_response = $4,
          status = 'failed'
        WHERE reference = $5
        `,
        [
          providerReference,
          providerRequestId,
          commissionDetails
            ? JSON.stringify(
                commissionDetails
              )
            : null,
          JSON.stringify(
            providerResponse
          ),
          reference,
        ]
      );


      /*
       * Mark central transaction failed.
       */

      await refundClient.query(
        `
        UPDATE transactions
        SET
          status = 'failed',
          balance_after = $1
        WHERE reference = $2
        `,
        [
          refundedBalance,
          reference,
        ]
      );


      /*
       * Create a separate refund ledger record.
       */

      const refundReference =
        `ZEN-AIRTIME-REFUND-${Date.now()}-${crypto
          .randomBytes(4)
          .toString('hex')
          .toUpperCase()}`;


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
          created_at
        )
        VALUES (
          $1,
          'airtime_refund',
          $2,
          'NGN',
          $3,
          $4,
          'completed',
          $5,
          $6,
          CURRENT_TIMESTAMP
        )
        `,
        [
          airtimeRecord.account_id,
          refundAmount,
          refundReference,
          `Airtime refund - ${reference}`,
          currentBalance,
          refundedBalance,
        ]
      );


      await refundClient.query(
        'COMMIT'
      );


      return res.status(400).json({
        success: false,

        message:
          'Airtime purchase failed. Your money has been refunded.',

        transaction: {
          id:
            transactionResult.rows[0]?.id,

          reference,

          provider_reference:
            providerReference,

          provider_request_id:
            providerRequestId,

          network:
            normalizedNetwork,

          phone:
            normalizedPhone,

          amount:
            numericAmount,

          currency:
            'NGN',

          status:
            'failed',

          refunded:
            true,

          refund_reference:
            refundReference,

          balance_after:
            refundedBalance,
        },
      });

    } catch (refundError) {

      try {
        await refundClient.query(
          'ROLLBACK'
        );
      } catch {
        // Ignore rollback error.
      }


      console.error(
        'Airtime refund reconciliation failed:',
        refundError?.message ||
          refundError
      );


      return res.status(500).json({
        success: false,

        message:
          'The airtime provider reported a failure, but the refund requires reconciliation. Please do not retry the transaction yet.',

        reference,

        status:
          'reconciliation_required',
      });

    } finally {

      refundClient.release();
    }

  } catch (error) {

    if (
      transactionStarted
    ) {
      try {
        await client.query(
          'ROLLBACK'
        );
      } catch {
        // Ignore rollback error.
      }
    }


    console.error(
      'Airtime controller error:',
      error?.message ||
        error
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to process airtime purchase.',
    });

  } finally {

    client.release();
  }
};


/*
 * ============================================================
 * EXPORT
 * ============================================================
 */

module.exports = {
  buyAirtime,
};
