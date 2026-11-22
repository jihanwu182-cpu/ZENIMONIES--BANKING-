

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

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

class AlatApiError extends Error {
  constructor(message, status = null, code = 'ALAT_API_ERROR') {
    super(message);
    this.name = 'AlatApiError';
    this.status = status;
    this.code = code;
  }
}

// ------------------------------------------------------------
// Validate and build API URL
// ------------------------------------------------------------

const buildUrl = (endpoint) => {
  if (
    typeof BASE_URL !== 'string' ||
    !BASE_URL.trim()
  ) {
    throw new AlatApiError(
      'ALAT base URL is not configured.',
      null,
      'ALAT_BASE_URL_MISSING'
    );
  }

  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('/') ||
    endpoint.startsWith('//') ||
    endpoint.includes('://')
  ) {
    throw new AlatApiError(
      'Invalid ALAT API endpoint.',
      null,
      'INVALID_ENDPOINT'
    );
  }

  try {
    const base = BASE_URL.replace(/\/+$/, '');
    return new URL(`${base}${endpoint}`).toString();
  } catch (_) {
    throw new AlatApiError(
      'Invalid ALAT API URL configuration.',
      null,
      'INVALID_BASE_URL'
    );
  }
};

// ------------------------------------------------------------
// ALAT request handler
// ------------------------------------------------------------

const request = async ({
  method = 'GET',
  endpoint,
  body,
}) => {
  // Check integration credentials
  if (!isConfigured) {
    throw new AlatApiError(
      `ALAT integration is not configured. Missing: ${
        getMissingCredentials().join(', ')
      }`,
      null,
      'ALAT_NOT_CONFIGURED'
    );
  }

  // Check runtime support
  if (
    typeof fetch !== 'function' ||
    typeof AbortController !== 'function'
  ) {
    throw new AlatApiError(
      'This Node.js runtime does not support required API features.',
      null,
      'FETCH_UNAVAILABLE'
    );
  }

  // Validate HTTP method
  const normalizedMethod =
    typeof method === 'string'
      ? method.trim().toUpperCase()
      : '';

  if (!ALLOWED_METHODS.includes(normalizedMethod)) {
    throw new AlatApiError(
      'Invalid ALAT HTTP method.',
      null,
      'INVALID_METHOD'
    );
  }

  const url = buildUrl(endpoint);
  const controller = new AbortController();

  let timeout;

  try {
    timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    const headers = {
      Accept: 'application/json',
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'x-api-key': X_API_KEY,
    };

    const options = {
      method: normalizedMethod,
      headers,
      signal: controller.signal,
    };

    // Include a JSON body only when supplied
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Read response safely
    let responseText = '';

    try {
      responseText = await response.text();
    } catch (_) {
      throw new AlatApiError(
        'Unable to read ALAT API response.',
        response.status,
        'ALAT_RESPONSE_READ_ERROR'
      );
    }

    // Parse JSON where possible
    let data = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        // Preserve response without exposing it in error messages
        data = {
          message: 'ALAT returned a non-JSON response.',
        };
      }
    }

    // Handle unsuccessful HTTP responses
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
    // Preserve known ALAT errors
    if (error instanceof AlatApiError) {
      throw error;
    }

    // Timeout
    if (error?.name === 'AbortError') {
      throw new AlatApiError(
        'ALAT API request timed out.',
        null,
        'ALAT_TIMEOUT'
      );
    }

    // Connection or unexpected errors
    throw new AlatApiError(
      'Unable to communicate with ALAT.',
      null,
      'ALAT_CONNECTION_ERROR'
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
  request,
  AlatApiError,
};
