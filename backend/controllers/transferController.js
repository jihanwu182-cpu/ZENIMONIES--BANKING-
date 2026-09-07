const pool = require('../config/database');
const crypto = require('crypto');

const generateReference = () => {
  return `ZEN-TRF-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

const transferToBank = async (req, res) => {
  const client = await pool.connect();

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

    // Validate required fields
    if (
      !recipient_name ||
      !recipient_account_number ||
      !recipient_bank_name ||
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient name, account number, bank name, and amount are required',
      });
    }

    const transferAmount = Number(amount);

    // Validate amount
    if (
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount must be greater than zero',
      });
    }

    // Prevent excessively large values
    if (transferAmount > 100000000) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount is too large',
      });
    }

    await client.query('BEGIN');

    // Find the logged-in user's active account
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

      return res.status(404).json({
        success: false,
        message: 'Active account not found',
      });
    }

    const account = accountResult.rows[0];
    const currentBalance = Number(account.balance);

    // Check sufficient balance
    if (currentBalance < transferAmount) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Insufficient account balance',
      });
    }

    const reference = generateReference();

    /*
     * At this stage the transfer is recorded as pending.
     *
     * We do NOT pretend that money has reached the external
     * bank. A real bank/payment provider will be connected
     * later to actually execute the external transfer.
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, 'pending'
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
        recipient_name.trim(),
        recipient_account_number.trim(),
        recipient_bank_name.trim(),
        recipient_bank_code
          ? recipient_bank_code.trim()
          : null,
        transferAmount,
        account.currency,
        narration ? narration.trim() : null,
        reference,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Transfer request created and is pending processing',
      transfer: transferResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Transfer rollback error:',
        rollbackError
      );
    }

    console.error('Bank transfer error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create transfer request',
    });
  } finally {
    client.release();
  }
};

const getTransfers = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        bt.id,
        bt.recipient_name,
        bt.recipient_account_number,
        bt.recipient_bank_name,
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
    console.error('Get transfers error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve transfers',
    });
  }
};

module.exports = {
  transferToBank,
  getTransfers,
};
