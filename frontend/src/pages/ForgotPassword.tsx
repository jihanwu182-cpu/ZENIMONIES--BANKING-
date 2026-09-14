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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSuccess('');
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          email: normalizedEmail,
        }
      );

      /*
       * Intentionally use the same message whether or not
       * the email belongs to a Zenimonies account.
       *
       * This prevents account-enumeration attacks.
       */
      setSuccess(
        'If an account exists for this email address, you will receive a password reset link shortly. Please check your inbox and spam folder.'
      );

      setEmail('');
    } catch (err) {
      const axiosError = err as AxiosError<{
        message?: string;
      }>;

      console.error(
        'Forgot password request failed:',
        axiosError.response?.data || axiosError.message
      );

      /*
       * Keep the customer-facing message generic.
       * Do not reveal whether an email exists.
       */
      setError(
        'We could not process your request right now. Please try again shortly.'
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
                  Forgot Password?
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
                  Enter the email address associated with your Zenimonies
                  account and we&apos;ll send you a secure password reset link.
                </Typography>
              </Stack>

              {/* Success */}
              {success && (
                <Alert
                  severity="success"
                  onClose={() => setSuccess('')}
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
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError('');
                      setSuccess('');
                    }}
                    autoComplete="email"
                    placeholder="Enter your email address"
                    disabled={loading}
                    inputProps={{
                      maxLength: 255,
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
                    disabled={loading}
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
                      'Send Reset Link'
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

              {/* Security note */}
              <Typography
                variant="body2"
                sx={{
                  color: '#7a8581',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                For your security, password reset links are temporary and can
                only be used once.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
