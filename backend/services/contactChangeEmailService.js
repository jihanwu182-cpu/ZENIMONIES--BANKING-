
const { Resend } = require('resend');

const sendContactChangeEmail = async ({ to, otp }) => {
  if (
    typeof to !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    typeof otp !== 'string' ||
    !/^\d{6}$/.test(otp)
  ) {
    throw new Error('A valid email address and verification code are required.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error('Email delivery is not configured.');
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Verify your new ZENIMONIES email address',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family:Arial,sans-serif;color:#1f2937;padding:24px">
          <div style="max-width:520px;margin:auto">
            <h2 style="color:#166534">ZENIMONIES</h2>
            <h3>Verify your new email address</h3>
            <p>You requested to change the email address on your
            ZENIMONIES Banking account.</p>
            <p>Your six-digit verification code is:</p>
            <div style="font-size:30px;font-weight:bold;letter-spacing:8px;
                        padding:18px;background:#f3f4f6;text-align:center">
              ${otp}
            </div>
            <p>This code expires in 10 minutes. Do not share it with anyone.</p>
            <p>If you did not request this change, you can ignore this email.
            Your existing registered email address has not been changed.</p>
            <hr style="border:0;border-top:1px solid #e5e7eb">
            <p style="font-size:12px;color:#6b7280">
              ZENIMONIES Banking — Automated security notification.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error('Contact-change email delivery failed:', error.message);
    throw new Error('Unable to send the verification email.');
  }

  return data;
};

module.exports = { sendContactChangeEmail };
