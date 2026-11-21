
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

export type TransferReviewScreenProps = {
  recipient: {
    name: string;
    phone: string;
  };
  amount: number;
  narration: string;
  onConfirm: (pin: string) => Promise<void>;
  onBack: () => void;
};

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransferReviewScreen({
  recipient,
  amount,
  narration,
  onConfirm,
  onBack,
}: TransferReviewScreenProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const fee = 0;
  const totalDebit = amount + fee;

  const handleConfirm = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter your 4-digit transaction PIN.');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(pin);
    } catch (error) {
      Alert.alert(
        'Transfer',
        'Unable to complete this transfer. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Review Transfer</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>You are sending</Text>
          <Text style={styles.amount}>{formatNaira(amount)}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>ZENIMONIES Transfer</Text>
          </View>
        </View>

        {/* Recipient */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipient Details</Text>

          <View style={styles.recipientRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {recipient.name?.charAt(0)?.toUpperCase() || 'Z'}
              </Text>
            </View>

            <View style={styles.recipientInfo}>
              <Text style={styles.recipientName}>{recipient.name}</Text>
              <Text style={styles.recipientPhone}>{recipient.phone}</Text>
              <Text style={styles.institution}>ZENIMONIES</Text>
            </View>
          </View>
        </View>

        {/* Transfer Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transfer Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transfer amount</Text>
            <Text style={styles.detailValue}>{formatNaira(amount)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transfer fee</Text>
            <Text style={styles.detailValue}>{formatNaira(fee)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>Total debit</Text>
            <Text style={styles.totalValue}>{formatNaira(totalDebit)}</Text>
          </View>

          {narration?.trim() ? (
            <View style={styles.narrationContainer}>
              <Text style={styles.detailLabel}>Narration</Text>
              <Text style={styles.narrationText}>{narration}</Text>
            </View>
          ) : null}
        </View>

        {/* PIN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Authorize Transfer</Text>
          <Text style={styles.pinDescription}>
            Enter your 4-digit transaction PIN to confirm this transfer.
          </Text>

          <TextInput
            value={pin}
            onChangeText={(value) =>
              setPin(value.replace(/\D/g, '').slice(0, 4))
            }
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
            placeholderTextColor="#A5ACA0"
            style={styles.pinInput}
            editable={!loading}
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.disabledButton]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Processing...' : 'Confirm Transfer'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.securityText}>
          Your transaction is protected by ZENIMONIES security.
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  backText: {
    color: BLACK,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },
  headerTitle: {
    color: BLACK,
    fontSize: 21,
    fontWeight: '700',
  },
  amountCard: {
    backgroundColor: GREEN,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  amountLabel: {
    color: '#F2FFE1',
    fontSize: 14,
    marginBottom: 10,
  },
  amount: {
    color: WHITE,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 14,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF3D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  avatarText: {
    color: DARK_GREEN,
    fontSize: 18,
    fontWeight: '800',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  recipientPhone: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 4,
  },
  institution: {
    color: DARK_GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 13,
  },
  detailValue: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
    marginBottom: 14,
  },
  totalLabel: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    color: DARK_GREEN,
    fontSize: 17,
    fontWeight: '800',
  },
  narrationContainer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  narrationText: {
    color: BLACK,
    fontSize: 14,
    marginTop: 7,
  },
  pinDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 15,
  },
  pinInput: {
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 12,
    color: BLACK,
  },
  confirmButton: {
    backgroundColor: GREEN,
    borderRadius: 15,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  securityText: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
});
