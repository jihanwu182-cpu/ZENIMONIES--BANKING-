const fs = require('fs');
const path = require('path');

// ============================================================
// ZENIMONIES BANKING
// REVENUE MIGRATION SAFETY CHECK
//
// This script only checks the migration file.
// It does not connect to the database.
// It does not execute SQL.
// It does not modify production data.
// ============================================================

const migrationPath = path.join(
  __dirname,
  '..',
  'database',
  'migrations',
  '008_revenue_ledger.sql'
);

function checkRevenueMigration() {
  console.log('');
  console.log('==============================================');
  console.log('ZENIMONIES REVENUE MIGRATION SAFETY CHECK');
  console.log('==============================================');

  if (!fs.existsSync(migrationPath)) {
    console.error('ERROR: Migration file not found.');
    console.error(migrationPath);
    process.exitCode = 1;
    return;
  }

  let sql;

  try {
    sql = fs.readFileSync(migrationPath, 'utf8');
  } catch (error) {
    console.error('ERROR: Cannot read migration file.');
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const checks = [
    {
      name: 'Migration review warning',
      passed: /REVIEW DRAFT/i.test(sql)
    },
    {
      name: 'Revenue partners table',
      passed: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?revenue_partners\b/i.test(sql)
    },
    {
      name: 'Revenue partner terms table',
      passed: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?revenue_partner_terms\b/i.test(sql)
    },
    {
      name: 'Revenue ledger table',
      passed: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?revenue_ledger\b/i.test(sql)
    },
    {
      name: 'Revenue settlements table',
      passed: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?revenue_settlements\b/i.test(sql)
    },
    {
      name: 'Company revenue movements table',
      passed: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?company_revenue_movements\b/i.test(sql)
    },
    {
      name: 'Revenue audit events table',
      passed: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?revenue_audit_events\b/i.test(sql)
    },
    {
      name: 'Audit actor UUID validation',
      passed: /actor_text\s*~\*/i.test(sql)
    },
    {
      name: 'BEGIN transaction statement',
      passed: /^\s*BEGIN\s*;/im.test(sql)
    },
    {
      name: 'COMMIT transaction statement',
      passed: /^\s*COMMIT\s*;/im.test(sql)
    }
  ];

  let failed = false;

  console.log('');
  console.log('Checking migration file...');
  console.log('');

  for (const check of checks) {
    if (check.passed) {
      console.log('PASS: ' + check.name);
    } else {
      console.log('FAIL: ' + check.name);
      failed = true;
    }
  }

  console.log('');
  console.log('==============================================');
  console.log('SAFETY RESULT');
  console.log('==============================================');
  console.log('Database connection: NOT USED');
  console.log('SQL execution: NONE');
  console.log('Database changes: NONE');
  console.log('');

  if (failed) {
    console.error('RESULT: Some checks failed.');
    console.error('Do not apply the migration.');
    process.exitCode = 1;
    return;
  }

  console.log('RESULT: All static checks passed.');
  console.log(
    'WARNING: This does not prove the SQL is valid or production-safe.'
  );
  console.log(
    'The migration must still be reviewed and tested before use.'
  );
}

try {
  checkRevenueMigration();
} catch (error) {
  console.error('Unexpected safety-check error:', error.message);
  process.exitCode = 1;
}
