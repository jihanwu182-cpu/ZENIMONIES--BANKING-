
const crypto = require('crypto');

// ============================================================
// VTPASS ELECTRICITY SERVICE
// ============================================================

const VTPASS_BASE_URL = (
  process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com'
).replace(/\/+$/, '');

const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const VTPASS_SECRET_KEY = process.env.VTPASS_SECRET_KEY;

const REQUEST_TIMEOUT_MS = 30000;

// ============================================================
// ELECTRICITY SERVICE IDS
// ============================================================

const ELECTRICITY_PROVIDERS = {
  EKEDC: {
    name: 'Eko Electricity',
    serviceID: 'eko-electric',
  },

  IKEDC: {
    name: 'Ikeja Electricity',
    serviceID: 'ikeja-electric',
  },

  AEDC: {
    name: 'Abuja Electricity',
    serviceID: 'abuja-electric',
  },

  EEDC: {
    name: 'Enugu Electricity',
    serviceID: 'enugu-electric',
  },

  IBEDC: {
    name: 'Ibadan Electricity',
    serviceID: 'ibadan-electric',
  },

  JED: {
    name: 'Jos Electricity',
    serviceID: 'jos-electric',
  },

  KAEDCO: {
    name: 'Kaduna Electricity',
    serviceID: 'kaduna-electric',
  },

  KEDCO: {
    name: 'Kano Electricity',
    serviceID: 'kano-electric',
  },

  BEDC: {
    name: 'Benin Electricity',
    serviceID: 'benin-electric',
  },

  PHED: {
    name: 'Port Harcourt Electricity',
    serviceID: 'portharcourt-electric',
  },

  APLE: {
    name: 'Aba Electricity',
    serviceID: 'aba-electric',
  },

  YEDC: {
    name: 'Yola Electricity',
    serviceID: 'yola-electric',
  },
};

// ============================================================
// CONFIGURATION
// ============================================================

function validateVTPassConfig() {
  const missing = [];

  if (!VTPASS_API_KEY) {
    missing.push('VTPASS_API_KEY');
  }

  if (!VTPASS_SECRET_KEY) {
    missing.push('VTPASS_SECRET_KEY');
  }

  if (!VTPASS_PUBLIC_KEY) {
    missing.push('VTPASS_PUBLIC_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing VTPass configuration: ${missing.join(', ')}`
    );
  }
}

// ============================================================
// REQUEST ID GENERATOR
// ============================================================

function generateElectricityRequestId() {
  const now = new Date();

  const timestamp = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(now)
    .reduce((result, part) => {
      if (part.type !== 'literal') {
        result[part.type] = part.value;
      }

      return result;
    }, {});

  const datePart =
    `${timestamp.year}${timestamp.month}${timestamp.day}`;

  const timePart =
    `${timestamp.hour}${timestamp.minute}`;

  const randomPart = crypto
    .randomBytes(8)
    .toString('hex')
    .toUpperCase();

  return `${datePart}${timePart}${randomPart}`;
}

// ============================================================
// PROVIDER NORMALIZATION
// ============================================================

function normalizeProvider(provider) {
  if (!provider) {
    throw new Error('Electricity provider is required.');
  }

  const normalized = String(provider)
    .trim()
    .toUpperCase();

  if (!ELECTRICITY_PROVIDERS[normalized]) {
    throw new Error(
      `Unsupported electricity provider: ${provider}`
    );
  }

  return normalized;
}

function getElectricityServiceId(provider) {
  const normalized = normalizeProvider(provider);

  return ELECTRICITY_PROVIDERS[normalized].serviceID;
}

// ============================================================
// METER TYPE NORMALIZATION
// ============================================================

function normalizeMeterType(meterType) {
  const normalized = String(meterType || '')
    .trim()
    .toLowerCase();

  if (!['prepaid', 'postpaid'].includes(normalized)) {
    throw new Error(
      'Meter type must be prepaid or postpaid.'
    );
  }

  return normalized;
}

// ============================================================
// VTPASS API REQUEST
// ============================================================

async function vtpassRequest(endpoint, payload, method = 'POST') {
  validateVTPassConfig();

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': VTPASS_API_KEY,
      'secret-key': VTPASS_SECRET_KEY,
    };

    if (method === 'GET') {
      headers['public-key'] = VTPASS_PUBLIC_KEY;
      delete headers['secret-key'];
    }

    const response = await fetch(
      `${VTPASS_BASE_URL}/api/${endpoint}`,
      {
        method,
        headers,
        ...(method === 'POST'
          ? { body: JSON.stringify(payload) }
          : {}),
        signal: controller.signal,
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      const error = new Error(
        'VTPass returned an invalid JSON response.'
      );

      error.httpStatus = response.status;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(
        data.response_description ||
        data.message ||
        `VTPass HTTP error: ${response.status}`
      );

      error.httpStatus = response.status;
      error.providerResponse = data;

      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(
        'VTPass request timed out. Transaction status must be checked.'
      );

      timeoutError.code = 'VTPASS_TIMEOUT';

      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// VERIFY ELECTRICITY METER
// ============================================================

async function verifyElectricityMeter({
  provider,
  meterNumber,
  meterType,
}) {
  const normalizedProvider = normalizeProvider(provider);
  const serviceID = getElectricityServiceId(normalizedProvider);
  const normalizedMeterType = normalizeMeterType(meterType);

  const billersCode = String(meterNumber || '').trim();

  if (!/^[a-zA-Z0-9-]{5,50}$/.test(billersCode)) {
    throw new Error('Invalid electricity meter number.');
  }

  const response = await vtpassRequest(
    'merchant-verify',
    {
      billersCode,
      serviceID,
      type: normalizedMeterType,
    }
  );

  return {
    provider: normalizedProvider,
    serviceID,
    meterNumber: billersCode,
    meterType: normalizedMeterType,
    code: String(response.code || ''),
    verified: String(response.code || '') === '000',
    customerName:
      response.content?.Customer_Name ||
      response.content?.customer_name ||
      response.content?.name ||
      null,
    customerAddress:
      response.content?.Address ||
      response.content?.address ||
      null,
    customerAccountType:
      response.content?.Customer_Account_Type ||
      null,
    minimumPurchaseAmount:
      response.content?.Min_Purchase_Amount ??
      response.content?.Minimum_Amount ??
      null,
    canVend:
      response.content?.Can_Vend ?? null,
    commissionDetails:
      response.content?.commission_details || null,
    rawResponse: response,
  };
}

// ============================================================
// PURCHASE ELECTRICITY
// ============================================================

async function purchaseElectricity({
  provider,
  meterNumber,
  meterType,
  amount,
  phone,
  requestId,
}) {
  const normalizedProvider = normalizeProvider(provider);
  const serviceID = getElectricityServiceId(normalizedProvider);
  const normalizedMeterType = normalizeMeterType(meterType);

  const billersCode = String(meterNumber || '').trim();
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const purchaseAmount = Number(amount);

  if (!/^[a-zA-Z0-9-]{5,50}$/.test(billersCode)) {
    throw new Error('Invalid electricity meter number.');
  }

  if (
    !Number.isFinite(purchaseAmount) ||
    purchaseAmount <= 0
  ) {
    throw new Error('Invalid electricity purchase amount.');
  }

  if (!/^0\d{10}$/.test(normalizedPhone)) {
    throw new Error('Invalid Nigerian phone number.');
  }

  if (!requestId || String(requestId).trim().length < 10) {
    throw new Error(
      'A valid, pre-generated VTPass request ID is required.'
    );
  }

  const response = await vtpassRequest('pay', {
    request_id: String(requestId),
    serviceID,
    billersCode,
    variation_code: normalizedMeterType,
    amount: purchaseAmount,
    phone: normalizedPhone,
  });

  return {
    provider: 'VTPASS',
    providerRequestId: String(requestId),
    providerTransactionId:
      response.content?.transactions?.transactionId ||
      null,
    code: String(response.code || ''),
    status:
      response.content?.transactions?.status ||
      null,
    responseDescription:
      response.response_description ||
      null,
    token:
      response.token ||
      response.purchased_code ||
      response.content?.transactions?.token ||
      null,
    units:
      response.units ||
      response.content?.transactions?.units ||
      null,
    customerName:
      response.customerName ||
      null,
    customerAddress:
      response.customerAddress ||
      null,
    commissionDetails:
      response.content?.transactions?.commission_details ||
      null,
    rawResponse: response,
  };
}

// ============================================================
// REQUERY ELECTRICITY TRANSACTION
// ============================================================

async function requeryElectricityTransaction(requestId) {
  if (!requestId || !String(requestId).trim()) {
    throw new Error('VTPass request ID is required.');
  }

  const response = await vtpassRequest('requery', {
    request_id: String(requestId).trim(),
  });

  return {
    provider: 'VTPASS',
    providerRequestId: String(requestId),
    providerTransactionId:
      response.content?.transactions?.transactionId ||
      null,
    code: String(response.code || ''),
    status:
      response.content?.transactions?.status ||
      null,
    responseDescription:
      response.response_description ||
      null,
    token:
      response.token ||
      response.purchased_code ||
      response.content?.transactions?.token ||
      null,
    units:
      response.units ||
      response.content?.transactions?.units ||
      null,
    rawResponse: response,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  ELECTRICITY_PROVIDERS,

  normalizeProvider,
  normalizeMeterType,

  getElectricityServiceId,

  generateElectricityRequestId,

  verifyElectricityMeter,
  purchaseElectricity,
  requeryElectricityTransaction,
};
