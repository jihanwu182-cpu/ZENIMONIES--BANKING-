
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useTheme,
  ThemePreference,
} from '../theme/ThemeContext';

// ======================================================
// ZENIMONIES BANKING — MOBILE SETTINGS
// File: mobile/screens/SettingsScreen.tsx
// ======================================================

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
  token: string;
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

type ApiResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  passcode?: PasscodeStatus;
  failed_attempts?: number;
  remaining_attempts?: number;
  max_failed_attempts?: number;
  locked_until?: string | null;
};

type SettingRowProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  colors: any;
  danger?: boolean;
  connected?: boolean;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onLogout,
  token,
}) => {
  const {
    colors,
    mode,
    preference,
    setPreference,
  } = useTheme();

  const styles = createStyles(colors);

  // ====================================================
  // PASSCODE STATE
  // ====================================================

  const [passcodeStatus, setPasscodeStatus] =
    useState<PasscodeStatus | null>(null);

  const [statusLoading, setStatusLoading] =
    useState(true);

  const [passcodeBusy, setPasscodeBusy] =
    useState(false);

  const [passcodeError, setPasscodeError] =
    useState('');

  const [currentPasscode, setCurrentPasscode] =
    useState('');

  const [newPasscode, setNewPasscode] =
    useState('');

  const [confirmPasscode, setConfirmPasscode] =
    useState('');

  const [showPasscodeForm, setShowPasscodeForm] =
    useState(false);

  const [showThemeOptions, setShowThemeOptions] =
    useState(false);

  // ====================================================
  // LOAD ACCOUNT UNLOCK PASSCODE STATUS
  // ====================================================

  const loadPasscodeStatus = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setStatusLoading(true);
      }

      try {
        const response = await fetch(
          `${API_BASE}/passcode/status`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let data: ApiResponse;

        try {
          data = await response.json();
        } catch {
          throw new Error(
            'The server returned an invalid response.'
          );
        }

        if (!response.ok || data.success !== true) {
          throw new Error(
            data.message ||
            'Unable to retrieve your Passcode status.'
          );
        }

        if (!data.passcode) {
          throw new Error(
            'Your Passcode status could not be retrieved.'
          );
        }

        setPasscodeStatus(data.passcode);
        setPasscodeError('');
      } catch (error: any) {
        setPasscodeError(
          error?.message ||
          'Unable to load Passcode status. Please try again.'
        );
      } finally {
        setStatusLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadPasscodeStatus();
  }, [loadPasscodeStatus]);

  // ====================================================
  // PASSCODE FORM
  // ====================================================

  const resetPasscodeForm = () => {
    setCurrentPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
    setPasscodeError('');
  };

  const openPasscodeForm = () => {
    resetPasscodeForm();
    setShowPasscodeForm(true);
  };

  const closePasscodeForm = () => {
    resetPasscodeForm();
    setShowPasscodeForm(false);
  };

  // ====================================================
  // SUBMIT PASSCODE
  // ====================================================

  const submitPasscode = async () => {
    setPasscodeError('');

    if (!/^\d{6}$/.test(newPasscode)) {
      setPasscodeError(
        'Your new Account Unlock Passcode must contain exactly 6 digits.'
      );
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError(
        'Your Passcodes do not match.'
      );
      return;
    }

    const changing =
      passcodeStatus?.exists === true;

    if (
      changing &&
      !/^\d{6}$/.test(currentPasscode)
    ) {
      setPasscodeError(
        'Enter your current six-digit Account Unlock Passcode.'
      );
      return;
    }

    if (
      changing &&
      currentPasscode === newPasscode
    ) {
      setPasscodeError(
        'Your new Passcode must be different from your current Passcode.'
      );
      return;
    }

    setPasscodeBusy(true);

    try {
      const endpoint = changing
        ? 'change'
        : 'setup';

      const body = changing
        ? {
            current_passcode: currentPasscode,
            new_passcode: newPasscode,
            confirm_passcode: confirmPasscode,
          }
        : {
            passcode: newPasscode,
            confirm_passcode: confirmPasscode,
          };

      const response = await fetch(
        `${API_BASE}/passcode/${endpoint}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      let data: ApiResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          'The server returned an invalid response.'
        );
      }

      if (!response.ok || data.success !== true) {
        const remaining =
          data.remaining_attempts;

        let message =
          data.message ||
          'Unable to update your Account Unlock Passcode.';

        if (
          data.code === 'INCORRECT_PASSCODE' &&
          typeof remaining === 'number'
        ) {
          message +=
            ` ${remaining} attempt(s) remaining.`;
        }

        if (data.code === 'PASSCODE_LOCKED') {
          message =
            'Your Account Unlock Passcode is temporarily locked. Please try again after the lockout expires.';
        }

        throw new Error(message);
      }

      setShowPasscodeForm(false);
      resetPasscodeForm();

      await loadPasscodeStatus(false);

      Alert.alert(
        'Security updated',
        data.message ||
        (
          changing
            ? 'Your Account Unlock Passcode was changed successfully.'
            : 'Your Account Unlock Passcode was created successfully.'
        )
      );
    } catch (error: any) {
      setPasscodeError(
        error?.message ||
        'Unable to update your Passcode. Please try again.'
      );
    } finally {
      setPasscodeBusy(false);
    }
  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const confirmLogout = () => {
    Alert.alert(
      'Log out of ZENIMONIES?',
      'You will need to sign in again to access your account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  // ====================================================
  // SETTINGS NOT YET CONNECTED
  // ====================================================

  const showNotConnected = (feature: string) => {
    Alert.alert(
      feature,
      'This setting is included in the ZENIMONIES mobile settings layout but has not yet been connected. We will integrate it in a later development stage.',
      [{ text: 'OK' }]
    );
  };

  const openProfileNotice = () => {
    Alert.alert(
      'My Profile',
      'You can currently access your profile from the Profile tab on your dashboard.',
      [{ text: 'OK' }]
    );
  };

  const closeAccountNotice = () => {
    Alert.alert(
      'Close Account',
      'Account closure is not yet available in the mobile app. Please contact ZENIMONIES support for assistance.',
      [{ text: 'OK' }]
    );
  };

  // ====================================================
  // THEME
  // ====================================================

  const selectTheme = (next: ThemePreference) => {
    try {
      const result = setPreference(next);

      if (
        result &&
        typeof (result as any).catch === 'function'
      ) {
        (result as any).catch(() => {
          Alert.alert(
            'Theme preference',
            'Your theme could not be saved. Please try again.'
          );
        });
      }
    } catch {
      Alert.alert(
        'Theme preference',
        'Your theme could not be changed. Please try again.'
      );
    }
  };

  const themeOptions: {
    value: ThemePreference;
    label: string;
    description: string;
  }[] = [
    {
      value: 'system',
      label: 'System',
      description: 'Follow your phone settings',
    },
    {
      value: 'light',
      label: 'Light',
      description: 'Classic ZENIMONIES appearance',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Dark green appearance',
    },
  ];

  // ====================================================
  // SETTINGS ROW
  // ====================================================

  const SettingRow: React.FC<SettingRowProps> = ({
    icon,
    title,
    description,
    onPress,
    colors: rowColors,
    danger = false,
    connected = false,
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        style={[
          styles.rowIcon,
          danger && styles.rowIconDanger,
        ]}
      >
        <Text
          style={[
            styles.rowIconText,
            danger && styles.rowIconTextDanger,
          ]}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            danger && styles.dangerText,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.rowDescription}>
          {description}
        </Text>
      </View>

      {connected ? (
        <Text style={styles.rowArrow}>›</Text>
      ) : (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>
            Soon
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={
          mode === 'dark'
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={colors.surface}
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Back to dashboard"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* INTRODUCTION */}

        <View style={styles.heroCard}>
          <View style={styles.heroLogo}>
            <Text style={styles.heroLogoText}>Z</Text>
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              Settings & Preferences
            </Text>

            <Text style={styles.heroDescription}>
              Manage your account, security and ZENIMONIES experience.
            </Text>
          </View>
        </View>

        {/* ACCOUNT */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ACCOUNT
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="♙"
              title="My Profile"
              description="View and manage your personal information"
              onPress={openProfileNotice}
              colors={colors}
              connected
            />
          </View>
        </View>

        {/* PAYMENTS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PAYMENTS
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="₦"
              title="Payment Settings"
              description="Manage your payment preferences"
              onPress={() => showNotConnected('Payment Settings')}
              colors={colors}
            />
          </View>
        </View>

        {/* LOGIN AND SECURITY */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            LOGIN & SECURITY
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="⌑"
              title="Login Settings"
              description="Manage your login preferences"
              onPress={() => showNotConnected('Login Settings')}
              colors={colors}
            />

            <View style={styles.rowDivider} />

            <SettingRow
              icon="?"
              title="Security Question"
              description="Manage your account security question"
              onPress={() => showNotConnected('Security Question')}
              colors={colors}
            />

            <View style={styles.rowDivider} />

            <SettingRow
              icon="✓"
              title="Security Center"
              description="Review your account security settings"
              onPress={() => showNotConnected('Security Center')}
              colors={colors}
            />
          </View>
        </View>

        {/* ACCOUNT UNLOCK PASSCODE */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ACCOUNT UNLOCK PASSCODE
          </Text>

          <View style={styles.card}>
            <View style={styles.passcodeHeading}>
              <View style={styles.passcodeIcon}>
                <Text style={styles.passcodeIconText}>
                  ✓
                </Text>
              </View>

              <View style={styles.passcodeHeadingContent}>
                <Text style={styles.passcodeTitle}>
                  Account Unlock Passcode
                </Text>

                <Text style={styles.passcodeDescription}>
                  A separate six-digit Passcode used to unlock your account after an expired session.
                </Text>
              </View>
            </View>

            {statusLoading ? (
              <View style={styles.statusLoading}>
                <ActivityIndicator
                  color={colors.primary}
                  size="small"
                />

                <Text style={styles.statusLoadingText}>
                  Checking Passcode status...
                </Text>
              </View>
            ) : passcodeError && !passcodeStatus ? (
              <View>
                <Text style={styles.errorText}>
                  {passcodeError}
                </Text>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setPasscodeError('');
                    void loadPasscodeStatus();
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>
                    Current status
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      passcodeStatus?.exists
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        passcodeStatus?.exists
                          ? styles.statusActiveText
                          : styles.statusInactiveText,
                      ]}
                    >
                      {passcodeStatus?.exists
                        ? 'Configured'
                        : 'Not configured'}
                    </Text>
                  </View>
                </View>

                {passcodeStatus?.locked ? (
                  <View style={styles.lockedNotice}>
                    <Text style={styles.lockedTitle}>
                      Passcode temporarily locked
                    </Text>

                    <Text style={styles.lockedDescription}>
                      Too many incorrect attempts were made. Please wait until the lockout expires before trying again.
                    </Text>

                    {passcodeStatus.locked_until ? (
                      <Text style={styles.lockedTime}>
                        Unlock time:{' '}
                        {new Date(
                          passcodeStatus.locked_until
                        ).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {typeof passcodeStatus?.failed_attempts === 'number' &&
                passcodeStatus.failed_attempts > 0 &&
                !passcodeStatus.locked ? (
                  <Text style={styles.attemptsText}>
                    Failed attempts:{' '}
                    {passcodeStatus.failed_attempts} of{' '}
                    {passcodeStatus.max_failed_attempts}
                  </Text>
                ) : null}

                {passcodeStatus?.exists &&
                passcodeStatus.last_used_at ? (
                  <Text style={styles.lastUsedText}>
                    Last used:{' '}
                    {new Date(
                      passcodeStatus.last_used_at
                    ).toLocaleString()}
                  </Text>
                ) : null}

                {!showPasscodeForm ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={openPasscodeForm}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>
                      {passcodeStatus?.exists
                        ? 'Change Account Unlock Passcode'
                        : 'Create Account Unlock Passcode'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.passcodeForm}>
                    <Text style={styles.formTitle}>
                      {passcodeStatus?.exists
                        ? 'Change your Passcode'
                        : 'Create your Passcode'}
                    </Text>

                    {passcodeStatus?.exists ? (
                      <>
                        <Text style={styles.inputLabel}>
                          Current six-digit Passcode
                        </Text>

                        <TextInput
                          style={styles.passcodeInput}
                          value={currentPasscode}
                          onChangeText={(value) =>
                            setCurrentPasscode(
                              value.replace(/\D/g, '').slice(0, 6)
                            )
                          }
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={6}
                          placeholder="Enter current Passcode"
                          placeholderTextColor={colors.textMuted}
                          editable={!passcodeBusy}
                          accessibilityLabel="Current Account Unlock Passcode"
                        />
                      </>
                    ) : null}

                    <Text style={styles.inputLabel}>
                      New six-digit Passcode
                    </Text>

                    <TextInput
                      style={styles.passcodeInput}
                      value={newPasscode}
                      onChangeText={(value) =>
                        setNewPasscode(
                          value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={6}
                      placeholder="Enter new Passcode"
                      placeholderTextColor={colors.textMuted}
                      editable={!passcodeBusy}
                      accessibilityLabel="New Account Unlock Passcode"
                    />

                    <Text style={styles.inputLabel}>
                      Confirm new Passcode
                    </Text>

                    <TextInput
                      style={styles.passcodeInput}
                      value={confirmPasscode}
                      onChangeText={(value) =>
                        setConfirmPasscode(
                          value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={6}
                      placeholder="Confirm new Passcode"
                      placeholderTextColor={colors.textMuted}
                      editable={!passcodeBusy}
                      accessibilityLabel="Confirm Account Unlock Passcode"
                    />

                    {passcodeError ? (
                      <Text style={styles.errorText}>
                        {passcodeError}
                      </Text>
                    ) : null}

                    <View style={styles.formButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={closePasscodeForm}
                        disabled={passcodeBusy}
                      >
                        <Text style={styles.cancelButtonText}>
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          styles.submitButton,
                          passcodeBusy && styles.disabledButton,
                        ]}
                        onPress={submitPasscode}
                        disabled={passcodeBusy}
                        activeOpacity={0.85}
                      >
                        {passcodeBusy ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryButtonText}>
                            {passcodeStatus?.exists
                              ? 'Update Passcode'
                              : 'Create Passcode'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* SAVINGS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SAVINGS
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="◈"
              title="Saving Settings"
              description="Manage your ZENIMONIES savings preferences"
              onPress={() => showNotConnected('Saving Settings')}
              colors={colors}
            />
          </View>
        </View>

        {/* PREFERENCES */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PREFERENCES
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="♧"
              title="SMS Alert Settings"
              description="Manage your SMS notification preferences"
              onPress={() => showNotConnected('SMS Alert Settings')}
              colors={colors}
            />

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowThemeOptions((value) => !value)}
              activeOpacity={0.75}
              accessibilityRole="button"
            >
              <View style={styles.rowIcon}>
                <Text style={styles.rowIconText}>
                  ◐
                </Text>
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>
                  Themes
                </Text>

                <Text style={styles.rowDescription}>
                  Change your app appearance
                </Text>
              </View>

              <Text style={styles.rowArrow}>
                {showThemeOptions ? '⌃' : '›'}
              </Text>
            </TouchableOpacity>

            {showThemeOptions ? (
              <View style={styles.themePanel}>
                <Text style={styles.themePanelTitle}>
                  Choose your theme
                </Text>

                {themeOptions.map((option, index) => {
                  const selected =
                    preference === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.themeOption,
                        index === themeOptions.length - 1 &&
                          styles.lastThemeOption,
                      ]}
                      onPress={() => selectTheme(option.value)}
                      activeOpacity={0.75}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View style={styles.themeOptionText}>
                        <Text style={styles.themeOptionLabel}>
                          {option.label}
                        </Text>

                        <Text style={styles.themeOptionDescription}>
                          {option.description}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioOuter,
                          selected && styles.radioOuterSelected,
                        ]}
                      >
                        {selected ? (
                          <View style={styles.radioInner} />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        {/* SUPPORT */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SUPPORT
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="✉"
              title="Feedback and Suggestions"
              description="Share your experience with us"
              onPress={() => showNotConnected('Feedback and Suggestions')}
              colors={colors}
            />

            <View style={styles.rowDivider} />

            <SettingRow
              icon="ⓘ"
              title="About"
              description="Learn more about ZENIMONIES Banking"
              onPress={() => showNotConnected('About ZENIMONIES')}
              colors={colors}
            />
          </View>
        </View>

        {/* ACCOUNT ACTIONS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ACCOUNT ACTIONS
          </Text>

          <View style={styles.card}>
            <SettingRow
              icon="↪"
              title="Log Out"
              description="Securely sign out of this device"
              onPress={confirmLogout}
              colors={colors}
              danger
              connected
            />

            <View style={styles.rowDivider} />

            <SettingRow
              icon="×"
              title="Close Account"
              description="Request closure of your ZENIMONIES account"
              onPress={closeAccountNotice}
              colors={colors}
              danger
            />
          </View>
        </View>

        {/* FOOTER */}

        <View style={styles.footerContainer}>
          <View style={styles.footerLogo}>
            <Text style={styles.footerLogoText}>Z</Text>
          </View>

          <Text style={styles.footer}>
            ZENIMONIES BANKING
          </Text>

          <Text style={styles.version}>
            Your money. Your freedom.
          </Text>

          <Text style={styles.footerSecure}>
            SECURE  •  SIMPLE  •  SMART
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ======================================================
// STYLES
// ======================================================

const createStyles = (
  colors: ReturnType<typeof import('../theme/colors').getColors>
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },

    header: {
      minHeight: 60,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    backButton: {
      width: 42,
      height: 42,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },

    backIcon: {
      fontSize: 38,
      lineHeight: 42,
      color: colors.primary,
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },

    headerSpacer: {
      width: 42,
    },

    scrollContent: {
      padding: 18,
      paddingBottom: 40,
    },

    // HERO

    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 17,
      padding: 18,
      marginBottom: 26,
    },

    heroLogo: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    heroLogoText: {
      fontSize: 30,
      fontWeight: '900',
      color: colors.primary,
    },

    heroText: {
      flex: 1,
    },

    heroTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    heroDescription: {
      fontSize: 11,
      lineHeight: 17,
      color: '#FFFFFF',
      opacity: 0.9,
      marginTop: 5,
    },

    // SECTIONS

    section: {
      marginBottom: 23,
    },

    sectionTitle: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: colors.textSecondary,
      marginBottom: 10,
      marginLeft: 3,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      paddingHorizontal: 14,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // SETTING ROWS

    settingRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },

    rowIcon: {
      width: 41,
      height: 41,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    rowIconText: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.primary,
    },

    rowIconDanger: {
      backgroundColor: '#FCEAEA',
    },

    rowIconTextDanger: {
      color: colors.error,
    },

    rowContent: {
      flex: 1,
      paddingRight: 8,
    },

    rowTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },

    rowDescription: {
      fontSize: 10,
      lineHeight: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },

    rowArrow: {
      fontSize: 25,
      color: colors.textMuted,
      paddingHorizontal: 5,
    },

    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 53,
    },

    comingSoonBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 20,
    },

    comingSoonText: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '900',
    },

    dangerText: {
      color: colors.error,
    },

    // PASSCODE

    passcodeHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
    },

    passcodeIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },

    passcodeIconText: {
      fontSize: 21,
      fontWeight: '900',
      color: colors.primary,
    },

    passcodeHeadingContent: {
      flex: 1,
    },

    passcodeTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
    },

    passcodeDescription: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 17,
      color: colors.textSecondary,
    },

    statusLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
    },

    statusLoadingText: {
      marginLeft: 10,
      fontSize: 12,
      color: colors.textSecondary,
    },

    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 13,
      marginTop: 8,
    },

    statusLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },

    statusBadge: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
    },

    statusActive: {
      backgroundColor: '#E4F5EB',
    },

    statusInactive: {
      backgroundColor: '#FFF3DF',
    },

    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },

    statusActiveText: {
      color: '#087A45',
    },

    statusInactiveText: {
      color: '#A56812',
    },

    lockedNotice: {
      backgroundColor: '#FFF1F0',
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },

    lockedTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: '#B42318',
    },

    lockedDescription: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 17,
      color: '#8A302A',
    },

    lockedTime: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: '700',
      color: '#8A302A',
    },

    attemptsText: {
      marginTop: 10,
      fontSize: 11,
      color: colors.textSecondary,
    },

    lastUsedText: {
      marginTop: 9,
      fontSize: 10,
      color: colors.textMuted,
    },

    passcodeForm: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 15,
    },

    formTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
      marginBottom: 13,
    },

    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 7,
      marginTop: 11,
    },

    passcodeInput: {
      minHeight: 49,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      fontSize: 15,
      letterSpacing: 4,
      color: colors.text,
      backgroundColor: colors.backgroundSoft,
    },

    errorText: {
      color: colors.error,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
    },

    formButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
    },

    primaryButton: {
      minHeight: 47,
      backgroundColor: colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 13,
      marginTop: 15,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'center',
    },

    submitButton: {
      flex: 1,
      marginTop: 0,
    },

    disabledButton: {
      opacity: 0.65,
    },

    cancelButton: {
      minHeight: 47,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },

    cancelButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },

    secondaryButton: {
      alignSelf: 'flex-start',
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 9,
      paddingHorizontal: 15,
      paddingVertical: 10,
    },

    secondaryButtonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },

    // THEMES

    themePanel: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 7,
      paddingTop: 12,
      paddingBottom: 5,
    },

    themePanelTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.text,
      marginBottom: 5,
    },

    themeOption: {
      minHeight: 59,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },

    lastThemeOption: {
      borderBottomWidth: 0,
    },

    themeOptionText: {
      flex: 1,
      paddingRight: 12,
    },

    themeOptionLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },

    themeOptionDescription: {
      marginTop: 4,
      fontSize: 10,
      color: colors.textSecondary,
    },

    radioOuter: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.textMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },

    radioOuterSelected: {
      borderColor: colors.primary,
    },

    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },

    // FOOTER

    footerContainer: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 15,
    },

    footerLogo: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 9,
    },

    footerLogoText: {
      fontSize: 23,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    footer: {
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 2,
      color: colors.primary,
    },

    version: {
      marginTop: 6,
      textAlign: 'center',
      fontSize: 11,
      color: colors.textMuted,
    },

    footerSecure: {
      marginTop: 13,
      textAlign: 'center',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 2,
      color: colors.textMuted,
    },
  });

export default SettingsScreen;
