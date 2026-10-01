import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type EducationService =
  | 'waec-registration'
  | 'waec'
  | 'jamb';

type EducationPlan = {
  variation_code: string;
  name: string;
  amount: number;
  fixedPrice?: string | boolean | null;
};

type PurchaseResult = {
  success?: boolean;
  status?: string;
  reference?: string;
  providerReference?: string | null;
  service?: string;
  serviceName?: string;
  variationCode?: string;
  amount?: number;
  phone?: string;
  profileId?: string | null;
  purchasedCode?: string | null;
  tokens?: unknown[];
  customerName?: string | null;
  message?: string;
};

type PurchasedItem = {
  serialNumber: string;
  pin: string;
};

type Tab = {
  id: EducationService;
  title: string;
  subtitle: string;
};

const TABS: Tab[] = [
  {
    id: 'waec-registration',
    title: 'WAEC Registration',
    subtitle: 'Buy a WAEC registration PIN',
  },
  {
    id: 'waec',
    title: 'WAEC Result Checker',
    subtitle: 'Buy a WAEC result checker PIN',
  },
  {
    id: 'jamb',
    title: 'JAMB PIN',
    subtitle: 'Buy a JAMB examination PIN',
  },
];

const getToken = () =>
  localStorage.getItem('zenimonies_token') || '';

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);

const cleanPhone = (value: string) =>
  value.replace(/\D/g, '').slice(0, 11);

const cleanProfileId = (value: string) =>
  value.replace(/\s/g, '').slice(0, 30);

/**
 * VTpass can return multiple WAEC PINs inside one string.
 *
 * Example:
 * Serial No:XXXX,pin:123456|Serial No:YYYY,pin:789012
 *
 * This helper converts that response into separate PIN cards.
 */
const parsePurchasedCodes = (
  purchasedCode?: string | null,
  tokens?: unknown[]
): PurchasedItem[] => {
  const items: PurchasedItem[] = [];

  if (purchasedCode) {
    const matches = purchasedCode.matchAll(
      /Serial\s*No\s*:\s*([^,|]+)\s*,\s*pin\s*:\s*([^|]+)/gi
    );

    for (const match of matches) {
      const serialNumber =
        String(match[1] || '').trim();

      const pin =
        String(match[2] || '')
          .trim()
          .replace(/\s+/g, '');

      if (serialNumber && pin) {
        items.push({
          serialNumber,
          pin,
        });
      }
    }

    /**
     * If the provider returns a simple single code
     * instead of the Serial No / PIN format.
     */
    if (
      items.length === 0 &&
      purchasedCode.trim()
    ) {
      items.push({
        serialNumber: '',
        pin: purchasedCode.trim(),
      });
    }
  }

  /**
   * Also support provider token arrays.
   */
  if (Array.isArray(tokens)) {
    tokens.forEach((token: any) => {
      if (!token) return;

      const serialNumber =
        String(
          token?.serialNumber ||
            token?.serial_no ||
            token?.serial ||
            token?.SerialNo ||
            ''
        ).trim();

      const pin =
        String(
          token?.pin ||
            token?.Pin ||
            token?.token ||
            token?.code ||
            ''
        )
          .trim()
          .replace(/\s+/g, '');

      if (serialNumber || pin) {
        items.push({
          serialNumber,
          pin,
        });
      }
    });
  }

  /**
   * Remove accidental duplicates.
   */
  return items.filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (other) =>
          other.serialNumber ===
            item.serialNumber &&
          other.pin === item.pin
      )
  );
};

const Education: React.FC = () => {
  const navigate = useNavigate();

  const [activeService, setActiveService] =
    useState<EducationService>(
      'waec-registration'
    );

  const [plans, setPlans] = useState<
    EducationPlan[]
  >([]);

  const [selectedPlan, setSelectedPlan] =
    useState<EducationPlan | null>(null);

  const [phone, setPhone] = useState('');
  const [profileId, setProfileId] =
    useState('');

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [verifyingJamb, setVerifyingJamb] =
    useState(false);

  const [jambVerified, setJambVerified] =
    useState(false);

  const [jambCustomerName, setJambCustomerName] =
    useState('');

  const [transactionPin, setTransactionPin] =
    useState('');

  const [showPin, setShowPin] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [purchaseResult, setPurchaseResult] =
    useState<PurchaseResult | null>(null);

  const [copiedPinIndex, setCopiedPinIndex] =
    useState<number | null>(null);

  const activeTab = useMemo(
    () =>
      TABS.find(
        (tab) => tab.id === activeService
      ) || TABS[0],
    [activeService]
  );

  const purchasedItems =
    parsePurchasedCodes(
      purchaseResult?.purchasedCode,
      purchaseResult?.tokens
    );

  const isCompleted =
    purchaseResult?.status ===
      'completed' ||
    purchaseResult?.success === true;

  const loadPlans = async (
    service: EducationService
  ) => {
    setLoadingPlans(true);
    setError('');
    setMessage('');
    setPlans([]);
    setSelectedPlan(null);
    setJambVerified(false);
    setJambCustomerName('');
    setPurchaseResult(null);
    setCopiedPinIndex(null);

    try {
      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/education/plans?service=${encodeURIComponent(
          service
        )}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            'Unable to load education plans.'
        );
      }

      const loadedPlans:
        EducationPlan[] =
        Array.isArray(data?.plans)
          ? data.plans
              .filter(
                (plan: EducationPlan) =>
                  plan?.variation_code &&
                  Number(plan?.amount) > 0
              )
              .map(
                (plan: EducationPlan) => ({
                  variation_code:
                    String(
                      plan.variation_code
                    ),
                  name:
                    plan.name ||
                    'Education PIN',
                  amount:
                    Number(plan.amount),
                  fixedPrice:
                    plan.fixedPrice ??
                    null,
                })
              )
          : [];

      setPlans(loadedPlans);

      if (
        loadedPlans.length === 0
      ) {
        setMessage(
          'No education plans are currently available.'
        );
      }
    } catch (err: any) {
      console.error(
        'Education plans error:',
        err
      );

      setError(
        err?.message ||
          'Unable to load education plans.'
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlans(activeService);
  }, [activeService]);

  const handleServiceChange = (
    service: EducationService
  ) => {
    if (processing) return;

    setActiveService(service);
    setPhone('');
    setProfileId('');
    setTransactionPin('');
    setJambVerified(false);
    setJambCustomerName('');
    setPurchaseResult(null);
    setCopiedPinIndex(null);
    setError('');
    setMessage('');
  };

  const handleSelectPlan = (
    plan: EducationPlan
  ) => {
    if (processing) return;

    setSelectedPlan(plan);
    setError('');
    setMessage('');
    setPurchaseResult(null);
    setCopiedPinIndex(null);

    if (activeService === 'jamb') {
      setJambVerified(false);
      setJambCustomerName('');
    }
  };

  const verifyJamb = async () => {
    setError('');
    setMessage('');

    if (!selectedPlan) {
      setError(
        'Please select a JAMB plan first.'
      );
      return;
    }

    if (!profileId.trim()) {
      setError(
        'Enter your JAMB Profile ID.'
      );
      return;
    }

    setVerifyingJamb(true);

    try {
      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/education/jamb/verify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile_id:
              profileId.trim(),
            variation_code:
              selectedPlan.variation_code,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            'Unable to verify your JAMB Profile ID.'
        );
      }

      setJambVerified(true);

      setJambCustomerName(
        data?.customerName || ''
      );

      setMessage(
        data?.customerName
          ? `Profile verified for ${data.customerName}.`
          : 'JAMB Profile ID verified successfully.'
      );
    } catch (err: any) {
      console.error(
        'JAMB verification error:',
        err
      );

      setJambVerified(false);
      setJambCustomerName('');

      setError(
        err?.message ||
          'Unable to verify your JAMB Profile ID.'
      );
    } finally {
      setVerifyingJamb(false);
    }
  };

  const validateBeforePurchase = () => {
    if (!selectedPlan) {
      setError(
        'Please select an education plan.'
      );
      return false;
    }

    if (!/^0\d{10}$/.test(phone)) {
      setError(
        'Enter a valid Nigerian phone number.'
      );
      return false;
    }

    if (
      activeService === 'jamb'
    ) {
      if (!profileId.trim()) {
        setError(
          'Enter your JAMB Profile ID.'
        );
        return false;
      }

      if (!jambVerified) {
        setError(
          'Please verify your JAMB Profile ID before continuing.'
        );
        return false;
      }
    }

    if (!/^\d{4,6}$/.test(transactionPin)) {
      setError(
        'Enter your transaction PIN.'
      );
      return false;
    }

    return true;
  };

  const handlePurchase = async () => {
    setError('');
    setMessage('');
    setPurchaseResult(null);
    setCopiedPinIndex(null);

    if (!validateBeforePurchase()) {
      return;
    }

    setProcessing(true);

    try {
      const token = getToken();

      const body: Record<
        string,
        any
      > = {
        service: activeService,
        variation_code:
          selectedPlan!.variation_code,
        phone,
        transaction_pin:
          transactionPin,
        quantity: 1,
      };

      if (
        activeService === 'jamb'
      ) {
        body.profile_id =
          profileId.trim();
      }

      const response = await fetch(
        `${API_BASE_URL}/education`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (
        response.status === 202 &&
        data?.status === 'pending'
      ) {
        setPurchaseResult(data);

        setMessage(
          data?.message ||
            'Your education payment is being processed.'
        );

        return;
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            'Education payment failed.'
        );
      }

      setPurchaseResult(data);

      setMessage(
        data?.message ||
          'Education payment successful.'
      );

      setTransactionPin('');
    } catch (err: any) {
      console.error(
        'Education purchase error:',
        err
      );

      setError(
        err?.message ||
          'Unable to complete the education payment.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const copyPin = async (
    pin: string,
    index: number
  ) => {
    try {
      await navigator.clipboard.writeText(
        pin
      );

      setCopiedPinIndex(index);

      setTimeout(() => {
        setCopiedPinIndex(null);
      }, 2000);
    } catch (error) {
      console.error(
        'Unable to copy PIN:',
        error
      );
    }
  };

  const resetPurchase = () => {
    setSelectedPlan(null);
    setPhone('');
    setProfileId('');
    setTransactionPin('');
    setJambVerified(false);
    setJambCustomerName('');
    setPurchaseResult(null);
    setCopiedPinIndex(null);
    setMessage('');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf7',
        padding:
          '20px 16px 40px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border:
                '1px solid #dce9df',
              background: '#ffffff',
              color: '#176b3a',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ‹
          </button>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#159447',
                letterSpacing: 1,
                textTransform:
                  'uppercase',
              }}
            >
              ZENIMONIES
            </div>

            <h1
              style={{
                margin:
                  '2px 0 0',
                fontSize: 26,
                color: '#173d29',
                fontWeight: 800,
              }}
            >
              Education
            </h1>
          </div>
        </div>

        {/* INTRO */}
        <div
          style={{
            background:
              'linear-gradient(135deg, #0f8f4f, #176b3a)',
            borderRadius: 22,
            padding: 22,
            color: '#ffffff',
            marginBottom: 18,
            boxShadow:
              '0 10px 28px rgba(23,107,58,0.16)',
          }}
        >
          <div
            style={{
              fontSize: 30,
              marginBottom: 8,
            }}
          >
            🎓
          </div>

          <div
            style={{
              fontSize: 21,
              fontWeight: 800,
              marginBottom: 5,
            }}
          >
            Education Payments
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              opacity: 0.92,
            }}
          >
            Purchase supported
            examination PINs
            securely from your
            ZENIMONIES wallet.
          </div>
        </div>

        {/* SERVICE TABS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 18,
          }}
        >
          {TABS.map((tab) => {
            const active =
              activeService ===
              tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  handleServiceChange(
                    tab.id
                  )
                }
                style={{
                  border: active
                    ? '1px solid #159447'
                    : '1px solid #dce9df',
                  background: active
                    ? '#eaf8ef'
                    : '#ffffff',
                  color: active
                    ? '#176b3a'
                    : '#52645a',
                  borderRadius: 16,
                  padding:
                    '13px 8px',
                  cursor: 'pointer',
                  minHeight: 76,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  {tab.id ===
                    'waec-registration' &&
                    'WAEC'}

                  {tab.id ===
                    'waec' &&
                    'WAEC'}

                  {tab.id ===
                    'jamb' &&
                    'JAMB'}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.3,
                  }}
                >
                  {tab.id ===
                    'waec-registration' &&
                    'Registration'}

                  {tab.id ===
                    'waec' &&
                    'Result Checker'}

                  {tab.id ===
                    'jamb' &&
                    'PIN'}
                </div>
              </button>
            );
          })}
        </div>

        {/* CURRENT SERVICE */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 18,
            border:
              '1px solid #e0ebe3',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#173d29',
              }}
            >
              {activeTab.title}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: '#718078',
              }}
            >
              {activeTab.subtitle}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#41554a',
                marginBottom: 9,
              }}
            >
              Select a plan
            </div>

            {loadingPlans ? (
              <div
                style={{
                  padding: 22,
                  textAlign: 'center',
                  color: '#718078',
                  fontSize: 14,
                }}
              >
                Loading available
                plans...
              </div>
            ) : plans.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background:
                    '#f7faf8',
                  color: '#718078',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                No plans available
                right now.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection:
                    'column',
                  gap: 9,
                }}
              >
                {plans.map(
                  (plan) => {
                    const selected =
                      selectedPlan
                        ?.variation_code ===
                      plan.variation_code;

                    return (
                      <button
                        key={
                          plan.variation_code
                        }
                        type="button"
                        onClick={() =>
                          handleSelectPlan(
                            plan
                          )
                        }
                        style={{
                          width: '100%',
                          textAlign:
                            'left',
                          border:
                            selected
                              ? '1.5px solid #159447'
                              : '1px solid #dfe9e2',
                          background:
                            selected
                              ? '#effaf3'
                              : '#ffffff',
                          borderRadius: 15,
                          padding: 14,
                          cursor:
                            'pointer',
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight:
                                700,
                              color:
                                '#24382c',
                            }}
                          >
                            {
                              plan.name
                            }
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color:
                                '#7a887f',
                              marginTop: 4,
                            }}
                          >
                            {
                              plan.variation_code
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            fontWeight:
                              800,
                            color:
                              '#159447',
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {formatNaira(
                            plan.amount
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* PURCHASE FORM */}
        {selectedPlan && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 18,
              border:
                '1px solid #e0ebe3',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#173d29',
                marginBottom: 5,
              }}
            >
              Purchase details
            </div>

            <div
              style={{
                fontSize: 13,
                color: '#718078',
                marginBottom: 18,
              }}
            >
              Complete the details
              below to continue.
            </div>

            {/* SELECTED PLAN */}
            <div
              style={{
                background:
                  '#f3faf5',
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color:
                      '#718078',
                  }}
                >
                  Selected plan
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 14,
                    fontWeight:
                      700,
                    color:
                      '#173d29',
                  }}
                >
                  {
                    selectedPlan.name
                  }
                </div>
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight:
                    800,
                  color:
                    '#159447',
                }}
              >
                {formatNaira(
                  selectedPlan.amount
                )}
              </div>
            </div>

            {/* JAMB PROFILE */}
            {activeService ===
              'jamb' && (
              <>
                <label
                  style={{
                    display:
                      'block',
                    fontSize: 13,
                    fontWeight:
                      700,
                    color:
                      '#41554a',
                    marginBottom: 7,
                  }}
                >
                  JAMB Profile ID
                </label>

                <input
                  value={
                    profileId
                  }
                  onChange={(
                    event
                  ) => {
                    setProfileId(
                      cleanProfileId(
                        event
                          .target
                          .value
                      )
                    );

                    setJambVerified(
                      false
                    );

                    setJambCustomerName(
                      ''
                    );
                  }}
                  placeholder="Enter JAMB Profile ID"
                  disabled={
                    verifyingJamb ||
                    processing
                  }
                  style={{
                    width:
                      '100%',
                    boxSizing:
                      'border-box',
                    padding:
                      '13px 14px',
                    borderRadius:
                      13,
                    border:
                      '1px solid #d7e4da',
                    outline:
                      'none',
                    fontSize: 14,
                    color:
                      '#24382c',
                    marginBottom:
                      9,
                  }}
                />

                <button
                  type="button"
                  onClick={
                    verifyJamb
                  }
                  disabled={
                    verifyingJamb ||
                    processing ||
                    !profileId.trim()
                  }
                  style={{
                    width:
                      '100%',
                    border:
                      'none',
                    borderRadius:
                      13,
                    padding: 13,
                    background:
                      verifyingJamb ||
                      !profileId.trim()
                        ? '#b8c9bd'
                        : '#176b3a',
                    color:
                      '#ffffff',
                    fontSize: 14,
                    fontWeight:
                      700,
                    cursor:
                      verifyingJamb ||
                      !profileId.trim()
                        ? 'not-allowed'
                        : 'pointer',
                    marginBottom:
                      10,
                  }}
                >
                  {verifyingJamb
                    ? 'Verifying...'
                    : jambVerified
                    ? 'Profile Verified ✓'
                    : 'Verify JAMB Profile'}
                </button>

                {jambVerified && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius:
                        12,
                      background:
                        '#eaf8ef',
                      color:
                        '#176b3a',
                      fontSize: 13,
                      marginBottom:
                        16,
                    }}
                  >
                    <strong>
                      Profile verified
                    </strong>

                    {jambCustomerName && (
                      <div
                        style={{
                          marginTop: 4,
                        }}
                      >
                        {
                          jambCustomerName
                        }
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* PHONE */}
            <label
              style={{
                display:
                  'block',
                fontSize: 13,
                fontWeight:
                  700,
                color:
                  '#41554a',
                marginBottom: 7,
              }}
            >
              Phone number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(
                event
              ) =>
                setPhone(
                  cleanPhone(
                    event.target
                      .value
                  )
                )
              }
              placeholder="08012345678"
              maxLength={11}
              disabled={
                processing
              }
              style={{
                width:
                  '100%',
                boxSizing:
                  'border-box',
                padding:
                  '13px 14px',
                borderRadius:
                  13,
                border:
                  '1px solid #d7e4da',
                outline:
                  'none',
                fontSize: 14,
                color:
                  '#24382c',
                marginBottom:
                  16,
              }}
            />

            {/* TRANSACTION PIN */}
            <label
              style={{
                display:
                  'block',
                fontSize: 13,
                fontWeight:
                  700,
                color:
                  '#41554a',
                marginBottom: 7,
              }}
            >
              Transaction PIN
            </label>

            <div
              style={{
                position:
                  'relative',
                marginBottom:
                  16,
              }}
            >
              <input
                type={
                  showPin
                    ? 'text'
                    : 'password'
                }
                value={
                  transactionPin
                }
                onChange={(
                  event
                ) =>
                  setTransactionPin(
                    event.target
                      .value
                      .replace(
                        /\D/g,
                        ''
                      )
                      .slice(
                        0,
                        6
                      )
                  )
                }
                placeholder="Enter PIN"
                inputMode="numeric"
                maxLength={6}
                disabled={
                  processing
                }
                style={{
                  width:
                    '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '13px 50px 13px 14px',
                  borderRadius:
                    13,
                  border:
                    '1px solid #d7e4da',
                  outline:
                    'none',
                  fontSize: 15,
                  letterSpacing:
                    4,
                  color:
                    '#24382c',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPin(
                    (value) =>
                      !value
                  )
                }
                style={{
                  position:
                    'absolute',
                  right: 8,
                  top: 7,
                  height: 34,
                  minWidth: 42,
                  border:
                    'none',
                  borderRadius:
                    9,
                  background:
                    '#edf5ef',
                  color:
                    '#176b3a',
                  cursor:
                    'pointer',
                  fontSize: 12,
                  fontWeight:
                    700,
                }}
              >
                {showPin
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>

            {/* PURCHASE */}
            <button
              type="button"
              onClick={
                handlePurchase
              }
              disabled={
                processing
              }
              style={{
                width:
                  '100%',
                border:
                  'none',
                borderRadius:
                  14,
                padding: 15,
                background:
                  processing
                    ? '#aabdb0'
                    : '#159447',
                color:
                  '#ffffff',
                fontSize: 15,
                fontWeight:
                  800,
                cursor:
                  processing
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {processing
                ? 'Processing...'
                : `Pay ${formatNaira(
                    selectedPlan.amount
                  )}`}
            </button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background:
                '#fff3f2',
              border:
                '1px solid #f0d2cf',
              color:
                '#b42318',
              fontSize: 13,
              marginBottom:
                14,
            }}
          >
            {error}
          </div>
        )}

        {/* MESSAGE */}
        {message &&
          !error && (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background:
                  '#eaf8ef',
                border:
                  '1px solid #ccebd6',
                color:
                  '#176b3a',
                fontSize: 13,
                marginBottom:
                  14,
              }}
            >
              {message}
            </div>
          )}

        {/* SUCCESS / RESULT */}
        {purchaseResult && (
          <div
            style={{
              background:
                '#ffffff',
              borderRadius:
                20,
              padding: 20,
              border:
                '1px solid #dce9df',
              boxShadow:
                '0 8px 24px rgba(23,107,58,0.07)',
            }}
          >
            <div
              style={{
                textAlign:
                  'center',
                marginBottom:
                  18,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius:
                    '50%',
                  background:
                    isCompleted
                      ? '#e7f7ed'
                      : '#fff7e6',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  margin:
                    '0 auto 10px',
                  fontSize: 28,
                }}
              >
                {isCompleted
                  ? '✓'
                  : '⏳'}
              </div>

              <div
                style={{
                  fontSize: 19,
                  fontWeight:
                    800,
                  color:
                    isCompleted
                      ? '#176b3a'
                      : '#8a6116',
                }}
              >
                {isCompleted
                  ? 'Payment Successful'
                  : 'Payment Processing'}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color:
                    '#718078',
                  marginTop: 5,
                }}
              >
                {
                  purchaseResult.message
                }
              </div>
            </div>

            {/* PURCHASED PIN(S) */}
            {purchasedItems.length >
              0 && (
              <div
                style={{
                  marginBottom:
                    16,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight:
                      800,
                    color:
                      '#176b3a',
                    marginBottom:
                      10,
                  }}
                >
                  Your PIN / Code
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    flexDirection:
                      'column',
                    gap: 10,
                  }}
                >
                  {purchasedItems.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${item.serialNumber}-${item.pin}-${index}`}
                        style={{
                          background:
                            '#f1faf4',
                          border:
                            '1px solid #cdebd7',
                          borderRadius:
                            16,
                          padding: 15,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight:
                              800,
                            color:
                              '#718078',
                            marginBottom:
                              10,
                          }}
                        >
                          PIN{' '}
                          {index +
                            1}
                        </div>

                        {item.serialNumber && (
                          <div
                            style={{
                              marginBottom:
                                10,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color:
                                  '#718078',
                                marginBottom:
                                  3,
                              }}
                            >
                              Serial Number
                            </div>

                            <div
                              style={{
                                fontSize: 15,
                                fontWeight:
                                  800,
                                color:
                                  '#24382c',
                                wordBreak:
                                  'break-all',
                              }}
                            >
                              {
                                item.serialNumber
                              }
                            </div>
                          </div>
                        )}

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                '#718078',
                              marginBottom:
                                3,
                            }}
                          >
                            PIN
                          </div>

                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                fontSize: 19,
                                fontWeight:
                                  900,
                                color:
                                  '#176b3a',
                                letterSpacing:
                                  1,
                                wordBreak:
                                  'break-all',
                              }}
                            >
                              {
                                item.pin
                              }
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                copyPin(
                                  item.pin,
                                  index
                                )
                              }
                              style={{
                                border:
                                  'none',
                                borderRadius:
                                  10,
                                background:
                                  '#176b3a',
                                color:
                                  '#ffffff',
                                padding:
                                  '9px 12px',
                                fontSize: 12,
                                fontWeight:
                                  800,
                                cursor:
                                  'pointer',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {copiedPinIndex ===
                              index
                                ? 'Copied ✓'
                                : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* CUSTOMER */}
            {purchaseResult.customerName && (
              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'space-between',
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid #edf2ee',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    color:
                      '#718078',
                  }}
                >
                  Customer
                </span>

                <strong
                  style={{
                    color:
                      '#24382c',
                  }}
                >
                  {
                    purchaseResult.customerName
                  }
                </strong>
              </div>
            )}

            {/* AMOUNT */}
            {purchaseResult.amount !==
              undefined && (
              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'space-between',
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid #edf2ee',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    color:
                      '#718078',
                  }}
                >
                  Amount
                </span>

                <strong
                  style={{
                    color:
                      '#24382c',
                  }}
                >
                  {formatNaira(
                    Number(
                      purchaseResult.amount
                    )
                  )}
                </strong>
              </div>
            )}

            {/* REFERENCE */}
            {purchaseResult.reference && (
              <div
                style={{
                  padding:
                    '10px 0',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    color:
                      '#718078',
                    marginBottom:
                      3,
                  }}
                >
                  Reference
                </div>

                <div
                  style={{
                    color:
                      '#24382c',
                    fontWeight:
                      700,
                    wordBreak:
                      'break-all',
                  }}
                >
                  {
                    purchaseResult.reference
                  }
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={
                resetPurchase
              }
              style={{
                width:
                  '100%',
                marginTop: 12,
                border:
                  '1px solid #cfe1d4',
                background:
                  '#ffffff',
                color:
                  '#176b3a',
                borderRadius:
                  13,
                padding: 13,
                fontWeight:
                  700,
                cursor:
                  'pointer',
              }}
            >
              Make another purchase
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Education;
