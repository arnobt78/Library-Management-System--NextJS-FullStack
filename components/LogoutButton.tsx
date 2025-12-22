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

      // CRITICAL: Clear React Query cache before logout
      // This ensures no stale data persists after logout
      invalidateAllQueries(queryClient);
      queryClient.clear();

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
    <Button onClick={handleLogout} type="button" disabled={isLoggingOut}>
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
};

export default LogoutButton;
