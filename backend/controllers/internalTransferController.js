
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// INTERNAL TRANSFER CONTROLLER
// ============================================================

// ============================================================
// ACCOUNT BALANCE LIMITS
// ============================================================

const getAccountLimit = (kycStatus, kycTier) => {
  const status = String(kycStatus || '').toLowerCase();
  const tier = Number(kycTier || 0);

  const verified = [
    'verified',
    'approved',
    'completed',
  ].includes(status);

  if (!verified) return 50000;
  if (tier >= 3) return null;
  if (tier === 2) return 500000;
  if (tier === 1) return 200000;

  return 50000;
};

// ============================================================
// DAILY TRANSFER LIMITS
// ============================================================

const getDailyTransferLimit = (kycStatus, kycTier) => {
  const status = String(kycStatus || '').toLowerCase();
  const tier = Number(kycTier || 0);

  const verified = [
    'verified',
    'approved',
    'completed',
  ].includes(status);

  if (!verified) return 25000;
  if (tier >= 3) return 5000000;
  if (tier === 2) return 200000;
  if (tier === 1) return 50000;

  return 25000;
};

// ============================================================
// REFERENCE
// ============================================================

const generateReference = () => {
  return `ZEN-INT-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

// ============================================================
// TRANSFER FEES
// ============================================================

const calculateTransferFee = (amount) => {
  const transferAmount = Number(amount);

  if (!Number.isFinite(transferAmount)) return 0;
  if (transferAmount < 1000) return 0;
  if (transferAmount < 10000) return 20;
  if (transferAmount < 100000) return 56;

  return 75;
};

// ============================================================
// PROFILE COMPLETION
// ============================================================

const getMissingProfileFields = (user) => {
  const requiredFields = [
    ['full_name', 'Full name'],
    ['email', 'Email address'],
    ['phone', 'Phone number'],
    ['date_of_birth', 'Date of birth'],
    ['address', 'Residential address'],
    ['city', 'City'],
    ['state', 'State'],
    ['lga', 'Local Government Area'],
    ['country', 'Country'],
  ];

  return requiredFields
    .filter(([field]) => {
      const value = user[field];

      return (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
      );
    })
    .map(([, label]) => label);
};

// ============================================================
// FORMAT MONEY
// ============================================================

const formatNaira = (amount) => {
  return Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============================================================
// FIND ZENIMONIES USER BY PHONE
// GET /api/internal-transfers/user
// ============================================================

const findUserByPhone = async (req, res) => {
  try {
    const currentUserId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const phone = String(
      req.query.phone || ''
    ).replace(/\s+/g, '').trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }

    const result = await pool.query(
      `
      SELECT
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
       AND a.account_type = 'personal'
       AND a.currency = 'NGN'
       AND a.status = 'active'
      WHERE u.phone = $1
      ORDER BY a.created_at ASC
      LIMIT 1
      `,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'No Zenimonies user was found with this phone number.',
      });
    }

    const user = result.rows[0];

    if (String(user.id) === String(currentUserId)) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account.',
      });
    }

    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message:
          'This Zenimonies account is not currently active.',
      });
    }

    if (!user.account_id) {
      return res.status(400).json({
        success: false,
        message:
          'This user does not have an active NGN personal account.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        currency: user.account_currency,
        is_verified: user.is_verified,
      },
    });

  } catch (error) {
    console.error(
      'Find Zenimonies user error:',
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to find Zenimonies user.',
    });
  }
};

// ============================================================
// SEND MONEY TO ZENIMONIES USER
// POST /api/internal-transfers
// ============================================================

const transferToZenimoniesUser = async (req, res) => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const senderUserId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!senderUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      recipient_phone,
      amount,
      narration,
    } = req.body || {};

    // ========================================================
    // INPUT VALIDATION
    // ========================================================

    if (!recipient_phone) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required.',
      });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount is required.',
      });
    }

    const cleanPhone = String(
      recipient_phone
    ).replace(/\s+/g, '').trim();

    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required.',
      });
    }

    const transferAmount = Number(amount);

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount < 20
    ) {
      return res.status(400).json({
        success: false,
        message: 'Minimum transfer amount is ₦20.',
      });
    }

    if (
      Math.round(transferAmount * 100) !==
      transferAmount * 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transfer amount can have a maximum of two decimal places.',
      });
    }

    if (transferAmount > 100000000) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount is too large.',
      });
    }

    const transactionFee =
      calculateTransferFee(transferAmount);

    const totalDebit =
      transferAmount + transactionFee;

    // ========================================================
    // START DATABASE TRANSACTION
    // ========================================================

    await client.query('BEGIN');
    transactionStarted = true;

    // ========================================================
    // LOCK AND LOAD SENDER PROFILE
    //
    // Tier and profile information come from PostgreSQL.
    // Never trust tier values from the frontend or JWT.
    // ========================================================

    const senderUserResult = await client.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        date_of_birth,
        address,
        city,
        state,
        lga,
        country,
        status,
        kyc_status,
        kyc_tier,
        is_verified
      FROM users
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [senderUserId]
    );

    if (senderUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'Sender account was not found.',
      });
    }

    const senderUser = senderUserResult.rows[0];

    if (senderUser.status !== 'active') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: 'Your account is not active.',
      });
    }

    const senderTier =
      Number(senderUser.kyc_tier || 0);

    const senderKycStatus =
      String(senderUser.kyc_status || '')
        .toLowerCase();

    const senderVerified = [
      'verified',
      'approved',
      'completed',
    ].includes(senderKycStatus);

    // ========================================================
    // TIER 0 PROFILE COMPLETION
    // ========================================================

    if (!senderVerified || senderTier < 1) {
      const missingFields =
        getMissingProfileFields(senderUser);

      if (missingFields.length > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(403).json({
          success: false,
          code: 'PROFILE_INCOMPLETE',
          message:
            'Please complete your personal information before making transactions.',
          missing_fields: missingFields,
        });
      }

      if (
        String(senderUser.country || '')
          .trim()
          .toLowerCase() !== 'nigeria'
      ) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(403).json({
          success: false,
          code: 'NIGERIA_PROFILE_REQUIRED',
          message:
            'Your Tier 0 profile must have Nigeria as the country before making transactions.',
        });
      }
    }

    // ========================================================
    // SENDER DAILY TRANSFER LIMIT
    // ========================================================

    const dailyLimit = getDailyTransferLimit(
      senderUser.kyc_status,
      senderUser.kyc_tier
    );

    // ========================================================
    // LOCK SENDER PERSONAL NGN ACCOUNT
    // ========================================================

    const senderAccountResult =
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
          AND account_type = 'personal'
          AND currency = 'NGN'
          AND status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE
        `,
        [senderUserId]
      );

    if (senderAccountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'Active NGN personal sender account not found.',
      });
    }

    const senderAccount =
      senderAccountResult.rows[0];

    const senderBalance =
      Number(senderAccount.balance);

    if (
      !Number.isFinite(senderBalance) ||
      senderBalance < totalDebit
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message:
          `Insufficient account balance. You need ₦${formatNaira(totalDebit)} including the transfer fee.`,
      });
    }

        // ========================================================
    // SHARED DAILY TRANSFER LIMIT
    //
    // Counts outgoing internal and external transfers
    // against one shared Nigeria calendar-day limit.
    //
    // Internal transfers:
    //   completed only
    //
    // External transfers:
    //   pending, processing, and completed
    //
    // Failed external transfers are excluded.
    // Incoming transfers and duplicate bank_transfers
    // records are excluded.
    //
    // Amount only is counted, excluding fees.
    // ========================================================

    const dailyTotalResult = await client.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE account_id = $1
        AND (
          (
            type = 'internal_transfer'
            AND status = 'completed'
          )
          OR
          (
            type = 'transfer'
            AND status IN (
              'pending',
              'processing',
              'completed'
            )
          )
        )
        AND created_at >= (
          date_trunc(
            'day',
            CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos'
          ) AT TIME ZONE 'Africa/Lagos'
        )
        AND created_at < (
          (
            date_trunc(
              'day',
              CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos'
            ) + INTERVAL '1 day'
          ) AT TIME ZONE 'Africa/Lagos'
        )
      `,
      [senderAccount.id]
    );

    const dailyTotal =
      Number(dailyTotalResult.rows[0]?.total || 0);

    const remainingDailyLimit =
      Math.max(dailyLimit - dailyTotal, 0);

    if (transferAmount > remainingDailyLimit) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        code: 'DAILY_TRANSFER_LIMIT_EXCEEDED',
        message:
          `This transfer exceeds your remaining daily transfer limit of ₦${formatNaira(remainingDailyLimit)}.`,
        daily_transfer_limit: dailyLimit,
        daily_transferred: dailyTotal,
        remaining_daily_limit: remainingDailyLimit,
        requested_amount: transferAmount,
      });
    }

    // ========================================================
    // FIND RECIPIENT
    // ========================================================

    const recipientUserResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          phone,
          status,
          is_verified,
          kyc_status,
          kyc_tier
        FROM users
        WHERE phone = $1
        LIMIT 1
        `,
        [cleanPhone]
      );

    if (recipientUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'No Zenimonies user was found with this phone number.',
      });
    }

    const recipientUser =
      recipientUserResult.rows[0];

    if (
      String(recipientUser.id) ===
      String(senderUserId)
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'You cannot send money to your own account.',
      });
    }

    if (recipientUser.status !== 'active') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Recipient Zenimonies account is not active.',
      });
    }

    // ========================================================
    // LOCK RECIPIENT PERSONAL NGN ACCOUNT
    // ========================================================

    const recipientAccountResult =
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
          AND account_type = 'personal'
          AND currency = 'NGN'
          AND status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE
        `,
        [recipientUser.id]
      );

    if (recipientAccountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'Recipient does not have an active NGN personal account.',
      });
    }

    const recipientAccount =
      recipientAccountResult.rows[0];

    const recipientOldBalance =
      Number(recipientAccount.balance);

    if (!Number.isFinite(recipientOldBalance)) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(500).json({
        success: false,
        message:
          'Unable to read recipient account balance.',
      });
    }

    // ========================================================
    // RECIPIENT ACCOUNT BALANCE CAP
    // ========================================================

    const recipientLimit = getAccountLimit(
      recipientUser.kyc_status,
      recipientUser.kyc_tier
    );

    const recipientNewBalance =
      recipientOldBalance + transferAmount;

    if (
      recipientLimit !== null &&
      recipientNewBalance > recipientLimit
    ) {
      const remainingCapacity = Math.max(
        recipientLimit - recipientOldBalance,
        0
      );

      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        code: 'RECIPIENT_ACCOUNT_LIMIT_EXCEEDED',
        message:
          'This transfer would exceed the recipient account balance limit.',
        recipient_account_limit: recipientLimit,
        recipient_current_balance: recipientOldBalance,
        remaining_account_capacity: remainingCapacity,
      });
    }

    // ========================================================
    // CALCULATE NEW BALANCES
    // ========================================================

    const senderNewBalance =
      senderBalance - totalDebit;

    const reference =
      generateReference();

    const cleanNarration =
      narration
        ? String(narration).trim().slice(0, 200)
        : '';

    const senderDescription =
      cleanNarration ||
      `Transfer to ${recipientUser.full_name}`;

    const recipientDescription =
      cleanNarration ||
      `Transfer received from Zenimonies user`;

    // ========================================================
    // DEBIT SENDER
    // ========================================================

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        senderNewBalance,
        senderAccount.id,
      ]
    );

    // ========================================================
    // CREDIT RECIPIENT
    // ========================================================

    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        recipientNewBalance,
        recipientAccount.id,
      ]
    );

    // ========================================================
    // SENDER TRANSACTION
    // ========================================================

    const senderTransactionResult =
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
          created_at
        `,
        [
          senderAccount.id,
          transferAmount,
          reference,
          senderDescription,
          senderBalance,
          senderNewBalance,
          transactionFee,
        ]
      );

    const senderTransaction =
      senderTransactionResult.rows[0];

    // ========================================================
    // RECIPIENT TRANSACTION
    // ========================================================

    const recipientReference =
      `${reference}-R`;

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
        'internal_transfer_received',
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
        recipientAccount.id,
        transferAmount,
        recipientReference,
        recipientDescription,
        recipientOldBalance,
        recipientNewBalance,
      ]
    );

    // ========================================================
    // BANK TRANSFER RECORD
    // ========================================================

    await client.query(
      `
      INSERT INTO bank_transfers (
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
        NULL,
        $3,
        'Zenimonies',
        'ZENIMONIES',
        $4,
        'NGN',
        $5,
        $6,
        'completed',
        CURRENT_TIMESTAMP
      )
      `,
      [
        senderAccount.id,
        recipientUser.full_name,
        recipientUser.phone,
        transferAmount,
        cleanNarration ||
          `Zenimonies transfer to ${recipientUser.full_name}`,
        reference,
      ]
    );

    // ========================================================
    // RECIPIENT NOTIFICATION
    // ========================================================

    await client.query(
      `
      INSERT INTO notifications (
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
      )
      `,
      [
        recipientUser.id,
        'Money received',
        `You received ₦${formatNaira(transferAmount)} from a Zenimonies user.`,
        'transfer',
      ]
    );

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query('COMMIT');
    transactionStarted = false;

    // ========================================================
    // SUCCESS RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,
      message:
        'Money sent successfully to the Zenimonies user.',
      transfer: {
        id: senderTransaction.id,
        reference,
        recipient_name: recipientUser.full_name,
        recipient_phone: recipientUser.phone,
        recipient_bank: 'Zenimonies',
        amount: transferAmount,
        transaction_fee: transactionFee,
        total_debit: totalDebit,
        currency: 'NGN',
        status: 'completed',
        balance_after: senderNewBalance,
        created_at: senderTransaction.created_at,
      },
      limits: {
        daily_transfer_limit: dailyLimit,
        daily_transferred:
          dailyTotal + transferAmount,
        remaining_daily_limit:
          Math.max(
            dailyLimit - dailyTotal - transferAmount,
            0
          ),
      },
    });

  } catch (error) {
    console.error(
      'Zenimonies internal transfer error:',
      error?.message || error
    );

    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Internal transfer rollback error:',
          rollbackError?.message || rollbackError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to complete Zenimonies transfer.',
    });

  } finally {
    client.release();
  }
};

 // ============================================================
 // GET RECENT INTERNAL TRANSFER RECIPIENTS
 // GET /api/internal-transfers/recent
 // ============================================================

const getRecentRecipients = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await pool.query(
      `
      SELECT DISTINCT ON (bt.recipient_phone)
        bt.recipient_name AS full_name,
        bt.recipient_phone AS phone,
        bt.completed_at,
        bt.reference
      FROM bank_transfers bt
      INNER JOIN accounts a
        ON a.id = bt.account_id
      WHERE a.user_id = $1
        AND a.account_type = 'personal'
        AND a.currency = 'NGN'
        AND bt.recipient_bank_name = 'Zenimonies'
        AND bt.recipient_phone IS NOT NULL
        AND TRIM(bt.recipient_phone) <> ''
        AND bt.status = 'completed'
      ORDER BY
        bt.recipient_phone,
        bt.completed_at DESC NULLS LAST,
        bt.reference DESC
      `,
      [userId]
    );

    const recipients = result.rows
      .filter((recipient) => recipient.phone)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      recipients,
    });

  } catch (error) {
    console.error(
      'Get recent internal recipients error:',
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load recent recipients.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================


module.exports = {
  findUserByPhone,
  transferToZenimoniesUser,
  calculateTransferFee,
  getRecentRecipients,
};

