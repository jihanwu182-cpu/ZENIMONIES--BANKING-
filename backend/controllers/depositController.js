const pool = require('../config/database');
const crypto = require('crypto');

// ============================================================
// DEPOSIT REFERENCE
// ============================================================

const generateReference = () => {
  return `ZEN-DEP-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};


// ============================================================
// ACCOUNT BALANCE LIMITS
// ============================================================
//
// NOT VERIFIED / PENDING / REJECTED
//     Maximum balance: ₦50,000
//
// VERIFIED TIER 1
//     Maximum balance: ₦200,000
//
// VERIFIED TIER 2
//     Maximum balance: ₦500,000
//
// VERIFIED TIER 3
//     No account balance limit
// ============================================================

const getAccountLimit = (
  kycStatus,
  kycTier
) => {
  const status = String(
    kycStatus || ''
  ).toLowerCase();

  const tier = Number(
    kycTier || 0
  );

  const isVerified =
    status === 'verified' ||
    status === 'approved' ||
    status === 'completed';

  // ----------------------------------------------------------
  // UNVERIFIED USERS
  // ----------------------------------------------------------

  if (!isVerified) {
    return 50000;
  }

  // ----------------------------------------------------------
  // VERIFIED TIER 3
  // ----------------------------------------------------------

  if (tier >= 3) {
    return null;
  }

  // ----------------------------------------------------------
  // VERIFIED TIER 2
  // ----------------------------------------------------------

  if (tier === 2) {
    return 500000;
  }

  // ----------------------------------------------------------
  // VERIFIED TIER 1
  // ----------------------------------------------------------

  if (tier === 1) {
    return 200000;
  }

  // ----------------------------------------------------------
  // SAFETY DEFAULT
  // ----------------------------------------------------------

  return 50000;
};


// ============================================================
// GET DEPOSIT ACCOUNT
// GET /api/deposits/account
// ============================================================

const getDepositAccount = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        account_number,
        account_name,
        bank_name,
        bank_code,
        currency,
        status,
        provider,
        provider_customer_code,
        provider_account_id,
        created_at,
        updated_at
      FROM deposit_accounts
      WHERE user_id = $1
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (
      result.rows.length === 0
    ) {
      return res.status(200).json({
        success: true,
        active: false,
        message:
          'Dedicated bank deposit account is not activated yet.',
        deposit_account: null,
      });
    }

    return res.status(200).json({
      success: true,
      active: true,
      message:
        'Dedicated bank deposit account found.',
      deposit_account:
        result.rows[0],
    });

  } catch (error) {

    console.error(
      'GET DEPOSIT ACCOUNT ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve deposit account.',
      error_code:
        error?.code || null,
    });
  }
};


// ============================================================
// CREATE DEPOSIT
// POST /api/deposits
// ============================================================
//
// IMPORTANT:
//
// This endpoint creates a PENDING deposit.
//
// It does NOT increase the account balance.
//
// The balance must only be increased after a trusted payment
// provider confirms the payment.
// ============================================================

const createDeposit = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    const userId =
      req.user.id;

    // ========================================================
    // ACCEPT payment_method
    //
    // We also accept "method" as a backwards-compatible
    // fallback.
    // ========================================================

    const {
      amount,
      payment_method,
      method,
    } = req.body || {};

    const selectedMethod =
      payment_method ||
      method;

    // ========================================================
    // VALIDATE REQUEST
    // ========================================================

    if (
      amount === undefined ||
      amount === null ||
      !selectedMethod
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount and payment method are required.',
      });
    }

    const depositAmount =
      Number(amount);

    if (
      !Number.isFinite(
        depositAmount
      ) ||
      depositAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Deposit amount must be greater than zero.',
      });
    }

    // ========================================================
    // MAXIMUM SINGLE REQUEST
    // ========================================================

    if (
      depositAmount > 5000000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Deposit amount cannot exceed ₦5,000,000 per request.',
      });
    }

    // ========================================================
    // ALLOWED PAYMENT METHODS
    // ========================================================

    const allowedMethods = [
      'bank_transfer',
      'paystack',
    ];

    if (
      !allowedMethods.includes(
        selectedMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid payment method. Please select Bank Transfer or Paystack.',
      });
    }

    // ========================================================
    // START TRANSACTION
    // ========================================================

    await client.query(
      'BEGIN'
    );

    // ========================================================
    // LOCK USER
    // ========================================================

    const userResult =
      await client.query(
        `
        SELECT
          id,
          kyc_status,
          kyc_tier
        FROM users
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
        `,
        [userId]
      );

    if (
      userResult.rows.length === 0
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'User not found.',
      });
    }

    const user =
      userResult.rows[0];

    // ========================================================
    // GET AND LOCK ACCOUNT
    // ========================================================

    const accountResult =
      await client.query(
        `
        SELECT
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

      return res.status(404).json({
        success: false,
        message:
          'Active Zenimonies account not found.',
      });
    }

    const account =
      accountResult.rows[0];

    // ========================================================
    // CURRENT BALANCE
    // ========================================================

    const currentBalance =
      Number(
        account.balance || 0
      );

    // ========================================================
    // ACCOUNT LIMIT
    // ========================================================

    const accountLimit =
      getAccountLimit(
        user.kyc_status,
        user.kyc_tier
      );

    // ========================================================
    // CURRENT BALANCE ALREADY AT LIMIT
    // ========================================================

    if (
      accountLimit !== null &&
      currentBalance >=
        accountLimit
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(403).json({
        success: false,

        code:
          'ACCOUNT_BALANCE_LIMIT_REACHED',

        message:
          `Your current account balance has reached the maximum allowed limit of ₦${accountLimit.toLocaleString()}.`,

        kyc_status:
          user.kyc_status ||
          'pending',

        kyc_tier:
          Number(
            user.kyc_tier || 0
          ),

        current_balance:
          currentBalance,

        account_limit:
          accountLimit,
      });
    }

    // ========================================================
    // PROJECTED BALANCE
    // ========================================================

    if (
      accountLimit !== null
    ) {

      const projectedBalance =
        currentBalance +
        depositAmount;

      if (
        projectedBalance >
        accountLimit
      ) {

        const remaining =
          Math.max(
            accountLimit -
              currentBalance,
            0
          );

        await client.query(
          'ROLLBACK'
        );

        return res.status(403).json({
          success: false,

          code:
            'ACCOUNT_BALANCE_LIMIT_EXCEEDED',

          message:
            `This deposit would exceed your current account limit of ₦${accountLimit.toLocaleString()}.`,

          kyc_status:
            user.kyc_status ||
            'pending',

          kyc_tier:
            Number(
              user.kyc_tier || 0
            ),

          current_balance:
            currentBalance,

          account_limit:
            accountLimit,

          remaining_deposit_limit:
            remaining,
        });
      }
    }

    // ========================================================
    // GENERATE REFERENCE
    // ========================================================

    const reference =
      generateReference();

    // ========================================================
    // CREATE PENDING DEPOSIT
    // ========================================================

    const depositResult =
      await client.query(
        `
        INSERT INTO deposits (
          account_id,
          amount,
          currency,
          reference,
          payment_method,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'pending'
        )
        RETURNING
          id,
          account_id,
          amount,
          currency,
          reference,
          payment_method,
          status,
          created_at
        `,
        [
          account.id,
          depositAmount,
          account.currency,
          reference,
          selectedMethod,
        ]
      );

    // ========================================================
    // AUDIT LOG
    // ========================================================

    try {

      await client.query(
        `
        INSERT INTO audit_logs (
          user_id,
          action,
          description
        )
        VALUES (
          $1,
          'deposit_created',
          $2
        )
        `,
        [
          userId,

          `Deposit request ${reference} created for ${depositAmount} ${account.currency}. Payment method: ${selectedMethod}. Balance not credited until provider confirmation.`,
        ]
      );

    } catch (auditError) {

      console.error(
        'Deposit audit log error:',
        auditError
      );
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query(
      'COMMIT'
    );

    // ========================================================
    // REMAINING LIMIT
    // ========================================================

    const remainingLimit =
      accountLimit === null
        ? null
        : Math.max(
            accountLimit -
              currentBalance -
              depositAmount,
            0
          );

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({

      success: true,

      message:
        'Deposit request created successfully and is pending payment processing.',

      deposit:
        depositResult.rows[0],

      account: {

        current_balance:
          currentBalance,

        account_limit:
          accountLimit,

        remaining_after_deposit:
          remainingLimit,

        kyc_status:
          user.kyc_status ||
          'pending',

        kyc_tier:
          Number(
            user.kyc_tier || 0
          ),
      },
    });

  } catch (error) {

    // ========================================================
    // ROLLBACK
    // ========================================================

    try {

      await client.query(
        'ROLLBACK'
      );

    } catch (
      rollbackError
    ) {

      console.error(
        'Deposit rollback error:',
        rollbackError
      );
    }

    console.error(
      'CREATE DEPOSIT ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to create deposit request.',
      error_code:
        error?.code || null,
    });

  } finally {

    client.release();

  }
};


// ============================================================
// GET DEPOSIT HISTORY
// GET /api/deposits
// ============================================================

const getDeposits = async (
  req,
  res
) => {

  try {

    const userId =
      req.user.id;

    const result =
      await pool.query(
        `
        SELECT
          d.id,
          d.account_id,
          d.amount,
          d.currency,
          d.reference,
          d.payment_method,
          d.status,
          d.created_at
        FROM deposits d
        INNER JOIN accounts a
          ON a.id = d.account_id
        WHERE a.user_id = $1
        ORDER BY d.created_at DESC
        LIMIT 100
        `,
        [userId]
      );

    return res.status(200).json({

      success: true,

      deposits:
        result.rows,
    });

  } catch (error) {

    console.error(
      'GET DEPOSITS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve deposit history.',
      error_code:
        error?.code || null,
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getDepositAccount,
  createDeposit,
  getDeposits,
  getAccountLimit,
};
