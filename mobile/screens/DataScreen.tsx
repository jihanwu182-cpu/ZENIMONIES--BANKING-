
import React, { useEffect, useMemo, useState } from 'react';

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

type Network = 'mtn' | 'airtel' | 'glo' | 't2mobile';

type DataPlan = {
  variation_code: string;
  name: string;
  amount: number;
  description?: string;
};

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
  { value: 'mtn', label: 'MTN', icon: 'cellphone' },
  { value: 'airtel', label: 'Airtel', icon: 'signal' },
  { value: 'glo', label: 'Glo', icon: 'sim' },
  {
    value: 't2mobile',
    label: 'T2 Mobile',
    icon: 'cellphone-wireless',
  },
];

const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').slice(0, 11);

const detectNetwork = (phone: string): Network | null => {
  const prefixes: Record<string, Network> = {
    '0803': 'mtn',
    '0806': 'mtn',
    '0810': 'mtn',
    '0813': 'mtn',
    '0814': 'mtn',
    '0816': 'mtn',
    '0903': 'mtn',
    '0906': 'mtn',
    '0913': 'mtn',
    '0916': 'mtn',

    '0802': 'airtel',
    '0808': 'airtel',
    '0812': 'airtel',
    '0701': 'airtel',
    '0708': 'airtel',
    '0901': 'airtel',
    '0902': 'airtel',
    '0907': 'airtel',
    '0912': 'airtel',

    '0805': 'glo',
    '0807': 'glo',
    '0811': 'glo',
    '0815': 'glo',
    '0705': 'glo',
    '0905': 'glo',
    '0915': 'glo',

    '0809': 't2mobile',
    '0817': 't2mobile',
    '0818': 't2mobile',
    '0908': 't2mobile',
    '0909': 't2mobile',
  };

  if (phone.length < 4) return null;

  return prefixes[phone.substring(0, 4)] || null;
};

export default function DataScreen({
  token,
  onBack,
  onComplete,
}: Props) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const styles = createStyles(colors, isDark);

  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<Network | null>(null);
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('');

  const [result, setResult] = useState<{
    status: string;
    reference: string;
    message: string;
  } | null>(null);

  const detectedNetwork = useMemo(
    () => detectNetwork(phone),
    [phone]
  );

  const validPhone = /^0\d{10}$/.test(phone);

  const networkLabel = (value: Network) =>
    NETWORKS.find((item) => item.value === value)?.label || value;

  const loadPlans = async (selectedNetwork: Network) => {
    setLoadingPlans(true);
    setPlans([]);
    setSelectedPlan(null);
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE}/data/plans?network=${encodeURIComponent(selectedNetwork)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.message || 'Unable to retrieve data plans.'
        );
      }

      const returnedPlans = Array.isArray(data.plans)
        ? data.plans
        : [];

      const normalizedPlans = returnedPlans
        .map((item: any) => ({
          variation_code: String(
            item.variation_code || item.plan_id || ''
          ),
          name: String(
            item.name || item.description || item.variation_code || 'Data plan'
          ),
          amount: Number(item.amount),
          description: item.description
            ? String(item.description)
            : undefined,
        }))
        .filter(
          (item: DataPlan) =>
            item.variation_code &&
            Number.isFinite(item.amount) &&
            item.amount > 0
        );

      setPlans(normalizedPlans);

      if (normalizedPlans.length === 0) {
        Alert.alert(
          'No plans available',
          'No data plans were returned for this network. Please try again later.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Unable to load plans',
        error?.message || 'Please check your connection and try again.'
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (network && token) {
      void loadPlans(network);
    } else {
      setPlans([]);
      setSelectedPlan(null);
    }
  }, [network, token]);

  const handlePhoneChange = (value: string) => {
    const normalized = normalizePhone(value);

    setPhone(normalized);
    setResult(null);
  };

  const handleNetworkSelection = (value: Network) => {
    setNetwork(value);
  };

  const handlePurchase = () => {
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

    if (!selectedPlan) {
      Alert.alert(
        'Select a data plan',
        'Please choose a data plan before continuing.'
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

    if (!selectedPlan || !network) return;

    setLoadingPurchase(true);

    try {
      const response = await fetch(`${API_BASE}/data`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          network,
          phone,
          variation_code: selectedPlan.variation_code,
          transaction_pin: pin,
        }),
      });

      const data = await response.json();

      setPin('');
      setPinVisible(false);

      const reference = String(data.reference || '');

      if (
        response.status === 200 &&
        data.success === true &&
        data.status === 'completed'
      ) {
        setResult({
          status: 'completed',
          reference,
          message:
            data.message || 'Your data purchase was successful.',
        });

        onComplete?.();
        return;
      }

      if (
        response.status === 202 ||
        data.status === 'pending'
      ) {
        setResult({
          status: 'pending',
          reference,
          message:
            data.message ||
            'Your data purchase is processing. Please do not purchase again.',
        });
        return;
      }

      if (
        data.status === 'failed' ||
        data.status === 'refunded'
      ) {
        setResult({
          status: 'failed',
          reference,
          message:
            data.message ||
            'Your data purchase failed. Check your wallet balance.',
        });

        onComplete?.();
        return;
      }

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.message || 'Unable to process your data purchase.'
        );
      }

      setResult({
        status: 'pending',
        reference,
        message:
          data.message ||
          'Your transaction requires confirmation. Please do not retry.',
      });
    } catch (error: any) {
      Alert.alert(
        'Purchase status unavailable',
        error?.message ||
          'We could not confirm your purchase. Check your transaction history before trying again.'
      );
    } finally {
      setLoadingPurchase(false);
    }
  };

  const resetForm = () => {
    setPhone('');
    setNetwork(null);
    setPlans([]);
    setSelectedPlan(null);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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

        <Text style={styles.headerTitle}>Buy Data</Text>

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
              name="wifi"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>
            Stay connected
          </Text>

          <Text style={styles.subtitle}>
            Choose a network and data plan.
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
              size={19}
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
            const suggested = detectedNetwork === item.value;

            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => handleNetworkSelection(item.value)}
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
                  <Text style={styles.suggestedText}>
                    Suggested
                  </Text>
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
          Network detection is based on the phone number prefix.
          Ported numbers may use a different network, so confirm
          the recipient's current network before continuing.
        </Text>

        <View style={styles.plansHeading}>
          <Text style={styles.label}>Available data plans</Text>

          {network ? (
            <Text style={styles.selectedNetworkLabel}>
              {networkLabel(network)}
            </Text>
          ) : null}
        </View>

        {!network ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="wifi"
              size={28}
              color={colors.textSecondary}
            />

            <Text style={styles.emptyText}>
              Select a network to view available data plans.
            </Text>
          </View>
        ) : loadingPlans ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Loading available plans...
            </Text>
          </View>
        ) : plans.length > 0 ? (
          <View style={styles.planList}>
            {plans.map((plan) => {
              const selected =
                selectedPlan?.variation_code === plan.variation_code;

              return (
                <TouchableOpacity
                  key={plan.variation_code}
                  onPress={() => setSelectedPlan(plan)}
                  style={[
                    styles.planItem,
                    selected && styles.planSelected,
                  ]}
                >
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>
                      {plan.name}
                    </Text>

                    {!!plan.description && (
                      <Text style={styles.planDescription}>
                        {plan.description}
                      </Text>
                    )}
                  </View>

                  <View style={styles.planPriceArea}>
                    <Text style={styles.planPrice}>
                      ₦{plan.amount.toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>

                    <MaterialCommunityIcons
                      name={
                        selected
                          ? 'radiobox-marked'
                          : 'radiobox-blank'
                      }
                      size={21}
                      color={
                        selected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={27}
              color={colors.textSecondary}
            />

            <Text style={styles.emptyText}>
              No plans are currently available for this network.
            </Text>

            <TouchableOpacity
              onPress={() => network && loadPlans(network)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={20}
            color={colors.primary}
          />

          <Text style={styles.infoText}>
            Your transaction PIN is verified securely by the
            ZENIMONIES backend. The displayed plan price comes
            from the provider catalogue.
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
            (
              !validPhone ||
              !network ||
              !selectedPlan ||
              loadingPlans ||
              loadingPurchase
            ) && styles.disabledButton,
          ]}
          disabled={
            !validPhone ||
            !network ||
            !selectedPlan ||
            loadingPlans ||
            loadingPurchase
          }
          onPress={handlePurchase}
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
          Confirm the phone number, network and data plan
          before making your purchase.
        </Text>
      </ScrollView>

      <Modal
        visible={pinVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!loadingPurchase) {
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
              Confirm Data Purchase
            </Text>

            <Text style={styles.pinDescription}>
              Enter your transaction PIN to authorize this payment.
            </Text>

            <Text style={styles.pinSummary}>
              {network ? networkLabel(network) : ''} · {phone}
            </Text>

            <Text style={styles.selectedPlanSummary}>
              {selectedPlan?.name || ''}
            </Text>

            <Text style={styles.pinAmount}>
              ₦{Number(selectedPlan?.amount || 0).toLocaleString(
                'en-NG',
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
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
                loadingPurchase && styles.disabledButton,
              ]}
              onPress={confirmPurchase}
              disabled={loadingPurchase}
            >
              {loadingPurchase ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueText}>
                  Confirm and Pay
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (loadingPurchase) return;
                setPinVisible(false);
                setPin('');
              }}
              disabled={loadingPurchase}
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
    plansHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedNetworkLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      marginTop: 17,
    },
    planList: {
      gap: 9,
    },
    planItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 67,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    planSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
      backgroundColor: colors.primaryLight,
    },
    planInfo: {
      flex: 1,
      paddingRight: 10,
    },
    planName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    planDescription: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 4,
    },
    planPriceArea: {
      alignItems: 'flex-end',
      gap: 6,
    },
    planPrice: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '900',
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
      backgroundColor: colors.surface,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 9,
    },
    loadingBox: {
      padding: 25,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 13,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 10,
    },
    retryButton: {
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: colors.primary,
    },
    retryText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
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
    newPurchaseButton: {
      marginTop: 13,
      padding: 10,
    },
    newPurchaseText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
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
    selectedPlanSummary: {
      color: colors.text,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '800',
      marginTop: 8,
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
