"use client";

import PrefetchLink from "@/components/PrefetchLink";
import Link from "next/link";
import { useState } from "react";

const AdminDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Main Admin Dashboard Link with padding for better hover area */}
      <div className="px-1.5 py-1 sm:px-2">
        <PrefetchLink
          href="/admin"
          prefetchKind="admin-dashboard"
          className="text-sm text-light-100 transition-colors hover:text-light-200 sm:text-base"
        >
          Admin Dashboard
        </PrefetchLink>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-700 bg-gray-800 shadow-lg sm:w-48">
          {/* Add a small invisible bridge to prevent hover gap */}
          <div className="absolute inset-x-0 -top-1 h-1"></div>
          <div className="py-1.5 sm:py-2">
            <PrefetchLink
              href="/admin"
              prefetchKind="admin-dashboard"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Dashboard Overview
            </PrefetchLink>
            <PrefetchLink
              href="/admin/users"
              prefetchKind="admin-users"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Users
            </PrefetchLink>
            <PrefetchLink
              href="/admin/books"
              prefetchKind="admin-books"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Books
            </PrefetchLink>
            <PrefetchLink
              href="/admin/book-requests"
              prefetchKind="admin-book-requests"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Borrow Requests
            </PrefetchLink>
            <PrefetchLink
              href="/admin/account-requests"
              prefetchKind="admin-account-requests"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Sign-up Requests
            </PrefetchLink>
            <PrefetchLink
              href="/admin/book-reviews"
              prefetchKind="admin-reviews"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Book Reviews
            </PrefetchLink>
            <PrefetchLink
              href="/admin/support-tickets"
              prefetchKind="admin-tickets"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Support Tickets
            </PrefetchLink>
            <Link
              href="/admin/business-insights"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Analytics Dashboard
            </Link>
            <Link
              href="/admin/automation"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Automation Center
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDropdown;
