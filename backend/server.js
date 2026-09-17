require('dotenv').config();

const express = require('express');
const cors = require('cors');

const database = require('./config/database');

const pool = database;
const { initializeDatabase } = database;

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const transferRoutes = require('./routes/transfer');
const dataRoutes = require('./routes/data');
const airtimeRoutes = require('./routes/airtime');
const internalTransferRoutes = require('./routes/internalTransfer');
const depositRoutes = require('./routes/deposit');
const bankRoutes = require('./routes/bankRoutes');
const virtualCardRoutes = require('./routes/virtualCard');
const adminRoutes = require('./routes/adminRoutes');
const kycRoutes = require('./routes/kycRoutes');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const passkeyRoutes = require('./routes/passkey');
const passcodeRoutes = require('./routes/passcode');
const transactionPinRoutes = require('./routes/transactionPin');

// ============================================================
// PAYSTACK
// ============================================================

const paystackRoutes = require('./routes/paystack');

const {
  handlePaystackWebhook,
} = require('./controllers/paystackWebhookController');

// ============================================================
// DOJAH
// ============================================================

const {
  handleDojahWebhook,
} = require('./controllers/dojahWebhookController');

// ============================================================
// APP
// ============================================================

const app = express();

const PORT = process.env.PORT || 5000;

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ============================================================
// PAYSTACK WEBHOOK
// ============================================================
//
// IMPORTANT:
//
// This MUST remain BEFORE express.json().
//
// Paystack signature verification requires the original
// raw request body.
// ============================================================

app.post(
  '/api/paystack/webhook',
  express.raw({
    type: 'application/json',
  }),
  handlePaystackWebhook
);

// ============================================================
// NORMAL BODY PARSING
// ============================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ============================================================
// API ROUTES
// ============================================================

// ------------------------------------------------------------
// AUTHENTICATION
// ------------------------------------------------------------

app.use(
  '/api/auth',
  authRoutes
);

// ------------------------------------------------------------
// CUSTOMER ACCOUNTS
// ------------------------------------------------------------

app.use(
  '/api/account',
  accountRoutes
);

// ------------------------------------------------------------
// EXTERNAL BANK TRANSFERS
// ------------------------------------------------------------

app.use(
  '/api/transfers',
  transferRoutes
);

// ------------------------------------------------------------
// ZENIMONIES-TO-ZENIMONIES TRANSFERS
// ------------------------------------------------------------

app.use(
  '/api/internal-transfers',
  internalTransferRoutes
);
// ------------------------------------------------------------
// MOBILE DATA
// ------------------------------------------------------------

app.use(
  '/api/data',
  dataRoutes
);

// ============================================================
// AIRTIME
// ============================================================

app.use(
  '/api/airtime',
  airtimeRoutes
);
// ------------------------------------------------------------
// DEPOSITS
// ------------------------------------------------------------

app.use(
  '/api/deposits',
  depositRoutes
);

// ------------------------------------------------------------
// BANKS
// ------------------------------------------------------------

app.use(
  '/api/banks',
  bankRoutes
);

// ------------------------------------------------------------
// VIRTUAL CARDS
// ------------------------------------------------------------

app.use(
  '/api/virtual-cards',
  virtualCardRoutes
);

// ============================================================
// PAYSTACK
// ============================================================

app.use(
  '/api/paystack',
  paystackRoutes
);

// ============================================================
// KYC
// ============================================================

app.use(
  '/api/kyc',
  kycRoutes
);

// ============================================================
// PROFILE
// ============================================================

app.use(
  '/api/profile',
  profileRoutes
);

// ============================================================
// NOTIFICATIONS
// ============================================================

app.use(
  '/api/notifications',
  notificationRoutes
);

// ============================================================
// PASSKEY
// ============================================================
//
// PASSWORDLESS LOGIN:
//
// POST /api/passkey/login/options
// POST /api/passkey/login/verify
//
// PASSKEY REGISTRATION:
//
// POST /api/passkey/register/options
// POST /api/passkey/register/verify
//
// AUTHENTICATED PASSKEY:
//
// POST /api/passkey/authenticate/options
// POST /api/passkey/authenticate/verify
//
// PASSKEY LIST:
//
// GET /api/passkey
// ============================================================

app.use(
  '/api/passkey',
  passkeyRoutes
);

// ============================================================
// PASSCODE
// ============================================================

app.use(
  '/api/passcode',
  passcodeRoutes
);

app.use(
  '/api/transaction-pin',
  transactionPinRoutes
);
// ============================================================
// ADMIN
// ============================================================

app.use(
  '/api/admin',
  adminRoutes
);

// ============================================================
// ROOT
// ============================================================

app.get(
  '/',
  (req, res) => {
    return res.json({
      success: true,
      message: 'Zenimonies Banking API is running',
    });
  }
);

// ============================================================
// API HOME
// ============================================================

app.get(
  '/api',
  (req, res) => {
    return res.json({
      success: true,
      message: 'Zenimonies Banking API is running',
    });
  }
);

// ============================================================
// GENERAL HEALTH CHECK
// ============================================================

app.get(
  '/health.json',
  (req, res) => {
    return res.json({
      success: true,
      status: 'ok',
      platform: 'Zenimonies',
      timestamp: new Date().toISOString(),
    });
  }
);

// ============================================================
// API HEALTH
// ============================================================

app.get(
  '/api/health',
  (req, res) => {
    return res.json({
      success: true,
      status: 'healthy',
    });
  }
);

// ============================================================
// DATABASE HEALTH
// ============================================================

app.get(
  '/api/health/database',
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT NOW()'
      );

      return res.status(200).json({
        success: true,
        status: 'healthy',
        database: 'connected',
        time: result.rows[0].now,
      });
    } catch (error) {
      console.error(
        'Database health check failed:',
        error
      );

      return res.status(500).json({
        success: false,
        status: 'unhealthy',
        database: 'disconnected',
      });
    }
  }
);

// ============================================================
// DOJAH HEALTH
// ============================================================
//
// This endpoint checks that the required Dojah configuration
// exists.
//
// It does NOT submit a real customer's BVN.
// It does NOT mark anyone as verified.
// It does NOT change any KYC status.
// ============================================================

app.get(
  '/api/health/dojah',
  async (req, res) => {
    try {
      const appId =
        process.env.DOJAH_APP_ID;

      const secretKey =
        process.env.DOJAH_SECRET_KEY;

      const baseUrl =
        process.env.DOJAH_BASE_URL ||
        'https://sandbox.dojah.io';

      if (!appId || !secretKey) {
        return res.status(500).json({
          success: false,
          status: 'unhealthy',
          message:
            'Dojah configuration is incomplete.',
          dojah: {
            configured: false,
            baseUrl,
          },
        });
      }

      return res.status(200).json({
        success: true,
        status: 'healthy',
        message:
          'Dojah configuration is available.',
        dojah: {
          configured: true,
          baseUrl,
        },
      });
    } catch (error) {
      console.error(
        'Dojah health check failed:',
        error
      );

      return res.status(500).json({
        success: false,
        status: 'unhealthy',
        message:
          'Unable to check Dojah configuration.',
      });
    }
  }
);

// ============================================================
// DOJAH WEBHOOK
// ============================================================
//
// Dojah sends verification results to this endpoint.
//
// The webhook controller is responsible for processing
// the provider result.
// ============================================================

app.post(
  '/api/webhooks/dojah',
  handleDojahWebhook
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl,
    });
  }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      'Server error:',
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    // ========================================================
    // DATABASE
    // ========================================================

    await initializeDatabase();

    console.log(
      'Database initialization completed.'
    );

    // ========================================================
    // BANK TRANSFERS COMPATIBILITY MIGRATION
    // ========================================================

    await pool.query(`
      ALTER TABLE bank_transfers
      ADD COLUMN IF NOT EXISTS
      recipient_phone VARCHAR(30);
    `);

    console.log(
      'Database migration completed: recipient_phone is available on bank_transfers'
    );

    // ========================================================
    // PROFILE COMPATIBILITY MIGRATION
    // ========================================================

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      address TEXT;

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      city VARCHAR(100);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      state VARCHAR(100);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      lga VARCHAR(100);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      country VARCHAR(100)
      NOT NULL DEFAULT 'Nigeria';

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      profile_photo TEXT;

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS
      gender VARCHAR(30);
    `);

    ALTER TABLE airtime_transactions
    ADD COLUMN IF NOT EXISTS
    provider_request_id VARCHAR(150);

    ALTER TABLE airtime_transactions
    ADD COLUMN IF NOT EXISTS
    commission_details JSONB;

    ALTER TABLE airtime_transactions
    ADD COLUMN IF NOT EXISTS
    provider_response JSONB;

    ALTER TABLE data_transactions
    ADD COLUMN IF NOT EXISTS
    commission_details JSONB;

    ALTER TABLE data_transactions
    ADD COLUMN IF NOT EXISTS
    provider_response JSONB;

    console.log(
      'Database migration completed: profile fields and gender are available on users'
    );

// ========================================================
// TRANSACTION PIN DATABASE
// ========================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS transaction_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
      REFERENCES users(id)
      ON DELETE CASCADE,

    pin_hash TEXT NOT NULL,

    failed_attempts INTEGER
      NOT NULL DEFAULT 0,

    locked_until TIMESTAMP,

    last_failed_at TIMESTAMP,

    last_used_at TIMESTAMP,

    created_at TIMESTAMP
      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
      NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log(
  'Database migration completed: transaction_pins table is available'
);

    // ========================================================
    // NOTIFICATIONS DATABASE
    // ========================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id UUID NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        type VARCHAR(50)
          NOT NULL DEFAULT 'general',

        title VARCHAR(200)
          NOT NULL,

        message TEXT
          NOT NULL,

        is_read BOOLEAN
          NOT NULL DEFAULT false,

        created_at TIMESTAMP
          NOT NULL DEFAULT CURRENT_TIMESTAMP,

        read_at TIMESTAMP
      );
    `);

    // --------------------------------------------------------
    // Notification indexes
    // --------------------------------------------------------

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_notifications_user_id
      ON notifications(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_notifications_user_unread
      ON notifications(user_id, is_read);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_notifications_created_at
      ON notifications(created_at DESC);
    `);

    console.log(
      'Database migration completed: notifications table is available'
    );

    // ========================================================
    // LEGAL NAME VERIFICATION LOCK
    // ========================================================
    //
    // The first successful account verification permanently
    // locks the user's legal name.
    //
    // This trigger DOES NOT perform verification.
    //
    // It only reacts when:
    //
    // is_verified: false → true
    //
    // and then sets:
    //
    // legal_name_locked = true
    //
    // The actual verification decision must come from the
    // authorized verification process/provider.
    // ========================================================

    await pool.query(`
      CREATE OR REPLACE FUNCTION
      lock_legal_name_after_verification()
      RETURNS TRIGGER AS $$
      BEGIN

        IF
          OLD.is_verified = false
          AND NEW.is_verified = true
        THEN
          NEW.legal_name_locked = true;
        END IF;

        RETURN NEW;

      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS
      users_legal_name_verification_lock
      ON users;
    `);

    await pool.query(`
      CREATE TRIGGER
      users_legal_name_verification_lock
      BEFORE UPDATE OF is_verified
      ON users
      FOR EACH ROW
      EXECUTE FUNCTION
      lock_legal_name_after_verification();
    `);

    // --------------------------------------------------------
    // Lock legal names for users who are already verified.
    // --------------------------------------------------------

    await pool.query(`
      UPDATE users
      SET
        legal_name_locked = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE
        is_verified = true
        AND legal_name_locked = false;
    `);

    console.log(
      'Database migration completed: legal name verification lock is active'
    );

    // ========================================================
    // START SERVER
    // ========================================================

    app.listen(
      PORT,
      () => {
        console.log('');
        console.log(
          '================================================'
        );
        console.log(
          'ZENIMONIES BANKING API'
        );
        console.log(
          '================================================'
        );

        console.log(
          `Server running on port ${PORT}`
        );

        console.log('');
        console.log(
          'API:',
          '/api'
        );

        console.log(
          'Health:',
          '/api/health'
        );

        console.log(
          'Database Health:',
          '/api/health/database'
        );

        console.log(
          'Dojah Health:',
          '/api/health/dojah'
        );

        console.log('');
        console.log(
          'Auth:',
          '/api/auth'
        );

        console.log(
          'Accounts:',
          '/api/account'
        );

        console.log(
          'Transfers:',
          '/api/transfers'
        );

        console.log(
          'Internal Transfers:',
          '/api/internal-transfers'
        );

        console.log(
          'Deposits:',
          '/api/deposits'
        );

        console.log(
          'Banks:',
          '/api/banks'
        );

        console.log(
          'Virtual Cards:',
          '/api/virtual-cards'
        );

        console.log(
          'Paystack:',
          '/api/paystack'
        );

        console.log(
          'Paystack Initialize:',
          '/api/paystack/initialize'
        );

        console.log(
          'Paystack Webhook:',
          '/api/paystack/webhook'
        );

        console.log(
          'KYC:',
          '/api/kyc'
        );

        console.log(
          'Profile:',
          '/api/profile'
        );

        console.log(
          'Notifications:',
          '/api/notifications'
        );

        console.log(
          'Passkey:',
          '/api/passkey'
        );

        console.log(
          'Passcode:',
          '/api/passcode'
        );

        console.log(
          'Admin:',
          '/api/admin'
        );

        console.log(
          'Dojah Webhook:',
          '/api/webhooks/dojah'
        );

        console.log(
          '================================================'
        );
        console.log('');
      }
    );
  } catch (error) {
    console.error(
      'Unable to start Zenimonies Banking API:',
      error
    );

    process.exit(1);
  }
};

// ============================================================
// START
// ============================================================

startServer();
