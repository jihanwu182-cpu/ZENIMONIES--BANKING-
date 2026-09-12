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
};

type ErrorResponse = {
  success?: boolean;
  message?: string;
};

const VerifyPhone: React.FC = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [countdown, setCountdown] = useState(0);

  // ============================================================
  // RESEND COUNTDOWN
  // ============================================================

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown]);

  // ============================================================
  // GET TOKEN
  // ============================================================

  const getToken = (): string | null => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token')
    );
  };

  // ============================================================
  // VERIFY PHONE
  // ============================================================

  const handleVerify = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    // ----------------------------------------------------------
    // VALIDATE OTP
    // ----------------------------------------------------------

    if (!/^\d{6}$/.test(otp)) {
      setError(
        'Please enter the 6-digit verification code.'
      );
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
      console.log(
        'Zenimonies phone verification request'
      );

      const response =
        await axios.post<VerifyResponse>(
          `${API_URL}/api/auth/verify-phone-otp`,
          {
            otp,
          },
          {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const data = response.data;

      console.log(
        'Zenimonies phone verification response:',
        data
      );

      if (data.success !== true) {
        throw new Error(
          data.message ||
            'Phone verification failed.'
        );
      }

      // --------------------------------------------------------
      // UPDATE LOCAL USER
      // --------------------------------------------------------
      //
      // IMPORTANT:
      // Phone verification does NOT mean KYC verification.
      //
      // Therefore:
      //
      // phone_verified = true
      // is_verified    = unchanged
      //
      // KYC will later be verified through the actual
      // identity verification process.
      // --------------------------------------------------------

      const storedUser =
        localStorage.getItem(
          'zenimonies_user'
        );

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);

          const updatedUser = {
            ...user,

            // Phone verification only.
            phone_verified: true,
            phoneVerified: true,

            // Do NOT automatically mark identity/KYC verified.
            is_verified:
              user.is_verified ?? false,
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

      // --------------------------------------------------------
      // CLEAR OLD DEVELOPMENT OTP
      // --------------------------------------------------------

      sessionStorage.removeItem(
        'zenimonies_development_otp'
      );

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      setOtp('');

      setMessage(
        data.message ||
          'Phone number verified successfully.'
      );

      // --------------------------------------------------------
      // GO TO PROFILE
      // --------------------------------------------------------

      setTimeout(() => {
        navigate('/profile');
      }, 1200);

    } catch (error: unknown) {
      console.error(
        'Zenimonies phone verification error:',
        error
      );

      if (axios.isAxiosError(error)) {
        const axiosError =
          error as AxiosError<ErrorResponse>;

        const response =
          axiosError.response;

        if (response?.status === 401) {
          setError(
            'Your authentication session is invalid or expired. Please log in again.'
          );
        } else if (response?.data?.message) {
          setError(
            response.data.message
          );
        } else if (
          axiosError.code ===
          'ECONNABORTED'
        ) {
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
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          'Unable to verify phone number. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RESEND OTP
  // ============================================================

  const handleResend = async () => {
    if (resending || countdown > 0) {
      return;
    }

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
      console.log(
        'Zenimonies resend phone OTP request'
      );

      const response =
        await axios.post<VerifyResponse>(
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

      console.log(
        'Zenimonies resend OTP response:',
        data
      );

      if (data.success !== true) {
        throw new Error(
          data.message ||
            'Unable to resend verification code.'
        );
      }

      setMessage(
        data.message ||
          'A new verification code has been sent to your phone.'
      );

      setCountdown(60);

      setOtp('');

      // --------------------------------------------------------
      // DEVELOPMENT OTP
      // --------------------------------------------------------
      //
      // If the backend provides a development OTP during
      // sandbox/testing, store it for testing.
      //
      // Production should deliver the OTP through SMS.
      // --------------------------------------------------------

      const responseWithOtp =
        data as VerifyResponse & {
          development_otp?: string;
        };

      if (
        responseWithOtp.development_otp
      ) {
        sessionStorage.setItem(
          'zenimonies_development_otp',
          String(
            responseWithOtp.development_otp
          )
        );
      }

    } catch (error: unknown) {
      console.error(
        'Zenimonies resend OTP error:',
        error
      );

      if (axios.isAxiosError(error)) {
        const axiosError =
          error as AxiosError<ErrorResponse>;

        const response =
          axiosError.response;

        if (response?.status === 401) {
          setError(
            'Your authentication session is invalid or expired. Please log in again.'
          );
        } else if (response?.data?.message) {
          setError(
            response.data.message
          );
        } else if (
          axiosError.code ===
          'ECONNABORTED'
        ) {
          setError(
            'The server took too long to respond. Please try again.'
          );
        } else if (!response) {
          setError(
            'Unable to reach the Zenimonies server.'
          );
        } else {
          setError(
            `Unable to resend the code. Server returned HTTP ${response.status}.`
          );
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          'Unable to resend verification code.'
        );
      }
    } finally {
      setResending(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '18px',
          padding: '32px',
          border: '1px solid #eaecf0',
          boxShadow:
            '0 10px 30px rgba(16, 24, 40, 0.08)',
        }}
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#0b5cff',
              fontSize: '26px',
              fontWeight: 800,
            }}
          >
            Zenimonies
          </Link>

          <h1
            style={{
              color: '#172033',
              fontSize: '25px',
              margin: '24px 0 8px',
            }}
          >
            Verify Your Phone
          </h1>

          <p
            style={{
              color: '#667085',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Enter the 6-digit OTP code sent to
            your registered phone number.
          </p>
        </div>

        {/* ================================================== */}
        {/* ERROR */}
        {/* ================================================== */}

        {error && (
          <div
            role="alert"
            style={{
              background: '#fef3f2',
              border: '1px solid #fecdca',
              color: '#b42318',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* ================================================== */}
        {/* SUCCESS */}
        {/* ================================================== */}

        {message && (
          <div
            role="status"
            style={{
              background: '#ecfdf3',
              border: '1px solid #abefc6',
              color: '#027a48',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {/* ================================================== */}
        {/* OTP FORM */}
        {/* ================================================== */}

        <form
          onSubmit={handleVerify}
          noValidate
        >
          <label
            htmlFor="otp"
            style={{
              display: 'block',
              color: '#344054',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '7px',
            }}
          >
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
              const value =
                event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6);

              setOtp(value);
              setError('');
            }}
            placeholder="Enter 6-digit code"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #d0d5dd',
              outline: 'none',
              fontSize: '20px',
              letterSpacing: '6px',
              textAlign: 'center',
            }}
          />

          {/* VERIFY BUTTON */}

          <button
            type="submit"
            disabled={
              loading ||
              otp.length !== 6
            }
            style={{
              width: '100%',
              marginTop: '18px',
              padding: '13px 18px',
              border: 'none',
              borderRadius: '10px',
              background:
                loading ||
                otp.length !== 6
                  ? '#98a2b3'
                  : '#0b5cff',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor:
                loading ||
                otp.length !== 6
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading
              ? 'Verifying...'
              : 'Verify Phone'}
          </button>
        </form>

        {/* ================================================== */}
        {/* RESEND */}
        {/* ================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          <button
            type="button"
            onClick={handleResend}
            disabled={
              resending ||
              countdown > 0
            }
            style={{
              background: 'transparent',
              border: 'none',
              color:
                resending ||
                countdown > 0
                  ? '#98a2b3'
                  : '#0b5cff',
              fontSize: '14px',
              fontWeight: 700,
              cursor:
                resending ||
                countdown > 0
                  ? 'not-allowed'
                  : 'pointer',
              padding: '8px',
            }}
          >
            {resending
              ? 'Sending new code...'
              : countdown > 0
              ? `Resend code in ${countdown}s`
              : 'Resend code'}
          </button>
        </div>

        {/* ================================================== */}
        {/* BACK */}
        {/* ================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginTop: '12px',
          }}
        >
          <Link
            to="/profile"
            style={{
              textDecoration: 'none',
              color: '#0b5cff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            ← Back to Profile
          </Link>
        </div>

        {/* ================================================== */}
        {/* SECURITY NOTICE */}
        {/* ================================================== */}

        <div
          style={{
            marginTop: '24px',
            padding: '14px',
            background: '#f8faff',
            borderRadius: '10px',
            color: '#667085',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          <strong
            style={{
              color: '#344054',
            }}
          >
            Security notice:
          </strong>{' '}
          Never share your OTP with another person.
          Zenimonies will never ask you to send your
          verification code to anyone.
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;
