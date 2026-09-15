import React, { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

const API_ROOT =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const API_BASE_URL = API_ROOT.endsWith('/api')
  ? API_ROOT
  : `${API_ROOT}/api`;

interface Passkey {
  id: string;
  credential_id: string;
  device_type?: string | null;
  backed_up?: boolean;
  transports?: string | null;
  created_at?: string;
  last_used_at?: string | null;
}

interface ApiErrorResponse {
  message?: string;
}

const getToken = (): string | null => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token')
  );
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    (error instanceof Error
      ? error.message
      : fallback)
  );
};

const formatDate = (
  value?: string | null
): string => {
  if (!value) {
    return 'Not used yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString();
};

const PasskeySecurity: React.FC = () => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = getToken();

  // ============================================================
  // LOAD REGISTERED PASSKEYS
  // ============================================================

  const loadPasskeys = async () => {
    if (!token) {
      setError(
        'Your session has expired. Please log in again.'
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `${API_BASE_URL}/passkeys`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPasskeys(
        Array.isArray(response.data?.passkeys)
          ? response.data.passkeys
          : []
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load your registered passkeys.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasskeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // REGISTER PASSKEY
  // ============================================================

  const handleRegisterPasskey = async () => {
    if (!token) {
      setError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    if (
      !window.isSecureContext &&
      window.location.hostname !== 'localhost'
    ) {
      setError(
        'Passkeys require a secure connection (HTTPS).'
      );
      return;
    }

    try {
      setRegistering(true);
      setError('');
      setMessage('');

      // --------------------------------------------------------
      // STEP 1: GET REGISTRATION OPTIONS
      // --------------------------------------------------------

      const optionsResponse =
        await axios.post(
          `${API_BASE_URL}/passkeys/register/options`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

      const options =
        optionsResponse.data?.options;

      if (!options) {
        throw new Error(
          'The server did not return passkey registration options.'
        );
      }

      // --------------------------------------------------------
      // STEP 2: CREATE PASSKEY ON DEVICE
      // --------------------------------------------------------

      const registrationResponse =
        await startRegistration({
          optionsJSON: options,
        });

      // --------------------------------------------------------
      // STEP 3: SEND CRYPTOGRAPHIC RESPONSE TO SERVER
      // --------------------------------------------------------

      const verificationResponse =
        await axios.post(
          `${API_BASE_URL}/passkeys/register/verify`,
          registrationResponse,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

      if (
        !verificationResponse.data?.success ||
        !verificationResponse.data?.verified
      ) {
        throw new Error(
          verificationResponse.data?.message ||
            'Passkey registration could not be verified.'
        );
      }

      setMessage(
        'Passkey registered successfully. You can now use your device authentication for Zenimonies security.'
      );

      await loadPasskeys();
    } catch (err) {
      console.error(
        'Passkey registration error:',
        err
      );

      setError(
        getErrorMessage(
          err,
          'Passkey registration failed. Please try again.'
        )
      );
    } finally {
      setRegistering(false);
    }
  };

  // ============================================================
  // TEST PASSKEY AUTHENTICATION
  // ============================================================

  const handleTestPasskey = async () => {
    if (!token) {
      setError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    if (passkeys.length === 0) {
      setError(
        'You do not have a registered passkey yet.'
      );
      return;
    }

    try {
      setTesting(true);
      setError('');
      setMessage('');

      // --------------------------------------------------------
      // STEP 1: GET AUTHENTICATION OPTIONS
      // --------------------------------------------------------

      const optionsResponse =
        await axios.post(
          `${API_BASE_URL}/passkeys/authenticate/options`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

      const options =
        optionsResponse.data?.options;

      if (!options) {
        throw new Error(
          'The server did not return passkey authentication options.'
        );
      }

      // --------------------------------------------------------
      // STEP 2: AUTHENTICATE USING DEVICE
      // --------------------------------------------------------

      const authenticationResponse =
        await startAuthentication({
          optionsJSON: options,
        });

      // --------------------------------------------------------
      // STEP 3: VERIFY AUTHENTICATION ON SERVER
      // --------------------------------------------------------

      const verificationResponse =
        await axios.post(
          `${API_BASE_URL}/passkeys/authenticate/verify`,
          authenticationResponse,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

      if (
        !verificationResponse.data?.success ||
        !verificationResponse.data?.verified
      ) {
        throw new Error(
          verificationResponse.data?.message ||
            'Passkey authentication failed.'
        );
      }

      setMessage(
        'Passkey authentication successful. Your device authentication is working correctly.'
      );

      await loadPasskeys();
    } catch (err) {
      console.error(
        'Passkey authentication error:',
        err
      );

      setError(
        getErrorMessage(
          err,
          'Passkey authentication failed.'
        )
      );
    } finally {
      setTesting(false);
    }
  };

  // ============================================================
  // LOGGED-OUT STATE
  // ============================================================

  if (!token) {
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
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            background: '#ffffff',
            border: '1px solid #e3ebe7',
            borderRadius: '22px',
            padding: '30px',
            textAlign: 'center',
            boxShadow:
              '0 12px 35px rgba(20, 65, 45, 0.07)',
          }}
        >
          <div
            style={{
              fontSize: '42px',
              marginBottom: '12px',
            }}
          >
            🔐
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              color: '#063b2d',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            Security
          </h1>

          <p
            style={{
              margin: 0,
              color: '#66756e',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Please log in to manage your Zenimonies
            passkeys.
          </p>

          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: '22px',
              padding: '12px 20px',
              borderRadius: '11px',
              background: '#087c43',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        color: '#172b22',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: '50px',
      }}
    >
      {/* HEADER */}

      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5ebe8',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 'min(920px, 92%)',
            margin: '0 auto',
            minHeight: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                background:
                  'linear-gradient(135deg, #079447, #007a3f)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
              }}
            >
              Z
            </div>

            <div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#063b2d',
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#98a2a0',
                }}
              >
                DIGITAL BANKING
              </div>
            </div>
          </a>

          <a
            href="/profile"
            style={{
              textDecoration: 'none',
              color: '#087c43',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            ← Profile
          </a>
        </div>
      </header>

      <main
        style={{
          width: 'min(700px, 92%)',
          margin: '0 auto',
          paddingTop: '28px',
        }}
      >
        {/* TITLE */}

        <div
          style={{
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '17px',
              background: '#e8f8f0',
              color: '#087c43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '27px',
              marginBottom: '16px',
            }}
          >
            🔐
          </div>

          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '28px',
              fontWeight: 800,
              color: '#063b2d',
            }}
          >
            Passkey & Device Security
          </h1>

          <p
            style={{
              margin: 0,
              color: '#66756e',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Secure your Zenimonies account with a
            passkey. Your device may use Face ID,
            Touch ID, fingerprint, device PIN, or
            another secure screen-lock method.
          </p>
        </div>

        {/* SECURITY NOTICE */}

        <div
          style={{
            background: '#effbf5',
            border: '1px solid #cfe9db',
            borderRadius: '16px',
            padding: '17px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '11px',
            }}
          >
            <div
              style={{
                fontSize: '22px',
              }}
            >
              🛡️
            </div>

            <div>
              <div
                style={{
                  fontWeight: 800,
                  color: '#05603a',
                  fontSize: '14px',
                  marginBottom: '5px',
                }}
              >
                Your biometric stays on your device
              </div>

              <div
                style={{
                  color: '#4c675c',
                  fontSize: '12px',
                  lineHeight: 1.6,
                }}
              >
                Zenimonies does not receive or store
                your Face ID, Touch ID, fingerprint,
                or other biometric information.
                Passkeys use cryptographic credentials
                instead.
              </div>
            </div>
          </div>
        </div>

        {/* SUCCESS */}

        {message && (
          <div
            style={{
              background: '#effbf5',
              border: '1px solid #bfe4cf',
              color: '#05603a',
              borderRadius: '13px',
              padding: '14px 15px',
              marginBottom: '15px',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            ✓ {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #f0caca',
              color: '#a42626',
              borderRadius: '13px',
              padding: '14px 15px',
              marginBottom: '15px',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* SETUP CARD */}

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e3ebe7',
            borderRadius: '20px',
            padding: '22px',
            boxShadow:
              '0 8px 25px rgba(26, 61, 47, 0.05)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              marginBottom: '10px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: '#063b2d',
                  fontSize: '19px',
                  fontWeight: 800,
                }}
              >
                Passkey
              </h2>

              <p
                style={{
                  margin: '6px 0 0',
                  color: '#66756e',
                  fontSize: '12px',
                }}
              >
                {passkeys.length > 0
                  ? 'Passkey protection is enabled.'
                  : 'No passkey has been registered yet.'}
              </p>
            </div>

            <div
              style={{
                padding: '7px 10px',
                borderRadius: '999px',
                background:
                  passkeys.length > 0
                    ? '#e8f8f0'
                    : '#f2f4f3',
                color:
                  passkeys.length > 0
                    ? '#087c43'
                    : '#66756e',
                fontSize: '11px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {passkeys.length > 0
                ? 'ENABLED'
                : 'NOT SET UP'}
            </div>
          </div>

          <p
            style={{
              margin: '15px 0 18px',
              color: '#66756e',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            Register this device with a passkey.
            When your device asks you to authenticate,
            use the available secure method such as
            Face ID, Touch ID, fingerprint, or your
            device security method.
          </p>

          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={registering}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: '12px',
              padding: '13px 16px',
              background: registering
                ? '#9bb8aa'
                : '#087c43',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: registering
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            {registering
              ? 'Setting up passkey...'
              : passkeys.length > 0
                ? 'Add Another Passkey'
                : 'Set Up Passkey'}
          </button>

          {passkeys.length > 0 && (
            <button
              type="button"
              onClick={handleTestPasskey}
              disabled={testing}
              style={{
                width: '100%',
                marginTop: '10px',
                border: '1px solid #cfdad5',
                borderRadius: '12px',
                padding: '12px 16px',
                background: '#ffffff',
                color: '#087c43',
                fontSize: '13px',
                fontWeight: 800,
                cursor: testing
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {testing
                ? 'Testing passkey...'
                : 'Test Passkey'}
            </button>
          )}
        </section>

        {/* REGISTERED PASSKEYS */}

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e3ebe7',
            borderRadius: '20px',
            padding: '22px',
            boxShadow:
              '0 8px 25px rgba(26, 61, 47, 0.05)',
          }}
        >
          <h2
            style={{
              margin: '0 0 14px',
              color: '#063b2d',
              fontSize: '19px',
              fontWeight: 800,
            }}
          >
            Registered Devices
          </h2>

          {loading ? (
            <div
              style={{
                color: '#66756e',
                fontSize: '13px',
                padding: '10px 0',
              }}
            >
              Loading your registered passkeys...
            </div>
          ) : passkeys.length === 0 ? (
            <div
              style={{
                background: '#f8faf9',
                borderRadius: '13px',
                padding: '16px',
                color: '#66756e',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              No passkeys registered yet.
              <br />
              Set up a passkey above to protect this
              account.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {passkeys.map(
                (passkey, index) => (
                  <div
                    key={passkey.id}
                    style={{
                      border: '1px solid #e3ebe7',
                      borderRadius: '14px',
                      padding: '15px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: '#063b2d',
                            fontWeight: 800,
                            fontSize: '14px',
                          }}
                        >
                          Device Passkey {index + 1}
                        </div>

                        <div
                          style={{
                            color: '#66756e',
                            fontSize: '11px',
                            marginTop: '5px',
                          }}
                        >
                          {passkey.device_type ||
                            'Platform authenticator'}
                        </div>
                      </div>

                      <span
                        style={{
                          background: '#e8f8f0',
                          color: '#087c43',
                          borderRadius: '999px',
                          padding: '5px 8px',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        ACTIVE
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        display: 'grid',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#66756e',
                        }}
                      >
                        Registered:{' '}
                        <strong
                          style={{
                            color: '#344054',
                          }}
                        >
                          {formatDate(
                            passkey.created_at
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          color: '#66756e',
                        }}
                      >
                        Last used:{' '}
                        <strong
                          style={{
                            color: '#344054',
                          }}
                        >
                          {formatDate(
                            passkey.last_used_at
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          color: '#66756e',
                        }}
                      >
                        Backup eligible:{' '}
                        <strong
                          style={{
                            color: '#344054',
                          }}
                        >
                          {passkey.backed_up
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* SECURITY INFORMATION */}

        <div
          style={{
            marginTop: '14px',
            padding: '15px',
            color: '#66756e',
            fontSize: '11px',
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          Passkeys use WebAuthn cryptographic
          authentication. Zenimonies never stores
          your biometric information or your device's
          private passkey.
        </div>
      </main>
    </div>
  );
};

export default PasskeySecurity;
