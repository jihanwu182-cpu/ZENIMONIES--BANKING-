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
  PERSONAL_ACCIDENT: 'personal-accident-insurance',
};

// ============================================================
// VTpass AUTH
// ============================================================

const getVtpassHeaders = () => {
  const apiKey = process.env.VTPASS_API_KEY;
  const secretKey = process.env.VTPASS_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error(
      'VTpass API credentials are not configured.'
    );
  }

  const authorization = Buffer.from(
    `${apiKey}:${secretKey}`
  ).toString('base64');

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Basic ${authorization}`,
  };
};

// ============================================================
// REQUEST ID
// ============================================================

const generateRequestId = () => {
  const now = new Date();

  const lagosTime = new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).formatToParts(now);

  const getPart = (type) =>
    lagosTime.find(
      (part) => part.type === type
    )?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  const randomPart = crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase();

  return `${year}${month}${day}${hour}${minute}${randomPart}`;
};

// ============================================================
// SAFE JSON REQUEST
// ============================================================

const vtpassRequest = async (
  endpoint,
  options = {}
) => {
  const response = await fetch(
    `${VTPASS_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...getVtpassHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text
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
    const error = new Error(
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
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(
      response?.content
    )
  ) {
    return response.content;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

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
        response?.data?.[key]
      )
    ) {
      return response.data[key];
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

const getInsurancePlans = async (
  serviceID
) => {
  if (
    !Object.values(
      INSURANCE_SERVICE_IDS
    ).includes(serviceID)
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

    raw: data,
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
    ] = await Promise.all([
      vtpassRequest(
        '/api/universal-insurance/options/color',
        {
          method: 'GET',
        }
      ),

      vtpassRequest(
        '/api/universal-insurance/options/engine-capacity',
        {
          method: 'GET',
        }
      ),

      vtpassRequest(
        '/api/universal-insurance/options/state',
        {
          method: 'GET',
        }
      ),

      vtpassRequest(
        '/api/universal-insurance/options/brand',
        {
          method: 'GET',
        }
      ),
    ]);

    return {
      colors:
        extractArray(
          colors
        ),

      engineCapacities:
        extractArray(
          engineCapacities
        ),

      states:
        extractArray(
          states
        ),

      brands:
        extractArray(
          brands
        ),
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

    const data =
      await vtpassRequest(
        `/api/universal-insurance/options/lga/${encodeURIComponent(
          cleanStateCode
        )}`,
        {
          method: 'GET',
        }
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

    // --------------------------------------------------------
    // IMPORTANT
    // VTpass documents LGA response as:
    //
    // content: [
    //   {
    //     LGACode: "770",
    //     LGAName: "Aba",
    //     StateCode: "1"
    //   }
    // ]
    //
    // We return ONLY the array to the controller/frontend.
    // --------------------------------------------------------

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
          method: 'GET',
        }
      );

    return extractArray(
      data,
      [
        'models',
        'vehicleModels',
      ]
    );
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

    if (!payload.serviceID) {
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

    const vtpassPayload = {
      ...payload,
      request_id:
        requestId,
    };

    delete vtpassPayload.transaction_pin;

    const data =
      await vtpassRequest(
        '/api/pay',
        {
          method: 'POST',
          body: JSON.stringify(
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
        data?.code === '000'
          ? 'successful'
          : data?.code === '099'
          ? 'pending'
          : 'failed',

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
        data?.content
          ?.transactions
          ?.certUrl ||
        data?.content
          ?.certUrl ||
        null,

      content:
        data?.content ||
        null,

      raw: data,
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
          method: 'POST',
          body: JSON.stringify({
            request_id:
              requestId,
          }),
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
        data?.code === '000'
          ? 'successful'
          : data?.code === '099'
          ? 'pending'
          : 'failed',

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
        data?.content
          ?.transactions
          ?.certUrl ||
        data?.content
          ?.certUrl ||
        null,

      content:
        data?.content ||
        null,

      raw: data,
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
