import { describe, expect, it } from "vitest";
import { parseProfilePagination } from "@/lib/actionInputs";
import { signInSchema, signUpSchema } from "@/lib/validations";

describe("server-boundary validation", () => {
  it("accepts and normalizes bounded authentication input", () => {
    expect(
      signInSchema.parse({
        email: " reader@example.test ",
        password: "password123",
      }),
    ).toEqual({
      email: "reader@example.test",
      password: "password123",
    });
    expect(
      signUpSchema.parse({
        fullName: " Reader User ",
        email: " reader@example.test ",
        password: "password123",
        universityId: 12345678,
        universityCard: " https://ik.imagekit.io/demo/card.jpg ",
      }),
    ).toMatchObject({ fullName: "Reader User", email: "reader@example.test" });
  });

  it("rejects oversized credentials and invalid pagination before data work", () => {
    expect(
      signInSchema.safeParse({
        email: "reader@example.test",
        password: "x".repeat(129),
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        fullName: "Reader User",
        email: "reader@example.test",
        password: "password123",
        universityId: 12345678,
        universityCard: "x".repeat(2049),
      }).success,
    ).toBe(false);
    expect(() => parseProfilePagination("not-a-page")).toThrow();
    expect(() => parseProfilePagination(0)).toThrow();
    expect(() => parseProfilePagination(1, 51)).toThrow();
  });
});
