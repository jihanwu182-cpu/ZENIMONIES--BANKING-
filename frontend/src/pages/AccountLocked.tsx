import React, { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com';

const MAX_PASSKEY_ATTEMPTS = 3;

const AccountLocked: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [failedAttempts, setFailedAttempts] =
    useState(0);

  const [fallbackRequired, setFallbackRequired] =
    useState(false);

  const [lockedUntil, setLockedUntil] =
    useState<string | null>(null);

  // ============================================================
  // GET CURRENT USER
  // ============================================================

  const getStoredUser = () => {
    const storedUser =
      localStorage.getItem(
        'zenimonies_user'
      );

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  };

  const user = getStoredUser();

  const email =
    user?.email || '';

  const identifier =
    user?.email ||
    user?.phone ||
    '';

  // ============================================================
  // INITIAL STATE
  // ============================================================

  useEffect(() => {
    const storedFallback =
      sessionStorage.getItem(
        'zenimonies_passkey_fallback'
      );

    if (storedFallback === 'true') {
      setFallbackRequired(true);
      setPasswordMode(true);
    }
  }, []);

  // ============================================================
  // UNLOCK ACCOUNT
  // ============================================================

  const unlockAccount = () => {
    sessionStorage.removeItem(
      'zenimonies_account_locked'
    );

    sessionStorage.removeItem(
      'zenimonies_passkey_fallback'
    );

    window.dispatchEvent(
      new Event('zenimonies:unlock')
    );
  };

  // ============================================================
  // SAVE NEW SESSION
  // ============================================================

  const saveAuthenticatedSession = (
    data: any
  ) => {
    if (data?.token) {
      localStorage.setItem(
        'zenimonies_token',
        data.token
      );

      localStorage.setItem(
        'token',
        data.token
      );
    }

    if (data?.user) {
      localStorage.setItem(
        'zenimonies_user',
        JSON.stringify(data.user)
      );
    }
  };

  // ============================================================
  // HANDLE PASSKEY FAILURE
  // ============================================================

  const handlePasskeyFailure = (
    axiosError: AxiosError<any>
  ) => {
    const data =
      axiosError.response?.data;

    const attempts =
      Number(
        data?.failed_attempts || 0
      );

    const isFallback =
      data?.fallback_required === true ||
      data?.code ===
        'PASSKEY_FALLBACK_REQUIRED';

    setFailedAttempts(
      Math.min(
        attempts,
        MAX_PASSKEY_ATTEMPTS
      )
    );

    if (data?.locked_until) {
      setLockedUntil(
        data.locked_until
      );
    }

    if (isFallback) {
      setFallbackRequired(true);
      setPasswordMode(true);

      sessionStorage.setItem(
        'zenimonies_passkey_fallback',
        'true'
      );

      setError(
        'Passkey authentication failed three times. Please use your password to unlock your account.'
      );

      return;
    }

    if (attempts > 0) {
      setError(
        `Passkey authentication failed. Attempt ${attempts} of ${MAX_PASSKEY_ATTEMPTS}.`
      );
    } else {
      setError(
        data?.message ||
          'Passkey authentication failed. Please try again.'
      );
    }
  };

  // ============================================================
  // PASSKEY UNLOCK
  // ============================================================

  const handlePasskeyUnlock =
    async () => {
      if (!email) {
        setError(
          'Your account information could not be loaded. Please use your password.'
        );

        setPasswordMode(true);
        return;
      }

      if (fallbackRequired) {
        setPasswordMode(true);

        setError(
          'Please use your password to unlock your account.'
        );

        return;
      }

      setLoading(true);
      setError('');
      setMessage('');

      try {
        // --------------------------------------------------------
        // 1. GET PASSKEY AUTHENTICATION OPTIONS
        // --------------------------------------------------------

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
            'Passkey authentication options were not returned.'
          );
        }

        // --------------------------------------------------------
        // 2. AUTHENTICATE WITH DEVICE PASSKEY
        // --------------------------------------------------------

        let authenticationResponse;

        try {
          authenticationResponse =
            await startAuthentication({
              optionsJSON: options,
            });
        } catch (browserError: any) {
          /*
           * Browser cancellation is not automatically counted
           * as a failed cryptographic authentication attempt.
           */

          if (
            browserError?.name ===
              'NotAllowedError' ||
            browserError?.name ===
              'AbortError'
          ) {
            setError(
              'Passkey authentication was cancelled. Please try again or use your password.'
            );

            return;
          }

          throw browserError;
        }

        // --------------------------------------------------------
        // 3. SEND AUTHENTICATION TO BACKEND
        // --------------------------------------------------------

        const verifyResponse =
          await axios.post(
            `${API_BASE_URL}/api/passkeys/login/verify`,
            {
              email,
              response:
                authenticationResponse,
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

        // --------------------------------------------------------
        // 4. SAVE NEW SERVER SESSION
        // --------------------------------------------------------

        saveAuthenticatedSession(
          data
        );

        setFailedAttempts(0);
        setFallbackRequired(false);
        setLockedUntil(null);

        sessionStorage.removeItem(
          'zenimonies_passkey_fallback'
        );

        setMessage(
          'Passkey authentication successful. Your account has been unlocked.'
        );

        // --------------------------------------------------------
        // 5. UNLOCK SESSION GUARD
        // --------------------------------------------------------

        unlockAccount();
      } catch (error) {
        const axiosError =
          error as AxiosError<any>;

        if (
          axiosError.response
        ) {
          handlePasskeyFailure(
            axiosError
          );
        } else {
          setError(
            axiosError.message ||
              'Unable to complete Passkey authentication.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // PASSWORD UNLOCK
  // ============================================================

  const handlePasswordUnlock =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (!identifier) {
        setError(
          'Your account information could not be loaded. Please return to the login page.'
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
      setError('');
      setMessage('');

      try {
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

        // --------------------------------------------------------
        // SAVE NEW SERVER SESSION
        // --------------------------------------------------------

        saveAuthenticatedSession(
          data
        );

        setPassword('');

        setFailedAttempts(0);
        setFallbackRequired(false);
        setLockedUntil(null);

        sessionStorage.removeItem(
          'zenimonies_passkey_fallback'
        );

        setMessage(
          'Password authentication successful. Your account has been unlocked.'
        );

        // --------------------------------------------------------
        // UNLOCK SESSION GUARD
        // --------------------------------------------------------

        unlockAccount();
      } catch (error) {
        const axiosError =
          error as AxiosError<any>;

        const data =
          axiosError.response?.data;

        setError(
          data?.message ||
            axiosError.message ||
            'Unable to unlock your account with your password.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // RETURN TO PASSKEY
  // ============================================================

  const handleUsePasskey =
    () => {
      if (fallbackRequired) {
        setError(
          'Passkey authentication is temporarily unavailable. Please use your password.'
        );

        return;
      }

      setPasswordMode(false);
      setError('');
      setMessage('');
    };

  // ============================================================
  // LOCK TIME DISPLAY
  // ============================================================

  const getLockMessage = () => {
    if (!lockedUntil) {
      return null;
    }

    const lockDate =
      new Date(lockedUntil);

    if (
      Number.isNaN(
        lockDate.getTime()
      )
    ) {
      return null;
    }

    return `Passkey access is temporarily unavailable until ${lockDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}.`;
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          '#f6f8f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 460,
          borderRadius: 4,
          border:
            '1px solid #e2e8e5',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent
          sx={{
            p: {
              xs: 3,
              sm: 4,
            },
          }}
        >
          <Stack
            spacing={3}
            alignItems="center"
          >
            {/* ------------------------------------------------ */}
            {/* LOCK ICON */}
            {/* ------------------------------------------------ */}

            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background:
                  '#eef4f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlinedIcon
                sx={{
                  fontSize: 36,
                  color:
                    '#174a3b',
                }}
              />
            </Box>

            {/* ------------------------------------------------ */}
            {/* TITLE */}
            {/* ------------------------------------------------ */}

            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  color:
                    '#173b32',
                  mb: 1,
                }}
              >
                Account Locked
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Your session has been locked
                after 5 minutes of inactivity.
                Authenticate to continue using
                Zenimonies.
              </Typography>
            </Box>

            {/* ------------------------------------------------ */}
            {/* SECURITY INFO */}
            {/* ------------------------------------------------ */}

            {!passwordMode &&
              !fallbackRequired &&
              failedAttempts > 0 && (
                <Alert
                  severity={
                    failedAttempts >= 2
                      ? 'warning'
                      : 'info'
                  }
                  sx={{
                    width: '100%',
                  }}
                >
                  Passkey attempt{' '}
                  {failedAttempts} of{' '}
                  {MAX_PASSKEY_ATTEMPTS}
                  .
                </Alert>
              )}

            {/* ------------------------------------------------ */}
            {/* ERROR */}
            {/* ------------------------------------------------ */}

            {error && (
              <Alert
                severity="error"
                sx={{
                  width: '100%',
                }}
              >
                {error}
              </Alert>
            )}

            {/* ------------------------------------------------ */}
            {/* SUCCESS MESSAGE */}
            {/* ------------------------------------------------ */}

            {message && (
              <Alert
                severity="success"
                sx={{
                  width: '100%',
                }}
              >
                {message}
              </Alert>
            )}

            {/* ------------------------------------------------ */}
            {/* PASSKEY MODE */}
            {/* ------------------------------------------------ */}

            {!passwordMode && (
              <Stack
                spacing={2}
                sx={{
                  width: '100%',
                }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress
                        size={20}
                        color="inherit"
                      />
                    ) : (
                      <FingerprintIcon />
                    )
                  }
                  onClick={
                    handlePasskeyUnlock
                  }
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform:
                      'none',
                    fontWeight: 700,
                    background:
                      '#174a3b',
                    '&:hover': {
                      background:
                        '#123b30',
                    },
                  }}
                >
                  {loading
                    ? 'Authenticating...'
                    : 'Unlock with Passkey'}
                </Button>

                <Divider>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    OR
                  </Typography>
                </Divider>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  disabled={loading}
                  onClick={() => {
                    setPasswordMode(
                      true
                    );
                    setError('');
                    setMessage('');
                  }}
                  sx={{
                    py: 1.4,
                    borderRadius: 2,
                    textTransform:
                      'none',
                    fontWeight: 600,
                    borderColor:
                      '#b8c8c1',
                    color:
                      '#174a3b',
                  }}
                >
                  Use Password
                </Button>
              </Stack>
            )}

            {/* ------------------------------------------------ */}
            {/* PASSWORD MODE */}
            {/* ------------------------------------------------ */}

            {passwordMode && (
              <Box
                component="form"
                onSubmit={
                  handlePasswordUnlock
                }
                sx={{
                  width: '100%',
                }}
              >
                <Stack spacing={2.2}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{
                      color:
                        '#173b32',
                    }}
                  >
                    {fallbackRequired
                      ? 'Password Required'
                      : 'Unlock with Password'}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {fallbackRequired
                      ? 'Passkey authentication has reached the maximum number of failed attempts. Use your password to continue.'
                      : 'Enter your Zenimonies password to unlock your session.'}
                  </Typography>

                  <TextField
                    fullWidth
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    label="Password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    autoComplete="current-password"
                    InputProps={{
                      endAdornment: (
                        <Button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (current) =>
                                !current
                            )
                          }
                          sx={{
                            minWidth: 0,
                            p: 0.5,
                          }}
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {showPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </Button>
                      ),
                    }}
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={
                      loading ||
                      !password
                    }
                    startIcon={
                      loading ? (
                        <CircularProgress
                          size={20}
                          color="inherit"
                        />
                      ) : undefined
                    }
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform:
                        'none',
                      fontWeight: 700,
                      background:
                        '#174a3b',
                      '&:hover': {
                        background:
                          '#123b30',
                      },
                    }}
                  >
                    {loading
                      ? 'Unlocking...'
                      : 'Unlock Account'}
                  </Button>

                  {!fallbackRequired && (
                    <Button
                      type="button"
                      variant="text"
                      disabled={
                        loading
                      }
                      onClick={
                        handleUsePasskey
                      }
                      sx={{
                        textTransform:
                          'none',
                        color:
                          '#174a3b',
                      }}
                    >
                      Use Passkey Instead
                    </Button>
                  )}

                  {fallbackRequired &&
                    getLockMessage() && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                      >
                        {getLockMessage()}
                      </Typography>
                    )}
                </Stack>
              </Box>
            )}

            {/* ------------------------------------------------ */}
            {/* SECURITY NOTICE */}
            {/* ------------------------------------------------ */}

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              sx={{
                lineHeight: 1.6,
              }}
            >
              Zenimonies does not receive or store
              your biometric data. Your device uses
              its built-in security system to perform
              Passkey authentication.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountLocked;
