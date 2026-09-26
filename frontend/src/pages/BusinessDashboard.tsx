
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
  ArrowForward,
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
// PROFESSIONAL BUSINESS BANKING DASHBOARD
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#087A43';
const DARK_GREEN = '#065F36';
const LIGHT_GREEN = '#E8F5EC';
const PAGE_BG = '#F5F8F6';
const BORDER = '#E1EEE5';

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
  const safeCurrency =
    currency === 'ZAR' ? 'ZAR' : 'NGN';

  const value = Number(amount || 0);

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
    [
      'active',
      'approved',
      'verified',
      'successful',
      'completed',
    ].includes(value)
  ) {
    return 'success';
  }

  if (
    [
      'pending',
      'processing',
      'under_review',
    ].includes(value)
  ) {
    return 'warning';
  }

  if (
    [
      'rejected',
      'failed',
      'suspended',
      'blocked',
      'closed',
    ].includes(value)
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

  return Number.isInteger(level) && level >= 1 && level <= 5
    ? level
    : null;
};

// ============================================================
// DASHBOARD COMPONENT
// ============================================================

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const businessId = id || '';

  // All business routes retain the current business ID.
  const businessPath = (section: string) =>
    `/business/${encodeURIComponent(businessId)}/${section}`;

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

  const [showBalance, setShowBalance] = useState(true);
  const [notificationCount, setNotificationCount] =
    useState(0);

  // ==========================================================
  // LOAD BUSINESS ACCOUNT
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

        if (!businessId) {
          setError('Business account ID is missing.');
          return;
        }

        const response = await fetch(
          `${API_BASE}/businesses/${encodeURIComponent(businessId)}`,
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

        // BUSINESS-SCOPED TRANSACTIONS
        try {
          const transactionResponse = await fetch(
            `${API_BASE}/businesses/${encodeURIComponent(
              businessId
            )}/transactions?page=1&limit=20`,
            {
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
        } catch (err: any) {
          setTransactions([]);
          setPagination(null);

          setTransactionError(
            err.message ||
            'Unable to load business transactions.'
          );
        }

        // NOTIFICATION COUNT
        // This count is currently returned by the
        // existing user notification endpoint.
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
          // Notification errors do not block dashboard.
        }
      } catch (err: any) {
        setError(
          err.message ||
          'Unable to load your business account.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId, navigate]
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
  // BUSINESS SERVICES
  // ==========================================================

  const businessServices = [
    {
      title: 'Transfer',
      description: 'Payments and bank transfers',
      icon: <ArrowUpward />,
      section: 'transfer',
    },
    {
      title: 'Transactions',
      description: 'Business transaction history',
      icon: <ReceiptLong />,
      section: 'transactions',
    },
    {
      title: 'Statements',
      description: 'Account statements',
      icon: <Description />,
      section: 'statements',
    },
    {
      title: 'Airtime',
      description: 'Business airtime purchases',
      icon: <PhoneAndroid />,
      section: 'airtime',
    },
    {
      title: 'Data',
      description: 'Mobile data bundles',
      icon: <Wifi />,
      section: 'data',
    },
    {
      title: 'Electricity',
      description: 'Electricity payments',
      icon: <Bolt />,
      section: 'electricity',
    },
    {
      title: 'TV Payments',
      description: 'TV subscriptions',
      icon: <Tv />,
      section: 'tv',
    },
    {
      title: 'Savings',
      description: 'Business savings',
      icon: <Savings />,
      section: 'savings',
    },
    {
      title: 'Business Cards',
      description: 'Manage business cards',
      icon: <CreditCard />,
      section: 'cards',
    },
    {
      title: 'Staff & Access',
      description: 'Staff permissions',
      icon: <People />,
      section: 'staff',
    },
    {
      title: 'Business Settings',
      description: 'Business profile and details',
      icon: <Settings />,
      section: 'settings',
    },
    {
      title: 'Security',
      description: 'Security and account access',
      icon: <Security />,
      section: 'security',
    },
  ];

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: PAGE_BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
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
  // ERROR SCREEN
  // ==========================================================

  if (error || !business) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: PAGE_BG,
          p: 3,
          maxWidth: 700,
          mx: 'auto',
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/business')}
          sx={{ mb: 3, color: GREEN, fontWeight: 700 }}
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
  // DASHBOARD
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: PAGE_BG,
        pb: 6,
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          background:
            'linear-gradient(135deg, #065F36 0%, #087A43 55%, #0B9655 100%)',
          color: '#fff',
          px: { xs: 2, md: 5 },
          py: { xs: 3, md: 4 },
          borderRadius: {
            xs: '0 0 24px 24px',
            md: '0 0 32px 32px',
          },
          boxShadow: '0 8px 30px rgba(6,95,54,0.15)',
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
                <Business sx={{ fontSize: 34 }} />

                <Typography
                  variant="h5"
                  fontWeight={900}
                  letterSpacing={-0.5}
                >
                  Zenimonies
                </Typography>
              </Stack>

              <Typography
                sx={{
                  mt: 1,
                  color: '#D9F3E4',
                  fontWeight: 500,
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
                aria-label="Business notifications"
                onClick={() =>
                  navigate(businessPath('notifications'))
                }
                sx={{
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  position: 'relative',
                }}
              >
                <Notifications />

                {notificationCount > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      minWidth: 18,
                      height: 18,
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
                  fontWeight: 700,
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
          mt: { xs: 2, md: 4 },
        }}
      >
        {/* BUSINESS PROFILE */}

        <Card
          sx={{
            borderRadius: 4,
            mb: 3,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 5px 25px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  BUSINESS ACCOUNT
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  sx={{
                    mt: 1,
                    color: DARK_GREEN,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {businessName}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Account number: {business.account_number || 'Not assigned'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Business type: {business.business_type || 'Not provided'}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Registered: {formatDate(business.created_at)}
                </Typography>
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Chip
                  label={status.replace(/_/g, ' ').toUpperCase()}
                  color={getStatusColor(status)}
                  sx={{ fontWeight: 800 }}
                />

                <Chip
                  icon={<VerifiedUser />}
                  label={verificationStatus.replace(/_/g, ' ').toUpperCase()}
                  color={getStatusColor(verificationStatus)}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* ACCOUNT STATUS */}

        {isSuspended ? (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            Your business account is restricted. You can view your
            account information, but financial services may be
            unavailable. Please contact Zenimonies support.
          </Alert>
        ) : verificationStatus !== 'verified' && (
          <Alert
            severity="info"
            sx={{ mb: 3, borderRadius: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  navigate(businessPath('verification'))
                }
              >
                Verify
              </Button>
            }
          >
            Your business dashboard is available while verification
            is in progress. Complete the applicable business
            verification requirements to access services according
            to your account limits and security checks.
          </Alert>
        )}

        {/* BALANCE CARD */}

        <Card
          sx={{
            borderRadius: 5,
            color: '#fff',
            background:
              'linear-gradient(135deg, #065F36 0%, #087A43 55%, #0B9655 100%)',
            boxShadow: '0 12px 35px rgba(8,122,67,0.18)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.10)',
              right: -70,
              top: -100,
            }}
          />

          <CardContent
            sx={{
              p: { xs: 3, md: 4 },
              position: 'relative',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{ color: '#D9F3E4', fontWeight: 600 }}
                >
                  Business account balance
                </Typography>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 1.5 }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={900}
                    sx={{
                      fontSize: {
                        xs: '1.8rem',
                        sm: '2.4rem',
                        md: '2.8rem',
                      },
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {showBalance ? accountBalance : '••••••••'}
                  </Typography>

                  <IconButton
                    aria-label={
                      showBalance ? 'Hide balance' : 'Show balance'
                    }
                    onClick={() =>
                      setShowBalance((previous) => !previous)
                    }
                    sx={{ color: '#fff' }}
                  >
                    {showBalance ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Stack>

                <Typography
                  sx={{
                    mt: 1.5,
                    color: '#D9F3E4',
                    fontWeight: 500,
                  }}
                >
                  {currency} Business Account
                </Typography>

                <Chip
                  label="Business account"
                  size="small"
                  sx={{
                    mt: 2,
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    fontWeight: 700,
                  }}
                />
              </Box>

              <AccountBalance
                sx={{
                  fontSize: { xs: 42, md: 60 },
                  opacity: 0.7,
                  flexShrink: 0,
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* VERIFICATION AND POS */}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
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
                      width: 50,
                      height: 50,
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
                    <Typography fontWeight={900}>
                      Business Verification
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {verificationLevel !== null
                        ? `Level ${verificationLevel} of 5`
                        : 'Level not yet confirmed'}
                    </Typography>
                  </Box>
                </Stack>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, lineHeight: 1.7 }}
                >
                  View your business verification status and
                  applicable requirements.
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  endIcon={<ArrowForward />}
                  onClick={() =>
                    navigate(businessPath('verification'))
                  }
                  sx={{
                    mt: 2,
                    py: 1.2,
                    borderColor: GREEN,
                    color: GREEN,
                    fontWeight: 800,
                    borderRadius: 2.5,
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
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
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
                      width: 50,
                      height: 50,
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
                    <Typography fontWeight={900}>
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
                  sx={{ mt: 2, lineHeight: 1.7 }}
                >
                  POS application and terminal approval are
                  managed separately from business dashboard access.
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                  sx={{
                    mt: 2,
                    py: 1.2,
                    borderRadius: 2.5,
                    fontWeight: 800,
                  }}
                >
                  POS services not yet connected
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* BUSINESS SERVICES */}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 5, mb: 2 }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ color: DARK_GREEN }}
            >
              Business Services
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Manage your business banking activities
            </Typography>
          </Box>
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
                  if (!businessId) {
                    setError('Business account ID is missing.');
                    return;
                  }

                  navigate(businessPath(item.section));
                }}
                sx={{
                  height: '100%',
                  minHeight: 165,
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: `1px solid ${BORDER}`,
                  bgcolor: '#fff',
                  boxShadow: '0 3px 14px rgba(6,95,54,0.04)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: GREEN,
                    boxShadow:
                      '0 12px 28px rgba(8,122,67,0.13)',
                    bgcolor: '#FCFFFD',
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
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
                    fontWeight={900}
                    variant="body2"
                    sx={{ color: DARK_GREEN }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mt: 0.7,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* RECENT TRANSACTIONS */}

        <Card
          sx={{
            mt: 4,
            borderRadius: 4,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
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
                  fontWeight={900}
                  sx={{ color: DARK_GREEN }}
                >
                  Recent Transactions
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Business account activity
                </Typography>
              </Box>

              <Button
                startIcon={
                  refreshing ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Refresh />
                  )
                }
                onClick={() => loadBusiness(false)}
                disabled={refreshing}
                sx={{ color: GREEN, fontWeight: 800 }}
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
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <TrendingUp
                  sx={{
                    fontSize: 45,
                    color: GREEN,
                    mb: 1,
                  }}
                />

                <Typography fontWeight={800}>
                  No business transactions yet
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Transactions posted to this business account
                  will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {transactions.slice(0, 10).map((tx) => {
                  const amount = Number(tx.amount || 0);

                  const type = (tx.type || '').toLowerCase();

                  const isCredit =
                    type.includes('received') ||
                    type.includes('credit') ||
                    type.includes('deposit') ||
                    type.includes('refund');

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
                            fontWeight={800}
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
                                label={tx.status.replace(/_/g, ' ')}
                                color={getStatusColor(tx.status)}
                              />
                            </Box>
                          )}
                        </Box>

                        <Typography
                          fontWeight={900}
                          sx={{
                            whiteSpace: 'nowrap',
                            color: isCredit ? GREEN : '#263238',
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
              endIcon={<ArrowForward />}
              onClick={() =>
                navigate(businessPath('transactions'))
              }
              sx={{
                mt: 2,
                py: 1.3,
                borderColor: GREEN,
                color: GREEN,
                fontWeight: 800,
                borderRadius: 2.5,
              }}
            >
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* ACCOUNT MANAGEMENT */}

        <Typography
          variant="h6"
          fontWeight={900}
          sx={{ color: DARK_GREEN, mt: 4, mb: 2 }}
        >
          Account Management
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Settings />}
              endIcon={<ArrowForward />}
              onClick={() =>
                navigate(businessPath('settings'))
              }
              sx={{
                py: 1.7,
                borderRadius: 3,
                borderColor: GREEN,
                color: GREEN,
                fontWeight: 800,
                bgcolor: '#fff',
                '&:hover': {
                  bgcolor: LIGHT_GREEN,
                  borderColor: DARK_GREEN,
                },
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
              endIcon={<ArrowForward />}
              onClick={() =>
                navigate(businessPath('security'))
              }
              sx={{
                py: 1.7,
                borderRadius: 3,
                borderColor: GREEN,
                color: GREEN,
                fontWeight: 800,
                bgcolor: '#fff',
                '&:hover': {
                  bgcolor: LIGHT_GREEN,
                  borderColor: DARK_GREEN,
                },
              }}
            >
              Security & Access
            </Button>
          </Grid>
        </Grid>

        {/* FOOTER */}

        <Box
          sx={{
            mt: 5,
            textAlign: 'center',
            pb: 2,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Zenimonies Business Banking
          </Typography>

          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Your business banking, in one place.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default BusinessDashboard;
