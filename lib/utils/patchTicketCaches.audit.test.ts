/**
 * densifyTicketDetailAudit — fills actorUniversityCard from sibling reply/audit.
 * Parent: Activity avatar densify fix
 */

import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { densifyTicketDetailAudit } from "@/lib/utils/patchTicketCaches";

function makeDetail(
  overrides: Partial<SupportTicketDetail> = {},
): SupportTicketDetail {
  return {
    id: "t-1",
    subject: "Help",
    description: "Need help logging in",
    status: "OPEN",
    priority: "MEDIUM",
    userId: "user-1",
    userName: "Test User",
    userEmail: "test@user.com",
    userUniversityCard: "/cards/user.jpg",
    userUniversityId: 1001,
    assignedToId: null,
    assignedToName: null,
    assignedToEmail: null,
    assignedToUniversityCard: null,
    relatedBookId: null,
    relatedBookTitle: null,
    replyCount: 1,
    createdAt: "2026-08-13T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    notes: null,
    replies: [
      {
        id: "r-1",
        ticketId: "t-1",
        userId: "admin-1",
        userName: "Test Admin",
        userEmail: "test@admin.com",
        userUniversityCard: "/cards/admin.jpg",
        userRole: "ADMIN",
        body: "Working on it",
        createdAt: "2026-08-14T00:00:00.000Z",
      },
    ],
    updatedById: null,
    updatedByName: null,
    updatedByEmail: null,
    updatedByUniversityCard: null,
    auditEvents: [],
    ...overrides,
  };
}

describe("densifyTicketDetailAudit", () => {
  it("enriches null actorUniversityCard from sibling reply", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.tickets.detail("t-1"), makeDetail());

    densifyTicketDetailAudit(client, {
      ticketId: "t-1",
      action: "UPDATE",
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: null,
      details: { subject: "Help", reply: true },
    });

    const next = client.getQueryData<SupportTicketDetail>(
      queryKeys.tickets.detail("t-1"),
    );
    expect(next?.auditEvents?.[0]?.label).toBe("Reply added");
    expect(next?.auditEvents?.[0]?.actorUniversityCard).toBe(
      "/cards/admin.jpg",
    );
  });

  it("keeps explicit actorUniversityCard from caller", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.tickets.detail("t-1"), makeDetail());

    densifyTicketDetailAudit(client, {
      ticketId: "t-1",
      action: "UPDATE",
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: "/cards/explicit.jpg",
      details: { status: "IN_PROGRESS" },
    });

    const next = client.getQueryData<SupportTicketDetail>(
      queryKeys.tickets.detail("t-1"),
    );
    expect(next?.auditEvents?.[0]?.actorUniversityCard).toBe(
      "/cards/explicit.jpg",
    );
  });
});
