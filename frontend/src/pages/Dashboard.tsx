import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  Add,
  ArrowBack,
  ArrowForward,
  ArrowUpward,
  AccountBalance,
  BarChart,
  CheckCircle,
  Close,
  ExpandMore,
  Home,
  Lock,
  MoreHoriz,
  NotificationsNone,
  PhoneAndroid,
  ReceiptLong,
  SportsSoccer,
  SwapVert,
  Tv,
  Visibility,
  VisibilityOff,
  Wallet as WalletIcon,
} from '@mui/icons-material';

type Service =
  | 'to-bank'
  | 'withdraw'
  | 'airtime'
  | 'data'
  | 'betting'
  | 'tv'
  | 'bill'
  | 'more'
  | null;

interface ServiceItem {
  id: Exclude<Service, null>;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const Dashboard: React.FC = () => {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeService, setActiveService] = useState<Service>(null);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  const userName = 'Harrison';

  /*
   * Nigerian banks and payment institutions.
   * OPay is intentionally included under "To Bank".
   */
  const banks = [
    'Access Bank',
    'Citibank Nigeria',
    'Ecobank Nigeria',
    'Fidelity Bank',
    'First Bank of Nigeria',
    'First City Monument Bank (FCMB)',
    'Globus Bank',
    'Guaranty Trust Bank (GTBank)',
    'Heritage Bank',
    'Jaiz Bank',
    'Keystone Bank',
    'Kuda Bank',
    'Moniepoint',
    'Opay',
    'Parallex Bank',
    'Polaris Bank',
    'Premium Trust Bank',
    'Providus Bank',
    'Stanbic IBTC Bank',
    'Standard Chartered Bank',
    'Sterling Bank',
    'SunTrust Bank',
    'Taj Bank',
    'Union Bank',
    'United Bank for Africa (UBA)',
    'Unity Bank',
    'Wema Bank',
    'Zenith Bank',
  ];

  const filteredBanks = useMemo(() => {
    const search = bankSearch.trim().toLowerCase();

    if (!search) {
      return banks;
    }

    return banks.filter((bank) =>
      bank.toLowerCase().includes(search)
    );
  }, [bankSearch]);

  const services: ServiceItem[] = [
    {
      id: 'to-bank',
      title: 'To Bank',
      description: 'Send to any bank',
      icon: <AccountBalance />,
    },
    {
      id: 'withdraw',
      title: 'Withdraw',
      description: 'Withdraw funds',
      icon: <ArrowUpward />,
    },
    {
      id: 'airtime',
      title: 'Airtime',
      description: 'Buy airtime',
      icon: <PhoneAndroid />,
    },
    {
      id: 'data',
      title: 'Data',
      description: 'Buy data',
      icon: <SwapVert />,
    },
    {
      id: 'betting',
      title: 'Betting',
      description: 'Fund your bets',
      icon: <SportsSoccer />,
    },
    {
      id: 'tv',
      title: 'TV',
      description: 'Pay TV bills',
      icon: <Tv />,
    },
    {
      id: 'bill',
      title: 'Bill Payment',
      description: 'Pay your bills',
      icon: <ReceiptLong />,
    },
    {
      id: 'more',
      title: 'More',
      description: 'More services',
      icon: <MoreHoriz />,
    },
  ];

  const openService = (service: Service) => {
    setActiveService(service);
  };

  const closeService = () => {
    setActiveService(null);
    setBankSearch('');
    setSelectedBank('');
  };

  const handleAddFunds = () => {
    if (!amount.trim()) {
      return;
    }

    setAddFundsOpen(false);
    setAmount('');
  };

  /*
   * Shared styling
   */
  const pageBackground = '#f5f8f7';
  const primaryGreen = '#087f5b';
  const darkGreen = '#075b45';
  const lightGreen = '#e9f8f2';
  const textDark = '#102a2a';
  const textMuted = '#718096';

  /*
   * SERVICE SCREEN
   */
  if (activeService) {
    const active = services.find(
      (item) => item.id === activeService
    );

    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: pageBackground,
          pb: 4,
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 3 }}
          >
            <IconButton
              onClick={closeService}
              sx={{
                backgroundColor: '#ffffff',
                border: '1px solid #e6eeeb',
              }}
            >
              <ArrowBack />
            </IconButton>

            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 800,
                color: textDark,
              }}
            >
              {active?.title}
            </Typography>
          </Stack>

          {activeService === 'to-bank' && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid #e4eee9',
                backgroundColor: '#ffffff',
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: textDark,
                    }}
                  >
                    Send money to a bank
                  </Typography>

                  <Typography
                    sx={{
                      color: textMuted,
                      mt: 0.5,
                    }}
                  >
                    Search and select the bank you want to pay.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  value={bankSearch}
                  onChange={(event) =>
                    setBankSearch(event.target.value)
                  }
                  placeholder="Search bank"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountBalance />
                      </InputAdornment>
                    ),
                  }}
                />

                {selectedBank && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: lightGreen,
                      border: '1px solid #ccecdf',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: textMuted,
                      }}
                    >
                      Selected bank
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: darkGreen,
                      }}
                    >
                      {selectedBank}
                    </Typography>
                  </Paper>
                )}

                <Box
                  sx={{
                    maxHeight: 430,
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  <Stack spacing={1}>
                    {filteredBanks.map((bank) => (
                      <Button
                        key={bank}
                        fullWidth
                        onClick={() => setSelectedBank(bank)}
                        sx={{
                          justifyContent: 'space-between',
                          textTransform: 'none',
                          color: textDark,
                          backgroundColor:
                            selectedBank === bank
                              ? lightGreen
                              : '#f8faf9',
                          borderRadius: 3,
                          p: 1.7,
                          '&:hover': {
                            backgroundColor: lightGreen,
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              backgroundColor: '#dff5ec',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: primaryGreen,
                            }}
                          >
                            <AccountBalance fontSize="small" />
                          </Box>

                          <Typography
                            sx={{
                              fontWeight: 700,
                              textAlign: 'left',
                            }}
                          >
                            {bank}
                          </Typography>
                        </Stack>

                        <ArrowForward fontSize="small" />
                      </Button>
                    ))}

                    {filteredBanks.length === 0 && (
                      <Typography
                        sx={{
                          textAlign: 'center',
                          py: 4,
                          color: textMuted,
                        }}
                      >
                        No bank found.
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {selectedBank && (
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{
                      py: 1.5,
                      borderRadius: 3,
                      backgroundColor: primaryGreen,
                      textTransform: 'none',
                      fontWeight: 800,
                      '&:hover': {
                        backgroundColor: darkGreen,
                      },
                    }}
                  >
                    Continue with {selectedBank}
                  </Button>
                )}
              </Stack>
            </Paper>
          )}

          {activeService !== 'to-bank' && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                border: '1px solid #e4eee9',
                backgroundColor: '#ffffff',
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 78,
                  height: 78,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: 3,
                  backgroundColor: lightGreen,
                  color: primaryGreen,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active?.icon}
              </Box>

              <Typography
                sx={{
                  fontSize: 25,
                  fontWeight: 800,
                  color: textDark,
                }}
              >
                {active?.title}
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: textMuted,
                  lineHeight: 1.6,
                }}
              >
                {active?.description}
              </Typography>

              <Typography
                sx={{
                  mt: 3,
                  color: textMuted,
                }}
              >
                This service is ready to be connected to your
                transaction system.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 3,
                  backgroundColor: primaryGreen,
                  textTransform: 'none',
                  fontWeight: 800,
                  '&:hover': {
                    backgroundColor: darkGreen,
                  },
                }}
              >
                Continue
              </Button>
            </Paper>
          )}
        </Container>
      </Box>
    );
  }

  /*
   * MAIN DASHBOARD
   */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: pageBackground,
        color: textDark,
        pb: { xs: 10, sm: 4 },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #edf2f0',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: 1.5,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
            >
              <Box
                sx={{
                  width: { xs: 48, sm: 54 },
                  height: { xs: 48, sm: 54 },
                  borderRadius: 2.5,
                  backgroundColor: '#079669',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: { xs: 26, sm: 30 },
                  fontWeight: 900,
                }}
              >
                Z
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: { xs: 20, sm: 24 },
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#073b32',
                  }}
                >
                  Zenimonies
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: 9, sm: 11 },
                    letterSpacing: 1.2,
                    color: '#9aa6a3',
                    mt: 0.4,
                  }}
                >
                  DIGITAL BANKING
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={{ xs: 1, sm: 2 }}
            >
              <IconButton>
                <NotificationsNone />
              </IconButton>

              <Box
                sx={{
                  width: 1,
                  height: 28,
                  backgroundColor: '#dce5e1',
                }}
              />

              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  backgroundColor: '#e8eff2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  color: textDark,
                }}
              >
                H
              </Box>

              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  fontWeight: 800,
                }}
              >
                {userName}
              </Typography>

              <ExpandMore />
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 3, md: 4 },
        }}
      >
        {/* WELCOME */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              sx={{
                color: '#737e91',
                fontSize: { xs: 16, sm: 19 },
              }}
            >
              Welcome back,
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 36, sm: 46 },
                fontWeight: 900,
                lineHeight: 1.05,
                color: '#102033',
              }}
            >
              {userName}
            </Typography>

            <Typography
              sx={{
                mt: 0.7,
                color: '#737e91',
                fontSize: { xs: 16, sm: 19 },
              }}
            >
              Here's your financial overview.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              px: 2.2,
              py: 1.1,
              borderRadius: 5,
              backgroundColor: '#e9f9f3',
              border: '1px solid #ccefe1',
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <Box
                sx={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  backgroundColor: primaryGreen,
                }}
              />

              <Typography
                sx={{
                  color: '#075b45',
                  fontWeight: 800,
                  fontSize: { xs: 13, sm: 15 },
                }}
              >
                Email & phone verified
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        {/* BALANCE CARD */}
        <Card
          elevation={0}
          sx={{
            borderRadius: { xs: 4, sm: 5 },
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, #056b4d 0%, #07865f 58%, #0aa06e 100%)',
            color: '#ffffff',
            mb: 3,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.04)',
              right: -80,
              top: -100,
            }}
          />

          <CardContent
            sx={{
              position: 'relative',
              p: { xs: 3, sm: 4 },
              '&:last-child': {
                pb: { xs: 3, sm: 4 },
              },
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={3}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: { xs: 16, sm: 19 },
                    opacity: 0.85,
                  }}
                >
                  Available Balance
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    fontSize: { xs: 38, sm: 50 },
                    fontWeight: 900,
                    letterSpacing: -1.5,
                  }}
                >
                  {balanceVisible ? '₦0.00' : '₦••••'}
                </Typography>
              </Box>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
              >
                <Button
                  onClick={() =>
                    setBalanceVisible((current) => !current)
                  }
                  startIcon={
                    balanceVisible ? (
                      <Visibility />
                    ) : (
                      <VisibilityOff />
                    )
                  }
                  sx={{
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 3,
                    px: 2,
                    textTransform: 'none',
                    fontWeight: 800,
                    minWidth: 120,
                  }}
                >
                  {balanceVisible ? 'Hide' : 'Show'}
                </Button>

                <Button
                  onClick={() => setAddFundsOpen(true)}
                  endIcon={<ArrowForward />}
                  startIcon={<Add />}
                  sx={{
                    backgroundColor: '#ffffff',
                    color: '#075b45',
                    borderRadius: 3,
                    px: { xs: 2.5, sm: 3.5 },
                    py: 1.6,
                    textTransform: 'none',
                    fontWeight: 900,
                    fontSize: 16,
                    minWidth: { xs: '100%', sm: 210 },
                    '&:hover': {
                      backgroundColor: '#f1fffa',
                    },
                  }}
                >
                  Add Money
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* SERVICES */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: 4, sm: 5 },
            p: { xs: 2, sm: 3, md: 4 },
            backgroundColor: '#ffffff',
            border: '1px solid #e9efed',
            mb: 3,
          }}
        >
          <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
            {services.map((service) => (
              <Grid
                item
                xs={4}
                sm={3}
                md={3}
                key={service.id}
              >
                <Button
                  fullWidth
                  onClick={() => openService(service.id)}
                  sx={{
                    minHeight: { xs: 125, sm: 145 },
                    p: { xs: 1, sm: 1.5 },
                    borderRadius: 3,
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    color: textDark,
                    '&:hover': {
                      backgroundColor: '#f3fbf8',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 58, sm: 72 },
                      height: { xs: 58, sm: 72 },
                      borderRadius: 3,
                      backgroundColor: lightGreen,
                      color: primaryGreen,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.1,
                    }}
                  >
                    {React.cloneElement(
                      service.icon as React.ReactElement,
                      {
                        sx: {
                          fontSize: { xs: 28, sm: 34 },
                        },
                      }
                    )}
                  </Box>

                  <Typography
                    sx={{
                      fontSize: { xs: 13, sm: 17 },
                      fontWeight: 800,
                      lineHeight: 1.2,
                    }}
                  >
                    {service.title}
                  </Typography>

                  <Typography
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      color: textMuted,
                      fontSize: 12,
                      mt: 0.4,
                    }}
                  >
                    {service.description}
                  </Typography>
                </Button>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* ACCOUNT VERIFICATION */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: 4, sm: 5 },
            p: { xs: 2, sm: 2.5 },
            background:
              'linear-gradient(90deg, #effbf7 0%, #f8fffc 100%)',
            border: '1px solid #dff1e9',
            mb: 3,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
            >
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: 3,
                  backgroundColor: '#e2f7ef',
                  color: primaryGreen,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle fontSize="large" />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: { xs: 17, sm: 21 },
                    fontWeight: 900,
                    color: '#075b45',
                  }}
                >
                  Account Verification
                </Typography>

                <Typography
                  sx={{
                    color: textMuted,
                    fontSize: { xs: 13, sm: 16 },
                  }}
                >
                  Complete your KYC to increase your limits.
                </Typography>
              </Box>
            </Stack>

            <Button
              onClick={() => {
                window.location.href = '/kyc';
              }}
              endIcon={<ArrowForward />}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                backgroundColor: primaryGreen,
                color: '#ffffff',
                borderRadius: 3,
                px: 3,
                py: 1.4,
                textTransform: 'none',
                fontWeight: 800,
                '&:hover': {
                  backgroundColor: darkGreen,
                },
              }}
            >
              View Verification
            </Button>
          </Stack>
        </Paper>

        {/* BOTTOM NAVIGATION */}
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            borderRadius: '24px 24px 0 0',
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderTop: '1px solid #edf1ef',
          }}
        >
          <Container maxWidth="lg">
            <Grid container>
              <Grid item xs={3}>
                <Button
                  fullWidth
                  sx={{
                    py: 1.3,
                    flexDirection: 'column',
                    color: primaryGreen,
                    textTransform: 'none',
                  }}
                >
                  <Home />
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Home
                  </Typography>
                </Button>
              </Grid>

              <Grid item xs={3}>
                <Button
                  fullWidth
                  onClick={() => openService('bill')}
                  sx={{
                    py: 1.3,
                    flexDirection: 'column',
                    color: '#718096',
                    textTransform: 'none',
                  }}
                >
                  <SwapVert />
                  <Typography sx={{ fontSize: 12 }}>
                    Transactions
                  </Typography>
                </Button>
              </Grid>

              <Grid item xs={3}>
                <Button
                  fullWidth
                  onClick={() => setAddFundsOpen(true)}
                  sx={{
                    py: 1.3,
                    flexDirection: 'column',
                    color: '#718096',
                    textTransform: 'none',
                  }}
                >
                  <WalletIcon />
                  <Typography sx={{ fontSize: 12 }}>
                    Wallet
                  </Typography>
                </Button>
              </Grid>

              <Grid item xs={3}>
                <Button
                  fullWidth
                  onClick={() => {
                    window.location.href = '/profile';
                  }}
                  sx={{
                    py: 1.3,
                    flexDirection: 'column',
                    color: '#718096',
                    textTransform: 'none',
                  }}
                >
                  <Typography
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '2px solid currentColor',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    H
                  </Typography>

                  <Typography sx={{ fontSize: 12 }}>
                    Profile
                  </Typography>
                </Button>
              </Grid>
            </Grid>
          </Container>
        </Paper>
      </Container>

      {/* ADD FUNDS DIALOG */}
      <Dialog
        open={addFundsOpen}
        onClose={() => setAddFundsOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
          }}
        >
          Add Money
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography
              sx={{
                color: textMuted,
                fontSize: 14,
              }}
            >
              Enter the amount you want to add to your
              Zenimonies account.
            </Typography>

            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    ₦
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setAddFundsOpen(false)}
            sx={{
              textTransform: 'none',
              color: textMuted,
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleAddFunds}
            variant="contained"
            sx={{
              backgroundColor: primaryGreen,
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: 2.5,
              px: 3,
              '&:hover': {
                backgroundColor: darkGreen,
              },
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
