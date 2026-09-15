const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = require('../config/database');

const {
  sendPhoneOtp,
} = require('../services/termiiService');

const {
  sendPasswordResetEmail,
} = require('../services/emailService');

const {
  createAuthSession,
} = require('../services/sessionService');

// ============================================================
// CONFIGURATION
// ============================================================

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const PASSWORD_RESET_EXPIRY_MINUTES = 30;
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;


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


// ============================================================
// GENERATE ZENIMONIES ACCOUNT NUMBER
// ============================================================
//
// IMPORTANT:
//
// This is a Zenimonies internal account number.
//
// It is NOT a bank NUBAN.
// It is NOT a Paystack dedicated virtual account.
//
// A real deposit/bank account will be provisioned separately
// when Paystack allows the business to use that feature.
// ============================================================

const generateZenimoniesAccountNumber = () => {
  return String(
    crypto.randomInt(
      1000000000,
      9999999999
    )
  );
};


// ============================================================
// CREATE JWT
// ============================================================

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
// GET BEARER TOKEN
// ============================================================

const getBearerToken = (req) => {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return null;
  }

  return authHeader
    .substring(7)
    .trim();
};


// ============================================================
// VERIFY JWT
// ============================================================

const verifyJwt = (req) => {
  const token =
    getBearerToken(req);

  if (!token) {
    return {
      valid: false,
      status: 401,
      message:
        'Authentication token is required',
    };
  }

  if (!process.env.JWT_SECRET) {
    return {
      valid: false,
      status: 500,
      message:
        'Authentication service is not configured',
    };
  }

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (
      !decoded ||
      !decoded.userId
    ) {
      return {
        valid: false,
        status: 401,
        message:
          'Invalid authentication token',
      };
    }

    return {
      valid: true,
      decoded,
    };

  } catch (error) {
    return {
      valid: false,
      status: 401,
      message:
        'Invalid or expired authentication token',
    };
  }
};


// ============================================================
// CREATE PHONE OTP
// ============================================================

const createPhoneOtp = async (
  client,
  userId
) => {

  // ----------------------------------------------------------
  // Invalidate previous unused OTPs
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
  // Generate secure OTP
  // ----------------------------------------------------------

  const otp =
    generateOtp();


  const otpHash =
    hashToken(otp);


  // ----------------------------------------------------------
  // Expiry
  // ----------------------------------------------------------

  const expiresAt =
    new Date(
      Date.now() +
      OTP_EXPIRY_MINUTES *
      60 *
      1000
    );


  // ----------------------------------------------------------
  // Store HASH only
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

const register = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    const {
      full_name,
      email,
      phone,
      password,
    } = req.body || {};


    // ========================================================
    // VALIDATION
    // ========================================================

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


    if (
      normalizedPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters',
      });
    }


    // ========================================================
    // START TRANSACTION
    // ========================================================

    await client.query('BEGIN');


    // ========================================================
    // CHECK EXISTING USER
    // ========================================================

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


    if (
      existingUser.rows.length > 0
    ) {

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


    // ========================================================
    // HASH PASSWORD
    // ========================================================

    const passwordHash =
      await bcrypt.hash(
        normalizedPassword,
        12
      );


    // ========================================================
    // CREATE USER
    // ========================================================

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

          50000.00,
          25000.00,
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
          daily_transfer_reset_at,

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


    // ========================================================
    // CREATE INTERNAL ZENIMONIES ACCOUNT
    // ========================================================

    let account = null;

    let accountCreated = false;

    for (
      let attempt = 0;
      attempt < 5;
      attempt++
    ) {

      const accountNumber =
        generateZenimoniesAccountNumber();

      try {

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


        account =
          accountResult.rows[0];

        accountCreated = true;

        break;

      } catch (error) {

        if (
          error &&
          error.code === '23505'
        ) {
          continue;
        }

        throw error;
      }
    }


    if (!accountCreated) {
      throw new Error(
        'Unable to create Zenimonies account number'
      );
    }


    // ========================================================
    // CREATE PHONE OTP
    // ========================================================

    const otp =
      await createPhoneOtp(
        client,
        user.id
      );


    // ========================================================
    // SEND OTP THROUGH TERMII
    // ========================================================

    await sendPhoneOtp({
      phone: normalizedPhone,
      otp,
    });


    // ========================================================
    // CREATE JWT
    // ========================================================

    const token =
      createAccessToken(user);


    // ========================================================
    // AUDIT LOG
    // ========================================================

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

        'Zenimonies account created. Phone verification OTP generated and sent. Bank deposit account has not yet been provisioned.',

        req.ip ||
          null,

        req.get(
          'user-agent'
        ) || null,
      ]
    );


    // ========================================================
    // COMMIT
    // ========================================================

    await client.query(
      'COMMIT'
    );


    // ========================================================
    // RESPONSE
    // ========================================================

    const response = {

      success: true,

      message:
        'Account created successfully. A verification code has been sent to your phone.',

      token,

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

        phone_verified:
          false,

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
          false,

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
      },

      account: {

        id:
          account.id,

        account_number:
          account.account_number,

        account_name:
          user.full_name,

        account_type:
          account.account_type,

        bank_name:
          null,

        bank_code:
          null,

        currency:
          account.currency,

        balance:
          account.balance,

        status:
          account.status,

        created_at:
          account.created_at,
      },

      deposit_account_status:
        'not_provisioned',

    };


    // ========================================================
    // DEVELOPMENT ONLY
    // ========================================================

    if (
      process.env.NODE_ENV !==
      'production'
    ) {
      response.development_otp =
        otp;
    }


    return res.status(201).json(
      response
    );

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
        error?.message ||
        'Unable to create account',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// VERIFY PHONE OTP
// ============================================================

const verifyPhone = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    const auth =
      verifyJwt(req);


    if (!auth.valid) {
      return res.status(
        auth.status
      ).json({
        success: false,
        message:
          auth.message,
      });
    }


    const userId =
      auth.decoded.userId;


    const otp =
      String(
        req.body?.otp || ''
      ).trim();


    if (
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter the 6-digit verification code.',
      });
    }


    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          phone_verified,
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


    if (user.phone_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Your phone number is already verified.',
      });
    }


    const suppliedHash =
      hashToken(otp);


    await client.query(
      'BEGIN'
    );


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
        FOR UPDATE
        `,
        [userId]
      );


    if (
      otpResult.rows.length === 0
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Your verification code has expired or is no longer valid. Please request a new code.',
      });
    }


    const storedOtp =
      otpResult.rows[0];


    if (
      suppliedHash !==
      storedOtp.token_hash
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Invalid verification code.',
      });
    }


    await client.query(
      `
      UPDATE security_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [storedOtp.id]
    );


    await client.query(
      `
      UPDATE users
      SET
        phone_verified = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [userId]
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
        'phone_verified',
        'Phone number verified successfully. KYC verification remains unchanged.',
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

      phone_verified:
        true,

      is_verified:
        user.is_verified === true,
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
// ============================================================

const resendPhoneOtp = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    const auth =
      verifyJwt(req);


    if (!auth.valid) {
      return res.status(
        auth.status
      ).json({
        success: false,
        message:
          auth.message,
      });
    }


    const userId =
      auth.decoded.userId;


    const userResult =
      await client.query(
        `
        SELECT
          id,
          phone,
          phone_verified
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


    if (user.phone_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Your phone number is already verified.',
      });
    }


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


    await client.query(
      'BEGIN'
    );


    const otp =
      await createPhoneOtp(
        client,
        userId
      );


    await sendPhoneOtp({
      phone: user.phone,
      otp,
    });


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
        'Phone verification OTP regenerated and sent',
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


    const response = {

      success: true,

      message:
        'A new verification code has been sent to your phone.',

      expires_in:
        OTP_EXPIRY_MINUTES * 60,
    };


    if (
      process.env.NODE_ENV !==
      'production'
    ) {
      response.development_otp =
        otp;
    }


    return res.status(200).json(
      response
    );

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
// SEND PHONE OTP
// ============================================================

const sendPhoneOtpController = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    const auth =
      verifyJwt(req);


    if (!auth.valid) {
      return res.status(
        auth.status
      ).json({
        success: false,
        message:
          auth.message,
      });
    }


    const userId =
      auth.decoded.userId;


    const userResult =
      await client.query(
        `
        SELECT
          id,
          phone,
          phone_verified
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
          'User account not found',
      });
    }


    const user =
      userResult.rows[0];


    if (!user.phone) {
      return res.status(400).json({
        success: false,
        message:
          'No phone number is registered on this account',
      });
    }


    if (user.phone_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Phone number is already verified',
      });
    }


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


    await client.query(
      'BEGIN'
    );


    const otp =
      await createPhoneOtp(
        client,
        userId
      );


    await sendPhoneOtp({
      phone: user.phone,
      otp,
    });


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
        'phone_otp_requested',
        'Phone verification OTP generated and sent',
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


    const response = {

      success: true,

      message:
        'Verification code sent to your registered phone number',

      expires_in:
        OTP_EXPIRY_MINUTES * 60,
    };


    if (
      process.env.NODE_ENV !==
      'production'
    ) {
      response.development_otp =
        otp;
    }


    return res.status(200).json(
      response
    );

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
      'Send phone OTP error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to send verification code',
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
    console.log('LOGIN: request received');

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    console.log('LOGIN: checking user');

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
          tier_3_method,
          phone_verified,
          is_verified,
          account_limit,
          daily_transfer_limit
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
        `,
        [normalizedEmail]
      );

    console.log(
      'LOGIN: user query completed'
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

    console.log(
      'LOGIN: user found'
    );

    if (
      user.status &&
      user.status !== 'active'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Your account is not active',
      });
    }

    console.log(
      'LOGIN: checking password'
    );

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

    console.log(
      'LOGIN: password verified'
    );

    console.log(
      'LOGIN: creating token'
    );

    const token =
      createAccessToken(user);

    console.log(
      'LOGIN: token created'
    );

    console.log(
      'LOGIN: loading accounts'
    );

    const accountsResult =
      await pool.query(
        `
        SELECT
          id,
          user_id,
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
        [user.id]
      );

    console.log(
      'LOGIN: accounts loaded'
    );

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

      tier_3_method:
        user.tier_3_method,

      phone_verified:
        user.phone_verified,

      is_verified:
        user.is_verified,

      account_limit:
        user.account_limit,

      daily_transfer_limit:
        user.daily_transfer_limit,
    };

    console.log(
      'LOGIN: successful'
    );

    return res.status(200).json({
      success: true,
      message:
        'Login successful',
      token,
      user: safeUser,
      accounts:
        accountsResult.rows,
    });

  } catch (error) {

    console.error(
      'LOGIN FAILED'
    );

    console.error(
      'Login error name:',
      error?.name
    );

    console.error(
      'Login error code:',
      error?.code
    );

    console.error(
      'Login error message:',
      error?.message
    );

    return res.status(500).json({
      success: false,
      message:
        'LOGIN_DATABASE_OR_SERVER_ERROR',
      error_code:
        error?.code ||
        'UNKNOWN_ERROR',
      error_detail:
        error?.message ||
        'Unknown server error',
    });
  }
};


// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================================
//
// IMPORTANT SECURITY RULE:
//
// This endpoint intentionally returns the same successful
// response whether or not the email belongs to a user.
//
// This prevents attackers from discovering registered
// Zenimonies email addresses.
// ============================================================

const forgotPassword = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  let resetTokenId = null;

  try {

    const normalizedEmail =
      String(
        req.body?.email || ''
      )
        .trim()
        .toLowerCase();


    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid email address.',
      });
    }


    // ========================================================
    // FIND USER
    // ========================================================

    const userResult =
      await client.query(
        `
        SELECT
          id,
          email,
          full_name,
          status
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
        `,
        [normalizedEmail]
      );


    /*
     * If there is no matching account, return the same
     * generic response as a successful request.
     */

    if (
      userResult.rows.length === 0
    ) {
      return res.status(200).json({
        success: true,
        message:
          'If an account exists for this email address, you will receive a password reset link shortly.',
      });
    }


    const user =
      userResult.rows[0];


    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (
      user.status &&
      user.status !== 'active'
    ) {
      return res.status(200).json({
        success: true,
        message:
          'If an account exists for this email address, you will receive a password reset link shortly.',
      });
    }


    // ========================================================
    // RESET REQUEST COOLDOWN
    // ========================================================

    const recentReset =
      await client.query(
        `
        SELECT
          created_at
        FROM security_tokens
        WHERE user_id = $1
          AND token_type = 'password_reset'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [user.id]
      );


    if (
      recentReset.rows.length > 0
    ) {

      const createdAt =
        new Date(
          recentReset.rows[0].created_at
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
        PASSWORD_RESET_COOLDOWN_SECONDS
      ) {

        /*
         * Still return the same generic message.
         * Do not reveal that a reset was recently requested.
         */

        return res.status(200).json({
          success: true,
          message:
            'If an account exists for this email address, you will receive a password reset link shortly.',
        });
      }
    }


    // ========================================================
    // GENERATE SECURE RESET TOKEN
    // ========================================================

    const resetToken =
      crypto.randomBytes(32).toString('hex');


    const resetTokenHash =
      hashToken(resetToken);


    const expiresAt =
      new Date(
        Date.now() +
        PASSWORD_RESET_EXPIRY_MINUTES *
        60 *
        1000
      );


    // ========================================================
    // START TRANSACTION
    // ========================================================

    await client.query(
      'BEGIN'
    );


    // ========================================================
    // INVALIDATE PREVIOUS RESET TOKENS
    // ========================================================

    await client.query(
      `
      UPDATE security_tokens
      SET
        used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_type = 'password_reset'
        AND used_at IS NULL
      `,
      [user.id]
    );


    // ========================================================
    // STORE ONLY HASHED TOKEN
    // ========================================================

    const tokenResult =
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
          'password_reset',
          $3
        )
        RETURNING id
        `,
        [
          user.id,
          resetTokenHash,
          expiresAt,
        ]
      );


    resetTokenId =
      tokenResult.rows[0].id;


    // ========================================================
    // AUDIT LOG
    // ========================================================

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
        'password_reset_requested',
        'Password reset requested through email.',
        $2,
        $3
      )
      `,
      [
        user.id,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );


    await client.query(
      'COMMIT'
    );


    // ========================================================
    // CREATE RESET URL
    // ========================================================

    const frontendUrl =
      String(
        process.env.FRONTEND_URL || ''
      ).trim().replace(/\/+$/, '');


    if (!frontendUrl) {

      /*
       * The token has already been created, so invalidate it
       * before reporting the configuration error.
       */

      await pool.query(
        `
        UPDATE security_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [resetTokenId]
      );

      return res.status(500).json({
        success: false,
        message:
          'Password reset service is not configured.',
      });
    }


    const resetUrl =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(
        resetToken
      )}`;


    // ========================================================
    // SEND EMAIL
    // ========================================================

    try {

      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      });

    } catch (emailError) {

      console.error(
        'Password reset email sending failed:',
        emailError
      );


      /*
       * Never leave an active reset token behind when the
       * email could not be sent.
       */

      await pool.query(
        `
        UPDATE security_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [resetTokenId]
      );


      return res.status(500).json({
        success: false,
        message:
          'Unable to send password reset email. Please try again later.',
      });
    }


    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(200).json({
      success: true,
      message:
        'If an account exists for this email address, you will receive a password reset link shortly.',
    });

  } catch (error) {

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Forgot password rollback error:',
        rollbackError
      );
    }


    console.error(
      'Forgot password error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to process password reset request.',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================

const resetPassword = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    const resetToken =
      String(
        req.body?.token || ''
      ).trim();


    const newPassword =
      String(
        req.body?.new_password || ''
      );


    const confirmPassword =
      String(
        req.body?.confirm_password || ''
      );


    // ========================================================
    // VALIDATION
    // ========================================================

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message:
          'Password reset token is required.',
      });
    }


    if (
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters.',
      });
    }


    if (
      newPassword !==
      confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Passwords do not match.',
      });
    }


    // ========================================================
    // HASH SUPPLIED TOKEN
    // ========================================================

    const resetTokenHash =
      hashToken(resetToken);


    // ========================================================
    // START TRANSACTION
    // ========================================================

    await client.query(
      'BEGIN'
    );


    // ========================================================
    // FIND VALID RESET TOKEN
    // ========================================================

    const tokenResult =
      await client.query(
        `
        SELECT
          id,
          user_id,
          token_hash,
          expires_at,
          used_at
        FROM security_tokens
        WHERE token_hash = $1
          AND token_type = 'password_reset'
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        `,
        [resetTokenHash]
      );


    if (
      tokenResult.rows.length === 0
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'This password reset link is invalid, expired, or has already been used. Please request a new one.',
      });
    }


    const resetRecord =
      tokenResult.rows[0];


    // ========================================================
    // EXTRA HASH CHECK
    // ========================================================

    if (
      resetRecord.token_hash !==
      resetTokenHash
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'This password reset link is invalid.',
      });
    }


    // ========================================================
    // LOAD USER
    // ========================================================

    const userResult =
      await client.query(
        `
        SELECT
          id,
          email,
          status
        FROM users
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
        `,
        [resetRecord.user_id]
      );


    if (
      userResult.rows.length === 0
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'This password reset link is invalid.',
      });
    }


    const user =
      userResult.rows[0];


    if (
      user.status &&
      user.status !== 'active'
    ) {

      await client.query(
        'ROLLBACK'
      );

      return res.status(403).json({
        success: false,
        message:
          'This account is not active.',
      });
    }


    // ========================================================
    // HASH NEW PASSWORD
    // ========================================================

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        12
      );


    // ========================================================
    // UPDATE PASSWORD
    // ========================================================

    await client.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        passwordHash,
        user.id,
      ]
    );


    // ========================================================
    // MARK CURRENT TOKEN USED
    // ========================================================

    await client.query(
      `
      UPDATE security_tokens
      SET
        used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [resetRecord.id]
    );


    // ========================================================
    // INVALIDATE OTHER RESET TOKENS
    // ========================================================

    await client.query(
      `
      UPDATE security_tokens
      SET
        used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND token_type = 'password_reset'
        AND used_at IS NULL
        AND id <> $2
      `,
      [
        user.id,
        resetRecord.id,
      ]
    );


    // ========================================================
    // AUDIT LOG
    // ========================================================

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
        'password_reset_completed',
        'Account password was successfully reset through the password reset flow.',
        $2,
        $3
      )
      `,
      [
        user.id,
        req.ip || null,
        req.get('user-agent') || null,
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
        'Your password has been reset successfully. You can now log in with your new password.',
    });

  } catch (error) {

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Reset password rollback error:',
        rollbackError
      );
    }


    console.error(
      'Reset password error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        'Unable to reset password. Please try again later.',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// GET CURRENT USER
// ============================================================

const getMe = async (
  req,
  res
) => {

  try {

    const auth =
      verifyJwt(req);


    if (!auth.valid) {
      return res.status(
        auth.status
      ).json({
        success: false,
        message:
          auth.message,
      });
    }


    const userId =
      auth.decoded.userId;


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

          phone_verified,

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

        phone_verified:
          user.phone_verified,

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

        deposit_account_status:
          'not_provisioned',
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

  forgotPassword,

  resetPassword,

  sendPhoneOtp:
    sendPhoneOtpController,

  verifyPhone,

  resendPhoneOtp,

};
