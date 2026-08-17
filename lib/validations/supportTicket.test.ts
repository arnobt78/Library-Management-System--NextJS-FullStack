/**
 * Support ticket Zod schema unit tests.
 * Parent: CR-0003 / REQ-0034 — admin on-behalf create validation
 */
import { describe, expect, it } from "vitest";
import {
  adminCreateSupportTicketSchema,
  createSupportTicketSchema,
} from "@/lib/validations/supportTicket";

const validUuid = "10000000-0000-4000-8000-000000000001";

describe("adminCreateSupportTicketSchema", () => {
  it("accepts valid admin on-behalf payload", () => {
    const result = adminCreateSupportTicketSchema.safeParse({
      subject: "Fine dispute — borrow request",
      description: "Borrower disputes accrued fine on request abc.",
      requesterUserId: validUuid,
      relatedBookId: "20000000-0000-4000-8000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid requesterUserId", () => {
    const result = adminCreateSupportTicketSchema.safeParse({
      subject: "Fine dispute — borrow request",
      description: "Borrower disputes accrued fine on request abc.",
      requesterUserId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short subject on admin path", () => {
    const result = adminCreateSupportTicketSchema.safeParse({
      subject: "Hi",
      description: "Borrower disputes accrued fine on request abc.",
      requesterUserId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe("createSupportTicketSchema", () => {
  it("does not accept requesterUserId (user self-create)", () => {
    const result = createSupportTicketSchema.safeParse({
      subject: "Need help with my account",
      description: "I cannot access my borrow history page.",
      requesterUserId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("requesterUserId" in result.data).toBe(false);
    }
  });
});
