
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

const GREEN = '#07803F';
const DARK_GREEN = '#056B34';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F3F7F4';
const WHITE = '#FFFFFF';
const BORDER = '#E5EBE7';

const API_BASE = 'https://zenimonies-banking.onrender.com/api';

type Props = {
  token: string;
  onBack?: () => void;
  onSelect?: (section: string) => void;
  verificationLevel?: string | number;
  verificationStatus?: string;
};

type Limits = {
  account_limit?: number | string | null;
  daily_transfer_limit?: number | string | null;
};

type KycStatus = {
  tier?: string | number;
  tier_2_status?: string;
  tier_3_status?: string;
  tier_3_method?: string | null;
  bvn_status?: string;
  nin_status?: string;
  id_status?: string;
  tier_2_liveness_status?: string;
};

type Tier = {
  number: number;
  title: string;
  description: string;
  accountLimit: string;
  dailyLimit: string;
};

const tiers: Tier[] = [
  {
    number: 1,
    title: 'Identity Verification',
    description:
      'Complete Tier 1 using either your BVN or your NIN. You only need one successfully verified option.',
    accountLimit: '₦300,000',
    dailyLimit: '₦50,000',
  },
  {
    number: 2,
    title: 'Identity Verification',
    description:
      'Complete your identity verification securely using our approved verification process.',
    accountLimit: '₦500,000',
    dailyLimit: '₦200,000',
  },
  {
    number: 3,
    title: 'Proof of Address',
    description:
      'Submit an approved proof of address and a selfie to complete Tier 3 verification.',
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

const formatLimit = (value?: number | string | null) => {
  if (value === null) return 'Unlimited';
  if (value === undefined || value === '') return null;

  const amount = Number(value);

  if (!Number.isFinite(amount)) return String(value);

  return `₦${amount.toLocaleString('en-NG', {
    maximumFractionDigits: 2,
  })}`;
};

const isPending = (value?: string | null) =>
  ['pending', 'under_review'].includes(
    String(value || '').trim().toLowerCase(),
  );

export default function KYCScreen({
  token,
  onSelect,
  verificationLevel = 0,
}: Props) {
  const [currentLevel, setCurrentLevel] = useState(
    formatLevel(verificationLevel),
  );

  const [kyc, setKyc] = useState<KycStatus>({});
  const [limits, setLimits] = useState<Limits>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKycStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!token) {
        throw new Error('Session expired. Please log in again.');
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
            'Unable to retrieve KYC status.',
        );
      }

      const responseKyc =
        data?.kyc ??
        data?.data?.kyc ??
        data?.data ??
        data;

      const responseLimits =
        data?.limits ??
        data?.data?.limits ??
        {};

      setKyc(responseKyc);
      setLimits(responseLimits);
      setCurrentLevel(formatLevel(responseKyc?.tier));
    } catch (err: any) {
      setError(
        err?.message || 'Unable to load your verification status.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  const getStatus = (tierNumber: number) => {
    if (tierNumber <= currentLevel && currentLevel > 0) {
      return 'Verified';
    }

    if (
      tierNumber === 1 &&
      (isPending(kyc.bvn_status) || isPending(kyc.nin_status))
    ) {
      return 'Pending';
    }

    if (
      tierNumber === 2 &&
      (
        isPending(kyc.id_status) ||
        isPending(kyc.tier_2_liveness_status)
      )
    ) {
      return 'Pending';
    }

    if (
      tierNumber === 3 &&
      !!kyc.tier_3_method &&
      isPending(kyc.tier_3_status)
    ) {
      return 'Pending';
    }

    if (tierNumber === currentLevel + 1) {
      return 'Available';
    }

    return 'Locked';
  };

  const getAccountLimit = (tier: Tier) => {
    if (tier.number === currentLevel) {
      return formatLimit(limits.account_limit) ?? tier.accountLimit;
    }

    return tier.accountLimit;
  };

  const getDailyLimit = (tier: Tier) => {
    if (tier.number === currentLevel) {
      return (
        formatLimit(limits.daily_transfer_limit) ??
        tier.dailyLimit
      );
    }

    return tier.dailyLimit;
  };

  const handleSelectTier = (tierNumber: number) => {
    const section =
      tierNumber === 1
        ? 'Tier 1 BVN or NIN Verification'
        : tierNumber === 2
        ? 'Tier 2 Identity Verification'
        : 'Tier 3 Proof of Address';

    onSelect?.(section);
  };

  const getBadgeStyle = (status: string) => {
    if (status === 'Verified') return styles.verifiedBadge;
    if (status === 'Pending') return styles.pendingBadge;
    if (status === 'Available') return styles.availableBadge;
    return styles.lockedBadge;
  };

  const getBadgeTextStyle = (status: string) => {
    if (status === 'Verified') return styles.verifiedText;
    if (status === 'Pending') return styles.pendingText;
    if (status === 'Available') return styles.availableText;
    return styles.lockedText;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact green verification banner */}
        <View style={styles.heroCard}>
          <Text style={styles.brandText}>
            ZENIMONIES
          </Text>

          <Text style={styles.heroTitle}>
            Identity Verification
          </Text>

          <Text style={styles.heroDescription}>
            Complete your verification securely to unlock higher
            account and transfer limits.
          </Text>

          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                ✓ Secure verification
              </Text>
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                🔒 Your information is protected
              </Text>
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                ₦ Nigerian Naira
              </Text>
            </View>
          </View>
        </View>

        {/* Current verification level */}
        <View style={styles.currentLevelCard}>
          <View style={styles.levelNumberBox}>
            <Text style={styles.levelNumber}>
              {loading ? '—' : currentLevel}
            </Text>
          </View>

          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>
              Current verification level
            </Text>

            <Text style={styles.levelDescription}>
              Your approved ZENIMONIES verification level
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={GREEN} size="small" />
            <Text style={styles.loadingText}>
              Checking verification status...
            </Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>

            <TouchableOpacity
              onPress={fetchKycStatus}
              activeOpacity={0.8}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Verification tier cards */}
        {tiers.map((tier) => {
          const status = getStatus(tier.number);

          return (
            <TouchableOpacity
              key={tier.number}
              activeOpacity={status === 'Available' ? 0.92 : 1}
              disabled={loading || status !== 'Available'}
              onPress={() => handleSelectTier(tier.number)}
              style={styles.tierCard}
            >
              <Text style={styles.tierLabel}>
                TIER {tier.number}
              </Text>

              <Text style={styles.tierTitle}>
                {tier.title}
              </Text>

              <Text style={styles.tierDescription}>
                {tier.description}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  getBadgeStyle(status),
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    getBadgeTextStyle(status),
                  ]}
                >
                  {loading
                    ? 'Checking...'
                    : status === 'Verified'
                    ? '✓ Verified'
                    : status === 'Pending'
                    ? '◷ Pending'
                    : status === 'Available'
                    ? 'Available'
                    : '🔒 Locked'}
                </Text>
              </View>

              <View style={styles.limitsBox}>
                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    Account limit
                  </Text>

                  <Text style={styles.limitValue}>
                    {getAccountLimit(tier)}
                  </Text>
                </View>

                <View style={styles.limitDivider} />

                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    Daily transfer limit
                  </Text>

                  <Text style={styles.limitValue}>
                    {getDailyLimit(tier)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.footerText}>
          ZENIMONIES uses secure identity verification
          to help protect your account and financial activities.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },

  /* Compact, centred green banner */
  heroCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 16,
  },

  brandText: {
    color: '#DDF3E5',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  heroTitle: {
    color: WHITE,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },

  heroDescription: {
    color: '#E5F5EA',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },

  heroBadge: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  heroBadgeText: {
    color: WHITE,
    fontSize: 8,
    fontWeight: '800',
  },

  /* Current verification level */
  currentLevelCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 18,
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },

  levelNumberBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#159A4B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  levelNumber: {
    color: WHITE,
    fontSize: 29,
    fontWeight: '900',
  },

  levelInfo: {
    flex: 1,
  },

  levelTitle: {
    color: BLACK,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },

  levelDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },

  loadingBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },

  loadingText: {
    color: MUTED,
    fontSize: 13,
    marginLeft: 9,
  },

  errorBox: {
    backgroundColor: '#FFF1EF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 20,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },

  retryText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '900',
  },

  /* Verification tier cards */
  tierCard: {
    backgroundColor: WHITE,
    borderRadius: 23,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  tierLabel: {
    color: '#159A4B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 11,
  },

  tierTitle: {
    color: BLACK,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  tierDescription: {
    color: '#777F79',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 18,
    marginBottom: 18,
  },

  verifiedBadge: {
    backgroundColor: '#E5F6EC',
  },

  pendingBadge: {
    backgroundColor: '#FFF3D3',
  },

  availableBadge: {
    backgroundColor: '#E5F6EC',
  },

  lockedBadge: {
    backgroundColor: '#F0F2EF',
  },

  statusBadgeText: {
    fontSize: 14,
    fontWeight: '900',
  },

  verifiedText: {
    color: DARK_GREEN,
  },

  pendingText: {
    color: '#986500',
  },

  availableText: {
    color: DARK_GREEN,
  },

  lockedText: {
    color: MUTED,
  },

  limitsBox: {
    backgroundColor: '#F5F8F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECE7',
    overflow: 'hidden',
  },

  limitRow: {
    minHeight: 62,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  limitLabel: {
    color: '#7B837D',
    fontSize: 14,
    flex: 1,
  },

  limitValue: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 10,
    textAlign: 'right',
  },

  limitDivider: {
    height: 1,
    backgroundColor: '#E7ECE8',
  },

  footerText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 12,
  },
});
