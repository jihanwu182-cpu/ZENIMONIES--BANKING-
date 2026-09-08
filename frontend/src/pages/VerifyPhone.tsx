import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const VerifyPhone: React.FC = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setError(
        'Please enter the 6-digit verification code.'
      );
      return;
    }

    setLoading(true);

    try {
      const token =
        localStorage.getItem('zenimonies_token') ||
        localStorage.getItem('token');

      const response = await fetch(
        '/api/auth/verify-phone',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Phone verification failed.'
        );
      }

      setMessage(
        data?.message ||
          'Phone number verified successfully.'
      );

      const storedUser =
        localStorage.getItem('zenimonies_user');

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);

          const updatedUser = {
            ...user,
            is_verified: true,
            emailVerified:
              user.emailVerified ?? true,
          };

          localStorage.setItem(
            'zenimonies_user',
            JSON.stringify(updatedUser)
          );
        } catch {
          // Ignore invalid local user data.
        }
      }

      setTimeout(() => {
        navigate('/profile');
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to verify phone number.'
      );
    } finally {
      setLoading(false);
    }
  };

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

        {error && (
          <div
            style={{
              background: '#fef3f2',
              border: '1px solid #fecdca',
              color: '#b42318',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: '#ecfdf3',
              border: '1px solid #abefc6',
              color: '#027a48',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              fontSize: '14px',
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleVerify}>
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

          <button
            type="submit"
            disabled={
              loading || otp.length !== 6
            }
            style={{
              width: '100%',
              marginTop: '18px',
              padding: '13px 18px',
              border: 'none',
              borderRadius: '10px',
              background:
                loading || otp.length !== 6
                  ? '#98a2b3'
                  : '#0b5cff',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor:
                loading || otp.length !== 6
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading
              ? 'Verifying...'
              : 'Verify Phone'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '22px',
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
