import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Service = {
  name: string;
  icon: string;
  description: string;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [showBalance, setShowBalance] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [activeService, setActiveService] = useState<string | null>(null);

  const services: Service[] = [
    {
      name: 'Add Money',
      icon: '＋',
      description: 'Fund your account',
    },
    {
      name: 'Send Money',
      icon: '➤',
      description: 'Transfer money',
    },
    {
      name: 'To Bank',
      icon: '▥',
      description: 'Send to any bank',
    },
    {
      name: 'Withdraw',
      icon: '↗',
      description: 'Withdraw funds',
    },
    {
      name: 'Airtime',
      icon: '▯',
      description: 'Buy airtime',
    },
    {
      name: 'Data',
      icon: '▥',
      description: 'Buy data',
    },
    {
      name: 'Betting',
      icon: '⚽',
      description: 'Fund your bets',
    },
    {
      name: 'TV',
      icon: '▣',
      description: 'Pay TV bills',
    },
    {
      name: 'Bills',
      icon: '▤',
      description: 'Pay your bills',
    },
    {
      name: 'SafeBox',
      icon: '🔒',
      description: 'Save securely',
    },
    {
      name: 'More',
      icon: '•••',
      description: 'More services',
    },
  ];

  const handleServiceClick = (service: string) => {
    /*
      Existing pages in your current App.tsx:
      /profile
      /kyc
      /verify-phone

      For services that don't yet have separate pages,
      we show a clean temporary service panel instead of
      sending the user back to the dashboard.
    */

    if (service === 'More') {
      setShowMenu((previous) => !previous);
      return;
    }

    if (service === 'To Bank') {
      setActiveService('To Bank');
      return;
    }

    if (service === 'Add Money') {
      setActiveService('Add Money');
      return;
    }

    if (service === 'Send Money') {
      setActiveService('Send Money');
      return;
    }

    if (service === 'Withdraw') {
      setActiveService('Withdraw');
      return;
    }

    if (service === 'Airtime') {
      setActiveService('Airtime');
      return;
    }

    if (service === 'Data') {
      setActiveService('Data');
      return;
    }

    if (service === 'Betting') {
      setActiveService('Betting');
      return;
    }

    if (service === 'TV') {
      setActiveService('TV');
      return;
    }

    if (service === 'Bills') {
      setActiveService('Bills');
      return;
    }

    if (service === 'SafeBox') {
      setActiveService('SafeBox');
      return;
    }

    setActiveService(service);
  };

  const closeService = () => {
    setActiveService(null);
  };

  return (
    <div style={styles.page}>
      {/* ================= HEADER ================= */}
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
            onClick={() => alert('No new notifications')}
            aria-label="Notifications"
          >
            ♧
            <span style={styles.notificationDot} />
          </button>

          <div style={styles.headerDivider} />

          <button
            type="button"
            style={styles.profileButton}
            onClick={() => navigate('/profile')}
          >
            <div style={styles.avatar}>H</div>

            <span style={styles.headerName}>Harrison</span>

            <span style={styles.chevron}>⌄</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main style={styles.main}>
        {/* ================= WELCOME ================= */}
        <section style={styles.welcomeSection}>
          <div>
            <div style={styles.welcomeSmall}>Welcome back,</div>

            <h1 style={styles.name}>Harrison</h1>

            <p style={styles.subtitle}>
              Here’s your financial overview.
            </p>
          </div>

          <button
            type="button"
            style={styles.verifiedBadge}
            onClick={() => navigate('/kyc')}
          >
            <span style={styles.checkCircle}>✓</span>
            <span>Tier 1 Verified</span>
          </button>
        </section>

        {/* ================= BALANCE CARD ================= */}
        <section style={styles.balanceCard}>
          <div style={styles.waveOne} />
          <div style={styles.waveTwo} />

          <div style={styles.balanceContent}>
            <div style={styles.balanceTop}>
              <span style={styles.balanceLabel}>
                Available Balance
              </span>

              <button
                type="button"
                style={styles.hideButton}
                onClick={() => setShowBalance(!showBalance)}
              >
                <span style={styles.eyeIcon}>
                  {showBalance ? '◉' : '○'}
                </span>

                {showBalance ? 'Hide' : 'Show'}
              </button>
            </div>

            <div style={styles.balanceAmount}>
              {showBalance ? '₦0.00' : '₦••••'}
            </div>

            <div style={styles.balanceButtons}>
              <button
                type="button"
                style={styles.addMoneyButton}
                onClick={() => handleServiceClick('Add Money')}
              >
                <span style={styles.addCircle}>+</span>
                <span>Add Money</span>
                <span style={styles.buttonArrow}>›</span>
              </button>

              <button
                type="button"
                style={styles.sendMoneyButton}
                onClick={() => handleServiceClick('Send Money')}
              >
                <span style={styles.sendIcon}>➤</span>
                <span>Send Money</span>
                <span style={styles.buttonArrow}>›</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= QUICK ACTIONS ================= */}
        <section style={styles.quickSection}>
          <div style={styles.sectionHeading}>
            <h2 style={styles.quickTitle}>Quick Actions</h2>

            <button
              type="button"
              style={styles.seeAllButton}
              onClick={() => setShowMenu(!showMenu)}
            >
              See all <span>›</span>
            </button>
          </div>

          <div style={styles.servicesGrid}>
            {services.map((service) => (
              <button
                type="button"
                key={service.name}
                style={styles.serviceButton}
                onClick={() => handleServiceClick(service.name)}
              >
                <div
                  style={{
                    ...styles.serviceIcon,
                    ...(service.name === 'Betting'
                      ? styles.bettingIcon
                      : {}),
                  }}
                >
                  {service.icon}
                </div>

                <div style={styles.serviceName}>
                  {service.name}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ================= MORE MENU ================= */}
        {showMenu && (
          <section style={styles.morePanel}>
            <div style={styles.moreHeader}>
              <div>
                <h3 style={styles.moreTitle}>More Services</h3>
                <p style={styles.moreSubtitle}>
                  Choose a service to continue.
                </p>
              </div>

              <button
                type="button"
                style={styles.closeSmallButton}
                onClick={() => setShowMenu(false)}
              >
                ×
              </button>
            </div>

            <div style={styles.moreItems}>
              <button
                type="button"
                style={styles.moreItem}
                onClick={() => setActiveService('Transactions')}
              >
                <span>↕</span>
                Transactions
              </button>

              <button
                type="button"
                style={styles.moreItem}
                onClick={() => navigate('/profile')}
              >
                <span>♙</span>
                Profile
              </button>

              <button
                type="button"
                style={styles.moreItem}
                onClick={() => navigate('/verify-phone')}
              >
                <span>✓</span>
                Verify Phone
              </button>
            </div>
          </section>
        )}

        {/* ================= KYC ================= */}
        <section style={styles.verificationCard}>
          <div style={styles.verificationIcon}>
            ✓
          </div>

          <div style={styles.verificationText}>
            <h3>Account Verification</h3>

            <p>
              Complete your KYC to increase your limits.
            </p>
          </div>

          <button
            type="button"
            style={styles.verifyButton}
            onClick={() => navigate('/kyc')}
          >
            Verify Now
            <span>›</span>
          </button>
        </section>

        {/* ================= RECENT TRANSACTIONS ================= */}
        <section style={styles.transactionsSection}>
          <div style={styles.sectionHeading}>
            <h2 style={styles.transactionsTitle}>
              Recent Transactions
            </h2>

            <button
              type="button"
              style={styles.seeAllButton}
              onClick={() => setActiveService('Transactions')}
            >
              See all <span>›</span>
            </button>
          </div>

          <div style={styles.emptyTransactions}>
            <div style={styles.emptyIcon}>▤</div>

            <div>
              <strong>No transactions yet</strong>

              <p>
                Your transactions will appear here.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ================= BOTTOM NAVIGATION ================= */}
      <nav style={styles.bottomNav}>
        <button
          type="button"
          style={{
            ...styles.navItem,
            ...styles.navItemActive,
          }}
          onClick={() => navigate('/')}
        >
          <span style={styles.navIcon}>⌂</span>
          <span>Home</span>
          <span style={styles.activeIndicator} />
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => setActiveService('Transactions')}
        >
          <span style={styles.navIcon}>↕</span>
          <span>Transactions</span>
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => setActiveService('Wallet')}
        >
          <span style={styles.navIcon}>▱</span>
          <span>Wallet</span>
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => navigate('/profile')}
        >
          <span style={styles.navIcon}>♙</span>
          <span>Profile</span>
        </button>
      </nav>

      {/* ================= SERVICE PANEL ================= */}
      {activeService && (
        <div style={styles.overlay}>
          <div style={styles.serviceModal}>
            <button
              type="button"
              style={styles.modalClose}
              onClick={closeService}
            >
              ×
            </button>

            <div style={styles.modalIcon}>
              {services.find(
                (item) => item.name === activeService
              )?.icon || '✓'}
            </div>

            <h2 style={styles.modalTitle}>
              {activeService}
            </h2>

            <p style={styles.modalText}>
              {activeService === 'To Bank'
                ? 'Send money securely to any Nigerian bank or supported financial institution.'
                : activeService === 'Add Money'
                ? 'Fund your Zenimonies account securely.'
                : activeService === 'Send Money'
                ? 'Send money to another Zenimonies customer.'
                : activeService === 'Withdraw'
                ? 'Withdraw money from your Zenimonies account.'
                : activeService === 'Airtime'
                ? 'Buy airtime for your mobile line.'
                : activeService === 'Data'
                ? 'Purchase mobile data bundles.'
                : activeService === 'Betting'
                ? 'Fund your betting wallet.'
                : activeService === 'TV'
                ? 'Pay your television subscription.'
                : activeService === 'Bills'
                ? 'Pay supported bills and services.'
                : activeService === 'SafeBox'
                ? 'Save money securely in your SafeBox.'
                : activeService === 'Transactions'
                ? 'Your transaction history will appear here.'
                : activeService === 'Wallet'
                ? 'Your wallet information will appear here.'
                : 'This service is ready to be connected.'}
            </p>

            {activeService === 'To Bank' && (
              <button
                type="button"
                style={styles.modalPrimaryButton}
                onClick={() => {
                  closeService();
                  alert(
                    'Bank transfer screen will be connected next.'
                  );
                }}
              >
                Continue to Bank Transfer
              </button>
            )}

            {activeService !== 'To Bank' && (
              <button
                type="button"
                style={styles.modalPrimaryButton}
                onClick={closeService}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#10251d',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 92,
  },

  header: {
    height: 72,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    borderBottom: '1px solid #edf2ef',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
  },

  brandName: {
    fontSize: 21,
    fontWeight: 800,
    lineHeight: 1.1,
  },

  brandSubtitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#9aa7a1',
    marginTop: 3,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  notificationButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 27,
    cursor: 'pointer',
    position: 'relative',
    color: '#18382c',
  },

  notificationDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#ef3340',
    position: 'absolute',
    top: 2,
    right: 1,
  },

  headerDivider: {
    height: 32,
    width: 1,
    background: '#dfe6e2',
  },

  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#e3f4ec',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 17,
  },

  headerName: {
    fontWeight: 700,
    fontSize: 15,
  },

  chevron: {
    fontSize: 19,
    color: '#66766e',
  },

  main: {
    width: 'min(1120px, 92%)',
    margin: '0 auto',
    paddingTop: 30,
  },

  welcomeSection: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 22,
  },

  welcomeSmall: {
    fontSize: 16,
    color: '#7c8983',
    marginBottom: 3,
  },

  name: {
    margin: 0,
    fontSize: 'clamp(32px, 5vw, 48px)',
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: -1,
  },

  subtitle: {
    margin: '9px 0 0',
    color: '#75827d',
    fontSize: 16,
  },

  verifiedBadge: {
    border: '1px solid #bfe9d4',
    background: '#eafaf2',
    color: '#086c3c',
    borderRadius: 999,
    padding: '11px 17px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  checkCircle: {
    width: 21,
    height: 21,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
  },

  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 235,
    borderRadius: 25,
    background:
      'linear-gradient(135deg, #007a3f 0%, #079b52 55%, #04ad60 100%)',
    boxShadow: '0 15px 35px rgba(0, 112, 58, 0.18)',
    marginBottom: 28,
  },

  waveOne: {
    position: 'absolute',
    width: 560,
    height: 260,
    right: -160,
    bottom: -170,
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '50%',
  },

  waveTwo: {
    position: 'absolute',
    width: 700,
    height: 300,
    right: -260,
    bottom: -190,
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '50%',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: '27px 30px',
  },

  balanceTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 17,
  },

  hideButton: {
    border: '1px solid rgba(255,255,255,0.28)',
    background: 'rgba(0,0,0,0.08)',
    color: '#ffffff',
    borderRadius: 15,
    padding: '9px 15px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
  },

  eyeIcon: {
    fontSize: 15,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize: 'clamp(40px, 7vw, 58px)',
    fontWeight: 800,
    letterSpacing: -2,
    marginTop: 10,
  },

  balanceButtons: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
  },

  addMoneyButton: {
    minWidth: 185,
    height: 54,
    borderRadius: 16,
    border: 'none',
    background: '#ffffff',
    color: '#064f32',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 17px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },

  addCircle: {
    width: 31,
    height: 31,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  },

  sendMoneyButton: {
    minWidth: 185,
    height: 54,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 17px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },

  sendIcon: {
    fontSize: 19,
  },

  buttonArrow: {
    marginLeft: 'auto',
    fontSize: 23,
  },

  quickSection: {
    marginBottom: 28,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  quickTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },

  seeAllButton: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
  },

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(92px, 1fr))',
    gap: 14,
    background: '#ffffff',
    borderRadius: 23,
    padding: 18,
    boxShadow: '0 8px 25px rgba(26, 61, 47, 0.06)',
  },

  serviceButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    minWidth: 0,
    padding: '5px 3px',
  },

  serviceIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 9px',
    borderRadius: 20,
    background: '#e9f8f1',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 27,
    fontWeight: 700,
    transition: 'transform 0.15s ease',
  },

  bettingIcon: {
    fontSize: 28,
  },

  serviceName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#15251f',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  morePanel: {
    background: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0 8px 25px rgba(26, 61, 47, 0.07)',
  },

  moreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  moreTitle: {
    margin: 0,
    fontSize: 18,
  },

  moreSubtitle: {
    margin: '5px 0 0',
    color: '#78857f',
    fontSize: 13,
  },

  closeSmallButton: {
    border: 'none',
    background: '#f1f5f3',
    borderRadius: '50%',
    width: 32,
    height: 32,
    fontSize: 20,
    cursor: 'pointer',
  },

  moreItems: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 15,
  },

  moreItem: {
    border: '1px solid #dcebe4',
    background: '#f8fcfa',
    borderRadius: 12,
    padding: '11px 14px',
    color: '#075e38',
    cursor: 'pointer',
    fontWeight: 600,
  },

  verificationCard: {
    background: '#effbf5',
    border: '1px solid #dcefe5',
    borderRadius: 22,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    marginBottom: 28,
  },

  verificationIcon: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: 17,
    background: '#d9f5e8',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
  },

  verificationText: {
    flex: 1,
  },

  verificationText h3: {
    margin: 0,
  },

  verificationText p: {
    margin: '5px 0 0',
  },

  verifyButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 14,
    padding: '13px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    whiteSpace: 'nowrap',
  },

  transactionsSection: {
    marginBottom: 30,
  },

  transactionsTitle: {
    margin: 0,
    fontSize: 20,
  },

  emptyTransactions: {
    background: '#ffffff',
    borderRadius: 20,
    padding: 22,
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    boxShadow: '0 6px 20px rgba(26, 61, 47, 0.05)',
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: '#e9f8f1',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  },

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 74,
    background: 'rgba(255,255,255,0.97)',
    borderTop: '1px solid #e5ebe8',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    zIndex: 30,
    boxShadow: '0 -5px 20px rgba(25, 55, 43, 0.05)',
  },

  navItem: {
    border: 'none',
    background: 'transparent',
    color: '#78847f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative',
  },

  navItemActive: {
    color: '#078b4a',
  },

  navIcon: {
    fontSize: 24,
    lineHeight: 1,
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 5,
    width: 45,
    height: 4,
    borderRadius: 5,
    background: '#079447',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 30, 22, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },

  serviceModal: {
    width: 'min(430px, 100%)',
    background: '#ffffff',
    borderRadius: 25,
    padding: 28,
    position: 'relative',
    textAlign: 'center',
    boxShadow: '0 25px 70px rgba(0,0,0,0.2)',
  },

  modalClose: {
    position: 'absolute',
    right: 17,
    top: 15,
    border: 'none',
    background: '#f1f5f3',
    width: 34,
    height: 34,
    borderRadius: '50%',
    fontSize: 22,
    cursor: 'pointer',
  },

  modalIcon: {
    width: 70,
    height: 70,
    margin: '8px auto 15px',
    borderRadius: 20,
    background: '#e5f7ee',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 31,
    fontWeight: 800,
  },

  modalTitle: {
    margin: 0,
    fontSize: 24,
  },

  modalText: {
    color: '#6f7c76',
    lineHeight: 1.6,
    fontSize: 14,
    margin: '12px 0 22px',
  },

  modalPrimaryButton: {
    width: '100%',
    height: 50,
    border: 'none',
    borderRadius: 14,
    background: '#079447',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default Dashboard;
