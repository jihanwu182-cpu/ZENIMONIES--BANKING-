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

const ZEN_GREEN = '#087f5b';
const ZEN_DARK_GREEN = '#056247';
const ZEN_LIGHT_GREEN = '#eaf7f1';

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
  ).format(normalizeAmount(value));
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

  // IMPORTANT:
  // VTpass identifies the actual data product
  // using variation_code. We therefore check:
  //
  // 1. variation_code
  // 2. plan name
  // 3. description
  //
  // This prevents valid Glo/Airtel/MTN plans
  // from disappearing into "Other".

  const variationCode =
    String(
      plan.variation_code || ''
    ).toLowerCase();

  const name =
    String(
      plan.name || ''
    ).toLowerCase();

  const description =
    String(
      plan.description || ''
    ).toLowerCase();

  const text =
    `${variationCode} ${name} ${description}`;


  // ==========================================================
  // HOT
  // Only use this when the provider/catalogue explicitly
  // identifies a plan as hot, popular or featured.
  // ==========================================================

  if (
    text.includes('hot') ||
    text.includes('popular') ||
    text.includes('featured')
  ) {
    return 'HOT';
  }


  // ==========================================================
  // ROUTER / MIFI / ODU
  // ==========================================================

  if (
    text.includes('router') ||
    text.includes('mifi') ||
    text.includes('mi-fi') ||
    text.includes('odu')
  ) {
    return 'Router';
  }


  // ==========================================================
  // 3 MONTHS+
  // ==========================================================

  if (
    text.includes('3 month') ||
    text.includes('3-month') ||
    text.includes('90 day') ||
    text.includes('90-day') ||
    text.includes('120 day') ||
    text.includes('120-day') ||
    text.includes('180 day') ||
    text.includes('180-day') ||
    text.includes('365 day') ||
    text.includes('365-day') ||
    text.includes('long term') ||
    text.includes('long-term')
  ) {
    return '3 Months+';
  }


  // ==========================================================
  // MONTHLY
  //
  // Check monthly BEFORE generic day detection.
  // ==========================================================

  if (
    variationCode.includes('monthly') ||
    variationCode.includes('month') ||
    text.includes('monthly') ||
    text.includes('30 day') ||
    text.includes('30-day') ||
    text.includes('30days') ||
    text.includes('30 days')
  ) {
    return 'Monthly';
  }


  // ==========================================================
  // SPECIAL
  // ==========================================================

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


  // ==========================================================
  // WEEKEND
  // ==========================================================

  if (
    variationCode.includes('weekend') ||
    text.includes('weekend') ||
    text.includes('saturday') ||
    text.includes('sunday')
  ) {
    return 'Weekend';
  }


  // ==========================================================
  // SOCIAL
  // ==========================================================

  if (
    variationCode.includes('social') ||
    variationCode.includes('myg') ||
    variationCode.includes('whatsapp') ||
    variationCode.includes('instagram') ||
    variationCode.includes('tiktok') ||
    variationCode.includes('facebook') ||
    variationCode.includes('telegram') ||
    variationCode.includes('opera') ||
    variationCode.includes('insta') ||
    variationCode.includes('text') ||
    text.includes('social') ||
    text.includes('whatsapp') ||
    text.includes('instagram') ||
    text.includes('tiktok') ||
    text.includes('facebook') ||
    text.includes('telegram')
  ) {
    return 'Social';
  }


  // ==========================================================
  // BINGE / YOUTUBE
  // ==========================================================

  if (
    variationCode.includes('binge') ||
    variationCode.includes('youtube') ||
    text.includes('binge') ||
    text.includes('youtube')
  ) {
    return 'Binge';
  }


  // ==========================================================
  // NIGHT
  // ==========================================================

  if (
    variationCode.includes('night') ||
    text.includes('night') ||
    text.includes('12am') ||
    text.includes('12 am') ||
    text.includes('1am') ||
    text.includes('1 am') ||
    text.includes('2am') ||
    text.includes('2 am') ||
    text.includes('3am') ||
    text.includes('3 am') ||
    text.includes('4am') ||
    text.includes('4 am') ||
    text.includes('5am') ||
    text.includes('5 am')
  ) {
    return 'Night';
  }


  // ==========================================================
  // EXTRA NIGHT
  //
  // Some providers include night bonuses inside the
  // daily bundle name. Those are still Daily plans,
  // not pure Night plans, so we don't move them to Night
  // unless the variation itself is explicitly a night plan.
  // ==========================================================


  // ==========================================================
  // WEEKLY
  // ==========================================================

  if (
    variationCode.includes('weekly') ||
    variationCode.includes('week') ||
    variationCode.includes('2weeks') ||
    variationCode.includes('2-weeks') ||
    text.includes('weekly') ||
    text.includes('7 day') ||
    text.includes('7-day') ||
    text.includes('7days') ||
    text.includes('7 days') ||
    text.includes('14 day') ||
    text.includes('14-day') ||
    text.includes('14days') ||
    text.includes('14 days')
  ) {
    return 'Weekly';
  }


  // ==========================================================
  // DAILY
  //
  // This is the important fix.
  //
  // Examples:
  // glo-daily-50
  // glo-daily-100
  // glo-2days-200
  // glo-3days-400
  // etc.
  // ==========================================================

  if (
    variationCode.includes('daily') ||
    variationCode.includes('1day') ||
    variationCode.includes('1-day') ||
    variationCode.includes('2days') ||
    variationCode.includes('2-days') ||
    variationCode.includes('3days') ||
    variationCode.includes('3-days') ||
    variationCode.includes('4days') ||
    variationCode.includes('4-days') ||
    variationCode.includes('5days') ||
    variationCode.includes('5-days') ||
    variationCode.includes('6days') ||
    variationCode.includes('6-days') ||
    text.includes('daily') ||
    text.includes('1 day') ||
    text.includes('1-day') ||
    text.includes('1days') ||
    text.includes('2 days') ||
    text.includes('2-day') ||
    text.includes('2 days') ||
    text.includes('3 days') ||
    text.includes('3-day') ||
    text.includes('4 days') ||
    text.includes('4-day') ||
    text.includes('5 days') ||
    text.includes('5-day') ||
    text.includes('6 days') ||
    text.includes('6-day')
  ) {
    return 'Daily';
  }


  // ==========================================================
  // OTHER
  // ==========================================================

  return 'Other';
};

  

const Data: React.FC = () => {
  const [network, setNetwork] =
    useState<Network>('MTN');

  const [plans, setPlans] = useState<
    DataPlan[]
  >([]);

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [buying, setBuying] =
    useState(false);

  const [phone, setPhone] =
    useState('');

  const [selectedPlan, setSelectedPlan] =
    useState<DataPlan | null>(null);

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

  const [snackbar, setSnackbar] =
    useState<{
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

  const [logoErrors, setLogoErrors] =
    useState<
      Record<string, boolean>
    >({});

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

        groups[category].push(plan);
      });

      return groups;
    }, [plans]);

  const availableCategories =
    useMemo(() => {
      return CATEGORY_ORDER.filter(
        (category) =>
          groupedPlans[category] &&
          groupedPlans[category].length >
            0
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
    groupedPlans[activeCategory] ||
    [];

  const handleNetworkChange = (
    selectedNetwork: Network
  ) => {
    setNetwork(selectedNetwork);
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

  return (
    <>
      <Box
        sx={{
          minHeight: '100vh',
          background:
            '#f7faf8',
          px: {
            xs: 1.5,
            sm: 3,
          },
          py: {
            xs: 2,
            sm: 3,
          },
          pb: 7,
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
          }}
        >
          {/* =====================================================
              HEADER
          ===================================================== */}

          <Card
            elevation={0}
            sx={{
              borderRadius: {
                xs: 3,
                sm: 4,
              },
              background:
                '#ffffff',
              border:
                '1px solid #e4ebe7',
              boxShadow:
                '0 8px 30px rgba(10, 70, 50, 0.06)',
              p: {
                xs: 2,
                sm: 3,
              },
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
                      ZEN_GREEN,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform:
                      'uppercase',
                  }}
                >
                  Zenimonies
                </Typography>

                <Typography
                  sx={{
                    color:
                      '#17221d',
                    fontSize: {
                      xs: 27,
                      sm: 31,
                    },
                    fontWeight: 850,
                    lineHeight: 1.1,
                    mt: 0.4,
                  }}
                >
                  Mobile Data
                </Typography>

                <Typography
                  sx={{
                    color:
                      '#718079',
                    fontSize: 13,
                    mt: 0.7,
                  }}
                >
                  Choose your network
                  and select a data
                  plan.
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
                    ZEN_LIGHT_GREEN,
                  border:
                    '1px solid #d4eee2',
                }}
              >
                <WifiIcon
                  sx={{
                    color:
                      ZEN_GREEN,
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
                inputMode: 'numeric',
                maxLength: 14,
              }}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root':
                  {
                    borderRadius: 3,
                    background:
                      '#fbfcfb',
                    color:
                      '#17221d',
                  },
                '& .MuiOutlinedInput-notchedOutline':
                  {
                    borderColor:
                      '#dce5e0',
                  },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                  {
                    borderColor:
                      ZEN_GREEN,
                  },
                '& .MuiInputLabel-root':
                  {
                    color:
                      '#7c8882',
                  },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline':
                  {
                    borderColor:
                      ZEN_GREEN,
                  },
                '& .MuiInputLabel-root.Mui-focused':
                  {
                    color:
                      ZEN_GREEN,
                  },
              }}
            />

            {/* NETWORK TITLE */}

            <Typography
              sx={{
                color:
                  '#4d5b54',
                fontSize: 12,
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
                    display: 'none',
                  },
              }}
            >
              {NETWORKS.map(
                (item) => {
                  const selected =
                    network ===
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
                      sx={{
                        minWidth: {
                          xs: 91,
                          sm: 105,
                        },
                        flexShrink: 0,
                        cursor:
                          'pointer',
                        borderRadius: 3,
                        border:
                          selected
                            ? `1.5px solid ${ZEN_GREEN}`
                            : '1px solid #e0e7e3',
                        background:
                          selected
                            ? ZEN_LIGHT_GREEN
                            : '#ffffff',
                        p: 1.2,
                        transition:
                          'all 0.18s ease',
                        '&:active': {
                          transform:
                            'scale(0.98)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 45,
                          height: 45,
                          mx: 'auto',
                          borderRadius: 2.5,
                          background:
                            '#ffffff',
                          border:
                            '1px solid #edf0ee',
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
                              width: 34,
                              height: 34,
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
                                ZEN_GREEN,
                              fontWeight:
                                900,
                              fontSize: 14,
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
                              ? ZEN_DARK_GREEN
                              : '#58645e',
                          fontSize: 12,
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

          {/* =====================================================
              DATA PLANS
          ===================================================== */}

          <Card
            elevation={0}
            sx={{
              mt: 2,
              borderRadius: {
                xs: 3,
                sm: 4,
              },
              background:
                '#ffffff',
              border:
                '1px solid #e4ebe7',
              boxShadow:
                '0 8px 30px rgba(10, 70, 50, 0.05)',
              p: {
                xs: 2,
                sm: 2.5,
              },
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
                      '#17221d',
                    fontSize: 21,
                    fontWeight: 850,
                  }}
                >
                  Data Plans
                </Typography>

                <Typography
                  sx={{
                    color:
                      '#7a8781',
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
                    ZEN_LIGHT_GREEN,
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
                      ZEN_GREEN,
                    fontSize: 21,
                  }}
                />
              </Box>
            </Stack>

            {/* =================================================
                HORIZONTAL CATEGORY NAVIGATION
            ================================================= */}

            <Box
              sx={{
                display: 'flex',
                gap: 0.9,
                overflowX: 'auto',
                pb: 1.4,
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
                        px: 2,
                        py: 0.9,
                        borderRadius:
                          999,
                        textTransform:
                          'none',
                        fontSize: 12,
                        fontWeight: 800,
                        color:
                          selected
                            ? '#ffffff'
                            : '#69756f',
                        background:
                          selected
                            ? ZEN_GREEN
                            : '#f5f7f6',
                        border:
                          selected
                            ? `1px solid ${ZEN_GREEN}`
                            : '1px solid #e3e9e5',
                        '&:hover':
                          {
                            background:
                              selected
                                ? ZEN_DARK_GREEN
                                : '#edf3ef',
                          },
                        '&.Mui-disabled':
                          {
                            color:
                              '#c3cac6',
                            background:
                              '#fafbfa',
                            border:
                              '1px solid #edf0ee',
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
                  '#edf1ef',
                mb: 2,
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
                      ZEN_GREEN,
                  }}
                />

                <Typography
                  sx={{
                    color:
                      '#78847e',
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
                        ZEN_LIGHT_GREEN,
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
                          ZEN_GREEN,
                      }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      color:
                        '#34413b',
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
                        '#89938e',
                      fontSize: 12,
                      mt: 0.5,
                    }}
                  >
                    Select another
                    category to
                    view available
                    plans.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                <Typography
                  sx={{
                    color:
                      '#7d8983',
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
                      xs: 1.2,
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
                          border:
                            '1px solid #e1e8e4',
                          background:
                            '#ffffff',
                          p: {
                            xs: 1.5,
                            sm: 1.8,
                          },
                          minHeight:
                            {
                              xs: 166,
                              sm: 180,
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
                                '#b9d9ca',
                              boxShadow:
                                '0 8px 22px rgba(10, 90, 60, 0.08)',
                            },
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              color:
                                '#17221d',
                              fontSize:
                                {
                                  xs: 16,
                                  sm: 18,
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
                                  '#7b8781',
                                fontSize: 11,
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
                                ZEN_GREEN,
                              fontSize:
                                {
                                  xs: 17,
                                  sm: 19,
                                },
                              fontWeight:
                                900,
                              mt: 1.2,
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
                              ZEN_GREEN,
                            color:
                              '#ffffff',
                            textTransform:
                              'none',
                            fontSize: 12,
                            fontWeight:
                              850,
                            py: 1,
                            '&:hover':
                              {
                                background:
                                  ZEN_DARK_GREEN,
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

          {/* =====================================================
              SECURITY
          ===================================================== */}

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
                  ZEN_GREEN,
                fontSize: 15,
              }}
            />

            <Typography
              sx={{
                color:
                  '#8a948f',
                fontSize: 10,
              }}
            >
              Secured by Zenimonies
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* =========================================================
          TRANSACTION PIN
      ========================================================= */}

      <Dialog
        open={showTransactionPin}
        onClose={() => {
          if (!buying) {
            setShowTransactionPin(
              false
            );
            setTransactionPin('');
            setTransactionPinError('');
          }
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background:
              '#ffffff',
            border:
              '1px solid #e0e8e3',
            boxShadow:
              '0 25px 70px rgba(20, 60, 45, 0.18)',
          },
        }}
      >
        <DialogTitle
          sx={{
            color:
              '#17221d',
            fontWeight: 850,
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
              position:
                'absolute',
              right: 10,
              top: 10,
              color:
                '#7c8781',
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
                  ZEN_LIGHT_GREEN,
                border:
                  '1px solid #d6ede2',
                p: 1.8,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  color:
                    '#1d2923',
                  fontWeight: 850,
                }}
              >
                {selectedPlan.name}
              </Typography>

              <Typography
                sx={{
                  color:
                    ZEN_GREEN,
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
                    '#738078',
                  fontSize: 11,
                  mt: 0.4,
                }}
              >
                {network} •{' '}
                {phone}
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
                },
              '& .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    '#dce5e0',
                },
              '& .Mui-focused .MuiOutlinedInput-notchedOutline':
                {
                  borderColor:
                    ZEN_GREEN,
                },
              '& .MuiInputLabel-root.Mui-focused':
                {
                  color:
                    ZEN_GREEN,
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
              color:
                '#758079',
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
                ZEN_GREEN,
              color:
                '#ffffff',
              textTransform:
                'none',
              fontWeight:
                850,
              borderRadius: 2.5,
              px: 2.2,
              '&:hover':
                {
                  background:
                    ZEN_DARK_GREEN,
                },
              '&.Mui-disabled':
                {
                  background:
                    '#dce8e2',
                  color:
                    '#9aa59f',
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
        open={
          snackbar.open
        }
        autoHideDuration={
          4500
        }
        onClose={() =>
          setSnackbar(
            (
              previous
            ) => ({
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
              (
                previous
              ) => ({
                ...previous,
                open: false,
              })
            )
          }
          sx={{
            width: '100%',
          }}
        >
          {
            snackbar.message
          }
        </Alert>
      </Snackbar>
    </>
  );
};

export default Data;
