import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

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
  data?: LoginPayload;
};

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

function getServerError(
  err: unknown
): string {
  if (axios.isAxiosError(err)) {
    const axiosErr =
      err as AxiosError<LoginPayload>;

    const response = axiosErr.response;

    if (response?.data) {
  const data = response.data;

  if (data.message && data.error_detail) {
    return `${data.message}: ${data.error_detail}`;
  }

  if (data.message) {
    return data.message;
  }

      return JSON.stringify(data);
    }

    if (axiosErr.code === 'ECONNABORTED') {
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

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        'Email and password are required.'
      );
      return;
    }

    try {
      setLoading(true);

      console.log(
        'Zenimonies login request:',
        cleanEmail
      );

      const response =
        await axios.post<LoginPayload>(
          `${API_URL}/api/auth/login`,
          {
            email: cleanEmail,
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

      console.log(
        'Zenimonies login response:',
        response.data
      );

      const data =
        unwrapLoginPayload(
          response.data
        );

      // =====================================================
      // CHECK SERVER SUCCESS
      // =====================================================

      if (data.success === false) {
  setError(
    data.error_detail
      ? `${data.message || 'Login failed'}: ${data.error_detail}`
      : data.message ||
        'Login was rejected by the server.'
  );
  return;
}

      // =====================================================
      // GET TOKEN
      // =====================================================

      const token =
        data.token ||
        data.accessToken ||
        data.access_token;

      // =====================================================
      // OTP CHECK
      // =====================================================

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

        navigate('/verify-otp');
        return;
      }

      // =====================================================
      // PHONE VERIFICATION
      // =====================================================

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

        navigate('/verify-phone');
        return;
      }

      // =====================================================
      // TOKEN REQUIRED
      // =====================================================

      if (!token) {
        console.error(
          'Login succeeded but no token was returned:',
          data
        );

        setError(
          data.message ||
            'The server did not return an authentication token.'
        );

        return;
      }

      // =====================================================
      // SAVE TOKEN
      // =====================================================

      localStorage.setItem(
        'zenimonies_token',
        token
      );

      localStorage.setItem(
        'token',
        token
      );

      // =====================================================
      // SAVE USER
      // =====================================================

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(
            data.user
          )
        );
      }

      // =====================================================
      // SAVE ACCOUNTS
      // =====================================================

      localStorage.setItem(
        'zenimonies_accounts',
        JSON.stringify(
          data.accounts || []
        )
      );

      // =====================================================
      // SUCCESS
      // =====================================================

      navigate('/');
    } catch (err: unknown) {
      console.error(
        'FULL ZENIMONIES LOGIN ERROR:',
        err
      );

      const message =
        getServerError(err);

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f5f7fb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          padding: '32px',
          borderRadius: '16px',
          boxShadow:
            '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: '8px',
            textAlign: 'center',
            color: '#172033',
          }}
        >
          Zenimonies
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#667085',
            marginBottom: '28px',
          }}
        >
          Sign in to your account
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: '14px',
              marginBottom: '18px',
              borderRadius: '8px',
              background: '#fee4e2',
              color: '#b42318',
              fontSize: '14px',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
        >
          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              color: '#172033',
            }}
          >
            Email
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
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              padding: '12px',
              marginBottom: '18px',
              border:
                '1px solid #d0d5dd',
              borderRadius: '8px',
              outline: 'none',
              fontSize: '15px',
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              color: '#172033',
            }}
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              padding: '12px',
              marginBottom: '22px',
              border:
                '1px solid #d0d5dd',
              borderRadius: '8px',
              outline: 'none',
              fontSize: '15px',
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              border: 'none',
              borderRadius: '8px',
              background: '#0b5cff',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              opacity: loading
                ? 0.7
                : 1,
            }}
          >
            {loading
              ? 'Signing in...'
              : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#667085',
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
