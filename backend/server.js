require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Zenimonies Banking API is running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy'
  });
});

app.get('/api/health/database', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(500).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Zenimonies Banking API running on port ${PORT}`);
});
