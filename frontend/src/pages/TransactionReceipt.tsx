import React, { useRef, useState } from 'react';

import {
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';

import {
  ArrowBackRounded,
  CheckCircleRounded,
  DownloadRounded,
  ShareRounded,
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

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

  // Sender
  sender_name?: string;
  sender_phone?: string;
  sender_account?: string;
  sender_bank?: string;

  // Recipient
  recipient_name?: string;
  recipient_phone?: string;
  recipient_account?: string;
  recipient_bank?: string;

  // Receiver
  receiver_name?: string;
  receiver_account?: string;
  receiver_bank?: string;

  account_number?: string;
  bank_name?: string;

  provider?: string;
  network?: string;
  phone?: string;

  data_plan?: string;
  plan_name?: string;
  variation_name?: string;

  customer_number?: string;
  customer_name?: string;
  verified_customer_name?: string;

  meter_number?: string;
  meter_type?: string;

  smartcard_number?: string;
  decoder_number?: string;

  electricity_token?: string;
  token?: string;
  units?: string | number;

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

const TransactionReceipt: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const receiptRef = useRef<HTMLDivElement>(null);

  const [pdfLoading, setPdfLoading] = useState(false);

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;

  /*
   * ============================================================
   * NO TRANSACTION
   * ============================================================
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

  /*
   * ============================================================
   * LOCAL USER
   * ============================================================
   */

  const getLocalUser = () => {
    try {
      const raw = localStorage.getItem(
        'zenimonies_user'
      );

      if (!raw) {
        return {};
      }

      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  };

  const localUser = getLocalUser();

  /*
   * ============================================================
   * LOCAL ACCOUNTS
   * ============================================================
   */

  const getLocalAccounts = () => {
    try {
      const raw = localStorage.getItem(
        'zenimonies_accounts'
      );

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  };

  const localAccounts = getLocalAccounts();

  /*
   * ============================================================
   * BASIC VALUES
   * ============================================================
   */

  const numericAmount =
    Number(transaction.amount ?? 0);

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
      transaction.currency || 'NGN'
    ).toUpperCase();

  /*
   * ============================================================
   * MONEY
   * ============================================================
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
      return `₦${safe.toFixed(2)}`;
    }
  };

  /*
   * ============================================================
   * REFERENCE
   * ============================================================
   */

  const reference =
    transaction.reference ||
    transaction.transaction_reference ||
    '';

  /*
   * ============================================================
   * DATE
   * ============================================================
   */

  const transactionDate =
    transaction.created_at ||
    transaction.date ||
    transaction.timestamp;

  const formatDate = (
    value?: string
  ) => {
    if (!value) {
      return '';
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

  /*
   * ============================================================
   * TYPE DETECTION
   * ============================================================
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
      transaction.description || ''
    ).toLowerCase();

  const isTransfer =
    rawType.includes('transfer') ||
    rawDescription.includes('transfer');

  const isIncoming =
    rawType.includes(
      'internal_transfer_received'
    ) ||
    rawType.includes(
      'transfer_received'
    ) ||
    rawType.includes('received') ||
    rawDescription.includes(
      'money received'
    ) ||
    rawDescription.includes('received') ||
    transaction.category === 'credit' ||
    transaction.category === 'incoming';

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

  /*
   * ============================================================
   * RECEIVER INFORMATION
   * ============================================================
   */

  const receiverName =
    transaction.receiver_name ||
    (
      isIncoming
        ? localUser.full_name
        : ''
    ) ||
    (
      isIncoming
        ? localUser.name
        : ''
    ) ||
    (
      isIncoming
        ? [
            localUser.first_name,
            localUser.last_name,
          ]
            .filter(Boolean)
            .join(' ')
        : ''
    );

  /*
   * Receiver's real account information.
   *
   * sender_account is NEVER used here.
   */

  const firstLocalAccount =
    localAccounts[0] || {};

  const receiverOwnAccount =
    transaction.receiver_account ||
    (
      isIncoming
        ? transaction.account_number
        : ''
    ) ||
    (
      isIncoming
        ? firstLocalAccount.account_number
        : ''
    ) ||
    (
      isIncoming
        ? localUser.account_number
        : ''
    ) ||
    '';

  /*
   * Receiver bank.
   *
   * Internal received transfers use ZENIMONIES.
   */

  const receiverBank =
    transaction.receiver_bank ||
    (
      isIncoming
        ? 'ZENIMONIES'
        : ''
    );

  /*
   * ============================================================
   * SENDER
   *
   * Receiver receipt shows sender NAME only.
   * Sender account number is never displayed.
   * ============================================================
   */

  const senderName =
    transaction.sender_name || '';

  /*
   * ============================================================
   * BENEFICIARY
   *
   * Used for sender receipt.
   * ============================================================
   */

  const beneficiaryName =
    transaction.recipient_name ||
    transaction.receiver_name ||
    '';

  const beneficiaryAccount =
    transaction.recipient_account ||
    transaction.receiver_account ||
    transaction.account_number ||
    '';

  const beneficiaryBank =
    transaction.recipient_bank ||
    transaction.receiver_bank ||
    transaction.bank_name ||
    '';

  /*
   * ============================================================
   * SERVICE INFORMATION
   * ============================================================
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

  const customerName =
    transaction.customer_name ||
    transaction.verified_customer_name ||
    '';

  const customerNumber =
    transaction.customer_number ||
    transaction.meter_number ||
    transaction.smartcard_number ||
    transaction.decoder_number ||
    '';

  const electricityToken =
    transaction.electricity_token ||
    transaction.token ||
    '';

  const electricityUnits =
    transaction.units !== undefined &&
    transaction.units !== null
      ? String(transaction.units)
      : '';

  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const rawStatus =
    String(
      transaction.status || ''
    )
      .trim()
      .toLowerCase();

  const isSuccessful = [
    'successful',
    'completed',
    'success',
    'delivered',
  ].includes(rawStatus);

  const isFailed = [
    'failed',
    'failure',
    'reversed',
    'cancelled',
    'canceled',
  ].includes(rawStatus);

  const statusText =
    isSuccessful
      ? 'Successful'
      : isFailed
        ? 'Failed'
        : 'Pending';

  const statusColor =
    isSuccessful
      ? COLORS.success
      : isFailed
        ? COLORS.danger
        : COLORS.warning;

  /*
   * ============================================================
   * RECEIPT TITLE
   * ============================================================
   */

  let receiptTitle =
    'TRANSACTION';

  if (isTransfer) {
    receiptTitle =
      isIncoming
        ? 'TRANSFER RECEIVED'
        : 'TRANSFER SENT';
  } else if (isElectricity) {
    receiptTitle =
      'ELECTRICITY PAYMENT';
  } else if (isAirtime) {
    receiptTitle =
      'AIRTIME PURCHASE';
  } else if (isData) {
    receiptTitle =
      'DATA PURCHASE';
  } else if (isTV) {
    receiptTitle =
      'TV SUBSCRIPTION';
  } else if (isBill) {
    receiptTitle =
      'BILL PAYMENT';
  }

  /*
   * ============================================================
   * TOTAL DEBIT
   * ============================================================
   */

  let totalDebited =
    Math.abs(numericAmount);

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
   * ============================================================
   * COPY REFERENCE
   * ============================================================
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
   * ============================================================
   * PDF
   * ============================================================
   */

  const getFileName = () => {
    const safe =
      reference
        ? reference.replace(
            /[^a-zA-Z0-9_-]/g,
            '_'
          )
        : 'transaction';

    return `ZENIMONIES-${safe}.pdf`;
  };

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
            scale: 2.5,
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
          'ZENIMONIES receipt PDF error:',
          error
        );

        alert(
          'Unable to create the receipt PDF.'
        );
      } finally {
        setPdfLoading(false);
      }
    };

  const handleSharePDF =
    async () => {
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
              type: 'application/pdf',
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
              'ZENIMONIES Transaction Receipt',
            files: [file],
          });
        } else {
          pdf.save(
            getFileName()
          );
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

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

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
        {/* RECEIPT */}

        <Box
          ref={receiptRef}
          className="receipt-document"
          sx={{
            bgcolor: COLORS.white,
            borderRadius: 2.5,
            overflow: 'hidden',
            border:
              `1px solid ${COLORS.border}`,
          }}
        >
          {/* BRAND */}

          <Box
            sx={{
              textAlign: 'center',
              px: 2,
              pt: 2,
              pb: 1.5,
            }}
          >
            <Typography
              sx={{
                color: COLORS.primary,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              ZENIMONIES
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                color: COLORS.muted,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: 0.8,
              }}
            >
              TRANSACTION RECEIPT
            </Typography>
          </Box>

          {/* STATUS / AMOUNT */}

          <Box
            sx={{
              textAlign: 'center',
              px: 2,
              py: 1.6,
              bgcolor: '#F4FAF7',
              borderTop:
                `1px solid ${COLORS.border}`,
              borderBottom:
                `1px solid ${COLORS.border}`,
            }}
          >
            <CheckCircleRounded
              sx={{
                color: statusColor,
                fontSize: 28,
              }}
            />

            <Typography
              sx={{
                mt: 0.25,
                color: statusColor,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {statusText}
            </Typography>

            <Typography
              sx={{
                mt: 0.8,
                color: COLORS.muted,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: 0.7,
              }}
            >
              {receiptTitle}
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color: COLORS.text,
                fontSize: 25,
                lineHeight: 1.1,
                fontWeight: 900,
              }}
            >
              {isIncoming
                ? `+${formatMoney(numericAmount)}`
                : formatMoney(numericAmount)}
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                color: COLORS.muted,
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {isIncoming
                ? 'Amount Received'
                : 'Transaction Amount'}
            </Typography>
          </Box>

          {/* RECEIPT DETAILS */}

          <Box
            sx={{
              px: 2,
            }}
          >
            {/* ==================================================
                RECEIVER TRANSFER
            ================================================== */}

            {isTransfer &&
              isIncoming && (
                <>
                  {/* SENDER NAME ONLY */}

                  {senderName && (
                    <ReceiptRow
                      label="Sender"
                      value={senderName}
                    />
                  )}

                  {/* RECEIVER */}

                  {receiverName && (
                    <ReceiptRow
                      label="Receiver Name"
                      value={receiverName}
                    />
                  )}

                  {/* RECEIVER ACCOUNT */}

                  {receiverOwnAccount && (
                    <ReceiptRow
                      label="Receiver Account Number"
                      value={receiverOwnAccount}
                    />
                  )}

                  {/* RECEIVER BANK */}

                  {receiverBank && (
                    <ReceiptRow
                      label="Bank"
                      value={receiverBank}
                    />
                  )}

                  {/* DATE */}

                  {transactionDate && (
                    <ReceiptRow
                      label="Date & Time"
                      value={formatDate(
                        transactionDate
                      )}
                    />
                  )}

                  {/* REFERENCE */}

                  {reference && (
                    <ReferenceRow
                      label="Reference"
                      value={reference}
                      onCopy={copyReference}
                    />
                  )}

                  {/* STATUS */}

                  <ReceiptRow
                    label="Status"
                    value={statusText}
                    valueColor={statusColor}
                    last
                  />
                </>
              )}

            {/* ==================================================
                SENDER TRANSFER
            ================================================== */}

            {isTransfer &&
              !isIncoming && (
                <>
                  {beneficiaryName && (
                    <ReceiptRow
                      label="Beneficiary"
                      value={beneficiaryName}
                    />
                  )}

                  {beneficiaryAccount && (
                    <ReceiptRow
                      label="Account Number"
                      value={beneficiaryAccount}
                    />
                  )}

                  {beneficiaryBank && (
                    <ReceiptRow
                      label="Bank"
                      value={beneficiaryBank}
                    />
                  )}

                  <ReceiptRow
                    label="Transaction Fee"
                    value={formatMoney(
                      numericFee
                    )}
                  />

                  <ReceiptRow
                    label="Total Debited"
                    value={formatMoney(
                      totalDebited
                    )}
                  />

                  {transactionDate && (
                    <ReceiptRow
                      label="Date & Time"
                      value={formatDate(
                        transactionDate
                      )}
                    />
                  )}

                  {reference && (
                    <ReferenceRow
                      label="Reference"
                      value={reference}
                      onCopy={copyReference}
                    />
                  )}

                  <ReceiptRow
                    label="Status"
                    value={statusText}
                    valueColor={statusColor}
                    last
                  />
                </>
              )}

            {/* ==================================================
                ELECTRICITY
            ================================================== */}

            {isElectricity && (
              <>
                {customerName && (
                  <ReceiptRow
                    label="Customer"
                    value={customerName}
                  />
                )}

                {provider && (
                  <ReceiptRow
                    label="Provider"
                    value={provider}
                  />
                )}

                {customerNumber && (
                  <ReceiptRow
                    label="Meter Number"
                    value={customerNumber}
                  />
                )}

                {electricityUnits && (
                  <ReceiptRow
                    label="Units"
                    value={electricityUnits}
                  />
                )}

                {electricityToken && (
                  <ReceiptRow
                    label="Token"
                    value={electricityToken}
                  />
                )}

                {transactionDate && (
                  <ReceiptRow
                    label="Date & Time"
                    value={formatDate(
                      transactionDate
                    )}
                  />
                )}

                {reference && (
                  <ReferenceRow
                    label="Reference"
                    value={reference}
                    onCopy={copyReference}
                  />
                )}

                <ReceiptRow
                  label="Status"
                  value={statusText}
                  valueColor={statusColor}
                  last
                />
              </>
            )}

            {/* ==================================================
                AIRTIME
            ================================================== */}

            {isAirtime && (
              <>
                {provider && (
                  <ReceiptRow
                    label="Network"
                    value={provider}
                  />
                )}

                {servicePhone && (
                  <ReceiptRow
                    label="Phone Number"
                    value={servicePhone}
                  />
                )}

                {transactionDate && (
                  <ReceiptRow
                    label="Date & Time"
                    value={formatDate(
                      transactionDate
                    )}
                  />
                )}

                {reference && (
                  <ReferenceRow
                    label="Reference"
                    value={reference}
                    onCopy={copyReference}
                  />
                )}

                <ReceiptRow
                  label="Status"
                  value={statusText}
                  valueColor={statusColor}
                  last
                />
              </>
            )}

            {/* ==================================================
                DATA
            ================================================== */}

            {isData && (
              <>
                {provider && (
                  <ReceiptRow
                    label="Network"
                    value={provider}
                  />
                )}

                {servicePhone && (
                  <ReceiptRow
                    label="Phone Number"
                    value={servicePhone}
                  />
                )}

                {dataPlan && (
                  <ReceiptRow
                    label="Data Plan"
                    value={dataPlan}
                  />
                )}

                {transactionDate && (
                  <ReceiptRow
                    label="Date & Time"
                    value={formatDate(
                      transactionDate
                    )}
                  />
                )}

                {reference && (
                  <ReferenceRow
                    label="Reference"
                    value={reference}
                    onCopy={copyReference}
                  />
                )}

                <ReceiptRow
                  label="Status"
                  value={statusText}
                  valueColor={statusColor}
                  last
                />
              </>
            )}

            {/* ==================================================
                OTHER BILLS
            ================================================== */}

            {isBill &&
              !isElectricity &&
              !isAirtime &&
              !isData &&
              !isTransfer && (
                <>
                  {provider && (
                    <ReceiptRow
                      label="Provider"
                      value={provider}
                    />
                  )}

                  {customerName && (
                    <ReceiptRow
                      label="Customer"
                      value={customerName}
                    />
                  )}

                  {customerNumber && (
                    <ReceiptRow
                      label="Customer Number"
                      value={customerNumber}
                    />
                  )}

                  {transactionDate && (
                    <ReceiptRow
                      label="Date & Time"
                      value={formatDate(
                        transactionDate
                      )}
                    />
                  )}

                  {reference && (
                    <ReferenceRow
                      label="Reference"
                      value={reference}
                      onCopy={copyReference}
                    />
                  )}

                  <ReceiptRow
                    label="Status"
                    value={statusText}
                    valueColor={statusColor}
                    last
                  />
                </>
              )}

            {/* ==================================================
                GENERIC
            ================================================== */}

            {!isTransfer &&
              !isElectricity &&
              !isAirtime &&
              !isData &&
              !isBill && (
                <>
                  {transaction.description && (
                    <ReceiptRow
                      label="Description"
                      value={
                        transaction.description
                      }
                    />
                  )}

                  {transactionDate && (
                    <ReceiptRow
                      label="Date & Time"
                      value={formatDate(
                        transactionDate
                      )}
                    />
                  )}

                  {reference && (
                    <ReferenceRow
                      label="Reference"
                      value={reference}
                      onCopy={copyReference}
                    />
                  )}

                  <ReceiptRow
                    label="Status"
                    value={statusText}
                    valueColor={statusColor}
                    last
                  />
                </>
              )}
          </Box>

          {/* FOOTER */}

          <Box
            sx={{
              borderTop:
                `1px solid ${COLORS.border}`,
              px: 2,
              py: 1,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: COLORS.primary,
                fontSize: 8.5,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              ZENIMONIES
            </Typography>
          </Box>
        </Box>

        {/* ACTION BUTTONS */}

        <Stack
          className="no-print"
          spacing={1}
          sx={{
            mt: 1.5,
          }}
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

          <Button
            fullWidth
            variant="outlined"
            startIcon={
              <ShareRounded />
            }
            onClick={handleSharePDF}
            disabled={pdfLoading}
            sx={{
              minHeight: 46,
              borderColor: COLORS.primary,
              color: COLORS.primary,
              borderRadius: 2,
              fontWeight: 800,
              textTransform: 'none',
            }}
          >
            Share PDF
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate('/transactions')
            }
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

      {/* PRINT */}

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

/*
 * ============================================================
 * RECEIPT ROW
 * ============================================================
 */

interface ReceiptRowProps {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}

const ReceiptRow: React.FC<
  ReceiptRowProps
> = ({
  label,
  value,
  valueColor,
  last = false,
}) => {
  return (
    <Box
      sx={{
        py: 0.95,
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
            color: COLORS.muted,
            fontSize: 10.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            color:
              valueColor ||
              COLORS.text,
            fontSize: 10.8,
            fontWeight: 750,
            textAlign: 'right',
            maxWidth: '65%',
            wordBreak: 'break-word',
          }}
        >
          {value}
        </Typography>
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
        py: 0.95,
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
            color: COLORS.muted,
            fontSize: 10.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            maxWidth: '65%',
            textAlign: 'right',
          }}
        >
          <Typography
            sx={{
              color: COLORS.text,
              fontSize: 9.5,
              fontWeight: 750,
              lineHeight: 1.3,
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
};

export default TransactionReceipt;
