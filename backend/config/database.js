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
    '../database/schema.sql'
  );

  try {
    console.log('Initializing database...');
    console.log(`Schema path: ${schemaPath}`);

    if (!fs.existsSync(schemaPath)) {
      throw new Error(
        `Schema file not found at: ${schemaPath}`
      );
    }

    const schema = fs.readFileSync(
      schemaPath,
      'utf8'
    );

    // Run the main database schema
    await pool.query(schema);

    console.log(
      'Database schema initialized successfully'
    );

    // ============================================================
    // EXISTING DATABASE MIGRATION
    // ============================================================

    console.log(
      'Checking users.phone_verified column...'
    );

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_verified
      BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log(
      'users.phone_verified migration completed'
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
module.exports.initializeDatabase =
  initializeDatabase;
