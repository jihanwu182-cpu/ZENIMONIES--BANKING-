
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

type ProfileScreenProps = {
  user?: any;
  account?: any;
  onBack: () => void;
  onLogout: () => void;
};

const displayValue = (
  value: unknown,
  fallback = 'Not provided'
): string => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return fallback;
  }

  return String(value);
};

const getInitials = (name: string): string => {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'Z'
  );
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  account,
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

  const fullName =
    user?.full_name ||
    user?.name ||
    'ZENIMONIES Customer';

  const email = displayValue(user?.email);
  const phone = displayValue(user?.phone);

  const verificationLevel =
    account?.kyc_tier ??
    user?.kyc_tier ??
    user?.verification_level ??
    user?.kyc_level;

  const verificationStatus =
    account?.kyc_status ||
    user?.kyc_status ||
    user?.verification_status ||
    'Pending';

  const accountNumber = displayValue(
    account?.account_number
  );

  const accountStatus = displayValue(
    account?.status,
    'Active'
  );

  const addressParts = [
    user?.address,
    user?.city,
    user?.state,
    user?.country,
  ].filter(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
  );

  const address = addressParts.length
    ? addressParts.join(', ')
    : 'Not provided';

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
    setPreference(next).catch(() => {
      Alert.alert(
        'Theme preference',
        'Your theme could not be saved. Please try again.'
      );
    });
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
        backgroundColor={colors.backgroundSoft}
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
          My Profile
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(fullName)}
            </Text>
          </View>

          <Text style={styles.customerName}>
            {fullName}
          </Text>

          <Text style={styles.customerEmail}>
            {email}
          </Text>

          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>
              ZENIMONIES CUSTOMER
            </Text>
          </View>
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
                  accessibilityState={{
                    selected,
                  }}
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
            Personal information
          </Text>

          <View style={styles.card}>
            <InfoRow
              label="Full name"
              value={fullName}
              colors={colors}
            />

            <InfoRow
              label="Email address"
              value={email}
              colors={colors}
            />

            <InfoRow
              label="Phone number"
              value={phone}
              colors={colors}
            />

            <InfoRow
              label="Date of birth"
              value={displayValue(user?.date_of_birth)}
              colors={colors}
            />

            <InfoRow
              label="Gender"
              value={displayValue(user?.gender)}
              colors={colors}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Account information
          </Text>

          <View style={styles.card}>
            <InfoRow
              label="Account number"
              value={accountNumber}
              colors={colors}
            />

            <InfoRow
              label="Account type"
              value={displayValue(
                account?.account_type,
                'Personal'
              )}
              colors={colors}
            />

            <InfoRow
              label="Currency"
              value="Nigerian Naira (NGN)"
              colors={colors}
            />

            <InfoRow
              label="Account status"
              value={accountStatus}
              valueColor={colors.success}
              colors={colors}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Verification
          </Text>

          <View style={styles.card}>
            <InfoRow
              label="Verification level"
              value={
                verificationLevel !== undefined
                  ? `Level ${verificationLevel}`
                  : 'Not available'
              }
              colors={colors}
            />

            <InfoRow
              label="KYC status"
              value={String(verificationStatus)}
              valueColor={
                String(verificationStatus).toLowerCase() ===
                'approved'
                  ? colors.success
                  : colors.warning
              }
              colors={colors}
            />

            <InfoRow
              label="BVN verification"
              value={
                user?.bvn_verified === true
                  ? 'Verified'
                  : 'Not verified'
              }
              colors={colors}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Address
          </Text>

          <View style={styles.card}>
            <Text style={styles.addressText}>
              {address}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>
            Log out
          </Text>
        </TouchableOpacity>

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

type InfoRowProps = {
  label: string;
  value: string;
  colors: ReturnType<typeof import('../theme/colors').getColors>;
  valueColor?: string;
  last?: boolean;
};

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  colors,
  valueColor,
  last = false,
}) => {
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.infoRow,
        last && styles.lastInfoRow,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof import('../theme/colors').getColors>) =>
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

    identityCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 26,
      paddingHorizontal: 18,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },

    avatar: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },

    avatarText: {
      fontSize: 27,
      fontWeight: '900',
      color: colors.primary,
    },

    customerName: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'center',
    },

    customerEmail: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
    },

    memberBadge: {
      marginTop: 14,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
    },

    memberBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },

    section: {
      marginBottom: 21,
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
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },

    appearanceHeading: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginTop: 12,
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

    infoRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    lastInfoRow: {
      borderBottomWidth: 0,
    },

    infoLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 5,
    },

    infoValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },

    addressText: {
      paddingVertical: 14,
      fontSize: 14,
      lineHeight: 22,
      color: colors.text,
    },

    logoutButton: {
      minHeight: 52,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 5,
      backgroundColor: colors.surface,
    },

    logoutText: {
      color: colors.error,
      fontSize: 15,
      fontWeight: '800',
    },

    footer: {
      marginTop: 28,
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

export default ProfileScreen;
