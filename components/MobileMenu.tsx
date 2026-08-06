"use client";

/**
 * MobileMenu Component
 *
 * Client component for mobile navigation menu (phone and sm screens).
 * Displays user info and navigation links in a drawer-style menu.
 */

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PrefetchLink from "@/components/PrefetchLink";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { showToast } from "@/lib/toast";
import UserAvatar from "@/components/UserAvatar";
import { UTILITY_NAVIGATION_ITEMS } from "@/constants/navigation";
import { setPendingAuthToast } from "@/lib/auth/authToast";

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      setPendingAuthToast("logout", fullName);
      document.cookie =
        "logout-in-progress=true; path=/; max-age=10; SameSite=Lax";

      await signOut({
        redirect: true,
        callbackUrl: "/sign-in",
      });

    } catch {
      setIsLoggingOut(false);
      showToast.error(
        "Logout Failed",
        "There was an error logging out. Please try again.",
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
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-drawer"
      >
        {isOpen ? (
          <X className="size-5 sm:size-6" />
        ) : (
          <Menu className="size-5 sm:size-6" />
        )}
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
        id="mobile-navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`fixed right-0 top-0 z-50 h-full w-4/5 bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-600 p-3 sm:p-4">
            {/* Profile Image — local /images, remote URL, or ImageKit via UserAvatar */}
            <div className="relative size-7 overflow-hidden rounded-full border-2 border-gray-600 sm:size-8">
              <UserAvatar
                universityCard={universityCard}
                fullName={fullName}
                email={email}
                size={32}
                className="size-full"
              />
            </div>
            <h2 className="text-base font-semibold text-light-100 sm:text-lg">
              Menu
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                ref={closeButtonRef}
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
            <p className="text-xs font-semibold text-light-100 sm:text-sm">
              {fullName}
            </p>
            <p className="mt-1 text-[10px] text-light-200/70 sm:text-xs">
              {email}
            </p>
            <p className="mt-1 text-[10px] text-light-200/70 sm:text-xs">
              University ID: {universityId}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 space-y-1 p-3 sm:p-4">
            <PrefetchLink
              href="/all-books"
              prefetchKind="all-books"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
              aria-current={pathname === "/all-books" ? "page" : undefined}
            >
              All Books
            </PrefetchLink>
            <PrefetchLink
              href="/my-profile"
              prefetchKind="my-profile"
              onClick={closeMenu}
              className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
              aria-current={pathname === "/my-profile" ? "page" : undefined}
            >
              Borrow History
            </PrefetchLink>
            {UTILITY_NAVIGATION_ITEMS.filter(
              (item) => !item.adminOnly || isAdmin,
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="flex items-center gap-2 rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                aria-current={pathname === item.href ? "page" : undefined}
              >
                <item.icon className="size-4 shrink-0 opacity-90" aria-hidden />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="my-2 border-t border-gray-600"></div>
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase text-light-200/70 sm:px-3 sm:py-2 sm:text-xs">
                  Admin
                </p>
                <PrefetchLink
                  href="/admin"
                  prefetchKind="admin-dashboard"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Dashboard Overview
                </PrefetchLink>
                <PrefetchLink
                  href="/admin/users"
                  prefetchKind="admin-users"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Users
                </PrefetchLink>
                <PrefetchLink
                  href="/admin/books"
                  prefetchKind="admin-books"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Books
                </PrefetchLink>
                <PrefetchLink
                  href="/admin/book-requests"
                  prefetchKind="admin-book-requests"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Borrow Requests
                </PrefetchLink>
                <PrefetchLink
                  href="/admin/account-requests"
                  prefetchKind="admin-account-requests"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Sign-up Requests
                </PrefetchLink>
                <PrefetchLink
                  href="/admin/book-reviews"
                  prefetchKind="admin-reviews"
                  onClick={closeMenu}
                  className="block rounded-md p-2.5 text-sm text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 active:bg-gray-700 active:text-light-200 sm:p-3 sm:text-base sm:hover:bg-gray-700 sm:hover:text-light-200"
                >
                  Book Reviews
                </PrefetchLink>
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
              className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 p-2.5 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50 sm:p-3 sm:text-base"
            >
              {isLoggingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
