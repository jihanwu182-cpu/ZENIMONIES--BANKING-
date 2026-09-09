import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface User {
  id?: number | string;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  kyc_status?: string;
  is_verified?: boolean;
  kyc_tier?: number;
  tier?: number;
}

interface Account {
  id?: number | string;
  account_number?: string;
  account_name?: string;
  account_type?: string;
  balance?: number | string;
  currency?: string;
  status?: string;
}

interface MeResponse {
  success?: boolean;
  user?: User;
  account?: Account | null;
  accounts?: Account[];
}

/* ============================================================
   DASHBOARD
============================================================ */

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const token =
        localStorage.getItem('zenimonies_token') ||
        localStorage.getItem('token');

      /* Load saved information immediately */
      try {
        const savedUser = JSON.parse(
          localStorage.getItem('zenimonies_user') || 'null'
        );

        const savedAccounts = JSON.parse(
          localStorage.getItem('zenimonies_accounts') || '[]'
        );

        if (savedUser) {
          setUser(savedUser);
        }

        if (
          Array.isArray(savedAccounts) &&
          savedAccounts.length > 0
        ) {
          setAccount(savedAccounts[0]);
        }
      } catch {
        // Ignore invalid local storage.
      }

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get<MeResponse>(
        `${API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (!data?.success) {
        throw new Error('Unable to load account.');
      }

      if (data.user) {
        setUser(data.user);

        localStorage.setItem(
          'zenimonies_user',
          JSON.stringify(data.user)
        );
      }

      const latestAccount =
        data.account ||
        (Array.isArray(data.accounts)
          ? data.accounts[0]
          : null);

      if (latestAccount) {
        setAccount(latestAccount);

        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify(
            data.accounts || [latestAccount]
          )
        );
      }
    } catch (err: any) {
      console.error('Dashboard error:', err);

      if (err?.response?.status === 401) {
        localStorage.removeItem('zenimonies_token');
        localStorage.removeItem('token');

        navigate('/login');
        return;
      }

      setError(
        err?.response?.data?.message ||
          'Unable to load your account information.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    sessionStorage.removeItem('zenimonies_otp_email');
    sessionStorage.removeItem('zenimonies_otp_token');

    navigate('/login');
  };

  /* ==========================================================
     USER NAME
  ========================================================== */

  const displayName = useMemo(() => {
    return (
      user?.full_name ||
      user?.name ||
      `${user?.first_name || ''} ${
        user?.last_name || ''
      }`.trim() ||
      'Zenimonies User'
    );
  }, [user]);

  const firstName = useMemo(() => {
    return displayName.split(' ')[0] || 'there';
  }, [displayName]);

  /* ==========================================================
     KYC TIER
  ========================================================== */

  const currentTier = useMemo(() => {
    const tier = Number(
      user?.kyc_tier ?? user?.tier ?? 0
    );

    if (tier >= 3) return 3;
    if (tier === 2) return 2;
    if (tier === 1) return 1;

    return 0;
  }, [user]);

  const verificationText =
    currentTier >= 3
      ? 'Fully verified'
      : currentTier === 2
      ? 'ID verification completed'
      : currentTier === 1
      ? 'Tier 1 verified'
      : user?.is_verified
      ? 'Email & phone verified'
      : 'Verification required';

  /* ==========================================================
     BALANCE
  ========================================================== */

  const balance = Number(account?.balance || 0);

  const formatCurrency = (
    amount: number,
    currency = 'NGN'
  ) => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(amount || 0));
    } catch {
      return `₦${Number(amount || 0).toLocaleString(
        'en-NG',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;
    }
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />

          <strong style={{ color: '#12372f' }}>
            Loading your dashboard...
          </strong>
        </div>

        <style>
          {`
            @keyframes zenimoniesSpin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  }

  /* ==========================================================
     MAIN DASHBOARD
  ========================================================== */

  return (
    <div style={styles.page}>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to="/" style={styles.brand}>
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
          </Link>

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

            <Link
              to="/profile"
              style={styles.profileButton}
            >
              <div style={styles.profileAvatar}>
                {firstName.charAt(0).toUpperCase()}
              </div>

              <span style={styles.profileName}>
                {firstName}
              </span>

              <span style={styles.profileArrow}>
                ˅
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              style={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main style={styles.main}>
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* ====================================================
            WELCOME
        ==================================================== */}

        <section style={styles.welcomeSection}>
          <div>
            <div style={styles.welcomeSmall}>
              Welcome back,
            </div>

            <h1 style={styles.welcomeName}>
              {firstName}
            </h1>

            <p style={styles.welcomeText}>
              Manage your money securely with Zenimonies.
            </p>
          </div>

          <div style={styles.verificationPill}>
            <span style={styles.verificationDot}>
              ●
            </span>

            {verificationText}
          </div>
        </section>

        {/* ====================================================
            BALANCE CARD
        ==================================================== */}

        <section style={styles.balanceCard}>
          <div style={styles.balanceGlowOne} />
          <div style={styles.balanceGlowTwo} />

          <div style={styles.balanceContent}>
            <div style={styles.balanceTop}>
              <div>
                <div style={styles.balanceLabel}>
                  Available Balance
                </div>

                <div style={styles.balanceAmount}>
                  {showBalance
                    ? formatCurrency(
                        balance,
                        account?.currency || 'NGN'
                      )
                    : '••••••••'}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowBalance((value) => !value)
                }
                style={styles.hideButton}
              >
                <span style={styles.eyeIcon}>
                  {showBalance ? '◉' : '○'}
                </span>

                {showBalance ? 'Hide' : 'Show'}
              </button>
            </div>

            <div style={styles.balanceActions}>
              <Link
                to="/deposit"
                style={styles.addMoneyButton}
              >
                <span style={styles.plusCircle}>
                  +
                </span>

                <span>Add Money</span>

                <span style={styles.actionArrow}>
                  ›
                </span>
              </Link>

              <Link
                to="/transfer"
                style={styles.sendMoneyButton}
              >
                <span style={styles.sendIcon}>
                  ↗
                </span>

                <span>Send Money</span>

                <span style={styles.actionArrow}>
                  ›
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ====================================================
            SERVICES
        ==================================================== */}

        <section style={styles.servicesCard}>
          <DashboardService
            to="/transfer"
            icon="▥"
            title="To Bank"
            description="Send to any bank"
          />

          <DashboardService
            to="/withdraw"
            icon="↗"
            title="Withdraw"
            description="Withdraw funds"
          />

          <DashboardService
            to="/airtime"
            icon="▥"
            title="Airtime"
            description="Buy airtime"
          />

          <DashboardService
            to="/data"
            icon="↕"
            title="Data"
            description="Buy data"
          />

          <DashboardService
            to="/betting"
            icon="⚽"
            title="Betting"
            description="Fund your bets"
          />

          <DashboardService
            to="/tv"
            icon="▣"
            title="TV"
            description="Pay TV bills"
          />

          <DashboardService
            to="/bills"
            icon="▤"
            title="Bill"
            description="Pay your bills"
          />

          <DashboardService
            to="/safebox"
            icon="▣"
            title="SafeBox"
            description="Save securely"
          />

          <DashboardService
            to="/more"
            icon="••"
            title="More"
            description="More services"
          />
        </section>

        {/* ====================================================
            ACCOUNT VERIFICATION
        ==================================================== */}

        <section style={styles.verificationCard}>
          <div style={styles.verificationIconBox}>
            <span style={styles.shieldIcon}>
              ✓
            </span>
          </div>

          <div style={styles.verificationInfo}>
            <h2 style={styles.verificationTitle}>
              Account Verification
            </h2>

            <p style={styles.verificationDescription}>
              Complete your KYC to increase your limits
              and enjoy all features.
            </p>
          </div>

          <Link
            to="/kyc"
            style={styles.verificationButton}
          >
            {currentTier >= 3
              ? 'View Verification'
              : 'Upgrade'}

            <span style={styles.verificationArrow}>
              ›
            </span>
          </Link>
        </section>

        {/* ====================================================
            RECENT TRANSACTIONS
        ==================================================== */}

        <section style={styles.transactionsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              Recent Transactions
            </h2>

            <Link
              to="/transactions"
              style={styles.seeAll}
            >
              See All
              <span>›</span>
            </Link>
          </div>

          <div style={styles.emptyTransactions}>
            <div style={styles.transactionIcon}>
              ≡
            </div>

            <div>
              <div style={styles.emptyTitle}>
                No transactions yet
              </div>

              <div style={styles.emptyDescription}>
                Your transactions will appear here.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <nav style={styles.bottomNav}>
        <div style={styles.bottomNavInner}>
          <BottomNavItem
            to="/"
            icon="⌂"
            label="Home"
            active
          />

          <BottomNavItem
            to="/transactions"
            icon="↕"
            label="Transactions"
          />

          <BottomNavItem
            to="/wallet"
            icon="▱"
            label="Wallet"
          />

          <BottomNavItem
            to="/profile"
            icon="○"
            label="Profile"
          />
        </div>
      </nav>
    </div>
  );
};

/* ============================================================
   DASHBOARD SERVICE
============================================================ */

interface DashboardServiceProps {
  to: string;
  icon: string;
  title: string;
  description: string;
}

const DashboardService: React.FC<
  DashboardServiceProps
> = ({
  to,
  icon,
  title,
  description,
}) => {
  return (
    <Link
      to={to}
      style={styles.serviceLink}
    >
      <div style={styles.serviceIconBox}>
        <div style={styles.serviceIcon}>
          {icon}
        </div>
      </div>

      <div style={styles.serviceTitle}>
        {title}
      </div>

      <div style={styles.serviceDescription}>
        {description}
      </div>
    </Link>
  );
};

/* ============================================================
   BOTTOM NAV ITEM
============================================================ */

interface BottomNavItemProps {
  to: string;
  icon: string;
  label: string;
  active?: boolean;
}

const BottomNavItem: React.FC<
  BottomNavItemProps
> = ({
  to,
  icon,
  label,
  active = false,
}) => {
  return (
    <Link
      to={to}
      style={{
        ...styles.bottomNavItem,
        color: active
          ? '#00875a'
          : '#667085',
      }}
    >
      <div
        style={{
          ...styles.bottomNavIcon,
          fontWeight: active ? 800 : 500,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          ...styles.bottomNavLabel,
          fontWeight: active ? 800 : 500,
        }}
      >
        {label}
      </div>
    </Link>
  );
};

/* ============================================================
   STYLES
============================================================ */

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #f8faf9 0%, #ffffff 65%)',
    color: '#102a25',
    paddingBottom: '100px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  header: {
    background: '#ffffff',
    borderBottom: '1px solid #eef1ef',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },

  headerInner: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '12px 24px',
    minHeight: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },

  brand: {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#12372f',
  },

  logo: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    background:
      'linear-gradient(135deg, #009b68, #00754f)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '25px',
    fontWeight: 800,
    boxShadow:
      '0 7px 18px rgba(0, 135, 90, 0.18)',
  },

  brandName: {
    fontSize: '21px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },

  brandSubtitle: {
    marginTop: '1px',
    fontSize: '10px',
    letterSpacing: '1px',
    color: '#98a2b3',
    fontWeight: 600,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },

  notificationButton: {
    position: 'relative',
    width: '40px',
    height: '40px',
    border: 'none',
    background: 'transparent',
    color: '#667085',
    fontSize: '24px',
    cursor: 'pointer',
  },

  notificationDot: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ef4444',
    top: '5px',
    right: '6px',
    border: '2px solid #ffffff',
  },

  headerDivider: {
    width: '1px',
    height: '30px',
    background: '#eaecf0',
  },

  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: '#172033',
  },

  profileAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: '#edf3f1',
    color: '#12372f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '18px',
  },

  profileName: {
    fontSize: '15px',
    fontWeight: 700,
  },

  profileArrow: {
    color: '#667085',
    fontSize: '18px',
  },

  logoutButton: {
    border: '1px solid #d0d5dd',
    background: '#ffffff',
    color: '#344054',
    borderRadius: '9px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },

  main: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '30px 24px 45px',
  },

  errorBox: {
    marginBottom: '18px',
    padding: '12px 15px',
    borderRadius: '12px',
    background: '#fff4ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    fontSize: '14px',
  },

  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '20px',
    marginBottom: '22px',
    flexWrap: 'wrap',
  },

  welcomeSmall: {
    color: '#667085',
    fontSize: '15px',
    marginBottom: '2px',
  },

  welcomeName: {
    margin: 0,
    fontSize: '42px',
    lineHeight: 1.08,
    letterSpacing: '-1.5px',
    color: '#102a25',
  },

  welcomeText: {
    margin: '7px 0 0',
    color: '#667085',
    fontSize: '17px',
  },

  verificationPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#ecfdf3',
    border: '1px solid #abefc6',
    color: '#05603a',
    borderRadius: '999px',
    padding: '11px 17px',
    fontWeight: 700,
    fontSize: '14px',
  },

  verificationDot: {
    fontSize: '11px',
  },

  balanceCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    background:
      'linear-gradient(125deg, #006b49 0%, #00875a 52%, #00a56d 100%)',
    color: '#ffffff',
    marginBottom: '22px',
    boxShadow:
      '0 18px 40px rgba(0, 107, 73, 0.18)',
  },

  balanceGlowOne: {
    position: 'absolute',
    width: '440px',
    height: '220px',
    borderRadius: '50%',
    background:
      'rgba(255,255,255,0.055)',
    right: '-130px',
    top: '-95px',
    transform: 'rotate(-12deg)',
  },

  balanceGlowTwo: {
    position: 'absolute',
    width: '400px',
    height: '150px',
    borderRadius: '50%',
    background:
      'rgba(255,255,255,0.045)',
    right: '60px',
    bottom: '-80px',
    transform: 'rotate(-16deg)',
  },

  balanceContent: {
    position: 'relative',
    zIndex: 2,
    padding: '28px 30px',
  },

  balanceTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
  },

  balanceLabel: {
    fontSize: '17px',
    opacity: 0.85,
    marginBottom: '7px',
  },

  balanceAmount: {
    fontSize: '46px',
    fontWeight: 800,
    letterSpacing: '-1.5px',
  },

  hideButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '11px',
    padding: '10px 15px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
  },

  eyeIcon: {
    fontSize: '15px',
  },

  balanceActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap',
  },

  addMoneyButton: {
    minWidth: '210px',
    minHeight: '58px',
    padding: '0 20px',
    boxSizing: 'border-box',
    borderRadius: '15px',
    background: '#ffffff',
    color: '#075f43',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    fontWeight: 800,
    fontSize: '16px',
  },

  plusCircle: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: '#00875a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '25px',
    lineHeight: 1,
  },

  sendMoneyButton: {
    minWidth: '210px',
    minHeight: '58px',
    padding: '0 20px',
    boxSizing: 'border-box',
    borderRadius: '15px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.35)',
    color: '#ffffff',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    fontWeight: 800,
    fontSize: '16px',
  },

  sendIcon: {
    fontSize: '23px',
  },

  actionArrow: {
    marginLeft: 'auto',
    fontSize: '25px',
    opacity: 0.8,
  },

  servicesCard: {
    background: '#ffffff',
    border: '1px solid #edf1ef',
    borderRadius: '22px',
    padding: '22px',
    display: 'grid',
    gridTemplateColumns:
      'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    boxShadow:
      '0 7px 25px rgba(16, 24, 40, 0.035)',
    marginBottom: '20px',
  },

  serviceLink: {
    textDecoration: 'none',
    color: '#102a25',
    textAlign: 'center',
    borderRadius: '16px',
    padding: '15px 8px 14px',
    transition:
      'transform 0.15s ease, background 0.15s ease',
  },

  serviceIconBox: {
    width: '66px',
    height: '66px',
    borderRadius: '19px',
    background: '#eaf8f3',
    margin: '0 auto 9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceIcon: {
    width: '43px',
    height: '43px',
    borderRadius: '12px',
    background:
      'linear-gradient(145deg, #00a66d, #00875a)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 800,
  },

  serviceTitle: {
    fontSize: '16px',
    fontWeight: 800,
    marginBottom: '3px',
  },

  serviceDescription: {
    color: '#667085',
    fontSize: '12px',
  },

  verificationCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '17px',
    background:
      'linear-gradient(100deg, #f0fbf7, #ffffff)',
    border: '1px solid #d9f3e8',
    borderRadius: '20px',
    padding: '18px 22px',
    marginBottom: '25px',
  },

  verificationIconBox: {
    width: '62px',
    height: '62px',
    borderRadius: '17px',
    background: '#e1f7ee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  shieldIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: '#009b68',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 900,
  },

  verificationInfo: {
    flex: 1,
    minWidth: 0,
  },

  verificationTitle: {
    margin: 0,
    fontSize: '19px',
    color: '#12372f',
  },

  verificationDescription: {
    margin: '4px 0 0',
    color: '#667085',
    fontSize: '14px',
  },

  verificationButton: {
    flexShrink: 0,
    textDecoration: 'none',
    background:
      'linear-gradient(135deg, #009b68, #00754f)',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '12px 17px',
    fontWeight: 800,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  verificationArrow: {
    fontSize: '23px',
    lineHeight: 1,
  },

  transactionsSection: {
    marginTop: '8px',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
    marginBottom: '12px',
  },

  sectionTitle: {
    margin: 0,
    fontSize: '21px',
    color: '#102a25',
  },

  seeAll: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#00875a',
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: '14px',
  },

  emptyTransactions: {
    background: '#ffffff',
    border: '1px solid #edf1ef',
    borderRadius: '18px',
    padding: '19px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },

  transactionIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '15px',
    background: '#f2f4f7',
    color: '#667085',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '25px',
    fontWeight: 800,
  },

  emptyTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#172033',
  },

  emptyDescription: {
    marginTop: '3px',
    fontSize: '13px',
    color: '#98a2b3',
  },

  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    background:
      'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(15px)',
    borderTop: '1px solid #eaecf0',
    boxShadow:
      '0 -8px 25px rgba(16,24,40,0.06)',
  },

  bottomNavInner: {
    maxWidth: '700px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, 1fr)',
    padding: '9px 12px calc(9px + env(safe-area-inset-bottom))',
  },

  bottomNavItem: {
    textDecoration: 'none',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '4px',
  },

  bottomNavIcon: {
    fontSize: '25px',
    lineHeight: 1.1,
  },

  bottomNavLabel: {
    fontSize: '11px',
  },

  loadingPage: {
    minHeight: '100vh',
    background: '#f5f8f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },

  loadingCard: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '32px',
    textAlign: 'center',
    boxShadow:
      '0 12px 35px rgba(16,24,40,0.08)',
  },

  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '4px solid #dff2eb',
    borderTopColor: '#00875a',
    margin: '0 auto 15px',
    animation:
      'zenimoniesSpin 0.9s linear infinite',
  },
};

/* ============================================================
   RESPONSIVE CSS
============================================================ */

const responsiveStyle = document.createElement('style');

responsiveStyle.innerHTML = `
  * {
    box-sizing: border-box;
  }

  @media (max-width: 760px) {
    .zenimonies-mobile-placeholder {
      display: none;
    }
  }
`;

if (
  typeof document !== 'undefined' &&
  !document.getElementById(
    'zenimonies-dashboard-responsive'
  )
) {
  responsiveStyle.id =
    'zenimonies-dashboard-responsive';

  document.head.appendChild(responsiveStyle);
}

export default Dashboard;
