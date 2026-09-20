const crypto = require('crypto');

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
// HELPERS
// ============================================================

const createReference = () => {
  return `ZBILL-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;
};

const isValidAmount = (amount) => {
  const numericAmount = Number(amount);

  return (
    Number.isFinite(numericAmount) &&
    numericAmount > 0
  );
};

const isValidCustomerNumber = (customerNumber) => {
  if (!customerNumber) {
    return false;
  }

  const value = String(customerNumber).trim();

  // Basic validation for now.
  // The real provider API will perform the actual
  // meter/customer-number validation.
  return /^[A-Za-z0-9\-]{5,30}$/.test(value);
};

// ============================================================
// CREATE BILL PAYMENT
// ============================================================

const createBillPayment = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // AUTHENTICATED USER
    // ----------------------------------------------------------

    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
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
        message: 'Bill type is required.',
      });
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required.',
      });
    }

    if (!customer_number) {
      return res.status(400).json({
        success: false,
        message: 'Customer or meter number is required.',
      });
    }

    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({
        success: false,
        message: 'Amount is required.',
      });
    }

    // ----------------------------------------------------------
    // NORMALIZE VALUES
    // ----------------------------------------------------------

    const normalizedBillType = String(bill_type)
      .trim()
      .toLowerCase();

    const normalizedProvider = String(provider).trim();

    const normalizedCustomerNumber = String(customer_number).trim();

    // ----------------------------------------------------------
    // VALIDATE AMOUNT
    // ----------------------------------------------------------

    if (!isValidAmount(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid amount.',
      });
    }

    const numericAmount = Number(amount);

    // ----------------------------------------------------------
    // VALIDATE BILL TYPE
    // ----------------------------------------------------------

    const supportedBillTypes = [
      'electricity',
      'tv',
      'internet',
      'other',
    ];

    if (!supportedBillTypes.includes(normalizedBillType)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported bill type.',
      });
    }

    // ----------------------------------------------------------
    // ELECTRICITY VALIDATION
    // ----------------------------------------------------------

    if (normalizedBillType === 'electricity') {
      if (!ELECTRICITY_PROVIDERS.includes(normalizedProvider)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported electricity provider.',
        });
      }

      if (
        meter_type &&
        !['prepaid', 'postpaid'].includes(
          String(meter_type).trim().toLowerCase()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Meter type must be prepaid or postpaid.',
        });
      }
    }

    // ----------------------------------------------------------
    // TV VALIDATION
    // ----------------------------------------------------------

    if (normalizedBillType === 'tv') {
      if (!TV_PROVIDERS.includes(normalizedProvider)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported TV provider.',
        });
      }
    }

    // ----------------------------------------------------------
    // INTERNET VALIDATION
    // ----------------------------------------------------------

    if (normalizedBillType === 'internet') {
      if (!INTERNET_PROVIDERS.includes(normalizedProvider)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported internet provider.',
        });
      }
    }

    // ----------------------------------------------------------
    // CUSTOMER / METER NUMBER VALIDATION
    // ----------------------------------------------------------

    if (!isValidCustomerNumber(normalizedCustomerNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid customer or meter number.',
      });
    }

    // ----------------------------------------------------------
    // AMOUNT LIMIT
    // ----------------------------------------------------------

    // Safety limit for the initial test implementation.
    // This is NOT the final production transaction limit.
    if (numericAmount > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Amount exceeds the current test limit.',
      });
    }

    // ----------------------------------------------------------
    // CREATE TEST REFERENCE
    // ----------------------------------------------------------

    const reference = createReference();

    // ----------------------------------------------------------
    // TEST MODE
    // ----------------------------------------------------------

    /*
      IMPORTANT:

      This controller does NOT:
      - deduct money
      - contact an electricity company
      - generate an electricity token
      - mark a real bill as paid

      We will connect a legitimate bill-payment provider later.
    */

    return res.status(200).json({
      success: true,
      test_mode: true,
      message:
        'Bill request validated successfully. Payment provider integration is not connected yet.',
      data: {
        reference,
        user_id: userId,
        bill_type: normalizedBillType,
        provider: normalizedProvider,
        customer_number: normalizedCustomerNumber,
        meter_type:
          normalizedBillType === 'electricity'
            ? String(meter_type || '').trim().toLowerCase() || null
            : null,
        amount: numericAmount,
        currency: 'NGN',
        status: 'pending_provider',
      },
    });
  } catch (error) {
    console.error('Create bill payment error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to process bill request.',
    });
  }
};

module.exports = {
  createBillPayment,
};
