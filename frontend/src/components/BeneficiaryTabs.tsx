
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

interface Beneficiary {
  id: string;
  name: string;
  bank_name: string;
  bank_code?: string | null;
  account_number?: string | null;
  recipient_type: 'zenimonies' | 'bank';
  recipient_phone?: string | null;
  created_at?: string;
}

interface BeneficiaryTabsProps {
  recipientType: 'zenimonies' | 'bank';
  onSelect: (beneficiary: Beneficiary) => void;
}

const API_BASE = (
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api'
).replace(/\/+$/, '');

const BENEFICIARIES_URL = API_BASE.endsWith('/api')
  ? `${API_BASE}/beneficiaries`
  : `${API_BASE}/api/beneficiaries`;

const BeneficiaryTabs: React.FC<BeneficiaryTabsProps> = ({
  recipientType,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [beneficiaries, setBeneficiaries] =
    useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const getToken = () =>
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    '';

  // Load saved beneficiaries only when the customer
  // opens the Beneficiary section.
  useEffect(() => {
    if (!isExpanded || hasLoaded) return;

    let cancelled = false;

    const loadBeneficiaries = async () => {
      try {
        setLoading(true);
        setLoadError('');

        const token = getToken();

        if (!token) {
          throw new Error('Please sign in again.');
        }

        const response = await fetch(
          BENEFICIARIES_URL,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load beneficiaries.'
          );
        }

        if (!cancelled) {
          setBeneficiaries(
            Array.isArray(data.beneficiaries)
              ? data.beneficiaries
              : []
          );
          setHasLoaded(true);
        }
      } catch (error: any) {
        console.error(
          'Beneficiary loading error:',
          error
        );

        if (!cancelled) {
          setLoadError(
            error?.message ||
              'Unable to load beneficiaries.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBeneficiaries();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, hasLoaded]);

  // Only display the requested beneficiary type.
  const filteredBeneficiaries = useMemo(
    () =>
      beneficiaries.filter(
        (beneficiary) =>
          beneficiary.recipient_type === recipientType
      ),
    [beneficiaries, recipientType]
  );

  const handleToggle = () => {
    setIsExpanded((previous) => !previous);
  };

  const handleSelect = (
    beneficiary: Beneficiary
  ) => {
    onSelect(beneficiary);
    setIsExpanded(false);
  };

  const handleRetry = () => {
    setHasLoaded(false);
    setLoadError('');
  };

  return (
    <section style={styles.container}>
      {/* SAVED BENEFICIARIES HEADER */}

      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="zenimonies-saved-beneficiaries"
        style={{
          ...styles.header,
          ...(isExpanded
            ? styles.headerExpanded
            : {}),
        }}
      >
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            👤
          </div>

          <div style={styles.headerInfo}>
            <div style={styles.headerTitle}>
              Beneficiaries
            </div>

            <div style={styles.headerSubtitle}>
              {isExpanded
                ? 'Select a saved recipient'
                : 'Tap to view saved beneficiaries'}
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.chevron,
            transform: isExpanded
              ? 'rotate(90deg)'
              : 'rotate(0deg)',
          }}
        >
          ›
        </div>
      </button>

      {/* SAVED LIST ONLY — NO RECENT TAB */}

      {isExpanded && (
        <div
          id="zenimonies-saved-beneficiaries"
          style={styles.expandedContent}
        >
          {loading ? (
            <div style={styles.emptyText}>
              Loading saved beneficiaries...
            </div>
          ) : loadError ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyTitle}>
                Unable to load beneficiaries
              </div>

              <div style={styles.emptyText}>
                {loadError}
              </div>

              <button
                type="button"
                onClick={handleRetry}
                style={styles.retryButton}
              >
                Try again
              </button>
            </div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>
                👤
              </div>

              <div style={styles.emptyTitle}>
                No saved beneficiaries yet
              </div>

              <div style={styles.emptyText}>
                Beneficiaries you save will appear here.
              </div>
            </div>
          ) : (
            <div style={styles.list}>
              {filteredBeneficiaries.map(
                (beneficiary) => (
                  <button
                    key={beneficiary.id}
                    type="button"
                    onClick={() =>
                      handleSelect(beneficiary)
                    }
                    style={styles.item}
                  >
                    <div style={styles.avatar}>
                      {(beneficiary.name || 'B')
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div style={styles.info}>
                      <div style={styles.name}>
                        {beneficiary.name}
                      </div>

                      {recipientType === 'zenimonies' ? (
                        <div style={styles.detail}>
                          {beneficiary.recipient_phone ||
                            'Zenimonies recipient'}
                        </div>
                      ) : (
                        <>
                          <div style={styles.detail}>
                            {beneficiary.bank_name}
                          </div>

                          <div style={styles.detail}>
                            {beneficiary.account_number}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={styles.arrow}>
                      ›
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    marginBottom: 20,
  },

  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '13px 15px',
    border: '1px solid #dfe9e4',
    borderRadius: 15,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  },

  headerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottom: '1px solid #e1e9e5',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: '#e5f7ef',
    color: '#087f5b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    flexShrink: 0,
  },

  headerInfo: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: '#17362a',
    fontSize: 14,
    fontWeight: 800,
  },

  headerSubtitle: {
    marginTop: 3,
    color: '#7a8a84',
    fontSize: 11,
  },

  chevron: {
    color: '#087f5b',
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
    flexShrink: 0,
    transition: 'transform 0.2s ease',
  },

  expandedContent: {
    border: '1px solid #dfe9e4',
    borderTop: 'none',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    background: '#ffffff',
    padding: '12px',
    boxSizing: 'border-box',
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  item: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: 11,
    border: '1px solid #e1e9e5',
    borderRadius: 13,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: '#e5f7ef',
    color: '#087f5b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 800,
    flexShrink: 0,
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: '#17362a',
    fontSize: 13,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  detail: {
    marginTop: 3,
    color: '#7a8a84',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  arrow: {
    color: '#087f5b',
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },

  emptyCard: {
    border: '1px solid #e1e9e5',
    borderRadius: 13,
    background: '#f8fbf9',
    padding: 16,
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: 22,
    marginBottom: 6,
  },

  emptyTitle: {
    color: '#365149',
    fontSize: 12,
    fontWeight: 800,
  },

  emptyText: {
    marginTop: 5,
    color: '#899790',
    fontSize: 11,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 12,
    padding: '9px 18px',
    border: 'none',
    borderRadius: 10,
    background: '#087f5b',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
};

export default BeneficiaryTabs;
