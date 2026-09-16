const pool = require('../config/database');

// ============================================================
// GET PROFILE
// GET /api/profile
// ============================================================

const getProfile = async (req, res) => {
  try {
    // ========================================================
    // GET AUTHENTICATED USER ID
    // ========================================================

    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify authenticated user',
      });
    }

    // ========================================================
    // LOAD PROFILE
    // ========================================================

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.date_of_birth,
        u.gender,

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

    // ========================================================
    // USER NOT FOUND
    // ========================================================

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const row = result.rows[0];

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      user: {
        id: row.id,

        full_name: row.full_name,
        email: row.email,
        phone: row.phone,

        date_of_birth: row.date_of_birth,
        gender: row.gender,

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

        bvn_verified:
          row.bvn_verified === true,

        id_verified:
          row.id_verified === true,

        tier_3_verified:
          row.tier_3_verified === true,

        is_verified:
          row.is_verified === true,

        created_at: row.created_at,
        updated_at: row.updated_at,
      },

      account: row.account_id
        ? {
            id: row.account_id,

            account_number:
              row.account_number,

            account_name:
              row.full_name,

            account_type:
              row.account_type,

            currency:
              row.currency,

            balance:
              row.balance,

            status:
              row.account_status,
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
// BEFORE VERIFICATION:
//
// - Full legal name can be changed.
// - Permitted profile information can be changed.
//
// AFTER VERIFICATION:
//
// - Full legal name is permanently locked.
// - Protected identity/profile information is locked.
//
// PROFILE PHOTO:
//
// - Profile photo is handled separately.
// - Profile photo remains editable after verification.
//
// ============================================================

const updateProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    // ========================================================
    // GET AUTHENTICATED USER ID
    // ========================================================

    const userId =
      req.user?.id ||
      req.userId ||
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify authenticated user',
      });
    }

    // ========================================================
    // REQUEST DATA
    // ========================================================

    const {
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      state,
      lga,
      country,
    } = req.body || {};

    // ========================================================
    // START TRANSACTION
    // ========================================================

    await client.query('BEGIN');

    // ========================================================
    // GET CURRENT USER
    // ========================================================

    const currentResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          legal_name,
          legal_name_locked,

          email,
          phone,

          date_of_birth,
          gender,

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

    // ========================================================
    // USER NOT FOUND
    // ========================================================

    if (
      currentResult.rows.length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const currentUser =
      currentResult.rows[0];

    // ========================================================
    // FULL LEGAL NAME
    // ========================================================

    const requestedFullName =
      req.body?.full_name !== undefined
        ? String(
            req.body.full_name
          ).trim()
        : currentUser.full_name;

    // ========================================================
    // NAME REQUIRED
    // ========================================================

    if (!requestedFullName) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Full legal name is required',
      });
    }

    // ========================================================
    // PERMANENT LEGAL NAME LOCK
    // ========================================================
    //
    // Once legal_name_locked is true,
    // the name can NEVER be changed
    // through this endpoint.
    //
    // ========================================================

    if (
      currentUser.legal_name_locked === true &&
      requestedFullName !==
        currentUser.full_name
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(403).json({
        success: false,

        code:
          'LEGAL_NAME_LOCKED',

        message:
          'Your legal name is permanently locked because your account has already been verified.',
      });
    }

    // ========================================================
    // NORMALIZE EMAIL
    // ========================================================

    const normalizedEmail =
      email !== undefined
        ? String(email)
            .trim()
            .toLowerCase()
        : currentUser.email;

    // ========================================================
    // NORMALIZE PHONE
    // ========================================================

    const normalizedPhone =
      phone !== undefined
        ? String(phone).trim()
        : currentUser.phone;

    // ========================================================
    // NORMALIZE GENDER
    // ========================================================

    const normalizedGender =
      gender !== undefined
        ? String(gender).trim()
        : currentUser.gender;

    // ========================================================
    // VALIDATE GENDER
    // ========================================================
    //
    // Keep the available profile choices controlled.
    //
    // ========================================================

    const allowedGenders = [
      'Male',
      'Female',
      'Other',
      'Prefer not to say',
    ];

    if (
      normalizedGender &&
      !allowedGenders.includes(
        normalizedGender
      )
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Please select a valid gender.',
      });
    }

    // ========================================================
    // NORMALIZE ADDRESS
    // ========================================================

    const normalizedAddress =
      address !== undefined
        ? String(address).trim()
        : currentUser.address;

    // ========================================================
    // NORMALIZE CITY
    // ========================================================

    const normalizedCity =
      city !== undefined
        ? String(city).trim()
        : currentUser.city;

    // ========================================================
    // NORMALIZE STATE
    // ========================================================

    const normalizedState =
      state !== undefined
        ? String(state).trim()
        : currentUser.state;

    // ========================================================
    // NORMALIZE LGA
    // ========================================================

    const normalizedLga =
      lga !== undefined
        ? String(lga).trim()
        : currentUser.lga;

    // ========================================================
    // NORMALIZE COUNTRY
    // ========================================================

    const normalizedCountry =
      country !== undefined
        ? String(country).trim()
        : currentUser.country;

    // ========================================================
    // VALIDATE EMAIL
    // ========================================================

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid email address',
      });
    }

    // ========================================================
    // VALIDATE PHONE
    // ========================================================

    if (!normalizedPhone) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Phone number is required',
      });
    }

    // ========================================================
    // UPDATE USERS
    // ========================================================

    await client.query(
      `
      UPDATE users

      SET
        full_name = $1,

        legal_name = $2,

        email = $3,
        phone = $4,

        date_of_birth = $5,
        gender = $6,

        address = $7,
        city = $8,
        state = $9,
        lga = $10,
        country = $11,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = $12
      `,
      [
        // ----------------------------------------------------
        // Full legal name
        // ----------------------------------------------------

        requestedFullName,

        // ----------------------------------------------------
        // Legal name
        //
        // Before lock:
        //     keep synchronized with full_name
        //
        // After lock:
        //     preserve existing legal_name
        // ----------------------------------------------------

        currentUser.legal_name_locked ===
        true
          ? currentUser.legal_name
          : requestedFullName,

        // ----------------------------------------------------
        // Email
        // ----------------------------------------------------

        normalizedEmail,

        // ----------------------------------------------------
        // Phone
        // ----------------------------------------------------

        normalizedPhone,

        // ----------------------------------------------------
        // Date of birth
        // ----------------------------------------------------

        date_of_birth || null,

        // ----------------------------------------------------
        // Gender
        // ----------------------------------------------------

        normalizedGender || null,

        // ----------------------------------------------------
        // Address
        // ----------------------------------------------------

        normalizedAddress || null,

        // ----------------------------------------------------
        // City
        // ----------------------------------------------------

        normalizedCity || null,

        // ----------------------------------------------------
        // State
        // ----------------------------------------------------

        normalizedState || null,

        // ----------------------------------------------------
        // LGA
        // ----------------------------------------------------

        normalizedLga || null,

        // ----------------------------------------------------
        // Country
        // ----------------------------------------------------

        normalizedCountry ||
          'Nigeria',

        // ----------------------------------------------------
        // User ID
        // ----------------------------------------------------

        userId,
      ]
    );

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query(
      'COMMIT'
    );

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(200).json({
      success: true,
      message:
        'Profile updated successfully.',
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
        'Profile rollback error:',
        rollbackError
      );
    }

    // ========================================================
    // LOG ERROR
    // ========================================================

    console.error(
      'Update profile error:',
      error
    );

    // ========================================================
    // DUPLICATE EMAIL / PHONE
    // ========================================================

    if (
      error?.code ===
      '23505'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'That email address or phone number is already registered.',
      });
    }

    // ========================================================
    // GENERAL ERROR
    // ========================================================

    return res.status(500).json({
      success: false,
      message:
        'Unable to update profile',
    });

  } finally {

    // ========================================================
    // RELEASE DATABASE CONNECTION
    // ========================================================

    client.release();
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getProfile,
  updateProfile,
};
