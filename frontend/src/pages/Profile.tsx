import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface UserProfile {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  account_number?: string;
  account_name?: string;
  balance?: number;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('zenimonies_token');

        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(
          `${API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.success) {
          setProfile(
            response.data.user ||
              response.data.profile ||
              null
          );
        } else {
          setError(
            response.data?.message ||
              'Unable to load account information.'
          );
        }
      } catch (err: any) {
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
    profile?.name ||
    `${profile?.first_name || ''} ${
      profile?.last_name || ''
    }`.trim() ||
    profile?.account_name ||
    'Zenimonies User';

  const formatBalance = (balance?: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(balance || 0));
  };

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
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>
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

          {!loading && (
            <>
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
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0b5cff',
                    color: '#ffffff',
                    fontSize: '22px',
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

                  <span
                    style={{
                      color: '#667085',
                    }}
                  >
                    Zenimonies Customer
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '14px',
                }}
              >
                <div>
                  <strong>Email</strong>
                  <div
                    style={{
                      marginTop: '5px',
                      color: '#667085',
                    }}
                  >
                    {profile?.email || 'Not available'}
                  </div>
                </div>

                <div>
                  <strong>Phone Number</strong>
                  <div
                    style={{
                      marginTop: '5px',
                      color: '#667085',
                    }}
                  >
                    {profile?.phone || 'Not available'}
                  </div>
                </div>

                <div>
                  <strong>Account Number</strong>
                  <div
                    style={{
                      marginTop: '5px',
                      color: '#667085',
                    }}
                  >
                    {profile?.account_number ||
                      'Not available'}
                  </div>
                </div>

                <div>
                  <strong>Account Name</strong>
                  <div
                    style={{
                      marginTop: '5px',
                      color: '#667085',
                    }}
                  >
                    {profile?.account_name ||
                      displayName}
                  </div>
                </div>

                <div>
                  <strong>Available Balance</strong>
                  <div
                    style={{
                      marginTop: '5px',
                      color: '#172033',
                      fontSize: '20px',
                      fontWeight: 700,
                    }}
                  >
                    {formatBalance(profile?.balance)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '30px',
                  display: 'grid',
                  gap: '12px',
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
