import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface UserProfile {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  kyc_status?: string;
  is_verified?: boolean;
}

interface Account {
  id?: string;
  account_number?: string;
  account_type?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
}

interface ProfileResponse {
  success?: boolean;
  user?: UserProfile;
  profile?: UserProfile;
  accounts?: Account[];
  account?: Account;
  message?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token =
          localStorage.getItem('zenimonies_token') ||
          localStorage.getItem('token');

        if (!token) {
          navigate('/login');
          return;
        }

        const response =
          await axios.get<ProfileResponse>(
            `${API_URL}/api/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (response.data?.success) {
          const user =
            response.data.user ||
            response.data.profile ||
            null;

          const accounts =
            response.data.accounts || [];

          const singleAccount =
            response.data.account || null;

          setProfile(user);

          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else if (singleAccount) {
            setAccount(singleAccount);
          } else {
            setAccount(null);
          }
        } else {
          setError(
            response.data?.message ||
              'Unable to load account information.'
          );
        }
      } catch (err: any) {
        console.error('Profile error:', err);

        if (err?.response?.status === 401) {
          localStorage.removeItem('zenimonies_token');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        setError(
          err?.response?.data?.message ||
            'Unable to load your profile.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');

    navigate('/login');
  };

  const displayName =
    profile?.full_name ||
    'Zenimonies User';

  const formatBalance = (
    balance?: number | string
  ) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: account?.currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(balance || 0));
  };

  const getVerificationStatus = () => {
    if (profile?.is_verified) {
      return 'Verified';
    }

    if (profile?.kyc_status === 'approved') {
      return 'Verified';
    }

    if (profile?.kyc_status === 'rejected') {
      return 'Verification rejected';
    }

    return 'Verification pending';
  };

  const verificationColor =
    profile?.is_verified ||
    profile?.kyc_status === 'approved'
      ? '#027a48'
      : profile?.kyc_status === 'rejected'
      ? '#b42318'
      : '#b54708';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#0b5cff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            Profile & Account
          </h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px',
            }}
          >
            Manage your Zenimonies account information.
          </p>

          {loading && (
            <div
              style={{
                padding: '25px 0',
                color: '#667085',
              }}
            >
              Loading account information...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '20px',
                borderRadius: '8px',
                background: '#fee4e2',
                color: '#b42318',
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* PROFILE HEADER */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  marginBottom: '24px',
                  borderRadius: '14px',
                  background: '#f5f7fb',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0b5cff',
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: 700,
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
                      fontSize: '20px',
                    }}
                  >
                    {displayName}
                  </h2>

                  <div
                    style={{
                      color: '#667085',
                      marginTop: '4px',
                    }}
                  >
                    Zenimonies Customer
                  </div>

                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      padding: '5px 10px',
                      borderRadius: '20px',
                      background:
                        profile?.is_verified ||
                        profile?.kyc_status ===
                          'approved'
                          ? '#ecfdf3'
                          : '#fff7ed',
                      color: verificationColor,
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {getVerificationStatus()}
                  </div>
                </div>
              </div>

              {/* ACCOUNT INFORMATION */}
              <div
                style={{
                  display: 'grid',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                  }}
                >
                  <strong>Email</strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color: '#667085',
                    }}
                  >
                    {profile?.email ||
                      'Not available'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                  }}
                >
                  <strong>Phone Number</strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color: '#667085',
                    }}
                  >
                    {profile?.phone ||
                      'Not available'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                  }}
                >
                  <strong>Account Number</strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color: '#172033',
                      fontSize: '18px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                    }}
                  >
                    {account?.account_number ||
                      'Not available'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                  }}
                >
                  <strong>Account Name</strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color: '#667085',
                    }}
                  >
                    {profile?.full_name ||
                      'Zenimonies User'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                  }}
                >
                  <strong>Account Type</strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color: '#667085',
                      textTransform:
                        'capitalize',
                    }}
                  >
                    {account?.account_type ||
                      'Personal'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    border: '1px solid #eaecf0',
                    borderRadius: '10px',
                  }}
                >
                  <strong>Account Status</strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color:
                        account?.status ===
                        'active'
                          ? '#027a48'
                          : '#b42318',
                      fontWeight: 600,
                      textTransform:
                        'capitalize',
                    }}
                  >
                    {account?.status ||
                      'Unknown'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '18px',
                    borderRadius: '12px',
                    background: '#f5f7fb',
                  }}
                >
                  <strong>
                    Available Balance
                  </strong>

                  <div
                    style={{
                      marginTop: '8px',
                      color: '#172033',
                      fontSize: '26px',
                      fontWeight: 700,
                    }}
                  >
                    {formatBalance(
                      account?.balance
                    )}
                  </div>
                </div>
              </div>

              {/* VERIFICATION */}
              <div
                style={{
                  marginTop: '28px',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #eaecf0',
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: '8px',
                  }}
                >
                  Account Verification
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: '#667085',
                  }}
                >
                  Current status:{' '}
                  <strong
                    style={{
                      color: verificationColor,
                    }}
                  >
                    {getVerificationStatus()}
                  </strong>
                </p>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '8px',
                    background: '#f9fafb',
                  }}
                >
                  <strong>
                    Verification Level
                  </strong>

                  <div
                    style={{
                      marginTop: '6px',
                      color: '#667085',
                    }}
                  >
                    Level 1
                  </div>
                </div>
              </div>

              {/* LOGOUT */}
              <div
                style={{
                  marginTop: '30px',
                }}
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#d92d20',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '15px',
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
