
import React, { useState, useMemo } from 'react';
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

interface TVProvider {
  id: string;
  name: string;
  shortName: string;
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
// ZENIMONIES ORIGINAL BRAND COLORS
// ============================================================

const GREEN = '#78A900';
const DARK_GREEN = '#527900';
const BLACK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const WHITE = '#FFFFFF';
const BORDER = '#E9EDE5';

const providers: TVProvider[] = [
  {
    id: 'dstv',
    name: 'DStv',
    shortName: 'DStv',
  },
  {
    id: 'gotv',
    name: 'GOtv',
    shortName: 'GOtv',
  },
  {
    id: 'startimes',
    name: 'StarTimes',
    shortName: 'StarTimes',
  },
];

const formatCurrency = (amount: number) => {
  return `₦${Number(amount).toLocaleString('en-NG')}`;
};

// ============================================================
// TV SCREEN
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

  // ============================================================
  // FILTER PACKAGES BY PROVIDER
  // ============================================================

  const filteredPackages = useMemo(() => {
    return packages.filter(item => {
      if (!item.provider) {
        return true;
      }

      return (
        item.provider.toLowerCase() ===
        selectedProvider.toLowerCase()
      );
    });
  }, [packages, selectedProvider]);

  // ============================================================
  // PROVIDER SELECTION
  // ============================================================

  const handleProviderChange = (provider: string) => {
    if (loadingValidation || loadingSubscription) {
      return;
    }

    setSelectedProvider(provider);
    setCustomerNumber('');
    setCustomer(null);
    setSelectedPackage(null);
    setTransactionPin('');
    setValidated(false);
    setShowPin(false);
  };

  // ============================================================
  // CUSTOMER VALIDATION
  // ============================================================

  const handleValidateCustomer = async () => {
    const number = customerNumber.trim();

    if (!number) {
      Alert.alert(
        'Required',
        'Please enter your Smart Card or IUC number.'
      );
      return;
    }

    if (!onValidate) {
      Alert.alert(
        'Service Unavailable',
        'Customer validation is not currently connected.'
      );
      return;
    }

    try {
      setLoadingValidation(true);

      setCustomer(null);
      setValidated(false);
      setSelectedPackage(null);

      const result = await onValidate(
        selectedProvider,
        number
      );

      if (!result || !result.customerName) {
        throw new Error(
          'Customer verification returned incomplete information.'
        );
      }

      setCustomer({
        customerName: result.customerName,
        customerNumber:
          result.customerNumber || number,
      });

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
    if (!validated || loadingSubscription) {
      return;
    }

    setSelectedPackage(item);
    setTransactionPin('');
  };

  // ============================================================
  // SUBSCRIPTION CONFIRMATION
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
        'Service Unavailable',
        'TV subscription payment is not currently connected.'
      );
      return;
    }

    const providerName =
      providers.find(
        p => p.id === selectedProvider
      )?.name || selectedProvider;

    Alert.alert(
      'Confirm Subscription',
      `Provider: ${providerName}\n\nCustomer: ${customer.customerName}\n\nCustomer Number: ${customer.customerNumber}\n\nPackage: ${selectedPackage.name}\n\nAmount: ${formatCurrency(selectedPackage.amount)}`,
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
      !customer ||
      !selectedPackage ||
      !onSubscribe
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

      const status =
        result?.status?.toLowerCase?.() ||
        result?.transaction?.status?.toLowerCase?.() ||
        '';

      // --------------------------------------------------------
      // PENDING / PROCESSING
      // --------------------------------------------------------

      if (
        status === 'pending' ||
        status === 'processing' ||
        result?.pending === true ||
        result?.statusCode === 202
      ) {
        Alert.alert(
          'Transaction Processing',
          result?.message ||
            'Your TV subscription is being processed. Please check your transaction history before attempting another payment.'
        );

        resetForm();
        return;
      }

      // --------------------------------------------------------
      // FAILED
      // --------------------------------------------------------

      if (
        status === 'failed' ||
        status === 'failure' ||
        result?.success === false
      ) {
        Alert.alert(
          'Transaction Failed',
          result?.message ||
            'Your subscription could not be completed.'
        );

        return;
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      Alert.alert(
        'Subscription Successful',
        result?.message ||
          'Your TV subscription has been completed successfully.'
      );

      resetForm();
    } catch (error: any) {
      const responseStatus =
        error?.response?.status;

      const errorCode =
        error?.code ||
        error?.response?.data?.code;

      // --------------------------------------------------------
      // AMBIGUOUS TRANSACTION
      // --------------------------------------------------------

      if (
        responseStatus === 202 ||
        errorCode === 'TRANSACTION_PENDING' ||
        errorCode === 'PROCESSING' ||
        errorCode === 'TIMEOUT' ||
        errorCode === 'ECONNABORTED' ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ECONNRESET'
      ) {
        Alert.alert(
          'Transaction Processing',
          'We could not confirm the final status of this payment. Please check your transaction history before trying again.'
        );

        resetForm();
        return;
      }

      // --------------------------------------------------------
      // DEFINITE FAILURE
      // --------------------------------------------------------

      Alert.alert(
        'Transaction Failed',
        error?.message ||
          'Your subscription could not be completed. Please try again.'
      );
    } finally {
      setLoadingSubscription(false);
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const resetForm = () => {
    setCustomerNumber('');
    setTransactionPin('');
    setCustomer(null);
    setSelectedPackage(null);
    setValidated(false);
    setShowPin(false);
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
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
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

        {/* PROVIDERS */}

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
                activeOpacity={0.75}
                disabled={
                  loadingValidation ||
                  loadingSubscription
                }
              >
                {/* LOGO PLACEHOLDER */}

                <View
                  style={[
                    styles.providerLogo,
                    selected &&
                      styles.providerLogoSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.providerLogoText,
                      selected &&
                        styles.providerLogoTextSelected,
                    ]}
                  >
                    {provider.shortName}
                  </Text>
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

        {/* CUSTOMER DETAILS */}

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
            editable={
              !loadingValidation &&
              !loadingSubscription
            }
            onChangeText={value => {
              setCustomerNumber(value);
              setCustomer(null);
              setValidated(false);
              setSelectedPackage(null);
            }}
          />

          <TouchableOpacity
            style={[
              styles.validateButton,
              loadingValidation &&
                styles.buttonDisabled,
            ]}
            onPress={handleValidateCustomer}
            disabled={loadingValidation}
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

        {/* VERIFIED CUSTOMER */}

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
                {customer.customerNumber}
              </Text>
            </View>
          </View>
        )}

        {/* PACKAGES */}

        {validated && (
          <>
            <Text style={styles.sectionTitle}>
              Select Package
            </Text>

            {filteredPackages.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No Packages Available
                </Text>

                <Text style={styles.emptyText}>
                  Packages for this provider are
                  currently unavailable. Please try
                  again later.
                </Text>
              </View>
            ) : (
              filteredPackages.map(item => {
                const selected =
                  selectedPackage?.id === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.packageCard,
                      selected &&
                        styles.packageCardSelected,
                    ]}
                    onPress={() =>
                      handleSelectPackage(item)
                    }
                    activeOpacity={0.75}
                    disabled={loadingSubscription}
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

        {/* PAYMENT SUMMARY */}

        {selectedPackage && customer && (
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
                {customer.customerName}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Customer Number
              </Text>

              <Text style={styles.summaryValue}>
                {customer.customerNumber}
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
                editable={!loadingSubscription}
                onChangeText={value =>
                  setTransactionPin(
                    value.replace(/[^0-9]/g, '')
                  )
                }
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPin(!showPin)
                }
                disabled={loadingSubscription}
              >
                <Text style={styles.showPin}>
                  {showPin ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PAYMENT BUTTON */}

            <TouchableOpacity
              style={[
                styles.payButton,
                loadingSubscription &&
                  styles.buttonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={loadingSubscription}
              activeOpacity={0.8}
            >
              {loadingSubscription ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay{' '}
                  {formatCurrency(
                    selectedPackage.amount
                  )}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ORIGINAL ZENIMONIES BRANDING
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
    backgroundColor: '#E8F3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    color: DARK_GREEN,
    fontWeight: '800',
    fontSize: 17,
  },

  // SECTION TITLES

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BLACK,
    marginBottom: 14,
    marginTop: 10,
  },

  // PROVIDERS

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
    position: 'relative',
  },

  providerCardSelected: {
    borderColor: GREEN,
    borderWidth: 2,
    backgroundColor: '#F5FAED',
  },

  providerLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F3EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  providerLogoSelected: {
    backgroundColor: '#E5F1D4',
  },

  providerLogoText: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '800',
  },

  providerLogoTextSelected: {
    color: DARK_GREEN,
  },

  providerName: {
    color: BLACK,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  providerNameSelected: {
    color: DARK_GREEN,
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

  // CUSTOMER CARD

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

  // BUTTONS

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

  buttonDisabled: {
    opacity: 0.65,
  },

  // VERIFIED CUSTOMER

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

  // PACKAGES

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
    backgroundColor: '#F6FAF1',
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

  // RADIO

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

  // EMPTY STATE

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
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

  // PAYMENT SUMMARY

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
});
