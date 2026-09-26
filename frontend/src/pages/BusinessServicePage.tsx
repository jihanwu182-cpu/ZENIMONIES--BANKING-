
import React, {
  useCallback,
  useEffect,
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
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  AccountBalance,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Description,
  Lock,
  PointOfSale,
  ReceiptLong,
  Shield,
  Store,
  WarningAmber,
} from '@mui/icons-material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// BUSINESS SERVICE PAGE
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

// ============================================================
// TYPES
// ============================================================

interface BusinessAccount {
  id: string;
  business_name?: string;
  customer_name?: string;
  full_name?: string;
  owner_name?: string;

  account_number?: string;
  account_type?: string;
  currency?: string;
  balance?: number | string;

  status?: string;
  verification_status?: string;
  verification_level?: number | string;
  business_level?: number | string;
  kyc_status?: string;

  user?: {
    full_name?: string;
    name?: string;
  };

  owner?: {
    full_name?: string;
    name?: string;
  };
}

type StatementFormat = 'pdf' | 'csv';

// ============================================================
// DATE HELPERS
// ============================================================

const getLocalDate = (): string => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDateOneMonthAgo = (): string => {
  const date = new Date();

  date.setMonth(date.getMonth() - 1);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// ============================================================
// CUSTOMER NAME
// ============================================================

const getCustomerName = (
  business: BusinessAccount | null
): string => {
  if (!business) {
    return 'Business Account';
  }

  return (
    business.customer_name ||
    business.full_name ||
    business.owner_name ||
    business.user?.full_name ||
    business.user?.name ||
    business.owner?.full_name ||
    business.owner?.name ||
    business.business_name ||
    'Business Account'
  );
};

// ============================================================
// CURRENCY FORMATTER
// ============================================================

const formatCurrency = (
  amount: number | string | undefined,
  currency: string | undefined
): string => {
  const numericAmount = Number(amount || 0);

  const selectedCurrency = currency || 'NGN';

  try {
    return new Intl.NumberFormat(
      'en',
      {
        style: 'currency',
        currency: selectedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(numericAmount);
  } catch {
    return `${selectedCurrency} ${numericAmount.toFixed(2)}`;
  }
};

// ============================================================
// COMPONENT
// ============================================================

const BusinessServicePage: React.FC = () => {
  const navigate = useNavigate();

  const { id, section } = useParams<{
    id: string;
    section: string;
  }>();

  const businessId = id || '';

  // ----------------------------------------------------------
  // BUSINESS ACCOUNT STATE
  // ----------------------------------------------------------

  const [business, setBusiness] =
    useState<BusinessAccount | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [refreshing, setRefreshing] =
    useState(false);

  // ----------------------------------------------------------
  // STATEMENT STATE
  // ----------------------------------------------------------

  const [
    statementStartDate,
    setStatementStartDate,
  ] = useState(getDateOneMonthAgo);

  const [
    statementEndDate,
    setStatementEndDate,
  ] = useState(getLocalDate);

  const [
    statementDownloading,
    setStatementDownloading,
  ] = useState(false);

  const [
    statementEmailing,
    setStatementEmailing,
  ] = useState(false);

  const [
    statementEmailFormat,
    setStatementEmailFormat,
  ] = useState<StatementFormat | null>(
    null
  );

  const [
    statementError,
    setStatementError,
  ] = useState('');

  const [
    statementSuccess,
    setStatementSuccess,
  ] = useState('');

  // ==========================================================
  // AUTHENTICATION TOKEN
  // ==========================================================

  const getToken = (): string | null => {
    return localStorage.getItem(
      'zenimonies_token'
    );
  };

  // ==========================================================
  // LOAD BUSINESS ACCOUNT
  // ==========================================================

  const loadBusiness = useCallback(
    async (showRefresh = false) => {
      if (!businessId) {
        setError(
          'Business account ID is missing.'
        );

        setLoading(false);
        return;
      }

      const token = getToken();

      if (!token) {
        setError(
          'Your session has expired. Please sign in again.'
        );

        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await fetch(
          `${API_BASE}/businesses/${encodeURIComponent(
            businessId
          )}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Unable to load business account.'
          );
        }

        const account =
          result.data?.business ||
          result.business ||
          result.data ||
          result;

        if (
          !account ||
          typeof account !== 'object'
        ) {
          throw new Error(
            'Business account information is unavailable.'
          );
        }

        setBusiness(account);
      } catch (err: any) {
        setError(
          err.message ||
            'Unable to load business account.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessId]
  );

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  // ==========================================================
  // STATEMENT DATE VALIDATION
  // ==========================================================

  const validateStatementDates = (): boolean => {
    setStatementError('');
    setStatementSuccess('');

    if (
      !statementStartDate ||
      !statementEndDate
    ) {
      setStatementError(
        'Please select both the start date and end date.'
      );

      return false;
    }

    if (
      statementStartDate >
      statementEndDate
    ) {
      setStatementError(
        'The start date cannot be after the end date.'
      );

      return false;
    }

    const start = new Date(
      `${statementStartDate}T00:00:00`
    );

    const end = new Date(
      `${statementEndDate}T00:00:00`
    );

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setStatementError(
        'Please select valid statement dates.'
      );

      return false;
    }

    if (end > today) {
      setStatementError(
        'The end date cannot be in the future.'
      );

      return false;
    }

    const difference =
      (end.getTime() - start.getTime()) /
      (1000 * 60 * 60 * 24);

    if (difference > 365) {
      setStatementError(
        'Statements cannot cover more than 365 days.'
      );

      return false;
    }

    return true;
  };

  // ==========================================================
  // DOWNLOAD BUSINESS STATEMENT
  // PDF AND CSV
  // ==========================================================

  const downloadBusinessStatement = async (
    format: StatementFormat
  ) => {
    if (!validateStatementDates()) {
      return;
    }

    const token = getToken();

    if (!token) {
      setStatementError(
        'Your session has expired. Please sign in again.'
      );

      return;
    }

    setStatementDownloading(true);

    try {
      const response = await fetch(
        `${API_BASE}/statements/business/${encodeURIComponent(
          businessId
        )}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: statementStartDate,
            endDate: statementEndDate,
            format,
          }),
        }
      );

      if (!response.ok) {
        let message =
          'Unable to generate your business statement.';

        try {
          const result = await response.json();

          message =
            result.message || message;
        } catch {
          // The server may return a non-JSON error.
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          'The generated statement is empty.'
        );
      }

      if (format === 'pdf') {
        const header = await blob
          .slice(0, 5)
          .text();

        if (header !== '%PDF-') {
          throw new Error(
            'The server did not return a valid PDF statement.'
          );
        }
      }

      const fileExtension = format;

      const filename =
        `Zenimonies_Business_Statement_${statementStartDate}_to_${statementEndDate}.${fileExtension}`;

      const fileUrl =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = fileUrl;
      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        fileUrl
      );

      setStatementSuccess(
        `${format.toUpperCase()} statement generated successfully.`
      );
    } catch (err: any) {
      setStatementError(
        err.message ||
          'Unable to download your statement.'
      );
    } finally {
      setStatementDownloading(false);
    }
  };

  // ==========================================================
  // EMAIL BUSINESS STATEMENT
  // PDF AND CSV
  // ==========================================================

  const emailBusinessStatement = async (
    format: StatementFormat
  ) => {
    if (!validateStatementDates()) {
      return;
    }

    const token = getToken();

    if (!token) {
      setStatementError(
        'Your session has expired. Please sign in again.'
      );

      return;
    }

    setStatementEmailing(true);

    setStatementEmailFormat(format);

    setStatementError('');
    setStatementSuccess('');

    try {
      const response = await fetch(
        `${API_BASE}/statements/business/${encodeURIComponent(
          businessId
        )}/email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: statementStartDate,
            endDate: statementEndDate,
            format,
          }),
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Unable to email your business statement.'
        );
      }

      setStatementSuccess(
        result.message ||
          `Your business ${format.toUpperCase()} statement has been sent to your registered email address.`
      );
    } catch (err: any) {
      setStatementError(
        err.message ||
          'Unable to email your statement. Please try again.'
      );
    } finally {
      setStatementEmailing(false);
      setStatementEmailFormat(null);
    }
  };

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const goToBusinessDashboard = () => {
    navigate(
      `/business/dashboard/${encodeURIComponent(
        businessId
      )}`
    );
  };

  const goToBusinessTransactions = () => {
    navigate(
      `/business/${encodeURIComponent(
        businessId
      )}/transactions`
    );
  };

  const goToBusinessSection = (
    selectedSection: string
  ) => {
    navigate(
      `/business/${encodeURIComponent(
        businessId
      )}/${selectedSection}`
    );
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
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />

        <Typography>
          Loading business account...
        </Typography>
      </Box>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error && !business) {
    return (
      <Box
        sx={{
          maxWidth: 600,
          mx: 'auto',
          mt: 5,
          px: 2,
        }}
      >
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>

        <Button
          variant="contained"
          onClick={() => loadBusiness()}
          fullWidth
        >
          Try Again
        </Button>

        <Button
          sx={{ mt: 1 }}
          fullWidth
          onClick={() =>
            navigate('/business')
          }
        >
          Back to Business
        </Button>
      </Box>
    );
  }

  // ==========================================================
  // BUSINESS DETAILS
  // ==========================================================

  const customerName =
    getCustomerName(business);

  const currency =
    business?.currency || 'NGN';

  const verificationLevel = Number(
    business?.verification_level ||
      business?.business_level ||
      1
  );

  const verificationStatus =
    business?.verification_status ||
    business?.kyc_status ||
    'pending';

  const normalizedSection =
    (section || '').toLowerCase();

  const isStatementPage =
    normalizedSection === 'statements' ||
    normalizedSection === 'statement';

  const isPOSPage =
    normalizedSection === 'pos' ||
    normalizedSection === 'terminal';

  const isUpgradePage =
    normalizedSection === 'upgrade' ||
    normalizedSection === 'verification';

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <Box
      sx={{
        maxWidth: 1000,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: 3,
        pb: 6,
      }}
    >
      {/* HEADER */}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
          >
            Business Services
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Zenimonies Business Banking
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={goToBusinessDashboard}
        >
          Dashboard
        </Button>
      </Stack>

      {/* BUSINESS ACCOUNT CARD */}

      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          color: '#fff',
          background:
            'linear-gradient(135deg, #073b2a 0%, #087f5b 100%)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Store />

            <Typography
              variant="subtitle2"
              fontWeight={700}
            >
              BUSINESS ACCOUNT
            </Typography>
          </Stack>

          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 1 }}
          >
            {customerName}
          </Typography>

          <Typography
            variant="body2"
            sx={{ opacity: 0.85 }}
          >
            Account Type: Business Account
          </Typography>

          <Divider
            sx={{
              my: 2,
              borderColor:
                'rgba(255,255,255,0.2)',
            }}
          />

          <Typography
            variant="body2"
            sx={{ opacity: 0.85 }}
          >
            Account Number
          </Typography>

          <Typography
            fontWeight={700}
            sx={{ mb: 2 }}
          >
            {business?.account_number ||
              'Not available'}
          </Typography>

          <Typography
            variant="body2"
            sx={{ opacity: 0.85 }}
          >
            Available Balance
          </Typography>

          <Typography
            variant="h5"
            fontWeight={800}
          >
            {formatCurrency(
              business?.balance,
              currency
            )}
          </Typography>

          <Chip
            label={
              business?.status || 'Active'
            }
            size="small"
            sx={{
              mt: 2,
              color: '#fff',
              bgcolor:
                'rgba(255,255,255,0.18)',
            }}
          />
        </CardContent>
      </Card>

      {/* VERIFICATION STATUS */}

      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Shield color="primary" />

            <Typography
              variant="h6"
              fontWeight={700}
            >
              Business Verification
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Verification Level
              </Typography>

              <Typography
                variant="h5"
                fontWeight={800}
              >
                Level {verificationLevel}
              </Typography>
            </Box>

            <Chip
              icon={
                verificationStatus
                  .toLowerCase()
                  .includes('verified') ? (
                  <CheckCircle />
                ) : (
                  <WarningAmber />
                )
              }
              label={verificationStatus}
              color={
                verificationStatus
                  .toLowerCase()
                  .includes('verified')
                  ? 'success'
                  : 'warning'
              }
            />
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            Business verification requirements
            and account limits depend on your
            approved verification level.
          </Typography>

          <Button
            fullWidth
            variant="outlined"
            endIcon={<ArrowForward />}
            sx={{ mt: 2 }}
            onClick={() =>
              goToBusinessSection('upgrade')
            }
          >
            View Verification Requirements
          </Button>
        </CardContent>
      </Card>

      {/* SERVICE NAVIGATION */}

      {!isStatementPage &&
        !isPOSPage &&
        !isUpgradePage && (
          <Stack spacing={2}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<ReceiptLong />}
              endIcon={<ArrowForward />}
              onClick={
                goToBusinessTransactions
              }
              sx={{
                justifyContent:
                  'space-between',
                py: 2,
              }}
            >
              Business Transactions
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Description />}
              endIcon={<ArrowForward />}
              onClick={() =>
                goToBusinessSection(
                  'statements'
                )
              }
              sx={{
                justifyContent:
                  'space-between',
                py: 2,
              }}
            >
              Account Statements
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<PointOfSale />}
              endIcon={<ArrowForward />}
              onClick={() =>
                goToBusinessSection('pos')
              }
              sx={{
                justifyContent:
                  'space-between',
                py: 2,
              }}
            >
              POS Terminal
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Shield />}
              endIcon={<ArrowForward />}
              onClick={() =>
                goToBusinessSection(
                  'upgrade'
                )
              }
              sx={{
                justifyContent:
                  'space-between',
                py: 2,
              }}
            >
              Upgrade Business Level
            </Button>
          </Stack>
        )}

      {/* =====================================================
          BUSINESS STATEMENTS
          ===================================================== */}

      {isStatementPage && (
        <Card
          sx={{
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <ReceiptLong color="primary" />

              <Typography
                variant="h6"
                fontWeight={800}
              >
                Business Account Statement
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Select your statement period
              and download your statement or
              send it to your registered email
              address.
            </Typography>

            {statementError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() =>
                  setStatementError('')
                }
              >
                {statementError}
              </Alert>
            )}

            {statementSuccess && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() =>
                  setStatementSuccess('')
                }
              >
                {statementSuccess}
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={statementStartDate}
                onChange={(event) => {
                  setStatementStartDate(
                    event.target.value
                  );

                  setStatementError('');
                  setStatementSuccess('');
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  max:
                    statementEndDate ||
                    getLocalDate(),
                }}
              />

              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={statementEndDate}
                onChange={(event) => {
                  setStatementEndDate(
                    event.target.value
                  );

                  setStatementError('');
                  setStatementSuccess('');
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min:
                    statementStartDate ||
                    undefined,
                  max: getLocalDate(),
                }}
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ mb: 2 }}
            >
              Download Statement
            </Typography>

            <Stack spacing={2}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={
                  statementDownloading ? (
                    <CircularProgress
                      size={20}
                      color="inherit"
                    />
                  ) : (
                    <Description />
                  )
                }
                disabled={
                  statementDownloading ||
                  statementEmailing
                }
                onClick={() =>
                  downloadBusinessStatement(
                    'pdf'
                  )
                }
              >
                {statementDownloading
                  ? 'Generating Statement...'
                  : 'Download PDF'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<Description />}
                disabled={
                  statementDownloading ||
                  statementEmailing
                }
                onClick={() =>
                  downloadBusinessStatement(
                    'csv'
                  )
                }
              >
                Download CSV
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ mb: 1 }}
            >
              Email Statement
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Your statement will be sent
              to the email address registered
              to your Zenimonies account.
              For your security, the recipient
              is determined by the server.
            </Typography>

            <Stack spacing={2}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                startIcon={
                  statementEmailing &&
                  statementEmailFormat ===
                    'pdf' ? (
                    <CircularProgress
                      size={20}
                      color="inherit"
                    />
                  ) : (
                    <Description />
                  )
                }
                disabled={
                  statementEmailing ||
                  statementDownloading
                }
                onClick={() =>
                  emailBusinessStatement(
                    'pdf'
                  )
                }
              >
                {statementEmailing &&
                statementEmailFormat ===
                  'pdf'
                  ? 'Emailing PDF...'
                  : 'Email PDF'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="success"
                size="large"
                startIcon={
                  statementEmailing &&
                  statementEmailFormat ===
                    'csv' ? (
                    <CircularProgress
                      size={20}
                      color="success"
                    />
                  ) : (
                    <Description />
                  )
                }
                disabled={
                  statementEmailing ||
                  statementDownloading
                }
                onClick={() =>
                  emailBusinessStatement(
                    'csv'
                  )
                }
              >
                {statementEmailing &&
                statementEmailFormat ===
                  'csv'
                  ? 'Emailing CSV...'
                  : 'Email CSV'}
              </Button>
            </Stack>

            <Alert
              severity="info"
              sx={{ mt: 3 }}
            >
              Statements are generated for
              the selected business account.
              Always check that the business
              account and statement period
              are correct before sending.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          POS TERMINAL
          ===================================================== */}

      {isPOSPage && (
        <Card
          sx={{
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <PointOfSale color="primary" />

              <Typography
                variant="h6"
                fontWeight={800}
              >
                POS Terminal
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Apply for a business POS
              terminal and manage your
              terminal application.
            </Typography>

            <Alert
              severity="info"
              sx={{ mb: 2 }}
            >
              POS terminal applications
              require approval before a
              terminal can be activated.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              startIcon={<PointOfSale />}
              onClick={() =>
                goToBusinessSection(
                  'pos'
                )
              }
            >
              POS Terminal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          BUSINESS VERIFICATION
          ===================================================== */}

      {isUpgradePage && (
        <Card
          sx={{
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Shield color="primary" />

              <Typography
                variant="h6"
                fontWeight={800}
              >
                Business Level Upgrade
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Review the requirements for
              upgrading your business account.
            </Typography>

            <Stack spacing={2}>
              <Box>
                <Typography
                  fontWeight={700}
                >
                  Levels 1–3
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Follow the business
                  verification process and
                  provide the requested
                  personal verification
                  information.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography
                  fontWeight={700}
                >
                  Level 4
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  CAC registration documents
                  are required for the Level 4
                  business verification
                  application.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography
                  fontWeight={700}
                >
                  Level 5
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Enhanced business
                  verification may be required.
                  Requirements are subject
                  to the bank's verification
                  process.
                </Typography>
              </Box>
            </Stack>

            <Alert
              severity="warning"
              sx={{ mt: 3 }}
            >
              This page displays general
              requirements. Actual verification
              approval and account limits
              must be enforced by the
              backend.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          FOOTER ACTIONS
          ===================================================== */}

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={2}
        sx={{ mt: 3 }}
      >
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={goToBusinessDashboard}
        >
          Business Dashboard
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={
            refreshing ? (
              <CircularProgress size={18} />
            ) : (
              <AccountBalance />
            )
          }
          disabled={refreshing}
          onClick={() =>
            loadBusiness(true)
          }
        >
          {refreshing
            ? 'Refreshing...'
            : 'Refresh Account'}
        </Button>
      </Stack>

      <Box
        sx={{
          textAlign: 'center',
          mt: 4,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
        >
          Zenimonies Banking
        </Typography>
      </Box>
    </Box>
  );
};

export default BusinessServicePage;
