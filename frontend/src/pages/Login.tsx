import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data?.success) {
        localStorage.setItem('zenimonies_token', response.data.token);
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(response.data.user)
        );
        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify(response.data.accounts || [])
        );

        navigate('/');
      } else {
        setError(response.data?.message || 'Login failed.');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Unable to login. Please try again.';

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
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: '8px',
            textAlign: 'center',
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

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
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
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
              outline: 'none',
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
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
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '22px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
              outline: 'none',
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
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: '#0b5cff',
              fontWeight: 600,
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
