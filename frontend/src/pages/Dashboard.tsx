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
      icon: '+',
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
    if (service === 'More') {
      setShowMenu((previous) => !previous);
      return;
    }

    setActiveService(service);
  };

  const closeService = () => {
    setActiveService(null);
  };

  const getServiceDescription = (service: string) => {
    switch (service) {
      case 'Add Money':
        return 'Fund your Zenimonies account securely.';

      case 'Send Money':
        return 'Send money quickly and securely to another Zenimonies customer.';

      case 'To Bank':
        return 'Send money securely to any Nigerian bank or supported financial institution.';

      case 'Withdraw':
        return 'Withdraw money from your Zenimonies account.';

      case 'Airtime':
        return 'Buy airtime for your mobile line.';

      case 'Data':
        return 'Purchase mobile data bundles.';

      case 'Betting':
        return 'Fund your betting wallet.';

      case 'TV':
        return 'Pay your television subscription.';

      case 'Bills':
        return 'Pay supported bills and services.';

      case 'SafeBox':
        return 'Save money securely in your SafeBox.';

      case 'Transactions':
        return 'Your transaction history will appear here.';

      case 'Wallet':
        return 'Your wallet information will appear here.';

      default:
        return 'This service is ready to be connected.';
    }
  };

  return (
    <div style={styles.page}>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header style={styles.header}>

        <div style={styles.brandArea}>
          <div style={styles.logo}>Z</div>

          <div>
            <div style={styles.brandName}>Zenimonies</div>

            <div style={styles.brandSubtitle}>
              DIGITAL BANKING
            </div>
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

          <button
            type="button"
            style={styles.profileButton}
            onClick={() => navigate('/profile')}
          >
            <div style={styles.avatar}>H</div>

            <span style={styles.headerName}>
              Harrison
            </span>
          </button>

        </div>
      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main style={styles.main}>

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section style={styles.welcomeSection}>

          <div>
            <div style={styles.welcomeSmall}>
              Welcome back,
            </div>

            <h1 style={styles.name}>
              Harrison
            </h1>

            <p style={styles.subtitle}>
              Here’s your financial overview.
            </p>
          </div>

          <button
            type="button"
            style={styles.verifiedBadge}
            onClick={() => navigate('/kyc')}
          >
            <span style={styles.checkCircle}>
              ✓
            </span>

            <span>
              Tier 1 Verified
            </span>
          </button>

        </section>


        {/* ===================================================
            BALANCE
        =================================================== */}

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
                onClick={() =>
                  setShowBalance((previous) => !previous)
                }
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


            {/* ADD MONEY + SEND MONEY */}

            <div style={styles.balanceButtons}>

              <button
                type="button"
                style={styles.addMoneyButton}
                onClick={() =>
                  handleServiceClick('Add Money')
                }
              >
                <span style={styles.addCircle}>
                  +
                </span>

                <span>
                  Add Money
                </span>

                <span style={styles.buttonArrow}>
                  ›
                </span>
              </button>


              <button
                type="button"
                style={styles.sendMoneyButton}
                onClick={() =>
                  handleServiceClick('Send Money')
                }
              >
                <span style={styles.sendIcon}>
                  ➤
                </span>

                <span>
                  Send Money
                </span>

                <span style={styles.buttonArrow}>
                  ›
                </span>
              </button>

            </div>

          </div>
        </section>


        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <section style={styles.quickSection}>

          <div style={styles.sectionHeading}>

            <h2 style={styles.quickTitle}>
              Quick Actions
            </h2>

            <button
              type="button"
              style={styles.seeAllButton}
              onClick={() =>
                setShowMenu((previous) => !previous)
              }
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
                onClick={() =>
                  handleServiceClick(service.name)
                }
              >

                <div
                  style={{
                    ...styles.serviceIcon,
                    ...(service.name === 'Add Money'
                      ? styles.addServiceIcon
                      : {}),
                    ...(service.name === 'Send Money'
                      ? styles.sendServiceIcon
                      : {}),
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


        {/* ===================================================
            MORE MENU
        =================================================== */}

        {showMenu && (

          <section style={styles.morePanel}>

            <div style={styles.moreHeader}>

              <div>
                <h3 style={styles.moreTitle}>
                  More Services
                </h3>

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
                onClick={() =>
                  setActiveService('Transactions')
                }
              >
                <span>↕</span>
                Transactions
              </button>


              <button
                type="button"
                style={styles.moreItem}
                onClick={() =>
                  setActiveService('Wallet')
                }
              >
                <span>▱</span>
                Wallet
              </button>


              <button
                type="button"
                style={styles.moreItem}
                onClick={() =>
                  navigate('/profile')
                }
              >
                <span>♙</span>
                Profile
              </button>


              <button
                type="button"
                style={styles.moreItem}
                onClick={() =>
                  navigate('/verify-phone')
                }
              >
                <span>✓</span>
                Verify Phone
              </button>

            </div>

          </section>

        )}


        {/* ===================================================
            ACCOUNT VERIFICATION
        =================================================== */}

        <section style={styles.verificationCard}>

          <div style={styles.verificationIcon}>
            ✓
          </div>

          <div style={styles.verificationText}>

            <h3 style={styles.verificationHeading}>
              Account Verification
            </h3>

            <p style={styles.verificationParagraph}>
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


        {/* ===================================================
            RECENT TRANSACTIONS
        =================================================== */}

        <section style={styles.transactionsSection}>

          <div style={styles.sectionHeading}>

            <h2 style={styles.transactionsTitle}>
              Recent Transactions
            </h2>

            <button
              type="button"
              style={styles.seeAllButton}
              onClick={() =>
                setActiveService('Transactions')
              }
            >
              See all <span>›</span>
            </button>

          </div>


          <div style={styles.emptyTransactions}>

            <div style={styles.emptyIcon}>
              ▤
            </div>

            <div>
              <strong>
                No transactions yet
              </strong>

              <p style={styles.emptyParagraph}>
                Your transactions will appear here.
              </p>
            </div>

          </div>

        </section>

      </main>


      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <nav style={styles.bottomNav}>

        <button
          type="button"
          style={{
            ...styles.navItem,
            ...styles.navItemActive,
          }}
          onClick={() => navigate('/')}
        >
          <span style={styles.navIcon}>
            ⌂
          </span>

          <span>
            Home
          </span>

          <span style={styles.activeIndicator} />
        </button>


        <button
          type="button"
          style={styles.navItem}
          onClick={() =>
            setActiveService('Transactions')
          }
        >
          <span style={styles.navIcon}>
            ↕
          </span>

          <span>
            Transactions
          </span>
        </button>


        <button
          type="button"
          style={styles.navItem}
          onClick={() =>
            setActiveService('Wallet')
          }
        >
          <span style={styles.navIcon}>
            ▱
          </span>

          <span>
            Wallet
          </span>
        </button>


        <button
          type="button"
          style={styles.navItem}
          onClick={() => navigate('/profile')}
        >
          <span style={styles.navIcon}>
            ♙
          </span>

          <span>
            Profile
          </span>
        </button>

      </nav>


      {/* =====================================================
          SERVICE MODAL
      ===================================================== */}

      {activeService && (

        <div
          style={styles.overlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeService();
            }
          }}
        >

          <div style={styles.serviceModal}>

            <button
              type="button"
              style={styles.modalClose}
              onClick={closeService}
            >
              ×
            </button>


            <div style={styles.modalIcon}>

              {
                services.find(
                  (item) => item.name === activeService
                )?.icon || '✓'
              }

            </div>


            <h2 style={styles.modalTitle}>
              {activeService}
            </h2>


            <p style={styles.modalText}>
              {getServiceDescription(activeService)}
            </p>


            <button
              type="button"
              style={styles.modalPrimaryButton}
              onClick={() => {
                if (activeService === 'To Bank') {
                  alert(
                    'Bank transfer screen will be connected next.'
                  );
                } else {
                  alert(
                    `${activeService} screen will be connected next.`
                  );
                }

                closeService();
              }}
            >
              Continue
            </button>

          </div>

        </div>

      )}

    </div>
  );
};


/* ===========================================================
   STYLES
=========================================================== */

const styles: Record<string, React.CSSProperties> = {

  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#10251d',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 82,
    boxSizing: 'border-box',
  },


  /* ================= HEADER ================= */

  header: {
    height: 64,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4%',
    borderBottom: '1px solid #edf2ef',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    boxSizing: 'border-box',
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },

  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 800,
  },

  brandName: {
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.1,
  },

  brandSubtitle: {
    fontSize: 8,
    letterSpacing: 1.7,
    color: '#9aa7a1',
    marginTop: 2,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  notificationButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    cursor: 'pointer',
    position: 'relative',
    color: '#18382c',
    padding: 4,
  },

  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#ef3340',
    position: 'absolute',
    top: 1,
    right: 1,
  },

  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#e3f4ec',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 15,
  },

  headerName: {
    fontWeight: 700,
    fontSize: 13,
  },


  /* ================= MAIN ================= */

  main: {
    width: 'min(1120px, 92%)',
    margin: '0 auto',
    paddingTop: 20,
  },


  /* ================= WELCOME ================= */

  welcomeSection: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },

  welcomeSmall: {
    fontSize: 14,
    color: '#7c8983',
    marginBottom: 2,
  },

  name: {
    margin: 0,
    fontSize: 'clamp(28px, 6vw, 42px)',
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: -1,
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#75827d',
    fontSize: 13,
  },

  verifiedBadge: {
    border: '1px solid #bfe9d4',
    background: '#eafaf2',
    color: '#086c3c',
    borderRadius: 999,
    padding: '8px 11px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
  },


  /* ================= BALANCE ================= */

  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 190,
    borderRadius: 20,
    background:
      'linear-gradient(135deg, #007a3f 0%, #079b52 55%, #04ad60 100%)',
    boxShadow:
      '0 12px 28px rgba(0, 112, 58, 0.15)',
    marginBottom: 20,
  },

  waveOne: {
    position: 'absolute',
    width: 430,
    height: 200,
    right: -150,
    bottom: -140,
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '50%',
  },

  waveTwo: {
    position: 'absolute',
    width: 560,
    height: 230,
    right: -220,
    bottom: -155,
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '50%',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: '21px 22px',
  },

  balanceTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
  },

  hideButton: {
    border: '1px solid rgba(255,255,255,0.28)',
    background: 'rgba(0,0,0,0.08)',
    color: '#ffffff',
    borderRadius: 12,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    fontSize: 11,
  },

  eyeIcon: {
    fontSize: 12,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize: 'clamp(36px, 8vw, 52px)',
    fontWeight: 800,
    letterSpacing: -2,
    marginTop: 5,
  },


  /* ================= BALANCE BUTTONS ================= */

  balanceButtons: {
    display: 'flex',
    gap: 9,
    marginTop: 17,
    flexWrap: 'wrap',
  },

  addMoneyButton: {
    flex: '1 1 145px',
    minWidth: 135,
    height: 46,
    borderRadius: 13,
    border: 'none',
    background: '#ffffff',
    color: '#064f32',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  addCircle: {
    width: 27,
    height: 27,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
  },

  sendMoneyButton: {
    flex: '1 1 145px',
    minWidth: 135,
    height: 46,
    borderRadius: 13,
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  sendIcon: {
    fontSize: 17,
  },

  buttonArrow: {
    marginLeft: 'auto',
    fontSize: 20,
  },


  /* ================= QUICK ACTIONS ================= */

  quickSection: {
    marginBottom: 20,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  quickTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  seeAllButton: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
  },


  /* ================= SERVICES ================= */

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(75px, 1fr))',
    gap: 7,
    background: '#ffffff',
    borderRadius: 18,
    padding: 12,
    boxShadow:
      '0 7px 20px rgba(26, 61, 47, 0.05)',
  },

  serviceButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    minWidth: 0,
    padding: '4px 2px',
  },

  serviceIcon: {
    width: 54,
    height: 54,
    margin: '0 auto 6px',
    borderRadius: 16,
    background: '#e9f8f1',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 700,
  },

  addServiceIcon: {
    background: '#e1f7eb',
    color: '#079447',
    fontSize: 29,
  },

  sendServiceIcon: {
    background: '#e1f7eb',
    color: '#079447',
    fontSize: 22,
  },

  bettingIcon: {
    fontSize: 24,
  },

  serviceName: {
    fontSize: 11,
    fontWeight: 700,
    color: '#15251f',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'center',
  },


  /* ================= MORE ================= */

  morePanel: {
    background: '#ffffff',
    borderRadius: 17,
    padding: 15,
    marginBottom: 18,
    boxShadow:
      '0 7px 20px rgba(26, 61, 47, 0.06)',
  },

  moreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  moreTitle: {
    margin: 0,
    fontSize: 16,
  },

  moreSubtitle: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 11,
  },

  closeSmallButton: {
    border: 'none',
    background: '#f1f5f3',
    borderRadius: '50%',
    width: 29,
    height: 29,
    fontSize: 18,
    cursor: 'pointer',
  },

  moreItems: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },

  moreItem: {
    border: '1px solid #dcebe4',
    background: '#f8fcfa',
    borderRadius: 10,
    padding: '9px 11px',
    color: '#075e38',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 11,
  },


  /* ================= VERIFICATION ================= */

  verificationCard: {
    background: '#ffffff',
    border: '1px solid #e4eee9',
    borderRadius: 18,
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    marginBottom: 20,
    boxShadow:
      '0 6px 18px rgba(26, 61, 47, 0.04)',
  },

  verificationIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 14,
    background: '#e1f7eb',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 800,
  },

  verificationText: {
    flex: 1,
    minWidth: 0,
  },

  verificationHeading: {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
  },

  verificationParagraph: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 11,
    lineHeight: 1.4,
  },

  verifyButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 11,
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    whiteSpace: 'nowrap',
    fontSize: 11,
  },


  /* ================= TRANSACTIONS ================= */

  transactionsSection: {
    marginBottom: 25,
  },

  transactionsTitle: {
    margin: 0,
    fontSize: 18,
  },

  emptyTransactions: {
    background: '#ffffff',
    borderRadius: 17,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow:
      '0 6px 18px rgba(26, 61, 47, 0.04)',
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    background: '#e9f8f1',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },

  emptyParagraph: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 11,
  },


  /* ================= BOTTOM NAV ================= */

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    background: 'rgba(255,255,255,0.98)',
    borderTop: '1px solid #e5ebe8',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    zIndex: 30,
    boxShadow:
      '0 -5px 20px rgba(25, 55, 43, 0.06)',
  },

  navItem: {
    border: 'none',
    background: 'transparent',
    color: '#78847f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative',
  },

  navItemActive: {
    color: '#078b4a',
  },

  navIcon: {
    fontSize: 21,
    lineHeight: 1,
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 38,
    height: 3,
    borderRadius: 5,
    background: '#079447',
  },


  /* ================= MODAL ================= */

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 30, 22, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 100,
    boxSizing: 'border-box',
  },

  serviceModal: {
    width: 'min(410px, 100%)',
    background: '#ffffff',
    borderRadius: 21,
    padding: 23,
    position: 'relative',
    textAlign: 'center',
    boxShadow:
      '0 25px 70px rgba(0,0,0,0.2)',
    boxSizing: 'border-box',
  },

  modalClose: {
    position: 'absolute',
    right: 13,
    top: 12,
    border: 'none',
    background: '#f1f5f3',
    width: 31,
    height: 31,
    borderRadius: '50%',
    fontSize: 20,
    cursor: 'pointer',
  },

  modalIcon: {
    width: 62,
    height: 62,
    margin: '5px auto 13px',
    borderRadius: 18,
    background: '#e5f7ee',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 27,
    fontWeight: 800,
  },

  modalTitle: {
    margin: 0,
    fontSize: 21,
  },

  modalText: {
    color: '#6f7c76',
    lineHeight: 1.5,
    fontSize: 13,
    margin: '10px 0 19px',
  },

  modalPrimaryButton: {
    width: '100%',
    height: 46,
    border: 'none',
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default Dashboard;
