import React from "react";

interface TransactionReceiptProps {
  amount?: string;
  transactionType?: string;
  date?: string;
  senderName?: string;
  senderPhone?: string;
  beneficiaryName?: string;
  /** For ZENIMONIES → ZENIMONIES */
  beneficiaryPhone?: string;
  /** For ZENIMONIES → Other Bank */
  beneficiaryAccount?: string;
  beneficiaryBank?: string;
  remark?: string;
  reference?: string;
  status?: string;
}

const TransactionReceipt: React.FC<TransactionReceiptProps> = ({
  amount = "₦2,000",
  transactionType = "TRANSFER",
  date = "20-09-2026 03:12:00",
  senderName = "JOHN OKORIE",
  senderPhone,
  beneficiaryName = "EBUKA EMMANUEL",
  beneficiaryPhone,
  beneficiaryAccount,
  beneficiaryBank = "Zenimonies",
  remark,
  reference = "ZEN202609201847291",
  status = "Transfer Successful",
}) => {
  // Automatically detect transfer type
  const isInternal = Boolean(beneficiaryPhone) && !beneficiaryAccount;
  const isExternal = Boolean(beneficiaryAccount);

  return (
    <div className="max-w-md mx-auto bg-white text-gray-800 font-sans text-sm border border-gray-200 rounded-xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-[#0A7A4B]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <span className="text-[#0A7A4B] font-bold text-xl">Z</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              ZENIMONIES
            </h1>
            <p className="text-[10px] text-green-100 uppercase tracking-wider">
              Digital Banking
            </p>
          </div>
        </div>
        <p className="text-xs text-green-100">Transfer Receipt</p>
      </div>

      {/* Title */}
      <div className="px-6 pt-6 pb-1 text-center">
        <h2 className="text-xl font-semibold text-[#0A7A4B]">
          Transaction Receipt
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Generated from Zenimonies on {date}
        </p>
      </div>

      {/* Details */}
      <div className="px-6 py-4">
        <div className="space-y-0">
          <Row label="Transaction Amount" value={amount} />
          <Row
            label="Transaction Type"
            value={isInternal ? "ZENIMONIES TRANSFER" : "INTER-BANK"}
          />
          <Row label="Transaction Date" value={date} />

          {/* Sender */}
          <Row
            label="Sender"
            value={
              <div className="text-right leading-snug">
                <div className="font-medium">{senderName}</div>
                {senderPhone && (
                  <div className="text-gray-600 text-[13px]">{senderPhone}</div>
                )}
              </div>
            }
          />

          {/* Beneficiary - changes based on transfer type */}
          <Row
            label="Beneficiary"
            value={
              <div className="text-right leading-snug">
                <div className="font-medium">{beneficiaryName}</div>

                {/* Internal: show phone number */}
                {isInternal && beneficiaryPhone && (
                  <div className="text-gray-600 text-[13px]">
                    {beneficiaryPhone}
                  </div>
                )}

                {/* External: show account number + bank */}
                {isExternal && (
                  <>
                    <div className="text-gray-600 text-[13px]">
                      {beneficiaryAccount}
                    </div>
                    <div className="text-gray-600 text-[13px]">
                      {beneficiaryBank}
                    </div>
                  </>
                )}

                {/* Fallback if only bank is provided */}
                {!isInternal && !isExternal && beneficiaryBank && (
                  <div className="text-gray-600 text-[13px]">
                    {beneficiaryBank}
                  </div>
                )}
              </div>
            }
          />

          {remark && <Row label="Remark" value={remark} />}
          <Row label="Transaction Reference" value={reference} />
          <Row label="Transaction Status" value={status} isLast />
        </div>
      </div>

      {/* QR Code Section */}
      <div className="px-6 pb-6 flex flex-col items-center">
        <div className="w-32 h-32 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
          {/* Replace with real QR later */}
          <div className="text-center text-gray-400 text-xs">
            <div className="text-3xl mb-1">▦</div>
            <div>QR Code</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">Scan to verify this transaction</p>
        <p className="text-xs font-medium text-[#0A7A4B] mt-0.5">{reference}</p>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
        <p>
          If you have any questions, please contact our 24-hour support on{" "}
          <span className="text-[#0A7A4B] font-medium">0700-ZENIMONY</span> or
          email{" "}
          <span className="text-[#0A7A4B] font-medium">
            support@zenimonies.com
          </span>
          .
        </p>
        <p className="mt-2">Thank you for choosing Zenimonies.</p>
        <p className="mt-3 text-[11px] text-gray-400">
          Banking with Zenimonies: App · Web · USSD · Contact Centre
        </p>
      </div>
    </div>
  );
};

/* Helper Row */
const Row = ({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
}) => (
  <div
    className={`flex justify-between items-start py-3.5 ${
      !isLast ? "border-b border-gray-100" : ""
    }`}
  >
    <span className="text-[#0A7A4B] font-medium shrink-0 pr-4">{label}</span>
    <span className="text-right text-gray-800 font-medium">{value}</span>
  </div>
);

export default TransactionReceipt;
