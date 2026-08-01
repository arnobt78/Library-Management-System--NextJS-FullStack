// Parent: REQ-0025
// Shared HTTP adapter keeps API routes aligned with the server-action policy.

import { NextResponse } from "next/server";
import {
  getAuthorizationFailure,
  requireAdminActor,
  requireAuthenticatedActor,
  type AuthorizedActor,
} from "@/lib/auth/authorization";

type RouteAuthorizationResult =
  | { ok: true; actor: AuthorizedActor }
  | { ok: false; response: NextResponse };

async function authorizeRoute(
  authorize: () => Promise<AuthorizedActor>
): Promise<RouteAuthorizationResult> {
  try {
    return { ok: true, actor: await authorize() };
  } catch (error) {
    const failure = getAuthorizationFailure(error);
    if (!failure) {
      throw error;
    }

    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: failure.status === 401 ? "Unauthorized" : "Forbidden",
          message: failure.message,
        },
        { status: failure.status }
      ),
    };
  }
}

export function authorizeAuthenticatedRoute(): Promise<RouteAuthorizationResult> {
  return authorizeRoute(requireAuthenticatedActor);
}

export function authorizeAdminRoute(): Promise<RouteAuthorizationResult> {
  return authorizeRoute(requireAdminActor);
}
