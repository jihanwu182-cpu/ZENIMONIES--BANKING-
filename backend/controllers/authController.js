const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = require('../config/database');

const {
  createPaystackCustomer,
  createDedicatedVirtualAccount,
} = require('../services/paystackService');


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


const getBearerToken = (req) => {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return null;
  }

  return authHeader.substring(7).trim();
};


const verifyJwt = (req) => {
  const token = getBearerToken(req);

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
    const decoded = jwt.verify(
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
  // Generate OTP
  // ----------------------------------------------------------

  const otp = generateOtp();

  const otpHash = hashToken(otp);


  // ----------------------------------------------------------
  // Expiration
  // ----------------------------------------------------------

  const expiresAt = new Date(
    Date.now() +
    OTP_EXPIRY_MINUTES * 60 * 1000
  );


  // ----------------------------------------------------------
  // Store hashed OTP
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


    if (
      normalizedPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters',
      });
    }


    // --------------------------------------------------------
    // SPLIT NAME FOR PAYSTACK
    // --------------------------------------------------------

    const nameParts =
      normalizedFullName.split(/\s+/);

    const firstName =
      nameParts.shift() ||
      normalizedFullName;

    const lastName =
      nameParts.join(' ') ||
      undefined;


    // --------------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------------

    await client.query(
      'BEGIN'
    );


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
    // CREATE PAYSTACK CUSTOMER
    // ========================================================

    const paystackCustomer =
      await createPaystackCustomer({
        email:
          normalizedEmail,

        firstName,

        lastName,

        phone:
          normalizedPhone,
      });


    if (
      !paystackCustomer ||
      !paystackCustomer.status ||
      !paystackCustomer.data
    ) {
      throw new Error(
        'Paystack customer could not be created'
      );
    }


    const paystackCustomerCode =
      paystackCustomer.data.customer_code;


    if (!paystackCustomerCode) {
      throw new Error(
        'Paystack customer code was not returned'
      );
    }


    // ========================================================
    // CREATE REAL PAYSTACK DEDICATED ACCOUNT
    // ========================================================

    const paystackAccount =
      await createDedicatedVirtualAccount({
        customerCode:
          paystackCustomerCode,
      });


    if (
      !paystackAccount ||
      !paystackAccount.status ||
      !paystackAccount.data
    ) {
      throw new Error(
        'Paystack dedicated account could not be created'
      );
    }


    const providerAccount =
      paystackAccount.data;


    // --------------------------------------------------------
    // EXTRACT REAL PROVIDER ACCOUNT
    // --------------------------------------------------------

    const providerAccountNumber =
      providerAccount.account_number;

    const providerAccountName =
      providerAccount.account_name ||
      normalizedFullName;

    const providerBankName =
      providerAccount.bank &&
      providerAccount.bank.name
        ? providerAccount.bank.name
        : providerAccount.bank_name ||
          null;

    const providerBankCode =
      providerAccount.bank &&
      providerAccount.bank.id
        ? String(
            providerAccount.bank.id
          )
        : providerAccount.bank_code ||
          null;

    const providerAccountId =
      providerAccount.id
        ? String(providerAccount.id)
        : null;


    // --------------------------------------------------------
    // CRITICAL VALIDATION
    //
    // We never create an account number ourselves.
    // Paystack MUST return one.
    // --------------------------------------------------------

    if (!providerAccountNumber) {
      throw new Error(
        'Paystack did not return a real dedicated account number'
      );
    }


    // ========================================================
    // CREATE ZENIMONIES ACCOUNT
    //
    // account_number is the real Paystack-issued number.
    // ========================================================

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
          providerAccountNumber,
        ]
      );


    const account =
      accountResult.rows[0];


    // ========================================================
    // SAVE PROVIDER DEPOSIT ACCOUNT
    // ========================================================

    await client.query(
      `
      INSERT INTO deposit_accounts (
        user_id,
        account_number,
        account_name,
        bank_name,
        bank_code,
        currency,
        status,
        provider,
        provider_customer_code,
        provider_account_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'NGN',
        'active',
        'paystack',
        $6,
        $7
      )
      `,
      [
        user.id,

        providerAccountNumber,

        providerAccountName,

        providerBankName ||
          'Paystack',

        providerBankCode,

        paystackCustomerCode,

        providerAccountId,
      ]
    );


    // ========================================================
    // CREATE PHONE OTP
    // ========================================================

    const otp =
      await createPhoneOtp(
        client,
        user.id
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
        'account_created',
        $2,
        $3,
        $4
      )
      `,
      [
        user.id,

        'Customer account created with a real provider-issued dedicated receiving account. Phone verification OTP generated.',

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

        daily_transfer_reset_at:
          user.daily_transfer_reset_at,

        created_at:
          user.created_at,
      },

      // ------------------------------------------------------
      // REAL PAYSTACK-ISSUED ACCOUNT
      // ------------------------------------------------------

      account: {

        id:
          account.id,

        account_number:
          account.account_number,

        account_name:
          providerAccountName,

        account_type:
          account.account_type,

        bank_name:
          providerBankName,

        bank_code:
          providerBankCode,

        currency:
          account.currency,

        balance:
          account.balance,

        status:
          account.status,

        created_at:
          account.created_at,
      },

      // ------------------------------------------------------
      // DEVELOPMENT TESTING ONLY
      // ------------------------------------------------------

      development_otp:
        process.env.NODE_ENV !==
        'production'
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
        error?.message ||
        'Unable to create account',
    });

  } finally {

    client.release();

  }
};


// ============================================================
// VERIFY PHONE OTP
// POST /api/auth/verify-phone-otp
// ============================================================

const verifyPhone = async (
  req,
  res
) => {

  const client =
    await pool.connect();

  try {

    // --------------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // OTP
    // --------------------------------------------------------

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
    // HASH PROVIDED OTP
    // --------------------------------------------------------

    const suppliedHash =
      hashToken(otp);


    // --------------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------------

    await client.query(
      'BEGIN'
    );


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


    // --------------------------------------------------------
    // COMPARE HASHES
    // --------------------------------------------------------

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
        'phone_verified',
        'Phone number verified successfully',
        $2,
        $3
      )
      `,
      [
        userId,

        req.ip ||
          null,

        req.get(
          'user-agent'
        ) || null,
      ]
    );


    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query(
      'COMMIT'
    );


    return res.status(200).json({

      success: true,

      message:
        'Phone number verified successfully.',

      is_verified:
        true,
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

    // --------------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------------

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
    // RESEND COOLDOWN
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
    // START TRANSACTION
    // --------------------------------------------------------

    await client.query(
      'BEGIN'
    );


    // --------------------------------------------------------
    // CREATE OTP
    // --------------------------------------------------------

    const otp =
      await createPhoneOtp(
        client,
        userId
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
        'phone_otp_resent',
        'Phone verification OTP regenerated',
        $2,
        $3
      )
      `,
      [
        userId,

        req.ip ||
          null,

        req.get(
          'user-agent'
        ) || null,
      ]
    );


    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await client.query(
      'COMMIT'
    );


    return res.status(200).json({

      success: true,

      message:
        'A new verification code has been generated.',

      development_otp:
        process.env.NODE_ENV !==
        'production'
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
// SEND PHONE OTP
// POST /api/auth/send-phone-otp
// ============================================================
//
// This is kept as a separate endpoint because your existing
// auth routes already expose /send-phone-otp.
//
// ============================================================

const sendPhoneOtp = async (
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


    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

    const userResult =
      await client.query(
        `
        SELECT
          id,
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


    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message:
          'Phone number is already verified',
      });
    }


    // --------------------------------------------------------
    // COOLDOWN
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
    // TRANSACTION
    // --------------------------------------------------------

    await client.query(
      'BEGIN'
    );


    const otp =
      await createPhoneOtp(
        client,
        userId
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
        'phone_otp_requested',
        'Phone verification OTP requested',
        $2,
        $3
      )
      `,
      [
        userId,

        req.ip ||
          null,

        req.get(
          'user-agent'
        ) || null,
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


    // --------------------------------------------------------
    // DEVELOPMENT ONLY
    // --------------------------------------------------------

    if (
      process.env.NODE_ENV !==
      'production'
    ) {
      response.test_otp = otp;
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


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !email ||
      !password
    ) {
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
          created_at,
          updated_at
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
      user.status !==
      'active'
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
          created_at,
          updated_at
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

      updated_at:
        user.updated_at,
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


    // --------------------------------------------------------
    // GET USER
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

  sendPhoneOtp,

  verifyPhone,

  resendPhoneOtp,

};
