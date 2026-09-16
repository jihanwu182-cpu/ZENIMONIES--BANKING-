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
import PasswordIcon from '@mui/icons-material/Password';
import DialpadIcon from '@mui/icons-material/Dialpad';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com';

const MAX_PASSKEY_ATTEMPTS = 3;
const MAX_PASSCODE_ATTEMPTS = 3;

type UnlockMode =
  | 'passkey'
  | 'passcode'
  | 'password';

const AccountLocked: React.FC = () => {
  const [loading, setLoading] =
    useState(false);

  const [passwordMode, setPasswordMode] =
    useState(false);

  const [passcodeMode, setPasscodeMode] =
    useState(false);

  const [password, setPassword] =
    useState('');

  const [passcode, setPasscode] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [failedAttempts, setFailedAttempts] =
    useState(0);

  const [fallbackRequired, setFallbackRequired] =
    useState(false);

  const [passcodeFailedAttempts, setPasscodeFailedAttempts] =
    useState(0);

  const [passcodeLocked, setPasscodeLocked] =
    useState(false);

  const [passcodeLockedUntil, setPasscodeLockedUntil] =
    useState<string | null>(null);

  const [lockedUntil, setLockedUntil] =
    useState<string | null>(null);

  const [passkeyAvailable, setPasskeyAvailable] =
    useState(true);

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
  // INITIAL FALLBACK STATE
  // ============================================================

  useEffect(() => {
    const storedFallback =
      sessionStorage.getItem(
        'zenimonies_passkey_fallback'
      );

    if (storedFallback === 'true') {
      setFallbackRequired(true);
      setPasskeyAvailable(false);
      setPasscodeMode(true);
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
  // SAVE AUTHENTICATED SESSION
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

    if (data?.accounts) {
      localStorage.setItem(
        'zenimonies_accounts',
        JSON.stringify(data.accounts)
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
      setPasskeyAvailable(false);
      setPasscodeMode(true);
      setPasswordMode(false);

      sessionStorage.setItem(
        'zenimonies_passkey_fallback',
        'true'
      );

      setError(
        'Passkey authentication failed three times. Use your 6-digit Account Unlock Passcode or password.'
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
        setPasscodeMode(false);
        return;
      }

      if (
        fallbackRequired ||
        !passkeyAvailable
      ) {
        setPasscodeMode(true);
        setPasswordMode(false);

        setError(
          'Please use your 6-digit Account Unlock Passcode or password.'
        );

        return;
      }

      setLoading(true);
      setError('');
      setMessage('');

      try {
        // --------------------------------------------------------
        // 1. GET PASSKEY OPTIONS
        // --------------------------------------------------------

        const optionsResponse =
          await axios.post(
            `${API_BASE_URL}/api/passkey/login/options`,
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
        // 2. DEVICE PASSKEY / FACE ID
        // --------------------------------------------------------

        let authenticationResponse;

        try {
          authenticationResponse =
            await startAuthentication({
              optionsJSON: options,
            });
        } catch (browserError: any) {
          if (
            browserError?.name ===
              'NotAllowedError' ||
            browserError?.name ===
              'AbortError'
          ) {
            setError(
              'Passkey authentication was cancelled. Please try again or use another unlock method.'
            );

            return;
          }

          throw browserError;
        }

        // --------------------------------------------------------
        // 3. VERIFY WITH BACKEND
        // --------------------------------------------------------

        const verifyResponse =
          await axios.post(
            `${API_BASE_URL}/api/passkey/login/verify`,
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
        setPasskeyAvailable(true);
        setLockedUntil(null);

        sessionStorage.removeItem(
          'zenimonies_passkey_fallback'
        );

        setMessage(
          'Passkey authentication successful. Your account has been unlocked.'
        );

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
  // ACCOUNT PASSCODE UNLOCK
  // ============================================================

  const handlePasscodeUnlock =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (
        passcodeLocked
      ) {
        setError(
          'Your Account Unlock Passcode is temporarily locked. Please use your password.'
        );

        return;
      }

      if (
        !/^\d{6}$/.test(passcode)
      ) {
        setError(
          'Please enter your 6-digit Account Unlock Passcode.'
        );

        return;
      }

      const token =
        localStorage.getItem(
          'zenimonies_token'
        ) ||
        localStorage.getItem(
          'token'
        );

      if (!token) {
        setError(
          'Your session has expired. Please use your password to sign in again.'
        );

        setPasswordMode(true);
        setPasscodeMode(false);

        return;
      }

      setLoading(true);
      setError('');
      setMessage('');

      try {
        const response =
          await axios.post(
            `${API_BASE_URL}/api/passcode/verify`,
            {
              passcode,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          response.data;

        if (
          !data?.success ||
          data?.verified !== true
        ) {
          throw new Error(
            data?.message ||
              'Passcode verification failed.'
          );
        }

        setPasscode('');
        setPasscodeFailedAttempts(0);
        setPasscodeLocked(false);
        setPasscodeLockedUntil(null);

        setMessage(
          'Passcode verified successfully. Your account has been unlocked.'
        );

        unlockAccount();
      } catch (error) {
        const axiosError =
          error as AxiosError<any>;

        const data =
          axiosError.response?.data;

        const attempts =
          Number(
            data?.failed_attempts || 0
          );

        setPasscodeFailedAttempts(
          Math.min(
            attempts,
            MAX_PASSCODE_ATTEMPTS
          )
        );

        if (
          data?.locked_until
        ) {
          setPasscodeLockedUntil(
            data.locked_until
          );
        }

        if (
          data?.code ===
            'PASSCODE_LOCKED' ||
          data?.fallback_required === true
        ) {
          setPasscodeLocked(true);
          setPasscode('');
          setPasswordMode(true);
          setPasscodeMode(false);

          setError(
            'Your Account Unlock Passcode is temporarily locked. Please use your password.'
          );

          return;
        }

        if (
          data?.code ===
          'INCORRECT_PASSCODE'
        ) {
          setError(
            `Incorrect passcode. Attempt ${attempts} of ${MAX_PASSCODE_ATTEMPTS}.`
          );

          return;
        }

        setError(
          data?.message ||
            axiosError.message ||
            'Unable to verify your Account Unlock Passcode.'
        );
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

        saveAuthenticatedSession(
          data
        );

        setPassword('');

        setFailedAttempts(0);
        setFallbackRequired(false);
        setPasscodeLocked(false);
        setPasscodeFailedAttempts(0);
        setLockedUntil(null);
        setPasscodeLockedUntil(null);

        sessionStorage.removeItem(
          'zenimonies_passkey_fallback'
        );

        setMessage(
          'Password authentication successful. Your account has been unlocked.'
        );

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
  // SWITCH TO PASSCODE
  // ============================================================

  const handleUsePasscode =
    () => {
      setPasscodeMode(true);
      setPasswordMode(false);
      setError('');
      setMessage('');
    };

  // ============================================================
  // SWITCH TO PASSWORD
  // ============================================================

  const handleUsePassword =
    () => {
      setPasswordMode(true);
      setPasscodeMode(false);
      setError('');
      setMessage('');
    };

  // ============================================================
  // SWITCH BACK TO PASSKEY
  // ============================================================

  const handleUsePasskey =
    () => {
      if (
        fallbackRequired ||
        !passkeyAvailable
      ) {
        setError(
          'Passkey authentication is temporarily unavailable. Please use your Account Unlock Passcode or password.'
        );

        return;
      }

      setPasswordMode(false);
      setPasscodeMode(false);
      setError('');
      setMessage('');
    };

  // ============================================================
  // LOCK TIME DISPLAY
  // ============================================================

  const getLockMessage = (
    lockTime: string | null
  ) => {
    if (!lockTime) {
      return null;
    }

    const lockDate =
      new Date(lockTime);

    if (
      Number.isNaN(
        lockDate.getTime()
      )
    ) {
      return null;
    }

    return `Temporarily unavailable until ${lockDate.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    )}.`;
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f7faf8 0%, #eef4f1 100%)',
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
            '0 24px 70px rgba(0,0,0,0.09)',
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
            {/* BRAND */}

            <Box
              sx={{
                width: 62,
                height: 62,
                borderRadius: 2.5,
                background:
                  'linear-gradient(135deg, #006d3b 0%, #079447 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                fontWeight: 800,
                boxShadow:
                  '0 10px 25px rgba(0,109,59,0.18)',
              }}
            >
              Z
            </Box>

            {/* TITLE */}

            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  color: '#079447',
                  mb: 0.7,
                }}
              >
                ZENIMONIES
              </Typography>

              <Typography
                variant="h5"
                fontWeight={800}
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
                sx={{
                  lineHeight: 1.6,
                }}
              >
                Your session was locked after
                5 minutes of inactivity.
                Authenticate to continue
                securely.
              </Typography>
            </Box>

            {/* PASSKEY ATTEMPT STATUS */}

            {!passwordMode &&
              !passcodeMode &&
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
                  {MAX_PASSKEY_ATTEMPTS}.
                </Alert>
              )}

            {/* PASSCODE ATTEMPT STATUS */}

            {passcodeMode &&
              passcodeFailedAttempts > 0 && (
                <Alert
                  severity={
                    passcodeFailedAttempts >=
                    MAX_PASSCODE_ATTEMPTS
                      ? 'error'
                      : 'warning'
                  }
                  sx={{
                    width: '100%',
                  }}
                >
                  Passcode attempt{' '}
                  {passcodeFailedAttempts} of{' '}
                  {MAX_PASSCODE_ATTEMPTS}.
                </Alert>
              )}

            {/* ERROR */}

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

            {/* SUCCESS */}

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

            {/* ==================================================
                PASSKEY MODE
            ================================================== */}

            {!passwordMode &&
              !passcodeMode && (
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
                    disabled={
                      loading ||
                      !passkeyAvailable
                    }
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
                      py: 1.6,
                      borderRadius: 2,
                      textTransform:
                        'none',
                      fontWeight: 800,
                      fontSize: 15,
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
                      : 'Unlock with Face ID / Passkey'}
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
                    disabled={
                      loading
                    }
                    startIcon={
                      <DialpadIcon />
                    }
                    onClick={
                      handleUsePasscode
                    }
                    sx={{
                      py: 1.4,
                      borderRadius: 2,
                      textTransform:
                        'none',
                      fontWeight: 700,
                      borderColor:
                        '#b8c8c1',
                      color:
                        '#174a3b',
                    }}
                  >
                    Use Account Passcode
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    size="large"
                    disabled={
                      loading
                    }
                    startIcon={
                      <PasswordIcon />
                    }
                    onClick={
                      handleUsePassword
                    }
                    sx={{
                      py: 1.2,
                      borderRadius: 2,
                      textTransform:
                        'none',
                      fontWeight: 650,
                      color:
                        '#174a3b',
                    }}
                  >
                    Use Password Instead
                  </Button>
                </Stack>
              )}

            {/* ==================================================
                ACCOUNT PASSCODE MODE
            ================================================== */}

            {passcodeMode && (
              <Box
                component="form"
                onSubmit={
                  handlePasscodeUnlock
                }
                sx={{
                  width: '100%',
                }}
              >
                <Stack spacing={2.2}>
                  <Box
                    sx={{
                      textAlign:
                        'center',
                    }}
                  >
                    <Box
                      sx={{
                        width: 54,
                        height: 54,
                        borderRadius:
                          '50%',
                        background:
                          '#eef8f3',
                        color:
                          '#079447',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        margin:
                          '0 auto 12px',
                      }}
                    >
                      <DialpadIcon
                        sx={{
                          fontSize: 27,
                        }}
                      />
                    </Box>

                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{
                        color:
                          '#173b32',
                      }}
                    >
                      Account Unlock Passcode
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.7,
                        lineHeight: 1.55,
                      }}
                    >
                      Enter your 6-digit
                      Account Unlock
                      Passcode to continue.
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    type="password"
                    label="6-Digit Passcode"
                    value={passcode}
                    onChange={(event) =>
                      setPasscode(
                        event.target.value
                          .replace(
                            /\D/g,
                            ''
                          )
                          .slice(
                            0,
                            6
                          )
                      )
                    }
                    disabled={
                      loading ||
                      passcodeLocked
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    inputProps={{
                      maxLength: 6,
                      inputMode:
                        'numeric',
                    }}
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={
                      loading ||
                      passcodeLocked ||
                      passcode.length !== 6
                    }
                    startIcon={
                      loading ? (
                        <CircularProgress
                          size={20}
                          color="inherit"
                        />
                      ) : (
                        <LockOutlinedIcon />
                      )
                    }
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform:
                        'none',
                      fontWeight: 800,
                      background:
                        '#174a3b',
                      '&:hover': {
                        background:
                          '#123b30',
                      },
                    }}
                  >
                    {loading
                      ? 'Verifying...'
                      : 'Unlock Account'}
                  </Button>

                  {passcodeLocked &&
                    getLockMessage(
                      passcodeLockedUntil
                    ) && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                      >
                        {getLockMessage(
                          passcodeLockedUntil
                        )}
                      </Typography>
                    )}

                  <Divider>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      OR
                    </Typography>
                  </Divider>

                  <Button
                    type="button"
                    variant="text"
                    disabled={
                      loading
                    }
                    startIcon={
                      <PasswordIcon />
                    }
                    onClick={
                      handleUsePassword
                    }
                    sx={{
                      textTransform:
                        'none',
                      color:
                        '#174a3b',
                      fontWeight: 700,
                    }}
                  >
                    Use Password Instead
                  </Button>

                  {!fallbackRequired &&
                    passkeyAvailable && (
                      <Button
                        type="button"
                        variant="text"
                        disabled={
                          loading
                        }
                        startIcon={
                          <FingerprintIcon />
                        }
                        onClick={
                          handleUsePasskey
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            '#6b7a73',
                        }}
                      >
                        Use Face ID / Passkey
                      </Button>
                    )}
                </Stack>
              </Box>
            )}

            {/* ==================================================
                PASSWORD MODE
            ================================================== */}

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
                  <Box
                    sx={{
                      textAlign:
                        'center',
                    }}
                  >
                    <Box
                      sx={{
                        width: 54,
                        height: 54,
                        borderRadius:
                          '50%',
                        background:
                          '#eef4f1',
                        color:
                          '#174a3b',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        margin:
                          '0 auto 12px',
                      }}
                    >
                      <PasswordIcon
                        sx={{
                          fontSize: 27,
                        }}
                      />
                    </Box>

                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{
                        color:
                          '#173b32',
                      }}
                    >
                      Password Unlock
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.7,
                        lineHeight: 1.55,
                      }}
                    >
                      {fallbackRequired
                        ? 'Passkey authentication has reached the maximum number of failed attempts. Use your password to continue.'
                        : passcodeLocked
                        ? 'Your Account Unlock Passcode is temporarily locked. Use your password to continue.'
                        : 'Enter your Zenimonies password to unlock your session.'}
                    </Typography>
                  </Box>

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
                    disabled={
                      loading
                    }
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
                      ) : (
                        <LockOutlinedIcon />
                      )
                    }
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform:
                        'none',
                      fontWeight: 800,
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

                  {!passcodeLocked &&
                    !fallbackRequired && (
                      <Button
                        type="button"
                        variant="text"
                        disabled={
                          loading
                        }
                        startIcon={
                          <DialpadIcon />
                        }
                        onClick={
                          handleUsePasscode
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            '#174a3b',
                          fontWeight: 700,
                        }}
                      >
                        Use Account Passcode
                      </Button>
                    )}

                  {!fallbackRequired &&
                    !passcodeLocked &&
                    passkeyAvailable && (
                      <Button
                        type="button"
                        variant="text"
                        disabled={
                          loading
                        }
                        startIcon={
                          <FingerprintIcon />
                        }
                        onClick={
                          handleUsePasskey
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            '#6b7a73',
                        }}
                      >
                        Use Face ID / Passkey
                      </Button>
                    )}
                </Stack>
              </Box>
            )}

            {/* ==================================================
                SECURITY NOTICE
            ================================================== */}

            <Box
              sx={{
                width: '100%',
                background:
                  '#f7faf8',
                border:
                  '1px solid #e3ebe7',
                borderRadius: 2,
                px: 2,
                py: 1.6,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display:
                    'block',
                  textAlign:
                    'center',
                  lineHeight: 1.6,
                }}
              >
                Zenimonies never receives or stores
                your biometric data. Your device
                performs Passkey authentication using
                its built-in security system.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountLocked;
