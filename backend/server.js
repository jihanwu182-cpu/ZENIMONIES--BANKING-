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
const billsRoutes = require('./routes/bills');
const internetBillsRoutes =
  require('./routes/internetBills');
const transferRoutes = require('./routes/transfer');
const dataRoutes = require('./routes/data');
const airtimeRoutes = require('./routes/airtime');
const tvRoutes = require('./routes/tv');
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
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const saveWalletRoutes =
    require('./routes/saveWalletRoutes');
const educationRoutes =
  require('./routes/education');
const bettingRoutes = require('./routes/betting');
const insuranceRoutes = require('./routes/insurance');
const giftcardRoutes = require('./routes/giftcardRoutes');
const supportRoutes = require('./routes/supportRoutes');
const customerCareRoutes =
  require('./routes/customerCareRoutes');
const statementRoutes = require('./routes/statementRoutes');
const posRoutes = require('./routes/posRoutes');
const smsPreferencesRoutes = require('./routes/smsPreferences');
const businessRoutes =
  require('./routes/businessRoutes');
const {
  startSavingsMaturityJob,
} = require('./jobs/savingsMaturityJob');
const {
  startSupportTimeoutWorker,
} = require('./services/supportTimeoutWorker');

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
// SOGO
// ============================================================

const {
  handleSogoWebhook,
} = require('./controllers/sogoWebhookController');

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
// SOGO WEBHOOK
// ============================================================
//
// IMPORTANT:
// This must remain BEFORE express.json() because Sogo
// signature verification requires the original raw body.
// ============================================================

app.post(
  '/api/webhooks/sogo',
  express.raw({
    type: 'application/json',
  }),
  handleSogoWebhook
);

 // ============================================================
// NORMAL BODY PARSING
// ============================================================
//
// Preserve the original JSON request body so the Dojah
// webhook signature can be verified against the raw bytes.
//
// Keep this BEFORE the API routes, but AFTER the Paystack
// and Sogo raw-body webhook routes.
// ============================================================

app.use(
  express.json({
    limit: '2mb',

    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
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
app.use('/api/savings', savingsRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/pos', posRoutes);
app.use(
  '/api/businesses',
  businessRoutes
);
app.use(
    '/api/wallet',
    saveWalletRoutes
);
// ============================================================
// BILL PAYMENTS
// ============================================================

app.use(
  '/api/bills',
  billsRoutes
);
// ============================================================
// INTERNET BILLS
// ============================================================

app.use(
  '/api/internet-bills',
  internetBillsRoutes
);

app.use(
  '/api/education',
  educationRoutes
);
app.use(
  '/api/insurance', 
    insuranceRoutes
  );
app.use(
  '/api/auth',
  authRoutes
 );
// ============================================================
// BENEFICIARIES
// ============================================================

app.use(
  '/api/beneficiaries',
  beneficiaryRoutes
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

app.use(
  '/api/betting', 
  bettingRoutes
);
// ============================================================
// TV SUBSCRIPTION
// ============================================================

app.use(
  '/api/tv',
  tvRoutes
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
app.use(
  '/api/sms-preferences',
  smsPreferencesRoutes
);

app.use(
  '/api/support', 
  supportRoutes
);

app.use(
  '/api/customer-care',
  customerCareRoutes
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

      ALTER TABLE bill_payments
      ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(150);

      ALTER TABLE bill_payments
      ADD COLUMN IF NOT EXISTS commission_details JSONB;

      ALTER TABLE bill_payments
      ADD COLUMN IF NOT EXISTS provider_response JSONB;

      CREATE INDEX IF NOT EXISTS idx_bill_payments_provider_request
      ON bill_payments(provider_request_id);
     
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS transaction_fee NUMERIC(18,2) NOT NULL DEFAULT 0.00;
    `);
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
 // ============================================================
// ZENIMONIES CUSTOMER CARE ACCOUNT PROVISIONING
// ============================================================
//
// This is a controlled bootstrap for the designated
// Customer Care account.
//
// IMPORTANT:
// - Does NOT create an account.
// - Does NOT change an admin account.
// - Does NOT affect normal customers.
// - Only the exact email below can be promoted.
// ============================================================

try {
  const customerCareEmail =
    'ekpeghreharrison7@gmail.com';

  const customerCareResult =
    await pool.query(
      `
      UPDATE users
      SET
        role = 'customer_care',
        updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(email) = LOWER($1)
        AND role <> 'admin'
      RETURNING
        id,
        email,
        full_name,
        role,
        status
      `,
      [customerCareEmail]
    );

  if (
    customerCareResult.rows.length > 0
  ) {
    console.log(
      '============================================================'
    );

    console.log(
      'ZENIMONIES CUSTOMER CARE PROVISIONING'
    );

    console.log(
      'Email:',
      customerCareResult.rows[0].email
    );

    console.log(
      'Name:',
      customerCareResult.rows[0].full_name
    );

    console.log(
      'Role:',
      customerCareResult.rows[0].role
    );

    console.log(
      'Status:',
      customerCareResult.rows[0].status
    );

    console.log(
      'Customer Care account provisioning completed.'
    );

    console.log(
      '============================================================'
    );
  } else {
    console.log(
      'Customer Care provisioning: designated account was not found or is an admin account.'
    );
  }
} catch (customerCareProvisioningError) {
  console.error(
    'Customer Care provisioning failed:',
    customerCareProvisioningError
  );
}
  // ============================================================
// ZENIMONIES ADMIN ACCOUNT PROVISIONING
// ============================================================
//
// Security:
// - Never hardcode administrator passwords.
// - Never reset an existing administrator password at startup.
// - Existing accounts remain unchanged.
// - New administrator creation requires explicit configuration.
// ============================================================
try {
  const adminEmail = String(
    process.env.ADMIN_BOOTSTRAP_EMAIL || ''
  ).trim().toLowerCase();
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!adminEmail && !adminPassword) {
    console.log(
      'Admin bootstrap disabled. Existing admin accounts are unchanged.'
    );
  } else if (!adminEmail || !adminPassword) {
    console.error(
      'Admin bootstrap skipped: both ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be configured.'
    );
  } else {
    console.log(
      'Admin bootstrap credentials are configured. Automatic account creation is disabled; use a controlled provisioning process.'
    );
  }
} catch (adminProvisioningError) {
  console.error(
    'Admin provisioning check failed:',
    adminProvisioningError.message
  );
}
// ========================================================
// CUSTOMER CARE / SUPPORT DATABASE
// ========================================================
//
// Creates the Customer Care system if it does not already
// exist.
//
// IMPORTANT:
// These statements use IF NOT EXISTS so existing data is
// preserved.
//
// Customer Care never directly changes customer balances.
// ========================================================

// ========================================================
// SUPPORT CATEGORIES
// ========================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS support_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// ========================================================
// SUPPORT TICKETS
// ========================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_number VARCHAR(40) NOT NULL UNIQUE,

    user_id UUID NOT NULL
      REFERENCES users(id)
      ON DELETE RESTRICT,

    category_id UUID
      REFERENCES support_categories(id)
      ON DELETE SET NULL,

    subject VARCHAR(200) NOT NULL,

    description TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'open',

    priority VARCHAR(20) NOT NULL DEFAULT 'normal',

    assigned_admin_id UUID
      REFERENCES users(id)
      ON DELETE SET NULL,

    transaction_id UUID
      REFERENCES transactions(id)
      ON DELETE SET NULL,

    last_message_at TIMESTAMP,

    resolved_at TIMESTAMP,

    closed_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_tickets_status_check
      CHECK (
        status IN (
          'open',
          'in_progress',
          'pending',
          'resolved',
          'closed'
        )
      ),

    CONSTRAINT support_tickets_priority_check
      CHECK (
        priority IN (
          'low',
          'normal',
          'high',
          'urgent'
        )
      )
  );
`);

// ========================================================
// SUPPORT MESSAGES
// ========================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
      REFERENCES support_tickets(id)
      ON DELETE CASCADE,

    sender_user_id UUID
      REFERENCES users(id)
      ON DELETE SET NULL,

    sender_type VARCHAR(20) NOT NULL,

    message TEXT NOT NULL,

    is_internal BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_messages_sender_type_check
      CHECK (
        sender_type IN (
          'customer',
          'admin'
        )
      )
  );
`);

// ========================================================
// SUPPORT ATTACHMENTS
// ========================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
      REFERENCES support_tickets(id)
      ON DELETE CASCADE,

    message_id UUID
      REFERENCES support_messages(id)
      ON DELETE CASCADE,

    user_id UUID
      REFERENCES users(id)
      ON DELETE SET NULL,

    file_name VARCHAR(255) NOT NULL,

    file_url TEXT NOT NULL,

    file_type VARCHAR(100),

    file_size INTEGER,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// ========================================================
// SUPPORT TICKET EVENTS
// ========================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS support_ticket_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
      REFERENCES support_tickets(id)
      ON DELETE CASCADE,

    actor_user_id UUID
      REFERENCES users(id)
      ON DELETE SET NULL,

    event_type VARCHAR(50) NOT NULL,

    old_value TEXT,

    new_value TEXT,

    note TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// ========================================================
// SUPPORT INDEXES
// ========================================================

await pool.query(`
  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_user_id
  ON support_tickets(user_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_status
  ON support_tickets(status);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_priority
  ON support_tickets(priority);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_category
  ON support_tickets(category_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_assigned_admin
  ON support_tickets(assigned_admin_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_transaction
  ON support_tickets(transaction_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_created_at
  ON support_tickets(created_at DESC);

  CREATE INDEX IF NOT EXISTS
  idx_support_messages_ticket
  ON support_messages(ticket_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_messages_created_at
  ON support_messages(created_at);

  CREATE INDEX IF NOT EXISTS
  idx_support_attachments_ticket
  ON support_attachments(ticket_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_ticket_events_ticket
  ON support_ticket_events(ticket_id);
`);

// ========================================================
// DEFAULT SUPPORT CATEGORIES
// ========================================================

await pool.query(`
  INSERT INTO support_categories (
    name,
    description
  )
  VALUES
    (
      'Account',
      'Questions about customer accounts and account access.'
    ),
    (
      'Login & Security',
      'Login problems, password issues and account security.'
    ),
    (
      'KYC & Verification',
      'BVN, identity verification and KYC issues.'
    ),
    (
      'Transfers',
      'Bank transfer and money transfer issues.'
    ),
    (
      'Airtime & Data',
      'Airtime and mobile data purchase issues.'
    ),
    (
      'Bills',
      'Electricity, cable, internet and other bill payments.'
    ),
    (
      'Gift Cards',
      'Gift card purchases, sales and related issues.'
    ),
    (
      'Business Banking',
      'Business account and business banking support.'
    ),
    (
      'POS',
      'POS terminal and merchant support.'
    ),
    (
      'Other',
      'Other customer support requests.'
    )
  ON CONFLICT (name) DO NOTHING;
`);

console.log(
  'Database migration completed: Customer Care support system is available'
);
    // ========================================================
// CUSTOMER CARE WORKFLOW COMPATIBILITY MIGRATION
// ========================================================
//
// IMPORTANT:
// The support_tickets table may already exist in production.
// CREATE TABLE IF NOT EXISTS does NOT add new columns to an
// existing table.
//
// This migration safely adds the Customer Care workflow fields
// to the existing production table.
//
// Existing tickets and customer data are preserved.
// ========================================================

await pool.query(`
  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS connected_to_customer_care BOOLEAN
    NOT NULL DEFAULT FALSE;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS customer_response_due_at TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS auto_close_reason TEXT;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS last_agent_message_at TIMESTAMP;
`);

console.log(
  'Database migration completed: Customer Care workflow columns are available'
);

// ========================================================
// CUSTOMER CARE ASSIGNED AGENT FOREIGN KEY
// ========================================================

await pool.query(`
  DO $$
  BEGIN

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname =
        'support_tickets_assigned_to_fkey'
    ) THEN

      ALTER TABLE support_tickets
      ADD CONSTRAINT support_tickets_assigned_to_fkey
      FOREIGN KEY (assigned_to)
      REFERENCES users(id)
      ON DELETE SET NULL;

    END IF;

  END
  $$;
`);

console.log(
  'Database migration completed: Customer Care agent assignment is available'
);

// ========================================================
// CUSTOMER CARE INDEXES
// ========================================================

await pool.query(`
  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_assigned_to
  ON support_tickets(assigned_to);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_customer_care
  ON support_tickets(connected_to_customer_care);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_waiting_customer
  ON support_tickets(
    status,
    waiting_since,
    customer_response_due_at
  );
`);

console.log(
  'Database migration completed: Customer Care workflow indexes are available'
);
// ========================================================
// CUSTOMER CARE → ADMINISTRATION ESCALATION
// ========================================================
//
// Adds the Administration escalation fields to existing
// production support tickets.
//
// Customer Care and Administration remain separate roles.
//
// Customer Care:
//   - investigates
//   - chats
//   - resolves normal cases
//   - forwards cases requiring administrative action
//
// Administration:
//   - takes escalated cases
//   - performs permitted administrative actions
//   - resolves/closes escalated cases
// ========================================================

await pool.query(`
  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS
  escalated_to_admin BOOLEAN
    NOT NULL DEFAULT FALSE;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS
  escalated_at TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS
  escalated_by UUID;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS
  admin_taken_at TIMESTAMP;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS
  escalation_reason TEXT;

  ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS
  assigned_admin_id UUID;
`);

console.log(
  'Database migration completed: Administration escalation columns are available'
);


// ========================================================
// ESCALATION FOREIGN KEYS
// ========================================================

await pool.query(`
  DO $$
  BEGIN

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname =
        'support_tickets_escalated_by_fkey'
        AND conrelid =
        'support_tickets'::regclass
    ) THEN

      ALTER TABLE support_tickets
      ADD CONSTRAINT
      support_tickets_escalated_by_fkey
      FOREIGN KEY (escalated_by)
      REFERENCES users(id)
      ON DELETE SET NULL;

    END IF;

  END
  $$;
`);


await pool.query(`
  DO $$
  BEGIN

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname =
        'support_tickets_assigned_admin_id_fkey'
        AND conrelid =
        'support_tickets'::regclass
    ) THEN

      ALTER TABLE support_tickets
      ADD CONSTRAINT
      support_tickets_assigned_admin_id_fkey
      FOREIGN KEY (assigned_admin_id)
      REFERENCES users(id)
      ON DELETE SET NULL;

    END IF;

  END
  $$;
`);

console.log(
  'Database migration completed: Administration escalation foreign keys are available'
);


// ========================================================
// ADMINISTRATION ESCALATION INDEXES
// ========================================================

await pool.query(`
  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_escalated_to_admin
  ON support_tickets(escalated_to_admin);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_assigned_admin_id
  ON support_tickets(assigned_admin_id);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_escalated_at
  ON support_tickets(escalated_at);

  CREATE INDEX IF NOT EXISTS
  idx_support_tickets_admin_queue
  ON support_tickets(
    escalated_to_admin,
    assigned_admin_id,
    status
  );
`);

console.log(
  'Database migration completed: Administration escalation indexes are available'
);
    // ========================================================
// CUSTOMER CARE SECURE TRANSACTION VIEWS
// ========================================================
//
// Customer Care can investigate transactions without seeing:
//
// - account balance
// - available balance
// - ledger balance
// - balance_before
// - balance_after
// - full account number
// - security secrets
//
// Only masked account information and transaction information
// required for support investigation are exposed.
// ========================================================

await pool.query(`
  CREATE OR REPLACE VIEW agent_transactions_view AS
  SELECT
      t.id AS transaction_id,

      a.user_id AS customer_id,

      u.full_name AS customer_name,

      u.email AS customer_email,

      u.phone AS customer_phone,

      u.kyc_status,

      CASE
          WHEN a.account_number IS NULL THEN NULL
          WHEN LENGTH(a.account_number) <= 4 THEN '****'
          ELSE '****' || RIGHT(a.account_number, 4)
      END AS masked_account_number,

      t.reference AS transaction_reference,

      t.type AS transaction_type,

      t.amount AS transaction_amount,

      t.currency AS transaction_currency,

      t.description AS transaction_description,

      t.status AS transaction_status,

      t.created_at AS transaction_created_at,

      bt.id AS bank_transfer_id,

      bt.recipient_name,

      CASE
          WHEN bt.recipient_account_number IS NULL THEN NULL
          WHEN LENGTH(bt.recipient_account_number) <= 4 THEN '****'
          ELSE '****' ||
            RIGHT(bt.recipient_account_number, 4)
      END AS masked_recipient_account_number,

      bt.recipient_bank_name,

      bt.recipient_bank_code,

      bt.status AS bank_transfer_status,

      bt.provider_reference,

      bt.failure_reason,

      bt.created_at AS transfer_created_at,

      bt.completed_at AS transfer_completed_at

  FROM transactions t

  INNER JOIN accounts a
      ON a.id = t.account_id

  INNER JOIN users u
      ON u.id = a.user_id

  LEFT JOIN bank_transfers bt
      ON bt.reference = t.reference
      OR bt.provider_reference = t.reference;
`);

console.log(
  'Database migration completed: secure Customer Care transaction view is available'
);


// ========================================================
// SECURE BANK TRANSFER VIEW
// ========================================================

await pool.query(`
  CREATE OR REPLACE VIEW agent_bank_transfers_view AS
  SELECT

      bt.id AS bank_transfer_id,

      a.user_id AS customer_id,

      u.full_name AS customer_name,

      u.email AS customer_email,

      u.phone AS customer_phone,

      u.kyc_status,

      CASE
          WHEN a.account_number IS NULL THEN NULL
          WHEN LENGTH(a.account_number) <= 4 THEN '****'
          ELSE '****' || RIGHT(a.account_number, 4)
      END AS masked_account_number,

      bt.reference AS transaction_reference,

      bt.provider_reference,

      bt.recipient_name,

      CASE
          WHEN bt.recipient_account_number IS NULL THEN NULL
          WHEN LENGTH(bt.recipient_account_number) <= 4 THEN '****'
          ELSE '****' ||
            RIGHT(bt.recipient_account_number, 4)
      END AS masked_recipient_account_number,

      bt.recipient_bank_name,

      bt.recipient_bank_code,

      bt.amount,

      bt.currency,

      bt.narration,

      bt.status,

      bt.failure_reason,

      bt.created_at,

      bt.completed_at

  FROM bank_transfers bt

  INNER JOIN accounts a
      ON a.id = bt.account_id

  INNER JOIN users u
      ON u.id = a.user_id;
`);

console.log(
  'Database migration completed: secure Customer Care bank transfer view is available'
);
// ========================================================
// SUPPORT MESSAGE SENDER TYPES
// ========================================================
//
// The original table allowed only:
//   customer
//   admin
//
// Customer Care now also uses:
//   assistant
//   agent
//
// Update the constraint safely.
// ========================================================

await pool.query(`
  ALTER TABLE support_messages
  DROP CONSTRAINT IF EXISTS
  support_messages_sender_type_check;
`);

await pool.query(`
  ALTER TABLE support_messages
  ADD CONSTRAINT
  support_messages_sender_type_check
  CHECK (
    sender_type IN (
      'customer',
      'assistant',
      'agent',
      'admin'
    )
  );
`);

console.log(
  'Database migration completed: Customer Care message sender types are available'
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
// START AUTOMATIC SAVINGS MATURITY SCHEDULER
// ========================================================

startSavingsMaturityJob();

console.log(
  'Automatic Savings Maturity Scheduler is active.'
);


// ========================================================
// START CUSTOMER CARE TIMEOUT WORKER
// ========================================================
//
// Checks Customer Care cases every 5 minutes.
//
// Handles:
// - customer response reminders
// - automatic closure after response timeout
//
// The worker does not modify balances or transactions.
// ========================================================

startSupportTimeoutWorker();

console.log(
  'Customer Care Timeout Worker is active.'
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
        
        console.log('Airtime: /api/airtime');
        
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
