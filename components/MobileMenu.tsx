"use client";

/**
 * MobileMenu Component
 *
 * Client component for mobile navigation menu (phone and sm screens).
 * Displays user info and navigation links in a drawer-style menu.
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { IKImage } from "imagekitio-next";
import config from "@/lib/config";
import { showToast } from "@/lib/toast";

interface MobileMenuProps {
  fullName: string;
  email: string;
  universityId: number;
  universityCard: string;
  isAdmin: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  fullName,
  email,
  universityId,
  universityCard,
  isAdmin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      showToast.auth.logoutSuccess();
      document.cookie =
        "logout-in-progress=true; path=/; max-age=10; SameSite=Lax";

      await signOut({
        redirect: true,
        callbackUrl: "/sign-in",
      });

      setTimeout(() => {
        queryClient.clear();
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      showToast.error(
        "Logout Failed",
        "There was an error logging out. Please try again."
      );
    }
  };

  const closeMenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-light-100 hover:text-light-200 focus:outline-none md:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="size-5 sm:size-6" /> : <Menu className="size-5 sm:size-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-4/5 bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-600 p-3 sm:p-4">
            {/* Profile Image */}
            <div className="relative size-7 overflow-hidden rounded-full border-2 border-gray-600 sm:size-8">
              {universityCard ? (
                universityCard.startsWith("http") ? (
                  <Image
                    src={universityCard}
                    alt="Profile"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 28px, 32px"
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
            </div>
            <h2 className="text-base font-semibold text-light-100 sm:text-lg">Menu</h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                }}
                className="text-light-100 hover:text-light-200 focus:outline-none"
                aria-label="Close menu"
              >
                <X className="size-5 sm:size-6" />
              </button>
            </div>
          </div>

          {/* User Info Section */}
          <div className="border-b border-gray-600 p-3 sm:p-4">
            <p className="text-xs font-semibold text-light-100 sm:text-sm">{fullName}</p>
            <p className="mt-1 text-[10px] text-light-200/70 sm:text-xs">{email}</p>
            <p className="mt-1 text-[10px] text-light-200/70 sm:text-xs">
              University ID: {universityId}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 space-y-1 p-3 sm:p-4">
            <Link
              href="/all-books"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
            >
              All Books
            </Link>
            <Link
              href="/my-profile"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
            >
              My Profile
            </Link>
            <Link
              href="/api-docs"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
            >
              API Docs
            </Link>
            <Link
              href="/api-status"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
            >
              API Status
            </Link>
            <Link
              href="/performance"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
            >
              Performance
            </Link>
            {isAdmin && (
              <>
                <div className="my-2 border-t border-gray-600"></div>
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase text-light-200/70 sm:px-3 sm:py-2 sm:text-xs">
                  Admin
                </p>
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Dashboard Overview
                </Link>
                <Link
                  href="/admin/users"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Users
                </Link>
                <Link
                  href="/admin/books"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Books
                </Link>
                <Link
                  href="/admin/book-requests"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Borrow Requests
                </Link>
                <Link
                  href="/admin/account-requests"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Account Requests
                </Link>
                <Link
                  href="/admin/business-insights"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Analytics Dashboard
                </Link>
                <Link
                  href="/admin/automation"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Automation Center
                </Link>
              </>
            )}
            {!isAdmin && (
              <Link
                href="/make-admin"
                onClick={closeMenu}
                className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
              >
                Become Admin
              </Link>
            )}
          </div>

          {/* Logout Section */}
          <div className="border-t border-gray-600 p-3 sm:p-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full rounded-md bg-red-600 p-2.5 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50 sm:p-3 sm:text-base"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
