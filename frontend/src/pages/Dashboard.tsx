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
  const [showBalance, setShowBalance] = useState(true);
  const [error, setError] = useState('');

  /*
   * This will later come from the backend.
   * Keeping it separate from balance is important because
   * account limit and daily transfer limit are different.
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
       * Load cached data first.
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
       * Get latest information from backend.
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
   * KYC tier.
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
   * Zenimonies verification limits.
   */
  const limits = useMemo(() => {
    if (currentTier === 3) {
      return {
        label: 'Tier 3',
        accountLimit: null as number | null,
        accountLimitLabel: 'Unlimited',
        dailyTransferLimit: 5000000,
        dailyTransferLabel: '₦5,000,000',
        description: 'Fully verified account',
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
      description: 'Email + phone verification',
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

  const verificationText =
    currentTier === 3
      ? 'Fully verified'
      : currentTier === 2
      ? 'Tier 2 verified'
      : currentTier === 1
      ? 'Tier 1 verified'
      : user?.is_verified
      ? 'Email & phone verified'
      : 'Verification required';

  /*
   * Loading screen.
   */
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f4f7fc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '30px',
            borderRadius: '18px',
            textAlign: 'center',
            boxShadow:
              '0 10px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '4px solid #dbe5f5',
              borderTopColor: '#123b7a',
              margin: '0 auto 15px',
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
        background: '#f4f7fc',
        color: '#172033',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e6eaf0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            padding: '13px 20px',
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
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background:
                  'linear-gradient(135deg, #123b7a, #1e63b8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              Z
            </div>

            <div>
              <div
                style={{
                  color: '#123b7a',
                  fontSize: '17px',
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  color: '#98a2b3',
                  fontSize: '9px',
                  marginTop: '4px',
                  letterSpacing: '1px',
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
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => loadAccount()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #e4e7ec',
                background: '#ffffff',
                color: '#344054',
                cursor: 'pointer',
                fontSize: '18px',
              }}
              title="Refresh account"
            >
              ↻
            </button>

            <Link
              to="/profile"
              style={{
                textDecoration: 'none',
                color: '#344054',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 10px',
              }}
            >
              Profile
            </Link>

            <button
              type="button"
              onClick={logout}
              style={{
                border: '1px solid #d0d5dd',
                background: '#ffffff',
                color: '#344054',
                borderRadius: '9px',
                padding: '8px 13px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
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
          width: '100%',
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '25px 20px 50px',
          boxSizing: 'border-box',
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#fff4ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              fontSize: '13px',
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
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              color: '#667085',
              fontSize: '13px',
              marginBottom: '4px',
            }}
          >
            Welcome back,
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  color: '#172033',
                  fontSize: '27px',
                  lineHeight: 1.2,
                  fontWeight: 800,
                }}
              >
                {firstName}
              </h1>

              <p
                style={{
                  margin: '5px 0 0',
                  color: '#667085',
                  fontSize: '13px',
                }}
              >
                Manage your money securely with Zenimonies.
              </p>
            </div>

            <div
              style={{
                background: '#ecfdf3',
                color: '#027a48',
                border: '1px solid #abefc6',
                padding: '7px 11px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              ● {verificationText}
            </div>
          </div>
        </section>

        {/* ===================================================
            BALANCE + ADD FUNDS
        =================================================== */}

        <section
          style={{
            background:
              'linear-gradient(135deg, #102f5c 0%, #155aa8 100%)',
            borderRadius: '20px',
            padding: '24px',
            color: '#ffffff',
            boxShadow:
              '0 14px 35px rgba(16, 47, 92, 0.18)',
            marginBottom: '18px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background:
                'rgba(255,255,255,0.06)',
              right: '-80px',
              top: '-90px',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '15px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    opacity: 0.78,
                  }}
                >
                  Available Balance
                </div>

                <div
                  style={{
                    fontSize: '31px',
                    fontWeight: 800,
                    marginTop: '7px',
                    letterSpacing: '-0.5px',
                  }}
                >
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
                style={{
                  border:
                    '1px solid rgba(255,255,255,0.25)',
                  background:
                    'rgba(255,255,255,0.10)',
                  color: '#ffffff',
                  borderRadius: '9px',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {showBalance ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* ADD FUNDS */}
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                gap: '9px',
                flexWrap: 'wrap',
              }}
            >
              <Link
                to="/deposit"
                style={{
                  textDecoration: 'none',
                  background: '#ffffff',
                  color: '#123b7a',
                  borderRadius: '9px',
                  padding: '10px 15px',
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                + Add Funds
              </Link>

              <Link
                to="/transfer"
                style={{
                  textDecoration: 'none',
                  background:
                    'rgba(255,255,255,0.12)',
                  border:
                    '1px solid rgba(255,255,255,0.22)',
                  color: '#ffffff',
                  borderRadius: '9px',
                  padding: '10px 15px',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                Send Money
              </Link>
            </div>
          </div>
        </section>

        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <QuickAction
            to="/transfer"
            icon="↗"
            title="Send Money"
            description="Transfer funds"
          />

          <QuickAction
            to="/deposit"
            icon="+"
            title="Add Funds"
            description="Fund your account"
          />

          <QuickAction
            to="/withdraw"
            icon="↙"
            title="Withdraw"
            description="Withdraw funds"
          />

          <QuickAction
            to="/transactions"
            icon="↕"
            title="Transactions"
            description="View activity"
          />
        </section>

        {/* ===================================================
            SEND MONEY
        =================================================== */}

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e6eaf0',
            borderRadius: '16px',
            padding: '19px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '13px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  color: '#172033',
                }}
              >
                Send Money
              </h2>

              <p
                style={{
                  margin: '4px 0 0',
                  color: '#667085',
                  fontSize: '12px',
                }}
              >
                Choose where you want to send your money.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '10px',
            }}
          >
            <TransferCard
              to="/transfer?type=zenimonies"
              icon="Z"
              title="Zenimonies User"
              description="Send money to another Zenimonies customer."
            />

            <TransferCard
              to="/transfer?type=bank"
              icon="₦"
              title="Other Bank"
              description="Send money to a Nigerian bank account."
            />
          </div>
        </section>

        {/* ===================================================
            LIMITS
        =================================================== */}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <LimitCard
            title="Account Limit"
            value={limits.accountLimitLabel}
            badge={limits.label}
            percentage={accountLimitPercentage}
            usedText={
              limits.accountLimit === null
                ? 'Unlimited account balance'
                : `${formatCurrency(balance)} used`
            }
            rightText={
              limits.accountLimit === null
                ? 'No limit'
                : `${accountLimitPercentage}% used`
            }
            unlimited={limits.accountLimit === null}
          />

          <LimitCard
            title="Daily Transfer Limit"
            value={limits.dailyTransferLabel}
            badge="Today"
            percentage={dailyTransferPercentage}
            usedText={`Used ${formatCurrency(
              dailyTransferUsed
            )}`}
            rightText={`${formatCurrency(
              remainingDailyTransfer
            )} remaining`}
          />
        </section>

        {/* ===================================================
            VERIFICATION
        =================================================== */}

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e6eaf0',
            borderRadius: '16px',
            padding: '19px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  color: '#667085',
                  fontSize: '12px',
                }}
              >
                Verification
              </div>

              <h2
                style={{
                  margin: '4px 0',
                  fontSize: '18px',
                }}
              >
                {limits.label}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: '#667085',
                  fontSize: '12px',
                }}
              >
                {limits.description}
              </p>
            </div>

            <Link
              to="/kyc"
              style={{
                textDecoration: 'none',
                background: '#eef4ff',
                color: '#123b7a',
                padding: '9px 13px',
                borderRadius: '9px',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              {currentTier >= 3
                ? 'View KYC'
                : 'Upgrade'}
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, 1fr)',
              gap: '7px',
              marginTop: '17px',
            }}
          >
            <TierStep
              label="Basic"
              active={currentTier >= 0}
              completed={currentTier >= 0}
            />

            <TierStep
              label="Tier 1"
              active={currentTier >= 1}
              completed={currentTier >= 1}
            />

            <TierStep
              label="Tier 2"
              active={currentTier >= 2}
              completed={currentTier >= 2}
            />

            <TierStep
              label="Tier 3"
              active={currentTier >= 3}
              completed={currentTier >= 3}
            />
          </div>
        </section>

        {/* ===================================================
            SERVICES
        =================================================== */}

        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
              }}
            >
              Services
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
            }}
          >
            <ServiceCard
              to="/transactions"
              icon="↕"
              title="Transactions"
              description="View your transaction history."
            />

            <ServiceCard
              to="/wallet"
              icon="◈"
              title="Wallet"
              description="Manage your wallet."
            />

            <ServiceCard
              to="/market"
              icon="↗"
              title="Market"
              description="Explore market information."
            />

            <ServiceCard
              to="/profile"
              icon="●"
              title="Profile"
              description="Manage your account."
            />
          </div>
        </section>
      </main>
    </div>
  );
};

/* ============================================================
   QUICK ACTION
============================================================ */

interface QuickActionProps {
  to: string;
  icon: string;
  title: string;
  description: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  to,
  icon,
  title,
  description,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e6eaf0',
          borderRadius: '13px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '62px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: '#edf3fa',
            color: '#123b7a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '17px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '13px',
              color: '#172033',
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: '#667085',
              fontSize: '11px',
              marginTop: '2px',
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ============================================================
   TRANSFER CARD
============================================================ */

interface TransferCardProps {
  to: string;
  icon: string;
  title: string;
  description: string;
}

const TransferCard: React.FC<TransferCardProps> = ({
  to,
  icon,
  title,
  description,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          border: '1px solid #e1e7ef',
          borderRadius: '13px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#fbfcfe',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#eaf1f9',
            color: '#123b7a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '17px',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '14px',
              color: '#172033',
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: '#667085',
              fontSize: '11px',
              lineHeight: 1.45,
              marginTop: '3px',
            }}
          >
            {description}
          </div>
        </div>
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
  usedText: string;
  rightText: string;
  unlimited?: boolean;
}

const LimitCard: React.FC<LimitCardProps> = ({
  title,
  value,
  badge,
  percentage,
  usedText,
  rightText,
  unlimited = false,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e6eaf0',
        borderRadius: '16px',
        padding: '18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <div>
          <div
            style={{
              color: '#667085',
              fontSize: '12px',
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: '4px',
              fontSize: '21px',
              fontWeight: 800,
              color: '#172033',
            }}
          >
            {value}
          </div>
        </div>

        <span
          style={{
            background: '#edf3fa',
            color: '#123b7a',
            padding: '6px 8px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 800,
          }}
        >
          {badge}
        </span>
      </div>

      {unlimited ? (
        <div
          style={{
            marginTop: '16px',
            background: '#ecfdf3',
            color: '#027a48',
            padding: '9px',
            borderRadius: '9px',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          ✓ Unlimited account balance
        </div>
      ) : (
        <>
          <div
            style={{
              height: '6px',
              background: '#edf0f4',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: '#1e63b8',
                borderRadius: '999px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: '7px',
              color: '#667085',
              fontSize: '10px',
            }}
          >
            <span>{usedText}</span>
            <span>{rightText}</span>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   SERVICE CARD
============================================================ */

interface ServiceCardProps {
  to: string;
  icon: string;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  to,
  icon,
  title,
  description,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e6eaf0',
          borderRadius: '14px',
          padding: '16px',
          minHeight: '105px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: '#f0f3f7',
            color: '#344054',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            marginBottom: '10px',
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: '0 0 4px',
            fontSize: '14px',
            color: '#172033',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            color: '#667085',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
};

/* ============================================================
   KYC TIER STEP
============================================================ */

interface TierStepProps {
  label: string;
  active: boolean;
  completed: boolean;
}

const TierStep: React.FC<TierStepProps> = ({
  label,
  active,
  completed,
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '8px 4px',
        borderRadius: '9px',
        background: active
          ? '#edf3fa'
          : '#f8f9fb',
        color: active
          ? '#123b7a'
          : '#98a2b3',
        fontSize: '10px',
        fontWeight: 800,
      }}
    >
      <div
        style={{
          fontSize: '14px',
          marginBottom: '2px',
        }}
      >
        {completed ? '✓' : '○'}
      </div>

      {label}
    </div>
  );
};

export default Dashboard;
