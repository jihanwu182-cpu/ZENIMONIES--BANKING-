
const PDFDocument = require('pdfkit');

// ============================================================
// ZENIMONIES STATEMENT FILE SERVICE
// PDF and CSV account statement generation.
// ============================================================

// ============================================================
// FORMAT MONEY
// ============================================================

const formatMoney = (
  amount,
  currency = 'NGN'
) => {
  const value = Number(amount ?? 0);

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
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
};

// ============================================================
// VALIDATE MONEY
// ============================================================

const moneyNumber = (value) => {
  const amount = Number(value ?? 0);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      'Invalid statement amount.'
    );
  }

  return amount;
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
    moneyNumber(
      statement.openingBalance
    ).toFixed(2),
  ]);

  rows.push([
    'Total Credits',
    moneyNumber(
      statement.totalCredits
    ).toFixed(2),
  ]);

  rows.push([
    'Total Debits',
    moneyNumber(
      statement.totalDebits
    ).toFixed(2),
  ]);

  rows.push([
    'Total Fees',
    moneyNumber(
      statement.totalFees
    ).toFixed(2),
  ]);

  rows.push([
    'Closing Balance',
    moneyNumber(
      statement.closingBalance
    ).toFixed(2),
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
    'Fee',
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

      moneyNumber(
        transaction.debit
      ).toFixed(2),

      moneyNumber(
        transaction.credit
      ).toFixed(2),

      moneyNumber(
        transaction.fee
      ).toFixed(2),

      moneyNumber(
        transaction.balance
      ).toFixed(2),

      safeText(
        transaction.currency || currency
      ),
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

const generatePDFStatement = (data) => {
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

        const transactions =
          statement.transactions || [];

        if (!Array.isArray(transactions)) {
          throw new Error(
            'Invalid statement transactions.'
          );
        }

        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',

          margins: {
            top: 40,
            bottom: 45,
            left: 30,
            right: 30,
          },

          bufferPages: true,

          info: {
            Title:
              'Zenimonies Account Statement',

            Author:
              'Zenimonies Banking',

            Subject:
              'Customer account statement',
          },
        });

        const chunks = [];

        let settled = false;

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

            resolve(
              Buffer.concat(chunks)
            );
          }
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
            35
          );

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#666666')
          .text(
            'BANKING',
            left,
            60
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fillColor('#222222')
          .text(
            'ACCOUNT STATEMENT',
            left,
            85,
            {
              width: contentWidth,
              align: 'center',
            }
          );

        doc
          .moveTo(left, 112)
          .lineTo(right, 112)
          .lineWidth(1)
          .strokeColor('#D8DEE8')
          .stroke();

        // ----------------------------------------------------
        // CUSTOMER INFORMATION
        // ----------------------------------------------------

        let y = 125;

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

        for (const [label, value] of details) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#222222')
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

          y += 16;
        }

        // ----------------------------------------------------
        // SUMMARY CARDS
        // ----------------------------------------------------

        y += 6;

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
            'Total Fees',
            formatMoney(
              statement.totalFees,
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

        const summaryGap = 8;

        const summaryWidth =
          (
            contentWidth -
            summaryGap *
              (summaryItems.length - 1)
          ) / summaryItems.length;

        for (
          let i = 0;
          i < summaryItems.length;
          i++
        ) {
          const x =
            left +
            i *
              (summaryWidth + summaryGap);

          doc
            .roundedRect(
              x,
              y,
              summaryWidth,
              45,
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
              x + 7,
              y + 7,
              {
                width:
                  summaryWidth - 14,
              }
            );

          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#123C69')
            .text(
              summaryItems[i][1],
              x + 7,
              y + 24,
              {
                width:
                  summaryWidth - 14,
                lineBreak: false,
                ellipsis: true,
              }
            );
        }

        y += 60;

        // ----------------------------------------------------
        // TRANSACTION TABLE
        // ----------------------------------------------------

        const columns = [
          {
            title: 'Date',
            width: 70,
          },
          {
            title: 'Reference',
            width: 100,
          },
          {
            title: 'Description',
            width: 140,
          },
          {
            title: 'Counterparty',
            width: 100,
          },
          {
            title: 'Debit',
            width: 75,
          },
          {
            title: 'Credit',
            width: 75,
          },
          {
            title: 'Fee',
            width: 65,
          },
          {
            title: 'Balance',
            width: 95,
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

        const headerHeight = 24;
        const rowHeight = 27;

        const drawTableHeader = () => {
          doc
            .rect(
              left,
              y,
              contentWidth,
              headerHeight
            )
            .fill('#123C69');

          let x = left;

          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#FFFFFF');

          for (
            const column of scaledColumns
          ) {
            doc.text(
              column.title,
              x + 3,
              y + 8,
              {
                width:
                  column.width - 6,

                lineBreak: false,
                ellipsis: true,
              }
            );

            x += column.width;
          }

          y += headerHeight;
        };

        const drawFooter = (pageNumber, totalPages) => {
          const footerY =
            doc.page.height - 28;

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#777777')
            .text(
              'Generated electronically by Zenimonies Banking.',
              left,
              footerY,
              {
                width:
                  contentWidth / 2,

                align: 'left',
              }
            );

          doc
            .text(
              `Page ${pageNumber} of ${totalPages}`,
              left +
                contentWidth / 2,
              footerY,
              {
                width:
                  contentWidth / 2,

                align: 'right',
              }
            );
        };

        drawTableHeader();

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

            moneyNumber(
              transaction.debit
            ).toFixed(2),

            moneyNumber(
              transaction.credit
            ).toFixed(2),

            moneyNumber(
              transaction.fee
            ).toFixed(2),

            moneyNumber(
              transaction.balance
            ).toFixed(2),
          ];

          if (
            y + rowHeight >
            doc.page.height -
              doc.page.margins.bottom -
              10
          ) {
            doc.addPage();

            y = doc.page.margins.top;

            drawTableHeader();
          }

          if (
            transactions.indexOf(
              transaction
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
                x + 3,
                y + 8,
                {
                  width:
                    column.width - 6,

                  height: 14,

                  ellipsis: true,
                  lineBreak: false,
                }
              );

            x += column.width;
          }

          y += rowHeight;
        }

        // ----------------------------------------------------
        // FOOTERS ON ALL PAGES
        // ----------------------------------------------------

        const pageRange =
          doc.bufferedPageRange();

        for (
          let i = 0;
          i < pageRange.count;
          i++
        ) {
          doc.switchToPage(
            pageRange.start + i
          );

          drawFooter(
            i + 1,
            pageRange.count
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
