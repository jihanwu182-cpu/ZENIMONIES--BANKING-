
const { Resend } = require('resend');

// ============================================================
// RESEND EMAIL CONFIGURATION
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

// ============================================================
// VALIDATE EMAIL CONFIGURATION
// ============================================================

const validateEmailConfig = () => {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  if (!RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is not configured.');
  }
};

// ============================================================
// RESEND CLIENT
// ============================================================

const getResendClient = () => {
  validateEmailConfig();

  return new Resend(RESEND_API_KEY);
};

// ============================================================
// PASSWORD RESET EMAIL
// Preserve existing password-reset functionality.
// ============================================================

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  if (!to || !resetUrl) {
    throw new Error(
      'Recipient email and reset URL are required.'
    );
  }

  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject: 'Reset Your Zenimonies Password',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 20px;
          background-color: #f4f7fb;
          font-family: Arial, sans-serif;
          color: #1f2937;
        ">
          <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            background-color: #ffffff;
            border-radius: 12px;
          ">
            <h2 style="color: #14532d;">
              ZENIMONIES
            </h2>

            <h3>Password Reset Request</h3>

            <p>
              We received a request to reset your
              Zenimonies Banking password.
            </p>

            <p>
              Click the button below to reset your password.
            </p>

            <p style="margin: 30px 0;">
              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  padding: 14px 24px;
                  background-color: #166534;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                "
              >
                Reset Password
              </a>
            </p>

            <p>
              If you did not request a password reset,
              you can safely ignore this email.
            </p>

            <p style="
              margin-top: 30px;
              color: #6b7280;
              font-size: 12px;
            ">
              For your security, do not share your
              password or verification codes with anyone.
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #e5e7eb;
            " />

            <p style="
              color: #6b7280;
              font-size: 12px;
            ">
              ZENIMONIES Banking<br />
              Automated security notification.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error(
      'Password reset email failed:',
      error.message
    );

    throw new Error('Unable to send password reset email.');
  }

  console.log(
    'Password reset email sent:',
    data?.id
  );

  return data;
};

// ============================================================
// ACCOUNT STATEMENT EMAIL
// Sends an account statement as a PDF or CSV attachment.
//
// IMPORTANT:
// - The recipient must be the verified account email
//   retrieved from the authenticated user's database record.
// - Never accept an arbitrary recipient email from the client.
// - Statement generation and authorization are handled
//   by the statement route and statement services.
// ============================================================

const sendAccountStatementEmail = async ({
  to,
  fullName,
  startDate,
  endDate,
  format,
  attachmentBuffer,
}) => {
  if (!to || typeof to !== 'string') {
    throw new Error(
      'A registered recipient email is required.'
    );
  }

  if (!attachmentBuffer || !Buffer.isBuffer(attachmentBuffer)) {
    throw new Error(
      'A valid statement attachment buffer is required.'
    );
  }

  if (!['pdf', 'csv'].includes(format)) {
    throw new Error(
      'Statement format must be PDF or CSV.'
    );
  }

  if (!startDate || !endDate) {
    throw new Error(
      'Statement start date and end date are required.'
    );
  }

  if (attachmentBuffer.length === 0) {
    throw new Error(
      'The statement attachment is empty.'
    );
  }

  // Conservative attachment limit to prevent oversized emails.
  const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

  if (attachmentBuffer.length > MAX_ATTACHMENT_SIZE) {
    throw new Error(
      'Statement attachment exceeds the permitted size.'
    );
  }

  const resend = getResendClient();

  const safeName =
    typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()
      : 'Customer';

  const extension = format === 'pdf' ? 'pdf' : 'csv';

  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : 'text/csv';

  const filename =
    `ZENIMONIES_Statement_${startDate}_to_${endDate}.${extension}`;

  // Resend accepts attachment content as base64.
  const attachmentContent =
    attachmentBuffer.toString('base64');

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject: 'Your ZENIMONIES Account Statement',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 20px;
          background-color: #f4f7fb;
          font-family: Arial, sans-serif;
          color: #1f2937;
        ">
          <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            background-color: #ffffff;
            border-radius: 12px;
          ">
            <h2 style="color: #14532d;">
              ZENIMONIES
            </h2>

            <h3>Your Account Statement</h3>

            <p>
              Dear ${escapeHtml(safeName)},
            </p>

            <p>
              Your requested ZENIMONIES Banking account
              statement is attached to this email.
            </p>

            <div style="
              padding: 16px;
              margin: 20px 0;
              background-color: #f0fdf4;
              border-radius: 8px;
            ">
              <p style="margin: 6px 0;">
                <strong>Statement period:</strong>
              </p>

              <p style="margin: 6px 0;">
                ${escapeHtml(startDate)}
                to
                ${escapeHtml(endDate)}
              </p>

              <p style="margin: 6px 0;">
                <strong>File format:</strong>
                ${format.toUpperCase()}
              </p>
            </div>

            <p>
              Please keep your statement private and
              store it securely. It may contain
              confidential financial information.
            </p>

            <p>
              If you did not request this statement,
              please contact ZENIMONIES support.
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #e5e7eb;
            " />

            <p style="
              color: #6b7280;
              font-size: 12px;
            ">
              ZENIMONIES Banking<br />
              Automated account notification.
            </p>
          </div>
        </body>
      </html>
    `,
    attachments: [
      {
        filename,
        content: attachmentContent,
        contentType,
      },
    ],
  });

  if (error) {
    console.error(
      'Account statement email failed:',
      error.message
    );

    throw new Error(
      'Unable to send account statement email.'
    );
  }

  console.log(
    'Account statement email sent:',
    data?.id
  );

  return data;
};

// ============================================================
// HTML ESCAPING
// ============================================================

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sendPasswordResetEmail,
  sendAccountStatementEmail,
};
