import React, { useEffect, useMemo, useState } from 'react';
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
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

import { useNavigate } from 'react-router-dom';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

type Wallet = {
  id: string;
  balance: number | string;
  currency: string;
  spend_save_enabled: boolean;
  spend_save_amount: number | string;
};

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
  balance_before: number | string;
  balance_after: number | string;
  created_at: string;
};

const getToken = () =>
  localStorage.getItem('zenimonies_token');

const formatMoney = (value: number | string) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: string) => {
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
    const data = await response.json();

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

    default:
      return 'Wallet Transaction';
  }
};

const Wallet: React.FC = () => {
  const navigate = useNavigate();

  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [transactions, setTransactions] =
    useState<WalletTransaction[]>([]);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] =
    useState(0);

  const [saveDialogOpen, setSaveDialogOpen] =
    useState(false);

  const [withdrawDialogOpen, setWithdrawDialogOpen] =
    useState(false);

  const [editDialogOpen, setEditDialogOpen] =
    useState(false);

  const [saveAmount, setSaveAmount] =
    useState('');

  const [withdrawAmount, setWithdrawAmount] =
    useState('');

  const [spendSaveAmount, setSpendSaveAmount] =
    useState('');

  const [spendSaveEnabled, setSpendSaveEnabled] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [withdrawing, setWithdrawing] =
    useState(false);

  const [updatingSettings, setUpdatingSettings] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

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
        fetch(`${API_URL}/api/wallet`, {
          method: 'GET',
          headers: authHeaders,
        }),

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
          await getErrorMessage(walletResponse)
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
        Array.isArray(transactionResult)
          ? transactionResult
          : []
      );

      setSpendSaveEnabled(
        Boolean(
          walletResult?.spend_save_enabled
        )
      );

      setSpendSaveAmount(
        walletResult?.spend_save_amount
          ? String(
              walletResult.spend_save_amount
            )
          : ''
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

  const handleSaveMoney = async () => {
    const amount = Number(saveAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Enter a valid amount to save.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch(
        `${API_URL}/api/wallet/save`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            amount,
            description: 'Manual Save Money',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
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

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Enter a valid amount to withdraw.'
      );
      return;
    }

    const balance = Number(
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

      const response = await fetch(
        `${API_URL}/api/wallet/withdraw`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            amount,
            description:
              'Withdrawal to Main Account',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
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

  const handleSpendSaveToggle = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const enabled =
      event.target.checked;

    if (enabled) {
      const amount =
        Number(spendSaveAmount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setEditDialogOpen(true);
        return;
      }
    }

    try {
      setUpdatingSettings(true);
      setError('');

      const response = await fetch(
        `${API_URL}/api/wallet/settings`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            enabled,
            amount: Number(
              spendSaveAmount || 0
            ),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
        );
      }

      setSpendSaveEnabled(enabled);

      setSuccess(
        enabled
          ? 'Spend + Save is now on.'
          : 'Spend + Save has been turned off.'
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to update Spend + Save.'
      );
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateSpendSave = async () => {
    const amount =
      Number(spendSaveAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'Enter a valid positive amount.'
      );
      return;
    }

    try {
      setUpdatingSettings(true);
      setError('');

      const response = await fetch(
        `${API_URL}/api/wallet/settings`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            enabled: spendSaveEnabled,
            amount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
        );
      }

      setEditDialogOpen(false);

      setSuccess(
        `Amount updated to ${formatMoney(
          amount
        )}.`
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to update Spend + Save.'
      );
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress
          sx={{ color: '#087443' }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 560,
        mx: 'auto',
        px: { xs: 2.5, sm: 3 },
        pt: { xs: 2, sm: 3 },
        pb: 5,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            width: 54,
            height: 54,
            backgroundColor: '#FAFAFA',
            boxShadow:
              '0 8px 25px rgba(0,0,0,0.06)',
            '&:hover': {
              backgroundColor: '#F3F3F3',
            },
          }}
        >
          <ArrowBackRoundedIcon
            sx={{
              fontSize: 32,
              color: '#171717',
            }}
          />
        </IconButton>

        <Typography
          sx={{
            fontSize: {
              xs: 25,
              sm: 28,
            },
            fontWeight: 800,
            color: '#111111',
            letterSpacing: '-0.7px',
          }}
        >
          Spend + Save
        </Typography>

        <Box sx={{ width: 54 }} />
      </Box>

      {/* TABS */}
      <Box
        sx={{
          backgroundColor: '#EEEEF0',
          borderRadius: 5,
          p: 0.4,
          mb: 7,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) =>
            setActiveTab(value)
          }
          variant="fullWidth"
          TabIndicatorProps={{
            sx: {
              height: '100%',
              borderRadius: 5,
              backgroundColor: '#FFFFFF',
              zIndex: 0,
            },
          }}
          sx={{
            minHeight: 46,
            '& .MuiTabs-flexContainer': {
              position: 'relative',
              zIndex: 1,
            },
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontSize: 18,
              fontWeight: 700,
              color: '#777777',
              zIndex: 2,
            },
            '& .Mui-selected': {
              color: '#3F2075',
            },
          }}
        >
          <Tab label="Details" />
          <Tab label="History" />
        </Tabs>
      </Box>

      {/* DETAILS */}
      {activeTab === 0 && (
        <>
          {/* SOFT GREEN FEATURE CARD */}
          <Box
            sx={{
              height: 205,
              borderRadius: 4,
              backgroundColor: '#DFF9E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: 105,
                lineHeight: 1,
                fontWeight: 500,
                color: '#67CF8D',
                letterSpacing: '-10px',
              }}
            >
              ₦
            </Typography>
          </Box>

          {/* BALANCE */}
          <Box
            sx={{
              textAlign: 'center',
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                color: '#999999',
                mb: 0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  color: '#67CF8D',
                  fontWeight: 800,
                  mr: 0.8,
                }}
              >
                ₦
              </Box>
              Save Wallet
            </Typography>

            <Typography
              sx={{
                fontSize: {
                  xs: 42,
                  sm: 46,
                },
                fontWeight: 800,
                color: '#111111',
                letterSpacing: '-1.5px',
              }}
            >
              {formatMoney(
                wallet?.balance || 0
              )}
            </Typography>
          </Box>

          {/* ACTION BUTTONS */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              mb: 5,
            }}
          >
            <Paper
              elevation={0}
              onClick={() =>
                setSaveDialogOpen(true)
              }
              sx={{
                height: 82,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                px: 2.5,
                cursor: 'pointer',
                boxShadow:
                  '0 7px 25px rgba(0,0,0,0.07)',
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#6AD392',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.5,
                }}
              >
                <AddRoundedIcon
                  sx={{
                    color: '#FFFFFF',
                    fontSize: 24,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color: '#55C884',
                  fontWeight: 800,
                  fontSize: 18,
                }}
              >
                Save
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              onClick={() =>
                setWithdrawDialogOpen(true)
              }
              sx={{
                height: 82,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                px: 2.5,
                cursor:
                  Number(wallet?.balance || 0) >
                  0
                    ? 'pointer'
                    : 'default',
                opacity:
                  Number(wallet?.balance || 0) >
                  0
                    ? 1
                    : 0.55,
                boxShadow:
                  '0 7px 25px rgba(0,0,0,0.07)',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#B9EED0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.5,
                }}
              >
                <RemoveRoundedIcon
                  sx={{
                    color: '#FFFFFF',
                    fontSize: 23,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  color: '#9ADDB7',
                  fontWeight: 800,
                  fontSize: 18,
                }}
              >
                Withdraw
              </Typography>
            </Paper>
          </Box>

          {/* SPEND + SAVE */}
          <Box sx={{ px: 0.8 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: '#3F2075',
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  Spend + Save
                </Typography>

                <Typography
                  sx={{
                    color: '#929292',
                    fontSize: 14,
                    mt: 0.4,
                  }}
                >
                  {spendSaveEnabled
                    ? 'Automatically saving on eligible transfers.'
                    : 'Turn on your Spend + Save.'}
                </Typography>
              </Box>

              <Switch
                checked={spendSaveEnabled}
                onChange={
                  handleSpendSaveToggle
                }
                disabled={updatingSettings}
                sx={{
                  width: 66,
                  height: 40,
                  p: 0,

                  '& .MuiSwitch-switchBase': {
                    p: '4px',
                    '&.Mui-checked': {
                      transform:
                        'translateX(26px)',
                      color: '#FFFFFF',

                      '& + .MuiSwitch-track': {
                        opacity: 1,
                        backgroundColor:
                          '#6AD392',
                      },
                    },
                  },

                  '& .MuiSwitch-thumb': {
                    width: 32,
                    height: 32,
                    boxShadow:
                      '0 2px 6px rgba(0,0,0,0.15)',
                  },

                  '& .MuiSwitch-track': {
                    borderRadius: 20,
                    backgroundColor:
                      '#C9C9CD',
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 3,
                mt: 2,
                borderBottom:
                  '1px solid #E5E5E5',
              }}
            >
              <Typography
                sx={{
                  color: '#999999',
                  fontSize: 17,
                }}
              >
                Amount To Save
              </Typography>

              <Typography
                sx={{
                  color: spendSaveEnabled
                    ? '#60CA8A'
                    : '#A8A8A8',
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                {Number(spendSaveAmount) > 0
                ? formatMoney(spendSaveAmount)
                  : 'Not set'}
              </Typography>
            </Box>

            <Button
              fullWidth
              startIcon={
                <EditRoundedIcon />
              }
              onClick={() =>
                setEditDialogOpen(true)
              }
              sx={{
                mt: 2.5,
                py: 1.5,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                color: '#3F2075',
                backgroundColor: '#F8F5FC',
                '&:hover': {
                  backgroundColor: '#F1EBF8',
                },
              }}
            >
              Edit Spend + Save
            </Button>
          </Box>
        </>
      )}

      {/* HISTORY */}
      {activeTab === 1 && (
        <Box>
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 800,
              color: '#111111',
              mb: 2,
            }}
          >
            Savings History
          </Typography>

          {transactions.length === 0 ? (
            <Box
              sx={{
                py: 8,
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  color: '#777777',
                  fontSize: 16,
                }}
              >
                No savings activity yet.
              </Typography>
            </Box>
          ) : (
            <Box>
              {transactions.map(
                (transaction, index) => {
                  const credit =
                    transaction.direction ===
                    'credit';

                  return (
                    <Box key={transaction.id}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:
                            'space-between',
                          py: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              backgroundColor:
                                credit
                                  ? '#E1F8EA'
                                  : '#F4F4F4',
                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              mr: 1.5,
                              flexShrink: 0,
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

                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: 15,
                              }}
                            >
                              {getTransactionLabel(
                                transaction.type
                              )}
                            </Typography>

                            <Typography
                              sx={{
                                color: '#999999',
                                fontSize: 12,
                                mt: 0.3,
                              }}
                            >
                              {formatDate(
                                transaction.created_at
                              )}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: credit
                              ? '#58C886'
                              : '#777777',
                            fontSize: 15,
                            whiteSpace:
                              'nowrap',
                            ml: 2,
                          }}
                        >
                          {credit ? '+' : '-'}
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

      {/* SAVE DIALOG */}
      <Dialog
        open={saveDialogOpen}
        onClose={() =>
          !saving &&
          setSaveDialogOpen(false)
        }
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          Save Money
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: '#888888',
              mb: 2,
            }}
          >
            Move money from your Main Account
            into your Save Wallet.
          </Typography>

          <TextField
            fullWidth
            autoFocus
            label="Amount"
            type="number"
            value={saveAmount}
            onChange={(e) =>
              setSaveAmount(e.target.value)
            }
            inputProps={{
              min: 0,
              step: '0.01',
            }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setSaveDialogOpen(false)
            }
            disabled={saving}
            sx={{
              textTransform: 'none',
              color: '#777777',
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveMoney}
            disabled={saving}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              backgroundColor: '#087443',
              '&:hover': {
                backgroundColor: '#066139',
              },
            }}
          >
            {saving ? (
              <CircularProgress
                size={21}
                sx={{ color: '#FFFFFF' }}
              />
            ) : (
              'Save'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* WITHDRAW DIALOG */}
      <Dialog
        open={withdrawDialogOpen}
        onClose={() =>
          !withdrawing &&
          setWithdrawDialogOpen(false)
        }
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          Withdraw
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: '#888888',
              mb: 2,
            }}
          >
            Move money from your Save Wallet
            back to your Main Account.
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: '#777777',
              mb: 1.5,
            }}
          >
            Available:{' '}
            <strong>
              {formatMoney(
                wallet?.balance || 0
              )}
            </strong>
          </Typography>

          <TextField
            fullWidth
            autoFocus
            label="Amount"
            type="number"
            value={withdrawAmount}
            onChange={(e) =>
              setWithdrawAmount(
                e.target.value
              )
            }
            inputProps={{
              min: 0,
              step: '0.01',
            }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setWithdrawDialogOpen(false)
            }
            disabled={withdrawing}
            sx={{
              textTransform: 'none',
              color: '#777777',
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleWithdraw}
            disabled={withdrawing}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              backgroundColor: '#087443',
              '&:hover': {
                backgroundColor: '#066139',
              },
            }}
          >
            {withdrawing ? (
              <CircularProgress
                size={21}
                sx={{ color: '#FFFFFF' }}
              />
            ) : (
              'Withdraw'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT SPEND + SAVE */}
      <Dialog
        open={editDialogOpen}
        onClose={() =>
          !updatingSettings &&
          setEditDialogOpen(false)
        }
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          Spend + Save
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: '#888888',
              mb: 2.5,
            }}
          >
            Choose the fixed amount you want
            to automatically save whenever
            you make an eligible successful
            transfer.
          </Typography>

          <TextField
            fullWidth
            autoFocus
            label="Amount To Save"
            type="number"
            value={spendSaveAmount}
            onChange={(e) =>
              setSpendSaveAmount(
                e.target.value
              )
            }
            inputProps={{
              min: 0,
              step: '0.01',
            }}
            sx={{ mb: 2 }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              p: 1.5,
              borderRadius: 2,
              backgroundColor: '#F7F7F7',
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              Spend + Save
            </Typography>

            <Switch
              checked={spendSaveEnabled}
              onChange={(e) =>
                setSpendSaveEnabled(
                  e.target.checked
                )
              }
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked':
                  {
                    color: '#67CF8D',
                  },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                  {
                    backgroundColor:
                      '#67CF8D',
                  },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setEditDialogOpen(false)
            }
            disabled={updatingSettings}
            sx={{
              textTransform: 'none',
              color: '#777777',
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              handleUpdateSpendSave
            }
            disabled={updatingSettings}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              backgroundColor: '#087443',
              '&:hover': {
                backgroundColor: '#066139',
              },
            }}
          >
            {updatingSettings ? (
              <CircularProgress
                size={21}
                sx={{ color: '#FFFFFF' }}
              />
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICATIONS */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError('')}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{
            borderRadius: 2,
            width: '100%',
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3500}
        onClose={() => setSuccess('')}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccess('')}
          sx={{
            borderRadius: 2,
            width: '100%',
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Wallet;
