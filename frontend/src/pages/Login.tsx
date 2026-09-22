import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import { Link, useNavigate } from 'react-router-dom';

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

  sessionStorage.setItem(
  'zenimonies_token',
  token
);

sessionStorage.setItem(
  'token',
  token
);

  if (data.user) {
    localStorage.setItem(
      'zenimonies_user',
      JSON.stringify(data.user)
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

const LogoMark: React.FC = () => (
  <div
    style={{
      width: '76px',
      height: '76px',
      borderRadius: '22px',
      background:
        'linear-gradient(145deg, #147254, #07513d)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow:
        '0 12px 28px rgba(8, 81, 61, 0.20)',
    }}
  >
    <span
      style={{
        color: '#ffffff',
        fontFamily:
          'Georgia, "Times New Roman", serif',
        fontSize: '53px',
        fontWeight: 700,
        lineHeight: 1,
        fontStyle: 'italic',
      }}
    >
      Z
    </span>
  </div>
);

const EmailIcon: React.FC = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M4 7L12 13L20 7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M8 10V7.5C8 5.57 9.57 4 11.5 4H12.5C14.43 4 16 5.57 16 7.5V10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    <circle
      cx="12"
      cy="15"
      r="1.2"
      fill="currentColor"
    />
  </svg>
);

const EyeIcon: React.FC<{
  visible: boolean;
}> = ({
  visible,
}) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    {visible ? (
      <>
        <path
          d="M2.5 12C2.5 12 6 5.5 12 5.5C18 5.5 21.5 12 21.5 12C21.5 12 18 18.5 12 18.5C6 18.5 2.5 12 2.5 12Z"
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

const FingerprintIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M16 5.5C11.2 5.5 7.3 9.4 7.3 14.2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path
      d="M24.7 14.2C24.7 9.4 20.8 5.5 16 5.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path
      d="M10.2 19.8C9.1 18.2 8.5 16.2 8.5 14.2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path
      d="M23.5 14.2C23.5 18.8 21.1 22.8 17.4 25"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path
      d="M13.1 25.3C10.5 22.8 9 19.2 9 15.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path
      d="M13.2 15.1C13.2 13.5 14.45 12.2 16 12.2C17.55 12.2 18.8 13.5 18.8 15.1C18.8 20 17.1 23.4 14.6 26.1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path
      d="M11.2 14.2C11.2 11.5 13.35 9.3 16 9.3C18.65 9.3 20.8 11.5 20.8 14.2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
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

const GlobeIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.7"
    />

    <path
      d="M3 12H21"
      stroke="currentColor"
      strokeWidth="1.7"
    />

    <path
      d="M12 3C14.4 5.4 15.5 8.5 15.5 12C15.5 15.5 14.4 18.6 12 21"
      stroke="currentColor"
      strokeWidth="1.7"
    />

    <path
      d="M12 3C9.6 5.4 8.5 8.5 8.5 12C8.5 15.5 9.6 18.6 12 21"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

// ============================================================
// LOGIN
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

      // ========================================================
      // OTP
      // ========================================================

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

      // ========================================================
      // PHONE VERIFICATION
      // ========================================================

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

      // ========================================================
      // TOKEN
      // ========================================================

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
        // 1. REQUEST PASSKEY OPTIONS
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
        // 2. DEVICE AUTHENTICATION
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
        // 3. BACKEND VERIFICATION
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
        // 4. FAILURE
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

/*
 * ==========================================================
 * SAVE PASSKEY AUTHENTICATION SESSION
 * ==========================================================
 */

saveAuthenticatedSession({
  token,
  user:
    responseData.user,
  accounts:
    responseData.accounts,
});

/*
 * ==========================================================
 * VERIFY AUTHENTICATION STORAGE
 * ==========================================================
 *
 * We only check whether a token exists.
 * The actual token is NEVER displayed or logged.
 */

const localZenimoniesToken =
  localStorage.getItem(
    'zenimonies_token'
  );

const localToken =
  localStorage.getItem(
    'token'
  );

const sessionZenimoniesToken =
  sessionStorage.getItem(
    'zenimonies_token'
  );

const sessionToken =
  sessionStorage.getItem(
    'token'
  );

console.log(
  '========== ZENIMONIES PASSKEY STORAGE CHECK =========='
);

console.log(
  'localStorage zenimonies_token:',
  Boolean(localZenimoniesToken)
);

console.log(
  'localStorage token:',
  Boolean(localToken)
);

console.log(
  'sessionStorage zenimonies_token:',
  Boolean(sessionZenimoniesToken)
);

console.log(
  'sessionStorage token:',
  Boolean(sessionToken)
);

if (
  !localZenimoniesToken &&
  !localToken &&
  !sessionZenimoniesToken &&
  !sessionToken
) {
  throw new Error(
    'Passkey login succeeded, but the secure authentication session could not be stored on this device. Please use password login.'
  );
}

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
        padding:
          '32px 16px 22px',
        display: 'flex',
        justifyContent:
          'center',
        background:
          'linear-gradient(145deg, #f2f8f5 0%, #f8fbfa 45%, #edf6f2 100%)',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '470px',
        }}
      >
        {/* =====================================================
            BRAND
            ===================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginBottom: '25px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'center',
              marginBottom:
                '12px',
            }}
          >
            <LogoMark />
          </div>

          <div
            style={{
              color: '#10261f',
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize: '36px',
              fontWeight: 700,
              letterSpacing:
                '-1.4px',
              lineHeight: 1.05,
            }}
          >
            Zenimonies
          </div>

          <div
            style={{
              marginTop: '8px',
              color: '#667872',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing:
                '3px',
            }}
          >
            SECURE MONEY. SIMPLY.
          </div>
        </div>

        {/* =====================================================
            WELCOME
            ===================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <h1
            style={{
              margin: 0,
              color: '#10261f',
              fontSize: '31px',
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing:
                '-0.8px',
            }}
          >
            Welcome back
          </h1>

          <p
            style={{
              maxWidth: '390px',
              margin:
                '8px auto 0',
              color: '#697a74',
              fontSize: '16px',
              lineHeight: 1.45,
            }}
          >
            Sign in securely to continue to
            your Zenimonies account.
          </p>
        </div>

        {/* =====================================================
            MAIN CARD
            ===================================================== */}

        <div
          style={{
            background:
              'rgba(255,255,255,0.94)',
            border:
              '1px solid rgba(15, 92, 70, 0.10)',
            borderRadius: '27px',
            padding:
              '30px 22px 25px',
            boxShadow:
              '0 18px 50px rgba(25, 60, 48, 0.08)',
            backdropFilter:
              'blur(10px)',
          }}
        >
          {/* ===================================================
              ERROR
              =================================================== */}

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems:
                  'flex-start',
                gap: '10px',
                padding:
                  '13px 14px',
                marginBottom:
                  '18px',
                borderRadius:
                  '13px',
                background:
                  '#fff2f1',
                border:
                  '1px solid #ffd1cd',
                color:
                  '#b42318',
                fontSize: '13px',
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  fontWeight: 900,
                  fontSize: '17px',
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
              marginBottom:
                '8px',
              color:
                '#17332a',
              fontSize: '14px',
              fontWeight: 750,
            }}
          >
            Email address
          </label>

          <div
            style={{
              position:
                'relative',
              marginBottom:
                '21px',
            }}
          >
            <div
              style={{
                position:
                  'absolute',
                left: '16px',
                top: '50%',
                transform:
                  'translateY(-50%)',
                color:
                  '#83918c',
                pointerEvents:
                  'none',
                display: 'flex',
              }}
            >
              <EmailIcon />
            </div>

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
                boxSizing:
                  'border-box',
                width: '100%',
                height: '54px',
                padding:
                  '0 15px 0 50px',
                border:
                  '1px solid #d5dfdb',
                borderRadius:
                  '14px',
                outline: 'none',
                background:
                  '#ffffff',
                color:
                  '#17241f',
                fontSize:
                  '15px',
              }}
            />
          </div>

          {/* ===================================================
              PASSWORD LABEL
              =================================================== */}

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              marginBottom:
                '8px',
            }}
          >
            <label
              htmlFor="password"
              style={{
                color:
                  '#17332a',
                fontSize: '14px',
                fontWeight: 750,
              }}
            >
              Password
            </label>

            <Link
              to="/forgot-password"
              style={{
                color:
                  '#0f6a50',
                fontSize:
                  '13px',
                fontWeight:
                  750,
                textDecoration:
                  'none',
              }}
            >
              Forgot password?
            </Link>
          </div>

          {/* ===================================================
              PASSWORD INPUT
              =================================================== */}

          <div
            style={{
              position:
                'relative',
            }}
          >
            <div
              style={{
                position:
                  'absolute',
                left: '16px',
                top: '50%',
                transform:
                  'translateY(-50%)',
                color:
                  '#83918c',
                pointerEvents:
                  'none',
                display: 'flex',
              }}
            >
              <LockIcon />
            </div>

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
                height: '54px',
                padding:
                  '0 52px 0 50px',
                border:
                  '1px solid #d5dfdb',
                borderRadius:
                  '14px',
                outline: 'none',
                background:
                  '#ffffff',
                color:
                  '#17241f',
                fontSize:
                  '15px',
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
                color:
                  '#788681',
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

          {/* ===================================================
              PRIMARY SIGN IN
              =================================================== */}

          <form
            onSubmit={
              handleSubmit
            }
            noValidate
          >
            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                height: '55px',
                marginTop:
                  '17px',
                border: 'none',
                borderRadius:
                  '15px',
                background:
                  busy
                    ? '#dfe8e4'
                    : '#12362c',
                color:
                  busy
                    ? '#71817b'
                    : '#ffffff',
                fontSize:
                  '16px',
                fontWeight: 800,
                cursor:
                  busy
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow:
                  busy
                    ? 'none'
                    : '0 9px 22px rgba(18, 54, 44, 0.16)',
              }}
            >
              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </button>
          </form>

          {/* ===================================================
              PASSKEY DIVIDER
              =================================================== */}

          {!passkeyFallback && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '12px',
                  margin:
                    '23px 0 17px',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background:
                      '#dce5e1',
                  }}
                />

                <span
                  style={{
                    color:
                      '#87948f',
                    fontSize:
                      '11px',
                    fontWeight:
                      800,
                    letterSpacing:
                      '1px',
                    whiteSpace:
                      'nowrap',
                  }}
                >
                  OR SIGN IN WITH PASSKEY
                </span>

                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background:
                      '#dce5e1',
                  }}
                />
              </div>

              {/* =================================================
                  PASSKEY BUTTON
                  ================================================= */}

              <button
                type="button"
                onClick={
                  handlePasskeyLogin
                }
                disabled={busy}
                style={{
                  width: '100%',
                  minHeight:
                    '56px',
                  padding:
                    '0 16px',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap: '13px',
                  border:
                    '1px solid #b9d9cf',
                  borderRadius:
                    '15px',
                  background:
                    busy
                      ? '#f0f6f3'
                      : '#f3faf7',
                  color:
                    '#0d674e',
                  fontSize:
                    '15px',
                  fontWeight:
                    800,
                  cursor:
                    busy
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    busy ? 0.7 : 1,
                }}
              >
                <FingerprintIcon />

                <span>
                  {passkeyLoading
                    ? 'Authenticating...'
                    : 'Continue with Passkey'}
                </span>

                <span
                  style={{
                    marginLeft:
                      'auto',
                    fontSize:
                      '25px',
                    fontWeight:
                      400,
                    lineHeight: 1,
                  }}
                >
                  ›
                </span>
              </button>

              {/* =================================================
                  PASSKEY DESCRIPTION
                  ================================================= */}

              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap: '8px',
                  marginTop:
                    '12px',
                  color:
                    '#74837d',
                  fontSize:
                    '12px',
                  lineHeight:
                    1.4,
                  textAlign:
                    'center',
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
                    marginTop:
                      '9px',
                    color:
                      '#a15c00',
                    fontSize:
                      '12px',
                    fontWeight:
                      650,
                  }}
                >
                  Passkey attempt{' '}
                  {passkeyFailures} of{' '}
                  {MAX_PASSKEY_FAILURES}
                </div>
              )}
            </>
          )}

          {/* ===================================================
              PASSWORD FALLBACK MESSAGE
              =================================================== */}

          {passkeyFallback && (
            <div
              style={{
                marginTop:
                  '17px',
                padding:
                  '13px',
                borderRadius:
                  '13px',
                background:
                  '#f4f7f5',
                border:
                  '1px solid #e0e8e4',
                color:
                  '#52625c',
                fontSize:
                  '12px',
                lineHeight:
                  1.5,
                textAlign:
                  'center',
              }}
            >
              Passkey authentication has
              reached the maximum number of
              failed attempts. Please use your
              password to sign in.
            </div>
          )}

          {/* ===================================================
              CREATE ACCOUNT
              =================================================== */}

          <div
            style={{
              marginTop:
                '25px',
              paddingTop:
                '21px',
              borderTop:
                '1px solid #e8eeeb',
              textAlign:
                'center',
            }}
          >
            <span
              style={{
                color:
                  '#74827d',
                fontSize:
                  '13px',
              }}
            >
              New to Zenimonies?
            </span>{' '}

            <Link
              to="/register"
              style={{
                color:
                  '#0d674e',
                fontSize:
                  '13px',
                fontWeight:
                  800,
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
            alignItems:
              'center',
            justifyContent:
              'space-between',
            gap: '10px',
            marginTop:
              '20px',
            padding:
              '0 5px',
            color:
              '#71817b',
            fontSize:
              '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: '5px',
            }}
          >
            <ShieldIcon />
            <span>
              Your data is protected
            </span>
          </div>

          <div
            style={{
              width: '1px',
              height: '17px',
              background:
                '#cbd7d2',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: '5px',
            }}
          >
            <LockIcon />
            <span>
              Secure access
            </span>
          </div>

          <div
            style={{
              width: '1px',
              height: '17px',
              background:
                '#cbd7d2',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: '5px',
            }}
          >
            <GlobeIcon />
            <span>
              Global access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
