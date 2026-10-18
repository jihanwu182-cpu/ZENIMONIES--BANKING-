import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  transaction_id?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}
const API_ROOT =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';
const API_BASE_URL = API_ROOT.endsWith('/api')
  ? API_ROOT
  : `${API_ROOT}/api`;
const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const getToken = () =>
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token');
  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });
  // ----------------------------------------------------------
  // LOAD NOTIFICATIONS
  // ----------------------------------------------------------
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (!getToken()) {
        navigate('/login', { replace: true });
        return;
      }
      const response = await axios.get(
        `${API_BASE_URL}/notifications`,
        { headers: getHeaders() }
      );
      if (response.data?.success) {
        setNotifications(
          Array.isArray(response.data.notifications)
            ? response.data.notifications
            : []
        );
      } else {
        setError(
          response.data?.message ||
            'Unable to load your notifications.'
        );
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
        'Unable to load notifications. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  // ----------------------------------------------------------
  // MARK ONE AS READ
  // ----------------------------------------------------------
  const markAsRead = async (id: string) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/notifications/${id}/read`,
        {},
        { headers: getHeaders() }
      );
      if (response.data?.success) {
        setNotifications(current =>
          current.map(item =>
            item.id === id
              ? {
                  ...item,
                  is_read: true,
                  read_at:
                    response.data.notification?.read_at ||
                    new Date().toISOString(),
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error(
        'Failed to mark notification as read:',
        err
      );
    }
  };
  // ----------------------------------------------------------
  // MARK ALL AS READ
  // ----------------------------------------------------------
  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const response = await axios.patch(
        `${API_BASE_URL}/notifications/read-all`,
        {},
        { headers: getHeaders() }
      );
      if (response.data?.success) {
        setNotifications(current =>
          current.map(item => ({
            ...item,
            is_read: true,
            read_at:
              item.read_at || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.error(
        'Failed to mark all notifications as read:',
        err
      );
      setError('Unable to update notifications.');
    } finally {
      setMarkingAll(false);
    }
  };
  // ----------------------------------------------------------
  // UNREAD COUNT
  // ----------------------------------------------------------
  const unreadCount = notifications.filter(
    item => !item.is_read
  ).length;
  // ----------------------------------------------------------
  // DATE FORMAT
  // ----------------------------------------------------------
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const sameDay =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    return date.toLocaleString([], {
      day: 'numeric',
      month: 'short',
      ...(sameDay ? {} : { year: 'numeric' }),
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  // ----------------------------------------------------------
  // TRANSACTION NOTIFICATION DETECTION
  // ----------------------------------------------------------
  const isTransactionNotification = (
    item: NotificationItem
  ) => {
    const type = (item.type || '').toLowerCase();
    return Boolean(item.transaction_id) ||
      [
        'transfer',
        'money_received',
        'deposit',
        'withdrawal',
        'payment',
        'transaction',
      ].includes(type);
  };
  // ----------------------------------------------------------
  // OPEN NOTIFICATION / RECEIPT
  // ----------------------------------------------------------
  const openNotification = async (
    item: NotificationItem
  ) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    if (item.transaction_id) {
      // The receipt route must be confirmed against the
      // existing app before relying on this navigation.
      navigate(
        `/transactions/${encodeURIComponent(
          item.transaction_id
        )}/receipt`
      );
      return;
    }
    if (isTransactionNotification(item)) {
      // Do not guess a transaction receipt when the
      // notification has no transaction ID.
      setError(
        'This transaction notification has no receipt link yet.'
      );
      return;
    }
    if (item.type === 'security') {
      navigate('/security');
      return;
    }
    if (item.type === 'kyc') {
      navigate('/kyc');
      return;
    }
  };
  // ----------------------------------------------------------
  // PAYMENT NOTIFICATION PRESENTATION
  // ----------------------------------------------------------
  const getPaymentHeading = (item: NotificationItem) => {
    const title = (item.title || '').trim();
    const message = (item.message || '').trim();
    if (/payment received/i.test(title)) {
      return title;
    }
    if (/payment received/i.test(message)) {
      return message.split(/[.!]/)[0];
    }
    return title || 'Account notification';
  };
  const getIcon = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'transfer':
      case 'money_received':
      case 'deposit':
      case 'payment':
        return '↙';
      case 'withdrawal':
        return '↗';
      case 'security':
        return '⌑';
      case 'kyc':
        return '✓';
      default:
        return '●';
    }
  };
  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        color: '#172b22',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      <header
        style={{
          background: '#fff',
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
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 15,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Go to Zenimonies dashboard"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background:
                  'linear-gradient(135deg, #079447, #007a3f)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Z
            </div>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#063b2d',
                }}
              >
                ZENIMONIES
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 1.5,
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
              border: 0,
              background: 'transparent',
              color: '#087c43',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
        </div>
      </header>
      <main
        style={{
          width: 'min(700px, 92%)',
          margin: '0 auto',
          paddingTop: 28,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            color: '#66756e',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 18,
          }}
        >
          ← Back to Dashboard
        </button>
        <section
          style={{
            background: '#fff',
            border: '1px solid #e5ebe8',
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 8px 25px rgba(26,61,47,0.05)',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 15,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
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
                  fontSize: 14,
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
                  borderRadius: 10,
                  padding: '10px 13px',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: markingAll ? 'wait' : 'pointer',
                  opacity: markingAll ? 0.6 : 1,
                }}
              >
                {markingAll ? 'Updating...' : 'Mark all as read'}
              </button>
            )}
          </div>
        </section>
        {error && (
          <div
            role="alert"
            style={{
              background: '#fff5f5',
              border: '1px solid #f2caca',
              color: '#b42318',
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
              fontSize: 13,
            }}
          >
            {error}
            <button
              type="button"
              onClick={loadNotifications}
              style={{
                marginLeft: 10,
                border: 0,
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
        {loading ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5ebe8',
              borderRadius: 20,
              padding: 45,
              textAlign: 'center',
              color: '#66756e',
            }}
          >
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5ebe8',
              borderRadius: 20,
              padding: '55px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: '#e8f8f0',
                color: '#087c43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 28,
              }}
            >
              ♧
            </div>
            <h2
              style={{
                margin: '0 0 8px',
                color: '#063b2d',
                fontSize: 19,
              }}
            >
              No notifications yet
            </h2>
            <p
              style={{
                margin: 0,
                color: '#66756e',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Important updates about your account and
              confirmed transactions will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {notifications.map(item => {
              const transaction =
                isTransactionNotification(item);
              return (
                <article
                  key={item.id}
                  style={{
                    background: item.is_read
                      ? '#fff'
                      : '#f1fbf6',
                    border: item.is_read
                      ? '1px solid #e5ebe8'
                      : '1px solid #cfe8da',
                    borderRadius: 16,
                    padding: 17,
                    boxShadow:
                      '0 5px 18px rgba(26,61,47,0.04)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    aria-label={`Open notification: ${item.title}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 13,
                      width: '100%',
                      textAlign: 'left',
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 13,
                        background: '#e8f8f0',
                        color: '#087c43',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 21,
                        fontWeight: 800,
                      }}
                    >
                      {getIcon(item.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: '#111827',
                            fontSize: 15,
                            lineHeight: 1.45,
                            fontWeight: 800,
                          }}
                        >
                          {transaction
                            ? getPaymentHeading(item)
                            : item.title}
                        </h3>
                        {!item.is_read && (
                          <span
                            aria-label="Unread"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#079447',
                              flexShrink: 0,
                              marginTop: 5,
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          margin: '7px 0 8px',
                          color: '#52665a',
                          fontSize: 13,
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.message}
                      </p>
                      <div
                        style={{
                          color: '#66756e',
                          fontSize: 12,
                        }}
                      >
                        {formatDate(item.created_at)}
                      </div>
                      {transaction && (
                        <div
                          style={{
                            marginTop: 8,
                            color: '#087c43',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Tap to open transaction receipt →
                        </div>
                      )}
                    </div>
                  </button>
                  {!item.is_read && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingLeft: 55,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        style={{
                          border: '1px solid #cfe5d9',
                          background: '#fff',
                          color: '#087c43',
                          borderRadius: 9,
                          padding: '7px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mark as read
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
export default Notifications;
