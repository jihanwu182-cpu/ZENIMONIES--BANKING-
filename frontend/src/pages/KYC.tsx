
import React, { useEffect, useRef, useState } from 'react';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type KycStatus = 'not submitted' | 'pending' | 'verified' | 'rejected';

type KycData = {
  status?: string;
  tier?: number;
  submitted_tier?: number;
  bvn_status?: string;
  bvn_verified?: boolean;
  id_status?: string;
  id_verified?: boolean;
  tier_3_status?: string;
  tier_3_verified?: boolean;
  tier_3_method?: string;
  rejection_reason?: string;
  bvn_rejection_reason?: string;
  id_rejection_reason?: string;
  tier_3_rejection_reason?: string;
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

const styles = `
  * { box-sizing: border-box; }

  .zk-page {
    min-height: 100vh;
    background: #F4F8F5;
    color: #172B21;
    padding: 20px 14px 36px;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, Arial, sans-serif;
    font-size: 14px;
  }

  .zk-container {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
  }

  .zk-hero {
    background: linear-gradient(135deg, #075C35, #087A43);
    color: #fff;
    border-radius: 18px;
    padding: 24px 22px;
    margin-bottom: 18px;
  }

  .zk-brand {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.6px;
    opacity: .8;
    margin-bottom: 9px;
  }

  .zk-hero h1 {
    margin: 0;
    font-size: clamp(24px, 5vw, 32px);
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -.7px;
  }

  .zk-hero p {
    margin: 10px 0 0;
    max-width: 530px;
    color: #E2F1E8;
    font-size: 14px;
    line-height: 1.65;
  }

  .zk-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 17px;
  }

  .zk-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    background: #EAF4EE;
    color: #24523A;
    white-space: nowrap;
  }

  .zk-hero .zk-pill {
    background: rgba(255,255,255,.15);
    color: #fff;
    border: 1px solid rgba(255,255,255,.15);
  }

  .zk-alert {
    border: 1px solid #F0D48B;
    background: #FFF9E9;
    color: #755019;
    padding: 13px 15px;
    border-radius: 12px;
    line-height: 1.55;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .zk-alert.error {
    border-color: #F1C6C6;
    background: #FFF1F1;
    color: #922D2D;
  }

  .zk-alert.success {
    border-color: #B9DEC8;
    background: #ECF8F0;
    color: #17623A;
  }

  .zk-card {
    background: #fff;
    border: 1px solid #DDE9E0;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 3px 14px rgba(25, 65, 42, .035);
  }

  .zk-card-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 15px;
  }

  .zk-number {
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    background: #EAF4EE;
    color: ${GREEN};
    font-size: 15px;
    font-weight: 800;
  }

  .zk-card h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -.3px;
    line-height: 1.35;
    color: #172B21;
  }

  .zk-card-heading p {
    margin: 4px 0 0;
    color: #68776D;
    font-size: 13px;
    line-height: 1.55;
  }

  .zk-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 11px;
    font-size: 12px;
    font-weight: 800;
    margin: 0 0 16px;
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
    gap: 10px;
    margin: 14px 0;
  }

  .zk-stat {
    background: #F5F8F6;
    border: 1px solid #E1EAE4;
    border-radius: 12px;
    padding: 13px 14px;
    min-width: 0;
  }

  .zk-stat-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .7px;
    color: #69786E;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .zk-stat-value {
    font-size: clamp(16px, 4vw, 21px);
    line-height: 1.25;
    font-weight: 800;
    color: ${DARK_GREEN};
    overflow-wrap: anywhere;
  }

  .zk-stat-sub {
    margin-top: 5px;
    color: #7A877F;
    font-size: 11px;
  }

  .zk-label {
    display: block;
    font-size: 13px;
    font-weight: 750;
    color: #263B2F;
    margin: 15px 0 7px;
  }

  .zk-input, .zk-select {
    display: block;
    width: 100%;
    min-height: 46px;
    border: 1px solid #D4E0D7;
    border-radius: 10px;
    padding: 11px 13px;
    background: #fff;
    color: #172B21;
    font: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }

  .zk-input:focus, .zk-select:focus {
    border-color: ${GREEN};
    box-shadow: 0 0 0 3px rgba(8,122,67,.10);
  }

  .zk-input[type="file"] {
    padding: 9px;
    background: #F8FAF8;
    font-size: 12px;
  }

  .zk-help {
    font-size: 12px;
    line-height: 1.55;
    color: #718076;
    margin: 7px 0 0;
  }

  .zk-methods {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
    margin: 12px 0 16px;
  }

  .zk-method {
    text-align: left;
    border: 1px solid #DDE8E0;
    background: #fff;
    border-radius: 11px;
    padding: 12px 11px;
    cursor: pointer;
    color: #263B2F;
    font: inherit;
    transition: .15s;
  }

  .zk-method strong {
    display: block;
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 4px;
  }

  .zk-method span {
    display: block;
    font-size: 11px;
    color: #718076;
    line-height: 1.45;
  }

  .zk-method.selected {
    border: 2px solid ${GREEN};
    background: #F0F8F3;
    padding: 11px 10px;
  }

  .zk-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 46px;
    border: 1px solid ${GREEN};
    border-radius: 10px;
    background: ${GREEN};
    color: white;
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    padding: 12px 16px;
    cursor: pointer;
    margin-top: 16px;
    transition: background .15s, transform .15s;
  }

  .zk-button:hover:not(:disabled) {
    background: ${DARK_GREEN};
  }

  .zk-button:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .zk-button.secondary {
    color: ${GREEN};
    background: #fff;
  }

  .zk-button.secondary:hover:not(:disabled) {
    background: #F0F8F3;
  }

  .zk-button.small {
    width: auto;
    min-height: 40px;
    padding: 10px 14px;
    margin-top: 10px;
    font-size: 13px;
  }

  .zk-divider {
    border: 0;
    border-top: 1px solid #E5ECE7;
    margin: 18px 0;
  }

  .zk-note {
    border: 1px solid #DCE9E0;
    background: #F5F9F6;
    border-radius: 11px;
    padding: 13px 14px;
    color: #5F7065;
    font-size: 12px;
    line-height: 1.6;
    margin-top: 14px;
  }

  .zk-progress {
    height: 7px;
    background: #E7EEE9;
    border-radius: 999px;
    overflow: hidden;
    margin: 10px 0 5px;
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
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid #E8EEE9;
  }

  .zk-status-row:last-of-type {
    border-bottom: 0;
  }

  .zk-status-row strong {
    display: block;
    font-size: 13px;
    color: #263B2F;
  }

  .zk-status-row small {
    display: block;
    margin-top: 4px;
    color: #718076;
    font-size: 12px;
    line-height: 1.5;
  }

  .zk-footer {
    text-align: center;
    color: #829087;
    font-size: 11px;
    margin: 22px 0 0;
  }

  @media (max-width: 520px) {
    .zk-page { padding: 12px 10px 26px; }
    .zk-hero { padding: 20px 17px; border-radius: 15px; }
    .zk-card { padding: 16px; border-radius: 14px; }
    .zk-card h2 { font-size: 17px; }
    .zk-grid { gap: 8px; }
    .zk-stat { padding: 11px; }
    .zk-methods { grid-template-columns: 1fr; }
    .zk-method { padding: 12px; }
    .zk-method.selected { padding: 11px; }
    .zk-status-row { align-items: flex-start; }
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

const normalizeStatus = (value?: string | boolean): KycStatus => {
  if (value === true) return 'verified';
  if (value === false || !value) return 'not submitted';

  const normalized = String(value).toLowerCase().replace(/[_-]/g, ' ').trim();

  if (normalized.includes('verified') || normalized === 'approved' ||
      normalized === 'success' || normalized === 'successful') {
    return 'verified';
  }

  if (normalized.includes('reject') || normalized.includes('fail') ||
      normalized.includes('declin')) {
    return 'rejected';
  }

  if (normalized.includes('pending') || normalized.includes('review') ||
      normalized.includes('processing') || normalized.includes('submitted')) {
    return 'pending';
  }

  return 'not submitted';
};

const StatusBadge = ({ status }: { status: KycStatus }) => (
  <span className={`zk-status ${status.replace(/\s/g, '-')}`}>
    <span aria-hidden="true">
      {status === 'verified' ? '✓' :
        status === 'pending' ? '◷' :
          status === 'rejected' ? '!' : '○'}
    </span>
    {status === 'not submitted' ? 'Not submitted' :
      status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

const KYC: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState('');
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info'>('info');

  const [user, setUser] = useState<KycResponse['user']>({});
  const [kyc, setKyc] = useState<KycData>({});

  const [bvn, setBvn] = useState('');
  const [documentType, setDocumentType] = useState('national_id');
  const [documentNumber, setDocumentNumber] = useState('');
  const [tier3Method, setTier3Method] = useState('bank_statement');

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    '';

  const requestHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${token}`,
  });

  const fetchStatus = async (showMessage = false) => {
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
        throw new Error(result.message || 'Unable to load verification status.');
      }

      const payload = result.data || result;
      setUser(payload.user || {});
      setKyc(payload.kyc || {});

      if (showMessage) {
        setAlert('Your verification status has been refreshed.');
        setAlertType('success');
      }
    } catch (error) {
      setAlert(getErrorMessage(error));
      setAlertType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Initial status load only.
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

  const approvedTier = Number(kyc.tier || 0);
  const submittedTier = Number(kyc.submitted_tier || 0);

  const accountLimit =
    kyc.account_limit !== undefined
      ? kyc.account_limit
      : approvedTier === 0 ? 50000
        : approvedTier === 1 ? 200000
          : approvedTier === 2 ? 500000 : null;

  const dailyLimit =
    kyc.daily_transfer_limit !== undefined
      ? kyc.daily_transfer_limit
      : approvedTier === 0 ? 25000
        : approvedTier === 1 ? 50000
          : approvedTier === 2 ? 200000 : 5000000;

  const dailyUsed = Number(kyc.daily_transfer_used || 0);

  const dailyRemaining =
    kyc.daily_transfer_remaining !== undefined
      ? Number(kyc.daily_transfer_remaining)
      : dailyLimit === null
        ? null
        : Math.max(0, Number(dailyLimit || 0) - dailyUsed);

  const missingFields =
    kyc.missing_profile_fields || kyc.missingProfileFields || [];

  const canSubmitBvn =
    bvnStatus !== 'pending' && bvnStatus !== 'verified';

  const canSubmitTier2 =
    bvnStatus === 'verified' &&
    idStatus !== 'pending' &&
    idStatus !== 'verified';

  const canSubmitTier3 =
    idStatus === 'verified' &&
    tier3Status !== 'pending' &&
    tier3Status !== 'verified';

  const submitBvn = async (event: React.FormEvent) => {
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
        throw new Error(result.message || 'BVN submission failed.');
      }

      setAlert(
        result.message ||
        'Your BVN has been submitted. Your verification status will update when the verification provider responds.'
      );
      setAlertType('success');
      setBvn('');
      await fetchStatus();
    } catch (error) {
      setAlert(getErrorMessage(error));
      setAlertType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier2 = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert('');

    if (!documentNumber.trim()) {
      setAlert('Enter your government-issued ID document number.');
      setAlertType('error');
      return;
    }

    if (!frontFile) {
      setAlert('Please upload the front of your identity document.');
      setAlertType('error');
      return;
    }

    if (documentType !== 'international_passport' && !backFile) {
      setAlert('Please upload the back of your identity document.');
      setAlertType('error');
      return;
    }

    if (!selfieFile) {
      setAlert('Please select a clear selfie for identity verification.');
      setAlertType('error');
      return;
    }

    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('document_number', documentNumber.trim());
    formData.append('document_front', frontFile);

    if (backFile) {
      formData.append('document_back', backFile);
    }

    formData.append('selfie', selfieFile);

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/kyc/tier-2`, {
        method: 'POST',
        headers: requestHeaders(),
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Tier 2 submission failed.');
      }

      setAlert(
        result.message ||
        'Your identity documents have been submitted for verification. Your account will remain pending until an authoritative verification result is received.'
      );
      setAlertType('success');

      setDocumentNumber('');
      setFrontFile(null);
      setBackFile(null);
      setSelfieFile(null);

      if (frontRef.current) frontRef.current.value = '';
      if (backRef.current) backRef.current.value = '';
      if (selfieRef.current) selfieRef.current.value = '';

      await fetchStatus();
    } catch (error) {
      setAlert(getErrorMessage(error));
      setAlertType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier3 = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert('');

    if (!addressFile) {
      setAlert('Please select your proof-of-address document.');
      setAlertType('error');
      return;
    }

    if (addressFile.type !== 'application/pdf') {
      setAlert('Please upload your proof-of-address document as a PDF.');
      setAlertType('error');
      return;
    }

    const formData = new FormData();
    formData.append('tier_3_method', tier3Method);
    formData.append('tier_3_document', addressFile);

    // The current backend expects a selfie for Tier 3 as well.
    // This is a static selfie upload, not a genuine liveness check.
    if (selfieFile) {
      formData.append('tier_3_selfie', selfieFile);
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/kyc/tier-3`, {
        method: 'POST',
        headers: requestHeaders(),
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Tier 3 submission failed.');
      }

      setAlert(
        result.message ||
        'Your proof-of-address document has been submitted for review. Tier 3 remains pending until verification is completed.'
      );
      setAlertType('success');

      setAddressFile(null);
      if (addressRef.current) addressRef.current.value = '';

      await fetchStatus();
    } catch (error) {
      setAlert(getErrorMessage(error));
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
        <section className="zk-hero">
          <div className="zk-brand">ZENIMONIES BANKING</div>
          <h1>Identity Verification</h1>
          <p>
            Complete your identity checks to access the account and transfer
            limits available for your approved verification level.
          </p>

          <div className="zk-hero-pills">
            <span className="zk-pill">🔒 Secure verification</span>
            <span className="zk-pill">Current tier: {approvedTier}</span>
          </div>
        </section>

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
            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">✓</div>
                <div>
                  <h2>Current Verification</h2>
                  <p>Your current KYC level and account limits.</p>
                </div>
              </div>

              <StatusBadge status={overallStatus} />

              <div className="zk-grid">
                <div className="zk-stat">
                  <div className="zk-stat-label">Approved tier</div>
                  <div className="zk-stat-value">{approvedTier}</div>
                  <div className="zk-stat-sub">
                    Submitted tier: {submittedTier}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">Account limit</div>
                  <div className="zk-stat-value">
                    {money(accountLimit)}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">Daily transfer limit</div>
                  <div className="zk-stat-value">
                    {money(dailyLimit)}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">Daily transfers used</div>
                  <div className="zk-stat-value">
                    {money(dailyUsed)}
                  </div>
                </div>

                <div className="zk-stat" style={{ gridColumn: '1 / -1' }}>
                  <div className="zk-stat-label">
                    Daily transfer remaining
                  </div>
                  <div className="zk-stat-value">
                    {dailyRemaining === null
                      ? 'Unlimited'
                      : money(dailyRemaining)}
                  </div>

                  {dailyLimit !== null && Number(dailyLimit) > 0 && (
                    <div className="zk-progress">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (dailyUsed / Number(dailyLimit)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="zk-button secondary"
                disabled={submitting}
                onClick={() => fetchStatus(true)}
              >
                Refresh verification status
              </button>
            </section>

            {missingFields.length > 0 && (
              <div className="zk-alert">
                <strong>Complete your personal information first.</strong>
                <br />
                The following profile information is missing:
                {' '}{missingFields.join(', ')}.
                <br />
                Please update your personal information in your profile before
                submitting your BVN.
              </div>
            )}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">1</div>
                <div>
                  <h2>BVN Verification</h2>
                  <p>
                    Verify your account using your Nigerian Bank Verification
                    Number.
                  </p>
                </div>
              </div>

              <StatusBadge status={bvnStatus} />

              {bvnStatus === 'rejected' && kyc.bvn_rejection_reason && (
                <div className="zk-alert error">
                  <strong>Reason:</strong> {kyc.bvn_rejection_reason}
                </div>
              )}

              <form onSubmit={submitBvn}>
                <label className="zk-label" htmlFor="zk-bvn">
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
                    setBvn(event.target.value.replace(/\D/g, '').slice(0, 11))
                  }
                  disabled={!canSubmitBvn || submitting}
                />

                <p className="zk-help">
                  Your BVN is submitted securely for verification. Your
                  verification remains pending until the provider confirms
                  the result.
                </p>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={!canSubmitBvn || submitting}
                >
                  {submitting ? 'Submitting...' :
                    bvnStatus === 'pending'
                      ? 'BVN verification pending'
                      : bvnStatus === 'verified'
                        ? 'BVN verified'
                        : 'Submit BVN'}
                </button>
              </form>
            </section>

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">2</div>
                <div>
                  <h2>ID + Facial Verification</h2>
                  <p>
                    Submit a government-issued identity document and a clear
                    selfie for identity review.
                  </p>
                </div>
              </div>

              <StatusBadge status={idStatus} />

              {idStatus === 'rejected' && kyc.id_rejection_reason && (
                <div className="zk-alert error">
                  <strong>Reason:</strong> {kyc.id_rejection_reason}
                </div>
              )}

              {bvnStatus !== 'verified' && (
                <div className="zk-note">
                  Complete and verify Tier 1 before submitting Tier 2.
                </div>
              )}

              <form onSubmit={submitTier2}>
                <label className="zk-label" htmlFor="zk-document-type">
                  ID document type
                </label>

                <select
                  id="zk-document-type"
                  className="zk-select"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  disabled={!canSubmitTier2 || submitting}
                >
                  <option value="national_id">National ID</option>
                  <option value="nin">NIN slip</option>
                  <option value="drivers_license">Driver's licence</option>
                  <option value="international_passport">
                    International passport
                  </option>
                  <option value="voters_card">Voter's card</option>
                </select>

                <label className="zk-label" htmlFor="zk-document-number">
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

                <label className="zk-label" htmlFor="zk-front">
                  Front of ID document *
                </label>

                <input
                  ref={frontRef}
                  id="zk-front"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) =>
                    setFrontFile(event.target.files?.[0] || null)
                  }
                  disabled={!canSubmitTier2 || submitting}
                />

                <p className="zk-help">
                  Upload a clear image or PDF of the front of your
                  government-issued ID.
                </p>

                {documentType !== 'international_passport' && (
                  <>
                    <label className="zk-label" htmlFor="zk-back">
                      Back of ID document *
                    </label>

                    <input
                      ref={backRef}
                      id="zk-back"
                      className="zk-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(event) =>
                        setBackFile(event.target.files?.[0] || null)
                      }
                      disabled={!canSubmitTier2 || submitting}
                    />
                  </>
                )}

                <label className="zk-label" htmlFor="zk-selfie">
                  Facial verification selfie *
                </label>

                <input
                  ref={selfieRef}
                  id="zk-selfie"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setSelfieFile(event.target.files?.[0] || null)
                  }
                  disabled={!canSubmitTier2 || submitting}
                />

                <p className="zk-help">
                  Use a clear photo of your face without sunglasses, masks,
                  or anything covering your face. Uploading a selfie alone
                  does not establish live facial verification.
                </p>

                <div className="zk-note">
                  Your ID and selfie must be reviewed and verified before
                  your Tier 2 status can change to verified.
                </div>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={!canSubmitTier2 || submitting}
                >
                  {submitting ? 'Submitting...' :
                    idStatus === 'pending'
                      ? 'Tier 2 verification pending'
                      : idStatus === 'verified'
                        ? 'Tier 2 verified'
                        : 'Submit Tier 2 Verification'}
                </button>
              </form>
            </section>

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">3</div>
                <div>
                  <h2>Address Verification</h2>
                  <p>
                    Submit one accepted proof-of-address document for review.
                  </p>
                </div>
              </div>

              <StatusBadge status={tier3Status} />

              {tier3Status === 'rejected' &&
                kyc.tier_3_rejection_reason && (
                  <div className="zk-alert error">
                    <strong>Reason:</strong> {kyc.tier_3_rejection_reason}
                  </div>
                )}

              {idStatus !== 'verified' && (
                <div className="zk-note">
                  Complete and verify Tier 2 before submitting Tier 3.
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
                      tier3Method === 'bank_statement' ? 'selected' : ''
                    }`}
                    onClick={() => setTier3Method('bank_statement')}
                    disabled={!canSubmitTier3 || submitting}
                  >
                    <strong>Bank statement</strong>
                    <span>Recent statement showing your residential address.</span>
                  </button>

                  <button
                    type="button"
                    className={`zk-method ${
                      tier3Method === 'utility_bill' ? 'selected' : ''
                    }`}
                    onClick={() => setTier3Method('utility_bill')}
                    disabled={!canSubmitTier3 || submitting}
                  >
                    <strong>Utility bill</strong>
                    <span>Recent eligible utility bill showing your address.</span>
                  </button>

                  <button
                    type="button"
                    className={`zk-method ${
                      tier3Method === 'proof_of_address' ? 'selected' : ''
                    }`}
                    onClick={() => setTier3Method('proof_of_address')}
                    disabled={!canSubmitTier3 || submitting}
                  >
                    <strong>Other proof</strong>
                    <span>Another accepted document showing your address.</span>
                  </button>
                </div>

                <label className="zk-label" htmlFor="zk-address-document">
                  Proof-of-address document (PDF) *
                </label>

                <input
                  ref={addressRef}
                  id="zk-address-document"
                  className="zk-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setAddressFile(event.target.files?.[0] || null)
                  }
                  disabled={!canSubmitTier3 || submitting}
                />

                <p className="zk-help">
                  Upload the actual PDF document. Screenshots and ordinary
                  photos are not accepted by this form.
                </p>

                <label className="zk-label" htmlFor="zk-tier3-selfie">
                  Facial verification selfie
                </label>

                <input
                  ref={selfieRef}
                  id="zk-tier3-selfie"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setSelfieFile(event.target.files?.[0] || null)
                  }
                  disabled={!canSubmitTier3 || submitting}
                />

                <p className="zk-help">
                  If required by the verification process, select a clear
                  selfie. A static image upload is not a genuine liveness
                  check.
                </p>

                <div className="zk-note">
                  Only one proof-of-address document is required. Your
                  submission remains pending until the verification result
                  is confirmed.
                </div>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={!canSubmitTier3 || submitting}
                >
                  {submitting ? 'Submitting...' :
                    tier3Status === 'pending'
                      ? 'Tier 3 verification pending'
                      : tier3Status === 'verified'
                        ? 'Tier 3 verified'
                        : 'Submit Tier 3 Verification'}
                </button>
              </form>
            </section>

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">✓</div>
                <div>
                  <h2>Verification Status</h2>
                  <p>Review the status of each verification requirement.</p>
                </div>
              </div>

              {statusRow(
                'Tier 1 — BVN verification',
                'Your BVN must be confirmed by the verification provider.',
                bvnStatus
              )}

              {statusRow(
                'Tier 2 — Identity verification',
                'Your identity document and required verification must be approved.',
                idStatus
              )}

              {statusRow(
                'Tier 3 — Address verification',
                'Your proof-of-address submission must be reviewed and approved.',
                tier3Status
              )}

              <button
                type="button"
                className="zk-button secondary"
                disabled={submitting}
                onClick={() => fetchStatus(true)}
              >
                Refresh verification status
              </button>
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
