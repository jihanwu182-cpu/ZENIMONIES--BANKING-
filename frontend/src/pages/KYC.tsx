import React, { useEffect, useRef, useState } from 'react';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const DOJAH_APP_ID = process.env.REACT_APP_DOJAH_APP_ID || '';
const DOJAH_PUBLIC_KEY = process.env.REACT_APP_DOJAH_PUBLIC_KEY || '';
const DOJAH_WIDGET_ID = process.env.REACT_APP_DOJAH_WIDGET_ID || '';

type KycStatus =
  | 'not submitted'
  | 'pending'
  | 'verified'
  | 'rejected';

type DojahWidgetOptions = {
  app_id: string;
  p_key: string;
  type: string;
  config: { widget_id: string };
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
  kyc?: KycData;
  data?: {
    reference_id?: string;
    reference?: string;
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
.zk-page {
  min-height: 100vh;
  padding: 18px 14px 35px;
  background: #F5F7F5;
  color: #172033;
  font-family: Inter, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

.zk-container {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

/* Compact green header */

.zk-hero {
  padding: 19px 20px;
  margin-bottom: 15px;
  color: #fff;
  background: ${GREEN};
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(23,107,69,.08);
}

.zk-brand {
  margin-bottom: 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
  opacity: .85;
}

.zk-hero h1 {
  margin: 0;
  font-size: clamp(22px, 4vw, 27px);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -.4px;
}

.zk-hero p {
  margin: 8px 0 0;
  color: #E3F4E9;
  font-size: 12px;
  line-height: 1.6;
}

.zk-hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.zk-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  color: #fff;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

/* Small current account status card */

.zk-current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 15px;
  margin-bottom: 15px;
  background: #EAF5EE;
  border: 1px solid #CDE5D5;
  border-radius: 12px;
}

.zk-current-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.zk-current-icon {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #fff;
  background: ${GREEN};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 800;
}

.zk-current-title {
  color: #28553D;
  font-size: 11px;
  font-weight: 700;
}

.zk-current-subtitle {
  margin-top: 3px;
  color: #667568;
  font-size: 10px;
}

.zk-current-badge {
  flex-shrink: 0;
  padding: 6px 10px;
  color: #176B45;
  background: #fff;
  border: 1px solid #CDE5D5;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

/* Cards */

.zk-card {
  padding: 18px;
  margin-bottom: 15px;
  background: #fff;
  border: 1px solid #E2EAE4;
  border-radius: 15px;
  box-shadow: 0 3px 12px rgba(23,32,51,.025);
}

.zk-card-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 13px;
}

.zk-number {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  place-items: center;
  color: ${GREEN};
  background: #E7F4EC;
  border: 1px solid #D2E9DA;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 800;
}

.zk-card h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.zk-card-heading p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

/* Verification status badges */

.zk-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  margin: 3px 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 750;
}

.zk-status.verified {
  color: #176B45;
  background: #E8F5ED;
}

.zk-status.pending {
  color: #946200;
  background: #FFF5D9;
}

.zk-status.rejected {
  color: #B42318;
  background: #FEECEB;
}

.zk-status.not-submitted {
  color: #667085;
  background: #F0F2F4;
}

/* Small limits panel */

.zk-tier-limits {
  padding: 12px 13px;
  margin: 10px 0 15px;
  background: #F7FAF8;
  border: 1px solid #E1EAE3;
  border-radius: 11px;
}

.zk-tier-limits h3 {
  margin: 0 0 9px;
  color: ${GREEN};
  font-size: 12px;
  font-weight: 800;
}

.zk-tier-limit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid #E8EEE9;
  font-size: 11px;
}

.zk-tier-limit-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.zk-tier-limit-row span {
  color: #667085;
}

.zk-tier-limit-row strong {
  color: #172033;
  text-align: right;
  font-size: 12px;
  font-weight: 800;
}

/* Forms */

.zk-label {
  display: block;
  margin: 13px 0 6px;
  color: #344054;
  font-size: 12px;
  font-weight: 750;
}

.zk-input,
.zk-select {
  display: block;
  width: 100%;
  min-height: 43px;
  padding: 10px 12px;
  color: #172033;
  background: #fff;
  border: 1px solid #D0D5DD;
  border-radius: 10px;
  font: inherit;
  font-size: 13px;
  box-sizing: border-box;
}

.zk-input:focus,
.zk-select:focus {
  outline: 2px solid rgba(23,107,69,.15);
  border-color: ${GREEN};
}

.zk-input:disabled,
.zk-select:disabled {
  background: #F2F4F5;
  cursor: not-allowed;
  opacity: .65;
}

.zk-help {
  margin: 7px 0 10px;
  color: #667085;
  font-size: 11px;
  line-height: 1.65;
}

.zk-button,
.zk-dojah-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 43px;
  padding: 11px 15px;
  margin-top: 14px;
  color: #fff;
  background: ${GREEN};
  border: 1px solid ${GREEN};
  border-radius: 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background .15s ease;
}

.zk-button:hover:not(:disabled),
.zk-dojah-button:hover:not(:disabled) {
  background: ${DARK_GREEN};
}

.zk-button:disabled,
.zk-dojah-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* Informational messages */

.zk-note {
  padding: 12px 13px;
  margin: 12px 0;
  color: #475467;
  background: #F0F7F2;
  border: 1px solid #D9EADF;
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.7;
}

.zk-alert {
  padding: 12px 14px;
  margin-bottom: 14px;
  color: #344054;
  background: #F0F7F2;
  border: 1px solid #D9EADF;
  border-radius: 11px;
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.zk-alert.error {
  color: #912018;
  background: #FEF3F2;
  border-color: #FECDCA;
}

.zk-alert.success {
  color: #176B45;
  background: #ECFDF3;
  border-color: #ABEFC6;
}

/* Tier 3 document choices */

.zk-methods {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin: 9px 0 12px;
}

.zk-method {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  width: 100%;
  padding: 12px;
  text-align: left;
  color: #344054;
  background: #fff;
  border: 1px solid #D0D5DD;
  border-radius: 10px;
  cursor: pointer;
}

.zk-method strong {
  color: #172033;
  font-size: 12px;
}

.zk-method span {
  color: #667085;
  font-size: 11px;
  line-height: 1.5;
}

.zk-method.selected {
  background: #F0F7F2;
  border: 1px solid ${GREEN};
}

.zk-method:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.zk-footer {
  padding: 12px 0;
  color: #98A2B3;
  text-align: center;
  font-size: 10px;
}

@media (min-width: 540px) {
  .zk-methods {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .zk-page {
    padding: 12px 10px 28px;
  }

  .zk-hero {
    padding: 18px 16px;
    margin-bottom: 12px;
    border-radius: 13px;
  }

  .zk-hero h1 {
    font-size: 23px;
  }

  .zk-card {
    padding: 15px 13px;
    margin-bottom: 12px;
    border-radius: 13px;
  }

  .zk-card h2 {
    font-size: 17px;
  }

  .zk-current {
    padding: 10px 11px;
  }

  .zk-current-badge {
    font-size: 10px;
    padding: 5px 8px;
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
    ['verified', 'approved', 'success', 'successful'].includes(
      normalized
    )
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
  tier: 1 | 2 | 3;
}) => (
  <div className="zk-tier-limits">
    <h3>Tier {tier} account limits</h3>

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

  const [dojahScriptReady, setDojahScriptReady] = useState(
    typeof window !== 'undefined' &&
      typeof window.Connect === 'function'
  );

  const [alert, setAlert] = useState('');
  const [alertType, setAlertType] = useState<
    'error' | 'success' | 'info'
  >('info');

  const [kyc, setKyc] = useState<KycData>({});

  const [bvn, setBvn] = useState('');
  const [documentType, setDocumentType] =
    useState('national_id');
  const [documentNumber, setDocumentNumber] = useState('');
  const [tier3Method, setTier3Method] =
    useState('bank_statement');
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

  // Load the official identity verification widget.
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
      setAlert(
        'Unable to load secure verification. Please try again later.'
      );
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
    kyc.tier_3_verified === true
      ? true
      : kyc.tier_3_status
  );

  const approvedTier = Math.min(
    3,
    Math.max(0, Number(kyc.tier || 0))
  ) as 0 | 1 | 2 | 3;

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

  // Start secure identity verification using a
  // server-generated reference.
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
        'Secure verification is not configured. Please contact Zenimonies support.'
      );
      setAlertType('error');
      return;
    }

    const Connect = window.Connect;

    if (!Connect) {
      setAlert(
        'Secure verification is still loading. Please try again.'
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
            'Unable to start secure verification.'
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
                'Your verification result has been received. Your account status will reflect the server-confirmed result.'
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
            'Secure verification could not be completed. Please try again.'
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
          : 'Unable to start secure verification.'
      );
      setAlertType('error');
      setDojahLoading(false);
    }
  };

  // Tier 1: BVN submission.
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

  // Tier 2: Manual identity document submission.
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

  // Tier 3: Address verification.
  const submitTier3 = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert('');

    if (!addressDocumentType) {
      setAlert(
        'Please select the type of address document.'
      );
      setAlertType('error');
      return;
    }

    if (!addressFile) {
      setAlert(
        'Please select your proof-of-address document.'
      );
      setAlertType('error');
      return;
    }

    if (addressFile.type !== 'application/pdf') {
      setAlert(
        'Please upload your proof of address as a PDF.'
      );
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

      if (addressRef.current) {
        addressRef.current.value = '';
      }

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

  return (
    <div className="zk-page">
      <style>{styles}</style>

      <main className="zk-container">
        {/* ZENIMONIES HEADER */}

        <section className="zk-hero">
          <div className="zk-brand">
            ZENIMONIES BANKING
          </div>

          <h1>Identity Verification</h1>

          <p>
            Verify your identity securely to unlock additional
            account features and transfer limits.
          </p>

          <div className="zk-hero-pills">
            <span className="zk-pill">
              🔒 Secure verification
            </span>

            <span className="zk-pill">
              Account security
            </span>
          </div>
        </section>

        {/* SMALL GREEN STATUS CARD */}

        {!loading && (
          <section className="zk-current">
            <div className="zk-current-left">
              <div className="zk-current-icon">
                ✓
              </div>

              <div>
                <div className="zk-current-title">
                  Account verification
                </div>

                <div className="zk-current-subtitle">
                  Your current approved verification level
                </div>
              </div>
            </div>

            <div className="zk-current-badge">
              {approvedTier === 0
                ? 'Unverified'
                : `Tier ${approvedTier}`}
            </div>
          </section>
        )}

        {/* ALERTS */}

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
            {/* MISSING PROFILE INFORMATION */}

            {missingFields.length > 0 && (
              <div className="zk-alert">
                <strong>
                  Complete your personal information
                </strong>

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

            {/* TIER 1: BVN */}

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
                  disabled={
                    !canSubmitBvn || submitting
                  }
                />

                <p className="zk-help">
                  Your BVN is submitted securely for
                  verification. It remains pending until
                  the verification result is confirmed.
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

            {/* TIER 2: IDENTITY VERIFICATION */}

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
                  Complete Tier 1 verification before
                  submitting your identity documents.
                </div>
              )}

              {/* SECURE IDENTITY VERIFICATION */}

              <div className="zk-note">
                <strong>
                  Secure identity verification
                </strong>

                <br />

                Verify your identity and complete facial
                verification securely to upgrade your account.
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
                  ? 'Starting secure verification...'
                  : !dojahScriptReady
                    ? 'Loading secure verification...'
                    : 'Verify my identity'}
              </button>

              {/* ALTERNATIVE: MANUAL ID DOCUMENT UPLOAD */}

              <div className="zk-note">
                <strong>
                  Alternative verification method
                </strong>

                <br />

                You can also submit your government-issued
                ID documents and selfie using the form below.
              </div>

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
                  disabled={
                    !canSubmitTier2 || submitting
                  }
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
                  disabled={
                    !canSubmitTier2 || submitting
                  }
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
                  disabled={
                    !canSubmitTier2 || submitting
                  }
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
                  disabled={
                    !canSubmitTier2 || submitting
                  }
                />

                <p className="zk-help">
                  Choose a clear face photo without sunglasses
                  or anything covering your face.
                </p>

                <div className="zk-note">
                  A selfie upload alone does not prove liveness.
                  Genuine live facial verification must be
                  confirmed through the integrated verification
                  process before approval.
                </div>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={
                    !canSubmitTier2 || submitting
                  }
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

            {/* TIER 3: ADDRESS VERIFICATION */}

            <section className="zk-card">
              <div className="zk-card-heading">
                <div className="zk-number">3</div>

                <div>
                  <h2>Address Verification</h2>

                  <p>
                    Submit proof of your residential address.
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
                  Complete and verify Tier 2 before
                  submitting Tier 3.
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
                      disabled={
                        !canSubmitTier3 || submitting
                      }
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
                    setAddressDocumentType(
                      event.target.value
                    )
                  }
                  disabled={
                    !canSubmitTier3 || submitting
                  }
                >
                  <option value="">
                    Select document type
                  </option>

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
                    setAddressFile(
                      event.target.files?.[0] || null
                    )
                  }
                  disabled={
                    !canSubmitTier3 || submitting
                  }
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
                  disabled={
                    !canSubmitTier3 || submitting
                  }
                />

                <div className="zk-note">
                  A static selfie upload is not a genuine
                  liveness check. Live facial verification
                  must be completed through an integrated
                  verification process before approval.
                </div>

                <button
                  className="zk-button"
                  type="submit"
                  disabled={
                    !canSubmitTier3 || submitting
                  }
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
