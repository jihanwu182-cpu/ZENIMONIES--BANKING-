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
  success?: boolean;
  message?: string;
  error?: string;
  code?: string;

  failed_attempts?: number;
  remaining_attempts?: number;
  max_failed_attempts?: number;

  fallback_required?: boolean;
  locked_until?: string | null;

  token?: string;
  access_token?: string;
  accessToken?: string;

  user?: StoredUser;
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
    return '';
  }

  return fullName
    .trim()
    .split(/\s+/)[0]
    .toUpperCase();
};

/* ============================================================
   API ERROR
============================================================ */

const getApiError =
  (
    error: unknown,
    fallback: string
  ): string => {
    if (
      axios.isAxiosError(error)
    ) {
      const axiosError =
        error as AxiosError<ApiErrorResponse>;

      const data =
        axiosError.response?.data;

      if (
        data?.message
      ) {
        return data.message;
      }

      if (
        data?.error
      ) {
        return data.error;
      }

      if (
        axiosError.response
      ) {
        return `Server error: HTTP ${axiosError.response.status}`;
      }

      return 'Unable to reach the Zenimonies server.';
    }

    if (
      error instanceof Error &&
      error.message
    ) {
      return error.message;
    }

    return fallback;
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

    /* ==========================================================
       LOAD USER PROFILE
    ========================================================== */

    useEffect(() => {
      let mounted = true;

      const loadAccount =
        async () => {
          const storedUser =
            getStoredUser();

          const token =
            getToken();

          /*
           * Use local profile immediately.
           */
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

          /*
           * If there is no token, don't
           * prevent the password fallback
           * from being displayed.
           */
          if (!token) {
            if (mounted) {
              setLoadingProfile(
                false
              );
            }

            return;
          }

          /*
           * Try to refresh the user profile.
           *
           * Failure here must NOT destroy
           * the locally available account
           * information.
           */
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

              if (
                profile.email
              ) {
                setEmail(
                  String(
                    profile.email
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
                // Ignore local storage errors.
              }
            }
          } catch {
            /*
             * Keep the locally stored user.
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

    /* ==========================================================
       DISPLAY NAME
    ========================================================== */

    const displayName =
      useMemo(() => {
        return getDisplayName(
          user
        );
      }, [user]);

    /* ==========================================================
       UNLOCK EVENT
    ========================================================== */

    const unlockAccount =
      useCallback(() => {
        try {
          sessionStorage.removeItem(
            'zenimonies_account_locked'
          );

          sessionStorage.removeItem(
            'zenimonies_passkey_fallback'
          );
        } catch {
          // Ignore storage errors.
        }

        window.dispatchEvent(
          new Event(
            'zenimonies:unlock'
          )
        );
      }, []);

    /* ==========================================================
       SAVE NEW AUTH SESSION
    ========================================================== */

    const saveAuthenticatedSession =
      useCallback(
        (
          data: ApiErrorResponse
        ) => {
          const token =
            data.token ||
            data.access_token ||
            data.accessToken;

          if (!token) {
            throw new Error(
              'Authentication succeeded but no secure session token was returned.'
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

          if (
            data.user
          ) {
            localStorage.setItem(
              'zenimonies_user',
              JSON.stringify(
                data.user
              )
            );
          }
        },
        []
      );

    /* ==========================================================
       PASSKEY FAILURE
    ========================================================== */

    const handlePasskeyFailure =
      useCallback(
        (
          attempts: number,
          fallbackRequired: boolean,
          message: string
        ) => {
          setPasskeyAttempts(
            attempts
          );

          if (
            fallbackRequired ||
            attempts >=
              MAX_PASSKEY_ATTEMPTS
          ) {
            setMode(
              'passcode'
            );

            setPasscode('');

            setError('');

            setSuccessMessage(
              'Use your 6-digit Account Unlock Passcode to continue.'
            );

            return;
          }

          setError(
            message
          );
        },
        []
      );

    /* ==========================================================
       PASSKEY UNLOCK
    ========================================================== */

    const handlePasskeyUnlock =
      async () => {
        setError('');
        setSuccessMessage('');

        const cleanEmail =
          email
            .trim()
            .toLowerCase();

        if (!cleanEmail) {
          setError(
            'Your account email could not be loaded. Please use your password.'
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
          /*
           * 1. Request WebAuthn options.
           */
          const optionsResponse =
            await axios.post(
              `${API_BASE_URL}/api/passkey/login/options`,
              {
                email:
                  cleanEmail,
              },
              {
                timeout: 20000,
                headers: {
                  'Content-Type':
                    'application/json',
                },
              }
            );

          const options =
            optionsResponse.data
              ?.options;

          if (!options) {
            throw new Error(
              'Unable to start Passkey authentication.'
            );
          }

          /*
           * 2. Real device authentication.
           */
          const authenticationResponse =
            await startAuthentication(
              {
                optionsJSON:
                  options,
              }
            );

          /*
           * 3. Verify cryptographic
           *    assertion on backend.
           */
          const verifyResponse =
            await axios.post(
              `${API_BASE_URL}/api/passkey/login/verify`,
              {
                email:
                  cleanEmail,

                response:
                  authenticationResponse,
              },
              {
                timeout: 30000,
                headers: {
                  'Content-Type':
                    'application/json',
                },
              }
            );

          const data =
            verifyResponse.data;

          saveAuthenticatedSession(
            data
          );

          setPasskeyAttempts(
            0
          );

          setSuccessMessage(
            'Your secure session has been restored.'
          );

          setTimeout(
            unlockAccount,
            350
          );
        } catch (error) {
          const axiosError =
            error as AxiosError<ApiErrorResponse>;

          const errorName =
            (error as any)?.name;

          /*
           * User cancellation is NOT
           * a failed authentication.
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
            axiosError.response
              ?.data;

          const serverAttempts =
            Number(
              responseData
                ?.failed_attempts
            );

          const fallbackRequired =
            responseData
              ?.fallback_required ===
              true ||
            responseData
              ?.code ===
              'PASSKEY_FALLBACK_REQUIRED';

          const nextAttempts =
            serverAttempts > 0
              ? serverAttempts
              : passkeyAttempts + 1;

          handlePasskeyFailure(
            nextAttempts,
            fallbackRequired,
            getApiError(
              error,
              'Passkey authentication could not be completed.'
            )
          );
        } finally {
          setPasskeyLoading(
            false
          );
        }
      };

    /* ==========================================================
       ACCOUNT UNLOCK PASSCODE
    ========================================================== */

    const handlePasscodeUnlock =
      async () => {
        setError('');
        setSuccessMessage('');

        /*
         * EXACTLY 6 DIGITS
         */
        const cleanPasscode =
          passcode.trim();

        if (
          !/^\d{6}$/.test(
            cleanPasscode
          )
        ) {
          setError(
            'Enter your 6-digit Account Unlock Passcode.'
          );

          return;
        }

        /*
         * Local fallback limit.
         *
         * The backend remains authoritative.
         */
        if (
          passcodeAttempts >=
          MAX_PASSCODE_ATTEMPTS
        ) {
          setMode(
            'password'
          );

          setPasscode('');

          setError(
            'Please use your password to restore access.'
          );

          return;
        }

        const token =
          getToken();

        if (!token) {
          setMode(
            'password'
          );

          setPasscode('');

          setError(
            'Your secure session could not be found. Please use your password.'
          );

          return;
        }

        setPasscodeLoading(
          true
        );

        try {
          /*
           * IMPORTANT:
           *
           * This is the dedicated Account
           * Unlock Passcode verification
           * endpoint.
           *
           * It is NOT the Transaction PIN.
           */
          const response =
            await axios.post<ApiErrorResponse>(
              `${API_BASE_URL}/api/passcode/unlock`,
              {
                passcode:
                  cleanPasscode,
              },
              {
                timeout: 20000,

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  'Content-Type':
                    'application/json',
                },
              }
            );

          const data =
            response.data;

          /*
           * Backend must explicitly
           * confirm verification.
           */
          if (
            data.success !== true ||
            data.verified !== true
          ) {
            throw new Error(
              data.message ||
                'Account Unlock Passcode verification could not be completed.'
            );
          }

          /*
           * SUCCESS
           */
          setPasscode('');

          setPasscodeAttempts(
            0
          );

          setError('');

          setSuccessMessage(
            'Your secure session has been restored.'
          );

          setTimeout(
            unlockAccount,
            350
          );
        } catch (error) {
          const axiosError =
            error as AxiosError<ApiErrorResponse>;

          const responseData =
            axiosError.response
              ?.data;

          const serverAttempts =
            typeof responseData
              ?.failed_attempts ===
            'number'
              ? responseData.failed_attempts
              : null;

          /*
           * IMPORTANT:
           *
           * Do not assume every error
           * means the passcode was wrong.
           */
          if (
            responseData
              ?.code ===
            'PASSCODE_NOT_SET'
          ) {
            setPasscode('');

            setError(
              'You have not created an Account Unlock Passcode yet. Please use your password to restore access.'
            );

            setMode(
              'password'
            );

            return;
          }

          if (
            responseData
              ?.code ===
            'PASSCODE_LOCKED'
          ) {
            setPasscode('');

            setPasscodeAttempts(
              MAX_PASSCODE_ATTEMPTS
            );

            setError(
              'Your Account Unlock Passcode is temporarily locked. Please use your password.'
            );

            setMode(
              'password'
            );

            return;
          }

          /*
           * Actual incorrect-passcode response.
           */
          if (
            responseData
              ?.code ===
              'INCORRECT_PASSCODE'
          ) {
            const nextAttempts =
              serverAttempts !== null
                ? serverAttempts
                : passcodeAttempts + 1;

            setPasscode('');

            setPasscodeAttempts(
              nextAttempts
            );

            if (
              nextAttempts >=
              MAX_PASSCODE_ATTEMPTS
            ) {
              setMode(
                'password'
              );

              setError(
                'Your Account Unlock Passcode has reached the maximum number of failed attempts. Please use your password.'
              );

              return;
            }

            const remaining =
              Math.max(
                MAX_PASSCODE_ATTEMPTS -
                  nextAttempts,
                0
              );

            setError(
              `Incorrect passcode. ${remaining} attempt${
                remaining === 1
                  ? ''
                  : 's'
              } remaining.`
            );

            return;
          }

          /*
           * Authentication problem,
           * network problem, or unexpected
           * server error.
           *
           * Do NOT count it as a wrong
           * passcode.
           */
          setError(
            getApiError(
              error,
              'We could not verify your Account Unlock Passcode. Please try again.'
            )
          );
        } finally {
          setPasscodeLoading(
            false
          );
        }
      };

    /* ==========================================================
       PASSWORD FALLBACK
    ========================================================== */

    const handlePasswordUnlock =
      async () => {
        setError('');
        setSuccessMessage('');

        const cleanEmail =
          email
            .trim()
            .toLowerCase();

        if (!cleanEmail) {
          setError(
            'Your account email could not be loaded. Please sign in again.'
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
            await axios.post<ApiErrorResponse>(
              `${API_BASE_URL}/api/auth/login`,
              {
                email:
                  cleanEmail,

                password,
              },
              {
                timeout: 30000,

                headers: {
                  'Content-Type':
                    'application/json',
                },
              }
            );

          const data =
            response.data;

          if (
            data.success === false
          ) {
            throw new Error(
              data.message ||
                'Password verification failed.'
            );
          }

          saveAuthenticatedSession(
            data
          );

          setPassword('');

          setSuccessMessage(
            'Your secure session has been restored.'
          );

          setTimeout(
            unlockAccount,
            350
          );
        } catch (error) {
          setError(
            getApiError(
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

    /* ==========================================================
       MODE SWITCHES
    ========================================================== */

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

    const busy =
      passkeyLoading ||
      passcodeLoading ||
      passwordLoading;

    /* ==========================================================
       LOADING
    ========================================================== */

    if (
      loadingProfile &&
      !user
    ) {
      return (
        <Box
          sx={{
            minHeight:
              '100vh',
            display:
              'flex',
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

    /* ==========================================================
       UI
    ========================================================== */

    return (
      <Box
        sx={{
          minHeight:
            '100vh',
          width:
            '100%',
          boxSizing:
            'border-box',
          background:
            'linear-gradient(145deg, #f1f7f4 0%, #f8fbfa 50%, #edf5f2 100%)',
          display:
            'flex',
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
            width:
              '100%',
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
              CARD
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
              px:
                {
                  xs: 2.5,
                  sm: 3.5,
                },
              py:
                {
                  xs: 3,
                  sm: 3.5,
                },
            }}
          >
            {/* =================================================
                WELCOME
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

                {displayName && (
                  <Box
                    component="span"
                    sx={{
                      color:
                        '#0d674e',
                      fontWeight:
                        900,
                    }}
                  >
                    {displayName}
                  </Box>
                )}
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
                  width:
                    68,
                  height:
                    68,
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
                severity="success"
                icon={
                  <CheckCircleRounded
                    fontSize="inherit"
                  />
                }
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
                PASSKEY
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

                <Button
                  variant="contained"
                  onClick={
                    handlePasskeyUnlock
                  }
                  disabled={
                    busy
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
                      290,
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
                    '&:hover':
                      {
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
                    busy
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
                  }}
                >
                  Use Account Unlock Passcode
                </Button>
              </Stack>
            )}

            {/* =================================================
                PASSCODE
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
                  autoFocus
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

                    if (
                      error
                    ) {
                      setError('');
                    }
                  }}
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  disabled={
                    busy
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      passcode.length ===
                        6 &&
                      !busy
                    ) {
                      event.preventDefault();

                      handlePasscodeUnlock();
                    }
                  }}
                  InputProps={{
                    startAdornment:
                      (
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
                      },

                    '& input': {
                      textAlign:
                        'center',
                      letterSpacing:
                        '6px',
                      fontWeight:
                        800,
                      fontSize:
                        18,
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
                    busy ||
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
                    busy
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
                  }}
                >
                  Use password instead
                </Button>

                <Button
                  variant="text"
                  onClick={
                    handleUsePasskey
                  }
                  disabled={
                    busy
                  }
                  sx={{
                    color:
                      '#7a8984',
                    fontSize:
                      11,
                    textTransform:
                      'none',
                  }}
                >
                  Back to Passkey
                </Button>
              </Stack>
            )}

            {/* =================================================
                PASSWORD
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
                    busy
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      password &&
                      !busy
                    ) {
                      event.preventDefault();

                      handlePasswordUnlock();
                    }
                  }}
                  InputProps={{
                    startAdornment:
                      (
                        <InputAdornment position="start">
                          <LockRounded
                            sx={{
                              color:
                                '#82918b',
                            }}
                          />
                        </InputAdornment>
                      ),

                    endAdornment:
                      (
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
                              busy
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
                    busy ||
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
                    busy
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
                }}
              >
                Secure session protection
              </Typography>
            </Stack>
          </Paper>

          {/* ==================================================
              RETURN TO LOGIN
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
