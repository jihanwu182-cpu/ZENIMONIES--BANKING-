
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowBack,
  ArrowDownward,
  ArrowUpward,
  Refresh,
  Search,
  ReceiptLong,
} from '@mui/icons-material';

import { useNavigate, useParams } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// BUSINESS TRANSACTIONS
// Business transactions are fetched using the business ID.
// ============================================================

// IMPORTANT:
// Keep this API_BASE identical to the API_BASE used in
// BusinessDashboard.tsx.
//
// If your BusinessDashboard.tsx uses a different API URL,
// replace the value below with that same URL.

const API_BASE = (
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api'
).replace(/\/$/, '');

const PAGE_SIZE = 20;

// ============================================================
// TYPES
// ============================================================

interface BusinessTransaction {
  id?: string;
  transaction_id?: string;
  reference?: string;
  transaction_reference?: string;

  type?: string;
  transaction_type?: string;
  description?: string;
  narration?: string;

  amount?: number | string;
  currency?: string;

  status?: string;
  created_at?: string;
  transaction_date?: string;
  updated_at?: string;

  direction?: string;
  recipient_name?: string;
  sender_name?: string;
  account_number?: string;

  [key: string]: unknown;
}

interface Pagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  total_pages?: number;
  hasNextPage?: boolean;
  has_next_page?: boolean;
}

interface TransactionResponse {
  success?: boolean;
  message?: string;

  transactions?: BusinessTransaction[];
  data?: {
    transactions?: BusinessTransaction[];
    pagination?: Pagination;
  };

  pagination?: Pagination;
}

// ============================================================
// HELPERS
// ============================================================

const getTransactionId = (
  transaction: BusinessTransaction,
): string => {
  return String(
    transaction.id ||
      transaction.transaction_id ||
      transaction.reference ||
      transaction.transaction_reference ||
      '',
  );
};

const getTransactionType = (
  transaction: BusinessTransaction,
): string => {
  return String(
    transaction.transaction_type ||
      transaction.type ||
      'Transaction',
  );
};

const getTransactionDescription = (
  transaction: BusinessTransaction,
): string => {
  return String(
    transaction.description ||
      transaction.narration ||
      getTransactionType(transaction).replace(/_/g, ' '),
  );
};

const getTransactionStatus = (
  transaction: BusinessTransaction,
): string => {
  return String(transaction.status || 'unknown').toLowerCase();
};

const getTransactionDate = (
  transaction: BusinessTransaction,
): string => {
  return String(
    transaction.created_at ||
      transaction.transaction_date ||
      transaction.updated_at ||
      '',
  );
};

const getTransactionAmount = (
  transaction: BusinessTransaction,
): number => {
  const rawAmount = transaction.amount;

  if (typeof rawAmount === 'number') {
    return Number.isFinite(rawAmount) ? rawAmount : 0;
  }

  if (typeof rawAmount === 'string') {
    const parsed = Number(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getTransactionCurrency = (
  transaction: BusinessTransaction,
): string => {
  const currency = String(transaction.currency || 'NGN').toUpperCase();

  return currency;
};

const formatMoney = (
  amount: number,
  currency: string,
): string => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (dateValue: string): string => {
  if (!dateValue) {
    return 'Date unavailable';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLabel = (value: string): string => {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isCreditTransaction = (
  transaction: BusinessTransaction,
): boolean => {
  const type = getTransactionType(transaction).toLowerCase();

  const direction = String(
    transaction.direction || '',
  ).toLowerCase();

  const creditTypes = [
    'deposit',
    'credit',
    'refund',
    'transfer_refund',
    'internal_transfer_received',
    'airtime_refund',
    'data_refund',
    'electricity_refund',
    'bill_refund',
    'cashback',
    'received',
  ];

  if (direction === 'credit' || direction === 'in') {
    return true;
  }

  if (direction === 'debit' || direction === 'out') {
    return false;
  }

  return creditTypes.some((creditType) =>
    type.includes(creditType),
  );
};

const getStatusColor = (
  status: string,
): 'success' | 'warning' | 'error' | 'default' | 'info' => {
  switch (status.toLowerCase()) {
    case 'successful':
    case 'success':
    case 'completed':
      return 'success';

    case 'pending':
    case 'processing':
    case 'initiated':
      return 'warning';

    case 'failed':
    case 'reversed':
    case 'cancelled':
    case 'canceled':
      return 'error';

    default:
      return 'default';
  }
};

// ============================================================
// COMPONENT
// ============================================================

const BusinessTransactions: React.FC = () => {
  const navigate = useNavigate();
  const { id: businessId } = useParams<{ id: string }>();

  const [transactions, setTransactions] = useState<
    BusinessTransaction[]
  >([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [error, setError] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [page, setPage] = useState<number>(1);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
  });

  // ----------------------------------------------------------
  // AUTHENTICATION TOKEN
  // ----------------------------------------------------------

  const getToken = (): string | null => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token')
    );
  };

  // ----------------------------------------------------------
  // FETCH BUSINESS TRANSACTIONS
  // ----------------------------------------------------------

  const fetchTransactions = useCallback(
    async (showRefresh = false) => {
      if (!businessId) {
        setError('Business account ID is missing.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const token = getToken();

      if (!token) {
        setError('Your session has expired. Please sign in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await fetch(
          `${API_BASE}/businesses/${encodeURIComponent(
            businessId,
          )}/transactions?page=${page}&limit=${PAGE_SIZE}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        const result: TransactionResponse = await response
          .json()
          .catch(() => ({} as TransactionResponse));

        if (response.status === 401) {
          setError(
            'Your session has expired. Please sign in again.',
          );
          return;
        }

        if (response.status === 403) {
          setError(
            'You do not have permission to view transactions for this business.',
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Unable to load business transactions.',
          );
        }

        // Supports the response structures already used by
        // BusinessDashboard.tsx:
        // { transactions: [...] }
        // { data: { transactions: [...] } }
        // { data: { transactions: [...], pagination: {...} } }

        const transactionList =
          result.transactions ||
          result.data?.transactions ||
          [];

        const paginationData =
          result.pagination ||
          result.data?.pagination ||
          {};

        setTransactions(
          Array.isArray(transactionList)
            ? transactionList
            : [],
        );

        setPagination({
          ...paginationData,
          page:
            Number(paginationData.page) ||
            page,
          limit:
            Number(paginationData.limit) ||
            PAGE_SIZE,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred.';

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId, page],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ----------------------------------------------------------
  // SEARCH AND STATUS FILTER
  // ----------------------------------------------------------

  // Search and status filtering apply to the transactions
  // currently loaded from the backend page.
  //
  // This does not claim to search every historical transaction
  // in the database.

  const filteredTransactions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const status = getTransactionStatus(transaction);

      const matchesStatus =
        statusFilter === 'all' ||
        status === statusFilter;

      const searchableText = [
        getTransactionId(transaction),
        getTransactionType(transaction),
        getTransactionDescription(transaction),
        transaction.recipient_name || '',
        transaction.sender_name || '',
        transaction.account_number || '',
        transaction.amount || '',
        transaction.currency || '',
        status,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [transactions, searchTerm, statusFilter]);

  // ----------------------------------------------------------
  // PAGINATION
  // ----------------------------------------------------------

  const totalPages = Math.max(
    1,
    Number(
      pagination.totalPages ||
        pagination.total_pages ||
        1,
    ),
  );

  const hasNextPage =
    typeof pagination.hasNextPage === 'boolean'
      ? pagination.hasNextPage
      : typeof pagination.has_next_page === 'boolean'
        ? pagination.has_next_page
        : page < totalPages;

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((currentPage) => currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setPage((currentPage) => currentPage + 1);
    }
  };

  // ----------------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------------

  const goBack = () => {
    if (businessId) {
      navigate(
        `/business/dashboard/${encodeURIComponent(
          businessId,
        )}`,
      );
    } else {
      navigate('/business');
    }
  };

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  const successfulCount = transactions.filter((transaction) => {
    const status = getTransactionStatus(transaction);

    return [
      'successful',
      'success',
      'completed',
    ].includes(status);
  }).length;

  const pendingCount = transactions.filter((transaction) => {
    const status = getTransactionStatus(transaction);

    return [
      'pending',
      'processing',
      'initiated',
    ].includes(status);
  }).length;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f7fb',
        pb: 4,
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          bgcolor: '#073b32',
          color: '#fff',
          px: { xs: 2, sm: 3 },
          pt: 2,
          pb: 3,
          borderRadius: {
            xs: '0 0 24px 24px',
            sm: '0 0 30px 30px',
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <IconButton
              onClick={goBack}
              aria-label="Back to business dashboard"
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.12)',
              }}
            >
              <ArrowBack />
            </IconButton>

            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
              >
                Transactions
              </Typography>

              <Typography
                variant="body2"
                sx={{ opacity: 0.8 }}
              >
                Business account activity
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={() => fetchTransactions(true)}
            disabled={refreshing || loading}
            aria-label="Refresh transactions"
            sx={{
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.12)',
            }}
          >
            {refreshing ? (
              <CircularProgress
                size={22}
                sx={{ color: '#fff' }}
              />
            ) : (
              <Refresh />
            )}
          </IconButton>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            mt: 2,
            opacity: 0.85,
          }}
        >
          Review transfers, payments, credits and other
          transactions made through your business account.
        </Typography>
      </Box>

      <Box
        sx={{
          maxWidth: 1000,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          mt: 3,
        }}
      >
        {/* ERROR */}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 2,
            }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => fetchTransactions(true)}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* SUMMARY CARDS */}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr 1fr',
              sm: 'repeat(3, 1fr)',
            },
            gap: 1.5,
            mb: 3,
          }}
        >
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid #e6eaf0',
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <ReceiptLong
                  sx={{ color: '#087f5b' }}
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Loaded
                </Typography>
              </Stack>

              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ mt: 1 }}
              >
                {loading ? '—' : transactions.length}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                This page
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid #e6eaf0',
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <ArrowUpward
                  sx={{ color: '#087f5b' }}
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Successful
                </Typography>
              </Stack>

              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ mt: 1 }}
              >
                {loading ? '—' : successfulCount}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                This page
              </Typography>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              gridColumn: {
                xs: '1 / -1',
                sm: 'auto',
              },
              borderRadius: 3,
              border: '1px solid #e6eaf0',
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <ReceiptLong
                  sx={{ color: '#ed9b16' }}
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Pending
                </Typography>
              </Stack>

              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ mt: 1 }}
              >
                {loading ? '—' : pendingCount}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                This page
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* SEARCH AND FILTER */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e6eaf0',
            mb: 2,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ mb: 2 }}
            >
              Find a transaction
            </Typography>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={2}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search reference, description..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                sx={{
                  minWidth: {
                    xs: '100%',
                    sm: 180,
                  },
                }}
              >
                <MenuItem value="all">
                  All statuses
                </MenuItem>

                <MenuItem value="successful">
                  Successful
                </MenuItem>

                <MenuItem value="completed">
                  Completed
                </MenuItem>

                <MenuItem value="pending">
                  Pending
                </MenuItem>

                <MenuItem value="processing">
                  Processing
                </MenuItem>

                <MenuItem value="failed">
                  Failed
                </MenuItem>

                <MenuItem value="reversed">
                  Reversed
                </MenuItem>

                <MenuItem value="cancelled">
                  Cancelled
                </MenuItem>
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {/* TRANSACTION LIST */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e6eaf0',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography
              variant="h6"
              fontWeight={800}
            >
              Business activity
            </Typography>

            <Chip
              label={`${filteredTransactions.length} shown`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>

          <Divider />

          {loading ? (
            <Box
              sx={{
                py: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <CircularProgress />

              <Typography
                color="text.secondary"
                variant="body2"
              >
                Loading business transactions...
              </Typography>
            </Box>
          ) : filteredTransactions.length === 0 ? (
            <Box
              sx={{
                py: 7,
                px: 3,
                textAlign: 'center',
              }}
            >
              <ReceiptLong
                sx={{
                  fontSize: 55,
                  color: '#9ca3af',
                  mb: 1,
                }}
              />

              <Typography
                variant="h6"
                fontWeight={700}
              >
                No transactions found
              </Typography>

              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ mt: 1 }}
              >
                {transactions.length === 0
                  ? 'Your business transactions will appear here when available.'
                  : 'Try changing your search or status filter.'}
              </Typography>

              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  sx={{ mt: 2 }}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {filteredTransactions.map(
                (transaction, index) => {
                  const credit =
                    isCreditTransaction(transaction);

                  const amount =
                    getTransactionAmount(transaction);

                  const currency =
                    getTransactionCurrency(transaction);

                  const status =
                    getTransactionStatus(transaction);

                  const transactionId =
                    getTransactionId(transaction);

                  return (
                    <Box
                      key={
                        transactionId ||
                        `${getTransactionDate(transaction)}-${index}`
                      }
                      sx={{
                        px: 2,
                        py: 2,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                      }}
                    >
                      {/* DIRECTION ICON */}

                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          minWidth: 44,
                          borderRadius: 2.5,
                          bgcolor: credit
                            ? '#e6f4ed'
                            : '#fff0ee',
                          color: credit
                            ? '#087f5b'
                            : '#c0392b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {credit ? (
                          <ArrowDownward />
                        ) : (
                          <ArrowUpward />
                        )}
                      </Box>

                      {/* DETAILS */}

                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          fontWeight={700}
                          sx={{
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {getTransactionDescription(
                            transaction,
                          )}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.5 }}
                        >
                          {formatDate(
                            getTransactionDate(transaction),
                          )}
                        </Typography>

                        {transactionId && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{
                              mt: 0.5,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            Ref: {transactionId}
                          </Typography>
                        )}

                        {transaction.recipient_name && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            Recipient:{' '}
                            {transaction.recipient_name}
                          </Typography>
                        )}

                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={formatLabel(status)}
                            size="small"
                            color={getStatusColor(status)}
                            variant="outlined"
                          />
                        </Box>
                      </Box>

                      {/* AMOUNT */}

                      <Box
                        sx={{
                          textAlign: 'right',
                          minWidth: 95,
                        }}
                      >
                        <Typography
                          fontWeight={800}
                          color={
                            credit
                              ? 'success.main'
                              : 'text.primary'
                          }
                          sx={{
                            overflowWrap: 'anywhere',
                            fontSize: {
                              xs: '0.85rem',
                              sm: '1rem',
                            },
                          }}
                        >
                          {credit ? '+' : '-'}
                          {formatMoney(
                            Math.abs(amount),
                            currency,
                          )}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.5 }}
                        >
                          {formatLabel(
                            getTransactionType(transaction),
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  );
                },
              )}
            </Stack>
          )}

          {/* PAGINATION */}

          <Divider />

          <Box
            sx={{
              px: 2,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Page {page}
              {totalPages > 1
                ? ` of ${totalPages}`
                : ''}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
            >
              <Button
                variant="outlined"
                size="small"
                disabled={page <= 1 || loading}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>

              <Button
                variant="contained"
                size="small"
                disabled={!hasNextPage || loading}
                onClick={handleNextPage}
                sx={{
                  bgcolor: '#087f5b',
                  '&:hover': {
                    bgcolor: '#066548',
                  },
                }}
              >
                Next
              </Button>
            </Stack>
          </Box>
        </Card>

        {/* FOOTER */}

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          textAlign="center"
          sx={{ mt: 3, px: 2 }}
        >
          This page displays transactions returned for the
          selected business account.
        </Typography>
      </Box>
    </Box>
  );
};

export default BusinessTransactions;
