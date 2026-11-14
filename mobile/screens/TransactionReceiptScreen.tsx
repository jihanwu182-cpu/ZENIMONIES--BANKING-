
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

import { useTheme } from '../theme/ThemeContext';

// ======================================================
// ZENIMONIES BANKING — COMPACT PREMIUM RECEIPT
// Bank-issued Session ID only.
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
  bankSessionId?: string;
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
  onBack,
}: Props) {
  const { colors, mode } = useTheme();

  const styles = createStyles(colors, mode === 'dark');

  const isCredit = transaction.type === 'credit';

  const status = (transaction.status || 'Unknown').toLowerCase();

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

  const statusLabel = isSuccessful
    ? 'Successful'
    : isPending
      ? 'Pending'
      : isFailed
        ? 'Failed'
        : transaction.status || 'Unknown';

  const statusColor = isSuccessful
    ? colors.success
    : isPending
      ? colors.warning
      : isFailed
        ? colors.error
        : colors.textSecondary;

  const currency = transaction.currency || 'NGN';

  const reference = transaction.reference;

  // Only accept a numeric Session ID supplied by the bank.
  // Never use the internal transaction UUID as a substitute.
  const bankSessionId =
    transaction.bankSessionId &&
    /^\d+$/.test(transaction.bankSessionId.trim())
      ? transaction.bankSessionId.trim()
      : undefined;

  const amountLabel = isCredit
    ? 'Amount received'
    : 'Amount sent';

  const directionLabel = isCredit
    ? 'Money received'
    : 'Money sent';

  const receiptRows: {
    label: string;
    value?: string;
  }[] = [
    {
      label: isCredit ? 'Sender' : 'Recipient',
      value: isCredit
        ? transaction.senderName
        : transaction.recipientName,
    },
    {
      label: 'Date and time',
      value: transaction.date,
    },
    {
      label: 'Reference',
      value: reference,
    },
    {
      label: 'Session ID',
      value: bankSessionId,
    },
    {
      label: 'Description',
      value: transaction.description,
    },
  ];

  // Additional details are shown only when relevant
  // to the outgoing transaction.
  if (!isCredit) {
    receiptRows.push(
      {
        label: 'Recipient bank',
        value: transaction.recipientBank,
      },
      {
        label: 'Transaction fee',
        value: transaction.fee,
      },
      {
        label: 'Total debit',
        value: transaction.totalDebit,
      }
    );
  }

  // Utility payment details.
  if (
    transaction.provider ||
    transaction.phone ||
    transaction.customerNumber ||
    transaction.electricityToken
  ) {
    receiptRows.push(
      {
        label: 'Provider',
        value: transaction.provider,
      },
      {
        label: 'Phone number',
        value: transaction.phone,
      },
      {
        label: 'Customer number',
        value: transaction.customerNumber,
      },
      {
        label: 'Electricity token',
        value: transaction.electricityToken,
      }
    );
  }

  const visibleRows = receiptRows.filter(
    (row) => Boolean(row.value)
  );

  const receiptMessage = [
    'ZENIMONIES BANKING',
    'TRANSACTION RECEIPT',
    '',
    statusLabel.toUpperCase(),
    `${isCredit ? '+' : '-'}${transaction.amount} ${currency}`,
    '',
    `Type: ${transaction.title || directionLabel}`,
    ...visibleRows.map(
      (row) => `${row.label}: ${row.value}`
    ),
    '',
    'Thank you for banking with ZENIMONIES.',
    'Banking made simple.',
  ].join('\n');

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

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={
          mode === 'dark' ? 'light-content' : 'dark-content'
        }
      />

      {/* Header */}
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
        {/* Compact ZENIMONIES branding */}
        <View style={styles.brandArea}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <View>
            <Text style={styles.brandName}>
              ZENIMONIES
            </Text>

            <Text style={styles.brandSubtitle}>
              BANKING
            </Text>
          </View>
        </View>

        {/* Main receipt */}
        <View style={styles.receiptCard}>
          {/* Status */}
          <View style={styles.statusRow}>
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
              {statusLabel.toUpperCase()}
            </Text>
          </View>

          {/* Amount */}
          <Text style={styles.amountLabel}>
            {amountLabel}
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

          <Text style={styles.currency}>
            {currency}
          </Text>

          <View style={styles.divider} />

          {/* Essential transaction information */}
          <View style={styles.detailsHeader}>
            <Text style={styles.sectionTitle}>
              TRANSACTION DETAILS
            </Text>

            <Text style={styles.transactionType}>
              {transaction.title.toUpperCase()}
            </Text>
          </View>

          {visibleRows.map((item, index) => (
            <View
              key={`${item.label}-${index}`}
              style={styles.detailRow}
            >
              <Text style={styles.detailLabel}>
                {item.label}
              </Text>

              <Text
                selectable
                style={[
                  styles.detailValue,
                  item.label === 'Session ID' &&
                    styles.sessionValue,
                ]}
              >
                {item.value}
              </Text>
            </View>
          ))}

          {!bankSessionId && (
            <View style={styles.sessionNotice}>
              <Text style={styles.sessionNoticeText}>
                Bank Session ID not yet available
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Thank you for banking with ZENIMONIES.
            </Text>
          </View>
        </View>

        {/* Share */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareReceipt}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Share transaction receipt"
        >
          <Text style={styles.shareIcon}>↗</Text>

          <Text style={styles.shareButtonText}>
            Share Receipt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToTransactions}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backToTransactionsText}>
            ‹  Back to Transactions
          </Text>
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          Never share your PIN, password or OTP.
        </Text>
      </ScrollView>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof import('../theme/colors').getColors>,
  isDark: boolean
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSoft,
    },

    header: {
      minHeight: 58,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    backArrow: {
      fontSize: 30,
      lineHeight: 34,
      color: colors.text,
      marginTop: -3,
    },

    headerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },

    headerSpacer: {
      width: 38,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 15,
      paddingBottom: 24,
    },

    brandArea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 15,
      gap: 9,
    },

    logo: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    logoText: {
      fontSize: 25,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    brandName: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 2,
      color: colors.primary,
    },

    brandSubtitle: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 3,
      color: colors.textSecondary,
      marginTop: 2,
    },

    receiptCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 17,
      paddingTop: 17,
      paddingBottom: 12,
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 7,
    },

    statusText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },

    amountLabel: {
      textAlign: 'center',
      fontSize: 11,
      color: colors.textSecondary,
    },

    amount: {
      textAlign: 'center',
      fontSize: 29,
      fontWeight: '900',
      marginTop: 4,
    },

    currency: {
      textAlign: 'center',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 2,
      color: colors.textMuted,
      marginTop: 2,
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 15,
    },

    detailsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },

    sectionTitle: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: colors.primary,
    },

    transactionType: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textSecondary,
      maxWidth: '48%',
      textAlign: 'right',
    },

    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },

    detailLabel: {
      flex: 0.85,
      fontSize: 11,
      color: colors.textSecondary,
    },

    detailValue: {
      flex: 1.15,
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
    },

    sessionValue: {
      letterSpacing: 0.3,
      color: colors.primary,
    },

    sessionNotice: {
      paddingTop: 9,
      alignItems: 'center',
    },

    sessionNoticeText: {
      fontSize: 9,
      color: colors.textMuted,
      fontStyle: 'italic',
    },

    footer: {
      paddingTop: 13,
      alignItems: 'center',
    },

    footerText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },

    shareButton: {
      minHeight: 49,
      borderRadius: 13,
      backgroundColor: colors.primary,
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    shareIcon: {
      fontSize: 20,
      fontWeight: '900',
      color: '#FFFFFF',
      marginRight: 9,
    },

    shareButtonText: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
    },

    backToTransactions: {
      alignItems: 'center',
      paddingVertical: 13,
    },

    backToTransactionsText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },

    securityNote: {
      fontSize: 9,
      color: colors.textMuted,
      textAlign: 'center',
      paddingBottom: 5,
    },
  });
}
