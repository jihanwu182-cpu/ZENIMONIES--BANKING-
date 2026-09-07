require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pool = require('./config/database');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const transferRoutes = require('./routes/transfer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication
app.use('/api/auth', authRoutes);

// Account
app.use('/api/account', accountRoutes);

// Bank transfers
app.use('/api/transfers', transferRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Zenimonies Banking API is running',
  });
});

// API home
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Zenimonies Banking API is running',
  });
});

// Health check
app.get('/health.json', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    platform: 'Zenimonies',
    timestamp: new Date().toISOString(),
  });
});

// General API health
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
  });
});

// Database health
app.get('/api/health/database', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

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
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `Zenimonies Banking API running on port ${PORT}`
  );
});
