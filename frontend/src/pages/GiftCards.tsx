
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type GiftCardMode = 'buy' | 'sell';
type CardType = 'Digital code' | 'Physical card';
type Tab = 'trade' | 'history';

type Brand = {
  id: string;
  name: string;
  logo: string;
  color: string;
  regions: string[];
  currencies: string[];
};

type GiftCardTransaction = {
  id: string;
  mode: GiftCardMode;
  brand: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
};

const GREEN = '#176b43';
const DARK_GREEN = '#104d32';

const BRANDS: Brand[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    logo: 'amazon',
    color: '#ff9900',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'apple',
    name: 'Apple Gift Card',
    logo: 'apple',
    color: '#111111',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'googleplay',
    name: 'Google Play',
    logo: 'googleplay',
    color: '#01875f',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'steam',
    name: 'Steam',
    logo: 'steam',
    color: '#171a21',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    logo: 'playstation',
    color: '#003791',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'xbox',
    name: 'Xbox',
    logo: 'xbox',
    color: '#107c10',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'razer',
    name: 'Razer Gold',
    logo: 'razer',
    color: '#44d62c',
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
];

const REGIONS = [
  { name: 'United States', currency: 'USD', symbol: '$' },
  { name: 'United Kingdom', currency: 'GBP', symbol: '£' },
  { name: 'Canada', currency: 'CAD', symbol: 'CA$' },
  { name: 'Australia', currency: 'AUD', symbol: 'A$' },
];

const formatMoney = (
  value: number,
  currency = 'NGN'
) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const GiftCards: React.FC = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<GiftCardMode>('buy');
  const [tab, setTab] = useState<Tab>('trade');

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] =
    useState<Brand | null>(null);

  const [region, setRegion] = useState('');
  const [cardType, setCardType] =
    useState<CardType>('Digital code');

  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');

  const [recipientEmail, setRecipientEmail] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [notes, setNotes] = useState('');

  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] =
    useState<'success' | 'error' | 'info'>('info');

  const [showReview, setShowReview] = useState(false);

  // Frontend demonstration only.
  // No real transaction data is stored or submitted.
  const [transactions] =
    useState<GiftCardTransaction[]>([]);

  const filteredBrands = useMemo(() => {
    return BRANDS.filter((brand) =>
      brand.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const selectedRegion = REGIONS.find(
    (item) => item.name === region
  );

  const parsedAmount = Number(amount);
  const parsedQuantity = Number(quantity);

  const validAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= 100000;

  const validQuantity =
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= 10;

  const canReview =
    !!selectedBrand &&
    !!region &&
    !!currency &&
    validAmount &&
    validQuantity;

  const resetForm = (nextMode: GiftCardMode) => {
    setMode(nextMode);
    setTab('trade');
    setSearch('');
    setSelectedBrand(null);
    setRegion('');
    setCurrency('USD');
    setAmount('');
    setQuantity('1');
    setRecipientEmail('');
    setCardCode('');
    setNotes('');
    setNotice('');
    setShowReview(false);
  };

  const chooseBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setRegion('');
    setCurrency('USD');
    setNotice('');
    setShowReview(false);
  };

  const chooseRegion = (value: string) => {
    setRegion(value);

    const found = REGIONS.find(
      (item) => item.name === value
    );

    if (found) {
      setCurrency(found.currency);
    }

    setNotice('');
    setShowReview(false);
  };

  const handleReview = () => {
    setNotice('');
    setNoticeType('error');

    if (!selectedBrand) {
      setNotice('Please select a gift card brand.');
      return;
    }

    if (!region || !currency) {
      setNotice('Please select the card country and currency.');
      return;
    }

    if (!validAmount) {
      setNotice(
        'Enter a valid card amount greater than zero.'
      );
      return;
    }

    if (!validQuantity) {
      setNotice('Choose a quantity between 1 and 10.');
      return;
    }

    if (
      mode === 'buy' &&
      recipientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)
    ) {
      setNotice('Please enter a valid recipient email.');
      return;
    }

    if (mode === 'sell' && !cardCode.trim()) {
      setNotice(
        'Card code submission is not enabled until a secure provider is connected.'
      );
      return;
    }

    setShowReview(true);
    setNoticeType('info');
    setNotice(
      'This is a review preview only. Provider checkout is not connected.'
    );
  };

  const handleProviderAction = () => {
    setNoticeType('info');
    setNotice(
      'Provider integration is pending. No transaction was created, no gift card was purchased or redeemed, and no wallet funds were deducted.'
    );
    setShowReview(false);
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
    fontWeight: 800,
    color: '#315c46',
    marginBottom: 8,
  };

  const sectionStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e1ebe4',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 5px 20px rgba(20,92,57,0.04)',
    marginBottom: 18,
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: '0 0 7px',
    fontSize: 20,
    fontWeight: 800,
    color: '#145c39',
  };

  const smallTextStyle: React.CSSProperties = {
    margin: '0 0 20px',
    fontSize: 13,
    color: '#748078',
    lineHeight: 1.7,
  };

  const noticeBackground =
    noticeType === 'error'
      ? '#fff0ef'
      : noticeType === 'success'
        ? '#eaf7ef'
        : '#fff8e8';

  const noticeColor =
    noticeType === 'error'
      ? '#a52b25'
      : noticeType === 'success'
        ? '#145c39'
        : '#806b42';

  const noticeBorder =
    noticeType === 'error'
      ? '#f2c7c4'
      : noticeType === 'success'
        ? '#cfe9d8'
        : '#f2e1b8';

  const renderBrandLogo = (brand: Brand) => {
    return (
      <div
        style={{
          width: 64,
          height: 64,
          minWidth: 64,
          borderRadius: 17,
          background: '#f7faf8',
          border: '1px solid #edf1ee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={`https://cdn.simpleicons.org/${brand.logo}`}
          alt={`${brand.name} logo`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';

            const parent = event.currentTarget.parentElement;

            if (parent) {
              parent.style.background = brand.color;
              parent.style.color = '#ffffff';
              parent.style.fontWeight = '900';
              parent.style.fontSize = '23px';
              parent.textContent = brand.name
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 3);
            }
          }}
          style={{
            width: 42,
            height: 42,
            objectFit: 'contain',
          }}
        />
      </div>
    );
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
      <div style={{ maxWidth: 650, margin: '0 auto' }}>
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
                fontWeight: 900,
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

        {/* BANNER */}

        <div
          style={{
            background:
              'linear-gradient(135deg, #176b43, #104d32)',
            borderRadius: 20,
            padding: 22,
            color: '#ffffff',
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 15,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                minWidth: 60,
                borderRadius: 17,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 31,
              }}
            >
              🎁
            </div>

            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  marginBottom: 5,
                }}
              >
                ZENIMONIES Gift Cards
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: '#d9eee2',
                  lineHeight: 1.7,
                }}
              >
                Choose your favourite brands, review your
                order, and manage gift card transactions.
              </div>
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION */}

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
            onClick={() => {
              setTab('trade');
              setNotice('');
            }}
            style={{
              flex: 1,
              height: 46,
              border: 'none',
              borderRadius: 11,
              background:
                tab === 'trade' ? GREEN : 'transparent',
              color: tab === 'trade' ? '#ffffff' : '#587264',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Buy / Sell
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('history');
              setNotice('');
              setShowReview(false);
            }}
            style={{
              flex: 1,
              height: 46,
              border: 'none',
              borderRadius: 11,
              background:
                tab === 'history' ? GREEN : 'transparent',
              color:
                tab === 'history' ? '#ffffff' : '#587264',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Transaction History
          </button>
        </div>

        {tab === 'trade' && (
          <>
            {/* BUY / SELL SWITCH */}

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
              {(['buy', 'sell'] as GiftCardMode[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => resetForm(item)}
                    style={{
                      flex: 1,
                      height: 48,
                      border: 'none',
                      borderRadius: 11,
                      background:
                        mode === item
                          ? GREEN
                          : 'transparent',
                      color:
                        mode === item
                          ? '#ffffff'
                          : '#587264',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {item === 'buy'
                      ? 'Buy Gift Cards'
                      : 'Sell Gift Cards'}
                  </button>
                )
              )}
            </div>

            {/* BRAND SELECTION */}

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                {mode === 'buy'
                  ? 'Choose a Gift Card'
                  : 'Select Card to Sell'}
              </h2>

              <p style={smallTextStyle}>
                Select a brand below. Brand availability
                and supported regions will be confirmed
                when a provider is connected.
              </p>

              <div style={{ marginBottom: 16 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search gift card brands..."
                  aria-label="Search gift card brands"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: 12,
                }}
              >
                {filteredBrands.map((brand) => {
                  const selected =
                    selectedBrand?.id === brand.id;

                  return (
                    <button
                      type="button"
                      key={brand.id}
                      onClick={() => chooseBrand(brand)}
                      aria-pressed={selected}
                      style={{
                        minHeight: 145,
                        border: selected
                          ? `2px solid ${GREEN}`
                          : '1px solid #e1ebe4',
                        borderRadius: 17,
                        background: selected
                          ? '#eff8f2'
                          : '#ffffff',
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        boxShadow: selected
                          ? '0 4px 12px rgba(23,107,67,0.09)'
                          : 'none',
                      }}
                    >
                      {renderBrandLogo(brand)}

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#24543b',
                          textAlign: 'center',
                        }}
                      >
                        {brand.name}
                      </span>

                      {selected && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: GREEN,
                          }}
                        >
                          Selected ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredBrands.length === 0 && (
                <p
                  style={{
                    textAlign: 'center',
                    color: '#748078',
                    fontSize: 13,
                    padding: 20,
                  }}
                >
                  No matching gift card brand found.
                </p>
              )}
            </div>

            {/* CARD DETAILS */}

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                {mode === 'buy'
                  ? 'Card Details'
                  : 'Sell Details'}
              </h2>

              <p style={smallTextStyle}>
                {mode === 'buy'
                  ? 'Choose the region, card type, and amount.'
                  : 'Enter the card information for a future redemption quote.'}
              </p>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Card Country / Region
                </label>

                <select
                  value={region}
                  onChange={(e) => chooseRegion(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select card region</option>
                  {REGIONS.map((item) => (
                    <option
                      key={item.name}
                      value={item.name}
                    >
                      {item.name} ({item.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Card Type
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  {(
                    [
                      'Digital code',
                      'Physical card',
                    ] as CardType[]
                  ).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setCardType(item)}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        borderRadius: 12,
                        border:
                          cardType === item
                            ? `2px solid ${GREEN}`
                            : '1px solid #dce9e1',
                        background:
                          cardType === item
                            ? '#eff8f2'
                            : '#ffffff',
                        color:
                          cardType === item
                            ? GREEN
                            : '#587264',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Gift Card Currency
                </label>

                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={inputStyle}
                >
                  {REGIONS.map((item) => (
                    <option
                      key={item.currency}
                      value={item.currency}
                    >
                      {item.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  {mode === 'buy'
                    ? 'Gift Card Amount'
                    : 'Gift Card Face Value'}
                </label>

                <div
                  style={{
                    display: 'flex',
                    border: '1px solid #dce9e1',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      minWidth: 65,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#eff7f1',
                      color: GREEN,
                      fontWeight: 900,
                    }}
                  >
                    {selectedRegion?.symbol || '$'}
                  </span>

                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setNotice('');
                      setShowReview(false);
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

              {mode === 'buy' && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>
                      Quantity
                    </label>

                    <select
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value)
                      }
                      style={inputStyle}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                        (number) => (
                          <option
                            key={number}
                            value={number}
                          >
                            {number}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>
                      Recipient Email (Optional)
                    </label>

                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) =>
                        setRecipientEmail(e.target.value)
                      }
                      placeholder="recipient@example.com"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {mode === 'sell' && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>
                      Gift Card Code / Redemption Details
                    </label>

                    <textarea
                      value={cardCode}
                      onChange={(e) =>
                        setCardCode(e.target.value)
                      }
                      placeholder="Do not enter a real gift card code until secure provider submission is available."
                      rows={4}
                      style={{
                        ...inputStyle,
                        height: 'auto',
                        padding: 14,
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>
                      Additional Notes (Optional)
                    </label>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional card details"
                      rows={3}
                      style={{
                        ...inputStyle,
                        height: 'auto',
                        padding: 14,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </>
              )}

              {/* PROVIDER STATUS */}

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
                    fontWeight: 900,
                    color: '#855d12',
                    marginBottom: 6,
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
                  Live rates, purchases, redemption,
                  card-code verification, and naira payouts
                  are not active. No wallet funds will be
                  deducted.
                </div>
              </div>

              <button
                type="button"
                disabled={!canReview}
                onClick={handleReview}
                style={{
                  width: '100%',
                  minHeight: 52,
                  border: 'none',
                  borderRadius: 13,
                  background: canReview ? GREEN : '#a7b8ad',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: canReview
                    ? 'pointer'
                    : 'not-allowed',
                }}
              >
                Review {mode === 'buy' ? 'Purchase' : 'Sale'}
              </button>

              {notice && (
                <div
                  role="status"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: noticeBackground,
                    border: `1px solid ${noticeBorder}`,
                    borderRadius: 12,
                    color: noticeColor,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {notice}
                </div>
              )}
            </div>

            {/* REVIEW PREVIEW */}

            {showReview && selectedBrand && (
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>
                  Review Your Order
                </h2>

                <p style={smallTextStyle}>
                  Please check your details before continuing.
                  This is a preview only.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {renderBrandLogo(selectedBrand)}

                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: '#145c39',
                      }}
                    >
                      {selectedBrand.name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: '#748078',
                        marginTop: 4,
                      }}
                    >
                      {region} · {currency}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f5f8f6',
                    borderRadius: 13,
                    padding: 15,
                    marginBottom: 16,
                  }}
                >
                  {[
                    [
                      'Card amount',
                      `${currency} ${parsedAmount.toFixed(2)}`,
                    ],
                    ['Quantity', quantity],
                    ['Card type', cardType],
                    [
                      'Order total',
                      `${currency} ${(parsedAmount * parsedQuantity).toFixed(2)}`,
                    ],
                    [
                      'Naira price / payout',
                      'Unavailable',
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '8px 0',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: '#748078' }}>
                        {label}
                      </span>

                      <strong
                        style={{
                          color: '#24543b',
                          textAlign: 'right',
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleProviderAction}
                  style={{
                    width: '100%',
                    minHeight: 52,
                    border: 'none',
                    borderRadius: 13,
                    background: GREEN,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'buy'
                    ? 'Check Provider Availability'
                    : 'Check Redemption Availability'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowReview(false);
                    setNotice('');
                  }}
                  style={{
                    width: '100%',
                    minHeight: 46,
                    border: 'none',
                    background: 'transparent',
                    color: GREEN,
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: 8,
                  }}
                >
                  Edit Details
                </button>
              </div>
            )}
          </>
        )}

        {/* TRANSACTION HISTORY */}

        {tab === 'history' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              Gift Card Transactions
            </h2>

            <p style={smallTextStyle}>
              View your gift card purchase and sale records.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 18,
              }}
            >
              {['All', 'Buy', 'Sell'].map((filter) => (
                <span
                  key={filter}
                  style={{
                    borderRadius: 20,
                    background: '#eff7f1',
                    color: GREEN,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {filter}
                </span>
              ))}
            </div>

            {transactions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 12px',
                  background: '#f7faf8',
                  borderRadius: 16,
                  border: '1px dashed #dce9e1',
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    marginBottom: 12,
                  }}
                >
                  <span role="img" aria-label="Gift">
                    🎁
                  </span>
                </div>

                <div
                  style={{
                    color: '#24543b',
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  No Gift Card Transactions
                </div>

                <div
                  style={{
                    color: '#748078',
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Your completed gift card transactions
                  will appear here after the provider and
                  transaction-history backend are connected.
                </div>

                <button
                  type="button"
                  onClick={() => setTab('trade')}
                  style={{
                    marginTop: 18,
                    minHeight: 44,
                    padding: '0 22px',
                    border: 'none',
                    borderRadius: 12,
                    background: GREEN,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Go to Gift Cards
                </button>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  style={{
                    padding: 14,
                    border: '1px solid #e1ebe4',
                    borderRadius: 13,
                    marginBottom: 12,
                  }}
                >
                  <strong>{transaction.brand}</strong>
                  <div>
                    {transaction.mode} · {transaction.currency}{' '}
                    {transaction.amount}
                  </div>
                  <small>{transaction.status}</small>
                </div>
              ))
            )}
          </div>
        )}

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
              color: GREEN,
              fontWeight: 900,
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
