
import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#07803F';
const DARK_GREEN = '#056B34';
const BLACK = '#172018';
const MUTED = '#66756E';
const LIGHT = '#F4F8F5';
const BORDER = '#E3EBE5';

const services = [
  {
    icon: '↗',
    title: 'Bank Transfers',
    description:
      'Convenient transfers and payment services designed to make everyday transactions easier.',
  },
  {
    icon: '▣',
    title: 'Airtime & Data',
    description:
      'Purchase mobile airtime and data for supported Nigerian mobile networks.',
  },
  {
    icon: '⚡',
    title: 'Electricity Payments',
    description:
      'Access electricity bill payment services through the ZENIMONIES platform.',
  },
  {
    icon: '▤',
    title: 'TV Subscriptions',
    description:
      'Manage supported television subscription payments from one platform.',
  },
  {
    icon: '◉',
    title: 'Personal Banking',
    description:
      'Digital account services and everyday financial tools for individual customers.',
  },
  {
    icon: '▥',
    title: 'Business Banking',
    description:
      'Digital financial tools designed to support business owners and their payment needs.',
  },
];

const About: React.FC = () => {
  return (
    <div style={styles.page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        .about-nav {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .about-nav a {
          color: #34483d;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .about-nav a:hover {
          color: #07803f;
        }

        .about-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .about-service {
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .about-service:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 32px rgba(20, 70, 43, .09);
        }

        .about-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .about-footer-links a {
          color: #d5e8dc;
          text-decoration: none;
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .about-nav {
            gap: 12px;
          }

          .about-nav a {
            font-size: 12px;
          }

          .about-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .about-hero-title {
            font-size: 36px !important;
          }

          .about-section {
            padding-top: 48px !important;
            padding-bottom: 48px !important;
          }
        }

        @media (max-width: 480px) {
          .about-nav .optional-link {
            display: none;
          }

          .about-grid {
            grid-template-columns: 1fr;
          }

          .about-hero-title {
            font-size: 31px !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.navContainer}>
          <Link to="/about" style={styles.logoLink}>
            <div style={styles.logo}>Z</div>
            <div>
              <div style={styles.logoName}>ZENIMONIES</div>
              <div style={styles.logoCaption}>DIGITAL BANKING</div>
            </div>
          </Link>

          <nav className="about-nav">
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#security" className="optional-link">Security</a>
            <a href="#contact" style={styles.contactNav}>
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            BUILT FOR NIGERIA
          </div>

          <h1 className="about-hero-title" style={styles.heroTitle}>
            Banking and payments,
            <br />
            <span style={{ color: '#9BE6B6' }}>
              made simpler.
            </span>
          </h1>

          <p style={styles.heroDescription}>
            Welcome to ZENIMONIES — a digital financial services
            platform designed to make everyday banking and payments
            more convenient for individuals and businesses in Nigeria.
          </p>

          <div style={styles.heroActions}>
            <a href="#about" style={styles.primaryButton}>
              Discover ZENIMONIES
              <span>→</span>
            </a>

            <a href="#services" style={styles.secondaryButton}>
              Explore our services
            </a>
          </div>

          <div style={styles.heroFootnote}>
            <span>🇳🇬</span>
            Proudly focused on Nigeria
            <span style={styles.heroSeparator}>•</span>
            Nigerian Naira (NGN)
          </div>
        </div>

        <div style={styles.heroDecoration}>
          <div style={styles.heroCircleOne} />
          <div style={styles.heroCircleTwo} />
          <div style={styles.heroSymbol}>Z</div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="about-section"
        style={styles.aboutSection}
      >
        <div style={styles.sectionContainer}>
          <div style={styles.sectionEyebrow}>WHO WE ARE</div>

          <h2 style={styles.sectionTitle}>
            About ZENIMONIES
          </h2>

          <p style={styles.aboutText}>
            ZENIMONIES is a Nigeria-focused digital banking and
            payments platform built to bring everyday financial
            services together in one convenient digital experience.
          </p>

          <p style={styles.aboutText}>
            Our platform is designed to serve individuals and
            businesses with digital account services, payment
            options and convenient access to supported everyday
            services.
          </p>

          <p style={styles.aboutText}>
            We aim to make financial interactions simpler,
            accessible and convenient through technology, while
            placing importance on customer experience, account
            security and responsible service delivery.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section className="about-section" style={styles.missionSection}>
        <div style={styles.missionInner}>
          <div>
            <div style={styles.lightEyebrow}>OUR PURPOSE</div>
            <h2 style={styles.missionTitle}>Our Mission</h2>
            <p style={styles.missionText}>
              To make everyday financial services easier to access
              and use by bringing useful digital banking and payment
              experiences together in one platform.
            </p>
          </div>

          <div style={styles.missionMark}>
            <span>Z</span>
            <small>ZENIMONIES</small>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section
        id="services"
        className="about-section"
        style={styles.servicesSection}
      >
        <div style={styles.sectionContainer}>
          <div style={styles.sectionEyebrow}>WHAT WE OFFER</div>

          <h2 style={styles.sectionTitle}>
            Our Services
          </h2>

          <p style={styles.sectionDescription}>
            Digital financial tools designed around everyday needs
            in Nigeria.
          </p>

          <div className="about-grid">
            {services.map((service) => (
              <div
                key={service.title}
                className="about-service"
                style={styles.serviceCard}
              >
                <div style={styles.serviceIcon}>
                  {service.icon}
                </div>

                <h3 style={styles.serviceTitle}>
                  {service.title}
                </h3>

                <p style={styles.serviceDescription}>
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section
        id="security"
        className="about-section"
        style={styles.securitySection}
      >
        <div style={styles.sectionContainer}>
          <div style={styles.sectionEyebrow}>CUSTOMER PROTECTION</div>

          <h2 style={styles.sectionTitle}>
            Security matters.
          </h2>

          <p style={styles.sectionDescription}>
            We recognise the importance of protecting customer
            accounts and personal information.
          </p>

          <div style={styles.securityGrid}>
            <div style={styles.securityItem}>
              <span style={styles.securityIcon}>✓</span>
              <div>
                <h3 style={styles.securityTitle}>
                  Identity Verification
                </h3>
                <p style={styles.securityText}>
                  Verification processes help establish customer
                  identity and support account protection.
                </p>
              </div>
            </div>

            <div style={styles.securityItem}>
              <span style={styles.securityIcon}>⌑</span>
              <div>
                <h3 style={styles.securityTitle}>
                  Account Security
                </h3>
                <p style={styles.securityText}>
                  Security measures are designed to help protect
                  customer access and account activity.
                </p>
              </div>
            </div>

            <div style={styles.securityItem}>
              <span style={styles.securityIcon}>▤</span>
              <div>
                <h3 style={styles.securityTitle}>
                  Service Notifications
                </h3>
                <p style={styles.securityText}>
                  Relevant service messages may help customers
                  receive verification codes, account alerts and
                  transaction updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NIGERIA */}
      <section style={styles.nigeriaSection}>
        <div style={styles.nigeriaInner}>
          <div style={styles.nigeriaFlag}>🇳🇬</div>
          <div>
            <h2 style={styles.nigeriaTitle}>
              Focused on Nigeria.
            </h2>
            <p style={styles.nigeriaText}>
              ZENIMONIES is focused on serving customers in Nigeria,
              with services denominated in Nigerian Naira (NGN).
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="about-section"
        style={styles.contactSection}
      >
        <div style={styles.sectionContainer}>
          <div style={styles.sectionEyebrow}>GET IN TOUCH</div>

          <h2 style={styles.sectionTitle}>
            Contact ZENIMONIES
          </h2>

          <p style={styles.sectionDescription}>
            Have a question about our platform or services?
            Our official customer support channels will provide
            assistance.
          </p>

          <div style={styles.contactNotice}>
            <strong>Official contact information</strong>
            <p style={styles.contactNoticeText}>
              Our verified business email, telephone number and
              registered business address should be published here
              once confirmed.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <Link to="/about" style={styles.footerLogoLink}>
              <div style={styles.footerLogo}>Z</div>
              <span>ZENIMONIES</span>
            </Link>

            <p style={styles.footerDescription}>
              Digital banking and payment services designed for
              everyday needs in Nigeria.
            </p>
          </div>

          <div className="about-footer-links">
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#security">Security</a>
            <a href="#contact">Contact</a>
          </div>

          <div style={styles.footerBottom}>
            © {new Date().getFullYear()} ZENIMONIES. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#FFFFFF',
    color: BLACK,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  header: {
    background: WHITE,
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },

  navContainer: {
    width: 'min(1160px, 92%)',
    height: 76,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },

  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    textDecoration: 'none',
  },

  logo: {
    width: 43,
    height: 43,
    borderRadius: 13,
    background: `linear-gradient(135deg, ${GREEN}, ${DARK_GREEN})`,
    color: WHITE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 900,
  },

  logoName: {
    color: '#063B2D',
    fontSize: 17,
    fontWeight: 900,
    letterSpacing: 0.2,
  },

  logoCaption: {
    color: '#8B9991',
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: 800,
    marginTop: 3,
  },

  contactNav: {
    background: '#EAF6EE',
    color: DARK_GREEN,
    padding: '11px 16px',
    borderRadius: 10,
  },

  hero: {
    minHeight: 440,
    background: `linear-gradient(115deg, #045D32 0%, ${GREEN} 65%, #09934B 100%)`,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
  },

  heroInner: {
    width: 'min(1160px, 92%)',
    margin: '0 auto',
    padding: '76px 0',
    position: 'relative',
    zIndex: 2,
  },

  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    color: '#D7F4E2',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 2,
    marginBottom: 22,
  },

  eyebrowDot: {
    width: 8,
    height: 8,
    background: '#9BE6B6',
    borderRadius: '50%',
  },

  heroTitle: {
    color: WHITE,
    fontSize: 51,
    lineHeight: 1.12,
    letterSpacing: -1.7,
    fontWeight: 900,
    margin: 0,
    maxWidth: 680,
  },

  heroDescription: {
    color: '#E2F4E8',
    fontSize: 16,
    lineHeight: 1.8,
    maxWidth: 590,
    marginTop: 23,
  },

  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 29,
  },

  primaryButton: {
    background: WHITE,
    color: DARK_GREEN,
    textDecoration: 'none',
    borderRadius: 11,
    padding: '14px 19px',
    fontWeight: 900,
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
  },

  secondaryButton: {
    border: '1px solid rgba(255,255,255,.45)',
    color: WHITE,
    textDecoration: 'none',
    borderRadius: 11,
    padding: '13px 18px',
    fontWeight: 800,
    fontSize: 13,
  },

  heroFootnote: {
    color: '#D7F4E2',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 9,
    fontSize: 12,
    marginTop: 30,
    fontWeight: 700,
  },

  heroSeparator: {
    opacity: 0.7,
  },

  heroDecoration: {
    position: 'absolute',
    right: '-30px',
    top: 0,
    width: '44%',
    height: '100%',
    pointerEvents: 'none',
  },

  heroCircleOne: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,.13)',
    right: 20,
    top: 20,
  },

  heroCircleTwo: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,.17)',
    right: 85,
    top: 85,
  },

  heroSymbol: {
    position: 'absolute',
    right: 135,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,.10)',
    fontSize: 240,
    fontWeight: 900,
  },

  aboutSection: {
    padding: '78px 0',
    background: WHITE,
  },

  sectionContainer: {
    width: 'min(1050px, 90%)',
    margin: '0 auto',
  },

  sectionEyebrow: {
    color: GREEN,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 2,
    marginBottom: 13,
  },

  sectionTitle: {
    color: '#103D2B',
    fontSize: 33,
    lineHeight: 1.2,
    fontWeight: 900,
    letterSpacing: -0.7,
    margin: '0 0 19px',
  },

  aboutText: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 1.9,
    maxWidth: 850,
    margin: '0 0 15px',
  },

  missionSection: {
    background: LIGHT,
    padding: '65px 0',
  },

  missionInner: {
    width: 'min(1050px, 90%)',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 30,
  },

  lightEyebrow: {
    color: GREEN,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 2,
  },

  missionTitle: {
    color: '#103D2B',
    fontSize: 32,
    fontWeight: 900,
    margin: '12px 0',
  },

  missionText: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 1.8,
    maxWidth: 650,
    margin: 0,
  },

  missionMark: {
    width: 125,
    height: 125,
    minWidth: 125,
    borderRadius: 30,
    background: GREEN,
    color: WHITE,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 30px rgba(7,128,63,.18)',
  },

  servicesSection: {
    background: WHITE,
  },

  sectionDescription: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 1.8,
    maxWidth: 650,
    margin: '0 0 30px',
  },

  serviceCard: {
    background: WHITE,
    border: `1px solid ${BORDER}`,
    borderRadius: 17,
    padding: 22,
    minHeight: 205,
    boxShadow: '0 6px 20px rgba(20,70,43,.035)',
  },

  serviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    background: '#E9F7EE',
    color: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 900,
    marginBottom: 17,
  },

  serviceTitle: {
    color: '#103D2B',
    fontSize: 17,
    fontWeight: 900,
    margin: '0 0 9px',
  },

  serviceDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 1.75,
    margin: 0,
  },

  securitySection: {
    background: LIGHT,
  },

  securityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginTop: 28,
  },

  securityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: 19,
    background: WHITE,
    border: `1px solid ${BORDER}`,
    borderRadius: 15,
  },

  securityIcon: {
    width: 38,
    height: 38,
    minWidth: 38,
    borderRadius: 11,
    background: '#E8F7EE',
    color: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    fontWeight: 900,
  },

  securityTitle: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: 900,
    margin: '0 0 7px',
  },

  securityText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 1.7,
    margin: 0,
  },

  nigeriaSection: {
    background: '#EAF6EE',
    padding: '40px 0',
  },

  nigeriaInner: {
    width: 'min(1050px, 90%)',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },

  nigeriaFlag: {
    fontSize: 40,
  },

  nigeriaTitle: {
    color: '#103D2B',
    fontSize: 23,
    fontWeight: 900,
    margin: '0 0 7px',
  },

  nigeriaText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
  },

  contactSection: {
    background: WHITE,
  },

  contactNotice: {
    background: LIGHT,
    border: `1px solid ${BORDER}`,
    borderRadius: 15,
    padding: 22,
    color: '#103D2B',
    maxWidth: 650,
  },

  contactNoticeText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 1.7,
    margin: '8px 0 0',
  },

  footer: {
    background: '#073B2A',
    color: WHITE,
    padding: '42px 0 20px',
  },

  footerInner: {
    width: 'min(1050px, 90%)',
    margin: '0 auto',
  },

  footerLogoLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    color: WHITE,
    textDecoration: 'none',
    fontWeight: 900,
    letterSpacing: 0.7,
  },

  footerLogo: {
    width: 35,
    height: 35,
    borderRadius: 10,
    background: GREEN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },

  footerDescription: {
    color: '#B8D1C2',
    fontSize: 13,
    lineHeight: 1.7,
    maxWidth: 380,
    margin: '15px 0 25px',
  },

  footerBottom: {
    borderTop: '1px solid rgba(255,255,255,.15)',
    paddingTop: 18,
    marginTop: 27,
    color: '#B8D1C2',
    fontSize: 11,
  },
};

export default About;
