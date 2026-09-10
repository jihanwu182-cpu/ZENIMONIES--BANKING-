import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

type Service = {
  name: string;
  icon: string;
  description: string;
};

type KycData = {
  status?: string;
  tier?: number;
  bvn_verified?: boolean;
  id_verified?: boolean;
  tier_3_verified?: boolean;
};

type KycResponse = {
  success?: boolean;
  kyc?: KycData;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [showBalance, setShowBalance] =
    useState(true);

  const [showMenu, setShowMenu] =
    useState(false);

  const [kyc, setKyc] =
    useState<KycData | null>(null);

  const [kycLoading, setKycLoading] =
    useState(true);

  // ==========================================================
  // LOAD KYC STATUS
  // ==========================================================

  useEffect(() => {
    const loadKycStatus = async () => {
      try {
        setKycLoading(true);

        const token =
          localStorage.getItem(
            'zenimonies_token'
          ) ||
          localStorage.getItem(
            'token'
          ) ||
          localStorage.getItem(
            'access_token'
          );

        if (!token) {
          setKycLoading(false);
          return;
        }

        /*
         * IMPORTANT:
         * Change this only if your frontend uses a
         * different backend URL.
         */

        const apiBase =
          process.env.REACT_APP_API_URL ||
          '';

        const response =
          await fetch(
            `${apiBase}/api/kyc/status`,
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

        if (!response.ok) {
          throw new Error(
            `KYC request failed: ${response.status}`
          );
        }

        const data: KycResponse =
          await response.json();

        if (
          data.success &&
          data.kyc
        ) {
          setKyc(data.kyc);
        } else {
          setKyc({
            status: 'not_started',
            tier: 0,
            bvn_verified: false,
            id_verified: false,
            tier_3_verified: false,
          });
        }
      } catch (error) {
        console.error(
          'Dashboard KYC loading error:',
          error
        );

        /*
         * Do NOT assume verification
         * when the server cannot be reached.
         */

        setKyc({
          status: 'unknown',
          tier: 0,
          bvn_verified: false,
          id_verified: false,
          tier_3_verified: false,
        });
      } finally {
        setKycLoading(false);
      }
    };

    loadKycStatus();
  }, []);

  // ==========================================================
  // KYC DISPLAY
  // ==========================================================

  const kycDisplay = useMemo(() => {
    if (kycLoading) {
      return {
        text: 'Checking KYC...',
        icon: '…',
        type: 'loading',
      };
    }

    const status =
      String(
        kyc?.status || ''
      ).toLowerCase();

    const tier = Number(
      kyc?.tier || 0
    );

    /*
     * VERIFIED ONLY WHEN THE ACTUAL STATUS
     * SAYS VERIFIED/APPROVED/COMPLETED.
     *
     * Merely having tier = 1 does NOT mean
     * the user is verified.
     */

    const verified =
      status === 'verified' ||
      status === 'approved' ||
      status === 'completed';

    if (verified) {
      if (tier >= 3) {
        return {
          text: 'Tier 3 Verified',
          icon: '✓',
          type: 'verified',
        };
      }

      if (tier === 2) {
        return {
          text: 'Tier 2 Verified',
          icon: '✓',
          type: 'verified',
        };
      }

      if (tier === 1) {
        return {
          text: 'Tier 1 Verified',
          icon: '✓',
          type: 'verified',
        };
      }
    }

    /*
     * PENDING
     */

    if (
      status === 'pending' ||
      status === 'submitted' ||
      status === 'processing'
    ) {
      if (tier >= 3) {
        return {
          text: 'Tier 3 Pending',
          icon: '!',
          type: 'pending',
        };
      }

      if (tier === 2) {
        return {
          text: 'Tier 2 Pending',
          icon: '!',
          type: 'pending',
        };
      }

      if (tier === 1) {
        return {
          text: 'Tier 1 Pending',
          icon: '!',
          type: 'pending',
        };
      }

      return {
        text: 'KYC Pending',
        icon: '!',
        type: 'pending',
      };
    }

    /*
     * UNKNOWN / NOT STARTED
     */

    return {
      text: 'KYC Verification Required',
      icon: '!',
      type: 'required',
    };
  }, [kyc, kycLoading]);

  // ==========================================================
  // SERVICES
  // ==========================================================

  const services: Service[] = [
    {
      name: 'Add Money',
      icon: '＋',
      description:
        'Fund your account',
    },
    {
      name: 'Send to ZENIMONIES',
      icon: '➤',
      description:
        'Send to another ZENIMONIES user',
    },
    {
      name: 'To Bank',
      icon: '▥',
      description:
        'Send to any bank',
    },
    {
      name: 'Withdraw',
      icon: '↗',
      description:
        'Withdraw funds',
    },
    {
      name: 'Airtime',
      icon: '▯',
      description:
        'Buy airtime',
    },
    {
      name: 'Data',
      icon: '▥',
      description:
        'Buy data',
    },
    {
      name: 'Betting',
      icon: '⚽',
      description:
        'Fund your bets',
    },
    {
      name: 'TV',
      icon: '▣',
      description:
        'Pay TV bills',
    },
    {
      name: 'Bills',
      icon: '▤',
      description:
        'Pay your bills',
    },
    {
      name: 'SafeBox',
      icon: '🔒',
      description:
        'Save securely',
    },
    {
      name: 'More',
      icon: '•••',
      description:
        'More services',
    },
  ];

  // ==========================================================
  // SERVICE NAVIGATION
  // ==========================================================

  const handleServiceClick = (
    service: string
  ) => {
    switch (service) {
      case 'Add Money':
        navigate('/deposit');
        break;

      case 'Send to ZENIMONIES':
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
        setShowMenu(
          previous => !previous
        );
        break;

      default:
        break;
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div style={styles.page}>

      {/* ====================================================
          HEADER
      ==================================================== */}

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
            style={
              styles.notificationButton
            }
            onClick={() =>
              alert(
                'No new notifications'
              )
            }
            aria-label="Notifications"
          >
            ♧

            <span
              style={
                styles.notificationDot
              }
            />
          </button>

          <button
            type="button"
            style={
              styles.profileButton
            }
            onClick={() =>
              navigate('/profile')
            }
          >

            <div style={styles.avatar}>
              H
            </div>

            <span
              style={
                styles.headerName
              }
            >
              Harrison
            </span>

          </button>

        </div>

      </header>

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main style={styles.main}>

        {/* ==================================================
            WELCOME
        ================================================== */}

        <section
          style={
            styles.welcomeSection
          }
        >

          <div>

            <div
              style={
                styles.welcomeSmall
              }
            >
              Welcome back,
            </div>

            <h1 style={styles.name}>
              Harrison
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Here's your financial
              overview.
            </p>

          </div>

          {/* =================================================
              REAL KYC STATUS
          ================================================= */}

          <button
            type="button"
            style={{
              ...styles.kycBadge,

              ...(kycDisplay.type ===
              'verified'
                ? styles.kycVerified
                : {}),

              ...(kycDisplay.type ===
              'pending'
                ? styles.kycPending
                : {}),

              ...(kycDisplay.type ===
              'required'
                ? styles.kycRequired
                : {}),

              ...(kycDisplay.type ===
              'loading'
                ? styles.kycLoading
                : {}),
            }}
            onClick={() =>
              navigate('/kyc')
            }
          >

            <span
              style={
                styles.checkCircle
              }
            >
              {kycDisplay.icon}
            </span>

            <span>
              {kycDisplay.text}
            </span>

          </button>

        </section>

        {/* ==================================================
            BALANCE
        ================================================== */}

        <section
          style={
            styles.balanceCard
          }
        >

          <div
            style={styles.waveOne}
          />

          <div
            style={styles.waveTwo}
          />

          <div
            style={
              styles.balanceContent
            }
          >

            <div
              style={
                styles.balanceTop
              }
            >

              <span
                style={
                  styles.balanceLabel
                }
              >
                Available Balance
              </span>

              <button
                type="button"
                style={
                  styles.hideButton
                }
                onClick={() =>
                  setShowBalance(
                    previous =>
                      !previous
                  )
                }
              >

                <span
                  style={
                    styles.eyeIcon
                  }
                >
                  {showBalance
                    ? '◉'
                    : '○'}
                </span>

                {showBalance
                  ? 'Hide'
                  : 'Show'}

              </button>

            </div>

            <div
              style={
                styles.balanceAmount
              }
            >
              {showBalance
                ? '₦0.00'
                : '₦••••'}
            </div>

          </div>

        </section>

        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <section
          style={
            styles.quickSection
          }
        >

          <div
            style={
              styles.sectionHeading
            }
          >

            <h2
              style={
                styles.quickTitle
              }
            >
              Quick Actions
            </h2>

            <button
              type="button"
              style={
                styles.seeAllButton
              }
              onClick={() =>
                setShowMenu(
                  previous =>
                    !previous
                )
              }
            >
              See all <span>›</span>
            </button>

          </div>

          <div
            style={
              styles.servicesGrid
            }
          >

            {services.map(
              service => (

                <button
                  type="button"
                  key={
                    service.name
                  }
                  style={
                    styles.serviceButton
                  }
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

                  <div
                    style={
                      styles.serviceName
                    }
                  >
                    {service.name}
                  </div>

                </button>

              )
            )}

          </div>

        </section>

        {/* ==================================================
            MORE MENU
        ================================================== */}

        {showMenu && (

          <section
            style={
              styles.morePanel
            }
          >

            <div
              style={
                styles.moreHeader
              }
            >

              <div>

                <h3
                  style={
                    styles.moreTitle
                  }
                >
                  More Services
                </h3>

                <p
                  style={
                    styles.moreSubtitle
                  }
                >
                  Choose a service
                  to continue.
                </p>

              </div>

              <button
                type="button"
                style={
                  styles.closeSmallButton
                }
                onClick={() =>
                  setShowMenu(false)
                }
              >
                ×
              </button>

            </div>

            <div
              style={
                styles.moreItems
              }
            >

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate(
                    '/transactions'
                  )
                }
              >
                <span>↕</span>
                Transactions
              </button>

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate('/wallet')
                }
              >
                <span>▱</span>
                Wallet
              </button>

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate('/profile')
                }
              >
                <span>♙</span>
                Profile
              </button>

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate('/settings')
                }
              >
                <span>⚙</span>
                Settings
              </button>

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate(
                    '/verify-phone'
                  )
                }
              >
                <span>✓</span>
                Verify Phone
              </button>

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate(
                    '/virtual-card'
                  )
                }
              >
                <span>▣</span>
                Cards
              </button>

            </div>

          </section>

        )}

        {/* ==================================================
            ACCOUNT VERIFICATION
        ================================================== */}

        <section
          style={
            styles.verificationCard
          }
        >

          <div
            style={
              styles.verificationIcon
            }
          >
            {kycDisplay.icon}
          </div>

          <div
            style={
              styles.verificationText
            }
          >

            <h3
              style={
                styles.verificationTitle
              }
            >
              Account Verification
            </h3>

            <p
              style={
                styles.verificationDescription
              }
            >
              {kycDisplay.type ===
              'verified'
                ? `Your account is ${kycDisplay.text}.`
                : 'Complete your KYC to increase your limits.'}
            </p>

          </div>

          <button
            type="button"
            style={
              styles.verifyButton
            }
            onClick={() =>
              navigate('/kyc')
            }
          >
            {kycDisplay.type ===
            'verified'
              ? 'View KYC'
              : 'Verify Now'}

            <span>›</span>
          </button>

        </section>

        {/* ==================================================
            RECENT TRANSACTIONS
        ================================================== */}

        <section
          style={
            styles.transactionsSection
          }
        >

          <div
            style={
              styles.sectionHeading
            }
          >

            <h2
              style={
                styles.transactionsTitle
              }
            >
              Recent Transactions
            </h2>

            <button
              type="button"
              style={
                styles.seeAllButton
              }
              onClick={() =>
                navigate(
                  '/transactions'
                )
              }
            >
              See all <span>›</span>
            </button>

          </div>

          <button
            type="button"
            style={
              styles.emptyTransactions
            }
            onClick={() =>
              navigate(
                '/transactions'
              )
            }
          >

            <div
              style={
                styles.emptyIcon
              }
            >
              ▤
            </div>

            <div
              style={
                styles.emptyTransactionText
              }
            >

              <strong>
                No transactions yet
              </strong>

              <p
                style={
                  styles.emptyDescription
                }
              >
                Your transactions
                will appear here.
              </p>

            </div>

          </button>

        </section>

      </main>

      {/* ====================================================
          BOTTOM NAVIGATION
      ==================================================== */}

      <nav
        style={
          styles.bottomNav
        }
      >

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
          <span
            style={
              styles.navIcon
            }
          >
            ⌂
          </span>

          <span>
            Home
          </span>

          <span
            style={
              styles.activeIndicator
            }
          />
        </button>

        <button
          type="button"
          style={
            styles.navItem
          }
          onClick={() =>
            navigate(
              '/transactions'
            )
          }
        >
          <span
            style={
              styles.navIcon
            }
          >
            ↕
          </span>

          <span>
            Transactions
          </span>
        </button>

        <button
          type="button"
          style={
            styles.navItem
          }
          onClick={() =>
            navigate(
              '/virtual-card'
            )
          }
        >
          <span
            style={
              styles.navIcon
            }
          >
            ▣
          </span>

          <span>
            Cards
          </span>
        </button>

        <button
          type="button"
          style={
            styles.navItem
          }
          onClick={() =>
            navigate('/wallet')
          }
        >
          <span
            style={
              styles.navIcon
            }
          >
            ▱
          </span>

          <span>
            Wallet
          </span>
        </button>

        <button
          type="button"
          style={
            styles.navItem
          }
          onClick={() =>
            navigate('/profile')
          }
        >
          <span
            style={
              styles.navIcon
            }
          >
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

// ============================================================
// STYLES
// ============================================================

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
    gap: 20,
    marginBottom: 18,
  },

  welcomeSmall: {
    color: '#728078',
    fontSize: 16,
    marginBottom: 2,
  },

  name: {
    margin: 0,
    fontSize: 31,
    fontWeight: 800,
    lineHeight: 1.1,
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#748079',
    fontSize: 14,
  },

  kycBadge: {
    border: 'none',
    borderRadius: 999,
    padding: '10px 14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: '#fff7e8',
    color: '#9a5b00',
  },

  kycVerified: {
    background: '#e9f9f0',
    color: '#087c43',
  },

  kycPending: {
    background: '#fff7e8',
    color: '#9a5b00',
  },

  kycRequired: {
    background: '#fff2f0',
    color: '#a53227',
  },

  kycLoading: {
    background: '#f1f4f2',
    color: '#68756f',
  },

  checkCircle: {
    width: 25,
    height: 25,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'currentColor',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
  },

  balanceCard: {
    minHeight: 205,
    borderRadius: 25,
    background:
      'linear-gradient(135deg, #079447, #12bd63)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 27,
  },

  waveOne: {
    position: 'absolute',
    width: 500,
    height: 180,
    borderRadius: '50%',
    border:
      '1px solid rgba(255,255,255,0.12)',
    right: -180,
    bottom: -110,
    transform: 'rotate(-12deg)',
  },

  waveTwo: {
    position: 'absolute',
    width: 430,
    height: 150,
    borderRadius: '50%',
    border:
      '1px solid rgba(255,255,255,0.10)',
    left: -190,
    bottom: -100,
    transform: 'rotate(12deg)',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: 27,
  },

  balanceTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 17,
    fontWeight: 600,
  },

  hideButton: {
    border:
      '1px solid rgba(255,255,255,0.25)',
    background:
      'rgba(255,255,255,0.08)',
    color: '#ffffff',
    borderRadius: 13,
    padding: '9px 13px',
    cursor: 'pointer',
    fontWeight: 700,
  },

  eyeIcon: {
    marginRight: 5,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 800,
    marginTop: 34,
  },

  quickSection: {
    marginBottom: 22,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 13,
  },

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: 10,
  },

  serviceButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    minWidth: 0,
    padding: 5,
  },

  serviceIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    background: '#eef8f3',
    color: '#079447',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 8px',
    fontSize: 27,
  },

  bettingIcon: {
    fontSize: 27,
  },

  serviceName: {
    color: '#263d33',
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.25,
  },

  morePanel: {
    background: '#ffffff',
    border:
      '1px solid #e5ebe8',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  moreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  moreTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
  },

  moreSubtitle: {
    margin: '4px 0 0',
    color: '#7a8781',
    fontSize: 12,
  },

  closeSmallButton: {
    border: 'none',
    background: '#eef8f3',
    color: '#087c43',
    width: 32,
    height: 32,
    borderRadius: 10,
    fontSize: 20,
    cursor: 'pointer',
  },

  moreItems: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },

  moreItem: {
    border:
      '1px solid #e5ebe8',
    background: '#f9fbfa',
    borderRadius: 12,
    padding: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: '#263d33',
    fontWeight: 700,
    cursor: 'pointer',
  },

  verificationCard: {
    background: '#effbf5',
    border:
      '1px solid #d4eee0',
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    marginBottom: 22,
  },

  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: '#d9f5e7',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    fontWeight: 800,
    flexShrink: 0,
  },

  verificationText: {
    flex: 1,
  },

  verificationTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
  },

  verificationDescription: {
    margin: '5px 0 0',
    color: '#68776f',
    fontSize: 12,
    lineHeight: 1.5,
  },

  verifyButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 10,
    padding: '10px 13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    whiteSpace: 'nowrap',
  },

  transactionsSection: {
    background: '#ffffff',
    border:
      '1px solid #e5ebe8',
    borderRadius: 18,
    padding: 18,
    marginBottom: 25,
  },

  transactionsTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
  },

  emptyTransactions: {
    width: '100%',
    border:
      '1px solid #edf1ef',
    background: '#fafcfb',
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: '#eef8f3',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  emptyTransactionText: {
    color: '#263d33',
    fontSize: 13,
  },

  emptyDescription: {
    margin: '4px 0 0',
    color: '#7a8781',
    fontSize: 11,
  },

  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    background:
      'rgba(255,255,255,0.98)',
    borderTop:
      '1px solid #e2e9e5',
    display: 'grid',
    gridTemplateColumns:
      'repeat(5, 1fr)',
    zIndex: 30,
    boxShadow:
      '0 -5px 18px rgba(25,55,43,0.05)',
  },

  navItem: {
    border: 'none',
    background: 'transparent',
    color: '#7a8781',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
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
    width: 34,
    height: 3,
    borderRadius: 5,
    background: '#079447',
  },
};

export default Dashboard;
