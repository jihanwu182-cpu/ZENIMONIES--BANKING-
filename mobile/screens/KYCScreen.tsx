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
};

type TierCard = {
  tier: number;
  title: string;
  subtitle: string;
  description: string;
  requirements: string[];
  limitInfo: string[];
  icon: string;
  status: 'active' | 'upgrade' | 'locked';
};

const tiers: TierCard[] = [
  {
    tier: 1,
    title: 'Tier 1',
    subtitle: 'Basic Banking',
    description:
      'Your entry-level personal banking account with essential banking access.',
    requirements: [
      'Basic account registration',
      'Personal information',
      'Basic verification',
    ],
    limitInfo: [
      'Basic account limits apply',
    ],
    icon: '①',
    status: 'active',
  },
  {
    tier: 2,
    title: 'Tier 2',
    subtitle: 'Enhanced Banking',
    description:
      'Upgrade your account with additional identity verification to unlock higher transaction limits.',
    requirements: [
      'Identity verification',
      'Facial / liveness verification',
    ],
    limitInfo: [
      'Maximum account balance: ₦500,000',
      'Daily transfer limit: ₦200,000',
    ],
    icon: '②',
    status: 'upgrade',
  },
  {
    tier: 3,
    title: 'Tier 3',
    subtitle: 'Full Banking',
    description:
      'Complete advanced verification to access the highest personal account tier.',
    requirements: [
      'Advanced identity verification',
      'Additional verification requirements',
      'Final verification approval',
    ],
    limitInfo: [
      'Higher account limits apply',
    ],
    icon: '③',
    status: 'locked',
  },
];

export default function KYCScreen({
  onBack,
  onSelect,
}: Props) {
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
        {/* INTRO */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Text style={styles.introIconText}>✓</Text>
          </View>

          <Text style={styles.introTitle}>
            Your Verification Journey
          </Text>

          <Text style={styles.introDescription}>
            Choose a verification tier to see its requirements
            and upgrade your account.
          </Text>
        </View>

        {/* TIERS */}
        {tiers.map((tier) => {
          const isActive = tier.status === 'active';
          const isLocked = tier.status === 'locked';

          const badgeText = isActive
            ? 'Current Tier'
            : isLocked
            ? 'Locked'
            : 'Upgrade Available';

          const buttonText = isActive
            ? 'Current Tier'
            : isLocked
            ? 'Complete Tier 2 First'
            : 'Upgrade to Tier 2';

          return (
            <View
              key={tier.tier}
              style={[
                styles.tierCard,
                isActive && styles.activeTierCard,
                isLocked && styles.lockedTierCard,
              ]}
            >
              {/* TOP */}
              <View style={styles.tierTop}>
                <View
                  style={[
                    styles.tierIcon,
                    isActive && styles.activeTierIcon,
                    isLocked && styles.lockedTierIcon,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierIconText,
                      isActive && styles.activeTierIconText,
                      isLocked && styles.lockedTierIconText,
                    ]}
                  >
                    {tier.icon}
                  </Text>
                </View>

                <View
                  style={[
                    styles.tierBadge,
                    isActive && styles.activeBadge,
                    isLocked && styles.lockedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.tierBadgeText,
                      isActive && styles.activeBadgeText,
                      isLocked && styles.lockedBadgeText,
                    ]}
                  >
                    {badgeText}
                  </Text>
                </View>
              </View>

              {/* TITLE */}
              <Text style={styles.tierTitle}>
                {tier.title}
              </Text>

              <Text style={styles.tierSubtitle}>
                {tier.subtitle}
              </Text>

              <Text style={styles.tierDescription}>
                {tier.description}
              </Text>

              {/* REQUIREMENTS */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsHeading}>
                  Verification Requirements
                </Text>

                {tier.requirements.map((requirement, index) => (
                  <View
                    key={`${tier.tier}-requirement-${index}`}
                    style={styles.detailRow}
                  >
                    <View style={styles.bullet}>
                      <Text style={styles.bulletText}>✓</Text>
                    </View>

                    <Text style={styles.detailText}>
                      {requirement}
                    </Text>
                  </View>
                ))}
              </View>

              {/* LIMITS */}
              <View style={styles.limitsBox}>
                <Text style={styles.limitsHeading}>
                  Account Limits
                </Text>

                {tier.limitInfo.map((limit, index) => (
                  <Text
                    key={`${tier.tier}-limit-${index}`}
                    style={styles.limitText}
                  >
                    • {limit}
                  </Text>
                ))}
              </View>

              {/* ACTION */}
              <TouchableOpacity
                style={[
                  styles.tierButton,
                  isActive && styles.activeTierButton,
                  isLocked && styles.lockedTierButton,
                ]}
                activeOpacity={0.8}
                disabled={isActive || isLocked}
                onPress={() => onSelect?.(`Tier ${tier.tier}`)}
              >
                <Text
                  style={[
                    styles.tierButtonText,
                    isActive && styles.activeTierButtonText,
                    isLocked && styles.lockedTierButtonText,
                  ]}
                >
                  {buttonText}
                </Text>

                {!isActive && !isLocked && (
                  <Text style={styles.buttonArrow}>›</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            ZENIMONIES
          </Text>

          <Text style={styles.footerText}>
            Secure banking. Progressive access.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  header: {
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },

  backButton: {
    width: 40,
    height: 38,
    justifyContent: 'center',
    marginBottom: 12,
  },

  backText: {
    fontSize: 36,
    color: BLACK,
    lineHeight: 40,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: BLACK,
  },

  headerSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 7,
    lineHeight: 20,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 30,
  },

  introCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },

  introIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  introIconText: {
    fontSize: 22,
    fontWeight: '900',
    color: GREEN,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: BLACK,
  },

  introDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
    marginTop: 6,
  },

  tierCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  activeTierCard: {
    borderColor: '#B8DFC7',
    borderWidth: 1.5,
  },

  lockedTierCard: {
    opacity: 0.85,
  },

  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  tierIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#F2F6E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTierIcon: {
    backgroundColor: GREEN,
  },

  lockedTierIcon: {
    backgroundColor: '#F0F2EF',
  },

  tierIconText: {
    fontSize: 22,
    fontWeight: '900',
    color: GREEN,
  },

  activeTierIconText: {
    color: WHITE,
  },

  lockedTierIconText: {
    color: MUTED,
  },

  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 30,
    backgroundColor: '#EDF1E9',
  },

  activeBadge: {
    backgroundColor: '#E4F4E6',
  },

  lockedBadge: {
    backgroundColor: '#F0F2EF',
  },

  tierBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
  },

  activeBadgeText: {
    color: DARK_GREEN,
  },

  lockedBadgeText: {
    color: MUTED,
  },

  tierTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: BLACK,
  },

  tierSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN,
    marginTop: 4,
  },

  tierDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
    marginTop: 10,
  },

  detailsSection: {
    marginTop: 20,
  },

  detailsHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: BLACK,
    marginBottom: 10,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  bullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  bulletText: {
    fontSize: 11,
    fontWeight: '900',
    color: GREEN,
  },

  detailText: {
    flex: 1,
    fontSize: 12,
    color: BLACK,
    lineHeight: 18,
  },

  limitsBox: {
    backgroundColor: '#F6F8F3',
    borderRadius: 12,
    padding: 13,
    marginTop: 12,
  },

  limitsHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: BLACK,
    marginBottom: 8,
  },

  limitText: {
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
    marginBottom: 3,
  },

  tierButton: {
    backgroundColor: GREEN,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
  },

  activeTierButton: {
    backgroundColor: '#E8F5EC',
  },

  lockedTierButton: {
    backgroundColor: '#F0F2EF',
  },

  tierButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: WHITE,
  },

  activeTierButtonText: {
    color: DARK_GREEN,
  },

  lockedTierButtonText: {
    color: MUTED,
  },

  buttonArrow: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 8,
    lineHeight: 24,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 22,
  },

  footerBrand: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },
});
