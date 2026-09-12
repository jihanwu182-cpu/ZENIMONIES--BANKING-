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

// KYC
const kycRoutes = require('./routes/kycRoutes');

// ============================================================
// PAYSTACK WEBHOOK
// ============================================================

const {
  handlePaystackWebhook,
} = require('./controllers/paystackWebhookController');

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
// Paystack signature verification requires the raw request body.
//
// Therefore this route MUST appear before express.json().
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
// KYC
// ============================================================
//
// GET  /api/kyc/status
// POST /api/kyc/bvn
// POST /api/kyc/tier-2
// POST /api/kyc/tier-3
//
// KYC submissions remain pending until actual verification.
// ============================================================

app.use(
  '/api/kyc',
  kycRoutes
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
// DOJAH CONFIGURATION HEALTH CHECK
// ============================================================
//
// This endpoint ONLY checks whether the Dojah credentials
// exist in the server environment.
//
// It does NOT perform BVN verification.
// It does NOT perform ID verification.
// It does NOT perform facial/liveness verification.
//
// It also does NOT return the secret key.
// ============================================================

app.get(
  '/api/health/dojah',
  (req, res) => {
    try {
      const {
        testDojahConnection,
      } = require(
        './services/dojahService'
      );

      const result =
        testDojahConnection();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message:
            'Dojah configuration is incomplete.',
          dojah: result,
        });
      }

      return res.status(200).json({
        success: true,
        message:
          'Dojah configuration is loaded.',
        dojah: {
          configured: true,
          baseUrl: result.baseUrl,
        },
      });
    } catch (error) {
      console.error(
        'Dojah configuration test failed:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to test Dojah configuration.',
      });
    }
  }
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
          'KYC:',
          '/api/kyc'
        );

        console.log(
          'Admin:',
          '/api/admin'
        );

        console.log(
          'Paystack Webhook:',
          '/api/paystack/webhook'
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
