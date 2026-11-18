
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
  validity?: string | null;
  allowance?: string | null;
  category?: string | null;
  fixedPrice?: boolean | null;
  isPromotional?: boolean;
  network?: string | null;
  raw?: any;
};

type Props = {
  token: string;
  onBack: () => void;
  onComplete?: () => void;
};

type NetworkInfo = {
  value: Network;
  label: string;
  shortName: string;
  color: string;
};

type Category =
  | 'All Plans'
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Night'
  | 'Special'
  | 'Hot Deals'
  | '3 Months'
  | 'Weekend'
  | 'Hourly'
  | 'Other';

const CATEGORIES: Category[] = [
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

const NETWORKS: NetworkInfo[] = [
  {
    value: 'mtn',
    label: 'MTN',
    shortName: 'MTN',
    color: '#FFCC00',
  },
  {
    value: 'airtel',
    label: 'Airtel',
    shortName: 'A',
    color: '#E60000',
  },
  {
    value: 'glo',
    label: 'Glo',
    shortName: 'G',
    color: '#00A651',
  },
  {
    value: 't2mobile',
    label: 'T2 Mobile',
    shortName: 'T2',
    color: '#111111',
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

// ============================================================
// CATEGORY DETECTION
// ============================================================

const getPlanText = (plan: DataPlan) => {
  return [
    plan.name,
    plan.description,
    plan.validity,
    plan.allowance,
    plan.category,
    plan.variation_code,
    plan.raw?.name,
    plan.raw?.description,
    plan.raw?.validity,
    plan.raw?.category,
    plan.raw?.plan_type,
    plan.raw?.type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const matchesCategory = (
  plan: DataPlan,
  category: Category
): boolean => {
  if (category === 'All Plans') {
    return true;
  }

  const text = getPlanText(plan);

  // Provider metadata takes precedence when available.
  const providerCategory = String(
    plan.category ||
      plan.raw?.category ||
      plan.raw?.plan_category ||
      plan.raw?.plan_type ||
      ''
  ).toLowerCase();

  if (category === 'Daily') {
    return (
      /\bdaily\b/.test(text) ||
      /\b1\s*day\b/.test(text) ||
      /\b2\s*days?\b/.test(text) ||
      /\b24\s*hours?\b/.test(text) ||
      /\b48\s*hours?\b/.test(text) ||
      /\b24hrs?\b/.test(text) ||
      /\b48hrs?\b/.test(text) ||
      /\bday\s*plan\b/.test(text) ||
      /\bday(s)?\s*valid\b/.test(text) ||
      /\bdaily\b/.test(providerCategory)
    );
  }

  if (category === 'Weekly') {
    return (
      /\bweekly\b/.test(text) ||
      /\b7\s*days?\b/.test(text) ||
      /\bweek\b/.test(text) ||
      /\b168\s*hours?\b/.test(text) ||
      /\bweekly\b/.test(providerCategory)
    );
  }

  if (category === 'Monthly') {
    return (
      /\bmonthly\b/.test(text) ||
      /\b30\s*days?\b/.test(text) ||
      /\b31\s*days?\b/.test(text) ||
      /\b1\s*month\b/.test(text) ||
      /\bmonth\b/.test(text) ||
      /\bmonthly\b/.test(providerCategory)
    );
  }

  if (category === 'Night') {
    return (
      /\bnight\b/.test(text) ||
      /\bmidnight\b/.test(text) ||
      /\bnight\s*plan\b/.test(text) ||
      /\bnight\s*browsing\b/.test(text) ||
      /\bnight\b/.test(providerCategory)
    );
  }

  if (category === 'Special') {
    return (
      /\bspecial\b/.test(text) ||
      /\bsme\b/.test(text) ||
      /\bsocial\b/.test(text) ||
      /\bcampus\b/.test(text) ||
      /\bstudent\b/.test(text) ||
      /\bsmartphone\b/.test(text) ||
      /\bbonus\b/.test(providerCategory) ||
      /\bspecial\b/.test(providerCategory)
    );
  }

  if (category === 'Hot Deals') {
    return (
      plan.isPromotional === true ||
      plan.raw?.is_promotional === true ||
      plan.raw?.promotion === true ||
      /\bhot\s*deal\b/.test(text) ||
      /\bpromo\b/.test(text) ||
      /\bpromotional\b/.test(text) ||
      /\bdiscount\b/.test(text) ||
      /\bdeal\b/.test(text) ||
      /\bspecial\s*offer\b/.test(text)
    );
  }

  if (category === '3 Months') {
    return (
      /\b3\s*months?\b/.test(text) ||
      /\bthree\s*months?\b/.test(text) ||
      /\b90\s*days?\b/.test(text) ||
      /\bquarterly\b/.test(text) ||
      /\b3\s*month\b/.test(providerCategory)
    );
  }

  if (category === 'Weekend') {
    return (
      /\bweekend\b/.test(text) ||
      /\bsaturday\b/.test(text) ||
      /\bsunday\b/.test(text) ||
      /\bweekend\b/.test(providerCategory)
    );
  }

  if (category === 'Hourly') {
    return (
      /\bhourly\b/.test(text) ||
      /\b\d+\s*hours?\b/.test(text) ||
      /\bhrs?\b/.test(text) ||
      /\bhour\b/.test(providerCategory)
    );
  }

  if (category === 'Other') {
    return !CATEGORIES.some((item) => {
      if (item === 'All Plans' || item === 'Other') {
        return false;
      }

      return matchesCategory(plan, item);
    });
  }

  return false;
};

// ============================================================
// COMPONENT
// ============================================================

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
  const [selectedPlan, setSelectedPlan] =
    useState<DataPlan | null>(null);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingPurchase, setLoadingPurchase] = useState(false);

  const [networkModalVisible, setNetworkModalVisible] =
    useState(false);

  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('');

  const [manualNetworkSelection, setManualNetworkSelection] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<Category>('All Plans');

  const [searchQuery, setSearchQuery] = useState('');

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

  const networkInfo = NETWORKS.find(
    (item) => item.value === network
  );

  const networkLabel = (value: Network) =>
    NETWORKS.find((item) => item.value === value)?.label ||
    value;

  // ====================================================
  // CATEGORY FILTERING
  // ====================================================

  const categoryPlans = useMemo(() => {
    return plans.filter((plan) =>
      matchesCategory(plan, selectedCategory)
    );
  }, [plans, selectedCategory]);

  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return categoryPlans;
    }

    return categoryPlans.filter((plan) => {
      const searchable = [
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

      return searchable.includes(query);
    });
  }, [categoryPlans, searchQuery]);

  const availableCategories = useMemo(() => {
    return CATEGORIES.filter((category) => {
      if (category === 'All Plans') return true;

      return plans.some((plan) =>
        matchesCategory(plan, category)
      );
    });
  }, [plans]);

  // ====================================================
  // AUTOMATIC NETWORK DETECTION
  // ====================================================

  useEffect(() => {
    if (!manualNetworkSelection) {
      setNetwork(detectedNetwork);
    }
  }, [detectedNetwork, manualNetworkSelection]);

  // ====================================================
  // LOAD DATA PLANS
  // ====================================================

  const loadPlans = async (selectedNetwork: Network) => {
    setLoadingPlans(true);
    setPlans([]);
    setSelectedPlan(null);
    setResult(null);
    setSelectedCategory('All Plans');
    setSearchQuery('');

    try {
      const response = await fetch(
        `${API_BASE}/data/plans?network=${encodeURIComponent(
          selectedNetwork
        )}`,
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

      const normalizedPlans: DataPlan[] = returnedPlans
        .map((item: any) => ({
          variation_code: String(
            item.variation_code || item.plan_id || ''
          ).trim(),

          name: String(
            item.name ||
              item.description ||
              item.variation_code ||
              'Data plan'
          ),

          amount: Number(item.amount),

          description: item.description
            ? String(item.description)
            : undefined,

          validity:
            item.validity ??
            item.validity_period ??
            item.duration ??
            null,

          allowance:
            item.allowance ??
            item.bundle ??
            item.data_size ??
            item.volume ??
            null,

          category:
            item.category ??
            item.plan_category ??
            item.type ??
            item.plan_type ??
            null,

          fixedPrice:
            item.fixedPrice ??
            item.fixed_price ??
            null,

          isPromotional:
            item.isPromotional ??
            item.is_promotional ??
            item.promotion ??
            false,

          network: item.network || null,

          raw: item.raw || item,
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
        error?.message ||
          'Please check your connection and try again.'
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

  // ====================================================
  // PHONE NUMBER
  // ====================================================

  const handlePhoneChange = (value: string) => {
    const normalized = normalizePhone(value);

    setPhone(normalized);
    setResult(null);
    setManualNetworkSelection(false);
  };

  // ====================================================
  // NETWORK SELECTION
  // ====================================================

  const handleNetworkSelection = (value: Network) => {
    setManualNetworkSelection(true);
    setNetwork(value);
    setNetworkModalVisible(false);
    setSelectedPlan(null);
  };

  // ====================================================
  // PURCHASE VALIDATION
  // ====================================================

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

    if (result?.status === 'pending') {
      Alert.alert(
        'Transaction pending',
        'This purchase is still processing. Please check your transaction history before making another purchase.'
      );
      return;
    }

    setPinVisible(true);
  };

  // ====================================================
  // PURCHASE
  // ====================================================

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
            data.message ||
            'Your data purchase was successful.',
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
          data.message ||
            'Unable to process your data purchase.'
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

  // ====================================================
  // RESET
  // ====================================================

  const resetForm = () => {
    setPhone('');
    setNetwork(null);
    setManualNetworkSelection(false);
    setPlans([]);
    setSelectedPlan(null);
    setSelectedCategory('All Plans');
    setSearchQuery('');
    setResult(null);
    setPin('');
  };

  // ====================================================
  // NETWORK BADGE
  // ====================================================

  const NetworkBadge = ({
    item,
    size = 40,
  }: {
    item: NetworkInfo;
    size?: number;
  }) => {
    return (
      <View
        style={[
          styles.networkBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: item.color,
          },
          item.value === 'mtn' && styles.mtnBadge,
        ]}
      >
        <Text
          style={[
            styles.networkBadgeText,
            item.value === 'mtn' && styles.mtnBadgeText,
            item.value === 'airtel' && styles.airtelBadgeText,
          ]}
        >
          {item.shortName}
        </Text>
      </View>
    );
  };

  // ====================================================
  // PLAN DETAILS
  // ====================================================

  const getPlanDetails = (plan: DataPlan) => {
    const details = [
      plan.allowance,
      plan.validity,
    ].filter(Boolean);

    if (details.length > 0) {
      return details.join(' · ');
    }

    return plan.description || '';
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ====================================================
  // UI
  // ====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

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
        {/* PHONE NUMBER */}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Recipient details
          </Text>

          <Text style={styles.label}>
            Phone number
          </Text>

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

          {/* DETECTION */}

          {detectedNetwork && (
            <View style={styles.detectedBox}>
              <NetworkBadge
                item={
                  NETWORKS.find(
                    (item) =>
                      item.value === detectedNetwork
                  )!
                }
                size={25}
              />

              <View style={styles.detectedContent}>
                <Text style={styles.detectedTitle}>
                  Network detected
                </Text>

                <Text style={styles.detectedText}>
                  {networkLabel(detectedNetwork)}
                </Text>
              </View>

              {!manualNetworkSelection && (
                <Text style={styles.autoBadge}>
                  AUTO
                </Text>
              )}
            </View>
          )}

          {/* NETWORK DROPDOWN */}

          <Text style={styles.label}>
            Network
          </Text>

          <TouchableOpacity
            style={styles.networkDropdown}
            activeOpacity={0.75}
            onPress={() =>
              setNetworkModalVisible(true)
            }
          >
            {networkInfo ? (
              <>
                <NetworkBadge item={networkInfo} />

                <View style={styles.dropdownContent}>
                  <Text style={styles.dropdownTitle}>
                    {networkInfo.label}
                  </Text>

                  <Text style={styles.dropdownSubtitle}>
                    {manualNetworkSelection
                      ? 'Manually selected'
                      : detectedNetwork
                      ? 'Automatically detected'
                      : 'Selected network'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownPlaceholder}>
                  Select network
                </Text>

                <Text style={styles.dropdownSubtitle}>
                  Choose the recipient's network
                </Text>
              </View>
            )}

            <MaterialCommunityIcons
              name="chevron-down"
              size={23}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <Text style={styles.networkNote}>
            Network detection uses the phone number prefix.
            Ported numbers may use another network. Confirm
            the recipient's current network before purchasing.
          </Text>
        </View>

        {/* DATA PLANS */}

        <View style={styles.plansSection}>
          <View style={styles.plansHeading}>
            <Text style={styles.sectionTitle}>
              Data plans
            </Text>

            {networkInfo && (
              <View style={styles.planNetworkTag}>
                <Text style={styles.planNetworkTagText}>
                  {networkInfo.label}
                </Text>
              </View>
            )}
          </View>

          {!network ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="wifi"
                size={29}
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
                Loading Sogo data catalogue...
              </Text>
            </View>
          ) : plans.length > 0 ? (
            <>
              {/* SEARCH */}

              <View style={styles.searchBox}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={colors.textSecondary}
                />

                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search data plans"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.searchInput}
                />

                {!!searchQuery && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={19}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* CATEGORY FILTERS */}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
              >
                {availableCategories.map((category) => {
                  const selected =
                    selectedCategory === category;

                  const count =
                    category === 'All Plans'
                      ? plans.length
                      : plans.filter((plan) =>
                          matchesCategory(plan, category)
                        ).length;

                  return (
                    <TouchableOpacity
                      key={category}
                      activeOpacity={0.75}
                      onPress={() =>
                        setSelectedCategory(category)
                      }
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected &&
                            styles.categoryChipTextSelected,
                        ]}
                      >
                        {category}
                      </Text>

                      <View
                        style={[
                          styles.categoryCount,
                          selected &&
                            styles.categoryCountSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryCountText,
                            selected &&
                              styles.categoryCountTextSelected,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* CATALOGUE SUMMARY */}

              <View style={styles.catalogueSummary}>
                <Text style={styles.catalogueSummaryText}>
                  {filteredPlans.length} plan
                  {filteredPlans.length !== 1 ? 's' : ''}{' '}
                  available
                </Text>

                <Text style={styles.catalogueSource}>
                  Sogo catalogue
                </Text>
              </View>

              {/* PLAN LIST */}

              {filteredPlans.length > 0 ? (
                <View style={styles.planList}>
                  {filteredPlans.map((plan) => {
                    const selected =
                      selectedPlan?.variation_code ===
                      plan.variation_code;

                    const details = getPlanDetails(plan);

                    const promotional =
                      plan.isPromotional === true ||
                      plan.raw?.is_promotional === true ||
                      plan.raw?.promotion === true;

                    return (
                      <TouchableOpacity
                        key={plan.variation_code}
                        onPress={() =>
                          setSelectedPlan(plan)
                        }
                        activeOpacity={0.75}
                        style={[
                          styles.planItem,
                          selected && styles.planSelected,
                        ]}
                      >
                        <View style={styles.planRadio}>
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

                        <View style={styles.planInfo}>
                          <View style={styles.planNameRow}>
                            <Text
                              style={styles.planName}
                            >
                              {plan.name}
                            </Text>

                            {promotional && (
                              <View
                                style={styles.promoBadge}
                              >
                                <Text
                                  style={styles.promoBadgeText}
                                >
                                  DEAL
                                </Text>
                              </View>
                            )}
                          </View>

                          {!!details && (
                            <Text
                              style={styles.planDescription}
                              numberOfLines={2}
                            >
                              {details}
                            </Text>
                          )}

                          {!!plan.category && (
                            <Text
                              style={styles.providerCategory}
                            >
                              {plan.category}
                            </Text>
                          )}
                        </View>

                        <Text style={styles.planPrice}>
                          ₦{formatAmount(plan.amount)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={27}
                    color={colors.textSecondary}
                  />

                  <Text style={styles.emptyText}>
                    No plans found in this category.
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory('All Plans');
                      setSearchQuery('');
                    }}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>
                      View all plans
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
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
                onPress={() =>
                  network && loadPlans(network)
                }
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SECURITY INFORMATION */}

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={20}
            color={colors.primary}
          />

          <Text style={styles.infoText}>
            Your transaction PIN is verified securely by
            ZENIMONIES. Data plans and prices are supplied
            by the Sogo provider catalogue.
          </Text>
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
              size={28}
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

            {result.status === 'pending' && (
              <Text style={styles.pendingWarning}>
                Do not purchase again while this transaction
                is pending.
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

        {/* CONTINUE */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            (
              !validPhone ||
              !network ||
              !selectedPlan ||
              loadingPlans ||
              loadingPurchase ||
              result?.status === 'pending'
            ) && styles.disabledButton,
          ]}
          disabled={
            !validPhone ||
            !network ||
            !selectedPlan ||
            loadingPlans ||
            loadingPurchase ||
            result?.status === 'pending'
          }
          onPress={handlePurchase}
        >
          <Text style={styles.continueText}>
            {result?.status === 'pending'
              ? 'Transaction pending'
              : 'Continue'}
          </Text>

          {result?.status !== 'pending' && (
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Confirm the phone number, network and data plan
          before making your purchase.
        </Text>
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
                style={styles.modalClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={23}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose the network receiving the data.
            </Text>

            {NETWORKS.map((item) => {
              const selected =
                network === item.value;

              const suggested =
                detectedNetwork === item.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.networkOption,
                    selected && styles.networkOptionSelected,
                  ]}
                  onPress={() =>
                    handleNetworkSelection(item.value)
                  }
                  activeOpacity={0.75}
                >
                  <NetworkBadge item={item} size={42} />

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
                      selected
                        ? 'check-circle'
                        : 'circle-outline'
                    }
                    size={22}
                    color={
                      selected
                        ? colors.primary
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
          if (!loadingPurchase) {
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
              Confirm Data Purchase
            </Text>

            <Text style={styles.pinDescription}>
              Enter your transaction PIN to authorize this
              payment.
            </Text>

            <Text style={styles.pinSummary}>
              {network ? networkLabel(network) : ''} · {phone}
            </Text>

            <Text style={styles.selectedPlanSummary}>
              {selectedPlan?.name || ''}
            </Text>

            <Text style={styles.pinAmount}>
              ₦
              {Number(
                selectedPlan?.amount || 0
              ).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <TextInput
              value={pin}
              onChangeText={(value) =>
                setPin(
                  value.replace(/\D/g, '').slice(0, 6)
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

// ======================================================
// STYLES
// ======================================================

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
      padding: 16,
      paddingBottom: 40,
    },

    sectionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      padding: 16,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
    },

    label: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 8,
      marginTop: 17,
    },

    phoneInput: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },

    countryCode: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginRight: 10,
    },

    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 10,
    },

    detectedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      borderRadius: 11,
      padding: 10,
      marginTop: 10,
      gap: 9,
    },

    detectedContent: {
      flex: 1,
    },

    detectedTitle: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '700',
    },

    detectedText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
      marginTop: 2,
    },

    autoBadge: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },

    networkBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    networkBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },

    mtnBadge: {
      borderWidth: 1,
      borderColor: '#E2B800',
    },

    mtnBadgeText: {
      color: '#111111',
    },

    airtelBadgeText: {
      color: '#FFFFFF',
    },

    networkDropdown: {
      minHeight: 59,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      gap: 11,
    },

    dropdownContent: {
      flex: 1,
    },

    dropdownTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },

    dropdownSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 3,
    },

    dropdownPlaceholder: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    networkNote: {
      color: colors.textSecondary,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 10,
    },

    plansSection: {
      marginTop: 22,
    },

    plansHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    planNetworkTag: {
      backgroundColor: colors.primaryLight,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    planNetworkTagText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
    },

    searchBox: {
      height: 45,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      backgroundColor: colors.surface,
      marginBottom: 12,
    },

    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      paddingVertical: 8,
    },

    categoryList: {
      paddingBottom: 8,
      gap: 8,
    },

    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      paddingHorizontal: 11,
      paddingVertical: 9,
      backgroundColor: colors.surface,
    },

    categoryChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    categoryChipText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: '800',
    },

    categoryChipTextSelected: {
      color: '#FFFFFF',
    },

    categoryCount: {
      minWidth: 19,
      height: 19,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },

    categoryCountSelected: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },

    categoryCountText: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '900',
    },

    categoryCountTextSelected: {
      color: '#FFFFFF',
    },

    catalogueSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },

    catalogueSummaryText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },

    catalogueSource: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '900',
    },

    planList: {
      gap: 8,
    },

    planItem: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 68,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },

    planSelected: {
      borderColor: colors.primary,
      borderWidth: 1.7,
      backgroundColor: colors.primaryLight,
    },

    planRadio: {
      marginRight: 10,
    },

    planInfo: {
      flex: 1,
      paddingRight: 8,
    },

    planNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },

    planName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 1,
    },

    promoBadge: {
      backgroundColor: '#E6A322',
      borderRadius: 5,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },

    promoBadgeText: {
      color: '#FFFFFF',
      fontSize: 7,
      fontWeight: '900',
    },

    planDescription: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 4,
      lineHeight: 14,
    },

    providerCategory: {
      color: colors.primary,
      fontSize: 9,
      marginTop: 3,
      fontWeight: '700',
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

    pendingWarning: {
      color: '#C58A19',
      fontSize: 10,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 15,
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
      minHeight: 53,
      borderRadius: 13,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 22,
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
    },

    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },

    modalClose: {
      width: 35,
      height: 35,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },

    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 6,
      marginBottom: 15,
    },

    networkOption: {
      minHeight: 65,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 8,
      gap: 10,
    },

    networkOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },

    networkOptionContent: {
      flex: 1,
    },

    networkOptionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },

    networkOptionSubtitle: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 3,
    },

    suggestedBadge: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 6,
    },

    suggestedBadgeText: {
      color: colors.primary,
      fontSize: 8,
      fontWeight: '900',
    },

    modalCancelButton: {
      alignItems: 'center',
      padding: 13,
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
