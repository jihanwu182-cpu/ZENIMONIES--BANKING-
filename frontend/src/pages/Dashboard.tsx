import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  /*
   * Nigerian banks + payment institutions.
   * These are used for the "To Bank" search screen.
   */
  const banks = [
    'Access Bank',
    'Carbon',
    'Citibank Nigeria',
    'Ecobank Nigeria',
    'FairMoney',
    'Fidelity Bank',
    'First Bank of Nigeria',
    'First City Monument Bank (FCMB)',
    'Globus Bank',
    'GTBank',
    'Heritage Bank',
    'Jaiz Bank',
    'Keystone Bank',
    'Kuda Bank',
    'Moniepoint',
    'Opay',
    'Palmpay',
    'Parallex Bank',
    'Polaris Bank',
    'Premium Trust Bank',
    'Providus Bank',
    'Stanbic IBTC Bank',
    'Standard Chartered Bank',
    'Sterling Bank',
    'Taj Bank',
    'Titan Trust Bank',
    'Union Bank',
    'United Bank for Africa (UBA)',
    'Unity Bank',
    'Wema Bank',
    'Zenith Bank',
  ];

  const filteredBanks = useMemo(() => {
    const search = bankSearch.trim().toLowerCase();

    if (!search) {
      return banks;
    }

    return banks.filter((bank) =>
      bank.toLowerCase().includes(search)
    );
  }, [bankSearch]);

  const features: Feature[] = [
    {
      id: 'bank',
      title: 'To Bank',
      description: 'Send money to any bank',
      icon: '▥',
    },
    {
      id: 'withdraw',
      title: 'Withdraw',
      description: 'Withdraw funds',
      icon: '↗',
    },
    {
      id: 'airtime',
      title: 'Airtime',
      description: 'Buy airtime',
      icon: '▥',
    },
    {
      id: 'data',
      title: 'Data',
      description: 'Buy data',
      icon: '↕',
    },
    {
      id: 'betting',
      title: 'Betting',
      description: 'Fund your bets',
      icon: '⚽',
    },
    {
      id: 'tv',
      title: 'TV',
      description: 'Pay TV bills',
      icon: '▣',
    },
    {
      id: 'bill',
      title: 'Bills',
      description: 'Pay your bills',
      icon: '▤',
    },
    {
      id: 'safebox',
      title: 'SafeBox',
      description: 'Keep money secure',
      icon: '▣',
    },
    {
      id: 'more',
      title: 'More',
      description: 'More services',
      icon: '••',
    },
  ];

  const openFeature = (item: Feature) => {
    setFeature(item);
    setBankSearch('');
    setSelectedBank('');
  };

  const closeFeature = () => {
    setFeature(null);
    setBankSearch('');
    setSelectedBank('');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleKYC = () => {
    navigate('/kyc');
  };

  const handleTransactions = () => {
    /*
     * Transactions page is not currently registered in App.tsx.
     * For now we display it inside the dashboard instead of
     * sending the user to a missing route.
     */
    setFeature({
      id: 'transactions',
      title: 'Transactions',
      description: 'View your recent activity',
      icon: '↕',
    });
  };

  const handleWallet = () => {
    /*
     * Wallet page is also not currently registered in App.tsx.
     * Keep the user inside the dashboard until that page is created.
     */
    setFeature({
      id: 'wallet',
      title: 'Wallet',
      description: 'Manage your wallet',
      icon: '▣',
    });
  };

  return (
    <div className="zen-dashboard">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .zen-dashboard {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(16, 185, 129, 0.08),
              transparent 32%
            ),
            #f6faf8;
          color: #10231d;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding-bottom: 92px;
        }

        .zen-container {
          width: min(1100px, calc(100% - 32px));
          margin: 0 auto;
        }

        /* HEADER */

        .zen-header {
          height: 76px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #edf2ef;
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(14px);
        }

        .zen-header-inner {
          width: min(1100px, calc(100% - 32px));
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .zen-brand {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .zen-logo {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          background: linear-gradient(145deg, #12a86f, #07875a);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(5, 135, 90, 0.18);
        }

        .zen-brand-name {
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -0.7px;
          color: #102d25;
          line-height: 1;
        }

        .zen-brand-subtitle {
          margin-top: 4px;
          color: #9aa6a2;
          font-size: 11px;
          letter-spacing: 1.2px;
          font-weight: 600;
        }

        .zen-header-actions {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .zen-notification {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid #edf1ef;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          position: relative;
          cursor: pointer;
        }

        .zen-notification-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #e53935;
          border-radius: 50%;
          top: 8px;
          right: 9px;
          border: 2px solid white;
        }

        .zen-divider {
          width: 1px;
          height: 30px;
          background: #e4ebe8;
        }

        .zen-user {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          border: 0;
          background: transparent;
        }

        .zen-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #edf3f1;
          color: #0a7050;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
        }

        .zen-user-name {
          font-weight: 700;
          font-size: 15px;
        }

        .zen-chevron {
          color: #74827d;
          font-size: 17px;
        }

        /* WELCOME */

        .zen-welcome {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          padding: 38px 0 22px;
        }

        .zen-welcome-small {
          color: #7d8b86;
          font-size: 18px;
          margin-bottom: 2px;
        }

        .zen-welcome-name {
          margin: 0;
          font-size: clamp(32px, 5vw, 48px);
          line-height: 1.05;
          letter-spacing: -1.8px;
          color: #0e1820;
        }

        .zen-welcome-description {
          margin: 9px 0 0;
          color: #7b8984;
          font-size: 17px;
        }

        .zen-verification {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: #eaf9f2;
          color: #087151;
          border: 1px solid #c8eddd;
          border-radius: 999px;
          padding: 13px 20px;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
        }

        .zen-verification-dot {
          width: 10px;
          height: 10px;
          background: #079568;
          border-radius: 50%;
        }

        /* BALANCE */

        .zen-balance-card {
          min-height: 255px;
          border-radius: 25px;
          padding: 30px 34px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 92% 15%,
              rgba(37, 208, 143, 0.42),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              #075d45 0%,
              #087653 52%,
              #0aa16d 100%
            );
          box-shadow: 0 18px 38px rgba(5, 104, 72, 0.16);
        }

        .zen-balance-card::before {
          content: "";
          position: absolute;
          width: 450px;
          height: 450px;
          right: -180px;
          top: -250px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 50%;
        }

        .zen-balance-content {
          position: relative;
          z-index: 1;
        }

        .zen-balance-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .zen-balance-label {
          color: rgba(255,255,255,0.78);
          font-size: 17px;
          font-weight: 500;
        }

        .zen-balance-value {
          color: white;
          font-size: clamp(38px, 6vw, 57px);
          font-weight: 800;
          letter-spacing: -2px;
          margin-top: 7px;
        }

        .zen-hide {
          border: 1px solid rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.06);
          color: white;
          padding: 12px 18px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }

        .zen-balance-bottom {
          display: flex;
          justify-content: flex-end;
          margin-top: 23px;
        }

        .zen-add-money {
          min-width: 280px;
          border: none;
          background: white;
          color: #07563f;
          border-radius: 18px;
          padding: 15px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(0,0,0,0.08);
        }

        .zen-add-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .zen-plus {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #079966;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          line-height: 1;
        }

        .zen-arrow {
          font-size: 24px;
        }

        /* SERVICES */

        .zen-services {
          margin-top: 25px;
          background: white;
          border: 1px solid #edf2ef;
          border-radius: 25px;
          padding: 27px 25px 30px;
          box-shadow: 0 10px 30px rgba(16, 47, 36, 0.035);
        }

        .zen-services-title {
          margin: 0 0 22px 4px;
          color: #18362c;
          font-size: 18px;
          font-weight: 800;
        }

        .zen-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px 18px;
        }

        .zen-service {
          border: 0;
          background: transparent;
          text-align: center;
          cursor: pointer;
          padding: 4px;
          border-radius: 18px;
          transition: transform .18s ease, background .18s ease;
        }

        .zen-service:hover {
          transform: translateY(-3px);
          background: #f7fbf9;
        }

        .zen-service:active {
          transform: scale(.97);
        }

        .zen-service-icon {
          width: 78px;
          height: 78px;
          margin: 0 auto 10px;
          border-radius: 24px;
          background: #e9f8f2;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #079568;
          font-size: 31px;
          font-weight: 800;
        }

        .zen-service-title {
          color: #17251f;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .zen-service-description {
          color: #91a09a;
          font-size: 12px;
          line-height: 1.35;
        }

        /* KYC */

        .zen-kyc {
          margin-top: 23px;
          background: linear-gradient(110deg, #effbf6, #f9fffc);
          border: 1px solid #d9f1e6;
          border-radius: 23px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .zen-kyc-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .zen-kyc-icon {
          width: 60px;
          height: 60px;
          border-radius: 17px;
          background: #dff6ec;
          color: #079568;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 27px;
        }

        .zen-kyc-title {
          font-size: 17px;
          font-weight: 800;
          color: #134c3b;
        }

        .zen-kyc-text {
          margin-top: 4px;
          color: #80918a;
          font-size: 14px;
        }

        .zen-kyc-button {
          border: none;
          border-radius: 14px;
          background: #079568;
          color: white;
          padding: 14px 21px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        /* BOTTOM NAVIGATION */

        .zen-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 76px;
          background: rgba(255,255,255,0.97);
          border-top: 1px solid #e9efec;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 30;
          backdrop-filter: blur(15px);
        }

        .zen-bottom-inner {
          width: min(600px, 100%);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .zen-bottom-item {
          border: 0;
          background: transparent;
          color: #78857f;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .zen-bottom-item.active {
          color: #079568;
        }

        .zen-bottom-icon {
          font-size: 22px;
          line-height: 1;
        }

        /* MODAL */

        .zen-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 24, 18, 0.48);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 15px;
          backdrop-filter: blur(4px);
        }

        .zen-modal {
          width: min(560px, 100%);
          max-height: 88vh;
          overflow-y: auto;
          background: white;
          border-radius: 27px 27px 18px 18px;
          padding: 24px;
          box-shadow: 0 25px 70px rgba(0,0,0,.2);
          animation: zenSlide .2s ease;
        }

        @keyframes zenSlide {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .zen-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .zen-modal-heading {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .zen-modal-icon {
          width: 50px;
          height: 50px;
          border-radius: 15px;
          background: #e9f8f2;
          color: #079568;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
        }

        .zen-modal-title {
          margin: 0;
          font-size: 21px;
          color: #16372c;
        }

        .zen-modal-subtitle {
          margin: 3px 0 0;
          color: #899790;
          font-size: 13px;
        }

        .zen-close {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 0;
          background: #f1f5f3;
          color: #53625d;
          font-size: 21px;
          cursor: pointer;
        }

        .zen-input {
          width: 100%;
          border: 1px solid #dfe9e5;
          background: #f9fbfa;
          border-radius: 14px;
          padding: 14px 16px;
          outline: none;
          font-size: 15px;
          color: #19332a;
          margin-bottom: 15px;
        }

        .zen-input:focus {
          border-color: #079568;
          background: white;
        }

        .zen-bank-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .zen-bank {
          width: 100%;
          border: 1px solid #edf2ef;
          background: white;
          padding: 13px;
          border-radius: 13px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          color: #20372f;
        }

        .zen-bank:hover {
          border-color: #bde8d6;
          background: #f6fcf9;
        }

        .zen-bank-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #e9f8f2;
          color: #079568;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .zen-selected-bank {
          padding: 15px;
          border-radius: 14px;
          background: #eaf9f2;
          color: #086d50;
          font-weight: 700;
          margin-bottom: 15px;
        }

        .zen-primary-button {
          width: 100%;
          border: none;
          border-radius: 14px;
          background: #079568;
          color: white;
          padding: 15px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          margin-top: 5px;
        }

        .zen-info-box {
          background: #f6faf8;
          border: 1px solid #e9f0ed;
          border-radius: 16px;
          padding: 18px;
          color: #687872;
          line-height: 1.6;
          font-size: 14px;
        }

        /* MOBILE */

        @media (max-width: 700px) {
          .zen-container {
            width: min(100% - 24px, 560px);
          }

          .zen-header {
            height: 67px;
          }

          .zen-header-inner {
            width: calc(100% - 24px);
          }

          .zen-brand-name {
            font-size: 19px;
          }

          .zen-brand-subtitle {
            font-size: 9px;
          }

          .zen-logo {
            width: 40px;
            height: 40px;
            font-size: 21px;
          }

          .zen-notification {
            width: 36px;
            height: 36px;
          }

          .zen-user-name,
          .zen-divider {
            display: none;
          }

          .zen-avatar {
            width: 38px;
            height: 38px;
          }

          .zen-welcome {
            padding: 25px 0 17px;
            display: block;
          }

          .zen-welcome-small {
            font-size: 15px;
          }

          .zen-welcome-name {
            font-size: 36px;
          }

          .zen-welcome-description {
            font-size: 14px;
          }

          .zen-verification {
            margin-top: 15px;
            font-size: 12px;
            padding: 10px 14px;
          }

          .zen-balance-card {
            min-height: 215px;
            padding: 24px 21px;
            border-radius: 22px;
          }

          .zen-balance-label {
            font-size: 15px;
          }

          .zen-balance-value {
            font-size: 43px;
          }

          .zen-hide {
            padding: 9px 13px;
            font-size: 12px;
          }

          .zen-balance-bottom {
            justify-content: stretch;
          }

          .zen-add-money {
            width: 100%;
            min-width: 0;
          }

          .zen-services {
            padding: 20px 13px 23px;
            border-radius: 22px;
          }

          .zen-services-title {
            font-size: 16px;
          }

          .zen-service-grid {
            gap: 24px 8px;
          }

          .zen-service-icon {
            width: 62px;
            height: 62px;
            border-radius: 19px;
            font-size: 25px;
          }

          .zen-service-title {
            font-size: 14px;
          }

          .zen-service-description {
            font-size: 10px;
          }

          .zen-kyc {
            padding: 16px;
          }

          .zen-kyc-icon {
            width: 47px;
            height: 47px;
          }

          .zen-kyc-title {
            font-size: 14px;
          }

          .zen-kyc-text {
            font-size: 11px;
          }

          .zen-kyc-button {
            padding: 11px 13px;
            font-size: 11px;
          }

          .zen-bottom-nav {
            height: 69px;
          }

          .zen-overlay {
            padding: 0;
          }

          .zen-modal {
            border-radius: 25px 25px 0 0;
            max-height: 91vh;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="zen-header">
        <div className="zen-header-inner">
          <div className="zen-brand">
            <div className="zen-logo">Z</div>

            <div>
              <div className="zen-brand-name">
                Zenimonies
              </div>

              <div className="zen-brand-subtitle">
                DIGITAL BANKING
              </div>
            </div>
          </div>

          <div className="zen-header-actions">
            <button
              className="zen-notification"
              type="button"
              aria-label="Notifications"
              onClick={() =>
                alert('You have no new notifications.')
              }
            >
              ♧
              <span className="zen-notification-dot" />
            </button>

            <div className="zen-divider" />

            <button
              className="zen-user"
              type="button"
              onClick={handleProfile}
            >
              <div className="zen-avatar">H</div>

              <span className="zen-user-name">
                Harrison
              </span>

              <span className="zen-chevron">
                ˅
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="zen-container">
        {/* WELCOME */}
        <section className="zen-welcome">
          <div>
            <div className="zen-welcome-small">
              Welcome back,
            </div>

            <h1 className="zen-welcome-name">
              Harrison
            </h1>

            <p className="zen-welcome-description">
              Here's your financial overview.
            </p>
          </div>

          <div className="zen-verification">
            <span className="zen-verification-dot" />
            Email & phone verified
          </div>
        </section>

        {/* BALANCE */}
        <section className="zen-balance-card">
          <div className="zen-balance-content">
            <div className="zen-balance-top">
              <div>
                <div className="zen-balance-label">
                  Available Balance
                </div>

                <div className="zen-balance-value">
                  {balanceVisible ? '₦0.00' : '₦••••'}
                </div>
              </div>

              <button
                type="button"
                className="zen-hide"
                onClick={() =>
                  setBalanceVisible((value) => !value)
                }
              >
                {balanceVisible ? '◉ Hide' : '◉ Show'}
              </button>
            </div>

            <div className="zen-balance-bottom">
              <button
                type="button"
                className="zen-add-money"
                onClick={() =>
                  setFeature({
                    id: 'add-money',
                    title: 'Add Money',
                    description: 'Fund your Zenimonies account',
                    icon: '+',
                  })
                }
              >
                <span className="zen-add-left">
                  <span className="zen-plus">+</span>
                  <span>Add Money</span>
                </span>

                <span className="zen-arrow">›</span>
              </button>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="zen-services">
          <h2 className="zen-services-title">
            Services
          </h2>

          <div className="zen-service-grid">
            {features.map((item) => (
              <button
                key={item.id}
                type="button"
                className="zen-service"
                onClick={() => openFeature(item)}
              >
                <div className="zen-service-icon">
                  {item.icon}
                </div>

                <div className="zen-service-title">
                  {item.title}
                </div>

                <div className="zen-service-description">
                  {item.description}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* KYC */}
        <section className="zen-kyc">
          <div className="zen-kyc-left">
            <div className="zen-kyc-icon">
              ✓
            </div>

            <div>
              <div className="zen-kyc-title">
                Account Verification
              </div>

              <div className="zen-kyc-text">
                Complete your KYC to increase your limits.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="zen-kyc-button"
            onClick={handleKYC}
          >
            View Verification&nbsp; ›
          </button>
        </section>
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="zen-bottom-nav">
        <div className="zen-bottom-inner">
          <button
            type="button"
            className="zen-bottom-item active"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="zen-bottom-icon">⌂</span>
            <span>Home</span>
          </button>

          <button
            type="button"
            className="zen-bottom-item"
            onClick={handleTransactions}
          >
            <span className="zen-bottom-icon">↕</span>
            <span>Transactions</span>
          </button>

          <button
            type="button"
            className="zen-bottom-item"
            onClick={handleWallet}
          >
            <span className="zen-bottom-icon">▣</span>
            <span>Wallet</span>
          </button>

          <button
            type="button"
            className="zen-bottom-item"
            onClick={handleProfile}
          >
            <span className="zen-bottom-icon">♙</span>
            <span>Profile</span>
          </button>
        </div>
      </nav>

      {/* FEATURE MODAL */}
      {feature && (
        <div
          className="zen-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeFeature();
            }
          }}
        >
          <div className="zen-modal">
            <div className="zen-modal-header">
              <div className="zen-modal-heading">
                <div className="zen-modal-icon">
                  {feature.icon}
                </div>

                <div>
                  <h2 className="zen-modal-title">
                    {feature.title}
                  </h2>

                  <p className="zen-modal-subtitle">
                    {feature.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="zen-close"
                onClick={closeFeature}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* TO BANK */}
            {feature.id === 'bank' && (
              <>
                <input
                  className="zen-input"
                  type="text"
                  placeholder="Search for a bank..."
                  value={bankSearch}
                  onChange={(event) =>
                    setBankSearch(event.target.value)
                  }
                />

                {selectedBank && (
                  <div className="zen-selected-bank">
                    Selected bank: {selectedBank}
                  </div>
                )}

                <div className="zen-bank-list">
                  {filteredBanks.map((bank) => (
                    <button
                      type="button"
                      key={bank}
                      className="zen-bank"
                      onClick={() => setSelectedBank(bank)}
                    >
                      <span className="zen-bank-logo">
                        {bank.charAt(0)}
                      </span>

                      <span>{bank}</span>

                      <span style={{ marginLeft: 'auto' }}>
                        ›
                      </span>
                    </button>
                  ))}
                </div>

                {selectedBank && (
                  <button
                    type="button"
                    className="zen-primary-button"
                    onClick={() =>
                      alert(
                        `Continue transfer to ${selectedBank}`
                      )
                    }
                  >
                    Continue
                  </button>
                )}
              </>
            )}

            {/* ADD MONEY */}
            {feature.id === 'add-money' && (
              <div className="zen-info-box">
                <strong>Add Money</strong>
                <br />
                <br />
                Choose how you want to fund your
                Zenimonies account.
                <br />
                <br />

                <button
                  type="button"
                  className="zen-primary-button"
                  onClick={() =>
                    alert('Add money options will open here.')
                  }
                >
                  Continue
                </button>
              </div>
            )}

            {/* OTHER SERVICES */}
            {[
              'withdraw',
              'airtime',
              'data',
              'betting',
              'tv',
              'bill',
              'safebox',
              'more',
              'transactions',
              'wallet',
            ].includes(feature.id) && (
              <div className="zen-info-box">
                <strong>
                  {feature.title}
                </strong>

                <br />
                <br />

                {feature.description}.

                <br />
                <br />

                This section is ready for the
                {feature.title.toLowerCase()} functionality.
                
                <button
                  type="button"
                  className="zen-primary-button"
                  onClick={() =>
                    alert(
                      `${feature.title} service selected.`
                    )
                  }
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
