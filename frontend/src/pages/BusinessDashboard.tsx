
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import {
  AccountBalance,
  ArrowBack,
  ArrowUpward,
  Business,
  Description,
  ReceiptLong,
  Refresh,
  Security,
  Settings,
  TrendingUp,
  People,
  PhoneAndroid,
  Wifi,
  Bolt,
  Tv,
  Savings,
  PointOfSale,
  Visibility,
  VisibilityOff,
  VerifiedUser,
  CreditCard,
  Notifications,
} from '@mui/icons-material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// BUSINESS DASHBOARD
// GREEN AND WHITE BRANDING
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#087A43';
const DARK_GREEN = '#065F36';
const LIGHT_GREEN = '#E8F5EC';
const PAGE_BG = '#F6FAF7';

// ============================================================
// TYPES
// ============================================================

type BusinessAccount = {
  id: string;
  business_name?: string;
  name?: string;
  registration_number?: string;
  business_type?: string;
  country?: string;
  currency?: string;
  account_number?: string;
  balance?: number | string;
  status?: string;
  account_status?: string;
  verification_status?: string;
  verification_level?: number | string;
  business_level?: number | string;
  account_level?: number | string;
  created_at?: string;
};

type Transaction = {
  id: string;
  type?: string;
  description?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  reference?: string;
  created_at?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

// ============================================================
// HELPERS
// ============================================================

const getToken = () =>
  localStorage.getItem('zenimonies_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('access_token') ||
  '';

const formatMoney = (
  amount: number | string | undefined,
  currency = 'NGN'
) => {
  const value = Number(amount || 0);

  const safeCurrency =
    currency === 'ZAR' ? 'ZAR' : 'NGN';

  return new Intl.NumberFormat(
    safeCurrency === 'ZAR' ? 'en-ZA' : 'en-NG',
    {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(Number.isFinite(value) ? value : 0);
};

const formatDate = (date?: string) => {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleString();
};

const getStatusColor = (
  status?: string
): 'success' | 'warning' | 'error' | 'default' => {
  const value = (status || '').toLowerCase();

  if (
    value === 'active' ||
    value === 'approved' ||
    value === 'verified' ||
    value === 'successful' ||
    value === 'completed'
  ) {
    return 'success';
  }

  if (
    value === 'pending' ||
    value === 'processing' ||
    value === 'under_review'
  ) {
    return 'warning';
  }

  if (
    value === 'rejected' ||
    value === 'failed' ||
    value === 'suspended' ||
    value === 'blocked' ||
    value === 'closed'
  ) {
    return 'error';
  }

  return 'default';
};

const getVerificationLevel = (
  business: BusinessAccount
): number | null => {
  const raw =
    business.verification_level ??
    business.business_level ??
    business.account_level;

  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  const level = Number(raw);

  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level > 5
  ) {
    return null;
  }

  return level;
};

// ============================================================
// COMPONENT
// ============================================================

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [business, setBusiness] =
    useState<BusinessAccount | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [transactionError, setTransactionError] =
    useState('');

  const [showBalance, setShowBalance] =
    useState(true);

  const [notificationCount, setNotificationCount] =
    useState(0);

  // ==========================================================
  // LOAD BUSINESS AND BUSINESS TRANSACTIONS
  // ==========================================================

  const loadBusiness = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');
      setTransactionError('');

      try {
        const token = getToken();

        if (!token) {
          navigate('/login');
          return;
        }

        if (!id) {
          setError('Business account ID is missing.');
          return;
        }

        // ----------------------------------------------------
        // BUSINESS DETAILS
        // ----------------------------------------------------

        const response = await fetch(
          `${API_BASE}/businesses/${encodeURIComponent(id)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              'Unable to load business account.'
          );
        }

        const businessData =
          result.business ||
          result.data?.business ||
          result.data ||
          result;

        if (!businessData?.id) {
          throw new Error(
            'The business account could not be found.'
          );
        }

        setBusiness(businessData);

        // ----------------------------------------------------
        // BUSINESS TRANSACTIONS
        // ----------------------------------------------------

        try {
          const transactionResponse = await fetch(
            `${API_BASE}/businesses/${encodeURIComponent(
              id
            )}/transactions?page=1&limit=20`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const transactionResult =
            await transactionResponse.json();

          if (!transactionResponse.ok) {
            throw new Error(
              transactionResult.message ||
                'Unable to load business transactions.'
            );
          }

          const transactionData =
            transactionResult.transactions ||
            transactionResult.data?.transactions ||
            [];

          setTransactions(
            Array.isArray(transactionData)
              ? transactionData
              : []
          );

          setPagination(
            transactionResult.pagination || null
          );
        } catch (transactionErr: any) {
          setTransactions([]);
          setPagination(null);

          setTransactionError(
            transactionErr.message ||
              'Unable to load business transactions.'
          );
        }

        // ----------------------------------------------------
        // UNREAD NOTIFICATIONS
        // ----------------------------------------------------

        try {
          const notificationResponse = await fetch(
            `${API_BASE}/notifications/unread-count`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (notificationResponse.ok) {
            const notificationResult =
              await notificationResponse.json();

            const count = Number(
              notificationResult.count ??
              notificationResult.unreadCount ??
              notificationResult.data?.count ??
              0
            );

            setNotificationCount(
              Number.isFinite(count) && count > 0
                ? count
                : 0
            );
          }
        } catch {
          // Notifications are optional.
          // Their failure must not block the dashboard.
        }
      } catch (err: any) {
        setError(
          err.message ||
            'Something went wrong while loading your business.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, navigate]
  );

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  // ==========================================================
  // BUSINESS DETAILS
  // ==========================================================

  const businessName =
    business?.business_name ||
    business?.name ||
    'Business Account';

  const currency = business?.currency || 'NGN';

  const status = (
    business?.status ||
    business?.account_status ||
    'pending'
  ).toLowerCase();

  const verificationStatus = (
    business?.verification_status ||
    'pending'
  ).toLowerCase();

  const isSuspended =
    status === 'suspended' ||
    status === 'closed' ||
    verificationStatus === 'rejected';

  const verificationLevel = business
    ? getVerificationLevel(business)
    : null;

  const accountBalance = useMemo(
    () => formatMoney(business?.balance, currency),
    [business?.balance, currency]
  );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: PAGE_BG,
        }}
      >
        <CircularProgress sx={{ color: GREEN }} />

        <Typography color="text.secondary">
          Loading your business dashboard...
        </Typography>
      </Box>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !business) {
    return (
      <Box
        sx={{
          p: 3,
          maxWidth: 700,
          mx: 'auto',
          bgcolor: PAGE_BG,
          minHeight: '70vh',
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/business')}
          sx={{
            mb: 3,
            color: GREEN,
            fontWeight: 700,
          }}
        >
          Back to Business Accounts
        </Button>

        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => loadBusiness()}
            >
              Retry
            </Button>
          }
        >
          {error || 'Business account not found.'}
        </Alert>
      </Box>
    );
  }

  // ==========================================================
  // BUSINESS ACTIONS
  // ==========================================================

  const businessServices = [
    {
      title: 'Transfer',
      description: 'Business payments',
      icon: <ArrowUpward />,
      path: '/business/transfer',
    },
    {
      title: 'Transactions',
      description: 'Business transaction history',
      icon: <ReceiptLong />,
      path: '/business/transactions',
    },
    {
      title: 'Statements',
      description: 'Business account statements',
      icon: <Description />,
      path: '/business/statements',
    },
    {
      title: 'Airtime',
      description: 'Buy business airtime',
      icon: <PhoneAndroid />,
      path: '/business/airtime',
    },
    {
      title: 'Data',
      description: 'Purchase data bundles',
      icon: <Wifi />,
      path: '/business/data',
    },
    {
      title: 'Electricity',
      description: 'Pay electricity bills',
      icon: <Bolt />,
      path: '/business/electricity',
    },
    {
      title: 'TV Payments',
      description: 'Pay TV subscriptions',
      icon: <Tv />,
      path: '/business/tv',
    },
    {
      title: 'Savings',
      description: 'Business savings',
      icon: <Savings />,
      path: '/business/savings',
    },
    {
      title: 'Cards',
      description: 'Business cards',
      icon: <CreditCard />,
      path: '/business/cards',
    },
    {
      title: 'Staff & Access',
      description: 'Business user permissions',
      icon: <People />,
      path: '/business/staff',
    },
    {
      title: 'Business Settings',
      description: 'Manage business information',
      icon: <Settings />,
      path: '/business/settings',
    },
    {
      title: 'Security',
      description: 'Business account security',
      icon: <Security />,
      path: '/business/security',
    },
  ];

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: PAGE_BG,
        pb: 5,
      }}
    >
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <Box
        sx={{
          bgcolor: GREEN,
          color: '#fff',
          px: { xs: 2, md: 5 },
          py: 3,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Business sx={{ fontSize: 32 }} />

                <Typography
                  variant="h5"
                  fontWeight={800}
                >
                  Zenimonies
                </Typography>
              </Stack>

              <Typography
                sx={{
                  mt: 1,
                  color: '#D9F3E4',
                }}
              >
                Business Banking
              </Typography>
            </Box>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <IconButton
                aria-label="Notifications"
                onClick={() => navigate('/notifications')}
                sx={{ color: '#fff' }}
              >
                <Notifications />

                {notificationCount > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      minWidth: 17,
                      height: 17,
                      borderRadius: '50%',
                      bgcolor: '#F44336',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.3,
                    }}
                  >
                    {notificationCount > 99
                      ? '99+'
                      : notificationCount}
                  </Box>
                )}
              </IconButton>

              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/business')}
                sx={{
                  color: '#fff',
                  borderColor: '#B8E2C9',
                  '&:hover': {
                    borderColor: '#fff',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Back
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          mt: 3,
        }}
      >
        {/* ================================================== */}
        {/* BUSINESS INFORMATION */}
        {/* ================================================== */}

        <Card
          sx={{
            borderRadius: 4,
            mb: 3,
            boxShadow: '0 5px 25px rgba(0,0,0,0.05)',
            border: '1px solid #E1EEE5',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              justifyContent="space-between"
              alignItems={{
                xs: 'flex-start',
                sm: 'center',
              }}
              spacing={2}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Business account
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    mt: 1,
                    color: DARK_GREEN,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {businessName}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Account number:{' '}
                  {business.account_number || 'Not assigned'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Business type:{' '}
                  {business.business_type || 'Not provided'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Registered: {formatDate(business.created_at)}
                </Typography>
              </Box>

              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1}
              >
                <Chip
                  label={status.replace(/_/g, ' ').toUpperCase()}
                  color={getStatusColor(status)}
                  sx={{ fontWeight: 700 }}
                />

                <Chip
                  icon={<VerifiedUser />}
                  label={
                    verificationStatus
                      .replace(/_/g, ' ')
                      .toUpperCase()
                  }
                  color={getStatusColor(verificationStatus)}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* ACCOUNT STATUS NOTICE */}
        {/* ================================================== */}

        {isSuspended ? (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 3 }}
          >
            Your business account currently has a restricted
            status. You can view your dashboard and account
            information, but certain financial services may
            be unavailable. Please contact Zenimonies support
            for assistance.
          </Alert>
        ) : (
          verificationStatus !== 'verified' && (
            <Alert
              severity="info"
              sx={{ mb: 3, borderRadius: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => navigate('/kyc')}
                >
                  Verify
                </Button>
              }
            >
              Your business dashboard is available while
              verification is in progress. Complete the
              required verification steps to access financial
              services according to your account limits and
              applicable security checks.
            </Alert>
          )
        )}

        {/* ================================================== */}
        {/* BALANCE CARD */}
        {/* ================================================== */}

        <Card
          sx={{
            borderRadius: 4,
            color: '#fff',
            background:
              'linear-gradient(135deg, #087A43 0%, #065F36 100%)',
            boxShadow:
              '0 8px 30px rgba(8,122,67,0.18)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#D9F3E4' }}>
                  Business account balance
                </Typography>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={800}
                    sx={{
                      fontSize: {
                        xs: '1.8rem',
                        sm: '2.3rem',
                        md: '2.7rem',
                      },
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {showBalance
                      ? accountBalance
                      : '••••••••'}
                  </Typography>

                  <IconButton
                    aria-label={
                      showBalance
                        ? 'Hide balance'
                        : 'Show balance'
                    }
                    onClick={() =>
                      setShowBalance((previous) => !previous)
                    }
                    sx={{ color: '#fff' }}
                  >
                    {showBalance
                      ? <VisibilityOff />
                      : <Visibility />}
                  </IconButton>
                </Stack>

                <Typography
                  sx={{
                    mt: 1,
                    color: '#D9F3E4',
                  }}
                >
                  {currency} Business Account
                </Typography>
              </Box>

              <AccountBalance
                sx={{
                  fontSize: {
                    xs: 40,
                    md: 55,
                  },
                  opacity: 0.7,
                  flexShrink: 0,
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* VERIFICATION AND POS */}
        {/* ================================================== */}

        <Grid
          container
          spacing={2}
          sx={{ mt: 1 }}
        >
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                border: '1px solid #E1EEE5',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      bgcolor: LIGHT_GREEN,
                      color: GREEN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VerifiedUser />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800}>
                      Business Verification
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {verificationLevel !== null
                        ? `Level ${verificationLevel} of 5`
                        : 'Verification level not yet confirmed'}
                    </Typography>
                  </Box>
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Complete the applicable verification
                  requirements to access the services and
                  transaction limits available to your
                  business.
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/kyc')}
                  sx={{
                    mt: 2,
                    borderColor: GREEN,
                    color: GREEN,
                    fontWeight: 700,
                  }}
                >
                  View Verification
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                border: '1px solid #E1EEE5',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      bgcolor: LIGHT_GREEN,
                      color: GREEN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PointOfSale />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800}>
                      POS Terminal
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Business payment terminals
                    </Typography>
                  </Box>
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  POS applications and terminal approval
                  are managed separately from access to your
                  business dashboard.
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                  sx={{
                    mt: 2,
                    fontWeight: 700,
                  }}
                >
                  POS services not yet connected
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ================================================== */}
        {/* BUSINESS SERVICES */}
        {/* ================================================== */}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 4, mb: 2 }}
        >
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ color: DARK_GREEN }}
          >
            Business Services
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {businessServices.map((item) => (
            <Grid
              item
              xs={6}
              sm={4}
              md={3}
              lg={2}
              key={item.title}
            >
              <Card
                onClick={() => {
                  navigate(item.path);
                }}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1px solid #E1EEE5',
                  transition: '0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow:
                      '0 8px 24px rgba(8,122,67,0.12)',
                  },
                }}
              >
                <CardContent
                  sx={{
                    textAlign: 'center',
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      bgcolor: LIGHT_GREEN,
                      color: GREEN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Typography
                    fontWeight={800}
                    variant="body2"
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ================================================== */}
        {/* RECENT TRANSACTIONS */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 4,
            borderRadius: 4,
            border: '1px solid #E1EEE5',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{ color: DARK_GREEN }}
                >
                  Recent Transactions
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Business account activity
                </Typography>
              </Box>

              <Button
                startIcon={
                  refreshing ? (
                    <CircularProgress
                      size={16}
                      sx={{ color: GREEN }}
                    />
                  ) : (
                    <Refresh />
                  )
                }
                onClick={() => loadBusiness(false)}
                disabled={refreshing}
                sx={{
                  color: GREEN,
                  fontWeight: 700,
                }}
              >
                Refresh
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {transactionError && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => loadBusiness(false)}
                  >
                    Retry
                  </Button>
                }
              >
                {transactionError}
              </Alert>
            )}

            {transactions.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 5,
                }}
              >
                <TrendingUp
                  sx={{
                    fontSize: 45,
                    color: GREEN,
                    mb: 1,
                  }}
                />

                <Typography fontWeight={700}>
                  No business transactions yet
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Transactions posted to this business
                  account will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {transactions.slice(0, 10).map((tx) => {
                  const amount = Number(tx.amount || 0);

                  const isCredit =
                    (tx.type || '').toLowerCase().includes(
                      'received'
                    ) ||
                    (tx.type || '').toLowerCase().includes(
                      'credit'
                    ) ||
                    (tx.type || '').toLowerCase().includes(
                      'deposit'
                    ) ||
                    (tx.type || '').toLowerCase().includes(
                      'refund'
                    );

                  return (
                    <Box key={tx.id}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            fontWeight={700}
                            noWrap
                          >
                            {tx.description ||
                              tx.type ||
                              'Business transaction'}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatDate(tx.created_at)}
                          </Typography>

                          {tx.reference && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              Ref: {tx.reference}
                            </Typography>
                          )}

                          {tx.status && (
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={tx.status.replace(
                                  /_/g,
                                  ' '
                                )}
                                color={getStatusColor(tx.status)}
                              />
                            </Box>
                          )}
                        </Box>

                        <Typography
                          fontWeight={800}
                          sx={{
                            whiteSpace: 'nowrap',
                            color: isCredit
                              ? GREEN
                              : '#263238',
                          }}
                        >
                          {isCredit ? '+' : ''}
                          {formatMoney(
                            amount,
                            tx.currency || currency
                          )}
                        </Typography>
                      </Stack>

                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  );
                })}
              </Stack>
            )}

            {pagination && pagination.total > 20 && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                textAlign="center"
                sx={{ mt: 2 }}
              >
                Showing the latest 20 of {pagination.total}{' '}
                business transactions.
              </Typography>
            )}

            <Button
              fullWidth
              variant="outlined"
              startIcon={<ReceiptLong />}
              onClick={() =>
                navigate('/business/transactions')
              }
              sx={{
                mt: 2,
                borderColor: GREEN,
                color: GREEN,
                fontWeight: 700,
              }}
            >
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* ACCOUNT MANAGEMENT */}
        {/* ================================================== */}

        <Grid
          container
          spacing={2}
          sx={{ mt: 1 }}
        >
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Settings />}
              onClick={() =>
                navigate('/business/settings')
              }
              sx={{
                py: 1.5,
                borderColor: GREEN,
                color: GREEN,
                fontWeight: 700,
              }}
            >
              Business Settings
            </Button>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Security />}
              onClick={() =>
                navigate('/business/security')
              }
              sx={{
                py: 1.5,
                borderColor: GREEN,
                color: GREEN,
                fontWeight: 700,
              }}
            >
              Security & Access
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default BusinessDashboard;
