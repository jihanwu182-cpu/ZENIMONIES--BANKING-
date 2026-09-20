import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

type Provider = {
  code: string;
  name: string;
  shortName: string;
};

const ELECTRICITY_PROVIDERS: Provider[] = [
  {
    code: 'IBEDC',
    name: 'Ibadan Electricity',
    shortName: 'IBEDC',
  },
  {
    code: 'JED',
    name: 'Jos Electricity',
    shortName: 'JED',
  },
  {
    code: 'PHEDC',
    name: 'Port Harcourt Electricity',
    shortName: 'PHEDC',
  },
  {
    code: 'KAEDCO',
    name: 'Kaduna Electricity',
    shortName: 'KAEDCO',
  },
  {
    code: 'IKEDC',
    name: 'Ikeja Electricity',
    shortName: 'IKEDC',
  },
  {
    code: 'AEDC',
    name: 'Abuja Electricity',
    shortName: 'AEDC',
  },
  {
    code: 'EKEDC',
    name: 'Eko Electricity',
    shortName: 'EKEDC',
  },
  {
    code: 'EEDC',
    name: 'Enugu Electricity',
    shortName: 'EEDC',
  },
  {
    code: 'KEDCO',
    name: 'Kano Electricity',
    shortName: 'KEDCO',
  },
  {
    code: 'BEDC',
    name: 'Benin Electricity',
    shortName: 'BEDC',
  },
  {
    code: 'YEDC',
    name: 'Yola Electricity',
    shortName: 'YEDC',
  },
  {
    code: 'APLE',
    name: 'Aba Electricity',
    shortName: 'APLE',
  },
];

const Bills: React.FC = () => {
  const [provider, setProvider] = useState('');
  const [meterType, setMeterType] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');

  const [step, setStep] = useState<
    'provider' | 'details' | 'payment'
  >('provider');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [paymentResult, setPaymentResult] =
    useState<any>(null);

  const selectedProvider = useMemo(
    () =>
      ELECTRICITY_PROVIDERS.find(
        (item) => item.code === provider
      ),
    [provider]
  );

  // ============================================================
  // SELECT PROVIDER
  // ============================================================

  const selectProvider = (code: string) => {
    setProvider(code);
    setError('');
    setMessage('');
    setPaymentResult(null);
  };

  // ============================================================
  // CONTINUE FROM PROVIDER
  // ============================================================

  const continueFromProvider = () => {
    if (!provider) {
      setError(
        'Please select an electricity provider.'
      );
      return;
    }

    setError('');
    setStep('details');
  };

  // ============================================================
  // CONTINUE FROM METER DETAILS
  // ============================================================

  const continueFromDetails = () => {
    if (!meterType) {
      setError(
        'Please select Prepaid or Postpaid.'
      );
      return;
    }

    if (!meterNumber.trim()) {
      setError(
        'Please enter the meter number.'
      );
      return;
    }

    setError('');
    setStep('payment');
  };

  // ============================================================
  // SUBMIT PAYMENT REQUEST
  // ============================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        'Please enter a valid amount.'
      );
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem(
        'zenimonies_token'
      );

      if (!token) {
        setError(
          'Your session has expired. Please sign in again.'
        );
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/bills`,
        {
          bill_type: 'electricity',
          provider,
          customer_number:
            meterNumber.trim(),
          amount: numericAmount,
          meter_type: meterType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setPaymentResult(
          response.data.data
        );

        setMessage(
          response.data?.message ||
            'Payment request created and is awaiting provider verification.'
        );
      } else {
        setError(
          response.data?.message ||
            'Unable to process electricity payment.'
        );
      }
    } catch (err: any) {
      console.error(
        'Electricity payment error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          'Unable to connect to the electricity payment service.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PROVIDER BADGE
  // ============================================================

  const providerBadge = (
    item: Provider
  ) => (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: '50%',
        background: '#eef8f3',
        border: '1px solid #dceee5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#087b48',
        fontWeight: 800,
        fontSize: 11,
        textAlign: 'center',
      }}
    >
      {item.shortName}
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f9fcfa 0%, #f1f8f5 100%)',
        color: '#102a21',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '18px 16px 40px',
        }}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 2px 20px',
          }}
        >
          <Link
            to="/"
            aria-label="Back to dashboard"
            style={{
              textDecoration: 'none',
              color: '#102a21',
              fontSize: 30,
              lineHeight: 1,
            }}
          >
            ‹
          </Link>

          <div
            style={{
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            Electricity
          </div>

          <Link
            to="/bills/history"
            style={{
              textDecoration: 'none',
              color: '#087b48',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            History
          </Link>
        </header>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: '13px 15px',
              borderRadius: 14,
              background: '#fff0ef',
              border:
                '1px solid #ffd6d2',
              color: '#b42318',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* ======================================================
            MAIN CARD
        ====================================================== */}

        <section
          style={{
            background: '#ffffff',
            borderRadius: 22,
            border:
              '1px solid #e1ebe7',
            boxShadow:
              '0 8px 28px rgba(16, 42, 33, 0.06)',
            overflow: 'hidden',
          }}
        >
          {/* ====================================================
              CARD HEADER
          ==================================================== */}

          <div
            style={{
              padding:
                '20px 18px 14px',
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: '#6b7c75',
                marginBottom: 5,
              }}
            >
              SERVICE PROVIDER
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 24,
              }}
            >
              {step === 'provider'
                ? 'Select Electricity Provider'
                : 'Electricity Payment'}
            </h1>
          </div>

          {/* ====================================================
              PROVIDER LIST
          ==================================================== */}

          {step === 'provider' && (
            <>
              {ELECTRICITY_PROVIDERS.map(
                (item) => {
                  const selected =
                    provider === item.code;

                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() =>
                        selectProvider(
                          item.code
                        )
                      }
                      style={{
                        width: '100%',
                        border: 0,
                        borderTop:
                          '1px solid #e8eeeb',
                        background:
                          selected
                            ? '#f1faf5'
                            : '#ffffff',
                        padding:
                          '16px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      {providerBadge(item)}

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 750,
                            fontSize: 16,
                          }}
                        >
                          {item.name}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            color: '#71817b',
                            fontSize: 13,
                          }}
                        >
                          {item.shortName}
                        </div>
                      </div>

                      {/* SELECTION CIRCLE */}

                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius:
                            '50%',
                          border: selected
                            ? '2px solid #087b48'
                            : '2px solid #d8e1dd',
                          background:
                            selected
                              ? '#087b48'
                              : '#ffffff',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {selected
                          ? '✓'
                          : ''}
                      </div>
                    </button>
                  );
                }
              )}

              {/* CONTINUE */}

              <div
                style={{
                  padding: 18,
                }}
              >
                <button
                  type="button"
                  onClick={
                    continueFromProvider
                  }
                  disabled={!provider}
                  style={{
                    width: '100%',
                    border: 0,
                    borderRadius: 14,
                    padding:
                      '15px 18px',
                    background: provider
                      ? '#087b48'
                      : '#dce8e2',
                    color: provider
                      ? '#ffffff'
                      : '#7c8c85',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: provider
                      ? 'pointer'
                      : 'not-allowed',
                  }}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* ====================================================
              METER DETAILS
          ==================================================== */}

          {step === 'details' && (
            <div
              style={{
                padding: 18,
              }}
            >
              {/* SELECTED PROVIDER */}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  border:
                    '1px solid #e1ebe7',
                  borderRadius: 16,
                  background:
                    '#fbfdfc',
                  marginBottom: 22,
                }}
              >
                {selectedProvider &&
                  providerBadge(
                    selectedProvider
                  )}

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                    }}
                  >
                    {
                      selectedProvider?.name
                    }
                  </div>

                  <div
                    style={{
                      color: '#71817b',
                      fontSize: 13,
                    }}
                  >
                    {
                      selectedProvider?.shortName
                    }
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setStep(
                      'provider'
                    )
                  }
                  style={{
                    border: 0,
                    background:
                      'transparent',
                    color: '#087b48',
                    fontWeight: 750,
                    cursor: 'pointer',
                  }}
                >
                  Change
                </button>
              </div>

              {/* METER TYPE */}

              <label
                style={{
                  display: 'block',
                  fontWeight: 800,
                  marginBottom: 10,
                }}
              >
                Select Meter Type
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                {[
                  {
                    value: 'prepaid',
                    label: 'Prepaid',
                  },
                  {
                    value: 'postpaid',
                    label: 'Postpaid',
                  },
                ].map(
                  (item) => {
                    const selected =
                      meterType ===
                      item.value;

                    return (
                      <button
                        key={
                          item.value
                        }
                        type="button"
                        onClick={() =>
                          setMeterType(
                            item.value
                          )
                        }
                        style={{
                          padding:
                            '15px 12px',
                          borderRadius: 14,
                          border:
                            selected
                              ? '2px solid #087b48'
                              : '1px solid #dce6e1',
                          background:
                            selected
                              ? '#e4f5ed'
                              : '#ffffff',
                          color:
                            '#102a21',
                          fontWeight: 800,
                          cursor:
                            'pointer',
                        }}
                      >
                        <span
                          style={{
                            color:
                              selected
                                ? '#087b48'
                                : '#b5c2bd',
                            marginRight: 7,
                          }}
                        >
                          {selected
                            ? '✓'
                            : '○'}
                        </span>

                        {
                          item.label
                        }
                      </button>
                    );
                  }
                )}
              </div>

              {/* INFORMATION */}

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background:
                    '#eef8f3',
                  color: '#176044',
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}
              >
                {meterType ===
                'prepaid'
                  ? 'A token will be shown on the receipt after a successful provider payment.'
                  : 'Postpaid payments are applied to the customer account after provider confirmation.'}
              </div>

              {/* METER NUMBER */}

              <label
                htmlFor="meterNumber"
                style={{
                  display: 'block',
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Meter Number
              </label>

              <input
                id="meterNumber"
                value={meterNumber}
                onChange={(event) =>
                  setMeterNumber(
                    event.target.value
                  )
                }
                placeholder="Enter meter number"
                inputMode="numeric"
                style={{
                  width: '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '15px 14px',
                  borderRadius: 14,
                  border:
                    '1px solid #dce6e1',
                  outline: 'none',
                  fontSize: 16,
                  marginBottom: 18,
                }}
              />

              {/* CONTINUE */}

              <button
                type="button"
                onClick={
                  continueFromDetails
                }
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: 14,
                  padding:
                    '15px 18px',
                  background:
                    '#087b48',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* ====================================================
              PAYMENT
          ==================================================== */}

          {step === 'payment' && (
            <form
              onSubmit={
                handleSubmit
              }
              style={{
                padding: 18,
              }}
            >
              {/* SUMMARY */}

              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background:
                    '#e4f5ed',
                  color: '#034d31',
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                  }}
                >
                  {
                    selectedProvider?.name
                  }
                </div>

                <div
                  style={{
                    fontSize: 13,
                    marginTop: 5,
                  }}
                >
                  {meterType ===
                  'prepaid'
                    ? 'Prepaid'
                    : 'Postpaid'}{' '}
                  • Meter{' '}
                  {meterNumber}
                </div>
              </div>

              {/* TEST MODE NOTICE */}

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background:
                    '#fffaf0',
                  border:
                    '1px solid #f5e7c2',
                  color: '#795b12',
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}
              >
                This screen submits the
                request to the Zenimonies
                bill-payment backend. Real
                meter verification and
                provider payment will only
                be marked successful after
                the connected provider
                confirms them.
              </div>

              {/* AMOUNT */}

              <label
                htmlFor="amount"
                style={{
                  display: 'block',
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Amount (NGN)
              </label>

              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="₦0.00"
                inputMode="decimal"
                style={{
                  width: '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '15px 14px',
                  borderRadius: 14,
                  border:
                    '1px solid #dce6e1',
                  fontSize: 18,
                  marginBottom: 18,
                }}
              />

              {/* PAYMENT BUTTON */}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: 14,
                  padding:
                    '15px 18px',
                  background:
                    '#087b48',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: loading
                    ? 0.7
                    : 1,
                }}
              >
                {loading
                  ? 'Processing...'
                  : 'Continue to Payment'}
              </button>
            </form>
          )}
        </section>

        {/* ======================================================
            PAYMENT RESULT / RECEIPT PREVIEW
        ====================================================== */}

        {paymentResult && (
          <section
            style={{
              marginTop: 18,
              background: '#ffffff',
              borderRadius: 22,
              border:
                '1px solid #e1ebe7',
              boxShadow:
                '0 8px 28px rgba(16, 42, 33, 0.06)',
              padding: 20,
            }}
          >
            {/* SUCCESS ICON */}

            <div
              style={{
                width: 54,
                height: 54,
                borderRadius:
                  '50%',
                background:
                  '#e4f5ed',
                color: '#087b48',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: 25,
                marginBottom: 12,
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin:
                  '0 0 7px',
                fontSize: 21,
              }}
            >
              Payment Request Created
            </h2>

            <p
              style={{
                marginTop: 0,
                color: '#71817b',
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>

            {/* RECEIPT DETAILS */}

            <div
              style={{
                borderTop:
                  '1px solid #e8eeeb',
                marginTop: 16,
                paddingTop: 14,
              }}
            >
              <ReceiptRow
                label="Provider"
                value={
                  selectedProvider?.name ||
                  provider
                }
              />

              <ReceiptRow
                label="Meter Type"
                value={
                  meterType ===
                  'prepaid'
                    ? 'Prepaid'
                    : 'Postpaid'
                }
              />

              <ReceiptRow
                label="Meter Number"
                value={
                  paymentResult.meter_number ||
                  meterNumber
                }
              />

              <ReceiptRow
                label="Amount"
                value={`₦${Number(
                  paymentResult.amount ||
                    amount
                ).toLocaleString(
                  'en-NG',
                  {
                    minimumFractionDigits: 2,
                  }
                )}`}
              />

              <ReceiptRow
                label="Reference"
                value={
                  paymentResult.reference ||
                  'Pending'
                }
              />

              <ReceiptRow
                label="Status"
                value={
                  paymentResult.status ||
                  'pending'
                }
              />
            </div>

            {/* RECEIPT NOTICE */}

            <div
              style={{
                marginTop: 16,
                padding: 13,
                borderRadius: 13,
                background:
                  '#eef8f3',
                color: '#176044',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              A final customer receipt
              and prepaid token will be
              issued after the electricity
              provider confirms a successful
              payment.
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// ============================================================
// RECEIPT ROW
// ============================================================

const ReceiptRow: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent:
        'space-between',
      gap: 18,
      padding: '9px 0',
      fontSize: 14,
    }}
  >
    <span
      style={{
        color: '#71817b',
      }}
    >
      {label}
    </span>

    <strong
      style={{
        textAlign: 'right',
        wordBreak:
          'break-word',
      }}
    >
      {value}
    </strong>
  </div>
);

export default Bills;
