import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

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
import { useTheme } from '../theme/Theme.tsx';

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

/* ============================================================
   THEME COLORS
============================================================ */

const LIGHT = {
  background: '#f4faf7',
  surface: '#ffffff',
  surfaceSoft: '#f8fcfa',
  surfacePressed: '#eef8f3',
  border: '#dcebe5',
  divider: '#e6efea',

  primaryText: '#073b2a',
  secondaryText: '#687b74',
  mutedText: '#81908a',

  green: '#087b48',
  greenBright: '#0b995b',
  greenDark: '#05633b',

  greenSoft: '#e8f6ef',
  greenSoftBorder: '#d4eee1',

  inputBackground: '#fbfdfc',

  dangerBackground: '#fff4f4',
  dangerBorder: '#f0cccc',
};

const DARK = {
  background: '#07110d',
  surface: '#101d17',
  surfaceSoft: '#0d1813',
  surfacePressed: '#14251d',
  border: '#1d382b',
  divider: '#1b3026',

  primaryText: '#f3faf6',
  secondaryText: '#a9bbb2',
  mutedText: '#81968c',

  green: '#19a765',
  greenBright: '#25c477',
  greenDark: '#168c56',

  greenSoft: '#123a29',
  greenSoftBorder: '#1c5139',

  inputBackground: '#0d1813',

  dangerBackground: '#2a1517',
  dangerBorder: '#5b292d',
};

/* ============================================================
   TOKEN
============================================================ */

const getToken = (): string => {
  return (
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem(
      'access_token'
    ) ||
    localStorage.getItem('token') ||
    ''
  );
};

/* ============================================================
   AMOUNT
============================================================ */

const normalizeAmount = (
  value:
    | number
    | string
    | undefined
): number => {
  if (
    value === undefined ||
    value === null
  ) {
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
  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }
  ).format(
    normalizeAmount(value)
  );
};

/* ============================================================
   PHONE
============================================================ */

const cleanPhoneNumber = (
  value: string
): string => {
  let phone =
    value.replace(/\D/g, '');

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

/* ============================================================
   PLAN CATEGORY
============================================================ */

const getPlanCategory = (
  plan: DataPlan
): string => {
  if (plan.category) {
    const normalized =
      plan.category
        .toLowerCase()
        .trim();

    const match =
      CATEGORY_ORDER.find(
        (category) =>
          category.toLowerCase() ===
          normalized
      );

    if (match) {
      return match;
    }
  }

  const variationCode =
    String(
      plan.variation_code || ''
    ).toLowerCase();

  const text =
    `${plan.name || ''} ${
      plan.description || ''
    }`.toLowerCase();

  if (
    variationCode.includes('hot') ||
    text.includes('hot') ||
    text.includes('popular') ||
    text.includes('featured')
  ) {
    return 'HOT';
  }

  if (
    variationCode.includes('router') ||
    variationCode.includes('mifi') ||
    variationCode.includes('odu') ||
    text.includes('router') ||
    text.includes('mifi') ||
    text.includes('mi-fi') ||
    text.includes('odu')
  ) {
    return 'Router';
  }

  if (
    variationCode.includes('3month') ||
    variationCode.includes('90day') ||
    variationCode.includes('120day') ||
    variationCode.includes('180day') ||
    variationCode.includes('365day') ||
    text.includes('3 month') ||
    text.includes('90 day') ||
    text.includes('120 day') ||
    text.includes('180 day') ||
    text.includes('365 day') ||
    text.includes('long term') ||
    text.includes('long-term')
  ) {
    return '3 Months+';
  }

  if (
    variationCode.includes('monthly') ||
    variationCode.includes('month') ||
    variationCode.includes('30day') ||
    text.includes('monthly') ||
    text.includes('30 day') ||
    text.includes('30-day')
  ) {
    return 'Monthly';
  }

  if (
    variationCode.includes('weekly') ||
    variationCode.includes('week') ||
    variationCode.includes('2weeks') ||
    variationCode.includes('7day') ||
    variationCode.includes('14day') ||
    text.includes('weekly') ||
    text.includes('2 weeks') ||
    text.includes('7 day') ||
    text.includes('14 day')
  ) {
    return 'Weekly';
  }

  if (
    variationCode.includes('weekend') ||
    text.includes('weekend') ||
    text.includes('saturday') ||
    text.includes('sunday')
  ) {
    return 'Weekend';
  }

  if (
    variationCode.includes('social') ||
    variationCode.includes('myg') ||
    text.includes('social') ||
    text.includes('instagram') ||
    text.includes('tiktok') ||
    text.includes('whatsapp') ||
    text.includes('facebook') ||
    text.includes('telegram') ||
    text.includes('snapchat')
  ) {
    return 'Social';
  }

  if (
    variationCode.includes('binge') ||
    variationCode.includes('youtube') ||
    text.includes('binge') ||
    text.includes('youtube')
  ) {
    return 'Binge';
  }

  if (
    variationCode.includes('special') ||
    variationCode.includes('combo') ||
    variationCode.includes('collabo') ||
    text.includes('special') ||
    text.includes('combo') ||
    text.includes('collabo')
  ) {
    return 'Special';
  }

  if (
    variationCode.includes('daily') ||
    variationCode.includes('1day') ||
    variationCode.includes('2days') ||
    variationCode.includes('3days') ||
    variationCode.includes('4days') ||
    variationCode.includes('5days') ||
    variationCode.includes('6days') ||
    text.includes('daily') ||
    text.includes('1 day') ||
    text.includes('1-day') ||
    text.includes('2 day') ||
    text.includes('2-day') ||
    text.includes('3 day') ||
    text.includes('3-day') ||
    text.includes('4 day') ||
    text.includes('4-day') ||
    text.includes('5 day') ||
    text.includes('5-day') ||
    text.includes('6 day') ||
    text.includes('6-day')
  ) {
    return 'Daily';
  }

  if (
    variationCode.includes('night') ||
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

  return 'Other';
};

/* ============================================================
   DATA PAGE
============================================================ */

const Data: React.FC = () => {
  const [network, setNetwork] =
    useState<Network>('MTN');

  const [plans, setPlans] =
    useState<DataPlan[]>([]);

  const [
    loadingPlans,
    setLoadingPlans,
  ] = useState(false);

  const [buying, setBuying] =
    useState(false);

  const [phone, setPhone] =
    useState('');

  const [
    selectedPlan,
    setSelectedPlan,
  ] = useState<DataPlan | null>(
    null
  );

  const [
    activeCategory,
    setActiveCategory,
  ] = useState('HOT');

  const [
    transactionPin,
    setTransactionPin,
  ] = useState('');

  const [
    showTransactionPin,
    setShowTransactionPin,
  ] = useState(false);

  const [
    transactionPinError,
    setTransactionPinError,
  ] = useState('');

  const [
    isDarkMode,
    setIsDarkMode,
  ] = useState(false);

  const [
    pressedNetwork,
    setPressedNetwork,
  ] = useState<Network | null>(
    null
  );

  const [
    snackbar,
    setSnackbar,
  ] = useState<{
    open: boolean;
    message: string;
    severity:
      | 'success'
      | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [
    logoErrors,
    setLogoErrors,
  ] = useState<
    Record<string, boolean>
  >({});

  /* ==========================================================
     SYSTEM DARK MODE
  ========================================================== */

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      );

    const updateTheme = () => {
      setIsDarkMode(
        mediaQuery.matches
      );
    };

    updateTheme();

    mediaQuery.addEventListener(
      'change',
      updateTheme
    );

    return () => {
      mediaQuery.removeEventListener(
        'change',
        updateTheme
      );
    };
  }, []);

  const colors = isDarkMode
    ? DARK
    : LIGHT;

  /* ==========================================================
     MESSAGE
  ========================================================== */

  const showMessage = (
    message: string,
    severity:
      | 'success'
      | 'error'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  /* ==========================================================
     LOAD PLANS
  ========================================================== */

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

      const response =
        await fetch(
          `${API_URL}/api/data/plans?network=${encodeURIComponent(
            selectedNetwork
          )}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load data plans.'
        );
      }

      const receivedPlans =
        Array.isArray(
          data?.plans
        )
          ? data.plans
          : Array.isArray(
              data?.data
            )
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
              plan.description ||
              '',

            serviceID:
              plan.serviceID ||
              plan.service_id ||
              '',

            category:
              plan.category || '',
          })
        );

      setPlans(
        normalizedPlans
      );
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

  /* ==========================================================
     GROUP PLANS
  ========================================================== */

  const groupedPlans =
    useMemo(() => {
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

        if (category === 'HOT') {
          groups.HOT.push(plan);
          return;
        }

        groups[category].push(plan);
      });

      if (
        groups.HOT.length === 0 &&
        plans.length > 0
      ) {
        const eligiblePlans =
          plans
            .filter((plan) => {
              const category =
                getPlanCategory(
                  plan
                );

              return (
                category !==
                  'Router' &&
                category !==
                  '3 Months+' &&
                category !==
                  'Social' &&
                category !==
                  'Binge'
              );
            })
            .slice()
            .sort(
              (a, b) =>
                normalizeAmount(
                  a.amount
                ) -
                normalizeAmount(
                  b.amount
                )
            );

        groups.HOT =
          eligiblePlans.slice(
            0,
            6
          );
      }

      return groups;
    }, [plans]);

  /* ==========================================================
     AVAILABLE CATEGORIES
  ========================================================== */

  const availableCategories =
    useMemo(() => {
      return CATEGORY_ORDER.filter(
        (category) =>
          groupedPlans[
            category
          ] &&
          groupedPlans[
            category
          ].length > 0
      );
    }, [groupedPlans]);

  /* ==========================================================
     VALIDATE ACTIVE CATEGORY
  ========================================================== */

  useEffect(() => {
    if (
      availableCategories.length ===
      0
    ) {
      setActiveCategory('HOT');
      return;
    }

    if (
      !availableCategories.includes(
        activeCategory
      )
    ) {
      if (
        availableCategories.includes(
          'HOT'
        )
      ) {
        setActiveCategory('HOT');
      } else {
        setActiveCategory(
          availableCategories[0]
        );
      }
    }
  }, [
    availableCategories,
    activeCategory,
  ]);

  const activePlans =
    groupedPlans[
      activeCategory
    ] || [];

  /* ==========================================================
     NETWORK CHANGE
  ========================================================== */

  const handleNetworkChange = (
    selectedNetwork: Network
  ) => {
    setNetwork(selectedNetwork);
    setActiveCategory('HOT');
  };

  /* ==========================================================
     BUY PLAN
  ========================================================== */

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

  /* ==========================================================
     COMPLETE PURCHASE
  ========================================================== */

  const completePurchase =
    async () => {
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

      if (
        !/^\d{4}$/.test(
          transactionPin
        )
      ) {
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

        const response =
          await fetch(
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

        const data =
          await response.json();

        if (!response.ok) {
          const error: any =
            new Error(
              data?.message ||
                'Unable to purchase this data plan.'
            );

          error.code =
            data?.code;

          error.remainingAttempts =
            data?.remainingAttempts;

          error.lockedUntil =
            data?.lockedUntil;

          throw error;
        }

        setShowTransactionPin(
          false
        );

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
            remaining !==
              undefined
              ? `Incorrect Transaction PIN. ${remaining} attempt${
                  remaining ===
                  1
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

  /* ==========================================================
     CLOSE PIN DIALOG
  ========================================================== */

  const closePinDialog = () => {
    if (buying) {
      return;
    }

    setShowTransactionPin(
      false
    );
    setTransactionPin('');
    setTransactionPinError('');
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          background:
            colors.background,
          color:
            colors.primaryText,
          px: {
            xs: 1.5,
            sm: 3,
          },
          py: {
            xs: 1.5,
            sm: 3,
          },
          pb: 6,
          transition:
            'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
          }}
        >
          {/* ===================================================
              HEADER CARD
          =================================================== */}

          <Card
            elevation={0}
            sx={{
              borderRadius: {
                xs: 3,
                sm: 4,
              },
              background:
                colors.surface,
              border: `1px solid ${colors.border}`,
              boxShadow: isDarkMode
                ? '0 12px 35px rgba(0,0,0,0.22)'
                : '0 8px 30px rgba(7,59,42,0.06)',
              p: {
                xs: 2,
                sm: 3,
              },
              transition:
                'background-color 0.2s ease, border-color 0.2s ease',
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Box>
                <Typography
                  sx={{
                    color:
                      colors.green,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1.8,
                    textTransform:
                      'uppercase',
                  }}
                >
                  ZENIMONIES
                </Typography>

                <Typography
                  sx={{
                    color:
                      colors.primaryText,
                    fontSize: {
                      xs: 27,
                      sm: 31,
                    },
                    fontWeight: 850,
                    lineHeight: 1.1,
                    mt: 0.4,
                    letterSpacing:
                      -0.7,
                  }}
                >
                  Mobile Data
                </Typography>

                <Typography
                  sx={{
                    color:
                      colors.secondaryText,
                    fontSize: 13,
                    mt: 0.7,
                  }}
                >
                  Choose your network
                  and select a data plan.
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  background:
                    colors.greenSoft,
                  border: `1px solid ${colors.greenSoftBorder}`,
                  flexShrink: 0,
                }}
              >
                <WifiIcon
                  sx={{
                    color:
                      colors.greenBright,
                    fontSize: 25,
                  }}
                />
              </Box>
            </Stack>

            {/* PHONE */}

            <TextField
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
                inputMode:
                  'numeric',
                maxLength: 14,
              }}
              sx={{
                mb: 2.5,

                '& .MuiOutlinedInput-root':
                  {
                    borderRadius: 3,
                    background:
                      colors.inputBackground,
                    color:
                      colors.primaryText,
                  },

                '& .MuiOutlinedInput-notchedOutline':
                  {
                    borderColor:
                      colors.border,
                  },

                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                  {
                    borderColor:
                      colors.green,
                  },

                '& .MuiInputLabel-root':
                  {
                    color:
                      colors.mutedText,
                  },

                '& .MuiInputLabel-root.Mui-focused':
                  {
                    color:
                      colors.greenBright,
                  },

                '& .Mui-focused .MuiOutlinedInput-notchedOutline':
                  {
                    borderColor:
                      colors.green,
                  },

                '& input::placeholder':
                  {
                    color:
                      colors.mutedText,
                    opacity: 0.65,
                  },
              }}
            />

            {/* NETWORK LABEL */}

            <Typography
              sx={{
                color:
                  colors.secondaryText,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.1,
                textTransform:
                  'uppercase',
                mb: 1,
              }}
            >
              Select Network
            </Typography>

            {/* NETWORKS */}

            <Box
              sx={{
                display: 'flex',
                gap: 1.2,
                overflowX: 'auto',
                pb: 0.5,
                scrollbarWidth:
                  'none',
                '&::-webkit-scrollbar':
                  {
                    display:
                      'none',
                  },
              }}
            >
              {NETWORKS.map(
                (item) => {
                  const selected =
                    network ===
                    item.name;

                  const pressed =
                    pressedNetwork ===
                    item.name;

                  return (
                    <Box
                      key={
                        item.name
                      }
                      onClick={() =>
                        handleNetworkChange(
                          item.name
                        )
                      }
                      onMouseDown={() =>
                        setPressedNetwork(
                          item.name
                        )
                      }
                      onMouseUp={() =>
                        setPressedNetwork(
                          null
                        )
                      }
                      onMouseLeave={() =>
                        setPressedNetwork(
                          null
                        )
                      }
                      onTouchStart={() =>
                        setPressedNetwork(
                          item.name
                        )
                      }
                      onTouchEnd={() =>
                        setPressedNetwork(
                          null
                        )
                      }
                      sx={{
                        minWidth: {
                          xs: 88,
                          sm: 102,
                        },
                        flexShrink: 0,
                        cursor:
                          'pointer',
                        borderRadius: 3,
                        border: selected
                          ? `1.5px solid ${colors.greenBright}`
                          : `1px solid ${colors.border}`,
                        background:
                          selected
                            ? colors.greenSoft
                            : colors.surface,
                        p: 1.1,
                        transition:
                          'all 0.15s ease',
                        transform:
                          pressed
                            ? 'scale(0.97)'
                            : 'scale(1)',
                        '&:hover':
                          {
                            borderColor:
                              colors.green,
                          },
                      }}
                    >
                      <Box
                        sx={{
                          width: 43,
                          height: 43,
                          mx: 'auto',
                          borderRadius: 2.5,
                          background:
                            '#ffffff',
                          border:
                            '1px solid #e5ebe8',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          overflow:
                            'hidden',
                        }}
                      >
                        {!logoErrors[
                          item.name
                        ] ? (
                          <img
                            src={
                              item.logo
                            }
                            alt={`${item.name} logo`}
                            style={{
                              width: 32,
                              height: 32,
                              objectFit:
                                'contain',
                            }}
                            onError={() =>
                              setLogoErrors(
                                (
                                  previous
                                ) => ({
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
                              color:
                                colors.green,
                              fontWeight:
                                900,
                              fontSize: 13,
                            }}
                          >
                            {
                              item.fallback
                            }
                          </Typography>
                        )}
                      </Box>

                      <Typography
                        sx={{
                          textAlign:
                            'center',
                          mt: 0.8,
                          color:
                            selected
                              ? colors.greenBright
                              : colors.secondaryText,
                          fontSize: 11.5,
                          fontWeight: 800,
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                  );
                }
              )}
            </Box>
          </Card>

          {/* ===================================================
              DATA PLANS
          =================================================== */}

          <Card
            elevation={0}
            sx={{
              mt: 1.7,
              borderRadius: {
                xs: 3,
                sm: 4,
              },
              background:
                colors.surface,
              border: `1px solid ${colors.border}`,
              boxShadow: isDarkMode
                ? '0 12px 35px rgba(0,0,0,0.18)'
                : '0 8px 30px rgba(10,70,50,0.05)',
              p: {
                xs: 1.8,
                sm: 2.5,
              },
              transition:
                'background-color 0.2s ease, border-color 0.2s ease',
            }}
          >
            {/* TITLE */}

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1.5}
            >
              <Box>
                <Typography
                  sx={{
                    color:
                      colors.primaryText,
                    fontSize: 21,
                    fontWeight: 850,
                  }}
                >
                  Data Plans
                </Typography>

                <Typography
                  sx={{
                    color:
                      colors.mutedText,
                    fontSize: 12,
                    mt: 0.2,
                  }}
                >
                  {network} plans
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  background:
                    colors.greenSoft,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <PhoneAndroidIcon
                  sx={{
                    color:
                      colors.greenBright,
                    fontSize: 21,
                  }}
                />
              </Box>
            </Stack>

            {/* CATEGORY NAVIGATION */}

            <Box
              sx={{
                display: 'flex',
                gap: 0.8,
                overflowX: 'auto',
                pb: 1.3,
                scrollbarWidth:
                  'none',
                '&::-webkit-scrollbar':
                  {
                    display:
                      'none',
                  },
              }}
            >
              {CATEGORY_ORDER.map(
                (category) => {
                  const hasPlans =
                    groupedPlans[
                      category
                    ]?.length > 0;

                  const selected =
                    activeCategory ===
                    category;

                  return (
                    <Button
                      key={
                        category
                      }
                      disableRipple
                      disabled={
                        !hasPlans
                      }
                      onClick={() =>
                        setActiveCategory(
                          category
                        )
                      }
                      sx={{
                        flexShrink: 0,
                        minWidth:
                          'auto',
                        px: 1.8,
                        py: 0.8,
                        borderRadius:
                          999,
                        textTransform:
                          'none',
                        fontSize: 11.5,
                        fontWeight: 800,
                        color:
                          selected
                            ? '#ffffff'
                            : colors.secondaryText,
                        background:
                          selected
                            ? colors.green
                            : colors.surfaceSoft,
                        border: selected
                          ? `1px solid ${colors.green}`
                          : `1px solid ${colors.border}`,
                        '&:hover':
                          {
                            background:
                              selected
                                ? colors.greenDark
                                : colors.surfacePressed,
                          },
                        '&.Mui-disabled':
                          {
                            color:
                              isDarkMode
                                ? '#46574e'
                                : '#b9c4bf',
                            background:
                              isDarkMode
                                ? '#0c1511'
                                : '#fafbfa',
                            border:
                              `1px solid ${colors.divider}`,
                          },
                      }}
                    >
                      {category}
                    </Button>
                  );
                }
              )}
            </Box>

            <Divider
              sx={{
                borderColor:
                  colors.divider,
                mb: 1.8,
              }}
            />

            {/* LOADING */}

            {loadingPlans ? (
              <Box
                sx={{
                  minHeight: 230,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  flexDirection:
                    'column',
                  gap: 1.2,
                }}
              >
                <CircularProgress
                  size={31}
                  thickness={3}
                  sx={{
                    color:
                      colors.greenBright,
                  }}
                />

                <Typography
                  sx={{
                    color:
                      colors.secondaryText,
                    fontSize: 13,
                  }}
                >
                  Loading {network}{' '}
                  data plans...
                </Typography>
              </Box>
            ) : activePlans.length ===
              0 ? (
              <Box
                sx={{
                  minHeight: 230,
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  textAlign: 'center',
                  px: 2,
                }}
              >
                <Box>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      background:
                        colors.greenSoft,
                      display:
                        'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      mx: 'auto',
                      mb: 1.2,
                    }}
                  >
                    <WifiIcon
                      sx={{
                        color:
                          colors.greenBright,
                      }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      color:
                        colors.primaryText,
                      fontWeight: 800,
                    }}
                  >
                    No{' '}
                    {activeCategory}{' '}
                    plans available
                  </Typography>

                  <Typography
                    sx={{
                      color:
                        colors.mutedText,
                      fontSize: 12,
                      mt: 0.5,
                    }}
                  >
                    Select another
                    category to view
                    available plans.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                <Typography
                  sx={{
                    color:
                      colors.mutedText,
                    fontSize: 11,
                    mb: 1.5,
                  }}
                >
                  {activePlans.length}{' '}
                  {activeCategory}{' '}
                  plan
                  {activePlans.length ===
                  1
                    ? ''
                    : 's'}{' '}
                  available
                </Typography>

                {/* PLAN GRID */}

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns:
                      {
                        xs: 'repeat(2, minmax(0, 1fr))',
                        sm: 'repeat(3, minmax(0, 1fr))',
                      },
                    gap: {
                      xs: 1.1,
                      sm: 1.5,
                    },
                  }}
                >
                  {activePlans.map(
                    (plan) => (
                      <Card
                        key={
                          plan.variation_code
                        }
                        elevation={0}
                        sx={{
                          borderRadius:
                            {
                              xs: 2.8,
                              sm: 3.2,
                            },
                          border: `1px solid ${colors.border}`,
                          background:
                            colors.surfaceSoft,
                          p: {
                            xs: 1.4,
                            sm: 1.8,
                          },
                          minHeight:
                            {
                              xs: 164,
                              sm: 178,
                            },
                          display:
                            'flex',
                          flexDirection:
                            'column',
                          justifyContent:
                            'space-between',
                          transition:
                            'all 0.18s ease',
                          '&:hover':
                            {
                              borderColor:
                                colors.greenSoftBorder,
                              boxShadow:
                                isDarkMode
                                  ? '0 8px 22px rgba(0,0,0,0.22)'
                                  : '0 8px 22px rgba(10,90,60,0.08)',
                            },
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              color:
                                colors.primaryText,
                              fontSize:
                                {
                                  xs: 15,
                                  sm: 17,
                                },
                              lineHeight:
                                1.2,
                              fontWeight:
                                850,
                            }}
                          >
                            {
                              plan.name
                            }
                          </Typography>

                          {plan.validity && (
                            <Typography
                              sx={{
                                color:
                                  colors.mutedText,
                                fontSize: 10.5,
                                mt: 0.6,
                              }}
                            >
                              Valid for{' '}
                              {
                                plan.validity
                              }
                            </Typography>
                          )}

                          <Typography
                            sx={{
                              color:
                                colors.greenBright,
                              fontSize:
                                {
                                  xs: 16,
                                  sm: 18,
                                },
                              fontWeight:
                                900,
                              mt: 1.15,
                            }}
                          >
                            {formatNaira(
                              plan.amount
                            )}
                          </Typography>
                        </Box>

                        <Button
                          fullWidth
                          disableElevation
                          onClick={() =>
                            handleBuyClick(
                              plan
                            )
                          }
                          sx={{
                            mt: 1.5,
                            borderRadius:
                              2,
                            background:
                              colors.green,
                            color:
                              '#ffffff',
                            textTransform:
                              'none',
                            fontSize: 11.5,
                            fontWeight:
                              850,
                            py: 0.95,
                            '&:hover':
                              {
                                background:
                                  colors.greenDark,
                              },
                            '&:active':
                              {
                                transform:
                                  'scale(0.98)',
                              },
                          }}
                        >
                          Buy Data
                        </Button>
                      </Card>
                    )
                  )}
                </Box>
              </>
            )}
          </Card>

          {/* ===================================================
              SECURITY
          =================================================== */}

          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={0.6}
            sx={{
              mt: 2,
            }}
          >
            <SecurityIcon
              sx={{
                color:
                  colors.greenBright,
                fontSize: 15,
              }}
            />

            <Typography
              sx={{
                color:
                  colors.mutedText,
                fontSize: 10,
              }}
            >
              Secured by ZENIMONIES
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* =========================================================
          TRANSACTION PIN DIALOG
      ========================================================= */}

      <Dialog
        open={showTransactionPin}
        onClose={closePinDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background:
              colors.surface,
            border: `1px solid ${colors.border}`,
            color:
              colors.primaryText,
            boxShadow: isDarkMode
              ? '0 25px 70px rgba(0,0,0,0.55)'
              : '0 25px 70px rgba(20,60,45,0.18)',
          },
        }}
      >
        <DialogTitle
          sx={{
            color:
              colors.primaryText,
            fontWeight: 850,
            pb: 1,
          }}
        >
          Confirm Purchase

          <IconButton
            onClick={closePinDialog}
            disabled={buying}
            aria-label="Close"
            sx={{
              position:
                'absolute',
              right: 10,
              top: 10,
              color:
                colors.mutedText,
              '&:hover':
                {
                  background:
                    colors.surfacePressed,
                },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {selectedPlan && (
            <Box
              sx={{
                borderRadius: 3,
                background:
                  colors.greenSoft,
                border: `1px solid ${colors.greenSoftBorder}`,
                p: 1.8,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  color:
                    colors.primaryText,
                  fontWeight: 850,
                }}
              >
                {selectedPlan.name}
              </Typography>

              <Typography
                sx={{
                  color:
                    colors.greenBright,
                  fontWeight: 900,
                  mt: 0.4,
                }}
              >
                {formatNaira(
                  selectedPlan.amount
                )}
              </Typography>

              <Typography
                sx={{
                  color:
                    colors.secondaryText,
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

              if (
                value.length <= 4
              ) {
                setTransactionPin(
                  value
                );
              }

              setTransactionPinError(
                ''
              );
            }}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
            inputProps={{
              maxLength: 4,
              inputMode:
                'numeric',
            }}
            error={Boolean(
              transactionPinError
            )}
            helperText={
              transactionPinError ||
              'Enter your 4-digit Transaction PIN.'
            }
            sx={{
              '& .MuiOutlinedInput-root':
                {
                  borderRadius: 3,
                  background:
                    colors.inputBackground,
                  color:
                    colors.primaryText,
                },

              '& .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    colors.border,
                },

              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    colors.green,
                },

              '& .MuiInputLabel-root':
                {
                  color:
                    colors.mutedText,
                },

              '& .MuiInputLabel-root.Mui-focused':
                {
                  color:
                    colors.greenBright,
                },

              '& .Mui-focused .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    colors.green,
                },

              '& .MuiFormHelperText-root':
                {
                  color:
                    transactionPinError
                      ? undefined
                      : colors.mutedText,
                },

              '& input::placeholder':
                {
                  color:
                    colors.mutedText,
                  opacity: 0.7,
                },
            }}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            pb: 2,
          }}
        >
          <Button
            onClick={
              closePinDialog
            }
            disabled={buying}
            sx={{
              color:
                colors.secondaryText,
              textTransform:
                'none',
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
              transactionPin.length !==
                4
            }
            variant="contained"
            endIcon={
              buying ? (
                <CircularProgress
                  size={16}
                  sx={{
                    color:
                      '#ffffff',
                  }}
                />
              ) : (
                <ArrowForwardIosIcon
                  sx={{
                    fontSize: 12,
                  }}
                />
              )
            }
            sx={{
              background:
                colors.green,
              color:
                '#ffffff',
              textTransform:
                'none',
              fontWeight: 850,
              borderRadius: 2.5,
              px: 2.2,
              '&:hover':
                {
                  background:
                    colors.greenDark,
                },
              '&.Mui-disabled':
                {
                  background:
                    isDarkMode
                      ? '#26362f'
                      : '#dce8e2',
                  color:
                    isDarkMode
                      ? '#687970'
                      : '#9aa59f',
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
          setSnackbar(
            (previous) => ({
              ...previous,
              open: false,
            })
          )
        }
      >
        <Alert
          severity={
            snackbar.severity
          }
          onClose={() =>
            setSnackbar(
              (previous) => ({
                ...previous,
                open: false,
              })
            )
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
