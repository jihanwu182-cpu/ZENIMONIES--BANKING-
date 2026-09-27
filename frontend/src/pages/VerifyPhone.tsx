
import React, { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

type VerifyResponse = {
  success?: boolean;
  message?: string;
  user?: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    phone_verified?: boolean;
    is_verified?: boolean;
    kyc_status?: string;
    kyc_tier?: number;
  };
  development_otp?: string;
};

type ErrorResponse = {
  success?: boolean;
  message?: string;
};

// ============================================================
// ZENIMONIES PHONE VERIFICATION
// Compact green and white banking design
// ============================================================

const VerifyPhone: React.FC = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // ==========================================================
  // RESEND COUNTDOWN
  // ==========================================================

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  // ==========================================================
  // AUTHENTICATION TOKEN
  // ==========================================================

  const getToken = (): string | null => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token')
    );
  };

  // ==========================================================
  // VERIFY PHONE
  // ==========================================================

  const handleVerify = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        'Your registration session has expired. Please log in again.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post<VerifyResponse>(
        `${API_URL}/api/auth/verify-phone-otp`,
        { otp },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (data.success !== true) {
        throw new Error(
          data.message || 'Phone verification failed.'
        );
      }

      // Phone verification does not automatically verify KYC.

      const storedUser = localStorage.getItem('zenimonies_user');

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);

          const updatedUser = {
            ...user,
            phone_verified: true,
            phoneVerified: true,
            is_verified: user.is_verified ?? false,
          };

          localStorage.setItem(
            'zenimonies_user',
            JSON.stringify(updatedUser)
          );
        } catch {
          console.warn(
            'Unable to update stored user information.'
          );
        }
      }

      sessionStorage.removeItem(
        'zenimonies_development_otp'
      );

      setOtp('');

      setMessage(
        data.message || 'Phone number verified successfully.'
      );

      window.setTimeout(() => {
        navigate('/profile');
      }, 1200);
    } catch (err: unknown) {
      console.error('Zenimonies phone verification error:', err);

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        const response = axiosError.response;

        if (response?.status === 401) {
          setError(
            'Your authentication session is invalid or expired. Please log in again.'
          );
        } else if (response?.data?.message) {
          setError(response.data.message);
        } else if (axiosError.code === 'ECONNABORTED') {
          setError(
            'The server took too long to respond. Please try again.'
          );
        } else if (!response) {
          setError(
            'Unable to reach the Zenimonies server. Check your internet connection and try again.'
          );
        } else {
          setError(
            `Phone verification failed. Server returned HTTP ${response.status}.`
          );
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to verify phone number. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RESEND OTP
  // ==========================================================

  const handleResend = async () => {
    if (resending || countdown > 0) return;

    setError('');
    setMessage('');

    const token = getToken();

    if (!token) {
      setError(
        'Your registration session has expired. Please log in again.'
      );
      return;
    }

    setResending(true);

    try {
      const response = await axios.post<VerifyResponse>(
        `${API_URL}/api/auth/send-phone-otp`,
        {},
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (data.success !== true) {
        throw new Error(
          data.message || 'Unable to resend verification code.'
        );
      }

      setMessage(
        data.message ||
          'A new verification code has been sent to your phone.'
      );

      setCountdown(60);
      setOtp('');

      // Store a development OTP only if the backend
      // explicitly returns one during testing.

      if (data.development_otp) {
        sessionStorage.setItem(
          'zenimonies_development_otp',
          String(data.development_otp)
        );
      }
    } catch (err: unknown) {
      console.error('Zenimonies resend OTP error:', err);

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        const response = axiosError.response;

        if (response?.status === 401) {
          setError(
            'Your authentication session is invalid or expired. Please log in again.'
          );
        } else if (response?.data?.message) {
          setError(response.data.message);
        } else if (axiosError.code === 'ECONNABORTED') {
          setError(
            'The server took too long to respond. Please try again.'
          );
        } else if (!response) {
          setError('Unable to reach the Zenimonies server.');
        } else {
          setError(
            `Unable to resend the code. Server returned HTTP ${response.status}.`
          );
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to resend verification code.');
      }
    } finally {
      setResending(false);
    }
  };

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="zv-page">
      <style>{`
        .zv-page,
        .zv-page * {
          box-sizing: border-box;
        }

        .zv-page {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          padding: 16px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow-x: hidden;
          background: #f2faf5;
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          color: #064e35;
        }

        .zv-page::before,
        .zv-page::after {
          content: "";
          position: fixed;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.08);
          pointer-events: none;
          z-index: 0;
        }

        .zv-page::before {
          top: 18%;
          left: -190px;
        }

        .zv-page::after {
          bottom: 8%;
          right: -190px;
        }

        /* COMPACT MAIN CARD */

        .zv-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          padding: 24px 28px 22px;
          background: #ffffff;
          border: 1px solid #e2eee6;
          border-radius: 22px;
          box-shadow: 0 18px 45px rgba(15, 70, 43, 0.08);
        }

        .zv-header {
          text-align: center;
          margin-bottom: 18px;
        }

        /* BRAND */

        .zv-brand {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          margin-bottom: 5px;
        }

        .zv-brand-name {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #064e35;
          font-size: clamp(28px, 6vw, 36px);
          font-weight: 900;
          letter-spacing: -1.7px;
          line-height: 1.1;
        }

        .zv-brand-z {
          position: relative;
          display: inline-block;
          color: #087f45;
          margin-right: 1px;
        }

        .zv-brand-z::before {
          content: "";
          position: absolute;
          top: 2px;
          left: 1px;
          width: 20px;
          height: 7px;
          background: #16a34a;
          border-radius: 0 0 5px 0;
        }

        .zv-brand-subtitle {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 7px;
          padding-left: 7px;
          margin-top: 3px;
          color: #32634b;
        }

        /* SMALLER ILLUSTRATION */

        .zv-illustration {
          display: block;
          width: 100%;
          max-width: 195px;
          height: auto;
          margin: 8px auto 12px;
        }

        .zv-title {
          color: #064e35;
          font-size: clamp(24px, 5vw, 29px);
          font-weight: 800;
          letter-spacing: -0.7px;
          margin: 0 0 8px;
          line-height: 1.2;
        }

        .zv-description {
          color: #466b59;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 auto;
          max-width: 380px;
        }

        /* ALERTS */

        .zv-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 13px;
          margin: 16px 0;
          border-radius: 11px;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .zv-alert-error {
          color: #b42318;
          background: #fff3f2;
          border: 1px solid #fecaca;
        }

        .zv-alert-success {
          color: #166534;
          background: #effdf4;
          border: 1px solid #bbf7d0;
        }

        .zv-alert-icon {
          flex-shrink: 0;
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid currentColor;
          border-radius: 50%;
          font-weight: 800;
          font-size: 14px;
        }

        /* OTP INPUT */

        .zv-label {
          display: block;
          color: #14532d;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .zv-input {
          display: block;
          width: 100%;
          min-width: 0;
          padding: 13px 10px;
          border: 1.5px solid #d2ded6;
          border-radius: 12px;
          background: #ffffff;
          color: #064e35;
          font-family: inherit;
          font-size: 21px;
          font-weight: 600;
          letter-spacing: 7px;
          text-align: center;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .zv-input::placeholder {
          color: #a1aaa5;
          font-size: 15px;
          font-weight: 400;
          letter-spacing: 3px;
        }

        .zv-input:focus {
          border-color: #15803d;
          box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.1);
        }

        .zv-input:disabled {
          background: #f8faf9;
          cursor: not-allowed;
        }

        /* VERIFY BUTTON */

        .zv-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 48px;
          padding: 12px 16px;
          border: 0;
          border-radius: 12px;
          background: #087f45;
          color: #ffffff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          margin-top: 14px;
          transition: background 0.2s, transform 0.15s;
        }

        .zv-button:hover:not(:disabled) {
          background: #066638;
          transform: translateY(-1px);
        }

        .zv-button:disabled {
          background: #a7b8ad;
          cursor: not-allowed;
          transform: none;
        }

        /* RESEND */

        .zv-resend {
          display: block;
          width: 100%;
          margin: 13px auto 0;
          padding: 7px;
          border: 0;
          background: transparent;
          color: #087f45;
          font-family: inherit;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
        }

        .zv-resend:disabled {
          color: #98a2a0;
          cursor: not-allowed;
        }

        /* BACK TO PROFILE */

        .zv-back {
          display: block;
          width: fit-content;
          margin: 7px auto 0;
          padding: 6px;
          color: #087f45;
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
        }

        .zv-back:hover,
        .zv-resend:hover:not(:disabled) {
          color: #065f36;
          text-decoration: underline;
        }

        /* SECURITY NOTICE */

        .zv-security {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          padding: 14px;
          border-radius: 12px;
          background: #f0faf4;
          color: #466b59;
        }

        .zv-security-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #d9f5e4;
        }

        .zv-security-icon svg {
          width: 43px;
          height: 47px;
        }

        .zv-security-text {
          border-left: 2px solid #b9e4c9;
          padding-left: 12px;
          font-size: 12px;
          line-height: 1.5;
        }

        .zv-security-text strong {
          color: #14532d;
        }

        /* SMALL MOBILE SCREENS */

        @media (max-width: 520px) {
          .zv-page {
            padding: 12px;
            align-items: center;
          }

          .zv-card {
            max-width: 390px;
            padding: 22px 20px 20px;
            border-radius: 20px;
          }

          .zv-header {
            margin-bottom: 15px;
          }

          .zv-illustration {
            max-width: 175px;
            margin: 8px auto 10px;
          }

          .zv-title {
            font-size: 25px;
          }

          .zv-description {
            font-size: 13px;
          }

          .zv-input {
            font-size: 20px;
            letter-spacing: 6px;
          }

          .zv-button {
            min-height: 46px;
            font-size: 14px;
          }

          .zv-security {
            padding: 12px;
            gap: 10px;
          }

          .zv-security-icon {
            width: 48px;
            height: 48px;
          }

          .zv-security-icon svg {
            width: 36px;
            height: 39px;
          }

          .zv-security-text {
            padding-left: 10px;
            font-size: 11px;
          }
        }

        @media (max-width: 360px) {
          .zv-card {
            padding: 20px 15px;
          }

          .zv-illustration {
            max-width: 155px;
          }

          .zv-title {
            font-size: 23px;
          }

          .zv-security-icon {
            width: 42px;
            height: 42px;
          }

          .zv-security-text {
            padding-left: 9px;
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zv-button,
          .zv-input {
            transition: none;
          }
        }
      `}</style>

      <div className="zv-card">

        {/* BRAND */}

        <header className="zv-header">
          <Link to="/" className="zv-brand">
            <span className="zv-brand-name">
              <span className="zv-brand-z">Z</span>
              enimonies
            </span>

            <span className="zv-brand-subtitle">
              BANKING
            </span>
          </Link>

          {/* PHONE AND OTP ILLUSTRATION */}

          <svg
            className="zv-illustration"
            viewBox="0 0 320 250"
            role="img"
            aria-label="Phone verification and security illustration"
          >
            <defs>
              <linearGradient
                id="zvPhoneGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#087f45" />
                <stop offset="100%" stopColor="#064e35" />
              </linearGradient>

              <linearGradient
                id="zvMessageGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#087f45" />
              </linearGradient>
            </defs>

            <circle
              cx="160"
              cy="125"
              r="115"
              fill="#effaf3"
            />

            <circle
              cx="160"
              cy="125"
              r="94"
              fill="#e5f7ec"
            />

            {/* Phone body */}

            <rect
              x="92"
              y="15"
              width="136"
              height="220"
              rx="23"
              fill="url(#zvPhoneGradient)"
            />

            <rect
              x="99"
              y="24"
              width="122"
              height="198"
              rx="17"
              fill="#ffffff"
            />

            {/* Phone speaker */}

            <rect
              x="137"
              y="31"
              width="47"
              height="5"
              rx="2.5"
              fill="#a7d8b8"
            />

            <circle
              cx="160"
              cy="211"
              r="5"
              fill="#d8eee0"
            />

            {/* Message bubble */}

            <path
              d="M117 78 Q117 64 132 64 H213 Q228 64 228 79 V119 Q228 134 213 134 H157 L136 151 V134 H132 Q117 134 117 119 Z"
              fill="url(#zvMessageGradient)"
            />

            {/* OTP dots */}

            {[143, 163, 183, 203].map((x) => (
              <g key={x}>
                <circle
                  cx={x}
                  cy="98"
                  r="7"
                  fill="#ffffff"
                />
                <circle
                  cx={x}
                  cy="98"
                  r="2"
                  fill="#087f45"
                />
              </g>
            ))}

            {/* Shield */}

            <path
              d="M252 133 L281 145 V169 Q281 193 252 207 Q223 193 223 169 V145 Z"
              fill="#d8f5e3"
            />

            <path
              d="M252 140 L274 150 V169 Q274 188 252 199 Q230 188 230 169 V150 Z"
              fill="#087f45"
            />

            <rect
              x="243"
              y="166"
              width="18"
              height="14"
              rx="3"
              fill="#ffffff"
            />

            <path
              d="M247 166 V161 A5 5 0 0 1 257 161 V166"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <circle
              cx="252"
              cy="172"
              r="2"
              fill="#087f45"
            />

            {/* Decorative signal marks */}

            <path
              d="M69 91 L57 80 M61 116 H45 M69 141 L57 152"
              fill="none"
              stroke="#5cc98a"
              strokeWidth="6"
              strokeLinecap="round"
            />

            <path
              d="M240 55 L251 44 M255 78 H271"
              fill="none"
              stroke="#8bd8a8"
              strokeWidth="5"
              strokeLinecap="round"
            />

            <ellipse
              cx="160"
              cy="235"
              rx="95"
              ry="6"
              fill="#dcefe3"
            />
          </svg>

          <h1 className="zv-title">
            Verify Your Phone
          </h1>

          <p className="zv-description">
            Enter the 6-digit OTP code sent to your
            registered phone number.
          </p>
        </header>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            className="zv-alert zv-alert-error"
            role="alert"
            aria-live="assertive"
          >
            <span className="zv-alert-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {message && (
          <div
            className="zv-alert zv-alert-success"
            role="status"
            aria-live="polite"
          >
            <span className="zv-alert-icon">✓</span>
            <span>{message}</span>
          </div>
        )}

        {/* OTP FORM */}

        <form onSubmit={handleVerify} noValidate>
          <label htmlFor="otp" className="zv-label">
            OTP Code
          </label>

          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => {
              const value = event.target.value
                .replace(/\D/g, '')
                .slice(0, 6);

              setOtp(value);
              setError('');
            }}
            placeholder="Enter 6-digit code"
            disabled={loading}
            className="zv-input"
            aria-describedby="otp-help"
            required
          />

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="zv-button"
          >
            {loading ? 'Verifying...' : 'Verify Phone'}
          </button>
        </form>

        {/* RESEND */}

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || countdown > 0}
          className="zv-resend"
        >
          {resending
            ? 'Sending new code...'
            : countdown > 0
            ? `Resend code in ${countdown}s`
            : 'Resend code'}
        </button>

        {/* BACK TO PROFILE */}

        <Link to="/profile" className="zv-back">
          ← Back to Profile
        </Link>

        {/* SECURITY NOTICE */}

        <div className="zv-security">
          <div className="zv-security-icon">
            <svg
              width="58"
              height="62"
              viewBox="0 0 64 70"
              role="img"
              aria-label="Security shield"
            >
              <path
                d="M32 3 L58 14 V34 Q58 55 32 67 Q6 55 6 34 V14 Z"
                fill="#b8ebcb"
              />

              <path
                d="M32 9 L52 18 V34 Q52 51 32 61 Q12 51 12 34 V18 Z"
                fill="#087f45"
              />

              <rect
                x="21"
                y="31"
                width="22"
                height="18"
                rx="4"
                fill="#ffffff"
              />

              <path
                d="M26 31 V25 A6 6 0 0 1 38 25 V31"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />

              <circle
                cx="32"
                cy="38"
                r="2.5"
                fill="#087f45"
              />

              <path
                d="M32 39 V43"
                stroke="#087f45"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="zv-security-text">
            <strong>Security notice:</strong>{' '}
            Never share your OTP with another person.
            Zenimonies will never ask you to send your
            verification code to anyone.
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;
