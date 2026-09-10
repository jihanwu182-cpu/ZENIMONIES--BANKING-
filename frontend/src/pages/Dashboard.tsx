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
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [cardFrozen, setCardFrozen] = useState(false);
  const [cardCreated, setCardCreated] = useState(true);

  const services: Service[] = [
    {
      name: 'Add Money',
      icon: '＋',
      description: 'Fund your account',
    },
    {
      name: 'Send Money',
      icon: '➤',
      description: 'Send money',
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
    switch (service) {
      case 'Add Money':
        navigate('/deposit');
        break;

      case 'Send Money':
        navigate('/transfer');
        break;

      case 'To Bank':
        navigate('/to-bank');
        break;

      case 'Withdraw':
        navigate('/withdraw');
        break;

      case 'Airtime':
        navigate('/airtime');
        break;

      case 'Data':
        navigate('/data');
        break;

      case 'Betting':
        navigate('/betting');
        break;

      case 'TV':
        navigate('/tv');
        break;

      case 'Bills':
        navigate('/bills');
        break;

      case 'SafeBox':
        navigate('/safebox');
        break;

      case 'More':
        setShowMenu((previous) => !previous);
        break;

      default:
        break;
    }
  };

  const handleCreateCard = () => {
    setCardCreated(true);
    alert('Your virtual card has been created.');
  };

  const handleCopyCard = async () => {
    try {
      await navigator.clipboard.writeText(
        '5399 8421 7356 4821'
      );

      alert('Virtual card number copied.');
    } catch {
      alert('Unable to copy card number.');
    }
  };

  return (
    <div style={styles.page}>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header style={styles.header}>

        <div style={styles.brandArea}>

          <div style={styles.logo}>
            Z
          </div>

          <div>

            <div style={styles.brandName}>
              Zenimonies
            </div>

            <div style={styles.brandSubtitle}>
              DIGITAL BANKING
            </div>

          </div>

        </div>

        <div style={styles.headerRight}>

          <button
            type="button"
            style={styles.notificationButton}
            onClick={() =>
              alert('No new notifications')
            }
            aria-label="Notifications"
          >
            ♧

            <span
              style={styles.notificationDot}
            />

          </button>

          <button
            type="button"
            style={styles.profileButton}
            onClick={() =>
              navigate('/profile')
            }
          >

            <div style={styles.avatar}>
              H
            </div>

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
              Here&apos;s your financial overview.
            </p>

          </div>

          <button
            type="button"
            style={styles.verifiedBadge}
            onClick={() =>
              navigate('/kyc')
            }
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
                  setShowBalance(
                    (previous) => !previous
                  )
                }
              >

                <span style={styles.eyeIcon}>
                  {showBalance ? '◉' : '○'}
                </span>

                {showBalance
                  ? 'Hide'
                  : 'Show'}

              </button>

            </div>

            <div style={styles.balanceAmount}>

              {showBalance
                ? '₦0.00'
                : '₦••••'}

            </div>

          </div>

        </section>

        {/* ===================================================
            VIRTUAL CARD
        =================================================== */}

        <section style={styles.virtualCardSection}>

          <div style={styles.virtualCardHeading}>

            <div>

              <h2 style={styles.virtualCardTitle}>
                Virtual Card
              </h2>

              <p style={styles.virtualCardSubtitle}>
                Use your Zenimonies virtual card
                for supported online payments.
              </p>

            </div>

            <button
              type="button"
              style={styles.cardViewButton}
              onClick={() =>
                navigate('/virtual-card')
              }
            >
              View
            </button>

          </div>

          {!cardCreated ? (

            <div style={styles.createCardPanel}>

              <div style={styles.createCardIcon}>
                💳
              </div>

              <div style={styles.createCardText}>

                <h3 style={styles.createCardTitle}>
                  Create your virtual card
                </h3>

                <p style={styles.createCardDescription}>
                  Create a virtual card for
                  supported online payments.
                </p>

              </div>

              <button
                type="button"
                style={styles.createCardButton}
                onClick={handleCreateCard}
              >
                Create Card
              </button>

            </div>

          ) : (

            <div
              style={{
                ...styles.virtualCard,
                ...(cardFrozen
                  ? styles.virtualCardFrozen
                  : {}),
              }}
            >

              <div style={styles.cardTopRow}>

                <div style={styles.cardBrand}>
                  ZENIMONIES
                </div>

                <div style={styles.cardChip}>
                  ◈
                </div>

              </div>

              <div style={styles.cardMiddle}>

                <div style={styles.cardNumber}>

                  {showCardNumber
                    ? '5399 8421 7356 4821'
                    : '•••• •••• •••• 4821'}

                </div>

                <div style={styles.cardDetails}>

                  <div>

                    <span style={styles.cardLabel}>
                      CARD HOLDER
                    </span>

                    <strong style={styles.cardValue}>
                      HARRISON
                    </strong>

                  </div>

                  <div>

                    <span style={styles.cardLabel}>
                      VALID THRU
                    </span>

                    <strong style={styles.cardValue}>
                      09/29
                    </strong>

                  </div>

                  <div>

                    <span style={styles.cardLabel}>
                      CVV
                    </span>

                    <strong style={styles.cardValue}>
                      {showCardNumber
                        ? '•••'
                        : '•••'}
                    </strong>

                  </div>

                </div>

              </div>

              <div style={styles.cardBottomRow}>

                <span style={styles.cardStatus}>
                  {cardFrozen
                    ? 'CARD FROZEN'
                    : 'VIRTUAL CARD'}
                </span>

                <span style={styles.cardCurrency}>
                  NGN
                </span>

              </div>

            </div>

          )}

          {cardCreated && (

            <div style={styles.cardActions}>

              <button
                type="button"
                style={styles.cardActionButton}
                onClick={() =>
                  setShowCardNumber(
                    (previous) => !previous
                  )
                }
              >
                {showCardNumber
                  ? 'Hide Details'
                  : 'Show Details'}
              </button>

              <button
                type="button"
                style={styles.cardActionButton}
                onClick={handleCopyCard}
              >
                Copy Number
              </button>

              <button
                type="button"
                style={{
                  ...styles.cardActionButton,
                  ...(cardFrozen
                    ? styles.unfreezeButton
                    : styles.freezeButton),
                }}
                onClick={() =>
                  setCardFrozen(
                    (previous) => !previous
                  )
                }
              >
                {cardFrozen
                  ? 'Unfreeze'
                  : 'Freeze Card'}
              </button>

            </div>

          )}

          <button
            type="button"
            style={styles.manageCardButton}
            onClick={() =>
              navigate('/virtual-card')
            }
          >
            Manage Virtual Card
            <span>›</span>
          </button>

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
                setShowMenu(
                  (previous) => !previous
                )
              }
            >
              See all
              <span>›</span>
            </button>

          </div>

          <div style={styles.servicesGrid}>

            {services.map((service) => (

              <button
                type="button"
                key={service.name}
                style={styles.serviceButton}
                onClick={() =>
                  handleServiceClick(
                    service.name
                  )
                }
                aria-label={
                  service.description
                }
              >

                <div
                  style={{
                    ...styles.serviceIcon,
                    ...(service.name ===
                    'Betting'
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
                onClick={() =>
                  setShowMenu(false)
                }
              >
                ×
              </button>

            </div>

            <div style={styles.moreItems}>

              <button
                type="button"
                style={styles.moreItem}
                onClick={() =>
                  navigate('/transactions')
                }
              >
                <span>↕</span>
                Transactions
              </button>

              <button
                type="button"
                style={styles.moreItem}
                onClick={() =>
                  navigate('/wallet')
                }
              >
                <span>▱</span>
                Wallet
              </button>

              <button
                type="button"
                style={styles.moreItem}
                onClick={() =>
                  navigate('/virtual-card')
                }
              >
                <span>💳</span>
                Virtual Card
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
                  navigate('/settings')
                }
              >
                <span>⚙</span>
                Settings
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
            KYC
        =================================================== */}

        <section style={styles.verificationCard}>

          <div style={styles.verificationIcon}>
            ✓
          </div>

          <div style={styles.verificationText}>

            <h3 style={styles.verificationTitle}>
              Account Verification
            </h3>

            <p style={styles.verificationDescription}>
              Complete your KYC to increase
              your limits.
            </p>

          </div>

          <button
            type="button"
            style={styles.verifyButton}
            onClick={() =>
              navigate('/kyc')
            }
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
                navigate('/transactions')
              }
            >
              See all
              <span>›</span>
            </button>

          </div>

          <button
            type="button"
            style={styles.emptyTransactions}
            onClick={() =>
              navigate('/transactions')
            }
          >

            <div style={styles.emptyIcon}>
              ▤
            </div>

            <div style={styles.emptyTransactionText}>

              <strong>
                No transactions yet
              </strong>

              <p style={styles.emptyDescription}>
                Your transactions will
                appear here.
              </p>

            </div>

          </button>

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
          onClick={() =>
            navigate('/')
          }
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
            navigate('/transactions')
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
            navigate('/wallet')
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
          onClick={() =>
            navigate('/profile')
          }
        >

          <span style={styles.navIcon}>
            ♙
          </span>

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#10251d',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 88,
  },

  header: {
    height: 68,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4%',
    borderBottom:
      '1px solid #edf2ef',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },

  logo: {
    width: 43,
    height: 43,
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  brandName: {
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 1.1,
  },

  brandSubtitle: {
    fontSize: 8,
    letterSpacing: 1.7,
    color: '#9aa7a1',
    marginTop: 3,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  notificationButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    cursor: 'pointer',
    position: 'relative',
    color: '#18382c',
  },

  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#ef3340',
    position: 'absolute',
    top: 1,
    right: 0,
  },

  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
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

  main: {
    width: 'min(1080px, 92%)',
    margin: '0 auto',
    paddingTop: 22,
  },

  welcomeSection: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 17,
  },

  welcomeSmall: {
    fontSize: 14,
    color: '#7c8983',
    marginBottom: 2,
  },

  name: {
    margin: 0,
    fontSize:
      'clamp(28px, 5vw, 40px)',
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: -1,
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#75827d',
    fontSize: 14,
  },

  verifiedBadge: {
    border:
      '1px solid #bfe9d4',
    background: '#eafaf2',
    color: '#086c3c',
    borderRadius: 999,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
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

  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 175,
    borderRadius: 22,
    background:
      'linear-gradient(135deg, #007a3f 0%, #079b52 55%, #04ad60 100%)',
    boxShadow:
      '0 12px 30px rgba(0,112,58,0.16)',
    marginBottom: 22,
  },

  waveOne: {
    position: 'absolute',
    width: 480,
    height: 220,
    right: -150,
    bottom: -150,
    border:
      '1px solid rgba(255,255,255,0.13)',
    borderRadius: '50%',
  },

  waveTwo: {
    position: 'absolute',
    width: 620,
    height: 250,
    right: -250,
    bottom: -170,
    border:
      '1px solid rgba(255,255,255,0.09)',
    borderRadius: '50%',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: '22px 23px',
  },

  balanceTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
  },

  balanceLabel: {
    color:
      'rgba(255,255,255,0.8)',
    fontSize: 15,
  },

  hideButton: {
    border:
      '1px solid rgba(255,255,255,0.25)',
    background:
      'rgba(0,0,0,0.08)',
    color: '#ffffff',
    borderRadius: 13,
    padding: '7px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    fontSize: 12,
  },

  eyeIcon: {
    fontSize: 13,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize:
      'clamp(36px, 7vw, 50px)',
    fontWeight: 800,
    letterSpacing: -2,
    marginTop: 13,
  },

  /* =====================================================
     VIRTUAL CARD
  ===================================================== */

  virtualCardSection: {
    background: '#ffffff',
    borderRadius: 21,
    padding: 18,
    marginBottom: 22,
    boxShadow:
      '0 7px 22px rgba(26,61,47,0.05)',
  },

  virtualCardHeading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  virtualCardTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  virtualCardSubtitle: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 12,
    lineHeight: 1.45,
  },

  cardViewButton: {
    border: 'none',
    background: '#e9f8f1',
    color: '#087c43',
    borderRadius: 10,
    padding: '8px 13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
  },

  createCardPanel: {
    border:
      '1px dashed #bcded0',
    background: '#f8fcfa',
    borderRadius: 17,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  createCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    background: '#e5f7ee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    flexShrink: 0,
  },

  createCardText: {
    flex: 1,
    minWidth: 0,
  },

  createCardTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
  },

  createCardDescription: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 11.5,
    lineHeight: 1.4,
  },

  createCardButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 11,
    padding: '10px 13px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontSize: 12,
  },

  virtualCard: {
    minHeight: 210,
    borderRadius: 22,
    padding: 21,
    boxSizing: 'border-box',
    background:
      'linear-gradient(135deg, #063b2d 0%, #087c43 52%, #079b52 100%)',
    color: '#ffffff',
    boxShadow:
      '0 14px 32px rgba(0,90,50,0.18)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },

  virtualCardFrozen: {
    opacity: 0.7,
    filter: 'grayscale(0.25)',
  },

  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardBrand: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 1.2,
  },

  cardChip: {
    width: 42,
    height: 31,
    borderRadius: 8,
    background:
      'linear-gradient(135deg, #d7b76c, #f0d98d)',
    color: '#6b5726',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },

  cardMiddle: {
    marginTop: 24,
  },

  cardNumber: {
    fontSize:
      'clamp(18px, 4vw, 25px)',
    letterSpacing: 2,
    fontWeight: 700,
    wordSpacing: 4,
  },

  cardDetails: {
    display: 'flex',
    gap: 25,
    marginTop: 18,
  },

  cardLabel: {
    display: 'block',
    fontSize: 7,
    letterSpacing: 1,
    opacity: 0.7,
    marginBottom: 3,
  },

  cardValue: {
    fontSize: 10,
    letterSpacing: 0.7,
  },

  cardBottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },

  cardStatus: {
    fontSize: 9,
    letterSpacing: 1.2,
    opacity: 0.8,
  },

  cardCurrency: {
    fontSize: 9,
    fontWeight: 700,
    opacity: 0.8,
  },

  cardActions: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
    marginTop: 10,
  },

  cardActionButton: {
    flex: 1,
    minWidth: 100,
    border:
      '1px solid #dcebe4',
    background: '#f8fcfa',
    color: '#075e38',
    borderRadius: 10,
    padding: '9px 10px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },

  freezeButton: {
    color: '#b42318',
    border:
      '1px solid #f2c8c5',
    background: '#fff8f7',
  },

  unfreezeButton: {
    color: '#087c43',
    border:
      '1px solid #bfe9d4',
    background: '#effbf5',
  },

  manageCardButton: {
    width: '100%',
    marginTop: 10,
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    padding: '7px 0 0',
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },

  /* =====================================================
     QUICK ACTIONS
  ===================================================== */

  quickSection: {
    marginBottom: 21,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  quickTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
  },

  seeAllButton: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 13,
  },

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: 8,
    background: '#ffffff',
    borderRadius: 20,
    padding: 13,
    boxShadow:
      '0 6px 20px rgba(26,61,47,0.05)',
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
    borderRadius: 17,
    background: '#e9f8f1',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 700,
  },

  bettingIcon: {
    fontSize: 23,
  },

  serviceName: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#15251f',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'center',
  },

  /* =====================================================
     MORE
  ===================================================== */

  morePanel: {
    background: '#ffffff',
    borderRadius: 18,
    padding: 17,
    marginBottom: 19,
    boxShadow:
      '0 7px 22px rgba(26,61,47,0.06)',
  },

  moreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  moreTitle: {
    margin: 0,
    fontSize: 17,
  },

  moreSubtitle: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 12,
  },

  closeSmallButton: {
    border: 'none',
    background: '#f1f5f3',
    borderRadius: '50%',
    width: 30,
    height: 30,
    fontSize: 19,
    cursor: 'pointer',
  },

  moreItems: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 13,
  },

  moreItem: {
    border:
      '1px solid #dcebe4',
    background: '#f8fcfa',
    borderRadius: 11,
    padding: '9px 12px',
    color: '#075e38',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
  },

  /* =====================================================
     KYC
  ===================================================== */

  verificationCard: {
    background: '#ffffff',
    border:
      '1px solid #dcefe5',
    borderRadius: 19,
    padding: '14px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    marginBottom: 21,
  },

  verificationIcon: {
    width: 49,
    height: 49,
    flexShrink: 0,
    borderRadius: 15,
    background: '#d9f5e8',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 800,
  },

  verificationText: {
    flex: 1,
    minWidth: 0,
  },

  verificationTitle: {
    margin: 0,
    fontSize: 15,
  },

  verificationDescription: {
    margin: '4px 0 0',
    color: '#75827d',
    fontSize: 12,
    lineHeight: 1.35,
  },

  verifyButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 12,
    padding: '10px 13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    whiteSpace: 'nowrap',
    fontSize: 12,
  },

  /* =====================================================
     TRANSACTIONS
  ===================================================== */

  transactionsSection: {
    marginBottom: 25,
  },

  transactionsTitle: {
    margin: 0,
    fontSize: 18,
  },

  emptyTransactions: {
    width: '100%',
    boxSizing: 'border-box',
    border: 'none',
    background: '#ffffff',
    borderRadius: 18,
    padding: 17,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow:
      '0 5px 17px rgba(26,61,47,0.04)',
    cursor: 'pointer',
    textAlign: 'left',
  },

  emptyTransactionText: {
    flex: 1,
  },

  emptyIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    background: '#e9f8f1',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },

  emptyDescription: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 12,
  },

  /* =====================================================
     BOTTOM NAVIGATION
  ===================================================== */

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    background:
      'rgba(255,255,255,0.98)',
    borderTop:
      '1px solid #e5ebe8',
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, 1fr)',
    zIndex: 30,
    boxShadow:
      '0 -5px 18px rgba(25,55,43,0.05)',
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
    bottom: 3,
    width: 40,
    height: 3,
    borderRadius: 5,
    background: '#079447',
  },
};

export default Dashboard;
