
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
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
  onConfirm,
  onBack,
}: TransferReviewScreenProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  const fee = 0;
  const totalDebit = amount + fee;

  const focusPinInput = () => {
    pinInputRef.current?.focus();
  };

  const handlePinChange = (value: string) => {
    setPin(value.replace(/\D/g, '').slice(0, 4));
  };

  const handleConfirm = async () => {
    if (pin.length !== 4 || loading) return;

    try {
      setLoading(true);
      await onConfirm(pin);
    } catch (error: any) {
      Alert.alert(
        'Transfer Failed',
        error?.message ||
          'Unable to complete this transfer. Please check your connection and try again.'
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
            activeOpacity={0.7}
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
          <Text style={styles.sectionTitle}>Transfer Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transfer amount</Text>
            <Text style={styles.detailValue}>
              {formatNaira(amount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transfer fee</Text>
            <Text style={styles.detailValue}>
              {formatNaira(fee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>Total debit</Text>
            <Text style={styles.totalValue}>
              {formatNaira(totalDebit)}
            </Text>
          </View>

          {!!narration?.trim() && (
            <View style={styles.narrationContainer}>
              <Text style={styles.detailLabel}>Narration</Text>
              <Text style={styles.narrationText}>{narration}</Text>
            </View>
          )}
        </View>

        {/* Transaction PIN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Authorize Transfer</Text>

          <Text style={styles.pinDescription}>
            Enter your 4-digit transaction PIN.
          </Text>

          {/* Hidden input: prevents the browser focus rectangle */}
          <TextInput
            ref={pinInputRef}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            editable={!loading}
            autoComplete="off"
            textContentType="none"
            style={styles.hiddenPinInput}
          />

          {/* ONLY the four PIN boxes; no outer box */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={focusPinInput}
            disabled={loading}
            style={styles.pinBoxesRow}
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pin.length;
              const isActive = index === pin.length && pin.length < 4;

              return (
                <View
                  key={index}
                  style={[
                    styles.pinBox,
                    isActive && styles.pinBoxActive,
                  ]}
                >
                  <Text style={styles.pinDot}>
                    {isFilled ? '●' : ''}
                  </Text>
                </View>
              );
            })}
          </TouchableOpacity>
        </View>

        {/* Confirm appears only after all 4 PIN digits */}
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
            {loading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color={WHITE} size="small" />
                <Text style={styles.confirmButtonText}>
                  Processing Transfer...
                </Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm Transfer
              </Text>
            )}
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
    paddingTop: 12,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    color: BLACK,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },

  headerTitle: {
    color: BLACK,
    fontSize: 21,
    fontWeight: '800',
  },

  /* Existing ZENIMONIES green */
  amountCard: {
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
  },

  amountLabel: {
    color: WHITE,
    fontSize: 14,
    marginBottom: 8,
  },

  amount: {
    color: WHITE,
    fontSize: 30,
    fontWeight: '900',
  },

  /* White cards only */
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  sectionTitle: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 13,
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
    marginBottom: 13,
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
    marginBottom: 13,
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
    marginTop: 9,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  narrationText: {
    color: BLACK,
    fontSize: 14,
    marginTop: 6,
  },

  pinDescription: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 16,
  },

  /* Invisible input is moved off-screen.
     It cannot create the blue rectangular outline. */
  hiddenPinInput: {
    position: 'absolute',
    left: -1000,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },

  /* Four individual boxes ONLY */
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 0,
    marginTop: 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
  },

  pinBox: {
    width: 58,
    height: 60,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinBoxActive: {
    borderColor: GREEN,
    borderWidth: 2,
  },

  pinDot: {
    color: BLACK,
    fontSize: 16,
    fontWeight: '800',
  },

  /* Confirm uses the actual brand green */
  confirmButton: {
    backgroundColor: GREEN,
    borderRadius: 15,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  loadingButton: {
    opacity: 0.85,
  },

  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  confirmButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
  },

  securityText: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
  },
});
