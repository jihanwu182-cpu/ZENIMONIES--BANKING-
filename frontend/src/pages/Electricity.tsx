import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

type Provider = {
  code: string;
  name: string;
  shortName: string;
};

const ELECTRICITY_PROVIDERS: Provider[] = [
  {
    code: 'APLE',
    name: 'Aba Power',
    shortName: 'APLE',
  },
  {
    code: 'AEDC',
    name: 'Abuja Electricity Distribution Plc',
    shortName: 'AEDC',
  },
  {
    code: 'BEDC',
    name: 'Benin Electricity Distribution Plc',
    shortName: 'BEDC',
  },
  {
    code: 'EKEDC',
    name: 'Eko Electricity Distribution Plc',
    shortName: 'EKEDC',
  },
  {
    code: 'EEDC',
    name: 'Enugu Electricity Distribution Plc',
    shortName: 'EEDC',
  },
  {
    code: 'IBEDC',
    name: 'Ibadan Electricity Distribution Plc',
    shortName: 'IBEDC',
  },
  {
    code: 'IKEDC',
    name: 'Ikeja Electricity',
    shortName: 'IKEDC',
  },
  {
    code: 'JED',
    name: 'Jos Electricity Distribution Plc',
    shortName: 'JED',
  },
  {
    code: 'KAEDCO',
    name: 'Kaduna Electricity Distribution Company',
    shortName: 'KAEDCO',
  },
  {
    code: 'KEDCO',
    name: 'Kano Electricity Distribution Plc',
    shortName: 'KEDCO',
  },
  {
    code: 'PHEDC',
    name: 'Port Harcourt Electricity Distribution Plc',
    shortName: 'PHEDC',
  },
  {
    code: 'YEDC',
    name: 'Yola Electricity Distribution Plc',
    shortName: 'YEDC',
  },
];

const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 2000];

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const Electricity: React.FC = () => {
  const navigate = useNavigate();

  const [showProviders, setShowProviders] = useState(false);

  const [provider, setProvider] = useState<Provider | null>(null);

  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>(
    'prepaid'
  );

  const [meterReference, setMeterReference] = useState('');

  const [preferredAmount, setPreferredAmount] = useState('');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [message, setMessage] = useState('');

  const formatAmount = (value: number | string) => {
    const numericValue =
      typeof value === 'number'
        ? value
        : Number(String(value).replace(/,/g, ''));

    if (!Number.isFinite(numericValue)) {
      return '';
    }

    return numericValue.toLocaleString('en-NG');
  };

  const handleQuickAmount = (amount: number) => {
    setPreferredAmount(String(amount));
    setError('');
    setMessage('');
  };

  const handlePreferredAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = event.target.value.replace(/[^\d.]/g, '');

    setPreferredAmount(rawValue);
    setError('');
    setMessage('');
  };

  const handleProviderSelect = (selectedProvider: Provider) => {
    setProvider(selectedProvider);
    setShowProviders(false);
    setError('');
    setMessage('');
  };

  const handleContinue = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!provider) {
      setError('Please select an electricity service provider.');
      return;
    }

    if (!meterReference.trim()) {
      setError(
        meterType === 'prepaid'
          ? 'Please enter your meter number.'
          : 'Please enter your meter/account number.'
      );
      return;
    }

    const amount = Number(preferredAmount);

    if (!preferredAmount || !Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid preferred amount.');
      return;
    }

    if (amount < 100) {
      setError('The minimum payment amount is ₦100.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      if (!token) {
        setError('Your session has expired. Please sign in again.');
        setLoading(false);
        return;
      }

      /*
       * This sends the electricity payment request to the existing
       * Zenimonies bills endpoint.
       *
       * The backend currently operates in test/pending mode.
       * It must not be treated as a successful real electricity
       * payment until a real provider confirms the transaction.
       */
      const response = await axios.post(
        `${API_URL}/api/bills`,
        {
          category: 'electricity',
          biller_name: provider.name,
          biller_code: provider.code,
          customer_reference: meterReference.trim(),
          meter_number: meterReference.trim(),
          meter_type: meterType,
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

      const data = response.data;

      if (data?.success === false) {
        throw new Error(
          data?.message || 'Unable to create electricity payment request.'
        );
      }

      /*
       * Keep the request information locally so the next verification
       * screen can use it.
       */
      localStorage.setItem(
        'zenimonies_electricity_payment',
        JSON.stringify({
          provider,
          meterType,
          meterReference: meterReference.trim(),
          amount,
          response: data,
        })
      );

      /*
       * If a dedicated verification route is added later, this can
       * navigate directly to it. For now we show the user that the
       * request has been created and has not been falsely marked as paid.
       */
      setMessage(
        data?.message ||
          'Payment request created. Meter verification is required before payment.'
      );
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      setError(
        apiMessage ||
          'Unable to continue with the electricity payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4faf7',
        color: '#073b2a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e1eee8',
          padding: '18px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#073b2a',
            fontSize: 36,
            lineHeight: 1,
            padding: 0,
            cursor: 'pointer',
          }}
          aria-label="Go back"
        >
          ‹
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: 25,
            fontWeight: 800,
            color: '#073b2a',
          }}
        >
          Electricity
        </h1>

        <button
          type="button"
          onClick={() => navigate('/bills/history')}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#087b48',
            fontSize: 15,
            fontWeight: 800,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          History
        </button>
      </header>

      <main
        style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          padding: '24px 18px 40px',
          boxSizing: 'border-box',
        }}
      >
        <form onSubmit={handleContinue}>
          {/* Service Provider */}
          <section style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 800,
                color: '#315e4d',
                marginBottom: 9,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Service Provider
            </label>

            <button
              type="button"
              onClick={() => {
                setShowProviders(true);
                setError('');
              }}
              style={{
                width: '100%',
                minHeight: 66,
                borderRadius: 17,
                border: '1px solid #cfe4da',
                background: '#ffffff',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(7, 59, 42, 0.04)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    borderRadius: 13,
                    background: '#e5f5ed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#087b48',
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  {provider?.shortName || '⚡'}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: provider ? '#087b48' : '#73857e',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {provider
                      ? provider.name
                      : 'Select electricity provider'}
                  </div>

                  {provider && (
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        color: '#80918b',
                      }}
                    >
                      {provider.code}
                    </div>
                  )}
                </div>
              </div>

              <span
                style={{
                  fontSize: 27,
                  color: '#087b48',
                  marginLeft: 10,
                }}
              >
                ›
              </span>
            </button>
          </section>

          {/* Prepaid / Postpaid */}
          <section style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 800,
                color: '#315e4d',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Meter Type
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMeterType('prepaid');
                  setMeterReference('');
                  setError('');
                }}
                style={{
                  minHeight: 58,
                  borderRadius: 16,
                  border:
                    meterType === 'prepaid'
                      ? '2px solid #087b48'
                      : '1px solid #cfe4da',
                  background:
                    meterType === 'prepaid' ? '#e5f5ed' : '#ffffff',
                  color:
                    meterType === 'prepaid' ? '#087b48' : '#587269',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Prepaid
              </button>

              <button
                type="button"
                onClick={() => {
                  setMeterType('postpaid');
                  setMeterReference('');
                  setError('');
                }}
                style={{
                  minHeight: 58,
                  borderRadius: 16,
                  border:
                    meterType === 'postpaid'
                      ? '2px solid #087b48'
                      : '1px solid #cfe4da',
                  background:
                    meterType === 'postpaid' ? '#e5f5ed' : '#ffffff',
                  color:
                    meterType === 'postpaid' ? '#087b48' : '#587269',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Postpaid
              </button>
            </div>
          </section>

          {/* Meter / Account Number */}
          <section style={{ marginBottom: 26 }}>
            <label
              htmlFor="meterReference"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 800,
                color: '#315e4d',
                marginBottom: 9,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {meterType === 'prepaid'
                ? 'Meter Number'
                : 'Meter / Account Number'}
            </label>

            <input
              id="meterReference"
              type="text"
              value={meterReference}
              onChange={(event) =>
                setMeterReference(event.target.value)
              }
              placeholder={
                meterType === 'prepaid'
                  ? 'Enter meter number'
                  : 'Enter meter/account number'
              }
              style={{
                width: '100%',
                minHeight: 60,
                boxSizing: 'border-box',
                borderRadius: 16,
                border: '1px solid #cfe4da',
                background: '#ffffff',
                padding: '0 17px',
                fontSize: 16,
                color: '#073b2a',
                outline: 'none',
              }}
            />
          </section>

          {/* Amount */}
          <section style={{ marginBottom: 25 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#315e4d',
                marginBottom: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Amount
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {QUICK_AMOUNTS.map((amount) => {
                const selected =
                  Number(preferredAmount) === amount;

                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleQuickAmount(amount)}
                    style={{
                      minHeight: 56,
                      borderRadius: 15,
                      border: selected
                        ? '2px solid #087b48'
                        : '1px solid #cfe4da',
                      background: selected
                        ? '#e5f5ed'
                        : '#ffffff',
                      color: '#087b48',
                      fontSize: 16,
                      fontWeight: 850,
                      cursor: 'pointer',
                    }}
                  >
                    ₦{formatAmount(amount)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Preferred Amount */}
          <section style={{ marginBottom: 24 }}>
            <label
              htmlFor="preferredAmount"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 800,
                color: '#315e4d',
                marginBottom: 9,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Preferred Amount
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 62,
                borderRadius: 16,
                border: '1px solid #cfe4da',
                background: '#ffffff',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  paddingLeft: 17,
                  fontSize: 19,
                  fontWeight: 800,
                  color: '#087b48',
                }}
              >
                ₦
              </span>

              <input
                id="preferredAmount"
                type="number"
                min="100"
                step="1"
                value={preferredAmount}
                onChange={handlePreferredAmountChange}
                placeholder="Enter preferred amount"
                style={{
                  flex: 1,
                  width: '100%',
                  height: 60,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  padding: '0 15px 0 8px',
                  fontSize: 17,
                  color: '#073b2a',
                }}
              />
            </div>
          </section>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: 18,
                padding: '13px 15px',
                borderRadius: 14,
                background: '#fff0f0',
                border: '1px solid #f2cccc',
                color: '#a32626',
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              style={{
                marginBottom: 18,
                padding: '13px 15px',
                borderRadius: 14,
                background: '#e9f7f0',
                border: '1px solid #ccebdd',
                color: '#176943',
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              {message}
            </div>
          )}

          {/* Continue */}
          <button
            type="submit"
            disabled={
              loading ||
              !provider ||
              !meterReference.trim() ||
              !preferredAmount
            }
            style={{
              width: '100%',
              minHeight: 60,
              border: 'none',
              borderRadius: 17,
              background:
                loading ||
                !provider ||
                !meterReference.trim() ||
                !preferredAmount
                  ? '#a8cabb'
                  : '#087b48',
              color: '#ffffff',
              fontSize: 17,
              fontWeight: 850,
              cursor:
                loading ||
                !provider ||
                !meterReference.trim() ||
                !preferredAmount
                  ? 'not-allowed'
                  : 'pointer',
              boxShadow:
                loading ||
                !provider ||
                !meterReference.trim() ||
                !preferredAmount
                  ? 'none'
                  : '0 8px 20px rgba(8, 123, 72, 0.2)',
            }}
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </form>
      </main>

      {/* Provider selector */}
      {showProviders && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(3, 38, 25, 0.42)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowProviders(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '88vh',
              overflowY: 'auto',
              background: '#f7fbf9',
              borderRadius: '28px 28px 0 0',
              padding: '20px 16px 28px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 42,
                height: 5,
                borderRadius: 99,
                background: '#c9dcd4',
                margin: '0 auto 18px',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 850,
                    color: '#073b2a',
                  }}
                >
                  Service Provider
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    fontSize: 13,
                    color: '#70827b',
                  }}
                >
                  Select your electricity provider
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProviders(false)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#e7f3ed',
                  color: '#087b48',
                  fontSize: 23,
                  cursor: 'pointer',
                }}
                aria-label="Close provider selector"
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {ELECTRICITY_PROVIDERS.map((item) => {
                const selected = provider?.code === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleProviderSelect(item)}
                    style={{
                      width: '100%',
                      minHeight: 72,
                      borderRadius: 17,
                      border: selected
                        ? '2px solid #087b48'
                        : '1px solid #d7e8e0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      padding: '10px 13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 47,
                        height: 47,
                        minWidth: 47,
                        borderRadius: 14,
                        background: '#e5f5ed',
                        color: '#087b48',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {item.shortName}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          color: '#087b48',
                          fontSize: 15,
                          fontWeight: 800,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={{
                          color: '#84948e',
                          fontSize: 12,
                          marginTop: 3,
                        }}
                      >
                        {item.code}
                      </div>
                    </div>

                    <div
                      style={{
                        width: 24,
                        height: 24,
                        minWidth: 24,
                        borderRadius: '50%',
                        border: selected
                          ? '2px solid #087b48'
                          : '2px solid #bfd4ca',
                        background: selected
                          ? '#087b48'
                          : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 900,
                      }}
                    >
                      {selected ? '✓' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Electricity;
