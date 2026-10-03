const axios = require('axios');
const crypto = require('crypto');

/**
 * ============================================================
 * ZENIMONIES — BETTING SERVICE
 * ============================================================
 *
 * Sogo Betting API integration.
 *
 * Responsibilities:
 * - Load Sogo betting providers
 * - Verify betting account
 * - Fund betting account
 * - Normalize Sogo responses
 * - Generate idempotency keys
 *
 * IMPORTANT:
 * - Sogo API key stays on the backend.
 * - This service does NOT debit the customer's ZENIMONIES
 *   account. The controller will handle our local balance
 *   transaction.
 * ============================================================
 */

const SOGO_API_BASE_URL =
  process.env.SOGO_API_BASE_URL ||
  'https://sandbox.sogo.africa/v1';

const SOGO_API_KEY =
  process.env.SOGO_API_KEY;

/**
 * ============================================================
 * BASIC CONFIGURATION CHECK
 * ============================================================
 */

const ensureSogoConfigured = () => {
  if (!SOGO_API_KEY) {
    const error = new Error(
      'Sogo API key is not configured'
    );

    error.code =
      'SOGO_API_KEY_MISSING';

    throw error;
  }
};

/**
 * ============================================================
 * SOGO HEADERS
 * ============================================================
 */

const getSogoHeaders = (
  idempotencyKey = null
) => {
  const headers = {
    Authorization:
      `Bearer ${SOGO_API_KEY}`,

    'Content-Type':
      'application/json',
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] =
      idempotencyKey;
  }

  return headers;
};

/**
 * ============================================================
 * GENERATE IDEMPOTENCY KEY
 * ============================================================
 */

const createIdempotencyKey = () => {
  return crypto.randomUUID();
};

/**
 * ============================================================
 * EXTRACT PROVIDER LIST
 * ============================================================
 */

const extractBettingProviders = (
  payload
) => {
  const possibleProviders = [
    payload?.data?.betting?.providers,

    payload?.betting?.providers,

    payload?.data?.providers,

    payload?.providers,
  ];

  for (
    const providers of possibleProviders
  ) {
    if (
      Array.isArray(providers)
    ) {
      return providers;
    }
  }

  return [];
};

/**
 * ============================================================
 * LOAD BETTING PROVIDERS
 *
 * Sogo catalog:
 *
 * GET /v1/bills/catalog
 *
 * Scope:
 * bills:read
 * ============================================================
 */

const getBettingProviders =
  async () => {
    ensureSogoConfigured();

    try {
      const response =
        await axios.get(
          `${SOGO_API_BASE_URL}/bills/catalog`,
          {
            headers:
              getSogoHeaders(),

            timeout: 30000,
          }
        );

      const providers =
        extractBettingProviders(
          response?.data
        );

      return {
        success: true,

        providers,
      };

    } catch (error) {
      const providerResponse =
        error?.response?.data ||
        null;

      console.error(
        '❌ Sogo betting catalog request failed:',
        providerResponse ||
          error?.message
      );

      const normalizedError =
        new Error(
          providerResponse?.message ||
          providerResponse?.error ||
          'Unable to load betting providers'
        );

      normalizedError.status =
        error?.response?.status ||
        502;

      normalizedError.providerResponse =
        providerResponse;

      throw normalizedError;
    }
  };

/**
 * ============================================================
 * VERIFY BETTING ACCOUNT
 *
 * POST /v1/bills/bet-funding/verify-account
 *
 * Required:
 * - provider
 * - account_id
 *
 * No Idempotency-Key required.
 * ============================================================
 */

const verifyBettingAccount =
  async ({
    provider,
    accountId,
  }) => {
    ensureSogoConfigured();

    const normalizedProvider =
      String(
        provider || ''
      )
        .trim()
        .toLowerCase();

    const normalizedAccountId =
      String(
        accountId || ''
      )
        .trim();

    if (
      !normalizedProvider
    ) {
      const error = new Error(
        'Betting provider is required'
      );

      error.status = 400;

      throw error;
    }

    if (
      !normalizedAccountId
    ) {
      const error = new Error(
        'Betting account ID is required'
      );

      error.status = 400;

      throw error;
    }

    try {
      const response =
        await axios.post(
          `${SOGO_API_BASE_URL}/bills/bet-funding/verify-account`,
          {
            provider:
              normalizedProvider,

            account_id:
              normalizedAccountId,
          },
          {
            headers:
              getSogoHeaders(),

            timeout: 30000,
          }
        );

      const payload =
        response?.data || {};

      const verification =
        payload?.verification ||
        payload?.data ||
        payload;

      const username =
        verification?.username ||
        verification?.user_name ||
        verification?.customer_name ||
        verification?.name ||
        null;

      return {
        success: true,

        provider:
          normalizedProvider,

        account_id:
          normalizedAccountId,

        username,

        verification,

        providerResponse:
          payload,
      };

    } catch (error) {
      const providerResponse =
        error?.response?.data ||
        null;

      console.error(
        '❌ Sogo betting account verification failed:',
        providerResponse ||
          error?.message
      );

      const normalizedError =
        new Error(
          providerResponse?.message ||
          providerResponse?.error ||
          'Unable to verify betting account'
        );

      normalizedError.status =
        error?.response?.status ||
        502;

      normalizedError.providerResponse =
        providerResponse;

      throw normalizedError;
    }
  };

/**
 * ============================================================
 * FUND BETTING ACCOUNT
 *
 * POST /v1/bills/bet-funding
 *
 * Required:
 * - provider
 * - account_id
 * - amount
 *
 * Requires:
 * bills:write
 * Idempotency-Key
 * ============================================================
 */

const fundBettingAccount =
  async ({
    provider,
    accountId,
    amount,
    idempotencyKey,
  }) => {
    ensureSogoConfigured();

    const normalizedProvider =
      String(
        provider || ''
      )
        .trim()
        .toLowerCase();

    const normalizedAccountId =
      String(
        accountId || ''
      )
        .trim();

    const numericAmount =
      Number(amount);

    if (
      !normalizedProvider
    ) {
      const error = new Error(
        'Betting provider is required'
      );

      error.status = 400;

      throw error;
    }

    if (
      !normalizedAccountId
    ) {
      const error = new Error(
        'Betting account ID is required'
      );

      error.status = 400;

      throw error;
    }

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      const error = new Error(
        'Invalid betting funding amount'
      );

      error.status = 400;

      throw error;
    }

    const finalIdempotencyKey =
      idempotencyKey ||
      createIdempotencyKey();

    try {
      const response =
        await axios.post(
          `${SOGO_API_BASE_URL}/bills/bet-funding`,
          {
            provider:
              normalizedProvider,

            account_id:
              normalizedAccountId,

            amount:
              numericAmount,
          },
          {
            headers:
              getSogoHeaders(
                finalIdempotencyKey
              ),

            timeout: 60000,
          }
        );

      const payload =
        response?.data || {};

      const providerData =
        payload?.data ||
        payload?.transaction ||
        payload;

      const status =
        String(
          providerData?.status ||
          payload?.status ||
          ''
        )
          .trim()
          .toLowerCase();

      const reference =
        providerData?.reference ||
        payload?.reference ||
        providerData?.provider_reference ||
        null;

      const message =
        payload?.message ||
        providerData?.message ||
        null;

      return {
        success: true,

        status,

        reference,

        provider:
          normalizedProvider,

        account_id:
          normalizedAccountId,

        amount:
          numericAmount,

        message,

        providerData,

        providerResponse:
          payload,

        idempotencyKey:
          finalIdempotencyKey,
      };

    } catch (error) {
      const providerResponse =
        error?.response?.data ||
        null;

      console.error(
        '❌ Sogo betting funding failed:',
        providerResponse ||
          error?.message
      );

      const normalizedError =
        new Error(
          providerResponse?.message ||
          providerResponse?.error ||
          'Unable to fund betting account'
        );

      normalizedError.status =
        error?.response?.status ||
        502;

      normalizedError.providerResponse =
        providerResponse;

      normalizedError.idempotencyKey =
        finalIdempotencyKey;

      throw normalizedError;
    }
  };

/**
 * ============================================================
 * LOOK UP SOGO TRANSACTION
 *
 * Used later by reconciliation/webhook handling.
 *
 * GET /v1/transactions/{reference}
 * ============================================================
 */

const getSogoTransaction =
  async (
    reference
  ) => {
    ensureSogoConfigured();

    const normalizedReference =
      String(
        reference || ''
      )
        .trim();

    if (
      !normalizedReference
    ) {
      const error = new Error(
        'Sogo transaction reference is required'
      );

      error.status = 400;

      throw error;
    }

    /**
     * Sandbox transaction lookup may not have a persisted
     * transaction record.
     *
     * We intentionally return null rather than generating
     * a misleading failure for Sandbox.
     */
    if (
      String(
        SOGO_API_BASE_URL
      )
        .toLowerCase()
        .includes(
          'sandbox.sogo.africa'
        )
    ) {
      return null;
    }

    try {
      const response =
        await axios.get(
          `${SOGO_API_BASE_URL}/transactions/${encodeURIComponent(
            normalizedReference
          )}`,
          {
            headers:
              getSogoHeaders(),

            timeout: 30000,
          }
        );

      return (
        response?.data ||
        null
      );

    } catch (error) {
      const providerResponse =
        error?.response?.data ||
        null;

      console.warn(
        '⚠️ Sogo transaction lookup failed:',
        error?.response?.status ||
          error?.message
      );

      return null;
    }
  };

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  getBettingProviders,
  verifyBettingAccount,
  fundBettingAccount,
  getSogoTransaction,
  createIdempotencyKey,
};
