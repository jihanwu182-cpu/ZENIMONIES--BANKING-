import React from "react";

interface TransactionReceiptProps {
  amount: string;
  transactionType: string;
  date: string;
  senderName: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryBank: string;
  remark?: string;
  reference: string;
  status: string;
}

const TransactionReceipt: React.FC<TransactionReceiptProps> = ({
  amount = "₦2,000",
  transactionType = "INTER-BANK",
  date = "20-09-2026 03:12:00",
  senderName = "JOHN OKORIE",
  beneficiaryName = "EBUKA EMMANUEL",
  beneficiaryAccount = "0123456789",
  beneficiaryBank = "Zenimonies",
  remark = "Two thousand naira",
  reference = "ZEN202609201847291",
  status = "Transfer Request Successful",
}) => {
  return (
    <div className="max-w-md mx-auto bg-white text-gray-800 font-sans text-sm border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#0A7A4B] flex items-center justify-center">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0A7A4B] tracking-tight">
              ZENIMONIES
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              Digital Banking
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">more than banking</p>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-6 pb-2 text-center">
        <h2 className="text-xl font-semibold text-[#0A7A4B]">
          Transaction Receipt
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Generated from Zenimonies on {date}
        </p>
      </div>

      {/* Details Table */}
      <div className="px-6 py-4">
        <div className="space-y-0">
          <Row label="Transaction Amount" value={amount} />
          <Row label="Transaction Type" value={transactionType} />
          <Row label="Transaction Date" value={date} />
          <Row label="Sender" value={senderName} />
          <Row
            label="Beneficiary"
            value={
              <div className="text-right">
                <div>{beneficiaryName}</div>
                <div className="text-gray-600">{beneficiaryAccount}</div>
                <div className="text-gray-600">{beneficiaryBank}</div>
              </div>
            }
          />
          {remark && <Row label="Remark" value={remark} />}
          <Row label="Transaction Reference" value={reference} />
          <Row label="Transaction Status" value={status} isLast />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
        <p>
          If you have any questions or would like more information, please
          contact our 24-hour support on{" "}
          <span className="text-[#0A7A4B]">0700-ZENIMONY</span> or email{" "}
          <span className="text-[#0A7A4B]">
            support@zenimonies.com
          </span>
          .
        </p>
        <p className="mt-2">Thank you for choosing Zenimonies.</p>
        <p className="mt-3 text-[11px] text-gray-400">
          Banking with Zenimonies: App | Web | USSD | Contact Centre
        </p>
      </div>
    </div>
  );
};

/* Helper row component */
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
    className={`flex justify-between py-3 ${
      !isLast ? "border-b border-gray-100" : ""
    }`}
  >
    <span className="text-[#0A7A4B] font-medium">{label}</span>
    <span className="text-right text-gray-800 font-medium">{value}</span>
  </div>
);

export default TransactionReceipt;
