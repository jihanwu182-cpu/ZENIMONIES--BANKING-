
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
    if (pin.length !== 4 || loading) return;

    try {
      setLoading(true);
      await onConfirm(pin);
    } catch (error) {
      Alert.alert(
        'Transfer',
        'Unable to confirm this transfer. Please check your transaction status before trying again.'
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
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            disabled={loading}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Review Transfer</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>You are sending</Text>
          <Text style={styles.amount}>{formatNaira(amount)}</Text>
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
              <Text style={styles.institution}>Account verified</Text>
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

        {/* Transaction PIN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Authorize Transfer</Text>

          <Text style={styles.pinDescription}>
            Enter your 4-digit transaction PIN to confirm this transfer.
          </Text>

          <View style={styles.pinBoxesContainer}>
            <View style={styles.pinBoxes}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinBox,
                    pin.length > index && styles.pinBoxFilled,
                    pin.length === index && styles.pinBoxActive,
                  ]}
                >
                  <Text style={styles.pinDot}>
                    {pin.length > index ? '•' : ''}
                  </Text>
                </View>
              ))}
            </View>

            <TextInput
              value={pin}
              onChangeText={(value) =>
                setPin(value.replace(/\D/g, '').slice(0, 4))
              }
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
              caretHidden
              style={styles.hiddenPinInput}
              editable={!loading}
              accessibilityLabel="Enter your four digit transaction PIN"
            />
          </View>
        </View>

        {/* Confirm Button - only appears after 4 PIN digits */}
        {pin.length === 4 && (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>
              {loading ? 'Processing...' : 'Confirm Transfer'}
            </Text>
          </TouchableOpacity>
        )}

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
    color: WHITE,
    fontSize: 14,
    marginBottom: 10,
  },
  amount: {
    color: WHITE,
    fontSize: 30,
    fontWeight: '800',
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
    backgroundColor: '#F0F2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
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
    marginBottom: 18,
  },
  pinBoxesContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  pinBox: {
    width: 54,
    height: 58,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFilled: {
    borderColor: GREEN,
  },
  pinBoxActive: {
    borderColor: GREEN,
    borderWidth: 2,
  },
  pinDot: {
    color: BLACK,
    fontSize: 26,
    fontWeight: '800',
  },
  hiddenPinInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
    width: '100%',
    height: 58,
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
