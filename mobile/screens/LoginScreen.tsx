
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import colors from '../theme/colors';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing information',
        'Please enter your email address and password.'
      );
      return;
    }

    Alert.alert(
      'Login ready',
      'The login form is ready. We will connect it to your secure ZENIMONIES backend next.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.brand}>ZENIMONIES</Text>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.heading}>Your money is waiting.</Text>
          <Text style={styles.description}>
            Sign in securely to access your banking dashboard.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <Text
              style={styles.showPassword}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </Text>
          </View>

          <Text
            style={styles.forgot}
            onPress={() => Alert.alert(
              'Password recovery',
              'Password recovery will be connected to the backend.'
            )}
          >
            Forgot password?
          </Text>

          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
          />

          <View style={styles.security}>
            <Text style={styles.securityIcon}>✓</Text>
            <Text style={styles.securityText}>
              Your security is our priority.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          New to ZENIMONIES?{' '}
          <Text style={styles.register}>Create an account</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 45,
    paddingBottom: 35,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.white,
  },
  brand: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primaryDark,
    marginBottom: 38,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 12,
  },
  heading: {
    fontSize: 29,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 10,
  },
  form: {
    gap: 21,
  },
  field: {
    gap: 9,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    height: 57,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.backgroundSoft,
  },
  showPassword: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  forgot: {
    textAlign: 'right',
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: -8,
  },
  security: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  securityIcon: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '900',
  },
  securityText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  footer: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 35,
  },
  register: {
    color: colors.primary,
    fontWeight: '900',
  },
});
