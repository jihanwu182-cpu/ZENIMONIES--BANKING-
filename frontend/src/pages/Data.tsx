import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import WifiIcon from '@mui/icons-material/Wifi';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import SecurityIcon from '@mui/icons-material/Security';

type Network =
  | 'MTN'
  | 'Airtel'
  | 'Glo'
  | '9mobile';

interface DataPlan {
  variation_code: string;
  name: string;
  amount: number | string;
  validity?: string;
  fixedPrice?: boolean;
  description?: string;
  serviceID?: string;
  category?: string;
}

interface NetworkOption {
  name: Network;
  logo: string;
  fallback: string;
}

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const NETWORKS: NetworkOption[] = [
  {
    name: 'MTN',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/mtn.svg',
    fallback: 'MTN',
  },
  {
    name: 'Airtel',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/airtel.svg',
    fallback: 'A',
  },
  {
    name: 'Glo',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/glo.svg',
    fallback: 'G',
  },
  {
    name: '9mobile',
    logo:
      'https://raw.githubusercontent.com/josephajibodu/utility-providers-assets/main/network-providers/9mobile.svg',
    fallback: '9',
  },
];

const CATEGORY_ORDER = [
  'HOT',
  'Daily',
  'Weekly',
  'Monthly',
  'Night',
  'Social',
  'Weekend',
  'Binge',
  'Special',
  '3 Months+',
  'Router',
  'Other',
];

const getToken = (): string => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    ''
  );
};

const normalizeAmount = (
  value: number | string | undefined
): number => {
  if (value === undefined || value === null) {
    return 0;
  }

  const cleaned = String(value)
    .replace(/₦/g, '')
    .replace(/,/g, '')
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatNaira = (
  value: number | string
): string => {
  const amount = normalizeAmount(value);

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }
  ).format(amount);
};

const cleanPhoneNumber = (
  value: string
): string => {
  let phone = value.replace(/\D/g, '');

  if (phone.startsWith('234')) {
    phone = `0${phone.slice(3)}`;
  }

  if (phone.length === 10) {
    phone = `0${phone}`;
  }

  return phone;
};

const isValidPhone = (
  value: string
): boolean => {
  return /^0\d{10}$/.test(value);
};

const getPlanCategory = (
  plan: DataPlan
): string => {
  if (plan.category) {
    const normalized = plan.category
      .toLowerCase()
      .trim();

    const match =
      CATEGORY_ORDER.find(
        (category) =>
          category.toLowerCase() === normalized
      );

    if (match) {
      return match;
    }
  }

  const text =
    `${plan.name || ''} ${
      plan.description || ''
    }`.toLowerCase();

  /*
   * Only explicitly identifiable categories
   * are assigned here.
   *
   * We do NOT randomly label plans as HOT.
   */

  if (
    text.includes('hot') ||
    text.includes('popular') ||
    text.includes('featured')
  ) {
    return 'HOT';
  }

  if (
    text.includes('router') ||
    text.includes('mifi') ||
    text.includes('mi-fi') ||
    text.includes('odu')
  ) {
    return 'Router';
  }

  if (
    text.includes('3 month') ||
    text.includes('3-month') ||
    text.includes('90 day') ||
    text.includes('90-day') ||
    text.includes('120 day') ||
    text.includes('120-day') ||
    text.includes('365 day') ||
    text.includes('365-day') ||
    text.includes('long term') ||
    text.includes('long-term')
  ) {
    return '3 Months+';
  }

  if (
    text.includes('night') ||
    text.includes('12am') ||
    text.includes('12 am') ||
    text.includes('1am') ||
    text.includes('2am') ||
    text.includes('3am') ||
    text.includes('4am') ||
    text.includes('5am')
  ) {
    return 'Night';
  }

  if (
    text.includes('social') ||
    text.includes('instagram') ||
    text.includes('tiktok') ||
    text.includes('whatsapp') ||
    text.includes('facebook')
  ) {
    return 'Social';
  }

  if (
    text.includes('youtube') ||
    text.includes('binge')
  ) {
    return 'Binge';
  }

  if (
    text.includes('weekend') ||
    text.includes('saturday') ||
    text.includes('sunday')
  ) {
    return 'Weekend';
  }

  if (
    text.includes('special') ||
    text.includes('combo') ||
    text.includes('collabo')
  ) {
    return 'Special';
  }

  if (
    text.includes('weekly') ||
    text.includes('7 day') ||
    text.includes('7-day')
  ) {
    return 'Weekly';
  }

  if (
    text.includes('monthly') ||
    text.includes('30 day') ||
    text.includes('30-day')
  ) {
    return 'Monthly';
  }

  if (
    text.includes('daily') ||
    text.includes('1 day') ||
    text.includes('1-day') ||
    text.includes('2 day') ||
    text.includes('2-day') ||
    text.includes('3 day') ||
    text.includes('3-day')
  ) {
    return 'Daily';
  }

  return 'Other';
};

const Data: React.FC = () => {
  const [network, setNetwork] =
    useState<Network>('MTN');

  const [plans, setPlans] = useState<DataPlan[]>(
    []
  );

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [buying, setBuying] =
    useState(false);

  const [phone, setPhone] =
    useState('');

  const [selectedPlan, setSelectedPlan] =
    useState<DataPlan | null>(null);

  const [activeCategory, setActiveCategory] =
    useState('HOT');

  const [transactionPin, setTransactionPin] =
    useState('');

  const [
    showTransactionPin,
    setShowTransactionPin,
  ] = useState(false);

  const [
    transactionPinError,
    setTransactionPinError,
  ] = useState('');

  const [snackbar, setSnackbar] =
    useState<{
      open: boolean;
      message: string;
      severity: 'success' | 'error';
    }>({
      open: false,
      message: '',
      severity: 'success',
    });

  const [logoErrors, setLogoErrors] =
    useState<Record<string, boolean>>({});

  const showMessage = (
    message: string,
    severity: 'success' | 'error'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const loadPlans = async (
    selectedNetwork: Network
  ) => {
    try {
      setLoadingPlans(true);

      setPlans([]);

      const token = getToken();

      if (!token) {
        showMessage(
          'Your session has expired. Please sign in again.',
          'error'
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/api/data/plans?network=${encodeURIComponent(
          selectedNetwork
        )}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load data plans.'
        );
      }

      const receivedPlans =
        Array.isArray(data?.plans)
          ? data.plans
          : Array.isArray(data?.data)
          ? data.data
          : [];

      const normalizedPlans: DataPlan[] =
        receivedPlans.map(
          (plan: any) => ({
            variation_code:
              plan.variation_code ||
              plan.variationCode ||
              '',
            name:
              plan.name ||
              plan.plan_name ||
              'Data Plan',
            amount:
              plan.amount ??
              plan.variation_amount ??
              plan.price ??
              0,
            validity:
              plan.validity ||
              plan.duration ||
              '',
            fixedPrice:
              plan.fixedPrice,
            description:
              plan.description || '',
            serviceID:
              plan.serviceID ||
              plan.service_id ||
              '',
            category:
              plan.category || '',
          })
        );

      setPlans(normalizedPlans);
    } catch (error: any) {
      showMessage(
        error?.message ||
          'Unable to load data plans.',
        'error'
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlans(network);
  }, [network]);

  const groupedPlans = useMemo(() => {
    const groups: Record<
      string,
      DataPlan[]
    > = {};

    CATEGORY_ORDER.forEach(
      (category) => {
        groups[category] = [];
      }
    );

    plans.forEach((plan) => {
      const category =
        getPlanCategory(plan);

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(plan);
    });

    return groups;
  }, [plans]);

  const availableCategories =
    useMemo(() => {
      return CATEGORY_ORDER.filter(
        (category) =>
          groupedPlans[category] &&
          groupedPlans[category].length > 0
      );
    }, [groupedPlans]);

  useEffect(() => {
    if (
      availableCategories.length === 0
    ) {
      setActiveCategory('HOT');
      return;
    }

    if (
      !availableCategories.includes(
        activeCategory
      )
    ) {
      setActiveCategory(
        availableCategories[0]
      );
    }
  }, [
    availableCategories,
    activeCategory,
  ]);

  const activePlans =
    groupedPlans[activeCategory] || [];

  const selectedNetwork =
    NETWORKS.find(
      (item) => item.name === network
    );

  const handleNetworkChange = (
    selectedNetworkName: Network
  ) => {
    setNetwork(selectedNetworkName);
    setActiveCategory('HOT');
  };

  const handleBuyClick = (
    plan: DataPlan
  ) => {
    const cleanPhone =
      cleanPhoneNumber(phone);

    if (!isValidPhone(cleanPhone)) {
      showMessage(
        'Please enter a valid Nigerian phone number.',
        'error'
      );
      return;
    }

    setPhone(cleanPhone);
    setSelectedPlan(plan);
    setTransactionPin('');
    setTransactionPinError('');
    setShowTransactionPin(true);
  };

  const completePurchase = async () => {
    if (!selectedPlan) {
      return;
    }

    const cleanPhone =
      cleanPhoneNumber(phone);

    if (!isValidPhone(cleanPhone)) {
      setTransactionPinError(
        'Please enter a valid Nigerian phone number.'
      );
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      setTransactionPinError(
        'Enter your 4-digit Transaction PIN.'
      );
      return;
    }

    try {
      setBuying(true);
      setTransactionPinError('');

      const token = getToken();

      if (!token) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      const response = await fetch(
        `${API_URL}/api/data`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            network,
            phone: cleanPhone,
            variation_code:
              selectedPlan.variation_code,
            transaction_pin:
              transactionPin,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const error: any = new Error(
          data?.message ||
            'Unable to purchase this data plan.'
        );

        error.code = data?.code;

        error.remainingAttempts =
          data?.remainingAttempts;

        error.lockedUntil =
          data?.lockedUntil;

        throw error;
      }

      setShowTransactionPin(false);
      setTransactionPin('');
      setSelectedPlan(null);

      showMessage(
        data?.message ||
          'Data purchase submitted successfully.',
        'success'
      );
    } catch (error: any) {
      if (
        error?.code ===
        'INCORRECT_TRANSACTION_PIN'
      ) {
        const remaining =
          error?.remainingAttempts;

        setTransactionPinError(
          remaining !== undefined
            ? `Incorrect Transaction PIN. ${remaining} attempt${
                remaining === 1
                  ? ''
                  : 's'
              } remaining.`
            : 'Incorrect Transaction PIN.'
        );
      } else if (
        error?.code ===
        'TRANSACTION_PIN_LOCKED'
      ) {
        setTransactionPinError(
          'Your Transaction PIN is temporarily locked. Please try again later.'
        );
      } else if (
        error?.code ===
        'TRANSACTION_PIN_NOT_SET'
      ) {
        setTransactionPinError(
          'Please create your Transaction PIN in Settings before making a purchase.'
        );
      } else {
        setTransactionPinError(
          error?.message ||
            'Unable to complete the data purchase.'
        );
      }
    } finally {
      setBuying(false);
    }
  };

  return (
    <>
      <style>
        {`
          .zen-data-page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at top right,
                rgba(212, 175, 55, 0.08),
                transparent 34%
              ),
              #0b0b0b;
            color: #f8f5ed;
            padding: 24px 16px 48px;
          }

          .zen-data-shell {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
          }

          .zen-premium-header {
            background:
              linear-gradient(
                145deg,
                #171717 0%,
                #101010 100%
              );
            border: 1px solid rgba(212, 175, 55, 0.20);
            border-radius: 24px;
            padding: 22px;
            box-shadow:
              0 18px 45px rgba(0,0,0,0.35);
          }

          .zen-network-scroll {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding: 4px 2px 8px;
            scrollbar-width: none;
          }

          .zen-network-scroll::-webkit-scrollbar {
            display: none;
          }

          .zen-network-button {
            min-width: 104px;
            flex: 0 0 auto;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.08);
            background: #151515;
            color: #ddd8cc;
            padding: 10px 12px;
            cursor: pointer;
            transition:
              transform 0.18s ease,
              border-color 0.18s ease,
              background 0.18s ease;
          }

          .zen-network-button:hover {
            transform: translateY(-1px);
            border-color: rgba(212,175,55,0.38);
          }

          .zen-network-button.active {
            background:
              linear-gradient(
                145deg,
                rgba(212,175,55,0.18),
                rgba(212,175,55,0.07)
              );
            border-color: rgba(212,175,55,0.72);
            color: #f4d77a;
          }

          .zen-logo-box {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            margin: 0 auto 7px;
          }

          .zen-logo-box img {
            width: 31px;
            height: 31px;
            object-fit: contain;
          }

          .zen-category-bar {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding: 4px 2px 12px;
            scrollbar-width: none;
          }

          .zen-category-bar::-webkit-scrollbar {
            display: none;
          }

          .zen-category-tab {
            flex: 0 0 auto;
            border: 1px solid rgba(255,255,255,0.08);
            background: #141414;
            color: #aaa59b;
            border-radius: 999px;
            padding: 10px 17px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.15px;
            cursor: pointer;
            transition: all 0.18s ease;
          }

          .zen-category-tab:hover {
            border-color: rgba(212,175,55,0.35);
            color: #e8dfcb;
          }

          .zen-category-tab.active {
            background: #d4af37;
            color: #111111;
            border-color: #d4af37;
            box-shadow:
              0 8px 20px rgba(212,175,55,0.18);
          }

          .zen-category-tab.empty {
            opacity: 0.38;
            cursor: default;
          }

          .zen-plans-grid {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .zen-plan-card {
            background:
              linear-gradient(
                145deg,
                #181818,
                #101010
              );
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 20px;
            padding: 16px;
            min-height: 176px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition:
              transform 0.18s ease,
              border-color 0.18s ease,
              box-shadow 0.18s ease;
          }

          .zen-plan-card:hover {
            transform: translateY(-2px);
            border-color: rgba(212,175,55,0.35);
            box-shadow:
              0 16px 35px rgba(0,0,0,0.28);
          }

          .zen-plan-size {
            font-size: 22px;
            font-weight: 800;
            color: #f7f2e8;
            line-height: 1.15;
          }

          .zen-plan-validity {
            color: #aaa59b;
            font-size: 12px;
            margin-top: 5px;
          }

          .zen-plan-price {
            color: #d8b84d;
            font-size: 19px;
            font-weight: 800;
            margin-top: 12px;
          }

          .zen-buy-button {
            margin-top: 14px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid rgba(212,175,55,0.65);
            background: transparent;
            color: #e1c15a;
            font-weight: 800;
            padding: 9px 8px;
            cursor: pointer;
            transition: all 0.18s ease;
          }

          .zen-buy-button:hover {
            background: #d4af37;
            color: #111111;
          }

          .zen-section-card {
            background:
              linear-gradient(
                145deg,
                #141414,
                #0f0f0f
              );
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 24px;
            padding: 18px;
          }

          .zen-phone-field .MuiOutlinedInput-root {
            color: #f5f0e6;
            background: #111111;
            border-radius: 14px;
          }

          .zen-phone-field .MuiInputLabel-root {
            color: #918c82;
          }

          .zen-phone-field
            .MuiOutlinedInput-notchedOutline {
            border-color:
              rgba(255,255,255,0.10);
          }

          .zen-phone-field
            .MuiOutlinedInput-root:hover
            .MuiOutlinedInput-notchedOutline {
            border-color:
              rgba(212,175,55,0.40);
          }

          @media (max-width: 620px) {
            .zen-data-page {
              padding: 14px 10px 36px;
            }

            .zen-premium-header {
              padding: 17px;
              border-radius: 20px;
            }

            .zen-plans-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .zen-plan-card {
              padding: 13px;
              min-height: 165px;
              border-radius: 17px;
            }

            .zen-plan-size {
              font-size: 18px;
            }

            .zen-plan-price {
              font-size: 16px;
            }

            .zen-category-tab {
              padding: 9px 14px;
              font-size: 12px;
            }
          }

          @media (max-width: 380px) {
            .zen-plans-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .zen-plan-card {
              padding: 11px;
            }
          }
        `}
      </style>

      <Box className="zen-data-page">
        <Box className="zen-data-shell">

          {/* =====================================================
              PREMIUM HEADER
          ===================================================== */}

          <Box className="zen-premium-header">

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
              mb={2.5}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#a49d91',
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    textTransform:
                      'uppercase',
                  }}
                >
                  Zenimonies
                </Typography>

                <Typography
                  sx={{
                    fontSize: {
                      xs: 25,
                      sm: 29,
                    },
                    fontWeight: 850,
                    letterSpacing: -0.8,
                    color: '#f8f3e8',
                    mt: 0.4,
                  }}
                >
                  Mobile Data
                </Typography>

                <Typography
                  sx={{
                    color: '#969188',
                    fontSize: 13,
                    mt: 0.6,
                  }}
                >
                  Choose your network and
                  select a data plan.
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '15px',
                  border:
                    '1px solid rgba(212,175,55,0.35)',
                  background:
                    'rgba(212,175,55,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WifiIcon
                  sx={{
                    color: '#d4af37',
                    fontSize: 23,
                  }}
                />
              </Box>
            </Stack>

            {/* PHONE NUMBER */}

            <Box mb={2.5}>
              <TextField
                className="zen-phone-field"
                fullWidth
                label="Recipient phone number"
                placeholder="08012345678"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                inputProps={{
                  inputMode: 'numeric',
                  maxLength: 14,
                }}
              />
            </Box>

            {/* NETWORKS */}

            <Typography
              sx={{
                color: '#b7b0a3',
                fontSize: 12,
                fontWeight: 700,
                mb: 1,
                textTransform:
                  'uppercase',
                letterSpacing: 1,
              }}
            >
              Select Network
            </Typography>

            <Box className="zen-network-scroll">
              {NETWORKS.map((item) => {
                const failed =
                  logoErrors[item.name];

                return (
                  <Box
                    key={item.name}
                    className={`zen-network-button ${
                      network === item.name
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      handleNetworkChange(
                        item.name
                      )
                    }
                  >
                    <Box className="zen-logo-box">
                      {!failed ? (
                        <img
                          src={item.logo}
                          alt={`${item.name} logo`}
                          onError={() =>
                            setLogoErrors(
                              (previous) => ({
                                ...previous,
                                [item.name]:
                                  true,
                              })
                            )
                          }
                        />
                      ) : (
                        <Typography
                          sx={{
                            fontWeight: 900,
                            color: '#171717',
                            fontSize: 16,
                          }}
                        >
                          {item.fallback}
                        </Typography>
                      )}
                    </Box>

                    <Typography
                      sx={{
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box mt={2} />

          {/* =====================================================
              CATEGORY TABS
          ===================================================== */}

          <Box className="zen-section-card">

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={1.2}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: '#f4efe5',
                  }}
                >
                  Data Plans
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11,
                    color: '#817c73',
                    mt: 0.3,
                  }}
                >
                  {network} plans
                </Typography>
              </Box>

              <PhoneAndroidIcon
                sx={{
                  color: '#d4af37',
                  fontSize: 20,
                }}
              />
            </Stack>

            <Box className="zen-category-bar">
              {CATEGORY_ORDER.map(
                (category) => {
                  const hasPlans =
                    groupedPlans[
                      category
                    ]?.length > 0;

                  return (
                    <button
                      key={category}
                      type="button"
                      className={`zen-category-tab ${
                        activeCategory ===
                        category
                          ? 'active'
                          : ''
                      } ${
                        !hasPlans
                          ? 'empty'
                          : ''
                      }`}
                      onClick={() => {
                        if (hasPlans) {
                          setActiveCategory(
                            category
                          );
                        }
                      }}
                    >
                      {category}
                    </button>
                  );
                }
              )}
            </Box>

            <Divider
              sx={{
                borderColor:
                  'rgba(255,255,255,0.07)',
                mb: 2,
              }}
            />

            {/* =================================================
                LOADING
            ================================================= */}

            {loadingPlans ? (
              <Box
                sx={{
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <CircularProgress
                  size={30}
                  thickness={3}
                  sx={{
                    color: '#d4af37',
                  }}
                />

                <Typography
                  sx={{
                    color: '#858078',
                    fontSize: 13,
                  }}
                >
                  Loading {network} data
                  plans...
                </Typography>
              </Box>
            ) : activePlans.length ===
              0 ? (
              <Box
                sx={{
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  textAlign: 'center',
                  px: 2,
                }}
              >
                <Box>
                  <WifiIcon
                    sx={{
                      color:
                        'rgba(212,175,55,0.45)',
                      fontSize: 38,
                      mb: 1,
                    }}
                  />

                  <Typography
                    sx={{
                      color: '#d7d1c6',
                      fontWeight: 700,
                      mb: 0.5,
                    }}
                  >
                    No {activeCategory}{' '}
                    plans available
                  </Typography>

                  <Typography
                    sx={{
                      color: '#77726a',
                      fontSize: 12,
                    }}
                  >
                    Select another category
                    to view available plans.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                <Typography
                  sx={{
                    color: '#77726a',
                    fontSize: 11,
                    mb: 1.4,
                  }}
                >
                  {activePlans.length}{' '}
                  {activeCategory} plan
                  {activePlans.length ===
                  1
                    ? ''
                    : 's'} available
                </Typography>

                <Box className="zen-plans-grid">
                  {activePlans.map(
                    (plan) => (
                      <Card
                        key={
                          plan.variation_code
                        }
                        className="zen-plan-card"
                        elevation={0}
                      >
                        <Box>
                          <Typography
                            className="zen-plan-size"
                          >
                            {plan.name}
                          </Typography>

                          {plan.validity && (
                            <Typography
                              className="zen-plan-validity"
                            >
                              Valid for{' '}
                              {
                                plan.validity
                              }
                            </Typography>
                          )}

                          {plan.description && (
                            <Typography
                              sx={{
                                color:
                                  '#77726a',
                                fontSize: 10,
                                mt: 0.8,
                                lineHeight: 1.4,
                                display:
                                  '-webkit-box',
                                WebkitLineClamp:
                                  2,
                                WebkitBoxOrient:
                                  'vertical',
                                overflow:
                                  'hidden',
                              }}
                            >
                              {
                                plan.description
                              }
                            </Typography>
                          )}

                          <Typography
                            className="zen-plan-price"
                          >
                            {formatNaira(
                              plan.amount
                            )}
                          </Typography>
                        </Box>

                        <button
                          type="button"
                          className="zen-buy-button"
                          onClick={() =>
                            handleBuyClick(
                              plan
                            )
                          }
                        >
                          Buy Data
                        </button>
                      </Card>
                    )
                  )}
                </Box>
              </>
            )}
          </Box>

          {/* =====================================================
              SECURITY NOTE
          ===================================================== */}

          <Box
            sx={{
              mt: 2,
              px: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',
              gap: 0.8,
            }}
          >
            <SecurityIcon
              sx={{
                color:
                  'rgba(212,175,55,0.75)',
                fontSize: 15,
              }}
            />

            <Typography
              sx={{
                color: '#706b63',
                fontSize: 10,
                textAlign: 'center',
              }}
            >
              Secured by Zenimonies
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* =========================================================
          TRANSACTION PIN DIALOG
      ========================================================= */}

      <Dialog
        open={showTransactionPin}
        onClose={() => {
          if (!buying) {
            setShowTransactionPin(false);
            setTransactionPin('');
            setTransactionPinError('');
          }
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            background:
              'linear-gradient(145deg, #181818, #101010)',
            color: '#f5f0e7',
            border:
              '1px solid rgba(212,175,55,0.22)',
            borderRadius: '22px',
            boxShadow:
              '0 25px 70px rgba(0,0,0,0.55)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: '#f5f0e7',
            pb: 1,
          }}
        >
          Confirm Purchase

          <IconButton
            onClick={() => {
              if (!buying) {
                setShowTransactionPin(
                  false
                );
                setTransactionPin('');
                setTransactionPinError('');
              }
            }}
            disabled={buying}
            sx={{
              position: 'absolute',
              right: 10,
              top: 10,
              color: '#aaa49a',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {selectedPlan && (
            <Box
              sx={{
                background: '#111111',
                border:
                  '1px solid rgba(255,255,255,0.07)',
                borderRadius: '15px',
                p: 1.8,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  color: '#f3eee5',
                }}
              >
                {selectedPlan.name}
              </Typography>

              <Typography
                sx={{
                  color: '#d4af37',
                  fontWeight: 800,
                  mt: 0.4,
                }}
              >
                {formatNaira(
                  selectedPlan.amount
                )}
              </Typography>

              <Typography
                sx={{
                  color: '#77726a',
                  fontSize: 11,
                  mt: 0.4,
                }}
              >
                {network} • {phone}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            label="Transaction PIN"
            value={transactionPin}
            onChange={(event) => {
              const value =
                event.target.value.replace(
                  /\D/g,
                  ''
                );

              if (value.length <= 4) {
                setTransactionPin(value);
              }

              setTransactionPinError('');
            }}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
            inputProps={{
              maxLength: 4,
              inputMode: 'numeric',
            }}
            error={
              Boolean(transactionPinError)
            }
            helperText={
              transactionPinError ||
              'Enter your 4-digit Transaction PIN.'
            }
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#f5f0e7',
                borderRadius: '14px',
                background: '#101010',
              },

              '& .MuiInputLabel-root': {
                color: '#8d887f',
              },

              '& .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    'rgba(255,255,255,0.10)',
                },

              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    'rgba(212,175,55,0.45)',
                },
            }}
          />
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            pt: 0.5,
          }}
        >
          <Button
            onClick={() => {
              if (!buying) {
                setShowTransactionPin(
                  false
                );
                setTransactionPin('');
                setTransactionPinError('');
              }
            }}
            disabled={buying}
            sx={{
              color: '#99938a',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={
              completePurchase
            }
            disabled={
              buying ||
              transactionPin.length !== 4
            }
            variant="contained"
            endIcon={
              buying ? (
                <CircularProgress
                  size={16}
                  sx={{
                    color: '#111111',
                  }}
                />
              ) : (
                <ArrowForwardIosIcon
                  sx={{
                    fontSize: 13,
                  }}
                />
              )
            }
            sx={{
              background: '#d4af37',
              color: '#111111',
              textTransform: 'none',
              fontWeight: 850,
              borderRadius: '12px',
              px: 2.2,
              '&:hover': {
                background: '#e0bd4f',
              },
              '&.Mui-disabled': {
                background:
                  'rgba(212,175,55,0.25)',
                color:
                  'rgba(255,255,255,0.35)',
              },
            }}
          >
            {buying
              ? 'Processing...'
              : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================
          SNACKBAR
      ========================================================= */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() =>
          setSnackbar((previous) => ({
            ...previous,
            open: false,
          }))
        }
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar((previous) => ({
              ...previous,
              open: false,
            }))
          }
          sx={{
            width: '100%',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Data;
