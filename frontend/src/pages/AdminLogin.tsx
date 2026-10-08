import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existingAdminToken =
      localStorage.getItem('adminToken');

    if (existingAdminToken) {
      navigate('/admin/dashboard', {
        replace: true,
      });
    }
  }, [navigate]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        'Please enter the administrator email.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter the administrator password.'
      );
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT
       *
       * Administration uses the same secure
       * authentication system as the rest of
       * ZENIMONIES.
       *
       * The backend determines whether the
       * authenticated user is an administrator
       * by checking:
       *
       * user.role === "admin"
       */

      const response = await fetch(
        `${API_BASE}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: cleanEmail,
            password,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Administrator login failed.'
        );
      }

      /*
       * Existing ZENIMONIES auth controller
       * returns the authentication token.
       */

      const token =
        data?.token ||
        data?.accessToken;

      if (!token) {
        throw new Error(
          'Login succeeded, but no authentication token was returned.'
        );
      }

      /*
       * The normal auth controller returns
       * the authenticated user here.
       */

      const authenticatedUser =
        data?.user;

      if (!authenticatedUser) {
        throw new Error(
          'Login succeeded, but administrator information was not returned.'
        );
      }

      /*
       * SECURITY CHECK
       *
       * Never allow a normal customer or
       * Customer Care agent into the Admin
       * Dashboard.
       */

      if (
        authenticatedUser.role !==
        'admin'
      ) {
        throw new Error(
          'Administrator access is required for this portal.'
        );
      }

      /*
       * Store the same JWT returned by the
       * central authentication system.
       *
       * Admin middleware will validate this
       * token and confirm role === "admin".
       */

      localStorage.setItem(
        'adminToken',
        token
      );

      localStorage.setItem(
        'admin',
        JSON.stringify(
          authenticatedUser
        )
      );

      /*
       * Store session information if the
       * authentication API returned it.
       */

      if (
        data?.session_expires_at
      ) {
        localStorage.setItem(
          'adminSessionExpiresAt',
          data.session_expires_at
        );
      }

      /*
       * IMPORTANT:
       *
       * Do NOT remove the normal customer
       * authentication keys.
       *
       * Customer and Admin sessions remain
       * logically separate on the frontend.
       */

      navigate(
        '/admin/dashboard',
        {
          replace: true,
        }
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to sign in as administrator.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f3faf6 0%, #ffffff 55%, #eef8f3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
        }}
      >
        {/* BRAND */}

        <div
          style={{
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 14px',
              borderRadius: '18px',
              background:
                'linear-gradient(135deg, #087f5b, #0b9b6d)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              fontWeight: 900,
              boxShadow:
                '0 12px 30px rgba(8, 127, 91, 0.20)',
            }}
          >
            Z
          </div>

          <div
            style={{
              fontSize: '30px',
              fontWeight: 900,
              color: '#12382d',
              letterSpacing: '-1px',
            }}
          >
            Zenimonies
          </div>

          <div
            style={{
              marginTop: '5px',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '3px',
              color: '#82918b',
            }}
          >
            DIGITAL BANKING
          </div>
        </div>

        {/* LOGIN CARD */}

        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e1ebe6',
            padding: '28px',
            boxShadow:
              '0 18px 50px rgba(20, 65, 48, 0.09)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '25px',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: '25px',
                fontWeight: 850,
                color: '#12382d',
              }}
            >
              Administrator Login
            </h1>

            <p
              style={{
                margin: '8px 0 0',
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#75847e',
              }}
            >
              Secure access to the
              Zenimonies administration
              portal.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* EMAIL */}

            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#344c46',
              }}
            >
              Administrator email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="admin@example.com"
              autoComplete="username"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                boxSizing: 'border-box',
                border:
                  '1px solid #d8e3de',
                borderRadius: '13px',
                padding: '0 15px',
                outline: 'none',
                fontSize: '15px',
                color: '#17362c',
                background: '#fbfdfc',
              }}
            />

            {/* PASSWORD */}

            <div
              style={{
                marginTop: '18px',
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#344c46',
                }}
              >
                Password
              </label>
            </div>

            <div
              style={{
                position: 'relative',
              }}
            >
              <input
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
                placeholder="Enter administrator password"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '52px',
                  boxSizing:
                    'border-box',
                  border:
                    '1px solid #d8e3de',
                  borderRadius: '13px',
                  padding:
                    '0 50px 0 15px',
                  outline: 'none',
                  fontSize: '15px',
                  color: '#17362c',
                  background: '#fbfdfc',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
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
                  right: '7px',
                  top: '7px',
                  width: '38px',
                  height: '38px',
                  border: 'none',
                  borderRadius: '10px',
                  background:
                    '#eef8f3',
                  color: '#087f5b',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 800,
                }}
              >
                {showPassword
                  ? '◉'
                  : '○'}
              </button>
            </div>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: '16px',
                  padding:
                    '12px 14px',
                  borderRadius: '12px',
                  background:
                    '#fff3f1',
                  border:
                    '1px solid #f3cbc5',
                  color: '#b42318',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                {error}
              </div>
            )}

            {/* LOGIN */}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '54px',
                marginTop: '21px',
                border: 'none',
                borderRadius: '14px',
                background: loading
                  ? '#7cae9c'
                  : 'linear-gradient(135deg, #087f5b, #0b9b6d)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 850,
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow:
                  '0 9px 22px rgba(8, 127, 91, 0.18)',
              }}
            >
              {loading
                ? 'Signing in...'
                : 'Sign in to Admin'}
            </button>
          </form>

          {/* SECURITY NOTICE */}

          <div
            style={{
              marginTop: '20px',
              paddingTop: '17px',
              borderTop:
                '1px solid #edf1ef',
              textAlign: 'center',
              color: '#8a9994',
              fontSize: '11px',
              lineHeight: 1.5,
            }}
          >
            🔒 Secure administrator access
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '17px',
            fontSize: '11px',
            color: '#9aa7a2',
          }}
        >
          © {new Date().getFullYear()} Zenimonies
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
