import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Service = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const SERVICES: Service[] = [
  {
    id: 'gift-cards',
    name: 'Gift Cards',
    description: 'Buy and sell digital gift cards',
    icon: '🎁',
  },
  {
    id: 'online-shopping',
    name: 'Online Shopping',
    description: 'Shop and pay online',
    icon: '🛍️',
  },
  {
    id: 'government',
    name: 'Government Payments',
    description: 'Government fees and payments',
    icon: '🏛️',
  },
  {
    id: 'transport',
    name: 'Transport',
    description: 'Transport tickets and fares',
    icon: '🚌',
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Travel and flight bookings',
    icon: '✈️',
  },
  {
    id: 'aid-donations',
    name: 'Aid, Grants & Donations',
    description: 'Donations and eligible aid services',
    icon: '❤️',
  },
  {
    id: 'solar',
    name: 'Solar',
    description: 'Solar equipment and energy services',
    icon: '☀️',
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Educational payments and services',
    icon: '🎓',
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Insurance products and payments',
    icon: '🛡️',
  },
];

const ACTIVE_SERVICE_IDS = new Set([
  'gift-cards',
  'education',
]);

const OtherBills: React.FC = () => {
  const navigate = useNavigate();

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const handleServiceClick = (
    service: Service
  ) => {
    // ======================================================
    // ACTIVE SERVICES
    // ======================================================

    if (service.id === 'gift-cards') {
      navigate('/gift-cards');
      return;
    }

    if (service.id === 'education') {
      navigate('/education');
      return;
    }

    // ======================================================
    // ALL OTHER SERVICES
    // ======================================================
    // These services are intentionally marked Coming Soon.
    // No provider payment flow is opened.
    // ======================================================

    setSelectedService(service);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f8f6',
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily:
          "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '25px',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              border: '1px solid #e0e9e3',
              background: '#ffffff',
              color: '#145c39',
              fontSize: '22px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ←
          </button>

          <div>
            <h1
              style={{
                margin: 0,
                color: '#145c39',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              Other Bills & Services
            </h1>

            <p
              style={{
                margin: '5px 0 0',
                color: '#748078',
                fontSize: '13px',
              }}
            >
              More services, all in one place
            </p>
          </div>
        </div>

        {/* ==================================================
            ZENIMONIES BANNER
        ================================================== */}

        <div
          style={{
            background:
              'linear-gradient(135deg, #176b43, #104d32)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '25px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background:
                'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0,
            }}
          >
            💳
          </div>

          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                marginBottom: '5px',
              }}
            >
              ZENIMONIES Services
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#d9eee2',
                lineHeight: 1.6,
              }}
            >
              Explore more ways to pay and
              manage your everyday needs.
            </div>
          </div>
        </div>

        {/* ==================================================
            SECTION TITLE
        ================================================== */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '15px',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#193b2a',
              fontSize: '17px',
              fontWeight: 800,
            }}
          >
            Available Categories
          </h2>

          <span
            style={{
              background: '#e5f3e9',
              color: '#176b43',
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 10px',
              borderRadius: '20px',
            }}
          >
            {SERVICES.length} Services
          </span>
        </div>

        {/* ==================================================
            SERVICES GRID
        ================================================== */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',
            gap: '13px',
          }}
        >
          {SERVICES.map(
            (service) => {
              const isActive =
                ACTIVE_SERVICE_IDS.has(
                  service.id
                );

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    handleServiceClick(
                      service
                    )
                  }
                  style={{
                    position: 'relative',
                    background: '#ffffff',
                    border:
                      '1px solid #e4ece6',
                    borderRadius: '16px',
                    padding: '18px 14px',
                    minHeight: '150px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow:
                      '0 3px 12px rgba(20, 92, 57, 0.035)',
                  }}
                >
                  {/* ==================================================
                      STATUS BADGE
                  ================================================== */}

                  {!isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '10px',
                        background: '#f1f4f2',
                        color: '#718078',
                        fontSize: '9px',
                        fontWeight: 800,
                        padding:
                          '5px 7px',
                        borderRadius:
                          '8px',
                        letterSpacing:
                          '0.2px',
                      }}
                    >
                      COMING SOON
                    </div>
                  )}

                  {/* ==================================================
                      ICON
                  ================================================== */}

                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '13px',
                      background:
                        '#eaf5ed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      marginBottom: '14px',
                    }}
                  >
                    {service.icon}
                  </div>

                  {/* ==================================================
                      NAME
                  ================================================== */}

                  <div
                    style={{
                      color: '#193b2a',
                      fontSize: '14px',
                      fontWeight: 800,
                      lineHeight: 1.4,
                      marginBottom: '6px',
                      paddingRight:
                        isActive
                          ? '0'
                          : '55px',
                    }}
                  >
                    {service.name}
                  </div>

                  {/* ==================================================
                      DESCRIPTION
                  ================================================== */}

                  <div
                    style={{
                      color: '#7b857e',
                      fontSize: '12px',
                      lineHeight: 1.5,
                    }}
                  >
                    {service.description}
                  </div>

                  {/* ==================================================
                      ACTION
                  ================================================== */}

                  <div
                    style={{
                      color: isActive
                        ? '#176b43'
                        : '#8a968f',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginTop: '12px',
                    }}
                  >
                    {isActive
                      ? 'Explore →'
                      : 'Coming Soon'}
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* ==================================================
            COMING SOON MESSAGE
        ================================================== */}

        {selectedService && (
          <div
            role="status"
            style={{
              marginTop: '22px',
              padding: '17px',
              borderRadius: '14px',
              background: '#ffffff',
              border:
                '1px solid #dcece1',
              boxShadow:
                '0 3px 12px rgba(20, 92, 57, 0.035)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '23px',
                }}
              >
                {selectedService.icon}
              </span>

              <div>
                <strong
                  style={{
                    color: '#145c39',
                    fontSize: '15px',
                  }}
                >
                  {selectedService.name}
                </strong>

                <div
                  style={{
                    marginTop: '3px',
                    color: '#8a968f',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing:
                      '0.5px',
                  }}
                >
                  COMING SOON
                </div>
              </div>
            </div>

            <p
              style={{
                color: '#68786d',
                fontSize: '13px',
                lineHeight: 1.7,
                margin: '0 0 15px',
              }}
            >
              This service is coming soon
              to ZENIMONIES. We are
              working on the required
              provider integration before
              making it available to
              customers.
            </p>

            <button
              type="button"
              onClick={() =>
                setSelectedService(null)
              }
              style={{
                width: '100%',
                height: '44px',
                border: 'none',
                borderRadius: '11px',
                background: '#176b43',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginTop: '28px',
            paddingBottom: '20px',
            color: '#89958d',
            fontSize: '12px',
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              color: '#176b43',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '5px',
            }}
          >
            ZENIMONIES
          </div>

          Secure banking for your everyday needs.
        </div>
      </div>
    </div>
  );
};

export default OtherBills;
