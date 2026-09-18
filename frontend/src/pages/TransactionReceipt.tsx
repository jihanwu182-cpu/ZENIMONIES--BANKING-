import React, {
  useRef,
  useState,
} from 'react';

import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';

import {
  ArrowBackRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  ContentCopyRounded,
  DownloadRounded,
  ErrorRounded,
  PhoneRounded,
  ScheduleRounded,
  ShareRounded,
  TagRounded,
  PersonRounded,
  AccountBalanceRounded,
  ReceiptLongRounded,
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  QRCodeSVG,
} from 'qrcode.react';

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

  // Transfer
  sender_name?: string;
  sender_phone?: string;
  sender_account?: string;

  recipient_name?: string;
  recipient_phone?: string;
  recipient_account?: string;
  recipient_bank?: string;
  recipient_bank_code?: string;

  bank_name?: string;
  account_number?: string;

  // Airtime / Data
  provider?: string;
  network?: string;
  phone?: string;
  data_plan?: string;
  plan_name?: string;
  variation_name?: string;

  // Bills
  customer_number?: string;
  meter_number?: string;
  smartcard_number?: string;
  decoder_number?: string;
  customer_name?: string;

  // Provider
  provider_reference?: string;

  reference?: string;
  transaction_reference?: string;

  status?: string;

  transaction_fee?: number | string;
  fee?: number | string;
  total_debit?: number | string;

  created_at?: string;
  date?: string;
  timestamp?: string;
}


// ============================================================
// COMPONENT
// ============================================================

const TransactionReceipt: React.FC = () => {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const receiptRef =
    useRef<HTMLDivElement>(null);

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState(false);


  // ==========================================================
  // REAL TRANSACTION
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
          bgcolor: '#f3faf7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 360,
            p: 2.5,
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <ReceiptLongRounded
            sx={{
              fontSize: 46,
              color: '#087f5b',
              mb: 1,
            }}
          />

          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 850,
              color: '#063b2b',
              mb: 0.7,
            }}
          >
            Receipt unavailable
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: '#718079',
              mb: 2,
            }}
          >
            Transaction details could not be found.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate('/transactions')
            }
            sx={{
              bgcolor: '#087f5b',
              borderRadius: 2,
              fontWeight: 800,
              '&:hover': {
                bgcolor: '#066b4c',
              },
            }}
          >
            Back to Transactions
          </Button>
        </Card>
      </Box>
    );
  }


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
  // REAL REFERENCE
  // ==========================================================

  const reference =
    transaction.reference ||
    transaction.transaction_reference ||
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
          month: 'short',
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


  const isBill =
    rawType.includes('bill') ||
    rawDescription.includes('electricity') ||
    rawDescription.includes('tv') ||
    rawDescription.includes('betting');


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
  // ZENIMONIES INTERNAL TRANSFER
  // ==========================================================
  //
  // Internal transfer:
  // sender bank = Zenimonies
  // receiver bank = Zenimonies
  //
  // Account numbers are NOT displayed.
  //
  // External bank transfer:
  // account information may be displayed.
  // ==========================================================

  const recipientBank =
    transaction.recipient_bank ||
    transaction.bank_name ||
    '';

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
  // TRANSFER AMOUNTS
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


  const topAmount =
    isIncoming
      ? `+${formatMoney(
          numericAmount
        )}`
      : `−${formatMoney(
          isTransfer
            ? totalDebited
            : numericAmount
        )}`;


  const topAmountLabel =
    isTransfer &&
    !isIncoming
      ? 'Total Amount Debited'
      : 'Amount';


  // ==========================================================
  // TITLE
  // ==========================================================

  let receiptTitle =
    'Transaction Receipt';

  if (isTransfer) {
    receiptTitle =
      'Transfer Receipt';
  } else if (isAirtime) {
    receiptTitle =
      'Airtime Purchase Receipt';
  } else if (isData) {
    receiptTitle =
      'Data Purchase Receipt';
  } else if (isBill) {
    receiptTitle =
      'Bill Payment Receipt';
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
      ? 'Successful'
      : isFailed
        ? 'Failed'
        : isPending
          ? 'Pending'
          : 'Unconfirmed';


  const statusColor =
    isSuccessful
      ? '#087f5b'
      : isFailed
        ? '#c62828'
        : '#a76500';


  const statusBackground =
    isSuccessful
      ? '#dff7ec'
      : isFailed
        ? '#fde8e8'
        : '#fff3d6';


  const StatusIcon =
    isSuccessful
      ? CheckCircleRounded
      : isFailed
        ? ErrorRounded
        : ScheduleRounded;


  // ==========================================================
  // PEOPLE / PROVIDER DETAILS
  // ==========================================================

  const senderName =
    transaction.sender_name ||
    '';

  const senderPhone =
    transaction.sender_phone ||
    '';

  const senderAccount =
    transaction.sender_account ||
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
    '';


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


      const width =
        80;

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
            [
              blob,
            ],
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
            files: [
              file,
            ],
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

              files: [
                file,
              ],
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
  // COMPACT ROW
  // ==========================================================

  const Row = ({
    label,
    value,
    icon,
    valueNode,
  }: {
    label: string;
    value?: React.ReactNode;
    icon?: React.ReactNode;
    valueNode?: React.ReactNode;
  }) => (

    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        minHeight: 30,
        py: 0.2,
        borderBottom:
          '1px solid #e1ebe6',

        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >

      <Stack
        direction="row"
        spacing={0.45}
        alignItems="center"
        sx={{
          minWidth: 0,
          flexShrink: 0,
        }}
      >

        {icon && (
          <Box
            sx={{
              color: '#71817b',
              display: 'flex',

              '& svg': {
                fontSize: 14,
              },
            }}
          >
            {icon}
          </Box>
        )}

        <Typography
          sx={{
            color: '#687871',
            fontSize: 10.5,
            fontWeight: 650,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>

      </Stack>


      {valueNode || (
        <Typography
          sx={{
            color: '#10221c',
            fontSize: 10.8,
            fontWeight: 750,
            textAlign: 'right',
            wordBreak: 'break-word',
            minWidth: 0,
          }}
        >
          {value}
        </Typography>
      )}

    </Box>
  );


  // ==========================================================
  // PERSON COMPACT BLOCK
  // ==========================================================

  const PersonBlock = ({
    title,
    name,
    phone,
    account,
    bank,
    showAccount,
  }: {
    title: string;
    name?: string;
    phone?: string;
    account?: string;
    bank?: string;
    showAccount: boolean;
  }) => (

    <Box
      sx={{
        py: 0.55,
        borderBottom:
          '1px solid #dfe9e4',
      }}
    >

      <Typography
        sx={{
          color: '#087f5b',
          fontSize: 11.5,
          fontWeight: 850,
          mb: 0.15,
        }}
      >
        {title}
      </Typography>


      {name && (
        <Typography
          sx={{
            color: '#10221c',
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.25,
          }}
        >
          {name}
        </Typography>
      )}


      <Stack
        direction="row"
        spacing={0.8}
        flexWrap="wrap"
        sx={{
          mt: 0.15,
        }}
      >

        {phone && (
          <Typography
            sx={{
              color: '#687871',
              fontSize: 10,
              fontWeight: 650,
            }}
          >
            {phone}
          </Typography>
        )}


        {showAccount &&
          account && (
            <Typography
              sx={{
                color: '#687871',
                fontSize: 10,
                fontWeight: 650,
              }}
            >
              • {account}
            </Typography>
          )}

      </Stack>


      {bank && (
        <Typography
          sx={{
            color: '#687871',
            fontSize: 9.5,
            fontWeight: 650,
            mt: 0.1,
          }}
        >
          {bank}
        </Typography>
      )}

    </Box>
  );


  // ==========================================================
  // RECEIPT
  // ==========================================================

  return (
    <Box
      className="receipt-page"
      sx={{
        minHeight: '100vh',
        bgcolor: '#f3faf7',
        py: 0.6,
        px: 0.5,
      }}
    >

      <Box
        className="receipt-container"
        sx={{
          width: '100%',
          maxWidth: 360,
          mx: 'auto',
        }}
      >

        {/* ====================================================
            RECEIPT CARD
        ===================================================== */}

        <Card
          ref={receiptRef}
          className="receipt-card"
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: 2.2,
            border:
              '1px solid #dcebe4',
            bgcolor: '#ffffff',
            boxShadow:
              '0 5px 18px rgba(7,94,66,0.07)',
          }}
        >

          {/* ==================================================
              HEADER
          =================================================== */}

          <Box
            className="receipt-header"
            sx={{
              bgcolor: '#087f5b',
              color: '#ffffff',
              px: 1.25,
              py: 0.9,
            }}
          >

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >

              <Stack
                direction="row"
                alignItems="center"
                spacing={0.7}
              >

                <Box
                  sx={{
                    width: 31,
                    height: 31,
                    border:
                      '2px solid #ffffff',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 19,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  Z
                </Box>


                <Box>

                  <Typography
                    sx={{
                      fontSize: 15.5,
                      fontWeight: 900,
                      letterSpacing: 0.4,
                      lineHeight: 1,
                    }}
                  >
                    ZENIMONIES
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: 5.5,
                      letterSpacing: 1.7,
                      fontWeight: 650,
                      opacity: 0.9,
                    }}
                  >
                    DIGITAL BANKING
                  </Typography>

                </Box>

              </Stack>


              <Box
                sx={{
                  borderLeft:
                    '1px solid rgba(255,255,255,0.75)',
                  pl: 1,
                  textAlign: 'right',
                }}
              >

                <Typography
                  sx={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    lineHeight: 1.15,
                  }}
                >
                  {receiptTitle}
                </Typography>

              </Box>

            </Stack>

          </Box>


          {/* ==================================================
              STATUS + TOTAL
          =================================================== */}

          <Box
            sx={{
              textAlign: 'center',
              px: 1.2,
              pt: 1.05,
              pb: 0.8,
            }}
          >

            <Box
              sx={{
                width: 34,
                height: 34,
                mx: 'auto',
                borderRadius: '50%',
                bgcolor:
                  statusBackground,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >

              <StatusIcon
                sx={{
                  fontSize: 22,
                  color: statusColor,
                }}
              />

            </Box>


            <Typography
              sx={{
                mt: 0.45,
                color: '#063b2b',
                fontSize: 16,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {isSuccessful
                ? 'Transaction Successful'
                : isFailed
                  ? 'Transaction Failed'
                  : isPending
                    ? 'Transaction Pending'
                    : 'Transaction Unconfirmed'}
            </Typography>


            <Typography
              sx={{
                mt: 0.2,
                color: '#718079',
                fontSize: 9.5,
              }}
            >
              {isSuccessful
                ? `Your ${
                    isTransfer
                      ? 'transfer'
                      : isAirtime
                        ? 'airtime purchase'
                        : isData
                          ? 'data purchase'
                          : isBill
                            ? 'bill payment'
                            : 'transaction'
                  } has been completed.`
                : isPending
                  ? 'Your transaction is still being processed.'
                  : isFailed
                    ? 'Your transaction could not be completed.'
                    : 'The transaction status could not be confirmed.'}
            </Typography>


            <Typography
              sx={{
                mt: 0.55,
                color: isIncoming
                  ? '#087f5b'
                  : '#063b2b',
                fontSize: 26,
                fontWeight: 950,
                letterSpacing: -0.7,
                lineHeight: 1,
              }}
            >
              {topAmount}
            </Typography>


            <Typography
              sx={{
                mt: 0.15,
                color: '#687871',
                fontSize: 9.5,
                fontWeight: 750,
              }}
            >
              {topAmountLabel}
            </Typography>

          </Box>


          <Divider
            sx={{
              mx: 1.2,
              borderColor: '#dce6e1',
            }}
          />


          {/* ==================================================
              CONTENT
          =================================================== */}

          <Box
            sx={{
              px: 1.2,
              py: 0.55,
            }}
          >

            {/* =================================================
                TRANSFER
            ================================================= */}

            {isTransfer && (
              <>

                <Box
                  sx={{
                    bgcolor: '#eaf8f2',
                    borderRadius: 1.2,
                    px: 0.8,
                    py: 0.5,
                    mb: 0.35,
                  }}
                >

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.55}
                  >

                    <Box
                      sx={{
                        width: 23,
                        height: 23,
                        bgcolor: '#087f5b',
                        color: '#ffffff',
                        borderRadius: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ArrowUpwardRounded
                        sx={{
                          fontSize: 14,
                        }}
                      />
                    </Box>

                    <Typography
                      sx={{
                        color: '#075c43',
                        fontSize: 12.5,
                        fontWeight: 850,
                      }}
                    >
                      Transfer Details
                    </Typography>

                  </Stack>

                </Box>


                <Row
                  icon={
                    <TagRounded />
                  }
                  label="Transaction Type"
                  value={
                    isZenimoniesTransfer
                      ? 'Zenimonies to Zenimonies'
                      : 'Bank Transfer'
                  }
                />


                {/* SENDER */}

                <PersonBlock
                  title="From (Sender)"
                  name={
                    senderName
                  }
                  phone={
                    senderPhone
                  }
                  account={
                    senderAccount
                  }
                  bank="Zenimonies"
                  showAccount={
                    !isZenimoniesTransfer
                  }
                />


                {/* RECEIVER */}

                <PersonBlock
                  title="To (Receiver)"
                  name={
                    receiverName
                  }
                  phone={
                    receiverPhone
                  }
                  account={
                    receiverAccount
                  }
                  bank={
                    recipientBank ||
                    'Zenimonies'
                  }
                  showAccount={
                    !isZenimoniesTransfer
                  }
                />


                <Row
                  icon={
                    <ArrowUpwardRounded />
                  }
                  label="Amount Transferred"
                  value={
                    formatMoney(
                      numericAmount
                    )
                  }
                />


                {numericFee > 0 && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Transaction Fee"
                    value={
                      formatMoney(
                        numericFee
                      )
                    }
                  />
                )}


                <Row
                  icon={
                    <ArrowUpwardRounded />
                  }
                  label="Total Amount Debited"
                  value={
                    formatMoney(
                      totalDebited
                    )
                  }
                />


                {reference && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Reference"
                    valueNode={
                      <Stack
                        direction="row"
                        spacing={0.3}
                        alignItems="center"
                        justifyContent="flex-end"
                        sx={{
                          minWidth: 0,
                        }}
                      >

                        <Typography
                          sx={{
                            fontSize: 9.2,
                            fontWeight: 750,
                            color: '#10221c',
                            wordBreak:
                              'break-all',
                            textAlign: 'right',
                          }}
                        >
                          {reference}
                        </Typography>

                        <Button
                          className="no-print"
                          onClick={
                            copyReference
                          }
                          sx={{
                            minWidth: 21,
                            width: 21,
                            height: 21,
                            p: 0,
                            color: '#087f5b',
                          }}
                        >
                          <ContentCopyRounded
                            sx={{
                              fontSize: 13,
                            }}
                          />
                        </Button>

                      </Stack>
                    }
                  />
                )}


                <Row
                  icon={
                    <CalendarMonthRounded />
                  }
                  label="Date & Time"
                  value={
                    formatDate(
                      transactionDate
                    )
                  }
                />


                <Row
                  icon={
                    <CheckCircleRounded />
                  }
                  label="Status"
                  valueNode={
                    <Chip
                      label={
                        statusText
                      }
                      size="small"
                      sx={{
                        height: 20,
                        bgcolor:
                          statusBackground,
                        color:
                          statusColor,
                        fontSize: 9,
                        fontWeight: 850,
                        borderRadius: 1,
                      }}
                    />
                  }
                />

              </>
            )}


            {/* =================================================
                AIRTIME
            ================================================= */}

            {isAirtime && (
              <>

                <Box
                  sx={{
                    bgcolor: '#eaf8f2',
                    borderRadius: 1.2,
                    px: 0.8,
                    py: 0.5,
                    mb: 0.35,
                  }}
                >

                  <Typography
                    sx={{
                      color: '#075c43',
                      fontSize: 12.5,
                      fontWeight: 850,
                    }}
                  >
                    Airtime Purchase
                  </Typography>

                </Box>


                <Row
                  icon={
                    <TagRounded />
                  }
                  label="Provider"
                  value={
                    provider ||
                    'Provider unavailable'
                  }
                />


                <Row
                  icon={
                    <PhoneRounded />
                  }
                  label="Phone Number"
                  value={
                    servicePhone ||
                    'Phone unavailable'
                  }
                />


                <Row
                  icon={
                    <ArrowUpwardRounded />
                  }
                  label="Amount"
                  value={
                    formatMoney(
                      numericAmount
                    )
                  }
                />


                {reference && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Reference"
                    valueNode={
                      <Stack
                        direction="row"
                        spacing={0.3}
                        alignItems="center"
                      >

                        <Typography
                          sx={{
                            fontSize: 9,
                            fontWeight: 750,
                            wordBreak:
                              'break-all',
                            textAlign: 'right',
                          }}
                        >
                          {reference}
                        </Typography>

                        <Button
                          className="no-print"
                          onClick={
                            copyReference
                          }
                          sx={{
                            minWidth: 21,
                            width: 21,
                            height: 21,
                            p: 0,
                            color: '#087f5b',
                          }}
                        >
                          <ContentCopyRounded
                            sx={{
                              fontSize: 13,
                            }}
                          />
                        </Button>

                      </Stack>
                    }
                  />
                )}


                <Row
                  icon={
                    <CalendarMonthRounded />
                  }
                  label="Date & Time"
                  value={
                    formatDate(
                      transactionDate
                    )
                  }
                />


                <Row
                  icon={
                    <CheckCircleRounded />
                  }
                  label="Status"
                  valueNode={
                    <Chip
                      label={
                        statusText
                      }
                      size="small"
                      sx={{
                        height: 20,
                        bgcolor:
                          statusBackground,
                        color:
                          statusColor,
                        fontSize: 9,
                        fontWeight: 850,
                      }}
                    />
                  }
                />

              </>
            )}


            {/* =================================================
                DATA
            ================================================= */}

            {isData && (
              <>

                <Box
                  sx={{
                    bgcolor: '#eaf8f2',
                    borderRadius: 1.2,
                    px: 0.8,
                    py: 0.5,
                    mb: 0.35,
                  }}
                >

                  <Typography
                    sx={{
                      color: '#075c43',
                      fontSize: 12.5,
                      fontWeight: 850,
                    }}
                  >
                    Data Purchase
                  </Typography>

                </Box>


                <Row
                  icon={
                    <TagRounded />
                  }
                  label="Provider"
                  value={
                    provider ||
                    'Provider unavailable'
                  }
                />


                <Row
                  icon={
                    <PhoneRounded />
                  }
                  label="Phone Number"
                  value={
                    servicePhone ||
                    'Phone unavailable'
                  }
                />


                {dataPlan && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Data Plan"
                    value={
                      dataPlan
                    }
                  />
                )}


                <Row
                  icon={
                    <ArrowUpwardRounded />
                  }
                  label="Amount"
                  value={
                    formatMoney(
                      numericAmount
                    )
                  }
                />


                {reference && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Reference"
                    value={
                      reference
                    }
                  />
                )}


                <Row
                  icon={
                    <CalendarMonthRounded />
                  }
                  label="Date & Time"
                  value={
                    formatDate(
                      transactionDate
                    )
                  }
                />


                <Row
                  icon={
                    <CheckCircleRounded />
                  }
                  label="Status"
                  valueNode={
                    <Chip
                      label={
                        statusText
                      }
                      size="small"
                      sx={{
                        height: 20,
                        bgcolor:
                          statusBackground,
                        color:
                          statusColor,
                        fontSize: 9,
                        fontWeight: 850,
                      }}
                    />
                  }
                />

              </>
            )}


            {/* =================================================
                BILLS
            ================================================= */}

            {isBill && (
              <>

                <Box
                  sx={{
                    bgcolor: '#eaf8f2',
                    borderRadius: 1.2,
                    px: 0.8,
                    py: 0.5,
                    mb: 0.35,
                  }}
                >

                  <Typography
                    sx={{
                      color: '#075c43',
                      fontSize: 12.5,
                      fontWeight: 850,
                    }}
                  >
                    Bill Payment
                  </Typography>

                </Box>


                <Row
                  icon={
                    <AccountBalanceRounded />
                  }
                  label="Provider"
                  value={
                    provider ||
                    'Provider unavailable'
                  }
                />


                {customerName && (
                  <Row
                    icon={
                      <PersonRounded />
                    }
                    label="Customer"
                    value={
                      customerName
                    }
                  />
                )}


                {customerNumber && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Customer Number"
                    value={
                      customerNumber
                    }
                  />
                )}


                <Row
                  icon={
                    <ArrowUpwardRounded />
                  }
                  label="Amount"
                  value={
                    formatMoney(
                      numericAmount
                    )
                  }
                />


                {reference && (
                  <Row
                    icon={
                      <TagRounded />
                    }
                    label="Reference"
                    value={
                      reference
                    }
                  />
                )}


                <Row
                  icon={
                    <CalendarMonthRounded />
                  }
                  label="Date & Time"
                  value={
                    formatDate(
                      transactionDate
                    )
                  }
                />


                <Row
                  icon={
                    <CheckCircleRounded />
                  }
                  label="Status"
                  valueNode={
                    <Chip
                      label={
                        statusText
                      }
                      size="small"
                      sx={{
                        height: 20,
                        bgcolor:
                          statusBackground,
                        color:
                          statusColor,
                        fontSize: 9,
                        fontWeight: 850,
                      }}
                    />
                  }
                />

              </>
            )}


            {/* =================================================
                OTHER TRANSACTIONS
            ================================================= */}

            {!isTransfer &&
              !isAirtime &&
              !isData &&
              !isBill && (
                <>

                  <Box
                    sx={{
                      bgcolor: '#eaf8f2',
                      borderRadius: 1.2,
                      px: 0.8,
                      py: 0.5,
                      mb: 0.35,
                    }}
                  >

                    <Typography
                      sx={{
                        color: '#075c43',
                        fontSize: 12.5,
                        fontWeight: 850,
                      }}
                    >
                      Transaction Details
                    </Typography>

                  </Box>


                  <Row
                    icon={
                      <ReceiptLongRounded />
                    }
                    label="Type"
                    value={
                      receiptTitle.replace(
                        ' Receipt',
                        ''
                      )
                    }
                  />


                  <Row
                    icon={
                      <ArrowUpwardRounded />
                    }
                    label="Amount"
                    value={
                      formatMoney(
                        numericAmount
                      )
                    }
                  />


                  {reference && (
                    <Row
                      icon={
                        <TagRounded />
                      }
                      label="Reference"
                      value={
                        reference
                      }
                    />
                  )}


                  <Row
                    icon={
                      <CalendarMonthRounded />
                    }
                    label="Date & Time"
                    value={
                      formatDate(
                        transactionDate
                      )
                    }
                  />


                  <Row
                    icon={
                      <CheckCircleRounded />
                    }
                    label="Status"
                    valueNode={
                      <Chip
                        label={
                          statusText
                        }
                        size="small"
                        sx={{
                          height: 20,
                          bgcolor:
                            statusBackground,
                          color:
                            statusColor,
                          fontSize: 9,
                          fontWeight: 850,
                        }}
                      />
                    }
                  />

                </>
              )}

          </Box>


          {/* ==================================================
              QR CODE
          =================================================== */}

          {reference && (
            <Box
              sx={{
                textAlign: 'center',
                pt: 0.35,
                pb: 0.65,
              }}
            >

              <Box
                sx={{
                  display: 'inline-flex',
                  p: 0.45,
                  border:
                    '1px solid #d5e5de',
                  borderRadius: 1.2,
                  bgcolor: '#ffffff',
                }}
              >

                <QRCodeSVG
                  value={
                    reference
                  }
                  size={82}
                  level="M"
                  includeMargin={false}
                />

              </Box>


              <Typography
                sx={{
                  mt: 0.25,
                  color: '#687871',
                  fontSize: 8.5,
                  fontWeight: 650,
                }}
              >
                Scan to verify this transaction
              </Typography>


              <Typography
                sx={{
                  mt: 0.05,
                  color: '#087f5b',
                  fontSize: 8.2,
                  fontWeight: 800,
                  wordBreak: 'break-all',
                  px: 2,
                }}
              >
                {reference}
              </Typography>

            </Box>
          )}


          {/* ==================================================
              FOOTER
          =================================================== */}

          <Box
            className="receipt-footer"
            sx={{
              bgcolor: '#075b42',
              color: '#ffffff',
              textAlign: 'center',
              py: 0.7,
              px: 1,
            }}
          >

            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Thanks for banking with us
              {' '}
              ♡
            </Typography>

          </Box>

        </Card>


        {/* ====================================================
            ACTION BUTTONS
        ===================================================== */}

        <Stack
          className="no-print"
          spacing={0.55}
          sx={{
            mt: 0.7,
          }}
        >

          <Stack
            direction="row"
            spacing={0.55}
          >

            <Button
              fullWidth
              variant="contained"
              startIcon={
                <DownloadRounded
                  sx={{
                    fontSize: 17,
                  }}
                />
              }
              onClick={
                handleDownloadPDF
              }
              disabled={
                pdfLoading
              }
              sx={{
                bgcolor: '#087f5b',
                borderRadius: 1.6,
                py: 0.7,
                fontSize: 10.5,
                fontWeight: 850,
                minHeight: 38,
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
                <ShareRounded
                  sx={{
                    fontSize: 17,
                  }}
                />
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
                borderRadius: 1.6,
                py: 0.7,
                fontSize: 10.5,
                fontWeight: 850,
                minHeight: 38,
                '&:hover': {
                  borderColor: '#066b4c',
                  bgcolor: '#eaf8f2',
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
              <ArrowBackRounded
                sx={{
                  fontSize: 18,
                }}
              />
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
              borderColor: '#d2ded9',
              color: '#42534c',
              borderRadius: 1.6,
              py: 0.65,
              fontSize: 10.5,
              fontWeight: 750,
              minHeight: 36,
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
              size: 80mm auto;
              margin: 0;
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
              width: 80mm !important;
              max-width: 80mm !important;
            }

            .receipt-card {
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }

            .receipt-header,
            .receipt-footer {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
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
