
const PDFDocument = require('pdfkit');

// ============================================================
// ZENIMONIES STATEMENT FILE SERVICE
// Generates PDF and CSV account statements.
// ============================================================

// ============================================================
// FORMAT MONEY
// ============================================================

const formatMoney = (
  amount,
  currency = 'NGN'
) => {
  const value = Number(amount || 0);

  if (!Number.isFinite(value)) {
    throw new Error(
      'Invalid statement amount.'
    );
  }

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
};

// ============================================================
// SANITIZE TEXT
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
// CSV ESCAPING
// Prevent spreadsheet formula injection.
// ============================================================

const escapeCSV = (value) => {
  let text = safeText(value);

  // Prevent CSV formula injection in spreadsheet software.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

// ============================================================
// GENERATE CSV STATEMENT
// ============================================================

const generateCSVStatement = (
  data
) => {
  if (
    !data ||
    !data.customer ||
    !data.account ||
    !data.statement
  ) {
    throw new Error(
      'Invalid statement data.'
    );
  }

  const {
    customer,
    account,
    statement,
  } = data;

  const currency =
    account.currency || 'NGN';

  const rows = [];

  // ----------------------------------------------------------
  // ACCOUNT INFORMATION
  // ----------------------------------------------------------

  rows.push([
    'ZENIMONIES BANKING',
  ]);

  rows.push([
    'ACCOUNT STATEMENT',
  ]);

  rows.push([]);

  rows.push([
    'Customer Name',
    safeText(customer.fullName),
  ]);

  rows.push([
    'Account Number',
    safeText(account.accountNumber),
  ]);

  rows.push([
    'Currency',
    currency,
  ]);

  rows.push([
    'Statement Start Date',
    statement.startDate,
  ]);

  rows.push([
    'Statement End Date',
    statement.endDate,
  ]);

  rows.push([
    'Opening Balance',
    Number(statement.openingBalance || 0).toFixed(2),
  ]);

  rows.push([
    'Total Credits',
    Number(statement.totalCredits || 0).toFixed(2),
  ]);

  rows.push([
    'Total Debits',
    Number(statement.totalDebits || 0).toFixed(2),
  ]);

  rows.push([
    'Closing Balance',
    Number(statement.closingBalance || 0).toFixed(2),
  ]);

  rows.push([]);

  // ----------------------------------------------------------
  // TRANSACTION TABLE
  // ----------------------------------------------------------

  rows.push([
    'Date',
    'Reference',
    'Description',
    'Counterparty',
    'Debit',
    'Credit',
    'Balance',
    'Currency',
  ]);

  const transactions =
    statement.transactions || [];

  for (const transaction of transactions) {
    rows.push([
      safeText(transaction.date),
      safeText(transaction.reference),
      safeText(transaction.description),
      safeText(transaction.counterparty),
      Number(transaction.debit || 0).toFixed(2),
      Number(transaction.credit || 0).toFixed(2),
      Number(transaction.balance || 0).toFixed(2),
      safeText(transaction.currency || currency),
    ]);
  }

  return rows
    .map((row) =>
      row.map(escapeCSV).join(',')
    )
    .join('\r\n');
};

// ============================================================
// GENERATE PDF STATEMENT
// ============================================================

const generatePDFStatement = (
  data
) => {
  return new Promise(
    (resolve, reject) => {
      try {
        if (
          !data ||
          !data.customer ||
          !data.account ||
          !data.statement
        ) {
          throw new Error(
            'Invalid statement data.'
          );
        }

        const {
          customer,
          account,
          statement,
        } = data;

        const currency =
          account.currency || 'NGN';

        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: {
            top: 45,
            bottom: 45,
            left: 35,
            right: 35,
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

        doc.on('error', reject);

        doc.on('end', () => {
          resolve(
            Buffer.concat(chunks)
          );
        });

        const pageWidth =
          doc.page.width;

        const left =
          doc.page.margins.left;

        const right =
          pageWidth -
          doc.page.margins.right;

        const contentWidth =
          right - left;

        // ----------------------------------------------------
        // HEADER
        // ----------------------------------------------------

        doc
          .font('Helvetica-Bold')
          .fontSize(22)
          .fillColor('#123C69')
          .text(
            'ZENIMONIES',
            left,
            40,
            {
              align: 'left',
            }
          );

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#666666')
          .text(
            'BANKING',
            left,
            65
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fillColor('#222222')
          .text(
            'ACCOUNT STATEMENT',
            left,
            90,
            {
              width: contentWidth,
              align: 'center',
            }
          );

        doc
          .moveTo(left, 118)
          .lineTo(right, 118)
          .lineWidth(1)
          .strokeColor('#D8DEE8')
          .stroke();

        // ----------------------------------------------------
        // CUSTOMER INFORMATION
        // ----------------------------------------------------

        let y = 135;

        const details = [
          [
            'Customer Name',
            safeText(customer.fullName),
          ],
          [
            'Account Number',
            safeText(account.accountNumber),
          ],
          [
            'Currency',
            currency,
          ],
          [
            'Statement Period',
            `${statement.startDate} to ${statement.endDate}`,
          ],
        ];

        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#222222');

        for (const [label, value] of details) {
          doc
            .font('Helvetica-Bold')
            .text(
              `${label}:`,
              left,
              y,
              {
                continued: true,
              }
            );

          doc
            .font('Helvetica')
            .text(
              ` ${value}`
            );

          y += 18;
        }

        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        y += 8;

        const summaryItems = [
          [
            'Opening Balance',
            formatMoney(
              statement.openingBalance,
              currency
            ),
          ],
          [
            'Total Credits',
            formatMoney(
              statement.totalCredits,
              currency
            ),
          ],
          [
            'Total Debits',
            formatMoney(
              statement.totalDebits,
              currency
            ),
          ],
          [
            'Closing Balance',
            formatMoney(
              statement.closingBalance,
              currency
            ),
          ],
        ];

        const summaryWidth =
          contentWidth / 4;

        for (
          let i = 0;
          i < summaryItems.length;
          i++
        ) {
          const x =
            left +
            i * summaryWidth;

          doc
            .roundedRect(
              x,
              y,
              summaryWidth - 8,
              48,
              5
            )
            .fillAndStroke(
              '#F1F5F9',
              '#D8DEE8'
            );

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#666666')
            .text(
              summaryItems[i][0],
              x + 8,
              y + 8,
              {
                width: summaryWidth - 24,
              }
            );

          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#123C69')
            .text(
              summaryItems[i][1],
              x + 8,
              y + 25,
              {
                width: summaryWidth - 24,
              }
            );
        }

        y += 68;

        // ----------------------------------------------------
        // TRANSACTION TABLE
        // ----------------------------------------------------

        const columns = [
          {
            title: 'Date',
            width: 75,
          },
          {
            title: 'Reference',
            width: 105,
          },
          {
            title: 'Description',
            width: 145,
          },
          {
            title: 'Counterparty',
            width: 105,
          },
          {
            title: 'Debit',
            width: 80,
          },
          {
            title: 'Credit',
            width: 80,
          },
          {
            title: 'Balance',
            width: 100,
          },
        ];

        const totalWidth =
          columns.reduce(
            (sum, column) =>
              sum + column.width,
            0
          );

        const scale =
          contentWidth / totalWidth;

        const scaledColumns =
          columns.map((column) => ({
            ...column,
            width:
              column.width * scale,
          }));

        const drawTableHeader = () => {
          doc
            .rect(
              left,
              y,
              contentWidth,
              25
            )
            .fill('#123C69');

          let x = left;

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#FFFFFF');

          for (
            const column of scaledColumns
          ) {
            doc.text(
              column.title,
              x + 4,
              y + 8,
              {
                width:
                  column.width - 8,
                lineBreak: false,
              }
            );

            x += column.width;
          }

          y += 25;
        };

        drawTableHeader();

        const transactions =
          statement.transactions || [];

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#222222');

        for (
          const transaction of transactions
        ) {
          const values = [
            safeText(
              transaction.date
            ).slice(0, 10),

            safeText(
              transaction.reference
            ),

            safeText(
              transaction.description
            ),

            safeText(
              transaction.counterparty
            ),

            Number(
              transaction.debit || 0
            ).toFixed(2),

            Number(
              transaction.credit || 0
            ).toFixed(2),

            Number(
              transaction.balance || 0
            ).toFixed(2),
          ];

          const rowHeight = 28;

          if (
            y + rowHeight >
            doc.page.height -
              doc.page.margins.bottom
          ) {
            doc.addPage();

            y = doc.page.margins.top;

            drawTableHeader();

            doc
              .font('Helvetica')
              .fontSize(7)
              .fillColor('#222222');
          }

          if (
            Math.floor(
              (y - 200) / rowHeight
            ) % 2 === 0
          ) {
            doc
              .rect(
                left,
                y,
                contentWidth,
                rowHeight
              )
              .fill('#F8FAFC');
          }

          let x = left;

          for (
            let i = 0;
            i < scaledColumns.length;
            i++
          ) {
            const column =
              scaledColumns[i];

            doc
              .font('Helvetica')
              .fontSize(7)
              .fillColor('#222222')
              .text(
                values[i],
                x + 4,
                y + 8,
                {
                  width:
                    column.width - 8,
                  height: 16,
                  ellipsis: true,
                  lineBreak: false,
                }
              );

            x += column.width;
          }

          y += rowHeight;
        }

        // ----------------------------------------------------
        // FOOTER
        // ----------------------------------------------------

        const range =
          doc.bufferedPageRange();

        for (
          let i = 0;
          i < range.count;
          i++
        ) {
          doc.switchToPage(
            range.start + i
          );

          const footerY =
            doc.page.height - 30;

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#777777')
            .text(
              'Generated electronically by Zenimonies Banking.',
              left,
              footerY,
              {
                width: contentWidth / 2,
                align: 'left',
              }
            );

          doc
            .text(
              `Page ${i + 1} of ${range.count}`,
              left +
                contentWidth / 2,
              footerY,
              {
                width: contentWidth / 2,
                align: 'right',
              }
            );
        }

        doc.end();

      } catch (error) {
        reject(error);
      }
    }
  );
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  formatMoney,
  escapeCSV,
  generateCSVStatement,
  generatePDFStatement,
};
