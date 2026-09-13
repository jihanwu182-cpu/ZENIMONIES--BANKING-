import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
  Alert,
  Chip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface Transaction {
  id: string | number;
  type: string;
  amount: number;
  currency?: string;
  reference?: string;
  description?: string;
  status: string;
  created_at?: string;
}

const Transactions: React.FC = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const token =
        localStorage.getItem('zenimonies_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('access_token');

      if (!token) {
        setError('Please log in to view your transaction history.');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/account/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setTransactions(response.data.transactions || []);
      } else {
        setError(
          response.data?.message ||
            'Unable to load transaction history.'
        );
      }
    } catch (err: any) {
      console.error('Transaction history error:', err);

      setError(
        err?.response?.data?.message ||
          'Unable to load transaction history.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const formatAmount = (
    amount: number,
    currency?: string
  ) => {
    const value = Number(amount || 0);

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return 'Date unavailable';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getTransactionType = (
    transaction: Transaction
  ) => {
    const type = String(
      transaction.type || ''
    ).toLowerCase();

    const description = String(
      transaction.description || ''
    ).toLowerCase();

    const combined =
      `${type} ${description}`;

    if (
      combined.includes('deposit') ||
      combined.includes('credit') ||
      combined.includes('received') ||
      combined.includes('funding') ||
      combined.includes('paystack')
    ) {
      return 'credit';
    }

    return 'debit';
  };

  const getStatusColor = (
    status: string
  ): 'success' | 'warning' | 'error' | 'default' => {
    const value = String(
      status || ''
    ).toLowerCase();

    if (
      value === 'completed' ||
      value === 'success' ||
      value === 'successful'
    ) {
      return 'success';
    }

    if (
      value === 'pending' ||
      value === 'processing'
    ) {
      return 'warning';
    }

    if (
      value === 'failed' ||
      value === 'cancelled' ||
      value === 'canceled'
    ) {
      return 'error';
    }

    return 'default';
  };

  const getTransactionTitle = (
    transaction: Transaction
  ) => {
    if (transaction.description) {
      return transaction.description;
    }

    if (transaction.type) {
      return transaction.type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
    }

    return 'Transaction';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f7f6',
        pb: 6,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          backgroundColor: '#087a4b',
          color: '#ffffff',
          py: 2,
          px: 2,
          boxShadow:
            '0 2px 10px rgba(0,0,0,0.12)',
        }}
      >
        <Container maxWidth="sm">
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <Button
              onClick={() => navigate(-1)}
              sx={{
                color: '#ffffff',
                minWidth: 40,
                fontSize: 28,
                fontWeight: 400,
                lineHeight: 1,
                p: 0,
              }}
            >
              ←
            </Button>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
              Transaction History
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="sm"
        sx={{ mt: 3 }}
      >
        {/* LOADING */}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 8,
            }}
          >
            <CircularProgress
              sx={{ color: '#087a4b' }}
            />
          </Box>
        )}

        {/* ERROR */}
        {!loading && error && (
          <Box>
            <Alert
              severity="error"
              sx={{
                borderRadius: 2,
                mb: 2,
              }}
            >
              {error}
            </Alert>

            <Button
              variant="contained"
              onClick={loadTransactions}
              sx={{
                backgroundColor: '#087a4b',
                '&:hover': {
                  backgroundColor: '#06663e',
                },
              }}
            >
              Try Again
            </Button>
          </Box>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          transactions.length === 0 && (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow:
                  '0 4px 18px rgba(0,0,0,0.06)',
              }}
            >
              <CardContent
                sx={{
                  py: 7,
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: '#e8f5ef',
                    color: '#087a4b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    fontSize: 30,
                  }}
                >
                  ₦
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  No transactions yet
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    lineHeight: 1.6,
                  }}
                >
                  Your deposits, transfers and
                  other account activity will
                  appear here.
                </Typography>
              </CardContent>
            </Card>
          )}

        {/* TRANSACTIONS */}
        {!loading &&
          !error &&
          transactions.length > 0 && (
            <Card
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow:
                  '0 4px 18px rgba(0,0,0,0.06)',
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                }}
              >
                {transactions.map(
                  (
                    transaction,
                    index
                  ) => {
                    const credit =
                      getTransactionType(
                        transaction
                      ) === 'credit';

                    return (
                      <Box
                        key={
                          transaction.id
                        }
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                          sx={{
                            p: 2,
                          }}
                        >
                          {/* TRANSACTION ICON */}
                          <Box
                            sx={{
                              width: 46,
                              height: 46,
                              minWidth: 46,
                              borderRadius:
                                '50%',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              backgroundColor:
                                credit
                                  ? '#e5f7ed'
                                  : '#fdeaea',
                              color: credit
                                ? '#087a4b'
                                : '#c62828',
                              fontSize: 22,
                              fontWeight: 700,
                            }}
                          >
                            {credit
                              ? '↓'
                              : '↑'}
                          </Box>

                          {/* DETAILS */}
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: 15,
                              }}
                            >
                              {getTransactionTitle(
                                transaction
                              )}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.4,
                              }}
                            >
                              {formatDate(
                                transaction.created_at
                              )}
                            </Typography>

                            {transaction.reference && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display:
                                    'block',
                                  mt: 0.5,
                                  wordBreak:
                                    'break-all',
                                }}
                              >
                                Ref:{' '}
                                {
                                  transaction.reference
                                }
                              </Typography>
                            )}
                          </Box>

                          {/* AMOUNT + STATUS */}
                          <Box
                            sx={{
                              textAlign:
                                'right',
                              minWidth:
                                110,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: 14,
                                color: credit
                                  ? '#087a4b'
                                  : '#c62828',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {credit
                                ? '+'
                                : '-'}
                              {formatAmount(
                                transaction.amount,
                                transaction.currency
                              )}
                            </Typography>

                            <Chip
                              label={
                                transaction.status ||
                                'unknown'
                              }
                              color={getStatusColor(
                                transaction.status
                              )}
                              size="small"
                              sx={{
                                mt: 0.7,
                                textTransform:
                                  'capitalize',
                                fontSize: 11,
                              }}
                            />
                          </Box>
                        </Stack>

                        {index <
                          transactions.length -
                            1 && (
                          <Divider />
                        )}
                      </Box>
                    );
                  }
                )}
              </CardContent>
            </Card>
          )}

        {/* REFRESH */}
        {!loading &&
          !error &&
          transactions.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              onClick={loadTransactions}
              sx={{
                mt: 2,
                borderColor: '#087a4b',
                color: '#087a4b',
                borderRadius: 2,
                fontWeight: 700,
                '&:hover': {
                  borderColor: '#06663e',
                  backgroundColor:
                    '#eaf7f0',
                },
              }}
            >
              Refresh Transactions
            </Button>
          )}
      </Container>
    </Box>
  );
};

export default Transactions;
