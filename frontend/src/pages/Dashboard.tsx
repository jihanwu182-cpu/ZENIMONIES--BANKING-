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
  const [unreadNotificationCount, setUnreadNotificationCount] =
  useState(0);

  /* ==========================================================
     API
  ========================================================== */

  const apiBase =
    process.env.REACT_APP_API_URL ||
    'https://zenimonies-banking.onrender.com';

  /* ==========================================================
     LOAD USER
  ========================================================== */

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem(
          'zenimonies_user'
        );

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error(
        'Unable to load user:',
        error
      );
    }
  }, []);

  /* ==========================================================
     USER NAME
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
     FAST DASHBOARD DATA LOADING
  ========================================================== */

  const getToken = () => {
    return (
      localStorage.getItem(
        'zenimonies_token'
      ) ||
      localStorage.getItem('token') ||
      localStorage.getItem(
        'access_token'
      )
    );
  };

  /* ==========================================================
     LOAD ACCOUNT
  ========================================================== */

  const loadAccount = async (
    showLoader = true
  ) => {
    try {
      if (showLoader) {
        setAccountLoading(true);
      }

      const token = getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${apiBase}/api/account`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${token}`,
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

        /*
         * Keep the latest account information
         * available locally for faster rendering
         * when Dashboard is opened again.
         */
        try {
          const storedAccounts =
            JSON.parse(
              localStorage.getItem(
                'zenimonies_accounts'
              ) || '[]'
            );

          const accounts =
            Array.isArray(
              storedAccounts
            )
              ? storedAccounts
              : [];

          const updatedAccounts =
            accounts.length > 0
              ? accounts.map(
                  (item: any) =>
                    item?.id ===
                    data.account?.id
                      ? {
                          ...item,
                          ...data.account,
                        }
                      : item
                )
              : [
                  data.account,
                ];

          localStorage.setItem(
            'zenimonies_accounts',
            JSON.stringify(
              updatedAccounts
            )
          );
        } catch {
          /*
           * Local cache failure must never
           * affect the real account request.
           */
        }
      }
    } catch (error) {
      console.error(
        'Dashboard account loading error:',
        error
      );
    } finally {
      if (showLoader) {
        setAccountLoading(false);
      }
    }
  };

  /* ==========================================================
     LOAD KYC
  ========================================================== */

  const loadKycStatus = async () => {
    try {
      setKycLoading(true);

      const token = getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${apiBase}/api/kyc/status`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${token}`,
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

  /* ==========================================================
     LOAD NOTIFICATION COUNT
  ========================================================== */

  const loadUnreadNotificationCount =
    async () => {
      try {
        const token = getToken();

        if (!token) {
          return;
        }

        const response =
          await fetch(
            `${apiBase}/api/notifications/unread-count`,
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (!response.ok) {
          throw new Error(
            `Notification request failed: ${response.status}`
          );
        }

        const data =
          await response.json();

        if (data?.success) {
          setUnreadNotificationCount(
            Number(
              data.unread_count || 0
            )
          );
        }
      } catch (error) {
        console.error(
          'Failed to load notification count:',
          error
        );
      }
    };

  /* ==========================================================
     INITIAL DASHBOARD LOAD
  ========================================================== */

  useEffect(() => {
    /*
     * Load account and KYC at the same time.
     * They do not need to wait for each other.
     */
    loadAccount(true);
    loadKycStatus();

    /*
     * Notification count is not required to display
     * the main Dashboard, so load it separately.
     */
    loadUnreadNotificationCount();

  }, [apiBase]);

  /* ==========================================================
     REFRESH ACCOUNT WHEN RETURNING TO DASHBOARD
  ========================================================== */

  useEffect(() => {
    let lastRefresh = 0;

    const refreshAccount = () => {
      const now = Date.now();

      /*
       * Prevent duplicate requests when focus and
       * visibilitychange happen together.
       *
       * Only refresh once every 15 seconds.
       */
      if (
        now - lastRefresh <
        15000
      ) {
        return;
      }

      lastRefresh = now;

      loadAccount(false);
    };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          refreshAccount();
        }
      };

    window.addEventListener(
      'focus',
      refreshAccount
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        'focus',
        refreshAccount
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
     QUICK ACTIONS
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
      name: 'Savings',
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
     ICONS
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
            <path d="M4 6h15a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-1z" />
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
            <div style={styles.brandName}>
              Zenimonies
            </div>

            <div style={styles.brandSubtitle}>
              DIGITAL BANKING
            </div>
          </div>

        </div>

        <div style={styles.headerRight}>

          {/* NOTIFICATIONS */}

<button
  type="button"
  aria-label="Notifications"
  style={styles.notificationButton}
  onClick={() => navigate('/notifications')}
>
  <Icon name="bell" size={24} />

  {unreadNotificationCount > 0 && (
    <span
      style={{
        position: 'absolute',
        top: '3px',
        right: '3px',
        minWidth: '17px',
        height: '17px',
        padding: '0 4px',
        borderRadius: '999px',
        background: '#e11d48',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 800,
        border: '2px solid #ffffff',
        boxSizing: 'border-box',
      }}
    >
      {unreadNotificationCount > 99
        ? '99+'
        : unreadNotificationCount}
    </span>
  )}
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

            <h1 style={styles.name}>
              {displayName}
            </h1>

            <p style={styles.subtitle}>
              Here's your financial overview.
            </p>

          </div>
        </section>

        {/* ====================================================
            BALANCE CARD
        ==================================================== */}

        <section
          style={
            styles.balanceCard
          }
        >

          <div
            style={
              styles.balanceGlow
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
              }>

              <div>
                <div
                  style={
                    styles.balanceLabel
                  }
                >
                  Available Balance
                </div>

                <div
                  style={
                    styles.accountType
                  }
                >
                  {account?.account_type ||
                    'Personal Account'}
                </div>
              </div>

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
                aria-label={
                  showBalance
                    ? 'Hide balance'
                    : 'Show balance'
                }
              >
                <Icon
                  name="eye"
                  size={19}
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
                styles.balanceBottom
              }>

              <span
                style={
                  styles.secureBadge
                }
              >
                <span
                  style={
                    styles.secureDot
                  }
                />
                Secure
              </span>

              <span
                style={
                  styles.currencyLabel
                }
              >
                {accountCurrency}
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            KYC
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
                size={22}
              />
            </div>

            <div
              style={
                styles.kycAlertText
              }>

              <strong
                style={
                  styles.kycAlertTitle
                }
              >
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

            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Quick Actions
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Everything you need, in one place.
              </p>
            </div>

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
                    style={
                      styles.serviceIcon
                    }
                  >
                    <Icon
                      name={
                        service.icon
                      }
                      size={28}
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

            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                More Services
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Manage your Zenimonies account.
              </p>
            </div>

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
                size={25}
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
                size={25}
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
                size={25}
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
                size={25}
              />

              <span>
                Settings
              </span>
            </button>

          </div>

        </section>

        <button
  type="button"
  style={
    styles.moreServiceItem
  }
  onClick={() =>
    navigate(
      '/passkey-security'
    )
  }
>
  <span
    style={{
      fontSize: 25,
      lineHeight: 1,
    }}
  >
    🔐
  </span>

  <span>
    Passkey Security
  </span>
</button>

        {/* ====================================================
            MORE PANEL
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
              }>

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
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <div
              style={
                styles.morePanelGrid
              }>

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
            onClick={(event) => {
             event.preventDefault();
           event.stopPropagation();
              navigate('/savings');
          }}
               style={{
              cursor: 'pointer',
             pointerEvents: 'auto',
           }}
         >
           Savings
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
            }>

            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Recent Transactions
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Your latest account activity.
              </p>
            </div>

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
                size={22}
              />
            </div>

            <div
              style={
                styles.emptyText
              }>

              <strong>
                No transactions yet
              </strong>

              <span>
                Your transactions will appear here.
              </span>

            </div>

            <span
              style={
                styles.emptyChevron
              }
            >
              ›
            </span>

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
            size={24}
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
            size={24}
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
            size={24}
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
            size={24}
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
            size={24}
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
      'linear-gradient(180deg, #f9fcfa 0%, #f1f8f5 100%)',
    color: '#102a21',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 96,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    minHeight: 72,
    background:
      'rgba(255,255,255,0.97)',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    padding:
      '10px max(4%, 18px)',
    borderBottom:
      '1px solid #e5eee9',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter:
      'blur(14px)',
  },

  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  logo: {
    width: 43,
    height: 43,
    borderRadius: 13,
    background:
      'linear-gradient(135deg, #087b48, #034d31)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 900,
    boxShadow:
      '0 7px 18px rgba(4,87,53,0.18)',
  },

  brandName: {
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    marginTop: 4,
    fontSize: 7,
    letterSpacing: 2.7,
    color: '#94a49c',
    fontWeight: 800,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  notificationButton: {
    width: 40,
    height: 40,
    border: 'none',
    background:
      'transparent',
    color: '#12392c',
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
    gap: 7,
    cursor: 'pointer',
    padding: 0,
  },

  avatar: {
    width: 39,
    height: 39,
    borderRadius: '50%',
    background: '#e4f5ed',
    color: '#087f47',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 900,
  },

  headerName: {
    color: '#087c46',
    fontWeight: 800,
    fontSize: 14,
    maxWidth: 105,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* ==========================================================
     MAIN
  ========================================================== */

  main: {
    width:
      'min(1040px, 92%)',
    margin: '0 auto',
    paddingTop: 20,
  },

  welcomeSection: {
    marginBottom: 17,
  },

  welcomeSmall: {
    color: '#74847d',
    fontSize: 15,
    fontWeight: 500,
  },

  name: {
    margin: '2px 0 0',
    fontSize: 31,
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: -1,
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#788780',
    fontSize: 14,
  },

  /* ==========================================================
     BALANCE CARD
     
     IMPORTANT:
     This card is intentionally compact.
     Do NOT make it full-width/oversized.
  ========================================================== */

  balanceCard: {
    width: 'min(100%, 680px)',
    minHeight: 178,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 17,
    background:
      'linear-gradient(135deg, #07583f 0%, #064331 55%, #032c22 100%)',
    boxShadow:
      '0 15px 30px rgba(2,72,51,0.20)',
  },

  balanceGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: '50%',
    right: -115,
    top: -120,
    background:
      'rgba(66,208,148,0.10)',
    filter: 'blur(2px)',
  },

  balanceWatermark: {
    position: 'absolute',
    right: 16,
    bottom: -37,
    fontSize: 145,
    lineHeight: 1,
    fontWeight: 900,
    color:
      'rgba(78,218,157,0.07)',
    pointerEvents: 'none',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding:
      '21px 22px 18px',
  },

  balanceTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: 15,
  },

  balanceLabel: {
    color:
      'rgba(255,255,255,0.90)',
    fontSize: 15,
    fontWeight: 650,
  },

  accountType: {
    marginTop: 3,
    color:
      'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'capitalize',
  },

  hideButton: {
    border:
      '1px solid rgba(255,255,255,0.20)',
    background:
      'rgba(255,255,255,0.07)',
    color: '#ffffff',
    borderRadius: 999,
    padding:
      '7px 11px',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },

  balanceAmount: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: -1.2,
    marginTop: 21,
    lineHeight: 1,
  },

  balanceBottom: {
    marginTop: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  secureBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color:
      'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: 700,
  },

  secureDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#57d99d',
    boxShadow:
      '0 0 0 4px rgba(87,217,157,0.10)',
  },

  currencyLabel: {
    color:
      'rgba(255,255,255,0.50)',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
  },

  /* ==========================================================
     KYC
  ========================================================== */

  kycAlert: {
    width: '100%',
    border:
      '1px solid #f3d8d3',
    borderRadius: 16,
    background:
      'linear-gradient(135deg, #fff7f5, #fff1ef)',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding:
      '11px 13px',
    marginBottom: 22,
    cursor: 'pointer',
    textAlign: 'left',
  },

  kycAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#ffe5e1',
    color: '#ca2929',
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
  minWidth: 0,
  color: '#6f7d77',
  fontSize: 13,
  },

  kycAlertTitle: {
  color: '#bd2424',
  fontSize: 13,
  fontWeight: 850,
  },

  chevron: {
    color: '#79857f',
    fontSize: 27,
    lineHeight: 1,
  },

  /* ==========================================================
     SECTIONS
  ========================================================== */

  quickSection: {
    marginBottom: 24,
  },

  sectionHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: -0.45,
  },

  sectionSubtitle: {
    margin: '3px 0 0',
    color: '#89958f',
    fontSize: 11,
    lineHeight: 1.35,
  },

  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  servicesGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(5, minmax(0, 1fr))',
    columnGap: 10,
    rowGap: 18,
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
    width: 58,
    height: 58,
    margin:
      '0 auto',
    borderRadius: 17,
    background:
      '#ffffff',
    border:
      '1px solid #e0ebe6',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 7px 17px rgba(24,77,56,0.045)',
  },

  serviceName: {
    marginTop: 7,
    color: '#20372e',
    fontSize: 11,
    fontWeight: 750,
    lineHeight: 1.25,
    textAlign: 'center',
    minHeight: 28,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  /* ==========================================================
     MORE SERVICES
  ========================================================== */

  moreServices: {
    background:
      'rgba(255,255,255,0.94)',
    border:
      '1px solid #e1ebe7',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },

  seeAllButton: {
    border: 'none',
    background:
      'transparent',
    color: '#078e4b',
    fontSize: 12,
    fontWeight: 850,
    cursor: 'pointer',
    padding: 3,
    flexShrink: 0,
  },

  moreGrid: {
  display: 'grid',
  gridTemplateColumns:
    'repeat(5, 1fr)',
  gap: 8,
},

  moreServiceItem: {
    border: 'none',
    background:
      '#f4faf7',
    borderRadius: 12,
    minHeight: 72,
    color: '#078b4a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 750,
  },

  /* ==========================================================
     MORE PANEL
  ========================================================== */

  morePanel: {
    background: '#ffffff',
    border:
      '1px solid #dfeae5',
    borderRadius: 17,
    padding: 14,
    marginBottom: 18,
  },

  morePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 11,
    fontSize: 15,
  },

  closeButton: {
    border: 'none',
    width: 31,
    height: 31,
    borderRadius: 9,
    background: '#eff8f4',
    color: '#087e45',
    fontSize: 21,
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
    borderRadius: 10,
    padding: 11,
    color: '#274238',
    fontSize: 12,
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },

  emptyTransactions: {
    width: '100%',
    border:
      '1px solid #edf2ef',
    background: '#fbfdfc',
    borderRadius: 14,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    cursor: 'pointer',
    textAlign: 'left',
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
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
    gap: 3,
    color: '#263d33',
    fontSize: 12,
    flex: 1,
  },

  emptyChevron: {
    color: '#82908a',
    fontSize: 23,
    lineHeight: 1,
  },

  /* ==========================================================
     BOTTOM NAV
  ========================================================== */

  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
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
    gap: 4,
    cursor: 'pointer',
    fontSize: 9,
    fontWeight: 700,
  },

  navActive: {
    color: '#078f4b',
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 30,
    height: 3,
    borderRadius: 10,
    background: '#079b50',
  },
};

/* ============================================================
   RESPONSIVE
============================================================ */

if (
  typeof document !== 'undefined'
) {
  const style =
    document.createElement('style');

  style.innerHTML = `
    * {
      box-sizing: border-box;
    }

    button {
      -webkit-tap-highlight-color: transparent;
    }

    @media (max-width: 700px) {

      .dashboard-placeholder {
        width: 100%;
      }
    }

    @media (max-width: 520px) {

      .zenimonies-desktop-only {
        display: none;
      }
    }

    @media (min-width: 900px) {

      .dashboard-placeholder {
        max-width: 1040px;
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

    document.head.appendChild(style);
  }
}

export default Dashboard;
