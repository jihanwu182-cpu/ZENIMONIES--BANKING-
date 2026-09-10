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
//
// IMPORTANT:
// These limits are enforced by the backend.
// The frontend cannot bypass them.
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

  // ----------------------------------------------------------
  // ONLY APPROVED/VERIFIED KYC CAN RECEIVE A HIGHER LIMIT
  // ----------------------------------------------------------

  const isVerified =
    status === 'verified' ||
    status === 'approved' ||
    status === 'completed';

  if (!isVerified) {
    return 50000;
  }

  // ----------------------------------------------------------
  // TIER 3
  // ----------------------------------------------------------

  if (tier >= 3) {
    return null;
  }

  // ----------------------------------------------------------
  // TIER 2
  // ----------------------------------------------------------

  if (tier === 2) {
    return 500000;
  }

  // ----------------------------------------------------------
  // TIER 1
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
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        active: false,
        message:
          'Deposit account is not activated yet.',
        deposit_account: null,
      });
    }

    return res.status(200).json({
      success: true,
      active: true,
      message:
        'Deposit account found.',
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
        'Unable to retrieve deposit account',
      error_code:
        error?.code || null,
    });
  }
};


// ============================================================
// CREATE DEPOSIT
// ============================================================
//
// IMPORTANT:
//
// This endpoint creates a PENDING deposit.
//
// It does NOT directly increase the account balance.
//
// The actual balance must only be increased after the
// payment provider confirms that the payment was successful.
//
// The same account-limit check must also be performed again
// inside the payment-provider webhook/crediting controller.
// ============================================================

const createDeposit = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const userId = req.user.id;

    const {
      amount,
      method,
    } = req.body || {};

    // --------------------------------------------------------
    // VALIDATE REQUEST
    // --------------------------------------------------------

    if (
      amount === undefined ||
      amount === null ||
      !method
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount and payment method are required',
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
          'Deposit amount must be greater than zero',
      });
    }

    if (
      depositAmount > 100000000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Deposit amount is too large',
      });
    }

    const allowedMethods = [
      'card',
      'bank_transfer',
    ];

    if (
      !allowedMethods.includes(
        method
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid payment method',
      });
    }

    // --------------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------------

    await client.query('BEGIN');

    // --------------------------------------------------------
    // GET USER KYC STATUS
    // --------------------------------------------------------
    //
    // We lock the user row so the KYC status cannot change
    // halfway through this operation.
    // --------------------------------------------------------

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
          'User not found',
      });
    }

    const user =
      userResult.rows[0];

    // --------------------------------------------------------
    // GET ACTIVE ACCOUNT
    // --------------------------------------------------------

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
          'Active account not found',
      });
    }

    const account =
      accountResult.rows[0];

    // --------------------------------------------------------
    // CURRENT BALANCE
    // --------------------------------------------------------

    const currentBalance =
      Number(
        account.balance || 0
      );

    // --------------------------------------------------------
    // DETERMINE ACCOUNT LIMIT
    // --------------------------------------------------------

    const accountLimit =
      getAccountLimit(
        user.kyc_status,
        user.kyc_tier
      );

    // --------------------------------------------------------
    // CHECK CURRENT BALANCE
    // --------------------------------------------------------

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
          'not_verified',
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

    // --------------------------------------------------------
    // CHECK WHETHER THIS DEPOSIT WOULD EXCEED THE LIMIT
    // --------------------------------------------------------

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
            'not_verified',

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

    // --------------------------------------------------------
    // GENERATE UNIQUE REFERENCE
    // --------------------------------------------------------

    const reference =
      generateReference();

    // --------------------------------------------------------
    // CREATE PENDING DEPOSIT
    // --------------------------------------------------------
    //
    // IMPORTANT:
    //
    // Balance is NOT increased here.
    //
    // Payment provider confirmation is required first.
    // --------------------------------------------------------

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
          method,
        ]
      );

    // --------------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------------

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
          `Deposit request ${reference} created for ${depositAmount} ${account.currency}`,
        ]
      );
    } catch (auditError) {
      // Do not allow an optional audit-log failure to
      // prevent the deposit request from being created.
      console.error(
        'Deposit audit log error:',
        auditError
      );
    }

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query(
      'COMMIT'
    );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    const remainingLimit =
      accountLimit === null
        ? null
        : Math.max(
            accountLimit -
              currentBalance -
              depositAmount,
            0
          );

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
          'not_verified',

        kyc_tier:
          Number(
            user.kyc_tier || 0
          ),
      },
    });
  } catch (error) {
    // --------------------------------------------------------
    // ROLLBACK
    // --------------------------------------------------------

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
        'Unable to create deposit request',
      error_code:
        error?.code || null,
    });
  } finally {
    client.release();
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getDepositAccount,
  createDeposit,
  getAccountLimit,
};
