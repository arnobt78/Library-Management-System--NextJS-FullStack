"use client";

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
        <Link
          href="/admin"
          className="text-sm text-light-100 transition-colors hover:text-light-200 sm:text-base"
        >
          Admin Dashboard
        </Link>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-700 bg-gray-800 shadow-lg sm:w-48">
          {/* Add a small invisible bridge to prevent hover gap */}
          <div className="absolute inset-x-0 -top-1 h-1"></div>
          <div className="py-1.5 sm:py-2">
            <Link
              href="/admin"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Dashboard Overview
            </Link>
            <Link
              href="/admin/users"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Users
            </Link>
            <Link
              href="/admin/books"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Books
            </Link>
            <Link
              href="/admin/book-requests"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Borrow Requests
            </Link>
            <Link
              href="/admin/account-requests"
              className="block px-3 py-1.5 text-xs text-light-100 transition-colors hover:bg-gray-700 hover:text-light-200 sm:px-4 sm:py-2 sm:text-sm"
            >
              Account Requests
            </Link>
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
