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
  const [
    beneficiaries,
    setBeneficiaries,
  ] = useState<Beneficiary[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    activeTab,
    setActiveTab,
  ] = useState<'recent' | 'saved'>(
    'recent'
  );

  const getToken = () =>
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem('token') ||
    localStorage.getItem(
      'access_token'
    ) ||
    '';

  useEffect(() => {
    const loadBeneficiaries =
      async () => {
        try {
          setLoading(true);

          const token =
            getToken();

          if (!token) {
            setBeneficiaries([]);
            return;
          }

          const response =
            await fetch(
              `${API_URL}/api/beneficiaries`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
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

          setBeneficiaries(
            Array.isArray(
              data.beneficiaries
            )
              ? data.beneficiaries
              : []
          );
        } catch (error) {
          console.error(
            'Beneficiary tabs error:',
            error
          );

          setBeneficiaries([]);
        } finally {
          setLoading(false);
        }
      };

    loadBeneficiaries();
  }, []);

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

  /*
   * Recent recipients are currently
   * shown using the most recently
   * created/saved recipients.
   *
   * We will connect this to actual
   * transfer history after the
   * transfer-saving flow is completed.
   */
  const recent =
    filteredBeneficiaries.slice(
      0,
      5
    );

  const displayed =
    activeTab === 'saved'
      ? filteredBeneficiaries
      : recent;

  const formatPhone = (
    phone?: string | null
  ) => {
    if (!phone) return '';

    return phone;
  };

  return (
    <section
      style={styles.container}
    >
      <div
        style={styles.tabs}
      >
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'recent'
            )
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
            setActiveTab(
              'saved'
            )
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

      <div
        style={
          styles.content
        }
      >
        {loading ? (
          <div
            style={
              styles.emptyText
            }
          >
            Loading beneficiaries...
          </div>
        ) : displayed.length ===
          0 ? (
          <div
            style={
              styles.emptyCard
            }
          >
            <div
              style={
                styles.emptyIcon
              }
            >
              👤
            </div>

            <div
              style={
                styles.emptyTitle
              }
            >
              {activeTab ===
              'saved'
                ? 'No saved beneficiaries yet'
                : 'No recent recipients yet'}
            </div>

            <div
              style={
                styles.emptyText
              }
            >
              Recipients you use will
              appear here.
            </div>
          </div>
        ) : (
          <div
            style={
              styles.list
            }
          >
            {displayed.map(
              (
                beneficiary
              ) => (
                <button
                  key={
                    beneficiary.id
                  }
                  type="button"
                  onClick={() =>
                    onSelect(
                      beneficiary
                    )
                  }
                  style={
                    styles.item
                  }
                >
                  <div
                    style={
                      styles.avatar
                    }
                  >
                    {beneficiary.name
                      .charAt(
                        0
                      )
                      .toUpperCase()}
                  </div>

                  <div
                    style={
                      styles.info
                    }
                  >
                    <div
                      style={
                        styles.name
                      }
                    >
                      {
                        beneficiary.name
                      }
                    </div>

                    {recipientType ===
                    'zenimonies' ? (
                      <div
                        style={
                          styles.detail
                        }
                      >
                        {formatPhone(
                          beneficiary.recipient_phone
                        )}
                      </div>
                    ) : (
                      <>
                        <div
                          style={
                            styles.detail
                          }
                        >
                          {
                            beneficiary.bank_name
                          }
                        </div>

                        <div
                          style={
                            styles.detail
                          }
                        >
                          {
                            beneficiary.account_number
                          }
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    style={
                      styles.arrow
                    }
                  >
                    ›
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const styles: Record<
  string,
  React.CSSProperties
> = {
  container: {
    marginBottom: 20,
  },

  tabs: {
    display: 'flex',
    gap: 8,
    borderBottom:
      '1px solid #dfe9e4',
    marginBottom: 12,
  },

  tab: {
    flex: 1,
    border: 'none',
    background:
      'transparent',
    color: '#7a8a84',
    padding:
      '12px 8px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    borderBottom:
      '3px solid transparent',
  },

  activeTab: {
    color: '#087f5b',
    borderBottom:
      '3px solid #087f5b',
  },

  content: {
    width: '100%',
  },

  list: {
    display: 'flex',
    flexDirection:
      'column',
    gap: 8,
  },

  item: {
    width: '100%',
    display: 'flex',
    alignItems:
      'center',
    gap: 11,
    padding: 11,
    border:
      '1px solid #e1e9e5',
    borderRadius: 14,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background:
      '#e5f7ef',
    color: '#087f5b',
    display: 'flex',
    alignItems:
      'center',
    justifyContent:
      'center',
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
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  detail: {
    marginTop: 2,
    color: '#7a8a84',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  arrow: {
    color: '#087f5b',
    fontSize: 24,
    fontWeight: 700,
  },

  emptyCard: {
    border:
      '1px solid #e1e9e5',
    borderRadius: 14,
    background:
      '#f8fbf9',
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
