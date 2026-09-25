

import React, { useCallback, useEffect, useState } from 'react';

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
} from '@mui/icons-material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

// ============================================================
// ZENIMONIES BUSINESS BANKING
// BUSINESS DASHBOARD
// BRAND: GREEN AND WHITE
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
  verification_status?: string;
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
  ).format(value);
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
    value === 'blocked'
  ) {
    return 'error';
  }

  return 'default';
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
        // Load business details
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
        // Load business-specific transaction history
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

          if (Array.isArray(transactionData)) {
            setTransactions(transactionData);
          } else {
            setTransactions([]);
          }

          setPagination(
            transactionResult.pagination || null
          );
        } catch (transactionErr: any) {
          setTransactions([]);
          setPagination(null);

          setTransactionError(
            transactionErr.message ||
              'Unable to load transaction history.'
          );
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
  // BUSINESS STATUS
  // ==========================================================

  const status =
    business.status ||
    business.verification_status ||
    'pending';

  const isActive =
    status.toLowerCase() === 'active' &&
    business.verification_status?.toLowerCase() !==
      'rejected';

  const currency = business.currency || 'NGN';

  const businessName =
    business.business_name ||
    business.name ||
    'Business Account';

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
      {/* HEADER */}

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
                  Zenimonies Business
                </Typography>
              </Stack>

              <Typography
                sx={{
                  mt: 1,
                  color: '#D9F3E4',
                }}
              >
                Business Banking Dashboard
              </Typography>
            </Box>

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
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          mt: 4,
        }}
      >
        {/* BUSINESS INFORMATION */}

        <Card
          sx={{
            borderRadius: 4,
            mb: 3,
            boxShadow: '0 5px 25px rgba(0,0,0,0.05)',
            border: '1px solid #E1EEE5',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
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
                  color="text.secondary"
                  variant="body2"
                  sx={{ mt: 0.5 }}
                >
                  Registered: {formatDate(business.created_at)}
                </Typography>
              </Box>

              <Box>
                <Chip
                  label={status.replace(/_/g, ' ').toUpperCase()}
                  color={getStatusColor(status)}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* PENDING / INACTIVE BUSINESS */}

        {!isActive && (
          <Alert
            severity={
              status.toLowerCase() === 'rejected'
                ? 'error'
                : 'warning'
            }
            sx={{ mb: 3, borderRadius: 3 }}
          >
            {status.toLowerCase() === 'rejected'
              ? 'Your business application was rejected. Please contact Zenimonies support for further information.'
              : 'Your business account is awaiting verification and approval. Business transactions remain unavailable until your account is approved and activated.'}
          </Alert>
        )}

        {/* BALANCE */}

        <Grid container spacing={3}>
          <Grid item xs={12}>
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
              <CardContent sx={{ p: 4 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography
                      sx={{ color: '#D9F3E4' }}
                    >
                      Business account balance
                    </Typography>

                    <Typography
                      variant="h3"
                      fontWeight={800}
                      sx={{
                        mt: 2,
                        fontSize: {
                          xs: '2rem',
                          md: '2.7rem',
                        },
                      }}
                    >
                      {formatMoney(
                        business.balance,
                        currency
                      )}
                    </Typography>

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
                      fontSize: 55,
                      opacity: 0.7,
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* QUICK ACTIONS */}

        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            mt: 4,
            mb: 2,
            color: DARK_GREEN,
          }}
        >
          Business Services
        </Typography>

        <Grid container spacing={2}>
          {[
            {
              title: 'Transfer',
              description: 'Business payments',
              icon: <ArrowUpward />,
              action: () =>
                navigate('/business/transfer'),
            },
            {
              title: 'Transactions',
              description: 'Business transaction history',
              icon: <ReceiptLong />,
              action: () =>
                navigate('/business/transactions'),
            },
            {
              title: 'Statements',
              description: 'Business account statements',
              icon: <Description />,
              action: () =>
                navigate('/business/statements'),
            },
            {
              title: 'Staff & Access',
              description: 'Manage business users',
              icon: <People />,
              action: () =>
                navigate('/business/staff'),
            },
            {
              title: 'Business Settings',
              description: 'Manage business information',
              icon: <Settings />,
              action: () =>
                navigate('/business/settings'),
            },
            {
              title: 'Security',
              description: 'Business account security',
              icon: <Security />,
              action: () =>
                navigate('/business/security'),
            },
          ].map((item) => (
            <Grid
              item
              xs={6}
              sm={4}
              md={2}
              key={item.title}
            >
              <Card
                onClick={() => {
                  if (isActive) {
                    item.action();
                  }
                }}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  cursor: isActive
                    ? 'pointer'
                    : 'not-allowed',
                  opacity: isActive ? 1 : 0.55,
                  border: '1px solid #E1EEE5',
                  transition: '0.2s',
                  '&:hover': isActive
                    ? {
                        transform: 'translateY(-4px)',
                        boxShadow:
                          '0 8px 24px rgba(8,122,67,0.12)',
                      }
                    : {},
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

        {/* RECENT TRANSACTIONS */}

        <Card
          sx={{
            mt: 4,
            borderRadius: 4,
            border: '1px solid #E1EEE5',
          }}
        >
          <CardContent sx={{ p: 3 }}>
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
                  Recent Business Transactions
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Your business account activity
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
                  Your business transactions will appear here
                  when available.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {transactions.slice(0, 10).map((tx) => (
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
                              label={tx.status.replace(/_/g, ' ')}
                              color={getStatusColor(tx.status)}
                            />
                          </Box>
                        )}
                      </Box>

                      <Typography
                        fontWeight={800}
                        sx={{
                          whiteSpace: 'nowrap',
                          color: GREEN,
                        }}
                      >
                        {formatMoney(
                          tx.amount,
                          tx.currency || currency
                        )}
                      </Typography>
                    </Stack>

                    <Divider sx={{ mt: 2 }} />
                  </Box>
                ))}
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
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default BusinessDashboard;
