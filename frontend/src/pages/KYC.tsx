
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
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
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircleOutline,
  CloudUploadOutlined,
  VerifiedUserOutlined,
  LockOutlined,
  AccountBalanceOutlined,
  BadgeOutlined,
  HomeOutlined,
  RefreshOutlined,
} from '@mui/icons-material';

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER IDENTITY VERIFICATION
// ============================================================

const API_BASE_URL = (
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api'
).replace(/\/+$/, '');

type VerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'not_verified';

interface KycData {
  status?: string;
  kyc_status?: string;
  tier?: number;
  submitted_tier?: number;

  bvn_verified?: boolean;
  bvn_status?: string;
  bvn_verification_status?: string;
  bvn_locked?: boolean;
  bvn_rejection_reason?: string;

  id_verified?: boolean;
  id_status?: string;
  id_verification_status?: string;
  id_locked?: boolean;
  id_rejection_reason?: string;

  tier_3_verified?: boolean;
  tier_3_status?: string;
  tier_3_verification_status?: string;
  tier_3_locked?: boolean;
  tier_3_method?: string;
  tier_3_rejection_reason?: string;

  record?: {
    bvn_status?: string;
    id_status?: string;
    tier_3_status?: string;
    tier_3_method?: string;
    document_type?: string;
    document_number?: string;
    rejection_reason?: string;
  };

  limits?: {
    tier?: number;
    account_limit?: number | string;
    daily_transfer_limit?: number | string;
    accountLimit?: number | string;
    dailyTransferLimit?: number | string;
  };
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  kyc?: KycData;
  data?: KycData;
}

const getToken = (): string | null => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token')
  );
};

const getAuthHeaders = () => {
  const token = getToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

const normalizeStatus = (
  value?: string | boolean | null
): VerificationStatus => {
  if (value === true) return 'verified';
  if (value === false) return 'not_submitted';

  const status = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    ['verified', 'approved', 'complete', 'completed', 'success']
      .includes(status)
  ) {
    return 'verified';
  }

  if (
    ['pending', 'processing', 'under_review', 'submitted']
      .includes(status)
  ) {
    return 'pending';
  }

  if (
    ['rejected', 'declined', 'failed', 'not_verified']
      .includes(status)
  ) {
    return 'rejected';
  }

  return 'not_submitted';
};

const formatNaira = (value?: number | string): string => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 'Not available';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(amount);
};

const statusLabel = (status: VerificationStatus): string => {
  switch (status) {
    case 'verified':
      return 'Verified';

    case 'pending':
      return 'Pending review';

    case 'rejected':
      return 'Not verified';

    default:
      return 'Not submitted';
  }
};

const statusColor = (
  status: VerificationStatus
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'verified':
      return 'success';

    case 'pending':
      return 'warning';

    case 'rejected':
      return 'error';

    default:
      return 'default';
  }
};

const getErrorMessage = (error: any): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
};

const KYC: React.FC = () => {
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTier, setActiveTier] = useState(1);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tier 1
  const [bvn, setBvn] = useState('');

  // Tier 2
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentFront, setDocumentFront] =
    useState<File | null>(null);
  const [documentBack, setDocumentBack] =
    useState<File | null>(null);
  const [tier2Selfie, setTier2Selfie] =
    useState<File | null>(null);

  // Tier 3
  const [tier3Method, setTier3Method] = useState('');
  const [tier3Document, setTier3Document] =
    useState<File | null>(null);
  const [tier3Selfie, setTier3Selfie] =
    useState<File | null>(null);

  const fetchKycStatus = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();

      if (!token) {
        setError(
          'Your session has expired. Please sign in again.'
        );
        return;
      }

      const response = await axios.get<ApiResponse>(
        `${API_BASE_URL}/kyc/status`,
        {
          headers: getAuthHeaders(),
        }
      );

      const payload = response.data;

      const data =
        payload?.kyc ||
        payload?.data ||
        (payload as any);

      setKyc(data || {});

      const bvnStatus = normalizeStatus(
        data?.bvn_status ||
        data?.bvn_verification_status ||
        data?.record?.bvn_status ||
        (data?.bvn_verified ? 'verified' : undefined)
      );

      const idStatus = normalizeStatus(
        data?.id_status ||
        data?.id_verification_status ||
        data?.record?.id_status ||
        (data?.id_verified ? 'verified' : undefined)
      );

      const tier3Status = normalizeStatus(
        data?.tier_3_status ||
        data?.tier_3_verification_status ||
        data?.record?.tier_3_status ||
        (data?.tier_3_verified ? 'verified' : undefined)
      );

      // Open the next incomplete tier by default.
      if (
        bvnStatus !== 'verified'
      ) {
        setActiveTier(1);
      } else if (
        idStatus !== 'verified'
      ) {
        setActiveTier(2);
      } else if (
        tier3Status !== 'verified'
      ) {
        setActiveTier(3);
      } else {
        setActiveTier(3);
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  const bvnStatus = normalizeStatus(
    kyc?.bvn_status ||
    kyc?.bvn_verification_status ||
    kyc?.record?.bvn_status ||
    (kyc?.bvn_verified ? 'verified' : undefined)
  );

  const idStatus = normalizeStatus(
    kyc?.id_status ||
    kyc?.id_verification_status ||
    kyc?.record?.id_status ||
    (kyc?.id_verified ? 'verified' : undefined)
  );

  const tier3Status = normalizeStatus(
    kyc?.tier_3_status ||
    kyc?.tier_3_verification_status ||
    kyc?.record?.tier_3_status ||
    (kyc?.tier_3_verified ? 'verified' : undefined)
  );

  const currentTier = Number(kyc?.tier || 0);

  const accountLimit =
    kyc?.limits?.account_limit ??
    kyc?.limits?.accountLimit;

  const dailyTransferLimit =
    kyc?.limits?.daily_transfer_limit ??
    kyc?.limits?.dailyTransferLimit;

  const tier2Locked = Boolean(kyc?.id_locked);
  const tier3Locked = Boolean(kyc?.tier_3_locked);

  const bvnLocked = Boolean(kyc?.bvn_locked);

  const isPassport =
    documentType === 'international_passport';

  const validateFile = (
    file: File | null,
    required: boolean,
    label: string
  ): string | null => {
    if (!file) {
      return required ? `${label} is required.` : null;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.type)) {
      return (
        `${label} must be a JPG, PNG, WEBP, or PDF file.`
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return `${label} must not exceed 10 MB.`;
    }

    return null;
  };

  const submitBvn = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!/^\d{11}$/.test(bvn.trim())) {
      setError('Please enter a valid 11-digit BVN.');
      return;
    }

    if (bvnLocked || bvnStatus === 'pending') {
      setError(
        'Your BVN is already submitted or locked. Please wait for review.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/kyc/bvn`,
        {
          bvn: bvn.trim(),
        },
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );

      setSuccess(
        response.data?.message ||
        'Your BVN submission has been received. Verification is pending review.'
      );

      setBvn('');

      await fetchKycStatus();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier2 = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!documentType) {
      setError('Please select your identity document type.');
      return;
    }

    if (!documentNumber.trim()) {
      setError('Please enter your document number.');
      return;
    }

    const frontError = validateFile(
      documentFront,
      true,
      'Front of identity document'
    );

    const backError = validateFile(
      documentBack,
      !isPassport,
      'Back of identity document'
    );

    const selfieError = validateFile(
      tier2Selfie,
      true,
      'Selfie'
    );

    const validationError =
      frontError || backError || selfieError;

    if (validationError) {
      setError(validationError);
      return;
    }

    if (tier2Locked || idStatus === 'pending') {
      setError(
        'Your identity verification is already submitted or locked. Please wait for review.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append(
        'document_type',
        documentType
      );

      formData.append(
        'document_number',
        documentNumber.trim()
      );

      if (documentFront) {
        formData.append(
          'document_front',
          documentFront
        );
      }

      if (documentBack && !isPassport) {
        formData.append(
          'document_back',
          documentBack
        );
      }

      if (tier2Selfie) {
        formData.append(
          'selfie',
          tier2Selfie
        );
      }

      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/kyc/tier-2`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      setSuccess(
        response.data?.message ||
        'Your identity verification submission has been received and is pending review.'
      );

      setDocumentType('');
      setDocumentNumber('');
      setDocumentFront(null);
      setDocumentBack(null);
      setTier2Selfie(null);

      await fetchKycStatus();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier3 = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!tier3Method) {
      setError('Please select a proof-of-address document type.');
      return;
    }

    const documentError = validateFile(
      tier3Document,
      true,
      'Proof-of-address document'
    );

    const selfieError = validateFile(
      tier3Selfie,
      true,
      'Selfie'
    );

    const validationError =
      documentError || selfieError;

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      tier3Locked ||
      tier3Status === 'pending'
    ) {
      setError(
        'Your proof-of-address verification is already submitted or locked. Please wait for review.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append(
        'tier_3_method',
        tier3Method
      );

      if (tier3Document) {
        formData.append(
          'tier_3_document',
          tier3Document
        );
      }

      if (tier3Selfie) {
        formData.append(
          'tier_3_selfie',
          tier3Selfie
        );
      }

      const response = await axios.post<ApiResponse>(
        `${API_BASE_URL}/kyc/tier-3`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      setSuccess(
        response.data?.message ||
        'Your proof-of-address submission has been received and is pending review.'
      );

      setTier3Method('');
      setTier3Document(null);
      setTier3Selfie(null);

      await fetchKycStatus();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = (
    status: VerificationStatus
  ) => (
    <Chip
      label={statusLabel(status)}
      color={statusColor(status)}
      size="small"
      sx={{
        fontWeight: 700,
        borderRadius: 2,
      }}
    />
  );

  const renderFileInput = (
    label: string,
    file: File | null,
    setFile: (file: File | null) => void,
    accept = 'image/jpeg,image/png,image/webp,application/pdf'
  ) => (
    <Box>
      <Button
        variant="outlined"
        component="label"
        fullWidth
        startIcon={<CloudUploadOutlined />}
        sx={{
          minHeight: 54,
          borderRadius: 2,
          borderColor: '#14804A',
          color: '#14804A',
          textTransform: 'none',
          fontWeight: 600,
          justifyContent: 'flex-start',
          px: 2,
          '&:hover': {
            borderColor: '#0B6337',
            backgroundColor: '#F0FBF5',
          },
        }}
      >
        {file ? 'Change file' : label}
        <input
          type="file"
          hidden
          accept={accept}
          onChange={(event) => {
            const selected =
              event.target.files?.[0] || null;

            setFile(selected);

            // Permit selecting the same file again.
            event.target.value = '';
          }}
        />
      </Button>

      {file && (
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: '#F0FBF5',
            borderRadius: 2,
            overflowWrap: 'anywhere',
          }}
        >
          <Typography
            variant="body2"
            fontWeight={600}
            color="#166534"
          >
            {file.name}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </Typography>

          <Button
            size="small"
            color="error"
            onClick={() => setFile(null)}
            sx={{
              display: 'block',
              mt: 0.5,
              textTransform: 'none',
            }}
          >
            Remove file
          </Button>
        </Box>
      )}

      <FormHelperText>
        Accepted: JPG, PNG, WEBP or PDF. Maximum 10 MB.
      </FormHelperText>
    </Box>
  );

  const renderTierHeader = (
    tier: number,
    title: string,
    description: string,
    icon: React.ReactNode,
    status: VerificationStatus
  ) => (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ mb: 2 }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          minWidth: 48,
          borderRadius: 2,
          bgcolor: '#E8F7EE',
          color: '#14804A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          fontWeight={800}
          color="#14532D"
        >
          Tier {tier}: {title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
        >
          {description}
        </Typography>
      </Box>

      {renderStatus(status)}
    </Stack>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: '#14804A' }} />

        <Typography color="text.secondary">
          Loading your verification status...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F5F8F6',
        py: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="md">
        {/* ================================================== */}
        {/* PAGE HEADER */}
        {/* ================================================== */}

        <Box sx={{ mb: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 1 }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                bgcolor: '#14804A',
                color: '#FFFFFF',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VerifiedUserOutlined />
            </Box>

            <Box>
              <Typography
                variant="h5"
                fontWeight={900}
                color="#14532D"
              >
                Account Verification
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Zenimonies Banking
              </Typography>
            </Box>
          </Stack>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            Complete your verification in stages to access
            the account features and transaction limits
            available to your account.
          </Typography>
        </Box>

        {/* ================================================== */}
        {/* ALERTS */}
        {/* ================================================== */}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess('')}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {success}
          </Alert>
        )}

        {/* ================================================== */}
        {/* ACCOUNT SUMMARY */}
        {/* ================================================== */}

        <Card
          elevation={0}
          sx={{
            mb: 3,
            border: '1px solid #DCE9E0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              bgcolor: '#14804A',
              color: '#FFFFFF',
              p: 2.5,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.9 }}
                >
                  Current verification tier
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={900}
                >
                  Tier {currentTier}
                </Typography>
              </Box>

              <VerifiedUserOutlined
                sx={{ fontSize: 42, opacity: 0.9 }}
              />
            </Stack>
          </Box>

          <CardContent sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              divider={
                <Divider
                  orientation="vertical"
                  flexItem
                />
              }
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Account limit
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight={800}
                  color="#14532D"
                >
                  {formatNaira(accountLimit)}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Daily transfer limit
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight={800}
                  color="#14532D"
                >
                  {formatNaira(dailyTransferLimit)}
                </Typography>
              </Box>
            </Stack>

            <Alert
              severity="info"
              sx={{
                mt: 2,
                borderRadius: 2,
                fontSize: 13,
              }}
            >
              Your approved tier and transaction limits
              are determined by the bank's verification
              process. Submitting documents does not
              automatically increase your limits.
            </Alert>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* TIER NAVIGATION */}
        {/* ================================================== */}

        <Card
          elevation={0}
          sx={{
            mb: 3,
            border: '1px solid #DCE9E0',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
            >
              {[
                {
                  tier: 1,
                  label: 'Tier 1',
                  status: bvnStatus,
                },
                {
                  tier: 2,
                  label: 'Tier 2',
                  status: idStatus,
                },
                {
                  tier: 3,
                  label: 'Tier 3',
                  status: tier3Status,
                },
              ].map((item) => (
                <Button
                  key={item.tier}
                  fullWidth
                  onClick={() => {
                    setActiveTier(item.tier);
                    setError('');
                    setSuccess('');
                  }}
                  variant={
                    activeTier === item.tier
                      ? 'contained'
                      : 'outlined'
                  }
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 800,
                    backgroundColor:
                      activeTier === item.tier
                        ? '#14804A'
                        : '#FFFFFF',
                    borderColor: '#14804A',
                    color:
                      activeTier === item.tier
                        ? '#FFFFFF'
                        : '#14804A',
                    '&:hover': {
                      backgroundColor:
                        activeTier === item.tier
                          ? '#0B6337'
                          : '#F0FBF5',
                    },
                  }}
                >
                  {item.label}
                  {' · '}
                  {statusLabel(item.status)}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* TIER 1 - BVN */}
        {/* ================================================== */}

        {activeTier === 1 && (
          <Card
            elevation={0}
            sx={{
              mb: 3,
              border: '1px solid #DCE9E0',
              borderRadius: 3,
            }}
          >
            <CardContent
              sx={{ p: { xs: 2, sm: 3 } }}
            >
              {renderTierHeader(
                1,
                'Basic Verification',
                'Verify your identity using your BVN.',
                <AccountBalanceOutlined />,
                bvnStatus
              )}

              <Divider sx={{ my: 2 }} />

              {bvnStatus === 'verified' ? (
                <Alert
                  severity="success"
                  sx={{ borderRadius: 2 }}
                >
                  Your Tier 1 BVN verification is marked
                  as verified.
                </Alert>
              ) : bvnStatus === 'pending' ? (
                <Alert
                  severity="warning"
                  sx={{ borderRadius: 2 }}
                >
                  Your BVN submission is pending review.
                  You do not need to submit it again.
                </Alert>
              ) : (
                <>
                  <Alert
                    severity="info"
                    sx={{ mb: 2, borderRadius: 2 }}
                  >
                    Enter the 11-digit BVN associated
                    with your bank identity.
                  </Alert>

                  <Box
                    component="form"
                    onSubmit={submitBvn}
                  >
                    <TextField
                      label="Bank Verification Number (BVN)"
                      value={bvn}
                      onChange={(event) => {
                        setBvn(
                          event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 11)
                        );
                      }}
                      fullWidth
                      required
                      type="password"
                      autoComplete="off"
                      inputProps={{
                        maxLength: 11,
                        inputMode: 'numeric',
                      }}
                      helperText={`${bvn.length}/11 digits`}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    <Alert
                      severity="warning"
                      icon={<LockOutlined />}
                      sx={{ mb: 2, borderRadius: 2 }}
                    >
                      Never share your BVN or OTP with
                      anyone. Your BVN is sent to the
                      authenticated verification endpoint.
                    </Alert>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={
                        submitting ||
                        bvn.length !== 11 ||
                        bvnLocked
                      }
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        bgcolor: '#14804A',
                        fontWeight: 800,
                        textTransform: 'none',
                        '&:hover': {
                          bgcolor: '#0B6337',
                        },
                      }}
                    >
                      {submitting ? (
                        <CircularProgress
                          size={24}
                          color="inherit"
                        />
                      ) : (
                        'Submit BVN for Verification'
                      )}
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================== */}
        {/* TIER 2 - ID AND SELFIE */}
        {/* ================================================== */}

        {activeTier === 2 && (
          <Card
            elevation={0}
            sx={{
              mb: 3,
              border: '1px solid #DCE9E0',
              borderRadius: 3,
            }}
          >
            <CardContent
              sx={{ p: { xs: 2, sm: 3 } }}
            >
              {renderTierHeader(
                2,
                'Identity Verification',
                'Submit your identity document and selfie.',
                <BadgeOutlined />,
                idStatus
              )}

              <Divider sx={{ my: 2 }} />

              {idStatus === 'verified' ? (
                <Alert
                  severity="success"
                  sx={{ borderRadius: 2 }}
                >
                  Your Tier 2 identity verification is
                  marked as verified.
                </Alert>
              ) : idStatus === 'pending' ? (
                <Alert
                  severity="warning"
                  sx={{ borderRadius: 2 }}
                >
                  Your identity verification is pending
                  review. Please wait for an update.
                </Alert>
              ) : (
                <>
                  <Alert
                    severity="info"
                    sx={{ mb: 2, borderRadius: 2 }}
                  >
                    Select your government-issued identity
                    document. Upload clear images of the
                    required sides and a recent selfie.
                  </Alert>

                  <Box
                    component="form"
                    onSubmit={submitTier2}
                  >
                    <Stack spacing={2}>
                      <FormControl fullWidth required>
                        <InputLabel>
                          Identity Document Type
                        </InputLabel>

                        <Select
                          value={documentType}
                          label="Identity Document Type"
                          onChange={(event) => {
                            setDocumentType(
                              event.target.value
                            );
                            setDocumentFront(null);
                            setDocumentBack(null);
                          }}
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="national_id">
                            National ID
                          </MenuItem>

                          <MenuItem value="nin">
                            National Identification Number (NIN)
                          </MenuItem>

                          <MenuItem value="drivers_license">
                            Driver's License
                          </MenuItem>

                          <MenuItem value="international_passport">
                            International Passport
                          </MenuItem>

                          <MenuItem value="voters_card">
                            Voter's Card
                          </MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        label="Document Number"
                        value={documentNumber}
                        onChange={(event) =>
                          setDocumentNumber(
                            event.target.value
                          )
                        }
                        fullWidth
                        required
                        autoComplete="off"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      {renderFileInput(
                        'Upload Front of ID',
                        documentFront,
                        setDocumentFront
                      )}

                      {!isPassport &&
                        renderFileInput(
                          'Upload Back of ID',
                          documentBack,
                          setDocumentBack
                        )}

                      {isPassport && (
                        <Alert
                          severity="info"
                          sx={{ borderRadius: 2 }}
                        >
                          For international passports,
                          upload the page containing your
                          photograph and personal details.
                        </Alert>
                      )}

                      {renderFileInput(
                        'Upload Recent Selfie',
                        tier2Selfie,
                        setTier2Selfie,
                        'image/jpeg,image/png,image/webp'
                      )}

                      <Alert
                        severity="warning"
                        icon={<LockOutlined />}
                        sx={{ borderRadius: 2 }}
                      >
                        Upload only your own documents.
                        Your submission will not be
                        considered verified until the
                        required review is completed.
                      </Alert>

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={
                          submitting ||
                          !documentType ||
                          !documentNumber.trim() ||
                          !documentFront ||
                          !tier2Selfie ||
                          (!isPassport && !documentBack) ||
                          tier2Locked
                        }
                        sx={{
                          py: 1.5,
                          borderRadius: 2,
                          bgcolor: '#14804A',
                          fontWeight: 800,
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: '#0B6337',
                          },
                        }}
                      >
                        {submitting ? (
                          <CircularProgress
                            size={24}
                            color="inherit"
                          />
                        ) : (
                          'Submit Tier 2 Verification'
                        )}
                      </Button>
                    </Stack>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================== */}
        {/* TIER 3 - PROOF OF ADDRESS */}
        {/* ================================================== */}

        {activeTier === 3 && (
          <Card
            elevation={0}
            sx={{
              mb: 3,
              border: '1px solid #DCE9E0',
              borderRadius: 3,
            }}
          >
            <CardContent
              sx={{ p: { xs: 2, sm: 3 } }}
            >
              {renderTierHeader(
                3,
                'Address Verification',
                'Submit proof of your residential address.',
                <HomeOutlined />,
                tier3Status
              )}

              <Divider sx={{ my: 2 }} />

              {tier3Status === 'verified' ? (
                <Alert
                  severity="success"
                  sx={{ borderRadius: 2 }}
                >
                  Your Tier 3 address verification is
                  marked as verified.
                </Alert>
              ) : tier3Status === 'pending' ? (
                <Alert
                  severity="warning"
                  sx={{ borderRadius: 2 }}
                >
                  Your proof-of-address submission is
                  pending review.
                </Alert>
              ) : (
                <>
                  <Alert
                    severity="info"
                    sx={{ mb: 2, borderRadius: 2 }}
                  >
                    Upload a valid document that supports
                    your residential address.
                  </Alert>

                  <Box
                    component="form"
                    onSubmit={submitTier3}
                  >
                    <Stack spacing={2}>
                      <FormControl fullWidth required>
                        <InputLabel>
                          Proof of Address Type
                        </InputLabel>

                        <Select
                          value={tier3Method}
                          label="Proof of Address Type"
                          onChange={(event) => {
                            setTier3Method(
                              event.target.value
                            );
                            setTier3Document(null);
                          }}
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="bank_statement">
                            Bank Statement
                          </MenuItem>

                          <MenuItem value="utility_bill">
                            Utility Bill
                          </MenuItem>

                          <MenuItem value="proof_of_address">
                            Other Proof of Address
                          </MenuItem>
                        </Select>
                      </FormControl>

                      {renderFileInput(
                        'Upload Proof of Address',
                        tier3Document,
                        setTier3Document
                      )}

                      {renderFileInput(
                        'Upload Recent Selfie',
                        tier3Selfie,
                        setTier3Selfie,
                        'image/jpeg,image/png,image/webp'
                      )}

                      <Alert
                        severity="warning"
                        icon={<LockOutlined />}
                        sx={{ borderRadius: 2 }}
                      >
                        Make sure the document is clear
                        and shows your residential
                        address. Your account tier will
                        not change until verification
                        is approved.
                      </Alert>

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={
                          submitting ||
                          !tier3Method ||
                          !tier3Document ||
                          !tier3Selfie ||
                          tier3Locked
                        }
                        sx={{
                          py: 1.5,
                          borderRadius: 2,
                          bgcolor: '#14804A',
                          fontWeight: 800,
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: '#0B6337',
                          },
                        }}
                      >
                        {submitting ? (
                          <CircularProgress
                            size={24}
                            color="inherit"
                          />
                        ) : (
                          'Submit Tier 3 Verification'
                        )}
                      </Button>
                    </Stack>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================== */}
        {/* VERIFICATION SUMMARY */}
        {/* ================================================== */}

        <Card
          elevation={0}
          sx={{
            mb: 3,
            border: '1px solid #DCE9E0',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="h6"
              fontWeight={900}
              color="#14532D"
              sx={{ mb: 2 }}
            >
              Verification Summary
            </Typography>

            <Stack spacing={2}>
              {[
                {
                  label: 'Tier 1 · BVN',
                  status: bvnStatus,
                },
                {
                  label: 'Tier 2 · Identity Document',
                  status: idStatus,
                },
                {
                  label: 'Tier 3 · Proof of Address',
                  status: tier3Status,
                },
              ].map((item) => (
                <Stack
                  key={item.label}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                  >
                    {item.label}
                  </Typography>

                  {renderStatus(item.status)}
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Button
              onClick={fetchKycStatus}
              fullWidth
              variant="outlined"
              startIcon={<RefreshOutlined />}
              disabled={loading || submitting}
              sx={{
                borderRadius: 2,
                borderColor: '#14804A',
                color: '#14804A',
                fontWeight: 800,
                textTransform: 'none',
                py: 1.25,
                '&:hover': {
                  borderColor: '#0B6337',
                  backgroundColor: '#F0FBF5',
                },
              }}
            >
              Refresh Verification Status
            </Button>
          </CardContent>
        </Card>

        {/* ================================================== */}
        {/* SECURITY FOOTER */}
        {/* ================================================== */}

        <Box
          sx={{
            textAlign: 'center',
            px: 2,
            pb: 3,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <LockOutlined
              sx={{
                fontSize: 18,
                color: '#14804A',
              }}
            />

            <Typography
              variant="body2"
              fontWeight={700}
              color="#14532D"
            >
              Your security matters
            </Typography>
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            Never share your password, PIN, BVN, or
            one-time passwords with anyone claiming
            to represent Zenimonies Banking.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default KYC;
