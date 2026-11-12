
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

import colors from '../theme/colors';
import PrimaryButton from '../components/PrimaryButton';

const API_URL = 'https://zenimonies-banking.onrender.com/api/auth';

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
  const [step, setStep] = useState<'identifier' | 'password'>(
    'identifier'
  );

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

    // Convert Nigerian local format to international format.
    if (/^0\d{10}$/.test(phone)) {
      return `+234${phone.substring(1)}`;
    }

    if (/^234\d{10}$/.test(phone)) {
      return `+${phone}`;
    }

    return phone;
  };

  const continueToPassword = () => {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      Alert.alert(
        'Information required',
        'Enter your mobile number or email address.'
      );
      return;
    }

    const isEmail = cleanIdentifier.includes('@');
    const normalized = normalizeIdentifier(cleanIdentifier);

    if (
      isEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
      Alert.alert(
        'Invalid email',
        'Enter a valid email address.'
      );
      return;
    }

    if (
      !isEmail &&
      !/^\+234\d{10}$/.test(normalized)
    ) {
      Alert.alert(
        'Invalid mobile number',
        'Enter a valid Nigerian mobile number, for example 08012345678.'
      );
      return;
    }

    setIdentifier(normalized);
    setStep('password');
  };

  const handleLogin = async () => {
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
          identifier: normalizeIdentifier(identifier),
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
          'Your credentials have been verified. Session setup is the next integration step.'
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

  const changeIdentifier = () => {
    setPassword('');
    setStep('identifier');
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
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={
              step === 'password'
                ? changeIdentifier
                : undefined
            }
          >
            <Text style={styles.backText}>
              {step === 'password' ? '‹ Back' : ''}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>Help</Text>
        </View>

        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.brand}>ZENIMONIES</Text>
          <Text style={styles.brandSubtitle}>BANKING</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.heading}>
            {step === 'identifier'
              ? 'Log in to your account'
              : 'Enter your password'}
          </Text>

          {step === 'identifier' ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.floatingLabel}>
                  Enter your Mobile No./Email
                </Text>

                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Mobile number or email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={continueToPassword}
                />
              </View>

              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Change mobile number',
                    'If you have lost access to your registered number, please contact ZENIMONIES Support for account recovery.'
                  )
                }
              >
                <Text style={styles.supportText}>
                  Lost Your Mobile Number?{' '}
                  <Text style={styles.link}>Change Now</Text>
                </Text>
              </TouchableOpacity>

              <PrimaryButton
                title="NEXT"
                onPress={continueToPassword}
              />
            </>
          ) : (
            <>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>
                  Signing in as
                </Text>

                <Text style={styles.accountIdentifier}>
                  {identifier}
                </Text>

                <TouchableOpacity onPress={changeIdentifier}>
                  <Text style={styles.link}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.floatingLabel}>
                  Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() =>
                  setShowPassword(!showPassword)
                }
              >
                <Text style={styles.link}>
                  {showPassword
                    ? 'Hide password'
                    : 'Show password'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotContainer}
                onPress={() => {
                  if (onForgotPasswordPress) {
                    onForgotPasswordPress();
                  } else {
                    Alert.alert(
                      'Password recovery',
                      'Password recovery will be connected in the next step.'
                    );
                  }
                }}
              >
                <Text style={styles.link}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <PrimaryButton
                title="LOG IN"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />
            </>
          )}
        </View>

        <View style={styles.footerArea}>
          <Text style={styles.footer}>
            Don't have an account?{' '}
            <Text
              style={styles.link}
              onPress={onRegisterPress}
            >
              Click here to Sign Up
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
  },
  backText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
  },
  helpText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  brandArea: {
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 55,
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
    fontSize: 37,
    fontWeight: '900',
  },
  brand: {
    marginTop: 10,
    color: colors.primaryDark,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 4,
  },
  form: {
    gap: 25,
    marginTop: 5,
  },
  heading: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 18,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 13,
    minHeight: 76,
    justifyContent: 'center',
    paddingHorizontal: 17,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    top: -11,
    left: 15,
    paddingHorizontal: 5,
    backgroundColor: colors.background,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 55,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 10,
  },
  supportText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
  accountInfo: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 12,
    padding: 15,
    gap: 5,
  },
  accountLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  accountIdentifier: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  passwordToggle: {
    alignSelf: 'flex-end',
    marginTop: -15,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: -12,
  },
  footerArea: {
    alignItems: 'center',
    marginTop: 65,
    gap: 28,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 23,
  },
  security: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
