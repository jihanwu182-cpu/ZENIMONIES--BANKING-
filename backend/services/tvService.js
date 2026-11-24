const https = require('https');

const VTpassBaseURL =
  process.env.VTPASS_BASE_URL ||
  'https://sandbox.vtpass.com';

const VTpassApiKey =
  process.env.VTPASS_API_KEY;

const VTpassPublicKey =
  process.env.VTPASS_PUBLIC_KEY;

const VTpassSecretKey =
  process.env.VTPASS_SECRET_KEY;


// ============================================================
// TV SERVICE IDs
// ============================================================

const TV_SERVICE_IDS = {
  DSTV: 'dstv',
  GOTV: 'gotv',
  STARTIMES: 'startimes',
};


// ============================================================
// VALIDATE CONFIGURATION
// ============================================================

const validateConfig = () => {
  const missing = [];

  if (!VTpassApiKey) {
    missing.push('VTPASS_API_KEY');
  }

  if (!VTpassPublicKey) {
    missing.push('VTPASS_PUBLIC_KEY');
  }

  if (!VTpassSecretKey) {
    missing.push('VTPASS_SECRET_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `VTpass configuration is incomplete: ${missing.join(', ')}`
    );
  }
};


// ============================================================
// NORMALIZE TV PROVIDER
// ============================================================

const normalizeProvider = (provider) => {
  if (!provider) {
    return '';
  }

  const value = String(provider)
    .trim()
    .toUpperCase();

  if (
    value === 'DSTV' ||
    value === 'DStv'.toUpperCase()
  ) {
    return 'DSTV';
  }

  if (
    value === 'GOTV' ||
    value === 'GOtv'.toUpperCase()
  ) {
    return 'GOTV';
  }

  if (
    value === 'STARTIMES' ||
    value === 'STARTIMES'.toUpperCase()
  ) {
    return 'STARTIMES';
  }

  return '';
};


// ============================================================
// GET SERVICE ID
// ============================================================

const getTVServiceId = (provider) => {
  const normalizedProvider =
    normalizeProvider(provider);

  const serviceID =
    TV_SERVICE_IDS[normalizedProvider];

  if (!serviceID) {
    throw new Error(
      'Unsupported TV provider.'
    );
  }

  return serviceID;
};


// ============================================================
// GENERATE VTpass REQUEST ID
// ============================================================

const generateRequestId = () => {
  const now = new Date();

  const lagosTime = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }
  ).formatToParts(now);

  const values = {};

  lagosTime.forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  const timestamp =
    `${values.year}` +
    `${values.month}` +
    `${values.day}` +
    `${values.hour}` +
    `${values.minute}`;

  const randomPart =
    Math.random()
      .toString(16)
      .slice(2)
      .toUpperCase();

  return `${timestamp}${randomPart}`;
};


// ============================================================
// VTpass HTTPS REQUEST
// ============================================================

const vtpassRequest = ({
  method = 'GET',
  path,
  body = null,
}) => {
  return new Promise((resolve, reject) => {
    try {
      validateConfig();

      const url =
        new URL(
          path,
          VTpassBaseURL
        );

      const payload =
        body
          ? JSON.stringify(body)
          : null;

      const headers = {
        'api-key': VTpassApiKey,
        'public-key': VTpassPublicKey,
        Accept: 'application/json',
      };

      if (method !== 'GET') {
        headers['Content-Type'] =
          'application/json';

        headers['secret-key'] =
          VTpassSecretKey;

        headers['Content-Length'] =
          Buffer.byteLength(payload || '');
      }

      const request =
        https.request(
          {
            hostname: url.hostname,
            port:
              url.port ||
              (url.protocol === 'https:'
                ? 443
                : 80),
            path:
              `${url.pathname}${url.search}`,
            method,
            headers,
          },
          (response) => {
            let data = '';

            response.on(
              'data',
              (chunk) => {
                data += chunk;
              }
            );

            response.on(
              'end',
              () => {
                let parsed;

                try {
                  parsed =
                    data
                      ? JSON.parse(data)
                      : null;
                } catch (error) {
                  return reject(
                    new Error(
                      'VTpass returned an invalid JSON response.'
                    )
                  );
                }

                resolve({
                  httpStatus:
                    response.statusCode,
                  data: parsed,
                });
              }
            );
          }
        );

      request.setTimeout(
        30000,
        () => {
          request.destroy(
            new Error(
              'VTpass request timed out.'
            )
          );
        }
      );

      request.on(
        'error',
        (error) => {
          reject(error);
        }
      );

      if (payload) {
        request.write(payload);
      }

      request.end();
    } catch (error) {
      reject(error);
    }
  });
};


// ============================================================
// GET TV PLANS
// ============================================================

const getTVPlans = async (
  provider
) => {
  const serviceID =
    getTVServiceId(provider);

  const result =
    await vtpassRequest({
      method: 'GET',
      path:
        `/api/service-variations?serviceID=${encodeURIComponent(
          serviceID
        )}`,
    });

  const response =
    result.data;

  if (
    !response ||
    !Array.isArray(
      response?.content?.variations
    )
  ) {
    throw new Error(
      'VTpass did not return TV plans.'
    );
  }

  return {
    provider:
      normalizeProvider(provider),

    serviceID,

    plans:
      response.content.variations.map(
        (variation) => ({
          variation_code:
            variation.variation_code,

          name:
            variation.name,

          amount:
            Number(
              variation.variation_amount
            ),

          fixedPrice:
            variation.fixedPrice,

          serviceID,
        })
      ),
  };
};


// ============================================================
// VERIFY SMARTCARD / IUC
// ============================================================

const verifyTVAccount = async ({
  provider,
  billersCode,
}) => {
  const serviceID =
    getTVServiceId(provider);

  const cleanBillersCode =
    String(billersCode || '')
      .replace(/\D/g, '')
      .trim();

  if (!cleanBillersCode) {
    throw new Error(
      'Smartcard or IUC number is required.'
    );
  }

  const result =
    await vtpassRequest({
      method: 'POST',
      path:
        '/api/merchant-verify',

      body: {
        billersCode:
          cleanBillersCode,

        serviceID,
      },
    });

  return {
    provider:
      normalizeProvider(provider),

    serviceID,

    billersCode:
      cleanBillersCode,

    httpStatus:
      result.httpStatus,

    response:
      result.data,
  };
};


// ============================================================
// PURCHASE TV SUBSCRIPTION
// ============================================================

const purchaseTV = async ({
  provider,
  billersCode,
  variationCode,
  amount,
  phone,
  subscriptionType = 'change',
  quantity = 1,
}) => {
  const serviceID =
    getTVServiceId(provider);

  const cleanBillersCode =
    String(billersCode || '')
      .replace(/\D/g, '')
      .trim();

  const cleanPhone =
    String(phone || '')
      .replace(/\D/g, '')
      .trim();

  const numericAmount =
    Number(amount);

  if (!cleanBillersCode) {
    throw new Error(
      'Smartcard or IUC number is required.'
    );
  }

  if (!variationCode) {
    throw new Error(
      'TV subscription plan is required.'
    );
  }

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'A valid TV subscription amount is required.'
    );
  }

  if (!cleanPhone) {
    throw new Error(
      'Customer phone number is required.'
    );
  }

  const requestId =
    generateRequestId();

  const result =
    await vtpassRequest({
      method: 'POST',
      path: '/api/pay',

      body: {
        request_id:
          requestId,

        serviceID,

        billersCode:
          cleanBillersCode,

        variation_code:
          variationCode,

        amount:
          numericAmount,

        phone:
          cleanPhone,

        subscription_type:
          subscriptionType,

        quantity:
          Number(quantity) || 1,
      },
    });

  return {
    requestId,

    provider:
      normalizeProvider(provider),

    serviceID,

    billersCode:
      cleanBillersCode,

    httpStatus:
      result.httpStatus,

    response:
      result.data,
  };
};


// ============================================================
// REQUERY TV TRANSACTION
// ============================================================

const requeryTVTransaction = async ({
  requestId,
}) => {
  if (!requestId) {
    throw new Error(
      'VTpass request ID is required.'
    );
  }

  const result =
    await vtpassRequest({
      method: 'POST',
      path: '/api/requery',

      body: {
        request_id:
          requestId,
      },
    });

  return {
    requestId,

    httpStatus:
      result.httpStatus,

    response:
      result.data,
  };
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  TV_SERVICE_IDS,

  normalizeProvider,

  getTVServiceId,

  generateRequestId,

  getTVPlans,

  verifyTVAccount,

  purchaseTV,

  requeryTVTransaction,
};
