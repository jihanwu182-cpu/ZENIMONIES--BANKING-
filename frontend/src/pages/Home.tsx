import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#07803F';
const DARK = '#17251C';
const MUTED = '#68736B';
const BORDER = '#E7ECE8';
const LIGHT = '#F7F9F7';

const services = [
  {
    icon: '↗',
    title: 'Bank Transfers',
    description:
      'Convenient transfers for everyday personal and business banking.',
  },
  {
    icon: '▤',
    title: 'Airtime & Data',
    description:
      'Purchase airtime and mobile data through one platform.',
  },
  {
    icon: '▣',
    title: 'Bill Payments',
    description:
      'Pay supported electricity and television subscription bills.',
  },
  {
    icon: '◉',
    title: 'Personal Banking',
    description:
      'Access everyday banking services through your personal account.',
  },
  {
    icon: '▥',
    title: 'Business Banking',
    description:
      'Digital banking services designed for business activities.',
  },
  {
    icon: '▦',
    title: 'POS Services',
    description:
      'POS services designed to support business payments.',
  },
];

const Home: React.FC = () => {
  return (
    <div className="zen-home">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        .zen-home {
          min-height: 100vh;
          background: #fff;
          color: ${DARK};
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Arial, sans-serif;
          overflow: hidden;
        }

        .zen-container {
          width: min(1160px, calc(100% - 48px));
          margin: 0 auto;
        }

        /* HEADER */

        .zen-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid ${BORDER};
          backdrop-filter: blur(14px);
        }

        .zen-nav {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .zen-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: ${DARK};
          text-decoration: none;
          font-size: 21px;
          font-weight: 850;
          letter-spacing: -1px;
          white-space: nowrap;
        }

        .zen-logo-mark {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          background: #EDF5EF;
          color: ${GREEN};
          border-radius: 10px;
          font-size: 21px;
          font-weight: 900;
        }

        .zen-nav-links {
          display: flex;
          align-items: center;
          gap: 29px;
        }

        .zen-nav-links a {
          color: #47534A;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          transition: color .2s ease;
        }

        .zen-nav-links a:hover {
          color: ${GREEN};
        }

        .zen-nav-links .zen-nav-contact {
          padding: 11px 18px;
          border: 1px solid ${GREEN};
          border-radius: 7px;
          color: ${GREEN};
        }

        .zen-nav-links .zen-nav-contact:hover {
          background: #F3F8F4;
        }

        .zen-mobile-menu {
          display: none;
          position: relative;
        }

        .zen-mobile-menu summary {
          list-style: none;
          cursor: pointer;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid ${BORDER};
          border-radius: 9px;
          color: ${DARK};
          font-size: 23px;
        }

        .zen-mobile-menu summary::-webkit-details-marker {
          display: none;
        }

        .zen-mobile-menu nav {
          position: absolute;
          top: 52px;
          right: 0;
          width: 220px;
          padding: 10px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 12px;
          box-shadow: 0 15px 35px rgba(20,40,25,.12);
        }

        .zen-mobile-menu nav a {
          display: block;
          padding: 13px 12px;
          color: ${DARK};
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          border-radius: 7px;
        }

        .zen-mobile-menu nav a:hover {
          background: ${LIGHT};
          color: ${GREEN};
        }

        /* HERO */

        .zen-hero {
          padding: 72px 0 75px;
          background: #fff;
        }

        .zen-hero-grid {
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          align-items: center;
          gap: 55px;
        }

        .zen-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .zen-eyebrow-dot {
          width: 7px;
          height: 7px;
          background: ${GREEN};
          border-radius: 50%;
        }

        .zen-hero h1 {
          max-width: 620px;
          margin: 22px 0 19px;
          color: ${DARK};
          font-size: clamp(43px, 5.2vw, 65px);
          line-height: 1.08;
          letter-spacing: -2.8px;
          font-weight: 850;
        }

        .zen-hero h1 span {
          color: ${GREEN};
        }

        .zen-hero-description {
          max-width: 510px;
          margin: 0;
          color: ${MUTED};
          font-size: 15px;
          line-height: 1.85;
        }

        .zen-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 29px;
        }

        .zen-button {
          min-height: 47px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 19px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          transition: all .2s ease;
        }

        .zen-button-primary {
          background: ${GREEN};
          color: #fff;
          border: 1px solid ${GREEN};
        }

        .zen-button-primary:hover {
          background: #056B34;
          transform: translateY(-2px);
        }

        .zen-button-secondary {
          background: #fff;
          color: ${DARK};
          border: 1px solid ${BORDER};
        }

        .zen-button-secondary:hover {
          border-color: ${GREEN};
          color: ${GREEN};
        }

        .zen-hero-note {
          margin-top: 20px;
          color: #89938C;
          font-size: 11px;
        }

        /* CUSTOMER DASHBOARD PREVIEW */

        .zen-visual {
          position: relative;
          min-height: 570px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background: #FAFCFA;
          border: 1px solid ${BORDER};
          border-radius: 18px;
        }

        .zen-dashboard-preview {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 440px;
          padding: 20px;
          background: #FFFFFF;
          border: 1px solid ${BORDER};
          border-radius: 15px;
          box-shadow: 0 22px 55px rgba(20,45,28,.09);
        }

        .zen-dashboard-header,
        .zen-dashboard-user,
        .zen-dashboard-balance-top,
        .zen-dashboard-section-title,
        .zen-dashboard-service-row,
        .zen-dashboard-bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .zen-dashboard-header { padding-bottom: 16px; border-bottom: 1px solid ${BORDER}; }
        .zen-dashboard-brand { color: ${DARK}; font-size: 13px; font-weight: 900; letter-spacing: -.4px; }
        .zen-dashboard-header-actions { display: flex; gap: 8px; }
        .zen-dashboard-header-actions span { width: 29px; height: 29px; display: grid; place-items: center; border: 1px solid ${BORDER}; border-radius: 50%; color: ${DARK}; font-size: 12px; }
        .zen-dashboard-user { justify-content: flex-start; gap: 10px; margin: 17px 0; }
        .zen-dashboard-avatar { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: #EDF5EF; color: ${GREEN}; font-size: 13px; font-weight: 850; }
        .zen-dashboard-user small { display: block; color: ${MUTED}; font-size: 9px; }
        .zen-dashboard-user strong { display: block; margin-top: 3px; color: ${DARK}; font-size: 12px; }
        .zen-dashboard-balance { padding: 17px; color: #fff; background: linear-gradient(125deg, #176D3C, #0A8745); border-radius: 11px; }
        .zen-dashboard-balance-top { color: rgba(255,255,255,.85); font-size: 9px; }
        .zen-dashboard-balance strong { display: block; margin: 13px 0 12px; font-size: 23px; letter-spacing: .5px; }
        .zen-dashboard-balance-foot { display: flex; justify-content: space-between; color: rgba(255,255,255,.86); font-size: 9px; }
        .zen-dashboard-verification { display: flex; align-items: center; gap: 9px; margin-top: 11px; padding: 10px; border: 1px solid #E8EEE9; border-radius: 8px; background: #FBFCFB; }
        .zen-dashboard-verification-icon { width: 25px; height: 25px; display: grid; place-items: center; flex: 0 0 25px; border-radius: 50%; background: #EDF5EF; color: ${GREEN}; font-size: 12px; font-weight: 900; }
        .zen-dashboard-verification span:nth-child(2) { flex: 1; }
        .zen-dashboard-verification strong { display: block; color: ${DARK}; font-size: 9px; }
        .zen-dashboard-verification small { display: block; margin-top: 3px; color: ${MUTED}; font-size: 7px; }
        .zen-dashboard-verification b { color: ${GREEN}; font-size: 16px; }
        .zen-dashboard-section-title { margin: 19px 0 11px; color: ${DARK}; font-size: 11px; font-weight: 850; }
        .zen-dashboard-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px 5px; }
        .zen-dashboard-action { text-align: center; color: #59645C; font-size: 8px; line-height: 1.35; }
        .zen-dashboard-action span { width: 32px; height: 32px; display: grid; place-items: center; margin: 0 auto 5px; background: #F0F5F1; color: ${GREEN}; border-radius: 9px; font-size: 14px; font-weight: 800; }
        .zen-dashboard-service-row { padding: 9px 0; border-bottom: 1px solid ${BORDER}; color: #4D5A51; font-size: 9px; }
        .zen-dashboard-service-row span:last-child { color: ${GREEN}; font-size: 13px; }
        .zen-dashboard-transactions { padding: 13px 10px; text-align: center; background: #FAFCFA; border: 1px solid ${BORDER}; border-radius: 8px; }
        .zen-dashboard-transactions strong { display: block; color: ${DARK}; font-size: 10px; }
        .zen-dashboard-transactions span { display: block; margin-top: 4px; color: ${MUTED}; font-size: 8px; }
        .zen-dashboard-bottom-nav { margin-top: 15px; padding-top: 12px; border-top: 1px solid ${BORDER}; }
        .zen-dashboard-bottom-nav span { color: #7A857D; font-size: 8px; text-align: center; }
        .zen-dashboard-bottom-nav span:first-child { color: ${GREEN}; font-weight: 850; }
        .zen-preview-caption { position: absolute; right: 18px; bottom: 14px; color: #8A948D; font-size: 9px; letter-spacing: .2px; }

        /* INTRODUCTION */

        .zen-section {
          padding: 78px 0;
          background: #fff;
        }

        .zen-section-light {
          background: ${LIGHT};
        }

        .zen-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 65px;
        }

        .zen-kicker {
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .zen-intro-copy h2 {
          margin: 15px 0;
          font-size: 36px;
          line-height: 1.2;
          letter-spacing: -1.4px;
        }

        .zen-intro-copy p {
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.9;
        }

        .zen-intro-panel {
          padding: 33px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 12px;
        }

        .zen-intro-mark {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          background: #EDF5EF;
          color: ${GREEN};
          border-radius: 10px;
          font-size: 22px;
          font-weight: 900;
        }

        .zen-intro-panel h3 {
          margin: 20px 0 10px;
          font-size: 21px;
        }

        .zen-intro-panel p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.85;
        }

        /* SECTION HEADINGS */

        .zen-section-heading {
          max-width: 690px;
          margin: 0 auto 40px;
          text-align: center;
        }

        .zen-section-heading h2 {
          margin: 13px 0;
          font-size: clamp(29px, 4vw, 40px);
          line-height: 1.2;
          letter-spacing: -1.3px;
        }

        .zen-section-heading p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.85;
        }

        /* SERVICES */

        .zen-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 17px;
        }

        .zen-service-card {
          padding: 25px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 10px;
          transition: .2s ease;
        }

        .zen-service-card:hover {
          border-color: #BBD9C2;
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(20,50,30,.05);
        }

        .zen-service-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          background: #F0F5F1;
          color: ${GREEN};
          border-radius: 9px;
          font-size: 19px;
        }

        .zen-service-card h3 {
          margin: 0 0 9px;
          font-size: 15px;
        }

        .zen-service-card p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.8;
        }

        /* BANKING */

        .zen-banking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .zen-banking-card {
          padding: 31px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 11px;
        }

        .zen-banking-card small {
          color: ${GREEN};
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .zen-banking-card h3 {
          max-width: 370px;
          margin: 18px 0 11px;
          font-size: 25px;
          line-height: 1.25;
          letter-spacing: -.6px;
        }

        .zen-banking-card p {
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        .zen-banking-card a {
          display: inline-block;
          margin-top: 12px;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        /* SECURITY */

        .zen-security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .zen-security-item {
          padding: 24px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 10px;
        }

        .zen-security-item h3 {
          margin: 0 0 10px;
          font-size: 15px;
        }

        .zen-security-item p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.85;
        }

        /* CONTACT */

        .zen-contact {
          padding: 55px 0;
          border-top: 1px solid ${BORDER};
          border-bottom: 1px solid ${BORDER};
          background: white;
        }

        .zen-contact-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .zen-contact h2 {
          max-width: 600px;
          margin: 0 0 10px;
          font-size: 29px;
          line-height: 1.25;
          letter-spacing: -1px;
        }

        .zen-contact p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        .zen-contact a {
          flex-shrink: 0;
          padding: 13px 19px;
          border: 1px solid ${GREEN};
          border-radius: 7px;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .zen-contact a:hover {
          background: #F3F8F4;
        }

        /* FOOTER */

        .zen-footer {
          padding: 55px 0 22px;
          background: white;
        }

        .zen-footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 35px;
          padding-bottom: 35px;
        }

        .zen-footer-brand p {
          max-width: 290px;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.9;
        }

        .zen-footer-column h4 {
          margin: 0 0 17px;
          font-size: 12px;
        }

        .zen-footer-column a {
          display: block;
          margin: 11px 0;
          color: ${MUTED};
          font-size: 11px;
          text-decoration: none;
        }

        .zen-footer-column a:hover {
          color: ${GREEN};
        }

        .zen-footer-bottom {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-top: 20px;
          border-top: 1px solid ${BORDER};
          color: #89938C;
          font-size: 10px;
        }

        /* TABLET */

        @media (max-width: 900px) {
          .zen-hero-grid {
            grid-template-columns: 1fr 1fr;
            gap: 25px;
          }

          .zen-hero h1 {
            font-size: 46px;
          }

          .zen-visual {
            min-height: 350px;
          }

          .zen-services-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .zen-footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* MOBILE */

        @media (max-width: 650px) {
          .zen-container {
            width: calc(100% - 36px);
          }

          .zen-nav {
            height: 67px;
          }

          .zen-logo {
            font-size: 18px;
          }

          .zen-logo-mark {
            width: 34px;
            height: 34px;
            font-size: 19px;
          }

          .zen-nav-links {
            display: none;
          }

          .zen-mobile-menu {
            display: block;
          }

          .zen-hero {
            padding: 45px 0 38px;
          }

          .zen-hero-grid {
            grid-template-columns: 1fr;
            gap: 22px;
          }

          .zen-hero-content {
            text-align: left;
          }

          .zen-eyebrow {
            font-size: 9px;
            letter-spacing: 1.1px;
          }

          .zen-hero h1 {
            max-width: 440px;
            margin: 17px 0 14px;
            font-size: clamp(35px, 9vw, 43px);
            line-height: 1.12;
            letter-spacing: -1.7px;
          }

          .zen-hero-description {
            font-size: 13px;
            line-height: 1.75;
          }

          .zen-hero-actions {
            gap: 9px;
            margin-top: 21px;
          }

          .zen-button {
            min-height: 43px;
            padding: 0 14px;
            font-size: 11px;
          }

          .zen-hero-note {
            margin-top: 14px;
            font-size: 10px;
          }

          .zen-visual {
            min-height: auto;
            display: block;
            padding: 12px;
            border-radius: 12px;
          }

          .zen-dashboard-preview {
            padding: 13px;
          }

          .zen-dashboard-balance {
            padding: 14px;
          }

          .zen-dashboard-balance strong {
            font-size: 20px;
          }

          .zen-dashboard-action span {
            width: 27px;
            height: 27px;
          }

          .zen-preview-caption {
            position: static;
            display: block;
            margin-top: 9px;
            text-align: center;
          }

          .zen-section {
            padding: 58px 0;
          }

          .zen-intro-grid {
            grid-template-columns: 1fr;
            gap: 23px;
          }

          .zen-intro-copy h2 {
            font-size: 30px;
          }

          .zen-intro-copy p {
            font-size: 13px;
          }

          .zen-intro-panel {
            padding: 25px;
          }

          .zen-section-heading {
            margin-bottom: 28px;
          }

          .zen-section-heading h2 {
            font-size: 28px;
          }

          .zen-section-heading p {
            font-size: 12px;
          }

          .zen-services-grid {
            grid-template-columns: 1fr 1fr;
            gap: 11px;
          }

          .zen-service-card {
            padding: 17px;
          }

          .zen-service-icon {
            width: 36px;
            height: 36px;
            margin-bottom: 13px;
            font-size: 16px;
          }

          .zen-service-card h3 {
            font-size: 13px;
          }

          .zen-service-card p {
            font-size: 11px;
            line-height: 1.65;
          }

          .zen-banking-grid,
          .zen-security-grid {
            grid-template-columns: 1fr;
          }

          .zen-banking-card {
            padding: 25px;
          }

          .zen-banking-card h3 {
            font-size: 23px;
          }

          .zen-contact {
            padding: 42px 0;
          }

          .zen-contact-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .zen-contact h2 {
            font-size: 26px;
          }

          .zen-footer {
            padding-top: 43px;
          }

          .zen-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 28px 18px;
          }

          .zen-footer-brand {
            grid-column: 1 / -1;
          }

          .zen-footer-bottom {
            flex-direction: column;
            line-height: 1.7;
          }
        }

        @media (max-width: 370px) {
          .zen-container {
            width: calc(100% - 28px);
          }

          .zen-hero h1 {
            font-size: 34px;
          }

          .zen-services-grid {
            grid-template-columns: 1fr;
          }

          .zen-hero-actions {
            flex-direction: column;
          }

          .zen-button {
            width: 100%;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="zen-header">
        <div className="zen-container zen-nav">
          <Link to="/" className="zen-logo">
            <span className="zen-logo-mark">Z</span>
            ZENIMONIES
          </Link>

          <nav className="zen-nav-links">
            <a href="#home">Home</a>
            <a href="#services">Services</a>
            <Link to="/about">About Us</Link>
            <a href="#security">Security</a>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="zen-nav-contact">
              Open an account
            </Link>
          </nav>

          <details className="zen-mobile-menu">
            <summary aria-label="Open navigation menu">☰</summary>
            <nav>
              <a href="#home">Home</a>
              <a href="#services">Services</a>
              <Link to="/about">About Us</Link>
              <a href="#security">Security</a>
              <a href="#contact">Contact</a>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Open an account</Link>
            </nav>
          </details>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="zen-hero" id="home">
          <div className="zen-container zen-hero-grid">
            <div className="zen-hero-content">
              <div className="zen-eyebrow">
                <span className="zen-eyebrow-dot" />
                Banking and payment services
              </div>

              <h1>
                Banking made <span>simpler.</span> Payments made easier.
              </h1>

              <p className="zen-hero-description">
                Welcome to ZENIMONIES. Discover a convenient digital
                banking experience designed to support everyday
                financial activities and business needs.
              </p>

              <div className="zen-hero-actions">
                <Link
                  to="/register"
                  className="zen-button zen-button-primary"
                >
                  Get started
                </Link>

                <a
                  href="#services"
                  className="zen-button zen-button-secondary"
                >
                  Explore our services
                </a>
              </div>

              <p className="zen-hero-note">
                Digital banking and payment services in Nigeria.
              </p>
            </div>

            {/* ILLUSTRATIVE CUSTOMER DASHBOARD — NO LIVE CUSTOMER DATA */}
            <div className="zen-visual" aria-label="Illustrative ZENIMONIES customer dashboard preview">
              <div className="zen-dashboard-preview">
                <div className="zen-dashboard-header">
                  <span className="zen-dashboard-brand">ZENIMONIES</span>
                  <div className="zen-dashboard-header-actions" aria-hidden="true">
                    <span>♧</span>
                    <span>?</span>
                  </div>
                </div>

                <div className="zen-dashboard-user">
                  <span className="zen-dashboard-avatar">C</span>
                  <div>
                    <small>Welcome back,</small>
                    <strong>Customer</strong>
                  </div>
                </div>

                <div className="zen-dashboard-balance">
                  <div className="zen-dashboard-balance-top">
                    <span>Available balance</span>
                    <span>•••</span>
                  </div>
                  <strong>₦ ••••••</strong>
                  <div className="zen-dashboard-balance-foot">
                    <span>Personal account</span>
                    <span>NGN</span>
                  </div>
                </div>

                <div className="zen-dashboard-verification">
                  <span className="zen-dashboard-verification-icon">✓</span>
                  <span>
                    <strong>Account verification</strong>
                    <small>Complete verification to access eligible features</small>
                  </span>
                  <b>›</b>
                </div>

                <div className="zen-dashboard-section-title">
                  <span>Quick Actions</span>
                  <span>View all</span>
                </div>
                <div className="zen-dashboard-actions">
                  <div className="zen-dashboard-action"><span>＋</span>Add Money</div>
                  <div className="zen-dashboard-action"><span>↗</span>To Bank</div>
                  <div className="zen-dashboard-action"><span>⇄</span>Send</div>
                  <div className="zen-dashboard-action"><span>▤</span>Airtime</div>
                  <div className="zen-dashboard-action"><span>▦</span>Data</div>
                  <div className="zen-dashboard-action"><span>◎</span>Betting</div>
                  <div className="zen-dashboard-action"><span>▣</span>TV</div>
                  <div className="zen-dashboard-action"><span>ϟ</span>Bills</div>
                  <div className="zen-dashboard-action"><span>◇</span>Savings</div>
                  <div className="zen-dashboard-action"><span>•••</span>More</div>
                </div>

                <div className="zen-dashboard-section-title">
                  <span>More Services</span>
                  <span> </span>
                </div>
                <div className="zen-dashboard-service-row"><span>Transactions</span><span>›</span></div>
                <div className="zen-dashboard-service-row"><span>Wallet</span><span>›</span></div>
                <div className="zen-dashboard-service-row"><span>Cards</span><span>›</span></div>
                <div className="zen-dashboard-service-row"><span>Settings</span><span>›</span></div>

                <div className="zen-dashboard-section-title">
                  <span>Recent Transactions</span>
                  <span>See all</span>
                </div>
                <div className="zen-dashboard-transactions">
                  <strong>No transactions yet</strong>
                  <span>Your transactions will appear here.</span>
                </div>

                <div className="zen-dashboard-bottom-nav">
                  <span>⌂<br />Home</span>
                  <span>↔<br />Transactions</span>
                  <span>▣<br />Cards</span>
                  <span>◫<br />Wallet</span>
                  <span>○<br />Profile</span>
                </div>
              </div>
              <span className="zen-preview-caption">Illustrative dashboard preview</span>
            </div>
          </div>
        </section>

        {/* COMPANY INTRODUCTION */}
        <section className="zen-section">
          <div className="zen-container zen-intro-grid">
            <div className="zen-intro-copy">
              <span className="zen-kicker">Who we are</span>

              <h2>
                A digital banking experience built around everyday needs.
              </h2>

              <p>
                ZENIMONIES is a digital banking platform focused on
                providing convenient access to banking and payment
                services in Nigeria.
              </p>

              <p>
                From personal financial activities to business banking
                needs, our goal is to make essential financial services
                easier to access through a connected digital experience.
              </p>

              <Link
                to="/about"
                className="zen-button zen-button-primary"
              >
                Learn more about us
              </Link>
            </div>

            <div className="zen-intro-panel">
              <div className="zen-intro-mark">Z</div>

              <h3>
                One platform. Everyday financial services.
              </h3>

              <p>
                Explore banking and payment services through the
                ZENIMONIES digital platform, with solutions for
                individuals and businesses.
              </p>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section
          className="zen-section zen-section-light"
          id="services"
        >
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Our services</span>

              <h2>
                Financial services for everyday life and business.
              </h2>

              <p>
                Discover the services available through the
                ZENIMONIES platform.
              </p>
            </div>

            <div className="zen-services-grid">
              {services.map((service) => (
                <article
                  className="zen-service-card"
                  key={service.title}
                >
                  <div className="zen-service-icon">
                    {service.icon}
                  </div>

                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BANKING SOLUTIONS */}
        <section className="zen-section">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Banking solutions</span>

              <h2>
                Banking that supports individuals and businesses.
              </h2>

              <p>
                Personal and business banking experiences through
                one digital platform.
              </p>
            </div>

            <div className="zen-banking-grid">
              <article className="zen-banking-card">
                <small>Personal banking</small>

                <h3>
                  Your everyday banking, in one place.
                </h3>

                <p>
                  Access personal account services, transfers,
                  payments and other supported banking features.
                </p>

                <Link to="/about">
                  Explore personal banking →
                </Link>
              </article>

              <article className="zen-banking-card">
                <small>Business banking</small>

                <h3>
                  Banking services for your business activities.
                </h3>

                <p>
                  Explore business account services and tools,
                  including supported POS services.
                </p>

                <Link to="/about">
                  Explore business banking →
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section
          className="zen-section zen-section-light"
          id="security"
        >
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Security and trust</span>

              <h2>
                Security is an important part of digital banking.
              </h2>

              <p>
                We recognise the importance of protecting customer
                accounts and supporting responsible access to
                financial services.
              </p>
            </div>

            <div className="zen-security-grid">
              <article className="zen-security-item">
                <h3>Account protection</h3>
                <p>
                  Account access and security measures are important
                  parts of the ZENIMONIES banking experience.
                </p>
              </article>

              <article className="zen-security-item">
                <h3>Identity verification</h3>
                <p>
                  Customer verification processes support account
                  security and applicable service requirements.
                </p>
              </article>

              <article className="zen-security-item">
                <h3>Responsible banking</h3>
                <p>
                  We aim to provide a clear and responsible digital
                  experience for customers using our platform.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="zen-contact" id="contact">
          <div className="zen-container zen-contact-inner">
            <div>
              <h2>
                Discover the ZENIMONIES digital banking experience.
              </h2>

              <p>
                Explore our company profile and learn more about
                our banking and payment services in Nigeria.
              </p>
            </div>

            <Link to="/about">
              About ZENIMONIES →
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="zen-footer">
        <div className="zen-container">
          <div className="zen-footer-grid">
            <div className="zen-footer-brand">
              <Link to="/" className="zen-logo">
                <span className="zen-logo-mark">Z</span>
                ZENIMONIES
              </Link>

              <p>
                A digital banking platform focused on convenient
                banking and payment services for individuals and
                businesses in Nigeria.
              </p>
            </div>

            <div className="zen-footer-column">
              <h4>Company</h4>
              <Link to="/">Home</Link>
              <Link to="/about">About us</Link>
              <a href="#services">Our services</a>
              <a href="#contact">Contact</a>
            </div>

            <div className="zen-footer-column">
              <h4>Services</h4>
              <a href="#services">Bank transfers</a>
              <a href="#services">Airtime and data</a>
              <a href="#services">Bill payments</a>
              <a href="#services">Business banking</a>
            </div>

            <div className="zen-footer-column">
              <h4>Information</h4>
              <a href="#security">Security</a>
              <Link to="/about">Company profile</Link>
              <Link to="/about">Personal banking</Link>
              <Link to="/about">Business banking</Link>
            </div>
          </div>

          <div className="zen-footer-bottom">
            <span>
              © {new Date().getFullYear()} ZENIMONIES. All rights reserved.
            </span>

            <span>
              Digital banking and payment services in Nigeria.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
