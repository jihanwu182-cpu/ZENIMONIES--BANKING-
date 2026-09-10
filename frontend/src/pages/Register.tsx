import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

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
    // REQUIRED FIELDS
    // ========================================================

    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please complete all fields.');
      return;
    }

    // ========================================================
    // FULL NAME
    // ========================================================

    if (fullName.trim().length < 3) {
      setError('Please enter your full name.');
      return;
    }

    // ========================================================
    // EMAIL
    // ========================================================

    const emailValue = email.trim().toLowerCase();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(emailValue)) {
      setError('Please enter a valid email address.');
      return;
    }

    // ========================================================
    // PHONE
    // ========================================================

    const phoneValue = phone.trim();

    if (phoneValue.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    // ========================================================
    // PASSWORD
    // ========================================================

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // ========================================================
    // LEGAL AGREEMENTS
    // ========================================================

    if (!agreeTerms) {
      setError(
        'You must agree to the Terms & Conditions.'
      );
      return;
    }

    if (!agreePrivacy) {
      setError(
        'You must agree to the Privacy Policy.'
      );
      return;
    }

    // ========================================================
    // REGISTER
    // ========================================================

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        {
          full_name: fullName.trim(),
          email: emailValue,
          phone: phoneValue,
          password,
        }
      );

      if (response.data?.success) {
        /*
         * Store the email temporarily so the verification
         * page knows which account is being verified.
         */
        localStorage.setItem(
          'zenimonies_pending_email',
          emailValue
        );

        localStorage.setItem(
          'zenimonies_pending_phone',
          phoneValue
        );

        setSuccess(
          'Account created successfully. Please verify your phone number.'
        );

        /*
         * Give the user a moment to see the success message.
         */
        setTimeout(() => {
          navigate('/verify-phone');
        }, 1000);
      } else {
        setError(
          response.data?.message ||
            'Unable to create your account.'
        );
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Unable to create your account. Please try again.';

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
          maxWidth: '480px',
          background: '#ffffff',
          padding: '32px',
          borderRadius: '16px',
          boxShadow:
            '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <h1
          style={{
            marginTop: 0,
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Create your Zenimonies account
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#667085',
            marginBottom: '28px',
          }}
        >
          Open your account in a few simple steps.
        </p>

        {/* ==================================================
            ERROR
        ================================================== */}

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

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {success && (
          <div
            style={{
              padding: '12px',
              marginBottom: '18px',
              borderRadius: '8px',
              background: '#ecfdf3',
              color: '#027a48',
              fontSize: '14px',
            }}
          >
            {success}
          </div>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <form onSubmit={handleSubmit}>

          {/* FULL NAME */}

          <label
            htmlFor="fullName"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            Full name
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) =>
              setFullName(event.target.value)
            }
            placeholder="Enter your full name"
            autoComplete="name"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
            }}
          />

          {/* EMAIL */}

          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
            }}
          />

          {/* PHONE */}

          <label
            htmlFor="phone"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            Phone number
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
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
            }}
          />

          {/* PASSWORD */}

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
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="At least 8 characters"
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
            }}
          />

          {/* CONFIRM PASSWORD */}

          <label
            htmlFor="confirmPassword"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            Confirm password
          </label>

          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="Enter your password again"
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '20px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
            }}
          />

          {/* ==================================================
              TERMS
          ================================================== */}

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '14px',
              fontSize: '13px',
              color: '#475467',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(event) =>
                setAgreeTerms(event.target.checked)
              }
              disabled={loading}
              style={{
                marginTop: '3px',
              }}
            />

            <span>
              I agree to the{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#0b5cff',
                  fontWeight: 600,
                }}
              >
                Terms & Conditions
              </Link>
              .
            </span>
          </label>

          {/* ==================================================
              PRIVACY
          ================================================== */}

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '22px',
              fontSize: '13px',
              color: '#475467',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(event) =>
                setAgreePrivacy(event.target.checked)
              }
              disabled={loading}
              style={{
                marginTop: '3px',
              }}
            />

            <span>
              I have read and agree to the{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#0b5cff',
                  fontWeight: 600,
                }}
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {/* ==================================================
              CREATE ACCOUNT
          ================================================== */}

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
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? 'Creating account...'
              : 'Create Account'}
          </button>
        </form>

        {/* ==================================================
            LOGIN
        ================================================== */}

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
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
