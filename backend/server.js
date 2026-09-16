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
const internalTransferRoutes = require('./routes/internalTransfer');
const depositRoutes = require('./routes/deposit');
const bankRoutes = require('./routes/bankRoutes');
const virtualCardRoutes = require('./routes/virtualCard');
const adminRoutes = require('./routes/adminRoutes');
const kycRoutes = require('./routes/kycRoutes');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const passkeyRoutes = require('./routes/passkey');

// ============================================================
// PAYSTACK
// ============================================================

const paystackRoutes = require('./routes/paystack');

const {
  handlePaystackWebhook,
} = require('./controllers/paystackWebhookController');

const {
  handleDojahWebhook,
} = require(
  './controllers/dojahWebhookController'
);
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

// Authentication
app.use(
  '/api/auth',
  authRoutes
);

// Customer accounts
app.use(
  '/api/account',
  accountRoutes
);

// External bank transfers
app.use(
  '/api/transfers',
  transferRoutes
);

// Zenimonies-to-Zenimonies transfers
app.use(
  '/api/internal-transfers',
  internalTransferRoutes
);

// Deposits
app.use(
  '/api/deposits',
  depositRoutes
);

// Banks
app.use(
  '/api/banks',
  bankRoutes
);

// Virtual cards
app.use(
  '/api/virtual-cards',
  virtualCardRoutes
);

// ============================================================
// PAYSTACK
// ============================================================
//
// POST /api/paystack/initialize
// POST /api/paystack/webhook
//
// The initialize route creates a Paystack Checkout session.
//
// The webhook is the ONLY mechanism that credits the account.
// ============================================================

app.use(
  '/api/paystack',
  paystackRoutes
);

// ============================================================
// KYC
// ============================================================
//
// GET  /api/kyc/status
// POST /api/kyc/bvn
// POST /api/kyc/tier-2
// POST /api/kyc/tier-3
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
// PASSKEYS
// ============================================================

app.use(
  '/api/passkey',
  passkeyRoutes
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

app.get('/', (req, res) => {
  res.json({
    success: true,
    message:
      'Zenimonies Banking API is running',
  });
});

// ============================================================
// API HOME
// ============================================================

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message:
      'Zenimonies Banking API is running',
  });
});

// ============================================================
// GENERAL HEALTH CHECK
// ============================================================

app.get('/health.json', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    platform: 'Zenimonies',
    timestamp:
      new Date().toISOString(),
  });
});

// ============================================================
// API HEALTH
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
  });
});

// ============================================================
// DATABASE HEALTH
// ============================================================

app.get(
  '/api/health/database',
  async (req, res) => {
    try {
      const result =
        await pool.query(
          'SELECT NOW()'
        );

      return res.status(200).json({
        success: true,
        status: 'healthy',
        database: 'connected',
        time:
          result.rows[0].now,
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
// DOJAH BVN CONNECTION HEALTH CHECK
// ============================================================

app.get(
  '/api/health/dojah',
  async (req, res) => {
    try {
      const {
        testDojahConnection,
        verifyBvn,
      } = require(
        './services/dojahService'
      );

      // --------------------------------------------------------
      // STEP 1: CHECK CONFIGURATION
      // --------------------------------------------------------

      const config =
        testDojahConnection();

      if (!config.success) {
        return res.status(500).json({
          success: false,
          message:
            'Dojah configuration is incomplete.',
          dojah: config,
        });
      }

      // --------------------------------------------------------
      // STEP 2: ACTUALLY CALL DOJAH SANDBOX
      // --------------------------------------------------------
      //
      // This is Dojah's official sandbox test BVN.
      //
      // We NEVER use this to verify a real customer.
      // It is only a connectivity test.
      //

      console.log(
        '================================================'
      );

      console.log(
        'DOJAH SANDBOX CONNECTION TEST'
      );

      console.log(
        '================================================'
      );

      const result =
        await verifyBvn(
          '22222222222'
        );

      console.log(
        'Dojah test status:',
        result.status
      );

      console.log(
        'Dojah test success:',
        result.success
      );

      console.log(
        '================================================'
      );

      // --------------------------------------------------------
      // DOJAH REQUEST FAILED
      // --------------------------------------------------------

      if (!result.success) {
        return res.status(502).json({
          success: false,
          message:
            'Dojah Sandbox request failed.',
          dojah: {
            configured: true,
            baseUrl:
              config.baseUrl,
            status:
              result.status,
            error:
              result.message,
          },
        });
      }

      // --------------------------------------------------------
      // DOJAH REQUEST SUCCEEDED
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          'Dojah Sandbox connection is working.',
        dojah: {
          configured: true,
          connected: true,
          baseUrl:
            config.baseUrl,
          status:
            result.status,
        },
      });
    } catch (error) {
      console.error(
        'Dojah Sandbox health check failed:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to connect to Dojah Sandbox.',
        error:
          error.message,
      });
    }
  }
);
// ============================================================
// DOJAH WEBHOOK
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
      message:
        'Internal server error',
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    // --------------------------------------------------------
    // DATABASE
    // --------------------------------------------------------

    await initializeDatabase();

    // --------------------------------------------------------
    // DATABASE MIGRATIONS
    // --------------------------------------------------------
    //
    // Add recipient phone number to bank transfers.
    //
    // This runs against the existing live PostgreSQL
    // database. IF NOT EXISTS makes it safe to run
    // whenever the backend starts.
    //

    await pool.query(`
      ALTER TABLE bank_transfers
      ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(30);
    `);

    console.log(
      'Database migration completed: recipient_phone is available on bank_transfers'
    );
    
    // --------------------------------------------------------
    // PROFILE DATABASE MIGRATION
    // --------------------------------------------------------
    //
    // Add persistent profile fields to existing users.
    // IF NOT EXISTS makes this safe on every server restart.
    //

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS address TEXT;

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS city VARCHAR(100);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS state VARCHAR(100);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS lga VARCHAR(100);

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS country VARCHAR(100)
      NOT NULL DEFAULT 'Nigeria';

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_photo TEXT;
    `);

    console.log(
      'Database migration completed: profile fields are available on users'
    );
    
    // --------------------------------------------------------
// NOTIFICATIONS DATABASE
// --------------------------------------------------------
//
// Stores real customer notifications.
// No mock notifications are created.
//

await pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL DEFAULT 'general',

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    read_at TIMESTAMP
  );
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read);
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);
`);

console.log(
  'Database migration completed: notifications table is available'
);
    // --------------------------------------------------------
    // LEGAL NAME VERIFICATION LOCK
   // --------------------------------------------------------
  // LEGAL NAME VERIFICATION LOCK
  // --------------------------------------------------------
 //
 // The first successful verification permanently locks
 // the user's legal name.
//

await pool.query(`
  CREATE OR REPLACE FUNCTION lock_legal_name_after_verification()
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

  DROP TRIGGER IF EXISTS users_legal_name_verification_lock
  ON users;

  CREATE TRIGGER users_legal_name_verification_lock
  BEFORE UPDATE OF is_verified
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION lock_legal_name_after_verification();
`);

await pool.query(`
  UPDATE users
  SET
    legal_name_locked = true,
    updated_at = CURRENT_TIMESTAMP
  WHERE is_verified = true
    AND legal_name_locked = false;
`);

console.log(
  'Database migration completed: legal name verification lock is active'
);
    // --------------------------------------------------------
   //
   // The first successful verification permanently locks
  // the user's legal name.
  //

await pool.query(`
  CREATE OR REPLACE FUNCTION lock_legal_name_after_verification()
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

  DROP TRIGGER IF EXISTS users_legal_name_verification_lock
  ON users;

  CREATE TRIGGER users_legal_name_verification_lock
  BEFORE UPDATE OF is_verified
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION lock_legal_name_after_verification();
`);

await pool.query(`
  UPDATE users
  SET
    legal_name_locked = true,
    updated_at = CURRENT_TIMESTAMP
  WHERE is_verified = true
    AND legal_name_locked = false;
`);

console.log(
  'Database migration completed: legal name verification lock is active'
);

    // --------------------------------------------------------
    // SERVER
    // --------------------------------------------------------

    app.listen(
      PORT,
      () => {
        console.log(
          `Zenimonies Banking API running on port ${PORT}`
        );

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
         'Passkey:',
         '/api/passkey'
        );

        console.log(
          'Admin:',
          '/api/admin'
        );
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
