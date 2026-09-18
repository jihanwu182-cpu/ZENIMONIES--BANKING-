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
  AccountBalanceRounded,
  ArrowBackRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  ContentCopyRounded,
  DownloadRounded,
  ErrorRounded,
  PhoneRounded,
  ReceiptLongRounded,
  ScheduleRounded,
  ShareRounded,
  TagRounded,
  PersonRounded,
  LayersRounded,
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import {
  QRCodeSVG,
} from 'qrcode.react';


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

  recipient_name?: string;
  recipient_phone?: string;
  phone?: string;

  recipient_bank?: string;
  bank_name?: string;

  recipient_account?: string;
  account_number?: string;

  sender_name?: string;
  sender_phone?: string;
  sender_account?: string;

  network?: string;
  provider?: string;

  data_plan?: string;
  plan_name?: string;
  variation_name?: string;

  customer_number?: string;
  meter_number?: string;
  smartcard_number?: string;
  decoder_number?: string;

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


/*
 * ============================================================
 * STORED USER / ACCOUNT TYPES
 * ============================================================
 */

interface StoredUser {
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface StoredAccount {
  account_number?: string;
  accountNumber?: string;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

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


  /*
   * ============================================================
   * REAL TRANSACTION
   * ============================================================
   */

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
          bgcolor: '#f4faf7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 3,
            borderRadius: 3,
            textAlign: 'center',
            border:
              '1px solid #dcebe4',
            boxShadow:
              '0 12px 35px rgba(7, 94, 66, 0.08)',
          }}
        >
          <ReceiptLongRounded
            sx={{
              fontSize: 50,
              color: '#087f5b',
              mb: 1.5,
            }}
          />

          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 850,
              color: '#063b2b',
              mb: 0.8,
            }}
          >
            Receipt unavailable
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 14,
              mb: 2.5,
            }}
          >
            We could not find the transaction
            details for this receipt.
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
              py: 1.15,
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


  /*
   * ============================================================
   * BASIC VALUES
   * ============================================================
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
    (
      transaction.currency ||
      'NGN'
    ).toUpperCase();


  /*
   * ============================================================
   * REAL TOTAL DEBIT
   * ============================================================
   *
   * For transfers:
   *
   * Amount transferred + fee = amount actually debited.
   *
   * We prefer the backend's total_debit.
   */

  let totalAmountDebited =
    Math.abs(
      numericAmount
    );


  if (
    Number.isFinite(
      numericTotalDebit
    ) &&
    numericTotalDebit > 0
  ) {
    totalAmountDebited =
      Math.abs(
        numericTotalDebit
      );
  } else if (
    numericFee > 0
  ) {
    totalAmountDebited =
      Math.abs(
        numericAmount +
          numericFee
      );
  }


  /*
   * ============================================================
   * MONEY FORMAT
   * ============================================================
   */

  const formatMoney = (
    value: number
  ) => {
    const safeValue =
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
      ).format(
        safeValue
      );
    } catch {
      return `₦${safeValue.toFixed(2)}`;
    }
  };


  /*
   * ============================================================
   * REAL REFERENCE
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
      return 'Date not available';
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
   * TYPE
   * ============================================================
   */

  const rawType =
    (
      transaction.transaction_type ||
      transaction.type ||
      transaction.category ||
      ''
    ).toLowerCase();


  const rawDescription =
    (
      transaction.description ||
      ''
    ).toLowerCase();


  const isAirtime =
    rawType.includes('airtime') ||
    rawDescription.includes('airtime');


  const isData =
    rawType.includes('data') ||
    rawDescription.includes('data');


  const isTransfer =
    rawType.includes('transfer') ||
    rawDescription.includes('transfer');


  const isDeposit =
    rawType.includes('deposit') ||
    rawType.includes('fund') ||
    rawType.includes('credit') ||
    rawDescription.includes('deposit') ||
    rawDescription.includes('funding');


  const isElectricity =
    rawType.includes('electricity') ||
    rawDescription.includes('electricity');


  const isTV =
    rawType.includes('tv') ||
    rawDescription.includes('television') ||
    rawDescription.includes('cable') ||
    rawDescription.includes('dstv') ||
    rawDescription.includes('gotv') ||
    rawDescription.includes('startimes');


  const isBill =
    rawType.includes('bill') ||
    isElectricity ||
    isTV ||
    rawDescription.includes('betting');


  /*
   * ============================================================
   * INCOMING
   * ============================================================
   */

  const isIncoming =
    isDeposit ||
    transaction.category === 'credit' ||
    transaction.category === 'incoming' ||
    rawType.includes('received') ||
    rawDescription.includes('received') ||
    rawDescription.includes('money received');


  /*
   * ============================================================
   * RECEIPT TITLE
   * ============================================================
   */

  let receiptTitle =
    'Transaction Receipt';


  if (isAirtime) {
    receiptTitle =
      'Airtime Purchase Receipt';
  } else if (isData) {
    receiptTitle =
      'Data Purchase Receipt';
  } else if (isTransfer) {
    receiptTitle =
      'Transfer Receipt';
  } else if (isElectricity) {
    receiptTitle =
      'Electricity Payment Receipt';
  } else if (isTV) {
    receiptTitle =
      'TV Subscription Receipt';
  } else if (isDeposit) {
    receiptTitle =
      'Funding Receipt';
  } else if (isBill) {
    receiptTitle =
      'Bill Payment Receipt';
  }


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


  const isSuccessful =
    rawStatus === 'successful' ||
    rawStatus === 'completed' ||
    rawStatus === 'success' ||
    rawStatus === 'delivered';


  const isFailed =
    rawStatus === 'failed' ||
    rawStatus === 'failure' ||
    rawStatus === 'reversed' ||
    rawStatus === 'cancelled' ||
    rawStatus === 'canceled';


  const isPending =
    rawStatus === 'pending' ||
    rawStatus === 'processing' ||
    rawStatus === 'initiated' ||
    rawStatus === 'queued';


  let statusText =
    'Unconfirmed';


  if (isSuccessful) {
    statusText =
      'Successful';
  } else if (isFailed) {
    statusText =
      'Failed';
  } else if (isPending) {
    statusText =
      'Pending';
  }


  /*
   * ============================================================
   * STATUS MESSAGE
   * ============================================================
   */

  let statusMessage =
    'The current transaction status is shown below.';


  if (isSuccessful) {

    if (isAirtime) {
      statusMessage =
        'Your airtime purchase has been completed successfully.';
    } else if (isData) {
      statusMessage =
        'Your data purchase has been completed successfully.';
    } else if (isTransfer) {
      statusMessage =
        'Your transfer has been completed successfully.';
    } else if (isDeposit) {
      statusMessage =
        'Your account funding has been completed successfully.';
    } else {
      statusMessage =
        'Your transaction has been completed successfully.';
    }

  } else if (isPending) {

    statusMessage =
      'Your transaction is still being processed.';

  } else if (isFailed) {

    statusMessage =
      'Your transaction could not be completed.';

  } else {

    statusMessage =
      'The current transaction status could not be confirmed.';
  }


  /*
   * ============================================================
   * STATUS COLORS
   * ============================================================
   */

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


  const statusIcon =
    isSuccessful ? (
      <CheckCircleRounded
        sx={{
          fontSize: 32,
          color: '#087f5b',
        }}
      />
    ) : isFailed ? (
      <ErrorRounded
        sx={{
          fontSize: 32,
          color: '#c62828',
        }}
      />
    ) : (
      <ScheduleRounded
        sx={{
          fontSize: 32,
          color: '#a76500',
        }}
      />
    );


  /*
   * ============================================================
   * STORED CUSTOMER DATA
   * ============================================================
   *
   * These are only used as a fallback when the transaction
   * object itself does not contain sender details.
   */

  let storedUser:
    StoredUser = {};

  let storedAccount:
    StoredAccount = {};


  try {

    const userRaw =
      localStorage.getItem(
        'zenimonies_user'
      );

    if (userRaw) {
      storedUser =
        JSON.parse(
          userRaw
        ) as StoredUser;
    }


    const accountsRaw =
      localStorage.getItem(
        'zenimonies_accounts'
      );


    if (accountsRaw) {

      const parsedAccounts =
        JSON.parse(
          accountsRaw
        );


      if (
        Array.isArray(
          parsedAccounts
        ) &&
        parsedAccounts.length > 0
      ) {
        storedAccount =
          parsedAccounts.find(
            (
              account: StoredAccount
            ) =>
              Boolean(
                account.account_number ||
                account.accountNumber
              )
          ) ||
          parsedAccounts[0];
      }
    }

  } catch {
    /*
     * Do not break the receipt if local storage
     * contains malformed data.
     */
  }


  /*
   * ============================================================
   * SENDER DETAILS
   * ============================================================
   */

  const senderName =
    transaction.sender_name ||
    storedUser.full_name ||
    storedUser.name ||
    '';


  const senderPhone =
    transaction.sender_phone ||
    storedUser.phone ||
    '';


  const senderAccount =
    transaction.sender_account ||
    storedAccount.account_number ||
    storedAccount.accountNumber ||
    '';


  /*
   * ============================================================
   * RECEIVER DETAILS
   * ============================================================
   */

  const recipientName =
    transaction.recipient_name ||
    '';


  const recipientPhone =
    transaction.recipient_phone ||
    transaction.phone ||
    '';


  const recipientBank =
    transaction.recipient_bank ||
    transaction.bank_name ||
    '';


  const recipientAccount =
    transaction.recipient_account ||
    transaction.account_number ||
    '';


  /*
   * ============================================================
   * PROVIDER DETAILS
   * ============================================================
   */

  const network =
    transaction.network ||
    transaction.provider ||
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


  /*
   * ============================================================
   * COPY REFERENCE
   * ============================================================
   */

  const copyReference =
    async () => {

      if (!reference) {
        alert(
          'Transaction reference is not available.'
        );
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
   * FILE NAME
   * ============================================================
   */

  const getSafeFileName =
    () => {

      const safeReference =
        reference
          ? reference.replace(
              /[^a-zA-Z0-9_-]/g,
              '_'
            )
          : 'transaction';

      return `Zenimonies-${safeReference}.pdf`;
    };


  /*
   * ============================================================
   * QR VALUE
   * ============================================================
   *
   * Only the real transaction reference is encoded.
   *
   * No password.
   * No PIN.
   * No access token.
   * No account balance.
   */

  const qrValue =
    reference
      ? `ZENIMONIES|TRANSACTION|${reference}`
      : 'ZENIMONIES|TRANSACTION|REFERENCE-UNAVAILABLE';


  /*
   * ============================================================
   * CREATE PDF
   * ============================================================
   */

  const createReceiptPDF =
    async () => {

      if (
        !receiptRef.current
      ) {
        throw new Error(
          'Receipt is not available.'
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


      const imageData =
        canvas.toDataURL(
          'image/png',
          1
        );


      const pdfWidth =
        80;


      const pdfHeight =
        (
          canvas.height /
          canvas.width
        ) *
        pdfWidth;


      const doc =
        new jsPDF({
          orientation:
            'portrait',
          unit: 'mm',
          format: [
            pdfWidth,
            pdfHeight,
          ],
          compress: true,
        });


      doc.addImage(
        imageData,
        'PNG',
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        'FAST'
      );


      return doc;
    };


  /*
   * ============================================================
   * DOWNLOAD PDF
   * ============================================================
   */

  const handleDownloadPDF =
    async () => {

      if (pdfLoading) {
        return;
      }


      try {

        setPdfLoading(true);


        const doc =
          await createReceiptPDF();


        doc.save(
          getSafeFileName()
        );

      } catch (error) {

        console.error(
          'Receipt PDF generation failed:',
          error
        );


        alert(
          'Unable to generate the PDF receipt. Please try again.'
        );

      } finally {

        setPdfLoading(false);
      }
    };


  /*
   * ============================================================
   * SHARE PDF
   * ============================================================
   */

  const handleSharePDF =
    async () => {

      if (pdfLoading) {
        return;
      }


      try {

        setPdfLoading(true);


        const doc =
          await createReceiptPDF();


        const pdfBlob =
          doc.output('blob');


        const pdfFile =
          new File(
            [
              pdfBlob,
            ],
            getSafeFileName(),
            {
              type:
                'application/pdf',
            }
          );


        const canShareFiles =
          typeof navigator !==
            'undefined' &&
          typeof navigator.share ===
            'function' &&
          typeof navigator.canShare ===
            'function' &&
          navigator.canShare({
            files: [
              pdfFile,
            ],
          });


        if (
          canShareFiles
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
                pdfFile,
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


        doc.save(
          getSafeFileName()
        );

      } catch (error) {

        console.error(
          'Receipt PDF sharing failed:',
          error
        );


        alert(
          'Unable to create the PDF receipt. Please try again.'
        );

      } finally {

        setPdfLoading(false);
      }
    };


  /*
   * ============================================================
   * DETAIL ROW
   * ============================================================
   */

  const DetailRow = ({
    icon,
    label,
    value,
    valueNode,
  }: {
    icon?: React.ReactNode;
    label: string;
    value?: React.ReactNode;
    valueNode?: React.ReactNode;
  }) => (

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(92px, 40%) 1fr',
        alignItems: 'center',
        minHeight: 36,
        py: 0.35,
        borderBottom:
          '1px solid #e7eeeb',
        '&:last-child': {
          borderBottom:
            'none',
        },
      }}
    >

      <Stack
        direction="row"
        spacing={0.6}
        alignItems="center"
        sx={{
          minWidth: 0,
        }}
      >

        {icon && (
          <Box
            sx={{
              display: 'flex',
              color: '#71817b',
              flexShrink: 0,
              '& svg': {
                fontSize: 16,
              },
            }}
          >
            {icon}
          </Box>
        )}


        <Typography
          sx={{
            color: '#687871',
            fontSize: 11.5,
            fontWeight: 550,
          }}
        >
          {label}
        </Typography>

      </Stack>


      {valueNode || (
        <Typography
          sx={{
            color: '#10221c',
            fontSize: 12,
            fontWeight: 650,
            wordBreak:
              'break-word',
            textAlign: 'right',
          }}
        >
          {value}
        </Typography>
      )}

    </Box>
  );


  /*
   * ============================================================
   * PARTY SECTION
   * ============================================================
   */

  const PartySection = ({
    title,
    name,
    phone,
    account,
    bank,
  }: {
    title: string;
    name?: string;
    phone?: string;
    account?: string;
    bank?: string;
  }) => {

    const hasAny =
      Boolean(
        name ||
        phone ||
        account ||
        bank
      );


    if (!hasAny) {
      return null;
    }


    return (
      <Box
        sx={{
          mt: 0.9,
          mb: 0.7,
          p: 0.9,
          borderRadius: 1.5,
          bgcolor: '#f7faf8',
          border:
            '1px solid #e1ebe6',
        }}
      >

        <Typography
          sx={{
            color: '#075c43',
            fontSize: 11.5,
            fontWeight: 850,
            mb: 0.2,
          }}
        >
          {title}
        </Typography>


        {name && (
          <DetailRow
            icon={
              <PersonRounded />
            }
            label="Name"
            value={name}
          />
        )}


        {phone && (
          <DetailRow
            icon={
              <PhoneRounded />
            }
            label="Phone Number"
            value={phone}
          />
        )}


        {account && (
          <DetailRow
            icon={
              <TagRounded />
            }
            label="Account Number"
            value={account}
          />
        )}


        {bank && (
          <DetailRow
            icon={
              <AccountBalanceRounded />
            }
            label="Bank"
            value={bank}
          />
        )}

      </Box>
    );
  };


  /*
   * ============================================================
   * TRANSACTION DETAILS
   * ============================================================
   */

  const renderTransactionDetails =
    () => {

      /*
       * --------------------------------------------------------
       * ZENIMONIES → ZENIMONIES
       * --------------------------------------------------------
       */

      if (isTransfer) {

        return (
          <>

            <PartySection
              title="Sender Details"
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
            />


            <PartySection
              title="Receiver Details"
              name={
                recipientName
              }
              phone={
                recipientPhone
              }
              account={
                recipientAccount
              }
              bank={
                recipientBank ||
                'Zenimonies'
              }
            />


            <DetailRow
              icon={
                <ArrowUpwardRounded />
              }
              label="Amount Transferred"
              value={
                formatMoney(
                  Math.abs(
                    numericAmount
                  )
                )
              }
            />


            {numericFee > 0 && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Transaction Fee"
                value={
                  formatMoney(
                    Math.abs(
                      numericFee
                    )
                  )
                }
              />
            )}


            <DetailRow
              icon={
                <LayersRounded />
              }
              label="Total Amount Debited"
              value={
                formatMoney(
                  totalAmountDebited
                )
              }
            />


            {reference && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Reference"
                valueNode={
                  <ReferenceValue
                    reference={
                      reference
                    }
                    onCopy={
                      copyReference
                    }
                  />
                }
              />
            )}


            <DetailRow
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


            <DetailRow
              icon={
                <CheckCircleRounded />
              }
              label="Status"
              valueNode={
                <StatusChip
                  label={
                    statusText
                  }
                  background={
                    statusBackground
                  }
                  color={
                    statusColor
                  }
                />
              }
            />

          </>
        );
      }


      /*
       * --------------------------------------------------------
       * AIRTIME
       * --------------------------------------------------------
       */

      if (isAirtime) {

        return (
          <>

            {network && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Provider"
                value={
                  network
                }
              />
            )}


            {recipientPhone && (
              <DetailRow
                icon={
                  <PhoneRounded />
                }
                label="Phone Number"
                value={
                  recipientPhone
                }
              />
            )}


            <DetailRow
              icon={
                <ArrowUpwardRounded />
              }
              label="Amount"
              value={
                formatMoney(
                  Math.abs(
                    numericAmount
                  )
                )
              }
            />


            {reference && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Reference"
                valueNode={
                  <ReferenceValue
                    reference={
                      reference
                    }
                    onCopy={
                      copyReference
                    }
                  />
                }
              />
            )}


            <DetailRow
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


            <DetailRow
              icon={
                <CheckCircleRounded />
              }
              label="Status"
              valueNode={
                <StatusChip
                  label={
                    statusText
                  }
                  background={
                    statusBackground
                  }
                  color={
                    statusColor
                  }
                />
              }
            />

          </>
        );
      }


      /*
       * --------------------------------------------------------
       * DATA
       * --------------------------------------------------------
       */

      if (isData) {

        return (
          <>

            {network && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Provider"
                value={
                  network
                }
              />
            )}


            {recipientPhone && (
              <DetailRow
                icon={
                  <PhoneRounded />
                }
                label="Phone Number"
                value={
                  recipientPhone
                }
              />
            )}


            {dataPlan && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Data Plan"
                value={
                  dataPlan
                }
              />
            )}


            <DetailRow
              icon={
                <ArrowUpwardRounded />
              }
              label="Amount"
              value={
                formatMoney(
                  Math.abs(
                    numericAmount
                  )
                )
              }
            />


            {reference && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Reference"
                valueNode={
                  <ReferenceValue
                    reference={
                      reference
                    }
                    onCopy={
                      copyReference
                    }
                  />
                }
              />
            )}


            <DetailRow
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


            <DetailRow
              icon={
                <CheckCircleRounded />
              }
              label="Status"
              valueNode={
                <StatusChip
                  label={
                    statusText
                  }
                  background={
                    statusBackground
                  }
                  color={
                    statusColor
                  }
                />
              }
            />

          </>
        );
      }


      /*
       * --------------------------------------------------------
       * ELECTRICITY
       * --------------------------------------------------------
       */

      if (isElectricity) {

        return (
          <>

            {network && (
              <DetailRow
                icon={
                  <AccountBalanceRounded />
                }
                label="Provider"
                value={
                  network
                }
              />
            )}


            {customerNumber && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Meter Number"
                value={
                  customerNumber
                }
              />
            )}


            <DetailRow
              icon={
                <ArrowUpwardRounded />
              }
              label="Amount"
              value={
                formatMoney(
                  Math.abs(
                    numericAmount
                  )
                )
              }
            />


            {reference && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Reference"
                valueNode={
                  <ReferenceValue
                    reference={
                      reference
                    }
                    onCopy={
                      copyReference
                    }
                  />
                }
              />
            )}


            <DetailRow
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


            <DetailRow
              icon={
                <CheckCircleRounded />
              }
              label="Status"
              valueNode={
                <StatusChip
                  label={
                    statusText
                  }
                  background={
                    statusBackground
                  }
                  color={
                    statusColor
                  }
                />
              }
            />

          </>
        );
      }


      /*
       * --------------------------------------------------------
       * TV
       * --------------------------------------------------------
       */

      if (isTV) {

        return (
          <>

            {network && (
              <DetailRow
                icon={
                  <AccountBalanceRounded />
                }
                label="Provider"
                value={
                  network
                }
              />
            )}


            {customerNumber && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Customer Number"
                value={
                  customerNumber
                }
              />
            )}


            {dataPlan && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Package"
                value={
                  dataPlan
                }
              />
            )}


            <DetailRow
              icon={
                <ArrowUpwardRounded />
              }
              label="Amount"
              value={
                formatMoney(
                  Math.abs(
                    numericAmount
                  )
                )
              }
            />


            {reference && (
              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Reference"
                valueNode={
                  <ReferenceValue
                    reference={
                      reference
                    }
                    onCopy={
                      copyReference
                    }
                  />
                }
              />
            )}


            <DetailRow
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


            <DetailRow
              icon={
                <CheckCircleRounded />
              }
              label="Status"
              valueNode={
                <StatusChip
                  label={
                    statusText
                  }
                  background={
                    statusBackground
                  }
                  color={
                    statusColor
                  }
                />
              }
            />

          </>
        );
      }


      /*
       * --------------------------------------------------------
       * OTHER / FUNDING
       * --------------------------------------------------------
       */

      return (
        <>

          {recipientName && (
            <DetailRow
              icon={
                <PersonRounded />
              }
              label="Customer"
              value={
                recipientName
              }
            />
          )}


          {customerNumber && (
            <DetailRow
              icon={
                <TagRounded />
              }
              label="Customer Number"
              value={
                customerNumber
              }
            />
          )}


          {network && (
            <DetailRow
              icon={
                <AccountBalanceRounded />
              }
              label="Provider"
              value={
                network
              }
            />
          )}


          <DetailRow
            icon={
              isIncoming
                ? (
                  <ArrowDownwardRounded />
                )
                : (
                  <ArrowUpwardRounded />
                )
            }
            label="Amount"
            value={
              formatMoney(
                Math.abs(
                  numericAmount
                )
              )
            }
          />


          {reference && (
            <DetailRow
              icon={
                <TagRounded />
              }
              label="Reference"
              valueNode={
                <ReferenceValue
                  reference={
                    reference
                  }
                  onCopy={
                    copyReference
                  }
                />
              }
            />
          )}


          <DetailRow
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


          <DetailRow
            icon={
              <CheckCircleRounded />
            }
            label="Status"
            valueNode={
              <StatusChip
                label={
                  statusText
                }
                background={
                  statusBackground
                }
                color={
                  statusColor
                }
              />
            }
          />

        </>
      );
    };


  /*
   * ============================================================
   * RECEIPT UI
   * ============================================================
   */

  return (
    <>
      <Box
        className="receipt-page"
        sx={{
          minHeight: '100vh',
          bgcolor: '#f3faf7',
          py: {
            xs: 1,
            sm: 2.5,
          },
          px: 0.75,
        }}
      >

        <Box
          className="receipt-container"
          sx={{
            width: '100%',
            maxWidth: 390,
            mx: 'auto',
          }}
        >

          <Card
            ref={receiptRef}
            className="receipt-card"
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: 2.5,
              border:
                '1px solid #dcebe4',
              boxShadow:
                '0 10px 30px rgba(7, 94, 66, 0.08)',
              bgcolor: '#ffffff',
            }}
          >

            {/* =================================================
                APPROVED ZENIMONIES HEADER
            ================================================== */}

            <Box
              className="receipt-header"
              sx={{
                bgcolor: '#087f5b',
                color: '#ffffff',
                mx: 1,
                mt: 1,
                borderRadius: 2,
                px: 1.5,
                py: 1.25,
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
                  spacing={0.8}
                  sx={{
                    minWidth: 0,
                  }}
                >

                  {/* Zenimonies Z mark */}

                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      border:
                        '2px solid rgba(255,255,255,0.95)',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 23,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    Z
                  </Box>


                  <Box
                    sx={{
                      minWidth: 0,
                    }}
                  >

                    <Box
                      sx={{
                        position:
                          'relative',
                        display:
                          'inline-block',
                      }}
                    >

                      <Typography
                        sx={{
                          fontSize: 19,
                          fontWeight: 900,
                          letterSpacing: 0.3,
                          lineHeight: 1,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        ZENIMONIES
                      </Typography>


                      {/* Leaf / flower accent above i */}

                      <Box
                        sx={{
                          position:
                            'absolute',
                          left:
                            '55.5%',
                          top:
                            -12,
                          transform:
                            'translateX(-50%)',
                          fontSize:
                            13,
                          lineHeight:
                            1,
                        }}
                      >
                        ❧
                      </Box>

                    </Box>


                    <Typography
                      sx={{
                        mt: 0.35,
                        fontSize: 6,
                        letterSpacing: 1.7,
                        fontWeight: 650,
                        opacity: 0.88,
                      }}
                    >
                      DIGITAL BANKING
                    </Typography>

                  </Box>

                </Stack>


                <Box
                  sx={{
                    borderLeft:
                      '1px solid rgba(255,255,255,0.7)',
                    pl: 1,
                    flexShrink: 0,
                  }}
                >

                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      textAlign: 'right',
                      lineHeight: 1.2,
                      maxWidth: 105,
                    }}
                  >
                    {receiptTitle}
                  </Typography>

                </Box>

              </Stack>

            </Box>


            {/* =================================================
                STATUS + TOTAL DEBIT
            ================================================== */}

            <Box
              sx={{
                px: 1.8,
                pt: 1.45,
                pb: 1.25,
                textAlign: 'center',
              }}
            >

              <Box
                sx={{
                  width: 43,
                  height: 43,
                  mx: 'auto',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor:
                    statusBackground,
                }}
              >
                {statusIcon}
              </Box>


              <Typography
                sx={{
                  mt: 0.75,
                  color: '#063b2b',
                  fontSize: 18,
                  fontWeight: 850,
                  lineHeight: 1.15,
                }}
              >
                {isSuccessful
                  ? 'Transaction Successful'
                  : isFailed
                    ? 'Transaction Failed'
                    : isPending
                      ? 'Transaction Pending'
                      : 'Transaction Status Unconfirmed'}
              </Typography>


              <Typography
                sx={{
                  mt: 0.3,
                  color: '#718079',
                  fontSize: 10.5,
                  lineHeight: 1.35,
                }}
              >
                {statusMessage}
              </Typography>


              {/* TOTAL ACTUALLY DEBITED */}

              <Typography
                sx={{
                  mt: 0.75,
                  color:
                    isIncoming
                      ? '#087f5b'
                      : '#063b2b',
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: -0.7,
                  lineHeight: 1,
                }}
              >
                {isIncoming
                  ? `+${formatMoney(
                      Math.abs(
                        numericAmount
                      )
                    )}`
                  : `−${formatMoney(
                      totalAmountDebited
                    )}`}
              </Typography>


              <Typography
                sx={{
                  mt: 0.4,
                  color: '#6c7b75',
                  fontSize: 9.5,
                  fontWeight: 700,
                }}
              >
                {isTransfer &&
                !isIncoming
                  ? 'Total Amount Debited'
                  : 'Amount'}
              </Typography>

            </Box>


            <Divider
              sx={{
                mx: 1.8,
                borderColor:
                  '#dce6e1',
              }}
            />


            {/* =================================================
                DETAILS
            ================================================== */}

            <Box
              sx={{
                px: 1.8,
                py: 1.05,
              }}
            >

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  bgcolor: '#eaf8f2',
                  borderRadius: 1.5,
                  px: 1,
                  py: 0.6,
                  mb: 0.55,
                }}
              >

                <Box
                  sx={{
                    width: 25,
                    height: 25,
                    borderRadius: 1,
                    bgcolor: '#087f5b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ReceiptLongRounded
                    sx={{
                      fontSize: 15,
                    }}
                  />
                </Box>


                <Typography
                  sx={{
                    color: '#075c43',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {isTransfer
                    ? 'Transfer Details'
                    : 'Payment Details'}
                </Typography>

              </Box>


              <DetailRow
                icon={
                  <TagRounded />
                }
                label="Transaction Type"
                value={
                  isTransfer
                    ? 'Transfer (Zenimonies to Zenimonies)'
                    : receiptTitle.replace(
                        ' Receipt',
                        ''
                      )
                }
              />


              {renderTransactionDetails()}

            </Box>


            {/* =================================================
                QR CODE
            ================================================== */}

            <Box
              sx={{
                textAlign: 'center',
                px: 1.8,
                pb: 1.25,
                pt: 0.05,
              }}
            >

              <Box
                sx={{
                  display: 'inline-flex',
                  p: 0.8,
                  bgcolor: '#ffffff',
                  border:
                    '1px solid #dce8e2',
                  borderRadius: 1.5,
                }}
              >

                <QRCodeSVG
                  value={qrValue}
                  size={92}
                  level="M"
                  includeMargin={false}
                />

              </Box>


              <Typography
                sx={{
                  mt: 0.5,
                  color: '#52635c',
                  fontSize: 8.5,
                  fontWeight: 650,
                }}
              >
                Scan to view transaction reference
              </Typography>


              {reference && (
                <Typography
                  sx={{
                    mt: 0.15,
                    color: '#087f5b',
                    fontSize: 8,
                    fontWeight: 750,
                    wordBreak:
                      'break-all',
                  }}
                >
                  {reference}
                </Typography>
              )}

            </Box>


            {/* =================================================
                NOTICE
            ================================================== */}

            <Box
              sx={{
                mx: 1.8,
                mb: 1.15,
                p: 0.85,
                borderRadius: 1.5,
                bgcolor: '#f4f8f6',
                border:
                  '1px solid #e1ebe6',
              }}
            >

              <Typography
                sx={{
                  color: '#52635c',
                  fontSize: 9,
                  lineHeight: 1.35,
                  textAlign: 'center',
                }}
              >
                Keep this receipt and transaction
                reference for your records.
              </Typography>

            </Box>


            {/* =================================================
                APPROVED FOOTER
            ================================================== */}

            <Box
              className="receipt-footer"
              sx={{
                bgcolor: '#075b42',
                color: '#ffffff',
                textAlign: 'center',
                px: 1.5,
                py: 1.1,
              }}
            >

              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 800,
                }}
              >
                Thanks for banking with us
              </Typography>

            </Box>

          </Card>


          {/* ==================================================
              ACTIONS
          =================================================== */}

          <Stack
            className="no-print"
            spacing={0.8}
            sx={{
              mt: 1.2,
            }}
          >

            <Stack
              direction="row"
              spacing={0.8}
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
                  borderRadius: 2,
                  py: 0.95,
                  fontSize: 12,
                  fontWeight: 800,
                  '&:hover': {
                    bgcolor: '#066b4c',
                  },
                }}
              >
                {pdfLoading
                  ? 'Preparing PDF...'
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
                    '#087f5b',
                  color:
                    '#087f5b',
                  borderRadius: 2,
                  py: 0.95,
                  fontSize: 12,
                  fontWeight: 800,
                  '&:hover': {
                    borderColor:
                      '#066b4c',
                    bgcolor:
                      '#eaf8f2',
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
                  '#d2ded9',
                color:
                  '#42534c',
                borderRadius: 2,
                py: 0.9,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Back to Transactions
            </Button>

          </Stack>

        </Box>

      </Box>


      {/* ======================================================
          PRINT STYLES
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
    </>
  );
};


/*
 * ============================================================
 * REFERENCE VALUE
 * ============================================================
 */

const ReferenceValue = ({
  reference,
  onCopy,
}: {
  reference: string;
  onCopy: () => void;
}) => (

  <Stack
    direction="row"
    spacing={0.4}
    alignItems="center"
    justifyContent="flex-end"
    sx={{
      minWidth: 0,
    }}
  >

    <Typography
      sx={{
        color: '#10221c',
        fontSize: 10.5,
        fontWeight: 650,
        wordBreak: 'break-all',
        textAlign: 'right',
      }}
    >
      {reference}
    </Typography>


    <Button
      className="no-print"
      onClick={onCopy}
      aria-label="Copy transaction reference"
      sx={{
        minWidth: 25,
        width: 25,
        height: 25,
        p: 0,
        borderRadius: 1,
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
);


/*
 * ============================================================
 * STATUS CHIP
 * ============================================================
 */

const StatusChip = ({
  label,
  background,
  color,
}: {
  label: string;
  background: string;
  color: string;
}) => (

  <Chip
    label={label}
    size="small"
    sx={{
      justifySelf: 'end',
      bgcolor: background,
      color,
      fontWeight: 800,
      borderRadius: 1.3,
      height: 23,
      fontSize: 10,
    }}
  />

);


export default TransactionReceipt;
