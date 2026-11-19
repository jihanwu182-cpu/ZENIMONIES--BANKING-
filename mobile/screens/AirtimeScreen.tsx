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

const BRAND_DARK_GREEN = '#527900';
const BRAND_GREEN = '#78A900';
const BRAND_LIGHT_GREEN = '#E8F3D9';

const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').slice(0, 11);

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

  const [manualNetwork, setManualNetwork] = useState(false);

  const [networkModalVisible, setNetworkModalVisible] =
    useState(false);

  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

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

  const validPhone = /^0[789][01]\d{8}$/.test(phone);

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
        'Enter a valid 11-digit Nigerian phone number.'
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

    setPinVisible(true);
  };

  const confirmPurchase = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      Alert.alert(
        'Invalid PIN',
        'Enter your transaction PIN.'
      );
      return;
    }

    if (!network) return;

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
        transaction.reference ||
        data.reference ||
        '';

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
          data.message ||
            'Unable to process Airtime purchase.'
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

  const resetForm = () => {
    setPhone('');
    setNetwork(null);
    setManualNetwork(false);
    setAmount('');
    setCustomAmount('');
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
        {/* PHONE NUMBER */}

        <Text style={styles.label}>
          Phone number
        </Text>

        <View style={styles.phoneInput}>
          <Text style={styles.countryCode}>
            +234
          </Text>

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

        {/* NETWORK DETECTION */}

        {detectedNetwork && (
          <View style={styles.detectedBox}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={colors.success}
            />

            <Text style={styles.detectedText}>
              {manualNetwork
                ? 'Network selected manually'
                : `Network detected: ${networkLabel(
                    detectedNetwork
                  )}`}
            </Text>
          </View>
        )}

        {/* NETWORK SELECTOR */}

        <Text style={styles.label}>
          Mobile network
        </Text>

        <TouchableOpacity
          style={styles.networkSelector}
          onPress={() => setNetworkModalVisible(true)}
          activeOpacity={0.75}
        >
          {selectedNetwork ? (
            <View style={styles.selectedNetworkContent}>
              <Image
                source={selectedNetwork.logo}
                style={styles.networkLogo}
                resizeMode="contain"
              />

              <View style={styles.networkSelectorText}>
                <Text style={styles.networkSelectorTitle}>
                  {selectedNetwork.label}
                </Text>

                <Text style={styles.networkSelectorSubtitle}>
                  {manualNetwork
                    ? 'Selected manually'
                    : 'Automatically detected'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.networkPlaceholder}>
              Select mobile network
            </Text>
          )}

          <MaterialCommunityIcons
            name="chevron-down"
            size={23}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

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
                  isSelected &&
                    styles.amountSelected,
                ]}
              >
                <Text
                  style={[
                    styles.amountText,
                    isSelected &&
                      styles.amountTextSelected,
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
                        ? BRAND_DARK_GREEN
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

            <TextInput
              value={pin}
              onChangeText={value =>
                setPin(
                  value
                    .replace(/\D/g, '')
                    .slice(0, 6)
                )
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
                loading &&
                  styles.disabledButton,
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

    networkSelector: {
      minHeight: 58,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
    },

    selectedNetworkContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    networkLogo: {
      width: 40,
      height: 36,
    },

    networkSelectorText: {
      marginLeft: 10,
    },

    networkSelectorTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 13,
    },

    networkSelectorSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 3,
    },

    networkPlaceholder: {
      color: colors.textSecondary,
      fontSize: 13,
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
      borderColor: BRAND_DARK_GREEN,
      backgroundColor: BRAND_LIGHT_GREEN,
    },

    amountText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },

    amountTextSelected: {
      color: BRAND_DARK_GREEN,
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
      backgroundColor: BRAND_DARK_GREEN,
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
      backgroundColor: BRAND_LIGHT_GREEN,
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
      backgroundColor: BRAND_DARK_GREEN,
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
      color: BRAND_DARK_GREEN,
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
      borderColor: BRAND_DARK_GREEN,
      backgroundColor: BRAND_LIGHT_GREEN,
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
      backgroundColor: BRAND_LIGHT_GREEN,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      marginRight: 8,
    },

    suggestedBadgeText: {
      color: BRAND_DARK_GREEN,
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

    confirmButton: {
      minHeight: 53,
      borderRadius: 12,
      backgroundColor: BRAND_DARK_GREEN,
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
