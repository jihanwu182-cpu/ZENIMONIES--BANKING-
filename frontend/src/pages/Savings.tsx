
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import {
  ArrowBack,
  Lock,
  Savings as SavingsIcon,
  AccessTime,
  CalendarMonth,
  Security,
  AccountBalanceWallet,
  CheckCircle,
  EventAvailable,
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

const formatDate = (date?: string) => {
  if (!date) return 'Not available';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const isMatured = (plan: SavingsPlan) => {
  if (!plan.maturity_date) return false;

  const date = new Date(plan.maturity_date);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() <= Date.now()
  );
};

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

  if (!responseText) return {};

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
};

const Savings: React.FC = () => {
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [withdrawDialogOpen, setWithdrawDialogOpen] =
    useState(false);

  const [selectedPlan, setSelectedPlan] =
    useState<SavingsPlan | null>(null);

  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [withdrawMessageType, setWithdrawMessageType] =
    useState<'locked' | 'matured' | 'completed'>('locked');

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // CREATE SAVINGS PLAN
  // ============================================================

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
        throw new Error(
          getErrorMessage(
            data,
            'Unable to create your Savings plan.',
            response.status
          )
        );
      }

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

  // ============================================================
  // WITHDRAWAL BUTTON
  // Always visible.
  // Early withdrawal is not permitted.
  // ============================================================

  const handleWithdrawClick = (plan: SavingsPlan) => {
    setSelectedPlan(plan);

    const status = String(plan.status).toLowerCase();

    if (status === 'completed') {
      setWithdrawMessageType('completed');

      setWithdrawMessage(
        'Your savings principal has already been released. ' +
        'You can access the available funds from your wallet ' +
        'and use the available bank withdrawal service.'
      );

    } else if (isMatured(plan)) {
      setWithdrawMessageType('matured');

      setWithdrawMessage(
        'Your savings have reached the maturity date. ' +
        'We will refresh your savings status. Once the ' +
        'maturity release has been processed, your principal ' +
        'will be available in your wallet.'
      );

    } else {
      setWithdrawMessageType('locked');

      setWithdrawMessage(
        `You can't withdraw now till the due date. ` +
        `Your savings will be available on ` +
        `${formatDate(plan.maturity_date)}.`
      );
    }

    setWithdrawDialogOpen(true);
  };

  // ============================================================
  // REFRESH MATURED SAVINGS
  // The existing authenticated GET endpoint processes
  // matured savings on the backend.
  // ============================================================

  const handleMaturityRefresh = async () => {
    setRefreshing(true);
    setError('');

    try {
      const refreshed = await fetchSavings();

      if (refreshed) {
        setSuccess(
          'Savings status refreshed. Please check your wallet ' +
          'for any maturity release that has been processed.'
        );

        setWithdrawDialogOpen(false);
      }

    } finally {
      setRefreshing(false);
    }
  };

  const activePlans = plans.filter(
    (plan) =>
      String(plan.status).toLowerCase() === 'active'
  );

  const completedPlans = plans.filter(
    (plan) =>
      String(plan.status).toLowerCase() === 'completed'
  );

  const maturedPlans = plans.filter(
    (plan) =>
      isMatured(plan) &&
      String(plan.status).toLowerCase() === 'active'
  );

  const totalLocked = activePlans.reduce(
    (total, plan) => total + Number(plan.amount || 0),
    0
  );

  const totalCompleted = completedPlans.reduce(
    (total, plan) => total + Number(plan.amount || 0),
    0
  );

  // ============================================================
  // PAGE DESIGN
  // ============================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f4f7f5',
        pb: 6,
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          background:
            'linear-gradient(135deg, #064e3b 0%, #087f5b 60%, #10a36f 100%)',
          color: '#fff',
          pt: 3,
          pb: 5,
          borderRadius: {
            xs: '0 0 28px 28px',
            sm: '0 0 36px 36px',
          },
        }}
      >
        <Container maxWidth="md">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{
              color: '#fff',
              mb: 3,
              textTransform: 'none',
              fontWeight: 600,
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
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SavingsIcon sx={{ fontSize: 36 }} />
            </Box>

            <Box>
              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  fontSize: {
                    xs: 30,
                    sm: 36,
                  },
                }}
              >
                Savings
              </Typography>

              <Typography
                sx={{
                  opacity: 0.9,
                  mt: 0.5,
                }}
              >
                Save today. Access your money at maturity.
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              mt: 3,
              bgcolor: 'rgba(255,255,255,0.12)',
              borderRadius: 2,
              p: 1.5,
            }}
          >
            <Security />

            <Typography variant="body2">
              Secure, fixed-term savings with no early withdrawal.
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: -2, position: 'relative' }}>

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

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess('')}
          >
            {success}
          </Alert>
        )}

        {/* SUMMARY */}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 8px 28px rgba(0,0,0,0.05)',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      bgcolor: '#e5f5ec',
                      color: '#087443',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                    }}
                  >
                    <Lock />
                  </Box>

                  <Typography color="text.secondary">
                    Total Currently Locked
                  </Typography>
                </Stack>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="#087443"
                  sx={{ mt: 2 }}
                >
                  {formatNaira(totalLocked)}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {activePlans.length} active plan(s)
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 8px 28px rgba(0,0,0,0.05)',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      bgcolor: '#eaf0ff',
                      color: '#3159a5',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                    }}
                  >
                    <CheckCircle />
                  </Box>

                  <Typography color="text.secondary">
                    Completed Savings
                  </Typography>
                </Stack>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  sx={{ mt: 2 }}
                >
                  {formatNaira(totalCompleted)}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {completedPlans.length} completed plan(s)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* CREATE PLAN */}

        <Card
          sx={{
            borderRadius: 3,
            mb: 3,
            boxShadow: '0 8px 28px rgba(0,0,0,0.05)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <SavingsIcon color="success" />

              <Typography variant="h6" fontWeight={900}>
                Create a Savings Plan
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Choose how much to save and select your preferred
              lock period.
            </Typography>

            <TextField
              fullWidth
              label="Amount to Lock (₦)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{
                min: 5000,
                max: 100000000,
                step: 100,
              }}
              helperText="Minimum amount is ₦5,000."
              sx={{ mb: 3 }}
            />

            <Typography
              fontWeight={800}
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
                      cursor: creating ? 'default' : 'pointer',
                      textAlign: 'center',
                      borderRadius: 2.5,
                      border: '2px solid',
                      borderColor:
                        duration === period.days
                          ? '#087443'
                          : '#e0e7e3',
                      bgcolor:
                        duration === period.days
                          ? '#eaf7f0'
                          : '#fff',
                      transition: '0.2s',
                      '&:hover': {
                        borderColor: '#087443',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <AccessTime
                        color="success"
                        sx={{ mb: 0.5 }}
                      />

                      <Typography fontWeight={900}>
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
              Your principal remains locked until maturity.
              No early withdrawal or interest is available.
              Your original principal will be returned to your
              wallet when the savings matures.
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
                Number(amount) < 5000 ||
                Number(amount) > 100000000
              }
              onClick={handleCreateSavings}
              sx={{
                mt: 3,
                py: 1.6,
                borderRadius: 2.5,
                bgcolor: '#087443',
                fontWeight: 900,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#065c35',
                },
              }}
            >
              {creating
                ? 'Creating Plan...'
                : 'Lock My Funds'}
            </Button>
          </CardContent>
        </Card>

        {/* SAVINGS HISTORY */}

        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 8px 28px rgba(0,0,0,0.05)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 1 }}
            >
              <CalendarMonth color="success" />

              <Typography variant="h6" fontWeight={900}>
                My Savings Plans
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Track your locked funds, due dates, and maturity
              status.
            </Typography>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress color="success" />

                <Typography sx={{ mt: 1 }}>
                  Loading your Savings...
                </Typography>
              </Box>
            ) : plans.length === 0 ? (
              <Alert severity="info">
                You have no Savings plans yet. Create your
                first plan above.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {plans.map((plan) => {
                  const status = String(
                    plan.status
                  ).toLowerCase();

                  const matured = isMatured(plan);

                  const completed = status === 'completed';

                  return (
                    <Box
                      key={plan.id}
                      sx={{
                        border: '1px solid #e0e7e3',
                        borderRadius: 3,
                        p: { xs: 2, sm: 2.5 },
                        bgcolor: '#fff',
                        transition: '0.2s',
                        '&:hover': {
                          boxShadow:
                            '0 6px 20px rgba(0,0,0,0.04)',
                        },
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
                            variant="h6"
                            fontWeight={900}
                          >
                            {formatNaira(
                              Number(plan.amount)
                            )}
                          </Typography>

                          <Typography
                            color="text.secondary"
                            variant="body2"
                          >
                            {plan.duration_days}-day savings
                            plan
                          </Typography>
                        </Box>

                        <Chip
                          label={
                            completed
                              ? 'Completed'
                              : matured
                              ? 'Matured'
                              : 'Locked'
                          }
                          color={
                            completed
                              ? 'success'
                              : matured
                              ? 'info'
                              : 'warning'
                          }
                          size="small"
                          icon={
                            completed ? (
                              <CheckCircle />
                            ) : matured ? (
                              <EventAvailable />
                            ) : (
                              <Lock />
                            )
                          }
                        />
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography
                            color="text.secondary"
                            variant="body2"
                          >
                            Start date
                          </Typography>

                          <Typography
                            variant="body2"
                            fontWeight={700}
                            textAlign="right"
                          >
                            {formatDate(plan.start_date)}
                          </Typography>
                        </Stack>

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography
                            color="text.secondary"
                            variant="body2"
                          >
                            Due date
                          </Typography>

                          <Typography
                            variant="body2"
                            fontWeight={700}
                            textAlign="right"
                          >
                            {formatDate(plan.maturity_date)}
                          </Typography>
                        </Stack>
                      </Stack>

                      {!completed && !matured && (
                        <Alert
                          severity="warning"
                          icon={<Lock />}
                          sx={{ mt: 2 }}
                        >
                          Funds are locked until the due date.
                        </Alert>
                      )}

                      {matured && !completed && (
                        <Alert
                          severity="info"
                          sx={{ mt: 2 }}
                        >
                          Your plan has reached maturity.
                          Refresh your savings to check the
                          release status.
                        </Alert>
                      )}

                      {completed && (
                        <Alert
                          severity="success"
                          sx={{ mt: 2 }}
                        >
                          Your savings principal has been
                          released to your wallet.
                        </Alert>
                      )}

                      {/* WITHDRAW BUTTON ALWAYS VISIBLE */}

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AccountBalanceWallet />}
                        onClick={() =>
                          handleWithdrawClick(plan)
                        }
                        sx={{
                          mt: 2,
                          py: 1.3,
                          borderRadius: 2,
                          fontWeight: 900,
                          textTransform: 'none',
                          bgcolor: '#087443',
                          '&:hover': {
                            bgcolor: '#065c35',
                          },
                        }}
                      >
                        Withdraw
                      </Button>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* WITHDRAWAL DIALOG */}

        <Dialog
          open={withdrawDialogOpen}
          onClose={() => {
            if (!refreshing) {
              setWithdrawDialogOpen(false);
            }
          }}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 900,
              textAlign: 'center',
              pt: 3,
            }}
          >
            {withdrawMessageType === 'locked'
              ? 'Withdrawal Unavailable'
              : withdrawMessageType === 'matured'
              ? 'Savings Matured'
              : 'Savings Completed'}
          </DialogTitle>

          <DialogContent>
            <Stack
              alignItems="center"
              spacing={2}
              sx={{ py: 2 }}
            >
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  bgcolor:
                    withdrawMessageType === 'locked'
                      ? '#fff3e0'
                      : '#e5f5ec',
                  color:
                    withdrawMessageType === 'locked'
                      ? '#ed8b00'
                      : '#087443',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {withdrawMessageType === 'locked' ? (
                  <Lock sx={{ fontSize: 36 }} />
                ) : (
                  <AccountBalanceWallet
                    sx={{ fontSize: 36 }}
                  />
                )}
              </Box>

              {selectedPlan && (
                <Typography
                  variant="h5"
                  fontWeight={900}
                  textAlign="center"
                >
                  {formatNaira(
                    Number(selectedPlan.amount)
                  )}
                </Typography>
              )}

              <Typography
                color="text.secondary"
                textAlign="center"
                sx={{ lineHeight: 1.8 }}
              >
                {withdrawMessage}
              </Typography>

              {selectedPlan &&
                withdrawMessageType === 'locked' && (
                  <Box
                    sx={{
                      bgcolor: '#f4f7f5',
                      borderRadius: 2,
                      p: 2,
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Your due date
                    </Typography>

                    <Typography
                      fontWeight={900}
                      color="#087443"
                      sx={{ mt: 0.5 }}
                    >
                      {formatDate(
                        selectedPlan.maturity_date
                      )}
                    </Typography>
                  </Box>
                )}
            </Stack>
          </DialogContent>

          <DialogActions
            sx={{
              px: 2,
              pb: 2,
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {withdrawMessageType === 'matured' && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleMaturityRefresh}
                disabled={refreshing}
                sx={{
                  py: 1.3,
                  borderRadius: 2,
                  bgcolor: '#087443',
                  fontWeight: 900,
                  textTransform: 'none',
                }}
              >
                {refreshing ? (
                  <CircularProgress
                    size={22}
                    color="inherit"
                  />
                ) : (
                  'Refresh Savings Status'
                )}
              </Button>
            )}

            {withdrawMessageType === 'completed' && (
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  setWithdrawDialogOpen(false);
                  navigate('/wallet');
                }}
                sx={{
                  py: 1.3,
                  borderRadius: 2,
                  bgcolor: '#087443',
                  fontWeight: 900,
                  textTransform: 'none',
                }}
              >
                Go to Wallet
              </Button>
            )}

            <Button
              fullWidth
              variant="outlined"
              onClick={() =>
                setWithdrawDialogOpen(false)
              }
              disabled={refreshing}
              sx={{
                py: 1.2,
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                borderColor: '#087443',
                color: '#087443',
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Savings;
