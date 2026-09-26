import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

type AccountType = 'personal' | 'business';

type User = {
  id?: string;
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  surname?: string;
  gender?: string;
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
    const axiosError = error as AxiosError<RegisterResponse>;
    const response = axiosError.response;

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

  // NAME
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [gender, setGender] = useState('');

  // ACCOUNT TYPE
  const [accountType, setAccountType] =
    useState<AccountType | ''>('');

  // CONTACT
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // PASSWORD
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // STATUS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    // CLEAN INPUTS
    const cleanFirstName = firstName.trim();
    const cleanMiddleName = middleName.trim();
    const cleanSurname = surname.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // VALIDATION
    if (!accountType) {
      setError('Please select an account type.');
      return;
    }

    if (!cleanFirstName) {
      setError('First name is required.');
      return;
    }

    if (!cleanSurname) {
      setError('Surname is required.');
      return;
    }

    if (!gender) {
      setError('Please select your gender.');
      return;
    }

    if (!cleanEmail) {
      setError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // ASSEMBLE CUSTOMER'S REGISTERED FULL NAME
    const fullName = [
      cleanFirstName,
      cleanMiddleName,
      cleanSurname,
    ]
      .filter(Boolean)
      .join(' ');

    try {
      setLoading(true);

      const response =
        await axios.post<RegisterResponse>(
          `${API_URL}/api/auth/register`,
          {
            first_name: cleanFirstName,
            middle_name: cleanMiddleName || null,
            surname: cleanSurname,
            full_name: fullName,
            gender,
            email: cleanEmail,
            phone: cleanPhone,
            password,

            // Account type selected by customer
            account_type: accountType,
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

      if (data.success !== true) {
        setError(
          data.message || 'Registration failed.'
        );
        return;
      }

      // SAVE TOKEN
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

      // SAVE USER
      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      // SAVE ACCOUNTS
      const accounts = data.account
        ? [data.account]
        : data.accounts || [];

      localStorage.setItem(
        'zenimonies_accounts',
        JSON.stringify(accounts)
      );

      // SAVE SELECTED ACCOUNT TYPE
      sessionStorage.setItem(
        'zenimonies_registration_account_type',
        accountType
      );

      // PHONE VERIFICATION
      if (data.requires_phone_verification === true) {
        sessionStorage.setItem(
          'zenimonies_phone',
          cleanPhone
        );

        sessionStorage.setItem(
          'zenimonies_otp_email',
          cleanEmail
        );

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

      // REGISTRATION SUCCESS
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

      setError(getErrorMessage(error));

    } finally {
      setLoading(false);
    }
  };

  // REUSABLE INPUT STYLE
  const inputStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    padding: '13px',
    border: '1px solid #d0d5dd',
    borderRadius: '9px',
    outline: 'none',
    fontSize: '15px',
    background: '#ffffff',
    color: '#172033',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '7px',
    fontWeight: 600,
    fontSize: '14px',
    color: '#344054',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background:
          'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          padding: '32px',
          borderRadius: '18px',
          boxShadow:
            '0 12px 40px rgba(16, 24, 40, 0.08)',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER */}

        <h1
          style={{
            margin: '0 0 8px',
            textAlign: 'center',
            color: '#172033',
            fontSize: '30px',
            fontWeight: 800,
          }}
        >
          Zenimonies
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#667085',
            marginBottom: '28px',
            fontSize: '15px',
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
              borderRadius: '9px',
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
              borderRadius: '9px',
              background: '#ecfdf3',
              color: '#027a48',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ACCOUNT TYPE */}

          <h3
            style={{
              color: '#172033',
              fontSize: '17px',
              margin: '0 0 12px',
            }}
          >
            Choose Account Type
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '26px',
            }}
          >
            {/* PERSONAL */}

            <button
              type="button"
              disabled={loading}
              onClick={() => setAccountType('personal')}
              aria-pressed={accountType === 'personal'}
              style={{
                textAlign: 'left',
                padding: '17px',
                borderRadius: '12px',
                border:
                  accountType === 'personal'
                    ? '2px solid #0b5cff'
                    : '1px solid #d0d5dd',
                background:
                  accountType === 'personal'
                    ? '#eff6ff'
                    : '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#172033',
              }}
            >
              <div
                style={{
                  fontSize: '25px',
                  marginBottom: '8px',
                }}
              >
                👤
              </div>

              <strong
                style={{
                  display: 'block',
                  fontSize: '15px',
                  marginBottom: '6px',
                }}
              >
                Personal Account
              </strong>

              <span
                style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: '#667085',
                }}
              >
                For personal banking, transfers,
                bills, airtime and data.
              </span>

              {accountType === 'personal' && (
                <div
                  style={{
                    color: '#0b5cff',
                    fontWeight: 700,
                    fontSize: '13px',
                    marginTop: '10px',
                  }}
                >
                  ✓ Selected
                </div>
              )}
            </button>

            {/* BUSINESS */}

            <button
              type="button"
              disabled={loading}
              onClick={() => setAccountType('business')}
              aria-pressed={accountType === 'business'}
              style={{
                textAlign: 'left',
                padding: '17px',
                borderRadius: '12px',
                border:
                  accountType === 'business'
                    ? '2px solid #0b5cff'
                    : '1px solid #d0d5dd',
                background:
                  accountType === 'business'
                    ? '#eff6ff'
                    : '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#172033',
              }}
            >
              <div
                style={{
                  fontSize: '25px',
                  marginBottom: '8px',
                }}
              >
                🏢
              </div>

              <strong
                style={{
                  display: 'block',
                  fontSize: '15px',
                  marginBottom: '6px',
                }}
              >
                Business Account
              </strong>

              <span
                style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: '#667085',
                }}
              >
                For business banking, business
                statements and POS services.
              </span>

              {accountType === 'business' && (
                <div
                  style={{
                    color: '#0b5cff',
                    fontWeight: 700,
                    fontSize: '13px',
                    marginTop: '10px',
                  }}
                >
                  ✓ Selected
                </div>
              )}
            </button>
          </div>

          {/* CUSTOMER INFORMATION */}

          <h3
            style={{
              color: '#172033',
              fontSize: '17px',
              margin: '0 0 16px',
            }}
          >
            Personal Information
          </h3>

          {/* FIRST NAME */}

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="firstName" style={labelStyle}>
              First Name *
            </label>

            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(event) =>
                setFirstName(event.target.value)
              }
              placeholder="Enter your first name"
              autoComplete="given-name"
              disabled={loading}
              required
              style={inputStyle}
            />
          </div>

          {/* MIDDLE NAME */}

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="middleName" style={labelStyle}>
              Middle Name (Optional)
            </label>

            <input
              id="middleName"
              type="text"
              value={middleName}
              onChange={(event) =>
                setMiddleName(event.target.value)
              }
              placeholder="Enter your middle name"
              autoComplete="additional-name"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* SURNAME */}

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="surname" style={labelStyle}>
              Surname *
            </label>

            <input
              id="surname"
              type="text"
              value={surname}
              onChange={(event) =>
                setSurname(event.target.value)
              }
              placeholder="Enter your surname"
              autoComplete="family-name"
              disabled={loading}
              required
              style={inputStyle}
            />
          </div>

          {/* GENDER */}

          <div style={{ marginBottom: '22px' }}>
            <label htmlFor="gender" style={labelStyle}>
              Gender *
            </label>

            <select
              id="gender"
              value={gender}
              onChange={(event) =>
                setGender(event.target.value)
              }
              disabled={loading}
              required
              style={{
                ...inputStyle,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">
                Select your gender
              </option>

              <option value="male">Male</option>

              <option value="female">Female</option>
            </select>
          </div>

          {/* CONTACT DETAILS */}

          <h3
            style={{
              color: '#172033',
              fontSize: '17px',
              margin: '0 0 16px',
            }}
          >
            Contact Information
          </h3>

          {/* EMAIL */}

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="email" style={labelStyle}>
              Email Address *
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email address"
              autoComplete="email"
              disabled={loading}
              required
              style={inputStyle}
            />
          </div>

          {/* PHONE */}

          <div style={{ marginBottom: '22px' }}>
            <label htmlFor="phone" style={labelStyle}>
              Phone Number *
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="Enter your phone number"
              autoComplete="tel"
              disabled={loading}
              required
              style={inputStyle}
            />
          </div>

          {/* PASSWORD */}

          <h3
            style={{
              color: '#172033',
              fontSize: '17px',
              margin: '0 0 16px',
            }}
          >
            Secure Your Account
          </h3>

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="password" style={labelStyle}>
              Password *
            </label>

            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={loading}
                required
                style={{
                  ...inputStyle,
                  paddingRight: '55px',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '20px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: '#667085',
                margin: '7px 0 0',
              }}
            >
              Use at least 8 characters. Never share
              your password with anyone.
            </p>
          </div>

          {/* CONFIRM PASSWORD */}

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="confirmPassword"
              style={labelStyle}
            >
              Confirm Password *
            </label>

            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                type={
                  showConfirmPassword ? 'text' : 'password'
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Enter your password again"
                autoComplete="new-password"
                disabled={loading}
                required
                style={{
                  ...inputStyle,
                  paddingRight: '55px',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '20px',
                }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              border: 'none',
              borderRadius: '10px',
              background: '#0b5cff',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? 'Creating Account...'
              : 'Create Account'}
          </button>

          <p
            style={{
              fontSize: '12px',
              lineHeight: 1.6,
              color: '#667085',
              textAlign: 'center',
              marginTop: '14px',
            }}
          >
            By creating an account, you agree to
            complete the required identity verification
            and comply with Zenimonies account requirements.
          </p>
        </form>

        {/* LOGIN */}

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            marginBottom: 0,
            color: '#667085',
            fontSize: '14px',
          }}
        >
          Already have an account?{' '}

          <Link
            to="/login"
            style={{
              color: '#0b5cff',
              fontWeight: 700,
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
