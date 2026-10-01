import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type InsuranceType = 'motor' | 'personal';

type Plan = {
  variation_code: string;
  name: string;
  variation_amount?: string | number;
  fixedPrice?: boolean;
  serviceID?: string;
};

type InsuranceResponse = {
  success?: boolean;
  message?: string;
  plans?: Plan[];
  data?: Plan[];
};

const formatNaira = (value: number | string) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getToken = () =>
  localStorage.getItem('zenimonies_token') ||
  localStorage.getItem('token') ||
  '';

const Insurance: React.FC = () => {
  const navigate = useNavigate();

  const [insuranceType, setInsuranceType] =
    useState<InsuranceType>('motor');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [selectedPlan, setSelectedPlan] =
    useState<Plan | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ============================================================
  // MOTOR INSURANCE
  // ============================================================

  const [motorForm, setMotorForm] = useState({
    insuredName: '',
    phone: '',
    email: '',
    plateNumber: '',
    chassisNumber: '',
    engineCapacity: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    yearOfMake: '',
    state: '',
    lga: '',
  });

  // ============================================================
  // PERSONAL ACCIDENT
  // ============================================================

  const [personalForm, setPersonalForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    dob: '',
    nextKinName: '',
    nextKinPhone: '',
    occupation: '',
  });

  const [transactionPin, setTransactionPin] = useState('');

  // ============================================================
  // LOAD PLANS
  // ============================================================

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      setError('');
      setMessage('');
      setSelectedPlan(null);

      const token = getToken();

      const service =
        insuranceType === 'motor'
          ? 'ui-insure'
          : 'personal-accident-insurance';

      const response = await fetch(
        `${API_URL}/insurance/plans?serviceID=${encodeURIComponent(
          service
        )}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result: InsuranceResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to load insurance plans.'
        );
      }

      const returnedPlans =
        result.plans ||
        result.data ||
        [];

      setPlans(
        Array.isArray(returnedPlans)
          ? returnedPlans
          : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load insurance plans. Please try again.'
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [insuranceType]);

  // ============================================================
  // SELECT PLAN
  // ============================================================

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowForm(true);
    setError('');
    setMessage('');
  };

  // ============================================================
  // FORM VALIDATION
  // ============================================================

  const validateForm = () => {
    if (!selectedPlan) {
      setError('Please select an insurance plan.');
      return false;
    }

    if (!transactionPin || transactionPin.length !== 4) {
      setError('Please enter your 4-digit transaction PIN.');
      return false;
    }

    if (insuranceType === 'motor') {
      if (!motorForm.insuredName.trim()) {
        setError('Please enter the insured name.');
        return false;
      }

      if (!motorForm.phone.trim()) {
        setError('Please enter the phone number.');
        return false;
      }

      if (!motorForm.email.trim()) {
        setError('Please enter the email address.');
        return false;
      }

      if (!motorForm.plateNumber.trim()) {
        setError('Please enter the vehicle plate number.');
        return false;
      }

      if (!motorForm.chassisNumber.trim()) {
        setError('Please enter the chassis number.');
        return false;
      }

      if (!motorForm.engineCapacity.trim()) {
        setError('Please enter the engine capacity.');
        return false;
      }

      if (!motorForm.vehicleMake.trim()) {
        setError('Please enter the vehicle make.');
        return false;
      }

      if (!motorForm.vehicleModel.trim()) {
        setError('Please enter the vehicle model.');
        return false;
      }

      if (!motorForm.vehicleColor.trim()) {
        setError('Please enter the vehicle colour.');
        return false;
      }

      if (!motorForm.yearOfMake.trim()) {
        setError('Please enter the year of manufacture.');
        return false;
      }

      if (!motorForm.state.trim()) {
        setError('Please enter the state.');
        return false;
      }

      if (!motorForm.lga.trim()) {
        setError('Please enter the LGA.');
        return false;
      }
    }

    if (insuranceType === 'personal') {
      if (!personalForm.fullName.trim()) {
        setError('Please enter your full name.');
        return false;
      }

      if (!personalForm.phone.trim()) {
        setError('Please enter your phone number.');
        return false;
      }

      if (!personalForm.address.trim()) {
        setError('Please enter your address.');
        return false;
      }

      if (!personalForm.dob) {
        setError('Please enter your date of birth.');
        return false;
      }

      if (!personalForm.nextKinName.trim()) {
        setError("Please enter your next of kin's name.");
        return false;
      }

      if (!personalForm.nextKinPhone.trim()) {
        setError("Please enter your next of kin's phone.");
        return false;
      }

      if (!personalForm.occupation.trim()) {
        setError('Please enter your occupation.');
        return false;
      }
    }

    return true;
  };

  // ============================================================
  // PURCHASE
  // ============================================================

  const handlePurchase = async () => {
    try {
      setError('');
      setMessage('');

      if (!validateForm()) {
        return;
      }

      setProcessing(true);

      const token = getToken();

      const serviceID =
        insuranceType === 'motor'
          ? 'ui-insure'
          : 'personal-accident-insurance';

      const payload: any = {
        serviceID,
        variation_code:
          selectedPlan?.variation_code,
        transaction_pin: transactionPin,
      };

      if (insuranceType === 'motor') {
        payload.billersCode =
          motorForm.plateNumber.trim();

        payload.phone =
          motorForm.phone.trim();

        payload.Insured_Name =
          motorForm.insuredName.trim();

        payload.email =
          motorForm.email.trim();

        payload.engine_capacity =
          motorForm.engineCapacity.trim();

        payload.Chasis_Number =
          motorForm.chassisNumber.trim();

        payload.Plate_Number =
          motorForm.plateNumber.trim();

        payload.vehicle_make =
          motorForm.vehicleMake.trim();

        payload.vehicle_color =
          motorForm.vehicleColor.trim();

        payload.vehicle_model =
          motorForm.vehicleModel.trim();

        payload.YearofMake =
          motorForm.yearOfMake.trim();

        payload.state =
          motorForm.state.trim();

        payload.lga =
          motorForm.lga.trim();
      }

      if (insuranceType === 'personal') {
        payload.billersCode =
          personalForm.fullName.trim();

        payload.phone =
          personalForm.phone.trim();

        payload.full_name =
          personalForm.fullName.trim();

        payload.address =
          personalForm.address.trim();

        payload.dob =
          personalForm.dob;

        payload.next_kin_name =
          personalForm.nextKinName.trim();

        payload.next_kin_phone =
          personalForm.nextKinPhone.trim();

        payload.business_occupation =
          personalForm.occupation.trim();
      }

      const response = await fetch(
        `${API_URL}/insurance`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            'Insurance purchase failed.'
        );
      }

      setMessage(
        result.message ||
          'Insurance purchase submitted successfully.'
      );

      setTransactionPin('');

      if (
        result.status === 'pending' ||
        result.data?.status === 'pending'
      ) {
        setMessage(
          'Your insurance purchase is pending confirmation. Please check your transaction history shortly.'
        );
      }

      setTimeout(() => {
        navigate('/transactions');
      }, 1800);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to complete insurance purchase.'
      );
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const handleBackToPlans = () => {
    setShowForm(false);
    setSelectedPlan(null);
    setTransactionPin('');
    setError('');
    setMessage('');
  };

  // ============================================================
  // DISPLAY PRICE
  // ============================================================

  const selectedAmount = useMemo(() => {
    if (!selectedPlan) return 0;

    return Number(
      selectedPlan.variation_amount || 0
    );
  }, [selectedPlan]);

  // ============================================================
  // INPUT STYLES
  // ============================================================

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    border: '1px solid #d7e5dc',
    borderRadius: '12px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#34443a',
    marginBottom: '7px',
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5faf7',
        paddingBottom: '40px',
      }}
    >
      {/* HEADER */}

      <div
        style={{
          background: '#087f45',
          color: '#fff',
          padding: '18px 18px 24px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '15px',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '20px',
          }}
        >
          ← Back
        </button>

        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            opacity: 0.9,
          }}
        >
          ZENIMONIES
        </div>

        <h1
          style={{
            margin: '7px 0 5px',
            fontSize: '28px',
            fontWeight: 700,
          }}
        >
          Insurance
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: '14px',
            opacity: 0.9,
          }}
        >
          Protect yourself, your vehicle and what matters.
        </p>
      </div>

      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '20px 16px',
        }}
      >
        {/* TYPE SELECTOR */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '18px',
          }}
        >
          <button
            onClick={() => {
              setInsuranceType('motor');
              setShowForm(false);
            }}
            style={{
              border:
                insuranceType === 'motor'
                  ? '2px solid #087f45'
                  : '1px solid #d9e5de',
              background:
                insuranceType === 'motor'
                  ? '#e9f8ef'
                  : '#fff',
              borderRadius: '16px',
              padding: '16px 10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: '25px',
                marginBottom: '7px',
              }}
            >
              🚗
            </div>

            <div
              style={{
                fontWeight: 700,
                color: '#18372a',
              }}
            >
              Motor Insurance
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#65756b',
                marginTop: '4px',
              }}
            >
              Third-party vehicle cover
            </div>
          </button>

          <button
            onClick={() => {
              setInsuranceType('personal');
              setShowForm(false);
            }}
            style={{
              border:
                insuranceType === 'personal'
                  ? '2px solid #087f45'
                  : '1px solid #d9e5de',
              background:
                insuranceType === 'personal'
                  ? '#e9f8ef'
                  : '#fff',
              borderRadius: '16px',
              padding: '16px 10px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: '25px',
                marginBottom: '7px',
              }}
            >
              🛡️
            </div>

            <div
              style={{
                fontWeight: 700,
                color: '#18372a',
              }}
            >
              Personal Accident
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#65756b',
                marginTop: '4px',
              }}
            >
              Personal accident cover
            </div>
          </button>
        </div>

        {/* ALERTS */}

        {error && (
          <div
            style={{
              background: '#fff0f0',
              border: '1px solid #f0bcbc',
              color: '#a52626',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '14px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: '#eaf8ef',
              border: '1px solid #b9dfc7',
              color: '#176b3d',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '14px',
              fontSize: '14px',
            }}
          >
            {message}
          </div>
        )}

        {/* PLANS */}

        {!showForm && (
          <>
            <div
              style={{
                background: '#fff',
                borderRadius: '18px',
                padding: '18px',
                border: '1px solid #e1ebe5',
                marginBottom: '16px',
              }}
            >
              <h2
                style={{
                  margin: '0 0 5px',
                  fontSize: '19px',
                  color: '#18372a',
                }}
              >
                Choose your cover
              </h2>

              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#718078',
                }}
              >
                Select an available VTpass insurance plan.
              </p>
            </div>

            {loadingPlans ? (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  padding: '35px 20px',
                  textAlign: 'center',
                  color: '#68776e',
                }}
              >
                Loading insurance plans...
              </div>
            ) : plans.length === 0 ? (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  padding: '35px 20px',
                  textAlign: 'center',
                  border: '1px solid #e1ebe5',
                }}
              >
                <div
                  style={{
                    fontSize: '35px',
                    marginBottom: '10px',
                  }}
                >
                  🛡️
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    color: '#18372a',
                    marginBottom: '7px',
                  }}
                >
                  No plans available
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    color: '#718078',
                    marginBottom: '15px',
                  }}
                >
                  We could not load the current insurance plans.
                </div>

                <button
                  onClick={loadPlans}
                  style={{
                    border: 'none',
                    background: '#087f45',
                    color: '#fff',
                    padding: '11px 18px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                }}
              >
                {plans.map((plan) => (
                  <div
                    key={`${plan.variation_code}-${plan.name}`}
                    style={{
                      background: '#fff',
                      border: '1px solid #dfe9e3',
                      borderRadius: '18px',
                      padding: '18px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '15px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#18372a',
                            marginBottom: '7px',
                          }}
                        >
                          {plan.name}
                        </div>

                        <div
                          style={{
                            fontSize: '19px',
                            fontWeight: 800,
                            color: '#087f45',
                          }}
                        >
                          {formatNaira(
                            plan.variation_amount || 0
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleSelectPlan(plan)
                        }
                        style={{
                          background: '#087f45',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '11px',
                          padding: '11px 15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* FORM */}

        {showForm && selectedPlan && (
          <div>
            <button
              onClick={handleBackToPlans}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#087f45',
                fontWeight: 700,
                padding: '0',
                marginBottom: '14px',
                cursor: 'pointer',
              }}
            >
              ← Change plan
            </button>

            {/* SELECTED PLAN */}

            <div
              style={{
                background: '#087f45',
                color: '#fff',
                borderRadius: '18px',
                padding: '18px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  opacity: 0.85,
                  marginBottom: '5px',
                }}
              >
                SELECTED PLAN
              </div>

              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                }}
              >
                {selectedPlan.name}
              </div>

              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  marginTop: '7px',
                }}
              >
                {formatNaira(selectedAmount)}
              </div>
            </div>

            {/* MOTOR FORM */}

            {insuranceType === 'motor' && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  border: '1px solid #e1ebe5',
                  padding: '18px',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 17px',
                    fontSize: '19px',
                    color: '#18372a',
                  }}
                >
                  Vehicle information
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gap: '14px',
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Insured name
                    </label>
                    <input
                      value={motorForm.insuredName}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          insuredName: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={motorForm.phone}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          phone: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="08012345678"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Email address
                    </label>
                    <input
                      type="email"
                      value={motorForm.email}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          email: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Plate number
                    </label>
                    <input
                      value={motorForm.plateNumber}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          plateNumber:
                            e.target.value.toUpperCase(),
                        })
                      }
                      style={inputStyle}
                      placeholder="ABC123XY"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Chassis number
                    </label>
                    <input
                      value={motorForm.chassisNumber}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          chassisNumber:
                            e.target.value.toUpperCase(),
                        })
                      }
                      style={inputStyle}
                      placeholder="Vehicle chassis number"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Engine capacity
                    </label>
                    <input
                      value={motorForm.engineCapacity}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          engineCapacity: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="e.g. 1800"
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <label style={labelStyle}>
                        Vehicle make
                      </label>
                      <input
                        value={motorForm.vehicleMake}
                        onChange={(e) =>
                          setMotorForm({
                            ...motorForm,
                            vehicleMake:
                              e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="Toyota"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Vehicle model
                      </label>
                      <input
                        value={motorForm.vehicleModel}
                        onChange={(e) =>
                          setMotorForm({
                            ...motorForm,
                            vehicleModel:
                              e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="Camry"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <label style={labelStyle}>
                        Vehicle colour
                      </label>
                      <input
                        value={motorForm.vehicleColor}
                        onChange={(e) =>
                          setMotorForm({
                            ...motorForm,
                            vehicleColor:
                              e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="Black"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Year of make
                      </label>
                      <input
                        value={motorForm.yearOfMake}
                        onChange={(e) =>
                          setMotorForm({
                            ...motorForm,
                            yearOfMake:
                              e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="2022"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      State
                    </label>
                    <input
                      value={motorForm.state}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          state: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Edo"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      LGA
                    </label>
                    <input
                      value={motorForm.lga}
                      onChange={(e) =>
                        setMotorForm({
                          ...motorForm,
                          lga: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Local Government Area"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PERSONAL ACCIDENT FORM */}

            {insuranceType === 'personal' && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  border: '1px solid #e1ebe5',
                  padding: '18px',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 17px',
                    fontSize: '19px',
                    color: '#18372a',
                  }}
                >
                  Personal information
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gap: '14px',
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Full name
                    </label>
                    <input
                      value={personalForm.fullName}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          fullName: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={personalForm.phone}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          phone: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="08012345678"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Address
                    </label>
                    <textarea
                      value={personalForm.address}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          address: e.target.value,
                        })
                      }
                      style={{
                        ...inputStyle,
                        minHeight: '85px',
                        resize: 'vertical',
                      }}
                      placeholder="Residential address"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Date of birth
                    </label>
                    <input
                      type="date"
                      value={personalForm.dob}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          dob: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Next of kin name
                    </label>
                    <input
                      value={personalForm.nextKinName}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          nextKinName:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Next of kin"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Next of kin phone
                    </label>
                    <input
                      type="tel"
                      value={personalForm.nextKinPhone}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          nextKinPhone:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="08012345678"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Occupation
                    </label>
                    <input
                      value={personalForm.occupation}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          occupation:
                            e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Occupation"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PIN */}

            <div
              style={{
                background: '#fff',
                borderRadius: '18px',
                border: '1px solid #e1ebe5',
                padding: '18px',
                marginTop: '14px',
              }}
            >
              <label style={labelStyle}>
                Transaction PIN
              </label>

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={transactionPin}
                onChange={(e) =>
                  setTransactionPin(
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 4)
                  )
                }
                style={{
                  ...inputStyle,
                  letterSpacing: '7px',
                  textAlign: 'center',
                  fontSize: '20px',
                }}
                placeholder="••••"
              />

              <p
                style={{
                  fontSize: '12px',
                  color: '#718078',
                  margin:
                    '8px 0 0',
                }}
              >
                Your PIN is required to authorize this payment.
              </p>
            </div>

            {/* PAY BUTTON */}

            <button
              onClick={handlePurchase}
              disabled={processing}
              style={{
                width: '100%',
                border: 'none',
                background: processing
                  ? '#9ab8a7'
                  : '#087f45',
                color: '#fff',
                borderRadius: '14px',
                padding: '15px',
                marginTop: '16px',
                fontSize: '16px',
                fontWeight: 800,
                cursor: processing
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {processing
                ? 'Processing...'
                : `Pay ${formatNaira(
                    selectedAmount
                  )}`}
            </button>

            <div
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#7b887f',
                marginTop: '12px',
                lineHeight: 1.5,
              }}
            >
              Insurance payments are processed securely
              through the ZENIMONIES payment system.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insurance;
