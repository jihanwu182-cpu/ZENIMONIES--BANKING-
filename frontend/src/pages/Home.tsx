
import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#07803F';
const DARK_GREEN = '#056B34';
const BLACK = '#172018';
const MUTED = '#68736B';
const LIGHT = '#F5F8F5';
const WHITE = '#FFFFFF';
const BORDER = '#E6ECE7';

const services = [
  {
    number: '01',
    title: 'Bank Transfers',
    description:
      'Send money with a simple, convenient banking experience.',
    icon: '↗',
  },
  {
    number: '02',
    title: 'Airtime & Data',
    description:
      'Purchase airtime and mobile data through one convenient platform.',
    icon: '▤',
  },
  {
    number: '03',
    title: 'Bill Payments',
    description:
      'Pay supported electricity and television subscription bills.',
    icon: '▣',
  },
  {
    number: '04',
    title: 'Personal Banking',
    description:
      'Access everyday banking services through your personal account.',
    icon: '◉',
  },
  {
    number: '05',
    title: 'Business Banking',
    description:
      'Banking tools designed to support business financial activities.',
    icon: '▥',
  },
  {
    number: '06',
    title: 'POS Services',
    description:
      'Business POS services designed to support in-person payments.',
    icon: '▦',
  },
];

const Home: React.FC = () => {
  return (
    <div className="zen-home">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .zen-home {
          width: 100%;
          min-height: 100vh;
          background: ${WHITE};
          color: ${BLACK};
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          overflow: hidden;
        }

        .zen-container {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        .zen-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid ${BORDER};
        }

        .zen-nav {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
        }

        .zen-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: ${DARK_GREEN};
          font-size: 23px;
          font-weight: 850;
          letter-spacing: -1px;
        }

        .zen-logo-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: ${GREEN};
          color: white;
          font-size: 22px;
          font-weight: 900;
        }

        .zen-nav-links {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .zen-nav-links a {
          color: #435047;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: color .2s ease;
        }

        .zen-nav-links a:hover {
          color: ${GREEN};
        }

        .zen-nav-contact {
          color: white !important;
          background: ${GREEN};
          padding: 12px 19px;
          border-radius: 9px;
        }

        .zen-nav-contact:hover {
          background: ${DARK_GREEN};
        }

        .zen-hero {
          position: relative;
          background:
            radial-gradient(circle at 85% 20%, rgba(120,169,0,.15), transparent 30%),
            linear-gradient(135deg, #F5FAF5 0%, #FFFFFF 55%, #EDF7EE 100%);
          padding: 100px 0 90px;
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
          background: #E8F4EB;
          border: 1px solid #D7EBDD;
          border-radius: 30px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
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
          margin: 25px 0 22px;
          font-size: clamp(42px, 5.5vw, 68px);
          line-height: 1.08;
          letter-spacing: -3px;
          font-weight: 850;
        }

        .zen-hero h1 span {
          color: ${GREEN};
        }

        .zen-hero-description {
          max-width: 550px;
          color: ${MUTED};
          font-size: 17px;
          line-height: 1.8;
          margin: 0;
        }

        .zen-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
        }

        .zen-button {
          min-height: 49px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 22px;
          border-radius: 9px;
          font-size: 14px;
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
          background: ${DARK_GREEN};
          transform: translateY(-2px);
        }

        .zen-button-secondary {
          background: white;
          color: ${BLACK};
          border: 1px solid ${BORDER};
        }

        .zen-button-secondary:hover {
          border-color: ${GREEN};
          color: ${GREEN};
        }

        .zen-hero-note {
          margin-top: 25px;
          color: #7A857D;
          font-size: 12px;
          line-height: 1.6;
        }

        .zen-visual {
          position: relative;
          min-height: 430px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zen-visual-glow {
          position: absolute;
          width: 330px;
          height: 330px;
          border-radius: 50%;
          background: #DCEEDD;
          filter: blur(2px);
        }

        .zen-phone {
          position: relative;
          z-index: 2;
          width: 260px;
          min-height: 390px;
          padding: 16px;
          background: #17251C;
          border: 7px solid #25372B;
          border-radius: 35px;
          box-shadow: 0 35px 70px rgba(24,65,38,.22);
          transform: rotate(-5deg);
        }

        .zen-phone-screen {
          min-height: 350px;
          background: #F7FAF7;
          border-radius: 23px;
          padding: 20px 15px;
          overflow: hidden;
        }

        .zen-phone-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: ${DARK_GREEN};
          font-size: 13px;
          font-weight: 850;
        }

        .zen-phone-greeting {
          margin-top: 30px;
          font-size: 12px;
          color: ${MUTED};
        }

        .zen-phone-balance {
          margin-top: 12px;
          padding: 18px;
          color: white;
          background: linear-gradient(135deg, ${GREEN}, #0A5F32);
          border-radius: 15px;
        }

        .zen-phone-balance small {
          opacity: .8;
          font-size: 10px;
        }

        .zen-phone-balance strong {
          display: block;
          margin-top: 8px;
          font-size: 22px;
          letter-spacing: -.5px;
        }

        .zen-phone-label {
          margin-top: 23px;
          font-size: 12px;
          font-weight: 800;
        }

        .zen-phone-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin-top: 13px;
        }

        .zen-phone-action {
          text-align: center;
          font-size: 9px;
          color: #58645B;
        }

        .zen-phone-action span {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          margin: 0 auto 6px;
          border-radius: 11px;
          background: #E7F2E8;
          color: ${GREEN};
          font-size: 17px;
          font-weight: 800;
        }

        .zen-phone-transaction {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid ${BORDER};
          font-size: 10px;
        }

        .zen-phone-transaction strong {
          color: ${DARK_GREEN};
        }

        .zen-floating-card {
          position: absolute;
          z-index: 3;
          right: -5px;
          bottom: 45px;
          padding: 16px 19px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 14px;
          box-shadow: 0 15px 35px rgba(20,50,30,.10);
        }

        .zen-floating-card strong {
          display: block;
          color: ${GREEN};
          font-size: 14px;
        }

        .zen-floating-card span {
          color: ${MUTED};
          font-size: 11px;
        }

        .zen-section {
          padding: 88px 0;
        }

        .zen-section-light {
          background: ${LIGHT};
        }

        .zen-section-heading {
          max-width: 680px;
          margin: 0 auto 48px;
          text-align: center;
        }

        .zen-section-kicker {
          color: ${GREEN};
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .zen-section-heading h2 {
          margin: 15px 0;
          font-size: clamp(30px, 4vw, 43px);
          line-height: 1.2;
          letter-spacing: -1.5px;
        }

        .zen-section-heading p {
          margin: 0;
          color: ${MUTED};
          font-size: 15px;
          line-height: 1.8;
        }

        .zen-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 70px;
          align-items: center;
        }

        .zen-intro-copy h2 {
          margin: 14px 0 20px;
          font-size: 39px;
          line-height: 1.2;
          letter-spacing: -1.5px;
        }

        .zen-intro-copy p {
          color: ${MUTED};
          line-height: 1.9;
          font-size: 15px;
        }

        .zen-intro-panel {
          padding: 36px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(25,60,35,.05);
        }

        .zen-intro-panel-mark {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          color: white;
          background: ${GREEN};
          border-radius: 15px;
          font-size: 25px;
          font-weight: 900;
        }

        .zen-intro-panel h3 {
          margin: 22px 0 10px;
          font-size: 22px;
        }

        .zen-intro-panel p {
          color: ${MUTED};
          line-height: 1.8;
          font-size: 14px;
        }

        .zen-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .zen-service-card {
          padding: 28px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 16px;
          transition: all .25s ease;
        }

        .zen-service-card:hover {
          transform: translateY(-5px);
          border-color: #B9DCC2;
          box-shadow: 0 18px 40px rgba(20,70,35,.07);
        }

        .zen-service-number {
          color: #A5B1A8;
          font-size: 12px;
          font-weight: 800;
        }

        .zen-service-icon {
          width: 49px;
          height: 49px;
          display: grid;
          place-items: center;
          margin: 20px 0;
          color: ${GREEN};
          background: #EAF5EC;
          border-radius: 13px;
          font-size: 23px;
          font-weight: 800;
        }

        .zen-service-card h3 {
          margin: 0 0 10px;
          font-size: 18px;
        }

        .zen-service-card p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        .zen-banking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }

        .zen-banking-card {
          position: relative;
          overflow: hidden;
          min-height: 300px;
          padding: 38px;
          border-radius: 20px;
          background: ${GREEN};
          color: white;
        }

        .zen-banking-card.business {
          background: #172B1E;
        }

        .zen-banking-card small {
          color: rgba(255,255,255,.72);
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .zen-banking-card h3 {
          max-width: 360px;
          margin: 22px 0 14px;
          font-size: 30px;
          line-height: 1.2;
          letter-spacing: -1px;
        }

        .zen-banking-card p {
          max-width: 390px;
          color: rgba(255,255,255,.8);
          font-size: 14px;
          line-height: 1.8;
        }

        .zen-banking-card a {
          display: inline-flex;
          margin-top: 20px;
          color: white;
          font-weight: 800;
          font-size: 13px;
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,.7);
          padding-bottom: 5px;
        }

        .zen-banking-decoration {
          position: absolute;
          width: 180px;
          height: 180px;
          right: -55px;
          bottom: -65px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 50%;
        }

        .zen-banking-decoration::after {
          content: '';
          position: absolute;
          inset: 22px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 50%;
        }

        .zen-security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px;
        }

        .zen-security-item {
          padding: 28px;
          border-left: 3px solid ${GREEN};
          background: white;
        }

        .zen-security-item h3 {
          margin: 0 0 10px;
          font-size: 17px;
        }

        .zen-security-item p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.8;
        }

        .zen-contact {
          background: linear-gradient(120deg, #087A3D, #075D31);
          color: white;
          padding: 65px 0;
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
          font-size: 35px;
          line-height: 1.2;
          letter-spacing: -1px;
        }

        .zen-contact p {
          margin: 0;
          color: rgba(255,255,255,.8);
          font-size: 14px;
          line-height: 1.7;
        }

        .zen-contact a {
          flex-shrink: 0;
          padding: 15px 22px;
          background: white;
          color: ${DARK_GREEN};
          border-radius: 9px;
          font-weight: 800;
          font-size: 13px;
          text-decoration: none;
        }

        .zen-footer {
          padding: 65px 0 25px;
          background: #13251A;
          color: white;
        }

        .zen-footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 45px;
          padding-bottom: 45px;
        }

        .zen-footer-brand .zen-logo {
          color: white;
        }

        .zen-footer-brand p {
          max-width: 290px;
          color: #AAB8AD;
          font-size: 13px;
          line-height: 1.9;
        }

        .zen-footer-column h4 {
          margin: 0 0 19px;
          font-size: 13px;
        }

        .zen-footer-column a {
          display: block;
          margin: 12px 0;
          color: #AAB8AD;
          text-decoration: none;
          font-size: 12px;
        }

        .zen-footer-column a:hover {
          color: white;
        }

        .zen-footer-bottom {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding-top: 23px;
          border-top: 1px solid rgba(255,255,255,.12);
          color: #AAB8AD;
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .zen-hero-grid {
            grid-template-columns: 1fr;
            gap: 30px;
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

          .zen-visual {
            min-height: 390px;
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
            width: min(100% - 32px, 1180px);
          }

          .zen-nav {
            min-height: 70px;
          }

          .zen-logo {
            font-size: 20px;
          }

          .zen-logo-mark {
            width: 34px;
            height: 34px;
          }

          .zen-nav-links {
            gap: 14px;
          }

          .zen-nav-links a {
            font-size: 12px;
          }

          .zen-nav-links a:nth-child(2),
          .zen-nav-links a:nth-child(3) {
            display: none;
          }

          .zen-nav-contact {
            padding: 10px 12px;
          }

          .zen-hero {
            padding: 70px 0 55px;
          }

          .zen-hero h1 {
            font-size: 43px;
            letter-spacing: -2px;
          }

          .zen-hero-description {
            font-size: 15px;
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

          .zen-floating-card {
            right: -3px;
            bottom: 25px;
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
            font-size: 32px;
          }

          .zen-intro-panel {
            padding: 27px;
          }

          .zen-services-grid {
            grid-template-columns: 1fr;
          }

          .zen-security-grid {
            grid-template-columns: 1fr;
          }

          .zen-banking-card {
            min-height: 280px;
            padding: 28px;
          }

          .zen-banking-card h3 {
            font-size: 26px;
          }

          .zen-contact-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .zen-contact h2 {
            font-size: 29px;
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
          .zen-nav-links {
            gap: 8px;
          }

          .zen-nav-links a {
            font-size: 11px;
          }

          .zen-hero h1 {
            font-size: 37px;
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
                <Link to="/about" className="zen-button zen-button-primary">
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

            {/* Decorative banking interface illustration */}
            <div className="zen-visual">
              <div className="zen-visual-glow" />

              <div className="zen-phone">
                <div className="zen-phone-screen">
                  <div className="zen-phone-top">
                    <span>ZENIMONIES</span>
                    <span>●●●</span>
                  </div>

                  <div className="zen-phone-greeting">
                    Welcome to your banking experience
                  </div>

                  <div className="zen-phone-balance">
                    <small>ACCOUNT OVERVIEW</small>
                    <strong>NGN Account</strong>
                    <small>Manage your finances</small>
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

                  <div className="zen-phone-transaction">
                    <span>Payments</span>
                    <strong>›</strong>
                  </div>

                  <div className="zen-phone-transaction">
                    <span>Account services</span>
                    <strong>›</strong>
                  </div>

                  <div className="zen-phone-transaction">
                    <span>Business banking</span>
                    <strong>›</strong>
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

        {/* INTRODUCTION */}
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

            <div className="zen-intro-panel">
              <div className="zen-intro-panel-mark">Z</div>

              <h3>One platform. Everyday financial services.</h3>

              <p>
                Explore banking and payment services through the
                ZENIMONIES digital platform, with solutions for
                individuals and businesses.
              </p>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="zen-section zen-section-light" id="services">
          <div className="zen-container">
            <div className="zen-section-heading">
              <span className="zen-section-kicker">
                Our services
              </span>

              <h2>
                Financial services for everyday life and business.
              </h2>

              <p>
                Discover the services available through the ZENIMONIES
                platform.
              </p>
            </div>

            <div className="zen-services-grid">
              {services.map((service) => (
                <article className="zen-service-card" key={service.number}>
                  <span className="zen-service-number">
                    {service.number}
                  </span>

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

                <div className="zen-banking-decoration" />
              </article>

              <article className="zen-banking-card business">
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

                <div className="zen-banking-decoration" />
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

            <span>Digital banking and payment services in Nigeria.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
