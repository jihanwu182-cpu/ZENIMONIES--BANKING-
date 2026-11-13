
import React from 'react';

import {
  Alert,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import colors from '../theme/colors';

// ======================================================
// ZENIMONIES BANKING — TRANSACTION RECEIPT
// File: mobile/screens/TransactionReceiptScreen.tsx
// ======================================================

export type ReceiptTransaction = {
  id: string;
  title: string;
  description?: string;
  amount: string;
  type: 'credit' | 'debit';
  date: string;
  status?: string;
  reference?: string;
  currency?: string;
  transactionType?: string;
  fee?: string;
  totalDebit?: string;
  recipientName?: string;
  recipientAccount?: string;
  recipientBank?: string;
  senderName?: string;
  senderAccount?: string;
  provider?: string;
  phone?: string;
  customerNumber?: string;
  electricityToken?: string;
};

type Props = {
  transaction: ReceiptTransaction;
  customerName?: string;
  accountNumber?: string;
  onBack: () => void;
};

export default function TransactionReceiptScreen({
  transaction,
  customerName,
  accountNumber,
  onBack,
}: Props) {
  const isCredit = transaction.type === 'credit';

  const status = (
    transaction.status || 'Unknown'
  ).toLowerCase();

  const isSuccessful =
    status.includes('success') ||
    status.includes('completed');

  const isPending =
    status.includes('pending') ||
    status.includes('processing') ||
    status.includes('under_review');

  const isFailed =
    status.includes('failed') ||
    status.includes('reversed') ||
    status.includes('declined');

  const statusColor = isSuccessful
    ? colors.success
    : isPending
      ? colors.warning
      : isFailed
        ? colors.error
        : colors.textSecondary;

  const statusLabel = isSuccessful
    ? 'Successful'
    : isPending
      ? 'Pending'
      : isFailed
        ? 'Failed'
        : transaction.status || 'Unknown';

  const currency = transaction.currency || 'NGN';

  const formatMoney = (value?: string) => {
    if (!value) return undefined;

    return value;
  };

  const receiptReference =
    transaction.reference || transaction.id;

  const receiptMessage = [
    'ZENIMONIES BANKING',
    'TRANSACTION RECEIPT',
    '--------------------------------',
    `Transaction: ${transaction.title}`,
    `Status: ${statusLabel}`,
    `Amount: ${transaction.amount}`,
    `Direction: ${isCredit ? 'Money received' : 'Money sent'}`,
    `Date: ${transaction.date}`,
    `Reference: ${receiptReference}`,
    `Transaction ID: ${transaction.id}`,
    `Currency: ${currency}`,
    transaction.fee
      ? `Transaction fee: ${transaction.fee}`
      : undefined,
    transaction.totalDebit
      ? `Total debit: ${transaction.totalDebit}`
      : undefined,
    customerName
      ? `Account holder: ${customerName}`
      : undefined,
    accountNumber
      ? `Account number: ${accountNumber}`
      : undefined,
    transaction.senderName
      ? `Sender: ${transaction.senderName}`
      : undefined,
    transaction.senderAccount
      ? `Sender account: ${transaction.senderAccount}`
      : undefined,
    transaction.recipientName
      ? `Recipient: ${transaction.recipientName}`
      : undefined,
    transaction.recipientAccount
      ? `Recipient account: ${transaction.recipientAccount}`
      : undefined,
    transaction.recipientBank
      ? `Recipient bank: ${transaction.recipientBank}`
      : undefined,
    transaction.provider
      ? `Provider: ${transaction.provider}`
      : undefined,
    transaction.phone
      ? `Phone: ${transaction.phone}`
      : undefined,
    transaction.customerNumber
      ? `Customer number: ${transaction.customerNumber}`
      : undefined,
    transaction.electricityToken
      ? `Electricity token: ${transaction.electricityToken}`
      : undefined,
    '--------------------------------',
    'Thank you for banking with ZENIMONIES.',
    'Banking made simple.',
  ]
    .filter(Boolean)
    .join('\n');

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        title: 'ZENIMONIES Transaction Receipt',
        message: receiptMessage,
      });
    } catch {
      Alert.alert(
        'Unable to share',
        'Your receipt could not be shared. Please try again.'
      );
    }
  };

  const ReceiptRow = ({
    label,
    value,
  }: {
    label: string;
    value?: string;
  }) => {
    if (!value) return null;

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
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Transaction Receipt
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.brandName}>
            ZENIMONIES
          </Text>

          <Text style={styles.brandSubtitle}>
            BANKING
          </Text>
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.statusArea}>
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: `${statusColor}18` },
              ]}
            >
              <Text
                style={[
                  styles.statusIconText,
                  { color: statusColor },
                ]}
              >
                {isSuccessful
                  ? '✓'
                  : isPending
                    ? '…'
                    : isFailed
                      ? '!'
                      : '•'}
              </Text>
            </View>

            <Text style={styles.statusHeading}>
              {statusLabel}
            </Text>

            <Text style={styles.statusDescription}>
              {isSuccessful
                ? 'Your transaction was completed.'
                : isPending
                  ? 'Your transaction is being processed.'
                  : isFailed
                    ? 'This transaction was not completed successfully.'
                    : 'Transaction status information.'}
            </Text>
          </View>

          <View style={styles.amountArea}>
            <Text style={styles.amountLabel}>
              {isCredit ? 'Amount received' : 'Amount paid'}
            </Text>

            <Text
              style={[
                styles.amount,
                {
                  color: isCredit
                    ? colors.success
                    : colors.text,
                },
              ]}
            >
              {isCredit ? '+' : '-'}
              {transaction.amount}
            </Text>

            <Text style={styles.currencyLabel}>
              {currency}
            </Text>
          </View>

          <View style={styles.dashedDivider}>
            <View style={styles.leftNotch} />
            <View style={styles.rightNotch} />
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>
              Transaction information
            </Text>

            <ReceiptRow
              label="Transaction type"
              value={transaction.title}
            />

            <ReceiptRow
              label="Reference number"
              value={receiptReference}
            />

            <ReceiptRow
              label="Transaction ID"
              value={transaction.id}
            />

            <ReceiptRow
              label="Date and time"
              value={transaction.date}
            />

            <ReceiptRow
              label="Description"
              value={transaction.description}
            />

            <ReceiptRow
              label="Transaction fee"
              value={formatMoney(transaction.fee)}
            />

            <ReceiptRow
              label="Total debit"
              value={formatMoney(transaction.totalDebit)}
            />
          </View>

          {(customerName ||
            accountNumber ||
            transaction.senderName ||
            transaction.recipientName ||
            transaction.recipientAccount ||
            transaction.recipientBank) && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>
                Account and transfer details
              </Text>

              <ReceiptRow
                label="Account holder"
                value={customerName}
              />

              <ReceiptRow
                label="Account number"
                value={accountNumber}
              />

              <ReceiptRow
                label="Sender"
                value={transaction.senderName}
              />

              <ReceiptRow
                label="Sender account"
                value={transaction.senderAccount}
              />

              <ReceiptRow
                label="Recipient"
                value={transaction.recipientName}
              />

              <ReceiptRow
                label="Recipient account"
                value={transaction.recipientAccount}
              />

              <ReceiptRow
                label="Recipient bank"
                value={transaction.recipientBank}
              />
            </View>
          )}

          {(transaction.provider ||
            transaction.phone ||
            transaction.customerNumber ||
            transaction.electricityToken) && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>
                Payment details
              </Text>

              <ReceiptRow
                label="Service provider"
                value={transaction.provider}
              />

              <ReceiptRow
                label="Phone number"
                value={transaction.phone}
              />

              <ReceiptRow
                label="Customer number"
                value={transaction.customerNumber}
              />

              <ReceiptRow
                label="Electricity token"
                value={transaction.electricityToken}
              />
            </View>
          )}

          <View style={styles.receiptFooter}>
            <Text style={styles.footerBrand}>
              ZENIMONIES BANKING
            </Text>

            <Text style={styles.footerText}>
              Banking made simple.
            </Text>

            <Text style={styles.footerDisclaimer}>
              This receipt reflects the transaction information
              available on your ZENIMONIES account.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareReceipt}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.shareIcon}>↗</Text>

          <Text style={styles.shareButtonText}>
            Share / Save Receipt
          </Text>
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          Keep your transaction reference safe.
          Never share your PIN, password or OTP.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },

  header: {
    minHeight: 66,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },

  backArrow: {
    fontSize: 34,
    lineHeight: 38,
    color: colors.text,
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    padding: 18,
    paddingBottom: 35,
  },

  brandArea: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.white,
  },

  brandName: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primaryDark,
    marginTop: 9,
  },

  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.textSecondary,
    marginTop: 3,
  },

  receiptCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  statusArea: {
    alignItems: 'center',
    paddingTop: 25,
    paddingHorizontal: 18,
  },

  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusIconText: {
    fontSize: 27,
    fontWeight: '900',
  },

  statusHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 12,
  },

  statusDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },

  amountArea: {
    alignItems: 'center',
    paddingVertical: 25,
  },

  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  amount: {
    fontSize: 31,
    fontWeight: '900',
    marginTop: 9,
  },

  currencyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: 5,
    letterSpacing: 2,
  },

  dashedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginHorizontal: 18,
    position: 'relative',
  },

  leftNotch: {
    position: 'absolute',
    left: -29,
    top: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.backgroundSoft,
  },

  rightNotch: {
    position: 'absolute',
    right: -29,
    top: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.backgroundSoft,
  },

  detailsSection: {
    paddingHorizontal: 19,
    paddingTop: 21,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },

  detailRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  detailLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 5,
  },

  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },

  receiptFooter: {
    alignItems: 'center',
    padding: 20,
    marginTop: 8,
    backgroundColor: colors.backgroundSoft,
  },

  footerBrand: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.primaryDark,
  },

  footerText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 5,
  },

  footerDisclaimer: {
    fontSize: 9,
    lineHeight: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },

  shareButton: {
    minHeight: 55,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shareIcon: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    marginRight: 10,
  },

  shareButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.white,
  },

  securityNote: {
    fontSize: 10,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 15,
  },
});
