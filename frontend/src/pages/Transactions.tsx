import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  AccountBalanceWalletRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CheckCircleRounded,
  ChevronRightRounded,
  CloseRounded,
  ContentCopyRounded,
  DownloadRounded,
  ErrorRounded,
  FilterListRounded,
  ReceiptLongRounded,
  RefreshRounded,
  ScheduleRounded,
  SearchRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import axios from 'axios';


/*
 * ============================================================
 * TRANSACTION TYPE
 * ============================================================
 */

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

  recipient_phone?: string;

  recipient_account?: string;

  recipient_bank?: string;

  sender_name?: string;

  sender_phone?: string;

  sender_account?: string;

  balance_before?: number;

  balance_after?: number;

  transaction_fee?: number;

  total_debit?: number;
}


/*
 * ============================================================
 * VTpass diagnostic type
 * ============================================================
 */

interface RequeryDiagnostic {
  requestId?: string | null;

  errorCode?: string | null;

  httpStatus?: number | null;

  providerCode?: string | null;

  providerDescription?: string | null;
}


const API_URL =
  'https://zenimonies-banking.onrender.com';


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

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

  const [search, setSearch] =
    useState('');

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [requeryingReference, setRequeryingReference] =
    useState<string | null>(null);

  const [requeryMessage, setRequeryMessage] =
    useState('');

  /*
   * Temporary VTpass diagnostic state.
   */
  const [requeryDiagnostic, setRequeryDiagnostic] =
    useState<RequeryDiagnostic | null>(null);


  /*
   * ============================================================
   * AUTH TOKEN
   * ============================================================
   */

  const getToken = () => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token')
    );
  };


  /*
   * ============================================================
   * LOAD TRANSACTIONS
   * ============================================================
   */

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
        setTransactions(
          data.transactions
        );
      } else {
        setTransactions([]);
      }

    } catch (err: any) {
      console.error(
        'Failed to load transactions:',
        err
      );

      if (
        err?.response?.status === 401
      ) {
        localStorage.removeItem(
          'zenimonies_token'
        );

        localStorage.removeItem(
          'token'
        );

        localStorage.removeItem(
          'access_token'
        );

        navigate('/login');
        return;
      }

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


  /*
   * ============================================================
   * MONEY AMOUNT NORMALIZATION
   * ============================================================
   */

  const getAbsoluteAmount = (
    transaction: Transaction
  ) => {
    const value =
      Number(transaction.amount);

    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.abs(value);
  };


  /*
   * ============================================================
   * CURRENCY
   * ============================================================
   */

  const formatAmount = (
    amount: number,
    currency?: string
  ) => {
    const selectedCurrency =
      currency || 'NGN';

    const safeAmount =
      Math.abs(
        Number(amount || 0)
      );

    try {
      return new Intl.NumberFormat(
        selectedCurrency === 'ZAR'
          ? 'en-ZA'
          : 'en-NG',
        {
          style: 'currency',
          currency:
            selectedCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ).format(
        safeAmount
      );

    } catch {
      return `${selectedCurrency} ${safeAmount.toFixed(2)}`;
    }
  };


  /*
   * ============================================================
   * TYPE
   * ============================================================
   */

  const getType = (
    transaction: Transaction
  ) => {
    return String(
      transaction.type || ''
    ).toLowerCase();
  };


  /*
   * ============================================================
   * DESCRIPTION
   * ============================================================
   */

  const getDescription = (
    transaction: Transaction
  ) => {
    if (
      transaction.description &&
      transaction.description.trim()
    ) {
      return transaction.description;
    }

    const type =
      getType(transaction);

    if (
      type.includes('deposit') ||
      type.includes('funding')
    ) {
      return 'Account Funding';
    }

    if (
      type ===
        'internal_transfer_received' ||
      type.includes('received')
    ) {
      return 'Money Received';
    }

    if (
      type ===
        'internal_transfer'
    ) {
      return 'Zenimonies Transfer';
    }

    if (
      type.includes('transfer') ||
      type.includes('bank')
    ) {
      return 'Bank Transfer';
    }

    if (
      type.includes('airtime')
    ) {
      return 'Airtime Purchase';
    }

    if (
      type.includes('data')
    ) {
      return 'Mobile Data';
    }

    if (
      type.includes('bill')
    ) {
      return 'Bill Payment';
    }

    if (
      type.includes('refund') ||
      type.includes('reversal')
    ) {
      return 'Transaction Reversal';
    }

    return String(
      transaction.type ||
      'Transaction'
    )
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };


  /*
   * ============================================================
   * CREDIT / DEBIT
   * ============================================================
   */

  const isCredit = (
    transaction: Transaction
  ) => {
    const type =
      getType(transaction);

    const description =
      String(
        transaction.description ||
        ''
      ).toLowerCase();

    if (
      type ===
        'internal_transfer_received' ||
      type.includes('received')
    ) {
      return true;
    }

    if (
      type.includes('deposit') ||
      type.includes('funding') ||
      type.includes('credit')
    ) {
      return true;
    }

    if (
      type.includes('refund') ||
      type.includes('reversal')
    ) {
      return true;
    }

    if (
      description.includes('money received') ||
      description.includes('received') ||
      description.includes('deposit') ||
      description.includes('funding') ||
      description.includes('refund') ||
      description.includes('reversal')
    ) {
      return true;
    }

    return false;
  };


  /*
   * ============================================================
   * CATEGORY
   * ============================================================
   */

  const getCategory = (
    transaction: Transaction
  ) => {
    const type =
      getType(transaction);

    const description =
      String(
        transaction.description ||
        ''
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


  /*
   * ============================================================
   * DATE
   * ============================================================
   */

  const formatDate = (
    date?: string
  ) => {
    if (!date) {
      return 'Date unavailable';
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return 'Date unavailable';
    }

    return parsed.toLocaleString(
      'en-NG',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  };


  const getRelativeDate = (
    date?: string
  ) => {
    if (!date) {
      return '';
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '';
    }

    const today =
      new Date();

    const yesterday =
      new Date();

    yesterday.setDate(
      today.getDate() - 1
    );

    if (
      parsed.toDateString() ===
      today.toDateString()
    ) {
      return 'Today';
    }

    if (
      parsed.toDateString() ===
      yesterday.toDateString()
    ) {
      return 'Yesterday';
    }

    return parsed.toLocaleDateString(
      'en-NG',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };


  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const getStatusStyle = (
    statusValue: string
  ) => {
    const status =
      String(
        statusValue || ''
      ).toLowerCase();

    if (
      status === 'completed' ||
      status === 'success' ||
      status === 'successful' ||
      status === 'delivered'
    ) {
      return {
        background: '#E8F8F1',
        color: '#087A4B',
        label: 'Successful',
        icon: (
          <CheckCircleRounded
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };
    }

    if (
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'canceled' ||
      status === 'reversed'
    ) {
      return {
        background: '#FDECEC',
        color: '#D93636',
        label:
          status === 'reversed'
            ? 'Reversed'
            : 'Failed',
        icon: (
          <ErrorRounded
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };
    }

    return {
      background: '#FFF5DF',
      color: '#A66B00',
      label: 'Pending',
      icon: (
        <ScheduleRounded
          sx={{
            fontSize: 14,
          }}
        />
      ),
    };
  };


  /*
   * ============================================================
   * TRANSACTION ICON
   * ============================================================
   */

  const getTransactionIcon = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(transaction);

    if (
      category === 'deposits'
    ) {
      return (
        <ArrowDownwardRounded />
      );
    }

    if (
      category === 'transfers'
    ) {
      return isCredit(
        transaction
      ) ? (
        <ArrowDownwardRounded />
      ) : (
        <ArrowUpwardRounded />
      );
    }

    if (
      category === 'airtime'
    ) {
      return (
        <AccountBalanceWalletRounded />
      );
    }

    if (
      category === 'bills'
    ) {
      return (
        <ReceiptLongRounded />
      );
    }

    return isCredit(
      transaction
    ) ? (
      <ArrowDownwardRounded />
    ) : (
      <ArrowUpwardRounded />
    );
  };


  /*
   * ============================================================
   * ICON COLORS
   * ============================================================
   */

  const getIconColors = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(transaction);

    if (
      category === 'deposits'
    ) {
      return {
        background: '#E8F8F1',
        color: '#087A4B',
      };
    }

    if (
      category === 'transfers'
    ) {
      return {
        background: '#EAF7F3',
        color: '#008C68',
      };
    }

    if (
      category === 'airtime'
    ) {
      return {
        background: '#EAF4FF',
        color: '#1683E8',
      };
    }

    if (
      category === 'bills'
    ) {
      return {
        background: '#FFF1E8',
        color: '#F27B21',
      };
    }

    return {
      background: '#F0EDFF',
      color: '#7456E8',
    };
  };


  /*
   * ============================================================
   * FILTER
   * ============================================================
   */

  const filteredTransactions =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {

          const matchesCategory =
            category === 'all' ||
            getCategory(
              transaction
            ) === category;

          const rawStatus =
            String(
              transaction.status ||
              ''
            ).toLowerCase();

          const normalizedStatus =
            rawStatus === 'success' ||
            rawStatus === 'successful' ||
            rawStatus === 'delivered'
              ? 'completed'
              : rawStatus;

          const matchesStatus =
            statusFilter ===
              'all' ||
            normalizedStatus ===
              statusFilter;

          const searchableText = [
            getDescription(
              transaction
            ),
            transaction.type,
            transaction.reference,
            transaction.recipient_name,
            transaction.recipient_phone,
            transaction.recipient_account,
            transaction.recipient_bank,
            transaction.sender_name,
            transaction.sender_phone,
            transaction.sender_account,
            transaction.status,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          const matchesSearch =
            !searchValue ||
            searchableText.includes(
              searchValue
            );

          return (
            matchesCategory &&
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      transactions,
      category,
      statusFilter,
      search,
    ]);


  /*
   * ============================================================
   * MONEY IN
   * ============================================================
   */

  const moneyIn =
    useMemo(() => {
      return filteredTransactions
        .filter(
          isCredit
        )
        .reduce(
          (
            total,
            transaction
          ) =>
            total +
            getAbsoluteAmount(
              transaction
            ),
          0
        );
    }, [
      filteredTransactions,
    ]);


  /*
   * ============================================================
   * MONEY OUT
   * ============================================================
   */

  const moneyOut =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            !isCredit(
              transaction
            )
        )
        .reduce(
          (
            total,
            transaction
          ) =>
            total +
            getAbsoluteAmount(
              transaction
            ),
          0
        );
    }, [
      filteredTransactions,
    ]);


  /*
   * ============================================================
   * HANDLERS
   * ============================================================
   */

  const handleCategoryChange = (
    event: SelectChangeEvent
  ) => {
    setCategory(
      event.target.value
    );
  };


  const handleStatusChange = (
    event: SelectChangeEvent
  ) => {
    setStatusFilter(
      event.target.value
    );
  };


  const handleOpenTransaction = (
    transaction: Transaction
  ) => {
    setSelectedTransaction(
      transaction
    );

    setRequeryMessage('');
    setRequeryDiagnostic(null);
  };


  const handleCloseTransaction = () => {
    setSelectedTransaction(
      null
    );

    setRequeryMessage('');
    setRequeryDiagnostic(null);
  };


  /*
   * ============================================================
   * RECEIPT
   * ============================================================
   */

  const handleOpenReceipt = (
    transaction: Transaction
  ) => {
    setSelectedTransaction(
      null
    );

    navigate(
      '/transaction-receipt',
      {
        state: {
          transaction,
        },
      }
    );
  };


  /*
   * ============================================================
   * PRINT / PDF
   * ============================================================
   */

  const handlePrint = () => {
    window.print();
  };


  /*
   * ============================================================
   * COPY REFERENCE
   * ============================================================
   */

  const copyReference = async (
    reference?: string
  ) => {
    if (!reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        reference
      );
    } catch {
      console.log(
        'Unable to copy reference.'
      );
    }
  };


  /*
   * ============================================================
   * AIRTIME REQUERY
   * ============================================================
   */

  const handleRequeryAirtime = async (
    transaction: Transaction
  ) => {
    if (!transaction.reference) {
      setRequeryMessage(
        'This transaction does not have a reference number for status checking.'
      );

      setRequeryDiagnostic(null);

      return;
    }

    const token =
      getToken();

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setRequeryingReference(
        transaction.reference
      );

      setRequeryMessage('');
      setRequeryDiagnostic(null);

      const response =
        await axios.post(
          `${API_URL}/api/airtime/requery/${encodeURIComponent(
            transaction.reference
          )}`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const result =
        response.data;

      /*
       * Capture temporary diagnostic information
       * returned by the backend.
       */
      setRequeryDiagnostic(
        result?.diagnostic || null
      );

      const returnedStatus =
        String(
          result?.status || ''
        ).toLowerCase();

      setSelectedTransaction(
        (previous) => {
          if (!previous) {
            return previous;
          }

          if (
            returnedStatus ===
              'completed' ||
            returnedStatus ===
              'success' ||
            returnedStatus ===
              'successful' ||
            returnedStatus ===
              'delivered'
          ) {
            return {
              ...previous,
              status:
                'completed',
            };
          }

          if (
            returnedStatus ===
            'failed'
          ) {
            return {
              ...previous,
              status:
                'failed',
            };
          }

          if (
            returnedStatus ===
            'pending'
          ) {
            return {
              ...previous,
              status:
                'pending',
            };
          }

          return previous;
        }
      );

      setRequeryMessage(
        result?.message ||
        'Transaction status checked successfully.'
      );

      await loadTransactions();

    } catch (err: any) {
      console.error(
        'Failed to requery airtime transaction:',
        err
      );

      /*
       * Capture diagnostic information if the
       * backend returned it through an error response.
       */
      setRequeryDiagnostic(
        err?.response?.data?.diagnostic || null
      );

      setRequeryMessage(
        err?.response?.data?.message ||
        'Unable to check the transaction status right now. Please try again later.'
      );

    } finally {
      setRequeryingReference(
        null
      );
    }
  };


  const selectedStatus =
    selectedTransaction
      ? getStatusStyle(
          selectedTransaction.status
        )
      : null;


  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <Box
      sx={{
        minHeight: '100vh',

        background:
          'linear-gradient(180deg, #F1FAF6 0px, #F7F9F8 330px)',

        pb: 6,
      }}
    >

      {/* HEADER */}

      <Box
        className="transaction-print-header"
        sx={{
          pt: {
            xs: 1.5,
            sm: 2.5,
          },

          pb: 1.5,
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            px: {
              xs: 1.5,
              sm: 3,
            },
          }}
        >

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >

            <IconButton
              onClick={() =>
                navigate(-1)
              }
              sx={{
                width: 42,
                height: 42,
                background: '#FFFFFF',
                color: '#18231F',
                border:
                  '1px solid rgba(0,0,0,0.05)',
                boxShadow:
                  '0 5px 16px rgba(20,50,40,0.06)',
              }}
            >
              <ChevronRightRounded
                sx={{
                  transform:
                    'rotate(180deg)',
                }}
              />
            </IconButton>


            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: 19,
                    sm: 24,
                  },
                  fontWeight: 900,
                  color: '#14221D',
                  letterSpacing:
                    '-0.5px',
                }}
              >
                Transaction History
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  color: '#7D8984',
                  mt: 0.2,
                }}
              >
                Your complete money trail
              </Typography>
            </Box>


            <IconButton
              onClick={handlePrint}
              sx={{
                width: 42,
                height: 42,
                background: '#FFFFFF',
                color: '#008C68',
                border:
                  '1px solid rgba(0,0,0,0.05)',
                boxShadow:
                  '0 5px 16px rgba(20,50,40,0.06)',
              }}
            >
              <DownloadRounded />
            </IconButton>

          </Stack>

        </Container>
      </Box>


      <Container
        maxWidth="md"
        sx={{
          px: {
            xs: 1.5,
            sm: 3,
          },
        }}
      >

        {/* SUMMARY */}

        <Card
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, #063F31 0%, #087A4B 58%, #00A875 100%)',
            color: '#FFFFFF',
            boxShadow:
              '0 14px 30px rgba(0,104,75,0.16)',
            mb: 1.7,
            border: 'none',
          }}
        >

          <Box
            sx={{
              p: {
                xs: 2,
                sm: 2.7,
              },
            }}
          >

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >

              <Box>

                <Stack
                  direction="row"
                  spacing={0.7}
                  alignItems="center"
                >
                  <AccountBalanceWalletRounded
                    sx={{
                      fontSize: 18,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 12,
                      opacity: 0.78,
                      fontWeight: 600,
                    }}
                  >
                    Activity overview
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    fontSize: {
                      xs: 24,
                      sm: 28,
                    },
                    fontWeight: 900,
                    mt: 0.6,
                  }}
                >
                  {filteredTransactions.length}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12,
                    opacity: 0.75,
                  }}
                >
                  transactions displayed
                </Typography>

              </Box>


              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background:
                    'rgba(255,255,255,0.13)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ReceiptLongRounded />
              </Box>

            </Stack>


            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 2,
              }}
            >

              <Box
                sx={{
                  flex: 1,
                  p: 1.2,
                  borderRadius: 2.5,
                  background:
                    'rgba(255,255,255,0.10)',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                }}
              >

                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                >
                  <ArrowDownwardRounded
                    sx={{
                      fontSize: 16,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 10,
                      opacity: 0.75,
                    }}
                  >
                    Money in
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: {
                      xs: 13,
                      sm: 15,
                    },
                    mt: 0.4,
                  }}
                >
                  {formatAmount(
                    moneyIn
                  )}
                </Typography>

              </Box>


              <Box
                sx={{
                  flex: 1,
                  p: 1.2,
                  borderRadius: 2.5,
                  background:
                    'rgba(255,255,255,0.10)',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                }}
              >

                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                >
                  <ArrowUpwardRounded
                    sx={{
                      fontSize: 16,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 10,
                      opacity: 0.75,
                    }}
                  >
                    Money out
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: {
                      xs: 13,
                      sm: 15,
                    },
                    mt: 0.4,
                  }}
                >
                  {formatAmount(
                    moneyOut
                  )}
                </Typography>

              </Box>

            </Stack>

          </Box>
        </Card>


        {/* SEARCH */}

        <TextField
          fullWidth
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search transactions..."
          variant="outlined"
          sx={{
            mb: 1.2,
            background: '#FFFFFF',
            borderRadius: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              height: 50,

              '& fieldset': {
                borderColor:
                  '#E8EEEB',
              },

              '&.Mui-focused fieldset': {
                borderColor:
                  '#00A875',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded
                  sx={{
                    color:
                      '#7E8B86',
                  }}
                />
              </InputAdornment>
            ),
          }}
        />


        {/* FILTERS */}

        <Card
          sx={{
            p: 1,
            borderRadius: 3,
            mb: 1.6,
            boxShadow:
              '0 5px 18px rgba(21,39,32,0.05)',
            border:
              '1px solid #EAEFED',
          }}
        >

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
          >

            <FilterListRounded
              sx={{
                color:
                  '#75817D',
                ml: 0.3,
              }}
            />


            <Select
              value={category}
              onChange={
                handleCategoryChange
              }
              size="small"
              fullWidth
              sx={{
                height: 38,
                fontSize: 12,
                fontWeight: 600,
                '& fieldset': {
                  border: 'none',
                },
              }}
            >

              <MenuItem value="all">
                All transactions
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
              value={statusFilter}
              onChange={
                handleStatusChange
              }
              size="small"
              fullWidth
              sx={{
                height: 38,
                fontSize: 12,
                fontWeight: 600,
                '& fieldset': {
                  border: 'none',
                },
              }}
            >

              <MenuItem value="all">
                All status
              </MenuItem>

              <MenuItem value="completed">
                Successful
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

            </Select>

          </Stack>

        </Card>


        {/* ERROR */}

        {error && (
          <Card
            sx={{
              p: 1.5,
              mb: 1.5,
              borderRadius: 3,
              background: '#FFF7F7',
              border:
                '1px solid #F5D4D4',
            }}
          >

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >

              <ErrorRounded
                sx={{
                  color:
                    '#D93636',
                }}
              />

              <Typography
                sx={{
                  color:
                    '#B52F2F',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {error}
              </Typography>

            </Stack>

          </Card>
        )}


        {/* LOADING */}

        {loading ? (

          <Card
            sx={{
              borderRadius: 3.5,
              p: 5,
              textAlign: 'center',
              border:
                '1px solid #EAEFED',
            }}
          >

            <CircularProgress
              size={32}
              sx={{
                color:
                  '#00A875',
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                color:
                  '#7B8782',
                fontSize: 13,
              }}
            >
              Loading your transactions...
            </Typography>

          </Card>

        ) : filteredTransactions.length === 0 ? (

          <Card
            sx={{
              borderRadius: 3.5,
              p: 4,
              textAlign: 'center',
              border:
                '1px solid #EAEFED',
            }}
          >

            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background:
                  '#EAF7F3',
                color:
                  '#008C68',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
              }}
            >
              <ReceiptLongRounded
                sx={{
                  fontSize: 30,
                }}
              />
            </Box>

            <Typography
              sx={{
                mt: 1.7,
                fontSize: 18,
                fontWeight: 800,
                color:
                  '#18231F',
              }}
            >
              No transactions found
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color:
                  '#7E8985',
                fontSize: 12,
              }}
            >
              {search
                ? 'Try a different search.'
                : 'Your transaction activity will appear here.'}
            </Typography>

            {(search ||
              category !== 'all' ||
              statusFilter !== 'all') && (

              <Button
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setStatusFilter(
                    'all'
                  );
                }}
                sx={{
                  mt: 1.5,
                  color:
                    '#008C68',
                  fontWeight: 800,
                  textTransform:
                    'none',
                }}
              >
                Clear filters
              </Button>

            )}

          </Card>

        ) : (

          <Box>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                mb: 1,
                px: 0.3,
              }}
            >

              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 800,
                  color:
                    '#24302B',
                }}
              >
                Recent activity
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  color:
                    '#89938F',
                }}
              >
                {filteredTransactions.length}{' '}
                result
                {filteredTransactions.length !==
                1
                  ? 's'
                  : ''}
              </Typography>

            </Stack>


            <Stack spacing={0.9}>

              {filteredTransactions.map(
                (transaction) => {

                  const credit =
                    isCredit(
                      transaction
                    );

                  const iconColors =
                    getIconColors(
                      transaction
                    );

                  const status =
                    getStatusStyle(
                      transaction.status
                    );

                  const absoluteAmount =
                    getAbsoluteAmount(
                      transaction
                    );


                  return (

                    <Card
                      key={String(
                        transaction.id
                      )}

                      onClick={() =>
                        handleOpenTransaction(
                          transaction
                        )
                      }

                      sx={{
                        p: {
                          xs: 1.25,
                          sm: 1.6,
                        },

                        borderRadius:
                          3,

                        cursor:
                          'pointer',

                        border:
                          '1px solid #EAEFED',

                        boxShadow:
                          '0 4px 14px rgba(21,39,32,0.04)',

                        transition:
                          'all 0.18s ease',

                        '&:hover': {
                          transform:
                            'translateY(-1px)',
                          boxShadow:
                            '0 7px 20px rgba(21,39,32,0.07)',
                        },
                      }}
                    >

                      <Stack
                        direction="row"
                        spacing={1.1}
                        alignItems="center"
                      >

                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            minWidth: 46,
                            borderRadius: 2.7,
                            background:
                              iconColors.background,
                            color:
                              iconColors.color,
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                          }}
                        >
                          {getTransactionIcon(
                            transaction
                          )}
                        </Box>


                        <Box
                          sx={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >

                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 800,
                              color:
                                '#1B2722',
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {getDescription(
                              transaction
                            )}
                          </Typography>


                          <Typography
                            sx={{
                              fontSize: 11,
                              color:
                                '#8A9590',
                              mt: 0.3,
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {getRelativeDate(
                              transaction.created_at
                            )}

                            {' · '}

                            {transaction.created_at
                              ? new Date(
                                  transaction.created_at
                                ).toLocaleTimeString(
                                  'en-NG',
                                  {
                                    hour:
                                      'numeric',
                                    minute:
                                      '2-digit',
                                  }
                                )
                              : '--'}
                          </Typography>


                          <Box
                            sx={{
                              mt: 0.55,
                            }}
                          >
                            <Chip
                              size="small"
                              icon={
                                status.icon
                              }
                              label={
                                status.label
                              }
                              sx={{
                                height: 21,
                                borderRadius:
                                  1.5,
                                background:
                                  status.background,
                                color:
                                  status.color,
                                fontSize: 9.5,
                                fontWeight:
                                  800,
                                '& .MuiChip-icon':
                                  {
                                    color:
                                      status.color,
                                  },
                              }}
                            />
                          </Box>

                        </Box>


                        <Box
                          sx={{
                            textAlign:
                              'right',

                            minWidth: {
                              xs: 90,
                              sm: 120,
                            },
                          }}
                        >

                          <Typography
                            sx={{
                              fontSize: {
                                xs: 13,
                                sm: 16,
                              },

                              fontWeight:
                                900,

                              color: credit
                                ? '#009A69'
                                : '#202A26',

                              whiteSpace:
                                'nowrap',

                              letterSpacing:
                                '-0.2px',
                            }}
                          >
                            {credit
                              ? '+'
                              : '−'}

                            {formatAmount(
                              absoluteAmount,
                              transaction.currency
                            )}
                          </Typography>

                        </Box>


                        <ChevronRightRounded
                          sx={{
                            color:
                              '#AAB3AF',
                            fontSize: 21,
                          }}
                        />

                      </Stack>

                    </Card>

                  );
                }
              )}

            </Stack>

          </Box>

        )}


        {/* REFRESH */}

        {!loading && (

          <Button
            fullWidth
            startIcon={
              <RefreshRounded />
            }
            onClick={
              loadTransactions
            }
            sx={{
              mt: 2,
              height: 46,
              borderRadius: 2.8,
              color:
                '#087A4B',
              background:
                '#EAF7F3',
              fontWeight:
                800,
              textTransform:
                'none',
              '&:hover': {
                background:
                  '#DDF2EA',
              },
            }}
          >
            Refresh transactions
          </Button>

        )}

      </Container>


      {/* ======================================================
          TRANSACTION DETAILS
      ======================================================= */}

      <Dialog
        open={
          Boolean(
            selectedTransaction
          )
        }
        onClose={
          handleCloseTransaction
        }
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            margin: 1.5,
          },
        }}
      >

        {selectedTransaction && (

          <>

            {/* HEADER */}

            <Box
              sx={{
                background:
                  'linear-gradient(135deg, #063F31, #008C68)',
                color: '#FFFFFF',
                p: 2,
              }}
            >

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >

                <Typography
                  sx={{
                    fontSize: 17,
                    fontWeight: 900,
                  }}
                >
                  Transaction details
                </Typography>

                <IconButton
                  onClick={
                    handleCloseTransaction
                  }
                  sx={{
                    color:
                      '#FFFFFF',
                    background:
                      'rgba(255,255,255,0.12)',
                  }}
                >
                  <CloseRounded />
                </IconButton>

              </Stack>


              <Box
                sx={{
                  textAlign:
                    'center',
                  py: 2,
                }}
              >

                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background:
                      'rgba(255,255,255,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  {isCredit(
                    selectedTransaction
                  ) ? (
                    <ArrowDownwardRounded
                      sx={{
                        fontSize: 27,
                      }}
                    />
                  ) : (
                    <ArrowUpwardRounded
                      sx={{
                        fontSize: 27,
                      }}
                    />
                  )}
                </Box>


                <Typography
                  sx={{
                    fontSize: 25,
                    fontWeight: 900,
                  }}
                >
                  {isCredit(
                    selectedTransaction
                  )
                    ? '+'
                    : '−'}

                  {formatAmount(
                    getAbsoluteAmount(
                      selectedTransaction
                    ),
                    selectedTransaction.currency
                  )}
                </Typography>


                <Typography
                  sx={{
                    opacity: 0.75,
                    fontSize: 12,
                    mt: 0.3,
                  }}
                >
                  {getDescription(
                    selectedTransaction
                  )}
                </Typography>


                {selectedStatus && (
                  <Chip
                    icon={
                      selectedStatus.icon
                    }
                    label={
                      selectedStatus.label
                    }
                    sx={{
                      mt: 1.2,
                      background:
                        'rgba(255,255,255,0.13)',
                      color:
                        '#FFFFFF',
                      fontWeight:
                        700,
                      '& .MuiChip-icon':
                        {
                          color:
                            '#FFFFFF',
                        },
                    }}
                  />
                )}

              </Box>

            </Box>


            {/* DETAILS */}

            <DialogContent
              sx={{
                p: 2,
              }}
            >

              <Stack spacing={0}>

                <DetailRow
                  label="Date & time"
                  value={formatDate(
                    selectedTransaction.created_at
                  )}
                />


                {selectedTransaction.reference && (
                  <DetailRow
                    label="Transaction reference"
                    value={
                      selectedTransaction.reference
                    }
                    action={
                      <IconButton
                        size="small"
                        onClick={() =>
                          copyReference(
                            selectedTransaction.reference
                          )
                        }
                      >
                        <ContentCopyRounded
                          sx={{
                            fontSize:
                              16,
                            color:
                              '#008C68',
                          }}
                        />
                      </IconButton>
                    }
                  />
                )}


                {selectedTransaction.recipient_name && (
                  <DetailRow
                    label="Recipient"
                    value={
                      selectedTransaction.recipient_name
                    }
                  />
                )}


                {selectedTransaction.recipient_phone && (
                  <DetailRow
                    label="Recipient phone"
                    value={
                      selectedTransaction.recipient_phone
                    }
                  />
                )}


                {selectedTransaction.recipient_account && (
                  <DetailRow
                    label="Recipient account"
                    value={
                      selectedTransaction.recipient_account
                    }
                  />
                )}


                {selectedTransaction.recipient_bank && (
                  <DetailRow
                    label="Bank"
                    value={
                      selectedTransaction.recipient_bank
                    }
                  />
                )}


                {selectedTransaction.sender_name && (
                  <DetailRow
                    label="Sender"
                    value={
                      selectedTransaction.sender_name
                    }
                  />
                )}


                {selectedTransaction.sender_phone && (
                  <DetailRow
                    label="Sender phone"
                    value={
                      selectedTransaction.sender_phone
                    }
                  />
                )}


                <DetailRow
                  label="Transaction type"
                  value={
                    getDescription(
                      selectedTransaction
                    )
                  }
                />


                <DetailRow
                  label="Amount"
                  value={
                    formatAmount(
                      getAbsoluteAmount(
                        selectedTransaction
                      ),
                      selectedTransaction.currency
                    )
                  }
                />


                {Number(
                  selectedTransaction.transaction_fee ||
                    0
                ) > 0 && (
                  <DetailRow
                    label="Transaction fee"
                    value={
                      formatAmount(
                        Math.abs(
                          Number(
                            selectedTransaction.transaction_fee
                          )
                        ),
                        selectedTransaction.currency
                      )
                    }
                  />
                )}


                <DetailRow
                  label="Currency"
                  value={
                    selectedTransaction.currency ||
                    'NGN'
                  }
                />


                {typeof selectedTransaction.balance_before ===
                  'number' && (
                  <DetailRow
                    label="Balance before"
                    value={
                      formatAmount(
                        selectedTransaction.balance_before,
                        selectedTransaction.currency
                      )
                    }
                  />
                )}


                {typeof selectedTransaction.balance_after ===
                  'number' && (
                  <DetailRow
                    label="Balance after"
                    value={
                      formatAmount(
                        selectedTransaction.balance_after,
                        selectedTransaction.currency
                      )
                    }
                  />
                )}

              </Stack>


              {/* REQUERY MESSAGE */}

              {requeryMessage && (
                <Alert
                  severity={
                    selectedTransaction.status
                      .toLowerCase() ===
                    'completed'
                      ? 'success'
                      : selectedTransaction.status
                          .toLowerCase() ===
                        'failed'
                      ? 'error'
                      : 'info'
                  }
                  sx={{
                    mt: 1.5,
                    borderRadius: 2.5,
                    fontSize: 12,
                  }}
                >
                  {requeryMessage}
                </Alert>
              )}


              {/* =================================================
                  TEMPORARY VTPASS DIAGNOSTIC
                  ================================================= */}

              {requeryDiagnostic && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 1.2,
                    borderRadius: 2.5,
                    fontSize: 12,

                    '& .MuiAlert-message': {
                      width: '100%',
                    },
                  }}
                >

                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 900,
                      mb: 0.8,
                    }}
                  >
                    VTpass diagnostic
                  </Typography>


                  <Stack
                    spacing={0.35}
                  >

                    <Typography
                      sx={{
                        fontSize: 11.5,
                      }}
                    >
                      Request ID:{' '}
                      {requeryDiagnostic.requestId ||
                        'Not available'}
                    </Typography>


                    <Typography
                      sx={{
                        fontSize: 11.5,
                      }}
                    >
                      HTTP status:{' '}
                      {requeryDiagnostic.httpStatus ??
                        'Not available'}
                    </Typography>


                    <Typography
                      sx={{
                        fontSize: 11.5,
                      }}
                    >
                      Provider code:{' '}
                      {requeryDiagnostic.providerCode ||
                        'Not available'}
                    </Typography>


                    <Typography
                      sx={{
                        fontSize: 11.5,
                      }}
                    >
                      Error code:{' '}
                      {requeryDiagnostic.errorCode ||
                        'None'}
                    </Typography>


                    <Typography
                      sx={{
                        fontSize: 11.5,
                      }}
                    >
                      Provider description:{' '}
                      {requeryDiagnostic.providerDescription ||
                        'Not available'}
                    </Typography>

                  </Stack>

                </Alert>
              )}


              <Divider
                sx={{
                  my: 1.5,
                }}
              />


              {/* ACTIONS */}

              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row',
                }}
                spacing={0.8}
              >

                {getType(
                  selectedTransaction
                ).includes('airtime') &&
                  String(
                    selectedTransaction.status ||
                      ''
                  ).toLowerCase() ===
                    'pending' && (

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={
                      requeryingReference ===
                      selectedTransaction.reference ? (
                        <CircularProgress
                          size={17}
                          sx={{
                            color:
                              '#008C68',
                          }}
                        />
                      ) : (
                        <RefreshRounded />
                      )
                    }
                    onClick={() =>
                      handleRequeryAirtime(
                        selectedTransaction
                      )
                    }
                    disabled={
                      requeryingReference ===
                      selectedTransaction.reference
                    }
                    sx={{
                      height: 46,
                      borderRadius: 2.7,
                      borderColor:
                        '#008C68',
                      color:
                        '#008C68',
                      textTransform:
                        'none',
                      fontWeight:
                        800,
                    }}
                  >
                    {requeryingReference ===
                    selectedTransaction.reference
                      ? 'Checking...'
                      : 'Check status'}
                  </Button>

                )}


                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    <ReceiptLongRounded />
                  }
                  onClick={() =>
                    handleOpenReceipt(
                      selectedTransaction
                    )
                  }
                  sx={{
                    height: 46,
                    borderRadius: 2.7,
                    background:
                      '#008C68',
                    textTransform:
                      'none',
                    fontWeight:
                      800,
                    boxShadow:
                      'none',
                    '&:hover': {
                      background:
                        '#007858',
                      boxShadow:
                        'none',
                    },
                  }}
                >
                  View receipt
                </Button>


                <Button
                  fullWidth
                  variant="outlined"
                  onClick={
                    handleCloseTransaction
                  }
                  sx={{
                    height: 46,
                    borderRadius: 2.7,
                    borderColor:
                      '#DCE5E1',
                    color:
                      '#34423C',
                    textTransform:
                      'none',
                    fontWeight:
                      800,
                  }}
                >
                  Close
                </Button>

              </Stack>

            </DialogContent>

          </>

        )}

      </Dialog>


      {/* PRINT */}

      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
            }

            button,
            .MuiIconButton-root,
            input,
            .MuiSelect-select {
              display: none !important;
            }

            .MuiCard-root {
              box-shadow: none !important;
              break-inside: avoid;
            }
          }
        `}
      </style>

    </Box>
  );
};


/*
 * ============================================================
 * DETAIL ROW
 * ============================================================
 */

interface DetailRowProps {
  label: string;
  value: string;
  action?: React.ReactNode;
}


const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  action,
}) => {
  return (
    <Box
      sx={{
        py: 1.15,
        borderBottom:
          '1px solid #F0F3F2',
      }}
    >

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1.5}
      >

        <Typography
          sx={{
            color:
              '#8A9590',
            fontSize: 11.5,
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>


        <Stack
          direction="row"
          alignItems="center"
          spacing={0.3}
          sx={{
            minWidth: 0,
          }}
        >

          <Typography
            sx={{
              color:
                '#26332E',
              fontSize: 12.5,
              fontWeight: 700,
              textAlign:
                'right',
              wordBreak:
                'break-word',
            }}
          >
            {value}
          </Typography>

          {action}

        </Stack>

      </Stack>

    </Box>
  );
};


export default Transactions;
