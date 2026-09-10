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

    /*
     * Paystack signs the RAW request body.
     *
     * The route must therefore use express.raw()
     * before JSON parsing.
     */

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
// PAYSTACK WEBHOOK
// ============================================================

const handlePaystackWebhook = async (
  req,
  res
) => {
  /*
   * ----------------------------------------------------------
   * VERIFY SIGNATURE FIRST
   * ----------------------------------------------------------
   */

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


  // ==========================================================
  // TRANSFER SUCCESS
  // ==========================================================

  if (event.event === 'transfer.success') {
    const transfer = event.data || {};

    const reference =
      transfer.reference;

    if (!reference) {
      return res.status(200).json({
        success: true,
        message:
          'Transfer webhook received without reference',
      });
    }

    const client =
      await pool.connect();

    try {
      await client.query('BEGIN');

      /*
       * Lock the transfer row so two webhook deliveries
       * cannot process the same transfer simultaneously.
       */

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

      if (transferResult.rows.length === 0) {
        await client.query('ROLLBACK');

        /*
         * We acknowledge unknown references because they
         * do not belong to this application.
         */

        return res.status(200).json({
          success: true,
          message:
            'Transfer reference not found',
        });
      }

      const zenTransfer =
        transferResult.rows[0];


      /*
       * ------------------------------------------------------
       * IDEMPOTENCY
       * ------------------------------------------------------
       */

      if (
        zenTransfer.status ===
        'completed'
      ) {
        await client.query('ROLLBACK');

        return res.status(200).json({
          success: true,
          message:
            'Transfer already processed',
        });
      }


      /*
       * ------------------------------------------------------
       * MARK TRANSFER COMPLETED
       * ------------------------------------------------------
       */

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
          zenTransfer.id,
        ]
      );


      /*
       * ------------------------------------------------------
       * UPDATE ORIGINAL TRANSACTION
       * ------------------------------------------------------
       */

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

      return res.status(200).json({
        success: true,
        message:
          'Transfer success processed',
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {}

      console.error(
        'Transfer success processing error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to process transfer success',
      });
    } finally {
      client.release();
    }
  }


  // ==========================================================
  // TRANSFER FAILED
  // ==========================================================

  if (event.event === 'transfer.failed') {
    const transfer = event.data || {};

    const reference =
      transfer.reference;

    if (!reference) {
      return res.status(200).json({
        success: true,
        message:
          'Transfer webhook received without reference',
      });
    }

    const client =
      await pool.connect();

    try {
      await client.query('BEGIN');


      /*
       * ------------------------------------------------------
       * LOCK TRANSFER
       * ------------------------------------------------------
       */

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

      if (transferResult.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(200).json({
          success: true,
          message:
            'Transfer reference not found',
        });
      }

      const zenTransfer =
        transferResult.rows[0];


      /*
       * ------------------------------------------------------
       * IDEMPOTENCY
       *
       * A failed transfer may be delivered more than once.
       * Never refund it twice.
       * ------------------------------------------------------
       */

      if (
        zenTransfer.status ===
        'failed'
      ) {
        await client.query('ROLLBACK');

        return res.status(200).json({
          success: true,
          message:
            'Transfer already marked failed',
        });
      }


      /*
       * ------------------------------------------------------
       * MARK TRANSFER FAILED
       * ------------------------------------------------------
       */

      const failureReason =
        transfer.reason ||
        transfer.failure_reason ||
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
          zenTransfer.id,
        ]
      );


      /*
       * ------------------------------------------------------
       * LOCK ACCOUNT
       * ------------------------------------------------------
       */

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
          [zenTransfer.account_id]
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
        Number(zenTransfer.amount);


      if (
        !Number.isFinite(refundAmount) ||
        refundAmount <= 0
      ) {
        throw new Error(
          'Invalid transfer refund amount'
        );
      }


      const newBalance =
        oldBalance + refundAmount;


      /*
       * ------------------------------------------------------
       * REFUND BALANCE
       * ------------------------------------------------------
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
          newBalance,
          account.id,
        ]
      );


      /*
       * ------------------------------------------------------
       * MARK ORIGINAL TRANSACTION FAILED
       * ------------------------------------------------------
       */

      await client.query(
        `
        UPDATE transactions
        SET
          status = 'failed'
        WHERE reference = $1
        `,
        [reference]
      );


      /*
       * ------------------------------------------------------
       * CREATE REFUND TRANSACTION
       * ------------------------------------------------------
       */

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
          zenTransfer.currency ||
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

      return res.status(200).json({
        success: true,
        message:
          'Transfer failure processed and balance refunded',
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {}

      console.error(
        'Transfer failure processing error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to process transfer failure',
      });
    } finally {
      client.release();
    }
  }


  // ==========================================================
  // OTHER PAYSTACK EVENTS
  // ==========================================================

  /*
   * We acknowledge events that this webhook does not
   * currently process.
   *
   * IMPORTANT:
   * This does NOT credit an account.
   */

  console.log(
    `Paystack event acknowledged without processing: ${event.event}`
  );

  return res.status(200).json({
    success: true,
    message: 'Webhook received',
  });
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  handlePaystackWebhook,
};
