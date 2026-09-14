import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSuccess('');
    setError('');

    if (!token) {
      setError(
        'This password reset link is invalid or incomplete. Please request a new reset link.'
      );
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        {
          token,
          new_password: password,
          confirm_password: confirmPassword,
        }
      );

      setSuccess(
        'Your password has been reset successfully. You can now log in with your new password.'
      );

      setPassword('');
      setConfirmPassword('');

      /*
       * Give the user a short moment to see the success message,
       * then return them to Login.
       */
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      const axiosError = err as AxiosError<{
        message?: string;
      }>;

      console.error(
        'Password reset failed:',
        axiosError.response?.data || axiosError.message
      );

      setError(
        axiosError.response?.data?.message ||
          'This password reset link is invalid, expired, or has already been used. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f7f9f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #e2e8e5',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 3,
                sm: 5,
              },
            }}
          >
            <Stack spacing={3}>
              {/* Header */}
              <Stack spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '18px',
                    backgroundColor: '#123c2f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LockResetIcon
                    sx={{
                      color: '#ffffff',
                      fontSize: 32,
                    }}
                  />
                </Box>

                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: '#123c2f',
                    textAlign: 'center',
                  }}
                >
                  Reset Password
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: '#66736e',
                    textAlign: 'center',
                    maxWidth: 420,
                    lineHeight: 1.6,
                  }}
                >
                  Create a new secure password for your Zenimonies account.
                </Typography>
              </Stack>

              {/* Success */}
              {success && (
                <Alert
                  severity="success"
                  icon={<CheckCircleIcon />}
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {success}
                </Alert>
              )}

              {/* Error */}
              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError('')}
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* Form */}
              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
              >
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                    autoComplete="new-password"
                    disabled={loading || !!success}
                    inputProps={{
                      minLength: 8,
                    }}
                    helperText="Password must be at least 8 characters."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            onClick={() =>
                              setShowPassword((previous) => !previous)
                            }
                            edge="end"
                            aria-label={
                              showPassword
                                ? 'Hide password'
                                : 'Show password'
                            }
                          >
                            {showPassword ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError('');
                    }}
                    autoComplete="new-password"
                    disabled={loading || !!success}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(
                                (previous) => !previous
                              )
                            }
                            edge="end"
                            aria-label={
                              showConfirmPassword
                                ? 'Hide password'
                                : 'Show password'
                            }
                          >
                            {showConfirmPassword ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading || !!success}
                    sx={{
                      minHeight: 52,
                      borderRadius: 2,
                      backgroundColor: '#123c2f',
                      fontWeight: 700,
                      fontSize: '1rem',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#0d2f25',
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress
                        size={24}
                        sx={{
                          color: '#ffffff',
                        }}
                      />
                    ) : (
                      'Reset Password'
                    )}
                  </Button>

                  <Button
                    type="button"
                    fullWidth
                    variant="text"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/login')}
                    disabled={loading}
                    sx={{
                      minHeight: 48,
                      borderRadius: 2,
                      color: '#123c2f',
                      fontWeight: 700,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: 'rgba(18, 60, 47, 0.06)',
                      },
                    }}
                  >
                    Back to Login
                  </Button>
                </Stack>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: '#7a8581',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Your reset link is temporary and can only be used once.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;
