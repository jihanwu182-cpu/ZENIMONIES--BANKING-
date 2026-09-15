import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import {
  browserSupportsPasskeys,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

const API_ROOT =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const API_BASE_URL = API_ROOT.endsWith('/api')
  ? API_ROOT
  : `${API_ROOT}/api`;

const FRONTEND_URL =
  'https://zenimonies-banking-1.onrender.com';

interface Passkey {
  id: string;
  credential_id: string;
  device_type?: string | null;
  backed_up?: boolean;
  transports?: string | null;
  created_at?: string;
  last_used_at?: string | null;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  options?: any;
  passkey?: Passkey;
  passkeys?: Passkey[];
}

const getToken = () => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    ''
  );
};

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const PasskeySecurity: React.FC = () => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);

  const [supported, setSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPasskeys = async () => {
    try {
      const token = getToken();

      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/passkeys`,
        {
          method: 'GET',
          headers: {
            ...authHeaders(),
          },
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to load your passkeys.'
        );
      }

      setPasskeys(
        Array.isArray(data.passkeys)
          ? data.passkeys
          : []
      );
    } catch (err: any) {
      console.error(
        'Load passkeys error:',
        err
      );

      setError(
        err.message ||
          'Unable to load your passkeys.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const passkeySupported =
          await browserSupportsPasskeys();

        setSupported(
          Boolean(passkeySupported)
        );

        if (passkeySupported) {
          const platform =
            await platformAuthenticatorIsAvailable();

          setPlatformAvailable(
            Boolean(platform)
          );
        }
      } catch (err) {
        console.error(
          'Passkey support check error:',
          err
        );
      }
    };

    checkSupport();
    loadPasskeys();
  }, []);

  /*
   * ============================================================
   * CREATE PASSKEY
   * ============================================================
   */

  const createPasskey = async () => {
    setError('');
    setSuccess('');

    if (!supported) {
      setError(
        'Passkeys are not supported by this browser or device.'
      );
      return;
    }

    if (!getToken()) {
      window.location.href = '/login';
      return;
    }

    setCreating(true);

    try {
      /*
       * IMPORTANT:
       *
       * We use native fetch here rather than Axios.
       * This helps preserve Safari/iPhone's user gesture
       * requirement for WebAuthn.
       */

      const optionsResponse = await fetch(
        `${API_BASE_URL}/passkeys/register/options`,
        {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      const optionsData: ApiResponse =
        await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(
          optionsData.message ||
            'Unable to start passkey registration.'
        );
      }

      if (!optionsData.options) {
        throw new Error(
          'The server did not return passkey registration options.'
        );
      }

      /*
       * The device should now display its native
       * Face ID / Touch ID / passkey prompt.
       */

      const registrationResponse =
        await startRegistration({
          optionsJSON:
            optionsData.options,
        });

      const verifyResponse = await fetch(
        `${API_BASE_URL}/passkeys/register/verify`,
        {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            registrationResponse
          ),
        }
      );

      const verifyData: ApiResponse =
        await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(
          verifyData.message ||
            'Passkey registration failed.'
        );
      }

      setSuccess(
        'Passkey created successfully. Your device can now use Face ID, Touch ID, or its passkey security to authenticate with Zenimonies.'
      );

      await loadPasskeys();
    } catch (err: any) {
      console.error(
        'Create passkey error:',
        err
      );

      if (
        err?.name ===
        'NotAllowedError'
      ) {
        setError(
          'Passkey creation was cancelled or the device could not complete authentication.'
        );
      } else if (
        err?.name ===
        'InvalidStateError'
      ) {
        setError(
          'This passkey may already be registered on this device.'
        );
      } else {
        setError(
          err.message ||
            'Unable to create passkey.'
        );
      }
    } finally {
      setCreating(false);
    }
  };

  /*
   * ============================================================
   * TEST PASSKEY
   * ============================================================
   */

  const testPasskey = async () => {
    setError('');
    setSuccess('');

    if (passkeys.length === 0) {
      setError(
        'You do not have a registered passkey yet.'
      );
      return;
    }

    setTesting(true);

    try {
      const optionsResponse = await fetch(
        `${API_BASE_URL}/passkeys/authenticate/options`,
        {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      const optionsData: ApiResponse =
        await optionsResponse.json();

      if (!optionsResponse.ok) {
        throw new Error(
          optionsData.message ||
            'Unable to start passkey authentication.'
        );
      }

      if (!optionsData.options) {
        throw new Error(
          'The server did not return passkey authentication options.'
        );
      }

      const authenticationResponse =
        await startAuthentication({
          optionsJSON:
            optionsData.options,
        });

      const verifyResponse = await fetch(
        `${API_BASE_URL}/passkeys/authenticate/verify`,
        {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            authenticationResponse
          ),
        }
      );

      const verifyData: ApiResponse =
        await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(
          verifyData.message ||
            'Passkey authentication failed.'
        );
      }

      setSuccess(
        'Passkey authentication successful.'
      );

      await loadPasskeys();
    } catch (err: any) {
      console.error(
        'Test passkey error:',
        err
      );

      if (
        err?.name ===
        'NotAllowedError'
      ) {
        setError(
          'Passkey authentication was cancelled or could not be completed.'
        );
      } else {
        setError(
          err.message ||
            'Passkey authentication failed.'
        );
      }
    } finally {
      setTesting(false);
    }
  };

  /*
   * ============================================================
   * FORMAT HELPERS
   * ============================================================
   */

  const formatDate = (
    value?: string | null
  ) => {
    if (!value) {
      return 'Not used yet';
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return 'Not available';
    }

    return date.toLocaleString();
  };

  const getDeviceName = (
    passkey: Passkey
  ) => {
    if (
      passkey.device_type ===
      'multiDevice'
    ) {
      return 'Synced passkey';
    }

    if (
      passkey.device_type ===
      'singleDevice'
    ) {
      return 'Device passkey';
    }

    return 'Passkey';
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f7f9f8',
        py: 4,
      }}
    >
      <Container
        maxWidth="sm"
      >
        <Stack
          spacing={3}
        >
          {/* HEADER */}

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <IconButton
              onClick={() =>
                window.history.back()
              }
            >
              <ArrowBackIcon />
            </IconButton>

            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
              >
                Passkey & Security
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Secure your Zenimonies
                account with your
                device
              </Typography>
            </Box>
          </Stack>

          {/* SUPPORT STATUS */}

          {!loading && !supported && (
            <Alert severity="warning">
              This browser or device does
              not currently support
              passkeys.
            </Alert>
          )}

          {!loading &&
            supported &&
            platformAvailable && (
              <Alert severity="success">
                Your device supports
                platform authentication
                such as Face ID or
                Touch ID.
              </Alert>
            )}

          {!loading &&
            supported &&
            !platformAvailable && (
              <Alert severity="info">
                Passkeys are supported,
                but this device does not
                report an available
                built-in authenticator.
                You may still be able to
                use another passkey
                method.
              </Alert>
            )}

          {error && (
            <Alert
              severity="error"
              onClose={() =>
                setError('')
              }
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              onClose={() =>
                setSuccess('')
              }
            >
              {success}
            </Alert>
          )}

          {/* MAIN CARD */}

          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border:
                '1px solid #e3e9e5',
              backgroundColor:
                '#ffffff',
            }}
          >
            <CardContent
              sx={{ p: 3 }}
            >
              <Stack
                spacing={3}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    width: 70,
                    height: 70,
                    borderRadius:
                      '50%',
                    backgroundColor:
                      '#e8f3ed',
                    mx: 'auto',
                  }}
                >
                  <FingerprintIcon
                    sx={{
                      fontSize: 42,
                      color:
                        '#155d45',
                    }}
                  />
                </Box>

                <Box
                  textAlign="center"
                >
                  <Typography
                    variant="h6"
                    fontWeight={800}
                  >
                    Use your device
                    security
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      lineHeight: 1.7,
                    }}
                  >
                    Passkeys use your
                    device's secure
                    authentication,
                    such as Face ID,
                    Touch ID, or a
                    device PIN.
                  </Typography>
                </Box>

                <Divider />

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={
                    creating ? (
                      <CircularProgress
                        size={20}
                        color="inherit"
                      />
                    ) : (
                      <FingerprintIcon />
                    )
                  }
                  disabled={
                    creating ||
                    !supported
                  }
                  onClick={
                    createPasskey
                  }
                  sx={{
                    py: 1.5,
                    borderRadius: 3,
                    fontWeight: 800,
                    backgroundColor:
                      '#155d45',
                    '&:hover': {
                      backgroundColor:
                        '#104936',
                    },
                  }}
                >
                  {creating
                    ? 'Creating Passkey...'
                    : 'Create Passkey'}
                </Button>

                {passkeys.length >
                  0 && (
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={
                      testing ? (
                        <CircularProgress
                          size={20}
                        />
                      ) : (
                        <SecurityIcon />
                      )
                    }
                    disabled={testing}
                    onClick={
                      testPasskey
                    }
                    sx={{
                      py: 1.5,
                      borderRadius: 3,
                      fontWeight: 800,
                    }}
                  >
                    {testing
                      ? 'Testing...'
                      : 'Test Passkey'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* REGISTERED PASSKEYS */}

          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border:
                '1px solid #e3e9e5',
              backgroundColor:
                '#ffffff',
            }}
          >
            <CardContent
              sx={{ p: 3 }}
            >
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ mb: 2 }}
              >
                Your Passkeys
              </Typography>

              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent:
                      'center',
                    py: 3,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : passkeys.length ===
                0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  No passkeys have been
                  registered for this
                  account yet.
                </Typography>
              ) : (
                <Stack
                  spacing={2}
                >
                  {passkeys.map(
                    (passkey) => (
                      <Box
                        key={
                          passkey.id
                        }
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          backgroundColor:
                            '#f7f9f8',
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={2}
                        >
                          <FingerprintIcon
                            sx={{
                              color:
                                '#155d45',
                            }}
                          />

                          <Box
                            sx={{
                              flex: 1,
                            }}
                          >
                            <Typography
                              fontWeight={700}
                            >
                              {getDeviceName(
                                passkey
                              )}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Created:{' '}
                              {formatDate(
                                passkey.created_at
                              )}
                            </Typography>

                            <br />

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Last used:{' '}
                              {formatDate(
                                passkey.last_used_at
                              )}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* SECURITY NOTICE */}

          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              backgroundColor:
                '#eef6f1',
              border:
                '1px solid #d7e9dd',
            }}
          >
            <CardContent
              sx={{ p: 3 }}
            >
              <Stack
                direction="row"
                spacing={2}
              >
                <SecurityIcon
                  sx={{
                    color:
                      '#155d45',
                    mt: 0.3,
                  }}
                />

                <Box>
                  <Typography
                    fontWeight={800}
                  >
                    Your biometric data
                    stays on your device
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      lineHeight: 1.7,
                    }}
                  >
                    Zenimonies does not
                    receive or store your
                    Face ID, fingerprint,
                    or other biometric
                    information. Your
                    device uses its secure
                    authentication system
                    to approve the passkey.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            Zenimonies security •
            Passkeys
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default PasskeySecurity;
