const pool = require('../config/database');


// ============================================================
// ACCOUNT LIMITS
// ============================================================
//
// NOT VERIFIED:
// Maximum account balance = ₦50,000
//
// VERIFIED TIER 1:
// Maximum account balance = ₦200,000
//
// VERIFIED TIER 2:
// Maximum account balance = ₦500,000
//
// VERIFIED TIER 3:
// No account balance limit
//
// IMPORTANT:
// These limits are also enforced when money is credited.
// ============================================================

const getAccountLimit = (
  kycStatus,
  kycTier
) => {
  const status =
    String(
      kycStatus || ''
    ).toLowerCase();

  const tier =
    Number(
      kycTier || 0
    );


  // ----------------------------------------------------------
  // NOT VERIFIED / PENDING / REJECTED
  // ----------------------------------------------------------

  if (
    status !== 'verified' &&
    status !== 'approved' &&
    status !== 'completed'
  ) {
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
  // VERIFIED BUT NO VALID TIER
  // ----------------------------------------------------------

  return 50000;
};


// ============================================================
// GET ACCOUNT
// ============================================================

const getAccount = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.id;


    // --------------------------------------------------------
    // GET USER KYC STATUS
    // --------------------------------------------------------

    const userResult =
      await pool.query(
        `
        SELECT
          id,
          full_name,
          kyc_status,
          kyc_tier
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );


    if (
      userResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          'User not found',
      });
    }


    const user =
      userResult.rows[0];


    // --------------------------------------------------------
    // GET ACCOUNT
    // --------------------------------------------------------

    const result =
      await pool.query(
        `
        SELECT
          id,
          account_number,
          account_type,
          currency,
          balance,
          status,
          created_at
        FROM accounts
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [userId]
      );


    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Account not found',
      });
    }


    const account =
      result.rows[0];


    const balance =
      Number(
        account.balance || 0
      );


    const accountLimit =
      getAccountLimit(
        user.kyc_status,
        user.kyc_tier
      );


    const remainingLimit =
      accountLimit === null
        ? null
        : Math.max(
            accountLimit -
              balance,
            0
          );


    // --------------------------------------------------------
    // RETURN ACCOUNT
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      account: {
        ...account,

        balance,

        // KYC information
        kyc_status:
          user.kyc_status ||
          'not_verified',

        kyc_tier:
          Number(
            user.kyc_tier || 0
          ),

        // Account balance limits
        account_limit:
          accountLimit,

        remaining_account_limit:
          remainingLimit,

        limit_reached:
          accountLimit !== null &&
          balance >=
            accountLimit,
      },
    });

  } catch (error) {

    console.error(
      'Get account error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve account',
    });
  }
};


// ============================================================
// GET TRANSACTIONS
// ============================================================
//
// IMPORTANT:
//
// Customer transaction history must contain the real ledger
// information required to display a transaction.
//
// We DO NOT expose:
//   - balance_before
//   - balance_after
//
// Those values remain privately stored in the database for
// accounting and reconciliation.
//
// The real transaction_fee is returned directly from the
// transactions table.
//
// This is important because the transfer fee must never be
// replaced with a fake zero.
//
// ============================================================

const getTransactions = async (
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
          t.id,
          t.type,
          t.amount,
          t.currency,
          t.reference,
          t.description,
          t.status,
          t.created_at,

          -- ------------------------------------------------
          -- RECIPIENT INFORMATION
          -- ------------------------------------------------

          bt.recipient_name
            AS recipient_name,

          bt.recipient_phone
            AS recipient_phone,

          bt.recipient_account_number
            AS recipient_account,

          bt.recipient_bank_name
            AS recipient_bank,

          -- ------------------------------------------------
          -- REAL TRANSACTION FEE
          -- ------------------------------------------------
          --
          -- IMPORTANT:
          -- Do NOT replace this with 0.
          --

          COALESCE(
            t.transaction_fee,
            0
          ) AS transaction_fee

        FROM transactions t

        INNER JOIN accounts a
          ON a.id = t.account_id

        LEFT JOIN bank_transfers bt
          ON bt.account_id =
             t.account_id
         AND bt.reference =
             t.reference

        WHERE a.user_id = $1

        ORDER BY
          t.created_at DESC

        LIMIT 100
        `,
        [userId]
      );


    // --------------------------------------------------------
    // NORMALIZE TRANSACTION DATA
    // --------------------------------------------------------

    const transactions =
      result.rows.map(
        (transaction) => {

          const amount =
            Number(
              transaction.amount ||
                0
            );


          const transactionFee =
            Number(
              transaction.transaction_fee ||
                0
            );


          return {
            ...transaction,

            // PostgreSQL NUMERIC values
            // can be returned as strings.
            amount,

            transaction_fee:
              transactionFee,

            currency:
              transaction.currency ||
              'NGN',

            // IMPORTANT:
            // Never assume a missing status
            // means successful.
            status:
              transaction.status ||
              'unknown',
          };
        }
      );


    // --------------------------------------------------------
    // RETURN TRANSACTIONS
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      transactions,
    });

  } catch (error) {

    console.error(
      'Get transactions error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve transactions',
    });
  }
};


// ============================================================
// GET ACCOUNT LIMIT
// ============================================================
//
// This endpoint is allowed to return the current balance
// because it is specifically used for account-limit management.
//
// This is separate from transaction receipts.
//
// ============================================================

const getAccountLimits = async (
  req,
  res
) => {
  try {

    const userId =
      req.user.id;


    // --------------------------------------------------------
    // GET USER KYC
    // --------------------------------------------------------

    const result =
      await pool.query(
        `
        SELECT
          kyc_status,
          kyc_tier
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );


    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          'User not found',
      });
    }


    const user =
      result.rows[0];


    // --------------------------------------------------------
    // GET ACCOUNT BALANCE
    // --------------------------------------------------------

    const accountResult =
      await pool.query(
        `
        SELECT
          balance,
          currency
        FROM accounts
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [userId]
      );


    const balance =
      accountResult.rows.length > 0
        ? Number(
            accountResult.rows[0]
              .balance || 0
          )
        : 0;


    // --------------------------------------------------------
    // CALCULATE LIMIT
    // --------------------------------------------------------

    const accountLimit =
      getAccountLimit(
        user.kyc_status,
        user.kyc_tier
      );


    const remaining =
      accountLimit === null
        ? null
        : Math.max(
            accountLimit -
              balance,
            0
          );


    // --------------------------------------------------------
    // RETURN LIMIT INFORMATION
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      kyc_status:
        user.kyc_status ||
        'not_verified',

      kyc_tier:
        Number(
          user.kyc_tier || 0
        ),

      current_balance:
        balance,

      account_limit:
        accountLimit,

      remaining:
        remaining,

      limit_reached:
        accountLimit !== null &&
        balance >=
          accountLimit,
    });

  } catch (error) {

    console.error(
      'Get account limits error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve account limits',
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAccount,
  getTransactions,
  getAccountLimits,
  getAccountLimit,
};
