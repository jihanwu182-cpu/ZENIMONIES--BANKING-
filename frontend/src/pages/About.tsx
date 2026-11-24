
import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#07803F';
const DARK_GREEN = '#07552F';
const DARK = '#17251C';
const MUTED = '#68736B';
const BORDER = '#E7ECE8';
const LIGHT = '#F7F9F7';

const companyServices = [
  {
    icon: '⌘',
    title: 'Digital Technology',
    description:
      'Digital technology solutions designed to support modern business and customer needs.',
  },
  {
    icon: '⇄',
    title: 'Digital Banking',
    description:
      'A convenient digital platform bringing essential account and payment services together.',
  },
  {
    icon: '▤',
    title: 'Payment Services',
    description:
      'Access supported transfers, airtime, data and essential bill payment services.',
  },
  {
    icon: '⌘',
    title: 'Software Development',
    description:
      'Software development and digital solutions focused on practical business requirements.',
  },
  {
    icon: '◎',
    title: 'Customer Integration',
    description:
      'Online integration services designed to connect digital experiences and customer needs.',
  },
  {
    icon: '▦',
    title: 'Business Solutions',
    description:
      'Digital services and technology solutions supporting individuals and businesses.',
  },
];

const About: React.FC = () => {
  return (
    <div className="zen-about">
      <style>{`
        .zen-about {
          min-height: 100vh;
          background: #fff;
          color: ${DARK};
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", Arial, sans-serif;
        }

        .zen-about * {
          box-sizing: border-box;
        }

        .zen-about-container {
          width: min(1160px, calc(100% - 48px));
          margin: 0 auto;
        }

        .zen-about a {
          transition: .2s ease;
        }

        .zen-about-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid ${BORDER};
          backdrop-filter: blur(12px);
        }

        .zen-about-nav {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .zen-about-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: ${DARK};
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -.8px;
          text-decoration: none;
        }

        .zen-about-logo-mark {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #EDF5EF;
          color: ${GREEN};
          font-size: 21px;
        }

        .zen-about-nav-links {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .zen-about-nav-links a {
          color: #4D5950;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        .zen-about-nav-links a:hover {
          color: ${GREEN};
        }

        .zen-about-nav-links .zen-about-nav-cta {
          padding: 11px 17px;
          color: ${GREEN};
          border: 1px solid ${GREEN};
          border-radius: 7px;
        }

        .zen-about-hero {
          padding: 78px 0;
          background: ${LIGHT};
          border-bottom: 1px solid ${BORDER};
        }

        .zen-about-hero-inner {
          max-width: 850px;
          text-align: center;
          margin: 0 auto;
        }

        .zen-about-eyebrow {
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.6px;
          text-transform: uppercase;
        }

        .zen-about-hero h1 {
          margin: 19px 0;
          color: ${DARK};
          font-size: clamp(36px, 5vw, 54px);
          line-height: 1.13;
          letter-spacing: -2px;
        }

        .zen-about-hero h1 span {
          color: ${GREEN};
        }

        .zen-about-hero p {
          max-width: 690px;
          margin: 0 auto;
          color: ${MUTED};
          font-size: 15px;
          line-height: 1.9;
        }

        .zen-about-section {
          padding: 78px 0;
        }

        .zen-about-light {
          background: ${LIGHT};
        }

        .zen-about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 55px;
        }

        .zen-about-copy h2 {
          margin: 15px 0;
          color: ${DARK};
          font-size: 36px;
          line-height: 1.2;
          letter-spacing: -1.3px;
        }

        .zen-about-copy p {
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.95;
        }

        .zen-about-company-card {
          padding: 32px;
          background: #fff;
          border: 1px solid ${BORDER};
          border-radius: 15px;
          box-shadow: 0 12px 35px rgba(20,40,25,.035);
        }

        .zen-about-company-card h3 {
          margin: 0 0 20px;
          font-size: 20px;
        }

        .zen-about-detail {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid ${BORDER};
          font-size: 12px;
        }

        .zen-about-detail:last-child {
          border-bottom: none;
        }

        .zen-about-detail span:first-child {
          color: ${MUTED};
        }

        .zen-about-detail strong {
          color: ${DARK};
          text-align: right;
        }

        .zen-about-heading {
          max-width: 700px;
          margin: 0 auto 38px;
          text-align: center;
        }

        .zen-about-heading h2 {
          margin: 13px 0;
          font-size: 35px;
          line-height: 1.2;
          letter-spacing: -1.1px;
        }

        .zen-about-heading p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.85;
        }

        .zen-about-services {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 17px;
        }

        .zen-about-service {
          padding: 25px;
          border: 1px solid ${BORDER};
          border-radius: 13px;
          background: #fff;
          transition: .2s ease;
        }

        .zen-about-service:hover {
          transform: translateY(-3px);
          border-color: #BBD9C2;
        }

        .zen-about-service-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          margin-bottom: 17px;
          background: #EDF5EF;
          border-radius: 10px;
          color: ${GREEN};
          font-size: 19px;
        }

        .zen-about-service h3 {
          margin: 0 0 9px;
          font-size: 15px;
        }

        .zen-about-service p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.8;
        }

        .zen-about-purpose-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .zen-about-purpose {
          padding: 33px;
          background: white;
          border: 1px solid ${BORDER};
          border-radius: 14px;
        }

        .zen-about-purpose h3 {
          margin: 0 0 14px;
          color: ${GREEN};
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 1.3px;
          text-transform: uppercase;
        }

        .zen-about-purpose p {
          margin: 0;
          color: ${DARK};
          font-size: 17px;
          font-weight: 650;
          line-height: 1.75;
        }

        .zen-about-values {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .zen-about-value {
          padding: 22px;
          background: #fff;
          border: 1px solid ${BORDER};
          border-radius: 12px;
        }

        .zen-about-value strong {
          display: block;
          margin-bottom: 9px;
          font-size: 14px;
        }

        .zen-about-value p {
          margin: 0;
          color: ${MUTED};
          font-size: 11px;
          line-height: 1.8;
        }

        .zen-about-contact {
          padding: 78px 0;
          background: #fff;
        }

        .zen-about-contact-grid {
          display: grid;
          grid-template-columns: .9fr 1.1fr;
          gap: 45px;
          align-items: start;
        }

        .zen-about-contact-copy h2 {
          margin: 14px 0;
          font-size: 36px;
          line-height: 1.2;
          letter-spacing: -1px;
        }

        .zen-about-contact-copy p {
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.9;
        }

        .zen-about-contact-card {
          padding: 30px;
          background: ${LIGHT};
          border: 1px solid ${BORDER};
          border-radius: 14px;
        }

        .zen-about-contact-row {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 17px 0;
          border-bottom: 1px solid ${BORDER};
        }

        .zen-about-contact-row:last-child {
          border-bottom: none;
        }

        .zen-about-contact-icon {
          flex: 0 0 39px;
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          background: #EAF4ED;
          color: ${GREEN};
          border-radius: 9px;
          font-size: 17px;
        }

        .zen-about-contact-row small {
          display: block;
          margin-bottom: 6px;
          color: ${MUTED};
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .8px;
        }

        .zen-about-contact-row a,
        .zen-about-contact-row strong {
          color: ${DARK};
          font-size: 13px;
          line-height: 1.7;
          font-weight: 750;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .zen-about-contact-row a:hover {
          color: ${GREEN};
        }

        .zen-about-contact-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .zen-about-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 17px;
          border-radius: 7px;
          background: ${GREEN};
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .zen-about-button:hover {
          background: ${DARK_GREEN};
        }

        .zen-about-button-outline {
          background: #fff;
          color: ${GREEN};
          border: 1px solid ${GREEN};
        }

        .zen-about-button-outline:hover {
          background: #EDF5EF;
        }

        .zen-about-footer {
          padding: 40px 0 20px;
          background: #14251B;
          color: #fff;
        }

        .zen-about-footer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
          padding-bottom: 27px;
        }

        .zen-about-footer-brand {
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -.6px;
        }

        .zen-about-footer-brand span {
          color: #73D495;
        }

        .zen-about-footer p {
          max-width: 420px;
          color: #C1CDC4;
          font-size: 11px;
          line-height: 1.8;
        }

        .zen-about-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .zen-about-footer-links a {
          color: #C1CDC4;
          font-size: 11px;
          text-decoration: none;
        }

        .zen-about-footer-links a:hover {
          color: #fff;
        }

        .zen-about-footer-bottom {
          padding-top: 18px;
          border-top: 1px solid #34483A;
          color: #AAB9AE;
          font-size: 10px;
          line-height: 1.7;
        }

        @media (max-width: 800px) {
          .zen-about-grid,
          .zen-about-contact-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .zen-about-values {
            grid-template-columns: 1fr 1fr;
          }

          .zen-about-services {
            grid-template-columns: 1fr 1fr;
          }

          .zen-about-footer-top {
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .zen-about-container {
            width: calc(100% - 36px);
          }

          .zen-about-nav {
            min-height: 66px;
          }

          .zen-about-logo {
            font-size: 17px;
          }

          .zen-about-nav-links {
            gap: 12px;
          }

          .zen-about-nav-links a {
            font-size: 10px;
          }

          .zen-about-nav-links a:nth-child(2) {
            display: none;
          }

          .zen-about-hero {
            padding: 58px 0;
          }

          .zen-about-hero h1 {
            font-size: 36px;
            letter-spacing: -1.4px;
          }

          .zen-about-hero p {
            font-size: 13px;
          }

          .zen-about-section,
          .zen-about-contact {
            padding: 58px 0;
          }

          .zen-about-copy h2,
          .zen-about-contact-copy h2 {
            font-size: 29px;
          }

          .zen-about-heading h2 {
            font-size: 28px;
          }

          .zen-about-services,
          .zen-about-purpose-grid {
            grid-template-columns: 1fr;
          }

          .zen-about-values {
            grid-template-columns: 1fr 1fr;
          }

          .zen-about-company-card,
          .zen-about-contact-card {
            padding: 21px;
          }

          .zen-about-detail {
            font-size: 10px;
          }

          .zen-about-purpose {
            padding: 25px;
          }

          .zen-about-purpose p {
            font-size: 15px;
          }

          .zen-about-footer-links {
            gap: 14px;
          }
        }

        @media (max-width: 360px) {
          .zen-about-values {
            grid-template-columns: 1fr;
          }

          .zen-about-nav-links a:nth-child(1) {
            display: none;
          }
        }
      `}</style>

      {/* HEADER */}

      <header className="zen-about-header">
        <div className="zen-about-container zen-about-nav">
          <Link to="/" className="zen-about-logo">
            <span className="zen-about-logo-mark">Z</span>
            ZENIMONIES
          </Link>

          <nav className="zen-about-nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
            <a href="#company-services">Services</a>
            <a href="#company-contact" className="zen-about-nav-cta">
              Contact Us
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}

        <section className="zen-about-hero">
          <div className="zen-about-container zen-about-hero-inner">
            <div className="zen-about-eyebrow">
              Company Profile
            </div>

            <h1>
              About <span>ZENIMONIES</span>
            </h1>

            <p>
              ZENIMONIES DIGITAL SERVICES LIMITED is a Nigerian
              technology company focused on digital technology,
              software development, online integration services
              and convenient digital financial experiences.
            </p>
          </div>
        </section>

        {/* COMPANY OVERVIEW */}

        <section className="zen-about-section">
          <div className="zen-about-container zen-about-grid">
            <div className="zen-about-copy">
              <div className="zen-about-eyebrow">
                Who We Are
              </div>

              <h2>
                Technology-led solutions for a connected digital future.
              </h2>

              <p>
                ZENIMONIES DIGITAL SERVICES LIMITED is committed
                to developing practical digital solutions that
                support modern customer and business requirements.
              </p>

              <p>
                Our work encompasses digital technology,
                customer online integration services, software
                development and related technology solutions.
              </p>

              <p>
                Through the ZENIMONIES platform, we are focused
                on bringing essential account and payment
                services into a convenient digital experience
                for individuals and businesses across Nigeria.
              </p>
            </div>

            <div className="zen-about-company-card">
              <h3>Corporate Information</h3>

              <div className="zen-about-detail">
                <span>Registered Company</span>
                <strong>ZENIMONIES DIGITAL SERVICES LIMITED</strong>
              </div>

              <div className="zen-about-detail">
                <span>Registration Number</span>
                <strong>RC 9974898</strong>
              </div>

              <div className="zen-about-detail">
                <span>Company Type</span>
                <strong>Private Company Limited by Shares</strong>
              </div>

              <div className="zen-about-detail">
                <span>Registration Country</span>
                <strong>Nigeria</strong>
              </div>

              <div className="zen-about-detail">
                <span>Company Status</span>
                <strong>Active</strong>
              </div>
            </div>
          </div>
        </section>

        {/* COMPANY SERVICES */}

        <section
          className="zen-about-section zen-about-light"
          id="company-services"
        >
          <div className="zen-about-container">
            <div className="zen-about-heading">
              <div className="zen-about-eyebrow">
                What We Do
              </div>

              <h2>
                Our Business and Technology Services
              </h2>

              <p>
                Our company activities focus on technology,
                software solutions, online integration and
                digital services.
              </p>
            </div>

            <div className="zen-about-services">
              {companyServices.map((service) => (
                <article
                  className="zen-about-service"
                  key={service.title}
                >
                  <div className="zen-about-service-icon">
                    {service.icon}
                  </div>

                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* MISSION AND VISION */}

        <section className="zen-about-section">
          <div className="zen-about-container">
            <div className="zen-about-heading">
              <div className="zen-about-eyebrow">
                Our Direction
              </div>

              <h2>
                Our Mission and Vision
              </h2>

              <p>
                The principles guiding our approach to digital
                services and technology development.
              </p>
            </div>

            <div className="zen-about-purpose-grid">
              <article className="zen-about-purpose">
                <h3>Our Mission</h3>
                <p>
                  To develop accessible and practical digital
                  solutions that simplify everyday financial
                  activities and support the evolving needs
                  of individuals and businesses.
                </p>
              </article>

              <article className="zen-about-purpose">
                <h3>Our Vision</h3>
                <p>
                  To build a trusted digital services platform
                  recognised for convenience, innovation and
                  meaningful technology-driven experiences.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* VALUES */}

        <section className="zen-about-section zen-about-light">
          <div className="zen-about-container">
            <div className="zen-about-heading">
              <div className="zen-about-eyebrow">
                Our Principles
              </div>

              <h2>
                The Values That Guide Us
              </h2>

              <p>
                We aim to reflect these principles in the
                services we develop and the experiences
                we deliver.
              </p>
            </div>

            <div className="zen-about-values">
              <div className="zen-about-value">
                <strong>Innovation</strong>
                <p>
                  Continuously explore useful technology
                  and better digital solutions.
                </p>
              </div>

              <div className="zen-about-value">
                <strong>Convenience</strong>
                <p>
                  Make essential digital services easier
                  to access and use.
                </p>
              </div>

              <div className="zen-about-value">
                <strong>Responsibility</strong>
                <p>
                  Encourage responsible service access
                  and informed customer decisions.
                </p>
              </div>

              <div className="zen-about-value">
                <strong>Customer Focus</strong>
                <p>
                  Develop experiences around practical
                  customer and business needs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT INFORMATION */}

        <section
          className="zen-about-contact"
          id="company-contact"
        >
          <div className="zen-about-container zen-about-contact-grid">
            <div className="zen-about-contact-copy">
              <div className="zen-about-eyebrow">
                Contact the Company
              </div>

              <h2>
                We welcome your enquiries.
              </h2>

              <p>
                For company enquiries, customer assistance
                and information about ZENIMONIES services,
                please contact our official company support
                channels.
              </p>

              <p>
                Our team can be reached through the company
                telephone number and official support email.
              </p>
            </div>

            <div className="zen-about-contact-card">
              <div className="zen-about-contact-row">
                <span className="zen-about-contact-icon">☎</span>

                <div>
                  <small>Company Telephone</small>
                  <a href="tel:+2349020258550">
                    +234 902 025 8550
                  </a>
                </div>
              </div>

              <div className="zen-about-contact-row">
                <span className="zen-about-contact-icon">✉</span>

                <div>
                  <small>Official Company Email</small>
                  <a href="mailto:support@zenimonies.com">
                    support@zenimonies.com
                  </a>
                </div>
              </div>

              <div className="zen-about-contact-row">
                <span className="zen-about-contact-icon">⌖</span>

                <div>
                  <small>Registered Office</small>
                  <strong>
                    No. 8, 3Brimoh Bello Street,
                    Benin City, Edo State, Nigeria.
                  </strong>
                </div>
              </div>

              <div className="zen-about-contact-actions">
                <a
                  href="tel:+2349020258550"
                  className="zen-about-button"
                >
                  Call Our Company
                </a>

                <a
                  href="mailto:support@zenimonies.com"
                  className="zen-about-button zen-about-button-outline"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer className="zen-about-footer">
        <div className="zen-about-container">
          <div className="zen-about-footer-top">
            <div>
              <div className="zen-about-footer-brand">
                ZENI<span>MONIES</span>
              </div>

              <p>
                ZENIMONIES DIGITAL SERVICES LIMITED
                <br />
                Digital technology, software development
                and digital services in Nigeria.
              </p>
            </div>

            <nav className="zen-about-footer-links">
              <Link to="/">Home</Link>
              <Link to="/about">About Us</Link>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
              <a href="#company-contact">Contact</a>
            </nav>
          </div>

          <div className="zen-about-footer-bottom">
            © {new Date().getFullYear()} ZENIMONIES DIGITAL
            SERVICES LIMITED. All rights reserved.
            <br />
            RC 9974898 | Nigeria
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
