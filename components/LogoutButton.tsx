"use client";

/**
 * LogoutButton Component
 *
 * Client component for handling logout with React Query cache clearing.
 * Prevents white screen flash by using optimized logout flow.
 *
 * Features:
 * - Clears React Query cache before logout
 * - Shows toast notification
 * - Smooth transition to sign-in page
 * - Prevents white screen flash
 */

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { invalidateAllQueries } from "@/lib/utils/queryInvalidation";

const LogoutButton: React.FC = () => {
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    // Prevent multiple clicks
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      // Show toast notification first
      showToast.auth.logoutSuccess();

      // CRITICAL: Set logout flag to prevent UI updates during logout
      // This prevents flickering/blinking of images and components during logout transition
      document.cookie =
        "logout-in-progress=true; path=/; max-age=10; SameSite=Lax";

      // CRITICAL: Don't invalidate queries during logout - it causes unnecessary refetches
      // and flickering. The queries will naturally fail/clear when session is gone.
      // We'll clear the cache after redirect completes.
      // invalidateAllQueries(queryClient); // Removed to prevent flicker during logout

      // CRITICAL: Use NextAuth's standard built-in redirect
      // This is the recommended approach - NextAuth handles:
      // 1. Session clearing (CSRF token validation)
      // 2. Cookie removal
      // 3. Navigation to callbackUrl
      // No need for manual navigation or cookie workarounds
      await signOut({
        redirect: true, // Standard NextAuth redirect (handles everything)
        callbackUrl: "/sign-in", // Where to redirect after logout
      });

      // CRITICAL: Clear cache AFTER redirect completes (longer delay)
      // This ensures smooth transition - UI stays intact during entire logout process
      // The redirect happens immediately, but we wait longer to ensure page has navigated
      // before clearing cache. This prevents images from disappearing during logout.
      setTimeout(() => {
        queryClient.clear();
      }, 500); // Longer delay to ensure redirect has completed and page has navigated
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      showToast.error(
        "Logout Failed",
        "There was an error logging out. Please try again."
      );
    }
  };

  return (
    <Button onClick={handleLogout} type="button" disabled={isLoggingOut} className="text-sm sm:text-base">
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
};

export default LogoutButton;
