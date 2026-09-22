import React, { useRef, useState } from 'react';

import {
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';

import {
  ArrowBackRounded,
  DownloadRounded,
  ShareRounded,
  ContentCopyRounded,
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { QRCodeSVG } from 'qrcode.react';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// ============================================================
// TRANSACTION
// ============================================================

interface Transaction {
  id?: string;

  type?: string;
  transaction_type?: string;
  category?: string;
  description?: string;

  amount?: number | string;
  currency?: string;

  // ----------------------------------------------------------
  // TRANSFER
  // ----------------------------------------------------------

  sender_name?: string;
  sender_phone?: string;
  sender_account?: string;
  sender_bank?: string;

  recipient_name?: string;
  recipient_phone?: string;
  recipient_account?: string;
  recipient_bank?: string;
  recipient_bank_code?: string;

  bank_name?: string;
  account_number?: string;

  // ----------------------------------------------------------
  // AIRTIME / DATA
  // ----------------------------------------------------------

  provider?: string;
  network?: string;
  phone?: string;

  data_plan?: string;
  plan_name?: string;
  variation_name?: string;

  // ----------------------------------------------------------
  // BILLS
  // ----------------------------------------------------------

  customer_number?: string;
  meter_number?: string;
  meter_type?: string;

  smartcard_number?: string;
  decoder_number?: string;

  customer_name?: string;

  // Electricity
  electricity_token?: string;
  token?: string;
  units?: string | number;
  tariff_class?: string;
  verified_customer_name?: string;
  verified_customer_address?: string;

  // ----------------------------------------------------------
  // PROVIDER
  // ----------------------------------------------------------

  provider_reference?: string;
  provider_request_id?: string;

  // ----------------------------------------------------------
  // REFERENCES
  // ----------------------------------------------------------

  reference?: string;
  transaction_reference?: string;

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  status?: string;

  // ----------------------------------------------------------
  // TRANSFER FEE ONLY
  // ----------------------------------------------------------

  transaction_fee?: number | string;
  fee?: number | string;
  total_debit?: number | string;

  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  created_at?: string;
  date?: string;
  timestamp?: string;

  [key: string]: any;
}


// ============================================================
// LOCAL USER
// ============================================================

interface LocalUser {
  id?: string;
  user_id?: string;

  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;

  email?: string;
  phone?: string;

  account_number?: string;
  accountNumber?: string;
}


// ============================================================
// LOCAL ACCOUNT
// ============================================================

interface LocalAccount {
  id?: string;
  account_number?: string;
  accountNumber?: string;
  account_type?: string;
  currency?: string;
}


// ============================================================
// COMPONENT
// ============================================================

const TransactionReceipt: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const receiptRef =
    useRef<HTMLDivElement>(null);

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState(false);


  // ==========================================================
  // TRANSACTION
  // ==========================================================

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;


  // ==========================================================
  // NO TRANSACTION
  // ==========================================================

  if (!transaction) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#f5f7f6',
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
            bgcolor: '#ffffff',
            border: '1px solid #dfe5e2',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 800,
              color: '#17231f',
              mb: 1,
            }}
          >
            Receipt unavailable
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: '#6c7772',
              mb: 2.5,
            }}
          >
            Transaction details could not be found.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            startIcon={<ArrowBackRounded />}
            onClick={() =>
              navigate('/transactions')
            }
            sx={{
              bgcolor: '#087f5b',
              borderRadius: 1,
              fontWeight: 800,
              '&:hover': {
                bgcolor: '#066b4c',
              },
            }}
          >
            Back to Transactions
          </Button>
        </Box>
      </Box>
    );
  }


  // ==========================================================
  // LOCAL USER / ACCOUNT FALLBACK
  // ==========================================================

  const getLocalUser =
    (): LocalUser => {
      try {
        const raw =
          localStorage.getItem(
            'zenimonies_user'
          );

        if (!raw) {
          return {};
        }

        const parsed =
          JSON.parse(raw);

        return parsed || {};
      } catch {
        return {};
      }
    };


  const getLocalAccount =
    (): LocalAccount => {
      try {
        const raw =
          localStorage.getItem(
            'zenimonies_accounts'
          );

        if (!raw) {
          return {};
        }

        const parsed =
          JSON.parse(raw);

        if (Array.isArray(parsed)) {
          return (
            parsed.find(
              (account: LocalAccount) =>
                String(
                  account.currency || ''
                ).toUpperCase() === 'NGN'
            ) ||
            parsed[0] ||
            {}
          );
        }

        return parsed || {};
      } catch {
        return {};
      }
    };


  const localUser =
    getLocalUser();

  const localAccount =
    getLocalAccount();


  // ==========================================================
  // BASIC VALUES
  // ==========================================================

  const numericAmount =
    Number(
      transaction.amount ?? 0
    );


  const numericFee =
    Number(
      transaction.transaction_fee ??
      transaction.fee ??
      0
    );


  const numericTotalDebit =
    Number(
      transaction.total_debit ?? 0
    );


  const currency =
    (
      transaction.currency ||
      'NGN'
    ).toUpperCase();


  // ==========================================================
  // MONEY
  // ==========================================================

  const formatMoney =
    (value: number) => {
      const safe =
        Number.isFinite(value)
          ? Math.abs(value)
          : 0;

      try {
        return new Intl.NumberFormat(
          'en-NG',
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


  // ==========================================================
  // REFERENCE
  // ==========================================================

  const reference =
    transaction.reference ||
    transaction.transaction_reference ||
    '';


  const providerReference =
    transaction.provider_reference ||
    '';


  // ==========================================================
  // DATE
  // ==========================================================

  const transactionDate =
    transaction.created_at ||
    transaction.date ||
    transaction.timestamp;


  const formatDate =
    (value?: string) => {
      if (!value) {
        return 'Date unavailable';
      }

      const parsed =
        new Date(value);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return value;
      }

      return parsed.toLocaleString(
        'en-NG',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      );
    };


  // ==========================================================
  // TYPE DETECTION
  // ==========================================================

  const rawType =
    String(
      transaction.transaction_type ||
      transaction.type ||
      transaction.category ||
      ''
    ).toLowerCase();


  const rawDescription =
    String(
      transaction.description ||
      ''
    ).toLowerCase();


  const isAirtime =
    rawType.includes('airtime') ||
    rawDescription.includes('airtime');


  const isData =
    rawType.includes('data') ||
    rawDescription.includes('data');


  const isElectricity =
    rawType.includes('electricity') ||
    rawDescription.includes('electricity');


  const isTV =
    rawType.includes('tv') ||
    rawType.includes('cable') ||
    rawDescription.includes('dstv') ||
    rawDescription.includes('gotv') ||
    rawDescription.includes('startimes') ||
    rawDescription.includes('cable');


  const isBill =
    rawType.includes('bill') ||
    isElectricity ||
    isTV ||
    rawDescription.includes('bill');


  const isTransfer =
    rawType.includes('transfer') ||
    rawDescription.includes('transfer');


  const isIncoming =
    rawType.includes('received') ||
    rawDescription.includes('received') ||
    rawDescription.includes('money received') ||
    transaction.category === 'credit' ||
    transaction.category === 'incoming';


  // ==========================================================
  // PEOPLE
  // ==========================================================

  const localUserFullName =
    localUser.full_name ||
    localUser.name ||
    (
      [
        localUser.first_name,
        localUser.last_name,
      ]
        .filter(Boolean)
        .join(' ')
    );


  const senderName =
    transaction.sender_name ||
    (
      isTransfer || isBill || isAirtime || isData
        ? localUserFullName
        : ''
    ) ||
    '';


  const senderPhone =
    transaction.sender_phone ||
    localUser.phone ||
    '';


  const localAccountNumber =
    localUser.account_number ||
    localUser.accountNumber ||
    localAccount.account_number ||
    localAccount.accountNumber ||
    '';


  const senderAccount =
    transaction.sender_account ||
    localAccountNumber ||
    '';


  const receiverName =
    transaction.recipient_name ||
    '';


  const receiverPhone =
    transaction.recipient_phone ||
    transaction.phone ||
    '';


  const receiverAccount =
    transaction.recipient_account ||
    transaction.account_number ||
    '';


  // ==========================================================
  // BANK DETAILS
  // ==========================================================

  const recipientBank =
    transaction.recipient_bank ||
    transaction.bank_name ||
    '';


  const senderBank =
    transaction.sender_bank ||
    (
      isTransfer &&
      recipientBank
        .toLowerCase()
        .includes('zenimonies')
        ? 'Zenimonies'
        : ''
    );


  const isZenimoniesTransfer =
    isTransfer &&
    (
      recipientBank
        .toLowerCase()
        .includes('zenimonies') ||
      rawType.includes(
        'internal_transfer'
      )
    );


  // ==========================================================
  // PROVIDER DETAILS
  // ==========================================================

  const provider =
    transaction.provider ||
    transaction.network ||
    '';


  const servicePhone =
    transaction.phone ||
    transaction.recipient_phone ||
    '';


  const dataPlan =
    transaction.data_plan ||
    transaction.plan_name ||
    transaction.variation_name ||
    '';


  const customerNumber =
    transaction.customer_number ||
    transaction.meter_number ||
    transaction.smartcard_number ||
    transaction.decoder_number ||
    '';


  const customerName =
    transaction.customer_name ||
    transaction.verified_customer_name ||
    '';


  // ==========================================================
  // ELECTRICITY DETAILS
  // ==========================================================

  const electricityMeterNumber =
    transaction.meter_number ||
    transaction.customer_number ||
    '';


  const electricityMeterType =
    transaction.meter_type
      ? String(
          transaction.meter_type
        ).toUpperCase()
      : '';


  const electricityToken =
    transaction.electricity_token ||
    transaction.token ||
    '';


  const electricityUnits =
    transaction.units !== undefined &&
    transaction.units !== null
      ? String(
          transaction.units
        )
      : '';


  const electricityAddress =
    transaction.verified_customer_address ||
    '';


  // ==========================================================
  // TOTAL DEBIT
  //
  // IMPORTANT:
  // ONLY TRANSFERS USE TRANSACTION FEE.
  // ==========================================================

  let totalDebited =
    Math.abs(
      numericAmount
    );


  if (
    isTransfer &&
    !isIncoming
  ) {
    if (
      Number.isFinite(
        numericTotalDebit
      ) &&
      numericTotalDebit > 0
    ) {
      totalDebited =
        Math.abs(
          numericTotalDebit
        );
    } else {
      totalDebited =
        Math.abs(
          numericAmount +
          numericFee
        );
    }
  }


  // ==========================================================
  // RECEIPT TITLE
  // ==========================================================

  let receiptTitle =
    'Transaction Receipt';


  if (isTransfer) {
    receiptTitle =
      'Transaction Receipt';
  } else if (isElectricity) {
    receiptTitle =
      'Electricity Payment Receipt';
  } else if (isAirtime) {
    receiptTitle =
      'Airtime Purchase Receipt';
  } else if (isData) {
    receiptTitle =
      'Data Purchase Receipt';
  } else if (isTV) {
    receiptTitle =
      'TV Subscription Receipt';
  } else if (isBill) {
    receiptTitle =
      'Bill Payment Receipt';
  }


  // ==========================================================
  // TRANSACTION TYPE
  // ==========================================================

  let transactionType =
    'TRANSACTION';


  if (isTransfer) {
    transactionType =
      'TRANSFER';
  } else if (isElectricity) {
    transactionType =
      'ELECTRICITY';
  } else if (isAirtime) {
    transactionType =
      'AIRTIME';
  } else if (isData) {
    transactionType =
      'DATA';
  } else if (isTV) {
    transactionType =
      'TV SUBSCRIPTION';
  } else if (isBill) {
    transactionType =
      'BILL PAYMENT';
  }


  // ==========================================================
  // STATUS
  // ==========================================================

  const rawStatus =
    String(
      transaction.status || ''
    )
      .trim()
      .toLowerCase();


  const isSuccessful =
    [
      'successful',
      'completed',
      'success',
      'delivered',
    ].includes(
      rawStatus
    );


  const isFailed =
    [
      'failed',
      'failure',
      'reversed',
      'cancelled',
      'canceled',
    ].includes(
      rawStatus
    );


  const isPending =
    [
      'pending',
      'processing',
      'initiated',
      'queued',
    ].includes(
      rawStatus
    );


  const statusText =
    isSuccessful
      ? 'Transaction Successful'
      : isFailed
        ? 'Transaction Failed'
        : isPending
          ? 'Transaction Pending'
          : 'Transaction Unconfirmed';


  // ==========================================================
  // COPY REFERENCE
  // ==========================================================

  const copyReference =
    async () => {
      if (!reference) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          reference
        );

        alert(
          'Transaction reference copied.'
        );
      } catch {
        alert(
          'Unable to copy transaction reference.'
        );
      }
    };


  // ==========================================================
  // PDF FILE NAME
  // ==========================================================

  const getFileName =
    () => {
      const safe =
        reference
          ? reference.replace(
              /[^a-zA-Z0-9_-]/g,
              '_'
            )
          : 'transaction';

      return `Zenimonies-${safe}.pdf`;
    };


  // ==========================================================
  // CREATE PDF
  // ==========================================================

  const createReceiptPDF =
    async () => {
      if (!receiptRef.current) {
        throw new Error(
          'Receipt unavailable.'
        );
      }

      const canvas =
        await html2canvas(
          receiptRef.current,
          {
            scale: 2.2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          }
        );

      const image =
        canvas.toDataURL(
          'image/png',
          1
        );

      const width = 80;

      const height =
        (
          canvas.height /
          canvas.width
        ) *
        width;

      const pdf =
        new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [
            width,
            height,
          ],
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


  // ==========================================================
  // DOWNLOAD PDF
  // ==========================================================

  const handleDownloadPDF =
    async () => {
      if (pdfLoading) {
        return;
      }

      try {
        setPdfLoading(true);

        const pdf =
          await createReceiptPDF();

        pdf.save(
          getFileName()
        );
      } catch (error) {
        console.error(
          'Receipt PDF error:',
          error
        );

        alert(
          'Unable to generate receipt PDF.'
        );
      } finally {
        setPdfLoading(false);
      }
    };


  // ==========================================================
  // SHARE PDF
  // ==========================================================

  const handleSharePDF =
    async () => {
      if (pdfLoading) {
        return;
      }

      try {
        setPdfLoading(true);

        const pdf =
          await createReceiptPDF();

        const blob =
          pdf.output('blob');

        const file =
          new File(
            [blob],
            getFileName(),
            {
              type:
                'application/pdf',
            }
          );

        if (
          typeof navigator.share ===
            'function' &&
          typeof navigator.canShare ===
            'function' &&
          navigator.canShare({
            files: [file],
          })
        ) {
          try {
            await navigator.share({
              title:
                `Zenimonies ${receiptTitle}`,

              text:
                reference
                  ? `Zenimonies transaction receipt — ${reference}`
                  : 'Zenimonies transaction receipt',

              files: [file],
            });

            return;
          } catch (error) {
            const shareError =
              error as {
                name?: string;
              };

            if (
              shareError?.name ===
              'AbortError'
            ) {
              return;
            }
          }
        }

        pdf.save(
          getFileName()
        );
      } catch (error) {
        console.error(
          'Receipt sharing error:',
          error
        );

        alert(
          'Unable to share receipt.'
        );
      } finally {
        setPdfLoading(false);
      }
    };


  // ==========================================================
  // RECEIPT ROW
  // ==========================================================

  const ReceiptRow = ({
    label,
    value,
    children,
    last = false,
  }: {
    label: string;
    value?: React.ReactNode;
    children?: React.ReactNode;
    last?: boolean;
  }) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          '42% 58%',
        alignItems: 'start',
        minHeight: 39,
        borderBottom:
          last
            ? 'none'
            : '1px solid #e1e4e3',
      }}
    >
      <Box
        sx={{
          py: 1.05,
          pr: 1,
        }}
      >
        <Typography
          sx={{
            color: '#e07b25',
            fontSize: 11.5,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box
        sx={{
          py: 1.05,
          pl: 1,
          minWidth: 0,
        }}
      >
        {children || (
          <Typography
            sx={{
              color: '#244d86',
              fontSize: 11.5,
              fontWeight: 600,
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {value || '—'}
          </Typography>
        )}
      </Box>
    </Box>
  );


  // ==========================================================
  // REFERENCE ROW
  // ==========================================================

  const ReferenceRow = ({
    label,
    value,
    last = false,
  }: {
    label: string;
    value: string;
    last?: boolean;
  }) => (
    <ReceiptRow
      label={label}
      last={last}
      children={
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="flex-start"
        >
          <Typography
            sx={{
              color: '#244d86',
              fontSize: 10.5,
              fontWeight: 600,
              wordBreak: 'break-all',
              lineHeight: 1.3,
            }}
          >
            {value}
          </Typography>

          <Button
            className="no-print"
            onClick={copyReference}
            sx={{
              minWidth: 24,
              width: 24,
              height: 24,
              p: 0,
              color: '#087f5b',
              flexShrink: 0,
            }}
          >
            <ContentCopyRounded
              sx={{
                fontSize: 14,
              }}
            />
          </Button>
        </Stack>
      }
    />
  );


  // ==========================================================
  // HEADER LABEL
  // ==========================================================

  const HeaderLabel =
    isElectricity
      ? 'Electricity Payment'
      : isAirtime
        ? 'Airtime Purchase'
        : isData
          ? 'Data Purchase'
          : isTV
            ? 'TV Subscription'
            : isTransfer
              ? 'Bank Transfer'
              : 'Bill Payment';


  // ==========================================================
  // RECEIPT
  // ==========================================================

  return (
    <Box
      className="receipt-page"
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f7f6',
        py: 2,
        px: 1,
      }}
    >
      <Box
        className="receipt-container"
        sx={{
          width: '100%',
          maxWidth: 680,
          mx: 'auto',
        }}
      >

        {/* ==================================================
            RECEIPT DOCUMENT
        =================================================== */}

        <Box
          ref={receiptRef}
          className="receipt-document"
          sx={{
            width: '100%',
            bgcolor: '#ffffff',
            border:
              '1px solid #e0e4e2',
            px: {
              xs: 2.3,
              sm: 4,
            },
            pt: 3,
            pb: 3,
          }}
        >

          {/* ==================================================
              BRAND
          =================================================== */}

          <Box
            sx={{
              textAlign: 'center',
              pb: 1.2,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={1}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  border:
                    '3px solid #087f5b',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#087f5b',
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                Z
              </Box>

              <Box
                sx={{
                  textAlign: 'left',
                }}
              >
                <Typography
                  sx={{
                    color: '#087f5b',
                    fontSize: 25,
                    fontWeight: 900,
                    letterSpacing: 0.5,
                    lineHeight: 1,
                  }}
                >
                  ZENIMONIES
                </Typography>

                <Typography
                  sx={{
                    color: '#087f5b',
                    fontSize: 7,
                    fontWeight: 800,
                    letterSpacing: 3,
                    mt: 0.5,
                  }}
                >
                  DIGITAL BANKING
                </Typography>
              </Box>
            </Stack>
          </Box>


          {/* ==================================================
              TITLE
          =================================================== */}

          <Typography
            sx={{
              textAlign: 'center',
              color: '#174a88',
              fontSize: 21,
              fontWeight: 800,
              mb: 0.8,
            }}
          >
            {receiptTitle}
          </Typography>


          {/* ==================================================
              GENERATED LINE
          =================================================== */}

          <Typography
            sx={{
              textAlign: 'center',
              color: '#9a9f9d',
              fontSize: 10,
              fontWeight: 500,
              mb: 2.2,
            }}
          >
            Generated from Zenimonies on{' '}
            {formatDate(
              new Date().toISOString()
            )}
          </Typography>


          {/* ==================================================
              RECEIPT TABLE
          =================================================== */}

          <Box
            sx={{
              borderTop:
                '1px solid #d9dddb',
            }}
          >

            {/* ------------------------------------------------
                AMOUNT
            ------------------------------------------------- */}

            <ReceiptRow
              label="Transaction Amount"
              value={
                formatMoney(
                  numericAmount
                )
              }
            />


            {/* ------------------------------------------------
                TYPE
            ------------------------------------------------- */}

            <ReceiptRow
              label="Transaction Type"
              value={
                transactionType
              }
            />


            {/* ------------------------------------------------
                DATE
            ------------------------------------------------- */}

            <ReceiptRow
              label="Transaction Date"
              value={
                formatDate(
                  transactionDate
                )
              }
            />


            {/* =================================================
                TRANSFER
            ================================================== */}

            {isTransfer && (
              <>

                <ReceiptRow
                  label="Sender"
                  value={
                    senderName
                  }
                />


                {senderAccount && (
                  <ReceiptRow
                    label="Sender Account"
                    value={
                      senderAccount
                    }
                  />
                )}


                {senderBank && (
                  <ReceiptRow
                    label="Sender Bank"
                    value={
                      senderBank
                    }
                  />
                )}


                <ReceiptRow
                  label="Beneficiary"
                  children={
                    <Box>
                      <Typography
                        sx={{
                          color: '#244d86',
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        {receiverName || '—'}
                      </Typography>

                      {receiverAccount && (
                        <Typography
                          sx={{
                            color: '#244d86',
                            fontSize: 11.5,
                            fontWeight: 600,
                            mt: 0.35,
                          }}
                        >
                          {receiverAccount}
                        </Typography>
                      )}

                      {recipientBank && (
                        <Typography
                          sx={{
                            color: '#244d86',
                            fontSize: 11.5,
                            fontWeight: 600,
                            mt: 0.35,
                          }}
                        >
                          {recipientBank}
                        </Typography>
                      )}
                    </Box>
                  }
                />


                {/* =================================================
                    TRANSACTION FEE — TRANSFERS ONLY
                ================================================== */}

                <ReceiptRow
                  label="Transaction Fee"
                  value={
                    formatMoney(
                      numericFee
                    )
                  }
                />


                <ReceiptRow
                  label="Total Amount Debited"
                  value={
                    formatMoney(
                      totalDebited
                    )
                  }
                />

              </>
            )}


            {/* =================================================
                ELECTRICITY
            ================================================== */}

            {isElectricity && (
              <>

                <ReceiptRow
                  label="Sender"
                  value={
                    senderName
                  }
                />


                {senderAccount && (
                  <ReceiptRow
                    label="Account Number"
                    value={
                      senderAccount
                    }
                  />
                )}


                <ReceiptRow
                  label="Electricity Provider"
                  value={
                    provider ||
                    '—'
                  }
                />


                <ReceiptRow
                  label="Meter Number"
                  value={
                    electricityMeterNumber ||
                    '—'
                  }
                />


                <ReceiptRow
                  label="Meter Type"
                  value={
                    electricityMeterType ||
                    '—'
                  }
                />


                {customerName && (
                  <ReceiptRow
                    label="Customer Name"
                    value={
                      customerName
                    }
                  />
                )}


                {electricityAddress && (
                  <ReceiptRow
                    label="Address"
                    value={
                      electricityAddress
                    }
                  />
                )}


                {/* ---------------------------------------------
                    PREPAID TOKEN
                ---------------------------------------------- */}

                {electricityToken && (
                  <ReceiptRow
                    label="Electricity Token"
                    children={
                      <Typography
                        sx={{
                          color: '#244d86',
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: 0.6,
                          wordBreak: 'break-all',
                        }}
                      >
                        {electricityToken}
                      </Typography>
                    }
                  />
                )}


                {electricityUnits && (
                  <ReceiptRow
                    label="Units"
                    value={
                      electricityUnits
                    }
                  />
                )}


                {/* ---------------------------------------------
                    NO FEE LINE HERE
                ---------------------------------------------- */}


                {providerReference && (
                  <ReceiptRow
                    label="Provider Reference"
                    value={
                      providerReference
                    }
                  />
                )}

              </>
            )}


            {/* =================================================
                AIRTIME
            ================================================== */}

            {isAirtime && (
              <>

                <ReceiptRow
                  label="Sender"
                  value={
                    senderName
                  }
                />


                {senderAccount && (
                  <ReceiptRow
                    label="Account Number"
                    value={
                      senderAccount
                    }
                  />
                )}


                <ReceiptRow
                  label="Network"
                  value={
                    provider ||
                    '—'
                  }
                />


                <ReceiptRow
                  label="Phone Number"
                  value={
                    servicePhone ||
                    '—'
                  }
                />

                {/* NO FEE LINE */}


                {providerReference && (
                  <ReceiptRow
                    label="Provider Reference"
                    value={
                      providerReference
                    }
                  />
                )}

              </>
            )}


            {/* =================================================
                DATA
            ================================================== */}

            {isData && (
              <>

                <ReceiptRow
                  label="Sender"
                  value={
                    senderName
                  }
                />


                {senderAccount && (
                  <ReceiptRow
                    label="Account Number"
                    value={
                      senderAccount
                    }
                  />
                )}


                <ReceiptRow
                  label="Network"
                  value={
                    provider ||
                    '—'
                  }
                />


                <ReceiptRow
                  label="Phone Number"
                  value={
                    servicePhone ||
                    '—'
                  }
                />


                {dataPlan && (
                  <ReceiptRow
                    label="Data Plan"
                    value={
                      dataPlan
                    }
                  />
                )}

                {/* NO FEE LINE */}


                {providerReference && (
                  <ReceiptRow
                    label="Provider Reference"
                    value={
                      providerReference
                    }
                  />
                )}

              </>
            )}


            {/* =================================================
                TV / OTHER BILLS
            ================================================== */}

            {isBill &&
              !isElectricity &&
              !isAirtime &&
              !isData && (
                <>

                  <ReceiptRow
                    label="Sender"
                    value={
                      senderName
                    }
                  />


                  {senderAccount && (
                    <ReceiptRow
                      label="Account Number"
                      value={
                        senderAccount
                      }
                    />
                  )}


                  <ReceiptRow
                    label="Provider"
                    value={
                      provider ||
                      '—'
                    }
                  />


                  {customerName && (
                    <ReceiptRow
                      label="Customer Name"
                      value={
                        customerName
                      }
                    />
                  )}


                  {customerNumber && (
                    <ReceiptRow
                      label="Customer Number"
                      value={
                        customerNumber
                      }
                    />
                  )}


                  {/* NO FEE LINE */}


                  {providerReference && (
                    <ReceiptRow
                      label="Provider Reference"
                      value={
                        providerReference
                      }
                    />
                  )}

                </>
              )}


            {/* =================================================
                REFERENCE
            ================================================== */}

            {reference && (
              <ReferenceRow
                label="Transaction Reference"
                value={
                  reference
                }
              />
            )}


            {/* =================================================
                STATUS
            ================================================== */}

            <ReceiptRow
              label="Transaction Status"
              children={
                <Typography
                  sx={{
                    color:
                      isSuccessful
                        ? '#087f5b'
                        : isFailed
                          ? '#c62828'
                          : '#a76500',
                    fontSize: 11.5,
                    fontWeight: 800,
                  }}
                >
                  {statusText}
                </Typography>
              }
              last
            />

          </Box>


          {/* ==================================================
              SUCCESS / FAILURE MESSAGE
          =================================================== */}

          <Box
            sx={{
              borderTop:
                '1px solid #d9dddb',
              mt: 1.5,
              pt: 1.3,
            }}
          >
            <Typography
              sx={{
                color: '#5e6965',
                fontSize: 10,
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              {isSuccessful
                ? `Your ${HeaderLabel.toLowerCase()} has been completed successfully.`
                : isFailed
                  ? `Your ${HeaderLabel.toLowerCase()} was not completed.`
                  : `Your ${HeaderLabel.toLowerCase()} is being processed.`}
            </Typography>
          </Box>


          {/* ==================================================
              QR
          =================================================== */}

          {reference && (
            <Box
              className="no-print"
              sx={{
                textAlign: 'center',
                mt: 1.8,
                pt: 1.2,
                borderTop:
                  '1px solid #e5e7e6',
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 0.5,
                  border:
                    '1px solid #d7dedb',
                  bgcolor: '#ffffff',
                }}
              >
                <QRCodeSVG
                  value={
                    reference
                  }
                  size={86}
                  level="M"
                  includeMargin={false}
                />
              </Box>

              <Typography
                sx={{
                  mt: 0.6,
                  color: '#7b8480',
                  fontSize: 8.5,
                  fontWeight: 500,
                }}
              >
                Scan to verify this transaction
              </Typography>
            </Box>
          )}


          {/* ==================================================
              FOOTER
          =================================================== */}

          <Box
            sx={{
              mt: 2,
              pt: 1.5,
              borderTop:
                '1px solid #e1e4e3',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: '#8a918e',
                fontSize: 9,
                lineHeight: 1.45,
              }}
            >
              Thank you for choosing Zenimonies.
            </Typography>

            <Typography
              sx={{
                color: '#087f5b',
                fontSize: 9,
                fontWeight: 700,
                mt: 0.4,
              }}
            >
              ZENIMONIES DIGITAL BANKING
            </Typography>
          </Box>

        </Box>


        {/* ==================================================
            ACTION BUTTONS
        =================================================== */}

        <Stack
          className="no-print"
          spacing={1}
          sx={{
            mt: 1.2,
          }}
        >

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
          >

            <Button
              fullWidth
              variant="contained"
              startIcon={
                <DownloadRounded />
              }
              onClick={
                handleDownloadPDF
              }
              disabled={
                pdfLoading
              }
              sx={{
                bgcolor: '#087f5b',
                borderRadius: 1,
                minHeight: 44,
                fontWeight: 800,
                '&:hover': {
                  bgcolor: '#066b4c',
                },
              }}
            >
              {pdfLoading
                ? 'Preparing...'
                : 'Download PDF'}
            </Button>


            <Button
              fullWidth
              variant="outlined"
              startIcon={
                <ShareRounded />
              }
              onClick={
                handleSharePDF
              }
              disabled={
                pdfLoading
              }
              sx={{
                borderColor: '#087f5b',
                color: '#087f5b',
                borderRadius: 1,
                minHeight: 44,
                fontWeight: 800,
                '&:hover': {
                  borderColor: '#066b4c',
                  bgcolor: '#eef8f4',
                },
              }}
            >
              Share PDF
            </Button>

          </Stack>


          <Button
            fullWidth
            variant="outlined"
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate(
                '/transactions'
              )
            }
            disabled={
              pdfLoading
            }
            sx={{
              borderColor: '#d0d8d4',
              color: '#46544e',
              borderRadius: 1,
              minHeight: 44,
              fontWeight: 750,
            }}
          >
            Back to Transactions
          </Button>

        </Stack>

      </Box>


      {/* ======================================================
          PRINT
      ======================================================= */}

      <style>
        {`
          @media print {

            @page {
              size: A4;
              margin: 12mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .receipt-page {
              min-height: auto !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            .receipt-container {
              width: 100% !important;
              max-width: 100% !important;
            }

            .receipt-document {
              width: 100% !important;
              border: none !important;
              padding: 0 !important;
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


export default TransactionReceipt;
