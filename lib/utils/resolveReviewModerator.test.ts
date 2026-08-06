import { describe, expect, it } from "vitest";
import {
  isWeakModeratorName,
  resolveReviewModeratorForDensify,
} from "@/lib/utils/resolveReviewModerator";

describe("resolveReviewModeratorForDensify", () => {
  it("treats an admin placeholder as weak", () => {
    expect(isWeakModeratorName("an admin")).toBe(true);
    expect(isWeakModeratorName("Test Admin")).toBe(false);
  });

  it("prefers post-invalidate join when session/actor are null (no an admin stomp)", () => {
    const fields = resolveReviewModeratorForDensify({
      decisionActor: null,
      sessionUser: null,
      postInvalidate: {
        reviewedBy: "admin-id",
        reviewedByName: "Test Admin",
        reviewedByEmail: "test@admin.com",
        reviewedByUniversityCard: "/images/profile-img2.png",
      },
    });

    expect(fields.reviewedByName).toBe("Test Admin");
    expect(fields.reviewedByEmail).toBe("test@admin.com");
    expect(fields.reviewedByUniversityCard).toBe("/images/profile-img2.png");
    expect(fields.reviewedByName).not.toBe("an admin");
  });

  it("ignores decisionActor placeholder an admin in favor of post-invalidate", () => {
    const fields = resolveReviewModeratorForDensify({
      decisionActor: {
        id: "admin-id",
        fullName: "an admin",
        email: "",
        universityCard: null,
      },
      postInvalidate: {
        reviewedBy: "admin-id",
        reviewedByName: "Test Admin",
        reviewedByEmail: "test@admin.com",
        reviewedByUniversityCard: "/card.png",
      },
    });

    expect(fields.reviewedByName).toBe("Test Admin");
    expect(fields.reviewedByEmail).toBe("test@admin.com");
  });
});
