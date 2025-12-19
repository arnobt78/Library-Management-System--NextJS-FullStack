/**
 * Multi-provider Email Service
 * Primary: Brevo (supports all email providers including Yahoo, Outlook, etc.)
 * Fallback: Resend (currently limited to Gmail)
 */

// Brevo Configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "arnobt78@gmail.com";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "BookWise Library";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Resend Configuration (Fallback)
const RESEND_API_KEY = process.env.RESEND_TOKEN;
const RESEND_SENDER_EMAIL = "BookWise Library <onboarding@resend.dev>";

/**
 * Send email via Brevo API (Primary Provider)
 */
async function sendEmailViaBrevo(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<{ messageId: string; provider: string }> {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY not configured");
  }

  const emailData = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlContent,
    textContent: textContent,
    replyTo: {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    },
    headers: {
      "X-Mailer": "BookWise Library Email System",
      "Auto-Submitted": "auto-generated",
    },
  };

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return {
    messageId: result.messageId || result.id || "unknown",
    provider: "Brevo",
  };
}

/**
 * Send email via Resend API (Fallback Provider)
 */
async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<{ messageId: string; provider: string }> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: RESEND_SENDER_EMAIL,
    to: [to],
    subject: subject,
    html: htmlContent,
    text: textContent,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  return {
    messageId: data?.id || "unknown",
    provider: "Resend",
  };
}

/**
 * Send email with automatic fallback
 * Tries: Brevo → Resend
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - Email HTML content
 * @param textContent - Email plain text content
 * @returns Email send result with provider info
 */
export async function sendEmailWithFallback(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<{ success: boolean; messageId?: string; provider?: string; error?: string }> {
  const providers = [
    {
      name: "Brevo",
      send: () => sendEmailViaBrevo(to, subject, htmlContent, textContent),
    },
    {
      name: "Resend",
      send: () => sendEmailViaResend(to, subject, htmlContent, textContent),
    },
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`📧 Attempting to send email via ${provider.name}...`);
      const result = await provider.send();
      console.log(`✅ Email sent successfully via ${provider.name} to ${to}`);
      return {
        success: true,
        provider: result.provider,
        messageId: result.messageId,
      };
    } catch (error) {
      console.warn(`⚠️ ${provider.name} failed:`, error instanceof Error ? error.message : "Unknown error");
      lastError = error instanceof Error ? error : new Error("Unknown error");
      // Continue to next provider
    }
  }

  // All providers failed
  console.error("❌ All email providers failed");
  return {
    success: false,
    error: `Failed to send email via all providers. Last error: ${lastError?.message || "Unknown error"}`,
  };
}

