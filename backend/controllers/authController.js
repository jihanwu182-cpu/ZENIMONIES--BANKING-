const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = require('../config/database');
const {
  generateAccountNumber,
} = require('../utils/accountNumber');


// ============================================================
// CONFIGURATION
// ============================================================

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;


// ============================================================
// HELPERS
// ============================================================

const generateOtp = () => {
  return String(
    crypto.randomInt(100000, 1000000)
  );
};


const hashToken = (value) => {
  return crypto
    .createHash('sha256')
    .update(String(value))
    .digest('hex');
};


const normalizePhone = (phone) => {
  return String(phone || '').trim();
};


const createAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is not configured'
    );
  }

  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h',
    }
  );
};


// ============================================================
// CREATE PHONE OTP
// ============================================================

const createPhoneOtp = async (
  client,
  userId
) => {

  // ----------------------------------------------------------
  // INVALIDATE PREVIOUS PHONE OTPs
  // ----------------------------------------------------------

  await client.query(
    `
    UPDATE security_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
      AND token_type = 'phone_verification'
      AND used_at IS NULL
    `,
    [userId]
  );


  // ----------------------------------------------------------
  // GENERATE OTP
  // ----------------------------------------------------------

  const otp = generateOtp();

  const otpHash = hashToken(otp);


  // ----------------------------------------------------------
  // EXPIRATION
  // ----------------------------------------------------------

  const expiresAt = new Date(
    Date.now() +
    OTP_EXPIRY_MINUTES * 60 * 1000
  );


  // ----------------------------------------------------------
  // STORE HASH
  // ----------------------------------------------------------

  await client.query(
    `
    INSERT INTO security_tokens (
      user_id,
      token_hash,
      token_type,
      expires_at
    )
    VALUES (
      $1,
      $2,
      'phone_verification',
      $3
    )
    `,
    [
      userId,
      otpHash,
      expiresAt,
    ]
  );


  return otp;
};


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
      String(email)
        .trim()
        .toLowerCase();

    const normalizedPhone =
      normalizePhone(phone);

    const normalizedPassword =
      String(password);


    if (!normalizedFullName) {
      return res.status(400).json({
        success: false,
        message:
          'Full name is required',
      });
    }


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid email address',
      });
    }


    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message:
          'Phone number is required',
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

      await client.query(
        'ROLLBACK'
      );

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
    // CREATE ACCOUNT
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
    // CREATE PHONE OTP
    // --------------------------------------------------------

    const otp =
      await createPhoneOtp(
        client,
        user.id
      );


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
        'Customer account created successfully. Phone verification OTP generated.',
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );


    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query(
      'COMMIT'
    );


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({

      success: true,

      message:
        'Account created successfully. Please verify your phone number.',

      requires_phone_verification:
        true,

      user: {
        id:
          user.id,

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

      // ------------------------------------------------------
      // TESTING ONLY
      //
      // REMOVE THIS BEFORE PRODUCTION.
      // The SMS provider will send the OTP instead.
      // ------------------------------------------------------

      development_otp:
        process.env.NODE_ENV !== 'production'
          ? otp
          : undefined,
    });

  } catch (error) {

    try {
      await client.query(
        'ROLLBACK'
      );
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
        'Unable to create account',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// VERIFY PHONE
// POST /api/auth/verify-phone
// ============================================================

const verifyPhone = async (
  req,
  res
) => {

  const client =
    await pool.connect();


  try {

    const token =
      req.headers.authorization
        ?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null;


    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication token is required',
      });
    }


    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured',
      });
    }


    let decoded;


    try {

      decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

    } catch {
      return res.status(401).json({
        success: false,
        message:
          'Invalid or expired authentication token',
      });
    }


    const userId =
      decoded?.userId;


    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authentication token',
      });
    }


    const otp =
      String(
        req.body?.otp || ''
      ).trim();


    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter the 6-digit verification code.',
      });
    }


    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          is_verified
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


    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Your phone number is already verified.',
      });
    }


    // --------------------------------------------------------
    // FIND VALID OTP
    // --------------------------------------------------------

    const otpResult =
      await client.query(
        `
        SELECT
          id,
          token_hash,
          expires_at
        FROM security_tokens
        WHERE user_id = $1
          AND token_type = 'phone_verification'
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );


    if (
      otpResult.rows.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Your verification code has expired or is no longer valid. Please request a new code.',
      });
    }


    const storedOtp =
      otpResult.rows[0];


    const suppliedHash =
      hashToken(otp);


    if (
      suppliedHash !==
      storedOtp.token_hash
    ) {

      return res.status(400).json({
        success: false,
        message:
          'Invalid verification code.',
      });
    }


    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    await client.query(
      'BEGIN'
    );


    // --------------------------------------------------------
    // MARK OTP USED
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE security_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [storedOtp.id]
    );


    // --------------------------------------------------------
    // VERIFY USER
    // --------------------------------------------------------

    await client.query(
      `
      UPDATE users
      SET
        is_verified = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [userId]
    );


    // --------------------------------------------------------
    // AUDIT
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
        'phone_verified',
        'Phone number verified successfully',
        $2,
        $3
      )
      `,
      [
        userId,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );


    await client.query(
      'COMMIT'
    );


    return res.status(200).json({
      success: true,
      message:
        'Phone number verified successfully.',
      is_verified: true,
    });

  } catch (error) {

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Rollback error:',
        rollbackError
      );
    }


    console.error(
      'Verify phone error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to verify phone number.',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// RESEND PHONE OTP
// POST /api/auth/resend-phone-otp
// ============================================================

const resendPhoneOtp = async (
  req,
  res
) => {

  const client =
    await pool.connect();


  try {

    const token =
      req.headers.authorization
        ?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : null;


    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication token is required',
      });
    }


    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          'Authentication service is not configured',
      });
    }


    let decoded;


    try {

      decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

    } catch {
      return res.status(401).json({
        success: false,
        message:
          'Invalid or expired authentication token',
      });
    }


    const userId =
      decoded?.userId;


    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authentication token',
      });
    }


    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

    const userResult =
      await client.query(
        `
        SELECT
          id,
          is_verified
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


    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Your phone number is already verified.',
      });
    }


    // --------------------------------------------------------
    // CHECK RESEND COOLDOWN
    // --------------------------------------------------------

    const recentOtp =
      await client.query(
        `
        SELECT
          created_at
        FROM security_tokens
        WHERE user_id = $1
          AND token_type = 'phone_verification'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );


    if (
      recentOtp.rows.length > 0
    ) {

      const createdAt =
        new Date(
          recentOtp.rows[0].created_at
        );

      const secondsSinceCreation =
        Math.floor(
          (
            Date.now() -
            createdAt.getTime()
          ) / 1000
        );


      if (
        secondsSinceCreation <
        OTP_RESEND_COOLDOWN_SECONDS
      ) {

        const retryAfter =
          OTP_RESEND_COOLDOWN_SECONDS -
          secondsSinceCreation;


        return res.status(429).json({
          success: false,
          message:
            `Please wait ${retryAfter} seconds before requesting another code.`,
          retry_after_seconds:
            retryAfter,
        });
      }
    }


    // --------------------------------------------------------
    // CREATE NEW OTP
    // --------------------------------------------------------

    await client.query(
      'BEGIN'
    );


    const otp =
      await createPhoneOtp(
        client,
        userId
      );


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
        'phone_otp_resent',
        'Phone verification OTP regenerated',
        $2,
        $3
      )
      `,
      [
        userId,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );


    await client.query(
      'COMMIT'
    );


    return res.status(200).json({

      success: true,

      message:
        'A new verification code has been generated.',

      // TESTING ONLY
      development_otp:
        process.env.NODE_ENV !== 'production'
          ? otp
          : undefined,
    });

  } catch (error) {

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Rollback error:',
        rollbackError
      );
    }


    console.error(
      'Resend OTP error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to resend verification code.',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// LOGIN
// POST /api/auth/login
// ============================================================

const login = async (
  req,
  res
) => {

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

    if (
      user.status !== 'active'
    ) {
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
    // JWT
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


    const token =
      createAccessToken(user);


    // --------------------------------------------------------
    // ACCOUNTS
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
    // SAFE USER
    // --------------------------------------------------------

    const safeUser = {

      id:
        user.id,

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
    };


    return res.status(200).json({

      success: true,

      message:
        'Login successful',

      token,

      user:
        safeUser,

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

const getMe = async (
  req,
  res
) => {

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

        id:
          user.id,

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
  verifyPhone,
  resendPhoneOtp,
};
