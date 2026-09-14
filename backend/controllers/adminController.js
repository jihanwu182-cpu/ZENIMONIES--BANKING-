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
      suspendedUsersResult,
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
        WHERE status IN ('suspended', 'blocked')
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
          suspended: suspendedUsersResult.rows[0].total,
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
          pending:
            pendingTransactionsResult.rows[0].total,

          failed:
            failedTransactionsResult.rows[0].total,
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

        k.bvn,
        k.bvn_verification_status,
        k.bvn_verified_at,
        k.bvn_rejection_reason,

        k.document_type,
        k.document_number,
        k.document_front_url,
        k.document_back_url,
        k.selfie_url,
        k.id_verification_status,
        k.id_verified_at,
        k.id_rejection_reason,

        k.tier_3_method,
        k.tier_3_document_url,
        k.tier_3_verification_status,
        k.tier_3_verified_at,
        k.tier_3_rejection_reason,

        k.liveness_status,

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
// KYC DECISION HELPERS
// ============================================================

const KYC_TYPES = {
  BVN: {
    statusColumn: 'bvn_verification_status',
    verifiedColumn: 'bvn_verified',
    verifiedAtColumn: 'bvn_verified_at',
    rejectionColumn: 'bvn_rejection_reason',
    userTier: 1,
  },

  TIER2: {
    statusColumn: 'id_verification_status',
    verifiedColumn: 'id_verified',
    verifiedAtColumn: 'id_verified_at',
    rejectionColumn: 'id_rejection_reason',
    userTier: 2,
  },

  TIER3: {
    statusColumn: 'tier_3_verification_status',
    verifiedColumn: 'tier_3_verified',
    verifiedAtColumn: 'tier_3_verified_at',
    rejectionColumn: 'tier_3_rejection_reason',
    userTier: 3,
  },
};


// ============================================================
// UPDATE OVERALL KYC STATE
// ============================================================

const refreshOverallKycState = async (
  client,
  userId
) => {
  const result = await client.query(
    `
    SELECT
      bvn_verified,
      id_verified,
      tier_3_verified
    FROM users
    WHERE id = $1
    FOR UPDATE
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  const bvnVerified =
    user.bvn_verified === true;

  const idVerified =
    user.id_verified === true;

  const tier3Verified =
    user.tier_3_verified === true;

  const allVerified =
    bvnVerified &&
    idVerified &&
    tier3Verified;

  let highestVerifiedTier = 0;

  if (bvnVerified) {
    highestVerifiedTier = 1;
  }

  if (idVerified) {
    highestVerifiedTier = 2;
  }

  if (tier3Verified) {
    highestVerifiedTier = 3;
  }

  let overallStatus = 'pending';

  if (allVerified) {
    overallStatus = 'approved';
  }

  const rejectedResult = await client.query(
    `
    SELECT
      bvn_verification_status,
      id_verification_status,
      tier_3_verification_status
    FROM kyc_records
    WHERE user_id = $1
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [userId]
  );

  if (rejectedResult.rows.length > 0) {
    const record = rejectedResult.rows[0];

    const hasRejected =
      record.bvn_verification_status === 'rejected' ||
      record.id_verification_status === 'rejected' ||
      record.tier_3_verification_status === 'rejected';

    if (hasRejected && !allVerified) {
      overallStatus = 'rejected';
    }
  }

  await client.query(
    `
    UPDATE users
    SET
      kyc_status = $1,
      kyc_tier = $2,
      is_verified = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    `,
    [
      overallStatus,
      highestVerifiedTier,
      allVerified,
      userId,
    ]
  );

  await client.query(
    `
    UPDATE kyc_records
    SET
      verification_status = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $2
      AND id = (
        SELECT id
        FROM kyc_records
        WHERE user_id = $2
        ORDER BY updated_at DESC
        LIMIT 1
      )
    `,
    [
      overallStatus,
      userId,
    ]
  );

  return {
    overallStatus,
    highestVerifiedTier,
    allVerified,
  };
};


// ============================================================
// ADMIN KYC DECISION
// ============================================================

const processKycDecision = async (
  req,
  res,
  type,
  decision
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const config =
      KYC_TYPES[type];

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Invalid KYC verification type',
      });
    }

    let reason =
      String(
        req.body?.reason ||
        req.body?.rejection_reason ||
        ''
      ).trim();

    if (
      decision === 'reject' &&
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A rejection reason is required.',
      });
    }

    await client.query('BEGIN');

    const recordResult =
      await client.query(
        `
        SELECT
          k.*,
          u.full_name,
          u.email
        FROM kyc_records k

        INNER JOIN users u
          ON u.id = k.user_id

        WHERE k.id = $1

        FOR UPDATE
        `,
        [id]
      );

    if (recordResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'KYC record not found',
      });
    }

    const record =
      recordResult.rows[0];

    const currentStatus =
      String(
        record[config.statusColumn] || ''
      ).toLowerCase();

    // ----------------------------------------------------------
    // VERIFIED = PERMANENT LOCK
    // ----------------------------------------------------------

    if (
      currentStatus === 'verified'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          `${type} verification is already verified and permanently locked.`,
        status: 'verified',
        locked: true,
      });
    }

    // ----------------------------------------------------------
    // ONLY PENDING SUBMISSIONS CAN RECEIVE A DECISION
    // ----------------------------------------------------------

    if (
      currentStatus !== 'pending'
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          `This ${type} verification is not currently pending.`,
        status: currentStatus,
        locked:
          currentStatus === 'verified',
      });
    }

    const now =
      new Date();

    // ----------------------------------------------------------
    // VERIFY
    // ----------------------------------------------------------

    if (decision === 'verify') {
      await client.query(
        `
        UPDATE kyc_records
        SET
          ${config.statusColumn} = 'verified',
          ${config.verifiedAtColumn} = CURRENT_TIMESTAMP,
          ${config.rejectionColumn} = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [id]
      );

      await client.query(
        `
        UPDATE users
        SET
          ${config.verifiedColumn} = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [record.user_id]
      );
    }

    // ----------------------------------------------------------
    // REJECT
    // ----------------------------------------------------------

    if (decision === 'reject') {
      await client.query(
        `
        UPDATE kyc_records
        SET
          ${config.statusColumn} = 'rejected',
          ${config.rejectionColumn} = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          reason,
          id,
        ]
      );

      await client.query(
        `
        UPDATE users
        SET
          ${config.verifiedColumn} = false,
          kyc_status = 'rejected',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [record.user_id]
      );
    }

    const overall =
      await refreshOverallKycState(
        client,
        record.user_id
      );

    // ----------------------------------------------------------
    // AUDIT LOG
    // ----------------------------------------------------------

    const action =
      decision === 'verify'
        ? `admin_${type.toLowerCase()}_verified`
        : `admin_${type.toLowerCase()}_rejected`;

    const description =
      decision === 'verify'
        ? `${type} verification approved by administrator.`
        : `${type} verification rejected by administrator. Reason: ${reason}`;

    await client.query(
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
        $2,
        $3,
        $4,
        $5
      )
      `,
      [
        record.user_id,
        action,
        description,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,

      message:
        decision === 'verify'
          ? `${type} verification approved successfully.`
          : `${type} verification rejected successfully.`,

      kyc: {
        id: record.id,
        user_id: record.user_id,
        type,
        status:
          decision === 'verify'
            ? 'verified'
            : 'rejected',

        rejection_reason:
          decision === 'reject'
            ? reason
            : null,

        locked:
          decision === 'verify',

        verified_at:
          decision === 'verify'
            ? now
            : null,

        overall_status:
          overall.overallStatus,

        kyc_tier:
          overall.highestVerifiedTier,

        account_verified:
          overall.allVerified,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'KYC rollback error:',
        rollbackError
      );
    }

    console.error(
      `Admin ${type} ${decision} error:`,
      error
    );

    return res.status(500).json({
      success: false,
      message:
        `Unable to ${decision} ${type} verification`,
    });
  } finally {
    client.release();
  }
};


// ============================================================
// BVN VERIFICATION
// POST /api/admin/kyc/:id/bvn/verify
// ============================================================

const verifyBvn = async (req, res) => {
  return processKycDecision(
    req,
    res,
    'BVN',
    'verify'
  );
};


// ============================================================
// BVN REJECTION
// POST /api/admin/kyc/:id/bvn/reject
// ============================================================

const rejectBvn = async (req, res) => {
  return processKycDecision(
    req,
    res,
    'BVN',
    'reject'
  );
};


// ============================================================
// TIER 2 VERIFICATION
// POST /api/admin/kyc/:id/tier2/verify
// ============================================================

const verifyTier2 = async (req, res) => {
  return processKycDecision(
    req,
    res,
    'TIER2',
    'verify'
  );
};


// ============================================================
// TIER 2 REJECTION
// POST /api/admin/kyc/:id/tier2/reject
// ============================================================

const rejectTier2 = async (req, res) => {
  return processKycDecision(
    req,
    res,
    'TIER2',
    'reject'
  );
};


// ============================================================
// TIER 3 VERIFICATION
// POST /api/admin/kyc/:id/tier3/verify
// ============================================================

const verifyTier3 = async (req, res) => {
  return processKycDecision(
    req,
    res,
    'TIER3',
    'verify'
  );
};


// ============================================================
// TIER 3 REJECTION
// POST /api/admin/kyc/:id/tier3/reject
// ============================================================

const rejectTier3 = async (req, res) => {
  return processKycDecision(
    req,
    res,
    'TIER3',
    'reject'
  );
};


// ============================================================
// GET TRANSACTIONS
// GET /api/admin/transactions
// ============================================================

const getTransactions = async (req, res) => {
  try {
    const status =
      String(req.query.status || '').trim();

    const type =
      String(req.query.type || '').trim();

    const search =
      String(req.query.search || '').trim();

    const values = [];
    const conditions = [];

    if (status) {
      values.push(status);

      conditions.push(
        `t.status = $${values.length}`
      );
    }

    if (type) {
      values.push(type);

      conditions.push(
        `t.type = $${values.length}`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          t.reference ILIKE $${values.length}
          OR u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
          OR a.account_number ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.account_id,

        a.account_number,

        u.id AS user_id,
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
        ON a.id = t.account_id

      INNER JOIN users u
        ON u.id = a.user_id

      ${whereClause}

      ORDER BY t.created_at DESC

      LIMIT 300
      `,
      values
    );

    return res.status(200).json({
      success: true,
      transactions: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin transactions error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load transactions',
    });
  }
};


// ============================================================
// GET AUDIT LOGS
// GET /api/admin/audit-logs
// ============================================================

const getAuditLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        al.id,
        al.user_id,

        u.full_name,
        u.email,

        al.action,
        al.description,
        al.ip_address,
        al.user_agent,
        al.created_at

      FROM audit_logs al

      LEFT JOIN users u
        ON u.id = al.user_id

      ORDER BY al.created_at DESC

      LIMIT 300
      `
    );

    return res.status(200).json({
      success: true,
      audit_logs: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin audit logs error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load audit logs',
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getDashboard,
  getUsers,
  getUser,
  updateUserStatus,
  getKycRecords,

  // KYC decisions
  verifyBvn,
  rejectBvn,
  verifyTier2,
  rejectTier2,
  verifyTier3,
  rejectTier3,

  getTransactions,
  getAuditLogs,
};
