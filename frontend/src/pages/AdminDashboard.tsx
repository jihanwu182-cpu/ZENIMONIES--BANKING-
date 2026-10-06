import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const SIDEBAR_WIDTH = 255;

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

type KycType = 'bvn' | 'tier2' | 'tier3';
type KycDecision = 'verify' | 'reject';

type Section =
  | 'overview'
  | 'customers'
  | 'kyc'
  | 'accounts'
  | 'transactions'
  | 'transfers'
  | 'bills'
  | 'airtime'
  | 'giftcards'
  | 'business'
  | 'pos'
  | 'security'
  | 'settings';

/* ============================================================
   AUTH
   ============================================================ */

const getAdminToken = (): string | null => {
  return localStorage.getItem('adminToken');
};

/* ============================================================
   SIDEBAR ITEMS
   ============================================================ */

const NAVIGATION: {
  key: Section;
  label: string;
  icon: string;
}[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: '⌂',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: '♙',
  },
  {
    key: 'kyc',
    label: 'KYC & Verification',
    icon: '✓',
  },
  {
    key: 'accounts',
    label: 'Accounts',
    icon: '▣',
  },
  {
    key: 'transactions',
    label: 'Transactions',
    icon: '↔',
  },
  {
    key: 'transfers',
    label: 'Transfers',
    icon: '⇄',
  },
  {
    key: 'bills',
    label: 'Bills',
    icon: '▤',
  },
  {
    key: 'airtime',
    label: 'Airtime & Data',
    icon: '◉',
  },
  {
    key: 'giftcards',
    label: 'Gift Cards',
    icon: '▧',
  },
  {
    key: 'business',
    label: 'Business Banking',
    icon: '▥',
  },
  {
    key: 'pos',
    label: 'POS',
    icon: '▦',
  },
  {
    key: 'security',
    label: 'Security',
    icon: '◆',
  },
  {
    key: 'settings',
    label: 'Admin Settings',
    icon: '⚙',
  },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  const [error, setError] =
    useState('');

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

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
     API LOADERS
     ============================================================ */

  const loadDashboard = async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/dashboard`,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to load dashboard.'
      );
    }

    setDashboard(data.dashboard);
  };

  const loadUsers = async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/users`,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Unable to load users.'
      );
    }

    setUsers(data.users || []);
  };

  const loadKyc = async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/kyc`,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

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
    const response = await fetch(
      `${API_BASE_URL}/admin/transactions`,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

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

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentToken =
        getAdminToken();

      if (!currentToken) {
        navigate('/admin/login', {
          replace: true,
        });
        return;
      }

      await Promise.all([
        loadDashboard(),
        loadUsers(),
        loadKyc(),
        loadTransactions(),
      ]);
    } catch (err: any) {
      console.error(
        'Admin dashboard loading error:',
        err
      );

      const message =
        err?.message ||
        'Unable to load administrator dashboard.';

      setError(message);

      if (
        message
          .toLowerCase()
          .includes('unauthorized') ||
        message
          .toLowerCase()
          .includes('token') ||
        message
          .toLowerCase()
          .includes('expired')
      ) {
        localStorage.removeItem(
          'adminToken'
        );
        localStorage.removeItem(
          'admin'
        );

        navigate('/admin/login', {
          replace: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Initial dashboard load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     LOGOUT
     ============================================================ */

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
     USER STATUS
     ============================================================ */

  const updateUserStatus = async (
    userId: string,
    status: string
  ) => {
    try {
      setActionLoading(userId);
      setError('');

      const response =
        await fetch(
          `${API_BASE_URL}/admin/users/${userId}/status`,
          {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
              status,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to update user status.'
        );
      }

      setUsers(
        (current) =>
          current.map(
            (user) =>
              user.id === userId
                ? {
                    ...user,
                    status,
                  }
                : user
          )
      );

      await loadDashboard();
    } catch (err: any) {
      console.error(
        'Update user status error:',
        err
      );

      setError(
        err?.message ||
          'Unable to update user status.'
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
      getKycStatus(
        record,
        type
      ) === 'pending'
    );
  };

  const isKycVerified = (
    record: KycRecord,
    type: KycType
  ) => {
    return (
      getKycStatus(
        record,
        type
      ) === 'verified'
    );
  };

  const openKycReview = (
    record: KycRecord,
    type: KycType
  ) => {
    setSelectedKyc(record);
    setSelectedType(type);
    setDecisionMessage('');
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
  };

  const openRejectDialog = () => {
    setRejectionReason('');
    setDecisionMessage('');
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

  const submitKycDecision =
    async (
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
        setActionLoading(
          `${selectedKyc.id}-${selectedType}`
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
     FORMATTERS
     ============================================================ */

  const formatMoney = (
    value:
      | string
      | number
      | null
      | undefined
  ) => {
    const amount =
      Number(value || 0);

    return `₦${amount.toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (
    value:
      | string
      | null
      | undefined
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
      'en-NG'
    );
  };

  const statusColor = (
    status: string
  ):
    | 'success'
    | 'warning'
    | 'error'
    | 'default'
    | 'info' => {
    switch (
      String(
        status || ''
      ).toLowerCase()
    ) {
      case 'active':
      case 'approved':
      case 'completed':
      case 'verified':
        return 'success';

      case 'pending':
      case 'under_review':
        return 'warning';

      case 'rejected':
      case 'failed':
      case 'blocked':
      case 'suspended':
        return 'error';

      default:
        return 'default';
    }
  };

  const getStatusLabel = (
    status: string
  ) => {
    const normalized =
      String(
        status || ''
      ).toLowerCase();

    const labels: Record<
      string,
      string
    > = {
      not_verified:
        'Not Verified',
      'not verified':
        'Not Verified',
      under_review:
        'Under Review',
      verified: 'Verified',
      rejected: 'Rejected',
      pending: 'Pending',
      active: 'Active',
      suspended: 'Suspended',
      blocked: 'Blocked',
      failed: 'Failed',
      completed: 'Completed',
    };

    return (
      labels[normalized] ||
      status ||
      '—'
    );
  };

  const getDocumentTypeLabel =
    (
      value:
        | string
        | null
        | undefined
    ) => {
      if (!value) {
        return '—';
      }

      return value
        .replace(
          /_/g,
          ' '
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    };

  const getTier3MethodLabel =
    (
      value:
        | string
        | null
        | undefined
    ) => {
      if (!value) {
        return '—';
      }

      return value
        .replace(
          /_/g,
          ' '
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    };

  /* ============================================================
     KYC DOCUMENT PREVIEW
     ============================================================ */

  const renderDocumentPreview =
    (
      url:
        | string
        | null
        | undefined,
      label: string
    ) => {
      if (!url) {
        return (
          <Box
            sx={{
              p: 2,
              border:
                '1px dashed #cfd8d4',
              borderRadius: 2,
              background:
                '#f7faf8',
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {label}: Not submitted
            </Typography>
          </Box>
        );
      }

      const lowerUrl =
        url.toLowerCase();

      const isPdf =
        lowerUrl.includes(
          '.pdf'
        ) ||
        lowerUrl.includes(
          'application/pdf'
        );

      if (isPdf) {
        return (
          <Button
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            fullWidth
            sx={{
              justifyContent:
                'flex-start',
              borderColor:
                '#087f5b',
              color: '#087f5b',
            }}
          >
            📄 Open {label}
          </Button>
        );
      }

      return (
        <Box>
          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ mb: 1 }}
          >
            {label}
          </Typography>

          <Box
            component="img"
            src={url}
            alt={label}
            sx={{
              display: 'block',
              width: '100%',
              maxHeight: 300,
              objectFit:
                'contain',
              borderRadius: 2,
              border:
                '1px solid #d7e1dc',
              background:
                '#f7faf8',
              cursor: 'pointer',
            }}
            onClick={() =>
              window.open(
                url,
                '_blank',
                'noopener,noreferrer'
              )
            }
          />
        </Box>
      );
    };

  /* ============================================================
     MOBILE NAVIGATION
     ============================================================ */

  const handleNavigation = (
    value: Section
  ) => {
    setSection(value);

    if (isMobile) {
      setMobileDrawerOpen(
        false
      );
    }

    setError('');
  };

  /* ============================================================
     SIDEBAR
     ============================================================ */

  const sidebar = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          '#082d23',
        color: '#ffffff',
      }}
    >
      {/* BRAND */}

      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          borderBottom:
            '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography
          sx={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing:
              '-0.5px',
          }}
        >
          ZENIMONIES
        </Typography>

        <Typography
          sx={{
            mt: 0.3,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 2.5,
            color:
              'rgba(255,255,255,0.55)',
          }}
        >
          ADMIN PORTAL
        </Typography>
      </Box>

      {/* NAV */}

      <List
        sx={{
          px: 1.2,
          py: 1.5,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {NAVIGATION.map(
          (item) => {
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
                  minHeight: 43,
                  mb: 0.4,
                  borderRadius:
                    1.7,
                  color: active
                    ? '#ffffff'
                    : 'rgba(255,255,255,0.68)',
                  backgroundColor:
                    active
                      ? '#087f5b'
                      : 'transparent',
                  '&:hover':
                    {
                      backgroundColor:
                        active
                          ? '#087f5b'
                          : 'rgba(255,255,255,0.06)',
                    },
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    fontSize: 17,
                    fontWeight: 800,
                    textAlign:
                      'center',
                    mr: 0.8,
                  }}
                >
                  {
                    item.icon
                  }
                </Box>

                <ListItemText
                  primary={
                    item.label
                  }
                  primaryTypographyProps={{
                    fontSize: 13,
                    fontWeight:
                      active
                        ? 800
                        : 600,
                  }}
                />
              </ListItemButton>
            );
          }
        )}
      </List>

      {/* LOGOUT */}

      <Box
        sx={{
          p: 1.5,
          borderTop:
            '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Button
          fullWidth
          onClick={
            handleLogout
          }
          sx={{
            justifyContent:
              'flex-start',
            color:
              'rgba(255,255,255,0.72)',
            textTransform:
              'none',
            borderRadius:
              1.5,
            px: 1.5,
            '&:hover':
              {
                color:
                  '#ffffff',
                backgroundColor:
                  'rgba(255,255,255,0.07)',
              },
          }}
        >
          ⇥
          <Box
            component="span"
            sx={{
              ml: 1.5,
              fontWeight: 700,
            }}
          >
            Sign out
          </Box>
        </Button>
      </Box>
    </Box>
  );

  /* ============================================================
     PAGE HEADER
     ============================================================ */

  const getSectionTitle = () => {
    const item =
      NAVIGATION.find(
        (entry) =>
          entry.key ===
          section
      );

    return (
      item?.label ||
      'Overview'
    );
  };

  /* ============================================================
     OVERVIEW
     ============================================================ */

  const renderOverview = () => {
    if (!dashboard) {
      return null;
    }

    const recentTransactions =
      transactions.slice(
        0,
        6
      );

    const pendingKyc =
      kycRecords.filter(
        (record) =>
          record.verification_status ===
            'pending' ||
          record.bvn_verification_status ===
            'pending' ||
          record.id_verification_status ===
            'pending' ||
          record.tier_3_verification_status ===
            'pending'
      ).slice(0, 5);

    return (
      <Stack spacing={3}>
        {/* STATISTICS */}

        <Grid
          container
          spacing={2}
        >
          <StatCard
            title="Total Customers"
            value={
              dashboard
                .users
                .total
            }
            subtitle={`${dashboard.users.active} active`}
            icon="♙"
          />

          <StatCard
            title="Pending KYC"
            value={
              dashboard
                .kyc
                .pending
            }
            subtitle={`${dashboard.kyc.approved} approved`}
            icon="✓"
            warning={
              dashboard.kyc
                .pending >
              0
            }
          />

          <StatCard
            title="Total Deposits"
            value={formatMoney(
              dashboard
                .deposits
                .total_amount
            )}
            subtitle={`${dashboard.deposits.count} deposits`}
            icon="↓"
          />

          <StatCard
            title="Total Transfers"
            value={formatMoney(
              dashboard
                .transfers
                .total_amount
            )}
            subtitle={`${dashboard.transfers.count} transfers`}
            icon="⇄"
          />

          <StatCard
            title="Withdrawals"
            value={formatMoney(
              dashboard
                .withdrawals
                .total_amount
            )}
            subtitle={`${dashboard.withdrawals.count} withdrawals`}
            icon="↑"
          />

          <StatCard
            title="Pending Transactions"
            value={
              dashboard
                .transactions
                .pending
            }
            subtitle="Requires monitoring"
            icon="◷"
            warning={
              dashboard
                .transactions
                .pending >
              0
            }
          />

          <StatCard
            title="Failed Transactions"
            value={
              dashboard
                .transactions
                .failed
            }
            subtitle="Requires investigation"
            icon="!"
            danger={
              dashboard
                .transactions
                .failed >
              0
            }
          />

          <StatCard
            title="Rejected KYC"
            value={
              dashboard
                .kyc
                .rejected
            }
            subtitle="Customer submissions"
            icon="×"
          />
        </Grid>

        {/* ACTIVITY */}

        <Grid
          container
          spacing={2}
        >
          <Grid
            item
            xs={12}
            lg={7}
          >
            <Card
              sx={{
                border:
                  '1px solid #e2ebe6',
                borderRadius: 3,
                boxShadow:
                  '0 4px 18px rgba(20,65,48,0.04)',
              }}
            >
              <CardContent>
                <SectionHeading
                  title="Recent Transactions"
                  subtitle="Latest transaction activity"
                  action={
                    <Button
                      size="small"
                      onClick={() =>
                        handleNavigation(
                          'transactions'
                        )
                      }
                      sx={{
                        color:
                          '#087f5b',
                        textTransform:
                          'none',
                        fontWeight:
                          800,
                      }}
                    >
                      View all
                    </Button>
                  }
                />

                <TableContainer>
                  <Table
                    size="small"
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          Customer
                        </TableCell>
                        <TableCell>
                          Type
                        </TableCell>
                        <TableCell>
                          Amount
                        </TableCell>
                        <TableCell>
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {recentTransactions.map(
                        (
                          transaction
                        ) => (
                          <TableRow
                            key={
                              transaction.id
                            }
                          >
                            <TableCell>
                              <Typography
                                fontWeight={700}
                                fontSize={13}
                              >
                                {
                                  transaction.full_name
                                }
                              </Typography>

                              <Typography
                                fontSize={11}
                                color="text.secondary"
                              >
                                {
                                  transaction.account_number
                                }
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography
                                fontSize={12}
                              >
                                {
                                  transaction.type
                                }
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography
                                fontWeight={700}
                                fontSize={12}
                              >
                                {formatMoney(
                                  transaction.amount
                                )}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={getStatusLabel(
                                  transaction.status
                                )}
                                color={statusColor(
                                  transaction.status
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {recentTransactions.length ===
                  0 && (
                  <EmptyState text="No recent transactions." />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid
            item
            xs={12}
            lg={5}
          >
            <Card
              sx={{
                height:
                  '100%',
                border:
                  '1px solid #e2ebe6',
                borderRadius: 3,
                boxShadow:
                  '0 4px 18px rgba(20,65,48,0.04)',
              }}
            >
              <CardContent>
                <SectionHeading
                  title="KYC Requiring Attention"
                  subtitle="Submissions awaiting review"
                  action={
                    <Button
                      size="small"
                      onClick={() =>
                        handleNavigation(
                          'kyc'
                        )
                      }
                      sx={{
                        color:
                          '#087f5b',
                        textTransform:
                          'none',
                        fontWeight:
                          800,
                      }}
                    >
                      Review
                    </Button>
                  }
                />

                <Stack
                  spacing={1.2}
                >
                  {pendingKyc.map(
                    (
                      record
                    ) => (
                      <Paper
                        key={
                          record.id
                        }
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius:
                            2,
                          borderColor:
                            '#e3ebe7',
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={2}
                        >
                          <Box>
                            <Typography
                              fontWeight={800}
                              fontSize={13}
                            >
                              {
                                record.full_name
                              }
                            </Typography>

                            <Typography
                              fontSize={11}
                              color="text.secondary"
                            >
                              {
                                record.email
                              }
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={getStatusLabel(
                              record.verification_status
                            )}
                            color={statusColor(
                              record.verification_status
                            )}
                          />
                        </Stack>
                      </Paper>
                    )
                  )}

                  {pendingKyc.length ===
                    0 && (
                    <EmptyState text="No KYC submissions require attention." />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* SYSTEM STATUS */}

        <Card
          sx={{
            border:
              '1px solid #e2ebe6',
            borderRadius: 3,
            boxShadow:
              '0 4px 18px rgba(20,65,48,0.04)',
          }}
        >
          <CardContent>
            <SectionHeading
              title="System Overview"
              subtitle="Current administration environment"
            />

            <Grid
              container
              spacing={2}
            >
              <SystemStatus
                title="Admin Authentication"
                status="Protected"
              />

              <SystemStatus
                title="Customer API"
                status="Connected"
              />

              <SystemStatus
                title="KYC Management"
                status="Operational"
              />

              <SystemStatus
                title="Gift Cards"
                status="Provider Integration"
              />
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    );
  };

  /* ============================================================
     CUSTOMERS
     ============================================================ */

  const renderCustomers = () => (
    <AdminCard
      title="Customers"
      subtitle="Manage registered ZENIMONIES customers."
      action={
        <Button
          variant="outlined"
          onClick={loadUsers}
        >
          Refresh
        </Button>
      }
    >
      <TableContainer>
        <Table
          sx={{
            minWidth: 1050,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                Customer
              </TableCell>

              <TableCell>
                Phone
              </TableCell>

              <TableCell>
                KYC
              </TableCell>

              <TableCell>
                Tier
              </TableCell>

              <TableCell>
                Status
              </TableCell>

              <TableCell>
                Verification
              </TableCell>

              <TableCell>
                Created
              </TableCell>

              <TableCell>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.map(
              (user) => (
                <TableRow
                  key={
                    user.id
                  }
                >
                  <TableCell>
                    <Typography
                      fontWeight={800}
                    >
                      {
                        user.full_name
                      }
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {
                        user.email
                      }
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {
                      user.phone
                    }
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getStatusLabel(
                        user.kyc_status
                      )}
                      color={statusColor(
                        user.kyc_status
                      )}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    Tier{' '}
                    {
                      user.kyc_tier
                    }
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getStatusLabel(
                        user.status
                      )}
                      color={statusColor(
                        user.status
                      )}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <Stack
                      spacing={
                        0.4
                      }
                    >
                      <Typography
                        fontSize={12}
                      >
                        BVN:{' '}
                        {user.bvn_verified
                          ? '✓'
                          : '—'}
                      </Typography>

                      <Typography
                        fontSize={12}
                      >
                        ID:{' '}
                        {user.id_verified
                          ? '✓'
                          : '—'}
                      </Typography>

                      <Typography
                        fontSize={12}
                      >
                        Tier 3:{' '}
                        {user.tier_3_verified
                          ? '✓'
                          : '—'}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {formatDate(
                      user.created_at
                    )}
                  </TableCell>

                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={1}
                    >
                      {user.status !==
                        'active' && (
                        <Button
                          size="small"
                          variant="contained"
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
                            background:
                              '#087f5b',
                            '&:hover':
                              {
                                background:
                                  '#066a4b',
                              },
                          }}
                        >
                          Activate
                        </Button>
                      )}

                      {user.status ===
                        'active' && (
                        <Button
                          size="small"
                          color="warning"
                          variant="outlined"
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
                        >
                          Suspend
                        </Button>
                      )}

                      {user.status !==
                        'blocked' && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={
                            actionLoading ===
                            user.id
                          }
                          onClick={() =>
                            updateUserStatus(
                              user.id,
                              'blocked'
                            )
                          }
                        >
                          Block
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {users.length ===
        0 && (
        <EmptyState text="No customers found." />
      )}
    </AdminCard>
  );

  /* ============================================================
     KYC
     ============================================================ */

  const renderKyc = () => (
    <AdminCard
      title="KYC & Verification"
      subtitle="Review and process customer verification submissions."
      action={
        <Button
          variant="outlined"
          onClick={loadKyc}
        >
          Refresh KYC
        </Button>
      }
    >
      <TableContainer>
        <Table
          sx={{
            minWidth: 1100,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                Customer
              </TableCell>

              <TableCell>
                BVN
              </TableCell>

              <TableCell>
                Tier 2
              </TableCell>

              <TableCell>
                Tier 3
              </TableCell>

              <TableCell>
                Overall
              </TableCell>

              <TableCell>
                Submitted
              </TableCell>

              <TableCell>
                Review
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {kycRecords.map(
              (record) => (
                <TableRow
                  key={
                    record.id
                  }
                >
                  <TableCell>
                    <Typography
                      fontWeight={800}
                    >
                      {
                        record.full_name
                      }
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {
                        record.email
                      }
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      {
                        record.phone
                      }
                    </Typography>
                  </TableCell>

                  <KycTableCell
                    status={
                      record.bvn_verification_status
                    }
                    pending={
                      record.bvn_verification_status ===
                      'pending'
                    }
                    buttonLabel="Review BVN"
                    onReview={() =>
                      openKycReview(
                        record,
                        'bvn'
                      )
                    }
                  />

                  <KycTableCell
                    status={
                      record.id_verification_status
                    }
                    pending={
                      record.id_verification_status ===
                      'pending'
                    }
                    buttonLabel="Review Tier 2"
                    onReview={() =>
                      openKycReview(
                        record,
                        'tier2'
                      )
                    }
                  />

                  <KycTableCell
                    status={
                      record.tier_3_verification_status
                    }
                    pending={
                      record.tier_3_verification_status ===
                      'pending'
                    }
                    buttonLabel="Review Tier 3"
                    onReview={() =>
                      openKycReview(
                        record,
                        'tier3'
                      )
                    }
                  />

                  <TableCell>
                    <Chip
                      label={getStatusLabel(
                        record.verification_status
                      )}
                      color={statusColor(
                        record.verification_status
                      )}
                      size="small"
                    />

                    {record.rejection_reason && (
                      <Typography
                        variant="body2"
                        color="error"
                        sx={{
                          mt: 1,
                        }}
                      >
                        {
                          record.rejection_reason
                        }
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {formatDate(
                      record.created_at
                    )}
                  </TableCell>

                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        openKycReview(
                          record,
                          'bvn'
                        )
                      }
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {kycRecords.length ===
        0 && (
        <EmptyState text="No KYC records found." />
      )}
    </AdminCard>
  );

  /* ============================================================
     TRANSACTIONS
     ============================================================ */

  const renderTransactions = () => (
    <AdminCard
      title="Transactions"
      subtitle="Monitor customer transaction activity."
      action={
        <Button
          variant="outlined"
          onClick={
            loadTransactions
          }
        >
          Refresh
        </Button>
      }
    >
      <TableContainer>
        <Table
          sx={{
            minWidth: 1050,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                Customer
              </TableCell>

              <TableCell>
                Type
              </TableCell>

              <TableCell>
                Amount
              </TableCell>

              <TableCell>
                Reference
              </TableCell>

              <TableCell>
                Status
              </TableCell>

              <TableCell>
                Balance After
              </TableCell>

              <TableCell>
                Date
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {transactions.map(
              (transaction) => (
                <TableRow
                  key={
                    transaction.id
                  }
                >
                  <TableCell>
                    <Typography
                      fontWeight={800}
                    >
                      {
                        transaction.full_name
                      }
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {
                        transaction.email
                      }
                    </Typography>

                    <Typography
                      variant="body2"
                    >
                      {
                        transaction.account_number
                      }
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {
                      transaction.type
                    }
                  </TableCell>

                  <TableCell>
                    <Typography
                      fontWeight={700}
                    >
                      {formatMoney(
                        transaction.amount
                      )}
                    </Typography>

                    <Typography
                      fontSize={11}
                      color="text.secondary"
                    >
                      {
                        transaction.currency
                      }
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      fontSize={12}
                      sx={{
                        maxWidth: 180,
                        wordBreak:
                          'break-all',
                      }}
                    >
                      {
                        transaction.reference
                      }
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getStatusLabel(
                        transaction.status
                      )}
                      color={statusColor(
                        transaction.status
                      )}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    {formatMoney(
                      transaction.balance_after
                    )}
                  </TableCell>

                  <TableCell>
                    {formatDate(
                      transaction.created_at
                    )}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {transactions.length ===
        0 && (
        <EmptyState text="No transactions found." />
      )}
    </AdminCard>
  );

  /* ============================================================
     PLACEHOLDER ADMIN SECTIONS
     ============================================================ */

  const renderComingSoon = (
    title: string,
    description: string,
    icon: string
  ) => (
    <Card
      sx={{
        border:
          '1px solid #e2ebe6',
        borderRadius: 3,
        boxShadow:
          '0 4px 18px rgba(20,65,48,0.04)',
      }}
    >
      <CardContent
        sx={{
          minHeight: 360,
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
        }}
      >
        <Stack
          spacing={1.5}
          alignItems="center"
          textAlign="center"
          maxWidth={480}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius:
                '18px',
              background:
                '#eaf7f1',
              color: '#087f5b',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {icon}
          </Box>

          <Typography
            variant="h5"
            fontWeight={900}
            color="#12382d"
          >
            {title}
          </Typography>

          <Typography
            color="text.secondary"
          >
            {description}
          </Typography>

          <Chip
            label="Admin module"
            sx={{
              mt: 1,
              color: '#087f5b',
              background:
                '#eaf7f1',
              fontWeight: 800,
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );

  const renderSection = () => {
    switch (section) {
      case 'overview':
        return renderOverview();

      case 'customers':
        return renderCustomers();

      case 'kyc':
        return renderKyc();

      case 'transactions':
        return renderTransactions();

      case 'accounts':
        return renderComingSoon(
          'Accounts',
          'Account management, balances, status controls and account activity will be connected here.',
          '▣'
        );

      case 'transfers':
        return renderComingSoon(
          'Transfers',
          'Bank transfer monitoring, provider status, pending transfers and reversals will be managed here.',
          '⇄'
        );

      case 'bills':
        return renderComingSoon(
          'Bills',
          'Electricity, cable, internet and other bill-payment operations will be managed here.',
          '▤'
        );

      case 'airtime':
        return renderComingSoon(
          'Airtime & Data',
          'Monitor airtime and data purchases, provider responses, refunds and failed transactions.',
          '◉'
        );

      case 'giftcards':
        return renderComingSoon(
          'Gift Cards',
          'Prestmit catalogue, gift-card purchases, sell orders, rates, webhooks and provider transactions will appear here.',
          '▧'
        );

      case 'business':
        return renderComingSoon(
          'Business Banking',
          'Business customers, verification levels, business accounts and business activity will be managed here.',
          '▥'
        );

      case 'pos':
        return renderComingSoon(
          'POS Management',
          'POS applications, terminals, assignments, approval status and terminal activity will be managed here.',
          '▦'
        );

      case 'security':
        return renderComingSoon(
          'Security',
          'Security events, admin activity, suspicious activity, login monitoring and security controls will be managed here.',
          '◆'
        );

      case 'settings':
        return renderComingSoon(
          'Admin Settings',
          'Administrator profile, access controls, security settings and future two-factor authentication controls will be managed here.',
          '⚙'
        );

      default:
        return renderOverview();
    }
  };

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight:
            '100vh',
          background:
            '#f5f8f6',
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
        }}
      >
        <Stack
          spacing={2}
          alignItems="center"
        >
          <CircularProgress
            sx={{
              color: '#087f5b',
            }}
          />

          <Typography
            color="text.secondary"
            fontWeight={600}
          >
            Loading ZENIMONIES Admin...
          </Typography>
        </Stack>
      </Box>
    );
  }

  /* ============================================================
     ERROR
     ============================================================ */

  if (
    error &&
    !dashboard
  ) {
    return (
      <Box
        sx={{
          minHeight:
            '100vh',
          background:
            '#f5f8f6',
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
          p: 3,
        }}
      >
        <Card
          sx={{
            maxWidth: 520,
            width: '100%',
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography
              variant="h5"
              fontWeight={900}
              color="#12382d"
              gutterBottom
            >
              Admin Dashboard
            </Typography>

            <Alert
              severity="error"
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>

            <Stack
              direction="row"
              spacing={1}
            >
              <Button
                variant="contained"
                onClick={
                  loadAllData
                }
                sx={{
                  background:
                    '#087f5b',
                  '&:hover':
                    {
                      background:
                        '#066a4b',
                    },
                }}
              >
                Retry
              </Button>

              <Button
                variant="outlined"
                onClick={
                  handleLogout
                }
              >
                Sign out
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  /* ============================================================
     PAGE
     ============================================================ */

  return (
    <Box
      sx={{
        minHeight:
          '100vh',
        background:
          '#f5f8f6',
      }}
    >
      {/* DESKTOP SIDEBAR */}

      {!isMobile && (
        <Box
          sx={{
            position:
              'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width:
              SIDEBAR_WIDTH,
            zIndex: 1200,
          }}
        >
          {sidebar}
        </Box>
      )}

      {/* MOBILE DRAWER */}

      {isMobile && (
        <Drawer
          open={
            mobileDrawerOpen
          }
          onClose={() =>
            setMobileDrawerOpen(
              false
            )
          }
          PaperProps={{
            sx: {
              background:
                '#082d23',
              color:
                '#ffffff',
              width:
                SIDEBAR_WIDTH,
            },
          }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* MAIN */}

      <Box
        sx={{
          ml: {
            xs: 0,
            md: `${SIDEBAR_WIDTH}px`,
          },
          minHeight:
            '100vh',
        }}
      >
        {/* TOP BAR */}

        <Box
          sx={{
            position:
              'sticky',
            top: 0,
            zIndex: 1000,
            background:
              'rgba(255,255,255,0.96)',
            backdropFilter:
              'blur(12px)',
            borderBottom:
              '1px solid #e1e9e5',
          }}
        >
          <Container
            maxWidth="xl"
            sx={{
              py: 1.5,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
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
                        '#087f5b',
                    }}
                  >
                    ☰
                  </IconButton>
                )}

                <Box>
                  <Typography
                    fontSize={{
                      xs: 17,
                      sm: 20,
                    }}
                    fontWeight={900}
                    color="#12382d"
                  >
                    {getSectionTitle()}
                  </Typography>

                  <Typography
                    fontSize={11}
                    color="text.secondary"
                  >
                    ZENIMONIES
                    Banking
                    Administration
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Chip
                  label="Admin"
                  size="small"
                  sx={{
                    background:
                      '#eaf7f1',
                    color:
                      '#087f5b',
                    fontWeight:
                      800,
                  }}
                />

                <Button
                  size="small"
                  onClick={
                    loadAllData
                  }
                  sx={{
                    display: {
                      xs: 'none',
                      sm: 'inline-flex',
                    },
                    color:
                      '#087f5b',
                    fontWeight:
                      800,
                    textTransform:
                      'none',
                  }}
                >
                  Refresh
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>

        {/* CONTENT */}

        <Container
          maxWidth="xl"
          sx={{
            py: {
              xs: 2,
              md: 3,
            },
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
                borderRadius:
                  2,
              }}
            >
              {error}
            </Alert>
          )}

          {renderSection()}
        </Container>
      </Box>

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
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: '#12382d',
          }}
        >
          {selectedKyc &&
          selectedType
            ? `Review ${getKycTypeLabel(
                selectedType
              )} — ${
                selectedKyc.full_name
              }`
            : 'KYC Review'}
        </DialogTitle>

        <DialogContent
          dividers
        >
          {selectedKyc &&
            selectedType && (
              <Stack
                spacing={2.5}
              >
                {decisionMessage && (
                  <Alert severity="success">
                    {
                      decisionMessage
                    }
                  </Alert>
                )}

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                  >
                    Customer
                  </Typography>

                  <Typography
                    fontWeight={900}
                  >
                    {
                      selectedKyc.full_name
                    }
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    {
                      selectedKyc.email
                    }
                  </Typography>

                  <Typography
                    variant="body2"
                  >
                    {
                      selectedKyc.phone
                    }
                  </Typography>
                </Box>

                <Divider />

                {/* BVN */}

                {selectedType ===
                  'bvn' && (
                  <>
                    <InfoDisplay
                      label="Submitted BVN"
                      value={
                        selectedKyc.bvn ||
                        'Not available'
                      }
                    />

                    <StatusDisplay
                      label="BVN Status"
                      status={
                        selectedKyc.bvn_verification_status
                      }
                    />

                    {selectedKyc.bvn_verified_at && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Verified:{' '}
                        {formatDate(
                          selectedKyc.bvn_verified_at
                        )}
                      </Typography>
                    )}
                  </>
                )}

                {/* TIER 2 */}

                {selectedType ===
                  'tier2' && (
                  <>
                    <InfoDisplay
                      label="Document Type"
                      value={getDocumentTypeLabel(
                        selectedKyc.document_type
                      )}
                    />

                    <InfoDisplay
                      label="Document Number"
                      value={
                        selectedKyc.document_number ||
                        'Not available'
                      }
                    />

                    <StatusDisplay
                      label="ID Verification Status"
                      status={
                        selectedKyc.id_verification_status
                      }
                    />

                    {renderDocumentPreview(
                      selectedKyc.document_front_url,
                      'Front of ID'
                    )}

                    {renderDocumentPreview(
                      selectedKyc.document_back_url,
                      'Back of ID'
                    )}

                    {renderDocumentPreview(
                      selectedKyc.selfie_url,
                      'Selfie'
                    )}

                    {selectedKyc.liveness_status && (
                      <StatusDisplay
                        label="Liveness Status"
                        status={
                          selectedKyc.liveness_status
                        }
                      />
                    )}
                  </>
                )}

                {/* TIER 3 */}

                {selectedType ===
                  'tier3' && (
                  <>
                    <InfoDisplay
                      label="Verification Method"
                      value={getTier3MethodLabel(
                        selectedKyc.tier_3_method
                      )}
                    />

                    <StatusDisplay
                      label="Tier 3 Status"
                      status={
                        selectedKyc.tier_3_verification_status
                      }
                    />

                    {renderDocumentPreview(
                      selectedKyc.tier_3_document_url,
                      'Proof of Address'
                    )}

                    {renderDocumentPreview(
                      selectedKyc.selfie_url,
                      'Liveness Selfie'
                    )}

                    {selectedKyc.liveness_status && (
                      <StatusDisplay
                        label="Liveness Status"
                        status={
                          selectedKyc.liveness_status
                        }
                      />
                    )}
                  </>
                )}
              </Stack>
            )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            gap: 1,
          }}
        >
          <Button
            onClick={
              closeKycReview
            }
            disabled={
              Boolean(
                actionLoading
              )
            }
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
                  color="error"
                  variant="outlined"
                  onClick={
                    openRejectDialog
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
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
                    background:
                      '#087f5b',
                    '&:hover':
                      {
                        background:
                          '#066a4b',
                      },
                  }}
                >
                  {actionLoading
                    ? 'Processing...'
                    : 'Verify'}
                </Button>
              </>
            )}

          {selectedKyc &&
            selectedType &&
            isKycVerified(
              selectedKyc,
              selectedType
            ) && (
              <Chip
                color="success"
                label="Permanently Verified"
              />
            )}
        </DialogActions>
      </Dialog>

      {/* ========================================================
          REJECTION DIALOG
          ======================================================== */}

      <Dialog
        open={rejectOpen}
        onClose={
          closeRejectDialog
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
          }}
        >
          Reject{' '}
          {selectedType
            ? getKycTypeLabel(
                selectedType
              )
            : 'KYC'}{' '}
          Verification
        </DialogTitle>

        <DialogContent>
          <Typography
            color="text.secondary"
            sx={{
              mb: 2,
              mt: 1,
            }}
          >
            Enter a clear reason for
            rejection. The customer will
            be able to see the reason and
            correct the submission before
            resubmitting.
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Rejection reason"
            value={
              rejectionReason
            }
            onChange={(
              event
            ) =>
              setRejectionReason(
                event.target.value
              )
            }
            placeholder="Example: The submitted ID image is unclear. Please upload a clear image of the original document."
            disabled={
              Boolean(
                actionLoading
              )
            }
          />
        </DialogContent>

        <DialogActions
          sx={{ p: 2 }}
        >
          <Button
            onClick={
              closeRejectDialog
            }
            disabled={
              Boolean(
                actionLoading
              )
            }
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() =>
              submitKycDecision(
                'reject'
              )
            }
            disabled={
              Boolean(
                actionLoading
              ) ||
              !rejectionReason.trim()
            }
          >
            {actionLoading
              ? 'Rejecting...'
              : 'Reject Verification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ============================================================
   STAT CARD
   ============================================================ */

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  warning?: boolean;
  danger?: boolean;
}

const StatCard: React.FC<
  StatCardProps
> = ({
  title,
  value,
  subtitle,
  icon,
  warning,
  danger,
}) => {
  const iconBackground =
    danger
      ? '#fff1f0'
      : warning
        ? '#fff8e8'
        : '#eaf7f1';

  const iconColor =
    danger
      ? '#b42318'
      : warning
        ? '#b54708'
        : '#087f5b';

  return (
    <Grid
      item
      xs={12}
      sm={6}
      lg={3}
    >
      <Card
        sx={{
          height: '100%',
          border:
            '1px solid #e2ebe6',
          borderRadius: 3,
          boxShadow:
            '0 4px 18px rgba(20,65,48,0.04)',
        }}
      >
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography
                color="text.secondary"
                fontSize={12}
                fontWeight={700}
              >
                {title}
              </Typography>

              <Typography
                sx={{
                  mt: 0.7,
                  fontSize: {
                    xs: 24,
                    sm: 27,
                  },
                  fontWeight: 900,
                  color: '#12382d',
                  letterSpacing:
                    '-0.5px',
                }}
              >
                {value}
              </Typography>

              <Typography
                fontSize={11}
                color="text.secondary"
                sx={{
                  mt: 0.4,
                }}
              >
                {subtitle}
              </Typography>
            </Box>

            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius:
                  '12px',
                background:
                  iconBackground,
                color:
                  iconColor,
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: 19,
                fontWeight: 900,
              }}
            >
              {icon}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

/* ============================================================
   SECTION HEADING
   ============================================================ */

interface SectionHeadingProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

const SectionHeading: React.FC<
  SectionHeadingProps
> = ({
  title,
  subtitle,
  action,
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="flex-start"
    spacing={2}
    sx={{ mb: 2 }}
  >
    <Box>
      <Typography
        fontWeight={900}
        color="#12382d"
      >
        {title}
      </Typography>

      <Typography
        fontSize={12}
        color="text.secondary"
      >
        {subtitle}
      </Typography>
    </Box>

    {action}
  </Stack>
);

/* ============================================================
   ADMIN CARD
   ============================================================ */

interface AdminCardProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const AdminCard: React.FC<
  AdminCardProps
> = ({
  title,
  subtitle,
  action,
  children,
}) => (
  <Card
    sx={{
      border:
        '1px solid #e2ebe6',
      borderRadius: 3,
      boxShadow:
        '0 4px 18px rgba(20,65,48,0.04)',
    }}
  >
    <CardContent>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        action={action}
      />

      <Divider
        sx={{ mb: 2 }}
      />

      {children}
    </CardContent>
  </Card>
);

/* ============================================================
   KYC TABLE CELL
   ============================================================ */

interface KycTableCellProps {
  status: string;
  pending: boolean;
  buttonLabel: string;
  onReview: () => void;
}

const KycTableCell: React.FC<
  KycTableCellProps
> = ({
  status,
  pending,
  buttonLabel,
  onReview,
}) => (
  <TableCell>
    <Stack spacing={1}>
      <Chip
        size="small"
        label={getGlobalStatusLabel(
          status
        )}
        color={getGlobalStatusColor(
          status
        )}
      />

      {pending && (
        <Button
          size="small"
          variant="contained"
          onClick={
            onReview
          }
          sx={{
            background:
              '#087f5b',
            '&:hover':
              {
                background:
                  '#066a4b',
              },
          }}
        >
          {buttonLabel}
        </Button>
      )}
    </Stack>
  </TableCell>
);

/* ============================================================
   EMPTY STATE
   ============================================================ */

const EmptyState: React.FC<{
  text: string;
}> = ({ text }) => (
  <Box
    sx={{
      py: 5,
      textAlign: 'center',
    }}
  >
    <Typography
      color="text.secondary"
      fontSize={13}
    >
      {text}
    </Typography>
  </Box>
);

/* ============================================================
   SYSTEM STATUS
   ============================================================ */

const SystemStatus: React.FC<{
  title: string;
  status: string;
}> = ({
  title,
  status,
}) => (
  <Grid
    item
    xs={12}
    sm={6}
    md={3}
  >
    <Paper
      variant="outlined"
      sx={{
        p: 1.8,
        borderRadius: 2,
        borderColor:
          '#e2ebe6',
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Typography
          fontSize={12}
          fontWeight={800}
        >
          {title}
        </Typography>

        <Chip
          size="small"
          label={status}
          sx={{
            background:
              '#eaf7f1',
            color:
              '#087f5b',
            fontWeight:
              800,
          }}
        />
      </Stack>
    </Paper>
  </Grid>
);

/* ============================================================
   GLOBAL STATUS HELPERS
   ============================================================ */

const getGlobalStatusLabel =
  (status: string) => {
    const normalized =
      String(
        status || ''
      ).toLowerCase();

    const labels: Record<
      string,
      string
    > = {
      not_verified:
        'Not Verified',
      under_review:
        'Under Review',
      verified:
        'Verified',
      rejected:
        'Rejected',
      pending:
        'Pending',
      active:
        'Active',
      suspended:
        'Suspended',
      blocked:
        'Blocked',
      failed:
        'Failed',
      completed:
        'Completed',
    };

    return (
      labels[normalized] ||
      status ||
      '—'
    );
  };

const getGlobalStatusColor =
  (
    status: string
  ):
    | 'success'
    | 'warning'
    | 'error'
    | 'default' => {
    const normalized =
      String(
        status || ''
      ).toLowerCase();

    if (
      normalized ===
        'verified' ||
      normalized ===
        'active' ||
      normalized ===
        'completed'
    ) {
      return 'success';
    }

    if (
      normalized ===
        'pending' ||
      normalized ===
        'under_review'
    ) {
      return 'warning';
    }

    if (
      normalized ===
        'rejected' ||
      normalized ===
        'failed' ||
      normalized ===
        'blocked' ||
      normalized ===
        'suspended'
    ) {
      return 'error';
    }

    return 'default';
  };

export default AdminDashboard;
