import React, { useEffect, useRef, useState } from 'react';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const DOJAH_APP_ID =
  process.env.REACT_APP_DOJAH_APP_ID || '';

const DOJAH_PUBLIC_KEY =
  process.env.REACT_APP_DOJAH_PUBLIC_KEY || '';

const DOJAH_WIDGET_ID =
  process.env.REACT_APP_DOJAH_WIDGET_ID || '';

type DojahWidgetOptions = {
  app_id: string;
  p_key: string;
  type: string;
  config: {
    widget_id: string;
  };
  reference_id: string;
  metadata?: Record<string, string>;
  onSuccess: (response: unknown) => void;
  onError: (error: unknown) => void;
  onClose: () => void;
};

type DojahConnectInstance = {
  setup: () => void;
  open: () => void;
};

declare global {
  interface Window {
    Connect?: new (
      options: DojahWidgetOptions
    ) => DojahConnectInstance;
  }
}

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
  reference_id?: string;
  reference?: string;
  user?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  kyc?: KycData;
  data?: {
    reference_id?: string;
    reference?: string;
    user?: KycResponse['user'];
    kyc?: KycData;
  };
};

type TierLimit = {
  account: number | null;
  daily: number | null;
};

const TIER_LIMITS: Record<0 | 1 | 2 | 3, TierLimit> = {
  0: { account: 50000, daily: 25000 },
  1: { account: 200000, daily: 50000 },
  2: { account: 500000, daily: 200000 },
  3: { account: null, daily: 5000000 },
};

const GREEN = '#176B45';
const DARK_GREEN = '#105536';

const styles = `
.zk-page{
  min-height:100vh;
  padding:20px 16px 45px;
  background:#F5F7F5;
  color:#172033;
  font-family:Inter,-apple-system,BlinkMacSystemFont,
  "Segoe UI",Roboto,Arial,sans-serif;
  font-size:15px;
  -webkit-font-smoothing:antialiased
}

.zk-container{
  width:100%;
  max-width:760px;
  margin:0 auto
}

.zk-hero{
  position:relative;
  overflow:hidden;
  padding:24px 26px;
  margin-bottom:20px;
  color:#fff;
  background:#176B45;
  border-radius:16px;
  box-shadow:0 5px 16px rgba(23,107,69,.10)
}

.zk-brand{
  margin-bottom:10px;
  font-size:10px;
  font-weight:800;
  letter-spacing:1.5px;
  opacity:.85
}

.zk-hero h1{
  position:relative;
  z-index:1;
  margin:0;
  font-size:clamp(23px,4vw,30px);
  font-weight:800;
  line-height:1.25;
  letter-spacing:-.5px
}

.zk-hero p{
  position:relative;
  z-index:1;
  max-width:500px;
  margin:10px 0 0;
  color:#E3F4E9;
  font-size:13px;
  line-height:1.65
}

.zk-hero-pills{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:14px
}

.zk-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:7px 11px;
  color:#fff;
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.2);
  border-radius:999px;
  font-size:11px;
  font-weight:700
}

.zk-card{
  padding:22px;
  margin-bottom:18px;
  background:#fff;
  border:1px solid #E2EAE4;
  border-radius:17px;
  box-shadow:0 4px 18px rgba(23,32,51,.025)
}

.zk-card-heading{
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:16px
}

.zk-number{
  display:grid;
  flex:0 0 38px;
  width:38px;
  height:38px;
  place-items:center;
  color:#176B45;
  background:#E7F4EC;
  border:1px solid #D2E9DA;
  border-radius:12px;
  font-size:15px;
  font-weight:800
}

.zk-card h2{
  margin:0;
  color:#172033;
  font-size:clamp(18px,3vw,22px);
  font-weight:800;
  line-height:1.3
}

.zk-card-heading p{
  margin:5px 0 0;
  color:#667085;
  font-size:13px;
  line-height:1.6
}

.zk-dojah-button{
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  min-height:44px;
  padding:11px 16px;
  margin:12px 0;
  color:#fff;
  background:#176B45;
  border:1px solid #176B45;
  border-radius:11px;
  font:inherit;
  font-size:13px;
  font-weight:750;
  cursor:pointer
}

.zk-dojah-button:hover:not(:disabled){
  background:#105536
}

.zk-dojah-button:disabled{
  opacity:.5;
  cursor:not-allowed
}

.zk-note{
  padding:13px 15px;
  margin-top:14px;
  color:#475467;
  background:#F0F7F2;
  border:1px solid #D9EADF;
  border-radius:12px;
  font-size:12px;
  line-height:1.7
}

@media(max-width:600px){
  .zk-page{
    padding:14px 11px 35px
  }

  .zk-hero{
    padding:20px 18px;
    margin-bottom:15px;
    border-radius:14px
  }

  .zk-hero h1{
    font-size:25px
  }

  .zk-card{
    padding:18px 15px;
    margin-bottom:15px;
    border-radius:15px
  }

  .zk-card h2{
    font-size:19px
  }

  .zk-number{
    flex-basis:35px;
    width:35px;
    height:35px;
    border-radius:10px
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
    ['verified', 'approved', 'success', 'successful']
      .includes(normalized)
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
}) => (
  <div className="zk-tier-limits">
    <h3>Limits unlocked at Tier {tier}</h3>
    <div className="zk-tier-limit-row">
      <span>Maximum account balance</span>
      <strong>{money(TIER_LIMITS[tier].account)}</strong>
    </div>
    <div className="zk-tier-limit-row">
      <span>Daily transfer limit</span>
      <strong>{money(TIER_LIMITS[tier].daily)}</strong>
    </div>
  </div>
);

const KYC: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dojahLoading, setDojahLoading] = useState(false);
  const [dojahReference, setDojahReference] = useState('');
  const [dojahScriptReady, setDojahScriptReady] = useState(
    typeof window !== 'undefined' &&
      typeof window.Connect === 'function'
  );

  const [alert, setAlert] = useState('');
  const [alertType, setAlertType] = useState<
    'error' | 'success' | 'info'
  >('info');

  const [user, setUser] = useState<KycResponse['user']>({});
  const [kyc, setKyc] = useState<KycData>({});

  const [bvn, setBvn] = useState('');
  const [documentType, setDocumentType] = useState('national_id');
  const [documentNumber, setDocumentNumber] = useState('');
  const [tier3Method, setTier3Method] = useState('bank_statement');
  const [addressDocumentType, setAddressDocumentType] = useState('');

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [tier2Selfie, setTier2Selfie] = useState<File | null>(null);
  const [tier3Selfie, setTier3Selfie] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

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

  // Load Dojah's official widget script.
  useEffect(() => {
    if (typeof window.Connect === 'function') {
      setDojahScriptReady(true);
      return;
    }

    const src = 'https://widget.dojah.io/widget.js';

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    const alreadyExists = Boolean(script);

    if (!script) {
      script = document.createElement('script');
      script.src = src;
      script.async = true;
    }

    const currentScript = script;

    const onLoad = () => {
      setDojahScriptReady(
        typeof window.Connect === 'function'
      );
    };

    const onError = () => {
      setDojahScriptReady(false);
      setAlert('Unable to load the Dojah verification widget.');
      setAlertType('error');
    };

    currentScript.addEventListener('load', onLoad);
    currentScript.addEventListener('error', onError);

    if (!alreadyExists) {
      document.body.appendChild(currentScript);
    } else if (typeof window.Connect === 'function') {
      onLoad();
    }

    return () => {
      currentScript.removeEventListener('load', onLoad);
      currentScript.removeEventListener('error', onError);
    };
  }, []);

  const fetchStatus = async () => {
    if (!token) {
      setAlert('Please sign in to view your verification status.');
      setAlertType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/kyc/status`, {
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
  ) as 0 | 1 | 2 | 3;

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
    bvnStatus !== 'pending' && bvnStatus !== 'verified';

  const canSubmitTier2 =
    bvnStatus === 'verified' &&
    idStatus !== 'pending' &&
    idStatus !== 'verified';

  const canSubmitTier3 =
    idStatus === 'verified' &&
    tier3Status !== 'pending' &&
    tier3Status !== 'verified';

  // Start a server-generated Dojah verification session.
  const startDojahVerification = async () => {
    setAlert('');

    if (!token) {
      setAlert('Please sign in again before verification.');
      setAlertType('error');
      return;
    }

    if (
      !DOJAH_APP_ID ||
      !DOJAH_PUBLIC_KEY ||
      !DOJAH_WIDGET_ID
    ) {
      setAlert(
        'Dojah is not configured. Please contact Zenimonies support.'
      );
      setAlertType('error');
      return;
    }

    const Connect = window.Connect;

    if (!Connect) {
      setAlert(
        'The Dojah widget is still loading. Please try again.'
      );
      setAlertType('error');
      return;
    }

    setDojahLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/kyc/dojah/start`,
        {
          method: 'POST',
          headers: {
            ...requestHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verification_type: 'tier_2',
          }),
        }
      );

      const result: KycResponse = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            'Unable to start Dojah verification.'
        );
      }

      const reference =
        result.reference_id ||
        result.reference ||
        result.data?.reference_id ||
        result.data?.reference;

      if (!reference) {
        throw new Error(
          'The server did not return a verification reference.'
        );
      }

      setDojahReference(reference);

      const connect = new Connect({
        app_id: DOJAH_APP_ID,
        p_key: DOJAH_PUBLIC_KEY,
        type: 'custom',
        config: {
          widget_id: DOJAH_WIDGET_ID,
        },
        reference_id: reference,
        metadata: {
          service: 'zenimonies_tier_2',
        },

        onSuccess: async (_widgetResponse: unknown) => {
          setDojahLoading(true);
          setAlert(
            'Verification submitted. Confirming your result securely...'
          );
          setAlertType('info');

          try {
            const confirmResponse = await fetch(
              `${API_BASE}/kyc/dojah/confirm`,
              {
                method: 'POST',
                headers: {
                  ...requestHeaders(),
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  reference_id: reference,
                }),
              }
            );

            const confirmResult: KycResponse =
              await confirmResponse.json();

            if (
              !confirmResponse.ok ||
              confirmResult.success === false
            ) {
              throw new Error(
                confirmResult.message ||
                  'The verification result is not yet confirmed.'
              );
            }

            setAlert(
              confirmResult.message ||
                'Dojah verification result received. Your account status will reflect the server-confirmed result.'
            );

            setAlertType('success');
            await fetchStatus();
          } catch (error) {
            setAlert(
              error instanceof Error
                ? error.message
                : 'Unable to confirm the verification result.'
            );
            setAlertType('error');
          } finally {
            setDojahLoading(false);
          }
        },

        onError: (_error: unknown) => {
          setAlert(
            'Dojah verification could not be completed. Please try again.'
          );
          setAlertType('error');
          setDojahLoading(false);
        },

        onClose: () => {
          setDojahLoading(false);
        },
      });

      connect.setup();
      connect.open();
    } catch (error) {
      setAlert(
        error instanceof Error
          ? error.message
          : 'Unable to start Dojah verification.'
      );
      setAlertType('error');
      setDojahLoading(false);
    }
  };

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

  const submitTier2 = async (event: React.FormEvent) => {
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
    formData.append('document_number', documentNumber.trim());
    formData.append('document_front', frontFile);

    if (backFile) {
      formData.append('document_back', backFile);
    }

    formData.append('selfie', tier2Selfie);

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/kyc/tier-2`, {
        method: 'POST',
        headers: requestHeaders(),
        body: formData,
      });

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

  const submitTier3 = async (event: React.FormEvent) => {
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
    formData.append('tier_3_method', tier3Method);
    formData.append('tier_3_document', addressFile);
    formData.append('tier_3_selfie', tier3Selfie);

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/kyc/tier-3`, {
        method: 'POST',
        headers: requestHeaders(),
        body: formData,
      });

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
        <section className="zk-hero">
          <div className="zk-brand">ZENIMONIES BANKING</div>
          <h1>Identity Verification</h1>
          <p>
            Verify your identity securely to access the account
            features and transfer limits available to you.
          </p>
          <div className="zk-hero-pills">
            <span className="zk-pill">🔒 Secure verification</span>
            <span className="zk-pill">
              Tier {approvedTier} approved
            </span>
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
            Loading your verification details...
          </section>
        ) : (
          <>
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
                  <div className="zk-stat-label">Approved tier</div>
                  <div className="zk-stat-value">
                    {approvedTier}
                  </div>
                  <div className="zk-stat-sub">
                    Submitted: Tier {submittedTier}
                  </div>
                </div>

                <div className="zk-stat">
                  <div className="zk-stat-label">Account limit</div>
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

                <div className="zk-stat" style={{ gridColumn: '1 / -1' }}>
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
                                (dailyUsed / Number(dailyLimit)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                </div>
              </div>

              <TierLimits tier={0} />
              <TierLimits tier={1} />
              <TierLimits tier={2} />
              <TierLimits tier={3} />
            </section>

            {missingFields.length > 0 && (
              <div className="zk-alert">
                <strong>Complete your personal information</strong>
                <br />
                Before submitting your BVN, update these missing
                profile details:
                <br />
                {missingFields.join(', ')}
                <br />
                Open your profile and complete the missing
                information before continuing.
              </div>
            )}

            {/* TIER 1 */}

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
                    setBvn(
                      event.target.value.replace(/\D/g, '').slice(0, 11)
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

            {/* TIER 2 */}

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

              {/* DOJAH LIVE VERIFICATION */}

              <div className="zk-note">
                <strong>Dojah secure verification</strong>
                <br />
                Complete the identity and facial verification
                process using the secure Dojah widget.
              </div>

              <button
                type="button"
                className="zk-dojah-button"
                onClick={startDojahVerification}
                disabled={
                  !canSubmitTier2 ||
                  submitting ||
                  dojahLoading ||
                  !dojahScriptReady
                }
              >
                {dojahLoading
                  ? 'Connecting to Dojah...'
                  : !dojahScriptReady
                    ? 'Loading secure verification...'
                    : 'Start Dojah Facial Verification'}
              </button>

              {dojahReference && (
                <p className="zk-help">
                  Verification reference: {dojahReference}
                </p>
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
                  <option value="national_id">National ID</option>
                  <option value="nin">NIN slip</option>
                  <option value="drivers_license">
                    Driver's licence
                  </option>
                  <option value="international_passport">
                    International passport
                  </option>
                  <option value="voters_card">Voter's card</option>
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
                  Upload a clear image or PDF of your ID.
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
                  ref={tier2SelfieRef}
                  id="zk-selfie"
                  className="zk-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setTier2Selfie(event.target.files?.[0] || null)
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
                  confirmed through the integrated verification
                  provider before approval.
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

            {/* TIER 3 */}

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
                  {[
                    {
                      value: 'bank_statement',
                      title: 'Bank statement',
                      description:
                        'Bank-issued statement showing your residential address.',
                    },
                    {
                      value: 'utility_bill',
                      title: 'Utility bill',
                      description:
                        'Electricity, water, or other eligible household utility bill.',
                    },
                    {
                      value: 'proof_of_address',
                      title: 'Other proof',
                      description:
                        'Tenancy agreement or another accepted address document.',
                    },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      className={`zk-method ${
                        tier3Method === method.value
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => {
                        setTier3Method(method.value);
                        setAddressDocumentType('');
                      }}
                      disabled={!canSubmitTier3 || submitting}
                    >
                      <strong>{method.title}</strong>
                      <span>{method.description}</span>
                    </button>
                  ))}
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
                  <option value="">Select document type</option>

                  {tier3Method === 'bank_statement' && (
                    <option value="bank_statement">
                      Bank statement
                    </option>
                  )}

                  {tier3Method === 'utility_bill' && (
                    <>
                      <option value="electricity_bill">
                        Electricity bill
                      </option>
                      <option value="water_bill">Water bill</option>
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
                  actual document you will upload.
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
                    setAddressFile(event.target.files?.[0] || null)
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
                    setTier3Selfie(event.target.files?.[0] || null)
                  }
                  disabled={!canSubmitTier3 || submitting}
                />

                <div className="zk-note">
                  A static selfie upload is not a genuine liveness
                  check. Live facial verification must be completed
                  through an integrated verification process
                  before approval.
                </div>

                <div className="zk-note">
                  The existing backend receives the verification
                  method and uploaded PDF. The selected document
                  subtype is not sent to the current endpoint.
                  Backend changes are required before it can be
                  used for automated checks.
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

            {/* VERIFICATION SUMMARY */}

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
