const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/database');
const { generateAccountNumber } = require('../utils/accountNumber');


// ============================================================
// REGISTER
// ============================================================

const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      email,
      phone,
      password,
    } = req.body;

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

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters',
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      phone.trim();

    await client.query('BEGIN');

    const existingUser =
      await client.query(
        'SELECT id FROM users WHERE email = $1 OR phone = $2',
        [
          normalizedEmail,
          normalizedPhone,
        ]
      );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'Email or phone number is already registered',
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const userResult =
      await client.query(
        `INSERT INTO users
          (
            full_name,
            email,
            phone,
            password_hash
          )
         VALUES ($1, $2, $3, $4)
         RETURNING
          id,
          full_name,
          email,
          phone,
          role,
          kyc_status,
          is_verified`,
        [
          full_name.trim(),
          normalizedEmail,
          normalizedPhone,
          passwordHash,
        ]
      );

    const user = userResult.rows[0];

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
          'SELECT id FROM accounts WHERE account_number = $1',
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

    const accountResult =
      await client.query(
        `INSERT INTO accounts
          (
            user_id,
            account_number,
            account_type,
            currency
          )
         VALUES
          ($1, $2, 'personal', 'NGN')
         RETURNING
          id,
          account_number,
          account_type,
          currency,
          balance,
          status`,
        [
          user.id,
          accountNumber,
        ]
      );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message:
        'Account created successfully',
      user,
      account:
        accountResult.rows[0],
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
        error && error.message
          ? error.message
          : 'Unable to create account',
    });

  } finally {
    client.release();
  }
};


// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Email and password are required',
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const userResult =
      await pool.query(
        `SELECT
          id,
          full_name,
          email,
          phone,
          password_hash,
          role,
          kyc_status,
          is_verified
         FROM users
         WHERE email = $1`,
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

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password',
      });
    }

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

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
      }
    );

    const accountResult =
      await pool.query(
        `SELECT
          id,
          account_number,
          account_type,
          currency,
          balance,
          status
         FROM accounts
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [user.id]
      );

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      kyc_status: user.kyc_status,
      is_verified: user.is_verified,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
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
      message: 'Unable to login',
    });
  }
};


// ============================================================
// GET CURRENT USER PROFILE
// GET /api/auth/me
// ============================================================

const getMe = async (req, res) => {
  try {

    // Our middleware stores the ID here.
    const userId = req.user.id;

    const userResult =
      await pool.query(
        `SELECT
          id,
          full_name,
          email,
          phone,
          role,
          status,
          kyc_status,
          is_verified,
          created_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

    if (
      userResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user =
      userResult.rows[0];

    const accountResult =
      await pool.query(
        `SELECT
          id,
          account_number,
          account_type,
          currency,
          balance,
          status,
          created_at
         FROM accounts
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
      );

    const account =
      accountResult.rows[0] || null;

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,

        name: user.full_name,
        full_name: user.full_name,

        email: user.email,
        phone: user.phone,

        role: user.role,
        status: user.status,

        kyc_status:
          user.kyc_status,

        is_verified:
          user.is_verified,

        created_at:
          user.created_at,

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
