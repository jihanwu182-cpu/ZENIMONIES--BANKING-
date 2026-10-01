import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import { useNavigate } from 'react-router-dom';

/*
 * ============================================================
 * API
 * ============================================================
 */

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

/*
 * ============================================================
 * WALLET TYPE
 * ============================================================
 */

type Wallet = {
  id: string;

  balance: number | string;

  currency: string;

  spendSaveEnabled?: boolean;

  spendSaveAmount?: number | string;

  spend_save_enabled?: boolean;

  spend_save_amount?: number | string;
};

/*
 * ============================================================
 * WALLET TRANSACTION TYPE
 * ============================================================
 */

type WalletTransaction = {
  id: string;

  type:
    | 'manual_save'
    | 'spend_save'
    | 'withdrawal'
    | 'reversal'
    | 'adjustment';

  direction: 'credit' | 'debit';

  amount: number | string;

  currency: string;

  reference: string;

  description?: string | null;

  balanceBefore?: number | string;

  balanceAfter?: number | string;

  balance_before?: number | string;

  balance_after?: number | string;

  createdAt?: string;

  created_at?: string;
};

/*
 * ============================================================
 * TOKEN
 * ============================================================
 */

const getToken = () =>
  localStorage.getItem(
    'zenimonies_token'
  );

/*
 * ============================================================
 * MONEY FORMAT
 * ============================================================
 */

const formatMoney = (
  value: number | string
) => {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(amount);
};

/*
 * ============================================================
 * DATE FORMAT
 * ============================================================
 */

const formatDate = (
  date: string
) => {
  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleString(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
};

/*
 * ============================================================
 * API ERROR
 * ============================================================
 */

const getErrorMessage = async (
  response: Response
) => {
  try {
    const data =
      await response.json();

    return (
      data?.message ||
      data?.error ||
      'Something went wrong. Please try again.'
    );
  } catch {
    return 'Something went wrong. Please try again.';
  }
};

/*
 * ============================================================
 * TRANSACTION LABEL
 * ============================================================
 */

const getTransactionLabel = (
  type: WalletTransaction['type']
) => {
  switch (type) {
    case 'manual_save':
      return 'Money Saved';

    case 'spend_save':
      return 'Spend + Save';

    case 'withdrawal':
      return 'Withdrawn';

    case 'reversal':
      return 'Savings Reversal';

    case 'adjustment':
      return 'Wallet Adjustment';

    default:
      return 'Savings Activity';
  }
};

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const Wallet: React.FC = () => {
  const navigate =
    useNavigate();

  /*
   * ==========================================================
   * WALLET STATE
   * ==========================================================
   */

  const [
    wallet,
    setWallet,
  ] = useState<Wallet | null>(
    null
  );

  const [
    transactions,
    setTransactions,
  ] = useState<
    WalletTransaction[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    activeTab,
    setActiveTab,
  ] = useState(0);

  /*
   * ==========================================================
   * SAVE STATE
   * ==========================================================
   */

  const [
    saveDialogOpen,
    setSaveDialogOpen,
  ] = useState(false);

  const [
    saveAmount,
    setSaveAmount,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  /*
   * ==========================================================
   * WITHDRAW STATE
   * ==========================================================
   */

  const [
    withdrawDialogOpen,
    setWithdrawDialogOpen,
  ] = useState(false);

  const [
    withdrawAmount,
    setWithdrawAmount,
  ] = useState('');

  const [
    withdrawing,
    setWithdrawing,
  ] = useState(false);

  /*
   * ==========================================================
   * NOTIFICATIONS
   * ==========================================================
   */

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');

  /*
   * ==========================================================
   * TOKEN / AUTH
   * ==========================================================
   */

  const token =
    getToken();

  const authHeaders =
    useMemo(
      () => ({
        Authorization:
          `Bearer ${token || ''}`,

        'Content-Type':
          'application/json',
      }),
      [token]
    );

  /*
   * ==========================================================
   * LOAD ZENIMONIES SAVE
   * ==========================================================
   */

  const loadWallet =
    async () => {
      if (!token) {
        setError(
          'Your session has expired. Please sign in again.'
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        const [
          walletResponse,
          transactionsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/wallet`,
            {
              method: 'GET',
              headers:
                authHeaders,
            }
          ),

          fetch(
            `${API_URL}/api/wallet/transactions`,
            {
              method: 'GET',
              headers:
                authHeaders,
            }
          ),
        ]);

        if (
          !walletResponse.ok
        ) {
          throw new Error(
            await getErrorMessage(
              walletResponse
            )
          );
        }

        if (
          !transactionsResponse.ok
        ) {
          throw new Error(
            await getErrorMessage(
              transactionsResponse
            )
          );
        }

        const walletData =
          await walletResponse.json();

        const transactionData =
          await transactionsResponse.json();

        const walletResult =
          walletData?.wallet ||
          walletData;

        const transactionResult =
          transactionData?.transactions ||
          transactionData?.data ||
          [];

        setWallet(
          walletResult
        );

        setTransactions(
          Array.isArray(
            transactionResult
          )
            ? transactionResult
            : []
        );
      } catch (
        err: any
      ) {
        setError(
          err?.message ||
            'Unable to load ZENIMONIES Save.'
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ==========================================================
   * LOAD ON PAGE OPEN
   * ==========================================================
   */

  useEffect(() => {
    loadWallet();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ==========================================================
   * SAVE MONEY
   * ==========================================================
   */

  const handleSaveMoney =
    async () => {
      const amount =
        Number(saveAmount);

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          'Enter a valid amount to save.'
        );

        return;
      }

      try {
        setSaving(true);

        setError('');

        const response =
          await fetch(
            `${API_URL}/api/wallet/save`,
            {
              method: 'POST',

              headers:
                authHeaders,

              body:
                JSON.stringify({
                  amount,

                  description:
                    'Manual Save Money',
                }),
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            await getErrorMessage(
              response
            )
          );
        }

        setSaveAmount('');

        setSaveDialogOpen(
          false
        );

        setSuccess(
          `${formatMoney(
            amount
          )} saved successfully.`
        );

        await loadWallet();
      } catch (
        err: any
      ) {
        setError(
          err?.message ||
            'Unable to save money right now.'
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ==========================================================
   * WITHDRAW TO MAIN ACCOUNT
   * ==========================================================
   */

  const handleWithdraw =
    async () => {
      const amount =
        Number(
          withdrawAmount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          'Enter a valid amount to withdraw.'
        );

        return;
      }

      const balance =
        Number(
          wallet?.balance || 0
        );

      if (
        amount > balance
      ) {
        setError(
          'The withdrawal amount is greater than your ZENIMONIES Save balance.'
        );

        return;
      }

      try {
        setWithdrawing(true);

        setError('');

        const response =
          await fetch(
            `${API_URL}/api/wallet/withdraw`,
            {
              method: 'POST',

              headers:
                authHeaders,

              body:
                JSON.stringify({
                  amount,

                  description:
                    'Withdrawal to Main Account',
                }),
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            await getErrorMessage(
              response
            )
          );
        }

        setWithdrawAmount('');

        setWithdrawDialogOpen(
          false
        );

        setSuccess(
          `${formatMoney(
            amount
          )} moved to your Main Account.`
        );

        await loadWallet();
      } catch (
        err: any
      ) {
        setError(
          err?.message ||
            'Unable to withdraw from ZENIMONIES Save.'
        );
      } finally {
        setWithdrawing(
          false
        );
      }
    };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight:
            '70vh',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          background:
            '#FFFFFF',
        }}
      >
        <CircularProgress
          sx={{
            color:
              '#008C68',
          }}
        />
      </Box>
    );
  }

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <Box
      sx={{
        minHeight:
          '100vh',

        background:
          'linear-gradient(180deg, #F1FBF7 0%, #FFFFFF 300px)',

        width:
          '100%',

        maxWidth:
          560,

        mx:
          'auto',

        px: {
          xs: 2,
          sm: 3,
        },

        pt: {
          xs: 2,
          sm: 3,
        },

        pb:
          5,
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <Box
        sx={{
          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'space-between',

          mb:
            2.5,
        }}
      >

        <IconButton
          onClick={() =>
            navigate(-1)
          }
          sx={{
            width:
              46,

            height:
              46,

            background:
              '#FFFFFF',

            color:
              '#063F31',

            border:
              '1px solid #E2EEE9',

            boxShadow:
              '0 7px 22px rgba(0,80,55,0.07)',

            '&:hover': {
              background:
                '#F5FBF8',
            },
          }}
        >
          <ArrowBackRoundedIcon />
        </IconButton>


        <Box
          sx={{
            textAlign:
              'center',

            flex:
              1,

            px:
              1,
          }}
        >
          <Typography
            sx={{
              fontSize: {
                xs: 22,
                sm: 26,
              },

              fontWeight:
                900,

              color:
                '#063F31',

              letterSpacing:
                '-0.7px',
            }}
          >
            ZENIMONIES
          </Typography>

          <Typography
            sx={{
              fontSize: {
                xs: 16,
                sm: 18,
              },

              fontWeight:
                800,

              color:
                '#008C68',

              mt:
                -0.2,
            }}
          >
            Save
          </Typography>
        </Box>


        <Box
          sx={{
            width:
              46,
          }}
        />

      </Box>


      {/* =====================================================
          BRAND SUBTITLE
      ===================================================== */}

      <Box
        sx={{
          textAlign:
            'center',

          mb:
            2.5,
        }}
      >
        <Typography
          sx={{
            fontSize:
              12,

            color:
              '#718078',

            lineHeight:
              1.6,
          }}
        >
          Build your savings while you
          use ZENIMONIES.
        </Typography>
      </Box>


      {/* =====================================================
          SAVE BALANCE CARD
      ===================================================== */}

      <Box
        sx={{
          borderRadius:
            4,

          background:
            'linear-gradient(135deg, #063F31 0%, #087A4B 55%, #00A875 100%)',

          color:
            '#FFFFFF',

          p: {
            xs: 2.2,
            sm: 2.8,
          },

          boxShadow:
            '0 18px 38px rgba(0,105,76,0.18)',

          mb:
            2.2,

          position:
            'relative',

          overflow:
            'hidden',
        }}
      >

        <Box
          sx={{
            position:
              'absolute',

            width:
              150,

            height:
              150,

            borderRadius:
              '50%',

            background:
              'rgba(255,255,255,0.07)',

            right:
              -60,

            top:
              -65,
          }}
        />

        <Box
          sx={{
            position:
              'absolute',

            width:
              90,

            height:
              90,

            borderRadius:
              '50%',

            background:
              'rgba(255,255,255,0.05)',

            left:
              -40,

            bottom:
              -35,
          }}
        />


        <Box
          sx={{
            position:
              'relative',

            zIndex:
              1,
          }}
        >

          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'space-between',

              mb:
                2,
            }}
          >

            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  1,
              }}
            >

              <Box
                sx={{
                  width:
                    40,

                  height:
                    40,

                  borderRadius:
                    2.5,

                  background:
                    'rgba(255,255,255,0.13)',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',
                }}
              >
                <SavingsRoundedIcon
                  sx={{
                    fontSize:
                      23,

                    color:
                      '#FFFFFF',
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize:
                      12,

                    opacity:
                      0.76,

                    fontWeight:
                      700,
                  }}
                >
                  ZENIMONIES
                </Typography>

                <Typography
                  sx={{
                    fontSize:
                      16,

                    fontWeight:
                      900,
                  }}
                >
                  Save Balance
                </Typography>
              </Box>

            </Box>


            <AutoAwesomeRoundedIcon
              sx={{
                fontSize:
                  23,

                opacity:
                  0.75,
              }}
            />

          </Box>


          <Typography
            sx={{
              fontSize:
                11,

              opacity:
                0.72,

              mb:
                0.3,
            }}
          >
            Available savings
          </Typography>


          <Typography
            sx={{
              fontSize: {
                xs: 34,
                sm: 40,
              },

              fontWeight:
                900,

              letterSpacing:
                '-1px',
            }}
          >
            {formatMoney(
              wallet?.balance ||
                0
            )}
          </Typography>


          <Box
            sx={{
              mt:
                1.8,

              display:
                'flex',

              alignItems:
                'center',

              gap:
                0.7,
            }}
          >
            <CheckCircleRoundedIcon
              sx={{
                fontSize:
                  15,

                color:
                  '#B9F2D2',
              }}
            />

            <Typography
              sx={{
                fontSize:
                  10.5,

                opacity:
                  0.76,
              }}
            >
              Securely separated from your
              Main Account
            </Typography>
          </Box>

        </Box>
      </Box>


      {/* =====================================================
          TABS
      ===================================================== */}

      <Box
        sx={{
          background:
            '#EAF5F1',

          borderRadius:
            3.5,

          p:
            0.45,

          mb:
            2.5,

          border:
            '1px solid #DCECE6',
        }}
      >
        <Tabs
          value={
            activeTab
          }
          onChange={(
            _,
            value
          ) =>
            setActiveTab(
              value
            )
          }
          variant="fullWidth"
          TabIndicatorProps={{
            sx: {
              height:
                '100%',

              borderRadius:
                3,

              background:
                '#FFFFFF',

              boxShadow:
                '0 3px 12px rgba(0,80,55,0.08)',

              zIndex:
                0,
            },
          }}
          sx={{
            minHeight:
              46,

            '& .MuiTabs-flexContainer':
              {
                position:
                  'relative',

                zIndex:
                  1,
              },

            '& .MuiTab-root':
              {
                minHeight:
                  44,

                textTransform:
                  'none',

                fontSize:
                  13,

                fontWeight:
                  800,

                color:
                  '#718078',

                zIndex:
                  2,
              },

            '& .MuiTab-root.Mui-selected':
              {
                 color:
                '#008C68 !important',
             },
              },
          }}
        >
          <Tab label="Details" />

          <Tab label="Savings History" />
        </Tabs>
      </Box>


      {/* =====================================================
          DETAILS
      ===================================================== */}

      {activeTab === 0 && (
        <>

          {/* FEATURE MESSAGE */}

          <Box
            sx={{
              borderRadius:
                3.5,

              background:
                '#FFFFFF',

              border:
                '1px solid #E0ECE7',

              p:
                2,

              mb:
                2,

              boxShadow:
                '0 7px 24px rgba(20,50,40,0.05)',
            }}
          >

            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  1.2,
              }}
            >

              <Box
                sx={{
                  width:
                    48,

                  height:
                    48,

                  minWidth:
                    48,

                  borderRadius:
                    2.5,

                  background:
                    '#E8F8F1',

                  color:
                    '#008C68',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',
                }}
              >
                <SavingsRoundedIcon
                  sx={{
                    fontSize:
                      27,
                  }}
                />
              </Box>


              <Box>
                <Typography
                  sx={{
                    fontSize:
                      15,

                    fontWeight:
                      900,

                    color:
                      '#18332A',
                  }}
                >
                  Save for what matters
                </Typography>

                <Typography
                  sx={{
                    fontSize:
                      11.5,

                    color:
                      '#718078',

                    mt:
                      0.25,

                    lineHeight:
                      1.5,
                  }}
                >
                  Save manually or let Spend +
                  Save grow your savings
                  automatically.
                </Typography>
              </Box>

            </Box>

          </Box>


          {/* ACTIONS */}

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns:
                {
                  xs:
                    '1fr 1fr',

                  sm:
                    'repeat(2, 1fr)',
                },

              gap:
                1.5,

              mb:
                2,
            }}
          >

            {/* SAVE */}

            <Paper
              elevation={0}
              onClick={() =>
                setSaveDialogOpen(
                  true
                )
              }
              sx={{
                minHeight:
                  105,

                borderRadius:
                  3,

                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                cursor:
                  'pointer',

                background:
                  '#FFFFFF',

                border:
                  '1px solid #E0ECE7',

                boxShadow:
                  '0 7px 24px rgba(20,50,40,0.05)',

                transition:
                  '0.18s ease',

                '&:hover':
                  {
                    borderColor:
                      '#B7DCCF',

                    transform:
                      'translateY(-1px)',
                  },

                '&:active':
                  {
                    transform:
                      'scale(0.98)',
                  },
              }}
            >

              <Box
                sx={{
                  width:
                    44,

                  height:
                    44,

                  borderRadius:
                    '50%',

                  background:
                    '#008C68',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mb:
                    0.8,
                }}
              >
                <AddRoundedIcon
                  sx={{
                    color:
                      '#FFFFFF',

                    fontSize:
                      25,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color:
                    '#087A4B',

                  fontWeight:
                    900,

                  fontSize:
                    14,
                }}
              >
                Save Money
              </Typography>

            </Paper>


            {/* WITHDRAW */}

            <Paper
              elevation={0}
              onClick={() => {
                if (
                  Number(
                    wallet?.balance ||
                      0
                  ) > 0
                ) {
                  setWithdrawDialogOpen(
                    true
                  );
                }
              }}
              sx={{
                minHeight:
                  105,

                borderRadius:
                  3,

                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                cursor:
                  Number(
                    wallet?.balance ||
                      0
                  ) > 0
                    ? 'pointer'
                    : 'default',

                opacity:
                  Number(
                    wallet?.balance ||
                      0
                  ) > 0
                    ? 1
                    : 0.55,

                background:
                  '#FFFFFF',

                border:
                  '1px solid #E0ECE7',

                boxShadow:
                  '0 7px 24px rgba(20,50,40,0.05)',

                transition:
                  '0.18s ease',

                '&:hover':
                  Number(
                    wallet?.balance ||
                      0
                  ) > 0
                    ? {
                        borderColor:
                          '#B7DCCF',

                        transform:
                          'translateY(-1px)',
                      }
                    : {},
              }}
            >

              <Box
                sx={{
                  width:
                    44,

                  height:
                    44,

                  borderRadius:
                    '50%',

                  background:
                    '#E2F5ED',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mb:
                    0.8,
                }}
              >
                <RemoveRoundedIcon
                  sx={{
                    color:
                      '#008C68',

                    fontSize:
                      25,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color:
                    '#087A4B',

                  fontWeight:
                    900,

                  fontSize:
                    14,
                }}
              >
                Withdraw
              </Typography>

            </Paper>

          </Box>


          {/* SPEND + SAVE INFORMATION */}

          <Box
            sx={{
              borderRadius:
                3.5,

              background:
                'linear-gradient(135deg, #F0FBF6, #FFFFFF)',

              border:
                '1px solid #DCEDE6',

              p:
                2,

              mb:
                2,
            }}
          >

            <Box
              sx={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'flex-start',

                gap:
                  1,
              }}
            >

              <Box>
                <Typography
                  sx={{
                    fontSize:
                      14,

                    fontWeight:
                      900,

                    color:
                      '#18332A',
                  }}
                >
                  Spend + Save
                </Typography>

                <Typography
                  sx={{
                    fontSize:
                      11.5,

                    color:
                      '#718078',

                    mt:
                      0.45,

                    lineHeight:
                      1.6,
                  }}
                >
                  Automatically add your
                  selected savings amount when
                  an eligible transfer succeeds.
                </Typography>
              </Box>


              <Box
                sx={{
                  px:
                    1,

                  py:
                    0.5,

                  borderRadius:
                    2,

                  background:
                    wallet?.spendSaveEnabled ||
                    wallet?.spend_save_enabled
                      ? '#DDF6EA'
                      : '#F0F3F1',

                  color:
                    wallet?.spendSaveEnabled ||
                    wallet?.spend_save_enabled
                      ? '#087A4B'
                      : '#718078',

                  fontSize:
                    10,

                  fontWeight:
                    900,

                  whiteSpace:
                    'nowrap',
                }}
              >
                {wallet?.spendSaveEnabled ||
                wallet?.spend_save_enabled
                  ? 'ON'
                  : 'OFF'}
              </Box>

            </Box>


            {(wallet?.spendSaveEnabled ||
              wallet?.spend_save_enabled) &&
              Number(
                wallet?.spendSaveAmount ||
                  wallet?.spend_save_amount ||
                  0
              ) > 0 && (
                <Box
                  sx={{
                    mt:
                      1.3,

                    pt:
                      1.2,

                    borderTop:
                      '1px solid #DCEDE6',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize:
                        10.5,

                      color:
                        '#718078',
                    }}
                  >
                    Amount saved per eligible
                    transfer
                  </Typography>

                  <Typography
                    sx={{
                      fontSize:
                        17,

                      fontWeight:
                        900,

                      color:
                        '#008C68',

                      mt:
                        0.2,
                    }}
                  >
                    {formatMoney(
                      wallet?.spendSaveAmount ||
                        wallet?.spend_save_amount ||
                        0
                    )}
                  </Typography>
                </Box>
              )}

          </Box>


          {/* INFORMATION */}

          <Box
            sx={{
              borderRadius:
                3,

              background:
                '#FFFFFF',

              border:
                '1px solid #E4ECE8',

              p:
                1.8,
            }}
          >

            <Typography
              sx={{
                fontSize:
                  13,

                fontWeight:
                  900,

                color:
                  '#34443C',

                mb:
                  0.6,
              }}
            >
              About ZENIMONIES Save
            </Typography>

            <Typography
              sx={{
                fontSize:
                  11.5,

                color:
                  '#718078',

                lineHeight:
                  1.65,
              }}
            >
              ZENIMONIES Save keeps your
              savings separate from your Main
              Account. You can save money
              manually, use Spend + Save for
              automatic savings, and withdraw
              your savings back to your Main
              Account whenever you need them.
            </Typography>

          </Box>

        </>
      )}


      {/* =====================================================
          HISTORY
      ===================================================== */}

      {activeTab === 1 && (
        <Box>

          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'space-between',

              mb:
                1.8,
            }}
          >

            <Box>
              <Typography
                sx={{
                  fontSize:
                    21,

                  fontWeight:
                    900,

                  color:
                    '#18332A',
                }}
              >
                Savings History
              </Typography>

              <Typography
                sx={{
                  fontSize:
                    11,

                  color:
                    '#8A9590',

                  mt:
                    0.25,
                }}
              >
                Your ZENIMONIES Save activity
              </Typography>
            </Box>


            <SavingsRoundedIcon
              sx={{
                color:
                  '#008C68',

                fontSize:
                  27,
              }}
            />

          </Box>


          {transactions.length ===
          0 ? (
            <Box
              sx={{
                py:
                  7,

                textAlign:
                  'center',

                borderRadius:
                  3.5,

                background:
                  '#FFFFFF',

                border:
                  '1px solid #E4ECE8',
              }}
            >

              <Box
                sx={{
                  width:
                    58,

                  height:
                    58,

                  borderRadius:
                    '50%',

                  background:
                    '#E8F8F1',

                  color:
                    '#008C68',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mx:
                    'auto',

                  mb:
                    1.3,
                }}
              >
                <SavingsRoundedIcon />
              </Box>

              <Typography
                sx={{
                  color:
                    '#34443C',

                  fontSize:
                    15,

                  fontWeight:
                    800,
                }}
              >
                No savings activity yet.
              </Typography>

              <Typography
                sx={{
                  color:
                    '#8A9590',

                  fontSize:
                    11.5,

                  mt:
                    0.5,
                }}
              >
                Your savings activity will
                appear here.
              </Typography>

            </Box>
          ) : (
            <Box
              sx={{
                background:
                  '#FFFFFF',

                border:
                  '1px solid #E4ECE8',

                borderRadius:
                  3.5,

                px:
                  1.5,
              }}
            >

              {transactions.map(
                (
                  transaction,
                  index
                ) => {

                  const credit =
                    transaction.direction ===
                    'credit';

                  const transactionDate =
                    transaction.createdAt ||
                    transaction.created_at ||
                    '';

                  return (
                    <Box
                      key={
                        transaction.id
                      }
                    >

                      <Box
                        sx={{
                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'space-between',

                          py:
                            1.7,
                        }}
                      >

                        <Box
                          sx={{
                            display:
                              'flex',

                            alignItems:
                              'center',

                            minWidth:
                              0,

                            flex:
                              1,
                          }}
                        >

                          <Box
                            sx={{
                              width:
                                43,

                              height:
                                43,

                              borderRadius:
                                '50%',

                              background:
                                credit
                                  ? '#E4F8EC'
                                  : '#F0F3F1',

                              display:
                                'flex',

                              alignItems:
                                'center',

                              justifyContent:
                                'center',

                              mr:
                                1.3,

                              flexShrink:
                                0,
                            }}
                          >

                            {credit ? (
                              <AddRoundedIcon
                                sx={{
                                  color:
                                    '#008C68',
                                }}
                              />
                            ) : (
                              <RemoveRoundedIcon
                                sx={{
                                  color:
                                    '#68756F',
                                }}
                              />
                            )}

                          </Box>


                          <Box
                            sx={{
                              minWidth:
                                0,
                            }}
                          >

                            <Typography
                              sx={{
                                fontWeight:
                                  800,

                                fontSize:
                                  13.5,

                                color:
                                  '#25352E',

                                overflow:
                                  'hidden',

                                textOverflow:
                                  'ellipsis',

                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {getTransactionLabel(
                                transaction.type
                              )}
                            </Typography>


                            <Typography
                              sx={{
                                color:
                                  '#8A9590',

                                fontSize:
                                  10.5,

                                mt:
                                  0.35,

                                overflow:
                                  'hidden',

                                textOverflow:
                                  'ellipsis',

                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {transactionDate
                                ? formatDate(
                                    transactionDate
                                  )
                                : 'Date unavailable'}
                            </Typography>

                          </Box>

                        </Box>


                        <Typography
                          sx={{
                            fontWeight:
                              900,

                            color:
                              credit
                                ? '#008C68'
                                : '#59645F',

                            fontSize:
                              13.5,

                            whiteSpace:
                              'nowrap',

                            ml:
                              1.5,
                          }}
                        >
                          {credit
                            ? '+'
                            : '−'}

                          {formatMoney(
                            transaction.amount
                          )}
                        </Typography>

                      </Box>


                      {index <
                        transactions.length -
                          1 && (
                        <Divider />
                      )}

                    </Box>
                  );
                }
              )}

            </Box>
          )}

        </Box>
      )}


      {/* =====================================================
          SAVE DIALOG
      ===================================================== */}

      <Dialog
        open={
          saveDialogOpen
        }
        onClose={() =>
          !saving &&
          setSaveDialogOpen(
            false
          )
        }
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius:
              4,

            p:
              0.8,
          },
        }}
      >

        <DialogTitle
          sx={{
            fontWeight:
              900,

            fontSize:
              23,

            color:
              '#18332A',
          }}
        >
          Save Money
        </DialogTitle>


        <DialogContent>

          <Typography
            sx={{
              color:
                '#718078',

              fontSize:
                12,

              lineHeight:
                1.6,

              mb:
                2,
            }}
          >
            Move money from your Main Account
            into ZENIMONIES Save.
          </Typography>


          <TextField
            fullWidth
            autoFocus
            label="Amount"
            type="number"
            value={
              saveAmount
            }
            onChange={(
              event
            ) =>
              setSaveAmount(
                event.target.value
              )
            }
            inputProps={{
              min:
                0,

              step:
                '0.01',
            }}
          />

        </DialogContent>


        <DialogActions
          sx={{
            p:
              2,
          }}
        >

          <Button
            onClick={() =>
              setSaveDialogOpen(
                false
              )
            }
            disabled={
              saving
            }
            sx={{
              textTransform:
                'none',

              color:
                '#718078',

              fontWeight:
                700,
            }}
          >
            Cancel
          </Button>


          <Button
            variant="contained"
            onClick={
              handleSaveMoney
            }
            disabled={
              saving
            }
            sx={{
              textTransform:
                'none',

              borderRadius:
                2.5,

              minWidth:
                100,

              background:
                '#008C68',

              fontWeight:
                800,

              '&:hover': {
                background:
                  '#007858',
              },
            }}
          >

            {saving ? (
              <CircularProgress
                size={
                  21
                }
                sx={{
                  color:
                    '#FFFFFF',
                }}
              />
            ) : (
              'Save'
            )}

          </Button>

        </DialogActions>

      </Dialog>


      {/* =====================================================
          WITHDRAW DIALOG
      ===================================================== */}

      <Dialog
        open={
          withdrawDialogOpen
        }
        onClose={() =>
          !withdrawing &&
          setWithdrawDialogOpen(
            false
          )
        }
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius:
              4,

            p:
              0.8,
          },
        }}
      >

        <DialogTitle
          sx={{
            fontWeight:
              900,

            fontSize:
              23,

            color:
              '#18332A',
          }}
        >
          Withdraw Savings
        </DialogTitle>


        <DialogContent>

          <Typography
            sx={{
              color:
                '#718078',

              fontSize:
                12,

              lineHeight:
                1.6,

              mb:
                1.8,
            }}
          >
            Move money from ZENIMONIES Save
            back to your Main Account.
          </Typography>


          <Box
            sx={{
              background:
                '#F0FAF6',

              border:
                '1px solid #DCEDE6',

              borderRadius:
                2.5,

              p:
                1.4,

              mb:
                1.8,
            }}
          >

            <Typography
              sx={{
                fontSize:
                  10.5,

                color:
                  '#718078',
              }}
            >
              Available savings
            </Typography>

            <Typography
              sx={{
                fontSize:
                  17,

                fontWeight:
                  900,

                color:
                  '#008C68',

                mt:
                  0.2,
              }}
            >
              {formatMoney(
                wallet?.balance ||
                  0
              )}
            </Typography>

          </Box>


          <TextField
            fullWidth
            autoFocus
            label="Amount"
            type="number"
            value={
              withdrawAmount
            }
            onChange={(
              event
            ) =>
              setWithdrawAmount(
                event.target.value
              )
            }
            inputProps={{
              min:
                0,

              step:
                '0.01',
            }}
          />

        </DialogContent>


        <DialogActions
          sx={{
            p:
              2,
          }}
        >

          <Button
            onClick={() =>
              setWithdrawDialogOpen(
                false
              )
            }
            disabled={
              withdrawing
            }
            sx={{
              textTransform:
                'none',

              color:
                '#718078',

              fontWeight:
                700,
            }}
          >
            Cancel
          </Button>


          <Button
            variant="contained"
            onClick={
              handleWithdraw
            }
            disabled={
              withdrawing
            }
            sx={{
              textTransform:
                'none',

              borderRadius:
                2.5,

              minWidth:
                110,

              background:
                '#008C68',

              fontWeight:
                800,

              '&:hover': {
                background:
                  '#007858',
              },
            }}
          >

            {withdrawing ? (
              <CircularProgress
                size={
                  21
                }
                sx={{
                  color:
                    '#FFFFFF',
                }}
              />
            ) : (
              'Withdraw'
            )}

          </Button>

        </DialogActions>

      </Dialog>


      {/* =====================================================
          ERROR NOTIFICATION
      ===================================================== */}

      <Snackbar
        open={
          Boolean(error)
        }
        autoHideDuration={
          5000
        }
        onClose={() =>
          setError('')
        }
        anchorOrigin={{
          vertical:
            'top',

          horizontal:
            'center',
        }}
      >

        <Alert
          severity="error"
          onClose={() =>
            setError('')
          }
          sx={{
            borderRadius:
              2,

            width:
              '100%',
          }}
        >
          {error}
        </Alert>

      </Snackbar>


      {/* =====================================================
          SUCCESS NOTIFICATION
      ===================================================== */}

      <Snackbar
        open={
          Boolean(success)
        }
        autoHideDuration={
          3500
        }
        onClose={() =>
          setSuccess('')
        }
        anchorOrigin={{
          vertical:
            'top',

          horizontal:
            'center',
        }}
      >

        <Alert
          severity="success"
          onClose={() =>
            setSuccess('')
          }
          sx={{
            borderRadius:
              2,

            width:
              '100%',
          }}
        >
          {success}
        </Alert>

      </Snackbar>

    </Box>
  );
};

export default Wallet;
