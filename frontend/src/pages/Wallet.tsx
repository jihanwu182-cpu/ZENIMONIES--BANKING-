import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

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
  type: 'manual_save' | 'spend_save' | 'withdrawal' | 'reversal' | 'adjustment';
  direction: 'credit' | 'debit';
  amount: number | string;
  currency: string;
  reference: string;
  description?: string | null;
  balance_before: number | string;
  balance_after: number | string;
  created_at: string;
};

const getToken = () => localStorage.getItem('zenimonies_token');

const formatMoney = (value: number | string) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getErrorMessage = async (response: Response) => {
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

const getTransactionLabel = (type: WalletTransaction['type']) => {
  switch (type) {
    case 'manual_save':
      return 'Money Saved';

    case 'spend_save':
      return 'Spend & Save';

    case 'withdrawal':
      return 'Withdrawn to Main Account';

    case 'reversal':
      return 'Savings Reversal';

    case 'adjustment':
      return 'Wallet Adjustment';

    default:
      return 'Wallet Transaction';
  }
};

const getTransactionDescription = (
  transaction: WalletTransaction
) => {
  if (transaction.description) {
    return transaction.description;
  }

  return getTransactionLabel(transaction.type);
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

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const [saveAmount, setSaveAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [spendSaveAmount, setSpendSaveAmount] = useState('');

  const [saveDescription, setSaveDescription] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');

  const [spendSaveEnabled, setSpendSaveEnabled] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [walletResponse, transactionsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/wallet`, {
            method: 'GET',
            headers: authHeaders,
          }),
          fetch(`${API_URL}/api/wallet/transactions`, {
            method: 'GET',
            headers: authHeaders,
          }),
        ]);

      if (!walletResponse.ok) {
        throw new Error(await getErrorMessage(walletResponse));
      }

      if (!transactionsResponse.ok) {
        throw new Error(await getErrorMessage(transactionsResponse));
      }

      const walletData = await walletResponse.json();
      const transactionData = await transactionsResponse.json();

      const walletResult =
        walletData?.wallet || walletData;

      const transactionsResult =
        transactionData?.transactions ||
        transactionData?.data ||
        [];

      setWallet(walletResult);
      setTransactions(
        Array.isArray(transactionsResult)
          ? transactionsResult
          : []
      );

      setSpendSaveEnabled(
        Boolean(walletResult?.spend_save_enabled)
      );

      setSpendSaveAmount(
        walletResult?.spend_save_amount
          ? String(walletResult.spend_save_amount)
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

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSaveMoney = async () => {
    clearMessages();

    const amount = Number(saveAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount to save.');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/wallet/save`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            amount,
            description:
              saveDescription.trim() ||
              'Manual Save Money',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
        );
      }

      setSaveAmount('');
      setSaveDescription('');

      setSuccess(
        `${formatMoney(amount)} has been moved to your Save Wallet.`
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
    clearMessages();

    const amount = Number(withdrawAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount to withdraw.');
      return;
    }

    const walletBalance = Number(
      wallet?.balance || 0
    );

    if (amount > walletBalance) {
      setError(
        'The withdrawal amount is greater than your Save Wallet balance.'
      );
      return;
    }

    try {
      setWithdrawing(true);

      const response = await fetch(
        `${API_URL}/api/wallet/withdraw`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            amount,
            description:
              withdrawDescription.trim() ||
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
      setWithdrawDescription('');

      setSuccess(
        `${formatMoney(amount)} has been moved back to your Main Account.`
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
    clearMessages();

    const enabled = event.target.checked;

    if (enabled) {
      const amount = Number(spendSaveAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        setError(
          'Enter the amount you want to automatically save before turning Spend & Save on.'
        );
        return;
      }
    }

    try {
      setUpdatingSettings(true);

      const response = await fetch(
        `${API_URL}/api/wallet/settings`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            enabled,
            amount: Number(spendSaveAmount || 0),
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
          ? `Spend & Save is now on. ${formatMoney(
              Number(spendSaveAmount)
            )} will be saved on each eligible successful transfer.`
          : 'Spend & Save has been turned off.'
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to update Spend & Save.'
      );
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleSpendSaveAmount = async () => {
    clearMessages();

    const amount = Number(spendSaveAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Enter a valid positive amount for Spend & Save.'
      );
      return;
    }

    try {
      setUpdatingSettings(true);

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

      setSuccess(
        `Spend & Save amount updated to ${formatMoney(
          amount
        )}.`
      );

      await loadWallet();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to update your savings amount.'
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
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 4 },
      }}
    >
      {/* HEADER */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#1B1B1B',
            fontSize: {
              xs: '1.7rem',
              sm: '2rem',
            },
          }}
        >
          Save Wallet
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: '#777',
            mt: 0.5,
          }}
        >
          Save money separately while keeping your
          Main Account available for everyday spending.
        </Typography>
      </Box>

      {/* ALERTS */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess('')}
          sx={{ mb: 2 }}
        >
          {success}
        </Alert>
      )}

      {/* BALANCE CARD */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          background:
            'linear-gradient(135deg, #087443 0%, #0A8F55 100%)',
          color: '#fff',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography
            sx={{
              fontSize: '0.9rem',
              opacity: 0.9,
              mb: 1,
            }}
          >
            Saved Balance
          </Typography>

          <Typography
            sx={{
              fontSize: {
                xs: '2rem',
                sm: '2.4rem',
              },
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            {formatMoney(wallet?.balance || 0)}
          </Typography>

          <Typography
            sx={{
              fontSize: '0.8rem',
              opacity: 0.85,
              mt: 1,
            }}
          >
            Your money is kept separately from your
            Main Account.
          </Typography>
        </CardContent>
      </Card>

      {/* SAVE / WITHDRAW */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid #E8E8E8',
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            Manage your savings
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: '#777',
              mb: 2.5,
            }}
          >
            Move money between your Main Account and
            Save Wallet.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
              },
              gap: 2,
            }}
          >
            {/* SAVE MONEY */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Save Money
              </Typography>

              <TextField
                fullWidth
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
                sx={{ mb: 1.5 }}
              />

              <TextField
                fullWidth
                label="Description (optional)"
                value={saveDescription}
                onChange={(e) =>
                  setSaveDescription(e.target.value)
                }
                sx={{ mb: 1.5 }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleSaveMoney}
                disabled={saving}
                sx={{
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: '#087443',
                  '&:hover': {
                    backgroundColor: '#066139',
                  },
                }}
              >
                {saving ? (
                  <CircularProgress
                    size={22}
                    sx={{ color: '#fff' }}
                  />
                ) : (
                  'Save Money'
                )}
              </Button>
            </Box>

            {/* WITHDRAW */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Withdraw
              </Typography>

              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={withdrawAmount}
                onChange={(e) =>
                  setWithdrawAmount(e.target.value)
                }
                inputProps={{
                  min: 0,
                  step: '0.01',
                }}
                sx={{ mb: 1.5 }}
              />

              <TextField
                fullWidth
                label="Description (optional)"
                value={withdrawDescription}
                onChange={(e) =>
                  setWithdrawDescription(e.target.value)
                }
                sx={{ mb: 1.5 }}
              />

              <Button
                fullWidth
                variant="outlined"
                onClick={handleWithdraw}
                disabled={withdrawing}
                sx={{
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  color: '#087443',
                  borderColor: '#087443',
                  '&:hover': {
                    borderColor: '#066139',
                    backgroundColor: '#F2FAF6',
                  },
                }}
              >
                {withdrawing ? (
                  <CircularProgress
                    size={22}
                    sx={{ color: '#087443' }}
                  />
                ) : (
                  'Withdraw to Main Account'
                )}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* SPEND & SAVE */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid #E8E8E8',
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
              gap: 2,
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                Spend & Save
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#777',
                  mt: 0.5,
                }}
              >
                Automatically save a fixed amount when
                you make an eligible successful transfer.
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={spendSaveEnabled}
                  onChange={handleSpendSaveToggle}
                  disabled={updatingSettings}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#087443',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                      {
                        backgroundColor: '#087443',
                      },
                  }}
                />
              }
              label={
                spendSaveEnabled
                  ? 'On'
                  : 'Off'
              }
            />
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Typography
            sx={{
              fontWeight: 600,
              mb: 1,
            }}
          >
            Amount to save per eligible transfer
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
            }}
          >
            <TextField
              fullWidth
              label="Save amount"
              type="number"
              value={spendSaveAmount}
              onChange={(e) =>
                setSpendSaveAmount(e.target.value)
              }
              inputProps={{
                min: 0,
                step: '0.01',
              }}
              helperText="Enter any positive fixed amount."
            />

            <Button
              variant="contained"
              onClick={handleSpendSaveAmount}
              disabled={updatingSettings}
              sx={{
                minWidth: {
                  xs: '100%',
                  sm: 150,
                },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: '#087443',
                '&:hover': {
                  backgroundColor: '#066139',
                },
              }}
            >
              {updatingSettings ? (
                <CircularProgress
                  size={22}
                  sx={{ color: '#fff' }}
                />
              ) : (
                'Set Amount'
              )}
            </Button>
          </Box>

          {spendSaveEnabled && (
            <Alert
              severity="success"
              sx={{ mt: 2 }}
            >
              Spend & Save is active.{' '}
              {formatMoney(
                Number(spendSaveAmount || 0)
              )}{' '}
              will be saved on each eligible successful
              transfer.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* HISTORY */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid #E8E8E8',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            Savings History
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: '#777',
              mb: 2,
            }}
          >
            Your Save Wallet activity.
          </Typography>

          {transactions.length === 0 ? (
            <Box
              sx={{
                py: 5,
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  color: '#555',
                }}
              >
                No savings yet
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#888',
                  mt: 0.5,
                }}
              >
                Your savings activity will appear here.
              </Typography>
            </Box>
          ) : (
            <Box>
              {transactions.map((transaction, index) => {
                const isCredit =
                  transaction.direction === 'credit';

                return (
                  <Box
                    key={transaction.id}
                    sx={{
                      py: 2,
                      borderBottom:
                        index === transactions.length - 1
                          ? 'none'
                          : '1px solid #EEEEEE',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'flex-start',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            color: '#222',
                          }}
                        >
                          {getTransactionLabel(
                            transaction.type
                          )}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: '#777',
                            mt: 0.3,
                            wordBreak: 'break-word',
                          }}
                        >
                          {getTransactionDescription(
                            transaction
                          )}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            color: '#999',
                            display: 'block',
                            mt: 0.5,
                          }}
                        >
                          {formatDate(
                            transaction.created_at
                          )}
                        </Typography>
                      </Box>

                      <Typography
                        sx={{
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: isCredit
                            ? '#087443'
                            : '#C62828',
                        }}
                      >
                        {isCredit ? '+' : '-'}
                        {formatMoney(
                          transaction.amount
                        )}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Wallet;
