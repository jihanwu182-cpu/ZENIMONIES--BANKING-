
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// BUSINESS ACCOUNT MANAGEMENT
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

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
  registrationNumber: string;
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
    background: '#f4f7fb',
    padding: '24px',
    boxSizing: 'border-box',
    color: '#172033',
    fontFamily: 'Arial, sans-serif',
  },

  container: {
    maxWidth: 1150,
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },

  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#14213d',
  },

  subtitle: {
    color: '#68758a',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 1.6,
  },

  button: {
    border: 'none',
    borderRadius: 10,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    background: '#155eef',
    color: '#fff',
  },

  secondaryButton: {
    border: '1px solid #d5dce8',
    borderRadius: 10,
    padding: '11px 16px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    background: '#fff',
    color: '#24334d',
  },

  card: {
    background: '#fff',
    border: '1px solid #e3e9f2',
    borderRadius: 18,
    padding: 22,
    boxShadow: '0 5px 20px rgba(20, 33, 61, 0.04)',
    minWidth: 0,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 18,
    marginBottom: 22,
  },

  label: {
    display: 'block',
    color: '#69758a',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    border: '1px solid #d5dce8',
    borderRadius: 10,
    fontSize: 15,
    outline: 'none',
    background: '#fff',
    color: '#172033',
  },

  field: {
    marginBottom: 18,
  },

  alert: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 1.6,
  },

  businessCard: {
    background:
      'linear-gradient(135deg, #102a56 0%, #155eef 100%)',
    color: '#fff',
    borderRadius: 18,
    padding: 24,
    minHeight: 190,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  },

  dashboardButton: {
    width: '100%',
    marginTop: 22,
    padding: '14px 18px',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 12,
    background: '#fff',
    color: '#102a56',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
  },

  disabledDashboardButton: {
    width: '100%',
    marginTop: 22,
    padding: '13px 15px',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 13,
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
};

// ============================================================
// HELPERS
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

function normalizeStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase();
}

function isBusinessApproved(
  business: BusinessAccount
): boolean {
  return (
    normalizeStatus(business.verification_status) ===
      'verified' &&
    normalizeStatus(business.status) === 'active' &&
    normalizeStatus(business.account_status) === 'active'
  );
}

function statusColor(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (
    ['active', 'verified', 'approved', 'successful'].includes(
      normalized
    )
  ) {
    return {
      background: '#dcfce7',
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
      background: '#fee2e2',
      color: '#991b1b',
    };
  }

  if (
    ['under_review', 'processing'].includes(normalized)
  ) {
    return {
      background: '#dbeafe',
      color: '#1d4ed8',
    };
  }

  return {
    background: '#fef3c7',
    color: '#92400e',
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
// COMPONENT
// ============================================================

export default function Business() {
  const navigate = useNavigate();

  const [businesses, setBusinesses] =
    useState<BusinessAccount[]>([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<BusinessForm>({
    businessName: '',
    registrationNumber: '',
    businessType: '',
    country: 'NG',
    currency: 'NGN',
    businessAddress: '',
  });

  const token = getToken();

  // ==========================================================
  // LOAD BUSINESSES
  // ==========================================================

  const loadBusinesses = useCallback(async () => {
    const currentToken = getToken();

    if (!currentToken) {
      setError(
        'Please sign in to view your business accounts.'
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
  // UPDATE FORM
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
          currency: value === 'ZA' ? 'ZAR' : 'NGN',
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

            registrationNumber:
              form.registrationNumber.trim(),

            businessType:
              form.businessType.trim(),

            country: form.country,

            currency: form.currency,

            businessAddress:
              form.businessAddress.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'Business registration failed.'
        );
      }

      setSuccess(
        data.message ||
          'Your business application was submitted.'
      );

      setForm({
        businessName: '',
        registrationNumber: '',
        businessType: '',
        country: 'NG',
        currency: 'NGN',
        businessAddress: '',
      });

      setShowForm(false);

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
  // COPY ACCOUNT NUMBER
  // ==========================================================

  async function copyAccountNumber(
    accountNumber?: string
  ) {
    if (!accountNumber) {
      return;
    }

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
  // ==========================================================

  function openBusinessDashboard(
    business: BusinessAccount
  ) {
    if (!isBusinessApproved(business)) {
      setError(
        'This business account is not yet verified, approved, and active.'
      );

      return;
    }

    if (!business.id) {
      setError(
        'The business account ID is missing.'
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

        {/* PAGE HEADER */}

        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>
              Business Banking
            </h1>

            <p style={styles.subtitle}>
              Manage your business profile and business
              accounts separately from your personal banking.
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

        {/* ERROR NOTICE */}

        {error && (
          <div
            role="alert"
            style={{
              ...styles.alert,
              background: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
            }}
          >
            <strong>Notice:</strong> {error}
          </div>
        )}

        {/* SUCCESS NOTICE */}

        {success && (
          <div
            role="status"
            style={{
              ...styles.alert,
              background: '#dcfce7',
              color: '#166534',
              border: '1px solid #bbf7d0',
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
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 21,
                  }}
                >
                  Register a Business
                </h2>

                <p style={styles.subtitle}>
                  Your application will be reviewed before
                  the business account can be activated.
                </p>
              </div>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setShowForm(false)}
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
                    placeholder="Enter registered business name"
                    maxLength={200}
                    required
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Registration Number
                  </label>

                  <input
                    style={styles.input}
                    name="registrationNumber"
                    value={form.registrationNumber}
                    onChange={updateField}
                    placeholder="CAC or company registration number"
                    maxLength={100}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Business Type
                  </label>

                  <select
                    style={styles.input}
                    name="businessType"
                    value={form.businessType}
                    onChange={updateField}
                  >
                    <option value="">
                      Select business type
                    </option>

                    <option value="Sole Proprietorship">
                      Sole Proprietorship
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
                    <option value="NG">
                      Nigeria
                    </option>

                    <option value="ZA">
                      South Africa
                    </option>
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Account Currency
                  </label>

                  <input
                    style={{
                      ...styles.input,
                      background: '#f4f7fb',
                    }}
                    value={form.currency}
                    readOnly
                  />
                </div>

                <div style={styles.field}>
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
                  background: '#eff6ff',
                  color: '#1e40af',
                  padding: 15,
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                <strong>Important:</strong> Submitting
                this form creates a pending business
                application. It does not complete identity
                verification or activate payment services.
                Do not enter passwords, card PINs, or
                banking secrets here.
              </div>

              <button
                type="submit"
                style={{
                  ...styles.button,
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
            <p
              style={{
                margin: 0,
                color: '#68758a',
              }}
            >
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
                  background: '#eff6ff',
                  color: '#155eef',
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
                }}
              >
                Open a Business Account
              </h2>

              <p
                style={{
                  color: '#68758a',
                  maxWidth: 450,
                  margin: '0 auto 24px',
                  lineHeight: 1.7,
                }}
              >
                Create a separate business profile
                and account for your company's banking needs.
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

        {/* BUSINESS ACCOUNT CARDS */}

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

                const approved =
                  isBusinessApproved(business);
               
                  console.log('Business approval details:', {
                id: business.id,
               business_name: business.business_name,
               verification_status: business.verification_status,
              status: business.status,
              account_status: business.account_status,
            });

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
                              opacity: 0.8,
                              marginBottom: 7,
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
                            fontWeight: 700,
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
                          opacity: 0.8,
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
                          {accountNumber ||
                            'Not available'}
                        </strong>

                        {accountNumber && (
                          <button
                            type="button"
                            onClick={() =>
                              copyAccountNumber(
                                accountNumber
                              )
                            }
                            style={{
                              border:
                                '1px solid rgba(255,255,255,0.4)',
                              background: 'transparent',
                              color: '#fff',
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

                    {/* BALANCE AND ACCOUNT STATUS */}

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
                            opacity: 0.8,
                            marginBottom: 5,
                          }}
                        >
                          Available Account Balance
                        </div>

                        <strong
                          style={{
                            fontSize: 24,
                          }}
                        >
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
                        {business.account_status ||
                          'pending'}
                      </span>
                    </div>

                    {/* BUSINESS DASHBOARD BUTTON */}

                    {approved ? (
                      <button
                        type="button"
                        style={styles.dashboardButton}
                        onClick={() =>
                          openBusinessDashboard(business)
                        }
                      >
                        Open Business Dashboard →
                      </button>
                    ) : (
                      <div
                        style={
                          styles.disabledDashboardButton
                        }
                      >
                        Your Business Dashboard will become
                        available once your business is
                        verified, approved, and the business
                        account is active.
                      </div>
                    )}

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
                    }}
                  >
                    Business Applications
                  </h2>

                  <p style={styles.subtitle}>
                    Track verification and account approval.
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={loadBusinesses}
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 16,
                }}
              >
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    style={{
                      border: '1px solid #e3e9f2',
                      borderRadius: 14,
                      padding: 18,
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
                          }}
                        >
                          {business.business_name}
                        </h3>

                        <p
                          style={{
                            margin: '0 0 6px',
                            color: '#68758a',
                            fontSize: 13,
                          }}
                        >
                          Business type:{' '}
                          {business.business_type ||
                            'Not provided'}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: '#68758a',
                            fontSize: 13,
                          }}
                        >
                          Country: {business.country}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: 'block',
                              color: '#68758a',
                              fontSize: 11,
                              marginBottom: 5,
                            }}
                          >
                            VERIFICATION
                          </span>

                          <StatusBadge
                            status={
                              business.verification_status
                            }
                          />
                        </div>

                        <div>
                          <span
                            style={{
                              display: 'block',
                              color: '#68758a',
                              fontSize: 11,
                              marginBottom: 5,
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
                              color: '#68758a',
                              fontSize: 11,
                              marginBottom: 5,
                            }}
                          >
                            BUSINESS ACCOUNT
                          </span>

                          <StatusBadge
                            status={
                              business.account_status
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* APPLICATION STATUS MESSAGE */}

                    <div
                      style={{
                        marginTop: 18,
                        padding: 13,
                        borderRadius: 10,
                        background: '#f4f7fb',
                        color: '#58667c',
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      {approved
                        ? 'Your business has been verified, approved, and activated. You can open your Business Dashboard to access the business banking interface.'
                        : normalizeStatus(
                            business.verification_status
                          ) === 'rejected' ||
                          normalizeStatus(
                            business.status
                          ) === 'rejected'
                        ? 'Your business application was rejected. Please contact Zenimonies support for further information.'
                        : normalizeStatus(
                            business.verification_status
                          ) === 'under_review'
                        ? 'Your business verification is under review. You will be able to access the Business Dashboard after approval and account activation.'
                        : 'Your business application is pending verification and administrator approval. The Business Dashboard is unavailable until all required approvals and account activation are complete.'}
                    </div>

                    {/* APPLICATION DASHBOARD LINK */}

                    {approved && (
                      <button
                        type="button"
                        style={{
                          ...styles.secondaryButton,
                          marginTop: 15,
                          width: '100%',
                          color: '#155eef',
                          borderColor: '#c7d7fe',
                        }}
                        onClick={() =>
                          openBusinessDashboard(business)
                        }
                      >
                        Manage This Business →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* FOOTER */}

        <p
          style={{
            textAlign: 'center',
            color: '#8a95a8',
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
