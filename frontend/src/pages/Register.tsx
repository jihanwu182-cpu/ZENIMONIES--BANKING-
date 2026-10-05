import React, { FormEvent, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER REGISTRATION
// ============================================================

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

type AccountType = 'personal' | 'business';

type RegisterUser = {
  id: string;
  full_name?: string;
  first_name?: string;
  middle_name?: string | null;
  surname?: string;
  gender?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  kyc_status?: string;
  kyc_tier?: number;
  registration_account_type?: AccountType;
};

type RegisterAccount = {
  id?: string;
  account_number?: string;
  account_name?: string;
  account_type?: string;
  currency?: string;
  balance?: number;
  status?: string;
};

type RegisterResponse = {
  message?: string;
  token?: string;
  access_token?: string;
  user?: RegisterUser;
  account?: RegisterAccount;
  phone_verification_required?: boolean;
  development_otp?: string;
};

// ============================================================
// HELPERS
// ============================================================

const cleanText = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};

const cleanEmail = (value: string): string => {
  return value.trim().toLowerCase();
};

const cleanPhone = (value: string): string => {
  return value.trim().replace(/\s+/g, '');
};

// ============================================================
// COMPONENT
// ============================================================

const Register: React.FC = () => {
  const navigate = useNavigate();

  // ----------------------------------------------------------
  // FORM STATE
  // ----------------------------------------------------------

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');

  const [gender, setGender] = useState('');

  const [accountType, setAccountType] = useState<AccountType | ''>('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ----------------------------------------------------------
  // UI STATE
  // ----------------------------------------------------------

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateForm = (): string => {
    const cleanFirstName = cleanText(firstName);
    const cleanMiddleName = cleanText(middleName);
    const cleanSurname = cleanText(surname);
    const cleanEmailAddress = cleanEmail(email);
    const cleanPhoneNumber = cleanPhone(phone);

    if (!accountType) {
      return 'Please select an account type.';
    }

    if (!cleanFirstName) {
      return 'Please enter your first name.';
    }

    if (cleanFirstName.length < 2) {
      return 'First name must contain at least 2 characters.';
    }

    if (!cleanSurname) {
      return 'Please enter your surname.';
    }

    if (cleanSurname.length < 2) {
      return 'Surname must contain at least 2 characters.';
    }

    if (cleanMiddleName && cleanMiddleName.length < 2) {
      return 'Middle name must contain at least 2 characters.';
    }

    if (!gender) {
      return 'Please select your gender.';
    }

    if (!cleanEmailAddress) {
      return 'Please enter your email address.';
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmailAddress,
      )
    ) {
      return 'Please enter a valid email address.';
    }

    if (!cleanPhoneNumber) {
      return 'Please enter your phone number.';
    }

    if (!/^[0-9+()\-.\s]{7,30}$/.test(cleanPhoneNumber)) {
      return 'Please enter a valid phone number.';
    }

    if (!password) {
      return 'Please create a password.';
    }

    if (password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }

    if (!confirmPassword) {
      return 'Please confirm your password.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return '';
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const cleanFirstName = cleanText(firstName);
      const cleanMiddleName = cleanText(middleName);
      const cleanSurname = cleanText(surname);
      const cleanEmailAddress = cleanEmail(email);
      const cleanPhoneNumber = cleanPhone(phone);

      // IMPORTANT:
      // We intentionally DO NOT send full_name.
      //
      // The backend will construct:
      //
      // First + Middle + Surname
      //
      // This prevents the customer from controlling
      // the official full_name value directly.

      const response = await axios.post<RegisterResponse>(
        `${API_URL}/api/auth/register`,
        {
          first_name: cleanFirstName,
          middle_name: cleanMiddleName || null,
          surname: cleanSurname,
          gender,
          email: cleanEmailAddress,
          phone: cleanPhoneNumber,
          password,
          registration_account_type: accountType,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const data = response.data;

      // ------------------------------------------------------
      // SAVE TOKEN
      // ------------------------------------------------------

      const token =
        data.token ||
        data.access_token ||
        '';

      if (token) {
        localStorage.setItem(
          'zenimonies_token',
          token,
        );
      }

      // ------------------------------------------------------
      // SAVE USER
      // ------------------------------------------------------

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user),
        );
      }

      // ------------------------------------------------------
      // SAVE ACCOUNT
      // ------------------------------------------------------

      if (data.account) {
        // Do not expose/store sensitive account number unnecessarily
        // in the client registration payload.

        const safeAccount = {
          ...data.account,
          account_number: undefined,
        };

        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify([safeAccount]),
        );
      }

      // ------------------------------------------------------
      // SAVE ACCOUNT TYPE
      // ------------------------------------------------------

      if (accountType) {
        sessionStorage.setItem(
          'zenimonies_registration_account_type',
          accountType,
        );
      }

      // ------------------------------------------------------
      // SAVE PHONE / EMAIL FOR OTP SCREEN
      // ------------------------------------------------------

      sessionStorage.setItem(
        'zenimonies_verification_phone',
        cleanPhoneNumber,
      );

      sessionStorage.setItem(
        'zenimonies_verification_email',
        cleanEmailAddress,
      );

      // ------------------------------------------------------
      // DEVELOPMENT OTP
      // ------------------------------------------------------

      if (data.development_otp) {
        sessionStorage.setItem(
          'zenimonies_development_otp',
          data.development_otp,
        );
      }

      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      setSuccess(
        data.message ||
          'Your ZENIMONIES account has been created successfully.',
      );

      // ------------------------------------------------------
      // PHONE VERIFICATION
      // ------------------------------------------------------

      setTimeout(() => {
        navigate('/verify-phone', {
          replace: true,
        });
      }, 800);
    } catch (err: any) {
      console.error(
        'ZENIMONIES registration error:',
        err,
      );

      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        '';

      if (
        err?.code === 'ECONNABORTED'
      ) {
        setError(
          'The server took too long to respond. Please try again.',
        );
      } else if (
        err?.response?.status === 409
      ) {
        setError(
          serverMessage ||
            'An account with this email or phone number already exists.',
        );
      } else if (
        err?.response?.status === 400
      ) {
        setError(
          serverMessage ||
            'Please check your registration details and try again.',
        );
      } else {
        setError(
          serverMessage ||
            'Registration failed. Please try again.',
        );
      }
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'linear-gradient(135deg, #f4fbf7 0%, #ffffff 55%, #eef8f2 100%)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '22px',
          padding: '30px',
          boxShadow:
            '0 12px 40px rgba(0, 0, 0, 0.08)',
          boxSizing: 'border-box',
        }}
      >
        {/* ====================================================
            BRAND
        ==================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginBottom: '26px',
          }}
        >
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#138a4b',
              letterSpacing: '-0.8px',
            }}
          >
            ZENIMONIES
          </div>

          <div
            style={{
              marginTop: '6px',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            Create your banking account
          </div>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div
            style={{
              marginBottom: '18px',
              padding: '13px 14px',
              borderRadius: '10px',
              background: '#fff1f1',
              border: '1px solid #ffd2d2',
              color: '#b42318',
              fontSize: '14px',
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {success && (
          <div
            style={{
              marginBottom: '18px',
              padding: '13px 14px',
              borderRadius: '10px',
              background: '#effbf4',
              border: '1px solid #c8efd7',
              color: '#087443',
              fontSize: '14px',
              lineHeight: 1.45,
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ==================================================
              ACCOUNT TYPE
          ================================================== */}

          <div
            style={{
              marginBottom: '20px',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1f2937',
              }}
            >
              Account Type
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: '10px',
              }}
            >
              {(
                [
                  ['personal', 'Personal'],
                  ['business', 'Business'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAccountType(value)
                  }
                  style={{
                    padding: '13px',
                    borderRadius: '10px',
                    border:
                      accountType === value
                        ? '2px solid #138a4b'
                        : '1px solid #d1d5db',
                    background:
                      accountType === value
                        ? '#effbf4'
                        : '#ffffff',
                    color:
                      accountType === value
                        ? '#087443'
                        : '#374151',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ==================================================
              FIRST NAME
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="first-name"
              style={labelStyle}
            >
              First Name
            </label>

            <input
              id="first-name"
              type="text"
              value={firstName}
              onChange={(e) =>
                setFirstName(e.target.value)
              }
              autoComplete="given-name"
              placeholder="Enter your first name"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* ==================================================
              MIDDLE NAME
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="middle-name"
              style={labelStyle}
            >
              Middle Name{' '}
              <span
                style={{
                  color: '#9ca3af',
                  fontWeight: 400,
                }}
              >
                (Optional)
              </span>
            </label>

            <input
              id="middle-name"
              type="text"
              value={middleName}
              onChange={(e) =>
                setMiddleName(e.target.value)
              }
              autoComplete="additional-name"
              placeholder="Enter your middle name"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* ==================================================
              SURNAME
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="surname"
              style={labelStyle}
            >
              Surname
            </label>

            <input
              id="surname"
              type="text"
              value={surname}
              onChange={(e) =>
                setSurname(e.target.value)
              }
              autoComplete="family-name"
              placeholder="Enter your surname"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* ==================================================
              GENDER
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="gender"
              style={labelStyle}
            >
              Gender
            </label>

            <select
              id="gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value)
              }
              style={inputStyle}
              disabled={loading}
            >
              <option value="">
                Select gender
              </option>

              <option value="male">
                Male
              </option>

              <option value="female">
                Female
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>

          {/* ==================================================
              EMAIL
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={labelStyle}
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              placeholder="Enter your email address"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* ==================================================
              PHONE
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="phone"
              style={labelStyle}
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              autoComplete="tel"
              placeholder="Enter your phone number"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          {/* ==================================================
              PASSWORD
          ================================================== */}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="password"
              style={labelStyle}
            >
              Password
            </label>

            <div
              style={{
                position: 'relative',
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
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                placeholder="Create a password"
                style={{
                  ...inputStyle,
                  paddingRight: '80px',
                }}
                disabled={loading}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous,
                  )
                }
                style={showButtonStyle}
              >
                {showPassword
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>

            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#6b7280',
              }}
            >
              Minimum 8 characters.
            </div>
          </div>

          {/* ==================================================
              CONFIRM PASSWORD
          ================================================== */}

          <div style={{ marginBottom: '22px' }}>
            <label
              htmlFor="confirm-password"
              style={labelStyle}
            >
              Confirm Password
            </label>

            <div
              style={{
                position: 'relative',
              }}
            >
              <input
                id="confirm-password"
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value,
                  )
                }
                autoComplete="new-password"
                placeholder="Confirm your password"
                style={{
                  ...inputStyle,
                  paddingRight: '80px',
                }}
                disabled={loading}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (previous) => !previous,
                  )
                }
                style={showButtonStyle}
              >
                {showConfirmPassword
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>
          </div>

          {/* ==================================================
              REGISTER BUTTON
          ================================================== */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '11px',
              background:
                loading
                  ? '#7bbd9b'
                  : '#138a4b',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              boxShadow:
                '0 6px 16px rgba(19, 138, 75, 0.20)',
            }}
          >
            {loading
              ? 'Creating account...'
              : 'Create ZENIMONIES Account'}
          </button>
        </form>

        {/* ====================================================
            LOGIN
        ==================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginTop: '22px',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          Already have a ZENIMONIES account?{' '}

          <Link
            to="/login"
            style={{
              color: '#138a4b',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>

        {/* ====================================================
            SECURITY NOTE
        ==================================================== */}

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #edf0f2',
            textAlign: 'center',
            fontSize: '11px',
            lineHeight: 1.5,
            color: '#9ca3af',
          }}
        >
          Your information is protected by
          ZENIMONIES security controls.
        </div>
      </div>
    </div>
  );
};

// ============================================================
// STYLES
// ============================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2937',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 13px',
  borderRadius: '10px',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#111827',
  fontSize: '14px',
  outline: 'none',
};

const showButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#138a4b',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

export default Register;
