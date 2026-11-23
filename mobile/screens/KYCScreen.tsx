
import React from 'react';
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

type Props = {
  onBack?: () => void;
  onSelect?: (section: string) => void;
  verificationLevel?: string | number;
  verificationStatus?: string;
};

type TierStatus =
  | 'Current Tier'
  | 'Completed'
  | 'Upgrade Available'
  | 'Locked';

type Tier = {
  number: number;
  title: string;
  subtitle: string;
  description: string;
  accountLimit: string;
  dailyLimit: string;
  requirements: string[];
};

const tiers: Tier[] = [
  {
    number: 1,
    title: 'Identity Verification',
    subtitle: 'Basic Banking',
    description:
      'Complete Tier 1 using either your BVN or your NIN. You only need one successfully verified option.',
    accountLimit: '₦300,000',
    dailyLimit: '₦50,000',
    requirements: [
      'Basic account registration',
      'Personal information',
      'BVN or NIN verification',
    ],
  },
  {
    number: 2,
    title: 'Identity Verification',
    subtitle: 'Enhanced Banking',
    description:
      'Complete your identity verification securely using the approved verification process.',
    accountLimit: '₦500,000',
    dailyLimit: '₦200,000',
    requirements: [
      'Verified BVN from Tier 1',
      'Identity document verification',
      'Identity verification approval',
    ],
  },
  {
    number: 3,
    title: 'Proof of Address',
    subtitle: 'Full Banking',
    description:
      'Submit an approved proof of address and complete selfie/liveness verification to upgrade to Tier 3.',
    accountLimit: 'Unlimited',
    dailyLimit: '₦5,000,000',
    requirements: [
      'Completed Tier 2 verification',
      'Approved proof of address',
      'Selfie and liveness verification',
      'Final Tier 3 approval',
    ],
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
  onBack,
  onSelect,
  verificationLevel = 0,
}: Props) {
  const currentLevel = formatLevel(verificationLevel);

  const getTierStatus = (tier: number): TierStatus => {
    if (currentLevel >= tier) {
      return tier === currentLevel
        ? 'Current Tier'
        : 'Completed';
    }

    if (tier === currentLevel + 1) {
      return 'Upgrade Available';
    }

    return 'Locked';
  };

  const isTierAvailable = (tier: number) =>
    tier <= currentLevel + 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Verification Tiers
        </Text>

        <Text style={styles.headerSubtitle}>
          Upgrade your ZENIMONIES account to unlock more
          banking features and higher limits.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentCard}>
          <View style={styles.currentIcon}>
            <Text style={styles.currentIconText}>✓</Text>
          </View>

          <Text style={styles.currentTitle}>
            Your Verification Journey
          </Text>

          <Text style={styles.currentDescription}>
            Your current verification level is Tier {currentLevel}.
            Choose your next eligible tier to view its requirements.
          </Text>

          <View style={styles.currentLevelBadge}>
            <Text style={styles.currentLevelText}>
              {currentLevel === 0
                ? 'Not verified'
                : `Current Level: Tier ${currentLevel}`}
            </Text>
          </View>
        </View>

        {tiers.map((tier) => {
          const status = getTierStatus(tier.number);
          const available = isTierAvailable(tier.number);
          const isCurrent = status === 'Current Tier';

          return (
            <View
              key={tier.number}
              style={[
                styles.tierCard,
                isCurrent && styles.currentTierCard,
              ]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.tierIcon,
                    isCurrent && styles.currentTierIcon,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierIconText,
                      isCurrent && styles.currentTierIconText,
                    ]}
                  >
                    {tier.number}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isCurrent && styles.currentBadge,
                    status === 'Completed' && styles.completedBadge,
                    status === 'Locked' && styles.lockedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isCurrent && styles.currentBadgeText,
                      status === 'Completed' && styles.completedText,
                      status === 'Locked' && styles.lockedText,
                    ]}
                  >
                    {status}
                  </Text>
                </View>
              </View>

              <Text style={styles.tierTitle}>
                Tier {tier.number}
              </Text>

              <Text style={styles.tierSubtitle}>
                {tier.subtitle}
              </Text>

              <Text style={styles.tierDescription}>
                {tier.description}
              </Text>

              <Text style={styles.requirementsTitle}>
                Verification Requirements
              </Text>

              {tier.requirements.map((requirement, index) => (
                <View
                  key={index}
                  style={styles.requirementRow}
                >
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>

                  <Text style={styles.requirementText}>
                    {requirement}
                  </Text>
                </View>
              ))}

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

              {available && !isCurrent && status !== 'Completed' && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  activeOpacity={0.8}
                  onPress={() =>
                    onSelect?.(
                      tier.number === 1
                        ? 'Tier 1 BVN or NIN Verification'
                        : tier.number === 2
                        ? 'Tier 2 Identity Verification'
                        : 'Tier 3 Proof of Address',
                    )
                  }
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

              {!available && (
                <View style={styles.lockedButton}>
                  <Text style={styles.lockedButtonText}>
                    Complete Tier {tier.number - 1} First
                  </Text>
                </View>
              )}

              {isCurrent && (
                <View style={styles.currentButton}>
                  <Text style={styles.currentButtonText}>
                    Your Current Tier
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

  currentCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  currentIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  currentIconText: {
    color: GREEN,
    fontSize: 28,
    fontWeight: '900',
  },

  currentTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: BLACK,
  },

  currentDescription: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 23,
    marginTop: 8,
  },

  currentLevelBadge: {
    backgroundColor: '#E8F5EC',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 15,
  },

  currentLevelText: {
    color: DARK_GREEN,
    fontWeight: '800',
    fontSize: 12,
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

  tierIconText: {
    fontSize: 24,
    fontWeight: '900',
    color: MUTED,
  },

  currentTierIconText: {
    color: WHITE,
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

  tierDescription: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 23,
    marginTop: 16,
    marginBottom: 22,
  },

  requirementsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: BLACK,
    marginBottom: 13,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  checkText: {
    fontSize: 15,
    fontWeight: '900',
    color: GREEN,
  },

  requirementText: {
    flex: 1,
    fontSize: 14,
    color: BLACK,
    lineHeight: 20,
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
