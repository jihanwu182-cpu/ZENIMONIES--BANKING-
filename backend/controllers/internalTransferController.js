const crypto = require('crypto');
const pool = require('../config/database');

/*
 * ============================================================
 * GENERATE INTERNAL TRANSFER REFERENCE
 * ============================================================
 */

const generateReference = () => {
  return `ZEN-INT-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};


/*
 * ============================================================
 * FIND ZENIMONIES USER BY PHONE NUMBER
 * ============================================================
 */

const findUserByPhone = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const phone = String(
      req.query.phone || ''
    ).trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    /*
     * Normalize phone number.
     */

    const cleanPhone = phone.replace(/\s+/g, '');

    const result = await pool.query(
      `SELECT
        id,
        full_name,
        phone,
        status,
        is_verified
       FROM users
       WHERE phone = $1
       LIMIT 1`,
      [cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'No Zenimonies user was found with this phone number',
      });
    }

    const user = result.rows[0];

    /*
     * Do not allow a user to send money to themselves.
     */

    if (user.id === currentUserId) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account',
      });
    }

    /*
     * Only active users can receive internal transfers.
     */

    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message:
          'This Zenimonies account is not currently active',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.error(
      'Find Zenimonies user error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to find Zenimonies user',
    });
  }
};


/*
 * ============================================================
 * SEND MONEY TO ZENIMONIES USER
 * ============================================================
 */

const transferToZenimoniesUser = async (
  req,
  res
) => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const senderUserId = req.user.id;

    const {
      recipient_phone,
      amount,
      narration,
    } = req.body;

    /*
     * --------------------------------------------------------
     * VALIDATION
     * --------------------------------------------------------
     */

    if (!recipient_phone) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient phone number is required',
      });
    }

    if (
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount is required',
      });
    }

    const cleanPhone = String(
      recipient_phone
    ).replace(/\s+/g, '');

    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient phone number is required',
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

    /*
     * Limit the amount accepted by this endpoint.
     */

    if (transferAmount > 100000000) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer amount is too large',
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
     * --------------------------------------------------------
     * FIND SENDER ACCOUNT
     * --------------------------------------------------------
     *
     * Lock the sender account so two simultaneous transfers
     * cannot spend the same balance.
     */

    const senderAccountResult =
      await client.query(
        `SELECT
          id,
          user_id,
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
        [senderUserId]
      );

    if (
      senderAccountResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'Active sender account not found',
      });
    }

    const senderAccount =
      senderAccountResult.rows[0];

    /*
     * Internal transfers currently support NGN.
     */

    if (
      String(senderAccount.currency)
        .toUpperCase() !== 'NGN'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Zenimonies internal transfers currently support NGN only',
      });
    }

    const senderBalance = Number(
      senderAccount.balance
    );

    /*
     * --------------------------------------------------------
     * CHECK SENDER BALANCE
     * --------------------------------------------------------
     */

    if (
      senderBalance < transferAmount
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Insufficient account balance',
      });
    }

    /*
     * --------------------------------------------------------
     * FIND RECIPIENT
     * --------------------------------------------------------
     */

    const recipientUserResult =
      await client.query(
        `SELECT
          id,
          full_name,
          phone,
          status,
          is_verified
         FROM users
         WHERE phone = $1
         LIMIT 1`,
        [cleanPhone]
      );

    if (
      recipientUserResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'No Zenimonies user was found with this phone number',
      });
    }

    const recipientUser =
      recipientUserResult.rows[0];

    /*
     * Do not allow self-transfer.
     */

    if (
      recipientUser.id === senderUserId
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account',
      });
    }

    /*
     * Recipient must be active.
     */

    if (
      recipientUser.status !== 'active'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Recipient Zenimonies account is not active',
      });
    }

    /*
     * --------------------------------------------------------
     * FIND RECIPIENT ACCOUNT
     * --------------------------------------------------------
     */

    const recipientAccountResult =
      await client.query(
        `SELECT
          id,
          user_id,
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
        [recipientUser.id]
      );

    if (
      recipientAccountResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'Recipient does not have an active Zenimonies account',
      });
    }

    const recipientAccount =
      recipientAccountResult.rows[0];

    /*
     * Both accounts must use NGN.
     */

    if (
      String(recipientAccount.currency)
        .toUpperCase() !== 'NGN'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Recipient account currency is not supported',
      });
    }

    /*
     * --------------------------------------------------------
     * CALCULATE NEW BALANCES
     * --------------------------------------------------------
     */

    const senderNewBalance =
      senderBalance - transferAmount;

    const recipientOldBalance =
      Number(recipientAccount.balance);

    const recipientNewBalance =
      recipientOldBalance + transferAmount;

    const reference =
      generateReference();

    /*
     * --------------------------------------------------------
     * UPDATE SENDER BALANCE
     * --------------------------------------------------------
     */

    await client.query(
      `UPDATE accounts
       SET
         balance = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        senderNewBalance,
        senderAccount.id,
      ]
    );

    /*
     * --------------------------------------------------------
     * UPDATE RECIPIENT BALANCE
     * --------------------------------------------------------
     */

    await client.query(
      `UPDATE accounts
       SET
         balance = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        recipientNewBalance,
        recipientAccount.id,
      ]
    );

    /*
     * --------------------------------------------------------
     * SENDER TRANSACTION
     * --------------------------------------------------------
     */

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
        'internal_transfer',
        $2,
        'NGN',
        $3,
        $4,
        'completed',
        $5,
        $6
      )`,
      [
        senderAccount.id,
        transferAmount,
        reference,
        narration
          ? String(narration).trim()
          : `Transfer to ${recipientUser.full_name}`,
        senderBalance,
        senderNewBalance,
      ]
    );

    /*
     * --------------------------------------------------------
     * RECIPIENT TRANSACTION
     * --------------------------------------------------------
     *
     * Give the recipient a separate transaction reference
     * while linking it to the same transfer reference.
     */

    const recipientReference =
      `${reference}-R`;

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
        'internal_transfer_received',
        $2,
        'NGN',
        $3,
        $4,
        'completed',
        $5,
        $6
      )`,
      [
        recipientAccount.id,
        transferAmount,
        recipientReference,
        `Money received from Zenimonies user ${senderUserId}`,
        recipientOldBalance,
        recipientNewBalance,
      ]
    );

    /*
     * --------------------------------------------------------
     * CREATE BANK TRANSFER RECORD
     * --------------------------------------------------------
     *
     * We use bank_transfers as the transfer-history record,
     * but this transfer does NOT go through Paystack.
     */

    await client.query(
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
        status,
        completed_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'NGN',
        $7,
        $8,
        'completed',
        CURRENT_TIMESTAMP
      )`,
      [
        senderAccount.id,
        recipientUser.full_name,
        recipientAccount.account_number,
        'Zenimonies',
        'ZENIMONIES',
        transferAmount,
        narration
          ? String(narration).trim()
          : `Zenimonies transfer to ${recipientUser.full_name}`,
        reference,
      ]
    );

    /*
     * --------------------------------------------------------
     * NOTIFICATION FOR RECIPIENT
     * --------------------------------------------------------
     */

    await client.query(
      `INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        is_read
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        false
      )`,
      [
        recipientUser.id,
        'Money received',
        `You received ₦${transferAmount.toLocaleString(
          'en-NG',
          {
            minimumFractionDigits: 2,
          }
        )} from a Zenimonies user.`,
        'transfer',
      ]
    );

    /*
     * --------------------------------------------------------
     * COMMIT EVERYTHING
     * --------------------------------------------------------
     */

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
        'Money sent successfully to the Zenimonies user',
      transfer: {
        reference,
        recipient_name:
          recipientUser.full_name,
        recipient_phone:
          recipientUser.phone,
        amount: transferAmount,
        currency: 'NGN',
        status: 'completed',
        balance_after:
          senderNewBalance,
      },
    });
  } catch (error) {
    console.error(
      'Zenimonies internal transfer error:',
      error
    );

    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Internal transfer rollback error:',
          rollbackError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to complete Zenimonies transfer',
    });
  } finally {
    client.release();
  }
};


module.exports = {
  findUserByPhone,
  transferToZenimoniesUser,
};
