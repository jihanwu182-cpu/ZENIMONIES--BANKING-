import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import {
  AccountBalance,
  AccountCircle,
  Add,
  ArrowBack,
  ArrowDownward,
  ArrowForward,
  ArrowUpward,
  Business,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Description,
  Home,
  Lock,
  MoreHoriz,
  Notifications,
  PhoneAndroid,
  PointOfSale,
  ReceiptLong,
  Refresh,
  Savings,
  Shield,
  Store,
  TrendingUp,
  Tv,
  Visibility,
  VisibilityOff,
  Wallet,
  Wifi,
  People,
  SportsSoccer,
  Settings,
} from '@mui/icons-material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// COMPACT BUSINESS DASHBOARD
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#008D4F';
const DARK_GREEN = '#064B37';
const LIGHT_GREEN = '#E8F5EE';
const PAGE_BG = '#F3F8F5';
const BORDER = '#DDEBE4';
const MUTED = '#81928A';

// ============================================================
// TYPES
// ============================================================

type BusinessAccount = {
  id: string;

  // Customer details
  customer_name?: string;
  full_name?: string;
  owner_name?: string;

  user?: {
    full_name?: string;
    name?: string;
  };

  owner?: {
    full_name?: string;
    name?: string;
  };

  // Business details
  business_name?: string;
  registered_business_name?: string;
  name?: string;
  business_type?: string;
  registration_number?: string;

  // CAC verification
  cac_status?: string;
  cac_verification_status?: string;
  cac_verified?: boolean;

  // Account information
  country?: string;
  currency?: string;
  account_number?: string;
  balance?: number | string;
  status?: string;
  account_status?: string;

  // Verification information
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

type ServiceItem = {
  title: string;
  section: string;
  icon: React.ReactNode;
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

  if (
    raw === undefined ||
    raw === null ||
    raw === ''
  ) {
    return null;
  }

  const level = Number(raw);

  return Number.isInteger(level) &&
    level >= 1 &&
    level <= 5
    ? level
    : null;
};

// ============================================================
// QUICK ACTIONS
// ============================================================

const quickActions: ServiceItem[] = [
  {
    title: 'Add Money',
    section: 'add-money',
    icon: <Add />,
  },
  {
    title: 'To Bank',
    section: 'transfer',
    icon: <AccountBalance />,
  },
  {
    title: 'ZENIMONIES',
    section: 'internal-transfer',
    icon: <ArrowForward />,
  },
  {
    title: 'Airtime',
    section: 'airtime',
    icon: <PhoneAndroid />,
  },
  {
    title: 'Data',
    section: 'data',
    icon: <Wifi />,
  },
  {
    title: 'Betting',
    section: 'betting',
    icon: <SportsSoccer />,
  },
  {
    title: 'TV',
    section: 'tv',
    icon: <Tv />,
  },
  {
    title: 'Bills',
    section: 'bills',
    icon: <ReceiptLong />,
  },
  {
    title: 'Savings',
    section: 'savings',
    icon: <Savings />,
  },
  {
    title: 'More',
    section: 'more',
    icon: <MoreHoriz />,
  },
];

// ============================================================
// MAIN BUSINESS DASHBOARD
// ============================================================

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const businessId = id || '';

  const businessPath = (section: string) =>
    `/business/${encodeURIComponent(
      businessId
    )}/${section}`;

  const [business, setBusiness] =
    useState<BusinessAccount | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState('');

  const [transactionError, setTransactionError] =
    useState('');

  const [showBalance, setShowBalance] =
    useState(true);

  const [notificationCount, setNotificationCount] =
    useState(0);

  // ==========================================================
  // LOAD BUSINESS ACCOUNT AND TRANSACTIONS
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
          setError(
            'Business account ID is missing.'
          );
          return;
        }

        const response = await fetch(
          `${API_BASE}/businesses/${encodeURIComponent(
            businessId
          )}`,
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

        // Business-specific transactions only.
        try {
          const transactionResponse =
            await fetch(
              `${API_BASE}/businesses/${encodeURIComponent(
                businessId
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
            transactionResult.pagination ||
              transactionResult.data?.pagination ||
              null
          );
        } catch (err: any) {
          setTransactions([]);
          setPagination(null);

          setTransactionError(
            err.message ||
              'Unable to load business transactions.'
          );
        }

        // User-level notification count.
        // Replace with a business-scoped endpoint
        // when your backend provides one.
        try {
          const notificationResponse =
            await fetch(
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
          // Notification errors do not block
          // the business dashboard.
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
  // CUSTOMER NAME AND CAC DISPLAY RULES
  // ==========================================================

  const customerName =
    business?.customer_name ||
    business?.full_name ||
    business?.owner_name ||
    business?.user?.full_name ||
    business?.user?.name ||
    business?.owner?.full_name ||
    business?.owner?.name ||
    'Customer';

  const registeredBusinessName =
    business?.registered_business_name ||
    business?.business_name ||
    business?.name ||
    '';

  const businessLevel =
    business ? getVerificationLevel(business) : null;

  const cacStatus = String(
    business?.cac_status ||
      business?.cac_verification_status ||
      ''
  ).toLowerCase();

  const cacApproved =
    business?.cac_verified === true ||
    [
      'verified',
      'approved',
      'completed',
    ].includes(cacStatus);

  // Registered business name is displayed only
  // at Level 4+ after CAC approval.

  const canShowBusinessName =
    businessLevel !== null &&
    businessLevel >= 4 &&
    cacApproved &&
    Boolean(registeredBusinessName.trim());

  const displayAccountName =
    canShowBusinessName
      ? registeredBusinessName
      : customerName;

  // ==========================================================
  // ACCOUNT DETAILS
  // ==========================================================

  const currency =
    business?.currency || 'NGN';

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

  const accountBalance = useMemo(
    () =>
      formatMoney(
        business?.balance,
        currency
      ),
    [business?.balance, currency]
  );

  const nextLevel =
    businessLevel === null
      ? 1
      : Math.min(businessLevel + 1, 5);

  const verificationComplete =
    verificationStatus === 'verified' &&
    businessLevel === 5;

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const openBusinessSection = (
    section: string
  ) => {
    if (!businessId) {
      setError(
        'Business account ID is missing.'
      );
      return;
    }

    navigate(businessPath(section));
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: PAGE_BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
        }}
      >
        <CircularProgress
          size={32}
          sx={{ color: GREEN }}
        />

        <Typography
          sx={{
            fontSize: 13,
            color: MUTED,
            fontWeight: 600,
          }}
        >
          Loading business dashboard...
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
          minHeight: '100dvh',
          bgcolor: PAGE_BG,
          p: 2,
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() =>
            navigate('/business')
          }
          sx={{
            mb: 2,
            color: GREEN,
            fontWeight: 700,
            textTransform: 'none',
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
          {error ||
            'Business account not found.'}
        </Alert>
      </Box>
    );
  }

  // ==========================================================
  // DASHBOARD UI
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: PAGE_BG,
        color: DARK_GREEN,
        overflowX: 'hidden',
        pb: {
          xs: 'calc(100px + env(safe-area-inset-bottom))',
          md: 4,
        },
      }}
    >
      {/* ================================================== */}
      {/* COMPACT HEADER */}
      {/* ================================================== */}

      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1100,
            mx: 'auto',
            px: { xs: 1.75, sm: 3 },
            py: 1.2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.2}
            >
              <Box
                sx={{
                  width: 39,
                  height: 39,
                  borderRadius: '12px',
                  bgcolor: DARK_GREEN,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 1000,
                  flexShrink: 0,
                }}
              >
                Z
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 900,
                    color: '#102E24',
                    fontSize: {
                      xs: 19,
                      sm: 23,
                    },
                    letterSpacing: -0.7,
                    lineHeight: 1.15,
                  }}
                >
                  Zenimonies
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 9,
                    letterSpacing: 2,
                    fontWeight: 800,
                    mt: 0.3,
                  }}
                >
                  BUSINESS BANKING
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.25}
            >
              <IconButton
                aria-label="Business notifications"
                onClick={() =>
                  openBusinessSection(
                    'notifications'
                  )
                }
                size="small"
                sx={{ color: DARK_GREEN }}
              >
                <Badge
                  badgeContent={notificationCount}
                  color="error"
                  max={99}
                >
                  <Notifications
                    sx={{ fontSize: 23 }}
                  />
                </Badge>
              </IconButton>

              <IconButton
                aria-label="Refresh business dashboard"
                onClick={() =>
                  loadBusiness(false)
                }
                disabled={refreshing}
                size="small"
                sx={{ color: DARK_GREEN }}
              >
                {refreshing ? (
                  <CircularProgress size={19} />
                ) : (
                  <Refresh
                    sx={{ fontSize: 22 }}
                  />
                )}
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* ================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================== */}

      <Box
        sx={{
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 1.75, sm: 3 },
          pt: { xs: 1.75, sm: 2.5 },
        }}
      >
        {/* ================================================== */}
        {/* COMPACT BALANCE CARD */}
        {/* ================================================== */}

        <Card
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: 3.5, sm: 4 },
            background:
              'linear-gradient(130deg, #00613F 0%, #004A37 65%, #00382D 100%)',
            color: '#fff',
            minHeight: 0,
            boxShadow:
              '0 8px 24px rgba(0,62,48,0.12)',
          }}
        >
          <Typography
            aria-hidden="true"
            sx={{
              position: 'absolute',
              right: -8,
              bottom: -75,
              fontSize: 200,
              fontWeight: 1000,
              lineHeight: 1,
              color: 'rgba(255,255,255,0.035)',
              pointerEvents: 'none',
            }}
          >
            Z
          </Typography>

          <CardContent
            sx={{
              position: 'relative',
              zIndex: 1,
              p: { xs: 2.2, sm: 3 },
              '&:last-child': {
                pb: { xs: 2.2, sm: 3 },
              },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: '#BBDACB',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  My Account
                </Typography>

                <Typography
                  sx={{
                    fontSize: {
                      xs: 18,
                      sm: 21,
                    },
                    fontWeight: 800,
                    mt: 0.4,
                    overflowWrap: 'anywhere',
                    lineHeight: 1.3,
                  }}
                >
                  {displayAccountName}
                </Typography>
              </Box>

              <Chip
                label={
                  canShowBusinessName
                    ? 'Verified Business'
                    : 'Business Account'
                }
                size="small"
                sx={{
                  color: '#fff',
                  bgcolor:
                    'rgba(255,255,255,0.10)',
                  border:
                    '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 700,
                  fontSize: 10,
                  height: 25,
                  flexShrink: 0,
                }}
              />
            </Stack>

            <Typography
              sx={{
                mt: 2.5,
                color: '#C0DDCF',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Available Balance
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ mt: 0.3 }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: {
                    xs: '1.9rem',
                    sm: '2.3rem',
                    md: '2.6rem',
                  },
                  letterSpacing: -0.8,
                  lineHeight: 1.2,
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
                  setShowBalance(
                    (previous) => !previous
                  )
                }
                size="small"
                sx={{
                  color: '#fff',
                  ml: 0.3,
                }}
              >
                {showBalance ? (
                  <VisibilityOff
                    sx={{ fontSize: 20 }}
                  />
                ) : (
                  <Visibility
                    sx={{ fontSize: 20 }}
                  />
                )}
              </IconButton>
            </Stack>

            <Divider
              sx={{
                borderColor:
                  'rgba(255,255,255,0.15)',
                my: 1.8,
              }}
            />

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.8}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor:
                      status === 'active'
                        ? '#4FE0A0'
                        : '#FFCC66',
                  }}
                />

                <Typography
                  sx={{
                    color: '#D4E8DE',
                    fontWeight: 700,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {status.replace(/_/g, ' ')}
                </Typography>
              </Stack>

              <Typography
                sx={{
                  color: '#C0DDCF',
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 1.5,
                }}
              >
                {currency}
              </Typography>
            </Stack>

            {business.account_number && (
              <Typography
                sx={{
                  mt: 1,
                  color: '#A6C8B8',
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                Account number: {business.account_number}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* ACCOUNT RESTRICTIONS */}
        {/* ================================================== */}

        {isSuspended && (
          <Alert
            severity="error"
            sx={{
              mt: 2,
              borderRadius: 3,
              fontSize: 13,
            }}
          >
            Your business account is restricted.
            Some financial services may be unavailable.
            Please contact Zenimonies support.
          </Alert>
        )}

        {/* ================================================== */}
        {/* COMPACT VERIFICATION BANNER */}
        {/* ================================================== */}

        {!verificationComplete && (
          <Card
            onClick={() =>
              openBusinessSection('kyc')
            }
            sx={{
              mt: 2,
              borderRadius: 3,
              border: '1px solid #F2D2CE',
              bgcolor: '#FFF7F5',
              boxShadow: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              '&:hover': {
                bgcolor: '#FFF0ED',
              },
            }}
          >
            <CardContent
              sx={{
                p: 1.8,
                '&:last-child': {
                  pb: 1.8,
                },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
              >
                <Box
                  sx={{
                    width: 45,
                    height: 45,
                    borderRadius: 2.5,
                    bgcolor: '#FFE7E3',
                    color: '#C62828',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Shield
                    sx={{ fontSize: 25 }}
                  />
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    sx={{
                      color: '#B72B28',
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    Business Verification
                  </Typography>

                  <Typography
                    sx={{
                      color: '#73877D',
                      mt: 0.4,
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {businessLevel !== null
                      ? `You are on Level ${businessLevel} of 5. Review your next verification requirements and applicable limits.`
                      : 'Complete verification to access services according to your account limits.'}
                  </Typography>

                  <Typography
                    sx={{
                      color: GREEN,
                      fontWeight: 800,
                      fontSize: 12,
                      mt: 0.7,
                    }}
                  >
                    {businessLevel === 5
                      ? 'View verification status'
                      : `View Level ${nextLevel} requirements`}
                  </Typography>
                </Box>

                <ChevronRight
                  sx={{
                    color: MUTED,
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        )}

        {verificationComplete && (
          <Card
            sx={{
              mt: 2,
              borderRadius: 3,
              bgcolor: '#EAF7EF',
              border: `1px solid ${BORDER}`,
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 1.8 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
              >
                <CheckCircle
                  sx={{
                    color: GREEN,
                    fontSize: 27,
                  }}
                />

                <Box>
                  <Typography
                    fontWeight={900}
                    fontSize={14}
                    color={DARK_GREEN}
                  >
                    Verification Complete
                  </Typography>

                  <Typography
                    sx={{
                      color: MUTED,
                      fontSize: 12,
                      mt: 0.3,
                    }}
                  >
                    Level 5 verification is recorded.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ================================================== */}
        {/* COMPACT QUICK ACTIONS */}
        {/* ================================================== */}

        <Box sx={{ mt: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              sx={{
                fontSize: {
                  xs: 20,
                  sm: 25,
                },
                fontWeight: 900,
                letterSpacing: -0.5,
                color: '#102E24',
              }}
            >
              Quick Actions
            </Typography>

            <Button
              size="small"
              onClick={() =>
                openBusinessSection('more')
              }
              endIcon={
                <ChevronRight
                  sx={{ fontSize: 17 }}
                />
              }
              sx={{
                color: GREEN,
                fontWeight: 800,
                fontSize: 12,
                textTransform: 'none',
                minWidth: 0,
              }}
            >
              More
            </Button>
          </Stack>

          <Typography
            sx={{
              mt: 0.3,
              color: MUTED,
              fontSize: 12,
            }}
          >
            Manage your business payments.
          </Typography>
        </Box>

        <Grid
          container
          spacing={1.2}
          sx={{ mt: 0.8 }}
        >
          {quickActions.map((item) => (
            <Grid
              item
              xs={3}
              sm={3}
              md={2.4}
              key={item.section}
            >
              <Paper
                onClick={() =>
                  openBusinessSection(
                    item.section
                  )
                }
                elevation={0}
                sx={{
                  minHeight: {
                    xs: 86,
                    sm: 105,
                  },
                  p: {
                    xs: 1,
                    sm: 1.5,
                  },
                  borderRadius: 2.5,
                  bgcolor: '#FFFFFF',
                  border: `1px solid ${BORDER}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: GREEN,
                    bgcolor: '#F7FCF9',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'scale(0.97)',
                  },
                }}
              >
                <Box
                  sx={{
                    color: GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiSvgIcon-root': {
                      fontSize: {
                        xs: 25,
                        sm: 30,
                      },
                    },
                  }}
                >
                  {item.icon}
                </Box>

                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#203B30',
                    fontSize: {
                      xs: 10,
                      sm: 13,
                    },
                    fontWeight: 800,
                    lineHeight: 1.25,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.title}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* ================================================== */}
        {/* MORE BUSINESS SERVICES */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 3,
            borderRadius: 3,
            border: `1px solid ${BORDER}`,
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 2,
              '&:last-child': {
                pb: 2,
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: 19,
                    sm: 24,
                  },
                  fontWeight: 900,
                  letterSpacing: -0.4,
                  color: '#102E24',
                }}
              >
                More Services
              </Typography>

              <Button
                size="small"
                onClick={() =>
                  openBusinessSection('more')
                }
                endIcon={
                  <ArrowForward
                    sx={{ fontSize: 16 }}
                  />
                }
                sx={{
                  color: GREEN,
                  fontWeight: 800,
                  fontSize: 12,
                  textTransform: 'none',
                }}
              >
                See all
              </Button>
            </Stack>

            <Typography
              sx={{
                color: MUTED,
                mt: 0.3,
                mb: 1.5,
                fontSize: 12,
              }}
            >
              Manage your business account.
            </Typography>

            <Grid
              container
              spacing={1}
            >
              {[
                {
                  title: 'Transactions',
                  section: 'transactions',
                  icon: <ReceiptLong />,
                },
                {
                  title: 'Statements',
                  section: 'statements',
                  icon: <Description />,
                },
                {
                  title: 'Business Wallet',
                  section: 'wallet',
                  icon: <Wallet />,
                },
                {
                  title: 'Business Cards',
                  section: 'cards',
                  icon: <CreditCard />,
                },
                {
                  title: 'Staff & Access',
                  section: 'staff',
                  icon: <People />,
                },
                {
                  title: 'Security',
                  section: 'security',
                  icon: <Lock />,
                },
                {
                  title: 'Settings',
                  section: 'settings',
                  icon: <Settings />,
                },
                {
                  title: 'POS Terminal',
                  section: 'pos',
                  icon: <PointOfSale />,
                },
              ].map((item) => (
                <Grid
                  item
                  xs={6}
                  sm={3}
                  key={item.section}
                >
                  <Paper
                    onClick={() =>
                      openBusinessSection(
                        item.section
                      )
                    }
                    elevation={0}
                    sx={{
                      p: 1.5,
                      minHeight: 78,
                      borderRadius: 2.5,
                      bgcolor: '#F2F8F5',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      '&:hover': {
                        bgcolor: '#E7F4EC',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: GREEN,
                        display: 'flex',
                        '& .MuiSvgIcon-root': {
                          fontSize: 25,
                        },
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Typography
                      sx={{
                        mt: 0.8,
                        fontSize: 12,
                        fontWeight: 800,
                        color: GREEN,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* POS SERVICES */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 2,
            borderRadius: 3,
            bgcolor: '#FFFFFF',
            border: `1px solid ${BORDER}`,
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
            >
              <Avatar
                sx={{
                  width: 43,
                  height: 43,
                  bgcolor: LIGHT_GREEN,
                  color: GREEN,
                }}
              >
                <PointOfSale
                  sx={{ fontSize: 24 }}
                />
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: 15,
                    color: DARK_GREEN,
                  }}
                >
                  POS Terminal
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 12,
                    mt: 0.3,
                    lineHeight: 1.5,
                  }}
                >
                  Apply for a POS terminal and
                  manage approved devices.
                </Typography>
              </Box>

              <IconButton
                aria-label="Open POS services"
                onClick={() =>
                  openBusinessSection('pos')
                }
                sx={{ color: GREEN }}
              >
                <ChevronRight />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* RECENT TRANSACTIONS */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 3,
            borderRadius: 3,
            border: `1px solid ${BORDER}`,
            boxShadow: 'none',
          }}
        >
          <CardContent
            sx={{
              p: 2,
              '&:last-child': {
                pb: 2,
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: {
                      xs: 18,
                      sm: 23,
                    },
                    fontWeight: 900,
                    color: '#102E24',
                    letterSpacing: -0.4,
                  }}
                >
                  Recent Transactions
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 12,
                    color: MUTED,
                  }}
                >
                  Business account activity
                </Typography>
              </Box>

              <IconButton
                aria-label="Refresh transactions"
                onClick={() =>
                  loadBusiness(false)
                }
                disabled={refreshing}
                size="small"
                sx={{ color: GREEN }}
              >
                {refreshing ? (
                  <CircularProgress size={18} />
                ) : (
                  <Refresh
                    sx={{ fontSize: 21 }}
                  />
                )}
              </IconButton>
            </Stack>

            <Divider sx={{ my: 1.8 }} />

            {transactionError && (
              <Alert
                severity="warning"
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  fontSize: 12,
                }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      loadBusiness(false)
                    }
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
                  py: 3,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    mx: 'auto',
                    mb: 1.5,
                    borderRadius: '50%',
                    bgcolor: LIGHT_GREEN,
                    color: GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp
                    sx={{ fontSize: 26 }}
                  />
                </Box>

                <Typography
                  fontWeight={800}
                  fontSize={13}
                  color={DARK_GREEN}
                >
                  No business transactions yet
                </Typography>

                <Typography
                  sx={{
                    mt: 0.6,
                    color: MUTED,
                    fontSize: 12,
                  }}
                >
                  Business account activity
                  will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {transactions
                  .slice(0, 5)
                  .map((tx) => {
                    const amount =
                      Number(tx.amount || 0);

                    const type = (
                      tx.type || ''
                    ).toLowerCase();

                    const isCredit =
                      type.includes('received') ||
                      type.includes('credit') ||
                      type.includes('deposit') ||
                      type.includes('refund');

                    return (
                      <Box key={tx.id}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.2}
                        >
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: isCredit
                                ? '#E7F5EC'
                                : '#F0F3F1',
                              color: isCredit
                                ? GREEN
                                : '#75857C',
                            }}
                          >
                            {isCredit ? (
                              <ArrowDownward
                                sx={{
                                  fontSize: 19,
                                }}
                              />
                            ) : (
                              <ArrowUpward
                                sx={{
                                  fontSize: 19,
                                }}
                              />
                            )}
                          </Avatar>

                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: 12,
                                color: '#203B30',
                              }}
                              noWrap
                            >
                              {tx.description ||
                                tx.type ||
                                'Business transaction'}
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 10,
                                color: MUTED,
                                mt: 0.3,
                              }}
                            >
                              {formatDate(
                                tx.created_at
                              )}
                            </Typography>

                            {tx.status && (
                              <Chip
                                size="small"
                                label={tx.status.replace(
                                  /_/g,
                                  ' '
                                )}
                                color={getStatusColor(
                                  tx.status
                                )}
                                sx={{
                                  mt: 0.4,
                                  height: 19,
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              />
                            )}
                          </Box>

                          <Typography
                            sx={{
                              fontWeight: 900,
                              fontSize: {
                                xs: 11,
                                sm: 14,
                              },
                              color: isCredit
                                ? GREEN
                                : '#203B30',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isCredit ? '+' : ''}
                            {formatMoney(
                              amount,
                              tx.currency || currency
                            )}
                          </Typography>
                        </Stack>

                        <Divider sx={{ mt: 1.5 }} />
                      </Box>
                    );
                  })}
              </Stack>
            )}

            {pagination &&
              pagination.total > 5 && (
                <Typography
                  sx={{
                    mt: 1.5,
                    textAlign: 'center',
                    color: MUTED,
                    fontSize: 11,
                  }}
                >
                  Showing 5 of {pagination.total}{' '}
                  business transactions.
                </Typography>
              )}

            <Button
              fullWidth
              onClick={() =>
                openBusinessSection(
                  'transactions'
                )
              }
              endIcon={
                <ArrowForward
                  sx={{ fontSize: 17 }}
                />
              }
              sx={{
                mt: 1.5,
                py: 1,
                color: GREEN,
                border: `1px solid ${BORDER}`,
                borderRadius: 2.5,
                fontWeight: 800,
                fontSize: 12,
                textTransform: 'none',
              }}
            >
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* BUSINESS PROFILE */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 2,
            borderRadius: 3,
            border: `1px solid ${BORDER}`,
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
            >
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: LIGHT_GREEN,
                  color: GREEN,
                }}
              >
                <Store
                  sx={{ fontSize: 23 }}
                />
              </Avatar>

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  fontWeight={900}
                  fontSize={13}
                  color={DARK_GREEN}
                  noWrap
                >
                  {displayAccountName}
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 11,
                    mt: 0.3,
                  }}
                >
                  {business.business_type ||
                    'Business account'}
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 11,
                    mt: 0.3,
                    textTransform: 'capitalize',
                  }}
                >
                  Status: {status.replace(
                    /_/g,
                    ' '
                  )}
                </Typography>
              </Box>

              <IconButton
                aria-label="Business settings"
                onClick={() =>
                  openBusinessSection(
                    'settings'
                  )
                }
                size="small"
                sx={{ color: GREEN }}
              >
                <ChevronRight />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* FOOTER */}
        {/* ================================================== */}

        <Box
          sx={{
            mt: 3,
            mb: 1,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              color: MUTED,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Zenimonies Business Banking
          </Typography>

          <Typography
            sx={{
              color: '#A0AEA7',
              fontSize: 10,
              mt: 0.3,
            }}
          >
            Your business banking, in one place.
          </Typography>
        </Box>
      </Box>

      {/* ================================================== */}
      {/* COMPACT FIXED BOTTOM NAVIGATION */}
      {/* ================================================== */}

      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${BORDER}`,
          borderRadius: 0,
          paddingBottom:
            'env(safe-area-inset-bottom)',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            maxWidth: 900,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns:
              'repeat(5, minmax(0, 1fr))',
            px: 0.5,
          }}
        >
          {[
            {
              title: 'Home',
              icon: <Home />,
              section: '',
            },
            {
              title: 'Transactions',
              icon: (
                <ReceiptLong />
              ),
              section: 'transactions',
            },
            {
              title: 'Cards',
              icon: <CreditCard />,
              section: 'cards',
            },
            {
              title: 'Wallet',
              icon: <Wallet />,
              section: 'wallet',
            },
            {
              title: 'Profile',
              icon: <AccountCircle />,
              section: 'settings',
            },
          ].map((item) => {
            const active =
              item.section === '';

            return (
              <Box
                key={item.title}
                onClick={() => {
                  if (item.section) {
                    openBusinessSection(
                      item.section
                    );
                  } else {
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }
                }}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  py: 0.8,
                  minHeight: 57,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.3,
                  color: active
                    ? GREEN
                    : MUTED,
                  '&:active': {
                    bgcolor: '#F2F8F5',
                  },
                }}
              >
                {active && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: '25%',
                      right: '25%',
                      height: 3,
                      borderRadius:
                        '0 0 5px 5px',
                      bgcolor: GREEN,
                    }}
                  />
                )}

                {item.icon}

                <Typography
                  sx={{
                    fontSize: {
                      xs: 9,
                      sm: 11,
                    },
                    fontWeight: active
                      ? 900
                      : 700,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default BusinessDashboard;
