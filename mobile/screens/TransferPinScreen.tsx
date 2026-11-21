
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';

export type TransferPinScreenProps = {
  amount: number;
  recipientName: string;
  recipientPhone: string;
  onConfirm: (pin: string) => Promise<void>;
  onBack: () => void;
};

const GREEN = '#07803F';
const BLACK = '#172018';
const MUTED = '#858B83';
const WHITE = '#FFFFFF';
const BORDER = '#DADADA';

export default function TransferPinScreen({
  amount,
  recipientName,
  recipientPhone,
  onConfirm,
  onBack,
}: TransferPinScreenProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const formatAmount = (value: number) =>
    `₦${value.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleConfirm = async () => {
    if (pin.length !== 4 || loading) return;

    Keyboard.dismiss();

    try {
      setLoading(true);
      await onConfirm(pin);
    } catch (error: any) {
      Alert.alert(
        'Transfer Failed',
        error?.message || 'Unable to complete your transfer. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      {/* Compact PIN content */}
      <View style={styles.content}>
        <Text style={styles.title}>Transaction PIN</Text>

        <Text style={styles.subtitle}>
          Enter your 4-digit PIN to authorize this transfer.
        </Text>

        {/* Compact transfer summary */}
        <View style={styles.summary}>
          <Text style={styles.amountLabel}>TRANSFER AMOUNT</Text>
          <Text style={styles.amount}>{formatAmount(amount)}</Text>

          <View style={styles.summaryDivider} />

          <Text style={styles.recipientLabel}>Sending to</Text>
          <Text style={styles.recipientName}>{recipientName}</Text>
          <Text style={styles.recipientPhone}>{recipientPhone}</Text>
        </View>

        {/* PIN entry moved higher */}
        <Text style={styles.pinLabel}>Enter transaction PIN</Text>

        <View style={styles.pinContainer}>
          <TextInput
            value={pin}
            onChangeText={(value) =>
              setPin(value.replace(/\D/g, '').slice(0, 4)
              )
            }
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            autoFocus
            editable={!loading}
            autoComplete="off"
            textContentType="none"
            caretHidden
            style={styles.pinInput}
          />

          <View style={styles.pinBoxes}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinBox,
                  index < pin.length && styles.pinBoxFilled,
                  index === pin.length &&
                    pin.length < 4 &&
                    styles.pinBoxActive,
                ]}
              >
                <Text style={styles.pinDot}>
                  {index < pin.length ? '●' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Confirmation button appears after all digits are entered */}
        {pin.length === 4 && (
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              styles.confirmButton,
              loading && styles.loadingButton,
            ]}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={WHITE} size="small" />
                <Text style={styles.confirmText}>Processing Transfer...</Text>
              </View>
            ) : (
              <Text style={styles.confirmText}>Confirm Transfer</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.securityText}>
          Your PIN is securely used to authorize this transaction.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    paddingHorizontal: 24,
    paddingTop: 12,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: GREEN,
    fontSize: 32,
    lineHeight: 36,
    marginTop: -3,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },

  title: {
    color: BLACK,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 14,
  },

  summary: {
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },

  amountLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  amount: {
    color: GREEN,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 3,
  },

  summaryDivider: {
    width: '100%',
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 11,
  },

  recipientLabel: {
    color: MUTED,
    fontSize: 12,
  },

  recipientName: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
    textAlign: 'center',
  },

  recipientPhone: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  pinLabel: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  pinContainer: {
    width: '100%',
    alignItems: 'center',
  },

  pinInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    borderWidth: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },

  pinBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  pinBox: {
    width: 54,
    height: 56,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
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
    color: GREEN,
    fontSize: 18,
    fontWeight: '900',
  },

  confirmButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  loadingButton: {
    opacity: 0.85,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  confirmText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
  },

  securityText: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
});
