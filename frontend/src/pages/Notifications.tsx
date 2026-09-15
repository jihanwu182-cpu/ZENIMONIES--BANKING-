import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const Notifications: React.FC = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const getToken = () =>
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token');

  const getHeaders = () => {
    const token = getToken();

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = getToken();

      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/notifications`,
        {
          headers: getHeaders(),
        }
      );

      if (response.data?.success) {
        setNotifications(
          Array.isArray(response.data.notifications)
            ? response.data.notifications
            : []
        );
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);

      if (
        axios.isAxiosError(err) &&
        err.response?.status === 401
      ) {
        navigate('/login', { replace: true });
        return;
      }

      setError(
        'Unable to load your notifications. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {},
        {
          headers: getHeaders(),
        }
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );
    } catch (err) {
      console.error(
        'Failed to mark notification as read:',
        err
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);

      await axios.patch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {},
        {
          headers: getHeaders(),
        }
      );

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at ||
            new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error(
        'Failed to mark all notifications as read:',
        err
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/notifications/${id}`,
        {
          headers: getHeaders(),
        }
      );

      setNotifications((current) =>
        current.filter(
          (notification) => notification.id !== id
        )
      );
    } catch (err) {
      console.error(
        'Failed to delete notification:',
        err
      );
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'money_received':
        return '↔';

      case 'security':
        return '🔐';

      case 'kyc':
        return '✓';

      case 'deposit':
        return '↓';

      case 'withdrawal':
        return '↑';

      default:
        return '🔔';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        color: '#172b22',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: '40px',
      }}
    >
      {/* HEADER */}

      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5ebe8',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 'min(920px, 92%)',
            margin: '0 auto',
            minHeight: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: 0,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                background:
                  'linear-gradient(135deg, #079447, #007a3f)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
              }}
            >
              Z
            </div>

            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#063b2d',
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#98a2a0',
                }}
              >
                DIGITAL BANKING
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#087c43',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* CONTENT */}

      <main
        style={{
          width: 'min(700px, 92%)',
          margin: '0 auto',
          paddingTop: '28px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#66756e',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '18px',
          }}
        >
          ← Back to Dashboard
        </button>

        {/* TITLE CARD */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5ebe8',
            borderRadius: '20px',
            padding: '24px',
            boxShadow:
              '0 8px 25px rgba(26, 61, 47, 0.05)',
            marginBottom: '14px',
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
              <h1
                style={{
                  margin: 0,
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#063b2d',
                }}
              >
                Notifications
              </h1>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#66756e',
                  fontSize: '14px',
                }}
              >
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? '' : 's'
                    }`
                  : 'You are all caught up.'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
                style={{
                  border: '1px solid #cfe5d9',
                  background: '#effbf5',
                  color: '#087c43',
                  borderRadius: '10px',
                  padding: '10px 13px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: markingAll
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: markingAll ? 0.6 : 1,
                }}
              >
                {markingAll
                  ? 'Updating...'
                  : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #f2caca',
              color: '#b42318',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '14px',
              fontSize: '13px',
            }}
          >
            {error}

            <button
              type="button"
              onClick={loadNotifications}
              style={{
                marginLeft: '10px',
                border: 'none',
                background: 'transparent',
                color: '#b42318',
                textDecoration: 'underline',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5ebe8',
              borderRadius: '20px',
              padding: '45px 20px',
              textAlign: 'center',
              color: '#66756e',
              fontSize: '14px',
            }}
          >
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          /* EMPTY */

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5ebe8',
              borderRadius: '20px',
              padding: '55px 20px',
              textAlign: 'center',
              boxShadow:
                '0 8px 25px rgba(26, 61, 47, 0.04)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: '#e8f8f0',
                color: '#087c43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px',
              }}
            >
              🔔
            </div>

            <h2
              style={{
                margin: '0 0 8px',
                color: '#063b2d',
                fontSize: '19px',
              }}
            >
              No notifications yet
            </h2>

            <p
              style={{
                margin: 0,
                color: '#66756e',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              Important updates about your Zenimonies
              account and transactions will appear here.
            </p>
          </div>
        ) : (
          /* NOTIFICATION LIST */

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  background: notification.is_read
                    ? '#ffffff'
                    : '#f1fbf6',
                  border: notification.is_read
                    ? '1px solid #e5ebe8'
                    : '1px solid #cfe8da',
                  borderRadius: '18px',
                  padding: '17px',
                  boxShadow:
                    '0 5px 18px rgba(26, 61, 47, 0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '13px',
                  }}
                >
                  <div
                    style={{
                      width: '45px',
                      height: '45px',
                      flexShrink: 0,
                      borderRadius: '14px',
                      background: '#e8f8f0',
                      color: '#087c43',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    {getIcon(notification.type)}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
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
                      <h3
                        style={{
                          margin: 0,
                          color: '#063b2d',
                          fontSize: '15px',
                          fontWeight: 800,
                        }}
                      >
                        {notification.title}
                      </h3>

                      {!notification.is_read && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#e11d48',
                            flexShrink: 0,
                            marginTop: '5px',
                          }}
                        />
                      )}
                    </div>

                    <p
                      style={{
                        margin: '6px 0 8px',
                        color: '#66756e',
                        fontSize: '13px',
                        lineHeight: 1.55,
                      }}
                    >
                      {notification.message}
                    </p>

                    <div
                      style={{
                        color: '#98a2a0',
                        fontSize: '11px',
                      }}
                    >
                      {formatDate(notification.created_at)}
                    </div>

                    <div
                      style={{
                        marginTop: '11px',
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() =>
                            markAsRead(notification.id)
                          }
                          style={{
                            border: '1px solid #cfe5d9',
                            background: '#ffffff',
                            color: '#087c43',
                            borderRadius: '9px',
                            padding: '7px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Mark as read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deleteNotification(
                            notification.id
                          )
                        }
                        style={{
                          border: '1px solid #eadede',
                          background: '#ffffff',
                          color: '#8b3a3a',
                          borderRadius: '9px',
                          padding: '7px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
