
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
  Add,
  ArrowBack,
  ArrowDownward,
  ArrowForward,
  ArrowUpward,
  Business,
  CheckCircle,
  ChevronRight,
  ContentCopy,
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
  Settings,
  Shield,
  TrendingUp,
  Tv,
  Visibility,
  VisibilityOff,
  Wallet,
  Wifi,
  People,
  SportsSoccer,
  AccountCircle,
  Store,
} from '@mui/icons-material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// BUSINESS DASHBOARD
// MOBILE-FIRST BUSINESS BANKING
// ============================================================

const API_BASE = (
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api'
).replace(/\/$/, '');

const GREEN = '#008D4F';
const DARK_GREEN = '#064B37';
const DEEP_GREEN = '#003E30';
const LIGHT_GREEN = '#E8F5EE';
const PAGE_BG = '#F2F8F5';
const BORDER = '#DDEBE4';

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
  transaction_type?: string;
  description?: string;
  narration?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  reference?: string;
  transaction_reference?: string;
  created_at?: string;
  transaction_date?: string;
  direction?: string;
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
    currency?.toUpperCase() === 'ZAR' ? 'ZAR' : 'NGN';

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

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
      'success',
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
      'initiated',
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
      'cancelled',
      'canceled',
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

const getTransactionType = (tx: Transaction) =>
  String(tx.transaction_type || tx.type || '').toLowerCase();

const isCreditTransaction = (tx: Transaction) => {
  const type = getTransactionType(tx);

  const direction = String(
    tx.direction || ''
  ).toLowerCase();

  if (direction === 'credit' || direction === 'in') {
    return true;
  }

  if (direction === 'debit' || direction === 'out') {
    return false;
  }

  return [
    'received',
    'credit',
    'deposit',
    'refund',
    'cashback',
    'reversal',
  ].some((item) => type.includes(item));
};

// ============================================================
// QUICK ACTIONS
// ============================================================

type ServiceItem = {
  title: string;
  section: string;
  icon: React.ReactNode;
};

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
    title: 'Send to\nZENIMONIES',
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
// MAIN DASHBOARD
// ============================================================

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const businessId = id || '';

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

  const [accountCopied, setAccountCopied] =
    useState(false);

  // ==========================================================
  // COPY BUSINESS ACCOUNT NUMBER
  // ==========================================================

  const copyBusinessAccountNumber = async () => {
    if (!business?.account_number) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        business.account_number
      );

      setAccountCopied(true);

      window.setTimeout(() => {
        setAccountCopied(false);
      }, 2500);
    } catch {
      window.prompt(
        'Copy your business account number:',
        business.account_number
      );
    }
  };

  // ==========================================================
  // LOAD BUSINESS DATA
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

        // ----------------------------------------------------
        // BUSINESS ACCOUNT
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // BUSINESS TRANSACTIONS
        // ----------------------------------------------------

        try {
          const transactionResponse = await fetch(
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

          const paginationData =
            transactionResult.pagination ||
            transactionResult.data?.pagination;

          setPagination(paginationData || null);
        } catch (err: unknown) {
          setTransactions([]);
          setPagination(null);

          setTransactionError(
            err instanceof Error
              ? err.message
              : 'Unable to load business transactions.'
          );
        }

        // ----------------------------------------------------
        // NOTIFICATIONS
        // ----------------------------------------------------
        // This is the existing user-level notification
        // endpoint, not a business-scoped notification API.
        // It is retained for compatibility with your current
        // backend. Business notification isolation should
        // be enforced by a business-specific endpoint.
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
          // Notifications do not block the dashboard.
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your business account.'
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

  const nextLevel =
    verificationLevel === null
      ? 1
      : Math.min(verificationLevel + 1, 5);

  const verificationComplete =
    verificationStatus === 'verified' &&
    verificationLevel === 5;

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const openBusinessSection = (section: string) => {
    if (!businessId) {
      setError('Business account ID is missing.');
      return;
    }

    navigate(businessPath(section));
  };

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
  // DASHBOARD UI
  // ==========================================================

  <Box
  sx={{
    minHeight: '100vh',
    bgcolor: PAGE_BG,
    pb: {
      xs: 'calc(180px + env(safe-area-inset-bottom))',
      md: 40,
    },
    color: DARK_GREEN,
    overflowX: 'hidden',
  }}
    >
      {/* ================================================== */}
      {/* TOP BRAND HEADER */}
      {/* ================================================== */}

      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, md: 4 },
            py: 1.8,
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
              spacing={1.5}
              sx={{ minWidth: 0 }}
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: '17px',
                  bgcolor: DARK_GREEN,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 31,
                  fontWeight: 1000,
                  flexShrink: 0,
                  boxShadow:
                    '0 5px 14px rgba(0,62,48,0.16)',
                }}
              >
                Z
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 1000,
                    color: '#102E24',
                    fontSize: { xs: 23, sm: 29 },
                    letterSpacing: -1.1,
                    lineHeight: 1.1,
                  }}
                >
                  Zenimonies
                </Typography>

                <Typography
                  sx={{
                    color: '#91A39A',
                    fontSize: 10,
                    letterSpacing: 4,
                    fontWeight: 900,
                    mt: 0.5,
                  }}
                >
                  BUSINESS BANKING
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
            >
              <IconButton
                aria-label="Business notifications"
                onClick={() =>
                  openBusinessSection('notifications')
                }
                sx={{ color: DARK_GREEN }}
              >
                <Badge
                  badgeContent={notificationCount}
                  color="error"
                  max={99}
                >
                  <Notifications sx={{ fontSize: 29 }} />
                </Badge>
              </IconButton>

              <IconButton
                aria-label="Refresh business dashboard"
                onClick={() => loadBusiness(false)}
                disabled={refreshing}
                sx={{ color: DARK_GREEN }}
              >
                {refreshing ? (
                  <CircularProgress size={21} />
                ) : (
                  <Refresh />
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
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          pt: 2,
        }}
      >
        {/* BUSINESS ACCOUNT CARD */}

        <Card
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: '0 0 34px 34px', md: 5 },
            background:
              'linear-gradient(130deg, #00613F 0%, #004A37 65%, #00382D 100%)',
            color: '#fff',
            minHeight: 245,
            boxShadow:
              '0 16px 35px rgba(0,62,48,0.15)',
          }}
        >
          <Typography
            aria-hidden="true"
            sx={{
              position: 'absolute',
              right: -5,
              bottom: -100,
              fontSize: 300,
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
              p: { xs: 3, md: 4 },
              '&:last-child': { pb: 4 },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: '#BBDACB',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Business
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: 19, sm: 23 },
                    fontWeight: 900,
                    mt: 0.5,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {businessName}
                </Typography>
              </Box>

              <Chip
                icon={<Business />}
                label="Business"
                size="small"
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.10)',
                  border:
                    '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              />
            </Stack>

            <Typography
              sx={{
                mt: 3,
                color: '#C0DDCF',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Available Balance
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 0.5 }}
            >
              <Typography
                sx={{
                  fontWeight: 1000,
                  fontSize: {
                    xs: '2.35rem',
                    sm: '2.8rem',
                    md: '3.2rem',
                  },
                  letterSpacing: -1.2,
                  lineHeight: 1.25,
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
                {showBalance ? (
                  <VisibilityOff />
                ) : (
                  <Visibility />
                )}
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mt: 3 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <Box
                  sx={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    bgcolor:
                      status === 'active'
                        ? '#4FE0A0'
                        : '#FFCC66',
                    boxShadow:
                      '0 0 0 6px rgba(255,255,255,0.06)',
                  }}
                />

                <Typography
                  sx={{
                    color: '#D4E8DE',
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {status === 'active'
                    ? 'Active'
                    : status.replace(/_/g, ' ')}
                </Typography>
              </Stack>

              <Typography
                sx={{
                  color: '#A6C8B8',
                  fontWeight: 1000,
                  letterSpacing: 3,
                  fontSize: 14,
                }}
              >
                {currency}
              </Typography>
            </Stack>

            {/* BUSINESS ACCOUNT NUMBER */}

            {business.account_number && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mt: 1.5 }}
              >
                <Typography
                  sx={{
                    color: '#A6C8B8',
                    fontSize: 12,
                    letterSpacing: 1,
                    overflowWrap: 'anywhere',
                  }}
                >
                  Account: {business.account_number}
                </Typography>

                <IconButton
                  size="small"
                  aria-label="Copy business account number"
                  onClick={copyBusinessAccountNumber}
                  sx={{
                    color: '#fff',
                    p: 0.5,
                  }}
                >
                  {accountCopied ? (
                    <CheckCircle sx={{ fontSize: 18 }} />
                  ) : (
                    <ContentCopy sx={{ fontSize: 17 }} />
                  )}
                </IconButton>
              </Stack>
            )}

            {accountCopied && (
              <Typography
                role="status"
                sx={{
                  mt: 0.5,
                  color: '#8FE4B9',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Account number copied successfully
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* ACCOUNT RESTRICTIONS */}

        {isSuspended && (
          <Alert
            severity="error"
            sx={{
              mt: 3,
              borderRadius: 3,
              fontWeight: 600,
            }}
          >
            Your business account is restricted. Some
            financial services may be unavailable. Please
            contact Zenimonies support.
          </Alert>
        )}

        {/* ================================================== */}
        {/* BUSINESS VERIFICATION */}
        {/* ================================================== */}

        {!verificationComplete && (
          <Card
            onClick={() =>
              openBusinessSection('verification')
            }
            sx={{
              mt: 3,
              borderRadius: 4,
              border: '1px solid #F2D2CE',
              bgcolor: '#FFF5F3',
              boxShadow: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow:
                  '0 6px 20px rgba(170,50,40,0.08)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent
              sx={{
                p: { xs: 2, md: 2.5 },
                '&:last-child': { pb: 2.5 },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
              >
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: 4,
                    bgcolor: '#FFE7E3',
                    color: '#C62828',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Shield sx={{ fontSize: 37 }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: '#BF2828',
                      fontWeight: 1000,
                      fontSize: { xs: 17, sm: 20 },
                    }}
                  >
                    Business Verification
                  </Typography>

                  <Typography
                    sx={{
                      color: '#73877D',
                      mt: 0.5,
                      fontSize: { xs: 13, sm: 15 },
                      lineHeight: 1.5,
                    }}
                  >
                    {verificationLevel !== null
                      ? `You're on Level ${verificationLevel} of 5. Complete your next verification upgrade to increase your applicable limits.`
                      : 'Complete your business verification to access services according to your account limits.'}
                  </Typography>

                  <Typography
                    sx={{
                      color: GREEN,
                      fontWeight: 900,
                      fontSize: 13,
                      mt: 1,
                    }}
                  >
                    {verificationLevel === 5
                      ? 'Review verification status'
                      : `View Level ${nextLevel} upgrade`}
                  </Typography>
                </Box>

                <ChevronRight
                  sx={{
                    color: '#81928A',
                    fontSize: 32,
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
              mt: 3,
              borderRadius: 4,
              bgcolor: '#EAF7EF',
              border: `1px solid ${BORDER}`,
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
              >
                <CheckCircle
                  sx={{ color: GREEN, fontSize: 35 }}
                />

                <Box>
                  <Typography
                    fontWeight={900}
                    color={DARK_GREEN}
                  >
                    Business Verification Complete
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Level 5 verification is recorded on your
                    account.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ================================================== */}
        {/* QUICK ACTIONS */}
        {/* ================================================== */}

        <Box sx={{ mt: 5 }}>
          <Typography
            sx={{
              fontSize: { xs: 25, sm: 30 },
              fontWeight: 1000,
              letterSpacing: -1,
              color: '#102E24',
            }}
          >
            Quick Actions
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: '#8B9B93',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Everything your business needs, in one place.
          </Typography>
        </Box>

        <Grid
          container
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ mt: 1 }}
        >
          {quickActions.map((item) => (
            <Grid
              item
              xs={4}
              sm={3}
              md={2.4}
              key={item.section}
            >
              <Stack
                onClick={() =>
                  openBusinessSection(item.section)
                }
                alignItems="center"
                spacing={1.2}
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  '&:active .quick-action-icon': {
                    transform: 'scale(0.96)',
                  },
                }}
              >
                <Paper
                  className="quick-action-icon"
                  elevation={0}
                  sx={{
                    width: '100%',
                    maxWidth: 116,
                    aspectRatio: '1 / 1',
                    borderRadius: {
                      xs: 3.5,
                      sm: 4,
                    },
                    bgcolor: '#fff',
                    border: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: GREEN,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: GREEN,
                      boxShadow:
                        '0 8px 20px rgba(0,141,79,0.10)',
                      transform: 'translateY(-3px)',
                    },
                    '& .MuiSvgIcon-root': {
                      fontSize: {
                        xs: 35,
                        sm: 43,
                      },
                    },
                  }}
                >
                  {item.icon}
                </Paper>

                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#203B30',
                    fontSize: {
                      xs: 12,
                      sm: 15,
                    },
                    fontWeight: 900,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-line',
                    minHeight: 34,
                  }}
                >
                  {item.title}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>

        {/* ================================================== */}
        {/* MORE BUSINESS SERVICES */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 5,
            borderRadius: 4,
            border: `1px solid ${BORDER}`,
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.025)',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, md: 3.5 },
              '&:last-child': { pb: 3.5 },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                sx={{
                  fontSize: { xs: 25, sm: 30 },
                  fontWeight: 1000,
                  letterSpacing: -1,
                  color: '#102E24',
                }}
              >
                More Services
              </Typography>

              <Button
                onClick={() =>
                  openBusinessSection('more')
                }
                endIcon={<ArrowForward />}
                sx={{
                  color: GREEN,
                  fontWeight: 900,
                  textTransform: 'none',
                }}
              >
                See all
              </Button>
            </Stack>

            <Typography
              sx={{
                color: '#8B9B93',
                mt: 0.5,
                mb: 2.5,
                fontSize: 15,
              }}
            >
              Manage your Zenimonies business account.
            </Typography>

            <Grid container spacing={1.5}>
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
                  title: 'Business Settings',
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
                  sm={4}
                  md={3}
                  key={item.section}
                >
                  <Paper
                    onClick={() =>
                      openBusinessSection(item.section)
                    }
                    elevation={0}
                    sx={{
                      p: 2,
                      minHeight: 112,
                      borderRadius: 3.5,
                      bgcolor: '#F2F8F5',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#E7F4EC',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: GREEN,
                        '& .MuiSvgIcon-root': {
                          fontSize: 31,
                        },
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Typography
                      sx={{
                        mt: 1.5,
                        fontSize: {
                          xs: 13,
                          sm: 14,
                        },
                        fontWeight: 900,
                        color: GREEN,
                        lineHeight: 1.35,
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
        {/* POS TERMINAL */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 3,
            borderRadius: 4,
            bgcolor: '#fff',
            border: `1px solid ${BORDER}`,
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.025)',
          }}
        >
          <CardContent
            sx={{ p: { xs: 2.5, md: 3.5 } }}
          >
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              alignItems={{
                xs: 'flex-start',
                sm: 'center',
              }}
              spacing={2}
            >
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: LIGHT_GREEN,
                  color: GREEN,
                }}
              >
                <PointOfSale sx={{ fontSize: 34 }} />
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 1000,
                    fontSize: 20,
                    color: DARK_GREEN,
                  }}
                >
                  POS Terminal
                </Typography>

                <Typography
                  sx={{
                    color: '#81928A',
                    fontSize: 14,
                    mt: 0.5,
                    lineHeight: 1.6,
                  }}
                >
                  Apply for a business POS terminal, check
                  your application status, and manage
                  approved terminals. POS approval is
                  separate from business account access.
                </Typography>
              </Box>

              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                onClick={() =>
                  openBusinessSection('pos')
                }
                sx={{
                  width: {
                    xs: '100%',
                    sm: 'auto',
                  },
                  bgcolor: GREEN,
                  borderRadius: 3,
                  px: 3,
                  py: 1.3,
                  fontWeight: 900,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: DARK_GREEN,
                    boxShadow: 'none',
                  },
                }}
              >
                POS Services
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* RECENT TRANSACTIONS */}
        {/* ================================================== */}

        <Card
          sx={{
            mt: 4,
            borderRadius: 4,
            border: `1px solid ${BORDER}`,
            boxShadow:
              '0 4px 18px rgba(0,0,0,0.025)',
          }}
        >
          <CardContent
            sx={{ p: { xs: 2.5, md: 3.5 } }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: {
                      xs: 22,
                      sm: 26,
                    },
                    fontWeight: 1000,
                    color: '#102E24',
                    letterSpacing: -0.5,
                  }}
                >
                  Recent Transactions
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 14,
                    color: '#8B9B93',
                  }}
                >
                  Business account activity
                </Typography>
              </Box>

              <IconButton
                aria-label="Refresh transactions"
                onClick={() => loadBusiness(false)}
                disabled={refreshing}
                sx={{ color: GREEN }}
              >
                {refreshing ? (
                  <CircularProgress size={20} />
                ) : (
                  <Refresh />
                )}
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            {transactionError && (
              <Alert
                severity="warning"
                sx={{
                  mb: 2,
                  borderRadius: 3,
                }}
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
                  py: 4,
                }}
              >
                <Box
                  sx={{
                    width: 65,
                    height: 65,
                    mx: 'auto',
                    mb: 2,
                    borderRadius: '50%',
                    bgcolor: LIGHT_GREEN,
                    color: GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ fontSize: 34 }} />
                </Box>

                <Typography
                  fontWeight={900}
                  color={DARK_GREEN}
                >
                  No business transactions yet
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    color: '#81928A',
                    fontSize: 14,
                  }}
                >
                  Transactions posted to this business
                  account will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {transactions.slice(0, 5).map((tx) => {
                  const amount = Number(tx.amount || 0);

                  const isCredit =
                    isCreditTransaction(tx);

                  return (
                    <Box
                      key={tx.id || tx.reference}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                      >
                        <Avatar
                          sx={{
                            width: 43,
                            height: 43,
                            bgcolor: isCredit
                              ? '#E7F5EC'
                              : '#F0F3F1',
                            color: isCredit
                              ? GREEN
                              : '#75857C',
                          }}
                        >
                          {isCredit ? (
                            <ArrowDownward />
                          ) : (
                            <ArrowUpward />
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
                              fontWeight: 900,
                              fontSize: 14,
                              color: '#203B30',
                            }}
                            noWrap
                          >
                            {tx.description ||
                              tx.narration ||
                              tx.transaction_type ||
                              tx.type ||
                              'Business transaction'}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 12,
                              color: '#8B9B93',
                              mt: 0.4,
                            }}
                          >
                            {formatDate(
                              tx.created_at ||
                                tx.transaction_date
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
                                mt: 0.6,
                                height: 22,
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            />
                          )}
                        </Box>

                        <Typography
                          sx={{
                            fontWeight: 1000,
                            fontSize: {
                              xs: 12,
                              sm: 15,
                            },
                            color: isCredit
                              ? GREEN
                              : '#203B30',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isCredit ? '+' : '-'}
                          {formatMoney(
                            Math.abs(
                              Number.isFinite(amount)
                                ? amount
                                : 0
                            ),
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

            {pagination && pagination.total > 5 && (
              <Typography
                sx={{
                  mt: 2,
                  textAlign: 'center',
                  color: '#81928A',
                  fontSize: 12,
                }}
              >
                Showing the latest 5 of{' '}
                {pagination.total} business transactions.
              </Typography>
            )}

            <Button
              fullWidth
              onClick={() =>
                openBusinessSection('transactions')
              }
              endIcon={<ArrowForward />}
              sx={{
                mt: 2,
                py: 1.5,
                color: GREEN,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                fontWeight: 900,
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
            mt: 3,
            borderRadius: 4,
            border: `1px solid ${BORDER}`,
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
            >
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: LIGHT_GREEN,
                  color: GREEN,
                }}
              >
                <Store />
              </Avatar>

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  fontWeight={1000}
                  color={DARK_GREEN}
                >
                  {businessName}
                </Typography>

                <Typography
                  sx={{
                    color: '#81928A',
                    fontSize: 13,
                    mt: 0.5,
                  }}
                >
                  {business.business_type ||
                    'Business account'}
                </Typography>

                <Typography
                  sx={{
                    color: '#81928A',
                    fontSize: 12,
                    mt: 0.5,
                  }}
                >
                  Account status:{' '}
                  {status.replace(/_/g, ' ')}
                </Typography>
              </Box>

              <IconButton
                aria-label="Business settings"
                onClick={() =>
                  openBusinessSection('settings')
                }
                sx={{ color: GREEN }}
              >
                <ChevronRight />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>

        {/* FOOTER */}

        <Box
          sx={{
            mt: 4,
            mb: 2,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              color: '#81928A',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Zenimonies Business Banking
          </Typography>

          <Typography
            sx={{
              color: '#A0AEA7',
              fontSize: 12,
              mt: 0.5,
            }}
          >
            Your business banking, in one place.
          </Typography>
        </Box>
      </Box>

      {/* ================================================== */}
      {/* FIXED BOTTOM NAVIGATION */}
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
          backdropFilter: 'blur(14px)',
          borderTop: `1px solid ${BORDER}`,
          borderRadius: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            maxWidth: 900,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            px: 0.5,
          }}
        >
          {[
            {
              title: 'Home',
              section: '',
            },
            {
              title: 'Transactions',
              section: 'transactions',
            },
            {
              title: 'Cards',
              section: 'cards',
            },
            {
              title: 'Wallet',
              section: 'wallet',
            },
            {
              title: 'Profile',
              section: 'settings',
            },
          ].map((item) => {
            const active = item.section === '';

            return (
              <Box
                key={item.title}
                onClick={() => {
                  if (item.section) {
                    openBusinessSection(item.section);
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
                  py: 1.3,
                  minHeight: 72,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.4,
                  color: active
                    ? GREEN
                    : '#81928A',
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
                      height: 4,
                      borderRadius: '0 0 5px 5px',
                      bgcolor: GREEN,
                    }}
                  />
                )}

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 30,
                    '& .MuiSvgIcon-root': {
                      fontSize: 27,
                    },
                  }}
                >
                  {item.title === 'Home' && <Home />}

                  {item.title === 'Transactions' && (
                    <SwapNavIcon />
                  )}

                  {item.title === 'Cards' && (
                    <CreditCard />
                  )}

                  {item.title === 'Wallet' && <Wallet />}

                  {item.title === 'Profile' && (
                    <AccountCircle />
                  )}
                </Box>

                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: active ? 900 : 700,
                    textAlign: 'center',
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

// ============================================================
// BOTTOM NAVIGATION TRANSACTIONS ICON
// ============================================================

const SwapNavIcon: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      lineHeight: 0.8,
    }}
  >
    <ArrowUpward sx={{ fontSize: 18, mb: -0.5 }} />
    <ArrowDownward sx={{ fontSize: 18 }} />
  </Box>
);

export default BusinessDashboard;
