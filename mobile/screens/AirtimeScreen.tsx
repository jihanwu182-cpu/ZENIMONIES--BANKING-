import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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

type NetworkItem = {
  value: Network;
  label: string;
  logo: any;
};

const NETWORKS: NetworkItem[] = [
  {
    value: 'MTN',
    label: 'MTN',
    logo: require('../assets/network-logos/mtn-nigeria-communications-plc--600.png'),
  },
  {
    value: 'Airtel',
    label: 'Airtel',
    logo: require('../assets/network-logos/airtel.png'),
  },
  {
    value: 'Glo',
    label: 'Glo',
    logo: require('../assets/network-logos/glo.png'),
  },
  {
    value: '9mobile',
    label: 'T2 Mobile',
    logo: require('../assets/network-logos/T2-Mobilr.jpg'),
  },
];

const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

// Keep the customer's entered national number as-is
// (with or without the leading 0).
// If +234 is pasted, remove that country prefix.
const normalizePhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('234')) digits = digits.slice(3);
  return digits.slice(0, 11);
};

// Prefix detection uses a temporary 0-prefixed form
// for 10-digit input.
const phoneForDetection = (phone: string) =>
  phone.length === 10 ? `0${phone}` : phone;

const detectNetwork = (phone: string): Network | null => {
  const prefixes: Record<string, Network> = {
    // MTN
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

    // Airtel
    '0802': 'Airtel',
    '0808': 'Airtel',
    '0812': 'Airtel',
    '0701': 'Airtel',
    '0708': 'Airtel',
    '0901': 'Airtel',
    '0902': 'Airtel',
    '0907': 'Airtel',
    '0912': 'Airtel',

    // Glo
    '0805': 'Glo',
    '0807': 'Glo',
    '0811': 'Glo',
    '0815': 'Glo',
    '0705': 'Glo',
    '0905': 'Glo',
    '0915': 'Glo',

    // T2 Mobile
    '0809': '9mobile',
    '0817': '9mobile',
    '0818': '9mobile',
    '0908': '9mobile',
    '0909': '9mobile',
  };

  if (phone.length < 4) return null;

  const detectionPhone = phoneForDetection(phone);

  return prefixes[detectionPhone.substring(0, 4)] || null;
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

  const [manualNetwork, setManualNetwork] = useState(false);

  const [networkModalVisible, setNetworkModalVisible] =
    useState(false);

  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // Transaction PIN
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pinError, setPinError] = useState('');

  const [loading, setLoading] = useState(false);
  const [requerying, setRequerying] = useState(false);

  const [pendingReference, setPendingReference] =
    useState('');

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

  const validPhone =
    /^(?:0[789][01]\d{8}|[789][01]\d{8})$/.test(phone);

  const selectedNetwork = NETWORKS.find(
    item => item.value === network
  );

  const networkLabel = (value: Network) =>
    value === '9mobile' ? 'T2 Mobile' : value;

  const handlePhoneChange = (value: string) => {
    const normalized = normalizePhone(value);

    setPhone(normalized);
    setResult(null);
    setPendingReference('');
    setManualNetwork(false);

    const detected = detectNetwork(normalized);

    setNetwork(detected);
  };

  const handleNetworkSelection = (value: Network) => {
    setNetwork(value);
    setManualNetwork(true);
    setNetworkModalVisible(false);
    setResult(null);
  };

  const handlePurchase = async () => {
    if (!token) {
      Alert.alert(
        'Session unavailable',
        'Please sign in again.'
      );
      return;
    }

    if (!validPhone) {
      Alert.alert(
        'Invalid phone number',
        'Enter a valid Nigerian phone number (10 digits without the first 0, or 11 digits with it).'
      );
      return;
    }

    if (!network) {
      Alert.alert(
        'Select network',
        'Please select the recipient network.'
      );
      return;
    }

    if (
      !Number.isFinite(selectedAmount) ||
      selectedAmount < 50 ||
      selectedAmount > 50000 ||
      Math.round(selectedAmount * 100) !==
        selectedAmount * 100
    ) {
      Alert.alert(
        'Invalid amount',
        'Enter an amount between ₦50 and ₦50,000.'
      );
      return;
    }

    if (pendingReference) {
      Alert.alert(
        'Transaction pending',
        'Please check the status of your previous transaction before making another purchase.'
      );
      return;
    }

    // Reset PIN and error whenever confirmation opens.
    setPin('');
    setPinError('');
    setPinVisible(true);
  };

  // ====================================================
  // CONFIRM AIRTIME PURCHASE
  // 4-DIGIT TRANSACTION PIN
  // ====================================================

  const confirmPurchase = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setPinError('Enter your 4-digit transaction PIN.');
      return;
    }

    if (!network) return;

    setLoading(true);
    setPinError('');

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

      const transaction = data.transaction || {};

      const reference =
        transaction.reference ||
        data.reference ||
        '';

      // ====================================================
      // INCORRECT TRANSACTION PIN
      // ====================================================

      const responseMessage = String(
        data.message || data.error || ''
      );

      const pinFailure =
        /incorrect.*pin|invalid.*pin|wrong.*pin|pin.*incorrect|pin.*invalid|transaction pin/i.test(
          responseMessage
        );

      if (
        pinFailure &&
        !(
          transaction.status === 'completed' ||
          data.success === true
        )
      ) {
        // Clear the PIN after a failed attempt.
        setPin('');

        // Show error and keep modal open.
        setPinError(
          'Incorrect transaction PIN. Please try again.'
        );

        return;
      }

      // ====================================================
      // CLEAR PIN AFTER RESPONSE
      // ====================================================

      setPin('');
      setPinError('');
      setPinVisible(false);

      // ====================================================
      // SUCCESS
      // ====================================================

      if (
        response.status === 200 &&
        data.success === true &&
        transaction.status === 'completed'
      ) {
        setResult({
          status: 'completed',
          reference,
          message:
            data.message ||
            'Airtime purchase completed successfully.',
        });

        onComplete?.();
        return;
      }

      // ====================================================
      // PENDING / RECONCILIATION
      // ====================================================

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

      // ====================================================
      // FAILED / REFUNDED
      // ====================================================

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

      // ====================================================
      // OTHER HTTP ERRORS
      // ====================================================

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to process Airtime purchase.'
        );
      }

      // ====================================================
      // UNKNOWN STATUS
      // PROTECT AGAINST DUPLICATE PURCHASES
      // ====================================================

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

  // ====================================================
  // REQUERY TRANSACTION
  // ====================================================

  const handleRequery = async () => {
    if (!pendingReference || !token) return;

    setRequerying(true);

    try {
      const response = await fetch(
        `${API_BASE}/airtime/requery/${encodeURIComponent(
          pendingReference
        )}`,
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
          message:
            data.message ||
            'Airtime purchase completed successfully.',
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
          message:
            data.message ||
            'The Airtime purchase failed. Check your wallet balance.',
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
          data.message ||
            'We could not retrieve the transaction status.'
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

  // ====================================================
  // RESET FORM
  // ====================================================

  const resetForm = () => {
    setPhone('');
    setNetwork(null);
    setManualNetwork(false);
    setAmount('');
    setCustomAmount('');
    setPin('');
    setPinError('');
    setPinVisible(false);
    setResult(null);
    setPendingReference('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Buy Airtime
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* PHONE NUMBER + NETWORK PICKER */}

        <Text style={styles.label}>
          Phone number
        </Text>

        <View style={styles.phoneInput}>
          <Text style={styles.countryCode}>
            🇳🇬 +234
          </Text>

          <TextInput
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            placeholder="803 123 4567"
            placeholderTextColor={colors.textSecondary}
            maxLength={11}
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.inlineNetworkPicker}
            onPress={() => setNetworkModalVisible(true)}
            activeOpacity={0.75}
          >
            {selectedNetwork ? (
              <>
                <Image
                  source={selectedNetwork.logo}
                  style={styles.inlineNetworkLogo}
                  resizeMode="contain"
                />

                <Text style={styles.inlineNetworkName}>
                  {selectedNetwork.label}
                </Text>
              </>
            ) : (
              <Text style={styles.inlineNetworkPlaceholder}>
                Network
              </Text>
            )}

            <MaterialCommunityIcons
              name="chevron-down"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* AMOUNT */}

        <Text style={styles.label}>
          Choose amount
        </Text>

        <View style={styles.amountGrid}>
          {AMOUNTS.map(value => {
            const isSelected =
              amount === String(value);

            return (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  setAmount(String(value));
                  setCustomAmount('');
                  setResult(null);
                }}
                style={[
                  styles.amountItem,
                  isSelected && styles.amountSelected,
                ]}
              >
                <Text
                  style={[
                    styles.amountText,
                    isSelected && styles.amountTextSelected,
                  ]}
                >
                  ₦{value.toLocaleString('en-NG')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CUSTOM AMOUNT */}

        <Text style={styles.label}>
          Other amount
        </Text>

        <View style={styles.customAmountInput}>
          <Text style={styles.currencyPrefix}>
            ₦
          </Text>

          <TextInput
            value={customAmount}
            onChangeText={value => {
              setCustomAmount(
                value.replace(/[^0-9.]/g, '')
              );
              setAmount('');
              setResult(null);
            }}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
        </View>

        {/* TRANSACTION RESULT */}

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
              size={27}
              color={
                result.status === 'completed'
                  ? colors.success
                  : result.status === 'failed'
                  ? '#D64545'
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

            {result.status === 'pending' &&
              !!pendingReference && (
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

        {/* CONTINUE */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            (loading ||
              !validPhone ||
              !network ||
              selectedAmount < 50 ||
              selectedAmount > 50000 ||
              !!pendingReference) &&
              styles.disabledButton,
          ]}
          onPress={handlePurchase}
          disabled={
            loading ||
            !validPhone ||
            !network ||
            selectedAmount < 50 ||
            selectedAmount > 50000 ||
            !!pendingReference
          }
        >
          <Text style={styles.continueText}>
            {pendingReference
              ? 'Transaction pending'
              : 'Continue'}
          </Text>

          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </ScrollView>

      {/* NETWORK SELECTOR */}

      <Modal
        visible={networkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setNetworkModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.networkModal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select network
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setNetworkModalVisible(false)
                }
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {NETWORKS.map(item => {
              const isSelected =
                network === item.value;

              const suggested =
                detectedNetwork === item.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.networkOption,
                    isSelected &&
                      styles.networkOptionSelected,
                  ]}
                  onPress={() =>
                    handleNetworkSelection(item.value)
                  }
                  activeOpacity={0.75}
                >
                  <Image
                    source={item.logo}
                    style={styles.modalNetworkLogo}
                    resizeMode="contain"
                  />

                  <View style={styles.networkOptionContent}>
                    <Text style={styles.networkOptionTitle}>
                      {item.label}
                    </Text>

                    <Text style={styles.networkOptionSubtitle}>
                      {suggested
                        ? 'Detected from phone number'
                        : 'Mobile network'}
                    </Text>
                  </View>

                  {suggested && (
                    <View style={styles.suggestedBadge}>
                      <Text style={styles.suggestedBadgeText}>
                        Suggested
                      </Text>
                    </View>
                  )}

                  <MaterialCommunityIcons
                    name={
                      isSelected
                        ? 'check-circle'
                        : 'circle-outline'
                    }
                    size={22}
                    color={
                      isSelected
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() =>
                setNetworkModalVisible(false)
              }
            >
              <Text style={styles.modalCancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TRANSACTION PIN */}

      <Modal
        visible={pinVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!loading) {
            setPinVisible(false);
            setPin('');
            setPinError('');
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.pinModal}>
            <View style={styles.modalHandle} />

            <Text style={styles.pinTitle}>
              Confirm Airtime Purchase
            </Text>

            <Text style={styles.pinDescription}>
              Enter your transaction PIN to authorize
              this payment.
            </Text>

            <Text style={styles.pinSummary}>
              {network
                ? networkLabel(network)
                : ''}{' '}
              · {phone}
            </Text>

            <Text style={styles.pinAmount}>
              ₦
              {Number(
                selectedAmount || 0
              ).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            {/* 4-DIGIT TRANSACTION PIN */}

            <TextInput
              value={pin}
              onChangeText={value => {
                setPin(
                  value
                    .replace(/\D/g, '')
                    .slice(0, 4)
                );
                setPinError('');
              }}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="4-digit Transaction PIN"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.pinInput,
                !!pinError && styles.pinInputError,
              ]}
              maxLength={4}
              autoFocus
            />

            {/* PIN ERROR MESSAGE */}

            {!!pinError && (
              <Text style={styles.pinError}>
                {pinError}
              </Text>
            )}

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
                setPinError('');
              }}
              disabled={loading}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
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

    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 9,
      marginTop: 20,
    },

    phoneInput: {
      minHeight: 55,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      borderWidth: 0,
    },

    countryCode: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginRight: 9,
      flexShrink: 0,
      minWidth: 54,
      textAlign: 'left',
    },

    input: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 10,
      paddingHorizontal: 3,
      borderWidth: 0,
    },

    inlineNetworkPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 8,
      marginLeft: 4,
      minHeight: 42,
      width: 108,
      flexShrink: 0,
    },

    inlineNetworkLogo: {
      width: 30,
      height: 28,
    },

    inlineNetworkName: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '800',
      marginHorizontal: 5,
    },

    inlineNetworkPlaceholder: {
      color: colors.textSecondary,
      fontSize: 11,
      marginRight: 4,
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
      backgroundColor: isDark
        ? '#3C2222'
        : '#FCEEEE',
    },

    pendingBox: {
      backgroundColor: isDark
        ? '#3C3321'
        : '#FFF7E6',
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

    networkModal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 25,
    },

    modalHandle: {
      width: 42,
      height: 4,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 18,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },

    networkOption: {
      minHeight: 64,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 9,
    },

    networkOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },

    modalNetworkLogo: {
      width: 43,
      height: 38,
    },

    networkOptionContent: {
      flex: 1,
      marginLeft: 11,
    },

    networkOptionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },

    networkOptionSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 4,
    },

    suggestedBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      marginRight: 8,
    },

    suggestedBadgeText: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '800',
    },

    modalCancelButton: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 5,
    },

    modalCancelText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },

    pinModal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 23,
      paddingTop: 12,
      paddingBottom: 30,
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

    pinInputError: {
      borderColor: '#D64545',
    },

    pinError: {
      color: '#D64545',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 10,
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
