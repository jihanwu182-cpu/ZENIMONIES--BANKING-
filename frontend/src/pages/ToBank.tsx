import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Bank {
  name: string;
  code: string;
}

const BANKS: Bank[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Globus Bank', code: '103' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '090267' },
  { name: 'Moniepoint', code: '090405' },
  { name: 'OPay', code: '100004' },
  { name: 'PalmPay', code: '100033' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Premium Trust Bank', code: '105' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

const ToBank: React.FC = () => {
  const navigate = useNavigate();

  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    setError('');

    if (!selectedBank) {
      setError('Please select a bank.');
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError('Please enter a valid 10-digit account number.');
      return;
    }

    const numericAmount = Number(amount.replace(/,/g, ''));

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    const bank = BANKS.find(
      (item) => item.code === selectedBank
    );

    if (!bank) {
      setError('Please select a valid bank.');
      return;
    }

    navigate('/transfer-confirmation', {
      state: {
        bank,
        accountNumber,
        amount: numericAmount,
        narration,
      },
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f8f7',
        color: '#102a25',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      {/* HEADER */}

      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5ebe8',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 'min(700px, 92%)',
            margin: '0 auto',
            minHeight: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: '1px solid #e1e8e5',
              background: '#ffffff',
              color: '#087f5b',
              fontSize: 23,
              cursor: 'pointer',
            }}
          >
            ←
          </button>

          <div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: '#102a25',
              }}
            >
              Send to Bank
            </div>

            <div
              style={{
                color: '#7a8a85',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Send money to another bank account
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <main
        style={{
          width: 'min(700px, 92%)',
          margin: '0 auto',
          paddingTop: 25,
        }}
      >
        {/* INTRO */}

        <div
          style={{
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: '#087f5b',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            BANK TRANSFER
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 27,
              lineHeight: 1.2,
              fontWeight: 800,
              color: '#102a25',
            }}
          >
            Send money
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              color: '#71807b',
              fontSize: 14,
            }}
          >
            Enter the bank account details and amount.
          </p>
        </div>

        {/* FORM CARD */}

        <section
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 20,
            border: '1px solid #e5ebe8',
            boxShadow:
              '0 8px 25px rgba(16, 42, 37, 0.05)',
          }}
        >
          {/* BANK */}

          <label
            htmlFor="bank"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#344c46',
              marginBottom: 8,
            }}
          >
            Bank name
          </label>

          <div
            style={{
              position: 'relative',
            }}
          >
            <select
              id="bank"
              value={selectedBank}
              onChange={(event) => {
                setSelectedBank(event.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                height: 54,
                boxSizing: 'border-box',
                border: '1px solid #d9e3df',
                borderRadius: 13,
                padding: '0 45px 0 15px',
                fontSize: 15,
                color: selectedBank
                  ? '#102a25'
                  : '#8a9994',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'auto',
              }}
            >
              <option value="">
                Select bank
              </option>

              {BANKS.map((bank) => (
                <option
                  key={`${bank.name}-${bank.code}`}
                  value={bank.code}
                >
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          {/* SELECTED BANK */}

          {selectedBank && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                background: '#ecfdf5',
                border: '1px solid #b7ebd4',
                borderRadius: 10,
                color: '#087f5b',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ✓{' '}
              {
                BANKS.find(
                  (bank) =>
                    bank.code === selectedBank
                )?.name
              }
            </div>
          )}

          {/* ACCOUNT NUMBER */}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <label
              htmlFor="account-number"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#344c46',
                marginBottom: 8,
              }}
            >
              Account number
            </label>

            <input
              id="account-number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(event) => {
                const value =
                  event.target.value.replace(/\D/g, '');

                setAccountNumber(value);
                setError('');
              }}
              placeholder="Enter 10-digit account number"
              style={{
                width: '100%',
                height: 54,
                boxSizing: 'border-box',
                border: '1px solid #d9e3df',
                borderRadius: 13,
                padding: '0 15px',
                fontSize: 15,
                color: '#102a25',
                outline: 'none',
              }}
            />
          </div>

          {/* AMOUNT */}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <label
              htmlFor="amount"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#344c46',
                marginBottom: 8,
              }}
            >
              Amount
            </label>

            <div
              style={{
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 15,
                  top: 16,
                  color: '#087f5b',
                  fontSize: 17,
                  fontWeight: 800,
                  zIndex: 1,
                }}
              >
                ₦
              </span>

              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(
                      /[^\d.]/g,
                      ''
                    );

                  setAmount(value);
                  setError('');
                }}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: 54,
                  boxSizing: 'border-box',
                  border: '1px solid #d9e3df',
                  borderRadius: 13,
                  padding: '0 15px 0 38px',
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#102a25',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* NARRATION */}

          <div
            style={{
              marginTop: 20,
            }}
          >
            <label
              htmlFor="narration"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#344c46',
                marginBottom: 8,
              }}
            >
              Narration
              <span
                style={{
                  color: '#98a2b3',
                  fontWeight: 400,
                }}
              >
                {' '}
                (optional)
              </span>
            </label>

            <input
              id="narration"
              type="text"
              maxLength={100}
              value={narration}
              onChange={(event) =>
                setNarration(event.target.value)
              }
              placeholder="What is this payment for?"
              style={{
                width: '100%',
                height: 54,
                boxSizing: 'border-box',
                border: '1px solid #d9e3df',
                borderRadius: 13,
                padding: '0 15px',
                fontSize: 15,
                color: '#102a25',
                outline: 'none',
              }}
            />
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={{
                marginTop: 18,
                padding: '12px 14px',
                background: '#fff4f2',
                border: '1px solid #fecdca',
                color: '#b42318',
                borderRadius: 11,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          {/* CONTINUE */}

          <button
            type="button"
            onClick={handleContinue}
            style={{
              width: '100%',
              height: 54,
              marginTop: 22,
              border: 'none',
              borderRadius: 14,
              background:
                'linear-gradient(135deg, #087f5b, #0b9b6d)',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                '0 8px 20px rgba(8, 127, 91, 0.20)',
            }}
          >
            Continue →
          </button>

          <div
            style={{
              textAlign: 'center',
              marginTop: 12,
              color: '#8a9994',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            Your transfer will be reviewed before it is
            sent.
          </div>
        </section>

        {/* BACK */}

        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
          }}
        >
          <Link
            to="/"
            style={{
              color: '#087f5b',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ToBank;
