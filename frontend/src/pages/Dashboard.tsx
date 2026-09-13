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

type AccountData = {
  id?: string;
  account_number?: string;
  account_type?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
  created_at?: string;
  kyc_status?: string;
  kyc_tier?: number;
};

type AccountResponse = {
  success?: boolean;
  account?: AccountData;
  message?: string;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================
  // BALANCE VISIBILITY
  // ==========================================================

  const [showBalance, setShowBalance] =
    useState(true);

  // ==========================================================
  // MORE MENU
  // ==========================================================

  const [showMenu, setShowMenu] =
    useState(false);

  // ==========================================================
  // KYC
  // ==========================================================

  const [kyc, setKyc] =
    useState<KycData | null>(null);

  const [kycLoading, setKycLoading] =
    useState(true);

  // ==========================================================
  // ACCOUNT
  // ==========================================================

  const [account, setAccount] =
    useState<AccountData | null>(null);

  const [accountLoading, setAccountLoading] =
    useState(true);

  // ==========================================================
  // API BASE
  // ==========================================================

  const apiBase =
    process.env.REACT_APP_API_URL ||
    'https://zenimonies-banking.onrender.com';

  // ==========================================================
  // LOAD ACCOUNT
  // ==========================================================

  const loadAccount = async () => {
    try {
      setAccountLoading(true);

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
        setAccountLoading(false);
        return;
      }

      const response =
        await fetch(
          `${apiBase}/api/account`,
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
          `Account request failed: ${response.status}`
        );
      }

      const data: AccountResponse =
        await response.json();

      if (
        data.success &&
        data.account
      ) {
        setAccount(data.account);
      } else {
        console.error(
          'Account response did not contain account data:',
          data
        );
      }
    } catch (error) {
      console.error(
        'Dashboard account loading error:',
        error
      );
    } finally {
      setAccountLoading(false);
    }
  };

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
    loadAccount();

    // ========================================================
    // REFRESH ACCOUNT WHEN USER RETURNS
    // ========================================================

    const handleFocus = () => {
      loadAccount();
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        loadAccount();
      }
    };

    window.addEventListener(
      'focus',
      handleFocus
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, []);

  // ==========================================================
  // BALANCE DISPLAY
  // ==========================================================

  const accountBalance =
    Number(
      account?.balance ?? 0
    );

  const accountCurrency =
    account?.currency || 'NGN';

  const formattedBalance =
    accountCurrency === 'NGN'
      ? `₦${accountBalance.toLocaleString(
          'en-NG',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`
      : `${accountCurrency} ${accountBalance.toLocaleString(
          'en-NG',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`;

  const hiddenBalance =
    accountCurrency === 'NGN'
      ? '₦••••'
      : `${accountCurrency} ••••`;

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

    if (
      status === 'pending' ||
      status === 'submitted' ||
      status === 'processing'
    ) {
      return {
        text: 'KYC Verification Pending',
        icon: '!',
        type: 'pending',
      };
    }

    return {
      text: 'KYC Verification Required',
      icon: '!',
      type: 'required',
    };
  }, [kyc, kycLoading]);

  // ==========================================================
  // QUICK ACTIONS
  //
  // IMPORTANT:
  // Add Money is intentionally FIRST.
  // ==========================================================

  const services: Service[] = [
    {
      name: 'Add Money',
      icon: '＋',
      description:
        'Fund your account',
    },
    {
      name: 'To Bank',
      icon: '▥',
      description:
        'Send to any bank',
    },
    {
      name: 'Send to ZENIMONIES',
      icon: '➤',
      description:
        'Send to another ZENIMONIES user',
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

      case 'To Bank':
        navigate('/to-bank');
        break;

      case 'Send to ZENIMONIES':
        navigate('/transfer');
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

      {/* ======================================================
          HEADER
      ====================================================== */}

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

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main style={styles.main}>

        {/* ====================================================
            WELCOME
        ==================================================== */}

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

        </section>

        {/* ====================================================
            KYC VERIFICATION BANNER
        ==================================================== */}

        <button
          type="button"
          style={{
            ...styles.kycBanner,

            ...(kycDisplay.type ===
            'verified'
              ? styles.kycBannerVerified
              : {}),

            ...(kycDisplay.type ===
            'pending'
              ? styles.kycBannerPending
              : {}),
          }}
          onClick={() =>
            navigate('/kyc')
          }
        >

          <div
            style={
              styles.kycBannerIcon
            }
          >
            {kycDisplay.icon}
          </div>

          <div
            style={
              styles.kycBannerText
            }
          >

            <strong>
              {kycDisplay.text}
            </strong>

            <span>
              {kycDisplay.type ===
              'verified'
                ? 'Your account verification is complete.'
                : 'Complete your KYC to increase your limits.'}
            </span>

          </div>

          <span
            style={
              styles.kycArrow
            }
          >
            ›
          </span>

        </button>

        {/* ====================================================
            BALANCE CARD
        ==================================================== */}

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
              styles.waveThree
            }
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
              {accountLoading
                ? 'Loading...'
                : showBalance
                ? formattedBalance
                : hiddenBalance}
            </div>

            <div
              style={
                styles.safeText
              }
            >
              <span>
                🔒
              </span>

              Your funds are safe and secure
            </div>

          </div>

        </section>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

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

        {/* ====================================================
            MORE SERVICES
        ==================================================== */}

        <section
          style={
            styles.moreServicesCard
          }
        >

          <div
            style={
              styles.moreServicesHeading
            }
          >

            <h2
              style={
                styles.moreServicesTitle
              }
            >
              More Services
            </h2>

            <button
              type="button"
              style={
                styles.moreSeeAll
              }
              onClick={() =>
                setShowMenu(true)
              }
            >
              See all
              <span>
                ›
              </span>
            </button>

          </div>

          <div
            style={
              styles.moreServicesGrid
            }
          >

            <button
              type="button"
              style={
                styles.moreServiceItem
              }
              onClick={() =>
                navigate(
                  '/transactions'
                )
              }
            >
              <span
                style={
                  styles.moreServiceIcon
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
                styles.moreServiceItem
              }
              onClick={() =>
                navigate('/wallet')
              }
            >
              <span
                style={
                  styles.moreServiceIcon
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
                styles.moreServiceItem
              }
              onClick={() =>
                navigate(
                  '/virtual-card'
                )
              }
            >
              <span
                style={
                  styles.moreServiceIcon
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
                styles.moreServiceItem
              }
              onClick={() =>
                navigate('/settings')
              }
            >
              <span
                style={
                  styles.moreServiceIcon
                }
              >
                ⚙
              </span>

              <span>
                Settings
              </span>
            </button>

          </div>

        </section>

        {/* ====================================================
            MORE MENU
        ==================================================== */}

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
                  Choose a service to continue.
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

              <button
                type="button"
                style={
                  styles.moreItem
                }
                onClick={() =>
                  navigate('/withdraw')
                }
              >
                <span>↗</span>
                Withdraw
              </button>

            </div>

          </section>

        )}

        {/* ====================================================
            RECENT TRANSACTIONS
        ==================================================== */}

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
              See all
              <span>
                ›
              </span>
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

      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

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

  // ==========================================================
  // PAGE
  // ==========================================================

  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #f8fcfa 0%, #f2f8f5 100%)',
    color: '#10251d',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 88,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 68,
    background:
      'rgba(255,255,255,0.97)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding:
      '0 4%',
    borderBottom:
      '1px solid #edf2ef',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter:
      'blur(10px)',
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
    background:
      'linear-gradient(135deg, #079447, #12b85f)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
    boxShadow:
      '0 5px 15px rgba(7,148,71,0.18)',
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
    background:
      'transparent',
    fontSize: 24,
    cursor: 'pointer',
    position: 'relative',
    color: '#18382c',
  },

  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background:
      '#ef3340',
    position: 'absolute',
    top: 1,
    right: 0,
  },

  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    border: 'none',
    background:
      'transparent',
    cursor: 'pointer',
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background:
      '#e3f4ec',
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

  // ==========================================================
  // MAIN
  // ==========================================================

  main: {
    width:
      'min(1080px, 92%)',
    margin:
      '0 auto',
    paddingTop: 22,
  },

  // ==========================================================
  // WELCOME
  // ==========================================================

  welcomeSection: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: 20,
    marginBottom: 16,
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
    margin:
      '7px 0 0',
    color: '#748079',
    fontSize: 14,
  },

  // ==========================================================
  // KYC BANNER
  // ==========================================================

  kycBanner: {
    width: '100%',
    border: 'none',
    borderRadius: 17,
    padding:
      '12px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background:
      'linear-gradient(135deg, #fff1ef, #fff7f5)',
    color: '#a53227',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: 16,
    boxSizing: 'border-box',
  },

  kycBannerVerified: {
    background:
      'linear-gradient(135deg, #e9f9f0, #f2fcf7)',
    color: '#087c43',
  },

  kycBannerPending: {
    background:
      'linear-gradient(135deg, #fff7e8, #fffbf1)',
    color: '#9a5b00',
  },

  kycBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background:
      'rgba(255,255,255,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    fontWeight: 900,
    flexShrink: 0,
  },

  kycBannerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
    minWidth: 0,
  },

  kycArrow: {
    fontSize: 29,
    fontWeight: 300,
    color: '#5e6e67',
  },

  // ==========================================================
  // BALANCE CARD
  // ==========================================================

  balanceCard: {
    minHeight: 184,
    borderRadius: 25,
    background:
      'linear-gradient(135deg, #079447 0%, #09aa52 48%, #12bd63 100%)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 22,
    boxShadow:
      '0 15px 35px rgba(7,148,71,0.18)',
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
    transform:
      'rotate(-12deg)',
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
    transform:
      'rotate(12deg)',
  },

  waveThree: {
    position: 'absolute',
    width: 280,
    height: 110,
    borderRadius: '50%',
    border:
      '1px solid rgba(255,255,255,0.08)',
    right: -80,
    top: 20,
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: 25,
  },

  balanceTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  balanceLabel: {
    color:
      'rgba(255,255,255,0.92)',
    fontSize: 17,
    fontWeight: 500,
  },

  hideButton: {
    border:
      '1px solid rgba(255,255,255,0.22)',
    background:
      'rgba(255,255,255,0.12)',
    color: '#ffffff',
    borderRadius: 22,
    padding:
      '8px 13px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
  },

  eyeIcon: {
    marginRight: 6,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize: 41,
    fontWeight: 800,
    marginTop: 23,
    letterSpacing: -1,
  },

  safeText: {
    color:
      'rgba(255,255,255,0.94)',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 13,
    fontWeight: 500,
    marginTop: 13,
  },

  // ==========================================================
  // QUICK ACTIONS
  // ==========================================================

  quickSection: {
    marginBottom: 21,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  quickTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: 11,
  },

  serviceButton: {
    border: 'none',
    background:
      'transparent',
    cursor: 'pointer',
    minWidth: 0,
    padding: 3,
  },

  serviceIcon: {
    width: 70,
    height: 70,
    borderRadius: 19,
    background:
      '#f0f9f5',
    color: '#079447',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin:
      '0 auto 7px',
    fontSize: 28,
    boxShadow:
      '0 5px 14px rgba(20,70,50,0.04)',
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
    minHeight: 30,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  // ==========================================================
  // MORE SERVICES CARD
  // ==========================================================

  moreServicesCard: {
    background:
      '#ffffff',
    border:
      '1px solid #e7eeea',
    borderRadius: 20,
    padding: 17,
    marginBottom: 21,
    boxShadow:
      '0 8px 25px rgba(24,65,48,0.04)',
  },

  moreServicesHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  moreServicesTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  moreSeeAll: {
    border: 'none',
    background:
      'transparent',
    color: '#087c43',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },

  moreServicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: 9,
  },

  moreServiceItem: {
    border: 'none',
    background:
      '#f5faf7',
    borderRadius: 14,
    padding:
      '10px 5px',
    minHeight: 75,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    color: '#718079',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },

  moreServiceIcon: {
    color: '#079447',
    fontSize: 26,
    lineHeight: 1,
  },

  // ==========================================================
  // MORE PANEL
  // ==========================================================

  morePanel: {
    background:
      '#ffffff',
    border:
      '1px solid #e5ebe8',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    boxShadow:
      '0 10px 30px rgba(24,65,48,0.07)',
  },

  moreHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  moreTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
  },

  moreSubtitle: {
    margin:
      '4px 0 0',
    color: '#7a8781',
    fontSize: 12,
  },

  closeSmallButton: {
    border: 'none',
    background:
      '#eef8f3',
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
    background:
      '#f9fbfa',
    borderRadius: 12,
    padding: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: '#263d33',
    fontWeight: 700,
    cursor: 'pointer',
  },

  // ==========================================================
  // TRANSACTIONS
  // ==========================================================

  transactionsSection: {
    background:
      '#ffffff',
    border:
      '1px solid #e5ebe8',
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
    boxShadow:
      '0 8px 25px rgba(24,65,48,0.04)',
  },

  transactionsTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  seeAllButton: {
    border: 'none',
    background:
      'transparent',
    color: '#087c43',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },

  emptyTransactions: {
    width: '100%',
    border:
      '1px solid #edf1ef',
    background:
      '#fafcfb',
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background:
      '#eef8f3',
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
    margin:
      '4px 0 0',
    color: '#7a8781',
    fontSize: 11,
  },

  // ==========================================================
  // BOTTOM NAV
  // ==========================================================

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
      '0 -5px 18px rgba(25,55,43,0.06)',
    backdropFilter:
      'blur(10px)',
  },

  navItem: {
    border: 'none',
    background:
      'transparent',
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
    background:
      '#079447',
  },
};

export default Dashboard;
