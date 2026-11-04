
const {
  BASE_URL,
  SUBSCRIPTION_KEY,
  X_API_KEY,
  isConfigured,
  getMissingCredentials,
} = require('../../config/alat');

// ============================================================
// ZENIMONIES BANKING — ALAT API CLIENT
// ============================================================

const REQUEST_TIMEOUT_MS = 20000;

class AlatApiError extends Error {
  constructor(message, status = null, code = 'ALAT_API_ERROR') {
    super(message);
    this.name = 'AlatApiError';
    this.status = status;
    this.code = code;
  }
}

const buildUrl = (endpoint) => {
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('/') ||
    endpoint.startsWith('//')
  ) {
    throw new AlatApiError(
      'Invalid ALAT API endpoint.',
      null,
      'INVALID_ENDPOINT'
    );
  }

  const base = BASE_URL.replace(/\/+$/, '');
  return `${base}${endpoint}`;
};

const request = async ({
  method = 'GET',
  endpoint,
  body,
}) => {
  if (!isConfigured) {
    throw new AlatApiError(
      `ALAT integration is not configured. Missing: ${
        getMissingCredentials().join(', ')
      }`,
      null,
      'ALAT_NOT_CONFIGURED'
    );
  }

  if (typeof fetch !== 'function') {
    throw new AlatApiError(
      'This Node.js runtime does not support fetch.',
      null,
      'FETCH_UNAVAILABLE'
    );
  }

  const url = buildUrl(endpoint);
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const headers = {
      Accept: 'application/json',
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'x-api-key': X_API_KEY,
    };

    const options = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    const responseText = await response.text();

    let data = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        data = { message: 'ALAT returned a non-JSON response.' };
      }
    }

    if (!response.ok) {
      throw new AlatApiError(
        'ALAT API request was unsuccessful.',
        response.status,
        'ALAT_HTTP_ERROR'
      );
    }

    return {
      success: true,
      status: response.status,
      data,
    };
  } catch (error) {
    if (error instanceof AlatApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new AlatApiError(
        'ALAT API request timed out.',
        null,
        'ALAT_TIMEOUT'
      );
    }

    throw new AlatApiError(
      'Unable to communicate with ALAT.',
      null,
      'ALAT_CONNECTION_ERROR'
    );
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  request,
  AlatApiError,
};
