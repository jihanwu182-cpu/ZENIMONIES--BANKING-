
import React, { useRef, useState } from 'react';
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

const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F7F7F7';
const WHITE = '#FFFFFF';
const BORDER = '#E2E5E1';
const ACCENT = '#333333';

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

  const pinInputRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

  const fee = 0;
  const totalDebit = amount + fee;

  const handleConfirm = async () => {
    if (pin.length !== 4 || loading) return;

    try {
      setLoading(true);
      await onConfirm(pin);
    } catch (error) {
      Alert.alert(
        'Transfer status',
        'We could not confirm the result of this transfer. Please check your transaction history before trying again.'
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
        <View style={styles.amountSection}>
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
              <Text style={styles.verifiedText}>Account verified</Text>
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
            Enter your 4-digit transaction PIN.
          </Text>

          <TouchableOpacity
            activeOpacity={1}
            style={styles.pinContainer}
            onPress={() => pinInputRef.current?.focus()}
            disabled={loading}
          >
            <View style={styles.pinBoxes}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinBox,
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
              ref={pinInputRef}
              value={pin}
              onChangeText={(value) =>
                setPin(value.replace(/\D/g, '').slice(0, 4))
              }
              keyboardType="number-pad"
              secureTextEntry={false}
              maxLength={4}
              autoFocus={false}
              caretHidden
              editable={!loading}
              style={styles.pinInputOverlay}
              selectionColor="transparent"
              underlineColorAndroid="transparent"
              accessibilityLabel="Transaction PIN"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm - appears after 4 digits */}
        {pin.length === 4 && (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              loading && styles.loadingButton,
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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    color: BLACK,
    fontSize: 29,
    lineHeight: 32,
    marginTop: -3,
  },
  headerTitle: {
    color: BLACK,
    fontSize: 20,
    fontWeight: '700',
  },
  amountSection: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  amountLabel: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 4,
  },
  amount: {
    color: BLACK,
    fontSize: 26,
    fontWeight: '800',
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: BLACK,
    fontSize: 17,
    fontWeight: '800',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  recipientPhone: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 3,
  },
  verifiedText: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
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
    marginTop: 2,
    marginBottom: 12,
  },
  totalLabel: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '800',
  },
  narrationContainer: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  narrationText: {
    color: BLACK,
    fontSize: 14,
    marginTop: 5,
  },
  pinDescription: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 14,
  },
  pinContainer: {
    height: 58,
    justifyContent: 'center',
    position: 'relative',
  },
  pinBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pinBox: {
    width: 52,
    height: 54,
    borderRadius: 10,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxActive: {
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  pinDot: {
    color: BLACK,
    fontSize: 27,
    fontWeight: '700',
  },
  pinInputOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    borderWidth: 0,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  confirmButton: {
    backgroundColor: BLACK,
    borderRadius: 13,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  loadingButton: {
    opacity: 0.65,
  },
  confirmButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  securityText: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
});
