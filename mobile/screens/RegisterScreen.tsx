
import React, { useEffect, useState } from 'react';
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

const API_URL = 'https://zenimonies-banking.onrender.com/api/auth';

type RegistrationStep =
  | 'phone'
  | 'phoneOtp'
  | 'email'
  | 'emailOtp'
  | 'profile';

type RegistrationAccount = {
  id?: string;
  account_number?: string | null;
  account_name?: string;
  account_type?: string;
  currency?: string;
  balance?: string | number;
  status?: string;
};

type RegistrationSession = {
  success: boolean;
  token: string;
  user?: {
    id?: string;
    full_name?: string;
    first_name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  account?: RegistrationAccount;
  accounts?: RegistrationAccount[];
};

type RegisterScreenProps = {
  onRegistrationSuccess?: (
    session: RegistrationSession | null
  ) => void;
};

export default function RegisterScreen({
  onRegistrationSuccess,
}: RegisterScreenProps) {
  const [step, setStep] = useState<RegistrationStep>('phone');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // ============================================================
  // OTP RESEND COUNTDOWN
  // ============================================================

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = setInterval(() => {
      setResendSeconds((previous) =>
        Math.max(0, previous - 1)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  // ============================================================
  // API REQUEST HELPER
  // ============================================================

  const request = async (
    endpoint: string,
    body: Record<string, string>
  ) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    let data: any;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        'The server returned an invalid response.'
      );
    }

    if (!response.ok || data.success !== true) {
      const error: any = new Error(
        data.message ||
          'Something went wrong. Please try again.'
      );

      error.retryAfter = data.retry_after_seconds;
      throw error;
    }

    return data;
  };

  // ============================================================
  // ERROR HANDLER
  // ============================================================

  const handleError = (error: any) => {
    if (error.retryAfter) {
      setResendSeconds(Number(error.retryAfter));
    }

    Alert.alert(
      'Registration',
      error.message ||
        'Unable to complete this step. Please try again.'
    );
  };

  // ============================================================
  // PHONE VERIFICATION — STEP 1
  // ============================================================

  const startPhoneVerification = async () => {
    const cleanPhone = phone.trim();

    if (
      !/^(\+234|234|0)?[0-9\s()-]{10,15}$/.test(cleanPhone)
    ) {
      Alert.alert(
        'Invalid phone number',
        'Enter a valid Nigerian phone number, for example 08012345678.'
      );
      return;
    }

    setLoading(true);

    try {
      const data = await request('/registration/phone', {
        phone: cleanPhone,
      });

      setOtp('');
      setStep('phoneOtp');
      setResendSeconds(60);

      if (data.development_otp) {
        Alert.alert(
          'Development verification code',
          `Your test code is ${data.development_otp}`
        );
      } else {
        Alert.alert(
          'Code sent',
          'A verification code has been sent to your phone.'
        );
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PHONE VERIFICATION — STEP 2
  // ============================================================

  const verifyPhone = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      Alert.alert(
        'Invalid code',
        'Enter the six-digit code sent to your phone.'
      );
      return;
    }

    setLoading(true);

    try {
      await request('/registration/phone/verify', {
        phone: phone.trim(),
        otp: otp.trim(),
      });

      setPhoneVerified(true);
      setOtp('');
      setResendSeconds(0);
      setStep('email');

      Alert.alert(
        'Phone verified',
        'Your phone number has been verified successfully.'
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // EMAIL VERIFICATION — STEP 3
  // ============================================================

  const startEmailVerification = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert(
        'Invalid email',
        'Please enter a valid email address.'
      );
      return;
    }

    if (!phoneVerified) {
      Alert.alert(
        'Phone verification required',
        'Please verify your phone number first.'
      );
      return;
    }

    setLoading(true);

    try {
      const data = await request('/registration/email', {
        phone: phone.trim(),
        email: cleanEmail,
      });

      setEmail(cleanEmail);
      setOtp('');
      setStep('emailOtp');
      setResendSeconds(60);

      if (data.development_otp) {
        Alert.alert(
          'Development verification code',
          `Your test code is ${data.development_otp}`
        );
      } else {
        Alert.alert(
          'Email code sent',
          'Check your inbox for your ZENIMONIES verification code.'
        );
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // EMAIL VERIFICATION — STEP 4
  // ============================================================

  const verifyEmail = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      Alert.alert(
        'Invalid code',
        'Enter the six-digit code sent to your email.'
      );
      return;
    }

    setLoading(true);

    try {
      await request('/registration/email/verify', {
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      setEmailVerified(true);
      setOtp('');
      setResendSeconds(0);
      setStep('profile');

      Alert.alert(
        'Email verified',
        'Your email address has been verified. Complete your profile to create your account.'
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RESEND VERIFICATION CODE
  // ============================================================

  const resendCode = async () => {
    if (resendSeconds > 0 || loading) return;

    setLoading(true);

    try {
      const endpoint =
        step === 'phoneOtp'
          ? '/registration/phone'
          : '/registration/email';

const body: Record<string, string> =
  step === 'phoneOtp'
    ? { phone: phone.trim() }
    : {
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      };

      const data = await request(endpoint, body);

      setResendSeconds(60);
      setOtp('');

      if (data.development_otp) {
        Alert.alert(
          'Development verification code',
          `Your test code is ${data.development_otp}`
        );
      } else {
        Alert.alert(
          'Code resent',
          'A new verification code has been sent.'
        );
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // COMPLETE REGISTRATION — STEP 5
  // ============================================================

  const completeRegistration = async () => {
    if (!phoneVerified || !emailVerified) {
      Alert.alert(
        'Verification required',
        'Both your phone number and email address must be verified.'
      );
      return;
    }

    const cleanFirstName = firstName.trim();
    const cleanMiddleName = middleName.trim();
    const cleanSurname = surname.trim();

    if (
      cleanFirstName.length < 2 ||
      cleanSurname.length < 2
    ) {
      Alert.alert(
        'Name required',
        'Enter your first name and surname. Both must contain at least two characters.'
      );
      return;
    }

    if (password.length < 8 || password.length > 128) {
      Alert.alert(
        'Invalid password',
        'Your password must contain between 8 and 128 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password mismatch',
        'Your passwords do not match.'
      );
      return;
    }

    setLoading(true);

    try {
      const data = await request(
        '/registration/complete',
        {
          phone: phone.trim(),
          first_name: cleanFirstName,
          middle_name: cleanMiddleName,
          surname: cleanSurname,
          password,
        }
      );

      // The account has been created successfully.
      // Do not repeat registration if session creation fails.
      setPassword('');
      setConfirmPassword('');
      setOtp('');

      const registrationSession: RegistrationSession | null =
        data.token && data.login_required !== true
          ? {
              success: true,
              token: data.token,
              user: data.user,
              account: data.account || undefined,
              accounts:
                data.accounts ||
                (data.account ? [data.account] : []),
            }
          : null;

      Alert.alert(
        'Welcome to ZENIMONIES',
        data.login_required === true || !data.token
          ? 'Your account has been created successfully. Please log in to continue.'
          : 'Your account has been created successfully. Your secure session is ready.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (onRegistrationSuccess) {
                onRegistrationSuccess(registrationSession);
              } else {
                Alert.alert(
                  'Registration complete',
                  'Please return to the login screen to continue.'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STEP INFORMATION
  // ============================================================

  const stepNumber = {
    phone: 1,
    phoneOtp: 2,
    email: 3,
    emailOtp: 4,
    profile: 5,
  }[step];

  const heading = {
    phone: 'Verify your phone',
    phoneOtp: 'Enter phone code',
    email: 'Verify your email',
    emailOtp: 'Enter email code',
    profile: 'Create your profile',
  }[step];

  const description = {
    phone: 'Start with your Nigerian mobile number.',
    phoneOtp: 'Enter the six-digit code sent to your phone.',
    email: 'Add an email address you can access.',
    emailOtp: 'Enter the six-digit code sent to your inbox.',
    profile: 'A few more details and your account will be ready.',
  }[step];

  // ============================================================
  // REUSABLE INPUT FIELD
  // ============================================================

  const renderField = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    options: {
      keyboardType?:
        | 'default'
        | 'email-address'
        | 'phone-pad'
        | 'number-pad';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'sentences' | 'words';
      maxLength?: number;
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
        maxLength={options.maxLength}
        autoCorrect={false}
      />
    </View>
  );

  // ============================================================
  // SCREEN
  // ============================================================

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

          <Text style={styles.eyebrow}>
            PERSONAL BANKING
          </Text>

          <Text style={styles.heading}>{heading}</Text>

          <Text style={styles.description}>
            {description}
          </Text>
        </View>

        <View style={styles.progressArea}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              STEP {stepNumber} OF 5
            </Text>

            <Text style={styles.progressText}>
              {stepNumber * 20}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${stepNumber * 20}%` },
              ]}
            />
          </View>

          <View style={styles.steps}>
            {[
              'Phone',
              'Phone OTP',
              'Email',
              'Email OTP',
              'Profile',
            ].map((item, index) => (
              <View key={item} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    index < stepNumber &&
                      styles.stepDotActive,
                  ]}
                />

                <Text
                  style={[
                    styles.stepLabel,
                    index < stepNumber &&
                      styles.stepLabelActive,
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.form}>
          {/* PHONE */}

          {step === 'phone' && (
            <>
              {renderField(
                'Nigerian phone number',
                phone,
                setPhone,
                '08012345678',
                {
                  keyboardType: 'phone-pad',
                  maxLength: 15,
                }
              )}

              <Text style={styles.note}>
                We will send a one-time verification code to this number.
              </Text>

              <PrimaryButton
                title="Send verification code"
                onPress={startPhoneVerification}
                loading={loading}
              />
            </>
          )}

          {/* PHONE OTP */}

          {step === 'phoneOtp' && (
            <>
              <View style={styles.verifiedInfo}>
                <Text style={styles.verifiedText}>
                  Verifying: {phone}
                </Text>
              </View>

              {renderField(
                'Six-digit phone code',
                otp,
                setOtp,
                '000000',
                {
                  keyboardType: 'number-pad',
                  maxLength: 6,
                }
              )}

              <PrimaryButton
                title="Verify phone number"
                onPress={verifyPhone}
                loading={loading}
              />

              <Text style={styles.resend}>
                Didn't receive a code?
                {' '}
                {resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : ''}
              </Text>

              {resendSeconds === 0 && (
                <Text
                  style={styles.link}
                  onPress={resendCode}
                >
                  Resend verification code
                </Text>
              )}
            </>
          )}

          {/* EMAIL */}

          {step === 'email' && (
            <>
              <View style={styles.verifiedInfo}>
                <Text style={styles.verifiedText}>
                  ✓ Phone number verified
                </Text>
              </View>

              {renderField(
                'Email address',
                email,
                setEmail,
                'you@example.com',
                {
                  keyboardType: 'email-address',
                  autoCapitalize: 'none',
                }
              )}

              <Text style={styles.note}>
                Your email will be used for account notifications and security verification.
              </Text>

              <PrimaryButton
                title="Send email verification code"
                onPress={startEmailVerification}
                loading={loading}
              />
            </>
          )}

          {/* EMAIL OTP */}

          {step === 'emailOtp' && (
            <>
              <View style={styles.verifiedInfo}>
                <Text style={styles.verifiedText}>
                  ✓ Phone verified: {phone}
                </Text>

                <Text style={styles.verifiedText}>
                  Email: {email}
                </Text>
              </View>

              {renderField(
                'Six-digit email code',
                otp,
                setOtp,
                '000000',
                {
                  keyboardType: 'number-pad',
                  maxLength: 6,
                }
              )}

              <PrimaryButton
                title="Verify email address"
                onPress={verifyEmail}
                loading={loading}
              />

              <Text style={styles.resend}>
                Didn't receive a code?
                {' '}
                {resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : ''}
              </Text>

              {resendSeconds === 0 && (
                <Text
                  style={styles.link}
                  onPress={resendCode}
                >
                  Resend email code
                </Text>
              )}
            </>
          )}

          {/* PROFILE */}

          {step === 'profile' && (
            <>
              <View style={styles.verifiedInfo}>
                <Text style={styles.verifiedText}>
                  ✓ Phone verified
                </Text>

                <Text style={styles.verifiedText}>
                  ✓ Email verified
                </Text>
              </View>

              {renderField(
                'First name',
                firstName,
                setFirstName,
                'Enter your first name'
              )}

              {renderField(
                'Middle name (optional)',
                middleName,
                setMiddleName,
                'Enter your middle name'
              )}

              {renderField(
                'Surname',
                surname,
                setSurname,
                'Enter your surname'
              )}

              <View style={styles.field}>
                <Text style={styles.label}>
                  Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a secure password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text
                  style={styles.link}
                  onPress={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword
                    ? 'Hide password'
                    : 'Show password'}
                </Text>
              </View>

              {renderField(
                'Confirm password',
                confirmPassword,
                setConfirmPassword,
                'Enter your password again',
                {
                  secureTextEntry: !showPassword,
                  autoCapitalize: 'none',
                }
              )}

              <Text style={styles.note}>
                Your personal account will be created in Nigerian Naira (NGN).
                You can complete additional identity verification from your profile.
              </Text>

              <PrimaryButton
                title="Create my account"
                onPress={completeRegistration}
                loading={loading}
              />
            </>
          )}

          <Text style={styles.securityNote}>
            SECURE REGISTRATION • ZENIMONIES BANKING
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 35,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 25,
  },
  brand: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 30,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  heading: {
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '900',
    color: colors.text,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },
  progressArea: {
    marginBottom: 30,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 9,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.backgroundSoft,
  },
  note: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  verifiedInfo: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    gap: 6,
  },
  verifiedText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  resend: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 5,
  },
  securityNote: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: 15,
  },
});
