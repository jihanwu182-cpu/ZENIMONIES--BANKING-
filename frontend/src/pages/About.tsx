

import React from 'react';
import { Link } from 'react-router-dom';

const GREEN = '#07803F';
const DARK = '#056B34';
const DEEP = '#073B2A';
const TEXT = '#172018';
const MUTED = '#66756E';
const LIGHT = '#F4F8F5';
const BORDER = '#E3EBE5';
const WHITE = '#FFFFFF';

const services = [
  {
    icon: '↗',
    title: 'Bank Transfers',
    text: 'Convenient transfer and payment services for everyday financial activities.',
  },
  {
    icon: '▣',
    title: 'Airtime & Data',
    text: 'Purchase airtime and data for supported Nigerian mobile networks.',
  },
  {
    icon: '⚡',
    title: 'Electricity Payments',
    text: 'Pay supported electricity bills through the ZENIMONIES platform.',
  },
  {
    icon: '▤',
    title: 'TV Subscriptions',
    text: 'Access supported television subscription payment services.',
  },
  {
    icon: '◉',
    title: 'Personal Banking',
    text: 'Digital account services and everyday financial tools for individuals.',
  },
  {
    icon: '▥',
    title: 'Business Banking',
    text: 'Digital financial tools and payment services for businesses.',
  },
];

const About: React.FC = () => {
  return (
    <div style={s.page}>
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        .zm-container {
          width: min(1160px, 92%);
          margin: 0 auto;
        }

        .zm-nav {
          display: flex;
          align-items: center;
          gap: 27px;
        }

        .zm-nav a {
          text-decoration: none;
          color: #34483d;
          font-size: 13px;
          font-weight: 700;
        }

        .zm-nav a:hover { color: ${GREEN}; }

        .zm-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 21px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          transition: .2s ease;
        }

        .zm-button:hover { transform: translateY(-2px); }

        .zm-primary {
          color: ${DARK};
          background: ${WHITE};
        }

        .zm-outline {
          color: ${WHITE};
          border: 1px solid rgba(255,255,255,.55);
        }

        .zm-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 19px;
        }

        .zm-card {
          border: 1px solid ${BORDER};
          background: ${WHITE};
          border-radius: 15px;
          padding: 25px;
          min-height: 205px;
          transition: .2s ease;
        }

        .zm-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(20,70,43,.09);
        }

        .zm-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 17px;
        }

        .zm-footer-links a {
          color: #D5E8DC;
          text-decoration: none;
          font-size: 13px;
        }

        .zm-footer-links a:hover { color: white; }

        .zm-access {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 23px;
        }

        @media(max-width: 850px) {
          .zm-nav { gap: 14px; }
          .zm-nav a { font-size: 12px; }
          .zm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .zm-hero-title { font-size: 43px !important; }
          .zm-hero-decoration { opacity: .35; }
        }

        @media(max-width: 560px) {
          .zm-nav { gap: 11px; }
          .zm-nav .zm-optional { display: none; }
          .zm-grid { grid-template-columns: 1fr; }
          .zm-hero-title { font-size: 35px !important; }
          .zm-section { padding-top: 53px !important; padding-bottom: 53px !important; }
          .zm-mission-inner { flex-direction: column; align-items: flex-start !important; }
          .zm-hero { min-height: 490px !important; }
        }
      `}</style>

      {/* NAVIGATION */}
      <header style={s.header}>
        <div className="zm-container" style={s.nav}>
          <Link to="/" style={s.logoLink}>
            <div style={s.logo}>Z</div>
            <div>
              <div style={s.logoName}>ZENIMONIES</div>
              <div style={s.logoCaption}>BANKING & PAYMENTS</div>
            </div>
          </Link>

          <nav className="zm-nav">
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#business" className="zm-optional">Business</a>
            <a href="#security" className="zm-optional">Security</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="zm-hero" style={s.hero}>
        <div className="zm-container" style={s.heroInner}>
          <div style={s.eyebrow}>
            <span style={s.dot} />
            DIGITAL FINANCIAL SERVICES IN NIGERIA
          </div>

          <h1 className="zm-hero-title" style={s.heroTitle}>
            Your money.
            <br />
            Your business.
            <br />
            <span style={{ color: '#A8E9BD' }}>
              Your possibilities.
            </span>
          </h1>

          <p style={s.heroText}>
            Discover ZENIMONIES — a digital financial services
            platform bringing everyday banking and payment
            experiences together for individuals and businesses
            in Nigeria.
          </p>

          <div style={s.heroButtons}>
            <a href="#services" className="zm-button zm-primary">
              Explore our services <span>→</span>
            </a>
            <a href="#about" className="zm-button zm-outline">
              Discover ZENIMONIES
            </a>
          </div>

          <div style={s.heroFootnote}>
            🇳🇬 &nbsp; Serving Nigeria &nbsp; • &nbsp; Nigerian Naira (NGN)
          </div>
        </div>

        <div className="zm-hero-decoration" style={s.heroDecoration}>
          <div style={s.circleOne} />
          <div style={s.circleTwo} />
          <div style={s.heroLetter}>Z</div>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section id="about" className="zm-section" style={s.section}>
        <div className="zm-container">
          <div style={s.eyebrowDark}>ABOUT ZENIMONIES</div>
          <h2 style={s.heading}>
            A simpler way to manage everyday financial services.
          </h2>
          <p style={s.bodyText}>
            ZENIMONIES is a Nigeria-focused digital banking and
            payments platform designed to bring useful financial
            services together in one convenient digital experience.
          </p>
          <p style={s.bodyText}>
            We are building digital experiences for individuals
            and businesses, with services that include account
            access, transfers and supported everyday payments.
          </p>
          <p style={s.bodyText}>
            Our goal is to make everyday financial interactions
            more convenient through technology and thoughtful
            customer experiences.
          </p>
        </div>
      </section>

      {/* PERSONAL BANKING */}
      <section className="zm-section" style={s.personalSection}>
        <div className="zm-container" style={s.split}>
          <div>
            <div style={s.eyebrowDark}>FOR INDIVIDUALS</div>
            <h2 style={s.heading}>Personal banking for everyday life.</h2>
            <p style={s.bodyText}>
              Access digital account services and supported payment
              features designed around your everyday financial needs.
            </p>
            <a href="#services" style={s.textLink}>
              Explore personal services →
            </a>
          </div>
          <div style={s.featurePanel}>
            <div style={s.featureIcon}>◉</div>
            <h3 style={s.featureTitle}>Everyday banking, connected.</h3>
            <p style={s.featureText}>
              Transfers, airtime, data and supported bill payments
              through the ZENIMONIES platform.
            </p>
          </div>
        </div>
      </section>

      {/* BUSINESS BANKING */}
      <section id="business" className="zm-section" style={s.section}>
        <div className="zm-container" style={s.split}>
          <div style={s.businessPanel}>
            <div style={s.businessSymbol}>▥</div>
            <div style={s.businessLabel}>ZENIMONIES BUSINESS</div>
            <div style={s.businessWords}>
              Financial tools for business activities.
            </div>
          </div>
          <div>
            <div style={s.eyebrowDark}>FOR BUSINESSES</div>
            <h2 style={s.heading}>Built with businesses in mind.</h2>
            <p style={s.bodyText}>
              ZENIMONIES Business is designed to support business
              owners with digital account services and payment
              tools for their business activities.
            </p>
            <p style={s.bodyText}>
              Business customers can access business banking
              features, with POS services available as a separate
              business offering.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="zm-section" style={s.servicesSection}>
        <div className="zm-container">
          <div style={s.eyebrowDark}>OUR PLATFORM</div>
          <h2 style={s.heading}>Services for everyday needs.</h2>
          <p style={s.sectionLead}>
            Explore the digital financial services available
            through the ZENIMONIES platform.
          </p>

          <div className="zm-grid">
            {services.map((item) => (
              <div className="zm-card" key={item.title}>
                <div style={s.serviceIcon}>{item.icon}</div>
                <h3 style={s.cardTitle}>{item.title}</h3>
                <p style={s.cardText}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MISSION AND VISION */}
      <section className="zm-section" style={s.mission}>
        <div className="zm-container">
          <div className="zm-mission-inner" style={s.missionInner}>
            <div style={{ flex: 1 }}>
              <div style={s.lightEyebrow}>OUR PURPOSE</div>
              <h2 style={s.missionTitle}>Our Mission</h2>
              <p style={s.missionText}>
                To make everyday financial services easier to access
                and use by bringing useful digital banking and
                payment experiences together in one platform.
              </p>
              <div style={s.missionDivider} />
              <h2 style={s.missionTitle}>Our Vision</h2>
              <p style={s.missionText}>
                To build a trusted and convenient digital financial
                services experience for individuals and businesses
                across Nigeria.
              </p>
            </div>
            <div style={s.missionMark}>
              <span style={{ fontSize: 65, fontWeight: 900 }}>Z</span>
              <span style={{ fontSize: 10, letterSpacing: 2 }}>ZENIMONIES</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="zm-section" style={s.section}>
        <div className="zm-container">
          <div style={s.eyebrowDark}>CUSTOMER PROTECTION</div>
          <h2 style={s.heading}>Security is important.</h2>
          <p style={s.sectionLead}>
            We recognise the importance of customer account
            protection, identity verification and responsible
            handling of personal information.
          </p>

          <div style={s.securityGrid}>
            {[
              ['✓', 'Identity Verification', 'Verification processes help establish customer identity and support account protection.'],
              ['⌑', 'Account Access', 'Account access and security features are designed to help protect customer accounts.'],
              ['▤', 'Service Notifications', 'Relevant messages may be used for verification codes, account alerts and transaction updates.'],
            ].map(([icon, title, text]) => (
              <div style={s.securityCard} key={title}>
                <div style={s.securityIcon}>{icon}</div>
                <div>
                  <h3 style={s.cardTitle}>{title}</h3>
                  <p style={s.cardText}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NIGERIA */}
      <section style={s.nigeria}>
        <div className="zm-container" style={s.nigeriaInner}>
          <div style={{ fontSize: 43 }}>🇳🇬</div>
          <div>
            <h2 style={s.nigeriaTitle}>Focused on Nigeria.</h2>
            <p style={s.bodyText}>
              ZENIMONIES is focused on serving customers in Nigeria,
              with services denominated in Nigerian Naira (NGN).
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="zm-section" style={s.section}>
        <div className="zm-container">
          <div style={s.eyebrowDark}>CUSTOMER SUPPORT</div>
          <h2 style={s.heading}>We're here to help.</h2>
          <p style={s.sectionLead}>
            For assistance with ZENIMONIES services, customers
            should use the official support channels provided
            within the platform.
          </p>
          <div style={s.contactPanel}>
            <div style={s.contactIcon}>?</div>
            <div>
              <h3 style={s.cardTitle}>Need assistance?</h3>
              <p style={s.cardText}>
                Sign in to access the available customer support
                options for your account.
              </p>
              <Link to="/login" style={s.greenTextLink}>
                Customer login →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER ACCESS — INTENTIONALLY NEAR BOTTOM */}
      <section style={s.accessSection}>
        <div className="zm-container" style={s.accessInner}>
          <div>
            <div style={s.lightEyebrow}>GET STARTED WITH ZENIMONIES</div>
            <h2 style={s.accessTitle}>Your ZENIMONIES journey starts here.</h2>
            <p style={s.accessText}>
              Access your account or create an account to get started.
            </p>
          </div>
          <div className="zm-access">
            <Link to="/login" style={s.accessLogin}>Login to your account</Link>
            <Link to="/register" style={s.accessRegister}>Create an account →</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div className="zm-container">
          <div style={s.footerGrid}>
            <div>
              <Link to="/" style={s.footerLogoLink}>
                <div style={s.footerLogo}>Z</div>
                <span>ZENIMONIES</span>
              </Link>
              <p style={s.footerDescription}>
                Digital banking and payment services designed
                for everyday needs in Nigeria.
              </p>
            </div>

            <div>
              <h4 style={s.footerHeading}>Company</h4>
              <div style={s.footerColumn}>
                <a href="#about">About us</a>
                <a href="#business">Business banking</a>
                <a href="#security">Security</a>
                <a href="#contact">Contact</a>
              </div>
            </div>

            <div>
              <h4 style={s.footerHeading}>Services</h4>
              <div style={s.footerColumn}>
                <a href="#services">Personal banking</a>
                <a href="#services">Bank transfers</a>
                <a href="#services">Airtime & data</a>
                <a href="#services">Bill payments</a>
              </div>
            </div>

            <div>
              <h4 style={s.footerHeading}>Customer access</h4>
              <div style={s.footerColumn}>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
                <a href="#contact">Customer support</a>
              </div>
            </div>
          </div>

          <div style={s.footerBottom}>
            <span>© {new Date().getFullYear()} ZENIMONIES. All rights reserved.</span>
            <span>Nigeria · NGN</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: WHITE,
    color: TEXT,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
  header: {
    background: WHITE,
    borderBottom: `1px solid ${BORDER}`,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  nav: {
    height: 76,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  logoLink: { display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' },
  logo: {
    width: 43, height: 43, borderRadius: 12,
    background: `linear-gradient(135deg, ${GREEN}, ${DARK})`,
    color: WHITE, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 24, fontWeight: 900,
  },
  logoName: { color: DEEP, fontSize: 17, fontWeight: 900, letterSpacing: .5 },
  logoCaption: { color: '#8B9991', fontSize: 9, letterSpacing: 1.6, fontWeight: 800, marginTop: 3 },
  hero: {
    minHeight: 540,
    background: 'linear-gradient(115deg, #034C2A 0%, #07803F 65%, #09934B 100%)',
    position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center',
  },
  heroInner: { position: 'relative', zIndex: 2, paddingTop: 78, paddingBottom: 78 },
  eyebrow: { display: 'flex', alignItems: 'center', gap: 9, color: '#D7F4E2', fontSize: 11, fontWeight: 900, letterSpacing: 2, marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#9BE6B6' },
  heroTitle: { color: WHITE, fontSize: 54, lineHeight: 1.12, letterSpacing: -1.8, fontWeight: 900, margin: 0, maxWidth: 690 },
  heroText: { color: '#E2F4E8', fontSize: 16, lineHeight: 1.85, maxWidth: 600, marginTop: 22 },
  heroButtons: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 29 },
  heroFootnote: { color: '#D7F4E2', fontSize: 12, fontWeight: 700, marginTop: 30 },
  heroDecoration: { position: 'absolute', right: 0, top: 0, width: '43%', height: '100%', pointerEvents: 'none' },
  circleOne: { position: 'absolute', width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(255,255,255,.14)', right: 10, top: 50 },
  circleTwo: { position: 'absolute', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(255,255,255,.17)', right: 80, top: 120 },
  heroLetter: { position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.10)', fontSize: 250, fontWeight: 900 },
  section: { padding: '82px 0', background: WHITE },
  personalSection: { padding: '78px 0', background: LIGHT },
  eyebrowDark: { color: GREEN, fontSize: 11, fontWeight: 900, letterSpacing: 2, marginBottom: 13 },
  heading: { color: '#103D2B', fontSize: 34, lineHeight: 1.2, fontWeight: 900, letterSpacing: -.8, margin: '0 0 20px', maxWidth: 760 },
  bodyText: { color: MUTED, fontSize: 15, lineHeight: 1.9, maxWidth: 820, margin: '0 0 15px' },
  split: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'center', gap: 45 },
  featurePanel: { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 35, boxShadow: '0 12px 35px rgba(20,70,43,.06)' },
  featureIcon: { width: 55, height: 55, borderRadius: 15, background: '#E8F7EE', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27 },
  featureTitle: { color: DEEP, fontSize: 22, fontWeight: 900, margin: '20px 0 10px' },
  featureText: { color: MUTED, fontSize: 14, lineHeight: 1.8 },
  textLink: { display: 'inline-block', color: GREEN, fontWeight: 900, fontSize: 14, textDecoration: 'none', marginTop: 12 },
  businessPanel: { background: 'linear-gradient(135deg, #056B34, #07803F)', borderRadius: 20, padding: 35, minHeight: 260, color: WHITE, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  businessSymbol: { fontSize: 48, marginBottom: 18 },
  businessLabel: { fontSize: 11, letterSpacing: 2, fontWeight: 900, color: '#BDECCB' },
  businessWords: { fontSize: 25, fontWeight: 900, lineHeight: 1.35, maxWidth: 330, marginTop: 12 },
  servicesSection: { padding: '82px 0', background: LIGHT },
  sectionLead: { color: MUTED, fontSize: 15, lineHeight: 1.8, maxWidth: 700, margin: '0 0 30px' },
  serviceIcon: { width: 47, height: 47, borderRadius: 13, background: '#E9F7EE', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, marginBottom: 18 },
  cardTitle: { color: '#103D2B', fontSize: 16, fontWeight: 900, margin: '0 0 9px' },
  cardText: { color: MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 },
  mission: { background: DEEP, padding: '75px 0' },
  missionInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 45 },
  lightEyebrow: { color: '#A8E9BD', fontSize: 11, fontWeight: 900, letterSpacing: 2 },
  missionTitle: { color: WHITE, fontSize: 29, fontWeight: 900, margin: '13px 0' },
  missionText: { color: '#D1E5D9', fontSize: 15, lineHeight: 1.8, maxWidth: 700, margin: 0 },
  missionDivider: { height: 1, background: 'rgba(255,255,255,.18)', margin: '28px 0' },
  missionMark: { width: 145, height: 145, minWidth: 145, borderRadius: 30, background: GREEN, color: WHITE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 35px rgba(0,0,0,.15)' },
  securityGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 25 },
  securityCard: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: 21, background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 15 },
  securityIcon: { width: 40, height: 40, minWidth: 40, borderRadius: 11, background: '#E8F7EE', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 900 },
  nigeria: { background: '#EAF6EE', padding: '43px 0' },
  nigeriaInner: { display: 'flex', alignItems: 'center', gap: 20 },
  nigeriaTitle: { color: DEEP, fontSize: 24, fontWeight: 900, margin: '0 0 7px' },
  contactPanel: { display: 'flex', alignItems: 'flex-start', gap: 17, padding: 25, background: LIGHT, border: `1px solid ${BORDER}`, borderRadius: 16, maxWidth: 650 },
  contactIcon: { width: 42, height: 42, minWidth: 42, borderRadius: 12, background: '#E8F7EE', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, fontWeight: 900 },
  greenTextLink: { display: 'inline-block', color: GREEN, fontWeight: 900, textDecoration: 'none', fontSize: 13, marginTop: 12 },
  accessSection: { background: 'linear-gradient(110deg, #056B34, #07803F)', padding: '55px 0' },
  accessInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 25, flexWrap: 'wrap' },
  accessTitle: { color: WHITE, fontSize: 27, fontWeight: 900, margin: '10px 0' },
  accessText: { color: '#D8F0E1', fontSize: 14, margin: 0 },
  accessLogin: { color: DARK, background: WHITE, textDecoration: 'none', padding: '14px 20px', borderRadius: 9, fontSize: 13, fontWeight: 900 },
  accessRegister: { color: WHITE, border: '1px solid rgba(255,255,255,.6)', textDecoration: 'none', padding: '13px 19px', borderRadius: 9, fontSize: 13, fontWeight: 900 },
  footer: { background: '#062F22', color: WHITE, padding: '55px 0 20px' },
  footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 35, paddingBottom: 38 },
  footerLogoLink: { display: 'inline-flex', alignItems: 'center', gap: 10, color: WHITE, textDecoration: 'none', fontWeight: 900, letterSpacing: .8 },
  footerLogo: { width: 36, height: 36, borderRadius: 10, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  footerDescription: { color: '#B8D1C2', fontSize: 13, lineHeight: 1.8, maxWidth: 300, marginTop: 17 },
  footerHeading: { color: WHITE, fontSize: 13, fontWeight: 900, margin: '4px 0 18px' },
  footerColumn: { display: 'flex', flexDirection: 'column', gap: 13 },
  footerBottom: { borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', gap: 15, flexWrap: 'wrap', color: '#B8D1C2', fontSize: 11 },
};

export default About;
