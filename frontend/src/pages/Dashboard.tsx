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

  const [sendType, setSendType] = useState<
    'zenimonies' | 'bank' | null
  >(null);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

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
    if (service === 'More') {
      setShowMenu((previous) => !previous);
      return;
    }

    if (service === 'Betting') {
      navigate('/betting');
      return;
   }
    
    if (service === 'Send Money') {
      setActiveService('Send Money');
      setSendType(null);
      return;
    }

    if (service === 'To Bank') {
      setActiveService('To Bank');
      setSendType('bank');
      return;
    }

    setActiveService(service);
  };

  const closeService = () => {
    setActiveService(null);
    setSendType(null);
    setRecipient('');
    setAmount('');
  };

  const selectSendType = (
    type: 'zenimonies' | 'bank'
  ) => {
    setSendType(type);
  };

  const handleContinueSend = () => {
    if (!recipient || !amount) {
      alert('Please enter the required information.');
      return;
    }

    if (Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (sendType === 'zenimonies') {
      alert(
        `Zenimonies transfer prepared for ${recipient} - ₦${amount}`
      );
    } else if (sendType === 'bank') {
      alert(
        `Bank transfer prepared for ${recipient} - ₦${amount}`
      );
    }
  };

  return (
    <div style={styles.page}>

      {/* ================= HEADER ================= */}

      <header style={styles.header}>
        <div style={styles.brandArea}>
          <div style={styles.logo}>Z</div>

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

      {/* ================= MAIN ================= */}

      <main style={styles.main}>

        {/* ================= WELCOME ================= */}

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
            onClick={() => navigate('/kyc')}
          >
            <span style={styles.checkCircle}>
              ✓
            </span>

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
                onClick={() =>
                  setShowBalance(!showBalance)
                }
              >
                <span style={styles.eyeIcon}>
                  {showBalance ? '◉' : '○'}
                </span>

                {showBalance ? 'Hide' : 'Show'}
              </button>
            </div>

            <div style={styles.balanceAmount}>
              {showBalance
                ? '₦0.00'
                : '₦••••'}
            </div>

          </div>
        </section>

        {/* ================= QUICK ACTIONS ================= */}

        <section style={styles.quickSection}>

          <div style={styles.sectionHeading}>
            <h2 style={styles.quickTitle}>
              Quick Actions
            </h2>

            <button
              type="button"
              style={styles.seeAllButton}
              onClick={() =>
                setShowMenu(!showMenu)
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
                  handleServiceClick(
                    service.name
                  )
                }
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
                  setActiveService(
                    'Transactions'
                  )
                }
              >
                <span>↕</span>
                Transactions
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

        {/* ================= KYC ================= */}

        <section style={styles.verificationCard}>

          <div style={styles.verificationIcon}>
            ✓
          </div>

          <div style={styles.verificationText}>
            <h3 style={styles.verificationTitle}>
              Account Verification
            </h3>

            <p style={styles.verificationDescription}>
              Complete your KYC to increase your
              limits.
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
              onClick={() =>
                setActiveService(
                  'Transactions'
                )
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

              <p style={styles.emptyDescription}>
                Your transactions will appear
                here.
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
          <span style={styles.navIcon}>
            ⌂
          </span>

          <span>Home</span>

          <span style={styles.activeIndicator} />
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() =>
            setActiveService(
              'Transactions'
            )
          }
        >
          <span style={styles.navIcon}>
            ↕
          </span>

          <span>Transactions</span>
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

          <span>Wallet</span>
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

          <span>Profile</span>
        </button>

      </nav>

      {/* ================= SERVICE MODAL ================= */}

      {activeService && (
        <div style={styles.overlay}>

          <div style={styles.serviceModal}>

            <button
              type="button"
              style={styles.modalClose}
              onClick={closeService}
              aria-label="Close"
            >
              ×
            </button>

            {/* SEND MONEY */}

            {activeService ===
              'Send Money' && (
              <>
                {!sendType && (
                  <>
                    <div style={styles.modalIcon}>
                      ➤
                    </div>

                    <h2 style={styles.modalTitle}>
                      Send Money
                    </h2>

                    <p style={styles.modalText}>
                      Choose where you want to
                      send your money.
                    </p>

                    <div style={styles.sendOptions}>

                      <button
                        type="button"
                        style={styles.sendOption}
                        onClick={() =>
                          selectSendType(
                            'zenimonies'
                          )
                        }
                      >
                        <div style={styles.optionIcon}>
                          Z
                        </div>

                        <div>
                          <strong>
                            Send to Zenimonies User
                          </strong>

                          <span>
                            Send instantly to another
                            Zenimonies user
                          </span>
                        </div>

                        <span style={styles.optionArrow}>
                          ›
                        </span>
                      </button>

                      <button
                        type="button"
                        style={styles.sendOption}
                        onClick={() =>
                          selectSendType('bank')
                        }
                      >
                        <div style={styles.optionIcon}>
                          ▥
                        </div>

                        <div>
                          <strong>
                            Send to Bank
                          </strong>

                          <span>
                            Transfer to a Nigerian bank
                            account
                          </span>
                        </div>

                        <span style={styles.optionArrow}>
                          ›
                        </span>
                      </button>

                    </div>
                  </>
                )}

                {sendType && (
                  <>
                    <div style={styles.modalIcon}>
                      {sendType ===
                      'zenimonies'
                        ? 'Z'
                        : '▥'}
                    </div>

                    <h2 style={styles.modalTitle}>
                      {sendType ===
                      'zenimonies'
                        ? 'Send to Zenimonies User'
                        : 'Send to Bank'}
                    </h2>

                    <p style={styles.modalText}>
                      {sendType ===
                      'zenimonies'
                        ? 'Enter the recipient details and amount.'
                        : 'Enter the bank account details and amount.'}
                    </p>

                    <input
                      type="text"
                      value={recipient}
                      onChange={(event) =>
                        setRecipient(
                          event.target.value
                        )
                      }
                      placeholder={
                        sendType ===
                        'zenimonies'
                          ? 'Phone number or username'
                          : 'Account number'
                      }
                      style={styles.modalInput}
                    />

                    {sendType === 'bank' && (
                      <input
                        type="text"
                        placeholder="Bank name"
                        style={styles.modalInput}
                      />
                    )}

                    <input
                      type="number"
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target.value
                        )
                      }
                      placeholder="Amount (₦)"
                      min="1"
                      style={styles.modalInput}
                    />

                    <button
                      type="button"
                      style={styles.modalPrimaryButton}
                      onClick={
                        handleContinueSend
                      }
                    >
                      Continue
                    </button>

                    <button
                      type="button"
                      style={styles.backButton}
                      onClick={() =>
                        setSendType(null)
                      }
                    >
                      ← Back
                    </button>
                  </>
                )}
              </>
            )}

            {/* ADD MONEY */}

            {activeService ===
              'Add Money' && (
              <>
                <div style={styles.modalIcon}>
                  +
                </div>

                <h2 style={styles.modalTitle}>
                  Add Money
                </h2>

                <p style={styles.modalText}>
                  Fund your Zenimonies account
                  securely.
                </p>

                <button
                  type="button"
                  style={styles.modalPrimaryButton}
                  onClick={() => {
                    closeService();
                    alert(
                      'Add Money will be connected next.'
                    );
                  }}
                >
                  Continue
                </button>
              </>
            )}

            {/* TO BANK */}

            {activeService ===
              'To Bank' && (
              <>
                <div style={styles.modalIcon}>
                  ▥
                </div>

                <h2 style={styles.modalTitle}>
                  Send to Bank
                </h2>

                <p style={styles.modalText}>
                  Transfer money securely to any
                  supported Nigerian bank.
                </p>

                <button
                  type="button"
                  style={styles.modalPrimaryButton}
                  onClick={() => {
                    setActiveService(
                      'Send Money'
                    );
                    setSendType('bank');
                  }}
                >
                  Continue
                </button>
              </>
            )}

            {/* OTHER SERVICES */}

            {activeService !==
              'Send Money' &&
              activeService !==
                'Add Money' &&
              activeService !==
                'To Bank' && (
              <>
                <div style={styles.modalIcon}>
                  {services.find(
                    (item) =>
                      item.name ===
                      activeService
                  )?.icon || '✓'}
                </div>

                <h2 style={styles.modalTitle}>
                  {activeService}
                </h2>

                <p style={styles.modalText}>
                  {activeService ===
                  'Withdraw'
                    ? 'Withdraw money from your Zenimonies account.'
                    : activeService ===
                      'Airtime'
                    ? 'Buy airtime for your mobile line.'
                    : activeService ===
                      'Data'
                    ? 'Purchase mobile data bundles.'
                    : activeService ===
                      'Betting'
                    ? 'Fund your betting wallet.'
                    : activeService ===
                      'TV'
                    ? 'Pay your television subscription.'
                    : activeService ===
                      'Bills'
                    ? 'Pay supported bills and services.'
                    : activeService ===
                      'SafeBox'
                    ? 'Save money securely in your SafeBox.'
                    : activeService ===
                      'Transactions'
                    ? 'Your transaction history will appear here.'
                    : activeService ===
                      'Wallet'
                    ? 'Your wallet information will appear here.'
                    : 'This service is ready to be connected.'}
                </p>

                <button
                  type="button"
                  style={styles.modalPrimaryButton}
                  onClick={closeService}
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

  transactionsSection: {
    marginBottom: 25,
  },

  transactionsTitle: {
    margin: 0,
    fontSize: 18,
  },

  emptyTransactions: {
    background: '#ffffff',
    borderRadius: 18,
    padding: 17,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow:
      '0 5px 17px rgba(26,61,47,0.04)',
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
  },

  emptyDescription: {
    margin: '4px 0 0',
    color: '#78857f',
    fontSize: 12,
  },

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

  overlay: {
    position: 'fixed',
    inset: 0,
    background:
      'rgba(10,30,22,0.48)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 100,
  },

  serviceModal: {
    width: 'min(430px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: 23,
    padding: 23,
    position: 'relative',
    textAlign: 'center',
    boxShadow:
      '0 25px 70px rgba(0,0,0,0.2)',
  },

  modalClose: {
    position: 'absolute',
    right: 14,
    top: 12,
    border: 'none',
    background: '#f1f5f3',
    width: 32,
    height: 32,
    borderRadius: '50%',
    fontSize: 21,
    cursor: 'pointer',
  },

  modalIcon: {
    width: 62,
    height: 62,
    margin: '6px auto 13px',
    borderRadius: 18,
    background: '#e5f7ee',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
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
    margin: '9px 0 18px',
  },

  sendOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },

  sendOption: {
    width: '100%',
    border:
      '1px solid #dcebe4',
    background: '#f8fcfa',
    borderRadius: 15,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    textAlign: 'left',
    cursor: 'pointer',
  },

  optionIcon: {
    width: 43,
    height: 43,
    flexShrink: 0,
    borderRadius: 13,
    background: '#dff6e9',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 19,
  },

  optionArrow: {
    marginLeft: 'auto',
    fontSize: 23,
    color: '#078b4a',
  },

  modalInput: {
    width: '100%',
    height: 47,
    boxSizing: 'border-box',
    border:
      '1px solid #d8e5df',
    borderRadius: 12,
    padding: '0 13px',
    marginBottom: 10,
    fontSize: 14,
    outline: 'none',
  },

  modalPrimaryButton: {
    width: '100%',
    height: 47,
    border: 'none',
    borderRadius: 13,
    background: '#079447',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 3,
  },

  backButton: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '12px 0 0',
  },
};

export default Dashboard;
