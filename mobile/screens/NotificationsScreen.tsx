
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import colors from '../theme/colors';

// ======================================================
// ZENIMONIES BANKING — NOTIFICATIONS CENTRE
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

type Props = {
  token: string;
  onBack: () => void;
};

const getNotificationIcon = (type?: string) => {
  const value = String(type || '').toLowerCase();

  if (
    value.includes('success') ||
    value.includes('completed') ||
    value.includes('credit')
  ) return '✓';

  if (
    value.includes('failed') ||
    value.includes('declined') ||
    value.includes('error')
  ) return '!';

  if (
    value.includes('transfer') ||
    value.includes('payment')
  ) return '↗';

  if (
    value.includes('security') ||
    value.includes('login')
  ) return '⌑';

  return '●';
};

const getNotificationColor = (type?: string) => {
  const value = String(type || '').toLowerCase();

  if (
    value.includes('success') ||
    value.includes('completed') ||
    value.includes('credit')
  ) return colors.success;

  if (
    value.includes('failed') ||
    value.includes('declined') ||
    value.includes('error')
  ) return colors.error;

  if (
    value.includes('pending') ||
    value.includes('processing')
  ) return colors.warning;

  return colors.primary;
};

const formatNotificationDate = (
  value: string
) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function NotificationsScreen({
  token,
  onBack,
}: Props) {
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
          error.message ||
            'Please try again.'
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
  // REFRESH
  // ====================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(false);
  };

  // ====================================================
  // MARK ONE AS READ
  // ====================================================

  const handleNotificationPress = async (
    item: NotificationItem
  ) => {
    if (item.is_read || updatingId) {
      return;
    }

    setUpdatingId(item.id);

    try {
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
    } catch (error: any) {
      Alert.alert(
        'Unable to update notification',
        error.message ||
          'Please try again.'
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

      setNotifications(previous =>
        previous.map(item => ({
          ...item,
          is_read: true,
          read_at:
            item.read_at ||
            new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (error: any) {
      Alert.alert(
        'Unable to update notifications',
        error.message ||
          'Please try again.'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // ====================================================
  // NOTIFICATION ITEM
  // ====================================================

  const renderNotification = (
    item: NotificationItem
  ) => {
    const iconColor =
      getNotificationColor(item.type);

    const isUpdating =
      updatingId === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.notificationCard,
          !item.is_read && styles.unreadCard,
        ]}
        onPress={() =>
          handleNotificationPress(item)
        }
        activeOpacity={0.8}
        disabled={isUpdating}
        accessibilityRole="button"
        accessibilityLabel={
          `${item.title}. ${item.is_read ? 'Read' : 'Unread'} notification`
        }
      >
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: `${iconColor}18` },
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
            {formatNotificationDate(
              item.created_at
            )}
          </Text>

          {item.transaction_id ? (
            <Text style={styles.transactionReference}>
              Transaction: {item.transaction_id}
            </Text>
          ) : null}
        </View>

        {isUpdating ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  // ====================================================
  // SCREEN
  // ====================================================

  return (
    <SafeAreaView style={styles.container}>
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
          />
        }
      >
        <View style={styles.intro}>
          <View>
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

        <View style={styles.actionsRow}>
          <Text style={styles.sectionTitle}>
            Recent notifications
          </Text>

          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={
              unreadCount === 0 || markingAll
            }
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
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ♧
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              You're all caught up
            </Text>

            <Text style={styles.emptyMessage}>
              You don't have any notifications yet.
              We'll show your account updates here.
            </Text>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshButtonText}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map(
              renderNotification
            )}
          </View>
        )}

        <Text style={styles.footer}>
          ZENIMONIES BANKING
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
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
    backgroundColor: colors.white,
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
    marginBottom: 27,
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
    color: colors.primaryDark,
  },

  unreadLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 1,
    marginTop: 2,
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  unreadCard: {
    borderColor: colors.primaryLight,
    backgroundColor: '#FBFEFC',
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
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 9,
  },

  transactionReference: {
    fontSize: 9,
    color: colors.primaryDark,
    marginTop: 6,
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
    backgroundColor: colors.white,
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
});
