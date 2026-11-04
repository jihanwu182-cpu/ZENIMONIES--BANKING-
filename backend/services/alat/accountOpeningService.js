// ============================================================
// ZENIMONIES BANKING — ALAT ACCOUNT OPENING SERVICE
// ============================================================

const { request } = require('./alatClient');

const ENDPOINTS = Object.freeze({
  dropdowns:
    '/api/CustomerInfo/GetDropDownList',

  tier1BVN:
    '/api/partnership/tier1-bvn-withoutOtp-v2',

  tier1NIN:
    '/api/partnership/tier1-nin-withoutOtp-v2',

  tier2:
    '/api/partnership/tier2-partnershipaccount-withoutOtp-v2',

  accountDetails:
    '/api/CustomerAccount/GetPartnershipAccountDetails',
});

class AccountOpeningError extends Error {
  constructor(message, code = 'ACCOUNT_OPENING_ERROR') {
    super(message);
    this.name = 'AccountOpeningError';
    this.code = code;
  }
}

const requireString = (value, fieldName) => {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new AccountOpeningError(
      `${fieldName} is required.`,
      'INVALID_INPUT'
    );
  }

  return value.trim();
};

// ------------------------------------------------------------
// GET ALAT DROPDOWN INFORMATION
// ------------------------------------------------------------

const getDropdownLists = async () => {
  return request({
    method: 'GET',
    endpoint: ENDPOINTS.dropdowns,
  });
};

// ------------------------------------------------------------
// TIER 1 — BVN ONBOARDING
// ------------------------------------------------------------

const createTier1WithBVN = async ({
  phoneNumber,
  email,
  bvn,
  correlationId,
}) => {
  const body = {
    phoneNumber: requireString(
      phoneNumber,
      'Phone number'
    ),

    email: requireString(
      email,
      'Email address'
    ),

    bvn: requireString(
      bvn,
      'BVN'
    ),

    correlationId: requireString(
      correlationId,
      'Correlation ID'
    ),
  };

  return request({
    method: 'POST',
    endpoint: ENDPOINTS.tier1BVN,
    body,
  });
};

// ------------------------------------------------------------
// TIER 1 — NIN ONBOARDING
// ------------------------------------------------------------

const createTier1WithNIN = async ({
  phoneNumber,
  email,
  nin,
  correlationId,
}) => {
  const body = {
    phoneNumber: requireString(
      phoneNumber,
      'Phone number'
    ),

    email: requireString(
      email,
      'Email address'
    ),

    nin: requireString(
      nin,
      'NIN'
    ),

    correlationId: requireString(
      correlationId,
      'Correlation ID'
    ),
  };

  return request({
    method: 'POST',
    endpoint: ENDPOINTS.tier1NIN,
    body,
  });
};

// ------------------------------------------------------------
// TIER 2 — PARTNERSHIP ACCOUNT ONBOARDING
// ------------------------------------------------------------

const createTier2PartnershipAccount = async ({
  bvn,
  nin,
  phoneNumber,
  emailAddress,
  residentialAddress,
  liveImageOfFace,
}) => {
  const address = residentialAddress || {};

  const requiredAddressFields = [
    'buildingNumber',
    'city',
    'country',
    'fullAddress',
    'landmark',
    'lga',
    'state',
    'street',
  ];

  const validatedAddress = {};

  for (const field of requiredAddressFields) {
    validatedAddress[field] = requireString(
      address[field],
      `Residential address ${field}`
    );
  }

  const optionalAddressFields = [
    'apartment',
    'town',
    'lcda',
    'additionalInformation',
  ];

  for (const field of optionalAddressFields) {
    if (
      address[field] !== undefined &&
      address[field] !== null &&
      String(address[field]).trim()
    ) {
      validatedAddress[field] = String(
        address[field]
      ).trim();
    }
  }

  const body = {
    bvn: requireString(bvn, 'BVN'),
    nin: requireString(nin, 'NIN'),

    phoneNumber: requireString(
      phoneNumber,
      'Phone number'
    ),

    emailAddress: requireString(
      emailAddress,
      'Email address'
    ),

    residentialAddress: validatedAddress,

    liveImageOfFace: requireString(
      liveImageOfFace,
      'Live face image'
    ),
  };

  return request({
    method: 'POST',
    endpoint: ENDPOINTS.tier2,
    body,
  });
};

// ------------------------------------------------------------
// GET PARTNERSHIP ACCOUNT DETAILS
// ------------------------------------------------------------

const getPartnershipAccountDetails = async (
  phoneNumber
) => {
  const phone = requireString(
    phoneNumber,
    'Phone number'
  );

  const query = new URLSearchParams({
    phoneNumber: phone,
  });

  return request({
    method: 'GET',
    endpoint:
      `${ENDPOINTS.accountDetails}?${query.toString()}`,
  });
};

module.exports = {
  getDropdownLists,
  createTier1WithBVN,
  createTier1WithNIN,
  createTier2PartnershipAccount,
  getPartnershipAccountDetails,
  AccountOpeningError,
};
