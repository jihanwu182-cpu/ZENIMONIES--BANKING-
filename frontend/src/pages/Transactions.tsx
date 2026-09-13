import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Stack,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
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

  useEffect(() => {
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

    loadTransactions();
  }, []);

  const formatAmount = (amount: number, currency?: string) => {
    const value = Number(amount || 0);

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const isCredit = (type: string) => {
    const value = type.toLowerCase();

    return (
      value.includes('deposit') ||
      value.includes('credit') ||
      value.includes('received')
    );
  };

  const getStatusColor = (
    status: string
  ): 'success' | 'warning' | 'error' | 'default' => {
    const value = status.toLowerCase();

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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f5f7f6',
        pb: 5,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: '#0b7a4b',
          color: '#fff',
          px: 2,
          py: 2,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="sm">
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <IconButton
              onClick={() => navigate(-1)}
              sx={{ color: '#fff' }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Typography
              variant="h6"
              sx={{ fontWeight: 700 }}
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
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <CircularProgress sx={{ color: '#0b7a4b' }} />
          </Box>
        ) : error ? (
          <Alert severity="error">
            {error}
          </Alert>
        ) : transactions.length === 0 ? (
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
            }}
          >
            <CardContent sx={{ py: 6 }}>
              <Typography
                align="center"
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                No transactions yet
              </Typography>

              <Typography
                align="center"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Your deposits, transfers and other
                account activity will appear here.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Card
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              {transactions.map((transaction, index) => {
                const credit = isCredit(transaction.type);

                return (
                  <Box key={transaction.id}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ p: 2 }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: credit
                            ? '#e8f7ef'
                            : '#fff0f0',
                        }}
                      >
                        {credit ? (
                          <ArrowDownwardIcon
                            sx={{ color: '#0b7a4b' }}
                          />
                        ) : (
                          <ArrowUpwardIcon
                            sx={{ color: '#d32f2f' }}
                          />
                        )}
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            textTransform: 'capitalize',
                          }}
                        >
                          {transaction.description ||
                            transaction.type ||
                            'Transaction'}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.3 }}
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
                              wordBreak: 'break-all',
                            }}
                          >
                            Ref: {transaction.reference}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: credit
                              ? '#0b7a4b'
                              : '#d32f2f',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {credit ? '+' : '-'}
                          {formatAmount(
                            transaction.amount,
                            transaction.currency
                          )}
                        </Typography>

                        <Chip
                          label={transaction.status}
                          color={getStatusColor(
                            transaction.status
                          )}
                          size="small"
                          sx={{
                            mt: 0.7,
                            textTransform: 'capitalize',
                          }}
                        />
                      </Box>
                    </Stack>

                    {index <
                      transactions.length - 1 && (
                      <Divider />
                    )}
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default Transactions;
