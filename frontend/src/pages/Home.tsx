
import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#07803F';
const DARK = '#17251C';
const MUTED = '#68736B';
const WHITE = '#FFFFFF';
const BORDER = '#E8EDE9';
const LIGHT = '#F8FAF8';

const services = [
  {
    icon: '↗',
    title: 'Bank Transfers',
    description:
      'Convenient money transfers for everyday personal and business banking activities.',
  },
  {
    icon: '▤',
    title: 'Airtime & Data',
    description:
      'Purchase airtime and mobile data through the ZENIMONIES platform.',
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
      'Digital banking services designed for business financial activities.',
  },
  {
    icon: '▦',
    title: 'POS Services',
    description:
      'POS services designed to support business and in-person payments.',
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
          width: 100%;
          min-height: 100vh;
          background: ${WHITE};
          color: ${DARK};
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          overflow: hidden;
        }

        .zen-container {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        /* HEADER */

        .zen-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid ${BORDER};
        }

        .zen-nav {
          min-height: 82px;
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
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -1px;
          text-decoration: none;
        }

        .zen-logo-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #EAF4EC;
          color: ${GREEN};
          font-size: 22px;
          font-weight: 900;
        }

        .zen-nav-links {
          display: flex;
          align-items: center;
          gap: 30px;
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

        .zen-nav-contact {
          padding: 11px 18px;
          border: 1px solid ${GREEN};
          border-radius: 7px;
          color: ${GREEN} !important;
        }

        .zen-nav-contact:hover {
          background: #F2F8F3;
        }

        /* HERO */

        .zen-hero {
          padding: 95px 0 85px;
          background: ${WHITE};
        }

        .zen-hero-grid {
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          align-items: center;
          gap: 65px;
        }

        .zen-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .zen-eyebrow-dot {
          width: 7px;
          height: 7px;
          background: ${GREEN};
          border-radius: 50%;
        }

        .zen-hero h1 {
          max-width: 650px;
          margin: 24px 0 22px;
          font-size: clamp(42px, 5.3vw, 66px);
          line-height: 1.09;
          letter-spacing: -3px;
          font-weight: 850;
        }

        .zen-hero h1 span {
          color: ${GREEN};
        }

        .zen-hero-description {
          max-width: 550px;
          margin: 0;
          color: ${MUTED};
          font-size: 16px;
          line-height: 1.9;
        }

        .zen-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 32px;
        }

        .zen-button {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 21px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
          transition: all .2s ease;
        }

        .zen-button-primary {
          background: ${GREEN};
          color: white;
          border: 1px solid ${GREEN};
        }

        .zen-button-primary:hover {
          background: #056B34;
          transform: translateY(-2px);
        }

        .zen-button-secondary {
          background: white;
          color: ${DARK};
          border: 1px solid ${BORDER};
        }

        .zen-button-secondary:hover {
          border-color: ${GREEN};
          color: ${GREEN};
        }

        .zen-hero-note {
          margin-top: 24px;
          color: #879189;
          font-size: 12px;
        }

        /* PHONE MOCKUP */

        .zen-visual {
          position: relative;
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zen-phone {
          position: relative;
          z-index: 2;
          width: 260px;
          min-height: 390px;
          padding: 15px;
          background: #FFFFFF;
          border: 7px solid #27342B;
          border-radius: 34px;
          box-shadow: 0 25px 65px rgba(20,40,25,.13);
          transform: rotate(-4deg);
        }

        .zen-phone-screen {
          min-height: 350px;
          padding: 20px 14px;
          background: #FFFFFF;
          border-radius: 20px;
          overflow: hidden;
        }

        .zen-phone-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 850;
        }

        .zen-phone-greeting {
          margin-top: 28px;
          color: ${MUTED};
          font-size: 11px;
        }

        .zen-phone-account {
          margin-top: 13px;
          padding: 17px;
          border: 1px solid ${BORDER};
          border-radius: 12px;
          background: ${LIGHT};
        }

        .zen-phone-account small {
          color: ${MUTED};
          font-size: 9px;
        }

        .zen-phone-account strong {
          display: block;
          margin-top: 9px;
          color: ${DARK};
          font-size: 18px;
        }

        .zen-phone-label {
          margin-top: 22px;
          font-size: 11px;
          font-weight: 800;
        }

        .zen-phone-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 13px;
        }

        .zen-phone-action {
          text-align: center;
          color: ${MUTED};
          font-size: 8px;
        }

        .zen-phone-action span {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          margin: 0 auto 6px;
          background: #F0F5F1;
          color: ${GREEN};
          border-radius: 10px;
          font-size: 16px;
          font-weight: 800;
        }

        .zen-phone-row {
          display: flex;
          justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid ${BORDER};
          font-size: 9px;
        }

        .zen-phone-row span:last-child {
          color: ${GREEN};
        }

        .zen-floating-card {
          position: absolute;
          z-index: 3;
          right: -4px;
          bottom: 38px;
          padding: 16px 18px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 10px;
          box-shadow: 0 12px 30px rgba(20,40,25,.08);
        }

        .zen-floating-card strong {
          display: block;
          color: ${GREEN};
          font-size: 13px;
        }

        .zen-floating-card span {
          display: block;
          margin-top: 5px;
          color: ${MUTED};
          font-size: 10px;
        }

        /* GENERAL SECTIONS */

        .zen-section {
          padding: 85px 0;
          background: white;
        }

        .zen-section-light {
          background: ${LIGHT};
        }

        .zen-section-heading {
          max-width: 690px;
          margin: 0 auto 45px;
          text-align: center;
        }

        .zen-section-kicker {
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .zen-section-heading h2 {
          margin: 15px 0;
          font-size: clamp(29px, 4vw, 42px);
          line-height: 1.2;
          letter-spacing: -1.5px;
        }

        .zen-section-heading p {
          margin: 0;
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.9;
        }

        /* ABOUT INTRODUCTION */

        .zen-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 70px;
        }

        .zen-intro-copy h2 {
          margin: 14px 0 20px;
          font-size: 38px;
          line-height: 1.2;
          letter-spacing: -1.5px;
        }

        .zen-intro-copy p {
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.9;
        }

        .zen-intro-visual {
          min-height: 270px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 35px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 13px;
        }

        .zen-intro-visual-mark {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          background: #EEF5EF;
          color: ${GREEN};
          border-radius: 12px;
          font-size: 24px;
          font-weight: 900;
        }

        .zen-intro-visual h3 {
          margin: 22px 0 10px;
          font-size: 21px;
        }

        .zen-intro-visual p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        /* SERVICES */

        .zen-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .zen-service-card {
          padding: 27px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 11px;
          transition: all .2s ease;
        }

        .zen-service-card:hover {
          border-color: #B9D8C0;
          box-shadow: 0 12px 30px rgba(20,50,30,.05);
          transform: translateY(-3px);
        }

        .zen-service-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          margin-bottom: 20px;
          color: ${GREEN};
          background: #F0F6F1;
          border-radius: 10px;
          font-size: 20px;
          font-weight: 800;
        }

        .zen-service-card h3 {
          margin: 0 0 10px;
          font-size: 16px;
        }

        .zen-service-card p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.8;
        }

        /* BANKING SOLUTIONS */

        .zen-banking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }

        .zen-banking-card {
          min-height: 275px;
          padding: 35px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 12px;
        }

        .zen-banking-card small {
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .zen-banking-card h3 {
          max-width: 370px;
          margin: 20px 0 13px;
          font-size: 27px;
          line-height: 1.25;
          letter-spacing: -.7px;
        }

        .zen-banking-card p {
          max-width: 390px;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        .zen-banking-card a {
          display: inline-block;
          margin-top: 16px;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .zen-banking-card a:hover {
          text-decoration: underline;
        }

        /* SECURITY */

        .zen-security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .zen-security-item {
          padding: 26px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 10px;
        }

        .zen-security-item h3 {
          margin: 0 0 11px;
          font-size: 16px;
        }

        .zen-security-item p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.9;
        }

        /* CONTACT */

        .zen-contact {
          padding: 65px 0;
          background: white;
          border-top: 1px solid ${BORDER};
          border-bottom: 1px solid ${BORDER};
        }

        .zen-contact-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .zen-contact h2 {
          max-width: 620px;
          margin: 0 0 12px;
          font-size: 32px;
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
          padding: 13px 20px;
          border: 1px solid ${GREEN};
          border-radius: 7px;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .zen-contact a:hover {
          background: #F2F8F3;
        }

        /* FOOTER */

        .zen-footer {
          padding: 60px 0 24px;
          background: #FFFFFF;
        }

        .zen-footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px;
          padding-bottom: 40px;
        }

        .zen-footer-brand p {
          max-width: 290px;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.9;
        }

        .zen-footer-column h4 {
          margin: 0 0 18px;
          font-size: 13px;
        }

        .zen-footer-column a {
          display: block;
          margin: 12px 0;
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
          gap: 20px;
          padding-top: 22px;
          border-top: 1px solid ${BORDER};
          color: #89938C;
          font-size: 10px;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .zen-hero-grid {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .zen-hero-content {
            text-align: center;
          }

          .zen-hero-description {
            margin: 0 auto;
          }

          .zen-hero-actions {
            justify-content: center;
          }

          .zen-services-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .zen-footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 650px) {
          .zen-container {
            width: calc(100% - 32px);
          }

          .zen-nav {
            min-height: 70px;
          }

          .zen-logo {
            font-size: 19px;
          }

          .zen-logo-mark {
            width: 34px;
            height: 34px;
          }

          .zen-nav-links {
            gap: 12px;
          }

          .zen-nav-links a {
            font-size: 11px;
          }

          .zen-nav-links a:nth-child(2),
          .zen-nav-links a:nth-child(4) {
            display: none;
          }

          .zen-nav-contact {
            padding: 9px 12px;
          }

          .zen-hero {
            padding: 65px 0 55px;
          }

          .zen-hero h1 {
            font-size: 42px;
            letter-spacing: -2px;
          }

          .zen-hero-description {
            font-size: 14px;
          }

          .zen-visual {
            min-height: 370px;
          }

          .zen-phone {
            width: 235px;
            min-height: 365px;
          }

          .zen-phone-screen {
            min-height: 325px;
          }

          .zen-section {
            padding: 65px 0;
          }

          .zen-intro-grid,
          .zen-banking-grid {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .zen-intro-copy h2 {
            font-size: 31px;
          }

          .zen-services-grid,
          .zen-security-grid {
            grid-template-columns: 1fr;
          }

          .zen-banking-card {
            padding: 28px;
          }

          .zen-contact-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .zen-contact h2 {
            font-size: 27px;
          }

          .zen-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 30px 20px;
          }

          .zen-footer-bottom {
            flex-direction: column;
          }
        }

        @media (max-width: 390px) {
          .zen-hero h1 {
            font-size: 36px;
          }

          .zen-footer-grid {
            grid-template-columns: 1fr;
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
            <a href="#contact" className="zen-nav-contact">
              Contact
            </a>
          </nav>
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
                Banking made <span>simpler.</span>
                Payments made easier.
              </h1>

              <p className="zen-hero-description">
                Welcome to ZENIMONIES. Discover a convenient digital
                banking experience designed to support your everyday
                financial activities and business needs.
              </p>

              <div className="zen-hero-actions">
                <Link
                  to="/about"
                  className="zen-button zen-button-primary"
                >
                  Discover ZENIMONIES
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

            <div className="zen-visual">
              <div className="zen-phone">
                <div className="zen-phone-screen">
                  <div className="zen-phone-top">
                    <span>ZENIMONIES</span>
                    <span>●●●</span>
                  </div>

                  <div className="zen-phone-greeting">
                    Welcome to your banking experience
                  </div>

                  <div className="zen-phone-account">
                    <small>ACCOUNT OVERVIEW</small>
                    <strong>NGN Account</strong>
                  </div>

                  <div className="zen-phone-label">
                    Quick Services
                  </div>

                  <div className="zen-phone-actions">
                    <div className="zen-phone-action">
                      <span>↗</span>
                      Transfer
                    </div>
                    <div className="zen-phone-action">
                      <span>＋</span>
                      Add money
                    </div>
                    <div className="zen-phone-action">
                      <span>▤</span>
                      Airtime
                    </div>
                    <div className="zen-phone-action">
                      <span>▣</span>
                      Bills
                    </div>
                  </div>

                  <div className="zen-phone-label">
                    Banking services
                  </div>

                  <div className="zen-phone-row">
                    <span>Payments</span>
                    <span>›</span>
                  </div>

                  <div className="zen-phone-row">
                    <span>Account services</span>
                    <span>›</span>
                  </div>

                  <div className="zen-phone-row">
                    <span>Business banking</span>
                    <span>›</span>
                  </div>
                </div>
              </div>

              <div className="zen-floating-card">
                <strong>ZENIMONIES</strong>
                <span>Banking and payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* COMPANY INTRODUCTION */}
        <section className="zen-section">
          <div className="zen-container zen-intro-grid">
            <div className="zen-intro-copy">
              <span className="zen-section-kicker">
                Who we are
              </span>

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

            <div className="zen-intro-visual">
              <div className="zen-intro-visual-mark">Z</div>

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
              <span className="zen-section-kicker">
                Our services
              </span>

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

        {/* PERSONAL AND BUSINESS BANKING */}
        <section className="zen-section">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-section-kicker">
                Banking solutions
              </span>

              <h2>
                Banking that supports individuals and businesses.
              </h2>

              <p>
                ZENIMONIES brings personal and business banking
                experiences together on one digital platform.
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
              <span className="zen-section-kicker">
                Security and trust
              </span>

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
