
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

  onSelect: (
    beneficiary: Beneficiary
  ) => void;
}

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const BeneficiaryTabs: React.FC<
  BeneficiaryTabsProps
> = ({
  recipientType,
  onSelect,
}) => {
  // ============================================================
  // STATE
  // ============================================================

  // Beneficiaries are hidden when the page first opens.
  const [
    isExpanded,
    setIsExpanded,
  ] = useState(false);

  const [
    beneficiaries,
    setBeneficiaries,
  ] = useState<Beneficiary[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    hasLoaded,
    setHasLoaded,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] = useState<'recent' | 'saved'>(
    'recent'
  );

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  const getToken = () =>
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem('token') ||
    localStorage.getItem(
      'access_token'
    ) ||
    '';

  // ============================================================
  // LOAD BENEFICIARIES ONLY WHEN OPENED
  // ============================================================

  useEffect(() => {
    if (!isExpanded || hasLoaded) {
      return;
    }

    let cancelled = false;

    const loadBeneficiaries =
      async () => {
        try {
          setLoading(true);

          const token = getToken();

          if (!token) {
            if (!cancelled) {
              setBeneficiaries([]);
              setHasLoaded(true);
            }

            return;
          }

          const response = await fetch(
            `${API_URL}/api/beneficiaries`,
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
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
                'Unable to load beneficiaries.'
            );
          }

          if (!cancelled) {
            setBeneficiaries(
              Array.isArray(
                data.beneficiaries
              )
                ? data.beneficiaries
                : []
            );

            setHasLoaded(true);
          }
        } catch (error) {
          console.error(
            'Beneficiary tabs error:',
            error
          );

          if (!cancelled) {
            setBeneficiaries([]);
            setHasLoaded(true);
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
  }, [
    isExpanded,
    hasLoaded,
  ]);

  // ============================================================
  // FILTER BY RECIPIENT TYPE
  // ============================================================

  const filteredBeneficiaries =
    useMemo(() => {
      return beneficiaries.filter(
        (beneficiary) =>
          beneficiary.recipient_type ===
          recipientType
      );
    }, [
      beneficiaries,
      recipientType,
    ]);

  // ============================================================
  // RECENT / SAVED
  // ============================================================

  const recent =
    filteredBeneficiaries.slice(
      0,
      5
    );

  const displayed =
    activeTab === 'saved'
      ? filteredBeneficiaries
      : recent;

  // ============================================================
  // HELPERS
  // ============================================================

  const formatPhone = (
    phone?: string | null
  ) => {
    if (!phone) {
      return '';
    }

    return phone;
  };

  const handleToggle = () => {
    setIsExpanded(
      (previous) => !previous
    );
  };

  const handleSelect = (
    beneficiary: Beneficiary
  ) => {
    onSelect(beneficiary);

    // Close the list after selecting a recipient.
    setIsExpanded(false);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section
      style={styles.container}
    >
      {/* ======================================================
          BENEFICIARY COLLAPSIBLE HEADER
      ====================================================== */}

      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="zenimonies-beneficiary-list"
        style={{
          ...styles.header,
          ...(isExpanded
            ? styles.headerExpanded
            : {}),
        }}
      >
        <div
          style={styles.headerLeft}
        >
          <div
            style={styles.headerIcon}
          >
            👤
          </div>

          <div
            style={styles.headerInfo}
          >
            <div
              style={styles.headerTitle}
            >
              Beneficiary
            </div>

            <div
              style={styles.headerSubtitle}
            >
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

      {/* ======================================================
          BENEFICIARY LIST
          HIDDEN UNTIL HEADER IS TAPPED
      ====================================================== */}

      {isExpanded && (
        <div
          id="zenimonies-beneficiary-list"
          style={styles.expandedContent}
        >
          {/* --------------------------------------------------
              RECENT / SAVED TABS
          -------------------------------------------------- */}

          <div
            style={styles.tabs}
          >
            <button
              type="button"
              onClick={() =>
                setActiveTab('recent')
              }
              style={{
                ...styles.tab,
                ...(activeTab ===
                'recent'
                  ? styles.activeTab
                  : {}),
              }}
            >
              Recent
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab('saved')
              }
              style={{
                ...styles.tab,
                ...(activeTab ===
                'saved'
                  ? styles.activeTab
                  : {}),
              }}
            >
              Saved Beneficiary
            </button>
          </div>

          {/* --------------------------------------------------
              LOADING / EMPTY / LIST
          -------------------------------------------------- */}

          <div
            style={styles.content}
          >
            {loading ? (
              <div
                style={styles.emptyText}
              >
                Loading beneficiaries...
              </div>
            ) : displayed.length === 0 ? (
              <div
                style={styles.emptyCard}
              >
                <div
                  style={styles.emptyIcon}
                >
                  👤
                </div>

                <div
                  style={styles.emptyTitle}
                >
                  {activeTab === 'saved'
                    ? 'No saved beneficiaries yet'
                    : 'No recent recipients yet'}
                </div>

                <div
                  style={styles.emptyText}
                >
                  Recipients you use will
                  appear here.
                </div>
              </div>
            ) : (
              <div
                style={styles.list}
              >
                {displayed.map(
                  (beneficiary) => (
                    <button
                      key={beneficiary.id}
                      type="button"
                      onClick={() =>
                        handleSelect(
                          beneficiary
                        )
                      }
                      style={styles.item}
                    >
                      <div
                        style={styles.avatar}
                      >
                        {(
                          beneficiary.name ||
                          'B'
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div
                        style={styles.info}
                      >
                        <div
                          style={styles.name}
                        >
                          {beneficiary.name}
                        </div>

                        {recipientType ===
                        'zenimonies' ? (
                          <div
                            style={styles.detail}
                          >
                            {formatPhone(
                              beneficiary.recipient_phone
                            )}
                          </div>
                        ) : (
                          <>
                            <div
                              style={styles.detail}
                            >
                              {beneficiary.bank_name}
                            </div>

                            <div
                              style={styles.detail}
                            >
                              {beneficiary.account_number}
                            </div>
                          </>
                        )}
                      </div>

                      <div
                        style={styles.arrow}
                      >
                        ›
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles: Record<
  string,
  React.CSSProperties
> = {
  container: {
    width: '100%',
    marginBottom: 20,
  },

  // ==========================================================
  // COLLAPSIBLE HEADER
  // ==========================================================

  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '15px 16px',
    border: '1px solid #dfe9e4',
    borderRadius: 16,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
    transition: 'border-radius 0.2s ease',
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
    width: 42,
    height: 42,
    borderRadius: 14,
    background: '#e5f7ef',
    color: '#087f5b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },

  headerInfo: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: '#17362a',
    fontSize: 15,
    fontWeight: 850,
  },

  headerSubtitle: {
    marginTop: 4,
    color: '#7a8a84',
    fontSize: 11,
    fontWeight: 500,
  },

  chevron: {
    color: '#087f5b',
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1,
    flexShrink: 0,
    transition: 'transform 0.2s ease',
  },

  // ==========================================================
  // EXPANDED CONTENT
  // ==========================================================

  expandedContent: {
    border: '1px solid #dfe9e4',
    borderTop: 'none',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    background: '#ffffff',
    padding: '0 12px 14px',
    boxSizing: 'border-box',
  },

  tabs: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid #dfe9e4',
    marginBottom: 12,
  },

  tab: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    color: '#7a8a84',
    padding: '12px 8px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
  },

  activeTab: {
    color: '#087f5b',
    borderBottom: '3px solid #087f5b',
  },

  content: {
    width: '100%',
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
    borderRadius: 14,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#e5f7ef',
    color: '#087f5b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 850,
    flexShrink: 0,
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: '#17362a',
    fontSize: 13,
    fontWeight: 850,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  detail: {
    marginTop: 2,
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
    borderRadius: 14,
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
    marginTop: 4,
    color: '#899790',
    fontSize: 11,
    textAlign: 'center',
  },
};

export default BeneficiaryTabs;
