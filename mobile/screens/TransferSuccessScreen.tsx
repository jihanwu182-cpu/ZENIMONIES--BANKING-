import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

export type TransferSuccessScreenProps = {
  amount: number | string;
  receivingInstitution: string;
  transferType?: 'internal' | 'external';
  transactionReference?: string;
  transactionDate?: string;
  onDone: () => void;
};

const moneyText = (amount: number | string) => {
  const numeric =
    typeof amount === 'number'
      ? amount
      : Number(String(amount).replace(/[^\d.-]/g, ''));

  if (!Number.isFinite(numeric)) return String(amount);

  return `₦${numeric.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function TransferSuccessScreen({
  amount,
  receivingInstitution,
  transferType = 'external',
  transactionReference,
  transactionDate,
  onDone,
}: TransferSuccessScreenProps) {
  const institution =
    transferType === 'internal'
      ? 'ZENIMONIES'
      : receivingInstitution || 'Receiving Bank';

  const dateLabel =
    transactionDate ||
    new Date().toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const handleShare = async () => {
    const receipt = [
      'ZENIMONIES — Transfer Successful',
      `Amount: ${moneyText(amount)}`,
      `Receiving institution: ${institution}`,
      `Date: ${dateLabel}`,
      transactionReference
        ? `Reference: ${transactionReference}`
        : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message: receipt });
    } catch (error) {
      // Share failure must not affect the completed transfer.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BACKGROUND}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <Text style={styles.brand}>ZENIMONIES</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {}}
            style={styles.helpButton}
          >
            <Text style={styles.helpText}>Need Help?</Text>
          </Pressable>
        </View>

        {/* Success section */}
        <View style={styles.hero}>
          <View style={styles.sparkleTop}>
            <Text style={styles.sparkle}>✦</Text>
          </View>

          <View style={styles.successCircle}>
            <Text style={styles.check}>✓</Text>
          </View>

          <View style={styles.sparkleSide}>
            <Text style={styles.sparkle}>✦</Text>
          </View>

          <Text style={styles.heading}>Transfer Successful</Text>

          <Text style={styles.subtitle}>
            Your transfer has been completed successfully.
          </Text>
        </View>

        {/* Transaction Card */}
        <View style={styles.receiptCard}>
          <Text style={styles.amountLabel}>Amount sent</Text>

          <Text style={styles.amount}>
            {moneyText(amount)}
          </Text>

          <Text style={styles.institutionLabel}>
            Receiving institution
          </Text>

          <Text style={styles.institution}>
            {institution}
          </Text>

          <Text style={styles.date}>
            {dateLabel}
          </Text>

          {transactionReference ? (
            <Text style={styles.reference}>
              Ref: {transactionReference}
            </Text>
          ) : null}

          {/* Transfer timeline */}
          <View style={styles.timeline}>
            <TimelineItem
              title="Transfer initiated"
              last={false}
            />

            <TimelineItem
              title="Transfer processed"
              last={false}
            />

            <TimelineItem
              title={`Received by ${institution}`}
              last
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomButtons}>
        <Pressable
          style={styles.shareButton}
          onPress={handleShare}
          accessibilityRole="button"
        >
          <Text style={styles.shareIcon}>↗</Text>
          <Text style={styles.shareText}>Share Receipt</Text>
        </Pressable>

        <Pressable
          style={styles.doneButton}
          onPress={onDone}
          accessibilityRole="button"
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Timeline component
function TimelineItem({
  title,
  last,
}: {
  title: string;
  last: boolean;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineMarkerColumn}>
        <View style={styles.timelineDot}>
          <Text style={styles.timelineCheck}>✓</Text>
        </View>

        {!last && <View style={styles.timelineLine} />}
      </View>

      <Text style={styles.timelineTitle}>
        {title}
      </Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },

  brand: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  helpButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  helpText: {
    color: BLACK,
    fontSize: 13,
    fontWeight: '600',
  },

  hero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 22,
    position: 'relative',
  },

  successCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  check: {
    color: WHITE,
    fontSize: 52,
    fontWeight: '600',
    lineHeight: 60,
  },

  sparkleTop: {
    position: 'absolute',
    top: 17,
    left: '28%',
  },

  sparkleSide: {
    position: 'absolute',
    top: 62,
    right: '22%',
  },

  sparkle: {
    color: '#D6A51C',
    fontSize: 20,
  },

  heading: {
    color: BLACK,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },

  subtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },

  receiptCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 22,
    alignItems: 'center',
  },

  amountLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
  },

  amount: {
    color: DARK_GREEN,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 5,
    marginBottom: 16,
  },

  institutionLabel: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  institution: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },

  date: {
    color: MUTED,
    fontSize: 12,
    marginTop: 10,
  },

  reference: {
    color: MUTED,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  timeline: {
    width: '100%',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 36,
    alignItems: 'flex-start',
  },

  timelineMarkerColumn: {
    width: 22,
    alignItems: 'center',
    marginRight: 10,
  },

  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineCheck: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '800',
  },

  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: GREEN,
    marginTop: 2,
  },

  timelineTitle: {
    color: BLACK,
    fontSize: 13,
    fontWeight: '600',
    paddingTop: 2,
  },

  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
    backgroundColor: BACKGROUND,
  },

  shareButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WHITE,
  },

  shareIcon: {
    color: DARK_GREEN,
    fontSize: 18,
    fontWeight: '700',
  },

  shareText: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '700',
  },

  doneButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
});
