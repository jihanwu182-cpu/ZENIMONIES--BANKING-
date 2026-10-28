
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// PERSONAL PROFILE CONTROLLER
//
// Uses existing PostgreSQL columns. No migration required.
//
// Routes:
// GET /api/profile
// PUT /api/profile
//
// SECURITY RULES:
// - Verified identity details become permanently locked.
// - legal_name_locked is the persistent lock flag.
// - Photo uploads remain managed by profilePhotoController.
// - Email and phone changes require separate verification.
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

  return normalized === '' ? null : normalized;
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidDate = (value) => {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const dateOnly = (value) => {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 10);
};

// Use the existing persistent flag and verification columns.
// Once set, legal_name_locked is never automatically reset.
const hasVerifiedIdentity = (user) => {
  return (
    user?.legal_name_locked === true ||
    user?.is_verified === true ||
    user?.bvn_verified === true ||
    user?.id_verified === true ||
    user?.tier_3_verified === true
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
    // Persist the identity lock when verification is confirmed.
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE users
      SET
        legal_name_locked = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND legal_name_locked IS DISTINCT FROM TRUE
        AND (
          is_verified IS TRUE
          OR bvn_verified IS TRUE
          OR id_verified IS TRUE
          OR tier_3_verified IS TRUE
        )
      `,
      [userId]
    );

    const userResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        phone_verified,
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
    // Return only the customer's personal account.
    // Do not expose the full account number in this endpoint.
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
        phone_verified: user.phone_verified === true,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        address: user.address,
        city: user.city,
        state: user.state,
        lga: user.lga,
        country: user.country,
        profile_photo: user.profile_photo,
        legal_name_locked: user.legal_name_locked === true,
        role: user.role,
        status: user.status,
        kyc_status: user.kyc_status,
        kyc_tier: user.kyc_tier,
        bvn_verified: user.bvn_verified === true,
        id_verified: user.id_verified === true,
        tier_3_verified: user.tier_3_verified === true,
        is_verified: user.is_verified === true,
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

const updateProfile = async (req, res) => {
  let client;
  let transactionStarted = false;

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
    transactionStarted = true;

    // Lock the row so verification state cannot be changed
    // concurrently while this profile update is being checked.
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
        is_verified,
        bvn_verified,
        id_verified,
        tier_3_verified
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const current = currentResult.rows[0];
    const body = req.body || {};

    // --------------------------------------------------------
    // Determine whether identity details must be locked.
    //
    // If verification has succeeded, persist the lock now.
    // The flag is never reset by this controller.
    // --------------------------------------------------------

    const identityLocked = hasVerifiedIdentity(current);

    if (
      identityLocked &&
      current.legal_name_locked !== true
    ) {
      await client.query(
        `
        UPDATE users
        SET legal_name_locked = TRUE
        WHERE id = $1
        `,
        [userId]
      );

      current.legal_name_locked = true;
    }

    // --------------------------------------------------------
    // Legal name
    // --------------------------------------------------------

    const requestedFullName =
      body.full_name !== undefined
        ? normalizeString(body.full_name)
        : current.full_name;

    if (!requestedFullName) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Full legal name is required.',
      });
    }

    if (
      identityLocked &&
      requestedFullName !== current.full_name
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        code: 'IDENTITY_DETAILS_LOCKED',
        message:
          'Your verified identity details are permanently locked. Please contact customer support for a controlled correction.',
      });
    }

    // --------------------------------------------------------
    // Email and phone
    //
    // A generic profile update must never change these details.
    // They require their own contact-verification workflow.
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
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (!requestedPhone) {
      await client.query('ROLLBACK');
      transactionStarted = false;

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
      transactionStarted = false;

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
        : dateOnly(current.date_of_birth);

    if (!isValidDate(requestedDateOfBirth)) {
      await client.query('ROLLBACK');
      transactionStarted = false;

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
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: 'Please select a valid gender.',
      });
    }

    // --------------------------------------------------------
    // Residential address
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
    // Reject all protected identity-field changes after
    // verification, even if the request bypasses the UI.
    // Omitted fields are preserved and are not treated as edits.
    // --------------------------------------------------------

    const protectedFields = [
      {
        field: 'full_name',
        requested: requestedFullName,
        existing: current.full_name,
      },
      {
        field: 'date_of_birth',
        requested: requestedDateOfBirth,
        existing: dateOnly(current.date_of_birth),
      },
      {
        field: 'gender',
        requested: requestedGender,
        existing: current.gender,
      },
      {
        field: 'address',
        requested: requestedAddress,
        existing: current.address,
      },
      {
        field: 'city',
        requested: requestedCity,
        existing: current.city,
      },
      {
        field: 'state',
        requested: requestedState,
        existing: current.state,
      },
      {
        field: 'lga',
        requested: requestedLga,
        existing: current.lga,
      },
      {
        field: 'country',
        requested: requestedCountry || 'Nigeria',
        existing: current.country || 'Nigeria',
      },
    ];

    const attemptedProtectedChange = protectedFields.some(
      ({ field, requested, existing }) =>
        Object.prototype.hasOwnProperty.call(body, field) &&
        requested !== existing
    );

    if (identityLocked && attemptedProtectedChange) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        code: 'IDENTITY_DETAILS_LOCKED',
        message:
          'Your identity details are permanently locked after verification. Please contact customer support for a controlled correction.',
      });
    }

    // --------------------------------------------------------
    // Validate country
    // --------------------------------------------------------

    if (
      requestedCountry &&
      requestedCountry.toLowerCase() !== 'nigeria'
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message:
          'Zenimonies personal profiles currently support Nigeria only.',
      });
    }

    // --------------------------------------------------------
    // Update the existing profile columns.
    //
    // Never clear legal_name_locked.
    // Keep the photo on its existing dedicated upload endpoint.
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
        legal_name_locked = CASE
          WHEN legal_name_locked IS TRUE THEN TRUE
          WHEN $11::boolean IS TRUE THEN TRUE
          ELSE COALESCE(legal_name_locked, FALSE)
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      `,
      [
        requestedFullName,
        identityLocked
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
        identityLocked,
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: identityLocked
        ? 'Profile updated. Verified identity details remain locked.'
        : 'Profile updated successfully.',
    });
  } catch (error) {
    if (client && transactionStarted) {
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
