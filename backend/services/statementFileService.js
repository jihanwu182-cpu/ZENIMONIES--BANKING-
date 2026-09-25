
const PDFDocument = require('pdfkit');

// ============================================================
// ZENIMONIES BANKING
// PROFESSIONAL ACCOUNT STATEMENT FILE SERVICE
// PDF + CSV
// ============================================================

const GREEN = '#145A32';
const DARK_GREEN = '#0B3D24';
const LIGHT_GREEN = '#EAF4EC';
const WHITE = '#FFFFFF';
const DARK_TEXT = '#202820';
const MUTED = '#68756B';
const BORDER = '#D8E4DA';

// ============================================================
// FORMAT MONEY
// ============================================================

const formatMoney = (amount, currency = 'NGN') => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ''
  ) {
    return 'Not reconciled';
  }

  const value = Number(amount);

  if (!Number.isFinite(value)) {
    throw new Error('Invalid statement amount.');
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// ============================================================
// SAFE TEXT
// ============================================================

const safeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
};

// ============================================================
// MONEY VALIDATION
// ============================================================

const moneyNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new Error('Invalid statement amount.');
  }

  // Negative balances are allowed.
  return amount;
};

const formatAmountCell = (value) => {
  const amount = moneyNumber(value);

  return amount === null
    ? 'Not reconciled'
    : amount.toFixed(2);
};

// ============================================================
// CSV ESCAPING
// Prevent spreadsheet formula injection.
// ============================================================

const escapeCSV = (value) => {
  let text = safeText(value);

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

const csvRow = (values) =>
  values.map(escapeCSV).join(',');

// ============================================================
// GENERATE CSV STATEMENT
// ============================================================

const generateCSVStatement = (data) => {
  if (
    !data ||
    !data.customer ||
    !data.account ||
    !data.statement
  ) {
    throw new Error('Invalid statement data.');
  }

  const {
    customer,
    account,
    statement,
  } = data;

  const currency = account.currency || 'NGN';
  const rows = [];

  rows.push(csvRow(['ZENIMONIES BANKING']));
  rows.push(csvRow(['ACCOUNT STATEMENT']));
  rows.push([]);

  // ----------------------------------------------------------
  // ACCOUNT STATEMENT DETAILS
  // ----------------------------------------------------------

  rows.push(csvRow(['ACCOUNT STATEMENT']));

  rows.push(
    csvRow([
      'Customer Name',
      safeText(customer.fullName),
    ])
  );

  rows.push(
    csvRow([
      'Account Number',
      safeText(account.accountNumber),
    ])
  );

  rows.push(
    csvRow([
      'Currency',
      currency,
    ])
  );

  rows.push(
    csvRow([
      'Statement Period',
      `${statement.startDate} to ${statement.endDate}`,
    ])
  );

  rows.push(
    csvRow([
      'Registered Address',
      safeText(customer.address) ||
        'Address not provided',
    ])
  );

  rows.push([]);

  // ----------------------------------------------------------
  // ACCOUNT SUMMARY
  // ----------------------------------------------------------

  rows.push(csvRow(['ACCOUNT SUMMARY']));

  rows.push(
    csvRow([
      'Opening Balance',
      formatAmountCell(statement.openingBalance),
      currency,
    ])
  );

  rows.push(
    csvRow([
      'Total Credits',
      formatAmountCell(statement.totalCredits),
      currency,
    ])
  );

  rows.push(
    csvRow([
      'Total Debits',
      formatAmountCell(statement.totalDebits),
      currency,
    ])
  );

  rows.push(
    csvRow([
      'Closing Balance',
      formatAmountCell(statement.closingBalance),
      currency,
    ])
  );

  rows.push([]);

  // ----------------------------------------------------------
  // TRANSACTION HISTORY
  // ----------------------------------------------------------

  rows.push(
    csvRow([
      'Date',
      'Reference',
      'Description',
      'Beneficiary',
      'Beneficiary Institution',
      'Debit',
      'Credit',
      'Fee',
      'Balance',
      'Currency',
    ])
  );

  const transactions = statement.transactions || [];

  if (!Array.isArray(transactions)) {
    throw new Error('Invalid statement transactions.');
  }

  for (const transaction of transactions) {
    rows.push(
      csvRow([
        safeText(transaction.date),
        safeText(transaction.reference),
        safeText(transaction.description),
        safeText(transaction.beneficiary),
        safeText(transaction.institution),
        formatAmountCell(transaction.debit),
        formatAmountCell(transaction.credit),
        formatAmountCell(transaction.fee),
        formatAmountCell(transaction.balance),
        safeText(transaction.currency || currency),
      ])
    );
  }

  return '\uFEFF' + rows.join('\r\n');
};

// ============================================================
// PDF HELPERS
// ============================================================

const drawLabelValue = (
  doc,
  label,
  value,
  x,
  y,
  width
) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(MUTED)
    .text(label, x, y, {
      width,
      lineBreak: false,
      ellipsis: true,
    });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(DARK_TEXT)
    .text(
      safeText(value) || 'Not provided',
      x,
      y + 12,
      {
        width,
        height: 24,
        ellipsis: true,
      }
    );
};

// ============================================================
// GENERATE PDF STATEMENT
// ============================================================

const generatePDFStatement = (data) => {
  return new Promise((resolve, reject) => {
    let doc;
    let settled = false;

    try {
      if (
        !data ||
        !data.customer ||
        !data.account ||
        !data.statement
      ) {
        throw new Error('Invalid statement data.');
      }

      const {
        customer,
        account,
        statement,
      } = data;

      const currency = account.currency || 'NGN';
      const transactions = statement.transactions || [];

      if (!Array.isArray(transactions)) {
        throw new Error('Invalid statement transactions.');
      }

      doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: 35,
          bottom: 45,
          left: 30,
          right: 30,
        },
        bufferPages: true,
        info: {
          Title: 'Zenimonies Account Statement',
          Author: 'Zenimonies Banking',
          Subject: 'Customer account statement',
        },
      });

      const chunks = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      doc.on('error', (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });

      doc.on('end', () => {
        if (!settled) {
          settled = true;
          resolve(Buffer.concat(chunks));
        }
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const left = doc.page.margins.left;
      const right = pageWidth - doc.page.margins.right;
      const contentWidth = right - left;

      // ------------------------------------------------------
      // BRAND HEADER
      // ------------------------------------------------------

      doc
        .rect(0, 0, pageWidth, 100)
        .fill(DARK_GREEN);

      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(WHITE)
        .text('ZENIMONIES', left, 26);

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#D9EADD')
        .text('BANKING', left, 56);

      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(WHITE)
        .text('ACCOUNT STATEMENT', left, 40, {
          width: contentWidth,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#D9EADD')
        .text(
          `${statement.startDate} to ${statement.endDate}`,
          left,
          65,
          {
            width: contentWidth,
            align: 'right',
          }
        );

      // ------------------------------------------------------
      // TWO-COLUMN ACCOUNT STATEMENT + ACCOUNT SUMMARY
      //
      // LEFT: ACCOUNT STATEMENT
      // RIGHT: ACCOUNT SUMMARY
      //
      // Summary boxes are no longer below the customer details.
      // ------------------------------------------------------

      const sectionTop = 120;
      const columnGap = 24;
      const columnWidth = (contentWidth - columnGap) / 2;

      const leftColumnX = left;
      const rightColumnX = left + columnWidth + columnGap;

      const sectionHeight = 178;

      // Section backgrounds

      doc
        .roundedRect(
          leftColumnX,
          sectionTop,
          columnWidth,
          sectionHeight,
          6
        )
        .fillAndStroke(WHITE, BORDER);

      doc
        .roundedRect(
          rightColumnX,
          sectionTop,
          columnWidth,
          sectionHeight,
          6
        )
        .fillAndStroke(WHITE, BORDER);

      // ------------------------------------------------------
      // LEFT: ACCOUNT STATEMENT
      // ------------------------------------------------------

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(GREEN)
        .text(
          'ACCOUNT STATEMENT',
          leftColumnX + 12,
          sectionTop + 12,
          {
            width: columnWidth - 24,
          }
        );

      doc
        .moveTo(
          leftColumnX + 12,
          sectionTop + 32
        )
        .lineTo(
          leftColumnX + columnWidth - 12,
          sectionTop + 32
        )
        .lineWidth(0.6)
        .strokeColor(BORDER)
        .stroke();

      const detailsX = leftColumnX + 12;
      const detailsWidth = columnWidth - 24;

      drawLabelValue(
        doc,
        'Customer Name',
        customer.fullName,
        detailsX,
        sectionTop + 42,
        detailsWidth
      );

      drawLabelValue(
        doc,
        'Account Number',
        account.accountNumber,
        detailsX,
        sectionTop + 82,
        detailsWidth
      );

      drawLabelValue(
        doc,
        'Currency',
        currency,
        detailsX,
        sectionTop + 122,
        detailsWidth
      );

      drawLabelValue(
        doc,
        'Registered Address',
        customer.address || 'Address not provided',
        detailsX,
        sectionTop + 162,
        detailsWidth
      );

      // ------------------------------------------------------
      // RIGHT: ACCOUNT SUMMARY
      // ------------------------------------------------------

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(GREEN)
        .text(
          'ACCOUNT SUMMARY',
          rightColumnX + 12,
          sectionTop + 12,
          {
            width: columnWidth - 24,
          }
        );

      doc
        .moveTo(
          rightColumnX + 12,
          sectionTop + 32
        )
        .lineTo(
          rightColumnX + columnWidth - 12,
          sectionTop + 32
        )
        .lineWidth(0.6)
        .strokeColor(BORDER)
        .stroke();

      const summaryItems = [
        {
          label: 'Opening Balance',
          value: statement.openingBalance,
        },
        {
          label: 'Total Credits',
          value: statement.totalCredits,
        },
        {
          label: 'Total Debits',
          value: statement.totalDebits,
        },
        {
          label: 'Closing Balance',
          value: statement.closingBalance,
        },
      ];

      const summaryX = rightColumnX + 12;
      const summaryWidth = columnWidth - 24;
      const summaryStartY = sectionTop + 43;
      const summaryRowHeight = 31;

      summaryItems.forEach((item, index) => {
        const rowY =
          summaryStartY + index * summaryRowHeight;

        if (index === 3) {
          doc
            .roundedRect(
              summaryX,
              rowY - 3,
              summaryWidth,
              28,
              4
            )
            .fill(LIGHT_GREEN);
        }

        doc
          .font(
            index === 3
              ? 'Helvetica-Bold'
              : 'Helvetica'
          )
          .fontSize(8.5)
          .fillColor(
            index === 3
              ? DARK_GREEN
              : MUTED
          )
          .text(
            item.label,
            summaryX + 7,
            rowY + 4,
            {
              width: summaryWidth * 0.48,
              lineBreak: false,
              ellipsis: true,
            }
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(DARK_TEXT)
          .text(
            formatMoney(item.value, currency),
            summaryX + summaryWidth * 0.46,
            rowY + 4,
            {
              width: summaryWidth * 0.52 - 7,
              align: 'right',
              lineBreak: false,
              ellipsis: true,
            }
          );
      });

      // ------------------------------------------------------
      // TRANSACTION HISTORY
      // Full width below both sections
      // ------------------------------------------------------

      let y = sectionTop + sectionHeight + 20;

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(GREEN)
        .text('TRANSACTION HISTORY', left, y);

      y += 20;

      const columns = [
        { title: 'Date', width: 57 },
        { title: 'Reference', width: 95 },
        { title: 'Description', width: 120 },
        { title: 'Beneficiary', width: 90 },
        { title: 'Beneficiary Institution', width: 90 },
        { title: 'Debit', width: 70 },
        { title: 'Credit', width: 70 },
        { title: 'Fee', width: 50 },
        { title: 'Balance', width: 85 },
      ];

      const totalWidth = columns.reduce(
        (sum, column) => sum + column.width,
        0
      );

      const scale = contentWidth / totalWidth;

      const scaledColumns = columns.map((column) => ({
        ...column,
        width: column.width * scale,
      }));

      const headerHeight = 25;
      const rowHeight = 29;

      const footerY = pageHeight - 27;

      const drawTableHeader = () => {
        doc
          .rect(
            left,
            y,
            contentWidth,
            headerHeight
          )
          .fill(DARK_GREEN);

        let x = left;

        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor(WHITE);

        for (const column of scaledColumns) {
          doc.text(
            column.title,
            x + 3,
            y + 8,
            {
              width: column.width - 6,
              lineBreak: false,
              ellipsis: true,
            }
          );

          x += column.width;
        }

        y += headerHeight;
      };

      const drawFooter = (pageNumber, totalPages) => {
        doc
          .moveTo(left, footerY - 7)
          .lineTo(right, footerY - 7)
          .lineWidth(0.5)
          .strokeColor(BORDER)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(MUTED)
          .text(
            'Generated electronically by Zenimonies Banking.',
            left,
            footerY,
            {
              width: contentWidth / 2,
            }
          );

        doc
          .text(
            `Page ${pageNumber} of ${totalPages}`,
            left + contentWidth / 2,
            footerY,
            {
              width: contentWidth / 2,
              align: 'right',
            }
          );
      };

      drawTableHeader();

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        const values = [
          safeText(transaction.date).slice(0, 10),
          safeText(transaction.reference),
          safeText(transaction.description),
          safeText(transaction.beneficiary),
          safeText(transaction.institution),
          formatAmountCell(transaction.debit),
          formatAmountCell(transaction.credit),
          formatAmountCell(transaction.fee),
          formatAmountCell(transaction.balance),
        ];

        // Start a new page when the next row would overlap
        // the footer area.

        if (
          y + rowHeight >
          pageHeight - doc.page.margins.bottom - 10
        ) {
          doc.addPage();

          y = doc.page.margins.top;

          drawTableHeader();
        }

        if (i % 2 === 0) {
          doc
            .rect(
              left,
              y,
              contentWidth,
              rowHeight
            )
            .fill('#F4F8F5');
        }

        let x = left;

        for (let j = 0; j < scaledColumns.length; j++) {
          const column = scaledColumns[j];

          doc
            .font('Helvetica')
            .fontSize(6.5)
            .fillColor(DARK_TEXT)
            .text(
              values[j],
              x + 3,
              y + 9,
              {
                width: column.width - 6,
                height: 14,
                ellipsis: true,
                lineBreak: false,
              }
            );

          x += column.width;
        }

        y += rowHeight;
      }

      // ------------------------------------------------------
      // NO TRANSACTIONS MESSAGE
      // ------------------------------------------------------

      if (!transactions.length) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(MUTED)
          .text(
            'No completed transactions were found for this statement period.',
            left,
            y + 10,
            {
              width: contentWidth,
              align: 'center',
            }
          );
      }

      // ------------------------------------------------------
      // FOOTERS ON ALL PAGES
      // ------------------------------------------------------

      const pageRange = doc.bufferedPageRange();

      for (let i = 0; i < pageRange.count; i++) {
        doc.switchToPage(pageRange.start + i);

        drawFooter(
          i + 1,
          pageRange.count
        );
      }

      doc.end();

    } catch (error) {
      if (doc && !doc.destroyed) {
        doc.destroy();
      }

      if (!settled) {
        settled = true;
        reject(error);
      }
    }
  });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  formatMoney,
  escapeCSV,
  generateCSVStatement,
  generatePDFStatement,
};
