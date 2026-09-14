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
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Launch,
  Refresh,
  Security,
  VerifiedUser,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface KycStatus {
  status: string;
  tier: number;
  bvn_verified: boolean;
  id_verified: boolean;
  tier_3_verified: boolean;
  tier_3_method: string | null;
}

interface KycLimits {
  account_limit: number | null;
  daily_transfer_limit: number | null;
  daily_transfer_used: number;
  daily_transfer_remaining: number | null;
}

interface KycRecord {
  id?: string;

  bvn_verification_status?: string;
  bvn_verified_at?: string | null;
  bvn_rejection_reason?: string | null;

  id_verification_status?: string;
  id_verified_at?: string | null;
  id_rejection_reason?: string | null;

  tier_3_method?: string | null;
  tier_3_verification_status?: string;
  tier_3_verified_at?: string | null;
  tier_3_rejection_reason?: string | null;

  verification_status?: string;
  rejection_reason?: string | null;

  liveness_status?: string;
  liveness_verified_at?: string | null;
}

interface KycResponse {
  success: boolean;

  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };

  kyc?: KycStatus;
  limits?: KycLimits;
  record?: KycRecord | null;
  message?: string;
}

type VerificationState =
  | 'not_verified'
  | 'pending'
  | 'verified'
  | 'rejected';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const DOJAH_WIDGET_URL =
  'https://identity.dojah.io?widget_id=6aa821f4849d5418a821865c';

/* ============================================================
   STATUS HELPERS
   ============================================================ */

const normalizeStatus = (
  status: string | null | undefined
): VerificationState => {
  const normalized =
    String(status || '')
      .toLowerCase()
      .trim();

  if (
    normalized === 'verified' ||
    normalized === 'approved' ||
    normalized === 'completed' ||
    normalized === 'success'
  ) {
    return 'verified';
  }

  if (
    normalized === 'pending' ||
    normalized === 'under_review' ||
    normalized === 'submitted' ||
    normalized === 'processing' ||
    normalized === 'in_review'
  ) {
    return 'pending';
  }

  if (
    normalized === 'rejected' ||
    normalized === 'failed' ||
    normalized === 'declined'
  ) {
    return 'rejected';
  }

  return 'not_verified';
};

const statusLabel = (
  status: VerificationState
): string => {
  switch (status) {
    case 'verified':
      return 'Verified';

    case 'pending':
      return 'Pending Verification';

    case 'rejected':
      return 'Rejected';

    default:
      return 'Not Verified';
  }
};

const statusColor = (
  status: VerificationState
): string => {
  switch (status) {
    case 'verified':
      return '#027a48';

    case 'pending':
      return '#b54708';

    case 'rejected':
      return '#b42318';

    default:
      return '#475467';
  }
};

const statusBackground = (
  status: VerificationState
): string => {
  switch (status) {
    case 'verified':
      return '#ecfdf3';

    case 'pending':
      return '#fffaeb';

    case 'rejected':
      return '#fef3f2';

    default:
      return '#f2f4f7';
  }
};

/* ============================================================
   KYC PAGE
   ============================================================ */

const KYC: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [kyc, setKyc] =
    useState<KycStatus>({
      status: 'not_verified',
      tier: 0,
      bvn_verified: false,
      id_verified: false,
      tier_3_verified: false,
      tier_3_method: null,
    });

  const [limits, setLimits] =
    useState<KycLimits>({
      account_limit: 50000,
      daily_transfer_limit: 25000,
      daily_transfer_used: 0,
      daily_transfer_remaining: 25000,
    });

  const [record, setRecord] =
    useState<KycRecord | null>(null);

  const [userId, setUserId] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [widgetOpened, setWidgetOpened] =
    useState(false);

  const token =
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem('token');

  /* ============================================================
     MONEY
     ============================================================ */

  const formatMoney = (
    amount: number | null
  ): string => {
    if (amount === null) {
      return 'Unlimited';
    }

    return `₦${amount.toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  /* ============================================================
     OVERALL DOJAH VERIFICATION STATUS
     ============================================================ */

  const verificationStatus =
    useMemo<VerificationState>(() => {
      if (kyc.bvn_verified) {
        return 'verified';
      }

      const recordStatus =
        normalizeStatus(
          record?.verification_status
        );

      if (
        recordStatus === 'verified' ||
        recordStatus === 'pending' ||
        recordStatus === 'rejected'
      ) {
        return recordStatus;
      }

      return normalizeStatus(
        record?.bvn_verification_status
      );
    }, [
      kyc.bvn_verified,
      record?.verification_status,
      record?.bvn_verification_status,
    ]);

  const verificationLocked =
    verificationStatus === 'pending' ||
    verificationStatus === 'verified';

  const isVerified =
    verificationStatus === 'verified';

  const isPending =
    verificationStatus === 'pending';

  const isRejected =
    verificationStatus === 'rejected';

  /* ============================================================
     LOAD KYC STATUS
     ============================================================ */

  const loadKycStatus = async (
    showSpinner = true
  ) => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (showSpinner) {
      setLoading(true);
    }

    setError('');

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/kyc/status`,
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
          }
        );

      const data: KycResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to load KYC status.'
        );
      }

      if (data.user?.id) {
        setUserId(data.user.id);
      }

      if (data.kyc) {
        setKyc({
          status:
            data.kyc.status ||
            'not_verified',

          tier:
            Number(
              data.kyc.tier
            ) || 0,

          bvn_verified:
            Boolean(
              data.kyc
                .bvn_verified
            ),

          id_verified:
            Boolean(
              data.kyc
                .id_verified
            ),

          tier_3_verified:
            Boolean(
              data.kyc
                .tier_3_verified
            ),

          tier_3_method:
            data.kyc
              .tier_3_method ||
            null,
        });
      }

      if (data.limits) {
        setLimits(
          data.limits
        );
      }

      setRecord(
        data.record || null
      );
    } catch (err) {
      console.error(
        'KYC status error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load KYC status.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadKycStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     START DOJAH VERIFICATION
     ============================================================ */

  const startDojahVerification = () => {
    setError('');
    setMessage('');

    if (!userId) {
      setError(
        'Your account information is still loading. Please try again.'
      );
      return;
    }

    if (verificationStatus === 'verified') {
      setMessage(
        'Your identity has already been verified. Verification cannot be submitted again.'
      );
      return;
    }

    if (verificationStatus === 'pending') {
      setMessage(
        'Your verification is already pending. Please wait for Dojah to complete the verification.'
      );
      return;
    }

    /*
      The user ID is attached as a reference identifier
      so the verification attempt can be associated with
      the Zenimonies account.
    */

    const separator =
      DOJAH_WIDGET_URL.includes('?')
        ? '&'
        : '?';

    const verificationUrl =
      `${DOJAH_WIDGET_URL}` +
      `${separator}reference_id=${encodeURIComponent(
        userId
      )}`;

    const verificationWindow =
      window.open(
        verificationUrl,
        '_blank',
        'noopener,noreferrer'
      );

    if (!verificationWindow) {
      /*
        Some browsers block a new tab/window.
        Fall back to the current tab.
      */
      window.location.href =
        verificationUrl;

      return;
    }

    setWidgetOpened(true);

    setMessage(
      'Dojah verification has been opened. Complete the verification and return to Zenimonies.'
    );
  };

  /* ============================================================
     REFRESH
     ============================================================ */

  const refreshStatus = async () => {
    setRefreshing(true);
    setMessage('');

    await loadKycStatus(false);
  };

  /* ============================================================
     LOADING
     ============================================================ */

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
        <Stack
          spacing={2}
          alignItems="center"
        >
          <CircularProgress />
          <Typography
            color="text.secondary"
          >
            Loading verification status...
          </Typography>
        </Stack>
      </Box>
    );
  }

  /* ============================================================
     PAGE
     ============================================================ */

  return (
    <Container
      maxWidth="md"
      sx={{
        py: {
          xs: 3,
          md: 5,
        },
      }}
    >
      {/* HEADER */}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() =>
            navigate('/dashboard')
          }
          sx={{
            textTransform: 'none',
          }}
        >
          Back
        </Button>

        <Button
          startIcon={<Refresh />}
          onClick={refreshStatus}
          disabled={refreshing}
          sx={{
            textTransform: 'none',
          }}
        >
          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </Button>
      </Stack>

      {/* TITLE */}

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            color: '#12372a',
            mb: 0.8,
          }}
        >
          KYC Verification
        </Typography>

        <Typography
          color="text.secondary"
        >
          Verify your identity securely through
          Dojah.
        </Typography>
      </Box>

      {/* ERROR */}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* MESSAGE */}

      {message && (
        <Alert
          severity={
            isVerified
              ? 'success'
              : 'info'
          }
          sx={{ mb: 2 }}
        >
          {message}
        </Alert>
      )}

      {/* STATUS CARD */}

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border:
            '1px solid #e4e7ec',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
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
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background:
                    statusBackground(
                      verificationStatus
                    ),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isVerified ? (
                  <CheckCircle
                    sx={{
                      color:
                        statusColor(
                          verificationStatus
                        ),
                    }}
                  />
                ) : (
                  <VerifiedUser
                    sx={{
                      color:
                        statusColor(
                          verificationStatus
                        ),
                    }}
                  />
                )}
              </Box>

              <Box>
                <Typography
                  fontWeight={700}
                >
                  Dojah Identity Verification
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  NIN • BVN • Liveness • Email
                </Typography>
              </Box>
            </Stack>

            <Chip
              label={statusLabel(
                verificationStatus
              )}
              sx={{
                fontWeight: 700,
                color:
                  statusColor(
                    verificationStatus
                  ),
                backgroundColor:
                  statusBackground(
                    verificationStatus
                  ),
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* MAIN VERIFICATION */}

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border:
            '1px solid #e4e7ec',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            spacing={2.5}
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
              >
                Identity Verification
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Zenimonies uses Dojah to perform
                your identity verification.
              </Typography>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                background:
                  '#f8faf9',
                border:
                  '1px solid #e4e7ec',
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
              >
                <Security
                  sx={{
                    color: '#12372a',
                    mt: 0.2,
                  }}
                />

                <Box>
                  <Typography
                    fontWeight={700}
                    sx={{ mb: 0.5 }}
                  >
                    Secure verification by Dojah
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Follow the Dojah verification
                    steps to verify your identity.
                    Dojah handles the verification
                    decision.
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {isRejected && (
              <Alert severity="error">
                <Typography
                  fontWeight={700}
                  sx={{ mb: 0.5 }}
                >
                  Verification Rejected
                </Typography>

                <Typography
                  variant="body2"
                >
                  {record?.rejection_reason ||
                    record?.bvn_rejection_reason ||
                    'Dojah rejected this verification. Please correct the issue and submit again.'}
                </Typography>
              </Alert>
            )}

            {isPending && (
              <Alert severity="warning">
                Your verification is currently
                pending. You cannot start another
                verification while this verification
                is being processed.
              </Alert>
            )}

            {isVerified && (
              <Alert severity="success">
                Your identity has been verified.
                Your verification is locked and
                cannot be resubmitted.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={
                isVerified ? (
                  <CheckCircle />
                ) : (
                  <Launch />
                )
              }
              onClick={
                startDojahVerification
              }
              disabled={
                verificationLocked
              }
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 800,
                backgroundColor:
                  '#12372a',
                '&:hover': {
                  backgroundColor:
                    '#0d2b20',
                },
              }}
            >
              {isVerified
                ? 'Identity Verified'
                : isPending
                  ? 'Verification Pending'
                  : isRejected
                    ? 'Retry Verification'
                    : 'Start Identity Verification'}
            </Button>

            {widgetOpened &&
              !isVerified && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  After completing Dojah,
                  return here and tap Refresh to
                  check your Zenimonies verification
                  status.
                </Typography>
              )}
          </Stack>
        </CardContent>
      </Card>

      {/* KYC LEVEL */}

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border:
            '1px solid #e4e7ec',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 2 }}
          >
            Current KYC Level
          </Typography>

          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={12}
              sm={6}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background:
                    '#f8faf9',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Current Tier
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    color: '#12372a',
                  }}
                >
                  Tier {kyc.tier}
                </Typography>
              </Paper>
            </Grid>

            <Grid
              item
              xs={12}
              sm={6}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background:
                    '#f8faf9',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Verification Status
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    color:
                      statusColor(
                        verificationStatus
                      ),
                  }}
                >
                  {statusLabel(
                    verificationStatus
                  )}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* LIMITS */}

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border:
            '1px solid #e4e7ec',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 2 }}
          >
            KYC Limits
          </Typography>

          <Stack spacing={1.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                Account Limit
              </Typography>

              <Typography
                fontWeight={700}
              >
                {formatMoney(
                  limits.account_limit
                )}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                Daily Transfer Limit
              </Typography>

              <Typography
                fontWeight={700}
              >
                {formatMoney(
                  limits.daily_transfer_limit
                )}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                Daily Transfer Used
              </Typography>

              <Typography
                fontWeight={700}
              >
                {formatMoney(
                  limits.daily_transfer_used
                )}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                Daily Transfer Remaining
              </Typography>

              <Typography
                fontWeight={700}
              >
                {formatMoney(
                  limits.daily_transfer_remaining
                )}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* LATEST RECORD */}

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border:
            '1px solid #e4e7ec',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 2 }}
          >
            Verification Details
          </Typography>

          <Stack spacing={1.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                BVN
              </Typography>

              <Typography
                fontWeight={700}
                sx={{
                  color:
                    statusColor(
                      kyc.bvn_verified
                        ? 'verified'
                        : normalizeStatus(
                            record?.bvn_verification_status
                          )
                    ),
                }}
              >
                {statusLabel(
                  kyc.bvn_verified
                    ? 'verified'
                    : normalizeStatus(
                        record?.bvn_verification_status
                      )
                )}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                Liveness
              </Typography>

              <Typography
                fontWeight={700}
                sx={{
                  color:
                    statusColor(
                      normalizeStatus(
                        record?.liveness_status
                      )
                    ),
                }}
              >
                {statusLabel(
                  normalizeStatus(
                    record?.liveness_status
                  )
                )}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                ID Verification
              </Typography>

              <Typography
                fontWeight={700}
                sx={{
                  color:
                    statusColor(
                      kyc.id_verified
                        ? 'verified'
                        : normalizeStatus(
                            record?.id_verification_status
                          )
                    ),
                }}
              >
                {statusLabel(
                  kyc.id_verified
                    ? 'verified'
                    : normalizeStatus(
                        record?.id_verification_status
                      )
                )}
              </Typography>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
            >
              <Typography
                color="text.secondary"
              >
                Tier 3
              </Typography>

              <Typography
                fontWeight={700}
                sx={{
                  color:
                    statusColor(
                      kyc.tier_3_verified
                        ? 'verified'
                        : normalizeStatus(
                            record?.tier_3_verification_status
                          )
                    ),
                }}
              >
                {statusLabel(
                  kyc.tier_3_verified
                    ? 'verified'
                    : normalizeStatus(
                        record?.tier_3_verification_status
                      )
                )}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default KYC;
