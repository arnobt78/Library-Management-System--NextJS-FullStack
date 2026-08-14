/**
 * activityEventIcon — borrow / ticket / review label → Lucide map.
 * Parent: borrow detail UI tweaks
 */

import { describe, expect, it } from "vitest";
import {
  Ban,
  BookMarked,
  CheckCircle,
  Clock,
  History,
  MessageSquare,
  Pencil,
  PlusCircle,
  Undo2,
} from "lucide-react";
import { activityEventIcon } from "@/lib/ui/activityEventIcon";

describe("activityEventIcon", () => {
  it("maps borrow lifecycle labels", () => {
    expect(activityEventIcon("audit", "Borrow request created")).toBe(
      PlusCircle,
    );
    expect(activityEventIcon("audit", "Status → Cancelled")).toBe(Ban);
    expect(activityEventIcon("audit", "Status → Borrowed")).toBe(BookMarked);
    expect(activityEventIcon("audit", "Status → Returned")).toBe(Undo2);
    expect(activityEventIcon("audit", "Status → Pending")).toBe(Clock);
  });

  it("maps ticket kinds and review status labels", () => {
    expect(activityEventIcon("created", "Ticket created")).toBe(PlusCircle);
    expect(activityEventIcon("updated", "Ticket updated")).toBe(Pencil);
    expect(activityEventIcon("replied", "Reply added")).toBe(MessageSquare);
    expect(activityEventIcon("audit", "Status → Approved")).toBe(CheckCircle);
    expect(activityEventIcon("audit", "Status → Rejected")).toBe(Ban);
  });

  it("falls back to History", () => {
    expect(activityEventIcon("audit", "Something else")).toBe(History);
  });
});
