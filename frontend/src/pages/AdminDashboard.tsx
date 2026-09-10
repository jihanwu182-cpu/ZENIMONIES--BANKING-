import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
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
  bvn_verification_status: string;
  bvn_verified_at: string | null;
  document_type: string | null;
  id_verification_status: string;
  id_verified_at: string | null;
  tier_3_method: string | null;
  tier_3_verification_status: string;
  tier_3_verified_at: string | null;
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

  const [users, setUsers] = useState<User[]>([]);

  const [kycRecords, setKycRecords] =
    useState<KycRecord[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const token = getAdminToken();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

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
        data.message || 'Unable to load dashboard'
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
        data.message || 'Unable to load users'
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
        data.message || 'Unable to load KYC records'
      );
    }

    setKycRecords(data.kyc_records || []);
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
        data.message ||
          'Unable to load transactions'
      );
    }

    setTransactions(data.transactions || []);
  };

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
  }, []);

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
          data.message ||
            'Unable to update user status'
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
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

  const formatMoney = (
    value: string | number | null | undefined
  ) => {
    const amount = Number(value || 0);

    return `₦${amount.toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (
    value: string | null | undefined
  ) => {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleString(
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
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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

  if (error && !dashboard) {
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
              onClick={loadAllData}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f6f8',
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
            onClick={loadAllData}
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
            <Grid item xs={12} sm={6} md={3}>
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
                    {dashboard.users.total}
                  </Typography>

                  <Typography
                    color="success.main"
                  >
                    {dashboard.users.active}{' '}
                    active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                    {dashboard.kyc.pending}
                  </Typography>

                  <Typography>
                    {dashboard.kyc.approved}{' '}
                    approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                      dashboard.deposits
                        .total_amount
                    )}
                  </Typography>

                  <Typography>
                    {dashboard.deposits.count}{' '}
                    deposits
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                      dashboard.transfers
                        .total_amount
                    )}
                  </Typography>

                  <Typography>
                    {dashboard.transfers.count}{' '}
                    transfers
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                      dashboard.withdrawals
                        .total_amount
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                      dashboard.transactions
                        .pending
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                      dashboard.transactions
                        .failed
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
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
                    {dashboard.kyc.rejected}
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
            ) => setTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Users" />
            <Tab label="KYC" />
            <Tab label="Transactions" />
          </Tabs>
        </Paper>

        {/* USERS */}
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

              <Divider sx={{ mb: 2 }} />

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
                          key={user.id}
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
                              {user.email}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {user.phone}
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={
                                user.kyc_status
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
                              spacing={0.5}
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

              {users.length === 0 && (
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

        {/* KYC */}
        {tab === 1 && (
          <Card>
            <CardContent>
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ mb: 2 }}
              >
                KYC Records
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        User
                      </TableCell>

                      <TableCell>
                        Tier
                      </TableCell>

                      <TableCell>
                        BVN
                      </TableCell>

                      <TableCell>
                        ID Document
                      </TableCell>

                      <TableCell>
                        Tier 3
                      </TableCell>

                      <TableCell>
                        Overall Status
                      </TableCell>

                      <TableCell>
                        Submitted
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {kycRecords.map(
                      (record) => (
                        <TableRow
                          key={record.id}
                        >
                          <TableCell>
                            <Typography
                              fontWeight="bold"
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
                              {record.phone}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            Tier{' '}
                            {
                              record.kyc_tier
                            }
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                record.bvn_verification_status
                              }
                              color={statusColor(
                                record.bvn_verification_status
                              )}
                            />
                          </TableCell>

                          <TableCell>
                            <Stack
                              spacing={0.5}
                            >
                              <Typography>
                                {
                                  record.document_type ||
                                  'Not submitted'
                                }
                              </Typography>

                              <Chip
                                size="small"
                                label={
                                  record.id_verification_status
                                }
                                color={statusColor(
                                  record.id_verification_status
                                )}
                              />
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack
                              spacing={0.5}
                            >
                              <Typography>
                                {
                                  record.tier_3_method ||
                                  'Not submitted'
                                }
                              </Typography>

                              <Chip
                                size="small"
                                label={
                                  record.tier_3_verification_status
                                }
                                color={statusColor(
                                  record.tier_3_verification_status
                                )}
                              />
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={
                                record.verification_status
                              }
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
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {kycRecords.length === 0 && (
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

        {/* TRANSACTIONS */}
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

              <Divider sx={{ mb: 2 }} />

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
                      (transaction) => (
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
                              label={
                                transaction.status
                              }
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
    </Box>
  );
};

export default AdminDashboard;
