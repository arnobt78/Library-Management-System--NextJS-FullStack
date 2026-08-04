/**
 * Transactional emails for make-admin Approve / Decline decisions.
 * Uses Brevo → Resend via sendEmailWithFallback; failures are logged only.
 */

import { sendEmailWithFallback } from "@/lib/services/email-service";
import config from "@/lib/config";

export type AdminRequestDecisionEmailInput = {
  to: string;
  fullName: string;
  status: "APPROVED" | "REJECTED";
  requestId: string;
  reviewedAt: Date | string | null | undefined;
  rejectionReason?: string | null;
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

function formatReviewedAt(value: Date | string | null | undefined): {
  iso: string;
  display: string;
} {
  const date =
    value instanceof Date
      ? value
      : value
        ? new Date(value)
        : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    iso: safe.toISOString(),
    display: safe.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }),
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build subject + HTML + plain text for an admin-request decision email.
 * Pure helper — safe to unit-test without network.
 */
export function buildAdminRequestDecisionEmail(
  input: AdminRequestDecisionEmailInput,
): { subject: string; html: string; text: string } {
  const approved = input.status === "APPROVED";
  const { iso, display } = formatReviewedAt(input.reviewedAt);
  const reference = input.requestId;
  const base = appBaseUrl();
  const ctaPath = approved ? "/admin" : "/make-admin";
  const ctaUrl = base ? `${base}${ctaPath}` : ctaPath;
  const ctaLabel = approved ? "Open Admin Dashboard" : "View request status";
  const subject = approved
    ? "BookWise: Admin request approved"
    : "BookWise: Admin request declined";
  const headline = approved
    ? "Your admin access request was approved"
    : "Your admin access request was declined";
  const bodyLead = approved
    ? `Hi ${input.fullName}, you now have administrator privileges on BookWise.`
    : `Hi ${input.fullName}, your request for administrator access was not approved at this time.`;
  const reasonBlock =
    !approved && input.rejectionReason?.trim()
      ? input.rejectionReason.trim()
      : null;

  const textLines = [
    headline,
    "",
    bodyLead,
    "",
    `Decision: ${approved ? "Approved" : "Declined"}`,
    `When (UTC): ${display}`,
    `Timestamp (ISO): ${iso}`,
    `Reference: ${reference}`,
  ];
  if (reasonBlock) {
    textLines.push("", `Note from reviewer:`, reasonBlock);
  }
  textLines.push(
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    "This is an automated message from BookWise Library. Please do not reply to this email.",
  );
  const text = textLines.join("\n");

  const reasonHtml = reasonBlock
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f4f4f5;border-left:3px solid #71717a;border-radius:4px;color:#3f3f46;font-size:14px;line-height:1.5;"><strong>Note from reviewer</strong><br/>${escapeHtml(reasonBlock)}</p>`
    : "";

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
        <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">Admin access decision</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(headline)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3f3f46;">${escapeHtml(bodyLead)}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;color:#52525b;">
          <tr>
            <td style="padding:6px 0;width:120px;"><strong>Decision</strong></td>
            <td style="padding:6px 0;">${approved ? "Approved" : "Declined"}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;"><strong>When (UTC)</strong></td>
            <td style="padding:6px 0;">${escapeHtml(display)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;"><strong>ISO time</strong></td>
            <td style="padding:6px 0;font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(iso)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;"><strong>Reference</strong></td>
            <td style="padding:6px 0;font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(reference)}</td>
          </tr>
        </table>
        ${reasonHtml}
        <p style="margin:24px 0 0;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:10px 16px;background:#18181b;color:#fafafa;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${escapeHtml(ctaLabel)}</a>
        </p>
      </div>
      <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.5;">
        <p style="margin:0;">Automated message from BookWise Library. Reference <span style="font-family:ui-monospace,monospace;">${escapeHtml(reference)}</span>.</p>
        <p style="margin:8px 0 0;">Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Send approve/decline notification. Never throws to callers — log failures only.
 */
export async function notifyAdminRequestDecision(
  input: AdminRequestDecisionEmailInput,
): Promise<void> {
  try {
    const { subject, html, text } = buildAdminRequestDecisionEmail(input);
    const result = await sendEmailWithFallback(input.to, subject, html, text);
    if (!result.success) {
      console.error(
        "Admin request decision email failed:",
        result.error ?? "unknown",
      );
    }
  } catch (error) {
    console.error("Admin request decision email error:", error);
  }
}
