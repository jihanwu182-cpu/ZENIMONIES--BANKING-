import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Bills: React.FC = () => {
  const [billType, setBillType] = useState('');
  const [provider, setProvider] = useState('');
  const [meterType, setMeterType] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [amount, setAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ============================================================
  // BILL TYPE CHANGE
  // ============================================================

  const handleBillTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;

    setBillType(value);
    setProvider('');
    setMeterType('');
    setCustomerNumber('');
    setAmount('');
    setError('');
    setMessage('');
  };

  // ============================================================
  // PROVIDER CHANGE
  // ============================================================

  const handleProviderChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setProvider(event.target.value);
    setError('');
    setMessage('');
  };

  // ============================================================
  // METER TYPE CHANGE
  // ============================================================

  const handleMeterTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setMeterType(event.target.value);
    setError('');
    setMessage('');
  };

  // ============================================================
  // SUBMIT BILL PAYMENT
  // ============================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const numericAmount = Number(amount);

    // ----------------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // ----------------------------------------------------------

    if (!billType) {
      setError('Please select a bill type.');
      return;
    }

    if (!provider) {
      setError('Please select a provider.');
      return;
    }

    if (isElectricity && !meterType) {
      setError('Please select prepaid or postpaid.');
      return;
    }

    if (!customerNumber.trim()) {
      setError(
        isElectricity
          ? 'Please enter the meter number.'
          : 'Please enter the customer number.'
      );
      return;
    }

    if (!amount) {
      setError('Please enter an amount.');
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError('Please enter a valid amount.');
      return;
    }

    // ----------------------------------------------------------
    // START REQUEST
    // ----------------------------------------------------------

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      if (!token) {
        setError('Your session has expired. Please sign in again.');
        setLoading(false);
        return;
      }

      const requestData: {
        bill_type: string;
        provider: string;
        customer_number: string;
        amount: number;
        meter_type?: string;
      } = {
        bill_type: billType,
        provider,
        customer_number: customerNumber.trim(),
        amount: numericAmount
      };

      // Only electricity payments need meter_type
      if (isElectricity) {
        requestData.meter_type = meterType;
      }

      const response = await axios.post(
        `${API_URL}/api/bills`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Bill payment request created successfully.'
        );

        setBillType('');
        setProvider('');
        setMeterType('');
        setCustomerNumber('');
        setAmount('');
      } else {
        setError(
          response.data?.message ||
            'Unable to process bill payment.'
        );
      }
    } catch (err: any) {
      console.error('Bill payment error:', err);

      setError(
        err?.response?.data?.message ||
          'Unable to connect to the bill payment service.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CONDITIONS
  // ============================================================

  const isElectricity = billType === 'electricity';
  const isTv = billType === 'tv';

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px'
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        {/* BACK TO DASHBOARD */}

        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#0b5cff',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          ← Back to Dashboard
        </Link>

        {/* CARD */}

        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)'
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: '8px'
            }}
          >
            Pay Bills
          </h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px'
            }}
          >
            Pay electricity, television and other supported
            bills from your Zenimonies account.
          </p>

          {/* ERROR */}

          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '18px',
                borderRadius: '8px',
                background: '#fee4e2',
                color: '#b42318'
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div
              style={{
                padding: '12px',
                marginBottom: '18px',
                borderRadius: '8px',
                background: '#ecfdf3',
                color: '#027a48'
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ==================================================
                BILL TYPE
            ================================================== */}

            <label
              htmlFor="billType"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
              }}
            >
              Bill Type
            </label>

            <select
              id="billType"
              value={billType}
              onChange={handleBillTypeChange}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff'
              }}
            >
              <option value="">
                Select bill type
              </option>

              <option value="electricity">
                Electricity
              </option>

              <option value="tv">
                TV Subscription
              </option>

              <option value="internet">
                Internet
              </option>

              <option value="other">
                Other Bills
              </option>
            </select>

            {/* ==================================================
                PROVIDER
            ================================================== */}

            <label
              htmlFor="provider"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
              }}
            >
              Provider
            </label>

            <select
              id="provider"
              value={provider}
              onChange={handleProviderChange}
              disabled={!billType}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff'
              }}
            >
              <option value="">
                {billType
                  ? 'Select provider'
                  : 'Select bill type first'}
              </option>

              {/* ELECTRICITY */}

              {isElectricity && (
                <>
                  <option value="EKEDC">
                    EKEDC
                  </option>

                  <option value="IKEDC">
                    IKEDC
                  </option>

                  <option value="AEDC">
                    AEDC
                  </option>

                  <option value="EEDC">
                    EEDC
                  </option>

                  <option value="IBEDC">
                    IBEDC
                  </option>

                  <option value="JED">
                    JED
                  </option>

                  <option value="KAEDCO">
                    KAEDCO
                  </option>

                  <option value="KEDCO">
                    KEDCO
                  </option>

                  <option value="YEDC">
                    YEDC
                  </option>

                  <option value="BEDC">
                    BEDC
                  </option>
                </>
              )}

              {/* TV */}

              {isTv && (
                <>
                  <option value="DSTV">
                    DSTV
                  </option>

                  <option value="GOTV">
                    GOtv
                  </option>

                  <option value="STARTIMES">
                    Startimes
                  </option>
                </>
              )}

              {/* INTERNET */}

              {billType === 'internet' && (
                <>
                  <option value="Spectranet">
                    Spectranet
                  </option>

                  <option value="Smile">
                    Smile
                  </option>

                  <option value="MTN Internet">
                    MTN Internet
                  </option>
                </>
              )}

              {/* OTHER */}

              {billType === 'other' && (
                <option value="Other">
                  Other Provider
                </option>
              )}
            </select>

            {/* ==================================================
                ELECTRICITY METER TYPE
            ================================================== */}

            {isElectricity && (
              <>
                <label
                  htmlFor="meterType"
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}
                >
                  Meter Type
                </label>

                <select
                  id="meterType"
                  value={meterType}
                  onChange={handleMeterTypeChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '18px',
                    border: '1px solid #d0d5dd',
                    borderRadius: '8px',
                    background: '#ffffff'
                  }}
                >
                  <option value="">
                    Select meter type
                  </option>

                  <option value="prepaid">
                    Prepaid
                  </option>

                  <option value="postpaid">
                    Postpaid
                  </option>
                </select>
              </>
            )}

            {/* ==================================================
                CUSTOMER / METER NUMBER
            ================================================== */}

            <label
              htmlFor="customerNumber"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
              }}
            >
              {isElectricity
                ? 'Meter Number'
                : isTv
                ? 'Smartcard / IUC Number'
                : 'Customer Number'}
            </label>

            <input
              id="customerNumber"
              type="text"
              value={customerNumber}
              onChange={(event) =>
                setCustomerNumber(event.target.value)
              }
              placeholder={
                isElectricity
                  ? 'Enter meter number'
                  : isTv
                  ? 'Enter smartcard / IUC number'
                  : 'Enter customer number'
              }
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
            />

            {/* ==================================================
                AMOUNT
            ================================================== */}

            <label
              htmlFor="amount"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
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
                setAmount(event.target.value)
              }
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '24px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
            />

            {/* ==================================================
                SUBMIT
            ================================================== */}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                borderRadius: '8px',
                background: '#0b5cff',
                color: '#ffffff',
                fontWeight: 600,
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading
                ? 'Processing...'
                : 'Pay Bill'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Bills;
