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

        {/* RECEIPT */}
        <View style={styles.receiptCard}>
          <Text style={styles.amount}>{formattedAmount}</Text>

          <Text style={styles.recipientName}>
            {accountName}
          </Text>

          {/* BANK */}
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
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 16,
  },

  /* SUCCESS ICON + STARS */

  successArea: {
    width: 190,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },

  successOuter: {
    width: 50,
    height: 50,
    borderRadius: 33,
    backgroundColor: '#72C66B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: WHITE,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 36,
  },

  star: {
    position: 'absolute',
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
  },

  starSmall: {
    position: 'absolute',
    color: GOLD,
    fontSize: 15,
    fontWeight: '900',
  },

  starTiny: {
    position: 'absolute',
    color: GOLD,
    fontSize: 11,
    fontWeight: '900',
  },

  star1: {
    left: 30,
    top: 3,
  },

  star2: {
    right: 33,
    top: 15,
  },

  star3: {
    left: 22,
    top: 43,
  },

  star4: {
    right: 19,
    top: 52,
  },

  star5: {
    bottom: 1,
    left: '48%',
  },

  /* HEADING */

  title: {
    color: BLACK,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 3,
  },

  subtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },

  /* RECEIPT CARD */

  receiptCard: {
    width: '70%',
    maxWidth: 200,
    alignSelf: 'center',
    backgroundColor: '#F5FAF4',
    borderWidth: 1,
    borderColor: '#D6EBD2',
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },

  amount: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },

  recipientName: {
    color: BLACK,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },

  /* BANK */

  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    gap: 6,
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
    fontWeight: '700',
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
    marginTop: 4,
  },

  dateText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  /* TIMELINE */

  timeline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginTop: 13,
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
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#61BB60',
  },

  timelineCheck: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },

  timelineLabel: {
    color: BLACK,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 6,
  },

  timelineTime: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  /* REFERENCE */

  referenceDivider: {
    height: 1,
    backgroundColor: '#D8E3D7',
    width: '100%',
    marginTop: 12,
  },

  referenceLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  referenceValue: {
    color: BLACK,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },

  /* BUTTONS */

  bottomButtons: {
    width: '70%',
    maxWidth: 320,
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
    alignSelf: 'center',
  },

  shareButton: {
    flex: 1,
    height: 35,
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
    fontSize: 18,
    fontWeight: '900',
  },

  shareText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '900',
  },

  doneButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
  },
});
