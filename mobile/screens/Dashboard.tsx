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
  | 'savings';

type TabName =
  | 'Home'
  | 'Cards'
  | 'Payments'
  | 'History'
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

// ZENIMONIES official green-and-white palette, matched to supplied artwork.
const GREEN = '#00B83F';
const DARK_GREEN = '#005E2F';
const DEEP_GREEN = '#003F25';
const BLACK = '#101A16';
const MUTED = '#68736C';
const BACKGROUND = '#FFFFFF';
const WHITE = '#FFFFFF';
const BORDER = '#E5ECE7';
const LIGHT_GREEN = '#EAF8EF';

export default function Dashboard({
  userName = 'Customer',
  currency = 'NGN',
  balance,
  accountNumber,
  bankName = 'ZENIMONIES',
  verificationLevel,
  verificationStatus = 'Pending',
  transactions = [],
  refreshing = false,
  onRefresh,
  onAction,
  onNavigate,
}: DashboardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  // Display the customer's full registered name in the fixed header.
  const displayName = userName.trim() || 'Customer';

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

  const quickActions: {
    title: string;
    icon: string;
    action: DashboardAction;
  }[] = [
    { title: 'Transfer', icon: '↗', action: 'transfer' },
    { title: 'Add Money', icon: '+', action: 'add-money' },
    { title: 'Withdraw', icon: '↓', action: 'withdraw' },
    { title: 'Pay Bills', icon: '▤', action: 'bills' },
  ];

  const paymentActions: {
    title: string;
    icon: string;
    action: DashboardAction;
  }[] = [
    { title: 'Airtime', icon: '▣', action: 'airtime' },
    { title: 'Data', icon: '◉', action: 'data' },
    { title: 'Electricity', icon: 'ϟ', action: 'electricity' },
    { title: 'More', icon: '•••', action: 'bills' },
  ];

  const navigation: {
    title: TabName;
    icon: string;
  }[] = [
    { title: 'Home', icon: '⌂' },
    { title: 'Cards', icon: '▣' },
    { title: 'Payments', icon: '⇄' },
    { title: 'History', icon: '◷' },
    { title: 'Profile', icon: '◎' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.container}>
        {/* FIXED BRAND HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <View style={styles.logoCircle}>
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
          {/* ACCOUNT BALANCE */}

          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>
                Total account balance
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setBalanceVisible(!balanceVisible)
                }
                accessibilityRole="button"
                accessibilityLabel={
                  balanceVisible ? 'Hide balance' : 'Show balance'
                }
              >
                <Text style={styles.hideBalance}>
                  {balanceVisible ? 'Hide  ◉' : 'Show  ◎'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>
                {formatBalance()}
              </Text>

              <Text style={styles.currency}>
                {currency}
              </Text>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.accountRow}>
              <View>
                <Text style={styles.accountLabel}>
                  Account number
                </Text>

                <Text style={styles.accountNumber}>
                  {accountNumber || 'Not yet assigned'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.accountDetailsButton}
                onPress={() =>
                  Alert.alert(
                    'Account details',
                    `Bank: ${bankName}\nAccount: ${
                      accountNumber || 'Not yet assigned'
                    }`
                  )
                }
              >
                <Text style={styles.accountDetailsText}>
                  Details
                </Text>

                <Text style={styles.detailsArrow}>
                  ›
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* QUICK ACTIONS */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Quick actions
              </Text>

              <Text style={styles.sectionSubtitle}>
                Manage your money
              </Text>
            </View>

            <View style={styles.actionGrid}>
              {quickActions.map((item) => (
                <TouchableOpacity
                  key={item.action}
                  style={styles.actionItem}
                  onPress={() => handleAction(item.action)}
                  activeOpacity={0.75}
                >
                  <View style={styles.actionIcon}>
                    <Text style={styles.actionIconText}>
                      {item.icon}
                    </Text>
                  </View>

                  <Text style={styles.actionTitle}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* PAYMENT SERVICES */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Payments & Services
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
              {paymentActions.map((item) => (
                <TouchableOpacity
                  key={item.action}
                  style={styles.serviceItem}
                  onPress={() => handleAction(item.action)}
                >
                  <View style={styles.serviceIcon}>
                    <Text style={styles.serviceIconText}>
                      {item.icon}
                    </Text>
                  </View>

                  <Text style={styles.serviceTitle}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* VERIFICATION */}

          <View style={styles.verificationCard}>
            <View style={styles.verificationIcon}>
              <Text style={styles.verificationIconText}>
                ✓
              </Text>
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
              <Text style={styles.verificationArrow}>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* SAVINGS */}

          <TouchableOpacity
            style={styles.savingsCard}
            onPress={() => handleAction('savings')}
            activeOpacity={0.8}
          >
            <View style={styles.savingsIcon}>
              <Text style={styles.savingsIconText}>
                ◈
              </Text>
            </View>

            <View style={styles.savingsContent}>
              <Text style={styles.savingsTitle}>
                ZENIMONIES Save
              </Text>

              <Text style={styles.savingsDescription}>
                Manage your savings with ease.
              </Text>
            </View>

            <Text style={styles.savingsArrow}>
              ›
            </Text>
          </TouchableOpacity>

          {/* RECENT TRANSACTIONS */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Recent transactions
              </Text>

              <TouchableOpacity
                onPress={() => handleNavigate('History')}
              >
                <Text style={styles.viewAll}>
                  See all ›
                </Text>
              </TouchableOpacity>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>
                    ◷
                  </Text>
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

  // Fixed at the top while dashboard content scrolls.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
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
    marginLeft: 11,
  },

  greeting: {
    fontSize: 12,
    color: MUTED,
  },

  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: BLACK,
    marginTop: 2,
  },

  brandCaption: {
    color: DARK_GREEN,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginTop: 3,
  },

  notificationButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  notificationIcon: {
    fontSize: 23,
    color: BLACK,
  },

  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },

  // Approximation of the supplied green Z brand mark using native views.
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: DARK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GREEN,
  },

  logoText: {
    color: WHITE,
    fontSize: 29,
    fontWeight: '900',
    fontStyle: 'italic',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 25,
  },

  balanceCard: {
    backgroundColor: DEEP_GREEN,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: DARK_GREEN,
  },

  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  balanceLabel: {
    color: '#E5F8EC',
    fontSize: 14,
    fontWeight: '700',
  },

  hideBalance: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 10,
  },

  balanceAmount: {
    color: WHITE,
    fontSize: 32,
    fontWeight: '800',
  },

  currency: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 20,
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accountLabel: {
    color: '#D5EBDD',
    fontSize: 12,
  },

  accountNumber: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 5,
  },

  accountDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  accountDetailsText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },

  detailsArrow: {
    color: WHITE,
    fontSize: 20,
    marginLeft: 6,
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  sectionTitle: {
    color: BLACK,
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
  },

  viewAll: {
    color: DARK_GREEN,
    fontSize: 13,
    fontWeight: '700',
  },

  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  actionItem: {
    alignItems: 'center',
    width: '23%',
  },

  actionIcon: {
    width: 59,
    height: 59,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  actionIconText: {
    fontSize: 25,
    color: DARK_GREEN,
    fontWeight: '700',
  },

  actionTitle: {
    color: BLACK,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 9,
    textAlign: 'center',
  },

  servicesCard: {
    backgroundColor: WHITE,
    borderRadius: 19,
    paddingVertical: 19,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: BORDER,
  },

  serviceItem: {
    alignItems: 'center',
    width: '24%',
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: LIGHT_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },

  serviceIconText: {
    color: DARK_GREEN,
    fontSize: 22,
    fontWeight: '800',
  },

  serviceTitle: {
    color: BLACK,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 9,
  },

  verificationCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
    borderWidth: 1,
    borderColor: BORDER,
  },

  verificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  verificationIconText: {
    fontSize: 21,
    color: DARK_GREEN,
    fontWeight: '900',
  },

  verificationContent: {
    flex: 1,
    marginLeft: 12,
  },

  verificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLACK,
  },

  verificationDescription: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  verificationStatus: {
    color: DARK_GREEN,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  verificationArrow: {
    fontSize: 27,
    color: DARK_GREEN,
  },

  savingsCard: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#D7EFDF',
  },

  savingsIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: DARK_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },

  savingsIconText: {
    color: WHITE,
    fontSize: 23,
  },

  savingsContent: {
    flex: 1,
    marginLeft: 12,
  },

  savingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BLACK,
  },

  savingsDescription: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },

  savingsArrow: {
    fontSize: 27,
    color: DARK_GREEN,
  },

  emptyTransactions: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 27,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIconText: {
    fontSize: 28,
    color: DARK_GREEN,
  },

  emptyTitle: {
    fontSize: 15,
    color: BLACK,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  transactionItem: {
    backgroundColor: WHITE,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    borderWidth: 1,
    borderColor: BORDER,
  },

  transactionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
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
    fontSize: 22,
    fontWeight: '800',
    color: BLACK,
  },

  transactionDetails: {
    flex: 1,
    marginLeft: 12,
  },

  transactionTitle: {
    fontSize: 13,
    color: BLACK,
    fontWeight: '700',
  },

  transactionDate: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
  },

  transactionAmountContainer: {
    alignItems: 'flex-end',
  },

  transactionAmount: {
    fontSize: 13,
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
    fontSize: 10,
    marginTop: 5,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  footerBrand: {
    color: DARK_GREEN,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 2,
  },

  footerText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },

  bottomNavigation: {
    backgroundColor: WHITE,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
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
    fontSize: 23,
    color: MUTED,
  },

  activeNavIcon: {
    color: DARK_GREEN,
  },

  navLabel: {
    fontSize: 10,
    color: MUTED,
    marginTop: 4,
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
    marginTop: 5,
  },
});
