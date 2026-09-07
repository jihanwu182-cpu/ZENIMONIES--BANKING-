const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateAccountNumber } = require('../utils/accountNumber');

const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone number, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [normalizedEmail, normalizedPhone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email or phone number is already registered',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users
        (full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, role, kyc_status`,
      [full_name.trim(), normalizedEmail, normalizedPhone, passwordHash]
    );

    const user = userResult.rows[0];

    let accountNumber;
    let accountCreated = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateAccountNumber('10');

      const existingAccount = await client.query(
        'SELECT id FROM accounts WHERE account_number = $1',
        [candidate]
      );

      if (existingAccount.rows.length === 0) {
        accountNumber = candidate;
        accountCreated = true;
        break;
      }
    }

    if (!accountCreated) {
      throw new Error('Unable to generate a unique account number');
    }

    const accountResult = await client.query(
      `INSERT INTO accounts
        (user_id, account_number, account_type, currency)
       VALUES ($1, $2, 'personal', 'NGN')
       RETURNING id, account_number, account_type, currency, balance, status`,
      [user.id, accountNumber]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user,
      account: accountResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Registration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create account',
    });
  } finally {
    client.release();
  }
};

module.exports = {
  register,
};
