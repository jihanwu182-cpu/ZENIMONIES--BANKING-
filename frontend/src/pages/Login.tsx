import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import {
  startAuthentication,
} from '@simplewebauthn/browser';
import {
  Link,
  useNavigate,
} from 'react-router-dom';

const API_URL =
  'https://zenimonies-banking.onrender.com';

const MAX_PASSKEY_FAILURES = 3;

// ============================================================
// TYPES
// ============================================================

type LoginPayload = {
  success?: boolean;
  message?: string;

  token?: string;
  accessToken?: string;
  access_token?: string;

  user?: any;
  accounts?: any[];

  requiresOtp?: boolean;
  requires_otp?: boolean;
  otpRequired?: boolean;
  otp_required?: boolean;

  otpToken?: string;
  otp_token?: string;

  requires_phone_verification?: boolean;

  error_detail?: string;

  data?: LoginPayload;
};

type PasskeyLoginOptionsResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  options?: any;

  failed_attempts?: number;
  max_failed_attempts?: number;
  fallback_required?: boolean;
  locked_until?: string | null;
};

type PasskeyLoginResponse = {
  success?: boolean;
  message?: string;

  code?: string;

  token?: string;

  user?: any;
  accounts?: any[];

  failed_attempts?: number;
  max_failed_attempts?: number;
  fallback_required?: boolean;
  locked_until?: string | null;

  data?: {
    token?: string;
    user?: any;
    accounts?: any[];
  };
};

// ============================================================
// UNWRAP LOGIN RESPONSE
// ============================================================

function unwrapLoginPayload(
  raw: LoginPayload
): LoginPayload {
  if (
    raw?.data &&
    typeof raw.data === 'object'
  ) {
    return {
      ...raw,
      ...raw.data,
    };
  }

  return raw || {};
}

// ============================================================
// SERVER ERROR
// ============================================================

function getServerError(
  err: unknown
): string {
  if (axios.isAxiosError(err)) {
    const axiosErr =
      err as AxiosError<LoginPayload>;

    const response =
      axiosErr.response;

    if (response?.data) {
      const data =
        response.data;

      if (
        data.message &&
        data.error_detail
      ) {
        return `${data.message}: ${data.error_detail}`;
      }

      if (data.message) {
        return data.message;
      }

      return JSON.stringify(data);
    }

    if (
      axiosErr.code ===
      'ECONNABORTED'
    ) {
      return 'The server took too long to respond.';
    }

    if (!response) {
      return 'Unable to reach the Zenimonies server.';
    }

    return `Server error: HTTP ${response.status}`;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Unknown login error.';
}

// ============================================================
// SAVE AUTHENTICATED SESSION
// ============================================================

function saveAuthenticatedSession(
  data: {
    token?: string;
    user?: any;
    accounts?: any[];
  }
) {
  const token =
    data.token;

  if (!token) {
    throw new Error(
      'The server did not return an authentication token.'
    );
  }

  localStorage.setItem(
    'zenimonies_token',
    token
  );

  localStorage.setItem(
    'token',
    token
  );

  if (data.user) {
    localStorage.setItem(
      'zenimonies_user',
      JSON.stringify(
        data.user
      )
    );
  }

  localStorage.setItem(
    'zenimonies_accounts',
    JSON.stringify(
      data.accounts || []
    )
  );
}

// ============================================================
// ICONS
// ============================================================

const ZenimoniesMark: React.FC = () => (
  <div
    style={{
      width: '48px',
      height: '48px',
      borderRadius: '15px',
      background: '#0f5c46',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow:
        '0 8px 20px rgba(15, 92, 70, 0.18)',
    }}
  >
    <svg
      width="25"
      height="25"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 21.5V10.8C8 9.25 9.25 8 10.8 8H21.2C22.75 8 24 9.25 24 10.8V21.2C24 22.75 22.75 24 21.2 24H10.8"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M13 13H19"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M13 18H19"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

const PasskeyIcon: React.FC = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="8"
      cy="8"
      r="3"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M10.5 10.5L21 21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M16 16L14 18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M18 18L16 20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const EyeIcon: React.FC<{
  visible: boolean;
}> = ({
  visible,
}) => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    {visible ? (
      <>
        <path
          d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </>
    ) : (
      <>
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10.6 5.7C11.05 5.57 11.52 5.5 12 5.5C18 5.5 21.5 12 21.5 12C20.65 13.58 19.53 14.92 18.25 15.95"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.1 6.1C4.55 7.38 3.35 9.05 2.5 12C2.5 12 6 18.5 12 18.5C13.07 18.5 14.08 18.3 15.02 17.95"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 3L19 6V11.5C19 16.2 16.1 19.55 12 21C7.9 19.55 5 16.2 5 11.5V6L12 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9 12L11 14L15.5 9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ============================================================
// LOGIN PAGE
// ============================================================

const Login: React.FC = () => {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    passkeyLoading,
    setPasskeyLoading,
  ] = useState(false);

  const [error, setError] =
    useState('');

  const [
    passkeyFailures,
    setPasskeyFailures,
  ] = useState(0);

  const [
    passkeyFallback,
    setPasskeyFallback,
  ] = useState(false);

  // ==========================================================
  // PASSWORD LOGIN
  // ==========================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        'Email and password are required.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await axios.post<LoginPayload>(
          `${API_URL}/api/auth/login`,
          {
            email:
              cleanEmail,
            password,
          },
          {
            timeout: 60000,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );

      const data =
        unwrapLoginPayload(
          response.data
        );

      if (data.success === false) {
        setError(
          data.error_detail
            ? `${
                data.message ||
                'Login failed'
              }: ${
                data.error_detail
              }`
            : data.message ||
              'Login was rejected by the server.'
        );

        return;
      }

      const token =
        data.token ||
        data.accessToken ||
        data.access_token;

      const requiresOtp =
        Boolean(
          data.requiresOtp ||
            data.requires_otp ||
            data.otpRequired ||
            data.otp_required
        );

      if (requiresOtp) {
        sessionStorage.setItem(
          'zenimonies_otp_email',
          cleanEmail
        );

        const otpToken =
          data.otpToken ||
          data.otp_token;

        if (otpToken) {
          sessionStorage.setItem(
            'zenimonies_otp_token',
            otpToken
          );
        }

        navigate(
          '/verify-otp'
        );

        return;
      }

      if (
        data.requires_phone_verification ===
        true
      ) {
        if (token) {
          localStorage.setItem(
            'zenimonies_token',
            token
          );

          localStorage.setItem(
            'token',
            token
          );
        }

        if (data.user) {
          localStorage.setItem(
            'zenimonies_user',
            JSON.stringify(
              data.user
            )
          );
        }

        navigate(
          '/verify-phone'
        );

        return;
      }

      if (!token) {
        setError(
          data.message ||
            'The server did not return an authentication token.'
        );

        return;
      }

      saveAuthenticatedSession({
        token,
        user:
          data.user,
        accounts:
          data.accounts,
      });

      navigate('/');
    } catch (err: unknown) {
      console.error(
        'Zenimonies password login error:',
        err
      );

      setError(
        getServerError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // PASSKEY LOGIN
  // ==========================================================

  const handlePasskeyLogin =
    async () => {
      if (
        loading ||
        passkeyLoading
      ) {
        return;
      }

      setError('');

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setError(
          'Enter your email address first, then continue with Passkey.'
        );

        return;
      }

      if (
        passkeyFallback ||
        passkeyFailures >=
          MAX_PASSKEY_FAILURES
      ) {
        setPasskeyFallback(
          true
        );

        setError(
          'Passkey authentication is unavailable. Please sign in with your password.'
        );

        return;
      }

      try {
        setPasskeyLoading(
          true
        );

        // ======================================================
        // 1. REQUEST PASSKEY CHALLENGE
        // ======================================================

        const optionsResponse =
          await fetch(
            `${API_URL}/api/passkey/login/options`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  email:
                    cleanEmail,
                }),
            }
          );

        let optionsData:
          PasskeyLoginOptionsResponse;

        try {
          optionsData =
            await optionsResponse.json();
        } catch {
          throw new Error(
            'The Zenimonies server returned an invalid Passkey response.'
          );
        }

        if (
          optionsData.fallback_required ===
            true ||
          optionsData.code ===
            'PASSKEY_FALLBACK_REQUIRED'
        ) {
          setPasskeyFallback(
            true
          );

          setPasskeyFailures(
            MAX_PASSKEY_FAILURES
          );

          setError(
            optionsData.message ||
              'Passkey authentication is temporarily unavailable. Please use your password.'
          );

          return;
        }

        if (
          !optionsResponse.ok ||
          !optionsData.success ||
          !optionsData.options
        ) {
          throw new Error(
            optionsData.message ||
              'Unable to start Passkey login.'
          );
        }

        // ======================================================
        // 2. REAL DEVICE PASSKEY
        // ======================================================

        let authenticationResponse;

        try {
          authenticationResponse =
            await startAuthentication({
              optionsJSON:
                optionsData.options,
            });
        } catch (
          browserError: any
        ) {
          if (
            browserError?.name ===
              'NotAllowedError' ||
            browserError?.name ===
              'AbortError'
          ) {
            setError(
              'Passkey authentication was cancelled. You can try again or use your password.'
            );

            return;
          }

          throw browserError;
        }

        // ======================================================
        // 3. VERIFY WITH BACKEND
        // ======================================================

        const verifyResponse =
          await fetch(
            `${API_URL}/api/passkey/login/verify`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  email:
                    cleanEmail,
                  response:
                    authenticationResponse,
                }),
            }
          );

        let verifyData:
          PasskeyLoginResponse;

        try {
          verifyData =
            await verifyResponse.json();
        } catch {
          throw new Error(
            'The Zenimonies server returned an invalid authentication response.'
          );
        }

        // ======================================================
        // 4. HANDLE FAILURE
        // ======================================================

        if (
          !verifyResponse.ok ||
          !verifyData.success
        ) {
          const serverFailures =
            Number(
              verifyData.failed_attempts ||
                0
            );

          const serverFallback =
            verifyData.fallback_required ===
              true ||
            verifyData.code ===
              'PASSKEY_FALLBACK_REQUIRED';

          if (
            serverFailures > 0
          ) {
            setPasskeyFailures(
              Math.min(
                serverFailures,
                MAX_PASSKEY_FAILURES
              )
            );
          }

          if (
            serverFallback ||
            serverFailures >=
              MAX_PASSKEY_FAILURES
          ) {
            setPasskeyFallback(
              true
            );

            setPasskeyFailures(
              MAX_PASSKEY_FAILURES
            );

            setError(
              verifyData.message ||
                'Passkey authentication failed three times. Please sign in with your password.'
            );

            return;
          }

          if (
            serverFailures > 0
          ) {
            const remaining =
              MAX_PASSKEY_FAILURES -
              serverFailures;

            setError(
              verifyData.message ||
                `Passkey authentication failed. ${remaining} attempt${
                  remaining === 1
                    ? ''
                    : 's'
                } remaining.`
            );

            return;
          }

          setError(
            verifyData.message ||
              'Passkey login failed.'
          );

          return;
        }

        // ======================================================
        // 5. SUCCESS
        // ======================================================

        const responseData =
          verifyData.data ||
          verifyData;

        const token =
          responseData.token;

        if (!token) {
          throw new Error(
            'Passkey login succeeded but no authentication token was returned.'
          );
        }

        saveAuthenticatedSession({
          token,
          user:
            responseData.user,
          accounts:
            responseData.accounts,
        });

        setPasskeyFailures(
          0
        );

        setPasskeyFallback(
          false
        );

        navigate('/');
      } catch (err: unknown) {
        console.error(
          'Zenimonies passkey login error:',
          err
        );

        const errorName =
          err instanceof Error
            ? err.name
            : '';

        const errorMessage =
          err instanceof Error
            ? err.message
            : '';

        const userCancelled =
          errorName ===
            'NotAllowedError' ||
          errorName ===
            'AbortError' ||
          /cancel|abort|not allowed/i.test(
            errorMessage
          );

        if (userCancelled) {
          setError(
            'Passkey authentication was cancelled. You can try again or use your password.'
          );

          return;
        }

        setError(
          errorMessage ||
            'Unable to complete Passkey authentication.'
        );
      } finally {
        setPasskeyLoading(
          false
        );
      }
    };

  const busy =
    loading ||
    passkeyLoading;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '28px 18px',
        background:
          'linear-gradient(145deg, #f5f8f6 0%, #eef4f1 48%, #f8faf9 100%)',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
        }}
      >
        {/* =====================================================
            BRAND
            ===================================================== */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '22px',
          }}
        >
          <ZenimoniesMark />
        </div>

        {/* =====================================================
            MAIN CARD
            ===================================================== */}

        <div
          style={{
            background: '#ffffff',
            border:
              '1px solid rgba(15, 92, 70, 0.10)',
            borderRadius: '26px',
            padding:
              '34px 28px 30px',
            boxShadow:
              '0 20px 55px rgba(16, 38, 31, 0.09)',
          }}
        >
          {/* BRAND NAME */}

          <div
            style={{
              textAlign: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                fontSize: '27px',
                fontWeight: 800,
                letterSpacing:
                  '-0.7px',
                color: '#10251f',
              }}
            >
              Zenimonies
            </div>

            <div
              style={{
                marginTop: '7px',
                fontSize: '14px',
                color: '#71807a',
              }}
            >
              Secure money. Simply.
            </div>
          </div>

          {/* ===================================================
              WELCOME
              =================================================== */}

          <div
            style={{
              marginBottom: '24px',
            }}
          >
            <h1
              style={{
                margin: 0,
                color: '#10251f',
                fontSize: '28px',
                lineHeight: 1.2,
                fontWeight: 750,
                letterSpacing:
                  '-0.5px',
              }}
            >
              Welcome back
            </h1>

            <p
              style={{
                margin:
                  '8px 0 0',
                color: '#697873',
                fontSize: '15px',
                lineHeight: 1.5,
              }}
            >
              Sign in securely to continue
              to your Zenimonies account.
            </p>
          </div>

          {/* ===================================================
              ERROR
              =================================================== */}

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                gap: '10px',
                alignItems:
                  'flex-start',
                padding: '13px 14px',
                marginBottom: '18px',
                borderRadius: '13px',
                background: '#fff3f2',
                border:
                  '1px solid #ffd5d2',
                color: '#b42318',
                fontSize: '13px',
                lineHeight: 1.5,
                wordBreak:
                  'break-word',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                }}
              >
                !
              </span>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* ===================================================
              EMAIL
              =================================================== */}

          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#263832',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="you@example.com"
            autoComplete="username"
            disabled={busy}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              height: '52px',
              padding:
                '0 15px',
              border:
                '1px solid #d8e0dc',
              borderRadius: '13px',
              outline: 'none',
              background: '#fbfcfb',
              color: '#17241f',
              fontSize: '15px',
              transition:
                'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />

          {/* ===================================================
              PASSKEY
              =================================================== */}

          {!passkeyFallback && (
            <>
              <button
                type="button"
                onClick={
                  handlePasskeyLogin
                }
                disabled={busy}
                style={{
                  width: '100%',
                  minHeight: '54px',
                  marginTop: '16px',
                  padding:
                    '0 18px',
                  border:
                    '1px solid #0f5c46',
                  borderRadius: '14px',
                  background:
                    busy
                      ? '#dce9e4'
                      : '#0f5c46',
                  color:
                    busy
                      ? '#58766b'
                      : '#ffffff',
                  fontWeight: 750,
                  fontSize: '15px',
                  letterSpacing:
                    '-0.1px',
                  cursor:
                    busy
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap: '10px',
                  boxShadow:
                    busy
                      ? 'none'
                      : '0 8px 20px rgba(15, 92, 70, 0.17)',
                  transition:
                    'all 0.2s ease',
                }}
              >
                <PasskeyIcon />

                {passkeyLoading
                  ? 'Authenticating securely...'
                  : 'Continue with Passkey'}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap: '7px',
                  marginTop: '11px',
                  color: '#74827d',
                  fontSize: '12px',
                }}
              >
                <ShieldIcon />

                <span>
                  Use Face ID, Touch ID or
                  your device security
                </span>
              </div>

              {passkeyFailures > 0 && (
                <div
                  style={{
                    textAlign:
                      'center',
                    marginTop: '9px',
                    color: '#a15c00',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Passkey attempt{' '}
                  {passkeyFailures} of{' '}
                  {MAX_PASSKEY_FAILURES}
                </div>
              )}

              {/* =================================================
                  DIVIDER
                  ================================================= */}

              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '12px',
                  margin:
                    '23px 0 20px',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background:
                      '#e5ebe8',
                  }}
                />

                <span
                  style={{
                    color: '#9aa7a2',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing:
                      '0.7px',
                  }}
                >
                  OR PASSWORD
                </span>

                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background:
                      '#e5ebe8',
                  }}
                />
              </div>
            </>
          )}

          {/* ===================================================
              PASSWORD
              =================================================== */}

          <form
            onSubmit={
              handleSubmit
            }
            noValidate
          >
            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'space-between',
                marginBottom: '8px',
              }}
            >
              <label
                htmlFor="password"
                style={{
                  color: '#263832',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Password
              </label>

              <Link
                to="/forgot-password"
                style={{
                  color: '#0f5c46',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration:
                    'none',
                }}
              >
                Forgot password?
              </Link>
            </div>

            <div
              style={{
                position:
                  'relative',
                width: '100%',
              }}
            >
              <input
                id="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={busy}
                style={{
                  boxSizing:
                    'border-box',
                  width: '100%',
                  height: '52px',
                  padding:
                    '0 50px 0 15px',
                  border:
                    '1px solid #d8e0dc',
                  borderRadius:
                    '13px',
                  outline: 'none',
                  background:
                    '#fbfcfb',
                  color: '#17241f',
                  fontSize: '15px',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous
                  )
                }
                disabled={busy}
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                title={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                style={{
                  position:
                    'absolute',
                  right: '10px',
                  top: '50%',
                  transform:
                    'translateY(-50%)',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  border: 'none',
                  borderRadius:
                    '9px',
                  background:
                    'transparent',
                  color: '#71807a',
                  cursor:
                    busy
                      ? 'not-allowed'
                      : 'pointer',
                  padding: 0,
                }}
              >
                <EyeIcon
                  visible={
                    showPassword
                  }
                />
              </button>
            </div>

            {/* =================================================
                SIGN IN
                ================================================= */}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                height: '52px',
                marginTop: '17px',
                border: 'none',
                borderRadius: '14px',
                background:
                  busy
                    ? '#e1e8e5'
                    : '#172a24',
                color:
                  busy
                    ? '#708079'
                    : '#ffffff',
                fontWeight: 750,
                fontSize: '15px',
                cursor:
                  busy
                    ? 'not-allowed'
                    : 'pointer',
                transition:
                  'all 0.2s ease',
              }}
            >
              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </button>
          </form>

          {/* ===================================================
              PASSKEY FALLBACK
              =================================================== */}

          {passkeyFallback && (
            <div
              style={{
                marginTop: '16px',
                padding: '13px',
                borderRadius: '13px',
                background: '#f5f7f6',
                border:
                  '1px solid #e1e7e4',
                color: '#53635d',
                fontSize: '12px',
                lineHeight: 1.5,
                textAlign:
                  'center',
              }}
            >
              Passkey authentication has
              reached the maximum number of
              failed attempts. Please use
              your password to sign in.
            </div>
          )}

          {/* ===================================================
              REGISTER
              =================================================== */}

          <div
            style={{
              marginTop: '26px',
              paddingTop: '22px',
              borderTop:
                '1px solid #edf1ef',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                color: '#71807a',
                fontSize: '13px',
              }}
            >
              New to Zenimonies?
            </span>{' '}

            <Link
              to="/register"
              style={{
                color: '#0f5c46',
                fontSize: '13px',
                fontWeight: 750,
                textDecoration:
                  'none',
              }}
            >
              Create an account
            </Link>
          </div>
        </div>

        {/* =====================================================
            SECURITY FOOTER
            ===================================================== */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'center',
            gap: '7px',
            marginTop: '17px',
            color: '#7c8984',
            fontSize: '11px',
          }}
        >
          <ShieldIcon />

          <span>
            Secure access to your Zenimonies account
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
