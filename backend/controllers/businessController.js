const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// BUSINESS ACCOUNTS CONTROLLER
// ============================================================

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function isAdmin(req) {
  return (
    req.user &&
    String(req.user.role || '').toLowerCase() === 'admin'
  );
}

function cleanString(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function generateBusinessAccountNumber() {
  return String(crypto.randomInt(1000000000, 9999999999));
}

function validUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

// ============================================================
// CREATE BUSINESS
//
// POST /api/businesses
//
// Requires authenticated user.
// Creates a separate business account.
// New businesses require administrator review.
// ============================================================

async function createBusiness(req, res) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const {
    businessName,
    registrationNumber,
    businessType,
    country,
    currency,
    businessAddress,
  } = req.body || {};

  const name = cleanString(businessName, 200);

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Business name is required.',
    });
  }

  const selectedCountry = (
    cleanString(country, 10) || 'NG'
  ).toUpperCase();

  const selectedCurrency = (
    cleanString(currency, 10) || 'NGN'
  ).toUpperCase();

  const allowedCurrencies = {
    NG: ['NGN'],
    ZA: ['ZAR'],
  };

  if (
    !allowedCurrencies[selectedCountry] ||
    !allowedCurrencies[selectedCountry].includes(selectedCurrency)
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Unsupported country and currency combination.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Confirm that the user exists and is active.
    const userResult = await client.query(
      `
        SELECT id, status
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (!userResult.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (
      String(userResult.rows[0].status || '').toLowerCase() !==
      'active'
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message: 'Your user account is not active.',
      });
    }

    // Create a separate business account.
    // The account remains pending until business approval.
    let account;
    let attempts = 0;

    while (!account && attempts < 5) {
      attempts += 1;

      const accountNumber =
        generateBusinessAccountNumber();

      try {
        const accountResult = await client.query(
          `
            INSERT INTO accounts (
              user_id,
              account_number,
              account_type,
              currency,
              balance,
              status
            )
            VALUES ($1, $2, 'business', $3, 0.00, 'pending')
            RETURNING
              id,
              account_number,
              account_type,
              currency,
              balance,
              status,
              created_at
          `,
          [
            userId,
            accountNumber,
            selectedCurrency,
          ]
        );

        account = accountResult.rows[0];
      } catch (error) {
        if (error.code === '23505') {
          continue;
        }

        throw error;
      }
    }

    if (!account) {
      throw new Error(
        'Unable to generate a unique business account number.'
      );
    }

    // Create the business profile.
    const businessResult = await client.query(
      `
        INSERT INTO businesses (
          owner_user_id,
          business_account_id,
          business_name,
          registration_number,
          business_type,
          country,
          currency,
          business_address,
          verification_status,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          'pending', 'pending'
        )
        RETURNING
          id,
          owner_user_id,
          business_account_id,
          business_name,
          registration_number,
          business_type,
          country,
          currency,
          business_address,
          verification_status,
          status,
          created_at
      `,
      [
        userId,
        account.id,
        name,
        cleanString(registrationNumber, 100),
        cleanString(businessType, 100),
        selectedCountry,
        selectedCurrency,
        cleanString(businessAddress, 2000),
      ]
    );

    const business = businessResult.rows[0];

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Business profile created. It is awaiting verification and administrator approval.',
      business,
      account,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Business registration error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to create business account.',
    });
  } finally {
    client.release();
  }
}

// ============================================================
// GET MY BUSINESSES
//
// GET /api/businesses
//
// Returns only businesses owned by the authenticated user.
// ============================================================

async function getMyBusinesses(req, res) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          b.id,
          b.business_name,
          b.registration_number,
          b.business_type,
          b.country,
          b.currency,
          b.business_address,
          b.verification_status,
          b.status,
          b.created_at,
          b.updated_at,

          a.id AS account_id,
          a.account_number,
          a.account_type,
          a.currency AS account_currency,
          a.balance,
          a.status AS account_status

        FROM businesses b

        INNER JOIN accounts a
          ON a.id = b.business_account_id

        WHERE b.owner_user_id = $1

        ORDER BY b.created_at DESC
      `,
      [userId]
    );

    return res.json({
      success: true,
      businesses: result.rows,
    });
  } catch (error) {
    console.error(
      'Business listing error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve businesses.',
    });
  }
}

// ============================================================
// GET BUSINESS DETAILS
//
// GET /api/businesses/:id
//
// Owner or administrator.
// ============================================================

async function getBusinessById(req, res) {
  const userId = getUserId(req);
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!validUuid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid business ID.',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          b.id,
          b.owner_user_id,
          b.business_account_id,
          b.business_name,
          b.registration_number,
          b.business_type,
          b.country,
          b.currency,
          b.business_address,
          b.verification_status,
          b.status,
          b.created_at,
          b.updated_at,

          a.account_number,
          a.account_type,
          a.balance,
          a.status AS account_status

        FROM businesses b

        INNER JOIN accounts a
          ON a.id = b.business_account_id

        WHERE b.id = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Business not found.',
      });
    }

    const business = result.rows[0];

    if (
      business.owner_user_id !== userId &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this business.',
      });
    }

    return res.json({
      success: true,
      business,
    });
  } catch (error) {
    console.error(
      'Business details error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve business details.',
    });
  }
}

// ============================================================
// ADMIN: LIST BUSINESSES
//
// GET /api/businesses/admin/all
// ============================================================

async function adminListBusinesses(req, res) {
  if (!getUserId(req) || !isAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: 'Administrator access is required.',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          b.id,
          b.owner_user_id,
          b.business_account_id,
          b.business_name,
          b.registration_number,
          b.business_type,
          b.country,
          b.currency,
          b.business_address,
          b.verification_status,
          b.status,
          b.created_at,

          a.account_number,
          a.balance,
          a.status AS account_status,

          u.full_name AS owner_name,
          u.email AS owner_email,
          u.phone AS owner_phone

        FROM businesses b

        INNER JOIN accounts a
          ON a.id = b.business_account_id

        INNER JOIN users u
          ON u.id = b.owner_user_id

        ORDER BY b.created_at DESC
      `
    );

    return res.json({
      success: true,
      businesses: result.rows,
    });
  } catch (error) {
    console.error(
      'Admin business listing error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve businesses.',
    });
  }
}

// ============================================================
// ADMIN: REVIEW BUSINESS
//
// POST /api/businesses/admin/:id/review
//
// Body:
// {
//   "decision": "approve" | "reject",
//   "reason": "..."
//
// }
// ============================================================

async function adminReviewBusiness(req, res) {
  const adminId = getUserId(req);

  if (!adminId || !isAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: 'Administrator access is required.',
    });
  }

  const { id } = req.params;
  const decision = cleanString(
    req.body?.decision,
    20
  )?.toLowerCase();

  const reason = cleanString(
    req.body?.reason,
    1000
  );

  if (!validUuid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid business ID.',
    });
  }

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: 'Decision must be approve or reject.',
    });
  }

  if (decision === 'reject' && !reason) {
    return res.status(400).json({
      success: false,
      message: 'A reason is required when rejecting a business.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT
          b.id,
          b.business_account_id,
          b.verification_status,
          b.status AS business_status,
          a.status AS account_status

        FROM businesses b

        INNER JOIN accounts a
          ON a.id = b.business_account_id

        WHERE b.id = $1

        FOR UPDATE OF b, a
      `,
      [id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Business not found.',
      });
    }

    const business = result.rows[0];

    if (
      business.business_status === 'closed' ||
      business.business_status === 'suspended'
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Closed or suspended businesses cannot be approved through this endpoint.',
      });
    }

    if (decision === 'approve') {
      // Approval is allowed only after the business
      // verification status has been independently set
      // to verified by an authorized verification process.
      if (business.verification_status !== 'verified') {
        await client.query('ROLLBACK');

        return res.status(403).json({
          success: false,
          message:
            'Business verification must be completed before approval.',
        });
      }

      await client.query(
        `
          UPDATE businesses
          SET
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [id]
      );

      await client.query(
        `
          UPDATE accounts
          SET
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [business.business_account_id]
      );
    } else {
      await client.query(
        `
          UPDATE businesses
          SET
            verification_status = 'rejected',
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [id]
      );

      await client.query(
        `
          UPDATE accounts
          SET
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [business.business_account_id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message:
        decision === 'approve'
          ? 'Business approved and account activated.'
          : 'Business application rejected.',
      businessId: id,
      decision,
      reason: decision === 'reject' ? reason : null,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Business review error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to review business.',
    });
  } finally {
    client.release();
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  adminListBusinesses,
  adminReviewBusiness,
};
