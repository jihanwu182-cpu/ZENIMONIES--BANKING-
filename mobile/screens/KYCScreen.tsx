
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

const GREEN = '#07803F';
const DARK_GREEN = '#056B34';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F5F7F4';
const WHITE = '#FFFFFF';
const BORDER = '#E6EBE5';

const API_BASE = 'https://zenimonies-banking.onrender.com/api';

type Props = {
  token: string;
  onBack?: () => void;
  onSelect?: (section: string) => void;
  verificationLevel?: string | number;
  verificationStatus?: string;
};

type Tier = {
  number: number;
  subtitle: string;
  accountLimit: string;
  dailyLimit: string;
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

const tiers: Tier[] = [
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
  onBack,
  onSelect,
  verificationLevel = 0,
}: Props) {
  const [currentLevel, setCurrentLevel] = useState(
    formatLevel(verificationLevel),
  );

  const [kyc, setKyc] = useState<KycStatus>({});
  const [limits, setLimits] = useState<Limits>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchKycStatus = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        if (!token) {
          setError('Session expired. Please log in again.');
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
          err?.message || 'Unable to load your KYC status.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  const handleSelectTier = (tierNumber: number) => {
    const section =
      tierNumber === 1
        ? 'Tier 1 BVN or NIN Verification'
        : tierNumber === 2
        ? 'Tier 2 Identity Verification'
        : 'Tier 3 Proof of Address';

    onSelect?.(section);
  };

  const getStatus = (tierNumber: number) => {
    if (tierNumber <= currentLevel && currentLevel > 0) {
      return 'Verified';
    }

    if (
      tierNumber === 1 &&
      (
        isPending(kyc.bvn_status) ||
        isPending(kyc.nin_status)
      )
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

  const getStatusStyle = (status: string) => {
    if (status === 'Verified') return styles.verifiedBadge;
    if (status === 'Pending') return styles.pendingBadge;
    if (status === 'Available') return styles.availableBadge;

    return styles.lockedBadge;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>KYC</Text>

        <Text style={styles.headerSubtitle}>
          Manage your account verification and banking limits.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>✓</Text>
            </View>

            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>
                ACCOUNT VERIFICATION
              </Text>

              <Text style={styles.summaryLevel}>
                {loading
                  ? 'Checking status...'
                  : currentLevel > 0
                  ? `Tier ${currentLevel} Verified`
                  : 'Not verified'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchKycStatus(true)}
            disabled={loading || refreshing}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator color={GREEN} size="small" />
            ) : (
              <>
                <Text style={styles.refreshIcon}>↻</Text>
                <Text style={styles.refreshText}>
                  Refresh status
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                onPress={() => fetchKycStatus(true)}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {tiers.map((tier) => {
          const status = getStatus(tier.number);
          const isVerified = status === 'Verified';
          const isAvailable = status === 'Available';
          const isPendingStatus = status === 'Pending';
          const isLocked = status === 'Locked';

          return (
            <View
              key={tier.number}
              style={[
                styles.tierCard,
                isVerified && styles.currentTierCard,
                isAvailable && styles.availableTierCard,
                isPendingStatus && styles.pendingTierCard,
              ]}
            >
              <View style={styles.tierHeader}>
                <View
                  style={[
                    styles.tierNumberBox,
                    isVerified && styles.activeTierNumberBox,
                    isAvailable && styles.availableTierNumberBox,
                    isPendingStatus && styles.pendingTierNumberBox,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierNumber,
                      isVerified && styles.activeTierNumber,
                      isAvailable && styles.availableTierNumber,
                      isPendingStatus && styles.pendingTierNumber,
                    ]}
                  >
                    {tier.number}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusStyle(status),
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isVerified && styles.verifiedBadgeText,
                      isAvailable && styles.availableBadgeText,
                      isPendingStatus && styles.pendingBadgeText,
                    ]}
                  >
                    {loading ? '...' : status}
                  </Text>
                </View>
              </View>

              <Text style={styles.tierTitle}>
                Tier {tier.number}
              </Text>

              <Text style={styles.tierSubtitle}>
                {tier.subtitle}
              </Text>

              <View style={styles.limitsBox}>
                <Text style={styles.limitsHeading}>
                  Account limits
                </Text>

                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    Account limit
                  </Text>

                  <Text style={styles.limitValue}>
                    {getAccountLimit(tier)}
                  </Text>
                </View>

                <View style={styles.limitRow}>
                  <Text style={styles.limitLabel}>
                    Daily transfer
                  </Text>

                  <Text style={styles.limitValue}>
                    {getDailyLimit(tier)}
                  </Text>
                </View>
              </View>

              {!loading && isVerified && (
                <View style={styles.verifiedFooter}>
                  <Text style={styles.verifiedFooterText}>
                    ✓ Verified
                  </Text>
                </View>
              )}

              {!loading && isPendingStatus && (
                <View style={styles.pendingFooter}>
                  <ActivityIndicator
                    color="#9A6700"
                    size="small"
                  />
                  <Text style={styles.pendingFooterText}>
                    Verification pending
                  </Text>
                </View>
              )}

              {!loading && isAvailable && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  activeOpacity={0.85}
                  onPress={() => handleSelectTier(tier.number)}
                >
                  <Text style={styles.upgradeButtonText}>
                    Continue
                  </Text>

                  <Text style={styles.upgradeArrow}>›</Text>
                </TouchableOpacity>
              )}

              {!loading && isLocked && (
                <View style={styles.lockedFooter}>
                  <Text style={styles.lockedFooterText}>
                    Complete Tier {tier.number - 1} first
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottomSpace} />
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
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 25,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    marginBottom: 14,
  },

  backIcon: {
    fontSize: 42,
    lineHeight: 46,
    color: BLACK,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.8,
  },

  headerSubtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: MUTED,
    marginTop: 10,
    maxWidth: 340,
  },

  scrollContent: {
    backgroundColor: BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 30,
  },

  summaryCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8F5ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  summaryIconText: {
    color: GREEN,
    fontSize: 28,
    fontWeight: '900',
  },

  summaryInfo: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: MUTED,
  },

  summaryLevel: {
    fontSize: 21,
    fontWeight: '900',
    color: BLACK,
    marginTop: 4,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginTop: 18,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 15,
  },

  refreshIcon: {
    fontSize: 19,
    color: GREEN,
    fontWeight: '900',
    marginRight: 8,
  },

  refreshText: {
    fontSize: 13,
    color: GREEN,
    fontWeight: '800',
  },

  errorBox: {
    backgroundColor: '#FFF2F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  errorText: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 19,
  },

  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  retryText: {
    color: '#B42318',
    fontWeight: '900',
  },

  tierCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  currentTierCard: {
    borderColor: '#C7E3D0',
    borderWidth: 1.5,
  },

  availableTierCard: {
    borderColor: '#A5D5B6',
    borderWidth: 1.5,
  },

  pendingTierCard: {
    borderColor: '#E8D7A8',
    borderWidth: 1.5,
  },

  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  tierNumberBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#F0F3F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTierNumberBox: {
    backgroundColor: '#E8F5ED',
  },

  availableTierNumberBox: {
    backgroundColor: GREEN,
  },

  pendingTierNumberBox: {
    backgroundColor: '#FFF4D6',
  },

  tierNumber: {
    fontSize: 25,
    fontWeight: '900',
    color: MUTED,
  },

  activeTierNumber: {
    color: GREEN,
  },

  availableTierNumber: {
    color: WHITE,
  },

  pendingTierNumber: {
    color: '#9A6700',
  },

  statusBadge: {
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  verifiedBadge: {
    backgroundColor: '#E8F5ED',
  },

  availableBadge: {
    backgroundColor: '#E8F5ED',
  },

  pendingBadge: {
    backgroundColor: '#FFF4D6',
  },

  lockedBadge: {
    backgroundColor: '#F0F2EF',
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: MUTED,
  },

  verifiedBadgeText: {
    color: DARK_GREEN,
  },

  availableBadgeText: {
    color: DARK_GREEN,
  },

  pendingBadgeText: {
    color: '#9A6700',
  },

  tierTitle: {
    fontSize: 29,
    fontWeight: '900',
    color: BLACK,
    letterSpacing: -0.5,
  },

  tierSubtitle: {
    fontSize: 17,
    fontWeight: '800',
    color: GREEN,
    marginTop: 4,
  },

  limitsBox: {
    backgroundColor: '#F5F7F3',
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginTop: 22,
  },

  limitsHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: BLACK,
    marginBottom: 8,
  },

  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },

  limitLabel: {
    fontSize: 14,
    color: MUTED,
    flex: 1,
  },

  limitValue: {
    fontSize: 15,
    fontWeight: '900',
    color: BLACK,
    marginLeft: 8,
  },

  verifiedFooter: {
    backgroundColor: '#E8F5ED',
    borderRadius: 15,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  verifiedFooterText: {
    fontSize: 15,
    fontWeight: '900',
    color: DARK_GREEN,
  },

  pendingFooter: {
    backgroundColor: '#FFF8E7',
    borderRadius: 15,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  pendingFooterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A6700',
    marginLeft: 9,
  },

  upgradeButton: {
    backgroundColor: DARK_GREEN,
    borderRadius: 16,
    minHeight: 58,
    paddingHorizontal: 18,
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

  upgradeArrow: {
    color: WHITE,
    fontSize: 27,
    fontWeight: '700',
    marginLeft: 12,
  },

  lockedFooter: {
    backgroundColor: '#F0F2EF',
    borderRadius: 15,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 18,
  },

  lockedFooterText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 10,
  },
});
