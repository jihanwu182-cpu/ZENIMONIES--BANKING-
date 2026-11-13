
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import * as SecureStore from 'expo-secure-store';

import colors from './theme/colors';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import Dashboard from './screens/Dashboard';
import NotificationsScreen from './screens/NotificationsScreen';
import TransactionHistoryScreen from './screens/TransactionHistoryScreen';
import TransactionDetailsScreen from './screens/TransactionDetailsScreen';
import ProfileScreen from './screens/ProfileScreen';
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from './services/pushNotificationService';


// ======================================================
// ZENIMONIES BANKING — MOBILE APPLICATION
// File: mobile/App.tsx
// ======================================================

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const AUTH_URL = `${API_BASE}/auth`;
const PROFILE_URL = `${API_BASE}/profile`;
const ACCOUNT_URL = `${API_BASE}/account`;
const TRANSACTIONS_URL = `${API_BASE}/account/transactions`;

const AUTH_TOKEN_KEY = 'zenimonies_auth_token';

type Screen =
  | 'welcome'
  | 'login'
  | 'register'
  | 'home'
  | 'profile'
  | 'history'
  | 'notifications'
  | 'transaction-details';

type Account = {
  id?: string;
  account_number?: string | null;
  account_type?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
  kyc_status?: string;
  kyc_tier?: number | string;
};

type AuthUser = {
  id?: string;
  full_name?: string;
  first_name?: string;
  surname?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bvn_verified?: boolean;
  verification_level?: number | string;
  verification_status?: string;
  kyc_level?: number | string;
  kyc_tier?: number | string;
  kyc_status?: string;
};

type AuthSession = {
  success: boolean;
  token: string;
  user?: AuthUser;
  account?: Account;
  accounts?: Account[];
};

type Transaction = {
  id: string;
  title: string;
  description?: string;
  amount: string;
  type: 'credit' | 'debit';
  date: string;
  status?: string;
  reference?: string;
  currency?: string;
  transactionType?: string;
  fee?: string;
  totalDebit?: string;
  recipientName?: string;
  recipientAccount?: string;
  recipientBank?: string;
  senderName?: string;
  senderAccount?: string;
  provider?: string;
  phone?: string;
  customerNumber?: string;
  electricityToken?: string;
};

type AccountResponse = {
  success: boolean;
  account?: Account;
  message?: string;
};

type TransactionsResponse = {
  success: boolean;
  transactions?: any[];
  message?: string;
};

type ProfileResponse = {
  success: boolean;
  user?: AuthUser;
};

// ======================================================
// CURRENCY FORMATTER
// ======================================================

const formatNaira = (
  value: number | string | undefined
): string | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  return amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ======================================================
// TRANSACTION TITLE
// ======================================================

const getTransactionTitle = (
  transaction: any
): string => {
  const type = String(
    transaction.type || ''
  ).toLowerCase();

  if (type.includes('internal_transfer_received')) {
    return 'Money received';
  }

  if (type.includes('transfer')) {
    return 'Bank transfer';
  }

  if (type.includes('airtime')) {
    return 'Airtime purchase';
  }

  if (type.includes('data')) {
    return 'Data purchase';
  }

  if (type.includes('electricity')) {
    return 'Electricity payment';
  }

  if (type.includes('bill')) {
    return 'Bill payment';
  }

  if (type.includes('deposit')) {
    return 'Money deposited';
  }

  if (type.includes('withdraw')) {
    return 'Withdrawal';
  }

  return (
    transaction.description ||
    'Account transaction'
  );
};

// ======================================================
// TRANSACTION NORMALIZER
// ======================================================

const normalizeTransaction = (
  item: any
): Transaction => {
  const rawType = String(
    item.type || ''
  ).toLowerCase();

  // Determine transaction direction from its type.
  // Do not use amount > 0 because debit amounts may
  // also be stored as positive values in the database.

  const isCredit =
    rawType.includes('received') ||
    rawType.includes('credit') ||
    rawType.includes('incoming') ||
    rawType.includes('refund') ||
    rawType.includes('deposit');

  const numericAmount = Number(
    item.amount || 0
  );

  const amount = Number.isFinite(numericAmount)
    ? Math.abs(numericAmount)
    : 0;

  const dateValue = item.created_at
    ? new Date(item.created_at)
    : null;

  const date =
    dateValue &&
    !Number.isNaN(dateValue.getTime())
      ? dateValue.toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Date unavailable';

  return {
    id: String(
      item.id ||
        item.reference ||
        `${item.type}-${item.created_at}`
    ),

    title: getTransactionTitle(item),

    description:
      item.description ||
      item.recipient_name ||
      item.provider ||
      item.reference ||
      '',

    amount: `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,

    type: isCredit ? 'credit' : 'debit',

    date,

    status: String(
      item.status || 'Unknown'
    ),

    reference: item.reference
      ? String(item.reference)
      : undefined,

    currency: item.currency
      ? String(item.currency)
      : 'NGN',

    transactionType: rawType
      ? rawType.replace(/_/g, ' ')
      : undefined,

    fee: Number(item.transaction_fee || item.fee || 0) > 0
      ? `₦${Number(item.transaction_fee || item.fee).toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : undefined,

    totalDebit: Number(item.total_debit || 0) > 0
      ? `₦${Number(item.total_debit).toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : undefined,

    recipientName: item.recipient_name
      ? String(item.recipient_name)
      : undefined,

    recipientAccount: item.recipient_account
      ? String(item.recipient_account)
      : undefined,

    recipientBank: item.recipient_bank
      ? String(item.recipient_bank)
      : undefined,

    senderName: item.sender_name
      ? String(item.sender_name)
      : undefined,

    senderAccount: item.sender_account
      ? String(item.sender_account)
      : undefined,

    provider: item.provider
      ? String(item.provider)
      : undefined,

    phone: item.phone
      ? String(item.phone)
      : undefined,

    customerNumber: item.customer_number
      ? String(item.customer_number)
      : undefined,

    electricityToken: item.electricity_token || item.token
      ? String(item.electricity_token || item.token)
      : undefined,
  };
};

// ======================================================
// JSON RESPONSE HANDLER
// ======================================================

async function readJson(
  response: Response
): Promise<any> {
  try {
    return await response.json();
  } catch {
    throw new Error(
      'The server returned an invalid response.'
    );
  }
}

// ======================================================
// MAIN APPLICATION
// ======================================================

export default function App() {
  const [screen, setScreen] =
    useState<Screen>('welcome');

  const [session, setSession] =
    useState<AuthSession | null>(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [account, setAccount] =
    useState<Account | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [dashboardLoading, setDashboardLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);
const offerPushNotifications = useCallback((token: string) => {
  Alert.alert(
    'Stay updated',
    'Would you like ZENIMONIES to send important account and service announcements to this device?',
    [
      {
        text: 'Not now',
        style: 'cancel',
      },
      {
        text: 'Enable notifications',
        onPress: () => {
          registerPushNotifications(token)
            .then((result) => {
              if (!result.success && !result.permissionDenied) {
                Alert.alert(
                  'Notifications',
                  'We could not enable notifications right now. Please try again later.',
                );
              }
            })
            .catch(() => {
              Alert.alert(
                'Notifications',
                'We could not enable notifications right now. Please try again later.',
              );
            });
        },
      },
    ],
  );
}, []);
  // ====================================================
  // CLEAR SESSION
  // ====================================================

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(
      AUTH_TOKEN_KEY
    );

    setSession(null);
    setAccount(null);
    setTransactions([]);
    setSelectedTransaction(null);
    setRefreshing(false);
    setDashboardLoading(false);
    setScreen('welcome');
  }, []);

  // ====================================================
  // AUTHENTICATED API REQUEST
  // ====================================================

  const authenticatedFetch = useCallback(
    async (
      url: string,
      token: string
    ): Promise<Response> => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const data = await readJson(response);

        if (
          data.code === 'TOKEN_EXPIRED' ||
          data.code === 'TOKEN_INVALID' ||
          data.code === 'AUTH_REQUIRED'
        ) {
          throw new Error('SESSION_EXPIRED');
        }

        throw new Error(
          data.message ||
            'Authentication failed.'
        );
      }

      return response;
    },
    []
  );

  // ====================================================
  // LOAD ACCOUNT AND TRANSACTIONS
  // ====================================================

  const loadDashboardData = useCallback(
    async (
      token: string,
      showLoader = true
    ) => {
      if (showLoader) {
        setDashboardLoading(true);
      }

      try {
        const [
          accountResponse,
          transactionResponse,
        ] = await Promise.all([
          authenticatedFetch(
            ACCOUNT_URL,
            token
          ),

          authenticatedFetch(
            TRANSACTIONS_URL,
            token
          ),
        ]);

        const accountData: AccountResponse =
          await readJson(accountResponse);

        const transactionData: TransactionsResponse =
          await readJson(transactionResponse);

        if (
          !accountResponse.ok ||
          accountData.success !== true
        ) {
          throw new Error(
            accountData.message ||
              'Unable to retrieve your account.'
          );
        }

        if (
          !transactionResponse.ok ||
          transactionData.success !== true
        ) {
          throw new Error(
            transactionData.message ||
              'Unable to retrieve your transactions.'
          );
        }

        if (!accountData.account) {
          throw new Error(
            'Your account details are unavailable.'
          );
        }

        setAccount(accountData.account);

        const rows = Array.isArray(
          transactionData.transactions
        )
          ? transactionData.transactions
          : [];

        setTransactions(
          rows.map(normalizeTransaction)
        );
      } catch (error: any) {
        if (
          error.message === 'SESSION_EXPIRED'
        ) {
          Alert.alert(
            'Session expired',
            'Please sign in again to protect your account.',
            [
              {
                text: 'Sign in',
                onPress: () => {
                  clearSession().catch(() => {});
                },
              },
            ]
          );

          return;
        }

        throw error;
      } finally {
        setDashboardLoading(false);
        setRefreshing(false);
      }
    },
    [
      authenticatedFetch,
      clearSession,
    ]
  );

  // ====================================================
  // LOAD CUSTOMER PROFILE
  // ====================================================

  const loadProfile = useCallback(
    async (
      token: string
    ): Promise<AuthUser | undefined> => {
      try {
        const response = await authenticatedFetch(
          PROFILE_URL,
          token
        );

        const data: ProfileResponse =
          await readJson(response);

        if (
          response.ok &&
          data.success &&
          data.user
        ) {
          return data.user;
        }
      } catch {
        // A profile failure must not discard
        // an otherwise valid login session.
      }

      return undefined;
    },
    [authenticatedFetch]
  );

  // ====================================================
  // RESTORE SAVED LOGIN SESSION
  // ====================================================

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const savedToken =
          await SecureStore.getItemAsync(
            AUTH_TOKEN_KEY
          );

        if (!savedToken) {
          return;
        }

        const response = await authenticatedFetch(
          `${AUTH_URL}/me`,
          savedToken
        );

        const data = await readJson(response);

        if (
          !response.ok ||
          data.success !== true ||
          !data.user
        ) {
          await SecureStore.deleteItemAsync(
            AUTH_TOKEN_KEY
          );

          return;
        }

        const profileUser =
          await loadProfile(savedToken);

        if (!mounted) return;

        const restoredSession: AuthSession = {
          success: true,
          token: savedToken,

          user: {
            ...(data.user || {}),
            ...(profileUser || {}),
          },
        };

        setSession(restoredSession);
        setScreen('home');

        try {
          await loadDashboardData(
            savedToken
          );
        } catch (error: any) {
          if (mounted) {
            Alert.alert(
              'Account information',
              error.message ||
                'Your account information could not be loaded. Please refresh.'
            );
          }
        }
      } catch (error: any) {
        if (
          error.message === 'SESSION_EXPIRED'
        ) {
          await SecureStore.deleteItemAsync(
            AUTH_TOKEN_KEY
          );

          return;
        }

        if (mounted) {
          Alert.alert(
            'Connection unavailable',
            'We could not verify your saved session. Check your internet connection and try again.'
          );
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [
    authenticatedFetch,
    loadDashboardData,
    loadProfile,
  ]);

  // ====================================================
  // LOGIN SUCCESS
  // ====================================================

  const handleLoginSuccess = async (
    authData: AuthSession
  ) => {
    if (!authData?.token) {
      Alert.alert(
        'Sign in incomplete',
        'The server did not return a valid login token.'
      );

      return;
    }

    try {
      await SecureStore.setItemAsync(
        AUTH_TOKEN_KEY,
        authData.token
      );

      const profileUser =
        await loadProfile(authData.token);

      const updatedSession: AuthSession = {
        ...authData,

        user: {
          ...(authData.user || {}),
          ...(profileUser || {}),
        },
      };

      setSession(updatedSession);
      setAccount(null);
      setTransactions([]);
      setScreen('home');
      offerPushNotifications(authData.token);
      try {
        await loadDashboardData(
          authData.token
        );
      } catch (error: any) {
        Alert.alert(
          'Account information',
          error.message ||
            'Your account details could not be loaded. Please refresh the dashboard.'
        );
      }
    } catch {
      Alert.alert(
        'Secure storage unavailable',
        'Your login was accepted, but this device could not securely save your session.'
      );
    }
  };

  // ====================================================
  // REGISTRATION SUCCESS
  // ====================================================

  const handleRegistrationSuccess = async (
    registrationSession: AuthSession | null
  ) => {
    if (!registrationSession?.token) {
      setScreen('login');
      return;
    }

    await handleLoginSuccess(
      registrationSession
    );
  };

  // ====================================================
  // DASHBOARD REFRESH
  // ====================================================

  const handleRefresh = async () => {
    if (!session?.token) return;

    setRefreshing(true);

    try {
      await loadDashboardData(
        session.token,
        false
      );
    } catch (error: any) {
      Alert.alert(
        'Refresh failed',
        error.message ||
          'Unable to refresh your account information.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = async () => {
  try {
    if (session?.token) {
      await unregisterPushNotifications(session.token);
    }

    await clearSession();
  } catch {
    Alert.alert(
      'Logout failed',
      'We could not complete logout. Please try again.'
    );
  }
};

  // ====================================================
  // SELECT TRANSACTION
  // ====================================================

  const handleSelectTransaction = (
    transaction: Transaction
  ) => {
    setSelectedTransaction(transaction);
    setScreen('transaction-details');
  };

  // ====================================================
  // DASHBOARD ACTIONS
  // ====================================================

  const handleDashboardAction = (
    action: string
  ) => {
    const serviceNames: Record<string, string> = {
      transfer: 'Bank transfers',
      'add-money': 'Add money',
      withdraw: 'Withdrawals',
      airtime: 'Airtime',
      data: 'Data purchases',
      electricity: 'Electricity payments',
      bills: 'Bill payments',
      cards: 'Cards',
      savings: 'ZENIMONIES Save',
    };

    Alert.alert(
      serviceNames[action] || 'ZENIMONIES',

      'This service screen will be connected in the next development stage. No transaction has been initiated.'
    );
  };

  // ====================================================
  // DASHBOARD NAVIGATION
  // ====================================================

  const handleDashboardNavigation = (
    tab: string
  ) => {
    if (tab === 'Home') {
      setScreen('home');
      return;
    }

    if (tab === 'Profile') {
      setScreen('profile');
      return;
    }

    if (tab === 'History') {
      setScreen('history');
      return;
    }
    if (tab === 'Notifications') {
      setScreen('notifications');
      return;
    }

    Alert.alert(
      tab,
      `${tab} screen will be connected in the next development stage.`
    );
  };

  // ====================================================
  // SESSION CHECK LOADING SCREEN
  // ====================================================

  if (checkingSession) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContent}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>
              Z
            </Text>
          </View>

          <Text style={styles.loadingBrand}>
            ZENIMONIES
          </Text>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loadingIndicator}
          />

          <Text style={styles.loadingText}>
            Securing your session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ====================================================
  // LOGIN SCREEN
  // ====================================================

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('welcome')}
        >
          <Text style={styles.backText}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onRegisterPress={() =>
            setScreen('register')
          }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // REGISTRATION SCREEN
  // ====================================================

  if (screen === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('welcome')}
        >
          <Text style={styles.backText}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <RegisterScreen
          onRegistrationSuccess={
            handleRegistrationSuccess
          }
        />
      </SafeAreaView>
    );
  }
if (screen === 'notifications' && session) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <NotificationsScreen
        token={session.token}
        onBack={() => setScreen('home')}
      />
    </SafeAreaView>
  );
}
  // ====================================================
  // CUSTOMER PROFILE
  // ====================================================

  if (screen === 'profile' && session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <ProfileScreen
          user={session.user}
          account={account}
          onBack={() => setScreen('home')}
          onLogout={handleLogout}
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // TRANSACTION HISTORY
  // ====================================================

  if (screen === 'history' && session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <TransactionHistoryScreen
          transactions={transactions}
          onBack={() => setScreen('home')}
          onSelectTransaction={handleSelectTransaction}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // TRANSACTION DETAILS
  // ====================================================

  if (
    screen === 'transaction-details' &&
    session &&
    selectedTransaction
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <TransactionDetailsScreen
          transaction={selectedTransaction}
          onBack={() => setScreen('history')}
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // PERSONAL DASHBOARD
  // ====================================================

  if (screen === 'home' && session) {
    const userName =
      session.user?.full_name ||
      session.user?.name ||
      session.user?.first_name ||
      'Customer';

    const verificationLevel =
      account?.kyc_tier ??
      session.user?.verification_level ??
      session.user?.kyc_level;

    const verificationStatus =
      account?.kyc_status ||
      session.user?.verification_status ||
      session.user?.kyc_status ||
      'Pending';

    const balance = formatNaira(
      account?.balance
    );

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {dashboardLoading && !account ? (
          <View style={styles.dashboardLoading}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Loading your account...
            </Text>
          </View>
        ) : (
          <Dashboard
            userName={userName}
            currency="NGN"
            balance={balance}
            accountNumber={
              account?.account_number || undefined
            }
            bankName="ZENIMONIES"
            verificationLevel={
              verificationLevel !== undefined
                ? String(verificationLevel)
                : undefined
            }
            verificationStatus={
              verificationStatus
            }
            transactions={transactions}
            onAction={handleDashboardAction}
            onNavigate={handleDashboardNavigation}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {dashboardLoading && account ? (
          <View style={styles.refreshIndicator}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  // ====================================================
  // WELCOME SCREEN
  // ====================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>
              Z
            </Text>
          </View>

          <Text style={styles.brand}>
            ZENIMONIES
          </Text>

          <Text style={styles.tagline}>
            Banking made simple.
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Text style={styles.currency}>
              ₦
            </Text>
          </View>

          <Text style={styles.heading}>
            Your money.{"\n"}
            Your freedom.
          </Text>

          <Text style={styles.description}>
            A smarter way to manage your money,
            make payments and stay in control
            of your finances.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              setScreen('register')
            }
          >
            <Text style={styles.primaryText}>
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              setScreen('login')
            }
          >
            <Text style={styles.secondaryText}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          SECURE • SIMPLE • SMART
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingBrand: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primaryDark,
  },

  loadingIndicator: {
    marginTop: 35,
  },

  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.textSecondary,
  },

  dashboardLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshIndicator: {
    position: 'absolute',
    top: 8,
    right: 18,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 35,
    paddingBottom: 25,
    justifyContent: 'space-between',
  },

  brandArea: {
    alignItems: 'center',
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '900',
  },

  brand: {
    marginTop: 12,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primaryDark,
  },

  tagline: {
    marginTop: 5,
    fontSize: 13,
    color: colors.textSecondary,
  },

  hero: {
    alignItems: 'center',
  },

  heroCircle: {
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  currency: {
    fontSize: 80,
    fontWeight: '900',
    color: colors.primary,
  },

  heading: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },

  description: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 310,
  },

  actions: {
    gap: 14,
  },

  primaryButton: {
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  secondaryButton: {
    minHeight: 56,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 18,
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },

  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
