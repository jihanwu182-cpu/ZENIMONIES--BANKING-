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
  // NORMAL PASSWORD LOGIN
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

      // ========================================================
      // SERVER SUCCESS CHECK
      // ========================================================

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

      // ========================================================
      // TOKEN
      // ========================================================

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
      // TOKEN REQUIRED
      // ========================================================

      if (!token) {
        setError(
          data.message ||
            'The server did not return an authentication token.'
        );

        return;
      }

      // ========================================================
      // SAVE SESSION
      // ========================================================

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
          'Enter your email address first, then tap Sign in with Passkey.'
        );

        return;
      }

      // --------------------------------------------------------
      // FRONTEND FALLBACK STATE
      //
      // Backend remains authoritative.
      // --------------------------------------------------------

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

        // ======================================================
        // BACKEND FALLBACK RESPONSE
        // ======================================================

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
          /*
           * Cancelling Face ID, Touch ID,
           * device PIN, or the Passkey prompt
           * is NOT counted as a failed
           * cryptographic authentication attempt.
           */

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
        // BACKEND FAILURE RESPONSE
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

          // ----------------------------------------------
          // USE SERVER COUNTER
          // ----------------------------------------------

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

          // ----------------------------------------------
          // FORCE PASSWORD FALLBACK
          // ----------------------------------------------

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

          // ----------------------------------------------
          // NORMAL PASSKEY FAILURE
          // ----------------------------------------------

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
        // 4. SUCCESS
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

        // ======================================================
        // 5. SAVE SERVER SESSION
        // ======================================================

        saveAuthenticatedSession({
          token,
          user:
            responseData.user,
          accounts:
            responseData.accounts,
        });

        // ======================================================
        // 6. RESET LOCAL STATE
        // ======================================================

        setPasskeyFailures(
          0
        );

        setPasskeyFallback(
          false
        );

        // ======================================================
        // 7. DASHBOARD
        // ======================================================

        navigate('/');
      } catch (err: unknown) {
        console.error(
          'Zenimonies passkey login error:',
          err
        );

        // ------------------------------------------------------
        // DO NOT COUNT USER CANCELLATION
        // ------------------------------------------------------

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

        /*
         * Important:
         *
         * We do NOT increment passkeyFailures
         * here.
         *
         * The backend is responsible for counting
         * actual failed WebAuthn authentication
         * attempts.
         */

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
        minHeight:
          '100vh',

        display:
          'flex',

        alignItems:
          'center',

        justifyContent:
          'center',

        padding:
          '24px',

        background:
          '#f5f7fb',
      }}
    >
      <div
        style={{
          width:
            '100%',

          maxWidth:
            '420px',

          background:
            '#ffffff',

          padding:
            '32px',

          borderRadius:
            '16px',

          boxShadow:
            '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* =====================================================
            BRAND
            ===================================================== */}

        <h1
          style={{
            marginTop:
              0,

            marginBottom:
              '8px',

            textAlign:
              'center',

            color:
              '#172033',
          }}
        >
          Zenimonies
        </h1>

        <p
          style={{
            textAlign:
              'center',

            color:
              '#667085',

            marginBottom:
              '28px',
          }}
        >
          Sign in to your account
        </p>

        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (
          <div
            role="alert"
            style={{
              padding:
                '14px',

              marginBottom:
                '18px',

              borderRadius:
                '8px',

              background:
                '#fee4e2',

              color:
                '#b42318',

              fontSize:
                '14px',

              lineHeight:
                1.5,

              wordBreak:
                'break-word',
            }}
          >
            {error}
          </div>
        )}

        {/* =====================================================
            EMAIL
            ===================================================== */}

        <label
          htmlFor="email"
          style={{
            display:
              'block',

            marginBottom:
              '6px',

            fontWeight:
              600,

            color:
              '#172033',
          }}
        >
          Email
        </label>

        <input
          id="email"

          type="email"

          value={email}

          onChange={(
            event
          ) =>
            setEmail(
              event.target.value
            )
          }

          placeholder="Enter your email"

          autoComplete="username"

          disabled={busy}

          style={{
            boxSizing:
              'border-box',

            width:
              '100%',

            padding:
              '12px',

            marginBottom:
              '14px',

            border:
              '1px solid #d0d5dd',

            borderRadius:
              '8px',

            outline:
              'none',

            fontSize:
              '15px',
          }}
        />

        {/* =====================================================
            PASSKEY
            ===================================================== */}

        {!passkeyFallback && (
          <>
            <button
              type="button"

              onClick={
                handlePasskeyLogin
              }

              disabled={busy}

              style={{
                width:
                  '100%',

                padding:
                  '14px',

                border:
                  'none',

                borderRadius:
                  '8px',

                background:
                  '#0b5cff',

                color:
                  '#ffffff',

                fontWeight:
                  700,

                fontSize:
                  '15px',

                cursor:
                  busy
                    ? 'not-allowed'
                    : 'pointer',

                opacity:
                  busy
                    ? 0.7
                    : 1,

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                gap:
                  '10px',
              }}
            >
              <span
                style={{
                  fontSize:
                    '21px',

                  lineHeight:
                    1,
                }}
              >
                🔐
              </span>

              {passkeyLoading
                ? 'Verifying Passkey...'
                : 'Sign in with Passkey'}
            </button>

            {passkeyFailures > 0 && (
              <p
                style={{
                  textAlign:
                    'center',

                  color:
                    '#b54708',

                  fontSize:
                    '12px',

                  marginTop:
                    '9px',

                  marginBottom:
                    '4px',
                }}
              >
                Passkey attempt{' '}
                {passkeyFailures} of{' '}
                {MAX_PASSKEY_FAILURES}
              </p>
            )}

            <p
              style={{
                textAlign:
                  'center',

                color:
                  '#667085',

                fontSize:
                  '12px',

                lineHeight:
                  1.5,

                marginTop:
                  '9px',

                marginBottom:
                  '20px',
              }}
            >
              Use Face ID, Touch ID,
              your device Passkey,
              or security key.
            </p>

            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '12px',

                margin:
                  '4px 0 20px',

                color:
                  '#98a2b3',

                fontSize:
                  '13px',
              }}
            >
              <div
                style={{
                  flex:
                    1,

                  height:
                    '1px',

                  background:
                    '#eaecf0',
                }}
              />

              <span>
                OR
              </span>

              <div
                style={{
                  flex:
                    1,

                  height:
                    '1px',

                  background:
                    '#eaecf0',
                }}
              />
            </div>
          </>
        )}

        {/* =====================================================
            PASSWORD
            ===================================================== */}

        <form
          onSubmit={
            handleSubmit
          }

          noValidate
        >
          <div
            style={{
              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'space-between',

              marginBottom:
                '6px',
            }}
          >
            <label
              htmlFor="password"
              style={{
                fontWeight:
                  600,

                color:
                  '#172033',
              }}
            >
              Password
            </label>

            <Link
              to="/forgot-password"

              style={{
                color:
                  '#0b5cff',

                fontWeight:
                  600,

                fontSize:
                  '13px',

                textDecoration:
                  'none',
              }}
            >
              Forgot Password?
            </Link>
          </div>

          <div
            style={{
              position:
                'relative',

              width:
                '100%',

              marginBottom:
                '22px',
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

              onChange={(
                event
              ) =>
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

                width:
                  '100%',

                padding:
                  '12px 48px 12px 12px',

                border:
                  '1px solid #d0d5dd',

                borderRadius:
                  '8px',

                outline:
                  'none',

                fontSize:
                  '15px',
              }}
            />

            <button
              type="button"

              onClick={() =>
                setShowPassword(
                  (
                    previous
                  ) =>
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

                right:
                  '10px',

                top:
                  '50%',

                transform:
                  'translateY(-50%)',

                border:
                  'none',

                background:
                  'transparent',

                cursor:
                  busy
                    ? 'not-allowed'
                    : 'pointer',

                fontSize:
                  '20px',

                lineHeight:
                  1,

                padding:
                  '4px',
              }}
            >
              {showPassword
                ? '🙈'
                : '👁️'}
            </button>
          </div>

          <button
            type="submit"

            disabled={busy}

            style={{
              width:
                '100%',

              padding:
                '13px',

              border:
                'none',

              borderRadius:
                '8px',

              background:
                '#0b5cff',

              color:
                '#ffffff',

              fontWeight:
                600,

              fontSize:
                '15px',

              cursor:
                busy
                  ? 'not-allowed'
                  : 'pointer',

              opacity:
                busy
                  ? 0.7
                  : 1,
            }}
          >
            {loading
              ? 'Signing in...'
              : 'Sign In'}
          </button>
        </form>

        {/* =====================================================
            PASSKEY FALLBACK NOTICE
            ===================================================== */}

        {passkeyFallback && (
          <div
            style={{
              marginTop:
                '18px',

              padding:
                '12px',

              borderRadius:
                '8px',

              background:
                '#f2f4f7',

              color:
                '#475467',

              fontSize:
                '13px',

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

        {/* =====================================================
            REGISTER
            ===================================================== */}

        <p
          style={{
            textAlign:
              'center',

            marginTop:
              '24px',

            color:
              '#667085',
          }}
        >
          Don&apos;t have an account?{' '}

          <Link
            to="/register"

            style={{
              color:
                '#0b5cff',

              fontWeight:
                600,

              textDecoration:
                'none',
            }}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
