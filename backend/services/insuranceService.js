const crypto = require('crypto');

// ============================================================
// ZENIMONIES BANKING
// INSURANCE SERVICE
// VTpass Integration
// ============================================================

const VTPASS_BASE_URL =
  process.env.VTPASS_BASE_URL ||
  'https://sandbox.vtpass.com';

// ============================================================
// SERVICE IDS
// ============================================================

const INSURANCE_SERVICE_IDS = {
  MOTOR: 'ui-insure',
  PERSONAL_ACCIDENT:
    'personal-accident-insurance',
};

// ============================================================
// VTpass AUTHENTICATION
// ============================================================
//
// VTpass REST API:
//
// GET  -> api-key + public-key
// POST -> api-key + secret-key
//
// IMPORTANT:
// Do NOT use Basic Authentication here.
//

const getVtpassHeaders = (
  method = 'GET'
) => {
  const apiKey =
    process.env.VTPASS_API_KEY;

  const publicKey =
    process.env.VTPASS_PUBLIC_KEY;

  const secretKey =
    process.env.VTPASS_SECRET_KEY;

  if (!apiKey) {
    throw new Error(
      'VTPASS_API_KEY is not configured.'
    );
  }

  const normalizedMethod =
    String(method || 'GET')
      .trim()
      .toUpperCase();

  const headers = {
    'Content-Type':
      'application/json',

    Accept:
      'application/json',

    'api-key':
      apiKey,
  };

  if (
    normalizedMethod === 'GET'
  ) {
    if (!publicKey) {
      throw new Error(
        'VTPASS_PUBLIC_KEY is not configured.'
      );
    }

    headers['public-key'] =
      publicKey;
  } else {
    if (!secretKey) {
      throw new Error(
        'VTPASS_SECRET_KEY is not configured.'
      );
    }

    headers['secret-key'] =
      secretKey;
  }

  return headers;
};

// ============================================================
// REQUEST ID
// ============================================================

const generateRequestId = () => {
  const now = new Date();

  const lagosTime =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          'Africa/Lagos',

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).formatToParts(now);

  const getPart = (
    type
  ) =>
    lagosTime.find(
      (part) =>
        part.type === type
    )?.value || '';

  const year =
    getPart('year');

  const month =
    getPart('month');

  const day =
    getPart('day');

  const hour =
    getPart('hour');

  const minute =
    getPart('minute');

  const randomPart =
    crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase();

  return `${year}${month}${day}${hour}${minute}${randomPart}`;
};

// ============================================================
// NORMALIZE PROVIDER STATUS
// ============================================================
//
// VTpass code 000 means the transaction was processed,
// but the actual transaction state is found in:
//
// content.transactions.status
//
// Examples:
//
// initiated
// pending
// delivered
//
// We normalize these into our internal statuses.
//

const normalizeProviderStatus = (
  data
) => {
  const transactionStatus =
    String(
      data?.content
        ?.transactions
        ?.status ||
        ''
    )
      .trim()
      .toLowerCase();

  const responseCode =
    String(
      data?.code ||
        data?.response_code ||
        ''
    )
      .trim();

  // ==========================================================
  // DEFINITELY SUCCESSFUL
  // ==========================================================

  if (
    transactionStatus ===
      'delivered' ||
    transactionStatus ===
      'successful' ||
    transactionStatus ===
      'success' ||
    transactionStatus ===
      'completed'
  ) {
    return 'successful';
  }

  // ==========================================================
  // STILL PROCESSING
  // ==========================================================

  if (
    transactionStatus ===
      'pending' ||
    transactionStatus ===
      'initiated' ||
    transactionStatus ===
      'processing' ||
    responseCode === '099' ||
    responseCode === '089'
  ) {
    return 'pending';
  }

  // ==========================================================
  // PROVIDER FAILED
  // ==========================================================

  if (
    responseCode === '016' ||
    responseCode === '091' ||
    responseCode === '010' ||
    responseCode === '011' ||
    responseCode === '012' ||
    responseCode === '013' ||
    responseCode === '014' ||
    responseCode === '015' ||
    responseCode === '017' ||
    responseCode === '018' ||
    responseCode === '032' ||
    responseCode === '034' ||
    responseCode === '035' ||
    responseCode === '083'
  ) {
    return 'failed';
  }

  // ==========================================================
  // CODE 000 WITHOUT A FINAL STATUS
  //
  // VTpass says code 000 means processed.
  // If no final transaction status is available,
  // do NOT prematurely mark it successful.
  // Treat it as pending.
  // ==========================================================

  if (
    responseCode === '000'
  ) {
    return 'pending';
  }

  return 'failed';
};

// ============================================================
// SAFE JSON REQUEST
// ============================================================

const vtpassRequest = async (
  endpoint,
  options = {}
) => {
  const method =
    String(
      options?.method ||
        'GET'
    )
      .trim()
      .toUpperCase();

  const response =
    await fetch(
      `${VTPASS_BASE_URL}${endpoint}`,
      {
        ...options,

        headers: {
          ...getVtpassHeaders(
            method
          ),

          ...(options.headers ||
            {}),
        },
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    data = {
      response_description:
        text ||
        'Invalid response from VTpass.',
    };
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.response_description ||
          data?.message ||
          `VTpass request failed with status ${response.status}.`
      );

    error.status =
      response.status;

    error.response =
      data;

    throw error;
  }

  return data;
};

// ============================================================
// NORMALIZE VTpass ARRAY RESPONSE
// ============================================================

const extractArray = (
  response,
  possibleKeys = []
) => {
  // Response itself is an array.
  if (
    Array.isArray(response)
  ) {
    return response;
  }

  // Standard VTpass format.
  if (
    Array.isArray(
      response?.content
    )
  ) {
    return response.content;
  }

  // Current sandbox insurance format.
  if (
    Array.isArray(
      response?.content?.original
    )
  ) {
    return response.content.original;
  }

  // Some responses may use data.
  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  // Some responses may use data.original.
  if (
    Array.isArray(
      response?.data?.original
    )
  ) {
    return response.data.original;
  }

  // Named arrays.
  for (
    const key of possibleKeys
  ) {
    if (
      Array.isArray(
        response?.content?.[key]
      )
    ) {
      return response.content[key];
    }

    if (
      Array.isArray(
        response?.content
          ?.original?.[key]
      )
    ) {
      return response.content.original[
        key
      ];
    }

    if (
      Array.isArray(
        response?.data?.[key]
      )
    ) {
      return response.data[key];
    }

    if (
      Array.isArray(
        response?.data
          ?.original?.[key]
      )
    ) {
      return response.data.original[
        key
      ];
    }

    if (
      Array.isArray(
        response?.[key]
      )
    ) {
      return response[key];
    }
  }

  return [];
};

// ============================================================
// GET INSURANCE PLANS
// ============================================================

const getInsurancePlans =
  async (
    serviceID
  ) => {
    if (
      !Object.values(
        INSURANCE_SERVICE_IDS
      ).includes(
        serviceID
      )
    ) {
      throw new Error(
        'Unsupported insurance service.'
      );
    }

    const data =
      await vtpassRequest(
        `/api/service-variations?serviceID=${encodeURIComponent(
          serviceID
        )}`,
        {
          method: 'GET',
        }
      );

    const variations =
      extractArray(
        data,
        [
          'variations',
          'varations',
        ]
      );

    return {
      responseCode:
        data?.code ||
        null,

      responseDescription:
        data?.response_description ||
        null,

      content: {
        serviceID,
        variations,
      },

      raw:
        data,
    };
  };

// ============================================================
// GET MOTOR INSURANCE OPTIONS
// ============================================================

const getMotorInsuranceOptions =
  async () => {
    const [
      colors,
      engineCapacities,
      states,
      brands,
    ] =
      await Promise.all([
        vtpassRequest(
          '/api/universal-insurance/options/color',
          {
            method:
              'GET',
          }
        ),

        vtpassRequest(
          '/api/universal-insurance/options/engine-capacity',
          {
            method:
              'GET',
          }
        ),

        vtpassRequest(
          '/api/universal-insurance/options/state',
          {
            method:
              'GET',
          }
        ),

        vtpassRequest(
          '/api/universal-insurance/options/brand',
          {
            method:
              'GET',
          }
        ),
      ]);

    const normalizedColors =
      extractArray(
        colors
      );

    const normalizedEngineCapacities =
      extractArray(
        engineCapacities
      );

    const normalizedStates =
      extractArray(
        states
      );

    const normalizedBrands =
      extractArray(
        brands
      );

    console.log(
      'ZENIMONIES INSURANCE OPTIONS:',
      {
        colors:
          normalizedColors.length,

        engineCapacities:
          normalizedEngineCapacities.length,

        states:
          normalizedStates.length,

        brands:
          normalizedBrands.length,
      }
    );

    const deltaState =
      normalizedStates.find(
        (state) =>
          String(
            state?.StateName ||
              ''
          ).toLowerCase() ===
          'delta'
      );

    if (deltaState) {
      console.log(
        'ZENIMONIES DELTA STATE FROM VTpass:',
        JSON.stringify(
          deltaState,
          null,
          2
        )
      );
    }

    return {
      colors:
        normalizedColors,

      engineCapacities:
        normalizedEngineCapacities,

      states:
        normalizedStates,

      brands:
        normalizedBrands,
    };
  };

// ============================================================
// GET LOCAL GOVERNMENT AREAS
// ============================================================

const getMotorInsuranceLgas =
  async (
    stateCode
  ) => {
    if (!stateCode) {
      throw new Error(
        'State code is required.'
      );
    }

    const cleanStateCode =
      String(
        stateCode
      ).trim();

    const endpoint =
      `/api/universal-insurance/options/lga/${encodeURIComponent(
        cleanStateCode
      )}`;

    console.log(
      '============================================================'
    );

    console.log(
      'ZENIMONIES INSURANCE LGA REQUEST'
    );

    console.log(
      'VTPASS BASE URL:',
      VTPASS_BASE_URL
    );

    console.log(
      'STATE CODE:',
      cleanStateCode
    );

    console.log(
      'VTPASS LGA ENDPOINT:',
      endpoint
    );

    console.log(
      '============================================================'
    );

    const data =
      await vtpassRequest(
        endpoint,
        {
          method:
            'GET',
        }
      );

    console.log(
      'ZENIMONIES VTpass LGA RAW RESPONSE:',
      JSON.stringify(
        data,
        null,
        2
      )
    );

    const lgas =
      extractArray(
        data,
        [
          'lgas',
          'LGAs',
          'localGovernmentAreas',
          'local_government_areas',
        ]
      );

    console.log(
      'ZENIMONIES LGA COUNT:',
      lgas.length
    );

    if (
      lgas.length > 0
    ) {
      console.log(
        'ZENIMONIES FIRST LGA:',
        JSON.stringify(
          lgas[0],
          null,
          2
        )
      );
    } else {
      console.warn(
        'ZENIMONIES WARNING: VTpass returned ZERO LGAs for state:',
        cleanStateCode
      );
    }

    return lgas;
  };

// ============================================================
// GET VEHICLE MODELS
// ============================================================

const getMotorInsuranceModels =
  async (
    vehicleMakeCode
  ) => {
    if (!vehicleMakeCode) {
      throw new Error(
        'Vehicle make code is required.'
      );
    }

    const data =
      await vtpassRequest(
        `/api/universal-insurance/options/model/${encodeURIComponent(
          vehicleMakeCode
        )}`,
        {
          method:
            'GET',
        }
      );

    const models =
      extractArray(
        data,
        [
          'models',
          'vehicleModels',
        ]
      );

    console.log(
      'ZENIMONIES VEHICLE MODEL COUNT:',
      models.length
    );

    return models;
  };

// ============================================================
// PURCHASE INSURANCE
// ============================================================

const purchaseInsurance =
  async (
    payload
  ) => {
    if (
      !payload ||
      typeof payload !==
        'object'
    ) {
      throw new Error(
        'Insurance purchase payload is required.'
      );
    }

    if (
      !payload.serviceID
    ) {
      throw new Error(
        'Insurance service ID is required.'
      );
    }

    if (
      !payload.variation_code
    ) {
      throw new Error(
        'Insurance variation code is required.'
      );
    }

    const requestId =
      payload.request_id ||
      generateRequestId();

    const vtpassPayload =
      {
        ...payload,

        request_id:
          requestId,
      };

    // Never send the user's
    // transaction PIN to VTpass.
    delete vtpassPayload.transaction_pin;

    const data =
      await vtpassRequest(
        '/api/pay',
        {
          method:
            'POST',

          body:
            JSON.stringify(
              vtpassPayload
            ),
        }
      );

    return {
      requestId,

      responseCode:
        data?.code ||
        data?.response_code ||
        null,

      responseDescription:
        data?.response_description ||
        null,

      status:
        normalizeProviderStatus(
          data
        ),

      transactionId:
        data?.content
          ?.transactions
          ?.transactionId ||
        data?.content
          ?.transactionId ||
        null,

      purchasedCode:
        data?.purchased_code ||
        data?.content
          ?.transactions
          ?.purchased_code ||
        data?.content
          ?.purchased_code ||
        null,

      certificateUrl:
        data?.certUrl ||
        data?.content
          ?.transactions
          ?.certUrl ||
        data?.content
          ?.certUrl ||
        null,

      content:
        data?.content ||
        null,

      raw:
        data,
    };
  };

// ============================================================
// REQUERY INSURANCE
// ============================================================

const requeryInsurance =
  async (
    requestId
  ) => {
    if (!requestId) {
      throw new Error(
        'Request ID is required for requery.'
      );
    }

    const data =
      await vtpassRequest(
        '/api/requery',
        {
          method:
            'POST',

          body:
            JSON.stringify({
              request_id:
                requestId,
            }),
        }
      );

    console.log(
      'ZENIMONIES VTpass INSURANCE REQUERY RESPONSE:',
      JSON.stringify(
        {
          code:
            data?.code ||
            data?.response_code ||
            null,

          response_description:
            data?.response_description ||
            null,

          transaction_status:
            data?.content
              ?.transactions
              ?.status ||
            null,

          requestId:
            data?.requestId ||
            requestId,
        },
        null,
        2
      )
    );

    return {
      requestId,

      responseCode:
        data?.code ||
        data?.response_code ||
        null,

      responseDescription:
        data?.response_description ||
        null,

      status:
        normalizeProviderStatus(
          data
        ),

      transactionId:
        data?.content
          ?.transactions
          ?.transactionId ||
        data?.content
          ?.transactionId ||
        null,

      purchasedCode:
        data?.purchased_code ||
        data?.content
          ?.transactions
          ?.purchased_code ||
        data?.content
          ?.purchased_code ||
        null,

      certificateUrl:
        data?.certUrl ||
        data?.content
          ?.transactions
          ?.certUrl ||
        data?.content
          ?.certUrl ||
        null,

      content:
        data?.content ||
        null,

      raw:
        data,
    };
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  INSURANCE_SERVICE_IDS,

  generateRequestId,

  getInsurancePlans,

  getMotorInsuranceOptions,

  getMotorInsuranceLgas,

  getMotorInsuranceModels,

  purchaseInsurance,

  requeryInsurance,
};
