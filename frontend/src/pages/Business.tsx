
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// BUSINESS BANKING
// Dashboard access is available immediately after registration.
// Verification and transaction permissions are enforced separately.
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#006341';
const GREEN_LIGHT = '#008746';
const GREEN_DARK = '#004D38';
const WHITE = '#FFFFFF';
const PAGE_BG = '#F3F8F5';
const TEXT = '#123B2B';
const MUTED = '#64756B';
const BORDER = '#DCE9E0';

// ============================================================
// TYPES
// ============================================================

type BusinessAccount = {
  id: string;
  business_name: string;
  registration_number?: string | null;
  business_type?: string | null;
  country: string;
  currency: string;
  business_address?: string | null;
  verification_status: string;
  status: string;
  verification_level?: number | string;
  business_level?: number | string;
  account_level?: number | string;
  created_at?: string;
  account_id?: string;
  business_account_id?: string;
  account_number?: string;
  account_currency?: string;
  balance?: string | number;
  account_status?: string;
};

type BusinessForm = {
  businessName: string;
  businessType: string;
  country: string;
  currency: string;
  businessAddress: string;
};

// ============================================================
// STYLES
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: PAGE_BG,
    padding: '24px 16px',
    boxSizing: 'border-box',
    color: TEXT,
    fontFamily: 'Arial, sans-serif',
  },

  container: {
    maxWidth: 1150,
    margin: '0 auto',
    width: '100%',
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: GREEN,
    color: WHITE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 27,
    fontWeight: 900,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 26,
  },

  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: GREEN,
  },

  subtitle: {
    color: MUTED,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 1.7,
  },

  button: {
    border: 'none',
    borderRadius: 10,
    padding: '13px 20px',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    background: GREEN,
    color: WHITE,
  },

  secondaryButton: {
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '11px 16px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    background: WHITE,
    color: GREEN,
  },

  card: {
    background: WHITE,
    border: `1px solid ${BORDER}`,
    borderRadius: 18,
    padding: 22,
    boxShadow: '0 5px 20px rgba(0, 99, 65, 0.05)',
    minWidth: 0,
    boxSizing: 'border-box',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(min(100%, 290px), 1fr))',
    gap: 18,
    marginBottom: 24,
  },

  label: {
    display: 'block',
    color: MUTED,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    fontSize: 15,
    outlineColor: GREEN,
    background: WHITE,
    color: TEXT,
  },

  field: {
    marginBottom: 18,
    minWidth: 0,
  },

  alert: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 1.7,
  },

  businessCard: {
    background:
      'linear-gradient(135deg, #006341 0%, #008746 65%, #004D38 100%)',
    color: WHITE,
    borderRadius: 18,
    padding: 24,
    minHeight: 190,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    minWidth: 0,
    overflowWrap: 'anywhere',
  },

  dashboardButton: {
    width: '100%',
    marginTop: 22,
    padding: '14px 18px',
    border: '1px solid #ffffff',
    borderRadius: 12,
    background: WHITE,
    color: GREEN,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
  },
};

// ============================================================
// AUTHENTICATION
// ============================================================

function getToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    ''
  );
}

// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(
  amount: string | number | undefined,
  currency: string
): string {
  const numericAmount = Number(amount || 0);

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency || 'NGN'} ${numericAmount.toFixed(2)}`;
  }
}

// ============================================================
// NORMALIZE STATUS
// ============================================================

function normalizeStatus(
  status?: string | null
): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

// ============================================================
// BUSINESS VERIFICATION LEVEL
// ============================================================

function getBusinessLevel(
  business: BusinessAccount
): number {
  const rawLevel =
    business.verification_level ??
    business.business_level ??
    business.account_level ??
    1;

  const level = Number(rawLevel);

  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level > 5
  ) {
    return 1;
  }

  return level;
}

// ============================================================
// STATUS COLORS
// ============================================================

function statusColor(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (
    [
      'active',
      'verified',
      'approved',
      'successful',
      'completed',
    ].includes(normalized)
  ) {
    return {
      background: '#DCFCE7',
      color: '#166534',
    };
  }

  if (
    [
      'rejected',
      'suspended',
      'closed',
      'disabled',
      'blocked',
      'failed',
    ].includes(normalized)
  ) {
    return {
      background: '#FEE2E2',
      color: '#991B1B',
    };
  }

  if (
    [
      'under_review',
      'processing',
      'in_review',
    ].includes(normalized)
  ) {
    return {
      background: '#D1FAE5',
      color: '#065F46',
    };
  }

  return {
    background: '#FEF3C7',
    color: '#92400E',
  };
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const colors = statusColor(status);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 11px',
        borderRadius: 30,
        background: colors.background,
        color: colors.color,
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'capitalize',
      }}
    >
      {String(status || 'pending').replace(/_/g, ' ')}
    </span>
  );
}

// ============================================================
// VERIFICATION LEVEL DISPLAY
// ============================================================

function VerificationProgress({
  level,
}: {
  level: number;
}) {
  return (
    <div
      style={{
        marginTop: 22,
        padding: 16,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 14 }}>
          Business Verification
        </strong>

        <span
          style={{
            background: WHITE,
            color: GREEN,
            padding: '6px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Level {level} of 5
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 14,
        }}
      >
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            style={{
              height: 7,
              borderRadius: 10,
              background:
                item <= level
                  ? WHITE
                  : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.7,
          color: WHITE,
        }}
      >
        Levels 1–3 follow the standard verification
        process. CAC documentation is required when
        upgrading to Level 4. Level 5 requires additional
        enhanced business verification.
      </p>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function Business() {
  const navigate = useNavigate();

  const [businesses, setBusinesses] =
    useState<BusinessAccount[]>([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [form, setForm] =
    useState<BusinessForm>({
      businessName: '',
      businessType: '',
      country: 'NG',
      currency: 'NGN',
      businessAddress: '',
    });

  // ==========================================================
  // LOAD BUSINESSES
  // ==========================================================

  const loadBusinesses = useCallback(async () => {
    const currentToken = getToken();

    if (!currentToken) {
      setError(
        'Your session is missing or expired. Please sign in again.'
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/businesses`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            Accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'Your session has expired. Please sign out and sign in again.'
          );
        }

        throw new Error(
          data.message ||
            data.error ||
            'Unable to load your businesses.'
        );
      }

      const list =
        data.businesses ||
        data.data?.businesses ||
        [];

      setBusinesses(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your businesses.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  // ==========================================================
  // UPDATE REGISTRATION FORM
  // ==========================================================

  function updateField(
    event: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => {
      if (name === 'country') {
        return {
          ...previous,
          country: value,
          currency:
            value === 'ZA' ? 'ZAR' : 'NGN',
        };
      }

      return {
        ...previous,
        [name]: value,
      };
    });
  }

  // ==========================================================
  // REGISTER BUSINESS
  // CAC IS NOT REQUIRED AT INITIAL REGISTRATION
  // ==========================================================

  async function handleCreateBusiness(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const currentToken = getToken();

    if (!currentToken) {
      setError(
        'Please sign in before registering a business.'
      );
      return;
    }

    if (!form.businessName.trim()) {
      setError('Please enter your business name.');
      return;
    }

    if (!form.businessType) {
      setError('Please select your business type.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE}/businesses`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            businessName: form.businessName.trim(),
            businessType: form.businessType.trim(),
            country: form.country,
            currency: form.currency,
            businessAddress: form.businessAddress.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        throw new Error(
          data.message ||
            data.error ||
            'Business registration failed.'
        );
      }

      setSuccess(
        data.message ||
          'Your business application was submitted successfully. You can open your business dashboard now.'
      );

      setForm({
        businessName: '',
        businessType: '',
        country: 'NG',
        currency: 'NGN',
        businessAddress: '',
      });

      setShowForm(false);

      // Refresh the business list after registration.
      await loadBusinesses();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to register your business.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================================
  // COPY BUSINESS ACCOUNT NUMBER
  // ==========================================================

  async function copyAccountNumber(
    accountNumber?: string
  ) {
    if (!accountNumber) return;

    setError('');
    setSuccess('');

    try {
      await navigator.clipboard.writeText(
        accountNumber
      );

      setSuccess(
        'Business account number copied.'
      );
    } catch {
      setError(
        'Unable to copy automatically. Please select the account number and copy it.'
      );
    }
  }

  // ==========================================================
  // OPEN BUSINESS DASHBOARD
  //
  // IMPORTANT:
  // Do not block dashboard access based on approval.
  // Backend must still enforce financial transaction rules.
  // ==========================================================

  function openBusinessDashboard(
    business: BusinessAccount
  ) {
    setError('');

    if (!business.id) {
      setError(
        'The business account ID is missing. Please refresh and try again.'
      );

      return;
    }

    navigate(
      `/business/dashboard/${encodeURIComponent(
        business.id
      )}`
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* BRAND */}

        <div style={styles.brand}>
          <div style={styles.logo}>Z</div>

          <div>
            <div
              style={{
                color: GREEN,
                fontSize: 21,
                fontWeight: 900,
              }}
            >
              Zenimonies
            </div>

            <div
              style={{
                color: MUTED,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.3,
              }}
            >
              BUSINESS BANKING
            </div>
          </div>
        </div>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>
              Business Banking
            </h1>

            <p style={styles.subtitle}>
              Manage your business profile and business
              accounts separately from your personal
              banking.
            </p>
          </div>

          {!showForm && (
            <button
              type="button"
              style={styles.button}
              onClick={() => {
                setError('');
                setSuccess('');
                setShowForm(true);
              }}
            >
              + Register Business
            </button>
          )}
        </header>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            style={{
              ...styles.alert,
              background: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #FECACA',
            }}
          >
            <strong>Notice:</strong> {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            role="status"
            style={{
              ...styles.alert,
              background: '#DCFCE7',
              color: '#166534',
              border: '1px solid #BBF7D0',
            }}
          >
            {success}
          </div>
        )}

        {/* REGISTRATION FORM */}

        {showForm && (
          <section
            style={{
              ...styles.card,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 21,
                    color: GREEN,
                  }}
                >
                  Register a Business
                </h2>

                <p style={styles.subtitle}>
                  Start your business verification journey
                  with Level 1.
                </p>
              </div>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateBusiness}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Business Name *
                  </label>

                  <input
                    style={styles.input}
                    name="businessName"
                    value={form.businessName}
                    onChange={updateField}
                    placeholder="Enter your business name"
                    maxLength={200}
                    required
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Business Type *
                  </label>

                  <select
                    style={styles.input}
                    name="businessType"
                    value={form.businessType}
                    onChange={updateField}
                    required
                  >
                    <option value="">
                      Select business type
                    </option>

                    <option value="Sole Proprietorship">
                      Sole Proprietorship
                    </option>

                    <option value="Small Trader">
                      Small Trader
                    </option>

                    <option value="Partnership">
                      Partnership
                    </option>

                    <option value="Limited Liability Company">
                      Limited Liability Company
                    </option>

                    <option value="Private Company">
                      Private Company
                    </option>

                    <option value="Public Company">
                      Public Company
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Country *
                  </label>

                  <select
                    style={styles.input}
                    name="country"
                    value={form.country}
                    onChange={updateField}
                    required
                  >
                    <option value="NG">Nigeria</option>
                    <option value="ZA">South Africa</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Account Currency
                  </label>

                  <input
                    style={{
                      ...styles.input,
                      background: PAGE_BG,
                      fontWeight: 800,
                      color: GREEN,
                    }}
                    value={form.currency}
                    readOnly
                  />
                </div>

                <div
                  style={{
                    ...styles.field,
                    gridColumn: '1 / -1',
                  }}
                >
                  <label style={styles.label}>
                    Business Address
                  </label>

                  <textarea
                    style={{
                      ...styles.input,
                      minHeight: 90,
                      resize: 'vertical',
                    }}
                    name="businessAddress"
                    value={form.businessAddress}
                    onChange={updateField}
                    placeholder="Enter your business address"
                    maxLength={2000}
                  />
                </div>
              </div>

              <div
                style={{
                  background: '#E8F5EC',
                  color: '#14532D',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.8,
                  marginBottom: 20,
                  border: '1px solid #C5E7D0',
                }}
              >
                <strong>
                  Business Verification Levels
                </strong>

                <p style={{ margin: '8px 0' }}>
                  Start with Level 1 and progress through
                  Levels 1–5 as your business completes
                  the required verification.
                </p>

                <p style={{ margin: '8px 0' }}>
                  <strong>Levels 1–3:</strong> Follow the
                  standard customer verification process.
                </p>

                <p style={{ margin: '8px 0' }}>
                  <strong>Level 4:</strong> CAC
                  documentation is required when upgrading
                  to this level.
                </p>

                <p style={{ margin: '8px 0 0' }}>
                  <strong>Level 5:</strong> Additional
                  enhanced business verification applies.
                </p>

                <p
                  style={{
                    margin: '10px 0 0',
                    fontWeight: 700,
                  }}
                >
                  CAC is not required for initial
                  registration in this form.
                </p>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.button,
                  width: '100%',
                  opacity: submitting ? 0.65 : 1,
                  cursor: submitting
                    ? 'not-allowed'
                    : 'pointer',
                }}
                disabled={submitting}
              >
                {submitting
                  ? 'Submitting application...'
                  : 'Submit Business Application'}
              </button>
            </form>
          </section>
        )}

        {/* LOADING */}

        {loading && (
          <section style={styles.card}>
            <p style={{ margin: 0, color: MUTED }}>
              Loading your business accounts...
            </p>
          </section>
        )}

        {/* EMPTY STATE */}

        {!loading &&
          businesses.length === 0 &&
          !showForm && (
            <section
              style={{
                ...styles.card,
                textAlign: 'center',
                padding: '48px 24px',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto 20px',
                  borderRadius: 20,
                  background: '#E8F5EC',
                  color: GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                🏢
              </div>

              <h2
                style={{
                  margin: '0 0 10px',
                  fontSize: 22,
                  color: GREEN,
                }}
              >
                Open a Business Account
              </h2>

              <p
                style={{
                  color: MUTED,
                  maxWidth: 450,
                  margin: '0 auto 24px',
                  lineHeight: 1.8,
                }}
              >
                Create a separate business profile and
                start your business verification journey
                with Zenimonies.
              </p>

              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  setError('');
                  setShowForm(true);
                }}
              >
                Get Started
              </button>
            </section>
          )}

        {/* BUSINESS ACCOUNTS */}

        {!loading && businesses.length > 0 && (
          <>
            <div style={styles.grid}>
              {businesses.map((business) => {
                const accountNumber =
                  business.account_number || '';

                const currency =
                  business.account_currency ||
                  business.currency ||
                  'NGN';

                const currentLevel =
                  getBusinessLevel(business);

                return (
                  <section
                    key={business.id}
                    style={styles.businessCard}
                  >
                    {/* BUSINESS NAME */}

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.85,
                              marginBottom: 7,
                              fontWeight: 700,
                            }}
                          >
                            BUSINESS ACCOUNT
                          </div>

                          <h2
                            style={{
                              margin: 0,
                              fontSize: 21,
                              fontWeight: 800,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {business.business_name}
                          </h2>
                        </div>

                        <span
                          style={{
                            background:
                              'rgba(255,255,255,0.15)',
                            padding: '7px 10px',
                            borderRadius: 9,
                            fontSize: 12,
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {currency}
                        </span>
                      </div>

                      {/* ACCOUNT NUMBER */}

                      <div
                        style={{
                          marginTop: 24,
                          fontSize: 12,
                          opacity: 0.85,
                        }}
                      >
                        Business Account Number
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginTop: 7,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 20,
                            letterSpacing: 1.5,
                          }}
                        >
                          {accountNumber || 'Not available'}
                        </strong>

                        {accountNumber && (
                          <button
                            type="button"
                            onClick={() =>
                              copyAccountNumber(accountNumber)
                            }
                            style={{
                              border:
                                '1px solid rgba(255,255,255,0.4)',
                              background: 'transparent',
                              color: WHITE,
                              borderRadius: 8,
                              padding: '7px 10px',
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    {/* BALANCE */}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        gap: 12,
                        marginTop: 25,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.85,
                            marginBottom: 5,
                          }}
                        >
                          Available Account Balance
                        </div>

                        <strong style={{ fontSize: 24 }}>
                          {formatMoney(
                            business.balance,
                            currency
                          )}
                        </strong>
                      </div>

                      <span
                        style={{
                          background:
                            'rgba(255,255,255,0.15)',
                          padding: '7px 10px',
                          borderRadius: 9,
                          fontSize: 12,
                          textTransform: 'capitalize',
                        }}
                      >
                        {business.account_status || 'pending'}
                      </span>
                    </div>

                    {/* VERIFICATION */}

                    <VerificationProgress
                      level={currentLevel}
                    />

                    {/* ALWAYS ALLOW DASHBOARD ACCESS */}

                    <button
                      type="button"
                      style={styles.dashboardButton}
                      onClick={() =>
                        openBusinessDashboard(business)
                      }
                    >
                      Open Business Dashboard →
                    </button>

                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.7,
                        margin: '12px 0 0',
                        color: '#E0F2E7',
                      }}
                    >
                      Your dashboard is accessible while
                      verification is pending. Financial
                      services remain subject to verification,
                      account status, limits, and security
                      checks.
                    </p>
                  </section>
                );
              })}
            </div>

            {/* BUSINESS APPLICATIONS */}

            <section style={styles.card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 21,
                      color: GREEN,
                    }}
                  >
                    Business Applications
                  </h2>

                  <p style={styles.subtitle}>
                    Track verification and account approval.
                    You do not need to wait for approval to
                    open your dashboard.
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={loadBusinesses}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {businesses.map((business) => {
                  const currentLevel =
                    getBusinessLevel(business);

                  const verificationStatus =
                    normalizeStatus(
                      business.verification_status
                    );

                  const businessStatus =
                    normalizeStatus(business.status);

                  const accountStatus =
                    normalizeStatus(
                      business.account_status
                    );

                  return (
                    <div
                      key={business.id}
                      style={{
                        border: `1px solid ${BORDER}`,
                        borderRadius: 14,
                        padding: 18,
                        background: WHITE,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: 14,
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: '0 0 8px',
                              fontSize: 17,
                              color: GREEN,
                            }}
                          >
                            {business.business_name}
                          </h3>

                          <p
                            style={{
                              margin: '0 0 6px',
                              color: MUTED,
                              fontSize: 13,
                            }}
                          >
                            Business type:{' '}
                            {business.business_type ||
                              'Not provided'}
                          </p>

                          <p
                            style={{
                              margin: '0 0 6px',
                              color: MUTED,
                              fontSize: 13,
                            }}
                          >
                            Country: {business.country}
                          </p>

                          <p
                            style={{
                              margin: 0,
                              color: GREEN,
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            Verification Level: {currentLevel} of 5
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display: 'block',
                                color: MUTED,
                                fontSize: 11,
                                marginBottom: 5,
                                fontWeight: 700,
                              }}
                            >
                              VERIFICATION
                            </span>

                            <StatusBadge
                              status={business.verification_status}
                            />
                          </div>

                          <div>
                            <span
                              style={{
                                display: 'block',
                                color: MUTED,
                                fontSize: 11,
                                marginBottom: 5,
                                fontWeight: 700,
                              }}
                            >
                              ACCOUNT APPROVAL
                            </span>

                            <StatusBadge
                              status={business.status}
                            />
                          </div>

                          <div>
                            <span
                              style={{
                                display: 'block',
                                color: MUTED,
                                fontSize: 11,
                                marginBottom: 5,
                                fontWeight: 700,
                              }}
                            >
                              BUSINESS ACCOUNT
                            </span>

                            <StatusBadge
                              status={business.account_status}
                            />
                          </div>
                        </div>
                      </div>

                      {/* APPLICATION MESSAGE */}

                      <div
                        style={{
                          marginTop: 18,
                          padding: 14,
                          borderRadius: 10,
                          background: PAGE_BG,
                          color: MUTED,
                          fontSize: 13,
                          lineHeight: 1.8,
                        }}
                      >
                        {verificationStatus === 'rejected' ||
                        businessStatus === 'rejected'
                          ? 'Your business application was rejected. You can still access your dashboard to view your business information. Please contact Zenimonies support regarding verification.'
                          : verificationStatus === 'verified' &&
                            businessStatus === 'active' &&
                            accountStatus === 'active'
                          ? 'Your business has been verified and activated. Your business dashboard is available.'
                          : 'Your business application is pending or under review. You can open and view your business dashboard now. Financial transactions and other restricted services remain subject to applicable verification, account status, limits, and security checks.'}
                      </div>

                      {/* ALWAYS ALLOW BUSINESS MANAGEMENT */}

                      <button
                        type="button"
                        style={{
                          ...styles.secondaryButton,
                          marginTop: 15,
                          width: '100%',
                          color: GREEN,
                          borderColor: '#A7D9B9',
                        }}
                        onClick={() =>
                          openBusinessDashboard(business)
                        }
                      >
                        Manage This Business →
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* FOOTER */}

        <p
          style={{
            textAlign: 'center',
            color: '#819187',
            fontSize: 12,
            marginTop: 30,
          }}
        >
          Zenimonies Banking · Business Banking
        </p>
      </div>
    </div>
  );
}
