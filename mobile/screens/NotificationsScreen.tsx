
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { getColors } from '../theme/colors';

// ======================================================
// ZENIMONIES BANKING — PREMIUM NOTIFICATIONS CENTRE
// Transactions / Events
// Light and Dark Theme
// File: mobile/screens/NotificationsScreen.tsx
// ======================================================

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com/api';

type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  message: string;
  transaction_id?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
};

type AnnouncementItem = {
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
};

type NotificationsResponse = {
  success: boolean;
  notifications?: NotificationItem[];
  unread_count?: number;
  message?: string;
};

type AnnouncementsResponse = {
  success: boolean;
  announcements?: AnnouncementItem[];
  message?: string;
};

type Category = 'transactions' | 'events';

type DisplayItem = {
  id: string;
  source: 'notification' | 'announcement';
  type?: string;
  title: string;
  message: string;
  transaction_id?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  priority?: string;
};

type Props = {
  token: string;
  onBack: () => void;
  onOpenTransaction: (transactionId: string) => void;
};

// ======================================================
// HELPERS
// ======================================================

const getCategory = (
  item: NotificationItem
): Category => {
  const type = String(item.type || '').toLowerCase();

  const transactionTypes = [
    'transfer',
    'payment',
    'transaction',
    'credit',
    'debit',
    'withdrawal',
    'deposit',
    'refund',
    'reversal',
  ];

  if (
    item.transaction_id ||
    transactionTypes.some(value => type.includes(value))
  ) {
    return 'transactions';
  }

  // Login, security, KYC, service and account alerts
  // belong to Events.
  return 'events';
};

const getNotificationIcon = (type?: string) => {
  const value = String(type || '').toLowerCase();

  if (
    value.includes('success') ||
    value.includes('completed') ||
    value.includes('credit')
  ) {
    return '✓';
  }

  if (
    value.includes('failed') ||
    value.includes('declined') ||
    value.includes('error')
  ) {
    return '!';
  }

  if (
    value.includes('transfer') ||
    value.includes('payment') ||
    value.includes('withdrawal') ||
    value.includes('deposit')
  ) {
    return '↗';
  }

  if (
    value.includes('security') ||
    value.includes('login') ||
    value.includes('device')
  ) {
    return '⌑';
  }

  if (
    value.includes('kyc') ||
    value.includes('verification')
  ) {
    return '✓';
  }

  if (
    value.includes('announcement') ||
    value.includes('promotion')
  ) {
    return '✦';
  }

  return '●';
};

const getNotificationColor = (
  type: string | undefined,
  palette: ReturnType<typeof getColors>
) => {
  const value = String(type || '').toLowerCase();

  if (
    value.includes('success') ||
    value.includes('completed') ||
    value.includes('credit')
  ) {
    return palette.success;
  }

  if (
    value.includes('failed') ||
    value.includes('declined') ||
    value.includes('error')
  ) {
    return palette.error;
  }

  if (
    value.includes('pending') ||
    value.includes('processing')
  ) {
    return palette.warning;
  }

  return palette.primary;
};

const formatNotificationDate = (value: string) => {
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

const getAnnouncementDate = (
  item: AnnouncementItem
) =>
  item.published_at ||
  item.scheduled_at ||
  item.created_at;

const getPriorityLabel = (priority?: string) => {
  const value = String(priority || '').toLowerCase();

  if (value === 'high' || value === 'urgent' || value === 'critical') {
    return 'IMPORTANT';
  }

  if (value === 'medium') {
    return 'UPDATE';
  }

  return 'ANNOUNCEMENT';
};

// ======================================================
// MAIN SCREEN
// ======================================================

export default function NotificationsScreen({
  token,
  onBack,
  onOpenTransaction,
}: Props) {
  const { colors, mode } = useTheme();

  const styles = createStyles(
    colors,
    mode === 'dark'
  );

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [announcements, setAnnouncements] =
    useState<AnnouncementItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [activeCategory, setActiveCategory] =
    useState<Category>('transactions');

  const [selectedEvent, setSelectedEvent] =
    useState<DisplayItem | null>(null);

  // ====================================================
  // AUTHENTICATED REQUEST
  // ====================================================

  const request = useCallback(
    async (
      path: string,
      method: 'GET' | 'PATCH' = 'GET'
    ) => {
      if (!token) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          method,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let data: any;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          'The server returned an invalid response.'
        );
      }

      if (response.status === 401) {
        throw new Error(
          'Your session may have expired. Please sign in again.'
        );
      }

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.message ||
          'Unable to complete this request.'
        );
      }

      return data;
    },
    [token]
  );

  // ====================================================
  // LOAD TRANSACTIONS AND EVENTS
  // ====================================================

  const loadNotifications = useCallback(
    async (showLoader = false) => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      try {
        const [notificationData, announcementData] =
          await Promise.all([
            request('/notifications?limit=100'),
            request('/announcements?limit=100'),
          ]);

        const notificationRows =
          Array.isArray(notificationData.notifications)
            ? notificationData.notifications
            : [];

        const announcementRows =
          Array.isArray(announcementData.announcements)
            ? announcementData.announcements
            : [];

        setNotifications(notificationRows);
        setAnnouncements(announcementRows);
      } catch (error: any) {
        Alert.alert(
          'Notifications unavailable',
          error.message || 'Please try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [request, token]
  );

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  // ====================================================
  // CATEGORY FILTERING
  // ====================================================

  const transactionNotifications = useMemo(
    () =>
      notifications.filter(
        item => getCategory(item) === 'transactions'
      ),
    [notifications]
  );

  const eventNotifications = useMemo(
    () =>
      notifications.filter(
        item => getCategory(item) === 'events'
      ),
    [notifications]
  );

  const eventItems = useMemo<DisplayItem[]>(() => {
    const regularEvents: DisplayItem[] =
      eventNotifications.map(item => ({
        ...item,
        source: 'notification',
      }));

    const adminAnnouncements: DisplayItem[] =
      announcements.map(item => ({
        id: item.id,
        source: 'announcement',
        type: 'announcement',
        title: item.title,
        message: item.message,
        is_read: item.is_read,
        created_at: getAnnouncementDate(item),
        read_at: item.read_at,
        priority: item.priority,
      }));

    return [
      ...regularEvents,
      ...adminAnnouncements,
    ].sort((a, b) => {
      const first = new Date(a.created_at).getTime();
      const second = new Date(b.created_at).getTime();

      return (
        (Number.isFinite(second) ? second : 0) -
        (Number.isFinite(first) ? first : 0)
      );
    });
  }, [eventNotifications, announcements]);

  const transactionItems = useMemo<DisplayItem[]>(
    () =>
      transactionNotifications.map(item => ({
        ...item,
        source: 'notification',
      })),
    [transactionNotifications]
  );

  const displayedNotifications =
    activeCategory === 'transactions'
      ? transactionItems
      : eventItems;

  const transactionUnread = useMemo(
    () =>
      transactionNotifications.filter(
        item => !item.is_read
      ).length,
    [transactionNotifications]
  );

  const eventUnread = useMemo(
    () =>
      eventNotifications.filter(
        item => !item.is_read
      ).length +
      announcements.filter(
        item => !item.is_read
      ).length,
    [eventNotifications, announcements]
  );

  const unreadCount =
    transactionUnread + eventUnread;

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    await loadNotifications(false);
  };

  // ====================================================
  // MARK ONE AS READ
  // ====================================================

  const markNotificationAsRead = async (
    item: DisplayItem
  ) => {
    if (item.is_read) return;

    const endpoint =
      item.source === 'announcement'
        ? `/announcements/${encodeURIComponent(item.id)}/read`
        : `/notifications/${encodeURIComponent(item.id)}/read`;

    await request(endpoint, 'PATCH');

    const now = new Date().toISOString();

    if (item.source === 'announcement') {
      setAnnouncements(previous =>
        previous.map(announcement =>
          announcement.id === item.id
            ? {
                ...announcement,
                is_read: true,
                read_at: now,
              }
            : announcement
        )
      );
    } else {
      setNotifications(previous =>
        previous.map(notification =>
          notification.id === item.id
            ? {
                ...notification,
                is_read: true,
                read_at: now,
              }
            : notification
        )
      );
    }
  };

  // ====================================================
  // VIEW NOTIFICATION
  // ====================================================

  const handleViewNotification = async (
    item: DisplayItem
  ) => {
    if (updatingId) return;

    setUpdatingId(`${item.source}:${item.id}`);

    try {
      if (!item.is_read) {
        await markNotificationAsRead(item);
      }

      if (
        item.source === 'notification' &&
        getCategory({
          id: item.id,
          type: item.type,
          title: item.title,
          message: item.message,
          transaction_id: item.transaction_id,
          is_read: item.is_read,
          created_at: item.created_at,
        }) === 'transactions' &&
        item.transaction_id
      ) {
        onOpenTransaction(
          String(item.transaction_id)
        );
      } else {
        setSelectedEvent({
          ...item,
          is_read: true,
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Unable to open notification',
        error.message || 'Please try again.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ====================================================
  // MARK ALL AS READ
  // ====================================================

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    try {
      const unreadRegular =
        notifications.filter(item => !item.is_read);

      const unreadAnnouncements =
        announcements.filter(item => !item.is_read);

      const tasks: Promise<any>[] = [];

      if (unreadRegular.length > 0) {
        tasks.push(
          request('/notifications/read-all', 'PATCH')
        );
      }

      unreadAnnouncements.forEach(item => {
        tasks.push(
          request(
            `/announcements/${encodeURIComponent(item.id)}/read`,
            'PATCH'
          )
        );
      });

      const results = await Promise.allSettled(tasks);

      const failed = results.some(
        result => result.status === 'rejected'
      );

      // Reload server state so the counters only reflect
      // records that the backend has actually marked read.
      await loadNotifications(false);

      if (failed) {
        Alert.alert(
          'Some notifications were not updated',
          'Some items could not be marked as read. Please try again.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Unable to update notifications',
        error.message || 'Please try again.'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ====================================================
  // NOTIFICATION CARD
  // ====================================================

  const renderNotification = (
    item: DisplayItem
  ) => {
    const iconColor = getNotificationColor(
      item.type,
      colors
    );

    const isUpdating =
      updatingId === `${item.source}:${item.id}`;

    const isTransaction =
      item.source === 'notification' &&
      getCategory({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        transaction_id: item.transaction_id,
        is_read: item.is_read,
        created_at: item.created_at,
      }) === 'transactions';

    return (
      <View
        key={`${item.source}:${item.id}`}
        style={[
          styles.notificationCard,
          !item.is_read && styles.unreadCard,
        ]}
      >
        <View
          style={[
            styles.brandIcon,
            {
              backgroundColor: `${iconColor}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.brandIconText,
              { color: iconColor },
            ]}
          >
            {getNotificationIcon(item.type)}
          </Text>
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeading}>
            <Text
              style={styles.notificationTitle}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {!item.is_read && (
              <View style={styles.unreadDot} />
            )}
          </View>

          {item.source === 'announcement' && (
            <View style={styles.announcementLabel}>
              <Text style={styles.announcementLabelText}>
                {getPriorityLabel(item.priority)}
              </Text>
            </View>
          )}

          <Text style={styles.notificationMessage}>
            {item.message}
          </Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottom}>
            <View style={styles.dateContainer}>
              <Text style={styles.notificationDate}>
                {formatNotificationDate(item.created_at)}
              </Text>

              <Text
                style={[
                  styles.readStatus,
                  {
                    color: item.is_read
                      ? colors.textMuted
                      : colors.primary,
                  },
                ]}
              >
                {item.is_read ? 'READ' : 'UNREAD'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() =>
                handleViewNotification(item)
              }
              disabled={Boolean(updatingId)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                isTransaction
                  ? 'View transaction'
                  : 'View event'
              }
            >
              {isUpdating ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
              ) : (
                <>
                  <Text style={styles.viewButtonText}>
                    View
                  </Text>

                  <Text style={styles.viewButtonArrow}>
                    ›
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ====================================================
  // EMPTY STATE
  // ====================================================

  const renderEmptyState = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>
          {activeCategory === 'transactions'
            ? '↗'
            : '✦'}
        </Text>
      </View>

      <Text style={styles.emptyTitle}>
        {activeCategory === 'transactions'
          ? 'No transaction updates'
          : 'No events yet'}
      </Text>

      <Text style={styles.emptyMessage}>
        {activeCategory === 'transactions'
          ? 'Your transfers, payments and other transaction notifications will appear here.'
          : 'Your announcements, login alerts, security notices and account updates will appear here.'}
      </Text>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleRefresh}
        activeOpacity={0.8}
      >
        <Text style={styles.refreshButtonText}>
          Refresh
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ====================================================
  // SCREEN
  // ====================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={
          mode === 'dark'
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={colors.surface}
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>
          <Text style={styles.headerSubtitle}>
            ZENIMONIES BANKING
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* INTRODUCTION */}

        <View style={styles.intro}>
          <View style={styles.introText}>
            <Text style={styles.pageTitle}>
              Your updates
            </Text>

            <Text style={styles.pageSubtitle}>
              Stay informed. Stay in control.
            </Text>
          </View>

          <View style={styles.unreadCounter}>
            <Text style={styles.unreadNumber}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>

            <Text style={styles.unreadLabel}>
              UNREAD
            </Text>
          </View>
        </View>

        {/* CATEGORY TABS */}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeCategory === 'transactions' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveCategory('transactions')
            }
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === 'transactions' &&
                  styles.activeTabText,
              ]}
            >
              Transactions
            </Text>

            {transactionUnread > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {transactionUnread > 99
                    ? '99+'
                    : transactionUnread}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeCategory === 'events' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveCategory('events')
            }
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === 'events' &&
                  styles.activeTabText,
              ]}
            >
              Events
            </Text>

            {eventUnread > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {eventUnread > 99
                    ? '99+'
                    : eventUnread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* NOTIFICATION ACTIONS */}

        <View style={styles.actionsRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'transactions'
                ? 'Transaction updates'
                : 'Account events'}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {displayedNotifications.length}{' '}
              {displayedNotifications.length === 1
                ? 'notification'
                : 'notifications'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAll}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            activeOpacity={0.8}
          >
            {markingAll ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
            ) : (
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 &&
                    styles.disabledText,
                ]}
              >
                Mark all as read
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* LOADING / LIST / EMPTY */}

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Loading your notifications...
            </Text>
          </View>
        ) : displayedNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.list}>
            {displayedNotifications.map(
              renderNotification
            )}
          </View>
        )}

        <Text style={styles.footer}>
          ZENIMONIES BANKING
        </Text>
      </ScrollView>

      {/* NOTIFICATION DETAILS */}

      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Notification details
                </Text>
                <Text style={styles.modalSubtitle}>
                  ZENIMONIES BANKING
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedEvent(null)}
                accessibilityRole="button"
                accessibilityLabel="Close notification details"
              >
                <Text style={styles.modalCloseText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <>
                <View style={styles.modalIcon}>
                  <Text style={styles.modalIconText}>
                    {getNotificationIcon(
                      selectedEvent.type
                    )}
                  </Text>
                </View>

                <Text style={styles.modalEventTitle}>
                  {selectedEvent.title}
                </Text>

                <Text style={styles.modalDate}>
                  {formatNotificationDate(
                    selectedEvent.created_at
                  )}
                </Text>

                {selectedEvent.source === 'announcement' && (
                  <View style={styles.announcementLabel}>
                    <Text style={styles.announcementLabelText}>
                      {getPriorityLabel(selectedEvent.priority)}
                    </Text>
                  </View>
                )}

                <View style={styles.modalDivider} />

                <Text style={styles.modalMessage}>
                  {selectedEvent.message}
                </Text>

                <View style={styles.modalStatus}>
                  <Text style={styles.modalStatusText}>
                    {selectedEvent.is_read
                      ? 'READ'
                      : 'UNREAD'}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setSelectedEvent(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ======================================================
// PREMIUM THEME-AWARE STYLES
// ======================================================

function createStyles(
  colors: ReturnType<typeof getColors>,
  isDark: boolean
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },

    header: {
      minHeight: 70,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
    },

    backArrow: {
      fontSize: 35,
      lineHeight: 39,
      color: colors.text,
      marginTop: -4,
    },

    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.text,
    },

    headerSubtitle: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: colors.textMuted,
      marginTop: 3,
    },

    headerSpacer: {
      width: 42,
    },

    content: {
      padding: 18,
      paddingBottom: 38,
    },

    intro: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 13,
      marginBottom: 23,
    },

    introText: {
      flex: 1,
    },

    pageTitle: {
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -0.6,
      color: colors.text,
    },

    pageSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 6,
    },

    unreadCounter: {
      minWidth: 67,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
    },

    unreadNumber: {
      fontSize: 19,
      fontWeight: '900',
      color: colors.primary,
    },

    unreadLabel: {
      fontSize: 8,
      fontWeight: '900',
      color: colors.primary,
      letterSpacing: 1,
      marginTop: 2,
    },

    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 15,
      padding: 5,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },

    tab: {
      flex: 1,
      minHeight: 45,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 5,
    },

    activeTab: {
      backgroundColor: colors.primary,
    },

    tabText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },

    activeTabText: {
      color: colors.white,
    },

    tabBadge: {
      minWidth: 19,
      height: 19,
      paddingHorizontal: 4,
      borderRadius: 10,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },

    tabBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.white,
    },

    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
    },

    sectionSubtitle: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
    },

    markAllText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },

    disabledText: {
      color: colors.textMuted,
    },

    list: {
      gap: 12,
    },

    notificationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 15,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    unreadCard: {
      borderColor: colors.primary,
      backgroundColor: isDark
        ? colors.surfaceSecondary
        : '#FBFEFC',
    },

    brandIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    brandIconText: {
      fontSize: 21,
      fontWeight: '900',
    },

    notificationContent: {
      flex: 1,
      minWidth: 0,
    },

    notificationHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    notificationTitle: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '900',
      color: colors.text,
      marginRight: 8,
    },

    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },

    announcementLabel: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primaryLight,
      marginTop: 8,
    },

    announcementLabelText: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: colors.primary,
    },

    notificationMessage: {
      fontSize: 11,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: 7,
    },

    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 13,
    },

    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 11,
    },

    dateContainer: {
      flex: 1,
      paddingRight: 8,
    },

    notificationDate: {
      fontSize: 9,
      lineHeight: 14,
      color: colors.textMuted,
    },

    readStatus: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
      marginTop: 5,
    },

    viewButton: {
      minWidth: 75,
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: 9,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    viewButtonText: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.white,
    },

    viewButtonArrow: {
      fontSize: 19,
      lineHeight: 21,
      color: colors.white,
      marginTop: -2,
    },

    loadingArea: {
      paddingVertical: 75,
      alignItems: 'center',
    },

    loadingText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 13,
    },

    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 25,
      paddingVertical: 35,
      marginTop: 8,
    },

    emptyIcon: {
      width: 65,
      height: 65,
      borderRadius: 33,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIconText: {
      fontSize: 29,
      fontWeight: '900',
      color: colors.primary,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
      marginTop: 18,
    },

    emptyMessage: {
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 8,
    },

    refreshButton: {
      paddingHorizontal: 25,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      marginTop: 20,
    },

    refreshButtonText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.white,
    },

    footer: {
      textAlign: 'center',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 2,
      color: colors.textMuted,
      marginTop: 30,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },

    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 23,
      paddingTop: 12,
      paddingBottom: 35,
    },

    modalHandle: {
      width: 42,
      height: 4,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },

    modalTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.text,
    },

    modalSubtitle: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.textMuted,
      marginTop: 4,
    },

    modalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCloseText: {
      fontSize: 25,
      color: colors.text,
      marginTop: -2,
    },

    modalIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },

    modalIconText: {
      fontSize: 25,
      fontWeight: '900',
      color: colors.primary,
    },

    modalEventTitle: {
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '900',
      color: colors.text,
    },

    modalDate: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
    },

    modalDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 20,
    },

    modalMessage: {
      fontSize: 13,
      lineHeight: 22,
      color: colors.textSecondary,
    },

    modalStatus: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      marginTop: 20,
    },

    modalStatusText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
      color: colors.primary,
    },

    modalDoneButton: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 25,
    },

    modalDoneText: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.white,
    },
  });
}
