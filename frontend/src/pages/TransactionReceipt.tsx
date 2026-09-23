import React, {
  useRef,
  useState,
} from 'react';

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
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


/*
 * ============================================================
 * TRANSACTION
 * ============================================================
 */

interface Transaction {
  id?: string;

  type?: string;
  transaction_type?: string;
  category?: string;
  description?: string;

  amount?: number | string;
  currency?: string;

  // TRANSFER
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

  // AIRTIME / DATA
  provider?: string;
  network?: string;
  phone?: string;

  data_plan?: string;
  plan_name?: string;
  variation_name?: string;

  // BILLS
  customer_number?: string;
  meter_number?: string;
  meter_type?: string;

  smartcard_number?: string;
  decoder_number?: string;

  customer_name?: string;

  // ELECTRICITY
  electricity_token?: string;
  token?: string;
  units?: string | number;
  tariff_class?: string;
  verified_customer_name?: string;
  verified_customer_address?: string;

  // PROVIDER
  provider_reference?: string;
  provider_request_id?: string;

  // REFERENCES
  reference?: string;
  transaction_reference?: string;

  // STATUS
  status?: string;

  // TRANSFER FEE
  transaction_fee?: number | string;
  fee?: number | string;
  total_debit?: number | string;

  // DATE
  created_at?: string;
  date?: string;
  timestamp?: string;

  [key: string]: any;
}


/*
 * ============================================================
 * COLORS
 * ============================================================
 */

const COLORS = {
  primary: '#087F5B',
  darkGreen: '#075B42',
  lightGreen: '#15966D',
  labelGreen: '#0B9A6B',
  text: '#173A31',
  secondaryText: '#64736D',
  border: '#D9E1DD',
  background: '#F5F8F6',
  white: '#FFFFFF',
  success: '#087F5B',
  danger: '#C62828',
  warning: '#A76500',
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const TransactionReceipt: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const receiptRef =
    useRef<HTMLDivElement>(null);

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState(false);


  /*
   * ==========================================================
   * TRANSACTION
   * ==========================================================
   */

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;


  /*
   * ==========================================================
   * NO TRANSACTION
   * ==========================================================
   */

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
            border:
              `1px solid ${COLORS.border}`,
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
              color:
                COLORS.secondaryText,
              mb: 2.5,
            }}
          >
            Transaction details could
            not be found.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate(
                '/transactions'
              )
            }
            sx={{
              bgcolor:
                COLORS.primary,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': {
                bgcolor:
                  COLORS.darkGreen,
              },
            }}
          >
            Back to Transactions
          </Button>
        </Box>
      </Box>
    );
  }


  /*
   * ==========================================================
   * LOCAL USER
   * ==========================================================
   */

  const getLocalUser = () => {
    try {
      const raw =
        localStorage.getItem(
          'zenimonies_user'
        );

      if (!raw) {
        return {};
      }

      return (
        JSON.parse(raw) || {}
      );
    } catch {
      return {};
    }
  };


  const localUser =
    getLocalUser();


  /*
   * ==========================================================
   * BASIC VALUES
   * ==========================================================
   */

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
    String(
      transaction.currency ||
        'NGN'
    ).toUpperCase();


  /*
   * ==========================================================
   * MONEY
   * ==========================================================
   */

  const formatMoney = (
    value: number
  ) => {
    const safe =
      Number.isFinite(value)
        ? Math.abs(value)
        : 0;

    try {
      return new Intl.NumberFormat(
        currency === 'ZAR'
          ? 'en-ZA'
          : 'en-NG',
        {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      ).format(safe);
    } catch {
      return `₦${safe.toFixed(
        2
      )}`;
    }
  };


  /*
   * ==========================================================
   * REFERENCE
   * ==========================================================
   */

  const reference =
    transaction.reference ||
    transaction.transaction_reference ||
    '';


  const providerReference =
    transaction.provider_reference ||
    '';


  /*
   * ==========================================================
   * DATE
   * ==========================================================
   */

  const transactionDate =
    transaction.created_at ||
    transaction.date ||
    transaction.timestamp;


  const formatDate = (
    value?: string
  ) => {
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


  /*
   * ==========================================================
   * TYPE DETECTION
   * ==========================================================
   */

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
    rawType.includes(
      'airtime'
    ) ||
    rawDescription.includes(
      'airtime'
    );


  const isData =
    rawType.includes('data') ||
    rawDescription.includes(
      'data'
    );


  const isElectricity =
    rawType.includes(
      'electricity'
    ) ||
    rawDescription.includes(
      'electricity'
    );


  const isTV =
    rawType.includes('tv') ||
    rawType.includes('cable') ||
    rawDescription.includes(
      'dstv'
    ) ||
    rawDescription.includes(
      'gotv'
    ) ||
    rawDescription.includes(
      'startimes'
    ) ||
    rawDescription.includes(
      'cable'
    );


  const isBill =
    rawType.includes('bill') ||
    isElectricity ||
    isTV ||
    rawDescription.includes(
      'bill'
    );


  const isTransfer =
    rawType.includes(
      'transfer'
    ) ||
    rawDescription.includes(
      'transfer'
    );


  /*
   * ==========================================================
   * IMPORTANT:
   * RECEIVER TRANSACTION
   * ==========================================================
   */

  const isIncoming =
    rawType.includes(
      'internal_transfer_received'
    ) ||
    rawType.includes(
      'transfer_received'
    ) ||
    rawType.includes(
      'received'
    ) ||
    rawDescription.includes(
      'money received'
    ) ||
    rawDescription.includes(
      'received'
    ) ||
    transaction.category ===
      'credit' ||
    transaction.category ===
      'incoming';


  /*
   * ==========================================================
   * LOCAL USER NAME
   * ==========================================================
   */

  const localUserFullName =
    localUser.full_name ||
    localUser.name ||
    [
      localUser.first_name,
      localUser.last_name,
    ]
      .filter(Boolean)
      .join(' ');


  /*
   * ==========================================================
   * SENDER
   *
   * IMPORTANT:
   * We intentionally DO NOT use sender_account.
   *
   * Sender account numbers are no longer
   * displayed anywhere on this receipt.
   * ==========================================================
   */

  const senderName =
    transaction.sender_name ||
    (
      !isIncoming
        ? localUserFullName
        : ''
    ) ||
    '—';


  /*
   * ==========================================================
   * RECEIVER
   * ==========================================================
   */

  const receiverName =
    transaction.recipient_name ||
    transaction.receiver_name ||
    '—';


  const receiverAccount =
    transaction.recipient_account ||
    transaction.receiver_account ||
    transaction.account_number ||
    '';


  /*
   * ==========================================================
   * RECEIVER BANK
   * ==========================================================
   */

  const receiverBank =
    transaction.recipient_bank ||
    transaction.bank_name ||
    (
      isTransfer
        ? 'Zenimonies'
        : ''
    );


  /*
   * ==========================================================
   * TRANSFER TYPE
   * ==========================================================
   */

  const isZenimoniesTransfer =
    isTransfer &&
    (
      rawType.includes(
        'internal_transfer'
      ) ||
      rawType.includes(
        'zenimonies_transfer'
      ) ||
      receiverBank
        .toLowerCase()
        .includes(
          'zenimonies'
        )
    );


  /*
   * ==========================================================
   * PROVIDER
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * BILL DETAILS
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * ELECTRICITY
   * ==========================================================
   */

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
    transaction.units !==
      undefined &&
    transaction.units !==
      null
      ? String(
          transaction.units
        )
      : '';


  const electricityAddress =
    transaction.verified_customer_address ||
    '';


  /*
   * ==========================================================
   * TOTAL DEBIT
   *
   * Only the sender has a debit.
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * RECEIPT TITLE
   * ==========================================================
   */

  let receiptTitle =
    'Transaction Receipt';


  if (isElectricity) {
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


  /*
   * ==========================================================
   * TRANSACTION TYPE
   * ==========================================================
   */

  let transactionType =
    'TRANSACTION';


  if (isTransfer) {
    transactionType =
      isIncoming
        ? 'TRANSFER RECEIVED'
        : 'TRANSFER';
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


  /*
   * ==========================================================
   * STATUS
   * ==========================================================
   */

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


  const statusColor =
    isSuccessful
      ? COLORS.success
      : isFailed
        ? COLORS.danger
        : COLORS.warning;


  /*
   * ==========================================================
   * MESSAGE
   * ==========================================================
   */

  let successMessage =
    'Thank you for choosing Zenimonies.';


  if (
    isTransfer &&
    isIncoming
  ) {
    successMessage =
      'Your Zenimonies transfer has been received successfully.';
  } else if (
    isTransfer
  ) {
    successMessage =
      'Your Zenimonies transfer has been completed successfully.';
  } else if (
    isElectricity
  ) {
    successMessage =
      'Your electricity payment has been processed successfully.';
  } else if (
    isAirtime
  ) {
    successMessage =
      'Your airtime purchase has been processed successfully.';
  } else if (
    isData
  ) {
    successMessage =
      'Your data purchase has been processed successfully.';
  } else if (
    isBill
  ) {
    successMessage =
      'Your bill payment has been processed successfully.';
  }


  /*
   * ==========================================================
   * COPY REFERENCE
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * PDF FILE NAME
   * ==========================================================
   */

  const getFileName = () => {
    const safe =
      reference
        ? reference.replace(
            /[^a-zA-Z0-9_-]/g,
            '_'
          )
        : 'transaction';

    return `Zenimonies-${safe}.pdf`;
  };


  /*
   * ==========================================================
   * CREATE PDF
   * ==========================================================
   */

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
            backgroundColor:
              '#ffffff',
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
        ) * width;

      const pdf =
        new jsPDF({
          orientation:
            'portrait',
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


  /*
   * ==========================================================
   * DOWNLOAD PDF
   * ==========================================================
   */

  const handleDownloadPDF =
    async () => {
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
          'Unable to create the receipt PDF.'
        );
      } finally {
        setPdfLoading(false);
      }
    };


  /*
   * ==========================================================
   * SHARE PDF
   * ==========================================================
   */

  const handleSharePDF =
    async () => {
      try {
        setPdfLoading(true);

        const pdf =
          await createReceiptPDF();

        const blob =
          pdf.output(
            'blob'
          );

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
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({
            files: [file],
          })
        ) {
          await navigator.share({
            title:
              'Zenimonies Transaction Receipt',
            text:
              'Zenimonies transaction receipt',
            files: [file],
          });
        } else {
          pdf.save(
            getFileName()
          );

          alert(
            'PDF downloaded because file sharing is not available on this device.'
          );
        }
      } catch (error: any) {
        if (
          error?.name !==
          'AbortError'
        ) {
          console.error(
            'Receipt share error:',
            error
          );

          alert(
            'Unable to share the receipt.'
          );
        }
      } finally {
        setPdfLoading(false);
      }
    };


  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <Box
      className="receipt-page"
      sx={{
        minHeight:
          '100vh',
        background:
          COLORS.background,
        py: {
          xs: 2,
          sm: 4,
        },
        px: {
          xs: 1.5,
          sm: 2,
        },
      }}
    >

      <Box
        className="receipt-container"
        sx={{
          width: '100%',
          maxWidth: 520,
          mx: 'auto',
        }}
      >

        {/* HEADER */}

        <Stack
          className="no-print"
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            mb: 1.5,
          }}
        >

          <Button
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate(
                '/transactions'
              )
            }
            sx={{
              color:
                COLORS.text,
              fontWeight: 800,
              textTransform:
                'none',
            }}
          >
            Back
          </Button>


          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
              color:
                COLORS.secondaryText,
            }}
          >
            Receipt
          </Typography>


          <Box
            sx={{
              width: 60,
            }}
          />

        </Stack>


        {/* RECEIPT */}

        <Box
          ref={receiptRef}
          className="receipt-document"
          sx={{
            background:
              COLORS.white,
            border:
              `1px solid ${COLORS.border}`,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow:
              '0 8px 30px rgba(20,60,45,0.07)',
          }}
        >

          {/* BRAND HEADER */}

          <Box
            sx={{
              background:
                'linear-gradient(135deg, #075B42, #087F5B)',
              color:
                COLORS.white,
              textAlign:
                'center',
              px: 2,
              py: 2.2,
            }}
          >

            <Box
              sx={{
                width: 48,
                height: 48,
                mx: 'auto',
                mb: 0.8,
                borderRadius:
                  2,
                background:
                  'rgba(255,255,255,0.14)',
                border:
                  '1px solid rgba(255,255,255,0.22)',
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: 27,
                fontWeight: 900,
              }}
            >
              Z
            </Box>


            <Typography
              sx={{
                fontSize: 21,
                fontWeight: 900,
                letterSpacing:
                  1.5,
              }}
            >
              ZENIMONIES
            </Typography>


            <Typography
              sx={{
                fontSize: 8.5,
                letterSpacing:
                  3,
                opacity: 0.78,
                mt: 0.25,
                fontWeight: 700,
              }}
            >
              DIGITAL BANKING
            </Typography>


            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 800,
                mt: 1.5,
              }}
            >
              {receiptTitle}
            </Typography>


            <Typography
              sx={{
                fontSize: 9.5,
                opacity: 0.76,
                mt: 0.4,
              }}
            >
              Generated from Zenimonies on{' '}
              {formatDate(
                new Date().toISOString()
              )}
            </Typography>

          </Box>


          {/* AMOUNT */}

          <Box
            sx={{
              textAlign:
                'center',
              px: 2,
              py: 2.2,
              borderBottom:
                `1px solid ${COLORS.border}`,
            }}
          >

            <Typography
              sx={{
                color:
                  COLORS.secondaryText,
                fontSize: 10,
                fontWeight: 700,
                textTransform:
                  'uppercase',
                letterSpacing:
                  0.8,
              }}
            >
              Transaction Amount
            </Typography>


            <Typography
              sx={{
                color:
                  COLORS.primary,
                fontSize: 28,
                fontWeight: 900,
                mt: 0.4,
              }}
            >
              {formatMoney(
                numericAmount
              )}
            </Typography>


            {isTransfer &&
              isIncoming && (
                <Typography
                  sx={{
                    color:
                      COLORS.primary,
                    fontSize: 10,
                    fontWeight: 800,
                    mt: 0.4,
                  }}
                >
                  AMOUNT RECEIVED
                </Typography>
              )}

          </Box>


          {/* DETAILS */}

          <Box
            sx={{
              px: 2,
              py: 0.5,
            }}
          >

            <ReceiptRow
              label="Transaction Type"
              value={
                transactionType
              }
            />


            <ReceiptRow
              label="Transaction Date"
              value={formatDate(
                transactionDate
              )}
            />


            {/* =================================================
                TRANSFER
            ================================================= */}

            {isTransfer && (
              <>

                {/* RECEIVER */}

                {isIncoming ? (
                  <>
                    <ReceiptRow
                      label="Sender"
                      value={
                        senderName
                      }
                    />


                    <ReceiptRow
                      label="Recipient"
                      children={
                        <Box>
                          <Typography
                            sx={{
                              color:
                                COLORS.text,
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            {
                              receiverName
                            }
                          </Typography>

                          {receiverAccount && (
                            <Typography
                              sx={{
                                color:
                                  COLORS.secondaryText,
                                fontSize: 10.5,
                                mt: 0.3,
                              }}
                            >
                              {
                                receiverAccount
                              }
                            </Typography>
                          )}
                        </Box>
                      }
                    />


                    <ReceiptRow
                      label="Receiver Bank"
                      value={
                        receiverBank ||
                        'Zenimonies'
                      }
                    />


                    <ReceiptRow
                      label="Amount Received"
                      value={formatMoney(
                        numericAmount
                      )}
                    />
                  </>
                ) : (
                  <>
                    <ReceiptRow
                      label="Sender"
                      value={
                        senderName
                      }
                    />


                    <ReceiptRow
                      label="Beneficiary"
                      children={
                        <Box>
                          <Typography
                            sx={{
                              color:
                                COLORS.text,
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            {
                              receiverName
                            }
                          </Typography>

                          {receiverAccount && (
                            <Typography
                              sx={{
                                color:
                                  COLORS.secondaryText,
                                fontSize: 10.5,
                                mt: 0.3,
                              }}
                            >
                              {
                                receiverAccount
                              }
                            </Typography>
                          )}
                        </Box>
                      }
                    />


                    <ReceiptRow
                      label="Receiver Bank"
                      value={
                        receiverBank ||
                        'Zenimonies'
                      }
                    />


                    <ReceiptRow
                      label="Transaction Fee"
                      value={formatMoney(
                        numericFee
                      )}
                    />


                    <ReceiptRow
                      label="Total Amount Debited"
                      value={formatMoney(
                        totalDebited
                      )}
                    />
                  </>
                )}

              </>
            )}


            {/* =================================================
                ELECTRICITY
            ================================================= */}

            {isElectricity && (
              <>

                <ReceiptRow
                  label="Customer"
                  value={
                    customerName ||
                    '—'
                  }
                />


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


                {electricityAddress && (
                  <ReceiptRow
                    label="Address"
                    value={
                      electricityAddress
                    }
                  />
                )}


                {electricityToken && (
                  <ReceiptRow
                    label="Electricity Token"
                    children={
                      <Typography
                        sx={{
                          color:
                            COLORS.text,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing:
                            0.5,
                          wordBreak:
                            'break-all',
                        }}
                      >
                        {
                          electricityToken
                        }
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
            ================================================= */}

            {isAirtime && (
              <>

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
            ================================================= */}

            {isData && (
              <>

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
            ================================================= */}

            {isBill &&
              !isElectricity &&
              !isAirtime &&
              !isData && (
                <>

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
            ================================================= */}

            {reference && (
              <ReferenceRow
                label="Transaction Reference"
                value={
                  reference
                }
                onCopy={
                  copyReference
                }
              />
            )}


            {/* =================================================
                STATUS
            ================================================= */}

            <ReceiptRow
              label="Transaction Status"
              children={
                <Typography
                  sx={{
                    color:
                      statusColor,
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


          {/* MESSAGE */}

          <Box
            sx={{
              borderTop:
                `1px solid ${COLORS.border}`,
              mx: 2,
              pt: 1.3,
              pb: 1.3,
            }}
          >
            <Typography
              sx={{
                color:
                  COLORS.secondaryText,
                fontSize: 10,
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              {successMessage}
            </Typography>
          </Box>


          {/* FOOTER */}

          <Box
            sx={{
              borderTop:
                `1px solid ${COLORS.border}`,
              px: 2,
              py: 1.4,
              textAlign:
                'center',
            }}
          >

            <Typography
              sx={{
                color:
                  COLORS.secondaryText,
                fontSize: 9,
                lineHeight: 1.45,
              }}
            >
              Thank you for choosing
              Zenimonies.
            </Typography>


            <Typography
              sx={{
                color:
                  COLORS.primary,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 2,
                mt: 0.4,
              }}
            >
              ZENIMONIES DIGITAL BANKING
            </Typography>

          </Box>

        </Box>


        {/* ==================================================
            ACTION BUTTONS
        ================================================== */}

        <Stack
          className="no-print"
          spacing={1}
          sx={{
            mt: 1.5,
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
                bgcolor:
                  COLORS.primary,
                borderRadius: 2,
                minHeight: 46,
                fontWeight: 800,
                textTransform:
                  'none',
                '&:hover': {
                  bgcolor:
                    COLORS.darkGreen,
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
                borderColor:
                  COLORS.primary,
                color:
                  COLORS.primary,
                borderRadius: 2,
                minHeight: 46,
                fontWeight: 800,
                textTransform:
                  'none',
                '&:hover': {
                  borderColor:
                    COLORS.darkGreen,
                  bgcolor:
                    '#EEF8F4',
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
              borderColor:
                '#CDD8D3',
              color:
                '#46544E',
              borderRadius: 2,
              minHeight: 46,
              fontWeight: 750,
              textTransform:
                'none',
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


/*
 * ============================================================
 * RECEIPT ROW
 * ============================================================
 */

interface ReceiptRowProps {
  label: string;
  value?: string;
  children?: React.ReactNode;
  last?: boolean;
}


const ReceiptRow: React.FC<
  ReceiptRowProps
> = ({
  label,
  value,
  children,
  last = false,
}) => {
  return (
    <Box
      sx={{
        py: 1.15,
        borderBottom:
          last
            ? 'none'
            : `1px solid ${COLORS.border}`,
      }}
    >

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1.5}
      >

        <Typography
          sx={{
            color:
              COLORS.labelGreen,
            fontSize: 11,
            fontWeight: 750,
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>


        {children ? (
          <Box
            sx={{
              minWidth: 0,
              maxWidth:
                '62%',
              textAlign:
                'right',
            }}
          >
            {children}
          </Box>
        ) : (
          <Typography
            sx={{
              color:
                COLORS.text,
              fontSize: 11.5,
              fontWeight: 650,
              textAlign:
                'right',
              wordBreak:
                'break-word',
              maxWidth:
                '62%',
            }}
          >
            {value || '—'}
          </Typography>
        )}

      </Stack>

    </Box>
  );
};


/*
 * ============================================================
 * REFERENCE ROW
 * ============================================================
 */

interface ReferenceRowProps {
  label: string;
  value: string;
  onCopy: () => void;
}


const ReferenceRow: React.FC<
  ReferenceRowProps
> = ({
  label,
  value,
  onCopy,
}) => {
  return (
    <Box
      sx={{
        py: 1.15,
        borderBottom:
          `1px solid ${COLORS.border}`,
      }}
    >

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1}
      >

        <Typography
          sx={{
            color:
              COLORS.labelGreen,
            fontSize: 11,
            fontWeight: 750,
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>


        <Box
          sx={{
            minWidth: 0,
            maxWidth:
              '64%',
            textAlign:
              'right',
          }}
        >

          <Typography
            sx={{
              color:
                COLORS.text,
              fontSize: 10.5,
              fontWeight: 650,
              wordBreak:
                'break-all',
              lineHeight: 1.35,
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
              mt: 0.25,
              color:
                COLORS.primary,
              fontSize: 9,
              fontWeight: 800,
              textTransform:
                'none',
            }}
          >
            Copy reference
          </Button>

        </Box>

      </Stack>

    </Box>
  );
};


export default TransactionReceipt;
