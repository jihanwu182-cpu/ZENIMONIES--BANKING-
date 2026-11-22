
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  narration: string;
  onBack: () => void;
  onContinue: () => void;
}

const GREEN = '#07803F';
const DARK = '#172018';
const MUTED = '#858B83';

export default function ExternalBankTransferReviewScreen({
  bankName,
  accountNumber,
  accountName,
  amount,
  narration,
  onBack,
  onContinue,
}: Props) {
  const formattedAmount = amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>
          Review transfer
        </Text>

        <Text style={styles.subtitle}>
          Please confirm the recipient and transfer details.
        </Text>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>
            Transfer amount
          </Text>

          <Text style={styles.amount}>
            ₦{formattedAmount}
          </Text>

          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeText}>
              ✓ Recipient account verified
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Recipient details
          </Text>

          <Detail
            label="Account name"
            value={accountName}
          />

          <Detail
            label="Account number"
            value={accountNumber}
          />

          <Detail
            label="Bank"
            value={bankName}
          />

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>
            Transfer details
          </Text>

          <Detail
            label="Amount"
            value={`₦${formattedAmount}`}
          />

          <Detail
            label="Narration"
            value={narration.trim() || 'Bank transfer'}
          />
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            Security reminder
          </Text>

          <Text style={styles.noticeText}>
            Confirm that the account name and account number
            belong to the person you intend to send money to.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          ZENIMONIES • Secure banking
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8F3',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 18,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: GREEN,
  },
  heading: {
    fontSize: 27,
    fontWeight: '900',
    color: DARK,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 8,
    lineHeight: 21,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginTop: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EDE7',
  },
  amountLabel: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },
  amount: {
    fontSize: 32,
    fontWeight: '900',
    color: GREEN,
    marginTop: 8,
  },
  secureBadge: {
    backgroundColor: '#E9F5EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  secureBadgeText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E7EDE7',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: DARK,
    marginBottom: 18,
  },
  detailRow: {
    marginBottom: 17,
  },
  detailLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK,
  },
  separator: {
    height: 1,
    backgroundColor: '#EDF0EB',
    marginVertical: 5,
  },
  notice: {
    backgroundColor: '#EAF4ED',
    borderRadius: 14,
    padding: 15,
    marginTop: 18,
  },
  noticeTitle: {
    color: GREEN,
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 6,
  },
  noticeText: {
    color: '#516157',
    fontSize: 12,
    lineHeight: 19,
  },
  continueButton: {
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  footer: {
    textAlign: 'center',
    color: '#9AA49D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 20,
  },
});
