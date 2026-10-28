'use server';

/**
 * @fileOverview Brevo Email Service for Digital Class.
 * Handles automated SMTP transmissions for user lifecycle events.
 */

// Load environment variables safely
const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const SENDER_EMAIL = process.env.SENDER_EMAIL!;
const SENDER_NAME = process.env.SENDER_NAME!;

interface WelcomeEmailParams {
  toEmail: string;
  businessName: string;
}

interface ForgotPasswordEmailParams {
  toEmail: string;
  businessName: string;
  resetLink: string;
  template?: string;
  instituteLogo?: string;
}

/**
 * Sends a welcome email to new institutes using the Brevo API.
 */
export async function sendWelcomeEmail({ toEmail, businessName }: WelcomeEmailParams) {
  const endpoint = "https://api.brevo.com/v3/smtp/email";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 20px; background-color: #ffffff;">
      <h2 style="color: hsl(var(--primary)); margin-top: 0; font-size: 24px;">Welcome to Digital Class! 🚀</h2>
      <p>Dear <strong>${businessName}</strong>,</p>
      <p>Welcome to Digital Class, India’s First Ed-Tech Marketplace & SAAS Platform.</p>
      <p>Your 3-Day Free Trial has been successfully activated. You can now start exploring our AI-Integrated Institute/School Management System along with Digital Class Marketplace.</p>

      <div style="background-color: #f8fafc; padding: 20px; border-radius: 15px; margin: 25px 0; border: 1px solid #f1f5f9;">
        <h3 style="color: #1e3a8a;">With Digital Class, you can:</h3>
        <ul>
          <li>✅ Manage Students, Fees, Admissions & Academic Records in one platform</li>
          <li>✅ Run your Institute/School through Web & Mobile App anytime, anywhere</li>
          <li>✅ Get a Dynamic SEO-Enabled Website to attract students from Google</li>
          <li>✅ Automate Daily Operations and save valuable administrative time</li>
          <li>✅ Track Reports, Analytics & Performance in real time</li>
        </ul>
      </div>

      <div style="background-color: #fffaf0; padding: 20px; border-radius: 15px; margin: 25px 0; border: 1px solid #feebc8;">
        <h3 style="color: #c05621;">Marketplace Growth Opportunities:</h3>
        <ul>
          <li>🌟 Increase Visibility by listing your institute and courses on the Digital Class Marketplace</li>
          <li>🌟 Sell & Monetize Your Courses Online to reach students across India</li>
          <li>🌟 Promote your institute through Marketplace Advertisements</li>
          <li>🌟 Generate more inquiries and admissions through our education platform</li>
        </ul>
      </div>

      <div style="margin: 35px 0; text-align: center;">
        <a href="https://erp.digitalclassworld.in" style="background-color: hsl(var(--primary)); color: white; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: bold;">🔹 Login Now to Your Account</a>
      </div>

      <p>If you need assistance, our team is happy to support you at <a href="mailto:${SENDER_EMAIL}">${SENDER_EMAIL}</a>.</p>
      <p>Best Regards,<br/>Team Digital Class for ${businessName}</p>
    </div>
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: toEmail, name: businessName }],
        subject: "Welcome to Digital Class – Your 3-Day Free Trial is Now Active 🚀",
        htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API Error:", errorData);
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    console.error("Email Service Error:", error);
    return { success: false, error };
  }
}

/**
 * Sends a password recovery email using a custom template if provided.
 */
export async function sendForgotPasswordEmail({ toEmail, businessName, resetLink, template, instituteLogo }: ForgotPasswordEmailParams) {
  const endpoint = "https://api.brevo.com/v3/smtp/email";

  let htmlContent = template 
    ? template.replace(/\{\{name\}\}/g, businessName).replace(/\{\{link\}\}/g, resetLink)
    : `
    <div style="font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${instituteLogo || 'https://ik.imagekit.io/2wtn9m5bl/default-institute-logo.png'}" alt="Logo" style="max-height: 80px;" />
      </div>
      <h2 style="color: #1e3a8a; margin-top: 0; font-size: 24px; text-align: center;">Account Recovery</h2>
      <p>Dear <strong>${businessName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to proceed with the recovery node.</p>

      <div style="margin: 35px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #10b981; color: white; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Reset Password Link</a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">
        If you didn't request this, you can safely ignore this email. This link will expire shortly for your security.
      </p>
    </div>
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: toEmail, name: businessName }],
        subject: `Password Recovery - ${businessName}`,
        htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API Error:", errorData);
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    console.error("Email Service Error:", error);
    return { success: false, error };
  }
}
