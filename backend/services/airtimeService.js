// ============================================================
// VTpass HTTP REQUEST
// ============================================================

const vtpassRequest = async ({
  endpoint,
  method = 'GET',
  body = null,
}) => {
  validateConfig();

  const headers = {
    Accept: 'application/json',

    'Content-Type': 'application/json',
  };

  // ----------------------------------------------------------
  // GET
  // ----------------------------------------------------------

  if (method === 'GET') {
    headers['api-key'] =
      VTPASS_API_KEY;

    headers['public-key'] =
      VTPASS_PUBLIC_KEY;
  }

  // ----------------------------------------------------------
  // POST
  // ----------------------------------------------------------

  if (method === 'POST') {
    headers['api-key'] =
      VTPASS_API_KEY;

    headers['secret-key'] =
      VTPASS_SECRET_KEY;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      30000
    );

  // ==========================================================
  // SAFE PROVIDER REQUEST DIAGNOSTIC
  // ==========================================================
  // IMPORTANT:
  // Never log API keys, secret keys,
  // passwords, or transaction PINs.

  const diagnosticPhone =
    body?.phone
      ? String(body.phone).slice(-4)
      : 'N/A';

  console.log(
    '================================================'
  );

  console.log(
    'VTPASS PROVIDER REQUEST'
  );

  console.log(
    '================================================'
  );

  console.log(
    'Environment:',
    VTPASS_BASE_URL.includes('sandbox')
      ? 'SANDBOX'
      : 'LIVE'
  );

  console.log(
    'Endpoint:',
    endpoint
  );

  console.log(
    'Method:',
    method
  );

  console.log(
    'Service ID:',
    body?.serviceID || 'N/A'
  );

  console.log(
    'Amount:',
    body?.amount || 'N/A'
  );

  console.log(
    'Request ID:',
    body?.request_id || 'N/A'
  );

  console.log(
    'Phone last 4:',
    diagnosticPhone
  );

  console.log(
    '================================================'
  );

  try {
    const response =
      await fetch(
        `${VTPASS_BASE_URL}${endpoint}`,
        {
          method,
          headers,

          body:
            body !== null
              ? JSON.stringify(body)
              : undefined,

          signal:
            controller.signal,
        }
      );

    const text =
      await response.text();

    let data;

    try {
      data =
        text
          ? JSON.parse(text)
          : null;
    } catch {
      data = {
        raw: text,
      };
    }

    // ========================================================
    // SAFE PROVIDER RESPONSE DIAGNOSTIC
    // ========================================================

    console.log(
      'VTPASS PROVIDER RESPONSE CODE:',
      data?.code ||
        data?.response_code ||
        'N/A'
    );

    console.log(
      'VTPASS PROVIDER RESPONSE DESCRIPTION:',
      data?.response_description ||
        data?.message ||
        'N/A'
    );

    console.log(
      'VTPASS PROVIDER TRANSACTION STATUS:',
      data?.content?.transactions?.status ||
        'N/A'
    );

    console.log(
      'VTPASS PROVIDER TRANSACTION ID:',
      data?.content?.transactions?.transactionId ||
        data?.transactionId ||
        'N/A'
    );

    // --------------------------------------------------------
    // HTTP ERROR
    // --------------------------------------------------------

    if (!response.ok) {
      const error =
        new Error(
          data?.response_description ||
            data?.message ||
            `VTpass request failed with status ${response.status}.`
        );

      error.code =
        'VTPASS_HTTP_ERROR';

      error.status =
        response.status;

      error.response =
        data;

      throw error;
    }

    return data;

  } catch (error) {

    // ========================================================
    // SAFE PROVIDER ERROR DIAGNOSTIC
    // ========================================================

    console.error(
      'VTPASS PROVIDER REQUEST ERROR:',
      {
        code:
          error?.code ||
          'UNKNOWN',

        status:
          error?.status ||
          null,

        message:
          error?.message ||
          'Unknown provider error',

        providerCode:
          error?.response?.code ||
          error?.response?.response_code ||
          null,

        providerDescription:
          error?.response?.response_description ||
          error?.response?.message ||
          null,
      }
    );

    if (
      error?.name ===
      'AbortError'
    ) {
      const timeoutError =
        new Error(
          'VTpass request timed out.'
        );

      timeoutError.code =
        'VTPASS_TIMEOUT';

      throw timeoutError;
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
};
