import React, { useMemo, useState } from 'react';
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

  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [showBanks, setShowBanks] = useState(false);
  const [error, setError] = useState('');

  const filteredBanks = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return BANKS;
    }

    return BANKS.filter((bank) =>
      bank.name.toLowerCase().includes(value)
    );
  }, [search]);

  const selectBank = (bank: Bank) => {
    setSelectedBank(bank);
    setSearch(bank.name);
    setShowBanks(false);
    setError('');
  };

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

    /*
     * This is only the frontend transfer form.
     *
     * We do not claim that the recipient account has been
     * verified until the backend is connected to a legitimate
     * account-name verification/payment provider.
     */

    navigate('/transfer-confirmation', {
      state: {
        bank: selectedBank,
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
        paddingBottom: '30px',
      }}
    >
      {/* Header */}

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
            maxWidth: '700px',
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid #e1e8e5',
              background: '#ffffff',
              color: '#087f5b',
              fontSize: '22px',
              cursor: 'pointer',
            }}
          >
            ←
          </button>

          <div>
            <div
              style={{
                fontSize: '19px',
                fontWeight: 800,
              }}
            >
              To Bank
            </div>

            <div
              style={{
                color: '#7a8a85',
                fontSize: '12px',
                marginTop: '2px',
              }}
            >
              Send money to a bank account
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          width: '100%',
          maxWidth: '700px',
          margin: '0 auto',
          padding: '25px 18px 50px',
          boxSizing: 'border-box',
        }}
      >
        {/* Page introduction */}

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '14px',
              color: '#71807b',
              marginBottom: '5px',
            }}
          >
            Bank transfer
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '27px',
              lineHeight: 1.2,
              color: '#102a25',
            }}
          >
            Send money
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              color: '#71807b',
              fontSize: '14px',
            }}
          >
            Choose a bank and enter the recipient's details.
          </p>
        </div>

        {/* Main card */}

        <section
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid #e5ebe8',
            boxShadow: '0 8px 25px rgba(16, 42, 37, 0.05)',
          }}
        >
          {/* Bank */}

          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '8px',
              color: '#344c46',
            }}
          >
            Select bank
          </label>

          <div style={{ position: 'relative' }}>
            <input
              value={search}
              onFocus={() => setShowBanks(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedBank(null);
                setShowBanks(true);
              }}
              placeholder="Search for a bank"
              style={{
                width: '100%',
                height: '52px',
                boxSizing: 'border-box',
                border: '1px solid #d9e3df',
                borderRadius: '13px',
                padding: '0 45px 0 15px',
                fontSize: '15px',
                outline: 'none',
                background: '#ffffff',
              }}
            />

            <span
              style={{
                position: 'absolute',
                right: '15px',
                top: '15px',
                color: '#087f5b',
                fontSize: '18px',
              }}
            >
              ⌕
            </span>

            {showBanks && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '58px',
                  background: '#ffffff',
                  border: '1px solid #dfe8e4',
                  borderRadius: '13px',
                  boxShadow: '0 12px 30px rgba(16, 42, 37, 0.12)',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  zIndex: 30,
                }}
              >
                {filteredBanks.length === 0 ? (
                  <div
                    style={{
                      padding: '18px',
                      color: '#71807b',
                      fontSize: '14px',
                    }}
                  >
                    No bank found.
                  </div>
                ) : (
                  filteredBanks.map((bank) => (
                    <button
                      key={`${bank.name}-${bank.code}`}
                      type="button"
                      onClick={() => selectBank(bank)}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '1px solid #edf1ef',
                        background: '#ffffff',
                        padding: '13px 15px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#16352e',
                          fontSize: '14px',
                        }}
                      >
                        {bank.name}
                      </div>

                      <div
                        style={{
                          color: '#8a9994',
                          fontSize: '11px',
                          marginTop: '3px',
                        }}
                      >
                        Bank code: {bank.code}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedBank && (
            <div
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                background: '#ecfdf5',
                border: '1px solid #b7ebd4',
                borderRadius: '10px',
                color: '#087f5b',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              ✓ {selectedBank.name} selected
            </div>
          )}

          {/* Account number */}

          <div style={{ marginTop: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#344c46',
              }}
            >
              Account number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '');
                setAccountNumber(value);
              }}
              placeholder="Enter 10-digit account number"
              style={{
                width: '100%',
                height: '52px',
                boxSizing: 'border-box',
                border: '1px solid #d9e3df',
                borderRadius: '13px',
                padding: '0 15px',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          {/* Amount */}

          <div style={{ marginTop: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#344c46',
              }}
            >
              Amount
            </label>

            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '15px',
                  top: '15px',
                  color: '#087f5b',
                  fontWeight: 800,
                }}
              >
                ₦
              </span>

              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  const value = event.target.value.replace(
                    /[^\d.]/g,
                    ''
                  );

                  setAmount(value);
                }}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: '52px',
                  boxSizing: 'border-box',
                  border: '1px solid #d9e3df',
                  borderRadius: '13px',
                  padding: '0 15px 0 35px',
                  fontSize: '18px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Narration */}

          <div style={{ marginTop: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#344c46',
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
              type="text"
              maxLength={100}
              value={narration}
              onChange={(event) =>
                setNarration(event.target.value)
              }
              placeholder="What is this payment for?"
              style={{
                width: '100%',
                height: '52px',
                boxSizing: 'border-box',
                border: '1px solid #d9e3df',
                borderRadius: '13px',
                padding: '0 15px',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          {/* Error */}

          {error && (
            <div
              style={{
                marginTop: '18px',
                padding: '12px 14px',
                background: '#fff4f2',
                border: '1px solid #fecdca',
                color: '#b42318',
                borderRadius: '11px',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Continue */}

          <button
            type="button"
            onClick={handleContinue}
            style={{
              width: '100%',
              height: '54px',
              marginTop: '22px',
              border: 'none',
              borderRadius: '14px',
              background:
                'linear-gradient(135deg, #087f5b, #0b9b6d)',
              color: '#ffffff',
              fontSize: '16px',
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
              marginTop: '12px',
              color: '#8a9994',
              fontSize: '11px',
              lineHeight: 1.5,
            }}
          >
            Your transfer will be reviewed before it is sent.
          </div>
        </section>

        {/* Back to dashboard */}

        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          <Link
            to="/"
            style={{
              color: '#087f5b',
              textDecoration: 'none',
              fontSize: '13px',
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
