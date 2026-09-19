import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface PendingTransaction {
  id: string;
  reference: string;
  network: string;
  phone_number: string | null;
  amount: number;
  currency: string;
  status: string;
  provider_request_id: string | null;
  provider_reference: string | null;
  provider_response_exists: boolean;
  created_at: string;
}

const AirtimeReconciliation: React.FC = () => {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPendingTransactions = async () => {
      try {
        setLoading(true);
        setError('');

        const token =
          localStorage.getItem('zenimonies_token') ||
          localStorage.getItem('accessToken') ||
          localStorage.getItem('token');

        if (!token) {
          setError('Your session has expired. Please sign in again.');
          return;
        }

        const response = await fetch(
          `${API_URL}/api/airtime/reconciliation/pending`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || 'Unable to load pending Airtime transactions.'
          );
        }

        setTransactions(data?.transactions || []);
      } catch (err: any) {
        console.error('Airtime reconciliation error:', err);
        setError(
          err?.message ||
            'Unable to load pending Airtime transactions.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPendingTransactions();
  }, []);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(Number(amount) || 0));
  };

  const formatDate = (date: string) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f8f6',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ color: '#176b45' }}
            >
              Airtime Reconciliation
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Temporary read-only diagnostic screen for pending Airtime
              transactions.
            </Typography>
          </Box>

          <Alert severity="warning">
            This page is temporary. It does not refund, delete, or modify
            any transaction.
          </Alert>

          {loading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <CircularProgress sx={{ color: '#176b45' }} />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {!loading && !error && transactions.length === 0 && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid #e1e8e4',
              }}
            >
              <CardContent>
                <Typography fontWeight={700}>
                  No pending Airtime transactions found.
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  There are currently no pending Airtime transactions
                  belonging to this account.
                </Typography>
              </CardContent>
            </Card>
          )}

          {!loading &&
            !error &&
            transactions.map((transaction) => (
              <Card
                key={transaction.id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid #e1e8e4',
                  backgroundColor: '#ffffff',
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight={800}
                        >
                          {transaction.network || 'Unknown Network'}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {transaction.phone_number || 'Phone unavailable'}
                        </Typography>
                      </Box>

                      <Chip
                        label={transaction.status}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </Box>

                    <Divider />

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Amount
                      </Typography>

                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ color: '#176b45' }}
                      >
                        {formatAmount(
                          transaction.amount,
                          transaction.currency
                        )}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Zenimonies Reference
                      </Typography>

                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          wordBreak: 'break-all',
                        }}
                      >
                        {transaction.reference}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        VTpass Request ID
                      </Typography>

                      {transaction.provider_request_id ? (
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            color: '#176b45',
                            wordBreak: 'break-all',
                          }}
                        >
                          {transaction.provider_request_id}
                        </Typography>
                      ) : (
                        <Chip
                          label="MISSING"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Provider Reference
                      </Typography>

                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          wordBreak: 'break-all',
                        }}
                      >
                        {transaction.provider_reference || 'None'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Provider Response
                      </Typography>

                      <Chip
                        label={
                          transaction.provider_response_exists
                            ? 'Saved'
                            : 'Not saved'
                        }
                        size="small"
                        color={
                          transaction.provider_response_exists
                            ? 'success'
                            : 'default'
                        }
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Created
                      </Typography>

                      <Typography
                        variant="body2"
                        fontWeight={600}
                      >
                        {formatDate(transaction.created_at)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
        </Stack>
      </Container>
    </Box>
  );
};

export default AirtimeReconciliation;
