const runInternalTransferReferenceMigration = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Allow sender and recipient ledger entries to share
    // the same internal transfer reference.
    await client.query(`
      ALTER TABLE transactions
      DROP CONSTRAINT IF EXISTS transactions_reference_key;
    `);

    await client.query('COMMIT');

    console.log(
      'Internal transfer reference migration completed successfully.'
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'Internal transfer reference migration failed:',
      error
    );
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  runInternalTransferReferenceMigration,
};
