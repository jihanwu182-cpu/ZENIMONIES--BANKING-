
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// PERSONAL PROFILE CONTROLLER
//
// Existing PostgreSQL tables only.
// No migrations or new columns required.
//
// Routes:
// GET /api/profile
// PUT /api/profile
// ============================================================


// ============================================================
// HELPERS
// ============================================================

const getAuthenticatedUserId = (req) => {
  return (
    req.user?.id ||
    req.userId ||
    req.user?.userId ||
    null
  );
};


const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized === ''
    ? null
    : normalized;
};


const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};


const isValidDate = (value) => {
  if (!value) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};


// ============================================================
// GET PROFILE
// GET /api/profile
// ============================================================

const getProfile = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify authenticated user.',
      });
    }

    // --------------------------------------------------------
    // Load the authenticated user's profile.
    //
    // Do not return passwords, authentication tokens,
    // identity document data, or account numbers here.
    // --------------------------------------------------------

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        date_of_birth,
        gender,

        address,
        city,
        state,
        lga,
        country,

        profile_photo,

        legal_name_locked,

        role,
        status,

        kyc_status,
        kyc_tier,

        bvn_verified,
        id_verified,
        tier_3_verified,

        is_verified,

        created_at,
        updated_at

      FROM users

      WHERE id = $1

      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const user = userResult.rows[0];

    // --------------------------------------------------------
    // Load only the personal account.
    //
    // A customer may have both personal and business accounts.
    // The personal profile must not accidentally select
    // the business account.
    // --------------------------------------------------------

    const accountResult = await pool.query(
      `
      SELECT
        id,
        account_type,
        currency,
        balance,
        status

      FROM accounts

      WHERE user_id = $1
        AND account_type = 'personal'
        AND status = 'active'

      ORDER BY created_at ASC

      LIMIT 1
      `,
      [userId]
    );

    const account = accountResult.rows[0] || null;

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,

        full_name: user.full_name,
        email: user.email,
        phone: user.phone,

        date_of_birth: user.date_of_birth,
        gender: user.gender,

        address: user.address,
        city: user.city,
        state: user.state,
        lga: user.lga,
        country: user.country,

        profile_photo: user.profile_photo,

        legal_name_locked:
          user.legal_name_locked === true,

        role: user.role,
        status: user.status,

        kyc_status: user.kyc_status,
        kyc_tier: user.kyc_tier,

        bvn_verified:
          user.bvn_verified === true,

        id_verified:
          user.id_verified === true,

        tier_3_verified:
          user.tier_3_verified === true,

        is_verified:
          user.is_verified === true,

        created_at: user.created_at,
        updated_at: user.updated_at,
      },

      account: account
        ? {
            id: account.id,

            account_name: user.full_name,

            account_type: account.account_type,

            currency: account.currency,

            balance: account.balance,

            status: account.status,
          }
        : null,
    });

  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load profile.',
    });
  }
};


// ============================================================
// UPDATE PROFILE
// PUT /api/profile
// ============================================================
//
// Uses existing users columns only.
//
// Rules:
// - The authenticated user can update their own profile.
// - A verified/locked legal name cannot be changed here.
// - Email and phone changes require their own verification
//   workflow; this endpoint will not change them.
// - Fields omitted from a partial request are preserved.
// - Profile photo remains managed by the existing
//   profilePhotoController.
// ============================================================

const updateProfile = async (req, res) => {
  let client;

  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify authenticated user.',
      });
    }

    client = await pool.connect();

    await client.query('BEGIN');

    // --------------------------------------------------------
    // Lock the user's row while validating and updating.
    // --------------------------------------------------------

    const currentResult = await client.query(
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

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const current = currentResult.rows[0];
    const body = req.body || {};

    // --------------------------------------------------------
    // Legal name
    // --------------------------------------------------------

    const requestedFullName =
      body.full_name !== undefined
        ? normalizeString(body.full_name)
        : current.full_name;

    if (!requestedFullName) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Full legal name is required.',
      });
    }

    if (
      current.legal_name_locked === true &&
      requestedFullName !== current.full_name
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        code: 'LEGAL_NAME_LOCKED',
        message:
          'Your legal name is locked because your account has been verified. Please contact customer support if it needs correction.',
      });
    }

    // --------------------------------------------------------
    // Email and phone
    //
    // Do not permit changing verified contact details through
    // a generic profile update without OTP verification.
    // --------------------------------------------------------

    const requestedEmail =
      body.email !== undefined
        ? normalizeString(body.email)?.toLowerCase()
        : current.email;

    const requestedPhone =
      body.phone !== undefined
        ? normalizeString(body.phone)
        : current.phone;

    if (!requestedEmail || !isValidEmail(requestedEmail)) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (!requestedPhone) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }

    if (
      requestedEmail !== current.email ||
      requestedPhone !== current.phone
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        code: 'CONTACT_VERIFICATION_REQUIRED',
        message:
          'Email and phone number changes must be completed through the verified contact-change process. Your contact details have not been changed.',
      });
    }

    // --------------------------------------------------------
    // Date of birth
    // --------------------------------------------------------

    const requestedDateOfBirth =
      body.date_of_birth !== undefined
        ? normalizeString(body.date_of_birth)
        : current.date_of_birth
          ? String(current.date_of_birth).slice(0, 10)
          : null;

    if (!isValidDate(requestedDateOfBirth)) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Please enter a valid date of birth.',
      });
    }

    // --------------------------------------------------------
    // Gender
    // --------------------------------------------------------

    const requestedGender =
      body.gender !== undefined
        ? normalizeString(body.gender)
        : current.gender;

    const allowedGenders = [
      'Male',
      'Female',
      'Other',
      'Prefer not to say',
    ];

    if (
      requestedGender &&
      !allowedGenders.includes(requestedGender)
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message: 'Please select a valid gender.',
      });
    }

    // --------------------------------------------------------
    // Address fields
    //
    // Preserve existing values when a field is omitted.
    // Explicit empty strings are normalized to NULL.
    // --------------------------------------------------------

    const requestedAddress =
      body.address !== undefined
        ? normalizeString(body.address)
        : current.address;

    const requestedCity =
      body.city !== undefined
        ? normalizeString(body.city)
        : current.city;

    const requestedState =
      body.state !== undefined
        ? normalizeString(body.state)
        : current.state;

    const requestedLga =
      body.lga !== undefined
        ? normalizeString(body.lga)
        : current.lga;

    const requestedCountry =
      body.country !== undefined
        ? normalizeString(body.country)
        : current.country || 'Nigeria';

    // --------------------------------------------------------
    // Validate country
    //
    // Zenimonies is currently focusing on Nigeria and NGN.
    // --------------------------------------------------------

    if (
      requestedCountry &&
      requestedCountry.toLowerCase() !== 'nigeria'
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Zenimonies personal profiles currently support Nigeria only.',
      });
    }

    // --------------------------------------------------------
    // Update existing users columns.
    //
    // Email and phone are deliberately not updated here.
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE users

      SET
        full_name = $1,

        legal_name = $2,

        date_of_birth = $3,
        gender = $4,

        address = $5,
        city = $6,
        state = $7,
        lga = $8,
        country = $9,

        updated_at = CURRENT_TIMESTAMP

      WHERE id = $10
      `,
      [
        requestedFullName,

        current.legal_name_locked === true
          ? current.legal_name
          : requestedFullName,

        requestedDateOfBirth,
        requestedGender,

        requestedAddress,
        requestedCity,
        requestedState,
        requestedLga,
        requestedCountry || 'Nigeria',

        userId,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Profile rollback error:',
          rollbackError
        );
      }
    }

    console.error('Update profile error:', error);

    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        message:
          'That email address or phone number is already registered.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getProfile,
  updateProfile,
};
