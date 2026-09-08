import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface User {
  id?: string | number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;

  kyc_status?: string;
  kyc_tier?: number | string;

  bvn_verified?: boolean;
  id_verified?: boolean;
  tier_3_verified?: boolean;
  tier_3_method?: string;

  account_limit?: number | string | null;
  daily_transfer_limit?: number | string;
  daily_transfer_used?: number | string;

  is_verified?: boolean;

  // Compatibility with different API response formats
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  identityVerificationStatus?: string;
}

interface KycLimits {
  accountLimit: number | null;
  dailyTransferLimit: number;
}

const TIER_LIMITS: Record<number, KycLimits> = {
  1: {
    accountLimit: 200000,
    dailyTransferLimit: 50000,
  },
  2: {
    accountLimit: 500000,
    dailyTransferLimit: 200000,
  },
  3: {
    accountLimit: null,
    dailyTransferLimit: 5000000,
  },
};

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem('zenimonies_user');

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error(
        'Unable to load profile:',
        error
      );

      setUser(null);
    }
  }, []);

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    navigate('/login');
  };

  // ============================================================
  // USER INFORMATION
  // ============================================================

  const displayName =
    user?.full_name ||
    `${user?.first_name || user?.firstName || ''} ${
      user?.last_name || user?.lastName || ''
    }`.trim() ||
    'Zenimonies User';

  const email =
    user?.email || 'Not available';

  const phone =
    user?.phone || 'Not available';

  const accountStatus =
    user?.status?.toUpperCase() || 'ACTIVE';

  const kycStatus =
    user?.kyc_status ||
    user?.identityVerificationStatus ||
    'pending';

  const normalizedKycStatus =
    String(kycStatus).toLowerCase();

  const phoneVerified =
    user?.is_verified ??
    user?.emailVerified ??
    false;

  // ============================================================
  // KYC TIER
  // ============================================================

  const currentTier = useMemo(() => {
    const tier = Number(user?.kyc_tier);

    if (tier === 2) {
      return 2;
    }

    if (tier === 3) {
      return 3;
    }

    return 1;
  }, [user?.kyc_tier]);

  const currentLimits =
    TIER_LIMITS[currentTier];

  const dailyTransferUsed = Number(
    user?.daily_transfer_used || 0
  );

  const dailyTransferRemaining =
    Math.max(
      currentLimits.dailyTransferLimit -
        dailyTransferUsed,
      0
    );

  const accountLimitText =
    currentLimits.accountLimit === null
      ? 'Unlimited'
      : `₦${currentLimits.accountLimit.toLocaleString(
          'en-NG'
        )}`;

  const dailyTransferLimitText =
    `₦${currentLimits.dailyTransferLimit.toLocaleString(
      'en-NG'
    )}`;

  const dailyTransferRemainingText =
    `₦${dailyTransferRemaining.toLocaleString(
      'en-NG'
    )}`;

  // ============================================================
  // KYC STATUS
  // ============================================================

  const kycApproved =
    normalizedKycStatus === 'approved' ||
    normalizedKycStatus === 'verified';

  const kycPending =
    normalizedKycStatus === 'pending' ||
    normalizedKycStatus === 'under_review';

  const kycRejected =
    normalizedKycStatus === 'rejected';

  // ============================================================
  // TIER INFORMATION
  // ============================================================

  const tierTitle =
    currentTier === 1
      ? 'Tier 1'
      : currentTier === 2
      ? 'Tier 2'
      : 'Tier 3';

  const tierDescription =
    currentTier === 1
      ? 'BVN verification'
      : currentTier === 2
      ? 'ID document + KYC verification'
      : 'Enhanced verification';

  const tier3Method =
    user?.tier_3_method
      ? user.tier_3_method
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
          )
      : 'Not selected';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
      }}
    >
      {/* ======================================================
          HEADER
      ======================================================= */}

      <header
        style={{
          background: '#ffffff',
          borderBottom:
            '1px solid #eaecf0',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#0b5cff',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            Zenimonies
          </Link>

          <div
            style={{
              color: '#667085',
              fontSize: '13px',
              marginTop: '2px',
            }}
          >
            Digital Banking
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#172033',
              fontWeight: 600,
            }}
          >
            Dashboard
          </Link>

          <button
            type="button"
            onClick={logout}
            style={{
              border:
                '1px solid #d0d5dd',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '9px 15px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding:
            '30px 20px 50px',
        }}
      >
        {/* ====================================================
            PAGE TITLE
        ===================================================== */}

        <section
          style={{
            marginBottom: '25px',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#667085',
              fontSize: '14px',
            }}
          >
            Account
          </p>

          <h1
            style={{
              margin:
                '5px 0 0',
              color: '#172033',
              fontSize: '30px',
            }}
          >
            My Profile
          </h1>

          <p
            style={{
              color: '#667085',
              margin:
                '8px 0 0',
              lineHeight: 1.6,
            }}
          >
            Manage your personal information,
            verification status and account limits.
          </p>
        </section>

        {/* ====================================================
            PROFILE CARD
        ===================================================== */}

        <section
          style={{
            background:
              '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius:
              '18px',
            padding: '28px',
            marginBottom:
              '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: '16px',
              marginBottom:
                '28px',
            }}
          >
            {/* Avatar */}

            <div
              style={{
                width: '64px',
                height: '64px',
                minWidth: '64px',
                borderRadius:
                  '50%',
                background:
                  'linear-gradient(135deg, #0b5cff, #1747c7)',
                color:
                  '#ffffff',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize:
                  '24px',
                fontWeight:
                  800,
              }}
            >
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color:
                    '#172033',
                  fontSize:
                    '22px',
                }}
              >
                {displayName}
              </h2>

              <p
                style={{
                  margin:
                    '4px 0 0',
                  color:
                    '#667085',
                }}
              >
                Zenimonies Customer
              </p>
            </div>
          </div>

          {/* Personal information */}

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <ProfileItem
              label="Full Name"
              value={
                displayName
              }
            />

            <ProfileItem
              label="Email Address"
              value={email}
            />

            <ProfileItem
              label="Registered Phone"
              value={phone}
            />

            <ProfileItem
              label="Account Status"
              value={
                accountStatus
              }
            />
          </div>
        </section>

        {/* ====================================================
            KYC TIER CARD
        ===================================================== */}

        <section
          style={{
            background:
              '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius:
              '18px',
            padding: '28px',
            marginBottom:
              '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems:
                'flex-start',
              gap: '15px',
              flexWrap:
                'wrap',
              marginBottom:
                '20px',
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    '0 0 7px',
                  color:
                    '#172033',
                  fontSize:
                    '21px',
                }}
              >
                Verification Level
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    '#667085',
                  lineHeight:
                    1.5,
                }}
              >
                Your current Zenimonies
                verification tier.
              </p>
            </div>

            <span
              style={{
                padding:
                  '8px 14px',
                borderRadius:
                  '20px',
                background:
                  '#eef4ff',
                color:
                  '#175cd3',
                fontSize:
                  '14px',
                fontWeight:
                  800,
              }}
            >
              {tierTitle}
            </span>
          </div>

          <div
            style={{
              background:
                '#f8faff',
              border:
                '1px solid #dbe7ff',
              borderRadius:
                '14px',
              padding:
                '18px',
              marginBottom:
                '18px',
            }}
          >
            <strong
              style={{
                display:
                  'block',
                color:
                  '#172033',
                marginBottom:
                  '5px',
                fontSize:
                  '16px',
              }}
            >
              {tierDescription}
            </strong>

            <span
              style={{
                color:
                  '#667085',
                fontSize:
                  '14px',
              }}
            >
              {currentTier === 1 &&
                'Verify your BVN to maintain Tier 1 access.'}

              {currentTier === 2 &&
                'Your account has Tier 2 identity verification.'}

              {currentTier === 3 &&
                'Your account has completed enhanced Tier 3 verification.'}
            </span>
          </div>

          {currentTier === 3 &&
            user?.tier_3_method && (
              <ProfileItem
                label="Tier 3 Verification Method"
                value={
                  tier3Method
                }
              />
            )}

          <div
            style={{
              marginTop:
                '18px',
            }}
          >
            <Link
              to="/kyc"
              style={{
                display:
                  'inline-block',
                textDecoration:
                  'none',
                background:
                  '#0b5cff',
                color:
                  '#ffffff',
                padding:
                  '11px 18px',
                borderRadius:
                  '8px',
                fontWeight:
                  700,
                fontSize:
                  '14px',
              }}
            >
              Manage KYC
            </Link>
          </div>
        </section>

        {/* ====================================================
            ACCOUNT LIMITS
        ===================================================== */}

        <section
          style={{
            background:
              '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius:
              '18px',
            padding: '28px',
            marginBottom:
              '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 8px',
              color:
                '#172033',
              fontSize:
                '21px',
            }}
          >
            Account Limits
          </h2>

          <p
            style={{
              margin:
                '0 0 22px',
              color:
                '#667085',
              lineHeight:
                1.6,
            }}
          >
            Your limits are determined by your
            verification tier.
          </p>

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '15px',
            }}
          >
            <LimitCard
              title="Account Limit"
              value={
                accountLimitText
              }
              description={
                `Maximum account balance for ${tierTitle}.`
              }
            />

            <LimitCard
              title="Daily Transfer Limit"
              value={
                dailyTransferLimitText
              }
              description="Maximum transfer amount per day."
            />

            <LimitCard
              title="Remaining Today"
              value={
                dailyTransferRemainingText
              }
              description="Remaining transfer allowance today."
            />
          </div>
        </section>

        {/* ====================================================
            TIER COMPARISON
        ===================================================== */}

        <section
          style={{
            background:
              '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius:
              '18px',
            padding: '28px',
            marginBottom:
              '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 8px',
              color:
                '#172033',
              fontSize:
                '21px',
            }}
          >
            Verification Tiers
          </h2>

          <p
            style={{
              margin:
                '0 0 22px',
              color:
                '#667085',
              lineHeight:
                1.6,
            }}
          >
            Upgrade your verification level to
            access higher account limits.
          </p>

          <TierRow
            tier={1}
            requirement="BVN verification"
            accountLimit="₦200,000"
            transferLimit="₦50,000 daily"
            active={
              currentTier === 1
            }
          />

          <TierRow
            tier={2}
            requirement="ID document + KYC"
            accountLimit="₦500,000"
            transferLimit="₦200,000 daily"
            active={
              currentTier === 2
            }
          />

          <TierRow
            tier={3}
            requirement="Choose bank statement, utility bill, or proof of address"
            accountLimit="Unlimited"
            transferLimit="₦5,000,000 daily"
            active={
              currentTier === 3
            }
          />
        </section>

        {/* ====================================================
            VERIFICATION & SECURITY
        ===================================================== */}

        <section
          style={{
            background:
              '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius:
              '18px',
            padding: '28px',
            marginBottom:
              '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 8px',
              color:
                '#172033',
              fontSize:
                '21px',
            }}
          >
            Verification & Security
          </h2>

          <p
            style={{
              margin:
                '0 0 22px',
              color:
                '#667085',
              lineHeight:
                1.6,
            }}
          >
            Keep your Zenimonies account verified
            and secure.
          </p>

          {/* Phone */}

          <VerificationRow
            title="Phone Verification"
            description={
              phoneVerified
                ? 'Your phone number is verified.'
                : 'Verify your phone number with an OTP.'
            }
            verified={
              phoneVerified
            }
            verifiedText="Verified"
            actionText="Verify Phone"
            actionLink="/verify-phone"
          />

          {/* KYC */}

          <VerificationRow
            title="Identity Verification (KYC)"
            description={
              kycApproved
                ? 'Your identity has been verified.'
                : kycPending
                ? 'Complete KYC to verify your identity.'
                : kycRejected
                ? 'Your KYC submission was rejected. Please review and resubmit.'
                : 'Review your KYC verification status.'
            }
            verified={
              kycApproved
            }
            verifiedText="Approved"
            actionText={
              kycRejected
                ? 'Resubmit KYC'
                : 'Manage KYC'
            }
            actionLink="/kyc"
            last
          />
        </section>

        {/* ====================================================
            SECURITY NOTICE
        ===================================================== */}

        <section
          style={{
            background:
              '#f8faff',
            border:
              '1px solid #dbe7ff',
            borderRadius:
              '14px',
            padding:
              '20px',
            marginBottom:
              '20px',
          }}
        >
          <h3
            style={{
              margin:
                '0 0 8px',
              color:
                '#172033',
              fontSize:
                '17px',
            }}
          >
            Security
          </h3>

          <p
            style={{
              margin: 0,
              color:
                '#667085',
              fontSize:
                '14px',
              lineHeight:
                1.6,
            }}
          >
            Never share your password or
            verification codes with anyone.
            Zenimonies will never ask you to send
            an OTP to another person.
          </p>
        </section>

        {/* ====================================================
            BACK
        ===================================================== */}

        <Link
          to="/"
          style={{
            display:
              'inline-block',
            textDecoration:
              'none',
            color:
              '#0b5cff',
            fontWeight:
              700,
          }}
        >
          ← Back to Dashboard
        </Link>
      </main>
    </div>
  );
};

// ============================================================
// PROFILE ITEM
// ============================================================

interface ProfileItemProps {
  label: string;
  value: string;
}

const ProfileItem: React.FC<
  ProfileItemProps
> = ({
  label,
  value,
}) => {
  return (
    <div
      style={{
        background:
          '#f9fafb',
        border:
          '1px solid #eaecf0',
        borderRadius:
          '10px',
        padding:
          '15px',
      }}
    >
      <div
        style={{
          color:
            '#667085',
          fontSize:
            '12px',
          marginBottom:
            '6px',
          fontWeight:
            600,
          textTransform:
            'uppercase',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            '#172033',
          fontSize:
            '15px',
          fontWeight:
            600,
          wordBreak:
            'break-word',
        }}
      >
        {value}
      </div>
    </div>
  );
};

// ============================================================
// LIMIT CARD
// ============================================================

interface LimitCardProps {
  title: string;
  value: string;
  description: string;
}

const LimitCard: React.FC<
  LimitCardProps
> = ({
  title,
  value,
  description,
}) => {
  return (
    <div
      style={{
        background:
          '#f9fafb',
        border:
          '1px solid #eaecf0',
        borderRadius:
          '12px',
        padding:
          '18px',
      }}
    >
      <div
        style={{
          color:
            '#667085',
          fontSize:
            '13px',
          fontWeight:
            700,
          marginBottom:
            '8px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          color:
            '#172033',
          fontSize:
            '22px',
          fontWeight:
            800,
          marginBottom:
            '7px',
        }}
      >
        {value}
      </div>

      <div
        style={{
          color:
            '#667085',
          fontSize:
            '13px',
          lineHeight:
            1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
};

// ============================================================
// TIER ROW
// ============================================================

interface TierRowProps {
  tier: number;
  requirement: string;
  accountLimit: string;
  transferLimit: string;
  active: boolean;
}

const TierRow: React.FC<
  TierRowProps
> = ({
  tier,
  requirement,
  accountLimit,
  transferLimit,
  active,
}) => {
  return (
    <div
      style={{
        border:
          active
            ? '2px solid #0b5cff'
            : '1px solid #eaecf0',
        borderRadius:
          '12px',
        padding:
          '17px',
        marginBottom:
          '12px',
        background:
          active
            ? '#f8faff'
            : '#ffffff',
      }}
    >
      <div
        style={{
          display:
            'grid',
          gridTemplateColumns:
            '70px 1fr',
          gap:
            '15px',
          alignItems:
            'start',
        }}
      >
        <div
          style={{
            fontWeight:
              800,
            color:
              active
                ? '#0b5cff'
                : '#172033',
          }}
        >
          Tier {tier}
        </div>

        <div>
          <div
            style={{
              color:
                '#172033',
              fontWeight:
                700,
              marginBottom:
                '6px',
            }}
          >
            {requirement}
          </div>

          <div
            style={{
              display:
                'flex',
              flexWrap:
                'wrap',
              gap:
                '8px 20px',
              color:
                '#667085',
              fontSize:
                '13px',
            }}
          >
            <span>
              Account: {accountLimit}
            </span>

            <span>
              Daily transfer: {transferLimit}
            </span>
          </div>

          {active && (
            <div
              style={{
                marginTop:
                  '8px',
                color:
                  '#175cd3',
                fontSize:
                  '12px',
                fontWeight:
                  700,
              }}
            >
              ✓ Current tier
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// VERIFICATION ROW
// ============================================================

interface VerificationRowProps {
  title: string;
  description: string;
  verified: boolean;
  verifiedText: string;
  actionText: string;
  actionLink: string;
  last?: boolean;
}

const VerificationRow: React.FC<
  VerificationRowProps
> = ({
  title,
  description,
  verified,
  verifiedText,
  actionText,
  actionLink,
  last = false,
}) => {
  return (
    <div
      style={{
        display:
          'flex',
        justifyContent:
          'space-between',
        alignItems:
          'center',
        gap:
          '15px',
        padding:
          '18px',
        border:
          '1px solid #eaecf0',
        borderRadius:
          '12px',
        marginBottom:
          last ? 0 : '14px',
        flexWrap:
          'wrap',
      }}
    >
      <div>
        <strong
          style={{
            display:
              'block',
            color:
              '#172033',
            marginBottom:
              '5px',
          }}
        >
          {title}
        </strong>

        <span
          style={{
            color:
              '#667085',
            fontSize:
              '14px',
          }}
        >
          {description}
        </span>
      </div>

      {verified ? (
        <span
          style={{
            padding:
              '7px 12px',
            borderRadius:
              '20px',
            background:
              '#ecfdf3',
            color:
              '#027a48',
            fontSize:
              '13px',
            fontWeight:
              700,
          }}
        >
          {verifiedText}
        </span>
      ) : (
        <Link
          to={actionLink}
          style={{
            textDecoration:
              'none',
            background:
              '#0b5cff',
            color:
              '#ffffff',
            padding:
              '10px 16px',
            borderRadius:
              '8px',
            fontWeight:
              600,
            fontSize:
              '14px',
          }}
        >
          {actionText}
        </Link>
      )}
    </div>
  );
};

export default Profile;
