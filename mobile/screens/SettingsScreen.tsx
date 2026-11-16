
import React from 'react';

import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

type SettingsScreenProps = {
  onBack: () => void;
  onLogout: () => void;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onLogout,
}) => {
  const {
    colors,
    mode,
    preference,
    setPreference,
  } = useTheme();

  const styles = createStyles(colors);

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
            Manage your ZENIMONIES app appearance and account access.
          </Text>
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Security
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
