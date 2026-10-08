import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
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
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {
  Schedule,
  PointOfSale,
  ArrowForward,
  Verified,
  Warning,
  Gavel,
  CalendarToday,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

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
   INFO DISPLAY
   ============================================================ */

const InfoDisplay: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => (
  <Box>
    <Typography
      fontSize={11}
      color="text.secondary"
      fontWeight={700}
      sx={{
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Typography>

    <Typography
      fontSize={14}
      fontWeight={800}
      sx={{
        mt: 0.4,
        wordBreak: 'break-word',
      }}
    >
      {value}
    </Typography>
  </Box>
);
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
   PART 3 — CUSTOMER / ACCOUNT / KYC OPERATIONS
   ============================================================ */

/* ============================================================
   USER STATUS UPDATE
   ============================================================ */

const updateUserStatus = async (
  userId: string,
  status: string
) => {
  try {
    setActionLoading(userId);
    setError('');

    const response = await fetch(
      `${API_BASE_URL}/admin/users/${userId}/status`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to update customer status.'
      );
    }

    setUsers(current =>
      current.map(user =>
        user.id === userId
          ? {
              ...user,
              status,
            }
          : user
      )
    );

    await loadDashboard();

    setSuccessMessage(
      `Customer status updated to ${getStatusLabel(
        status
      )}.`
    );
  } catch (err: any) {
    console.error(
      'Customer status update error:',
      err
    );

    setError(
      err?.message ||
        'Unable to update customer status.'
    );
  } finally {
    setActionLoading(null);
  }
};

/* ============================================================
   KYC HELPERS
   ============================================================ */

const getKycTypeLabel = (
  type: KycType
) => {
  if (type === 'bvn') {
    return 'BVN';
  }

  if (type === 'tier2') {
    return 'Tier 2';
  }

  return 'Tier 3';
};

const getKycStatus = (
  record: KycRecord,
  type: KycType
) => {
  if (type === 'bvn') {
    return record.bvn_verification_status;
  }

  if (type === 'tier2') {
    return record.id_verification_status;
  }

  return record.tier_3_verification_status;
};

const isKycPending = (
  record: KycRecord,
  type: KycType
) => {
  return (
    String(
      getKycStatus(
        record,
        type
      )
    ).toLowerCase() ===
    'pending'
  );
};

const isKycVerified = (
  record: KycRecord,
  type: KycType
) => {
  return (
    String(
      getKycStatus(
        record,
        type
      )
    ).toLowerCase() ===
    'verified'
  );
};

/* ============================================================
   OPEN KYC REVIEW
   ============================================================ */

const openKycReview = (
  record: KycRecord,
  type: KycType
) => {
  setSelectedKyc(record);
  setSelectedType(type);
  setDecisionMessage('');
  setRejectionReason('');
  setReviewOpen(true);
};

const closeKycReview = () => {
  if (actionLoading) {
    return;
  }

  setReviewOpen(false);
  setSelectedKyc(null);
  setSelectedType(null);
  setDecisionMessage('');
  setRejectionReason('');
};

const openRejectDialog = () => {
  setRejectionReason('');
  setRejectOpen(true);
};

const closeRejectDialog = () => {
  if (actionLoading) {
    return;
  }

  setRejectOpen(false);
  setRejectionReason('');
};

/* ============================================================
   KYC DECISION
   ============================================================ */

const submitKycDecision = async (
  decision: KycDecision
) => {
  if (
    !selectedKyc ||
    !selectedType
  ) {
    return;
  }

  if (
    decision === 'reject' &&
    !rejectionReason.trim()
  ) {
    setError(
      'Please enter a rejection reason.'
    );

    return;
  }

  try {
    const loadingKey =
      `${selectedKyc.id}-${selectedType}`;

    setActionLoading(
      loadingKey
    );

    setError('');
    setDecisionMessage('');

    const endpoint =
      `${API_BASE_URL}/admin/kyc/${selectedKyc.id}/${selectedType}/${decision}`;

    const response =
      await fetch(
        endpoint,
        {
          method: 'POST',
          headers:
            authHeaders,

          body:
            decision ===
            'reject'
              ? JSON.stringify({
                  reason:
                    rejectionReason.trim(),
                })
              : JSON.stringify({}),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Unable to ${decision} KYC verification.`
      );
    }

    setDecisionMessage(
      data?.message ||
        `${getKycTypeLabel(
          selectedType
        )} ${
          decision ===
          'verify'
            ? 'verified'
            : 'rejected'
        } successfully.`
    );

    setRejectOpen(false);

    await Promise.all([
      loadKyc(),
      loadDashboard(),
      loadUsers(),
    ]);

    setTimeout(() => {
      setReviewOpen(false);
      setSelectedKyc(null);
      setSelectedType(null);
      setDecisionMessage('');
      setRejectionReason('');
    }, 900);
  } catch (err: any) {
    console.error(
      'KYC decision error:',
      err
    );

    setError(
      err?.message ||
        `Unable to ${decision} KYC submission.`
    );
  } finally {
    setActionLoading(null);
  }
};

/* ============================================================
   CUSTOMER SEARCH
   ============================================================ */

const [customerSearch, setCustomerSearch] =
  useState('');

const [customerStatusFilter, setCustomerStatusFilter] =
  useState('all');

const [customerKycFilter, setCustomerKycFilter] =
  useState('all');

const filteredCustomers =
  useMemo(() => {
    const search =
      customerSearch
        .trim()
        .toLowerCase();

    return users.filter(
      user => {
        const matchesSearch =
          !search ||
          user.full_name
            ?.toLowerCase()
            .includes(search) ||
          user.email
            ?.toLowerCase()
            .includes(search) ||
          user.phone
            ?.toLowerCase()
            .includes(search) ||
          user.id
            ?.toLowerCase()
            .includes(search);

        const matchesStatus =
          customerStatusFilter ===
            'all' ||
          String(
            user.status
          ).toLowerCase() ===
            customerStatusFilter.toLowerCase();

        const matchesKyc =
          customerKycFilter ===
            'all' ||
          String(
            user.kyc_status
          ).toLowerCase() ===
            customerKycFilter.toLowerCase();

        return (
          matchesSearch &&
          matchesStatus &&
          matchesKyc
        );
      }
    );
  }, [
    users,
    customerSearch,
    customerStatusFilter,
    customerKycFilter,
  ]);

/* ============================================================
   KYC QUEUE
   ============================================================ */

const pendingKycRecords =
  useMemo(() => {
    return kycRecords.filter(
      record =>
        isKycPending(
          record,
          'bvn'
        ) ||
        isKycPending(
          record,
          'tier2'
        ) ||
        isKycPending(
          record,
          'tier3'
        )
    );
  }, [kycRecords]);

/* ============================================================
   ACCOUNT SUMMARY
   ============================================================ */

const accountCustomerCount =
  users.length;

const verifiedCustomerCount =
  users.filter(
    user =>
      user.is_verified ||
      String(
        user.kyc_status
      ).toLowerCase() ===
        'approved'
  ).length;

const suspendedCustomerCount =
  users.filter(
    user =>
      String(
        user.status
      ).toLowerCase() ===
      'suspended'
  ).length;

const blockedCustomerCount =
  users.filter(
    user =>
      String(
        user.status
      ).toLowerCase() ===
      'blocked'
  ).length;
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
              {/* ============================================================
                  PART 2 — PREMIUM OVERVIEW & FINANCIAL OPERATIONS
                ============================================================ */}

            {section === 'overview' && (
          <Box>
    {/* ========================================================
        PAGE INTRO
        ======================================================== */}

    <SectionHeading
      title="Operations Overview"
      description="Monitor ZENIMONIES banking activity, customer operations and financial flows."
      action={
        <Stack
          direction="row"
          spacing={1}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAllData}
            disabled={refreshing}
            sx={{
              textTransform: 'none',
              borderColor:
                ZENIMONIES.border,
              color:
                ZENIMONIES.text,
              borderRadius: 1.75,
              fontWeight: 700,
            }}
          >
            Refresh
          </Button>
        </Stack>
      }
    />

    {/* ========================================================
        PRIMARY KPI GRID
        ======================================================== */}

    <Grid
      container
      spacing={1.75}
      sx={{
        mb: 2,
      }}
    >
      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Total Customers"
          value={totalCustomers.toLocaleString()}
          subtitle={`${activeCustomers.toLocaleString()} active accounts`}
          icon={
            <Groups
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Pending KYC"
          value={pendingKycCount.toLocaleString()}
          subtitle="Requires verification"
          icon={
            <VerifiedUser
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Total Deposits"
          value={formatMoney(
            depositTotal
          )}
          subtitle={`${(
            dashboard?.deposits
              ?.count || 0
          ).toLocaleString()} deposits`}
          icon={
            <ArrowDownward
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Total Withdrawals"
          value={formatMoney(
            withdrawalTotal
          )}
          subtitle={`${(
            dashboard?.withdrawals
              ?.count || 0
          ).toLocaleString()} withdrawals`}
          icon={
            <ArrowUpward
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Bank Transfers"
          value={formatMoney(
            transferTotal
          )}
          subtitle={`${(
            dashboard?.transfers
              ?.count || 0
          ).toLocaleString()} transfers`}
          icon={
            <AccountBalance
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Pending Transactions"
          value={pendingTransactionCount.toLocaleString()}
          subtitle="Needs operational review"
          icon={
            <SyncAlt
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Failed Transactions"
          value={failedTransactionCount.toLocaleString()}
          subtitle="Requires investigation"
          icon={
            <ErrorOutline
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="KYC Approved"
          value={(
            dashboard?.kyc
              ?.approved || 0
          ).toLocaleString()}
          subtitle="Verified customers"
          icon={
            <CheckCircle
              sx={{
                fontSize: 21,
              }}
            />
          }
        />
      </Grid>
    </Grid>

    {/* ========================================================
        PENDING ACTIONS
        ======================================================== */}

    <Grid
      container
      spacing={1.75}
      sx={{
        mb: 2,
      }}
    >
      <Grid
        item
        xs={12}
        md={8}
      >
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
              alignItems="center"
              justifyContent="space-between"
              sx={{
                mb: 1.75,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 850,
                    color:
                      ZENIMONIES.text,
                  }}
                >
                  Pending Actions
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: 11,
                    color:
                      ZENIMONIES.textSecondary,
                  }}
                >
                  Items requiring
                  Administration attention
                </Typography>
              </Box>

              <MoreHoriz
                sx={{
                  color:
                    ZENIMONIES.textMuted,
                }}
              />
            </Stack>

            <Stack spacing={1}>
              {/* KYC */}

              <Box
                onClick={() =>
                  handleNavigation(
                    'kyc'
                  )
                }
                sx={{
                  p: 1.35,
                  borderRadius: 2,
                  border:
                    `1px solid ${ZENIMONIES.border}`,
                  cursor: 'pointer',
                  transition:
                    'all .18s ease',

                  '&:hover': {
                    borderColor:
                      ZENIMONIES.green,
                    background:
                      ZENIMONIES.greenSoft,
                  },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1.25}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        background:
                          ZENIMONIES.warningSoft,
                        color:
                          ZENIMONIES.warning,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                      }}
                    >
                      <VerifiedUser
                        sx={{
                          fontSize: 18,
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 750,
                        }}
                      >
                        KYC reviews
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        Customer
                        verification
                        queue
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    label={pendingKycCount}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      background:
                        ZENIMONIES.warningSoft,
                      color:
                        ZENIMONIES.warning,
                    }}
                  />
                </Stack>
              </Box>

              {/* TRANSACTIONS */}

              <Box
                onClick={() =>
                  handleNavigation(
                    'pending-transactions'
                  )
                }
                sx={{
                  p: 1.35,
                  borderRadius: 2,
                  border:
                    `1px solid ${ZENIMONIES.border}`,
                  cursor: 'pointer',
                  transition:
                    'all .18s ease',

                  '&:hover': {
                    borderColor:
                      ZENIMONIES.green,
                    background:
                      ZENIMONIES.greenSoft,
                  },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1.25}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        background:
                          ZENIMONIES.blueSoft,
                        color:
                          ZENIMONIES.blue,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                      }}
                    >
                      <SyncAlt
                        sx={{
                          fontSize: 18,
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 750,
                        }}
                      >
                        Pending transactions
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        Financial operations
                        requiring review
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    label={
                      pendingTransactionCount
                    }
                    size="small"
                    sx={{
                      fontWeight: 800,
                      background:
                        ZENIMONIES.blueSoft,
                      color:
                        ZENIMONIES.blue,
                    }}
                  />
                </Stack>
              </Box>

              {/* FAILED */}

              <Box
                onClick={() =>
                  handleNavigation(
                    'transactions'
                  )
                }
                sx={{
                  p: 1.35,
                  borderRadius: 2,
                  border:
                    `1px solid ${ZENIMONIES.border}`,
                  cursor: 'pointer',
                  transition:
                    'all .18s ease',

                  '&:hover': {
                    borderColor:
                      ZENIMONIES.danger,
                    background:
                      ZENIMONIES.dangerSoft,
                  },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1.25}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        background:
                          ZENIMONIES.dangerSoft,
                        color:
                          ZENIMONIES.danger,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                      }}
                    >
                      <ErrorOutline
                        sx={{
                          fontSize: 18,
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 750,
                        }}
                      >
                        Failed transactions
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        Failed financial
                        operations
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    label={
                      failedTransactionCount
                    }
                    size="small"
                    sx={{
                      fontWeight: 800,
                      background:
                        ZENIMONIES.dangerSoft,
                      color:
                        ZENIMONIES.danger,
                    }}
                  />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>

      {/* SYSTEM STATUS */}

      <Grid
        item
        xs={12}
        md={4}
      >
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
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              System Status
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                mb: 2,
                fontSize: 11,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Core banking services
            </Typography>

            {[
              [
                'Core banking',
                'Operational',
              ],
              [
                'Customer accounts',
                'Operational',
              ],
              [
                'KYC services',
                'Operational',
              ],
              [
                'Payments',
                'Operational',
              ],
              [
                'Bank transfers',
                'Operational',
              ],
            ].map(
              ([label, status]) => (
                <Stack
                  key={label}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    py: 1,
                    borderBottom:
                      `1px solid ${ZENIMONIES.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      color:
                        ZENIMONIES.textSecondary,
                    }}
                  >
                    {label}
                  </Typography>

                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={0.7}
                  >
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius:
                          '50%',
                        background:
                          '#16A34A',
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 750,
                        color:
                          ZENIMONIES.green,
                      }}
                    >
                      {status}
                    </Typography>
                  </Stack>
                </Stack>
              )
            )}

            <Box
              sx={{
                mt: 1.75,
                p: 1.25,
                borderRadius: 2,
                background:
                  ZENIMONIES.greenSoft,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  color:
                    ZENIMONIES.green,
                  fontWeight: 700,
                }}
              >
                No active system
                incidents detected.
              </Typography>
            </Box>
          </CardContent>
        </AdminCard>
      </Grid>
    </Grid>

    {/* ========================================================
        RECENT TRANSACTIONS
        ======================================================== */}

    <AdminCard
      sx={{
        mb: 2,
      }}
    >
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
        <Box
          sx={{
            px: 2.25,
            py: 1.75,
            borderBottom:
              `1px solid ${ZENIMONIES.border}`,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 850,
                }}
              >
                Recent Transactions
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: 11,
                  color:
                    ZENIMONIES.textSecondary,
                }}
              >
                Latest financial activity
                across customer accounts
              </Typography>
            </Box>

            <Button
              size="small"
              endIcon={
                <ChevronRight />
              }
              onClick={() =>
                handleNavigation(
                  'transactions'
                )
              }
              sx={{
                textTransform:
                  'none',
                color:
                  ZENIMONIES.green,
                fontWeight: 750,
              }}
            >
              View all
            </Button>
          </Stack>
        </Box>

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
                  'Transaction',
                  'Customer',
                  'Type',
                  'Amount',
                  'Status',
                  'Date',
                  '',
                ].map(
                  heading => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          ZENIMONIES.textMuted,
                        textTransform:
                          'uppercase',
                        letterSpacing:
                          '0.05em',
                        background:
                          '#FAFBFA',
                        borderBottom:
                          `1px solid ${ZENIMONIES.border}`,
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .slice(0, 8)
                .map(
                  transaction => (
                    <TableRow
                      key={
                        transaction.id
                      }
                      hover
                      sx={{
                        '&:last-child td':
                          {
                            borderBottom:
                              0,
                          },
                      }}
                    >
                      <TableCell>
                        <TablePrimary
                          title={
                            transaction.reference
                          }
                          subtitle={
                            transaction.id
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <TablePrimary
                          title={
                            transaction.full_name
                          }
                          subtitle={
                            transaction.account_number
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 650,
                            textTransform:
                              'capitalize',
                          }}
                        >
                          {String(
                            transaction.type ||
                              ''
                          ).replaceAll(
                            '_',
                            ' '
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
                            transaction.currency
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <StatusChip
                          status={
                            transaction.status
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color:
                              ZENIMONIES.textSecondary,
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {formatDate(
                            transaction.created_at
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={
                            <Visibility
                              sx={{
                                fontSize:
                                  15,
                              }}
                            />
                          }
                          onClick={() =>
                            openTransaction(
                              transaction.id
                            )
                          }
                          sx={{
                            textTransform:
                              'none',
                            color:
                              ZENIMONIES.green,
                            fontWeight: 750,
                            fontSize: 11,
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}

              {!transactions.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No transactions yet"
                      description="Recent transaction activity will appear here."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>

    {/* ========================================================
        FINANCIAL SNAPSHOT
        ======================================================== */}

    <Grid
      container
      spacing={1.75}
    >
      <Grid
        item
        xs={12}
        md={4}
      >
        <AdminCard>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  background:
                    ZENIMONIES.greenLight,
                  color:
                    ZENIMONIES.green,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <ArrowDownward
                  sx={{
                    fontSize: 18,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color:
                      ZENIMONIES.textSecondary,
                  }}
                >
                  Deposit volume
                </Typography>

                <Typography
                  sx={{
                    fontSize: 18,
                    fontWeight: 850,
                  }}
                >
                  {formatMoney(
                    depositTotal
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>

      <Grid
        item
        xs={12}
        md={4}
      >
        <AdminCard>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  background:
                    ZENIMONIES.warningSoft,
                  color:
                    ZENIMONIES.warning,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <ArrowUpward
                  sx={{
                    fontSize: 18,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color:
                      ZENIMONIES.textSecondary,
                  }}
                >
                  Withdrawal volume
                </Typography>

                <Typography
                  sx={{
                    fontSize: 18,
                    fontWeight: 850,
                  }}
                >
                  {formatMoney(
                    withdrawalTotal
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>

      <Grid
        item
        xs={12}
        md={4}
      >
        <AdminCard>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  background:
                    ZENIMONIES.blueSoft,
                  color:
                    ZENIMONIES.blue,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <SwapHoriz
                  sx={{
                    fontSize: 18,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color:
                      ZENIMONIES.textSecondary,
                  }}
                >
                  Transfer volume
                </Typography>

                <Typography
                  sx={{
                    fontSize: 18,
                    fontWeight: 850,
                  }}
                >
                  {formatMoney(
                    transferTotal
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>
    </Grid>
  </Box>
)}

{/* ============================================================
    PART 2 — TRANSACTIONS
    ============================================================ */}

{section === 'transactions' && (
  <Box>
    <SectionHeading
      title="Transactions"
      description="Monitor all customer financial transactions across ZENIMONIES."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          sx={{
            textTransform: 'none',
            color:
              ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <AdminCard>
      <CardContent
        sx={{
          p: 2,
          '&:last-child': {
            pb: 2,
          },
        }}
      >
        <Grid
          container
          spacing={1.25}
          sx={{
            mb: 2,
          }}
        >
          <Grid
            item
            xs={12}
            md={5}
          >
            <TextField
              fullWidth
              size="small"
              value={
                transactionSearch
              }
              onChange={event =>
                setTransactionSearch(
                  event.target.value
                )
              }
              placeholder="Search reference, customer, email or account"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      sx={{
                        fontSize: 18,
                        color:
                          ZENIMONIES.textMuted,
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root':
                  {
                    borderRadius: 1.75,
                    fontSize: 12,
                  },
              }}
            />
          </Grid>

          <Grid
            item
            xs={12}
            sm={6}
            md={3}
          >
            <Select
              fullWidth
              size="small"
              value={
                transactionStatusFilter
              }
              onChange={event =>
                setTransactionStatusFilter(
                  event.target.value
                )
              }
              sx={{
                borderRadius: 1.75,
                fontSize: 12,
              }}
            >
              <MenuItem value="all">
                All statuses
              </MenuItem>

              <MenuItem value="pending">
                Pending
              </MenuItem>

              <MenuItem value="processing">
                Processing
              </MenuItem>

              <MenuItem value="completed">
                Completed
              </MenuItem>

              <MenuItem value="failed">
                Failed
              </MenuItem>

              <MenuItem value="reversed">
                Reversed
              </MenuItem>

              <MenuItem value="refunded">
                Refunded
              </MenuItem>
            </Select>
          </Grid>

          <Grid
            item
            xs={12}
            sm={6}
            md={4}
          >
            <Select
              fullWidth
              size="small"
              value={
                transactionTypeFilter
              }
              onChange={event =>
                setTransactionTypeFilter(
                  event.target.value
                )
              }
              sx={{
                borderRadius: 1.75,
                fontSize: 12,
              }}
            >
              <MenuItem value="all">
                All transaction types
              </MenuItem>

              {Array.from(
                new Set(
                  transactions
                    .map(
                      transaction =>
                        transaction.type
                    )
                    .filter(Boolean)
                )
              ).map(type => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {String(
                    type
                  ).replaceAll(
                    '_',
                    ' '
                  )}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>

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
                  'Customer',
                  'Account',
                  'Type',
                  'Amount',
                  'Status',
                  'Date',
                  'Actions',
                ].map(
                  heading => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform:
                          'uppercase',
                        color:
                          ZENIMONIES.textMuted,
                        background:
                          '#FAFBFA',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredTransactions.map(
                transaction => (
                  <TableRow
                    key={
                      transaction.id
                    }
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {
                          transaction.account_number
                        }
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {String(
                          transaction.type ||
                            ''
                        ).replaceAll(
                          '_',
                          ' '
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
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          whiteSpace:
                            'nowrap',
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={
                          <Visibility
                            sx={{
                              fontSize:
                                15,
                            }}
                          />
                        }
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                          fontSize: 11,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {!filteredTransactions.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                  >
                    <EmptyState
                      title="No transactions found"
                      description="Try changing your search or filters."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

{/* ============================================================
    PART 2 — PENDING TRANSACTIONS
    ============================================================ */}

{section === 'pending-transactions' && (
  <Box>
    <SectionHeading
      title="Pending Transactions"
      description="Transactions awaiting operational processing or completion."
    />

    <Grid
      container
      spacing={1.75}
      sx={{
        mb: 2,
      }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Pending"
          value={pendingTransactionCount.toLocaleString()}
          subtitle="Awaiting action"
          icon={
            <SyncAlt />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Processing"
          value={
            transactions.filter(
              transaction =>
                transaction.status ===
                'processing'
            ).length.toLocaleString()
          }
          subtitle="Currently processing"
          icon={
            <Refresh />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Failed"
          value={failedTransactionCount.toLocaleString()}
          subtitle="Requires review"
          icon={
            <ErrorOutline />
          }
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Customer',
                  'Type',
                  'Amount',
                  'Status',
                  'Created',
                  'Actions',
                ].map(
                  heading => (
                    <TableCell
                      key={
                        heading
                      }
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          ZENIMONIES.textMuted,
                        background:
                          '#FAFBFA',
                        textTransform:
                          'uppercase',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(
                  transaction =>
                    [
                      'pending',
                      'processing',
                    ].includes(
                      String(
                        transaction.status
                      ).toLowerCase()
                    )
                )
                .map(
                  transaction => (
                    <TableRow
                      key={
                        transaction.id
                      }
                      hover
                    >
                      <TableCell>
                        <TablePrimary
                          title={
                            transaction.reference
                          }
                          subtitle={
                            transaction.id
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <TablePrimary
                          title={
                            transaction.full_name
                          }
                          subtitle={
                            transaction.account_number
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            textTransform:
                              'capitalize',
                          }}
                        >
                          {String(
                            transaction.type ||
                              ''
                          ).replaceAll(
                            '_',
                            ' '
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
                            transaction.currency
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <StatusChip
                          status={
                            transaction.status
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color:
                              ZENIMONIES.textSecondary,
                          }}
                        >
                          {formatDate(
                            transaction.created_at
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Button
                          size="small"
                          startIcon={
                            <Visibility
                              sx={{
                                fontSize:
                                  15,
                              }}
                            />
                          }
                          onClick={() =>
                            openTransaction(
                              transaction.id
                            )
                          }
                          sx={{
                            textTransform:
                              'none',
                            color:
                              ZENIMONIES.green,
                            fontWeight: 750,
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}

              {!transactions.some(
                transaction =>
                  [
                    'pending',
                    'processing',
                  ].includes(
                    String(
                      transaction.status
                    ).toLowerCase()
                  )
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No pending transactions"
                      description="There are currently no transactions waiting for operational review."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}
   /* ============================================================
   PART 4 — CUSTOMERS / KYC / CUSTOMER OPERATIONS
   ============================================================ */

{section === 'customers' && (
  <Box>
    <SectionHeading
      title="Customers"
      description="Manage ZENIMONIES customers, account status and verification activity."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={async () => {
            try {
              setRefreshing(true);
              await Promise.all([
                loadUsers(),
                loadDashboard(),
              ]);
            } catch (err: any) {
              setError(
                err?.message ||
                  'Unable to refresh customers.'
              );
            } finally {
              setRefreshing(false);
            }
          }}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    {/* CUSTOMER KPI CARDS */}

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Total Customers"
          value={accountCustomerCount.toLocaleString()}
          subtitle="Registered customers"
          icon={<Groups />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Verified"
          value={verifiedCustomerCount.toLocaleString()}
          subtitle="Verified customers"
          icon={<VerifiedUser />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Suspended"
          value={suspendedCustomerCount.toLocaleString()}
          subtitle="Restricted accounts"
          icon={<Lock />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title="Blocked"
          value={blockedCustomerCount.toLocaleString()}
          subtitle="Blocked accounts"
          icon={<Security />}
        />
      </Grid>
    </Grid>

    {/* CUSTOMER DIRECTORY */}

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
        {/* FILTER BAR */}

        <Box
          sx={{
            p: 2,
            borderBottom:
              `1px solid ${ZENIMONIES.border}`,
          }}
        >
          <Grid
            container
            spacing={1.25}
          >
            <Grid
              item
              xs={12}
              md={5}
            >
              <TextField
                fullWidth
                size="small"
                value={customerSearch}
                onChange={event =>
                  setCustomerSearch(
                    event.target.value
                  )
                }
                placeholder="Search name, email, phone or customer ID"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{
                          fontSize: 18,
                          color:
                            ZENIMONIES.textMuted,
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root':
                    {
                      borderRadius: 1.75,
                      fontSize: 12,
                    },
                }}
              />
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3.5}
            >
              <Select
                fullWidth
                size="small"
                value={
                  customerStatusFilter
                }
                onChange={event =>
                  setCustomerStatusFilter(
                    event.target.value
                  )
                }
                sx={{
                  borderRadius: 1.75,
                  fontSize: 12,
                }}
              >
                <MenuItem value="all">
                  All account statuses
                </MenuItem>

                <MenuItem value="active">
                  Active
                </MenuItem>

                <MenuItem value="suspended">
                  Suspended
                </MenuItem>

                <MenuItem value="blocked">
                  Blocked
                </MenuItem>

                <MenuItem value="pending">
                  Pending
                </MenuItem>
              </Select>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3.5}
            >
              <Select
                fullWidth
                size="small"
                value={
                  customerKycFilter
                }
                onChange={event =>
                  setCustomerKycFilter(
                    event.target.value
                  )
                }
                sx={{
                  borderRadius: 1.75,
                  fontSize: 12,
                }}
              >
                <MenuItem value="all">
                  All KYC statuses
                </MenuItem>

                <MenuItem value="approved">
                  Approved
                </MenuItem>

                <MenuItem value="pending">
                  Pending
                </MenuItem>

                <MenuItem value="rejected">
                  Rejected
                </MenuItem>

                <MenuItem value="not_verified">
                  Not Verified
                </MenuItem>
              </Select>
            </Grid>
          </Grid>
        </Box>

        {/* CUSTOMER TABLE */}

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
                  'Contact',
                  'KYC',
                  'Tier',
                  'Account status',
                  'Joined',
                  'Actions',
                ].map(
                  heading => (
                    <TableCell
                      key={heading}
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          ZENIMONIES.textMuted,
                        textTransform:
                          'uppercase',
                        letterSpacing:
                          '0.05em',
                        background:
                          '#FAFBFA',
                        borderBottom:
                          `1px solid ${ZENIMONIES.border}`,
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredCustomers.map(
                user => (
                  <TableRow
                    key={user.id}
                    hover
                  >
                    <TableCell>
                      <Stack
                        direction="row"
                        alignItems="center"
                        gap={1.1}
                      >
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            background:
                              ZENIMONIES.greenLight,
                            color:
                              ZENIMONIES.green,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {user.full_name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            'C'}
                        </Avatar>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 800,
                              color:
                                ZENIMONIES.text,
                            }}
                          >
                            {user.full_name}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.2,
                              fontSize: 10,
                              color:
                                ZENIMONIES.textMuted,
                            }}
                          >
                            {user.id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 650,
                          }}
                        >
                          {user.email}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.25,
                            fontSize: 10,
                            color:
                              ZENIMONIES.textSecondary,
                          }}
                        >
                          {user.phone}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          user.kyc_status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 750,
                        }}
                      >
                        Tier{' '}
                        {user.kyc_tier ??
                          0}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          user.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          user.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                      >
                        <Tooltip title="Suspend customer">
                          <IconButton
                            size="small"
                            disabled={
                              actionLoading ===
                              user.id
                            }
                            onClick={() =>
                              updateUserStatus(
                                user.id,
                                'suspended'
                              )
                            }
                            sx={{
                              color:
                                ZENIMONIES.warning,
                            }}
                          >
                            <Lock
                              sx={{
                                fontSize: 17,
                              }}
                            />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Activate customer">
                          <IconButton
                            size="small"
                            disabled={
                              actionLoading ===
                              user.id
                            }
                            onClick={() =>
                              updateUserStatus(
                                user.id,
                                'active'
                              )
                            }
                            sx={{
                              color:
                                ZENIMONIES.green,
                            }}
                          >
                            <CheckCircle
                              sx={{
                                fontSize: 17,
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              )}

              {!filteredCustomers.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No customers found"
                      description="Try changing your search or customer filters."
                      icon={
                        <Groups />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

{/* ============================================================
    ACCOUNTS
    ============================================================ */}

{section === 'accounts' && (
  <Box>
    <SectionHeading
      title="Accounts"
      description="Customer account administration and account status monitoring."
    />

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom:
              `1px solid ${ZENIMONIES.border}`,
          }}
        >
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              fontSize: 11,
            }}
          >
            Account-level information is
            restricted to authorized
            Administration users. Customer
            Care does not have access to
            balances or full account
            numbers.
          </Alert>
        </Box>

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
                  'Customer ID',
                  'Account status',
                  'KYC',
                  'KYC tier',
                  'Daily transfer limit',
                  'Daily transfer used',
                  'Actions',
                ].map(
                  heading => (
                    <TableCell
                      key={heading}
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          ZENIMONIES.textMuted,
                        background:
                          '#FAFBFA',
                        textTransform:
                          'uppercase',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {users.map(
                user => (
                  <TableRow
                    key={user.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          user.full_name
                        }
                        subtitle={
                          user.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontFamily:
                            'monospace',
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {user.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          user.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          user.kyc_status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 750,
                        }}
                      >
                        Tier{' '}
                        {user.kyc_tier ??
                          0}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {formatMoney(
                          user.daily_transfer_limit
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {formatMoney(
                          user.daily_transfer_used
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={() =>
                          setSection(
                            'customers'
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        Customer
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {!users.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                  >
                    <EmptyState
                      title="No accounts available"
                      description="Account records will appear when customers are available."
                      icon={
                        <AccountBalanceWallet />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

{/* ============================================================
    KYC & VERIFICATION
    ============================================================ */}

{section === 'kyc' && (
  <Box>
    <SectionHeading
      title="KYC & Verification"
      description="Review customer identity verification and manage authorized KYC decisions."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={async () => {
            try {
              setRefreshing(true);

              await Promise.all([
                loadKyc(),
                loadDashboard(),
              ]);
            } catch (err: any) {
              setError(
                err?.message ||
                  'Unable to refresh KYC records.'
              );
            } finally {
              setRefreshing(false);
            }
          }}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color:
              ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    {/* KYC KPI */}

    <Grid
      container
      spacing={1.75}
      sx={{
        mb: 2,
      }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Pending Reviews"
          value={
            pendingKycRecords.length.toLocaleString()
          }
          subtitle="Requires Administration review"
          icon={
            <WarningAmber />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Approved"
          value={(
            dashboard?.kyc
              ?.approved || 0
          ).toLocaleString()}
          subtitle="Verified KYC records"
          icon={
            <VerifiedUser />
          }
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Rejected"
          value={(
            dashboard?.kyc
              ?.rejected || 0
          ).toLocaleString()}
          subtitle="Rejected verification records"
          icon={
            <ReportProblem />
          }
        />
      </Grid>
    </Grid>

    {/* KYC TABLE */}

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'KYC tier',
                  'BVN',
                  'Identity',
                  'Tier 3',
                  'Overall',
                  'Submitted',
                  'Review',
                ].map(
                  heading => (
                    <TableCell
                      key={heading}
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          ZENIMONIES.textMuted,
                        background:
                          '#FAFBFA',
                        textTransform:
                          'uppercase',
                      }}
                    >
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {kycRecords.map(
                record => (
                  <TableRow
                    key={record.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          record.full_name
                        }
                        subtitle={
                          record.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={`Tier ${
                          record.kyc_tier ??
                          0
                        }`}
                        sx={{
                          height: 26,
                          fontSize: 10,
                          fontWeight: 800,
                          background:
                            ZENIMONIES.greenSoft,
                          color:
                            ZENIMONIES.green,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          record.bvn_verification_status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          record.id_verification_status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          record.tier_3_verification_status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          record.verification_status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          record.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={
                          <Visibility
                            sx={{
                              fontSize:
                                15,
                            }}
                          />
                        }
                        onClick={() =>
                          openKycReview(
                            record,
                            isKycPending(
                              record,
                              'bvn'
                            )
                              ? 'bvn'
                              : isKycPending(
                                  record,
                                  'tier2'
                                )
                              ? 'tier2'
                              : 'tier3'
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                          fontSize: 11,
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {!kycRecords.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                  >
                    <EmptyState
                      title="No KYC records"
                      description="Customer verification records will appear here."
                      icon={
                        <VerifiedUser />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>

    {/* ========================================================
        KYC REVIEW DIALOG
        ======================================================== */}

    <Dialog
      open={reviewOpen}
      onClose={
        closeKycReview
      }
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 850,
          borderBottom:
            `1px solid ${ZENIMONIES.border}`,
        }}
      >
        KYC Verification Review
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 2.5,
        }}
      >
        {selectedKyc &&
          selectedType && (
            <Stack
              spacing={2}
            >
              {/* CUSTOMER */}

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background:
                    ZENIMONIES.greenSoft,
                  border:
                    `1px solid ${ZENIMONIES.border}`,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1.25}
                >
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      background:
                        ZENIMONIES.green,
                      fontWeight: 800,
                    }}
                  >
                    {selectedKyc.full_name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      'C'}
                  </Avatar>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 850,
                      }}
                    >
                      {
                        selectedKyc.full_name
                      }
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color:
                          ZENIMONIES.textSecondary,
                      }}
                    >
                      {
                        selectedKyc.email
                      }
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontSize: 11,
                        color:
                          ZENIMONIES.textSecondary,
                      }}
                    >
                      {
                        selectedKyc.phone
                      }
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* VERIFICATION TYPE */}

              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform:
                      'uppercase',
                    color:
                      ZENIMONIES.textMuted,
                    mb: 0.75,
                  }}
                >
                  Verification
                </Typography>

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 1.5,
                    border:
                      `1px solid ${ZENIMONIES.border}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {getKycTypeLabel(
                      selectedType
                    )}
                  </Typography>

                  <StatusChip
                    status={getKycStatus(
                      selectedKyc,
                      selectedType
                    )}
                  />
                </Stack>
              </Box>

              {/* BVN */}

              {selectedType ===
                'bvn' && (
                <Box
                  sx={{
                    p: 1.5,
                    border:
                      `1px solid ${ZENIMONIES.border}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      textTransform:
                        'uppercase',
                    }}
                  >
                    BVN
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 15,
                      fontWeight: 800,
                      fontFamily:
                        'monospace',
                    }}
                  >
                    {selectedKyc.bvn ||
                      'Not available'}
                  </Typography>

                  {selectedKyc.bvn_rejection_reason && (
                    <Alert
                      severity="error"
                      sx={{
                        mt: 1.5,
                        fontSize: 11,
                      }}
                    >
                      {
                        selectedKyc.bvn_rejection_reason
                      }
                    </Alert>
                  )}
                </Box>
              )}

              {/* IDENTITY */}

              {selectedType ===
                'tier2' && (
                <Grid
                  container
                  spacing={1.5}
                >
                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <InfoDisplay
                      label="Document type"
                      value={getDocumentTypeLabel(
                        selectedKyc.document_type
                      )}
                    />
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <InfoDisplay
                      label="Document number"
                      value={
                        selectedKyc.document_number ||
                        'Not available'
                      }
                    />
                  </Grid>

                  <Grid
                    item
                    xs={12}
                  >
                    <InfoDisplay
                      label="Liveness"
                      value={
                        selectedKyc.liveness_status ||
                        'Not available'
                      }
                    />
                  </Grid>
                </Grid>
              )}

              {/* TIER 3 */}

              {selectedType ===
                'tier3' && (
                <Grid
                  container
                  spacing={1.5}
                >
                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <InfoDisplay
                      label="Verification method"
                      value={getTier3MethodLabel(
                        selectedKyc.tier_3_method
                      )}
                    />
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <InfoDisplay
                      label="Status"
                      value={getStatusLabel(
                        selectedKyc.tier_3_verification_status
                      )}
                    />
                  </Grid>
                </Grid>
              )}

              {decisionMessage && (
                <Alert
                  severity="success"
                  sx={{
                    fontSize: 11,
                  }}
                >
                  {decisionMessage}
                </Alert>
              )}
            </Stack>
          )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop:
            `1px solid ${ZENIMONIES.border}`,
        }}
      >
        <Button
          onClick={
            closeKycReview
          }
          sx={{
            textTransform:
              'none',
            color:
              ZENIMONIES.textSecondary,
          }}
        >
          Close
        </Button>

        {selectedKyc &&
          selectedType &&
          isKycPending(
            selectedKyc,
            selectedType
          ) && (
            <>
              <Button
                variant="outlined"
                color="error"
                onClick={
                  openRejectDialog
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                sx={{
                  textTransform:
                    'none',
                  borderRadius:
                    1.5,
                  fontWeight: 750,
                }}
              >
                Reject
              </Button>

              <Button
                variant="contained"
                onClick={() =>
                  submitKycDecision(
                    'verify'
                  )
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                sx={{
                  textTransform:
                    'none',
                  borderRadius:
                    1.5,
                  fontWeight: 750,
                  background:
                    ZENIMONIES.green,
                  '&:hover': {
                    background:
                      ZENIMONIES.greenDark,
                  },
                }}
              >
                {actionLoading ? (
                  <CircularProgress
                    size={18}
                    sx={{
                      color:
                        '#fff',
                    }}
                  />
                ) : (
                  'Verify'
                )}
              </Button>
            </>
          )}
      </DialogActions>
    </Dialog>

    {/* ========================================================
        KYC REJECTION DIALOG
        ======================================================== */}

    <Dialog
      open={rejectOpen}
      onClose={
        closeRejectDialog
      }
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 850,
        }}
      >
        Reject Verification
      </DialogTitle>

      <DialogContent>
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            fontSize: 11,
          }}
        >
          A rejection reason is required.
          This reason will be recorded in
          the Administration audit trail.
        </Alert>

        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Rejection reason"
          value={
            rejectionReason
          }
          onChange={event =>
            setRejectionReason(
              event.target.value
            )
          }
          placeholder="Enter the reason for rejecting this verification."
        />
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
        }}
      >
        <Button
          onClick={
            closeRejectDialog
          }
          sx={{
            textTransform:
              'none',
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          color="error"
          onClick={() =>
            submitKycDecision(
              'reject'
            )
          }
          disabled={
            !rejectionReason.trim() ||
            Boolean(
              actionLoading
            )
          }
          sx={{
            textTransform:
              'none',
            borderRadius: 1.5,
            fontWeight: 750,
          }}
        >
          Reject Verification
        </Button>
      </DialogActions>
    </Dialog>
  </Box>
)}  
            /* ============================================================
   PART 5 — FINANCIAL OPERATIONS
   TRANSFERS / DEPOSITS / WITHDRAWALS
   ============================================================ */

{section === 'transfers' && (
  <Box>
    <SectionHeading
      title="Bank Transfers"
      description="Monitor customer bank transfer activity and payment processing."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    {/* TRANSFER SUMMARY */}

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Transfer Volume"
          value={formatMoney(
            dashboard?.transfers
              ?.total_amount || 0
          )}
          subtitle={`${(
            dashboard?.transfers
              ?.count || 0
          ).toLocaleString()} transfers`}
          icon={<AccountBalance />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Processing"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.status
                ).toLowerCase() ===
                'processing'
            )
            .length.toLocaleString()}
          subtitle="Transfers in progress"
          icon={<SyncAlt />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Failed"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.status
                ).toLowerCase() ===
                'failed'
            )
            .length.toLocaleString()}
          subtitle="Requires investigation"
          icon={<ErrorOutline />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Transfer',
                  'Customer',
                  'Type',
                  'Amount',
                  'Status',
                  'Created',
                  'Actions',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(transaction =>
                  [
                    'transfer',
                    'bank_transfer',
                    'external_transfer',
                    'internal_transfer',
                    'internal_transfer_sent',
                    'internal_transfer_received',
                  ].includes(
                    String(
                      transaction.type
                    ).toLowerCase()
                  )
                )
                .map(transaction => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {String(
                          transaction.type ||
                            'transfer'
                        ).replaceAll(
                          '_',
                          ' '
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
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={
                          <Visibility
                            sx={{
                              fontSize: 15,
                            }}
                          />
                        }
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!transactions.some(
                transaction =>
                  [
                    'transfer',
                    'bank_transfer',
                    'external_transfer',
                    'internal_transfer',
                    'internal_transfer_sent',
                    'internal_transfer_received',
                  ].includes(
                    String(
                      transaction.type
                    ).toLowerCase()
                  )
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No bank transfers"
                      description="Bank transfer activity will appear here."
                      icon={
                        <AccountBalance />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

{/* ============================================================
   DEPOSITS
   ============================================================ */}

{section === 'deposits' && (
  <Box>
    <SectionHeading
      title="Deposits"
      description="Monitor customer deposits and incoming account funding."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={6}
      >
        <StatCard
          title="Deposit Volume"
          value={formatMoney(
            dashboard?.deposits
              ?.total_amount || 0
          )}
          subtitle={`${(
            dashboard?.deposits
              ?.count || 0
          ).toLocaleString()} deposits`}
          icon={<ArrowDownward />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={6}
      >
        <StatCard
          title="Pending Deposits"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                ).toLowerCase() ===
                  'deposit' &&
                [
                  'pending',
                  'processing',
                ].includes(
                  String(
                    transaction.status
                  ).toLowerCase()
                )
            )
            .length.toLocaleString()}
          subtitle="Awaiting completion"
          icon={<SyncAlt />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Deposit',
                  'Customer',
                  'Amount',
                  'Status',
                  'Balance Before',
                  'Balance After',
                  'Date',
                  'Actions',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(
                  transaction =>
                    String(
                      transaction.type
                    ).toLowerCase() ===
                    'deposit'
                )
                .map(transaction => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.account_number
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                          color:
                            ZENIMONIES.green,
                        }}
                      >
                        +{' '}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 650,
                        }}
                      >
                        {formatMoney(
                          transaction.balance_before,
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 750,
                        }}
                      >
                        {formatMoney(
                          transaction.balance_after,
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          whiteSpace:
                            'nowrap',
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={
                          <Visibility
                            sx={{
                              fontSize: 15,
                            }}
                          />
                        }
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!transactions.some(
                transaction =>
                  String(
                    transaction.type
                  ).toLowerCase() ===
                  'deposit'
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                  >
                    <EmptyState
                      title="No deposits found"
                      description="Deposit activity will appear here."
                      icon={
                        <ArrowDownward />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

{/* ============================================================
   WITHDRAWALS
   ============================================================ */}

{section === 'withdrawals' && (
  <Box>
    <SectionHeading
      title="Withdrawals"
      description="Monitor customer withdrawal activity and outgoing account funds."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    {/* WITHDRAWAL KPI */}

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Withdrawal Volume"
          value={formatMoney(
            dashboard?.withdrawals
              ?.total_amount || 0
          )}
          subtitle={`${(
            dashboard?.withdrawals
              ?.count || 0
          ).toLocaleString()} withdrawals`}
          icon={<ArrowUpward />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Pending Withdrawals"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                ).toLowerCase() ===
                  'withdrawal' &&
                [
                  'pending',
                  'processing',
                ].includes(
                  String(
                    transaction.status
                  ).toLowerCase()
                )
            )
            .length.toLocaleString()}
          subtitle="Awaiting processing"
          icon={<Schedule />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Failed Withdrawals"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                ).toLowerCase() ===
                  'withdrawal' &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'failed'
            )
            .length.toLocaleString()}
          subtitle="Requires investigation"
          icon={<ErrorOutline />}
        />
      </Grid>
    </Grid>

    {/* WITHDRAWAL NOTICE */}

    <Alert
      severity="info"
      sx={{
        mb: 2,
        borderRadius: 2,
        fontSize: 11,
      }}
    >
      Withdrawal records are displayed
      from the banking transaction ledger.
      Financial actions must be processed
      through authorized backend operations;
      the Administration dashboard does not
      perform frontend-only balance changes.
    </Alert>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 1100,
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  'Withdrawal',
                  'Customer',
                  'Account',
                  'Amount',
                  'Status',
                  'Balance Before',
                  'Balance After',
                  'Date',
                  'Actions',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(
                  transaction =>
                    String(
                      transaction.type
                    ).toLowerCase() ===
                    'withdrawal'
                )
                .map(transaction => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {
                          transaction.account_number
                        }
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 850,
                          color:
                            ZENIMONIES.danger,
                        }}
                      >
                        −{' '}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 650,
                        }}
                      >
                        {formatMoney(
                          transaction.balance_before,
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 750,
                        }}
                      >
                        {formatMoney(
                          transaction.balance_after,
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={
                          <Visibility
                            sx={{
                              fontSize: 15,
                            }}
                          />
                        }
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!transactions.some(
                transaction =>
                  String(
                    transaction.type
                  ).toLowerCase() ===
                  'withdrawal'
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                  >
                    <EmptyState
                      title="No withdrawals found"
                      description="Customer withdrawal activity will appear here."
                      icon={
                        <ArrowUpward />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}  
             /* ============================================================
   PART 6 — SERVICES / BUSINESS BANKING / POS
   ============================================================ */

/* ============================================================
   BILLS
   ============================================================ */

{section === 'bills' && (
  <Box>
    <SectionHeading
      title="Bills"
      description="Monitor customer bill-payment activity across the ZENIMONIES platform."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Bill Payments"
          value={transactions
            .filter(transaction =>
              String(
                transaction.type
              )
                .toLowerCase()
                .includes('bill')
            )
            .length.toLocaleString()}
          subtitle="Recorded bill transactions"
          icon={<ReceiptLong />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Completed"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                )
                  .toLowerCase()
                  .includes('bill') &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'completed'
            )
            .length.toLocaleString()}
          subtitle="Successful payments"
          icon={<CheckCircle />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Failed"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                )
                  .toLowerCase()
                  .includes('bill') &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'failed'
            )
            .length.toLocaleString()}
          subtitle="Requires investigation"
          icon={<ErrorOutline />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Reference',
                  'Customer',
                  'Service',
                  'Amount',
                  'Status',
                  'Date',
                  'Actions',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(transaction =>
                  String(
                    transaction.type
                  )
                    .toLowerCase()
                    .includes('bill')
                )
                .map(transaction => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {String(
                          transaction.type ||
                            'bill'
                        ).replaceAll(
                          '_',
                          ' '
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
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={
                          <Visibility
                            sx={{
                              fontSize: 15,
                            }}
                          />
                        }
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!transactions.some(
                transaction =>
                  String(
                    transaction.type
                  )
                    .toLowerCase()
                    .includes('bill')
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No bill payments"
                      description="Bill-payment activity will appear here."
                      icon={
                        <ReceiptLong />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   AIRTIME & DATA
   ============================================================ */

{section === 'airtime' && (
  <Box>
    <SectionHeading
      title="Airtime & Data"
      description="Monitor airtime and mobile-data service transactions."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Airtime & Data"
          value={transactions
            .filter(transaction => {
              const type =
                String(
                  transaction.type
                ).toLowerCase();

              return (
                type.includes(
                  'airtime'
                ) ||
                type.includes(
                  'data'
                )
              );
            })
            .length.toLocaleString()}
          subtitle="Service transactions"
          icon={<PhoneAndroid />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Completed"
          value={transactions
            .filter(transaction => {
              const type =
                String(
                  transaction.type
                ).toLowerCase();

              return (
                (
                  type.includes(
                    'airtime'
                  ) ||
                  type.includes(
                    'data'
                  )
                ) &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'completed'
              );
            })
            .length.toLocaleString()}
          subtitle="Successful services"
          icon={<CheckCircle />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Failed"
          value={transactions
            .filter(transaction => {
              const type =
                String(
                  transaction.type
                ).toLowerCase();

              return (
                (
                  type.includes(
                    'airtime'
                  ) ||
                  type.includes(
                    'data'
                  )
                ) &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'failed'
              );
            })
            .length.toLocaleString()}
          subtitle="Failed service transactions"
          icon={<ErrorOutline />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Reference',
                  'Customer',
                  'Service',
                  'Amount',
                  'Status',
                  'Date',
                  'Actions',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(transaction => {
                  const type =
                    String(
                      transaction.type
                    ).toLowerCase();

                  return (
                    type.includes(
                      'airtime'
                    ) ||
                    type.includes(
                      'data'
                    )
                  );
                })
                .map(transaction => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {String(
                          transaction.type ||
                            ''
                        ).replaceAll(
                          '_',
                          ' '
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
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!transactions.some(
                transaction => {
                  const type =
                    String(
                      transaction.type
                    ).toLowerCase();

                  return (
                    type.includes(
                      'airtime'
                    ) ||
                    type.includes(
                      'data'
                    )
                  );
                }
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No airtime or data transactions"
                      description="Airtime and data activity will appear here."
                      icon={
                        <PhoneAndroid />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   GIFT CARDS
   ============================================================ */

{section === 'giftcards' && (
  <Box>
    <SectionHeading
      title="Gift Cards"
      description="Monitor gift-card purchases, sales and related transaction activity."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Gift Card Activity"
          value={transactions
            .filter(transaction =>
              String(
                transaction.type
              )
                .toLowerCase()
                .includes(
                  'gift'
                )
            )
            .length.toLocaleString()}
          subtitle="Recorded transactions"
          icon={<CardGiftcard />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Completed"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                )
                  .toLowerCase()
                  .includes(
                    'gift'
                  ) &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'completed'
            )
            .length.toLocaleString()}
          subtitle="Completed activity"
          icon={<CheckCircle />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Failed"
          value={transactions
            .filter(
              transaction =>
                String(
                  transaction.type
                )
                  .toLowerCase()
                  .includes(
                    'gift'
                  ) &&
                String(
                  transaction.status
                ).toLowerCase() ===
                  'failed'
            )
            .length.toLocaleString()}
          subtitle="Failed activity"
          icon={<ErrorOutline />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Reference',
                  'Customer',
                  'Type',
                  'Amount',
                  'Status',
                  'Date',
                  'Actions',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions
                .filter(transaction =>
                  String(
                    transaction.type
                  )
                    .toLowerCase()
                    .includes(
                      'gift'
                    )
                )
                .map(transaction => (
                  <TableRow
                    key={transaction.id}
                    hover
                  >
                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.reference
                        }
                        subtitle={
                          transaction.id
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <TablePrimary
                        title={
                          transaction.full_name
                        }
                        subtitle={
                          transaction.email
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {String(
                          transaction.type ||
                            'gift card'
                        ).replaceAll(
                          '_',
                          ' '
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
                          transaction.currency
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          transaction.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {formatDate(
                          transaction.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={() =>
                          openTransaction(
                            transaction.id
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          fontWeight: 750,
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {!transactions.some(
                transaction =>
                  String(
                    transaction.type
                  )
                    .toLowerCase()
                    .includes(
                      'gift'
                    )
              ) && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                  >
                    <EmptyState
                      title="No gift-card transactions"
                      description="Gift-card activity will appear here."
                      icon={
                        <CardGiftcard />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   BUSINESS BANKING
   ============================================================ */

{section === 'business' && (
  <Box>
    <SectionHeading
      title="Business Banking"
      description="Administration workspace for ZENIMONIES business customers."
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Business Customers"
          value={users
            .filter(
              user =>
                String(
                  user.account_type ||
                    ''
                ).toLowerCase() ===
                'business'
            )
            .length.toLocaleString()}
          subtitle="Registered business accounts"
          icon={<Business />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Business KYC"
          value={users
            .filter(
              user =>
                String(
                  user.account_type ||
                    ''
                ).toLowerCase() ===
                'business' &&
                String(
                  user.kyc_status
                ).toLowerCase() ===
                  'pending'
            )
            .length.toLocaleString()}
          subtitle="Business verification requiring review"
          icon={<VerifiedUser />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="POS Access"
          value="Separate"
          subtitle="POS application is independently managed"
          icon={<PointOfSale />}
        />
      </Grid>
    </Grid>

    <Grid
      container
      spacing={2}
    >
      <Grid
        item
        xs={12}
        md={7}
      >
        <AdminCard>
          <CardContent>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              Business banking controls
            </Typography>

            <Typography
              sx={{
                mt: 0.75,
                fontSize: 11,
                lineHeight: 1.7,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Business customers use the
              same core banking experience
              as personal customers, with
              additional business verification
              and POS functionality.
            </Typography>

            <Divider
              sx={{
                my: 2,
              }}
            />

            <Stack
              spacing={1.1}
            >
              {[
                [
                  'Business verification',
                  'Levels 1–5',
                ],
                [
                  'CAC documentation',
                  'Required at Level 4 upgrade',
                ],
                [
                  'POS',
                  'Separate application and approval',
                ],
                [
                  'Business dashboard',
                  'Core banking features retained',
                ],
              ].map(
                ([label, value]) => (
                  <Stack
                    key={label}
                    direction="row"
                    justifyContent="space-between"
                    gap={2}
                    sx={{
                      py: 0.8,
                      borderBottom:
                        `1px solid ${ZENIMONIES.border}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color:
                          ZENIMONIES.textSecondary,
                        textAlign:
                          'right',
                      }}
                    >
                      {value}
                    </Typography>
                  </Stack>
                )
              )}
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>

      <Grid
        item
        xs={12}
        md={5}
      >
        <AdminCard>
          <CardContent>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              Business operations
            </Typography>

            <Typography
              sx={{
                mt: 0.75,
                mb: 2,
                fontSize: 11,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Use the dedicated operational
              areas for customer verification
              and POS administration.
            </Typography>

            <Stack
              spacing={1}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={() =>
                  setSection(
                    'kyc'
                  )
                }
                sx={{
                  justifyContent:
                    'space-between',
                  textTransform:
                    'none',
                  borderRadius: 1.75,
                  color:
                    ZENIMONIES.green,
                  borderColor:
                    ZENIMONIES.border,
                  fontWeight: 750,
                }}
              >
                Business KYC
                <ArrowForward />
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() =>
                  setSection(
                    'pos'
                  )
                }
                sx={{
                  justifyContent:
                    'space-between',
                  textTransform:
                    'none',
                  borderRadius: 1.75,
                  color:
                    ZENIMONIES.green,
                  borderColor:
                    ZENIMONIES.border,
                  fontWeight: 750,
                }}
              >
                POS Administration
                <ArrowForward />
              </Button>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>
    </Grid>
  </Box>
)}

/* ============================================================
   POS
   ============================================================ */

{section === 'pos' && (
  <Box>
    <SectionHeading
      title="POS"
      description="Manage ZENIMONIES business POS operations and terminal administration."
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="POS Model"
          value="Android"
          subtitle="Card reader + receipt printer"
          icon={<PointOfSale />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Approval"
          value="Separate"
          subtitle="POS approval does not block business account access"
          icon={<Verified />}
        />
      </Grid>

      <Grid
        item
        xs={12}
        sm={4}
      >
        <StatCard
          title="Operations"
          value="Ready"
          subtitle="Dedicated POS administration"
          icon={<Settings />}
        />
      </Grid>
    </Grid>

    <Grid
      container
      spacing={2}
    >
      <Grid
        item
        xs={12}
        md={7}
      >
        <AdminCard>
          <CardContent>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              POS administration
            </Typography>

            <Typography
              sx={{
                mt: 0.75,
                fontSize: 11,
                lineHeight: 1.7,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              POS applications and terminal
              approvals are managed separately
              from business-account registration.
              A business customer can access
              their account without waiting for
              POS approval.
            </Typography>

            <Divider
              sx={{
                my: 2,
              }}
            />

            <Stack
              spacing={1}
            >
              {[
                [
                  'Terminal',
                  'Android POS',
                ],
                [
                  'Card acceptance',
                  'Card reader',
                ],
                [
                  'Receipt',
                  'Integrated receipt printer',
                ],
                [
                  'Business access',
                  'Not dependent on POS approval',
                ],
              ].map(
                ([label, value]) => (
                  <Stack
                    key={label}
                    direction="row"
                    justifyContent="space-between"
                    sx={{
                      py: 0.8,
                      borderBottom:
                        `1px solid ${ZENIMONIES.border}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color:
                          ZENIMONIES.textSecondary,
                      }}
                    >
                      {value}
                    </Typography>
                  </Stack>
                )
              )}
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>

      <Grid
        item
        xs={12}
        md={5}
      >
        <AdminCard>
          <CardContent>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              POS controls
            </Typography>

            <Typography
              sx={{
                mt: 0.75,
                fontSize: 11,
                lineHeight: 1.7,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Terminal approval, assignment,
              activation, suspension and
              operational monitoring should be
              performed through authorized
              backend workflows.
            </Typography>

            <Alert
              severity="info"
              sx={{
                mt: 2,
                fontSize: 11,
                borderRadius: 2,
              }}
            >
              No frontend-only terminal approval
              or financial action is performed
              from this dashboard.
            </Alert>
          </CardContent>
        </AdminCard>
      </Grid>
    </Grid>
  </Box>
)} 
             /* ============================================================
   PART 7 — CUSTOMER CARE / RISK / COMPLIANCE
   ============================================================ */

/* ============================================================
   CUSTOMER CARE
   ============================================================ */

{section === 'support' && (
  <Box>
    <SectionHeading
      title="Customer Care"
      description="Manage authenticated customer support cases and operational assistance."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadSupportTickets}
          disabled={supportLoading}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Open Cases"
          value={supportTickets
            .filter(
              ticket =>
                ![
                  'resolved',
                  'closed',
                ].includes(
                  String(
                    ticket.status
                  ).toLowerCase()
                )
            )
            .length.toLocaleString()}
          subtitle="Cases requiring attention"
          icon={<SupportAgent />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Escalated"
          value={escalatedTickets.length.toLocaleString()}
          subtitle="Awaiting Administration"
          icon={<Warning />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Resolved"
          value={supportTickets
            .filter(
              ticket =>
                [
                  'resolved',
                  'closed',
                ].includes(
                  String(
                    ticket.status
                  ).toLowerCase()
                )
            )
            .length.toLocaleString()}
          subtitle="Completed support cases"
          icon={<CheckCircle />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent>
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <TextField
            fullWidth
            size="small"
            label="Search cases"
            placeholder="Ticket ID, customer or subject"
            value={supportSearch}
            onChange={event =>
              setSupportSearch(
                event.target.value
              )
            }
            onKeyDown={event => {
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
            value={supportStatusFilter}
            onChange={event =>
              setSupportStatusFilter(
                event.target.value
              )
            }
            sx={{
              minWidth: {
                xs: '100%',
                md: 180,
              },
            }}
          >
            <MenuItem value="all">
              All statuses
            </MenuItem>
            <MenuItem value="open">
              Open
            </MenuItem>
            <MenuItem value="pending">
              Pending
            </MenuItem>
            <MenuItem value="in_progress">
              In Progress
            </MenuItem>
            <MenuItem value="resolved">
              Resolved
            </MenuItem>
            <MenuItem value="closed">
              Closed
            </MenuItem>
          </TextField>

          <Button
            variant="outlined"
            onClick={loadSupportTickets}
            disabled={supportLoading}
            sx={{
              minWidth: 110,
              textTransform: 'none',
              borderColor:
                ZENIMONIES.border,
              color:
                ZENIMONIES.green,
              fontWeight: 750,
            }}
          >
            Search
          </Button>
        </Stack>

        {supportLoading ? (
          <Box
            sx={{
              py: 8,
              display: 'flex',
              justifyContent:
                'center',
            }}
          >
            <CircularProgress
              size={30}
              sx={{
                color:
                  ZENIMONIES.green,
              }}
            />
          </Box>
        ) : (
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
                    'Ticket',
                    'Customer',
                    'Subject',
                    'Priority',
                    'Status',
                    'Created',
                    'Action',
                  ].map(heading => (
                    <TableCell
                      key={heading}
                      sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          ZENIMONIES.textMuted,
                        background:
                          '#FAFBFA',
                        textTransform:
                          'uppercase',
                      }}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {supportTickets.map(
                  ticket => (
                    <TableRow
                      key={ticket.id}
                      hover
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 800,
                            color:
                              ZENIMONIES.green,
                          }}
                        >
                          {ticket.ticket_number ||
                            ticket.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {ticket.customer_name ||
                            ticket.full_name ||
                            'Customer'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                          }}
                        >
                          {ticket.subject ||
                            'Support case'}
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
                            fontSize: 9,
                            fontWeight: 800,
                            textTransform:
                              'capitalize',
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <StatusChip
                          status={
                            ticket.status
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color:
                              ZENIMONIES.textSecondary,
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
                            textTransform:
                              'none',
                            color:
                              ZENIMONIES.green,
                            fontWeight: 750,
                          }}
                        >
                          Review
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
                    >
                      <EmptyState
                        title="No customer-care cases"
                        description="There are no support cases matching the current filters."
                        icon={
                          <SupportAgent />
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   ESCALATED CASES
   ============================================================ */

{section === 'escalated-cases' && (
  <Box>
    <SectionHeading
      title="Escalated Cases"
      description="Cases forwarded by Customer Care because administrative investigation or action is required."
      action={
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadEscalatedTickets}
          disabled={escalationLoading}
          sx={{
            textTransform: 'none',
            color: ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Refresh
        </Button>
      }
    />

    <Alert
      severity="warning"
      sx={{
        mb: 2,
        borderRadius: 2,
        fontSize: 11,
      }}
    >
      Taking an escalated case transfers
      administrative responsibility from
      Customer Care to Administration.
      All administrative actions must be
      authenticated and audited.
    </Alert>

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
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
                  'Status',
                  'Escalated',
                  'Action',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {escalatedTickets.map(
                ticket => (
                  <TableRow
                    key={ticket.id}
                    hover
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color:
                            ZENIMONIES.green,
                        }}
                      >
                        {ticket.ticket_number ||
                          ticket.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {ticket.customer_name ||
                          ticket.full_name ||
                          'Customer'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 11,
                        }}
                      >
                        {ticket.subject ||
                          'Escalated case'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        status={
                          ticket.status
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 10,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {formatDate(
                          ticket.escalated_at ||
                            ticket.created_at
                        )}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          openEscalatedTicket(
                            ticket.id
                          )
                        }
                        disabled={
                          escalationLoading
                        }
                        sx={{
                          textTransform:
                            'none',
                          color:
                            ZENIMONIES.green,
                          borderColor:
                            ZENIMONIES.border,
                          fontWeight: 750,
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}

              {escalatedTickets.length ===
                0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                  >
                    <EmptyState
                      title="No escalated cases"
                      description="Customer Care has not forwarded any cases requiring Administration."
                      icon={
                        <Warning />
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   CUSTOMER CARE AGENTS
   ============================================================ */

{section === 'customer-care-agents' && (
  <Box>
    <SectionHeading
      title="Customer Care Agents"
      description="Monitor the Customer Care team and keep administrative permissions separated."
    />

    <AdminCard>
      <CardContent>
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={2}
          alignItems={{
            xs: 'flex-start',
            md: 'center',
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              background:
                '#eaf7f1',
              color:
                ZENIMONIES.green,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              fontSize: 23,
              fontWeight: 900,
            }}
          >
            ?
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              Customer Care access boundary
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                lineHeight: 1.7,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Customer Care agents are
              authenticated separately and
              must not have access to
              customer balances, full account
              numbers, PINs, OTPs, passwords,
              card secrets, KYC approval,
              transaction reversal or
              administrative controls.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Alert
          severity="success"
          sx={{
            fontSize: 11,
            borderRadius: 2,
          }}
        >
          Customer Care and Administration
          remain separate security roles.
          Administrative actions stay inside
          the Administration workspace.
        </Alert>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   FRAUD
   ============================================================ */

{section === 'fraud' && (
  <Box>
    <SectionHeading
      title="Fraud & Investigations"
      description="Central risk workspace for reported transactions, investigations and compliance escalation."
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Transaction Reports"
          value="Review"
          subtitle="Reported payment activity"
          icon={<Warning />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Investigations"
          value="Active"
          subtitle="Administrative investigation queue"
          icon={<Search />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Legal Escalation"
          value="Controlled"
          subtitle="Escalate only after investigation"
          icon={<Gavel />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 850,
          }}
        >
          Fraud investigation workflow
        </Typography>

        <Typography
          sx={{
            mt: 0.75,
            fontSize: 11,
            lineHeight: 1.7,
            color:
              ZENIMONIES.textSecondary,
          }}
        >
          Customer-reported transactions
          should enter an investigation case.
          A report does not automatically mean
          that the customer or transaction is
          fraudulent.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Grid
          container
          spacing={1.5}
        >
          {[
            [
              '01',
              'Reported',
              'Transaction has been reported for investigation.',
            ],
            [
              '02',
              'Investigating',
              'Administration reviews transaction details, timeline and related activity.',
            ],
            [
              '03',
              'Compliance Review',
              'Suspicious activity can be escalated to Compliance.',
            ],
            [
              '04',
              'Legal Escalation',
              'Confirmed matters may be escalated through the approved legal workflow.',
            ],
          ].map(
            ([number, title, description]) => (
              <Grid
                item
                xs={12}
                sm={6}
                key={number}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    borderColor:
                      ZENIMONIES.border,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius:
                          '9px',
                        background:
                          '#eaf7f1',
                        color:
                          ZENIMONIES.green,
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        fontSize: 10,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {number}
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {title}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.35,
                          fontSize: 10,
                          lineHeight: 1.6,
                          color:
                            ZENIMONIES.textSecondary,
                        }}
                      >
                        {description}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            )
          )}
        </Grid>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   COMPLIANCE
   ============================================================ */

{section === 'compliance' && (
  <Box>
    <SectionHeading
      title="Compliance"
      description="Monitor KYC, transaction risk and regulatory-control workflows."
    />

    <Grid
      container
      spacing={1.75}
      sx={{ mb: 2 }}
    >
      <Grid item xs={12} sm={4}>
        <StatCard
          title="KYC Queue"
          value={kycRecords
            .filter(
              record =>
                String(
                  record.bvn_verification_status ||
                    record.id_verification_status ||
                    record.tier_3_verification_status ||
                    ''
                ).toLowerCase() ===
                'pending'
            )
            .length.toLocaleString()}
          subtitle="Verification records requiring review"
          icon={<VerifiedUser />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Risk Controls"
          value="Active"
          subtitle="Administrative controls enabled"
          icon={<Security />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Auditability"
          value="Enabled"
          subtitle="Administrative actions are logged"
          icon={<History />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 850,
          }}
        >
          Compliance control centre
        </Typography>

        <Typography
          sx={{
            mt: 0.75,
            fontSize: 11,
            lineHeight: 1.7,
            color:
              ZENIMONIES.textSecondary,
          }}
        >
          Compliance activity should remain
          evidence-based and auditable. KYC
          decisions, fraud investigations,
          administrative actions and relevant
          escalations should have a clear
          history.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          {[
            'KYC verification and rejection decisions',
            'Suspicious transaction investigation',
            'Fraud and legal escalation',
            'Administrative account actions',
            'Customer Care administrative escalations',
            'Audit history and investigation notes',
          ].map(item => (
            <Stack
              key={item}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <CheckCircle
                sx={{
                  fontSize: 16,
                  color:
                    ZENIMONIES.green,
                }}
              />

              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 650,
                }}
              >
                {item}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   AUDIT LOGS
   ============================================================ */

{section === 'audit' && (
  <Box>
    <SectionHeading
      title="Audit Logs"
      description="Administrative activity and security events recorded for accountability."
    />

    <AdminCard>
      <CardContent>
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={1.5}
          alignItems={{
            xs: 'flex-start',
            md: 'center',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background:
                '#eaf7f1',
              color:
                ZENIMONIES.green,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              fontSize: 21,
              fontWeight: 900,
            }}
          >
            #
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 850,
              }}
            >
              Audit trail
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                lineHeight: 1.7,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Administrative actions such as
              account status changes, KYC
              decisions, fraud reports and
              support escalations should be
              retained in the audit system.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Alert
          severity="info"
          sx={{
            fontSize: 11,
            borderRadius: 2,
          }}
        >
          Audit records are not customer
          transaction records. They document
          who performed an administrative
          action, when it occurred and what
          action was taken.
        </Alert>

        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            background:
              '#FAFBFA',
            border:
              `1px solid ${ZENIMONIES.border}`,
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            Recommended audit events
          </Typography>

          <Typography
            sx={{
              mt: 0.75,
              fontSize: 10,
              lineHeight: 1.7,
              color:
                ZENIMONIES.textSecondary,
            }}
          >
            Login • Logout • KYC decision •
            Account status change • Transaction
            fraud report • Customer Care
            escalation • Administrative
            takeover • Financial reversal •
            Revenue settlement • Security
            configuration.
          </Typography>
        </Box>
      </CardContent>
    </AdminCard>
  </Box>
)} 
           /* ============================================================
   PART 8 — REVENUE / REVENUE LEDGER / SECURITY / SETTINGS
   ============================================================ */

/* ============================================================
   REVENUE & PROFIT
   ============================================================ */

{section === 'revenue' && (
  <Box>
    <SectionHeading
      title="Revenue & Profit"
      description="Monitor ZENIMONIES service revenue, provider costs, margins and settlement availability."
    />

    <Alert
      severity="info"
      sx={{
        mb: 2,
        borderRadius: 2,
        fontSize: 11,
      }}
    >
      Revenue is separate from customer funds.
      Customer charges, provider costs and
      ZENIMONIES revenue must be tracked
      independently. Gross fees must not be
      treated as profit automatically.
    </Alert>

    <Grid
      container
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Today's Revenue"
          value="₦0.00"
          subtitle="Net recorded service revenue"
          icon={<TrendingUp />}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="This Month"
          value="₦0.00"
          subtitle="Month-to-date revenue"
          icon={<CalendarToday />}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Provider Costs"
          value="₦0.00"
          subtitle="Recorded provider expenses"
          icon={<AccountBalance />}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Available Settlement"
          value="₦0.00"
          subtitle="Approved revenue available for settlement"
          icon={<Payments />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 850,
            color: ZENIMONIES.textPrimary,
          }}
        >
          Revenue sources
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            mb: 2,
            fontSize: 11,
            color: ZENIMONIES.textSecondary,
          }}
        >
          Revenue should be calculated from
          approved financial records rather than
          frontend estimates.
        </Typography>

        <Grid
          container
          spacing={1.25}
        >
          {[
            [
              'Transfer Fees',
              'Bank transfer service charges',
            ],
            [
              'Withdrawal Fees',
              'Customer withdrawal service charges',
            ],
            [
              'Bill Payment Fees',
              'Electricity, cable, internet and other bill services',
            ],
            [
              'Airtime & Data',
              'Airtime and data service margin',
            ],
            [
              'Gift Cards',
              'Approved gift-card margin or service fee',
            ],
            [
              'POS Fees',
              'Approved POS service charges',
            ],
          ].map(
            ([title, description]) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={title}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    height: '100%',
                    borderRadius: 2,
                    borderColor:
                      ZENIMONIES.border,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 10,
                      lineHeight: 1.6,
                      color:
                        ZENIMONIES.textSecondary,
                    }}
                  >
                    {description}
                  </Typography>
                </Paper>
              </Grid>
            )
          )}
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={1.5}
        >
          <Button
            variant="outlined"
            onClick={() =>
              handleNavigation(
                'revenue-ledger'
              )
            }
            sx={{
              textTransform: 'none',
              borderColor:
                ZENIMONIES.border,
              color:
                ZENIMONIES.green,
              fontWeight: 750,
            }}
          >
            Open Revenue Ledger
          </Button>

          <Button
            variant="contained"
            disabled
            sx={{
              textTransform: 'none',
              background:
                ZENIMONIES.green,
              fontWeight: 750,
            }}
          >
            Withdraw Revenue
          </Button>
        </Stack>

        <Typography
          sx={{
            mt: 1,
            fontSize: 10,
            color:
              ZENIMONIES.textMuted,
          }}
        >
          Revenue withdrawal will be enabled
          only after the secure backend settlement
          workflow is connected.
        </Typography>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   REVENUE LEDGER
   ============================================================ */

{section === 'revenue-ledger' && (
  <Box>
    <SectionHeading
      title="Revenue Ledger"
      description="Detailed ledger of customer charges, provider costs and ZENIMONIES revenue."
      action={
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            handleNavigation(
              'revenue'
            )
          }
          sx={{
            textTransform: 'none',
            borderColor:
              ZENIMONIES.border,
            color:
              ZENIMONIES.green,
            fontWeight: 750,
          }}
        >
          Revenue Overview
        </Button>
      }
    />

    <AdminCard>
      <CardContent
        sx={{
          p: 0,
          '&:last-child': {
            pb: 0,
          },
        }}
      >
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
                  'Revenue Ref',
                  'Source',
                  'Customer Charge',
                  'Provider Cost',
                  'ZENIMONIES Revenue',
                  'Transaction',
                  'Date',
                ].map(heading => (
                  <TableCell
                    key={heading}
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color:
                        ZENIMONIES.textMuted,
                      background:
                        '#FAFBFA',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={7}
                >
                  <EmptyState
                    title="Revenue ledger is ready"
                    description="Live revenue records will appear here once the revenue ledger backend is connected."
                    icon={
                      <AccountBalanceWallet />
                    }
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   SECURITY
   ============================================================ */

{section === 'security' && (
  <Box>
    <SectionHeading
      title="Security"
      description="Monitor administrator security events, suspicious activity and access controls."
    />

    <Grid
      container
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Grid item xs={12} sm={4}>
        <StatCard
          title="Admin Access"
          value="Protected"
          subtitle="Administrator role validation"
          icon={<Security />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Audit Trail"
          value="Enabled"
          subtitle="Administrative activity logging"
          icon={<History />}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="2FA"
          value="Next Phase"
          subtitle="Admin two-factor security"
          icon={<Lock />}
        />
      </Grid>
    </Grid>

    <AdminCard>
      <CardContent>
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={2}
        >
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: 2,
              background:
                '#eaf7f1',
              color:
                ZENIMONIES.green,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              fontSize: 23,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            🔐
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              Administrator security
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                lineHeight: 1.7,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              The Administration portal uses
              administrator authentication and
              role validation. Financial and
              account-changing actions should
              also be protected with audit logging,
              current-state validation and
              appropriate backend authorization.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid
          container
          spacing={1.25}
        >
          {[
            [
              'Admin authentication',
              'JWT and administrator role validation',
            ],
            [
              'Server sessions',
              'Authenticated administrator sessions',
            ],
            [
              'Audit logging',
              'Important administrative operations are recorded',
            ],
            [
              'Financial controls',
              'Financial actions must be validated server-side',
            ],
            [
              '2FA',
              'Two-factor authentication will be added next',
            ],
            [
              'Security monitoring',
              'Suspicious administrative activity should be investigated',
            ],
          ].map(
            ([title, description]) => (
              <Grid
                item
                xs={12}
                sm={6}
                key={title}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    borderColor:
                      ZENIMONIES.border,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      fontSize: 10,
                      lineHeight: 1.6,
                      color:
                        ZENIMONIES.textSecondary,
                    }}
                  >
                    {description}
                  </Typography>
                </Paper>
              </Grid>
            )
          )}
        </Grid>
      </CardContent>
    </AdminCard>
  </Box>
)}

/* ============================================================
   ADMIN SETTINGS
   ============================================================ */

{section === 'settings' && (
  <Box>
    <SectionHeading
      title="Admin Settings"
      description="Manage administrator preferences, security configuration and operational controls."
    />

    <Grid
      container
      spacing={1.75}
    >
      <Grid item xs={12} md={7}>
        <AdminCard>
          <CardContent>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              Administrator profile
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                mb: 2,
                fontSize: 11,
                color:
                  ZENIMONIES.textSecondary,
              }}
            >
              Your administrator identity is
              authenticated through the secure
              Administration login.
            </Typography>

            <Stack spacing={1.25}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor:
                    ZENIMONIES.border,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    color:
                      ZENIMONIES.textMuted,
                  }}
                >
                  Role
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  Administrator
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor:
                    ZENIMONIES.border,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    color:
                      ZENIMONIES.textMuted,
                  }}
                >
                  Portal
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  ZENIMONIES Banking Administration
                </Typography>
              </Paper>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>

      <Grid item xs={12} md={5}>
        <AdminCard>
          <CardContent>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              Security settings
            </Typography>

            <Stack
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor:
                    ZENIMONIES.border,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Administrator 2FA
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontSize: 10,
                        color:
                          ZENIMONIES.textSecondary,
                      }}
                    >
                      Coming next
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label="Planned"
                    sx={{
                      fontWeight: 800,
                      color:
                        ZENIMONIES.green,
                      background:
                        '#eaf7f1',
                    }}
                  />
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor:
                    ZENIMONIES.border,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Audit logging
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontSize: 10,
                        color:
                          ZENIMONIES.textSecondary,
                      }}
                    >
                      Administrative actions
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label="Active"
                    color="success"
                    sx={{
                      fontWeight: 800,
                    }}
                  />
                </Stack>
              </Paper>
            </Stack>
          </CardContent>
        </AdminCard>
      </Grid>
    </Grid>
  </Box>
)}   
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
