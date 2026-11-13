
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

import colors from '../theme/colors';

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
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'Z';
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  account,
  onBack,
  onLogout,
}) => {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
            Personal information
          </Text>

          <View style={styles.card}>
            <InfoRow
              label="Full name"
              value={fullName}
            />

            <InfoRow
              label="Email address"
              value={email}
            />

            <InfoRow
              label="Phone number"
              value={phone}
            />

            <InfoRow
              label="Date of birth"
              value={displayValue(user?.date_of_birth)}
            />

            <InfoRow
              label="Gender"
              value={displayValue(user?.gender)}
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
            />

            <InfoRow
              label="Account type"
              value={displayValue(
                account?.account_type,
                'Personal'
              )}
            />

            <InfoRow
              label="Currency"
              value="Nigerian Naira (NGN)"
            />

            <InfoRow
              label="Account status"
              value={accountStatus}
              valueColor={colors.success}
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
            />

            <InfoRow
              label="BVN verification"
              value={
                user?.bvn_verified === true
                  ? 'Verified'
                  : 'Not verified'
              }
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
  valueColor?: string;
  last?: boolean;
};

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  valueColor,
  last = false,
}) => (
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.white,
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
