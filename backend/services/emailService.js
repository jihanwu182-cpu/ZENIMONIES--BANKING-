const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

const validateEmailConfig = () => {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is not configured');
  }
};

const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}) => {
  validateEmailConfig();

  if (!to) {
    throw new Error('Recipient email address is required');
  }

  if (!resetUrl) {
    throw new Error('Password reset URL is required');
  }

  const resend = new Resend(RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject: 'Reset your Zenimonies password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reset your Zenimonies password</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f7f9f8;
            font-family: Arial, Helvetica, sans-serif;
          "
        >
          <div
            style="
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            "
          >
            <div
              style="
                background-color: #ffffff;
                border: 1px solid #e2e8e5;
                border-radius: 16px;
                padding: 40px 30px;
              "
            >
              <div
                style="
                  text-align: center;
                  margin-bottom: 30px;
                "
              >
                <div
                  style="
                    display: inline-block;
                    background-color: #123c2f;
                    color: #ffffff;
                    padding: 12px 20px;
                    border-radius: 10px;
                    font-size: 24px;
                    font-weight: 700;
                  "
                >
                  Zenimonies
                </div>
              </div>

              <h1
                style="
                  color: #123c2f;
                  font-size: 26px;
                  margin: 0 0 16px;
                "
              >
                Reset your password
              </h1>

              <p
                style="
                  color: #4f5d57;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                We received a request to reset the password for your
                Zenimonies account.
              </p>

              <p
                style="
                  color: #4f5d57;
                  font-size: 16px;
                  line-height: 1.6;
                "
              >
                Click the button below to create a new password.
              </p>

              <div
                style="
                  text-align: center;
                  margin: 30px 0;
                "
              >
                <a
                  href="${resetUrl}"
                  style="
                    display: inline-block;
                    background-color: #123c2f;
                    color: #ffffff;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 700;
                  "
                >
                  Reset Password
                </a>
              </div>

              <p
                style="
                  color: #66736e;
                  font-size: 14px;
                  line-height: 1.6;
                "
              >
                This password reset link is temporary and can only be used
                once.
              </p>

              <p
                style="
                  color: #66736e;
                  font-size: 14px;
                  line-height: 1.6;
                "
              >
                If you did not request a password reset, you can safely ignore
                this email.
              </p>

              <hr
                style="
                  border: 0;
                  border-top: 1px solid #e2e8e5;
                  margin: 30px 0;
                "
              />

              <p
                style="
                  color: #8a9590;
                  font-size: 12px;
                  line-height: 1.5;
                  text-align: center;
                "
              >
                This is an automated security email from Zenimonies.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error(
      'Resend password reset email error:',
      error
    );

    throw new Error(
      error.message || 'Failed to send password reset email'
    );
  }

  console.log(
    'Password reset email sent successfully. Email ID:',
    data?.id || 'N/A'
  );

  return {
    success: true,
    id: data?.id || null,
  };
};

module.exports = {
  sendPasswordResetEmail,
};
