import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Lock,
  Verified,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type Provider = 'DSTV' | 'GOTV' | 'STARTIMES';

interface TVPlan {
  variation_code: string;
  name: string;
  amount: number;
  fixedPrice?: boolean;
  serviceID?: string;
  provider?: string;
}

interface VerificationResult {
  customerName?: string;
  customer_name?: string;
  currentBouquet?: string;
  current_bouquet?: string;
  renewalAmount?: number;
  renewal_amount?: number;
  dueDate?: string;
  due_date?: string;
  status?: string;
}

const GREEN = '#176b45';
const DARK_GREEN = '#0d5134';
const LIGHT_GREEN = '#eaf7f0';

const PROVIDERS: {
  value: Provider;
  label: string;
  logo: string;
}[] = [
  {
    value: 'DSTV',
    label: 'DStv',
    logo: 'https://brandlogos.sgp1.digitaloceanspaces.com/svg/cbi/dstv.svg',
  },
  {
    value: 'GOTV',
    label: 'GOtv',
    logo: 'https://brandlogos.sgp1.digitaloceanspaces.com/svg/cbi/gotv.svg',
  },
  {
    value: 'STARTIMES',
    label: 'StarTimes',
    logo: 'https://brandlogos.sgp1.digitaloceanspaces.com/svg/cbi/startimes.svg',
  },
];

function getProvider(provider: Provider) {
  return PROVIDERS.find(
    (item) => item.value === provider
  );
}

function getToken(): string {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    ''
  );
}

function formatNaira(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(value);
}

function normalizeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export default function TVSubscription() {
  const navigate = useNavigate();

  const [provider, setProvider] =
    useState<Provider>('DSTV');

  const [customerReference, setCustomerReference] =
    useState('');

  const [phone, setPhone] = useState('');

  const [plans, setPlans] = useState<TVPlan[]>([]);

  const [selectedPlan, setSelectedPlan] =
    useState<TVPlan | null>(null);

  const [verification, setVerification] =
    useState<VerificationResult | null>(null);

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [buying, setBuying] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [pinDialogOpen, setPinDialogOpen] =
    useState(false);

  const [transactionPin, setTransactionPin] =
    useState('');

  const [subscriptionType, setSubscriptionType] =
    useState<'renew' | 'change'>('renew');

  const [quantity, setQuantity] = useState(1);

  const token = useMemo(
    () => getToken(),
    []
  );

  const selectedProvider = getProvider(provider);

  useEffect(() => {
    loadPlans(provider);
  }, [provider]);

  async function loadPlans(
    selectedProvider: Provider
  ) {
    setLoadingPlans(true);
    setError('');
    setPlans([]);
    setSelectedPlan(null);

    try {
      const response = await fetch(
        `${API_URL}/tv/plans?provider=${encodeURIComponent(
          selectedProvider
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
            data?.error ||
            'Unable to load TV plans.'
        );
      }

      const receivedPlans =
        data?.plans ||
        data?.data?.plans ||
        data?.data ||
        [];

      if (!Array.isArray(receivedPlans)) {
        throw new Error(
          'No TV plans were returned.'
        );
      }

      const normalizedPlans: TVPlan[] =
        receivedPlans
          .map((plan: any) => ({
            variation_code:
              plan?.variation_code ||
              plan?.variationCode ||
              '',

            name:
              plan?.name ||
              plan?.variation_name ||
              plan?.description ||
              'TV Subscription',

            amount: normalizeAmount(
              plan?.amount ??
                plan?.variation_amount ??
                plan?.price
            ),

            fixedPrice: plan?.fixedPrice,

            serviceID:
              plan?.serviceID ||
              plan?.service_id,

            provider: selectedProvider,
          }))
          .filter(
            (plan: TVPlan) =>
              Boolean(plan.variation_code) &&
              plan.amount > 0
          );

      setPlans(normalizedPlans);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load TV plans. Please try again.'
      );
    } finally {
      setLoadingPlans(false);
    }
  }

  async function verifyAccount() {
    setError('');
    setSuccess('');
    setVerification(null);

    const cleanReference =
      customerReference.trim();

    if (!cleanReference) {
      setError(
        `Enter your ${
          provider === 'STARTIMES'
            ? 'Smartcard'
            : 'Smartcard / IUC'
        } number.`
      );
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch(
        `${API_URL}/tv/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            billersCode: cleanReference,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Unable to verify the TV account.'
        );
      }

      const result =
        data?.verification ||
        data?.customer ||
        data?.data ||
        data;

      setVerification(result);

      setSuccess(
        'TV account verified successfully.'
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to verify this TV account.'
      );
    } finally {
      setVerifying(false);
    }
  }

  function openPinDialog() {
    setError('');
    setSuccess('');

    if (!customerReference.trim()) {
      setError(
        'Enter and verify your Smartcard / IUC number first.'
      );
      return;
    }

    if (!verification) {
      setError(
        'Please verify the TV account before making payment.'
      );
      return;
    }

    if (!selectedPlan) {
      setError(
        'Please select a subscription plan.'
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        'Enter the phone number for this transaction.'
      );
      return;
    }

    setTransactionPin('');
    setPinDialogOpen(true);
  }

  async function purchaseSubscription() {
    if (transactionPin.length !== 4) {
      setError(
        'Enter your 4-digit Transaction PIN.'
      );
      return;
    }

    if (!selectedPlan) {
      setError(
        'Please select a subscription plan.'
      );
      return;
    }

    setBuying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/tv`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            billersCode:
              customerReference.trim(),

            variationCode:
              selectedPlan.variation_code,

            amount:
              selectedPlan.amount,

            phone:
              phone.trim(),

            subscriptionType,
            quantity,

            transaction_pin:
              transactionPin,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            'TV subscription could not be completed.'
        );
      }

      setPinDialogOpen(false);
      setTransactionPin('');

      if (
        response.status === 202 ||
        data?.status === 'pending' ||
        data?.transaction?.status ===
          'pending'
      ) {
        setSuccess(
          data?.message ||
            'Your TV subscription is pending provider confirmation.'
        );
      } else {
        setSuccess(
          data?.message ||
            'TV subscription completed successfully.'
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'TV subscription failed. Please try again.'
      );
    } finally {
      setBuying(false);
    }
  }

  const selectedAmount =
    selectedPlan?.amount || 0;

  const totalAmount =
    selectedAmount * quantity;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f5f8f6',
        py: { xs: 2, md: 5 },
        px: { xs: 1.5, md: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={() =>
            navigate('/dashboard')
          }
          sx={{
            mb: 2,
            color: GREEN,
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          Back to Dashboard
        </Button>

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #e1ebe5',
            overflow: 'hidden',
          }}
        >
          {/* HEADER */}

          <Box
            sx={{
              background:
                `linear-gradient(135deg, ${DARK_GREEN}, ${GREEN})`,
              color: '#fff',
              p: { xs: 3, md: 4 },
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: 3,
                  background:
                    'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1,
                }}
              >
                {selectedProvider && (
                  <Box
                    component="img"
                    src={selectedProvider.logo}
                    alt={`${selectedProvider.label} logo`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      background: '#fff',
                      borderRadius: 2,
                      p: 0.5,
                    }}
                    onError={(event) => {
                      event.currentTarget.style.display =
                        'none';
                    }}
                  />
                )}
              </Box>

              <Box>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{
                    fontSize: {
                      xs: '1.8rem',
                      md: '2.2rem',
                    },
                  }}
                >
                  TV Subscription
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    opacity: 0.9,
                  }}
                >
                  Subscribe to DStv, GOtv and
                  StarTimes from your Zenimonies
                  account.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent
            sx={{
              p: { xs: 2, md: 4 },
            }}
          >
            <Stack spacing={3}>
              {error && (
                <Alert
                  severity="error"
                  onClose={() =>
                    setError('')
                  }
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {error}
                </Alert>
              )}

              {success && (
                <Alert
                  severity="success"
                  onClose={() =>
                    setSuccess('')
                  }
                  icon={<CheckCircle />}
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {success}
                </Alert>
              )}

              {/* PROVIDER */}

              <Box>
                <Typography
                  fontWeight={800}
                  sx={{
                    mb: 1.2,
                    color: '#18352a',
                  }}
                >
                  TV Provider
                </Typography>

                <TextField
                  select
                  fullWidth
                  value={provider}
                  onChange={(event) => {
                    setProvider(
                      event.target.value as Provider
                    );

                    setCustomerReference('');
                    setVerification(null);
                    setSelectedPlan(null);
                    setSuccess('');
                    setError('');
                  }}
                  SelectProps={{
                    renderValue: (
                      selected
                    ) => {
                      const item =
                        getProvider(
                          selected as Provider
                        );

                      if (!item) {
                        return '';
                      }

                      return (
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            component="img"
                            src={item.logo}
                            alt={`${item.label} logo`}
                            sx={{
                              width: 46,
                              height: 30,
                              objectFit: 'contain',
                              borderRadius: 1,
                            }}
                          />

                          <Typography
                            fontWeight={700}
                          >
                            {item.label}
                          </Typography>
                        </Stack>
                      );
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      '&.Mui-focused fieldset': {
                        borderColor: GREEN,
                      },
                    },

                    '& .MuiInputLabel-root.Mui-focused':
                      {
                        color: GREEN,
                      },
                  }}
                >
                  {PROVIDERS.map(
                    (item) => (
                      <MenuItem
                        key={item.value}
                        value={item.value}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            component="img"
                            src={item.logo}
                            alt={`${item.label} logo`}
                            sx={{
                              width: 55,
                              height: 35,
                              objectFit: 'contain',
                            }}
                          />

                          <Typography
                            fontWeight={700}
                          >
                            {item.label}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    )
                  )}
                </TextField>
              </Box>

              {/* CUSTOMER NUMBER */}

              <Box>
                <TextField
                  fullWidth
                  label={
                    provider === 'STARTIMES'
                      ? 'Smartcard Number'
                      : 'Smartcard / IUC Number'
                  }
                  value={customerReference}
                  onChange={(event) => {
                    setCustomerReference(
                      event.target.value.replace(
                        /\s/g,
                        ''
                      )
                    );

                    setVerification(null);
                    setSuccess('');
                  }}
                  placeholder="Enter customer number"
                  inputProps={{
                    inputMode: 'numeric',
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,

                      '&.Mui-focused fieldset': {
                        borderColor: GREEN,
                      },
                    },

                    '& .MuiInputLabel-root.Mui-focused':
                      {
                        color: GREEN,
                      },
                  }}
                />

                <Button
                  variant="outlined"
                  startIcon={
                    verifying ? (
                      <CircularProgress
                        size={18}
                        color="inherit"
                      />
                    ) : (
                      <Verified />
                    )
                  }
                  disabled={
                    verifying ||
                    !customerReference.trim()
                  }
                  onClick={verifyAccount}
                  sx={{
                    mt: 1.5,
                    borderColor: GREEN,
                    color: GREEN,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,

                    '&:hover': {
                      borderColor: DARK_GREEN,
                      background:
                        LIGHT_GREEN,
                    },
                  }}
                >
                  {verifying
                    ? 'Verifying...'
                    : 'Verify Account'}
                </Button>
              </Box>

              {/* VERIFIED CUSTOMER */}

              {verification && (
                <Card
                  elevation={0}
                  sx={{
                    background: LIGHT_GREEN,
                    border:
                      '1px solid #cce8d8',
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    <Stack spacing={1.2}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <CheckCircle
                          sx={{
                            color: GREEN,
                          }}
                        />

                        <Typography
                          fontWeight={800}
                          color={DARK_GREEN}
                        >
                          Account Verified
                        </Typography>
                      </Stack>

                      <Divider />

                      <Typography>
                        <strong>
                          Customer:
                        </strong>{' '}
                        {verification.customerName ||
                          verification.customer_name ||
                          'Verified customer'}
                      </Typography>

                      {(verification.currentBouquet ||
                        verification.current_bouquet) && (
                        <Typography>
                          <strong>
                            Current package:
                          </strong>{' '}
                          {verification.currentBouquet ||
                            verification.current_bouquet}
                        </Typography>
                      )}

                      {(verification.dueDate ||
                        verification.due_date) && (
                        <Typography>
                          <strong>
                            Due date:
                          </strong>{' '}
                          {verification.dueDate ||
                            verification.due_date}
                        </Typography>
                      )}

                      {(verification.renewalAmount ||
                        verification.renewal_amount) && (
                        <Typography>
                          <strong>
                            Renewal amount:
                          </strong>{' '}
                          {formatNaira(
                            normalizeAmount(
                              verification.renewalAmount ??
                                verification.renewal_amount
                            )
                          )}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* PLANS */}

              <Box>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    mb: 1.5,
                  }}
                >
                  Subscription Plans
                </Typography>

                {!verification && (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    Verify your TV account
                    first to continue.
                  </Alert>
                )}

                {verification &&
                  loadingPlans && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent:
                          'center',
                        py: 4,
                      }}
                    >
                      <CircularProgress
                        sx={{
                          color: GREEN,
                        }}
                      />
                    </Box>
                  )}

                {verification &&
                  !loadingPlans &&
                  plans.length === 0 && (
                    <Alert
                      severity="warning"
                      sx={{
                        borderRadius: 2,
                      }}
                    >
                      No subscription plans
                      are currently available
                      for this provider.
                    </Alert>
                  )}

                {verification &&
                  !loadingPlans &&
                  plans.length > 0 && (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, 1fr)',
                          md: 'repeat(3, 1fr)',
                        },
                        gap: 1.5,
                      }}
                    >
                      {plans.map(
                        (plan) => {
                          const selected =
                            selectedPlan?.variation_code ===
                            plan.variation_code;

                          return (
                            <Card
                              key={
                                plan.variation_code
                              }
                              onClick={() =>
                                setSelectedPlan(
                                  plan
                                )
                              }
                              elevation={0}
                              sx={{
                                cursor:
                                  'pointer',
                                borderRadius: 3,

                                border:
                                  selected
                                    ? `2px solid ${GREEN}`
                                    : '1px solid #dce7e1',

                                background:
                                  selected
                                    ? LIGHT_GREEN
                                    : '#fff',

                                transition:
                                  '0.2s ease',

                                '&:hover': {
                                  borderColor:
                                    GREEN,
                                  transform:
                                    'translateY(-2px)',
                                },
                              }}
                            >
                              <CardContent>
                                <Typography
                                  fontWeight={
                                    800
                                  }
                                  sx={{
                                    color:
                                      DARK_GREEN,
                                    mb: 1,
                                  }}
                                >
                                  {
                                    plan.name
                                  }
                                </Typography>

                                <Typography
                                  variant="h6"
                                  fontWeight={
                                    900
                                  }
                                  sx={{
                                    color:
                                      GREEN,
                                  }}
                                >
                                  {formatNaira(
                                    plan.amount
                                  )}
                                </Typography>

                                {selected && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      mt: 1,
                                      color:
                                        GREEN,
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    ✓ Selected
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          );
                        }
                      )}
                    </Box>
                  )}
              </Box>

              {/* SUBSCRIPTION OPTIONS */}

              {verification &&
                selectedPlan && (
                  <>
                    <TextField
                      select
                      fullWidth
                      label="Subscription Type"
                      value={
                        subscriptionType
                      }
                      onChange={(event) =>
                        setSubscriptionType(
                          event.target
                            .value as
                            | 'renew'
                            | 'change'
                        )
                      }
                      sx={{
                        '& .MuiOutlinedInput-root':
                          {
                            borderRadius: 3,

                            '&.Mui-focused fieldset':
                              {
                                borderColor:
                                  GREEN,
                              },
                          },

                        '& .MuiInputLabel-root.Mui-focused':
                          {
                            color: GREEN,
                          },
                      }}
                    >
                      <MenuItem value="renew">
                        Renew Subscription
                      </MenuItem>

                      <MenuItem value="change">
                        Change Package
                      </MenuItem>
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      label="Quantity"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      sx={{
                        '& .MuiOutlinedInput-root':
                          {
                            borderRadius: 3,

                            '&.Mui-focused fieldset':
                              {
                                borderColor:
                                  GREEN,
                              },
                          },

                        '& .MuiInputLabel-root.Mui-focused':
                          {
                            color: GREEN,
                          },
                      }}
                    >
                      {[1, 2, 3, 4, 5].map(
                        (number) => (
                          <MenuItem
                            key={number}
                            value={number}
                          >
                            {number}{' '}
                            {number === 1
                              ? 'Month'
                              : 'Months'}
                          </MenuItem>
                        )
                      )}
                    </TextField>

                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value
                        )
                      }
                      placeholder="08012345678"
                      inputProps={{
                        inputMode: 'tel',
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root':
                          {
                            borderRadius: 3,

                            '&.Mui-focused fieldset':
                              {
                                borderColor:
                                  GREEN,
                              },
                          },

                        '& .MuiInputLabel-root.Mui-focused':
                          {
                            color: GREEN,
                          },
                      }}
                    />

                    <Card
                      elevation={0}
                      sx={{
                        background:
                          '#f7faf8',
                        border:
                          '1px solid #dce7e1',
                        borderRadius: 3,
                      }}
                    >
                      <CardContent>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            fontWeight={700}
                          >
                            Total
                          </Typography>

                          <Typography
                            variant="h5"
                            fontWeight={900}
                            sx={{
                              color: GREEN,
                            }}
                          >
                            {formatNaira(
                              totalAmount
                            )}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={
                        <Lock />
                      }
                      onClick={
                        openPinDialog
                      }
                      disabled={buying}
                      sx={{
                        py: 1.6,
                        borderRadius: 3,
                        background:
                          GREEN,
                        textTransform:
                          'none',
                        fontSize:
                          '1rem',
                        fontWeight: 800,

                        '&:hover': {
                          background:
                            DARK_GREEN,
                        },
                      }}
                    >
                      Continue to Payment
                    </Button>
                  </>
                )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* TRANSACTION PIN */}

      <Dialog
        open={pinDialogOpen}
        onClose={() => {
          if (!buying) {
            setPinDialogOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
          }}
        >
          Confirm TV Payment
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
              }}
            >
              Enter your 4-digit
              Transaction PIN to
              authorize this payment.
            </Alert>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Amount:{' '}
              <strong>
                {formatNaira(
                  totalAmount
                )}
              </strong>
            </Typography>

            <TextField
              autoFocus
              fullWidth
              label="Transaction PIN"
              type="password"
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
              }}
              inputProps={{
                inputMode:
                  'numeric',
                maxLength: 4,
                autoComplete:
                  'off',
              }}
              disabled={buying}
              sx={{
                '& .MuiOutlinedInput-root':
                  {
                    borderRadius: 3,

                    '&.Mui-focused fieldset':
                      {
                        borderColor:
                          GREEN,
                      },
                  },

                '& .MuiInputLabel-root.Mui-focused':
                  {
                    color: GREEN,
                  },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
          }}
        >
          <Button
            onClick={() =>
              setPinDialogOpen(
                false
              )
            }
            disabled={buying}
            sx={{
              color: GREEN,
              textTransform:
                'none',
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              purchaseSubscription
            }
            disabled={
              buying ||
              transactionPin.length !==
                4
            }
            startIcon={
              buying ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <Lock />
              )
            }
            sx={{
              background: GREEN,
              borderRadius: 2.5,
              textTransform:
                'none',
              fontWeight: 800,

              '&:hover': {
                background:
                  DARK_GREEN,
              },
            }}
          >
            {buying
              ? 'Processing...'
              : 'Confirm Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
