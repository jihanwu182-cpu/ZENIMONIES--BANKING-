

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  Lock,
  Savings as SavingsIcon,
  AccessTime,
  CalendarMonth,
  Security,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = (
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api'
).replace(/\/$/, '');

const LOCK_PERIODS = [
  { days: 30, label: '30 Days', description: '1 Month' },
  { days: 60, label: '60 Days', description: '2 Months' },
  { days: 90, label: '90 Days', description: '3 Months' },
  { days: 180, label: '180 Days', description: '6 Months' },
  { days: 365, label: '365 Days', description: '1 Year' },
];

interface SavingsPlan {
  id: string;
  amount: number;
  currency?: string;
  duration_days: number;
  start_date: string;
  maturity_date: string;
  status: string;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);

const getErrorMessage = (
  data: any,
  fallback: string,
  status?: number
): string => {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    const message =
      data.message ||
      data.error ||
      data.details ||
      data.msg;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : item.message || JSON.stringify(item)
        )
        .join(', ');
    }
  }

  if (status) {
    return `${fallback} (HTTP ${status})`;
  }

  return fallback;
};

const readResponse = async (response: Response) => {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      message: responseText,
    };
  }
};

const Savings: React.FC = () => {
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('zenimonies_token');

  const fetchSavings = async (): Promise<boolean> => {
    const currentToken = localStorage.getItem(
      'zenimonies_token'
    );

    if (!currentToken) {
      setError('Please sign in to view your Savings.');
      setLoading(false);
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/savings`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Accept: 'application/json',
        },
      });

      const data = await readResponse(response);

      if (!response.ok) {
        const message = getErrorMessage(
          data,
          'Unable to load your Savings.',
          response.status
        );

        console.error('Savings loading failed:', {
          status: response.status,
          response: data,
        });

        setError(message);
        return false;
      }

      const savings = Array.isArray(data)
        ? data
        : Array.isArray(data.savings)
        ? data.savings
        : Array.isArray(data.plans)
        ? data.plans
        : [];

      setPlans(savings);
      return true;
    } catch (err: any) {
      console.error('Savings loading network error:', err);

      setError(
        err.message ||
          'Unable to connect to the Savings service.'
      );

      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();

    // Load plans when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSavings = async () => {
    setError('');
    setSuccess('');

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 5000
    ) {
      setError('The minimum amount to lock is ₦5,000.');
      return;
    }

    if (
      !Number.isInteger(duration) ||
      !LOCK_PERIODS.some(
        (period) => period.days === duration
      )
    ) {
      setError('Please select a valid lock period.');
      return;
    }

    const currentToken = localStorage.getItem(
      'zenimonies_token'
    );

    if (!currentToken) {
      setError('Please sign in again.');
      navigate('/login');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/savings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          amount: numericAmount,
          duration_days: duration,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        console.error('Savings creation failed:', {
          status: response.status,
          response: data,
        });

        throw new Error(
          getErrorMessage(
            data,
            'Unable to create your Savings plan.',
            response.status
          )
        );
      }

      console.log('Savings creation response:', data);

      setSuccess(
        'Your Savings plan has been created successfully.'
      );

      setAmount('');
      setDuration(null);

      await fetchSavings();
    } catch (err: any) {
      console.error('Savings creation error:', err);

      setError(
        err.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setCreating(false);
    }
  };

  const totalLocked = plans
    .filter(
      (plan) =>
        String(plan.status).toLowerCase() === 'active'
    )
    .reduce(
      (total, plan) => total + Number(plan.amount || 0),
      0
    );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f5f8f6',
        pb: 5,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background:
            'linear-gradient(135deg, #075e42 0%, #119568 100%)',
          color: '#fff',
          py: 3,
        }}
      >
        <Container maxWidth="md">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{
              color: '#fff',
              mb: 2,
              textTransform: 'none',
            }}
          >
            Back to Dashboard
          </Button>

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
          >
            <Box
              sx={{
                width: 55,
                height: 55,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SavingsIcon sx={{ fontSize: 32 }} />
            </Box>

            <Box>
              <Typography variant="h4" fontWeight={800}>
                Savings
              </Typography>

              <Typography sx={{ opacity: 0.9 }}>
                Lock your money and plan for the future.
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: 3 }}>
        {/* Error message */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Success message */}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess('')}
          >
            {success}
          </Alert>
        )}

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow:
                  '0 4px 18px rgba(0,0,0,0.04)',
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Lock color="success" />

                  <Typography color="text.secondary">
                    Total Currently Locked
                  </Typography>
                </Stack>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  color="#087443"
                  sx={{ mt: 1 }}
                >
                  {formatNaira(totalLocked)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow:
                  '0 4px 18px rgba(0,0,0,0.04)',
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Security color="success" />

                  <Typography color="text.secondary">
                    Minimum Lock Amount
                  </Typography>
                </Stack>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ mt: 1 }}
                >
                  ₦5,000
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Create Savings Plan */}
        <Card
          sx={{
            borderRadius: 3,
            mb: 3,
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent
            sx={{ p: { xs: 2, sm: 3 } }}
          >
            <Typography variant="h6" fontWeight={800}>
              Create a Savings Plan
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 0.5, mb: 3 }}
            >
              Choose an amount and how long you want to
              lock your funds.
            </Typography>

            <TextField
              fullWidth
              label="Amount to Lock (₦)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{
                min: 5000,
                step: 100,
              }}
              helperText="Minimum amount is ₦5,000."
              sx={{ mb: 3 }}
            />

            <Typography
              fontWeight={700}
              sx={{ mb: 1.5 }}
            >
              Select Lock Period
            </Typography>

            <Grid container spacing={1.5}>
              {LOCK_PERIODS.map((period) => (
                <Grid
                  item
                  xs={6}
                  sm={4}
                  key={period.days}
                >
                  <Card
                    onClick={() => {
                      if (!creating) {
                        setDuration(period.days);
                      }
                    }}
                    sx={{
                      cursor: creating
                        ? 'default'
                        : 'pointer',
                      textAlign: 'center',
                      borderRadius: 2.5,
                      border: '2px solid',
                      borderColor:
                        duration === period.days
                          ? '#07804d'
                          : '#e0e7e3',
                      bgcolor:
                        duration === period.days
                          ? '#eaf7f0'
                          : '#fff',
                      transition: '0.2s',
                      '&:hover': {
                        borderColor: '#07804d',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <AccessTime
                        color="success"
                        sx={{ mb: 0.5 }}
                      />

                      <Typography fontWeight={800}>
                        {period.label}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {period.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Funds remain locked until the selected
              maturity date. Early withdrawals are not
              permitted. No interest is paid at launch.
              Your original principal becomes available
              at maturity.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={
                creating ? (
                  <CircularProgress
                    size={20}
                    color="inherit"
                  />
                ) : (
                  <Lock />
                )
              }
              disabled={
                creating ||
                !amount ||
                !duration ||
                Number(amount) < 5000
              }
              onClick={handleCreateSavings}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2.5,
                bgcolor: '#087443',
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#065c35',
                },
                '&.Mui-disabled': {
                  bgcolor: '#a5c7b5',
                  color: '#fff',
                },
              }}
            >
              {creating
                ? 'Creating Plan...'
                : 'Lock My Funds'}
            </Button>
          </CardContent>
        </Card>

        {/* Savings Plans History */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent
            sx={{ p: { xs: 2, sm: 3 } }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <CalendarMonth color="success" />

              <Typography
                variant="h6"
                fontWeight={800}
              >
                My Savings Plans
              </Typography>
            </Stack>

            {loading ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                }}
              >
                <CircularProgress color="success" />

                <Typography sx={{ mt: 1 }}>
                  Loading your Savings...
                </Typography>
              </Box>
            ) : plans.length === 0 ? (
              <Alert severity="info">
                You have no Savings plans yet. Create
                your first plan above.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {plans.map((plan) => (
                  <Box
                    key={plan.id}
                    sx={{
                      border: '1px solid #e0e7e3',
                      borderRadius: 2.5,
                      p: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box>
                        <Typography
                          fontWeight={800}
                          variant="h6"
                        >
                          {formatNaira(
                            Number(plan.amount)
                          )}
                        </Typography>

                        <Typography
                          color="text.secondary"
                          variant="body2"
                        >
                          {plan.duration_days} days
                        </Typography>
                      </Box>

                      <Chip
                        label={plan.status}
                        color={
                          String(plan.status).toLowerCase() ===
                          'active'
                            ? 'success'
                            : 'default'
                        }
                        size="small"
                      />
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Typography variant="body2">
                      Started:{' '}
                      {plan.start_date
                        ? new Date(
                            plan.start_date
                          ).toLocaleDateString()
                        : '—'}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5 }}
                    >
                      Maturity:{' '}
                      {plan.maturity_date
                        ? new Date(
                            plan.maturity_date
                          ).toLocaleDateString()
                        : '—'}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      No early withdrawal • No interest
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Savings;
