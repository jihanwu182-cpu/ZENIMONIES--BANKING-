import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  AccountBalanceRounded,
  AddRounded,
  ArrowForwardRounded,
  ArrowUpwardRounded,
  BarChartRounded,
  CheckCircleRounded,
  ChevronRightRounded,
  CreditCardRounded,
  DataUsageRounded,
  DownloadRounded,
  HomeRounded,
  LockRounded,
  MoreHorizRounded,
  NotificationsNoneRounded,
  PhoneAndroidRounded,
  PersonRounded,
  ReceiptLongRounded,
  SettingsRounded,
  SportsSoccerRounded,
  SwapHorizRounded,
  TvRounded,
  WalletRounded,
} from '@mui/icons-material';


// ============================================================
// TYPES
// ============================================================

type Service = {
  name: string;
  description: string;
  icon: React.ReactNode;
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
  id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type RecentTransaction = {
  id?: string;
  type?: string;
  transaction_type?: string;
  description?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  reference?: string;
  created_at?: string;
};


// ============================================================
// DASHBOARD
// ============================================================

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

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

  const [recentTransactions, setRecentTransactions] =
    useState<RecentTransaction[]>([]);

  const [notificationsCount, setNotificationsCount] =
    useState(0);


  // ==========================================================
  // API BASE
  // ==========================================================

  const apiBase =
    process.env.REACT_APP_API_URL ||
    'https://zenimonies-banking.onrender.com';


  // ==========================================================
  // TOKEN
  // ==========================================================

  const getToken = () => {
    return (
      localStorage.getItem(
        'zenimonies_token'
      ) ||
      localStorage.getItem(
        'token'
      ) ||
      localStorage.getItem(
        'access_token'
      )
    );
  };


  // ==========================================================
  // LOAD SAVED USER
  // ==========================================================

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          'zenimonies_user'
        );

      if (savedUser) {
        const parsedUser =
          JSON.parse(savedUser);

        setUser(parsedUser);
      }
    } catch (error) {
      console.error(
        'Unable to load saved user:',
        error
      );
    }
  }, []);


  // ==========================================================
  // LOAD ACCOUNT
  // ==========================================================

  const loadAccount = async () => {
    try {
      setAccountLoading(true);

      const token = getToken();

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
        setAccount(
          data.account
        );
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

  const loadKycStatus =
    async () => {
      try {
        setKycLoading(true);

        const token = getToken();

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
          setKyc(
            data.kyc
          );
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


  // ==========================================================
  // LOAD RECENT TRANSACTIONS
  // ==========================================================

  const loadRecentTransactions =
    async () => {
      try {
        const token = getToken();

        if (!token) {
          return;
        }

        const response =
          await fetch(
            `${apiBase}/api/account/transactions?limit=2`,
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
          return;
        }

        const data =
          await response.json();

        if (
          Array.isArray(
            data.transactions
          )
        ) {
          setRecentTransactions(
            data.transactions.slice(
              0,
              2
            )
          );
        }
      } catch (error) {
        console.error(
          'Recent transactions loading error:',
          error
        );
      }
    };


  // ==========================================================
  // LOAD NOTIFICATION COUNT
  // ==========================================================

  const loadNotifications =
    async () => {
      try {
        const token = getToken();

        if (!token) {
          return;
        }

        const response =
          await fetch(
            `${apiBase}/api/notifications`,
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
          return;
        }

        const data =
          await response.json();

        if (
          Array.isArray(
            data.notifications
          )
        ) {
          const unread =
            data.notifications.filter(
              (item: {
                is_read?: boolean;
              }) =>
                item.is_read === false
            ).length;

          setNotificationsCount(
            unread
          );
        }
      } catch (error) {
        console.error(
          'Notification loading error:',
          error
        );
      }
    };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadKycStatus();
    loadAccount();
    loadRecentTransactions();
    loadNotifications();

    const handleFocus = () => {
      loadAccount();
      loadRecentTransactions();
      loadNotifications();
    };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          loadAccount();
          loadRecentTransactions();
          loadNotifications();
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
  // USER DISPLAY
  // ==========================================================

  const displayName =
    user?.full_name ||
    user?.name ||
    'Harrison';

  const firstName =
    displayName
      .trim()
      .split(/\s+/)[0] ||
    'Harrison';

  const avatarLetter =
    firstName
      .charAt(0)
      .toUpperCase();


  // ==========================================================
  // ACCOUNT BALANCE
  // ==========================================================

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


  // ==========================================================
  // KYC DISPLAY
  // ==========================================================

  const kycDisplay =
    useMemo(() => {
      if (kycLoading) {
        return {
          text:
            'Checking KYC...',
          description:
            'Checking your verification status.',
          type:
            'loading',
        };
      }

      const status =
        String(
          kyc?.status || ''
        ).toLowerCase();

      const tier =
        Number(
          kyc?.tier || 0
        );

      const verified =
        status ===
          'verified' ||
        status ===
          'approved' ||
        status ===
          'completed';

      if (verified) {
        if (tier >= 3) {
          return {
            text:
              'Tier 3 Verified',
            description:
              'Your account is Tier 3 Verified.',
            type:
              'verified',
          };
        }

        if (tier === 2) {
          return {
            text:
              'Tier 2 Verified',
            description:
              'Your account is Tier 2 Verified.',
            type:
              'verified',
          };
        }

        if (tier === 1) {
          return {
            text:
              'Tier 1 Verified',
            description:
              'Your account is Tier 1 Verified.',
            type:
              'verified',
          };
        }
      }

      if (
        status ===
          'pending' ||
        status ===
          'submitted' ||
        status ===
          'processing' ||
        status ===
          'under_review'
      ) {
        return {
          text:
            'KYC Verification Pending',
          description:
            'Your verification is being reviewed.',
          type:
            'pending',
        };
      }

      return {
        text:
          'KYC Verification Required',
        description:
          'Complete your KYC to increase your limits.',
        type:
          'required',
      };
    }, [
      kyc,
      kycLoading,
    ]);


  // ==========================================================
  // SERVICES
  // ==========================================================

  const services: Service[] =
    [
      {
        name:
          'Add Money',

        description:
          'Fund your account',

        icon:
          <AddRounded />,
      },

      {
        name:
          'To Bank',

        description:
          'Send to any bank',

        icon:
          <AccountBalanceRounded />,
      },

      {
        name:
          'Send to ZENIMONIES',

        description:
          'Send to another Zenimonies user',

        icon:
          <ArrowForwardRounded />,
      },

      {
        name:
          'Airtime',

        description:
          'Buy airtime',

        icon:
          <PhoneAndroidRounded />,
      },

      {
        name:
          'Data',

        description:
          'Buy mobile data',

        icon:
          <BarChartRounded />,
      },

      {
        name:
          'Betting',

        description:
          'Fund your bets',

        icon:
          <SportsSoccerRounded />,
      },

      {
        name:
          'TV',

        description:
          'Pay TV bills',

        icon:
          <TvRounded />,
      },

      {
        name:
          'Bills',

        description:
          'Pay your bills',

        icon:
          <ReceiptLongRounded />,
      },

      {
        name:
          'SafeBox',

        description:
          'Save securely',

        icon:
          <LockRounded />,
      },

      {
        name:
          'More',

        description:
          'More services',

        icon:
          <MoreHorizRounded />,
      },
    ];


  // ==========================================================
  // SERVICE NAVIGATION
  // ==========================================================

  const handleServiceClick =
    (
      service: string
    ) => {
      switch (service) {
        case 'Add Money':
          navigate(
            '/deposit'
          );
          break;

        case 'To Bank':
          navigate(
            '/to-bank'
          );
          break;

        case 'Send to ZENIMONIES':
          navigate(
            '/transfer'
          );
          break;

        case 'Airtime':
          navigate(
            '/airtime'
          );
          break;

        case 'Data':
          navigate(
            '/data'
          );
          break;

        case 'Betting':
          navigate(
            '/betting'
          );
          break;

        case 'TV':
          navigate(
            '/tv'
          );
          break;

        case 'Bills':
          navigate(
            '/bills'
          );
          break;

        case 'SafeBox':
          navigate(
            '/safebox'
          );
          break;

        case 'More':
          setShowMenu(
            previous =>
              !previous
          );
          break;

        default:
          break;
      }
    };


  // ==========================================================
  // FORMAT TRANSACTION DATE
  // ==========================================================

  const formatTransactionDate =
    (
      value?: string
    ) => {
      if (!value) {
        return '';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      return date.toLocaleString(
        'en-NG',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      );
    };


  // ==========================================================
  // TRANSACTION HELPERS
  // ==========================================================

  const isIncomingTransaction =
    (
      transaction: RecentTransaction
    ) => {
      const type =
        String(
          transaction.type ||
          transaction.transaction_type ||
          ''
        ).toLowerCase();

      const description =
        String(
          transaction.description ||
          ''
        ).toLowerCase();

      return (
        type.includes(
          'received'
        ) ||
        type.includes(
          'deposit'
        ) ||
        type.includes(
          'funding'
        ) ||
        type.includes(
          'credit'
        ) ||
        description.includes(
          'received'
        ) ||
        description.includes(
          'funding'
        )
      );
    };


  const formatTransactionAmount =
    (
      transaction: RecentTransaction
    ) => {
      const amount =
        Number(
          transaction.amount || 0
        );

      const currency =
        (
          transaction.currency ||
          'NGN'
        ).toUpperCase();

      const money =
        currency === 'NGN'
          ? `₦${amount.toLocaleString(
              'en-NG',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`
          : `${currency} ${amount.toLocaleString(
              'en-NG',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`;

      return isIncomingTransaction(
        transaction
      )
        ? `+${money}`
        : `−${money}`;
    };


  const getTransactionTitle =
    (
      transaction: RecentTransaction
    ) => {
      const type =
        String(
          transaction.type ||
          transaction.transaction_type ||
          ''
        ).toLowerCase();

      if (
        type.includes(
          'received'
        )
      ) {
        return 'Money Received';
      }

      if (
        type.includes(
          'internal_transfer'
        )
      ) {
        return 'Transfer';
      }

      if (
        type.includes(
          'deposit'
        ) ||
        type.includes(
          'funding'
        )
      ) {
        return 'Account Funding';
      }

      return (
        transaction.description ||
        'Transaction'
      );
    };


  const getTransactionStatus =
    (
      transaction: RecentTransaction
    ) => {
      const status =
        String(
          transaction.status ||
          ''
        ).toLowerCase();

      if (
        status ===
          'completed' ||
        status ===
          'successful' ||
        status ===
          'success'
      ) {
        return {
          label:
            'Completed',
          type:
            'completed',
        };
      }

      if (
        status ===
          'failed' ||
        status ===
          'failure'
      ) {
        return {
          label:
            'Failed',
          type:
            'failed',
        };
      }

      return {
        label:
          'Pending',
        type:
          'pending',
      };
    };


  // ==========================================================
  // TRANSACTION ICON
  // ==========================================================

  const getTransactionIcon =
    (
      transaction: RecentTransaction
    ) => {
      if (
        isIncomingTransaction(
          transaction
        )
      ) {
        return (
          <ArrowDownwardIcon />
        );
      }

      return (
        <ArrowUpwardRounded />
      );
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={
        styles.page
      }
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header
        style={
          styles.header
        }
      >

        <div
          style={
            styles.brandArea
          }
        >

          <div
            style={
              styles.logo
            }
          >
            Z
          </div>

          <div>
            <div
              style={
                styles.brandName
              }
            >
              Zenimonies
            </div>

            <div
              style={
                styles.brandSubtitle
              }
            >
              DIGITAL BANKING
            </div>
          </div>

        </div>


        <div
          style={
            styles.headerRight
          }
        >

          {/* NOTIFICATION */}

          <button
            type="button"
            style={
              styles.notificationButton
            }
            onClick={() =>
              navigate(
                '/notifications'
              )
            }
            aria-label="Notifications"
          >

            <NotificationsNoneRounded
              sx={{
                fontSize: 27,
              }}
            />

            {notificationsCount >
              0 && (
              <span
                style={
                  styles.notificationDot
                }
              />
            )}

          </button>


          {/* PROFILE */}

          <button
            type="button"
            style={
              styles.profileButton
            }
            onClick={() =>
              navigate(
                '/profile'
              )
            }
          >

            <div
              style={
                styles.avatar
              }
            >
              {avatarLetter}
            </div>

            <span
              style={
                styles.headerName
              }
            >
              {firstName}
            </span>

          </button>

        </div>

      </header>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main
        style={
          styles.main
        }
      >

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

            <h1
              style={
                styles.name
              }
            >
              {firstName}
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
            KYC BANNER
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
            {kycDisplay.type ===
            'verified' ? (
              <CheckCircleRounded
                sx={{
                  fontSize: 25,
                }}
              />
            ) : (
              '!'
            )}
          </div>

          <div
            style={
              styles.kycBannerContent
            }
          >

            <div
              style={
                styles.kycBannerTitle
              }
            >
              {kycDisplay.text}
            </div>

            <div
              style={
                styles.kycBannerDescription
              }
            >
              {kycDisplay.type ===
              'verified'
                ? 'Your account verification is complete.'
                : 'Complete your KYC to increase your limits.'}
            </div>

          </div>

          <ChevronRightRounded
            sx={{
              fontSize: 28,
              color: '#687a72',
            }}
          />

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
              styles.balanceWaveThree
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
                styles.balanceSecure
              }
            >
              <LockRounded
                sx={{
                  fontSize: 18,
                }}
              />

              <span>
                Your funds are safe and secure
              </span>
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
                    style={
                      styles.serviceIcon
                    }
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
              styles.moreServicesHeader
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
                styles.seeAllButton
              }
              onClick={() =>
                setShowMenu(
                  previous =>
                    !previous
                )
              }
            >
              See all
              <ChevronRightRounded
                sx={{
                  fontSize: 18,
                }}
              />
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
              <SwapHorizRounded
                sx={{
                  fontSize: 29,
                  color: '#079447',
                }}
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
                navigate(
                  '/wallet'
                )
              }
            >
              <WalletRounded
                sx={{
                  fontSize: 29,
                  color: '#079447',
                }}
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
              <CreditCardRounded
                sx={{
                  fontSize: 29,
                  color: '#079447',
                }}
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
              <SettingsRounded
                sx={{
                  fontSize: 29,
                  color: '#079447',
                }}
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

              <div>
                <h3
                  style={
                    styles.morePanelTitle
                  }
                >
                  More Services
                </h3>

                <p
                  style={
                    styles.morePanelSubtitle
                  }
                >
                  Choose a service to continue.
                </p>
              </div>

              <button
                type="button"
                style={
                  styles.closeButton
                }
                onClick={() =>
                  setShowMenu(
                    false
                  )
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
                  styles.morePanelItem
                }
                onClick={() =>
                  navigate(
                    '/transactions'
                  )
                }
              >
                <SwapHorizRounded />
                Transactions
              </button>


              <button
                type="button"
                style={
                  styles.morePanelItem
                }
                onClick={() =>
                  navigate(
                    '/wallet'
                  )
                }
              >
                <WalletRounded />
                Wallet
              </button>


              <button
                type="button"
                style={
                  styles.morePanelItem
                }
                onClick={() =>
                  navigate(
                    '/virtual-card'
                  )
                }
              >
                <CreditCardRounded />
                Cards
              </button>


              <button
                type="button"
                style={
                  styles.morePanelItem
                }
                onClick={() =>
                  navigate(
                    '/profile'
                  )
                }
              >
                <PersonRounded />
                Profile
              </button>


              <button
                type="button"
                style={
                  styles.morePanelItem
                }
                onClick={() =>
                  navigate(
                    '/settings'
                  )
                }
              >
                <SettingsRounded />
                Settings
              </button>


              <button
                type="button"
                style={
                  styles.morePanelItem
                }
                onClick={() =>
                  navigate(
                    '/verify-phone'
                  )
                }
              >
                <CheckCircleRounded />
                Verify Phone
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
              styles.transactionsHeader
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
              <ChevronRightRounded
                sx={{
                  fontSize: 18,
                }}
              />
            </button>

          </div>


          {recentTransactions.length ===
          0 ? (

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
                <ReceiptLongRounded
                  sx={{
                    fontSize: 25,
                  }}
                />
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
                  Your transactions will appear here.
                </p>

              </div>

              <ChevronRightRounded
                sx={{
                  color: '#87938e',
                }}
              />

            </button>

          ) : (

            <div>
              {recentTransactions.map(
                (
                  transaction,
                  index
                ) => {

                  const transactionStatus =
                    getTransactionStatus(
                      transaction
                    );

                  const incoming =
                    isIncomingTransaction(
                      transaction
                    );

                  return (
                    <button
                      type="button"
                      key={
                        transaction.id ||
                        transaction.reference ||
                        index
                      }
                      style={{
                        ...styles.transactionRow,

                        borderBottom:
                          index <
                          recentTransactions.length -
                            1
                            ? '1px solid #e7eeeb'
                            : 'none',
                      }}
                      onClick={() =>
                        navigate(
                          '/transactions'
                        )
                      }
                    >

                      <div
                        style={{
                          ...styles.transactionIcon,

                          background:
                            incoming
                              ? '#e2f8ed'
                              : transactionStatus.type ===
                                  'pending'
                                ? '#f0f2f4'
                                : '#eaf8f2',

                          color:
                            incoming
                              ? '#079447'
                              : transactionStatus.type ===
                                  'pending'
                                ? '#68756f'
                                : '#079447',
                        }}
                      >
                        {getTransactionIcon(
                          transaction
                        )}
                      </div>


                      <div
                        style={
                          styles.transactionMiddle
                        }
                      >

                        <div
                          style={
                            styles.transactionName
                          }
                        >
                          {getTransactionTitle(
                            transaction
                          )}
                        </div>

                        <div
                          style={
                            styles.transactionMeta
                          }
                        >
                          {transaction.description ||
                            'Zenimonies'}

                          {transaction.created_at &&
                            ` • ${formatTransactionDate(
                              transaction.created_at
                            )}`}
                        </div>

                      </div>


                      <div
                        style={
                          styles.transactionRight
                        }
                      >

                        <div
                          style={{
                            ...styles.transactionAmount,

                            color:
                              incoming
                                ? '#079447'
                                : '#172b23',
                          }}
                        >
                          {formatTransactionAmount(
                            transaction
                          )}
                        </div>

                        <span
                          style={{
                            ...styles.transactionStatus,

                            ...(transactionStatus.type ===
                            'completed'
                              ? styles.statusCompleted
                              : {}),

                            ...(transactionStatus.type ===
                            'pending'
                              ? styles.statusPending
                              : {}),

                            ...(transactionStatus.type ===
                            'failed'
                              ? styles.statusFailed
                              : {}),
                          }}
                        >
                          {
                            transactionStatus.label
                          }
                        </span>

                      </div>

                    </button>
                  );
                }
              )}
            </div>

          )}

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

          <HomeRounded
            sx={{
              fontSize: 25,
            }}
          />

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

          <SwapHorizRounded
            sx={{
              fontSize: 25,
            }}
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

          <CreditCardRounded
            sx={{
              fontSize: 25,
            }}
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
            navigate(
              '/wallet'
            )
          }
        >

          <WalletRounded
            sx={{
              fontSize: 25,
            }}
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
            navigate(
              '/profile'
            )
          }
        >

          <PersonRounded
            sx={{
              fontSize: 25,
            }}
          />

          <span>
            Profile
          </span>

        </button>

      </nav>

    </div>
  );
};


// ============================================================
// HELPER ICON
// ============================================================

const ArrowDownwardIcon =
  () => (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4V18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <path
        d="M6 12L12 18L18 12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );


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
    minHeight:
      '100vh',

    background:
      'linear-gradient(180deg, #fbfefd 0%, #f1f9f5 100%)',

    color:
      '#10251d',

    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',

    paddingBottom:
      96,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    minHeight:
      72,

    background:
      'rgba(255,255,255,0.97)',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    padding:
      '0 4.5%',

    borderBottom:
      '1px solid #edf2ef',

    position:
      'sticky',

    top:
      0,

    zIndex:
      20,

    backdropFilter:
      'blur(14px)',
  },


  brandArea: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      10,
  },


  logo: {
    width:
      45,

    height:
      45,

    borderRadius:
      13,

    background:
      'linear-gradient(145deg, #08a44f, #079447)',

    color:
      '#ffffff',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    fontSize:
      27,

    fontWeight:
      900,

    boxShadow:
      '0 6px 15px rgba(7,148,71,0.18)',
  },


  brandName: {
    fontSize:
      20,

    fontWeight:
      850,

    lineHeight:
      1.05,

    color:
      '#0d2119',
  },


  brandSubtitle: {
    fontSize:
      8,

    letterSpacing:
      2.2,

    color:
      '#9aa7a1',

    marginTop:
      4,

    fontWeight:
      600,
  },


  headerRight: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      11,
  },


  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  notificationButton: {
    width:
      43,

    height:
      43,

    border:
      'none',

    background:
      'transparent',

    color:
      '#18382c',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    cursor:
      'pointer',

    position:
      'relative',

    borderRadius:
      '50%',
  },


  notificationDot: {
    position:
      'absolute',

    top:
      6,

    right:
      7,

    width:
      9,

    height:
      9,

    borderRadius:
      '50%',

    background:
      '#ef3340',

    border:
      '2px solid #ffffff',
  },


  // ==========================================================
  // PROFILE
  // ==========================================================

  profileButton: {
    display:
      'flex',

    alignItems:
      'center',

    gap:
      8,

    border:
      'none',

    background:
      'transparent',

    cursor:
      'pointer',

    padding:
      0,
  },


  avatar: {
    width:
      40,

    height:
      40,

    borderRadius:
      '50%',

    background:
      '#e4f6ed',

    color:
      '#087c43',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    fontWeight:
      800,

    fontSize:
      16,
  },


  headerName: {
    fontWeight:
      800,

    fontSize:
      14,

    color:
      '#087c43',
  },


  // ==========================================================
  // MAIN
  // ==========================================================

  main: {
    width:
      'min(1080px, 92%)',

    margin:
      '0 auto',

    paddingTop:
      22,
  },


  // ==========================================================
  // WELCOME
  // ==========================================================

  welcomeSection: {
    display:
      'flex',

    alignItems:
      'flex-start',

    justifyContent:
      'space-between',

    marginBottom:
      14,
  },


  welcomeSmall: {
    color:
      '#77857f',

    fontSize:
      16,

    marginBottom:
      1,

    fontWeight:
      500,
  },


  name: {
    margin:
      0,

    fontSize:
      32,

    fontWeight:
      850,

    lineHeight:
      1.05,

    color:
      '#071d15',

    letterSpacing:
      -0.8,
  },


  subtitle: {
    margin:
      '7px 0 0',

    color:
      '#74817b',

    fontSize:
      14,

    fontWeight:
      500,
  },


  // ==========================================================
  // KYC BANNER
  // ==========================================================

  kycBanner: {
    width:
      '100%',

    border:
      'none',

    borderRadius:
      18,

    background:
      '#fff1ef',

    color:
      '#9d3128',

    padding:
      '12px 14px',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      12,

    cursor:
      'pointer',

    textAlign:
      'left',

    marginBottom:
      16,

    boxSizing:
      'border-box',
  },


  kycBannerVerified: {
    background:
      '#e9f9f0',

    color:
      '#087c43',
  },


  kycBannerPending: {
    background:
      '#fff7e7',

    color:
      '#9a6200',
  },


  kycBannerIcon: {
    width:
      40,

    height:
      40,

    flexShrink:
      0,

    borderRadius:
      '50%',

    background:
      'rgba(255,255,255,0.72)',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    fontSize:
      22,

    fontWeight:
      900,
  },


  kycBannerContent: {
    flex:
      1,

    minWidth:
      0,
  },


  kycBannerTitle: {
    fontSize:
      16,

    fontWeight:
      850,

    lineHeight:
      1.2,
  },


  kycBannerDescription: {
    marginTop:
      3,

    color:
      '#687872',

    fontSize:
      13,

    lineHeight:
      1.3,
  },


  // ==========================================================
  // BALANCE
  // ==========================================================

  balanceCard: {
    minHeight:
      180,

    borderRadius:
      26,

    background:
      'linear-gradient(135deg, #08a34f 0%, #10bd62 58%, #079447 100%)',

    position:
      'relative',

    overflow:
      'hidden',

    marginBottom:
      23,

    boxShadow:
      '0 15px 35px rgba(0,137,71,0.15)',
  },


  balanceWaveOne: {
    position:
      'absolute',

    width:
      530,

    height:
      220,

    borderRadius:
      '50%',

    border:
      '1px solid rgba(255,255,255,0.12)',

    right:
      -190,

    bottom:
      -135,

    transform:
      'rotate(-8deg)',
  },


  balanceWaveTwo: {
    position:
      'absolute',

    width:
      480,

    height:
      170,

    borderRadius:
      '50%',

    border:
      '1px solid rgba(255,255,255,0.10)',

    left:
      -230,

    bottom:
      -120,

    transform:
      'rotate(12deg)',
  },


  balanceWaveThree: {
    position:
      'absolute',

    width:
      390,

    height:
      140,

    borderRadius:
      '50%',

    border:
      '1px solid rgba(255,255,255,0.08)',

    right:
      -100,

    top:
      45,

    transform:
      'rotate(10deg)',
  },


  balanceWatermark: {
    position:
      'absolute',

    right:
      32,

    bottom:
      -17,

    fontSize:
      120,

    fontWeight:
      900,

    color:
      'rgba(255,255,255,0.055)',

    lineHeight:
      1,
  },


  balanceContent: {
    position:
      'relative',

    zIndex:
      2,

    padding:
      '26px 27px',
  },


  balanceTop: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    gap:
      12,
  },


  balanceLabel: {
    color:
      'rgba(255,255,255,0.92)',

    fontSize:
      17,

    fontWeight:
      600,
  },


  hideButton: {
    border:
      '1px solid rgba(255,255,255,0.28)',

    background:
      'rgba(255,255,255,0.10)',

    color:
      '#ffffff',

    borderRadius:
      999,

    padding:
      '9px 15px',

    cursor:
      'pointer',

    fontWeight:
      750,

    fontSize:
      14,
  },


  eyeIcon: {
    marginRight:
      6,
  },


  balanceAmount: {
    color:
      '#ffffff',

    fontSize:
      43,

    fontWeight:
      900,

    marginTop:
      25,

    letterSpacing:
      -1.5,

    lineHeight:
      1,
  },


  balanceSecure: {
    marginTop:
      18,

    color:
      'rgba(255,255,255,0.93)',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      7,

    fontSize:
      13,

    fontWeight:
      600,
  },


  // ==========================================================
  // QUICK ACTIONS
  // ==========================================================

  quickSection: {
    marginBottom:
      24,
  },


  sectionHeading: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    marginBottom:
      13,
  },


  quickTitle: {
    margin:
      0,

    fontSize:
      23,

    fontWeight:
      850,

    color:
      '#0b2119',

    letterSpacing:
      -0.4,
  },


  servicesGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',

    gap:
      13,
  },


  serviceButton: {
    border:
      'none',

    background:
      'transparent',

    cursor:
      'pointer',

    minWidth:
      0,

    padding:
      0,

    display:
      'flex',

    flexDirection:
      'column',

    alignItems:
      'center',
  },


  serviceIcon: {
    width:
      78,

    height:
      70,

    borderRadius:
      19,

    background:
      'rgba(255,255,255,0.72)',

    color:
      '#079447',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    margin:
      '0 auto 8px',

    fontSize:
      31,

    boxShadow:
      '0 8px 24px rgba(39,87,66,0.05)',

    border:
      '1px solid rgba(222,238,231,0.65)',
  },


  serviceName: {
    color:
      '#172e25',

    fontSize:
      12,

    fontWeight:
      750,

    textAlign:
      'center',

    lineHeight:
      1.25,

    minHeight:
      30,

    display:
      'flex',

    alignItems:
      'flex-start',

    justifyContent:
      'center',
  },


  // ==========================================================
  // MORE SERVICES
  // ==========================================================

  moreServicesCard: {
    background:
      'rgba(255,255,255,0.96)',

    border:
      '1px solid #e4ece8',

    borderRadius:
      20,

    padding:
      14,

    marginBottom:
      18,

    boxShadow:
      '0 8px 25px rgba(31,67,52,0.035)',
  },


  moreServicesHeader: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    marginBottom:
      10,

    padding:
      '0 4px',
  },


  moreServicesTitle: {
    margin:
      0,

    fontSize:
      19,

    fontWeight:
      850,

    color:
      '#0c2119',
  },


  seeAllButton: {
    border:
      'none',

    background:
      'transparent',

    color:
      '#079447',

    fontWeight:
      800,

    cursor:
      'pointer',

    fontSize:
      13,

    display:
      'flex',

    alignItems:
      'center',

    gap:
      1,

    padding:
      0,
  },


  moreServicesGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',

    gap:
      8,
  },


  moreServiceItem: {
    border:
      'none',

    background:
      '#f7fbf9',

    borderRadius:
      13,

    padding:
      '10px 5px',

    display:
      'flex',

    flexDirection:
      'column',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      4,

    color:
      '#65756e',

    fontSize:
      11,

    cursor:
      'pointer',
  },


  // ==========================================================
  // MORE PANEL
  // ==========================================================

  morePanel: {
    background:
      '#ffffff',

    border:
      '1px solid #e2ebe7',

    borderRadius:
      19,

    padding:
      17,

    marginBottom:
      18,

    boxShadow:
      '0 10px 30px rgba(30,65,50,0.07)',
  },


  morePanelHeader: {
    display:
      'flex',

    justifyContent:
      'space-between',

    alignItems:
      'flex-start',

    marginBottom:
      14,
  },


  morePanelTitle: {
    margin:
      0,

    fontSize:
      18,

    fontWeight:
      850,
  },


  morePanelSubtitle: {
    margin:
      '4px 0 0',

    color:
      '#7a8781',

    fontSize:
      12,
  },


  closeButton: {
    border:
      'none',

    background:
      '#eef8f3',

    color:
      '#087c43',

    width:
      34,

    height:
      34,

    borderRadius:
      10,

    fontSize:
      22,

    cursor:
      'pointer',
  },


  morePanelGrid: {
    display:
      'grid',

    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',

    gap:
      9,
  },


  morePanelItem: {
    border:
      '1px solid #e3ebe7',

    background:
      '#f9fbfa',

    borderRadius:
      12,

    padding:
      13,

    display:
      'flex',

    alignItems:
      'center',

    gap:
      9,

    color:
      '#263d33',

    fontWeight:
      700,

    cursor:
      'pointer',
  },


  // ==========================================================
  // RECENT TRANSACTIONS
  // ==========================================================

  transactionsSection: {
    background:
      '#ffffff',

    border:
      '1px solid #e4ebe8',

    borderRadius:
      20,

    padding:
      14,

    marginBottom:
      25,

    boxShadow:
      '0 8px 25px rgba(31,67,52,0.035)',
  },


  transactionsHeader: {
    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    marginBottom:
      8,

    padding:
      '0 4px',
  },


  transactionsTitle: {
    margin:
      0,

    fontSize:
      19,

    fontWeight:
      850,

    color:
      '#0c2119',
  },


  emptyTransactions: {
    width:
      '100%',

    border:
      '1px solid #edf1ef',

    background:
      '#fafcfb',

    borderRadius:
      14,

    padding:
      14,

    display:
      'flex',

    alignItems:
      'center',

    gap:
      12,

    cursor:
      'pointer',

    textAlign:
      'left',

    boxSizing:
      'border-box',
  },


  emptyIcon: {
    width:
      44,

    height:
      44,

    borderRadius:
      13,

    background:
      '#eaf8f2',

    color:
      '#087c43',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    flexShrink:
      0,
  },


  emptyTransactionText: {
    color:
      '#263d33',

    fontSize:
      13,

    flex:
      1,
  },


  emptyDescription: {
    margin:
      '4px 0 0',

    color:
      '#7a8781',

    fontSize:
      11,
  },


  // ==========================================================
  // TRANSACTION ROW
  // ==========================================================

  transactionRow: {
    width:
      '100%',

    borderTop:
      'none',

    borderLeft:
      'none',

    borderRight:
      'none',

    background:
      '#ffffff',

    padding:
      '12px 2px',

    display:
      'flex',

    alignItems:
      'center',

    gap:
      11,

    cursor:
      'pointer',

    textAlign:
      'left',
  },


  transactionIcon: {
    width:
      48,

    height:
      48,

    borderRadius:
      '50%',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    flexShrink:
      0,
  },


  transactionMiddle: {
    flex:
      1,

    minWidth:
      0,
  },


  transactionName: {
    color:
      '#172b23',

    fontSize:
      13,

    fontWeight:
      750,

    whiteSpace:
      'nowrap',

    overflow:
      'hidden',

    textOverflow:
      'ellipsis',
  },


  transactionMeta: {
    marginTop:
      4,

    color:
      '#7b8782',

    fontSize:
      11,

    whiteSpace:
      'nowrap',

    overflow:
      'hidden',

    textOverflow:
      'ellipsis',
  },


  transactionRight: {
    display:
      'flex',

    flexDirection:
      'column',

    alignItems:
      'flex-end',

    flexShrink:
      0,

    gap:
      4,
  },


  transactionAmount: {
    fontSize:
      13,

    fontWeight:
      850,

    whiteSpace:
      'nowrap',
  },


  transactionStatus: {
    padding:
      '4px 9px',

    borderRadius:
      999,

    fontSize:
      10,

    fontWeight:
      750,
  },


  statusCompleted: {
    background:
      '#ddf7e9',

    color:
      '#07874a',
  },


  statusPending: {
    background:
      '#fff0d7',

    color:
      '#b26a00',
  },


  statusFailed: {
    background:
      '#fde8e8',

    color:
      '#c62828',
  },


  // ==========================================================
  // BOTTOM NAVIGATION
  // ==========================================================

  bottomNav: {
    position:
      'fixed',

    left:
      0,

    right:
      0,

    bottom:
      0,

    height:
      73,

    background:
      'rgba(255,255,255,0.98)',

    borderTop:
      '1px solid #e2e9e5',

    display:
      'grid',

    gridTemplateColumns:
      'repeat(5, 1fr)',

    zIndex:
      30,

    boxShadow:
      '0 -6px 20px rgba(25,55,43,0.06)',

    backdropFilter:
      'blur(15px)',
  },


  navItem: {
    border:
      'none',

    background:
      'transparent',

    color:
      '#7b8882',

    display:
      'flex',

    flexDirection:
      'column',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      3,

    fontSize:
      10,

    fontWeight:
      650,

    cursor:
      'pointer',

    position:
      'relative',
  },


  navItemActive: {
    color:
      '#078b4a',

    fontWeight:
      800,
  },


  activeIndicator: {
    position:
      'absolute',

    bottom:
      3,

    width:
      36,

    height:
      3,

    borderRadius:
      5,

    background:
      '#079447',
  },
};


export default Dashboard;
