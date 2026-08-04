"use server";

import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { signIn } from "@/auth";
import ratelimit from "@/lib/ratelimit";
import { redirect } from "next/navigation";
import { workflowClient } from "@/lib/workflow";
import config from "@/lib/config";
import { hashPassword } from "@/lib/auth/password";
import { getClientRateLimitKey } from "@/lib/request/clientKey";
import { assertPersistedMediaUrl } from "@/lib/media/serverValidation";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { signInSchema, signUpSchema } from "@/lib/validations";
import { after } from "next/server";
import { notifyWelcomeSignup } from "@/lib/email/welcomeSignup";

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">,
) => {
  const clientKey = await getClientRateLimitKey();
  const { success } = await ratelimit.limit(clientKey);

  if (!success) return redirect("/too-fast");

  // Server actions are public network boundaries; repeat validation even
  // though the form already validates for immediate user feedback.
  const parsed = signInSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: "Invalid email or password" };
  }
  const { email, password } = parsed.data;

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: result.error };
    }

    const row = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const accountStatus = row[0]?.status;
    return {
      success: true as const,
      accountStatus:
        accountStatus === "PENDING" ||
        accountStatus === "APPROVED" ||
        accountStatus === "REJECTED"
          ? accountStatus
          : undefined,
    };
  } catch {
    return { success: false, error: "Signin error" };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const clientKey = await getClientRateLimitKey();
  const { success } = await ratelimit.limit(clientKey);

  if (!success) return redirect("/too-fast");

  const parsed = signUpSchema.safeParse(params);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      success: false,
      error: typeof field === "string" ? field : "Signup error",
      fieldError: issue?.message ?? "Please check your registration details.",
    };
  }
  const { fullName, email, universityId, password, universityCard } =
    parsed.data;

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        error: "email",
        fieldError:
          "This email is already registered. Please use a different email or sign in.",
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
        fieldError:
          "This University ID is already registered. Please use a different ID or contact support if this is your ID.",
      };
    }

    const hashedPassword = await hashPassword(password);
    await assertPersistedMediaUrl(universityCard, "image");
    await db.insert(users).values({
      fullName,
      email,
      universityId,
      password: hashedPassword,
      universityCard,
    });

    // Reliable welcome (Brevo→Resend); independent of optional QStash onboarding
    after(async () => {
      await notifyWelcomeSignup({ to: email, fullName });
    });

    // Only trigger workflow in production or if explicitly enabled
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_WORKFLOWS === "true"
    ) {
      try {
        await workflowClient.trigger({
          url: `${config.env.prodApiEndpoint}/api/workflows/onboarding`,
          body: {
            email,
            fullName,
          },
        });
      } catch {
        // Account persistence is authoritative; provider failure must not report a false rollback.
      }
    }

    const signInResult = await signInWithCredentials({ email, password });
    if (!signInResult.success) {
      return signInResult;
    }

    revalidateMutationPaths("user.write");
    // New registrations always start PENDING (schema default).
    return { success: true as const, accountStatus: "PENDING" as const };
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
        fieldError:
          "University ID is too large. Maximum allowed 8-digit number.",
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
          fieldError:
            "This email is already registered. Please use a different email or sign in.",
        };
      } else if (error.message.includes("university_id")) {
        return {
          success: false,
          error: "universityId",
          fieldError:
            "This University ID is already registered. Please use a different ID or contact support if this is your ID.",
        };
      }
    }

    return {
      success: false,
      error: "Signup error. Please check your information and try again.",
    };
  }
};
