const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');
const { generateAccountNumber } = require('../utils/accountNumber');


// ============================================================
// REGISTER
// POST /api/auth/register
// ============================================================

const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      email,
      phone,
      password,
    } = req.body || {};

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !full_name ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Full name, email, phone number, and password are required',
      });
    }

    const normalizedFullName =
      String(full_name).trim();

    const normalizedEmail =
      String(email).trim().toLowerCase();

    const normalizedPhone =
      String(phone).trim();

    const normalizedPassword =
      String(password);

    if (!normalizedFullName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    )) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    if (normalizedPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters',
      });
    }

    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    await client.query('BEGIN');

    // --------------------------------------------------------
    // CHECK EXISTING USER
    // --------------------------------------------------------

    const existingUser =
      await client.query(
        `
        SELECT
          id,
          email,
          phone
        FROM users
        WHERE email = $1
           OR phone = $2
        LIMIT 1
        `,
        [
          normalizedEmail,
          normalizedPhone,
        ]
      );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');

      const existing =
        existingUser.rows[0];

      if (
        existing.email ===
        normalizedEmail
      ) {
        return res.status(409).json({
          success: false,
          message:
            'An account with this email already exists',
        });
      }

      return res.status(409).json({
        success: false,
        message:
          'An account with this phone number already exists',
      });
    }

    // --------------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------------

    const passwordHash =
      await bcrypt.hash(
        normalizedPassword,
        12
      );

    // --------------------------------------------------------
    // CREATE USER
    // --------------------------------------------------------

    const userResult =
      await client.query(
        `
        INSERT INTO users (
          full_name,
          email,
          phone,
          password_hash,
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
          daily_transfer_reset_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'user',
          'active',
          'pending',
          1,
          false,
          false,
          false,
          false,
          200000.00,
          50000.00,
          0.00,
          CURRENT_TIMESTAMP
        )
        RETURNING
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
          created_at
        `,
        [
          normalizedFullName,
          normalizedEmail,
          normalizedPhone,
          passwordHash,
        ]
      );

    const user =
      userResult.rows[0];

    // --------------------------------------------------------
    // GENERATE UNIQUE ACCOUNT NUMBER
    // --------------------------------------------------------

    let accountNumber = null;

    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const candidate =
        generateAccountNumber('10');

      const existingAccount =
        await client.query(
          `
          SELECT id
          FROM accounts
          WHERE account_number = $1
          LIMIT 1
          `,
          [candidate]
        );

      if (
        existingAccount.rows.length === 0
      ) {
        accountNumber = candidate;
        break;
      }
    }

    if (!accountNumber) {
      throw new Error(
        'Unable to generate a unique account number'
      );
    }

    // --------------------------------------------------------
    // CREATE CUSTOMER ACCOUNT
    // --------------------------------------------------------

    const accountResult =
      await client.query(
        `
        INSERT INTO accounts (
          user_id,
          account_number,
          account_type,
          currency,
          balance,
          status
        )
        VALUES (
          $1,
          $2,
          'personal',
          'NGN',
          0.00,
          'active'
        )
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
          user.id,
          accountNumber,
        ]
      );

    const account =
      accountResult.rows[0];

    // --------------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------------

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
        'account_created',
        $2,
        $3,
        $4
      )
      `,
      [
        user.id,
        'Customer account created successfully',
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query('COMMIT');

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        'Account created successfully',

      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        kyc_status: user.kyc_status,
        kyc_tier: user.kyc_tier,
        bvn_verified:
          user.bvn_verified,
        id_verified:
          user.id_verified,
        tier_3_verified:
          user.tier_3_verified,
        is_verified:
          user.is_verified,
        account_limit:
          user.account_limit,
        daily_transfer_limit:
          user.daily_transfer_limit,
        daily_transfer_used:
          user.daily_transfer_used,
        created_at:
          user.created_at,
      },

      account,
    });

  } catch (error) {

    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Rollback error:',
        rollbackError
      );
    }

    console.error(
      'Registration error:',
      error
    );

    // PostgreSQL unique violation
    if (
      error &&
      error.code === '23505'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'Email, phone number, or account number is already registered',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to create account',
    });

  } finally {
    client.release();
  }
};


// ============================================================
// LOGIN
// POST /api/auth/login
// ============================================================

const login = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Email and password are required',
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const userResult =
      await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          password_hash,
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
          created_at
        FROM users
        WHERE email = $1
        LIMIT 1
        `,
        [normalizedEmail]
      );

    if (
      userResult.rows.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password',
      });
    }

    const user =
      userResult.rows[0];

    // --------------------------------------------------------
    // ACCOUNT STATUS
    // --------------------------------------------------------

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message:
          'Your account is not currently active',
      });
    }

    // --------------------------------------------------------
    // PASSWORD
    // --------------------------------------------------------

    const passwordMatches =
      await bcrypt.compare(
        String(password),
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password',
      });
    }

    // --------------------------------------------------------
    // JWT CONFIGURATION
    // --------------------------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error(
        'JWT_SECRET is not configured'
      );

      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured',
      });
    }

    // --------------------------------------------------------
    // CREATE TOKEN
    // --------------------------------------------------------

    const token =
      jwt.sign(
        {
          userId: user.id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '24h',
        }
      );

    // --------------------------------------------------------
    // GET ACCOUNTS
    // --------------------------------------------------------

    const accountResult =
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
        `,
        [user.id]
      );

    // --------------------------------------------------------
    // SAFE USER OBJECT
    // --------------------------------------------------------

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,

      kyc_status:
        user.kyc_status,

      kyc_tier:
        user.kyc_tier,

      bvn_verified:
        user.bvn_verified,

      id_verified:
        user.id_verified,

      tier_3_verified:
        user.tier_3_verified,

      tier_3_method:
        user.tier_3_method,

      is_verified:
        user.is_verified,

      account_limit:
        user.account_limit,

      daily_transfer_limit:
        user.daily_transfer_limit,

      daily_transfer_used:
        user.daily_transfer_used,

      daily_transfer_reset_at:
        user.daily_transfer_reset_at,

      created_at:
        user.created_at,
    };

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        'Login successful',

      token,

      user: safeUser,

      accounts:
        accountResult.rows,
    });

  } catch (error) {

    console.error(
      'Login error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to login',
    });
  }
};


// ============================================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================================

const getMe = async (req, res) => {
  try {

    const userId =
      req.user &&
      req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required',
      });
    }

    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const userResult =
      await pool.query(
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
    // ACCOUNT
    // --------------------------------------------------------

    const accountResult =
      await pool.query(
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
        [userId]
      );

    const account =
      accountResult.rows[0] ||
      null;

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,

        name:
          user.full_name,

        full_name:
          user.full_name,

        email:
          user.email,

        phone:
          user.phone,

        role:
          user.role,

        status:
          user.status,

        kyc_status:
          user.kyc_status,

        kyc_tier:
          user.kyc_tier,

        bvn_verified:
          user.bvn_verified,

        id_verified:
          user.id_verified,

        tier_3_verified:
          user.tier_3_verified,

        tier_3_method:
          user.tier_3_method,

        is_verified:
          user.is_verified,

        account_limit:
          user.account_limit,

        daily_transfer_limit:
          user.daily_transfer_limit,

        daily_transfer_used:
          user.daily_transfer_used,

        daily_transfer_reset_at:
          user.daily_transfer_reset_at,

        created_at:
          user.created_at,

        updated_at:
          user.updated_at,

        account_number:
          account
            ? account.account_number
            : null,

        account_name:
          user.full_name,

        account_type:
          account
            ? account.account_type
            : null,

        currency:
          account
            ? account.currency
            : 'NGN',

        balance:
          account
            ? account.balance
            : 0,

        account_status:
          account
            ? account.status
            : null,
      },

      account,
      accounts:
        accountResult.rows,
    });

  } catch (error) {

    console.error(
      'Get profile error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load profile',
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  register,
  login,
  getMe,
};
