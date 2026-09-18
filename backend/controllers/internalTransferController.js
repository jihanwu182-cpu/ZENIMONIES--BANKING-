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
 * CALCULATE ZENIMONIES TRANSFER FEE
 * ============================================================
 *
 * ₦20 - ₦999       = ₦0
 * ₦1,000 - ₦9,999  = ₦20
 * ₦10,000 - ₦99,999 = ₦56
 * ₦100,000+        = ₦75
 *
 * IMPORTANT:
 * The backend is the source of truth for the fee.
 * The frontend must never be trusted to provide the fee.
 */

const calculateTransferFee = (amount) => {
  const transferAmount = Number(amount);

  if (!Number.isFinite(transferAmount)) {
    return 0;
  }

  if (transferAmount < 1000) {
    return 0;
  }

  if (transferAmount < 10000) {
    return 20;
  }

  if (transferAmount < 100000) {
    return 56;
  }

  return 75;
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

    const cleanPhone = phone.replace(/\s+/g, '');

    /*
     * Find the user by their REAL registered phone number.
     *
     * The internal account number is intentionally NOT
     * returned to the frontend.
     *
     * The accounts table is still checked because the
     * account record contains the user's balance/currency.
     */

    const result = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.phone,
        u.status,
        u.is_verified,
        a.id AS account_id,
        a.currency AS account_currency
       FROM users u
       LEFT JOIN accounts a
         ON a.user_id = u.id
        AND a.status = 'active'
       WHERE u.phone = $1
       ORDER BY a.created_at ASC
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
     * Do not allow self-transfer.
     */

    if (user.id === currentUserId) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account',
      });
    }

    /*
     * Only active users can receive
     * internal transfers.
     */

    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message:
          'This Zenimonies account is not currently active',
      });
    }

    /*
     * The recipient must have an active internal
     * balance account.
     *
     * The account number itself is NOT exposed.
     */

    if (!user.account_id) {
      return res.status(400).json({
        success: false,
        message:
          'This user does not have an active Zenimonies account',
      });
    }

    /*
     * Return ONLY the information required to identify
     * the recipient.
     */

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        currency:
          user.account_currency || 'NGN',
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
        message:
          'Transfer amount is required',
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

    /*
     * Minimum transfer is ₦20.
     */

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount < 20
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Minimum transfer amount is ₦20',
      });
    }

    /*
     * Prevent invalid decimal amounts beyond 2 places.
     *
     * Money is stored in NGN with two decimal places.
     */

    if (
      Math.round(
        transferAmount * 100
      ) !==
      transferAmount * 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer amount can have a maximum of two decimal places',
      });
    }

    if (transferAmount > 100000000) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer amount is too large',
      });
    }

    /*
     * --------------------------------------------------------
     * CALCULATE TRANSFER FEE
     * --------------------------------------------------------
     *
     * The server calculates this independently.
     */

    const transactionFee =
      calculateTransferFee(transferAmount);

    const totalDebit =
      transferAmount + transactionFee;

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
     * The internal account record is still used for the
     * balance ledger.
     *
     * The account number is NOT used as an identifier.
     */

    const senderAccountResult =
      await client.query(
        `SELECT
          id,
          user_id,
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
     * CHECK BALANCE
     * --------------------------------------------------------
     *
     * The sender must have enough for:
     *
     * transfer amount + transfer fee
     */

    if (
      senderBalance < totalDebit
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          `Insufficient account balance. You need ₦${totalDebit.toLocaleString(
            'en-NG',
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )} including the transfer fee.`,
      });
    }

    /*
     * --------------------------------------------------------
     * FIND RECIPIENT BY PHONE
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
     * Prevent self-transfer.
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
     * FIND RECIPIENT BALANCE ACCOUNT
     * --------------------------------------------------------
     *
     * We still need the internal accounts record because
     * that is where the balance is stored.
     *
     * The account number is NOT used.
     */

    const recipientAccountResult =
      await client.query(
        `SELECT
          id,
          user_id,
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
     * CALCULATE BALANCES
     * --------------------------------------------------------
     *
     * IMPORTANT:
     *
     * Sender loses:
     *
     *   transfer amount + fee
     *
     * Recipient receives:
     *
     *   transfer amount only
     */

    const senderNewBalance =
      senderBalance - totalDebit;

    const recipientOldBalance =
      Number(recipientAccount.balance);

    const recipientNewBalance =
      recipientOldBalance + transferAmount;

    const reference =
      generateReference();

    /*
     * --------------------------------------------------------
     * UPDATE SENDER
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
     * UPDATE RECIPIENT
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
     *
     * The transaction amount remains the actual amount
     * sent to the recipient.
     *
     * The transaction_fee column contains the Zenimonies fee.
     *
     * The balance_after reflects the total amount deducted.
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
        balance_after,
        transaction_fee
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
        $6,
        $7
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

        transactionFee,
      ]
    );

    /*
     * --------------------------------------------------------
     * RECIPIENT TRANSACTION
     * --------------------------------------------------------
     *
     * Recipient receives the transfer amount.
     *
     * Recipient does NOT pay the sender's transfer fee.
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
        balance_after,
        transaction_fee
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
        $6,
        $7
      )`,
      [
        recipientAccount.id,

        transferAmount,

        recipientReference,

        `Money received from Zenimonies user ${senderUserId}`,

        recipientOldBalance,

        recipientNewBalance,

        0,
      ]
    );

    /*
     * --------------------------------------------------------
     * BANK TRANSFER RECORD
     * --------------------------------------------------------
     *
     * recipient_phone contains the ACTUAL phone number
     * used to identify the recipient.
     *
     * recipient_account_number remains null because the
     * phone number is the internal transfer identifier.
     *
     * The account number is NOT exposed to the frontend.
     */

    await client.query(
      `INSERT INTO bank_transfers (
        account_id,
        recipient_name,
        recipient_account_number,
        recipient_phone,
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
        $7,
        'NGN',
        $8,
        $9,
        'completed',
        CURRENT_TIMESTAMP
      )`,
      [
        senderAccount.id,

        recipientUser.full_name,

        null,

        recipientUser.phone,

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
     * RECORD TRANSFER FEE
     * --------------------------------------------------------
     *
     * The fee belongs to Zenimonies.
     *
     * We record it separately so it can be accounted for
     * without giving the fee to the recipient.
     *
     * IMPORTANT:
     *
     * This uses the existing transactions table.
     */

    if (transactionFee > 0) {
      const feeReference =
        `${reference}-FEE`;

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
          balance_after,
          transaction_fee
        )
        VALUES (
          $1,
          'transfer_fee',
          $2,
          'NGN',
          $3,
          $4,
          'completed',
          $5,
          $6,
          $7
        )`,
        [
          senderAccount.id,

          transactionFee,

          feeReference,

          `Zenimonies transfer fee for ${reference}`,

          senderNewBalance + transactionFee,

          senderNewBalance,

          transactionFee,
        ]
      );
    }

    /*
     * --------------------------------------------------------
     * RECIPIENT NOTIFICATION
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
            maximumFractionDigits: 2,
          }
        )} from a Zenimonies user.`,

        'transfer',
      ]
    );

    /*
     * --------------------------------------------------------
     * COMMIT
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

        recipient_bank:
          'Zenimonies',

        amount:
          transferAmount,

        transaction_fee:
          transactionFee,

        total_debit:
          totalDebit,

        currency:
          'NGN',

        status:
          'completed',

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
        await client.query(
          'ROLLBACK'
        );
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
  calculateTransferFee,
};
