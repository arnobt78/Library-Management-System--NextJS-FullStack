/**
 * Transactional emails for Support Tickets (create + reply notifications).
 * Uses Brevo → Resend via sendEmailWithFallback; failures are logged only —
 * never blocks the ticket mutation that triggered the notification.
 * Parent: CR-0003 / REQ-0034
 */
import { sendEmailWithFallback } from "@/lib/services/email-service";
import { buildUniqueDecisionSubject } from "@/lib/email/decisionSubject";
import config from "@/lib/config";

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

function buildTicketEmail(input: {
  headline: string;
  bodyLead: string;
  subjectLabel: string;
  ticketId: string;
  ticketSubject: string;
  ctaPath: string;
  ctaLabel: string;
  extraLine?: string;
}): { subject: string; html: string; text: string } {
  const subject = buildUniqueDecisionSubject(input.subjectLabel);
  const base = appBaseUrl();
  const ctaUrl = base ? `${base}${input.ctaPath}` : input.ctaPath;

  const textLines = [
    input.headline,
    "",
    input.bodyLead,
    "",
    `Ticket: ${input.ticketSubject}`,
    `Reference: ${input.ticketId}`,
  ];
  if (input.extraLine) textLines.push("", input.extraLine);
  textLines.push(
    "",
    `${input.ctaLabel}: ${ctaUrl}`,
    "",
    "This is an automated message from BookWise Library. Please do not reply to this email.",
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;background:#18181b;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#fafafa;">BookWise Library</p>
        <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">Support Ticket</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(input.headline)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3f3f46;">${escapeHtml(input.bodyLead)}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;color:#52525b;">
          <tr><td style="padding:6px 0;width:100px;"><strong>Ticket</strong></td><td style="padding:6px 0;">${escapeHtml(input.ticketSubject)}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Reference</strong></td><td style="padding:6px 0;font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(input.ticketId)}</td></tr>
        </table>
        ${input.extraLine ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f4f4f5;border-left:3px solid #71717a;border-radius:4px;color:#3f3f46;font-size:14px;line-height:1.5;">${escapeHtml(input.extraLine)}</p>` : ""}
        <p style="margin:24px 0 0;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:10px 16px;background:#18181b;color:#fafafa;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${escapeHtml(input.ctaLabel)}</a>
        </p>
      </div>
      <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.5;">
        <p style="margin:0;">Automated message from BookWise Library. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text: textLines.join("\n") };
}

/** New ticket → assigned admin, or every admin when unassigned. Never throws. */
export async function notifyTicketCreated(input: {
  recipients: string[];
  creatorName: string;
  ticketId: string;
  ticketSubject: string;
}): Promise<void> {
  if (input.recipients.length === 0) return;
  const email = buildTicketEmail({
    headline: "New support ticket submitted",
    bodyLead: `${input.creatorName} submitted a new support ticket.`,
    subjectLabel: "New support ticket",
    ticketId: input.ticketId,
    ticketSubject: input.ticketSubject,
    ctaPath: `/admin/support-tickets/${input.ticketId}`,
    ctaLabel: "Open ticket",
  });

  await Promise.all(
    input.recipients.map(async (to) => {
      try {
        const result = await sendEmailWithFallback(to, email.subject, email.html, email.text);
        if (!result.success) {
          console.error("Ticket created email failed:", result.error ?? "unknown");
        }
      } catch (error) {
        console.error("Ticket created email error:", error);
      }
    }),
  );
}

/** New reply → the other party (creator or assignee). Never throws. */
export async function notifyTicketReply(input: {
  to: string;
  replierName: string;
  ticketId: string;
  ticketSubject: string;
  isAdminSide: boolean;
}): Promise<void> {
  try {
    const email = buildTicketEmail({
      headline: "New reply on your support ticket",
      bodyLead: `${input.replierName} replied to a support ticket.`,
      subjectLabel: "Support ticket reply",
      ticketId: input.ticketId,
      ticketSubject: input.ticketSubject,
      ctaPath: input.isAdminSide
        ? `/support-tickets/${input.ticketId}`
        : `/admin/support-tickets/${input.ticketId}`,
      ctaLabel: "View reply",
    });
    const result = await sendEmailWithFallback(input.to, email.subject, email.html, email.text);
    if (!result.success) {
      console.error("Ticket reply email failed:", result.error ?? "unknown");
    }
  } catch (error) {
    console.error("Ticket reply email error:", error);
  }
}

/** Status/priority change → notify the ticket creator. Never throws. */
export async function notifyTicketUpdated(input: {
  to: string;
  ticketId: string;
  ticketSubject: string;
  status: string;
}): Promise<void> {
  try {
    const email = buildTicketEmail({
      headline: "Your support ticket was updated",
      bodyLead: `Your support ticket status changed to ${input.status}.`,
      subjectLabel: "Support ticket updated",
      ticketId: input.ticketId,
      ticketSubject: input.ticketSubject,
      ctaPath: `/support-tickets/${input.ticketId}`,
      ctaLabel: "View ticket",
    });
    const result = await sendEmailWithFallback(input.to, email.subject, email.html, email.text);
    if (!result.success) {
      console.error("Ticket updated email failed:", result.error ?? "unknown");
    }
  } catch (error) {
    console.error("Ticket updated email error:", error);
  }
}
