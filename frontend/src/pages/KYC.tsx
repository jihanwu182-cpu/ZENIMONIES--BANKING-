

import React, { useEffect, useRef, useState } from 'react';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type KycStatus =
  | 'not submitted'
  | 'pending'
  | 'verified'
  | 'rejected';

type KycData = {
  status?: string;
  tier?: number;
  submitted_tier?: number;

  bvn_status?: string;
  bvn_verified?: boolean;
  bvn_rejection_reason?: string;

  id_status?: string;
  id_verified?: boolean;
  id_rejection_reason?: string;

  tier_3_status?: string;
  tier_3_verified?: boolean;
  tier_3_method?: string;
  tier_3_rejection_reason?: string;

  rejection_reason?: string;
  missing_profile_fields?: string[];
  missingProfileFields?: string[];

  account_limit?: number | null;
  daily_transfer_limit?: number | null;
  daily_transfer_used?: number;
  daily_transfer_remaining?: number;
};

type KycResponse = {
  success?: boolean;
  message?: string;
  user?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  kyc?: KycData;
  data?: {
    user?: KycResponse['user'];
    kyc?: KycData;
  };
};

const GREEN = '#087A43';
const DARK_GREEN = '#075C35';

const TIER_LIMITS: Record<
  number,
  {
    account: number | null;
    daily: number;
  }
> = {
  0: { account: 50000, daily: 25000 },
  1: { account: 200000, daily: 50000 },
  2: { account: 500000, daily: 200000 },
  3: { account: null, daily: 5000000 },
};

const styles = `
  * {
    box-sizing: border-box;
  }

  .zk-page {
    min-height: 100vh;
    padding: 12px 10px 24px;
    background: #F4F8F5;
    color: #172B21;
    font-family: Inter, -apple-system, BlinkMacSystemFont,
      "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 13px;
  }

  .zk-container {
    width: 100%;
    max-width: 620px;
    margin: 0 auto;
  }

  .zk-hero {
    padding: 19px;
    margin-bottom: 12px;
    color: white;
    background: linear-gradient(135deg, #075C35, #087A43);
    border-radius: 14px;
  }

  .zk-brand {
    margin-bottom: 7px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1.4px;
    opacity: .85;
  }

  .zk-hero h1 {
    margin: 0;
    font-size: 23px;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: -.4px;
  }

  .zk-hero p {
    margin: 8px 0 0;
    color: #E2F1E8;
    font-size: 12px;
    line-height: 1.55;
  }

  .zk-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 13px;
  }

  .zk-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    color: white;
    background: rgba(255,255,255,.13);
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }

  .zk-card {
    padding: 15px;
    margin-bottom: 12px;
    background: white;
    border: 1px solid #DFE9E2;
    border-radius: 13px;
    box-shadow: 0 2px 8px rgba(25,65,42,.035);
  }

  .zk-card-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 11px;
  }

  .zk-number {
    display: grid;
    flex: 0 0 30px;
    width: 30px;
    height: 30px;
    place-items: center;
    color: ${GREEN};
    background: #EAF4EE;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 800;
  }

  .zk-card h2 {
    margin: 0;
    color: #172B21;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.35;
  }

  .zk-card-heading p {
    margin: 3px 0 0;
    color: #68776D;
    font-size: 11px;
    line-height: 1.5;
  }

  .zk-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    margin: 0 0 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    text-transform: capitalize;
  }

  .zk-status.pending {
    color: #805A13;
    background: #FFF3D6;
  }

  .zk-status.verified {
    color: #17623A;
    background: #E6F5EB;
  }

  .zk-status.rejected {
    color: #9A3030;
    background: #FDECEC;
  }

  .zk-status.not-submitted {
    color: #58675E;
    background: #EEF2EF;
  }

  .zk-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 10px 0;
  }

  .zk-stat {
    min-width: 0;
    padding: 11px;
    background: #F6F9F7;
    border: 1px solid #E1EAE4;
    border-radius: 10px;
  }

  .zk-stat-label {
    margin-bottom: 5px;
    color: #69786E;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .45px;
    line-height: 1.4;
    text-transform: uppercase;
  }

  .zk-stat-value {
    color: ${DARK_GREEN};
    font-size: clamp(15px, 4vw, 19px);
    font-weight: 800;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .zk-stat-sub {
    margin-top: 4px;
    color: #7A877F;
    font-size: 10px;
  }

  .zk-label {
    display: block;
    margin: 12px 0 5px;
    color: #263B2F;
    font-size: 12px;
    font-weight: 750;
  }

  .zk-input,
  .zk-select {
    display: block;
    width: 100%;
    min-height: 40px;
    padding: 9px 11px;
    color: #172B21;
    background: white;
    border: 1px solid #D4E0D7;
    border-radius: 9px;
    outline: none;
    font: inherit;
    font-size: 13px;
  }

  .zk-input:focus,
  .zk-select:focus {
    border-color: ${GREEN};
    box-shadow: 0 0 0 2px rgba(8,122,67,.10);
  }

  .zk-input[type="file"] {
    min-height: 38px;
    padding: 7px;
    background: #F8FAF8;
    font-size: 11px;
  }

  .zk-help {
    margin: 5px 0 0;
    color: #718076;
    font-size: 11px;
    line-height: 1.5;
  }

  .zk-methods {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    margin: 10px 0 12px;
  }

  .zk-method {
    padding: 10px;
    color: #263B2F;
    text-align: left;
    background: white;
    border: 1px solid #DDE8E0;
    border-radius: 9px;
    cursor: pointer;
    font: inherit;
  }

  .zk-method strong {
    display: block;
    margin-bottom: 3px;
    font-size: 11px;
    line-height: 1.4;
  }

  .zk-method span {
    display: block;
    color: #718076;
    font-size: 10px;
    line-height: 1.4;
  }

  .zk-method.selected {
    padding: 9px;
    background: #F0F8F3;
    border: 2px solid ${GREEN};
  }

  .zk-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 40px;
    padding: 10px 13px;
    margin-top: 12px;
    color: white;
    background: ${GREEN};
    border: 1px solid ${GREEN};
    border-radius: 9px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .zk-button:hover:not(:disabled) {
    background: ${DARK_GREEN};
  }

  .zk-button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .zk-alert {
    padding: 11px 13px;
    margin-bottom: 12px;
    color: #755019;
    background: #FFF9E9;
    border: 1px solid #F0D48B;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .zk-alert.error {
    color: #922D2D;
    background: #FFF1F1;
    border-color: #F1C6C6;
  }

  .zk-alert.success {
    color: #17623A;
    background: #ECF8F0;
    border-color: #B9DEC8;
  }

  .zk-note {
    padding: 10px 12px;
    margin-top: 10px;
    color: #5F7065;
    background: #F5F9F6;
    border: 1px solid #DCE9E0;
    border-radius: 9px;
    font-size: 11px;
    line-height: 1.5;
  }

  .zk-tier-limits {
    padding: 12px;
    margin: 10px 0 13px;
    background: #F0F8F3;
    border: 1px solid #D5E9DC;
    border-radius: 10px;
  }

  .zk-tier-limits h3 {
    margin: 0 0 8px;
    color: #075C35;
    font-size: 13px;
    font-weight: 800;
  }

  .zk-tier-limit-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #DCE9E0;
    font-size: 12px;
  }

  .zk-tier-limit-row:last-child {
    border-bottom: 0;
  }

  .zk-tier-limit-row span {
    color: #68776D;
  }

  .zk-tier-limit-row strong {
    color: #075C35;
    text-align: right;
    font-weight: 800;
  }

  .zk-progress {
    height: 5px;
    margin: 8px 0 0;
    overflow: hidden;
    background: #E7EEE9;
    border-radius: 999px;
  }

  .zk-progress > div {
    height: 100%;
    background: ${GREEN};
    border-radius: inherit;
    transition: width .2s;
  }

  .zk-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 11px 0;
    border-bottom: 1px solid #E8EEE9;
  }

  .zk-status-row:last-child {
    border-bottom: 0;
  }

  .zk-status-row strong {
    display: block;
    color: #263B2F;
    font-size: 12px;
  }

  .zk-status-row small {
    display: block;
    margin-top: 3px;
    color: #718076;
    font-size: 11px;
    line-height: 1.45;
  }

  .zk-footer {
    margin: 16px 0 0;
    color: #829087;
    text-align: center;
    font-size: 10px;
  }

  @media (max-width: 520px) {
    .zk-page {
      padding: 9px 8px 20px;
    }

    .zk-hero {
      padding: 16px;
      border-radius: 12px;
    }

    .zk-hero h1 {
      font-size: 21px;
    }

    .zk-card {
      padding: 13px;
      margin-bottom: 10px;
      border-radius: 11px;
    }

    .zk-card h2 {
      font-size: 15px;
    }

    .zk-grid {
      gap: 7px;
    }

    .zk-stat {
      padding: 9px;
    }

    .zk-methods {
      grid-template-columns: 1fr;
    }

    .zk-method {
      padding: 10px;
    }

    .zk-method.selected {
      padding: 9px;
    }

    .zk-status-row {
      align-items: flex-start;
    }
  }
`;

const money = (value: number | null | undefined) => {
  if (value === null) return 'Unlimited';

  if (value === undefined || !Number.isFinite(Number(value))) {
    return 'Not available';
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const normalizeStatus = (
  value?: string | boolean
): KycStatus => {
  if (value === true) return 'verified';
  if (value === false || !value) return 'not submitted';

  const normalized = String(value)
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .trim();

  if (
    normalized === 'verified' ||
    normalized === 'approved' ||
    normalized === 'success' ||
    normalized === 'successful'
  ) {
    return 'verified';
  }

  if (
    normalized.includes('reject') ||
    normalized.includes('fail') ||
    normalized.includes('declin')
  ) {
    return 'rejected';
  }

  if (
    normalized.includes('pending') ||
    normalized.includes('review') ||
    normalized.includes('processing') ||
    normalized.includes('submitted')
  ) {
    return 'pending';
  }

  return 'not submitted';
};

const StatusBadge = ({
  status,
}: {
  status: KycStatus;
}) => (
  <span className={`zk-status ${status.replace(/\s/g, '-')}`}>
    <span aria-hidden="true">
      {status === 'verified'
        ? '✓'
        : status === 'pending'
          ? '◷'
          : status === 'rejected'
            ? '!'
            : '○'}
    </span>

    {status === 'not submitted'
      ? 'Not submitted'
      : status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

const TierLimits = ({
  tier,
}: {
  tier: 0 | 1 | 2 | 3;
}) => {
  const limits = TIER_LIMITS[tier];

  return (
    <div className="zk-tier-limits">
      <h3>
        Limits unlocked at Tier {tier}
      </h3>

      <div className="zk-tier-limit-row">
        <span>Maximum account balance</span>
        <strong>{money(limits.account)}</strong>
      </div>

      <div className="zk-tier-limit-row">
        <span>Daily transfer limit</span>
        <strong>{money(limits.daily)}</strong>
      </div>
    </div>
  );
};

const KYC: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [alert, setAlert] = useState('');
  const [alertType, setAlertType] = useState<
    'error' | 'success' | 'info'
  >('info');

  const [user, setUser] = useState<KycResponse['user']>({});
  const [kyc, setKyc] = useState<KycData>({});

  const [bvn, setBvn] = useState('');

  const [documentType, setDocumentType] =
    useState('national_id');

  const [documentNumber, setDocumentNumber] = useState('');

  const [tier3Method, setTier3Method] =
    useState('bank_statement');

  // These are display selections for the customer.
  // The existing backend accepts only tier_3_method,
  // tier_3_document and tier_3_selfie.
  const [addressDocumentType, setAddressDocumentType] =
    useState('');

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [tier2Selfie, setTier2Selfie] =
    useState<File | null>(null);

  const [tier3Selfie, setTier3Selfie] =
    useState<File | null>(null);

  const [addressFile, setAddressFile] =
    useState<File | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const tier2SelfieRef = useRef<HTMLInputElement>(null);
  const tier3SelfieRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    '';

  const requestHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${token}`,
  });

  const fetchStatus = async () => {
    if (!token) {
      setAlert('Please sign in to view your verification status.');
      setAlertType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/kyc/status`, {
        method: 'GET',
        headers: requestHeaders(),
      });

      const result: KycResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to load verification status.'
        );
      }

      const payload = result.data || result;

      setUser(payload.user || {});
      setKyc(payload.kyc || {});
    } catch (error) {
      setAlert(
        error instanceof Error
          ? error.message
          : 'Unable to load verification status.'
      );
      setAlertType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bvnStatus = normalizeStatus(
    kyc.bvn_verified === true ? true : kyc.bvn_status
  );

  const idStatus = normalizeStatus(
    kyc.id_verified === true ? true : kyc.id_status
  );

  const tier3Status = normalizeStatus(
    kyc.tier_3_verified === true ? true : kyc.tier_3_status
  );

  const overallStatus = normalizeStatus(kyc.status);

  const approvedTier = Math.min(
    3,
    Math.max(0, Number(kyc.tier || 0))
  );

  const submittedTier = Number(kyc.submitted_tier || 0);

  const accountLimit =
    kyc.account_limit !== undefined
      ? kyc.account_limit
      : TIER_LIMITS[approvedTier].account;

  const dailyLimit =
    kyc.daily_transfer_limit !== undefined
      ? kyc.daily_transfer_limit
      : TIER_LIMITS[approvedTier].daily;

  const dailyUsed = Number(kyc.daily_transfer_used || 0);

  const dailyRemaining =
    kyc.daily_transfer_remaining !== undefined
      ? Number(kyc.daily_transfer_remaining)
      : dailyLimit === null
        ? null
        : Math.max(0, Number(dailyLimit || 0) - dailyUsed);

  const missingFields =
    kyc.missing_profile_fields ||
    kyc.missingProfileFields ||
    [];

  const canSubmitBvn =
    bvnStatus !== 'pending' &&
    bvnStatus !== 'verified';

  const canSubmitTier2 =
    bvnStatus === 'verified' &&
    idStatus !== 'pending' &&
    idStatus !== 'verified';

  const canSubmitTier3 =
    idStatus === 'verified' &&
    tier3Status !== 'pending' &&
    tier3Status !== 'verified';

  const submitBvn = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setAlert('');

    if (!/^\d{11}$/.test(bvn)) {
      setAlert('Enter a valid 11-digit Nigerian BVN.');
      setAlertType('error');
      return;
    }

    if (missingFields.length > 0) {
      setAlert(
        `Please complete your profile first. Missing information: ${missingFields.join(', ')}.`
      );
      setAlertType('error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/kyc/bvn`, {
        method: 'POST',
        headers: {
          ...requestHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bvn }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'BVN submission failed.'
        );
      }

      setAlert(
        result.message ||
          'Your BVN has been submitted for verification.'
      );

      setAlertType('success');
      setBvn('');

      await fetchStatus();
    } catch (error) {
      setAlert(
        error instanceof Error
          ? error.message
          : 'BVN submission failed.'
      );
      setAlertType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier2 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setAlert('');

    if (!documentNumber.trim()) {
      setAlert('Enter your government-issued ID number.');
      setAlertType('error');
      return;
    }

    if (!frontFile) {
      setAlert('Please upload the front of your ID document.');
      setAlertType('error');
      return;
    }

    if (
      documentType !== 'international_passport' &&
      !backFile
    ) {
      setAlert('Please upload the back of your ID document.');
      setAlertType('error');
      return;
    }

    if (!tier2Selfie) {
      setAlert('Please select your facial verification selfie.');
      setAlertType('error');
      return;
    }

    const formData = new FormData();

    formData.append('document_type', documentType);
    formData.append(
      'document_number',
      documentNumber.trim()
    );
    formData.append('document_front', frontFile);

    if (backFile) {
      formData.append('document_back', backFile);
    }

    formData.append('selfie', tier2Selfie);

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE}/kyc/tier-2`,
        {
          method: 'POST',
          headers: requestHeaders(),
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Tier 2 submission failed.'
        );
      }

      setAlert(
        result.message ||
          'Your identity documents have been submitted for review.'
      );

      setAlertType('success');

      setDocumentNumber('');
      setFrontFile(null);
      setBackFile(null);
      setTier2Selfie(null);

      if (frontRef.current) frontRef.current.value = '';
      if (backRef.current) backRef.current.value = '';
      if (tier2SelfieRef.current) {
        tier2SelfieRef.current.value = '';
      }

      await fetchStatus();
    } catch (error) {
      setAlert(
        error instanceof Error
          ? error.message
          : 'Tier 2 submission failed.'
      );
      setAlertType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier3 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setAlert('');

    if (!addressDocumentType) {
      setAlert('Please select the type of address document.');
      setAlertType('error');
      return;
    }

    if (!addressFile) {
      setAlert('Please select your proof-of-address document.');
      setAlertType('error');
      return;
    }

    if (addressFile.type !== 'application/pdf') {
      setAlert('Please upload your proof of address as a PDF.');
      setAlertType('error');
      return;
    }

    if (!tier3Selfie) {
      setAlert('Please select your required selfie.');
      setAlertType('error');
      return;
    }

    const formData = new FormData();

    // These are the existing backend field names.
    formData.append('tier_3_method', tier3Method);
    formData.append('tier_3_document', addressFile);
    formData.append('tier_3_selfie', tier3Selfie);

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE}/kyc/tier-3`,
        {
          method: 'POST',
          headers: requestHeaders(),
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Tier 3 submission failed.'
        );
      }

      setAlert(
        result.message ||
          'Your proof-of-address document has been submitted for review.'
      );

      setAlertType('success');

      setAddressFile(null);
      setTier3Selfie(null);

      if (addressRef.current) addressRef.current.value = '';
      if (tier3SelfieRef.current) {
        tier3SelfieRef.current.value = '';
      }

      await fetchStatus();
    } catch (error) {
      setAlert(
        error instanceof Error
          ? error.message
          : 'Tier 3 submission failed.'
      );
      setAlertType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusRow = (
    title: string,
    description: string,
    status: KycStatus
  ) => (
    <div className="zk-status-row" key={title}>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>

      <StatusBadge status={status} />
    </div>
  );

  return (
    <div className="zk-page">
      <style>{styles}</style>

      <main className="zk-container">

        {/* Header */}

        <section className="zk-hero">
          <div className="zk-brand">
            ZENIMONIES BANKING
          </div>

          <h1>Identity Verification</h1>

          <p>
            Verify your identity securely to access the account
            features and transfer limits available to you.
          </p>

          <div className="zk-hero-pills">
            <span className="zk-pill">
              🔒 Secure verification
            </span>

            <span className="zk-pill">
              Tier {approvedTier} approved
            </span>
          </div>
        </section>

        {/* Alerts */}

        {alert && (
          <div
            className={`zk-alert ${
              alertType === 'error'
                ? 'error'
                : alertType === 'success'
                  ? 'success'
                  : ''
            }`}
            role="status"
          >
            {alert}
          </div>
        )}

        {loading ? (
          <section className="zk-card">
            <p style={{ margin: 0, color: '#68776D' }}>
              Loading your verification details...
            </p>
          </section>
        ) : (
          <>

            {/* Current Verification */}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">✓</div>

                <div>
                  <h2>Current Verification</h2>
                  <p>
                    Your approved KYC level and account limits.
                  </p>
                </div>
              </div>

              <StatusBadge status={overallStatus} />

              <div className="zk-grid">
                <div className="zk-stat">
                  <div className="zk-stat-label">
                    Approved tier
                  </div>

                  <div className="zk-stat-value">
                    {approvedTier}
                  </div>

                  <div className="zk-stat-sub">
                    Submitted: Tier {submittedTier}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">
                    Account limit
                  </div>

                  <div className="zk-stat-value">
                    {money(accountLimit)}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">
                    Daily transfer limit
                  </div>

                  <div className="zk-stat-value">
                    {money(dailyLimit)}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">
                    Daily transfers used
                  </div>

                  <div className="zk-stat-value">
                    {money(dailyUsed)}
                  </div>
                </div>

                <div
                  className="zk-stat"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <div className="zk-stat-label">
                    Daily transfer remaining
                  </div>

                  <div className="zk-stat-value">
                    {dailyRemaining === null
                      ? 'Unlimited'
                      : money(dailyRemaining)}
                  </div>

                  {dailyLimit !== null &&
                    Number(dailyLimit) > 0 && (
                      <div className="zk-progress">
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                (dailyUsed /
                                  Number(dailyLimit)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                </div>
              </div>

              {/* All tier limits */}

              <TierLimits tier={0} />
              <TierLimits tier={1} />
              <TierLimits tier={2} />
              <TierLimits tier={3} />

            </section>

            {/* Profile requirements */}

            {missingFields.length > 0 && (
              <div className="zk-alert">
                <strong>Complete your personal information</strong>
                <br />

                Before submitting your BVN, update these
                missing profile details:

                <br />

                {missingFields.join(', ')}

                <br />

                Open your profile and complete the missing
                information before continuing.
              </div>
            )}

            {/* Tier 1 */}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">1</div>

                <div>
                  <h2>BVN Verification</h2>
                  <p>
                    Verify your Nigerian Bank Verification Number.
                  </p>
                </div>
              </div>

              <StatusBadge status={bvnStatus} />

              <TierLimits tier={1} />

              {bvnStatus === 'rejected' &&
                kyc.bvn_rejection_reason && (
                  <div className="zk-alert error">
                    <strong>Reason:</strong>{' '}
                    {kyc.bvn_rejection_reason}
                  </div>
                )}

              <form onSubmit={submitBvn}>
                <label
                  className="zk-label"
                  htmlFor="zk-bvn"
                >
                  11-digit BVN
                </label>

                <input
                  id="zk-bvn"
                  className="zk-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  placeholder="Enter your 11-digit BVN"
                  value={bvn}
                  onChange={(event) =>
                    setBvn(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 11)
                    )
                  }
                  disabled={!canSubmitBvn || submitting}
                />

                <p className="zk-help">
                  Your BVN is submitted securely for verification.
                  It remains pending until the provider confirms
                  the result.
                </p>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={
                    !canSubmitBvn ||
                    submitting ||
                    missingFields.length > 0
                  }
                >
                  {submitting
                    ? 'Submitting...'
                    : bvnStatus === 'pending'
                      ? 'Verification pending'
                      : bvnStatus === 'verified'
                        ? 'BVN verified'
                        : 'Submit BVN'}
                </button>
              </form>
            </section>

            {/* Tier 2 */}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">2</div>

                <div>
                  <h2>Identity Verification</h2>
                  <p>
                    Government-issued ID and facial verification.
                  </p>
                </div>
              </div>

              <StatusBadge status={idStatus} />

              <TierLimits tier={2} />

              {idStatus === 'rejected' &&
                kyc.id_rejection_reason && (
                  <div className="zk-alert error">
                    <strong>Reason:</strong>{' '}
                    {kyc.id_rejection_reason}
                  </div>
                )}

              {bvnStatus !== 'verified' && (
                <div className="zk-note">
                  Complete Tier 1 verification before submitting
                  your identity documents.
                </div>
              )}

              <form onSubmit={submitTier2}>
                <label
                  className="zk-label"
                  htmlFor="zk-document-type"
                >
                  ID document type
                </label>

                <select
                  id="zk-document-type"
                  className="zk-select"
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value)
                  }
                  disabled={!canSubmitTier2 || submitting}
                >
                  <option value="national_id">
                    National ID
                  </option>

                  <option value="nin">
                    NIN slip
                  </option>

                  <option value="drivers_license">
                    Driver's licence
                  </option>

                  <option value="international_passport">
                    International passport
                  </option>

                  <option value="voters_card">
                    Voter's card
                  </option>
                </select>

                <label
                  className="zk-label"
                  htmlFor="zk-document-number"
                >
                  ID document number
                </label>

                <input
                  id="zk-document-number"
                  className="zk-input"
                  type="text"
                  autoComplete="off"
                  placeholder="Enter your document number"
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(event.target.value)
                  }
                  disabled={!canSubmitTier2 || submitting}
                />

                <label
                  className="zk-label"
                  htmlFor="zk-front"
                >
                  Front of ID document *
                </label>

                <input
                  ref={frontRef}
                  id="zk-front"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) =>
                    setFrontFile(
                      event.target.files?.[0] || null
                    )
                  }
                  disabled={!canSubmitTier2 || submitting}
                />

                <p className="zk-help">
                  Upload a clear image or PDF of your ID.
                </p>

                {documentType !==
                  'international_passport' && (
                  <>
                    <label
                      className="zk-label"
                      htmlFor="zk-back"
                    >
                      Back of ID document *
                    </label>

                    <input
                      ref={backRef}
                      id="zk-back"
                      className="zk-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(event) =>
                        setBackFile(
                          event.target.files?.[0] || null
                        )
                      }
                      disabled={
                        !canSubmitTier2 || submitting
                      }
                    />
                  </>
                )}

                <label
                  className="zk-label"
                  htmlFor="zk-selfie"
                >
                  Facial verification selfie *
                </label>

                <input
                  ref={tier2SelfieRef}
                  id="zk-selfie"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setTier2Selfie(
                      event.target.files?.[0] || null
                    )
                  }
                  disabled={!canSubmitTier2 || submitting}
                />

                <p className="zk-help">
                  Choose a clear face photo without sunglasses
                  or anything covering your face.
                </p>

                <div className="zk-note">
                  A selfie upload alone does not prove liveness.
                  Genuine live facial verification must be
                  completed through an integrated verification
                  process before approval.
                </div>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={!canSubmitTier2 || submitting}
                >
                  {submitting
                    ? 'Submitting...'
                    : idStatus === 'pending'
                      ? 'Verification pending'
                      : idStatus === 'verified'
                        ? 'Identity verified'
                        : 'Submit Identity Documents'}
                </button>
              </form>
            </section>

            {/* Tier 3 */}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">3</div>

                <div>
                  <h2>Address Verification</h2>
                  <p>
                    Submit proof of your Nigerian residential
                    address.
                  </p>
                </div>
              </div>

              <StatusBadge status={tier3Status} />

              <TierLimits tier={3} />

              {tier3Status === 'rejected' &&
                kyc.tier_3_rejection_reason && (
                  <div className="zk-alert error">
                    <strong>Reason:</strong>{' '}
                    {kyc.tier_3_rejection_reason}
                  </div>
                )}

              {idStatus !== 'verified' && (
                <div className="zk-note">
                  Complete and verify Tier 2 before submitting
                  Tier 3.
                </div>
              )}

              <form onSubmit={submitTier3}>
                <label className="zk-label">
                  Proof-of-address method
                </label>

                <div className="zk-methods">
                  <button
                    type="button"
                    className={`zk-method ${
                      tier3Method === 'bank_statement'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setTier3Method('bank_statement');
                      setAddressDocumentType('');
                    }}
                    disabled={
                      !canSubmitTier3 || submitting
                    }
                  >
                    <strong>Bank statement</strong>
                    <span>
                      Bank-issued statement showing your
                      residential address.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`zk-method ${
                      tier3Method === 'utility_bill'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setTier3Method('utility_bill');
                      setAddressDocumentType('');
                    }}
                    disabled={
                      !canSubmitTier3 || submitting
                    }
                  >
                    <strong>Utility bill</strong>
                    <span>
                      Electricity, water, or other eligible
                      household utility bill.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`zk-method ${
                      tier3Method === 'proof_of_address'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setTier3Method('proof_of_address');
                      setAddressDocumentType('');
                    }}
                    disabled={
                      !canSubmitTier3 || submitting
                    }
                  >
                    <strong>Other proof</strong>
                    <span>
                      Tenancy agreement or another accepted
                      address document.
                    </span>
                  </button>
                </div>

                <label
                  className="zk-label"
                  htmlFor="zk-address-type"
                >
                  Type of address document *
                </label>

                <select
                  id="zk-address-type"
                  className="zk-select"
                  value={addressDocumentType}
                  onChange={(event) =>
                    setAddressDocumentType(event.target.value)
                  }
                  disabled={!canSubmitTier3 || submitting}
                >
                  <option value="">
                    Select document type
                  </option>

                  {tier3Method === 'bank_statement' && (
                    <>
                      <option value="bank_statement">
                        Bank statement
                      </option>
                    </>
                  )}

                  {tier3Method === 'utility_bill' && (
                    <>
                      <option value="electricity_bill">
                        Electricity bill
                      </option>

                      <option value="water_bill">
                        Water bill
                      </option>

                      <option value="waste_bill">
                        Waste management bill
                      </option>

                      <option value="internet_bill">
                        Fixed-line or internet bill
                      </option>
                    </>
                  )}

                  {tier3Method === 'proof_of_address' && (
                    <>
                      <option value="tenancy_agreement">
                        Tenancy or rent agreement
                      </option>

                      <option value="property_tax">
                        Property tax or assessment document
                      </option>

                      <option value="government_letter">
                        Government-issued address letter
                      </option>

                      <option value="other_official">
                        Other official proof of address
                      </option>
                    </>
                  )}
                </select>

                <p className="zk-help">
                  Choose the document type that matches the
                  actual document you will upload. Documents
                  must show your name and Nigerian residential
                  address and be accepted by the verification
                  provider.
                </p>

                <label
                  className="zk-label"
                  htmlFor="zk-address-document"
                >
                  Proof-of-address document (PDF) *
                </label>

                <input
                  ref={addressRef}
                  id="zk-address-document"
                  className="zk-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setAddressFile(
                      event.target.files?.[0] || null
                    )
                  }
                  disabled={!canSubmitTier3 || submitting}
                />

                <p className="zk-help">
                  Upload the actual PDF document, not a link.
                </p>

                <label
                  className="zk-label"
                  htmlFor="zk-tier3-selfie"
                >
                  Facial verification selfie *
                </label>

                <input
                  ref={tier3SelfieRef}
                  id="zk-tier3-selfie"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setTier3Selfie(
                      event.target.files?.[0] || null
                    )
                  }
                  disabled={!canSubmitTier3 || submitting}
                />

                <p className="zk-help">
                  Select a clear face photo without sunglasses
                  or anything covering your face.
                </p>

                <div className="zk-note">
                  A static selfie upload is not a genuine
                  liveness check. Live facial verification
                  must be completed through an integrated
                  verification process before approval.
                </div>

                <div className="zk-note">
                  The document type selection helps the
                  customer identify the document. The existing
                  backend currently receives the verification
                  method and uploaded PDF, but does not yet
                  process this additional document subtype.
                  The backend must be updated before the
                  subtype can be used for automated checks.
                </div>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={!canSubmitTier3 || submitting}
                >
                  {submitting
                    ? 'Submitting...'
                    : tier3Status === 'pending'
                      ? 'Verification pending'
                      : tier3Status === 'verified'
                        ? 'Address verified'
                        : 'Submit Proof of Address'}
                </button>
              </form>
            </section>

            {/* Verification Summary */}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">✓</div>

                <div>
                  <h2>Verification Status</h2>
                  <p>
                    Your identity verification progress.
                  </p>
                </div>
              </div>

              {statusRow(
                'Tier 1 — BVN',
                'Bank Verification Number',
                bvnStatus
              )}

              {statusRow(
                'Tier 2 — Identity',
                'Government-issued ID and facial checks',
                idStatus
              )}

              {statusRow(
                'Tier 3 — Address',
                'Proof of Nigerian residential address',
                tier3Status
              )}
            </section>
          </>
        )}

        <footer className="zk-footer">
          Zenimonies Banking · Secure identity verification
        </footer>
      </main>
    </div>
  );
};

export default KYC;
