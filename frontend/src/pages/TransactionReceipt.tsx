import React, {
  useEffect,
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
  RefreshRounded,
  DescriptionRounded,
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

  const receiptRef =
    useRef<HTMLDivElement>(null);

  const requeryTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const requeryAttemptsRef =
    useRef(0);

  const [pdfLoading, setPdfLoading] =
    useState(false);

  const [requerying, setRequerying] =
    useState(false);

  const [liveStatus, setLiveStatus] =
    useState<string>('');

  const [certificateUrl, setCertificateUrl] =
    useState<string>('');

  const [requeryMessage, setRequeryMessage] =
    useState<string>('');

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;

  // ============================================================
  // GET REGISTERED NAME OF LOGGED-IN USER
  // ============================================================

  const getLoggedInUserName = (): string => {
    try {
      const storedUser = localStorage.getItem(
        'zenimonies_user'
      );

      if (!storedUser) {
        return '';
      }

      const user = JSON.parse(storedUser);

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

  /*
   * ============================================================
   * RECEIPT UNAVAILABLE
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
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate('/transactions')
            }
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
    Number(transaction.total_debit ?? 0);

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
   * DATE / TIME
   * ============================================================
   */

  const transactionDate =
    transaction.created_at ||
    transaction.date ||
    transaction.timestamp;

  const getDateObject = (
    value?: string
  ) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed;
  };

  const parsedDate =
    getDateObject(transactionDate);

  const formatDate = () => {
    if (!parsedDate) {
      return transactionDate || '';
    }

    return parsedDate.toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    );
  };

  const formatTime = () => {
    if (!parsedDate) {
      return '';
    }

    return parsedDate.toLocaleTimeString(
      'en-NG',
      {
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

  /*
   * ============================================================
   * INSURANCE DETECTION
   * ============================================================
   */

  const isInsurance =
    rawType.includes('insurance') ||
    String(
      transaction.category || ''
    )
      .toLowerCase()
      .includes('insurance') ||
    rawDescription.includes('insurance') ||
    reference
      .toUpperCase()
      .startsWith('ZINS-');

  /*
   * ============================================================
   * INITIAL STATUS
   * ============================================================
   */

  const rawTransactionStatus =
    String(
      transaction.status || ''
    )
      .trim()
      .toLowerCase();

  /*
   * ============================================================
   * INSURANCE REQUERY
   * ============================================================
   *
   * The backend accepts the visible ZENIMONIES reference:
   *
   * ZINS-XXXXXXXX
   *
   * We do NOT need the VTpass request ID in the frontend.
   */

  const clearRequeryTimer = () => {
    if (requeryTimerRef.current) {
      clearInterval(
        requeryTimerRef.current
      );

      requeryTimerRef.current = null;
    }
  };

  const checkInsuranceStatus =
    async (
      manual = false
    ): Promise<{
      status: string;
      certificateUrl?: string;
    } | null> => {
      if (
        !isInsurance ||
        !reference
      ) {
        return null;
      }

      if (manual) {
        setRequerying(true);
      }

      try {
        const token =
          localStorage.getItem(
            'zenimonies_token'
          );

        const response =
          await fetch(
            `${API_URL}/insurance/requery`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',

                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },

              body: JSON.stringify({
                reference,
              }),
            }
          );

        let result: any = null;

        try {
          result =
            await response.json();
        } catch {
          result = null;
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error ||
              'Unable to check insurance status.'
          );
        }

        const providerStatus =
          String(
            result?.status ||
              result?.data?.status ||
              ''
          )
            .trim()
            .toLowerCase();

        const certificate =
          result?.certificate_url ||
          result?.certificateUrl ||
          result?.data?.certificate_url ||
          result?.data?.certificateUrl ||
          '';

        if (certificate) {
          setCertificateUrl(
            String(certificate)
          );
        }

        if (providerStatus) {
          setLiveStatus(
            providerStatus
          );
        }

        if (
          providerStatus ===
            'completed' ||
          providerStatus ===
            'successful' ||
          providerStatus ===
            'success'
        ) {
          setLiveStatus(
            'completed'
          );

          setRequeryMessage(
            'Insurance payment confirmed successfully.'
          );

          clearRequeryTimer();

          return {
            status: 'completed',
            certificateUrl:
              certificate
                ? String(certificate)
                : undefined,
          };
        }

        if (
          providerStatus ===
            'failed' ||
          providerStatus ===
            'failure' ||
          providerStatus ===
            'reversed' ||
          providerStatus ===
            'cancelled' ||
          providerStatus ===
            'canceled'
        ) {
          setLiveStatus(
            'failed'
          );

          setRequeryMessage(
            'The insurance payment was not completed. Your account will be handled according to the transaction reversal process.'
          );

          clearRequeryTimer();

          return {
            status: 'failed',
          };
        }

        if (
          providerStatus ===
            'pending' ||
          providerStatus ===
            'processing' ||
          !providerStatus
        ) {
          setLiveStatus(
            'pending'
          );

          if (manual) {
            setRequeryMessage(
              'The insurance provider has not confirmed the transaction yet. Please check again shortly.'
            );
          }

          return {
            status: 'pending',
          };
        }

        return {
          status:
            providerStatus,
        };
      } catch (error) {
        console.error(
          'ZENIMONIES insurance requery error:',
          error
        );

        if (manual) {
          setRequeryMessage(
            error instanceof Error
              ? error.message
              : 'Unable to check the insurance status right now.'
          );
        }

        return null;
      } finally {
        if (manual) {
          setRequerying(false);
        }
      }
    };

  /*
   * ============================================================
   * AUTOMATIC INSURANCE STATUS CHECK
   * ============================================================
   *
   * Only pending insurance transactions are checked.
   *
   * Maximum:
   * 6 automatic checks
   *
   * Interval:
   * 5 seconds
   *
   * This prevents endless requests.
   */

  useEffect(() => {
    if (!isInsurance) {
      return;
    }

    const status =
      liveStatus ||
      rawTransactionStatus;

    const pending =
      status === '' ||
      status === 'pending' ||
      status === 'processing' ||
      status === 'initiated';

    if (
      !pending ||
      !reference
    ) {
      return;
    }

    requeryAttemptsRef.current = 0;

    /*
     * First check immediately.
     */
    checkInsuranceStatus(false);

    /*
     * Then check every 5 seconds.
     */
    requeryTimerRef.current =
      setInterval(async () => {
        requeryAttemptsRef.current += 1;

        if (
          requeryAttemptsRef.current >
          6
        ) {
          clearRequeryTimer();
          return;
        }

        const result =
          await checkInsuranceStatus(
            false
          );

        if (
          result?.status ===
            'completed' ||
          result?.status ===
            'failed'
        ) {
          clearRequeryTimer();
        }
      }, 5000);

    return () => {
      clearRequeryTimer();
    };

    // We intentionally only initialise
    // this watcher once for the receipt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ============================================================
   * LIVE STATUS
   * ============================================================
   */

  const effectiveStatus =
    (
      isInsurance &&
      liveStatus
    )
      ? liveStatus
      : rawTransactionStatus;

  const isSuccessful = [
    'successful',
    'completed',
    'success',
    'delivered',
  ].includes(
    effectiveStatus
  );

  const isFailed = [
    'failed',
    'failure',
    'reversed',
    'cancelled',
    'canceled',
  ].includes(
    effectiveStatus
  );

  const isPending =
    !isSuccessful &&
    !isFailed;

  const shortStatus =
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
   * INCOMING TRANSFER
   * ============================================================
   */

  const isIncoming =
    rawType.includes(
      'internal_transfer_received'
    ) ||
    rawType.includes(
      'transfer_received'
    ) ||
    rawType.includes(
      'incoming'
    ) ||
    rawType.includes(
      'received'
    ) ||
    transaction.category === 'credit' ||
    transaction.category === 'incoming' ||
    rawDescription.includes(
      'money received'
    ) ||
    rawDescription.includes(
      'transfer received'
    ) ||
    rawDescription.includes(
      'received'
    );

  /*
   * ============================================================
   * SENDER NAME
   * ============================================================
   */

  const transactionSenderName =
    transaction.sender_name ||
    transaction.transfer_sender_name ||
    transaction.sender_full_name ||
    transaction.sender ||
    '';

  const loggedInUserName =
    getLoggedInUserName();

  const senderName =
    transactionSenderName ||
    (
      isIncoming
        ? ''
        : loggedInUserName
    );

  /*
   * ============================================================
   * BENEFICIARY
   * ============================================================
   */

  const beneficiaryName =
    transaction.recipient_name ||
    transaction.receiver_name ||
    '';

  /*
   * ============================================================
   * TOTAL DEBIT SHOWN ON TRANSFER RECEIPT
   * ============================================================
   */

  let totalDebited =
    Math.abs(numericAmount);

  if (
    isTransfer &&
    !isIncoming
  ) {
    totalDebited =
      Math.abs(
        numericAmount +
          numericFee
      );
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

  /*
   * ============================================================
   * DOWNLOAD
   *
   * ONLY THE SENDER CAN DOWNLOAD.
   * ============================================================
   */

  const handleDownloadPDF =
    async () => {
      if (isIncoming) {
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

  /*
   * ============================================================
   * SHARE
   *
   * BOTH SENDER AND RECEIVER CAN SHARE.
   * ============================================================
   */

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
          if (
            navigator.share
          ) {
            await navigator.share({
              title:
                'ZENIMONIES Transaction Receipt',
              text:
                reference
                  ? `ZENIMONIES transaction receipt: ${reference}`
                  : 'ZENIMONIES transaction receipt',
            });
          } else {
            alert(
              'Sharing is not available on this device.'
            );
          }
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

        {/* ======================================================
            RECEIPT DOCUMENT
        ====================================================== */}

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

          {/* ====================================================
              ZENIMONIES LOGO AREA
          ==================================================== */}

          <Box
            sx={{
              textAlign: 'center',
              px: 2,
              pt: 2.5,
              pb: 1.8,
            }}
          >
            <Typography
              sx={{
                color: COLORS.primary,
                fontSize: 23,
                fontWeight: 900,
                letterSpacing: 2,
                lineHeight: 1,
              }}
            >
              ZENIMONIES
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: COLORS.text,
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              Transaction Receipt
            </Typography>
          </Box>

          {/* ====================================================
              INSURANCE STATUS PANEL
          ==================================================== */}

          {isInsurance && (
            <Box
              className="no-print"
              sx={{
                mx: 2,
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor:
                  isSuccessful
                    ? 'rgba(8,127,91,0.08)'
                    : isFailed
                      ? 'rgba(198,40,40,0.07)'
                      : 'rgba(167,101,0,0.08)',
                border:
                  `1px solid ${
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
                  startIcon={
                    <RefreshRounded
                      sx={{
                        animation:
                          requerying
                            ? 'spin 1s linear infinite'
                            : 'none',
                        '@keyframes spin': {
                          from: {
                            transform:
                              'rotate(0deg)',
                          },
                          to: {
                            transform:
                              'rotate(360deg)',
                          },
                        },
                      }}
                    />
                  }
                  onClick={() =>
                    checkInsuranceStatus(
                      true
                    )
                  }
                  disabled={
                    requerying
                  }
                  sx={{
                    mt: 1.2,
                    minHeight: 42,
                    bgcolor:
                      COLORS.primary,
                    borderRadius: 1.8,
                    fontWeight: 800,
                    textTransform:
                      'none',
                    fontSize: 12,
                    '&:hover': {
                      bgcolor:
                        COLORS.dark,
                    },
                  }}
                >
                  {requerying
                    ? 'Checking Status...'
                    : 'Check Status Now'}
                </Button>
              )}

              {isSuccessful &&
                certificateUrl && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={
                      <DescriptionRounded />
                    }
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
                      bgcolor:
                        COLORS.primary,
                      borderRadius: 1.8,
                      fontWeight: 800,
                      textTransform:
                        'none',
                      fontSize: 12,
                      '&:hover': {
                        bgcolor:
                          COLORS.dark,
                      },
                    }}
                  >
                    View Insurance Certificate
                  </Button>
                )}
            </Box>
          )}

          {/* ====================================================
              RECEIVER RECEIPT
          ==================================================== */}

          {isTransfer &&
            isIncoming && (
              <>
                {senderName && (
                  <ReceiptRow
                    label="Sender"
                    value={senderName}
                  />
                )}

                {transactionDate && (
                  <ReceiptRow
                    label="Date"
                    value={formatDate()}
                  />
                )}

                {formatTime() && (
                  <ReceiptRow
                    label="Time"
                    value={formatTime()}
                  />
                )}

                {reference && (
                  <ReferenceRow
                    label="Reference"
                    value={reference}
                    onCopy={
                      copyReference
                    }
                  />
                )}

                <ReceiptRow
                  label="Amount"
                  value={`+${formatMoney(
                    numericAmount
                  )}`}
                />

                <ReceiptRow
                  label="Status"
                  value={shortStatus}
                  valueColor={
                    statusColor
                  }
                />

                <ReceiptRow
                  label="Type"
                  value="Credit"
                  last={
                    !Boolean(
                      transaction.description &&
                      transaction.description.trim()
                    )
                  }
                />

                {transaction.description &&
                  transaction.description.trim() &&
                  transaction.description.trim() !==
                    'Money received from Zenimonies user' &&
                  !transaction.description
                    .trim()
                    .startsWith(
                      'You received ₦'
                    ) && (
                    <ReceiptRow
                      label="Narration"
                      value={
                        transaction.description.trim()
                      }
                      last
                    />
                  )}
              </>
            )}

          {/* ====================================================
              SENDER RECEIPT
          ==================================================== */}

          {isTransfer &&
            !isIncoming && (
              <>
                <ReceiptRow
                  label="Transaction Amount"
                  value={formatMoney(
                    numericAmount
                  )}
                />

                <ReceiptRow
                  label="Transaction Type"
                  value="TRANSFER"
                />

                {transactionDate && (
                  <ReceiptRow
                    label="Transaction Date"
                    value={`${formatDate()} ${formatTime()}`}
                  />
                )}

                {senderName && (
                  <ReceiptRow
                    label="Sender"
                    value={senderName}
                  />
                )}

                {beneficiaryName && (
                  <ReceiptRow
                    label="Beneficiary"
                    value={
                      beneficiaryName
                    }
                  />
                )}

                <ReceiptRow
                  label="Receiver Bank"
                  value="ZENIMONIES"
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

                {reference && (
                  <ReferenceRow
                    label="Transaction Reference"
                    value={reference}
                    onCopy={
                      copyReference
                    }
                  />
                )}

                <ReceiptRow
                  label="Transaction Status"
                  value={
                    isSuccessful
                      ? 'Transaction Successful'
                      : isFailed
                        ? 'Transaction Failed'
                        : 'Transaction Pending'
                  }
                  valueColor={
                    statusColor
                  }
                  last
                />
              </>
            )}

          {/* ====================================================
              NON-TRANSFER TRANSACTIONS
          ==================================================== */}

          {!isTransfer && (
            <>
              <ReceiptRow
                label="Transaction Amount"
                value={formatMoney(
                  numericAmount
                )}
              />

              <ReceiptRow
                label="Transaction Type"
                value={
                  String(
                    transaction.transaction_type ||
                      transaction.type ||
                      'TRANSACTION'
                  ).toUpperCase()
                }
              />

              {transactionDate && (
                <ReceiptRow
                  label="Transaction Date"
                  value={`${formatDate()} ${formatTime()}`}
                />
              )}

              {transaction.description &&
                transaction.description.trim() && (
                  <ReceiptRow
                    label="Narration"
                    value={
                      transaction.description.trim()
                    }
                  />
                )}

              {reference && (
                <ReferenceRow
                  label="Transaction Reference"
                  value={reference}
                  onCopy={
                    copyReference
                  }
                />
              )}

              <ReceiptRow
                label="Transaction Status"
                value={
                  isSuccessful
                    ? 'Transaction Successful'
                    : isFailed
                      ? 'Transaction Failed'
                      : 'Transaction Pending'
                }
                valueColor={
                  statusColor
                }
                last
              />
            </>
          )}

          {/* ====================================================
              FOOTER
          ==================================================== */}

          <Box
            sx={{
              borderTop:
                `1px solid ${COLORS.border}`,
              px: 2,
              py: 1.5,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color:
                  COLORS.primary,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              ZENIMONIES
            </Typography>
          </Box>
        </Box>

        {/* ======================================================
            ACTIONS
        ====================================================== */}

        <Stack
          className="no-print"
          spacing={1}
          sx={{
            mt: 1.5,
          }}
        >

          {/* ----------------------------------------------------
              SENDER ONLY — DOWNLOAD
          ---------------------------------------------------- */}

          {!isIncoming && (
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
                bgcolor:
                  COLORS.primary,
                borderRadius: 2,
                fontWeight: 800,
                textTransform:
                  'none',
                '&:hover': {
                  bgcolor:
                    COLORS.dark,
                },
              }}
            >
              {pdfLoading
                ? 'Preparing...'
                : 'Download PDF'}
            </Button>
          )}

          {/* ----------------------------------------------------
              BOTH — SHARE
          ---------------------------------------------------- */}

          <Button
            fullWidth
            variant={
              isIncoming
                ? 'contained'
                : 'outlined'
            }
            startIcon={
              <ShareRounded />
            }
            onClick={
              handleSharePDF
            }
            disabled={pdfLoading}
            sx={{
              minHeight: 46,
              bgcolor:
                isIncoming
                  ? COLORS.primary
                  : 'transparent',
              borderColor:
                COLORS.primary,
              color:
                isIncoming
                  ? COLORS.white
                  : COLORS.primary,
              borderRadius: 2,
              fontWeight: 800,
              textTransform:
                'none',
              '&:hover': {
                bgcolor:
                  isIncoming
                    ? COLORS.dark
                    : 'rgba(8,127,91,0.06)',
              },
            }}
          >
            {pdfLoading
              ? 'Preparing...'
              : 'Share Receipt'}
          </Button>

          {/* ----------------------------------------------------
              BOTH — BACK
          ---------------------------------------------------- */}

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
            disabled={pdfLoading}
            sx={{
              minHeight: 44,
              borderColor:
                COLORS.border,
              color:
                COLORS.text,
              borderRadius: 2,
              fontWeight: 700,
              textTransform:
                'none',
            }}
          >
            Back to Transactions
          </Button>
        </Stack>
      </Box>

      {/* ========================================================
          PRINT
      ======================================================== */}

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
        mx: 2,
        py: 1.05,
        borderTop:
          `1px solid ${COLORS.border}`,
        borderBottom:
          last
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
            color:
              COLORS.primary,
            fontSize: 10.5,
            fontWeight: 800,
            flex: '0 0 43%',
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
            textAlign: 'left',
            flex: '1 1 auto',
            wordBreak:
              'break-word',
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
        mx: 2,
        py: 1.05,
        borderTop:
          `1px solid ${COLORS.border}`,
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
            color:
              COLORS.primary,
            fontSize: 10.5,
            fontWeight: 800,
            flex: '0 0 43%',
          }}
        >
          {label}
        </Typography>

        <Box
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              color:
                COLORS.text,
              fontSize: 9.5,
              fontWeight: 750,
              lineHeight: 1.35,
              wordBreak:
                'break-all',
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
              color:
                COLORS.primary,
              fontSize: 8.5,
              fontWeight: 800,
              textTransform:
                'none',
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
