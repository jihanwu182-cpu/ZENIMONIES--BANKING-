import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios, { AxiosError } from 'axios';

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

const getToken = (): string | null => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token')
  );
};

const getStoredUser = (): StoredUser | null => {
  try {
    const raw =
      localStorage.getItem('zenimonies_user');

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
};

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
    fullName.trim().split(/\s+/)[0];

  return firstName.toUpperCase();
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const axiosError =
    error as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    fallback
  );
};

const AccountLocked: React.FC = () => {
  const [mode, setMode] =
    useState<UnlockMode>('passkey');

  const [user, setUser] =
    useState<StoredUser | null>(
      getStoredUser()
    );

  const [email, setEmail] =
    useState('');

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [passkeyLoading, setPasskeyLoading] =
    useState(false);

  const [passkeyAttempts, setPasskeyAttempts] =
    useState(0);

  const [passcode, setPasscode] =
    useState('');

  const [passcodeLoading, setPasscodeLoading] =
    useState(false);

  const [passcodeAttempts, setPasscodeAttempts] =
    useState(0);

  const [password, setPassword] =
    useState('');

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [lockedUntil, setLockedUntil] =
    useState<string | null>(null);

  /*
   * ----------------------------------------------------------
   * LOAD REAL ACCOUNT INFORMATION
   * ----------------------------------------------------------
   *
   * We never ask the user to type their email here.
   *
   * First use the authenticated profile endpoint.
   * The localStorage user is only a fallback.
   */
  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      const token = getToken();
      const storedUser = getStoredUser();

      if (storedUser && mounted) {
        setUser(storedUser);

        if (storedUser.email) {
          setEmail(
            String(storedUser.email)
              .trim()
              .toLowerCase()
          );
        }
      }

      if (!token) {
        if (mounted) {
          setLoadingProfile(false);
          setError(
            'Your secure session could not be found. Please sign in again.'
          );
        }

        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
          setUser(profile);

          const profileEmail =
            profile.email ||
            storedUser?.email ||
            '';

          if (profileEmail) {
            setEmail(
              String(profileEmail)
                .trim()
                .toLowerCase()
            );
          }

          try {
            localStorage.setItem(
              'zenimonies_user',
              JSON.stringify(profile)
            );
          } catch {
            // Local storage is only a convenience fallback.
          }
        }
      } catch {
        /*
         * Do not show a technical API error.
         *
         * If the stored authenticated user already contains
         * an email, the Passkey flow can still continue.
         */
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    return getDisplayName(user);
  }, [user]);

  /*
   * ----------------------------------------------------------
   * UNLOCK SESSION
   * ----------------------------------------------------------
   */
  const unlockAccount = useCallback(() => {
    sessionStorage.removeItem(
      'zenimonies_account_locked'
    );

    sessionStorage.removeItem(
      'zenimonies_passkey_fallback'
    );

    window.dispatchEvent(
      new Event('zenimonies:unlock')
    );
  }, []);

  /*
   * ----------------------------------------------------------
   * SAVE AUTHENTICATED PASSKEY SESSION
   * ----------------------------------------------------------
   */
  const saveAuthenticatedSession = useCallback(
    (data: any) => {
      const token =
        data?.token ||
        data?.access_token ||
        data?.accessToken;

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

      if (data?.user) {
        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }
    },
    []
  );

  /*
   * ----------------------------------------------------------
   * PASSKEY FAILURE
   * ----------------------------------------------------------
   */
  const handlePasskeyFailure = useCallback(
    (
      nextAttempts: number,
      fallbackRequired = false,
      message?: string
    ) => {
      setPasskeyAttempts(nextAttempts);

      if (
        fallbackRequired ||
        nextAttempts >= MAX_PASSKEY_ATTEMPTS
      ) {
        sessionStorage.setItem(
          'zenimonies_passkey_fallback',
          'true'
        );

        setMode('passcode');

        setError('');

        setSuccessMessage(
          'Passkey verification could not be completed. Use your 6-digit Account Passcode to unlock.'
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

  /*
   * ----------------------------------------------------------
   * FACE ID / PASSKEY UNLOCK
   * ----------------------------------------------------------
   */
  const handlePasskeyUnlock = async () => {
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError(
        'We could not securely load your account details. Please use your Account Passcode or password.'
      );

      return;
    }

    if (
      passkeyAttempts >=
      MAX_PASSKEY_ATTEMPTS
    ) {
      setMode('passcode');
      return;
    }

    setPasskeyLoading(true);

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
        optionsResponse.data?.options ||
        optionsResponse.data;

      if (!options) {
        throw new Error(
          'Unable to start Passkey authentication.'
        );
      }

      const authenticationResponse =
        await startAuthentication({
          optionsJSON: options,
        });

      const verifyResponse =
        await axios.post(
          `${API_BASE_URL}/api/passkey/login/verify`,
          {
            email,
            response: authenticationResponse,
          },
          {
            timeout: 30000,
          }
        );

      const data =
        verifyResponse.data || {};

      saveAuthenticatedSession(data);

      setSuccessMessage(
        'Identity confirmed. Your secure session has been restored.'
      );

      setPasskeyAttempts(0);

      setTimeout(() => {
        unlockAccount();
      }, 350);
    } catch (error) {
      const axiosError =
        error as AxiosError<ApiErrorResponse>;

      /*
       * User cancelled Face ID / Passkey.
       * This is not treated as a failed security attempt.
       */
      const errorName =
        (error as any)?.name;

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'AbortError'
      ) {
        setError(
          'Authentication was cancelled. You can try again or choose another unlock method.'
        );

        return;
      }

      const responseData =
        axiosError.response?.data;

      const serverAttempts =
        responseData?.failed_attempts;

      const fallbackRequired =
        responseData?.fallback_required === true ||
        responseData?.code ===
          'PASSKEY_FALLBACK_REQUIRED';

      const nextAttempts =
        typeof serverAttempts === 'number'
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
      setPasskeyLoading(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * ACCOUNT PASSCODE
   * ----------------------------------------------------------
   */
  const handlePasscodeUnlock = async () => {
    setError('');
    setSuccessMessage('');

    if (!/^\d{6}$/.test(passcode)) {
      setError(
        'Enter your 6-digit Account Passcode.'
      );

      return;
    }

    if (
      passcodeAttempts >=
      MAX_PASSCODE_ATTEMPTS
    ) {
      setMode('password');
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        'Your secure session has expired. Please use your password to sign in again.'
      );

      setMode('password');

      return;
    }

    setPasscodeLoading(true);

    try {
      const response =
        await axios.post(
          `${API_BASE_URL}/api/passcode/verify`,
          {
            passcode,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 20000,
          }
        );

      const data =
        response.data || {};

      setPasscode('');
      setPasscodeAttempts(0);

      setSuccessMessage(
        'Passcode verified. Your secure session has been restored.'
      );

      setTimeout(() => {
        unlockAccount();
      }, 350);
    } catch (error) {
      const axiosError =
        error as AxiosError<ApiErrorResponse>;

      const responseData =
        axiosError.response?.data;

      const serverAttempts =
        responseData?.failed_attempts;

      const fallbackRequired =
        responseData?.fallback_required === true ||
        responseData?.code ===
          'PASSCODE_LOCKED';

      const nextAttempts =
        typeof serverAttempts === 'number'
          ? serverAttempts
          : passcodeAttempts + 1;

      setPasscodeAttempts(nextAttempts);
      setPasscode('');

      if (
        fallbackRequired ||
        nextAttempts >= MAX_PASSCODE_ATTEMPTS
      ) {
        setError(
          'Your Account Passcode is temporarily locked. Please use your password instead.'
        );

        if (
          responseData?.locked_until
        ) {
          setLockedUntil(
            responseData.locked_until
          );
        }

        setMode('password');

        return;
      }

      setError(
        `Incorrect passcode. Attempt ${nextAttempts} of ${MAX_PASSCODE_ATTEMPTS}.`
      );
    } finally {
      setPasscodeLoading(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * PASSWORD FALLBACK
   * ----------------------------------------------------------
   */
  const handlePasswordUnlock = async () => {
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

    setPasswordLoading(true);

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
        response.data || {};

      saveAuthenticatedSession(data);

      setPassword('');

      setSuccessMessage(
        'Password verified. Your secure session has been restored.'
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
      setPasswordLoading(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * MODE SWITCHING
   * ----------------------------------------------------------
   */
  const handleUsePasscode = () => {
    setError('');
    setSuccessMessage('');
    setMode('passcode');
    setPasscode('');
  };

  const handleUsePassword = () => {
    setError('');
    setSuccessMessage('');
    setMode('password');
    setPassword('');
  };

  const handleUsePasskey = () => {
    setError('');
    setSuccessMessage('');
    setMode('passkey');
  };

  /*
   * ----------------------------------------------------------
   * LOCK MESSAGE
   * ----------------------------------------------------------
   */
  const lockDescription =
    mode === 'passkey'
      ? 'Confirm your identity with your device to securely restore your session.'
      : mode === 'passcode'
      ? 'Enter your private 6-digit Account Passcode to restore your session.'
      : 'Sign in with your password to securely restore your session.';

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */
  if (loadingProfile) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'linear-gradient(145deg, #082f27 0%, #0b4438 48%, #f4f8f6 48%, #f4f8f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 430,
            borderRadius: 5,
            p: 4,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.98)',
            border:
              '1px solid rgba(255,255,255,0.8)',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              borderRadius: 3,
              background:
                'linear-gradient(135deg, #008f4c, #006b39)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                '0 12px 30px rgba(0,105,60,0.22)',
            }}
          >
            <Typography
              sx={{
                color: '#fff',
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              Z
            </Typography>
          </Box>

          <CircularProgress
            size={28}
            thickness={4}
            sx={{
              color: '#0b4b3e',
              mb: 2,
            }}
          />

          <Typography
            sx={{
              fontWeight: 700,
              color: '#123f35',
            }}
          >
            Securing your session
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: '#71807b',
              fontSize: 14,
            }}
          >
            Please wait...
          </Typography>
        </Paper>
      </Box>
    );
  }

  /*
   * ----------------------------------------------------------
   * MAIN SCREEN
   * ----------------------------------------------------------
   */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(145deg, #072d26 0%, #0b4538 44%, #edf4f1 44%, #f7faf8 100%)',
        display: 'flex',
        alignItems: {
          xs: 'flex-start',
          sm: 'center',
        },
        justifyContent: 'center',
        px: {
          xs: 1.5,
          sm: 2,
        },
        py: {
          xs: 2,
          sm: 4,
        },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative security glow */}
      <Box
        sx={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'rgba(0, 177, 92, 0.12)',
          filter: 'blur(10px)',
          top: -120,
          right: -100,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 455,
          borderRadius: {
            xs: 4,
            sm: 5,
          },
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow:
            '0 30px 80px rgba(4, 45, 37, 0.22)',
          border:
            '1px solid rgba(255,255,255,0.75)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* -------------------------------------------------- */}
        {/* PREMIUM SECURITY HEADER */}
        {/* -------------------------------------------------- */}

        <Box
          sx={{
            background:
              'linear-gradient(135deg, #07382f 0%, #0b5947 100%)',
            px: {
              xs: 3,
              sm: 4,
            },
            pt: 3,
            pb: 3.5,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: 170,
              height: 170,
              borderRadius: '50%',
              border:
                '1px solid rgba(255,255,255,0.09)',
              right: -55,
              top: -70,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: '50%',
              border:
                '1px solid rgba(255,255,255,0.08)',
              right: 10,
              top: -35,
            }}
          />

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  background:
                    'linear-gradient(135deg, #00a65a, #008346)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow:
                    '0 8px 20px rgba(0,0,0,0.18)',
                }}
              >
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: 25,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  Z
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: 2,
                    lineHeight: 1.1,
                  }}
                >
                  ZENIMONIES
                </Typography>

                <Typography
                  sx={{
                    fontSize: 10,
                    letterSpacing: 1.3,
                    opacity: 0.65,
                    mt: 0.4,
                  }}
                >
                  SECURE BANKING
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background:
                  'rgba(255,255,255,0.09)',
                border:
                  '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SecurityRounded
                sx={{
                  fontSize: 21,
                  opacity: 0.9,
                }}
              />
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              mt: 3.5,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#56e29a',
                boxShadow:
                  '0 0 0 5px rgba(86,226,154,0.11)',
              }}
            />

            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.4,
                opacity: 0.78,
              }}
            >
              SECURE SESSION LOCK
            </Typography>
          </Stack>
        </Box>

        {/* -------------------------------------------------- */}
        {/* CONTENT */}
        {/* -------------------------------------------------- */}

        <Box
          sx={{
            px: {
              xs: 2.5,
              sm: 4,
            },
            py: {
              xs: 3,
              sm: 4,
            },
          }}
        >
          {/* Security icon */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background:
                  'linear-gradient(145deg, #edf8f3, #dcefe7)',
                border:
                  '1px solid #d1e7de',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  'inset 0 0 0 8px rgba(255,255,255,0.65)',
              }}
            >
              <LockRounded
                sx={{
                  fontSize: 34,
                  color: '#0b4b3e',
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: '#6b7c76',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.6,
                mb: 0.7,
              }}
            >
              WELCOME BACK, {displayName}
            </Typography>

            <Typography
              sx={{
                color: '#123f35',
                fontSize: {
                  xs: 28,
                  sm: 32,
                },
                fontWeight: 850,
                letterSpacing: -0.7,
                lineHeight: 1.15,
              }}
            >
              Verify to continue
            </Typography>

            <Typography
              sx={{
                color: '#75827e',
                fontSize: 14,
                lineHeight: 1.65,
                mt: 1,
                maxWidth: 350,
                mx: 'auto',
              }}
            >
              {lockDescription}
            </Typography>
          </Box>

          {/* Account identity */}
          {email && (
            <Box
              sx={{
                mt: 2.5,
                p: 1.5,
                borderRadius: 2.5,
                background: '#f7faf8',
                border:
                  '1px solid #e3ece8',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}
            >
              <ShieldRounded
                sx={{
                  color: '#0b7a50',
                  fontSize: 21,
                }}
              />

              <Box
                sx={{
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    color: '#71807b',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Protected account
                </Typography>

                <Typography
                  sx={{
                    color: '#173f35',
                    fontSize: 13,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {email}
                </Typography>
              </Box>

              <CheckCircleRounded
                sx={{
                  ml: 'auto',
                  color: '#16a05d',
                  fontSize: 19,
                }}
              />
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                borderRadius: 2.5,
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              {error}
            </Alert>
          )}

          {/* Success */}
          {successMessage && (
            <Alert
              severity="success"
              sx={{
                mt: 2,
                borderRadius: 2.5,
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              {successMessage}
            </Alert>
          )}

          {/* ------------------------------------------------ */}
          {/* PASSKEY MODE */}
          {/* ------------------------------------------------ */}

          {mode === 'passkey' && (
            <Box sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handlePasskeyUnlock}
                disabled={
                  passkeyLoading ||
                  !email
                }
                startIcon={
                  passkeyLoading ? (
                    <CircularProgress
                      size={22}
                      sx={{
                        color: '#fff',
                      }}
                    />
                  ) : (
                    <FingerprintRounded />
                  )
                }
                sx={{
                  minHeight: 62,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: 16,
                  fontWeight: 800,
                  background:
                    'linear-gradient(135deg, #0b4b3e, #06372e)',
                  boxShadow:
                    '0 12px 25px rgba(6,55,46,0.2)',
                  '&:hover': {
                    background:
                      'linear-gradient(135deg, #0d594a, #073d33)',
                  },
                }}
              >
                {passkeyLoading
                  ? 'Verifying securely...'
                  : 'Unlock with Face ID / Passkey'}
              </Button>

              {passkeyAttempts > 0 && (
                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#78847f',
                    fontSize: 12,
                    mt: 1.2,
                  }}
                >
                  {passkeyAttempts} of{' '}
                  {MAX_PASSKEY_ATTEMPTS}{' '}
                  authentication attempts used
                </Typography>
              )}

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  my: 2.5,
                }}
              >
                <Divider sx={{ flex: 1 }} />

                <Typography
                  sx={{
                    color: '#a0aaa6',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  OR
                </Typography>

                <Divider sx={{ flex: 1 }} />
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleUsePasscode}
                startIcon={
                  <PasswordRounded />
                }
                sx={{
                  minHeight: 56,
                  borderRadius: 3,
                  borderColor: '#bdd1c9',
                  color: '#124d40',
                  textTransform: 'none',
                  fontSize: 15,
                  fontWeight: 800,
                  '&:hover': {
                    borderColor: '#0b7a50',
                    background: '#f4faf7',
                  },
                }}
              >
                Use Account Passcode
              </Button>

              <Button
                fullWidth
                onClick={handleUsePassword}
                startIcon={
                  <LockRounded />
                }
                sx={{
                  mt: 1,
                  minHeight: 52,
                  borderRadius: 3,
                  color: '#36584f',
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: 750,
                  '&:hover': {
                    background: '#f5f8f6',
                  },
                }}
              >
                Use Password Instead
              </Button>
            </Box>
          )}

          {/* ------------------------------------------------ */}
          {/* PASSCODE MODE */}
          {/* ------------------------------------------------ */}

          {mode === 'passcode' && (
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  textAlign: 'center',
                  mb: 2.5,
                }}
              >
                <Typography
                  sx={{
                    color: '#123f35',
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  Enter Account Passcode
                </Typography>

                <Typography
                  sx={{
                    color: '#7a8782',
                    fontSize: 13,
                    mt: 0.5,
                  }}
                >
                  Your private 6-digit unlock code
                </Typography>
              </Box>

              <TextField
                fullWidth
                value={passcode}
                onChange={(event) => {
                  const value =
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6);

                  setPasscode(value);
                  setError('');
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                type="password"
                placeholder="••••••"
                disabled={passcodeLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    background: '#f8faf9',
                  },
                  '& input': {
                    textAlign: 'center',
                    letterSpacing: 10,
                    fontSize: 25,
                    fontWeight: 800,
                  },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handlePasscodeUnlock}
                disabled={
                  passcodeLoading ||
                  passcode.length !== 6
                }
                sx={{
                  mt: 2,
                  minHeight: 58,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: 15,
                  fontWeight: 800,
                  background:
                    'linear-gradient(135deg, #0b4b3e, #06372e)',
                }}
              >
                {passcodeLoading ? (
                  <CircularProgress
                    size={23}
                    sx={{
                      color: '#fff',
                    }}
                  />
                ) : (
                  'Unlock Account'
                )}
              </Button>

              <Button
                fullWidth
                onClick={handleUsePassword}
                sx={{
                  mt: 1,
                  minHeight: 48,
                  borderRadius: 3,
                  color: '#36584f',
                  textTransform: 'none',
                  fontWeight: 750,
                }}
              >
                Use Password Instead
              </Button>

              <Button
                fullWidth
                onClick={handleUsePasskey}
                startIcon={
                  <FingerprintRounded />
                }
                sx={{
                  minHeight: 44,
                  borderRadius: 3,
                  color: '#0b7a50',
                  textTransform: 'none',
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                Back to Face ID / Passkey
              </Button>
            </Box>
          )}

          {/* ------------------------------------------------ */}
          {/* PASSWORD MODE */}
          {/* ------------------------------------------------ */}

          {mode === 'password' && (
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  textAlign: 'center',
                  mb: 2.5,
                }}
              >
                <Typography
                  sx={{
                    color: '#123f35',
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  Password Verification
                </Typography>

                <Typography
                  sx={{
                    color: '#7a8782',
                    fontSize: 13,
                    mt: 0.5,
                  }}
                >
                  Use your Zenimonies password to continue
                </Typography>
              </Box>

              <TextField
                fullWidth
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value
                  );
                  setError('');
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={passwordLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRounded
                        sx={{
                          color: '#71807b',
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current
                          )
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
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    background: '#f8faf9',
                  },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handlePasswordUnlock}
                disabled={
                  passwordLoading ||
                  !password
                }
                sx={{
                  mt: 2,
                  minHeight: 58,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: 15,
                  fontWeight: 800,
                  background:
                    'linear-gradient(135deg, #0b4b3e, #06372e)',
                }}
              >
                {passwordLoading ? (
                  <CircularProgress
                    size={23}
                    sx={{
                      color: '#fff',
                    }}
                  />
                ) : (
                  'Unlock with Password'
                )}
              </Button>

              <Button
                fullWidth
                onClick={handleUsePasscode}
                startIcon={
                  <PasswordRounded />
                }
                sx={{
                  mt: 1,
                  minHeight: 48,
                  borderRadius: 3,
                  color: '#36584f',
                  textTransform: 'none',
                  fontWeight: 750,
                }}
              >
                Use Account Passcode
              </Button>

              <Button
                fullWidth
                onClick={handleUsePasskey}
                startIcon={
                  <FingerprintRounded />
                }
                sx={{
                  minHeight: 44,
                  borderRadius: 3,
                  color: '#0b7a50',
                  textTransform: 'none',
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                Back to Face ID / Passkey
              </Button>
            </Box>
          )}

          {/* ------------------------------------------------ */}
          {/* SECURITY FOOTER */}
          {/* ------------------------------------------------ */}

          <Box
            sx={{
              mt: 3.5,
              pt: 2.5,
              borderTop:
                '1px solid #edf1ef',
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="flex-start"
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: 2,
                  background: '#eef7f3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldRounded
                  sx={{
                    fontSize: 19,
                    color: '#0b7a50',
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: '#244d42',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Your security stays on your device
                </Typography>

                <Typography
                  sx={{
                    color: '#7b8783',
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    mt: 0.35,
                  }}
                >
                  Zenimonies never receives or stores
                  your biometric data. Face ID and
                  Passkey authentication are performed
                  by your device's secure authentication
                  system.
                </Typography>
              </Box>
            </Stack>
          </Box>

          {lockedUntil && (
            <Typography
              sx={{
                mt: 2,
                textAlign: 'center',
                color: '#8a9691',
                fontSize: 10.5,
              }}
            >
              Passcode security protection is
              temporarily active.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AccountLocked;
