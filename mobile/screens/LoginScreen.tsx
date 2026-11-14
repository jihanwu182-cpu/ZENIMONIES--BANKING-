
import React, { useState } from 'react';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';

const API_URL =
  'https://zenimonies-banking.onrender.com/api/auth';

type LoginScreenProps = {
  onLoginSuccess?: (session: any) => void;
  onRegisterPress?: () => void;
  onForgotPasswordPress?: () => void;
};

type LoginResponse = {
  success: boolean;
  message?: string;
  token?: string;
  session_expires_at?: string;
  inactivity_timeout_minutes?: number;
  user?: any;
  accounts?: any[];
};

export default function LoginScreen({
  onLoginSuccess,
  onRegisterPress,
  onForgotPasswordPress,
}: LoginScreenProps) {
  const { colors, mode } = useTheme();
  const styles = createStyles(colors);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizeIdentifier = (value: string) => {
    const input = value.trim();

    if (input.includes('@')) {
      return input.toLowerCase();
    }

    const phone = input.replace(/[\s()-]/g, '');

    if (/^0\d{10}$/.test(phone)) {
      return `+234${phone.substring(1)}`;
    }

    if (/^234\d{10}$/.test(phone)) {
      return `+${phone}`;
    }

    return phone;
  };

  const validateIdentifier = () => {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      Alert.alert(
        'Information required',
        'Enter your mobile number or email address.'
      );
      return undefined;
    }

    const normalized = normalizeIdentifier(cleanIdentifier);

    if (cleanIdentifier.includes('@')) {
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
      ) {
        Alert.alert(
          'Invalid email',
          'Enter a valid email address.'
        );
        return undefined;
      }

      return normalized;
    }

    if (!/^\+234\d{10}$/.test(normalized)) {
      Alert.alert(
        'Invalid mobile number',
        'Enter a valid Nigerian mobile number, for example 08012345678.'
      );
      return undefined;
    }

    return normalized;
  };

  const handleLogin = async () => {
    if (loading) return;

    const normalizedIdentifier = validateIdentifier();

    if (!normalizedIdentifier) return;

    if (!password) {
      Alert.alert(
        'Password required',
        'Enter your account password.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          identifier: normalizedIdentifier,
          password,
        }),
      });

      let data: LoginResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          'The server returned an invalid response. Please try again.'
        );
      }

      if (
        !response.ok ||
        data.success !== true ||
        !data.token
      ) {
        throw new Error(
          data.message || 'Unable to sign in. Please try again.'
        );
      }

      if (onLoginSuccess) {
        onLoginSuccess(data);
      } else {
        Alert.alert(
          'Login successful',
          'Your credentials have been verified.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Sign in failed',
        error.message ||
          'Unable to connect. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPasswordPress) {
      onForgotPasswordPress();
    } else {
      Alert.alert(
        'Password recovery',
        'Password recovery will be connected in the next step.'
      );
    }
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
        {/* Top navigation */}
        <View style={styles.topBar}>
          <View />

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'ZENIMONIES Support',
                'Please contact ZENIMONIES Support for assistance.'
              )
            }
          >
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>

        {/* Branding */}
        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.brand}>ZENIMONIES</Text>

          <Text style={styles.brandSubtitle}>
            BANKING
          </Text>
        </View>

        {/* Single-step login */}
        <View style={styles.form}>
          <Text style={styles.heading}>
            Welcome back
          </Text>

          <Text style={styles.description}>
            Log in securely to your ZENIMONIES account.
          </Text>

          {/* Phone or email */}
          <View style={styles.inputContainer}>
            <Text style={styles.floatingLabel}>
              Phone number or email address
            </Text>

            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Enter phone number or email"
              placeholderTextColor={colors.textMuted}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.floatingLabel}>
              Password
            </Text>

            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                <Text style={styles.showPassword}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotContainer}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.link}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Login button */}
          <PrimaryButton
            title="LOG IN"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />

          <Text style={styles.secureNote}>
            Your account is protected with secure authentication.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerArea}>
          <Text style={styles.footer}>
            Don't have an account?{' '}
            <Text
              style={styles.link}
              onPress={onRegisterPress}
            >
              Sign Up
            </Text>
          </Text>

          <Text style={styles.security}>
            SECURE • SIMPLE • SMART
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(
  colors: ReturnType<typeof import('../theme/colors').getColors>
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 25,
      paddingTop: 12,
      paddingBottom: 28,
      justifyContent: 'space-between',
    },

    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 42,
    },

    helpText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },

    brandArea: {
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 32,
    },

    logo: {
      width: 55,
      height: 55,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    logoText: {
      color: '#FFFFFF',
      fontSize: 35,
      fontWeight: '900',
    },

    brand: {
      marginTop: 9,
      color: colors.primaryDark,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 2,
    },

    brandSubtitle: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 4,
    },

    form: {
      gap: 19,
      marginTop: 3,
    },

    heading: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
    },

    description: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: -12,
      marginBottom: 5,
    },

    inputContainer: {
      borderWidth: 1.3,
      borderColor: colors.border,
      borderRadius: 13,
      minHeight: 68,
      justifyContent: 'center',
      paddingHorizontal: 15,
      position: 'relative',
      backgroundColor: colors.surface,
    },

    floatingLabel: {
      position: 'absolute',
      top: -9,
      left: 13,
      paddingHorizontal: 5,
      backgroundColor: colors.background,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
    },

    input: {
      minHeight: 52,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 9,
    },

    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    passwordInput: {
      flex: 1,
      minHeight: 52,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 9,
    },

    showPassword: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
      paddingLeft: 10,
    },

    forgotContainer: {
      alignSelf: 'flex-end',
      marginTop: -8,
    },

    link: {
      color: colors.primary,
      fontWeight: '700',
    },

    secureNote: {
      color: colors.textMuted,
      fontSize: 10,
      textAlign: 'center',
      marginTop: -7,
    },

    footerArea: {
      alignItems: 'center',
      marginTop: 38,
      gap: 22,
    },

    footer: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 22,
    },

    security: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
    },
  });
}
