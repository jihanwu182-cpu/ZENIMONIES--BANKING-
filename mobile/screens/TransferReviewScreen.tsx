
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export type TransferReviewScreenProps = {
  recipient: {
    name: string;
    phone: string;
  };
  amount: number;
  narration: string;
  onContinue: () => void;
  onBack: () => void;
};

const GREEN = '#07803F';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F7F7F7';
const WHITE = '#FFFFFF';
const BORDER = '#E1E5E1';

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransferReviewScreen({
  recipient,
  amount,
  narration,
  onContinue,
  onBack,
}: TransferReviewScreenProps) {
  const fee = 0;
  const totalDebit = amount + fee;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Review Transfer
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>
            You are sending
          </Text>

          <Text style={styles.amount}>
            {formatNaira(amount)}
          </Text>
        </View>

        {/* Recipient */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Recipient Details
          </Text>

          <View style={styles.recipientRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {recipient.name?.charAt(0)?.toUpperCase() || 'Z'}
              </Text>
            </View>

            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>
                {recipient.name}
              </Text>

              <Text style={styles.recipientPhone}>
                {recipient.phone}
              </Text>

              <Text style={styles.verifiedText}>
                Account verified
              </Text>
            </View>
          </View>
        </View>

        {/* Transfer Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Transfer Details
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Transfer amount
            </Text>

            <Text style={styles.detailValue}>
              {formatNaira(amount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Transfer fee
            </Text>

            <Text style={styles.detailValue}>
              {formatNaira(fee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>
              Total debit
            </Text>

            <Text style={styles.totalValue}>
              {formatNaira(totalDebit)}
            </Text>
          </View>

          {!!narration?.trim() && (
            <View style={styles.narrationContainer}>
              <Text style={styles.detailLabel}>
                Narration
              </Text>

              <Text style={styles.narrationText}>
                {narration}
              </Text>
            </View>
          )}
        </View>

        {/* Continue */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
        </TouchableOpacity>

        <Text style={styles.securityText}>
          Your transaction is protected.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backText: {
    color: GREEN,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },

  headerTitle: {
    color: BLACK,
    fontSize: 21,
    fontWeight: '800',
  },

  amountCard: {
    backgroundColor: GREEN,
    borderRadius: 18,
    paddingVertical: 19,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },

  amountLabel: {
    color: WHITE,
    fontSize: 14,
    marginBottom: 7,
  },

  amount: {
    color: WHITE,
    fontSize: 29,
    fontWeight: '900',
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  sectionTitle: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: BLACK,
    fontSize: 18,
    fontWeight: '800',
  },

  recipientInfo: {
    flex: 1,
  },

  recipientName: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },

  recipientPhone: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 3,
  },

  verifiedText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  detailLabel: {
    color: MUTED,
    fontSize: 13,
  },

  detailValue: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginTop: 2,
    marginBottom: 12,
  },

  totalLabel: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '800',
  },

  totalValue: {
    color: GREEN,
    fontSize: 17,
    fontWeight: '900',
  },

  narrationContainer: {
    marginTop: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  narrationText: {
    color: BLACK,
    fontSize: 14,
    marginTop: 5,
  },

  continueButton: {
    backgroundColor: GREEN,
    borderRadius: 15,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  continueButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
  },

  securityText: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
