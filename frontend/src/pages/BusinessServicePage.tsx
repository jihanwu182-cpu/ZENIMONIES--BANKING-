
import React, { useCallback, useEffect, useState } from 'react';

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
// BUSINESS SERVICES PAGE
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#008D4F';
const DARK_GREEN = '#064B37';
const PAGE_BG = '#F3F8F5';
const BORDER = '#DDEBE4';
const MUTED = '#81928A';
const LIGHT_GREEN = '#E8F5EE';

// ============================================================
// TYPES
// ============================================================

type BusinessAccount = {
  id: string;
  business_name?: string;
  business_type?: string;

  customer_name?: string;
  full_name?: string;
  owner_name?: string;

  user?: {
    full_name?: string;
    name?: string;
  };

  owner?: {
    full_name?: string;
    name?: string;
  };

  verification_level?: number | string;
  business_level?: number | string;
  account_level?: number | string;

  verification_status?: string;
  status?: string;
  account_status?: string;

  cac_status?: string;
  cac_verification_status?: string;
  cac_verified?: boolean;

  currency?: string;
  balance?: number | string;
  account_number?: string;
};

type ServiceInfo = {
  title: string;
  description: string;
};

// ============================================================
// HELPERS
// ============================================================

const getToken = () =>
  localStorage.getItem('zenimonies_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('access_token') ||
  '';

const getLevel = (
  business: BusinessAccount | null
): number => {
  if (!business) return 1;

  const raw =
    business.verification_level ??
    business.business_level ??
    business.account_level;

  const level = Number(raw);

  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level > 5
  ) {
    return 1;
  }

  return level;
};

const getCustomerName = (
  business: BusinessAccount
): string =>
  business.customer_name ||
  business.full_name ||
  business.owner_name ||
  business.user?.full_name ||
  business.user?.name ||
  business.owner?.full_name ||
  business.owner?.name ||
  'Business Account';

const getSectionInfo = (
  section: string
): ServiceInfo => {
  const services: Record<string, ServiceInfo> = {
    verification: {
      title: 'Business Verification',
      description:
        'Review your business verification level and the requirements for upgrading your account.',
    },
    kyc: {
      title: 'Business Verification',
      description:
        'Review your business verification level and the requirements for upgrading your account.',
    },
    transactions: {
      title: 'Business Transactions',
      description:
        'View and manage activity associated with your business account.',
    },
    statements: {
      title: 'Business Statements',
      description:
        'Access statements for your business account.',
    },
    wallet: {
      title: 'Business Wallet',
      description:
        'Manage your business wallet and account information.',
    },
    cards: {
      title: 'Business Cards',
      description:
        'View business card services and applicable account options.',
    },
    staff: {
      title: 'Staff and Access',
      description:
        'Manage business team access when the service is enabled.',
    },
    security: {
      title: 'Business Security',
      description:
        'Review security and access options for your business account.',
    },
    settings: {
      title: 'Business Settings',
      description:
        'Review your business account information and settings.',
    },
    pos: {
      title: 'POS Terminal',
      description:
        'Apply for a POS terminal and manage approved devices when POS services are enabled.',
    },
    notifications: {
      title: 'Business Notifications',
      description:
        'View notifications related to your business account.',
    },
    'add-money': {
      title: 'Add Money',
      description:
        'Business account funding options.',
    },
    transfer: {
      title: 'Bank Transfer',
      description:
        'Business bank transfer services.',
    },
    'internal-transfer': {
      title: 'ZENIMONIES Transfer',
      description:
        'Transfers between supported ZENIMONIES accounts.',
    },
    airtime: {
      title: 'Airtime',
      description:
        'Business airtime services.',
    },
    data: {
      title: 'Data',
      description:
        'Business mobile data services.',
    },
    betting: {
      title: 'Betting',
      description:
        'Business betting payment services.',
    },
    tv: {
      title: 'TV Subscription',
      description:
        'Business television subscription services.',
    },
    bills: {
      title: 'Bill Payments',
      description:
        'Business bill payment services.',
    },
    savings: {
      title: 'Business Savings',
      description:
        'Business savings services and account options.',
    },
    more: {
      title: 'More Business Services',
      description:
        'Explore services available for your business account.',
    },
  };

  return (
    services[section] || {
      title: 'Business Services',
      description:
        'Business account services and information.',
    }
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const BusinessServicePage: React.FC = () => {
  const navigate = useNavigate();

  const { id, section } = useParams<{
    id: string;
    section: string;
  }>();

  const businessId = id || '';
  const currentSection = (section || 'more')
    .toLowerCase();

  const [business, setBusiness] =
    useState<BusinessAccount | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [refreshing, setRefreshing] =
    useState(false);

  // ==========================================================
  // LOAD THE BUSINESS ACCOUNT
  // ==========================================================

  const loadBusiness = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      try {
        const token = getToken();

        if (!token) {
          navigate('/login');
          return;
        }

        if (!businessId) {
          throw new Error(
            'Business account ID is missing.'
          );
        }

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
              result.error ||
              'Unable to load business account.'
          );
        }

        const data =
          result.business ||
          result.data?.business ||
          result.data ||
          result;

        if (!data?.id) {
          throw new Error(
            'Business account was not found.'
          );
        }

        setBusiness(data);
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
    [businessId, navigate]
  );

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const goToDashboard = () => {
    if (!businessId) {
      navigate('/business');
      return;
    }

    navigate(
      `/business/dashboard/${encodeURIComponent(
        businessId
      )}`
    );
  };

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: PAGE_BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
        }}
      >
        <CircularProgress
          size={32}
          sx={{ color: GREEN }}
        />

        <Typography
          sx={{
            color: MUTED,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Loading business services...
        </Typography>
      </Box>
    );
  }

  // ==========================================================
  // ERROR SCREEN
  // ==========================================================

  if (error || !business) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: PAGE_BG,
          p: 2,
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={goToDashboard}
          sx={{
            color: GREEN,
            textTransform: 'none',
            fontWeight: 800,
          }}
        >
          Back to Business Dashboard
        </Button>

        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => loadBusiness()}
            >
              Retry
            </Button>
          }
        >
          {error || 'Business account not found.'}
        </Alert>
      </Box>
    );
  }

  // ==========================================================
  // BUSINESS VERIFICATION DATA
  // ==========================================================

  const level = getLevel(business);

  const verificationStatus = String(
    business.verification_status || 'pending'
  ).toLowerCase();

  const cacStatus = String(
    business.cac_status ||
      business.cac_verification_status ||
      ''
  ).toLowerCase();

  const cacApproved =
    business.cac_verified === true ||
    ['approved', 'verified', 'completed'].includes(
      cacStatus
    );

  const isLevelFourOrHigher = level >= 4;

  const isLevelFiveVerified =
    level === 5 &&
    verificationStatus === 'verified';

  const accountStatus = String(
    business.status ||
      business.account_status ||
      'pending'
  ).toLowerCase();

  const service = getSectionInfo(currentSection);

  const isVerificationPage =
    currentSection === 'verification' ||
    currentSection === 'kyc';

  const isPosPage = currentSection === 'pos';

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: PAGE_BG,
        color: DARK_GREEN,
        pb: 'calc(32px + env(safe-area-inset-bottom))',
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          borderTop: `4px solid ${GREEN}`,
          px: 2,
          py: 1.5,
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
          }}
        >
          <Button
            startIcon={<ArrowBack />}
            onClick={goToDashboard}
            sx={{
              color: GREEN,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 13,
              px: 0,
            }}
          >
            Back to Business Dashboard
          </Button>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.2}
            sx={{ mt: 1 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: DARK_GREEN,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 23,
                fontWeight: 900,
              }}
            >
              Z
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 19,
                  fontWeight: 900,
                  color: DARK_GREEN,
                  lineHeight: 1.2,
                }}
              >
                Zenimonies
              </Typography>

              <Typography
                sx={{
                  color: MUTED,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                }}
              >
                BUSINESS BANKING
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* MAIN CONTENT */}

      <Box
        sx={{
          maxWidth: 760,
          mx: 'auto',
          px: { xs: 1.75, sm: 3 },
          py: 2.5,
        }}
      >
        <Typography
          sx={{
            fontSize: {
              xs: 24,
              sm: 30,
            },
            fontWeight: 900,
            letterSpacing: -0.7,
            color: DARK_GREEN,
          }}
        >
          {service.title}
        </Typography>

        <Typography
          sx={{
            mt: 0.7,
            color: MUTED,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {service.description}
        </Typography>

        {/* BUSINESS ACCOUNT CARD */}

        <Card
          sx={{
            mt: 2.5,
            borderRadius: 3,
            border: `1px solid ${BORDER}`,
            boxShadow: 'none',
          }}
        >
          <CardContent sx={{ p: 2.2 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
            >
              <Box
                sx={{
                  width: 45,
                  height: 45,
                  borderRadius: 2.5,
                  bgcolor: '#E8F5EE',
                  color: GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Business Account
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 16,
                    fontWeight: 900,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {getCustomerName(business)}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 12,
                    color: MUTED,
                  }}
                >
                  Account status:{' '}
                  {accountStatus.replace(/_/g, ' ')}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1.8 }} />

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                sx={{
                  color: MUTED,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Verification Level
              </Typography>

              <Chip
                label={`Level ${level} of 5`}
                size="small"
                sx={{
                  bgcolor: LIGHT_GREEN,
                  color: GREEN,
                  fontWeight: 900,
                }}
              />
            </Stack>

            <Box
              sx={{
                display: 'flex',
                gap: 0.6,
                mt: 1.5,
              }}
            >
              {[1, 2, 3, 4, 5].map((item) => (
                <Box
                  key={item}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 10,
                    bgcolor:
                      item <= level
                        ? GREEN
                        : '#E1EAE5',
                  }}
                />
              ))}
            </Box>

            <Typography
              sx={{
                mt: 1.2,
                color: MUTED,
                fontSize: 12,
              }}
            >
              Verification status:{' '}
              {verificationStatus.replace(/_/g, ' ')}
            </Typography>
          </CardContent>
        </Card>

        {/* VERIFICATION CONTENT */}

        {isVerificationPage && (
          <>
            <Typography
              sx={{
                mt: 3,
                mb: 1.5,
                fontSize: 20,
                fontWeight: 900,
                color: DARK_GREEN,
              }}
            >
              Verification Requirements
            </Typography>

            {/* LEVELS 1-3 */}

            <Card
              sx={{
                mb: 1.5,
                borderRadius: 3,
                border: `1px solid ${BORDER}`,
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  spacing={1.3}
                  alignItems="flex-start"
                >
                  <Shield
                    sx={{
                      color: GREEN,
                      fontSize: 27,
                      mt: 0.2,
                    }}
                  />

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      Levels 1–3
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.7,
                        color: MUTED,
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Personal identity verification
                      requirements apply to business
                      Levels 1, 2, and 3. Follow the
                      verification instructions provided
                      by Zenimonies for your account.
                    </Typography>

                    <Chip
                      sx={{
                        mt: 1,
                        fontWeight: 800,
                      }}
                      size="small"
                      color={
                        level <= 3 &&
                        verificationStatus === 'verified'
                          ? 'success'
                          : 'default'
                      }
                      label={
                        level <= 3
                          ? `Current level: ${level}`
                          : 'Levels 1–3'
                      }
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* LEVEL 4 CAC */}

            <Card
              sx={{
                mb: 1.5,
                borderRadius: 3,
                border: `1px solid ${BORDER}`,
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  spacing={1.3}
                  alignItems="flex-start"
                >
                  <Description
                    sx={{
                      color: GREEN,
                      fontSize: 27,
                      mt: 0.2,
                    }}
                  />

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      Level 4 — CAC Verification
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.7,
                        color: MUTED,
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      CAC registration documents are
                      required for the Level 4 business
                      verification upgrade. They are
                      not required during initial
                      registration or Levels 1–3.
                    </Typography>

                    {isLevelFourOrHigher ? (
                      <Alert
                        severity={
                          cacApproved
                            ? 'success'
                            : 'info'
                        }
                        sx={{
                          mt: 1.5,
                          fontSize: 12,
                        }}
                      >
                        CAC status:{' '}
                        {cacApproved
                          ? 'Approved'
                          : cacStatus
                            ? cacStatus.replace(/_/g, ' ')
                            : 'Not confirmed'}
                      </Alert>
                    ) : (
                      <Chip
                        sx={{
                          mt: 1,
                          fontWeight: 800,
                        }}
                        size="small"
                        label="Required for Level 4 upgrade"
                      />
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* LEVEL 5 */}

            <Card
              sx={{
                mb: 1.5,
                borderRadius: 3,
                border: `1px solid ${BORDER}`,
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  spacing={1.3}
                  alignItems="flex-start"
                >
                  <Lock
                    sx={{
                      color: GREEN,
                      fontSize: 27,
                      mt: 0.2,
                    }}
                  />

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      Level 5 — Enhanced Verification
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.7,
                        color: MUTED,
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Level 5 is intended for enhanced
                      business verification. The
                      applicable requirements must be
                      confirmed by Zenimonies before
                      submission.
                    </Typography>

                    {isLevelFiveVerified && (
                      <Chip
                        color="success"
                        icon={<CheckCircle />}
                        label="Level 5 verified"
                        sx={{
                          mt: 1.2,
                          fontWeight: 800,
                        }}
                      />
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* BACKEND CONNECTION NOTICE */}

            <Alert
              severity="warning"
              icon={<WarningAmber />}
              sx={{
                mt: 2,
                borderRadius: 3,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Verification submissions, CAC document
              uploads, approval decisions, and account
              limits must be connected to the secure
              verification backend. This page does not
              submit identity documents or approve
              verification.
            </Alert>
          </>
        )}

        {/* POS INFORMATION */}

        {isPosPage && (
          <Card
            sx={{
              mt: 2.5,
              borderRadius: 3,
              border: `1px solid ${BORDER}`,
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <PointOfSale
                sx={{
                  color: GREEN,
                  fontSize: 35,
                }}
              />

              <Typography
                sx={{
                  mt: 1,
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                POS Terminal Services
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: MUTED,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                POS applications, terminal approval,
                device management, and settlement
                services must be connected to the
                dedicated business POS backend.
              </Typography>

              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  fontSize: 12,
                }}
              >
                POS application and device management
                are not activated by this information
                page.
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* OTHER BUSINESS SERVICES */}

        {!isVerificationPage && !isPosPage && (
          <Card
            sx={{
              mt: 2.5,
              borderRadius: 3,
              border: `1px solid ${BORDER}`,
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <AccountBalance
                sx={{
                  color: GREEN,
                  fontSize: 34,
                }}
              />

              <Typography
                sx={{
                  mt: 1,
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                Business Service
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: MUTED,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                This page is connected to your
                business account information. The
                requested service requires its own
                business-specific backend and
                authorization before it can perform
                financial operations.
              </Typography>

              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  fontSize: 12,
                }}
              >
                No business transfer or payment is
                processed by this placeholder.
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* FOOTER ACTIONS */}

        <Stack
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Button
            fullWidth
            variant="contained"
            onClick={goToDashboard}
            endIcon={<ArrowForward />}
            sx={{
              minHeight: 52,
              borderRadius: 2.5,
              bgcolor: GREEN,
              fontWeight: 900,
              fontSize: 13,
              textTransform: 'none',
              '&:hover': {
                bgcolor: DARK_GREEN,
              },
            }}
          >
            Return to Business Dashboard
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => loadBusiness(false)}
            disabled={refreshing}
            sx={{
              minHeight: 48,
              borderRadius: 2.5,
              borderColor: GREEN,
              color: GREEN,
              fontWeight: 900,
              textTransform: 'none',
            }}
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh Account Information'}
          </Button>
        </Stack>

        <Typography
          sx={{
            mt: 3,
            textAlign: 'center',
            color: MUTED,
            fontSize: 11,
          }}
        >
          Zenimonies Business Banking
        </Typography>
      </Box>
    </Box>
  );
};

export default BusinessServicePage;
