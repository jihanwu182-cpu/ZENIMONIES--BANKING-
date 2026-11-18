
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://zenimonies-banking.onrender.com/api';

type Network = 'mtn' | 'airtel' | 'glo' | 't2mobile';

interface NetworkInfo {
  value: Network;
  label: string;
  color: string;
  logo: any;
}

interface DataPlan {
  variation_code: string;
  name: string;
  amount: number;
  description?: string;
  validity?: string | null;
  allowance?: string | null;
  category?: string | null;
  network?: string | null;
  fixedPrice?: boolean | null;
  isPromotional?: boolean;
  raw?: any;
}

interface Props {
  colors?: any;
  isDark?: boolean;
}

const NETWORKS: NetworkInfo[] = [
  {
    value: 'mtn',
    label: 'MTN',
    color: '#FFCC00',
    logo: require('../assets/network-logos/mtn-nigeria-communications-plc--600.png'),
  },
  {
    value: 'airtel',
    label: 'Airtel',
    color: '#E31B23',
    logo: require('../assets/network-logos/airtel.png'),
  },
  {
    value: 'glo',
    label: 'Glo',
    color: '#00A859',
    logo: require('../assets/network-logos/glo.png'),
  },
  {
    value: 't2mobile',
    label: 'T2 Mobile',
    color: '#191919',
    logo: require('../assets/network-logos/T2-Mobilr.jpg'),
  },
];

const DEFAULT_COLORS = {
  background: '#F6F8F3',
  card: '#FFFFFF',
  text: '#172018',
  muted: '#858B83',
  border: '#E9EDE5',
  green: '#78A900',
  darkGreen: '#527900',
  danger: '#D93025',
  success: '#16803D',
};

const CATEGORIES = [
  'All Plans',
  'Daily',
  'Weekly',
  'Monthly',
  'Night',
  'Special',
  'Hot Deals',
  '3 Months',
  'Weekend',
  'Hourly',
  'Other',
];

const formatCurrency = (amount: number) => {
  return `₦${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizePhone = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 11);
};

const detectNetwork = (phone: string): Network | null => {
  const prefixes: Record<Network, string[]> = {
    mtn: [
      '0803', '0806', '0810', '0813', '0814',
      '0816', '0903', '0906', '0913', '0916',
    ],
    airtel: [
      '0802', '0808', '0812', '0701', '0708',
      '0901', '0902', '0907', '0912',
    ],
    glo: [
      '0805', '0807', '0811', '0815', '0705',
      '0905', '0915',
    ],
    t2mobile: [
      '0809', '0817', '0818', '0908', '0909',
    ],
  };

  const prefix = phone.substring(0, 4);

  for (const network of Object.keys(prefixes) as Network[]) {
    if (prefixes[network].includes(prefix)) {
      return network;
    }
  }

  return null;
};

const normalizePlan = (plan: any): DataPlan | null => {
  const variationCode = String(
    plan?.variation_code ??
    plan?.variationCode ??
    plan?.code ??
    ''
  ).trim();

  const amount = Number(
    plan?.amount ??
    plan?.price ??
    plan?.variation_amount ??
    plan?.cost
  );

  if (!variationCode || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    variation_code: variationCode,
    name:
      plan?.name ||
      plan?.plan_name ||
      plan?.description ||
      plan?.bundle_name ||
      'Data bundle',
    amount,
    description:
      plan?.description ||
      plan?.details ||
      plan?.plan_description ||
      '',
    validity:
      plan?.validity ||
      plan?.validity_period ||
      plan?.duration ||
      plan?.expiry ||
      null,
    allowance:
      plan?.allowance ||
      plan?.bundle ||
      plan?.data_size ||
      plan?.volume ||
      plan?.size ||
      null,
    category:
      plan?.category ||
      plan?.plan_category ||
      plan?.type ||
      plan?.plan_type ||
      null,
    network:
      plan?.network ||
      plan?.network_slug ||
      null,
    fixedPrice:
      plan?.fixedPrice ??
      plan?.fixed_price ??
      null,
    isPromotional:
      plan?.is_promotional ??
      plan?.promotion ??
      plan?.promotional ??
      false,
    raw: plan,
  };
};

const getCategory = (plan: DataPlan): string => {
  const text = [
    plan.name,
    plan.description,
    plan.validity,
    plan.allowance,
    plan.category,
    plan.variation_code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    text.includes('night') ||
    text.includes('midnight')
  ) {
    return 'Night';
  }

  if (
    text.includes('weekend') ||
    text.includes('saturday') ||
    text.includes('sunday')
  ) {
    return 'Weekend';
  }

  if (
    text.includes('hour') ||
    text.includes('hourly')
  ) {
    return 'Hourly';
  }

  if (
    text.includes('3 month') ||
    text.includes('90 day') ||
    text.includes('90days') ||
    text.includes('quarter')
  ) {
    return '3 Months';
  }

  if (
    text.includes('daily') ||
    text.includes('1 day') ||
    text.includes('24 hour') ||
    text.includes('24hrs')
  ) {
    return 'Daily';
  }

  if (
    text.includes('weekly') ||
    text.includes('7 day') ||
    text.includes('7days')
  ) {
    return 'Weekly';
  }

  if (
    text.includes('monthly') ||
    text.includes('30 day') ||
    text.includes('30days') ||
    text.includes('31 day')
  ) {
    return 'Monthly';
  }

  if (
    plan.isPromotional ||
    text.includes('promo') ||
    text.includes('special') ||
    text.includes('bonus')
  ) {
    return 'Special';
  }

  if (
    text.includes('hot deal') ||
    text.includes('hotdeals')
  ) {
    return 'Hot Deals';
  }

  return 'Other';
};

const NetworkLogo = ({
  network,
  size = 42,
}: {
  network: NetworkInfo;
  size?: number;
}) => (
  <View
    style={[
      styles.logoContainer,
      {
        width: size,
        height: size,
      },
    ]}
  >
    <Image
      source={network.logo}
      style={{
        width: size - 6,
        height: size - 6,
      }}
      resizeMode="contain"
    />
  </View>
);

const DataScreen = ({ colors, isDark = false }: Props) => {
  const theme = {
    ...DEFAULT_COLORS,
    ...(colors || {}),
  };

  const [phone, setPhone] = useState('');
  const [selectedNetwork, setSelectedNetwork] =
    useState<Network | null>(null);

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] =
    useState<DataPlan | null>(null);

  const [category, setCategory] = useState('All Plans');
  const [search, setSearch] = useState('');

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [plansError, setPlansError] = useState('');

  const [networkModalVisible, setNetworkModalVisible] =
    useState(false);

  const [pinModalVisible, setPinModalVisible] =
    useState(false);

  const [pin, setPin] = useState('');

  const [purchasing, setPurchasing] = useState(false);

  const [resultModalVisible, setResultModalVisible] =
    useState(false);

  const [transactionResult, setTransactionResult] =
    useState<any>(null);

  const [transactionReference, setTransactionReference] =
    useState('');

  const [requestId, setRequestId] = useState(0);

  const detectedNetwork = useMemo(
    () => detectNetwork(phone),
    [phone]
  );

  const currentNetwork = useMemo(
    () =>
      NETWORKS.find(
        (network) => network.value === selectedNetwork
      ) || null,
    [selectedNetwork]
  );

  // ----------------------------------------------------------
  // LOAD DATA PLANS
  // ----------------------------------------------------------

  const loadPlans = useCallback(
    async (
      network: Network,
      showRefresh = false
    ) => {
      const currentRequest = requestId + 1;

      setRequestId(currentRequest);

      setPlans([]);
      setSelectedPlan(null);
      setCategory('All Plans');
      setSearch('');
      setPlansError('');

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoadingPlans(true);
      }

      try {
        const token = await AsyncStorage.getItem(
          'zenimonies_token'
        );

        if (!token) {
          throw new Error(
            'Your session has expired. Please log in again.'
          );
        }

        const response = await fetch(
          `${API_BASE}/data/plans?network=${encodeURIComponent(
            network
          )}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const responseData = await response.json();

        if (!response.ok || responseData.success !== true) {
          throw new Error(
            responseData.message ||
            'Unable to load data plans.'
          );
        }

        const rawPlans = Array.isArray(responseData.plans)
          ? responseData.plans
          : [];

        const normalizedPlans = rawPlans
          .map(normalizePlan)
          .filter(Boolean) as DataPlan[];

        if (normalizedPlans.length === 0) {
          throw new Error(
            'No data plans are currently available for this network.'
          );
        }

        setPlans(normalizedPlans);
      } catch (error: any) {
        setPlans([]);
        setPlansError(
          error?.message ||
          'Unable to load data plans. Please try again.'
        );
      } finally {
        setLoadingPlans(false);
        setRefreshing(false);
      }
    },
    [requestId]
  );

  useEffect(() => {
    if (selectedNetwork) {
      loadPlans(selectedNetwork);
    }
  }, [selectedNetwork]);

  // ----------------------------------------------------------
  // FILTER PLANS
  // ----------------------------------------------------------

  const filteredPlans = useMemo(() => {
    let result = plans;

    if (category !== 'All Plans') {
      result = result.filter(
        (plan) => getCategory(plan) === category
      );
    }

    const searchText = search.trim().toLowerCase();

    if (searchText) {
      result = result.filter((plan) => {
        const text = [
          plan.name,
          plan.description,
          plan.validity,
          plan.allowance,
          plan.category,
          plan.variation_code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(searchText);
      });
    }

    return result;
  }, [plans, category, search]);

  // ----------------------------------------------------------
  // PHONE NUMBER
  // ----------------------------------------------------------

  const handlePhoneChange = (value: string) => {
    const clean = normalizePhone(value);

    setPhone(clean);

    const detected = detectNetwork(clean);

    if (detected && detected !== selectedNetwork) {
      setSelectedNetwork(detected);
    }
  };

  // ----------------------------------------------------------
  // PURCHASE
  // ----------------------------------------------------------

  const handlePurchase = () => {
    Keyboard.dismiss();

    if (!phone || phone.length !== 11) {
      Alert.alert(
        'Invalid Phone Number',
        'Enter a valid 11-digit Nigerian phone number.'
      );
      return;
    }

    if (!selectedNetwork) {
      Alert.alert(
        'Select Network',
        'Please select a mobile network.'
      );
      return;
    }

    if (!selectedPlan) {
      Alert.alert(
        'Select Data Plan',
        'Please select a data plan before continuing.'
      );
      return;
    }

    setPin('');
    setPinModalVisible(true);
  };

  const confirmPurchase = async () => {
    if (pin.length < 4) {
      Alert.alert(
        'Invalid PIN',
        'Enter your transaction PIN.'
      );
      return;
    }

    if (!selectedNetwork || !selectedPlan) {
      return;
    }

    setPurchasing(true);

    try {
      const token = await AsyncStorage.getItem(
        'zenimonies_token'
      );

      if (!token) {
        throw new Error(
          'Your session has expired. Please log in again.'
        );
      }

      const response = await fetch(
        `${API_BASE}/data`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            network: selectedNetwork,
            phone,
            variation_code:
              selectedPlan.variation_code,
            transaction_pin: pin,
          }),
        }
      );

      const responseData = await response.json();

      setPinModalVisible(false);
      setPin('');

      const status = String(
        responseData.status || ''
      ).toLowerCase();

      if (
        responseData.success === true &&
        status === 'completed'
      ) {
        setTransactionResult({
          status: 'completed',
          message:
            responseData.message ||
            'Your data purchase was successful.',
          network: responseData.network || selectedNetwork,
          phone: responseData.phone || phone,
          plan: responseData.plan || selectedPlan,
          reference: responseData.reference,
        });

        setTransactionReference(
          responseData.reference || ''
        );

        setResultModalVisible(true);
        return;
      }

      if (
        response.status === 202 ||
        status === 'pending'
      ) {
        setTransactionResult({
          status: 'pending',
          message:
            responseData.message ||
            'Your data purchase is being processed.',
          network: responseData.network || selectedNetwork,
          phone: responseData.phone || phone,
          plan: responseData.plan || selectedPlan,
          reference: responseData.reference,
        });

        setTransactionReference(
          responseData.reference || ''
        );

        setResultModalVisible(true);
        return;
      }

      if (
        status === 'failed' ||
        responseData.success === false
      ) {
        setTransactionResult({
          status: 'failed',
          message:
            responseData.message ||
            'Data purchase failed. If your wallet was debited, the refund will be processed.',
          network: selectedNetwork,
          phone,
          plan: selectedPlan,
          reference: responseData.reference,
        });

        setTransactionReference(
          responseData.reference || ''
        );

        setResultModalVisible(true);
        return;
      }

      setTransactionResult({
        status: 'pending',
        message:
          responseData.message ||
          'Your transaction status is being confirmed.',
        network: selectedNetwork,
        phone,
        plan: selectedPlan,
        reference: responseData.reference,
      });

      setTransactionReference(
        responseData.reference || ''
      );

      setResultModalVisible(true);
    } catch (error: any) {
      setPinModalVisible(false);
      setPin('');

      setTransactionResult({
        status: 'failed',
        message:
          error?.message ||
          'Unable to complete your data purchase.',
        network: selectedNetwork,
        phone,
        plan: selectedPlan,
      });

      setResultModalVisible(true);
    } finally {
      setPurchasing(false);
    }
  };

  // ----------------------------------------------------------
  // RESET
  // ----------------------------------------------------------

  const resetPurchase = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
    setTransactionReference('');
    setSelectedPlan(null);
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (selectedNetwork) {
                loadPlans(selectedNetwork, true);
              }
            }}
            tintColor={theme.green}
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
            Buy Data
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.muted },
            ]}
          >
            Purchase affordable data bundles instantly.
          </Text>
        </View>

        {/* PHONE NUMBER */}

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              { color: theme.text },
            ]}
          >
            Phone Number
          </Text>

          <View
            style={[
              styles.phoneInputContainer,
              { borderColor: theme.border },
            ]}
          >
            <Text style={styles.countryCode}>
              🇳🇬 +234
            </Text>

            <TextInput
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={11}
              placeholder="08012345678"
              placeholderTextColor={theme.muted}
              style={[
                styles.phoneInput,
                { color: theme.text },
              ]}
            />
          </View>

          <Text
            style={[
              styles.helperText,
              { color: theme.muted },
            ]}
          >
            Enter the Nigerian phone number receiving the data.
          </Text>

          {/* DETECTED NETWORK */}

          {detectedNetwork && (
            <View style={styles.detectedNetwork}>
              <Text
                style={[
                  styles.detectedLabel,
                  { color: theme.muted },
                ]}
              >
                Detected network
              </Text>

              <View style={styles.detectedNetworkInfo}>
                <NetworkLogo
                  network={
                    NETWORKS.find(
                      (network) =>
                        network.value === detectedNetwork
                    )!
                  }
                  size={34}
                />

                <Text
                  style={[
                    styles.detectedNetworkName,
                    { color: theme.text },
                  ]}
                >
                  {
                    NETWORKS.find(
                      (network) =>
                        network.value === detectedNetwork
                    )?.label
                  }
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* NETWORK SELECTOR */}

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              { color: theme.text },
            ]}
          >
            Select Network
          </Text>

          <View style={styles.networkGrid}>
            {NETWORKS.map((network) => {
              const selected =
                selectedNetwork === network.value;

              return (
                <TouchableOpacity
                  key={network.value}
                  activeOpacity={0.8}
                  onPress={() =>
                    setSelectedNetwork(network.value)
                  }
                  style={[
                    styles.networkItem,
                    {
                      borderColor: selected
                        ? theme.green
                        : theme.border,
                      backgroundColor: selected
                        ? `${theme.green}12`
                        : theme.card,
                    },
                  ]}
                >
                  <NetworkLogo network={network} size={44} />

                  <Text
                    style={[
                      styles.networkName,
                      { color: theme.text },
                    ]}
                  >
                    {network.label}
                  </Text>

                  {selected && (
                    <View
                      style={[
                        styles.selectedIndicator,
                        { backgroundColor: theme.green },
                      ]}
                    >
                      <Text style={styles.selectedCheck}>
                        ✓
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PLAN CATALOGUE */}

        {selectedNetwork && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card },
            ]}
          >
            <View style={styles.planHeader}>
              <View>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: theme.text },
                  ]}
                >
                  Available Data Plans
                </Text>

                <Text
                  style={[
                    styles.planCount,
                    { color: theme.muted },
                  ]}
                >
                  {plans.length} plans available
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  loadPlans(selectedNetwork, true)
                }
                disabled={loadingPlans}
                style={styles.refreshButton}
              >
                <Text
                  style={[
                    styles.refreshText,
                    { color: theme.green },
                  ]}
                >
                  ↻ Refresh
                </Text>
              </TouchableOpacity>
            </View>

            {/* LOADING */}

            {loadingPlans && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={theme.green}
                />

                <Text
                  style={[
                    styles.loadingText,
                    { color: theme.muted },
                  ]}
                >
                  Loading data plans...
                </Text>
              </View>
            )}

            {/* ERROR */}

            {!loadingPlans && plansError !== '' && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>

                <Text
                  style={[
                    styles.errorText,
                    { color: theme.text },
                  ]}
                >
                  {plansError}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    loadPlans(selectedNetwork)
                  }
                  style={[
                    styles.retryButton,
                    { backgroundColor: theme.green },
                  ]}
                >
                  <Text style={styles.retryText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SEARCH */}

            {!loadingPlans && plans.length > 0 && (
              <>
                <View
                  style={[
                    styles.searchContainer,
                    { borderColor: theme.border },
                  ]}
                >
                  <Text style={styles.searchIcon}>
                    🔍
                  </Text>

                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search data plans..."
                    placeholderTextColor={theme.muted}
                    style={[
                      styles.searchInput,
                      { color: theme.text },
                    ]}
                  />

                  {search.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearch('')}
                    >
                      <Text
                        style={[
                          styles.clearSearch,
                          { color: theme.muted },
                        ]}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* CATEGORIES */}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
                  {CATEGORIES.map((item) => {
                    const active = category === item;

                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setCategory(item)}
                        style={[
                          styles.categoryButton,
                          {
                            backgroundColor: active
                              ? theme.green
                              : theme.background,
                            borderColor: active
                              ? theme.green
                              : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            {
                              color: active
                                ? '#FFFFFF'
                                : theme.text,
                            },
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* PLAN LIST */}

                {filteredPlans.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>
                      📦
                    </Text>

                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: theme.text },
                      ]}
                    >
                      No plans found
                    </Text>

                    <Text
                      style={[
                        styles.emptyDescription,
                        { color: theme.muted },
                      ]}
                    >
                      Try another category or search term.
                    </Text>
                  </View>
                )}

                {filteredPlans.map((plan) => {
                  const selected =
                    selectedPlan?.variation_code ===
                    plan.variation_code;

                  return (
                    <TouchableOpacity
                      key={plan.variation_code}
                      activeOpacity={0.8}
                      onPress={() => setSelectedPlan(plan)}
                      style={[
                        styles.planItem,
                        {
                          borderColor: selected
                            ? theme.green
                            : theme.border,
                          backgroundColor: selected
                            ? `${theme.green}10`
                            : theme.card,
                        },
                      ]}
                    >
                      <View style={styles.planMain}>
                        <View style={styles.planDetails}>
                          <Text
                            style={[
                              styles.planName,
                              { color: theme.text },
                            ]}
                          >
                            {plan.name}
                          </Text>

                          {!!plan.allowance && (
                            <Text
                              style={[
                                styles.planAllowance,
                                { color: theme.muted },
                              ]}
                            >
                              {plan.allowance}
                            </Text>
                          )}

                          {!!plan.validity && (
                            <Text
                              style={[
                                styles.planValidity,
                                { color: theme.muted },
                              ]}
                            >
                              Validity: {plan.validity}
                            </Text>
                          )}

                          {!!plan.description &&
                            plan.description !== plan.name && (
                              <Text
                                style={[
                                  styles.planDescription,
                                  { color: theme.muted },
                                ]}
                              >
                                {plan.description}
                              </Text>
                            )}

                          <View style={styles.planTags}>
                            <View
                              style={[
                                styles.planTag,
                                {
                                  backgroundColor: `${theme.green}15`,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.planTagText,
                                  { color: theme.green },
                                ]}
                              >
                                {getCategory(plan)}
                              </Text>
                            </View>

                            {plan.isPromotional && (
                              <View
                                style={[
                                  styles.planTag,
                                  {
                                    backgroundColor: '#FFF3CD',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.planTagText,
                                    { color: '#856404' },
                                  ]}
                                >
                                  Promo
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.planPriceContainer}>
                          <Text
                            style={[
                              styles.planPrice,
                              { color: theme.green },
                            ]}
                          >
                            {formatCurrency(plan.amount)}
                          </Text>

                          <View
                            style={[
                              styles.radioOuter,
                              {
                                borderColor: selected
                                  ? theme.green
                                  : theme.border,
                              },
                            ]}
                          >
                            {selected && (
                              <View
                                style={[
                                  styles.radioInner,
                                  {
                                    backgroundColor:
                                      theme.green,
                                  },
                                ]}
                              />
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* SELECTED PLAN SUMMARY */}

        {selectedPlan && (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.card },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.text },
              ]}
            >
              Purchase Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.muted },
                ]}
              >
                Network
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  { color: theme.text },
                ]}
              >
                {currentNetwork?.label}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.muted },
                ]}
              >
                Phone Number
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  { color: theme.text },
                ]}
              >
                {phone}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.muted },
                ]}
              >
                Data Plan
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  { color: theme.text },
                ]}
              >
                {selectedPlan.name}
              </Text>
            </View>

            <View
              style={[
                styles.summaryDivider,
                { borderColor: theme.border },
              ]}
            />

            <View style={styles.summaryTotal}>
              <Text
                style={[
                  styles.totalLabel,
                  { color: theme.text },
                ]}
              >
                Total
              </Text>

              <Text
                style={[
                  styles.totalAmount,
                  { color: theme.green },
                ]}
              >
                {formatCurrency(selectedPlan.amount)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handlePurchase}
              disabled={purchasing}
              style={[
                styles.purchaseButton,
                { backgroundColor: theme.green },
              ]}
            >
              <Text style={styles.purchaseButtonText}>
                Continue to Purchase
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* NETWORK MODAL */}

      <Modal
        visible={networkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setNetworkModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}
            >
              Select Network
            </Text>

            {NETWORKS.map((network) => (
              <TouchableOpacity
                key={network.value}
                onPress={() => {
                  setSelectedNetwork(network.value);
                  setNetworkModalVisible(false);
                }}
                style={[
                  styles.modalNetworkItem,
                  { borderColor: theme.border },
                ]}
              >
                <NetworkLogo network={network} size={42} />

                <Text
                  style={[
                    styles.modalNetworkText,
                    { color: theme.text },
                  ]}
                >
                  {network.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() =>
                setNetworkModalVisible(false)
              }
              style={styles.modalCloseButton}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: theme.muted },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TRANSACTION PIN MODAL */}

      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!purchasing) {
            setPinModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={styles.modalIcon}>🔐</Text>

            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}
            >
              Confirm Purchase
            </Text>

            <Text
              style={[
                styles.modalSubtitle,
                { color: theme.muted },
              ]}
            >
              Enter your transaction PIN to purchase
              {'\n'}
              {selectedPlan?.name}
            </Text>

            <Text
              style={[
                styles.pinAmount,
                { color: theme.green },
              ]}
            >
              {formatCurrency(
                selectedPlan?.amount || 0
              )}
            </Text>

            <TextInput
              value={pin}
              onChangeText={(value) =>
                setPin(value.replace(/\D/g, '').slice(0, 6))
              }
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="Enter transaction PIN"
              placeholderTextColor={theme.muted}
              style={[
                styles.pinInput,
                {
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />

            <TouchableOpacity
              onPress={confirmPurchase}
              disabled={purchasing}
              style={[
                styles.purchaseButton,
                { backgroundColor: theme.green },
              ]}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  Confirm Purchase
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!purchasing) {
                  setPinModalVisible(false);
                  setPin('');
                }
              }}
              disabled={purchasing}
              style={styles.modalCloseButton}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: theme.muted },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TRANSACTION RESULT MODAL */}

      <Modal
        visible={resultModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetPurchase}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={styles.resultIcon}>
              {transactionResult?.status === 'completed'
                ? '✅'
                : transactionResult?.status === 'pending'
                ? '⏳'
                : '❌'}
            </Text>

            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}
            >
              {transactionResult?.status === 'completed'
                ? 'Purchase Successful'
                : transactionResult?.status === 'pending'
                ? 'Transaction Pending'
                : 'Purchase Failed'}
            </Text>

            <Text
              style={[
                styles.modalSubtitle,
                { color: theme.muted },
              ]}
            >
              {transactionResult?.message}
            </Text>

            {transactionResult?.plan && (
              <View
                style={[
                  styles.resultSummary,
                  { borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.resultPlanName,
                    { color: theme.text },
                  ]}
                >
                  {transactionResult.plan.name}
                </Text>

                <Text
                  style={[
                    styles.resultAmount,
                    { color: theme.green },
                  ]}
                >
                  {formatCurrency(
                    transactionResult.plan.amount
                  )}
                </Text>

                <Text
                  style={[
                    styles.resultPhone,
                    { color: theme.muted },
                  ]}
                >
                  {transactionResult.phone}
                </Text>
              </View>
            )}

            {!!transactionReference && (
              <View style={styles.referenceContainer}>
                <Text
                  style={[
                    styles.referenceLabel,
                    { color: theme.muted },
                  ]}
                >
                  Transaction Reference
                </Text>

                <Text
                  style={[
                    styles.referenceText,
                    { color: theme.text },
                  ]}
                >
                  {transactionReference}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={resetPurchase}
              style={[
                styles.purchaseButton,
                { backgroundColor: theme.green },
              ]}
            >
              <Text style={styles.purchaseButtonText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 13,
    marginTop: 5,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },

  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 12,
  },

  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
  },

  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },

  helperText: {
    fontSize: 11,
    marginTop: 8,
  },

  detectedNetwork: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E9EDE5',
  },

  detectedLabel: {
    fontSize: 11,
    marginBottom: 8,
  },

  detectedNetworkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detectedNetworkName: {
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },

  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },

  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  networkItem: {
    width: '48%',
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    position: 'relative',
  },

  networkName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },

  selectedIndicator: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedCheck: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  planCount: {
    fontSize: 11,
    marginTop: -5,
  },

  refreshButton: {
    padding: 8,
  },

  refreshText: {
    fontSize: 13,
    fontWeight: '700',
  },

  loadingContainer: {
    paddingVertical: 35,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },

  errorContainer: {
    paddingVertical: 25,
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  errorText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 15,
  },

  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 45,
    paddingHorizontal: 12,
    marginTop: 16,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
  },

  clearSearch: {
    fontSize: 15,
    paddingHorizontal: 5,
  },

  categoryScroll: {
    marginTop: 14,
    marginBottom: 10,
  },

  categoryButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
  },

  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },

  planItem: {
    borderWidth: 1.2,
    borderRadius: 13,
    padding: 13,
    marginBottom: 10,
  },

  planMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  planDetails: {
    flex: 1,
    paddingRight: 10,
  },

  planName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  planAllowance: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  planValidity: {
    fontSize: 11,
    marginTop: 3,
  },

  planDescription: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  planTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },

  planTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 5,
    marginBottom: 4,
  },

  planTagText: {
    fontSize: 9,
    fontWeight: '700',
  },

  planPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  planPrice: {
    fontSize: 14,
    fontWeight: '800',
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  emptyContainer: {
    paddingVertical: 35,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 35,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },

  emptyDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },

  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  summaryLabel: {
    fontSize: 12,
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },

  summaryDivider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },

  summaryTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },

  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
  },

  purchaseButton: {
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpacing: {
    height: 30,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContainer: {
    width: '100%',
    borderRadius: 22,
    padding: 22,
  },

  modalIcon: {
    fontSize: 35,
    textAlign: 'center',
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 15,
  },

  modalNetworkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },

  modalNetworkText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },

  modalCloseButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 5,
  },

  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
  },

  pinAmount: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },

  pinInput: {
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 8,
    marginBottom: 15,
  },

  resultIcon: {
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 12,
  },

  resultSummary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginVertical: 12,
    alignItems: 'center',
  },

  resultPlanName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  resultAmount: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 8,
  },

  resultPhone: {
    fontSize: 12,
    marginTop: 6,
  },

  referenceContainer: {
    marginVertical: 12,
  },

  referenceLabel: {
    fontSize: 10,
    marginBottom: 5,
    textAlign: 'center',
  },

  referenceText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DataScreen;
