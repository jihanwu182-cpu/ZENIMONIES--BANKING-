const pool = require('../config/database');
const {
  cloudinary,
  configureCloudinary,
} = require('../config/cloudinary');
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

      // Count users with any pending KYC stage.
      // This includes customers whose overall user KYC status
      // does not currently say pending.
      pool.query(`
        SELECT COUNT(DISTINCT u.id)::int AS total
        FROM users u
        WHERE
          u.kyc_status IN ('pending', 'under_review')
          OR EXISTS (
            SELECT 1
            FROM kyc_records k
            WHERE k.user_id = u.id
              AND (
                LOWER(COALESCE(k.verification_status, ''))
                  IN ('pending', 'under_review')

                OR LOWER(COALESCE(k.bvn_verification_status, ''))
                  IN ('pending', 'under_review')

                OR LOWER(COALESCE(k.nin_verification_status, ''))
                  IN ('pending', 'under_review')

                OR LOWER(COALESCE(k.id_verification_status, ''))
                  IN ('pending', 'under_review')

                OR LOWER(COALESCE(k.tier_3_verification_status, ''))
                  IN ('pending', 'under_review')
              )
          )
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE kyc_status = 'verified'
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
        nin_verified,
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
        nin_verified,
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
    const result = await pool.query(`
      SELECT
        k.id,
        k.user_id,

        u.full_name,
        u.email,
        u.phone,
        u.address,
        u.city,
        u.state,
        u.lga,
        u.country,
        u.kyc_tier,
        u.kyc_status,
        u.bvn_verified,
        u.nin_verified,
        u.id_verified,
        u.tier_3_verified,
        u.is_verified,

        -- Tier 1: use the explicitly selected method first.
        COALESCE(
          NULLIF(LOWER(BTRIM(k.tier1_method)), ''),
          CASE
            WHEN NULLIF(BTRIM(COALESCE(k.bvn, '')), '') IS NOT NULL
              AND NULLIF(BTRIM(COALESCE(k.nin, '')), '') IS NULL
              THEN 'bvn'
            WHEN NULLIF(BTRIM(COALESCE(k.nin, '')), '') IS NOT NULL
              AND NULLIF(BTRIM(COALESCE(k.bvn, '')), '') IS NULL
              THEN 'nin'
            ELSE NULL
          END
        ) AS tier1_method,

        k.bvn,
        k.bvn_verification_status,
        k.bvn_verified_at,
        k.bvn_rejection_reason,
        k.bvn_provider_validation_result,

        k.nin,
        k.nin_verification_status,
        k.nin_verified_at,
        k.nin_rejection_reason,
        k.nin_provider_validation_result,

        -- Tier 2: identity submission.
        COALESCE(t2.id, k.id) AS tier2_record_id,

        COALESCE(
          NULLIF(BTRIM(t2.document_type), ''),
          NULLIF(BTRIM(k.document_type), '')
        ) AS document_type,

        COALESCE(
          NULLIF(BTRIM(t2.document_number), ''),
          NULLIF(BTRIM(k.document_number), '')
        ) AS document_number,

        CASE
          WHEN u.id_verified = TRUE THEN 'verified'
          ELSE COALESCE(
            NULLIF(t2.id_verification_status, ''),
            NULLIF(k.id_verification_status, ''),
            'not_verified'
          )
        END AS id_verification_status,

        COALESCE(
          t2.id_verified_at,
          k.id_verified_at
        ) AS id_verified_at,

        COALESCE(
          t2.id_rejection_reason,
          k.id_rejection_reason
        ) AS id_rejection_reason,

                EXISTS (
          SELECT 1
          FROM kyc_records evidence
          WHERE evidence.user_id = k.user_id
            AND evidence.tier_2_document_front_public_id IS NOT NULL
            AND evidence.tier_2_document_front_public_id <> ''
        ) AS has_tier2_document_front,

        EXISTS (
          SELECT 1
          FROM kyc_records evidence
          WHERE evidence.user_id = k.user_id
            AND evidence.tier_2_document_back_public_id IS NOT NULL
            AND evidence.tier_2_document_back_public_id <> ''
        ) AS has_tier2_document_back,

        EXISTS (
          SELECT 1
          FROM kyc_records evidence
          WHERE evidence.user_id = k.user_id
            AND evidence.tier_2_selfie_public_id IS NOT NULL
            AND evidence.tier_2_selfie_public_id <> ''
        ) AS has_tier2_selfie,

        -- Tier 3: retrieve its actual submission record.
        COALESCE(
          NULLIF(BTRIM(t3.tier_3_method), ''),
          NULLIF(BTRIM(k.tier_3_method), '')
        ) AS tier_3_method,

        COALESCE(
          NULLIF(BTRIM(t3.tier_3_document_type), ''),
          NULLIF(BTRIM(k.tier_3_document_type), '')
        ) AS tier_3_document_type,

        COALESCE(
          NULLIF(BTRIM(t3.employment_status), ''),
          NULLIF(BTRIM(k.employment_status), '')
        ) AS employment_status,

        COALESCE(
          NULLIF(BTRIM(t3.occupation), ''),
          NULLIF(BTRIM(k.occupation), '')
        ) AS occupation,

        COALESCE(
          NULLIF(BTRIM(t3.annual_income_range), ''),
          NULLIF(BTRIM(k.annual_income_range), '')
        ) AS annual_income_range,

        (
          COALESCE(
            t3.tier_3_document_public_id,
            k.tier_3_document_public_id
          ) IS NOT NULL
        ) AS has_tier3_document,

        (
          COALESCE(
            t3.tier_3_selfie_public_id,
            k.tier_3_selfie_public_id
          ) IS NOT NULL
        ) AS has_tier3_selfie,

        CASE
          WHEN u.tier_3_verified = TRUE THEN 'verified'
          ELSE COALESCE(
            NULLIF(t3.tier_3_verification_status, ''),
            NULLIF(k.tier_3_verification_status, ''),
            'not_verified'
          )
        END AS tier_3_verification_status,

        COALESCE(
          t3.tier_3_verified_at,
          k.tier_3_verified_at
        ) AS tier_3_verified_at,

        COALESCE(
          t3.tier_3_rejection_reason,
          k.tier_3_rejection_reason
        ) AS tier_3_rejection_reason,

        COALESCE(
          NULLIF(t3.liveness_status, ''),
          NULLIF(k.liveness_status, '')
        ) AS liveness_status,

        COALESCE(
          t3.liveness_score,
          k.liveness_score
        ) AS liveness_score,

        COALESCE(
          t3.selfie_match_score,
          k.selfie_match_score
        ) AS selfie_match_score,

        COALESCE(
          NULLIF(t3.verification_status, ''),
          NULLIF(k.verification_status, '')
        ) AS verification_status,

        COALESCE(
          t3.rejection_reason,
          k.rejection_reason
        ) AS rejection_reason,

        k.created_at,
        k.updated_at

      FROM kyc_records k

      INNER JOIN users u
        ON u.id = k.user_id

      -- Find the latest record containing Tier 2 identity evidence.
      LEFT JOIN LATERAL (
        SELECT
          t.id,
          t.document_type,
          t.document_number,
          t.id_verification_status,
          t.id_verified_at,
          t.id_rejection_reason,
          t.tier_2_document_front_public_id,
          t.tier_2_document_back_public_id,
          t.tier_2_selfie_public_id

        FROM kyc_records t

        WHERE t.user_id = k.user_id
          AND (
            NULLIF(BTRIM(COALESCE(t.document_type, '')), '') IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(t.document_number, '')), '') IS NOT NULL
            OR t.tier_2_document_front_public_id IS NOT NULL
            OR t.tier_2_document_back_public_id IS NOT NULL
            OR t.tier_2_selfie_public_id IS NOT NULL
          )

        ORDER BY
          t.updated_at DESC NULLS LAST,
          t.created_at DESC

        LIMIT 1
      ) t2 ON TRUE

      -- Find the latest record containing Tier 3 submission evidence.
      LEFT JOIN LATERAL (
        SELECT
          t.id,
          t.tier_3_method,
          t.tier_3_document_type,
          t.employment_status,
          t.occupation,
          t.annual_income_range,
          t.tier_3_document_public_id,
          t.tier_3_selfie_public_id,
          t.tier_3_verification_status,
          t.tier_3_verified_at,
          t.tier_3_rejection_reason,
          t.liveness_status,
          t.liveness_score,
          t.selfie_match_score,
          t.verification_status,
          t.rejection_reason

        FROM kyc_records t

        WHERE t.user_id = k.user_id
          AND (
            NULLIF(BTRIM(COALESCE(t.tier_3_method, '')), '') IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(t.tier_3_document_type, '')), '') IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(t.employment_status, '')), '') IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(t.occupation, '')), '') IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(t.annual_income_range, '')), '') IS NOT NULL
            OR t.tier_3_document_public_id IS NOT NULL
            OR t.tier_3_selfie_public_id IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(t.tier_3_verification_status, '')), '') IS NOT NULL
          )

        ORDER BY
          t.updated_at DESC NULLS LAST,
          t.created_at DESC

        LIMIT 1
      ) t3 ON TRUE

      ORDER BY
        k.created_at DESC

      LIMIT 200
    `);

    return res.status(200).json({
      success: true,
      kyc_records: result.rows,
    });

  } catch (error) {
    console.error(
      'Admin KYC records error:',
      error?.message || 'Unknown error'
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

  NIN: {
    statusColumn: 'nin_verification_status',
    verifiedColumn: 'nin_verified',
    verifiedAtColumn: 'nin_verified_at',
    rejectionColumn: 'nin_rejection_reason',
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
  const userResult = await client.query(
    `
    SELECT
      bvn_verified,
      nin_verified,
      id_verified,
      tier_3_verified
    FROM users
    WHERE id = $1
    FOR UPDATE
    `,
    [userId]
  );

  if (!userResult.rows.length) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  const bvnVerified = user.bvn_verified === true;
  const ninVerified = user.nin_verified === true;

  const tier1Verified =
    bvnVerified || ninVerified;

  const tier2Verified =
    bvnVerified && user.id_verified === true;

  const tier3Verified =
    tier2Verified && user.tier_3_verified === true;

  const highestVerifiedTier = tier3Verified
    ? 3
    : tier2Verified
      ? 2
      : tier1Verified
        ? 1
        : 0;

  // Read the latest selected Tier 1 method.
  const latestTier1 = await client.query(
    `
    SELECT
      tier1_method,
      bvn,
      nin,
      bvn_verification_status,
      nin_verification_status
    FROM kyc_records
    WHERE user_id = $1
      AND (
        bvn IS NOT NULL
        OR nin IS NOT NULL
      )
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [userId]
  );

  const selectedRecord =
    latestTier1.rows[0] || {};

  let selectedMethod = String(
    selectedRecord.tier1_method || ''
  ).trim().toUpperCase();

  // Legacy fallback: infer the method only when exactly
  // one identity number exists on the latest record.
  if (!selectedMethod) {
    if (selectedRecord.bvn && !selectedRecord.nin) {
      selectedMethod = 'BVN';
    } else if (
      selectedRecord.nin &&
      !selectedRecord.bvn
    ) {
      selectedMethod = 'NIN';
    }
  }

  let selectedMethodRejected = false;

  if (selectedMethod === 'BVN') {
    selectedMethodRejected =
      selectedRecord.bvn_verification_status === 'rejected';
  } else if (selectedMethod === 'NIN') {
    selectedMethodRejected =
      selectedRecord.nin_verification_status === 'rejected';
  }

  const overallStatus = tier1Verified
    ? 'verified'
    : selectedMethodRejected
      ? 'rejected'
      : 'pending';

  const accountVerified = tier1Verified;

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
      accountVerified,
      userId,
    ]
  );

  return {
    overallStatus,
    highestVerifiedTier,
    allVerified: accountVerified,
    accountVerified,
    tier1Verified,
    tier2Verified,
    tier3Verified,
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
          u.email,
          u.bvn_verified,
          u.nin_verified,
          u.id_verified
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
// ----------------------------------------------------------
// ENFORCE THE CUSTOMER'S SELECTED TIER 1 METHOD
// ----------------------------------------------------------

if (type === 'BVN' || type === 'NIN') {
  let selectedMethod = String(
    record.tier1_method || ''
  ).trim().toUpperCase();

  // Safe fallback for older records.
  if (!selectedMethod) {
    if (record.bvn && !record.nin) {
      selectedMethod = 'BVN';
    } else if (record.nin && !record.bvn) {
      selectedMethod = 'NIN';
    }
  }

  if (!selectedMethod) {
    await client.query('ROLLBACK');

    return res.status(409).json({
      success: false,
      code: 'TIER1_METHOD_UNCLEAR',
      message:
        'The selected Tier 1 verification method could not be established. Review the submission before making a decision.',
    });
  }

  if (selectedMethod !== type) {
    await client.query('ROLLBACK');

    return res.status(409).json({
      success: false,
      code: 'TIER1_METHOD_MISMATCH',
      message:
        `This customer selected ${selectedMethod} for Tier 1. ${type} decisions are not permitted for this submission.`,
      selected_method: selectedMethod,
    });
  }
}
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

      // Tier 3 is only available after BVN + Tier 2 identity approval.
      if (
        type === 'TIER3' &&
        (record.bvn_verified !== true || record.id_verified !== true)
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          code: 'TIER3_TIER2_REQUIRED',
          message: 'Tier 3 approval requires a verified BVN and an approved Tier 2 identity document.',
        });
      }

      // Tier 3 approval requires successful liveness verification.
      // Liveness is supporting evidence; it does not approve the address document by itself.
      if (
        type === 'TIER3' &&
        record.liveness_status !== 'verified'
      ) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          code: 'TIER3_LIVENESS_NOT_VERIFIED',
          message:
            'Tier 3 cannot be approved until liveness verification has been completed successfully.',
          liveness_status:
            record.liveness_status || 'pending',
        });
      }

      // Tier 1 must not be manually approved when the
      // provider result is missing or unconfirmed.
      if (type === 'BVN' &&
          record.bvn_provider_validation_result !== 'verified') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          code: 'BVN_PROVIDER_VERIFICATION_REQUIRED',
          message: 'BVN approval requires a verified provider result recorded by the backend.',
        });
      }

      if (type === 'TIER2' && record.bvn_verified !== true) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          code: 'TIER2_BVN_REQUIRED',
          message: 'Tier 2 approval requires a verified BVN and a verified identity document.',
        });
      }

      if (type === 'NIN' &&
          record.nin_provider_validation_result !== 'verified') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          code: 'NIN_PROVIDER_VERIFICATION_REQUIRED',
          message: 'NIN approval requires a verified provider result recorded by the backend.',
        });
      }
      
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

      // Preserve any previously approved method. The overall state is
      // recalculated from the user's approved flags immediately below.
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
// NIN VERIFICATION
// POST /api/admin/kyc/:id/nin/verify
// ============================================================

const verifyNin = async (req, res) => {
  return processKycDecision(req, res, 'NIN', 'verify');
};

// ============================================================
// NIN REJECTION
// POST /api/admin/kyc/:id/nin/reject
// ============================================================

const rejectNin = async (req, res) => {
  return processKycDecision(req, res, 'NIN', 'reject');
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
// GET SINGLE TRANSACTION
// GET /api/admin/transactions/:id
// ============================================================

const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.account_id,

        a.account_number,
        a.account_type,
        a.currency AS account_currency,
        a.status AS account_status,

        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone,
        u.kyc_status,
        u.kyc_tier,
        u.status AS user_status,

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

      WHERE t.id = $1

      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    return res.status(200).json({
      success: true,
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Admin get transaction error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load transaction',
    });
  }
};


// ============================================================
// REPORT TRANSACTION AS FRAUD / SUSPICIOUS
// POST /api/admin/transactions/:id/report-fraud
// ============================================================

const reportTransactionFraud = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const reason = String(
      req.body?.reason || ''
    ).trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          'A reason is required when reporting a transaction.',
      });
    }

    await client.query('BEGIN');

    // ----------------------------------------------------------
    // LOCK TRANSACTION
    // ----------------------------------------------------------

    const transactionResult =
      await client.query(
        `
        SELECT
          t.id,
          t.account_id,
          t.type,
          t.amount,
          t.currency,
          t.reference,
          t.description,
          t.status,

          a.account_number,
          u.id AS customer_user_id,
          u.full_name,
          u.email

        FROM transactions t

        INNER JOIN accounts a
          ON a.id = t.account_id

        INNER JOIN users u
          ON u.id = a.user_id

        WHERE t.id = $1

        FOR UPDATE
        `,
        [id]
      );

    if (
      transactionResult.rows.length === 0
    ) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const transaction =
      transactionResult.rows[0];

    // ----------------------------------------------------------
    // PREVENT DUPLICATE ACTIVE FRAUD CASE
    // ----------------------------------------------------------

    const existingCase =
      await client.query(
        `
        SELECT
          id,
          case_number,
          status
        FROM fraud_cases
        WHERE transaction_id = $1
          AND status NOT IN (
            'resolved',
            'closed'
          )
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [id]
      );

    if (existingCase.rows.length > 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'An active fraud investigation already exists for this transaction.',
        fraud_case:
          existingCase.rows[0],
      });
    }

    // ----------------------------------------------------------
    // GENERATE CASE NUMBER
    // ----------------------------------------------------------

    const caseNumber =
      `ZEN-FRD-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const fraudResult =
      await client.query(
        `
        INSERT INTO fraud_cases (
          case_number,
          transaction_id,
          reported_by,
          customer_user_id,
          reason,
          status,
          compliance_status,
          legal_status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'reported',
          'not_reviewed',
          'not_escalated'
        )
        RETURNING
          id,
          case_number,
          transaction_id,
          customer_user_id,
          reason,
          status,
          compliance_status,
          legal_status,
          created_at
        `,
        [
          caseNumber,
          transaction.id,
          req.userId,
          transaction.customer_user_id,
          reason,
        ]
      );

    // ----------------------------------------------------------
    // AUDIT LOG
    // ----------------------------------------------------------

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
        'admin_transaction_fraud_reported',
        $2,
        $3,
        $4
      )
      `,
      [
        req.userId,

        `Transaction ${transaction.reference || transaction.id} was reported for fraud investigation. Fraud case: ${caseNumber}. Reason: ${reason}`,

        req.ip || null,

        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,

      message:
        'Transaction reported successfully. A fraud investigation case has been created.',

      fraud_case:
        fraudResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Fraud report rollback error:',
        rollbackError
      );
    }

    console.error(
      'Admin transaction fraud report error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to report transaction for fraud investigation',
    });
  } finally {
    client.release();
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

const getPrivateTier3Document = async (req, res) => {
  try {
    const { id, document } = req.params;

    const allowedDocuments = {
      id_front: {
        publicIdColumn: 'tier_2_document_front_public_id',
        resourceTypeColumn: 'tier_2_document_front_resource_type',
        formatColumn: 'tier_2_document_front_format',
        label: 'Tier 2 identity front',
      },
      id_back: {
        publicIdColumn: 'tier_2_document_back_public_id',
        resourceTypeColumn: 'tier_2_document_back_resource_type',
        formatColumn: 'tier_2_document_back_format',
        label: 'Tier 2 identity back',
      },
      tier2_selfie: {
        publicIdColumn: 'tier_2_selfie_public_id',
        resourceTypeColumn: 'tier_2_selfie_resource_type',
        formatColumn: 'tier_2_selfie_format',
        label: 'Tier 2 selfie',
      },
      proof_of_address: {
        publicIdColumn: 'tier_3_document_public_id',
        resourceTypeColumn: 'tier_3_document_resource_type',
        formatColumn: 'tier_3_document_format',
        label: 'Tier 3 proof of address',
      },
      tier3_selfie: {
        publicIdColumn: 'tier_3_selfie_public_id',
        resourceTypeColumn: 'tier_3_selfie_resource_type',
        formatColumn: 'tier_3_selfie_format',
        label: 'Tier 3 selfie',
      },
    };

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid KYC record ID.',
      });
    }

    const selected = allowedDocuments[document];

    if (!selected) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type.',
      });
    }

    // Step 1: Identify the customer belonging to this KYC record.
    const ownerResult = await pool.query(
      `
      SELECT user_id
      FROM kyc_records
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (!ownerResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'KYC record not found.',
      });
    }

    const userId = ownerResult.rows[0].user_id;

    // Step 2: Find the requested document across this customer's
    // KYC records. Column names come only from the allow-list above.
    const documentResult = await pool.query(
      `
      SELECT
        id,
        user_id,
        ${selected.publicIdColumn} AS public_id,
        ${selected.resourceTypeColumn} AS resource_type,
        ${selected.formatColumn} AS format
      FROM kyc_records
      WHERE user_id = $1
        AND ${selected.publicIdColumn} IS NOT NULL
        AND ${selected.publicIdColumn} <> ''
      ORDER BY
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST
      LIMIT 1
      `,
      [userId]
    );

    if (!documentResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Private KYC document not found.',
      });
    }

    const record = documentResult.rows[0];

    if (!['image', 'raw'].includes(record.resource_type)) {
      return res.status(404).json({
        success: false,
        message: 'Private KYC document is unavailable.',
      });
    }

    const allowedFormats = new Set([
      'pdf',
      'jpg',
      'jpeg',
      'png',
      'webp',
    ]);

    const format = String(record.format || '')
      .trim()
      .toLowerCase();

    if (!allowedFormats.has(format)) {
      return res.status(409).json({
        success: false,
        message: 'The stored document format is missing or unsupported.',
      });
    }

    if (
      (record.resource_type === 'raw' && format !== 'pdf') ||
      (record.resource_type === 'image' && format === 'pdf')
    ) {
      return res.status(409).json({
        success: false,
        message: 'The stored document format does not match its file type.',
      });
    }

    // Step 3: Generate a short-lived private Cloudinary URL.
    configureCloudinary();

    const expiresAt = Math.floor(Date.now() / 1000) + 300;

    const downloadUrl = cloudinary.utils.private_download_url(
      record.public_id,
      format,
      {
        resource_type: record.resource_type,
        type: 'authenticated',
        expires_at: expiresAt,
        attachment: false,
      }
    );

    // Step 4: Record administrator access in the audit log.
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
        'admin_private_kyc_document_access',
        $2,
        $3,
        $4
      )
      `,
      [
        req.userId,
        `Administrator accessed ${selected.label} for KYC record ${record.id}.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    return res.status(200).json({
      success: true,
      document,
      expires_at: expiresAt,
      url: downloadUrl,
    });

  } catch (error) {
    console.error(
      'Private KYC document access failed:',
      error?.message || 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to access the private KYC document.',
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
  getPrivateTier3Document,

  // KYC decisions
  verifyBvn,
  rejectBvn,
  verifyNin,
  rejectNin,
  verifyTier2,
  rejectTier2,
  verifyTier3,
  rejectTier3,

  // Transactions
  getTransactions,
  getTransaction,
  reportTransactionFraud,

  // Audit
  getAuditLogs,
};
