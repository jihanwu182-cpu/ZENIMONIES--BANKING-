
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ============================================================
// TYPES
// ============================================================

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

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority?: string;
  audience_type?: string;
  is_read: boolean;
  created_at: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  read_at?: string | null;
}

type Category = 'transactions' | 'events';

type EventItem = {
  id: string;
  source: 'notification' | 'announcement';
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  priority?: string;
};

const API_ROOT =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const API_BASE_URL = API_ROOT.endsWith('/api')
  ? API_ROOT
  : `${API_ROOT}/api`;

// ============================================================
// DESIGN SYSTEM
// ============================================================

const GREEN = '#087C43';
const DARK_GREEN = '#063B2D';
const TEXT = '#17382A';
const MUTED = '#738178';
const BORDER = '#E5ECE7';
const BACKGROUND = '#F5F8F6';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: BACKGROUND,
    color: TEXT,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 45,
  },

  header: {
    background: '#FFFFFF',
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  headerInner: {
    width: 'min(1050px, 94%)',
    minHeight: 68,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  brandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },

  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: `linear-gradient(135deg, #079B50, ${GREEN})`,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 900,
  },

  brandName: {
    color: DARK_GREEN,
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 0.3,
  },

  brandSubtitle: {
    color: '#87958D',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.5,
    marginTop: 2,
  },

  dashboardButton: {
    border: `1px solid #DCE9E1`,
    background: '#F5FAF7',
    color: GREEN,
    borderRadius: 10,
    padding: '9px 13px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },

  main: {
    width: 'min(760px, 94%)',
    margin: '0 auto',
    paddingTop: 22,
  },

  backButton: {
    border: 0,
    background: 'transparent',
    color: MUTED,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    padding: '7px 0',
    marginBottom: 13,
  },

  hero: {
    background: 'linear-gradient(135deg, #FFFFFF, #F0FAF4)',
    border: `1px solid #DFEBE3`,
    borderRadius: 19,
    padding: '21px 19px',
    marginBottom: 17,
    boxShadow: '0 5px 20px rgba(24,65,44,0.035)',
  },

  heroTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  eyebrow: {
    color: GREEN,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  pageTitle: {
    color: DARK_GREEN,
    fontSize: 'clamp(22px, 5vw, 28px)',
    fontWeight: 900,
    letterSpacing: -0.7,
    margin: 0,
  },

  pageDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 1.6,
    margin: '7px 0 0',
    maxWidth: 440,
  },

  unreadBox: {
    minWidth: 65,
    background: '#E5F5EC',
    border: '1px solid #D3EBDD',
    borderRadius: 13,
    padding: '10px 8px',
    textAlign: 'center',
  },

  unreadNumber: {
    color: GREEN,
    fontSize: 23,
    fontWeight: 900,
    lineHeight: 1.2,
  },

  unreadLabel: {
    color: '#39825D',
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
    marginTop: 3,
  },

  tabs: {
    display: 'flex',
    gap: 5,
    padding: 4,
    background: '#E9F0EB',
    border: `1px solid #DCE8E0`,
    borderRadius: 13,
    marginBottom: 21,
  },

  tab: {
    flex: 1,
    minHeight: 43,
    border: 0,
    borderRadius: 10,
    background: 'transparent',
    color: '#65766C',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  activeTab: {
    background: GREEN,
    color: '#FFFFFF',
    boxShadow: '0 3px 10px rgba(8,124,67,0.17)',
  },

  tabBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 20,
    padding: '0 5px',
    background: '#DDF2E5',
    color: GREEN,
    fontSize: 10,
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBadgeActive: {
    background: '#FFFFFF',
    color: GREEN,
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: 900,
    margin: 0,
  },

  sectionSubtitle: {
    color: '#89968E',
    fontSize: 10,
    marginTop: 4,
  },

  actionButton: {
    border: `1px solid #D5E8DC`,
    background: '#FFFFFF',
    color: GREEN,
    borderRadius: 9,
    padding: '8px 10px',
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },

  card: {
    background: '#FFFFFF',
    border: `1px solid ${BORDER}`,
    borderRadius: 15,
    padding: '14px 14px 12px',
    boxShadow: '0 3px 12px rgba(26,61,47,0.025)',
  },

  unreadCard: {
    borderColor: '#BBDDC9',
    background: '#FCFFFD',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 11,
  },

  iconBox: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 13,
    background: '#E8F6EE',
    color: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    fontWeight: 900,
  },

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  heading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  cardTitle: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 900,
    margin: 0,
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#079447',
    flexShrink: 0,
  },

  message: {
    color: '#687970',
    fontSize: 11,
    lineHeight: 1.65,
    margin: '5px 0 0',
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },

  amount: {
    color: GREEN,
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: -0.3,
    marginTop: 5,
  },

  date: {
    color: '#929E96',
    fontSize: 9,
    marginTop: 7,
  },

  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    borderTop: '1px solid #EDF1EE',
    marginTop: 11,
    paddingTop: 10,
  },

  status: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: '#89968E',
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 0.8,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#AAB5AE',
  },

  viewButton: {
    border: 0,
    borderRadius: 9,
    background: GREEN,
    color: '#FFFFFF',
    padding: '9px 12px',
    fontSize: 10,
    fontWeight: 900,
    cursor: 'pointer',
  },

  markReadButton: {
    border: 0,
    background: 'transparent',
    color: '#74877A',
    fontSize: 9,
    fontWeight: 800,
    cursor: 'pointer',
    padding: 5,
  },

  priority: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 20,
    padding: '4px 8px',
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  empty: {
    background: '#FFFFFF',
    border: `1px solid ${BORDER}`,
    borderRadius: 17,
    padding: '42px 18px',
    textAlign: 'center',
  },

  emptyIcon: {
    width: 57,
    height: 57,
    margin: '0 auto 14px',
    borderRadius: 17,
    background: '#E8F6EE',
    color: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: 900,
    margin: 0,
  },

  emptyMessage: {
    maxWidth: 340,
    margin: '8px auto 0',
    color: MUTED,
    fontSize: 11,
    lineHeight: 1.7,
  },

  loading: {
    background: '#FFFFFF',
    border: `1px solid ${BORDER}`,
    borderRadius: 15,
    padding: 35,
    textAlign: 'center',
    color: MUTED,
    fontSize: 12,
  },

  error: {
    background: '#FFF5F5',
    border: '1px solid #F2CACA',
    color: '#B42318',
    borderRadius: 11,
    padding: 12,
    marginBottom: 13,
    fontSize: 11,
    lineHeight: 1.6,
  },

  retryButton: {
    border: 0,
    background: 'transparent',
    color: '#B42318',
    textDecoration: 'underline',
    fontWeight: 800,
    cursor: 'pointer',
    marginLeft: 7,
  },

  footer: {
    textAlign: 'center',
    color: '#A0ACA4',
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.7,
    marginTop: 30,
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(8,28,19,0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 10,
  },

  modal: {
    width: 'min(520px, 100%)',
    maxHeight: '85vh',
    overflowY: 'auto',
    background: '#FFFFFF',
    borderRadius: '21px 21px 15px 15px',
    padding: 21,
    boxShadow: '0 20px 70px rgba(0,0,0,0.2)',
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 10,
    background: '#DCE5DF',
    margin: '0 auto 19px',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 19,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: 900,
    margin: 0,
  },

  closeButton: {
    width: 33,
    height: 33,
    border: 0,
    borderRadius: 50,
    background: '#F0F5F1',
    color: '#52665A',
    fontSize: 20,
    cursor: 'pointer',
  },

  modalMessage: {
    color: '#65766C',
    fontSize: 12,
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },

  modalDone: {
    width: '100%',
    minHeight: 45,
    border: 0,
    borderRadius: 11,
    background: GREEN,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 900,
    marginTop: 21,
    cursor: 'pointer',
  },
};

// ============================================================
// HELPERS
// ============================================================

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
    return '◆';
  }

  if (
    value.includes('kyc') ||
    value.includes('verified')
  ) {
    return '✓';
  }

  if (
    value.includes('account_status') ||
    value.includes('suspended') ||
    value.includes('blocked')
  ) {
    return '!';
  }

  if (
    value.includes('announcement') ||
    value.includes('event')
  ) {
    return '◈';
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
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getAmount = (message: string) => {
  const match = String(message || '').match(
    /(?:₦|NGN)\s?[\d,]+(?:\.\d{1,2})?/
  );

  return match ? match[0] : null;
};

const getPriorityStyle = (priority?: string) => {
  const value = String(priority || 'normal').toLowerCase();

  if (value === 'urgent') {
    return {
      background: '#FDECEC',
      color: '#B42318',
    };
  }

  if (value === 'important') {
    return {
      background: '#FFF4DC',
      color: '#996515',
    };
  }

  return {
    background: '#E8F6EE',
    color: GREEN,
  };
};

// ============================================================
// COMPONENT
// ============================================================

const Notifications: React.FC = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [announcements, setAnnouncements] =
    useState<AnnouncementItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [markingAll, setMarkingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] =
    useState<Category>('transactions');

  const [selectedEvent, setSelectedEvent] =
    useState<EventItem | null>(null);

  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

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
  // LOAD BOTH DATA SOURCES
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

      const [notificationResponse, announcementResponse] =
        await Promise.all([
          axios.get(
            `${API_BASE_URL}/notifications?limit=100`,
            { headers: getHeaders() }
          ),

          axios.get(
            `${API_BASE_URL}/announcements?limit=100`,
            { headers: getHeaders() }
          ),
        ]);

      if (!notificationResponse.data?.success) {
        throw new Error(
          notificationResponse.data?.message ||
          'Unable to load notifications.'
        );
      }

      if (!announcementResponse.data?.success) {
        throw new Error(
          announcementResponse.data?.message ||
          'Unable to load announcements.'
        );
      }

      setNotifications(
        Array.isArray(notificationResponse.data.notifications)
          ? notificationResponse.data.notifications
          : []
      );

      setAnnouncements(
        Array.isArray(announcementResponse.data.announcements)
          ? announcementResponse.data.announcements
          : []
      );

    } catch (err) {
      console.error(
        'Failed to load notification centre:',
        err
      );

      if (
        axios.isAxiosError(err) &&
        err.response?.status === 401
      ) {
        navigate('/login', { replace: true });
        return;
      }

      setError(
        'Unable to load your notification centre. Please try again.'
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

  const accountNotifications = useMemo(
    () => notifications.filter(
      item => !isTransactionNotification(item)
    ),
    [notifications]
  );

  const eventItems = useMemo<EventItem[]>(() => {
    const accountEvents: EventItem[] =
      accountNotifications.map(item => ({
        id: item.id,
        source: 'notification',
        type: item.type,
        title: item.title,
        message: item.message,
        is_read: item.is_read,
        created_at: item.created_at,
        read_at: item.read_at,
      }));

    const announcementEvents: EventItem[] =
      announcements.map(item => ({
        id: item.id,
        source: 'announcement',
        type: 'announcement',
        title: item.title,
        message: item.message,
        is_read: item.is_read,
        created_at:
          item.published_at ||
          item.scheduled_at ||
          item.created_at,
        read_at: item.read_at,
        priority: item.priority,
      }));

    return [
      ...accountEvents,
      ...announcementEvents,
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }, [accountNotifications, announcements]);

  const displayedNotifications =
    activeCategory === 'transactions'
      ? transactionNotifications
      : eventItems;

  const transactionUnread =
    transactionNotifications.filter(
      item => !item.is_read
    ).length;

  const eventUnread =
    eventItems.filter(
      item => !item.is_read
    ).length;

  const unreadCount =
    transactionUnread + eventUnread;

  // ----------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(false);
  };

  // ----------------------------------------------------------
  // MARK ONE NOTIFICATION AS READ
  // ----------------------------------------------------------

  const markNotificationAsRead = async (id: string) => {
    const item = notifications.find(
      notification => notification.id === id
    );

    if (!item || item.is_read) {
      return;
    }

    const response = await axios.patch(
      `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
      {},
      { headers: getHeaders() }
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
        'Unable to update notification.'
      );
    }

    const readAt =
      response.data.notification?.read_at ||
      new Date().toISOString();

    setNotifications(current =>
      current.map(notification =>
        notification.id === id
          ? {
              ...notification,
              is_read: true,
              read_at: readAt,
            }
          : notification
      )
    );

    setSelectedEvent(current =>
      current?.id === id &&
      current.source === 'notification'
        ? {
            ...current,
            is_read: true,
            read_at: readAt,
          }
        : current
    );
  };

  // ----------------------------------------------------------
  // MARK ONE ANNOUNCEMENT AS READ
  // ----------------------------------------------------------

  const markAnnouncementAsRead = async (id: string) => {
    const item = announcements.find(
      announcement => announcement.id === id
    );

    if (!item || item.is_read) {
      return;
    }

    const response = await axios.patch(
      `${API_BASE_URL}/announcements/${encodeURIComponent(id)}/read`,
      {},
      { headers: getHeaders() }
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
        'Unable to mark announcement as read.'
      );
    }

    const readAt =
      response.data.read_at ||
      new Date().toISOString();

    setAnnouncements(current =>
      current.map(announcement =>
        announcement.id === id
          ? {
              ...announcement,
              is_read: true,
              read_at: readAt,
            }
          : announcement
      )
    );

    setSelectedEvent(current =>
      current?.id === id &&
      current.source === 'announcement'
        ? {
            ...current,
            is_read: true,
            read_at: readAt,
          }
        : current
    );
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
      setError('');

      const unreadNotifications =
        notifications.filter(item => !item.is_read);

      const unreadAnnouncements =
        announcements.filter(item => !item.is_read);

      const requests: Promise<unknown>[] = [];

      if (unreadNotifications.length > 0) {
        requests.push(
          axios.patch(
            `${API_BASE_URL}/notifications/read-all`,
            {},
            { headers: getHeaders() }
          )
        );
      }

      for (const announcement of unreadAnnouncements) {
        requests.push(
          axios.patch(
            `${API_BASE_URL}/announcements/${encodeURIComponent(announcement.id)}/read`,
            {},
            { headers: getHeaders() }
          )
        );
      }

      await Promise.all(requests);

      const now = new Date().toISOString();

      setNotifications(current =>
        current.map(item => ({
          ...item,
          is_read: true,
          read_at: item.read_at || now,
        }))
      );

      setAnnouncements(current =>
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

    } catch (err) {
      console.error(
        'Failed to mark all items as read:',
        err
      );

      setError(
        'Some items could not be marked as read. Please refresh and try again.'
      );

      await loadNotifications(false);

    } finally {
      setMarkingAll(false);
    }
  };

  // ----------------------------------------------------------
  // OPEN TRANSACTION
  // ----------------------------------------------------------

  const openTransaction = async (
    item: NotificationItem
  ) => {
    if (!item.transaction_id) {
      setError(
        'This transaction does not have a linked receipt yet. Please contact support if you need assistance.'
      );
      return;
    }

    await markNotificationAsRead(item.id);

    navigate(
      `/transactions/${encodeURIComponent(item.transaction_id)}/receipt`
    );
  };

  // ----------------------------------------------------------
  // OPEN EVENT
  // ----------------------------------------------------------

  const openEvent = async (item: EventItem) => {
    if (item.source === 'notification') {
      await markNotificationAsRead(item.id);
    } else {
      await markAnnouncementAsRead(item.id);
    }

    setSelectedEvent({
      ...item,
      is_read: true,
    });
  };

  // ----------------------------------------------------------
  // SAFE ACTION WRAPPER
  // ----------------------------------------------------------

  const handleOpen = async (
    id: string,
    action: () => Promise<void>
  ) => {
    if (updatingId) {
      return;
    }

    try {
      setUpdatingId(id);
      setError('');
      await action();
    } catch (err) {
      console.error('Notification action failed:', err);

      setError(
        'Unable to open this item. Please try again.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ----------------------------------------------------------
  // MARK SINGLE ITEM READ
  // ----------------------------------------------------------

  const handleMarkSingleRead = async (
    item: EventItem
  ) => {
    try {
      setUpdatingId(item.id);

      if (item.source === 'notification') {
        await markNotificationAsRead(item.id);
      } else {
        await markAnnouncementAsRead(item.id);
      }

    } catch (err) {
      console.error('Mark as read failed:', err);
      setError('Unable to mark this item as read.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ----------------------------------------------------------
  // TRANSACTION CARD
  // ----------------------------------------------------------

  const renderTransaction = (item: NotificationItem) => {
    const amount = getAmount(item.message);

    const title =
      item.title || 'Transaction update';

    const message = amount
      ? item.message.replace(amount, '').trim()
      : item.message;

    return (
      <article
        key={item.id}
        style={{
          ...styles.card,
          ...(item.is_read ? {} : styles.unreadCard),
        }}
      >
        <div style={styles.cardTop}>
          <div style={styles.iconBox}>
            {getIcon(item.type)}
          </div>

          <div style={styles.cardContent}>
            <div style={styles.heading}>
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

            {amount && (
              <div style={styles.amount}>
                {amount}
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

        <div style={styles.cardBottom}>
          <div style={styles.status}>
            <span
              style={{
                ...styles.statusDot,
                background: item.is_read
                  ? '#AAB5AE'
                  : '#079447',
              }}
            />

            {item.is_read ? 'READ' : 'NEW'}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}>
            {!item.is_read && (
              <button
                type="button"
                style={styles.markReadButton}
                onClick={() =>
                  handleMarkSingleRead({
                    id: item.id,
                    source: 'notification',
                    type: item.type,
                    title: item.title,
                    message: item.message,
                    is_read: item.is_read,
                    created_at: item.created_at,
                  })
                }
              >
                Mark read
              </button>
            )}

            <button
              type="button"
              style={styles.viewButton}
              disabled={Boolean(updatingId)}
              onClick={() =>
                handleOpen(
                  item.id,
                  () => openTransaction(item)
                )
              }
            >
              {updatingId === item.id
                ? 'Opening...'
                : 'View receipt'}
              {' ›'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  // ----------------------------------------------------------
  // EVENT CARD
  // ----------------------------------------------------------

  const renderEvent = (item: EventItem) => {
    const priority = getPriorityStyle(item.priority);

    return (
      <article
        key={`${item.source}-${item.id}`}
        style={{
          ...styles.card,
          ...(item.is_read ? {} : styles.unreadCard),
        }}
      >
        <div style={styles.cardTop}>
          <div style={styles.iconBox}>
            {getIcon(item.type)}
          </div>

          <div style={styles.cardContent}>
            <div style={styles.heading}>
              <h3 style={styles.cardTitle}>
                {item.title || 'Account update'}
              </h3>

              {!item.is_read && (
                <span
                  style={styles.unreadDot}
                  aria-label="Unread"
                />
              )}
            </div>

            {item.source === 'announcement' && (
              <span
                style={{
                  ...styles.priority,
                  ...priority,
                }}
              >
                {item.priority || 'Normal'} announcement
              </span>
            )}

            <p style={styles.message}>
              {item.message}
            </p>

            <div style={styles.date}>
              {formatDate(item.created_at)}
            </div>
          </div>
        </div>

        <div style={styles.cardBottom}>
          <div style={styles.status}>
            <span
              style={{
                ...styles.statusDot,
                background: item.is_read
                  ? '#AAB5AE'
                  : '#079447',
              }}
            />

            {item.is_read ? 'READ' : 'NEW'}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}>
            {!item.is_read && (
              <button
                type="button"
                style={styles.markReadButton}
                onClick={() =>
                  handleMarkSingleRead(item)
                }
              >
                Mark read
              </button>
            )}

            <button
              type="button"
              style={styles.viewButton}
              disabled={Boolean(updatingId)}
              onClick={() =>
                handleOpen(
                  item.id,
                  () => openEvent(item)
                )
              }
            >
              {updatingId === item.id
                ? 'Opening...'
                : 'View details'}
              {' ›'}
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
        {activeCategory === 'transactions' ? '↙' : '◈'}
      </div>

      <h2 style={styles.emptyTitle}>
        {activeCategory === 'transactions'
          ? 'No transaction updates'
          : 'You are all caught up'}
      </h2>

      <p style={styles.emptyMessage}>
        {activeCategory === 'transactions'
          ? 'Your transfers, payments and other transaction updates will appear here.'
          : 'Your KYC results, account updates, security alerts and administrator announcements will appear here.'}
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
                Your transactions, account updates and important announcements in one place.
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
                ? 'item'
                : 'items'}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: 6,
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
                  : 'Read all'}
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
            Loading your notification centre...
          </div>
        ) : displayedNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <div style={styles.list}>
            {activeCategory === 'transactions'
              ? transactionNotifications.map(renderTransaction)
              : eventItems.map(renderEvent)}
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
                {selectedEvent.source === 'announcement'
                  ? 'Announcement'
                  : 'Account notification'}
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
              marginBottom: 15,
            }}>
              {getIcon(selectedEvent.type)}
            </div>

            <h3 style={{
              ...styles.pageTitle,
              fontSize: 19,
            }}>
              {selectedEvent.title}
            </h3>

            {selectedEvent.priority && (
              <span
                style={{
                  ...styles.priority,
                  ...getPriorityStyle(selectedEvent.priority),
                }}
              >
                {selectedEvent.priority}
              </span>
            )}

            <div style={styles.date}>
              {formatDate(selectedEvent.created_at)}
            </div>

            <div style={{
              borderTop: '1px solid #EDF1EE',
              margin: '15px 0',
            }} />

            <p style={styles.modalMessage}>
              {selectedEvent.message}
            </p>

            <div style={{
              ...styles.status,
              color: GREEN,
              marginTop: 17,
            }}>
              <span
                style={{
                  ...styles.statusDot,
                  background: GREEN,
                }}
              />
              READ
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
