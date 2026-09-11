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

  document_type?: string;
  document_number?: string;

  /*
   * These are returned by the backend/storage system.
   * The user never enters these URLs manually.
   */
  document_front_url?: string;
  document_back_url?: string;
  selfie_url?: string;

  id_verification_status?: string;
  id_verified_at?: string | null;

  tier_3_method?: string | null;
  tier_3_document_url?: string;
  tier_3_verification_status?: string;
  tier_3_verified_at?: string | null;

  verification_status?: string;
  rejection_reason?: string | null;
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

type Tier3Method =
  | 'bank_statement'
  | 'utility_bill'
  | 'proof_of_address';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 10 * 1024 * 1024;

const KYC: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [kyc, setKyc] = useState<KycStatus>({
    status: 'not_verified',
    tier: 0,
    bvn_verified: false,
    id_verified: false,
    tier_3_verified: false,
    tier_3_method: null,
  });

  const [limits, setLimits] = useState<KycLimits>({
    account_limit: 50000,
    daily_transfer_limit: 25000,
    daily_transfer_used: 0,
    daily_transfer_remaining: 25000,
  });

  const [record, setRecord] =
    useState<KycRecord | null>(null);

  /*
   * ==========================================================
   * TIER 1
   * ==========================================================
   */

  const [bvn, setBvn] = useState('');

  /*
   * ==========================================================
   * TIER 2
   * ==========================================================
   */

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

  /*
   * ==========================================================
   * TIER 3
   * ==========================================================
   */

  const [tier3Method, setTier3Method] =
    useState<Tier3Method>('bank_statement');

  const [tier3Document, setTier3Document] =
    useState<File | null>(null);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token');

  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  const formatMoney = (
    amount: number | null
  ): string => {
    if (amount === null) {
      return 'Unlimited';
    }

    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (
    status: string
  ): string => {
    const normalized =
      status.toLowerCase();

    if (
      normalized === 'approved' ||
      normalized === 'verified' ||
      normalized === 'completed'
    ) {
      return '#027a48';
    }

    if (
      normalized === 'pending' ||
      normalized === 'under_review'
    ) {
      return '#b54708';
    }

    if (normalized === 'rejected') {
      return '#b42318';
    }

    return '#475467';
  };

  const getStatusBackground = (
    status: string
  ): string => {
    const normalized =
      status.toLowerCase();

    if (
      normalized === 'approved' ||
      normalized === 'verified' ||
      normalized === 'completed'
    ) {
      return '#ecfdf3';
    }

    if (
      normalized === 'pending' ||
      normalized === 'under_review'
    ) {
      return '#fffaeb';
    }

    if (normalized === 'rejected') {
      return '#fef3f2';
    }

    return '#f2f4f7';
  };

  const formatFileSize = (
    size: number
  ): string => {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  /*
   * ==========================================================
   * IMAGE VALIDATION
   * ==========================================================
   */

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
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        `${fieldName} must be a JPG, JPEG, PNG, or WEBP image.`
      );

      return false;
    }

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      setError(
        `${fieldName} must not exceed 10 MB.`
      );

      return false;
    }

    return true;
  };

  /*
   * ==========================================================
   * PDF VALIDATION
   * ==========================================================
   */

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

    if (
      file.size >
      MAX_PDF_SIZE
    ) {
      setError(
        'Tier 3 document must not exceed 10 MB.'
      );

      return false;
    }

    return true;
  };

  /*
   * ==========================================================
   * LOAD KYC STATUS
   * ==========================================================
   */

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
                Authorization: `Bearer ${token}`,
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
              'Unable to load KYC status'
          );
        }

        if (data.kyc) {
          setKyc(data.kyc);
        }

        if (data.limits) {
          setLimits(data.limits);
        }

        setRecord(
          data.record || null
        );

        if (
          data.record
            ?.tier_3_method
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
            : 'Unable to load KYC status'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadKycStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ==========================================================
   * TIER 1 — BVN
   * ==========================================================
   */

  const submitBvn = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

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
              Authorization: `Bearer ${token}`,
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
            'Unable to submit BVN'
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
          : 'Unable to submit BVN'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * FILE HANDLERS
   * ==========================================================
   */

  const handleFrontDocument =
    (
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

  const handleBackDocument =
    (
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

  const handleSelfie =
    (
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

  const handleTier3Document =
    (
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

      if (
        !validatePdfFile(file)
      ) {
        event.target.value = '';
        setTier3Document(null);
        return;
      }

      setTier3Document(file);
    };

  /*
   * ==========================================================
   * TIER 2 — ID + REAL SELFIE
   * ==========================================================
   */

  const submitTier2 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

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

    /*
     * We intentionally require the selfie.
     *
     * This is a real image captured/selected
     * from the user's device.
     *
     * The backend/provider must still perform
     * actual liveness and face verification.
     */

    if (
      !validateImageFile(
        selfie,
        'Selfie'
      )
    ) {
      return;
    }

    /*
     * The back of the ID is optional because
     * some government documents do not have
     * a reverse side.
     */

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

      /*
       * DO NOT manually set Content-Type here.
       *
       * The browser sets multipart/form-data
       * together with the required boundary.
       */

      const response =
        await fetch(
          `${API_BASE_URL}/kyc/tier-2`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
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
            'Unable to submit Tier 2 verification'
        );
      }

      setMessage(
        data.message ||
          'Your ID and facial verification have been submitted and are pending verification.'
      );

      setDocumentNumber('');
      setDocumentFront(null);
      setDocumentBack(null);
      setSelfie(null);

      /*
       * Reset file inputs visually.
       */
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

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit Tier 2 error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit Tier 2 verification'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * TIER 3 — PDF DOCUMENT
   * ==========================================================
   */

  const submitTier3 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

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

      /*
       * The backend receives the actual PDF.
       *
       * There is NO document URL entered by
       * the customer.
       */

      const response =
        await fetch(
          `${API_BASE_URL}/kyc/tier-3`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
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
            'Unable to submit Tier 3 verification'
        );
      }

      setMessage(
        data.message ||
          'Your Tier 3 document has been submitted and is pending review.'
      );

      setTier3Document(null);

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

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit Tier 3 error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit Tier 3 verification'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

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

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

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

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
      }}
    >
      {/* HEADER */}
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

      {/* MAIN */}
      <main
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding:
            '30px 20px 60px',
        }}
      >
        {/* TITLE */}
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

        {/* ALERTS */}
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

        {/* CURRENT STATUS */}
        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
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
                textTransform:
                  'capitalize',
              }}
            >
              {kyc.status.replace(
                /_/g,
                ' '
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

        {/* TIER CARDS */}
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
              verified={
                kyc.tier >= 1 &&
                kyc.bvn_verified
              }
              currentTier={
                kyc.tier === 1
              }
            />

            <TierCard
              tier="Tier 2"
              title="ID + Facial Verification"
              description="Submit a government-issued ID and complete real facial/liveness verification."
              accountLimit="₦500,000"
              transferLimit="₦200,000 daily"
              verified={
                kyc.tier >= 2 &&
                kyc.id_verified
              }
              currentTier={
                kyc.tier === 2
              }
            />

            <TierCard
              tier="Tier 3"
              title="Address Verification"
              description="Submit one accepted proof-of-address document for review."
              accountLimit="Unlimited"
              transferLimit="₦5,000,000 daily"
              verified={
                kyc.tier >= 3 &&
                kyc.tier_3_verified
              }
              currentTier={
                kyc.tier === 3
              }
            />
          </div>
        </section>

        {/* ==================================================
            TIER 1
            ================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <SectionHeading
            number="1"
            title="Tier 1 — BVN Verification"
            description="Submit your 11-digit BVN. Your account remains pending until an approved verification provider confirms the BVN."
          />

          {kyc.bvn_verified ? (
            <VerifiedMessage
              text="Your BVN has been verified."
            />
          ) : (
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
              />

              <p
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                Your BVN is sensitive information.
                It will remain pending until the
                verification provider confirms it.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={
                  primaryButtonStyle
                }
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit BVN'}
              </button>
            </form>
          )}
        </section>

        {/* ==================================================
            TIER 2
            ================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <SectionHeading
            number="2"
            title="Tier 2 — ID + Facial Verification"
            description="Upload your actual government-issued ID and complete a real facial/liveness verification. Uploading the files does not automatically approve your account."
          />

          {kyc.id_verified ? (
            <VerifiedMessage
              text="Your identity verification has been approved."
            />
          ) : (
            <form
              onSubmit={submitTier2}
            >
              {/* DOCUMENT TYPE */}

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

              {/* DOCUMENT NUMBER */}

              <label
                style={labelStyle}
              >
                ID Document Number
              </label>

              <input
                type="text"
                value={documentNumber}
                onChange={(event) =>
                  setDocumentNumber(
                    event.target.value
                  )
                }
                placeholder="Enter document number"
                style={inputStyle}
                autoComplete="off"
              />

              {/* FRONT */}

              <FileUploadBox
                label="Front of ID"
                description="Upload a clear photo of the front of your government-issued ID."
                accept="image/jpeg,image/png,image/webp"
                file={documentFront}
                onChange={
                  handleFrontDocument
                }
                required
              />

              {/* BACK */}

              <FileUploadBox
                label="Back of ID"
                description="Upload the back of your ID if your document has a reverse side."
                accept="image/jpeg,image/png,image/webp"
                file={documentBack}
                onChange={
                  handleBackDocument
                }
                required={false}
              />

              {/* SELFIE / LIVENESS */}

              <div
                style={{
                  marginTop: '20px',
                  marginBottom: '18px',
                  padding: '18px',
                  border:
                    '1px solid #dbe7ff',
                  background: '#f8faff',
                  borderRadius: '14px',
                }}
              >
                <h3
                  style={{
                    margin:
                      '0 0 7px',
                    color: '#172033',
                    fontSize: '17px',
                  }}
                >
                  Facial Verification
                </h3>

                <p
                  style={{
                    margin:
                      '0 0 14px',
                    color: '#667085',
                    fontSize: '13px',
                    lineHeight: 1.6,
                  }}
                >
                  Take a clear selfie using your
                  device. Your selfie will be sent
                  for facial/liveness verification.
                  A submitted selfie does not mean
                  that you have passed verification.
                </p>

                <FileUploadBox
                  label="Live Selfie"
                  description="Use a clear image of your face. Remove sunglasses, masks, and anything covering your face."
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  file={selfie}
                  onChange={handleSelfie}
                  required
                />
              </div>

              <div
                style={{
                  background: '#fffaeb',
                  border:
                    '1px solid #fedf89',
                  color: '#7a2e0b',
                  borderRadius: '10px',
                  padding: '13px 15px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                <strong>
                  Important:
                </strong>{' '}
                Your ID and selfie are submitted
                for verification. Zenimonies must
                receive a successful verification
                result before your Tier 2 status
                changes to verified.
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={
                  primaryButtonStyle
                }
              >
                {submitting
                  ? 'Uploading and submitting...'
                  : 'Submit Tier 2 Verification'}
              </button>
            </form>
          )}
        </section>

        {/* ==================================================
            TIER 3
            ================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <SectionHeading
            number="3"
            title="Tier 3 — Address Verification"
            description="Choose one accepted proof-of-address method and upload the actual document."
          />

          {kyc.tier_3_verified ? (
            <VerifiedMessage
              text="Your Tier 3 verification has been approved."
            />
          ) : (
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
                  marginBottom: '20px',
                }}
              >
                <MethodCard
                  value="bank_statement"
                  selected={
                    tier3Method ===
                    'bank_statement'
                  }
                  title="Bank Statement"
                  description="Upload a recent bank statement."
                  onClick={() =>
                    setTier3Method(
                      'bank_statement'
                    )
                  }
                />

                <MethodCard
                  value="utility_bill"
                  selected={
                    tier3Method ===
                    'utility_bill'
                  }
                  title="Utility Bill"
                  description="Upload an eligible recent utility bill."
                  onClick={() =>
                    setTier3Method(
                      'utility_bill'
                    )
                  }
                />

                <MethodCard
                  value="proof_of_address"
                  selected={
                    tier3Method ===
                    'proof_of_address'
                  }
                  title="Proof of Address"
                  description="Upload an accepted proof of your residential address."
                  onClick={() =>
                    setTier3Method(
                      'proof_of_address'
                    )
                  }
                />
              </div>

              <FileUploadBox
                label="Proof-of-Address Document"
                description="Upload the actual PDF document. Screenshots and ordinary photos are not accepted."
                accept="application/pdf,.pdf"
                file={tier3Document}
                onChange={
                  handleTier3Document
                }
                required
              />

              <p
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  marginTop: '10px',
                }}
              >
                Only one Tier 3 document is required.
                Your document will remain pending
                until it is reviewed and approved.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={
                  primaryButtonStyle
                }
              >
                {submitting
                  ? 'Uploading and submitting...'
                  : 'Submit Tier 3 Verification'}
              </button>
            </form>
          )}
        </section>

        {/* ==================================================
            LAST RECORD
            ================================================== */}

        {record && (
          <section
            style={{
              background: '#f8faff',
              border:
                '1px solid #dbe7ff',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '20px',
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

            <p
              style={{
                margin:
                  '0 0 7px',
                color: '#667085',
                fontSize: '14px',
              }}
            >
              Status:{' '}
              <strong
                style={{
                  color:
                    getStatusColor(
                      record.verification_status ||
                        'pending'
                    ),
                }}
              >
                {(
                  record.verification_status ||
                  'pending'
                ).replace(
                  /_/g,
                  ' '
                )}
              </strong>
            </p>

            {record.rejection_reason && (
              <p
                style={{
                  margin: 0,
                  color: '#b42318',
                  fontSize: '14px',
                }}
              >
                Reason:{' '}
                {record.rejection_reason}
              </p>
            )}

            {record.document_type && (
              <p
                style={{
                  margin:
                    '7px 0 0',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                ID type:{' '}
                {record.document_type.replace(
                  /_/g,
                  ' '
                )}
              </p>
            )}

            {record.tier_3_method && (
              <p
                style={{
                  margin:
                    '7px 0 0',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                Tier 3 method:{' '}
                {record.tier_3_method.replace(
                  /_/g,
                  ' '
                )}
              </p>
            )}
          </section>
        )}

        <Link
          to="/"
          style={{
            display:
              'inline-block',
            textDecoration: 'none',
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
   FILE UPLOAD COMPONENT
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
}) => {
  return (
    <div
      style={{
        marginBottom: '18px',
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
          background: '#fcfcfd',
        }}
      >
        <input
          type="file"
          accept={accept}
          capture={capture}
          onChange={onChange}
          style={{
            width: '100%',
            boxSizing: 'border-box',
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

        {file && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              background: '#ecfdf3',
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
                display: 'block',
                marginTop: '3px',
                fontSize: '12px',
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
        background: '#f9fafb',
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
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: currentTier
          ? '2px solid #0b5cff'
          : '1px solid #eaecf0',
        borderRadius: '14px',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginBottom: '12px',
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

        {verified && (
          <span
            style={{
              background: '#ecfdf3',
              color: '#027a48',
              borderRadius: '20px',
              padding:
                '5px 9px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Verified
          </span>
        )}

        {!verified &&
          currentTier && (
            <span
              style={{
                background: '#fffaeb',
                color: '#b54708',
                borderRadius:
                  '20px',
                padding:
                  '5px 9px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Current
            </span>
          )}
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
          marginBottom: '5px',
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
        marginBottom: '22px',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#eaf2ff',
          color: '#0b5cff',
          display: 'flex',
          alignItems: 'center',
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
  value: Tier3Method;
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}

const MethodCard: React.FC<
  MethodCardProps
> = ({
  selected,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        background: selected
          ? '#f0f6ff'
          : '#ffffff',
        border: selected
          ? '2px solid #0b5cff'
          : '1px solid #d0d5dd',
        borderRadius: '12px',
        padding: '15px',
      }}
    >
      <strong
        style={{
          display: 'block',
          color: '#172033',
          marginBottom: '5px',
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
        background: '#ecfdf3',
        border:
          '1px solid #abefc6',
        borderRadius: '10px',
        padding: '15px',
        color: '#027a48',
        fontWeight: 600,
      }}
    >
      ✓ {text}
    </div>
  );
};

/* ============================================================
   STATIC FILE SIZE FORMATTER
   ============================================================ */

const formatFileSizeStatic = (
  size: number
): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#344054',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #d0d5dd',
  borderRadius: '8px',
  padding: '12px 13px',
  fontSize: '15px',
  marginBottom: '17px',
  outline: 'none',
  background: '#ffffff',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  background: '#0b5cff',
  color: '#ffffff',
  padding: '12px 18px',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
};

export default KYC;
