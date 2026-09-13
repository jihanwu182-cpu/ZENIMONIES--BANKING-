const pool = require('../config/database');

// ============================================================
// GET PROFILE
// GET /api/profile
// ============================================================

const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.date_of_birth,
        u.address,
        u.city,
        u.state,
        u.lga,
        u.country,
        u.profile_photo,
        u.legal_name_locked,

        u.role,
        u.status,

        u.kyc_status,
        u.kyc_tier,

        u.bvn_verified,
        u.id_verified,
        u.tier_3_verified,

        u.is_verified,

        u.created_at,
        u.updated_at,

        a.id AS account_id,
        a.account_number,
        a.account_type,
        a.currency,
        a.balance,
        a.status AS account_status

      FROM users u

      LEFT JOIN accounts a
        ON a.user_id = u.id
       AND a.status = 'active'

      WHERE u.id = $1

      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,

      user: {
        id: row.id,

        full_name: row.full_name,
        email: row.email,
        phone: row.phone,

        date_of_birth: row.date_of_birth,

        address: row.address,
        city: row.city,
        state: row.state,
        lga: row.lga,
        country: row.country,

        profile_photo: row.profile_photo,
        legal_name_locked:
        row.legal_name_locked === true,

        role: row.role,
        status: row.status,

        kyc_status: row.kyc_status,
        kyc_tier: row.kyc_tier,

        bvn_verified: row.bvn_verified,
        id_verified: row.id_verified,
        tier_3_verified: row.tier_3_verified,

        is_verified: row.is_verified,

        created_at: row.created_at,
        updated_at: row.updated_at,
      },

      account: row.account_id
        ? {
            id: row.account_id,
            account_number: row.account_number,
            account_name: row.full_name,
            account_type: row.account_type,
            currency: row.currency,
            balance: row.balance,
            status: row.account_status,
          }
        : null,
    });

  } catch (error) {
    console.error(
      'Get profile error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load profile',
    });
  }
};


// ============================================================
// UPDATE PROFILE
// PUT /api/profile
// ============================================================
//
// IMPORTANT:
//
// If the account has been VERIFIED:
//
// Protected identity/profile information cannot be changed.
//
// Profile photo is handled separately and remains editable.
//
// ============================================================

const updateProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.userId;

    const {
      email,
      phone,
      date_of_birth,
      address,
      city,
      state,
      lga,
      country,
    } = req.body || {};

    await client.query('BEGIN');

    const currentResult = await client.query( 
  
     SELECT
        id,
        full_name,
        legal_name,
        legal_name_locked,
        email,
        phone,
        date_of_birth,
        address,
        city,
        state,
        lga,
        country,
        is_verified

      FROM users

      WHERE id = $1

      FOR UPDATE
      `,
      [userId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const currentUser =
      currentResult.rows[0];


    // ========================================================
    // VERIFIED ACCOUNT
    // ========================================================

    const requestedFullName =
  req.body?.full_name !== undefined
    ? String(req.body.full_name).trim()
    : currentUser.full_name;

if (!requestedFullName) {
  await client.query('ROLLBACK');

  return res.status(400).json({
    success: false,
    message: 'Full legal name is required',
  });
}

if (
  currentUser.legal_name_locked === true &&
  requestedFullName !== currentUser.full_name
) {
  await client.query('ROLLBACK');

  return res.status(403).json({
    success: false,
    code: 'LEGAL_NAME_LOCKED',
    message:
      'Your legal name is permanently locked because your account has already been verified.',
  });
}


    // ========================================================
    // UPDATE PROFILE
    // ========================================================

    const normalizedEmail =
      email !== undefined
        ? String(email).trim().toLowerCase()
        : currentUser.email;

    const normalizedPhone =
      phone !== undefined
        ? String(phone).trim()
        : currentUser.phone;

    const normalizedAddress =
      address !== undefined
        ? String(address).trim()
        : currentUser.address;

    const normalizedCity =
      city !== undefined
        ? String(city).trim()
        : currentUser.city;

    const normalizedState =
      state !== undefined
        ? String(state).trim()
        : currentUser.state;

    const normalizedLga =
      lga !== undefined
        ? String(lga).trim()
        : currentUser.lga;

    const normalizedCountry =
      country !== undefined
        ? String(country).trim()
        : currentUser.country;


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }


    if (!normalizedPhone) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }


    await client.query(
      `
      UPDATE users

  SET
    full_name = $1,
    legal_name = $2,
    email = $3,
    phone = $4,
    date_of_birth = $5,
    address = $6,
    city = $7,
    state = $8,
    lga = $9,
    country = $10,
    updated_at = CURRENT_TIMESTAMP

 WHERE id = $11
      `,
      [
        [
  requestedFullName,

  currentUser.legal_name_locked === true
    ? currentUser.legal_name
    : requestedFullName,

  normalizedEmail,
  normalizedPhone,
  date_of_birth || null,
  normalizedAddress || null,
  normalizedCity || null,
  normalizedState || null,
  normalizedLga || null,
  normalizedCountry || 'Nigeria',

  userId,
]
  );


    await client.query('COMMIT');


    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
    });

  } catch (error) {

    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Profile rollback error:',
        rollbackError
      );
    }

    console.error(
      'Update profile error:',
      error
    );

    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        message:
          'That email address or phone number is already registered.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update profile',
    });

  } finally {
    client.release();
  }
};


module.exports = {
  getProfile,
  updateProfile,
};
