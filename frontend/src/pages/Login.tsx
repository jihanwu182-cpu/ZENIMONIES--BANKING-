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
// ZENIMONIES LOGO
// ============================================================

const ZenimoniesLogo: React.FC = () => (
  <div
    style={{
      textAlign: 'center',
      userSelect: 'none',
    }}
  >
    <div
      style={{
        color: '#08784f',
        fontSize: '42px',
        fontWeight: 900,
        letterSpacing: '-2.5px',
        lineHeight: 1,
        fontFamily:
          'Arial, Helvetica, sans-serif',
      }}
    >
      Zenimonies
    </div>

    <div
      style={{
        marginTop: '9px',
        color: '#416c5c',
        fontSize: '13px',
        fontWeight: 800,
        letterSpacing: '7px',
        paddingLeft: '7px',
      }}
    >
      BANKING
    </div>
  </div>
);

// ============================================================
// LOGIN ILLUSTRATION
// ============================================================

const LoginIllustration: React.FC = () => (
  <div
    style={{
      width: '190px',
      height: '190px',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg
      width="190"
      height="190"
      viewBox="0 0 190 190"
      fill="none"
      aria-hidden="true"
    >
      {/* Soft background */}
      <circle
        cx="95"
        cy="95"
        r="75"
        fill="#EDF9F3"
      />

      {/* Decorative marks */}
      <path
        d="M30 70L22 63"
        stroke="#79D5AB"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M28 96H17"
        stroke="#79D5AB"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M31 121L23 128"
        stroke="#79D5AB"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M160 60L168 52"
        stroke="#79D5AB"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M164 87H175"
        stroke="#79D5AB"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Phone */}
      <rect
        x="55"
        y="29"
        width="78"
        height="132"
        rx="19"
        fill="#FFFFFF"
        stroke="#08784F"
        strokeWidth="7"
      />

      {/* Phone speaker */}
      <rect
        x="80"
        y="38"
        width="28"
        height="5"
        rx="2.5"
        fill="#9DDBBB"
      />

      {/* Login card */}
      <rect
        x="69"
        y="66"
        width="58"
        height="53"
        rx="12"
        fill="#0A9A55"
      />

      {/* Dots */}
      <circle
        cx="84"
        cy="86"
        r="4"
        fill="#FFFFFF"
      />

      <circle
        cx="98"
        cy="86"
        r="4"
        fill="#FFFFFF"
      />

      <circle
        cx="112"
        cy="86"
        r="4"
        fill="#FFFFFF"
      />

      {/* Speech tail */}
      <path
        d="M82 119L82 132L96 119H82Z"
        fill="#0A9A55"
      />

      {/* Bottom phone button */}
      <circle
        cx="94"
        cy="148"
        r="6"
        fill="#D7F0E3"
      />

      {/* Security shield */}
      <path
        d="M137 104L160 113V132C160 148 150 157 137 162C124 157 114 148 114 132V113L137 104Z"
        fill="#0A9A55"
      />

      <path
        d="M137 115L148 119V131C148 139 144 144 137 148C130 144 126 139 126 131V119L137 115Z"
        fill="#FFFFFF"
      />

      <rect
        x="132"
        y="129"
        width="10"
        height="9"
        rx="2"
        fill="#0A9A55"
      />

      <path
        d="M134 129V126C134 124.34 135.34 123 137 123C138.66 123 140 124.34 140 126V129"
        stroke="#0A9A55"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

// ============================================================
// ICONS
// ============================================================

const EmailIcon: React.FC = () => (
  <svg
    width="21"
    height="21"
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
    width="21"
    height="21"
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
    width="21"
    height="21"
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
    width="28"
    height="28"
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
    width="19"
    height="19"
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
          'ZENIMONIES Passkey storage check:',
          {
            localZenimoniesToken:
              Boolean(
                localZenimoniesToken
              ),
            localToken:
              Boolean(localToken),
            sessionZenimoniesToken:
              Boolean(
                sessionZenimoniesToken
              ),
            sessionToken:
              Boolean(sessionToken),
          }
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
          '26px 16px 32px',
        background:
          '#F0F9F5',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
        }}
      >
        {/* ====================================================
            MAIN WHITE CARD
            ==================================================== */}

        <div
          style={{
            background:
              '#FFFFFF',
            border:
              '1px solid #DDEDE5',
            borderRadius:
              '30px',
            padding:
              '42px 28px 30px',
            boxShadow:
              '0 10px 35px rgba(15, 85, 60, 0.06)',
            boxSizing:
              'border-box',
          }}
        >
          {/* ==================================================
              BRAND
              ================================================== */}

          <ZenimoniesLogo />

          {/* ==================================================
              ILLUSTRATION
              ================================================== */}

          <div
            style={{
              marginTop:
                '22px',
              marginBottom:
                '5px',
            }}
          >
            <LoginIllustration />
          </div>

          {/* ==================================================
              TITLE
              ================================================== */}

          <div
            style={{
              textAlign:
                'center',
              marginBottom:
                '27px',
            }}
          >
            <h1
              style={{
                margin: 0,
                color:
                  '#073F2D',
                fontSize:
                  '31px',
                fontWeight:
                  900,
                letterSpacing:
                  '-1px',
                lineHeight:
                  1.15,
              }}
            >
              Welcome Back
            </h1>

            <p
              style={{
                margin:
                  '10px auto 0',
                maxWidth:
                  '390px',
                color:
                  '#58766A',
                fontSize:
                  '16px',
                lineHeight:
                  1.45,
              }}
            >
              Sign in securely to your
              Zenimonies account.
            </p>
          </div>

          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (
            <div
              role="alert"
              style={{
                marginBottom:
                  '18px',
                padding:
                  '13px 14px',
                borderRadius:
                  '13px',
                background:
                  '#FFF4F3',
                border:
                  '1px solid #FFD5D1',
                color:
                  '#B42318',
                fontSize:
                  '13px',
                lineHeight:
                  1.45,
              }}
            >
              {error}
            </div>
          )}

          {/* ==================================================
              FORM
              ================================================== */}

          <form
            onSubmit={
              handleSubmit
            }
            noValidate
          >
            {/* =================================================
                EMAIL
                ================================================= */}

            <label
              htmlFor="email"
              style={{
                display:
                  'block',
                marginBottom:
                  '8px',
                color:
                  '#173F31',
                fontSize:
                  '15px',
                fontWeight:
                  800,
              }}
            >
              Email address
            </label>

            <div
              style={{
                position:
                  'relative',
                marginBottom:
                  '19px',
              }}
            >
              <div
                style={{
                  position:
                    'absolute',
                  left:
                    '16px',
                  top:
                    '50%',
                  transform:
                    'translateY(-50%)',
                  color:
                    '#78968A',
                  display:
                    'flex',
                  pointerEvents:
                    'none',
                }}
              >
                <EmailIcon />
              </div>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                placeholder="Enter your email address"
                autoComplete="username"
                disabled={busy}
                style={{
                  boxSizing:
                    'border-box',
                  width:
                    '100%',
                  height:
                    '56px',
                  padding:
                    '0 16px 0 49px',
                  border:
                    '1.5px solid #D6E5DE',
                  borderRadius:
                    '15px',
                  outline:
                    'none',
                  background:
                    '#FFFFFF',
                  color:
                    '#17352B',
                  fontSize:
                    '15px',
                }}
              />
            </div>

            {/* =================================================
                PASSWORD
                ================================================= */}

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  '8px',
              }}
            >
              <label
                htmlFor="password"
                style={{
                  color:
                    '#173F31',
                  fontSize:
                    '15px',
                  fontWeight:
                    800,
                }}
              >
                Password
              </label>

              <Link
                to="/forgot-password"
                style={{
                  color:
                    '#08784F',
                  fontSize:
                    '13px',
                  fontWeight:
                    800,
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
              }}
            >
              <div
                style={{
                  position:
                    'absolute',
                  left:
                    '16px',
                  top:
                    '50%',
                  transform:
                    'translateY(-50%)',
                  color:
                    '#78968A',
                  display:
                    'flex',
                  pointerEvents:
                    'none',
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
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
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
                  height:
                    '56px',
                  padding:
                    '0 52px 0 49px',
                  border:
                    '1.5px solid #D6E5DE',
                  borderRadius:
                    '15px',
                  outline:
                    'none',
                  background:
                    '#FFFFFF',
                  color:
                    '#17352B',
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
                style={{
                  position:
                    'absolute',
                  right:
                    '10px',
                  top:
                    '50%',
                  transform:
                    'translateY(-50%)',
                  width:
                    '38px',
                  height:
                    '38px',
                  border:
                    'none',
                  borderRadius:
                    '9px',
                  background:
                    'transparent',
                  color:
                    '#78968A',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  padding:
                    0,
                  cursor:
                    busy
                      ? 'not-allowed'
                      : 'pointer',
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
                width:
                  '100%',
                height:
                  '58px',
                marginTop:
                  '20px',
                border:
                  'none',
                borderRadius:
                  '15px',
                background:
                  busy
                    ? '#A9BEB5'
                    : '#078B50',
                color:
                  '#FFFFFF',
                fontSize:
                  '16px',
                fontWeight:
                  900,
                cursor:
                  busy
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow:
                  busy
                    ? 'none'
                    : '0 8px 18px rgba(7, 139, 80, 0.18)',
              }}
            >
              {loading
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          {/* ==================================================
              PASSKEY
              ================================================== */}

          {!passkeyFallback && (
            <>
              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap:
                    '12px',
                  margin:
                    '23px 0 17px',
                }}
              >
                <div
                  style={{
                    flex:
                      1,
                    height:
                      '1px',
                    background:
                      '#E0EBE5',
                  }}
                />

                <span
                  style={{
                    color:
                      '#82958D',
                    fontSize:
                      '10px',
                    fontWeight:
                      900,
                    letterSpacing:
                      '1px',
                    whiteSpace:
                      'nowrap',
                  }}
                >
                  OR USE PASSKEY
                </span>

                <div
                  style={{
                    flex:
                      1,
                    height:
                      '1px',
                    background:
                      '#E0EBE5',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={
                  handlePasskeyLogin
                }
                disabled={busy}
                style={{
                  width:
                    '100%',
                  minHeight:
                    '56px',
                  padding:
                    '0 15px',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap:
                    '11px',
                  border:
                    '1.5px solid #BBDDCF',
                  borderRadius:
                    '15px',
                  background:
                    '#F0FAF5',
                  color:
                    '#08784F',
                  fontSize:
                    '14px',
                  fontWeight:
                    850,
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
                <FingerprintIcon />

                <span>
                  {passkeyLoading
                    ? 'Authenticating...'
                    : 'Continue with Passkey'}
                </span>
              </button>

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  gap:
                    '7px',
                  marginTop:
                    '11px',
                  color:
                    '#6E857A',
                  fontSize:
                    '11px',
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
                    marginTop:
                      '9px',
                    textAlign:
                      'center',
                    color:
                      '#A15C00',
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

          {/* ==================================================
              PASSKEY FALLBACK
              ================================================== */}

          {passkeyFallback && (
            <div
              style={{
                marginTop:
                  '18px',
                padding:
                  '13px',
                borderRadius:
                  '13px',
                background:
                  '#F2F7F4',
                border:
                  '1px solid #DCE8E2',
                color:
                  '#526B60',
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

          {/* ==================================================
              REGISTER
              ================================================== */}

          <div
            style={{
              marginTop:
                '24px',
              paddingTop:
                '20px',
              borderTop:
                '1px solid #E7EFEB',
              textAlign:
                'center',
            }}
          >
            <span
              style={{
                color:
                  '#6F8279',
                fontSize:
                  '13px',
              }}
            >
              Don't have a Zenimonies account?
            </span>{' '}

            <Link
              to="/register"
              style={{
                color:
                  '#08784F',
                fontSize:
                  '13px',
                fontWeight:
                  900,
                textDecoration:
                  'none',
              }}
            >
              Create an account
            </Link>
          </div>

          {/* ==================================================
              SECURITY NOTICE
              ================================================== */}

          <div
            style={{
              marginTop:
                '25px',
              padding:
                '16px 14px',
              display:
                'flex',
              alignItems:
                'flex-start',
              gap:
                '12px',
              borderRadius:
                '17px',
              background:
                '#EFFAF5',
              color:
                '#456B5B',
            }}
          >
            <div
              style={{
                width:
                  '42px',
                height:
                  '42px',
                minWidth:
                  '42px',
                borderRadius:
                  '50%',
                background:
                  '#D7F3E5',
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                color:
                  '#08784F',
              }}
            >
              <ShieldIcon />
            </div>

            <div
              style={{
                fontSize:
                  '12px',
                lineHeight:
                  1.5,
              }}
            >
              <strong
                style={{
                  color:
                    '#155B43',
                }}
              >
                Security notice:
              </strong>{' '}
              Never share your password,
              OTP or Passkey information
              with anyone. Zenimonies will
              never ask you to send your
              security credentials to another
              person.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
