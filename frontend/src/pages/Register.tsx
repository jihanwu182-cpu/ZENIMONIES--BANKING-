import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

type User = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  phone_verified?: boolean;
  kyc_status?: string;
  kyc_tier?: number;
  bvn_verified?: boolean;
  id_verified?: boolean;
  tier_3_verified?: boolean;
  is_verified?: boolean;
};

type Account = {
  id?: string;
  account_number?: string;
  account_name?: string;
  account_type?: string;
  bank_name?: string | null;
  bank_code?: string | null;
  currency?: string;
  balance?: string | number;
  status?: string;
};

type RegisterResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  requires_phone_verification?: boolean;
  user?: User;
  account?: Account;
  accounts?: Account[];
  development_otp?: string;
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError =
      error as AxiosError<RegisterResponse>;

    const response =
      axiosError.response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (axiosError.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }

    if (!response) {
      return 'Unable to reach the Zenimonies server. Check your internet connection and try again.';
    }

    if (response.status === 409) {
      return 'An account with this email or phone number already exists.';
    }

    if (response.status === 400) {
      return 'Please check your registration details.';
    }

    if (response.status === 503) {
      return 'The Zenimonies server is waking up. Please wait a few seconds and try again.';
    }

    return `Registration failed. Server returned HTTP ${response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to create your account. Please try again.';
}

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    // ========================================================
    // CLEAN INPUTS
    // ========================================================

    const cleanFullName =
      fullName.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPhone =
      phone.trim();

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!cleanFullName) {
      setError('Full name is required.');
      return;
    }

    if (cleanFullName.length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setError('Email is required.');
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      setError(
        'Please enter a valid email address.'
      );
      return;
    }

    if (!cleanPhone) {
      setError('Phone number is required.');
      return;
    }

    if (cleanPhone.length < 7) {
      setError(
        'Please enter a valid phone number.'
      );
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (!confirmPassword) {
      setError(
        'Please confirm your password.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    // ========================================================
    // SUBMIT REGISTRATION
    // ========================================================

    try {
      setLoading(true);

      const response =
        await axios.post<RegisterResponse>(
          `${API_URL}/api/auth/register`,
          {
            full_name: cleanFullName,
            email: cleanEmail,
            phone: cleanPhone,
            password,
          },
          {
            timeout: 60000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

      const data = response.data;

      console.log(
        'Zenimonies registration response:',
        data
      );

      // ======================================================
      // SERVER REJECTED REGISTRATION
      // ======================================================

      if (data.success !== true) {
        setError(
          data.message ||
            'Registration failed.'
        );
        return;
      }

      // ======================================================
      // TOKEN
      // ======================================================

      if (data.token) {
        localStorage.setItem(
          'zenimonies_token',
          data.token
        );

        localStorage.setItem(
          'token',
          data.token
        );
      }

      // ======================================================
      // USER
      // ======================================================

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      // ======================================================
      // ACCOUNT
      // ======================================================

      if (data.account) {
        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify([
            data.account,
          ])
        );
      } else {
        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify(
            data.accounts || []
          )
        );
      }

      // ======================================================
      // PHONE VERIFICATION
      // ======================================================

      if (
        data.requires_phone_verification ===
        true
      ) {
        sessionStorage.setItem(
          'zenimonies_phone',
          cleanPhone
        );

        sessionStorage.setItem(
          'zenimonies_otp_email',
          cleanEmail
        );

        // ----------------------------------------------------
        // DEVELOPMENT TEST OTP
        // ----------------------------------------------------
        //
        // This is useful only when the backend is running
        // with NODE_ENV other than production.
        //
        // It must NOT be used as the actual production
        // phone-delivery mechanism.
        //

        if (data.development_otp) {
          sessionStorage.setItem(
            'zenimonies_development_otp',
            String(data.development_otp)
          );
        }

        setSuccess(
          data.message ||
            'Account created successfully. Please verify your phone number.'
        );

        setTimeout(() => {
          navigate('/verify-phone');
        }, 800);

        return;
      }

      // ======================================================
      // FALLBACK
      // ======================================================

      if (data.token) {
        setSuccess(
          data.message ||
            'Account created successfully.'
        );

        setTimeout(() => {
          navigate('/');
        }, 800);

        return;
      }

      setSuccess(
        data.message ||
          'Account created successfully. Please sign in.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 1000);

    } catch (error: unknown) {
      console.error(
        'Zenimonies registration error:',
        error
      );

      setError(
        getErrorMessage(error)
      );
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
          maxWidth: '440px',
          background: '#ffffff',
          padding: '32px',
          borderRadius: '16px',
          boxShadow:
            '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* HEADER */}

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
          Create your banking account
        </p>

        {/* ERROR */}

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

        {/* SUCCESS */}

        {success && (
          <div
            role="status"
            style={{
              padding: '14px',
              marginBottom: '18px',
              borderRadius: '8px',
              background: '#ecfdf3',
              color: '#027a48',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            {success}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          noValidate
        >
          {/* FULL NAME */}

          <label
            htmlFor="fullName"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              color: '#172033',
            }}
          >
            Full Name
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) =>
              setFullName(
                event.target.value
              )
            }
            placeholder="Enter your full name"
            autoComplete="name"
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

          {/* EMAIL */}

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

          {/* PHONE */}

          <label
            htmlFor="phone"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              color: '#172033',
            }}
          >
            Phone Number
          </label>

          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) =>
              setPhone(
                event.target.value
              )
            }
            placeholder="Enter your phone number"
            autoComplete="tel"
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

          {/* PASSWORD */}

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
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
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

          {/* CONFIRM PASSWORD */}

          <label
            htmlFor="confirmPassword"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              color: '#172033',
            }}
          >
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            placeholder="Enter your password again"
            autoComplete="new-password"
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

          {/* SUBMIT */}

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
              ? 'Creating Account...'
              : 'Create Account'}
          </button>
        </form>

        {/* LOGIN */}

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#667085',
          }}
        >
          Already have an account?{' '}

          <Link
            to="/login"
            style={{
              color: '#0b5cff',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
