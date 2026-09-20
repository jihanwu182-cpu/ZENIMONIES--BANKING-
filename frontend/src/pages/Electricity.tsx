import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

type MeterType = 'prepaid' | 'postpaid';

type Provider = {
  code: string;
  name: string;
  shortName: string;
  logo: string;
};

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const ELECTRICITY_PROVIDERS: Provider[] = [
  {
    code: 'APLE',
    name: 'Aba Electricity',
    shortName: 'APLE',
    logo: '/electricity/aple.jpg',
  },
  {
    code: 'AEDC',
    name: 'Abuja Electricity',
    shortName: 'AEDC',
    logo: '/electricity/aedc.jpg',
  },
  {
    code: 'BEDC',
    name: 'Benin Electricity',
    shortName: 'BEDC',
    logo: '/electricity/bedc.jpg',
  },
  {
    code: 'EKEDC',
    name: 'Eko Electricity',
    shortName: 'EKEDC',
    logo: '/electricity/ekedc.jpg',
  },
  {
    code: 'EEDC',
    name: 'Enugu Electricity',
    shortName: 'EEDC',
    logo: '/electricity/eedc.jpg',
  },
  {
    code: 'IBEDC',
    name: 'Ibadan Electricity',
    shortName: 'IBEDC',
    logo: '/electricity/ibedc.jpg',
  },
  {
    code: 'IKEDC',
    name: 'Ikeja Electricity',
    shortName: 'IKEDC',
    logo: '/electricity/ikeja.jpg',
  },
  {
    code: 'JED',
    name: 'Jos Electricity',
    shortName: 'JED',
    logo: '/electricity/jed.jpg',
  },
  {
    code: 'KAEDCO',
    name: 'Kaduna Electricity',
    shortName: 'KAEDCO',
    logo: '/electricity/kaedco.jpg',
  },
  {
    code: 'KEDCO',
    name: 'Kano Electricity',
    shortName: 'KEDCO',
    logo: '/electricity/kedco.jpg',
  },
  {
    code: 'PHEDC',
    name: 'Port Harcourt Electricity',
    shortName: 'PHEDC',
    logo: '/electricity/phedc.jpg',
  },
  {
    code: 'YEDC',
    name: 'Yola Electricity',
    shortName: 'YEDC',
    logo: '/electricity/yedc.jpg',
  },
];

const QUICK_AMOUNTS = [
  100,
  200,
  300,
  500,
  1000,
  2000,
];

const formatNaira = (amount: number | string) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return '₦0';
  }

  return `₦${numericAmount.toLocaleString('en-NG')}`;
};

const Electricity: React.FC = () => {
  const navigate = useNavigate();

  const [provider, setProvider] = useState<Provider | null>(null);

  const [meterType, setMeterType] =
    useState<MeterType>('prepaid');

  const [meterNumber, setMeterNumber] =
    useState('');

  const [preferredAmount, setPreferredAmount] =
    useState('');

  const [showProviderSelector, setShowProviderSelector] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const canContinue = useMemo(() => {
    const amount = Number(preferredAmount);

    return (
      provider !== null &&
      meterNumber.trim().length > 0 &&
      Number.isFinite(amount) &&
      amount > 0 &&
      !loading
    );
  }, [
    provider,
    meterNumber,
    preferredAmount,
    loading,
  ]);

  const handleQuickAmount = (amount: number) => {
    setPreferredAmount(String(amount));
    setError('');
    setMessage('');
  };

  const handleMeterTypeChange = (type: MeterType) => {
    setMeterType(type);
    setMeterNumber('');
    setError('');
    setMessage('');
  };

  const handleContinue = async () => {
    setError('');
    setMessage('');

    if (!provider) {
      setError('Please select your electricity service provider.');
      return;
    }

    if (!meterNumber.trim()) {
      setError(
        meterType === 'prepaid'
          ? 'Please enter your meter number.'
          : 'Please enter your meter/account number.'
      );
      return;
    }

    const amount = Number(preferredAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid preferred amount.');
      return;
    }

    const token = localStorage.getItem(
      'zenimonies_token'
    );

    if (!token) {
      setError(
        'Your session has expired. Please sign in again.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/api/bills`,
        {
          category: 'electricity',

          biller_name: provider.name,

          provider_code: provider.code,

          customer_reference:
            meterNumber.trim(),

          meter_number:
            meterNumber.trim(),

          meter_type:
            meterType,

          amount,

          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const payment =
        response?.data?.payment ||
        response?.data?.billPayment ||
        response?.data ||
        {};

      localStorage.setItem(
        'zenimonies_electricity_payment',
        JSON.stringify({
          ...payment,

          category: 'electricity',

          provider_code:
            provider.code,

          provider_name:
            provider.name,

          provider_logo:
            provider.logo,

          meter_type:
            meterType,

          meter_number:
            meterNumber.trim(),

          amount,
        })
      );

      /*
       * IMPORTANT:
       * Our current backend is still TEST MODE.
       * Therefore we do NOT display a successful
       * payment message unless the backend actually
       * returns a completed/successful status.
       */

      const status =
        String(payment.status || '').toLowerCase();

      const isSuccessful =
        status === 'successful' ||
        status === 'completed' ||
        status === 'success';

      if (isSuccessful) {
        navigate('/electricity/receipt');
        return;
      }

      setMessage(
        'Your electricity payment request has been received and is pending verification.'
      );
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error;

      setError(
        serverMessage ||
          'Unable to process your electricity payment request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f9f8',
        color: '#111827',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#ffffff',
          borderBottom:
            '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: 620,
            margin: '0 auto',
            height: 64,
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              width: 42,
              height: 42,
              border: 'none',
              background: 'transparent',
              borderRadius: 12,
              fontSize: 28,
              cursor: 'pointer',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Go back"
          >
            ‹
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Electricity
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate('/bills/history')
            }
            style={{
              border: 'none',
              background: 'transparent',
              color: '#159447',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '8px 0 8px 8px',
            }}
          >
            History
          </button>
        </div>
      </div>

      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}

      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '24px 18px 40px',
        }}
      >
        {/* ====================================================
            SERVICE PROVIDER
        ==================================================== */}

        <div style={{ marginBottom: 25 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#6b7280',
              letterSpacing: 0.6,
              marginBottom: 9,
            }}
          >
            SERVICE PROVIDER
          </div>

          <button
            type="button"
            onClick={() =>
              setShowProviderSelector(true)
            }
            style={{
              width: '100%',
              minHeight: 70,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              borderRadius: 16,
              padding: '9px 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxSizing: 'border-box',
              boxShadow:
                '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                minWidth: 0,
              }}
            >
              {provider ? (
                <>
                  <ProviderLogo
                    provider={provider}
                    size={50}
                  />

                  <div
                    style={{
                      textAlign: 'left',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {provider.name}
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        color: '#6b7280',
                      }}
                    >
                      {provider.shortName}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      background: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                    }}
                  >
                    ⚡
                  </div>

                  <div
                    style={{
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#111827',
                      }}
                    >
                      Select Service Provider
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        color: '#6b7280',
                      }}
                    >
                      Choose your electricity provider
                    </div>
                  </div>
                </>
              )}
            </div>

            <span
              style={{
                fontSize: 28,
                color: '#9ca3af',
                lineHeight: 1,
                marginLeft: 10,
              }}
            >
              ›
            </span>
          </button>
        </div>

        {/* ====================================================
            PREPAID / POSTPAID
        ==================================================== */}

        <div style={{ marginBottom: 25 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#6b7280',
              letterSpacing: 0.6,
              marginBottom: 9,
            }}
          >
            METER TYPE
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() =>
                handleMeterTypeChange(
                  'prepaid'
                )
              }
              style={{
                height: 52,
                borderRadius: 14,
                border:
                  meterType === 'prepaid'
                    ? '2px solid #159447'
                    : '1px solid #e5e7eb',
                background:
                  meterType === 'prepaid'
                    ? '#ecfdf3'
                    : '#ffffff',
                color:
                  meterType === 'prepaid'
                    ? '#11813d'
                    : '#374151',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Prepaid
            </button>

            <button
              type="button"
              onClick={() =>
                handleMeterTypeChange(
                  'postpaid'
                )
              }
              style={{
                height: 52,
                borderRadius: 14,
                border:
                  meterType === 'postpaid'
                    ? '2px solid #159447'
                    : '1px solid #e5e7eb',
                background:
                  meterType === 'postpaid'
                    ? '#ecfdf3'
                    : '#ffffff',
                color:
                  meterType === 'postpaid'
                    ? '#11813d'
                    : '#374151',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Postpaid
            </button>
          </div>
        </div>

        {/* ====================================================
            METER / ACCOUNT NUMBER
        ==================================================== */}

        <div style={{ marginBottom: 26 }}>
          <label
            htmlFor="meter-number"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 800,
              color: '#6b7280',
              letterSpacing: 0.6,
              marginBottom: 9,
            }}
          >
            {meterType === 'prepaid'
              ? 'METER NUMBER'
              : 'METER / ACCOUNT NUMBER'}
          </label>

          <input
            id="meter-number"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={meterNumber}
            onChange={(event) =>
              setMeterNumber(
                event.target.value
              )
            }
            placeholder={
              meterType === 'prepaid'
                ? 'Enter meter number'
                : 'Enter meter/account number'
            }
            style={{
              width: '100%',
              height: 56,
              border:
                '1px solid #dfe4e1',
              borderRadius: 14,
              background: '#ffffff',
              padding: '0 16px',
              fontSize: 15,
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ====================================================
            QUICK AMOUNTS
        ==================================================== */}

        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#6b7280',
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            QUICK AMOUNT
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {QUICK_AMOUNTS.map(
              (amount) => {
                const selected =
                  Number(
                    preferredAmount
                  ) === amount;

                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      handleQuickAmount(
                        amount
                      )
                    }
                    style={{
                      height: 48,
                      borderRadius: 13,
                      border: selected
                        ? '2px solid #159447'
                        : '1px solid #e5e7eb',
                      background: selected
                        ? '#ecfdf3'
                        : '#ffffff',
                      color: selected
                        ? '#11813d'
                        : '#374151',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {formatNaira(
                      amount
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* ====================================================
            PREFERRED AMOUNT
        ==================================================== */}

        <div style={{ marginBottom: 22 }}>
          <label
            htmlFor="preferred-amount"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 800,
              color: '#6b7280',
              letterSpacing: 0.6,
              marginBottom: 9,
            }}
          >
            PREFERRED AMOUNT
          </label>

          <div
            style={{
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform:
                  'translateY(-50%)',
                fontSize: 16,
                fontWeight: 700,
                color: '#374151',
              }}
            >
              ₦
            </span>

            <input
              id="preferred-amount"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={preferredAmount}
              onChange={(event) => {
                setPreferredAmount(
                  event.target.value
                );
                setError('');
                setMessage('');
              }}
              placeholder="Enter preferred amount"
              style={{
                width: '100%',
                height: 56,
                border:
                  '1px solid #dfe4e1',
                borderRadius: 14,
                background: '#ffffff',
                padding:
                  '0 16px 0 37px',
                fontSize: 16,
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              background: '#fef2f2',
              border:
                '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* ====================================================
            PENDING / TEST MODE MESSAGE
        ==================================================== */}

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              background: '#effdf5',
              border:
                '1px solid #bbf7d0',
              color: '#166534',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {/* ====================================================
            CONTINUE
        ==================================================== */}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            width: '100%',
            height: 56,
            border: 'none',
            borderRadius: 15,
            background: canContinue
              ? '#159447'
              : '#cbd5d1',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 800,
            cursor: canContinue
              ? 'pointer'
              : 'not-allowed',
            boxShadow: canContinue
              ? '0 8px 20px rgba(21,148,71,0.20)'
              : 'none',
          }}
        >
          {loading
            ? 'Processing...'
            : 'Continue'}
        </button>

        <div
          style={{
            textAlign: 'center',
            marginTop: 15,
            color: '#9ca3af',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          Your meter will be verified before
          any real electricity payment is made.
        </div>
      </div>

      {/* ======================================================
          PROVIDER BOTTOM SHEET
      ====================================================== */}

      {showProviderSelector && (
        <>
          {/* Overlay */}

          <div
            onClick={() =>
              setShowProviderSelector(false)
            }
            style={{
              position: 'fixed',
              inset: 0,
              background:
                'rgba(0,0,0,0.45)',
              zIndex: 90,
            }}
          />

          {/* Bottom sheet */}

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select Provider"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100,
              background: '#ffffff',
              borderRadius:
                '24px 24px 0 0',
              maxHeight: '88vh',
              overflow: 'hidden',
              boxShadow:
                '0 -10px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                maxWidth: 620,
                margin: '0 auto',
              }}
            >
              {/* Sheet header */}

              <div
                style={{
                  height: 68,
                  padding: '0 18px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom:
                    '1px solid #eeeeee',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowProviderSelector(
                      false
                    )
                  }
                  style={{
                    width: 42,
                    height: 42,
                    border: 'none',
                    background:
                      'transparent',
                    fontSize: 29,
                    color: '#111827',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                  }}
                  aria-label="Close provider selector"
                >
                  ‹
                </button>

                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    paddingRight: 42,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#111827',
                    }}
                  >
                    Select Provider
                  </div>
                </div>
              </div>

              {/* Provider list */}

              <div
                style={{
                  overflowY: 'auto',
                  maxHeight:
                    'calc(88vh - 68px)',
                  padding:
                    '8px 18px 25px',
                }}
              >
                {ELECTRICITY_PROVIDERS.map(
                  (item) => {
                    const selected =
                      provider?.code ===
                      item.code;

                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setProvider(item);
                          setShowProviderSelector(
                            false
                          );
                          setError('');
                          setMessage('');
                        }}
                        style={{
                          width: '100%',
                          minHeight: 76,
                          border: 'none',
                          borderBottom:
                            '1px solid #f0f0f0',
                          background:
                            '#ffffff',
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 14,
                          padding:
                            '10px 2px',
                          cursor:
                            'pointer',
                          textAlign:
                            'left',
                        }}
                      >
                        {/* Logo */}

                        <ProviderLogo
                          provider={item}
                          size={54}
                        />

                        {/* Name */}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: '#1f2937',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.name}
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 11,
                              color: '#9ca3af',
                            }}
                          >
                            {item.shortName}
                          </div>
                        </div>

                        {/* Selection circle */}

                        <div
                          style={{
                            width: 25,
                            height: 25,
                            borderRadius:
                              '50%',
                            border: selected
                              ? '2px solid #159447'
                              : '2px solid #d1d5db',
                            background:
                              selected
                                ? '#159447'
                                : '#ffffff',
                            display: 'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            flexShrink: 0,
                          }}
                        >
                          {selected && (
                            <span
                              style={{
                                color:
                                  '#ffffff',
                                fontSize: 15,
                                fontWeight:
                                  900,
                                lineHeight: 1,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   PROVIDER LOGO COMPONENT
============================================================ */

type ProviderLogoProps = {
  provider: Provider;
  size?: number;
};

const ProviderLogo: React.FC<
  ProviderLogoProps
> = ({
  provider,
  size = 54,
}) => {
  const [imageError, setImageError] =
    useState(false);

  if (imageError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          background: '#ecfdf3',
          border:
            '1px solid #d1fae5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#159447',
          fontSize:
            size >= 54 ? 12 : 10,
          fontWeight: 800,
          textAlign: 'center',
          padding: 4,
          boxSizing: 'border-box',
        }}
      >
        {provider.shortName}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: '#ffffff',
        border:
          '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        src={provider.logo}
        alt={`${provider.name} logo`}
        onError={() =>
          setImageError(true)
        }
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
};

export default Electricity;
