
import React, { useState } from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import colors from '../theme/colors';
import TransactionReceiptScreen from './TransactionReceiptScreen';

// ======================================================
// ZENIMONIES BANKING — TRANSACTION DETAILS
// File: mobile/screens/TransactionDetailsScreen.tsx
// ======================================================

type Transaction = {
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
  transaction: Transaction;
  onBack: () => void;
};

export default function TransactionDetailsScreen({
  transaction,
  onBack,
}: Props) {
  const [showReceipt, setShowReceipt] =
    useState(false);

  const isCredit = transaction.type === 'credit';

  const status = (
    transaction.status || 'Unknown'
  ).toLowerCase();

  const statusColor =
    status.includes('success') ||
    status.includes('completed')
      ? colors.success
      : status.includes('pending') ||
          status.includes('processing')
        ? colors.warning
        : status.includes('failed') ||
            status.includes('reversed')
          ? colors.error
          : colors.textSecondary;

  const DetailRow = ({
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

  // ====================================================
  // OPEN TRANSACTION RECEIPT
  // ====================================================

  if (showReceipt) {
    return (
      <TransactionReceiptScreen
        transaction={transaction}
        onBack={() => setShowReceipt(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
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
          Transaction Details
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.amountCard}>
          <View
            style={[
              styles.directionIcon,
              isCredit
                ? styles.creditBackground
                : styles.debitBackground,
            ]}
          >
            <Text
              style={[
                styles.directionIconText,
                {
                  color: isCredit
                    ? colors.success
                    : colors.error,
                },
              ]}
            >
              {isCredit ? '↓' : '↑'}
            </Text>
          </View>

          <Text style={styles.transactionTitle}>
            {transaction.title}
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

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}18` },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                { color: statusColor },
              ]}
            >
              {transaction.status || 'Unknown'}
            </Text>
          </View>

          <Text style={styles.dateText}>
            {transaction.date}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Transaction information
          </Text>

          <DetailRow
            label="Transaction ID"
            value={transaction.id}
          />

          <DetailRow
            label="Reference number"
            value={transaction.reference}
          />

          <DetailRow
            label="Transaction type"
            value={transaction.transactionType}
          />

          <DetailRow
            label="Description"
            value={transaction.description}
          />

          <DetailRow
            label="Currency"
            value={transaction.currency || 'NGN'}
          />

          <DetailRow
            label="Transaction fee"
            value={transaction.fee}
          />

          <DetailRow
            label="Total debit"
            value={transaction.totalDebit}
          />
        </View>

        {(transaction.senderName ||
          transaction.recipientName ||
          transaction.recipientAccount ||
          transaction.recipientBank) && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>
              Transfer information
            </Text>

            <DetailRow
              label="Sender"
              value={transaction.senderName}
            />

            <DetailRow
              label="Sender account"
              value={transaction.senderAccount}
            />

            <DetailRow
              label="Recipient"
              value={transaction.recipientName}
            />

            <DetailRow
              label="Recipient account"
              value={transaction.recipientAccount}
            />

            <DetailRow
              label="Recipient bank"
              value={transaction.recipientBank}
            />
          </View>
        )}

        {(transaction.provider ||
          transaction.phone ||
          transaction.customerNumber ||
          transaction.electricityToken) && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>
              Payment information
            </Text>

            <DetailRow
              label="Service provider"
              value={transaction.provider}
            />

            <DetailRow
              label="Phone number"
              value={transaction.phone}
            />

            <DetailRow
              label="Customer number"
              value={transaction.customerNumber}
            />

            <DetailRow
              label="Electricity token"
              value={transaction.electricityToken}
            />
          </View>
        )}

        <View style={styles.receiptNote}>
          <Text style={styles.receiptNoteTitle}>
            ZENIMONIES transaction record
          </Text>

          <Text style={styles.receiptNoteText}>
            Keep this transaction information for your
            personal records. Transaction details are
            displayed from the information available
            on your ZENIMONIES account.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => setShowReceipt(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.receiptButtonIcon}>
            ▤
          </Text>

          <Text style={styles.receiptButtonText}>
            View Transaction Receipt
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          ZENIMONIES BANKING
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 17,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backArrow: {
    fontSize: 35,
    lineHeight: 39,
    color: colors.text,
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 17,
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

  amountCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },

  directionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  creditBackground: {
    backgroundColor: '#E8F5ED',
  },

  debitBackground: {
    backgroundColor: '#FCECEC',
  },

  directionIconText: {
    fontSize: 31,
    fontWeight: '800',
  },

  transactionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  amount: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 12,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 15,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  dateText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 12,
  },

  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 15,
  },

  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 5,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },

  receiptNote: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 17,
    marginTop: 2,
  },

  receiptNoteTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primaryDark,
    marginBottom: 7,
  },

  receiptNoteText: {
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  receiptButton: {
    minHeight: 55,
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiptButtonIcon: {
    fontSize: 22,
    color: colors.white,
    marginRight: 10,
  },

  receiptButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.white,
  },

  footer: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: 25,
  },
});
