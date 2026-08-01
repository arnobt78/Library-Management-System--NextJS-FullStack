// Parent: REQ-0021, REQ-0026
import { getUploadAuthParams } from "@imagekit/next/server";
import config from "@/lib/config";
import { NextResponse } from "next/server";
import { uploadAuthorizationRatelimit } from "@/lib/ratelimit";
import { getClientRateLimitKey } from "@/lib/request/clientKey";

const {
  env: {
    imagekit: { publicKey, privateKey },
  },
} = config;

export async function GET() {
  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint is used for file uploads (book covers, university cards, videos)
    // Authentication is optional to allow sign-up flow (university card upload) to work
    // Rate limiting provides protection against abuse
    const clientKey = await getClientRateLimitKey();
    const { success } = await uploadAuthorizationRatelimit.limit(clientKey);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );
    }

    // Note: Authentication is optional for this endpoint
    // This allows sign-up flow (university card upload) to work before user is authenticated
    // However, rate limiting provides protection against abuse
    // Authenticated users get priority, but unauthenticated users can still use it for sign-up

    const authentication = getUploadAuthParams({ publicKey, privateKey });

    return NextResponse.json({ ...authentication, publicKey });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get ImageKit authentication parameters",
        message: "Upload authorization is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
