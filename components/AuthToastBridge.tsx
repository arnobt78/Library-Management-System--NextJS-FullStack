"use client";

/**
 * AuthToastBridge — consumes deferred auth toasts after navigation.
 * Mount on homepage for welcome/signup; mount on sign-in for logout.
 */

import { useEffect } from "react";
import {
  consumePendingAuthToast,
  type AuthToastKind,
} from "@/lib/auth/authToast";
import { showToast } from "@/lib/toast";

type AuthToastBridgeProps = {
  kinds: AuthToastKind[];
};

export default function AuthToastBridge({ kinds }: AuthToastBridgeProps) {
  const kindsKey = kinds.join(",");

  useEffect(() => {
    const allowed = kindsKey.split(",") as AuthToastKind[];

    // Defer one frame so Toaster is mounted after full-page redirect remount
    const timer = window.setTimeout(() => {
      const pending = consumePendingAuthToast(allowed);
      if (!pending) return;

      if (pending.kind === "welcome") {
        showToast.auth.signInSuccess(pending.name);
      } else if (pending.kind === "signup") {
        showToast.auth.signUpSuccess(pending.name);
      } else if (pending.kind === "logout") {
        showToast.auth.logoutSuccess(pending.name);
      }

      if (
        pending.accountStatus === "PENDING" &&
        (pending.kind === "welcome" || pending.kind === "signup")
      ) {
        showToast.auth.pendingApproval(pending.name);
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [kindsKey]);

  return null;
}
