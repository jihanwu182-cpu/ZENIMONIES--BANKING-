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
  user?: unknown;
  accounts?: unknown;
  requiresOtp?: boolean;
  requires_otp?: boolean;
  otpRequired?: boolean;
  otp_required?: boolean;
  otpToken?: string;
  otp_token?: string;
  data?: LoginPayload;
};

function unwrapLoginPayload(raw: LoginPayload): LoginPayload {
  if (raw?.data && typeof raw.data === 'object') {
    return { ...raw, ...raw.data };
  }
  return raw ?? {};
}

function getLoginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<LoginPayload>;
    const status = axiosErr.response?.status;
    const serverMessage = axiosErr.response?.data?.message;

    if (serverMessage) {
      return serverMessage;
    }

    if (axiosErr.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }

    if (!axiosErr.response) {
      return 'Unable to reach the server. Check your connection and try again.';
    }

    if (status === 503) {
      return 'The server is waking up. Wait a few seconds and try again.';
    }

    if (status === 429) {
      return 'Too many login attempts. Please wait a moment and try again.';
    }

    if (status === 401 || status === 403) {
      return 'Invalid email or password.';
    }

    return 'Unable to login. Please try again.';
  }

  return 'Unable to login. Please try again.';
}

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
        {
          email: cleanEmail,
          password,
        },
        {
          timeout: 45000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = unwrapLoginPayload(response.data);

      const token =
        data.token || data.accessToken || data.access_token;

      const requiresOtp = Boolean(
        data.requiresOtp ||
          data.requires_otp ||
          data.otpRequired ||
          data.otp_required
      );

      if (data.success === false && !token && !requiresOtp) {
        setError(data.message || 'Login failed.');
        return;
      }

      if (requiresOtp) {
        sessionStorage.setItem('zenimonies_otp_email', cleanEmail);

        const otpToken = data.otpToken || data.otp_token;
        if (otpToken) {
          sessionStorage.setItem('zenimonies_otp_token', otpToken);
        }

        navigate('/verify-otp');
        return;
      }

      if (!token) {
        setError(data.message || 'Login failed.');
        return;
      }

      localStorage.setItem('zenimonies_token', token);
      localStorage.setItem('token', token);

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      localStorage.setItem(
        'zenimonies_accounts',
        JSON.stringify(data.accounts || [])
      );

      navigate('/');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(getLoginErrorMessage(err));
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
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
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
              padding: '12px',
              marginBottom: '18px',
              borderRadius: '8px',
              background: '#fee4e2',
              color: '#b42318',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #d0d5dd',
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
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              padding: '12px',
              marginBottom: '22px',
              border: '1px solid #d0d5dd',
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
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
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
