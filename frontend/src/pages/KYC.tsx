import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTheme } from '../theme/Theme.tsx';

// ============================================================
// ZENIMONIES BANKING — KYC
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const DOJAH_APP_ID =
  process.env.REACT_APP_DOJAH_APP_ID || '';

const DOJAH_PUBLIC_KEY =
  process.env.REACT_APP_DOJAH_PUBLIC_KEY || '';

const DOJAH_WIDGET_ID =
  process.env.REACT_APP_DOJAH_WIDGET_ID || '';

// ============================================================
// TYPES
// ============================================================

type KycStatus =
  | 'not submitted'
  | 'pending'
  | 'verified'
  | 'rejected';

type TierNumber = 0 | 1 | 2 | 3;

interface DojahWidgetOptions {
  app_id: string;
  p_key: string;
  type?: string;

  config?: {
    widget_id?: string;
  };

  reference_id?: string;

  metadata?: Record<string, unknown>;

  onSuccess?: (
    response: unknown
  ) => void;

  onError?: (
    error: unknown
  ) => void;

  onClose?: () => void;
}

interface DojahConnectInstance {
  setup?: () => void;
  open?: () => void;
  close?: () => void;
}

declare global {
  interface Window {
    Connect?: new (
      options: DojahWidgetOptions
    ) => DojahConnectInstance;
  }
}

interface KycData {
  status?: KycStatus | string;

  tier?: number;

  submitted_tier?: number;

  bvn_status?:
    | string
    | boolean;

  bvn_verified?: boolean;

  bvn_rejection_reason?: string;

  id_status?:
    | string
    | boolean;

  id_verified?: boolean;

  id_rejection_reason?: string;

  tier_3_status?:
    | string
    | boolean;
liveness_status?: string;
  tier_3_verified?: boolean;

  tier_3_method?: string;

  tier_3_rejection_reason?: string;

  rejection_reason?: string;

  missing_profile_fields?: string[];

  missingProfileFields?: string[];

  account_limit?: number | null;

  daily_transfer_limit?:
    | number
    | null;

  daily_transfer_used?:
    | number
    | null;

  daily_transfer_remaining?:
    | number
    | null;
}

interface KycResponse {
  success?: boolean;

  message?: string;

  data?: {
    kyc?: KycData;
  };

  kyc?: KycData;
}

interface TierLimit {
  account: number | null;
  daily: number | null;
}

// ============================================================
// TIER LIMITS
// ============================================================

const TIER_LIMITS: Record<
  TierNumber,
  TierLimit
> = {
  0: {
    account: 50000,
    daily: 20000,
  },

  1: {
    account: 300000,
    daily: 50000,
  },

  2: {
    account: 500000,
    daily: 200000,
  },

  3: {
    account: null,
    daily: 5000000,
  },
};

// ============================================================
// TIER 3 — PROOF OF ADDRESS
// ============================================================

const ADDRESS_DOCUMENT_OPTIONS = [
{
value: 'bank_statement',
label: 'Bank Statement',
description: 'Valid within the last 3 months',
},
{
value: 'utility_bill',
label: 'Electricity, waste or water bill',
description: 'Valid within the last 3 months',
},
{
value: 'tax_proof',
label: 'Proof of tax',
description: 'Valid within the last 3 months',
},
{
value: 'rent_receipt_or_agreement',
label: 'Rent receipt or Agreement',
description: 'Valid within the last 3 months',
},
];

// ============================================================
// HELPERS
// ============================================================

const money = (
  value:
    | number
    | null
    | undefined
) => {
  if (value === null) {
    return 'Unlimited';
  }

  if (
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return 'Not available';
  }

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }
  ).format(Number(value));
};

// ============================================================
// NORMALIZE STATUS
// ============================================================

const normalizeStatus = (
  value: unknown
): KycStatus => {
  if (value === true) {
    return 'verified';
  }

  if (
    value === false ||
    value === undefined ||
    value === null
  ) {
    return 'not submitted';
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      'verified'
    ) ||
    normalized.includes(
      'approved'
    ) ||
    normalized === 'success' ||
    normalized === 'completed'
  ) {
    return 'verified';
  }

  if (
    normalized.includes(
      'pending'
    ) ||
    normalized.includes(
      'processing'
    ) ||
    normalized.includes(
      'review'
    )
  ) {
    return 'pending';
  }

  if (
    normalized.includes(
      'reject'
    ) ||
    normalized.includes(
      'failed'
    ) ||
    normalized.includes(
      'declined'
    )
  ) {
    return 'rejected';
  }

  return 'not submitted';
};

// ============================================================
// CLAMP TIER
// ============================================================

const clampTier = (
  value: unknown
): TierNumber => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  if (number <= 0) {
    return 0;
  }

  if (number >= 3) {
    return 3;
  }

  return Math.floor(
    number
  ) as TierNumber;
};

// ============================================================
// STATUS BADGE
// ============================================================

const StatusBadge: React.FC<{
  status: KycStatus;
}> = ({ status }) => {
  const labels: Record<
    KycStatus,
    string
  > = {
    verified: 'Verified',
    pending: 'Pending',
    rejected: 'Rejected',
    'not submitted':
      'Not submitted',
  };

  const icons: Record<
    KycStatus,
    string
  > = {
    verified: '✓',
    pending: '◷',
    rejected: '!',
    'not submitted': '○',
  };

  return (
    <span
      className={`zk-status zk-status-${status
        .replace(/\s+/g, '-')
        .toLowerCase()}`}
    >
      <span className="zk-status-icon">
        {icons[status]}
      </span>

      {labels[status]}
    </span>
  );
};

// ============================================================
// TIER LIMITS
// ============================================================

const TierLimits: React.FC<{
  tier: TierNumber;
}> = ({ tier }) => {
  const limits =
    TIER_LIMITS[tier];

  return (
    <div className="zk-tier-limits">

      <div className="zk-tier-limit-row">

        <span className="zk-label">
          Account limit
        </span>

        <strong>
          {money(
            limits.account
          )}
        </strong>

      </div>

      <div className="zk-tier-limit-row">

        <span className="zk-label">
          Daily transfer limit
        </span>

        <strong>
          {money(
            limits.daily
          )}
        </strong>

      </div>

    </div>
  );
};

// ============================================================
// STYLES
// ============================================================

const buildStyles = (
  darkMode: boolean
) => {
  const c = darkMode
    ? {
        page: '#0d1712',
        card: '#101c16',
        soft: '#15231c',
        border: '#294238',
        divider: '#22372d',

        text: '#f3f8f5',
        secondary: '#a9b8b0',
        muted: '#82958b',

        input: '#15231c',

        green: '#079447',
        greenDark: '#006d3b',
        bright: '#25c477',

        successBg: '#0d2a1e',
        successBorder: '#1c4a35',
        successText: '#8de0ba',

        pendingBg: '#33270e',
        pendingText: '#f2c66d',

        rejectedBg: '#2a1517',
        rejectedBorder: '#5b292d',
        rejectedText: '#ffb4aa',

        neutralBg: '#1d2823',
        neutralText: '#82958b',

        warningBg: '#2c2513',
        warningBorder: '#51441e',
        warningText: '#f2d47d',
      }
    : {
        page: '#f6faf8',
        card: '#ffffff',
        soft: '#f7faf8',
        border: '#e7eee9',
        divider: '#edf2ef',

        text: '#14251e',
        secondary: '#7b8982',
        muted: '#98a49f',

        input: '#ffffff',

        green: '#079447',
        greenDark: '#006d3b',
        bright: '#0b995b',

        successBg: '#e9f8f1',
        successBorder: '#d4eee1',
        successText: '#087c43',

        pendingBg: '#fff5d9',
        pendingText: '#946200',

        rejectedBg: '#fff4f4',
        rejectedBorder: '#f0cccc',
        rejectedText: '#b42318',

        neutralBg: '#f1f4f2',
        neutralText: '#667085',

        warningBg: '#fff9e8',
        warningBorder: '#f1df9e',
        warningText: '#7a5b00',
      };

  return `
    .zk-page {
      min-height: 100vh;
      box-sizing: border-box;
      background: ${c.page};
      color: ${c.text};
      padding: 24px 16px 40px;
      transition:
        background-color .18s ease,
        color .18s ease;
    }

    .zk-container {
      width: 100%;
      max-width: 920px;
      margin: 0 auto;
    }

    .zk-hero {
      background: linear-gradient(
        135deg,
        ${c.greenDark},
        ${c.green}
      );
      color: #ffffff;
      border-radius: 24px;
      padding: 28px;
      margin-bottom: 18px;
      box-shadow:
        0 12px 30px
        rgba(0, 0, 0, .10);
    }

    .zk-brand {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .14em;
      margin-bottom: 10px;
      opacity: .9;
    }

    .zk-hero h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
      font-weight: 800;
    }

    .zk-hero p {
      margin: 10px 0 0;
      max-width: 680px;
      color: rgba(255,255,255,.88);
      line-height: 1.6;
      font-size: 14px;
    }

    .zk-hero-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }

    .zk-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 11px;
      border-radius: 999px;
      background: rgba(255,255,255,.13);
      border: 1px solid rgba(255,255,255,.18);
      font-size: 12px;
      font-weight: 700;
    }

    .zk-card {
      background: ${c.card};
      border: 1px solid ${c.border};
      border-radius: 20px;
      padding: 22px;
      margin-bottom: 16px;
      box-shadow:
        0 5px 18px
        rgba(0,0,0,.035);
      transition:
        background-color .18s ease,
        border-color .18s ease;
    }

    .zk-current {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .zk-current-left {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 0;
    }

    .zk-current-icon {
      width: 46px;
      height: 46px;
      flex: 0 0 46px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${c.green};
      color: #fff;
      font-size: 21px;
      font-weight: 800;
    }

    .zk-current-title {
      font-weight: 800;
      font-size: 15px;
      margin-bottom: 4px;
    }

    .zk-current-subtitle {
      color: ${c.secondary};
      font-size: 13px;
    }

    .zk-current-badge {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 800;
      padding: 7px 10px;
      border-radius: 999px;
      background: ${c.soft};
      color: ${c.green};
      border: 1px solid ${c.border};
    }

    .zk-card-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 17px;
    }

    .zk-card-heading-left {
      min-width: 0;
    }

    .zk-number {
      color: ${c.green};
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .zk-card h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.3;
      color: ${c.text};
    }

    .zk-card-heading p {
      margin: 6px 0 0;
      color: ${c.secondary};
      font-size: 13px;
      line-height: 1.55;
    }

    .zk-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      padding: 7px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
    }

    .zk-status-icon {
      font-weight: 900;
    }

    .zk-status-verified {
      background: ${c.successBg};
      border: 1px solid ${c.successBorder};
      color: ${c.successText};
    }

    .zk-status-pending {
      background: ${c.pendingBg};
      color: ${c.pendingText};
    }

    .zk-status-rejected {
      background: ${c.rejectedBg};
      border: 1px solid ${c.rejectedBorder};
      color: ${c.rejectedText};
    }

    .zk-status-not-submitted {
      background: ${c.neutralBg};
      color: ${c.neutralText};
    }

    .zk-tier-limits {
      background: ${c.soft};
      border: 1px solid ${c.border};
      border-radius: 14px;
      margin-bottom: 18px;
      overflow: hidden;
    }

    .zk-tier-limit-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 12px 14px;
    }

    .zk-tier-limit-row + .zk-tier-limit-row {
      border-top: 1px solid ${c.divider};
    }

    .zk-label {
      color: ${c.secondary};
      font-size: 13px;
    }

    .zk-tier-limit-row strong {
      color: ${c.text};
      font-size: 13px;
    }

    .zk-input,
    .zk-select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid ${c.border};
      background: ${c.input};
      color: ${c.text};
      border-radius: 12px;
      padding: 13px 14px;
      font-size: 14px;
      outline: none;
      transition:
        border-color .15s ease,
        box-shadow .15s ease,
        background-color .15s ease;
    }

    .zk-input:focus,
    .zk-select:focus {
      border-color: ${c.green};
      box-shadow:
        0 0 0 3px
        rgba(7,148,71,.12);
    }

    .zk-input::placeholder {
      color: ${c.muted};
    }

    .zk-input:disabled,
    .zk-select:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .zk-input[type="file"] {
      padding: 9px;
      cursor: pointer;
    }

    .zk-input[type="file"]::file-selector-button {
      border: 0;
      background: ${c.soft};
      color: ${c.text};
      border-radius: 9px;
      padding: 8px 10px;
      margin-right: 8px;
      font-weight: 700;
      cursor: pointer;
    }

    .zk-help {
      margin: 7px 0 0;
      color: ${c.secondary};
      font-size: 12px;
      line-height: 1.5;
    }

    .zk-field {
      margin-bottom: 15px;
    }

    .zk-field:last-child {
      margin-bottom: 0;
    }

    .zk-field-label {
      display: block;
      color: ${c.text};
      font-size: 13px;
      font-weight: 750;
      margin-bottom: 7px;
    }

    .zk-button {
      width: 100%;
      border: 0;
      border-radius: 12px;
      background: ${c.green};
      color: #fff;
      padding: 13px 16px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform .12s ease,
        opacity .12s ease,
        background .12s ease;
    }

    .zk-button:hover:not(:disabled) {
      background: ${c.greenDark};
    }

    .zk-button:active:not(:disabled) {
      transform: scale(.99);
    }

    .zk-button:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    .zk-dojah-button {
      background: ${c.green};
    }

    .zk-note {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      background: ${c.soft};
      border: 1px solid ${c.border};
      color: ${c.secondary};
      border-radius: 13px;
      padding: 12px 13px;
      margin: 13px 0;
      font-size: 12px;
      line-height: 1.55;
    }

    .zk-note-icon {
      color: ${c.green};
      font-weight: 900;
      flex-shrink: 0;
    }

    .zk-alert {
      border-radius: 13px;
      padding: 12px 14px;
      margin-bottom: 16px;
      font-size: 13px;
      line-height: 1.5;
      font-weight: 600;
    }

    .zk-alert-error {
      background: ${c.rejectedBg};
      color: ${c.rejectedText};
      border: 1px solid ${c.rejectedBorder};
    }

    .zk-alert-success {
      background: ${c.successBg};
      color: ${c.successText};
      border: 1px solid ${c.successBorder};
    }

    .zk-alert-warning {
      background: ${c.warningBg};
      color: ${c.warningText};
      border: 1px solid ${c.warningBorder};
    }

    .zk-methods {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .zk-method {
      text-align: left;
      border: 1px solid ${c.border};
      background: ${c.card};
      color: ${c.text};
      border-radius: 14px;
      padding: 13px;
      cursor: pointer;
      transition:
        border-color .15s ease,
        background .15s ease,
        box-shadow .15s ease;
    }

    .zk-method:hover {
      border-color: ${c.green};
    }

    .zk-method.selected {
      background: ${
        darkMode
          ? '#102c20'
          : '#e9f8f1'
      };
      border-color: ${c.green};
      box-shadow:
        0 0 0 1px ${c.green};
    }

    .zk-method-title {
      font-weight: 800;
      font-size: 13px;
      line-height: 1.35;
    }

    .zk-method-description {
      margin-top: 5px;
      color: ${c.secondary};
      font-size: 11px;
      line-height: 1.4;
    }

    .zk-proof-list {
      border: 1px solid ${c.border};
      border-radius: 15px;
      overflow: hidden;
      margin-bottom: 17px;
    }

    .zk-proof-item {
      width: 100%;
      border: 0;
      border-bottom: 1px solid ${c.divider};
      background: ${c.card};
      color: ${c.text};
      padding: 14px;
      text-align: left;
      cursor: pointer;
      display: block;
      transition:
        background .15s ease,
        border-color .15s ease;
    }

    .zk-proof-item:last-child {
      border-bottom: 0;
    }

    .zk-proof-item:hover {
      background: ${c.soft};
    }

    .zk-proof-item.selected {
      background: ${
        darkMode
          ? '#102c20'
          : '#e9f8f1'
      };
    }

    .zk-proof-item-top {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .zk-radio {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      border-radius: 50%;
      border: 2px solid ${c.border};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .zk-proof-item.selected .zk-radio {
      border-color: ${c.green};
    }

    .zk-radio-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${c.green};
    }

    .zk-proof-title {
      font-size: 14px;
      font-weight: 750;
      line-height: 1.4;
    }

    .zk-proof-description {
      margin-left: 28px;
      margin-top: 3px;
      color: ${c.secondary};
      font-size: 12px;
    }

    .zk-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 130px;
      color: ${c.secondary};
      font-size: 14px;
    }

    .zk-footer {
      text-align: center;
      color: ${c.muted};
      font-size: 12px;
      line-height: 1.6;
      padding: 10px 0;
    }

    .zk-divider {
      height: 1px;
      background: ${c.divider};
      margin: 20px 0;
    }

    .zk-small-title {
      font-size: 13px;
      font-weight: 800;
      color: ${c.text};
      margin-bottom: 9px;
    }

    @media (max-width: 650px) {
      .zk-page {
        padding: 10px 10px 30px;
      }

      .zk-hero {
        padding: 18px 18px 20px;
        border-radius: 20px;
        margin-bottom: 14px;
      }

      .zk-brand {
        font-size: 10px;
        letter-spacing: .13em;
        margin-bottom: 7px;
      }

      .zk-hero h1 {
        font-size: 24px;
        line-height: 1.15;
      }

      .zk-hero p {
        margin-top: 7px;
        font-size: 13px;
        line-height: 1.4;
      }

      .zk-hero-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }

      .zk-pill {
        padding: 6px 9px;
        font-size: 10px;
        line-height: 1.2;
      }

      .zk-card {
        padding: 17px;
        border-radius: 17px;
      }

      .zk-card-heading {
        flex-direction: column;
      }

      .zk-current {
        align-items: flex-start;
      }

      .zk-current-badge {
        display: none;
      }

      .zk-methods {
        grid-template-columns: 1fr;
      }

      .zk-tier-limit-row {
        align-items: flex-start;
      }
    }
  `;
};

// ============================================================
// COMPONENT
// ============================================================

const KYC: React.FC = () => {
  const {
    darkMode: isDarkMode,
  } = useTheme();

  // ==========================================================
  // STATE
  // ==========================================================

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [dojahLoading, setDojahLoading] =
    useState(false);

  const [
    dojahScriptReady,
    setDojahScriptReady,
  ] = useState<boolean>(
    typeof window !==
      'undefined' &&
      Boolean(
        window.Connect
      )
  );

  const [alert, setAlert] =
    useState('');

  const [alertType, setAlertType] =
    useState<
      'success' |
      'error' |
      'warning'
    >('success');

  const [kyc, setKyc] =
    useState<KycData>({});

  // ==========================================================
  // TIER 1
  // ==========================================================

  const [bvn, setBvn] =
    useState('');

  // ==========================================================
  // TIER 2
  // ==========================================================

  const [
    documentType,
    setDocumentType,
  ] = useState(
    'nin'
  );

  const [
    documentNumber,
    setDocumentNumber,
  ] = useState('');

  const [
    tier2Bvn,
    setTier2Bvn,
  ] = useState('');

  const [
    frontFile,
    setFrontFile,
  ] = useState<File | null>(
    null
  );

  const [
    backFile,
    setBackFile,
  ] = useState<File | null>(
    null
  );

  // ==========================================================
  // TIER 3
  // ==========================================================

  const [
    tier3Method,
    setTier3Method,
  ] = useState(
    'bank_statement'
  );

  const [
    addressDocumentType,
    setAddressDocumentType,
  ] = useState(
    'bank_statement'
  );

  const [
    addressFile,
    setAddressFile,
  ] = useState<File | null>(
    null
  );

  const [
    tier3Selfie,
    setTier3Selfie,
  ] = useState<File | null>(
    null
  );
  const [
  employmentStatus,
  setEmploymentStatus,
] = useState('');

const [
  occupation,
  setOccupation,
] = useState('');

const [
  annualIncomeRange,
  setAnnualIncomeRange,
] = useState('');

  // ==========================================================
  // FILE REFS
  // ==========================================================

  const frontFileRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const backFileRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const addressFileRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const tier3SelfieRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // ==========================================================
  // TOKEN
  // ==========================================================

  const token =
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem(
      'access_token'
    ) ||
    localStorage.getItem(
      'token'
    ) ||
    '';

  // ==========================================================
  // HEADERS
  // ==========================================================

  const requestHeaders =
    (): HeadersInit => ({
      Authorization:
        `Bearer ${token}`,
    });

  // ==========================================================
  // ALERT
  // ==========================================================

  const showAlert = (
    message: string,
    type:
      | 'success'
      | 'error'
      | 'warning'
  ) => {
    setAlert(message);
    setAlertType(type);
  };

  // ==========================================================
  // SECURE VERIFICATION SCRIPT
  // ==========================================================

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    if (window.Connect) {
      setDojahScriptReady(
        true
      );
      return;
    }

    const existing =
      document.querySelector(
        'script[data-dojah-widget="true"]'
      );

    if (existing) {
      existing.addEventListener(
        'load',
        () => {
          setDojahScriptReady(
            Boolean(
              window.Connect
            )
          );
        }
      );

      return;
    }

    const script =
      document.createElement(
        'script'
      );

    script.src =
      'https://widget.dojah.io/widget.js';

    script.async = true;

    script.setAttribute(
      'data-dojah-widget',
      'true'
    );

    script.onload = () => {
      setDojahScriptReady(
        Boolean(
          window.Connect
        )
      );
    };

    script.onerror = () => {
      showAlert(
        'Unable to load secure identity verification. You can use the manual verification option instead.',
        'warning'
      );
    };

    document.body.appendChild(
      script
    );

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  // ==========================================================
  // FETCH KYC STATUS
  // ==========================================================

  const fetchStatus =
    async () => {
      if (!token) {
        setLoading(false);

        showAlert(
          'Please log in to continue with identity verification.',
          'error'
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_BASE}/kyc/status`,
            {
              method: 'GET',
              headers:
                requestHeaders(),
            }
          );

        const result =
          (await response.json()) as KycResponse;

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Unable to load KYC status.'
          );
        }

        const payload =
          result.data ||
          result;

        setKyc(
          payload.kyc ||
            {}
        );
      } catch (error) {
        showAlert(
          error instanceof
            Error
            ? error.message
            : 'Unable to load KYC status.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // STATUS
  // ==========================================================

  const approvedTier =
    clampTier(
      kyc.tier ??
        kyc.submitted_tier ??
        0
    );

  // ==========================================================
  // TIER 1 / BVN
  // ==========================================================

  const rawBvnStatus =
    normalizeStatus(
      kyc.bvn_verified === true
        ? true
        : kyc.bvn_status
    );

  const bvnStatus =
    approvedTier >= 1
      ? rawBvnStatus
      : rawBvnStatus ===
        'pending'
      ? 'pending'
      : 'not submitted';

  // ==========================================================
  // TIER 2 / ID
  // ==========================================================

  const rawIdStatus =
    normalizeStatus(
      kyc.id_verified === true
        ? true
        : kyc.id_status
    );

  const idStatus =
    approvedTier >= 2
      ? rawIdStatus
      : rawIdStatus ===
        'pending'
      ? 'pending'
      : 'not submitted';

  // ==========================================================
  // TIER 3
  // ==========================================================

  const rawTier3Status =
    normalizeStatus(
      kyc.tier_3_verified ===
        true
        ? true
        : kyc.tier_3_status
    );

  const tier3Status =
    approvedTier >= 3
      ? rawTier3Status
      : rawTier3Status ===
        'pending'
      ? 'pending'
      : 'not submitted';

  // ==========================================================
  // MISSING PROFILE FIELDS
  // ==========================================================

  const missingFields =
    kyc.missing_profile_fields ||
    kyc.missingProfileFields ||
    [];

  // ==========================================================
  // SUBMISSION RULES
  // ==========================================================

  const canSubmitBvn =
    bvnStatus !==
      'pending' &&
    bvnStatus !==
      'verified';

const canContinueBvnVerification =
  bvnStatus === 'pending' &&
  bvnStatus !== 'verified';

  const canSubmitTier2 =
    bvnStatus ===
      'verified' &&
    idStatus !==
      'pending' &&
    idStatus !==
      'verified';

  const canSubmitTier3 =
    idStatus ===
      'verified' &&
    tier3Status !==
      'pending' &&
    tier3Status !==
      'verified';

  // ==========================================================
  // CURRENT VERIFICATION LABEL
  // ==========================================================

  const currentLevelLabel =
    approvedTier === 0
      ? 'Not verified'
      : `Level ${approvedTier}`;

  const currentLevelSubtitle =
    approvedTier === 0
      ? 'Complete Tier 1 verification to get started'
      : `Your approved ZENIMONIES verification level`;

  // ==========================================================
  // SUBMIT BVN
  // ==========================================================
const submitBvn = async (event: React.FormEvent) => {
  event.preventDefault();

  if (!token) {
    showAlert('Please log in to continue.', 'error');
    return;
  }

  if (bvn.length !== 11) {
    showAlert('BVN must be exactly 11 digits.', 'error');
    return;
  }

  if (missingFields.length > 0) {
    showAlert(
      'Please complete your profile information before submitting your BVN.',
      'error'
    );
    return;
  }

  try {
    setSubmitting(true);

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
      throw new Error(result.message || 'BVN verification failed.');
    }

    showAlert(
      result.message || 'BVN submitted successfully. Verification is pending.',
      result.status === 'verified' ? 'success' : 'warning'
    );

    setBvn('');
    await fetchStatus();
  } catch (error) {
    showAlert(
      error instanceof Error ? error.message : 'Unable to submit BVN.',
      'error'
    );
  } finally {
    setSubmitting(false);
  }
};

  const startTier1BvnVerification = async () => {
  const token = localStorage.getItem('zenimonies_token');

  
if (!token) {
  showAlert(
    'Please log in again to continue verification.',
    'error'
  );
  return;
}

if (dojahLoading) {
  return;
}

if (
  !DOJAH_APP_ID ||
  !DOJAH_PUBLIC_KEY ||
  !DOJAH_WIDGET_ID
) {
  showAlert(
    'Verification is temporarily unavailable. Please try again later.',
    'error'
  );
  return;
}

if (typeof window.Connect !== 'function') {
  showAlert(
    'The verification service did not load. Please refresh the page and try again.',
    'error'
  );
  return;
}

setDojahLoading(true);


  try {
    const response = await fetch(`${API_BASE}/kyc/dojah/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        verification_type: 'tier_1',
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.reference_id) {
      throw new Error(
        result.message ||
          'Unable to start verification. Please try again.'
      );
    }

    const referenceId = result.reference_id;

    
const Connect = window.Connect;

if (typeof Connect !== 'function') {
  throw new Error(
    'The verification SDK did not load. Please refresh and try again.'
  );
}

const connect = new Connect({
  app_id: DOJAH_APP_ID,
  p_key: DOJAH_PUBLIC_KEY,
  type: 'custom',
  config: {
    widget_id: DOJAH_WIDGET_ID,
  },
  reference_id: referenceId,
  metadata: {
    service: 'zenimonies_tier_1_bvn',
    reference_id: referenceId,
  },
  onSuccess: async () => {
    setDojahLoading(false);

    showAlert(
      'Your verification was submitted. Your status will update after the checks are completed.',
      'success'
    );

    try {
      await fetchStatus();
    } catch {
      // Keep the KYC page usable if refreshing status fails.
    }
  },
  onError: () => {
    setDojahLoading(false);

    showAlert(
      'Verification could not be opened or completed. Please refresh the page and try again.',
      'error'
    );
  },
  onClose: () => {
    setDojahLoading(false);
  },
});

if (typeof connect.setup !== 'function') {
  throw new Error(
    'The verification SDK does not provide setup(). Please check the loaded SDK.'
  );
}

connect.setup();
connect.open();

    } catch (error) {
      console.error(
        '[KYC] Tier 1 verification launch failed:',
        error
      );

      setDojahLoading(false);

      showAlert(
        error instanceof Error
          ? error.message
          : 'Unable to open verification. Please try again.',
        'error'
      );
    }
  }; 
  // ==========================================================
  // SUBMIT TIER 2 — MANUAL DOCUMENT INTAKE
  // A selfie upload does NOT satisfy liveness verification.
  // ==========================================================

  
  const submitTier2 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const isNin =
      documentType === 'nin' ||
      documentType === 'national_id';

    const cleanNumber = documentNumber.trim();
    const cleanTier2Bvn = tier2Bvn.replace(/\D/g, '');

    if (dojahLoading) {
      return;
    }

    if (!/^\d{11}$/.test(cleanTier2Bvn)) {
      showAlert(
        'Please enter your 11-digit BVN for Tier 2 verification.',
        'error'
      );
      return;
    }

    if (!cleanNumber) {
      showAlert(
        'Please enter your document number.',
        'error'
      );
      return;
    }

    if (isNin && !/^\d{11}$/.test(cleanNumber)) {
      showAlert(
        'NIN must contain exactly 11 digits.',
        'error'
      );
      return;
    }

    if (!isNin && !frontFile) {
      showAlert(
        'Please provide the front image of your identity document.',
        'error'
      );
      return;
    }

    if (!isNin && !backFile) {
      showAlert(
        'Please provide the back image of your identity document.',
        'error'
      );
      return;
    }

    const token = localStorage.getItem('zenimonies_token');

    if (!token) {
      showAlert(
        'Please log in again to continue verification.',
        'error'
      );
      return;
    }

    if (
      !DOJAH_APP_ID ||
      !DOJAH_PUBLIC_KEY ||
      !DOJAH_WIDGET_ID ||
      typeof window.Connect !== 'function'
    ) {
      showAlert(
        'Verification is temporarily unavailable. Please try again later.',
        'error'
      );
      return;
    }

    setDojahLoading(true);

    try {
      // 1. Submit the customer's Tier 2 details.
      const formData = new FormData();

      formData.append('bvn', cleanTier2Bvn);
      formData.append('document_type', documentType);
      formData.append('document_number', cleanNumber);

      if (frontFile) {
        formData.append('document_front', frontFile);
      }

      if (backFile) {
        formData.append('document_back', backFile);
      }

      const submitResponse = await fetch(
        `${API_BASE}/kyc/tier-2`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const submitResult = await submitResponse
        .json()
        .catch(() => ({}));

      if (
        !submitResponse.ok ||
        submitResult.success !== true
      ) {
        throw new Error(
          submitResult.message ||
            'Unable to save your identity details.'
        );
      }

      // 2. Ask the authenticated backend for the
      // verification reference. Never create it in the browser.
      const startResponse = await fetch(
        `${API_BASE}/kyc/dojah/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            verification_type: 'tier_2',
          }),
        }
      );

      const startResult = await startResponse
        .json()
        .catch(() => ({}));

      if (
        !startResponse.ok ||
        startResult.success !== true ||
        typeof startResult.reference_id !== 'string' ||
        !startResult.reference_id
      ) {
        throw new Error(
          startResult.message ||
            'Unable to start identity verification.'
        );
      }

      const referenceId = startResult.reference_id;
      const Connect = window.Connect;

      if (typeof Connect !== 'function') {
        throw new Error(
          'The verification widget did not load. Please refresh and try again.'
        );
      }

      // 3. Open the configured verification workflow.
      // The workflow must be configured to collect the
      // required government ID and live liveness evidence.
      const connect = new Connect({
        app_id: DOJAH_APP_ID,
        p_key: DOJAH_PUBLIC_KEY,
        type: 'custom',
        config: {
          widget_id: DOJAH_WIDGET_ID,
        },
        reference_id: referenceId,
        metadata: {
          service: 'zenimonies_tier_2_identity',
          reference_id: referenceId,
        },

        // A widget callback is NOT proof of approval.
        // Always ask our authenticated backend to verify.
        onSuccess: async () => {
          try {
            const confirmResponse = await fetch(
              `${API_BASE}/kyc/dojah/confirm`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                 verification_type: 'tier_2',
                  reference_id: referenceId,
               }),
              }
            );

            const confirmResult = await confirmResponse
              .json()
              .catch(() => ({}));

            if (
              !confirmResponse.ok ||
              confirmResult.success !== true
            ) {
              showAlert(
                'Your verification was submitted. The result is still being checked.',
                'warning'
              );
            } else if (
              confirmResult.verified === true &&
              confirmResult.status === 'verified'
            ) {
              showAlert(
                'Your identity verification has been confirmed.',
                'success'
              );
            } else if (
              confirmResult.status === 'rejected'
            ) {
              showAlert(
                'Your verification could not be approved. Please review your details or contact support.',
                'error'
              );
            } else {
              showAlert(
                'Your verification is being reviewed. Your status will update when the checks are complete.',
                'warning'
              );
            }
          } catch {
            showAlert(
              'Your verification was submitted, but its result is not available yet.',
              'warning'
            );
          } finally {
            setDojahLoading(false);

            try {
              await fetchStatus();
            } catch {
              // Keep the page usable if status refresh fails.
            }
          }
        },

        onError: () => {
          setDojahLoading(false);

          showAlert(
            'Verification could not be completed. Please try again.',
            'error'
          );
        },

        onClose: () => {
          setDojahLoading(false);
        },
      });

      if (
        typeof connect.setup !== 'function' ||
        typeof connect.open !== 'function'
      ) {
        throw new Error(
          'The verification widget could not be initialized.'
        );
      }

      connect.setup();
      connect.open();
    } catch (error) {
      setDojahLoading(false);

      showAlert(
        error instanceof Error
          ? error.message
          : 'Unable to start identity verification. Please try again.',
        'error'
      );
    }
  };

  

  // ==========================================================
  // SUBMIT TIER 3
  // ==========================================================

  const submitTier3 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (dojahLoading || submitting) return;

    if (
      !employmentStatus ||
      !occupation.trim() ||
      !annualIncomeRange
    ) {
      showAlert(
        'Please complete your employment and annual income information.',
        'error'
      );
      return;
    }

    if (!addressDocumentType || !addressFile) {
      showAlert(
        'Please select and upload your proof of address.',
        'error'
      );
      return;
    }

    if (addressFile.type !== 'application/pdf') {
      showAlert(
        'Your proof of address must be uploaded as a PDF.',
        'error'
      );
      return;
    }

    if (!tier3Selfie) {
      showAlert(
        'Please select a selfie photo.',
        'error'
      );
      return;
    }

    const activeToken =
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      '';

    if (!activeToken) {
      showAlert(
        'Please log in again to continue verification.',
        'error'
      );
      return;
    }

    if (
      !DOJAH_APP_ID ||
      !DOJAH_PUBLIC_KEY ||
      !DOJAH_WIDGET_ID ||
      typeof window.Connect !== 'function'
    ) {
      showAlert(
        'Secure verification is temporarily unavailable. Please refresh and try again.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    setDojahLoading(true);

    let documentsSubmitted = false;

    try {
      // 1. Submit Tier 3 evidence to the authenticated backend.
      const formData = new FormData();

      formData.append('tier_3_method', tier3Method);
      formData.append(
        'tier_3_document_type',
        addressDocumentType
      );
      formData.append('tier_3_document', addressFile);
      formData.append('tier_3_selfie', tier3Selfie);
      formData.append('employment_status', employmentStatus);
      formData.append('occupation', occupation.trim());
      formData.append('annual_income_range', annualIncomeRange);

      const submitResponse = await fetch(
        `${API_BASE}/kyc/tier-3`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
          body: formData,
        }
      );

      const submitResult = await submitResponse
        .json()
        .catch(() => ({}));

      if (
        !submitResponse.ok ||
        submitResult.success !== true
      ) {
        throw new Error(
          submitResult.message ||
            'Unable to submit Tier 3 documents.'
        );
      }

      documentsSubmitted = true;

      // 2. Request a separate Tier 3 session from the backend.
      const startResponse = await fetch(
        `${API_BASE}/kyc/dojah/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            verification_type: 'tier_3',
          }),
        }
      );

      const startResult = await startResponse
        .json()
        .catch(() => ({}));

      if (
        !startResponse.ok ||
        startResult.success !== true ||
        typeof startResult.reference_id !== 'string' ||
        !startResult.reference_id
      ) {
        throw new Error(
          startResult.message ||
            'Your documents were received, but the liveness session could not be started. Please contact support before submitting again.'
        );
      }

      const referenceId = startResult.reference_id;
      const Connect = window.Connect;

      if (typeof Connect !== 'function') {
        throw new Error(
          'Your documents were received, but the verification widget could not be opened. Please contact support before submitting again.'
        );
      }

      // 3. Open the configured verification widget.
      const connect = new Connect({
        app_id: DOJAH_APP_ID,
        p_key: DOJAH_PUBLIC_KEY,
        type: 'custom',
        config: {
          widget_id: DOJAH_WIDGET_ID,
        },
        reference_id: referenceId,
        metadata: {
          service: 'zenimonies_tier_3_liveness',
          reference_id: referenceId,
        },

        // The widget callback is not itself approval.
        // The backend must retrieve the authoritative result.
        onSuccess: async () => {
          try {
            const confirmResponse = await fetch(
              `${API_BASE}/kyc/dojah/confirm`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${activeToken}`,
                },
                body: JSON.stringify({
                  verification_type: 'tier_3',
                  reference_id: referenceId,
                }),
              }
            );

            const confirmResult = await confirmResponse
              .json()
              .catch(() => ({}));

            if (
              !confirmResponse.ok ||
              confirmResult.success !== true
            ) {
              showAlert(
                'Your verification was submitted, but the result is not available yet. Your Tier 3 application has not been approved.',
                'warning'
              );
            } else if (
              confirmResult.liveness_status === 'rejected'
            ) {
              showAlert(
                'The liveness check could not be completed successfully. Please contact support for assistance.',
                'error'
              );
            } else if (
              confirmResult.liveness_status === 'verified'
            ) {
              showAlert(
                'Your liveness check is complete. Your proof of address still requires review before Tier 3 can be approved.',
                'success'
              );
            } else {
              showAlert(
                'Your liveness result is still pending. Tier 3 has not been approved.',
                'warning'
              );
            }
          } catch {
            showAlert(
              'Your verification was submitted, but its result could not be retrieved. Tier 3 has not been approved.',
              'warning'
            );
          } finally {
            setDojahLoading(false);
            setSubmitting(false);
            await fetchStatus();
          }
        },

        onError: () => {
          setDojahLoading(false);
          setSubmitting(false);

          showAlert(
            documentsSubmitted
              ? 'Your documents were received, but verification could not be completed. Please contact support before submitting again.'
              : 'Verification could not be completed. Please try again.',
            'error'
          );
        },

        onClose: () => {
          setDojahLoading(false);
          setSubmitting(false);

          showAlert(
            'The verification window was closed. Your Tier 3 application has not been approved.',
            'warning'
          );

          fetchStatus();
        },
      });

      if (
        typeof connect.setup !== 'function' ||
        typeof connect.open !== 'function'
      ) {
        throw new Error(
          'The verification widget could not be initialized.'
        );
      }

      connect.setup();
      connect.open();

      showAlert(
        'Your documents were received. Complete the secure liveness check to continue.',
        'success'
      );
    } catch (error) {
      setDojahLoading(false);
      setSubmitting(false);

      showAlert(
        error instanceof Error
          ? error.message
          : 'Unable to start Tier 3 verification.',
        'error'
      );

      if (documentsSubmitted) {
        await fetchStatus();
      }
    }
  };
  
  const retryTier3Liveness = async () => {
    if (dojahLoading || submitting) return;

    const activeToken =
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      '';

    if (!activeToken) {
      showAlert(
        'Please log in again to continue verification.',
        'error'
      );
      return;
    }

    if (
      !DOJAH_APP_ID ||
      !DOJAH_PUBLIC_KEY ||
      !DOJAH_WIDGET_ID ||
      typeof window.Connect !== 'function'
    ) {
      showAlert(
        'Secure verification is temporarily unavailable. Please refresh and try again.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    setDojahLoading(true);

    try {
      // Start a new session using the existing Tier 3 documents.
      const startResponse = await fetch(
        `${API_BASE}/kyc/dojah/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            verification_type: 'tier_3',
          }),
        }
      );

      const startResult = await startResponse
        .json()
        .catch(() => ({}));

      if (
        !startResponse.ok ||
        startResult.success !== true ||
        typeof startResult.reference_id !== 'string' ||
        !startResult.reference_id
      ) {
        throw new Error(
          startResult.message ||
            'Unable to restart liveness verification. Please try again later.'
        );
      }

      const referenceId = startResult.reference_id;
      const Connect = window.Connect;

      const connect = new Connect({
        app_id: DOJAH_APP_ID,
        p_key: DOJAH_PUBLIC_KEY,
        type: 'custom',
        config: {
          widget_id: DOJAH_WIDGET_ID,
        },
        reference_id: referenceId,
        metadata: {
          service: 'zenimonies_tier_3_liveness',
          reference_id: referenceId,
        },

        onSuccess: async () => {
          try {
            const confirmResponse = await fetch(
              `${API_BASE}/kyc/dojah/confirm`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${activeToken}`,
                },
                body: JSON.stringify({
                  verification_type: 'tier_3',
                  reference_id: referenceId,
                }),
              }
            );

            const confirmResult = await confirmResponse
              .json()
              .catch(() => ({}));

            if (
              !confirmResponse.ok ||
              confirmResult.success !== true
            ) {
              showAlert(
                'Your liveness result is not available yet. Tier 3 has not been approved.',
                'warning'
              );
            } else if (
              confirmResult.liveness_status === 'rejected'
            ) {
              showAlert(
                'The liveness check did not pass. You can try again when the retry option becomes available.',
                'error'
              );
            } else if (
              confirmResult.liveness_status === 'verified'
            ) {
              showAlert(
                'Your liveness check is complete. Your proof of address still requires review before Tier 3 can be approved.',
                'success'
              );
            } else {
              showAlert(
                'Your liveness result is still pending. Tier 3 has not been approved.',
                'warning'
              );
            }
          } catch {
            showAlert(
              'We could not retrieve your liveness result. Tier 3 has not been approved.',
              'warning'
            );
          } finally {
            setDojahLoading(false);
            setSubmitting(false);
            await fetchStatus();
          }
        },

        onError: () => {
          setDojahLoading(false);
          setSubmitting(false);
          showAlert(
            'Liveness verification could not be completed. Please try again.',
            'error'
          );
          void fetchStatus();
        },

        onClose: () => {
          setDojahLoading(false);
          setSubmitting(false);
          showAlert(
            'The verification window was closed. Tier 3 has not been approved.',
            'warning'
          );
          void fetchStatus();
        },
      });

      if (
        typeof connect.setup !== 'function' ||
        typeof connect.open !== 'function'
      ) {
        throw new Error(
          'The verification window could not be opened.'
        );
      }

      connect.setup();
      connect.open();

      showAlert(
        'Continue the secure liveness check to retry verification.',
        'success'
      );
    } catch (error) {
      setDojahLoading(false);
      setSubmitting(false);

      showAlert(
        error instanceof Error
          ? error.message
          : 'Unable to restart liveness verification.',
        'error'
      );
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="zk-page">

      <style>
        {buildStyles(
          isDarkMode
        )}
      </style>

      <main className="zk-container">

        {/* ==================================================
            HERO
        ================================================== */}

        <section className="zk-hero">

          <div className="zk-brand">
            ZENIMONIES BANKING
          </div>

          <h1>
            Identity Verification
          </h1>

          <p>
            Complete your verification
            securely to unlock higher
            account and transfer
            limits.
          </p>

          <div className="zk-hero-pills">

            <span className="zk-pill">
              ✓ Secure verification
            </span>

            <span className="zk-pill">
              🔒 Your information is
              protected
            </span>

            <span className="zk-pill">
              ₦ Nigerian Naira
            </span>

          </div>

        </section>

        {/* ==================================================
            CURRENT VERIFICATION STATUS
        ================================================== */}

        {!loading && (
          <section className="zk-card">

            <div className="zk-current">

              <div className="zk-current-left">

                <div className="zk-current-icon">
                  {approvedTier ===
                  0
                    ? '—'
                    : approvedTier}
                </div>

                <div>

                  <div className="zk-current-title">
                    Current verification
                    level
                  </div>

                  <div className="zk-current-subtitle">
                    {
                      currentLevelSubtitle
                    }
                  </div>

                </div>

              </div>

              <div className="zk-current-badge">
                {
                  currentLevelLabel
                }
              </div>

            </div>

          </section>
        )}

        {/* ==================================================
            ALERT
        ================================================== */}

        {alert && (
          <div
            className={`zk-alert zk-alert-${alertType}`}
          >
            {alert}
          </div>
        )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <section className="zk-card">

            <div className="zk-loading">
              Loading your verification
              status...
            </div>

          </section>
        ) : (
          <>

            {/* ==================================================
                MISSING PROFILE FIELDS
            ================================================== */}

            {missingFields.length >
              0 && (
              <div className="zk-alert zk-alert-warning">

                Please complete your
                profile information
                before continuing
                with KYC verification.

              </div>
            )}

            {/* ==================================================
                TIER 1
            ================================================== */}

            <section className="zk-card">

              <div className="zk-card-heading">

                <div className="zk-card-heading-left">

                  <div className="zk-number">
                    Tier 1
                  </div>

                  <h2>
                    BVN Verification
                  </h2>

                  <p>
                    Verify your Bank
                    Verification Number
                    to activate your
                    first verification
                    level.
                  </p>

                </div>

                <StatusBadge
                  status={
                    bvnStatus
                  }
                />

              </div>

              <TierLimits tier={1} />

              {kyc.bvn_rejection_reason && (
                <div className="zk-alert zk-alert-error">
                  {
                    kyc.bvn_rejection_reason
                  }
                </div>
              )}

            
{canSubmitBvn && (
  <form onSubmit={submitBvn}>
    <div className="zk-field">
      <label className="zk-field-label">
        Bank Verification Number
      </label>

      <input
        className="zk-input"
        type="text"
        inputMode="numeric"
        maxLength={11}
        value={bvn}
        onChange={(event) =>
          setBvn(
            event.target.value
              .replace(/\D/g, '')
              .slice(0, 11)
          )
        }
        placeholder="Enter your 11-digit BVN"
        disabled={submitting}
      />

      <div className="zk-help">
        Your BVN is used only for identity verification.
      </div>
    </div>

    <button
      type="submit"
      className="zk-button"
      disabled={
        submitting ||
        bvn.length !== 11 ||
        missingFields.length > 0
      }
    >
      {submitting ? 'Submitting...' : 'Verify BVN'}
    </button>
  </form>
)}

{canContinueBvnVerification && (
  <button
    type="button"
    className="zk-button"
    onClick={startTier1BvnVerification}
    disabled={dojahLoading}
  >
    {dojahLoading
      ? 'Opening verification...'
      : 'Continue BVN Verification'}
  </button>
)}
</section>


            {/* ==================================================
                TIER 2
            ================================================== */}

            <section className="zk-card">

              <div className="zk-card-heading">

                <div className="zk-card-heading-left">

                  <div className="zk-number">
                    Tier 2
                  </div>

                  <h2>
                    Identity Verification
                  </h2>

                  {/* CUSTOMER-FACING COPY:
                      NO PROVIDER NAME */}
                  <p>
                    Complete your identity
                    verification securely
                    using our approved
                    verification process.
                  </p>

                </div>

                <StatusBadge
                  status={
                    idStatus
                  }
                />

              </div>

              <TierLimits tier={2} />

              {kyc.id_rejection_reason && (
                <div className="zk-alert zk-alert-error">
                  {
                    kyc.id_rejection_reason
                  }
                </div>
              )}

              {bvnStatus !==
              'verified' ? (
                <div className="zk-note">

                  <span className="zk-note-icon">
                    ✓
                  </span>

                  <span>
                    Complete Tier 1
                    BVN verification
                    before starting
                    Tier 2.
                  </span>

                </div>
              ) : canSubmitTier2 ? (
                <>

                  <div className="zk-small-title">
                    Identity verification
                  </div>

                  <div className="zk-note">
                    <span className="zk-note-icon">🔒</span>
                    <span>
                      Verify your identity using your details below. We will show your verification status here.
                    </span>
                  </div>

                  <div className="zk-divider" />

                  {/* ID DETAILS */}

                  <div className="zk-small-title">
                    Identity document details
                  </div>

                  <div className="zk-note">

                    <span className="zk-note-icon">
                      •
                    </span>

                    <span>
                      Choose your identity document. For NIN, enter your 11-digit number. For other supported IDs, provide clear images of the front and back of the document.
                    </span>

                  </div>

                  <form
                    onSubmit={
                      submitTier2
                    }
                  >

                    <div className="zk-field">
                      <label className="zk-field-label">
                        Bank Verification Number (BVN)
                      </label>
                      <input
                        className="zk-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={11}
                        value={tier2Bvn}
                        onChange={(event) =>
                          setTier2Bvn(
                            event.target.value.replace(/\D/g, '').slice(0, 11)
                          )
                        }
                        placeholder="Enter your 11-digit BVN"
                        disabled={submitting}
                        required
                      />
                      <div className="zk-help">
                        Enter the BVN already associated with your verified Tier 1 account.
                      </div>
                    </div>

                    <div className="zk-field">

                      <label className="zk-field-label">
                        Document type
                      </label>

                      <select
                        className="zk-select"
                        value={
                          documentType
                        }
                        onChange={(event) => {
                          const nextType = event.target.value;
                          setDocumentType(nextType);

                          // NIN requires the number only. Clear any ID
                          // images previously selected for another ID type.
                          if (nextType === 'nin' || nextType === 'national_id') {
                            setFrontFile(null);
                            setBackFile(null);

                            if (frontFileRef.current) {
                              frontFileRef.current.value = '';
                            }

                            if (backFileRef.current) {
                              backFileRef.current.value = '';
                            }
                          }
                        }}
                        disabled={
                          submitting
                        }
                      >

                        <option value="nin">
                          National Identification Number (NIN)
                        </option>

                        <option value="drivers_license">
                          Driver's Licence
                        </option>

                        <option value="voters_card">
                          Voter's Card
                        </option>

                        <option value="international_passport">
                          International Passport
                        </option>

                      </select>

                    </div>

                    <div className="zk-field">

                      <label className="zk-field-label">
                        Document number
                      </label>

                      <input
                        className="zk-input"
                        type="text"
                        value={
                          documentNumber
                        }
                        onChange={(
                          event
                        ) =>
                          setDocumentNumber(
                            event.target
                              .value
                          )
                        }
                        placeholder="Enter document number"
                        disabled={
                          submitting
                        }
                      />

                    </div>

                    {documentType !== 'nin' && documentType !== 'national_id' && (
                      <>
                        <div className="zk-field">
                          <label className="zk-field-label">
                            Document front
                          </label>

                          <input
                            ref={frontFileRef}
                            className="zk-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                              setFrontFile(event.target.files?.[0] || null)
                            }
                            disabled={submitting}
                            required
                          />
                          <div className="zk-help">
                            Upload a clear image of the front of your ID.
                          </div>
                        </div>

                        <div className="zk-field">
                          <label className="zk-field-label">
                            Document back
                          </label>

                          <input
                            ref={backFileRef}
                            className="zk-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                              setBackFile(event.target.files?.[0] || null)
                            }
                            disabled={submitting}
                            required
                          />
                          <div className="zk-help">
                            Upload a clear image of the back of your ID.
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      className="zk-button"
                      disabled={
                        submitting ||
                        tier2Bvn.replace(/\D/g, '').length !== 11 ||
                        !documentNumber.trim() ||
                        (documentType !== 'nin' && documentType !== 'national_id' && (!frontFile || !backFile))
                      }
                    >
                      {submitting
                        ? 'Submitting...'
                        : 'Submit Manual Verification'}
                    </button>

                  </form>

                </>
              ) : null}

            </section>

            {/* ==================================================
                TIER 3
            ================================================== */}

            <section className="zk-card">

              <div className="zk-card-heading">

                <div className="zk-card-heading-left">

                  <div className="zk-number">
                    Tier 3
                  </div>

                  <h2>
                    Proof of Address
                  </h2>

                  <p>
                    Submit an approved
                    proof of address
                    and a selfie to
                    complete Tier 3
                    verification.
                  </p>

                </div>

                <StatusBadge
                  status={
                    tier3Status
                  }
                />

              </div>

              <TierLimits tier={3} />

              {kyc.tier_3_rejection_reason && (
                <div className="zk-alert zk-alert-error">
                  {
                    kyc.tier_3_rejection_reason
                  }
                </div>
              )}

              {idStatus !==
              'verified' ? (
                <div className="zk-note">

                  <span className="zk-note-icon">
                    ✓
                  </span>

                  <span>
                    Complete Tier 2
                    identity
                    verification before
                    submitting Tier 3
                    proof of address.
                  </span>

                </div>
              ) : canSubmitTier3 ? (
                <form
                  onSubmit={
                    submitTier3
                  }
                >
                  
{/* EMPLOYMENT AND INCOME INFORMATION */}

<div className="zk-small-title">
  Employment and Income Information
</div>

<div className="zk-field">
  <label className="zk-field-label">
    Employment status
  </label>
  <select
    className="zk-select"
    value={employmentStatus}
    onChange={(event) => setEmploymentStatus(event.target.value)}
    disabled={submitting}
    required
  >
    <option value="">Select employment status</option>
    <option value="employed">Employed</option>
    <option value="self_employed">Self-employed</option>
    <option value="business_owner">Business owner</option>
    <option value="student">Student</option>
    <option value="unemployed">Unemployed</option>
    <option value="retired">Retired</option>
    <option value="other">Other</option>
  </select>
</div>

<div className="zk-field">
  <label className="zk-field-label">
    Occupation
  </label>
  <input
    className="zk-input"
    type="text"
    value={occupation}
    onChange={(event) => setOccupation(event.target.value)}
    placeholder="Enter your occupation"
    maxLength={120}
    disabled={submitting}
    required
  />
</div>

<div className="zk-field">
  <label className="zk-field-label">
    Annual income range
  </label>
  <select
    className="zk-select"
    value={annualIncomeRange}
    onChange={(event) => setAnnualIncomeRange(event.target.value)}
    disabled={submitting}
    required
  >
    <option value="">Select annual income range</option>
    <option value="below_500000">Below ₦500,000</option>
    <option value="500000_999999">₦500,000 – ₦999,999</option>
    <option value="1000000_2999999">₦1,000,000 – ₦2,999,999</option>
    <option value="3000000_4999999">₦3,000,000 – ₦4,999,999</option>
    <option value="5000000_9999999">₦5,000,000 – ₦9,999,999</option>
    <option value="10000000_plus">₦10,000,000 and above</option>
    <option value="prefer_not_to_say">Prefer not to say</option>
  </select>
</div>

<div className="zk-divider" />


                  {/* VERIFICATION METHOD */}

                  <div className="zk-small-title">
                    Verification method
                  </div>

                  <div className="zk-methods">

                    <button
                      type="button"
                      className={`zk-method ${
                        tier3Method ===
                        'bank_statement'
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        setTier3Method(
                          'bank_statement'
                        )
                      }
                    >
                      <div className="zk-method-title">
                        Bank Statement
                      </div>

                      <div className="zk-method-description">
                        Submit your proof
                        of address.
                      </div>

                    </button>

                    <button
                      type="button"
                      className={`zk-method ${
                        tier3Method ===
                        'address_document'
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        setTier3Method(
                          'address_document'
                        )
                      }
                    >
                      <div className="zk-method-title">
                        Address Document
                      </div>

                      <div className="zk-method-description">
                        Upload an approved
                        proof of address.
                      </div>

                    </button>

                  </div>

                  {/* SELECTED DOCUMENT */}

                  <div className="zk-field">

                    <label className="zk-field-label">
                      Selected proof of
                      address
                    </label>

                    <select
                      className="zk-select"
                      value={
                        addressDocumentType
                      }
                      onChange={(
                        event
                      ) =>
                        setAddressDocumentType(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        submitting
                      }
                    >

                      {ADDRESS_DOCUMENT_OPTIONS.map(
                        (
                          option
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  {/* ADDRESS PDF */}

                  <div className="zk-field">

                    <label className="zk-field-label">
                      Upload proof of
                      address
                    </label>

                    <input
                      ref={
                        addressFileRef
                      }
                      className="zk-input"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(
                        event
                      ) =>
                        setAddressFile(
                          event.target
                            .files?.[0] ||
                            null
                        )
                      }
                      disabled={
                        submitting
                      }
                    />

                    <div className="zk-help">
                      Upload a clear PDF.
                      The document must
                      be valid within the
                      last 3 months.
                    </div>

                  </div>

                  {/* SELFIE */}

                  <div className="zk-field">

                    <label className="zk-field-label">
                      Selfie
                    </label>

                    <input
                      ref={
                        tier3SelfieRef
                      }
                      className="zk-input"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(
                        event
                      ) =>
                        setTier3Selfie(
                          event.target
                            .files?.[0] ||
                            null
                        )
                      }
                      disabled={
                        submitting
                      }
                    />

                    <div className="zk-help">
                      Upload a clear,
                      recent selfie for
                      verification.
                    </div>

                  </div>

                  {/* IMPORTANT NOTE */}

                  <div className="zk-note">

                    <span className="zk-note-icon">
                      🔒
                    </span>

                    <span>
                      Your proof of address
                      must be dated within
                      the last 3 months.
                      Make sure your name
                      and address are
                      clearly visible on the
                      document.
                    </span>

                  </div>

                  {/* SUBMIT */}

                  <button
                    type="submit"
                    className="zk-button"
                    disabled={
                      submitting ||
                      !addressDocumentType ||
                      !addressFile ||
                      !tier3Selfie
                    }
                  >
                  
{submitting
  ? 'Submitting Tier 3...'
  : 'Submit Tier 3 Verification'}
</button>

</form>
) : (
  kyc?.liveness_status === 'rejected' &&
  kyc?.tier_3_status !== 'verified' &&
  kyc?.tier_3_status !== 'approved' && (
    <div className="zk-card">
      <p>
        Your previous liveness check was unsuccessful.
        You can retry without uploading your documents again.
      </p>

      <button
        type="button"
        className="zk-button"
        disabled={submitting || dojahLoading}
        onClick={retryTier3Liveness}
      >
        {dojahLoading
          ? 'Starting verification...'
          : 'Retry Liveness Verification'}
      </button>
    </div>
  )
)}


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div className="zk-footer">

          ZENIMONIES Banking uses secure
          identity verification to help
          protect your account and comply
          with verification requirements.

        </div>

      </main>
    </div>
  );
};

export default KYC;
