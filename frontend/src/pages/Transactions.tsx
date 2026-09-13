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
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Transaction {
  id: string | number;
  type: string;
  amount: number;
  currency?: string;
  reference?: string;
  description?: string;
  status: string;
  created_at?: string;

  recipient_name?: string;
  recipient_account?: string;
  recipient_bank?: string;

  sender_name?: string;
  sender_account?: string;

  balance_before?: number;
  balance_after?: number;
}

const API_URL =
  'https://zenimonies-banking.onrender.com';

const Transactions: React.FC = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const getToken = () => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token')
    );
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const token = getToken();

      if (!token) {
        navigate('/login');
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

      const data = response.data;

      if (Array.isArray(data)) {
        setTransactions(data);
      } else if (
        Array.isArray(data?.transactions)
      ) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      console.error(
        'Failed to load transactions:',
        err
      );

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
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
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

  const getTransactionTitle = (
    transaction: Transaction
  ) => {
    if (transaction.description) {
      return transaction.description;
    }

    return String(
      transaction.type || 'Transaction'
    )
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const isCredit = (
    transaction: Transaction
  ) => {
    const type = String(
      transaction.type || ''
    ).toLowerCase();

    const description = String(
      transaction.description || ''
    ).toLowerCase();

    return (
      type.includes('deposit') ||
      type.includes('credit') ||
      type.includes('funding') ||
      type.includes('airtime_refund') ||
      description.includes('deposit') ||
      description.includes('credit')
    );
  };

  const getStatusColor = (
    status: string
  ) => {
    const normalized = String(
      status || ''
    ).toLowerCase();

    if (
      normalized === 'completed' ||
      normalized === 'success' ||
      normalized === 'successful'
    ) {
      return 'success';
    }

    if (
      normalized === 'failed' ||
      normalized === 'cancelled' ||
      normalized === 'canceled'
    ) {
      return 'error';
    }

    return 'warning';
  };

  const handleViewReceipt = (
    transaction: Transaction
  ) => {
    navigate('/transaction-receipt', {
      state: {
        transaction,
      },
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f7f6',
        py: 3,
        pb: 6,
      }}
    >
      <Container maxWidth="md">
        {/* HEADER */}

        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          justifyContent="space-between"
          alignItems={{
            xs: 'stretch',
            sm: 'center',
          }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: '#063b2d',
              }}
            >
              Transaction History
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              View your recent Zenimonies
              transactions and receipts.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={loadTransactions}
            disabled={loading}
            sx={{
              borderColor: '#087a4b',
              color: '#087a4b',
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            Refresh Transactions
          </Button>
        </Stack>

        {/* ERROR */}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        {/* LOADING */}

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <CircularProgress
              sx={{ color: '#087a4b' }}
            />
          </Box>
        ) : transactions.length === 0 ? (
          /* EMPTY */

          <Card
            sx={{
              borderRadius: 3,
              boxShadow:
                '0 8px 25px rgba(0,0,0,0.06)',
            }}
          >
            <CardContent
              sx={{
                textAlign: 'center',
                py: 6,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: '#063b2d',
                  mb: 1,
                }}
              >
                No transactions yet
              </Typography>

              <Typography
                color="text.secondary"
              >
                Your transactions will appear
                here once you make or receive a
                payment.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          /* TRANSACTIONS */

          <Stack spacing={2}>
            {transactions.map(
              (transaction) => {
                const credit =
                  isCredit(transaction);

                return (
                  <Card
                    key={String(
                      transaction.id
                    )}
                    sx={{
                      borderRadius: 3,
                      boxShadow:
                        '0 6px 22px rgba(0,0,0,0.06)',
                    }}
                  >
                    <CardContent>
                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        {/* LEFT */}

                        <Box
                          sx={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            flexWrap="wrap"
                          >
                            <Typography
                              sx={{
                                fontWeight: 800,
                                color:
                                  '#172b22',
                              }}
                            >
                              {getTransactionTitle(
                                transaction
                              )}
                            </Typography>

                            <Chip
                              label={
                                transaction.status ||
                                'Processing'
                              }
                              size="small"
                              color={
                                getStatusColor(
                                  transaction.status
                                ) as any
                              }
                              sx={{
                                fontWeight: 700,
                              }}
                            />
                          </Stack>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 0.7,
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
                                display: 'block',
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

                          {transaction.recipient_name && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.7,
                                fontWeight: 600,
                              }}
                            >
                              Recipient:{' '}
                              {
                                transaction.recipient_name
                              }
                            </Typography>
                          )}

                          {transaction.recipient_bank && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Bank:{' '}
                              {
                                transaction.recipient_bank
                              }
                            </Typography>
                          )}
                        </Box>

                        {/* RIGHT */}

                        <Box
                          sx={{
                            textAlign: {
                              xs: 'left',
                              sm: 'right',
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 20,
                              fontWeight: 900,
                              color: credit
                                ? '#087a4b'
                                : '#172b22',
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

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {
                              transaction.currency
                            }
                          </Typography>
                        </Box>
                      </Stack>

                      <Divider
                        sx={{ my: 2 }}
                      />

                      {/* RECEIPT BUTTON */}

                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() =>
                          handleViewReceipt(
                            transaction
                          )
                        }
                        sx={{
                          borderColor:
                            '#087a4b',
                          color: '#087a4b',
                          borderRadius: 2,
                          fontWeight: 800,
                          py: 1.2,
                          '&:hover': {
                            borderColor:
                              '#06663e',
                            backgroundColor:
                              '#eaf7f0',
                          },
                        }}
                      >
                        View Transaction Receipt
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
};

export default Transactions;
