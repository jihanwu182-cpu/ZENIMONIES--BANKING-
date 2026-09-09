import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  AccountBalance,
  Add,
  ArrowBack,
  ArrowForward,
  ArrowOutward,
  BarChart,
  CheckCircle,
  Close,
  ContentCopy,
  DataUsage,
  ExpandMore,
  GridView,
  Home,
  KeyboardArrowRight,
  Lock,
  Logout,
  MoreHoriz,
  NotificationsNone,
  Payments,
  PhoneAndroid,
  ReceiptLong,
  Search,
  SportsSoccer,
  Tv,
  Visibility,
  VisibilityOff,
  Wallet,
  SwapHoriz,
  PersonOutline,
} from '@mui/icons-material';

type ServiceType =
  | 'bank'
  | 'withdraw'
  | 'airtime'
  | 'data'
  | 'betting'
  | 'tv'
  | 'bills'
  | 'safebox'
  | 'more'
  | null;

interface Bank {
  name: string;
  shortName: string;
}

const banks: Bank[] = [
  { name: 'Access Bank', shortName: 'Access' },
  { name: 'Citibank Nigeria', shortName: 'Citibank' },
  { name: 'Ecobank Nigeria', shortName: 'Ecobank' },
  { name: 'Fidelity Bank', shortName: 'Fidelity' },
  { name: 'First Bank of Nigeria', shortName: 'FirstBank' },
  { name: 'First City Monument Bank', shortName: 'FCMB' },
  { name: 'Globus Bank', shortName: 'Globus' },
  { name: 'Guaranty Trust Bank', shortName: 'GTBank' },
  { name: 'Heritage Bank', shortName: 'Heritage' },
  { name: 'Jaiz Bank', shortName: 'Jaiz' },
  { name: 'Keystone Bank', shortName: 'Keystone' },
  { name: 'Kuda Bank', shortName: 'Kuda' },
  { name: 'Moniepoint', shortName: 'Moniepoint' },
  { name: 'OPay', shortName: 'OPay' },
  { name: 'Optimus Bank', shortName: 'Optimus' },
  { name: 'Parallex Bank', shortName: 'Parallex' },
  { name: 'Polaris Bank', shortName: 'Polaris' },
  { name: 'PremiumTrust Bank', shortName: 'PremiumTrust' },
  { name: 'Providus Bank', shortName: 'Providus' },
  { name: 'Stanbic IBTC Bank', shortName: 'Stanbic' },
  { name: 'Standard Chartered Bank', shortName: 'Standard Chartered' },
  { name: 'Sterling Bank', shortName: 'Sterling' },
  { name: 'SunTrust Bank', shortName: 'SunTrust' },
  { name: 'Titan Trust Bank', shortName: 'Titan' },
  { name: 'Union Bank of Nigeria', shortName: 'Union' },
  { name: 'United Bank for Africa', shortName: 'UBA' },
  { name: 'Unity Bank', shortName: 'Unity' },
  { name: 'Wema Bank', shortName: 'Wema' },
  { name: 'Zenith Bank', shortName: 'Zenith' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [service, setService] = useState<ServiceType>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('');
  const [dataPlan, setDataPlan] = useState('');
  const [tvProvider, setTvProvider] = useState('');
  const [smartCard, setSmartCard] = useState('');
  const [betAmount, setBetAmount] = useState('');

  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const filteredBanks = useMemo(() => {
    const search = bankSearch.trim().toLowerCase();

    if (!search) {
      return banks;
    }

    return banks.filter(
      (bank) =>
        bank.name.toLowerCase().includes(search) ||
        bank.shortName.toLowerCase().includes(search),
    );
  }, [bankSearch]);

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbar(true);
  };

  const openService = (type: ServiceType) => {
    setService(type);
    setBankSearch('');
    setSelectedBank(null);
    setAmount('');
    setAccountNumber('');
    setPhoneNumber('');
    setNetwork('');
    setDataPlan('');
    setTvProvider('');
    setSmartCard('');
    setBetAmount('');
  };

  const closeService = () => {
    setService(null);
  };

  const submitAction = (message: string) => {
    closeService();
    showMessage(message);
  };

  const serviceItems = [
    {
      title: 'To Bank',
      subtitle: 'Send to any bank',
      icon: <AccountBalance />,
      type: 'bank' as ServiceType,
    },
    {
      title: 'Withdraw',
      subtitle: 'Withdraw funds',
      icon: <ArrowOutward />,
      type: 'withdraw' as ServiceType,
    },
    {
      title: 'Airtime',
      subtitle: 'Buy airtime',
      icon: <BarChart />,
      type: 'airtime' as ServiceType,
    },
    {
      title: 'Data',
      subtitle: 'Buy data',
      icon: <DataUsage />,
      type: 'data' as ServiceType,
    },
    {
      title: 'Betting',
      subtitle: 'Fund your bets',
      icon: <SportsSoccer />,
      type: 'betting' as ServiceType,
    },
    {
      title: 'TV',
      subtitle: 'Pay TV bills',
      icon: <Tv />,
      type: 'tv' as ServiceType,
    },
    {
      title: 'Bills',
      subtitle: 'Pay your bills',
      icon: <ReceiptLong />,
      type: 'bills' as ServiceType,
    },
    {
      title: 'SafeBox',
      subtitle: 'Protect your money',
      icon: <Lock />,
      type: 'safebox' as ServiceType,
    },
    {
      title: 'More',
      subtitle: 'More services',
      icon: <GridView />,
      type: 'more' as ServiceType,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f8fafb 0%, #f4f7f7 50%, #ffffff 100%)',
        pb: {
          xs: 10,
          sm: 12,
        },
      }}
    >
      {/* =========================================================
          TOP HEADER
      ========================================================== */}

      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid #edf1ef',
          backgroundColor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1180,
            mx: 'auto',
            px: {
              xs: 2,
              sm: 3,
              md: 4,
            },
            py: {
              xs: 1.3,
              sm: 1.5,
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={{
              xs: 1,
              sm: 1.5,
            }}
          >
            <Box
              sx={{
                width: {
                  xs: 46,
                  sm: 52,
                },
                height: {
                  xs: 46,
                  sm: 52,
                },
                borderRadius: '14px',
                background:
                  'linear-gradient(145deg, #08a96c 0%, #078653 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: {
                  xs: 25,
                  sm: 29,
                },
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(7,134,83,0.18)',
              }}
            >
              Z
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: {
                    xs: 21,
                    sm: 25,
                  },
                  fontWeight: 800,
                  lineHeight: 1,
                  color: '#123c31',
                  letterSpacing: '-0.5px',
                }}
              >
                Zenimonies
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: {
                    xs: 9,
                    sm: 10,
                  },
                  fontWeight: 700,
                  color: '#8b949b',
                  letterSpacing: 1.4,
                }}
              >
                DIGITAL BANKING
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={{
              xs: 0.5,
              sm: 1.5,
            }}
          >
            <IconButton
              onClick={() => showMessage('You have no new notifications.')}
              sx={{
                color: '#52636b',
              }}
            >
              <NotificationsNone />
            </IconButton>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mx: {
                  xs: 0.5,
                  sm: 1,
                },
              }}
            />

            <Avatar
              sx={{
                width: {
                  xs: 38,
                  sm: 46,
                },
                height: {
                  xs: 38,
                  sm: 46,
                },
                backgroundColor: '#e8eef1',
                color: '#173d34',
                fontWeight: 700,
              }}
            >
              H
            </Avatar>

            <Box
              sx={{
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  color: '#182e39',
                }}
              >
                Harrison
              </Typography>
            </Box>

            <IconButton
              onClick={() => navigate('/profile')}
              sx={{
                color: '#65747c',
              }}
            >
              <ExpandMore />
            </IconButton>
          </Stack>
        </Box>
      </Paper>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}

      <Box
        sx={{
          maxWidth: 1180,
          mx: 'auto',
          px: {
            xs: 2,
            sm: 3,
            md: 4,
          },
          pt: {
            xs: 3,
            sm: 4,
            md: 5,
          },
        }}
      >
        {/* Welcome */}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: {
              xs: 'flex-start',
              md: 'center',
            },
            flexDirection: {
              xs: 'column',
              md: 'row',
            },
            gap: 2,
            mb: {
              xs: 2.5,
              sm: 3,
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: 18,
                  sm: 21,
                },
                color: '#687986',
                fontWeight: 500,
              }}
            >
              Welcome back,
            </Typography>

            <Typography
              sx={{
                mt: 0.1,
                fontSize: {
                  xs: 35,
                  sm: 43,
                  md: 48,
                },
                lineHeight: 1,
                fontWeight: 800,
                color: '#132536',
                letterSpacing: '-1.8px',
              }}
            >
              Harrison
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: {
                  xs: 16,
                  sm: 19,
                },
                color: '#71808b',
              }}
            >
              Here&apos;s your financial overview.
            </Typography>
          </Box>

          <Chip
            icon={
              <CheckCircle
                sx={{
                  fontSize: '18px !important',
                }}
              />
            }
            label="Tier 1 verified"
            sx={{
              alignSelf: {
                xs: 'flex-start',
                md: 'center',
              },
              height: 48,
              px: 1.5,
              borderRadius: 5,
              backgroundColor: '#e9faf3',
              color: '#126448',
              border: '1px solid #d3f1e4',
              fontWeight: 700,
              fontSize: 15,
            }}
          />
        </Box>

        {/* =========================================================
            BALANCE CARD
        ========================================================== */}

        <Card
          elevation={0}
          sx={{
            borderRadius: {
              xs: '25px',
              sm: '28px',
            },
            overflow: 'hidden',
            background:
              'radial-gradient(circle at 90% 15%, rgba(22,188,124,0.55) 0%, rgba(8,151,94,0.2) 28%, transparent 50%), linear-gradient(135deg, #08734e 0%, #05845a 50%, #0aa56d 100%)',
            color: '#ffffff',
            position: 'relative',
            minHeight: {
              xs: 245,
              sm: 265,
            },
            boxShadow: '0 16px 40px rgba(0,99,65,0.16)',
            mb: {
              xs: 2.5,
              sm: 3,
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              right: -100,
              top: -170,
              background: 'rgba(255,255,255,0.06)',
            }}
          />

          <CardContent
            sx={{
              position: 'relative',
              height: '100%',
              minHeight: {
                xs: 245,
                sm: 265,
              },
              p: {
                xs: 3,
                sm: 4,
                md: 4.5,
              },
              '&:last-child': {
                pb: {
                  xs: 3,
                  sm: 4,
                },
              },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: {
                      xs: 16,
                      sm: 19,
                    },
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.82)',
                  }}
                >
                  Available Balance
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    fontSize: {
                      xs: 40,
                      sm: 50,
                      md: 56,
                    },
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: '-2px',
                  }}
                >
                  {balanceVisible ? '₦0.00' : '₦••••••'}
                </Typography>
              </Box>

              <Button
                onClick={() => setBalanceVisible((value) => !value)}
                startIcon={
                  balanceVisible ? <Visibility /> : <VisibilityOff />
                }
                sx={{
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '15px',
                  px: {
                    xs: 1.5,
                    sm: 2,
                  },
                  py: 1,
                  minWidth: {
                    xs: 88,
                    sm: 105,
                  },
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                }}
              >
                {balanceVisible ? 'Hide' : 'Show'}
              </Button>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                mt: 3,
              }}
            >
              <Button
                onClick={() => submitAction('Add Funds is ready to use.')}
                endIcon={<KeyboardArrowRight />}
                startIcon={<Add />}
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#074d39',
                  borderRadius: '18px',
                  minHeight: {
                    xs: 58,
                    sm: 66,
                  },
                  px: {
                    xs: 2.5,
                    sm: 3.5,
                  },
                  minWidth: {
                    xs: 185,
                    sm: 235,
                  },
                  fontSize: {
                    xs: 15,
                    sm: 18,
                  },
                  fontWeight: 800,
                  textTransform: 'none',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  '&:hover': {
                    backgroundColor: '#f4fffa',
                  },
                }}
              >
                Add Money
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* =========================================================
            SERVICES
        ========================================================== */}

        <Card
          elevation={0}
          sx={{
            borderRadius: {
              xs: '24px',
              sm: '28px',
            },
            backgroundColor: '#ffffff',
            border: '1px solid #edf1ef',
            boxShadow: '0 8px 30px rgba(31,55,48,0.045)',
            mb: {
              xs: 2.5,
              sm: 3,
            },
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2,
                sm: 3,
                md: 3.5,
              },
              '&:last-child': {
                pb: {
                  xs: 2.5,
                  sm: 3.5,
                },
              },
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(3, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                columnGap: {
                  xs: 1,
                  sm: 2,
                  md: 4,
                },
                rowGap: {
                  xs: 2.5,
                  sm: 3.5,
                  md: 4,
                },
              }}
            >
              {serviceItems.map((item) => (
                <Box
                  key={item.title}
                  onClick={() => openService(item.type)}
                  sx={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    borderRadius: 3,
                    py: {
                      xs: 0.5,
                      sm: 1,
                    },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                    },
                    '&:active': {
                      transform: 'scale(0.97)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      mx: 'auto',
                      width: {
                        xs: 66,
                        sm: 78,
                        md: 86,
                      },
                      height: {
                        xs: 66,
                        sm: 78,
                        md: 86,
                      },
                      borderRadius: {
                        xs: '20px',
                        sm: '24px',
                      },
                      background:
                        'linear-gradient(145deg, #effcf7 0%, #e1f7ef 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#079260',
                      mb: {
                        xs: 0.9,
                        sm: 1.2,
                      },
                    }}
                  >
                    {React.cloneElement(item.icon, {
                      sx: {
                        fontSize: {
                          xs: 30,
                          sm: 37,
                        },
                      },
                    })}
                  </Box>

                  <Typography
                    sx={{
                      fontSize: {
                        xs: 14,
                        sm: 17,
                        md: 19,
                      },
                      fontWeight: 700,
                      color: '#162b36',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.4,
                      display: {
                        xs: 'none',
                        sm: 'block',
                      },
                      fontSize: 12,
                      color: '#849199',
                    }}
                  >
                    {item.subtitle}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* =========================================================
            VERIFICATION
        ========================================================== */}

        <Card
          elevation={0}
          sx={{
            borderRadius: {
              xs: '22px',
              sm: '25px',
            },
            border: '1px solid #dff1e9',
            background:
              'linear-gradient(100deg, #effbf6 0%, #ffffff 100%)',
            mb: 2,
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2,
                sm: 2.5,
                md: 3,
              },
              '&:last-child': {
                pb: {
                  xs: 2,
                  sm: 2.5,
                  md: 3,
                },
              },
            }}
          >
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              alignItems={{
                xs: 'flex-start',
                sm: 'center',
              }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.8}
              >
                <Box
                  sx={{
                    width: {
                      xs: 56,
                      sm: 68,
                    },
                    height: {
                      xs: 56,
                      sm: 68,
                    },
                    borderRadius: '18px',
                    backgroundColor: '#e1f7ef',
                    color: '#079260',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle
                    sx={{
                      fontSize: {
                        xs: 31,
                        sm: 38,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: 17,
                        sm: 21,
                      },
                      fontWeight: 800,
                      color: '#124b3a',
                    }}
                  >
                    Account Verification
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: {
                        xs: 13,
                        sm: 16,
                      },
                      color: '#72818b',
                    }}
                  >
                    Complete your KYC to increase your limits.
                  </Typography>
                </Box>
              </Stack>

              <Button
                onClick={() => navigate('/kyc')}
                endIcon={<ArrowForward />}
                sx={{
                  width: {
                    xs: '100%',
                    sm: 'auto',
                  },
                  minWidth: {
                    sm: 215,
                  },
                  minHeight: 54,
                  borderRadius: '16px',
                  backgroundColor: '#079260',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 15,
                  '&:hover': {
                    backgroundColor: '#067b52',
                  },
                }}
              >
                View Verification
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* =========================================================
          BOTTOM NAVIGATION
      ========================================================== */}

      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          borderTop: '1px solid #edf1ef',
          backgroundColor: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(15px)',
        }}
      >
        <Box
          sx={{
            maxWidth: 700,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            px: {
              xs: 1,
              sm: 2,
            },
            py: {
              xs: 0.8,
              sm: 1,
            },
          }}
        >
          <BottomNavItem
            active
            icon={<Home />}
            label="Home"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          <BottomNavItem
            icon={<SwapHoriz />}
            label="Transactions"
            onClick={() =>
              showMessage('Transactions section is being prepared.')
            }
          />

          <BottomNavItem
            icon={<Wallet />}
            label="Wallet"
            onClick={() => showMessage('Wallet section is being prepared.')}
          />

          <BottomNavItem
            icon={<PersonOutline />}
            label="Profile"
            onClick={() => navigate('/profile')}
          />
        </Box>
      </Paper>

      {/* =========================================================
          SERVICE DIALOG
      ========================================================== */}

      <Dialog
        open={service !== null}
        onClose={closeService}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            m: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            pt: 2.5,
            pb: 1.5,
            fontWeight: 800,
            color: '#14352d',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              sx={{
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              {service === 'bank' && 'Send to Bank'}
              {service === 'withdraw' && 'Withdraw Money'}
              {service === 'airtime' && 'Buy Airtime'}
              {service === 'data' && 'Buy Data'}
              {service === 'betting' && 'Betting'}
              {service === 'tv' && 'Pay TV'}
              {service === 'bills' && 'Pay Bills'}
              {service === 'safebox' && 'SafeBox'}
              {service === 'more' && 'More Services'}
            </Typography>

            <IconButton onClick={closeService}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1 }}>
          {/* BANK */}

          {service === 'bank' && (
            <Box>
              {!selectedBank ? (
                <>
                  <TextField
                    fullWidth
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Search for a bank"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 1.5,
                    }}
                  />

                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 350,
                      overflowY: 'auto',
                      borderRadius: 3,
                    }}
                  >
                    <List disablePadding>
                      {filteredBanks.map((bank) => (
                        <ListItemButton
                          key={bank.name}
                          onClick={() => setSelectedBank(bank)}
                          sx={{
                            py: 1.5,
                            borderBottom: '1px solid #f0f2f2',
                          }}
                        >
                          <Avatar
                            sx={{
                              mr: 1.5,
                              backgroundColor: '#e8f8f1',
                              color: '#078b5d',
                              fontWeight: 800,
                              width: 42,
                              height: 42,
                              fontSize: 13,
                            }}
                          >
                            {bank.shortName.slice(0, 2).toUpperCase()}
                          </Avatar>

                          <ListItemText
                            primary={bank.name}
                            primaryTypographyProps={{
                              fontWeight: 650,
                              color: '#21353d',
                            }}
                          />

                          <KeyboardArrowRight
                            sx={{
                              color: '#8b979d',
                            }}
                          />
                        </ListItemButton>
                      ))}

                      {filteredBanks.length === 0 && (
                        <Box
                          sx={{
                            py: 5,
                            textAlign: 'center',
                          }}
                        >
                          <Typography color="text.secondary">
                            No bank found.
                          </Typography>
                        </Box>
                      )}
                    </List>
                  </Paper>
                </>
              ) : (
                <Stack spacing={2}>
                  <Button
                    startIcon={<ArrowBack />}
                    onClick={() => setSelectedBank(null)}
                    sx={{
                      justifyContent: 'flex-start',
                      color: '#078b5d',
                      textTransform: 'none',
                    }}
                  >
                    Choose another bank
                  </Button>

                  <Alert
                    severity="success"
                    sx={{
                      borderRadius: 3,
                    }}
                  >
                    {selectedBank.name} selected
                  </Alert>

                  <TextField
                    fullWidth
                    label="Account Number"
                    value={accountNumber}
                    onChange={(e) =>
                      setAccountNumber(
                        e.target.value.replace(/\D/g, '').slice(0, 10),
                      )
                    }
                    inputProps={{
                      inputMode: 'numeric',
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Amount"
                    placeholder="₦0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          ₦
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              )}
            </Box>
          )}

          {/* WITHDRAW */}

          {service === 'withdraw' && (
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <Alert
                severity="info"
                sx={{
                  borderRadius: 3,
                }}
              >
                Withdraw funds from your Zenimonies account.
              </Alert>

              <TextField
                fullWidth
                label="Amount"
                placeholder="₦0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <TextField
                fullWidth
                label="Bank Account Number"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(
                    e.target.value.replace(/\D/g, '').slice(0, 10),
                  )
                }
              />
            </Stack>
          )}

          {/* AIRTIME */}

          {service === 'airtime' && (
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                select
                fullWidth
                label="Network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
              >
                <MenuItem value="MTN">MTN</MenuItem>
                <MenuItem value="Airtel">Airtel</MenuItem>
                <MenuItem value="Glo">Glo</MenuItem>
                <MenuItem value="9mobile">9mobile</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />

              <TextField
                fullWidth
                label="Amount"
                placeholder="₦0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Stack>
          )}

          {/* DATA */}

          {service === 'data' && (
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                select
                fullWidth
                label="Network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
              >
                <MenuItem value="MTN">MTN</MenuItem>
                <MenuItem value="Airtel">Airtel</MenuItem>
                <MenuItem value="Glo">Glo</MenuItem>
                <MenuItem value="9mobile">9mobile</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />

              <TextField
                select
                fullWidth
                label="Data Plan"
                value={dataPlan}
                onChange={(e) => setDataPlan(e.target.value)}
              >
                <MenuItem value="500MB">500MB</MenuItem>
                <MenuItem value="1GB">1GB</MenuItem>
                <MenuItem value="2GB">2GB</MenuItem>
                <MenuItem value="5GB">5GB</MenuItem>
                <MenuItem value="10GB">10GB</MenuItem>
              </TextField>
            </Stack>
          )}

          {/* BETTING */}

          {service === 'betting' && (
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                select
                fullWidth
                label="Betting Platform"
                defaultValue=""
              >
                <MenuItem value="sportybet">SportyBet</MenuItem>
                <MenuItem value="bet9ja">Bet9ja</MenuItem>
                <MenuItem value="1xbet">1xBet</MenuItem>
                <MenuItem value="betking">BetKing</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Customer ID"
                placeholder="Enter customer ID"
              />

              <TextField
                fullWidth
                label="Amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </Stack>
          )}

          {/* TV */}

          {service === 'tv' && (
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                select
                fullWidth
                label="TV Provider"
                value={tvProvider}
                onChange={(e) => setTvProvider(e.target.value)}
              >
                <MenuItem value="DSTV">DStv</MenuItem>
                <MenuItem value="GOtv">GOtv</MenuItem>
                <MenuItem value="Startimes">StarTimes</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Smart Card / IUC Number"
                value={smartCard}
                onChange={(e) => setSmartCard(e.target.value)}
              />

              <TextField
                select
                fullWidth
                label="Subscription"
                defaultValue=""
              >
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </TextField>
            </Stack>
          )}

          {/* BILLS */}

          {service === 'bills' && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {[
                {
                  title: 'Electricity',
                  icon: <Payments />,
                },
                {
                  title: 'Internet',
                  icon: <DataUsage />,
                },
                {
                  title: 'Cable TV',
                  icon: <Tv />,
                },
                {
                  title: 'Education',
                  icon: <ReceiptLong />,
                },
              ].map((bill) => (
                <Paper
                  key={bill.title}
                  variant="outlined"
                  onClick={() =>
                    submitAction(`${bill.title} payment selected.`)
                  }
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f4faf7',
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                  >
                    <Avatar
                      sx={{
                        backgroundColor: '#e5f8f0',
                        color: '#078b5d',
                      }}
                    >
                      {bill.icon}
                    </Avatar>

                    <Typography
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      {bill.title}
                    </Typography>

                    <Box sx={{ ml: 'auto' }}>
                      <KeyboardArrowRight />
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          {/* SAFEBOX */}

          {service === 'safebox' && (
            <Box sx={{ py: 1 }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box
                  sx={{
                    width: 78,
                    height: 78,
                    borderRadius: '24px',
                    backgroundColor: '#e6f8f0',
                    color: '#078b5d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock sx={{ fontSize: 40 }} />
                </Box>

                <Typography
                  sx={{
                    fontSize: 21,
                    fontWeight: 800,
                    color: '#14352d',
                  }}
                >
                  Your SafeBox
                </Typography>

                <Typography color="text.secondary">
                  Keep money aside and manage your savings securely.
                </Typography>

                <Button
                  variant="contained"
                  onClick={() =>
                    submitAction('SafeBox setup will be available soon.')
                  }
                  sx={{
                    borderRadius: 3,
                    backgroundColor: '#078b5d',
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                >
                  Create SafeBox
                </Button>
              </Stack>
            </Box>
          )}

          {/* MORE */}

          {service === 'more' && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {[
                'International Transfer',
                'Gift Cards',
                'School Payments',
                'Insurance',
                'Savings',
                'Support',
              ].map((item) => (
                <Paper
                  key={item}
                  variant="outlined"
                  onClick={() =>
                    submitAction(`${item} selected.`)
                  }
                  sx={{
                    p: 1.8,
                    borderRadius: 3,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f4faf7',
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      {item}
                    </Typography>

                    <KeyboardArrowRight color="action" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
          }}
        >
          {service === 'bank' && selectedBank && (
            <Button
              fullWidth
              variant="contained"
              disabled={
                accountNumber.length !== 10 || !amount
              }
              onClick={() =>
                submitAction(
                  `Transfer to ${selectedBank.name} is ready.`,
                )
              }
              sx={{
                minHeight: 52,
                borderRadius: 3,
                backgroundColor: '#078b5d',
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Continue
            </Button>
          )}

          {service === 'withdraw' && (
            <Button
              fullWidth
              variant="contained"
              disabled={!amount || accountNumber.length !== 10}
              onClick={() =>
                submitAction('Withdrawal request is ready.')
              }
              sx={{
                minHeight: 52,
                borderRadius: 3,
                backgroundColor: '#078b5d',
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Continue
            </Button>
          )}

          {service === 'airtime' && (
            <Button
              fullWidth
              variant="contained"
              disabled={!network || !phoneNumber || !amount}
              onClick={() =>
                submitAction('Airtime purchase is ready.')
              }
              sx={{
                minHeight: 52,
                borderRadius: 3,
                backgroundColor: '#078b5d',
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Continue
            </Button>
          )}

          {service === 'data' && (
            <Button
              fullWidth
              variant="contained"
              disabled={!network || !phoneNumber || !dataPlan}
              onClick={() =>
                submitAction('Data purchase is ready.')
              }
              sx={{
                minHeight: 52,
                borderRadius: 3,
                backgroundColor: '#078b5d',
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Continue
            </Button>
          )}

          {service === 'betting' && (
            <Button
              fullWidth
              variant="contained"
              onClick={() =>
                submitAction('Betting funding is ready.')
              }
              sx={{
                minHeight: 52,
                borderRadius: 3,
                backgroundColor: '#078b5d',
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Continue
            </Button>
          )}

          {service === 'tv' && (
            <Button
              fullWidth
              variant="contained"
              disabled={!tvProvider || !smartCard}
              onClick={() =>
                submitAction('TV subscription is ready.')
              }
              sx={{
                minHeight: 52,
                borderRadius: 3,
                backgroundColor: '#078b5d',
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Continue
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* =========================================================
          SNACKBAR
      ========================================================== */}

      <Snackbar
        open={snackbar}
        autoHideDuration={3500}
        onClose={() => setSnackbar(false)}
        message={snackbarMessage}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      />
    </Box>
  );
};

/* ===============================================================
   BOTTOM NAV ITEM
================================================================ */

interface BottomNavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({
  icon,
  label,
  active = false,
  onClick,
}) => {
  return (
    <Button
      onClick={onClick}
      sx={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.2,
        color: active ? '#078b5d' : '#7a8790',
        textTransform: 'none',
        borderRadius: 2,
        py: 0.5,
        '&:hover': {
          backgroundColor: '#f4faf7',
        },
      }}
    >
      {React.cloneElement(icon as React.ReactElement, {
        sx: {
          fontSize: {
            xs: 25,
            sm: 28,
          },
        },
      })}

      <Typography
        component="span"
        sx={{
          fontSize: {
            xs: 11,
            sm: 13,
          },
          fontWeight: active ? 700 : 500,
        }}
      >
        {label}
      </Typography>
    </Button>
  );
};

export default Dashboard;
