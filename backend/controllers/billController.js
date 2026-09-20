const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// SUPPORTED BILL PROVIDERS
// ============================================================

const ELECTRICITY_PROVIDERS = [
  'EKEDC',
  'IKEDC',
  'AEDC',
  'EEDC',
  'IBEDC',
  'JED',
  'KAEDCO',
  'KEDCO',
  'YEDC',
  'BEDC',
  'PHEDC',
  'APLE',
];

const TV_PROVIDERS = [
  'DSTV',
  'GOTV',
  'STARTIMES',
];

const INTERNET_PROVIDERS = [
  'Spectranet',
  'Smile',
  'MTN Internet',
];

// ============================================================
// CREATE REFERENCE
// ============================================================

const createReference = () => {
  return `ZBILL-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

// ============================================================
// VALIDATE AMOUNT
// ============================================================

const isValidAmount = (amount) => {
  const numericAmount = Number(amount);

  return (
    Number.isFinite(numericAmount) &&
    numericAmount > 0
  );
};

// ============================================================
// VALIDATE CUSTOMER / METER NUMBER
// ============================================================

const isValidCustomerNumber = (
  customerNumber
) => {
  if (!customerNumber) {
    return false;
  }

  const value =
    String(customerNumber).trim();

  return /^[A-Za-z0-9\-]{5,50}$/.test(
    value
  );
};

// ============================================================
// CREATE BILL PAYMENT
// ============================================================

const createBillPayment = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    // ----------------------------------------------------------
    // AUTHENTICATED USER
    // ----------------------------------------------------------

    const userId =
      req.user?.id ||
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    // ----------------------------------------------------------
    // REQUEST DATA
    // ----------------------------------------------------------

    const {
      bill_type,
      provider,
      customer_number,
      amount,
      meter_type,
    } = req.body;

    // ----------------------------------------------------------
    // REQUIRED FIELDS
    // ----------------------------------------------------------

    if (!bill_type) {
      return res.status(400).json({
        success: false,
        message:
          'Bill type is required.',
      });
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        message:
          'Provider is required.',
      });
    }

    if (!customer_number) {
      return res.status(400).json({
        success: false,
        message:
          'Customer or meter number is required.',
      });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount is required.',
      });
    }

    // ----------------------------------------------------------
    // NORMALIZE
    // ----------------------------------------------------------

    const normalizedBillType =
      String(bill_type)
        .trim()
        .toLowerCase();

    const normalizedProvider =
      String(provider).trim();

    const normalizedCustomerNumber =
      String(customer_number).trim();

    const normalizedMeterType =
      meter_type
        ? String(meter_type)
            .trim()
            .toLowerCase()
        : null;

    // ----------------------------------------------------------
    // VALIDATE BILL TYPE
    // ----------------------------------------------------------

    const supportedBillTypes = [
      'electricity',
      'tv',
      'internet',
      'other',
    ];

    if (
      !supportedBillTypes.includes(
        normalizedBillType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Unsupported bill type.',
      });
    }

    // ----------------------------------------------------------
    // VALIDATE AMOUNT
    // ----------------------------------------------------------

    if (!isValidAmount(amount)) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid amount.',
      });
    }

    const numericAmount =
      Number(amount);

    // ----------------------------------------------------------
    // TRANSACTION LIMIT
    // ----------------------------------------------------------

    if (
      numericAmount > 1000000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount exceeds the current transaction limit.',
      });
    }

    // ----------------------------------------------------------
    // ELECTRICITY VALIDATION
    // ----------------------------------------------------------

    if (
      normalizedBillType ===
      'electricity'
    ) {
      if (
        !ELECTRICITY_PROVIDERS.includes(
          normalizedProvider
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Unsupported electricity provider.',
        });
      }

      if (
        !normalizedMeterType ||
        ![
          'prepaid',
          'postpaid',
        ].includes(
          normalizedMeterType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Electricity meter type must be prepaid or postpaid.',
        });
      }
    }

    // ----------------------------------------------------------
    // TV VALIDATION
    // ----------------------------------------------------------

    if (
      normalizedBillType === 'tv'
    ) {
      if (
        !TV_PROVIDERS.includes(
          normalizedProvider
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Unsupported TV provider.',
        });
      }
    }

    // ----------------------------------------------------------
    // INTERNET VALIDATION
    // ----------------------------------------------------------

    if (
      normalizedBillType ===
      'internet'
    ) {
      if (
        !INTERNET_PROVIDERS.includes(
          normalizedProvider
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Unsupported internet provider.',
        });
      }
    }

    // ----------------------------------------------------------
    // CUSTOMER / METER NUMBER
    // ----------------------------------------------------------

    if (
      !isValidCustomerNumber(
        normalizedCustomerNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid customer or meter number.',
      });
    }

    // ----------------------------------------------------------
    // START DATABASE TRANSACTION
    // ----------------------------------------------------------

    await client.query(
      'BEGIN'
    );

    // ----------------------------------------------------------
    // FIND ACTIVE NGN ACCOUNT
    // ----------------------------------------------------------

    const accountResult =
      await client.query(
        `
          SELECT
            id,
            user_id,
            account_number,
            currency,
            balance,
            status
          FROM accounts
          WHERE user_id = $1
            AND currency = 'NGN'
            AND status = 'active'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        [userId]
      );

    if (
      accountResult.rows
        .length === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(404).json({
        success: false,
        message:
          'Active NGN account not found.',
      });
    }

    const account =
      accountResult.rows[0];

    // ----------------------------------------------------------
    // CHECK BALANCE
    // ----------------------------------------------------------

    const accountBalance =
      Number(account.balance);

    if (
      !Number.isFinite(
        accountBalance
      ) ||
      accountBalance <
        numericAmount
    ) {
      await client.query(
        'ROLLBACK'
      );

      return res.status(400).json({
        success: false,
        message:
          'Insufficient account balance.',
      });
    }

    // ----------------------------------------------------------
    // CREATE REFERENCE
    // ----------------------------------------------------------

    const reference =
      createReference();

    // ----------------------------------------------------------
    // FIND BILLER
    // ----------------------------------------------------------

    const billerResult =
      await client.query(
        `
          SELECT
            id,
            name,
            category,
            provider_code,
            is_active
          FROM billers
          WHERE category = $1
            AND is_active = true
          ORDER BY created_at ASC
          LIMIT 1
        `,
        [
          normalizedBillType ===
          'electricity'
            ? 'electricity'
            : normalizedBillType ===
              'tv'
            ? 'cable_tv'
            : normalizedBillType,
        ]
      );

    const biller =
      billerResult.rows[0] ||
      null;

    // ----------------------------------------------------------
    // CREATE PENDING PAYMENT
    // ----------------------------------------------------------

    const insertResult =
      await client.query(
        `
          INSERT INTO bill_payments (
            account_id,
            biller_id,
            category,
            biller_name,
            customer_reference,
            customer_name,
            amount,
            currency,
            reference,
            status,
            meter_type,
            meter_number,
            verification_status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            NULL,
            $6,
            'NGN',
            $7,
            'pending',
            $8,
            $9,
            'not_verified'
          )
          RETURNING
            id,
            account_id,
            biller_id,
            category,
            biller_name,
            customer_reference,
            amount,
            currency,
            reference,
            status,
            meter_type,
            meter_number,
            verification_status,
            created_at
        `,
        [
          account.id,

          biller
            ? biller.id
            : null,

          normalizedBillType,

          normalizedProvider,

          normalizedCustomerNumber,

          numericAmount,

          reference,

          normalizedBillType ===
          'electricity'
            ? normalizedMeterType
            : null,

          normalizedBillType ===
          'electricity'
            ? normalizedCustomerNumber
            : null,
        ]
      );

    const billPayment =
      insertResult.rows[0];

    // ----------------------------------------------------------
    // COMMIT
    // ----------------------------------------------------------

    await client.query(
      'COMMIT'
    );

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,

      test_mode: true,

      message:
        'Bill payment request created and is awaiting provider verification.',

      data: {
        id: billPayment.id,

        reference:
          billPayment.reference,

        bill_type:
          billPayment.category,

        provider:
          billPayment.biller_name,

        customer_number:
          billPayment.customer_reference,

        meter_type:
          billPayment.meter_type,

        meter_number:
          billPayment.meter_number,

        amount:
          Number(
            billPayment.amount
          ),

        currency:
          billPayment.currency,

        status:
          billPayment.status,

        verification_status:
          billPayment.verification_status,

        created_at:
          billPayment.created_at,
      },
    });
  } catch (error) {
    // ----------------------------------------------------------
    // ROLLBACK
    // ----------------------------------------------------------

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (
      rollbackError
    ) {
      console.error(
        'Bill payment rollback error:',
        rollbackError
      );
    }

    console.error(
      'Create bill payment error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to create bill payment request.',
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createBillPayment,
};
