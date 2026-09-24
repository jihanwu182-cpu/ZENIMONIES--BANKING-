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
 * ₦20 - ₦999         = ₦0
 * ₦1,000 - ₦9,999    = ₦20
 * ₦10,000 - ₦99,999  = ₦56
 * ₦100,000+          = ₦75
 *
 * The backend is the source of truth.
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
     * Prevent self-transfer.
     */

    if (user.id === currentUserId) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account',
      });
    }

    /*
     * Recipient must be active.
     */

    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message:
          'This Zenimonies account is not currently active',
      });
    }

    /*
     * Recipient must have an active account.
     */

    if (!user.account_id) {
      return res.status(400).json({
        success: false,
        message:
          'This user does not have an active Zenimonies account',
      });
    }

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,

        full_name:
          user.full_name,

        phone:
          user.phone,

        currency:
          user.account_currency || 'NGN',

        is_verified:
          user.is_verified,
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
    const senderUserId =
      req.user.id;

    const {
      recipient_phone,
      amount,
      narration,
    } = req.body;


    /*
     * ========================================================
     * VALIDATION
     * ========================================================
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

    const cleanPhone =
      String(
        recipient_phone
      ).replace(/\s+/g, '');


    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient phone number is required',
      });
    }


    /*
     * ========================================================
     * AMOUNT VALIDATION
     * ========================================================
     */

    const transferAmount =
      Number(amount);

    if (
      !Number.isFinite(
        transferAmount
      ) ||
      transferAmount < 20
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Minimum transfer amount is ₦20',
      });
    }


    /*
     * Maximum two decimal places.
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


    /*
     * Maximum transfer amount.
     */

    if (
      transferAmount > 100000000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer amount is too large',
      });
    }


    /*
     * ========================================================
     * CALCULATE FEE
     * ========================================================
     */

    const transactionFee =
      calculateTransferFee(
        transferAmount
      );

    const totalDebit =
      transferAmount +
      transactionFee;


    /*
     * ========================================================
     * START DATABASE TRANSACTION
     * ========================================================
     */

    await client.query('BEGIN');

    transactionStarted = true;


    /*
     * ========================================================
     * LOCK SENDER ACCOUNT
     * ========================================================
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
      await client.query(
        'ROLLBACK'
      );

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
     * ========================================================
     * SENDER CURRENCY
     * ========================================================
     */

    if (
      String(
        senderAccount.currency
      ).toUpperCase() !== 'NGN'
    ) {
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Zenimonies internal transfers currently support NGN only',
      });
    }


    const senderBalance =
      Number(
        senderAccount.balance
      );


    /*
     * ========================================================
     * BALANCE CHECK
     * ========================================================
     *
     * Sender must have:
     *
     * transfer amount + fee
     */

    if (
      senderBalance <
      totalDebit
    ) {
      await client.query(
        'ROLLBACK'
      );

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
     * ========================================================
     * FIND RECIPIENT
     * ========================================================
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
      await client.query(
        'ROLLBACK'
      );

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
     * ========================================================
     * PREVENT SELF TRANSFER
     * ========================================================
     */

    if (
      recipientUser.id ===
      senderUserId
    ) {
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account',
      });
    }


    /*
     * ========================================================
     * RECIPIENT STATUS
     * ========================================================
     */

    if (
      recipientUser.status !==
      'active'
    ) {
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Recipient Zenimonies account is not active',
      });
    }


    /*
     * ========================================================
     * LOCK RECIPIENT ACCOUNT
     * ========================================================
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
      await client.query(
        'ROLLBACK'
      );

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
     * ========================================================
     * RECIPIENT CURRENCY
     * ========================================================
     */

    if (
      String(
        recipientAccount.currency
      ).toUpperCase() !== 'NGN'
    ) {
      await client.query(
        'ROLLBACK'
      );

      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Recipient account currency is not supported',
      });
    }


    /*
     * ========================================================
     * CALCULATE NEW BALANCES
     * ========================================================
     */

    const recipientOldBalance =
      Number(
        recipientAccount.balance
      );

    const senderNewBalance =
      senderBalance -
      totalDebit;

    const recipientNewBalance =
      recipientOldBalance +
      transferAmount;


    /*
     * ========================================================
     * GENERATE REFERENCE
     * ========================================================
     */

    const reference =
      generateReference();


    /*
     * ========================================================
     * UPDATE SENDER BALANCE
     * ========================================================
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
     * ========================================================
     * UPDATE RECIPIENT BALANCE
     * ========================================================
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
     * ========================================================
     * SENDER TRANSACTION
     * ========================================================
     *
     * IMPORTANT:
     *
     * amount = money actually sent
     *
     * transaction_fee = Zenimonies fee
     *
     * balance_after = balance after BOTH amount + fee
     *
     * We intentionally do NOT create a separate
     * "transfer_fee" customer transaction.
     */

    const senderTransactionResult =
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
        )
        RETURNING
          id,
          created_at`,
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


    const senderTransaction =
      senderTransactionResult.rows[0];


    /*
     * ========================================================
     * RECIPIENT TRANSACTION
     * ========================================================
     *
     * Recipient receives the amount only.
     *
     * The sender's fee is NOT charged to recipient.
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

        narration
  ? String(narration).trim()
  : '',

        recipientOldBalance,

        recipientNewBalance,

        0,
      ]
    );


    /*
     * ========================================================
     * BANK TRANSFER RECORD
     * ========================================================
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
     * ========================================================
     * RECIPIENT NOTIFICATION
     * ========================================================
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
     * ========================================================
     * COMMIT
     * ========================================================
     */

    await client.query(
      'COMMIT'
    );

    transactionStarted = false;


    /*
     * ========================================================
     * SUCCESS RESPONSE
     * ========================================================
     *
     * created_at comes directly from PostgreSQL.
     */

    return res.status(201).json({
      success: true,

      message:
        'Money sent successfully to the Zenimonies user',

      transfer: {
        id:
          senderTransaction.id,

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

        created_at:
          senderTransaction.created_at,
      },
    });

  } catch (error) {

    console.error(
      'Zenimonies internal transfer error:',
      error
    );


    /*
     * ========================================================
     * ROLLBACK
     * ========================================================
     *
     * Because the transfer is atomic, if anything fails
     * before COMMIT, the sender balance, recipient balance,
     * transaction records and notification are all rolled
     * back together.
     *
     * Therefore we do NOT perform a second manual refund here.
     */

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


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  findUserByPhone,
  transferToZenimoniesUser,
  calculateTransferFee,
};
