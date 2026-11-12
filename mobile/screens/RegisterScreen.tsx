
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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      Alert.alert('Incomplete information', 'Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Your password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Your passwords do not match.');
      return;
    }

    Alert.alert(
      'Registration form complete',
      'Your details are ready. Account creation will be connected to the ZENIMONIES backend next.'
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    options: {
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'sentences' | 'words';
    } = {}
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={options.keyboardType || 'default'}
        secureTextEntry={options.secureTextEntry}
        autoCapitalize={options.autoCapitalize || 'sentences'}
        autoCorrect={false}
      />
    </View>
  );

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
          <Text style={styles.brand}>ZENIMONIES</Text>
          <Text style={styles.eyebrow}>CREATE YOUR ACCOUNT</Text>
          <Text style={styles.heading}>Let's get you started.</Text>
          <Text style={styles.description}>
            Enter your details to begin your ZENIMONIES banking journey.
          </Text>
        </View>

        <View style={styles.form}>
          {renderInput(
            'Full name',
            fullName,
            setFullName,
            'Enter your registered full name'
          )}

          {renderInput(
            'Email address',
            email,
            setEmail,
            'Enter your email address',
            { keyboardType: 'email-address', autoCapitalize: 'none' }
          )}

          {renderInput(
            'Phone number',
            phone,
            setPhone,
            'Enter your phone number',
            { keyboardType: 'phone-pad' }
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Text
              style={styles.toggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </Text>
          </View>

          {renderInput(
            'Confirm password',
            confirmPassword,
            setConfirmPassword,
            'Enter your password again',
            { secureTextEntry: !showPassword, autoCapitalize: 'none' }
          )}

          <Text style={styles.note}>
            Your information will be protected using ZENIMONIES security controls.
          </Text>

          <PrimaryButton
            title="Create Account"
            onPress={handleRegister}
          />

          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text style={styles.signIn}>Sign in</Text>
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
    paddingTop: 55,
    paddingBottom: 35,
  },
  header: {
    marginBottom: 30,
  },
  brand: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 35,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  heading: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.text,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
  },
  form: {
    gap: 19,
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
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.backgroundSoft,
  },
  toggle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: -2,
  },
  note: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  footer: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  signIn: {
    color: colors.primary,
    fontWeight: '800',
  },
});
