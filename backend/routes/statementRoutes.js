
const express = require('express');

const router = express.Router();

const { authenticateToken } = require('../utils/authMiddleware');

const {
  buildAccountStatement,
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
// Authenticated customers can email their own account
// statement to the email address registered on their account.
//
// Supported formats: pdf, csv
//
// The recipient email is retrieved from the database.
// A client-supplied email address is never accepted.

router.post(
  '/email',
  authenticateToken,
  async (req, res) => {
    try {
      const { startDate, endDate, format } = req.body || {};

      // ======================================================
      // 1. VALIDATE DATES
      // ======================================================

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message:
            'Please provide both start and end dates.',
        });
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      if (
        typeof startDate !== 'string' ||
        typeof endDate !== 'string' ||
        !datePattern.test(startDate) ||
        !datePattern.test(endDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Dates must use YYYY-MM-DD format.',
        });
      }

      const isValidDate = (dateString) => {
        const date = new Date(
          `${dateString}T00:00:00.000Z`
        );

        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === dateString
        );
      };

      if (
        !isValidDate(startDate) ||
        !isValidDate(endDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Please provide valid calendar dates.',
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message:
            'Start date cannot be after end date.',
        });
      }

      // ======================================================
      // 2. VALIDATE STATEMENT PERIOD
      // Maximum 365 calendar days, inclusive.
      // ======================================================

      const start = new Date(
        `${startDate}T00:00:00.000Z`
      );

      const end = new Date(
        `${endDate}T00:00:00.000Z`
      );

      const days =
        (end.getTime() - start.getTime()) /
          (1000 * 60 * 60 * 24) +
        1;

      if (days > 365) {
        return res.status(400).json({
          success: false,
          message:
            'Statement period cannot exceed 365 calendar days.',
        });
      }

      // ======================================================
      // 3. VALIDATE FORMAT
      // ======================================================

      const selectedFormat = String(
        format || ''
      ).toLowerCase();

      if (!['pdf', 'csv'].includes(selectedFormat)) {
        return res.status(400).json({
          success: false,
          message:
            'Format must be PDF or CSV.',
        });
      }

      // ======================================================
      // 4. GET AUTHENTICATED CUSTOMER STATEMENT
      // ======================================================

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication is required.',
        });
      }

      const statement = await buildAccountStatement({
        userId: req.user.id,
        startDate,
        endDate,
      });

      if (
        !statement ||
        !statement.customer ||
        !statement.customer.email
      ) {
        return res.status(404).json({
          success: false,
          message:
            'A registered email address could not be found for your account.',
        });
      }

      // ======================================================
      // 5. GENERATE STATEMENT FILE
      // ======================================================

      let attachmentBuffer;
      let contentType;

      if (selectedFormat === 'pdf') {
        const pdfResult =
          await generatePDFStatement(statement);

        attachmentBuffer = Buffer.isBuffer(pdfResult)
          ? pdfResult
          : Buffer.from(pdfResult);

        contentType = 'application/pdf';
      } else {
        const csvResult =
          await generateCSVStatement(statement);

        attachmentBuffer = Buffer.isBuffer(csvResult)
          ? csvResult
          : Buffer.from(
              String(csvResult),
              'utf8'
            );

        contentType = 'text/csv';
      }

      if (
        !Buffer.isBuffer(attachmentBuffer) ||
        attachmentBuffer.length === 0
      ) {
        throw new Error(
          'Statement file generation failed.'
        );
      }

      // ======================================================
      // 6. SEND TO REGISTERED EMAIL
      // ======================================================

      await sendAccountStatementEmail({
        to: statement.customer.email,
        fullName: statement.customer.fullName,
        startDate,
        endDate,
        format: selectedFormat,
        attachmentBuffer,
      });

      // ======================================================
      // 7. RETURN SUCCESS
      // Only return success after the email provider
      // confirms the request was accepted.
      // ======================================================

      return res.status(200).json({
        success: true,
        message:
          'Your account statement has been sent to your registered email address.',
        data: {
          format: selectedFormat,
          startDate,
          endDate,
        },
      });
    } catch (error) {
      console.error(
        'Statement email request failed:',
        error.message
      );

      // Do not expose database errors, internal paths,
      // account details, or email provider credentials.

      if (
        error.message &&
        (
          error.message.includes('Invalid start date') ||
          error.message.includes('Invalid end date') ||
          error.message.includes('date range')
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Please check your statement dates and try again.',
        });
      }

      if (
        error.message &&
        error.message.includes('No active account')
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

module.exports = router;
