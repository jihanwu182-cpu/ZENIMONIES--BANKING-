import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

const VerifyOTP: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const savedEmail =
      sessionStorage.getItem('zenimonies_otp_email');

    if (!savedEmail) {
      navigate('/login');
      return;
    }

    setEmail(savedEmail);
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown]);

  const handleOtpChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
      .replace(/\D/g, '')
      .slice(0, 6);

    setOtp(value);
    setError('');
  };

  const handleVerify = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);

      const savedOtpToken =
        sessionStorage.getItem(
          'zenimonies_otp_token'
        );

      const response = await axios.post(
        `${API_URL}/api/auth/verify-otp`,
        {
          email,
          otp,
          otpToken: savedOtpToken || undefined,
        }
      );

      const data = response.data;

      if (!data?.success) {
        setError(
          data?.message ||
            'OTP verification failed.'
        );
        return;
      }

      /*
       * Save authentication information returned
       * by the backend.
       */

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

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      if (data.accounts) {
        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify(data.accounts)
        );
      }

      /*
       * OTP session is no longer needed.
       */

      sessionStorage.removeItem(
        'zenimonies_otp_email'
      );

      sessionStorage.removeItem(
        'zenimonies_otp_token'
      );

      setSuccess(
        'OTP verified successfully.'
      );

      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err: any) {
      console.error(
        'OTP verification error:',
        err
      );

      const message =
        err?.response?.data?.message ||
        'Unable to verify OTP. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email || resending || countdown > 0) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      setResending(true);

      const response = await axios.post(
        `${API_URL}/api/auth/resend-otp`,
        {
          email,
        }
      );

      const data = response.data;

      if (!data?.success) {
        setError(
          data?.message ||
            'Unable to resend OTP.'
        );
        return;
      }

      if (data.otpToken) {
        sessionStorage.setItem(
          'zenimonies_otp_token',
          data.otpToken
        );
      }

      if (data.otp_token) {
        sessionStorage.setItem(
          'zenimonies_otp_token',
          data.otp_token
        );
      }

      setOtp('');

      setSuccess(
        'A new OTP has been sent.'
      );

      setCountdown(60);
    } catch (err: any) {
      console.error(
        'Resend OTP error:',
        err
      );

      const message =
        err?.response?.data?.message ||
        'Unable to resend OTP. Please try again.';

      setError(message);
    } finally {
      setResending(false);
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
        <div
          style={{
            width: '58px',
            height: '58px',
            margin: '0 auto 18px',
            borderRadius: '50%',
            background: '#eef4ff',
            color: '#0b5cff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '25px',
            fontWeight: 800,
          }}
        >
          🔐
        </div>

        <h1
          style={{
            margin: '0 0 8px',
            textAlign: 'center',
            color: '#172033',
            fontSize: '27px',
          }}
        >
          Verify OTP
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#667085',
            lineHeight: 1.6,
            marginBottom: '25px',
          }}
        >
          Enter the 6-digit verification code
          sent to:
        </p>

        <p
          style={{
            textAlign: 'center',
            color: '#172033',
            fontWeight: 700,
            marginBottom: '24px',
            wordBreak: 'break-word',
          }}
        >
          {email}
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

        <form onSubmit={handleVerify}>
          <label
            htmlFor="otp"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
              color: '#172033',
            }}
          >
            OTP Code
          </label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={handleOtpChange}
            placeholder="000000"
            maxLength={6}
            disabled={loading}
            style={{
              boxSizing: 'border-box',
              width: '100%',
              padding: '14px',
              border: '1px solid #d0d5dd',
              borderRadius: '8px',
              outline: 'none',
              fontSize: '24px',
              letterSpacing: '8px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          />

          <button
            type="submit"
            disabled={
              loading || otp.length !== 6
            }
            style={{
              width: '100%',
              padding: '13px',
              border: 'none',
              borderRadius: '8px',
              background:
                loading || otp.length !== 6
                  ? '#98a2b3'
                  : '#0b5cff',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              cursor:
                loading || otp.length !== 6
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading
              ? 'Verifying...'
              : 'Verify OTP'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '22px',
          }}
        >
          <p
            style={{
              margin: '0 0 10px',
              color: '#667085',
              fontSize: '14px',
            }}
          >
            Didn't receive the code?
          </p>

          <button
            type="button"
            onClick={resendOtp}
            disabled={
              resending || countdown > 0
            }
            style={{
              border: 'none',
              background: 'transparent',
              color:
                resending || countdown > 0
                  ? '#98a2b3'
                  : '#0b5cff',
              fontWeight: 700,
              cursor:
                resending || countdown > 0
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '14px',
            }}
          >
            {resending
              ? 'Sending...'
              : countdown > 0
              ? `Resend OTP in ${countdown}s`
              : 'Resend OTP'}
          </button>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '25px',
          }}
        >
          <Link
            to="/login"
            onClick={() => {
              sessionStorage.removeItem(
                'zenimonies_otp_email'
              );
              sessionStorage.removeItem(
                'zenimonies_otp_token'
              );
            }}
            style={{
              color: '#667085',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            ← Back to Login
          </Link>
        </div>

        <div
          style={{
            marginTop: '25px',
            padding: '12px',
            background: '#f8faff',
            border: '1px solid #dbe7ff',
            borderRadius: '8px',
            color: '#667085',
            fontSize: '12px',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          Never share your OTP with anyone.
          Zenimonies will never ask you to send
          your verification code to another person.
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
