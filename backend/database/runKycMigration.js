
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Runs the consolidated KYC migration during backend startup.
 */
const runKycMigration = async (pool) => {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error(
      'KYC migration requires a valid PostgreSQL pool.'
    );
  }

  const migrationPath = path.join(
    __dirname,
    'migrations',
    'ZENIMONIES_KYC_CONSOLIDATED_MIGRATION.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    throw new Error(
      'KYC migration SQL file not found: ' + migrationPath
    );
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  if (!sql.trim()) {
    throw new Error('KYC migration SQL file is empty.');
  }

  await pool.query(sql);

  console.log(
    'ZENIMONIES KYC database migration completed successfully.'
  );
};

module.exports = { runKycMigration };
