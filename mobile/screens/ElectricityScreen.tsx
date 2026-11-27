import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Image,
  Modal,
  Platform,
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
  customerName?: string;
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
  electricity_token?: string;
  units?: string | number;
  customer?: MeterCustomer;
  refunded?: boolean;
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

  onRequery?: (
    reference: string,
  ) => Promise<ElectricityPaymentResult>;
}

const GREEN = '#00843D';
const DARK_GREEN = '#006B32';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

const PROVIDERS: ElectricityProvider[] = [
  {id: 'APLE', name: 'Aba Electricity', shortName: 'APLE'},
  {id: 'AEDC', name: 'Abuja Electricity', shortName: 'AEDC'},
  {id: 'BEDC', name: 'Benin Electricity', shortName: 'BEDC'},
  {id: 'EKEDC', name: 'Eko Electricity', shortName: 'EKEDC'},
  {id: 'EEDC', name: 'Enugu Electricity', shortName: 'EEDC'},
  {id: 'IBEDC', name: 'Ibadan Electricity', shortName: 'IBEDC'},
  {id: 'IKEDC', name: 'Ikeja Electricity', shortName: 'IKEDC'},
  {id: 'JED', name: 'Jos Electricity', shortName: 'JED'},
  {id: 'KAEDCO', name: 'Kaduna Electricity', shortName: 'KAEDCO'},
  {id: 'KEDCO', name: 'Kano Electricity', shortName: 'KEDCO'},
  {id: 'PHEDC', name: 'Port Harcourt Electricity', shortName: 'PHEDC'},
  {id: 'YEDC', name: 'Yola Electricity', shortName: 'YEDC'},
];

// Local electricity provider logos in mobile/assets/electricity.
const PROVIDER_LOGOS: Record<string, number> = {
  APLE: require('../assets/electricity/aple.jpg'),
  AEDC: require('../assets/electricity/aedc.jpg'),
  BEDC: require('../assets/electricity/bedc.jpg'),
  EKEDC: require('../assets/electricity/ekedc.jpg'),
  EEDC: require('../assets/electricity/eedc.jpg'),
  IBEDC: require('../assets/electricity/ibedc.jpg'),
  IKEDC: require('../assets/electricity/ikeja.jpg'),
  JED: require('../assets/electricity/jed.jpg'),
  KAEDCO: require('../assets/electricity/kaedco.jpg'),
  KEDCO: require('../assets/electricity/kedco.jpg'),
  PHEDC: require('../assets/electricity/phedc.jpg'),
  YEDC: require('../assets/electricity/yedc.jpg'),
};

const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 2000];
const MIN_AMOUNT = 100;
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

// Providers may return token values such as:
// "Token: 123456", "Token : token: 123456", or " 123456 ".
// Remove repeated display labels without changing the actual token.
const normalizeElectricityToken = (
  value?: string | null,
): string => {
  if (!value) return '';

  return String(value)
    .trim()
    .replace(/^(?:token\s*[:#-]?\s*)+/i, '')
    .trim();
};

const isPendingResponse = (result: ElectricityPaymentResult) => {
  const value = String(result.status || '').toLowerCase();

  return [
    'pending',
    'processing',
    'queued',
    'unknown',
    'initiated',
    'reconciliation_required',
  ].includes(value);
};

const isSuccessfulResponse = (result: ElectricityPaymentResult) => {
  const value = String(result.status || '').toLowerCase();

  return (
    result.success === true &&
    ['success', 'successful', 'completed'].includes(value)
  );
};

const ElectricityScreen: React.FC<ElectricityScreenProps> = ({
  onValidate,
  onPay,
  onRequery,
}) => {
  const [provider, setProvider] = useState('');
  const [showProviders, setShowProviders] = useState(false);
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] =
    useState<'prepaid' | 'postpaid'>('prepaid');
  const [amount, setAmount] = useState('');
  const [transactionPin, setTransactionPin] = useState('');

  const [customer, setCustomer] =
    useState<MeterCustomer | null>(null);

  const [paymentResult, setPaymentResult] =
    useState<ElectricityPaymentResult | null>(null);

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [requeryLoading, setRequeryLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);

  const pinInputRef =
    useRef<React.ElementRef<typeof TextInput>>(null);

 const requeryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const requeryInFlightRef = useRef(false); 

  const tokenRecoveryTimerRef =
  useRef<ReturnType<typeof setTimeout> | null>(null);

const tokenRecoveryAttemptsRef = useRef(0);
  
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

  const customerName =
    customer?.name ||
    customer?.customerName ||
    'Verified Customer';

const displayToken = normalizeElectricityToken(
  paymentResult?.token ||
  paymentResult?.electricity_token,
);
  
  const resetVerification = () => {
    setCustomer(null);
    setPaymentResult(null);
    setShowConfirmation(false);
    setPinVisible(false);
    setTransactionPin('');
    setStatus('idle');
  };

  const handleProviderSelect = (value: string) => {
    setProvider(value);
    setShowProviders(false);
    resetVerification();
  };

  const handleMeterNumberChange = (value: string) => {
    setMeterNumber(value.replace(/\D/g, '').slice(0, 20));
    resetVerification();
  };

  const handleMeterTypeChange = (
    value: 'prepaid' | 'postpaid',
  ) => {
    setMeterType(value);
    resetVerification();
  };

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/\D/g, ''));
    resetVerification();
  };

  const handleContinue = async () => {
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

    if (!isAmountValid) {
      Alert.alert(
        'Invalid amount',
        `Enter an amount between ${formatCurrency(
          MIN_AMOUNT,
        )} and ${formatCurrency(MAX_AMOUNT)}.`,
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
    setShowConfirmation(false);

    try {
      const result = await onValidate(
        provider,
        meterNumber.trim(),
        meterType,
      );

      if (!result || !(result.name || result.customerName)) {
        throw new Error(
          'The provider did not return a verified customer name. Please try again.',
        );
      }

      setCustomer(result);
      setStatus('verified');

      Alert.alert(
        'Meter verified',
        'Customer details have been successfully verified. Please review your details before payment.',
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

  const openPinScreen = () => {
    if (!customer || !isAmountValid) return;

    if (!onPay) {
      Alert.alert(
        'Unavailable',
        'Electricity payment is currently unavailable.',
      );
      return;
    }

    setTransactionPin('');
    setPinVisible(true);
  };

  const executePayment = async () => {
  if (!onPay || !customer || !isPinValid || loading) return;

  if (!isAmountValid) {
    Alert.alert(
      'Invalid amount',
      `The minimum electricity purchase is ${formatCurrency(MIN_AMOUNT)}.`,
    );
    return;
  }

  const submittedPin = transactionPin;
    setPinVisible(false);
    setTransactionPin('');
    setLoading(true);
    setStatus('paying');
    setPaymentResult(null);

    try {
      const result = await onPay(
        provider,
        meterNumber.trim(),
        meterType,
        numericAmount,
        submittedPin,
      );

      setPaymentResult(result);

      if (isPendingResponse(result)) {
        setStatus('pending');
        return;
      }

      if (isSuccessfulResponse(result)) {
        setStatus('success');
        return;
      }

      setStatus('failed');

      Alert.alert(
        'Payment unsuccessful',
        result.message ||
          'The payment could not be confirmed as successful. Check your transaction history before trying again.',
      );
    } catch (error: any) {
      // A connection error does not prove that the provider failed.
      // Keep the transaction pending to prevent an unsafe retry.
      setStatus('pending');
      setPaymentResult({
        status: 'pending',
        message:
          'The payment response could not be confirmed. Please check the transaction status before attempting another payment.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Checks the existing transaction reference only.
  // This function never calls the electricity purchase endpoint.
  const handleRequery = async (silent = false) => {
    const reference = paymentResult?.reference;

    if (!reference || !onRequery || requeryInFlightRef.current) {
      if (!silent) {
        Alert.alert(
          'Reference unavailable',
          'The original payment reference is missing. Please check your transaction history.',
        );
      }
      return;
    }

    requeryInFlightRef.current = true;

    if (!silent) {
      setRequeryLoading(true);
    }

    try {
      const result = await onRequery(reference);

      const recoveredToken =
  result.token ||
  result.electricity_token ||
  paymentResult?.token ||
  paymentResult?.electricity_token ||
  '';

const updatedResult: ElectricityPaymentResult = {
  ...paymentResult,
  ...result,
  token: recoveredToken,
  electricity_token: recoveredToken,
  reference: result.reference || reference,
};

      setPaymentResult(updatedResult);

      const resultStatus = String(
        updatedResult.status || '',
      ).toLowerCase();

      if (
        updatedResult.success === true ||
        ['success', 'successful', 'completed'].includes(resultStatus)
      ) {
        setStatus('success');

        if (!silent) {
          Alert.alert(
            'Payment Confirmed',
            'The electricity provider has confirmed your payment.',
          );
        }
        return;
      }

      if (
        ['failed', 'refunded'].includes(resultStatus) ||
        updatedResult.refunded === true
      ) {
        setStatus('failed');

        if (!silent) {
          Alert.alert(
            'Payment Failed',
            updatedResult.refunded
              ? 'The provider confirmed that the payment failed. Your wallet refund has been processed.'
              : updatedResult.message ||
                  'The provider confirmed that this payment failed.',
          );
        }
        return;
      }

      setStatus('pending');

      if (!silent) {
        Alert.alert(
          'Still Processing',
          updatedResult.message ||
            'The provider has not confirmed the final payment status yet. Do not make another payment.',
        );
      }
    } catch (error: any) {
      setStatus('pending');

      if (!silent) {
        Alert.alert(
          'Status Check Unavailable',
          error?.message ||
            'We could not retrieve the payment status. Your transaction remains pending.',
        );
      }
    } finally {
      requeryInFlightRef.current = false;

      if (!silent) {
        setRequeryLoading(false);
      }
    }
  };

 
  // Automatically reconcile pending payments and recover
  // missing prepaid electricity tokens.
  useEffect(() => {
    const reference = paymentResult?.reference;

    if (!reference || !onRequery) {
      return;
    }

    // A confirmed token needs no further recovery.
    if (status === 'success' && displayToken) {
      tokenRecoveryAttemptsRef.current = 0;

      if (tokenRecoveryTimerRef.current) {
        clearTimeout(tokenRecoveryTimerRef.current);
        tokenRecoveryTimerRef.current = null;
      }

      return;
    }

    // Pending payments retain their existing status checks.
    if (status === 'pending') {
      const timer = setTimeout(() => {
        void handleRequery(true);
      }, 5000);

      return () => clearTimeout(timer);
    }

    // Completed prepaid payments with missing tokens
    // receive controlled automatic recovery attempts.
    if (
      status === 'success' &&
      meterType === 'prepaid' &&
      !displayToken &&
      tokenRecoveryAttemptsRef.current < 3
    ) {
     const delays = [5000, 10000, 15000];

      const attempt =
        tokenRecoveryAttemptsRef.current;

      tokenRecoveryTimerRef.current = setTimeout(() => {
        tokenRecoveryAttemptsRef.current += 1;
        void handleRequery(true);
      }, delays[attempt]);

      return () => {
        if (tokenRecoveryTimerRef.current) {
          clearTimeout(tokenRecoveryTimerRef.current);
          tokenRecoveryTimerRef.current = null;
        }
      };
    }

    return () => {
      if (tokenRecoveryTimerRef.current) {
        clearTimeout(tokenRecoveryTimerRef.current);
        tokenRecoveryTimerRef.current = null;
      }
    };
  }, [
    status,
    paymentResult,
    displayToken,
    meterType,
    onRequery,
  ]);

  // Clean up recovery timers when the screen unmounts.
  useEffect(() => {
    return () => {
      if (tokenRecoveryTimerRef.current) {
        clearTimeout(tokenRecoveryTimerRef.current);
      }

      if (requeryTimerRef.current) {
        clearInterval(requeryTimerRef.current);
      }
    };
  }, []);

   const handleNewPayment = () => {
    setProvider('');
    setShowProviders(false);
    setMeterNumber('');
    setMeterType('prepaid');
    setAmount('');
    setTransactionPin('');
    setCustomer(null);
    tokenRecoveryAttemptsRef.current = 0;
    setPaymentResult(null);
    setShowConfirmation(false);
    setPinVisible(false);
    setStatus('idle');
  };

  const renderProviderDropdown = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Select Service Provider
      </Text>

      <TouchableOpacity
        style={styles.providerDropdown}
        onPress={() => setShowProviders(value => !value)}
        disabled={loading || !!customer}
        activeOpacity={0.8}
      >
        <View style={styles.providerDropdownLeft}>
          {selectedProvider ? (
            <Image
              source={PROVIDER_LOGOS[selectedProvider.id]}
              style={styles.providerDropdownLogo}
              resizeMode="contain"
            />
          ) : null}

          <View style={styles.providerDropdownText}>
            <Text
              style={[
                styles.providerDropdownName,
                !selectedProvider && styles.placeholderText,
              ]}
            >
              {selectedProvider?.name ||
                'Choose electricity provider'}
            </Text>

            <Text style={styles.providerDropdownSub}>
              {selectedProvider?.shortName ||
                'Select your distribution company'}
            </Text>
          </View>
        </View>

        <Text style={styles.dropdownArrow}>
          {showProviders ? '⌃' : '⌄'}
        </Text>
      </TouchableOpacity>

      {showProviders && (
        <View style={styles.providerList}>
          {PROVIDERS.map(item => {
            const selected = provider === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.providerOption,
                  selected && styles.providerOptionSelected,
                ]}
                onPress={() => handleProviderSelect(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.providerLogoPlaceholder}>
                  <Image
                    source={PROVIDER_LOGOS[item.id]}
                    style={styles.providerLogoImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.providerOptionDetails}>
                  <Text
                    style={[
                      styles.providerOptionName,
                      selected &&
                        styles.providerOptionNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.providerOptionCode}>
                    {item.shortName}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderMeterType = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meter Type</Text>

      <View style={styles.meterTypeContainer}>
        {(['prepaid', 'postpaid'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.meterTypeButton,
              meterType === type &&
                styles.meterTypeButtonSelected,
            ]}
            onPress={() => handleMeterTypeChange(type)}
            disabled={loading || !!customer}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.meterTypeTitle,
                meterType === type &&
                  styles.meterTypeTitleSelected,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAmount = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Amount</Text>

        <View style={styles.quickAmounts}>
          {QUICK_AMOUNTS.map(value => (
            <TouchableOpacity
              key={value}
              style={[
                styles.quickAmountButton,
                amount === String(value) &&
                  styles.quickAmountButtonSelected,
              ]}
              onPress={() => handleAmountChange(String(value))}
              disabled={loading || !!customer}
              activeOpacity={0.8}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Amount</Text>

        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₦</Text>

          <TextInput
            style={styles.amountInput}
            placeholder="Enter amount"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={amount}
            onChangeText={handleAmountChange}
            editable={!loading && !customer}
          />
        </View>

        <Text style={styles.amountHint}>
          Minimum: {formatCurrency(MIN_AMOUNT)}
        </Text>
      </View>
    </>
  );

  const renderCustomerDetails = () => (
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
          {customerName}
        </Text>
      </View>

      {customer?.address ? (
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

      <View style={styles.customerRow}>
        <Text style={styles.customerLabel}>Amount</Text>
        <Text style={styles.customerValue}>
          {formatCurrency(numericAmount)}
        </Text>
      </View>
    </View>
  );

  const renderConfirmation = () => (
    <View style={styles.confirmationCard}>
      <View style={styles.confirmationIcon}>
        <Text style={styles.confirmationIconText}>⚡</Text>
      </View>

      <Text style={styles.confirmationTitle}>
        Confirm Electricity Payment
      </Text>

      <Text style={styles.confirmationSubtitle}>
        Review your payment details carefully before proceeding.
      </Text>

      <View style={styles.confirmationDetails}>
        {[
          ['Service Provider', selectedProvider?.name || provider],
          ['Customer Name', customerName],
          ['Meter Number', meterNumber],
          ['Meter Type', meterType.toUpperCase()],
        ].map(([label, value]) => (
          <View key={label} style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>
              {label}
            </Text>
            <Text style={styles.confirmationValue}>
              {value}
            </Text>
          </View>
        ))}

        {customer?.address ? (
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Address</Text>
            <Text style={styles.confirmationValue}>
              {customer.address}
            </Text>
          </View>
        ) : null}

        <View style={styles.confirmationAmountRow}>
          <Text style={styles.confirmationAmountLabel}>
            Payment Amount
          </Text>
          <Text style={styles.confirmationAmount}>
            {formatCurrency(numericAmount)}
          </Text>
        </View>
      </View>

      <View style={styles.confirmationSecurity}>
        <Text style={styles.confirmationSecurityIcon}>🔒</Text>
        <Text style={styles.confirmationSecurityText}>
          Your transaction PIN is required to authorize this payment.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.payButton}
        onPress={openPinScreen}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.payButtonText}>
          Continue to PIN
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelConfirmationButton}
        onPress={() => setShowConfirmation(false)}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelConfirmationText}>
          Back to Details
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
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

        {paymentResult?.reference ? (
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Reference</Text>
            <Text style={styles.resultValue}>
              {paymentResult.reference}
            </Text>
          </View>
        ) : null}
      </View>

      {meterType === 'prepaid' ? (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenTitle}>
            ELECTRICITY TOKEN
          </Text>

          {displayToken ? (
            <>
              <Text selectable style={styles.tokenValue}>
                {displayToken}
              </Text>

              {paymentResult?.units ? (
                <Text style={styles.tokenHint}>
                  Units: {paymentResult.units}
                </Text>
              ) : null}

              <Text style={styles.tokenHint}>
                Keep this token safe and enter it into your meter.
              </Text>
            </>
          ) : (
            <Text style={styles.tokenHint}>
              Your payment was confirmed, but the provider did not return an electricity token. Please check your transaction history or contact support before making another payment.
            </Text>
          )}
        </View>
      ) : null}

     {(meterType !== 'prepaid' || !!displayToken) && (
        <TouchableOpacity
          style={styles.newPaymentButton}
          onPress={handleNewPayment}
          activeOpacity={0.8}
        >
          <Text style={styles.newPaymentButtonText}>
            Make Another Payment
          </Text>
        </TouchableOpacity>
      )}
  );

  const renderPending = () => (
    <View style={styles.pendingCard}>
      <View style={styles.pendingIcon}>
        <Text style={styles.pendingIconText}>⏳</Text>
      </View>

      <Text style={styles.pendingTitle}>
        Payment Processing
      </Text>

      <Text style={styles.pendingDescription}>
        Your electricity payment has been submitted, but the final status has not yet been confirmed.
      </Text>

      <View style={styles.pendingNotice}>
        <Text style={styles.pendingNoticeText}>
          Do not make another payment yet. Check the status of this original transaction before attempting another payment.
        </Text>
      </View>

      {paymentResult?.reference ? (
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Reference</Text>
          <Text style={styles.resultValue}>
            {paymentResult.reference}
          </Text>
        </View>
      ) : null}

      {onRequery && paymentResult?.reference ? (
        <TouchableOpacity
          style={[
            styles.newPaymentButton,
            styles.requeryButton,
            requeryLoading && styles.disabledButton,
          ]}
          onPress={() => handleRequery()}
          disabled={requeryLoading}
          activeOpacity={0.8}
        >
          {requeryLoading ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.newPaymentButtonText}>
              Check Payment Status
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.noRequeryText}>
          Payment status checking is currently unavailable. Please check your transaction history.
        </Text>
      )}

      <TouchableOpacity
        style={styles.cancelConfirmationButton}
        onPress={() => {
          Alert.alert(
            'Payment Still Pending',
            'This transaction has not been confirmed. Please do not start another electricity payment until its status is resolved.',
          );
        }}
        disabled={requeryLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelConfirmationText}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFailed = () => (
    <View style={styles.pendingCard}>
      <View style={styles.failedIcon}>
        <Text style={styles.failedIconText}>!</Text>
      </View>

      <Text style={styles.failedResultTitle}>
        Payment Failed
      </Text>

      <Text style={styles.pendingDescription}>
        {paymentResult?.message ||
          'The electricity provider confirmed that this payment was unsuccessful.'}
      </Text>

      {paymentResult?.refunded ? (
        <View style={styles.pendingNotice}>
          <Text style={styles.pendingNoticeText}>
            Your wallet refund has been confirmed by the payment system. Check your wallet transaction history for the refund entry.
          </Text>
        </View>
      ) : (
        <View style={styles.pendingNotice}>
          <Text style={styles.pendingNoticeText}>
            Please check your wallet and transaction history before making another payment.
          </Text>
        </View>
      )}

      {paymentResult?.reference ? (
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Reference</Text>
          <Text style={styles.resultValue}>
            {paymentResult.reference}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.newPaymentButton}
        onPress={handleNewPayment}
        activeOpacity={0.8}
      >
        <Text style={styles.newPaymentButtonText}>
          Done
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>⚡</Text>
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Electricity</Text>
              <Text style={styles.subtitle}>
                {showConfirmation
                  ? 'Review and authorize your payment'
                  : 'Pay your electricity bill securely'}
              </Text>
            </View>
          </View>

          {status !== 'success' &&
            status !== 'pending' &&
            status !== 'failed' &&
            !showConfirmation && (
              <>
                {renderProviderDropdown()}
                {renderMeterType()}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Meter Number
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter meter number"
                    placeholderTextColor={MUTED}
                    keyboardType="numeric"
                    value={meterNumber}
                    onChangeText={handleMeterNumberChange}
                    editable={!loading && !customer}
                    maxLength={20}
                  />
                </View>

                {renderAmount()}

                {!customer && (
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      (!provider ||
                        !isMeterValid ||
                        !isAmountValid ||
                        loading) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleContinue}
                    disabled={
                      !provider ||
                      !isMeterValid ||
                      !isAmountValid ||
                      loading
                    }
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color={WHITE} />
                    ) : (
                      <Text style={styles.continueButtonText}>
                        Verify Meter
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {customer && (
                  <>
                    {renderCustomerDetails()}

                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={() => {
                        setShowConfirmation(true);
                        setTransactionPin('');
                      }}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.continueButtonText}>
                        Continue to Confirmation
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {!customer && (
                  <View style={styles.failedNotice}>
                    <Text style={styles.failedNoticeTitle}>
                      Verification unsuccessful
                    </Text>
                    <Text style={styles.failedNoticeText}>
                      Please check your meter number and selected provider.
                    </Text>
                  </View>
                )}
              </>
            )}

      {showConfirmation &&
  customer &&
  status !== 'success' &&
  status !== 'pending' &&
  status !== 'failed' &&
  renderConfirmation()}

{status === 'success' &&
  paymentResult &&
  renderSuccess()}

{status === 'pending' &&
  renderPending()}

{status === 'failed' &&
  paymentResult &&
  renderFailed()}
          <View style={styles.securityFooter}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your payment is protected by ZENIMONIES security.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={pinVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (!loading) setPinVisible(false);
        }}
      >
        <SafeAreaView style={styles.pinScreen}>
          <KeyboardAvoidingView
            style={styles.pinScreenInner}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.pinBackButton}
              onPress={() => {
                if (!loading) setPinVisible(false);
              }}
              disabled={loading}
            >
              <Text style={styles.pinBackText}>‹  Back</Text>
            </TouchableOpacity>

            <View style={styles.pinContent}>
              <View style={styles.pinLockCircle}>
                <Text style={styles.pinLockIcon}>🔒</Text>
              </View>

              <Text style={styles.pinScreenTitle}>
                Enter Transaction PIN
              </Text>

              <Text style={styles.pinScreenSubtitle}>
                Authorize your electricity payment of
              </Text>

              <Text style={styles.pinScreenAmount}>
                {formatCurrency(numericAmount)}
              </Text>

              <TouchableOpacity
                style={styles.pinBoxes}
                activeOpacity={1}
                onPress={() => pinInputRef.current?.focus()}
              >
                {[0, 1, 2, 3].map(index => (
                  <View
                    key={index}
                    style={[
                      styles.pinBox,
                      transactionPin.length > index &&
                        styles.pinBoxFilled,
                    ]}
                  >
                    <Text style={styles.pinDot}>
                      {transactionPin.length > index ? '●' : ''}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>

              <TextInput
                ref={pinInputRef}
                value={transactionPin}
                onChangeText={value =>
                  setTransactionPin(
                    value.replace(/\D/g, '').slice(0, 4),
                  )
                }
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                autoFocus
                style={styles.hiddenPinInput}
                caretHidden
                editable={!loading}
              />

              <Text style={styles.pinScreenHint}>
                Your PIN is securely used to authorize this payment.
              </Text>
            </View>

            {isPinValid && (
              <TouchableOpacity
                style={[
                  styles.pinConfirmButton,
                  loading && styles.disabledButton,
                ]}
                onPress={executePayment}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.pinConfirmText}>
                  Confirm & Pay {formatCurrency(numericAmount)}
                </Text>
              </TouchableOpacity>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={loading && status === 'paying'}
        transparent={false}
        animationType="fade"
      >
        <SafeAreaView style={styles.processingScreen}>
          <ActivityIndicator size="large" color={GREEN} />

          <Text style={styles.processingTitle}>
            Processing Payment
          </Text>

          <Text style={styles.processingText}>
            Please wait while we process your electricity payment.
            Do not close the app or make another payment.
          </Text>
        </SafeAreaView>
      </Modal>
    </>
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerIconText: {
    fontSize: 24,
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
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 12,
  },
  providerDropdown: {
    minHeight: 64,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerDropdownLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerDropdownLogo: {
    width: 42,
    height: 42,
    borderRadius: 9,
    marginRight: 12,
    backgroundColor: WHITE,
  },
  providerDropdownText: {
    flex: 1,
  },
  providerDropdownName: {
    fontSize: 14,
    fontWeight: '700',
    color: BLACK,
  },
  providerDropdownSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },
  placeholderText: {
    color: MUTED,
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK_GREEN,
    paddingHorizontal: 8,
  },
  providerList: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  providerOption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  providerOptionSelected: {
    backgroundColor: BACKGROUND,
  },
  providerLogoPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  providerLogoImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  providerOptionDetails: {
    flex: 1,
  },
  providerOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: BLACK,
  },
  providerOptionNameSelected: {
    color: DARK_GREEN,
  },
  providerOptionCode: {
    fontSize: 11,
    color: MUTED,
    marginTop: 3,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: GREEN,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
  },
  meterTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  meterTypeButton: {
    flex: 1,
    minHeight: 56,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterTypeButtonSelected: {
    borderColor: GREEN,
    borderWidth: 1.5,
    backgroundColor: WHITE,
  },
  meterTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
  },
  meterTypeTitleSelected: {
    color: GREEN,
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
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickAmountButton: {
    width: '31%',
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountButtonSelected: {
    borderColor: GREEN,
    borderWidth: 1.5,
    backgroundColor: WHITE,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLACK,
  },
  quickAmountTextSelected: {
    color: GREEN,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    height: 58,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 21,
    fontWeight: '800',
    color: GREEN,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: BLACK,
  },
  amountHint: {
    fontSize: 11,
    color: MUTED,
    marginTop: 8,
  },
  continueButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  continueButtonText: {
    color: WHITE,
    fontSize: 15,
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
  confirmationCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  confirmationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmationIconText: {
    fontSize: 27,
  },
  confirmationTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DARK_GREEN,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtitle: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmationDetails: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginBottom: 18,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  confirmationLabel: {
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },
  confirmationValue: {
    fontSize: 12,
    color: BLACK,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  confirmationAmountRow: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  confirmationAmountLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 8,
  },
  confirmationAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: GREEN,
  },
  confirmationSecurity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  confirmationSecurityIcon: {
    fontSize: 16,
    marginRight: 9,
  },
  confirmationSecurityText: {
    fontSize: 11,
    color: DARK_GREEN,
    flex: 1,
    lineHeight: 17,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  payButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  cancelConfirmationButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  cancelConfirmationText: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  pinScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  pinScreenInner: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  pinBackButton: {
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  pinBackText: {
    fontSize: 16,
    color: DARK_GREEN,
    fontWeight: '700',
  },
  pinContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  pinLockCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  pinLockIcon: {
    fontSize: 28,
  },
  pinScreenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BLACK,
    marginBottom: 10,
  },
  pinScreenSubtitle: {
    fontSize: 13,
    color: MUTED,
  },
  pinScreenAmount: {
    fontSize: 25,
    fontWeight: '900',
    color: GREEN,
    marginTop: 8,
    marginBottom: 30,
  },
  pinBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  pinBox: {
    width: 58,
    height: 62,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFilled: {
    borderColor: GREEN,
  },
  pinDot: {
    fontSize: 19,
    color: GREEN,
  },
  hiddenPinInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pinScreenHint: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
    maxWidth: 280,
  },
  pinConfirmButton: {
    height: 56,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinConfirmText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  processingScreen: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 22,
  },
  processingText: {
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
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
    width: '100%',
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
    marginTop: 16,
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
  requeryButton: {
    marginTop: 4,
    marginBottom: 4,
  },
  noRequeryText: {
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    textAlign: 'center',
    marginVertical: 12,
  },
  failedIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FCEDEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  failedIconText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#B42318',
  },
  failedResultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B42318',
    marginBottom: 8,
  },
  failedNotice: {
    backgroundColor: WHITE,
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
