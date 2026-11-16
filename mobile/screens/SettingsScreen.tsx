

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
// ZENIMONIES BANKING — SETTINGS
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

  const [passcodeMessage, setPasscodeMessage] =
    useState('');

  const [currentPasscode, setCurrentPasscode] =
    useState('');

  const [newPasscode, setNewPasscode] =
    useState('');

  const [confirmPasscode, setConfirmPasscode] =
    useState('');

  const [showPasscodeForm, setShowPasscodeForm] =
    useState(false);

  // ====================================================
  // LOAD ACCOUNT PASSCODE STATUS
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
  // RESET PASSCODE FORM
  // ====================================================

  const resetPasscodeForm = () => {
    setCurrentPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
    setPasscodeError('');
    setPasscodeMessage('');
  };

  // ====================================================
  // OPEN PASSCODE FORM
  // ====================================================

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
    setPasscodeMessage('');

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

    const changing = passcodeStatus?.exists === true;

    if (changing && !/^\d{6}$/.test(currentPasscode)) {
      setPasscodeError(
        'Enter your current six-digit Account Unlock Passcode.'
      );
      return;
    }

    if (changing && currentPasscode === newPasscode) {
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
          message += ` ${remaining} attempt(s) remaining.`;
        }

        if (data.code === 'PASSCODE_LOCKED') {
          message =
            'Your Account Unlock Passcode is temporarily locked. Please try again after the lockout expires.';
        }

        throw new Error(message);
      }

      setPasscodeMessage(
        data.message ||
        (
          changing
            ? 'Your Account Unlock Passcode was changed successfully.'
            : 'Your Account Unlock Passcode was created successfully.'
        )
      );

      resetPasscodeForm();
      setShowPasscodeForm(false);

      await loadPasscodeStatus(false);

      Alert.alert(
        'Security updated',
        data.message ||
        'Your Account Unlock Passcode has been updated successfully.'
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
      description: 'Use the classic ZENIMONIES appearance',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Use the dark green appearance',
    },
  ];

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
      />

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
        <View style={styles.intro}>
          <Text style={styles.introTitle}>
            App preferences
          </Text>

          <Text style={styles.introDescription}>
            Manage your ZENIMONIES app appearance and account security.
          </Text>
        </View>

        {/* APPEARANCE */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Appearance
          </Text>

          <View style={styles.card}>
            <Text style={styles.appearanceHeading}>
              App theme
            </Text>

            <Text style={styles.appearanceDescription}>
              Choose how ZENIMONIES looks on your device.
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
                    selected && styles.selectedThemeOption,
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
                    {selected && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ACCOUNT */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <View style={styles.card}>
            <View style={styles.accountInfo}>
              <View style={styles.accountIcon}>
                <Text style={styles.accountIconText}>
                  Z
                </Text>
              </View>

              <View style={styles.accountText}>
                <Text style={styles.accountTitle}>
                  ZENIMONIES Banking
                </Text>

                <Text style={styles.accountDescription}>
                  Manage your banking session securely.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ACCOUNT UNLOCK PASSCODE */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Account security
          </Text>

          <View style={styles.card}>
            <View style={styles.securityHeadingRow}>
              <View style={styles.securityIcon}>
                <Text style={styles.securityIconText}>
                  ✓
                </Text>
              </View>

              <View style={styles.securityHeadingText}>
                <Text style={styles.securityTitle}>
                  Account Unlock Passcode
                </Text>

                <Text style={styles.securityDescription}>
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
                    Status
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
                        Unlock time: {
                          new Date(
                            passcodeStatus.locked_until
                          ).toLocaleString()
                        }
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {typeof passcodeStatus?.failed_attempts === 'number' &&
                passcodeStatus.failed_attempts > 0 &&
                !passcodeStatus.locked ? (
                  <Text style={styles.attemptsText}>
                    Failed attempts: {
                      passcodeStatus.failed_attempts
                    } of {
                      passcodeStatus.max_failed_attempts
                    }
                  </Text>
                ) : null}

                {passcodeStatus?.exists &&
                passcodeStatus.last_used_at ? (
                  <Text style={styles.lastUsedText}>
                    Last used: {
                      new Date(
                        passcodeStatus.last_used_at
                      ).toLocaleString()
                    }
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

        {/* LOGOUT */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Session
          </Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={confirmLogout}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.logoutIcon}>
              ↪
            </Text>

            <View style={styles.logoutContent}>
              <Text style={styles.logoutText}>
                Log out
              </Text>

              <Text style={styles.logoutDescription}>
                Securely sign out of this device
              </Text>
            </View>

            <Text style={styles.logoutArrow}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          ZENIMONIES BANKING
        </Text>

        <Text style={styles.version}>
          Your money. Your freedom.
        </Text>
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
      minHeight: 58,
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
      paddingBottom: 35,
    },

    intro: {
      marginBottom: 24,
    },

    introTitle: {
      fontSize: 21,
      fontWeight: '900',
      color: colors.text,
    },

    introDescription: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },

    section: {
      marginBottom: 22,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.text,
      marginBottom: 10,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    appearanceHeading: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginTop: 5,
    },

    appearanceDescription: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: 5,
      marginBottom: 7,
    },

    themeOption: {
      minHeight: 65,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 11,
    },

    lastThemeOption: {
      borderBottomWidth: 0,
    },

    selectedThemeOption: {
      backgroundColor: colors.primaryLight,
      marginHorizontal: -8,
      paddingHorizontal: 8,
      borderRadius: 9,
    },

    themeOptionText: {
      flex: 1,
      paddingRight: 12,
    },

    themeOptionLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },

    themeOptionDescription: {
      marginTop: 4,
      fontSize: 11,
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

    accountInfo: {
      minHeight: 65,
      flexDirection: 'row',
      alignItems: 'center',
    },

    accountIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    accountIconText: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.primary,
    },

    accountText: {
      flex: 1,
    },

    accountTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },

    accountDescription: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },

    securityHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
    },

    securityIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },

    securityIconText: {
      fontSize: 21,
      fontWeight: '900',
      color: colors.primary,
    },

    securityHeadingText: {
      flex: 1,
    },

    securityTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
    },

    securityDescription: {
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

    logoutButton: {
      minHeight: 76,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.error,
      backgroundColor: colors.surface,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },

    logoutIcon: {
      fontSize: 25,
      fontWeight: '800',
      color: colors.error,
      marginRight: 13,
    },

    logoutContent: {
      flex: 1,
    },

    logoutText: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.error,
    },

    logoutDescription: {
      marginTop: 4,
      fontSize: 11,
      color: colors.textSecondary,
    },

    logoutArrow: {
      fontSize: 27,
      color: colors.error,
    },

    footer: {
      marginTop: 22,
      textAlign: 'center',
      fontSize: 12,
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
  });

export default SettingsScreen;
