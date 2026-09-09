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
   * Daily transfer amount.
   *
   * We keep this separate from the account balance because
   * account limit and daily transfer limit are different rules.
   *
   * The backend should eventually provide the real value.
   */
  const [dailyTransferUsed] = useState(0);

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
       * First load the locally stored information so the
       * dashboard can render immediately.
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

        if (Array.isArray(savedAccounts) && savedAccounts.length > 0) {
          setAccount(savedAccounts[0]);
        }
      } catch {
        // Ignore invalid local storage.
      }

      /*
       * If there is no token, send the customer to login.
       */
      if (!token) {
        navigate('/login');
        return;
      }

      /*
       * Get the latest account information from the backend.
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

      /*
       * If the token is invalid/expired, return to login.
       */
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
    return (
      displayName.split(' ')[0] ||
      'there'
    );
  }, [displayName]);

  /*
   * Determine the customer's KYC tier.
   *
   * Backend values can later be standardized to one field.
   */
  const currentTier = useMemo(() => {
    const tier =
      Number(user?.kyc_tier ?? user?.tier ?? 0);

    if (tier >= 3) return 3;
    if (tier === 2) return 2;
    if (tier === 1) return 1;

    /*
     * is_verified means the account itself has been
     * verified, but it does not automatically mean Tier 1.
     */
    return 0;
  }, [user]);

  /*
   * Verification/account limits.
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
        description: 'ID + face verification',
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

  const formatAccountNumber = (
    accountNumber?: string
  ) => {
    if (!accountNumber) {
      return 'Account number unavailable';
    }

    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  };

  const copyAccountNumber = async () => {
    if (!account?.account_number) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        account.account_number
      );
    } catch {
      // Clipboard may not be available.
    }
  };

  const verificationText =
    currentTier === 3
      ? 'Fully verified'
      : currentTier === 2
      ? 'ID verification completed'
      : currentTier === 1
      ? 'BVN verification completed'
      : user?.is_verified
      ? 'Email & phone verified'
      : 'Verification required';

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f7fb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '35px',
            textAlign: 'center',
            boxShadow:
              '0 10px 30px rgba(16, 24, 40, 0.08)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '4px solid #dbe7ff',
              borderTopColor: '#0b5cff',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />

          <strong
            style={{
              color: '#172033',
            }}
          >
            Loading your dashboard...
          </strong>

          <style>
            {`
              @keyframes spin {
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
        background: '#f5f7fb',
        color: '#172033',
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #eaecf0',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: '1250px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
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
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #0b5cff, #173fbd)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
              }}
            >
              Z
            </div>

            <div>
              <div
                style={{
                  color: '#172033',
                  fontSize: '18px',
                  fontWeight: 800,
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  color: '#98a2b3',
                  fontSize: '11px',
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
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid #eaecf0',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '17px',
              }}
              title="Refresh"
            >
              ↻
            </button>

            <Link
              to="/profile"
              style={{
                textDecoration: 'none',
                color: '#172033',
                fontWeight: 700,
                fontSize: '14px',
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
                borderRadius: '10px',
                padding: '9px 14px',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#344054',
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
          maxWidth: '1250px',
          margin: '0 auto',
          padding: '30px 24px 60px',
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: '20px',
              padding: '13px 15px',
              borderRadius: '12px',
              background: '#fff4ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              fontSize: '14px',
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
            marginBottom: '25px',
          }}
        >
          <div
            style={{
              color: '#667085',
              fontSize: '14px',
              marginBottom: '5px',
            }}
          >
            Welcome back,
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '32px',
                  lineHeight: 1.2,
                  color: '#172033',
                }}
              >
                {firstName}
              </h1>

              <p
                style={{
                  margin: '8px 0 0',
                  color: '#667085',
                }}
              >
                Here's your financial overview.
              </p>
            </div>

            <div
              style={{
                background: '#ecfdf3',
                color: '#027a48',
                border: '1px solid #abefc6',
                padding: '8px 12px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
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
              'linear-gradient(135deg, #071a49 0%, #0b5cff 100%)',
            borderRadius: '22px',
            padding: '28px',
            color: '#ffffff',
            boxShadow:
              '0 18px 45px rgba(11, 92, 255, 0.22)',
            marginBottom: '22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background:
                'rgba(255,255,255,0.06)',
              right: '-70px',
              top: '-100px',
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
                gap: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  opacity: 0.82,
                }}
              >
                Total Available Balance
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowBalance((value) => !value)
                }
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  background:
                    'rgba(255,255,255,0.10)',
                  color: '#ffffff',
                  borderRadius: '9px',
                  padding: '7px 11px',
                  cursor: 'pointer',
                }}
              >
                {showBalance
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>

            <div
              style={{
                fontSize: '38px',
                fontWeight: 800,
                marginTop: '10px',
                letterSpacing: '-1px',
              }}
            >
              {showBalance
                ? formatCurrency(
                    balance,
                    account?.currency || 'NGN'
                  )
                : '••••••••'}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '22px',
              }}
            >
              <span
                style={{
                  background:
                    'rgba(255,255,255,0.12)',
                  border:
                    '1px solid rgba(255,255,255,0.16)',
                  padding: '8px 11px',
                  borderRadius: '9px',
                  fontSize: '13px',
                }}
              >
                {formatAccountNumber(
                  account?.account_number
                )}
              </span>

              <button
                type="button"
                onClick={copyAccountNumber}
                style={{
                  background: '#ffffff',
                  color: '#0b5cff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>

              <span
                style={{
                  opacity: 0.75,
                  fontSize: '13px',
                }}
              >
                {account?.account_type ||
                  'Personal Account'}
              </span>
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
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '25px',
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
            title="Add Money"
            description="Fund your account"
          />

          <QuickAction
            to="/withdraw"
            icon="↙"
            title="Withdraw"
            description="Move funds out"
          />

          <QuickAction
            to="/kyc"
            icon="✓"
            title="Verification"
            description="Manage KYC"
          />
        </section>

        {/* ===================================================
            LIMITS
        =================================================== */}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
            marginBottom: '25px',
          }}
        >
          {/* ACCOUNT LIMIT */}

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaecf0',
              borderRadius: '18px',
              padding: '22px',
              boxShadow:
                '0 5px 18px rgba(16, 24, 40, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '15px',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#667085',
                    fontSize: '13px',
                  }}
                >
                  Account limit
                </div>

                <div
                  style={{
                    marginTop: '5px',
                    fontSize: '23px',
                    fontWeight: 800,
                  }}
                >
                  {limits.accountLimitLabel}
                </div>
              </div>

              <span
                style={{
                  background: '#eef4ff',
                  color: '#175cd3',
                  padding: '7px 10px',
                  borderRadius: '9px',
                  height: 'fit-content',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {limits.label}
              </span>
            </div>

            {limits.accountLimit !== null && (
              <>
                <div
                  style={{
                    marginTop: '20px',
                    height: '8px',
                    background: '#eaecf0',
                    borderRadius: '99px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${accountLimitPercentage}%`,
                      height: '100%',
                      background: '#0b5cff',
                      borderRadius: '99px',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    color: '#667085',
                    fontSize: '12px',
                  }}
                >
                  <span>
                    {formatCurrency(balance)}
                  </span>

                  <span>
                    {accountLimitPercentage}% used
                  </span>
                </div>
              </>
            )}

            {limits.accountLimit === null && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '10px',
                  background: '#ecfdf3',
                  borderRadius: '10px',
                  color: '#027a48',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                ✓ Unlimited account balance
              </div>
            )}
          </div>

          {/* DAILY TRANSFER */}

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #eaecf0',
              borderRadius: '18px',
              padding: '22px',
              boxShadow:
                '0 5px 18px rgba(16, 24, 40, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '15px',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#667085',
                    fontSize: '13px',
                  }}
                >
                  Daily transfer limit
                </div>

                <div
                  style={{
                    marginTop: '5px',
                    fontSize: '23px',
                    fontWeight: 800,
                  }}
                >
                  {limits.dailyTransferLabel}
                </div>
              </div>

              <span
                style={{
                  background: '#f2f4f7',
                  color: '#344054',
                  padding: '7px 10px',
                  borderRadius: '9px',
                  height: 'fit-content',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Today
              </span>
            </div>

            <div
              style={{
                marginTop: '20px',
                height: '8px',
                background: '#eaecf0',
                borderRadius: '99px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${dailyTransferPercentage}%`,
                  height: '100%',
                  background: '#12b76a',
                  borderRadius: '99px',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                color: '#667085',
                fontSize: '12px',
              }}
            >
              <span>
                Used {formatCurrency(dailyTransferUsed)}
              </span>

              <span>
                {formatCurrency(
                  remainingDailyTransfer
                )}{' '}
                remaining
              </span>
            </div>
          </div>
        </section>

        {/* ===================================================
            KYC STATUS
        =================================================== */}

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '22px',
            marginBottom: '25px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  color: '#667085',
                  fontSize: '13px',
                }}
              >
                Verification status
              </div>

              <h3
                style={{
                  margin: '5px 0 4px',
                }}
              >
                {limits.label}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                {limits.description}
              </p>
            </div>

            <Link
              to="/kyc"
              style={{
                textDecoration: 'none',
                background:
                  currentTier >= 3
                    ? '#ecfdf3'
                    : '#eef4ff',
                color:
                  currentTier >= 3
                    ? '#027a48'
                    : '#175cd3',
                padding: '11px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {currentTier >= 3
                ? 'View verification'
                : 'Upgrade verification'}
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, 1fr)',
              gap: '8px',
              marginTop: '22px',
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
              marginBottom: '15px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
              }}
            >
              Your Services
            </h2>

            <Link
              to="/profile"
              style={{
                color: '#0b5cff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              Manage account
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
            }}
          >
            <ServiceCard
              to="/transactions"
              icon="↕"
              title="Transactions"
              description="View your complete transaction history."
            />

            <ServiceCard
              to="/wallet"
              icon="◈"
              title="Wallet"
              description="Manage your Zenimonies wallet."
            />

            <ServiceCard
              to="/portfolio"
              icon="▥"
              title="Portfolio"
              description="Track your financial portfolio."
            />

            <ServiceCard
              to="/market"
              icon="↗"
              title="Market"
              description="Explore market information."
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
          border: '1px solid #eaecf0',
          borderRadius: '15px',
          padding: '17px',
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            background: '#eef4ff',
            color: '#0b5cff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
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
              fontSize: '14px',
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: '#667085',
              fontSize: '12px',
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
          border: '1px solid #eaecf0',
          borderRadius: '16px',
          padding: '20px',
          minHeight: '130px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#f2f4f7',
            color: '#344054',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            marginBottom: '13px',
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '16px',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            color: '#667085',
            fontSize: '13px',
            lineHeight: 1.5,
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
        padding: '10px 5px',
        borderRadius: '10px',
        background: active
          ? '#eef4ff'
          : '#f8f9fb',
        color: active
          ? '#175cd3'
          : '#98a2b3',
        fontSize: '12px',
        fontWeight: 700,
      }}
    >
      <div
        style={{
          fontSize: '16px',
          marginBottom: '3px',
        }}
      >
        {completed ? '✓' : '○'}
      </div>

      {label}
    </div>
  );
};

export default Dashboard;
