import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

const API_URL =
  'https://zenimonies-banking.onrender.com';

/* ============================================================
   TYPES
============================================================ */

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

  const [user, setUser] =
    useState<User | null>(null);

  const [account, setAccount] =
    useState<Account | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [showBalance, setShowBalance] =
    useState(true);

  const [error, setError] =
    useState('');

  /* ==========================================================
     LOAD ACCOUNT
  ========================================================== */

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const token =
        localStorage.getItem(
          'zenimonies_token'
        ) ||
        localStorage.getItem('token');

      /* LOCAL CACHE */

      try {
        const savedUser =
          JSON.parse(
            localStorage.getItem(
              'zenimonies_user'
            ) || 'null'
          );

        const savedAccounts =
          JSON.parse(
            localStorage.getItem(
              'zenimonies_accounts'
            ) || '[]'
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

      /* BACKEND */

      const response =
        await axios.get<MeResponse>(
          `${API_URL}/api/auth/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data = response.data;

      if (!data?.success) {
        throw new Error(
          'Unable to load account.'
        );
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
        (
          Array.isArray(data.accounts)
            ? data.accounts[0]
            : null
        );

      if (latestAccount) {
        setAccount(latestAccount);

        localStorage.setItem(
          'zenimonies_accounts',
          JSON.stringify(
            data.accounts ||
            [latestAccount]
          )
        );
      }
    } catch (err: any) {
      console.error(
        'Dashboard error:',
        err
      );

      if (
        err?.response?.status === 401
      ) {
        localStorage.removeItem(
          'zenimonies_token'
        );

        localStorage.removeItem(
          'token'
        );

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
    localStorage.removeItem(
      'zenimonies_token'
    );

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'zenimonies_user'
    );

    localStorage.removeItem(
      'zenimonies_accounts'
    );

    sessionStorage.removeItem(
      'zenimonies_otp_email'
    );

    sessionStorage.removeItem(
      'zenimonies_otp_token'
    );

    navigate('/login');
  };

  /* ==========================================================
     NAME
  ========================================================== */

  const displayName =
    useMemo(() => {
      return (
        user?.full_name ||
        user?.name ||
        `${user?.first_name || ''} ${
          user?.last_name || ''
        }`.trim() ||
        'Zenimonies User'
      );
    }, [user]);

  const firstName =
    useMemo(() => {
      return (
        displayName.split(' ')[0] ||
        'there'
      );
    }, [displayName]);

  const initials =
    useMemo(() => {
      const parts =
        displayName
          .trim()
          .split(/\s+/);

      if (parts.length >= 2) {
        return (
          parts[0][0] +
          parts[1][0]
        ).toUpperCase();
      }

      return (
        parts[0]?.[0] ||
        'Z'
      ).toUpperCase();
    }, [displayName]);

  /* ==========================================================
     KYC
  ========================================================== */

  const currentTier =
    useMemo(() => {
      const tier =
        Number(
          user?.kyc_tier ??
          user?.tier ??
          0
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
      ? 'BVN verification completed'
      : user?.is_verified
      ? 'Email & phone verified'
      : 'Verification required';

  /* ==========================================================
     BALANCE
  ========================================================== */

  const balance =
    Number(
      account?.balance || 0
    );

  const formatCurrency = (
    amount: number,
    currency = 'NGN'
  ) => {
    try {
      return new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ).format(
        Number(amount || 0)
      );
    } catch {
      return `₦${Number(
        amount || 0
      ).toLocaleString(
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
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f7fb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: '#063b2d',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border:
                '4px solid #d8f1e8',
              borderTopColor:
                '#008f62',
              animation:
                'zenimonies-spin 0.8s linear infinite',
              margin:
                '0 auto 15px',
            }}
          />

          <strong>
            Loading your dashboard...
          </strong>

          <style>
            {`
              @keyframes zenimonies-spin {
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

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        color: '#172033',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        paddingBottom: '82px',
      }}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header
        style={{
          background: '#ffffff',
          borderBottom:
            '1px solid #edf0f2',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="zen-header"
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            minHeight: '72px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: '15px',
          }}
        >

          {/* LOGO */}

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
                width: '43px',
                height: '43px',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #079f6d, #007b55)',
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
                  fontSize: '19px',
                  fontWeight: 850,
                  color: '#063b2d',
                  lineHeight: 1.1,
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  marginTop: '3px',
                  fontSize: '9px',
                  letterSpacing: '1.1px',
                  color: '#98a2b3',
                  fontWeight: 600,
                }}
              >
                DIGITAL BANKING
              </div>
            </div>
          </Link>

          {/* RIGHT */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}
          >

            {/* NOTIFICATION */}

            <button
              type="button"
              style={{
                width: '38px',
                height: '38px',
                border: 'none',
                background:
                  '#f7faf9',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '19px',
                position: 'relative',
              }}
              aria-label="Notifications"
            >
              ♧

              <span
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '4px',
                  width: '7px',
                  height: '7px',
                  background: '#ef4444',
                  borderRadius: '50%',
                }}
              />
            </button>

            <div
              style={{
                width: '1px',
                height: '30px',
                background: '#e4e7ec',
              }}
            />

            {/* USER */}

            <Link
              to="/profile"
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
                  borderRadius: '50%',
                  background:
                    '#e7edf0',
                  color: '#063b2d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
              >
                {initials}
              </div>

              <span
                className="zen-user-name"
                style={{
                  color: '#172033',
                  fontWeight: 750,
                  fontSize: '14px',
                }}
              >
                {displayName}
              </span>

              <span
                className="zen-user-arrow"
                style={{
                  color: '#667085',
                  fontSize: '18px',
                }}
              >
                ⌄
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="zen-logout"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#667085',
                fontWeight: 650,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '30px 20px 40px',
        }}
      >

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: '#fff4ed',
              border:
                '1px solid #fed7aa',
              color: '#9a3412',
              borderRadius: '12px',
              padding: '12px 15px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}


        {/* ====================================================
            WELCOME
        ==================================================== */}

        <section
          style={{
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              color: '#667085',
              fontSize: '15px',
              marginBottom: '3px',
            }}
          >
            Welcome back,
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '38px',
                  lineHeight: 1.1,
                  color: '#071d32',
                  fontWeight: 800,
                  letterSpacing:
                    '-1.2px',
                }}
              >
                {firstName}
              </h1>

              <p
                style={{
                  margin:
                    '8px 0 0',
                  color: '#667085',
                  fontSize: '16px',
                }}
              >
                Here's your financial overview.
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '9px',
                padding:
                  '10px 16px',
                borderRadius: '999px',
                background:
                  '#eaf9f3',
                border:
                  '1px solid #c7eddf',
                color: '#075d44',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background:
                    '#079f6d',
                }}
              />

              {verificationText}
            </div>
          </div>
        </section>


        {/* ====================================================
            BALANCE CARD
        ==================================================== */}

        <section
          style={{
            background:
              'linear-gradient(135deg, #006b4c 0%, #008f62 52%, #079f6d 100%)',
            borderRadius: '22px',
            minHeight: '245px',
            padding:
              '30px 34px',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow:
              '0 16px 40px rgba(0, 111, 78, 0.18)',
            marginBottom: '24px',
          }}
        >

          {/* DECORATION */}

          <div
            style={{
              position: 'absolute',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              right: '-80px',
              top: '-190px',
              background:
                'rgba(255,255,255,0.06)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              right: '80px',
              bottom: '-200px',
              background:
                'rgba(0,0,0,0.04)',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent:
                'space-between',
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems:
                  'flex-start',
                justifyContent:
                  'space-between',
                gap: '15px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    opacity: 0.86,
                    marginBottom: '7px',
                  }}
                >
                  Available Balance
                </div>

                <div
                  style={{
                    fontSize: '42px',
                    lineHeight: 1,
                    fontWeight: 850,
                    letterSpacing:
                      '-1px',
                  }}
                >
                  {showBalance
                    ? formatCurrency(
                        balance,
                        account?.currency ||
                          'NGN'
                      )
                    : '••••••••'}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowBalance(
                    (value) =>
                      !value
                  )
                }
                style={{
                  border:
                    '1px solid rgba(255,255,255,0.27)',
                  background:
                    'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding:
                    '10px 15px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  whiteSpace:
                    'nowrap',
                }}
              >
                ◉{' '}
                {showBalance
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>


            {/* BALANCE ACTIONS */}

            <div
              className="balance-actions"
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                alignItems:
                  'center',
                gap: '12px',
                marginTop: '35px',
              }}
            >

              <Link
                to="/deposit"
                style={{
                  textDecoration:
                    'none',
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '10px',
                  background:
                    '#ffffff',
                  color: '#075d44',
                  borderRadius:
                    '16px',
                  padding:
                    '15px 24px',
                  minWidth: '175px',
                  justifyContent:
                    'space-between',
                  fontWeight: 800,
                  boxSizing:
                    'border-box',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: '10px',
                  }}
                >
                  <span
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius:
                        '50%',
                      background:
                        '#079f6d',
                      color:
                        '#ffffff',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      fontSize:
                        '22px',
                    }}
                  >
                    +
                  </span>

                  Add Money
                </span>

                <span
                  style={{
                    fontSize: '21px',
                  }}
                >
                  ›
                </span>
              </Link>

              <Link
                to="/transfer"
                style={{
                  textDecoration:
                    'none',
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: '9px',
                  border:
                    '1px solid rgba(255,255,255,0.3)',
                  background:
                    'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  borderRadius:
                    '15px',
                  padding:
                    '14px 19px',
                  fontWeight: 750,
                }}
              >
                ↗ Send Money
              </Link>
            </div>
          </div>
        </section>


        {/* ====================================================
            SERVICES
        ==================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #edf0f2',
            borderRadius: '22px',
            padding:
              '26px 22px 30px',
            boxShadow:
              '0 7px 25px rgba(16,24,40,0.035)',
            marginBottom: '22px',
          }}
        >

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, 1fr)',
              gap:
                '28px 15px',
            }}
          >

            <Service
              to="/transfer"
              icon="⌂"
              title="To Bank"
              subtitle="Send to any bank"
            />

            <Service
              to="/withdraw"
              icon="↗"
              title="Withdraw"
              subtitle="Withdraw funds"
            />

            <Service
              to="/airtime"
              icon="▥"
              title="Airtime"
              subtitle="Buy airtime"
            />

            <Service
              to="/data"
              icon="⇅"
              title="Data"
              subtitle="Buy data"
            />

            <Service
              to="/betting"
              icon="⚽"
              title="Betting"
              subtitle="Fund your bets"
            />

            <Service
              to="/tv"
              icon="▶"
              title="TV"
              subtitle="Pay TV bills"
            />

            <Service
              to="/bills"
              icon="▣"
              title="Bill Payment"
              subtitle="Pay your bills"
            />

            <Service
              to="/safebox"
              icon="◉"
              title="SafeBox"
              subtitle="Secure your funds"
            />

            <Service
              to="/more"
              icon="••"
              title="More"
              subtitle="More services"
            />
          </div>
        </section>


        {/* ====================================================
            VERIFICATION CARD
        ==================================================== */}

        <section
          style={{
            background:
              'linear-gradient(100deg, #effbf6, #f8fffc)',
            border:
              '1px solid #dff3ea',
            borderRadius: '20px',
            padding:
              '18px 22px',
            marginBottom: '25px',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: '15px',
            }}
          >
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius:
                  '16px',
                background:
                  '#dcf8ec',
                color:
                  '#008f62',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: '27px',
                flexShrink: 0,
              }}
            >
              ✓
            </div>

            <div>
              <div
                style={{
                  color:
                    '#075d44',
                  fontSize: '19px',
                  fontWeight: 800,
                  marginBottom:
                    '3px',
                }}
              >
                Account Verification
              </div>

              <div
                style={{
                  color:
                    '#667085',
                  fontSize: '14px',
                }}
              >
                Complete your KYC to increase your limits.
              </div>
            </div>
          </div>

          <Link
            to="/kyc"
            style={{
              textDecoration:
                'none',
              background:
                '#008f62',
              color: '#ffffff',
              borderRadius:
                '12px',
              padding:
                '13px 20px',
              fontWeight: 750,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems:
                'center',
              gap: '10px',
              whiteSpace:
                'nowrap',
            }}
          >
            {currentTier >= 3
              ? 'View Verification'
              : 'View Verification'}

            <span
              style={{
                fontSize: '20px',
              }}
            >
              ›
            </span>
          </Link>
        </section>

      </main>


      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <nav
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '70px',
          background:
            'rgba(255,255,255,0.97)',
          borderTop:
            '1px solid #eaecf0',
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
          zIndex: 100,
          backdropFilter:
            'blur(12px)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '700px',
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, 1fr)',
          }}
        >

          <BottomNav
            to="/"
            icon="⌂"
            label="Home"
            active
          />

          <BottomNav
            to="/transactions"
            icon="↕"
            label="Transactions"
          />

          <BottomNav
            to="/wallet"
            icon="▱"
            label="Wallet"
          />

          <BottomNav
            to="/profile"
            icon="♙"
            label="Profile"
          />

        </div>
      </nav>


      {/* ======================================================
          RESPONSIVE CSS
      ====================================================== */}

      <style>
        {`
          * {
            box-sizing: border-box;
          }

          @media (max-width: 700px) {

            .zen-header {
              min-height: 62px !important;
              padding: 8px 14px !important;
            }

            .zen-user-name {
              display: none !important;
            }

            .zen-user-arrow {
              display: none !important;
            }

            .zen-logout {
              display: none !important;
            }

            main {
              padding-left: 14px !important;
              padding-right: 14px !important;
              padding-top: 22px !important;
            }

            h1 {
              font-size: 32px !important;
            }

            .balance-actions {
              justify-content: stretch !important;
              flex-direction: column !important;
              width: 100% !important;
            }

            .balance-actions a {
              width: 100% !important;
              min-width: 0 !important;
            }
          }

          @media (min-width: 701px) {

            nav {
              display: none !important;
            }
          }

          @media (max-width: 430px) {

            .zen-header a > div:first-child {
              width: 38px !important;
              height: 38px !important;
              font-size: 19px !important;
            }

            .zen-header a > div:last-child > div:first-child {
              font-size: 16px !important;
            }

            .zen-header a > div:last-child > div:last-child {
              font-size: 7px !important;
            }

            section {
              border-radius: 18px !important;
            }

            .balance-actions {
              margin-top: 25px !important;
            }
          }
        `}
      </style>
    </div>
  );
};


/* ============================================================
   SERVICE COMPONENT
============================================================ */

interface ServiceProps {
  to: string;
  icon: string;
  title: string;
  subtitle: string;
}

const Service: React.FC<ServiceProps> = ({
  to,
  icon,
  title,
  subtitle,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '22px',
          background:
            '#e9f8f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px',
          transition:
            'transform 0.15s ease',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background:
              'linear-gradient(145deg, #079f6d, #007c57)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '25px',
            fontWeight: 800,
            boxShadow:
              '0 7px 15px rgba(0,126,88,0.15)',
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          color: '#101828',
          fontSize: '15px',
          fontWeight: 750,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: '4px',
          color: '#98a2b3',
          fontSize: '11px',
          lineHeight: 1.3,
        }}
      >
        {subtitle}
      </div>
    </Link>
  );
};


/* ============================================================
   BOTTOM NAV
============================================================ */

interface BottomNavProps {
  to: string;
  icon: string;
  label: string;
  active?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        color: active
          ? '#008f62'
          : '#667085',
        fontWeight: active
          ? 750
          : 600,
        fontSize: '11px',
      }}
    >
      <div
        style={{
          fontSize: '23px',
          lineHeight: 1,
        }}
      >
        {icon}
      </div>

      {label}
    </Link>
  );
};

export default Dashboard;
