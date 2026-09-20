import React from "react";

interface TransactionReceiptProps {
  amount: string;
  date: string;
  reference: string;
  status: string;
  senderName: string;
  senderPhone?: string;
  beneficiaryName: string;
  beneficiaryPhone?: string;      // ZENIMONIES → ZENIMONIES
  beneficiaryAccount?: string;    // ZENIMONIES → Other Bank
  beneficiaryBank?: string;
  remark?: string;
  transactionType?: string;
  logoUrl?: string;               // Optional: path to your logo image
}

const TransactionReceipt: React.FC<TransactionReceiptProps> = ({
  amount,
  date,
  reference,
  status,
  senderName,
  senderPhone,
  beneficiaryName,
  beneficiaryPhone,
  beneficiaryAccount,
  beneficiaryBank,
  remark,
  transactionType,
  logoUrl,
}) => {
  const isInternal = Boolean(beneficiaryPhone) && !beneficiaryAccount;

  return (
    <div className="max-w-md mx-auto bg-white text-gray-800 font-sans text-sm border border-gray-200 rounded-xl overflow-hidden shadow-md">
      
      {/* ===== HEADER with your logo ===== */}
      <div className="bg-[#0A7A4B] px-5 py-4">
        {logoUrl ? (
          // Use your actual logo image
          <img 
            src={logoUrl} 
            alt="ZENIMONIES Transfer Receipt" 
            className="w-full h-auto object-contain"
          />
        ) : (
          // Fallback that matches your logo design
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              {/* Hexagon Z logo */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-8 h-8">
                  <path
                    d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                  />
                  <text
                    x="20"
                    y="26"
                    textAnchor="middle"
                    fill="white"
                    fontSize="18"
                    fontWeight="bold"
                    fontFamily="Arial, sans-serif"
                  >
                    Z
                  </text>
                </svg>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-bold tracking-wide">ZEN</span>
                <span className="text-lg font-bold tracking-wide relative">
                  I
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px]">🌱</span>
                </span>
                <span className="text-lg font-bold tracking-wide">MONIES</span>
              </div>
            </div>
            <div className="h-5 w-px bg-white/40 mx-3"></div>
            <span className="text-sm font-medium">Transfer Receipt</span>
          </div>
        )}
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
            value={
              transactionType ||
              (isInternal ? "ZENIMONIES TRANSFER" : "INTER-BANK")
            }
          />
          <Row label="Transaction Date" value={date} />

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

          <Row
            label="Beneficiary"
            value={
              <div className="text-right leading-snug">
                <div className="font-medium">{beneficiaryName}</div>
                {isInternal && beneficiaryPhone && (
                  <div className="text-gray-600 text-[13px]">{beneficiaryPhone}</div>
                )}
                {!isInternal && beneficiaryAccount && (
                  <>
                    <div className="text-gray-600 text-[13px]">{beneficiaryAccount}</div>
                    {beneficiaryBank && (
                      <div className="text-gray-600 text-[13px]">{beneficiaryBank}</div>
                    )}
                  </>
                )}
              </div>
            }
          />

          {remark && <Row label="Remark" value={remark} />}
          <Row label="Transaction Reference" value={reference} />
          <Row label="Transaction Status" value={status} isLast />
        </div>
      </div>

      {/* QR Code */}
      <div className="px-6 pb-6 flex flex-col items-center">
        <div className="w-32 h-32 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
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
          <span className="text-[#0A7A4B] font-medium">support@zenimonies.com</span>.
        </p>
        <p className="mt-2">Thank you for choosing Zenimonies.</p>
        <p className="mt-3 text-[11px] text-gray-400">
          Banking with Zenimonies: App · Web · USSD · Contact Centre
        </p>
      </div>
    </div>
  );
};

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
