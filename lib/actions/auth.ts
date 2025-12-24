"use server";

import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";

function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
}
import { signIn } from "@/auth";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { redirect } from "next/navigation";
import { workflowClient } from "@/lib/workflow";
import config from "@/lib/config";

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">
) => {
  const { email, password } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.log(error, "Signin error");
    return { success: false, error: "Signin error" };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, universityId, password, universityCard } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");

  // Validate universityId is within PostgreSQL integer range
  // PostgreSQL integer range: -2,147,483,648 to 2,147,483,647
  // But we'll limit to 8-digit numbers (1 to 99,999,999) for better UX
  const MAX_INTEGER = 2147483647;
  const MAX_8_DIGIT = 99999999;

  // Validate universityId is a whole number (integer)
  if (!Number.isInteger(universityId)) {
    return {
      success: false,
      error: "universityId",
      fieldError: "University ID must be a whole number (no decimals).",
    };
  }

  // Validate universityId is positive
  if (universityId < 1) {
    return {
      success: false,
      error: "universityId",
      fieldError: "University ID must be a positive number.",
    };
  }

  // Validate universityId is within 8-digit range
  if (universityId > MAX_8_DIGIT) {
    return {
      success: false,
      error: "universityId",
      fieldError: "University ID is too large. Maximum allowed 8-digit number.",
    };
  }

  // Validate universityId is within PostgreSQL integer range (safety check)
  if (universityId > MAX_INTEGER) {
    return {
      success: false,
      error: "universityId",
      fieldError: "University ID is too large. Maximum allowed 8-digit number.",
    };
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      success: false,
      error: "email",
      fieldError: "This email is already registered. Please use a different email or sign in.",
    };
  }

  // Check for duplicate university ID
  const existingUniversityId = await db
    .select()
    .from(users)
    .where(eq(users.universityId, universityId))
    .limit(1);

  if (existingUniversityId.length > 0) {
    return {
      success: false,
      error: "universityId",
      fieldError: "This University ID is already registered. Please use a different ID or contact support if this is your ID.",
    };
  }

  // Generate a random salt
  const salt = randomBytes(16);
  // Hash the password with the salt
  const passwordBytes = new TextEncoder().encode(password);
  const hashBuffer = sha256(concatUint8Arrays(passwordBytes, salt));
  // Store salt and hash as base64
  const hashedPassword = `${Buffer.from(salt).toString("base64")}:${Buffer.from(hashBuffer).toString("base64")}`;

  try {
    await db.insert(users).values({
      fullName,
      email,
      universityId,
      password: hashedPassword,
      universityCard,
    });

    // Only trigger workflow in production or if explicitly enabled
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_WORKFLOWS === "true"
    ) {
      await workflowClient.trigger({
        url: `${config.env.prodApiEndpoint}/api/workflows/onboarding`,
        body: {
          email,
          fullName,
        },
      });
    } else {
      console.log("Skipping workflow trigger in development mode");
    }

    await signInWithCredentials({ email, password });

    return { success: true };
  } catch (error) {
    // Check if error is related to integer range
    if (
      error instanceof Error &&
      (error.message.includes("out of range") ||
        error.message.includes("integer") ||
        error.message.includes("22003"))
    ) {
      return {
        success: false,
        error: "universityId",
        fieldError: "University ID is too large. Maximum allowed 8-digit number.",
      };
    }

    // Check if error is related to duplicate email
    if (
      error instanceof Error &&
      (error.message.includes("unique") ||
        error.message.includes("duplicate") ||
        error.message.includes("23505"))
    ) {
      // Check if it's email or universityId duplicate
      if (error.message.includes("email")) {
        return {
          success: false,
          error: "email",
          fieldError: "This email is already registered. Please use a different email or sign in.",
        };
      } else if (error.message.includes("university_id")) {
        return {
          success: false,
          error: "universityId",
          fieldError: "This University ID is already registered. Please use a different ID or contact support if this is your ID.",
        };
      }
    }

    console.log(error, "Signup error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Signup error. Please check your information and try again.",
    };
  }
};
