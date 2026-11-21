
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GREEN = '#00843D';
const DARK_GREEN = '#006B32';
const LIGHT_GREEN = '#E8F3D9';
const BG = '#F6F8F3';
const WHITE = '#FFFFFF';
const TEXT = '#172018';
const MUTED = '#858B83';
const BORDER = '#E9EDE5';

export type InternalTransferRecipient = {
  name: string;
  phone: string;
};

export type InternalTransferScreenProps = {
  /** Connect this callback to the existing authenticated recipient-resolution API. */
  onVerifyRecipient: (phone: string) => Promise<InternalTransferRecipient>;
  /** Continue to the review/PIN flow with verified recipient and amount. */
  onContinue: (payload: {
    recipient: InternalTransferRecipient;
    amount: number;
    narration: string;
  }) => void;
  onBack?: () => void;
};

export default function InternalTransferScreen({
  onVerifyRecipient,
  onContinue,
  onBack,
}: InternalTransferScreenProps) {
  const [phone, setPhone] = useState('');
  const [recipient, setRecipient] = useState<InternalTransferRecipient | null>(null);
  const [amountText, setAmountText] = useState('');
  const [narration, setNarration] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    setPhone(digits);
    setRecipient(null);
    setError('');
  };

  const handleVerify = async () => {
    setError('');
    setRecipient(null);
    if (!/^\d{11}$/.test(phone)) {
      setError('Enter a valid 11-digit phone number.');
      return;
    }
    try {
      setVerifying(true);
      const resolved = await onVerifyRecipient(phone);
      if (!resolved?.name || !resolved?.phone) {
        throw new Error('Recipient verification returned incomplete details.');
      }
      setRecipient(resolved);
    } catch (err: any) {
      setError(err?.message || 'Unable to verify this ZENIMONIES recipient. Please check the phone number and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleAmountChange = (value: string) => {
    let clean = value.replace(/[^0-9.]/g, '');
    const dot = clean.indexOf('.');
    if (dot >= 0) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '');
    if (dot >= 0) clean = clean.slice(0, dot + 3);
    setAmountText(clean);
    setError('');
  };

  const numericAmount = Number(amountText);
  const canContinue = !!recipient && Number.isFinite(numericAmount) && numericAmount > 0 && !verifying;

  const handleContinue = () => {
    setError('');
    if (!recipient) {
      setError('Please verify the recipient first.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }
    onContinue({ recipient, amount: numericAmount, narration: narration.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={24} color={GREEN} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Send to ZENIMONIES</Text>
              <Text style={styles.subtitle}>Transfer money instantly to another ZENIMONIES account.</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Recipient Phone Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phoneInputWrap}>
                <TextInput
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="Enter 11-digit phone number"
                  placeholderTextColor="#A2AAA1"
                  keyboardType="phone-pad"
                  maxLength={11}
                  style={styles.phoneInput}
                  editable={!verifying}
                />
              </View>
              <TouchableOpacity
                style={[styles.verifyButton, (verifying || phone.length !== 11) && styles.verifyDisabled]}
                onPress={handleVerify}
                disabled={verifying || phone.length !== 11}
                accessibilityRole="button"
              >
                {verifying ? <ActivityIndicator size="small" color={WHITE} /> : <Text style={styles.verifyText}>Verify</Text>}
              </TouchableOpacity>
            </View>

            {recipient && (
              <View style={styles.verifiedCard}>
                <View style={styles.verifiedIcon}>
                  <Ionicons name="checkmark-circle" size={21} color={GREEN} />
                </View>
                <View style={styles.verifiedTextWrap}>
                  <Text style={styles.recipientName}>{recipient.name}</Text>
                  <Text style={styles.recipientPhone}>{recipient.phone}</Text>
                  <Text style={styles.verifiedLabel}>ZENIMONIES account verified</Text>
                </View>
              </View>
            )}

            {recipient && (
              <>
                <Text style={[styles.fieldLabel, styles.amountLabel]}>Amount</Text>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.currency}>₦</Text>
                  <TextInput
                    value={amountText}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    placeholderTextColor="#A2AAA1"
                    keyboardType="decimal-pad"
                    style={styles.amountInput}
                  />
                </View>

                <Text style={styles.fieldLabel}>Narration (Optional)</Text>
                <TextInput
                  value={narration}
                  onChangeText={setNarration}
                  placeholder="What's this transfer for?"
                  placeholderTextColor="#A2AAA1"
                  maxLength={80}
                  style={styles.narrationInput}
                />
              </>
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#B42318" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark" size={19} color={GREEN} />
            <Text style={styles.noticeText}>
              Confirm the recipient's name before proceeding. Transfers can only be completed after recipient verification.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, !canContinue && styles.continueDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
            accessibilityRole="button"
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  keyboard: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: LIGHT_GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 23, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 5, lineHeight: 19 },
  formCard: { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16 },
  fieldLabel: { color: TEXT, fontSize: 14, fontWeight: '700', marginBottom: 9 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phoneInputWrap: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 12, backgroundColor: WHITE },
  phoneInput: { flex: 1, color: TEXT, fontSize: 14, paddingVertical: 10 },
  verifyButton: { minWidth: 78, height: 50, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  verifyDisabled: { opacity: 0.45 },
  verifyText: { color: WHITE, fontSize: 14, fontWeight: '800' },
  verifiedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F8E8', borderRadius: 14, padding: 13, marginTop: 15, borderWidth: 1, borderColor: '#D9EBC5' },
  verifiedIcon: { marginRight: 10 },
  verifiedTextWrap: { flex: 1 },
  recipientName: { color: TEXT, fontSize: 15, fontWeight: '800' },
  recipientPhone: { color: MUTED, fontSize: 12, marginTop: 3 },
  verifiedLabel: { color: DARK_GREEN, fontSize: 11, fontWeight: '700', marginTop: 5 },
  amountLabel: { marginTop: 19 },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 13, minHeight: 54, paddingHorizontal: 14, backgroundColor: WHITE },
  currency: { fontSize: 22, fontWeight: '800', color: GREEN, marginRight: 8 },
  amountInput: { flex: 1, color: TEXT, fontSize: 22, fontWeight: '700', paddingVertical: 9 },
  narrationInput: { minHeight: 50, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, backgroundColor: WHITE },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F0', borderRadius: 12, padding: 12, marginTop: 14, gap: 8 },
  errorText: { flex: 1, color: '#B42318', fontSize: 13, lineHeight: 18 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: LIGHT_GREEN, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, marginTop: 16, gap: 10 },
  noticeText: { flex: 1, color: MUTED, fontSize: 12, lineHeight: 18 },
  footer: { backgroundColor: BG, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  continueButton: { minHeight: 54, borderRadius: 14, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: WHITE, fontSize: 15, fontWeight: '800' },
});
