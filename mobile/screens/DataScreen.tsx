import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  token?: string;
  onBack?: () => void;
  onComplete?: () => void;
  colors?: any;
  isDark?: boolean;
}

interface DataPlan {
  variation_code: string;
  name: string;
  amount: number;
  network?: string;
  validity?: string;
  allowance?: string;
  description?: string;
  category?: string;
  fixedPrice?: boolean;
  isPromotional?: boolean;
  raw?: any;
}

interface NetworkItem {
  id: string;
  name: string;
  logo: any;
  color: string;
}

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const NETWORKS: NetworkItem[] = [
  {
    id: 'mtn',
    name: 'MTN',
    logo: require('../assets/network-logos/mtn-nigeria-communications-plc--600.png'),
    color: '#FFCC00',
  },
  {
    id: 'airtel',
    name: 'Airtel',
    logo: require('../assets/network-logos/airtel.png'),
    color: '#E60000',
  },
  {
    id: 'glo',
    name: 'Glo',
    logo: require('../assets/network-logos/glo.png'),
    color: '#00A859',
  },
  {
    id: 't2mobile',
    name: 'T2 Mobile',
    logo: require('../assets/network-logos/T2-Mobilr.jpg'),
    color: '#222222',
  },
];

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

// ZENIMONIES BRAND COLORS
const COLORS = {
  green: '#78A900',
  darkGreen: '#527900',
  black: '#172018',
  muted: '#858B83',
  background: '#F6F8F3',
  white: '#FFFFFF',
  border: '#E9EDE5',
  red: '#E53935',
  orange: '#F59E0B',
};

const DataScreen = ({
  token,
  onBack,
  onComplete,
  colors,
  isDark = false,
}: Props) => {
  const theme = {
    background:
      colors?.background ??
      (isDark ? '#121712' : COLORS.background),

    card:
      colors?.card ??
      (isDark ? '#202720' : COLORS.white),

    text:
      colors?.text ??
      (isDark ? '#FFFFFF' : COLORS.black),

    muted:
      colors?.muted ??
      (isDark ? '#A4ADA4' : COLORS.muted),

    border:
      colors?.border ??
      (isDark ? '#303A30' : COLORS.border),

    green:
      colors?.primary ??
      COLORS.green,

    darkGreen:
      colors?.darkGreen ??
      COLORS.darkGreen,
  };

  const authToken = token || '';

  const requestCounter = useRef(0);

  const [selectedNetwork, setSelectedNetwork] =
    useState<NetworkItem>(NETWORKS[0]);

  const [phone, setPhone] = useState('');

  const [plans, setPlans] = useState<DataPlan[]>([]);

  const [selectedPlan, setSelectedPlan] =
    useState<DataPlan | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState('All Plans');

  const [search, setSearch] = useState('');

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [networkModalVisible, setNetworkModalVisible] =
    useState(false);

  const [pinModalVisible, setPinModalVisible] =
    useState(false);

  const [transactionPin, setTransactionPin] =
    useState('');

  const [resultModalVisible, setResultModalVisible] =
    useState(false);

  const [transactionResult, setTransactionResult] =
    useState<any>(null);

  // --------------------------------------------------
  // NETWORK SELECTION
  // --------------------------------------------------

  const selectNetwork = (network: NetworkItem) => {
    setSelectedNetwork(network);
    setSelectedPlan(null);
    setSelectedCategory('All Plans');
    setSearch('');
    setNetworkModalVisible(false);
  };

  // --------------------------------------------------
  // PHONE NUMBER
  // --------------------------------------------------

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');

    setPhone(cleaned.slice(0, 11));
  };

  // --------------------------------------------------
  // DATA PLAN CATEGORY
  // --------------------------------------------------

  const getPlanCategory = (
    plan: DataPlan,
  ): string => {
    const text = [
      plan.name,
      plan.validity,
      plan.allowance,
      plan.description,
      plan.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Night plans
    if (
      text.includes('night') ||
      text.includes('midnight')
    ) {
      return 'Night';
    }

    // Weekend plans
    if (
      text.includes('weekend') ||
      text.includes('saturday') ||
      text.includes('sunday')
    ) {
      return 'Weekend';
    }

    // Hourly plans
    if (
      text.includes('hourly') ||
      /\d+\s*hours?/.test(text) ||
      /\d+\s*hrs?/.test(text)
    ) {
      return 'Hourly';
    }

    // 3 months
    if (
      text.includes('3 month') ||
      text.includes('90 day') ||
      text.includes('90 days') ||
      text.includes('quarterly')
    ) {
      return '3 Months';
    }

    // Daily
    if (
      text.includes('daily') ||
      text.includes('1 day') ||
      text.includes('1 days') ||
      text.includes('24 hour') ||
      text.includes('24hrs') ||
      text.includes('24 hrs')
    ) {
      return 'Daily';
    }

    // Weekly
    if (
      text.includes('weekly') ||
      text.includes('7 day') ||
      text.includes('7 days') ||
      text.includes('5 day') ||
      text.includes('5 days') ||
      text.includes('6 day') ||
      text.includes('6 days') ||
      text.includes('2 day') ||
      text.includes('2 days') ||
      text.includes('3 day') ||
      text.includes('3 days') ||
      text.includes('4 day') ||
      text.includes('4 days')
    ) {
      return 'Weekly';
    }

    // Monthly
    if (
      text.includes('monthly') ||
      text.includes('30 day') ||
      text.includes('30 days') ||
      text.includes('31 day') ||
      text.includes('31 days') ||
      text.includes('28 day') ||
      text.includes('28 days')
    ) {
      return 'Monthly';
    }

    // Promotional
    if (
      plan.isPromotional ||
      text.includes('promo') ||
      text.includes('bonus') ||
      text.includes('special')
    ) {
      return 'Special';
    }

    // Hot deals
    if (
      text.includes('hot deal') ||
      text.includes('hot deals')
    ) {
      return 'Hot Deals';
    }

    return 'Other';
  };

  // --------------------------------------------------
  // LOAD DATA PLANS
  // --------------------------------------------------

  const loadPlans = useCallback(async () => {
    if (!authToken) {
      setPlans([]);
      return;
    }

    const currentRequest =
      ++requestCounter.current;

    setLoadingPlans(true);
    setPlans([]);
    setSelectedPlan(null);

    try {
      const response = await fetch(
        `${API_BASE}/data/plans?network=${selectedNetwork.id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
          },
        },
      );

      const data = await response.json();

      if (currentRequest !== requestCounter.current) {
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load data plans.',
        );
      }

      const receivedPlans: DataPlan[] =
        Array.isArray(data.plans)
          ? data.plans
          : [];

      setPlans(receivedPlans);
    } catch (error: any) {
      if (currentRequest !== requestCounter.current) {
        return;
      }

      console.log('Data plans error:', error);

      setPlans([]);

      Alert.alert(
        'Unable to load plans',
        error?.message ||
          'Please check your connection and try again.',
      );
    } finally {
      if (currentRequest === requestCounter.current) {
        setLoadingPlans(false);
      }
    }
  }, [authToken, selectedNetwork.id]);

  useEffect(() => {
    loadPlans();

    return () => {
      requestCounter.current++;
    };
  }, [loadPlans]);

  // --------------------------------------------------
  // FILTER PLANS
  // --------------------------------------------------

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const category = getPlanCategory(plan);

      const matchesCategory =
        selectedCategory === 'All Plans' ||
        category === selectedCategory;

      const searchText = [
        plan.name,
        plan.allowance,
        plan.validity,
        plan.description,
        plan.category,
        plan.amount,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        search.trim() === '' ||
        searchText.includes(search.trim().toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [plans, selectedCategory, search]);

  // --------------------------------------------------
  // CURRENCY
  // --------------------------------------------------

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // --------------------------------------------------
  // PURCHASE
  // --------------------------------------------------

  const handleContinue = () => {
    if (!phone.trim()) {
      Alert.alert(
        'Phone number required',
        'Please enter the phone number you want to recharge.',
      );
      return;
    }

    if (!/^0\d{10}$/.test(phone)) {
      Alert.alert(
        'Invalid phone number',
        'Enter a valid 11-digit Nigerian phone number.',
      );
      return;
    }

    if (!selectedPlan) {
      Alert.alert(
        'Select a data plan',
        'Please select a data plan to continue.',
      );
      return;
    }

    if (!authToken) {
      Alert.alert(
        'Session expired',
        'Please log in again to continue.',
      );
      return;
    }

    setTransactionPin('');
    setPinModalVisible(true);
  };

  const handlePurchase = async () => {
    if (transactionPin.length !== 4) {
      Alert.alert(
        'Invalid PIN',
        'Please enter your 4-digit transaction PIN.',
      );
      return;
    }

    if (!selectedPlan) {
      return;
    }

    setPurchasing(true);

    try {
      const response = await fetch(
        `${API_BASE}/data`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            network: selectedNetwork.id,
            phone,
            variation_code:
              selectedPlan.variation_code,
            transaction_pin: transactionPin,
          }),
        },
      );

      const data = await response.json();

      setPinModalVisible(false);
      setTransactionPin('');

      setTransactionResult({
        ...data,
        httpStatus: response.status,
        amount: selectedPlan.amount,
        phone,
        network: selectedNetwork.name,
        plan: selectedPlan.name,
      });

      setResultModalVisible(true);
    } catch (error: any) {
      setPinModalVisible(false);
      setTransactionPin('');

      setTransactionResult({
        success: false,
        status: 'failed',
        message:
          error?.message ||
          'Unable to complete your data purchase.',
        amount: selectedPlan.amount,
        phone,
        network: selectedNetwork.name,
        plan: selectedPlan.name,
      });

      setResultModalVisible(true);
    } finally {
      setPurchasing(false);
    }
  };

  // --------------------------------------------------
  // TRANSACTION STATUS
  // --------------------------------------------------

  const getTransactionStatus = () => {
    const result = transactionResult;

    if (!result) {
      return 'failed';
    }

    const status = String(
      result.status ||
        result.transaction?.status ||
        result.data?.status ||
        '',
    ).toLowerCase();

    if (
      result.success === true ||
      status === 'completed' ||
      status === 'successful' ||
      status === 'success'
    ) {
      return 'success';
    }

    if (
      status === 'pending' ||
      status === 'processing' ||
      status === 'unknown'
    ) {
      return 'pending';
    }

    return 'failed';
  };

  const closeResultModal = () => {
    setResultModalVisible(false);

    if (getTransactionStatus() === 'success') {
      onComplete?.();
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={onBack}
        >
          <Text
            style={[
              styles.backText,
              { color: theme.text },
            ]}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.text },
            ]}
          >
            Buy Data
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.muted },
            ]}
          >
            Buy data bundles instantly
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* PHONE NUMBER AND NETWORK DROPDOWN */}

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          Phone Number
        </Text>

        <View
          style={[
            styles.phoneInputContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* COUNTRY CODE */}

          <View style={styles.countryContainer}>
            <Text style={styles.countryFlag}>
              🇳🇬
            </Text>

            <Text
              style={[
                styles.countryCode,
                { color: theme.text },
              ]}
            >
              +234
            </Text>
          </View>

          {/* PHONE */}

          <TextInput
            style={[
              styles.phoneInput,
              { color: theme.text },
            ]}
            placeholder="08012345678"
            placeholderTextColor={theme.muted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={handlePhoneChange}
            maxLength={11}
          />

          {/* NETWORK DROPDOWN */}

          <TouchableOpacity
            style={[
              styles.networkDropdown,
              {
                borderLeftColor: theme.border,
              },
            ]}
            onPress={() =>
              setNetworkModalVisible(true)
            }
          >
            <Image
              source={selectedNetwork.logo}
              style={styles.dropdownLogo}
              resizeMode="contain"
            />

            <Text
              style={[
                styles.dropdownNetworkName,
                { color: theme.text },
              ]}
            >
              {selectedNetwork.name}
            </Text>

            <Text
              style={[
                styles.dropdownArrow,
                { color: theme.muted },
              ]}
            >
              ▾
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.helperText,
            { color: theme.muted },
          ]}
        >
          Data will be sent to this phone number.
        </Text>

        {/* SEARCH */}

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={styles.searchIcon}>
            🔍
          </Text>

          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text },
            ]}
            placeholder="Search data plans..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
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
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map(category => {
            const active =
              selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: active
                      ? theme.green
                      : theme.card,
                    borderColor: active
                      ? theme.green
                      : theme.border,
                  },
                ]}
                onPress={() =>
                  setSelectedCategory(category)
                }
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
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* PLANS HEADER */}

        <View style={styles.plansHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text },
            ]}
          >
            Available Plans
          </Text>

          {!loadingPlans && (
            <Text
              style={[
                styles.planCount,
                { color: theme.muted },
              ]}
            >
              {filteredPlans.length} plans
            </Text>
          )}
        </View>

        {/* LOADING */}

        {loadingPlans ? (
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
              Loading {selectedNetwork.name} plans...
            </Text>
          </View>
        ) : filteredPlans.length === 0 ? (
          /* EMPTY STATE */

          <View
            style={[
              styles.emptyContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
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
                styles.emptyMessage,
                { color: theme.muted },
              ]}
            >
              {plans.length === 0
                ? `No data plans are currently available for ${selectedNetwork.name}.`
                : `No ${selectedCategory.toLowerCase()} plans found. Try All Plans.`}
            </Text>

            <TouchableOpacity
              style={[
                styles.retryButton,
                { backgroundColor: theme.green },
              ]}
              onPress={() => {
                setSelectedCategory('All Plans');
                setSearch('');
                loadPlans();
              }}
            >
              <Text style={styles.retryButtonText}>
                Reload Plans
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* PLANS */

          <View style={styles.plansContainer}>
            {filteredPlans.map((plan, index) => {
              const active =
                selectedPlan?.variation_code ===
                plan.variation_code;

              const category =
                getPlanCategory(plan);

              return (
                <TouchableOpacity
                  key={`${plan.variation_code}-${index}`}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: active
                        ? theme.green
                        : theme.border,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                  onPress={() =>
                    setSelectedPlan(plan)
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.planTop}>
                    <View style={styles.planDetails}>
                      <Text
                        style={[
                          styles.planName,
                          { color: theme.text },
                        ]}
                      >
                        {plan.name}
                      </Text>

                      {plan.allowance && (
                        <Text
                          style={[
                            styles.planAllowance,
                            { color: theme.muted },
                          ]}
                        >
                          {plan.allowance}
                        </Text>
                      )}

                      {plan.validity && (
                        <Text
                          style={[
                            styles.planValidity,
                            { color: theme.muted },
                          ]}
                        >
                          Validity: {plan.validity}
                        </Text>
                      )}
                    </View>

                    <View style={styles.planPriceContainer}>
                      <Text
                        style={[
                          styles.planPrice,
                          { color: theme.green },
                        ]}
                      >
                        {formatAmount(
                          Number(plan.amount) || 0,
                        )}
                      </Text>

                      {active && (
                        <View
                          style={[
                            styles.selectedIndicator,
                            {
                              backgroundColor:
                                theme.green,
                            },
                          ]}
                        >
                          <Text style={styles.checkText}>
                            ✓
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.planBottom}>
                    <View
                      style={[
                        styles.planCategoryBadge,
                        {
                          backgroundColor: isDark
                            ? '#303A30'
                            : '#F0F5E8',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.planCategoryText,
                          { color: theme.green },
                        ]}
                      >
                        {category}
                      </Text>
                    </View>

                    {plan.isPromotional && (
                      <View style={styles.promoBadge}>
                        <Text style={styles.promoText}>
                          PROMO
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* PURCHASE SUMMARY */}

        {selectedPlan && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.summaryTitle,
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

              <View style={styles.summaryNetwork}>
                <Image
                  source={selectedNetwork.logo}
                  style={styles.summaryLogo}
                  resizeMode="contain"
                />

                <Text
                  style={[
                    styles.summaryValue,
                    { color: theme.text },
                  ]}
                >
                  {selectedNetwork.name}
                </Text>
              </View>
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
                {phone || 'Not entered'}
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

            <View style={styles.summaryRow}>
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
                {formatAmount(
                  Number(selectedPlan.amount) || 0,
                )}
              </Text>
            </View>
          </View>
        )}

        {/* CONTINUE */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: theme.green,
              opacity: selectedPlan ? 1 : 0.5,
            },
          ]}
          disabled={!selectedPlan}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>

          <Text style={styles.continueArrow}>
            →
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* NETWORK DROPDOWN MODAL */}

      <Modal
        visible={networkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setNetworkModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.networkModal,
              { backgroundColor: theme.card },
            ]}
          >
            <View style={styles.modalHandle} />

            <Text
              style={[
                styles.networkModalTitle,
                { color: theme.text },
              ]}
            >
              Select Network
            </Text>

            <Text
              style={[
                styles.networkModalSubtitle,
                { color: theme.muted },
              ]}
            >
              Choose the mobile network for this number
            </Text>

            {NETWORKS.map(network => {
              const active =
                selectedNetwork.id === network.id;

              return (
                <TouchableOpacity
                  key={network.id}
                  style={[
                    styles.networkOption,
                    {
                      backgroundColor: active
                        ? isDark
                          ? '#303A30'
                          : '#F0F5E8'
                        : theme.card,
                      borderColor: active
                        ? theme.green
                        : theme.border,
                    },
                  ]}
                  onPress={() =>
                    selectNetwork(network)
                  }
                >
                  <Image
                    source={network.logo}
                    style={styles.networkOptionLogo}
                    resizeMode="contain"
                  />

                  <Text
                    style={[
                      styles.networkOptionName,
                      { color: theme.text },
                    ]}
                  >
                    {network.name}
                  </Text>

                  {active && (
                    <View
                      style={[
                        styles.networkCheck,
                        { backgroundColor: theme.green },
                      ]}
                    >
                      <Text style={styles.checkText}>
                        ✓
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.networkModalCancel}
              onPress={() =>
                setNetworkModalVisible(false)
              }
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: theme.muted },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN MODAL */}

      <Modal
        visible={pinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setPinModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>
                🔐
              </Text>
            </View>

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
              Enter your 4-digit transaction PIN
            </Text>

            {selectedPlan && (
              <View
                style={[
                  styles.modalSummary,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalPlanName,
                    { color: theme.text },
                  ]}
                >
                  {selectedPlan.name}
                </Text>

                <View style={styles.modalNetworkRow}>
                  <Image
                    source={selectedNetwork.logo}
                    style={styles.modalNetworkLogo}
                    resizeMode="contain"
                  />

                  <Text
                    style={[
                      styles.modalPhone,
                      { color: theme.muted },
                    ]}
                  >
                    {selectedNetwork.name} • {phone}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.modalAmount,
                    { color: theme.green },
                  ]}
                >
                  {formatAmount(
                    Number(selectedPlan.amount) || 0,
                  )}
                </Text>
              </View>
            )}

            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="••••"
              placeholderTextColor={theme.muted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={transactionPin}
              onChangeText={value =>
                setTransactionPin(
                  value.replace(/\D/g, '').slice(0, 4),
                )
              }
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: theme.green,
                  opacity:
                    transactionPin.length === 4 &&
                    !purchasing
                      ? 1
                      : 0.5,
                },
              ]}
              disabled={
                transactionPin.length !== 4 ||
                purchasing
              }
              onPress={handlePurchase}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm & Buy Data
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setPinModalVisible(false);
                setTransactionPin('');
              }}
              disabled={purchasing}
            >
              <Text
                style={[
                  styles.cancelButtonText,
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
        onRequestClose={closeResultModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.resultModal,
              { backgroundColor: theme.card },
            ]}
          >
            {getTransactionStatus() === 'success' ? (
              <>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: '#E7F6E8' },
                  ]}
                >
                  <Text style={styles.resultIconText}>
                    ✓
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultTitle,
                    { color: theme.text },
                  ]}
                >
                  Purchase Successful
                </Text>

                <Text
                  style={[
                    styles.resultMessage,
                    { color: theme.muted },
                  ]}
                >
                  Your data purchase has been completed
                  successfully.
                </Text>
              </>
            ) : getTransactionStatus() === 'pending' ? (
              <>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: '#FFF4DF' },
                  ]}
                >
                  <Text style={styles.resultIconText}>
                    ⏳
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultTitle,
                    { color: theme.text },
                  ]}
                >
                  Transaction Pending
                </Text>

                <Text
                  style={[
                    styles.resultMessage,
                    { color: theme.muted },
                  ]}
                >
                  Your transaction is being processed.
                  Please wait for confirmation.
                </Text>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: '#FDE8E8' },
                  ]}
                >
                  <Text style={styles.resultIconText}>
                    ✕
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultTitle,
                    { color: theme.text },
                  ]}
                >
                  Purchase Failed
                </Text>

                <Text
                  style={[
                    styles.resultMessage,
                    { color: theme.muted },
                  ]}
                >
                  {transactionResult?.message ||
                    transactionResult?.error ||
                    'Your data purchase could not be completed.'}
                </Text>
              </>
            )}

            {transactionResult && (
              <View
                style={[
                  styles.resultDetails,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.resultRow}>
                  <Text
                    style={[
                      styles.resultLabel,
                      { color: theme.muted },
                    ]}
                  >
                    Network
                  </Text>

                  <Text
                    style={[
                      styles.resultValue,
                      { color: theme.text },
                    ]}
                  >
                    {transactionResult.network}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text
                    style={[
                      styles.resultLabel,
                      { color: theme.muted },
                    ]}
                  >
                    Phone Number
                  </Text>

                  <Text
                    style={[
                      styles.resultValue,
                      { color: theme.text },
                    ]}
                  >
                    {transactionResult.phone}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text
                    style={[
                      styles.resultLabel,
                      { color: theme.muted },
                    ]}
                  >
                    Plan
                  </Text>

                  <Text
                    style={[
                      styles.resultValue,
                      { color: theme.text },
                    ]}
                  >
                    {transactionResult.plan}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text
                    style={[
                      styles.resultLabel,
                      { color: theme.muted },
                    ]}
                  >
                    Amount
                  </Text>

                  <Text
                    style={[
                      styles.resultValue,
                      { color: theme.green },
                    ]}
                  >
                    {formatAmount(
                      Number(transactionResult.amount) || 0,
                    )}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.resultButton,
                { backgroundColor: theme.green },
              ]}
              onPress={closeResultModal}
            >
              <Text style={styles.resultButtonText}>
                {getTransactionStatus() === 'success'
                  ? 'Done'
                  : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DataScreen;

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },

  headerTitleContainer: {
    marginLeft: 14,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },

  // PHONE + NETWORK

  phoneInputContainer: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 5,
  },

  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  countryFlag: {
    fontSize: 18,
    marginRight: 5,
  },

  countryCode: {
    fontSize: 14,
    fontWeight: '700',
  },

  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 60,
  },

  networkDropdown: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 8,
    borderLeftWidth: 1,
    marginLeft: 5,
  },

  dropdownLogo: {
    width: 28,
    height: 28,
  },

  dropdownNetworkName: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },

  dropdownArrow: {
    fontSize: 13,
    marginLeft: 5,
  },

  helperText: {
    fontSize: 11,
    marginTop: 7,
  },

  // SEARCH

  searchContainer: {
    height: 48,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginTop: 22,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  clearSearch: {
    fontSize: 17,
    paddingHorizontal: 5,
  },

  // CATEGORIES

  categoryContainer: {
    paddingVertical: 15,
    gap: 8,
  },

  categoryButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // PLAN HEADER

  plansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  planCount: {
    fontSize: 12,
    marginTop: 20,
  },

  plansContainer: {
    gap: 10,
  },

  // PLAN CARD

  planCard: {
    borderRadius: 15,
    padding: 15,
  },

  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  planDetails: {
    flex: 1,
    paddingRight: 10,
  },

  planName: {
    fontSize: 15,
    fontWeight: '800',
  },

  planAllowance: {
    fontSize: 13,
    marginTop: 5,
  },

  planValidity: {
    fontSize: 11,
    marginTop: 4,
  },

  planPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  planPrice: {
    fontSize: 17,
    fontWeight: '800',
  },

  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  planBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },

  planCategoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },

  planCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },

  promoBadge: {
    backgroundColor: '#FFF0D8',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },

  promoText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },

  // LOADING

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },

  // EMPTY

  emptyContainer: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  emptyMessage: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },

  retryButton: {
    paddingHorizontal: 25,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 15,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // SUMMARY

  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 7,
  },

  summaryLabel: {
    fontSize: 12,
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },

  summaryNetwork: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryLogo: {
    width: 20,
    height: 20,
    marginRight: 6,
  },

  summaryDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 12,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },

  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
  },

  // CONTINUE

  continueButton: {
    height: 55,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  continueArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },

  bottomSpace: {
    height: 40,
  },

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#D8DDD5',
    marginBottom: 20,
  },

  // NETWORK SELECTOR

  networkModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 25,
    padding: 22,
  },

  networkModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  networkModalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },

  networkOption: {
    minHeight: 65,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  networkOptionLogo: {
    width: 38,
    height: 38,
  },

  networkOptionName: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },

  networkCheck: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  networkModalCancel: {
    alignItems: 'center',
    paddingVertical: 15,
  },

  // PIN MODAL

  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
  },

  modalIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#EEF5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalIconText: {
    fontSize: 25,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 15,
  },

  modalSubtitle: {
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
  },

  modalSummary: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },

  modalPlanName: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  modalNetworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  modalNetworkLogo: {
    width: 20,
    height: 20,
    marginRight: 5,
  },

  modalPhone: {
    fontSize: 12,
    marginTop: 5,
  },

  modalAmount: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },

  pinInput: {
    width: '100%',
    height: 58,
    borderWidth: 1,
    borderRadius: 13,
    marginTop: 20,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 12,
    fontWeight: '800',
  },

  confirmButton: {
    width: '100%',
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  cancelButton: {
    paddingVertical: 15,
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // RESULT

  resultModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 25,
    padding: 24,
    alignItems: 'center',
  },

  resultIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultIconText: {
    fontSize: 30,
    fontWeight: '900',
  },

  resultTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 17,
  },

  resultMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  resultDetails: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
  },

  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 7,
  },

  resultLabel: {
    fontSize: 12,
  },

  resultValue: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },

  resultButton: {
    width: '100%',
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  resultButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
