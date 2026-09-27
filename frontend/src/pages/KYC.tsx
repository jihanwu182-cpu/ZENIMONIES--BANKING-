import React, { useEffect, useState } from 'react';
import axios from 'axios';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

import type { SelectChangeEvent } from '@mui/material';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type VerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'verified'
  | 'rejected';

interface KycData {
  status?: string;
  kyc_status?: string;
  tier?: number;
  submitted_tier?: number;

  bvn_verified?: boolean;
  bvn_status?: string;
  bvn_locked?: boolean;
  bvn_rejection_reason?: string;

  id_verified?: boolean;
  id_status?: string;
  id_locked?: boolean;
  id_rejection_reason?: string;

  tier_3_verified?: boolean;
  tier_3_status?: string;
  tier_3_locked?: boolean;
  tier_3_method?: string;
  tier_3_rejection_reason?: string;
}

interface KycLimits {
  account_limit?: number | string | null;
  daily_transfer_limit?: number | string | null;
}

interface StatusResponse {
  success?: boolean;
  kyc?: KycData;
  limits?: KycLimits;
  message?: string;
}

const formatNaira = (value?: number | string | null): string => {
  if (value === undefined || value === null || value === '') {
    return 'Not available';
  }

  if (String(value).toLowerCase() === 'unlimited') {
    return 'Unlimited';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
};

const normalizeStatus = (
  status?: string,
  verified?: boolean
): VerificationStatus => {
  if (verified === true) {
    return 'verified';
  }

  const value = String(status || '').toLowerCase().trim();

  if (['verified', 'approved', 'success', 'completed'].includes(value)) {
    return 'verified';
  }

  if (
    [
      'pending',
      'processing',
      'submitted',
      'under_review',
      'under review',
    ].includes(value)
  ) {
    return 'pending';
  }

  if (
    ['rejected', 'failed', 'declined', 'not_verified'].includes(value)
  ) {
    return 'rejected';
  }

  return 'not_submitted';
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

const statusColors = (status: VerificationStatus) => {
  switch (status) {
    case 'verified':
      return {
        color: '#166534',
        background: '#dcfce7',
      };
    case 'pending':
      return {
        color: '#92400e',
        background: '#fef3c7',
      };
    case 'rejected':
      return {
        color: '#991b1b',
        background: '#fee2e2',
      };
    default:
      return {
        color: '#475569',
        background: '#f1f5f9',
      };
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

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token');

  return {
    Authorization: `Bearer ${token}`,
  };
};

const KYC: React.FC = () => {
  const [kyc, setKyc] = useState<KycData>({});
  const [limits, setLimits] = useState<KycLimits>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTier, setActiveTier] = useState<number>(1);

  const [bvn, setBvn] = useState('');

  const [documentType, setDocumentType] = useState('national_id');
  const [documentNumber, setDocumentNumber] = useState('');

  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [tier2Selfie, setTier2Selfie] = useState<File | null>(null);

  const [tier3Method, setTier3Method] = useState('bank_statement');
  const [tier3Document, setTier3Document] = useState<File | null>(null);
  const [tier3Selfie, setTier3Selfie] = useState<File | null>(null);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const bvnStatus = normalizeStatus(
    kyc.bvn_status,
    kyc.bvn_verified
  );

  const idStatus = normalizeStatus(
    kyc.id_status,
    kyc.id_verified
  );

  const tier3Status = normalizeStatus(
    kyc.tier_3_status,
    kyc.tier_3_verified
  );

  const currentTier = Number(kyc.tier || 0);

  const bvnLocked =
    Boolean(kyc.bvn_locked) || bvnStatus === 'pending' ||
    bvnStatus === 'verified';

  const idLocked =
    Boolean(kyc.id_locked) || idStatus === 'pending' ||
    idStatus === 'verified';

  const tier3Locked =
    Boolean(kyc.tier_3_locked) || tier3Status === 'pending' ||
    tier3Status === 'verified';

  const isPassport =
    documentType === 'international_passport';

  const loadKycStatus = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await axios.get<StatusResponse>(
        `${API_BASE_URL}/kyc/status`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data = response.data;

      setKyc(data.kyc || {});
      setLimits(data.limits || {});

      const verifiedTier = Number(data.kyc?.tier || 0);
      const submittedTier = Number(
        data.kyc?.submitted_tier || 0
      );

      if (verifiedTier >= 3) {
        setActiveTier(3);
      } else if (submittedTier >= 3) {
        setActiveTier(3);
      } else if (verifiedTier >= 2) {
        setActiveTier(3);
      } else if (submittedTier >= 2) {
        setActiveTier(2);
      } else if (verifiedTier >= 1 || submittedTier >= 1) {
        setActiveTier(2);
      } else {
        setActiveTier(1);
      }
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKycStatus();
  }, []);

  const clearMessages = () => {
    setMessage('');
    setErrorMessage('');
  };

  const submitBvn = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!/^\d{11}$/.test(bvn)) {
      setErrorMessage('Please enter a valid 11-digit BVN.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/kyc/bvn`,
        { bvn },
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );

      setMessage(
        response.data?.message ||
          'Your BVN submission has been received and is awaiting verification.'
      );

      setBvn('');
      await loadKycStatus();
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier2 = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!documentNumber.trim()) {
      setErrorMessage('Please enter your ID document number.');
      return;
    }

    if (!documentFront) {
      setErrorMessage('Please upload the front of your ID.');
      return;
    }

    if (!isPassport && !documentBack) {
      setErrorMessage('Please upload the back of your ID.');
      return;
    }

    if (!tier2Selfie) {
      setErrorMessage('Please upload your facial verification selfie.');
      return;
    }

    const formData = new FormData();

    formData.append('document_type', documentType);
    formData.append('document_number', documentNumber.trim());
    formData.append('document_front', documentFront);

    if (!isPassport && documentBack) {
      formData.append('document_back', documentBack);
    }

    formData.append('selfie', tier2Selfie);

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/kyc/tier-2`,
        formData,
        {
          headers: getAuthHeaders(),
        }
      );

      setMessage(
        response.data?.message ||
          'Your Tier 2 documents have been submitted for review.'
      );

      setDocumentNumber('');
      setDocumentFront(null);
      setDocumentBack(null);
      setTier2Selfie(null);

      const frontInput = document.getElementById(
        'document-front'
      ) as HTMLInputElement | null;

      const backInput = document.getElementById(
        'document-back'
      ) as HTMLInputElement | null;

      const selfieInput = document.getElementById(
        'tier2-selfie'
      ) as HTMLInputElement | null;

      if (frontInput) frontInput.value = '';
      if (backInput) backInput.value = '';
      if (selfieInput) selfieInput.value = '';

      await loadKycStatus();
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier3 = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!tier3Document) {
      setErrorMessage(
        'Please upload your proof-of-address document.'
      );
      return;
    }

    if (!tier3Selfie) {
      setErrorMessage(
        'Please upload your selfie for facial verification.'
      );
      return;
    }

    const formData = new FormData();

    formData.append('tier_3_method', tier3Method);
    formData.append('tier_3_document', tier3Document);
    formData.append('tier_3_selfie', tier3Selfie);

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/kyc/tier-3`,
        formData,
        {
          headers: getAuthHeaders(),
        }
      );

      setMessage(
        response.data?.message ||
          'Your Tier 3 proof-of-address documents have been submitted for review.'
      );

      setTier3Document(null);
      setTier3Selfie(null);

      const documentInput = document.getElementById(
        'tier3-document'
      ) as HTMLInputElement | null;

      const selfieInput = document.getElementById(
        'tier3-selfie'
      ) as HTMLInputElement | null;

      if (documentInput) documentInput.value = '';
      if (selfieInput) selfieInput.value = '';

      await loadKycStatus();
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentTypeChange = (
    event: SelectChangeEvent
  ) => {
    setDocumentType(event.target.value);
    setDocumentBack(null);
  };

  const StatusBadge = ({
    status,
  }: {
    status: VerificationStatus;
  }) => {
    const colors = statusColors(status);

    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 2.5,
          py: 1.2,
          borderRadius: '50px',
          backgroundColor: colors.background,
          color: colors.color,
          fontSize: '0.95rem',
          fontWeight: 800,
        }}
      >
        {statusLabel(status)}
      </Box>
    );
  };

  const LimitBox = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <Box
      sx={{
        p: 2.5,
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        backgroundColor: '#f8fafc',
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          color: '#64748b',
          fontSize: '0.9rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          mb: 1,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          color: '#172033',
          fontSize: '1.5rem',
          fontWeight: 900,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Box>
  );

  const TierCard = ({
    tier,
    title,
    description,
    accountLimit,
    dailyLimit,
  }: {
    tier: number;
    title: string;
    description: string;
    accountLimit: string;
    dailyLimit: string;
  }) => {
    const selected = activeTier === tier;

    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: '24px',
          border: selected
            ? '2px solid #2563eb'
            : '1px solid #e2e8f0',
          backgroundColor: '#fff',
          overflow: 'hidden',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                minWidth: 48,
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 900,
              }}
            >
              {tier}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  color: '#172033',
                  fontSize: { xs: '1.35rem', sm: '1.7rem' },
                  fontWeight: 900,
                  lineHeight: 1.2,
                  mb: 1,
                }}
              >
                Tier {tier} – {title}
              </Typography>

              <Typography
                sx={{
                  color: '#64748b',
                  fontSize: '1rem',
                  lineHeight: 1.7,
                }}
              >
                {description}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
              },
              gap: 2,
              mt: 3,
              mb: 3,
            }}
          >
            <LimitBox
              label="Account"
              value={accountLimit}
            />

            <LimitBox
              label="Transfers"
              value={`${dailyLimit} daily`}
            />
          </Box>

          <Button
            fullWidth
            variant={selected ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveTier(tier);
              clearMessages();
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              });
            }}
            sx={{
              minHeight: 54,
              borderRadius: '12px',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 900,
              backgroundColor: selected ? '#2563eb' : '#fff',
              borderColor: '#2563eb',
              color: selected ? '#fff' : '#2563eb',
              '&:hover': {
                backgroundColor: selected ? '#1d4ed8' : '#eff6ff',
                borderColor: '#1d4ed8',
              },
            }}
          >
            {selected
              ? `Selected Tier ${tier}`
              : `Continue to Tier ${tier}`}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const FileUpload = ({
    id,
    label,
    description,
    accept = 'image/jpeg,image/png,image/webp,application/pdf',
    file,
    onChange,
  }: {
    id: string;
    label: string;
    description: string;
    accept?: string;
    file: File | null;
    onChange: (file: File | null) => void;
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontWeight: 800,
          color: '#334155',
          mb: 1,
        }}
      >
        {label}
        <Box
          component="span"
          sx={{ color: '#dc2626', ml: 0.5 }}
        >
          *
        </Box>
      </Typography>

      <Box
        sx={{
          border: '1px dashed #94a3b8',
          borderRadius: '18px',
          backgroundColor: '#fcfcfd',
          p: { xs: 2, sm: 3 },
        }}
      >
        <Button
          component="label"
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '10px',
            mb: 1.5,
          }}
        >
          Choose File
          <input
            id={id}
            hidden
            type="file"
            accept={accept}
            onChange={(event) => {
              const selectedFile =
                event.target.files?.[0] || null;

              onChange(selectedFile);
            }}
          />
        </Button>

        <Typography
          component="span"
          sx={{
            ml: 1,
            color: file ? '#166534' : '#64748b',
            fontSize: '0.95rem',
            overflowWrap: 'anywhere',
          }}
        >
          {file ? file.name : 'No file selected'}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            color: '#64748b',
            lineHeight: 1.7,
            fontSize: '0.95rem',
          }}
        >
          {description}
        </Typography>

        {file && (
          <Button
            size="small"
            color="error"
            onClick={() => {
              onChange(null);

              const input = document.getElementById(
                id
              ) as HTMLInputElement | null;

              if (input) input.value = '';
            }}
            sx={{
              mt: 1,
              textTransform: 'none',
            }}
          >
            Remove file
          </Button>
        )}
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: '#2563eb' }} />

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
        backgroundColor: '#f4f6fa',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4 },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        {/* Page heading */}

        <Box sx={{ mb: 5 }}>
          <Typography
            sx={{
              color: '#64748b',
              fontSize: '1.1rem',
              fontWeight: 700,
              mb: 1,
            }}
          >
            Account Security
          </Typography>

          <Typography
            component="h1"
            sx={{
              color: '#172033',
              fontSize: { xs: '2.3rem', sm: '3rem' },
              fontWeight: 950,
              lineHeight: 1.1,
              mb: 2,
              letterSpacing: '-1px',
            }}
          >
            KYC Verification
          </Typography>

          <Typography
            sx={{
              color: '#64748b',
              fontSize: { xs: '1.05rem', sm: '1.2rem' },
              lineHeight: 1.8,
            }}
          >
            Verify your identity to increase your Zenimonies
            account and transfer limits.
          </Typography>
        </Box>

        {/* Current verification summary */}

        <Card
          elevation={0}
          sx={{
            borderRadius: '28px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            mb: 4,
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, sm: 4 },
            }}
          >
            <Typography
              sx={{
                color: '#172033',
                fontSize: { xs: '1.5rem', sm: '1.8rem' },
                fontWeight: 900,
                mb: 1,
              }}
            >
              Current Verification
            </Typography>

            <Typography
              sx={{
                color: '#64748b',
                mb: 3,
                lineHeight: 1.7,
              }}
            >
              Your current KYC level and account limits.
            </Typography>

            <StatusBadge
              status={
                currentTier > 0
                  ? 'verified'
                  : 'not_submitted'
              }
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                },
                gap: 2,
                mt: 4,
              }}
            >
              <LimitBox
                label="Current tier"
                value={`Tier ${currentTier}`}
              />

              <LimitBox
                label="Account limit"
                value={formatNaira(limits.account_limit)}
              />

              <LimitBox
                label="Daily transfer limit"
                value={formatNaira(
                  limits.daily_transfer_limit
                )}
              />

              <LimitBox
                label="Daily transfers remaining"
                value={formatNaira(
                  limits.daily_transfer_limit
                )}
              />
            </Box>

            <Alert
              severity="info"
              sx={{
                mt: 3,
                borderRadius: '16px',
                lineHeight: 1.7,
              }}
            >
              Your approved tier and transaction limits are
              determined by the bank's verification process.
              Submitting documents does not automatically
              increase your limits.
            </Alert>
          </CardContent>
        </Card>

        {/* Notifications */}

        {message && (
          <Alert
            severity="success"
            onClose={() => setMessage('')}
            sx={{
              mb: 3,
              borderRadius: '14px',
            }}
          >
            {message}
          </Alert>
        )}

        {errorMessage && (
          <Alert
            severity="error"
            onClose={() => setErrorMessage('')}
            sx={{
              mb: 3,
              borderRadius: '14px',
            }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Tier overview */}

        <Box sx={{ mb: 5 }}>
          <TierCard
            tier={1}
            title="BVN Verification"
            description="Verify your account using your Bank Verification Number."
            accountLimit="₦200,000"
            dailyLimit="₦50,000"
          />

          <TierCard
            tier={2}
            title="ID + Facial Verification"
            description="Submit a government-issued ID and complete facial/liveness verification."
            accountLimit="₦500,000"
            dailyLimit="₦200,000"
          />

          <TierCard
            tier={3}
            title="Address Verification"
            description="Submit an accepted proof-of-address document for review."
            accountLimit="Unlimited"
            dailyLimit="₦5,000,000"
          />
        </Box>

        {/* Tier 1 form */}

        {activeTier === 1 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: '28px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              mb: 4,
            }}
          >
            <CardContent
              sx={{
                p: { xs: 2.5, sm: 4 },
              }}
            >
              <Typography
                sx={{
                  color: '#2563eb',
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                Tier 1
              </Typography>

              <Typography
                sx={{
                  color: '#172033',
                  fontSize: { xs: '1.6rem', sm: '2rem' },
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                BVN Verification
              </Typography>

              <Typography
                sx={{
                  color: '#64748b',
                  lineHeight: 1.8,
                  mb: 3,
                }}
              >
                Enter your 11-digit Bank Verification Number.
                Your BVN will remain pending until the
                verification provider confirms it.
              </Typography>

              {bvnStatus !== 'not_submitted' && (
                <Alert
                  severity={
                    bvnStatus === 'verified'
                      ? 'success'
                      : bvnStatus === 'pending'
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ mb: 3, borderRadius: '14px' }}
                >
                  BVN status: {statusLabel(bvnStatus)}.

                  {kyc.bvn_rejection_reason &&
                    bvnStatus === 'rejected' &&
                    ` Reason: ${kyc.bvn_rejection_reason}`}
                </Alert>
              )}

              <form onSubmit={submitBvn}>
                <TextField
                  fullWidth
                  label="BVN"
                  value={bvn}
                  onChange={(event) => {
                    setBvn(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 11)
                    );
                  }}
                  placeholder="Enter your 11-digit BVN"
                  inputProps={{
                    maxLength: 11,
                    inputMode: 'numeric',
                  }}
                  disabled={bvnLocked || submitting}
                  helperText={`${bvn.length}/11 digits`}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />

                <Typography
                  sx={{
                    color: '#64748b',
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  Your BVN is sensitive information. Only
                  submit it through this secure verification
                  form. Never share your BVN or OTP with
                  another person.
                </Typography>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    submitting ||
                    bvnLocked ||
                    bvn.length !== 11
                  }
                  sx={{
                    minHeight: 54,
                    px: 4,
                    borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    fontWeight: 900,
                    textTransform: 'none',
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: '#1d4ed8',
                    },
                  }}
                >
                  {submitting ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : bvnLocked ? (
                    `BVN ${statusLabel(bvnStatus)}`
                  ) : (
                    'Submit BVN'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tier 2 form */}

        {activeTier === 2 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: '28px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              mb: 4,
            }}
          >
            <CardContent
              sx={{
                p: { xs: 2.5, sm: 4 },
              }}
            >
              <Typography
                sx={{
                  color: '#2563eb',
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                Tier 2
              </Typography>

              <Typography
                sx={{
                  color: '#172033',
                  fontSize: { xs: '1.6rem', sm: '2rem' },
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                ID + Facial Verification
              </Typography>

              <Typography
                sx={{
                  color: '#64748b',
                  lineHeight: 1.8,
                  mb: 3,
                }}
              >
                Upload your actual government-issued ID and
                complete a facial verification submission.
                Uploading files does not automatically approve
                your account.
              </Typography>

              {idStatus !== 'not_submitted' && (
                <Alert
                  severity={
                    idStatus === 'verified'
                      ? 'success'
                      : idStatus === 'pending'
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ mb: 3, borderRadius: '14px' }}
                >
                  Tier 2 status: {statusLabel(idStatus)}.

                  {kyc.id_rejection_reason &&
                    idStatus === 'rejected' &&
                    ` Reason: ${kyc.id_rejection_reason}`}
                </Alert>
              )}

              <form onSubmit={submitTier2}>
                <FormControl
                  fullWidth
                  sx={{ mb: 3 }}
                  disabled={idLocked || submitting}
                >
                  <InputLabel id="document-type-label">
                    ID Document Type
                  </InputLabel>

                  <Select
                    labelId="document-type-label"
                    value={documentType}
                    label="ID Document Type"
                    onChange={handleDocumentTypeChange}
                    sx={{
                      borderRadius: '12px',
                    }}
                  >
                    <MenuItem value="national_id">
                      National ID
                    </MenuItem>

                    <MenuItem value="nin">
                      NIN
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
                  fullWidth
                  label="ID Document Number"
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(event.target.value)
                  }
                  disabled={idLocked || submitting}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />

                <FileUpload
                  id="document-front"
                  label="Front of ID"
                  description="Upload a clear image of the front of your government-issued ID."
                  file={documentFront}
                  onChange={setDocumentFront}
                />

                {!isPassport && (
                  <FileUpload
                    id="document-back"
                    label="Back of ID"
                    description="Upload the back of your ID if your document has a reverse side."
                    file={documentBack}
                    onChange={setDocumentBack}
                  />
                )}

                <Box
                  sx={{
                    p: { xs: 2, sm: 3 },
                    border: '1px solid #dbeafe',
                    borderRadius: '20px',
                    backgroundColor: '#f8fafc',
                    mb: 3,
                  }}
                >
                  <Typography
                    sx={{
                      color: '#172033',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      mb: 2,
                    }}
                  >
                    Facial Verification
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      lineHeight: 1.8,
                      mb: 3,
                    }}
                  >
                    Take a clear selfie using your device.
                    Your selfie is intended for facial/liveness
                    verification. A submitted selfie does not
                    mean that you have passed verification.
                  </Typography>

                  <FileUpload
                    id="tier2-selfie"
                    label="Live Selfie"
                    description="Use a clear image of your face. Remove sunglasses, masks, and anything covering your face."
                    accept="image/jpeg,image/png,image/webp"
                    file={tier2Selfie}
                    onChange={setTier2Selfie}
                  />
                </Box>

                <Alert
                  severity="warning"
                  sx={{
                    mb: 3,
                    borderRadius: '14px',
                    lineHeight: 1.7,
                  }}
                >
                  Important: Your ID and selfie must receive
                  a successful verification result before
                  your Tier 2 status changes to Verified.
                </Alert>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={submitting || idLocked}
                  sx={{
                    minHeight: 56,
                    borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    fontWeight: 900,
                    fontSize: '1rem',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#1d4ed8',
                    },
                  }}
                >
                  {submitting ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : idLocked ? (
                    `Tier 2 ${statusLabel(idStatus)}`
                  ) : (
                    'Submit Tier 2 Verification'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tier 3 form */}

        {activeTier === 3 && (
          <Card
            elevation={0}
            sx={{
              borderRadius: '28px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              mb: 4,
            }}
          >
            <CardContent
              sx={{
                p: { xs: 2.5, sm: 4 },
              }}
            >
              <Typography
                sx={{
                  color: '#2563eb',
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                Tier 3
              </Typography>

              <Typography
                sx={{
                  color: '#172033',
                  fontSize: { xs: '1.6rem', sm: '2rem' },
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                Address Verification
              </Typography>

              <Typography
                sx={{
                  color: '#64748b',
                  lineHeight: 1.8,
                  mb: 3,
                }}
              >
                Choose an accepted proof-of-address method
                and upload your document for review.
              </Typography>

              {tier3Status !== 'not_submitted' && (
                <Alert
                  severity={
                    tier3Status === 'verified'
                      ? 'success'
                      : tier3Status === 'pending'
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ mb: 3, borderRadius: '14px' }}
                >
                  Tier 3 status: {statusLabel(tier3Status)}.

                  {kyc.tier_3_rejection_reason &&
                    tier3Status === 'rejected' &&
                    ` Reason: ${kyc.tier_3_rejection_reason}`}
                </Alert>
              )}

              <form onSubmit={submitTier3}>
                <Typography
                  sx={{
                    color: '#334155',
                    fontWeight: 900,
                    mb: 2,
                  }}
                >
                  Choose Verification Method
                </Typography>

                <Box sx={{ mb: 3 }}>
                  {[
                    {
                      value: 'bank_statement',
                      title: 'Bank Statement',
                      description:
                        'Upload a recent bank statement.',
                    },
                    {
                      value: 'utility_bill',
                      title: 'Utility Bill',
                      description:
                        'Upload an eligible recent utility bill.',
                    },
                    {
                      value: 'proof_of_address',
                      title: 'Proof of Address',
                      description:
                        'Upload an accepted proof-of-address document.',
                    },
                  ].map((option) => (
                    <Box
                      key={option.value}
                      onClick={() => {
                        if (!tier3Locked && !submitting) {
                          setTier3Method(option.value);
                        }
                      }}
                      sx={{
                        border:
                          tier3Method === option.value
                            ? '2px solid #2563eb'
                            : '1px solid #cbd5e1',
                        borderRadius: '18px',
                        p: 2.5,
                        mb: 2,
                        cursor: tier3Locked
                          ? 'not-allowed'
                          : 'pointer',
                        backgroundColor:
                          tier3Method === option.value
                            ? '#eff6ff'
                            : '#fff',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#172033',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          mb: 1,
                        }}
                      >
                        {option.title}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#64748b',
                          lineHeight: 1.7,
                        }}
                      >
                        {option.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <FileUpload
                  id="tier3-document"
                  label="Proof-of-Address Document"
                  description="Upload the actual document in PDF or an accepted image format. Screenshots and ordinary photos of documents may not be accepted."
                  file={tier3Document}
                  onChange={setTier3Document}
                />

                <FileUpload
                  id="tier3-selfie"
                  label="Facial Verification Selfie"
                  description="Upload a clear image of your face for the verification process."
                  accept="image/jpeg,image/png,image/webp"
                  file={tier3Selfie}
                  onChange={setTier3Selfie}
                />

                <Alert
                  severity="warning"
                  sx={{
                    mb: 3,
                    borderRadius: '14px',
                    lineHeight: 1.7,
                  }}
                >
                  Only one proof-of-address method is required.
                  Your Tier 3 status will remain pending until
                  your submission has been reviewed and
                  approved.
                </Alert>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={submitting || tier3Locked}
                  sx={{
                    minHeight: 56,
                    borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    fontWeight: 900,
                    fontSize: '1rem',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#1d4ed8',
                    },
                  }}
                >
                  {submitting ? (
                    <CircularProgress
                      size={24}
                      color="inherit"
                    />
                  ) : tier3Locked ? (
                    `Tier 3 ${statusLabel(tier3Status)}`
                  ) : (
                    'Submit Tier 3 Verification'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Verification status summary */}

        <Card
          elevation={0}
          sx={{
            borderRadius: '28px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            mb: 4,
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, sm: 4 },
            }}
          >
            <Typography
              sx={{
                color: '#172033',
                fontSize: '1.5rem',
                fontWeight: 900,
                mb: 3,
              }}
            >
              Verification Status
            </Typography>

            {[
              {
                number: 1,
                title: 'Tier 1 – BVN Verification',
                description:
                  'Verify your 11-digit BVN. Your account remains pending until an approved verification provider confirms the BVN.',
                status: bvnStatus,
              },
              {
                number: 2,
                title: 'Tier 2 – ID + Facial Verification',
                description:
                  'Submit your government-issued ID and facial verification documents for review.',
                status: idStatus,
              },
              {
                number: 3,
                title: 'Tier 3 – Address Verification',
                description:
                  'Submit an accepted proof-of-address document for review.',
                status: tier3Status,
              },
            ].map((item) => (
              <Box
                key={item.number}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  mb: 3,
                  '&:last-child': {
                    mb: 0,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                  }}
                >
                  {item.number}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      color: '#172033',
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      mb: 1,
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      lineHeight: 1.7,
                      mb: 1.5,
                    }}
                  >
                    {item.description}
                  </Typography>

                  <StatusBadge status={item.status} />
                </Box>
              </Box>
            ))}

            <Button
              variant="outlined"
              fullWidth
              onClick={loadKycStatus}
              disabled={loading || submitting}
              sx={{
                mt: 4,
                minHeight: 52,
                borderRadius: '12px',
                borderColor: '#2563eb',
                color: '#2563eb',
                fontWeight: 900,
                textTransform: 'none',
              }}
            >
              Refresh Verification Status
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default KYC;
