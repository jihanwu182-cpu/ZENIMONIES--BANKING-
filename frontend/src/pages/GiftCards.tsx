
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type GiftCardMode = 'buy' | 'sell';

const GiftCards: React.FC = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<GiftCardMode>('buy');

  const [notice, setNotice] = useState('');

  const [giftCard, setGiftCard] = useState('');
  const [amount, setAmount] = useState('');
  const [country, setCountry] = useState('');
  const [cardCode, setCardCode] = useState('');

  const resetForm = (nextMode: GiftCardMode) => {
    setMode(nextMode);
    setNotice('');
    setGiftCard('');
    setAmount('');
    setCountry('');
    setCardCode('');
  };

  const handleContinue = () => {
    if (!giftCard) {
      setNotice('Please select a gift card brand.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setNotice('Please enter a valid amount.');
      return;
    }

    if (mode === 'sell' && !cardCode.trim()) {
      setNotice(
        'Please enter the gift card code or redemption details.'
      );
      return;
    }

    setNotice(
      'Gift card provider integration is not connected yet. ' +
      'No payment has been made, no wallet has been debited, ' +
      'and no gift card has been purchased or redeemed.'
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 50,
    boxSizing: 'border-box',
    border: '1px solid #dce9e1',
    borderRadius: 12,
    padding: '0 14px',
    fontSize: 15,
    color: '#173d2b',
    background: '#ffffff',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#315c46',
    marginBottom: 8,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f8f6',
        padding: '20px 16px 40px',
        boxSizing: 'border-box',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        {/* HEADER */}

        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              border: '1px solid #e0e9e3',
              background: '#ffffff',
              color: '#145c39',
              fontSize: 25,
              cursor: 'pointer',
            }}
          >
            ‹
          </button>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 23,
                fontWeight: 800,
                color: '#145c39',
              }}
            >
              Gift Cards
            </h1>

            <p
              style={{
                margin: '5px 0 0',
                fontSize: 13,
                color: '#748078',
              }}
            >
              Buy and sell gift cards with ZENIMONIES
            </p>
          </div>
        </header>

        {/* GREEN BANNER */}

        <div
          style={{
            background:
              'linear-gradient(135deg, #176b43, #104d32)',
            borderRadius: 18,
            padding: 20,
            color: '#ffffff',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                minWidth: 54,
                borderRadius: 15,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 29,
              }}
            >
              🎁
            </div>

            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 5,
                }}
              >
                ZENIMONIES Gift Cards
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: '#d9eee2',
                  lineHeight: 1.6,
                }}
              >
                Buy digital gift cards or exchange
                eligible gift cards for naira.
              </div>
            </div>
          </div>
        </div>

        {/* BUY / SELL TABS */}

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 5,
            background: '#e6efe9',
            borderRadius: 15,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={() => resetForm('buy')}
            style={{
              flex: 1,
              height: 48,
              border: 'none',
              borderRadius: 11,
              background:
                mode === 'buy' ? '#176b43' : 'transparent',
              color: mode === 'buy' ? '#ffffff' : '#587264',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                mode === 'buy'
                  ? '0 3px 10px rgba(23,107,67,0.15)'
                  : 'none',
            }}
          >
            Buy Gift Cards
          </button>

          <button
            type="button"
            onClick={() => resetForm('sell')}
            style={{
              flex: 1,
              height: 48,
              border: 'none',
              borderRadius: 11,
              background:
                mode === 'sell' ? '#176b43' : 'transparent',
              color: mode === 'sell' ? '#ffffff' : '#587264',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                mode === 'sell'
                  ? '0 3px 10px rgba(23,107,67,0.15)'
                  : 'none',
            }}
          >
            Sell Gift Cards
          </button>
        </div>

        {/* FORM CARD */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e1ebe4',
            borderRadius: 20,
            padding: 20,
            boxShadow: '0 5px 20px rgba(20,92,57,0.04)',
          }}
        >
          <h2
            style={{
              margin: '0 0 7px',
              fontSize: 20,
              fontWeight: 800,
              color: '#145c39',
            }}
          >
            {mode === 'buy'
              ? 'Buy a Gift Card'
              : 'Sell a Gift Card'}
          </h2>

          <p
            style={{
              margin: '0 0 22px',
              fontSize: 13,
              color: '#748078',
              lineHeight: 1.6,
            }}
          >
            {mode === 'buy'
              ? 'Choose a gift card and enter the amount you want to purchase.'
              : 'Select your gift card and provide its details for a future redemption quote.'}
          </p>

          {/* GIFT CARD BRAND */}

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              Gift Card Brand
            </label>

            <select
              value={giftCard}
              onChange={(e) => {
                setGiftCard(e.target.value);
                setNotice('');
              }}
              style={inputStyle}
            >
              <option value="">
                Select gift card brand
              </option>

              <option value="Amazon">Amazon</option>
              <option value="Apple">Apple Gift Card</option>
              <option value="Google Play">Google Play</option>
              <option value="Steam">Steam</option>
              <option value="PlayStation">
                PlayStation
              </option>
              <option value="Xbox">Xbox</option>
              <option value="Razer Gold">Razer Gold</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* COUNTRY */}

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              Gift Card Country / Region
            </label>

            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setNotice('');
              }}
              style={inputStyle}
            >
              <option value="">
                Select card region
              </option>

              <option value="United States">
                United States
              </option>

              <option value="United Kingdom">
                United Kingdom
              </option>

              <option value="Canada">Canada</option>

              <option value="Australia">
                Australia
              </option>

              <option value="Other">Other</option>
            </select>
          </div>

          {/* AMOUNT */}

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              {mode === 'buy'
                ? 'Gift Card Amount (USD equivalent)'
                : 'Gift Card Face Value (USD equivalent)'}
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #dce9e1',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#ffffff',
              }}
            >
              <span
                style={{
                  padding: '0 15px',
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  background: '#eff7f1',
                  color: '#176b43',
                  fontWeight: 800,
                }}
              >
                $
              </span>

              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setNotice('');
                }}
                placeholder="Enter amount"
                style={{
                  ...inputStyle,
                  border: 'none',
                  borderRadius: 0,
                }}
              />
            </div>
          </div>

          {/* SELL DETAILS */}

          {mode === 'sell' && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                Gift Card Code / Redemption Details
              </label>

              <textarea
                value={cardCode}
                onChange={(e) => {
                  setCardCode(e.target.value);
                  setNotice('');
                }}
                placeholder="Enter details for the gift card"
                rows={4}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: 14,
                  resize: 'vertical',
                }}
              />

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: '#8a7460',
                  lineHeight: 1.6,
                }}
              >
                Do not submit a real gift card code here
                until a secure provider submission and
                redemption system is connected.
              </div>
            </div>
          )}

          {/* BUY / SELL NOTICE */}

          <div
            style={{
              background: '#fff8e8',
              border: '1px solid #f2e1b8',
              borderRadius: 13,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#855d12',
                marginBottom: 5,
              }}
            >
              Provider connection pending
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#806b42',
                lineHeight: 1.7,
              }}
            >
              Gift card purchases, redemption, exchange
              rates and naira payouts are not yet active.
              No wallet funds will be deducted.
            </div>
          </div>

          {/* CONTINUE */}

          <button
            type="button"
            onClick={handleContinue}
            style={{
              width: '100%',
              height: 52,
              border: 'none',
              borderRadius: 13,
              background: '#176b43',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {mode === 'buy'
              ? 'Continue to Purchase'
              : 'Continue to Sell'}
          </button>

          {/* STATUS MESSAGE */}

          {notice && (
            <div
              role="status"
              style={{
                marginTop: 16,
                padding: 14,
                background: '#eaf7ef',
                border: '1px solid #cfe9d8',
                borderRadius: 12,
                color: '#145c39',
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {notice}
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div
          style={{
            textAlign: 'center',
            marginTop: 25,
            color: '#89958d',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              color: '#176b43',
              fontWeight: 800,
              letterSpacing: 1,
              marginBottom: 5,
            }}
          >
            ZENIMONIES
          </div>

          Secure banking for your everyday needs.
        </div>
      </div>
    </div>
  );
};

export default GiftCards;
