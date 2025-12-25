/**
 * Admin Book Requests Page
 *
 * Server Component that fetches borrow requests server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 */

import React from "react";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import AdminBookRequestsList from "@/components/AdminBookRequestsList";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) => {
  const params = await searchParams;

  // Fetch all data server-side for SSR
  const result = await getAllBorrowRequests();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load borrow requests
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {result.error || "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rawRequests = result.data || [];

  // Transform to match BorrowRecordWithDetails type
  // Drizzle's date() type returns strings (YYYY-MM-DD), timestamp() returns Date objects
  // BorrowRecordWithDetails expects: borrowDate as Date, dueDate/returnDate as string, fineAmount as string
  const requests = rawRequests.map((record) => {
    // Handle dueDate: Drizzle date() returns string (YYYY-MM-DD format)
    const dueDateValue = record.dueDate as string | Date | null;
    let dueDateStr: string | null = null;
    if (dueDateValue) {
      if (typeof dueDateValue === "string") {
        dueDateStr = dueDateValue;
      } else {
        dueDateStr = dueDateValue.toISOString().split("T")[0];
      }
    }

    // Handle returnDate: Drizzle date() returns string (YYYY-MM-DD format)
    const returnDateValue = record.returnDate as string | Date | null;
    let returnDateStr: string | null = null;
    if (returnDateValue) {
      if (typeof returnDateValue === "string") {
        returnDateStr = returnDateValue;
      } else {
        returnDateStr = returnDateValue.toISOString().split("T")[0];
      }
    }

    return {
      id: record.id,
      userId: record.userId,
      bookId: record.bookId,
      borrowDate: record.borrowDate, // timestamp() returns Date object
      dueDate: dueDateStr,
      returnDate: returnDateStr,
      status: record.status as "PENDING" | "BORROWED" | "RETURNED",
      borrowedBy: record.borrowedBy,
      returnedBy: record.returnedBy,
      fineAmount: record.fineAmount || "0.00", // Ensure it's a string
      notes: record.notes,
      renewalCount: record.renewalCount,
      lastReminderSent: record.lastReminderSent, // timestamp() returns Date object
      updatedAt: record.updatedAt, // timestamp() returns Date object
      updatedBy: record.updatedBy,
      createdAt: record.createdAt, // timestamp() returns Date object
      // User details
      userName: record.userName,
      userEmail: record.userEmail,
      userUniversityId: record.userUniversityId,
      // Book details
      bookTitle: record.bookTitle,
      bookAuthor: record.bookAuthor,
      bookGenre: record.bookGenre,
      bookCoverUrl: record.bookCoverUrl,
      bookCoverColor: record.bookCoverColor,
    };
  });

  return (
    <AdminBookRequestsList
      initialRequests={requests}
      successMessage={params.success}
      errorMessage={params.error}
    />
  );
};

export default Page;
