

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


const GREEN = '#2855F5';
const DARK_GREEN = '#193FC4';

const styles = `
  * {
    box-sizing: border-box;
  }

  .zk-page {
    min-height: 100vh;
    padding: 30px 20px 60px;
    background: #F3F5FA;
    color: #172033;
    font-family: Inter, -apple-system, BlinkMacSystemFont,
      "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
  }

  .zk-container {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }

  /* HEADER */

  .zk-hero {
    position: relative;
    overflow: hidden;
    padding: 38px;
    margin-bottom: 26px;
    color: #FFFFFF;
    background: linear-gradient(135deg, #172033 0%, #253D78 60%, #2855F5 100%);
    border-radius: 24px;
    box-shadow: 0 14px 40px rgba(28, 52, 115, .14);
  }

  .zk-hero::after {
    content: "";
    position: absolute;
    width: 260px;
    height: 260px;
    right: -90px;
    top: -120px;
    border-radius: 50%;
    background: rgba(255,255,255,.07);
    pointer-events: none;
  }

  .zk-brand {
    margin-bottom: 14px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2px;
    opacity: .8;
  }

  .zk-hero h1 {
    position: relative;
    z-index: 1;
    margin: 0;
    font-size: clamp(30px, 5vw, 46px);
    font-weight: 850;
    line-height: 1.15;
    letter-spacing: -1.5px;
  }

  .zk-hero p {
    position: relative;
    z-index: 1;
    max-width: 570px;
    margin: 16px 0 0;
    color: #DCE5FF;
    font-size: 16px;
    line-height: 1.75;
  }

  .zk-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .zk-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 15px;
    color: white;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 750;
    backdrop-filter: blur(8px);
  }

  /* CARDS */

  .zk-card {
    padding: 30px;
    margin-bottom: 24px;
    background: #FFFFFF;
    border: 1px solid #E2E6EF;
    border-radius: 24px;
    box-shadow: 0 8px 30px rgba(23, 32, 51, .035);
    transition: box-shadow .2s ease;
  }

  .zk-card:hover {
    box-shadow: 0 12px 38px rgba(23, 32, 51, .055);
  }

  .zk-card-heading {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .zk-number {
    display: grid;
    flex: 0 0 48px;
    width: 48px;
    height: 48px;
    place-items: center;
    color: ${GREEN};
    background: #EDF2FF;
    border: 1px solid #DFE8FF;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 850;
  }

  .zk-card h2 {
    margin: 0;
    color: #172033;
    font-size: clamp(20px, 3vw, 26px);
    font-weight: 850;
    line-height: 1.3;
    letter-spacing: -.5px;
  }

  .zk-card-heading p {
    margin: 7px 0 0;
    color: #667085;
    font-size: 14px;
    line-height: 1.7;
  }

  /* STATUS BADGES */

  .zk-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 15px;
    margin: 0 0 18px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    text-transform: capitalize;
  }

  .zk-status.pending {
    color: #946200;
    background: #FFF5D8;
    border: 1px solid #F5DF9F;
  }

  .zk-status.verified {
    color: #067647;
    background: #E8F8EF;
    border: 1px solid #BCE8CE;
  }

  .zk-status.rejected {
    color: #B42318;
    background: #FEF0EF;
    border: 1px solid #F6CECB;
  }

  .zk-status.not-submitted {
    color: #475467;
    background: #F0F2F5;
    border: 1px solid #E2E5EA;
  }

  /* ACCOUNT STATISTICS */

  .zk-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin: 20px 0;
  }

  .zk-stat {
    min-width: 0;
    padding: 22px;
    background: #F8F9FC;
    border: 1px solid #E5E8F0;
    border-radius: 18px;
  }

  .zk-stat-label {
    margin-bottom: 12px;
    color: #667085;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .5px;
    line-height: 1.5;
    text-transform: uppercase;
  }

  .zk-stat-value {
    color: #172033;
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 850;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .zk-stat-sub {
    margin-top: 8px;
    color: #667085;
    font-size: 12px;
  }

  /* FORMS */

  .zk-label {
    display: block;
    margin: 22px 0 10px;
    color: #344054;
    font-size: 14px;
    font-weight: 800;
  }

  .zk-input,
  .zk-select {
    display: block;
    width: 100%;
    min-height: 58px;
    padding: 15px 18px;
    color: #172033;
    background: #FFFFFF;
    border: 1.5px solid #D0D5DD;
    border-radius: 15px;
    outline: none;
    font: inherit;
    font-size: 15px;
    transition: border-color .2s, box-shadow .2s;
  }

  .zk-input::placeholder {
    color: #98A2B3;
  }

  .zk-input:focus,
  .zk-select:focus {
    border-color: ${GREEN};
    box-shadow: 0 0 0 4px rgba(40,85,245,.1);
  }

  .zk-input:disabled,
  .zk-select:disabled {
    background: #F2F4F7;
    color: #98A2B3;
    cursor: not-allowed;
  }

  .zk-input[type="file"] {
    min-height: 70px;
    padding: 18px;
    background: #F9FAFC;
    border: 1.5px dashed #AAB5C9;
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
  }

  .zk-input[type="file"]:hover {
    border-color: ${GREEN};
    background: #F3F6FF;
  }

  .zk-help {
    margin: 9px 0 0;
    color: #667085;
    font-size: 13px;
    line-height: 1.8;
  }

  /* DOCUMENT METHODS */

  .zk-methods {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 16px 0 22px;
  }

  .zk-method {
    min-width: 0;
    padding: 20px;
    color: #172033;
    text-align: left;
    background: #FFFFFF;
    border: 1.5px solid #D0D5DD;
    border-radius: 17px;
    cursor: pointer;
    font: inherit;
    transition: border-color .2s, background .2s, transform .2s;
  }

  .zk-method:hover:not(:disabled) {
    border-color: ${GREEN};
    transform: translateY(-2px);
  }

  .zk-method strong {
    display: block;
    margin-bottom: 10px;
    font-size: 15px;
    font-weight: 850;
    line-height: 1.5;
  }

  .zk-method span {
    display: block;
    color: #667085;
    font-size: 13px;
    line-height: 1.7;
  }

  .zk-method.selected {
    padding: 19px;
    background: #F1F5FF;
    border: 2px solid ${GREEN};
    box-shadow: 0 0 0 3px rgba(40,85,245,.06);
  }

  .zk-method:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  /* BUTTONS */

  .zk-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 58px;
    padding: 16px 24px;
    margin-top: 24px;
    color: #FFFFFF;
    background: ${GREEN};
    border: 1px solid ${GREEN};
    border-radius: 15px;
    font: inherit;
    font-size: 15px;
    font-weight: 850;
    cursor: pointer;
    transition: background .2s, box-shadow .2s, transform .2s;
  }

  .zk-button:hover:not(:disabled) {
    background: ${DARK_GREEN};
    box-shadow: 0 8px 22px rgba(40,85,245,.2);
    transform: translateY(-1px);
  }

  .zk-button:focus-visible {
    outline: 3px solid #A5B8FF;
    outline-offset: 3px;
  }

  .zk-button:disabled {
    opacity: .5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  /* ALERTS AND SECURITY NOTICES */

  .zk-alert {
    padding: 18px 20px;
    margin-bottom: 22px;
    color: #805B10;
    background: #FFFAEB;
    border: 1px solid #F5D98A;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }

  .zk-alert.error {
    color: #912018;
    background: #FEF3F2;
    border-color: #F4C7C3;
  }

  .zk-alert.success {
    color: #067647;
    background: #ECFDF3;
    border-color: #ABEFC6;
  }

  .zk-note {
    padding: 18px 20px;
    margin-top: 18px;
    color: #475467;
    background: #F3F6FF;
    border: 1px solid #D8E2FF;
    border-radius: 16px;
    font-size: 13px;
    line-height: 1.8;
  }

  /* TIER LIMITS */

  .zk-tier-limits {
    padding: 22px;
    margin: 20px 0;
    background: #F8F9FC;
    border: 1px solid #E1E6F0;
    border-radius: 18px;
  }

  .zk-tier-limits h3 {
    margin: 0 0 14px;
    color: #344054;
    font-size: 16px;
    font-weight: 850;
  }

  .zk-tier-limit-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 15px 0;
    border-bottom: 1px solid #E4E7EC;
    font-size: 14px;
  }

  .zk-tier-limit-row:last-child {
    border-bottom: 0;
  }

  .zk-tier-limit-row span {
    color: #667085;
    line-height: 1.6;
  }

  .zk-tier-limit-row strong {
    color: #172033;
    text-align: right;
    font-weight: 850;
  }

  .zk-progress {
    height: 8px;
    margin: 16px 0 0;
    overflow: hidden;
    background: #E4E7EC;
    border-radius: 999px;
  }

  .zk-progress > div {
    height: 100%;
    background: linear-gradient(90deg, #2855F5, #7391FF);
    border-radius: inherit;
    transition: width .3s ease;
  }

  /* VERIFICATION SUMMARY */

  .zk-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 0;
    border-bottom: 1px solid #EAECF0;
  }

  .zk-status-row:last-child {
    border-bottom: 0;
  }

  .zk-status-row strong {
    display: block;
    color: #172033;
    font-size: 15px;
    font-weight: 850;
  }

  .zk-status-row small {
    display: block;
    margin-top: 6px;
    color: #667085;
    font-size: 13px;
    line-height: 1.6;
  }

  .zk-footer {
    margin: 32px 0 0;
    color: #98A2B3;
    text-align: center;
    font-size: 12px;
    line-height: 1.7;
  }

  /* TABLET AND MOBILE */

  @media (max-width: 700px) {
    .zk-page {
      padding: 20px 14px 45px;
    }

    .zk-hero {
      padding: 28px 24px;
      border-radius: 22px;
    }

    .zk-hero h1 {
      font-size: 32px;
      letter-spacing: -.8px;
    }

    .zk-hero p {
      font-size: 15px;
    }

    .zk-card {
      padding: 24px 20px;
      margin-bottom: 18px;
      border-radius: 20px;
    }

    .zk-card h2 {
      font-size: 21px;
    }

    .zk-grid {
      gap: 10px;
    }

    .zk-stat {
      padding: 17px;
      border-radius: 15px;
    }

    .zk-stat-value {
      font-size: 21px;
    }

    .zk-methods {
      grid-template-columns: 1fr;
    }

    .zk-method {
      padding: 18px;
    }

    .zk-method.selected {
      padding: 17px;
    }
  }

  @media (max-width: 400px) {
    .zk-page {
      padding: 14px 10px 35px;
    }

    .zk-hero {
      padding: 23px 19px;
    }

    .zk-hero h1 {
      font-size: 28px;
    }

    .zk-card {
      padding: 20px 15px;
    }

    .zk-card-heading {
      gap: 12px;
    }

    .zk-number {
      flex-basis: 40px;
      width: 40px;
      height: 40px;
      border-radius: 13px;
    }

    .zk-card h2 {
      font-size: 19px;
    }

    .zk-grid {
      grid-template-columns: 1fr;
    }

    .zk-stat-value {
      font-size: 23px;
    }

    .zk-tier-limits {
      padding: 17px;
    }

    .zk-tier-limit-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .zk-tier-limit-row strong {
      text-align: left;
    }

    .zk-status-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-card,
    .zk-button,
    .zk-method,
    .zk-progress > div {
      transition: none;
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
