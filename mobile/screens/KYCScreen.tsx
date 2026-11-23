
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const GREEN = '#07803F';
const DARK_GREEN = '#056B34';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

const API_BASE = 'https://zenimonies-banking.onrender.com/api';

type Props = {
  token: string;
  onBack?: () => void;
  onSelect?: (section: string) => void;
  verificationLevel?: string | number;
  verificationStatus?: string;
};

type TierStatus =
  | 'Current Tier'
  | 'Verified'
  | 'Upgrade Available'
  | 'Locked';

type Tier = {
  number: number;
  subtitle: string;
  accountLimit: string;
  dailyLimit: string;
};

const fallbackTiers: Tier[] = [
  {
    number: 1,
    subtitle: 'Basic Banking',
    accountLimit: '₦300,000',
    dailyLimit: '₦50,000',
  },
  {
    number: 2,
    subtitle: 'Enhanced Banking',
    accountLimit: '₦500,000',
    dailyLimit: '₦200,000',
  },
  {
    number: 3,
    subtitle: 'Full Banking',
    accountLimit: 'Unlimited',
    dailyLimit: '₦5,000,000',
  },
];

const formatLevel = (value?: string | number) => {
  const parsed = Number(
    String(value ?? '0').replace(/tier/gi, '').trim(),
  );

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(0, Math.min(3, Math.floor(parsed)));
};

export default function KYCScreen({
  token,
  onBack,
  onSelect,
  verificationLevel = 0,
}: Props) {
  const [currentLevel, setCurrentLevel] = useState(
    formatLevel(verificationLevel),
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKycStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!token) {
        setError('Your session could not be found. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE}/kyc/status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Unable to load verification status.',
        );
      }

      // Backend remains the source of truth for the verified tier.
      const kyc =
        data?.kyc ??
        data?.data?.kyc ??
        data?.data ??
        data;

      const backendTier = formatLevel(kyc?.tier);

      setCurrentLevel(backendTier);
    } catch (err: any) {
      setError(
        err?.message || 'Unable to load verification status.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  const getTierStatus = (tier: number): TierStatus => {
    if (currentLevel >= tier) {
      return tier === currentLevel ? 'Current Tier' : 'Verified';
    }

    if (tier === currentLevel + 1) {
      return 'Upgrade Available';
    }

    return 'Locked';
  };

  const isTierAvailable = (tier: number) =>
    tier <= currentLevel + 1;

  const handleSelectTier = (tierNumber: number) => {
    if (!onSelect) return;

    switch (tierNumber) {
      case 1:
        onSelect('Tier 1 BVN or NIN Verification');
        break;
      case 2:
        onSelect('Tier 2 Identity Verification');
        break;
      case 3:
        onSelect('Tier 3 Proof of Address');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>KYC</Text>

        <Text style={styles.headerSubtitle}>
          Upgrade your account for higher limits and more features.
        </Text>
      </View>

      {/* KYC TIERS */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={fetchKycStatus}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {fallbackTiers.map((tier) => {
          const status = getTierStatus(tier.number);
          const available = isTierAvailable(tier.number);
          const isCurrent = status === 'Current Tier';
          const isVerified = status === 'Verified';

          return (
            <View
              key={tier.number}
              style={[
                styles.tierCard,
                isCurrent && styles.currentTierCard,
                isVerified && styles.verifiedTierCard,
              ]}
            >
              {/* TIER NUMBER AND STATUS */}
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.tierIcon,
                    isCurrent && styles.currentTierIcon,
                    isVerified && styles.verifiedTierIcon,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierIconText,
                      isCurrent && styles.currentTierIconText,
                      isVerified && styles.verifiedTierIconText,
                    ]}
                  >
                    {tier.number}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isCurrent && styles.currentBadge,
                    isVerified && styles.completedBadge,
                    status === 'Locked' && styles.lockedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isCurrent && styles.currentBadgeText,
                      isVerified && styles.completedText,
                      status === 'Locked' && styles.lockedText,
                    ]}
                  >
                    {loading ? 'Checking...' : status}
                  </Text>
                </View>
              </View>

              {/* TIER NAME */}
              <Text style={styles.tierTitle}>
                Tier {tier.number}
              </Text>

              <Text style={styles.tierSubtitle}>
                {tier.subtitle}
              </Text>

              {/* ACCOUNT LIMITS */}
              <View style={styles.limitsBox}>
                <Text style={styles.limitsTitle}>
                  Account Limits
                </Text>

                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    Account limit
                  </Text>

                  <Text style={styles.limitValue}>
                    {tier.accountLimit}
                  </Text>
                </View>

                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    Daily transfer limit
                  </Text>

                  <Text style={styles.limitValue}>
                    {tier.dailyLimit}
                  </Text>
                </View>
              </View>

              {/* UPGRADE BUTTON */}
              {!loading &&
                available &&
                !isCurrent &&
                !isVerified && (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    activeOpacity={0.8}
                    onPress={() => handleSelectTier(tier.number)}
                  >
                    <Text style={styles.upgradeButtonText}>
                      {tier.number === 1
                        ? 'Start Tier 1 Verification'
                        : tier.number === 2
                        ? 'Upgrade to Tier 2'
                        : 'Upgrade to Tier 3'}
                    </Text>

                    <Text style={styles.buttonArrow}>›</Text>
                  </TouchableOpacity>
                )}

              {/* LOCKED */}
              {!loading && !available && (
                <View style={styles.lockedButton}>
                  <Text style={styles.lockedButtonText}>
                    Complete Tier {tier.number - 1} First
                  </Text>
                </View>
              )}

              {/* CURRENT TIER */}
              {!loading && isCurrent && (
                <View style={styles.currentButton}>
                  <Text style={styles.currentButtonText}>
                    Current Tier ✓
                  </Text>
                </View>
              )}

              {/* VERIFIED TIER */}
              {!loading && isVerified && (
                <View style={styles.currentButton}>
                  <Text style={styles.currentButtonText}>
                    Verified ✓
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    marginBottom: 12,
  },

  backText: {
    fontSize: 40,
    color: BLACK,
    lineHeight: 44,
  },

  headerTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: BLACK,
  },

  headerSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    marginTop: 8,
  },

  scrollContent: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },

  errorBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF1F0',
    borderRadius: 12,
  },

  errorText: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 20,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  retryText: {
    color: '#B42318',
    fontWeight: '800',
    fontSize: 13,
  },

  tierCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  currentTierCard: {
    borderColor: '#B8DFC8',
    borderWidth: 2,
  },

  verifiedTierCard: {
    borderColor: BORDER,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  tierIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#F0F3F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  currentTierIcon: {
    backgroundColor: GREEN,
  },

  verifiedTierIcon: {
    backgroundColor: '#E8F5EC',
  },

  tierIconText: {
    fontSize: 24,
    fontWeight: '900',
    color: MUTED,
  },

  currentTierIconText: {
    color: WHITE,
  },

  verifiedTierIconText: {
    color: GREEN,
  },

  statusBadge: {
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#F0F2EF',
  },

  currentBadge: {
    backgroundColor: '#E5F4E7',
  },

  completedBadge: {
    backgroundColor: '#E8F5EC',
  },

  lockedBadge: {
    backgroundColor: '#F0F2EF',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
  },

  currentBadgeText: {
    color: DARK_GREEN,
  },

  completedText: {
    color: DARK_GREEN,
  },

  lockedText: {
    color: MUTED,
  },

  tierTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: BLACK,
  },

  tierSubtitle: {
    fontSize: 17,
    fontWeight: '900',
    color: GREEN,
    marginTop: 5,
  },

  limitsBox: {
    backgroundColor: BACKGROUND,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },

  limitsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: BLACK,
    marginBottom: 12,
  },

  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },

  limitLabel: {
    fontSize: 13,
    color: MUTED,
    flex: 1,
  },

  limitValue: {
    fontSize: 14,
    fontWeight: '900',
    color: BLACK,
    marginLeft: 8,
  },

  upgradeButton: {
    backgroundColor: DARK_GREEN,
    borderRadius: 15,
    paddingVertical: 17,
    paddingHorizontal: 16,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  upgradeButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
  },

  buttonArrow: {
    color: WHITE,
    fontSize: 26,
    fontWeight: '800',
    marginLeft: 10,
  },

  lockedButton: {
    backgroundColor: '#F0F2EF',
    borderRadius: 15,
    paddingVertical: 17,
    marginTop: 18,
    alignItems: 'center',
  },

  lockedButtonText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '900',
  },

  currentButton: {
    backgroundColor: '#E8F5EC',
    borderRadius: 15,
    paddingVertical: 17,
    marginTop: 18,
    alignItems: 'center',
  },

  currentButtonText: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '900',
  },

  footerSpace: {
    height: 10,
  },
});
