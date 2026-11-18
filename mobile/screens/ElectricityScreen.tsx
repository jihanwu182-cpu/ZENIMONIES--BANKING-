
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ElectricityProvider {
  id: string;
  name: string;
  shortName: string;
}

interface MeterCustomer {
  name?: string;
  address?: string;
  meterNumber?: string;
  customerNumber?: string;
  customerType?: string;
  accountNumber?: string;
}

interface ElectricityPaymentResult {
  success?: boolean;
  status?: string;
  message?: string;
  reference?: string;
  providerReference?: string;
  token?: string;
  units?: string | number;
  customer?: MeterCustomer;
}

interface ElectricityScreenProps {
  onValidate?: (
    provider: string,
    meterNumber: string,
    meterType: 'prepaid' | 'postpaid',
  ) => Promise<MeterCustomer>;

  onPay?: (
    provider: string,
    meterNumber: string,
    meterType: 'prepaid' | 'postpaid',
    amount: number,
    transactionPin: string,
  ) => Promise<ElectricityPaymentResult>;
}

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

const PROVIDERS: ElectricityProvider[] = [
  { id: 'IKEDC', name: 'Ikeja Electric', shortName: 'IKEDC' },
  { id: 'EKEDC', name: 'Eko Electric', shortName: 'EKEDC' },
  { id: 'AEDC', name: 'Abuja Electric', shortName: 'AEDC' },
  { id: 'IBEDC', name: 'Ibadan Electric', shortName: 'IBEDC' },
  { id: 'KEDCO', name: 'Kano Electric', shortName: 'KEDCO' },
  { id: 'KAEDCO', name: 'Kaduna Electric', shortName: 'KAEDCO' },
  { id: 'JED', name: 'Jos Electric', shortName: 'JED' },
  { id: 'EEDC', name: 'Enugu Electric', shortName: 'EEDC' },
  { id: 'PHEDC', name: 'Port Harcourt Electric', shortName: 'PHEDC' },
  { id: 'BEDC', name: 'Benin Electric', shortName: 'BEDC' },
  { id: 'YEDC', name: 'Yola Electric', shortName: 'YEDC' },
];

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

const MIN_AMOUNT = 500;
const MAX_AMOUNT = 1000000;

type PaymentStatus =
  | 'idle'
  | 'validating'
  | 'verified'
  | 'paying'
  | 'success'
  | 'pending'
  | 'failed';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG')}`;

const isPendingResponse = (result: ElectricityPaymentResult) => {
  const status = String(result.status || '').toLowerCase();

  return (
    status === 'pending' ||
    status === 'processing' ||
    status === 'queued' ||
    status === 'unknown' ||
    status === 'initiated'
  );
};

const isSuccessfulResponse = (result: ElectricityPaymentResult) => {
  const status = String(result.status || '').toLowerCase();

  if (isPendingResponse(result)) {
    return false;
  }

  return (
    status === 'success' ||
    status === 'successful' ||
    status === 'completed' ||
    result.success === true
  );
};

const ElectricityScreen: React.FC<ElectricityScreenProps> = ({
  onValidate,
  onPay,
}) => {
  const [provider, setProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>(
    'prepaid',
  );

  const [amount, setAmount] = useState('');
  const [transactionPin, setTransactionPin] = useState('');

  const [customer, setCustomer] = useState<MeterCustomer | null>(null);
  const [paymentResult, setPaymentResult] =
    useState<ElectricityPaymentResult | null>(null);

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [loading, setLoading] = useState(false);

  const selectedProvider = PROVIDERS.find(
    item => item.id === provider,
  );

  const numericAmount = Number(amount.replace(/,/g, ''));

  const isAmountValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_AMOUNT &&
    numericAmount <= MAX_AMOUNT;

  const isMeterValid = meterNumber.trim().length >= 6;

  const isPinValid = /^\d{4}$/.test(transactionPin);

  const resetPayment = () => {
    setAmount('');
    setTransactionPin('');
    setPaymentResult(null);
    setStatus('verified');
  };

  const handleProviderSelect = (selectedProvider: string) => {
    setProvider(selectedProvider);
    setCustomer(null);
    setPaymentResult(null);
    setStatus('idle');
    setAmount('');
    setTransactionPin('');
  };

  const handleMeterTypeChange = (
    selectedType: 'prepaid' | 'postpaid',
  ) => {
    setMeterType(selectedType);
    setCustomer(null);
    setPaymentResult(null);
    setStatus('idle');
    setAmount('');
    setTransactionPin('');
  };

  const handleValidateMeter = async () => {
    if (!provider) {
      Alert.alert(
        'Select electricity provider',
        'Please select your electricity distribution company.',
      );
      return;
    }

    if (!isMeterValid) {
      Alert.alert(
        'Invalid meter number',
        'Please enter a valid meter number.',
      );
      return;
    }

    if (!onValidate) {
      Alert.alert(
        'Unavailable',
        'Meter validation is currently unavailable.',
      );
      return;
    }

    setLoading(true);
    setStatus('validating');
    setCustomer(null);
    setPaymentResult(null);

    try {
      const result = await onValidate(
        provider,
        meterNumber.trim(),
        meterType,
      );

      setCustomer(result);
      setStatus('verified');

      Alert.alert(
        'Meter verified',
        'Customer details have been successfully verified.',
      );
    } catch (error: any) {
      setStatus('failed');

      Alert.alert(
        'Verification failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to verify this meter number. Please check the details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!customer) {
      Alert.alert(
        'Verify meter first',
        'Please verify your meter number before continuing.',
      );
      return;
    }

    if (!isAmountValid) {
      Alert.alert(
        'Invalid amount',
        `Enter an amount between ${formatCurrency(
          MIN_AMOUNT,
        )} and ${formatCurrency(MAX_AMOUNT)}.`,
      );
      return;
    }

    if (!isPinValid) {
      Alert.alert(
        'Invalid transaction PIN',
        'Your transaction PIN must be exactly 4 digits.',
      );
      return;
    }

    if (!onPay) {
      Alert.alert(
        'Unavailable',
        'Electricity payment is currently unavailable.',
      );
      return;
    }

    Alert.alert(
      'Confirm electricity payment',
      `Provider: ${selectedProvider?.name}\n\nMeter Number: ${meterNumber}\n\nMeter Type: ${meterType.toUpperCase()}\n\nAmount: ${formatCurrency(
        numericAmount,
      )}\n\nDo you want to continue?`,
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

  const executePayment = async () => {
    setLoading(true);
    setStatus('paying');
    setPaymentResult(null);

    const submittedPin = transactionPin;

    // Clear the PIN immediately after submitting.
    setTransactionPin('');

    try {
      const result = await onPay!(
        provider,
        meterNumber.trim(),
        meterType,
        numericAmount,
        submittedPin,
      );

      setPaymentResult(result);

      // Pending/processing must take precedence over success:true.
      if (isPendingResponse(result)) {
        setStatus('pending');

        Alert.alert(
          'Payment processing',
          'Your electricity payment is being processed. Do not make another payment yet. Check your transaction history for the final status.',
        );

        return;
      }

      if (isSuccessfulResponse(result)) {
        setStatus('success');

        Alert.alert(
          'Payment successful',
          meterType === 'prepaid' && result.token
            ? `Your electricity payment was successful.\n\nToken: ${result.token}`
            : 'Your electricity payment was successful.',
        );

        return;
      }

      setStatus('failed');

      Alert.alert(
        'Payment unsuccessful',
        result.message ||
          'The payment could not be completed. Check your transaction history before attempting another payment.',
      );
    } catch (error: any) {
      /*
       * A network failure may happen after the backend/provider
       * receives the payment request. Never assume the payment failed.
       */
      setStatus('pending');

      Alert.alert(
        'Payment status unknown',
        'We could not confirm the payment status because of a connection issue. Your request may still have been processed. Please check your transaction history before trying again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewPayment = () => {
    setProvider('');
    setMeterNumber('');
    setMeterType('prepaid');
    setCustomer(null);
    setAmount('');
    setTransactionPin('');
    setPaymentResult(null);
    setStatus('idle');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>⚡</Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Electricity</Text>
            <Text style={styles.subtitle}>
              Pay your electricity bill securely
            </Text>
          </View>
        </View>

        {/* PROVIDER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Electricity Provider
          </Text>

          <View style={styles.providerGrid}>
            {PROVIDERS.map(item => {
              const selected = provider === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.providerCard,
                    selected && styles.providerCardSelected,
                  ]}
                  onPress={() => handleProviderSelect(item.id)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.providerIcon,
                      selected && styles.providerIconSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.providerIconText,
                        selected && styles.providerIconTextSelected,
                      ]}
                    >
                      ⚡
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.providerName,
                      selected && styles.providerNameSelected,
                    ]}
                  >
                    {item.shortName}
                  </Text>

                  <Text
                    style={[
                      styles.providerFullName,
                      selected && styles.providerFullNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>

                  {selected && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* METER TYPE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meter Type</Text>

          <View style={styles.meterTypeContainer}>
            <TouchableOpacity
              style={[
                styles.meterTypeButton,
                meterType === 'prepaid' &&
                  styles.meterTypeButtonSelected,
              ]}
              onPress={() => handleMeterTypeChange('prepaid')}
              disabled={loading}
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
                  styles.meterTypeButtonSelected,
              ]}
              onPress={() => handleMeterTypeChange('postpaid')}
              disabled={loading}
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
                Pay electricity bill
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* METER NUMBER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meter Number</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter meter number"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={meterNumber}
            onChangeText={value => {
              setMeterNumber(value.replace(/\D/g, ''));
              setCustomer(null);
              setPaymentResult(null);
              setStatus('idle');
            }}
            editable={!loading}
            maxLength={20}
          />

          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!provider || !isMeterValid || loading) &&
                styles.disabledButton,
            ]}
            onPress={handleValidateMeter}
            disabled={!provider || !isMeterValid || loading}
            activeOpacity={0.8}
          >
            {status === 'validating' ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.verifyButtonText}>
                Verify Meter
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* VERIFIED CUSTOMER */}
        {customer && (
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerCheck}>
                <Text style={styles.customerCheckText}>✓</Text>
              </View>

              <Text style={styles.customerHeaderText}>
                Customer Verified
              </Text>
            </View>

            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Customer Name</Text>
              <Text style={styles.customerValue}>
                {customer.name || 'Verified Customer'}
              </Text>
            </View>

            {customer.address ? (
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Address</Text>
                <Text style={styles.customerValue}>
                  {customer.address}
                </Text>
              </View>
            ) : null}

            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Meter Number</Text>
              <Text style={styles.customerValue}>
                {meterNumber}
              </Text>
            </View>

            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Meter Type</Text>
              <Text style={styles.customerValue}>
                {meterType.toUpperCase()}
              </Text>
            </View>

            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>Provider</Text>
              <Text style={styles.customerValue}>
                {selectedProvider?.name}
              </Text>
            </View>
          </View>
        )}

        {/* AMOUNT */}
        {customer && status !== 'success' && status !== 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount</Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₦</Text>

              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                value={amount}
                onChangeText={value => {
                  setAmount(value.replace(/\D/g, ''));
                  setPaymentResult(null);
                }}
                editable={!loading}
              />
            </View>

            <Text style={styles.amountHint}>
              Minimum: {formatCurrency(MIN_AMOUNT)}
            </Text>

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickAmountButton,
                    amount === String(value) &&
                      styles.quickAmountButtonSelected,
                  ]}
                  onPress={() => setAmount(String(value))}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === String(value) &&
                        styles.quickAmountTextSelected,
                    ]}
                  >
                    {formatCurrency(value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* TRANSACTION PIN */}
        {customer && status !== 'success' && status !== 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Transaction PIN
            </Text>

            <TextInput
              style={styles.pinInput}
              placeholder="Enter 4-digit PIN"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              secureTextEntry
              value={transactionPin}
              onChangeText={value =>
                setTransactionPin(value.replace(/\D/g, '').slice(0, 4))
              }
              maxLength={4}
              editable={!loading}
            />

            <Text style={styles.pinHint}>
              Your transaction PIN is required to authorize this payment.
            </Text>
          </View>
        )}

        {/* PAYMENT BUTTON */}
        {customer && status !== 'success' && status !== 'pending' && (
          <TouchableOpacity
            style={[
              styles.payButton,
              (!isAmountValid || !isPinValid || loading) &&
                styles.disabledButton,
            ]}
            onPress={handlePay}
            disabled={!isAmountValid || !isPinValid || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.payButtonText}>
                Pay {isAmountValid ? formatCurrency(numericAmount) : ''}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* SUCCESS */}
        {status === 'success' && paymentResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultIcon}>
              <Text style={styles.resultIconText}>✓</Text>
            </View>

            <Text style={styles.resultTitle}>
              Payment Successful
            </Text>

            <Text style={styles.resultDescription}>
              Your electricity payment has been completed successfully.
            </Text>

            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Amount</Text>
                <Text style={styles.resultValue}>
                  {formatCurrency(numericAmount)}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Provider</Text>
                <Text style={styles.resultValue}>
                  {selectedProvider?.name}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Meter Number</Text>
                <Text style={styles.resultValue}>
                  {meterNumber}
                </Text>
              </View>

              {paymentResult.reference && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Reference</Text>
                  <Text style={styles.resultValue}>
                    {paymentResult.reference}
                  </Text>
                </View>
              )}

              {paymentResult.units !== undefined && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Units</Text>
                  <Text style={styles.resultValue}>
                    {paymentResult.units}
                  </Text>
                </View>
              )}
            </View>

            {meterType === 'prepaid' && paymentResult.token && (
              <View style={styles.tokenContainer}>
                <Text style={styles.tokenTitle}>
                  Electricity Token
                </Text>

                <Text style={styles.tokenValue}>
                  {paymentResult.token}
                </Text>

                <Text style={styles.tokenHint}>
                  Enter this token on your electricity meter.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.newPaymentButton}
              onPress={handleNewPayment}
            >
              <Text style={styles.newPaymentButtonText}>
                Make Another Payment
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PENDING */}
        {status === 'pending' && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Text style={styles.pendingIconText}>⏳</Text>
            </View>

            <Text style={styles.pendingTitle}>
              Payment Processing
            </Text>

            <Text style={styles.pendingDescription}>
              Your electricity payment has been submitted, but the
              final status has not yet been confirmed.
            </Text>

            <View style={styles.pendingNotice}>
              <Text style={styles.pendingNoticeText}>
                Do not make another payment yet. Check your transaction
                history for the final status before retrying.
              </Text>
            </View>

            {paymentResult?.reference && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Reference</Text>
                <Text style={styles.resultValue}>
                  {paymentResult.reference}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.newPaymentButton}
              onPress={handleNewPayment}
            >
              <Text style={styles.newPaymentButtonText}>
                Return
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FAILED */}
        {status === 'failed' && !customer && (
          <View style={styles.failedNotice}>
            <Text style={styles.failedNoticeTitle}>
              Verification unsuccessful
            </Text>

            <Text style={styles.failedNoticeText}>
              Please check your meter number and selected provider.
            </Text>
          </View>
        )}

        {/* SECURITY FOOTER */}
        <View style={styles.securityFooter}>
          <Text style={styles.securityIcon}>🔒</Text>

          <Text style={styles.securityText}>
            Your payment is protected by ZENIMONIES security.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerIconText: {
    fontSize: 25,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: BLACK,
  },

  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 12,
  },

  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  providerCard: {
    width: '31.5%',
    minHeight: 105,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  providerCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: BACKGROUND,
  },

  providerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  providerIconSelected: {
    backgroundColor: WHITE,
  },

  providerIconText: {
    fontSize: 17,
  },

  providerIconTextSelected: {
    color: GREEN,
  },

  providerName: {
    fontSize: 11,
    fontWeight: '800',
    color: BLACK,
    textAlign: 'center',
  },

  providerNameSelected: {
    color: DARK_GREEN,
  },

  providerFullName: {
    fontSize: 9,
    color: MUTED,
    textAlign: 'center',
    marginTop: 3,
  },

  providerFullNameSelected: {
    color: DARK_GREEN,
  },

  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedIndicatorText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '800',
  },

  meterTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  meterTypeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },

  meterTypeButtonSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: BACKGROUND,
  },

  meterTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 5,
  },

  meterTypeTitleSelected: {
    color: DARK_GREEN,
  },

  meterTypeDescription: {
    fontSize: 11,
    color: MUTED,
  },

  meterTypeDescriptionSelected: {
    color: DARK_GREEN,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: WHITE,
    fontSize: 15,
    color: BLACK,
  },

  verifyButton: {
    height: 50,
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  verifyButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.5,
  },

  customerCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  customerCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  customerCheckText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '800',
  },

  customerHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK_GREEN,
  },

  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  customerLabel: {
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },

  customerValue: {
    fontSize: 12,
    color: BLACK,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },

  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    height: 62,
    paddingHorizontal: 16,
  },

  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK_GREEN,
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: BLACK,
  },

  amountHint: {
    fontSize: 11,
    color: MUTED,
    marginTop: 8,
  },

  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  quickAmountButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
  },

  quickAmountButtonSelected: {
    borderColor: GREEN,
    backgroundColor: BACKGROUND,
  },

  quickAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: BLACK,
  },

  quickAmountTextSelected: {
    color: DARK_GREEN,
  },

  pinInput: {
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: '800',
    color: BLACK,
  },

  pinHint: {
    fontSize: 11,
    color: MUTED,
    marginTop: 8,
    lineHeight: 17,
  },

  payButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  payButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },

  resultCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },

  resultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  resultIconText: {
    color: WHITE,
    fontSize: 30,
    fontWeight: '800',
  },

  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 8,
  },

  resultDescription: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },

  resultDetails: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginBottom: 16,
  },

  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  resultLabel: {
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },

  resultValue: {
    fontSize: 12,
    fontWeight: '700',
    color: BLACK,
    flex: 1,
    textAlign: 'right',
  },

  tokenContainer: {
    width: '100%',
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },

  tokenTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 10,
  },

  tokenValue: {
    fontSize: 20,
    fontWeight: '900',
    color: BLACK,
    textAlign: 'center',
    letterSpacing: 2,
  },

  tokenHint: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginTop: 10,
  },

  newPaymentButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  newPaymentButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '800',
  },

  pendingCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },

  pendingIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  pendingIconText: {
    fontSize: 25,
  },

  pendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK_GREEN,
    marginBottom: 8,
  },

  pendingDescription: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },

  pendingNotice: {
    backgroundColor: BACKGROUND,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
  },

  pendingNoticeText: {
    color: DARK_GREEN,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  failedNotice: {
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },

  failedNoticeTitle: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },

  failedNoticeText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },

  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 14,
  },

  securityIcon: {
    fontSize: 14,
    marginRight: 8,
  },

  securityText: {
    fontSize: 11,
    color: MUTED,
  },
});

export default ElectricityScreen;
