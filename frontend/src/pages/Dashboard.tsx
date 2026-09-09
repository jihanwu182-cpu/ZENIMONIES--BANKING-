import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ServiceKey =
  | 'add-money'
  | 'send-money'
  | 'to-bank'
  | 'withdraw'
  | 'airtime'
  | 'data'
  | 'betting'
  | 'tv'
  | 'bills'
  | 'safebox'
  | 'more';

interface Service {
  key: ServiceKey;
  label: string;
  description: string;
  icon: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeService, setActiveService] = useState<ServiceKey | null>(null);
  const [bankSearch, setBankSearch] = useState('');

  const userName = 'Harrison';

  /*
   * Nigerian banks and payment institutions.
   * OPay is intentionally included here under To Bank,
   * not as a separate dashboard service.
   */
  const banks = [
    'Access Bank',
    'Citibank Nigeria',
    'Ecobank Nigeria',
    'Fidelity Bank',
    'First Bank of Nigeria',
    'First City Monument Bank (FCMB)',
    'Globus Bank',
    'Guaranty Trust Bank (GTBank)',
    'Jaiz Bank',
    'Keystone Bank',
    'Kuda Bank',
    'Lotus Bank',
    'Moniepoint',
    'OPay',
    'Palmpay',
    'Polaris Bank',
    'Premium Trust Bank',
    'Providus Bank',
    'Stanbic IBTC Bank',
    'Standard Chartered Bank',
    'Sterling Bank',
    'SunTrust Bank',
    'Tantita',
    'Titan Trust Bank',
    'Union Bank',
    'United Bank for Africa (UBA)',
    'Unity Bank',
    'Wema Bank',
    'Zenith Bank',
  ];

  const filteredBanks = useMemo(() => {
    const search = bankSearch.trim().toLowerCase();

    if (!search) {
      return banks;
    }

    return banks.filter((bank) =>
      bank.toLowerCase().includes(search)
    );
  }, [bankSearch]);

  const services: Service[] = [
    {
      key: 'add-money',
      label: 'Add Money',
      description: 'Fund your account',
      icon: '+',
    },
    {
      key: 'send-money',
      label: 'Send Money',
      description: 'Transfer money',
      icon: '➤',
    },
    {
      key: 'to-bank',
      label: 'To Bank',
      description: 'Send to any bank',
      icon: '▥',
    },
    {
      key: 'withdraw',
      label: 'Withdraw',
      description: 'Withdraw funds',
      icon: '↗',
    },
    {
      key: 'airtime',
      label: 'Airtime',
      description: 'Buy airtime',
      icon: '▥',
    },
    {
      key: 'data',
      label: 'Data',
      description: 'Buy data',
      icon: '↕',
    },
    {
      key: 'betting',
      label: 'Betting',
      description: 'Fund your bets',
      icon: '⚽',
    },
    {
      key: 'tv',
      label: 'TV',
      description: 'Pay TV bills',
      icon: '▣',
    },
    {
      key: 'bills',
      label: 'Bills',
      description: 'Pay your bills',
      icon: '▤',
    },
    {
      key: 'safebox',
      label: 'SafeBox',
      description: 'Keep money safe',
      icon: '▣',
    },
    {
      key: 'more',
      label: 'More',
      description: 'More services',
      icon: '•••',
    },
  ];

  const closeService = () => {
    setActiveService(null);
    setBankSearch('');
  };

  const handleServiceClick = (key: ServiceKey) => {
    setActiveService(key);

    if (key !== 'to-bank') {
      setBankSearch('');
    }
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleKYC = () => {
    navigate('/kyc');
  };

  const handleTransactions = () => {
    navigate('/transactions');
  };

  const handleWallet = () => {
    navigate('/wallet');
  };

  const activeServiceData = services.find(
    (service) => service.key === activeService
  );

  return (
    <div style={styles.page}>
      {/* =========================
          HEADER
      ========================== */}
      <header style={styles.header}>
        <div style={styles.brandArea}>
          <div style={styles.logo}>Z</div>

          <div>
            <div style={styles.brandName}>Zenimonies</div>
            <div style={styles.brandSubtitle}>DIGITAL BANKING</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            type="button"
            style={styles.notificationButton}
            aria-label="Notifications"
          >
            ♧
            <span style={styles.notificationDot} />
          </button>

          <div style={styles.headerDivider} />

          <button
            type="button"
            style={styles.avatar}
            onClick={handleProfile}
            aria-label="Open profile"
          >
            {userName.charAt(0)}
          </button>

          <button
            type="button"
            style={styles.nameButton}
            onClick={handleProfile}
          >
            <span>{userName}</span>
            <span style={styles.chevron}>⌄</span>
          </button>
        </div>
      </header>

      <main style={styles.content}>
        {/* =========================
            WELCOME
        ========================== */}
        <section style={styles.welcomeSection}>
          <div>
            <div style={styles.welcomeSmall}>Welcome back,</div>

            <h1 style={styles.welcomeName}>{userName}</h1>

            <p style={styles.welcomeText}>
              Here’s your financial overview.
            </p>
          </div>

          <button
            type="button"
            style={styles.verifiedBadge}
            onClick={handleKYC}
          >
            <span style={styles.verifiedDot}>✓</span>
            Tier 1 Verified
          </button>
        </section>

        {/* =========================
            BALANCE CARD
        ========================== */}
        <section style={styles.balanceCard}>
          <div style={styles.balanceGlowOne} />
          <div style={styles.balanceGlowTwo} />

          <div style={styles.balanceTop}>
            <div>
              <div style={styles.balanceLabel}>
                Available Balance
              </div>

              <div style={styles.balanceAmount}>
                {balanceVisible ? '₦0.00' : '₦••••'}
              </div>
            </div>

            <button
              type="button"
              style={styles.hideButton}
              onClick={() =>
                setBalanceVisible((previous) => !previous)
              }
            >
              <span style={styles.eyeIcon}>
                {balanceVisible ? '◉' : '○'}
              </span>

              {balanceVisible ? 'Hide' : 'Show'}
            </button>
          </div>

          <div style={styles.balanceActions}>
            <button
              type="button"
              style={styles.addMoneyButton}
              onClick={() => handleServiceClick('add-money')}
            >
              <span style={styles.addCircle}>+</span>
              <span>Add Money</span>
              <span style={styles.actionArrow}>›</span>
            </button>

            <button
              type="button"
              style={styles.sendMoneyButton}
              onClick={() => handleServiceClick('send-money')}
            >
              <span style={styles.sendIcon}>➤</span>
              <span>Send Money</span>
              <span style={styles.actionArrow}>›</span>
            </button>
          </div>
        </section>

        {/* =========================
            QUICK ACTIONS
        ========================== */}
        <section style={styles.servicesSection}>
          <div style={styles.servicesHeader}>
            <h2 style={styles.servicesTitle}>Quick Actions</h2>

            <button
              type="button"
              style={styles.seeAllButton}
              onClick={() => handleServiceClick('more')}
            >
              See all
              <span>›</span>
            </button>
          </div>

          <div style={styles.servicesGrid}>
            {services.map((service) => (
              <button
                key={service.key}
                type="button"
                style={styles.serviceButton}
                onClick={() => handleServiceClick(service.key)}
              >
                <span
                  style={{
                    ...styles.serviceIconBox,
                    ...(service.key === 'send-money'
                      ? styles.sendServiceIcon
                      : {}),
                  }}
                >
                  {service.icon}
                </span>

                <span style={styles.serviceLabel}>
                  {service.label}
                </span>

                <span style={styles.serviceDescription}>
                  {service.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* =========================
            ACCOUNT VERIFICATION
        ========================== */}
        <section style={styles.verificationCard}>
          <div style={styles.verificationIcon}>✓</div>

          <div style={styles.verificationText}>
            <h3 style={styles.verificationTitle}>
              Account Verification
            </h3>

            <p style={styles.verificationDescription}>
              Complete your KYC to increase your limits.
            </p>
          </div>

          <button
            type="button"
            style={styles.verifyButton}
            onClick={handleKYC}
          >
            Verify Now
            <span>›</span>
          </button>
        </section>
      </main>

      {/* =========================
          BOTTOM NAVIGATION
      ========================== */}
      <nav style={styles.bottomNav}>
        <button
          type="button"
          style={{
            ...styles.navButton,
            ...styles.activeNavButton,
          }}
          onClick={() => navigate('/')}
        >
          <span style={styles.navIcon}>⌂</span>
          <span>Home</span>
        </button>

        <button
          type="button"
          style={styles.navButton}
          onClick={handleTransactions}
        >
          <span style={styles.navIcon}>↕</span>
          <span>Transactions</span>
        </button>

        <button
          type="button"
          style={styles.navButton}
          onClick={handleWallet}
        >
          <span style={styles.navIcon}>▱</span>
          <span>Wallet</span>
        </button>

        <button
          type="button"
          style={styles.navButton}
          onClick={handleProfile}
        >
          <span style={styles.navIcon}>♙</span>
          <span>Profile</span>
        </button>
      </nav>

      {/* =========================
          SERVICE MODAL
      ========================== */}
      {activeService && (
        <div
          style={styles.modalOverlay}
          onClick={closeService}
          role="presentation"
        >
          <div
            style={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={styles.modalHandle} />

            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>
                  ZENIMONIES
                </div>

                <h2 style={styles.modalTitle}>
                  {activeServiceData?.label}
                </h2>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={closeService}
              >
                ×
              </button>
            </div>

            {/* TO BANK */}
            {activeService === 'to-bank' && (
              <>
                <p style={styles.modalDescription}>
                  Search and choose the bank you want to send
                  money to. OPay is included here.
                </p>

                <div style={styles.searchBox}>
                  <span style={styles.searchIcon}>⌕</span>

                  <input
                    type="text"
                    value={bankSearch}
                    onChange={(event) =>
                      setBankSearch(event.target.value)
                    }
                    placeholder="Search for a bank"
                    style={styles.searchInput}
                    autoFocus
                  />
                </div>

                <div style={styles.bankList}>
                  {filteredBanks.length === 0 ? (
                    <div style={styles.noResults}>
                      No bank found.
                    </div>
                  ) : (
                    filteredBanks.map((bank) => (
                      <button
                        type="button"
                        key={bank}
                        style={styles.bankItem}
                        onClick={() => {
                          alert(
                            `${bank} selected. Bank transfer form will open here.`
                          );
                        }}
                      >
                        <span style={styles.bankLogo}>
                          {bank.charAt(0)}
                        </span>

                        <span style={styles.bankName}>
                          {bank}
                        </span>

                        <span style={styles.bankArrow}>›</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ADD MONEY */}
            {activeService === 'add-money' && (
              <>
                <p style={styles.modalDescription}>
                  Add funds to your Zenimonies account securely.
                </p>

                <div style={styles.amountBox}>
                  <label style={styles.amountLabel}>
                    Amount
                  </label>

                  <div style={styles.amountInputWrapper}>
                    <span style={styles.naira}>₦</span>

                    <input
                      type="number"
                      placeholder="0.00"
                      style={styles.amountInput}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  style={styles.primaryModalButton}
                  onClick={() =>
                    alert(
                      'Add Money payment flow will open here.'
                    )
                  }
                >
                  Continue
                </button>
              </>
            )}

            {/* SEND MONEY */}
            {activeService === 'send-money' && (
              <>
                <p style={styles.modalDescription}>
                  Choose where you want to send your money.
                </p>

                <button
                  type="button"
                  style={styles.modalOption}
                  onClick={() => handleServiceClick('to-bank')}
                >
                  <span style={styles.modalOptionIcon}>
                    ▥
                  </span>

                  <span>
                    <strong>To Bank</strong>
                    <small>
                      Send money to any Nigerian bank
                    </small>
                  </span>

                  <span>›</span>
                </button>

                <button
                  type="button"
                  style={styles.modalOption}
                  onClick={() =>
                    alert(
                      'Zenimonies-to-Zenimonies transfer will open here.'
                    )
                  }
                >
                  <span style={styles.modalOptionIcon}>
                    Z
                  </span>

                  <span>
                    <strong>Zenimonies User</strong>
                    <small>
                      Send money to another customer
                    </small>
                  </span>

                  <span>›</span>
                </button>
              </>
            )}

            {/* OTHER SERVICES */}
            {activeService !== 'to-bank' &&
              activeService !== 'add-money' &&
              activeService !== 'send-money' && (
                <>
                  <div style={styles.largeServiceIcon}>
                    {activeServiceData?.icon}
                  </div>

                  <p style={styles.modalDescriptionCenter}>
                    {activeServiceData?.description}.
                  </p>

                  <button
                    type="button"
                    style={styles.primaryModalButton}
                    onClick={() =>
                      alert(
                        `${activeServiceData?.label} service selected.`
                      )
                    }
                  >
                    Continue
                  </button>
                </>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   STYLES
============================================================ */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #f7fbfa 0%, #f1f7f5 100%)',
    color: '#102b28',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    paddingBottom: '96px',
    boxSizing: 'border-box',
  },

  header: {
    minHeight: '72px',
    background: '#ffffff',
    borderBottom: '1px solid #edf2f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 5%',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  logo: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background:
      'linear-gradient(145deg, #087c51, #10a66d)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '27px',
    fontWeight: 800,
  },

  brandName: {
    fontSize: '21px',
    lineHeight: 1,
    fontWeight: 800,
    color: '#102b28',
  },

  brandSubtitle: {
    marginTop: '4px',
    fontSize: '10px',
    letterSpacing: '1.5px',
    color: '#9aa7a4',
    fontWeight: 700,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },

  notificationButton: {
    position: 'relative',
    border: 0,
    background: 'transparent',
    fontSize: '25px',
    color: '#647572',
    cursor: 'pointer',
  },

  notificationDot: {
    position: 'absolute',
    top: '0px',
    right: '1px',
    width: '8px',
    height: '8px',
    background: '#e53935',
    borderRadius: '50%',
    border: '2px solid #ffffff',
  },

  headerDivider: {
    width: '1px',
    height: '32px',
    background: '#e2e9e6',
  },

  avatar: {
    width: '42px',
    height: '42px',
    border: 0,
    borderRadius: '50%',
    background: '#e5f3ee',
    color: '#087c51',
    fontSize: '18px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  nameButton: {
    border: 0,
    background: 'transparent',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    color: '#152c2a',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
  },

  chevron: {
    fontSize: '20px',
    color: '#778681',
  },

  content: {
    width: '92%',
    maxWidth: '1050px',
    margin: '0 auto',
    paddingTop: '28px',
  },

  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '22px',
  },

  welcomeSmall: {
    color: '#71817e',
    fontSize: '17px',
    marginBottom: '2px',
  },

  welcomeName: {
    margin: 0,
    fontSize: '39px',
    lineHeight: 1.05,
    letterSpacing: '-1.2px',
    color: '#102b3b',
  },

  welcomeText: {
    margin: '7px 0 0',
    color: '#73817e',
    fontSize: '16px',
  },

  verifiedBadge: {
    border: '1px solid #c7eee0',
    background: '#edfbf6',
    color: '#087c51',
    borderRadius: '30px',
    padding: '11px 18px',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  verifiedDot: {
    width: '21px',
    height: '21px',
    borderRadius: '50%',
    background: '#0b9a65',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },

  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: '190px',
    borderRadius: '27px',
    padding: '27px 30px',
    boxSizing: 'border-box',
    background:
      'linear-gradient(135deg, #086a4a 0%, #07865b 50%, #0ca56d 100%)',
    boxShadow: '0 15px 40px rgba(6, 110, 76, 0.15)',
    marginBottom: '28px',
  },

  balanceGlowOne: {
    position: 'absolute',
    width: '430px',
    height: '220px',
    borderRadius: '50%',
    right: '-160px',
    bottom: '-100px',
    background: 'rgba(255,255,255,0.08)',
    transform: 'rotate(-12deg)',
  },

  balanceGlowTwo: {
    position: 'absolute',
    width: '280px',
    height: '180px',
    borderRadius: '50%',
    right: '80px',
    top: '-110px',
    background: 'rgba(255,255,255,0.06)',
  },

  balanceTop: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: '16px',
    fontWeight: 500,
  },

  balanceAmount: {
    marginTop: '8px',
    color: '#ffffff',
    fontSize: '45px',
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: '-1.5px',
  },

  hideButton: {
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'rgba(255,255,255,0.07)',
    color: '#ffffff',
    borderRadius: '15px',
    padding: '10px 15px',
    fontSize: '13px',
    fontWeight: 700,
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    cursor: 'pointer',
  },

  eyeIcon: {
    fontSize: '16px',
  },

  balanceActions: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: '12px',
    marginTop: '27px',
  },

  addMoneyButton: {
    minHeight: '50px',
    minWidth: '165px',
    border: 0,
    borderRadius: '16px',
    background: '#ffffff',
    color: '#0a4e3b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
  },

  sendMoneyButton: {
    minHeight: '50px',
    minWidth: '165px',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  addCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#0a9b66',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },

  sendIcon: {
    fontSize: '18px',
  },

  actionArrow: {
    fontSize: '22px',
    marginLeft: '2px',
  },

  servicesSection: {
    background: '#ffffff',
    borderRadius: '25px',
    padding: '23px',
    boxSizing: 'border-box',
    boxShadow: '0 8px 30px rgba(20, 65, 55, 0.05)',
    marginBottom: '25px',
  },

  servicesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },

  servicesTitle: {
    margin: 0,
    fontSize: '22px',
    color: '#122e3d',
  },

  seeAllButton: {
    border: 0,
    background: 'transparent',
    color: '#087c51',
    fontWeight: 800,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
  },

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(115px, 1fr))',
    gap: '20px 14px',
  },

  serviceButton: {
    border: 0,
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    minWidth: 0,
    padding: '3px',
  },

  serviceIconBox: {
    width: '68px',
    height: '68px',
    borderRadius: '21px',
    background: '#e9f8f3',
    color: '#0a9865',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '27px',
    fontWeight: 800,
    marginBottom: '9px',
  },

  sendServiceIcon: {
    background: '#e1f5ee',
  },

  serviceLabel: {
    color: '#102b3b',
    fontSize: '15px',
    fontWeight: 750,
    textAlign: 'center',
  },

  serviceDescription: {
    color: '#899692',
    fontSize: '10px',
    marginTop: '4px',
    textAlign: 'center',
  },

  verificationCard: {
    background:
      'linear-gradient(100deg, #effbf7, #ffffff)',
    border: '1px solid #e1f1ec',
    borderRadius: '23px',
    minHeight: '95px',
    padding: '17px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxSizing: 'border-box',
  },

  verificationIcon: {
    flexShrink: 0,
    width: '54px',
    height: '54px',
    borderRadius: '17px',
    background: '#dcf7ed',
    color: '#079360',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    fontWeight: 800,
  },

  verificationText: {
    flex: 1,
  },

  verificationTitle: {
    margin: 0,
    fontSize: '17px',
    color: '#0b503d',
  },

  verificationDescription: {
    margin: '4px 0 0',
    color: '#758581',
    fontSize: '13px',
  },

  verifyButton: {
    border: 0,
    background: '#079660',
    color: '#ffffff',
    borderRadius: '14px',
    padding: '13px 18px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '73px',
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(15px)',
    borderTop: '1px solid #e8efec',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    zIndex: 30,
  },

  navButton: {
    border: 0,
    background: 'transparent',
    color: '#7b8885',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    fontSize: '11px',
    fontWeight: 650,
    cursor: 'pointer',
  },

  activeNavButton: {
    color: '#078e5d',
  },

  navIcon: {
    fontSize: '23px',
    lineHeight: 1,
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8, 28, 24, 0.48)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    padding: 0,
  },

  modal: {
    width: '100%',
    maxWidth: '620px',
    maxHeight: '88vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: '27px 27px 0 0',
    padding: '12px 22px 28px',
    boxSizing: 'border-box',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
  },

  modalHandle: {
    width: '42px',
    height: '4px',
    borderRadius: '10px',
    background: '#d5dfdc',
    margin: '0 auto 18px',
  },

  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
  },

  modalEyebrow: {
    color: '#0a9562',
    fontSize: '10px',
    letterSpacing: '1.5px',
    fontWeight: 800,
  },

  modalTitle: {
    margin: '4px 0 0',
    color: '#102b3b',
    fontSize: '25px',
  },

  closeButton: {
    border: 0,
    background: '#f0f5f3',
    color: '#64736f',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    fontSize: '23px',
    cursor: 'pointer',
  },

  modalDescription: {
    color: '#74837f',
    fontSize: '14px',
    lineHeight: 1.5,
    margin: '13px 0 18px',
  },

  modalDescriptionCenter: {
    color: '#74837f',
    fontSize: '14px',
    textAlign: 'center',
    margin: '14px 0 22px',
  },

  searchBox: {
    height: '51px',
    border: '1px solid #dce7e3',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 15px',
    gap: '9px',
    background: '#f8fbfa',
    boxSizing: 'border-box',
    marginBottom: '14px',
  },

  searchIcon: {
    color: '#778681',
    fontSize: '23px',
  },

  searchInput: {
    border: 0,
    outline: 0,
    background: 'transparent',
    width: '100%',
    fontSize: '15px',
    color: '#19312e',
  },

  bankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },

  bankItem: {
    width: '100%',
    border: '1px solid #edf2f0',
    background: '#ffffff',
    borderRadius: '15px',
    minHeight: '58px',
    padding: '8px 11px',
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    cursor: 'pointer',
    textAlign: 'left',
  },

  bankLogo: {
    width: '37px',
    height: '37px',
    borderRadius: '11px',
    background: '#e8f7f1',
    color: '#078d5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  bankName: {
    flex: 1,
    color: '#19312e',
    fontSize: '13px',
    fontWeight: 700,
  },

  bankArrow: {
    color: '#8a9995',
    fontSize: '22px',
  },

  noResults: {
    textAlign: 'center',
    padding: '25px',
    color: '#7d8b87',
    fontSize: '14px',
  },

  amountBox: {
    marginBottom: '18px',
  },

  amountLabel: {
    display: 'block',
    color: '#51635f',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '7px',
  },

  amountInputWrapper: {
    height: '55px',
    border: '1px solid #dce7e3',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 15px',
    background: '#f8fbfa',
  },

  naira: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0a8e5c',
  },

  amountInput: {
    border: 0,
    outline: 0,
    background: 'transparent',
    width: '100%',
    fontSize: '18px',
    paddingLeft: '9px',
  },

  primaryModalButton: {
    width: '100%',
    height: '52px',
    border: 0,
    borderRadius: '15px',
    background: '#078f5d',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  modalOption: {
    width: '100%',
    minHeight: '70px',
    border: '1px solid #e7efec',
    background: '#ffffff',
    borderRadius: '17px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 13px',
    marginBottom: '10px',
    color: '#172f2c',
    textAlign: 'left',
    cursor: 'pointer',
  },

  modalOptionIcon: {
    width: '43px',
    height: '43px',
    borderRadius: '13px',
    background: '#e8f8f2',
    color: '#078f5d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '19px',
  },

  largeServiceIcon: {
    width: '75px',
    height: '75px',
    borderRadius: '22px',
    background: '#e8f8f2',
    color: '#078f5d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '22px auto 0',
    fontSize: '30px',
    fontWeight: 800,
  },
};

/* ============================================================
   MOBILE RESPONSIVE ADJUSTMENTS
============================================================ */

const responsiveStyle = document.createElement('style');

responsiveStyle.innerHTML = `
  @media (max-width: 600px) {
    .zenimonies-mobile-fix {
      width: 100%;
    }
  }
`;

if (
  typeof document !== 'undefined' &&
  !document.getElementById('zenimonies-responsive-style')
) {
  responsiveStyle.id = 'zenimonies-responsive-style';
  document.head.appendChild(responsiveStyle);
}

export default Dashboard;
