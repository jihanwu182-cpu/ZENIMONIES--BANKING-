import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

type Network =
  | 'MTN'
  | 'Airtel'
  | 'Glo'
  | '9mobile';

interface DataPlan {
  variation_code: string;
  name: string;
  amount: number;
  validity?: string;
  fixedPrice?: boolean;
  description?: string;
  serviceID?: string;
}

interface NetworkOption {
  name: Network;
  logo: string;
  fallback: string;
}

/*
 * Network logos
 *
 * These are remote logo assets. If you later add the official
 * network logo files to frontend/public, we can switch these
 * to local files for even better reliability.
 */
const networks: NetworkOption[] = [
  {
    name: 'MTN',
    logo:
      'https://nigerialogos.netlify.app/logos/MTN.svg',
    fallback: 'MTN',
  },
  {
    name: 'Airtel',
    logo:
      'https://nigerialogos.netlify.app/logos/Airtel%20Nigeria.svg',
    fallback: 'A',
  },
  {
    name: 'Glo',
    logo:
      'https://nigerialogos.netlify.app/logos/Globacom%20Limited.svg',
    fallback: 'G',
  },
  {
    name: '9mobile',
    logo:
      'https://nigerialogos.netlify.app/logos/9mobile.svg',
    fallback: '9',
  },
];

const networkColors: Record<Network, string> = {
  MTN: '#ffcc00',
  Airtel: '#e60000',
  Glo: '#008f39',
  '9mobile': '#00a651',
};

const formatAmount = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const getToken = () =>
  localStorage.getItem('zenimonies_token') ||
  localStorage.getItem('token') ||
  '';

const Data: React.FC = () => {
  const [network, setNetwork] =
    useState<Network | ''>('');

  const [phone, setPhone] =
    useState('');

  const [plans, setPlans] =
    useState<DataPlan[]>([]);

  const [selectedPlan, setSelectedPlan] =
    useState<DataPlan | null>(null);

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [loadingPurchase, setLoadingPurchase] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [showPin, setShowPin] =
    useState(false);

  const [transactionPin, setTransactionPin] =
    useState('');

  const [pinError, setPinError] =
    useState('');

  /*
   * Load plans from Zenimonies backend.
   *
   * The backend gets the current catalogue from VTpass.
   * We do NOT trust prices or variation codes supplied
   * directly by the frontend.
   */
  useEffect(() => {
    if (!network) {
      setPlans([]);
      setSelectedPlan(null);
      return;
    }

    const loadPlans = async () => {
      setLoadingPlans(true);
      setError('');
      setMessage('');
      setSelectedPlan(null);

      try {
        const token = getToken();

        const response = await axios.get(
          `${API_URL}/api/data/plans`,
          {
            params: {
              network,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
          }
        );

        const returnedPlans =
          response.data?.plans ||
          response.data?.data ||
          [];

        if (!Array.isArray(returnedPlans)) {
          throw new Error(
            'Invalid data plan response.'
          );
        }

        setPlans(returnedPlans);
      } catch (err: any) {
        console.error(
          'Data plans loading error:',
          err?.response?.data?.code ||
            err?.message ||
            'Unknown error'
        );

        setPlans([]);

        setError(
          err?.response?.data?.message ||
            'Unable to load data plans right now.'
        );
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, [network]);

  const groupedPlans = useMemo(() => {
    const groups: Record<
      string,
      DataPlan[]
    > = {};

    plans.forEach((plan) => {
      const name =
        String(plan.name || '').trim();

      let category = 'All Plans';

      const lowerName =
        name.toLowerCase();

      if (
        lowerName.includes('night')
      ) {
        category = 'Night';
      } else if (
        lowerName.includes('social')
      ) {
        category = 'Social';
      } else if (
        lowerName.includes('weekly')
      ) {
        category = 'Weekly';
      } else if (
        lowerName.includes('monthly')
      ) {
        category = 'Monthly';
      } else if (
        lowerName.includes('daily')
      ) {
        category = 'Daily';
      }

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(plan);
    });

    return groups;
  }, [plans]);

  const categoryNames =
    Object.keys(groupedPlans);

  const handleNetworkChange = (
    selectedNetwork: Network
  ) => {
    setNetwork(selectedNetwork);
    setSelectedPlan(null);
    setError('');
    setMessage('');
    setShowPin(false);
    setTransactionPin('');
    setPinError('');
  };

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value.replace(
        /[^\d+]/g,
        ''
      );

    setPhone(value);
    setError('');
  };

  const handlePlanSelect = (
    plan: DataPlan
  ) => {
    setSelectedPlan(plan);
    setError('');
    setMessage('');
  };

  const handleBuyClick = () => {
    setError('');
    setMessage('');
    setPinError('');

    if (!network) {
      setError(
        'Please select a network.'
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        'Please enter the phone number.'
      );
      return;
    }

    const cleanPhone =
      phone.replace(/\D/g, '');

    if (
      cleanPhone.length < 10 ||
      cleanPhone.length > 11
    ) {
      setError(
        'Please enter a valid Nigerian phone number.'
      );
      return;
    }

    if (!selectedPlan) {
      setError(
        'Please select a data plan.'
      );
      return;
    }

    setTransactionPin('');
    setPinError('');
    setShowPin(true);
  };

  const handlePurchase = async () => {
    setPinError('');
    setError('');
    setMessage('');

    if (!selectedPlan || !network) {
      setPinError(
        'Please select a network and data plan.'
      );
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      setPinError(
        'Transaction PIN must be exactly 4 digits.'
      );
      return;
    }

    setLoadingPurchase(true);

    try {
      const token = getToken();

      if (!token) {
        setPinError(
          'Your session has expired. Please sign in again.'
        );
        return;
      }

      const cleanPhone =
        phone.replace(/\D/g, '');

      const response = await axios.post(
        `${API_URL}/api/data`,
        {
          network,
          phone: cleanPhone,
          variation_code:
            selectedPlan.variation_code,
          transaction_pin:
            transactionPin,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 60000,
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Data purchase submitted successfully.'
        );

        setShowPin(false);
        setTransactionPin('');
        setSelectedPlan(null);
        setPlans((current) => [
          ...current,
        ]);
      } else {
        setPinError(
          response.data?.message ||
            'Unable to complete the data purchase.'
        );
      }
    } catch (err: any) {
      const responseData =
        err?.response?.data;

      const code =
        responseData?.code;

      if (
        code ===
        'INCORRECT_TRANSACTION_PIN'
      ) {
        setPinError(
          responseData?.message ||
            'Incorrect Transaction PIN.'
        );
      } else if (
        code ===
        'TRANSACTION_PIN_LOCKED'
      ) {
        setPinError(
          responseData?.message ||
            'Your Transaction PIN is temporarily locked.'
        );
      } else if (
        code ===
        'TRANSACTION_PIN_NOT_SET'
      ) {
        setPinError(
          'Please create a Transaction PIN in Settings before buying data.'
        );
      } else if (
        err?.response?.status === 401
      ) {
        setPinError(
          'Your session has expired. Please sign in again.'
        );
      } else {
        setPinError(
          responseData?.message ||
            'Unable to complete the data purchase. Please try again.'
        );
      }

      console.error(
        'Data purchase error:',
        code ||
          err?.message ||
          'Unknown error'
      );
    } finally {
      setLoadingPurchase(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)',
        padding: '20px 14px 40px',
      }}
    >
      <div
        style={{
          maxWidth: '760px',
          margin: '0 auto',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '18px',
            color: '#0b5cff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            boxShadow:
              '0 12px 35px rgba(16, 24, 40, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '15px',
                background:
                  'linear-gradient(135deg, #0b5cff, #1749b7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 800,
              }}
            >
              📶
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '26px',
                }}
              >
                Mobile Data
              </h1>

              <p
                style={{
                  margin: '4px 0 0',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                Fast and secure data purchase
              </p>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '13px',
                marginTop: '20px',
                marginBottom: '18px',
                borderRadius: '12px',
                background: '#fee4e2',
                color: '#b42318',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                padding: '13px',
                marginTop: '20px',
                marginBottom: '18px',
                borderRadius: '12px',
                background: '#ecfdf3',
                color: '#027a48',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          {/* NETWORK SELECTOR */}

          <div
            style={{
              marginTop: '24px',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: '12px',
                fontSize: '15px',
              }}
            >
              Select Network
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(4, minmax(0, 1fr))',
                gap: '10px',
              }}
            >
              {networks.map(
                (networkOption) => {
                  const selected =
                    network ===
                    networkOption.name;

                  return (
                    <button
                      key={
                        networkOption.name
                      }
                      type="button"
                      onClick={() =>
                        handleNetworkChange(
                          networkOption.name
                        )
                      }
                      style={{
                        border: selected
                          ? `2px solid ${
                              networkColors[
                                networkOption.name
                              ]
                            }`
                          : '1px solid #e4e7ec',
                        background: selected
                          ? '#f8fafc'
                          : '#ffffff',
                        borderRadius: '16px',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        transition:
                          'all 0.2s ease',
                        boxShadow: selected
                          ? '0 4px 14px rgba(16,24,40,0.08)'
                          : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          margin: '0 auto 8px',
                          background:
                            '#ffffff',
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          overflow: 'hidden',
                          border:
                            '1px solid #eaecf0',
                        }}
                      >
                        <img
                          src={
                            networkOption.logo
                          }
                          alt={`${networkOption.name} logo`}
                          style={{
                            width: '34px',
                            height: '34px',
                            objectFit:
                              'contain',
                          }}
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              'none';

                            const parent =
                              event.currentTarget
                                .parentElement;

                            if (
                              parent &&
                              !parent.querySelector(
                                '.network-fallback'
                              )
                            ) {
                              const fallback =
                                document.createElement(
                                  'span'
                                );

                              fallback.className =
                                'network-fallback';

                              fallback.textContent =
                                networkOption.fallback;

                              fallback.style.fontWeight =
                                '800';

                              fallback.style.fontSize =
                                '17px';

                              parent.appendChild(
                                fallback
                              );
                            }
                          }}
                        />
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#101828',
                        }}
                      >
                        {
                          networkOption.name
                        }
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* PHONE NUMBER */}

          <div
            style={{
              marginTop: '24px',
            }}
          >
            <label
              htmlFor="phone"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={
                handlePhoneChange
              }
              placeholder="08012345678"
              autoComplete="tel"
              inputMode="numeric"
              style={{
                width: '100%',
                boxSizing:
                  'border-box',
                padding: '14px 15px',
                border:
                  '1px solid #d0d5dd',
                borderRadius: '12px',
                outline: 'none',
                fontSize: '16px',
              }}
            />
          </div>

          {/* PLANS */}

          {network && (
            <div
              style={{
                marginTop: '28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '20px',
                    }}
                  >
                    Data Plans
                  </h2>

                  <p
                    style={{
                      margin:
                        '4px 0 0',
                      color: '#667085',
                      fontSize:
                        '13px',
                    }}
                  >
                    {
                      network
                    }{' '}
                    plans available now
                  </p>
                </div>

                {loadingPlans && (
                  <span
                    style={{
                      color: '#667085',
                      fontSize:
                        '13px',
                    }}
                  >
                    Loading...
                  </span>
                )}
              </div>

              {!loadingPlans &&
                plans.length === 0 && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '14px',
                      background:
                        '#f9fafb',
                      color: '#667085',
                      textAlign:
                        'center',
                    }}
                  >
                    No data plans are
                    available right now.
                  </div>
                )}

              {categoryNames.map(
                (category) => (
                  <div
                    key={category}
                    style={{
                      marginBottom:
                        '26px',
                    }}
                  >
                    <h3
                      style={{
                        margin:
                          '0 0 12px',
                        fontSize:
                          '15px',
                      }}
                    >
                      {category}
                    </h3>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {groupedPlans[
                        category
                      ].map(
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
                                handlePlanSelect(
                                  plan
                                )
                              }
                              style={{
                                textAlign:
                                  'left',
                                border:
                                  selected
                                    ? '2px solid #0b5cff'
                                    : '1px solid #eaecf0',
                                background:
                                  selected
                                    ? '#f5f8ff'
                                    : '#ffffff',
                                borderRadius:
                                  '16px',
                                padding:
                                  '15px',
                                cursor:
                                  'pointer',
                                boxShadow:
                                  selected
                                    ? '0 6px 18px rgba(11,92,255,0.12)'
                                    : '0 2px 8px rgba(16,24,40,0.04)',
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  justifyContent:
                                    'space-between',
                                  gap: '8px',
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize:
                                      '16px',
                                    color:
                                      '#101828',
                                  }}
                                >
                                  {
                                    plan.name
                                  }
                                </strong>

                                {selected && (
                                  <span
                                    style={{
                                      fontSize:
                                        '12px',
                                      color:
                                        '#0b5cff',
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    '10px',
                                  fontSize:
                                    '18px',
                                  fontWeight:
                                    800,
                                  color:
                                    '#0b5cff',
                                }}
                              >
                                {formatAmount(
                                  plan.amount
                                )}
                              </div>

                              {plan.validity && (
                                <div
                                  style={{
                                    marginTop:
                                      '5px',
                                    fontSize:
                                      '12px',
                                    color:
                                      '#667085',
                                  }}
                                >
                                  {
                                    plan.validity
                                  }
                                </div>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* SELECTED PLAN */}

          {selectedPlan && (
            <div
              style={{
                marginTop: '8px',
                padding: '16px',
                borderRadius: '16px',
                background:
                  'linear-gradient(135deg, #f5f8ff, #eef4ff)',
                border:
                  '1px solid #d9e4ff',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#667085',
                  marginBottom: '5px',
                }}
              >
                Selected plan
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'space-between',
                  gap: '12px',
                }}
              >
                <strong
                  style={{
                    fontSize: '17px',
                  }}
                >
                  {selectedPlan.name}
                </strong>

                <strong
                  style={{
                    color: '#0b5cff',
                    fontSize: '18px',
                  }}
                >
                  {formatAmount(
                    selectedPlan.amount
                  )}
                </strong>
              </div>
            </div>
          )}

          {/* BUY BUTTON */}

          <button
            type="button"
            onClick={handleBuyClick}
            disabled={
              loadingPurchase ||
              !selectedPlan
            }
            style={{
              width: '100%',
              marginTop: '22px',
              padding: '15px',
              border: 'none',
              borderRadius: '13px',
              background:
                !selectedPlan
                  ? '#98a2b3'
                  : '#0b5cff',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '15px',
              cursor:
                !selectedPlan
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loadingPurchase
              ? 'Processing...'
              : 'Continue to Buy'}
          </button>
        </div>
      </div>

      {/* TRANSACTION PIN MODAL */}

      {showPin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(16, 24, 40, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '390px',
              background: '#ffffff',
              borderRadius: '22px',
              padding: '24px',
              boxShadow:
                '0 25px 70px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background:
                  '#eef4ff',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: '25px',
                marginBottom:
                  '14px',
              }}
            >
              🔐
            </div>

            <h2
              style={{
                margin:
                  '0 0 6px',
              }}
            >
              Confirm Purchase
            </h2>

            <p
              style={{
                margin:
                  '0 0 18px',
                color: '#667085',
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              Enter your 4-digit
              Transaction PIN to
              authorize this data
              purchase.
            </p>

            <div
              style={{
                padding: '13px',
                marginBottom:
                  '16px',
                background:
                  '#f9fafb',
                borderRadius:
                  '12px',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                }}
              >
                {selectedPlan?.name}
              </div>

              <div
                style={{
                  color: '#0b5cff',
                  fontWeight: 800,
                  marginTop: '4px',
                }}
              >
                {selectedPlan &&
                  formatAmount(
                    selectedPlan.amount
                  )}
              </div>

              <div
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  marginTop: '3px',
                }}
              >
                To: {phone}
              </div>
            </div>

            {pinError && (
              <div
                style={{
                  padding: '11px',
                  marginBottom:
                    '14px',
                  borderRadius:
                    '10px',
                  background:
                    '#fee4e2',
                  color: '#b42318',
                  fontSize:
                    '13px',
                  fontWeight:
                    600,
                }}
              >
                {pinError}
              </div>
            )}

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={
                transactionPin
              }
              onChange={(event) =>
                setTransactionPin(
                  event.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="••••"
              style={{
                width: '100%',
                boxSizing:
                  'border-box',
                padding: '15px',
                textAlign:
                  'center',
                letterSpacing:
                  '10px',
                fontSize: '24px',
                border:
                  '1px solid #d0d5dd',
                borderRadius:
                  '12px',
                outline: 'none',
              }}
            />

            <button
              type="button"
              onClick={
                handlePurchase
              }
              disabled={
                loadingPurchase ||
                transactionPin.length !==
                  4
              }
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                border: 'none',
                borderRadius:
                  '12px',
                background:
                  transactionPin.length ===
                  4
                    ? '#0b5cff'
                    : '#98a2b3',
                color: '#ffffff',
                fontWeight: 800,
                cursor:
                  transactionPin.length ===
                  4
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              {loadingPurchase
                ? 'Authorizing...'
                : 'Confirm & Buy'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  !loadingPurchase
                ) {
                  setShowPin(false);
                  setTransactionPin(
                    ''
                  );
                  setPinError('');
                }
              }}
              disabled={
                loadingPurchase
              }
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '13px',
                border:
                  '1px solid #d0d5dd',
                borderRadius:
                  '12px',
                background:
                  '#ffffff',
                color: '#344054',
                fontWeight: 700,
                cursor:
                  loadingPurchase
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Data;
