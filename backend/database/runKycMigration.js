'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Runs the additive, re-runnable ZENIMONIES KYC migration during startup.
 * The SQL file is kept beside this module so it is easy to review and deploy.
 */
const runKycMigration = async (pool) => {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('KYC migration requires a valid PostgreSQL pool.');
  }

  const migrationPath = path.join(
    __dirname,
    'ZENIMONIES_KYC_CONSOLIDATED_MIGRATION.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf8');

  if (!sql.trim()) {
    throw new Error('KYC migration SQL file is empty.');
  }

  await pool.query(sql);
  console.log('KYC database migration completed successfully.');
};

module.exports = { runKycMigration };
