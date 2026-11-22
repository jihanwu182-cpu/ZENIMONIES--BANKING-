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
const LIGHT_GREEN = '#EAF5E9';

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
      Alert.alert('Share Receipt', 'Receipt sharing will be available soon.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Success icon with gold sparkles */}
      <View style={styles.successArea}>
        <View style={styles.sparkle sparkleTopLeft}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>

        <View style={styles.sparkle sparkleTopRight}>
          <Text style={styles.sparkleTextSmall}>✦</Text>
        </View>

        <View style={styles.sparkle sparkleLeft}>
          <Text style={styles.sparkleTextTiny}>✦</Text>
        </View>

        <View style={styles.sparkle sparkleRight}>
          <Text style={styles.sparkleText}>✦</Text>
        </View>

        <View style={styles.sparkle sparkleBottom}>
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

      {/* Receipt card */}
      <View style={styles.receiptCard}>
        <Text style={styles.amount}>{formattedAmount}</Text>

        <Text style={styles.recipientName}>{accountName}</Text>

        {/* Actual recipient bank logo and bank name */}
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

        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Transfer timeline */}
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

        {/* Transaction reference */}
        <View style={styles.referenceDivider} />

        <Text style={styles.referenceLabel}>Transaction Reference</Text>
        <Text style={styles.referenceValue}>{transactionReference}</Text>
      </View>

      {/* Bottom actions */}
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
