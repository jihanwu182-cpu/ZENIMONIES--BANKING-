
const express = require('express');

const router = express.Router();

const {
  authenticateToken,
} = require('../utils/authMiddleware');

const {
  buildAccountStatement,
  validateStatementDates,
} = require('../services/statementService');

const {
  generateCSVStatement,
  generatePDFStatement,
} = require('../services/statementFileService');

const {
  sendAccountStatementEmail,
} = require('../services/emailService');

// ============================================================
// ZENIMONIES ACCOUNT STATEMENT ROUTES
// ============================================================

// POST /api/statements/email
//
// Authenticated customers can request their own
// account statement.
//
// Supported formats: PDF and CSV.
//
// The destination email is always obtained from
// the authenticated customer's database record.
//
// Never accept a recipient email from the client.

// ============================================================
// EMAIL ACCOUNT STATEMENT
// ============================================================

router.post(
  '/email',
  authenticateToken,
  async (req, res) => {
    try {
      // ------------------------------------------------------
      // 1. AUTHENTICATION
      // ------------------------------------------------------

      if (
        !req.user ||
        !req.user.id
      ) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication is required.',
        });
      }

      // ------------------------------------------------------
      // 2. VALIDATE REQUEST BODY
      // ------------------------------------------------------

      const body = req.body;

      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid statement request.',
        });
      }

      const {
        startDate,
        endDate,
        format,
      } = body;

      if (
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Please provide both start and end dates.',
        });
      }

      // ------------------------------------------------------
      // 3. VALIDATE STATEMENT DATES
      // ------------------------------------------------------

      let dates;

      try {
        dates = validateStatementDates(
          startDate,
          endDate
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            'Please provide valid statement dates.',
        });
      }

      // ------------------------------------------------------
      // 4. VALIDATE FILE FORMAT
      // ------------------------------------------------------

      const selectedFormat =
        typeof format === 'string'
          ? format.toLowerCase().trim()
          : '';

      if (
        !['pdf', 'csv'].includes(
          selectedFormat
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Format must be PDF or CSV.',
        });
      }

      // ------------------------------------------------------
      // 5. BUILD AUTHENTICATED CUSTOMER STATEMENT
      // ------------------------------------------------------

      const statement =
        await buildAccountStatement({
          userId: req.user.id,
          startDate: dates.startDate,
          endDate: dates.endDate,
        });

      if (
        !statement ||
        !statement.customer ||
        !statement.account ||
        !statement.statement
      ) {
        throw new Error(
          'Statement generation returned incomplete data.'
        );
      }

      const registeredEmail =
        statement.customer.email;

      if (
        typeof registeredEmail !== 'string' ||
        !registeredEmail.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A registered email address could not be found for your account.',
        });
      }

      // ------------------------------------------------------
      // 6. GENERATE PDF OR CSV
      // ------------------------------------------------------

      let attachmentBuffer;
      let contentType;
      let filename;

      if (selectedFormat === 'pdf') {
        attachmentBuffer =
          await generatePDFStatement(
            statement
          );

        contentType =
          'application/pdf';

        filename =
          `ZENIMONIES-Statement-${dates.startDate}-to-${dates.endDate}.pdf`;

        if (
          !Buffer.isBuffer(
            attachmentBuffer
          ) ||
          attachmentBuffer.length === 0
        ) {
          throw new Error(
            'PDF statement generation failed.'
          );
        }

        // Verify the PDF file signature.
        const pdfHeader =
          attachmentBuffer
            .subarray(0, 5)
            .toString('ascii');

        if (pdfHeader !== '%PDF-') {
          throw new Error(
            'Generated statement is not a valid PDF.'
          );
        }

      } else {
        const csv =
          generateCSVStatement(
            statement
          );

        if (
          typeof csv !== 'string' ||
          !csv.trim()
        ) {
          throw new Error(
            'CSV statement generation failed.'
          );
        }

        attachmentBuffer =
          Buffer.from(
            '\uFEFF' + csv,
            'utf8'
          );

        contentType =
          'text/csv';

        filename =
          `ZENIMONIES-Statement-${dates.startDate}-to-${dates.endDate}.csv`;
      }

      // ------------------------------------------------------
      // 7. SEND TO REGISTERED EMAIL
      // ------------------------------------------------------

      await sendAccountStatementEmail({
        to: registeredEmail.trim(),

        fullName:
          statement.customer.fullName,

        startDate:
          dates.startDate,

        endDate:
          dates.endDate,

        format:
          selectedFormat,

        attachmentBuffer,

        contentType,

        filename,
      });

      // ------------------------------------------------------
      // 8. RETURN SUCCESS
      // ------------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          'Your account statement has been sent to your registered email address.',

        data: {
          format:
            selectedFormat,

          startDate:
            dates.startDate,

          endDate:
            dates.endDate,
        },
      });

    } catch (error) {
      console.error(
        'Statement email request failed:',
        error.message
      );

      // ------------------------------------------------------
      // 9. SAFE ERROR RESPONSES
      // ------------------------------------------------------

      if (
        error.message ===
        'No active customer account was found.'
      ) {
        return res.status(404).json({
          success: false,
          message:
            'No active account was found.',
        });
      }

      return res.status(500).json({
        success: false,
        message:
          'Unable to send your account statement right now. Please try again later.',
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
