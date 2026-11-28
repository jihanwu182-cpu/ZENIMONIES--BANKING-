
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
    description: 'Convenient transfers to supported banks for everyday payments.',
  },
  {
    icon: '▤',
    title: 'Airtime & Data',
    description: 'Purchase airtime and mobile data through one convenient platform.',
  },
  {
    icon: '▣',
    title: 'Bill Payments',
    description: 'Pay supported electricity and television subscription bills.',
  },
  {
    icon: '◉',
    title: 'Personal Payments',
    description: 'Convenient payment services for individual customers.',
  },
  {
    icon: '▥',
    title: 'Business Payments',
    description: 'Digital payment solutions designed for business activities.',
  },
  {
    icon: '▦',
    title: 'POS Solutions',
    description: 'POS services designed to support business payment activities.',
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

        a {
          transition: color .2s ease, background .2s ease,
            border-color .2s ease, transform .2s ease;
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
          gap: 27px;
        }

        .zen-nav-links a {
          color: #47534A;
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
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
          padding: 88px 0 92px;
          background: #fff;
        }

        .zen-hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          align-items: center;
          gap: 0;
        }

        .zen-hero-content {
          max-width: 760px;
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
          max-width: 720px;
          margin: 22px 0 19px;
          color: ${DARK};
          font-size: clamp(43px, 6vw, 68px);
          line-height: 1.08;
          letter-spacing: -2.8px;
          font-weight: 850;
        }

        .zen-hero h1 span {
          color: ${GREEN};
        }

        .zen-hero-description {
          max-width: 620px;
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

        /* GENERAL SECTIONS */

        .zen-section {
          padding: 82px 0;
          background: #fff;
        }

        .zen-section-light {
          background: ${LIGHT};
        }

        .zen-kicker {
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .zen-section-heading {
          max-width: 690px;
          margin: 0 auto 40px;
          text-align: center;
        }

        .zen-section-heading h2 {
          margin: 13px 0;
          color: ${DARK};
          font-size: clamp(29px, 4vw, 40px);
          line-height: 1.2;
          letter-spacing: -1.3px;
        }

        .zen-section-heading p {
          margin: 0;
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.85;
        }

        /* ABOUT */

        .zen-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 65px;
        }

        .zen-intro-copy h2 {
          margin: 15px 0;
          color: ${DARK};
          font-size: 39px;
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
          border-radius: 14px;
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
          font-size: 22px;
          line-height: 1.35;
        }

        .zen-intro-panel p {
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
          border-radius: 12px;
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

        /* PERSONAL AND BUSINESS SERVICES */

        .zen-banking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .zen-banking-card {
          padding: 31px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 12px;
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

        /* BUSINESS FEATURES */

        .zen-business-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }

        .zen-business-detail {
          padding: 25px;
          background: #F7FAF7;
          border: 1px solid ${BORDER};
          border-radius: 12px;
        }

        .zen-business-detail strong {
          display: block;
          margin-bottom: 9px;
          color: ${DARK};
          font-size: 14px;
        }

        .zen-business-detail p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.8;
        }

        /* SECURITY */

        .zen-security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .zen-security-item {
          padding: 25px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 12px;
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
          padding: 60px 0;
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
          font-size: 30px;
          line-height: 1.25;
          letter-spacing: -1px;
        }

        .zen-contact p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        .zen-contact-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        /* FOOTER */

        .zen-footer {
          padding: 55px 0 30px;
          background: #14251B;
          color: #fff;
        }

        .zen-footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 35px;
          padding-bottom: 35px;
        }

        .zen-footer .zen-logo {
          color: white;
        }

        .zen-footer .zen-logo-mark {
          background: #234B32;
          color: #75D99A;
        }

        .zen-footer-brand p {
          max-width: 290px;
          color: #C1CDC4;
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
          color: #C1CDC4;
          font-size: 11px;
          text-decoration: none;
        }

        .zen-footer-column a:hover {
          color: #fff;
        }

        .zen-footer-bottom {
          display: block;
          width: 100%;
          padding-top: 20px;
          border-top: 1px solid #34483A;
        }

        .zen-footer-legal {
          width: 100%;
          color: #AAB9AE;
          font-size: 11px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .zen-footer-legal p {
          margin: 0 0 12px;
        }

        .zen-footer-legal p:last-child {
          margin-bottom: 0;
        }

        .zen-footer-legal strong {
          color: #D5E0D8;
          font-weight: 750;
        }

        /* TABLET */

        @media (max-width: 900px) {
          .zen-hero-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .zen-hero-content {
            max-width: 720px;
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
            padding: 55px 0 58px;
          }

          .zen-hero-grid {
            grid-template-columns: 1fr;
            gap: 0;
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

          .zen-section {
            padding: 60px 0;
          }

          .zen-intro-grid {
            grid-template-columns: 1fr;
            gap: 25px;
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
          .zen-business-details,
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
            padding-bottom: 28px;
          }

          .zen-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 28px 18px;
          }

          .zen-footer-brand {
            grid-column: 1 / -1;
          }

          .zen-footer-bottom {
            padding-top: 20px;
          }

          .zen-footer-legal {
            font-size: 11px;
            line-height: 1.85;
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
            <a href="#personal">Personal</a>
            <a href="#business">Business</a>
            <a href="#services">Services</a>
            <Link to="/about">About Us</Link>
            <a href="#contact" className="zen-nav-contact">Contact</a>
          </nav>

          <details className="zen-mobile-menu">
            <summary aria-label="Open navigation menu">☰</summary>
            <nav>
              <a href="#home">Home</a>
              <a href="#personal">Personal Payments</a>
              <a href="#business">Business Payments</a>
              <a href="#services">Services</a>
              <Link to="/about">About Us</Link>
              <a href="#security">Security</a>
              <a href="#contact">Contact</a>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
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
                Your trusted digital payment partner
              </div>

              <h1>
                Your payments, <span>made simple.</span>
              </h1>

              <p className="zen-hero-description">
                ZENIMONIES brings essential payment services together
                in one convenient platform, designed to support
                individuals and businesses across Nigeria.
              </p>

              <div className="zen-hero-actions">
                <Link to="/register" className="zen-button zen-button-primary">
                  Get started
                </Link>

                <a href="#services" className="zen-button zen-button-secondary">
                  Explore our services
                </a>
              </div>

              <p className="zen-hero-note">
                Payments made simpler for everyday life and business.
              </p>
            </div>
          </div>
        </section>

        {/* ABOUT ZENIMONIES */}

        <section className="zen-section zen-section-light" id="company">
          <div className="zen-container zen-intro-grid">
            <div className="zen-intro-copy">
              <span className="zen-kicker">About ZENIMONIES</span>

              <h2>
                Making everyday payments simpler and more convenient.
              </h2>

              <p>
                ZENIMONIES is a digital payment platform committed to
                making everyday financial services more accessible,
                convenient and straightforward for individuals and
                businesses across Nigeria.
              </p>

              <p>
                Through one connected platform, customers can access
                essential payment services, manage account activities
                and handle everyday financial needs with greater ease.
              </p>

              <Link to="/about" className="zen-button zen-button-primary">
                Learn more about our company
              </Link>
            </div>

            <div className="zen-intro-panel">
              <div className="zen-intro-mark">Z</div>

              <h3>
                ZENIMONIES — Your Payment Partner.
              </h3>

              <p>
                Explore personal and business payment services
                designed to support everyday transfers, account
                activities and essential financial needs.
              </p>
            </div>
          </div>
        </section>

        {/* SERVICES */}

        <section className="zen-section" id="services">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Our services</span>

              <h2>
                Payment solutions for everyday life and business.
              </h2>

              <p>
                Discover the services available through the
                ZENIMONIES platform.
              </p>
            </div>

            <div className="zen-services-grid">
              {services.map((service) => (
                <article className="zen-service-card" key={service.title}>
                  <div className="zen-service-icon">{service.icon}</div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PERSONAL PAYMENTS */}

        <section className="zen-section zen-section-light" id="personal">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Personal payments</span>

              <h2>
                Everyday payments, designed around your needs.
              </h2>

              <p>
                Access essential account and payment services through
                a convenient digital experience.
              </p>
            </div>

            <div className="zen-banking-grid">
              <article className="zen-banking-card">
                <small>Personal account services</small>
                <h3>Your everyday financial services, in one place.</h3>
                <p>
                  Access your personal account, manage account
                  activities and review your transaction history.
                </p>
                <Link to="/register">Get started →</Link>
              </article>

              <article className="zen-banking-card">
                <small>Payments and transfers</small>
                <h3>Manage everyday payments with convenience.</h3>
                <p>
                  Access supported bank transfers, airtime, mobile
                  data and bill payment services.
                </p>
                <Link to="/login">Access your account →</Link>
              </article>
            </div>
          </div>
        </section>

        {/* BUSINESS PAYMENTS */}

        <section className="zen-section" id="business">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Business payments</span>

              <h2>
                Payment solutions that support your business.
              </h2>

              <p>
                A dedicated business experience for account
                activities, payment services and business operations.
              </p>
            </div>

            <div className="zen-banking-grid">
              <article className="zen-banking-card">
                <small>Business accounts</small>
                <h3>Business services in one connected experience.</h3>
                <p>
                  Access your business account dashboard and available
                  payment services through the ZENIMONIES platform.
                </p>
                <Link to="/register">Explore getting started →</Link>
              </article>

              <article className="zen-banking-card">
                <small>Business POS solutions</small>
                <h3>Additional payment services for businesses.</h3>
                <p>
                  Explore the POS terminal application process for
                  eligible business customers. POS approval is handled
                  separately from business account access.
                </p>
                <Link to="/about">Learn about our company →</Link>
              </article>
            </div>

            <div className="zen-business-details">
              <div className="zen-business-detail">
                <strong>Business verification</strong>
                <p>
                  Business accounts follow the applicable verification
                  journey. Additional documentation may be required
                  when progressing through verification levels.
                </p>
              </div>

              <div className="zen-business-detail">
                <strong>Business account access</strong>
                <p>
                  Business customers can access their account
                  experience without waiting for a separate POS
                  application decision.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY */}

        <section className="zen-section zen-section-light" id="security">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-kicker">Security and responsibility</span>

              <h2>
                Protecting your account is a priority.
              </h2>

              <p>
                Account verification, responsible account access
                and careful transaction review are important parts
                of the ZENIMONIES experience.
              </p>
            </div>

            <div className="zen-security-grid">
              <article className="zen-security-item">
                <h3>Account protection</h3>
                <p>
                  Keep your account credentials private and use
                  official ZENIMONIES channels to access your account.
                </p>
              </article>

              <article className="zen-security-item">
                <h3>Identity verification</h3>
                <p>
                  Customer verification processes support account
                  identification and applicable service requirements.
                </p>
              </article>

              <article className="zen-security-item">
                <h3>Transaction awareness</h3>
                <p>
                  Review your transaction information and report
                  activity you do not recognise through the
                  appropriate support channel.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CONTACT */}

        <section className="zen-contact" id="contact">
          <div className="zen-container zen-contact-inner">
            <div>
              <span className="zen-kicker">Get started</span>

              <h2>
                Make ZENIMONIES your payment partner.
              </h2>

              <p>
                Explore our company profile or create an account
                to get started with the ZENIMONIES platform.
              </p>
            </div>

            <div className="zen-contact-actions">
              <Link to="/register" className="zen-button zen-button-primary">
                Create an account
              </Link>

              <Link to="/about" className="zen-button zen-button-secondary">
                About ZENIMONIES
              </Link>
            </div>
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
                Your payment partner, providing convenient payment
                services for individuals and businesses across Nigeria.
              </p>
            </div>

            <div className="zen-footer-column">
              <h4>Company</h4>
              <Link to="/">Home</Link>
              <Link to="/about">About Us</Link>
              <a href="#services">Our Services</a>
              <a href="#contact">Get Started</a>
            </div>

            <div className="zen-footer-column">
              <h4>Services</h4>
              <a href="#personal">Personal Payments</a>
              <a href="#business">Business Payments</a>
              <a href="#services">Bank Transfers</a>
              <a href="#services">Airtime and Data</a>
            </div>

            <div className="zen-footer-column">
              <h4>Account</h4>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
              <a href="#security">Security</a>
              <Link to="/about">Company Profile</Link>
            </div>
          </div>

          {/* LEGAL INFORMATION — INTEGRATED INTO THE EXISTING FOOTER */}

          <div className="zen-footer-bottom">
            <div className="zen-footer-legal">
              <p>
                © {new Date().getFullYear()} ZENIMONIES DIGITAL SERVICE
                LIMITED (RC: 9974898). All rights reserved.
              </p>

              <p>
                <strong>CAC Registered Address:</strong> No. 8,
                3Brimoh Bello Street, Benin City, Edo State, Nigeria.
              </p>

              <p>
                ZENIMONIES is a financial technology company, not a
                bank. Payment, wallet, and card services are provided
                in partnership with licensed financial institutions
                regulated by the Central Bank of Nigeria (CBN).
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
