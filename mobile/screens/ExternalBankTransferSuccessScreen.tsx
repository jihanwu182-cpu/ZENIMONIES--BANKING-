
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
      <StatusBar barStyle="dark-content"/>

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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },

  /* SUCCESS ICON + STARS */

  successArea: {
    width: 150,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },

  successOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#72C66B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: WHITE,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
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
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },

  subtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 9,
  },

  /* RECEIPT CARD */

  receiptCard: {
    width: '92%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: '#F5FAF4',
    borderWidth: 1,
    borderColor: '#D6EBD2',
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  amount: {
    color: GREEN,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },

  recipientName: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },

  /* BANK */

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 5,
  },

  bankLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  bankLogoFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 11,
    fontWeight: '800',
  },

  accountNumber: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  dateText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },

  /* TIMELINE */

  timeline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: 10,
    paddingTop: 2,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#61BB60',
  },

  timelineCheck: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },

  timelineLabel: {
    color: BLACK,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 5,
  },

  timelineTime: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },

  /* REFERENCE */

  referenceDivider: {
    height: 1,
    backgroundColor: '#D8E3D7',
    width: '100%',
    marginTop: 10,
  },

  referenceLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  referenceValue: {
    color: BLACK,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 3,
  },

  /* BUTTONS */

  bottomButtons: {
    width: '92%',
    maxWidth: 360,
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
    alignSelf: 'center',
  },

  shareButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: GREEN,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  shareIcon: {
    color: GREEN,
    fontSize: 17,
    fontWeight: '900',
  },

  shareText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '900',
  },

  doneButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '900',
  },
});
