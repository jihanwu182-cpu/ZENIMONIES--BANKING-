
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Chip,
} from '@mui/material';

import type { SelectChangeEvent } from '@mui/material';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#087A43';
const DARK_GREEN = '#075C35';
const LIGHT_GREEN = '#F4F8F5';
const BORDER = '#DCE8E0';
const TEXT = '#183126';
const MUTED = '#64756B';

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

  daily_transfer_used?: number | string;
  daily_transfer_remaining?: number | string;
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

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token');

  return {
    Authorization: `Bearer ${token}`,
  };
};

const getErrorMessage = (error: any): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
};

const formatNaira = (
  value?: number | string | null
): string => {
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

  const value = String(status || '')
    .toLowerCase()
    .trim();

  if (
    ['verified', 'approved', 'success', 'completed'].includes(
      value
    )
  ) {
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
    [
      'rejected',
      'failed',
      'declined',
      'not_verified',
    ].includes(value)
  ) {
    return 'rejected';
  }

  return 'not_submitted';
};

const statusLabel = (
  status: VerificationStatus
): string => {
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
) => {
  switch (status) {
    case 'verified':
      return {
        color: '#166534',
        background: '#DCFCE7',
      };

    case 'pending':
      return {
        color: '#92400E',
        background: '#FEF3C7',
      };

    case 'rejected':
      return {
        color: '#991B1B',
        background: '#FEE2E2',
      };

    default:
      return {
        color: '#475569',
        background: '#F1F5F9',
      };
  }
};

const StatusBadge = ({
  status,
}: {
  status: VerificationStatus;
}) => {
  const colors = statusColor(status);

  return (
    <Chip
      label={statusLabel(status)}
      size="medium"
      sx={{
        backgroundColor: colors.background,
        color: colors.color,
        fontWeight: 800,
        borderRadius: '30px',
        '& .MuiChip-label': {
          px: 2,
        },
      }}
    />
  );
};

const SectionTitle = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) => (
  <Box sx={{ mb: 3 }}>
    {eyebrow && (
      <Typography
        sx={{
          color: GREEN,
          fontWeight: 900,
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: 1,
          mb: 1,
        }}
      >
        {eyebrow}
      </Typography>
    )}

    <Typography
      component="h2"
      sx={{
        color: TEXT,
        fontSize: {
          xs: '1.4rem',
          sm: '1.8rem',
        },
        fontWeight: 900,
        lineHeight: 1.25,
        mb: description ? 1 : 0,
      }}
    >
      {title}
    </Typography>

    {description && (
      <Typography
        sx={{
          color: MUTED,
          fontSize: '0.98rem',
          lineHeight: 1.8,
        }}
      >
        {description}
      </Typography>
    )}
  </Box>
);

const SectionCard = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <Card
    elevation={0}
    sx={{
      border: `1px solid ${BORDER}`,
      borderRadius: {
        xs: '20px',
        sm: '26px',
      },
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      mb: 3,
    }}
  >
    <CardContent
      sx={{
        p: {
          xs: 2.5,
          sm: 4,
        },
        '&:last-child': {
          pb: {
            xs: 2.5,
            sm: 4,
          },
        },
      }}
    >
      {children}
    </CardContent>
  </Card>
);

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
      border: `1px solid ${BORDER}`,
      borderRadius: '16px',
      backgroundColor: LIGHT_GREEN,
      minWidth: 0,
    }}
  >
    <Typography
      sx={{
        color: MUTED,
        fontSize: '0.78rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        mb: 1,
      }}
    >
      {label}
    </Typography>

    <Typography
      sx={{
        color: DARK_GREEN,
        fontSize: {
          xs: '1.25rem',
          sm: '1.5rem',
        },
        fontWeight: 900,
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const FileUpload = ({
  id,
  label,
  description,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  file,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  description: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) => (
  <Box sx={{ mb: 3 }}>
    <Typography
      sx={{
        color: TEXT,
        fontWeight: 800,
        mb: 1,
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          color: '#DC2626',
          ml: 0.5,
        }}
      >
        *
      </Box>
    </Typography>

    <Box
      sx={{
        p: {
          xs: 2,
          sm: 3,
        },
        border: '1px dashed #A7BDAF',
        borderRadius: '18px',
        backgroundColor: '#FBFDFB',
      }}
    >
      <Button
        component="label"
        variant="outlined"
        disabled={disabled}
        sx={{
          minHeight: 46,
          px: 2.5,
          borderRadius: '10px',
          borderColor: GREEN,
          color: GREEN,
          fontWeight: 800,
          textTransform: 'none',
          '&:hover': {
            borderColor: DARK_GREEN,
            backgroundColor: LIGHT_GREEN,
          },
        }}
      >
        Choose file

        <input
          id={id}
          hidden
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            const selected =
              event.target.files?.[0] || null;

            if (selected && selected.size > 10 * 1024 * 1024) {
              window.alert(
                'Please select a file smaller than 10 MB.'
              );

              event.target.value = '';
              onChange(null);
              return;
            }

            onChange(selected);
          }}
        />
      </Button>

      <Typography
        sx={{
          mt: 1.5,
          color: file ? DARK_GREEN : MUTED,
          fontWeight: file ? 800 : 500,
          fontSize: '0.9rem',
          overflowWrap: 'anywhere',
        }}
      >
        {file ? file.name : 'No file selected'}
      </Typography>

      <Typography
        sx={{
          mt: 1,
          color: MUTED,
          fontSize: '0.88rem',
          lineHeight: 1.7,
        }}
      >
        {description}
      </Typography>

      {file && (
        <Button
          color="error"
          size="small"
          disabled={disabled}
          onClick={() => {
            onChange(null);

            const input = document.getElementById(
              id
            ) as HTMLInputElement | null;

            if (input) {
              input.value = '';
            }
          }}
          sx={{
            mt: 1,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Remove file
        </Button>
      )}
    </Box>
  </Box>
);

const TierCard = ({
  tier,
  title,
  description,
  accountLimit,
  dailyLimit,
  selected,
  disabled,
  onSelect,
}: {
  tier: number;
  title: string;
  description: string;
  accountLimit: string;
  dailyLimit: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) => (
  <Card
    elevation={0}
    sx={{
      mb: 2.5,
      borderRadius: '22px',
      border: selected
        ? `2px solid ${GREEN}`
        : `1px solid ${BORDER}`,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    }}
  >
    <CardContent
      sx={{
        p: {
          xs: 2.5,
          sm: 3.5,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            minWidth: 48,
            borderRadius: '15px',
            backgroundColor: LIGHT_GREEN,
            color: GREEN,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1.25rem',
          }}
        >
          {tier}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              color: TEXT,
              fontWeight: 900,
              fontSize: {
                xs: '1.15rem',
                sm: '1.4rem',
              },
              mb: 1,
            }}
          >
            Tier {tier} — {title}
          </Typography>

          <Typography
            sx={{
              color: MUTED,
              lineHeight: 1.7,
              fontSize: '0.95rem',
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
          gap: 1.5,
          mt: 3,
          mb: 3,
        }}
      >
        <LimitBox
          label="Account limit"
          value={accountLimit}
        />

        <LimitBox
          label="Daily transfers"
          value={dailyLimit}
        />
      </Box>

      <Button
        fullWidth
        variant={selected ? 'contained' : 'outlined'}
        disabled={disabled}
        onClick={onSelect}
        sx={{
          minHeight: 52,
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 900,
          fontSize: '0.98rem',
          borderColor: GREEN,
          color: selected ? '#FFFFFF' : GREEN,
          backgroundColor: selected ? GREEN : '#FFFFFF',
          '&:hover': {
            borderColor: DARK_GREEN,
            backgroundColor: selected
              ? DARK_GREEN
              : LIGHT_GREEN,
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

const KYC: React.FC = () => {
  const [kyc, setKyc] = useState<KycData>({});
  const [limits, setLimits] = useState<KycLimits>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTier, setActiveTier] = useState(1);

  const [bvn, setBvn] = useState('');

  const [documentType, setDocumentType] =
    useState('national_id');

  const [documentNumber, setDocumentNumber] =
    useState('');

  const [documentFront, setDocumentFront] =
    useState<File | null>(null);

  const [documentBack, setDocumentBack] =
    useState<File | null>(null);

  const [tier2Selfie, setTier2Selfie] =
    useState<File | null>(null);

  const [tier3Method, setTier3Method] =
    useState('bank_statement');

  const [tier3Document, setTier3Document] =
    useState<File | null>(null);

  const [tier3Selfie, setTier3Selfie] =
    useState<File | null>(null);

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
    Boolean(kyc.bvn_locked) ||
    bvnStatus === 'pending' ||
    bvnStatus === 'verified';

  const idLocked =
    Boolean(kyc.id_locked) ||
    idStatus === 'pending' ||
    idStatus === 'verified';

  const tier3Locked =
    Boolean(kyc.tier_3_locked) ||
    tier3Status === 'pending' ||
    tier3Status === 'verified';

  const isPassport =
    documentType === 'international_passport';

  const loadKycStatus = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response =
        await axios.get<StatusResponse>(
          `${API_BASE_URL}/kyc/status`,
          {
            headers: getAuthHeaders(),
          }
        );

      const data = response.data;

      setKyc(data.kyc || {});
      setLimits(data.limits || {});

      const verifiedTier = Number(
        data.kyc?.tier || 0
      );

      const submittedTier = Number(
        data.kyc?.submitted_tier || 0
      );

      if (verifiedTier >= 3 || submittedTier >= 3) {
        setActiveTier(3);
      } else if (
        verifiedTier >= 2 ||
        submittedTier >= 2
      ) {
        setActiveTier(2);
      } else {
        setActiveTier(1);
      }
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKycStatus();
  }, [loadKycStatus]);

  const clearMessages = () => {
    setMessage('');
    setErrorMessage('');
  };

  const submitBvn = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    clearMessages();

    if (!/^\d{11}$/.test(bvn)) {
      setErrorMessage(
        'Please enter a valid 11-digit BVN.'
      );
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

  const submitTier2 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    clearMessages();

    if (!documentNumber.trim()) {
      setErrorMessage(
        'Please enter your ID document number.'
      );
      return;
    }

    if (!documentFront) {
      setErrorMessage(
        'Please upload the front of your ID.'
      );
      return;
    }

    if (!isPassport && !documentBack) {
      setErrorMessage(
        'Please upload the back of your ID.'
      );
      return;
    }

    if (!tier2Selfie) {
      setErrorMessage(
        'Please select your facial verification image.'
      );
      return;
    }

    const formData = new FormData();

    formData.append('document_type', documentType);
    formData.append(
      'document_number',
      documentNumber.trim()
    );

    formData.append(
      'document_front',
      documentFront
    );

    if (!isPassport && documentBack) {
      formData.append(
        'document_back',
        documentBack
      );
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

      [
        'document-front',
        'document-back',
        'tier2-selfie',
      ].forEach((id) => {
        const input = document.getElementById(
          id
        ) as HTMLInputElement | null;

        if (input) input.value = '';
      });

      await loadKycStatus();
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier3 = async (
    event: React.FormEvent
  ) => {
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
        'Please select your facial verification image.'
      );
      return;
    }

    const formData = new FormData();

    formData.append(
      'tier_3_method',
      tier3Method
    );

    formData.append(
      'tier_3_document',
      tier3Document
    );

    formData.append(
      'tier_3_selfie',
      tier3Selfie
    );

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
          'Your Tier 3 documents have been submitted for review.'
      );

      setTier3Document(null);
      setTier3Selfie(null);

      [
        'tier3-document',
        'tier3-selfie',
      ].forEach((id) => {
        const input = document.getElementById(
          id
        ) as HTMLInputElement | null;

        if (input) input.value = '';
      });

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

  const dailyLimit = limits.daily_transfer_limit;

  const dailyUsed = Number(
    kyc.daily_transfer_used || 0
  );

  const dailyRemaining =
    kyc.daily_transfer_remaining !== undefined
      ? formatNaira(
          kyc.daily_transfer_remaining
        )
      : dailyLimit === null
      ? 'Unlimited'
      : dailyLimit !== undefined
      ? formatNaira(
          Math.max(
            0,
            Number(dailyLimit) - dailyUsed
          )
        )
      : 'Not available';

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
          backgroundColor: LIGHT_GREEN,
        }}
      >
        <CircularProgress
          sx={{ color: GREEN }}
        />

        <Typography
          sx={{
            color: MUTED,
            fontWeight: 700,
          }}
        >
          Loading your verification status...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: LIGHT_GREEN,
        px: {
          xs: 1.5,
          sm: 3,
          md: 4,
        },
        py: {
          xs: 2.5,
          sm: 4,
        },
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        {/* Header */}

        <Box
          sx={{
            mb: 4,
            p: {
              xs: 3,
              sm: 4,
            },
            borderRadius: '26px',
            background:
              'linear-gradient(135deg, #087A43 0%, #075C35 100%)',
            color: '#FFFFFF',
            boxShadow:
              '0 12px 35px rgba(7,92,53,0.16)',
          }}
        >
          <Typography
            sx={{
              color: '#D7F5E4',
              fontSize: '0.85rem',
              fontWeight: 900,
              letterSpacing: 1,
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            Zenimonies Banking
          </Typography>

          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: '2rem',
                sm: '2.7rem',
              },
              fontWeight: 950,
              lineHeight: 1.15,
              mb: 1.5,
            }}
          >
            Identity Verification
          </Typography>

          <Typography
            sx={{
              color: '#E8F5ED',
              fontSize: {
                xs: '0.95rem',
                sm: '1.05rem',
              },
              lineHeight: 1.8,
              maxWidth: 650,
            }}
          >
            Complete your identity checks to access
            the account and transfer limits available
            for your approved verification level.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mt: 3,
            }}
          >
            <Chip
              label="Secure verification"
              sx={{
                color: '#FFFFFF',
                backgroundColor:
                  'rgba(255,255,255,0.14)',
                fontWeight: 800,
              }}
            />

            <Chip
              label={`Current tier: ${currentTier}`}
              sx={{
                color: DARK_GREEN,
                backgroundColor: '#FFFFFF',
                fontWeight: 900,
              }}
            />
          </Box>
        </Box>

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

        {/* Account summary */}

        <SectionCard>
          <SectionTitle
            eyebrow="Your account"
            title="Verification overview"
            description="Your approved verification tier and account limits are shown below."
          />

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
              mb: 3,
            }}
          >
            <StatusBadge
              status={
                currentTier > 0
                  ? 'verified'
                  : normalizeStatus(
                      kyc.kyc_status
                    )
              }
            />

            <Typography
              sx={{
                color: MUTED,
                fontWeight: 700,
              }}
            >
              Approved tier: {currentTier}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
              },
              gap: 2,
            }}
          >
            <LimitBox
              label="Account limit"
              value={formatNaira(
                limits.account_limit
              )}
            />

            <LimitBox
              label="Daily transfer limit"
              value={formatNaira(
                limits.daily_transfer_limit
              )}
            />

            <LimitBox
              label="Daily transfers used"
              value={formatNaira(dailyUsed)}
            />

            <LimitBox
              label="Daily transfers remaining"
              value={dailyRemaining}
            />
          </Box>

          <Alert
            severity="info"
            sx={{
              mt: 3,
              borderRadius: '14px',
              lineHeight: 1.7,
            }}
          >
            Submitting documents does not
            automatically increase your limits.
            Your limits change only after the
            bank's verification process approves
            the relevant tier.
          </Alert>
        </SectionCard>

        {/* Tier selector */}

        <SectionCard>
          <SectionTitle
            eyebrow="Verification levels"
            title="Choose your verification tier"
            description="Complete the required checks for the account level you need."
          />

          <TierCard
            tier={1}
            title="BVN Verification"
            description="Verify your Bank Verification Number and complete your required personal information."
            accountLimit="₦200,000"
            dailyLimit="₦50,000"
            selected={activeTier === 1}
            onSelect={() => {
              setActiveTier(1);
              clearMessages();
            }}
          />

          <TierCard
            tier={2}
            title="Government ID"
            description="Submit an accepted government-issued identity document for verification."
            accountLimit="₦500,000"
            dailyLimit="₦200,000"
            selected={activeTier === 2}
            onSelect={() => {
              setActiveTier(2);
              clearMessages();
            }}
          />

          <TierCard
            tier={3}
            title="Address Verification"
            description="Submit an accepted proof-of-address document for review."
            accountLimit="Unlimited"
            dailyLimit="₦5,000,000"
            selected={activeTier === 3}
            onSelect={() => {
              setActiveTier(3);
              clearMessages();
            }}
          />

          <Typography
            sx={{
              color: MUTED,
              fontSize: '0.85rem',
              lineHeight: 1.7,
            }}
          >
            The tier limits shown above are the
            configured tier values. Your actual
            account limits are displayed in the
            verification overview and must be
            confirmed by the backend.
          </Typography>
        </SectionCard>

        {/* Tier 1 */}

        {activeTier === 1 && (
          <SectionCard>
            <SectionTitle
              eyebrow="Tier 1"
              title="BVN verification"
              description="Enter your 11-digit Bank Verification Number."
            />

            {bvnStatus !== 'not_submitted' && (
              <Alert
                severity={
                  bvnStatus === 'verified'
                    ? 'success'
                    : bvnStatus === 'pending'
                    ? 'warning'
                    : 'error'
                }
                sx={{
                  mb: 3,
                  borderRadius: '14px',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{ fontWeight: 800 }}
                  >
                    BVN: {statusLabel(bvnStatus)}
                  </Typography>

                  {bvnStatus === 'rejected' &&
                    kyc.bvn_rejection_reason && (
                      <Typography>
                        Reason:{' '}
                        {kyc.bvn_rejection_reason}
                      </Typography>
                    )}
                </Box>
              </Alert>
            )}

            <form onSubmit={submitBvn}>
              <TextField
                fullWidth
                label="Bank Verification Number"
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
                disabled={
                  bvnLocked || submitting
                }
                helperText={`${bvn.length}/11 digits`}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline':
                    {
                      borderColor: GREEN,
                    },
                }}
              />

              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  borderRadius: '14px',
                  lineHeight: 1.7,
                }}
              >
                Your BVN is sensitive personal
                information. Submit it only through
                this secure form. Never share your
                BVN or OTP with another person.
              </Alert>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={
                  submitting ||
                  bvnLocked ||
                  bvn.length !== 11
                }
                sx={{
                  minHeight: 54,
                  borderRadius: '12px',
                  backgroundColor: GREEN,
                  fontWeight: 900,
                  fontSize: '1rem',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: DARK_GREEN,
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#B8CFC1',
                    color: '#FFFFFF',
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
          </SectionCard>
        )}

        {/* Tier 2 */}

        {activeTier === 2 && (
          <SectionCard>
            <SectionTitle
              eyebrow="Tier 2"
              title="Government ID verification"
              description="Provide your identity document for review."
            />

            {idStatus !== 'not_submitted' && (
              <Alert
                severity={
                  idStatus === 'verified'
                    ? 'success'
                    : idStatus === 'pending'
                    ? 'warning'
                    : 'error'
                }
                sx={{
                  mb: 3,
                  borderRadius: '14px',
                }}
              >
                <Typography
                  sx={{ fontWeight: 800 }}
                >
                  Tier 2: {statusLabel(idStatus)}
                </Typography>

                {idStatus === 'rejected' &&
                  kyc.id_rejection_reason && (
                    <Typography sx={{ mt: 1 }}>
                      Reason:{' '}
                      {kyc.id_rejection_reason}
                    </Typography>
                  )}
              </Alert>
            )}

            <form onSubmit={submitTier2}>
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
                disabled={
                  idLocked || submitting
                }
              >
                <InputLabel id="document-type-label">
                  ID document type
                </InputLabel>

                <Select
                  labelId="document-type-label"
                  value={documentType}
                  label="ID document type"
                  onChange={
                    handleDocumentTypeChange
                  }
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
                label="ID document number"
                value={documentNumber}
                onChange={(event) =>
                  setDocumentNumber(
                    event.target.value
                  )
                }
                disabled={
                  idLocked || submitting
                }
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
                disabled={
                  idLocked || submitting
                }
              />

              {!isPassport && (
                <FileUpload
                  id="document-back"
                  label="Back of ID"
                  description="Upload the reverse side of your ID."
                  file={documentBack}
                  onChange={setDocumentBack}
                  disabled={
                    idLocked || submitting
                  }
                />
              )}

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '18px',
                  backgroundColor: LIGHT_GREEN,
                  border: `1px solid ${BORDER}`,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    color: TEXT,
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    mb: 1,
                  }}
                >
                  Facial verification
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    lineHeight: 1.8,
                    mb: 2,
                  }}
                >
                  A selfie image alone is not a
                  genuine liveness check. Live
                  facial verification must be
                  completed through an integrated
                  verification service before your
                  identity can be approved.
                </Typography>

                <FileUpload
                  id="tier2-selfie"
                  label="Facial image"
                  description="Select a clear image of your face. This upload alone does not prove liveness."
                  accept="image/jpeg,image/png,image/webp"
                  file={tier2Selfie}
                  onChange={setTier2Selfie}
                  disabled={
                    idLocked || submitting
                  }
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
                Do not treat this upload as
                completed facial verification.
                Approval requires the appropriate
                identity and liveness checks.
              </Alert>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={
                  submitting || idLocked
                }
                sx={{
                  minHeight: 54,
                  borderRadius: '12px',
                  backgroundColor: GREEN,
                  fontWeight: 900,
                  fontSize: '1rem',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: DARK_GREEN,
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
                  'Submit Tier 2 Documents'
                )}
              </Button>
            </form>
          </SectionCard>
        )}

        {/* Tier 3 */}

        {activeTier === 3 && (
          <SectionCard>
            <SectionTitle
              eyebrow="Tier 3"
              title="Address verification"
              description="Select an accepted document and upload it for review."
            />

            {tier3Status !==
              'not_submitted' && (
              <Alert
                severity={
                  tier3Status === 'verified'
                    ? 'success'
                    : tier3Status === 'pending'
                    ? 'warning'
                    : 'error'
                }
                sx={{
                  mb: 3,
                  borderRadius: '14px',
                }}
              >
                <Typography
                  sx={{ fontWeight: 800 }}
                >
                  Tier 3:{' '}
                  {statusLabel(tier3Status)}
                </Typography>

                {tier3Status === 'rejected' &&
                  kyc.tier_3_rejection_reason && (
                    <Typography sx={{ mt: 1 }}>
                      Reason:{' '}
                      {kyc.tier_3_rejection_reason}
                    </Typography>
                  )}
              </Alert>
            )}

            <form onSubmit={submitTier3}>
              <Typography
                sx={{
                  color: TEXT,
                  fontWeight: 900,
                  mb: 2,
                }}
              >
                Proof-of-address method
              </Typography>

              {[
                {
                  value: 'bank_statement',
                  title: 'Bank statement',
                  description:
                    'A recent bank statement showing your residential address.',
                },
                {
                  value: 'utility_bill',
                  title: 'Utility bill',
                  description:
                    'An eligible recent utility bill showing your address.',
                },
                {
                  value: 'proof_of_address',
                  title: 'Other proof of address',
                  description:
                    'An accepted document showing your current residential address.',
                },
              ].map((option) => (
                <Box
                  key={option.value}
                  role="button"
                  tabIndex={
                    tier3Locked || submitting
                      ? -1
                      : 0
                  }
                  onClick={() => {
                    if (
                      !tier3Locked &&
                      !submitting
                    ) {
                      setTier3Method(
                        option.value
                      );
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' ||
                      event.key === ' '
                    ) {
                      event.preventDefault();

                      if (
                        !tier3Locked &&
                        !submitting
                      ) {
                        setTier3Method(
                          option.value
                        );
                      }
                    }
                  }}
                  sx={{
                    p: 2.5,
                    mb: 2,
                    borderRadius: '16px',
                    border:
                      tier3Method ===
                      option.value
                        ? `2px solid ${GREEN}`
                        : `1px solid ${BORDER}`,
                    backgroundColor:
                      tier3Method ===
                      option.value
                        ? LIGHT_GREEN
                        : '#FFFFFF',
                    cursor:
                      tier3Locked || submitting
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  <Typography
                    sx={{
                      color: TEXT,
                      fontWeight: 900,
                      mb: 0.75,
                    }}
                  >
                    {option.title}
                  </Typography>

                  <Typography
                    sx={{
                      color: MUTED,
                      lineHeight: 1.7,
                      fontSize: '0.9rem',
                    }}
                  >
                    {option.description}
                  </Typography>
                </Box>
              ))}

              <FileUpload
                id="tier3-document"
                label="Proof-of-address document"
                description="Upload the actual document in PDF or an accepted image format. Ensure the document is clear and readable."
                file={tier3Document}
                onChange={setTier3Document}
                disabled={
                  tier3Locked || submitting
                }
              />

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '18px',
                  backgroundColor: LIGHT_GREEN,
                  border: `1px solid ${BORDER}`,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    color: TEXT,
                    fontWeight: 900,
                    mb: 1,
                  }}
                >
                  Facial verification
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    lineHeight: 1.8,
                    mb: 2,
                  }}
                >
                  Any selfie submitted here is
                  only an image upload. It does
                  not independently establish
                  identity or prove liveness.
                </Typography>

                <FileUpload
                  id="tier3-selfie"
                  label="Facial image"
                  description="Select a clear image of your face."
                  accept="image/jpeg,image/png,image/webp"
                  file={tier3Selfie}
                  onChange={setTier3Selfie}
                  disabled={
                    tier3Locked || submitting
                  }
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
                Your documents must be securely
                processed and reviewed. This form
                does not itself perform liveness
                verification or approve Tier 3.
              </Alert>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={
                  submitting || tier3Locked
                }
                sx={{
                  minHeight: 54,
                  borderRadius: '12px',
                  backgroundColor: GREEN,
                  fontWeight: 900,
                  fontSize: '1rem',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: DARK_GREEN,
                  },
                }}
              >
                {submitting ? (
                  <CircularProgress
                    size={24}
                    color="inherit"
                  />
                ) : tier3Locked ? (
                  `Tier 3 ${statusLabel(
                    tier3Status
                  )}`
                ) : (
                  'Submit Tier 3 Documents'
                )}
              </Button>
            </form>
          </SectionCard>
        )}

        {/* Status details */}

        <SectionCard>
          <SectionTitle
            eyebrow="Your progress"
            title="Verification status"
            description="Review the status of each verification requirement."
          />

          {[
            {
              number: 1,
              title: 'Tier 1 — BVN verification',
              description:
                'Your BVN must be confirmed by the verification provider.',
              status: bvnStatus,
            },
            {
              number: 2,
              title: 'Tier 2 — Identity verification',
              description:
                'Your identity documents and required facial verification must be approved.',
              status: idStatus,
            },
            {
              number: 3,
              title: 'Tier 3 — Address verification',
              description:
                'Your proof-of-address submission must be reviewed and approved.',
              status: tier3Status,
            },
          ].map((item, index) => (
            <Box key={item.number}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  py: 2.5,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    borderRadius: '14px',
                    backgroundColor: LIGHT_GREEN,
                    color: GREEN,
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
                      color: TEXT,
                      fontWeight: 900,
                      mb: 1,
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      color: MUTED,
                      fontSize: '0.9rem',
                      lineHeight: 1.7,
                      mb: 1.5,
                    }}
                  >
                    {item.description}
                  </Typography>

                  <StatusBadge
                    status={item.status}
                  />
                </Box>
              </Box>

              {index < 2 && (
                <Divider
                  sx={{
                    borderColor: BORDER,
                  }}
                />
              )}
            </Box>
          ))}

          <Button
            fullWidth
            variant="outlined"
            onClick={loadKycStatus}
            disabled={loading || submitting}
            sx={{
              mt: 3,
              minHeight: 52,
              borderRadius: '12px',
              borderColor: GREEN,
              color: GREEN,
              fontWeight: 900,
              textTransform: 'none',
              '&:hover': {
                borderColor: DARK_GREEN,
                backgroundColor: LIGHT_GREEN,
              },
            }}
          >
            {loading ? (
              <CircularProgress
                size={22}
                sx={{ color: GREEN }}
              />
            ) : (
              'Refresh verification status'
            )}
          </Button>
        </SectionCard>

        <Box
          sx={{
            textAlign: 'center',
            px: 2,
            py: 2,
          }}
        >
          <Typography
            sx={{
              color: MUTED,
              fontSize: '0.8rem',
              lineHeight: 1.7,
            }}
          >
            Zenimonies Banking · Secure identity
            verification
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default KYC;
