import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  MenuItem,
  Select,
  SelectChangeEvent,
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

  const [category, setCategory] =
    useState('all');

  const [statusFilter, setStatusFilter] =
    useState('all');

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

  const getType = (
    transaction: Transaction
  ) => {
    return String(
      transaction.type || ''
    ).toLowerCase();
  };

  const getDescription = (
    transaction: Transaction
  ) => {
    if (transaction.description) {
      return transaction.description;
    }

    const type = getType(transaction);

    if (
      type.includes('deposit') ||
      type.includes('funding')
    ) {
      return 'Account Funding';
    }

    if (
      type.includes('internal') ||
      type.includes('zenimonies')
    ) {
      return 'Zenimonies Transfer';
    }

    if (
      type.includes('bank') ||
      type.includes('transfer')
    ) {
      return 'Bank Transfer';
    }

    if (type.includes('airtime')) {
      return 'Airtime Purchase';
    }

    if (type.includes('data')) {
      return 'Mobile Data';
    }

    if (type.includes('bill')) {
      return 'Bill Payment';
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
    const type = getType(transaction);

    const description = String(
      transaction.description || ''
    ).toLowerCase();

    return (
      type.includes('deposit') ||
      type.includes('credit') ||
      type.includes('funding') ||
      type.includes('refund') ||
      description.includes('deposit') ||
      description.includes('credit') ||
      description.includes('funding') ||
      description.includes('refund')
    );
  };

  const getCategory = (
    transaction: Transaction
  ) => {
    const type = getType(transaction);
    const description = String(
      transaction.description || ''
    ).toLowerCase();

    if (
      type.includes('deposit') ||
      type.includes('funding') ||
      description.includes('deposit') ||
      description.includes('funding')
    ) {
      return 'deposits';
    }

    if (
      type.includes('transfer') ||
      type.includes('bank') ||
      type.includes('internal') ||
      type.includes('zenimonies')
    ) {
      return 'transfers';
    }

    if (
      type.includes('bill') ||
      description.includes('bill')
    ) {
      return 'bills';
    }

    if (
      type.includes('airtime') ||
      type.includes('data') ||
      description.includes('airtime') ||
      description.includes('data')
    ) {
      return 'airtime';
    }

    return 'other';
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return 'Date unavailable';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return 'Date unavailable';
    }

    return parsed.toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(
      (transaction) => {
        const matchesCategory =
          category === 'all' ||
          getCategory(transaction) ===
            category;

        const transactionStatus =
          String(
            transaction.status || ''
          ).toLowerCase();

        const matchesStatus =
          statusFilter === 'all' ||
          transactionStatus ===
            statusFilter;

        return (
          matchesCategory &&
          matchesStatus
        );
      }
    );
  }, [
    transactions,
    category,
    statusFilter,
  ]);

  const moneyIn = useMemo(() => {
    return filteredTransactions
      .filter(isCredit)
      .reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0
      );
  }, [filteredTransactions]);

  const moneyOut = useMemo(() => {
    return filteredTransactions
      .filter(
        (transaction) =>
          !isCredit(transaction)
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0
      );
  }, [filteredTransactions]);

  const getIcon = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(transaction);

    if (category === 'deposits') {
      return '↓';
    }

    if (category === 'transfers') {
      return isCredit(transaction)
        ? '↓'
        : '↑';
    }

    if (category === 'airtime') {
      return '▣';
    }

    if (category === 'bills') {
      return '▤';
    }

    return isCredit(transaction)
      ? '↓'
      : '↑';
  };

  const getIconBackground = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(transaction);

    if (category === 'airtime') {
      return '#eaf4ff';
    }

    if (category === 'bills') {
      return '#fff1e8';
    }

    if (category === 'deposits') {
      return '#e7f8f1';
    }

    if (category === 'transfers') {
      return '#e9f8f3';
    }

    return '#f0edff';
  };

  const getIconColor = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(transaction);

    if (category === 'airtime') {
      return '#1683e8';
    }

    if (category === 'bills') {
      return '#f27b21';
    }

    if (category === 'deposits') {
      return '#087a4b';
    }

    if (category === 'transfers') {
      return '#087a4b';
    }

    return '#7456e8';
  };

  const getStatusStyle = (
    transactionStatus: string
  ) => {
    const status =
      String(
        transactionStatus || ''
      ).toLowerCase();

    if (
      status === 'completed' ||
      status === 'success' ||
      status === 'successful'
    ) {
      return {
        background: '#e4f8ee',
        color: '#07945c',
        label: 'Successful',
      };
    }

    if (
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'canceled'
    ) {
      return {
        background: '#fdecec',
        color: '#d93636',
        label: 'Failed',
      };
    }

    return {
      background: '#fff4dc',
      color: '#a66b00',
      label: 'Processing',
    };
  };

  const handleOpenReceipt = (
    transaction: Transaction
  ) => {
    navigate('/transaction-receipt', {
      state: {
        transaction,
      },
    });
  };

  const handleCategoryChange = (
    event: SelectChangeEvent
  ) => {
    setCategory(event.target.value);
  };

  const handleStatusChange = (
    event: SelectChangeEvent
  ) => {
    setStatusFilter(event.target.value);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f7f8fa',
        pb: 5,
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          backgroundColor: '#ffffff',
          pt: 2,
          pb: 2,
          borderBottom:
            '1px solid #edf0ef',
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            px: {
              xs: 2,
              sm: 3,
            },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Button
              onClick={() =>
                navigate(-1)
              }
              sx={{
                minWidth: 42,
                width: 42,
                height: 42,
                borderRadius: '50%',
                color: '#18231f',
                fontSize: 30,
                p: 0,
              }}
            >
              ‹
            </Button>

            <Typography
              sx={{
                fontSize: {
                  xs: 22,
                  sm: 26,
                },
                fontWeight: 800,
                color: '#18231f',
              }}
            >
              Transactions
            </Typography>

            <Button
              onClick={handlePrint}
              sx={{
                color: '#00a86b',
                fontSize: {
                  xs: 14,
                  sm: 16,
                },
                fontWeight: 700,
                textTransform:
                  'none',
              }}
            >
              Download
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="md"
        sx={{
          px: {
            xs: 2,
            sm: 3,
          },
          pt: 2,
        }}
      >
        {/* FILTERS */}

        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Select
            fullWidth
            value={category}
            onChange={
              handleCategoryChange
            }
            displayEmpty
            size="small"
            sx={{
              backgroundColor:
                '#ffffff',
              borderRadius: 3,
              height: 54,
              fontSize: 16,
              '& .MuiOutlinedInput-notchedOutline':
                {
                  border:
                    '1px solid #f0f1f3',
                },
            }}
          >
            <MenuItem value="all">
              All Categories
            </MenuItem>
            <MenuItem value="deposits">
              Deposits
            </MenuItem>
            <MenuItem value="transfers">
              Transfers
            </MenuItem>
            <MenuItem value="bills">
              Bills
            </MenuItem>
            <MenuItem value="airtime">
              Airtime & Data
            </MenuItem>
            <MenuItem value="other">
              Other
            </MenuItem>
          </Select>

          <Select
            fullWidth
            value={statusFilter}
            onChange={
              handleStatusChange
            }
            size="small"
            sx={{
              backgroundColor:
                '#ffffff',
              borderRadius: 3,
              height: 54,
              fontSize: 16,
              '& .MuiOutlinedInput-notchedOutline':
                {
                  border:
                    '1px solid #f0f1f3',
                },
            }}
          >
            <MenuItem value="all">
              All Status
            </MenuItem>
            <MenuItem value="completed">
              Successful
            </MenuItem>
            <MenuItem value="processing">
              Processing
            </MenuItem>
            <MenuItem value="pending">
              Pending
            </MenuItem>
            <MenuItem value="failed">
              Failed
            </MenuItem>
          </Select>
        </Stack>

        {/* MONTH SUMMARY */}

        <Card
          sx={{
            borderRadius: 4,
            mb: 2,
            boxShadow:
              '0 5px 20px rgba(21,39,32,0.05)',
            border:
              '1px solid #eef1ef',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2.2,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#18231f',
                  }}
                >
                  {new Date().toLocaleString(
                    'en-NG',
                    {
                      month: 'short',
                      year: 'numeric',
                    }
                  )}
                </Typography>

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ mt: 1 }}
                >
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: '#7b827f',
                    }}
                  >
                    In{' '}
                    <Box
                      component="span"
                      sx={{
                        color: '#18231f',
                        fontWeight: 700,
                      }}
                    >
                      {formatAmount(
                        moneyIn
                      )}
                    </Box>
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 14,
                      color: '#7b827f',
                    }}
                  >
                    Out{' '}
                    <Box
                      component="span"
                      sx={{
                        color: '#18231f',
                        fontWeight: 700,
                      }}
                    >
                      {formatAmount(
                        moneyOut
                      )}
                    </Box>
                  </Typography>
                </Stack>
              </Box>

              <Button
                sx={{
                  backgroundColor:
                    '#00b878',
                  color: '#ffffff',
                  borderRadius: 5,
                  px: 2.5,
                  py: 1.2,
                  fontWeight: 700,
                  textTransform:
                    'none',
                  '&:hover': {
                    backgroundColor:
                      '#009e68',
                  },
                }}
              >
                Analysis
              </Button>
            </Stack>
          </Box>
        </Card>

        {/* ERROR */}

        {error && (
          <Card
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 3,
              color: '#c62828',
            }}
          >
            <Typography>
              {error}
            </Typography>
          </Card>
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
              sx={{
                color: '#00a86b',
              }}
            />
          </Box>
        ) : filteredTransactions.length ===
          0 ? (
          <Card
            sx={{
              borderRadius: 4,
              p: 5,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              No transactions found
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Try changing your filters.
            </Typography>
          </Card>
        ) : (
          /* TRANSACTION LIST */

          <Card
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow:
                '0 5px 20px rgba(21,39,32,0.05)',
              border:
                '1px solid #eef1ef',
            }}
          >
            {filteredTransactions.map(
              (
                transaction,
                index
              ) => {
                const credit =
                  isCredit(
                    transaction
                  );

                const statusStyle =
                  getStatusStyle(
                    transaction.status
                  );

                return (
                  <Box
                    key={String(
                      transaction.id
                    )}
                    onClick={() =>
                      handleOpenReceipt(
                        transaction
                      )
                    }
                    sx={{
                      px: {
                        xs: 2,
                        sm: 2.5,
                      },
                      py: 2,
                      cursor: 'pointer',
                      transition:
                        'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor:
                          '#f8fbf9',
                      },
                      '&:active': {
                        backgroundColor:
                          '#eef8f3',
                      },
                      borderBottom:
                        index !==
                        filteredTransactions.length -
                          1
                          ? '1px solid #edf0ef'
                          : 'none',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                    >
                      {/* ICON */}

                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          minWidth: 52,
                          borderRadius:
                            '50%',
                          backgroundColor:
                            getIconBackground(
                              transaction
                            ),
                          color:
                            getIconColor(
                              transaction
                            ),
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          fontSize: 28,
                          fontWeight: 700,
                        }}
                      >
                        {getIcon(
                          transaction
                        )}
                      </Box>

                      {/* DETAILS */}

                      <Box
                        sx={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 16,
                            fontWeight: 700,
                            color:
                              '#202724',
                            whiteSpace:
                              'nowrap',
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            pr: 1,
                          }}
                        >
                          {getDescription(
                            transaction
                          )}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color:
                              '#8a928e',
                            mt: 0.5,
                          }}
                        >
                          {formatDate(
                            transaction.created_at
                          )}
                        </Typography>

                        {transaction.reference && (
                          <Typography
                            sx={{
                              fontSize: 11,
                              color:
                                '#9ba29f',
                              mt: 0.5,
                              whiteSpace:
                                'nowrap',
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                            }}
                          >
                            Ref:{' '}
                            {
                              transaction.reference
                            }
                          </Typography>
                        )}
                      </Box>

                      {/* AMOUNT */}

                      <Box
                        sx={{
                          minWidth:
                            {
                              xs: 105,
                              sm: 135,
                            },
                          textAlign:
                            'right',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: {
                              xs: 16,
                              sm: 18,
                            },
                            fontWeight: 800,
                            color: credit
                              ? '#00a86b'
                              : '#202724',
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

                        <Box
                          sx={{
                            display:
                              'inline-block',
                            mt: 0.7,
                            px: 1,
                            py: 0.35,
                            borderRadius:
                              1.5,
                            backgroundColor:
                              statusStyle.background,
                            color:
                              statusStyle.color,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {statusStyle.label}
                        </Box>
                      </Box>

                      {/* ARROW */}

                      <Typography
                        sx={{
                          color: '#18231f',
                          fontSize: 27,
                          fontWeight: 300,
                          ml: 0.2,
                        }}
                      >
                        ›
                      </Typography>
                    </Stack>
                  </Box>
                );
              }
            )}
          </Card>
        )}

        {/* REFRESH */}

        {!loading &&
          transactions.length > 0 && (
            <Button
              fullWidth
              onClick={loadTransactions}
              sx={{
                mt: 2,
                color: '#087a4b',
                fontWeight: 700,
                textTransform:
                  'none',
              }}
            >
              Refresh transactions
            </Button>
          )}
      </Container>

      {/* PRINT */}

      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
            }

            button {
              display: none !important;
            }

            .MuiCard-root {
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default Transactions;
