import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {
  AccountBalance,
  AccountBalanceWallet,
  AdminPanelSettings,
  Assessment,
  Autorenew,
  Business,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Close,
  DashboardRounded,
  Description,
  ExpandLess,
  ExpandMore,
  Groups,
  Menu as MenuIcon,
  MoreHoriz,
  NotificationsNone,
  Payments,
  Person,
  ReceiptLong,
  Search,
  Security,
  Settings,
  Shield,
  SupportAgent,
  SwapHoriz,
  TrendingUp,
  VerifiedUser,
  WarningAmber,
  Wallet,
} from '@mui/icons-material';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ChartTooltip,
} from 'recharts';

import { useNavigate } from 'react-router-dom';



/* ============================================================
   ZENIMONIES ADMINISTRATION
   PART 1
   Premium banking operations console
   ============================================================ */

/* ============================================================
   TYPES
   ============================================================ */

type Section =
  | 'overview'
  | 'customers'
  | 'accounts'
  | 'kyc'
  | 'transactions'
  | 'pending-transactions'
  | 'bank-transfers'
  | 'deposits'
  | 'withdrawals'
  | 'airtime-data'
  | 'bills'
  | 'gift-cards'
  | 'business-banking'
  | 'pos'
  | 'support-cases'
  | 'escalated-cases'
  | 'customer-care-agents'
  | 'fraud-cases'
  | 'audit-logs'
  | 'compliance'
  | 'revenue-profit'
  | 'revenue-ledger'
  | 'settlements'
  | 'administrators'
  | 'security'
  | 'settings';

type UserStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'INACTIVE'
  | string;

type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'REJECTED'
  | string;

interface DashboardData {
  totalUsers?: number;
  activeUsers?: number;
  suspendedUsers?: number;
  totalAccounts?: number;
  totalTransactions?: number;

  totalAccountBalance?: number | string;

  completedDeposits?: number | string;
  completedWithdrawals?: number | string;

  totalDeposits?: number | string;
  totalWithdrawals?: number | string;
  totalTransfers?: number | string;

  pendingTransactions?: number;
  failedTransactions?: number;

  pendingKyc?: number;
  approvedKyc?: number;
  rejectedKyc?: number;

  [key: string]: unknown;
}

interface Customer {
  id: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  role?: string;
  kyc_status?: string;
  kycStatus?: string;
  is_verified?: boolean;
  isVerified?: boolean;
  created_at?: string;
  createdAt?: string;
}

interface Account {
  id: string;
  user_id?: string;
  userId?: string;
  account_number?: string;
  accountNumber?: string;
  account_type?: string;
  accountType?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
  created_at?: string;
}

interface KycRecord {
  id: string;
  user_id?: string;
  userId?: string;

  full_name?: string;
  fullName?: string;

  email?: string;
  phone?: string;

  kyc_status?: string;
  kycStatus?: string;

  verification_type?: string;
  verificationType?: string;

  tier?: string | number;

  status?: string;

  rejection_reason?: string;
  rejectionReason?: string;

  created_at?: string;
  createdAt?: string;
}

interface Transaction {
  id: string;

  account_id?: string;
  accountId?: string;

  account_number?: string;
  accountNumber?: string;

  user_id?: string;
  userId?: string;

  full_name?: string;
  fullName?: string;

  email?: string;

  phone?: string;

  type?: string;
  transaction_type?: string;
  transactionType?: string;

  amount?: number | string;

  currency?: string;

  reference?: string;

  provider_reference?: string;
  providerReference?: string;

  description?: string;
  narration?: string;

  status?: TransactionStatus;

  balance_before?: number | string;
  balanceBefore?: number | string;

  balance_after?: number | string;
  balanceAfter?: number | string;

  created_at?: string;
  createdAt?: string;

  completed_at?: string;
  completedAt?: string;

  /* Bank transfer information when available */
  recipient_name?: string;
  recipientName?: string;

  recipient_account_number?: string;
  recipientAccountNumber?: string;

  recipient_bank_name?: string;
  recipientBankName?: string;

  recipient_bank_code?: string;
  recipientBankCode?: string;

  recipient_account_type?: string;
  recipientAccountType?: string;

  failure_reason?: string;
  failureReason?: string;
}

interface PendingAction {
  label: string;
  count: number;
  section: Section;
  icon: React.ReactNode;
  tone: 'warning' | 'error' | 'info' | 'success';
}

/* ============================================================
   API
   ============================================================ */

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const api = {
  get: async (path: string) => {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(
      `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || 'Request failed.');
    }

    return { data };
  },
};

/* ============================================================
   CONSTANTS
   ============================================================ */

const DRAWER_WIDTH = 258;

const BRAND = {
  dark: '#082C23',
  darker: '#051F19',
  green: '#0B6B4F',
  greenLight: '#E8F5EF',
  accent: '#17A673',
  background: '#F6F8F7',
  border: '#E5EBE8',
  text: '#10231D',
  muted: '#6B7C75',
  white: '#FFFFFF',
};

/* ============================================================
   HELPERS
   ============================================================ */

const numberValue = (value: unknown): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: unknown): string => {
  return new Intl.NumberFormat('en-NG').format(
    numberValue(value)
  );
};

const formatMoney = (
  value: unknown,
  currency = 'NGN'
): string => {
  const amount = numberValue(value);

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value?: string): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getErrorMessage = (error: unknown): string => {
  const candidate = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return (
    candidate.response?.data?.message ||
    candidate.response?.data?.error ||
    candidate.message ||
    'Something went wrong.'
  );
};

const getStatus = (
  transaction: Transaction
): TransactionStatus => {
  return String(
    transaction.status || ''
  ).toUpperCase();
};

const statusColor = (
  status?: string
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info' => {
  const value = String(status || '').toUpperCase();

  if (
    value === 'COMPLETED' ||
    value === 'APPROVED' ||
    value === 'ACTIVE'
  ) {
    return 'success';
  }

  if (
    value === 'PENDING' ||
    value === 'PROCESSING'
  ) {
    return 'warning';
  }

  if (
    value === 'FAILED' ||
    value === 'REJECTED' ||
    value === 'CANCELLED' ||
    value === 'BLOCKED' ||
    value === 'SUSPENDED'
  ) {
    return 'error';
  }

  if (
    value === 'REVERSED' ||
    value === 'REFUNDED'
  ) {
    return 'info';
  }

  return 'default';
};

const statusLabel = (
  status?: string
): string => {
  if (!status) {
    return 'Unknown';
  }

  return String(status)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const customerName = (
  customer?: Customer | Transaction
): string => {
  return (
    customer?.full_name ||
    customer?.fullName ||
    'Unknown customer'
  );
};

const accountNumber = (
  account?: Account | Transaction
): string => {
  return (
    account?.account_number ||
    account?.accountNumber ||
    '—'
  );
};

/* ============================================================
   NAVIGATION
   ============================================================ */

const NAVIGATION_GROUPS: Array<{
  label: string;
  items: Array<{
    key: Section;
    label: string;
    icon: React.ReactNode;
  }>;
}> = [
  {
    label: 'Overview',
    items: [
      {
        key: 'overview',
        label: 'Dashboard',
        icon: <DashboardRounded />,
      },
    ],
  },

  {
    label: 'Customers',
    items: [
      {
        key: 'customers',
        label: 'Customers',
        icon: <Groups />,
      },
      {
        key: 'accounts',
        label: 'Accounts',
        icon: <AccountBalance />,
      },
      {
        key: 'kyc',
        label: 'KYC & Verification',
        icon: <VerifiedUser />,
      },
    ],
  },

  {
    label: 'Financial',
    items: [
      {
        key: 'transactions',
        label: 'Transactions',
        icon: <ReceiptLong />,
      },
      {
        key: 'pending-transactions',
        label: 'Pending Transactions',
        icon: <Autorenew />,
      },
      {
        key: 'bank-transfers',
        label: 'Bank Transfers',
        icon: <SwapHoriz />,
      },
      {
        key: 'deposits',
        label: 'Deposits',
        icon: <AccountBalanceWallet />,
      },
      {
        key: 'withdrawals',
        label: 'Withdrawals',
        icon: <Payments />,
      },
    ],
  },

  {
    label: 'Services',
    items: [
      {
        key: 'airtime-data',
        label: 'Airtime & Data',
        icon: <Wallet />,
      },
      {
        key: 'bills',
        label: 'Bills',
        icon: <Description />,
      },
      {
        key: 'gift-cards',
        label: 'Gift Cards',
        icon: <ReceiptLong />,
      },
      {
        key: 'business-banking',
        label: 'Business Banking',
        icon: <Business />,
      },
      {
        key: 'pos',
        label: 'POS',
        icon: <AccountBalanceWallet />,
      },
    ],
  },

  {
    label: 'Customer Care',
    items: [
      {
        key: 'support-cases',
        label: 'Support Cases',
        icon: <SupportAgent />,
      },
      {
        key: 'escalated-cases',
        label: 'Escalated Cases',
        icon: <WarningAmber />,
      },
      {
        key: 'customer-care-agents',
        label: 'Customer Care Agents',
        icon: <Person />,
      },
    ],
  },

  {
    label: 'Risk & Compliance',
    items: [
      {
        key: 'fraud-cases',
        label: 'Fraud Cases',
        icon: <Shield />,
      },
      {
        key: 'audit-logs',
        label: 'Audit Logs',
        icon: <Description />,
      },
      {
        key: 'compliance',
        label: 'Compliance',
        icon: <Security />,
      },
    ],
  },

  {
    label: 'Revenue',
    items: [
      {
        key: 'revenue-profit',
        label: 'Revenue & Profit',
        icon: <TrendingUp />,
      },
      {
        key: 'revenue-ledger',
        label: 'Revenue Ledger',
        icon: <ReceiptLong />,
      },
      {
        key: 'settlements',
        label: 'Settlements',
        icon: <AccountBalance />,
      },
    ],
  },

  {
    label: 'Administration',
    items: [
      {
        key: 'administrators',
        label: 'Administrators',
        icon: <AdminPanelSettings />,
      },
      {
        key: 'security',
        label: 'Security',
        icon: <Security />,
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: <Settings />,
      },
    ],
  },
];

/* ============================================================
   COMPONENT
   ============================================================ */

const AdminDashboard: React.FC<{
  initialTab?: number;
}> = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const isMobile = useMediaQuery(
    theme.breakpoints.down('md')
  );

  const [section, setSection] =
    useState<Section>('overview');

  const [mobileDrawerOpen, setMobileDrawerOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');
  
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [kycRecords, setKycRecords] =
    useState<KycRecord[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [search, setSearch] =
    useState('');

  const [userStatusFilter, setUserStatusFilter] =
    useState('ALL');

  const [kycFilter, setKycFilter] =
    useState('ALL');

  const [customerMenuAnchor, setCustomerMenuAnchor] =
    useState<null | HTMLElement>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [transactionPanelOpen, setTransactionPanelOpen] =
    useState(false);

  /* ==========================================================
     NAVIGATION
     ========================================================== */

  const selectSection = (
    value: Section
  ) => {
    setSection(value);

    if (isMobile) {
      setMobileDrawerOpen(false);
    }

    setError('');
    setSuccess('');
  };

  /* ==========================================================
     LOAD DASHBOARD
     ========================================================== */

  const loadDashboard =
    useCallback(async () => {
      const response = await api.get(
        '/admin/dashboard'
      );

      setDashboard(
        response.data?.dashboard ||
          response.data ||
          null
      );
    }, []);

  /* ==========================================================
     LOAD CUSTOMERS
     ========================================================== */

  const loadCustomers =
    useCallback(async () => {
      const response = await api.get(
        '/admin/users'
      );

      setCustomers(
        response.data?.users ||
          response.data?.customers ||
          []
      );
    }, []);

  /* ==========================================================
     LOAD ACCOUNTS
     ========================================================== */

  const loadAccounts =
    useCallback(async () => {
      /*
       * The current backend foundation does not yet
       * expose a dedicated /admin/accounts endpoint.
       *
       * We intentionally do NOT invent an endpoint.
       *
       * Accounts will be populated when the backend
       * account administration endpoint is connected.
       */
      setAccounts([]);
    }, []);

  /* ==========================================================
     LOAD KYC
     ========================================================== */

  const loadKyc =
    useCallback(async () => {
      const response = await api.get(
        '/admin/kyc'
      );

      setKycRecords(
        response.data?.requests ||
          response.data?.records ||
          []
      );
    }, []);

  /* ==========================================================
     LOAD TRANSACTIONS
     ========================================================== */

  const loadTransactions =
    useCallback(async () => {
      const response = await api.get(
        '/admin/transactions'
      );

      setTransactions(
        response.data?.transactions ||
          []
      );
    }, []);

  /* ==========================================================
     LOAD ALL
     ========================================================== */

  const loadAll =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        await Promise.all([
          loadDashboard(),
          loadCustomers(),
          loadAccounts(),
          loadKyc(),
          loadTransactions(),
        ]);
      } catch (err) {
        setError(
          getErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    }, [
      loadDashboard,
      loadCustomers,
      loadAccounts,
      loadKyc,
      loadTransactions,
    ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
  if (
    section === 'administrators' ||
    section === 'security' ||
    section === 'settings'
  ) {
    loadAdministrationData();
  }
}, [section]);

  /* ==========================================================
     FILTERED CUSTOMERS
     ========================================================== */

  const filteredCustomers =
    useMemo(() => {
      const normalized =
        search.trim().toLowerCase();

      return customers.filter(
        (customer) => {
          const matchesSearch =
            !normalized ||
            customerName(customer)
              .toLowerCase()
              .includes(normalized) ||
            String(
              customer.email || ''
            )
              .toLowerCase()
              .includes(normalized) ||
            String(
              customer.phone || ''
            )
              .toLowerCase()
              .includes(normalized);

          const matchesStatus =
            userStatusFilter === 'ALL' ||
            String(
              customer.status || ''
            ).toUpperCase() ===
              userStatusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      customers,
      search,
      userStatusFilter,
    ]);

  /* ==========================================================
     FILTERED KYC
     ========================================================== */

  const filteredKyc =
    useMemo(() => {
      if (kycFilter === 'ALL') {
        return kycRecords;
      }

      return kycRecords.filter(
        (record) =>
          String(
            record.status ||
              record.kyc_status ||
              record.kycStatus ||
              ''
          ).toUpperCase() ===
          kycFilter
      );
    }, [
      kycRecords,
      kycFilter,
    ]);

  /* ==========================================================
     RECENT TRANSACTIONS
     ========================================================== */

  const recentTransactions =
    useMemo(() => {
      return [...transactions]
        .sort((a, b) => {
          const first = new Date(
            a.created_at ||
              a.createdAt ||
              0
          ).getTime();

          const second = new Date(
            b.created_at ||
              b.createdAt ||
              0
          ).getTime();

          return second - first;
        })
        .slice(0, 8);
    }, [transactions]);

  /* ==========================================================
     PENDING ACTIONS
     ========================================================== */

  const pendingActions: PendingAction[] =
    useMemo(() => {
      const pendingTransactions =
        transactions.filter(
          (transaction) =>
            getStatus(transaction) ===
              'PENDING' ||
            getStatus(transaction) ===
              'PROCESSING'
        ).length;

      const pendingKyc =
        Number(
          dashboard?.pendingKyc || 0
        );

      return [
        {
          label: 'KYC reviews',
          count: pendingKyc,
          section: 'kyc',
          icon: <VerifiedUser />,
          tone: 'warning',
        },
        {
          label: 'Pending transactions',
          count: pendingTransactions,
          section: 'pending-transactions',
          icon: <Autorenew />,
          tone: 'info',
        },
        {
          label: 'Fraud reports',
          count: 0,
          section: 'fraud-cases',
          icon: <Shield />,
          tone: 'error',
        },
        {
          label: 'Escalated cases',
          count: 0,
          section: 'escalated-cases',
          icon: <WarningAmber />,
          tone: 'warning',
        },
      ];
    }, [
      dashboard,
      transactions,
    ]);

  /* ==========================================================
     OPEN TRANSACTION
     ========================================================== */

  const openTransaction = (
    transaction: Transaction
  ) => {
    setSelectedTransaction(
      transaction
    );

    setTransactionPanelOpen(true);
  };

  /* ==========================================================
     CLOSE TRANSACTION
     ========================================================== */

  const closeTransaction = () => {
    setTransactionPanelOpen(false);
    setSelectedTransaction(null);
  };

  /* ==========================================================
     TRANSACTION ACTIONS
     ========================================================== */

  const getTransactionActions = (
    transaction: Transaction
  ): string[] => {
    const status =
      getStatus(transaction);

    switch (status) {
      case 'PENDING':
        return [
          'View',
          'Approve',
          'Reject',
          'Report Fraud',
        ];

      case 'PROCESSING':
        return [
          'View',
          'Review',
          'Report Fraud',
        ];

      case 'COMPLETED':
        return [
          'View',
          'Reverse',
          'Report Fraud',
        ];

      case 'FAILED':
        return [
          'View',
          'Review',
          'Report Fraud',
        ];

      case 'REVERSED':
      case 'REFUNDED':
        return [
          'View',
          'View Original Transaction',
          'View Reversal/Refund Information',
        ];

      default:
        return ['View'];
    }
  };

  /* ==========================================================
     LOGOUT
     ========================================================== */

  const logout = () => {
    localStorage.removeItem(
      'adminToken'
    );

    localStorage.removeItem(
      'admin'
    );

    navigate('/admin/login');
  };

  /* ==========================================================
     SHARED STYLES
     ========================================================== */

  const pageCardSx = {
    borderRadius: 3,
    border: `1px solid ${BRAND.border}`,
    boxShadow:
      '0 4px 18px rgba(16, 35, 29, 0.045)',
    backgroundColor: BRAND.white,
  };

  /* ==========================================================
     KPI CARD
     ========================================================== */

  const KpiCard = ({
    title,
    value,
    subtitle,
    icon,
    trend,
  }: {
    title: string;
    value: React.ReactNode;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: string;
  }) => (
    <Card
      sx={{
        ...pageCardSx,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: BRAND.muted,
                letterSpacing: 0.35,
                textTransform: 'uppercase',
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.8,
                fontSize: {
                  xs: 23,
                  sm: 26,
                },
                lineHeight: 1.15,
                fontWeight: 800,
                color: BRAND.text,
              }}
            >
              {value}
            </Typography>

            {subtitle && (
              <Typography
                sx={{
                  mt: 0.8,
                  fontSize: 12,
                  color: BRAND.muted,
                }}
              >
                {subtitle}
              </Typography>
            )}

            {trend && (
              <Typography
                sx={{
                  mt: 0.8,
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    trend.startsWith('-')
                      ? '#B42318'
                      : BRAND.green,
                }}
              >
                {trend}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                BRAND.greenLight,
              color: BRAND.green,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  /* ==========================================================
     SECTION HEADER
     ========================================================== */

  const SectionHeader = ({
    eyebrow,
    title,
    description,
    action,
  }: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
  }) => (
    <Stack
      direction={{
        xs: 'column',
        sm: 'row',
      }}
      justifyContent="space-between"
      alignItems={{
        xs: 'flex-start',
        sm: 'center',
      }}
      spacing={2}
    >
      <Box>
        {eyebrow && (
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              color: BRAND.green,
              textTransform: 'uppercase',
              mb: 0.5,
            }}
          >
            {eyebrow}
          </Typography>
        )}

        <Typography
          sx={{
            fontSize: {
              xs: 23,
              sm: 28,
            },
            fontWeight: 800,
            color: BRAND.text,
            letterSpacing: -0.35,
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 13,
              color: BRAND.muted,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  );

  /* ==========================================================
     SYSTEM STATUS
     ========================================================== */

  const SystemStatus = () => (
    <Paper
      elevation={0}
      sx={{
        px: 1.5,
        py: 0.85,
        borderRadius: 2,
        border: '1px solid #CBE8DB',
        backgroundColor: '#F0FAF5',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#16A06A',
          boxShadow:
            '0 0 0 4px rgba(22,160,106,0.10)',
        }}
      />

      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: '#126342',
        }}
      >
        ALL SYSTEMS OPERATIONAL
      </Typography>
    </Paper>
  );

  /* ==========================================================
     OVERVIEW
     ========================================================== */

  const renderOverview = () => {
    const customerCount =
      dashboard?.totalUsers ?? customers.length;

    const transactionCount =
      dashboard?.totalTransactions ?? recentTransactions.length;

    const pendingCount = pendingActions.reduce(
      (total, item) => total + item.count,
      0
    );

    
    return (
      <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ minWidth: 0 }}>
        {/* OVERVIEW HEADER */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.1,
                color: BRAND.green,
                textTransform: 'uppercase',
              }}
            >
              Operations Overview
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                fontSize: { xs: 23, sm: 28, md: 30 },
                fontWeight: 850,
                color: BRAND.text,
                letterSpacing: -0.7,
                lineHeight: 1.2,
              }}
            >
              Welcome back, Administrator
            </Typography>

            <Typography
              sx={{
                mt: 0.7,
                fontSize: 13,
                color: BRAND.muted,
                lineHeight: 1.6,
              }}
            >
              Monitor customers, transactions and operational activity.
            </Typography>
          </Box>

          <SystemStatus />
        </Stack>

        {/* COMPACT KPI CARDS */}
        <Grid container spacing={1.5}>
          {[
            {
        
    title: 'Total Users',
    value: formatNumber(customerCount),
    subtitle: 'All registered customers',
    icon: <Groups fontSize="small" />,
    tone: BRAND.green,
  },
  {
    title: 'Active Users',
    value: formatNumber(dashboard?.activeUsers ?? 0),
    subtitle: 'Active customer accounts',
    icon: <Groups fontSize="small" />,
    tone: BRAND.green,
  },
  {
    title: 'Recent Registrations',
    value: formatNumber(dashboard?.recentRegistrations ?? 0),
    subtitle: 'Newly registered customers',
    icon: <Groups fontSize="small" />,
    tone: BRAND.green,
  },
  {
    title: 'Revenue',
    value: '—',
    subtitle: 'Verified company revenue',
    icon: <TrendingUp fontSize="small" />,
    tone: BRAND.green,
            },
          ].map((item) => (
            <Grid item xs={3} sm={3} md={3} lg={3} key={item.title}>
              <Card
                sx={{
                  ...pageCardSx,
                  height: '100%',
                  minWidth: 0,
                  borderRadius: 2.5,
                  transition: 'box-shadow 160ms ease, transform 160ms ease',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(18, 56, 45, 0.08)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent
                  sx={{
              p: { xs: 1.5, sm: 2 },
               '&:last-child': {
              pb: { xs: 1.5, sm: 2 },
           },
          }}
                >
                  <Stack
                    direction="column"
                   alignItems="flex-start"
                    spacing={1}
                   >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                         fontSize: { xs: 10, sm: 12 },
                         fontWeight: 700,
                         color: BRAND.muted,
                          lineHeight: 1.35,
                          overflowWrap: 'anywhere',

                        }}
                      >
                        {item.title}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 1,
                          fontSize: { xs: 22, sm: 27 },
                          lineHeight: 1.1,
                          fontWeight: 850,
                          color: BRAND.text,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Box>

                    
<Box
  sx={{
    width: { xs: 28, sm: 36 },
    height: { xs: 28, sm: 36 },
    flexShrink: 0,
    alignSelf: 'flex-end',
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: item.tone,
    backgroundColor: BRAND.greenLight,
    '& .MuiSvgIcon-root': {
      fontSize: { xs: 17, sm: 20 },
    },
  }}
>
  {item.icon}
</Box>

          
                  </Stack>

                  <Typography
                    sx={{
                      mt: 1.25,
                      fontSize: 10.5,
                      color: BRAND.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        
{/* FINANCIAL PERFORMANCE + RIGHT OPERATIONS SIDEBAR */}
<Grid
  container
  spacing={{ xs: 2, md: 2.5 }}
  alignItems="stretch"
>
  {/* MAIN REVENUE PANEL */}
  <Grid item xs={12} lg={8}>
    <Card
      sx={{
        ...pageCardSx,
        height: '100%',
        borderRadius: 2.5,
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                color: BRAND.green,
                textTransform: 'uppercase',
              }}
            >
              Financial Performance
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 19,
                fontWeight: 800,
                color: BRAND.text,
              }}
            >
              Revenue and costs
            </Typography>

            <Typography
              sx={{ mt: 0.5, fontSize: 12, color: BRAND.muted }}
            >
              Track verified revenue, provider costs and net profit.
            </Typography>
          </Box>

          <Chip
            size="small"
            label="Awaiting verified data"
            sx={{
              color: BRAND.muted,
              backgroundColor: '#F2F5F3',
              fontWeight: 700,
            }}
          />
        </Stack>

        {/* REVENUE CHART */}
        <Box
          sx={{
            mt: 2,
            minHeight: 230,
            px: 1.5,
            py: 1.5,
            borderRadius: 2,
            border: `1px solid ${BRAND.border}`,
            background:
              'linear-gradient(180deg, #FAFCFB 0%, #F5F9F7 100%)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
              color: BRAND.text,
            }}
          >
            Revenue trend
          </Typography>
            
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              mt: 1.5,
              flexWrap: 'nowrap',
              overflowX: 'auto',
              pb: 0.5,
            }}
          >
            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map(
              (period) => (
                <Chip
                  key={period}
                  label={period}
                  size="small"
                  onClick={() => setRevenuePeriod(period)}
                  variant={revenuePeriod === period ? 'filled' : 'outlined'}
                  sx={{
                    flex: '0 0 auto',
                    fontWeight: 700,
                    color: BRAND.green,
                    backgroundColor:
                      revenuePeriod === period
                        ? BRAND.greenLight
                        : 'transparent',
                    borderColor: BRAND.green,
                    cursor: 'pointer',
                  }}
                />
              )
            )}
          </Stack>

          <Box
            sx={{
              mt: 1.5,
              height: 160,
              minWidth: 0,
              borderBottom: `1px solid ${BRAND.border}`,
            }}
          >
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BRAND.muted,
                fontSize: 12,
                textAlign: 'center',
                px: 2,
              }}
            >
              
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={revenueChartData}>
    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.border} />
    <XAxis
      dataKey="label"
      tick={{ fontSize: 11, fill: BRAND.muted }}
    />
    <YAxis
      tick={{ fontSize: 11, fill: BRAND.muted }}
      width={45}
    />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="revenue"
      name="Revenue (NGN)"
      stroke={BRAND.green}
      strokeWidth={3}
      dot={false}
      connectNulls={false}
    />
  </LineChart>
</ResponsiveContainer>

            </Box>
          </Box>
        </Box>


        {/* FINANCIAL SUMMARY */}
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {[
            'Revenue',
            'Provider Costs',
            'Net Profit',
            'Net Margin',
          ].map((label) => (
            <Grid item xs={6} sm={3} key={label}>
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  backgroundColor: '#F8FAF9',
                }}
              >
                <Typography
                  sx={{ fontSize: 11, color: BRAND.muted }}
                >
                  {label}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 16,
                    fontWeight: 800,
                    color: BRAND.text,
                  }}
                >
                  —
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  </Grid>

  {/* RIGHT SIDEBAR: PENDING TRANSACTIONS + KYC REVIEW */}
  <Grid item xs={12} lg={4}>
    <Stack spacing={1.5} sx={{ height: '100%' }}>
      {/* PENDING TRANSACTIONS */}
      <Card
        sx={{
          ...pageCardSx,
          borderRadius: 2.5,
          flex: 1,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  color: BRAND.green,
                  backgroundColor: BRAND.greenLight,
                }}
              >
                <SwapHoriz fontSize="small" />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: BRAND.green,
                    textTransform: 'uppercase',
                  }}
                >
                  Transactions
                </Typography>

                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: BRAND.text,
                  }}
                >
                  Pending Transactions
                </Typography>
              </Box>
            </Stack>

            <Chip
              size="small"
              label={
                pendingActions.find(
                  (item) =>
                    /transaction/i.test(item.label) &&
                    /pending/i.test(item.label)
                )?.count ?? '—'
              }
              sx={{
                fontWeight: 800,
                color: BRAND.green,
                backgroundColor: BRAND.greenLight,
              }}
            />
          </Stack>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: 12,
              color: BRAND.muted,
              lineHeight: 1.6,
            }}
          >
            Review transactions that require attention.
          </Typography>

          <Button
            fullWidth
            onClick={() => selectSection('pendingTransactions')}

            endIcon={<ChevronRight />}
            sx={{
              mt: 1,
              justifyContent: 'space-between',
              color: BRAND.green,
              fontWeight: 800,
              textTransform: 'none',
            }}
          >
            Review transactions
          </Button>
        </CardContent>
      </Card>

      {/* KYC REVIEW */}
      <Card
        sx={{
          ...pageCardSx,
          borderRadius: 2.5,
          flex: 1,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  color: BRAND.green,
                  backgroundColor: BRAND.greenLight,
                }}
              >
                <Groups fontSize="small" />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: BRAND.green,
                    textTransform: 'uppercase',
                  }}
                >
                  Verification
                </Typography>

                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: BRAND.text,
                  }}
                >
                  KYC Review
                </Typography>
              </Box>
            </Stack>

            <Chip
              size="small"
              label={
                pendingActions.find(
                  (item) => /kyc|verification/i.test(item.label)
                )?.count ?? '—'
              }
              sx={{
                fontWeight: 800,
                color: BRAND.green,
                backgroundColor: BRAND.greenLight,
              }}
            />
          </Stack>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: 12,
              color: BRAND.muted,
              lineHeight: 1.6,
            }}
          >
            Review customer identity verification cases.
          </Typography>

          <Button
            fullWidth
            onClick={() => selectSection('kyc')}
            endIcon={<ChevronRight />}
            sx={{
              mt: 1,
              justifyContent: 'space-between',
              color: BRAND.green,
              fontWeight: 800,
              textTransform: 'none',
            }}
          >
            View KYC cases
          </Button>
        </CardContent>
      </Card>
    </Stack>
  </Grid>
</Grid>


        {/* RECENT TRANSACTIONS */}
        <Card sx={{ ...pageCardSx, borderRadius: 2.5, minWidth: 0 }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2.25 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: BRAND.green,
                    textTransform: 'uppercase',
                  }}
                >
                  Activity
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 19,
                    fontWeight: 800,
                    color: BRAND.text,
                  }}
                >
                  Recent Transactions
                </Typography>
              </Box>

              <Button
                size="small"
                onClick={() => selectSection('transactions')}
                endIcon={<ChevronRight />}
                sx={{
                  color: BRAND.green,
                  fontWeight: 800,
                  textTransform: 'none',
                }}
              >
                View all
              </Button>
            </Stack>

            <TableContainer sx={{ mt: 1.5, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow>
                    {[
                      'Customer',
                      'Reference',
                      'Type',
                      'Amount',
                      'Status',
                      'Action',
                    ].map((heading) => (
                      <TableCell
                        key={heading}
                        sx={{
                          borderBottom: `1px solid ${BRAND.border}`,
                          color: BRAND.muted,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: 0.55,
                          py: 1.2,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      hover
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                        >
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              fontSize: 11,
                              fontWeight: 800,
                              backgroundColor: BRAND.greenLight,
                              color: BRAND.green,
                            }}
                          >
                            {(customerName(transaction) || 'U')
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: BRAND.text,
                              }}
                            >
                              {customerName(transaction) || '—'}
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 10,
                                color: BRAND.muted,
                              }}
                            >
                              {transaction.email || '—'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: BRAND.text,
                          }}
                        >
                          {transaction.reference || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{ fontSize: 12, color: BRAND.text }}
                        >
                          {statusLabel(
                            transaction.type ||
                              transaction.transaction_type ||
                              transaction.transactionType
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: BRAND.text,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatMoney(
                            transaction.amount,
                            transaction.currency || 'NGN'
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(transaction.status)}
                          color={statusColor(transaction.status)}
                          sx={{
                            height: 24,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => openTransaction(transaction)}
                          sx={{
                            minWidth: 'auto',
                            color: BRAND.green,
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: 'none',
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {recentTransactions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{
                          py: 5,
                          color: BRAND.muted,
                        }}
                      >
                        No recent transactions available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>
    );
  };
  /* ============================================================
     CUSTOMERS
     ============================================================ */

  const renderCustomers = () => (
    <Stack spacing={2.5}>
      <SectionHeader
        eyebrow="Customer Management"
        title="Customers"
        description="Monitor customer profiles, account status and verification state."
      />

      <Card sx={pageCardSx}>
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            spacing={1.25}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search name, email or phone..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      fontSize="small"
                      sx={{
                        color:
                          BRAND.muted,
                      }}
                    />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Status"
              value={
                userStatusFilter
              }
              onChange={(event) =>
                setUserStatusFilter(
                  event.target.value
                )
              }
              sx={{
                minWidth: 150,
              }}
            >
              <MenuItem value="ALL">
                All
              </MenuItem>
              <MenuItem value="ACTIVE">
                Active
              </MenuItem>
              <MenuItem value="SUSPENDED">
                Suspended
              </MenuItem>
              <MenuItem value="BLOCKED">
                Blocked
              </MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 850,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Customer',
                  'Phone',
                  'Status',
                  'KYC',
                  'Created',
                  'Action',
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: BRAND.muted,
                      textTransform:
                        'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredCustomers.map(
                (customer) => (
                  <TableRow
                    hover
                    key={customer.id}
                  >
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 11,
                            backgroundColor:
                              BRAND.greenLight,
                            color:
                              BRAND.green,
                          }}
                        >
                          {customerName(
                            customer
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </Avatar>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {customerName(
                              customer
                            )}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 10,
                              color:
                                BRAND.muted,
                            }}
                          >
                            {customer.email ||
                              '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                        }}
                      >
                        {customer.phone ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(
                          customer.status
                        )}
                        color={statusColor(
                          customer.status
                        )}
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(
                          customer.kyc_status ||
                            customer.kycStatus
                        )}
                        color={statusColor(
                          customer.kyc_status ||
                            customer.kycStatus
                        )}
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {formatDate(
                          customer.created_at ||
                            customer.createdAt
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={(event) => {
                          setSelectedCustomer(
                            customer
                          );

                          setCustomerMenuAnchor(
                            event.currentTarget
                          );
                        }}
                        endIcon={
                          <MoreHoriz />
                        }
                        sx={{
                          color:
                            BRAND.green,
                          fontWeight: 800,
                          textTransform:
                            'none',
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {filteredCustomers.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{
                      py: 5,
                      color:
                        BRAND.muted,
                    }}
                  >
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Menu
        anchorEl={
          customerMenuAnchor
        }
        open={
          Boolean(
            customerMenuAnchor
          )
        }
        onClose={() =>
          setCustomerMenuAnchor(
            null
          )
        }
      >
        <MenuItem
          onClick={() => {
            setCustomerMenuAnchor(
              null
            );
          }}
        >
          View Customer
        </MenuItem>

        <MenuItem
          onClick={() => {
            setCustomerMenuAnchor(
              null
            );

            selectSection(
              'accounts'
            );
          }}
        >
          View Accounts
        </MenuItem>

        <MenuItem
          onClick={() => {
            setCustomerMenuAnchor(
              null
            );

            selectSection(
              'kyc'
            );
          }}
        >
          View KYC
        </MenuItem>
      </Menu>
    </Stack>
  );

  /* ============================================================
     ACCOUNTS
     ============================================================ */

  const renderAccounts = () => (
    <Stack spacing={2.5}>
      <SectionHeader
        eyebrow="Customer Accounts"
        title="Accounts"
        description="Account administration and account status overview."
      />

      <Card sx={pageCardSx}>
        <CardContent sx={{ p: 2 }}>
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
            }}
          >
            The dedicated Admin Accounts endpoint
            will be connected when that backend
            endpoint is finalized. No account data is
            being fabricated in the dashboard.
          </Alert>
        </CardContent>
      </Card>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {accounts.map(
                (account) => (
                  <TableRow
                    key={account.id}
                  >
                    <TableCell>
                      {accountNumber(
                        account
                      )}
                    </TableCell>

                    <TableCell>
                      {account.user_id ||
                        account.userId ||
                        '—'}
                    </TableCell>

                    <TableCell>
                      {account.account_type ||
                        account.accountType ||
                        'Personal'}
                    </TableCell>

                    <TableCell>
                      {account.currency ||
                        'NGN'}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(
                          account.status
                        )}
                        color={statusColor(
                          account.status
                        )}
                      />
                    </TableCell>
                  </TableRow>
                )
              )}

              {accounts.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{
                      py: 5,
                      color:
                        BRAND.muted,
                    }}
                  >
                    Account administration
                    data is not connected yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  /* ============================================================
     KYC
     ============================================================ */

  const renderKyc = () => (
    <Stack spacing={2.5}>
      <SectionHeader
        eyebrow="Risk & Verification"
        title="KYC & Verification"
        description="Review customer verification records and KYC status."
      />

      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
      >
        {[
          ['ALL', 'All'],
          ['PENDING', 'Pending'],
          ['APPROVED', 'Approved'],
          ['REJECTED', 'Rejected'],
        ].map(
          ([value, label]) => (
            <Button
              key={value}
              size="small"
              variant={
                kycFilter === value
                  ? 'contained'
                  : 'outlined'
              }
              onClick={() =>
                setKycFilter(value)
              }
              sx={{
                borderRadius: 2,
                textTransform:
                  'none',
                fontWeight: 700,
                ...(kycFilter ===
                value
                  ? {
                      backgroundColor:
                        BRAND.dark,
                      '&:hover': {
                        backgroundColor:
                          BRAND.green,
                      },
                    }
                  : {
                      borderColor:
                        BRAND.border,
                      color:
                        BRAND.text,
                    }),
              }}
            >
              {label}
            </Button>
          )
        )}
      </Stack>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 850,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Customer',
                  'Verification',
                  'Tier',
                  'Status',
                  'Submitted',
                  'Action',
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: BRAND.muted,
                      textTransform:
                        'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredKyc.map(
                (record) => (
                  <TableRow
                    hover
                    key={record.id}
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {record.full_name ||
                          record.fullName ||
                          'Unknown customer'}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {record.email ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {record.verification_type ||
                        record.verificationType ||
                        'KYC'}
                    </TableCell>

                    <TableCell>
                      {record.tier ||
                        '—'}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(
                          record.status ||
                            record.kyc_status ||
                            record.kycStatus
                        )}
                        color={statusColor(
                          record.status ||
                            record.kyc_status ||
                            record.kycStatus
                        )}
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        record.created_at ||
                          record.createdAt
                      )}
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        sx={{
                          color:
                            BRAND.green,
                          fontWeight: 800,
                          textTransform:
                            'none',
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {filteredKyc.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{
                      py: 5,
                      color:
                        BRAND.muted,
                    }}
                  >
                    No KYC records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  /* ============================================================
     PLACEHOLDER SECTIONS
     ============================================================ */

  const renderComingSoon = (
    title: string,
    description: string
  ) => (
    <Stack spacing={2.5}>
      <SectionHeader
        eyebrow="ZENIMONIES Administration"
        title={title}
        description={description}
      />

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stack
            alignItems="center"
            spacing={1}
            sx={{
              maxWidth: 430,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  BRAND.greenLight,
                color: BRAND.green,
              }}
            >
              <Security />
            </Box>

            <Typography
              sx={{
                fontSize: 17,
                fontWeight: 800,
                color: BRAND.text,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                lineHeight: 1.65,
                color: BRAND.muted,
              }}
            >
              This module will be connected
              in the next dashboard build
              section. We will use real
              backend data and will not
              create fake operational
              controls.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  /* ============================================================
     TRANSACTION DETAIL PANEL
     ============================================================ */

  const renderTransactionPanel = () => {
    if (!selectedTransaction) {
      return null;
    }

    const transaction =
      selectedTransaction;

    const status =
      getStatus(transaction);

    const actions =
      getTransactionActions(
        transaction
      );

    return (
      <Drawer
        anchor="right"
        open={transactionPanelOpen}
        onClose={closeTransaction}
        PaperProps={{
          sx: {
            width: {
              xs: '100%',
              sm: 560,
            },
            maxWidth: '100%',
            backgroundColor:
              BRAND.background,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom:
              `1px solid ${BRAND.border}`,
            backgroundColor:
              BRAND.white,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: BRAND.green,
                  textTransform:
                    'uppercase',
                }}
              >
                Transaction
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  fontSize: 20,
                  fontWeight: 800,
                  color: BRAND.text,
                  wordBreak:
                    'break-word',
                }}
              >
                {transaction.reference ||
                  transaction.id}
              </Typography>

              <Chip
                size="small"
                label={statusLabel(
                  status
                )}
                color={statusColor(
                  status
                )}
                sx={{
                  mt: 1,
                  fontWeight: 800,
                  fontSize: 10,
                }}
              />
            </Box>

            <IconButton
              onClick={
                closeTransaction
              }
            >
              <Close />
            </IconButton>
          </Stack>
        </Box>

        <Box
          sx={{
            p: 2,
            overflowY: 'auto',
          }}
        >
          <Stack spacing={1.5}>
            {/* FULL TRANSACTION */}

            <Card sx={pageCardSx}>
              <CardContent>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: BRAND.text,
                    mb: 1.5,
                  }}
                >
                  Transaction Details
                </Typography>

                <Grid
                  container
                  spacing={1.5}
                >
                  {[
                    [
                      'Transaction Type',
                      statusLabel(
                        transaction.type ||
                          transaction.transaction_type ||
                          transaction.transactionType
                      ),
                    ],
                    [
                      'Amount',
                      formatMoney(
                        transaction.amount,
                        transaction.currency ||
                          'NGN'
                      ),
                    ],
                    [
                      'Currency',
                      transaction.currency ||
                        'NGN',
                    ],
                    [
                      'Reference',
                      transaction.reference ||
                        '—',
                    ],
                    [
                      'Provider Reference',
                      transaction.provider_reference ||
                        transaction.providerReference ||
                        '—',
                    ],
                    [
                      'Date & Time',
                      formatDate(
                        transaction.created_at ||
                          transaction.createdAt
                      ),
                    ],
                    [
                      'Description',
                      transaction.description ||
                        transaction.narration ||
                        '—',
                    ],
                  ].map(
                    ([label, value]) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        key={label}
                      >
                        <Typography
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              BRAND.muted,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          {label}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.35,
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              BRAND.text,
                            wordBreak:
                              'break-word',
                          }}
                        >
                          {value}
                        </Typography>
                      </Grid>
                    )
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* SENDER */}

            <Card sx={pageCardSx}>
              <CardContent>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: BRAND.text,
                    mb: 1.5,
                  }}
                >
                  Sender
                </Typography>

                <Grid
                  container
                  spacing={1.5}
                >
                  {[
                    [
                      'Full Name',
                      transaction.full_name ||
                        transaction.fullName ||
                        '—',
                    ],
                    [
                      'Account Number',
                      transaction.account_number ||
                        transaction.accountNumber ||
                        '—',
                    ],
                    [
                      'Customer ID',
                      transaction.user_id ||
                        transaction.userId ||
                        '—',
                    ],
                    [
                      'Email',
                      transaction.email ||
                        '—',
                    ],
                    [
                      'Phone',
                      transaction.phone ||
                        '—',
                    ],
                  ].map(
                    ([label, value]) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        key={label}
                      >
                        <Typography
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              BRAND.muted,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          {label}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.35,
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              BRAND.text,
                            wordBreak:
                              'break-word',
                          }}
                        >
                          {value}
                        </Typography>
                      </Grid>
                    )
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* RECEIVER */}

            <Card sx={pageCardSx}>
              <CardContent>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: BRAND.text,
                    mb: 1.5,
                  }}
                >
                  Receiver
                </Typography>

                <Grid
                  container
                  spacing={1.5}
                >
                  {[
                    [
                      'Full Name',
                      transaction.recipient_name ||
                        transaction.recipientName ||
                        '—',
                    ],
                    [
                      'Account Number',
                      transaction.recipient_account_number ||
                        transaction.recipientAccountNumber ||
                        '—',
                    ],
                    [
                      'Bank Name',
                      transaction.recipient_bank_name ||
                        transaction.recipientBankName ||
                        '—',
                    ],
                    [
                      'Bank Code',
                      transaction.recipient_bank_code ||
                        transaction.recipientBankCode ||
                        '—',
                    ],
                    [
                      'Account Type',
                      transaction.recipient_account_type ||
                        transaction.recipientAccountType ||
                        '—',
                    ],
                  ].map(
                    ([label, value]) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        key={label}
                      >
                        <Typography
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              BRAND.muted,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          {label}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.35,
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              BRAND.text,
                            wordBreak:
                              'break-word',
                          }}
                        >
                          {value}
                        </Typography>
                      </Grid>
                    )
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* FINANCIAL RECORD */}

            <Card sx={pageCardSx}>
              <CardContent>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: BRAND.text,
                    mb: 1.5,
                  }}
                >
                  Financial Record
                </Typography>

                <Stack spacing={1.2}>
                  {[
                    [
                      'Balance Before',
                      formatMoney(
                        transaction.balance_before ??
                          transaction.balanceBefore,
                        transaction.currency ||
                          'NGN'
                      ),
                    ],
                    [
                      'Transaction',
                      formatMoney(
                        transaction.amount,
                        transaction.currency ||
                          'NGN'
                      ),
                    ],
                    [
                      'Balance After',
                      formatMoney(
                        transaction.balance_after ??
                          transaction.balanceAfter,
                        transaction.currency ||
                          'NGN'
                      ),
                    ],
                  ].map(
                    ([label, value]) => (
                      <Stack
                        key={label}
                        direction="row"
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Typography
                          sx={{
                            fontSize: 12,
                            color:
                              BRAND.muted,
                          }}
                        >
                          {label}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 800,
                            color:
                              BRAND.text,
                          }}
                        >
                          {value}
                        </Typography>
                      </Stack>
                    )
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* FAILURE */}

            {transaction.failure_reason ||
              transaction.failureReason ? (
              <Alert
                severity="error"
                sx={{
                  borderRadius: 2,
                }}
              >
                <strong>
                  Failure reason:
                </strong>{' '}
                {transaction.failure_reason ||
                  transaction.failureReason}
              </Alert>
            ) : null}

            {/* STATUS ACTIONS */}

            <Card sx={pageCardSx}>
              <CardContent>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: BRAND.text,
                    mb: 1.5,
                  }}
                >
                  Available Actions
                </Typography>

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1}
                >
                  {actions.map(
                    (action) => (
                      <Button
                        key={action}
                        size="small"
                        variant={
                          action === 'View'
                            ? 'outlined'
                            : 'contained'
                        }
                        onClick={() => {
                          if (
                            action ===
                            'View'
                          ) {
                            return;
                          }

                          /*
                           * The actual backend action
                           * handlers are added in the
                           * Financial module.
                           *
                           * We deliberately do not
                           * invent mutation endpoints
                           * here.
                           */
                          setSuccess(
                            `${action} selected for ${transaction.reference || transaction.id}.`
                          );
                        }}
                        sx={{
                          borderRadius: 1.75,
                          textTransform:
                            'none',
                          fontSize: 11,
                          fontWeight: 800,
                          ...(action ===
                          'Report Fraud'
                            ? {
                                backgroundColor:
                                  '#B42318',
                                '&:hover': {
                                  backgroundColor:
                                    '#912018',
                                },
                              }
                            : action ===
                              'Reject'
                            ? {
                                backgroundColor:
                                  '#7A271A',
                                '&:hover': {
                                  backgroundColor:
                                    '#5F2016',
                                },
                              }
                            : {
                                backgroundColor:
                                  BRAND.dark,
                                '&:hover': {
                                  backgroundColor:
                                    BRAND.green,
                                },
                              }),
                        }}
                      >
                        {action}
                      </Button>
                    )
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Drawer>
    );
  };
 /* ============================================================
   PART 2 — FINANCIAL OPERATIONS
   ============================================================ */

/* ============================================================
   FINANCIAL STATE
   ============================================================ */

const [financialSearch, setFinancialSearch] =
  useState('');

const [financialStatusFilter, setFinancialStatusFilter] =
  useState('ALL');

const [financialTypeFilter, setFinancialTypeFilter] =
  useState('ALL');

const [financialLoading, setFinancialLoading] =
  useState(false);

/* ============================================================
   FINANCIAL HELPERS
   ============================================================ */

const transactionType = (
  transaction: Transaction
): string => {
  return (
    transaction.type ||
    transaction.transaction_type ||
    transaction.transactionType ||
    'Transaction'
  );
};

const transactionReference = (
  transaction: Transaction
): string => {
  return (
    transaction.reference ||
    transaction.id ||
    '—'
  );
};

const transactionCustomer = (
  transaction: Transaction
): string => {
  return (
    transaction.full_name ||
    transaction.fullName ||
    'Unknown customer'
  );
};

const transactionDate = (
  transaction: Transaction
): string => {
  return formatDate(
    transaction.created_at ||
      transaction.createdAt
  );
};

/* ============================================================
   FILTER TRANSACTIONS
   ============================================================ */

const filteredFinancialTransactions =
  useMemo(() => {
    const query =
      financialSearch
        .trim()
        .toLowerCase();

    return transactions.filter(
      (transaction) => {
        const status =
          getStatus(transaction);

        const type =
          transactionType(
            transaction
          ).toLowerCase();

        const matchesSearch =
          !query ||
          transactionCustomer(
            transaction
          )
            .toLowerCase()
            .includes(query) ||
          transactionReference(
            transaction
          )
            .toLowerCase()
            .includes(query) ||
          type.includes(query) ||
          String(
            transaction.account_number ||
              transaction.accountNumber ||
              ''
          )
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          financialStatusFilter ===
            'ALL' ||
          status ===
            financialStatusFilter;

        const matchesType =
          financialTypeFilter ===
            'ALL' ||
          type ===
            financialTypeFilter.toLowerCase();

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      }
    );
  }, [
    transactions,
    financialSearch,
    financialStatusFilter,
    financialTypeFilter,
  ]);

/* ============================================================
   STATUS COUNTS
   ============================================================ */

const financialStatusCounts =
  useMemo(() => {
    return {
      all: transactions.length,

      pending: transactions.filter(
        (item) =>
          getStatus(item) ===
          'PENDING'
      ).length,

      processing:
        transactions.filter(
          (item) =>
            getStatus(item) ===
            'PROCESSING'
        ).length,

      completed:
        transactions.filter(
          (item) =>
            getStatus(item) ===
            'COMPLETED'
        ).length,

      failed: transactions.filter(
        (item) =>
          getStatus(item) ===
          'FAILED'
      ).length,

      reversed:
        transactions.filter(
          (item) =>
            getStatus(item) ===
              'REVERSED' ||
            getStatus(item) ===
              'REFUNDED'
        ).length,
    };
  }, [transactions]);

/* ============================================================
   STATUS-BASED TRANSACTION ACTIONS
   ============================================================ */

const handleFinancialAction = (
  action: string,
  transaction: Transaction
) => {
  const status =
    getStatus(transaction);

  /*
   * We only open the existing transaction
   * detail interface here.
   *
   * Mutation handlers will be connected to
   * the verified backend endpoints after
   * the complete dashboard is finished.
   */

  if (action === 'View') {
    openTransaction(transaction);
    return;
  }

  if (
    action ===
    'View Original Transaction'
  ) {
    openTransaction(transaction);
    return;
  }

  if (
    action ===
    'View Reversal/Refund Information'
  ) {
    openTransaction(transaction);
    return;
  }

  setSuccess(
    `${action} selected for ${
      transactionReference(
        transaction
      )
    }.`
  );
};

/* ============================================================
   ACTION BUTTON
   ============================================================ */

const FinancialActionButton = ({
  action,
  transaction,
}: {
  action: string;
  transaction: Transaction;
}) => {
  const danger =
    action === 'Report Fraud' ||
    action === 'Reject';

  const warning =
    action === 'Reverse';

  const primary =
    action === 'Approve' ||
    action === 'Review';

  return (
    <Button
      size="small"
      variant={
        action === 'View'
          ? 'text'
          : 'contained'
      }
      onClick={() =>
        handleFinancialAction(
          action,
          transaction
        )
      }
      sx={{
        minWidth: 'auto',
        px: 1,
        borderRadius: 1.5,
        textTransform: 'none',
        fontSize: 10.5,
        fontWeight: 800,

        ...(action === 'View'
          ? {
              color:
                BRAND.green,
            }
          : danger
          ? {
              backgroundColor:
                '#B42318',
              '&:hover': {
                backgroundColor:
                  '#912018',
              },
            }
          : warning
          ? {
              backgroundColor:
                '#B54708',
              '&:hover': {
                backgroundColor:
                  '#8F3A06',
              },
            }
          : primary
          ? {
              backgroundColor:
                BRAND.dark,
              '&:hover': {
                backgroundColor:
                  BRAND.green,
              },
            }
          : {
              backgroundColor:
                BRAND.dark,
              '&:hover': {
                backgroundColor:
                  BRAND.green,
              },
            }),
      }}
    >
      {action}
    </Button>
  );
};

/* ============================================================
   TRANSACTION ACTIONS MENU
   ============================================================ */

const FinancialActions = ({
  transaction,
}: {
  transaction: Transaction;
}) => {
  const actions =
    getTransactionActions(
      transaction
    );

  return (
    <Stack
      direction="row"
      spacing={0.4}
      flexWrap="wrap"
      useFlexGap
    >
      {actions.map(
        (action) => (
          <FinancialActionButton
            key={action}
            action={action}
            transaction={
              transaction
            }
          />
        )
      )}
    </Stack>
  );
};

/* ============================================================
   FINANCIAL TABLE
   ============================================================ */

const FinancialTransactionTable = ({
  rows,
}: {
  rows: Transaction[];
}) => {
  return (
    <Card sx={pageCardSx}>
      <TableContainer>
        <Table
          size="small"
          sx={{
            minWidth: 1050,
          }}
        >
          <TableHead>
            <TableRow>
              {[
                'Customer',
                'Reference',
                'Type',
                'Amount',
                'Status',
                'Date',
                'Action',
              ].map(
                (heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      py: 1.35,
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        BRAND.muted,
                      textTransform:
                        'uppercase',
                      letterSpacing:
                        0.55,
                      borderBottom:
                        `1px solid ${BRAND.border}`,
                      whiteSpace:
                        'nowrap',
                    }}
                  >
                    {heading}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map(
              (transaction) => (
                <TableRow
                  hover
                  key={
                    transaction.id
                  }
                >
                  {/* CUSTOMER */}

                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <Avatar
                        sx={{
                          width: 31,
                          height: 31,
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor:
                            BRAND.greenLight,
                          color:
                            BRAND.green,
                        }}
                      >
                        {transactionCustomer(
                          transaction
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>

                      <Box>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 750,
                            color:
                              BRAND.text,
                          }}
                        >
                          {transactionCustomer(
                            transaction
                          )}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 10,
                            color:
                              BRAND.muted,
                          }}
                        >
                          {transaction.email ||
                            '—'}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* REFERENCE */}

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          BRAND.text,
                        maxWidth: 145,
                        overflow:
                          'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {transactionReference(
                        transaction
                      )}
                    </Typography>
                  </TableCell>

                  {/* TYPE */}

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color:
                          BRAND.text,
                      }}
                    >
                      {statusLabel(
                        transactionType(
                          transaction
                        )
                      )}
                    </Typography>
                  </TableCell>

                  {/* AMOUNT */}

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color:
                          BRAND.text,
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {formatMoney(
                        transaction.amount,
                        transaction.currency ||
                          'NGN'
                      )}
                    </Typography>
                  </TableCell>

                  {/* STATUS */}

                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabel(
                        transaction.status
                      )}
                      color={statusColor(
                        transaction.status
                      )}
                      sx={{
                        height: 24,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    />
                  </TableCell>

                  {/* DATE */}

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color:
                          BRAND.muted,
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {transactionDate(
                        transaction
                      )}
                    </Typography>
                  </TableCell>

                  {/* ACTION */}

                  <TableCell>
                    <FinancialActions
                      transaction={
                        transaction
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            )}

            {rows.length ===
              0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{
                    py: 6,
                    color:
                      BRAND.muted,
                  }}
                >
                  <Stack
                    alignItems="center"
                    spacing={1}
                  >
                    <ReceiptLong
                      sx={{
                        fontSize: 32,
                        color:
                          '#AAB8B2',
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      No transactions
                      found
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                      }}
                    >
                      Try changing the
                      search or filters.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

/* ============================================================
   FINANCIAL FILTER BAR
   ============================================================ */

const FinancialFilterBar = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <Card sx={pageCardSx}>
      <CardContent
        sx={{
          p: 1.75,
        }}
      >
        <Stack
          direction={{
            xs: 'column',
            lg: 'row',
          }}
          justifyContent="space-between"
          alignItems={{
            xs: 'stretch',
            lg: 'center',
          }}
          spacing={1.5}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 800,
                color:
                  BRAND.text,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                fontSize: 11,
                color:
                  BRAND.muted,
              }}
            >
              {description}
            </Typography>
          </Box>

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
          >
            <TextField
              size="small"
              placeholder="Search customer, reference..."
              value={
                financialSearch
              }
              onChange={(event) =>
                setFinancialSearch(
                  event.target.value
                )
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      fontSize="small"
                      sx={{
                        color:
                          BRAND.muted,
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: {
                  xs: '100%',
                  sm: 240,
                },
              }}
            />

            <TextField
              select
              size="small"
              label="Status"
              value={
                financialStatusFilter
              }
              onChange={(event) =>
                setFinancialStatusFilter(
                  event.target.value
                )
              }
              sx={{
                minWidth: 145,
              }}
            >
              <MenuItem value="ALL">
                All statuses
              </MenuItem>

              <MenuItem value="PENDING">
                Pending
              </MenuItem>

              <MenuItem value="PROCESSING">
                Processing
              </MenuItem>

              <MenuItem value="COMPLETED">
                Completed
              </MenuItem>

              <MenuItem value="FAILED">
                Failed
              </MenuItem>

              <MenuItem value="REVERSED">
                Reversed
              </MenuItem>

              <MenuItem value="REFUNDED">
                Refunded
              </MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

/* ============================================================
   FINANCIAL STATUS SUMMARY
   ============================================================ */

const FinancialStatusSummary = () => {
  const items = [
    {
      label: 'All',
      value:
        financialStatusCounts.all,
      filter: 'ALL',
      icon: <ReceiptLong />,
    },
    {
      label: 'Pending',
      value:
        financialStatusCounts.pending,
      filter: 'PENDING',
      icon: <Autorenew />,
    },
    {
      label: 'Processing',
      value:
        financialStatusCounts.processing,
      filter: 'PROCESSING',
      icon: <Autorenew />,
    },
    {
      label: 'Completed',
      value:
        financialStatusCounts.completed,
      filter: 'COMPLETED',
      icon: <CheckCircle />,
    },
    {
      label: 'Failed',
      value:
        financialStatusCounts.failed,
      filter: 'FAILED',
      icon: <WarningAmber />,
    },
    {
      label: 'Reversed / Refunded',
      value:
        financialStatusCounts.reversed,
      filter: 'REVERSED',
      icon: <Autorenew />,
    },
  ];

  return (
    <Grid
      container
      spacing={1}
    >
      {items.map(
        (item) => (
          <Grid
            item
            xs={6}
            sm={4}
            md={2}
            key={item.label}
          >
            <Button
              fullWidth
              onClick={() =>
                setFinancialStatusFilter(
                  item.filter
                )
              }
              sx={{
                minHeight: 78,
                p: 1.25,
                borderRadius: 2.25,
                border:
                  `1px solid ${
                    financialStatusFilter ===
                    item.filter
                      ? '#A9D8C5'
                      : BRAND.border
                  }`,
                backgroundColor:
                  financialStatusFilter ===
                  item.filter
                    ? '#F0F9F5'
                    : BRAND.white,
                display: 'block',
                textAlign: 'left',
                color:
                  BRAND.text,
                textTransform:
                  'none',
                '&:hover': {
                  backgroundColor:
                    '#F0F9F5',
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box
                  sx={{
                    color:
                      BRAND.green,
                  }}
                >
                  {React.cloneElement(
                    item.icon as React.ReactElement,
                    {
                      fontSize:
                        'small',
                    }
                  )}
                </Box>

                <Typography
                  sx={{
                    fontSize: 19,
                    fontWeight: 850,
                  }}
                >
                  {formatNumber(
                    item.value
                  )}
                </Typography>
              </Stack>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 10,
                  fontWeight: 700,
                  color:
                    BRAND.muted,
                }}
              >
                {item.label}
              </Typography>
            </Button>
          </Grid>
        )
      )}
    </Grid>
  );
};

/* ============================================================
   TRANSACTIONS PAGE
   ============================================================ */

const renderTransactions = () => (
  <Stack spacing={2.25}>
    <SectionHeader
      eyebrow="Financial Operations"
      title="Transactions"
      description="Monitor customer transaction activity and investigate individual financial records."
    />

    <FinancialStatusSummary />

    <FinancialFilterBar
      title="Transaction Monitor"
      description="Search and filter the complete transaction activity available to Administration."
    />

    <FinancialTransactionTable
      rows={
        filteredFinancialTransactions
      }
    />
  </Stack>
);

/* ============================================================
   PENDING TRANSACTIONS
   ============================================================ */

const renderPendingTransactions =
  () => {
    const rows =
      transactions.filter(
        (transaction) =>
          getStatus(transaction) ===
            'PENDING' ||
          getStatus(transaction) ===
            'PROCESSING'
      );

    return (
      <Stack spacing={2.25}>
        <SectionHeader
          eyebrow="Financial Operations"
          title="Pending Transactions"
          description="Transactions requiring administrative review or action."
        />

        <FinancialStatusSummary />

        <FinancialFilterBar
          title="Pending Queue"
          description="Pending and processing transactions are shown here."
        />

        <FinancialTransactionTable
          rows={
            rows.filter(
              (transaction) => {
                const query =
                  financialSearch
                    .trim()
                    .toLowerCase();

                if (!query) {
                  return true;
                }

                return (
                  transactionCustomer(
                    transaction
                  )
                    .toLowerCase()
                    .includes(query) ||
                  transactionReference(
                    transaction
                  )
                    .toLowerCase()
                    .includes(query)
                );
              }
            )
          }
        />
      </Stack>
    );
  };

/* ============================================================
   BANK TRANSFERS
   ============================================================ */

const renderBankTransfers =
  () => {
    const transfers =
      transactions.filter(
        (transaction) => {
          const type =
            transactionType(
              transaction
            ).toLowerCase();

          return (
            type.includes(
              'transfer'
            ) ||
            type.includes(
              'bank'
            )
          );
        }
      );

    return (
      <Stack spacing={2.25}>
        <SectionHeader
          eyebrow="Financial Operations"
          title="Bank Transfers"
          description="Monitor transfer activity, beneficiary information and provider references."
        />

        <FinancialFilterBar
          title="Transfer Monitor"
          description="Bank-transfer records available to Administration."
        />

        <FinancialTransactionTable
          rows={transfers}
        />

        {transfers.length > 0 && (
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
            }}
          >
            Beneficiary information will be
            displayed in the transaction
            detail view when the backend
            returns those fields.
          </Alert>
        )}
      </Stack>
    );
  };

/* ============================================================
   DEPOSITS
   ============================================================ */

const renderDeposits =
  () => {
    const deposits =
      transactions.filter(
        (transaction) => {
          const type =
            transactionType(
              transaction
            ).toLowerCase();

          return (
            type.includes(
              'deposit'
            ) ||
            type.includes(
              'funding'
            )
          );
        }
      );

    return (
      <Stack spacing={2.25}>
        <SectionHeader
          eyebrow="Financial Operations"
          title="Deposits"
          description="Monitor customer deposit activity and processing status."
        />

        <FinancialFilterBar
          title="Deposit Monitor"
          description="Customer deposit records."
        />

        <FinancialTransactionTable
          rows={deposits}
        />
      </Stack>
    );
  };

/* ============================================================
   WITHDRAWALS
   ============================================================ */

const renderWithdrawals =
  () => {
    const withdrawals =
      transactions.filter(
        (transaction) => {
          const type =
            transactionType(
              transaction
            ).toLowerCase();

          return (
            type.includes(
              'withdraw'
            ) ||
            type.includes(
              'cashout'
            )
          );
        }
      );

    return (
      <Stack spacing={2.25}>
        <SectionHeader
          eyebrow="Financial Operations"
          title="Withdrawals"
          description="Monitor withdrawal requests and their transaction lifecycle."
        />

        <FinancialFilterBar
          title="Withdrawal Monitor"
          description="Customer withdrawal records."
        />

        <FinancialTransactionTable
          rows={withdrawals}
        />
      </Stack>
    );
  };

/* ============================================================
   FINANCIAL SECTION ROUTER
   ============================================================ */

const renderFinancialSection =
  () => {
    switch (section) {
      case 'transactions':
        return renderTransactions();

      case 'pending-transactions':
        return renderPendingTransactions();

      case 'bank-transfers':
        return renderBankTransfers();

      case 'deposits':
        return renderDeposits();

      case 'withdrawals':
        return renderWithdrawals();

      default:
        return null;
    }
  };
/* ============================================================
   PART 3 — SERVICES OPERATIONS
   ============================================================ */

/* ============================================================
   SERVICE MODULE CARD
   ============================================================ */

const ServiceModuleCard = ({
  title,
  description,
  icon,
  sectionKey,
  status = 'Operational module',
}: {
  title: string;
  description: string;
  icon: string;
  sectionKey: string;
  status?: string;
}) => {
  const active =
    section === sectionKey;

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2.5,
        border:
          `1px solid ${
            active
              ? '#A9D8C5'
              : BRAND.border
          }`,
        backgroundColor:
          BRAND.white,
        boxShadow:
          '0 5px 20px rgba(8,44,35,0.04)',
        transition:
          'all 0.2s ease',
        '&:hover': {
          transform:
            'translateY(-2px)',
          boxShadow:
            '0 9px 26px rgba(8,44,35,0.08)',
        },
      }}
    >
      <CardContent
        sx={{
          p: 2,
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 1.75,
                backgroundColor:
                  BRAND.greenLight,
                color:
                  BRAND.green,
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {icon}
            </Box>

            <Chip
              size="small"
              label={status}
              sx={{
                height: 23,
                fontSize: 9.5,
                fontWeight: 800,
                color:
                  BRAND.green,
                backgroundColor:
                  BRAND.greenLight,
              }}
            />
          </Stack>

          <Box>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 850,
                color:
                  BRAND.text,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                lineHeight: 1.6,
                color:
                  BRAND.muted,
              }}
            >
              {description}
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              setSection(
                sectionKey
              )
            }
            sx={{
              alignSelf:
                'flex-start',
              borderColor:
                '#B8D9CB',
              color:
                BRAND.green,
              borderRadius: 1.5,
              textTransform:
                'none',
              fontSize: 10.5,
              fontWeight: 800,
              '&:hover': {
                borderColor:
                  BRAND.green,
                backgroundColor:
                  BRAND.greenLight,
              },
            }}
          >
            Open module
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

/* ============================================================
   SERVICES OVERVIEW
   ============================================================ */

const renderServicesOverview =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Service Operations"
        title="Services"
        description="Monitor and operate ZENIMONIES customer service products from one administration workspace."
      />

      <Grid
        container
        spacing={1.5}
      >
        <Grid
          item
          xs={12}
          sm={6}
          md={4}
        >
          <ServiceModuleCard
            title="Airtime & Data"
            description="Monitor airtime and data purchases, provider responses, failed transactions and refunds."
            icon="◉"
            sectionKey="airtime"
          />
        </Grid>

        <Grid
          item
          xs={12}
          sm={6}
          md={4}
        >
          <ServiceModuleCard
            title="Bills"
            description="Monitor electricity, cable, internet and other bill-payment operations."
            icon="▤"
            sectionKey="bills"
          />
        </Grid>

        <Grid
          item
          xs={12}
          sm={6}
          md={4}
        >
          <ServiceModuleCard
            title="Gift Cards"
            description="Monitor gift-card purchases, sell orders, provider transactions and settlement activity."
            icon="▧"
            sectionKey="giftcards"
          />
        </Grid>

        <Grid
          item
          xs={12}
          sm={6}
          md={4}
        >
          <ServiceModuleCard
            title="Business Banking"
            description="Manage business customers, verification levels, business accounts and business activity."
            icon="▥"
            sectionKey="business"
          />
        </Grid>

        <Grid
          item
          xs={12}
          sm={6}
          md={4}
        >
          <ServiceModuleCard
            title="POS"
            description="Manage POS applications, terminals, assignments, approval status and terminal activity."
            icon="▦"
            sectionKey="pos"
          />
        </Grid>
      </Grid>
    </Stack>
  );

/* ============================================================
   AIRTIME & DATA
   ============================================================ */

const renderAirtime =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Service Operations"
        title="Airtime & Data"
        description="Monitor airtime and data service activity, provider responses and failed transactions."
      />

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 2.25,
          }}
        >
          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 850,
                color:
                  BRAND.text,
              }}
            >
              Airtime & Data Operations
            </Typography>

            <Typography
              sx={{
                fontSize: 11.5,
                lineHeight: 1.7,
                color:
                  BRAND.muted,
              }}
            >
              This workspace will display
              customer airtime and data
              purchases, provider references,
              service status, charges,
              provider cost, refunds and
              failed requests.
            </Typography>

            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                fontSize: 11,
              }}
            >
              No service figures are being
              fabricated. Live operational
              records will be displayed when
              the corresponding backend
              service endpoint is connected.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

/* ============================================================
   BILLS
   ============================================================ */

const renderBills =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Service Operations"
        title="Bills"
        description="Monitor electricity, cable, internet and other bill-payment operations."
      />

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 2.25,
          }}
        >
          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 850,
                color:
                  BRAND.text,
              }}
            >
              Bill Payment Operations
            </Typography>

            <Typography
              sx={{
                fontSize: 11.5,
                lineHeight: 1.7,
                color:
                  BRAND.muted,
              }}
            >
              Administration will be able
              to monitor bill type, customer,
              provider, amount, customer
              charge, provider cost,
              transaction reference, status
              and refund information.
            </Typography>

            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                fontSize: 11,
              }}
            >
              Live bill-payment records will
              appear here once the relevant
              backend operations endpoint is
              connected.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

/* ============================================================
   GIFT CARDS
   ============================================================ */

const renderGiftCards =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Service Operations"
        title="Gift Cards"
        description="Monitor gift-card purchases, sell orders, rates, provider transactions and settlements."
      />

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 2.25,
          }}
        >
          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 850,
                color:
                  BRAND.text,
              }}
            >
              Gift Card Operations
            </Typography>

            <Typography
              sx={{
                fontSize: 11.5,
                lineHeight: 1.7,
                color:
                  BRAND.muted,
              }}
            >
              This module is designed for
              gift-card purchase and sell
              operations, provider references,
              rates, customer charges,
              provider costs, ZENIMONIES
              revenue and settlement records.
            </Typography>

            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                fontSize: 11,
              }}
            >
              Provider transaction records
              will be displayed from the
              backend rather than using
              placeholder figures.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

/* ============================================================
   BUSINESS BANKING
   ============================================================ */

const renderBusiness =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Business Banking"
        title="Business Banking"
        description="Administration workspace for business customers, verification and business account operations."
      />

      <Grid
        container
        spacing={1.5}
      >
        {[
          {
            title:
              'Business Customers',
            description:
              'View and manage business customer records and account activity.',
          },
          {
            title:
              'Verification',
            description:
              'Monitor business verification levels and verification status.',
          },
          {
            title:
              'Business Accounts',
            description:
              'Review business accounts and their operational status.',
          },
          {
            title:
              'Business Activity',
            description:
              'Review business financial and service activity.',
          },
        ].map(
          (item) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={3}
              key={
                item.title
              }
            >
              <Card
                sx={{
                  height:
                    '100%',
                  borderRadius:
                    2.25,
                  border:
                    `1px solid ${BRAND.border}`,
                  boxShadow:
                    'none',
                }}
              >
                <CardContent
                  sx={{
                    p: 1.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color:
                        BRAND.text,
                    }}
                  >
                    {
                      item.title
                    }
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.6,
                      fontSize: 10.5,
                      lineHeight: 1.6,
                      color:
                        BRAND.muted,
                    }}
                  >
                    {
                      item.description
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )
        )}
      </Grid>

      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          fontSize: 11,
        }}
      >
        Business operational records will
        be connected to their dedicated
        backend endpoints. No customer
        balances or business figures are
        fabricated here.
      </Alert>
    </Stack>
  );

/* ============================================================
   POS
   ============================================================ */

const renderPos =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Business Operations"
        title="POS Management"
        description="Manage POS applications, terminals, assignments, approval status and terminal activity."
      />

      <Grid
        container
        spacing={1.5}
      >
        {[
          {
            title:
              'Applications',
            description:
              'Review POS applications and their approval status.',
          },
          {
            title:
              'Terminals',
            description:
              'Monitor issued POS terminals and terminal status.',
          },
          {
            title:
              'Assignments',
            description:
              'Review terminal-to-business assignments.',
          },
          {
            title:
              'Terminal Activity',
            description:
              'Monitor POS transaction and operational activity.',
          },
        ].map(
          (item) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={3}
              key={
                item.title
              }
            >
              <Card
                sx={{
                  height:
                    '100%',
                  borderRadius:
                    2.25,
                  border:
                    `1px solid ${BRAND.border}`,
                  boxShadow:
                    'none',
                }}
              >
                <CardContent
                  sx={{
                    p: 1.75,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color:
                        BRAND.text,
                    }}
                  >
                    {
                      item.title
                    }
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.6,
                      fontSize: 10.5,
                      lineHeight: 1.6,
                      color:
                        BRAND.muted,
                    }}
                  >
                    {
                      item.description
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )
        )}
      </Grid>

      <Alert
        severity="info"
        sx={{
          borderRadius: 2,
          fontSize: 11,
        }}
      >
        POS operational data will be
        displayed from the backend once
        the POS administration endpoints
        are connected.
      </Alert>
    </Stack>
  );

/* ============================================================
   SERVICES SECTION ROUTER
   ============================================================ */

const renderServicesSection =
  () => {
    switch (section) {
      case 'airtime':
        return renderAirtime();

      case 'bills':
        return renderBills();

      case 'giftcards':
        return renderGiftCards();

      case 'business':
        return renderBusiness();

      case 'pos':
        return renderPos();

      default:
        return renderServicesOverview();
    }
  };
 /* ============================================================
   PART 4 — CUSTOMER CARE & ADMINISTRATION ESCALATIONS
   ============================================================ */

type AdminSupportTicket = {
  id: string;
  ticket_number?: string;
  subject?: string;
  category_name?: string;
  customer_name?: string;
  customer_email?: string;
  priority?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  escalated_at?: string;
  escalated_by_name?: string;
  escalation_reason?: string;
  assigned_admin_id?: string;
  assigned_admin_name?: string;
};

type AdminSupportDetails = {
  ticket: AdminSupportTicket;
  messages?: Array<{
    id?: string;
    sender_name?: string;
    sender_role?: string;
    message?: string;
    created_at?: string;
  }>;
  customer?: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
  };
};

/* ============================================================
   CUSTOMER CARE STATE
   ============================================================ */

const [supportTickets, setSupportTickets] =
  useState<AdminSupportTicket[]>([]);

const [supportLoading, setSupportLoading] =
  useState(false);

const [supportSearch, setSupportSearch] =
  useState('');

const [supportStatusFilter, setSupportStatusFilter] =
  useState('all');

const [supportPriorityFilter, setSupportPriorityFilter] =
  useState('all');

const [
  selectedSupportTicket,
  setSelectedSupportTicket,
] = useState<AdminSupportDetails | null>(
  null
);

const [supportDialogOpen, setSupportDialogOpen] =
  useState(false);

const [supportActionLoading, setSupportActionLoading] =
  useState(false);

/* ============================================================
   ESCALATION STATE
   ============================================================ */

const [
  escalatedTickets,
  setEscalatedTickets,
] = useState<AdminSupportTicket[]>([]);

const [
  escalationLoading,
  setEscalationLoading,
] = useState(false);

const [
  escalationSearch,
  setEscalationSearch,
] = useState('');

const [
  selectedEscalatedTicket,
  setSelectedEscalatedTicket,
] = useState<AdminSupportDetails | null>(
  null
);

const [
  escalationDialogOpen,
  setEscalationDialogOpen,
] = useState(false);

const [
  escalationActionLoading,
  setEscalationActionLoading,
] = useState(false);

/* ============================================================
   CUSTOMER CARE AGENTS STATE
   ============================================================ */

const [
  customerCareAgents,
  setCustomerCareAgents,
] = useState<any[]>([]);

const [
  customerCareAgentsLoading,
  setCustomerCareAgentsLoading,
] = useState(false);

/* ============================================================
   SUPPORT API HEADERS
   ============================================================ */

const getAdminAuthHeaders = () => {
  const token =
    localStorage.getItem(
      'adminToken'
    );

  return {
    Authorization:
      `Bearer ${token || ''}`,
    'Content-Type':
      'application/json',
  };
};

/* ============================================================
   LOAD CUSTOMER CARE CASES
   ============================================================ */

const loadSupportTickets =
  async () => {
    try {
      setSupportLoading(true);
      setError('');

      const params =
        new URLSearchParams();

      if (
        supportStatusFilter !==
        'all'
      ) {
        params.set(
          'status',
          supportStatusFilter
        );
      }

      if (
        supportPriorityFilter !==
        'all'
      ) {
        params.set(
          'priority',
          supportPriorityFilter
        );
      }

      if (
        supportSearch.trim()
      ) {
        params.set(
          'search',
          supportSearch.trim()
        );
      }

      const query =
        params.toString();

      const response =
        await fetch(
          `${API_BASE}/admin/support/tickets${
            query
              ? `?${query}`
              : ''
          }`,
          {
            headers:
              getAdminAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load Customer Care cases.'
        );
      }

      setSupportTickets(
        data.tickets || []
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to load Customer Care cases.'
      );
    } finally {
      setSupportLoading(false);
    }
  };

/* ============================================================
   LOAD ESCALATED CASES
   ============================================================ */

const loadEscalatedTickets =
  async () => {
    try {
      setEscalationLoading(
        true
      );
      setError('');

      const params =
        new URLSearchParams();

      if (
        escalationSearch.trim()
      ) {
        params.set(
          'search',
          escalationSearch.trim()
        );
      }

      const query =
        params.toString();

      const response =
        await fetch(
          `${API_BASE}/admin/support/escalated${
            query
              ? `?${query}`
              : ''
          }`,
          {
            headers:
              getAdminAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load escalated cases.'
        );
      }

      setEscalatedTickets(
        data.tickets || []
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to load escalated cases.'
      );
    } finally {
      setEscalationLoading(
        false
      );
    }
  };

/* ============================================================
   OPEN CUSTOMER CARE CASE
   ============================================================ */

const openSupportTicket =
  async (
    ticketId: string
  ) => {
    try {
      setSupportActionLoading(
        true
      );

      const response =
        await fetch(
          `${API_BASE}/admin/support/tickets/${ticketId}`,
          {
            headers:
              getAdminAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to open support case.'
        );
      }

      setSelectedSupportTicket(
        data
      );

      setSupportDialogOpen(
        true
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to open support case.'
      );
    } finally {
      setSupportActionLoading(
        false
      );
    }
  };

/* ============================================================
   OPEN ESCALATED CASE
   ============================================================ */

const openEscalatedTicket =
  async (
    ticketId: string
  ) => {
    try {
      setEscalationActionLoading(
        true
      );

      const response =
        await fetch(
          `${API_BASE}/admin/support/escalated/${ticketId}`,
          {
            headers:
              getAdminAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to open escalated case.'
        );
      }

      setSelectedEscalatedTicket(
        data
      );

      setEscalationDialogOpen(
        true
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to open escalated case.'
      );
    } finally {
      setEscalationActionLoading(
        false
      );
    }
  };

/* ============================================================
   TAKE ESCALATED CASE
   ============================================================ */

const takeEscalatedCase =
  async () => {
    if (
      !selectedEscalatedTicket
    ) {
      return;
    }

    try {
      setEscalationActionLoading(
        true
      );

      const ticketId =
        selectedEscalatedTicket
          .ticket.id;

      const response =
        await fetch(
          `${API_BASE}/admin/support/escalated/${ticketId}/take`,
          {
            method: 'POST',
            headers:
              getAdminAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to take escalated case.'
        );
      }

      await openEscalatedTicket(
        ticketId
      );

      await loadEscalatedTickets();

      setSuccess(
        'Escalated case assigned to Administration.'
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to take escalated case.'
      );
    } finally {
      setEscalationActionLoading(
        false
      );
    }
  };

/* ============================================================
   SUPPORT STATUS
   ============================================================ */

const updateSupportStatus =
  async (
    status: string
  ) => {
    if (
      !selectedSupportTicket
    ) {
      return;
    }

    try {
      setSupportActionLoading(
        true
      );

      const ticketId =
        selectedSupportTicket
          .ticket.id;

      const response =
        await fetch(
          `${API_BASE}/admin/support/tickets/${ticketId}/status`,
          {
            method: 'PATCH',
            headers:
              getAdminAuthHeaders(),
            body:
              JSON.stringify({
                status,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to update support status.'
        );
      }

      await openSupportTicket(
        ticketId
      );

      await loadSupportTickets();

      setSuccess(
        'Customer Care case status updated.'
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to update support status.'
      );
    } finally {
      setSupportActionLoading(
        false
      );
    }
  };

/* ============================================================
   ESCALATED STATUS
   ============================================================ */

const updateEscalatedStatus =
  async (
    status: string
  ) => {
    if (
      !selectedEscalatedTicket
    ) {
      return;
    }

    try {
      setEscalationActionLoading(
        true
      );

      const ticketId =
        selectedEscalatedTicket
          .ticket.id;

      const response =
        await fetch(
          `${API_BASE}/admin/support/tickets/${ticketId}/status`,
          {
            method: 'PATCH',
            headers:
              getAdminAuthHeaders(),
            body:
              JSON.stringify({
                status,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to update case status.'
        );
      }

      await openEscalatedTicket(
        ticketId
      );

      await loadEscalatedTickets();

      setSuccess(
        'Administration case status updated.'
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to update case status.'
      );
    } finally {
      setEscalationActionLoading(
        false
      );
    }
  };

/* ============================================================
   CLOSE SUPPORT DIALOG
   ============================================================ */

const closeSupportDialog =
  () => {
    if (
      supportActionLoading
    ) {
      return;
    }

    setSupportDialogOpen(
      false
    );

    setSelectedSupportTicket(
      null
    );
  };

/* ============================================================
   CLOSE ESCALATION DIALOG
   ============================================================ */

const closeEscalationDialog =
  () => {
    if (
      escalationActionLoading
    ) {
      return;
    }

    setEscalationDialogOpen(
      false
    );

    setSelectedEscalatedTicket(
      null
    );
  };

/* ============================================================
   SUPPORT STATUS HELPERS
   ============================================================ */

const supportStatusLabel =
  (
    status?: string
  ) => {
    const value =
      String(
        status || ''
      )
        .replace(
          /_/g,
          ' '
        )
        .toLowerCase();

    return value
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      ) || 'Unknown';
  };

const supportStatusColor =
  (
    status?: string
  ):
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'default' => {
    const value =
      String(
        status || ''
      ).toLowerCase();

    if (
      value ===
        'resolved' ||
      value ===
        'closed'
    ) {
      return 'success';
    }

    if (
      value ===
        'waiting_for_customer' ||
      value ===
        'pending_customer_care' ||
      value ===
        'in_progress'
    ) {
      return 'warning';
    }

    if (
      value ===
        'escalated' ||
      value ===
        'administration'
    ) {
      return 'error';
    }

    if (
      value ===
        'open'
    ) {
      return 'info';
    }

    return 'default';
  };

/* ============================================================
   CUSTOMER CARE PAGE
   ============================================================ */

const renderSupportCases =
  () => {
    return (
      <Stack spacing={2.25}>
        <SectionHeader
          eyebrow="Customer Care"
          title="Support Cases"
          description="Review customer complaints and Customer Care cases without exposing administrative controls to Customer Care agents."
        />

        <Card
          sx={pageCardSx}
        >
          <CardContent
            sx={{ p: 1.75 }}
          >
            <Stack
              direction={{
                xs: 'column',
                md: 'row',
              }}
              spacing={1}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search ticket, customer or subject..."
                value={
                  supportSearch
                }
                onChange={(
                  event
                ) =>
                  setSupportSearch(
                    event.target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    loadSupportTickets();
                  }
                }}
              />

              <TextField
                select
                size="small"
                label="Status"
                value={
                  supportStatusFilter
                }
                onChange={(
                  event
                ) => {
                  setSupportStatusFilter(
                    event.target
                      .value
                  );
                }}
                sx={{
                  minWidth: 170,
                }}
              >
                <MenuItem value="all">
                  All statuses
                </MenuItem>

                <MenuItem value="open">
                  Open
                </MenuItem>

                <MenuItem value="pending_customer_care">
                  Pending Customer Care
                </MenuItem>

                <MenuItem value="in_progress">
                  In Progress
                </MenuItem>

                <MenuItem value="waiting_for_customer">
                  Waiting for Customer
                </MenuItem>

                <MenuItem value="resolved">
                  Resolved
                </MenuItem>

                <MenuItem value="closed">
                  Closed
                </MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label="Priority"
                value={
                  supportPriorityFilter
                }
                onChange={(
                  event
                ) => {
                  setSupportPriorityFilter(
                    event.target
                      .value
                  );
                }}
                sx={{
                  minWidth: 150,
                }}
              >
                <MenuItem value="all">
                  All priorities
                </MenuItem>

                <MenuItem value="low">
                  Low
                </MenuItem>

                <MenuItem value="medium">
                  Medium
                </MenuItem>

                <MenuItem value="high">
                  High
                </MenuItem>

                <MenuItem value="urgent">
                  Urgent
                </MenuItem>
              </TextField>

              <Button
                variant="contained"
                onClick={
                  loadSupportTickets
                }
                disabled={
                  supportLoading
                }
                sx={{
                  minWidth: 100,
                  backgroundColor:
                    BRAND.dark,
                  '&:hover': {
                    backgroundColor:
                      BRAND.green,
                  },
                  textTransform:
                    'none',
                  fontWeight: 800,
                }}
              >
                {supportLoading
                  ? 'Loading...'
                  : 'Refresh'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={pageCardSx}
        >
          <TableContainer>
            <Table
              size="small"
              sx={{
                minWidth: 1000,
              }}
            >
              <TableHead>
                <TableRow>
                  {[
                    'Ticket',
                    'Customer',
                    'Complaint',
                    'Priority',
                    'Status',
                    'Created',
                    'Action',
                  ].map(
                    (heading) => (
                      <TableCell
                        key={
                          heading
                        }
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          color:
                            BRAND.muted,
                          textTransform:
                            'uppercase',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {heading}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {supportTickets.map(
                  (ticket) => (
                    <TableRow
                      hover
                      key={
                        ticket.id
                      }
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {ticket.ticket_number ||
                            ticket.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 750,
                          }}
                        >
                          {ticket.customer_name ||
                            'Unknown customer'}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 10,
                            color:
                              BRAND.muted,
                          }}
                        >
                          {ticket.customer_email ||
                            '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            maxWidth: 260,
                          }}
                        >
                          {ticket.subject ||
                            'Customer complaint'}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 10,
                            color:
                              BRAND.muted,
                          }}
                        >
                          {ticket.category_name ||
                            'General Support'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            ticket.priority ||
                            'normal'
                          }
                          sx={{
                            height: 23,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={supportStatusLabel(
                            ticket.status
                          )}
                          color={supportStatusColor(
                            ticket.status
                          )}
                          sx={{
                            height: 23,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 10.5,
                            color:
                              BRAND.muted,
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {formatDate(
                            ticket.created_at
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Button
                          size="small"
                          onClick={() =>
                            openSupportTicket(
                              ticket.id
                            )
                          }
                          sx={{
                            color:
                              BRAND.green,
                            textTransform:
                              'none',
                            fontWeight: 800,
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}

                {supportTickets.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{
                        py: 6,
                        color:
                          BRAND.muted,
                      }}
                    >
                      No Customer Care
                      cases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>
    );
  };

/* ============================================================
   ESCALATED CASES
   ============================================================ */

const renderEscalatedCases =
  () => {
    return (
      <Stack spacing={2.25}>
        <SectionHeader
          eyebrow="Risk & Administration"
          title="Escalated Cases"
          description="Cases forwarded by Customer Care because administrative investigation or action is required."
        />

        <Card
          sx={pageCardSx}
        >
          <CardContent
            sx={{ p: 1.75 }}
          >
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search ticket, customer or complaint..."
                value={
                  escalationSearch
                }
                onChange={(
                  event
                ) =>
                  setEscalationSearch(
                    event.target
                      .value
                  )
                }
              />

              <Button
                variant="contained"
                onClick={
                  loadEscalatedTickets
                }
                disabled={
                  escalationLoading
                }
                sx={{
                  backgroundColor:
                    BRAND.dark,
                  '&:hover': {
                    backgroundColor:
                      BRAND.green,
                  },
                  textTransform:
                    'none',
                  fontWeight: 800,
                  minWidth: 110,
                }}
              >
                {escalationLoading
                  ? 'Loading...'
                  : 'Refresh'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={pageCardSx}
        >
          <TableContainer>
            <Table
              size="small"
              sx={{
                minWidth: 1150,
              }}
            >
              <TableHead>
                <TableRow>
                  {[
                    'Ticket',
                    'Customer',
                    'Complaint',
                    'Escalation Reason',
                    'Priority',
                    'Status',
                    'Action',
                  ].map(
                    (heading) => (
                      <TableCell
                        key={
                          heading
                        }
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          color:
                            BRAND.muted,
                          textTransform:
                            'uppercase',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {heading}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {escalatedTickets.map(
                  (ticket) => {
                    const taken =
                      Boolean(
                        ticket.assigned_admin_id
                      );

                    return (
                      <TableRow
                        hover
                        key={
                          ticket.id
                        }
                      >
                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {ticket.ticket_number ||
                              ticket.id}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 750,
                            }}
                          >
                            {ticket.customer_name ||
                              'Unknown customer'}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 10,
                              color:
                                BRAND.muted,
                            }}
                          >
                            {ticket.customer_email ||
                              '—'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 700,
                              maxWidth: 220,
                            }}
                          >
                            {ticket.subject ||
                              'Customer complaint'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: 11,
                              maxWidth: 270,
                            }}
                          >
                            {ticket.escalation_reason ||
                              'No reason supplied'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              ticket.priority ||
                              'normal'
                            }
                            sx={{
                              height: 23,
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              taken
                                ? 'Administration In Progress'
                                : 'Awaiting Takeover'
                            }
                            color={
                              taken
                                ? 'warning'
                                : 'error'
                            }
                            sx={{
                              fontSize: 9.5,
                              fontWeight: 800,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={0.5}
                          >
                            <Button
                              size="small"
                              onClick={() =>
                                openEscalatedTicket(
                                  ticket.id
                                )
                              }
                              sx={{
                                textTransform:
                                  'none',
                                fontWeight: 800,
                                color:
                                  BRAND.green,
                              }}
                            >
                              View
                            </Button>

                            {!taken && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={
                                  async () => {
                                    await openEscalatedTicket(
                                      ticket.id
                                    );
                                  }
                                }
                                sx={{
                                  backgroundColor:
                                    BRAND.dark,
                                  '&:hover': {
                                    backgroundColor:
                                      BRAND.green,
                                  },
                                  textTransform:
                                    'none',
                                  fontWeight: 800,
                                }}
                              >
                                Take
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}

                {escalatedTickets.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{
                        py: 6,
                        color:
                          BRAND.muted,
                      }}
                    >
                      No escalated cases
                      are currently
                      waiting for
                      Administration.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>
    );
  };

/* ============================================================
   CUSTOMER CARE AGENTS
   ============================================================ */

const renderCustomerCareAgents =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Customer Care"
        title="Customer Care Agents"
        description="Administration view of Customer Care staffing and operational access."
      />

      <Card
        sx={pageCardSx}
      >
        <CardContent
          sx={{
            p: 2.25,
          }}
        >
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              fontSize: 11,
            }}
          >
            Customer Care agents operate
            under restricted permissions.
            They must not have access to
            customer balances, full account
            numbers, PINs, passwords, OTPs,
            CVV/full sensitive card data,
            transfers, reversals, KYC approval
            or other administrative controls.
          </Alert>

          <Box sx={{ mt: 2 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 850,
                color:
                  BRAND.text,
              }}
            >
              Agent administration
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                color:
                  BRAND.muted,
              }}
            >
              Agent-management controls will
              be connected to the dedicated
              Administration endpoint. No
              customer-care permissions are
              granted by this screen itself.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );

/* ============================================================
   CUSTOMER CARE SECTION ROUTER
   ============================================================ */

const renderCustomerCareSection =
  () => {
    switch (section) {
      case 'support':
        return renderSupportCases();

      case 'escalated':
        return renderEscalatedCases();

      case 'customer-care-agents':
        return renderCustomerCareAgents();

      default:
        return renderSupportCases();
    }
  };
 /* ============================================================
   PART 5 — RISK & COMPLIANCE
   ============================================================ */

/* ============================================================
   AUDIT LOG TYPES
   ============================================================ */

type AdminAuditLog = {
  id: string;
  action?: string;
  event?: string;
  description?: string;
  reason?: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  target_type?: string;
  target_id?: string;
  created_at?: string;
};

/* ============================================================
   RISK STATE
   ============================================================ */

const [auditLogs, setAuditLogs] =
  useState<AdminAuditLog[]>([]);

const [auditLoading, setAuditLoading] =
  useState(false);

const [auditSearch, setAuditSearch] =
  useState('');

const [auditActionFilter, setAuditActionFilter] =
  useState('ALL');

const [complianceSearch, setComplianceSearch] =
  useState('');

const [complianceFilter, setComplianceFilter] =
  useState('ALL');

/* ============================================================
   LOAD AUDIT LOGS
   ============================================================ */

const loadAuditLogs =
  async () => {
    try {
      setAuditLoading(true);
      setError('');

      const response =
        await fetch(
          `${API_BASE}/admin/audit-logs`,
          {
            headers:
              getAdminAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load audit logs.'
        );
      }

      setAuditLogs(
        data.logs ||
        data.audit_logs ||
        []
      );
    } catch (
      err: any
    ) {
      setError(
        err?.message ||
          'Unable to load audit logs.'
      );
    } finally {
      setAuditLoading(false);
    }
  };

/* ============================================================
   FILTER AUDIT LOGS
   ============================================================ */

const filteredAuditLogs =
  useMemo(() => {
    const query =
      auditSearch
        .trim()
        .toLowerCase();

    return auditLogs.filter(
      (log) => {
        const action =
          String(
            log.action ||
              log.event ||
              ''
          ).toLowerCase();

        const actor =
          String(
            log.actor_name ||
              log.actor_email ||
              ''
          ).toLowerCase();

        const target =
          String(
            log.target_id ||
              ''
          ).toLowerCase();

        const description =
          String(
            log.description ||
              log.reason ||
              ''
          ).toLowerCase();

        const matchesSearch =
          !query ||
          action.includes(
            query
          ) ||
          actor.includes(
            query
          ) ||
          target.includes(
            query
          ) ||
          description.includes(
            query
          );

        const matchesAction =
          auditActionFilter ===
            'ALL' ||
          action ===
            auditActionFilter.toLowerCase();

        return (
          matchesSearch &&
          matchesAction
        );
      }
    );
  }, [
    auditLogs,
    auditSearch,
    auditActionFilter,
  ]);

/* ============================================================
   COMPLIANCE RECORDS
   ============================================================ */

const complianceRecords =
  useMemo(() => {
    return kycRecords.map(
      (record: any) => ({
        ...record,
        customerName:
          record.full_name ||
          record.fullName ||
          record.customer_name ||
          'Unknown customer',

        customerEmail:
          record.email ||
          record.customer_email ||
          '—',

        status:
          String(
            record.status ||
              record.kyc_status ||
              'pending'
          ).toUpperCase(),
      })
    );
  }, [
    kycRecords,
  ]);

/* ============================================================
   FILTER COMPLIANCE
   ============================================================ */

const filteredComplianceRecords =
  useMemo(() => {
    const query =
      complianceSearch
        .trim()
        .toLowerCase();

    return complianceRecords.filter(
      (record: any) => {
        const name =
          String(
            record.customerName ||
              ''
          ).toLowerCase();

        const email =
          String(
            record.customerEmail ||
              ''
          ).toLowerCase();

        const status =
          String(
            record.status ||
              ''
          ).toUpperCase();

        const matchesSearch =
          !query ||
          name.includes(query) ||
          email.includes(query);

        const matchesStatus =
          complianceFilter ===
            'ALL' ||
          status ===
            complianceFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    complianceRecords,
    complianceSearch,
    complianceFilter,
  ]);

/* ============================================================
   COMPLIANCE SUMMARY
   ============================================================ */

const complianceSummary =
  useMemo(() => {
    const pending =
      complianceRecords.filter(
        (record: any) =>
          record.status ===
          'PENDING'
      ).length;

    const approved =
      complianceRecords.filter(
        (record: any) =>
          record.status ===
            'APPROVED' ||
          record.status ===
            'VERIFIED'
      ).length;

    const rejected =
      complianceRecords.filter(
        (record: any) =>
          record.status ===
          'REJECTED'
      ).length;

    return {
      total:
        complianceRecords.length,
      pending,
      approved,
      rejected,
    };
  }, [
    complianceRecords,
  ]);

/* ============================================================
   FRAUD REVIEW
   ============================================================ */

const fraudTransactions =
  useMemo(() => {
    return transactions.filter(
      (transaction: any) => {
        const description =
          String(
            transaction.description ||
              ''
          ).toLowerCase();

        const reference =
          String(
            transaction.reference ||
              ''
          ).toLowerCase();

        const status =
          String(
            transaction.status ||
              ''
          ).toLowerCase();

        return (
          description.includes(
            'fraud'
          ) ||
          description.includes(
            'suspicious'
          ) ||
          reference.includes(
            'fraud'
          ) ||
          status ===
            'fraud_reported'
        );
      }
    );
  }, [
    transactions,
  ]);

/* ============================================================
   RISK KPI CARD
   ============================================================ */

const RiskKpi = ({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) => (
  <Card
    sx={{
      ...pageCardSx,
      height: '100%',
    }}
  >
    <CardContent
      sx={{
        p: 1.75,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              color:
                BRAND.muted,
              textTransform:
                'uppercase',
              letterSpacing:
                0.5,
            }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 24,
              fontWeight: 850,
              color:
                BRAND.text,
            }}
          >
            {value}
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 10.5,
              color:
                BRAND.muted,
            }}
          >
            {description}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.75,
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            backgroundColor:
              BRAND.greenLight,
            color:
              BRAND.green,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

/* ============================================================
   FRAUD CASES
   ============================================================ */

const renderFraudCases =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Risk & Compliance"
        title="Fraud Cases"
        description="Review transactions that have been reported for suspected fraud and investigate them through the controlled fraud workflow."
      />

      <Alert
        severity="warning"
        sx={{
          borderRadius: 2,
          fontSize: 11,
        }}
      >
        A fraud report does not automatically
        declare a transaction fraudulent.
        Administration must investigate the
        report and determine the appropriate
        compliance or legal outcome.
      </Alert>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 950,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Customer',
                  'Reference',
                  'Type',
                  'Amount',
                  'Status',
                  'Date',
                  'Action',
                ].map(
                  (heading) => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          BRAND.muted,
                        textTransform:
                          'uppercase',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {fraudTransactions.map(
                (
                  transaction: any
                ) => (
                  <TableRow
                    hover
                    key={
                      transaction.id
                    }
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {transaction.full_name ||
                          'Unknown customer'}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {transaction.email ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {transaction.reference ||
                          transaction.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                        }}
                      >
                        {statusLabel(
                          transaction.type ||
                            'Transaction'
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {formatMoney(
                          transaction.amount,
                          transaction.currency ||
                            'NGN'
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label="Fraud Review"
                        color="warning"
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {formatDate(
                          transaction.created_at ||
                            transaction.createdAt
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={() =>
                          openTransaction(
                            transaction
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          fontWeight: 800,
                          color:
                            BRAND.green,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {fraudTransactions.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      py: 6,
                      color:
                        BRAND.muted,
                    }}
                  >
                    No fraud-review
                    transactions are
                    currently visible.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

/* ============================================================
   AUDIT LOGS
   ============================================================ */

const renderAuditLogs =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Risk & Compliance"
        title="Audit Logs"
        description="Immutable administrative activity records used to review sensitive actions and operational history."
      />

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 1.75,
          }}
        >
          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            spacing={1}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search action, administrator, target..."
              value={
                auditSearch
              }
              onChange={(
                event
              ) =>
                setAuditSearch(
                  event.target
                    .value
                )
              }
            />

            <TextField
              select
              size="small"
              label="Action"
              value={
                auditActionFilter
              }
              onChange={(
                event
              ) =>
                setAuditActionFilter(
                  event.target
                    .value
                )
              }
              sx={{
                minWidth: 160,
              }}
            >
              <MenuItem value="ALL">
                All actions
              </MenuItem>

              <MenuItem value="LOGIN">
                Login
              </MenuItem>

              <MenuItem value="UPDATE">
                Update
              </MenuItem>

              <MenuItem value="VERIFY">
                Verify
              </MenuItem>

              <MenuItem value="REJECT">
                Reject
              </MenuItem>

              <MenuItem value="SUSPEND">
                Suspend
              </MenuItem>

              <MenuItem value="FRAUD">
                Fraud
              </MenuItem>
            </TextField>

            <Button
              variant="contained"
              onClick={
                loadAuditLogs
              }
              disabled={
                auditLoading
              }
              sx={{
                backgroundColor:
                  BRAND.dark,
                '&:hover': {
                  backgroundColor:
                    BRAND.green,
                },
                textTransform:
                  'none',
                fontWeight: 800,
                minWidth: 105,
              }}
            >
              {auditLoading
                ? 'Loading...'
                : 'Refresh'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 1050,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Date',
                  'Administrator',
                  'Action',
                  'Target',
                  'Description',
                ].map(
                  (heading) => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          BRAND.muted,
                        textTransform:
                          'uppercase',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredAuditLogs.map(
                (
                  log
                ) => (
                  <TableRow
                    hover
                    key={
                      log.id
                    }
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          color:
                            BRAND.muted,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          log.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {log.actor_name ||
                          'System'}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {log.actor_role ||
                          log.actor_email ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          log.action ||
                          log.event ||
                          'Activity'
                        }
                        sx={{
                          height: 23,
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor:
                            BRAND.greenLight,
                          color:
                            BRAND.green,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {log.target_type ||
                          '—'}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {log.target_id ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          maxWidth: 420,
                        }}
                      >
                        {log.description ||
                          log.reason ||
                          'Administrative activity'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              )}

              {filteredAuditLogs.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{
                      py: 6,
                      color:
                        BRAND.muted,
                    }}
                  >
                    No audit records
                    found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

/* ============================================================
   COMPLIANCE
   ============================================================ */

const renderCompliance =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Risk & Compliance"
        title="Compliance"
        description="Monitor customer verification status and identify records requiring compliance attention."
      />

      <Grid
        container
        spacing={1.25}
      >
        <Grid
          item
          xs={6}
          md={3}
        >
          <RiskKpi
            label="Total Records"
            value={formatNumber(
              complianceSummary.total
            )}
            description="KYC records"
            icon={
              <ReceiptLong
                fontSize="small"
              />
            }
          />
        </Grid>

        <Grid
          item
          xs={6}
          md={3}
        >
          <RiskKpi
            label="Pending"
            value={formatNumber(
              complianceSummary.pending
            )}
            description="Require review"
            icon={
              <Autorenew
                fontSize="small"
              />
            }
          />
        </Grid>

        <Grid
          item
          xs={6}
          md={3}
        >
          <RiskKpi
            label="Approved"
            value={formatNumber(
              complianceSummary.approved
            )}
            description="Verified records"
            icon={
              <CheckCircle
                fontSize="small"
              />
            }
          />
        </Grid>

        <Grid
          item
          xs={6}
          md={3}
        >
          <RiskKpi
            label="Rejected"
            value={formatNumber(
              complianceSummary.rejected
            )}
            description="Rejected records"
            icon={
              <WarningAmber
                fontSize="small"
              />
            }
          />
        </Grid>
      </Grid>

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 1.75,
          }}
        >
          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            spacing={1}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search customer or email..."
              value={
                complianceSearch
              }
              onChange={(
                event
              ) =>
                setComplianceSearch(
                  event.target
                    .value
                )
              }
            />

            <TextField
              select
              size="small"
              label="Status"
              value={
                complianceFilter
              }
              onChange={(
                event
              ) =>
                setComplianceFilter(
                  event.target
                    .value
                )
              }
              sx={{
                minWidth: 160,
              }}
            >
              <MenuItem value="ALL">
                All statuses
              </MenuItem>

              <MenuItem value="PENDING">
                Pending
              </MenuItem>

              <MenuItem value="APPROVED">
                Approved
              </MenuItem>

              <MenuItem value="VERIFIED">
                Verified
              </MenuItem>

              <MenuItem value="REJECTED">
                Rejected
              </MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 850,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Customer',
                  'Email',
                  'Status',
                  'Record',
                  'Action',
                ].map(
                  (heading) => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          BRAND.muted,
                        textTransform:
                          'uppercase',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredComplianceRecords.map(
                (
                  record: any,
                  index
                ) => (
                  <TableRow
                    hover
                    key={
                      record.id ||
                      record.user_id ||
                      index
                    }
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {
                          record.customerName
                        }
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          color:
                            BRAND.muted,
                        }}
                      >
                        {
                          record.customerEmail
                        }
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          record.status
                        }
                        color={
                          record.status ===
                            'APPROVED' ||
                          record.status ===
                            'VERIFIED'
                            ? 'success'
                            : record.status ===
                              'REJECTED'
                            ? 'error'
                            : 'warning'
                        }
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                        }}
                      >
                        {record.kyc_type ||
                          record.type ||
                          'KYC Verification'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          if (
                            typeof openKycReview ===
                            'function'
                          ) {
                            openKycReview(
                              record
                            );
                          }
                        }}
                        sx={{
                          textTransform:
                            'none',
                          fontWeight: 800,
                          color:
                            BRAND.green,
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {filteredComplianceRecords.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{
                      py: 6,
                      color:
                        BRAND.muted,
                    }}
                  >
                    No compliance
                    records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

/* ============================================================
   RISK & COMPLIANCE SECTION ROUTER
   ============================================================ */

const renderRiskComplianceSection =
  () => {
    switch (section) {
      case 'fraud':
        return renderFraudCases();

      case 'audit-logs':
        if (
          auditLogs.length === 0 &&
          !auditLoading
        ) {
          loadAuditLogs();
        }

        return renderAuditLogs();

      case 'compliance':
        return renderCompliance();

      default:
        return renderFraudCases();
    }
  };
 /* ============================================================
   PART 6 — REVENUE & PROFIT
   ============================================================ */

/* ============================================================
   REVENUE TYPES
   ============================================================ */

type RevenuePeriod =
  | '7D'
  | '30D'
  | '90D'
  | 'YTD';

type RevenueRecord = {
  id: string;
  reference?: string;
  source?: string;
  customer_charge?: string | number;
  provider_cost?: string | number;
  zenimonies_revenue?: string | number;
  transaction_date?: string;
  status?: string;
};

type SettlementRecord = {
  id: string;
  reference?: string;
  amount?: string | number;
  currency?: string;
  destination?: string;
  status?: string;
  created_at?: string;
  completed_at?: string;
};

/* ============================================================
   REVENUE STATE
   ============================================================ */

const [
  revenuePeriod,
  setRevenuePeriod,
] = useState<RevenuePeriod>(
  '30D'
);

const [
  revenueSearch,
  setRevenueSearch,
] = useState('');

const [
  revenueRecords,
  setRevenueRecords,
] = useState<RevenueRecord[]>(
  []
);

const [
  settlementRecords,
  setSettlementRecords,
] = useState<
  SettlementRecord[]
>([]);

const [
  revenueTarget,
  setRevenueTarget,
] = useState<
  number | null
>(null);

const [
  revenueDataAvailable,
  setRevenueDataAvailable,
] =
  useState(false);

/* ============================================================
   REVENUE HELPERS
   ============================================================ */

const revenueValue = (
  value: unknown
): number => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
};

const calculateRevenuePerformance =
  (
    current: number,
    target: number
  ): number | null => {
    if (
      !Number.isFinite(target) ||
      target <= 0
    ) {
      return null;
    }

    return (
      ((current - target) /
        target) *
      100
    );
  };

/* ============================================================
   REVENUE SUMMARY
   ============================================================ */

const revenueSummary =
  useMemo(() => {
    const records =
      revenueRecords;

    const customerCharges =
      records.reduce(
        (
          total,
          record
        ) =>
          total +
          revenueValue(
            record.customer_charge
          ),
        0
      );

    const providerCosts =
      records.reduce(
        (
          total,
          record
        ) =>
          total +
          revenueValue(
            record.provider_cost
          ),
        0
      );

    const zenimoniesRevenue =
      records.reduce(
        (
          total,
          record
        ) =>
          total +
          revenueValue(
            record.zenimonies_revenue
          ),
        0
      );

    const netProfit =
      zenimoniesRevenue -
      providerCosts;

    const netMargin =
      zenimoniesRevenue >
      0
        ? (netProfit /
            zenimoniesRevenue) *
          100
        : 0;

    return {
      customerCharges,
      providerCosts,
      zenimoniesRevenue,
      netProfit,
      netMargin,
    };
  }, [
    revenueRecords,
  ]);

/* ============================================================
   REVENUE TARGET PERFORMANCE
   ============================================================ */

const revenueTargetPerformance =
  useMemo(() => {
    if (
      revenueTarget ===
        null ||
      revenueTarget <= 0
    ) {
      return null;
    }

    return calculateRevenuePerformance(
      revenueSummary.zenimoniesRevenue,
      revenueTarget
    );
  }, [
    revenueTarget,
    revenueSummary.zenimoniesRevenue,
  ]);

/* ============================================================
   FILTER REVENUE LEDGER
   ============================================================ */

const filteredRevenueRecords =
  useMemo(() => {
    const query =
      revenueSearch
        .trim()
        .toLowerCase();

    if (!query) {
      return revenueRecords;
    }

    return revenueRecords.filter(
      (record) =>
        String(
          record.reference ||
            ''
        )
          .toLowerCase()
          .includes(query) ||
        String(
          record.source ||
            ''
        )
          .toLowerCase()
          .includes(query)
    );
  }, [
    revenueRecords,
    revenueSearch,
  ]);

/* ============================================================
   REVENUE KPI
   ============================================================ */

const RevenueKpi = ({
  title,
  value,
  subtitle,
  positive,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) => (
  <Card
    sx={{
      ...pageCardSx,
      height: '100%',
    }}
  >
    <CardContent
      sx={{
        p: 1.75,
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          color:
            BRAND.muted,
          textTransform:
            'uppercase',
          letterSpacing:
            0.5,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          mt: 0.65,
          fontSize: 20,
          fontWeight: 850,
          color:
            positive === false
              ? '#B42318'
              : BRAND.text,
          whiteSpace:
            'nowrap',
        }}
      >
        {value}
      </Typography>

      <Typography
        sx={{
          mt: 0.35,
          fontSize: 10,
          color:
            BRAND.muted,
        }}
      >
        {subtitle}
      </Typography>
    </CardContent>
  </Card>
);

/* ============================================================
   REVENUE PERFORMANCE CHART
   ============================================================ */

const RevenuePerformanceChart =
  () => {
    const chartData =
      revenueRecords
        .slice(-12)
        .map(
          (
            record,
            index
          ) => ({
            index:
              index + 1,
            revenue:
              revenueValue(
                record.zenimonies_revenue
              ),
            provider:
              revenueValue(
                record.provider_cost
              ),
          })
        );

    const maximum =
      Math.max(
        ...chartData.map(
          (item) =>
            Math.max(
              item.revenue,
              item.provider
            )
        ),
        1
      );

    return (
      <Card
        sx={{
          ...pageCardSx,
          minHeight: 330,
        }}
      >
        <CardContent
          sx={{
            p: 2,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 850,
                  color:
                    BRAND.text,
                }}
              >
                Revenue, Margin & Profit
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: 10.5,
                  color:
                    BRAND.muted,
                }}
              >
                Revenue versus provider
                costs across the selected
                period.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={0.5}
            >
              {(
                [
                  '7D',
                  '30D',
                  '90D',
                  'YTD',
                ] as RevenuePeriod[]
              ).map(
                (period) => (
                  <Button
                    key={
                      period
                    }
                    size="small"
                    onClick={() =>
                      setRevenuePeriod(
                        period
                      )
                    }
                    sx={{
                      minWidth: 38,
                      px: 0.8,
                      borderRadius:
                        1.25,
                      textTransform:
                        'none',
                      fontSize: 9.5,
                      fontWeight: 800,
                      color:
                        revenuePeriod ===
                        period
                          ? BRAND.white
                          : BRAND.muted,
                      backgroundColor:
                        revenuePeriod ===
                        period
                          ? BRAND.dark
                          : '#F3F6F4',
                      '&:hover': {
                        backgroundColor:
                          revenuePeriod ===
                          period
                            ? BRAND.green
                            : '#EAF1ED',
                      },
                    }}
                  >
                    {period}
                  </Button>
                )
              )}
            </Stack>
          </Stack>

          {!revenueDataAvailable ||
          chartData.length ===
            0 ? (
            <Box
              sx={{
                minHeight: 230,
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              <Stack
                alignItems="center"
                spacing={1}
              >
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 900,
                    color:
                      '#AAB8B2',
                  }}
                >
                  —
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    color:
                      BRAND.text,
                  }}
                >
                  Revenue analytics
                  awaiting backend data
                </Typography>

                <Typography
                  sx={{
                    maxWidth: 390,
                    textAlign:
                      'center',
                    fontSize: 10.5,
                    lineHeight: 1.6,
                    color:
                      BRAND.muted,
                  }}
                >
                  No revenue, provider-cost
                  or profit figures are
                  fabricated. The chart will
                  use the ZENIMONIES revenue
                  ledger once its dedicated
                  backend analytics endpoint
                  is connected.
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Box
              sx={{
                mt: 3,
                height: 220,
                display: 'flex',
                alignItems:
                  'flex-end',
                gap: 1,
                overflowX:
                  'auto',
                px: 1,
              }}
            >
              {chartData.map(
                (item) => (
                  <Box
                    key={
                      item.index
                    }
                    sx={{
                      minWidth: 34,
                      height: '100%',
                      display: 'flex',
                      alignItems:
                        'flex-end',
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 13,
                        height: `${
                          (item.revenue /
                            maximum) *
                          100
                        }%`,
                        minHeight: 3,
                        borderRadius:
                          '4px 4px 0 0',
                        backgroundColor:
                          BRAND.green,
                      }}
                    />

                    <Box
                      sx={{
                        width: 13,
                        height: `${
                          (item.provider /
                            maximum) *
                          100
                        }%`,
                        minHeight: 3,
                        borderRadius:
                          '4px 4px 0 0',
                        backgroundColor:
                          '#B9C8C2',
                      }}
                    />
                  </Box>
                )
              )}
            </Box>
          )}

          <Stack
            direction="row"
            spacing={2}
            sx={{
              mt: 1.5,
            }}
          >
            <Stack
              direction="row"
              spacing={0.6}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius:
                    '50%',
                  backgroundColor:
                    BRAND.green,
                }}
              />

              <Typography
                sx={{
                  fontSize: 9.5,
                  color:
                    BRAND.muted,
                }}
              >
                ZENIMONIES revenue
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={0.6}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius:
                    '50%',
                  backgroundColor:
                    '#B9C8C2',
                }}
              />

              <Typography
                sx={{
                  fontSize: 9.5,
                  color:
                    BRAND.muted,
                }}
              >
                Provider cost
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

/* ============================================================
   REVENUE & PROFIT
   ============================================================ */

const renderRevenueProfit =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Revenue"
        title="Revenue & Profit"
        description="Separate customer charges, provider costs and ZENIMONIES revenue so operational revenue is not confused with customer funds."
      />

      <Grid
        container
        spacing={1.25}
      >
        <Grid
          item
          xs={6}
          md={3}
        >
          <RevenueKpi
            title="Customer Charges"
            value={formatMoney(
              revenueSummary.customerCharges,
              'NGN'
            )}
            subtitle="Charges collected from customers"
          />
        </Grid>

        <Grid
          item
          xs={6}
          md={3}
        >
          <RevenueKpi
            title="Provider Costs"
            value={formatMoney(
              revenueSummary.providerCosts,
              'NGN'
            )}
            subtitle="Costs payable to service providers"
          />
        </Grid>

        <Grid
          item
          xs={6}
          md={3}
        >
          <RevenueKpi
            title="ZENIMONIES Revenue"
            value={formatMoney(
              revenueSummary.zenimoniesRevenue,
              'NGN'
            )}
            subtitle="Recognised operational revenue"
          />
        </Grid>

        <Grid
          item
          xs={6}
          md={3}
        >
          <RevenueKpi
            title="Net Profit"
            value={formatMoney(
              revenueSummary.netProfit,
              'NGN'
            )}
            subtitle={`Net margin ${revenueSummary.netMargin.toFixed(
              2
            )}%`}
            positive={
              revenueSummary.netProfit >=
              0
            }
          />
        </Grid>
      </Grid>

      <Grid
        container
        spacing={1.5}
      >
        <Grid
          item
          xs={12}
          lg={8}
        >
          <RevenuePerformanceChart />
        </Grid>

        <Grid
          item
          xs={12}
          lg={4}
        >
          <Card
            sx={{
              ...pageCardSx,
              height: '100%',
            }}
          >
            <CardContent
              sx={{
                p: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 850,
                  color:
                    BRAND.text,
                }}
              >
                Monthly Target
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  fontSize: 10.5,
                  color:
                    BRAND.muted,
                }}
              >
                Revenue performance against
                the approved monthly target.
              </Typography>

              <Divider
                sx={{
                  my: 2,
                }}
              />

              <Stack spacing={1.5}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: 10,
                      color:
                        BRAND.muted,
                    }}
                  >
                    Current revenue
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 19,
                      fontWeight: 850,
                    }}
                  >
                    {formatMoney(
                      revenueSummary.zenimoniesRevenue,
                      'NGN'
                    )}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 10,
                      color:
                        BRAND.muted,
                    }}
                  >
                    Monthly target
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 19,
                      fontWeight: 850,
                    }}
                  >
                    {revenueTarget ===
                    null
                      ? 'Not configured'
                      : formatMoney(
                          revenueTarget,
                          'NGN'
                        )}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor:
                      BRAND.greenLight,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10,
                      color:
                        BRAND.muted,
                    }}
                  >
                    Performance
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: 22,
                      fontWeight: 900,
                      color:
                        revenueTargetPerformance ===
                        null
                          ? BRAND.muted
                          : revenueTargetPerformance >=
                            0
                          ? BRAND.green
                          : '#B42318',
                    }}
                  >
                    {revenueTargetPerformance ===
                    null
                      ? '—'
                      : `${
                          revenueTargetPerformance >=
                          0
                            ? '+'
                            : ''
                        }${revenueTargetPerformance.toFixed(
                          1
                        )}%`}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: 10,
                      color:
                        BRAND.muted,
                    }}
                  >
                    Compared with monthly
                    target
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!revenueDataAvailable && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            fontSize: 11,
          }}
        >
          Revenue analytics is intentionally
          showing zero/empty operational data
          until the dedicated revenue ledger
          backend is connected. This prevents
          customer funds, gross charges or
          provider costs from being incorrectly
          labelled as ZENIMONIES profit.
        </Alert>
      )}
    </Stack>
  );

/* ============================================================
   REVENUE LEDGER
   ============================================================ */

const renderRevenueLedger =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Revenue"
        title="Revenue Ledger"
        description="Track customer charges, provider costs and the resulting ZENIMONIES revenue for each service transaction."
      />

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 1.75,
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search revenue reference or source..."
            value={
              revenueSearch
            }
            onChange={(
              event
            ) =>
              setRevenueSearch(
                event.target
                  .value
              )
            }
          />
        </CardContent>
      </Card>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 1000,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Reference',
                  'Source',
                  'Customer Charge',
                  'Provider Cost',
                  'ZENIMONIES Revenue',
                  'Date',
                  'Status',
                ].map(
                  (heading) => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          BRAND.muted,
                        textTransform:
                          'uppercase',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredRevenueRecords.map(
                (
                  record
                ) => (
                  <TableRow
                    hover
                    key={
                      record.id
                    }
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {record.reference ||
                          record.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                        }}
                      >
                        {record.source ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {formatMoney(
                        record.customer_charge,
                        'NGN'
                      )}
                    </TableCell>

                    <TableCell>
                      {formatMoney(
                        record.provider_cost,
                        'NGN'
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 850,
                          color:
                            BRAND.green,
                        }}
                      >
                        {formatMoney(
                          record.zenimonies_revenue,
                          'NGN'
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        record.transaction_date
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          record.status ||
                          'Recorded'
                        }
                        sx={{
                          fontSize: 9.5,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              )}

              {filteredRevenueRecords.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      py: 7,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        color:
                          BRAND.text,
                      }}
                    >
                      Revenue ledger awaiting
                      backend data
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 10.5,
                        color:
                          BRAND.muted,
                      }}
                    >
                      No revenue records have
                      been supplied to this
                      dashboard yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

/* ============================================================
   SETTLEMENTS
   ============================================================ */

const renderSettlements =
  () => (
    <Stack spacing={2.25}>
      <SectionHeader
        eyebrow="Revenue"
        title="Settlements"
        description="Manage settlement visibility for ZENIMONIES company revenue. Customer balances are never used as company settlement funds."
      />

      <Alert
        severity="warning"
        sx={{
          borderRadius: 2,
          fontSize: 11,
        }}
      >
        Settlement activity must operate only
        against ZENIMONIES company/revenue
        funds. This area must never debit,
        transfer or withdraw money from a
        customer's account.
      </Alert>

      <Card sx={pageCardSx}>
        <CardContent
          sx={{
            p: 2,
          }}
        >
          <Stack spacing={1.25}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 850,
              }}
            >
              Settlement availability
            </Typography>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1.5}
            >
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor:
                    '#F6F8F7',
                  border:
                    `1px solid ${BRAND.border}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    color:
                      BRAND.muted,
                  }}
                >
                  Available revenue
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 19,
                    fontWeight: 850,
                  }}
                >
                  {formatMoney(
                    revenueSummary.zenimoniesRevenue,
                    'NGN'
                  )}
                </Typography>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor:
                    '#F6F8F7',
                  border:
                    `1px solid ${BRAND.border}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    color:
                      BRAND.muted,
                  }}
                >
                  Pending settlements
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 19,
                    fontWeight: 850,
                  }}
                >
                  {
                    settlementRecords.filter(
                      (
                        item
                      ) =>
                        String(
                          item.status ||
                            ''
                        ).toUpperCase() ===
                        'PENDING'
                    ).length
                  }
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={pageCardSx}>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 900,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Reference',
                  'Amount',
                  'Destination',
                  'Status',
                  'Created',
                  'Completed',
                ].map(
                  (heading) => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          BRAND.muted,
                        textTransform:
                          'uppercase',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {settlementRecords.map(
                (
                  settlement
                ) => (
                  <TableRow
                    hover
                    key={
                      settlement.id
                    }
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {settlement.reference ||
                          settlement.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {formatMoney(
                          settlement.amount,
                          settlement.currency ||
                            'NGN'
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                        }}
                      >
                        {settlement.destination ||
                          '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          settlement.status ||
                          'Pending'
                        }
                        sx={{
                          fontSize: 9.5,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        settlement.created_at
                      )}
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        settlement.completed_at
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}

              {settlementRecords.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{
                      py: 7,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        color:
                          BRAND.text,
                      }}
                    >
                      Settlement data
                      awaiting backend
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 10.5,
                        color:
                          BRAND.muted,
                      }}
                    >
                      No company revenue
                      settlement records have
                      been supplied yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

/* ============================================================
   REVENUE SECTION ROUTER
   ============================================================ */

const renderRevenueSection =
  () => {
    switch (section) {
      case 'revenue':
        return renderRevenueProfit();

      case 'revenue-ledger':
        return renderRevenueLedger();

      case 'settlements':
        return renderSettlements();

      default:
        return renderRevenueProfit();
    }
  };
  // ============================================================
// ZENIMONIES BANKING — PART 7
// ADMINISTRATION
// Administrators • Security • Settings
// ============================================================

type AdminRecord = {
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  last_login?: string;
  lastLogin?: string;
  created_at?: string;
  createdAt?: string;
};

type SecurityEvent = {
  id?: string;
  event_type?: string;
  event?: string;
  description?: string;
  severity?: string;
  created_at?: string;
  createdAt?: string;
};

const [adminRecords, setAdminRecords] = useState<AdminRecord[]>([]);
const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
const [administrationLoading, setAdministrationLoading] = useState(false);
const [adminSearch, setAdminSearch] = useState('');
const [adminStatusFilter, setAdminStatusFilter] = useState('all');

const getAdminRoleLabel = (role?: string) => {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'super_admin':
      return 'Super Administrator';
    case 'compliance':
      return 'Compliance';
    case 'finance':
      return 'Finance';
    case 'customer_care':
      return 'Customer Care';
    default:
      return role || 'Administrator';
  }
};

const getAdminStatusLabel = (status?: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'active') return 'Active';
  if (normalized === 'suspended') return 'Suspended';
  if (normalized === 'disabled') return 'Disabled';

  return status || 'Unknown';
};

const getAdminStatusClass = (status?: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'active') {
    return {
      background: '#E8F5EF',
      color: '#0B6B4F',
    };
  }

  if (normalized === 'suspended' || normalized === 'disabled') {
    return {
      background: '#FDECEC',
      color: '#B42318',
    };
  }

  return {
    background: '#F2F4F3',
    color: BRAND.muted,
  };
};

const formatAdminDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const filteredAdminRecords = useMemo(() => {
  const search = adminSearch.trim().toLowerCase();

  return adminRecords.filter((admin) => {
    const matchesSearch =
      !search ||
      String(admin.full_name || admin.name || '')
        .toLowerCase()
        .includes(search) ||
      String(admin.email || '')
        .toLowerCase()
        .includes(search) ||
      String(admin.role || '')
        .toLowerCase()
        .includes(search);

    const normalizedStatus = String(admin.status || '').toLowerCase();

    const matchesStatus =
      adminStatusFilter === 'all' ||
      normalizedStatus === adminStatusFilter;

    return matchesSearch && matchesStatus;
  });
});

const loadAdministrationData = async () => {
  try {
    setAdministrationLoading(true);

    const token = localStorage.getItem('adminToken');

    if (!token) {
      setAdminRecords([]);
      setSecurityEvents([]);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    /*
     * These endpoints are intentionally treated as optional here.
     * The Administration UI must not invent administrator/security
     * data if the backend has not exposed those endpoints yet.
     */

    try {
      const adminResponse = await fetch(
        `${API_BASE}/admin/administrators`,
        {
          headers,
        }
      );

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();

        setAdminRecords(
          Array.isArray(adminData)
            ? adminData
            : Array.isArray(adminData?.administrators)
            ? adminData.administrators
            : Array.isArray(adminData?.admins)
            ? adminData.admins
            : []
        );
      }
    } catch {
      setAdminRecords([]);
    }

    try {
      const securityResponse = await fetch(
        `${API_BASE}/admin/security/events`,
        {
          headers,
        }
      );

      if (securityResponse.ok) {
        const securityData = await securityResponse.json();

        setSecurityEvents(
          Array.isArray(securityData)
            ? securityData
            : Array.isArray(securityData?.events)
            ? securityData.events
            : Array.isArray(securityData?.security_events)
            ? securityData.security_events
            : []
        );
      }
    } catch {
      setSecurityEvents([]);
    }
  } finally {
    setAdministrationLoading(false);
  }
};

const renderAdministrationHeader = (
  title: string,
  description: string
) => {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        alignItems: {
          xs: 'flex-start',
          md: 'center',
        },
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: {
          xs: 'column',
          md: 'row',
        },
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: {
              xs: 22,
              md: 26,
            },
            fontWeight: 800,
            color: BRAND.text,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            color: BRAND.muted,
            fontSize: 14,
          }}
        >
          {description}
        </Typography>
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 0.8,
          borderRadius: 2,
          background: BRAND.greenLight,
          color: BRAND.green,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        ZENIMONIES ADMINISTRATION
      </Box>
    </Box>
  );
};

const renderAdministrators = () => {
  return (
    <Box>
      {renderAdministrationHeader(
        'Administrators',
        'Manage authorized ZENIMONIES administration accounts and access.'
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: `1px solid ${BRAND.border}`,
            borderRadius: 3,
            background: BRAND.white,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: BRAND.muted,
              fontWeight: 700,
            }}
          >
            ADMINISTRATORS
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 25,
              fontWeight: 800,
              color: BRAND.text,
            }}
          >
            {adminRecords.length}
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: `1px solid ${BRAND.border}`,
            borderRadius: 3,
            background: BRAND.white,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: BRAND.muted,
              fontWeight: 700,
            }}
          >
            ACTIVE
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 25,
              fontWeight: 800,
              color: BRAND.green,
            }}
          >
            {
              adminRecords.filter(
                (admin) =>
                  String(admin.status || '').toLowerCase() ===
                  'active'
              ).length
            }
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: `1px solid ${BRAND.border}`,
            borderRadius: 3,
            background: BRAND.white,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: BRAND.muted,
              fontWeight: 700,
            }}
          >
            SECURITY EVENTS
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 25,
              fontWeight: 800,
              color: BRAND.text,
            }}
          >
            {securityEvents.length}
          </Typography>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${BRAND.border}`,
          borderRadius: 3,
          overflow: 'hidden',
          background: BRAND.white,
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 1.5,
            flexDirection: {
              xs: 'column',
              md: 'row',
            },
          }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Search administrator..."
            value={adminSearch}
            onChange={(event) =>
              setAdminSearch(event.target.value)
            }
          />

          <TextField
            select
            size="small"
            value={adminStatusFilter}
            onChange={(event) =>
              setAdminStatusFilter(event.target.value)
            }
            sx={{
              minWidth: {
                xs: '100%',
                md: 170,
              },
            }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </TextField>
        </Box>

        <Divider />

        {administrationLoading ? (
          <Box
            sx={{
              p: 5,
              textAlign: 'center',
            }}
          >
            <CircularProgress
              size={26}
              sx={{ color: BRAND.green }}
            />
          </Box>
        ) : filteredAdminRecords.length === 0 ? (
          <Box
            sx={{
              p: 5,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                color: BRAND.text,
              }}
            >
              No administrator records available
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 13,
                color: BRAND.muted,
              }}
            >
              Administrator management will appear here once
              the administration API is connected.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Administrator</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredAdminRecords.map((admin, index) => {
                  const statusStyle =
                    getAdminStatusClass(admin.status);

                  return (
                    <TableRow key={admin.id || index}>
                      <TableCell>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: BRAND.text,
                          }}
                        >
                          {admin.full_name ||
                            admin.name ||
                            'Administrator'}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12,
                            color: BRAND.muted,
                          }}
                        >
                          {admin.email || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {getAdminRoleLabel(admin.role)}
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            px: 1,
                            py: 0.45,
                            borderRadius: 1.5,
                            background:
                              statusStyle.background,
                            color: statusStyle.color,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {getAdminStatusLabel(admin.status)}
                        </Box>
                      </TableCell>

                      <TableCell>
                        {formatAdminDate(
                          admin.last_login ||
                            admin.lastLogin
                        )}
                      </TableCell>

                      <TableCell>
                        {formatAdminDate(
                          admin.created_at ||
                            admin.createdAt
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const renderSecurity = () => {
  return (
    <Box>
      {renderAdministrationHeader(
        'Security',
        'Monitor administrator authentication, sessions and security controls.'
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            background: BRAND.white,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              color: BRAND.muted,
            }}
          >
            ADMIN 2FA
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: 18,
              fontWeight: 800,
              color: '#B54708',
            }}
          >
            Setup Required
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 12,
              color: BRAND.muted,
            }}
          >
            Backend-enforced TOTP will be connected in the
            security phase.
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            background: BRAND.white,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              color: BRAND.muted,
            }}
          >
            SESSION SECURITY
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: 18,
              fontWeight: 800,
              color: BRAND.green,
            }}
          >
            Protected
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 12,
              color: BRAND.muted,
            }}
          >
            Administrator sessions are protected by the
            existing server-side session middleware.
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            background: BRAND.white,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              color: BRAND.muted,
            }}
          >
            AUDIT TRAIL
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: 18,
              fontWeight: 800,
              color: BRAND.green,
            }}
          >
            Enabled
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 12,
              color: BRAND.muted,
            }}
          >
            Administrative activity should remain auditable.
          </Typography>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${BRAND.border}`,
          borderRadius: 3,
          background: BRAND.white,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            sx={{
              fontWeight: 800,
              color: BRAND.text,
            }}
          >
            Recent Security Events
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              fontSize: 13,
              color: BRAND.muted,
            }}
          >
            Authentication and administrative security activity.
          </Typography>
        </Box>

        <Divider />

        {securityEvents.length === 0 ? (
          <Box
            sx={{
              p: 5,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                color: BRAND.text,
              }}
            >
              No security events available
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 13,
                color: BRAND.muted,
              }}
            >
              Security events will appear here once the
              security-events backend is connected.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {securityEvents.map((event, index) => (
                  <TableRow key={event.id || index}>
                    <TableCell>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: BRAND.text,
                        }}
                      >
                        {event.event_type ||
                          event.event ||
                          'Security Event'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {event.description || '—'}
                    </TableCell>

                    <TableCell>
                      {event.severity || '—'}
                    </TableCell>

                    <TableCell>
                      {formatAdminDate(
                        event.created_at ||
                          event.createdAt
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const renderSettings = () => {
  return (
    <Box>
      {renderAdministrationHeader(
        'Settings',
        'Manage ZENIMONIES administration and operational configuration.'
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
          },
          gap: 2,
        }}
      >
        {[
          {
            title: 'Security Settings',
            description:
              'Administrator authentication, sessions, 2FA and security policies.',
          },
          {
            title: 'Transaction Controls',
            description:
              'Operational rules governing transaction review and approval workflows.',
          },
          {
            title: 'Service Configuration',
            description:
              'Configuration areas for airtime, bills, gift cards, POS and other services.',
          },
          {
            title: 'Revenue Configuration',
            description:
              'Fee, provider-cost, partner-share and revenue accounting configuration.',
          },
          {
            title: 'Notification Settings',
            description:
              'Administrative alerts, operational notifications and security alerts.',
          },
          {
            title: 'System Preferences',
            description:
              'General administration preferences and system-level configuration.',
          },
        ].map((item) => (
          <Paper
            key={item.title}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${BRAND.border}`,
              background: BRAND.white,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                color: BRAND.text,
              }}
            >
              {item.title}
            </Typography>

            <Typography
              sx={{
                mt: 0.7,
                fontSize: 13,
                lineHeight: 1.6,
                color: BRAND.muted,
              }}
            >
              {item.description}
            </Typography>

            <Button
              variant="outlined"
              size="small"
              sx={{
                mt: 2,
                borderColor: BRAND.border,
                color: BRAND.green,
                textTransform: 'none',
                fontWeight: 700,
              }}
              onClick={() =>
                setSuccessMessage(
                  `${item.title} will be connected to the backend configuration module.`
                )
              }
            >
              Configure
            </Button>
          </Paper>
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${BRAND.border}`,
          background: BRAND.greenLight,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            color: BRAND.green,
          }}
        >
          Administrative Security Boundary
        </Typography>

        <Typography
          sx={{
            mt: 0.7,
            fontSize: 13,
            lineHeight: 1.7,
            color: BRAND.text,
          }}
        >
          Administrator settings must never provide a mechanism
          to arbitrarily withdraw, transfer or debit customer
          funds. Customer balances remain protected by the
          financial ledger and backend authorization rules.
          Company revenue settlement is handled separately from
          customer funds.
        </Typography>
      </Paper>
    </Box>
  );
};

const renderAdministrationSection = () => {

  switch (section) {
    case 'administrators':
      return renderAdministrators();

    case 'security':
      return renderSecurity();

    case 'settings':
      return renderSettings();

    default:
      return renderAdministrators();
  }
};
  /* ============================================================
     RENDER SECTION
     ============================================================ */

  const renderSection = () => {
    switch (section) {
      
       case 'overview':
  return renderOverview();

case 'customers':
  return renderCustomers();

case 'accounts':
  return renderAccounts();

case 'kyc':
  return renderKyc();

case 'transactions':
case 'pending-transactions':
case 'bank-transfers':
case 'deposits':
case 'withdrawals':
  return renderFinancialSection();

case 'airtime':
case 'bills':
case 'giftcards':
case 'business':
case 'pos':
  return renderServicesSection();

case 'support':
case 'escalated':
case 'customer-care-agents':
  return renderCustomerCareSection();

case 'fraud':
case 'audit-logs':
case 'compliance':
  return renderRiskComplianceSection();
      
case 'revenue':
case 'revenue-ledger':
case 'settlements':
  return renderRevenueSection();

case 'administrators':
case 'security':
case 'settings':
  return renderAdministrationSection();
     
      default:
        return renderOverview();
    }
  };

  /* ============================================================
     SIDEBAR
     ============================================================ */

  const [expandedGroups, setExpandedGroups] =
    useState<Record<string, boolean>>(
      {
        Customers: true,
        Financial: true,
        Services: false,
        'Customer Care': false,
        'Risk & Compliance': false,
        Revenue: true,
        Administration: false,
      }
    );

  const toggleGroup = (
    group: string
  ) => {
    setExpandedGroups(
      (current) => ({
        ...current,
        [group]:
          !current[group],
      })
    );
  };

  const sidebar = (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor:
          BRAND.dark,
        color: '#FFFFFF',
      }}
    >
      {/* BRAND */}

      <Box
        sx={{
          px: 2,
          py: 2.2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.2}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                '#0F7A5B',
              boxShadow:
                '0 8px 22px rgba(0,0,0,0.18)',
            }}
          >
            <Wallet
              sx={{
                fontSize: 21,
                color: '#FFFFFF',
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 17,
                lineHeight: 1.1,
                fontWeight: 900,
                letterSpacing: 0.2,
              }}
            >
              ZENIMONIES
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                fontSize: 9,
                letterSpacing: 1.1,
                color:
                  'rgba(255,255,255,0.60)',
                fontWeight: 700,
              }}
            >
              ADMINISTRATION
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider
        sx={{
          borderColor:
            'rgba(255,255,255,0.09)',
        }}
      />

      {/* NAVIGATION */}

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1,
          py: 1,
          '&::-webkit-scrollbar': {
            width: 4,
          },
          '&::-webkit-scrollbar-thumb':
            {
              backgroundColor:
                'rgba(255,255,255,0.15)',
              borderRadius: 4,
            },
        }}
      >
        {NAVIGATION_GROUPS.map(
          (group) => {
            const isOverview =
              group.label ===
              'Overview';

            const expanded =
              expandedGroups[
                group.label
              ];

            return (
              <Box
                key={group.label}
                sx={{
                  mb: 0.65,
                }}
              >
                {!isOverview && (
                  <Button
                    fullWidth
                    onClick={() =>
                      toggleGroup(
                        group.label
                      )
                    }
                    endIcon={
                      expanded ? (
                        <ExpandLess />
                      ) : (
                        <ExpandMore />
                      )
                    }
                    sx={{
                      justifyContent:
                        'space-between',
                      px: 1.2,
                      py: 0.65,
                      color:
                        'rgba(255,255,255,0.45)',
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 0.9,
                      textTransform:
                        'uppercase',
                      '&:hover': {
                        backgroundColor:
                          'transparent',
                        color:
                          'rgba(255,255,255,0.75)',
                      },
                    }}
                  >
                    {group.label}
                  </Button>
                )}

                <Collapse
                  in={
                    isOverview ||
                    expanded
                  }
                  timeout="auto"
                  unmountOnExit={
                    !isOverview
                  }
                >
                  <List
                    disablePadding
                  >
                    {group.items.map(
                      (item) => {
                        const selected =
                          section ===
                          item.key;

                        return (
                          <ListItemButton
                            key={
                              item.key
                            }
                            selected={
                              selected
                            }
                            onClick={() =>
                              selectSection(
                                item.key
                              )
                            }
                            sx={{
                              minHeight: 40,
                              px: 1.2,
                              mb: 0.25,
                              borderRadius:
                                1.75,
                              color:
                                selected
                                  ? '#FFFFFF'
                                  : 'rgba(255,255,255,0.67)',
                              backgroundColor:
                                selected
                                  ? 'rgba(23,166,115,0.18)'
                                  : 'transparent',
                              borderLeft:
                                selected
                                  ? '3px solid #22B982'
                                  : '3px solid transparent',
                              '&:hover':
                                {
                                  backgroundColor:
                                    selected
                                      ? 'rgba(23,166,115,0.18)'
                                      : 'rgba(255,255,255,0.055)',
                                  color:
                                    '#FFFFFF',
                                },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 32,
                                color:
                                  'inherit',
                              }}
                            >
                              {React.cloneElement(
                                item.icon as React.ReactElement,
                                {
                                  fontSize:
                                    'small',
                                }
                              )}
                            </ListItemIcon>

                            <ListItemText
                              primary={
                                item.label
                              }
                              primaryTypographyProps={{
                                fontSize: 12,
                                fontWeight:
                                  selected
                                    ? 800
                                    : 600,
                              }}
                            />
                          </ListItemButton>
                        );
                      }
                    )}
                  </List>
                </Collapse>
              </Box>
            );
          }
        )}
      </Box>

      {/* ADMIN FOOTER */}

      <Divider
        sx={{
          borderColor:
            'rgba(255,255,255,0.09)',
        }}
      />

      <Box
        sx={{
          p: 1.2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1,
            py: 1,
            borderRadius: 2,
            backgroundColor:
              'rgba(255,255,255,0.045)',
          }}
        >
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: 11,
              fontWeight: 800,
              backgroundColor:
                '#0F7A5B',
            }}
          >
            A
          </Avatar>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Typography
              noWrap
              sx={{
                fontSize: 11,
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              Administrator
            </Typography>

            <Typography
              noWrap
              sx={{
                fontSize: 9,
                color:
                  'rgba(255,255,255,0.48)',
              }}
            >
              Secure session
            </Typography>
          </Box>

          <Tooltip title="Logout">
            <IconButton
              size="small"
              onClick={logout}
              sx={{
                color:
                  'rgba(255,255,255,0.65)',
                '&:hover': {
                  color: '#FFFFFF',
                },
              }}
            >
              <ChevronRight fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );

  /* ============================================================
     MAIN RETURN
     ============================================================ */

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor:
          BRAND.background,
      }}
    >
      {/* MOBILE DRAWER */}

      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() =>
            setMobileDrawerOpen(false)
          }
          PaperProps={{
            sx: {
              width: DRAWER_WIDTH,
              backgroundColor:
                BRAND.dark,
            },
          }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* DESKTOP SIDEBAR */}

      {!isMobile && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            zIndex: 1200,
          }}
        >
          {sidebar}
        </Box>
      )}

      {/* WORKSPACE */}

      <Box
        sx={{
          ml: {
            xs: 0,
            md: `${DRAWER_WIDTH}px`,
          },
          minHeight: '100vh',
        }}
      >
        {/* TOP BAR */}

        <Box
          sx={{
            height: {
              xs: 64,
              md: 68,
            },
            display: 'flex',
            alignItems: 'center',
            borderBottom:
              `1px solid ${BRAND.border}`,
            backgroundColor:
              'rgba(255,255,255,0.94)',
            backdropFilter:
              'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          <Toolbar
            sx={{
              width: '100%',
              minHeight:
                'inherit !important',
              px: {
                xs: 1.5,
                sm: 2.5,
              },
              gap: 1.5,
            }}
          >
            {isMobile && (
              <IconButton
                onClick={() =>
                  setMobileDrawerOpen(
                    true
                  )
                }
                sx={{
                  color:
                    BRAND.text,
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Box
              sx={{
                flex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: BRAND.text,
                }}
              >
                {section ===
                'overview'
                  ? 'Overview'
                  : NAVIGATION_GROUPS
                      .flatMap(
                        (group) =>
                          group.items
                      )
                      .find(
                        (item) =>
                          item.key ===
                          section
                      )?.label ||
                    'Administration'}
              </Typography>

              <Typography
                sx={{
                  display: {
                    xs: 'none',
                    sm: 'block',
                  },
                  fontSize: 10,
                  color:
                    BRAND.muted,
                }}
              >
                ZENIMONIES secure
                operations workspace
              </Typography>
            </Box>

            <Tooltip title="Notifications">
              <IconButton
                sx={{
                  color:
                    BRAND.muted,
                }}
              >
                <NotificationsNone />
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                width: 1,
                height: 28,
                backgroundColor:
                  BRAND.border,
                mx: 0.5,
              }}
            />

            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 11,
                fontWeight: 800,
                backgroundColor:
                  BRAND.green,
              }}
            >
              A
            </Avatar>
          </Toolbar>
        </Box>

        {/* ALERTS */}

        <Box
          sx={{
            px: {
              xs: 1.5,
              sm: 2.5,
            },
            pt: 1.5,
          }}
        >
          {error && (
            <Alert
              severity="error"
              onClose={() =>
                setError('')
              }
              sx={{
                mb: 1.5,
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              onClose={() =>
                setSuccess('')
              }
              sx={{
                mb: 1.5,
                borderRadius: 2,
              }}
            >
              {success}
            </Alert>
          )}
        </Box>

        {/* PAGE */}

        <Box
          component="main"
          sx={{
            px: {
              xs: 1.5,
              sm: 2.5,
              lg: 3,
            },
            py: {
              xs: 2,
              md: 2.75,
            },
            maxWidth: 1600,
            mx: 'auto',
          }}
        >
          {loading &&
          !dashboard ? (
            <Box
              sx={{
                minHeight: 500,
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              <Stack
                alignItems="center"
                spacing={1.5}
              >
                <CircularProgress
                  size={30}
                  thickness={4}
                  sx={{
                    color:
                      BRAND.green,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 12,
                    color:
                      BRAND.muted,
                  }}
                >
                  Loading ZENIMONIES
                  Administration...
                </Typography>
              </Stack>
            </Box>
          ) : (
            renderSection()
          )}
        </Box>
      </Box>

      {/* TRANSACTION DETAILS */}

      {renderTransactionPanel()}
    </Box>
  );
};

export default AdminDashboard;
