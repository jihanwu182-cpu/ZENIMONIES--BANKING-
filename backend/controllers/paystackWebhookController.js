const crypto = require('crypto');

const pool = require('../config/database');

/*
 * ============================================================
 * VERIFY PAYSTACK WEBHOOK SIGNATURE
 * ============================================================
 */

const verifyPaystackSignature = (req) => {
  const secretKey =
    process.env.PAYSTACK_SECRET_KEY;

  const signature =
    req.headers['x-paystack-signature'];

  if (!secretKey || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(req.body))
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
};


/*
 * ============================================================
 * PAYSTACK WEBHOOK
 * ============================================================
 */

const handlePaystackWebhook = async (
  req,
  res
) => {
  try {
    /*
     * Never process an unverified webhook.
     */

    if (!verifyPaystackSignature(req)) {
      console.error(
        'Invalid Paystack webhook signature'
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body;

    console.log(
      'Paystack webhook received:',
      event?.event
    );

    /*
     * --------------------------------------------------------
     * TRANSFER SUCCESS
     * --------------------------------------------------------
     */

    if (event.event === 'transfer.success') {
      const transfer = event.data;

      const reference =
        transfer?.reference;

      if (!reference) {
        return res.status(200).json({
          success: true,
          message:
            'Webhook received without reference',
        });
      }

      const client =
        await pool.connect();

      try {
        await client.query('BEGIN');

        /*
         * Find the Zenimonies transfer.
         */

        const transferResult =
          await client.query(
            `SELECT
              id,
              account_id,
              amount,
              currency,
              reference,
              status
             FROM bank_transfers
             WHERE reference = $1
             FOR UPDATE`,
            [reference]
          );

        /*
         * If we don't know the reference, acknowledge
         * the webhook without changing anything.
         */

        if (
          transferResult.rows.length === 0
        ) {
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
         * Idempotency:
         *
         * If the transfer is already completed, do not
         * apply the success logic again.
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
         * Update the bank transfer.
         */

        await client.query(
          `UPDATE bank_transfers
           SET
             status = 'completed',
             provider_reference = $1,
             completed_at =
               CURRENT_TIMESTAMP,
             failure_reason = NULL
           WHERE id = $2`,
          [
            transfer?.reference ||
              null,
            zenTransfer.id,
          ]
        );

        /*
         * Update the corresponding transaction.
         */

        await client.query(
          `UPDATE transactions
           SET status = 'completed'
           WHERE reference = $1`,
          [reference]
        );

        await client.query('COMMIT');

        console.log(
          `Transfer ${reference} marked completed`
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

        throw error;
      } finally {
        client.release();
      }
    }


    /*
     * --------------------------------------------------------
     * TRANSFER FAILED
     * --------------------------------------------------------
     */

    if (event.event === 'transfer.failed') {
      const transfer = event.data;

      const reference =
        transfer?.reference;

      if (!reference) {
        return res.status(200).json({
          success: true,
          message:
            'Webhook received without reference',
        });
      }

      const client =
        await pool.connect();

      try {
        await client.query('BEGIN');

        /*
         * Lock the transfer.
         */

        const transferResult =
          await client.query(
            `SELECT
              id,
              account_id,
              amount,
              currency,
              reference,
              status
             FROM bank_transfers
             WHERE reference = $1
             FOR UPDATE`,
            [reference]
          );

        if (
          transferResult.rows.length === 0
        ) {
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
         * Idempotency:
         *
         * Do not refund the same failed transfer twice.
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
         * Mark bank transfer failed.
         */

        await client.query(
          `UPDATE bank_transfers
           SET
             status = 'failed',
             provider_reference = $1,
             failure_reason = $2
           WHERE id = $3`,
          [
            transfer?.reference ||
              null,

            transfer?.reason ||
              transfer?.failure_reason ||
              'Paystack transfer failed',

            zenTransfer.id,
          ]
        );

        /*
         * Lock the customer's account.
         */

        const accountResult =
          await client.query(
            `SELECT
              id,
              balance,
              currency
             FROM accounts
             WHERE id = $1
             FOR UPDATE`,
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

        const newBalance =
          oldBalance + refundAmount;

        /*
         * Refund the customer's balance because the
         * transfer failed.
         */

        await client.query(
          `UPDATE accounts
           SET
             balance = $1,
             updated_at =
               CURRENT_TIMESTAMP
           WHERE id = $2`,
          [
            newBalance,
            account.id,
          ]
        );

        /*
         * Mark the original transaction failed.
         */

        await client.query(
          `UPDATE transactions
           SET status = 'failed'
           WHERE reference = $1`,
          [reference]
        );

        /*
         * Create a separate refund transaction so the
         * account history clearly shows why the balance
         * increased.
         */

        const refundReference =
          `ZEN-REF-${Date.now()}-${crypto
            .randomBytes(4)
            .toString('hex')
            .toUpperCase()}`;

        await client.query(
          `INSERT INTO transactions (
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
          )`,
          [
            account.id,
            refundAmount,
            zenTransfer.currency,
            refundReference,
            `Refund for failed bank transfer ${reference}`,
            oldBalance,
            newBalance,
          ]
        );

        await client.query('COMMIT');

        console.log(
          `Transfer ${reference} failed and ${refundAmount} NGN was refunded`
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

        throw error;
      } finally {
        client.release();
      }
    }


    /*
     * --------------------------------------------------------
     * OTHER PAYSTACK EVENTS
     * --------------------------------------------------------
     *
     * We acknowledge events we don't currently need.
     */

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error(
      'Paystack webhook error:',
      error
    );

    /*
     * Return an error so the event can be retried
     * rather than silently pretending processing succeeded.
     */

    return res.status(500).json({
      success: false,
      message:
        'Unable to process webhook',
    });
  }
};


module.exports = {
  handlePaystackWebhook,
};
