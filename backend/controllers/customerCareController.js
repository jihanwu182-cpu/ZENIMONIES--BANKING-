// ============================================================
// CUSTOMER CARE — SECURE TRANSACTION INVESTIGATION
// ============================================================
// IMPORTANT:
// Customer Care receives ONLY data from the secure database
// views.
//
// NEVER return:
// - full account number
// - account balance
// - available balance
// - ledger balance
// - balance_before
// - balance_after
// - PIN
// - password
// - OTP
// - session ID
// ============================================================

async function investigateTransaction(req, res) {
  try {
    const reference = String(req.query.reference || '').trim();

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required',
      });
    }

    // ----------------------------------------------------------
    // 1. SEARCH SECURE TRANSACTION VIEW
    // ----------------------------------------------------------

    const transactionResult = await pool.query(
      `
      SELECT
        transaction_id,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        kyc_status,
        masked_account_number,

        transaction_reference,
        transaction_type,
        transaction_amount,
        transaction_currency,
        transaction_description,
        transaction_status,
        transaction_created_at,

        bank_transfer_id,
        recipient_name,
        masked_recipient_account_number,
        recipient_bank_name,
        recipient_bank_code,
        bank_transfer_status,
        provider_reference,
        failure_reason,
        transfer_created_at,
        transfer_completed_at

      FROM agent_transactions_view

      WHERE
        transaction_reference = $1
        OR provider_reference = $1

      ORDER BY transaction_created_at DESC

      LIMIT 1
      `,
      [reference]
    );

    // ----------------------------------------------------------
    // 2. IF NO LEDGER TRANSACTION, SEARCH BANK TRANSFER VIEW
    // ----------------------------------------------------------

    let transaction = transactionResult.rows[0] || null;

    let bankTransfer = null;

    if (!transaction) {
      const transferResult = await pool.query(
        `
        SELECT
          bank_transfer_id,
          customer_id,
          customer_name,
          customer_email,
          customer_phone,
          kyc_status,
          masked_account_number,

          transaction_reference,
          provider_reference,

          recipient_name,
          masked_recipient_account_number,
          recipient_bank_name,
          recipient_bank_code,

          amount,
          currency,
          narration,
          status,
          failure_reason,
          created_at,
          completed_at

        FROM agent_bank_transfers_view

        WHERE
          transaction_reference = $1
          OR provider_reference = $1

        ORDER BY created_at DESC

        LIMIT 1
        `,
        [reference]
      );

      bankTransfer = transferResult.rows[0] || null;
    }

    // ----------------------------------------------------------
    // 3. NOTHING FOUND
    // ----------------------------------------------------------

    if (!transaction && !bankTransfer) {
      return res.status(404).json({
        success: false,
        message: 'Transaction could not be found',
      });
    }

    // ----------------------------------------------------------
    // 4. NORMALIZE INFORMATION
    // ----------------------------------------------------------

    const source = transaction || bankTransfer;

    const status =
      transaction?.transaction_status ||
      transaction?.bank_transfer_status ||
      bankTransfer?.status ||
      'unknown';

    const amount =
      transaction?.transaction_amount ??
      bankTransfer?.amount ??
      null;

    const currency =
      transaction?.transaction_currency ||
      bankTransfer?.currency ||
      'NGN';

    const transactionReference =
      transaction?.transaction_reference ||
      bankTransfer?.transaction_reference ||
      reference;

    // ----------------------------------------------------------
    // 5. BUILD READ-ONLY TRANSACTION FLOW
    // ----------------------------------------------------------

    const flow = [
      {
        step: 'Transfer initiated',
        status: 'completed',
      },
    ];

    if (transaction) {
      flow.push({
        step: 'Account debit recorded',
        status: 'completed',
      });
    } else {
      flow.push({
        step: 'Account debit record',
        status: 'not_available',
      });
    }

    if (status === 'failed') {
      flow.push({
        step: 'Bank transfer submitted',
        status: 'completed',
      });

      flow.push({
        step: 'Interbank processing',
        status: 'failed',
      });

      flow.push({
        step: 'Recipient credit',
        status: 'failed',
      });
    } else if (status === 'completed' || status === 'successful') {
      flow.push({
        step: 'Bank transfer submitted',
        status: 'completed',
      });

      flow.push({
        step: 'Interbank processing',
        status: 'completed',
      });

      flow.push({
        step: 'Recipient credit',
        status: 'completed',
      });
    } else {
      flow.push({
        step: 'Bank transfer submitted',
        status: 'completed',
      });

      flow.push({
        step: 'Interbank processing',
        status: 'processing',
      });

      flow.push({
        step: 'Recipient credit',
        status: 'pending',
      });
    }

    // ----------------------------------------------------------
    // 6. SECURE CUSTOMER CARE RESPONSE
    // ----------------------------------------------------------
    // Notice:
    //
    // There is NO:
    //   balance
    //   available_balance
    //   balance_before
    //   balance_after
    //   full account number
    //
    // anywhere in this response.
    // ----------------------------------------------------------

    return res.json({
      success: true,

      transaction: {
        reference: transactionReference,

        type:
          transaction?.transaction_type ||
          'bank_transfer',

        amount,
        currency,

        status,

        description:
          transaction?.transaction_description ||
          bankTransfer?.narration ||
          null,

        created_at:
          transaction?.transaction_created_at ||
          bankTransfer?.created_at ||
          null,

        provider_reference:
          transaction?.provider_reference ||
          bankTransfer?.provider_reference ||
          null,

        failure_reason:
          transaction?.failure_reason ||
          bankTransfer?.failure_reason ||
          null,

        completed_at:
          transaction?.transfer_completed_at ||
          bankTransfer?.completed_at ||
          null,
      },

      customer: {
        id: source.customer_id,
        full_name: source.customer_name,
        email: source.customer_email,
        phone: source.customer_phone,
        kyc_status: source.kyc_status,

        // MASKED ONLY
        account_number: source.masked_account_number,
      },

      recipient: {
        name:
          transaction?.recipient_name ||
          bankTransfer?.recipient_name ||
          null,

        account_number:
          transaction?.masked_recipient_account_number ||
          bankTransfer?.masked_recipient_account_number ||
          null,

        bank_name:
          transaction?.recipient_bank_name ||
          bankTransfer?.recipient_bank_name ||
          null,

        bank_code:
          transaction?.recipient_bank_code ||
          bankTransfer?.recipient_bank_code ||
          null,
      },

      flow,

      read_only: true,
    });
  } catch (error) {
    console.error(
      'Customer Care transaction investigation error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to investigate transaction',
    });
  }
}
