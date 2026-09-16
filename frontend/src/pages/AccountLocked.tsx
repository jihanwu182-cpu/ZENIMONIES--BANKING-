import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios, {
  AxiosError,
} from 'axios';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowBackRounded,
  CheckCircleRounded,
  FingerprintRounded,
  LockRounded,
  PasswordRounded,
  SecurityRounded,
  ShieldRounded,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

import {
  startAuthentication,
} from '@simplewebauthn/browser';

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com';

const MAX_PASSKEY_ATTEMPTS = 3;
const MAX_PASSCODE_ATTEMPTS = 3;

type UnlockMode =
  | 'passkey'
  | 'passcode'
  | 'password';

interface StoredUser {
  id?: string;
  user_id?: string;
  full_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  failed_attempts?: number;
  remaining_attempts?: number;
  max_failed_attempts?: number;
  fallback_required?: boolean;
  locked_until?: string | null;
}

/* ============================================================
   AUTH TOKEN
============================================================ */

const getToken = (): string | null => {
  return (
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem(
      'token'
    )
  );
};

/* ============================================================
   STORED USER
============================================================ */

const getStoredUser =
  (): StoredUser | null => {
    try {
      const raw =
        localStorage.getItem(
          'zenimonies_user'
        );

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

/* ============================================================
   DISPLAY NAME
============================================================ */

const getDisplayName = (
  user: StoredUser | null
): string => {
  const fullName =
    user?.full_name ||
    user?.legal_name ||
    '';

  if (!fullName.trim()) {
    return 'WELCOME BACK';
  }

  const firstName =
    fullName
      .trim()
      .split(/\s+/)[0];

  return firstName.toUpperCase();
};

/* ============================================================
   ERROR MESSAGE
============================================================ */

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const axiosError =
    error as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data
      ?.message ||
    axiosError.response?.data
      ?.error ||
    fallback
  );
};

/* ============================================================
   ACCOUNT LOCKED
============================================================ */

const AccountLocked: React.FC =
  () => {
    const [
      mode,
      setMode,
    ] = useState<UnlockMode>(
      'passkey'
    );

    const [
      user,
      setUser,
    ] = useState<StoredUser | null>(
      getStoredUser()
    );

    const [
      email,
      setEmail,
    ] = useState('');

    const [
      loadingProfile,
      setLoadingProfile,
    ] = useState(true);

    const [
      passkeyLoading,
      setPasskeyLoading,
    ] = useState(false);

    const [
      passkeyAttempts,
      setPasskeyAttempts,
    ] = useState(0);

    const [
      passcode,
      setPasscode,
    ] = useState('');

    const [
      passcodeLoading,
      setPasscodeLoading,
    ] = useState(false);

    const [
      passcodeAttempts,
      setPasscodeAttempts,
    ] = useState(0);

    const [
      password,
      setPassword,
    ] = useState('');

    const [
      passwordLoading,
      setPasswordLoading,
    ] = useState(false);

    const [
      showPassword,
      setShowPassword,
    ] = useState(false);

    const [
      error,
      setError,
    ] = useState('');

    const [
      successMessage,
      setSuccessMessage,
    ] = useState('');

    const [
      lockedUntil,
      setLockedUntil,
    ] = useState<string | null>(
      null
    );

    /* ========================================================
       LOAD ACCOUNT
    ======================================================== */

    useEffect(() => {
      let mounted = true;

      const loadAccount =
        async () => {
          const token =
            getToken();

          const storedUser =
            getStoredUser();

          if (
            storedUser &&
            mounted
          ) {
            setUser(
              storedUser
            );

            if (
              storedUser.email
            ) {
              setEmail(
                String(
                  storedUser.email
                )
                  .trim()
                  .toLowerCase()
              );
            }
          }

          if (!token) {
            if (mounted) {
              setLoadingProfile(
                false
              );

              setError(
                'Your secure session could not be found. Please sign in again.'
              );
            }

            return;
          }

          try {
            const response =
              await axios.get(
                `${API_BASE_URL}/api/profile`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  timeout: 15000,
                }
              );

            if (!mounted) {
              return;
            }

            const profile =
              response.data?.user ||
              response.data?.profile ||
              response.data;

            if (profile) {
              setUser(
                profile
              );

              const profileEmail =
                profile.email ||
                storedUser?.email ||
                '';

              if (
                profileEmail
              ) {
                setEmail(
                  String(
                    profileEmail
                  )
                    .trim()
                    .toLowerCase()
                );
              }

              try {
                localStorage.setItem(
                  'zenimonies_user',
                  JSON.stringify(
                    profile
                  )
                );
              } catch {
                // Local storage is only a fallback.
              }
            }
          } catch {
            /*
             * The locally stored user remains
             * available as a fallback.
             */
          } finally {
            if (mounted) {
              setLoadingProfile(
                false
              );
            }
          }
        };

      loadAccount();

      return () => {
        mounted = false;
      };
    }, []);

    /* ========================================================
       DISPLAY NAME
    ======================================================== */

    const displayName =
      useMemo(() => {
        return getDisplayName(
          user
        );
      }, [user]);

    /* ========================================================
       UNLOCK SESSION
    ======================================================== */

    const unlockAccount =
      useCallback(() => {
        sessionStorage.removeItem(
          'zenimonies_account_locked'
        );

        sessionStorage.removeItem(
          'zenimonies_passkey_fallback'
        );

        window.dispatchEvent(
          new Event(
            'zenimonies:unlock'
          )
        );
      }, []);

    /* ========================================================
       SAVE AUTHENTICATED SESSION
    ======================================================== */

    const saveAuthenticatedSession =
      useCallback(
        (data: any) => {
          const token =
            data?.token ||
            data?.access_token ||
            data?.accessToken ||
            data?.data?.token;

          if (!token) {
            throw new Error(
              'Authentication succeeded but no secure session was returned.'
            );
          }

          localStorage.setItem(
            'zenimonies_token',
            token
          );

          localStorage.setItem(
            'token',
            token
          );

          const authenticatedUser =
            data?.user ||
            data?.data?.user;

          if (
            authenticatedUser
          ) {
            localStorage.setItem(
              'zenimonies_user',
              JSON.stringify(
                authenticatedUser
              )
            );
          }
        },
        []
      );

    /* ========================================================
       PASSKEY FAILURE
    ======================================================== */

    const handlePasskeyFailure =
      useCallback(
        (
          nextAttempts: number,
          fallbackRequired = false,
          message?: string
        ) => {
          setPasskeyAttempts(
            nextAttempts
          );

          if (
            fallbackRequired ||
            nextAttempts >=
              MAX_PASSKEY_ATTEMPTS
          ) {
            sessionStorage.setItem(
              'zenimonies_passkey_fallback',
              'true'
            );

            setMode(
              'passcode'
            );

            setError('');

            setSuccessMessage(
              'Use your 6-digit Account Unlock Passcode to continue.'
            );

            return;
          }

          setError(
            message ||
              `Passkey verification failed. Attempt ${nextAttempts} of ${MAX_PASSKEY_ATTEMPTS}.`
          );
        },
        []
      );

    /* ========================================================
       PASSKEY UNLOCK
    ======================================================== */

    const handlePasskeyUnlock =
      async () => {
        setError('');
        setSuccessMessage('');

        if (!email) {
          setError(
            'We could not securely load your account details. Please use your Account Unlock Passcode or password.'
          );

          return;
        }

        if (
          passkeyAttempts >=
          MAX_PASSKEY_ATTEMPTS
        ) {
          setMode(
            'passcode'
          );

          return;
        }

        setPasskeyLoading(
          true
        );

        try {
          const optionsResponse =
            await axios.post(
              `${API_BASE_URL}/api/passkey/login/options`,
              {
                email,
              },
              {
                timeout: 20000,
              }
            );

          const options =
            optionsResponse
              .data?.options ||
            optionsResponse.data;

          if (!options) {
            throw new Error(
              'Unable to start Passkey authentication.'
            );
          }

          const authenticationResponse =
            await startAuthentication(
              {
                optionsJSON:
                  options,
              }
            );

          const verifyResponse =
            await axios.post(
              `${API_BASE_URL}/api/passkey/login/verify`,
              {
                email,
                response:
                  authenticationResponse,
              },
              {
                timeout: 30000,
              }
            );

          const data =
            verifyResponse.data ||
            {};

          saveAuthenticatedSession(
            data
          );

          setPasskeyAttempts(
            0
          );

          setSuccessMessage(
            'Your secure session has been restored.'
          );

          setTimeout(() => {
            unlockAccount();
          }, 350);
        } catch (error) {
          const axiosError =
            error as AxiosError<ApiErrorResponse>;

          const errorName =
            (error as any)?.name;

          /*
           * Cancellation is not a failed attempt.
           */
          if (
            errorName ===
              'NotAllowedError' ||
            errorName ===
              'AbortError'
          ) {
            setError(
              'Authentication was cancelled. You can try again.'
            );

            return;
          }

          const responseData =
            axiosError
              .response?.data;

          const serverAttempts =
            responseData
              ?.failed_attempts;

          const fallbackRequired =
            responseData
              ?.fallback_required ===
              true ||
            responseData
              ?.code ===
              'PASSKEY_FALLBACK_REQUIRED';

          const nextAttempts =
            typeof serverAttempts ===
            'number'
              ? serverAttempts
              : passkeyAttempts + 1;

          handlePasskeyFailure(
            nextAttempts,
            fallbackRequired,
            getErrorMessage(
              error,
              'Passkey verification could not be completed.'
            )
          );
        } finally {
          setPasskeyLoading(
            false
          );
        }
      };

    /* ========================================================
       ACCOUNT UNLOCK PASSCODE
    ======================================================== */

    const handlePasscodeUnlock =
      async () => {
        setError('');
        setSuccessMessage('');

        if (
          !/^\d{6}$/.test(
            passcode
          )
        ) {
          setError(
            'Enter your 6-digit Account Unlock Passcode.'
          );

          return;
        }

        if (
          passcodeAttempts >=
          MAX_PASSCODE_ATTEMPTS
        ) {
          setMode(
            'password'
          );

          return;
        }

        const token =
          getToken();

        if (!token) {
          setError(
            'Your secure session could not be found. Please use your password.'
          );

          setMode(
            'password'
          );

          return;
        }

        setPasscodeLoading(
          true
        );

        try {
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
              timeout: 20000,
            }
          );

          setPasscode(
            ''
          );

          setPasscodeAttempts(
            0
          );

          setSuccessMessage(
            'Your secure session has been restored.'
          );

          setTimeout(() => {
            unlockAccount();
          }, 350);
        } catch (error) {
          const axiosError =
            error as AxiosError<ApiErrorResponse>;

          const responseData =
            axiosError
              .response?.data;

          const serverAttempts =
            responseData
              ?.failed_attempts;

          const nextAttempts =
            typeof serverAttempts ===
            'number'
              ? serverAttempts
              : passcodeAttempts + 1;

          const locked =
            responseData
              ?.code ===
              'PASSCODE_LOCKED' ||
            responseData
              ?.fallback_required ===
              true;

          setPasscodeAttempts(
            nextAttempts
          );

          setPasscode('');

          if (
            responseData?.locked_until
          ) {
            setLockedUntil(
              responseData.locked_until
            );
          }

          if (
            locked ||
            nextAttempts >=
              MAX_PASSCODE_ATTEMPTS
          ) {
            setMode(
              'password'
            );

            setError(
              'Your Account Unlock Passcode is temporarily locked. Please use your password.'
            );

            return;
          }

          setError(
            `Incorrect passcode. Attempt ${nextAttempts} of ${MAX_PASSCODE_ATTEMPTS}.`
          );
        } finally {
          setPasscodeLoading(
            false
          );
        }
      };

    /* ========================================================
       PASSWORD FALLBACK
    ======================================================== */

    const handlePasswordUnlock =
      async () => {
        setError('');
        setSuccessMessage('');

        if (!email) {
          setError(
            'We could not load your account email. Please sign in again.'
          );

          return;
        }

        if (!password) {
          setError(
            'Enter your password to continue.'
          );

          return;
        }

        setPasswordLoading(
          true
        );

        try {
          const response =
            await axios.post(
              `${API_BASE_URL}/api/auth/login`,
              {
                email,
                password,
              },
              {
                timeout: 20000,
              }
            );

          const data =
            response.data ||
            {};

          saveAuthenticatedSession(
            data
          );

          setPassword(
            ''
          );

          setSuccessMessage(
            'Your secure session has been restored.'
          );

          setTimeout(() => {
            unlockAccount();
          }, 350);
        } catch (error) {
          setError(
            getErrorMessage(
              error,
              'Password verification failed. Please check your password and try again.'
            )
          );
        } finally {
          setPasswordLoading(
            false
          );
        }
      };

    /* ========================================================
       MODE SWITCHES
    ======================================================== */

    const handleUsePasscode =
      () => {
        setError('');
        setSuccessMessage('');
        setPasscode('');
        setMode(
          'passcode'
        );
      };

    const handleUsePassword =
      () => {
        setError('');
        setSuccessMessage('');
        setPassword('');
        setMode(
          'password'
        );
      };

    const handleUsePasskey =
      () => {
        setError('');
        setSuccessMessage('');
        setPasscode('');
        setPassword('');
        setMode(
          'passkey'
        );
      };

    /* ========================================================
       LOADING STATE
    ======================================================== */

    if (
      loadingProfile &&
      !user
    ) {
      return (
        <Box
          sx={{
            minHeight:
              '100vh',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            background:
              '#f3f7f5',
          }}
        >
          <CircularProgress
            size={30}
            sx={{
              color:
                '#0d674e',
            }}
          />
        </Box>
      );
    }

    const currentLoading =
      passkeyLoading ||
      passcodeLoading ||
      passwordLoading;

    /* ========================================================
       UI
    ======================================================== */

    return (
      <Box
        sx={{
          minHeight:
            '100vh',
          width: '100%',
          boxSizing:
            'border-box',
          background:
            'linear-gradient(145deg, #f1f7f4 0%, #f8fbfa 50%, #edf5f2 100%)',
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
          px: 2,
          py: 3,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth:
              430,
          }}
        >
          {/* ==================================================
              BRAND
          ================================================== */}

          <Box
            sx={{
              textAlign:
                'center',
              mb: 2.5,
            }}
          >
            <Typography
              sx={{
                color:
                  '#0e3027',
                fontFamily:
                  'Georgia, "Times New Roman", serif',
                fontSize:
                  {
                    xs: 29,
                    sm: 32,
                  },
                fontWeight:
                  700,
                letterSpacing:
                  '-1px',
              }}
            >
              Zenimonies
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color:
                  '#73827d',
                fontSize:
                  10,
                fontWeight:
                  800,
                letterSpacing:
                  '2.6px',
              }}
            >
              SECURE MONEY. SIMPLY.
            </Typography>
          </Box>

          {/* ==================================================
              MAIN CARD
          ================================================== */}

          <Paper
            elevation={0}
            sx={{
              borderRadius:
                '26px',
              border:
                '1px solid rgba(13,103,78,0.10)',
              background:
                'rgba(255,255,255,0.97)',
              boxShadow:
                '0 20px 55px rgba(23,55,44,0.09)',
              px: {
                xs: 2.5,
                sm: 3.5,
              },
              py: {
                xs: 3,
                sm: 3.5,
              },
            }}
          >
            {/* =================================================
                WELCOME LINE
            ================================================= */}

            <Box
              sx={{
                textAlign:
                  'center',
                mb: 2.5,
              }}
            >
              <Typography
                sx={{
                  color:
                    '#71817b',
                  fontSize:
                    10,
                  fontWeight:
                    850,
                  letterSpacing:
                    '1.8px',
                }}
              >
                WELCOME BACK{' '}
                <Box
                  component="span"
                  sx={{
                    color:
                      '#0d674e',
                    fontWeight:
                      900,
                  }}
                >
                  {displayName.replace(
                    'WELCOME BACK',
                    ''
                  ).trim()}
                </Box>
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color:
                    '#122c24',
                  fontSize:
                    {
                      xs: 24,
                      sm: 26,
                    },
                  fontWeight:
                    800,
                  letterSpacing:
                    '-0.5px',
                }}
              >
                Unlock Account
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color:
                    '#7a8984',
                  fontSize:
                    12,
                }}
              >
                Your session was locked after inactivity.
              </Typography>
            </Box>

            {/* =================================================
                SECURITY ICON
            ================================================= */}

            <Box
              sx={{
                display:
                  'flex',
                justifyContent:
                  'center',
                mb: 2.5,
              }}
            >
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius:
                    '21px',
                  background:
                    '#eaf5f0',
                  color:
                    '#0d674e',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <ShieldRounded
                  sx={{
                    fontSize:
                      38,
                  }}
                />
              </Box>
            </Box>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius:
                    '13px',
                  fontSize:
                    12,
                  alignItems:
                    'center',
                }}
              >
                {error}
              </Alert>
            )}

            {/* =================================================
                SUCCESS
            ================================================= */}

            {successMessage && (
              <Alert
                icon={
                  <CheckCircleRounded
                    fontSize="inherit"
                  />
                }
                severity="success"
                sx={{
                  mb: 2,
                  borderRadius:
                    '13px',
                  fontSize:
                    12,
                }}
              >
                {successMessage}
              </Alert>
            )}

            {/* =================================================
                PASSKEY MODE
            ================================================= */}

            {mode ===
              'passkey' && (
              <Stack
                alignItems="center"
                spacing={2}
              >
                <Typography
                  sx={{
                    color:
                      '#475a53',
                    fontSize:
                      13,
                    textAlign:
                      'center',
                    lineHeight:
                      1.5,
                  }}
                >
                  Confirm your identity to restore your secure session.
                </Typography>

                {/* ---------------------------------------------
                    COMPACT PASSKEY BUTTON
                --------------------------------------------- */}

                <Button
                  variant="contained"
                  onClick={
                    handlePasskeyUnlock
                  }
                  disabled={
                    currentLoading
                  }
                  startIcon={
                    passkeyLoading ? (
                      <CircularProgress
                        size={18}
                        sx={{
                          color:
                            'inherit',
                        }}
                      />
                    ) : (
                      <FingerprintRounded />
                    )
                  }
                  sx={{
                    width:
                      'auto',
                    minWidth:
                      {
                        xs: 225,
                        sm: 245,
                      },
                    maxWidth:
                      '290px',
                    minHeight:
                      50,
                    px: 3,
                    borderRadius:
                      '14px',
                    background:
                      '#0d674e',
                    color:
                      '#ffffff',
                    fontSize:
                      14,
                    fontWeight:
                      800,
                    textTransform:
                      'none',
                    boxShadow:
                      '0 10px 22px rgba(13,103,78,0.18)',
                    '&:hover': {
                      background:
                        '#09563f',
                    },
                  }}
                >
                  {passkeyLoading
                    ? 'Verifying...'
                    : 'Use Passkey'}
                </Button>

                {passkeyAttempts >
                  0 && (
                  <Typography
                    sx={{
                      color:
                        '#9a5a00',
                      fontSize:
                        11,
                      fontWeight:
                        700,
                    }}
                  >
                    Attempt{' '}
                    {
                      passkeyAttempts
                    }{' '}
                    of{' '}
                    {
                      MAX_PASSKEY_ATTEMPTS
                    }
                  </Typography>
                )}

                <Button
                  variant="text"
                  onClick={
                    handleUsePasscode
                  }
                  disabled={
                    currentLoading
                  }
                  sx={{
                    color:
                      '#0d674e',
                    fontSize:
                      12,
                    fontWeight:
                      750,
                    textTransform:
                      'none',
                    minHeight:
                      34,
                  }}
                >
                  Use Account Unlock Passcode
                </Button>
              </Stack>
            )}

            {/* =================================================
                PASSCODE MODE
            ================================================= */}

            {mode ===
              'passcode' && (
              <Stack
                spacing={2}
              >
                <Box
                  sx={{
                    textAlign:
                      'center',
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        '#17332a',
                      fontSize:
                        17,
                      fontWeight:
                        800,
                    }}
                  >
                    Account Unlock Passcode
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      color:
                        '#7a8984',
                      fontSize:
                        12,
                    }}
                  >
                    Enter your 6-digit passcode.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  value={
                    passcode
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target.value
                        .replace(
                          /\D/g,
                          ''
                        )
                        .slice(
                          0,
                          6
                        );

                    setPasscode(
                      value
                    );
                  }}
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  disabled={
                    currentLoading
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      passcode.length ===
                        6
                    ) {
                      handlePasscodeUnlock();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PasswordRounded
                          sx={{
                            color:
                              '#82918b',
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root':
                      {
                        borderRadius:
                          '14px',
                        background:
                          '#ffffff',
                        '& fieldset':
                          {
                            borderColor:
                              '#d6e0dc',
                          },
                      },
                    '& input': {
                      textAlign:
                        'center',
                      letterSpacing:
                        '6px',
                      fontWeight:
                        700,
                    },
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={
                    handlePasscodeUnlock
                  }
                  disabled={
                    currentLoading ||
                    passcode.length !==
                      6
                  }
                  sx={{
                    minHeight:
                      52,
                    borderRadius:
                      '14px',
                    background:
                      '#12362c',
                    textTransform:
                      'none',
                    fontWeight:
                      800,
                    '&:hover':
                      {
                        background:
                          '#0d2b23',
                      },
                  }}
                >
                  {passcodeLoading ? (
                    <CircularProgress
                      size={21}
                      sx={{
                        color:
                          '#ffffff',
                      }}
                    />
                  ) : (
                    'Unlock Account'
                  )}
                </Button>

                <Button
                  variant="text"
                  onClick={
                    handleUsePassword
                  }
                  disabled={
                    currentLoading
                  }
                  sx={{
                    color:
                      '#0d674e',
                    textTransform:
                      'none',
                    fontSize:
                      12,
                    fontWeight:
                      750,
                  }}
                >
                  Use password instead
                </Button>
              </Stack>
            )}

            {/* =================================================
                PASSWORD MODE
            ================================================= */}

            {mode ===
              'password' && (
              <Stack
                spacing={2}
              >
                <Box
                  sx={{
                    textAlign:
                      'center',
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        '#17332a',
                      fontSize:
                        17,
                      fontWeight:
                        800,
                    }}
                  >
                    Sign in with Password
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      color:
                        '#7a8984',
                      fontSize:
                        12,
                    }}
                  >
                    Use your account password to restore access.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  value={
                    email
                  }
                  disabled
                  label="Email address"
                  sx={{
                    '& .MuiOutlinedInput-root':
                      {
                        borderRadius:
                          '14px',
                        background:
                          '#f7faf8',
                      },
                  }}
                />

                <TextField
                  fullWidth
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  label="Password"
                  autoComplete="current-password"
                  disabled={
                    currentLoading
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      password
                    ) {
                      handlePasswordUnlock();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRounded
                          sx={{
                            color:
                              '#82918b',
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowPassword(
                              (
                                previous
                              ) =>
                                !previous
                            )
                          }
                          disabled={
                            currentLoading
                          }
                          edge="end"
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
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root':
                      {
                        borderRadius:
                          '14px',
                      },
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={
                    handlePasswordUnlock
                  }
                  disabled={
                    currentLoading ||
                    !password
                  }
                  sx={{
                    minHeight:
                      52,
                    borderRadius:
                      '14px',
                    background:
                      '#12362c',
                    textTransform:
                      'none',
                    fontWeight:
                      800,
                    '&:hover':
                      {
                        background:
                          '#0d2b23',
                      },
                  }}
                >
                  {passwordLoading ? (
                    <CircularProgress
                      size={21}
                      sx={{
                        color:
                          '#ffffff',
                      }}
                    />
                  ) : (
                    'Unlock Account'
                  )}
                </Button>

                <Button
                  variant="text"
                  onClick={
                    handleUsePasskey
                  }
                  disabled={
                    currentLoading
                  }
                  sx={{
                    color:
                      '#0d674e',
                    textTransform:
                      'none',
                    fontSize:
                      12,
                    fontWeight:
                      750,
                  }}
                >
                  Back to Passkey
                </Button>
              </Stack>
            )}

            {/* =================================================
                SECURITY FOOTER
            ================================================= */}

            <Divider
              sx={{
                my: 2.5,
                borderColor:
                  '#e7eeeb',
              }}
            />

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={1}
            >
              <SecurityRounded
                sx={{
                  fontSize:
                    17,
                  color:
                    '#6e7f78',
                }}
              />

              <Typography
                sx={{
                  color:
                    '#7a8984',
                  fontSize:
                    11,
                  textAlign:
                    'center',
                }}
              >
                Secure session protection
              </Typography>
            </Stack>

            {lockedUntil && (
              <Typography
                sx={{
                  mt: 1,
                  textAlign:
                    'center',
                  color:
                    '#8a7160',
                  fontSize:
                    10,
                }}
              >
                Additional verification is temporarily restricted.
              </Typography>
            )}
          </Paper>

          {/* ==================================================
              BACK TO LOGIN
          ================================================== */}

          <Box
            sx={{
              display:
                'flex',
              justifyContent:
                'center',
              mt: 2,
            }}
          >
            <Button
              startIcon={
                <ArrowBackRounded
                  sx={{
                    fontSize:
                      17,
                  }}
                />
              }
              onClick={() => {
                /*
                 * This does not unlock the existing
                 * protected session. It only provides
                 * a route to normal login when the
                 * user intentionally chooses it.
                 */
                window.location.href =
                  '/login';
              }}
              sx={{
                color:
                  '#70817a',
                fontSize:
                  11,
                fontWeight:
                  650,
                textTransform:
                  'none',
              }}
            >
              Return to sign in
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

export default AccountLocked;
