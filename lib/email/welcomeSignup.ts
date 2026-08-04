/**
 * Welcome email after new student signup.
 * Mentions pending librarian approval and optional make-admin path after APPROVED.
 * Text-only (no <img>) — Brevo → Resend via sendEmailWithFallback.
 */

import { sendEmailWithFallback } from "@/lib/services/email-service";
import config from "@/lib/config";
import { buildUniqueDecisionSubject } from "@/lib/email/decisionSubject";

export type WelcomeSignupEmailInput = {
  to: string;
  fullName: string;
};

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_PROD_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_API_ENDPOINT ||
    config.env.prodApiEndpoint ||
    config.env.apiEndpoint ||
    "";
  return raw.replace(/\/$/, "");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build subject + HTML + plain text for signup welcome (pending approval).
 */
export function buildWelcomeSignupEmail(
  input: WelcomeSignupEmailInput,
): { subject: string; html: string; text: string } {
  const now = new Date();
  const subject = buildUniqueDecisionSubject("Welcome to BookWise", now);
  const base = appBaseUrl();
  const signInUrl = base ? `${base}/sign-in` : "/sign-in";
  const makeAdminUrl = base ? `${base}/make-admin` : "/make-admin";
  const headline = "Welcome to BookWise Library";
  const bodyLead = `Hi ${input.fullName}, thanks for creating a BookWise account. Your registration is pending librarian approval before you can borrow books.`;

  const text = [
    headline,
    "",
    bodyLead,
    "",
    "What happens next:",
    "- An admin reviews your sign-up request.",
    "- After approval you can browse and borrow from the catalog.",
    `- Once approved, you may optionally request admin access at ${makeAdminUrl}.`,
    "",
    `Sign in: ${signInUrl}`,
    "",
    "This is an automated message from BookWise Library. Please do not reply to this email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;background:#18181b;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#fafafa;">BookWise Library</p>
        <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">Welcome</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(headline)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3f3f46;">${escapeHtml(bodyLead)}</p>
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#18181b;">What happens next</p>
        <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.55;color:#3f3f46;">
          <li>An admin reviews your sign-up request.</li>
          <li>After approval you can browse and borrow from the catalog.</li>
          <li>Once approved, you may optionally request administrator access.</li>
        </ul>
        <p style="margin:24px 0 0;">
          <a href="${escapeHtml(signInUrl)}" style="display:inline-block;padding:10px 16px;background:#18181b;color:#fafafa;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Sign in</a>
        </p>
      </div>
      <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.5;">
        <p style="margin:0;">Automated message from BookWise Library.</p>
        <p style="margin:8px 0 0;">Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/** Send welcome email; never throws to callers. */
export async function notifyWelcomeSignup(
  input: WelcomeSignupEmailInput,
): Promise<void> {
  try {
    const { subject, html, text } = buildWelcomeSignupEmail(input);
    const result = await sendEmailWithFallback(input.to, subject, html, text);
    if (!result.success) {
      console.error("Welcome signup email failed:", result.error ?? "unknown");
    }
  } catch (error) {
    console.error("Welcome signup email error:", error);
  }
}
