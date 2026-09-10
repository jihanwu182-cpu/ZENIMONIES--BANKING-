const pool = require('../config/database');

// ============================================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// ============================================================

const getDashboard = async (req, res) => {
  try {
    const [
      usersResult,
      activeUsersResult,
      pendingKycResult,
      approvedKycResult,
      rejectedKycResult,
      depositsResult,
      withdrawalsResult,
      transfersResult,
      pendingTransactionsResult,
      failedTransactionsResult,
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE status = 'active'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE kyc_status IN ('pending', 'under_review')
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE kyc_status = 'approved'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE kyc_status = 'rejected'
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0)::numeric AS total_amount,
          COUNT(*)::int AS count
        FROM deposits
        WHERE status = 'completed'
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0)::numeric AS total_amount,
          COUNT(*)::int AS count
        FROM withdrawals
        WHERE status = 'completed'
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0)::numeric AS total_amount,
          COUNT(*)::int AS count
        FROM bank_transfers
        WHERE status = 'completed'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM transactions
        WHERE status = 'pending'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM transactions
        WHERE status = 'failed'
      `),
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total: usersResult.rows[0].total,
          active: activeUsersResult.rows[0].total,
        },

        kyc: {
          pending: pendingKycResult.rows[0].total,
          approved: approvedKycResult.rows[0].total,
          rejected: rejectedKycResult.rows[0].total,
        },

        deposits: {
          count: depositsResult.rows[0].count,
          total_amount: depositsResult.rows[0].total_amount,
        },

        withdrawals: {
          count: withdrawalsResult.rows[0].count,
          total_amount:
            withdrawalsResult.rows[0].total_amount,
        },

        transfers: {
          count: transfersResult.rows[0].count,
          total_amount:
            transfersResult.rows[0].total_amount,
        },

        transactions: {
          pending: pendingTransactionsResult.rows[0].total,
          failed: failedTransactionsResult.rows[0].total,
        },
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load admin dashboard',
    });
  }
};


// ============================================================
// GET USERS
// GET /api/admin/users
// ============================================================

const getUsers = async (req, res) => {
  try {
    const search =
      String(req.query.search || '').trim();

    const status =
      String(req.query.status || '').trim();

    const kycStatus =
      String(req.query.kyc_status || '').trim();

    const values = [];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          full_name ILIKE $${values.length}
          OR email ILIKE $${values.length}
          OR phone ILIKE $${values.length}
        )
      `);
    }

    if (status) {
      values.push(status);

      conditions.push(
        `status = $${values.length}`
      );
    }

    if (kycStatus) {
      values.push(kycStatus);

      conditions.push(
        `kyc_status = $${values.length}`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        is_verified,
        account_limit,
        daily_transfer_limit,
        daily_transfer_used,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 200
      `,
      values
    );

    return res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error('Admin users error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load users',
    });
  }
};


// ============================================================
// GET SINGLE USER
// GET /api/admin/users/:id
// ============================================================

const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status,
        kyc_status,
        kyc_tier,
        bvn_verified,
        id_verified,
        tier_3_verified,
        tier_3_method,
        is_verified,
        account_limit,
        daily_transfer_limit,
        daily_transfer_used,
        daily_transfer_reset_at,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const accountResult = await pool.query(
      `
      SELECT
        id,
        account_number,
        account_type,
        currency,
        balance,
        status,
        created_at,
        updated_at
      FROM accounts
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      user: userResult.rows[0],
      accounts: accountResult.rows,
    });
  } catch (error) {
    console.error('Admin get user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load user',
    });
  }
};


// ============================================================
// UPDATE USER STATUS
// PATCH /api/admin/users/:id/status
// ============================================================

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allowedStatuses = [
      'active',
      'suspended',
      'blocked',
      'pending',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status',
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        full_name,
        email,
        phone,
        role,
        status,
        kyc_status,
        kyc_tier,
        is_verified,
        updated_at
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await pool.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'admin_user_status_changed',
        $2,
        $3,
        $4
      )
      `,
      [
        id,
        `User account status changed to ${status}`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Admin update user status error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to update user status',
    });
  }
};


// ============================================================
// GET KYC RECORDS
// GET /api/admin/kyc
// ============================================================

const getKycRecords = async (req, res) => {
  try {
    const status =
      String(
        req.query.status ||
        req.query.verification_status ||
        ''
      ).trim();

    const values = [];
    let whereClause = '';

    if (status) {
      values.push(status);

      whereClause = `
        WHERE k.verification_status = $1
      `;
    }

    const result = await pool.query(
      `
      SELECT
        k.id,
        k.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.kyc_tier,

        k.bvn_verification_status,
        k.bvn_verified_at,

        k.document_type,
        k.id_verification_status,
        k.id_verified_at,

        k.tier_3_method,
        k.tier_3_verification_status,
        k.tier_3_verified_at,

        k.verification_status,
        k.rejection_reason,

        k.created_at,
        k.updated_at

      FROM kyc_records k

      INNER JOIN users u
        ON u.id = k.user_id

      ${whereClause}

      ORDER BY k.created_at DESC

      LIMIT 200
      `,
      values
    );

    return res.status(200).json({
      success: true,
      kyc_records: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin KYC records error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load KYC records',
    });
  }
};


// ============================================================
// GET TRANSACTIONS
// GET /api/admin/transactions
// ============================================================

const getTransactions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.account_id,
        a.account_number,
        u.full_name,
        u.email,
        t.type,
        t.amount,
        t.currency,
        t.reference,
        t.description,
        t.status,
        t.balance_before,
        t.balance_after,
        t.created_at
      FROM transactions t

      INNER JOIN accounts a
       
