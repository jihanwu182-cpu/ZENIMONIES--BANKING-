
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
} from 'react-native';

export type TransferSuccessScreenProps = {
  amount: number | string;
  receivingInstitution: string;
  transferType?: 'internal' | 'external';
  transactionReference?: string;
  transactionDate?: string;
  initiatedAt?: string;
  processedAt?: string;
  receivedAt?: string;
  onDone: () => void;
};

const GREEN = '#07803D';
const BLACK = '#172018';
const MUTED = '#858B83';
const WHITE = '#FFFFFF';
const BORDER = '#E1E5E1';

export default function TransferSuccessScreen({
  amount,
  receivingInstitution,
  transferType = 'external',
  transactionReference,
  transactionDate,
  initiatedAt,
  processedAt,
  receivedAt,
  onDone,
}: TransferSuccessScreenProps) {
  const formatAmount = (value: number | string) =>
    `₦${Number(value).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value?: string) => {
    if (!value) return 'Transaction completed';

    const date = new Date(value);

    if (isNaN(date.getTime())) return value;

    return date.toLocaleString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (value?: string) => {
    if (!value) return null;

    const date = new Date(value);

    if (isNaN(date.getTime())) return null;

    return date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const initiatedTime = formatTime(initiatedAt);
  const processedTime = formatTime(processedAt);
  const receivedTime = formatTime(receivedAt);

  const handleShare = async () => {
    try {
      await Share.share({
        message: [
          'ZENIMONIES Transfer Receipt',
          '',
          'Status: Successful',
          `Amount: ${formatAmount(amount)}`,
          `Recipient/Institution: ${receivingInstitution}`,
          `Date: ${formatDate(transactionDate)}`,
          initiatedTime ? `Initiated: ${initiatedTime}` : '',
          processedTime ? `Processed: ${processedTime}` : '',
          receivedTime ? `Received: ${receivedTime}` : '',
          transactionReference
            ? `Reference: ${transactionReference}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      // Sharing cancelled or unavailable.
    }
  };

  const isInternal = transferType === 'internal';

  const timeline = [
    {
      label: 'Transfer\ninitiated',
      time: initiatedTime,
    },
    {
      label: 'Transfer\nprocessed',
      time: processedTime,
    },
    {
      label: isInternal
        ? 'Received by\nZENIMONIES'
        : 'Sent to\nbeneficiary',
      time: receivedTime,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Help */}
        <View style={styles.topRow}>
          <View />
          <Text style={styles.helpText}>Need Help?</Text>
        </View>

        {/* Success icon */}
        <View style={styles.successSection}>
          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          <Text style={styles.title}>Transfer Successful</Text>

          <Text style={styles.subtitle}>
            {isInternal
              ? 'Your transfer has been completed successfully.'
              : 'Beneficiary should get the money within 5 mins, depending on their bank.'}
          </Text>
        </View>

        {/* Receipt */}
        <View style={styles.receiptCard}>
          <Text style={styles.receiptAmount}>
            {formatAmount(amount)}
          </Text>

          <Text style={styles.recipientName}>
            {receivingInstitution}
          </Text>

          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandLetter}>Z</Text>
            </View>
            <Text style={styles.brandName}>ZENIMONIES</Text>
          </View>

          <Text style={styles.dateText}>
            {formatDate(transactionDate)}
          </Text>

          {/* Transfer progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLine} />

            {timeline.map((item, index) => (
              <View key={index} style={styles.progressItem}>
                <View style={styles.progressDot}>
                  <Text style={styles.progressCheck}>✓</Text>
                </View>

                <Text style={styles.progressLabel}>
                  {item.label}
                </Text>

                {item.time && (
                  <Text style={styles.progressTime}>
                    {item.time}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Reference */}
          {!!transactionReference && (
            <View style={styles.referenceSection}>
              <Text style={styles.referenceLabel}>
                Transaction Reference
              </Text>
              <Text style={styles.referenceValue}>
                {transactionReference}
              </Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Text style={styles.shareIcon}>↗</Text>
            <Text style={styles.shareText}>Share Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={onDone}
            activeOpacity={0.85}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 35,
  },

  helpText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },

  successSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 22,
  },

  successOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 10,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  successInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: WHITE,
    fontSize: 52,
    fontWeight: '900',
    marginTop: -4,
  },

  title: {
    color: BLACK,
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
  },

  receiptCard: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    width: '100%',
  },

  receiptAmount: {
    color: GREEN,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },

  recipientName: {
    color: BLACK,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  brandLetter: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '900',
  },

  brandName: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '900',
  },

  dateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },

  progressSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: 28,
  },

  progressLine: {
    position: 'absolute',
    top: 14,
    left: '12%',
    right: '12%',
    height: 5,
    backgroundColor: GREEN,
  },

  progressItem: {
    width: '31%',
    alignItems: 'center',
  },

  progressDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  progressCheck: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '900',
  },

  progressLabel: {
    color: BLACK,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },

  progressTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },

  referenceSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 20,
    paddingTop: 14,
  },

  referenceLabel: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
  },

  referenceValue: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },

  shareButton: {
    flex: 1,
    height: 58,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  shareIcon: {
    color: GREEN,
    fontSize: 24,
    fontWeight: '900',
    marginRight: 8,
  },

  shareText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
  },

  doneButton: {
    flex: 1,
    height: 58,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '900',
  },
});
