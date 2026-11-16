
import React, { useState } from 'react';

import {
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../theme/ThemeContext';
import { getColors } from '../theme/colors';

// ======================================================
// ZENIMONIES BANKING — PERSONAL DASHBOARD
// Professional banking icons + Light / Dark Theme
// ======================================================

type DashboardAction =
  | 'transfer'
  | 'add-money'
  | 'withdraw'
  | 'airtime'
  | 'data'
  | 'electricity'
  | 'bills'
  | 'cards'
  | 'savings'
  | 'betting'
  | 'tv';

type TabName =
  | 'Home'
  | 'Transactions'
  | 'Cards'
  | 'Wallet'
  | 'Profile'
  | 'Settings'
  | 'Notifications';

type Transaction = {
  id: string;
  title: string;
  description?: string;
  amount: string;
  type: 'credit' | 'debit';
  date: string;
  status?: string;
};

type DashboardProps = {
  userName?: string;
  token?: string;
  currency?: 'NGN' | 'ZAR';
  balance?: string;
  accountNumber?: string;
  bankName?: string;
  verificationLevel?: string;
  verificationStatus?: string;
  transactions?: Transaction[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onAction?: (action: DashboardAction) => void;
  onNavigate?: (tab: TabName) => void;
  profilePhotoUri?: string | null;
  onProfilePhotoChange?: (uri: string) => void;
};

type IconName =
  React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function Dashboard({
  userName = 'Customer',
  token,
  currency = 'NGN',
  balance,
  verificationLevel,
  verificationStatus = 'Pending',
  transactions = [],
  refreshing = false,
  onRefresh,
  onAction,
  onNavigate,
  profilePhotoUri,
  onProfilePhotoChange,
}: DashboardProps) {
  const { colors, mode } = useTheme();

  const isDark = mode === 'dark';
  const styles = createStyles(colors, isDark);

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);

  const displayName =
    userName.trim().split(/\s+/)[0] || 'Customer';

  const GREEN = isDark ? '#20C875' : '#02A339';

  // ====================================================
  // PROFILE PHOTO UPLOAD
  // ====================================================

  const handlePhotoUpload = async () => {
    if (photoLoading) return;

    if (!token) {
      Alert.alert(
        'Session unavailable',
        'Please sign in again before changing your profile picture.'
      );
      return;
    }

    setPhotoLoading(true);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo permission required',
          'Please allow ZENIMONIES to access your photos so you can choose a profile picture.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const photo = result.assets[0];

      const formData = new FormData();

      formData.append(
        'profile_photo',
        {
          uri: photo.uri,
          name: photo.fileName || 'profile-photo.jpg',
          type: photo.mimeType || 'image/jpeg',
        } as any
      );

      const response = await fetch(
        'https://zenimonies-banking.onrender.com/api/profile/photo',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: formData,
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

      if (
        !response.ok ||
        data.success !== true ||
        typeof data.profile_photo !== 'string' ||
        !data.profile_photo.startsWith('data:image/')
      ) {
        throw new Error(
          data.message || 'Profile picture upload failed.'
        );
      }

      // Display the image returned by the backend.
      // This is the permanent database-stored image,
      // not the temporary local phone image.
      onProfilePhotoChange?.(data.profile_photo);

      Alert.alert(
        'Profile picture updated',
        'Your profile picture has been saved successfully.'
      );
    } catch (error: any) {
      Alert.alert(
        'Photo upload failed',
        error?.message ||
          'We could not upload your profile picture. Please try again.'
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  // ====================================================
  // DASHBOARD ACTIONS
  // ====================================================

  const handleAction = (action: DashboardAction) => {
    if (onAction) {
      onAction(action);
    } else {
      Alert.alert(
        'ZENIMONIES',
        'This service will be available when its screen is connected.'
      );
    }
  };

  const handleNavigate = (tab: TabName) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (tab !== 'Home') {
      Alert.alert(
        'ZENIMONIES',
        `${tab} navigation will be connected to your app navigation.`
      );
    }
  };

  const formatBalance = () => {
    if (balance === undefined || balance === null || balance === '') {
      return 'Unavailable';
    }

    return balanceVisible ? balance : '••••••••';
  };

  // ====================================================
  // QUICK ACTIONS
  // ====================================================

  const quickActions: {
    title: string;
    icon: IconName;
    action: DashboardAction;
  }[] = [
    {
      title: 'Add Money',
      icon: 'plus-circle-outline',
      action: 'add-money',
    },
    {
      title: 'To Bank',
      icon: 'bank-outline',
      action: 'transfer',
    },
    {
      title: 'Send to\nZENIMONIES',
      icon: 'send',
      action: 'transfer',
    },
    {
      title: 'Withdraw',
      icon: 'arrow-down',
      action: 'withdraw',
    },
    {
      title: 'Airtime',
      icon: 'cellphone',
      action: 'airtime',
    },
    {
      title: 'Data',
      icon: 'signal',
      action: 'data',
    },
  ];

  // ====================================================
  // OTHER SERVICES
  // ====================================================

  const serviceActions: {
    title: string;
    icon: IconName;
    action: DashboardAction;
  }[] = [
    {
      title: 'Betting',
      icon: 'soccer',
      action: 'betting',
    },
    {
      title: 'TV',
      icon: 'television',
      action: 'tv',
    },
    {
      title: 'Bills',
      icon: 'receipt-text-outline',
      action: 'bills',
    },
    {
      title: 'Savings',
      icon: 'piggy-bank-outline',
      action: 'savings',
    },
    {
      title: 'More',
      icon: 'dots-horizontal',
      action: 'bills',
    },
  ];

  // ====================================================
  // BOTTOM NAVIGATION
  // ====================================================

const navigation: {
  title: TabName;
  icon: IconName;
  activeIcon: IconName;
}[] = [
  {
    title: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    title: 'Transactions',
    icon: 'swap-horizontal',
    activeIcon: 'swap-horizontal',
  },
  {
    title: 'Cards',
    icon: 'credit-card-outline',
    activeIcon: 'credit-card',
  },
  {
    title: 'Wallet',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
  },
  {
    title: 'Profile',
    icon: 'account-circle-outline',
    activeIcon: 'account-circle',
  },
  {
    title: 'Settings',
    icon: 'cog-outline',
    activeIcon: 'cog',
  },
];

  
  // ====================================================
  // DASHBOARD UI
  // ====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <TouchableOpacity
              style={styles.logoCircle}
              onPress={handlePhotoUpload}
              activeOpacity={0.8}
              disabled={photoLoading}
              accessibilityRole="button"
              accessibilityLabel="Upload or change profile photo"
            >
              {profilePhotoUri ? (
                <Image
                  source={{ uri: profilePhotoUri }}
                  style={styles.profilePhoto}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.logoText}>Z</Text>
              )}

              {photoLoading && (
                <View style={styles.photoLoadingOverlay}>
                  <MaterialCommunityIcons
                    name="loading"
                    size={19}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.customerIdentity}>
              <Text style={styles.greeting}>Good day,</Text>

              <Text
                style={styles.customerName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>

              <Text style={styles.brandCaption}>
                DIGITAL BANKING
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => handleNavigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={23}
              color={colors.text}
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={GREEN}
                colors={[GREEN]}
              />
            ) : undefined
          }
        >
          {/* ACCOUNT BALANCE */}

          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>
                Available Balance
              </Text>

              <TouchableOpacity
                style={styles.balanceVisibility}
                onPress={() =>
                  setBalanceVisible(!balanceVisible)
                }
                accessibilityRole="button"
                accessibilityLabel={
                  balanceVisible ? 'Hide balance' : 'Show balance'
                }
              >
                <MaterialCommunityIcons
                  name={
                    balanceVisible
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={17}
                  color="#FFFFFF"
                />

                <Text style={styles.hideBalance}>
                  {balanceVisible ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.accountType}>Personal</Text>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>
                {formatBalance()}
              </Text>

              <Text style={styles.currency}>{currency}</Text>
            </View>

            <View style={styles.balanceBottomRow}>
              <View style={styles.secureDot} />

              <Text style={styles.secureText}>Secure</Text>

              <Text style={styles.balanceWatermark}>Z</Text>
            </View>
          </View>

          {/* QUICK ACTIONS */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Quick Actions
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Everything you need, in one place.
                </Text>
              </View>
            </View>

            <View style={styles.quickActionsGrid}>
              {quickActions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.title}-${index}`}
                  style={styles.quickActionItem}
                  onPress={() => handleAction(item.action)}
                  activeOpacity={0.75}
                >
                  <View style={styles.quickActionIcon}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={colors.primary}
                    />
                  </View>

                  <Text style={styles.quickActionTitle}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* OTHER SERVICES */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Other Services
              </Text>

              <TouchableOpacity
                onPress={() => handleAction('bills')}
              >
                <Text style={styles.viewAll}>
                  View all ›
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.servicesCard}>
              {serviceActions.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  style={styles.serviceItem}
                  onPress={() => handleAction(item.action)}
                  activeOpacity={0.75}
                >
                  <View style={styles.serviceIcon}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={colors.primary}
                    />
                  </View>

                  <Text style={styles.serviceTitle}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ACCOUNT VERIFICATION */}

          <View style={styles.verificationCard}>
            <View style={styles.verificationIcon}>
              <MaterialCommunityIcons
                name="shield-check"
                size={24}
                color={colors.primary}
              />
            </View>

            <View style={styles.verificationContent}>
              <Text style={styles.verificationTitle}>
                Account verification
              </Text>

              <Text style={styles.verificationDescription}>
                {verificationLevel
                  ? `Verification ${verificationLevel}`
                  : 'Complete your account verification'}
              </Text>

              <Text style={styles.verificationStatus}>
                Status: {verificationStatus}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Verification',
                  'Your KYC verification screen will open here.'
                )
              }
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={27}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* SAVINGS */}

          <TouchableOpacity
            style={styles.savingsCard}
            onPress={() => handleAction('savings')}
            activeOpacity={0.8}
          >
            <View style={styles.savingsIcon}>
              <MaterialCommunityIcons
                name="piggy-bank"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.savingsContent}>
              <Text style={styles.savingsTitle}>
                ZENIMONIES Save
              </Text>

              <Text style={styles.savingsDescription}>
                Manage your savings with ease.
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={26}
              color={colors.primary}
            />
          </TouchableOpacity>

          {/* RECENT TRANSACTIONS */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Recent transactions
              </Text>

              <TouchableOpacity
                onPress={() => handleNavigate('Transactions')}
              >
                <Text style={styles.viewAll}>
                  See all ›
                </Text>
              </TouchableOpacity>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={27}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No transactions yet
                </Text>

                <Text style={styles.emptyDescription}>
                  Your recent account activities will appear here.
                </Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((transaction) => (
                <View
                  key={transaction.id}
                  style={styles.transactionItem}
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      transaction.type === 'credit'
                        ? styles.creditIcon
                        : styles.debitIcon,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        transaction.type === 'credit'
                          ? 'arrow-down-left'
                          : 'arrow-up-right'
                      }
                      size={22}
                      color={
                        transaction.type === 'credit'
                          ? colors.success
                          : colors.text
                      }
                    />
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.title}
                    </Text>

                    <Text style={styles.transactionDate}>
                      {transaction.description || transaction.date}
                    </Text>
                  </View>

                  <View style={styles.transactionAmountContainer}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        transaction.type === 'credit'
                          ? styles.creditText
                          : styles.debitText,
                      ]}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {transaction.amount}
                    </Text>

                    <Text style={styles.transactionStatus}>
                      {transaction.status || 'Completed'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>
              ZENIMONIES
            </Text>

            <Text style={styles.footerText}>
              Banking made simpler.
            </Text>
          </View>
        </ScrollView>

        {/* BOTTOM NAVIGATION */}

        <View style={styles.bottomNavigation}>
          {navigation.map((item) => {
            const active =
              item.title === 'Home';

            return (
              <TouchableOpacity
                key={item.title}
                style={styles.navItem}
                onPress={() => handleNavigate(item.title)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <MaterialCommunityIcons
                  name={active ? item.activeIcon : item.icon}
                  size={24}
                  color={
                    active
                      ? colors.primary
                      : colors.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.navLabel,
                    active && styles.activeNavLabel,
                  ]}
                >
                  {item.title}
                </Text>

                {active && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ======================================================
// THEME-AWARE STYLES
// ======================================================

const createStyles = (
  colors: ReturnType<typeof getColors>,
  isDark: boolean
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    container: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    headerIdentity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },

    customerIdentity: {
      flex: 1,
      marginLeft: 10,
    },

    greeting: {
      fontSize: 11,
      color: colors.textSecondary,
    },

    customerName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },

    brandCaption: {
      color: colors.primary,
      fontSize: 7,
      fontWeight: '800',
      letterSpacing: 2,
      marginTop: 2,
    },

    notificationButton: {
      width: 42,
      height: 42,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    notificationDot: {
      position: 'absolute',
      top: 8,
      right: 9,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E53935',
    },

    logoCircle: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: isDark ? '#159B58' : '#02A339',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    logoText: {
      color: '#FFFFFF',
      fontSize: 27,
      fontWeight: '900',
      fontStyle: 'italic',
    },

    profilePhoto: {
      width: '100%',
      height: '100%',
    },

    photoLoadingOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 24,
    },

    balanceCard: {
      backgroundColor: isDark ? '#102D20' : '#005027',
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 15,
      paddingBottom: 14,
      marginBottom: 23,
      minHeight: 142,
      overflow: 'hidden',
    },

    balanceTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    balanceLabel: {
      color: '#E5F8EC',
      fontSize: 13,
      fontWeight: '700',
    },

    balanceVisibility: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    hideBalance: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    accountType: {
      color: '#D5EBDD',
      fontSize: 10,
      marginTop: 3,
    },

    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 7,
      gap: 8,
    },

    balanceAmount: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '800',
    },

    currency: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    balanceBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 9,
    },

    secureDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#36E477',
      marginRight: 6,
    },

    secureText: {
      color: '#E5F8EC',
      fontSize: 10,
      fontWeight: '600',
    },

    balanceWatermark: {
      position: 'absolute',
      right: 4,
      bottom: -27,
      color: 'rgba(255,255,255,0.08)',
      fontSize: 94,
      fontWeight: '900',
    },

    section: {
      marginBottom: 22,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },

    sectionSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 3,
    },

    viewAll: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },

    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 13,
    },

    quickActionItem: {
      width: '16.1%',
      minWidth: 0,
      alignItems: 'center',
    },

    quickActionIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    quickActionTitle: {
      color: colors.text,
      fontSize: 8,
      fontWeight: '700',
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 11,
    },

    servicesCard: {
      backgroundColor: colors.surface,
      borderRadius: 17,
      paddingVertical: 14,
      paddingHorizontal: 5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
    },

    serviceItem: {
      alignItems: 'center',
      width: '19%',
    },

    serviceIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },

    serviceTitle: {
      color: colors.text,
      fontSize: 9,
      fontWeight: '700',
      marginTop: 7,
      textAlign: 'center',
    },

    verificationCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    verificationIcon: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },

    verificationContent: {
      flex: 1,
      marginLeft: 11,
    },

    verificationTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },

    verificationDescription: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 3,
    },

    verificationStatus: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 3,
    },

    savingsCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#D7EFDF',
    },

    savingsIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.primaryDark,
      justifyContent: 'center',
      alignItems: 'center',
    },

    savingsContent: {
      flex: 1,
      marginLeft: 11,
    },

    savingsTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },

    savingsDescription: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 3,
    },

    emptyTransactions: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 23,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    emptyIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '800',
      marginTop: 10,
    },

    emptyDescription: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 5,
      lineHeight: 17,
    },

    transactionItem: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },

    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    creditIcon: {
      backgroundColor: colors.primaryLight,
    },

    debitIcon: {
      backgroundColor: isDark ? '#452725' : '#FCEEEB',
    },

    transactionDetails: {
      flex: 1,
      marginLeft: 11,
    },

    transactionTitle: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '700',
    },

    transactionDate: {
      color: colors.textSecondary,
      fontSize: 9,
      marginTop: 4,
    },

    transactionAmountContainer: {
      alignItems: 'flex-end',
    },

    transactionAmount: {
      fontSize: 12,
      fontWeight: '800',
    },

    creditText: {
      color: colors.success,
    },

    debitText: {
      color: colors.text,
    },

    transactionStatus: {
      color: colors.textSecondary,
      fontSize: 9,
      marginTop: 4,
    },

    footer: {
      alignItems: 'center',
      paddingVertical: 17,
    },

    footerBrand: {
      color: colors.primary,
      fontWeight: '900',
      fontSize: 14,
      letterSpacing: 2,
    },

    footerText: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 4,
    },

    bottomNavigation: {
      backgroundColor: colors.surface,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: 9,
      paddingBottom: 7,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    navItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      position: 'relative',
    },

    navLabel: {
      fontSize: 9,
      color: colors.textSecondary,
      marginTop: 3,
    },

    activeNavLabel: {
      color: colors.primary,
      fontWeight: '800',
    },

    activeIndicator: {
      width: 18,
      height: 3,
      borderRadius: 3,
      backgroundColor: isDark ? '#20C875' : '#02A339',
      marginTop: 4,
    },
  });
