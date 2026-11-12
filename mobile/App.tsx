import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

import colors from './theme/colors';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

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

type AuthSession = {
  success: boolean;
  token: string;
  user?: {
    id?: string;
    full_name?: string;
    first_name?: string;
    surname?: string;
    email?: string;
    phone?: string;
  };
  accounts?: Account[];
  account?: Account;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [session, setSession] = useState<AuthSession | null>(null);

  const handleLoginSuccess = (authData: AuthSession) => {
    if (!authData?.token) {
      return;
    }

    setSession(authData);
    setScreen('home');
  };

  const handleLogout = () => {
    setSession(null);
    setScreen('welcome');
  };

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('welcome')}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onRegisterPress={() => setScreen('register')}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('welcome')}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <RegisterScreen />
      </SafeAreaView>
    );
  }

  if (screen === 'home' && session) {
    const userName =
      session.user?.first_name ||
      session.user?.full_name ||
      'Customer';

    const accounts =
      session.accounts ||
      (session.account ? [session.account] : []);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <ScrollView
          contentContainerStyle={styles.homeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.homeHeader}>
            <View>
              <Text style={styles.homeBrand}>ZENIMONIES</Text>
              <Text style={styles.homeSubtitle}>BANKING</Text>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeArea}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.customerName}>{userName}</Text>
            <Text style={styles.homeDescription}>
              Your ZENIMONIES account is ready.
            </Text>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>ACCOUNT OVERVIEW</Text>

            {accounts.length === 0 ? (
              <Text style={styles.accountMessage}>
                Your account information is not available yet.
              </Text>
            ) : (
              accounts.map((account, index) => (
                <View key={account.id || String(index)}>
                  <Text style={styles.accountName}>
                    {account.account_name || 'Personal Account'}
                  </Text>

                  <Text style={styles.balanceAmount}>
                    {account.currency || 'NGN'}{' '}
                    {Number(account.balance || 0).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>

                  <Text style={styles.accountStatus}>
                    Account status: {account.status || 'Available'}
                  </Text>

                  {account.account_number ? (
                    <Text style={styles.accountNumber}>
                      Account number: {account.account_number}
                    </Text>
                  ) : (
                    <Text style={styles.accountNumber}>
                      Account number provisioning is pending.
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>You're signed in</Text>
            <Text style={styles.noticeText}>
              Your login was accepted by the ZENIMONIES server.
              More banking services will appear here as we build
              and connect your dashboard.
            </Text>
          </View>

          <Text style={styles.footer}>
            SECURE • SIMPLE • SMART
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.brand}>ZENIMONIES</Text>
          <Text style={styles.tagline}>Banking made simple.</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Text style={styles.currency}>₦</Text>
          </View>

          <Text style={styles.heading}>
            Your money.{"\n"}Your freedom.
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
            onPress={() => setScreen('register')}
          >
            <Text style={styles.primaryText}>Get Started</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  homeContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 35,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeBrand: {
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2,
  },
  homeSubtitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 4,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  logoutText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  welcomeArea: {
    marginTop: 45,
    marginBottom: 25,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  customerName: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },
  homeDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  balanceCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 23,
    marginBottom: 20,
  },
  balanceLabel: {
    color: '#D8F1E2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  accountName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  balanceAmount: {
    color: colors.white,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 12,
  },
  accountStatus: {
    color: '#D8F1E2',
    fontSize: 12,
    marginTop: 12,
  },
  accountNumber: {
    color: '#D8F1E2',
    fontSize: 12,
    marginTop: 8,
  },
  accountMessage: {
    color: colors.white,
    fontSize: 14,
  },
  noticeCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 20,
  },
  noticeTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },
});
