const axios = require('axios');
const crypto = require('crypto');

const pool = require('../config/database');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// ============================================================
// ZENIMONIES BANKING
// EXTERNAL BANK TRANSFER CONTROLLER
// ============================================================

// ============================================================
// PAYSTACK HELPERS
// ============================================================

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
  return `zen-trf-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')}`;
};

const nairaToKobo = (amount) => {
  return Math.round(Number(amount) * 100);
};

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
// FORMAT NAIRA
// ============================================================

const formatNaira = (amount) => {
  return Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============================================================
// CREATE PAYSTACK TRANSFER RECIPIENT
// ============================================================

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

// ============================================================
// INITIATE PAYSTACK TRANSFER
// ============================================================

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

// ============================================================
// TRANSFER TO BANK
// POST /api/transfers
// ============================================================

const transferToBank = async (req, res) => {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const userId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id ||
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      recipient_name,
      recipient_account_number,
      recipient_bank_name,
      recipient_bank_code,
      amount,
      narration,
    } = req.body || {};

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (
      !recipient_name ||
      !recipient_account_number ||
      !recipient_bank_name ||
      !recipient_bank_code ||
      amount === undefined ||
      amount === null ||
      amount === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient name, account number, bank name, bank code, and amount are required.',
      });
    }

    const cleanRecipientName =
      String(recipient_name).trim();

    const cleanBankName =
      String(recipient_bank_name).trim();

    const cleanAccountNumber =
      String(recipient_account_number)
        .replace(/\D/g, '');

    const cleanBankCode =
      String(recipient_bank_code).trim();

    if (
      !cleanRecipientName ||
      cleanRecipientName.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid recipient name.',
      });
    }

    if (cleanAccountNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message:
          'Recipient account number must contain exactly 10 digits.',
      });
    }

    if (
      !cleanBankName ||
      cleanBankName.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid recipient bank name.',
      });
    }

    if (!cleanBankCode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient bank code is required.',
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
          'Transfer amount must be greater than zero.',
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

    const cleanNarration = narration
      ? String(narration).trim().slice(0, 200)
      : '';

    // ========================================================
    // PAYSTACK KEY CHECK
    // ========================================================

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message:
          'Bank transfer service is not configured yet.',
      });
    }

    // ========================================================
    // START DATABASE TRANSACTION
    // ========================================================

    await client.query('BEGIN');
    transactionStarted = true;

    // ========================================================
    // LOCK AND LOAD USER PROFILE
    //
    // Never trust tier or verification data from the frontend.
    // ========================================================

    const userResult = await client.query(
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
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'User account was not found.',
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: 'Your account is not active.',
      });
    }

    const kycStatus =
      String(user.kyc_status || '')
        .trim()
        .toLowerCase();

    const kycTier =
      Number(user.kyc_tier || 0);

    const verifiedStatuses = [
      'verified',
      'approved',
      'completed',
    ];

    const isKycVerified =
      verifiedStatuses.includes(kycStatus);

    // ========================================================
    // TIER 0 / UNVERIFIED RESTRICTION
    //
    // Tier 0 may use internal transfers, airtime, and data
    // after completing their profile.
    //
    // Tier 0 cannot transfer to other banks.
    // ========================================================

    if (!isKycVerified || kycTier < 1) {
      const missingFields =
        getMissingProfileFields(user);

      await client.query('ROLLBACK');
      transactionStarted = false;

      if (missingFields.length > 0) {
        return res.status(403).json({
          success: false,
          code: 'PROFILE_INCOMPLETE',
          message:
            'Please complete your personal information before making transactions.',
          missing_fields: missingFields,
        });
      }

      if (
        String(user.country || '')
          .trim()
          .toLowerCase() !== 'nigeria'
      ) {
        return res.status(403).json({
          success: false,
          code: 'NIGERIA_PROFILE_REQUIRED',
          message:
            'Your profile must have Nigeria as the country.',
        });
      }

      return res.status(403).json({
        success: false,
        code: 'TIER_UPGRADE_REQUIRED',
        message:
          'External bank transfers are not available on Tier 0. Complete the required verification to access external bank transfers.',
        current_tier: 0,
      });
    }

    // ========================================================
    // DAILY TRANSFER LIMIT
    // ========================================================

    const dailyLimit =
      getDailyTransferLimit(
        user.kyc_status,
        user.kyc_tier
      );

    // ========================================================
    // LOCK SENDER PERSONAL NGN ACCOUNT
    //
    // Keep account selection consistent with the internal
    // transfer controller.
    // ========================================================

    const accountResult = await client.query(
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
      [userId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          'Active NGN personal account not found.',
      });
    }

    const account = accountResult.rows[0];

    const currentBalance =
      Number(account.balance);

    if (
      !Number.isFinite(currentBalance) ||
      currentBalance < transferAmount
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient account balance.',
      });
    }

    // ========================================================
    // SHARED DAILY TRANSFER TOTAL
    //
    // Count:
    // 1. Completed internal outgoing transfers.
    // 2. External transfers that are pending, processing,
    //    or completed.
    //
    // Do NOT count internal_transfer_received.
    // Do NOT count internal bank_transfers records separately.
    // The transactions table is the common ledger.
    //
    // Daily boundaries use Africa/Lagos.
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
      [account.id]
    );

    const dailyTransferred = Number(
      dailyTotalResult.rows[0]?.total || 0
    );

    const remainingDailyLimit = Math.max(
      dailyLimit - dailyTransferred,
      0
    );

    if (transferAmount > remainingDailyLimit) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        code: 'DAILY_TRANSFER_LIMIT_EXCEEDED',
        message:
          `This transfer exceeds your remaining daily transfer limit of ₦${formatNaira(remainingDailyLimit)}.`,
        daily_transfer_limit: dailyLimit,
        daily_transferred: dailyTransferred,
        remaining_daily_limit: remainingDailyLimit,
        requested_amount: transferAmount,
      });
    }

    // ========================================================
    // CREATE PAYSTACK-SAFE REFERENCE
    // ========================================================

    const reference = generateReference();

    console.log(
      'Creating Zenimonies bank transfer:',
      {
        reference,
        amount: transferAmount,
        bankCode: cleanBankCode,
        accountNumber:
          cleanAccountNumber.slice(-4),
        userId,
      }
    );

    // ========================================================
    // CREATE INITIAL TRANSFER RECORD
    // ========================================================

    const transferResult =
      await client.query(
        `
        INSERT INTO bank_transfers (
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
          'NGN',
          $7,
          $8,
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
          created_at
        `,
        [
          account.id,
          cleanRecipientName,
          cleanAccountNumber,
          cleanBankName,
          cleanBankCode,
          transferAmount,
          cleanNarration || null,
          reference,
        ]
      );

    const transfer =
      transferResult.rows[0];

    // ========================================================
    // ZENIMONIES TEST TRANSFER SIMULATION
    // ========================================================

    const transferMode =
      String(
        process.env.ZENIMONIES_TRANSFER_MODE || ''
      )
        .trim()
        .toLowerCase();

    const isOfficialTestRecipient =
      cleanBankCode === '057' &&
      cleanAccountNumber === '0000000000';

    if (
      transferMode === 'simulation' &&
      isOfficialTestRecipient
    ) {
      console.log(
        'ZENIMONIES TEST TRANSFER SIMULATION',
        {
          reference,
          amount: transferAmount,
        }
      );

      const simulatedProviderReference =
        `sim-${Date.now()}-${crypto
          .randomBytes(4)
          .toString('hex')}`;

      const newBalance =
        currentBalance - transferAmount;

      // ------------------------------------------------------
      // UPDATE BANK TRANSFER
      // ------------------------------------------------------

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
          simulatedProviderReference,
          transfer.id,
        ]
      );

      // ------------------------------------------------------
      // DEBIT ACCOUNT
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // RECORD COMPLETED EXTERNAL TRANSFER
      // ------------------------------------------------------

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
          'transfer',
          $2,
          'NGN',
          $3,
          $4,
          'completed',
          $5,
          $6
        )
        `,
        [
          account.id,
          transferAmount,
          reference,
          cleanNarration ||
            `Test bank transfer to ${cleanRecipientName}`,
          currentBalance,
          newBalance,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(201).json({
        success: true,
        test_mode: true,
        message:
          'Test transfer completed successfully. No real money was sent.',
        transfer: {
          id: transfer.id,
          reference,
          provider_reference:
            simulatedProviderReference,
          recipient_name:
            transfer.recipient_name,
          recipient_account_number:
            transfer.recipient_account_number,
          recipient_bank_name:
            transfer.recipient_bank_name,
          amount: transferAmount,
          currency: 'NGN',
          status: 'completed',
          test_mode: true,
          created_at: transfer.created_at,
          completed_at:
            new Date().toISOString(),
        },
        limits: {
          daily_transfer_limit: dailyLimit,
          daily_transferred:
            dailyTransferred + transferAmount,
          remaining_daily_limit: Math.max(
            dailyLimit -
              dailyTransferred -
              transferAmount,
            0
          ),
        },
      });
    }

    // ========================================================
    // CREATE PAYSTACK RECIPIENT
    // ========================================================

    let paystackRecipient;

    try {
      paystackRecipient =
        await createPaystackRecipient({
          name: cleanRecipientName,
          accountNumber:
            cleanAccountNumber,
          bankCode: cleanBankCode,
        });

      console.log(
        'Paystack recipient created:',
        paystackRecipient?.recipient_code
      );
    } catch (error) {
      const providerMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create transfer recipient';

      console.error(
        'Paystack recipient error:',
        error?.response?.data ||
          error?.message
      );

      await client.query(
        `
        UPDATE bank_transfers
        SET
          status = 'failed',
          failure_reason = $1
        WHERE id = $2
        `,
        [
          String(providerMessage).slice(0, 500),
          transfer.id,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          `Unable to create the bank transfer recipient: ${providerMessage}`,
      });
    }

    // ========================================================
    // INITIATE PAYSTACK TRANSFER
    // ========================================================

    let paystackTransfer;

    try {
      paystackTransfer =
        await initiatePaystackTransfer({
          amount: transferAmount,
          recipientCode:
            paystackRecipient.recipient_code,
          reference,
          reason:
            cleanNarration ||
            `Zenimonies transfer to ${cleanRecipientName}`,
        });

      console.log(
        'Paystack transfer accepted:',
        {
          reference,
          status: paystackTransfer?.status,
          transferCode:
            paystackTransfer?.transfer_code,
        }
      );
    } catch (error) {
      const providerMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to initiate transfer';

      console.error(
        'Paystack transfer initiation error:',
        error?.response?.data ||
          error?.message
      );

      await client.query(
        `
        UPDATE bank_transfers
        SET
          status = 'failed',
          failure_reason = $1
        WHERE id = $2
        `,
        [
          String(providerMessage).slice(0, 500),
          transfer.id,
        ]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          `The bank transfer could not be initiated: ${providerMessage}`,
      });
    }

    // ========================================================
    // PAYSTACK ACCEPTED THE TRANSFER
    // ========================================================

    const providerReference =
      paystackTransfer.reference ||
      paystackTransfer.transfer_code ||
      null;

    await client.query(
      `
      UPDATE bank_transfers
      SET
        status = 'processing',
        provider_reference = $1
      WHERE id = $2
      `,
      [
        providerReference,
        transfer.id,
      ]
    );

    // ========================================================
    // DEDUCT ZENIMONIES BALANCE
    // ========================================================

    const newBalance =
      currentBalance - transferAmount;

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

    // ========================================================
    // RECORD PENDING EXTERNAL TRANSFER
    //
    // This record reserves the daily allowance until the
    // transfer becomes completed or failed.
    // ========================================================

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
        'transfer',
        $2,
        'NGN',
        $3,
        $4,
        'pending',
        $5,
        $6
      )
      `,
      [
        account.id,
        transferAmount,
        reference,
        cleanNarration ||
          `Bank transfer to ${cleanRecipientName}`,
        currentBalance,
        newBalance,
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
        created_at: transfer.created_at,
      },
      limits: {
        daily_transfer_limit: dailyLimit,
        daily_transferred:
          dailyTransferred + transferAmount,
        remaining_daily_limit: Math.max(
          dailyLimit -
            dailyTransferred -
            transferAmount,
          0
        ),
      },
    });
  } catch (error) {
    console.error(
      'Bank transfer error:',
      error?.response?.data ||
        error?.message ||
        error
    );

    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Bank transfer rollback error:',
          rollbackError?.message || rollbackError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to process bank transfer.',
    });
  } finally {
    client.release();
  }
};

// ============================================================
// GET USER TRANSFERS
// GET /api/transfers
// ============================================================

const getTransfers = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id ||
      req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await pool.query(
      `
      SELECT
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
      LIMIT 100
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      transfers: result.rows,
    });
  } catch (error) {
    console.error(
      'Get transfers error:',
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve transfers.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  transferToBank,
  getTransfers,
};
