
const express = require('express');

const router = express.Router();

const { authenticateToken } = require('../utils/authMiddleware');

// ============================================================
// ZENIMONIES ACCOUNT STATEMENT ROUTES
// ============================================================

// Send account statement to the authenticated customer's
// registered email address.
//
// POST /api/statements/email
//
// Request body:
// {
//   "startDate": "2026-09-01",
//   "endDate": "2026-09-25",
//   "format": "pdf"
// }
//
// Supported formats: pdf, csv

router.post('/email', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, format } = req.body;

    // Validate required dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both start and end dates.',
      });
    }

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(startDate) ||
      !datePattern.test(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Dates must use YYYY-MM-DD format.',
      });
    }

    // Validate actual calendar dates
    const isValidDate = (dateString) => {
      const date = new Date(`${dateString}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === dateString
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid calendar dates.',
      });
    }

    // Ensure the date range is valid
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
    }

    // Limit statement requests to a maximum of one year
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    const days =
      (end.getTime() - start.getTime()) /
      (1000 * 60 * 60 * 24);

    if (days > 365) {
      return res.status(400).json({
        success: false,
        message: 'Statement period cannot exceed 366 calendar days.',
      });
    }

    // Validate requested file format
    const selectedFormat = String(format || '').toLowerCase();

    if (!['pdf', 'csv'].includes(selectedFormat)) {
      return res.status(400).json({
        success: false,
        message: 'Format must be PDF or CSV.',
      });
    }

    // The authenticated statement-generation and email service
    // will be connected here in the next step.
    //
    // Do not send statements using a client-supplied email address.
    // The backend must retrieve the verified email belonging to
    // req.user.id and retrieve transactions for that user's account.

    return res.status(501).json({
      success: false,
      message:
        'Account statement delivery is being configured. Please try again later.',
    });
  } catch (error) {
    console.error('Statement request error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to process your statement request.',
    });
  }
});

module.exports = router;
