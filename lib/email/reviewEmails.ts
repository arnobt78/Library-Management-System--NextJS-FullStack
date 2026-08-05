/**
 * Transactional email for Book Review moderation decisions.
 * Uses Brevo → Resend via sendEmailWithFallback; failures are logged only —
 * never blocks the moderation mutation that triggered the notification.
 * Parent: CR-0003 / REQ-0034
 */
import { sendEmailWithFallback } from "@/lib/services/email-service";
import { buildUniqueDecisionSubject } from "@/lib/email/decisionSubject";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** New review submitted → every admin (moderation queue). Never throws. */
export async function notifyReviewSubmitted(input: {
  recipients: string[];
  reviewerName: string;
  bookTitle: string;
}): Promise<void> {
  if (input.recipients.length === 0) return;

  const subject = buildUniqueDecisionSubject("New book review awaiting moderation");
  const headline = "New book review awaiting moderation";
  const bodyLead = `${input.reviewerName} submitted a review for "${input.bookTitle}".`;
  const text = [
    headline,
    "",
    bodyLead,
    "",
    "This is an automated message from BookWise Library. Please do not reply to this email.",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;background:#18181b;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#fafafa;">BookWise Library</p>
        <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">Book Review</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(headline)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#3f3f46;">${escapeHtml(bodyLead)}</p>
      </div>
      <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.5;">
        <p style="margin:0;">Automated message from BookWise Library. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  await Promise.all(
    input.recipients.map(async (to) => {
      try {
        const result = await sendEmailWithFallback(to, subject, html, text);
        if (!result.success) {
          console.error("Review submitted email failed:", result.error ?? "unknown");
        }
      } catch (error) {
        console.error("Review submitted email error:", error);
      }
    }),
  );
}

/** Approve/reject decision → the review author. Never throws. */
export async function notifyReviewModerated(input: {
  to: string;
  bookTitle: string;
  status: "APPROVED" | "REJECTED";
}): Promise<void> {
  try {
    const isApproved = input.status === "APPROVED";
    const subject = buildUniqueDecisionSubject(
      isApproved ? "Your review was approved" : "Your review was rejected",
    );
    const headline = isApproved
      ? "Your review is now live"
      : "Your review was not approved";
    const bodyLead = isApproved
      ? `Your review of "${input.bookTitle}" has been approved by a librarian and is now visible to other readers.`
      : `Your review of "${input.bookTitle}" did not pass moderation and will not be shown publicly.`;

    const text = [
      headline,
      "",
      bodyLead,
      "",
      "This is an automated message from BookWise Library. Please do not reply to this email.",
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #e4e4e7;background:#18181b;">
        <p style="margin:0;font-size:18px;font-weight:600;color:#fafafa;">BookWise Library</p>
        <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">Book Review</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">${escapeHtml(headline)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#3f3f46;">${escapeHtml(bodyLead)}</p>
      </div>
      <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.5;">
        <p style="margin:0;">Automated message from BookWise Library. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const result = await sendEmailWithFallback(input.to, subject, html, text);
    if (!result.success) {
      console.error("Review moderated email failed:", result.error ?? "unknown");
    }
  } catch (error) {
    console.error("Review moderated email error:", error);
  }
}
