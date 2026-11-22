
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';

export type ExternalBankTransferSuccessScreenProps = {
  amount: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankLogo?: string | null;
  transactionReference: string;
  onDone: () => void;
  onShareReceipt?: () => void;
};

const GREEN = '#07803F';
const DARK_GREEN = '#056B34';
const BLACK = '#172018';
const MUTED = '#858B83';
const WHITE = '#FFFFFF';
const GOLD = '#E5B800';

export default function ExternalBankTransferSuccessScreen({
  amount,
  accountName,
  accountNumber,
  bankName,
  bankLogo,
  transactionReference,
  onDone,
  onShareReceipt,
}: ExternalBankTransferSuccessScreenProps) {
  const now = new Date();

  const formattedAmount = `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedDate = now.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const time = now.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleShare = () => {
    if (onShareReceipt) {
      onShareReceipt();
    } else {
      Alert.alert(
        'Share Receipt',
        'Receipt sharing will be available soon.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Success icon and gold sparkles */}
      <View style={styles.successArea}>
        <View style={[styles.sparkle, styles.sparkleTopLeft]}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>

        <View style={[styles.sparkle, styles.sparkleTopRight]}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </View>

        <View style={[styles.sparkle, styles.sparkleLeft]}>
          <Text style={styles.sparkleTextTiny}>✦</Text>
        </View>

        <View style={[styles.sparkle, styles.sparkleRight]}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>

        <View style={[styles.sparkle, styles.sparkleBottom]}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </View>

        <View style={styles.successOuter}>
          <View style={styles.successInner}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>
      </View>

      <Text style={styles.title}>Transfer Successful</Text>

      <Text style={styles.subtitle}>
        Beneficiary should get the money within 5 mins,
        {'\n'}depending on their bank.
      </Text>

      {/* Compact receipt */}
      <View style={styles.receiptCard}>
        <Text style={styles.amount}>{formattedAmount}</Text>

        <Text style={styles.recipientName}>{accountName}</Text>

        <View style={styles.bankRow}>
          {bankLogo ? (
            <Image
              source={{ uri: bankLogo }}
              style={styles.bankLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.bankLogoFallback}>
              <Text style={styles.bankLogoFallbackText}>
                {bankName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.bankName}>{bankName}</Text>
        </View>

        <Text style={styles.accountNumber}>{accountNumber}</Text>

        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={styles.timelineCircle}>
              <Text style={styles.timelineCheck}>✓</Text>
            </View>
            <Text style={styles.timelineLabel}>
              Transfer
              {'\n'}initiated
            </Text>
            <Text style={styles.timelineTime}>{time}</Text>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineCircle}>
              <Text style={styles.timelineCheck}>✓</Text>
            </View>
            <Text style={styles.timelineLabel}>
              Transfer
              {'\n'}processed
            </Text>
            <Text style={styles.timelineTime}>{time}</Text>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineCircle}>
              <Text style={styles.timelineCheck}>✓</Text>
            </View>
            <Text style={styles.timelineLabel}>
              Received by
              {'\n'}{bankName}
            </Text>
            <Text style={styles.timelineTime}>{time}</Text>
          </View>
        </View>

        <View style={styles.referenceDivider} />

        <Text style={styles.referenceLabel}>Transaction Reference</Text>
        <Text style={styles.referenceValue}>{transactionReference}</Text>
      </View>

      {/* Compact buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.shareButton}
          activeOpacity={0.85}
          onPress={handleShare}
        >
          <Text style={styles.shareIcon}>↗</Text>
          <Text style={styles.shareText}>Share Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneButton}
          activeOpacity={0.85}
          onPress={onDone}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },

  successArea: {
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    position: 'relative',
  },

  successOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#72C66B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: WHITE,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },

  sparkle: {
    position: 'absolute',
  },

  sparkleText: {
    color: GOLD,
    fontSize: 23,
    fontWeight: '800',
  },

  sparkleTextSmall: {
    color: GOLD,
    fontSize: 17,
    fontWeight: '800',
  },

  sparkleTextTiny: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
  },

  sparkleTopLeft: {
    left: '29%',
    top: 2,
  },

  sparkleTopRight: {
    right: '29%',
    top: 18,
  },

  sparkleLeft: {
    left: '25%',
    top: 54,
  },

  sparkleRight: {
    right: '23%',
    top: 61,
  },

  sparkleBottom: {
    bottom: 0,
    left: '49%',
  },

  title: {
    color: BLACK,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 0,
  },

  subtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
  },

  receiptCard: {
    width: '100%',
    backgroundColor: '#F5FAF4',
    borderWidth: 1,
    borderColor: '#D6EBD2',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-evenly',
    maxHeight: 390,
  },

  amount: {
    color: GREEN,
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
  },

  recipientName: {
    color: BLACK,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 3,
  },

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 6,
  },

  bankLogo: {
    width: 23,
    height: 23,
    borderRadius: 12,
  },

  bankLogoFallback: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bankLogoFallbackText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '900',
  },

  bankName: {
    color: DARK_GREEN,
    fontSize: 12,
    fontWeight: '800',
  },

  accountNumber: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  dateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },

  timeline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: 8,
    paddingTop: 2,
  },

  timelineLine: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    top: 12,
    height: 3,
    backgroundColor: GREEN,
  },

  timelineItem: {
    width: '32%',
    alignItems: 'center',
  },

  timelineCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#61BB60',
  },

  timelineCheck: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 19,
  },

  timelineLabel: {
    color: BLACK,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 8,
  },

  timelineTime: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },

  referenceDivider: {
    height: 1,
    backgroundColor: '#D8E3D7',
    width: '100%',
    marginTop: 8,
  },

  referenceLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },

  referenceValue: {
    color: BLACK,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 3,
  },

  bottomButtons: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },

  shareButton: {
    flex: 1,
    height: 49,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  shareIcon: {
    color: GREEN,
    fontSize: 21,
    fontWeight: '900',
  },

  shareText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
  },

  doneButton: {
    flex: 1,
    height: 49,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
  },
});
