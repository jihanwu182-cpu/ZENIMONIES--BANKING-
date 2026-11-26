
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  ArrowBackRounded,
  DownloadRounded,
  ShareRounded,
  RefreshRounded,
  DescriptionRounded,
  ContentCopyRounded,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Transaction {
  id?: string;
  type?: string;
  transaction_type?: string;
  category?: string;
  description?: string;
  amount?: number | string;
  currency?: string;
  sender_name?: string;
  sender_phone?: string;
  sender_account?: string;
  sender_bank?: string;
  transfer_sender_name?: string;
  transfer_sender_phone?: string;
  transfer_sender_account?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_account?: string;
  recipient_bank?: string;
  receiver_name?: string;
  receiver_account?: string;
  receiver_bank?: string;
  account_number?: string;
  bank_name?: string;
  reference?: string;
  transaction_reference?: string;
  status?: string;
  transaction_fee?: number | string;
  fee?: number | string;
  total_debit?: number | string;
  created_at?: string;
  date?: string;
  timestamp?: string;
  electricity_token?: string;
  token?: string;
  prepaid_token?: string;
  units?: number | string;
  kwh?: number | string;
  unit?: number | string;
  meter_number?: string;
  meter_type?: string;
  biller_name?: string;
  disco_name?: string;
  customer_name?: string;
  verification_status?: string;
  tariff_class?: string;
  provider_reference?: string;
  provider_response_message?: string;
  provider?: string;
  betting_provider?: string;
  betting_account_id?: string;
  account_id?: string;
  customer_reference?: string;
  customer_number?: string;
  certificate_url?: string;
  certificateUrl?: string;
  [key: string]: any;
}

const COLORS = {
  primary: '#087F5B',
  dark: '#075B42',
  text: '#173A31',
  muted: '#687772',
  border: '#E0E7E3',
  background: '#F4F7F5',
  white: '#FFFFFF',
  success: '#087F5B',
  danger: '#C62828',
  warning: '#A76500',
};

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const TransactionReceipt: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const receiptRef = useRef<HTMLDivElement>(null);

  const electricityTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const electricityInFlightRef = useRef(false);

  const insuranceTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const insuranceInFlightRef = useRef(false);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [insuranceChecking, setInsuranceChecking] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [requeryMessage, setRequeryMessage] = useState('');
  const [electricityTokenOverride, setElectricityTokenOverride] = useState('');
  const [electricityUnitsOverride, setElectricityUnitsOverride] =
    useState<string | number>('');
  const [electricityRefunded, setElectricityRefunded] = useState(false);

  const transaction =
    location.state?.transaction as Transaction | undefined;

  const reference = String(
    transaction?.reference ||
      transaction?.transaction_reference ||
      ''
  ).trim();

  const rawType = String(
    transaction?.transaction_type ||
      transaction?.type ||
      transaction?.category ||
      ''
  ).toLowerCase();

  const rawDescription = String(
    transaction?.description || ''
  ).toLowerCase();

  const rawCategory = String(
    transaction?.category || ''
  ).toLowerCase();

  const normalizedReference = reference.toUpperCase();

  const isBetting =
    rawType.includes('betting') ||
    rawType.includes('bet_funding') ||
    rawType.includes('bet-funding') ||
    rawCategory.includes('betting') ||
    rawCategory.includes('bet') ||
    rawDescription.includes('betting') ||
    rawDescription.includes('bet funding') ||
    rawDescription.includes('betting account funding') ||
    normalizedReference.startsWith('ZBET-');

  const isElectricityRefund =
    rawType.includes('electricity_refund') ||
    rawDescription.includes('electricity refund') ||
    normalizedReference.startsWith('REF-ZEL-');

  const isElectricity =
    !isBetting &&
    !isElectricityRefund &&
    (
      rawType.includes('electricity') ||
      rawCategory.includes('electricity') ||
      rawDescription.includes('electricity') ||
      normalizedReference.startsWith('ZEL-') ||
      Boolean(
        transaction?.electricity_token ||
        transaction?.meter_number ||
        transaction?.units
      )
    );

  const isInsurance =
    rawType.includes('insurance') ||
    rawCategory.includes('insurance') ||
    rawDescription.includes('insurance') ||
    normalizedReference.startsWith('ZINS-');

  const isTransfer =
    rawType.includes('transfer') ||
    rawDescription.includes('transfer');

  const isIncoming =
    rawType.includes('internal_transfer_received') ||
    rawType.includes('transfer_received') ||
    rawType.includes('incoming') ||
    rawType.includes('received') ||
    transaction?.category === 'credit' ||
    transaction?.category === 'incoming' ||
    rawDescription.includes('money received') ||
    rawDescription.includes('transfer received') ||
    rawDescription.includes('received');

  const rawStatus = String(
    transaction?.status || ''
  ).trim().toLowerCase();

  const effectiveStatus =
    (isInsurance || isElectricity) && liveStatus
      ? liveStatus
      : rawStatus;

  const isSuccessful = [
    'successful',
    'completed',
    'success',
    'delivered',
  ].includes(effectiveStatus);

  const isFailed = [
    'failed',
    'failure',
    'reversed',
    'cancelled',
    'canceled',
    'refunded',
  ].includes(effectiveStatus);

  const isPending = !isSuccessful && !isFailed;

  const shortStatus = isSuccessful
    ? 'Successful'
    : isFailed
      ? 'Failed'
      : 'Pending';

  const statusColor = isSuccessful
    ? COLORS.success
    : isFailed
      ? COLORS.danger
      : COLORS.warning;

  const amount = Number(transaction?.amount ?? 0);

  const fee = Number(
    transaction?.transaction_fee ??
      transaction?.fee ??
      0
  );

  const currency = String(
    transaction?.currency || 'NGN'
  ).toUpperCase();

  const formatMoney = (value: number) => {
    const safe = Number.isFinite(value)
      ? Math.abs(value)
      : 0;

    try {
      return new Intl.NumberFormat(
        currency === 'ZAR' ? 'en-ZA' : 'en-NG',
        {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ).format(safe);
    } catch {
      return `₦${safe.toFixed(2)}`;
    }
  };

  const transactionDate =
    transaction?.created_at ||
    transaction?.date ||
    transaction?.timestamp;

  const parsedDate = transactionDate
    ? new Date(transactionDate)
    : null;

  const validDate =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate
      : null;

  const formatDate = () =>
    validDate
      ? validDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : String(transactionDate || '');

  const formatTime = () =>
    validDate
      ? validDate.toLocaleTimeString('en-NG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '';

  const getLoggedInUserName = () => {
    try {
      const raw = localStorage.getItem('zenimonies_user');

      if (!raw) return '';

      const user = JSON.parse(raw);

      return (
        user?.full_name ||
        user?.fullName ||
        user?.name ||
        user?.user?.full_name ||
        user?.user?.fullName ||
        user?.user?.name ||
        ''
      );
    } catch (error) {
      console.error(
        'Unable to retrieve registered sender name:',
        error
      );

      return '';
    }
  };

  const senderName =
    transaction?.sender_name ||
    transaction?.transfer_sender_name ||
    transaction?.sender_full_name ||
    transaction?.sender ||
    (isIncoming ? '' : getLoggedInUserName());

  const beneficiaryName =
    transaction?.recipient_name ||
    transaction?.receiver_name ||
    '';

  const bettingProvider = String(
    transaction?.betting_provider ||
      transaction?.provider ||
      transaction?.biller_name ||
      ''
  ).trim();

  const bettingAccountId = String(
    transaction?.betting_account_id ||
      transaction?.account_id ||
      transaction?.customer_reference ||
      transaction?.customer_number ||
      transaction?.meter_number ||
      ''
  ).trim();

  const electricityToken = String(
    electricityTokenOverride ||
      transaction?.electricity_token ||
      transaction?.token ||
      transaction?.prepaid_token ||
      ''
  ).trim();

  const electricityUnits =
    electricityUnitsOverride !== ''
      ? electricityUnitsOverride
      : transaction?.units ??
        transaction?.kwh ??
        transaction?.unit ??
        '';

  const electricityMeterNumber = String(
    transaction?.meter_number ||
      transaction?.customer_reference ||
      transaction?.customer_number ||
      ''
  ).trim();

  const electricityMeterType = String(
    transaction?.meter_type || ''
  ).trim().toLowerCase();

  const electricityBiller = String(
    transaction?.biller_name ||
      transaction?.disco_name ||
      transaction?.provider ||
      ''
  ).trim();

  const electricityCustomerName = String(
    transaction?.customer_name ||
      transaction?.verified_customer_name ||
      ''
  ).trim();

  const electricityTariff = String(
    transaction?.tariff_class || ''
  ).trim();

  const stopElectricityTimer = () => {
    if (electricityTimerRef.current) {
      clearInterval(electricityTimerRef.current);
      electricityTimerRef.current = null;
    }
  };

  const stopInsuranceTimer = () => {
    if (insuranceTimerRef.current) {
      clearInterval(insuranceTimerRef.current);
      insuranceTimerRef.current = null;
    }
  };

  /*
   * AUTOMATIC ELECTRICITY STATUS CHECK
   * This only checks the existing transaction reference.
   * It never submits another electricity purchase.
   */

  useEffect(() => {
    const current = location.state?.transaction as
      | Transaction
      | undefined;

    if (!current) return;

    const ref = String(
      current.reference ||
        current.transaction_reference ||
        ''
    ).trim();

    const type = String(
      current.transaction_type ||
        current.type ||
        current.category ||
        ''
    ).toLowerCase();

    const description = String(
      current.description || ''
    ).toLowerCase();

    const upperRef = ref.toUpperCase();

    const refund =
      type.includes('electricity_refund') ||
      description.includes('electricity refund') ||
      upperRef.startsWith('REF-ZEL-');

    const electricity =
      !refund &&
      (
        type.includes('electricity') ||
        description.includes('electricity') ||
        upperRef.startsWith('ZEL-')
      );

    if (!electricity || !ref) return;

    const initial = String(
      current.status || ''
    ).toLowerCase();

    const finalStatuses = [
      'completed',
      'successful',
      'success',
      'delivered',
      'failed',
      'failure',
      'refunded',
      'cancelled',
      'canceled',
      'reversed',
    ];

    if (finalStatuses.includes(initial)) return;

    let cancelled = false;

    const checkStatus = async () => {
      if (
        cancelled ||
        electricityInFlightRef.current
      ) {
        return;
      }

      electricityInFlightRef.current = true;

      try {
        const token = localStorage.getItem(
          'zenimonies_token'
        );

        if (!token) {
          if (!cancelled) {
            setRequeryMessage(
              'Please sign in again to continue checking this payment. Do not pay again.'
            );
          }

          return;
        }

        const response = await fetch(
          `${API_URL}/bills/electricity/requery/${encodeURIComponent(ref)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }
        );

        const result: any =
          await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error ||
              'Unable to check electricity payment.'
          );
        }

        if (cancelled) return;

        const status = String(
          result?.status || ''
        ).trim().toLowerCase();

        if (
          [
            'completed',
            'successful',
            'success',
            'delivered',
          ].includes(status)
        ) {
          setLiveStatus('completed');
          setElectricityRefunded(false);

          setElectricityTokenOverride(
            String(
              result?.electricity_token ||
                result?.token ||
                result?.data?.token ||
                ''
            )
          );

          const units =
            result?.units ??
            result?.data?.units ??
            result?.data?.units_purchased;

          if (units !== undefined && units !== null) {
            setElectricityUnitsOverride(units);
          }

          setRequeryMessage(
            result?.message ||
              'Electricity payment confirmed successfully.'
          );

          stopElectricityTimer();
          return;
        }

        if (
          [
            'failed',
            'failure',
            'refunded',
            'cancelled',
            'canceled',
            'reversed',
          ].includes(status)
        ) {
          setLiveStatus('failed');

          setElectricityRefunded(
            Boolean(result?.refunded)
          );

          setRequeryMessage(
            result?.message ||
              (result?.refunded
                ? 'The payment failed and your wallet has been refunded.'
                : 'The electricity payment was not completed.')
          );

          stopElectricityTimer();
          return;
        }

        setLiveStatus('pending');

        setRequeryMessage(
          result?.message ||
            'Your payment is still processing. We are checking automatically. Please do not make another payment.'
        );
      } catch (error) {
        console.error(
          'ZENIMONIES automatic electricity requery error:',
          error
        );

        if (!cancelled) {
          setRequeryMessage(
            'Your payment is still being checked. Please do not submit another payment.'
          );
        }
      } finally {
        electricityInFlightRef.current = false;
      }
    };

    void checkStatus();

    electricityTimerRef.current = setInterval(() => {
      void checkStatus();
    }, 5000);

    return () => {
      cancelled = true;
      stopElectricityTimer();
    };
  }, [location.state]);

  /*
   * AUTOMATIC INSURANCE STATUS CHECK
   */

  useEffect(() => {
    const current = location.state?.transaction as
      | Transaction
      | undefined;

    if (!current) return;

    const ref = String(
      current.reference ||
        current.transaction_reference ||
        ''
    ).trim();

    const type = String(
      current.transaction_type ||
        current.type ||
        current.category ||
        ''
    ).toLowerCase();

    const description = String(
      current.description || ''
    ).toLowerCase();

    const category = String(
      current.category || ''
    ).toLowerCase();

    const insurance =
      type.includes('insurance') ||
      category.includes('insurance') ||
      description.includes('insurance') ||
      ref.toUpperCase().startsWith('ZINS-');

    if (!insurance || !ref) return;

    const initial = String(
      current.status || ''
    ).toLowerCase();

    if (
      [
        'failed',
        'failure',
        'reversed',
        'cancelled',
        'canceled',
      ].includes(initial)
    ) {
      return;
    }

    const existingCertificate =
      current.certificate_url ||
      current.certificateUrl ||
      '';

    if (existingCertificate) {
      setCertificateUrl(String(existingCertificate));
    }

    if (
      ['completed', 'successful', 'success'].includes(initial) &&
      existingCertificate
    ) {
      setLiveStatus('completed');
      return;
    }

    let cancelled = false;

    const checkInsurance = async () => {
      if (
        cancelled ||
        insuranceInFlightRef.current
      ) {
        return;
      }

      insuranceInFlightRef.current = true;

      try {
        const token = localStorage.getItem(
          'zenimonies_token'
        );

        const response = await fetch(
          `${API_URL}/insurance/requery`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
            body: JSON.stringify({
              reference: ref,
            }),
          }
        );

        const result: any =
          await response.json().catch(() => null);

        if (!response.ok || cancelled) return;

        const status = String(
          result?.status ||
            result?.data?.status ||
            ''
        ).toLowerCase();

        const certificate =
          result?.certificate_url ||
          result?.certificateUrl ||
          result?.data?.certificate_url ||
          result?.data?.certificateUrl ||
          result?.data?.certUrl ||
          result?.certUrl ||
          '';

        if (certificate) {
          setCertificateUrl(String(certificate));
        }

        if (
          ['completed', 'successful', 'success'].includes(status)
        ) {
          setLiveStatus('completed');

          setRequeryMessage(
            certificate
              ? 'Insurance payment confirmed successfully. Your certificate is ready.'
              : 'Insurance payment confirmed successfully. The certificate is not available yet.'
          );

          stopInsuranceTimer();
        } else if (
          [
            'failed',
            'failure',
            'reversed',
            'cancelled',
            'canceled',
          ].includes(status)
        ) {
          setLiveStatus('failed');

          setRequeryMessage(
            'The insurance transaction was not completed.'
          );

          stopInsuranceTimer();
        } else {
          setLiveStatus('pending');
        }
      } catch (error) {
        console.error(
          'ZENIMONIES insurance automatic requery error:',
          error
        );
      } finally {
        insuranceInFlightRef.current = false;
      }
    };

    void checkInsurance();

    insuranceTimerRef.current = setInterval(() => {
      void checkInsurance();
    }, 5000);

    return () => {
      cancelled = true;
      stopInsuranceTimer();
    };
  }, [location.state]);

  const copyText = async (
    value: string,
    message: string
  ) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      alert(message);
    } catch {
      alert('Unable to copy. Please try again.');
    }
  };

  const fileName = () =>
    `ZENIMONIES-${
      reference
        ? reference.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'transaction'
    }.pdf`;

  const createPDF = async () => {
    if (!receiptRef.current) {
      throw new Error('Receipt unavailable.');
    }

    const canvas = await html2canvas(
      receiptRef.current,
      {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      }
    );

    const image = canvas.toDataURL('image/png', 1);

    const width = 80;
    const height = (canvas.height / canvas.width) * width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [width, height],
      compress: true,
    });

    pdf.addImage(
      image,
      'PNG',
      0,
      0,
      width,
      height,
      undefined,
      'FAST'
    );

    return pdf;
  };

  const handleDownload = async () => {
    if (isIncoming) return;

    try {
      setPdfLoading(true);

      (await createPDF()).save(fileName());
    } catch (error) {
      console.error(
        'ZENIMONIES receipt PDF error:',
        error
      );

      alert('Unable to create the receipt PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setPdfLoading(true);

      const pdf = await createPDF();
      const blob = pdf.output('blob');

      const file = new File(
        [blob],
        fileName(),
        { type: 'application/pdf' }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'ZENIMONIES Transaction Receipt',
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'ZENIMONIES Transaction Receipt',
          text: reference
            ? `ZENIMONIES transaction receipt: ${reference}`
            : 'ZENIMONIES transaction receipt',
        });
      } else {
        alert('Sharing is not available on this device.');
      }
    } catch (error) {
      console.error(
        'ZENIMONIES receipt share error:',
        error
      );
    } finally {
      setPdfLoading(false);
    }
  };

  if (!transaction) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: COLORS.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 390,
            bgcolor: COLORS.white,
            borderRadius: 3,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 800,
              color: COLORS.text,
              mb: 1,
            }}
          >
            Receipt unavailable
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: COLORS.muted,
              mb: 2.5,
            }}
          >
            The transaction details could not be found.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate('/transactions')}
            sx={{
              bgcolor: COLORS.primary,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': {
                bgcolor: COLORS.dark,
              },
            }}
          >
            Back to Transactions
          </Button>
        </Box>
      </Box>
    );
  }

  const sender =
    senderName ||
    transaction.sender_name ||
    '';

  const showElectricity =
    isElectricity && !isElectricityRefund;

  const row = (
    label: string,
    value: string,
    color?: string,
    last = false
  ) => (
    <ReceiptRow
      key={`${label}-${value}`}
      label={label}
      value={value}
      valueColor={color}
      last={last}
    />
  );

  return (
    <Box
      className="receipt-page"
      sx={{
        minHeight: '100vh',
        bgcolor: COLORS.background,
        px: 1.5,
        py: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 430,
          mx: 'auto',
        }}
      >
        <Box
          ref={receiptRef}
          className="receipt-document"
          sx={{
            bgcolor: COLORS.white,
            borderRadius: 2.5,
            overflow: 'hidden',
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <Box sx={{ px: 2, pt: 2, pb: 1.8 }}>
            <Box
              component="img"
              src="/zenimonies-logo-horizontal.png"
              alt="ZENIMONIES BANKING"
              sx={{
                display: 'block',
                width: 185,
                height: 'auto',
                maxHeight: 65,
                objectFit: 'contain',
                objectPosition: 'left center',
              }}
            />

            <Typography
              sx={{
                mt: 1.8,
                color: COLORS.text,
                fontSize: 17,
                fontWeight: 800,
                lineHeight: 1.2,
                textAlign: 'center',
              }}
            >
              Transaction Receipt
            </Typography>
          </Box>

          {/* INSURANCE STATUS */}

          {isInsurance && (
            <Box
              className="no-print"
              sx={{
                mx: 2,
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: isSuccessful
                  ? 'rgba(8,127,91,0.08)'
                  : isFailed
                    ? 'rgba(198,40,40,0.07)'
                    : 'rgba(167,101,0,0.08)',
                border: `1px solid ${
                  isSuccessful
                    ? 'rgba(8,127,91,0.18)'
                    : isFailed
                      ? 'rgba(198,40,40,0.18)'
                      : 'rgba(167,101,0,0.18)'
                }`,
              }}
            >
              <Typography
                sx={{
                  color: statusColor,
                  fontSize: 12,
                  fontWeight: 900,
                  mb: 0.5,
                }}
              >
                Insurance Status
              </Typography>

              <Typography
                sx={{
                  color: COLORS.text,
                  fontSize: 11.5,
                  lineHeight: 1.5,
                }}
              >
                {isSuccessful
                  ? 'Your insurance payment has been confirmed.'
                  : isFailed
                    ? 'The insurance transaction was not completed.'
                    : 'Your insurance payment is waiting for provider confirmation.'}
              </Typography>

              {requeryMessage && (
                <Typography
                  sx={{
                    mt: 0.8,
                    color: COLORS.muted,
                    fontSize: 10.5,
                    lineHeight: 1.45,
                  }}
                >
                  {requeryMessage}
                </Typography>
              )}

              {isPending && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<RefreshRounded />}
                  onClick={async () => {
                    if (insuranceInFlightRef.current) return;

                    insuranceInFlightRef.current = true;
                    setInsuranceChecking(true);
                    setRequeryMessage('');

                    try {
                      const token = localStorage.getItem(
                        'zenimonies_token'
                      );

                      const response = await fetch(
                        `${API_URL}/insurance/requery`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token
                              ? {
                                  Authorization: `Bearer ${token}`,
                                }
                              : {}),
                          },
                          body: JSON.stringify({ reference }),
                        }
                      );

                      const result: any =
                        await response.json().catch(() => null);

                      if (!response.ok) {
                        throw new Error(
                          result?.message ||
                            'Unable to check insurance status.'
                        );
                      }

                      const status = String(
                        result?.status ||
                          result?.data?.status ||
                          ''
                      ).toLowerCase();

                      const cert =
                        result?.certificate_url ||
                        result?.certificateUrl ||
                        result?.data?.certificate_url ||
                        result?.data?.certificateUrl ||
                        '';

                      if (cert) {
                        setCertificateUrl(String(cert));
                      }

                      if (
                        [
                          'completed',
                          'successful',
                          'success',
                        ].includes(status)
                      ) {
                        setLiveStatus('completed');
                        setRequeryMessage(
                          'Insurance payment confirmed successfully.'
                        );
                        stopInsuranceTimer();
                      } else if (
                        [
                          'failed',
                          'failure',
                          'reversed',
                          'cancelled',
                          'canceled',
                        ].includes(status)
                      ) {
                        setLiveStatus('failed');
                        setRequeryMessage(
                          'The insurance transaction was not completed.'
                        );
                        stopInsuranceTimer();
                      } else {
                        setLiveStatus('pending');
                        setRequeryMessage(
                          'The insurance provider has not confirmed the transaction yet.'
                        );
                      }
                    } catch (error) {
                      setRequeryMessage(
                        error instanceof Error
                          ? error.message
                          : 'Unable to check insurance status.'
                      );
                    } finally {
                      insuranceInFlightRef.current = false;
                      setInsuranceChecking(false);
                    }
                  }}
                  disabled={insuranceChecking}
                  sx={{
                    mt: 1.2,
                    minHeight: 42,
                    bgcolor: COLORS.primary,
                    borderRadius: 1.8,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: 12,
                    '&:hover': {
                      bgcolor: COLORS.dark,
                    },
                  }}
                >
                  {insuranceChecking
                    ? 'Checking Status...'
                    : 'Check Status Now'}
                </Button>
              )}

              {isSuccessful && certificateUrl && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<DescriptionRounded />}
                  onClick={() =>
                    window.open(
                      certificateUrl,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  sx={{
                    mt: 1.2,
                    minHeight: 42,
                    bgcolor: COLORS.primary,
                    borderRadius: 1.8,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: 12,
                    '&:hover': {
                      bgcolor: COLORS.dark,
                    },
                  }}
                >
                  View Insurance Certificate
                </Button>
              )}
            </Box>
          )}

          {/* BETTING ACCOUNT FUNDING */}

          {isBetting && (
            <Box
              sx={{
                mx: 2,
                mb: 1.5,
                borderRadius: 2.2,
                overflow: 'hidden',
                border: `1px solid ${COLORS.border}`,
                background: '#FAFCFB',
              }}
            >
              <Box
                sx={{
                  px: 1.6,
                  py: 1.25,
                  background: 'rgba(8,127,91,0.07)',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <Typography
                  sx={{
                    color: COLORS.primary,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Betting Account Funding
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    color: COLORS.muted,
                    fontSize: 10,
                  }}
                >
                  Betting account funding details
                </Typography>
              </Box>

              {bettingProvider &&
                row(
                  'Provider',
                  bettingProvider.replace(/^./, (c) =>
                    c.toUpperCase()
                  )
                )}

              {bettingAccountId &&
                row('Betting Account', bettingAccountId)}
            </Box>
          )}

          {/* ELECTRICITY PAYMENT */}

          {showElectricity && (
            <>
              <Box
                className="no-print"
                sx={{
                  mx: 2,
                  mb: 1.5,
                  p: 1.6,
                  borderRadius: 2.2,
                  background: isSuccessful
                    ? 'rgba(8,127,91,0.08)'
                    : isFailed
                      ? 'rgba(198,40,40,0.07)'
                      : 'rgba(167,101,0,0.08)',
                  border: `1px solid ${
                    isSuccessful
                      ? 'rgba(8,127,91,0.2)'
                      : isFailed
                        ? 'rgba(198,40,40,0.2)'
                        : 'rgba(167,101,0,0.2)'
                  }`,
                }}
              >
                <Typography
                  sx={{
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: 900,
                    mb: 0.5,
                  }}
                >
                  Electricity Payment Status
                </Typography>

                <Typography
                  sx={{
                    color: COLORS.text,
                    fontSize: 11.5,
                    lineHeight: 1.5,
                  }}
                >
                  {isSuccessful
                    ? 'Your electricity payment has been confirmed.'
                    : isFailed && electricityRefunded
                      ? 'Your electricity payment failed. Your wallet has been refunded.'
                      : isFailed
                        ? 'The electricity payment was not completed.'
                        : 'Your electricity payment is waiting for provider confirmation.'}
                </Typography>

                {requeryMessage && (
                  <Typography
                    sx={{
                      mt: 0.8,
                      color: COLORS.muted,
                      fontSize: 10.5,
                      lineHeight: 1.5,
                    }}
                  >
                    {requeryMessage}
                  </Typography>
                )}

                {isPending && (
                  <Box
                    sx={{
                      mt: 1.2,
                      px: 1.5,
                      py: 1.3,
                      borderRadius: 1.8,
                      background: '#EAF7F3',
                      border: '1px solid #CBE8DD',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.2,
                    }}
                  >
                    <RefreshRounded
                      sx={{
                        color: COLORS.primary,
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': {
                          from: {
                            transform: 'rotate(0deg)',
                          },
                          to: {
                            transform: 'rotate(360deg)',
                          },
                        },
                      }}
                    />

                    <Box>
                      <Typography
                        sx={{
                          color: COLORS.primary,
                          fontSize: 11.5,
                          fontWeight: 900,
                        }}
                      >
                        Checking payment status automatically...
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          color: COLORS.muted,
                          fontSize: 10,
                        }}
                      >
                        Please wait. Do not make another payment.
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  mx: 2,
                  mb: 1.5,
                  borderRadius: 2.2,
                  overflow: 'hidden',
                  border: `1px solid ${COLORS.border}`,
                  background: '#FAFCFB',
                }}
              >
                <Box
                  sx={{
                    px: 1.6,
                    py: 1.25,
                    background: 'rgba(8,127,91,0.07)',
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      color: COLORS.primary,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Electricity Payment
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color: COLORS.muted,
                      fontSize: 10,
                    }}
                  >
                    Electricity purchase details
                  </Typography>
                </Box>

                {electricityBiller &&
                  row('DisCo', electricityBiller)}

                {electricityCustomerName &&
                  row('Customer', electricityCustomerName)}

                {electricityMeterNumber &&
                  row('Meter Number', electricityMeterNumber)}

                {electricityMeterType &&
                  row(
                    'Meter Type',
                    electricityMeterType.charAt(0).toUpperCase() +
                      electricityMeterType.slice(1)
                  )}

                {electricityUnits !== '' &&
                  electricityUnits !== null &&
                  electricityUnits !== undefined &&
                  row('Units', `${electricityUnits} kWh`)}

                {electricityTariff &&
                  row('Tariff Class', electricityTariff)}

                {electricityToken && (
                  <Box
                    sx={{
                      mx: 2,
                      py: 1.3,
                      borderTop: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <Typography
                      sx={{
                        color: COLORS.primary,
                        fontSize: 10.5,
                        fontWeight: 800,
                        mb: 0.65,
                      }}
                    >
                      Electricity Token
                    </Typography>

                    <Box
                      sx={{
                        background: '#EAF7F3',
                        border: '1px solid #CBE8DD',
                        borderRadius: 1.8,
                        px: 1.2,
                        py: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          color: COLORS.text,
                          fontSize: 14,
                          fontWeight: 900,
                          letterSpacing: 1.1,
                          textAlign: 'center',
                          wordBreak: 'break-word',
                        }}
                      >
                        {electricityToken}
                      </Typography>
                    </Box>

                    <Button
                      className="no-print"
                      size="small"
                      startIcon={
                        <ContentCopyRounded
                          sx={{ fontSize: 13 }}
                        />
                      }
                      onClick={() =>
                        void copyText(
                          electricityToken,
                          'Electricity token copied.'
                        )
                      }
                      sx={{
                        display: 'flex',
                        mx: 'auto',
                        mt: 0.5,
                        minWidth: 0,
                        color: COLORS.primary,
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: 'none',
                      }}
                    >
                      Copy token
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          )}

          {/* INCOMING TRANSFER */}

          {isTransfer && isIncoming && (
            <>
              {sender &&
                row('Sender', sender)}

              {transactionDate &&
                row('Date', formatDate())}

              {formatTime() &&
                row('Time', formatTime())}

              {reference && (
                <ReferenceRow
                  label="Reference"
                  value={reference}
                  onCopy={() =>
                    void copyText(
                      reference,
                      'Transaction reference copied.'
                    )
                  }
                />
              )}

              {row(
                'Amount',
                `+${formatMoney(amount)}`
              )}

              {row('Status', shortStatus, statusColor)}

              {row('Type', 'Credit', undefined, true)}

              {transaction.description?.trim() &&
                row(
                  'Narration',
                  transaction.description.trim(),
                  undefined,
                  true
                )}
            </>
          )}

          {/* OUTGOING TRANSFER */}

          {isTransfer && !isIncoming && (
            <>
              {row(
                'Transaction Amount',
                formatMoney(amount)
              )}

              {row('Transaction Type', 'TRANSFER')}

              {transactionDate &&
                row(
                  'Transaction Date',
                  `${formatDate()} ${formatTime()}`
                )}

              {sender &&
                row('Sender', sender)}

              {beneficiaryName &&
                row('Beneficiary', beneficiaryName)}

              {row(
                'Receiver Bank',
                String(
                  transaction.recipient_bank ||
                    transaction.receiver_bank ||
                    transaction.bank_name ||
                    'ZENIMONIES'
                )
              )}

              {row(
                'Transaction Fee',
                formatMoney(fee)
              )}

              {row(
                'Total Amount Debited',
                formatMoney(
                  Number(
                    transaction.total_debit ??
                      Math.abs(amount + fee)
                  )
                )
              )}

              {reference && (
                <ReferenceRow
                  label="Transaction Reference"
                  value={reference}
                  onCopy={() =>
                    void copyText(
                      reference,
                      'Transaction reference copied.'
                    )
                  }
                />
              )}

              {row(
                'Transaction Status',
                isSuccessful
                  ? 'Transaction Successful'
                  : isFailed
                    ? 'Transaction Failed'
                    : 'Transaction Pending',
                statusColor,
                true
              )}
            </>
          )}

          {/* BETTING TRANSACTION */}

          {isBetting && (
            <>
              {row(
                'Transaction Amount',
                formatMoney(amount)
              )}

              {row(
                'Transaction Type',
                'BETTING ACCOUNT FUNDING'
              )}

              {transactionDate &&
                row(
                  'Transaction Date',
                  `${formatDate()} ${formatTime()}`
                )}

              {transaction.description?.trim() &&
                row(
                  'Narration',
                  transaction.description.trim()
                )}

              {reference && (
                <ReferenceRow
                  label="Transaction Reference"
                  value={reference}
                  onCopy={() =>
                    void copyText(
                      reference,
                      'Transaction reference copied.'
                    )
                  }
                />
              )}

              {row(
                'Transaction Status',
                isSuccessful
                  ? 'Transaction Successful'
                  : isFailed
                    ? 'Transaction Failed'
                    : 'Transaction Pending',
                statusColor,
                true
              )}
            </>
          )}

          {/* OTHER TRANSACTIONS AND ELECTRICITY REFUNDS */}

          {!isTransfer && !isBetting && (
            <>
              {row(
                'Transaction Amount',
                formatMoney(amount)
              )}

              {row(
                'Transaction Type',
                isElectricityRefund
                  ? 'ELECTRICITY REFUND'
                  : isElectricity
                    ? 'ELECTRICITY PAYMENT'
                    : String(
                        transaction.transaction_type ||
                          transaction.type ||
                          'TRANSACTION'
                      ).toUpperCase()
              )}

              {transactionDate &&
                row(
                  'Transaction Date',
                  `${formatDate()} ${formatTime()}`
                )}

              {(isElectricityRefund ||
                transaction.description?.trim()) &&
                row(
                  'Narration',
                  isElectricityRefund
                    ? 'Electricity Refund'
                    : transaction.description!.trim()
                )}

              {reference && (
                <ReferenceRow
                  label="Transaction Reference"
                  value={reference}
                  onCopy={() =>
                    void copyText(
                      reference,
                      'Transaction reference copied.'
                    )
                  }
                />
              )}

              {row(
                'Transaction Status',
                isSuccessful
                  ? 'Transaction Successful'
                  : isFailed
                    ? 'Transaction Failed'
                    : 'Transaction Pending',
                statusColor,
                true
              )}
            </>
          )}
        </Box>

        {/* RECEIPT ACTIONS */}

        <Stack
          className="no-print"
          spacing={1}
          sx={{ mt: 1.5 }}
        >
          {!isIncoming && (
            <Button
              fullWidth
              variant="contained"
              startIcon={<DownloadRounded />}
              onClick={() => void handleDownload()}
              disabled={pdfLoading}
              sx={{
                minHeight: 46,
                bgcolor: COLORS.primary,
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: COLORS.dark,
                },
              }}
            >
              {pdfLoading
                ? 'Preparing...'
                : 'Download PDF'}
            </Button>
          )}

          <Button
            fullWidth
            variant={isIncoming ? 'contained' : 'outlined'}
            startIcon={<ShareRounded />}
            onClick={() => void handleShare()}
            disabled={pdfLoading}
            sx={{
              minHeight: 46,
              bgcolor: isIncoming
                ? COLORS.primary
                : 'transparent',
              borderColor: COLORS.primary,
              color: isIncoming
                ? COLORS.white
                : COLORS.primary,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': {
                bgcolor: isIncoming
                  ? COLORS.dark
                  : 'rgba(8,127,91,0.06)',
              },
            }}
          >
            {pdfLoading
              ? 'Preparing...'
              : 'Share Receipt'}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate('/transactions')}
            disabled={pdfLoading}
            sx={{
              minHeight: 44,
              borderColor: COLORS.border,
              color: COLORS.text,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Back to Transactions
          </Button>
        </Stack>
      </Box>

      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            .receipt-page {
              min-height: auto !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            .receipt-document {
              width: 100% !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
            }

            .no-print {
              display: none !important;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>
    </Box>
  );
};

interface ReceiptRowProps {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}

const ReceiptRow: React.FC<ReceiptRowProps> = ({
  label,
  value,
  valueColor,
  last = false,
}) => (
  <Box
    sx={{
      mx: 2,
      py: 1.05,
      borderTop: `1px solid ${COLORS.border}`,
      borderBottom: last
        ? `1px solid ${COLORS.border}`
        : 'none',
    }}
  >
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      spacing={2}
    >
      <Typography
        sx={{
          color: COLORS.primary,
          fontSize: 10.5,
          fontWeight: 800,
          flex: '0 0 43%',
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          color: valueColor || COLORS.text,
          fontSize: 10.8,
          fontWeight: 750,
          textAlign: 'left',
          flex: '1 1 auto',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Stack>
  </Box>
);

interface ReferenceRowProps {
  label: string;
  value: string;
  onCopy: () => void;
}

const ReferenceRow: React.FC<ReferenceRowProps> = ({
  label,
  value,
  onCopy,
}) => (
  <Box
    sx={{
      mx: 2,
      py: 1.05,
      borderTop: `1px solid ${COLORS.border}`,
    }}
  >
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      spacing={2}
    >
      <Typography
        sx={{
          color: COLORS.primary,
          fontSize: 10.5,
          fontWeight: 800,
          flex: '0 0 43%',
        }}
      >
        {label}
      </Typography>

      <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Typography
          sx={{
            color: COLORS.text,
            fontSize: 9.5,
            fontWeight: 750,
            lineHeight: 1.35,
            wordBreak: 'break-all',
          }}
        >
          {value}
        </Typography>

        <Button
          className="no-print"
          size="small"
          onClick={onCopy}
          sx={{
            minWidth: 0,
            p: 0,
            mt: 0.15,
            color: COLORS.primary,
            fontSize: 8.5,
            fontWeight: 800,
            textTransform: 'none',
          }}
        >
          Copy
        </Button>
      </Box>
    </Stack>
  </Box>
);

export default TransactionReceipt;
