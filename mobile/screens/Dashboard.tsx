import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ======================================================
// ZENIMONIES BANKING — PERSONAL DASHBOARD
// File: mobile/screens/Dashboard.tsx
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
};

// Existing ZENIMONIES green-and-white palette.
const GREEN = '#02A339';
const DARK_GREEN = '#015027';
const DEEP_GREEN = '#005027';
const BLACK = '#101A16';
const MUTED = '#68736C';
const BACKGROUND = '#FFFFFF';
const WHITE = '#FFFFFF';
const BORDER = '#E5ECE7';
const LIGHT_GREEN = '#EAF6ED';

export default function Dashboard({
  userName = 'Customer',
  currency = 'NGN',
  balance,
  verificationLevel,
  verificationStatus = 'Pending',
  transactions = [],
  refreshing = false,
  onRefresh,
  onAction,
  onNavigate,
}: DashboardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  // Use only the customer's first name in the compact fixed header.
  const displayName =
    userName.trim().split(/\s+/)[0] || 'Customer';

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

  // Six actions arranged to match the approved feature-dashboard reference.
  const quickActions: {
    title: string;
    icon: string;
    action: DashboardAction;
  }[] = [
    { title: 'Add Money', icon: '+', action: 'add-money' },
    { title: 'To Bank', icon: '▤', action: 'transfer' },
    { title: 'Send to\\nZENIMONIES', icon: '➜', action: 'transfer' },
    { title: 'Withdraw', icon: '↓', action: 'withdraw' },
    { title: 'Airtime', icon: '▯', action: 'airtime' },
    { title: 'Data', icon: '▥', action: 'data' },
  ];

  const serviceActions: {
    title: string;
    icon: string;
    action: DashboardAction;
  }[] = [
    { title: 'Betting', icon: '◉', action: 'betting' },
    { title: 'TV', icon: '▣', action: 'tv' },
    { title: 'Bills', icon: '▤', action: 'bills' },
    { title: 'Savings', icon: '♙', action: 'savings' },
    { title: 'More', icon: '•••', action: 'bills' },
  ];

  const navigation: {
    title: TabName;
    icon: string;
  }[] = [
    { title: 'Home', icon: '⌂' },
    { title: 'Transactions', icon: '⇄' },
    { title: 'Cards', icon: '▣' },
    { title: 'Wallet', icon: '▱' },
    { title: 'Profile', icon: '◎' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.container}>
        {/* FIXED HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <View style={styles.logoCircle}>
              <View style={styles.logoInner} />
              <Text style={styles.logoText}>Z</Text>
            </View>

            <View style={styles.customerIdentity}>
              <Text style={styles.greeting}>Good day,</Text>
              <Text
                style={styles.customerName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>
              <Text style={styles.brandCaption}>DIGITAL BANKING</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => handleNavigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Text style={styles.notificationIcon}>♧</Text>
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
          {/* COMPACT ACCOUNT BALANCE — NO ACCOUNT NUMBER SHOWN */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity
                onPress={() => setBalanceVisible(!balanceVisible)}
                accessibilityRole="button"
                accessibilityLabel={
                  balanceVisible ? 'Hide balance' : 'Show balance'
                }
              >
                <Text style={styles.hideBalance}>
                  {balanceVisible ? '◉ Hide' : '◎ Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.accountType}>Personal</Text>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>{formatBalance()}</Text>
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
                <Text style={styles.sectionTitle}>Quick Actions</Text>
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
                    <Text style={styles.quickActionIconText}>
                      {item.icon}
                    </Text>
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
              <Text style={styles.sectionTitle}>Other Services</Text>
              <TouchableOpacity onPress={() => handleAction('bills')}>
                <Text style={styles.viewAll}>View all ›</Text>
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
                    <Text style={styles.serviceIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.serviceTitle}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ACCOUNT VERIFICATION */}
          <View style={styles.verificationCard}>
            <View style={styles.verificationIcon}>
              <Text style={styles.verificationIconText}>✓</Text>
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
              <Text style={styles.verificationArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* SAVINGS */}
          <TouchableOpacity
            style={styles.savingsCard}
            onPress={() => handleAction('savings')}
            activeOpacity={0.8}
          >
            <View style={styles.savingsIcon}>
              <Text style={styles.savingsIconText}>◈</Text>
            </View>
            <View style={styles.savingsContent}>
              <Text style={styles.savingsTitle}>ZENIMONIES Save</Text>
              <Text style={styles.savingsDescription}>
                Manage your savings with ease.
              </Text>
            </View>
            <Text style={styles.savingsArrow}>›</Text>
          </TouchableOpacity>

          {/* RECENT TRANSACTIONS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent transactions</Text>
              <TouchableOpacity
                onPress={() => handleNavigate('Transactions')}
              >
                <Text style={styles.viewAll}>See all ›</Text>
              </TouchableOpacity>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>◷</Text>
                </View>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptyDescription}>
                  Your recent account activities will appear here.
                </Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View
                    style={[
                      styles.transactionIcon,
                      transaction.type === 'credit'
                        ? styles.creditIcon
                        : styles.debitIcon,
                    ]}
                  >
                    <Text style={styles.transactionIconText}>
                      {transaction.type === 'credit' ? '↓' : '↑'}
                    </Text>
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
            <Text style={styles.footerBrand}>ZENIMONIES</Text>
            <Text style={styles.footerText}>Banking made simpler.</Text>
          </View>
        </ScrollView>

        {/* BOTTOM NAVIGATION */}
        <View style={styles.bottomNavigation}>
          {navigation.map((item) => {
            const active = item.title === 'Home';
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.navItem}
                onPress={() => handleNavigate(item.title)}
              >
                <Text
                  style={[
                    styles.navIcon,
                    active && styles.activeNavIcon,
                  ]}
                >
                  {item.icon}
                </Text>
                <Text
                  style={[
                    styles.navLabel,
                    active && styles.activeNavLabel,
                  ]}
                >
                  {item.title}
                </Text>
                {active && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
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
    color: MUTED,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: BLACK,
    marginTop: 2,
  },
  brandCaption: {
    color: DARK_GREEN,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  notificationIcon: {
    fontSize: 22,
    color: BLACK,
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
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_GREEN,
    borderRadius: 13,
    left: 2,
    top: 2,
    opacity: 0.96,
  },
  logoText: {
    color: WHITE,
    fontSize: 27,
    fontWeight: '900',
    fontStyle: 'italic',
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 24,
  },
  balanceCard: {
    backgroundColor: DEEP_GREEN,
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
  hideBalance: {
    color: WHITE,
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
    color: WHITE,
    fontSize: 25,
    fontWeight: '800',
  },
  currency: {
    color: WHITE,
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
    color: BLACK,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },
  viewAll: {
    color: DARK_GREEN,
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
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  quickActionIconText: {
    fontSize: 22,
    color: GREEN,
    fontWeight: '800',
  },
  quickActionTitle: {
    color: BLACK,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 11,
  },
  servicesCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
  },
  serviceItem: {
    alignItems: 'center',
    width: '19%',
  },
  serviceIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: LIGHT_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIconText: {
    color: DARK_GREEN,
    fontSize: 21,
    fontWeight: '800',
  },
  serviceTitle: {
    color: BLACK,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 7,
    textAlign: 'center',
  },
  verificationCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },
  verificationIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationIconText: {
    fontSize: 20,
    color: DARK_GREEN,
    fontWeight: '900',
  },
  verificationContent: {
    flex: 1,
    marginLeft: 11,
  },
  verificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BLACK,
  },
  verificationDescription: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },
  verificationStatus: {
    color: DARK_GREEN,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  verificationArrow: {
    fontSize: 25,
    color: DARK_GREEN,
  },
  savingsCard: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#D7EFDF',
  },
  savingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: DARK_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsIconText: {
    color: WHITE,
    fontSize: 21,
  },
  savingsContent: {
    flex: 1,
    marginLeft: 11,
  },
  savingsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BLACK,
  },
  savingsDescription: {
    fontSize: 10,
    color: MUTED,
    marginTop: 3,
  },
  savingsArrow: {
    fontSize: 25,
    color: DARK_GREEN,
  },
  emptyTransactions: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 23,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: 26,
    color: DARK_GREEN,
  },
  emptyTitle: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyDescription: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 17,
  },
  transactionItem: {
    backgroundColor: WHITE,
    padding: 12,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditIcon: {
    backgroundColor: LIGHT_GREEN,
  },
  debitIcon: {
    backgroundColor: '#FCEEEB',
  },
  transactionIconText: {
    fontSize: 20,
    fontWeight: '800',
    color: BLACK,
  },
  transactionDetails: {
    flex: 1,
    marginLeft: 11,
  },
  transactionTitle: {
    fontSize: 12,
    color: BLACK,
    fontWeight: '700',
  },
  transactionDate: {
    color: MUTED,
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
    color: DARK_GREEN,
  },
  debitText: {
    color: BLACK,
  },
  transactionStatus: {
    color: MUTED,
    fontSize: 9,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 17,
  },
  footerBrand: {
    color: DARK_GREEN,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  },
  footerText: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },
  bottomNavigation: {
    backgroundColor: WHITE,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 9,
    paddingBottom: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  navIcon: {
    fontSize: 21,
    color: MUTED,
  },
  activeNavIcon: {
    color: DARK_GREEN,
  },
  navLabel: {
    fontSize: 9,
    color: MUTED,
    marginTop: 3,
  },
  activeNavLabel: {
    color: DARK_GREEN,
    fontWeight: '800',
  },
  activeIndicator: {
    width: 18,
    height: 3,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginTop: 4,
  },
});
