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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBalance, setShowBalance] = useState(true);

  /*
   * This will later come from the backend.
   * For now, a new/unused account starts at ₦0 transferred today.
   */
  const dailyTransferUsed = 0;

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

      /*
       * Load cached information first.
       */
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

      /*
       * Get the latest account information.
       */
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

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    sessionStorage.removeItem('zenimonies_otp_email');
    sessionStorage.removeItem('zenimonies_otp_token');

    navigate('/login');
  };

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

  /*
   * KYC TIER
   *
   * IMPORTANT:
   * We do NOT treat is_verified as Tier 1.
   *
   * Email + phone verification = Basic.
   * BVN + face verification = Tier 1.
   * ID + face verification = Tier 2.
   * Proof of residence = Tier 3.
   */
  const currentTier = useMemo(() => {
    const tier = Number(
      user?.kyc_tier ?? user?.tier ?? 0
    );

    if (tier >= 3) return 3;
    if (tier === 2) return 2;
    if (tier === 1) return 1;

    return 0;
  }, [user]);

  /*
   * ACCOUNT AND TRANSFER LIMITS
   */
  const limits = useMemo(() => {
    if (currentTier === 3) {
      return {
        label: 'Tier 3',
        accountLimit: null as number | null,
        accountLimitLabel: 'Unlimited',
        dailyTransferLimit: 5000000,
        dailyTransferLabel: '₦5,000,000',
        description: 'Proof of residence verified',
      };
    }

    if (currentTier === 2) {
      return {
        label: 'Tier 2',
        accountLimit: 500000,
        accountLimitLabel: '₦500,000',
        dailyTransferLimit: 200000,
        dailyTransferLabel: '₦200,000',
        description: 'ID document + face verification',
      };
    }

    if (currentTier === 1) {
      return {
        label: 'Tier 1',
        accountLimit: 200000,
        accountLimitLabel: '₦200,000',
        dailyTransferLimit: 50000,
        dailyTransferLabel: '₦50,000',
        description: 'BVN + face verification',
      };
    }

    return {
      label: 'Basic',
      accountLimit: 50000,
      accountLimitLabel: '₦50,000',
      dailyTransferLimit: 50000,
      dailyTransferLabel: '₦50,000',
      description: 'Email + phone verified',
    };
  }, [currentTier]);

  const balance = Number(account?.balance || 0);

  const accountLimitPercentage = useMemo(() => {
    if (limits.accountLimit === null) {
      return 0;
    }

    if (limits.accountLimit <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (balance / limits.accountLimit) * 100
      )
    );
  }, [balance, limits.accountLimit]);

  const dailyTransferPercentage = useMemo(() => {
    if (limits.dailyTransferLimit <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (dailyTransferUsed /
          limits.dailyTransferLimit) *
          100
      )
    );
  }, [dailyTransferUsed, limits.dailyTransferLimit]);

  const remainingDailyTransfer = Math.max(
    0,
    limits.dailyTransferLimit - dailyTransferUsed
  );

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

  /*
   * Correct verification message.
   */
  const verificationText =
    currentTier === 3
      ? 'Tier 3 verified'
      : currentTier === 2
      ? 'Tier 2 verified'
      : currentTier === 1
      ? 'Tier 1 verified'
      : user?.is_verified
      ? 'Email & phone verified'
      : 'Verification required';

  const verificationDescription =
    currentTier === 0
      ? 'Complete your BVN and face verification to unlock Tier 1.'
      : currentTier === 1
      ? 'Upgrade with an ID document and face verification.'
      : currentTier === 2
      ? 'Complete proof of residence to reach Tier 3.'
      : 'Your account has completed all verification levels.';

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f8f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: '#063b2c',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '4px solid #d9eee7',
              borderTopColor: '#079455',
              margin: '0 auto 16px',
              animation: 'zenimoniesSpin 1s linear infinite',
            }}
          />

          <strong>
            Loading your dashboard...
          </strong>

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
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f8f7',
        color: '#102a24',
        paddingBottom: '90px',
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e7eeeb',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '13px',
                background:
                  'linear-gradient(135deg, #079455, #087443)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '22px',
              }}
            >
              Z
            </div>

            <div>
              <div
                style={{
                  color: '#073b2d',
                  fontSize: '19px',
                  fontWeight: 850,
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  color: '#83928d',
                  fontSize: '10px',
                  letterSpacing: '0.8px',
                  fontWeight: 700,
                }}
              >
                DIGITAL BANKING
              </div>
            </div>
          </Link>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => loadAccount()}
              title="Refresh"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                border: '1px solid #e4ebe8',
                background: '#ffffff',
                color: '#087443',
                cursor: 'pointer',
                fontSize: '20px',
              }}
            >
              ↻
            </button>

            <Link
              to="/profile"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#102a24',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#e7f4ef',
                  color: '#087443',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
              >
                {firstName.charAt(0).toUpperCase()}
              </span>

              <span
                style={{
                  display: 'none',
                }}
              >
                {firstName}
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              style={{
                border: '1px solid #d9e3df',
                background: '#ffffff',
                borderRadius: '10px',
                padding: '9px 13px',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#344d46',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '28px 22px 40px',
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: '18px',
              padding: '13px 15px',
              borderRadius: '12px',
              background: '#fff4ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
            }}
          >
            {error}
          </div>
        )}

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section
          style={{
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              color: '#71817b',
              fontSize: '14px',
              marginBottom: '4px',
            }}
          >
            Welcome back,
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  color: '#071f18',
                  fontSize: '34px',
                  lineHeight: 1.15,
                }}
              >
                {firstName}
              </h1>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#71817b',
                  fontSize: '16px',
                }}
              >
                Here's your financial overview.
              </p>
            </div>

            <div
              style={{
                background: '#eaf8f2',
                border: '1px solid #c7eddf',
                color: '#087443',
                padding: '9px 14px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 750,
              }}
            >
              ● {verificationText}
            </div>
          </div>
        </section>

        {/* ===================================================
            BALANCE CARD
        =================================================== */}

        <section
          style={{
            background:
              'linear-gradient(135deg, #064b39 0%, #078a58 65%, #06a56b 100%)',
            borderRadius: '24px',
            padding: '27px',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow:
              '0 18px 45px rgba(4, 108, 75, 0.22)',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background:
                'rgba(255,255,255,0.055)',
              right: '-90px',
              top: '-150px',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  opacity: 0.86,
                }}
              >
                Available Balance
              </span>

              <button
                type="button"
                onClick={() =>
                  setShowBalance((value) => !value)
                }
                style={{
                  border: '1px solid rgba(255,255,255,0.30)',
                  background:
                    'rgba(255,255,255,0.10)',
                  color: '#ffffff',
                  borderRadius: '11px',
                  padding: '8px 13px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {showBalance ? '◉ Hide' : '○ Show'}
              </button>
            </div>

            <div
              style={{
                fontSize: '40px',
                fontWeight: 850,
                marginTop: '8px',
                letterSpacing: '-1.5px',
              }}
            >
              {showBalance
                ? formatCurrency(
                    balance,
                    account?.currency || 'NGN'
                  )
                : '••••••••'}
            </div>

            {/* ADD MONEY */}

            <Link
              to="/deposit"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: '#ffffff',
                color: '#075b43',
                borderRadius: '15px',
                padding: '13px 19px',
                marginTop: '20px',
                fontWeight: 800,
                minWidth: '190px',
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#0a9b63',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                +
              </span>

              <span>
                Add Money
              </span>

              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '21px',
                }}
              >
                ›
              </span>
            </Link>
          </div>
        </section>

        {/* ===================================================
            SERVICES GRID
        =================================================== */}

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e7eeeb',
            borderRadius: '22px',
            padding: '22px 15px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, 1fr)',
              gap: '25px 12px',
            }}
          >
            <ServiceIcon
              to="/transfer"
              icon="🏦"
              title="To Bank"
            />

            <ServiceIcon
              to="/withdraw"
              icon="↗"
              title="Withdraw"
            />

            <ServiceIcon
              to="/airtime"
              icon="▥"
              title="Airtime"
            />

            <ServiceIcon
              to="/data"
              icon="⇅"
              title="Data"
            />

            <ServiceIcon
              to="/betting"
              icon="⚽"
              title="Betting"
            />

            <ServiceIcon
              to="/tv"
              icon="▻"
              title="TV"
            />

            <ServiceIcon
              to="/safebox"
              icon="◉"
              title="SafeBox"
            />

            <ServiceIcon
              to="/more"
              icon="••"
              title="More"
            />
          </div>
        </section>

        {/* ===================================================
            KYC VERIFICATION
        =================================================== */}

        <section
          style={{
            background:
              'linear-gradient(135deg, #f0fbf7, #ffffff)',
            border: '1px solid #d8eee5',
            borderRadius: '20px',
            padding: '17px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '15px',
                background: '#dff5eb',
                color: '#079455',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '25px',
                fontWeight: 900,
              }}
            >
              ✓
            </div>

            <div
              style={{
                flex: 1,
                minWidth: '190px',
              }}
            >
              <div
                style={{
                  color: '#075b43',
                  fontWeight: 850,
                  fontSize: '17px',
                }}
              >
                Account Verification
              </div>

              <div
                style={{
                  color: '#71817b',
                  fontSize: '14px',
                  marginTop: '3px',
                  lineHeight: 1.4,
                }}
              >
                {verificationDescription}
              </div>
            </div>

            <Link
              to="/kyc"
              style={{
                textDecoration: 'none',
                background: '#079455',
                color: '#ffffff',
                padding: '12px 17px',
                borderRadius: '11px',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              {currentTier >= 3
                ? 'View Verification'
                : 'Verify Account'}{' '}
              ›
            </Link>
          </div>
        </section>

        {/* ===================================================
            LIMITS
        =================================================== */}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '15px',
            marginBottom: '25px',
          }}
        >
          {/* ACCOUNT LIMIT */}

          <LimitCard
            title="Account Limit"
            value={limits.accountLimitLabel}
            badge={limits.label}
            percentage={
              limits.accountLimit === null
                ? 0
                : accountLimitPercentage
            }
            leftText={
              limits.accountLimit === null
                ? 'Unlimited'
                : formatCurrency(balance)
            }
            rightText={
              limits.accountLimit === null
                ? 'No limit'
                : `${accountLimitPercentage}% used`
            }
            unlimited={
              limits.accountLimit === null
            }
          />

          {/* DAILY TRANSFER LIMIT */}

          <LimitCard
            title="Daily Transfer Limit"
            value={limits.dailyTransferLabel}
            badge="Today"
            percentage={dailyTransferPercentage}
            leftText={formatCurrency(
              dailyTransferUsed
            )}
            rightText={`${formatCurrency(
              remainingDailyTransfer
            )} remaining`}
            unlimited={false}
          />
        </section>
      </main>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '76px',
          background: 'rgba(255,255,255,0.97)',
          borderTop: '1px solid #e4ebe8',
          display: 'grid',
          gridTemplateColumns:
            'repeat(4, 1fr)',
          zIndex: 100,
          backdropFilter: 'blur(10px)',
        }}
      >
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
          icon="▣"
          label="Wallet"
        />

        <BottomNavItem
          to="/profile"
          icon="♙"
          label="Profile"
        />
      </nav>
    </div>
  );
};

/* ============================================================
   SERVICE ICON
============================================================ */

interface ServiceIconProps {
  to: string;
  icon: string;
  title: string;
}

const ServiceIcon: React.FC<ServiceIconProps> = ({
  to,
  icon,
  title,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 8px',
          borderRadius: '22px',
          background:
            'linear-gradient(145deg, #eaf9f3, #dff4ec)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#079455',
          fontSize: '27px',
          fontWeight: 900,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: '15px',
          fontWeight: 650,
          color: '#172b26',
        }}
      >
        {title}
      </div>
    </Link>
  );
};

/* ============================================================
   LIMIT CARD
============================================================ */

interface LimitCardProps {
  title: string;
  value: string;
  badge: string;
  percentage: number;
  leftText: string;
  rightText: string;
  unlimited: boolean;
}

const LimitCard: React.FC<LimitCardProps> = ({
  title,
  value,
  badge,
  percentage,
  leftText,
  rightText,
  unlimited,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e7eeeb',
        borderRadius: '18px',
        padding: '19px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              color: '#71817b',
              fontSize: '13px',
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: '#102a24',
              fontSize: '23px',
              fontWeight: 850,
              marginTop: '5px',
            }}
          >
            {value}
          </div>
        </div>

        <span
          style={{
            background: '#eaf8f2',
            color: '#087443',
            borderRadius: '9px',
            padding: '6px 9px',
            fontSize: '11px',
            fontWeight: 800,
          }}
        >
          {badge}
        </span>
      </div>

      {unlimited ? (
        <div
          style={{
            marginTop: '17px',
            padding: '10px',
            borderRadius: '10px',
            background: '#eaf8f2',
            color: '#087443',
            fontSize: '13px',
            fontWeight: 750,
          }}
        >
          ✓ Unlimited account balance
        </div>
      ) : (
        <>
          <div
            style={{
              height: '7px',
              background: '#e8efec',
              borderRadius: '99px',
              overflow: 'hidden',
              marginTop: '17px',
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background:
                  'linear-gradient(90deg, #079455, #16b879)',
                borderRadius: '99px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: '8px',
              color: '#71817b',
              fontSize: '11px',
            }}
          >
            <span>{leftText}</span>
            <span>{rightText}</span>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   BOTTOM NAVIGATION
============================================================ */

interface BottomNavItemProps {
  to: string;
  icon: string;
  label: string;
  active?: boolean;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({
  to,
  icon,
  label,
  active = false,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: active
          ? '#079455'
          : '#7a8984',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        fontWeight: active ? 800 : 600,
      }}
    >
      <div
        style={{
          fontSize: '25px',
          lineHeight: 1,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: '11px',
        }}
      >
        {label}
      </div>
    </Link>
  );
};

export default Dashboard;
