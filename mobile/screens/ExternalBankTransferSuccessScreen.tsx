import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
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
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SUCCESS ICON + GOLD STARS */}
        <View style={styles.successArea}>
          <Text style={[styles.star, styles.star1]}>✦</Text>
          <Text style={[styles.starSmall, styles.star2]}>✦</Text>
          <Text style={[styles.starTiny, styles.star3]}>✦</Text>
          <Text style={[styles.star, styles.star4]}>✦</Text>
          <Text style={[styles.starSmall, styles.star5]}>✦</Text>

          <View style={styles.successOuter}>
            <View style={styles.successInner}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>
        </View>

        {/* HEADING */}
        <Text style={styles.title}>Transfer Successful</Text>

        <Text style={styles.subtitle}>
          Beneficiary should get the money within 5 mins,
          {'\n'}depending on their bank.
        </Text>

        {/* RECEIPT CARD */}
        <View style={styles.receiptCard}>
          <Text style={styles.amount}>{formattedAmount}</Text>

          {/* RECIPIENT NAME */}
          <Text style={styles.recipientName}>
            {accountName}
          </Text>

          {/* RECEIVING BANK */}
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

          <Text style={styles.accountNumber}>
            {accountNumber}
          </Text>

          <Text style={styles.dateText}>{formattedDate}</Text>

          {/* TRANSFER TIMELINE */}
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
                Sent to
                {'\n'}beneficiary
              </Text>
              <Text style={styles.timelineTime}>{time}</Text>
            </View>
          </View>

          {/* TRANSACTION REFERENCE */}
          <View style={styles.referenceDivider} />

          <Text style={styles.referenceLabel}>
            Transaction Reference
          </Text>

          <Text style={styles.referenceValue}>
            {transactionReference}
          </Text>
        </View>

        {/* BUTTONS */}
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
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 4,
  },

  /* SUCCESS ICON + STARS */

  successArea: {
    height: 24,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 1,
  },

  successOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#72C66B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 11,
  },

  star: {
    position: 'absolute',
    color: GOLD,
    fontSize: 19,
    fontWeight: '900',
  },

  starSmall: {
    position: 'absolute',
    color: GOLD,
    fontSize: 14,
    fontWeight: '900',
  },

  starTiny: {
    position: 'absolute',
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
  },

  star1: {
    left: 18,
    top: 1,
  },

  star2: {
    right: 18,
    top: 10,
  },

  star3: {
    left: 8,
    top: 39,
  },

  star4: {
    right: 5,
    top: 43,
  },

  star5: {
    bottom: 0,
    left: '48%',
  },

  /* HEADING */

  title: {
    color: BLACK,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 0,
  },

  subtitle: {
    color: MUTED,
    fontSize: 6,
    fontWeight: '600',
    lineHeight: 8,
    textAlign: 'center',
    marginTop: 1,
    marginBottom: 2,
  },

  /* RECEIPT CARD */

  receiptCard: {
    width: '60%',
    maxWidth: 210,
    alignSelf: 'center',
    backgroundColor: '#F5FAF4',
    borderWidth: 1,
    borderColor: '#D6EBD2',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
  },

  amount: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },

  recipientName: {
    color: BLACK,
    fontSize: 7,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 1,
  },

  /* BANK */

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 3,
  },

  bankLogo: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  bankLogoFallback: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bankLogoFallbackText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '800',
  },

  bankName: {
    color: DARK_GREEN,
    fontSize: 7,
    fontWeight: '800',
  },

  accountNumber: {
    color: MUTED,
    fontSize: 6,
    fontWeight: '600',
    marginTop: 1,
  },

  dateText: {
    color: MUTED,
    fontSize: 6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },

  /* TIMELINE */

  timeline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: 2,
    paddingTop: 0,
  },

  timelineLine: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    top: 11,
    height: 3,
    backgroundColor: GREEN,
  },

  timelineItem: {
    width: '32%',
    alignItems: 'center',
  },

  timelineCircle: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#61BB60',
  },

  timelineCheck: {
    color: WHITE,
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 8,
  },

  timelineLabel: {
    color: BLACK,
    fontSize: 6,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 8,
    marginTop: 2,
  },

  timelineTime: {
    color: MUTED,
    fontSize: 5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },

  /* REFERENCE */

  referenceDivider: {
    height: 1,
    backgroundColor: '#D8E3D7',
    width: '100%',
    marginTop: 3,
  },

  referenceLabel: {
    color: MUTED,
    fontSize: 6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },

  referenceValue: {
    color: BLACK,
    fontSize: 6,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 1,
  },

  /* BUTTONS */

  bottomButtons: {
    width: '60%',
    maxWidth: 210,
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    alignSelf: 'center',
  },

  shareButton: {
    flex: 1,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.3,
    borderColor: GREEN,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  shareIcon: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '900',
  },

  shareText: {
    color: GREEN,
    fontSize: 7,
    fontWeight: '900',
  },

  doneButton: {
    flex: 1,
    height: 20,
    borderRadius: 5,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 8,
    fontWeight: '900',
  },
});
