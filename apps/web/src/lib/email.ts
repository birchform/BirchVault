import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@birchvault.com';
const VERIFY_FROM_EMAIL = process.env.RESEND_VERIFY_EMAIL || 'verify@birchvault.co.uk';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BirchVault';

interface SendAccountDeletionEmailParams {
  to: string;
  restoreUrl: string;
  deletionDate: Date;
}

export async function sendAccountDeletionEmail({
  to,
  restoreUrl,
  deletionDate,
}: SendAccountDeletionEmailParams): Promise<{ success: boolean; error?: string }> {
  const formattedDate = deletionDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `Your ${APP_NAME} account is scheduled for deletion`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deletion Scheduled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                🔐 ${APP_NAME}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Account Deletion Scheduled
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Your ${APP_NAME} account has been scheduled for deletion. All your data, including vault items, will be permanently deleted on:
              </p>
              
              <div style="margin: 0 0 24px 0; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                  ${formattedDate}
                </p>
              </div>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>Changed your mind?</strong> You can restore your account any time before this date by clicking the button below:
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <a href="${restoreUrl}" style="display: inline-block; padding: 14px 32px; background-color: #18181b; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Restore My Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; color: #3b82f6; font-size: 14px; word-break: break-all;">
                ${restoreUrl}
              </p>
              
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">
              
              <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                If you did not request this deletion, please restore your account immediately and change your master password.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
${APP_NAME} - Account Deletion Scheduled

Your ${APP_NAME} account has been scheduled for deletion.

All your data, including vault items, will be permanently deleted on: ${formattedDate}

Changed your mind? You can restore your account any time before this date by visiting:
${restoreUrl}

If you did not request this deletion, please restore your account immediately and change your master password.

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      `.trim(),
    });

    if (error) {
      console.error('Failed to send deletion email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email sending error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

interface SendVerificationEmailParams {
  to: string;
  verificationUrl: string;
  userName?: string;
}

export async function sendVerificationEmail({
  to,
  verificationUrl,
  userName,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const displayName = userName || 'there';
  const currentYear = new Date().getFullYear();

  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${VERIFY_FROM_EMAIL}>`,
      to,
      subject: `Verify your ${APP_NAME} account`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0c0c0d;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0c0c0d;">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
          
          <!-- Logo & Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #10b981 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                      <img src="https://birchvault.co.uk/shield-icon.png" alt="" width="28" height="28" style="display: block;" onerror="this.style.display='none'">
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">${APP_NAME}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #1a1a1c 0%, #141416 100%); border: 1px solid #2a2a2e; border-radius: 24px; overflow: hidden;">
                
                <!-- Decorative Top Accent -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #6ee7b7 50%, #34d399 100%);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    
                    <!-- Icon -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                      <tr>
                        <td align="center">
                          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(110, 231, 183, 0.1) 100%); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 50%; margin: 0 auto;">
                            <table role="presentation" style="width: 100%; height: 80px; border-collapse: collapse;">
                              <tr>
                                <td align="center" valign="middle">
                                  <span style="font-size: 36px;">🔐</span>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Greeting -->
                    <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.3px;">
                      Welcome to ${APP_NAME}!
                    </h1>
                    
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #a1a1aa; text-align: center;">
                      Hey ${displayName}, thanks for signing up! Please verify your email address to activate your secure vault and start protecting your passwords.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                      <tr>
                        <td align="center">
                          <a href="${verificationUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                            Verify My Email
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Divider -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                      <tr>
                        <td style="border-bottom: 1px solid #2a2a2e;"></td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; text-align: center;">
                      Button not working? Copy and paste this link:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 13px; color: #10b981; text-align: center; word-break: break-all; background: rgba(16, 185, 129, 0.1); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                      ${verificationUrl}
                    </p>
                    
                    <!-- Expiry Notice -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 12px; padding: 16px;">
                      <tr>
                        <td style="padding: 16px;">
                          <table role="presentation" style="border-collapse: collapse;">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: top;">
                                <span style="font-size: 20px;">⏰</span>
                              </td>
                              <td>
                                <p style="margin: 0; font-size: 14px; color: #fbbf24; font-weight: 600;">
                                  This link expires in 24 hours
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 13px; color: #a1a1aa;">
                                  Request a new verification email if this one expires.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Features Section -->
          <tr>
            <td style="padding: 32px 0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 8px; width: 33.33%;" valign="top">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; text-align: center;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 24px;">🛡️</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">Zero-Knowledge</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #71717a;">End-to-end encrypted</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding: 0 8px; width: 33.33%;" valign="top">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; text-align: center;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 24px;">🔑</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">Secure Vault</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #71717a;">Military-grade security</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding: 0 8px; width: 33.33%;" valign="top">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; text-align: center;">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 24px;">🌐</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">Cross-Platform</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #71717a;">Access anywhere</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; border-top: 1px solid #2a2a2e;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; text-align: center;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #52525b;">
                      © ${currentYear} ${APP_NAME}. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #3f3f46;">
                      You received this email because you signed up for ${APP_NAME}.<br>
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Welcome to ${APP_NAME}!

Hey ${displayName}, thanks for signing up!

Please verify your email address to activate your secure vault and start protecting your passwords.

Click here to verify: ${verificationUrl}

This link expires in 24 hours. Request a new verification email if this one expires.

If you didn't sign up for ${APP_NAME}, you can safely ignore this email.

© ${currentYear} ${APP_NAME}. All rights reserved.
      `.trim(),
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Verification email sending error:', err);
    return { success: false, error: 'Failed to send verification email' };
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  userName?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const displayName = userName || 'there';
  const currentYear = new Date().getFullYear();

  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0c0c0d;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0c0c0d;">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 28px; font-weight: 700; color: #ffffff;">🔐 ${APP_NAME}</span>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #1a1a1c 0%, #141416 100%); border: 1px solid #2a2a2e; border-radius: 24px; overflow: hidden;">
                
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #ef4444 0%, #f97316 100%);"></td>
                </tr>
                
                <tr>
                  <td style="padding: 48px 40px;">
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                      <tr>
                        <td align="center">
                          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 50%;">
                            <table role="presentation" style="width: 100%; height: 80px; border-collapse: collapse;">
                              <tr>
                                <td align="center" valign="middle">
                                  <span style="font-size: 36px;">🔑</span>
                                </td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #ffffff; text-align: center;">
                      Reset Your Password
                    </h1>
                    
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #a1a1aa; text-align: center;">
                      Hey ${displayName}, we received a request to reset your password. Click the button below to choose a new one.
                    </p>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                      <tr>
                        <td style="border-bottom: 1px solid #2a2a2e;"></td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; text-align: center;">
                      Or copy this link:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 13px; color: #ef4444; text-align: center; word-break: break-all; background: rgba(239, 68, 68, 0.1); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
                      ${resetUrl}
                    </p>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0; font-size: 14px; color: #fbbf24; font-weight: 600;">
                            ⚠️ Didn't request this?
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #a1a1aa;">
                            If you didn't request a password reset, you can safely ignore this email. Your password won't change.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #52525b;">
                © ${currentYear} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #3f3f46;">
                This link expires in 1 hour for security reasons.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Reset Your Password

Hey ${displayName}, we received a request to reset your password.

Click here to reset: ${resetUrl}

This link expires in 1 hour for security reasons.

If you didn't request this, you can safely ignore this email.

© ${currentYear} ${APP_NAME}. All rights reserved.
      `.trim(),
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Password reset email sending error:', err);
    return { success: false, error: 'Failed to send password reset email' };
  }
}
