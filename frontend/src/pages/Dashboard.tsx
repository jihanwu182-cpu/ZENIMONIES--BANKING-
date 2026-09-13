import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

/* ============================================================
   TYPES
============================================================ */

type Service = {
  name: string;
  description: string;
  icon: string;
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

type UserData = {
  full_name?: string;
  name?: string;
  first_name?: string;
  phone?: string;
};

/* ============================================================
   DASHBOARD
============================================================ */

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

  const [account, setAccount] =
    useState<AccountData | null>(null);

  const [accountLoading, setAccountLoading] =
    useState(true);

  const [user, setUser] =
    useState<UserData | null>(null);

  /* ==========================================================
     API
  ========================================================== */

  const apiBase =
    process.env.REACT_APP_API_URL ||
    'https://zenimonies-banking.onrender.com';

  /* ==========================================================
     LOAD USER FROM LOCAL STORAGE
  ========================================================== */

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem(
          'zenimonies_user'
        );

      if (storedUser) {
        const parsed =
          JSON.parse(storedUser);

        setUser(parsed);
      }
    } catch (error) {
      console.error(
        'Unable to load user:',
        error
      );
    }
  }, []);

  /* ==========================================================
     GET USER NAME
  ========================================================== */

  const displayName = useMemo(() => {
    const fullName =
      user?.full_name ||
      user?.name ||
      '';

    if (fullName.trim()) {
      return fullName.trim();
    }

    if (user?.first_name) {
      return user.first_name;
    }

    return 'User';
  }, [user]);

  const firstLetter =
    displayName.charAt(0).toUpperCase() ||
    'U';

  /* ==========================================================
     LOAD ACCOUNT
  ========================================================== */

  const loadAccount = async () => {
    try {
      setAccountLoading(true);

      const token =
        localStorage.getItem(
          'zenimonies_token'
        ) ||
        localStorage.getItem('token') ||
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

  /* ==========================================================
     LOAD KYC
  ========================================================== */

  useEffect(() => {
    const loadKycStatus =
      async () => {
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
              status:
                'not_verified',
              tier: 0,
              bvn_verified:
                false,
              id_verified:
                false,
              tier_3_verified:
                false,
            });
          }
        } catch (error) {
          console.error(
            'Dashboard KYC loading error:',
            error
          );

          setKyc({
            status:
              'not_verified',
            tier: 0,
            bvn_verified:
              false,
            id_verified:
              false,
            tier_3_verified:
              false,
          });
        } finally {
          setKycLoading(false);
        }
      };

    loadKycStatus();
    loadAccount();

    const handleFocus = () => {
      loadAccount();
    };

    const handleVisibility =
      () => {
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
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [apiBase]);

  /* ==========================================================
     BALANCE
  ========================================================== */

  const accountBalance =
    Number(
      account?.balance ?? 0
    );

  const accountCurrency =
    (
      account?.currency ||
      'NGN'
    ).toUpperCase();

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
      ? '₦••••••'
      : `${accountCurrency} ••••••`;

  /* ==========================================================
     KYC DISPLAY
  ========================================================== */

  const kycDisplay =
    useMemo(() => {
      if (kycLoading) {
        return {
          title: 'Checking KYC...',
          description:
            'Please wait while we check your verification status.',
          type: 'loading',
        };
      }

      const status =
        String(
          kyc?.status || ''
        ).toLowerCase();

      const tier =
        Number(kyc?.tier || 0);

      const verified =
        status === 'verified' ||
        status === 'approved' ||
        status === 'completed';

      if (verified) {
        return {
          title:
            tier > 0
              ? `Tier ${tier} Verified`
              : 'KYC Verified',
          description:
            'Your account verification is complete.',
          type: 'verified',
        };
      }

      if (
        status === 'pending' ||
        status === 'submitted' ||
        status === 'processing' ||
        status === 'under_review'
      ) {
        return {
          title:
            'KYC Verification Pending',
          description:
            'Your verification is currently being reviewed.',
          type: 'pending',
        };
      }

      return {
        title:
          'KYC Verification Required',
        description:
          'Complete your KYC to increase your limits.',
        type: 'required',
      };
    }, [kyc, kycLoading]);

  /* ==========================================================
     SERVICES
  ========================================================== */

  const services: Service[] = [
    {
      name: 'Add Money',
      icon: 'plus',
      description:
        'Fund your account',
    },
    {
      name: 'To Bank',
      icon: 'bank',
      description:
        'Send to any bank',
    },
    {
      name: 'Send to ZENIMONIES',
      icon: 'send',
      description:
        'Send to another Zenimonies user',
    },
    {
      name: 'Airtime',
      icon: 'phone',
      description:
        'Buy airtime',
    },
    {
      name: 'Data',
      icon: 'data',
      description:
        'Buy mobile data',
    },
    {
      name: 'Betting',
      icon: 'ball',
      description:
        'Fund your betting account',
    },
    {
      name: 'TV',
      icon: 'tv',
      description:
        'Pay TV bills',
    },
    {
      name: 'Bills',
      icon: 'receipt',
      description:
        'Pay your bills',
    },
    {
      name: 'SafeBox',
      icon: 'lock',
      description:
        'Save securely',
    },
    {
      name: 'More',
      icon: 'grid',
      description:
        'More services',
    },
  ];

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const handleServiceClick =
    (service: string) => {
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

  /* ==========================================================
     ICON
  ========================================================== */

  const Icon = ({
    name,
    size = 30,
  }: {
    name: string;
    size?: number;
  }) => {
    const common = {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap:
        'round' as const,
      strokeLinejoin:
        'round' as const,
    };

    switch (name) {
      case 'plus':
        return (
          <svg {...common}>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        );

      case 'bank':
        return (
          <svg {...common}>
            <path d="M3 10h18" />
            <path d="M5 10v8" />
            <path d="M9 10v8" />
            <path d="M15 10v8" />
            <path d="M19 10v8" />
            <path d="M3 18h18" />
            <path d="M2 10l10-6 10 6" />
          </svg>
        );

      case 'send':
        return (
          <svg {...common}>
            <path d="M4 12h15" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        );

      case 'phone':
        return (
          <svg {...common}>
            <rect
              x="7"
              y="2.5"
              width="10"
              height="19"
              rx="2"
            />
            <path d="M10 18.5h4" />
          </svg>
        );

      case 'data':
        return (
          <svg {...common}>
            <path d="M5 19v-3" />
            <path d="M9.5 19v-6" />
            <path d="M14.5 19v-10" />
            <path d="M19 19V5" />
          </svg>
        );

      case 'ball':
        return (
          <svg {...common}>
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="M12 7l3 2-1 4h-4l-1-4 3-2z" />
            <path d="M9 13l-3 2" />
            <path d="M15 13l3 2" />
            <path d="M10 17l-1 3" />
            <path d="M14 17l1 3" />
          </svg>
        );

      case 'tv':
        return (
          <svg {...common}>
            <rect
              x="3"
              y="5"
              width="18"
              height="13"
              rx="2"
            />
            <path d="M8 21h8" />
            <path d="M12 18v3" />
          </svg>
        );

      case 'receipt':
        return (
          <svg {...common}>
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
            <path d="M9 8h6" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </svg>
        );

      case 'lock':
        return (
          <svg {...common}>
            <rect
              x="5"
              y="10"
              width="14"
              height="10"
              rx="2"
            />
            <path d="M8 10V7a4 4 0 018 0v3" />
          </svg>
        );

      case 'grid':
        return (
          <svg {...common}>
            <circle cx="5" cy="5" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="19" cy="5" r="1" />
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="19" r="1" />
            <circle cx="12" cy="19" r="1" />
            <circle cx="19" cy="19" r="1" />
          </svg>
        );

      case 'bell':
        return (
          <svg {...common}>
            <path d="M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>
        );

      case 'eye':
        return (
          <svg {...common}>
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
            <circle
              cx="12"
              cy="12"
              r="2.5"
            />
          </svg>
        );

      case 'shield':
        return (
          <svg {...common}>
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
            <path d="M12 8v5" />
            <circle
              cx="12"
              cy="16"
              r=".7"
              fill="currentColor"
            />
          </svg>
        );

      case 'home':
        return (
          <svg {...common}>
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M10 20v-6h4v6" />
          </svg>
        );

      case 'transactions':
        return (
          <svg {...common}>
            <path d="M7 7h13l-3-3" />
            <path d="M17 17H4l3 3" />
            <path d="M20 7l-3 3" />
            <path d="M4 17l3-3" />
          </svg>
        );

      case 'card':
        return (
          <svg {...common}>
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <path d="M3 10h18" />
          </svg>
        );

      case 'wallet':
        return (
          <svg {...common}>
            <path d="M4 6h15a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
            <path d="M16 13h5" />
            <circle
              cx="16"
              cy="13"
              r="1"
            />
            <path d="M4 6l2-3h12" />
          </svg>
        );

      case 'user':
        return (
          <svg {...common}>
            <circle
              cx="12"
              cy="8"
              r="3.5"
            />
            <path d="M5 21c.8-4 3.2-6 7-6s6.2 2 7 6" />
          </svg>
        );

      case 'settings':
        return (
          <svg {...common}>
            <circle
              cx="12"
              cy="12"
              r="3"
            />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6v.2h-2.8v-.2a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1-2-2 .1-.1A1.7 1.7 0 007 15a1.7 1.7 0 00-1.6-1H5v-2.8h.2a1.7 1.7 0 001.6-1A1.7 1.7 0 006.5 8.3l-.1-.1 2-2 .1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 001-1.6v-.2h2.8V5a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.2V14h-.2a1.7 1.7 0 00-1.6 1z" />
          </svg>
        );

      default:
        return null;
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

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
            <div
              style={styles.brandName}
            >
              Zenimonies
            </div>

            <div
              style={styles.brandSubtitle}
            >
              DIGITAL BANKING
            </div>
          </div>

        </div>

        <div
          style={styles.headerRight}
        >

          {/* NOTIFICATION */}

          <button
            type="button"
            aria-label="Notifications"
            style={
              styles.notificationButton
            }
            onClick={() =>
              alert(
                'No new notifications'
              )
            }
          >
            <Icon
              name="bell"
              size={29}
            />

            <span
              style={
                styles.notificationDot
              }
            />
          </button>

          {/* PROFILE */}

          <button
            type="button"
            style={
              styles.profileButton
            }
            onClick={() =>
              navigate('/profile')
            }
          >

            <div
              style={styles.avatar}
            >
              {firstLetter}
            </div>

            <span
              style={
                styles.headerName
              }
            >
              {displayName}
            </span>

          </button>

        </div>

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main style={styles.main}>

        {/* WELCOME */}

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

            <h1
              style={styles.name}
            >
              {displayName}
            </h1>

            <p
              style={styles.subtitle}
            >
              Here's your financial
              overview.
            </p>

          </div>

        </section>

        {/* ====================================================
            KYC ALERT
        ==================================================== */}

        {kycDisplay.type !==
          'verified' && (

          <button
            type="button"
            style={
              styles.kycAlert
            }
            onClick={() =>
              navigate('/kyc')
            }
          >

            <div
              style={
                styles.kycAlertIcon
              }
            >
              <Icon
                name="shield"
                size={25}
              />
            </div>

            <div
              style={
                styles.kycAlertText
              }
            >

              <strong>
                {
                  kycDisplay.title
                }
              </strong>

              <span>
                {
                  kycDisplay.description
                }
              </span>

            </div>

            <span
              style={
                styles.chevron
              }
            >
              ›
            </span>

          </button>
        )}

        {/* ====================================================
            BALANCE CARD — DARK LATEST DESIGN
        ==================================================== */}

        <section
          style={
            styles.balanceCard
          }
        >

          <div
            style={
              styles.balanceWaveOne
            }
          />

          <div
            style={
              styles.balanceWaveTwo
            }
          />

          <div
            style={
              styles.balanceWatermark
            }
          >
            Z
          </div>

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

                <Icon
                  name="eye"
                  size={23}
                />

                <span>
                  {showBalance
                    ? 'Hide'
                    : 'Show'}
                </span>

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
              <span
                style={
                  styles.lockSymbol
                }
              >
                🔒
              </span>

              Your funds are safe
              and secure
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

          <h2
            style={
              styles.quickTitle
            }
          >
            Quick Actions
          </h2>

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
                    style={
                      styles.serviceIcon
                    }
                  >
                    <Icon
                      name={
                        service.icon
                      }
                      size={34}
                    />
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
            styles.moreServices
          }
        >

          <div
            style={
              styles.sectionHeading
            }
          >

            <h2
              style={
                styles.sectionTitle
              }
            >
              More Services
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
              See all ›
            </button>

          </div>

          <div
            style={
              styles.moreGrid
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
              <Icon
                name="transactions"
                size={31}
              />
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
              <Icon
                name="wallet"
                size={31}
              />
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
              <Icon
                name="card"
                size={31}
              />
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
                navigate(
                  '/settings'
                )
              }
            >
              <Icon
                name="settings"
                size={31}
              />
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
                styles.morePanelHeader
              }
            >
              <strong>
                More Services
              </strong>

              <button
                type="button"
                style={
                  styles.closeButton
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
                styles.morePanelGrid
              }
            >

              <button
                type="button"
                style={
                  styles.panelItem
                }
                onClick={() =>
                  navigate(
                    '/verify-phone'
                  )
                }
              >
                Verify Phone
              </button>

              <button
                type="button"
                style={
                  styles.panelItem
                }
                onClick={() =>
                  navigate(
                    '/virtual-card'
                  )
                }
              >
                Cards
              </button>

              <button
                type="button"
                style={
                  styles.panelItem
                }
                onClick={() =>
                  navigate(
                    '/safebox'
                  )
                }
              >
                SafeBox
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
                styles.sectionTitle
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
              See all ›
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
              <Icon
                name="transactions"
                size={25}
              />
            </div>

            <div
              style={
                styles.emptyText
              }
            >

              <strong>
                No transactions yet
              </strong>

              <span>
                Your transactions
                will appear here.
              </span>

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
            ...styles.navActive,
          }}
          onClick={() =>
            navigate('/')
          }
        >
          <Icon
            name="home"
            size={27}
          />

          <span>
            Home
          </span>

          <div
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
          <Icon
            name="transactions"
            size={27}
          />

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
          <Icon
            name="card"
            size={27}
          />

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
          <Icon
            name="wallet"
            size={27}
          />

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
          <Icon
            name="user"
            size={27}
          />

          <span>
            Profile
          </span>
        </button>

      </nav>

    </div>
  );
};

/* ============================================================
   STYLES
============================================================ */

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #f8fcfa 0%, #eff8f4 100%)',
    color: '#102a21',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 100,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    minHeight: 76,
    background:
      'rgba(255,255,255,0.96)',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    padding:
      '12px max(4%, 18px)',
    borderBottom:
      '1px solid #e7efeb',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter:
      'blur(14px)',
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
  },

  logo: {
    width: 49,
    height: 49,
    borderRadius: 15,
    background:
      'linear-gradient(135deg, #05a653, #087d42)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 29,
    fontWeight: 900,
    boxShadow:
      '0 8px 20px rgba(5,166,83,0.20)',
  },

  brandName: {
    fontSize: 22,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    marginTop: 5,
    fontSize: 8,
    letterSpacing: 3,
    color: '#9aa9a2',
    fontWeight: 700,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
  },

  notificationButton: {
    width: 40,
    height: 40,
    border: 'none',
    background:
      'transparent',
    color: '#143a2d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    padding: 0,
  },

  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ef3340',
    border:
      '2px solid #ffffff',
  },

  profileButton: {
    border: 'none',
    background:
      'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer',
    padding: 0,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: '50%',
    background: '#e5f7ef',
    color: '#078a4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 17,
    fontWeight: 800,
  },

  headerName: {
    color: '#078a4a',
    fontWeight: 800,
    fontSize: 15,
  },

  /* ==========================================================
     MAIN
  ========================================================== */

  main: {
    width:
      'min(1080px, 92%)',
    margin: '0 auto',
    paddingTop: 22,
  },

  welcomeSection: {
    marginBottom: 17,
  },

  welcomeSmall: {
    color: '#71817a',
    fontSize: 16,
    fontWeight: 500,
  },

  name: {
    margin: '1px 0 0',
    fontSize: 34,
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: -1.2,
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#78867f',
    fontSize: 15,
  },

  /* ==========================================================
     KYC
  ========================================================== */

  kycAlert: {
    width: '100%',
    border: 'none',
    borderRadius: 18,
    background:
      'linear-gradient(135deg, #fff1ef, #fff7f5)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 15px',
    marginBottom: 17,
    cursor: 'pointer',
    textAlign: 'left',
  },

  kycAlertIcon: {
    width: 43,
    height: 43,
    borderRadius: '50%',
    background: '#ffe4e0',
    color: '#d02020',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  kycAlertText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
  },

  kycAlertTitle: {
    color: '#bd2424',
  },

  chevron: {
    color: '#6f7d77',
    fontSize: 29,
    lineHeight: 1,
  },

  /* ==========================================================
     DARK BALANCE CARD
  ========================================================== */

  balanceCard: {
    minHeight: 205,
    borderRadius: 27,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 28,
    background:
      'linear-gradient(135deg, #07583f 0%, #063b2d 55%, #042d23 100%)',
    boxShadow:
      '0 16px 35px rgba(2,72,51,0.22)',
  },

  balanceWaveOne: {
    position: 'absolute',
    width: 520,
    height: 230,
    borderRadius: '50%',
    border:
      '1px solid rgba(82,218,159,0.18)',
    right: -175,
    top: 38,
    transform:
      'rotate(-11deg)',
  },

  balanceWaveTwo: {
    position: 'absolute',
    width: 610,
    height: 220,
    borderRadius: '50%',
    border:
      '1px solid rgba(82,218,159,0.13)',
    left: -230,
    bottom: -130,
    transform:
      'rotate(11deg)',
  },

  balanceWatermark: {
    position: 'absolute',
    right: 25,
    bottom: -35,
    fontSize: 170,
    lineHeight: 1,
    fontWeight: 900,
    color:
      'rgba(68,207,148,0.08)',
    pointerEvents: 'none',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: 27,
  },

  balanceTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 15,
  },

  balanceLabel: {
    color:
      'rgba(255,255,255,0.91)',
    fontSize: 18,
    fontWeight: 600,
  },

  hideButton: {
    border:
      '1px solid rgba(255,255,255,0.25)',
    background:
      'rgba(255,255,255,0.08)',
    color: '#ffffff',
    borderRadius: 999,
    padding:
      '10px 17px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize: 45,
    fontWeight: 900,
    letterSpacing: -1.7,
    marginTop: 29,
    lineHeight: 1,
  },

  safeText: {
    marginTop: 28,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color:
      'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: 600,
  },

  lockSymbol: {
    fontSize: 19,
  },

  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  quickSection: {
    marginBottom: 28,
  },

  quickTitle: {
    margin: '0 0 15px',
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: -0.6,
  },

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    columnGap: 13,
    rowGap: 23,
  },

  serviceButton: {
    border: 'none',
    background:
      'transparent',
    cursor: 'pointer',
    padding: 0,
    minWidth: 0,
  },

  serviceIcon: {
    width: '100%',
    aspectRatio: '1 / 0.82',
    maxHeight: 82,
    borderRadius: 20,
    background:
      'rgba(255,255,255,0.82)',
    border:
      '1px solid #e0eee8',
    color: '#07974d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 8px 22px rgba(30,87,65,0.035)',
    transition:
      'transform 0.15s ease',
  },

  serviceName: {
    marginTop: 8,
    color: '#1c362c',
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.25,
    textAlign: 'center',
    minHeight: 32,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  /* ==========================================================
     MORE SERVICES
  ========================================================== */

  moreServices: {
    background:
      'rgba(255,255,255,0.92)',
    border:
      '1px solid #e1ebe7',
    borderRadius: 20,
    padding: 15,
    marginBottom: 18,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 11,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: -0.4,
  },

  seeAllButton: {
    border: 'none',
    background:
      'transparent',
    color: '#07934b',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    padding: 3,
  },

  moreGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, 1fr)',
    gap: 8,
  },

  moreServiceItem: {
    border: 'none',
    background:
      '#f5faf8',
    borderRadius: 13,
    minHeight: 78,
    color: '#078c4a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
  },

  /* ==========================================================
     MORE PANEL
  ========================================================== */

  morePanel: {
    background: '#ffffff',
    border:
      '1px solid #dfeae5',
    borderRadius: 18,
    padding: 15,
    marginBottom: 18,
  },

  morePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
    fontSize: 17,
  },

  closeButton: {
    border: 'none',
    width: 32,
    height: 32,
    borderRadius: 10,
    background: '#eff8f4',
    color: '#087e45',
    fontSize: 22,
    cursor: 'pointer',
  },

  morePanelGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, 1fr)',
    gap: 8,
  },

  panelItem: {
    border:
      '1px solid #e2ebe7',
    background: '#f9fcfa',
    borderRadius: 11,
    padding: 12,
    color: '#274238',
    fontWeight: 700,
    cursor: 'pointer',
  },

  /* ==========================================================
     RECENT TRANSACTIONS
  ========================================================== */

  transactionsSection: {
    background:
      'rgba(255,255,255,0.95)',
    border:
      '1px solid #e1ebe7',
    borderRadius: 20,
    padding: 15,
    marginBottom: 24,
  },

  emptyTransactions: {
    width: '100%',
    border:
      '1px solid #edf2ef',
    background: '#fbfdfc',
    borderRadius: 15,
    padding: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },

  emptyIcon: {
    width: 45,
    height: 45,
    borderRadius: '50%',
    background: '#e6f8ef',
    color: '#07934b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  emptyText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#263d33',
    fontSize: 13,
  },

  emptyDescription: {
    color: '#7b8982',
    fontSize: 11,
  },

  /* ==========================================================
     BOTTOM NAVIGATION
  ========================================================== */

  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: 76,
    background:
      'rgba(255,255,255,0.98)',
    borderTop:
      '1px solid #e1e9e5',
    display: 'grid',
    gridTemplateColumns:
      'repeat(5, 1fr)',
    zIndex: 50,
    boxShadow:
      '0 -8px 25px rgba(22,60,45,0.07)',
    backdropFilter:
      'blur(15px)',
  },

  navItem: {
    position: 'relative',
    border: 'none',
    background:
      'transparent',
    color: '#7b8983',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 650,
  },

  navActive: {
    color: '#078f4b',
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 38,
    height: 4,
    borderRadius: 10,
    background: '#079b50',
  },
};

/* ============================================================
   MOBILE RESPONSIVE ADJUSTMENTS
============================================================ */

if (
  typeof document !== 'undefined'
) {
  const style =
    document.createElement(
      'style'
    );

  style.innerHTML = `
    @media (max-width: 600px) {

      .dashboard-placeholder {
        width: 100%;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }
    }

    @media (min-width: 700px) {

      .dashboard-placeholder {
        max-width: 1080px;
        margin: auto;
      }
    }
  `;

  if (
    !document.head.querySelector(
      '[data-zenimonies-dashboard]'
    )
  ) {
    style.setAttribute(
      'data-zenimonies-dashboard',
      'true'
    );

    document.head.appendChild(
      style
    );
  }
}

export default Dashboard;
