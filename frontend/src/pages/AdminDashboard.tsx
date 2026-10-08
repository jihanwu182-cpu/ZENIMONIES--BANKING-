import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {
  AccountBalance,
  AccountBalanceWallet,
  AdminPanelSettings,
  ArrowDownward,
  ArrowUpward,
  Assessment,
  Badge as BadgeIcon,
  Business,
  CardGiftcard,
  CheckCircle,
  ChevronRight,
  Close,
  Dashboard as DashboardIcon,
  Description,
  ErrorOutline,
  ExpandMore,
  Fingerprint,
  Flag,
  Groups,
  HealthAndSafety,
  History,
  KeyboardArrowDown,
  KeyboardArrowUp,
  LocalAtm,
  Lock,
  Logout,
  Menu as MenuIcon,
  MoreHoriz,
  NotificationsNone,
  Payments,
  Person,
  PhoneAndroid,
  ReceiptLong,
  Refresh,
  ReportProblem,
  Search,
  Security,
  Settings,
  SupportAgent,
  SwapHoriz,
  SyncAlt,
  TrendingUp,
  VerifiedUser,
  Visibility,
  WarningAmber,
  Wifi,
  Work,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

/* ============================================================
   ZENIMONIES BANKING — ADMINISTRATION
   Premium Banking Operations Console
   ============================================================ */

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const SIDEBAR_WIDTH = 255;

/* ============================================================
   DESIGN TOKENS
   ============================================================ */

const ZENIMONIES = {
  green: '#0B6B4F',
  greenDark: '#07523D',
  greenDeep: '#043C2D',
  greenLight: '#EAF7F2',
  greenSoft: '#F2FAF7',

  background: '#F6F8F7',
  surface: '#FFFFFF',
  border: '#E5EAE7',

  text: '#15231D',
  textSecondary: '#66756E',
  textMuted: '#8B9892',

  danger: '#C62828',
  dangerSoft: '#FDEEEE',

  warning: '#B77900',
  warningSoft: '#FFF7E5',

  blue: '#2563EB',
  blueSoft: '#EEF4FF',

  purple: '#6D4AFF',
  purpleSoft: '#F2EFFF',

  shadow:
    '0 8px 30px rgba(14, 35, 27, 0.06)',
};

/* ============================================================
   TYPES
   ============================================================ */

interface DashboardData {
  users: {
    total: number;
    active: number;
  };

  kyc: {
    pending: number;
    approved: number;
    rejected: number;
  };

  deposits: {
    count: number;
    total_amount: string | number;
  };

  withdrawals: {
    count: number;
    total_amount: string | number;
  };

  transfers: {
    count: number;
    total_amount: string | number;
  };

  transactions: {
    pending: number;
    failed: number;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  kyc_status: string;
  kyc_tier: number;

  bvn_verified: boolean;
  id_verified: boolean;
  tier_3_verified: boolean;
  is_verified: boolean;

  account_limit: string | number;
  daily_transfer_limit: string | number;
  daily_transfer_used: string | number;

  created_at: string;
  updated_at: string;
}

interface KycRecord {
  id: string;
  user_id: string;

  full_name: string;
  email: string;
  phone: string;

  kyc_tier: number;

  bvn?: string | null;
  bvn_verification_status: string;
  bvn_verified_at: string | null;
  bvn_rejection_reason?: string | null;

  document_type: string | null;
  document_number: string | null;

  document_front_url?: string | null;
  document_back_url?: string | null;
  selfie_url?: string | null;

  id_verification_status: string;
  id_verified_at: string | null;
  id_rejection_reason?: string | null;

  tier_3_method: string | null;
  tier_3_document_url?: string | null;
  tier_3_verification_status: string;
  tier_3_verified_at: string | null;
  tier_3_rejection_reason?: string | null;

  liveness_status?: string | null;
  liveness_verified_at?: string | null;

  verification_status: string;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;
}

/* ============================================================
   TRANSACTION
   ============================================================ */

interface Transaction {
  id: string;
  account_id: string;

  account_number: string;

  full_name: string;
  email: string;

  type: string;

  amount: string | number;
  currency: string;

  reference: string;
  description: string | null;

  status: string;

  balance_before: string | number | null;
  balance_after: string | number | null;

  created_at: string;
}

/* ============================================================
   FULL TRANSACTION DETAIL
   ============================================================ */

interface TransactionDetail extends Transaction {
  customer?: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    kyc_status?: string;
    status?: string;
  };

  account?: {
    id?: string;
    account_number?: string;
    account_type?: string;
    currency?: string;
    status?: string;
  };

  provider_reference?: string | null;
  failure_reason?: string | null;
  completed_at?: string | null;

  beneficiary?: {
    full_name?: string | null;
    account_number?: string | null;
    bank_name?: string | null;
    bank_code?: string | null;
    account_type?: string | null;
    amount?: string | number | null;
    currency?: string | null;
    narration?: string | null;
    transfer_reference?: string | null;
    provider_reference?: string | null;
    status?: string | null;
    created_at?: string | null;
    processed_at?: string | null;
    completed_at?: string | null;
    failure_reason?: string | null;
  };

  source?: {
    name?: string | null;
    account_number?: string | null;
    bank_name?: string | null;
  };

  related_transactions?: Transaction[];

  timeline?: {
    id?: string;
    event?: string;
    status?: string;
    description?: string;
    created_at?: string;
  }[];
}

/* ============================================================
   CUSTOMER CARE
   ============================================================ */

interface SupportTicket {
  id: string;
  ticket_number: string;

  user_id: string;

  category_id?: string | null;
  category_name?: string | null;

  subject: string;
  description: string;

  status: string;
  priority: string;

  transaction_id?: string | null;

  assigned_to?: string | null;
  assigned_agent_name?: string | null;

  escalated_to_admin?: boolean;
  escalated_at?: string | null;
  escalated_by?: string | null;
  escalated_by_name?: string | null;
  escalation_reason?: string | null;

  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  admin_taken_at?: string | null;

  created_at: string;
  updated_at: string;

  resolved_at?: string | null;
  closed_at?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_kyc_status?: string | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;

  sender_user_id?: string | null;
  sender_type: string;

  message: string;

  created_at: string;

  sender_name?: string | null;
  sender_email?: string | null;
}

interface SupportEvent {
  id: string;
  ticket_id: string;

  event_type: string;

  old_value?: string | null;
  new_value?: string | null;

  created_at: string;

  actor_name?: string | null;
  actor_role?: string | null;

  note?: string | null;
}

interface SupportTransaction {
  id: string;
  reference?: string | null;
  type?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface SupportTicketDetails {
  ticket: SupportTicket;
  messages: SupportMessage[];
  events: SupportEvent[];

  transaction?: SupportTransaction | null;
}

/* ============================================================
   ADMIN / FINANCE TYPES
   ============================================================ */

interface FinancialRecord {
  id: string;
  reference?: string | null;

  account_id?: string | null;
  account_number?: string | null;

  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;

  amount?: string | number | null;
  currency?: string | null;

  method?: string | null;
  type?: string | null;

  status?: string | null;

  provider_reference?: string | null;
  failure_reason?: string | null;

  created_at?: string | null;
  processed_at?: string | null;
  completed_at?: string | null;
}

interface FraudCase {
  id: string;
  case_number: string;

  transaction_id: string;

  reported_by: string;
  customer_user_id: string;

  reason: string;

  status: string;

  investigation_notes?: string | null;

  assigned_admin_id?: string | null;

  compliance_status: string;
  legal_status: string;

  resolved_at?: string | null;

  created_at: string;
  updated_at: string;
}

interface RevenueRecord {
  id: string;
  reference?: string | null;

  source?: string | null;

  customer_charge?: string | number | null;
  provider_cost?: string | number | null;
  zenimonies_revenue?: string | number | null;

  transaction_reference?: string | null;

  created_at?: string | null;
}

interface AuditLog {
  id: string;
  action: string;

  actor_id?: string | null;
  actor_name?: string | null;

  entity_type?: string | null;
  entity_id?: string | null;

  details?: string | null;

  created_at: string;
}

/* ============================================================
   KYC
   ============================================================ */

type KycType = 'bvn' | 'tier2' | 'tier3';

type KycDecision = 'verify' | 'reject';

/* ============================================================
   ADMIN SECTIONS
   ============================================================ */

type Section =
  | 'overview'

  | 'customers'
  | 'accounts'
  | 'kyc'

  | 'transactions'
  | 'pending-transactions'
  | 'transfers'
  | 'deposits'
  | 'withdrawals'

  | 'bills'
  | 'airtime'
  | 'giftcards'

  | 'business'
  | 'pos'

  | 'support'
  | 'escalated-cases'
  | 'customer-care-agents'

  | 'fraud'
  | 'audit'
  | 'compliance'

  | 'revenue'
  | 'revenue-ledger'
  | 'settlements'

  | 'administrators'
  | 'security'
  | 'settings';

/* ============================================================
   AUTH
   ============================================================ */

const getAdminToken = (): string | null => {
  return localStorage.getItem('adminToken');
};

/* ============================================================
   PREMIUM NAVIGATION
   ============================================================ */

interface NavigationItem {
  key: Section;
  label: string;
  icon: React.ReactNode;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      {
        key: 'overview',
        label: 'Dashboard',
        icon: <DashboardIcon fontSize="small" />,
      },
    ],
  },

  {
    title: 'CUSTOMERS',
    items: [
      {
        key: 'customers',
        label: 'Customers',
        icon: <Groups fontSize="small" />,
      },
      {
        key: 'accounts',
        label: 'Accounts',
        icon: <AccountBalanceWallet fontSize="small" />,
      },
      {
        key: 'kyc',
        label: 'KYC & Verification',
        icon: <VerifiedUser fontSize="small" />,
      },
    ],
  },

  {
    title: 'FINANCIAL',
    items: [
      {
        key: 'transactions',
        label: 'Transactions',
        icon: <SwapHoriz fontSize="small" />,
      },
      {
        key: 'pending-transactions',
        label: 'Pending Transactions',
        icon: <SyncAlt fontSize="small" />,
      },
      {
        key: 'transfers',
        label: 'Bank Transfers',
        icon: <AccountBalance fontSize="small" />,
      },
      {
        key: 'deposits',
        label: 'Deposits',
        icon: <ArrowDownward fontSize="small" />,
      },
      {
        key: 'withdrawals',
        label: 'Withdrawals',
        icon: <ArrowUpward fontSize="small" />,
      },
    ],
  },

  {
    title: 'SERVICES',
    items: [
      {
        key: 'airtime',
        label: 'Airtime & Data',
        icon: <Wifi fontSize="small" />,
      },
      {
        key: 'bills',
        label: 'Bills',
        icon: <ReceiptLong fontSize="small" />,
      },
      {
        key: 'giftcards',
        label: 'Gift Cards',
        icon: <CardGiftcard fontSize="small" />,
      },
      {
        key: 'business',
        label: 'Business Banking',
        icon: <Business fontSize="small" />,
      },
      {
        key: 'pos',
        label: 'POS',
        icon: <PhoneAndroid fontSize="small" />,
      },
    ],
  },

  {
    title: 'CUSTOMER CARE',
    items: [
      {
        key: 'support',
        label: 'Support Cases',
        icon: <SupportAgent fontSize="small" />,
      },
      {
        key: 'escalated-cases',
        label: 'Escalated Cases',
        icon: <Flag fontSize="small" />,
      },
      {
        key: 'customer-care-agents',
        label: 'Customer Care Agents',
        icon: <Person fontSize="small" />,
      },
    ],
  },

  {
    title: 'RISK & COMPLIANCE',
    items: [
      {
        key: 'fraud',
        label: 'Fraud Cases',
        icon: <ReportProblem fontSize="small" />,
      },
      {
        key: 'audit',
        label: 'Audit Logs',
        icon: <History fontSize="small" />,
      },
      {
        key: 'compliance',
        label: 'Compliance',
        icon: <HealthAndSafety fontSize="small" />,
      },
    ],
  },

  {
    title: 'REVENUE',
    items: [
      {
        key: 'revenue',
        label: 'Revenue & Profit',
        icon: <TrendingUp fontSize="small" />,
      },
      {
        key: 'revenue-ledger',
        label: 'Revenue Ledger',
        icon: <LocalAtm fontSize="small" />,
      },
      {
        key: 'settlements',
        label: 'Settlements',
        icon: <Payments fontSize="small" />,
      },
    ],
  },

  {
    title: 'ADMINISTRATION',
    items: [
      {
        key: 'administrators',
        label: 'Administrators',
        icon: <AdminPanelSettings fontSize="small" />,
      },
      {
        key: 'security',
        label: 'Security',
        icon: <Security fontSize="small" />,
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: <Settings fontSize="small" />,
      },
    ],
  },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const theme = useTheme();

  const isMobile = useMediaQuery(
    theme.breakpoints.down('md')
  );

  const [section, setSection] =
    useState<Section>('overview');

  const [mobileDrawerOpen, setMobileDrawerOpen] =
    useState(false);

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [users, setUsers] =
    useState<User[]>([]);

  const [kycRecords, setKycRecords] =
    useState<KycRecord[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  /* ============================================================
     TRANSACTION DETAIL
     ============================================================ */

  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionDetail | null>(null);

  const [transactionDialogOpen, setTransactionDialogOpen] =
    useState(false);

  const [transactionLoading, setTransactionLoading] =
    useState(false);

  const [transactionSearch, setTransactionSearch] =
    useState('');

  const [transactionStatusFilter, setTransactionStatusFilter] =
    useState('all');

  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState('all');

  /* ============================================================
     WITHDRAWAL STATE
     ============================================================ */

  const [withdrawals, setWithdrawals] =
    useState<FinancialRecord[]>([]);

  const [withdrawalLoading, setWithdrawalLoading] =
    useState(false);

  const [withdrawalSearch, setWithdrawalSearch] =
    useState('');

  const [withdrawalStatusFilter, setWithdrawalStatusFilter] =
    useState('all');

  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<FinancialRecord | null>(null);

  const [withdrawalDialogOpen, setWithdrawalDialogOpen] =
    useState(false);

  /* ============================================================
     DEPOSIT STATE
     ============================================================ */

  const [deposits, setDeposits] =
    useState<FinancialRecord[]>([]);

  const [depositLoading, setDepositLoading] =
    useState(false);

  const [depositSearch, setDepositSearch] =
    useState('');

  const [depositStatusFilter, setDepositStatusFilter] =
    useState('all');

  /* ============================================================
     KYC STATE
     ============================================================ */

  const [selectedKyc, setSelectedKyc] =
    useState<KycRecord | null>(null);

  const [reviewOpen, setReviewOpen] =
    useState(false);

  const [rejectOpen, setRejectOpen] =
    useState(false);

  const [selectedType, setSelectedType] =
    useState<KycType | null>(null);

  const [rejectionReason, setRejectionReason] =
    useState('');

  const [decisionMessage, setDecisionMessage] =
    useState('');

  /* ============================================================
     CUSTOMER CARE STATE
     ============================================================ */

  const [supportTickets, setSupportTickets] =
    useState<SupportTicket[]>([]);

  const [supportLoading, setSupportLoading] =
    useState(false);

  const [supportSearch, setSupportSearch] =
    useState('');

  const [supportStatusFilter, setSupportStatusFilter] =
    useState('all');

  const [supportPriorityFilter, setSupportPriorityFilter] =
    useState('all');

  const [selectedSupportTicket, setSelectedSupportTicket] =
    useState<SupportTicketDetails | null>(null);

  const [supportDialogOpen, setSupportDialogOpen] =
    useState(false);

  const [supportReply, setSupportReply] =
    useState('');

  const [supportReplyLoading, setSupportReplyLoading] =
    useState(false);

  const [supportActionLoading, setSupportActionLoading] =
    useState(false);

  /* ============================================================
     ESCALATED CASES
     ============================================================ */

  const [escalatedTickets, setEscalatedTickets] =
    useState<SupportTicket[]>([]);

  const [escalationLoading, setEscalationLoading] =
    useState(false);

  const [escalationSearch, setEscalationSearch] =
    useState('');

  const [selectedEscalatedTicket, setSelectedEscalatedTicket] =
    useState<SupportTicketDetails | null>(null);

  const [escalationDialogOpen, setEscalationDialogOpen] =
    useState(false);

  const [escalationActionLoading, setEscalationActionLoading] =
    useState(false);

  const [adminReply, setAdminReply] =
    useState('');

  const [adminReplyLoading, setAdminReplyLoading] =
    useState(false);

  /* ============================================================
     TOKEN / HEADERS
     ============================================================ */

  const token = getAdminToken();

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  /* ============================================================
     AUTH CHECK
     ============================================================ */

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', {
        replace: true,
      });
    }
  }, [navigate, token]);

  /* ============================================================
     NAVIGATION
     ============================================================ */

  const handleNavigation = (
    nextSection: Section
  ) => {
    setSection(nextSection);

    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      'adminToken'
    );

    localStorage.removeItem(
      'admin'
    );

    navigate('/admin/login', {
      replace: true,
    });
  };

  /* ============================================================
     FORMATTING
     ============================================================ */

  const formatMoney = (
    value: string | number | null | undefined,
    currency = 'NGN'
  ) => {
    const numericValue =
      Number(value || 0);

    return new Intl.NumberFormat(
      'en-NG',
      {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(numericValue);
  };

  const formatDate = (
    value: string | null | undefined
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—';
    }

    return date.toLocaleString(
      'en-NG',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );
  };

  const getSectionTitle = () => {
    for (const group of NAVIGATION_GROUPS) {
      const item =
        group.items.find(
          navigationItem =>
            navigationItem.key ===
            section
        );

      if (item) {
        return item.label;
      }
    }

    return 'Dashboard';
  };

  /* ============================================================
     STATUS HELPERS
     ============================================================ */

  const statusColor = (
    status?: string | null
  ) => {
    const normalized =
      String(status || '')
        .toLowerCase();

    if (
      [
        'completed',
        'approved',
        'verified',
        'active',
        'resolved',
        'success',
        'successful',
      ].includes(normalized)
    ) {
      return {
        background:
          '#EAF7F2',
        color:
          ZENIMONIES.green,
      };
    }

    if (
      [
        'pending',
        'processing',
        'waiting',
        'under_review',
        'review',
      ].includes(normalized)
    ) {
      return {
        background:
          ZENIMONIES.warningSoft,
        color:
          ZENIMONIES.warning,
      };
    }

    if (
      [
        'failed',
        'rejected',
        'blocked',
        'suspended',
        'fraud',
      ].includes(normalized)
    ) {
      return {
        background:
          ZENIMONIES.dangerSoft,
        color:
          ZENIMONIES.danger,
      };
    }

    return {
      background:
        '#F0F2F1',
      color:
        ZENIMONIES.textSecondary,
    };
  };

  const StatusChip = ({
    status,
  }: {
    status?: string | null;
  }) => {
    const colors =
      statusColor(status);

    return (
      <Chip
        size="small"
        label={
          String(
            status || 'Unknown'
          )
            .replaceAll('_', ' ')
            .replace(/\b\w/g, char =>
              char.toUpperCase()
            )
        }
        sx={{
          backgroundColor:
            colors.background,
          color:
            colors.color,
          fontWeight: 700,
          borderRadius: '7px',
          height: 28,
          '& .MuiChip-label': {
            px: 1.25,
          },
        }}
      />
    );
  };

  /* ============================================================
     PREMIUM CARD
     ============================================================ */

  const AdminCard = ({
    children,
    sx,
  }: {
    children: React.ReactNode;
    sx?: any;
  }) => (
    <Card
      elevation={0}
      sx={{
        border:
          `1px solid ${ZENIMONIES.border}`,
        borderRadius: 3,
        background:
          ZENIMONIES.surface,
        boxShadow:
          ZENIMONIES.shadow,
        ...sx,
      }}
    >
      {children}
    </Card>
  );

  /* ============================================================
     KPI CARD
     ============================================================ */

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    loading: cardLoading,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: string;
    loading?: boolean;
  }) => (
    <AdminCard
      sx={{
        height: '100%',
      }}
    >
      <CardContent
        sx={{
          p: 2.25,
          '&:last-child': {
            pb: 2.25,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color:
                  ZENIMONIES.textMuted,
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.06em',
              }}
            >
              {title}
            </Typography>

            {cardLoading ? (
              <SkeletonText />
            ) : (
              <Typography
                sx={{
                  mt: 0.75,
                  fontSize: {
                    xs: 22,
                    sm: 25,
                  },
                  fontWeight: 800,
                  color:
                    ZENIMONIES.text,
                  letterSpacing:
                    '-0.02em',
                }}
              >
                {value}
              </Typography>
            )}

            {subtitle && (
              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: 12,
                  color:
                    ZENIMONIES.textSecondary,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              background:
                ZENIMONIES.greenLight,
              color:
                ZENIMONIES.green,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>

        {trend && (
          <Typography
            sx={{
              mt: 1.5,
              fontSize: 12,
              fontWeight: 700,
              color:
                ZENIMONIES.green,
            }}
          >
            {trend}
          </Typography>
        )}
      </CardContent>
    </AdminCard>
  );

  /* ============================================================
     SKELETON TEXT
     ============================================================ */

  const SkeletonText = () => (
    <Box
      sx={{
        width: 120,
        height: 29,
        mt: 0.75,
        borderRadius: 1,
        background:
          'linear-gradient(90deg,#eef2f0,#f7f9f8,#eef2f0)',
      }}
    />
  );

  /* ============================================================
     SMALL GREEN OPERATIONS CARD
     ============================================================ */

  const OperationsStatusCard = () => (
    <Card
      elevation={0}
      sx={{
        mb: 2.5,
        borderRadius: 3,
        background:
          `linear-gradient(135deg, ${ZENIMONIES.green}, ${ZENIMONIES.greenDark})`,
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <CardContent
        sx={{
          py: 1.75,
          px: {
            xs: 2,
            md: 2.5,
          },
          '&:last-child': {
            pb: 1.75,
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
          gap={1.5}
        >
          <Stack
            direction="row"
            alignItems="center"
            gap={1.25}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background:
                  'rgba(255,255,255,.14)',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              <CheckCircle
                sx={{
                  fontSize: 18,
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                ZENIMONIES Operations
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  opacity: 0.78,
                }}
              >
                Banking administration
                environment
              </Typography>
            </Box>
          </Stack>

          <Chip
            icon={
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius:
                    '50%',
                  background:
                    '#A7F3D0',
                }}
              />
            }
            label="All systems operational"
            size="small"
            sx={{
              color: '#fff',
              background:
                'rgba(255,255,255,.12)',
              border:
                '1px solid rgba(255,255,255,.16)',
              fontWeight: 700,
              '& .MuiChip-icon': {
                ml: 1,
              },
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );

  /* ============================================================
     SIDEBAR
     ============================================================ */

  const SidebarContent = () => (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          `linear-gradient(180deg, ${ZENIMONIES.greenDeep} 0%, ${ZENIMONIES.greenDark} 100%)`,
        color: '#fff',
      }}
    >
      {/* BRAND */}

      <Box
        sx={{
          px: 2.25,
          pt: 2.25,
          pb: 2,
          borderBottom:
            '1px solid rgba(255,255,255,.08)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1.25}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              background:
                'rgba(255,255,255,.12)',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              border:
                '1px solid rgba(255,255,255,.12)',
            }}
          >
            <AccountBalance
              sx={{
                fontSize: 20,
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 17,
                letterSpacing:
                  '-0.02em',
              }}
            >
              ZENIMONIES
            </Typography>

            <Typography
              sx={{
                fontSize: 10,
                opacity: 0.65,
                letterSpacing:
                  '0.12em',
                textTransform:
                  'uppercase',
              }}
            >
              Banking Administration
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* NAVIGATION */}

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.25,
          py: 1.5,

          '&::-webkit-scrollbar': {
            width: 4,
          },

          '&::-webkit-scrollbar-thumb': {
            background:
              'rgba(255,255,255,.15)',
            borderRadius: 10,
          },
        }}
      >
        {NAVIGATION_GROUPS.map(
          group => (
            <Box
              key={group.title}
              sx={{
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  px: 1.25,
                  mb: 0.6,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing:
                    '0.13em',
                  color:
                    'rgba(255,255,255,.38)',
                }}
              >
                {group.title}
              </Typography>

              <List
                disablePadding
              >
                {group.items.map(
                  item => {
                    const active =
                      section ===
                      item.key;

                    return (
                      <ListItemButton
                        key={
                          item.key
                        }
                        selected={
                          active
                        }
                        onClick={() =>
                          handleNavigation(
                            item.key
                          )
                        }
                        sx={{
                          minHeight: 39,
                          mb: 0.25,
                          px: 1.25,
                          borderRadius: 1.75,
                          color:
                            active
                              ? '#fff'
                              : 'rgba(255,255,255,.68)',

                          '&.Mui-selected':
                            {
                              background:
                                'rgba(255,255,255,.12)',
                              color:
                                '#fff',
                            },

                          '&.Mui-selected:hover':
                            {
                              background:
                                'rgba(255,255,255,.15)',
                            },

                          '&:hover':
                            {
                              background:
                                'rgba(255,255,255,.07)',
                              color:
                                '#fff',
                            },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 31,
                            color:
                              'inherit',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>

                        <ListItemText
                          primary={
                            item.label
                          }
                          primaryTypographyProps={{
                            fontSize: 12,
                            fontWeight:
                              active
                                ? 750
                                : 550,
                          }}
                        />

                        {active && (
                          <ChevronRight
                            sx={{
                              fontSize: 15,
                              opacity:
                                0.7,
                            }}
                          />
                        )}
                      </ListItemButton>
                    );
                  }
                )}
              </List>
            </Box>
          )
        )}
      </Box>

      {/* ADMIN USER */}

      <Box
        sx={{
          p: 1.5,
          borderTop:
            '1px solid rgba(255,255,255,.08)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              background:
                'rgba(255,255,255,.14)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            A
          </Avatar>

          <Box
            sx={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <Typography
              noWrap
              sx={{
                fontSize: 11,
                fontWeight: 750,
              }}
            >
              Administrator
            </Typography>

            <Typography
              noWrap
              sx={{
                fontSize: 9,
                opacity: 0.55,
              }}
            >
              ZENIMONIES Admin
            </Typography>
          </Box>

          <Tooltip title="Sign out">
            <IconButton
              size="small"
              onClick={
                handleLogout
              }
              sx={{
                color:
                  'rgba(255,255,255,.65)',
              }}
            >
              <Logout
                sx={{
                  fontSize: 17,
                }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );

  /* ============================================================
     SIDEBAR DRAWER
     ============================================================ */

  const sidebar = isMobile ? (
    <Drawer
      open={mobileDrawerOpen}
      onClose={() =>
        setMobileDrawerOpen(false)
      }
      PaperProps={{
        sx: {
          width: SIDEBAR_WIDTH,
          border: 0,
        },
      }}
    >
      <SidebarContent />
    </Drawer>
  ) : (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        zIndex: 1200,
      }}
    >
      <SidebarContent />
    </Box>
  );

  /* ============================================================
     TOP BAR
     ============================================================ */

  const TopBar = () => (
    <Box
      sx={{
        height: 66,
        px: {
          xs: 1.5,
          sm: 2.5,
          md: 3,
        },
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          'space-between',
        borderBottom:
          `1px solid ${ZENIMONIES.border}`,
        background:
          'rgba(255,255,255,.94)',
        backdropFilter:
          'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
      >
        {isMobile && (
          <IconButton
            onClick={() =>
              setMobileDrawerOpen(
                true
              )
            }
            size="small"
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 800,
              color:
                ZENIMONIES.text,
            }}
          >
            {getSectionTitle()}
          </Typography>

          <Typography
            sx={{
              display: {
                xs: 'none',
                sm: 'block',
              },
              fontSize: 10,
              color:
                ZENIMONIES.textMuted,
              mt: 0.15,
            }}
          >
            ZENIMONIES Banking
            Administration
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
      >
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={() =>
              loadAllData()
            }
            disabled={refreshing}
          >
            {refreshing ? (
              <CircularProgress
                size={17}
              />
            ) : (
              <Refresh
                sx={{
                  fontSize: 19,
                }}
              />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton
            size="small"
          >
            <Badge
              color="error"
              variant="dot"
            >
              <NotificationsNone
                sx={{
                  fontSize: 20,
                }}
              />
            </Badge>
          </IconButton>
        </Tooltip>

        <Chip
          avatar={
            <Avatar
              sx={{
                width: 23,
                height: 23,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              A
            </Avatar>
          }
          label="Admin"
          size="small"
          sx={{
            ml: 0.5,
            height: 31,
            background:
              ZENIMONIES.greenSoft,
            color:
              ZENIMONIES.green,
            fontWeight: 800,
            display: {
              xs: 'none',
              sm: 'flex',
            },
          }}
        />
      </Stack>
    </Box>
  );

  /* ============================================================
     LOADERS
     ============================================================ */

  const loadDashboard = async () => {
    const response =
      await fetch(
        `${API_BASE_URL}/admin/dashboard`,
        {
          headers:
            authHeaders,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to load dashboard.'
      );
    }

    setDashboard(
      data.dashboard
    );
  };

  const loadUsers = async () => {
    const response =
      await fetch(
        `${API_BASE_URL}/admin/users`,
        {
          headers:
            authHeaders,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to load users.'
      );
    }

    setUsers(
      data.users || []
    );
  };

  const loadKyc = async () => {
    const response =
      await fetch(
        `${API_BASE_URL}/admin/kyc`,
        {
          headers:
            authHeaders,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to load KYC records.'
      );
    }

    setKycRecords(
      data.kyc_records || []
    );
  };

  const loadTransactions = async () => {
    const response =
      await fetch(
        `${API_BASE_URL}/admin/transactions`,
        {
          headers:
            authHeaders,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to load transactions.'
      );
    }

    setTransactions(
      data.transactions || []
    );
  };

  /* ============================================================
     TRANSACTION DETAIL
     ============================================================ */

  const openTransaction = async (
    transactionId: string
  ) => {
    try {
      setTransactionLoading(
        true
      );

      setError('');

      const response =
        await fetch(
          `${API_BASE_URL}/admin/transactions/${transactionId}`,
          {
            headers:
              authHeaders,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load transaction.'
        );
      }

      setSelectedTransaction(
        data.transaction ||
          data
      );

      setTransactionDialogOpen(
        true
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load transaction.'
      );
    } finally {
      setTransactionLoading(
        false
      );
    }
  };

  /* ============================================================
     DATA LOAD
     ============================================================ */

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      setError('');

      await Promise.all([
        loadDashboard(),
        loadUsers(),
        loadKyc(),
        loadTransactions(),
      ]);
    } catch (err: any) {
      console.error(
        'Admin dashboard error:',
        err
      );

      setError(
        err?.message ||
          'Unable to load Administration dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    loadAllData();
  }, [token]);

  /* ============================================================
     FILTERED TRANSACTIONS
     ============================================================ */

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        transaction => {
          const search =
            transactionSearch
              .trim()
              .toLowerCase();

          const matchesSearch =
            !search ||
            transaction.reference
              ?.toLowerCase()
              .includes(search) ||
            transaction.full_name
              ?.toLowerCase()
              .includes(search) ||
            transaction.email
              ?.toLowerCase()
              .includes(search) ||
            transaction.account_number
              ?.toLowerCase()
              .includes(search);

          const matchesStatus =
            transactionStatusFilter ===
              'all' ||
            transaction.status ===
              transactionStatusFilter;

          const matchesType =
            transactionTypeFilter ===
              'all' ||
            transaction.type ===
              transactionTypeFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );
        }
      );
    }, [
      transactions,
      transactionSearch,
      transactionStatusFilter,
      transactionTypeFilter,
    ]);

  /* ============================================================
     DASHBOARD METRICS
     ============================================================ */

  const pendingTransactionCount =
    dashboard?.transactions
      ?.pending || 0;

  const failedTransactionCount =
    dashboard?.transactions
      ?.failed || 0;

  const pendingKycCount =
    dashboard?.kyc?.pending || 0;

  const totalCustomers =
    dashboard?.users?.total || 0;

  const activeCustomers =
    dashboard?.users?.active || 0;

  const depositTotal =
    dashboard?.deposits
      ?.total_amount || 0;

  const withdrawalTotal =
    dashboard?.withdrawals
      ?.total_amount || 0;

  const transferTotal =
    dashboard?.transfers
      ?.total_amount || 0;

  /* ============================================================
     SMALL TABLE CELL
     ============================================================ */

  const TablePrimary = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) => (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 750,
          color:
            ZENIMONIES.text,
        }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography
          sx={{
            mt: 0.25,
            fontSize: 10,
            color:
              ZENIMONIES.textMuted,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  /* ============================================================
     SECTION HEADING
     ============================================================ */

  const SectionHeading = ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  }) => (
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
      gap={1.5}
      sx={{
        mb: 2,
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 850,
            color:
              ZENIMONIES.text,
            letterSpacing:
              '-0.025em',
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            sx={{
              mt: 0.35,
              fontSize: 12,
              color:
                ZENIMONIES.textSecondary,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  );

  /* ============================================================
     EMPTY STATE
     ============================================================ */

  const EmptyState = ({
    title,
    description,
    icon = (
      <Description
        sx={{
          fontSize: 25,
        }}
      />
    ),
  }: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
  }) => (
    <Box
      sx={{
        py: 7,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          mb: 1.5,
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
          background:
            ZENIMONIES.greenSoft,
          color:
            ZENIMONIES.green,
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 800,
          color:
            ZENIMONIES.text,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          sx={{
            mt: 0.5,
            fontSize: 12,
            color:
              ZENIMONIES.textSecondary,
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );

  /* ============================================================
     IMPORTANT
     ============================================================ */

  /*
    CONTINUE WITH PART 2.

    PART 2 contains:
      - Premium Overview
      - KPI grid
      - Pending Actions
      - Deposits
      - Withdrawals
      - Transfers
      - Transaction monitoring
      - Risk alerts
      - KYC queue
      - Recent activity
  */

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          ZENIMONIES.background,
      }}
    >
      {sidebar}

      <Box
        sx={{
          ml: {
            xs: 0,
            md: `${SIDEBAR_WIDTH}px`,
          },
          minHeight: '100vh',
        }}
      >
        <TopBar />

        <Container
          maxWidth={false}
          sx={{
            px: {
              xs: 1.5,
              sm: 2.5,
              lg: 3.5,
            },
            py: 2.5,
          }}
        >
          {error && (
            <Alert
              severity="error"
              onClose={() =>
                setError('')
              }
              sx={{
                mb: 2,
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Snackbar
              open
              autoHideDuration={
                5000
              }
              onClose={() =>
                setSuccessMessage(
                  ''
                )
              }
              message={
                successMessage
              }
            />
          )}

          {loading ? (
            <Box
              sx={{
                minHeight:
                  '65vh',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              <Stack
                alignItems="center"
                gap={1.5}
              >
                <CircularProgress
                  size={32}
                  sx={{
                    color:
                      ZENIMONIES.green,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 12,
                    color:
                      ZENIMONIES.textSecondary,
                  }}
                >
                  Loading ZENIMONIES
                  Administration…
                </Typography>
              </Stack>
            </Box>
          ) : (
            <>
              <OperationsStatusCard />

              {/* PART 2+ SECTION RENDERERS GO HERE */}
              <AdminCard>
                <CardContent
                  sx={{
                    py: 8,
                    textAlign:
                      'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    Administration
                    workspace
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 13,
                      color:
                        ZENIMONIES.textSecondary,
                    }}
                  >
                    The premium
                    operations sections
                    continue in the next
                    replacement part.
                  </Typography>
                </CardContent>
              </AdminCard>
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
