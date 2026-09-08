const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

const initializeDatabase = async () => {
  const schemaPath = path.join(
    __dirname,
    const schemaPath = path.join(
  __dirname,
  '../database/schema.sql'
  );

  try {
    console.log('Initializing database...');

    const schema = fs.readFileSync(
      schemaPath,
      'utf8'
    );

    await pool.query(schema);

    console.log(
      'Database schema initialized successfully'
    );
  } catch (error) {
    console.error(
      'Database initialization failed:',
      error
    );

    throw error;
  }
};

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;
