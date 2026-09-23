import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  PhoneAndroidRounded,
  ReceiptLongRounded,
  RefreshRounded,
  ScheduleRounded,
  SearchRounded,
  SwapHorizRounded,
  VerifiedRounded,
} from '@mui/icons-material';

import {
  useNavigate,
} from 'react-router-dom';

import axios from 'axios';


/*
 * ============================================================
 * API
 * ============================================================
 */

const API_URL =
  'https://zenimonies-banking.onrender.com';


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

  transaction_fee?: number;

  total_debit?: number;

  sender_name?: string;

  sender_phone?: string;

  sender_account?: string;

  recipient_name?: string;

  recipient_phone?: string;

  recipient_account?: string;

  recipient_bank?: string;

  recipient_bank_code?: string;

  provider?: string;

  network?: string;

  phone?: string;

  customer_number?: string;

  provider_reference?: string;

  provider_message?: string;

  data_plan?: string;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const Transactions: React.FC = () => {
  const navigate =
    useNavigate();


  /*
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  const [
    category,
    setCategory,
  ] = useState('all');


  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all');


  const [
    search,
    setSearch,
  ] = useState('');


  const [
    selectedTransaction,
    setSelectedTransaction,
  ] =
    useState<Transaction | null>(
      null
    );


  const [
    copied,
    setCopied,
  ] = useState(false);


  /*
   * ==========================================================
   * TOKEN
   * ==========================================================
   */

  const getToken = () => {
    return (
      localStorage.getItem(
        'zenimonies_token'
      ) ||
      localStorage.getItem(
        'token'
      ) ||
      localStorage.getItem(
        'access_token'
      )
    );
  };


  /*
   * ==========================================================
   * LOAD TRANSACTIONS
   * ==========================================================
   */

  const loadTransactions = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const token =
        getToken();

      if (!token) {
        navigate('/login');
        return;
      }

      const response =
        await axios.get(
          `${API_URL}/api/account/transactions`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        response.data;

      if (
        Array.isArray(data)
      ) {
        setTransactions(
          data
        );
      } else if (
        Array.isArray(
          data?.transactions
        )
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
        err?.response?.status ===
        401
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
        'Unable to load your transaction history.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadTransactions();
  }, []);


  /*
   * ==========================================================
   * NORMALIZATION
   * ==========================================================
   */

  const getType = (
    transaction: Transaction
  ) => {
    return String(
      transaction.type || ''
    ).toLowerCase();
  };


  const getStatus = (
    transaction: Transaction
  ) => {
    return String(
      transaction.status || ''
    ).toLowerCase();
  };


  const getAbsoluteAmount = (
    transaction: Transaction
  ) => {
    const amount =
      Number(
        transaction.amount || 0
      );

    if (
      !Number.isFinite(amount)
    ) {
      return 0;
    }

    return Math.abs(amount);
  };


  /*
   * ==========================================================
   * CURRENCY
   * ==========================================================
   */

  const formatAmount = (
    amount: number,
    currency = 'NGN'
  ) => {
    const safeCurrency =
      currency === 'ZAR'
        ? 'ZAR'
        : 'NGN';

    const safeAmount =
      Math.abs(
        Number(amount || 0)
      );

    try {
      return new Intl.NumberFormat(
        safeCurrency === 'ZAR'
          ? 'en-ZA'
          : 'en-NG',
        {
          style: 'currency',
          currency:
            safeCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ).format(
        safeAmount
      );

    } catch {
      return `${safeCurrency} ${safeAmount.toFixed(2)}`;
    }
  };


  /*
   * ==========================================================
   * DESCRIPTION
   * ==========================================================
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
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };


  /*
   * ==========================================================
   * CREDIT / DEBIT
   * ==========================================================
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
      description.includes(
        'money received'
      ) ||
      description.includes(
        'received'
      ) ||
      description.includes(
        'deposit'
      ) ||
      description.includes(
        'funding'
      ) ||
      description.includes(
        'refund'
      ) ||
      description.includes(
        'reversal'
      )
    ) {
      return true;
    }


    return false;
  };


  /*
   * ==========================================================
   * CATEGORY
   * ==========================================================
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
      type.includes('airtime')
    ) {
      return 'airtime';
    }


    if (
      type.includes('data')
    ) {
      return 'data';
    }


    if (
      type.includes('bill') ||
      description.includes('bill')
    ) {
      return 'bills';
    }


    return 'other';
  };


  /*
   * ==========================================================
   * CATEGORY LABEL
   * ==========================================================
   */

  const getCategoryLabel = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(
        transaction
      );

    switch (category) {
      case 'deposits':
        return 'Deposit';

      case 'transfers':
        return 'Transfer';

      case 'airtime':
        return 'Airtime';

      case 'data':
        return 'Data';

      case 'bills':
        return 'Bills';

      default:
        return 'Other';
    }
  };


  /*
   * ==========================================================
   * STATUS
   * ==========================================================
   */

  const getStatusConfig = (
    statusValue: string
  ) => {
    const status =
      String(
        statusValue || ''
      ).toLowerCase();


    if (
      status ===
        'completed' ||
      status ===
        'success' ||
      status ===
        'successful' ||
      status ===
        'delivered'
    ) {
      return {
        label: 'Successful',
        background: '#E8F8F1',
        color: '#087A4B',
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
      status ===
        'failed' ||
      status ===
        'cancelled' ||
      status ===
        'canceled'
    ) {
      return {
        label: 'Failed',
        background: '#FDECEC',
        color: '#C62828',
        icon: (
          <ErrorRounded
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };
    }


    if (
      status ===
        'reversed'
    ) {
      return {
        label: 'Reversed',
        background: '#F1F3F2',
        color: '#59645F',
        icon: (
          <RefreshRounded
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };
    }


    if (
      status ===
        'processing'
    ) {
      return {
        label: 'Processing',
        background: '#EAF4FF',
        color: '#1769AA',
        icon: (
          <ScheduleRounded
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };
    }


    return {
      label: 'Pending',
      background: '#F2F7F5',
      color: '#60756D',
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
   * ==========================================================
   * ICON
   * ==========================================================
   */

  const getTransactionIcon = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(
        transaction
      );


    if (
      category ===
      'deposits'
    ) {
      return (
        <AccountBalanceWalletRounded />
      );
    }


    if (
      category ===
      'transfers'
    ) {
      return (
        <SwapHorizRounded />
      );
    }


    if (
      category ===
      'airtime'
    ) {
      return (
        <PhoneAndroidRounded />
      );
    }


    if (
      category ===
      'data'
    ) {
      return (
        <PhoneAndroidRounded />
      );
    }


    if (
      category ===
      'bills'
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
   * ==========================================================
   * ICON STYLE
   * ==========================================================
   */

  const getIconStyle = (
    transaction: Transaction
  ) => {
    const category =
      getCategory(
        transaction
      );


    if (
      category ===
      'deposits'
    ) {
      return {
        background: '#E8F8F1',
        color: '#087A4B',
      };
    }


    if (
      category ===
      'transfers'
    ) {
      return {
        background: '#EAF7F3',
        color: '#008C68',
      };
    }


    if (
      category ===
      'airtime'
    ) {
      return {
        background: '#EEF7F5',
        color: '#008C68',
      };
    }


    if (
      category ===
      'data'
    ) {
      return {
        background: '#EEF4F8',
        color: '#287A9D',
      };
    }


    if (
      category ===
      'bills'
    ) {
      return {
        background: '#EFF7F4',
        color: '#167A60',
      };
    }


    return {
      background: '#F1F5F3',
      color: '#52645D',
    };
  };


  /*
   * ==========================================================
   * DATE
   * ==========================================================
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


  const getDateGroup = (
    date?: string
  ) => {
    if (!date) {
      return 'Earlier';
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return 'Earlier';
    }


    const now =
      new Date();


    const today =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );


    const yesterday =
      new Date(today);

    yesterday.setDate(
      yesterday.getDate() - 1
    );


    const transactionDay =
      new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );


    if (
      transactionDay.getTime() ===
      today.getTime()
    ) {
      return 'Today';
    }


    if (
      transactionDay.getTime() ===
      yesterday.getTime()
    ) {
      return 'Yesterday';
    }


    return parsed.toLocaleDateString(
      'en-NG',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };


  /*
   * ==========================================================
   * MASK SENSITIVE INFORMATION
   * ==========================================================
   */

  const maskAccount = (
    value?: string
  ) => {
    if (!value) {
      return '';
    }

    const text =
      String(value);

    if (
      text.length <= 4
    ) {
      return text;
    }

    return `•••• ${text.slice(-4)}`;
  };


  const maskPhone = (
    value?: string
  ) => {
    if (!value) {
      return '';
    }

    const text =
      String(value);

    if (
      text.length <= 6
    ) {
      return text;
    }

    return `${text.slice(
      0,
      4
    )}••••${text.slice(-3)}`;
  };


  /*
   * ==========================================================
   * FILTERED TRANSACTIONS
   * ==========================================================
   */

  const filteredTransactions =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();


      return transactions
        .filter(
          (transaction) => {
            const matchesCategory =
              category === 'all' ||
              getCategory(
                transaction
              ) === category;


            const rawStatus =
              getStatus(
                transaction
              );


            const normalizedStatus =
              rawStatus ===
                'success' ||
              rawStatus ===
                'successful' ||
              rawStatus ===
                'delivered'
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

              transaction.sender_name,

              transaction.sender_phone,

              transaction.sender_account,

              transaction.recipient_name,

              transaction.recipient_phone,

              transaction.recipient_account,

              transaction.recipient_bank,

              transaction.provider,

              transaction.network,

              transaction.phone,

              transaction.customer_number,

              transaction.provider_reference,

              transaction.data_plan,

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
        )
        .sort(
          (a, b) =>
            new Date(
              b.created_at || 0
            ).getTime() -
            new Date(
              a.created_at || 0
            ).getTime()
        );
    }, [
      transactions,
      category,
      statusFilter,
      search,
    ]);


  /*
   * ==========================================================
   * SUMMARY
   * ==========================================================
   */

  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;

    filteredTransactions.forEach(
      (transaction) => {
        const amount =
          getAbsoluteAmount(
            transaction
          );

        if (
          isCredit(
            transaction
          )
        ) {
          moneyIn += amount;
        } else {
          moneyOut += amount;
        }
      }
    );

    return {
      count:
        filteredTransactions.length,

      moneyIn,

      moneyOut,
    };
  }, [
    filteredTransactions,
  ]);


  /*
   * ==========================================================
   * GROUP TRANSACTIONS
   * ==========================================================
   */

  const groupedTransactions =
    useMemo(() => {
      const groups: Record<
        string,
        Transaction[]
      > = {};


      filteredTransactions.forEach(
        (transaction) => {
          const group =
            getDateGroup(
              transaction.created_at
            );


          if (!groups[group]) {
            groups[group] = [];
          }


          groups[group].push(
            transaction
          );
        }
      );


      return Object.entries(
        groups
      );
    }, [
      filteredTransactions,
    ]);


  /*
   * ==========================================================
   * SELECT / CLOSE
   * ==========================================================
   */

  const openTransaction = (
    transaction: Transaction
  ) => {
    setSelectedTransaction(
      transaction
    );

    setCopied(false);
  };


  const closeTransaction = () => {
    setSelectedTransaction(
      null
    );

    setCopied(false);
  };


  /*
   * ==========================================================
   * COPY REFERENCE
   * ==========================================================
   */

  const copyReference =
    async (
      reference?: string
    ) => {
      if (!reference) {
        return;
      }


      try {
        await navigator.clipboard.writeText(
          reference
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 1800);

      } catch {
        setCopied(false);
      }
    };


  /*
   * ==========================================================
   * RECEIPT
   * ==========================================================
   */

  const openReceipt = (
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
   * ==========================================================
   * CLEAR FILTERS
   * ==========================================================
   */

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setStatusFilter('all');
  };


  /*
   * ==========================================================
   * FILTER HANDLERS
   * ==========================================================
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


  /*
   * ==========================================================
   * PRINT / SAVE PDF
   * ==========================================================
   */

  const handlePrint = () => {
    window.print();
  };


  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <Box
      sx={{
        minHeight:
          '100vh',

        background:
          'linear-gradient(180deg, #F1FAF6 0px, #F8FAF9 360px)',

        pb: 7,
      }}
    >

      {/* ======================================================
          HEADER
      ======================================================= */}

      <Box
        className="transaction-print-header"
        sx={{
          pt: {
            xs: 1.5,
            sm: 3,
          },

          pb: 1.8,
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
                width: 44,
                height: 44,
                background:
                  '#FFFFFF',
                color:
                  '#18231F',
                border:
                  '1px solid #E8EEEB',
                boxShadow:
                  '0 5px 18px rgba(20,50,40,0.06)',
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
                textAlign:
                  'center',
              }}
            >

              <Typography
                sx={{
                  fontSize: {
                    xs: 20,
                    sm: 25,
                  },

                  fontWeight: 900,

                  color:
                    '#14221D',

                  letterSpacing:
                    '-0.6px',
                }}
              >
                Transactions
              </Typography>


              <Typography
                sx={{
                  fontSize: 11,
                  color:
                    '#7D8984',
                  mt: 0.3,
                }}
              >
                Your complete money history
              </Typography>

            </Box>


            <IconButton
              onClick={
                handlePrint
              }
              sx={{
                width: 44,
                height: 44,
                background:
                  '#FFFFFF',
                color:
                  '#008C68',
                border:
                  '1px solid #E8EEEB',
                boxShadow:
                  '0 5px 18px rgba(20,50,40,0.06)',
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

        {/* ====================================================
            SUMMARY CARD
        ===================================================== */}

        <Card
          sx={{
            borderRadius: 4,
            overflow: 'hidden',

            background:
              'linear-gradient(135deg, #063F31 0%, #087A4B 55%, #00A875 100%)',

            color:
              '#FFFFFF',

            boxShadow:
              '0 18px 36px rgba(0,104,75,0.16)',

            mb: 1.8,
          }}
        >

          <Box
            sx={{
              p: {
                xs: 2,
                sm: 2.8,
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

                  <VerifiedRounded
                    sx={{
                      fontSize: 18,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11,
                      opacity: 0.78,
                      fontWeight: 700,
                    }}
                  >
                    Account activity
                  </Typography>

                </Stack>


                <Typography
                  sx={{
                    fontSize: {
                      xs: 26,
                      sm: 31,
                    },

                    fontWeight: 900,

                    mt: 0.5,

                    letterSpacing:
                      '-0.5px',
                  }}
                >
                  {summary.count}
                </Typography>


                <Typography
                  sx={{
                    fontSize: 11.5,
                    opacity: 0.76,
                  }}
                >
                  transactions displayed
                </Typography>

              </Box>


              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius:
                    '50%',
                  background:
                    'rgba(255,255,255,0.13)',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
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
                  p: {
                    xs: 1.15,
                    sm: 1.4,
                  },
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
                      fontSize: 15,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 10,
                      opacity: 0.72,
                    }}
                  >
                    Money in
                  </Typography>

                </Stack>


                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: {
                      xs: 13,
                      sm: 15,
                    },
                    mt: 0.5,
                  }}
                >
                  {formatAmount(
                    summary.moneyIn
                  )}
                </Typography>

              </Box>


              <Box
                sx={{
                  flex: 1,
                  p: {
                    xs: 1.15,
                    sm: 1.4,
                  },
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
                      fontSize: 15,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 10,
                      opacity: 0.72,
                    }}
                  >
                    Money out
                  </Typography>

                </Stack>


                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: {
                      xs: 13,
                      sm: 15,
                    },
                    mt: 0.5,
                  }}
                >
                  {formatAmount(
                    summary.moneyOut
                  )}
                </Typography>

              </Box>

            </Stack>

          </Box>

        </Card>


        {/* ====================================================
            SEARCH
        ===================================================== */}

        <TextField
          fullWidth
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search transactions"
          variant="outlined"
          sx={{
            mb: 1.2,
            background:
              '#FFFFFF',
            borderRadius: 3,

            '& .MuiOutlinedInput-root':
              {
                borderRadius: 3,
                minHeight: 52,

                '& fieldset': {
                  borderColor:
                    '#E5ECE9',
                },

                '&:hover fieldset': {
                  borderColor:
                    '#B9D9CF',
                },

                '&.Mui-focused fieldset':
                  {
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


        {/* ====================================================
            FILTERS
        ===================================================== */}

        <Card
          sx={{
            p: 1,
            borderRadius: 3,
            mb: 1.7,

            boxShadow:
              '0 5px 18px rgba(21,39,32,0.05)',

            border:
              '1px solid #EAEFED',
          }}
        >

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={0.5}
          >

            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                flex: 1,
              }}
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
                  height: 40,
                  fontSize: 12,
                  fontWeight: 700,

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

                <MenuItem value="airtime">
                  Airtime
                </MenuItem>

                <MenuItem value="data">
                  Data
                </MenuItem>

                <MenuItem value="bills">
                  Bills
                </MenuItem>

                <MenuItem value="other">
                  Other
                </MenuItem>

              </Select>

            </Stack>


            <Select
              value={statusFilter}
              onChange={
                handleStatusChange
              }
              size="small"
              fullWidth
              sx={{
                height: 40,
                fontSize: 12,
                fontWeight: 700,

                '& fieldset': {
                  border: 'none',
                },

                flex: 1,
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

              <MenuItem value="reversed">
                Reversed
              </MenuItem>

            </Select>

          </Stack>

        </Card>


        {/* ====================================================
            ERROR
        ===================================================== */}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 1.5,
              borderRadius: 3,
              fontSize: 12,
            }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  loadTransactions(
                    true
                  )
                }
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}


        {/* ====================================================
            LOADING
        ===================================================== */}

        {loading ? (

          <Card
            sx={{
              borderRadius: 3.5,
              p: 5,
              textAlign:
                'center',
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
              p: 4.5,
              textAlign:
                'center',
              border:
                '1px solid #EAEFED',
            }}
          >

            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius:
                  '50%',
                background:
                  '#EAF7F3',
                color:
                  '#008C68',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                mx: 'auto',
              }}
            >
              <ReceiptLongRounded
                sx={{
                  fontSize: 31,
                }}
              />
            </Box>


            <Typography
              sx={{
                mt: 1.7,
                fontSize: 18,
                fontWeight: 900,
                color:
                  '#18231F',
              }}
            >
              No transactions found
            </Typography>


            <Typography
              sx={{
                mt: 0.6,
                color:
                  '#7E8985',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {search ||
              category !== 'all' ||
              statusFilter !== 'all'
                ? 'Try changing your search or filters.'
                : 'Your transaction activity will appear here.'}
            </Typography>


            {(search ||
              category !== 'all' ||
              statusFilter !==
                'all') && (
              <Button
                onClick={
                  clearFilters
                }
                sx={{
                  mt: 1.5,
                  color:
                    '#008C68',
                  fontWeight:
                    800,
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

            {groupedTransactions.map(
              ([
                group,
                groupTransactions,
              ]) => (
                <Box
                  key={group}
                  sx={{
                    mb: 2.2,
                  }}
                >

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      mb: 0.9,
                      px: 0.3,
                    }}
                  >

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 900,
                        color:
                          '#33433C',
                      }}
                    >
                      {group}
                    </Typography>


                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color:
                          '#8A9590',
                      }}
                    >
                      {
                        groupTransactions.length
                      }{' '}
                      transaction
                      {groupTransactions.length !==
                      1
                        ? 's'
                        : ''}
                    </Typography>

                  </Stack>


                  <Stack spacing={0.8}>

                    {groupTransactions.map(
                      (
                        transaction
                      ) => {

                        const credit =
                          isCredit(
                            transaction
                          );

                        const iconStyle =
                          getIconStyle(
                            transaction
                          );

                        const status =
                          getStatusConfig(
                            transaction.status
                          );

                        const amount =
                          getAbsoluteAmount(
                            transaction
                          );


                        return (
                          <Card
                            key={String(
                              transaction.id
                            )}
                            onClick={() =>
                              openTransaction(
                                transaction
                              )
                            }
                            sx={{
                              p: {
                                xs: 1.25,
                                sm: 1.55,
                              },

                              borderRadius:
                                3,

                              cursor:
                                'pointer',

                              border:
                                '1px solid #E7EEEB',

                              boxShadow:
                                '0 4px 14px rgba(21,39,32,0.035)',

                              transition:
                                'all 0.18s ease',

                              '&:hover':
                                {
                                  transform:
                                    'translateY(-1px)',

                                  boxShadow:
                                    '0 8px 22px rgba(21,39,32,0.07)',

                                  borderColor:
                                    '#D2E5DE',
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

                                  borderRadius:
                                    2.7,

                                  background:
                                    iconStyle.background,

                                  color:
                                    iconStyle.color,

                                  display:
                                    'flex',

                                  alignItems:
                                    'center',

                                  justifyContent:
                                    'center',
                                }}
                              >
                                {
                                  getTransactionIcon(
                                    transaction
                                  )
                                }
                              </Box>


                              <Box
                                sx={{
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >

                                <Typography
                                  sx={{
                                    fontSize: 13.5,
                                    fontWeight: 900,
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
                                  {
                                    getDescription(
                                      transaction
                                    )
                                  }
                                </Typography>


                                <Typography
                                  sx={{
                                    fontSize: 10.8,
                                    color:
                                      '#8A9590',
                                    mt: 0.25,

                                    overflow:
                                      'hidden',

                                    textOverflow:
                                      'ellipsis',

                                    whiteSpace:
                                      'nowrap',
                                  }}
                                >
                                  {
                                    getCategoryLabel(
                                      transaction
                                    )
                                  }

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
                                      height:
                                        21,

                                      borderRadius:
                                        1.5,

                                      background:
                                        status.background,

                                      color:
                                        status.color,

                                      fontSize:
                                        9.5,

                                      fontWeight:
                                        900,

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

                                  minWidth:
                                    {
                                      xs: 82,
                                      sm: 110,
                                    },
                                }}
                              >

                                <Typography
                                  sx={{
                                    fontSize:
                                      {
                                        xs: 12.5,
                                        sm: 15,
                                      },

                                    fontWeight:
                                      900,

                                    color:
                                      credit
                                        ? '#009A69'
                                        : '#202A26',

                                    whiteSpace:
                                      'nowrap',
                                  }}
                                >
                                  {credit
                                    ? '+'
                                    : '−'}

                                  {formatAmount(
                                    amount,
                                    transaction.currency
                                  )}
                                </Typography>


                                <Typography
                                  sx={{
                                    fontSize:
                                      9.5,
                                    color:
                                      '#98A29E',
                                    mt: 0.25,
                                  }}
                                >
                                  {
                                    transaction.currency ||
                                    'NGN'
                                  }
                                </Typography>

                              </Box>


                              <ChevronRightRounded
                                sx={{
                                  color:
                                    '#B0B9B5',
                                  fontSize: 20,
                                }}
                              />

                            </Stack>

                          </Card>
                        );
                      }
                    )}

                  </Stack>

                </Box>
              )
            )}

          </Box>

        )}


        {!loading && (
          <Button
            fullWidth
            startIcon={
              refreshing ? (
                <CircularProgress
                  size={17}
                  sx={{
                    color:
                      '#087A4B',
                  }}
                />
              ) : (
                <RefreshRounded />
              )
            }
            onClick={() =>
              loadTransactions(
                true
              )
            }
            disabled={
              refreshing
            }
            sx={{
              mt: 1.5,
              height: 48,
              borderRadius: 2.8,
              color:
                '#087A4B',
              background:
                '#EAF7F3',
              fontWeight:
                900,
              textTransform:
                'none',

              '&:hover': {
                background:
                  '#DDF2EA',
              },
            }}
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh transactions'}
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
          closeTransaction
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

            <Box
              sx={{
                background:
                  'linear-gradient(135deg, #063F31, #008C68)',

                color:
                  '#FFFFFF',

                p: 2,
              }}
            >

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >

                <Box>

                  <Typography
                    sx={{
                      fontSize: 17,
                      fontWeight: 900,
                    }}
                  >
                    Transaction details
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 10.5,
                      opacity: 0.7,
                      mt: 0.2,
                    }}
                  >
                    Secure transaction record
                  </Typography>

                </Box>


                <IconButton
                  onClick={
                    closeTransaction
                  }
                  sx={{
                    color:
                      '#FFFFFF',

                    background:
                      'rgba(255,255,255,0.12)',

                    '&:hover': {
                      background:
                        'rgba(255,255,255,0.18)',
                    },
                  }}
                >
                  <CloseRounded />
                </IconButton>

              </Stack>


              <Box
                sx={{
                  textAlign:
                    'center',
                  py: 2.2,
                }}
              >

                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius:
                      '50%',
                    background:
                      'rgba(255,255,255,0.14)',
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  {
                    getTransactionIcon(
                      selectedTransaction
                    )
                  }
                </Box>


                <Typography
                  sx={{
                    fontSize: {
                      xs: 25,
                      sm: 29,
                    },
                    fontWeight: 900,
                    letterSpacing:
                      '-0.5px',
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
                    opacity: 0.76,
                    fontSize: 12,
                    mt: 0.4,
                  }}
                >
                  {
                    getDescription(
                      selectedTransaction
                    )
                  }
                </Typography>


                <Chip
                  icon={
                    getStatusConfig(
                      selectedTransaction.status
                    ).icon
                  }
                  label={
                    getStatusConfig(
                      selectedTransaction.status
                    ).label
                  }
                  sx={{
                    mt: 1.2,

                    background:
                      'rgba(255,255,255,0.13)',

                    color:
                      '#FFFFFF',

                    fontWeight:
                      800,

                    '& .MuiChip-icon':
                      {
                        color:
                          '#FFFFFF',
                      },
                  }}
                />

              </Box>

            </Box>


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
                      <Button
                        size="small"
                        onClick={() =>
                          copyReference(
                            selectedTransaction.reference
                          )
                        }
                        startIcon={
                          <ContentCopyRounded
                            sx={{
                              fontSize: 14,
                            }}
                          />
                        }
                        sx={{
                          minWidth: 0,
                          color:
                            '#008C68',
                          textTransform:
                            'none',
                          fontSize: 10.5,
                          fontWeight:
                            800,
                        }}
                      >
                        {copied
                          ? 'Copied'
                          : 'Copy'}
                      </Button>
                    }
                  />
                )}


                <DetailRow
                  label="Category"
                  value={
                    getCategoryLabel(
                      selectedTransaction
                    )
                  }
                />


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
                      maskPhone(
                        selectedTransaction.sender_phone
                      )
                    }
                  />
                )}


                {selectedTransaction.sender_account && (
                  <DetailRow
                    label="Sender account"
                    value={
                      maskAccount(
                        selectedTransaction.sender_account
                      )
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
                      maskPhone(
                        selectedTransaction.recipient_phone
                      )
                    }
                  />
                )}


                {selectedTransaction.recipient_account && (
                  <DetailRow
                    label="Recipient account"
                    value={
                      maskAccount(
                        selectedTransaction.recipient_account
                      )
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


                {selectedTransaction.provider && (
                  <DetailRow
                    label="Provider"
                    value={
                      selectedTransaction.provider
                    }
                  />
                )}


                {selectedTransaction.network && (
                  <DetailRow
                    label="Network"
                    value={
                      selectedTransaction.network
                    }
                  />
                )}


                {selectedTransaction.phone && (
                  <DetailRow
                    label="Service number"
                    value={
                      maskPhone(
                        selectedTransaction.phone
                      )
                    }
                  />
                )}


                {selectedTransaction.data_plan && (
                  <DetailRow
                    label="Data plan"
                    value={
                      selectedTransaction.data_plan
                    }
                  />
                )}


                {selectedTransaction.customer_number && (
                  <DetailRow
                    label="Customer number"
                    value={
                      selectedTransaction.customer_number
                    }
                  />
                )}


                {/* AMOUNT */}

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


                {/* FEE */}

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


                {/* TOTAL */}

                {Number(
                  selectedTransaction.total_debit ||
                    0
                ) > 0 &&
                  !isCredit(
                    selectedTransaction
                  ) && (
                    <DetailRow
                      label="Total debited"
                      value={
                        formatAmount(
                          Math.abs(
                            Number(
                              selectedTransaction.total_debit
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

              </Stack>


              {selectedTransaction.provider_message && (
                <Alert
                  severity={
                    getStatus(
                      selectedTransaction
                    ) ===
                    'failed'
                      ? 'error'
                      : 'info'
                  }
                  sx={{
                    mt: 1.5,
                    borderRadius: 2.5,
                    fontSize: 11.5,
                  }}
                >
                  {
                    selectedTransaction.provider_message
                  }
                </Alert>
              )}


              <Divider
                sx={{
                  my: 1.7,
                }}
              />


              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row',
                }}
                spacing={0.8}
              >

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    <ReceiptLongRounded />
                  }
                  onClick={() =>
                    openReceipt(
                      selectedTransaction
                    )
                  }
                  sx={{
                    height: 47,
                    borderRadius: 2.7,

                    background:
                      '#008C68',

                    textTransform:
                      'none',

                    fontWeight:
                      900,

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
                  startIcon={
                    <DownloadRounded />
                  }
                  onClick={
                    handlePrint
                  }
                  sx={{
                    height: 47,
                    borderRadius: 2.7,

                    borderColor:
                      '#D2E4DE',

                    color:
                      '#087A4B',

                    textTransform:
                      'none',

                    fontWeight:
                      900,
                  }}
                >
                  Save / Print
                </Button>


                <Button
                  fullWidth
                  variant="outlined"
                  onClick={
                    closeTransaction
                  }
                  sx={{
                    height: 47,
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

            .transaction-print-header {
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


const DetailRow: React.FC<
  DetailRowProps
> = ({
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
