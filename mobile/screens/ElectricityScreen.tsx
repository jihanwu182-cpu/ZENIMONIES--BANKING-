import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';

interface ElectricityProvider {
  id: string;
  name: string;
}

interface MeterCustomer {
  customerName: string;
  meterNumber: string;
  address?: string;
}

interface ElectricityScreenProps {
  onValidate?: (
    provider: string,
    meterNumber: string,
    meterType: 'prepaid' | 'postpaid'
  ) => Promise<MeterCustomer>;

  onPay?: (
    provider: string,
    meterNumber: string,
    meterType: 'prepaid' | 'postpaid',
    amount: number,
    transactionPin: string
  ) => Promise<any>;
}

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

const providers: ElectricityProvider[] = [
  { id: 'ikeja', name: 'Ikeja Electric' },
  { id: 'eko', name: 'Eko Electric' },
  { id: 'abuja', name: 'Abuja Electric' },
  { id: 'ibadan', name: 'Ibadan Electric' },
  { id: 'kano', name: 'Kano Electric' },
  { id: 'kaduna', name: 'Kaduna Electric' },
  { id: 'jos', name: 'Jos Electric' },
  { id: 'enugu', name: 'Enugu Electric' },
  { id: 'portharcourt', name: 'Port Harcourt Electric' },
  { id: 'benin', name: 'Benin Electric' },
  { id: 'yola', name: 'Yola Electric' },
];

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG')}`;

export default function ElectricityScreen({
  onValidate,
  onPay,
}: ElectricityScreenProps) {
  const [selectedProvider, setSelectedProvider] =
    useState('ikeja');

  const [meterType, setMeterType] =
    useState<'prepaid' | 'postpaid'>('prepaid');

  const [meterNumber, setMeterNumber] =
    useState('');

  const [customer, setCustomer] =
    useState<MeterCustomer | null>(null);

  const [amount, setAmount] =
    useState('');

  const [transactionPin, setTransactionPin] =
    useState('');

  const [validated, setValidated] =
    useState(false);

  const [loadingValidation, setLoadingValidation] =
    useState(false);

  const [loadingPayment, setLoadingPayment] =
    useState(false);

  const [showPin, setShowPin] =
    useState(false);

  const [paymentResult, setPaymentResult] =
    useState<any>(null);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setCustomer(null);
    setValidated(false);
    setPaymentResult(null);
  };

  const handleMeterTypeChange = (
    type: 'prepaid' | 'postpaid'
  ) => {
    setMeterType(type);
    setCustomer(null);
    setValidated(false);
    setPaymentResult(null);
  };

  const handleValidateMeter = async () => {
    if (!meterNumber.trim()) {
      Alert.alert(
        'Meter Number Required',
        'Please enter your meter number.'
      );
      return;
    }

    if (!onValidate) {
      Alert.alert(
        'Not Connected',
        'Meter validation has not yet been connected to the backend.'
      );
      return;
    }

    try {
      setLoadingValidation(true);

      const result = await onValidate(
        selectedProvider,
        meterNumber.trim(),
        meterType
      );

      setCustomer(result);
      setValidated(true);

      Alert.alert(
        'Meter Verified',
        `Customer: ${result.customerName}`
      );
    } catch (error: any) {
      setCustomer(null);
      setValidated(false);

      Alert.alert(
        'Validation Failed',
        error?.message ||
          'Unable to validate meter number. Please check the number and try again.'
      );
    } finally {
      setLoadingValidation(false);
    }
  };

  const handlePayment = () => {
    if (!validated || !customer) {
      Alert.alert(
        'Validate Meter',
        'Please validate your meter number first.'
      );
      return;
    }

    const paymentAmount = Number(amount);

    if (
      !paymentAmount ||
      Number.isNaN(paymentAmount) ||
      paymentAmount <= 0
    ) {
      Alert.alert(
        'Invalid Amount',
        'Enter a valid payment amount.'
      );
      return;
    }

    if (paymentAmount < 500) {
      Alert.alert(
        'Minimum Amount',
        'The minimum electricity payment is ₦500.'
      );
      return;
    }

    if (
      !transactionPin ||
      transactionPin.length !== 4
    ) {
      Alert.alert(
        'Invalid PIN',
        'Enter your 4-digit transaction PIN.'
      );
      return;
    }

    if (!onPay) {
      Alert.alert(
        'Not Connected',
        'Electricity payment has not yet been connected to the backend.'
      );
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Provider: ${
        providers.find(
          p => p.id === selectedProvider
        )?.name
      }\n\nCustomer: ${
        customer.customerName
      }\n\nMeter Number: ${
        meterNumber
      }\n\nMeter Type: ${
        meterType.toUpperCase()
      }\n\nAmount: ${
        formatCurrency(paymentAmount)
      }`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Pay Now',
          onPress: executePayment,
        },
      ]
    );
  };

  const executePayment = async () => {
    try {
      setLoadingPayment(true);

      const result = await onPay!(
        selectedProvider,
        meterNumber.trim(),
        meterType,
        Number(amount),
        transactionPin
      );

      setPaymentResult(result);

      Alert.alert(
        'Payment Successful',
        result?.message ||
          'Your electricity payment was processed successfully.'
      );
    } catch (error: any) {
      Alert.alert(
        'Payment Failed',
        error?.message ||
          'Your electricity payment could not be completed.'
      );
    } finally {
      setLoadingPayment(false);
    }
  };

  const resetForm = () => {
    setMeterNumber('');
    setAmount('');
    setTransactionPin('');
    setCustomer(null);
    setValidated(false);
    setPaymentResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              Electricity Bills
            </Text>

            <Text style={styles.headerSubtitle}>
              Pay your electricity bill securely
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>
              ⚡
            </Text>
          </View>
        </View>

        {/* PROVIDER */}

        <Text style={styles.sectionTitle}>
          Select Electricity Provider
        </Text>

        <View style={styles.providerCard}>
          <Text style={styles.label}>
            Distribution Company
          </Text>

          <View style={styles.providerList}>
            {providers.map(provider => {
              const selected =
                selectedProvider === provider.id;

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerOption,
                    selected &&
                      styles.providerOptionSelected,
                  ]}
                  onPress={() =>
                    handleProviderChange(provider.id)
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radio,
                      selected &&
                        styles.radioSelected,
                    ]}
                  >
                    {selected && (
                      <View style={styles.radioInner} />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.providerName,
                      selected &&
                        styles.providerNameSelected,
                    ]}
                  >
                    {provider.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* METER TYPE */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Meter Type
          </Text>

          <View style={styles.meterTypeContainer}>
            <TouchableOpacity
              style={[
                styles.meterTypeButton,
                meterType === 'prepaid' &&
                  styles.meterTypeSelected,
              ]}
              onPress={() =>
                handleMeterTypeChange('prepaid')
              }
            >
              <Text
                style={[
                  styles.meterTypeTitle,
                  meterType === 'prepaid' &&
                    styles.meterTypeTitleSelected,
                ]}
              >
                Prepaid
              </Text>

              <Text
                style={[
                  styles.meterTypeDescription,
                  meterType === 'prepaid' &&
                    styles.meterTypeDescriptionSelected,
                ]}
              >
                Buy electricity units
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.meterTypeButton,
                meterType === 'postpaid' &&
                  styles.meterTypeSelected,
              ]}
              onPress={() =>
                handleMeterTypeChange('postpaid')
              }
            >
              <Text
                style={[
                  styles.meterTypeTitle,
                  meterType === 'postpaid' &&
                    styles.meterTypeTitleSelected,
                ]}
              >
                Postpaid
              </Text>

              <Text
                style={[
                  styles.meterTypeDescription,
                  meterType === 'postpaid' &&
                    styles.meterTypeDescriptionSelected,
                ]}
              >
                Pay your electricity bill
              </Text>
            </TouchableOpacity>
          </View>

          {/* METER NUMBER */}

          <Text style={styles.label}>
            Meter Number
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter meter number"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={meterNumber}
            onChangeText={value => {
              setMeterNumber(value);
              setCustomer(null);
              setValidated(false);
              setPaymentResult(null);
            }}
          />

          <TouchableOpacity
            style={styles.validateButton}
            onPress={handleValidateMeter}
            disabled={loadingValidation}
            activeOpacity={0.8}
          >
            {loadingValidation ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.validateButtonText}>
                Validate Meter
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* CUSTOMER */}

        {validated && customer && (
          <View style={styles.customerCard}>
            <View style={styles.verifiedIcon}>
              <Text style={styles.verifiedIconText}>
                ✓
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.customerLabel}>
                Verified Customer
              </Text>

              <Text style={styles.customerName}>
                {customer.customerName}
              </Text>

              <Text style={styles.customerNumber}>
                Meter: {customer.meterNumber}
              </Text>

              {customer.address && (
                <Text style={styles.customerAddress}>
                  {customer.address}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* AMOUNT */}

        {validated && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Payment Amount
            </Text>

            <Text style={styles.label}>
              Amount (₦)
            </Text>

            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={value => {
                setAmount(value);
                setPaymentResult(null);
              }}
            />

            <View style={styles.quickAmounts}>
              {[1000, 2000, 5000, 10000].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickAmount,
                    amount === String(value) &&
                      styles.quickAmountSelected,
                  ]}
                  onPress={() =>
                    setAmount(String(value))
                  }
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === String(value) &&
                        styles.quickAmountTextSelected,
                    ]}
                  >
                    ₦{value.toLocaleString('en-NG')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PIN */}

            <Text style={styles.label}>
              Transaction PIN
            </Text>

            <View style={styles.pinContainer}>
              <TextInput
                style={styles.pinInput}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={!showPin}
                value={transactionPin}
                onChangeText={setTransactionPin}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPin(!showPin)
                }
              >
                <Text style={styles.showPin}>
                  {showPin ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PAYMENT BUTTON */}

            <TouchableOpacity
              style={styles.payButton}
              onPress={handlePayment}
              disabled={loadingPayment}
              activeOpacity={0.8}
            >
              {loadingPayment ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay Electricity Bill
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* PAYMENT RESULT */}

        {paymentResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultIcon}>
              <Text style={styles.resultIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.resultTitle}>
              Payment Successful
            </Text>

            <Text style={styles.resultSubtitle}>
              Your electricity payment was successful.
            </Text>

            {paymentResult.token && (
              <>
                <Text style={styles.tokenLabel}>
                  Electricity Token
                </Text>

                <View style={styles.tokenContainer}>
                  <Text style={styles.tokenText}>
                    {paymentResult.token}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    Alert.alert(
                      'Token',
                      paymentResult.token
                    );
                  }}
                >
                  <Text style={styles.copyButtonText}>
                    View Token
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.newPaymentButton}
              onPress={resetForm}
            >
              <Text style={styles.newPaymentButtonText}>
                Make Another Payment
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECURITY */}

        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>
            🔒
          </Text>

          <Text style={styles.securityText}>
            Your electricity payment is protected
            by ZENIMONIES security.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: BLACK,
  },

  headerSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 5,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8F3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    fontSize: 24,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 14,
  },

  providerCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },

  providerList: {
    gap: 9,
  },

  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: WHITE,
  },

  providerOptionSelected: {
    borderColor: GREEN,
    backgroundColor: '#F5FAED',
  },

  providerName: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '600',
    marginLeft: 12,
  },

  providerNameSelected: {
    color: DARK_GREEN,
    fontWeight: '700',
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: GREEN,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    color: BLACK,
    fontWeight: '600',
    marginBottom: 9,
    marginTop: 10,
  },

  meterTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },

  meterTypeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },

  meterTypeSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: '#F5FAED',
  },

  meterTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
  },

  meterTypeTitleSelected: {
    color: DARK_GREEN,
  },

  meterTypeDescription: {
    fontSize: 11,
    color: MUTED,
    marginTop: 5,
  },

  meterTypeDescriptionSelected: {
    color: DARK_GREEN,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 15,
    color: BLACK,
    backgroundColor: WHITE,
  },

  validateButton: {
    height: 50,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },

  validateButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },

  customerCard: {
    backgroundColor: '#EAF5DE',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#D4E8BD',
  },

  verifiedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  verifiedIconText: {
    color: WHITE,
    fontWeight: '800',
    fontSize: 18,
  },

  customerLabel: {
    fontSize: 11,
    color: DARK_GREEN,
    marginBottom: 4,
    fontWeight: '600',
  },

  customerName: {
    fontSize: 15,
    color: BLACK,
    fontWeight: '800',
  },

  customerNumber: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },

  customerAddress: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },

  amountInput: {
    height: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 22,
    fontWeight: '700',
    color: BLACK,
    backgroundColor: WHITE,
  },

  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  quickAmount: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: WHITE,
  },

  quickAmountSelected: {
    borderColor: GREEN,
    backgroundColor: '#F5FAED',
  },

  quickAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: BLACK,
  },

  quickAmountTextSelected: {
    color: DARK_GREEN,
    fontWeight: '700',
  },

  pinContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pinInput: {
    flex: 1,
    color: BLACK,
    fontSize: 15,
  },

  showPin: {
    color: GREEN,
    fontWeight: '700',
    fontSize: 13,
  },

  payButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: DARK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  payButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },

  resultCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    marginBottom: 20,
  },

  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultIconText: {
    fontSize: 28,
    color: DARK_GREEN,
    fontWeight: '800',
  },

  resultTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 15,
  },

  resultSubtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 7,
  },

  tokenLabel: {
    fontSize: 13,
    color: BLACK,
    fontWeight: '700',
    marginTop: 20,
  },

  tokenContainer: {
    backgroundColor: '#F5FAED',
    borderWidth: 1,
    borderColor: '#D4E8BD',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    width: '100%',
  },

  tokenText: {
    fontSize: 18,
    color: DARK_GREEN,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
  },

  copyButton: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginTop: 12,
  },

  copyButtonText: {
    color: WHITE,
    fontWeight: '700',
  },

  newPaymentButton: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },

  newPaymentButtonText: {
    color: DARK_GREEN,
    fontWeight: '700',
  },

  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 10,
  },

  securityIcon: {
    fontSize: 14,
    marginRight: 8,
  },

  securityText: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
  },
});
