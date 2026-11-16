
import React, {
  useCallback,
  useEffect,
  useMemo,
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
  sender_name?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

type Category = 'transactions' | 'events';

const API_ROOT =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const API_BASE_URL = API_ROOT.endsWith('/api')
  ? API_ROOT
  : `${API_ROOT}/api`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#F5F8F6',
    color: '#172B22',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 50,
  },

  header: {
    background: '#FFFFFF',
    borderBottom: '1px solid #E6ECE8',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  headerInner: {
    width: 'min(1000px, 92%)',
    minHeight: 72,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },

  brandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },

  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    background: 'linear-gradient(135deg, #079B50, #006F3D)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 900,
  },

  brandName: {
    color: '#063B2D',
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: 0.3,
  },

  brandSubtitle: {
    color: '#87958D',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.8,
    marginTop: 3,
  },

  dashboardButton: {
    border: '1px solid #DCE9E1',
    background: '#F5FAF7',
    color: '#087C43',
    borderRadius: 11,
    padding: '10px 15px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },

  main: {
    width: 'min(760px, 92%)',
    margin: '0 auto',
    paddingTop: 30,
  },

  backButton: {
    border: 0,
    background: 'transparent',
    color: '#64766C',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 20,
  },

  hero: {
    background: 'linear-gradient(135deg, #FFFFFF, #F1FAF5)',
    border: '1px solid #E0EBE4',
    borderRadius: 22,
    padding: '25px 24px',
    boxShadow: '0 8px 30px rgba(24, 65, 44, 0.045)',
    marginBottom: 18,
  },

  heroTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
  },

  eyebrow: {
    color: '#07864A',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    marginBottom: 9,
  },

  pageTitle: {
    color: '#073B2C',
    fontSize: 27,
    fontWeight: 900,
    letterSpacing: -0.7,
    margin: 0,
  },

  pageDescription: {
    color: '#697B70',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '8px 0 0',
  },

  unreadBox: {
    minWidth: 75,
    background: '#E5F5EC',
    border: '1px solid #D3EBDD',
    borderRadius: 15,
    padding: '12px 10px',
    textAlign: 'center',
  },

  unreadNumber: {
    color: '#087C43',
    fontSize: 24,
    fontWeight: 900,
    lineHeight: 1.2,
  },

  unreadLabel: {
    color: '#39825D',
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.3,
    marginTop: 4,
  },

  tabs: {
    display: 'flex',
    gap: 5,
    padding: 5,
    background: '#E9F0EB',
    border: '1px solid #DCE8E0',
    borderRadius: 15,
    marginBottom: 25,
  },

  tab: {
    flex: 1,
    minHeight: 46,
    border: 0,
    borderRadius: 11,
    background: 'transparent',
    color: '#65766C',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  activeTab: {
    background: '#087C43',
    color: '#FFFFFF',
    boxShadow: '0 4px 12px rgba(8, 124, 67, 0.18)',
  },

  tabBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 20,
    padding: '0 5px',
    background: '#DDF2E5',
    color: '#087C43',
    fontSize: 10,
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBadgeActive: {
    background: '#FFFFFF',
    color: '#087C43',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#17382A',
    fontSize: 16,
    fontWeight: 900,
    margin: 0,
  },

  sectionSubtitle: {
    color: '#89968E',
    fontSize: 11,
    marginTop: 5,
  },

  actionButton: {
    border: '1px solid #D5E8DC',
    background: '#FFFFFF',
    color: '#087C43',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },

  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  card: {
    background: '#FFFFFF',
    border: '1px solid #E4EBE6',
    borderRadius: 18,
    padding: 19,
    boxShadow: '0 5px 20px rgba(26, 61, 47, 0.035)',
    transition: 'border-color 0.2s ease',
  },

  unreadCard: {
    border: '1px solid #BBDDC9',
    background: '#FCFFFD',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  },

  iconBox: {
    width: 47,
    height: 47,
    flexShrink: 0,
    borderRadius: 15,
    background: '#E8F6EE',
    color: '#087C43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 900,
  },

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  cardHeading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  cardTitle: {
    color: '#17382A',
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 900,
    margin: 0,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#079447',
    flexShrink: 0,
    marginTop: 6,
  },

  amount: {
    color: '#087C43',
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: -0.5,
    marginTop: 7,
  },

  message: {
    color: '#65766C',
    fontSize: 12,
    lineHeight: 1.7,
    margin: '7px 0 0',
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },

  date: {
    color: '#929E96',
    fontSize: 10,
    marginTop: 9,
  },

  divider: {
    height: 1,
    background: '#EDF1EE',
    margin: '15px 0 12px',
  },

  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  status: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#079447',
  },

  viewButton: {
    border: 0,
    borderRadius: 10,
    background: '#087C43',
    color: '#FFFFFF',
    padding: '10px 15px',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },

  markReadButton: {
    border: 0,
    background: 'transparent',
    color: '#74877A',
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
    padding: 5,
  },

  empty: {
    background: '#FFFFFF',
    border: '1px solid #E4EBE6',
    borderRadius: 20,
    padding: '55px 22px',
    textAlign: 'center',
  },

  emptyIcon: {
    width: 65,
    height: 65,
    margin: '0 auto 17px',
    borderRadius: 20,
    background: '#E8F6EE',
    color: '#087C43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
  },

  emptyTitle: {
    color: '#17382A',
    fontSize: 17,
    fontWeight: 900,
    margin: 0,
  },

  emptyMessage: {
    maxWidth: 360,
    margin: '9px auto 0',
    color: '#78877E',
    fontSize: 12,
    lineHeight: 1.7,
  },

  loading: {
    background: '#FFFFFF',
    border: '1px solid #E4EBE6',
    borderRadius: 18,
    padding: 45,
    textAlign: 'center',
    color: '#64766C',
    fontSize: 13,
  },

  error: {
    background: '#FFF5F5',
    border: '1px solid #F2CACA',
    color: '#B42318',
    borderRadius: 13,
    padding: 14,
    marginBottom: 15,
    fontSize: 12,
    lineHeight: 1.6,
  },

  retryButton: {
    border: 0,
    background: 'transparent',
    color: '#B42318',
    textDecoration: 'underline',
    fontWeight: 800,
    cursor: 'pointer',
    marginLeft: 8,
  },

  footer: {
    textAlign: 'center',
    color: '#A0ACA4',
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 2,
    marginTop: 35,
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(8, 28, 19, 0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 12,
  },

  modal: {
    width: 'min(540px, 100%)',
    maxHeight: '85vh',
    overflowY: 'auto',
    background: '#FFFFFF',
    borderRadius: '24px 24px 18px 18px',
    padding: 23,
    boxShadow: '0 20px 70px rgba(0,0,0,0.2)',
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 10,
    background: '#DCE5DF',
    margin: '0 auto 22px',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  modalTitle: {
    color: '#17382A',
    fontSize: 17,
    fontWeight: 900,
    margin: 0,
  },

  closeButton: {
    width: 34,
    height: 34,
    border: 0,
    borderRadius: 50,
    background: '#F0F5F1',
    color: '#52665A',
    fontSize: 21,
    cursor: 'pointer',
  },

  modalMessage: {
    color: '#65766C',
    fontSize: 13,
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },

  modalDone: {
    width: '100%',
    minHeight: 47,
    border: 0,
    borderRadius: 12,
    background: '#087C43',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 900,
    marginTop: 25,
    cursor: 'pointer',
  },
};

const isTransactionNotification = (
  item: NotificationItem
) => {
  const type = String(item.type || '').toLowerCase();

  return Boolean(item.transaction_id) ||
    [
      'transfer',
      'money_received',
      'deposit',
      'withdrawal',
      'payment',
      'transaction',
      'credit',
      'debit',
      'refund',
      'reversal',
    ].some(value => type.includes(value));
};

const getIcon = (type: string) => {
  const value = String(type || '').toLowerCase();

  if (
    value.includes('withdrawal') ||
    value.includes('debit')
  ) {
    return '↗';
  }

  if (
    value.includes('transfer') ||
    value.includes('payment') ||
    value.includes('deposit') ||
    value.includes('credit')
  ) {
    return '↙';
  }

  if (
    value.includes('security') ||
    value.includes('login')
  ) {
    return '⌑';
  }

  if (
    value.includes('kyc') ||
    value.includes('verified')
  ) {
    return '✓';
  }

  if (
    value.includes('failed') ||
    value.includes('error')
  ) {
    return '!';
  }

  return '●';
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Avoid presenting the generic placeholder as if it were a real sender.
// The backend must provide sender_name before a real name can be displayed.
const getDisplayMessage = (item: NotificationItem) => {
  const message = String(item.message || '').trim();
  const sender = String(item.sender_name || '').trim();

  if (sender) {
    return message.replace(
      /from a Zenimonies user/gi,
      `from ${sender}`
    );
  }

  return message.replace(
    /\s+from a Zenimonies user\.?/gi,
    ''
  ).trim();
};

const getDisplayTitle = (item: NotificationItem) => {
  const title = String(item.title || '').trim();

  if (
    item.sender_name &&
    /^(money received|payment received)$/i.test(title)
  ) {
    return `Money received from ${item.sender_name}`;
  }

  return title || 'Account notification';
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] =
    useState<Category>('transactions');

  const [selectedEvent, setSelectedEvent] =
    useState<NotificationItem | null>(null);

  const getToken = useCallback(() =>
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token'),
  []);

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/json',
  }), [getToken]);

  // ----------------------------------------------------------
  // LOAD NOTIFICATIONS
  // ----------------------------------------------------------

  const loadNotifications = useCallback(async (
    showLoader = true
  ) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      if (!getToken()) {
        navigate('/login', { replace: true });
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/notifications?limit=100`,
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
      setRefreshing(false);
    }
  }, [getHeaders, getToken, navigate]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ----------------------------------------------------------
  // CATEGORY FILTERS
  // ----------------------------------------------------------

  const transactionNotifications = useMemo(
    () => notifications.filter(isTransactionNotification),
    [notifications]
  );

  const eventNotifications = useMemo(
    () => notifications.filter(
      item => !isTransactionNotification(item)
    ),
    [notifications]
  );

  const displayedNotifications =
    activeCategory === 'transactions'
      ? transactionNotifications
      : eventNotifications;

  const unreadCount = notifications.filter(
    item => !item.is_read
  ).length;

  const transactionUnread = transactionNotifications.filter(
    item => !item.is_read
  ).length;

  const eventUnread = eventNotifications.filter(
    item => !item.is_read
  ).length;

  // ----------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(false);
  };

  // ----------------------------------------------------------
  // MARK ONE AS READ
  // ----------------------------------------------------------

  const markAsRead = async (id: string) => {
    const item = notifications.find(
      notification => notification.id === id
    );

    if (!item || item.is_read) {
      return;
    }

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
        {},
        { headers: getHeaders() }
      );

      if (response.data?.success) {
        setNotifications(current =>
          current.map(notification =>
            notification.id === id
              ? {
                  ...notification,
                  is_read: true,
                  read_at:
                    response.data.notification?.read_at ||
                    new Date().toISOString(),
                }
              : notification
          )
        );

        setSelectedEvent(current =>
          current?.id === id
            ? { ...current, is_read: true }
            : current
        );
      } else {
        throw new Error(
          response.data?.message ||
          'Unable to update notification.'
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError('Unable to mark this notification as read.');
    }
  };

  // ----------------------------------------------------------
  // MARK ALL AS READ
  // ----------------------------------------------------------

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    try {
      setMarkingAll(true);

      const response = await axios.patch(
        `${API_BASE_URL}/notifications/read-all`,
        {},
        { headers: getHeaders() }
      );

      if (response.data?.success) {
        const now = new Date().toISOString();

        setNotifications(current =>
          current.map(item => ({
            ...item,
            is_read: true,
            read_at: item.read_at || now,
          }))
        );

        setSelectedEvent(current =>
          current
            ? {
                ...current,
                is_read: true,
                read_at: current.read_at || now,
              }
            : null
        );
      } else {
        throw new Error(
          response.data?.message ||
          'Unable to update notifications.'
        );
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError('Unable to update notifications.');
    } finally {
      setMarkingAll(false);
    }
  };

  // ----------------------------------------------------------
  // OPEN NOTIFICATION
  // ----------------------------------------------------------

  const openNotification = async (
    item: NotificationItem
  ) => {
    if (updatingId) {
      return;
    }

    setUpdatingId(item.id);

    try {
      if (!item.is_read) {
        await markAsRead(item.id);
      }

      if (isTransactionNotification(item)) {
        if (!item.transaction_id) {
          setError(
            'This transaction does not have a linked receipt yet. Please contact support if you need assistance.'
          );
          return;
        }

        navigate(
          `/transactions/${encodeURIComponent(
            item.transaction_id
          )}/receipt`
        );

        return;
      }

      setSelectedEvent({
        ...item,
        is_read: true,
      });

      if (item.type === 'security') {
        // Event details remain available in the notification panel.
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // ----------------------------------------------------------
  // RENDER NOTIFICATION
  // ----------------------------------------------------------

  const renderNotification = (
    item: NotificationItem
  ) => {
    const transaction = isTransactionNotification(item);
    const title = getDisplayTitle(item);
    const message = getDisplayMessage(item);

    return (
      <article
        key={item.id}
        style={{
          ...styles.card,
          ...(item.is_read ? {} : styles.unreadCard),
        }}
      >
        <div style={styles.cardTop}>
          <div style={styles.iconBox} aria-hidden="true">
            {getIcon(item.type)}
          </div>

          <div style={styles.cardContent}>
            <div style={styles.cardHeading}>
              <h3 style={styles.cardTitle}>
                {title}
              </h3>

              {!item.is_read && (
                <span
                  style={styles.unreadDot}
                  aria-label="Unread"
                />
              )}
            </div>

            {transaction && item.sender_name && (
              <div style={styles.amount}>
                {item.sender_name}
              </div>
            )}

            <p style={styles.message}>
              {message}
            </p>

            <div style={styles.date}>
              {formatDate(item.created_at)}
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.cardBottom}>
          <div
            style={{
              ...styles.status,
              color: item.is_read ? '#89968E' : '#087C43',
            }}
          >
            <span
              style={{
                ...styles.statusDot,
                background: item.is_read
                  ? '#AAB5AE'
                  : '#079447',
              }}
            />
            {item.is_read ? 'READ' : 'UNREAD'}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {!item.is_read && (
              <button
                type="button"
                style={styles.markReadButton}
                onClick={() => markAsRead(item.id)}
              >
                Mark as read
              </button>
            )}

            <button
              type="button"
              style={styles.viewButton}
              onClick={() => openNotification(item)}
              disabled={Boolean(updatingId)}
            >
              {updatingId === item.id
                ? 'Opening...'
                : transaction
                  ? 'View transaction'
                  : 'View details'}
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </article>
    );
  };

  // ----------------------------------------------------------
  // EMPTY STATE
  // ----------------------------------------------------------

  const renderEmptyState = () => (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        {activeCategory === 'transactions' ? '↗' : '●'}
      </div>

      <h2 style={styles.emptyTitle}>
        {activeCategory === 'transactions'
          ? 'No transaction updates'
          : 'No account events yet'}
      </h2>

      <p style={styles.emptyMessage}>
        {activeCategory === 'transactions'
          ? 'Your confirmed transfers, payments and transaction updates will appear here.'
          : 'Your account, verification, security and service updates will appear here.'}
      </p>
    </div>
  );

  // ----------------------------------------------------------
  // MAIN SCREEN
  // ----------------------------------------------------------

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Go to ZENIMONIES dashboard"
            style={styles.brandButton}
          >
            <div style={styles.brandIcon}>Z</div>

            <div>
              <div style={styles.brandName}>
                ZENIMONIES
              </div>

              <div style={styles.brandSubtitle}>
                DIGITAL BANKING
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={styles.dashboardButton}
          >
            Dashboard
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>

        <section style={styles.hero}>
          <div style={styles.heroTop}>
            <div>
              <div style={styles.eyebrow}>
                ZENIMONIES ACCOUNT CENTRE
              </div>

              <h1 style={styles.pageTitle}>
                Notifications
              </h1>

              <p style={styles.pageDescription}>
                Your financial activity and important account updates, all in one place.
              </p>
            </div>

            <div style={styles.unreadBox}>
              <div style={styles.unreadNumber}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>

              <div style={styles.unreadLabel}>
                UNREAD
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORY TABS */}

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => setActiveCategory('transactions')}
            style={{
              ...styles.tab,
              ...(activeCategory === 'transactions'
                ? styles.activeTab
                : {}),
            }}
          >
            Transactions

            {transactionUnread > 0 && (
              <span
                style={{
                  ...styles.tabBadge,
                  ...(activeCategory === 'transactions'
                    ? styles.tabBadgeActive
                    : {}),
                }}
              >
                {transactionUnread > 99
                  ? '99+'
                  : transactionUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('events')}
            style={{
              ...styles.tab,
              ...(activeCategory === 'events'
                ? styles.activeTab
                : {}),
            }}
          >
            Events

            {eventUnread > 0 && (
              <span
                style={{
                  ...styles.tabBadge,
                  ...(activeCategory === 'events'
                    ? styles.tabBadgeActive
                    : {}),
                }}
              >
                {eventUnread > 99
                  ? '99+'
                  : eventUnread}
              </span>
            )}
          </button>
        </div>

        {/* SECTION HEADER */}

        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              {activeCategory === 'transactions'
                ? 'Transaction activity'
                : 'Account events'}
            </h2>

            <div style={styles.sectionSubtitle}>
              {displayedNotifications.length}{' '}
              {displayedNotifications.length === 1
                ? 'notification'
                : 'notifications'}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              style={styles.actionButton}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
                style={styles.actionButton}
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
          <div role="alert" style={styles.error}>
            {error}

            <button
              type="button"
              onClick={() => loadNotifications()}
              style={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {/* CONTENT */}

        {loading ? (
          <div style={styles.loading}>
            Loading your notifications...
          </div>
        ) : displayedNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <div style={styles.notificationList}>
            {displayedNotifications.map(renderNotification)}
          </div>
        )}

        <footer style={styles.footer}>
          ZENIMONIES BANKING
        </footer>
      </main>

      {/* EVENT DETAILS */}

      {selectedEvent && (
        <div
          style={styles.overlay}
          onClick={() => setSelectedEvent(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-details-title"
            style={styles.modal}
            onClick={event => event.stopPropagation()}
          >
            <div style={styles.modalHandle} />

            <div style={styles.modalHeader}>
              <h2
                id="event-details-title"
                style={styles.modalTitle}
              >
                Notification details
              </h2>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={styles.closeButton}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div style={{
              ...styles.iconBox,
              marginBottom: 17,
            }}>
              {getIcon(selectedEvent.type)}
            </div>

            <h3 style={{
              ...styles.pageTitle,
              fontSize: 20,
            }}>
              {getDisplayTitle(selectedEvent)}
            </h3>

            <div style={styles.date}>
              {formatDate(selectedEvent.created_at)}
            </div>

            <div style={styles.divider} />

            <p style={styles.modalMessage}>
              {getDisplayMessage(selectedEvent)}
            </p>

            <div style={{
              ...styles.status,
              color: '#087C43',
              marginTop: 20,
            }}>
              <span style={styles.statusDot} />
              {selectedEvent.is_read ? 'READ' : 'UNREAD'}
            </div>

            <button
              type="button"
              style={styles.modalDone}
              onClick={() => setSelectedEvent(null)}
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default Notifications;
