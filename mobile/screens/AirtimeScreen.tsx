
import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getColors } from '../theme/colors';

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

type Network = 'MTN' | 'Airtel' | 'Glo' | '9mobile';

type Props = {
  token: string;
  onBack: () => void;
  onComplete?: () => void;
};

const NETWORKS: {
  value: Network;
  label: string;
  icon: string;
}[] = [
  { value: 'MTN', label: 'MTN', icon: 'cellphone' },
  { value: 'Airtel', label: 'Airtel', icon: 'signal' },
  { value: 'Glo', label: 'Glo', icon: 'sim' },
  { value: '9mobile', label: 'T2 Mobile', icon: 'cellphone-wireless' },
];

const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').slice(0, 11);

const detectNetwork = (phone: string): Network | null => {
  const prefixes: Record<string, Network> = {
    '0803': 'MTN',
    '0806': 'MTN',
    '0810': 'MTN',
    '0813': 'MTN',
    '0814': 'MTN',
    '0816': 'MTN',
    '0903': 'MTN',
    '0906': 'MTN',
    '0913': 'MTN',
    '0916': 'MTN',

    '0802': 'Airtel',
    '0808': 'Airtel',
    '0812': 'Airtel',
    '0701': 'Airtel',
    '0708': 'Airtel',
    '0901': 'Airtel',
    '0902': 'Airtel',
    '0907': 'Airtel',
    '0912': 'Airtel',

    '0805': 'Glo',
    '0807': 'Glo',
    '0811': 'Glo',
    '0815': 'Glo',
    '0705': 'Glo',
    '0905': 'Glo',
    '0915': 'Glo',

    '0809': '9mobile',
    '0817': '9mobile',
    '0818': '9mobile',
    '0908': '9mobile',
    '0909': '9mobile',
  };

  if (phone.length < 4) return null;

  return prefixes[phone.substring(0, 4)] || null;
};

export default function AirtimeScreen({
  token,
  onBack,
  onComplete,
}: Props) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const styles = createStyles(colors, isDark);

  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<Network | null>(null);
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requerying, setRequerying] = useState(false);
  const [pendingReference, setPendingReference] = useState('');
  const [result, setResult] = useState<{
    status: string;
    reference: string;
    message: string;
  } | null>(null);

  const detectedNetwork = useMemo(
    () => detectNetwork(phone),
    [phone]
  );

  const selectedAmount = Number(amount || customAmount);

  const validPhone = /^0[789][01]\d{8}$/.test(phone);

  const networkLabel = (value: Network) =>
    value === '9mobile' ? 'T2 Mobile' : value;

  const handlePhoneChange = (value: string) => {
    setPhone(normalizePhone(value));
    setResult(null);
    setPendingReference('');
  };

  const handlePurchase = async () => {
    if (!token) {
      Alert.alert('Session unavailable', 'Please sign in again.');
      return;
    }

    if (!validPhone) {
      Alert.alert('Invalid phone number', 'Enter a valid 11-digit Nigerian phone number.');
      return;
    }

    if (!network) {
      Alert.alert('Select network', 'Please select the recipient network.');
      return;
    }

    if (
      !Number.isFinite(selectedAmount) ||
      selectedAmount < 50 ||
      selectedAmount > 50000 ||
      Math.round(selectedAmount * 100) !== selectedAmount * 100
    ) {
      Alert.alert(
        'Invalid amount',
        'Enter an amount between ₦50 and ₦50,000.'
      );
      return;
    }

    setPinVisible(true);
  };

  const confirmPurchase = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'Enter your transaction PIN.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/airtime`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          network,
          phone,
          amount: selectedAmount,
          transaction_pin: pin,
        }),
      });

      const data = await response.json();

      setPin('');
      setPinVisible(false);

      const transaction = data.transaction || {};
      const reference =
        transaction.reference || data.reference || '';

      if (
        response.status === 200 &&
        data.success === true &&
        transaction.status === 'completed'
      ) {
        setResult({
          status: 'completed',
          reference,
          message: data.message || 'Airtime purchase completed successfully.',
        });
        onComplete?.();
        return;
      }

      if (
        response.status === 202 ||
        transaction.status === 'pending' ||
        data.status === 'pending' ||
        data.status === 'reconciliation_required'
      ) {
        setPendingReference(reference);

        setResult({
          status: 'pending',
          reference,
          message:
            data.message ||
            'Your Airtime purchase is being processed. Please do not purchase again.',
        });
        return;
      }

      if (
        transaction.status === 'failed' ||
        transaction.status === 'refunded' ||
        data.status === 'failed'
      ) {
        setResult({
          status: 'failed',
          reference,
          message:
            data.message ||
            'The Airtime purchase failed. Check your wallet balance.',
        });
        onComplete?.();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to process Airtime purchase.'
        );
      }

      setResult({
        status: 'pending',
        reference,
        message:
          data.message ||
          'Your transaction requires confirmation. Please do not retry.',
      });

      setPendingReference(reference);
    } catch (error: any) {
      Alert.alert(
        'Purchase status unavailable',
        error?.message ||
          'We could not confirm the transaction. Check your transaction history before trying again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequery = async () => {
    if (!pendingReference || !token) return;

    setRequerying(true);

    try {
      const response = await fetch(
        `${API_BASE}/airtime/requery/${encodeURIComponent(pendingReference)}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      const status = String(
        data.status ||
        data.transaction?.status ||
        data.transaction?.provider_status ||
        ''
      ).toLowerCase();

      if (status === 'completed') {
        setResult({
          status: 'completed',
          reference: pendingReference,
          message: data.message || 'Airtime purchase completed successfully.',
        });
        setPendingReference('');
        onComplete?.();
      } else if (
        status === 'failed' ||
        status === 'refunded'
      ) {
        setResult({
          status: 'failed',
          reference: pendingReference,
          message: data.message || 'The Airtime purchase failed. Check your wallet balance.',
        });
        setPendingReference('');
        onComplete?.();
      } else {
        setResult({
          status: 'pending',
          reference: pendingReference,
          message:
            data.message ||
            'The transaction is still awaiting confirmation.',
        });
      }

      if (!response.ok && response.status !== 202) {
        Alert.alert(
          'Reconciliation',
          data.message || 'We could not retrieve the transaction status.'
        );
      }
    } catch {
      Alert.alert(
        'Connection unavailable',
        'Unable to check this transaction right now.'
      );
    } finally {
      setRequerying(false);
    }
  };

  const resetForm = () => {
    setPhone('');
    setNetwork(null);
    setAmount('');
    setCustomAmount('');
    setResult(null);
    setPendingReference('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Buy Airtime</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons
              name="cellphone"
              size={27}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>Recharge instantly</Text>
          <Text style={styles.subtitle}>
            Buy airtime for yourself or someone else.
          </Text>
        </View>

        <Text style={styles.label}>Phone number</Text>

        <View style={styles.phoneInput}>
          <Text style={styles.countryCode}>+234</Text>
          <TextInput
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            placeholder="0803 123 4567"
            placeholderTextColor={colors.textSecondary}
            maxLength={11}
            style={styles.input}
          />
          {validPhone && (
            <MaterialCommunityIcons
              name="check-circle"
              size={21}
              color={colors.success}
            />
          )}
        </View>

        {detectedNetwork && (
          <View style={styles.detectedBox}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.detectedText}>
              Likely network: {networkLabel(detectedNetwork)}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Select network</Text>

        <View style={styles.networkGrid}>
          {NETWORKS.map((item) => {
            const selected = network === item.value;
            const suggested =
              detectedNetwork === item.value;

            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setNetwork(item.value)}
                style={[
                  styles.networkItem,
                  selected && styles.networkSelected,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={25}
                  color={
                    selected
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.networkName,
                    selected && styles.networkNameSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {suggested && (
                  <Text style={styles.suggestedText}>Suggested</Text>
                )}
                {selected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={16}
                    color={colors.primary}
                    style={styles.selectedCheck}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.networkNote}>
          Network detection is based on the phone number prefix. If your
          number has been ported, select your current network manually.
        </Text>

        <Text style={styles.label}>Choose amount</Text>

        <View style={styles.amountGrid}>
          {AMOUNTS.map((value) => {
            const selected = amount === String(value);

            return (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  setAmount(String(value));
                  setCustomAmount('');
                }}
                style={[
                  styles.amountItem,
                  selected && styles.amountSelected,
                ]}
              >
                <Text
                  style={[
                    styles.amountText,
                    selected && styles.amountTextSelected,
                  ]}
                >
                  ₦{value.toLocaleString('en-NG')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Or enter another amount</Text>

        <View style={styles.customAmountInput}>
          <Text style={styles.currencyPrefix}>₦</Text>
          <TextInput
            value={customAmount}
            onChangeText={(value) => {
              setCustomAmount(value.replace(/[^0-9.]/g, ''));
              setAmount('');
            }}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            Your transaction PIN is verified securely by ZENIMONIES.
          </Text>
        </View>

        {result && (
          <View
            style={[
              styles.resultBox,
              result.status === 'completed'
                ? styles.successBox
                : result.status === 'failed'
                ? styles.failedBox
                : styles.pendingBox,
            ]}
          >
            <MaterialCommunityIcons
              name={
                result.status === 'completed'
                  ? 'check-circle'
                  : result.status === 'failed'
                  ? 'alert-circle'
                  : 'clock-outline'
              }
              size={26}
              color={
                result.status === 'completed'
                  ? colors.success
                  : result.status === 'failed'
                  ? colors.danger
                  : '#C58A19'
              }
            />

            <Text style={styles.resultTitle}>
              {result.status === 'completed'
                ? 'Purchase successful'
                : result.status === 'failed'
                ? 'Purchase failed'
                : 'Purchase pending'}
            </Text>

            <Text style={styles.resultMessage}>
              {result.message}
            </Text>

            {!!result.reference && (
              <Text style={styles.reference}>
                Reference: {result.reference}
              </Text>
            )}

            {result.status === 'pending' && !!pendingReference && (
              <TouchableOpacity
                style={styles.requeryButton}
                onPress={handleRequery}
                disabled={requerying}
              >
                {requerying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.requeryText}>
                    Check transaction status
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {result.status !== 'pending' && (
              <TouchableOpacity
                style={styles.newPurchaseButton}
                onPress={resetForm}
              >
                <Text style={styles.newPurchaseText}>
                  Make another purchase
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.continueButton,
            (loading ||
              !validPhone ||
              !network ||
              selectedAmount < 50 ||
              selectedAmount > 50000) &&
              styles.disabledButton,
          ]}
          onPress={handlePurchase}
          disabled={
            loading ||
            !validPhone ||
            !network ||
            selectedAmount < 50 ||
            selectedAmount > 50000
          }
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Please confirm the phone number and network before purchasing.
        </Text>
      </ScrollView>

      <Modal
        visible={pinVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!loading) {
            setPinVisible(false);
            setPin('');
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.pinModal}>
            <View style={styles.modalHandle} />

            <Text style={styles.pinTitle}>
              Confirm Airtime Purchase
            </Text>

            <Text style={styles.pinDescription}>
              Enter your transaction PIN to authorize this payment.
            </Text>

            <Text style={styles.pinSummary}>
              {network ? networkLabel(network) : ''} · {phone}
            </Text>

            <Text style={styles.pinAmount}>
              ₦{Number(selectedAmount || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <TextInput
              value={pin}
              onChangeText={(value) =>
                setPin(value.replace(/\D/g, '').slice(0, 6))
              }
              secureTextEntry
              keyboardType="number-pad"
              placeholder="Transaction PIN"
              placeholderTextColor={colors.textSecondary}
              style={styles.pinInput}
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.confirmButton,
                loading && styles.disabledButton,
              ]}
              onPress={confirmPurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueText}>
                  Confirm and Pay
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (loading) return;
                setPinVisible(false);
                setPin('');
              }}
              disabled={loading}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof getColors>,
  isDark: boolean
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      height: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 15,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    intro: {
      alignItems: 'center',
      marginBottom: 25,
    },
    introIcon: {
      width: 57,
      height: 57,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 5,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 9,
      marginTop: 17,
    },
    phoneInput: {
      minHeight: 55,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
    },
    countryCode: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 12,
    },
    detectedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 9,
      gap: 7,
    },
    detectedText: {
      color: colors.success,
      fontSize: 11,
      fontWeight: '700',
    },
    networkGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 9,
    },
    networkItem: {
      width: '48%',
      minHeight: 86,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },
    networkSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
      backgroundColor: colors.primaryLight,
    },
    networkName: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 12,
      marginTop: 5,
    },
    networkNameSelected: {
      color: colors.primary,
    },
    suggestedText: {
      color: colors.success,
      fontSize: 9,
      fontWeight: '800',
      marginTop: 3,
    },
    selectedCheck: {
      position: 'absolute',
      right: 7,
      top: 7,
    },
    networkNote: {
      color: colors.textSecondary,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 9,
    },
    amountGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 9,
    },
    amountItem: {
      width: '31%',
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    amountText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    amountTextSelected: {
      color: colors.primary,
    },
    customAmountInput: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    currencyPrefix: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginRight: 9,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
      padding: 12,
      marginTop: 20,
      gap: 9,
    },
    infoText: {
      flex: 1,
      color: colors.text,
      fontSize: 10,
      lineHeight: 15,
    },
    continueButton: {
      minHeight: 54,
      borderRadius: 13,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 23,
    },
    continueText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    disabledButton: {
      opacity: 0.45,
    },
    footerNote: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 12,
    },
    resultBox: {
      borderRadius: 14,
      padding: 15,
      marginTop: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    successBox: {
      backgroundColor: colors.primaryLight,
    },
    failedBox: {
      backgroundColor: isDark ? '#3C2222' : '#FCEEEE',
    },
    pendingBox: {
      backgroundColor: isDark ? '#3C3321' : '#FFF7E6',
    },
    resultTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 8,
    },
    resultMessage: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 6,
    },
    reference: {
      color: colors.textSecondary,
      fontSize: 9,
      marginTop: 8,
    },
    requeryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 17,
      paddingVertical: 11,
      marginTop: 13,
    },
    requeryText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 11,
    },
    newPurchaseButton: {
      marginTop: 13,
      padding: 10,
    },
    newPurchaseText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    pinModal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 23,
      paddingTop: 12,
      paddingBottom: 30,
    },
    modalHandle: {
      width: 42,
      height: 4,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    pinTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
      textAlign: 'center',
    },
    pinDescription: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 7,
    },
    pinSummary: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 17,
      fontSize: 12,
      fontWeight: '700',
    },
    pinAmount: {
      color: colors.text,
      textAlign: 'center',
      marginTop: 5,
      fontSize: 25,
      fontWeight: '900',
    },
    pinInput: {
      height: 53,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      color: colors.text,
      textAlign: 'center',
      fontSize: 20,
      letterSpacing: 8,
      marginTop: 20,
      backgroundColor: colors.background,
    },
    confirmButton: {
      minHeight: 53,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 17,
    },
    cancelButton: {
      padding: 13,
      alignItems: 'center',
    },
    cancelText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
