
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN = '#087A45';
const DARK_GREEN = '#075C36';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <View style={styles.content}>
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoLetter}>Z</Text>
          </View>

          <Text style={styles.brandName}>ZENIMONIES</Text>
          <Text style={styles.tagline}>
            Banking made simple.
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Text style={styles.heroSymbol}>₦</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✓</Text>
            </View>
          </View>

          <Text style={styles.heading}>
            Your money.{'\n'}Your freedom.
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
            activeOpacity={0.85}
            onPress={() => {}}
          >
            <Text style={styles.primaryButtonText}>
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => {}}
          >
            <Text style={styles.secondaryButtonText}>
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },
  brandName: {
    marginTop: 13,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 3,
    color: DARK_GREEN,
  },
  tagline: {
    marginTop: 5,
    fontSize: 13,
    color: '#718078',
    letterSpacing: 0.5,
  },
  hero: {
    alignItems: 'center',
    marginTop: 20,
  },
  heroCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#E8F5ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  heroSymbol: {
    fontSize: 82,
    fontWeight: '800',
    color: GREEN,
  },
  heroBadge: {
    position: 'absolute',
    right: 5,
    bottom: 12,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  heading: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '900',
    color: '#14251C',
    textAlign: 'center',
  },
  description: {
    marginTop: 17,
    fontSize: 15,
    lineHeight: 25,
    color: '#718078',
    textAlign: 'center',
    maxWidth: 310,
  },
  actions: {
    gap: 14,
  },
  primaryButton: {
    backgroundColor: GREEN,
    minHeight: 58,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#DCE8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: DARK_GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: '#98A69D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 20,
  },
});
