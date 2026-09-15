import React, { useState } from 'react';
import axios from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com';

const AccountLocked: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const userData = localStorage.getItem(
    'zenimonies_user'
  );

  let user: any = null;

  try {
    user = userData
      ? JSON.parse(userData)
      : null;
  } catch {
    user = null;
  }

  const email =
    user?.email ||
    '';

  const identifier =
    user?.email ||
    user?.phone ||
    '';

  const unlockAccount = () => {
    sessionStorage.removeItem(
      'zenimonies_account_locked'
    );

    window.dispatchEvent(
      new Event('zenimonies:unlock')
    );
  };

  const handlePasskeyUnlock = async () => {
    setError('');
    setLoading(true);

    try {
      if (!email) {
        throw new Error(
          'Your account email could not be found. Please use password instead.'
        );
      }

      /*
       * Ask the backend for a fresh WebAuthn
       * authentication challenge.
       */
      const optionsResponse =
        await axios.post(
          `${API_BASE_URL}/api/passkeys/login/options`,
          {
            email,
          }
        );

      const options =
        optionsResponse.data?.options;

      if (!options) {
        throw new Error(
          'Unable to start Passkey authentication.'
        );
      }

      /*
       * Use the device's real Passkey /
       * Face ID / fingerprint system.
       *
       * Zenimonies never receives biometric data.
       */
      const authenticationResponse =
        await startAuthentication({
          optionsJSON: options,
        });

      /*
       * Send the cryptographic WebAuthn
       * assertion to the backend.
       */
      const verifyResponse =
        await axios.post(
          `${API_BASE_URL}/api/passkeys/login/verify`,
          {
            email,
            response: authenticationResponse,
          }
        );

      const data =
        verifyResponse.data;

      if (
        !data?.success ||
        !data?.token
      ) {
        throw new Error(
          data?.message ||
            'Passkey authentication failed.'
        );
      }

      /*
       * Store the NEW authenticated session.
       */
      localStorage.setItem(
        'zenimonies_token',
        data.token
      );

      localStorage.setItem(
        'token',
        data.token
      );

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      /*
       * Remove the browser lock and
       * notify SessionGuard.
       */
      unlockAccount();
    } catch (err: any) {
      console.error(
        'Passkey unlock error:',
        err
      );

      if (
        err?.name ===
        'NotAllowedError'
      ) {
        setError(
          'Passkey authentication was cancelled or unsuccessful. Please try again or use your password.'
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Passkey unlock failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUnlock = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');

    if (!identifier) {
      setError(
        'Your account information could not be found. Please sign in again.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter your password.'
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Password authentication creates a
       * completely new authenticated session.
       */
      const response =
        await axios.post(
          `${API_BASE_URL}/api/auth/login`,
          {
            identifier,
            password,
          }
        );

      const data =
        response.data;

      if (
        !data?.success ||
        !data?.token
      ) {
        throw new Error(
          data?.message ||
            'Password authentication failed.'
        );
      }

      /*
       * Store the new session token.
       */
      localStorage.setItem(
        'zenimonies_token',
        data.token
      );

      localStorage.setItem(
        'token',
        data.token
      );

      if (data.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      /*
       * Clear the lock and return to
       * the authenticated application.
       */
      unlockAccount();
    } catch (err: any) {
      console.error(
        'Password unlock error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Incorrect password or unable to unlock your account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        color: '#172b22',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#ffffff',
          border: '1px solid #e5ebe8',
          borderRadius: '24px',
          padding: '34px 26px',
          boxShadow:
            '0 12px 35px rgba(26, 61, 47, 0.08)',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '17px',
              background:
                'linear-gradient(135deg, #079447, #007a3f)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 800,
              boxShadow:
                '0 8px 20px rgba(7, 148, 71, 0.18)',
            }}
          >
            Z
          </div>
        </div>

        {/* Lock icon */}
        <div
          style={{
            width: '76px',
            height: '76px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: '#fff4e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '34px',
          }}
        >
          🔒
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            color: '#063b2d',
            fontSize: '25px',
            fontWeight: 800,
          }}
        >
          Account Locked
        </h1>

        <p
          style={{
            margin: '0 auto',
            maxWidth: '340px',
            color: '#66756e',
            fontSize: '14px',
            lineHeight: 1.65,
          }}
        >
          Your Zenimonies account has been
          temporarily locked because there has
          been no activity for 5 minutes.
        </p>

        {/* Security notice */}
        <div
          style={{
            marginTop: '22px',
            padding: '15px',
            borderRadius: '14px',
            background: '#effbf5',
            border: '1px solid #d2eee0',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              color: '#05603a',
              fontSize: '13px',
              fontWeight: 800,
              marginBottom: '5px',
            }}
          >
            Your account is secure
          </div>

          <div
            style={{
              color: '#66756e',
              fontSize: '12px',
              lineHeight: 1.55,
            }}
          >
            Unlock your account with your
            registered Passkey, Face ID, or
            fingerprint.
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '12px',
              background: '#fff1f0',
              border:
                '1px solid #f3c7c3',
              color: '#b42318',
              fontSize: '12px',
              lineHeight: 1.5,
              textAlign: 'left',
            }}
          >
            {error}
          </div>
        )}

        {!passwordMode ? (
          <>
            {/* Passkey */}
            <button
              type="button"
              onClick={handlePasskeyUnlock}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '22px',
                border: 'none',
                borderRadius: '12px',
                background: loading
                  ? '#8bbda4'
                  : '#079447',
                color: '#ffffff',
                padding: '14px 18px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow:
                  '0 7px 18px rgba(7, 148, 71, 0.18)',
              }}
            >
              {loading
                ? 'Authenticating...'
                : '🔐 Unlock with Passkey'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '22px 0',
                color: '#98a2a0',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: '#e5ebe8',
                }}
              />

              OR

              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: '#e5ebe8',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setError('');
                setPasswordMode(true);
              }}
              disabled={loading}
              style={{
                width: '100%',
                border:
                  '1px solid #d0d9d5',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#344054',
                padding: '13px 18px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Use Password Instead
            </button>
          </>
        ) : (
          <form
            onSubmit={handlePasswordUnlock}
            style={{
              marginTop: '22px',
              textAlign: 'left',
            }}
          >
            <label
              htmlFor="unlock-password"
              style={{
                display: 'block',
                marginBottom: '7px',
                color: '#344054',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              Password
            </label>

            <input
              id="unlock-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border:
                  '1px solid #d0d9d5',
                borderRadius: '12px',
                padding: '13px 14px',
                fontSize: '14px',
                outline: 'none',
                color: '#172b22',
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '14px',
                border: 'none',
                borderRadius: '12px',
                background: loading
                  ? '#8bbda4'
                  : '#079447',
                color: '#ffffff',
                padding: '14px 18px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {loading
                ? 'Unlocking...'
                : 'Unlock Account'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setPassword('');
                setPasswordMode(false);
              }}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '10px',
                border: 'none',
                background: 'transparent',
                color: '#087c43',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ← Use Passkey Instead
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '22px',
            color: '#98a2b3',
            fontSize: '11px',
            lineHeight: 1.5,
          }}
        >
          Zenimonies never receives or stores
          your biometric data.
        </div>
      </div>
    </div>
  );
};

export default AccountLocked;
