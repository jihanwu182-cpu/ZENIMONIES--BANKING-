const register = async (req, res) => {
  const client = await pool.connect();

  let paystackCustomerCreated = false;
  let paystackCustomerCode = null;

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
        message: 'Full name is required',
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
    // SPLIT NAME FOR PAYSTACK
    // --------------------------------------------------------

    const nameParts =
      normalizedFullName.split(/\s+/);

    const firstName =
      nameParts.shift() || normalizedFullName;

    const lastName =
      nameParts.join(' ') || undefined;

    // --------------------------------------------------------
    // START DATABASE TRANSACTION
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

    // ========================================================
    // PAYSTACK CUSTOMER
    // ========================================================

    const {
      createPaystackCustomer,
      createDedicatedVirtualAccount,
    } = require('../services/paystackService');

    const paystackCustomer =
      await createPaystackCustomer({
        email: normalizedEmail,
        firstName,
        lastName,
        phone: normalizedPhone,
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

    paystackCustomerCreated = true;

    paystackCustomerCode =
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
    // REAL PROVIDER ACCOUNT DETAILS
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
        : providerAccount.bank_name || null;

    const providerBankCode =
      providerAccount.bank &&
      providerAccount.bank.id
        ? String(providerAccount.bank.id)
        : providerAccount.bank_code || null;

    const providerAccountId =
      providerAccount.id
        ? String(providerAccount.id)
        : null;

    if (!providerAccountNumber) {
      throw new Error(
        'Paystack did not return a real dedicated account number'
      );
    }

    // ========================================================
    // CREATE ZENIMONIES ACCOUNT
    //
    // IMPORTANT:
    // We DO NOT generate an account number.
    //
    // The account number below is the real provider-issued
    // account number returned by Paystack.
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
        providerBankName || 'Paystack',
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
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query('COMMIT');

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
        id: user.id,

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

      // ======================================================
      // THIS IS THE REAL PROVIDER-ISSUED ACCOUNT
      // ======================================================

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
      // TESTING ONLY
      // REMOVE BEFORE PRODUCTION
      // ------------------------------------------------------

      development_otp:
        process.env.NODE_ENV !== 'production'
          ? otp
          : undefined,
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
          'Email, phone number, or provider account number is already registered',
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
