const pool = require('../config/database');


// ============================================================
// ACCOUNT LIMITS
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
  // NOT VERIFIED
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


    return res.status(200).json({
      success: true,

      account: {
        ...account,

        balance,

        kyc_status:
          user.kyc_status ||
          'not_verified',

        kyc_tier:
          Number(
            user.kyc_tier || 0
          ),

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
      error?.message ||
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
// IMPORTANT SECURITY RULE:
//
// The customer transaction history DOES NOT expose:
//
//   balance_before
//   balance_after
//
// Those remain in the database for accounting,
// reconciliation and internal controls.
//
// The history DOES expose the real transaction information
// necessary for the customer's receipt:
//
//   - Sender
//   - Receiver
//   - Phone number
//   - Account number
//   - Bank
//   - Airtime provider
//   - Airtime phone number
//   - Data provider/network
//   - Data phone number
//   - Data plan
//   - Electricity/TV/bill provider
//   - Customer reference
//   - Provider reference
//   - Transaction fee
//   - Real transaction reference
//   - Status
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

          -- ==================================================
          -- CENTRAL TRANSACTION
          -- ==================================================

          t.id,
          t.type,
          t.amount,
          t.currency,
          t.reference,
          t.description,
          t.status,
          t.created_at,


          -- ==================================================
          -- CURRENT ACCOUNT / USER
          -- ==================================================

          a.account_number
            AS current_account_number,

          
          cu.full_name
          AS current_user_name,

            cu.phone
           AS current_user_phone,

          -- ==================================================
          -- REAL TRANSACTION FEE
          -- ==================================================

          COALESCE(
            t.transaction_fee,
            0
          ) AS transaction_fee,


          -- ==================================================
          -- CALCULATED TOTAL DEBIT
          -- ==================================================
          --
          -- For outgoing transfers:
          --
          -- amount + transaction_fee
          --
          -- For other transactions:
          -- amount
          --
          -- This is calculated from the actual ledger values.
          --

          CASE
            WHEN
              (
                LOWER(t.type)
                LIKE '%transfer%'
              )
              AND
              COALESCE(
                t.transaction_fee,
                0
              ) > 0
            THEN
              ABS(t.amount) +
              COALESCE(
                t.transaction_fee,
                0
              )

            ELSE
              ABS(t.amount)
          END
          AS total_debit,


          -- ==================================================
          -- ZENIMONIES TRANSFER
          -- ==================================================

          bt.recipient_name
            AS transfer_recipient_name,

          bt.recipient_account_number
            AS transfer_recipient_account,

          bt.recipient_bank_name
            AS transfer_recipient_bank,

          bt.recipient_bank_code
            AS transfer_recipient_bank_code,

          /*
           * Internal Zenimonies transfers use recipient_phone
           * in the current bank transfer record only when that
           * field exists.
           *
           * We also keep the transaction's phone-compatible
           * value below for receipt compatibility.
           */

          bt.reference
            AS transfer_reference,


          -- ==================================================
          -- TRANSFER SENDER
          -- ==================================================
          --
          -- For a received transfer, bank_transfers.account_id
          -- identifies the sender's account.
          --

          sender_user.full_name
            AS transfer_sender_name,

          sender_user.phone
            AS transfer_sender_phone,

          sender_account.account_number
            AS transfer_sender_account,


          -- ==================================================
          -- AIRTIME
          -- ==================================================

          airtime.network
            AS airtime_provider,

          airtime.phone_number
            AS airtime_phone,

          airtime.provider_reference
            AS airtime_provider_reference,


          -- ==================================================
          -- DATA
          -- ==================================================

          data_tx.network
            AS data_provider,

          data_tx.phone_number
            AS data_phone,

          data_tx.plan_code
            AS data_plan_code,

          data_tx.plan_name
            AS data_plan,

          data_tx.provider_reference
            AS data_provider_reference,


          -- ==================================================
          -- BILL PAYMENTS
          -- ==================================================

          bill.biller_name
            AS bill_provider,

          bill.category
            AS bill_category,

          bill.customer_reference
            AS bill_customer_reference,

          bill.customer_name
            AS bill_customer_name,

          bill.provider_reference
            AS bill_provider_reference


        FROM transactions t


        -- ====================================================
        -- CUSTOMER ACCOUNT
        -- ====================================================

        INNER JOIN accounts a
          ON a.id =
             t.account_id


        -- ====================================================
        -- CUSTOMER USER
        -- ====================================================

        INNER JOIN users cu
          ON cu.id =
          a.user_id

        -- ====================================================
        -- ZENIMONIES / BANK TRANSFERS
        -- ====================================================
        --
        -- IMPORTANT:
        --
        -- We join by reference, not only account_id.
        --
        -- This allows a received Zenimonies transfer to find
        -- the original sender's bank transfer record.
        --

        LEFT JOIN bank_transfers bt
          ON bt.reference =
             t.reference


        -- ====================================================
        -- SENDER ACCOUNT
        -- ====================================================

        LEFT JOIN accounts sender_account
          ON sender_account.id =
             bt.account_id


        -- ====================================================
        -- SENDER USER
        -- ====================================================

        LEFT JOIN users sender_user
          ON sender_user.id =
             sender_account.user_id


        -- ====================================================
        -- AIRTIME
        -- ====================================================

        LEFT JOIN airtime_transactions airtime
          ON airtime.reference =
             t.reference


        -- ====================================================
        -- DATA
        -- ====================================================

        LEFT JOIN data_transactions data_tx
          ON data_tx.reference =
             t.reference


        -- ====================================================
        -- BILL PAYMENTS
        -- ====================================================

        LEFT JOIN bill_payments bill
          ON bill.reference =
             t.reference


        -- ====================================================
        -- SECURITY
        -- ====================================================
        --
        -- Only return transactions belonging to the logged-in
        -- user's account.
        --

        WHERE a.user_id = $1


        ORDER BY
          t.created_at DESC


        LIMIT 100
        `,
        [userId]
      );


    // ========================================================
    // NORMALIZE TRANSACTIONS
    // ========================================================

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


          const totalDebit =
            Number(
              transaction.total_debit ||
                Math.abs(
                  amount
                )
            );


          const type =
            String(
              transaction.type ||
                ''
            ).toLowerCase();


          const description =
            String(
              transaction.description ||
                ''
            );


          // ==================================================
          // TRANSFER DETECTION
          // ==================================================

          const isTransfer =
            type.includes(
              'transfer'
            ) ||
            description
              .toLowerCase()
              .includes(
                'transfer'
              );


          const isReceivedTransfer =
            type ===
              'internal_transfer_received' ||
            type.includes(
              'received'
            );


          // ==================================================
          // SENDER INFORMATION
          // ==================================================

          const senderName =
            isReceivedTransfer
              ? (
                  transaction.transfer_sender_name ||
                  ''
                )
              : (
                  transaction.current_user_name ||
                  ''
                );


          const senderPhone =
            isReceivedTransfer
              ? (
                  transaction.transfer_sender_phone ||
                  ''
                )
              : (
                  transaction.current_user_phone ||
                  ''
                );


          const senderAccount =
            isReceivedTransfer
              ? (
                  transaction.transfer_sender_account ||
                  ''
                )
              : (
                  transaction.current_account_number ||
                  ''
                );


          // ==================================================
          // RECIPIENT INFORMATION
          // ==================================================

          const recipientName =
            transaction.transfer_recipient_name ||
            '';


          const recipientAccount =
            transaction.transfer_recipient_account ||
            '';


          const recipientBank =
            transaction.transfer_recipient_bank ||
            '';


          // ==================================================
          // PROVIDER
          // ==================================================

          const provider =
            transaction.airtime_provider ||
            transaction.data_provider ||
            transaction.bill_provider ||
            '';


          // ==================================================
          // PHONE
          // ==================================================

          const servicePhone =
            transaction.airtime_phone ||
            transaction.data_phone ||
            '';


          // ==================================================
          // CUSTOMER NUMBER
          // ==================================================

          const customerReference =
            transaction.bill_customer_reference ||
            '';


          // ==================================================
          // PROVIDER REFERENCE
          // ==================================================

          const providerReference =
            transaction.airtime_provider_reference ||
            transaction.data_provider_reference ||
            transaction.bill_provider_reference ||
            null;


          // ==================================================
          // RETURN REAL TRANSACTION DATA
          // ==================================================

          return {

            ...transaction,


            // ------------------------------------------------
            // PostgreSQL NUMERIC normalization
            // ------------------------------------------------

            amount,

            transaction_fee:
              transactionFee,

            total_debit:
              totalDebit,


            currency:
              transaction.currency ||
              'NGN',


            status:
              transaction.status ||
              'unknown',


            // ------------------------------------------------
            // TRANSFER RECEIPT FIELDS
            // ------------------------------------------------

            sender_name:
              senderName,

            sender_phone:
              senderPhone,

            sender_account:
              senderAccount,


            recipient_name:
              recipientName,

            recipient_phone:
              transaction.transfer_recipient_phone ||
              '',

            recipient_account:
              recipientAccount,

            recipient_bank:
              recipientBank,


            // ------------------------------------------------
            // AIRTIME / DATA / BILL RECEIPT FIELDS
            // ------------------------------------------------

            provider,

            network:
              transaction.airtime_provider ||
              transaction.data_provider ||
              '',

            phone:
              servicePhone,

            customer_number:
              customerReference,


            // ------------------------------------------------
            // DATA PLAN
            // ------------------------------------------------

            data_plan:
              transaction.data_plan ||
              '',

            plan_name:
              transaction.data_plan ||
              '',

            variation_name:
              transaction.data_plan ||
              '',


            // ------------------------------------------------
            // PROVIDER REFERENCE
            // ------------------------------------------------

            provider_reference:
              providerReference,
          };
        }
      );


    // ========================================================
    // RETURN TRANSACTIONS
    // ========================================================

    return res.status(200).json({
      success: true,
      transactions,
    });

  } catch (error) {

    console.error(
      'Get transactions error:',
      error?.message ||
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
// GET ACCOUNT LIMITS
// ============================================================
//
// This endpoint is specifically for account-limit management.
// It may return the current balance.
//
// Transaction receipts/history do NOT use this endpoint for
// balance information.
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
      error?.message ||
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
