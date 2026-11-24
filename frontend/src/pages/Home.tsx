
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#00A83E';
const DARK_GREEN = '#07552F';
const DARK = '#14251B';
const MUTED = '#68756C';
const BORDER = '#E6ECE7';
const LIGHT = '#F7FAF7';

const services = [
  {
    icon: '↗',
    title: 'Bank Transfers',
    description: 'Send money through supported transfer services for everyday financial needs.',
  },
  {
    icon: '▤',
    title: 'Airtime & Data',
    description: 'Purchase airtime and mobile data through the ZENIMONIES platform.',
  },
  {
    icon: 'ϟ',
    title: 'Electricity Payments',
    description: 'Pay supported electricity bills with a convenient digital experience.',
  },
  {
    icon: '▣',
    title: 'TV Subscriptions',
    description: 'Manage supported television subscription payments.',
  },
  {
    icon: '▥',
    title: 'Business Banking',
    description: 'Digital banking services designed for business activities.',
  },
  {
    icon: '▦',
    title: 'POS Services',
    description: 'Explore POS payment solutions for eligible business customers.',
  },
];

const Home: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);

  return (
    <div className="zm-site">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
        }

        .zm-site {
          min-height: 100vh;
          overflow: hidden;
          background: #fff;
          color: ${DARK};
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Arial, sans-serif;
        }

        .zm-container {
          width: min(1200px, calc(100% - 64px));
          margin: 0 auto;
        }

        a {
          -webkit-tap-highlight-color: transparent;
        }

        /* HEADER */

        .zm-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid ${BORDER};
          backdrop-filter: blur(16px);
        }

        .zm-nav {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        .zm-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: ${DARK};
          text-decoration: none;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -1px;
          white-space: nowrap;
        }

        .zm-brand-symbol {
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: ${GREEN};
          color: white;
          font-size: 23px;
          font-weight: 900;
        }

        .zm-nav-links {
          display: flex;
          align-items: center;
          gap: 27px;
        }

        .zm-nav-links a {
          color: #46544A;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          transition: color .2s ease;
        }

        .zm-nav-links a:hover {
          color: ${GREEN};
        }

        .zm-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .zm-signin {
          color: ${DARK};
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
        }

        .zm-nav-cta,
        .zm-primary-button {
          min-height: 47px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 21px;
          border: 1px solid ${GREEN};
          border-radius: 7px;
          background: ${GREEN};
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: .2s ease;
        }

        .zm-nav-cta:hover,
        .zm-primary-button:hover {
          background: ${DARK_GREEN};
          border-color: ${DARK_GREEN};
          transform: translateY(-2px);
        }

        .zm-menu-button {
          display: none;
          width: 43px;
          height: 43px;
          border: 1px solid ${BORDER};
          border-radius: 9px;
          background: white;
          color: ${DARK};
          font-size: 22px;
          cursor: pointer;
        }

        .zm-mobile-nav {
          display: none;
          padding: 8px 24px 18px;
          border-top: 1px solid ${BORDER};
          background: white;
        }

        .zm-mobile-nav.open {
          display: grid;
        }

        .zm-mobile-nav a {
          padding: 13px 4px;
          border-bottom: 1px solid ${BORDER};
          color: ${DARK};
          text-decoration: none;
          font-size: 14px;
          font-weight: 650;
        }

        /* HERO */

        .zm-hero {
          position: relative;
          padding: 82px 0 85px;
          background:
            radial-gradient(
              circle at 82% 42%,
              rgba(0,168,62,.075),
              transparent 35%
            ),
            #fff;
        }

        .zm-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 65px;
        }

        .zm-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .zm-eyebrow::before {
          content: "";
          width: 26px;
          height: 2px;
          background: ${GREEN};
        }

        .zm-hero h1 {
          max-width: 590px;
          margin: 23px 0 20px;
          color: ${DARK};
          font-size: clamp(44px, 5.3vw, 68px);
          line-height: 1.07;
          letter-spacing: -3px;
          font-weight: 850;
        }

        .zm-hero h1 span {
          color: ${GREEN};
        }

        .zm-hero-description {
          max-width: 510px;
          color: ${MUTED};
          font-size: 15px;
          line-height: 1.95;
        }

        .zm-hero-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 13px;
          margin-top: 30px;
        }

        .zm-secondary-button {
          min-height: 47px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 21px;
          border: 1px solid #CFD9D1;
          border-radius: 7px;
          background: white;
          color: ${DARK};
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          transition: .2s ease;
        }

        .zm-secondary-button:hover {
          border-color: ${GREEN};
          color: ${GREEN};
        }

        .zm-hero-note {
          margin-top: 22px;
          color: #8A958D;
          font-size: 11px;
        }

        /* PHONE SHOWCASE */

        .zm-phone-stage {
          position: relative;
          min-height: 650px;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }

        .zm-phone-glow {
          position: absolute;
          z-index: -1;
          width: 470px;
          height: 470px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            #E5F5E9 0%,
            rgba(229,245,233,.45) 55%,
            transparent 72%
          );
        }

        .zm-phone {
          position: relative;
          width: 302px;
          height: 620px;
          padding: 9px;
          border: 2px solid #26332B;
          border-radius: 43px;
          background: #151C18;
          box-shadow:
            0 30px 70px rgba(17,43,25,.20),
            0 8px 18px rgba(17,43,25,.12);
          transform: rotate(-3deg);
        }

        .zm-phone::before {
          content: "";
          position: absolute;
          top: 145px;
          left: -5px;
          width: 3px;
          height: 65px;
          border-radius: 4px 0 0 4px;
          background: #344139;
        }

        .zm-phone::after {
          content: "";
          position: absolute;
          top: 175px;
          right: -5px;
          width: 3px;
          height: 85px;
          border-radius: 0 4px 4px 0;
          background: #344139;
        }

        .zm-phone-screen {
          height: 100%;
          overflow: hidden;
          position: relative;
          border-radius: 34px;
          background: #fff;
        }

        .zm-phone-status {
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 19px;
          color: #1A2920;
          font-size: 9px;
          font-weight: 850;
        }

        .zm-phone-island {
          position: absolute;
          top: 7px;
          left: 50%;
          width: 83px;
          height: 19px;
          transform: translateX(-50%);
          border-radius: 20px;
          background: #101713;
        }

        .zm-phone-app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 15px 12px;
          border-bottom: 1px solid #EDF1ED;
        }

        .zm-phone-logo {
          color: ${DARK};
          font-size: 12px;
          font-weight: 950;
          letter-spacing: -.5px;
        }

        .zm-phone-logo span {
          color: ${GREEN};
        }

        .zm-phone-header-icons {
          display: flex;
          gap: 7px;
        }

        .zm-phone-header-icons span {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: 1px solid #E7ECE8;
          border-radius: 50%;
          color: #47554B;
          font-size: 11px;
        }

        .zm-phone-content {
          padding: 12px 13px 0;
        }

        .zm-phone-welcome {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 13px;
        }

        .zm-phone-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #EAF7ED;
          color: ${GREEN};
          font-size: 13px;
          font-weight: 900;
        }

        .zm-phone-welcome small {
          display: block;
          color: #89948C;
          font-size: 8px;
        }

        .zm-phone-welcome strong {
          display: block;
          margin-top: 3px;
          color: ${DARK};
          font-size: 11px;
        }

        .zm-phone-balance {
          padding: 15px;
          border-radius: 11px;
          background: linear-gradient(
            125deg,
            #078F40,
            #07582F
          );
          color: white;
          box-shadow: 0 8px 18px rgba(7,100,48,.16);
        }

        .zm-phone-balance-top,
        .zm-phone-balance-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .zm-phone-balance-top {
          color: rgba(255,255,255,.83);
          font-size: 9px;
        }

        .zm-phone-balance-value {
          display: block;
          margin: 13px 0;
          font-size: 23px;
          letter-spacing: 1px;
        }

        .zm-phone-balance-bottom {
          color: rgba(255,255,255,.85);
          font-size: 8px;
        }

        .zm-phone-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0 10px;
          color: ${DARK};
          font-size: 10px;
          font-weight: 850;
        }

        .zm-phone-section-title span:last-child {
          color: ${GREEN};
          font-size: 8px;
        }

        .zm-phone-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px 5px;
        }

        .zm-phone-action {
          text-align: center;
          color: #526057;
          font-size: 7px;
          font-weight: 650;
        }

        .zm-phone-action-icon {
          width: 33px;
          height: 33px;
          display: grid;
          place-items: center;
          margin: 0 auto 5px;
          border-radius: 10px;
          background: #F0F7F1;
          color: ${GREEN};
          font-size: 15px;
          font-weight: 850;
        }

        .zm-phone-verification {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          padding: 9px;
          border: 1px solid #E7EEE8;
          border-radius: 9px;
          background: #FBFDFB;
        }

        .zm-phone-verification-icon {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #EAF7ED;
          color: ${GREEN};
          font-size: 11px;
        }

        .zm-phone-verification strong {
          display: block;
          color: ${DARK};
          font-size: 8px;
        }

        .zm-phone-verification small {
          display: block;
          margin-top: 3px;
          color: #8A958D;
          font-size: 7px;
        }

        .zm-phone-transactions {
          padding: 12px 7px;
          border: 1px solid #E9EEE9;
          border-radius: 8px;
          text-align: center;
        }

        .zm-phone-transactions strong {
          display: block;
          color: #59665D;
          font-size: 8px;
        }

        .zm-phone-transactions small {
          display: block;
          margin-top: 4px;
          color: #929C94;
          font-size: 7px;
        }

        .zm-phone-bottom-nav {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          padding: 10px 5px 15px;
          border-top: 1px solid #EDF1ED;
          background: white;
        }

        .zm-phone-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: #879188;
          font-size: 7px;
        }

        .zm-phone-tab span {
          font-size: 14px;
        }

        .zm-phone-tab.active {
          color: ${GREEN};
          font-weight: 850;
        }

        .zm-phone-caption {
          position: absolute;
          right: -45px;
          bottom: 85px;
          padding: 13px 16px;
          border: 1px solid ${BORDER};
          border-radius: 10px;
          background: white;
          box-shadow: 0 12px 30px rgba(20,45,28,.09);
          transform: rotate(3deg);
        }

        .zm-phone-caption strong {
          display: block;
          color: ${DARK};
          font-size: 10px;
        }

        .zm-phone-caption small {
          display: block;
          margin-top: 5px;
          color: ${MUTED};
          font-size: 8px;
        }

        /* GENERAL SECTION STYLES */

        .zm-section {
          padding: 92px 0;
        }

        .zm-section-light {
          background: ${LIGHT};
        }

        .zm-section-heading {
          max-width: 720px;
          margin: 0 auto 45px;
          text-align: center;
        }

        .zm-kicker {
          color: ${GREEN};
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .zm-section-heading h2 {
          margin: 15px 0;
          color: ${DARK};
          font-size: clamp(31px, 4vw, 45px);
          line-height: 1.16;
          letter-spacing: -1.8px;
        }

        .zm-section-heading p {
          margin: 0;
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.9;
        }

        /* RESPONSIVE */

        @media (max-width: 1050px) {
          .zm-nav-links {
            gap: 15px;
          }

          .zm-hero-grid {
            gap: 30px;
          }

          .zm-phone-caption {
            right: -12px;
          }
        }

        @media (max-width: 760px) {
          .zm-container {
            width: calc(100% - 38px);
          }

          .zm-nav {
            min-height: 70px;
          }

          .zm-nav-links,
          .zm-nav-actions {
            display: none;
          }

          .zm-menu-button {
            display: block;
          }

          .zm-hero {
            padding: 55px 0 40px;
          }

          .zm-hero-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .zm-hero h1 {
            max-width: 580px;
            font-size: clamp(39px, 9.5vw, 56px);
            letter-spacing: -2px;
          }

          .zm-hero-description {
            font-size: 14px;
          }

          .zm-phone-stage {
            min-height: 630px;
          }

          .zm-phone {
            transform: scale(.91) rotate(-2deg);
          }

          .zm-phone-caption {
            right: -4px;
            bottom: 45px;
          }

          .zm-section {
            padding: 65px 0;
          }
        }

        @media (max-width: 390px) {
          .zm-container {
            width: calc(100% - 28px);
          }

          .zm-brand {
            font-size: 18px;
          }

          .zm-phone {
            transform: scale(.84) rotate(-2deg);
          }

          .zm-phone-stage {
            min-height: 590px;
          }

          .zm-phone-caption {
            right: -3px;
            bottom: 22px;
          }
        }
      `}</style>

      {/* HEADER */}

      <header className="zm-header">
        <div className="zm-container zm-nav">
          <Link to="/" className="zm-brand">
            <span className="zm-brand-symbol">Z</span>
            ZENIMONIES
          </Link>

          <nav className="zm-nav-links">
            <a href="#personal">Personal</a>
            <a href="#business">Business</a>
            <a href="#services">Services</a>
            <Link to="/about">Company</Link>
            <a href="#security">Security</a>
          </nav>

          <div className="zm-nav-actions">
            <Link to="/login" className="zm-signin">
              Sign In
            </Link>
            <Link to="/register" className="zm-nav-cta">
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="zm-menu-button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? '×' : '☰'}
          </button>
        </div>

        <nav className={`zm-mobile-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#personal" onClick={() => setMenuOpen(false)}>Personal Banking</a>
          <a href="#business" onClick={() => setMenuOpen(false)}>Business Banking</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <Link to="/about" onClick={() => setMenuOpen(false)}>Company</Link>
          <a href="#security" onClick={() => setMenuOpen(false)}>Security</a>
          <Link to="/login">Sign In</Link>
          <Link to="/register">Open an Account</Link>
        </nav>
      </header>

      <main>
        {/* HERO */}

        <section className="zm-hero">
          <div className="zm-container zm-hero-grid">
            <div>
              <div className="zm-eyebrow">
                Banking for everyday life
              </div>

              <h1>
                Your money.
                Your everyday.
                <span> Made simpler.</span>
              </h1>

              <p className="zm-hero-description">
                Discover ZENIMONIES, a digital banking platform
                bringing everyday banking and payment services
                together for individuals and businesses in Nigeria.
              </p>

              <div className="zm-hero-actions">
                <Link to="/register" className="zm-primary-button">
                  Open an Account&nbsp; →
                </Link>

                <a href="#services" className="zm-secondary-button">
                  Explore Services
                </a>
              </div>

              <p className="zm-hero-note">
                Personal banking. Business banking. Digital payments.
              </p>
            </div>

            {/* REALISTIC PHONE MOCKUP */}

            <div className="zm-phone-stage">
              <div className="zm-phone-glow" />

              <div className="zm-phone">
                <div className="zm-phone-screen">
                  <div className="zm-phone-status">
                    <span>9:41</span>
                    <span>● ● ●</span>
                  </div>

                  <div className="zm-phone-island" />

                  <div className="zm-phone-app-header">
                    <div className="zm-phone-logo">
                      <span>ZENI</span>MONIES
                    </div>

                    <div className="zm-phone-header-icons">
                      <span>♧</span>
                      <span>?</span>
                    </div>
                  </div>

                  <div className="zm-phone-content">
                    <div className="zm-phone-welcome">
                      <div className="zm-phone-avatar">C</div>
                      <div>
                        <small>Welcome back,</small>
                        <strong>Customer</strong>
                      </div>
                    </div>

                    <div className="zm-phone-balance">
                      <div className="zm-phone-balance-top">
                        <span>Available Balance</span>
                        <button
                          type="button"
                          onClick={() => setBalanceVisible(!balanceVisible)}
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: 10,
                          }}
                          aria-label="Toggle balance visibility"
                        >
                          {balanceVisible ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      <strong className="zm-phone-balance-value">
                        {balanceVisible ? '₦ ••••••' : '₦ ••••••'}
                      </strong>

                      <div className="zm-phone-balance-bottom">
                        <span>Personal Account</span>
                        <span>NGN</span>
                      </div>
                    </div>

                    <div className="zm-phone-verification">
                      <div className="zm-phone-verification-icon">✓</div>
                      <div>
                        <strong>Account Verification</strong>
                        <small>Manage your verification status</small>
                      </div>
                    </div>

                    <div className="zm-phone-section-title">
                      <span>Quick Actions</span>
                      <span>View all</span>
                    </div>

                    <div className="zm-phone-actions">
                      {[
                        ['＋', 'Add Money'],
                        ['↗', 'Transfer'],
                        ['↓', 'Withdraw'],
                        ['▤', 'Pay Bills'],
                        ['▣', 'Airtime'],
                        ['◉', 'Data'],
                        ['ϟ', 'Electricity'],
                        ['•••', 'More'],
                      ].map(([icon, label]) => (
                        <div className="zm-phone-action" key={label}>
                          <div className="zm-phone-action-icon">{icon}</div>
                          {label}
                        </div>
                      ))}
                    </div>

                    <div className="zm-phone-section-title">
                      <span>Recent Transactions</span>
                      <span>See all</span>
                    </div>

                    <div className="zm-phone-transactions">
                      <strong>No transactions yet</strong>
                      <small>Your transactions will appear here.</small>
                    </div>
                  </div>

                  <div className="zm-phone-bottom-nav">
                    <div className="zm-phone-tab active">
                      <span>⌂</span>Home
                    </div>
                    <div className="zm-phone-tab">
                      <span>▣</span>Cards
                    </div>
                    <div className="zm-phone-tab">
                      <span>⇄</span>Payments
                    </div>
                    <div className="zm-phone-tab">
                      <span>◷</span>History
                    </div>
                    <div className="zm-phone-tab">
                      <span>◎</span>Profile
                    </div>
                  </div>
                </div>
              </div>

              <div className="zm-phone-caption">
                <strong>The ZENIMONIES experience</strong>
                <small>Illustrative mobile app preview</small>
              </div>
            </div>
          </div>
        </section>

        <style>{`
          .section { padding: 88px 6%; }
          .section-inner { max-width: 1160px; margin: 0 auto; }
          .section-heading { max-width: 690px; margin-bottom: 38px; }
          .eyebrow { color: ${GREEN}; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 13px; }
          .section-heading h2 { color: ${DARK}; font-size: clamp(29px, 4vw, 43px); line-height: 1.16; letter-spacing: -1.4px; margin: 0 0 15px; }
          .section-heading p { color: ${MUTED}; font-size: 16px; line-height: 1.8; margin: 0; }
          .personal-section { background: #fff; }
          .personal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; }
          .feature-panel { border: 1px solid ${BORDER}; border-radius: 20px; padding: 30px; background: #fff; }
          .feature-panel h3 { color: ${DARK}; font-size: 22px; margin: 0 0 12px; }
          .feature-panel p { color: ${MUTED}; line-height: 1.8; margin: 0 0 20px; }
          .feature-list { display: grid; gap: 13px; padding: 0; margin: 0; list-style: none; }
          .feature-list li { display: flex; gap: 11px; align-items: flex-start; color: ${DARK}; font-size: 14px; line-height: 1.6; }
          .feature-check { color: ${GREEN}; font-weight: 900; }
          .text-link { color: ${DARK_GREEN}; text-decoration: none; font-weight: 800; display: inline-flex; margin-top: 22px; }
          .business-section { background: ${LIGHT}; }
          .business-panel { display: grid; grid-template-columns: 1.05fr .95fr; gap: 35px; align-items: center; padding: 38px; background: #fff; border: 1px solid ${BORDER}; border-radius: 22px; }
          .business-panel h3 { color: ${DARK}; font-size: 27px; line-height: 1.2; margin: 0 0 14px; }
          .business-panel p { color: ${MUTED}; line-height: 1.8; }
          .business-visual { border-radius: 17px; background: #F2F7F2; padding: 25px; }
          .business-visual-card { background: white; border: 1px solid ${BORDER}; padding: 19px; border-radius: 13px; margin-bottom: 12px; }
          .business-visual-card:last-child { margin-bottom: 0; }
          .business-visual-card strong { display: block; color: ${DARK}; margin-bottom: 6px; }
          .business-visual-card span { color: ${MUTED}; font-size: 13px; line-height: 1.6; }
          .services-section { background: #fff; }
          .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .service-card { border: 1px solid ${BORDER}; border-radius: 17px; padding: 24px; background: #fff; transition: border-color .2s, transform .2s; }
          .service-card:hover { border-color: ${GREEN}; transform: translateY(-3px); }
          .service-icon { width: 43px; height: 43px; display: grid; place-items: center; border-radius: 13px; background: #EAF7EE; color: ${DARK_GREEN}; font-size: 19px; margin-bottom: 18px; }
          .service-card h3 { color: ${DARK}; font-size: 17px; margin: 0 0 9px; }
          .service-card p { color: ${MUTED}; font-size: 14px; line-height: 1.7; margin: 0; }
          .company-section { background: ${LIGHT}; }
          .company-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; align-items: start; }
          .company-copy h2 { color: ${DARK}; font-size: clamp(29px, 4vw, 40px); line-height: 1.2; letter-spacing: -1px; margin: 0 0 17px; }
          .company-copy p { color: ${MUTED}; line-height: 1.85; margin: 0 0 15px; }
          .values-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
          .value-card { background: #fff; border: 1px solid ${BORDER}; border-radius: 15px; padding: 21px; }
          .value-card strong { display: block; color: ${DARK}; margin-bottom: 8px; }
          .value-card span { color: ${MUTED}; font-size: 13px; line-height: 1.65; }
          .security-section { background: #fff; }
          .security-content { display: grid; grid-template-columns: .85fr 1.15fr; gap: 35px; align-items: center; }
          .security-content h2 { color: ${DARK}; font-size: clamp(29px, 4vw, 40px); line-height: 1.2; margin: 0 0 15px; }
          .security-content p { color: ${MUTED}; line-height: 1.8; }
          .security-points { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
          .security-point { border: 1px solid ${BORDER}; border-radius: 15px; padding: 20px; }
          .security-point strong { color: ${DARK}; display: block; margin-bottom: 7px; }
          .security-point span { color: ${MUTED}; font-size: 13px; line-height: 1.6; }
          .contact-section { background: ${LIGHT}; padding: 70px 6%; }
          .contact-panel { max-width: 1160px; margin: 0 auto; background: #fff; border: 1px solid ${BORDER}; border-radius: 21px; padding: 38px; display: flex; justify-content: space-between; align-items: center; gap: 25px; }
          .contact-panel h2 { color: ${DARK}; font-size: 29px; margin: 0 0 10px; }
          .contact-panel p { color: ${MUTED}; line-height: 1.7; margin: 0; }
          .contact-actions { display: flex; flex-wrap: wrap; gap: 11px; }
          .footer { background: #14251B; color: #fff; padding: 48px 6% 25px; }
          .footer-inner { max-width: 1160px; margin: 0 auto; }
          .footer-top { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 35px; padding-bottom: 35px; }
          .footer-brand { font-size: 23px; font-weight: 900; letter-spacing: -.7px; margin-bottom: 13px; }
          .footer-brand span { color: #55D486; }
          .footer p { color: #C1CDC4; font-size: 14px; line-height: 1.8; max-width: 360px; }
          .footer h4 { margin: 0 0 15px; font-size: 14px; }
          .footer-links { display: grid; gap: 11px; }
          .footer-links a { color: #C1CDC4; text-decoration: none; font-size: 14px; }
          .footer-links a:hover { color: #fff; }
          .footer-bottom { border-top: 1px solid #34483A; padding-top: 20px; color: #AAB9AE; font-size: 12px; display: flex; justify-content: space-between; gap: 15px; flex-wrap: wrap; }
          @media (max-width: 760px) {
            .section { padding: 62px 6%; }
            .personal-grid, .business-panel, .company-grid, .security-content { grid-template-columns: 1fr; }
            .services-grid { grid-template-columns: 1fr 1fr; }
            .business-panel { padding: 23px; }
            .contact-panel { padding: 27px; align-items: flex-start; flex-direction: column; }
            .footer-top { grid-template-columns: 1fr 1fr; }
            .footer-top > div:first-child { grid-column: 1 / -1; }
          }
          @media (max-width: 430px) {
            .services-grid, .values-grid, .security-points { grid-template-columns: 1fr; }
            .feature-panel { padding: 23px; }
            .footer-top { grid-template-columns: 1fr; }
            .footer-top > div:first-child { grid-column: auto; }
          }
        `}</style>

        <section className="section personal-section" id="personal">
          <div className="section-inner">
            <div className="section-heading">
              <div className="eyebrow">Personal banking</div>
              <h2>Everyday banking, made more convenient.</h2>
              <p>
                Manage everyday payments and essential financial services
                through the ZENIMONIES mobile banking experience.
              </p>
            </div>

            <div className="personal-grid">
              <div className="feature-panel">
                <h3>Take care of everyday payments</h3>
                <p>
                  Access essential services from one place, with a simple
                  experience designed around your daily financial needs.
                </p>
                <ul className="feature-list">
                  <li><span className="feature-check">✓</span> Bank transfers and payment activity</li>
                  <li><span className="feature-check">✓</span> Airtime and mobile data purchases</li>
                  <li><span className="feature-check">✓</span> Electricity and TV subscription payments</li>
                  <li><span className="feature-check">✓</span> Access to available account services</li>
                </ul>
                <Link className="text-link" to="/register">Get started →</Link>
              </div>

              <div className="feature-panel">
                <h3>A clear view of your account</h3>
                <p>
                  Keep your account information and available services
                  together in a mobile experience designed to be easy to use.
                </p>
                <ul className="feature-list">
                  <li><span className="feature-check">✓</span> Personal account dashboard</li>
                  <li><span className="feature-check">✓</span> Account verification journey</li>
                  <li><span className="feature-check">✓</span> Recent transaction activity</li>
                  <li><span className="feature-check">✓</span> Convenient access to payment services</li>
                </ul>
                <Link className="text-link" to="/login">Access your account →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section business-section" id="business">
          <div className="section-inner">
            <div className="section-heading">
              <div className="eyebrow">Business banking</div>
              <h2>Support for the way your business operates.</h2>
              <p>
                ZENIMONIES Business is designed to bring everyday business
                account access and payment services into one experience.
              </p>
            </div>

            <div className="business-panel">
              <div>
                <h3>Manage business payments with greater convenience.</h3>
                <p>
                  Access business banking features through a dedicated
                  business experience, with services designed for business
                  account holders.
                </p>
                <ul className="feature-list">
                  <li><span className="feature-check">✓</span> Business account dashboard</li>
                  <li><span className="feature-check">✓</span> Business payment and transfer services</li>
                  <li><span className="feature-check">✓</span> Business verification journey</li>
                  <li><span className="feature-check">✓</span> POS terminal application pathway</li>
                </ul>
                <Link className="text-link" to="/register">Explore getting started →</Link>
              </div>

              <div className="business-visual">
                <div className="business-visual-card">
                  <strong>Business account</strong>
                  <span>Access your business banking dashboard and available services.</span>
                </div>
                <div className="business-visual-card">
                  <strong>Payment services</strong>
                  <span>Manage supported transfers and everyday business payments.</span>
                </div>
                <div className="business-visual-card">
                  <strong>POS services</strong>
                  <span>Apply for a POS terminal separately from business dashboard access. Approval is subject to the applicable process.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="section-inner">
            <div className="section-heading">
              <div className="eyebrow">Our services</div>
              <h2>Essential services in one place.</h2>
              <p>
                Explore the services available through the ZENIMONIES
                platform for personal and business customers.
              </p>
            </div>

            <div className="services-grid">
              {services.map((service, index) => (
                <div className="service-card" key={service.title}>
                  <div className="service-icon">
                    {["↗", "▤", "ϟ", "▣", "⌂", "▰"][index]}
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

   
<section className="section company-section" id="company">
  <div className="section-inner company-grid">
    <div className="company-copy">
      <div className="eyebrow">ABOUT ZENIMONIES</div>

      <h2>
        Delivering a more seamless digital banking experience.
      </h2>

      <p>
        ZENIMONIES is a digital banking platform committed to making
        everyday financial services more accessible, convenient and
        straightforward for individuals and businesses across Nigeria.
      </p>

      <p>
        Through a unified digital experience, we bring essential
        account and payment services together, helping customers
        manage their everyday financial needs with greater ease.
      </p>

      <Link className="text-link" to="/about">
        Learn more about our company →
      </Link>
    </div>

    <div className="values-grid">
      <div className="value-card">
        <strong>Convenience</strong>
        <span>
          Access essential account and payment services through
          a single, straightforward digital experience.
        </span>
      </div>

      <div className="value-card">
        <strong>Clarity</strong>
        <span>
          Navigate financial services and account information
          through clear, intuitive digital interfaces.
        </span>
      </div>

      <div className="value-card">
        <strong>Accessibility</strong>
        <span>
          Deliver practical digital financial services designed
          around the needs of individuals and businesses.
        </span>
      </div>

      <div className="value-card">
        <strong>Responsibility</strong>
        <span>
          Promote informed account use, appropriate verification
          and responsible access to financial services.
        </span>
      </div>
    </div>
  </div>
</section>


        <section className="section security-section" id="security">
          <div className="section-inner security-content">
            <div>
              <div className="eyebrow">Account protection</div>
              <h2>Your account deserves careful attention.</h2>
              <p>
                Account verification and responsible use are important parts
                of the ZENIMONIES experience. Customers should keep their
                sign-in details private and review transaction information
                carefully.
              </p>
              <Link className="text-link" to="/about">Learn more about ZENIMONIES →</Link>
            </div>

            <div className="security-points">
              <div className="security-point">
                <strong>Account verification</strong>
                <span>Verification steps help establish customer account information.</span>
              </div>
              <div className="security-point">
                <strong>Protect your sign-in</strong>
                <span>Keep your password and account access details confidential.</span>
              </div>
              <div className="security-point">
                <strong>Review transactions</strong>
                <span>Check transaction details and report activity you do not recognise.</span>
              </div>
              <div className="security-point">
                <strong>Use official channels</strong>
                <span>Access your account through the official ZENIMONIES platform.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-panel">
            <div>
              <div className="eyebrow">Get started</div>
              <h2>Make everyday banking simpler.</h2>
              <p>
                Ready to explore ZENIMONIES? Create an account or learn
                more about the company and its services.
              </p>
            </div>
            <div className="contact-actions">
              <Link className="primary-button" to="/register">Create an account</Link>
              <Link className="secondary-button" to="/about">About ZENIMONIES</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand">ZENI<span>MONIES</span></div>
              <p>
                A digital banking platform focused on convenient everyday
                financial services for individuals and businesses in Nigeria.
              </p>
            </div>

            <div>
              <h4>Explore</h4>
              <div className="footer-links">
                <a href="#personal">Personal Banking</a>
                <a href="#business">Business Banking</a>
                <a href="#services">Our Services</a>
                <a href="#security">Account Protection</a>
              </div>
            </div>

            <div>
              <h4>Account</h4>
              <div className="footer-links">
                <Link to="/about">About Us</Link>
                <Link to="/login">Sign In</Link>
                <Link to="/register">Create Account</Link>
                <a href="#contact">Get Started</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} ZENIMONIES. All rights reserved.</span>
            <span>Digital banking services in Nigeria.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
