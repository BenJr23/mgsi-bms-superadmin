'use server'

import nodemailer from 'nodemailer'

export async function sendCredentialsEmail(input: {
  userEmail: string
  userName: string
  password: string
}): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: input.userEmail,
      subject: 'GreatWork Spaces - Your Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .header {
                background: linear-gradient(135deg, #7c2d12 0%, #b91c1c 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .greeting {
                font-size: 16px;
                margin-bottom: 20px;
              }
              .credentials-box {
                background-color: #f3f4f6;
                border-left: 4px solid #b91c1c;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
              }
              .credentials-box label {
                display: block;
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
                font-weight: bold;
              }
              .credentials-box .value {
                display: block;
                font-size: 14px;
                color: #1f2937;
                margin-bottom: 15px;
                word-break: break-all;
              }
              .credentials-box .value:last-child {
                margin-bottom: 0;
              }
              .important {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
                font-size: 14px;
              }
              .important strong {
                color: #b91c1c;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #666;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #b91c1c;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to GreatWork Spaces</h1>
              </div>
              <div class="content">
                <div class="greeting">
                  <p>Hi <strong>${input.userName}</strong>,</p>
                  <p>Your account has been successfully created. Below are your login credentials:</p>
                </div>

                <div class="credentials-box">
                  <label>Email Address:</label>
                  <span class="value">${input.userEmail}</span>

                  <label>Temporary Password:</label>
                  <span class="value">${input.password}</span>
                </div>

                <div class="important">
                  <strong>Important:</strong>
                  <p>Please keep your credentials safe and secure. We recommend changing your password after your first login. Do not share this email with anyone.</p>
                </div>

                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in" class="button">
                    Sign In to Your Account
                  </a>
                </div>

                <div style="margin-top: 30px; font-size: 13px; color: #666;">
                  <p><strong>Next Steps:</strong></p>
                  <ol>
                    <li>Go to the login page using the link above</li>
                    <li>Enter your email and temporary password</li>
                    <li>Update your profile information if needed</li>
                    <li>Change your password to something secure</li>
                  </ol>
                </div>

                <div class="footer">
                  <p>© 2026 GreatWork Spaces. All rights reserved.</p>
                  <p>If you didn't create this account, please contact support immediately.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
GreatWork Spaces - Your Account Credentials

Hi ${input.userName},

Your account has been successfully created. Below are your login credentials:

Email Address: ${input.userEmail}
Temporary Password: ${input.password}

Important:
Please keep your credentials safe and secure. We recommend changing your password after your first login.

Sign in at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in

© 2026 GreatWork Spaces
      `,
    })

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}
