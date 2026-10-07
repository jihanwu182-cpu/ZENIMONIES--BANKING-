import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE LOGIN
// ============================================================

const API_URL =
  'https://zenimonies-banking.onrender.com';

// ============================================================
// TYPES
// ============================================================

type LoginResponse = {
  success?: boolean;
  message?: string;

  token?: string;
  accessToken?: string;
  access_token?: string;

  user?: any;
  accounts?: any[];

  data?: {
    token?: string;
    user?: any;
    accounts?: any[];
  };

  error_detail?: string;
};

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
}> = ({ visible }) => (
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

const HeadsetIcon: React.FC = () => (
  <svg
    width="25"
    height="25"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 13V11C4 6.58 7.58 3 12 3C16.42 3 20 6.58 20 11V13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    <path
      d="M4 13H6.5C7.33 13 8 13.67 8 14.5V17.5C8 18.33 7.33 19 6.5 19H5C4.45 19 4 18.55 4 18V13Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M20 13H17.5C16.67 13 16 13.67 16 14.5V17.5C16 18.33 16.67 19 17.5 19H19C19.55 19 20 18.55 20 18V13Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M16 19C15.2 20.2 13.8 21 12 21H10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const ShieldIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
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
// LOGO
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
        color: '#08784F',
        fontSize: '40px',
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
        color: '#416C5C',
        fontSize: '12px',
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
// CUSTOMER CARE LOGIN
// ============================================================

const CustomerCareLogin: React.FC = () => {
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

  const [error, setError] =
    useState('');

  // ==========================================================
  // LOGIN
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

    if (!cleanEmail) {
      setError(
        'Please enter your Customer Care email address.'
      );

      return;
    }

    if (!password) {
      setError(
        'Please enter your password.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await axios.post<LoginResponse>(
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

      const raw =
        response.data || {};

      const data =
        raw.data &&
        typeof raw.data === 'object'
          ? {
              ...raw,
              ...raw.data,
            }
          : raw;

      if (
        data.success === false
      ) {
        setError(
          data.error_detail
            ? `${
                data.message ||
                'Sign in failed'
              }: ${
                data.error_detail
              }`
            : data.message ||
              'Unable to sign in.'
        );

        return;
      }

      const token =
        data.token ||
        data.accessToken ||
        data.access_token;

      const user =
        data.user;

      // ========================================================
      // SECURITY CHECK
      // ========================================================
      //
      // The Customer Care login accepts ONLY:
      //
      // role = customer_care
      //
      // Never trust the frontend alone.
      // customerCareMiddleware.js also protects all
      // Customer Care API endpoints on the backend.
      // ========================================================

      const role =
        String(
          user?.role || ''
        )
          .trim()
          .toLowerCase();

      if (
        role !==
        'customer_care'
      ) {
        setError(
          'This login is restricted to authorized ZENIMONIES Customer Care personnel.'
        );

        return;
      }

      if (!token) {
        setError(
          'The server did not return an authentication token.'
        );

        return;
      }

      // ========================================================
      // SAVE CUSTOMER CARE SESSION
      // ========================================================

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

      if (user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(user)
        );
      }

      localStorage.setItem(
        'zenimonies_accounts',
        JSON.stringify(
          data.accounts || []
        )
      );

      // ========================================================
      // CUSTOMER CARE WORKSPACE
      // ========================================================

      navigate(
        '/customer-care',
        {
          replace: true,
        }
      );

    } catch (err: unknown) {
      console.error(
        'ZENIMONIES Customer Care login error:',
        err
      );

      if (
        axios.isAxiosError(err)
      ) {
        const axiosError =
          err as AxiosError<LoginResponse>;

        const serverData =
          axiosError.response
            ?.data;

        if (
          serverData?.message
        ) {
          setError(
            serverData.error_detail
              ? `${serverData.message}: ${serverData.error_detail}`
              : serverData.message
          );

          return;
        }

        if (
          axiosError.code ===
          'ECONNABORTED'
        ) {
          setError(
            'The server took too long to respond. Please try again.'
          );

          return;
        }

        if (
          !axiosError.response
        ) {
          setError(
            'Unable to reach the ZENIMONIES server.'
          );

          return;
        }

        setError(
          `Unable to sign in. Server error HTTP ${axiosError.response.status}.`
        );

        return;
      }

      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );

        return;
      }

      setError(
        'Unable to sign in. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        padding:
          '30px 16px 40px',
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
            MAIN CARD
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
              '0 10px 35px rgba(15, 85, 60, 0.07)',
            boxSizing:
              'border-box',
          }}
        >
          {/* ==================================================
              LOGO
              ================================================== */}

          <ZenimoniesLogo />

          {/* ==================================================
              CUSTOMER CARE ICON
              ================================================== */}

          <div
            style={{
              width:
                '82px',
              height:
                '82px',
              margin:
                '32px auto 22px',
              borderRadius:
                '24px',
              background:
                '#E7F7EF',
              color:
                '#08784F',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              border:
                '1px solid #CDEBDD',
            }}
          >
            <HeadsetIcon />
          </div>

          {/* ==================================================
              TITLE
              ================================================== */}

          <div
            style={{
              textAlign:
                'center',
              marginBottom:
                '28px',
            }}
          >
            <h1
              style={{
                margin: 0,
                color:
                  '#073F2D',
                fontSize:
                  '30px',
                fontWeight:
                  900,
                letterSpacing:
                  '-1px',
                lineHeight:
                  1.15,
              }}
            >
              Customer Care
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
                  '15px',
                lineHeight:
                  1.5,
              }}
            >
              Sign in to the secure
              ZENIMONIES Customer Care
              workspace.
            </p>
          </div>

          {/* ==================================================
              SECURITY BADGE
              ================================================== */}

          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap:
                '10px',
              marginBottom:
                '22px',
              padding:
                '12px 13px',
              borderRadius:
                '13px',
              background:
                '#EFFAF5',
              border:
                '1px solid #D7EDE1',
              color:
                '#416C5C',
              fontSize:
                '12px',
              lineHeight:
                1.4,
            }}
          >
            <div
              style={{
                width:
                  '34px',
                height:
                  '34px',
                minWidth:
                  '34px',
                borderRadius:
                  '50%',
                background:
                  '#D8F2E4',
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

            <div>
              <strong
                style={{
                  display:
                    'block',
                  color:
                    '#155B43',
                  marginBottom:
                    '2px',
                }}
              >
                Secure staff access
              </strong>

              Authorized Customer Care
              personnel only.
            </div>
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
            {/* EMAIL */}

            <label
              htmlFor="customer-care-email"
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
              Staff email address
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
                id="customer-care-email"
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
                placeholder="Enter your staff email"
                autoComplete="username"
                disabled={loading}
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

            {/* PASSWORD */}

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
                htmlFor="customer-care-password"
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
                id="customer-care-password"
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
                disabled={loading}
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
                disabled={loading}
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
                    loading
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

            {/* SIGN IN */}

            <button
              type="submit"
              disabled={loading}
              style={{
                width:
                  '100%',
                height:
                  '58px',
                marginTop:
                  '21px',
                border:
                  'none',
                borderRadius:
                  '15px',
                background:
                  loading
                    ? '#A9BEB5'
                    : '#078B50',
                color:
                  '#FFFFFF',
                fontSize:
                  '16px',
                fontWeight:
                  900,
                cursor:
                  loading
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow:
                  loading
                    ? 'none'
                    : '0 8px 18px rgba(7, 139, 80, 0.18)',
              }}
            >
              {loading
                ? 'Signing in...'
                : 'Sign In to Customer Care'}
            </button>
          </form>

          {/* ==================================================
              STAFF NOTICE
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
              color:
                '#71857C',
              fontSize:
                '12px',
              lineHeight:
                1.5,
            }}
          >
            This area is restricted to
            authorized ZENIMONIES Customer
            Care personnel.
          </div>

          {/* ==================================================
              BACK TO CUSTOMER LOGIN
              ================================================== */}

          <div
            style={{
              marginTop:
                '18px',
              textAlign:
                'center',
            }}
          >
            <Link
              to="/login"
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
              ← Back to customer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCareLogin;
