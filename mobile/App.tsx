
import React, { useEffect, useState } from 'react';

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

// ============================================================
// ZENIMONIES BANKING — MOBILE APPLICATION
// Main application entry point
// ============================================================

const API_URL =
  'https://zenimonies-banking.onrender.com/api/auth';

const PROFILE_API_URL =
  'https://zenimonies-banking.onrender.com/api/profile';

const AUTH_TOKEN_KEY = 'zenimonies_auth_token';

// ============================================================
// TYPES
// ============================================================

type Screen = 'welcome' | 'login' | 'register' | 'home';

type Account = {
  id?: string;
  account_number?: string | null;
  account_name?: string;
  account_type?: string;
  currency?: string;
  balance?: string | number;
  status?: string;
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
  profile_photo?: string | null;

  verification_level?: string | number;
  verification_status?: string;
  kyc_level?: string | number;
  kyc_status?: string;
};

type AuthSession = {
  success: boolean;
  token: string;
  user?: AuthUser;
  accounts?: Account[];
  account?: Account;
  session_expires_at?: string;
  inactivity_timeout_minutes?: number;
};

type MeResponse = {
  success: boolean;
  user?: AuthUser;
  account?: Account | null;
  accounts?: Account[];
  message?: string;
};

// ============================================================
// HELPERS
// ============================================================

const getAccounts = (session: AuthSession): Account[] => {
  if (Array.isArray(session.accounts)) {
    return session.accounts;
  }

  if (session.account) {
    return [session.account];
  }

  return [];
};

const formatBalance = (
  balance: string | number | undefined,
  currency: string
): string | undefined => {
  if (
    balance === undefined ||
    balance === null ||
    balance === ''
  ) {
    return undefined;
  }

  const numericBalance = Number(balance);

  if (!Number.isFinite(numericBalance)) {
    return undefined;
  }

  return numericBalance.toLocaleString(
    currency === 'ZAR' ? 'en-ZA' : 'en-NG',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
};

// ============================================================
// MAIN APPLICATION
// ============================================================

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');

  const [session, setSession] =
    useState<AuthSession | null>(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  // ==========================================================
  // RESTORE SAVED AUTHENTICATION SESSION
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const savedToken =
          await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

        if (!savedToken) {
          return;
        }

        const response = await fetch(`${API_URL}/me`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
        });

        let data: MeResponse;

        try {
          data = await response.json();
        } catch {
          throw new Error(
            'Invalid session response from server.'
          );
        }

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

        if (!mounted) return;

        // Retrieve the latest customer profile.

        let profileUser: AuthUser | undefined;

        try {
          const profileResponse = await fetch(
            PROFILE_API_URL,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${savedToken}`,
              },
            }
          );

          const profileData = await profileResponse.json();

          if (
            profileResponse.ok &&
            profileData.success === true &&
            profileData.user
          ) {
            profileUser = profileData.user as AuthUser;
          }
        } catch {
          // Keep the verified session if profile
          // information is temporarily unavailable.
        }

        if (!mounted) return;

        const restoredSession: AuthSession = {
          success: true,
          token: savedToken,

          user: {
            ...data.user,
            ...(profileUser || {}),
          },

          account: data.account || undefined,

          accounts:
            data.accounts ||
            (data.account ? [data.account] : []),
        };

        setSession(restoredSession);
        setScreen('home');
      } catch {
        // Keep the saved token when the network
        // is temporarily unavailable.

        if (mounted) {
          Alert.alert(
            'Session unavailable',
            'We could not verify your saved session. Please check your internet connection and sign in again if necessary.'
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
  }, []);

  // ==========================================================
  // SUCCESSFUL LOGIN
  // ==========================================================

  const handleLoginSuccess = async (
    authData: AuthSession
  ) => {
    if (!authData?.token) {
      Alert.alert(
        'Sign in incomplete',
        'The server did not return a valid login token. Please try again.'
      );

      return;
    }

    try {
      await SecureStore.setItemAsync(
        AUTH_TOKEN_KEY,
        authData.token
      );

      let profileUser: AuthUser | undefined;

      try {
        const profileResponse = await fetch(
          PROFILE_API_URL,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${authData.token}`,
            },
          }
        );

        const profileData = await profileResponse.json();

        if (
          profileResponse.ok &&
          profileData.success === true &&
          profileData.user
        ) {
          profileUser = profileData.user as AuthUser;
        }
      } catch {
        // Continue login if profile loading fails.
      }

      const updatedSession: AuthSession = {
        ...authData,

        user: {
          ...(authData.user || {}),
          ...(profileUser || {}),
        },

        accounts:
          authData.accounts ||
          (authData.account ? [authData.account] : []),
      };

      setSession(updatedSession);
      setScreen('home');
    } catch {
      Alert.alert(
        'Secure storage unavailable',
        'Your login was accepted, but this device could not securely save your session. Please try again.'
      );
    }
  };

  // ==========================================================
  // REGISTRATION SUCCESS
  // ==========================================================

  const handleRegistrationSuccess = async (
    registrationSession: AuthSession | null
  ) => {
    if (!registrationSession?.token) {
      setScreen('login');
      return;
    }

    await handleLoginSuccess(registrationSession);
  };

  // ==========================================================
  // SECURE LOGOUT
  // ==========================================================

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);

      setSession(null);
      setScreen('welcome');
    } catch {
      Alert.alert(
        'Logout could not be completed',
        'We could not clear the saved secure session. Please try again.'
      );
    }
  };

  // ==========================================================
  // DASHBOARD ACTIONS
  // ==========================================================

  const handleDashboardAction = (action: string) => {
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

    const serviceName =
      serviceNames[action] || action;

    Alert.alert(
      serviceName,
      'This service is being connected to the secure ZENIMONIES banking backend. No transaction has been initiated.'
    );
  };

  // ==========================================================
  // DASHBOARD NAVIGATION
  // ==========================================================

  const handleDashboardNavigation = (tab: string) => {
    if (tab === 'Home') {
      return;
    }

    if (tab === 'Profile') {
      Alert.alert(
        'My Account',
        'Manage your ZENIMONIES account.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Log out',
            style: 'destructive',
            onPress: handleLogout,
          },
        ]
      );

      return;
    }

    Alert.alert(
      tab,
      `${tab} screen will be connected in the next development stage.`
    );
  };

  // ==========================================================
  // PROFILE PHOTO UPDATE
  // ==========================================================

  const handlePhotoUpdated = (photo: string) => {
    setSession((current) =>
      current
        ? {
            ...current,

            user: {
              ...(current.user || {}),
              profile_photo: photo,
            },
          }
        : current
    );
  };

  // ==========================================================
  // SESSION CHECK SCREEN
  // ==========================================================

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContent}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
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

  // ==========================================================
  // LOGIN SCREEN
  // ==========================================================

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
          onRegisterPress={() => setScreen('register')}
        />
      </SafeAreaView>
    );
  }

  // ==========================================================
  // REGISTRATION SCREEN
  // ==========================================================

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

  // ==========================================================
  // CUSTOMER HOME — PERSONAL DASHBOARD
  // ==========================================================

  if (screen === 'home' && session) {
    const userName =
      session.user?.full_name ||
      session.user?.name ||
      session.user?.first_name ||
      'Customer';

    const accounts = getAccounts(session);

    const primaryAccount = accounts[0];

    const currency =
      primaryAccount?.currency === 'ZAR'
        ? 'ZAR'
        : 'NGN';

    const balance = formatBalance(
      primaryAccount?.balance,
      currency
    );

    const verificationLevel =
      session.user?.verification_level ??
      session.user?.kyc_level;

    const verificationStatus =
      session.user?.verification_status ||
      session.user?.kyc_status ||
      'Pending';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <Dashboard
          userName={userName}
          currency={currency}
          balance={balance}
          accountNumber={
            primaryAccount?.account_number || undefined
          }
          bankName="ZENIMONIES"
          verificationLevel={
            verificationLevel !== undefined
              ? String(verificationLevel)
              : undefined
          }
          verificationStatus={verificationStatus}
          transactions={[]}
          onAction={handleDashboardAction}
          onNavigate={handleDashboardNavigation}
        />
      </SafeAreaView>
    );
  }

  // ==========================================================
  // WELCOME SCREEN
  // ==========================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* BRAND */}

        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.brand}>
            ZENIMONIES
          </Text>

          <Text style={styles.tagline}>
            Banking made simple.
          </Text>
        </View>

        {/* HERO */}

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

        {/* ACTIONS */}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setScreen('register')}
          >
            <Text style={styles.primaryText}>
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setScreen('login')}
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

// ============================================================
// STYLES
// ============================================================

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
