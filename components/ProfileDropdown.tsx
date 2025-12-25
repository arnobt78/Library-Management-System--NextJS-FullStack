"use client";

/**
 * ProfileDropdown Component
 *
 * Client component that displays user profile image with dropdown menu.
 * Shows user info (Full name, Email, University ID) and actions (Become Admin, Logout).
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { IKImage } from "imagekitio-next";
import config from "@/lib/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/lib/toast";

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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="relative size-8 overflow-hidden rounded-full border-2 border-gray-600 transition-all hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:size-10">
          {universityCard ? (
            universityCard.startsWith("http") ? (
              <Image
                src={universityCard}
                alt="Profile"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 32px, 40px"
              />
            ) : (
              <IKImage
                path={
                  universityCard.startsWith("/")
                    ? universityCard.slice(1)
                    : universityCard
                }
                urlEndpoint={config.env.imagekit.urlEndpoint}
                alt="Profile"
                fill
                className="rounded-full object-cover"
              />
            )
          ) : (
            <div className="flex size-full items-center justify-center bg-gray-700 text-light-100">
              <span className="text-[10px] font-semibold sm:text-xs">
                {fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-gray-600 bg-gray-800/95 text-light-100 sm:w-64"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 sm:px-3 sm:py-2">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-xs font-semibold text-light-100 sm:text-sm">{fullName}</p>
            <p className="text-[10px] text-light-200/70 sm:text-xs">{email}</p>
            <p className="text-[10px] text-light-200/70 sm:text-xs">
              University ID: {universityId}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
        {!isAdmin && (
          <DropdownMenuItem
            asChild
            className="cursor-pointer rounded-md px-0 py-2 text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 focus:bg-gray-700 focus:text-light-200 sm:py-3 [&>a]:block [&>a]:w-full"
          >
            <Link href="/make-admin" className="px-2.5 text-xs sm:px-3 sm:text-sm">
              Become Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer rounded-md px-0 py-2 text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 focus:bg-gray-700 focus:text-light-200 disabled:opacity-50 sm:py-3"
        >
          <span className="block w-full px-2.5 py-0 text-left text-xs sm:px-3 sm:text-sm">
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
