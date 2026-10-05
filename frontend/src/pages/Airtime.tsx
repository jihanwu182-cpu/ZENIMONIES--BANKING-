import React, { useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/Theme.tsx';

type Network =
  | 'MTN'
  | 'Airtel'
  | 'Glo'
  | '9mobile';

interface AirtimeAmount {
  amount: number;
  label: string;
}

const NETWORKS: {
  name: Network;
  logo: string;
}[] = [
  {
    name: 'MTN',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/mtn.svg',
  },
  {
    name: 'Airtel',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/airtel.svg',
  },
  {
    name: 'Glo',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/glo.svg',
  },
  {
    name: '9mobile',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/9mobile.svg',
  },
];

const QUICK_AMOUNTS: AirtimeAmount[] = [
  {
    amount: 100,
    label: '₦100',
  },
  {
    amount: 200,
    label: '₦200',
  },
  {
    amount: 500,
    label: '₦500',
  },
  {
    amount: 1000,
    label: '₦1,000',
  },
  {
    amount: 2000,
    label: '₦2,000',
  },
  {
    amount: 5000,
    label: '₦5,000',
  },
];

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const Airtime: React.FC = () => {
  const navigate = useNavigate();

  /*
   * GLOBAL ZENIMONIES THEME
   */
  const { darkMode } = useTheme();

  const [network, setNetwork] =
    useState<Network>('MTN');

  const [phone, setPhone] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [customAmount, setCustomAmount] =
    useState('');

  const [
    showTransactionPin,
    setShowTransactionPin,
  ] = useState(false);

  const [
    transactionPin,
    setTransactionPin,
  ] = useState('');

  const [
    transactionPinError,
    setTransactionPinError,
  ] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    transactionReference,
    setTransactionReference,
  ] = useState('');

  /* ==========================================================
     SELECTED AMOUNT
  ========================================================== */

  const selectedAmount = useMemo(() => {
    if (amount) {
      return Number(amount);
    }

    if (customAmount) {
      return Number(customAmount);
    }

    return 0;
  }, [amount, customAmount]);

  /* ==========================================================
     MONEY FORMAT
  ========================================================== */

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(value);

  /* ==========================================================
     PHONE CLEANING
  ========================================================== */

  const cleanPhoneNumber = (
    value: string
  ) => {
    let cleaned = value.replace(
      /\D/g,
      ''
    );

    if (
      cleaned.startsWith('234')
    ) {
      cleaned = `0${cleaned.slice(3)}`;
    }

    return cleaned;
  };

  /* ==========================================================
     PHONE CHANGE
  ========================================================== */

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value;

    setPhone(
      cleanPhoneNumber(value)
    );

    setErrorMessage('');
  };

  /* ==========================================================
     QUICK AMOUNT
  ========================================================== */

  const handleQuickAmount = (
    value: number
  ) => {
    setAmount(
      String(value)
    );

    setCustomAmount('');
    setErrorMessage('');
  };

  /* ==========================================================
     CUSTOM AMOUNT
  ========================================================== */

  const handleCustomAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value.replace(
        /\D/g,
        ''
      );

    setCustomAmount(value);
    setAmount('');
    setErrorMessage('');
  };

  /* ==========================================================
     VALIDATION
  ========================================================== */

  const validatePurchase = () => {
    const cleanPhone =
      cleanPhoneNumber(phone);

    if (!cleanPhone) {
      setErrorMessage(
        'Please enter a phone number.'
      );

      return false;
    }

    if (
      !/^0[7-9][0-1][0-9]{8}$/.test(
        cleanPhone
      )
    ) {
      setErrorMessage(
        'Please enter a valid Nigerian phone number.'
      );

      return false;
    }

    if (
      !selectedAmount ||
      selectedAmount <= 0
    ) {
      setErrorMessage(
        'Please select or enter an airtime amount.'
      );

      return false;
    }

    if (
      selectedAmount < 50
    ) {
      setErrorMessage(
        'Minimum airtime purchase is ₦50.'
      );

      return false;
    }

    if (
      selectedAmount > 100000
    ) {
      setErrorMessage(
        'Maximum airtime purchase is ₦100,000.'
      );

      return false;
    }

    return true;
  };

  /* ==========================================================
     BUY AIRTIME
  ========================================================== */

  const handleBuyAirtime = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!validatePurchase()) {
      return;
    }

    setTransactionPin('');
    setTransactionPinError('');
    setShowTransactionPin(true);
  };

  /* ==========================================================
     VERIFY PIN + PURCHASE
  ========================================================== */

  const verifyTransactionPinAndPurchase =
    async () => {
      if (
        !/^\d{4}$/.test(
          transactionPin
        )
      ) {
        setTransactionPinError(
          'Transaction PIN must be exactly 4 digits.'
        );

        return;
      }

      setTransactionPinError('');
      setLoading(true);

      try {
        const token =
          localStorage.getItem(
            'zenimonies_token'
          ) ||
          localStorage.getItem(
            'accessToken'
          ) ||
          localStorage.getItem(
            'token'
          );

        if (!token) {
          setShowTransactionPin(false);
          navigate('/login');
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/airtime`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                network,
                phone:
                  cleanPhoneNumber(
                    phone
                  ),
                amount:
                  selectedAmount,
                transaction_pin:
                  transactionPin,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (
            response.status ===
            401
          ) {
            setShowTransactionPin(
              false
            );

            navigate('/login');
            return;
          }

          if (
            response.status ===
            423
          ) {
            setTransactionPinError(
              data?.message ||
                'Your Transaction PIN is temporarily locked.'
            );

            return;
          }

          setTransactionPinError(
            data?.message ||
              data?.error ||
              'Airtime purchase failed.'
          );

          return;
        }

        setShowTransactionPin(false);
        setTransactionPin('');

        setTransactionReference(
          data?.reference ||
            data?.transaction
              ?.reference ||
            data?.data?.reference ||
            ''
        );

        setSuccessMessage(
          data?.message ||
            'Airtime purchased successfully.'
        );

        setErrorMessage('');

        setAmount('');
        setCustomAmount('');
        setPhone('');
      } catch (error) {
        console.error(
          'Airtime purchase error:',
          error
        );

        setTransactionPinError(
          'Unable to complete the purchase right now. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================
     CLOSE SUCCESS
  ========================================================== */

  const closeSuccess = () => {
    setSuccessMessage('');
    setTransactionReference('');
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Box
      className={
        darkMode
          ? 'zenimonies-airtime dark-mode'
          : 'zenimonies-airtime'
      }
      sx={{
        minHeight: '100vh',

        backgroundColor:
          darkMode
            ? '#0d1712'
            : '#f7faf8',

        color:
          darkMode
            ? '#f3f8f5'
            : '#14251e',

        pb: 10,

        transition:
          'background-color 0.18s ease, color 0.18s ease',
      }}
    >

      {/* =====================================================
          DARK MODE STYLES
      ===================================================== */}

      <style>
        {`
          .zenimonies-airtime.dark-mode
          .MuiCard-root {
            background-color: #101c16 !important;
            border-color: #294238 !important;
            color: #f3f8f5 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiPaper-root {
            background-color: #15231c !important;
            border-color: #294238 !important;
            color: #f3f8f5 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiTypography-root {
            color: #f3f8f5 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiTypography-root.MuiTypography-body2,
          .zenimonies-airtime.dark-mode
          .MuiTypography-root.MuiTypography-caption {
            color: #a9b8b0 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiOutlinedInput-root {
            background-color: #15231c !important;
            color: #f3f8f5 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiOutlinedInput-input {
            color: #f3f8f5 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiOutlinedInput-input::placeholder {
            color: #82958b !important;
            opacity: 1;
          }

          .zenimonies-airtime.dark-mode
          .MuiInputLabel-root {
            color: #a9b8b0 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiOutlinedInput-notchedOutline {
            border-color: #3a5147 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiDivider-root {
            border-color: #294238 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiButton-root:not(.MuiButton-contained) {
            color: #dce9e3 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiAlert-root {
            background-color: #15231c !important;
            color: #f3f8f5 !important;
            border-color: #294238 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiAlert-message {
            color: #f3f8f5 !important;
          }

          .zenimonies-airtime.dark-mode
          .MuiAlert-icon {
            color: #69d9a0 !important;
          }
        `}
      </style>

      <Container
        maxWidth="md"
        sx={{
          pt: {
            xs: 2,
            sm: 3,
          },
        }}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            mb: 2.5,
          }}
        >

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
          >

            <IconButton
              onClick={() =>
                navigate(-1)
              }
              sx={{
                color: '#176b45',

                backgroundColor:
                  darkMode
                    ? '#153027'
                    : '#edf7f1',

                '&:hover': {
                  backgroundColor:
                    darkMode
                      ? '#1b3a2e'
                      : '#e0f0e7',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Box>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,

                  color:
                    darkMode
                      ? '#f3f8f5'
                      : '#123b29',

                  lineHeight: 1.1,
                }}
              >
                Airtime
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color:
                    darkMode
                      ? '#a9b8b0'
                      : '#718078',

                  mt: 0.4,
                }}
              >
                Buy airtime instantly
              </Typography>

            </Box>
          </Stack>

          <IconButton
            onClick={() =>
              navigate(
                '/transactions'
              )
            }
            sx={{
              color: '#176b45',

              backgroundColor:
                darkMode
                  ? '#153027'
                  : '#edf7f1',

              '&:hover': {
                backgroundColor:
                  darkMode
                    ? '#1b3a2e'
                    : '#e0f0e7',
              },
            }}
          >
            <HistoryIcon />
          </IconButton>

        </Stack>

        {/* ==================================================
            NETWORK SELECTOR
        ================================================== */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,

            border:
              darkMode
                ? '1px solid #294238'
                : '1px solid #e4eee8',

            backgroundColor:
              darkMode
                ? '#101c16'
                : '#ffffff',

            mb: 2,
          }}
        >

          <CardContent
            sx={{
              p: {
                xs: 2,
                sm: 2.5,
              },
            }}
          >

            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,

                color:
                  darkMode
                    ? '#f3f8f5'
                    : '#183d2d',

                mb: 1.5,
              }}
            >
              Select Network
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 1.2,
                overflowX: 'auto',
                pb: 0.5,

                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >

              {NETWORKS.map(
                (item) => {
                  const selected =
                    network ===
                    item.name;

                  return (
                    <Paper
                      key={
                        item.name
                      }
                      onClick={() => {
                        setNetwork(
                          item.name
                        );

                        setErrorMessage(
                          ''
                        );
                      }}
                      elevation={0}
                      sx={{
                        minWidth: 82,
                        flexShrink: 0,
                        cursor: 'pointer',
                        borderRadius: 3,

                        border:
                          selected
                            ? '2px solid #176b45'
                            : darkMode
                              ? '1px solid #294238'
                              : '1px solid #e1ebe5',

                        backgroundColor:
                          selected
                            ? darkMode
                              ? '#193a2c'
                              : '#edf7f1'
                            : darkMode
                              ? '#15231c'
                              : '#ffffff',

                        p: 1.2,
                        textAlign: 'center',

                        transition:
                          'all 0.2s ease',
                      }}
                    >

                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          mx: 'auto',
                          mb: 0.7,

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',
                        }}
                      >

                        <img
                          src={
                            item.logo
                          }
                          alt={`${item.name} logo`}
                          style={{
                            maxWidth:
                              '100%',
                            maxHeight:
                              '100%',
                            objectFit:
                              'contain',
                          }}
                        />

                      </Box>

                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,

                          color:
                            selected
                              ? '#69d9a0'
                              : darkMode
                                ? '#dce9e3'
                                : '#4f6258',
                        }}
                      >
                        {item.name}
                      </Typography>

                    </Paper>
                  );
                }
              )}

            </Box>

          </CardContent>

        </Card>

        {/* ==================================================
            PHONE NUMBER
        ================================================== */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,

            border:
              darkMode
                ? '1px solid #294238'
                : '1px solid #e4eee8',

            backgroundColor:
              darkMode
                ? '#101c16'
                : '#ffffff',

            mb: 2,
          }}
        >

          <CardContent
            sx={{
              p: {
                xs: 2,
                sm: 2.5,
              },
            }}
          >

            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,

                color:
                  darkMode
                    ? '#f3f8f5'
                    : '#183d2d',

                mb: 1.5,
              }}
            >
              Mobile Number
            </Typography>

            <TextField
              fullWidth
              value={phone}
              onChange={
                handlePhoneChange
              }
              placeholder="08012345678"
              inputMode="numeric"

              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidIcon
                      sx={{
                        color:
                          '#176b45',
                      }}
                    />
                  </InputAdornment>
                ),
              }}

              sx={{
                '& .MuiOutlinedInput-root':
                  {
                    borderRadius: 3,

                    backgroundColor:
                      darkMode
                        ? '#15231c'
                        : '#fafcfb',

                    '& fieldset': {
                      borderColor:
                        darkMode
                          ? '#3a5147'
                          : undefined,
                    },

                    '&:hover fieldset':
                      {
                        borderColor:
                          darkMode
                            ? '#4c6b5d'
                            : undefined,
                      },

                    '&.Mui-focused fieldset':
                      {
                        borderColor:
                          '#176b45',
                      },
                  },

                '& .MuiOutlinedInput-input':
                  {
                    color:
                      darkMode
                        ? '#f3f8f5'
                        : undefined,
                  },

                '& .MuiOutlinedInput-input::placeholder':
                  {
                    color:
                      darkMode
                        ? '#82958b'
                        : undefined,

                    opacity: 1,
                  },
              }}
            />

          </CardContent>

        </Card>

        {/* ==================================================
            QUICK AMOUNTS
        ================================================== */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,

            border:
              darkMode
                ? '1px solid #294238'
                : '1px solid #e4eee8',

            backgroundColor:
              darkMode
                ? '#101c16'
                : '#ffffff',

            mb: 2,
          }}
        >

          <CardContent
            sx={{
              p: {
                xs: 2,
                sm: 2.5,
              },
            }}
          >

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                mb: 1.5,
              }}
            >

              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,

                  color:
                    darkMode
                      ? '#f3f8f5'
                      : '#183d2d',
                }}
              >
                Select Amount
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color:
                    darkMode
                      ? '#a9b8b0'
                      : '#718078',
                }}
              >
                Choose an amount
              </Typography>

            </Stack>

            <Grid
              container
              spacing={1.2}
            >

              {QUICK_AMOUNTS.map(
                (item) => {
                  const selected =
                    Number(
                      amount
                    ) ===
                    item.amount;

                  return (
                    <Grid
                      item
                      xs={4}
                      sm={2}
                      key={
                        item.amount
                      }
                    >

                      <Button
                        fullWidth
                        onClick={() =>
                          handleQuickAmount(
                            item.amount
                          )
                        }
                        sx={{
                          minHeight: 58,
                          borderRadius: 3,
                          textTransform:
                            'none',
                          fontWeight: 800,

                          border:
                            selected
                              ? '2px solid #176b45'
                              : darkMode
                                ? '1px solid #294238'
                                : '1px solid #e0ebe5',

                          backgroundColor:
                            selected
                              ? darkMode
                                ? '#193a2c'
                                : '#edf7f1'
                              : darkMode
                                ? '#15231c'
                                : '#ffffff',

                          color:
                            selected
                              ? '#69d9a0'
                              : darkMode
                                ? '#dce9e3'
                                : '#40554a',

                          '&:hover': {
                            backgroundColor:
                              darkMode
                                ? '#193a2c'
                                : '#edf7f1',
                          },
                        }}
                      >
                        {item.label}
                      </Button>

                    </Grid>
                  );
                }
              )}

            </Grid>

            <Divider
              sx={{
                my: 2,
                borderColor:
                  darkMode
                    ? '#294238'
                    : undefined,
              }}
            />

            <TextField
              fullWidth
              label="Custom Amount"
              value={customAmount}
              onChange={
                handleCustomAmountChange
              }
              placeholder="Enter amount"
              type="number"

              inputProps={{
                min: 50,
                max: 100000,
              }}

              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span
                      style={{
                        color:
                          darkMode
                            ? '#a9b8b0'
                            : undefined,
                      }}
                    >
                      ₦
                    </span>
                  </InputAdornment>
                ),
              }}

              sx={{
                '& .MuiOutlinedInput-root':
                  {
                    borderRadius: 3,

                    backgroundColor:
                      darkMode
                        ? '#15231c'
                        : undefined,

                    '& fieldset': {
                      borderColor:
                        darkMode
                          ? '#3a5147'
                          : undefined,
                    },

                    '&.Mui-focused fieldset':
                      {
                        borderColor:
                          '#176b45',
                      },
                  },

                '& .MuiOutlinedInput-input':
                  {
                    color:
                      darkMode
                        ? '#f3f8f5'
                        : undefined,
                  },

                '& .MuiInputLabel-root':
                  {
                    color:
                      darkMode
                        ? '#a9b8b0'
                        : undefined,
                  },

                '& .MuiInputLabel-root.Mui-focused':
                  {
                    color:
                      '#176b45',
                  },
              }}
            />

            {/* SELECTED AMOUNT */}

            {selectedAmount > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 3,

                  backgroundColor:
                    darkMode
                      ? '#193a2c'
                      : '#edf7f1',

                  border:
                    darkMode
                      ? '1px solid #294f3e'
                      : 'none',
                }}
              >

                <Stack
                  direction="row"
                  justifyContent="space-between"
                >

                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        darkMode
                          ? '#a9b8b0'
                          : '#607168',
                    }}
                  >
                    Purchase amount
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 900,
                      color:
                        darkMode
                          ? '#69d9a0'
                          : '#176b45',
                    }}
                  >
                    {formatMoney(
                      selectedAmount
                    )}
                  </Typography>

                </Stack>

              </Box>
            )}

          </CardContent>

        </Card>

        {/* ==================================================
            ERROR
        ================================================== */}

        {errorMessage && (
          <Alert
            severity="error"
            onClose={() =>
              setErrorMessage('')
            }
            sx={{
              mb: 2,
              borderRadius: 3,

              backgroundColor:
                darkMode
                  ? '#321b1b'
                  : undefined,

              color:
                darkMode
                  ? '#ffd7d7'
                  : undefined,

              border:
                darkMode
                  ? '1px solid #633333'
                  : undefined,

              '& .MuiAlert-message': {
                color:
                  darkMode
                    ? '#ffd7d7'
                    : undefined,
              },
            }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {successMessage && (
          <Alert
            severity="success"
            icon={
              <CheckCircleIcon />
            }
            onClose={closeSuccess}
            sx={{
              mb: 2,
              borderRadius: 3,

              backgroundColor:
                darkMode
                  ? '#153027'
                  : undefined,

              border:
                darkMode
                  ? '1px solid #294f3e'
                  : undefined,

              color:
                darkMode
                  ? '#dce9e3'
                  : undefined,

              '& .MuiAlert-message': {
                color:
                  darkMode
                    ? '#dce9e3'
                    : undefined,
              },

              '& .MuiAlert-icon': {
                color:
                  darkMode
                    ? '#69d9a0'
                    : undefined,
              },
            }}
          >

            <Typography
              sx={{
                fontWeight: 800,

                color:
                  darkMode
                    ? '#f3f8f5'
                    : undefined,
              }}
            >
              {successMessage}
            </Typography>

            {transactionReference && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.5,

                  color:
                    darkMode
                      ? '#a9b8b0'
                      : undefined,
                }}
              >
                Reference:{' '}
                {transactionReference}
              </Typography>
            )}

          </Alert>
        )}

        {/* ==================================================
            BUY BUTTON
        ================================================== */}

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={
            handleBuyAirtime
          }
          disabled={loading}
          sx={{
            minHeight: 56,
            borderRadius: 3.5,
            textTransform:
              'none',
            fontSize: '1rem',
            fontWeight: 900,

            backgroundColor:
              '#176b45',

            boxShadow:
              '0 8px 20px rgba(23, 107, 69, 0.18)',

            '&:hover': {
              backgroundColor:
                '#125b3a',
            },
          }}
        >

          {loading ? (
            <CircularProgress
              size={24}
              sx={{
                color:
                  '#ffffff',
              }}
            />
          ) : (
            `Buy ${network} Airtime`
          )}

        </Button>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',

            color:
              darkMode
                ? '#82958b'
                : '#7b8982',

            mt: 1.5,
          }}
        >
          Your Transaction PIN will be required to
          complete this purchase.
        </Typography>

      </Container>

      {/* =====================================================
          TRANSACTION PIN DIALOG
      ===================================================== */}

      <Dialog
        open={
          showTransactionPin
        }
        onClose={() => {
          if (!loading) {
            setShowTransactionPin(
              false
            );

            setTransactionPin(
              ''
            );

            setTransactionPinError(
              ''
            );
          }
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,

            backgroundColor:
              darkMode
                ? '#101c16'
                : '#ffffff',

            color:
              darkMode
                ? '#f3f8f5'
                : '#14251e',
          },
        }}
      >

        <DialogTitle
          sx={{
            fontWeight: 900,

            color:
              darkMode
                ? '#f3f8f5'
                : '#183d2d',
          }}
        >
          Confirm Airtime Purchase
        </DialogTitle>

        <DialogContent>

          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 3,

              backgroundColor:
                darkMode
                  ? '#193a2c'
                  : '#edf7f1',

              border:
                darkMode
                  ? '1px solid #294f3e'
                  : 'none',
            }}
          >

            <Stack
              spacing={0.7}
            >

              <Stack
                direction="row"
                justifyContent="space-between"
              >

                <Typography
                  variant="body2"
                  sx={{
                    color:
                      darkMode
                        ? '#a9b8b0'
                        : undefined,
                  }}
                >
                  Network
                </Typography>

                <Typography
                  fontWeight={800}
                  sx={{
                    color:
                      darkMode
                        ? '#f3f8f5'
                        : undefined,
                  }}
                >
                  {network}
                </Typography>

              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
              >

                <Typography
                  variant="body2"
                  sx={{
                    color:
                      darkMode
                        ? '#a9b8b0'
                        : undefined,
                  }}
                >
                  Phone
                </Typography>

                <Typography
                  fontWeight={800}
                  sx={{
                    color:
                      darkMode
                        ? '#f3f8f5'
                        : undefined,
                  }}
                >
                  {cleanPhoneNumber(
                    phone
                  )}
                </Typography>

              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
              >

                <Typography
                  variant="body2"
                  sx={{
                    color:
                      darkMode
                        ? '#a9b8b0'
                        : undefined,
                  }}
                >
                  Amount
                </Typography>

                <Typography
                  fontWeight={900}
                  sx={{
                    color:
                      darkMode
                        ? '#69d9a0'
                        : '#176b45',
                  }}
                >
                  {formatMoney(
                    selectedAmount
                  )}
                </Typography>

              </Stack>

            </Stack>

          </Box>

          <TextField
            fullWidth
            autoFocus
            label="Transaction PIN"
            value={
              transactionPin
            }
            onChange={(
              event
            ) => {
              const value =
                event.target.value
                  .replace(
                    /\D/g,
                    ''
                  )
                  .slice(
                    0,
                    4
                  );

              setTransactionPin(
                value
              );

              setTransactionPinError(
                ''
              );
            }}
            type="password"
            inputMode="numeric"
            placeholder="••••"
            error={Boolean(
              transactionPinError
            )}
            helperText={
              transactionPinError
            }

            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon
                    sx={{
                      color:
                        '#176b45',
                    }}
                  />
                </InputAdornment>
              ),
            }}

            sx={{
              '& .MuiOutlinedInput-root':
                {
                  borderRadius: 3,

                  backgroundColor:
                    darkMode
                      ? '#15231c'
                      : undefined,

                  '& fieldset': {
                    borderColor:
                      darkMode
                        ? '#3a5147'
                        : undefined,
                  },

                  '&.Mui-focused fieldset':
                    {
                      borderColor:
                        '#176b45',
                    },
                },

              '& .MuiOutlinedInput-input':
                {
                  color:
                    darkMode
                      ? '#f3f8f5'
                      : undefined,
                },

              '& .MuiInputLabel-root':
                {
                  color:
                    darkMode
                      ? '#a9b8b0'
                      : undefined,
                },

              '& .MuiInputLabel-root.Mui-focused':
                {
                  color:
                    '#176b45',
                },

              '& .MuiFormHelperText-root':
                {
                  color:
                    transactionPinError
                      ? undefined
                      : darkMode
                        ? '#82958b'
                        : undefined,
                },
            }}
          />

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,

              color:
                darkMode
                  ? '#82958b'
                  : '#7b8982',
            }}
          >
            Enter your 4-digit Transaction PIN to
            authorize this payment.
          </Typography>

        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
          }}
        >

          <Button
            onClick={() => {
              if (!loading) {
                setShowTransactionPin(
                  false
                );

                setTransactionPin(
                  ''
                );

                setTransactionPinError(
                  ''
                );
              }
            }}
            disabled={loading}
            sx={{
              color:
                darkMode
                  ? '#a9b8b0'
                  : '#64746c',

              textTransform:
                'none',

              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              verifyTransactionPinAndPurchase
            }
            disabled={
              loading ||
              transactionPin.length !==
                4
            }
            sx={{
              backgroundColor:
                '#176b45',

              borderRadius: 2.5,
              px: 3,

              textTransform:
                'none',

              fontWeight: 800,

              '&:hover': {
                backgroundColor:
                  '#125b3a',
              },
            }}
          >

            {loading ? (
              <CircularProgress
                size={22}
                sx={{
                  color:
                    '#ffffff',
                }}
              />
            ) : (
              'Confirm Purchase'
            )}

          </Button>

        </DialogActions>

      </Dialog>

    </Box>
  );
};

export default Airtime;
