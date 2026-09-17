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

type Network = 'MTN' | 'Airtel' | 'Glo' | '9mobile';

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
  { amount: 100, label: '₦100' },
  { amount: 200, label: '₦200' },
  { amount: 500, label: '₦500' },
  { amount: 1000, label: '₦1,000' },
  { amount: 2000, label: '₦2,000' },
  { amount: 5000, label: '₦5,000' },
];

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const Airtime: React.FC = () => {
  const navigate = useNavigate();

  const [network, setNetwork] = useState<Network>('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const [showTransactionPin, setShowTransactionPin] =
    useState(false);

  const [transactionPin, setTransactionPin] = useState('');
  const [transactionPinError, setTransactionPinError] =
    useState('');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [transactionReference, setTransactionReference] =
    useState('');

  const selectedAmount = useMemo(() => {
    if (amount) {
      return Number(amount);
    }

    if (customAmount) {
      return Number(customAmount);
    }

    return 0;
  }, [amount, customAmount]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(value);

  const cleanPhoneNumber = (value: string) => {
    let cleaned = value.replace(/\D/g, '');

    if (cleaned.startsWith('234')) {
      cleaned = `0${cleaned.slice(3)}`;
    }

    return cleaned;
  };

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    setPhone(cleanPhoneNumber(value));
    setErrorMessage('');
  };

  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
    setCustomAmount('');
    setErrorMessage('');
  };

  const handleCustomAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value.replace(/\D/g, '');

    setCustomAmount(value);
    setAmount('');
    setErrorMessage('');
  };

  const validatePurchase = () => {
    const cleanPhone = cleanPhoneNumber(phone);

    if (!cleanPhone) {
      setErrorMessage('Please enter a phone number.');
      return false;
    }

    if (!/^0[7-9][0-1][0-9]{8}$/.test(cleanPhone)) {
      setErrorMessage(
        'Please enter a valid Nigerian phone number.'
      );
      return false;
    }

    if (!selectedAmount || selectedAmount <= 0) {
      setErrorMessage('Please select or enter an airtime amount.');
      return false;
    }

    if (selectedAmount < 50) {
      setErrorMessage(
        'Minimum airtime purchase is ₦50.'
      );
      return false;
    }

    if (selectedAmount > 100000) {
      setErrorMessage(
        'Maximum airtime purchase is ₦100,000.'
      );
      return false;
    }

    return true;
  };

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

  const verifyTransactionPinAndPurchase = async () => {
    if (!/^\d{4}$/.test(transactionPin)) {
      setTransactionPinError(
        'Transaction PIN must be exactly 4 digits.'
      );
      return;
    }

    setTransactionPinError('');
    setLoading(true);

    try {
      const token =
        localStorage.getItem('zenimonies_token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token');

      if (!token) {
        setShowTransactionPin(false);
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/airtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          network,
          phone: cleanPhoneNumber(phone),
          amount: selectedAmount,
          transaction_pin: transactionPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setShowTransactionPin(false);
          navigate('/login');
          return;
        }

        if (response.status === 423) {
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
          data?.transaction?.reference ||
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
      console.error('Airtime purchase error:', error);

      setTransactionPinError(
        'Unable to complete the purchase right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const closeSuccess = () => {
    setSuccessMessage('');
    setTransactionReference('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f7faf8',
        pb: 10,
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          pt: { xs: 2, sm: 3 },
        }}
      >
        {/* HEADER */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2.5 }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                color: '#176b45',
                backgroundColor: '#edf7f1',
                '&:hover': {
                  backgroundColor: '#e0f0e7',
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
                  color: '#123b29',
                  lineHeight: 1.1,
                }}
              >
                Airtime
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#718078',
                  mt: 0.4,
                }}
              >
                Buy airtime instantly
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={() => navigate('/transactions')}
            sx={{
              color: '#176b45',
              backgroundColor: '#edf7f1',
              '&:hover': {
                backgroundColor: '#e0f0e7',
              },
            }}
          >
            <HistoryIcon />
          </IconButton>
        </Stack>

        {/* NETWORK SELECTOR */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #e4eee8',
            backgroundColor: '#ffffff',
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                color: '#183d2d',
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
              {NETWORKS.map((item) => {
                const selected =
                  network === item.name;

                return (
                  <Paper
                    key={item.name}
                    onClick={() => {
                      setNetwork(item.name);
                      setErrorMessage('');
                    }}
                    elevation={0}
                    sx={{
                      minWidth: 82,
                      flexShrink: 0,
                      cursor: 'pointer',
                      borderRadius: 3,
                      border: selected
                        ? '2px solid #176b45'
                        : '1px solid #e1ebe5',
                      backgroundColor: selected
                        ? '#edf7f1'
                        : '#ffffff',
                      p: 1.2,
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        mx: 'auto',
                        mb: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={item.logo}
                        alt={`${item.name} logo`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: selected
                          ? '#176b45'
                          : '#4f6258',
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* PHONE NUMBER */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #e4eee8',
            backgroundColor: '#ffffff',
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                color: '#183d2d',
                mb: 1.5,
              }}
            >
              Mobile Number
            </Typography>

            <TextField
              fullWidth
              value={phone}
              onChange={handlePhoneChange}
              placeholder="08012345678"
              inputMode="numeric"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidIcon
                      sx={{ color: '#176b45' }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: '#fafcfb',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* QUICK AMOUNTS */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #e4eee8',
            backgroundColor: '#ffffff',
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: '#183d2d',
                }}
              >
                Select Amount
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: '#718078',
                }}
              >
                Choose an amount
              </Typography>
            </Stack>

            <Grid container spacing={1.2}>
              {QUICK_AMOUNTS.map((item) => {
                const selected =
                  Number(amount) === item.amount;

                return (
                  <Grid
                    item
                    xs={4}
                    sm={2}
                    key={item.amount}
                  >
                    <Button
                      fullWidth
                      onClick={() =>
                        handleQuickAmount(item.amount)
                      }
                      sx={{
                        minHeight: 58,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 800,
                        border: selected
                          ? '2px solid #176b45'
                          : '1px solid #e0ebe5',
                        backgroundColor: selected
                          ? '#edf7f1'
                          : '#ffffff',
                        color: selected
                          ? '#176b45'
                          : '#40554a',
                        '&:hover': {
                          backgroundColor: '#edf7f1',
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <TextField
              fullWidth
              label="Custom Amount"
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder="Enter amount"
              type="number"
              inputProps={{
                min: 50,
                max: 100000,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    ₦
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: '#fafcfb',
                },
              }}
            />

            {selectedAmount > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 3,
                  backgroundColor: '#edf7f1',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#607168' }}
                  >
                    Purchase amount
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 900,
                      color: '#176b45',
                    }}
                  >
                    {formatMoney(selectedAmount)}
                  </Typography>
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ERROR */}
        {errorMessage && (
          <Alert
            severity="error"
            onClose={() => setErrorMessage('')}
            sx={{
              mb: 2,
              borderRadius: 3,
            }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* SUCCESS */}
        {successMessage && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            onClose={closeSuccess}
            sx={{
              mb: 2,
              borderRadius: 3,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
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
                }}
              >
                Reference: {transactionReference}
              </Typography>
            )}
          </Alert>
        )}

        {/* BUY BUTTON */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleBuyAirtime}
          disabled={loading}
          sx={{
            minHeight: 56,
            borderRadius: 3.5,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 900,
            backgroundColor: '#176b45',
            boxShadow:
              '0 8px 20px rgba(23, 107, 69, 0.18)',
            '&:hover': {
              backgroundColor: '#125b3a',
            },
          }}
        >
          {loading ? (
            <CircularProgress
              size={24}
              sx={{ color: '#ffffff' }}
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
            color: '#7b8982',
            mt: 1.5,
          }}
        >
          Your Transaction PIN will be required to
          complete this purchase.
        </Typography>
      </Container>

      {/* TRANSACTION PIN DIALOG */}
      <Dialog
        open={showTransactionPin}
        onClose={() => {
          if (!loading) {
            setShowTransactionPin(false);
            setTransactionPin('');
            setTransactionPinError('');
          }
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: '#183d2d',
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
              backgroundColor: '#edf7f1',
            }}
          >
            <Stack spacing={0.7}>
              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Network
                </Typography>

                <Typography fontWeight={800}>
                  {network}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Phone
                </Typography>

                <Typography fontWeight={800}>
                  {cleanPhoneNumber(phone)}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Amount
                </Typography>

                <Typography
                  fontWeight={900}
                  sx={{ color: '#176b45' }}
                >
                  {formatMoney(selectedAmount)}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <TextField
            fullWidth
            autoFocus
            label="Transaction PIN"
            value={transactionPin}
            onChange={(event) => {
              const value =
                event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 4);

              setTransactionPin(value);
              setTransactionPinError('');
            }}
            type="password"
            inputMode="numeric"
            placeholder="••••"
            error={Boolean(transactionPinError)}
            helperText={transactionPinError}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon
                    sx={{ color: '#176b45' }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              color: '#7b8982',
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
                setShowTransactionPin(false);
                setTransactionPin('');
                setTransactionPinError('');
              }
            }}
            disabled={loading}
            sx={{
              color: '#64746c',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={verifyTransactionPinAndPurchase}
            disabled={
              loading ||
              transactionPin.length !== 4
            }
            sx={{
              backgroundColor: '#176b45',
              borderRadius: 2.5,
              px: 3,
              textTransform: 'none',
              fontWeight: 800,
              '&:hover': {
                backgroundColor: '#125b3a',
              },
            }}
          >
            {loading ? (
              <CircularProgress
                size={22}
                sx={{ color: '#ffffff' }}
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
