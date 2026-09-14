import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

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

type KycType =
  | 'bvn'
  | 'tier2'
  | 'tier3';

type KycDecision =
  | 'verify'
  | 'reject';

const getAdminToken = (): string | null => {
  const keys = [
    'adminToken',
    'admin_token',
    'token',
    'accessToken',
    'access_token',
  ];

  for (const key of keys) {
    const token = localStorage.getItem(key);

    if (token) {
      return token;
    }
  }

  return null;
};

const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);

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

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  /* ============================================================
     LOAD DASHBOARD
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
        data.message ||
          'Unable to load dashboard'
      );
    }

    setDashboard(data.dashboard);
  };

  /* ============================================================
     LOAD USERS
     ============================================================ */

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
        data.message ||
          'Unable to load users'
      );
    }

    setUsers(data.users || []);
  };

  /* ============================================================
     LOAD KYC
     ============================================================ */

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
        data.message ||
          'Unable to load KYC records'
      );
    }

    setKycRecords(
      data.kyc_records || []
    );
  };

  /* ============================================================
     LOAD TRANSACTIONS
     ============================================================ */

  const loadTransactions =
    async () => {
      const response = await fetch(
        `${API_BASE_URL}/admin/transactions`,
        {
          headers: authHeaders,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to load transactions'
        );
      }

      setTransactions(
        data.transactions || []
      );
    };

  /* ============================================================
     LOAD ALL DATA
     ============================================================ */

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!token) {
        setError(
          'Administrator authentication token is missing. Please log in as an administrator.'
        );
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

      setError(
        err?.message ||
          'Unable to load administrator dashboard'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     USER STATUS
     ============================================================ */

  const updateUserStatus =
    async (
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
            data.message ||
              'Unable to update user status'
          );
        }

        setUsers(
          (currentUsers) =>
            currentUsers.map(
              (user) =>
                user.id === userId
                  ? {
                      ...user,
                      status,
                    }
                  : user
            )
        );
      } catch (err: any) {
        console.error(
          'Update user status error:',
          err
        );

        setError(
          err?.message ||
            'Unable to update user status'
        );
      } finally {
        setActionLoading(null);
      }
    };

  /* ============================================================
     KYC REVIEW HELPERS
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

      if (!token) {
        setError(
          'Administrator authentication token is missing.'
        );
        return;
      }

      const endpoint =
        `${API_BASE_URL}/admin/kyc/${selectedKyc.id}/${selectedType}/${decision}`;

      try {
        setActionLoading(
          `${selectedKyc.id}-${selectedType}`
        );

        setError('');
        setDecisionMessage('');

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
            data.message ||
              `Unable to ${decision} ${getKycTypeLabel(
                selectedType
              )}.`
          );
        }

        setDecisionMessage(
          data.message ||
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

        await loadKyc();
        await loadDashboard();
        await loadUsers();

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
     FORMAT HELPERS
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

    return new Date(
      value
    ).toLocaleString(
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

    if (
      normalized ===
        'not_verified' ||
      normalized ===
        'not verified'
    ) {
      return 'Not Verified';
    }

    if (
      normalized ===
        'under_review'
    ) {
      return 'Under Review';
    }

    if (
      normalized ===
        'verified'
    ) {
      return 'Verified';
    }

    if (
      normalized ===
        'rejected'
    ) {
      return 'Rejected';
    }

    if (
      normalized ===
        'pending'
    ) {
      return 'Pending';
    }

    return status || '—';
  };

  const getDocumentTypeLabel =
    (value:
      | string
      | null
      | undefined) => {
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
    (value:
      | string
      | null
      | undefined) => {
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
                '1px dashed #d0d5dd',
              borderRadius: 2,
              background:
                '#f9fafb',
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
                '1px solid #d0d5dd',
              background:
                '#f9fafb',
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
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight:
            '100vh',
          display:
            'flex',
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
          <CircularProgress />

          <Typography>
            Loading administrator dashboard...
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
      <Container
        maxWidth="md"
        sx={{ py: 6 }}
      >
        <Card>
          <CardContent>
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
            >
              Administrator Dashboard
            </Typography>

            <Alert
              severity="error"
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>

            <Button
              variant="contained"
              onClick={
                loadAllData
              }
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </Container>
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
        backgroundColor:
          '#f5f6f8',
        py: 4,
      }}
    >
      <Container maxWidth="xl">

        {/* HEADER */}
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          justifyContent="space-between"
          alignItems={{
            xs: 'flex-start',
            md: 'center',
          }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
            >
              Zenimonies Admin
            </Typography>

            <Typography
              color="text.secondary"
            >
              Banking platform administration
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={
              loadAllData
            }
          >
            Refresh
          </Button>
        </Stack>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* DASHBOARD STATISTICS */}
        {dashboard && (
          <Grid
            container
            spacing={2}
            sx={{ mb: 4 }}
          >
            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Total Users
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {
                      dashboard
                        .users
                        .total
                    }
                  </Typography>

                  <Typography
                    color="success.main"
                  >
                    {
                      dashboard
                        .users
                        .active
                    }{' '}
                    active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Pending KYC
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {
                      dashboard
                        .kyc
                        .pending
                    }
                  </Typography>

                  <Typography>
                    {
                      dashboard
                        .kyc
                        .approved
                    }{' '}
                    approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Completed Deposits
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {formatMoney(
                      dashboard
                        .deposits
                        .total_amount
                    )}
                  </Typography>

                  <Typography>
                    {
                      dashboard
                        .deposits
                        .count
                    }{' '}
                    deposits
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Completed Transfers
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {formatMoney(
                      dashboard
                        .transfers
                        .total_amount
                    )}
                  </Typography>

                  <Typography>
                    {
                      dashboard
                        .transfers
                        .count
                    }{' '}
                    transfers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Withdrawals
                  </Typography>

                  <Typography
                    variant="h5"
                    fontWeight="bold"
                  >
                    {formatMoney(
                      dashboard
                        .withdrawals
                        .total_amount
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Pending Transactions
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {
                      dashboard
                        .transactions
                        .pending
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Failed Transactions
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {
                      dashboard
                        .transactions
                        .failed
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
              md={3}
            >
              <Card>
                <CardContent>
                  <Typography
                    color="text.secondary"
                  >
                    Rejected KYC
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight="bold"
                  >
                    {
                      dashboard
                        .kyc
                        .rejected
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* NAVIGATION */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(
              _event,
              newValue
            ) =>
              setTab(
                newValue
              )
            }
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Users" />
            <Tab label="KYC" />
            <Tab label="Transactions" />
          </Tabs>
        </Paper>

        {/* ======================================================
            USERS
            ====================================================== */}

        {tab === 0 && (
          <Card>
            <CardContent>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ mb: 2 }}
              >
                Users
              </Typography>

              <Divider
                sx={{ mb: 2 }}
              />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        User
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
                              fontWeight="bold"
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
                              label={
                                getStatusLabel(
                                  user.kyc_status
                                )
                              }
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
                              label={
                                user.status
                              }
                              color={statusColor(
                                user.status
                              )}
                              size="small"
                            />
                          </TableCell>

                          <TableCell>
                            <Stack
                              spacing={
                                0.5
                              }
                            >
                              <Typography
                                variant="body2"
                              >
                                BVN:{' '}
                                {user.bvn_verified
                                  ? '✓'
                                  : '—'}
                              </Typography>

                              <Typography
                                variant="body2"
                              >
                                ID:{' '}
                                {user.id_verified
                                  ? '✓'
                                  : '—'}
                              </Typography>

                              <Typography
                                variant="body2"
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
                <Typography
                  sx={{ py: 4 }}
                  textAlign="center"
                  color="text.secondary"
                >
                  No users found.
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================================================
            KYC MANAGEMENT
            ====================================================== */}

        {tab === 1 && (
          <Card>
            <CardContent>
              <Stack
                direction={{
                  xs: 'column',
                  md: 'row',
                }}
                justifyContent="space-between"
                alignItems={{
                  xs: 'flex-start',
                  md: 'center',
                }}
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                  >
                    KYC Management
                  </Typography>

                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    Review and process real customer KYC submissions.
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  onClick={
                    loadKyc
                  }
                >
                  Refresh KYC
                </Button>
              </Stack>

              <Divider
                sx={{ mb: 2 }}
              />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Customer
                      </TableCell>

                      <TableCell>
                        BVN
                      </TableCell>

                      <TableCell>
                        Tier 2 ID
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
                      (kycRecord) => (
                        <TableRow
                          key={
                            kycRecord.id
                          }
                        >
                          <TableCell>
                            <Typography
                              fontWeight="bold"
                            >
                              {
                                kycRecord.full_name
                              }
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {
                                kycRecord.email
                              }
                            </Typography>

                            <Typography
                              variant="body2"
                            >
                              {
                                kycRecord.phone
                              }
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Stack
                              spacing={1}
                            >
                              <Chip
                                size="small"
                                label={getStatusLabel(
                                  kycRecord.bvn_verification_status
                                )}
                                color={statusColor(
                                  kycRecord.bvn_verification_status
                                )}
                              />

                              {kycRecord.bvn_verification_status ===
                                'pending' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() =>
                                    openKycReview(
                                      kycRecord,
                                      'bvn'
                                    )
                                  }
                                >
                                  Review BVN
                                </Button>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack
                              spacing={1}
                            >
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                              >
                                {getDocumentTypeLabel(
                                  kycRecord.document_type
                                )}
                              </Typography>

                              <Chip
                                size="small"
                                label={getStatusLabel(
                                  kycRecord.id_verification_status
                                )}
                                color={statusColor(
                                  kycRecord.id_verification_status
                                )}
                              />

                              {kycRecord.id_verification_status ===
                                'pending' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() =>
                                    openKycReview(
                                      kycRecord,
                                      'tier2'
                                    )
                                  }
                                >
                                  Review Tier 2
                                </Button>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack
                              spacing={1}
                            >
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                              >
                                {getTier3MethodLabel(
                                  kycRecord.tier_3_method
                                )}
                              </Typography>

                              <Chip
                                size="small"
                                label={getStatusLabel(
                                  kycRecord.tier_3_verification_status
                                )}
                                color={statusColor(
                                  kycRecord.tier_3_verification_status
                                )}
                              />

                              {kycRecord.tier_3_verification_status ===
                                'pending' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() =>
                                    openKycReview(
                                      kycRecord,
                                      'tier3'
                                    )
                                  }
                                >
                                  Review Tier 3
                                </Button>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={getStatusLabel(
                                kycRecord.verification_status
                              )}
                              color={statusColor(
                                kycRecord.verification_status
                              )}
                              size="small"
                            />

                            {kycRecord.rejection_reason && (
                              <Typography
                                variant="body2"
                                color="error"
                                sx={{
                                  mt: 1,
                                }}
                              >
                                {
                                  kycRecord.rejection_reason
                                }
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              kycRecord.created_at
                            )}
                          </TableCell>

                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                openKycReview(
                                  kycRecord,
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
                <Typography
                  sx={{ py: 4 }}
                  textAlign="center"
                  color="text.secondary"
                >
                  No KYC records found.
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================================================
            TRANSACTIONS
            ====================================================== */}

        {tab === 2 && (
          <Card>
            <CardContent>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ mb: 2 }}
              >
                Transactions
              </Typography>

              <Divider
                sx={{ mb: 2 }}
              />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        User
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
                              fontWeight="bold"
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
                            {formatMoney(
                              transaction.amount
                            )}{' '}
                            {
                              transaction.currency
                            }
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
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
                <Typography
                  sx={{ py: 4 }}
                  textAlign="center"
                  color="text.secondary"
                >
                  No transactions found.
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Container>

      {/* ========================================================
          KYC REVIEW DIALOG
          ======================================================== */}

      <Dialog
        open={reviewOpen}
        onClose={closeKycReview}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedKyc &&
          selectedType
            ? `Review ${getKycTypeLabel(
                selectedType
              )} — ${
                selectedKyc.full_name
              }`
            : 'KYC Review'}
        </DialogTitle>

        <DialogContent dividers>
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
                    fontWeight="bold"
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
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                      >
                        Submitted BVN
                      </Typography>

                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{
                          letterSpacing:
                            1,
                          mt: 0.5,
                        }}
                      >
                        {selectedKyc.bvn ||
                          'Not available'}
                      </Typography>
                    </Box>

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
                  color="success"
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
        <DialogTitle>
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
            sx={{ mb: 2 }}
          >
            Enter a clear reason for rejection. The customer will be able to see the reason and correct the submission before resubmitting.
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
                event.target
                  .value
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
   INFO DISPLAY
   ============================================================ */

interface InfoDisplayProps {
  label: string;
  value: string;
}

const InfoDisplay: React.FC<
  InfoDisplayProps
> = ({
  label,
  value,
}) => {
  return (
    <Box
      sx={{
        p: 2,
        background:
          '#f9fafb',
        border:
          '1px solid #eaecf0',
        borderRadius: 2,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        fontWeight="bold"
        sx={{ mt: 0.5 }}
      >
        {value}
      </Typography>
    </Box>
  );
};

/* ============================================================
   STATUS DISPLAY
   ============================================================ */

interface StatusDisplayProps {
  label: string;
  status: string;
}

const StatusDisplay: React.FC<
  StatusDisplayProps
> = ({
  label,
  status,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent:
          'space-between',
        alignItems:
          'center',
        gap: 2,
        p: 2,
        background:
          '#f9fafb',
        border:
          '1px solid #eaecf0',
        borderRadius: 2,
      }}
    >
      <Typography
        fontWeight="600"
      >
        {label}
      </Typography>

      <Chip
        size="small"
        label={getGlobalStatusLabel(
          status
        )}
        color={getGlobalStatusColor(
          status
        )}
      />
    </Box>
  );
};

/* ============================================================
   GLOBAL STATUS HELPERS
   ============================================================ */

const getGlobalStatusLabel =
  (status: string) => {
    const normalized =
      String(
        status || ''
      ).toLowerCase();

    if (
      normalized ===
      'not_verified'
    ) {
      return 'Not Verified';
    }

    if (
      normalized ===
      'under_review'
    ) {
      return 'Under Review';
    }

    if (
      normalized ===
      'verified'
    ) {
      return 'Verified';
    }

    if (
      normalized ===
      'rejected'
    ) {
      return 'Rejected';
    }

    if (
      normalized ===
      'pending'
    ) {
      return 'Pending';
    }

    return status || '—';
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
      'verified'
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
      'rejected'
    ) {
      return 'error';
    }

    return 'default';
  };

export default AdminDashboard;
