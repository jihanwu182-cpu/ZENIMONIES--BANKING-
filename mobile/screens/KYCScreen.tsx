
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
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

type KYCStatus = 'verified' | 'pending' | 'not_started' | 'rejected';

type KYCItem = {
  title: string;
  description: string;
  status: KYCStatus;
  icon: string;
};

type Props = {
  onBack?: () => void;
  onSelect?: (section: string) => void;
};

const verificationItems: KYCItem[] = [
  {
    title: 'Personal Information',
    description: 'Confirm your personal details',
    status: 'verified',
    icon: '👤',
  },
  {
    title: 'BVN Verification',
    description: 'Verify your Bank Verification Number',
    status: 'not_started',
    icon: '🏦',
  },
  {
    title: 'NIN Verification',
    description: 'Verify your National Identity Number',
    status: 'not_started',
    icon: '🛡️',
  },
  {
    title: 'Identity Verification',
    description: 'Submit your identity document',
    status: 'not_started',
    icon: '🪪',
  },
  {
    title: 'Address Verification',
    description: 'Verify your residential address',
    status: 'not_started',
    icon: '📍',
  },
  {
    title: 'Facial Verification',
    description: 'Complete your face verification',
    status: 'not_started',
    icon: '🤳',
  },
];

const statusLabel = (status: KYCStatus) => {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Not Started';
  }
};

export default function KYCScreen({
  onBack,
  onSelect,
}: Props) {
  const completed = verificationItems.filter(
    item => item.status === 'verified',
  ).length;

  const progress =
    (completed / verificationItems.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Verification
        </Text>

        <Text style={styles.headerSubtitle}>
          Complete your verification to unlock more features.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressTitle}>
                Verification Progress
              </Text>
              <Text style={styles.progressSubtitle}>
                {completed} of {verificationItems.length} completed
              </Text>
            </View>

            <Text style={styles.progressPercent}>
              {Math.round(progress)}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Identity & Verification
        </Text>

        {verificationItems.map((item, index) => (
          <TouchableOpacity
            key={item.title}
            style={styles.kycCard}
            activeOpacity={0.75}
            onPress={() => onSelect?.(item.title)}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconContainer}>
                <Text style={styles.cardIcon}>
                  {item.icon}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === 'verified' && styles.verifiedBadge,
                  item.status === 'pending' && styles.pendingBadge,
                  item.status === 'rejected' && styles.rejectedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'verified' && styles.verifiedText,
                    item.status === 'pending' && styles.pendingText,
                    item.status === 'rejected' && styles.rejectedText,
                  ]}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>
              {item.title}
            </Text>

            <Text style={styles.cardDescription}>
              {item.description}
            </Text>

            <View style={styles.cardBottom}>
              <Text style={styles.actionText}>
                {item.status === 'verified'
                  ? 'Completed'
                  : item.status === 'pending'
                  ? 'Under review'
                  : item.status === 'rejected'
                  ? 'Resubmit verification'
                  : 'Verify now'}
              </Text>

              <Text style={styles.arrow}>
                ›
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.footerSpace} />
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
    paddingBottom: 22,
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
    fontSize: 25,
    fontWeight: '800',
    color: BLACK,
  },

  headerSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 6,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  progressCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },

  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
  },

  progressSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },

  progressPercent: {
    fontSize: 19,
    fontWeight: '800',
    color: GREEN,
  },

  progressTrack: {
    height: 7,
    backgroundColor: '#EDF1E7',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BLACK,
    marginBottom: 12,
  },

  kycCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#F2F6E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardIcon: {
    fontSize: 20,
  },

  statusBadge: {
    backgroundColor: '#F0F2EF',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  verifiedBadge: {
    backgroundColor: '#E7F5E3',
  },

  pendingBadge: {
    backgroundColor: '#FFF3D8',
  },

  rejectedBadge: {
    backgroundColor: '#FDE8E8',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },

  verifiedText: {
    color: DARK_GREEN,
  },

  pendingText: {
    color: '#B77900',
  },

  rejectedText: {
    color: '#C62828',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BLACK,
  },

  cardDescription: {
    fontSize: 12,
    color: MUTED,
    marginTop: 5,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
  },

  arrow: {
    fontSize: 23,
    color: GREEN,
  },

  footerSpace: {
    height: 15,
  },
});
