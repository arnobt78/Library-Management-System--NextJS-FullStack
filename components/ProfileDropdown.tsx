"use client";

/**
 * ProfileDropdown Component
 *
 * Client component that displays user profile image with dropdown menu.
 * Shows user info (Full name, Email, University ID) and actions (Become Admin, Logout).
 */

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/lib/toast";
import UserAvatar from "@/components/UserAvatar";
import { UTILITY_NAVIGATION_ITEMS } from "@/constants/navigation";
import { usePathname } from "next/navigation";
import { LogOut, Loader2, ShieldCheck } from "lucide-react";
import { setPendingAuthToast } from "@/lib/auth/authToast";

interface ProfileDropdownProps {
  fullName: string;
  email: string;
  universityId: number;
  universityCard: string;
  isAdmin: boolean;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  fullName,
  email,
  universityId,
  universityCard,
  isAdmin,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    // Prevent multiple clicks
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      // Defer toast until /sign-in mounts (full redirect clears in-memory toasts)
      setPendingAuthToast("logout", fullName);

      // CRITICAL: Set logout flag to prevent UI updates during logout
      // Also keeps auth layout from redirecting home while session cookie clears
      document.cookie =
        "logout-in-progress=true; path=/; max-age=10; SameSite=Lax";

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
    } catch {
      setIsLoggingOut(false);
      showToast.error(
        "Logout Failed",
        "There was an error logging out. Please try again.",
      );
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="relative size-8 overflow-hidden rounded-full border-2 border-gray-600 transition-all hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:size-10">
          <UserAvatar
            universityCard={universityCard}
            fullName={fullName}
            size={40}
            className="size-full"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-gray-600 bg-gray-800/95 text-light-100 sm:w-64"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 sm:px-3 sm:py-2">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-xs font-semibold text-light-100 sm:text-sm">
              {fullName}
            </p>
            <p className="text-[10px] text-light-200/70 sm:text-xs">{email}</p>
            <p className="text-[10px] text-light-200/70 sm:text-xs">
              University ID: {universityId}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
        {UTILITY_NAVIGATION_ITEMS.filter(
          (item) => !item.adminOnly || isAdmin,
        ).map((item) => (
          <DropdownMenuItem
            key={item.href}
            asChild
            className="cursor-pointer rounded-md px-0 py-2 text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 focus:bg-gray-700 focus:text-light-200 sm:py-3 [&>a]:block [&>a]:w-full"
          >
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="flex items-center gap-2 px-2.5 text-xs sm:px-3 sm:text-sm"
            >
              <item.icon className="size-4 shrink-0 opacity-90" aria-hidden />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gray-600" />
        {!isAdmin && (
          <DropdownMenuItem
            asChild
            className="cursor-pointer rounded-md px-0 py-2 text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 focus:bg-gray-700 focus:text-light-200 sm:py-3 [&>a]:block [&>a]:w-full"
          >
            <Link
              href="/make-admin"
              className="flex items-center px-2.5 text-xs sm:px-3 sm:text-sm"
            >
              <ShieldCheck className="mr-2 inline size-4" />
              Become Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer rounded-md px-0 py-2 text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 focus:bg-gray-700 focus:text-light-200 disabled:opacity-50 sm:py-3"
        >
          <span className="flex w-full items-center gap-2 px-2.5 py-0 text-left text-xs sm:px-3 sm:text-sm">
            {isLoggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
