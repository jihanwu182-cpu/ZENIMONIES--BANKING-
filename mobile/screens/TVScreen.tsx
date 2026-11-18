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
  Image,
} from 'react-native';

interface TVProvider {
  id: string;
  name: string;
  shortName: string;
  logo: any;
}

interface TVPackage {
  id: string;
  name: string;
  amount: number;
  description?: string;
  provider?: string;
}

interface TVCustomer {
  customerName: string;
  customerNumber: string;
}

interface TVScreenProps {
  onValidate?: (
    provider: string,
    customerNumber: string
  ) => Promise<TVCustomer>;

  onSubscribe?: (
    provider: string,
    customerNumber: string,
    packageId: string,
    transactionPin: string
  ) => Promise<any>;

  packages?: TVPackage[];
}

// ============================================================
// ZENIMONIES BRAND COLORS
// ============================================================

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';
const LIGHT_GREEN = '#F5FAED';
const SUCCESS_BACKGROUND = '#EAF5DE';
const SUCCESS_BORDER = '#D4E8BD';
const PENDING_BACKGROUND = '#F6F8F3';

// ============================================================
// OFFICIAL PROVIDER LOGOS
// ============================================================

const providers: TVProvider[] = [
  {
    id: 'dstv',
    name: 'DStv',
    shortName: 'DStv',
    logo: require('../../assets/logos/dstv.png'),
  },
  {
    id: 'gotv',
    name: 'GOtv',
    shortName: 'GOtv',
    logo: require('../../assets/logos/gotv.png'),
  },
  {
    id: 'startimes',
    name: 'StarTimes',
    shortName: 'StarTimes',
    logo: require('../../assets/logos/startimes.png'),
  },
];

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (amount: number) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

const normalizeStatus = (result: any): string => {
  return String(
    result?.status ||
      result?.data?.status ||
      ''
  ).toLowerCase();
};

// ============================================================
// TV SUBSCRIPTION SCREEN
// ============================================================

export default function TVScreen({
  onValidate,
  onSubscribe,
  packages = [],
}: TVScreenProps) {
  const [selectedProvider, setSelectedProvider] =
    useState<string>('dstv');

  const [customerNumber, setCustomerNumber] =
    useState('');

  const [customer, setCustomer] =
    useState<TVCustomer | null>(null);

  const [selectedPackage, setSelectedPackage] =
    useState<TVPackage | null>(null);

  const [transactionPin, setTransactionPin] =
    useState('');

  const [loadingValidation, setLoadingValidation] =
    useState(false);

  const [loadingSubscription, setLoadingSubscription] =
    useState(false);

  const [validated, setValidated] =
    useState(false);

  const [showPin, setShowPin] =
    useState(false);

  const [paymentProcessing, setPaymentProcessing] =
    useState(false);

  // ============================================================
  // PROVIDER CHANGE
  // ============================================================

  const handleProviderChange = (provider: string) => {
    if (loadingSubscription) return;

    setSelectedProvider(provider);
    setCustomerNumber('');
    setCustomer(null);
    setSelectedPackage(null);
    setTransactionPin('');
    setValidated(false);
    setPaymentProcessing(false);
  };

  // ============================================================
  // FILTER PACKAGES
  // ============================================================

  const filteredPackages = packages.filter(item => {
    if (!item.provider) {
      return false;
    }

    return (
      item.provider.toLowerCase() ===
      selectedProvider.toLowerCase()
    );
  });

  // ============================================================
  // CUSTOMER VALIDATION
  // ============================================================

  const handleValidateCustomer = async () => {
    if (!customerNumber.trim()) {
      Alert.alert(
        'Required',
        'Please enter your Smart Card or IUC number.'
      );
      return;
    }

    if (!onValidate) {
      Alert.alert(
        'Not Connected',
        'Customer validation has not yet been connected to the backend.'
      );
      return;
    }

    try {
      setLoadingValidation(true);
      setSelectedPackage(null);
      setTransactionPin('');
      setPaymentProcessing(false);

      const result = await onValidate(
        selectedProvider,
        customerNumber.trim()
      );

      if (!result?.customerName) {
        throw new Error(
          'Customer verification did not return a valid customer name.'
        );
      }

      setCustomer(result);
      setValidated(true);

      Alert.alert(
        'Customer Verified',
        `Customer: ${result.customerName}`
      );
    } catch (error: any) {
      setCustomer(null);
      setValidated(false);
      setSelectedPackage(null);

      Alert.alert(
        'Validation Failed',
        error?.message ||
          'Unable to validate this customer. Please check the number and try again.'
      );
    } finally {
      setLoadingValidation(false);
    }
  };

  // ============================================================
  // PACKAGE SELECTION
  // ============================================================

  const handleSelectPackage = (item: TVPackage) => {
    if (paymentProcessing) return;

    setSelectedPackage(item);
    setTransactionPin('');
  };

  // ============================================================
  // PAYMENT CONFIRMATION
  // ============================================================

  const handleSubscribe = async () => {
    if (!customer) {
      Alert.alert(
        'Customer Required',
        'Please validate your customer number first.'
      );
      return;
    }

    if (!selectedPackage) {
      Alert.alert(
        'Package Required',
        'Please select a TV package.'
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

    if (!onSubscribe) {
      Alert.alert(
        'Not Connected',
        'TV subscription payment has not yet been connected to the backend.'
      );
      return;
    }

    if (paymentProcessing) {
      Alert.alert(
        'Transaction Processing',
        'Your previous payment is still processing. Please do not submit another payment.'
      );
      return;
    }

    Alert.alert(
      'Confirm Subscription',
      `Provider: ${
        providers.find(
          p => p.id === selectedProvider
        )?.name
      }\n\nCustomer: ${
        customer.customerName
      }\n\nCustomer Number: ${
        customer.customerNumber
      }\n\nPackage: ${
        selectedPackage.name
      }\n\nAmount: ${formatCurrency(
        selectedPackage.amount
      )}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Pay Now',
          onPress: executeSubscription,
        },
      ]
    );
  };

  // ============================================================
  // EXECUTE SUBSCRIPTION
  // ============================================================

  const executeSubscription = async () => {
    if (
      !onSubscribe ||
      !customer ||
      !selectedPackage
    ) {
      return;
    }

    try {
      setLoadingSubscription(true);

      const result = await onSubscribe(
        selectedProvider,
        customerNumber.trim(),
        selectedPackage.id,
        transactionPin
      );

      const status = normalizeStatus(result);

      const isPending =
        result?.pending === true ||
        result?.processing === true ||
        (
          result?.success === false &&
          (
            status === 'pending' ||
            status === 'processing'
          )
        ) ||
        status === 'pending' ||
        status === 'processing' ||
        result?.httpStatus === 202;

      const isCompleted =
        result?.success === true &&
        (
          status === 'completed' ||
          status === 'success' ||
          status === ''
        ) &&
        !isPending;

      setTransactionPin('');

      // --------------------------------------------------------
      // PENDING TRANSACTION
      // --------------------------------------------------------

      if (isPending) {
        setPaymentProcessing(true);

        Alert.alert(
          'Payment Processing',
          result?.message ||
            'Your TV subscription payment is being processed. Please do not pay again. Check your transaction history for updates.',
          [
            {
              text: 'OK',
              onPress: () => {
                setCustomerNumber('');
                setCustomer(null);
                setSelectedPackage(null);
                setValidated(false);
              },
            },
          ]
        );

        return;
      }

      // --------------------------------------------------------
      // SUCCESSFUL TRANSACTION
      // --------------------------------------------------------

      if (isCompleted) {
        Alert.alert(
          'Subscription Successful',
          result?.message ||
            'Your TV subscription has been completed successfully.',
          [
            {
              text: 'OK',
              onPress: resetForm,
            },
          ]
        );

        return;
      }

      // --------------------------------------------------------
      // FAILED TRANSACTION
      // --------------------------------------------------------

      Alert.alert(
        'Transaction Failed',
        result?.message ||
          'Your TV subscription could not be completed. Check your transaction history before trying again.'
      );
    } catch (error: any) {
      const statusCode =
        error?.status ||
        error?.response?.status;

      const isAmbiguous =
        statusCode === 202 ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNRESET' ||
        error?.code === 'ERR_NETWORK' ||
        !error?.response;

      setTransactionPin('');

      // --------------------------------------------------------
      // UNKNOWN TRANSACTION STATUS
      // --------------------------------------------------------

      if (isAmbiguous) {
        setPaymentProcessing(true);

        Alert.alert(
          'Transaction Status Unknown',
          'We could not confirm the final status of your TV subscription. Please check your transaction history before attempting another payment.'
        );

        return;
      }

      // --------------------------------------------------------
      // DEFINITE FAILURE
      // --------------------------------------------------------

      Alert.alert(
        'Transaction Failed',
        error?.message ||
          'Your subscription could not be completed.'
      );
    } finally {
      setLoadingSubscription(false);
    }
  };

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setCustomerNumber('');
    setTransactionPin('');
    setCustomer(null);
    setSelectedPackage(null);
    setValidated(false);
    setPaymentProcessing(false);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              TV Subscription
            </Text>

            <Text style={styles.headerSubtitle}>
              Renew your favourite TV channels
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>
              TV
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* PROVIDERS */}
        {/* ================================================== */}

        <Text style={styles.sectionTitle}>
          Select Provider
        </Text>

        <View style={styles.providerContainer}>
          {providers.map(provider => {
            const selected =
              selectedProvider === provider.id;

            return (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerCard,
                  selected &&
                    styles.providerCardSelected,
                ]}
                onPress={() =>
                  handleProviderChange(provider.id)
                }
                disabled={loadingSubscription}
                activeOpacity={0.8}
              >
                {/* OFFICIAL LOGO */}

                <View
                  style={[
                    styles.providerLogoContainer,
                    selected &&
                      styles.providerLogoContainerSelected,
                  ]}
                >
                  <Image
                    source={provider.logo}
                    style={styles.providerLogo}
                    resizeMode="contain"
                  />
                </View>

                {/* PROVIDER NAME */}

                <Text
                  style={[
                    styles.providerName,
                    selected &&
                      styles.providerNameSelected,
                  ]}
                >
                  {provider.name}
                </Text>

                {/* SELECTED INDICATOR */}

                {selected && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================================================== */}
        {/* CUSTOMER DETAILS */}
        {/* ================================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Customer Details
          </Text>

          <Text style={styles.label}>
            Smart Card / IUC Number
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Smart Card or IUC number"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={customerNumber}
            editable={!loadingSubscription}
            onChangeText={value => {
              setCustomerNumber(value);
              setCustomer(null);
              setValidated(false);
              setSelectedPackage(null);
              setTransactionPin('');
              setPaymentProcessing(false);
            }}
          />

          <TouchableOpacity
            style={styles.validateButton}
            onPress={handleValidateCustomer}
            disabled={
              loadingValidation ||
              loadingSubscription
            }
            activeOpacity={0.8}
          >
            {loadingValidation ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.validateButtonText}>
                Validate Customer
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* VERIFIED CUSTOMER */}
        {/* ================================================== */}

        {validated && customer && (
          <View style={styles.customerCard}>
            <View style={styles.verifiedIcon}>
              <Text style={styles.verifiedIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.customerDetails}>
              <Text style={styles.customerLabel}>
                VERIFIED CUSTOMER
              </Text>

              <Text style={styles.customerName}>
                {customer.customerName}
              </Text>

              <Text style={styles.customerNumber}>
                {customer.customerNumber}
              </Text>
            </View>
          </View>
        )}

        {/* ================================================== */}
        {/* PACKAGES */}
        {/* ================================================== */}

        {validated && (
          <>
            <Text style={styles.sectionTitle}>
              Select Package
            </Text>

            {filteredPackages.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>
                    TV
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  No Packages Available
                </Text>

                <Text style={styles.emptyText}>
                  No packages are currently available
                  for this provider.
                </Text>
              </View>
            ) : (
              filteredPackages.map(item => {
                const selected =
                  selectedPackage?.id === item.id;

                return (
                  <TouchableOpacity
                    key={`${item.provider}-${item.id}`}
                    style={[
                      styles.packageCard,
                      selected &&
                        styles.packageCardSelected,
                    ]}
                    onPress={() =>
                      handleSelectPackage(item)
                    }
                    disabled={
                      loadingSubscription ||
                      paymentProcessing
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>
                        {item.name}
                      </Text>

                      {!!item.description && (
                        <Text style={styles.packageDescription}>
                          {item.description}
                        </Text>
                      )}

                      <Text style={styles.packageAmount}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>

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
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* ================================================== */}
        {/* PAYMENT */}
        {/* ================================================== */}

        {selectedPackage && (
          <View style={styles.paymentCard}>
            <Text style={styles.cardTitle}>
              Payment Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Provider
              </Text>

              <Text style={styles.summaryValue}>
                {
                  providers.find(
                    p => p.id === selectedProvider
                  )?.name
                }
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Customer
              </Text>

              <Text style={styles.summaryValue}>
                {customer?.customerName}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Package
              </Text>

              <Text style={styles.summaryValue}>
                {selectedPackage.name}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Total Amount
              </Text>

              <Text style={styles.totalAmount}>
                {formatCurrency(
                  selectedPackage.amount
                )}
              </Text>
            </View>

            {/* PENDING TRANSACTION NOTICE */}

            {paymentProcessing && (
              <View style={styles.pendingNotice}>
                <View style={styles.pendingIcon}>
                  <Text style={styles.pendingIconText}>
                    !
                  </Text>
                </View>

                <Text style={styles.pendingNoticeText}>
                  This transaction is processing.
                  Do not submit another payment.
                </Text>
              </View>
            )}

            {/* TRANSACTION PIN */}

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
                editable={
                  !loadingSubscription &&
                  !paymentProcessing
                }
                onChangeText={value =>
                  setTransactionPin(
                    value.replace(/\D/g, '')
                  )
                }
              />

              <TouchableOpacity
                onPress={() => setShowPin(!showPin)}
                disabled={paymentProcessing}
                style={styles.showPinButton}
              >
                <Text style={styles.showPin}>
                  {showPin ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PAY BUTTON */}

            <TouchableOpacity
              style={[
                styles.payButton,
                paymentProcessing &&
                  styles.payButtonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={
                loadingSubscription ||
                paymentProcessing
              }
              activeOpacity={0.8}
            >
              {loadingSubscription ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.payButtonText}>
                  {paymentProcessing
                    ? 'Transaction Processing'
                    : `Pay ${formatCurrency(
                        selectedPackage.amount
                      )}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ================================================== */}
        {/* SECURITY */}
        {/* ================================================== */}

        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>
            🔒
          </Text>

          <Text style={styles.securityText}>
            Your transaction is protected by
            ZENIMONIES security.
          </Text>
        </View>

        {/* BRAND FOOTER */}

        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Text style={styles.footerLogoText}>
              Z
            </Text>
          </View>

          <Text style={styles.footerText}>
            ZENIMONIES
          </Text>

          <Text style={styles.footerTagline}>
            Banking made simple.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

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

  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  headerTextContainer: {
    flex: 1,
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
    marginLeft: 15,
  },

  headerIconText: {
    color: DARK_GREEN,
    fontWeight: '800',
    fontSize: 17,
  },

  // ----------------------------------------------------------
  // SECTION TITLES
  // ----------------------------------------------------------

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 14,
    marginTop: 10,
  },

  // ----------------------------------------------------------
  // PROVIDER CARDS
  // ----------------------------------------------------------

  providerContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  providerCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    position: 'relative',
  },

  providerCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: LIGHT_GREEN,
  },

  providerLogoContainer: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
  },

  providerLogoContainerSelected: {
    backgroundColor: WHITE,
  },

  providerLogo: {
    width: '100%',
    height: 42,
  },

  providerName: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  providerNameSelected: {
    color: DARK_GREEN,
    fontWeight: '800',
  },

  selectedIndicator: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedIndicatorText: {
    color: WHITE,
    fontWeight: '800',
    fontSize: 12,
  },

  // ----------------------------------------------------------
  // CUSTOMER CARD
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // VERIFIED CUSTOMER
  // ----------------------------------------------------------

  customerCard: {
    backgroundColor: SUCCESS_BACKGROUND,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: SUCCESS_BORDER,
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

  customerDetails: {
    flex: 1,
  },

  customerLabel: {
    fontSize: 11,
    color: DARK_GREEN,
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
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

  // ----------------------------------------------------------
  // PACKAGES
  // ----------------------------------------------------------

  packageCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  packageCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: LIGHT_GREEN,
  },

  packageInfo: {
    flex: 1,
  },

  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: BLACK,
  },

  packageDescription: {
    fontSize: 12,
    color: MUTED,
    marginTop: 5,
  },

  packageAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_GREEN,
    marginTop: 9,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  radioSelected: {
    borderColor: GREEN,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
  },

  // ----------------------------------------------------------
  // EMPTY PACKAGES
  // ----------------------------------------------------------

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F3D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyIconText: {
    color: DARK_GREEN,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyTitle: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '700',
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // ----------------------------------------------------------
  // PAYMENT CARD
  // ----------------------------------------------------------

  paymentCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  summaryLabel: {
    fontSize: 13,
    color: MUTED,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: BLACK,
    maxWidth: '60%',
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  totalLabel: {
    color: BLACK,
    fontSize: 15,
    fontWeight: '700',
  },

  totalAmount: {
    color: DARK_GREEN,
    fontSize: 20,
    fontWeight: '800',
  },

  // ----------------------------------------------------------
  // PENDING TRANSACTION
  // ----------------------------------------------------------

  pendingNotice: {
    backgroundColor: PENDING_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pendingIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F3D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  pendingIconText: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '800',
  },

  pendingNoticeText: {
    color: DARK_GREEN,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    flex: 1,
  },

  // ----------------------------------------------------------
  // PIN
  // ----------------------------------------------------------

  pinContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
  },

  pinInput: {
    flex: 1,
    color: BLACK,
    fontSize: 15,
  },

  showPinButton: {
    paddingLeft: 10,
    paddingVertical: 5,
  },

  showPin: {
    color: GREEN,
    fontWeight: '700',
    fontSize: 13,
  },

  // ----------------------------------------------------------
  // PAY BUTTON
  // ----------------------------------------------------------

  payButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: DARK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  payButtonDisabled: {
    backgroundColor: MUTED,
  },

  payButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },

  // ----------------------------------------------------------
  // SECURITY NOTICE
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // FOOTER
  // ----------------------------------------------------------

  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  footerLogo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  footerLogoText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '900',
  },

  footerText: {
    color: DARK_GREEN,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerTagline: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },
});
