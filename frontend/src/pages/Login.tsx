import React, { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = 'https://zenimonies-banking.onrender.com';
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

type PasskeyOptionsResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  options?: PublicKeyCredentialRequestOptionsJSON;
  failed_attempts?: number;
  max_failed_attempts?: number;
  fallback_required?: boolean;
  locked_until?: string | null;
};

type PasskeyVerifyResponse = {
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
// HELPERS
// ============================================================

function unwrapLoginPayload(raw: LoginPayload): LoginPayload {
  if (raw?.data && typeof raw.data === 'object') {
    return { ...raw, ...raw.data };
  }
  return raw || {};
}

function getServerError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<LoginPayload>;
    const response = axiosErr.response;

    if (response?.data) {
      const data = response.data;
      if (data.message && data.error_detail) {
        return `${data.message}: ${data.error_detail}`;
      }
      if (data.message) return data.message;
      return JSON.stringify(data);
    }

    if (axiosErr.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }
    if (!response) {
      return 'Unable to reach the Zenimonies server. Check your connection.';
    }
    return `Server error (HTTP ${response.status}). Please try again.`;
  }

  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

function saveAuthenticatedSession(data: {
  token?: string;
  user?: any;
  accounts?: any[];
}) {
  const token = data.token;
  if (!token) {
    throw new Error('The server did not return an authentication token.');
  }

  localStorage.setItem('zenimonies_token', token);
  localStorage.setItem('token', token);

  if (data.user) {
    localStorage.setItem('zenimonies_user', JSON.stringify(data.user));
  }

  localStorage.setItem(
    'zenimonies_accounts',
    JSON.stringify(data.accounts || [])
  );
}

function isUserCancellation(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name || '';
  const message = err.message || '';
  return (
    name === 'NotAllowedError' ||
    name === 'AbortError' ||
    /cancel|abort|not allowed/i.test(message)
  );
}

// ============================================================
// COMPONENT
// ============================================================

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState('');

  const [passkeyFailures, setPasskeyFailures] = useState(0);
  const [passkeyFallback, setPasskeyFallback] = useState(false);

  const busy = loading || passkeyLoading;

  // ----------------------------------------------------------
  // PASSWORD LOGIN
  // ----------------------------------------------------------
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError('');

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        setError('Email and password are required.');
        return;
      }

      try {
        setLoading(true);

        const response = await axios.post<LoginPayload>(
          `${API_URL}/api/auth/login`,
          { email: cleanEmail, password },
          {
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const data = unwrapLoginPayload(response.data);

        if (data.success === false) {
          setError(
            data.error_detail
              ? `${data.message || 'Login failed'}: ${data.error_detail}`
              : data.message || 'Login was rejected by the server.'
          );
          return;
        }

        const token =
          data.token || data.accessToken || data.access_token;

        const requiresOtp = Boolean(
          data.requiresOtp ||
            data.requires_otp ||
            data.otpRequired ||
            data.otp_required
        );

        if (requiresOtp) {
          sessionStorage.setItem('zenimonies_otp_email', cleanEmail);
          const otpToken = data.otpToken || data.otp_token;
          if (otpToken) {
            sessionStorage.setItem('zenimonies_otp_token', otpToken);
          }
          navigate('/verify-otp');
          return;
        }

        if (data.requires_phone_verification === true) {
          if (token) {
            localStorage.setItem('zenimonies_token', token);
            localStorage.setItem('token', token);
          }
          if (data.user) {
            localStorage.setItem(
              'zenimonies_user',
              JSON.stringify(data.user)
            );
          }
          navigate('/verify-phone');
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
          user: data.user,
          accounts: data.accounts,
        });

        navigate('/');
      } catch (err: unknown) {
        console.error('Zenimonies password login error:', err);
        setError(getServerError(err));
      } finally {
        setLoading(false);
      }
    },
    [email, password, navigate]
  );

  // ----------------------------------------------------------
  // PASSKEY / BIOMETRIC LOGIN
  // ----------------------------------------------------------
  const handlePasskeyLogin = useCallback(async () => {
    if (busy) return;

    setError('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        'Enter your email address first, then continue with Passkey.'
      );
      return;
    }

    if (passkeyFallback || passkeyFailures >= MAX_PASSKEY_FAILURES) {
      setPasskeyFallback(true);
      setError(
        'Passkey authentication is temporarily unavailable. Please sign in with your password.'
      );
      return;
    }

    try {
      setPasskeyLoading(true);

      // 1. Request challenge from server
      const optionsRes = await fetch(
        `${API_URL}/api/passkey/login/options`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        }
      );

      let optionsData: PasskeyOptionsResponse;
      try {
        optionsData = await optionsRes.json();
      } catch {
        throw new Error(
          'The server returned an invalid Passkey challenge response.'
        );
      }

      if (
        optionsData.fallback_required === true ||
        optionsData.code === 'PASSKEY_FALLBACK_REQUIRED'
      ) {
        setPasskeyFallback(true);
        setPasskeyFailures(MAX_PASSKEY_FAILURES);
        setError(
          optionsData.message ||
            'Passkey authentication is temporarily locked. Please use your password.'
        );
        return;
      }

      if (!optionsRes.ok || !optionsData.success || !optionsData.options) {
        throw new Error(
          optionsData.message || 'Unable to start Passkey authentication.'
        );
      }

      // 2. Trigger platform authenticator (Face ID, Touch ID, Windows Hello, etc.)
      let authenticationResponse;
      try {
        authenticationResponse = await startAuthentication({
          optionsJSON: optionsData.options,
        });
      } catch (browserError: unknown) {
        if (isUserCancellation(browserError)) {
          setError(
            'Passkey authentication was cancelled. You can try again or use your password.'
          );
          return;
        }
        throw browserError;
      }

      // 3. Verify assertion with backend
      const verifyRes = await fetch(
        `${API_URL}/api/passkey/login/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            response: authenticationResponse,
          }),
        }
      );

      let verifyData: PasskeyVerifyResponse;
      try {
        verifyData = await verifyRes.json();
      } catch {
        throw new Error(
          'The server returned an invalid authentication response.'
        );
      }

      if (!verifyRes.ok || !verifyData.success) {
        const serverFailures = Number(verifyData.failed_attempts || 0);
        const serverFallback =
          verifyData.fallback_required === true ||
          verifyData.code === 'PASSKEY_FALLBACK_REQUIRED';

        if (serverFailures > 0) {
          setPasskeyFailures(
            Math.min(serverFailures, MAX_PASSKEY_FAILURES)
          );
        }

        if (serverFallback || serverFailures >= MAX_PASSKEY_FAILURES) {
          setPasskeyFallback(true);
          setPasskeyFailures(MAX_PASSKEY_FAILURES);
          setError(
            verifyData.message ||
              'Passkey authentication failed three times. Please sign in with your password.'
          );
          return;
        }

        if (serverFailures > 0) {
          const remaining = MAX_PASSKEY_FAILURES - serverFailures;
          setError(
            verifyData.message ||
              `Passkey authentication failed. ${remaining} attempt${
                remaining === 1 ? '' : 's'
              } remaining.`
          );
          return;
        }

        setError(verifyData.message || 'Passkey login failed.');
        return;
      }

      // 4. Success — create session
      const responseData = verifyData.data || verifyData;
      const token = responseData.token;

      if (!token) {
        throw new Error(
          'Passkey login succeeded but no authentication token was returned.'
        );
      }

      saveAuthenticatedSession({
        token,
        user: responseData.user,
        accounts: responseData.accounts,
      });

      setPasskeyFailures(0);
      setPasskeyFallback(false);
      navigate('/');
    } catch (err: unknown) {
      console.error('Zenimonies passkey login error:', err);

      if (isUserCancellation(err)) {
        setError(
          'Passkey authentication was cancelled. You can try again or use your password.'
        );
        return;
      }

      // Backend is the single source of truth for failed-attempt counting.
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete Passkey authentication.'
      );
    } finally {
      setPasskeyLoading(false);
    }
  }, [busy, email, passkeyFallback, passkeyFailures, navigate]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'linear-gradient(160deg, #f0f4ff 0%, #f8fafc 45%, #eef2ff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          padding: '36px 32px',
          borderRadius: '20px',
          boxShadow:
            '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -12px rgba(15, 23, 42, 0.12)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0b5cff, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              color: '#fff',
              boxShadow: '0 8px 20px rgba(11, 92, 255, 0.35)',
            }}
          >
            ⬡
          </div>
          <h1
            style={{
              margin: '0 0 6px',
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            Zenimonies
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              color: '#64748b',
            }}
          >
            Secure sign-in to your account
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              marginBottom: '20px',
              borderRadius: '10px',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              border: '1px solid #fecaca',
              wordBreak: 'break-word',
            }}
          >
            {error}
          </div>
        )}

        {/* Email */}
        <label
          htmlFor="email"
          style={{
            display: 'block',
            marginBottom: '6px',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#0f172a',
          }}
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username webauthn"
          disabled={busy}
          style={{
            boxSizing: 'border-box',
            width: '100%',
            padding: '13px 14px',
            marginBottom: '18px',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            outline: 'none',
            fontSize: '0.95rem',
            background: busy ? '#f8fafc' : '#fff',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#0b5cff';
            e.currentTarget.style.boxShadow =
              '0 0 0 3px rgba(11, 92, 255, 0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {/* Passkey / Biometric button */}
        {!passkeyFallback && (
          <>
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={busy}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: 'none',
                borderRadius: '10px',
                background: busy
                  ? '#64748b'
                  : 'linear-gradient(135deg, #0b5cff 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: busy
                  ? 'none'
                  : '0 4px 14px rgba(11, 92, 255, 0.35)',
                transition: 'opacity 0.15s, transform 0.1s',
              }}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🔐</span>
              {passkeyLoading
                ? 'Waiting for authenticator…'
                : 'Sign in with Passkey'}
            </button>

            {passkeyFailures > 0 && (
              <p
                style={{
                  textAlign: 'center',
                  color: '#b45309',
                  fontSize: '0.8rem',
                  margin: '10px 0 0',
                  fontWeight: 500,
                }}
              >
                Attempt {passkeyFailures} of {MAX_PASSKEY_FAILURES}
              </p>
            )}

            <p
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                margin: '10px 0 22px',
              }}
            >
              Face ID · Touch ID · Windows Hello · Security key
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '22px',
                color: '#94a3b8',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{ flex: 1, height: '1px', background: '#e2e8f0' }}
              />
              <span>or continue with password</span>
              <div
                style={{ flex: 1, height: '1px', background: '#e2e8f0' }}
              />
            </div>
          </>
        )}

        {/* Password form */}
        <form onSubmit={handleSubmit} noValidate>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <label
              htmlFor="password"
              style={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: '#0f172a',
              }}
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              style={{
                color: '#0b5cff',
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </Link>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              marginBottom: '22px',
            }}
          >
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={busy}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                padding: '13px 48px 13px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                outline: 'none',
                fontSize: '0.95rem',
                background: busy ? '#f8fafc' : '#fff',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0b5cff';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(11, 92, 255, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={busy}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontSize: '1.15rem',
                lineHeight: 1,
                padding: '4px',
                opacity: 0.7,
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              padding: '13px 16px',
              border: 'none',
              borderRadius: '10px',
              background: busy ? '#94a3b8' : '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in with password'}
          </button>
        </form>

        {/* Fallback notice */}
        {passkeyFallback && (
          <div
            style={{
              marginTop: '18px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            Passkey authentication has reached the maximum number of failed
            attempts. Please use your password to continue.
          </div>
        )}

        {/* Register link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '26px',
            marginBottom: 0,
            color: '#64748b',
            fontSize: '0.9rem',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            style={{
              color: '#0b5cff',
              fontWeight: 600,
              textDecoration: 'none',
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
