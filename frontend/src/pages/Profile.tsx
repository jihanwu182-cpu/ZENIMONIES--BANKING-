import React, { useEffect, useState } from 'react';
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
  is_verified?: boolean;

  // Compatibility with different API response formats
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  identityVerificationStatus?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('zenimonies_user');

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      setUser(null);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    navigate('/login');
  };

  const displayName =
    user?.full_name ||
    `${user?.first_name || user?.firstName || ''} ${
      user?.last_name || user?.lastName || ''
    }`.trim() ||
    'Zenimonies User';

  const email = user?.email || 'Not available';

  const phone = user?.phone || 'Not available';

  const accountStatus =
    user?.status?.toUpperCase() || 'ACTIVE';

  const kycStatus =
    user?.kyc_status ||
    user?.identityVerificationStatus ||
    'pending';

  const phoneVerified =
    user?.is_verified ??
    user?.emailVerified ??
    false;

  const normalizedKycStatus =
    String(kycStatus).toLowerCase();

  const kycApproved =
    normalizedKycStatus === 'approved' ||
    normalizedKycStatus === 'verified';

  const kycPending =
    normalizedKycStatus === 'pending';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #eaecf0',
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
              border: '1px solid #d0d5dd',
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

      {/* Main */}
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '30px 20px 50px',
        }}
      >
        {/* Page title */}
        <section style={{ marginBottom: '25px' }}>
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
              margin: '5px 0 0',
              color: '#172033',
              fontSize: '30px',
            }}
          >
            My Profile
          </h1>
        </section>

        {/* Profile card */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '28px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, #0b5cff, #1747c7)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: '#172033',
                  fontSize: '22px',
                }}
              >
                {displayName}
              </h2>

              <p
                style={{
                  margin: '4px 0 0',
                  color: '#667085',
                }}
              >
                Zenimonies Customer
              </p>
            </div>
          </div>

          {/* Personal information */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <ProfileItem
              label="Full Name"
              value={displayName}
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
              value={accountStatus}
            />
          </div>
        </section>

        {/* Verification */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '28px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              color: '#172033',
              fontSize: '21px',
            }}
          >
            Verification & Security
          </h2>

          <p
            style={{
              margin: '0 0 22px',
              color: '#667085',
              lineHeight: 1.6,
            }}
          >
            Keep your Zenimonies account verified and
            secure.
          </p>

          {/* Phone verification */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              padding: '18px',
              border: '1px solid #eaecf0',
              borderRadius: '12px',
              marginBottom: '14px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong
                style={{
                  display: 'block',
                  color: '#172033',
                  marginBottom: '5px',
                }}
              >
                Phone Verification
              </strong>

              <span
                style={{
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                {phoneVerified
                  ? 'Your phone number is verified.'
                  : 'Verify your phone number with an OTP.'}
              </span>
            </div>

            {phoneVerified ? (
              <span
                style={{
                  padding: '7px 12px',
                  borderRadius: '20px',
                  background: '#ecfdf3',
                  color: '#027a48',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Verified
              </span>
            ) : (
              <Link
                to="/verify-phone"
                style={{
                  textDecoration: 'none',
                  background: '#0b5cff',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Verify Phone
              </Link>
            )}
          </div>

          {/* KYC verification */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              padding: '18px',
              border: '1px solid #eaecf0',
              borderRadius: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong
                style={{
                  display: 'block',
                  color: '#172033',
                  marginBottom: '5px',
                }}
              >
                Identity Verification (KYC)
              </strong>

              <span
                style={{
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                {kycApproved
                  ? 'Your identity has been verified.'
                  : kycPending
                  ? 'Complete KYC to verify your identity.'
                  : 'Review your KYC verification status.'}
              </span>
            </div>

            {kycApproved ? (
              <span
                style={{
                  padding: '7px 12px',
                  borderRadius: '20px',
                  background: '#ecfdf3',
                  color: '#027a48',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Approved
              </span>
            ) : (
              <Link
                to="/kyc"
                style={{
                  textDecoration: 'none',
                  background: '#0b5cff',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {kycPending
                  ? 'Complete KYC'
                  : 'View KYC'}
              </Link>
            )}
          </div>
        </section>

        {/* Security information */}
        <section
          style={{
            background: '#f8faff',
            border: '1px solid #dbe7ff',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              margin: '0 0 8px',
              color: '#172033',
              fontSize: '17px',
            }}
          >
            Security
          </h3>

          <p
            style={{
              margin: 0,
              color: '#667085',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Never share your password or verification
            codes with anyone. Zenimonies will never ask
            you to send an OTP to another person.
          </p>
        </section>

        {/* Back */}
        <Link
          to="/"
          style={{
            display: 'inline-block',
            textDecoration: 'none',
            color: '#0b5cff',
            fontWeight: 700,
          }}
        >
          ← Back to Dashboard
        </Link>
      </main>
    </div>
  );
};

interface ProfileItemProps {
  label: string;
  value: string;
}

const ProfileItem: React.FC<ProfileItemProps> = ({
  label,
  value,
}) => {
  return (
    <div
      style={{
        background: '#f9fafb',
        border: '1px solid #eaecf0',
        borderRadius: '10px',
        padding: '15px',
      }}
    >
      <div
        style={{
          color: '#667085',
          fontSize: '12px',
          marginBottom: '6px',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#172033',
          fontSize: '15px',
          fontWeight: 600,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default Profile;
