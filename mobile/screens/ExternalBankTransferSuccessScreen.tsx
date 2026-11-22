
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
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Success Icon and Sparkles */}
      <View style={styles.successArea}>
        <View style={{ ...styles.sparkle, ...styles.sparkleTopLeft }}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>

         <View style={{ ...styles.sparkle, ...styles.sparkleTopRight }}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </View>

        <View style={{ ...styles.sparkle, ...styles.sparkleRight }}>
          <Text style={styles.sparkleTextTiny}>✦</Text>
        </View>

        <View style={{ ...styles.sparkle, ...styles.sparkleTopLeft }}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>
         <View style={{ ...styles.sparkle, ...styles.sparkleBottom }}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </View>

        <View style={styles.successOuter}>
          <View style={styles.successInner}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>
      </View>

      {/* Heading */}
      <Text style={styles.title}>Transfer Successful</Text>

      <Text style={styles.subtitle}>
        Beneficiary should get the money within 5 mins,
        {'\n'}depending on their bank.
      </Text>

      {/* Receipt Card */}
      <View style={styles.receiptCard}>
        <Text style={styles.amount}>{formattedAmount}</Text>

        <Text style={styles.recipientName}>{accountName}</Text>

        {/* Recipient Bank */}
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

        {/* Transfer Timeline */}
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

        {/* Transaction Reference */}
        <View style={styles.referenceDivider} />

        <Text style={styles.referenceLabel}>
          Transaction Reference
        </Text>

        <Text style={styles.referenceValue}>
          {transactionReference}
        </Text>
      </View>

      {/* Bottom Buttons */}
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
    paddingTop: 8,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },

  successArea: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
  },

  successOuter: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#72C66B',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 47,
    fontWeight: '900',
    lineHeight: 54,
  },

  sparkle: {
    position: 'absolute',
  },

  sparkleText: {
    color: GOLD,
    fontSize: 25,
    fontWeight: '800',
  },

  sparkleTextSmall: {
    color: GOLD,
    fontSize: 18,
    fontWeight: '800',
  },

  sparkleTextTiny: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
  },

  sparkleTopLeft: {
    left: '35%',
    top: 8,
  },

  sparkleTopRight: {
    right: '34%',
    top: 28,
  },

  sparkleLeft: {
    left: '31%',
    top: 72,
  },

  sparkleRight: {
    right: '29%',
    top: 83,
  },

  sparkleBottom: {
    bottom: 0,
    left: '49%',
  },

  title: {
    color: BLACK,
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 0,
  },

  subtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  receiptCard: {
    width: '100%',
    backgroundColor: '#F5FAF4',
    borderWidth: 1,
    borderColor: '#D6EBD2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-evenly',
    maxHeight: 430,
  },

  amount: {
    color: GREEN,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },

  recipientName: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
    gap: 8,
  },

  bankLogo: {
    width: 27,
    height: 27,
    borderRadius: 14,
  },

  bankLogoFallback: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bankLogoFallbackText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
  },

  bankName: {
    color: DARK_GREEN,
    fontSize: 13,
    fontWeight: '800',
  },

  accountNumber: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },

  dateText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  timeline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: 12,
    paddingTop: 2,
  },

  timelineLine: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    top: 15,
    height: 4,
    backgroundColor: GREEN,
  },

  timelineItem: {
    width: '32%',
    alignItems: 'center',
  },

  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#61BB60',
  },

  timelineCheck: {
    color: WHITE,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },

  timelineLabel: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 11,
  },

  timelineTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 7,
  },

  referenceDivider: {
    height: 1,
    backgroundColor: '#D8E3D7',
    width: '100%',
    marginTop: 14,
  },

  referenceLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },

  referenceValue: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 5,
  },

  bottomButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  shareButton: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  shareIcon: {
    color: GREEN,
    fontSize: 25,
    fontWeight: '900',
  },

  shareText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '900',
  },

  doneButton: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '900',
  },
});
