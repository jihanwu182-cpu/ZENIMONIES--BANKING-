const axios = require('axios');
const crypto = require('crypto');

const pool = require('../config/database');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/*
 * ============================================================
 * PAYSTACK HELPERS
 * ============================================================
 */

const getPaystackHeaders = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not configured'
    );
  }

  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
};

const generateReference = () => {
  return `ZEN-TRF-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

/*
 * Paystack expects NGN transfer amounts in kobo.
 */
const nairaToKobo = (amount) => {
  return Math.round(Number(amount) * 100);
};


/*
 * ============================================================
 * CREATE PAYSTACK TRANSFER RECIPIENT
 * ============================================================
 */

const createPaystackRecipient = async ({
  name,
  accountNumber,
  bankCode,
}) => {
  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/transferrecipient`,
    {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    },
    {
      headers: getPaystackHeaders(),
      timeout: 15000,
    }
  );

  if (
    !response.data?.status ||
    !response.data?.data
  ) {
    throw new Error(
      response.data?.message ||
        'Unable to create Paystack transfer recipient'
    );
  }

  return response.data.data;
};


/*
 * ============================================================
 * INITIATE PAYSTACK TRANSFER
 * ============================================================
 */

const initiatePaystackTransfer = async ({
  amount,
  recipientCode,
  reference,
  reason,
}) => {
  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/transfer`,
    {
      source: 'balance',
      amount: nairaToKobo(amount),
      recipient: recipientCode,
      reference,
      reason:
        reason ||
        'Zenimonies bank transfer',
    },
    {
      headers: getPaystackHeaders(),
      timeout: 15000,
    }
  );

  if (
    !response.data?.status ||
    !response.data?.data
  ) {
    throw new Error(
      response.data?.message ||
        'Unable to initiate Paystack transfer'
    );
  }

  return response.data.data;
};


/*
 * ============================================================
 * TRANSFER TO BANK
 * ============================================================
 */

const transferToBank = async (req, res) => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const userId = req.user.id;

    const {
      recipient_name,
      recipient_account_number,
      recipient_bank_name,
      recipient_bank_code,
      amount,
      narration,
    } = req.body;

    /*
     * --------------------------------------------------------
     * BASIC VALIDATION
     * --------------------------------------------------------
     */

    if (
      !recipient_name ||
      !recipient_account_number ||
      !recipient_bank_name ||
      !recipient_bank_code ||
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient name, account number, bank name, bank code, and amount are required',
      });
    }

    const cleanAccountNumber = String(
      recipient_account_number
    ).replace(/\D/g, '');

    if (cleanAccountNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient account number must contain exactly 10 digits',
      });
    }

    const cleanBankCode = String(
      recipient_bank_code
    ).trim();

    if (!cleanBankCode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient bank code is required',
      });
    }

    const transferAmount = Number(amount);

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer amount must be greater than zero',
      });
    }

    if (transferAmount > 100000000) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount is too large',
      });
    }

    /*
     * --------------------------------------------------------
     * PAYSTACK KEY CHECK
     * --------------------------------------------------------
     */

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message:
          'Bank transfer service is not configured yet.',
      });
    }

    /*
     * --------------------------------------------------------
     * START DATABASE TRANSACTION
     * --------------------------------------------------------
     */

    await client.query('BEGIN');
    transactionStarted = true;

    /*
     * Lock the user's account so two simultaneous transfers
     * cannot spend the same balance.
     */

    const accountResult = await client.query(
      `SELECT
        id,
        account_number,
        currency,
        balance,
        status
       FROM accounts
       WHERE user_id = $1
         AND status = 'active'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'Active account not found',
      });
    }

    const account = accountResult.rows[0];

    /*
     * Only NGN is supported by this transfer flow.
     */

    if (
      String(account.currency).toUpperCase() !==
      'NGN'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'This transfer service currently supports NGN accounts only',
      });
    }

    const currentBalance = Number(
      account.balance
    );

    /*
     * --------------------------------------------------------
     * CHECK BALANCE
     * --------------------------------------------------------
     */

    if (currentBalance < transferAmount) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Insufficient account balance',
      });
    }

    /*
     * --------------------------------------------------------
     * CREATE OUR INTERNAL REFERENCE
     * --------------------------------------------------------
     */

    const reference = generateReference();

    /*
     * --------------------------------------------------------
     * CREATE INITIAL TRANSFER RECORD
     * --------------------------------------------------------
     *
     * We record it as pending before contacting Paystack.
     */

    const transferResult = await client.query(
      `INSERT INTO bank_transfers (
        account_id,
        recipient_name,
        recipient_account_number,
        recipient_bank_name,
        recipient_bank_code,
        amount,
        currency,
        narration,
        reference,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        'pending'
      )
      RETURNING
        id,
        account_id,
        recipient_name,
        recipient_account_number,
        recipient_bank_name,
        recipient_bank_code,
        amount,
        currency,
        narration,
        reference,
        status,
        created_at`,
      [
        account.id,
        String(recipient_name).trim(),
        cleanAccountNumber,
        String(recipient_bank_name).trim(),
        cleanBankCode,
        transferAmount,
        'NGN',
        narration
          ? String(narration).trim()
          : null,
        reference,
      ]
    );

    const transfer =
      transferResult.rows[0];

    /*
     * --------------------------------------------------------
     * CREATE PAYSTACK RECIPIENT
     * --------------------------------------------------------
     */

    let paystackRecipient;

    try {
      paystackRecipient =
        await createPaystackRecipient({
          name: String(
            recipient_name
          ).trim(),
          accountNumber:
            cleanAccountNumber,
          bankCode: cleanBankCode,
        });
    } catch (error) {
      const providerMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create transfer recipient';

      await client.query(
        `UPDATE bank_transfers
         SET
           status = 'failed',
           failure_reason = $1
         WHERE id = $2`,
        [
          providerMessage,
          transfer.id,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Unable to create the bank transfer recipient',
      });
    }

    /*
     * --------------------------------------------------------
     * INITIATE PAYSTACK TRANSFER
     * --------------------------------------------------------
     */

    let paystackTransfer;

    try {
      paystackTransfer =
        await initiatePaystackTransfer({
          amount: transferAmount,
          recipientCode:
            paystackRecipient.recipient_code,
          reference,
          reason:
            narration ||
            `Zenimonies transfer to ${recipient_name}`,
        });
    } catch (error) {
      const providerMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to initiate transfer';

      await client.query(
        `UPDATE bank_transfers
         SET
           status = 'failed',
           failure_reason = $1
         WHERE id = $2`,
        [
          providerMessage,
          transfer.id,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'The bank transfer could not be initiated',
      });
    }

    /*
     * --------------------------------------------------------
     * PAYSTACK ACCEPTED THE TRANSFER
     * --------------------------------------------------------
     *
     * IMPORTANT:
     *
     * "processing" does NOT mean the recipient has received
     * the money.
     *
     * Paystack must later confirm the final status through
     * its transfer webhook/event.
     */

    const providerReference =
      paystackTransfer.reference ||
      paystackTransfer.transfer_code ||
      null;

    await client.query(
      `UPDATE bank_transfers
       SET
         status = 'processing',
         provider_reference = $1
       WHERE id = $2`,
      [
        providerReference,
        transfer.id,
      ]
    );

    /*
     * --------------------------------------------------------
     * RESERVE / DEDUCT BALANCE
     * --------------------------------------------------------
     *
     * The transfer has now been accepted by Paystack.
     *
     * We deduct the customer's balance and record the
     * outgoing transaction.
     */

    const newBalance =
      currentBalance - transferAmount;

    await client.query(
      `UPDATE accounts
       SET
         balance = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        newBalance,
        account.id,
      ]
    );

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
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      )`,
      [
        account.id,
        'transfer',
        transferAmount,
        'NGN',
        reference,
        narration ||
          `Bank transfer to ${recipient_name}`,
        'pending',
        currentBalance,
        newBalance,
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    /*
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return res.status(201).json({
      success: true,

      message:
        'Transfer accepted for processing. The final status will be updated after Paystack confirms the transfer.',

      transfer: {
        id: transfer.id,
        reference,
        provider_reference:
          providerReference,
        recipient_name:
          transfer.recipient_name,
        recipient_account_number:
          transfer.recipient_account_number,
        recipient_bank_name:
          transfer.recipient_bank_name,
        amount: transferAmount,
        currency: 'NGN',
        status: 'processing',
        created_at:
          transfer.created_at,
      },
    });
  } catch (error) {
    console.error(
      'Bank transfer error:',
      error?.response?.data ||
        error
    );

    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Transfer rollback error:',
          rollbackError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to process bank transfer',
    });
  } finally {
    client.release();
  }
};


/*
 * ============================================================
 * GET USER TRANSFERS
 * ============================================================
 */

const getTransfers = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        bt.id,
        bt.recipient_name,
        bt.recipient_account_number,
        bt.recipient_bank_name,
        bt.recipient_bank_code,
        bt.amount,
        bt.currency,
        bt.narration,
        bt.reference,
        bt.status,
        bt.provider_reference,
        bt.failure_reason,
        bt.created_at,
        bt.completed_at
       FROM bank_transfers bt
       INNER JOIN accounts a
         ON a.id = bt.account_id
       WHERE a.user_id = $1
       ORDER BY bt.created_at DESC
       LIMIT 100`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      transfers: result.rows,
    });
  } catch (error) {
    console.error(
      'Get transfers error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve transfers',
    });
  }
};


module.exports = {
  transferToBank,
  getTransfers,
};
