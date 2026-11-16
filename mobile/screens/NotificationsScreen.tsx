
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
// ZENIMONIES BANKING — NOTIFICATIONS CENTRE
// Transactions / Events
// Light and Dark Theme
// File: mobile/screens/NotificationsScreen.tsx
// ======================================================

const API_URL =
  'https://zenimonies-banking.onrender.com/api/notifications';

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

type NotificationsResponse = {
  success: boolean;
  notifications?: NotificationItem[];
  unread_count?: number;
  message?: string;
};

type Category = 'transactions' | 'events';

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
    value.includes('payment')
  ) {
    return '↗';
  }

  if (
    value.includes('security') ||
    value.includes('login')
  ) {
    return '⌑';
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

  const [unreadCount, setUnreadCount] =
    useState(0);

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
    useState<NotificationItem | null>(null);

  // ====================================================
  // AUTHENTICATED REQUEST
  // ====================================================

  const request = useCallback(
    async (
      path: string,
      method: 'GET' | 'PATCH' = 'GET'
    ) => {
      const response = await fetch(
        `${API_URL}${path}`,
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
  // LOAD NOTIFICATIONS
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
        const data: NotificationsResponse =
          await request('?limit=100');

        const rows = Array.isArray(
          data.notifications
        )
          ? data.notifications
          : [];

        setNotifications(rows);

        setUnreadCount(
          Number(data.unread_count || 0)
        );
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

  const displayedNotifications =
    activeCategory === 'transactions'
      ? transactionNotifications
      : eventNotifications;

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
      ).length,
    [eventNotifications]
  );

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(false);
  };

  // ====================================================
  // MARK ONE AS READ
  // ====================================================

  const markNotificationAsRead = async (
    item: NotificationItem
  ) => {
    if (item.is_read) {
      return;
    }

    await request(
      `/${encodeURIComponent(item.id)}/read`,
      'PATCH'
    );

    setNotifications(previous =>
      previous.map(notification =>
        notification.id === item.id
          ? {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            }
          : notification
      )
    );

    setUnreadCount(previous =>
      Math.max(0, previous - 1)
    );
  };

  // ====================================================
  // VIEW NOTIFICATION
  // ====================================================

  const handleViewNotification = async (
    item: NotificationItem
  ) => {
    if (updatingId) {
      return;
    }

    setUpdatingId(item.id);

    try {
      if (!item.is_read) {
        await markNotificationAsRead(item);
      }

      if (getCategory(item) === 'transactions') {
        if (item.transaction_id) {
          onOpenTransaction(
            String(item.transaction_id)
          );
        } else {
          setSelectedEvent(item);
        }
      } else {
        setSelectedEvent(item);
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
    if (unreadCount === 0 || markingAll) {
      return;
    }

    setMarkingAll(true);

    try {
      await request('/read-all', 'PATCH');

      const now = new Date().toISOString();

      setNotifications(previous =>
        previous.map(item => ({
          ...item,
          is_read: true,
          read_at: item.read_at || now,
        }))
      );

      setUnreadCount(0);
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
    item: NotificationItem
  ) => {
    const iconColor = getNotificationColor(
      item.type,
      colors
    );

    const isUpdating =
      updatingId === item.id;

    const isTransaction =
      getCategory(item) === 'transactions';

    return (
      <View
        key={item.id}
        style={[
          styles.notificationCard,
          !item.is_read && styles.unreadCard,
        ]}
      >
        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor: `${iconColor}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.notificationIconText,
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

          <Text style={styles.notificationMessage}>
            {item.message}
          </Text>

          <Text style={styles.notificationDate}>
            {formatNotificationDate(item.created_at)}
          </Text>

          <View style={styles.cardBottom}>
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
            : '●'}
        </Text>
      </View>

      <Text style={styles.emptyTitle}>
        {activeCategory === 'transactions'
          ? 'No transaction updates'
          : 'No events yet'}
      </Text>

      <Text style={styles.emptyMessage}>
        {activeCategory === 'transactions'
          ? 'Your payment and transaction notifications will appear here.'
          : 'Your account, security and service updates will appear here.'}
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
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Notifications
        </Text>

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
              Stay informed about your account.
            </Text>
          </View>

          <View style={styles.unreadCounter}>
            <Text style={styles.unreadNumber}>
              {unreadCount > 99
                ? '99+'
                : unreadCount}
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
            activeOpacity={0.8}
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
            activeOpacity={0.8}
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
            disabled={
              unreadCount === 0 || markingAll
            }
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
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

        {/* FOOTER */}

        <Text style={styles.footer}>
          ZENIMONIES BANKING
        </Text>
      </ScrollView>

      {/* EVENT DETAILS */}

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
              <Text style={styles.modalTitle}>
                Notification details
              </Text>

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
// THEME-AWARE STYLES
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
      minHeight: 66,
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
      borderRadius: 21,
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

    headerTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.text,
    },

    headerSpacer: {
      width: 42,
    },

    content: {
      padding: 19,
      paddingBottom: 35,
    },

    intro: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      marginBottom: 24,
    },

    introText: {
      flex: 1,
    },

    pageTitle: {
      fontSize: 25,
      fontWeight: '900',
      color: colors.text,
    },

    pageSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 6,
    },

    unreadCounter: {
      minWidth: 65,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 13,
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
      borderRadius: 14,
      padding: 5,
      marginBottom: 23,
      borderWidth: 1,
      borderColor: colors.border,
    },

    tab: {
      flex: 1,
      minHeight: 43,
      borderRadius: 10,
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
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
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
      marginBottom: 14,
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
      gap: 11,
    },

    notificationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 15,
      borderRadius: 16,
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

    notificationIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    notificationIconText: {
      fontSize: 21,
      fontWeight: '900',
    },

    notificationContent: {
      flex: 1,
    },

    notificationHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    notificationTitle: {
      flex: 1,
      fontSize: 13,
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

    notificationMessage: {
      fontSize: 11,
      lineHeight: 17,
      color: colors.textSecondary,
      marginTop: 6,
    },

    notificationDate: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 9,
    },

    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },

    readStatus: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
    },

    viewButton: {
      minWidth: 75,
      minHeight: 33,
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
