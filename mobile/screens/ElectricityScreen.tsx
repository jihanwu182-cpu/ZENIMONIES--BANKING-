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

// ======================================================
// TYPES
// ======================================================

interface ElectricityProvider {
  id: string;
  name: string;
}

interface MeterCustomer {
  customerName: string;
  meterNumber: string;
  address?: string;
}

interface ElectricityPaymentResult {
  success?: boolean;
  status?: string;
  message?: string;
  reference?: string;
  provider_reference?: string;
  electricity_token?: string;
  token?: string;
  units?: string | number;
  customer_name?: string;
  customer_address?: string;
  meter_number?: string;
  meter_type?: string;
  provider?: string;
  httpStatus?: number;
  statusCode?: number;
  [key: string]: any;
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
  ) => Promise<ElectricityPaymentResult>;
}

// ======================================================
// ZENIMONIES BRAND COLORS
// ======================================================

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

// ======================================================
// PROVIDERS
// ======================================================

const providers: ElectricityProvider[] = [
  { id: 'IKEDC', name: 'Ikeja Electric' },
  { id: 'EKEDC', name: 'Eko Electric' },
  { id: 'AEDC', name: 'Abuja Electric' },
  { id: 'IBEDC', name: 'Ibadan Electric' },
  { id: 'KEDCO', name: 'Kano Electric' },
  { id: 'KAEDCO', name: 'Kaduna Electric' },
  { id: 'JED', name: 'Jos Electric' },
  { id: 'EEDC', name: 'Enugu Electric' },
  { id: 'PHEDC', name: 'Port Harcourt Electric' },
  { id: 'BEDC', name: 'Benin Electric' },
  { id: 'YEDC', name: 'Yola Electric' },
];

// ======================================================
// HELPERS
// ======================================================

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG')}`;

// ======================================================
// COMPONENT
// ======================================================

export default function ElectricityScreen({
  onValidate,
  onPay,
}: ElectricityScreenProps) {
  const [selectedProvider, setSelectedProvider] =
    useState('IKEDC');

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
    useState<ElectricityPaymentResult | null>(null);

  const [paymentStatus, setPaymentStatus] =
    useState<
      'completed' | 'pending' | 'failed' | null
    >(null);

  // ====================================================
  // PROVIDER
  // ====================================================

  const handleProviderChange = (
    provider: string,
  ) => {
    if (loadingPayment) return;

    setSelectedProvider(provider);
    setCustomer(null);
    setValidated(false);
    setPaymentResult(null);
    setPaymentStatus(null);
    setAmount('');
    setTransactionPin('');
  };

  // ====================================================
  // METER TYPE
  // ====================================================

  const handleMeterTypeChange = (
    type: 'prepaid' | 'postpaid',
  ) => {
    if (loadingPayment) return;

    setMeterType(type);
    setCustomer(null);
    setValidated(false);
    setPaymentResult(null);
    setPaymentStatus(null);
    setAmount('');
    setTransactionPin('');
  };

  // ====================================================
  // VALIDATE METER
  // ====================================================

  const handleValidateMeter = async () => {
    if (!meterNumber.trim()) {
      Alert.alert(
        'Meter Number Required',
        'Please enter your meter number.',
      );

      return;
    }

    if (!onValidate) {
      Alert.alert(
        'Not Connected',
        'Meter validation has not yet been connected to the backend.',
      );

      return;
    }

    try {
      setLoadingValidation(true);

      setCustomer(null);
      setValidated(false);
      setPaymentResult(null);
      setPaymentStatus(null);

      const result = await onValidate(
        selectedProvider,
        meterNumber.trim(),
        meterType,
      );

      setCustomer(result);
      setValidated(true);

      Alert.alert(
        'Meter Verified',
        `Customer: ${result.customerName}`,
      );
    } catch (error: any) {
      setCustomer(null);
      setValidated(false);

      Alert.alert(
        'Validation Failed',
        error?.message ||
          'Unable to validate meter number. Please check the number and try again.',
      );
    } finally {
      setLoadingValidation(false);
    }
  };

  // ====================================================
  // PAYMENT VALIDATION
  // ====================================================

  const handlePayment = () => {
    if (!validated || !customer) {
      Alert.alert(
        'Validate Meter',
        'Please validate your meter number first.',
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
        'Enter a valid payment amount.',
      );

      return;
    }

    if (paymentAmount < 500) {
      Alert.alert(
        'Minimum Amount',
        'The minimum electricity payment is ₦500.',
      );

      return;
    }

    if (paymentAmount > 1000000) {
      Alert.alert(
        'Maximum Amount',
        'The maximum electricity payment is ₦1,000,000.',
      );

      return;
    }

    if (
      !transactionPin ||
      transactionPin.length !== 4
    ) {
      Alert.alert(
        'Invalid PIN',
        'Enter your 4-digit transaction PIN.',
      );

      return;
    }

    if (!onPay) {
      Alert.alert(
        'Not Connected',
        'Electricity payment has not yet been connected to the backend.',
      );

      return;
    }

    const providerName =
      providers.find(
        provider =>
          provider.id === selectedProvider,
      )?.name || selectedProvider;

    Alert.alert(
      'Confirm Payment',
      `Provider: ${providerName}\n\nCustomer: ${customer.customerName}\n\nMeter Number: ${meterNumber}\n\nMeter Type: ${meterType.toUpperCase()}\n\nAmount: ${formatCurrency(paymentAmount)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Pay Now',
          onPress: executePayment,
        },
      ],
    );
  };

  // ====================================================
  // EXECUTE PAYMENT
  // ====================================================

  const executePayment = async () => {
    if (loadingPayment || !onPay) return;

    try {
      setLoadingPayment(true);

      setPaymentResult(null);
      setPaymentStatus(null);

      const result = await onPay(
        selectedProvider,
        meterNumber.trim(),
        meterType,
        Number(amount),
        transactionPin,
      );

      setPaymentResult(result);

      const status = String(
        result?.status || '',
      ).toLowerCase();

      const isPending =
        status === 'pending' ||
        status === 'processing' ||
        status === 'unknown' ||
        result?.httpStatus === 202 ||
        result?.statusCode === 202;

      // Pending takes priority over success.
      const isSuccessful =
        !isPending &&
        (
          result?.success === true ||
          status === 'completed' ||
          status === 'successful' ||
          status === 'success'
        );

      if (isPending) {
        setPaymentStatus('pending');

        Alert.alert(
          'Payment Processing',
          result?.message ||
            'Your electricity payment is being processed. Please do not make another payment for this meter until the current transaction is confirmed.',
        );

        return;
      }

      if (isSuccessful) {
        setPaymentStatus('completed');

        Alert.alert(
          'Payment Successful',
          result?.message ||
            'Your electricity payment was processed successfully.',
        );

        return;
      }

      setPaymentStatus('failed');

      Alert.alert(
        'Payment Failed',
        result?.message ||
          'The electricity payment could not be completed.',
      );
    } catch (error: any) {
      /*
       * A network error does not always mean that
       * the provider failed to receive the payment.
       */

      const status = String(
        error?.status ||
          error?.response?.status ||
          '',
      );

      const errorCode = String(
        error?.code || '',
      ).toUpperCase();

      const potentiallyAmbiguous =
        status === '202' ||
        status === '408' ||
        status === '504' ||
        errorCode === 'ECONNABORTED' ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ERR_NETWORK';

      if (potentiallyAmbiguous) {
        setPaymentStatus('pending');

        setPaymentResult({
          status: 'processing',
          message:
            'Your payment request may have been received. Please check your transaction history before attempting another payment.',
        });

        Alert.alert(
          'Payment Status Unconfirmed',
          'We could not confirm the payment status. Your request may still be processing. Please check your transaction history before trying again.',
        );
      } else {
        setPaymentStatus('failed');

        setPaymentResult({
          status: 'failed',
          message:
            error?.message ||
            'Your electricity payment could not be completed.',
        });

        Alert.alert(
          'Payment Failed',
          error?.message ||
            'Your electricity payment could not be completed.',
        );
      }
    } finally {
      setLoadingPayment(false);

      // Never retain the PIN after an attempt.
      setTransactionPin('');
      setShowPin(false);
    }
  };

  // ====================================================
  // RESET
  // ====================================================

  const resetForm = () => {
    if (loadingPayment) return;

    setMeterNumber('');
    setAmount('');
    setTransactionPin('');
    setCustomer(null);
    setValidated(false);
    setPaymentResult(null);
    setPaymentStatus(null);
    setShowPin(false);
  };

  // ====================================================
  // PAYMENT RESULT
  // ====================================================

  const electricityToken =
    paymentResult?.electricity_token ||
    paymentResult?.token ||
    null;

  const paymentCompleted =
    paymentStatus === 'completed';

  const paymentPending =
    paymentStatus === 'pending';

  const paymentFailed =
    paymentStatus === 'failed';

  // ====================================================
  // UI
  // ====================================================

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
                  disabled={loadingPayment}
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
              disabled={loadingPayment}
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
              disabled={loadingPayment}
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
            editable={!loadingPayment}
            onChangeText={value => {
              setMeterNumber(value);
              setCustomer(null);
              setValidated(false);
              setPaymentResult(null);
              setPaymentStatus(null);
              setAmount('');
              setTransactionPin('');
            }}
          />

          <TouchableOpacity
            style={styles.validateButton}
            onPress={handleValidateMeter}
            disabled={
              loadingValidation ||
              loadingPayment
            }
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

        {validated && !paymentResult && (
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
              editable={!loadingPayment}
              onChangeText={value => {
                setAmount(value);
                setPaymentResult(null);
                setPaymentStatus(null);
              }}
            />

            {/* QUICK AMOUNTS */}

            <View style={styles.quickAmounts}>
              {[1000, 2000, 5000, 10000].map(
                value => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.quickAmount,
                      amount === String(value) &&
                        styles.quickAmountSelected,
                    ]}
                    onPress={() => {
                      setAmount(String(value));
                      setPaymentResult(null);
                      setPaymentStatus(null);
                    }}
                    disabled={loadingPayment}
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
                ),
              )}
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
                editable={!loadingPayment}
                onChangeText={value =>
                  setTransactionPin(
                    value.replace(/\D/g, ''),
                  )
                }
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPin(!showPin)
                }
                disabled={loadingPayment}
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
            <View
              style={[
                styles.resultIcon,
                paymentPending &&
                  styles.pendingResultIcon,
                paymentFailed &&
                  styles.failedResultIcon,
              ]}
            >
              <Text
                style={[
                  styles.resultIconText,
                  paymentPending &&
                    styles.pendingResultIconText,
                  paymentFailed &&
                    styles.failedResultIconText,
                ]}
              >
                {paymentCompleted
                  ? '✓'
                  : paymentPending
                    ? '⏳'
                    : '✕'}
              </Text>
            </View>

            <Text
              style={[
                styles.resultTitle,
                paymentPending &&
                  styles.pendingResultTitle,
                paymentFailed &&
                  styles.failedResultTitle,
              ]}
            >
              {paymentCompleted
                ? 'Payment Successful'
                : paymentPending
                  ? 'Payment Processing'
                  : 'Payment Failed'}
            </Text>

            <Text style={styles.resultSubtitle}>
              {paymentResult.message ||
                (paymentCompleted
                  ? 'Your electricity payment was successful.'
                  : paymentPending
                    ? 'Your payment is being processed.'
                    : 'Your electricity payment could not be completed.')}
            </Text>

            {/* TRANSACTION REFERENCE */}

            {paymentResult.reference && (
              <>
                <Text style={styles.tokenLabel}>
                  Transaction Reference
                </Text>

                <View style={styles.tokenContainer}>
                  <Text style={styles.referenceText}>
                    {paymentResult.reference}
                  </Text>
                </View>
              </>
            )}

            {/* ELECTRICITY TOKEN */}

            {paymentCompleted &&
              electricityToken && (
                <>
                  <Text style={styles.tokenLabel}>
                    Electricity Token
                  </Text>

                  <View style={styles.tokenContainer}>
                    <Text style={styles.tokenText}>
                      {electricityToken}
                    </Text>
                  </View>

                  {paymentResult.units && (
                    <Text style={styles.unitsText}>
                      Units: {paymentResult.units}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                      Alert.alert(
                        'Electricity Token',
                        electricityToken,
                      );
                    }}
                  >
                    <Text style={styles.copyButtonText}>
                      View Token
                    </Text>
                  </TouchableOpacity>
                </>
              )}

            {/* PENDING WARNING */}

            {paymentPending && (
              <View style={styles.pendingNotice}>
                <Text style={styles.pendingNoticeText}>
                  Do not make another payment for this
                  meter until this transaction has been
                  confirmed.
                </Text>
              </View>
            )}

            {/* FAILED MESSAGE */}

            {paymentFailed && (
              <View style={styles.failedNotice}>
                <Text style={styles.failedNoticeText}>
                  If your wallet was debited, please
                  check your transaction history before
                  trying again.
                </Text>
              </View>
            )}

            {/* NEW PAYMENT */}

            {(paymentCompleted ||
              paymentFailed) && (
              <TouchableOpacity
                style={styles.newPaymentButton}
                onPress={resetForm}
              >
                <Text style={styles.newPaymentButtonText}>
                  Make Another Payment
                </Text>
              </TouchableOpacity>
            )}
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

// ======================================================
// STYLES — ZENIMONIES BRAND PALETTE ONLY
// ======================================================

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

  // HEADER

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
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    fontSize: 24,
  },

  // SECTION

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 14,
  },

  // PROVIDERS

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
    backgroundColor: BACKGROUND,
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

  // CARD

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

  // METER TYPE

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
    backgroundColor: BACKGROUND,
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

  // INPUT

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

  // VALIDATION

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

  // CUSTOMER

  customerCard: {
    backgroundColor: BACKGROUND,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER,
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

  // AMOUNT

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
    backgroundColor: BACKGROUND,
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

  // PIN

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

  // PAYMENT BUTTON

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

  // RESULT

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
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultIconText: {
    fontSize: 28,
    color: DARK_GREEN,
    fontWeight: '800',
  },

  pendingResultIcon: {
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
  },

  pendingResultIconText: {
    color: DARK_GREEN,
  },

  failedResultIcon: {
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
  },

  failedResultIconText: {
    color: DARK_GREEN,
  },

  resultTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 15,
  },

  pendingResultTitle: {
    color: DARK_GREEN,
  },

  failedResultTitle: {
    color: DARK_GREEN,
  },

  resultSubtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 7,
  },

  // TOKEN

  tokenLabel: {
    fontSize: 13,
    color: BLACK,
    fontWeight: '700',
    marginTop: 20,
  },

  tokenContainer: {
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
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

  referenceText: {
    fontSize: 13,
    color: DARK_GREEN,
    fontWeight: '700',
    textAlign: 'center',
  },

  unitsText: {
    fontSize: 14,
    color: DARK_GREEN,
    fontWeight: '700',
    marginTop: 10,
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

  // PENDING NOTICE

  pendingNotice: {
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
    width: '100%',
  },

  pendingNoticeText: {
    color: DARK_GREEN,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  // FAILED NOTICE

  failedNotice: {
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
    width: '100%',
  },

  failedNoticeText: {
    color: DARK_GREEN,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  // NEW PAYMENT

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

  // SECURITY

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
