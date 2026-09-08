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
const depositRoutes = require('./routes/deposit');
const bankRoutes = require('./routes/bankRoutes');

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
// MIDDLEWARE
// ============================================================

app.use(cors());

/*
 * JSON parser
 */
app.use(express.json());

// ============================================================
// PAYSTACK WEBHOOK
// ============================================================

/*
 * Paystack sends webhook events to this endpoint.
 *
 * The webhook controller verifies the
 * x-paystack-signature header before processing
 * any event.
 */

app.post(
  '/api/paystack/webhook',
  handlePaystackWebhook
);

// ============================================================
// API ROUTES
// ============================================================

// Authentication
app.use('/api/auth', authRoutes);

// Account
app.use('/api/account', accountRoutes);

// Bank transfers
app.use('/api/transfers', transferRoutes);

// Deposits
app.use('/api/deposits', depositRoutes);

// Banks
app.use('/api/banks', bankRoutes);

// ============================================================
// ROOT ROUTE
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
// HEALTH CHECK
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
// GENERAL API HEALTH
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
        await pool.query('SELECT NOW()');

      res.json({
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

      res.status(500).json({
        success: false,
        status: 'unhealthy',
        database: 'disconnected',
      });
    }
  }
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {
    console.error(
      'Server
