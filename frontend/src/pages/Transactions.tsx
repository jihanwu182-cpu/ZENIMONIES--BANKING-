

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Container,
  Dialog, DialogContent, Divider, IconButton, InputAdornment,
  MenuItem, Select, SelectChangeEvent, Stack, TextField, Typography,
} from '@mui/material';
import {
  AccountBalanceWalletRounded, ArrowDownwardRounded,
  ArrowUpwardRounded, CheckCircleRounded, ChevronRightRounded,
  CloseRounded, ContentCopyRounded, DownloadRounded, ErrorRounded,
  FilterListRounded, PhoneAndroidRounded, ReceiptLongRounded,
  RefreshRounded, ScheduleRounded, SearchRounded, SwapHorizRounded,
  VerifiedRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL =
  (process.env.REACT_APP_API_URL || 'https://zenimonies-banking.onrender.com/api')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

type Direction = 'credit' | 'debit';

interface Transaction {
  id: string | number;
  type: string;
  amount: number | string;
  currency?: string;
  reference?: string;
  transaction_reference?: string;
  description?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  transaction_fee?: number | string;
  fee?: number | string;
  total_debit?: number | string;
  direction?: Direction | string;
  wallet_id?: string;
  account_id?: string;
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
  electricity_token?: string;
  units?: string | number;
  meter_number?: string;
  meter_type?: string;
  biller_name?: string;
  customer_name?: string;
  verification_status?: string;
  tariff_class?: string;
  provider_response_message?: string;
  [key: string]: unknown;
}

const getRecordList = (data: any, keys: string[]): any[] => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const normalizeStatus = (value?: string): string => {
  const status = String(value || '').trim().toLowerCase();
  if (['success', 'successful', 'completed', 'delivered'].includes(status)) return 'completed';
  if (['failed', 'failure', 'cancelled', 'canceled', 'error'].includes(status)) return 'failed';
  if (['reversed', 'reversal'].includes(status)) return 'reversed';
  if (['processing', 'in_progress', 'in progress'].includes(status)) return 'processing';
  if (['refunded'].includes(status)) return 'refunded';
  if (['pending', 'initiated', 'queued'].includes(status)) return 'pending';
  return status || 'unknown';
};

const toAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
};

const getTransactionDate = (transaction: Transaction): number => {
  const value = transaction.created_at || transaction.createdAt;
  if (!value) return 0;
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : 0;
};

const getReference = (transaction: Transaction): string =>
  String(transaction.reference || transaction.transaction_reference || '').trim();

const Transactions: React.FC = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  const getToken = useCallback(() =>
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token'), []);

  const loadTransactions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    const token = getToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      navigate('/login');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // The main account history is the primary source.
      const accountResponse = await axios.get(
        `${API_URL}/api/account/transactions`,
        { headers, timeout: 15000 }
      );

      const accountTransactions = getRecordList(
        accountResponse.data,
        ['transactions', 'data', 'records']
      ) as Transaction[];

      // Optional sources must never block the main history.
      const [walletResult, electricityResult] = await Promise.allSettled([
        axios.get(`${API_URL}/api/wallet/transactions`, { headers, timeout: 8000 }),
        axios.get(`${API_URL}/api/bills/electricity/reconciliation`, {
          headers,
          timeout: 8000,
        }),
      ]);

      let walletRecords: any[] = [];
      if (walletResult.status === 'fulfilled') {
        walletRecords = getRecordList(
          walletResult.value.data,
          ['transactions', 'data', 'records']
        );
      } else {
        console.warn('Optional Save Wallet history unavailable.');
      }

      let electricityRecords: any[] = [];
      if (electricityResult.status === 'fulfilled') {
        electricityRecords = getRecordList(
          electricityResult.value.data,
          ['payments', 'transactions', 'data', 'records']
        );
      } else {
        console.warn('Optional electricity reconciliation unavailable.');
      }

      // Merge reconciliation information into the actual account records.
      const electricityByReference = new Map<string, any>();
      electricityRecords.forEach((record) => {
        const ref = String(
          record?.reference || record?.transaction_reference || ''
        ).trim();
        if (ref) electricityByReference.set(ref, record);
      });

      const enrichedTransactions = accountTransactions.map((transaction) => {
        const ref = getReference(transaction);
        const electricity = ref ? electricityByReference.get(ref) : undefined;
        if (!electricity) return transaction;

        return {
          ...transaction,
          electricity_token: electricity.electricity_token || transaction.electricity_token,
          units: electricity.units ?? transaction.units,
          meter_number: electricity.meter_number || transaction.meter_number,
          meter_type: electricity.meter_type || transaction.meter_type,
          biller_name: electricity.biller_name || transaction.biller_name,
          customer_name: electricity.customer_name || transaction.customer_name,
          verification_status: electricity.verification_status || transaction.verification_status,
          tariff_class: electricity.tariff_class || transaction.tariff_class,
          provider_response_message:
            electricity.provider_response_message || transaction.provider_response_message,
          provider_reference:
            transaction.provider_reference || electricity.provider_reference,
        };
      });

      // Keep only actual Spend + Save records. Preserve their real status and direction.
      const spendSaveTransactions: Transaction[] = walletRecords
        .filter((record) => String(record?.type || '').toLowerCase() === 'spend_save')
        .map((record) => ({
          ...record,
          id: `save-${String(record.id)}`,
          type: 'spend_save',
          amount: record.amount ?? 0,
          currency: 'NGN',
          description: record.description || 'Spend + Save',
          status: record.status || record.transaction_status || 'unknown',
          created_at: record.created_at || record.createdAt,
          direction: record.direction,
          wallet_id: record.wallet_id,
          account_id: record.account_id,
        }));

      // Deduplicate records by their source ID or transaction reference.
      const merged = [...enrichedTransactions, ...spendSaveTransactions];
      const seen = new Set<string>();
      const unique = merged.filter((transaction) => {
        const key = getReference(transaction) ||
          `${String(transaction.id)}:${String(transaction.created_at || transaction.createdAt || '')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setTransactions(unique);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);

      if (err?.response?.status === 401) {
        localStorage.removeItem('zenimonies_token');
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        navigate('/login');
        return;
      }

      setError(
        err?.response?.data?.message ||
        'Unable to load your transaction history. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, navigate]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const getType = (transaction: Transaction) =>
    String(transaction.type || '').toLowerCase();

  const getStatus = (transaction: Transaction) =>
    normalizeStatus(transaction.status);

  const getDescription = (transaction: Transaction): string => {
    if (transaction.description?.trim()) return transaction.description.trim();

    const type = getType(transaction);
    if (type.includes('deposit') || type.includes('funding')) return 'Account Funding';
    if (type.includes('received') || type === 'internal_transfer_received') return 'Money Received';
    if (type.includes('transfer') || type.includes('bank')) return 'Bank Transfer';
    if (type.includes('airtime')) return 'Airtime Purchase';
    if (type.includes('data')) return 'Mobile Data';
    if (type.includes('electricity')) return 'Electricity Payment';
    if (type.includes('internet')) return 'Internet Subscription';
    if (type.includes('tv')) return 'TV Subscription';
    if (type.includes('betting')) return 'Betting Wallet Funding';
    if (type.includes('insurance')) return 'Insurance Payment';
    if (type.includes('refund') || type.includes('reversal')) return 'Transaction Reversal';
    if (type === 'spend_save') return 'Spend + Save';

    return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
      'Transaction';
  };

  const getCategory = (transaction: Transaction): string => {
    const type = getType(transaction);
    const description = String(transaction.description || '').toLowerCase();

    if (type === 'spend_save' || type.includes('saving') || type.includes('save_wallet') ||
        description.includes('spend + save') || description.includes('save wallet')) return 'savings';
    if (type.includes('deposit') || type.includes('funding')) return 'deposits';
    if (type.includes('transfer') || type.includes('bank') || type.includes('internal')) return 'transfers';
    if (type.includes('airtime')) return 'airtime';
    if (type.includes('data')) return 'data';
    if (type.includes('electricity') || type.includes('internet') || type.includes('tv') ||
        type.includes('bill') || description.includes('bill')) return 'bills';
    return 'other';
  };

  const getCategoryLabel = (transaction: Transaction) => ({
    deposits: 'Deposit',
    transfers: 'Transfer',
    savings: 'Savings',
    airtime: 'Airtime',
    data: 'Data',
    bills: 'Bills',
    other: 'Other',
  }[getCategory(transaction)] || 'Other');

  const isCredit = (transaction: Transaction): boolean | null => {
    const explicit = String(transaction.direction || '').toLowerCase();
    if (explicit === 'credit' || explicit === 'debit') return explicit === 'credit';

    const type = getType(transaction);
    if (type === 'spend_save') return null; // Direction is not inferred.
    if (type.includes('received') || type.includes('deposit') || type.includes('funding') ||
        type.includes('credit') || type.includes('refund') || type.includes('reversal')) return true;
    if (type.includes('transfer') || type.includes('airtime') || type.includes('data') ||
        type.includes('electricity') || type.includes('internet') || type.includes('tv') ||
        type.includes('bill') || type.includes('betting') || type.includes('insurance')) return false;

    return null;
  };

  const formatAmount = (value: unknown) => {
    const amount = toAmount(value);
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusConfig = (value?: string) => {
    const status = normalizeStatus(value);

    if (status === 'completed') return {
      label: 'Successful', background: '#E8F8F1', color: '#087A4B',
      icon: <CheckCircleRounded sx={{ fontSize: 14 }} />,
    };
    if (status === 'failed') return {
      label: 'Failed', background: '#FDECEC', color: '#C62828',
      icon: <ErrorRounded sx={{ fontSize: 14 }} />,
    };
    if (status === 'reversed') return {
      label: 'Reversed', background: '#F1F3F2', color: '#59645F',
      icon: <RefreshRounded sx={{ fontSize: 14 }} />,
    };
    if (status === 'refunded') return {
      label: 'Refunded', background: '#EAF4FF', color: '#1769AA',
      icon: <RefreshRounded sx={{ fontSize: 14 }} />,
    };
    if (status === 'processing') return {
      label: 'Processing', background: '#EAF4FF', color: '#1769AA',
      icon: <ScheduleRounded sx={{ fontSize: 14 }} />,
    };
    if (status === 'pending') return {
      label: 'Pending', background: '#FFF5DF', color: '#8A5A00',
      icon: <ScheduleRounded sx={{ fontSize: 14 }} />,
    };
    return {
      label: 'Status unavailable', background: '#F2F4F3', color: '#59645F',
      icon: <ScheduleRounded sx={{ fontSize: 14 }} />,
    };
  };

  const getTransactionIcon = (transaction: Transaction) => {
    const category = getCategory(transaction);
    if (category === 'deposits') return <AccountBalanceWalletRounded />;
    if (category === 'transfers') return <SwapHorizRounded />;
    if (category === 'airtime' || category === 'data') return <PhoneAndroidRounded />;
    if (category === 'bills') return <ReceiptLongRounded />;
    const credit = isCredit(transaction);
    return credit === true ? <ArrowDownwardRounded /> :
      credit === false ? <ArrowUpwardRounded /> : <ReceiptLongRounded />;
  };

  const getIconStyle = (transaction: Transaction) => {
    const category = getCategory(transaction);
    if (category === 'deposits') return { background: '#E8F8F1', color: '#087A4B' };
    if (category === 'transfers' || category === 'savings') return { background: '#EAF7F3', color: '#008C68' };
    if (category === 'airtime') return { background: '#EEF7F5', color: '#008C68' };
    if (category === 'data') return { background: '#EEF4F8', color: '#287A9D' };
    if (category === 'bills') return { background: '#EFF7F4', color: '#167A60' };
    return { background: '#F1F5F3', color: '#52645D' };
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const getDateGroup = (value?: string) => {
    if (!value) return 'Earlier';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Earlier';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    if (day === today) return 'Today';
    if (day === yesterdayDate) return 'Yesterday';
    return date.toLocaleDateString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const maskAccount = (value?: string) => {
    if (!value) return '';
    const text = String(value);
    return text.length <= 4 ? text : `•••• ${text.slice(-4)}`;
  };

  const maskPhone = (value?: string) => {
    if (!value) return '';
    const text = String(value);
    return text.length <= 6 ? text : `${text.slice(0, 4)}••••${text.slice(-3)}`;
  };

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        const matchesCategory = category === 'all' || getCategory(transaction) === category;
        const matchesStatus = statusFilter === 'all' || getStatus(transaction) === statusFilter;
        const text = [
          getDescription(transaction), transaction.type, getReference(transaction),
          transaction.sender_name, transaction.recipient_name, transaction.recipient_bank,
          transaction.provider, transaction.network, transaction.phone,
          transaction.customer_number, transaction.provider_reference, transaction.data_plan,
          transaction.status, transaction.meter_number,
        ].filter(Boolean).join(' ').toLowerCase();

        return matchesCategory && matchesStatus && (!query || text.includes(query));
      })
      .sort((a, b) => getTransactionDate(b) - getTransactionDate(a));
  }, [transactions, category, statusFilter, search]);

  // Only records with a known direction contribute to money-in/out totals.
  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;
    let knownDirectionCount = 0;

    filteredTransactions.forEach((transaction) => {
      const direction = isCredit(transaction);
      if (direction === null) return;
      knownDirectionCount += 1;
      if (direction) moneyIn += toAmount(transaction.amount);
      else moneyOut += toAmount(transaction.total_debit ?? transaction.amount);
    });

    return { count: filteredTransactions.length, moneyIn, moneyOut, knownDirectionCount };
  }, [filteredTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((transaction) => {
      const group = getDateGroup(transaction.created_at || transaction.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(transaction);
    });
    return Object.entries(groups);
  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setStatusFilter('all');
  };

  const copyReference = async (reference?: string) => {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const openReceipt = (transaction: Transaction) => {
    setSelectedTransaction(null);
    navigate('/transaction-receipt', { state: { transaction } });
  };

  const handlePrint = () => window.print();

  const selectedStatus = selectedTransaction
    ? getStatusConfig(selectedTransaction.status)
    : null;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F1FAF6 0px, #F8FAF9 360px)',
      pb: 7,
    }}>
      <Box className="transaction-print-header" sx={{ pt: { xs: 1.5, sm: 3 }, pb: 1.8 }}>
        <Container maxWidth="md" sx={{ px: { xs: 1.5, sm: 3 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <IconButton aria-label="Go back" onClick={() => navigate(-1)} sx={{
              width: 44, height: 44, background: '#fff', color: '#18231F',
              border: '1px solid #E8EEEB',
            }}>
              <ChevronRightRounded sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
            <Box textAlign="center">
              <Typography sx={{
                fontSize: { xs: 20, sm: 25 }, fontWeight: 900,
                color: '#14221D', letterSpacing: '-0.6px',
              }}>Transactions</Typography>
              <Typography sx={{ fontSize: 11, color: '#7D8984', mt: 0.3 }}>
                Your transaction history
              </Typography>
            </Box>
            <IconButton aria-label="Print transaction history" onClick={handlePrint} sx={{
              width: 44, height: 44, background: '#fff', color: '#008C68',
              border: '1px solid #E8EEEB',
            }}>
              <DownloadRounded />
            </IconButton>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ px: { xs: 1.5, sm: 3 } }}>
        <Card sx={{
          borderRadius: 4, overflow: 'hidden', color: '#fff',
          background: 'linear-gradient(135deg, #063F31 0%, #087A4B 55%, #00A875 100%)',
          boxShadow: '0 18px 36px rgba(0,104,75,0.16)', mb: 1.8,
        }}>
          <Box sx={{ p: { xs: 2, sm: 2.8 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <VerifiedRounded sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 11, opacity: 0.8, fontWeight: 700 }}>
                    Account activity
                  </Typography>
                </Stack>
                <Typography sx={{
                  fontSize: { xs: 26, sm: 31 }, fontWeight: 900,
                  mt: 0.5, letterSpacing: '-0.5px',
                }}>{summary.count}</Typography>
                <Typography sx={{ fontSize: 11.5, opacity: 0.8 }}>
                  transactions in this view
                </Typography>
              </Box>
              <Box sx={{
                width: 46, height: 46, borderRadius: '50%',
                background: 'rgba(255,255,255,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><ReceiptLongRounded /></Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Box sx={{
                flex: 1, minWidth: 0, p: { xs: 1.15, sm: 1.4 },
                borderRadius: 2.5, background: 'rgba(255,255,255,0.10)',
              }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ArrowDownwardRounded sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: 10, opacity: 0.8 }}>Money in</Typography>
                </Stack>
                <Typography sx={{
                  fontWeight: 900, fontSize: { xs: 12, sm: 15 }, mt: 0.5,
                  overflowWrap: 'anywhere',
                }}>{formatAmount(summary.moneyIn)}</Typography>
              </Box>
              <Box sx={{
                flex: 1, minWidth: 0, p: { xs: 1.15, sm: 1.4 },
                borderRadius: 2.5, background: 'rgba(255,255,255,0.10)',
              }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ArrowUpwardRounded sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: 10, opacity: 0.8 }}>Money out</Typography>
                </Stack>
                <Typography sx={{
                  fontWeight: 900, fontSize: { xs: 12, sm: 15 }, mt: 0.5,
                  overflowWrap: 'anywhere',
                }}>{formatAmount(summary.moneyOut)}</Typography>
              </Box>
            </Stack>
            {summary.knownDirectionCount !== summary.count && (
              <Typography sx={{ fontSize: 10, opacity: 0.78, mt: 1 }}>
                Totals include only transactions whose direction can be identified.
              </Typography>
            )}
          </Box>
        </Card>

        <TextField
          fullWidth value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search description, reference, recipient or provider"
          inputProps={{ 'aria-label': 'Search transactions' }}
          sx={{
            mb: 1.2, background: '#fff', borderRadius: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3, minHeight: 52,
              '& fieldset': { borderColor: '#E5ECE9' },
              '&:hover fieldset': { borderColor: '#B9D9CF' },
              '&.Mui-focused fieldset': { borderColor: '#00A875' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded sx={{ color: '#7E8B86' }} />
              </InputAdornment>
            ),
          }}
        />

        <Card sx={{
          p: 1, borderRadius: 3, mb: 1.7,
          boxShadow: '0 5px 18px rgba(21,39,32,0.05)', border: '1px solid #EAEFED',
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1 }}>
              <FilterListRounded sx={{ color: '#75817D', ml: 0.3 }} />
              <Select
                value={category}
                onChange={(event: SelectChangeEvent) => setCategory(event.target.value)}
                size="small" fullWidth inputProps={{ 'aria-label': 'Filter by category' }}
                sx={{ height: 40, fontSize: 12, fontWeight: 700, '& fieldset': { border: 'none' } }}
              >
                <MenuItem value="all">All transactions</MenuItem>
                <MenuItem value="deposits">Deposits</MenuItem>
                <MenuItem value="transfers">Transfers</MenuItem>
                <MenuItem value="savings">Savings</MenuItem>
                <MenuItem value="airtime">Airtime</MenuItem>
                <MenuItem value="data">Data</MenuItem>
                <MenuItem value="bills">Bills</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </Stack>
            <Select
              value={statusFilter}
              onChange={(event: SelectChangeEvent) => setStatusFilter(event.target.value)}
              size="small" fullWidth inputProps={{ 'aria-label': 'Filter by status' }}
              sx={{ height: 40, fontSize: 12, fontWeight: 700, '& fieldset': { border: 'none' }, flex: 1 }}
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="completed">Successful</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="reversed">Reversed</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
              <MenuItem value="unknown">Status unavailable</MenuItem>
            </Select>
          </Stack>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 3, fontSize: 12 }}
            action={<Button color="inherit" size="small" onClick={() => void loadTransactions(true)}>Retry</Button>}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Card sx={{ borderRadius: 3.5, p: 5, textAlign: 'center', border: '1px solid #EAEFED' }}>
            <CircularProgress size={32} sx={{ color: '#00A875' }} />
            <Typography sx={{ mt: 1.5, color: '#7B8782', fontSize: 13 }}>
              Loading your transactions…
            </Typography>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card sx={{ borderRadius: 3.5, p: 4.5, textAlign: 'center', border: '1px solid #EAEFED' }}>
            <Box sx={{
              width: 68, height: 68, borderRadius: '50%', background: '#EAF7F3',
              color: '#008C68', display: 'flex', alignItems: 'center',
              justifyContent: 'center', mx: 'auto',
            }}><ReceiptLongRounded sx={{ fontSize: 31 }} /></Box>
            <Typography sx={{ mt: 1.7, fontSize: 18, fontWeight: 900, color: '#18231F' }}>
              No transactions found
            </Typography>
            <Typography sx={{ mt: 0.6, color: '#7E8985', fontSize: 12, lineHeight: 1.6 }}>
              {search || category !== 'all' || statusFilter !== 'all'
                ? 'Try changing your search or filters.'
                : 'Your transaction activity will appear here.'}
            </Typography>
            {(search || category !== 'all' || statusFilter !== 'all') && (
              <Button onClick={clearFilters} sx={{
                mt: 1.5, color: '#008C68,', fontWeight: 800, textTransform: 'none',
              }}>Clear filters</Button>
            )}
          </Card>
        ) : (
          <Box>
            {groupedTransactions.map(([group, items]) => (
              <Box key={group} sx={{ mb: 2.2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ mb: 0.9, px: 0.3 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#33433C' }}>
                    {group}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: '#8A9590' }}>
                    {items.length} transaction{items.length === 1 ? '' : 's'}
                  </Typography>
                </Stack>
                <Stack spacing={0.8}>
                  {items.map((transaction) => {
                    const direction = isCredit(transaction);
                    const iconStyle = getIconStyle(transaction);
                    const status = getStatusConfig(transaction.status);
                    const amount = toAmount(transaction.amount);
                    const dateValue = transaction.created_at || transaction.createdAt;

                    return (
                      <Card
                        key={`${String(transaction.id)}-${getReference(transaction)}`}
                        role="button" tabIndex={0}
                        onClick={() => { setSelectedTransaction(transaction); setCopied(false); }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedTransaction(transaction);
                            setCopied(false);
                          }
                        }}
                        sx={{
                          p: { xs: 1.25, sm: 1.55 }, borderRadius: 3,
                          cursor: 'pointer', border: '1px solid #E7EEEB',
                          boxShadow: '0 4px 14px rgba(21,39,32,0.035)',
                          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                          '&:hover': { boxShadow: '0 8px 22px rgba(21,39,32,0.07)', borderColor: '#D2E5DE' },
                          '&:focus-visible': { outline: '2px solid #008C68', outlineOffset: 2 },
                        }}
                      >
                        <Stack direction="row" spacing={1.1} alignItems="center">
                          <Box sx={{
                            width: 46, height: 46, minWidth: 46, borderRadius: 2.7,
                            background: iconStyle.background, color: iconStyle.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{getTransactionIcon(transaction)}</Box>

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{
                              fontSize: 13.5, fontWeight: 900, color: '#1B2722',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{getDescription(transaction)}</Typography>
                            <Typography sx={{
                              fontSize: 10.8, color: '#8A9590', mt: 0.25,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {getCategoryLabel(transaction)} · {dateValue && Number.isFinite(new Date(dateValue).getTime())
                                ? new Date(dateValue).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
                                : 'Time unavailable'}
                            </Typography>
                            <Box sx={{ mt: 0.55 }}>
                              <Chip size="small" icon={status.icon} label={status.label} sx={{
                                height: 21, borderRadius: 1.5, background: status.background,
                                color: status.color, fontSize: 9.5, fontWeight: 900,
                                '& .MuiChip-icon': { color: status.color },
                              }} />
                            </Box>
                          </Box>

                          <Box sx={{ textAlign: 'right', minWidth: { xs: 85, sm: 110 } }}>
                            <Typography sx={{
                              fontSize: { xs: 12, sm: 15 }, fontWeight: 900,
                              color: direction === true ? '#009A69' : direction === false ? '#202A26' : '#66716C',
                              whiteSpace: 'nowrap',
                            }}>
                              {direction === true ? '+' : direction === false ? '−' : ''}
                              {formatAmount(amount)}
                            </Typography>
                            <Typography sx={{ fontSize: 9.5, color: '#98A29E', mt: 0.25 }}>
                              NGN
                            </Typography>
                          </Box>
                          <ChevronRightRounded sx={{ color: '#B0B9B5', fontSize: 20 }} />
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        {!loading && (
          <Button fullWidth
            startIcon={refreshing
              ? <CircularProgress size={17} sx={{ color: '#087A4B' }} />
              : <RefreshRounded />}
            onClick={() => void loadTransactions(true)}
            disabled={refreshing}
            sx={{
              mt: 1.5, height: 48, borderRadius: 2.8, color: '#087A4B',
              background: '#EAF7F3', fontWeight: 900, textTransform: 'none',
              '&:hover': { background: '#DDF2EA' },
            }}>
            {refreshing ? 'Refreshing…' : 'Refresh transactions'}
          </Button>
        )}
      </Container>

      <Dialog open={Boolean(selectedTransaction)} onClose={() => setSelectedTransaction(null)}
        fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', m: 1.5 } }}>
        {selectedTransaction && selectedStatus && (
          <>
            <Box sx={{
              background: 'linear-gradient(135deg, #063F31, #008C68)',
              color: '#fff', p: 2,
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={{ fontSize: 17, fontWeight: 900 }}>Transaction details</Typography>
                  <Typography sx={{ fontSize: 10.5, opacity: 0.78, mt: 0.2 }}>
                    Transaction record
                  </Typography>
                </Box>
                <IconButton aria-label="Close details" onClick={() => setSelectedTransaction(null)}
                  sx={{ color: '#fff', background: 'rgba(255,255,255,0.12)' }}>
                  <CloseRounded />
                </IconButton>
              </Stack>
              <Box sx={{ textAlign: 'center', py: 2.2 }}>
                <Box sx={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.14)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1,
                }}>{getTransactionIcon(selectedTransaction)}</Box>
                <Typography sx={{
                  fontSize: { xs: 25, sm: 29 }, fontWeight: 900, letterSpacing: '-0.5px',
                }}>
                  {isCredit(selectedTransaction) === true ? '+' :
                    isCredit(selectedTransaction) === false ? '−' : ''}
                  {formatAmount(selectedTransaction.amount)}
                </Typography>
                <Typography sx={{ opacity: 0.82, fontSize: 12, mt: 0.4 }}>
                  {getDescription(selectedTransaction)}
                </Typography>
                <Chip icon={selectedStatus.icon} label={selectedStatus.label} sx={{
                  mt: 1.2, background: 'rgba(255,255,255,0.13)', color: '#fff',
                  fontWeight: 800, '& .MuiChip-icon': { color: '#fff' },
                }} />
              </Box>
            </Box>

            <DialogContent sx={{ p: 2 }}>
              <Stack spacing={0}>
                <DetailRow label="Date & time"
                  value={formatDate(selectedTransaction.created_at || selectedTransaction.createdAt)} />
                {getReference(selectedTransaction) && (
                  <DetailRow label="Transaction reference" value={getReference(selectedTransaction)}
                    action={
                      <Button size="small" onClick={() => void copyReference(getReference(selectedTransaction))}
                        startIcon={<ContentCopyRounded sx={{ fontSize: 14 }} />}
                        sx={{ minWidth: 0, color: '#008C68', textTransform: 'none', fontSize: 10.5, fontWeight: 800 }}>
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    } />
                )}
                <DetailRow label="Category" value={getCategoryLabel(selectedTransaction)} />
                {selectedTransaction.sender_name && <DetailRow label="Sender" value={selectedTransaction.sender_name} />}
                {selectedTransaction.sender_phone && <DetailRow label="Sender phone" value={maskPhone(selectedTransaction.sender_phone)} />}
                {selectedTransaction.sender_account && <DetailRow label="Sender account" value={maskAccount(selectedTransaction.sender_account)} />}
                {selectedTransaction.recipient_name && <DetailRow label="Recipient" value={selectedTransaction.recipient_name} />}
                {selectedTransaction.recipient_phone && <DetailRow label="Recipient phone" value={maskPhone(selectedTransaction.recipient_phone)} />}
                {selectedTransaction.recipient_account && <DetailRow label="Recipient account" value={maskAccount(selectedTransaction.recipient_account)} />}
                {selectedTransaction.recipient_bank && <DetailRow label="Recipient bank" value={selectedTransaction.recipient_bank} />}
                {selectedTransaction.provider && <DetailRow label="Provider" value={selectedTransaction.provider} />}
                {selectedTransaction.network && <DetailRow label="Network" value={selectedTransaction.network} />}
                {selectedTransaction.phone && <DetailRow label="Service number" value={maskPhone(selectedTransaction.phone)} />}
                {selectedTransaction.data_plan && <DetailRow label="Data plan" value={selectedTransaction.data_plan} />}
                {selectedTransaction.customer_number && <DetailRow label="Customer number" value={maskAccount(selectedTransaction.customer_number)} />}
                {selectedTransaction.meter_number && <DetailRow label="Meter number" value={maskAccount(selectedTransaction.meter_number)} />}
                {selectedTransaction.meter_type && <DetailRow label="Meter type" value={selectedTransaction.meter_type} />}
                {selectedTransaction.biller_name && <DetailRow label="Biller" value={selectedTransaction.biller_name} />}
                {selectedTransaction.units !== undefined && selectedTransaction.units !== null &&
                  <DetailRow label="Units" value={String(selectedTransaction.units)} />}
                {selectedTransaction.electricity_token && (
                  <DetailRow label="Electricity token" value={String(selectedTransaction.electricity_token)} />
                )}
                <DetailRow label="Amount" value={formatAmount(selectedTransaction.amount)} />
                {toAmount(selectedTransaction.transaction_fee ?? selectedTransaction.fee) > 0 && (
                  <DetailRow label="Transaction fee"
                    value={formatAmount(selectedTransaction.transaction_fee ?? selectedTransaction.fee)} />
                )}
                {toAmount(selectedTransaction.total_debit) > 0 && isCredit(selectedTransaction) === false && (
                  <DetailRow label="Total debited" value={formatAmount(selectedTransaction.total_debit)} />
                )}
                <DetailRow label="Currency" value="NGN" />
              </Stack>

              {(selectedTransaction.provider_message || selectedTransaction.provider_response_message) && (
                <Alert severity={getStatus(selectedTransaction) === 'failed' ? 'error' : 'info'}
                  sx={{ mt: 1.5, borderRadius: 2.5, fontSize: 11.5 }}>
                  {String(selectedTransaction.provider_message || selectedTransaction.provider_response_message)}
                </Alert>
              )}

              <Divider sx={{ my: 1.7 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
                <Button fullWidth variant="contained" startIcon={<ReceiptLongRounded />}
                  onClick={() => openReceipt(selectedTransaction)}
                  sx={{
                    height: 47, borderRadius: 2.7, background: '#008C68',
                    textTransform: 'none', fontWeight: 900, boxShadow: 'none',
                    '&:hover': { background: '#007858', boxShadow: 'none' },
                  }}>
                  View receipt
                </Button>
              
                <Button fullWidth variant="outlined" onClick={() => setSelectedTransaction(null)}
                  sx={{
                    height: 47, borderRadius: 2.7, borderColor: '#DCE5E1',
                    color: '#34423C', textTransform: 'none', fontWeight: 800,
                  }}>
                  Close
                </Button>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      <style>{`
        @media print {
          body { background: #fff !important; }
          button, .MuiIconButton-root, input, .MuiSelect-select { display: none !important; }
          .transaction-print-header { display: none !important; }
          .MuiCard-root { box-shadow: none !important; break-inside: avoid; }
        }
      `}</style>
    </Box>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  action?: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, action }) => (
  <Box sx={{ py: 1.15, borderBottom: '1px solid #F0F3F2' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
      <Typography sx={{ color: '#8A9590', fontSize: 11.5, flexShrink: 0 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.3} sx={{ minWidth: 0 }}>
        <Typography sx={{
          color: '#26332E', fontSize: 12.5, fontWeight: 700,
          textAlign: 'right', wordBreak: 'break-word',
        }}>
          {value}
        </Typography>
        {action}
      </Stack>
    </Stack>
  </Box>
);

export default Transactions;
