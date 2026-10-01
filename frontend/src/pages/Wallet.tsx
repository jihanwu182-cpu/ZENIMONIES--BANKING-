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
import SendRoundedIcon from '@mui/icons-material/SendRounded';

import { useNavigate } from 'react-router-dom';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

type Wallet = {
  id: string;
  balance: number | string;
  currency: string;

  spendSaveEnabled?: boolean;
  spendSaveAmount?: number | string;

  spend_save_enabled?: boolean;
  spend_save_amount?: number | string;
};

type WalletTransaction = {
  id: string;

  type:
    | 'manual_save'
    | 'spend_save'
    | 'withdrawal'
    | 'reversal'
    | 'adjustment'
    | 'send';

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

const getToken = () =>
  localStorage.getItem('zenimonies_token');

const formatMoney = (
  value: number | string
) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (
  date: string
) => {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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

    case 'send':
      return 'Money Sent';

    default:
      return 'Wallet Transaction';
  }
};

const Wallet: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================
  // WALLET
  // ==========================================================

  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [transactions, setTransactions] =
    useState<WalletTransaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState(0);

  // ==========================================================
  // SAVE
  // ==========================================================

  const [saveDialogOpen, setSaveDialogOpen] =
    useState(false);

  const [saveAmount, setSaveAmount] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  // ==========================================================
  // WITHDRAW
  // ==========================================================

  const [withdrawDialogOpen, setWithdrawDialogOpen] =
    useState(false);

  const [withdrawAmount, setWithdrawAmount] =
    useState('');

  const [withdrawing, setWithdrawing] =
    useState(false);

  // ==========================================================
  // SEND
  // ==========================================================

  const [sendDialogOpen, setSendDialogOpen] =
    useState(false);

  const [sendRecipient, setSendRecipient] =
    useState('');

  const [sendAmount, setSendAmount] =
    useState('');

  const [sendDescription, setSendDescription] =
    useState('');

  const [sending, setSending] =
    useState(false);

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      Authorization:
        `Bearer ${token || ''}`,

      'Content-Type':
        'application/json',
    }),
    [token]
  );

  // ==========================================================
  // LOAD WALLET
  // ==========================================================

  const loadWallet = async () => {
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
            headers: authHeaders,
          }
        ),

        fetch(
          `${API_URL}/api/wallet/transactions`,
          {
            method: 'GET',
            headers: authHeaders,
          }
        ),
      ]);

      if (!walletResponse.ok) {
        throw new Error(
          await getErrorMessage(
            walletResponse
          )
        );
      }

      if (!transactionsResponse.ok) {
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

      setWallet(walletResult);

      setTransactions(
        Array.isArray(
          transactionResult
        )
          ? transactionResult
          : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load your Save Wallet.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // SAVE MONEY
  // ==========================================================

  const handleSaveMoney = async () => {
    const amount =
      Number(saveAmount);

    if (
      !Number.isFinite(amount) ||
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

            body: JSON.stringify({
              amount,

              description:
                'Manual Save Money',
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response
          )
        );
      }

      setSaveAmount('');

      setSaveDialogOpen(false);

      setSuccess(
        `${formatMoney(
          amount
        )} saved successfully.`
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to save money right now.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // WITHDRAW TO MAIN ACCOUNT
  // ==========================================================

  const handleWithdraw = async () => {
    const amount =
      Number(withdrawAmount);

    if (
      !Number.isFinite(amount) ||
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

    if (amount > balance) {
      setError(
        'The withdrawal amount is greater than your Save Wallet balance.'
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

            body: JSON.stringify({
              amount,

              description:
                'Withdrawal to Main Account',
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response
          )
        );
      }

      setWithdrawAmount('');

      setWithdrawDialogOpen(false);

      setSuccess(
        `${formatMoney(
          amount
        )} moved to your Main Account.`
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to withdraw from your Save Wallet.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  // ==========================================================
  // SEND FROM SAVE WALLET
  // ==========================================================

  const handleSendMoney = async () => {
    const recipient =
      sendRecipient.trim();

    const amount =
      Number(sendAmount);

    if (!recipient) {
      setError(
        'Enter the recipient phone number or account number.'
      );

      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'Enter a valid amount to send.'
      );

      return;
    }

    const balance =
      Number(
        wallet?.balance || 0
      );

    if (amount > balance) {
      setError(
        'The send amount is greater than your Save Wallet balance.'
      );

      return;
    }

    try {
      setSending(true);
      setError('');

      const response =
        await fetch(
          `${API_URL}/api/wallet/send`,
          {
            method: 'POST',

            headers:
              authHeaders,

            body: JSON.stringify({
              recipient,

              amount,

              description:
                sendDescription.trim() ||
                'Save Wallet transfer',
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response
          )
        );
      }

      setSendRecipient('');
      setSendAmount('');
      setSendDescription('');

      setSendDialogOpen(false);

      setSuccess(
        `${formatMoney(
          amount
        )} sent successfully.`
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to send money from your Save Wallet.'
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '70vh',

          display: 'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <CircularProgress
          sx={{
            color:
              '#087443',
          }}
        />
      </Box>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight:
          '100vh',

        backgroundColor:
          '#FFFFFF',

        width:
          '100%',

        maxWidth:
          560,

        mx:
          'auto',

        px: {
          xs: 2.5,
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
            3,
        }}
      >
        <IconButton
          onClick={() =>
            navigate(-1)
          }
          sx={{
            width:
              54,

            height:
              54,

            backgroundColor:
              '#FAFAFA',

            boxShadow:
              '0 8px 25px rgba(0,0,0,0.06)',

            '&:hover': {
              backgroundColor:
                '#F3F3F3',
            },
          }}
        >
          <ArrowBackRoundedIcon
            sx={{
              fontSize:
                32,

              color:
                '#171717',
            }}
          />
        </IconButton>

        <Typography
          sx={{
            fontSize: {
              xs: 25,
              sm: 28,
            },

            fontWeight:
              800,

            color:
              '#111111',

            letterSpacing:
              '-0.7px',
          }}
        >
          Save Wallet
        </Typography>

        <Box
          sx={{
            width:
              54,
          }}
        />
      </Box>

      {/* =====================================================
          TABS
      ===================================================== */}

      <Box
        sx={{
          backgroundColor:
            '#EEEEF0',

          borderRadius:
            5,

          p:
            0.4,

          mb:
            5,
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
                5,

              backgroundColor:
                '#FFFFFF',

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
                  18,

                fontWeight:
                  700,

                color:
                  '#777777',

                zIndex:
                  2,
              },

            '& .Mui-selected':
              {
                color:
                  '#078B4A',
              },
          }}
        >
          <Tab label="Details" />

          <Tab label="History" />
        </Tabs>
      </Box>

      {/* =====================================================
          DETAILS
      ===================================================== */}

      {activeTab === 0 && (
        <>
          {/* FEATURE CARD */}

          <Box
            sx={{
              height:
                175,

              borderRadius:
                4,

              backgroundColor:
                '#DFF9E9',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              mb:
                4,
            }}
          >
            <Typography
              sx={{
                fontSize:
                  95,

                lineHeight:
                  1,

                fontWeight:
                  500,

                color:
                  '#67CF8D',
              }}
            >
              ₦
            </Typography>
          </Box>

          {/* BALANCE */}

          <Box
            sx={{
              textAlign:
                'center',

              mb:
                4,
            }}
          >
            <Typography
              sx={{
                fontSize:
                  16,

                color:
                  '#999999',

                mb:
                  0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  color:
                    '#67CF8D',

                  fontWeight:
                    800,

                  mr:
                    0.8,
                }}
              >
                ₦
              </Box>

              Save Wallet
            </Typography>

            <Typography
              sx={{
                fontSize:
                  {
                    xs: 42,
                    sm: 46,
                  },

                fontWeight:
                  800,

                color:
                  '#111111',

                letterSpacing:
                  '-1.5px',
              }}
            >
              {formatMoney(
                wallet?.balance ||
                  0
              )}
            </Typography>
          </Box>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns:
                {
                  xs:
                    '1fr 1fr',

                  sm:
                    'repeat(3, 1fr)',
                },

              gap:
                1.5,

              mb:
                5,
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
                  82,

                borderRadius:
                  2.5,

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

                boxShadow:
                  '0 7px 25px rgba(0,0,0,0.07)',

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
                    40,

                  height:
                    40,

                  borderRadius:
                    '50%',

                  backgroundColor:
                    '#6AD392',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mb:
                    0.7,
                }}
              >
                <AddRoundedIcon
                  sx={{
                    color:
                      '#FFFFFF',

                    fontSize:
                      24,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color:
                    '#55C884',

                  fontWeight:
                    800,

                  fontSize:
                    16,
                }}
              >
                Save
              </Typography>
            </Paper>

            {/* SEND */}

            <Paper
              elevation={0}
              onClick={() =>
                setSendDialogOpen(
                  true
                )
              }
              sx={{
                minHeight:
                  82,

                borderRadius:
                  2.5,

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

                boxShadow:
                  '0 7px 25px rgba(0,0,0,0.07)',
              }}
            >
              <Box
                sx={{
                  width:
                    40,

                  height:
                    40,

                  borderRadius:
                    '50%',

                  backgroundColor:
                    '#B9EED0',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mb:
                    0.7,
                }}
              >
                <SendRoundedIcon
                  sx={{
                    color:
                      '#FFFFFF',

                    fontSize:
                      21,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color:
                    '#55C884',

                  fontWeight:
                    800,

                  fontSize:
                    16,
                }}
              >
                Send
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
                  82,

                borderRadius:
                  2.5,

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

                boxShadow:
                  '0 7px 25px rgba(0,0,0,0.07)',
              }}
            >
              <Box
                sx={{
                  width:
                    40,

                  height:
                    40,

                  borderRadius:
                    '50%',

                  backgroundColor:
                    '#B9EED0',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mb:
                    0.7,
                }}
              >
                <RemoveRoundedIcon
                  sx={{
                    color:
                      '#FFFFFF',

                    fontSize:
                      23,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color:
                    '#55C884',

                  fontWeight:
                    800,

                  fontSize:
                    16,
                }}
              >
                Withdraw
              </Typography>
            </Paper>
          </Box>

          {/* INFORMATION */}

          <Box
            sx={{
              px:
                0.8,
            }}
          >
            <Box
              sx={{
                backgroundColor:
                  '#F7FAF8',

                border:
                  '1px solid #E5EEE9',

                borderRadius:
                  3,

                p:
                  2,
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    15,

                  fontWeight:
                    800,

                  color:
                    '#34443C',

                  mb:
                    0.7,
                }}
              >
                Your Save Wallet
              </Typography>

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
                Save money from your Main
                Account, send money to another
                Zenimonies customer, or move
                your savings back to your Main
                Account.
              </Typography>
            </Box>
          </Box>
        </>
      )}

      {/* =====================================================
          HISTORY
      ===================================================== */}

      {activeTab === 1 && (
        <Box>
          <Typography
            sx={{
              fontSize:
                22,

              fontWeight:
                800,

              color:
                '#111111',

              mb:
                2,
            }}
          >
            Savings History
          </Typography>

          {transactions.length ===
          0 ? (
            <Box
              sx={{
                py:
                  8,

                textAlign:
                  'center',
              }}
            >
              <Typography
                sx={{
                  color:
                    '#777777',

                  fontSize:
                    16,
                }}
              >
                No savings activity yet.
              </Typography>
            </Box>
          ) : (
            <Box>
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
                            2,
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
                          }}
                        >
                          <Box
                            sx={{
                              width:
                                42,

                              height:
                                42,

                              borderRadius:
                                '50%',

                              backgroundColor:
                                credit
                                  ? '#E1F8EA'
                                  : '#F4F4F4',

                              display:
                                'flex',

                              alignItems:
                                'center',

                              justifyContent:
                                'center',

                              mr:
                                1.5,

                              flexShrink:
                                0,
                            }}
                          >
                            {credit ? (
                              <AddRoundedIcon
                                sx={{
                                  color:
                                    '#65CF8D',
                                }}
                              />
                            ) : (
                              <RemoveRoundedIcon
                                sx={{
                                  color:
                                    '#999999',
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
                                  700,

                                fontSize:
                                  15,
                              }}
                            >
                              {getTransactionLabel(
                                transaction.type
                              )}
                            </Typography>

                            <Typography
                              sx={{
                                color:
                                  '#999999',

                                fontSize:
                                  12,

                                mt:
                                  0.3,
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
                              800,

                            color:
                              credit
                                ? '#58C886'
                                : '#777777',

                            fontSize:
                              15,

                            whiteSpace:
                              'nowrap',

                            ml:
                              2,
                          }}
                        >
                          {credit
                            ? '+'
                            : '-'}
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
              1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight:
              800,

            fontSize:
              24,
          }}
        >
          Save Money
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color:
                '#888888',

              mb:
                2,
            }}
          >
            Move money from your Main
            Account into your Save Wallet.
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
              e
            ) =>
              setSaveAmount(
                e.target.value
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
                '#777777',
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
                2,

              backgroundColor:
                '#087443',

              '&:hover': {
                backgroundColor:
                  '#066139',
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
          SEND DIALOG
      ===================================================== */}

      <Dialog
        open={
          sendDialogOpen
        }
        onClose={() =>
          !sending &&
          setSendDialogOpen(
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
              1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight:
              800,

            fontSize:
              24,
          }}
        >
          Send Money
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color:
                '#888888',

              mb:
                2.5,
            }}
          >
            Send money directly from your
            Save Wallet to another Zenimonies
            customer.
          </Typography>

          <TextField
            fullWidth
            autoFocus
            label="Recipient"
            placeholder="Phone number or account number"
            value={
              sendRecipient
            }
            onChange={(
              e
            ) =>
              setSendRecipient(
                e.target.value
              )
            }
            sx={{
              mb:
                2,
            }}
          />

          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={
              sendAmount
            }
            onChange={(
              e
            ) =>
              setSendAmount(
                e.target.value
              )
            }
            inputProps={{
              min:
                0,

              step:
                '0.01',
            }}
            sx={{
              mb:
                2,
            }}
          />

          <TextField
            fullWidth
            label="Description (optional)"
            placeholder="What is this payment for?"
            value={
              sendDescription
            }
            onChange={(
              e
            ) =>
              setSendDescription(
                e.target.value
              )
            }
          />

          <Box
            sx={{
              mt:
                2,

              p:
                1.5,

              borderRadius:
                2,

              backgroundColor:
                '#F7FAF8',

              border:
                '1px solid #E5EEE9',
            }}
          >
            <Typography
              sx={{
                fontSize:
                  11,

                color:
                  '#718078',

                lineHeight:
                  1.55,
              }}
            >
              This sends money from your Save
              Wallet to the recipient's
              Zenimonies Main Account.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p:
              2,
          }}
        >
          <Button
            onClick={() =>
              setSendDialogOpen(
                false
              )
            }
            disabled={
              sending
            }
            sx={{
              textTransform:
                'none',

              color:
                '#777777',
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSendMoney
            }
            disabled={
              sending
            }
            sx={{
              textTransform:
                'none',

              borderRadius:
                2,

              backgroundColor:
                '#087443',

              '&:hover': {
                backgroundColor:
                  '#066139',
              },
            }}
          >
            {sending ? (
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
              'Send Money'
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
              1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight:
              800,

            fontSize:
              24,
          }}
        >
          Withdraw
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color:
                '#888888',

              mb:
                2,
            }}
          >
            Move money from your Save Wallet
            back to your Main Account.
          </Typography>

          <Typography
            sx={{
              fontSize:
                13,

              color:
                '#777777',

              mb:
                1.5,
            }}
          >
            Available:{' '}

            <strong>
              {formatMoney(
                wallet?.balance ||
                  0
              )}
            </strong>
          </Typography>

          <TextField
            fullWidth
            autoFocus
            label="Amount"
            type="number"
            value={
              withdrawAmount
            }
            onChange={(
              e
            ) =>
              setWithdrawAmount(
                e.target.value
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
                '#777777',
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
                2,

              backgroundColor:
                '#087443',

              '&:hover': {
                backgroundColor:
                  '#066139',
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
          NOTIFICATIONS
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
