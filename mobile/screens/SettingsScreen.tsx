
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useTheme,
  ThemePreference,
} from '../theme/ThemeContext';

// ============================================================
// ZENIMONIES BANKING — MOBILE SETTINGS
// ============================================================

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
  token: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  data?: any;
  passcode?: PasscodeStatus;
  failed_attempts?: number;
  remaining_attempts?: number;
  max_failed_attempts?: number;
  locked_until?: string | null;
  preferences?: SmsPreferences;
  settings?: any;
  wallet?: any;
};

type PasscodeStatus = {
  exists: boolean;
  failed_attempts: number;
  max_failed_attempts: number;
  locked: boolean;
  locked_until: string | null;
  last_used_at: string | null;
  created_at: string | null;
};

type TransactionPinStatus = {
  exists: boolean;
  failedAttempts: number;
  maxFailedAttempts: number;
  locked: boolean;
  lockedUntil: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
};

type SmsPreferences = {
  transaction_alerts: boolean;
  security_alerts: boolean;
  promotional_alerts: boolean;
};

type SupportCategory = {
  id: string | number;
  name: string;
  description?: string;
};

type SectionKey =
  | 'account'
  | 'payments'
  | 'security'
  | 'savings'
  | 'preferences'
  | 'support'
  | 'actions';

type PanelKey =
  | 'profile'
  | 'transaction-pin'
  | 'login-settings'
  | 'security-question'
  | 'security-center'
  | 'savings'
  | 'sms'
  | 'theme'
  | 'feedback'
  | 'about'
  | 'close-account';

const DEFAULT_SMS: SmsPreferences = {
  transaction_alerts: true,
  security_alerts: true,
  promotional_alerts: false,
};

const SECTION_ITEMS: {
  key: SectionKey;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    key: 'account',
    title: 'ACCOUNT',
    description: 'Manage your personal account',
    icon: '👤',
  },
  {
    key: 'payments',
    title: 'PAYMENTS',
    description: 'Manage your payment security',
    icon: '💳',
  },
  {
    key: 'security',
    title: 'LOGIN & SECURITY',
    description: 'Protect your account and login',
    icon: '🔐',
  },
  {
    key: 'savings',
    title: 'SAVINGS',
    description: 'Manage your Save Wallet settings',
    icon: '💰',
  },
  {
    key: 'preferences',
    title: 'PREFERENCES',
    description: 'Manage alerts and appearance',
    icon: '⚙️',
  },
  {
    key: 'support',
    title: 'SUPPORT',
    description: 'Get assistance from Zenimonies',
    icon: '💬',
  },
  {
    key: 'actions',
    title: 'ACCOUNT ACTIONS',
    description: 'Manage your account access',
    icon: '📋',
  },
];

// ============================================================
// HELPERS
// ============================================================

async function apiRequest<T = ApiResponse>(
  endpoint: string,
  token: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: Record<string, any>,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let data: any = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data?.success === false) {
    const error: any = new Error(
      data?.message ||
        `Request failed (${response.status}). Please try again.`,
    );

    error.code = data?.code;
    error.response = data;

    throw error;
  }

  return data as T;
}

function getErrorMessage(error: any): string {
  return (
    error?.response?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString();
}

function normalizePasscodeStatus(
  data: any,
): PasscodeStatus | null {
  const source = data?.passcode || data?.data?.passcode || data;

  if (
    !source ||
    typeof source.exists !== 'boolean'
  ) {
    return null;
  }

  return {
    exists: Boolean(source.exists),
    failed_attempts: Number(
      source.failed_attempts ??
        source.failedAttempts ??
        0,
    ),
    max_failed_attempts: Number(
      source.max_failed_attempts ??
        source.maxFailedAttempts ??
        3,
    ),
    locked: Boolean(source.locked),
    locked_until:
      source.locked_until ??
      source.lockedUntil ??
      null,
    last_used_at:
      source.last_used_at ??
      source.lastUsedAt ??
      null,
    created_at:
      source.created_at ??
      source.createdAt ??
      null,
  };
}

function normalizeTransactionPinStatus(
  data: any,
): TransactionPinStatus | null {
  const source =
    data?.transactionPin ||
    data?.transaction_pin ||
    data?.data?.transactionPin ||
    data?.data?.transaction_pin ||
    data;

  if (!source || typeof source.exists !== 'boolean') {
    return null;
  }

  return {
    exists: Boolean(source.exists),
    failedAttempts: Number(
      source.failedAttempts ??
        source.failed_attempts ??
        0,
    ),
    maxFailedAttempts: Number(
      source.maxFailedAttempts ??
        source.max_failed_attempts ??
        3,
    ),
    locked: Boolean(source.locked),
    lockedUntil:
      source.lockedUntil ??
      source.locked_until ??
      null,
    lastUsedAt:
      source.lastUsedAt ??
      source.last_used_at ??
      null,
    createdAt:
      source.createdAt ??
      source.created_at ??
      null,
  };
}

function normalizeSmsPreferences(
  data: any,
): SmsPreferences {
  const source =
    data?.preferences ||
    data?.data?.preferences ||
    data?.data ||
    data;

  return {
    transaction_alerts:
      typeof source?.transaction_alerts === 'boolean'
        ? source.transaction_alerts
        : DEFAULT_SMS.transaction_alerts,

    security_alerts:
      typeof source?.security_alerts === 'boolean'
        ? source.security_alerts
        : DEFAULT_SMS.security_alerts,

    promotional_alerts:
      typeof source?.promotional_alerts === 'boolean'
        ? source.promotional_alerts
        : DEFAULT_SMS.promotional_alerts,
  };
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function SettingsScreen({
  onBack,
  onLogout,
  token,
}: SettingsScreenProps) {
  const { colors, preference, setPreference } = useTheme();

  const [activeSection, setActiveSection] =
    useState<SectionKey | null>(null);

  const [activePanel, setActivePanel] =
    useState<PanelKey | null>(null);

  const [loading, setLoading] = useState(false);

  const [passcodeStatus, setPasscodeStatus] =
    useState<PasscodeStatus | null>(null);

  const [transactionPinStatus, setTransactionPinStatus] =
    useState<TransactionPinStatus | null>(null);

  const [passcodeLoading, setPasscodeLoading] =
    useState(false);

  const [transactionPinLoading, setTransactionPinLoading] =
    useState(false);

  const [passcodeForm, setPasscodeForm] = useState({
    current: '',
    newPasscode: '',
    confirm: '',
  });

  const [transactionPinForm, setTransactionPinForm] =
    useState({
      current: '',
      newPin: '',
      confirm: '',
    });

  const [savingPasscode, setSavingPasscode] =
    useState(false);

  const [savingTransactionPin, setSavingTransactionPin] =
    useState(false);

  const [spendSaveEnabled, setSpendSaveEnabled] =
    useState(false);

  const [spendSaveAmount, setSpendSaveAmount] =
    useState('');

  const [savingsLoading, setSavingsLoading] =
    useState(false);

  const [savingSavings, setSavingSavings] =
    useState(false);

  const [smsPreferences, setSmsPreferences] =
    useState<SmsPreferences>(DEFAULT_SMS);

  const [smsLoading, setSmsLoading] =
    useState(false);

  const [savingSms, setSavingSms] =
    useState(false);

  const [supportCategories, setSupportCategories] =
    useState<SupportCategory[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<string>('');

  const [feedbackSubject, setFeedbackSubject] =
    useState('');

  const [feedbackDescription, setFeedbackDescription] =
    useState('');

  const [feedbackLoading, setFeedbackLoading] =
    useState(false);

  const [feedbackSubmitting, setFeedbackSubmitting] =
    useState(false);

  const isDark = preference === 'dark';

  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  // ----------------------------------------------------------
  // PASSCODE STATUS
  // ----------------------------------------------------------

  const loadPasscodeStatus = useCallback(async () => {
    if (!token) return;

    setPasscodeLoading(true);

    try {
      const data = await apiRequest<ApiResponse>(
        '/passcode/status',
        token,
      );

      const status = normalizePasscodeStatus(data);

      if (status) {
        setPasscodeStatus(status);
      }
    } catch (error) {
      console.warn(
        'Unable to load Account Unlock Passcode status:',
        getErrorMessage(error),
      );
    } finally {
      setPasscodeLoading(false);
    }
  }, [token]);

  // ----------------------------------------------------------
  // TRANSACTION PIN STATUS
  // ----------------------------------------------------------

  const loadTransactionPinStatus =
    useCallback(async () => {
      if (!token) return;

      setTransactionPinLoading(true);

      try {
        const data = await apiRequest<ApiResponse>(
          '/transaction-pin/status',
          token,
        );

        const status =
          normalizeTransactionPinStatus(data);

        if (status) {
          setTransactionPinStatus(status);
        }
      } catch (error) {
        console.warn(
          'Unable to load Transaction PIN status:',
          getErrorMessage(error),
        );
      } finally {
        setTransactionPinLoading(false);
      }
    }, [token]);

  useEffect(() => {
    loadPasscodeStatus();
    loadTransactionPinStatus();
  }, [
    loadPasscodeStatus,
    loadTransactionPinStatus,
  ]);

  // ----------------------------------------------------------
  // SAVINGS SETTINGS
  // ----------------------------------------------------------

  const loadSavingsSettings = useCallback(async () => {
    if (!token) return;

    setSavingsLoading(true);

    try {
      const data = await apiRequest<ApiResponse>(
        '/wallet/settings',
        token,
      );

      const source =
        data?.settings ||
        data?.data?.settings ||
        data?.data ||
        data;

      const enabled =
        source?.spendSaveEnabled ??
        source?.spend_save_enabled;

      const amount =
        source?.spendSaveAmount ??
        source?.spend_save_amount;

      setSpendSaveEnabled(Boolean(enabled));

      setSpendSaveAmount(
        amount === null || amount === undefined
          ? ''
          : String(amount),
      );
    } catch (error) {
      Alert.alert(
        'Savings Settings',
        getErrorMessage(error),
      );
    } finally {
      setSavingsLoading(false);
    }
  }, [token]);

  const saveSavingsSettings = async () => {
    if (savingSavings) return;

    const parsedAmount = Number(spendSaveAmount);

    if (
      spendSaveEnabled &&
      (!spendSaveAmount.trim() ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0)
    ) {
      Alert.alert(
        'Invalid Amount',
        'Enter a valid Spend + Save amount greater than zero.',
      );
      return;
    }

    setSavingSavings(true);

    try {
      await apiRequest(
        '/wallet/settings',
        token,
        'PUT',
        {
          enabled: spendSaveEnabled,
          amount: spendSaveAmount.trim()
            ? parsedAmount
            : 0,
        },
      );

      Alert.alert(
        'Settings Updated',
        'Your Spend + Save settings have been saved.',
      );
    } catch (error) {
      Alert.alert(
        'Unable to Save',
        getErrorMessage(error),
      );
    } finally {
      setSavingSavings(false);
    }
  };

  // ----------------------------------------------------------
  // SMS PREFERENCES
  // ----------------------------------------------------------

  const loadSmsPreferences = useCallback(async () => {
    if (!token) return;

    setSmsLoading(true);

    try {
      const data = await apiRequest<ApiResponse>(
        '/sms-preferences',
        token,
      );

      setSmsPreferences(
        normalizeSmsPreferences(data),
      );
    } catch (error) {
      Alert.alert(
        'SMS Preferences',
        getErrorMessage(error),
      );
    } finally {
      setSmsLoading(false);
    }
  }, [token]);

  const updateSmsPreference = async (
    key: keyof SmsPreferences,
    value: boolean,
  ) => {
    const previous = smsPreferences;

    const updated = {
      ...smsPreferences,
      [key]: value,
    };

    setSmsPreferences(updated);
    setSavingSms(true);

    try {
      await apiRequest(
        '/sms-preferences',
        token,
        'PUT',
        updated,
      );
    } catch (error) {
      setSmsPreferences(previous);

      Alert.alert(
        'Unable to Update Preferences',
        getErrorMessage(error),
      );
    } finally {
      setSavingSms(false);
    }
  };

  // ----------------------------------------------------------
  // CUSTOMER CARE / FEEDBACK
  // ----------------------------------------------------------

  const loadSupportCategories =
    useCallback(async () => {
      if (!token) return;

      setFeedbackLoading(true);

      try {
        const data = await apiRequest<ApiResponse>(
          '/support/categories',
          token,
        );

        const rawCategories =
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.data?.categories)
              ? data.data.categories
              : [];

        const categories: SupportCategory[] =
          rawCategories
            .filter(
              (item: any) =>
                item?.id !== undefined &&
                item?.name,
            )
            .map((item: any) => ({
              id: item.id,
              name: String(item.name),
              description: item.description,
            }));

        setSupportCategories(categories);

        if (categories.length > 0) {
          const other = categories.find(
            item =>
              item.name.toLowerCase() === 'other',
          );

          setSelectedCategory(
            String((other || categories[0]).id),
          );
        }
      } catch (error) {
        Alert.alert(
          'Customer Care',
          getErrorMessage(error),
        );
      } finally {
        setFeedbackLoading(false);
      }
    }, [token]);

  const submitFeedback = async () => {
    if (feedbackSubmitting) return;

    if (!selectedCategory) {
      Alert.alert(
        'Select a Category',
        'Please select a support category.',
      );
      return;
    }

    if (!feedbackSubject.trim()) {
      Alert.alert(
        'Subject Required',
        'Please enter a subject for your message.',
      );
      return;
    }

    if (!feedbackDescription.trim()) {
      Alert.alert(
        'Message Required',
        'Please describe how we can help you.',
      );
      return;
    }

    setFeedbackSubmitting(true);

    try {
      const data = await apiRequest<ApiResponse>(
        '/support/tickets',
        token,
        'POST',
        {
          category_id: selectedCategory,
          subject: feedbackSubject.trim(),
          description: feedbackDescription.trim(),
          priority: 'normal',
        },
      );

      const ticket = data?.data || {};

      const reference =
        ticket.ticket_number ||
        ticket.ticketNumber ||
        ticket.reference ||
        ticket.id;

      setFeedbackSubject('');
      setFeedbackDescription('');

      Alert.alert(
        'Message Submitted',
        reference
          ? `Your support request has been submitted successfully.\n\nReference: ${reference}`
          : 'Your support request has been submitted successfully. Our Customer Care team can assist you.',
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        getErrorMessage(error),
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // ACCOUNT UNLOCK PASSCODE
  // ----------------------------------------------------------

  const submitPasscode = async () => {
    if (savingPasscode) return;

    const { current, newPasscode, confirm } =
      passcodeForm;

    if (!/^\d{6}$/.test(newPasscode)) {
      Alert.alert(
        'Invalid Passcode',
        'Your Account Unlock Passcode must contain exactly six digits.',
      );
      return;
    }

    if (newPasscode !== confirm) {
      Alert.alert(
        'Passcodes Do Not Match',
        'Please make sure both passcodes match.',
      );
      return;
    }

    if (
      passcodeStatus?.exists &&
      !/^\d{6}$/.test(current)
    ) {
      Alert.alert(
        'Current Passcode Required',
        'Enter your existing six-digit Account Unlock Passcode.',
      );
      return;
    }

    setSavingPasscode(true);

    try {
      if (passcodeStatus?.exists) {
        await apiRequest(
          '/passcode/change',
          token,
          'POST',
          {
            current_passcode: current,
            new_passcode: newPasscode,
            confirm_passcode: confirm,
          },
        );
      } else {
        await apiRequest(
          '/passcode/setup',
          token,
          'POST',
          {
            passcode: newPasscode,
            confirm_passcode: confirm,
          },
        );
      }

      setPasscodeForm({
        current: '',
        newPasscode: '',
        confirm: '',
      });

      await loadPasscodeStatus();

      Alert.alert(
        'Success',
        passcodeStatus?.exists
          ? 'Your Account Unlock Passcode has been changed.'
          : 'Your Account Unlock Passcode has been set up successfully.',
      );
    } catch (error: any) {
      const response = error?.response || {};

      if (
        error?.code === 'INCORRECT_PASSCODE' ||
        response?.code === 'INCORRECT_PASSCODE'
      ) {
        const remaining =
          response?.remaining_attempts ??
          response?.remainingAttempts;

        Alert.alert(
          'Incorrect Passcode',
          remaining !== undefined
            ? `The current passcode is incorrect. Remaining attempts: ${remaining}.`
            : getErrorMessage(error),
        );
      } else if (
        error?.code === 'PASSCODE_LOCKED' ||
        response?.code === 'PASSCODE_LOCKED'
      ) {
        Alert.alert(
          'Passcode Locked',
          'Your Account Unlock Passcode is temporarily locked. Please try again after the lock period.',
        );

        await loadPasscodeStatus();
      } else {
        Alert.alert(
          'Passcode Error',
          getErrorMessage(error),
        );
      }
    } finally {
      setSavingPasscode(false);
    }
  };

  // ----------------------------------------------------------
  // TRANSACTION PIN
  // ----------------------------------------------------------

  const submitTransactionPin = async () => {
    if (savingTransactionPin) return;

    const { current, newPin, confirm } =
      transactionPinForm;

    if (!/^\d{4}$/.test(newPin)) {
      Alert.alert(
        'Invalid Transaction PIN',
        'Your Transaction PIN must contain exactly four digits.',
      );
      return;
    }

    if (newPin !== confirm) {
      Alert.alert(
        'PINs Do Not Match',
        'Please make sure both PIN entries match.',
      );
      return;
    }

    if (
      transactionPinStatus?.exists &&
      !/^\d{4}$/.test(current)
    ) {
      Alert.alert(
        'Current PIN Required',
        'Enter your existing four-digit Transaction PIN.',
      );
      return;
    }

    setSavingTransactionPin(true);

    try {
      if (transactionPinStatus?.exists) {
        await apiRequest(
          '/transaction-pin/change',
          token,
          'POST',
          {
            currentPin: current,
            newPin,
            confirmPin: confirm,
          },
        );
      } else {
        await apiRequest(
          '/transaction-pin/setup',
          token,
          'POST',
          {
            pin: newPin,
            confirmPin: confirm,
          },
        );
      }

      setTransactionPinForm({
        current: '',
        newPin: '',
        confirm: '',
      });

      await loadTransactionPinStatus();

      Alert.alert(
        'Success',
        transactionPinStatus?.exists
          ? 'Your Transaction PIN has been changed successfully.'
          : 'Your Transaction PIN has been set up successfully.',
      );
    } catch (error: any) {
      const response = error?.response || {};

      if (
        response?.code === 'PIN_LOCKED' ||
        error?.code === 'PIN_LOCKED'
      ) {
        Alert.alert(
          'Transaction PIN Locked',
          'Your Transaction PIN is temporarily locked. Please try again after the lock period.',
        );

        await loadTransactionPinStatus();
      } else {
        Alert.alert(
          'Transaction PIN Error',
          getErrorMessage(error),
        );
      }
    } finally {
      setSavingTransactionPin(false);
    }
  };

  // ----------------------------------------------------------
  // NAVIGATION / PANELS
  // ----------------------------------------------------------

  const openSection = (section: SectionKey) => {
    setActiveSection(previous =>
      previous === section ? null : section,
    );
    setActivePanel(null);
  };

  const openPanel = (panel: PanelKey) => {
    setActivePanel(panel);

    if (panel === 'profile') {
      Alert.alert(
        'My Profile',
        'Your personal information is managed from the Profile section of the app.',
      );
    }

    if (panel === 'transaction-pin') {
      loadTransactionPinStatus();
    }

    if (panel === 'login-settings') {
      loadPasscodeStatus();
    }

    if (panel === 'savings') {
      loadSavingsSettings();
    }

    if (panel === 'sms') {
      loadSmsPreferences();
    }

    if (panel === 'feedback') {
      loadSupportCategories();
    }

    if (panel === 'close-account') {
      Alert.alert(
        'Close Account',
        'For account closure assistance, please contact Zenimonies Customer Care so your request can be reviewed securely.',
      );
    }
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Zenimonies account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ],
    );
  };

  // ----------------------------------------------------------
  // REUSABLE UI
  // ----------------------------------------------------------

  const renderMenuItem = (
    title: string,
    description: string,
    onPress: () => void,
    trailing?: string,
  ) => (
    <TouchableOpacity
      key={title}
      style={styles.menuItem}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>
          {description}
        </Text>
      </View>

      {trailing ? (
        <Text style={styles.menuTrailing}>
          {trailing}
        </Text>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );

  const renderButton = (
    title: string,
    onPress: () => void,
    busy = false,
    disabled = false,
  ) => (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        disabled && styles.disabledButton,
      ]}
      activeOpacity={0.8}
      disabled={disabled || busy}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryButtonText}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    options?: {
      secure?: boolean;
      numeric?: boolean;
      placeholder?: string;
      multiline?: boolean;
    },
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          options?.multiline && styles.multilineInput,
        ]}
        placeholder={
          options?.placeholder || label
        }
        placeholderTextColor={colors.textMuted}
        secureTextEntry={Boolean(options?.secure)}
        keyboardType={
          options?.numeric
            ? 'number-pad'
            : 'default'
        }
        maxLength={
          options?.numeric
            ? 6
            : undefined
        }
        multiline={Boolean(options?.multiline)}
        textAlignVertical={
          options?.multiline ? 'top' : 'center'
        }
        autoCapitalize="none"
      />
    </View>
  );

  const renderStatus = (
    label: string,
    value: string,
    good = false,
  ) => (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>

      <Text
        style={[
          styles.statusValue,
          good && styles.goodStatus,
        ]}
      >
        {value}
      </Text>
    </View>
  );

  const renderSwitch = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
  ) => (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.border,
          true: colors.primaryLight,
        }}
        thumbColor={
          value ? colors.primary : '#F4F4F4'
        }
      />
    </View>
  );

  // ----------------------------------------------------------
  // SECTION CONTENT
  // ----------------------------------------------------------

  const renderSectionContent = (
    section: SectionKey,
  ) => {
    switch (section) {
      case 'account':
        return renderMenuItem(
          'My Profile',
          'View and manage your personal information',
          () => openPanel('profile'),
        );

      case 'payments':
        return renderMenuItem(
          'Payment Settings',
          'Set up or change your Transaction PIN',
          () => openPanel('transaction-pin'),
          transactionPinStatus?.exists
            ? 'Protected'
            : undefined,
        );

      case 'security':
        return (
          <>
            {renderMenuItem(
              'Login Settings',
              'Password recovery and Account Unlock Passcode',
              () => openPanel('login-settings'),
            )}

            {renderMenuItem(
              'Security Question',
              'Security question information',
              () => openPanel('security-question'),
            )}

            {renderMenuItem(
              'Security Center',
              'Review your account security status',
              () => openPanel('security-center'),
            )}
          </>
        );

      case 'savings':
        return renderMenuItem(
          'Saving Settings',
          'Manage your Spend + Save preferences',
          () => openPanel('savings'),
        );

      case 'preferences':
        return (
          <>
            {renderMenuItem(
              'SMS Alert Settings',
              'Choose the SMS alerts you receive',
              () => openPanel('sms'),
            )}

            {renderMenuItem(
              'Themes',
              'Choose your app appearance',
              () => openPanel('theme'),
              preference === 'system'
                ? 'System'
                : preference === 'dark'
                  ? 'Dark'
                  : 'Light',
            )}
          </>
        );

      case 'support':
        return (
          <>
            {renderMenuItem(
              'Feedback and Suggestions',
              'Send a message to Customer Care',
              () => openPanel('feedback'),
            )}

            {renderMenuItem(
              'About',
              'Information about Zenimonies Banking',
              () => openPanel('about'),
            )}
          </>
        );

      case 'actions':
        return (
          <>
            {renderMenuItem(
              'Log Out',
              'Securely sign out of your account',
              confirmLogout,
            )}

            {renderMenuItem(
              'Close Account',
              'Contact Customer Care about account closure',
              () => openPanel('close-account'),
            )}
          </>
        );

      default:
        return null;
    }
  };

  // ----------------------------------------------------------
  // PANEL CONTENT
  // ----------------------------------------------------------

  const renderPanelContent = () => {
    if (!activePanel) return null;

    switch (activePanel) {
      case 'profile':
        return (
          <View style={styles.infoBox}>
            <Text style={styles.bodyText}>
              Your personal information is managed from
              the Profile section of the Zenimonies app.
            </Text>
          </View>
        );

      case 'transaction-pin':
        return (
          <>
            <Text style={styles.bodyText}>
              Your Transaction PIN is a separate
              four-digit security credential used to
              protect payment and transaction actions.
              It is not your Account Unlock Passcode.
            </Text>

            {transactionPinLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : (
              <View style={styles.statusCard}>
                {renderStatus(
                  'Transaction PIN',
                  transactionPinStatus?.exists
                    ? 'Set up'
                    : 'Not set up',
                  Boolean(transactionPinStatus?.exists),
                )}

                {renderStatus(
                  'Security status',
                  transactionPinStatus?.locked
                    ? 'Temporarily locked'
                    : 'Active',
                  !transactionPinStatus?.locked,
                )}

                {renderStatus(
                  'Failed attempts',
                  String(
                    transactionPinStatus?.failedAttempts ?? 0,
                  ),
                )}

                {transactionPinStatus?.lockedUntil
                  ? renderStatus(
                      'Locked until',
                      formatDate(
                        transactionPinStatus.lockedUntil,
                      ),
                    )
                  : null}
              </View>
            )}

            {transactionPinStatus?.exists
              ? renderInput(
                  'Current Transaction PIN',
                  transactionPinForm.current,
                  value =>
                    setTransactionPinForm(previous => ({
                      ...previous,
                      current: value.replace(/\D/g, '').slice(0, 4),
                    })),
                  {
                    secure: true,
                    numeric: true,
                  },
                )
              : null}

            {renderInput(
              transactionPinStatus?.exists
                ? 'New Transaction PIN'
                : 'Create Transaction PIN',
              transactionPinForm.newPin,
              value =>
                setTransactionPinForm(previous => ({
                  ...previous,
                  newPin: value.replace(/\D/g, '').slice(0, 4),
                })),
              {
                secure: true,
                numeric: true,
              },
            )}

            {renderInput(
              'Confirm Transaction PIN',
              transactionPinForm.confirm,
              value =>
                setTransactionPinForm(previous => ({
                  ...previous,
                  confirm: value.replace(/\D/g, '').slice(0, 4),
                })),
              {
                secure: true,
                numeric: true,
              },
            )}

            {renderButton(
              transactionPinStatus?.exists
                ? 'Change Transaction PIN'
                : 'Set Up Transaction PIN',
              submitTransactionPin,
              savingTransactionPin,
              Boolean(transactionPinStatus?.locked),
            )}
          </>
        );

      case 'login-settings':
        return (
          <>
            <Text style={styles.subheading}>
              Account Unlock Passcode
            </Text>

            <Text style={styles.bodyText}>
              This six-digit passcode helps you unlock
              your Zenimonies app session. It is separate
              from your Transaction PIN and account password.
            </Text>

            {passcodeLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : (
              <View style={styles.statusCard}>
                {renderStatus(
                  'Passcode status',
                  passcodeStatus?.exists
                    ? 'Set up'
                    : 'Not set up',
                  Boolean(passcodeStatus?.exists),
                )}

                {renderStatus(
                  'Security status',
                  passcodeStatus?.locked
                    ? 'Temporarily locked'
                    : 'Active',
                  !passcodeStatus?.locked,
                )}

                {renderStatus(
                  'Failed attempts',
                  String(
                    passcodeStatus?.failed_attempts ?? 0,
                  ),
                )}

                {passcodeStatus?.locked_until
                  ? renderStatus(
                      'Locked until',
                      formatDate(
                        passcodeStatus.locked_until,
                      ),
                    )
                  : null}

                {passcodeStatus?.last_used_at
                  ? renderStatus(
                      'Last used',
                      formatDate(
                        passcodeStatus.last_used_at,
                      ),
                    )
                  : null}
              </View>
            )}

            {passcodeStatus?.exists
              ? renderInput(
                  'Current Account Unlock Passcode',
                  passcodeForm.current,
                  value =>
                    setPasscodeForm(previous => ({
                      ...previous,
                      current: value.replace(/\D/g, '').slice(0, 6),
                    })),
                  {
                    secure: true,
                    numeric: true,
                  },
                )
              : null}

            {renderInput(
              passcodeStatus?.exists
                ? 'New Account Unlock Passcode'
                : 'Create Account Unlock Passcode',
              passcodeForm.newPasscode,
              value =>
                setPasscodeForm(previous => ({
                  ...previous,
                  newPasscode: value.replace(/\D/g, '').slice(0, 6),
                })),
              {
                secure: true,
                numeric: true,
              },
            )}

            {renderInput(
              'Confirm Account Unlock Passcode',
              passcodeForm.confirm,
              value =>
                setPasscodeForm(previous => ({
                  ...previous,
                  confirm: value.replace(/\D/g, '').slice(0, 6),
                })),
              {
                secure: true,
                numeric: true,
              },
            )}

            {renderButton(
              passcodeStatus?.exists
                ? 'Change Account Unlock Passcode'
                : 'Set Up Account Unlock Passcode',
              submitPasscode,
              savingPasscode,
              Boolean(passcodeStatus?.locked),
            )}

            <View style={styles.divider} />

            <Text style={styles.subheading}>
              Password Recovery
            </Text>

            <Text style={styles.bodyText}>
              If you need to reset your account password,
              use the password recovery option on the
              Zenimonies login screen.
            </Text>
          </>
        );

      case 'security-question':
        return (
          <View style={styles.infoBox}>
            <Text style={styles.subheading}>
              Security Question
            </Text>

            <Text style={styles.bodyText}>
              Security questions are not currently
              connected to a confirmed backend service
              in this app. No security answer will be
              collected or saved from this screen.
            </Text>
          </View>
        );

      case 'security-center':
        return (
          <>
            <Text style={styles.bodyText}>
              Review the security credentials associated
              with your Zenimonies account.
            </Text>

            <View style={styles.statusCard}>
              {renderStatus(
                'Account password',
                'Password protected',
                true,
              )}

              {renderStatus(
                'Account Unlock Passcode',
                passcodeStatus?.exists
                  ? 'Set up'
                  : 'Not set up',
                Boolean(passcodeStatus?.exists),
              )}

              {renderStatus(
                'Transaction PIN',
                transactionPinStatus?.exists
                  ? 'Set up'
                  : 'Not set up',
                Boolean(transactionPinStatus?.exists),
              )}
            </View>

            <Text style={styles.bodyText}>
              Your account password, Account Unlock
              Passcode and Transaction PIN are separate
              credentials. Never share them with anyone.
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                loadPasscodeStatus();
                loadTransactionPinStatus();
              }}
            >
              <Text style={styles.secondaryButtonText}>
                Refresh Security Status
              </Text>
            </TouchableOpacity>
          </>
        );

      case 'savings':
        return (
          <>
            <Text style={styles.bodyText}>
              Configure Spend + Save to set aside a fixed
              amount when an eligible transfer is
              successfully completed.
            </Text>

            {savingsLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : (
              <>
                {renderSwitch(
                  'Enable Spend + Save',
                  'Turn automatic saving on or off',
                  spendSaveEnabled,
                  setSpendSaveEnabled,
                )}

                {renderInput(
                  'Amount to Save',
                  spendSaveAmount,
                  setSpendSaveAmount,
                  {
                    numeric: true,
                    placeholder: 'Enter amount',
                  },
                )}

                <View style={styles.infoBox}>
                  <Text style={styles.bodyText}>
                    Enabling this setting does not move
                    money immediately. The configured
                    amount is moved into your Save Wallet
                    only after an eligible successful
                    transfer.
                  </Text>
                </View>

                {renderButton(
                  'Save Savings Settings',
                  saveSavingsSettings,
                  savingSavings,
                )}
              </>
            )}
          </>
        );

      case 'sms':
        return (
          <>
            <Text style={styles.bodyText}>
              Choose which SMS notifications you would
              like to receive.
            </Text>

            {smsLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : (
              <>
                {renderSwitch(
                  'Transaction Alerts',
                  'Receive SMS notifications about transactions',
                  smsPreferences.transaction_alerts,
                  value =>
                    updateSmsPreference(
                      'transaction_alerts',
                      value,
                    ),
                )}

                {renderSwitch(
                  'Security Alerts',
                  'Receive important account security alerts',
                  smsPreferences.security_alerts,
                  value =>
                    updateSmsPreference(
                      'security_alerts',
                      value,
                    ),
                )}

                {renderSwitch(
                  'Promotional Alerts',
                  'Receive promotional and service updates',
                  smsPreferences.promotional_alerts,
                  value =>
                    updateSmsPreference(
                      'promotional_alerts',
                      value,
                    ),
                )}

                {savingSms ? (
                  <ActivityIndicator
                    color={colors.primary}
                    style={styles.loader}
                  />
                ) : null}
              </>
            )}
          </>
        );

      case 'theme':
        return (
          <>
            <Text style={styles.bodyText}>
              Select how the Zenimonies app should appear
              on your device.
            </Text>

            {(
              [
                ['system', 'System Default'],
                ['light', 'Light Mode'],
                ['dark', 'Dark Mode'],
              ] as [ThemePreference, string][]
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={styles.themeOption}
                onPress={() => setPreference(value)}
              >
                <Text style={styles.menuTitle}>
                  {label}
                </Text>

                <Text
                  style={[
                    styles.themeRadio,
                    preference === value &&
                      styles.themeRadioSelected,
                  ]}
                >
                  {preference === value ? '●' : '○'}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        );

      case 'feedback':
        return (
          <>
            <Text style={styles.bodyText}>
              Send your feedback or request assistance
              from the Zenimonies Customer Care team.
            </Text>

            {feedbackLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : (
              <>
                <Text style={styles.inputLabel}>
                  Support Category
                </Text>

                {supportCategories.length === 0 ? (
                  <Text style={styles.bodyText}>
                    No support categories are currently
                    available. Please try again later.
                  </Text>
                ) : (
                  <View style={styles.categoryList}>
                    {supportCategories.map(category => (
                      <TouchableOpacity
                        key={String(category.id)}
                        style={[
                          styles.categoryOption,
                          selectedCategory ===
                            String(category.id) &&
                            styles.categorySelected,
                        ]}
                        onPress={() =>
                          setSelectedCategory(
                            String(category.id),
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            selectedCategory ===
                              String(category.id) &&
                              styles.categoryTextSelected,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {renderInput(
                  'Subject',
                  feedbackSubject,
                  setFeedbackSubject,
                  {
                    placeholder: 'What do you need help with?',
                  },
                )}

                {renderInput(
                  'Message',
                  feedbackDescription,
                  setFeedbackDescription,
                  {
                    placeholder: 'Describe your request...',
                    multiline: true,
                  },
                )}

                <View style={styles.infoBox}>
                  <Text style={styles.bodyText}>
                    Never include your password, PIN, OTP,
                    CVV or other confidential login details
                    in a support message.
                  </Text>
                </View>

                {renderButton(
                  'Submit to Customer Care',
                  submitFeedback,
                  feedbackSubmitting,
                  supportCategories.length === 0,
                )}
              </>
            )}
          </>
        );

      case 'about':
        return (
          <View style={styles.aboutCard}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>Z</Text>
            </View>

            <Text style={styles.aboutName}>
              ZENIMONIES
            </Text>

            <Text style={styles.aboutSubtitle}>
              Digital Banking
            </Text>

            <View style={styles.divider} />

            {renderStatus('Application', 'ZENIMONIES Banking')}
            {renderStatus('Version', '1.0.0')}
            {renderStatus('Platform', 'Digital Banking')}
          </View>
        );

      case 'close-account':
        return (
          <View style={styles.infoBox}>
            <Text style={styles.subheading}>
              Account Closure Assistance
            </Text>

            <Text style={styles.bodyText}>
              Account closure requests require assistance
              from Zenimonies Customer Care. Please contact
              support so your account and any outstanding
              transactions can be reviewed securely.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* COMPACT GREEN HERO */}

        <View style={styles.hero}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>
              Account Settings
            </Text>

            <Text style={styles.heroDescription}>
              Manage your account, security and preferences.
            </Text>
          </View>

          <Text style={styles.heroIcon}>⚙</Text>
        </View>

        {/* SETTINGS SECTIONS */}

        {SECTION_ITEMS.map(section => {
          const expanded =
            activeSection === section.key;

          return (
            <View
              key={section.key}
              style={styles.sectionCard}
            >
              <TouchableOpacity
                style={styles.sectionHeader}
                activeOpacity={0.75}
                onPress={() =>
                  openSection(section.key)
                }
              >
                <View style={styles.sectionIcon}>
                  <Text style={styles.sectionIconText}>
                    {section.icon}
                  </Text>
                </View>

                <View style={styles.sectionText}>
                  <Text style={styles.sectionTitle}>
                    {section.title}
                  </Text>

                  <Text style={styles.sectionDescription}>
                    {section.description}
                  </Text>
                </View>

                <Text style={styles.sectionChevron}>
                  {expanded ? '−' : '+'}
                </Text>
              </TouchableOpacity>

              {expanded ? (
                <View style={styles.sectionContent}>
                  {renderSectionContent(section.key)}
                </View>
              ) : null}
            </View>
          );
        })}

        {/* SELECTED SETTINGS PANEL */}

        {activePanel ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                {activePanel === 'transaction-pin'
                  ? 'Payment Settings'
                  : activePanel === 'login-settings'
                    ? 'Login Settings'
                    : activePanel === 'security-question'
                      ? 'Security Question'
                      : activePanel === 'security-center'
                        ? 'Security Center'
                        : activePanel === 'savings'
                          ? 'Saving Settings'
                          : activePanel === 'sms'
                            ? 'SMS Alert Settings'
                            : activePanel === 'theme'
                              ? 'Themes'
                              : activePanel === 'feedback'
                                ? 'Feedback and Suggestions'
                                : activePanel === 'about'
                                  ? 'About'
                                  : activePanel === 'close-account'
                                    ? 'Close Account'
                                    : 'My Profile'}
              </Text>

              <TouchableOpacity
                onPress={closePanel}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.panelContent}>
              {renderPanelContent()}
            </View>
          </View>
        ) : null}

        <Text style={styles.footerText}>
          ZENIMONIES BANKING
        </Text>

        <Text style={styles.footerVersion}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      height: 58,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },

    backButton: {
      width: 38,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },

    backArrow: {
      color: colors.text,
      fontSize: 34,
      lineHeight: 38,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },

    headerSpacer: {
      width: 38,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 40,
    },

    hero: {
      minHeight: 112,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderRadius: 15,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },

    heroTextContainer: {
      flex: 1,
      paddingRight: 12,
    },

    heroTitle: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 5,
    },

    heroDescription: {
      color: '#FFFFFF',
      fontSize: 12,
      lineHeight: 18,
      opacity: 0.95,
    },

    heroIcon: {
      color: '#FFFFFF',
      fontSize: 31,
      opacity: 0.9,
    },

    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 11,
      overflow: 'hidden',
    },

    sectionHeader: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSoft,
      marginRight: 12,
    },

    sectionIconText: {
      fontSize: 20,
    },

    sectionText: {
      flex: 1,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
      marginBottom: 4,
    },

    sectionDescription: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },

    sectionChevron: {
      color: colors.primary,
      fontSize: 25,
      fontWeight: '500',
      paddingLeft: 8,
    },

    sectionContent: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 14,
      paddingBottom: 6,
    },

    menuItem: {
      minHeight: 64,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    menuText: {
      flex: 1,
      paddingRight: 10,
    },

    menuTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },

    menuDescription: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },

    menuTrailing: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },

    chevron: {
      color: colors.textSecondary,
      fontSize: 24,
      paddingHorizontal: 5,
    },

    panel: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 5,
      marginBottom: 18,
      overflow: 'hidden',
    },

    panelHeader: {
      minHeight: 58,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    panelTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flex: 1,
      paddingRight: 10,
    },

    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.backgroundSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },

    panelContent: {
      padding: 16,
    },

    bodyText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 19,
      marginBottom: 13,
    },

    subheading: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 9,
    },

    statusCard: {
      backgroundColor: colors.backgroundSoft,
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginBottom: 15,
    },

    statusRow: {
      minHeight: 39,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    statusLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
      paddingRight: 8,
    },

    statusValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'right',
      flexShrink: 1,
    },

    goodStatus: {
      color: colors.primary,
    },

    inputGroup: {
      marginBottom: 14,
    },

    inputLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 7,
    },

    input: {
      minHeight: 47,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      paddingHorizontal: 13,
      color: colors.text,
      backgroundColor: colors.background,
      fontSize: 14,
    },

    multilineInput: {
      minHeight: 115,
      paddingTop: 12,
    },

    primaryButton: {
      minHeight: 48,
      backgroundColor: colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginTop: 7,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },

    disabledButton: {
      opacity: 0.55,
    },

    secondaryButton: {
      minHeight: 43,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 7,
    },

    secondaryButtonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },

    loader: {
      marginVertical: 18,
    },

    infoBox: {
      backgroundColor: colors.backgroundSoft,
      borderRadius: 10,
      padding: 13,
      marginVertical: 8,
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },

    switchRow: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },

    switchText: {
      flex: 1,
      paddingRight: 12,
    },

    themeOption: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },

    themeRadio: {
      color: colors.textMuted,
      fontSize: 20,
    },

    themeRadioSelected: {
      color: colors.primary,
    },

    categoryList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 15,
      gap: 8,
    },

    categoryOption: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },

    categorySelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    categoryText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '600',
    },

    categoryTextSelected: {
      color: '#FFFFFF',
    },

    aboutCard: {
      alignItems: 'center',
      paddingVertical: 12,
    },

    logoCircle: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    logoLetter: {
      color: '#FFFFFF',
      fontSize: 35,
      fontWeight: '900',
    },

    aboutName: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: 1,
    },

    aboutSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 8,
    },

    footerText: {
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginTop: 12,
    },

    footerVersion: {
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 10,
      marginTop: 5,
      marginBottom: 10,
    },
  });
}
