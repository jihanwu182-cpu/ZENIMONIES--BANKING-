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
          width: min(1200px, calc(100% - 64px));
          margin: 0 auto;
        }

        /* =========================================
           PROFESSIONAL CORPORATE HEADER
        ========================================= */

        .zen-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid ${BORDER};
          backdrop-filter: blur(14px);
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
          gap: 11px;
          color: ${DARK};
          text-decoration: none;
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -1px;
          white-space: nowrap;
        }

        .zen-logo-mark {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          background: ${GREEN};
          color: white;
          border-radius: 11px;
          font-size: 22px;
          font-weight: 900;
          box-shadow: 0 5px 15px rgba(7,128,63,.15);
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

        .zen-nav-links .zen-nav-contact {
          padding: 12px 19px;
          border: 1px solid ${GREEN};
          border-radius: 7px;
          color: ${GREEN};
          font-weight: 750;
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
          width: 230px;
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

        /* =========================================
           PREMIUM HERO SECTION
        ========================================= */

        .zen-hero {
          position: relative;
          padding: 85px 0 90px;
          background:
            linear-gradient(
              110deg,
              #FFFFFF 0%,
              #FFFFFF 58%,
              #F5FAF6 100%
            );
        }

        .zen-hero-grid {
          display: grid;
          grid-template-columns: 1.02fr .98fr;
          align-items: center;
          gap: 65px;
        }

        .zen-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: ${GREEN};
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .zen-eyebrow::before {
          content: "";
          width: 27px;
          height: 2px;
          background: ${GREEN};
        }

        .zen-hero h1 {
          max-width: 620px;
          margin: 22px 0;
          color: ${DARK};
          font-size: clamp(45px, 5.4vw, 70px);
          line-height: 1.06;
          letter-spacing: -3px;
          font-weight: 850;
        }

        .zen-hero h1 span {
          color: ${GREEN};
        }

        .zen-hero-description {
          max-width: 520px;
          color: ${MUTED};
          font-size: 15px;
          line-height: 1.9;
        }

        .zen-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 30px;
        }

        .zen-button-primary {
          min-height: 49px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          border-radius: 7px;
          background: ${GREEN};
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(7,128,63,.15);
          transition: .2s ease;
        }

        .zen-button-primary:hover {
          background: #056B35;
          transform: translateY(-2px);
        }

        .zen-button-outline {
          min-height: 49px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          border: 1px solid #CBD8CE;
          border-radius: 7px;
          background: white;
          color: ${DARK};
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          transition: .2s ease;
        }

        .zen-button-outline:hover {
          border-color: ${GREEN};
          color: ${GREEN};
        }

        /* =========================================
           APP SHOWCASE AREA
        ========================================= */

        .zen-hero-visual {
          position: relative;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zen-hero-visual::before {
          content: "";
          position: absolute;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              #E5F2E8 0%,
              rgba(229,242,232,.35) 55%,
              transparent 72%
            );
        }

        .zen-hero-visual::after {
          content: "";
          position: absolute;
          width: 350px;
          height: 350px;
          border: 1px solid rgba(7,128,63,.12);
          border-radius: 50%;
        }

        .zen-app-showcase {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 450px;
          padding: 15px;
          border: 1px solid #E3EAE4;
          border-radius: 22px;
          background: white;
          box-shadow:
            0 25px 65px rgba(20,50,30,.12);
        }

        .zen-app-showcase-inner {
          overflow: hidden;
          border: 1px solid #EDF1ED;
          border-radius: 13px;
          background: white;
        }

        .zen-app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 17px 19px;
          border-bottom: 1px solid #EEF2EE;
        }

        .zen-app-brand {
          color: ${DARK};
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .4px;
        }

        .zen-app-brand span {
          color: ${GREEN};
        }

        .zen-app-header-actions {
          display: flex;
          gap: 8px;
        }

        .zen-app-header-actions span {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border: 1px solid #E8EEE9;
          border-radius: 50%;
          color: #526057;
          font-size: 12px;
        }

        .zen-app-content {
          padding: 18px;
        }

        .zen-app-welcome {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .zen-app-avatar {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #EAF4ED;
          color: ${GREEN};
          font-weight: 850;
        }

        .zen-app-welcome small {
          display: block;
          margin-bottom: 3px;
          color: #879188;
          font-size: 10px;
        }

        .zen-app-welcome strong {
          color: ${DARK};
          font-size: 13px;
        }

        .zen-app-balance {
          padding: 20px;
          border-radius: 11px;
          color: white;
          background:
            linear-gradient(
              115deg,
              #087C3E 0%,
              #075C32 100%
            );
          box-shadow: 0 9px 20px rgba(7,98,50,.14);
        }

        .zen-app-balance-top,
        .zen-app-balance-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .zen-app-balance-top {
          color: rgba(255,255,255,.82);
          font-size: 10px;
        }

        .zen-app-balance-value {
          display: block;
          margin: 15px 0 18px;
          font-size: 28px;
          letter-spacing: 1px;
        }

        .zen-app-balance-bottom {
          color: rgba(255,255,255,.85);
          font-size: 9px;
        }
      
        /* =========================================
           CUSTOMER VERIFICATION PREVIEW
        ========================================= */

        .zen-app-verification {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 13px;
          padding: 12px;
          border: 1px solid #E8EEE9;
          border-radius: 9px;
          background: #FBFCFB;
        }

        .zen-app-verification-icon {
          flex: 0 0 29px;
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #EAF4ED;
          color: ${GREEN};
          font-weight: 900;
        }

        .zen-app-verification-content {
          flex: 1;
          min-width: 0;
        }

        .zen-app-verification-content strong {
          display: block;
          color: ${DARK};
          font-size: 10px;
        }

        .zen-app-verification-content small {
          display: block;
          margin-top: 4px;
          color: #879188;
          font-size: 8px;
        }

        .zen-app-verification-arrow {
          color: ${GREEN};
          font-size: 18px;
        }

        /* =========================================
           DASHBOARD QUICK ACTIONS
        ========================================= */

        .zen-app-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 19px 0 13px;
        }

        .zen-app-section-heading strong {
          color: ${DARK};
          font-size: 12px;
          font-weight: 850;
        }

        .zen-app-section-heading span {
          color: ${GREEN};
          font-size: 9px;
          font-weight: 750;
        }

        .zen-app-actions {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px 5px;
        }

        .zen-app-action {
          min-width: 0;
          text-align: center;
          color: #59665D;
          font-size: 8px;
          font-weight: 650;
        }

        .zen-app-action-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          margin: 0 auto 7px;
          border: 1px solid #E8EEE9;
          border-radius: 11px;
          background: #F7FAF7;
          color: ${GREEN};
          font-size: 17px;
          font-weight: 800;
        }

        /* =========================================
           MORE SERVICES
        ========================================= */

        .zen-app-services {
          border-top: 1px solid #EFF2EF;
        }

        .zen-app-service {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 3px;
          border-bottom: 1px solid #EFF2EF;
          color: #536057;
          font-size: 10px;
        }

        .zen-app-service-arrow {
          color: #98A39B;
          font-size: 16px;
        }

        /* =========================================
           RECENT TRANSACTIONS
        ========================================= */

        .zen-app-transactions {
          min-height: 95px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 17px 10px;
          text-align: center;
        }

        .zen-app-transaction-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          margin-bottom: 8px;
          border-radius: 50%;
          background: #F1F5F1;
          color: #819087;
          font-size: 15px;
        }

        .zen-app-transactions strong {
          color: #56635A;
          font-size: 10px;
        }

        .zen-app-transactions small {
          margin-top: 5px;
          color: #929D94;
          font-size: 8px;
        }

        /* =========================================
           DASHBOARD BOTTOM NAVIGATION
        ========================================= */

        .zen-app-bottom-nav {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          padding: 12px 3px 8px;
          border-top: 1px solid #EDF1ED;
          background: #fff;
        }

        .zen-app-bottom-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #849087;
          font-size: 8px;
        }

        .zen-app-bottom-item span {
          font-size: 15px;
        }

        .zen-app-bottom-item.active {
          color: ${GREEN};
          font-weight: 850;
        }

        /* =========================================
           FLOATING SHOWCASE LABELS
        ========================================= */

        .zen-showcase-label {
          position: absolute;
          z-index: 4;
          right: -12px;
          top: 65px;
          padding: 13px 17px;
          border: 1px solid #E5ECE6;
          border-radius: 10px;
          background: white;
          box-shadow: 0 12px 28px rgba(25,52,33,.09);
        }

        .zen-showcase-label strong {
          display: block;
          color: ${DARK};
          font-size: 10px;
        }

        .zen-showcase-label small {
          display: block;
          margin-top: 5px;
          color: #879188;
          font-size: 9px;
        }

        .zen-showcase-label-bottom {
          position: absolute;
          z-index: 4;
          left: -15px;
          bottom: 55px;
          padding: 13px 17px;
          border: 1px solid #E5ECE6;
          border-radius: 10px;
          background: white;
          box-shadow: 0 12px 28px rgba(25,52,33,.09);
        }

        .zen-showcase-label-bottom strong {
          display: block;
          color: ${DARK};
          font-size: 10px;
        }

        .zen-showcase-label-bottom small {
          display: block;
          margin-top: 5px;
          color: #879188;
          font-size: 9px;
        }

        /* =========================================
           TRUST AND PLATFORM INTRODUCTION
        ========================================= */

        .zen-trust-strip {
          border-top: 1px solid ${BORDER};
          border-bottom: 1px solid ${BORDER};
          background: #fff;
        }

        .zen-trust-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 25px 0;
        }

        .zen-trust-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          border-right: 1px solid ${BORDER};
        }

        .zen-trust-item:last-child {
          border-right: 0;
        }

        .zen-trust-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #EDF5EF;
          color: ${GREEN};
          font-size: 17px;
        }

        .zen-trust-item strong {
          display: block;
          color: ${DARK};
          font-size: 12px;
        }

        .zen-trust-item small {
          display: block;
          margin-top: 4px;
          color: #879188;
          font-size: 10px;
        }

        /* =========================================
           GENERAL SECTION STYLING
        ========================================= */

        .zen-section {
          padding: 95px 0;
        }

        .zen-section-light {
          background: ${LIGHT};
        }

        .zen-section-heading {
          max-width: 710px;
          margin: 0 auto 48px;
          text-align: center;
        }

        .zen-section-kicker {
          color: ${GREEN};
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.6px;
          text-transform: uppercase;
        }

        .zen-section-heading h2 {
          margin: 15px 0;
          color: ${DARK};
          font-size: clamp(32px, 4vw, 45px);
          line-height: 1.15;
          letter-spacing: -1.8px;
        }

        .zen-section-heading p {
          max-width: 620px;
          margin: 0 auto;
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.9;
        }

        /* =========================================
           COMPANY PROFILE SECTION
        ========================================= */

        .zen-profile-grid {
          display: grid;
          grid-template-columns: 1fr .95fr;
          align-items: center;
          gap: 75px;
        }

        .zen-profile-copy h2 {
          max-width: 580px;
          margin: 17px 0;
          color: ${DARK};
          font-size: clamp(32px, 4vw, 45px);
          line-height: 1.15;
          letter-spacing: -1.8px;
        }

        .zen-profile-copy p {
          max-width: 580px;
          color: ${MUTED};
          font-size: 14px;
          line-height: 1.95;
        }

        .zen-profile-link {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 17px;
          color: ${GREEN};
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
        }

        .zen-profile-link:hover {
          text-decoration: underline;
        }

        .zen-profile-visual {
          position: relative;
          min-height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid #E5ECE6;
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              #FAFCFA,
              #EDF5EF
            );
        }

        .zen-profile-circle {
          position: absolute;
          width: 320px;
          height: 320px;
          border: 1px solid rgba(7,128,63,.13);
          border-radius: 50%;
        }

        .zen-profile-circle-inner {
          position: absolute;
          width: 240px;
          height: 240px;
          border: 1px solid rgba(7,128,63,.15);
          border-radius: 50%;
        }

        .zen-profile-emblem {
          position: relative;
          z-index: 2;
          width: 115px;
          height: 115px;
          display: grid;
          place-items: center;
          border-radius: 28px;
          background: ${GREEN};
          color: white;
          font-size: 65px;
          font-weight: 900;
          box-shadow: 0 20px 40px rgba(7,128,63,.19);
        }

        .zen-profile-caption {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 23px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #66746A;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: .4px;
        }

        /* =========================================
           SERVICES SECTION
        ========================================= */

        .zen-services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .zen-service-card {
          min-height: 220px;
          padding: 27px;
          border: 1px solid ${BORDER};
          border-radius: 11px;
          background: white;
          transition:
            transform .25s ease,
            box-shadow .25s ease,
            border-color .25s ease;
        }

        .zen-service-card:hover {
          transform: translateY(-5px);
          border-color: #C9DCCF;
          box-shadow: 0 15px 35px rgba(25,55,33,.07);
        }

        .zen-service-icon {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          margin-bottom: 23px;
          border-radius: 12px;
          background: #EDF5EF;
          color: ${GREEN};
          font-size: 21px;
          font-weight: 850;
        }

        .zen-service-card h3 {
          margin: 0 0 10px;
          color: ${DARK};
          font-size: 16px;
          letter-spacing: -.3px;
        }

        .zen-service-card p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.9;
        }
              /* =========================================
           PERSONAL AND BUSINESS BANKING
        ========================================= */

        .zen-banking-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 22px;
        }

        .zen-banking-card {
          position: relative;
          min-height: 310px;
          padding: 36px;
          overflow: hidden;
          border: 1px solid ${BORDER};
          border-radius: 13px;
          background: #fff;
          transition: box-shadow .25s ease;
        }

        .zen-banking-card:hover {
          box-shadow: 0 15px 35px rgba(20,45,28,.07);
        }

        .zen-banking-card::after {
          content: "";
          position: absolute;
          right: -95px;
          bottom: -115px;
          width: 270px;
          height: 270px;
          border: 1px solid #E3ECE5;
          border-radius: 50%;
          box-shadow:
            0 0 0 25px #F8FBF8,
            0 0 0 26px #E8F0E9;
          pointer-events: none;
        }

        .zen-banking-number {
          color: ${GREEN};
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .zen-banking-card h3 {
          position: relative;
          z-index: 1;
          max-width: 390px;
          margin: 22px 0 13px;
          color: ${DARK};
          font-size: 27px;
          line-height: 1.25;
          letter-spacing: -.8px;
        }

        .zen-banking-card p {
          position: relative;
          z-index: 1;
          max-width: 400px;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.9;
        }

        .zen-banking-link {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          margin-top: 16px;
          color: ${GREEN};
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
        }

        .zen-banking-link:hover {
          text-decoration: underline;
        }

        /* =========================================
           SECURITY SECTION
        ========================================= */

        .zen-security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 19px;
        }

        .zen-security-card {
          padding: 29px;
          border: 1px solid ${BORDER};
          border-radius: 11px;
          background: white;
        }

        .zen-security-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          margin-bottom: 20px;
          border-radius: 11px;
          background: #EDF5EF;
          color: ${GREEN};
          font-size: 19px;
        }

        .zen-security-card h3 {
          margin: 0 0 11px;
          color: ${DARK};
          font-size: 15px;
        }

        .zen-security-card p {
          margin: 0;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.9;
        }

        /* =========================================
           CONTACT / CALL TO ACTION
        ========================================= */

        .zen-contact-section {
          padding: 75px 0;
          border-top: 1px solid #E5EEE7;
          border-bottom: 1px solid #E5EEE7;
          background: #F4F8F5;
        }

        .zen-contact-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 35px;
        }

        .zen-contact-copy {
          max-width: 730px;
        }

        .zen-contact-copy h2 {
          margin: 15px 0 12px;
          color: ${DARK};
          font-size: clamp(29px, 3.5vw, 41px);
          line-height: 1.2;
          letter-spacing: -1.5px;
        }

        .zen-contact-copy p {
          margin: 0;
          color: ${MUTED};
          font-size: 13px;
          line-height: 1.85;
        }

        /* =========================================
           PROFESSIONAL FOOTER
        ========================================= */

        .zen-footer {
          padding: 65px 0 24px;
          background: #fff;
        }

        .zen-footer-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 38px;
          padding-bottom: 42px;
        }

        .zen-footer-description {
          max-width: 310px;
          margin-top: 19px;
          color: ${MUTED};
          font-size: 12px;
          line-height: 1.9;
        }

        .zen-footer-column h4 {
          margin: 0 0 19px;
          color: ${DARK};
          font-size: 12px;
          font-weight: 850;
        }

        .zen-footer-column a {
          display: block;
          width: fit-content;
          margin: 13px 0;
          color: #77837A;
          text-decoration: none;
          font-size: 11px;
          transition: color .2s ease;
        }

        .zen-footer-column a:hover {
          color: ${GREEN};
        }

        .zen-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 22px;
          border-top: 1px solid ${BORDER};
          color: #89938C;
          font-size: 10px;
          line-height: 1.8;
        }

        /* =========================================
           RESPONSIVE TABLET DESIGN
        ========================================= */

        @media (max-width: 1050px) {
          .zen-nav-links {
            gap: 17px;
          }

          .zen-hero-grid {
            gap: 32px;
          }

          .zen-hero h1 {
            font-size: 55px;
          }

          .zen-profile-grid {
            gap: 38px;
          }

          .zen-footer-grid {
            grid-template-columns: 1.4fr 1fr 1fr;
          }

          .zen-footer-column:last-child {
            grid-column: 2 / 4;
          }
        }

        /* =========================================
           RESPONSIVE MOBILE DESIGN
        ========================================= */

        @media (max-width: 760px) {
          .zen-container {
            width: calc(100% - 38px);
          }

          .zen-nav {
            min-height: 70px;
          }

          .zen-nav-links {
            display: none;
          }

          .zen-mobile-menu {
            display: block;
          }

          .zen-hero {
            padding: 55px 0 45px;
          }

          .zen-hero-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .zen-hero h1 {
            max-width: 570px;
            margin: 18px 0;
            font-size: clamp(40px, 10vw, 56px);
            letter-spacing: -2.4px;
          }

          .zen-hero-description {
            font-size: 14px;
          }

          .zen-hero-visual {
            min-height: auto;
            padding: 25px 0 40px;
          }

          .zen-hero-visual::before {
            width: 350px;
            height: 350px;
          }

          .zen-hero-visual::after {
            width: 280px;
            height: 280px;
          }

          .zen-app-showcase {
            max-width: 480px;
          }

          .zen-showcase-label {
            right: -3px;
            top: 0;
          }

          .zen-showcase-label-bottom {
            left: -3px;
            bottom: 0;
          }

          .zen-trust-grid {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 22px 0;
          }

          .zen-trust-item {
            justify-content: flex-start;
            border: 0;
          }

          .zen-section {
            padding: 68px 0;
          }

          .zen-profile-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .zen-profile-visual {
            min-height: 290px;
          }

          .zen-section-heading {
            margin-bottom: 32px;
          }

          .zen-services-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .zen-service-card {
            min-height: 195px;
            padding: 19px;
          }

          .zen-service-icon {
            margin-bottom: 17px;
          }

          .zen-banking-grid {
            grid-template-columns: 1fr;
          }

          .zen-banking-card {
            min-height: 270px;
            padding: 28px;
          }

          .zen-security-grid {
            grid-template-columns: 1fr;
          }

          .zen-contact-section {
            padding: 50px 0;
          }

          .zen-contact-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .zen-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 30px 18px;
          }

          .zen-footer-brand {
            grid-column: 1 / -1;
          }

          .zen-footer-column:last-child {
            grid-column: auto;
          }

          .zen-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }
        }

        /* =========================================
           SMALL MOBILE SCREENS
        ========================================= */

        @media (max-width: 390px) {
          .zen-container {
            width: calc(100% - 28px);
          }

          .zen-logo {
            font-size: 19px;
          }

          .zen-hero-actions {
            flex-direction: column;
          }

          .zen-hero-actions a {
            width: 100%;
          }

          .zen-services-grid {
            grid-template-columns: 1fr;
          }

          .zen-app-actions {
            gap: 12px 2px;
          }

          .zen-app-action {
            font-size: 7px;
          }

          .zen-showcase-label {
            right: -5px;
            padding: 10px 12px;
          }

          .zen-showcase-label-bottom {
            left: -5px;
            padding: 10px 12px;
          }

          .zen-footer-grid {
            gap: 25px 12px;
          }
        }
      `}</style>
  {/* =========================================
          CORPORATE HEADER
      ========================================= */}

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
            <a href="#contact">Contact</a>
            <Link to="/login">Sign In</Link>
            <Link
              to="/register"
              className="zen-nav-contact"
            >
              Open an Account
            </Link>
          </nav>

          <details className="zen-mobile-menu">
            <summary aria-label="Open navigation">
              ☰
            </summary>

            <nav>
              <a href="#home">Home</a>
              <a href="#services">Services</a>
              <Link to="/about">About Us</Link>
              <a href="#security">Security</a>
              <a href="#contact">Contact</a>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Open an Account</Link>
            </nav>
          </details>

        </div>
      </header>

      <main>

        {/* =========================================
            HERO SECTION
        ========================================= */}

        <section className="zen-hero" id="home">
          <div className="zen-container zen-hero-grid">

            <div className="zen-hero-content">

              <div className="zen-eyebrow">
                Digital Banking. Simplified.
              </div>

              <h1>
                Banking made simpler.
                <span> Payments made easier.</span>
              </h1>

              <p className="zen-hero-description">
                Welcome to ZENIMONIES, your digital banking
                platform for everyday payments, transfers
                and financial services. Experience convenient
                personal and business banking in one place.
              </p>

              <div className="zen-hero-actions">

                <Link
                  to="/register"
                  className="zen-button-primary"
                >
                  Get Started&nbsp; →
                </Link>

                <a
                  href="#services"
                  className="zen-button-outline"
                >
                  Explore Services
                </a>

              </div>

            </div>

            {/* CUSTOMER DASHBOARD PREVIEW */}

            <div className="zen-hero-visual">

              <div className="zen-showcase-label">
                <strong>Everyday Banking</strong>
                <small>One connected experience</small>
              </div>

              <div className="zen-app-showcase">

                <div className="zen-app-showcase-inner">

                  {/* APP HEADER */}

                  <div className="zen-app-header">

                    <div className="zen-app-brand">
                      <span>ZENI</span>MONIES
                    </div>

                    <div className="zen-app-header-actions">
                      <span>♧</span>
                      <span>?</span>
                    </div>

                  </div>

                  <div className="zen-app-content">

                    {/* WELCOME */}

                    <div className="zen-app-welcome">

                      <div className="zen-app-avatar">
                        C
                      </div>

                      <div>
                        <small>Welcome back,</small>
                        <strong>Customer</strong>
                      </div>

                    </div>

                    {/* BALANCE CARD */}

                    <div className="zen-app-balance">

                      <div className="zen-app-balance-top">
                        <span>Available Balance</span>
                        <span>◉</span>
                      </div>

                      <strong className="zen-app-balance-value">
                        ₦ ••••••
                      </strong>

                      <div className="zen-app-balance-bottom">
                        <span>Personal Account</span>
                        <span>NGN</span>
                      </div>

                    </div>

                    {/* VERIFICATION */}

                    <div className="zen-app-verification">

                      <div className="zen-app-verification-icon">
                        ✓
                      </div>

                      <div className="zen-app-verification-content">
                        <strong>Account Verification</strong>
                        <small>
                          Complete verification to access eligible features
                        </small>
                      </div>

                      <span className="zen-app-verification-arrow">
                        ›
                      </span>

                    </div>

                    {/* QUICK ACTIONS */}

                    <div className="zen-app-section-heading">
                      <strong>Quick Actions</strong>
                      <span>View All</span>
                    </div>

                    <div className="zen-app-actions">

                      {[
                        ['＋', 'Add Money'],
                        ['↗', 'To Bank'],
                        ['⇄', 'Send'],
                        ['▤', 'Airtime'],
                        ['▦', 'Data'],
                        ['◎', 'Betting'],
                        ['▣', 'TV'],
                        ['ϟ', 'Bills'],
                        ['◇', 'Savings'],
                        ['•••', 'More'],
                      ].map(([icon, label]) => (

                        <div
                          className="zen-app-action"
                          key={label}
                        >
                          <div className="zen-app-action-icon">
                            {icon}
                          </div>

                          {label}
                        </div>

                      ))}

                    </div>

                    {/* MORE SERVICES */}

                    <div className="zen-app-section-heading">
                      <strong>More Services</strong>
                    </div>

                    <div className="zen-app-services">

                      {[
                        'Transactions',
                        'Wallet',
                        'Cards',
                        'Settings',
                      ].map((item) => (

                        <div
                          className="zen-app-service"
                          key={item}
                        >
                          <span>{item}</span>
                          <span className="zen-app-service-arrow">
                            ›
                          </span>
                        </div>

                      ))}

                    </div>

                    {/* RECENT TRANSACTIONS */}

                    <div className="zen-app-section-heading">
                      <strong>Recent Transactions</strong>
                      <span>See All</span>
                    </div>

                    <div className="zen-app-transactions">

                      <div className="zen-app-transaction-icon">
                        ↔
                      </div>

                      <strong>No transactions yet</strong>

                      <small>
                        Your transactions will appear here.
                      </small>

                    </div>

                    {/* BOTTOM NAVIGATION */}

                    <div className="zen-app-bottom-nav">

                      <div className="zen-app-bottom-item active">
                        <span>⌂</span>
                        Home
                      </div>

                      <div className="zen-app-bottom-item">
                        <span>↔</span>
                        Transactions
                      </div>

                      <div className="zen-app-bottom-item">
                        <span>▣</span>
                        Cards
                      </div>

                      <div className="zen-app-bottom-item">
                        <span>◫</span>
                        Wallet
                      </div>

                      <div className="zen-app-bottom-item">
                        <span>○</span>
                        Profile
                      </div>

                    </div>

                  </div>

                </div>

              </div>

              <div className="zen-showcase-label-bottom">
                <strong>Personal & Business</strong>
                <small>Banking for everyday needs</small>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================
            PLATFORM OVERVIEW
        ========================================= */}

        <section className="zen-trust-strip">

          <div className="zen-container zen-trust-grid">

            <div className="zen-trust-item">
              <div className="zen-trust-icon">⌂</div>
              <div>
                <strong>Personal Banking</strong>
                <small>Everyday account services</small>
              </div>
            </div>

            <div className="zen-trust-item">
              <div className="zen-trust-icon">▥</div>
              <div>
                <strong>Business Banking</strong>
                <small>Tools for business needs</small>
              </div>
            </div>

            <div className="zen-trust-item">
              <div className="zen-trust-icon">↗</div>
              <div>
                <strong>Payments & Services</strong>
                <small>Convenient digital access</small>
              </div>
            </div>

          </div>

        </section>

        {/* =========================================
            COMPANY PROFILE
        ========================================= */}

        <section className="zen-section" id="about">

          <div className="zen-container zen-profile-grid">

            <div className="zen-profile-copy">

              <span className="zen-section-kicker">
                ABOUT ZENIMONIES
              </span>

              <h2>
                A digital financial experience
                shaped around real life.
              </h2>

              <p>
                ZENIMONIES is a digital banking platform
                focused on providing convenient access
                to banking and payment services in Nigeria.
              </p>

              <p>
                We bring together everyday account activities,
                transfers, payments and digital services in
                one connected experience.
              </p>

              <p>
                Our platform is designed to serve individuals
                and businesses through accessible digital
                financial services.
              </p>

              <Link
                to="/about"
                className="zen-profile-link"
              >
                Discover Our Company&nbsp; →
              </Link>

            </div>

            <div className="zen-profile-visual">

              <div className="zen-profile-circle" />

              <div className="zen-profile-circle-inner" />

              <div className="zen-profile-emblem">
                Z
              </div>

              <div className="zen-profile-caption">
                <span>ZENIMONIES</span>
                <span>Banking for Everyday Life</span>
              </div>

            </div>

          </div>

        </section>

        {/* =========================================
            SERVICES
        ========================================= */}

        <section
          className="zen-section zen-section-light"
          id="services"
        >

          <div className="zen-container">

            <div className="zen-section-heading">

              <span className="zen-section-kicker">
                OUR SERVICES
              </span>

              <h2>
                One platform for everyday
                financial services.
              </h2>

              <p>
                Explore the banking and payment services
                available through the ZENIMONIES platform.
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
      
            {/* =========================================
            PERSONAL AND BUSINESS BANKING
        ========================================= */}

        <section className="zen-section">

          <div className="zen-container">

            <div className="zen-section-heading">

              <span className="zen-section-kicker">
                BANKING SOLUTIONS
              </span>

              <h2>
                Banking designed around
                your needs.
              </h2>

              <p>
                Whether you manage personal finances
                or run a business, explore the digital
                banking services available through
                ZENIMONIES.
              </p>

            </div>

            <div className="zen-banking-grid">

              {/* PERSONAL BANKING */}

              <article className="zen-banking-card">

                <span className="zen-banking-number">
                  01 / PERSONAL BANKING
                </span>

                <h3>
                  Your everyday banking,
                  in one place.
                </h3>

                <p>
                  Access personal account services,
                  transfer funds, purchase airtime and
                  data, pay supported bills and explore
                  other available digital services.
                </p>

                <Link
                  to="/register"
                  className="zen-banking-link"
                >
                  Explore Personal Banking&nbsp; →
                </Link>

              </article>

              {/* BUSINESS BANKING */}

              <article className="zen-banking-card">

                <span className="zen-banking-number">
                  02 / BUSINESS BANKING
                </span>

                <h3>
                  Digital banking for
                  your business journey.
                </h3>

                <p>
                  Explore business account services
                  and digital payment tools designed
                  to support everyday business
                  activities, including POS services
                  for eligible customers.
                </p>

                <Link
                  to="/about"
                  className="zen-banking-link"
                >
                  Explore Business Banking&nbsp; →
                </Link>

              </article>

            </div>

          </div>

        </section>

        {/* =========================================
            SECURITY AND ACCOUNT PROTECTION
        ========================================= */}

        <section
          className="zen-section zen-section-light"
          id="security"
        >

          <div className="zen-container">

            <div className="zen-section-heading">

              <span className="zen-section-kicker">
                SECURITY & ACCOUNT CARE
              </span>

              <h2>
                A thoughtful approach
                to account security.
              </h2>

              <p>
                Security and responsible account access
                are important parts of the ZENIMONIES
                digital banking experience.
              </p>

            </div>

            <div className="zen-security-grid">

              <article className="zen-security-card">

                <div className="zen-security-icon">
                  ◈
                </div>

                <h3>Account Protection</h3>

                <p>
                  Account access controls and security
                  measures are important to protecting
                  customer accounts and supporting
                  responsible platform access.
                </p>

              </article>

              <article className="zen-security-card">

                <div className="zen-security-icon">
                  ✓
                </div>

                <h3>Identity Verification</h3>

                <p>
                  Customer verification helps support
                  secure account access and applicable
                  service requirements.
                </p>

              </article>

              <article className="zen-security-card">

                <div className="zen-security-icon">
                  ⌑
                </div>

                <h3>Responsible Service</h3>

                <p>
                  We aim to provide a clear and
                  responsible digital experience
                  for customers using the platform.
                </p>

              </article>

            </div>

          </div>

        </section>

        {/* =========================================
            ACCOUNT OPENING CALL TO ACTION
        ========================================= */}

        <section
          className="zen-contact-section"
          id="contact"
        >

          <div className="zen-container zen-contact-inner">

            <div className="zen-contact-copy">

              <span className="zen-section-kicker">
                GET STARTED WITH ZENIMONIES
              </span>

              <h2>
                Make everyday banking
                part of a simpler experience.
              </h2>

              <p>
                Explore ZENIMONIES and discover
                the digital banking and payment
                services available on our platform.
              </p>

            </div>

            <Link
              to="/register"
              className="zen-button-primary"
            >
              Open an Account&nbsp; →
            </Link>

          </div>

        </section>

      </main>

      {/* =========================================
          CORPORATE FOOTER
      ========================================= */}

      <footer className="zen-footer">

        <div className="zen-container">

          <div className="zen-footer-grid">

            {/* BRAND */}

            <div className="zen-footer-brand">

              <Link
                to="/"
                className="zen-logo"
              >
                <span className="zen-logo-mark">
                  Z
                </span>

                ZENIMONIES
              </Link>

              <p className="zen-footer-description">
                ZENIMONIES is a digital banking platform
                focused on convenient banking and payment
                services for individuals and businesses
                in Nigeria.
              </p>

            </div>

            {/* COMPANY LINKS */}

            <div className="zen-footer-column">

              <h4>Company</h4>

              <Link to="/">
                Home
              </Link>

              <Link to="/about">
                About Us
              </Link>

              <a href="#services">
                Our Services
              </a>

              <a href="#contact">
                Contact
              </a>

            </div>

            {/* SERVICE LINKS */}

            <div className="zen-footer-column">

              <h4>Services</h4>

              <a href="#services">
                Bank Transfers
              </a>

              <a href="#services">
                Airtime & Data
              </a>

              <a href="#services">
                Bill Payments
              </a>

              <a href="#services">
                Business Banking
              </a>

            </div>

            {/* ACCOUNT LINKS */}

            <div className="zen-footer-column">

              <h4>Account</h4>

              <Link to="/login">
                Sign In
              </Link>

              <Link to="/register">
                Open an Account
              </Link>

              <a href="#security">
                Security
              </a>

              <Link to="/about">
                Company Profile
              </Link>

            </div>

          </div>

          {/* COPYRIGHT */}

          <div className="zen-footer-bottom">

            <span>
              © {new Date().getFullYear()} ZENIMONIES.
              All rights reserved.
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
