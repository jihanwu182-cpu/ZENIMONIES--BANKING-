
import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import colors from './theme/colors';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

type Screen = 'welcome' | 'login' | 'register';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');

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
        <LoginScreen />
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
});
