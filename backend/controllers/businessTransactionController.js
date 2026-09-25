const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// BUSINESS TRANSACTION HISTORY
// ============================================================

const getBusinessTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const businessId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // --------------------------------------------------------
    // Validate pagination
    // --------------------------------------------------------

    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        parseInt(req.query.limit, 10) || 20
      )
    );

    const offset = (page - 1) * limit;

    // --------------------------------------------------------
    // Verify that this business belongs to the logged-in user
    // --------------------------------------------------------

    const businessResult = await pool.query(
      `
      SELECT
        id,
        owner_user_id,
        business_account_id,
        business_name,
        currency,
        status
      FROM businesses
      WHERE id = $1
        AND owner_user_id = $2
      LIMIT 1
      `,
      [businessId, userId]
    );

    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Business not found or access denied.',
      });
    }

    const business = businessResult.rows[0];

    // --------------------------------------------------------
    // Get total transaction count for this business account
    // --------------------------------------------------------

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::INTEGER AS total
      FROM transactions
      WHERE account_id = $1
      `,
      [business.business_account_id]
    );

    const total = countResult.rows[0].total;

    // --------------------------------------------------------
    // Fetch transactions from the central ledger
    // --------------------------------------------------------

    const transactionsResult = await pool.query(
      `
      SELECT
        id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after,
        transaction_fee,
        created_at
      FROM transactions
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      OFFSET $3
      `,
      [
        business.business_account_id,
        limit,
        offset,
      ]
    );

    const transactions = transactionsResult.rows.map(
      (transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount || 0),
        currency:
          transaction.currency || business.currency,
        reference: transaction.reference,
        description: transaction.description,
        status: transaction.status,
        balance_before:
          Number(transaction.balance_before || 0),
        balance_after:
          Number(transaction.balance_after || 0),
        transaction_fee:
          Number(transaction.transaction_fee || 0),
        created_at: transaction.created_at,
      })
    );

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      business: {
        id: business.id,
        business_name: business.business_name,
        currency: business.currency,
      },
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error(
      'Business transaction history error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load business transactions.',
    });
  }
};

module.exports = {
  getBusinessTransactions,
};
