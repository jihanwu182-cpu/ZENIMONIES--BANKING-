import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

  document_type?: string;
  document_number?: string;

  document_front_url?: string;
  document_back_url?: string;
  selfie_url?: string;

  id_verification_status?: string;
  id_verified_at?: string | null;
  id_rejection_reason?: string | null;

  tier_3_method?: string | null;
  tier_3_document_url?: string;
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

type Tier3Method =
  | 'bank_statement'
  | 'utility_bill'
  | 'proof_of_address';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 10 * 1024 * 1024;

/* ============================================================
   GLOBAL KYC STATUS HELPERS
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
    normalized === 'completed'
  ) {
    return 'verified';
  }

  if (
    normalized === 'pending' ||
    normalized === 'under_review' ||
    normalized === 'submitted' ||
    normalized === 'processing'
  ) {
    return 'pending';
  }

  if (normalized === 'rejected') {
    return 'rejected';
  }

  return 'not_verified';
};

const displayStatus = (
  status: string | null | undefined
): string => {
  const normalized =
    normalizeStatus(status);

  if (normalized === 'verified') {
    return 'Verified';
  }

  if (normalized === 'pending') {
    return 'Pending Verification';
  }

  if (normalized === 'rejected') {
    return 'Rejected';
  }

  return 'Not Verified';
};

const getStatusColor = (
  status: string | null | undefined
): string => {
  const normalized =
    normalizeStatus(status);

  if (normalized === 'verified') {
    return '#027a48';
  }

  if (normalized === 'pending') {
    return '#b54708';
  }

  if (normalized === 'rejected') {
    return '#b42318';
  }

  return '#475467';
};

const getStatusBackground = (
  status: string | null | undefined
): string => {
  const normalized =
    normalizeStatus(status);

  if (normalized === 'verified') {
    return '#ecfdf3';
  }

  if (normalized === 'pending') {
    return '#fffaeb';
  }

  if (normalized === 'rejected') {
    return '#fef3f2';
  }

  return '#f2f4f7';
};

/* ============================================================
   KYC PAGE
   ============================================================ */

const KYC: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
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

  /* ==========================================================
     TIER 1 — BVN
     ========================================================== */

  const [bvn, setBvn] =
    useState('');

  /* ==========================================================
     TIER 2 — ID + SELFIE
     ========================================================== */

  const [documentType, setDocumentType] =
    useState('national_id');

  const [documentNumber, setDocumentNumber] =
    useState('');

  const [documentFront, setDocumentFront] =
    useState<File | null>(null);

  const [documentBack, setDocumentBack] =
    useState<File | null>(null);

  const [selfie, setSelfie] =
    useState<File | null>(null);

  /* ==========================================================
     TIER 3
     ========================================================== */

  const [tier3Method, setTier3Method] =
    useState<Tier3Method>(
      'bank_statement'
    );

  const [tier3Document, setTier3Document] =
    useState<File | null>(null);

  const [tier3Selfie, setTier3Selfie] =
    useState<File | null>(null);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const token =
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem('token');

  /* ==========================================================
     MONEY
     ========================================================== */

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

  /* ==========================================================
     BVN STATUS
     ========================================================== */

  const bvnStatus: VerificationState =
    kyc.bvn_verified
      ? 'verified'
      : normalizeStatus(
          record?.bvn_verification_status
        );

  const bvnIsPending =
    bvnStatus === 'pending';

  const bvnIsVerified =
    bvnStatus === 'verified' ||
    kyc.bvn_verified === true;

  const bvnIsRejected =
    bvnStatus === 'rejected';

  const bvnCanSubmit =
    bvnStatus === 'not_verified' ||
    bvnStatus === 'rejected';

  /* ==========================================================
     TIER 2 STATUS
     ========================================================== */

  const tier2Status: VerificationState =
    kyc.id_verified
      ? 'verified'
      : normalizeStatus(
          record?.id_verification_status
        );

  const tier2Pending =
    tier2Status === 'pending';

  const tier2Verified =
    tier2Status === 'verified' ||
    kyc.id_verified === true;

  const tier2Rejected =
    tier2Status === 'rejected';

  /* ==========================================================
     TIER 3 STATUS
     ========================================================== */

  const tier3Status: VerificationState =
    kyc.tier_3_verified
      ? 'verified'
      : normalizeStatus(
          record?.tier_3_verification_status
        );

  const tier3Pending =
    tier3Status === 'pending';

  const tier3Verified =
    tier3Status === 'verified' ||
    kyc.tier_3_verified === true;

  const tier3Rejected =
    tier3Status === 'rejected';

  /* ==========================================================
     FILE VALIDATION
     ========================================================== */

  const validateImageFile = (
    file: File | null,
    fieldName: string
  ): boolean => {
    if (!file) {
      setError(
        `${fieldName} is required.`
      );
      return false;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(file.type)
    ) {
      setError(
        `${fieldName} must be a JPG, JPEG, PNG, or WEBP image.`
      );
      return false;
    }

    if (
      file.size > MAX_IMAGE_SIZE
    ) {
      setError(
        `${fieldName} must not exceed 10 MB.`
      );
      return false;
    }

    return true;
  };

  const validatePdfFile = (
    file: File | null
  ): boolean => {
    if (!file) {
      setError(
        'Tier 3 proof-of-address document is required.'
      );
      return false;
    }

    const isPdf =
      file.type ===
        'application/pdf' ||
      file.name
        .toLowerCase()
        .endsWith('.pdf');

    if (!isPdf) {
      setError(
        'Tier 3 accepts PDF documents only.'
      );
      return false;
    }

    if (file.size > MAX_PDF_SIZE) {
      setError(
        'Tier 3 document must not exceed 10 MB.'
      );
      return false;
    }

    return true;
  };

  /* ==========================================================
     LOAD STATUS
     ========================================================== */

  const loadKycStatus =
    async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);
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

        if (
          data.record?.tier_3_method
        ) {
          setTier3Method(
            data.record
              .tier_3_method as Tier3Method
          );
        }
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
      }
    };

  useEffect(() => {
    loadKycStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================
     CLEAR FILE INPUTS
     ========================================================== */

  const clearFileInputs =
    () => {
      const fileInputs =
        document.querySelectorAll(
          'input[type="file"]'
        );

      fileInputs.forEach(
        (input) => {
          (
            input as HTMLInputElement
          ).value = '';
        }
      );
    };

  /* ==========================================================
     BVN SUBMISSION
     ========================================================== */

  const submitBvn = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!bvnCanSubmit) {
      if (bvnIsPending) {
        setError(
          'Your BVN verification is pending. You cannot submit another BVN while verification is in progress.'
        );
      }

      if (bvnIsVerified) {
        setError(
          'Your BVN has already been verified and cannot be changed.'
        );
      }

      return;
    }

    const cleanBvn =
      bvn.replace(/\D/g, '');

    if (
      !/^\d{11}$/.test(
        cleanBvn
      )
    ) {
      setError(
        'BVN must contain exactly 11 digits.'
      );
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/kyc/bvn`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              bvn: cleanBvn,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to submit BVN.'
        );
      }

      setMessage(
        data.message ||
          'BVN submitted successfully. Verification is pending.'
      );

      setBvn('');

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit BVN error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit BVN.'
      );

      await loadKycStatus();
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     TIER 2 FILE HANDLERS
     ========================================================== */

  const handleFrontDocument = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('');

    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setDocumentFront(null);
      return;
    }

    if (
      !validateImageFile(
        file,
        'Front of ID'
      )
    ) {
      event.target.value = '';
      setDocumentFront(null);
      return;
    }

    setDocumentFront(file);
  };

  const handleBackDocument = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('');

    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setDocumentBack(null);
      return;
    }

    if (
      !validateImageFile(
        file,
        'Back of ID'
      )
    ) {
      event.target.value = '';
      setDocumentBack(null);
      return;
    }

    setDocumentBack(file);
  };

  const handleSelfie = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('');

    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setSelfie(null);
      return;
    }

    if (
      !validateImageFile(
        file,
        'Selfie'
      )
    ) {
      event.target.value = '';
      setSelfie(null);
      return;
    }

    setSelfie(file);
  };

  /* ==========================================================
     TIER 3 FILE HANDLERS
     ========================================================== */

  const handleTier3Document = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('');

    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setTier3Document(null);
      return;
    }

    if (!validatePdfFile(file)) {
      event.target.value = '';
      setTier3Document(null);
      return;
    }

    setTier3Document(file);
  };

  const handleTier3Selfie = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError('');

    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setTier3Selfie(null);
      return;
    }

    if (
      !validateImageFile(
        file,
        'Liveness selfie'
      )
    ) {
      event.target.value = '';
      setTier3Selfie(null);
      return;
    }

    setTier3Selfie(file);
  };

  /* ==========================================================
     TIER 2 SUBMISSION
     ========================================================== */

  const submitTier2 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (tier2Pending) {
      setError(
        'Your Tier 2 verification is pending. You cannot edit or submit another verification while it is being reviewed.'
      );
      return;
    }

    if (tier2Verified) {
      setError(
        'Your Tier 2 identity verification has already been verified and cannot be changed.'
      );
      return;
    }

    if (!documentType) {
      setError(
        'Please select your ID document type.'
      );
      return;
    }

    if (
      !documentNumber.trim()
    ) {
      setError(
        'Please enter your ID document number.'
      );
      return;
    }

    if (
      !validateImageFile(
        documentFront,
        'Front of ID'
      )
    ) {
      return;
    }

    if (
      !validateImageFile(
        selfie,
        'Selfie'
      )
    ) {
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      const formData =
        new FormData();

      formData.append(
        'document_type',
        documentType
      );

      formData.append(
        'document_number',
        documentNumber.trim()
      );

      formData.append(
        'document_front',
        documentFront as File
      );

      if (documentBack) {
        formData.append(
          'document_back',
          documentBack
        );
      }

      formData.append(
        'selfie',
        selfie as File
      );

      const response =
        await fetch(
          `${API_BASE_URL}/kyc/tier-2`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to submit Tier 2 verification.'
        );
      }

      setMessage(
        data.message ||
          'Your ID and selfie have been submitted for verification.'
      );

      setDocumentNumber('');
      setDocumentFront(null);
      setDocumentBack(null);
      setSelfie(null);

      clearFileInputs();

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit Tier 2 error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit Tier 2 verification.'
      );

      await loadKycStatus();
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     TIER 3 SUBMISSION
     ========================================================== */

  const submitTier3 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (tier3Pending) {
      setError(
        'Your Tier 3 verification is pending. You cannot edit or submit another verification while it is being reviewed.'
      );
      return;
    }

    if (tier3Verified) {
      setError(
        'Your Tier 3 verification has already been verified and cannot be changed.'
      );
      return;
    }

    if (!tier3Method) {
      setError(
        'Please choose a Tier 3 verification method.'
      );
      return;
    }

    if (
      !validatePdfFile(
        tier3Document
      )
    ) {
      return;
    }

    if (
      !validateImageFile(
        tier3Selfie,
        'Liveness selfie'
      )
    ) {
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      const formData =
        new FormData();

      formData.append(
        'tier_3_method',
        tier3Method
      );

      formData.append(
        'tier_3_document',
        tier3Document as File
      );

      formData.append(
        'tier_3_selfie',
        tier3Selfie as File
      );

      const response =
        await fetch(
          `${API_BASE_URL}/kyc/tier-3`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to submit Tier 3 verification.'
        );
      }

      setMessage(
        data.message ||
          'Your proof-of-address document and liveness selfie have been submitted for review.'
      );

      setTier3Document(null);
      setTier3Selfie(null);

      clearFileInputs();

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit Tier 3 error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit Tier 3 verification.'
      );

      await loadKycStatus();
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     LOGOUT
     ========================================================== */

  const logout = () => {
    localStorage.removeItem(
      'zenimonies_token'
    );

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'zenimonies_user'
    );

    localStorage.removeItem(
      'zenimonies_accounts'
    );

    navigate('/login');
  };

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fb',
          color: '#475467',
          fontSize: '16px',
        }}
      >
        Loading KYC information...
      </div>
    );
  }

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
      }}
    >
      <header
        style={{
          background: '#ffffff',
          borderBottom:
            '1px solid #eaecf0',
          padding: '18px 24px',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#0b5cff',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            Zenimonies
          </Link>

          <div
            style={{
              color: '#667085',
              fontSize: '13px',
              marginTop: '2px',
            }}
          >
            Digital Banking
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#172033',
              fontWeight: 600,
            }}
          >
            Dashboard
          </Link>

          <Link
            to="/profile"
            style={{
              textDecoration: 'none',
              color: '#172033',
              fontWeight: 600,
            }}
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={logout}
            style={{
              border:
                '1px solid #d0d5dd',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '9px 15px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding:
            '30px 20px 60px',
        }}
      >
        <section
          style={{
            marginBottom: '25px',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#667085',
              fontSize: '14px',
            }}
          >
            Account Security
          </p>

          <h1
            style={{
              margin:
                '5px 0 8px',
              color: '#172033',
              fontSize: '30px',
            }}
          >
            KYC Verification
          </h1>

          <p
            style={{
              margin: 0,
              color: '#667085',
              lineHeight: 1.6,
            }}
          >
            Verify your identity to increase
            your Zenimonies account and
            transfer limits.
          </p>
        </section>

        {message && (
          <div
            style={{
              background: '#ecfdf3',
              border:
                '1px solid #abefc6',
              color: '#027a48',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px',
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef3f2',
              border:
                '1px solid #fecdca',
              color: '#b42318',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* ====================================================
            CURRENT STATUS
            ==================================================== */}

        <section
          style={sectionStyle}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: '#172033',
                  fontSize: '21px',
                }}
              >
                Current Verification
              </h2>

              <p
                style={{
                  margin:
                    '5px 0 0',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                Your current KYC level and
                account limits.
              </p>
            </div>

            <span
              style={{
                padding:
                  '8px 14px',
                borderRadius: '20px',
                background:
                  getStatusBackground(
                    kyc.status
                  ),
                color:
                  getStatusColor(
                    kyc.status
                  ),
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              {displayStatus(
                kyc.status
              )}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <InfoBox
              label="Current Tier"
              value={`Tier ${kyc.tier}`}
            />

            <InfoBox
              label="Account Limit"
              value={formatMoney(
                limits.account_limit
              )}
            />

            <InfoBox
              label="Daily Transfer Limit"
              value={formatMoney(
                limits.daily_transfer_limit
              )}
            />

            <InfoBox
              label="Daily Transfer Used"
              value={formatMoney(
                limits.daily_transfer_used
              )}
            />

            <InfoBox
              label="Daily Transfer Remaining"
              value={formatMoney(
                limits.daily_transfer_remaining
              )}
            />
          </div>
        </section>

        {/* ====================================================
            VERIFICATION LEVELS
            ==================================================== */}

        <section
          style={{
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 14px',
              color: '#172033',
              fontSize: '21px',
            }}
          >
            Verification Levels
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            <TierCard
              tier="Tier 1"
              title="BVN Verification"
              description="Verify your account using your Bank Verification Number."
              accountLimit="₦200,000"
              transferLimit="₦50,000 daily"
              verified={bvnIsVerified}
              currentTier={
                kyc.tier === 1
              }
              status={bvnStatus}
            />

            <TierCard
              tier="Tier 2"
              title="ID + Facial Verification"
              description="Submit your government-issued ID and complete facial/liveness verification."
              accountLimit="₦500,000"
              transferLimit="₦200,000 daily"
              verified={
                tier2Verified
              }
              currentTier={
                kyc.tier === 2
              }
              status={tier2Status}
            />

            <TierCard
              tier="Tier 3"
              title="Address + Liveness Verification"
              description="Submit an accepted proof-of-address document and complete liveness verification."
              accountLimit="Unlimited"
              transferLimit="₦5,000,000 daily"
              verified={
                tier3Verified
              }
              currentTier={
                kyc.tier === 3
              }
              status={tier3Status}
            />
          </div>
        </section>

        {/* ====================================================
            TIER 1
            ==================================================== */}

        <section
          style={sectionStyle}
        >
          <SectionHeading
            number="1"
            title="Tier 1 — BVN Verification"
            description="Submit your 11-digit BVN. Once submitted, your BVN remains locked until the verification process returns a result."
          />

          {bvnIsVerified && (
            <VerifiedMessage
              text="Your BVN has been successfully verified and is permanently locked. It cannot be changed."
            />
          )}

          {bvnIsPending && (
            <PendingMessage
              title="BVN Pending Verification"
              text="Your BVN has been submitted and is currently being verified. You cannot edit or submit another BVN while verification is pending."
            />
          )}

          {bvnIsRejected && (
            <RejectedMessage
              title="BVN Verification Rejected"
              reason={
                record?.bvn_rejection_reason
              }
              text="Your previous BVN submission was rejected. You may correct your information and submit again."
            />
          )}

          {bvnCanSubmit && (
            <form
              onSubmit={submitBvn}
            >
              <label
                style={labelStyle}
              >
                BVN
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={bvn}
                onChange={(event) =>
                  setBvn(
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                placeholder="Enter your 11-digit BVN"
                style={inputStyle}
                autoComplete="off"
                disabled={submitting}
              />

              <p
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                Your BVN is sensitive information.
                After submission, the BVN will be
                locked while verification is pending.
              </p>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !bvnCanSubmit
                }
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    submitting ||
                    !bvnCanSubmit
                      ? 0.6
                      : 1,
                  cursor:
                    submitting ||
                    !bvnCanSubmit
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {submitting
                  ? 'Submitting...'
                  : bvnIsRejected
                  ? 'Resubmit BVN'
                  : 'Submit BVN'}
              </button>
            </form>
          )}
        </section>

        {/* ====================================================
            TIER 2
            ==================================================== */}

        <section
          style={sectionStyle}
        >
          <SectionHeading
            number="2"
            title="Tier 2 — ID + Facial Verification"
            description="Upload your actual government-issued ID and complete facial/liveness verification."
          />

          {tier2Verified && (
            <VerifiedMessage
              text="Your identity verification has been approved and is permanently locked."
            />
          )}

          {tier2Pending && (
            <PendingMessage
              title="Tier 2 Verification Pending"
              text="Your ID and facial verification have been submitted and are currently being reviewed. All Tier 2 fields are locked until a verification result is returned."
            />
          )}

          {tier2Rejected && (
            <RejectedMessage
              title="Tier 2 Verification Rejected"
              reason={
                record?.id_rejection_reason
              }
              text="Your previous identity verification was rejected. You may correct your information and submit again."
            />
          )}

          {!tier2Verified &&
            !tier2Pending && (
              <form
                onSubmit={submitTier2}
              >
                <label
                  style={labelStyle}
                >
                  ID Document Type
                </label>

                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(
                      event.target.value
                    )
                  }
                  style={inputStyle}
                  disabled={
                    submitting
                  }
                >
                  <option value="national_id">
                    National ID
                  </option>

                  <option value="nin">
                    NIN
                  </option>

                  <option value="international_passport">
                    International Passport
                  </option>

                  <option value="drivers_license">
                    Driver's License
                  </option>

                  <option value="voters_card">
                    Voter's Card
                  </option>
                </select>

                <label
                  style={labelStyle}
                >
                  ID Document Number
                </label>

                <input
                  type="text"
                  value={
                    documentNumber
                  }
                  onChange={(event) =>
                    setDocumentNumber(
                      event.target.value
                    )
                  }
                  placeholder="Enter document number"
                  style={inputStyle}
                  autoComplete="off"
                  disabled={
                    submitting
                  }
                />

                <FileUploadBox
                  label="Front of ID"
                  description="Upload a clear photo of the front of your government-issued ID."
                  accept="image/jpeg,image/png,image/webp"
                  file={
                    documentFront
                  }
                  onChange={
                    handleFrontDocument
                  }
                  required
                  disabled={
                    submitting
                  }
                />

                <FileUploadBox
                  label="Back of ID"
                  description="Upload the back of your ID if your document has a reverse side."
                  accept="image/jpeg,image/png,image/webp"
                  file={
                    documentBack
                  }
                  onChange={
                    handleBackDocument
                  }
                  required={false}
                  disabled={
                    submitting
                  }
                />

                <div
                  style={{
                    marginTop: '20px',
                    marginBottom: '18px',
                    padding: '18px',
                    border:
                      '1px solid #dbe7ff',
                    background:
                      '#f8faff',
                    borderRadius:
                      '14px',
                  }}
                >
                  <h3
                    style={{
                      margin:
                        '0 0 7px',
                      color:
                        '#172033',
                      fontSize:
                        '17px',
                    }}
                  >
                    Facial Verification
                  </h3>

                  <p
                    style={{
                      margin:
                        '0 0 14px',
                      color:
                        '#667085',
                      fontSize:
                        '13px',
                      lineHeight: 1.6,
                    }}
                  >
                    Take a clear selfie using
                    your device. Your selfie
                    will be sent for
                    facial/liveness
                    verification.
                  </p>

                  <FileUploadBox
                    label="Live Selfie"
                    description="Use a clear image of your face."
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    file={selfie}
                    onChange={
                      handleSelfie
                    }
                    required
                    disabled={
                      submitting
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      submitting
                        ? 0.6
                        : 1,
                    cursor:
                      submitting
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {submitting
                    ? 'Uploading and submitting...'
                    : tier2Rejected
                    ? 'Resubmit Tier 2 Verification'
                    : 'Submit Tier 2 Verification'}
                </button>
              </form>
            )}
        </section>

        {/* ====================================================
            TIER 3
            ==================================================== */}

        <section
          style={sectionStyle}
        >
          <SectionHeading
            number="3"
            title="Tier 3 — Address + Liveness Verification"
            description="Submit an accepted proof-of-address document and complete liveness verification."
          />

          {tier3Verified && (
            <VerifiedMessage
              text="Your Tier 3 verification has been approved and is permanently locked."
            />
          )}

          {tier3Pending && (
            <PendingMessage
              title="Tier 3 Verification Pending"
              text="Your proof-of-address document and liveness verification have been submitted and are currently being reviewed. All Tier 3 fields are locked until a result is returned."
            />
          )}

          {tier3Rejected && (
            <RejectedMessage
              title="Tier 3 Verification Rejected"
              reason={
                record?.tier_3_rejection_reason
              }
              text="Your previous Tier 3 verification was rejected. You may correct your information and submit again."
            />
          )}

          {!tier3Verified &&
            !tier3Pending && (
              <form
                onSubmit={submitTier3}
              >
                <label
                  style={labelStyle}
                >
                  Choose Verification Method
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                    marginBottom:
                      '20px',
                  }}
                >
                  <MethodCard
                    selected={
                      tier3Method ===
                      'bank_statement'
                    }
                    title="Bank Statement"
                    description="Stamped PDF from your bank app. Must be dated within the last 90 days."
                    onClick={() =>
                      setTier3Method(
                        'bank_statement'
                      )
                    }
                    disabled={
                      submitting
                    }
                  />

                  <MethodCard
                    selected={
                      tier3Method ===
                      'utility_bill'
                    }
                    title="Utility Bill"
                    description="PHED, Water, DSTV, or Gas bill."
                    onClick={() =>
                      setTier3Method(
                        'utility_bill'
                      )
                    }
                    disabled={
                      submitting
                    }
                  />

                  <MethodCard
                    selected={
                      tier3Method ===
                      'proof_of_address'
                    }
                    title="Proof of Address"
                    description="Stamped tenancy agreement or government-issued address letter."
                    onClick={() =>
                      setTier3Method(
                        'proof_of_address'
                      )
                    }
                    disabled={
                      submitting
                    }
                  />
                </div>

                <FileUploadBox
                  label="Proof-of-Address Document"
                  description="Upload the actual PDF document. Do not enter a document URL. Maximum file size is 10 MB."
                  accept="application/pdf,.pdf"
                  file={
                    tier3Document
                  }
                  onChange={
                    handleTier3Document
                  }
                  required
                  disabled={
                    submitting
                  }
                />

                <div
                  style={{
                    marginTop: '22px',
                    marginBottom: '18px',
                    padding: '18px',
                    border:
                      '1px solid #dbe7ff',
                    background:
                      '#f8faff',
                    borderRadius:
                      '14px',
                  }}
                >
                  <h3
                    style={{
                      margin:
                        '0 0 7px',
                      color:
                        '#172033',
                      fontSize:
                        '17px',
                    }}
                  >
                    Liveness Verification
                  </h3>

                  <p
                    style={{
                      margin:
                        '0 0 14px',
                      color:
                        '#667085',
                      fontSize:
                        '13px',
                      lineHeight: 1.6,
                    }}
                  >
                    Take a current selfie
                    using your device
                    camera.
                  </p>

                  <FileUploadBox
                    label="Liveness Selfie"
                    description="Use your device camera to take a current selfie."
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    file={
                      tier3Selfie
                    }
                    onChange={
                      handleTier3Selfie
                    }
                    required
                    disabled={
                      submitting
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      submitting
                        ? 0.6
                        : 1,
                    cursor:
                      submitting
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {submitting
                    ? 'Uploading and submitting...'
                    : tier3Rejected
                    ? 'Resubmit Tier 3 Verification'
                    : 'Submit Tier 3 Verification'}
                </button>
              </form>
            )}
        </section>

        {/* ====================================================
            LATEST SUBMISSION
            ==================================================== */}

        {record && (
          <section
            style={{
              background:
                '#f8faff',
              border:
                '1px solid #dbe7ff',
              borderRadius: '14px',
              padding: '20px',
              marginBottom:
                '20px',
            }}
          >
            <h3
              style={{
                margin:
                  '0 0 10px',
                color: '#172033',
                fontSize: '17px',
              }}
            >
              Latest KYC Submission
            </h3>

            {record.bvn_verification_status && (
              <StatusRow
                label="BVN"
                status={
                  record.bvn_verification_status
                }
              />
            )}

            {record.id_verification_status && (
              <StatusRow
                label="ID"
                status={
                  record.id_verification_status
                }
              />
            )}

            {record.tier_3_verification_status && (
              <StatusRow
                label="Tier 3"
                status={
                  record.tier_3_verification_status
                }
              />
            )}

            {record.rejection_reason && (
              <p
                style={{
                  margin: 0,
                  color: '#b42318',
                  fontSize: '14px',
                }}
              >
                Reason:{' '}
                {
                  record.rejection_reason
                }
              </p>
            )}

            {record.bvn_rejection_reason && (
              <p
                style={{
                  margin:
                    '7px 0 0',
                  color: '#b42318',
                  fontSize: '14px',
                }}
              >
                BVN rejection reason:{' '}
                {
                  record.bvn_rejection_reason
                }
              </p>
            )}

            {record.id_rejection_reason && (
              <p
                style={{
                  margin:
                    '7px 0 0',
                  color: '#b42318',
                  fontSize: '14px',
                }}
              >
                ID rejection reason:{' '}
                {
                  record.id_rejection_reason
                }
              </p>
            )}

            {record.tier_3_rejection_reason && (
              <p
                style={{
                  margin:
                    '7px 0 0',
                  color: '#b42318',
                  fontSize: '14px',
                }}
              >
                Tier 3 rejection reason:{' '}
                {
                  record.tier_3_rejection_reason
                }
              </p>
            )}
          </section>
        )}

        <Link
          to="/"
          style={{
            display:
              'inline-block',
            textDecoration:
              'none',
            color: '#0b5cff',
            fontWeight: 700,
          }}
        >
          ← Back to Dashboard
        </Link>
      </main>
    </div>
  );
};

/* ============================================================
   FILE UPLOAD
   ============================================================ */

interface FileUploadBoxProps {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  required: boolean;
  capture?: 'user' | 'environment';
  disabled?: boolean;
}

const FileUploadBox: React.FC<
  FileUploadBoxProps
> = ({
  label,
  description,
  accept,
  file,
  onChange,
  required,
  capture,
  disabled = false,
}) => {
  return (
    <div
      style={{
        marginBottom: '18px',
        opacity:
          disabled ? 0.65 : 1,
      }}
    >
      <label
        style={labelStyle}
      >
        {label}{' '}
        {required && (
          <span
            style={{
              color: '#b42318',
            }}
          >
            *
          </span>
        )}
      </label>

      <div
        style={{
          border:
            '1px dashed #98a2b3',
          borderRadius: '12px',
          padding: '18px',
          background: disabled
            ? '#f2f4f7'
            : '#fcfcfd',
        }}
      >
        <input
          type="file"
          accept={accept}
          capture={capture}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            boxSizing:
              'border-box',
            fontSize: '14px',
          }}
        />

        <p
          style={{
            margin:
              '9px 0 0',
            color: '#667085',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>

        {disabled && (
          <p
            style={{
              margin:
                '8px 0 0',
              color: '#b54708',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            🔒 Verification is pending.
            This field is locked.
          </p>
        )}

        {file && (
          <div
            style={{
              marginTop: '12px',
              padding:
                '10px 12px',
              background:
                '#ecfdf3',
              border:
                '1px solid #abefc6',
              borderRadius: '8px',
              color: '#027a48',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            ✓ {file.name}

            <span
              style={{
                display:
                  'block',
                marginTop: '3px',
                fontSize:
                  '12px',
                fontWeight: 400,
              }}
            >
              {formatFileSizeStatic(
                file.size
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   STATUS ROW
   ============================================================ */

interface StatusRowProps {
  label: string;
  status: string;
}

const StatusRow: React.FC<
  StatusRowProps
> = ({
  label,
  status,
}) => {
  return (
    <p
      style={{
        margin:
          '0 0 7px',
        color: '#667085',
        fontSize: '14px',
      }}
    >
      {label}:{' '}
      <strong
        style={{
          color:
            getStatusColor(
              status
            ),
        }}
      >
        {displayStatus(
          status
        )}
      </strong>
    </p>
  );
};

/* ============================================================
   INFO BOX
   ============================================================ */

interface InfoBoxProps {
  label: string;
  value: string;
}

const InfoBox: React.FC<
  InfoBoxProps
> = ({
  label,
  value,
}) => {
  return (
    <div
      style={{
        background:
          '#f9fafb',
        border:
          '1px solid #eaecf0',
        borderRadius: '10px',
        padding: '15px',
      }}
    >
      <div
        style={{
          color: '#667085',
          fontSize: '12px',
          marginBottom: '6px',
          fontWeight: 600,
          textTransform:
            'uppercase',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#172033',
          fontSize: '16px',
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
};

/* ============================================================
   TIER CARD
   ============================================================ */

interface TierCardProps {
  tier: string;
  title: string;
  description: string;
  accountLimit: string;
  transferLimit: string;
  verified: boolean;
  currentTier: boolean;
  status?: string;
}

const TierCard: React.FC<
  TierCardProps
> = ({
  tier,
  title,
  description,
  accountLimit,
  transferLimit,
  verified,
  currentTier,
  status,
}) => {
  const normalizedStatus =
    verified
      ? 'verified'
      : normalizeStatus(
          status
        );

  return (
    <div
      style={{
        background:
          '#ffffff',
        border:
          currentTier
            ? '2px solid #0b5cff'
            : '1px solid #eaecf0',
        borderRadius:
          '14px',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          marginBottom:
            '12px',
          gap: '8px',
        }}
      >
        <strong
          style={{
            color: '#0b5cff',
            fontSize: '13px',
          }}
        >
          {tier}
        </strong>

        <span
          style={{
            background:
              getStatusBackground(
                normalizedStatus
              ),
            color:
              getStatusColor(
                normalizedStatus
              ),
            borderRadius:
              '20px',
            padding:
              '5px 9px',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {displayStatus(
            normalizedStatus
          )}
        </span>
      </div>

      <h3
        style={{
          margin:
            '0 0 8px',
          color: '#172033',
          fontSize: '18px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin:
            '0 0 15px',
          color: '#667085',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <div
        style={{
          color: '#172033',
          fontSize: '13px',
          marginBottom:
            '5px',
        }}
      >
        <strong>
          Account:
        </strong>{' '}
        {accountLimit}
      </div>

      <div
        style={{
          color: '#172033',
          fontSize: '13px',
        }}
      >
        <strong>
          Transfers:
        </strong>{' '}
        {transferLimit}
      </div>

      {normalizedStatus ===
        'pending' && (
        <div
          style={{
            marginTop:
              '12px',
            color: '#b54708',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          🔒 Submission locked
        </div>
      )}

      {normalizedStatus ===
        'rejected' && (
        <div
          style={{
            marginTop:
              '12px',
            color: '#b42318',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Correction required — resubmission available
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SECTION HEADING
   ============================================================ */

interface SectionHeadingProps {
  number: string;
  title: string;
  description: string;
}

const SectionHeading: React.FC<
  SectionHeadingProps
> = ({
  number,
  title,
  description,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '14px',
        marginBottom:
          '22px',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius:
            '50%',
          background:
            '#eaf2ff',
          color:
            '#0b5cff',
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
          fontWeight: 800,
        }}
      >
        {number}
      </div>

      <div>
        <h2
          style={{
            margin: 0,
            color: '#172033',
            fontSize: '20px',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin:
              '5px 0 0',
            color: '#667085',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

/* ============================================================
   METHOD CARD
   ============================================================ */

interface MethodCardProps {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const MethodCard: React.FC<
  MethodCardProps
> = ({
  selected,
  title,
  description,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign:
          'left',
        cursor:
          disabled
            ? 'not-allowed'
            : 'pointer',
        background:
          selected
            ? '#f0f6ff'
            : '#ffffff',
        border:
          selected
            ? '2px solid #0b5cff'
            : '1px solid #d0d5dd',
        borderRadius:
          '12px',
        padding:
          '15px',
        opacity:
          disabled ? 0.6 : 1,
      }}
    >
      <strong
        style={{
          display:
            'block',
          color: '#172033',
          marginBottom:
            '5px',
        }}
      >
        {title}
      </strong>

      <span
        style={{
          color: '#667085',
          fontSize: '13px',
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </button>
  );
};

/* ============================================================
   VERIFIED MESSAGE
   ============================================================ */

interface VerifiedMessageProps {
  text: string;
}

const VerifiedMessage: React.FC<
  VerifiedMessageProps
> = ({ text }) => {
  return (
    <div
      style={{
        background:
          '#ecfdf3',
        border:
          '1px solid #abefc6',
        borderRadius:
          '10px',
        padding:
          '15px',
        color:
          '#027a48',
        fontWeight: 600,
      }}
    >
      ✓ {text}
    </div>
  );
};

/* ============================================================
   PENDING MESSAGE
   ============================================================ */

interface PendingMessageProps {
  title: string;
  text: string;
}

const PendingMessage: React.FC<
  PendingMessageProps
> = ({
  title,
  text,
}) => {
  return (
    <div
      style={{
        background:
          '#fffaeb',
        border:
          '1px solid #fedf89',
        borderRadius:
          '12px',
        padding:
          '18px',
        color:
          '#b54708',
      }}
    >
      <strong
        style={{
          display:
            'block',
          marginBottom:
            '5px',
        }}
      >
        🔒 {title}
      </strong>

      <span
        style={{
          fontSize:
            '13px',
          lineHeight:
            1.5,
        }}
      >
        {text}
      </span>
    </div>
  );
};

/* ============================================================
   REJECTED MESSAGE
   ============================================================ */

interface RejectedMessageProps {
  title: string;
  text: string;
  reason?: string | null;
}

const RejectedMessage: React.FC<
  RejectedMessageProps
> = ({
  title,
  text,
  reason,
}) => {
  return (
    <div
      style={{
        background:
          '#fef3f2',
        border:
          '1px solid #fecdca',
        borderRadius:
          '12px',
        padding:
          '18px',
        color:
          '#b42318',
        marginBottom:
          '18px',
      }}
    >
      <strong
        style={{
          display:
            'block',
          marginBottom:
            '5px',
        }}
      >
        {title}
      </strong>

      <span
        style={{
          display:
            'block',
          fontSize:
            '13px',
          lineHeight:
            1.5,
        }}
      >
        {text}
      </span>

      {reason && (
        <div
          style={{
            marginTop:
              '10px',
            paddingTop:
              '10px',
            borderTop:
              '1px solid #fecdca',
            fontSize:
              '13px',
          }}
        >
          <strong>
            Reason:
          </strong>{' '}
          {reason}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   FILE SIZE
   ============================================================ */

const formatFileSizeStatic = (
  size: number
): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

/* ============================================================
   STYLES
   ============================================================ */

const sectionStyle: React.CSSProperties = {
  background:
    '#ffffff',
  border:
    '1px solid #eaecf0',
  borderRadius:
    '18px',
  padding:
    '25px',
  marginBottom:
    '20px',
  boxShadow:
    '0 8px 25px rgba(16, 24, 40, 0.05)',
};

const labelStyle: React.CSSProperties = {
  display:
    'block',
  color:
    '#344054',
  fontSize:
    '14px',
  fontWeight: 600,
  marginBottom:
    '7px',
};

const inputStyle: React.CSSProperties = {
  width:
    '100%',
  boxSizing:
    'border-box',
  border:
    '1px solid #d0d5dd',
  borderRadius:
    '8px',
  padding:
    '12px 13px',
  fontSize:
    '15px',
  marginBottom:
    '17px',
  outline:
    'none',
  background:
    '#ffffff',
};

const primaryButtonStyle: React.CSSProperties = {
  border:
    'none',
  background:
    '#0b5cff',
  color:
    '#ffffff',
  padding:
    '12px 18px',
  borderRadius:
    '8px',
  fontWeight: 700,
  fontSize:
    '14px',
  cursor:
    'pointer',
};

export default KYC;
