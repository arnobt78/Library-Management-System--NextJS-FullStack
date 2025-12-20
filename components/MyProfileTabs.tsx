"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookCover from "@/components/BookCover";
import CountdownTimer from "@/components/CountdownTimer";
import {
  BookOpen,
  Clock,
  Calendar,
  AlertTriangle,
  Star,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { returnBook } from "@/lib/admin/actions/borrow";
import { showToast } from "@/lib/toast";
// Define the actual data structure from the database query
interface BorrowRecordWithBook {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date;
  dueDate: Date | null; // Can be null for pending requests
  returnDate?: Date | null;
  status: "PENDING" | "BORROWED" | "RETURNED";
  borrowedBy?: string | null;
  returnedBy?: string | null;
  fineAmount: number;
  notes?: string | null;
  renewalCount: number;
  lastReminderSent?: Date | null;
  updatedAt: Date | null;
  updatedBy?: string | null;
  createdAt: Date | null;
  book: {
    id: string;
    title: string;
    author: string;
    genre: string;
    rating: number;
    totalCopies: number;
    availableCopies: number;
    description: string;
    coverColor: string;
    coverUrl: string;
    videoUrl: string;
    summary: string;
    isbn?: string | null;
    publicationYear?: number | null;
    publisher?: string | null;
    language?: string | null;
    pageCount?: number | null;
    edition?: string | null;
    isActive: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
    updatedBy?: string | null;
  };
}

interface MyProfileTabsProps {
  activeBorrows: BorrowRecordWithBook[];
  pendingRequests: BorrowRecordWithBook[];
  borrowHistory: BorrowRecordWithBook[];
  totalReviews: number;
}

const MyProfileTabs: React.FC<MyProfileTabsProps> = ({
  activeBorrows,
  pendingRequests,
  borrowHistory,
  totalReviews,
}) => {
  const router = useRouter();
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    // Handle timezone-aware timestamps correctly
    const dateObj = typeof date === "string" ? new Date(date) : date;
    // Use UTC methods to avoid timezone conversion issues
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC", // Force UTC to match database storage
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending Approval</Badge>;
      case "BORROWED":
        return <Badge variant="default">Currently Borrowed</Badge>;
      case "RETURNED":
        return (
          <Badge
            variant="default"
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Book Returned
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const BorrowCard: React.FC<{
    record: BorrowRecordWithBook;
    showCountdown?: boolean;
  }> = ({ record, showCountdown = false }) => {
    const handleViewDetails = () => {
      router.push(`/books/${record.book.id}`);
    };

    const handleReturnBook = async () => {
      try {
        const result = await returnBook(record.id);
        if (result.success) {
          if (result.data?.isOverdue) {
            showToast.warning(
              "Book Returned with Fine",
              `"${record.book.title}" was returned ${result.data.daysOverdue} days overdue. Fine: $${result.data.fineAmount.toFixed(2)}`
            );
          } else {
            showToast.book.returnSuccess(record.book.title);
          }
          // Refresh the page to update the data
          setTimeout(() => {
            router.refresh();
          }, 1000);
        } else {
          showToast.book.returnError(result.error || "Failed to return book");
        }
      } catch (error) {
        console.error("Error returning book:", error);
        showToast.book.returnError(
          "An error occurred while returning the book"
        );
      }
    };

    // Calculate if book is overdue (only for BORROWED status with dueDate)
    const today = new Date();
    // Use UTC dates for consistent comparison
    const todayUTC = new Date(
      today.getTime() + today.getTimezoneOffset() * 60000
    );
    const dueDateUTC = record.dueDate ? new Date(record.dueDate) : null;

    const isOverdue =
      record.status === "BORROWED" && dueDateUTC && todayUTC > dueDateUTC;

    // Calculate days overdue using date-level comparison (exactly like backend SQL)
    // Backend: (${now}::date - ${borrowRecords.dueDate}::date)
    // Use UTC dates to avoid timezone issues
    const todayDateUTC = new Date(
      Date.UTC(
        todayUTC.getUTCFullYear(),
        todayUTC.getUTCMonth(),
        todayUTC.getUTCDate()
      )
    );
    const dueDateOnlyUTC = dueDateUTC
      ? new Date(
          Date.UTC(
            dueDateUTC.getUTCFullYear(),
            dueDateUTC.getUTCMonth(),
            dueDateUTC.getUTCDate()
          )
        )
      : null;

    const daysOverdue =
      isOverdue && dueDateOnlyUTC
        ? Math.floor(
            (todayDateUTC.getTime() - dueDateOnlyUTC.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

    const daysRemaining =
      record.status === "BORROWED" && dueDateUTC && !isOverdue
        ? Math.ceil(
            (dueDateUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
    const calculatedFine = isOverdue ? daysOverdue * 1.0 : 0;

    return (
      <Card
        className={`mb-3 border-2 transition-all duration-300 hover:shadow-lg ${
          record.status === "PENDING"
            ? "border-gray-500 bg-gray-800/20"
            : record.status === "BORROWED" && isOverdue
              ? "border-red-600 bg-red-900/10"
              : record.status === "BORROWED" && daysRemaining <= 2 && !isOverdue
                ? "border-orange-400 bg-orange-900/10"
                : record.status === "BORROWED"
                  ? "border-blue-500 bg-blue-900/10"
                  : record.status === "RETURNED"
                    ? "border-green-500 bg-green-900/10"
                    : "border-gray-600 bg-gray-800/30"
        }`}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Full Height Book Cover */}
            <div className="relative w-48 shrink-0">
              <BookCover
                variant="regular"
                coverColor={record.book.coverColor}
                coverImage={record.book.coverUrl}
                className="h-full"
              />
            </div>

            {/* Main Content */}
            <div className="min-w-0 flex-1">
              {/* Header with Status Badge */}
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-light-100">
                    {record.book.title}
                  </h3>
                  <p className="text-base text-light-200/70">
                    by {record.book.author}
                  </p>
                </div>
                {/* Status Badge in Top Right */}
                <div className="ml-2 shrink-0">
                  {getStatusBadge(record.status)}
                </div>
              </div>

              {/* Genre and Rating */}
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 text-sm text-light-100"
                >
                  {record.book.genre}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-current text-yellow-400" />
                  <span className="text-sm text-yellow-400">
                    {record.book.rating}
                  </span>
                </div>
              </div>

              {/* Compact Information */}
              <div className="mb-2 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="size-4 text-blue-400" />
                  <span className="font-medium text-light-100">Borrowed:</span>
                  <span className="text-light-200/70">
                    {formatDate(record.borrowDate)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-4 text-purple-400" />
                  <span className="font-medium text-light-100">Due:</span>
                  <span className="text-light-200/70">
                    {record.dueDate ? formatDate(record.dueDate) : "Not set"}
                  </span>
                </div>
                {record.book.isbn && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="size-4 text-green-400" />
                    <span className="font-medium text-light-100">ISBN:</span>
                    <span className="font-mono text-light-200/70">
                      {record.book.isbn.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              {showCountdown &&
                record.status === "BORROWED" &&
                record.dueDate && (
                  <div className="mb-2">
                    <CountdownTimer
                      dueDate={record.dueDate}
                      borrowDate={record.borrowDate}
                    />
                  </div>
                )}

              {/* Enhanced Status Messages */}
              <div className="mb-2">
                {record.status === "PENDING" && (
                  <div className="flex items-center gap-2 rounded bg-yellow-500/10 px-2 py-1">
                    <Clock className="size-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">
                      Awaiting admin approval
                    </span>
                  </div>
                )}

                {record.status === "BORROWED" && record.dueDate && (
                  <div
                    className={`flex items-center gap-2 rounded px-2 py-1 ${
                      isOverdue
                        ? "bg-red-500/10"
                        : daysRemaining <= 2
                          ? "bg-orange-500/10"
                          : "bg-blue-500/10"
                    }`}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="size-4 text-red-400" />
                    ) : daysRemaining <= 2 ? (
                      <AlertTriangle className="size-4 text-orange-600" />
                    ) : (
                      <BookOpen className="size-4 text-blue-400" />
                    )}
                    <span
                      className={`text-sm ${
                        isOverdue
                          ? "text-red-400"
                          : daysRemaining <= 2
                            ? "text-orange-600"
                            : "text-blue-400"
                      }`}
                    >
                      {isOverdue
                        ? `OVERDUE! ${daysOverdue} days late`
                        : daysRemaining <= 2
                          ? `Due Soon! ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`
                          : `Due on ${formatDate(record.dueDate)}`}
                    </span>
                  </div>
                )}

                {record.status === "RETURNED" && (
                  <div className="flex items-center gap-2 rounded bg-green-500/10 px-2 py-1">
                    <Calendar className="size-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      Successfully returned
                    </span>
                  </div>
                )}
              </div>

              {/* Fine and Renewal Info */}
              <div className="mb-2 flex flex-wrap gap-2">
                {(record.fineAmount > 0 || calculatedFine > 0) && (
                  <div className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1">
                    <AlertTriangle className="size-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">
                      $
                      {(record.fineAmount > 0
                        ? record.fineAmount
                        : calculatedFine
                      ).toFixed(2)}
                    </span>
                    <span className="text-sm text-red-300/70">
                      {isOverdue ? "overdue fine" : "fine"}
                    </span>
                  </div>
                )}

                {record.renewalCount > 0 && (
                  <div className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-1">
                    <RotateCcw className="size-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">
                      {record.renewalCount}
                    </span>
                    <span className="text-sm text-purple-300/70">renewals</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {record.status === "BORROWED" && (
                  <button
                    onClick={handleReturnBook}
                    className={`flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      isOverdue
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-orange-600 text-white hover:bg-orange-700"
                    }`}
                  >
                    <RotateCcw className="size-4" />
                    <span>Return Book</span>
                  </button>
                )}

                {record.status !== "RETURNED" && (
                  <button
                    onClick={handleViewDetails}
                    className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <Eye className="size-4" />
                    <span>View Details</span>
                  </button>
                )}

                {record.status === "RETURNED" && (
                  <button
                    onClick={handleViewDetails}
                    className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Star className="size-4" />
                    <span>Review Book</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold text-light-100">
        My Borrowing History
      </h1>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 border-2 border-gray-600 bg-gray-800/30 p-0">
          <TabsTrigger
            value="active"
            className="rounded-none border-b-2 border-gray-600 px-4 py-3 text-light-200 data-[state=active]:border-b-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Active Borrows ({activeBorrows.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="rounded-none border-b-2 border-gray-600 px-4 py-3 text-light-200 data-[state=active]:border-b-0 data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Pending Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-gray-600 px-4 py-3 text-light-200 data-[state=active]:border-b-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Borrow History ({borrowHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-light-100">
              Currently Borrowed Books
            </h2>
            {activeBorrows.length === 0 ? (
              <Card className="border-2 border-gray-600 bg-gray-800/30">
                <CardContent className="p-6 text-center">
                  <p className="text-light-200/70">No active borrows</p>
                </CardContent>
              </Card>
            ) : (
              activeBorrows.map((record) => (
                <BorrowCard
                  key={record.id}
                  record={record}
                  showCountdown={true}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-light-100">
              Pending Approval
            </h2>
            {pendingRequests.length === 0 ? (
              <Card className="border-2 border-gray-600 bg-gray-800/30">
                <CardContent className="p-6 text-center">
                  <p className="text-light-200/70">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((record) => (
                <BorrowCard key={record.id} record={record} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-light-100">
              Complete Borrow History
            </h2>
            {borrowHistory.length === 0 ? (
              <Card className="border-2 border-gray-600 bg-gray-800/30">
                <CardContent className="p-6 text-center">
                  <p className="text-light-200/70">No borrow history</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Statistics */}
                <Card className="mb-4 border-2 border-gray-600 bg-gray-800/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-light-100">
                      📊 Borrow Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-2 text-center">
                        <p className="text-xl font-bold text-gray-900">
                          {borrowHistory.length}
                        </p>
                        <p className="text-xs text-gray-600">Total Borrows</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2 text-center">
                        <p className="text-xl font-bold text-blue-600">
                          {
                            borrowHistory.filter((r) => r.status === "PENDING")
                              .length
                          }
                        </p>
                        <p className="text-xs text-blue-700">Pending</p>
                      </div>
                      <div className="rounded-lg bg-orange-50 p-2 text-center">
                        <p className="text-xl font-bold text-orange-600">
                          {
                            borrowHistory.filter((r) => r.status === "BORROWED")
                              .length
                          }
                        </p>
                        <p className="text-xs text-orange-700">Active</p>
                      </div>
                      <div className="rounded-lg bg-green-100 p-2 text-center">
                        <p className="text-xl font-bold text-green-600">
                          {
                            borrowHistory.filter((r) => r.status === "RETURNED")
                              .length
                          }
                        </p>
                        <p className="text-xs text-green-700">Book Returned</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-red-50 p-2 text-center">
                        <p className="text-lg font-bold text-red-600">
                          {
                            borrowHistory.filter((r) => {
                              // Use same logic as individual cards for consistency
                              const today = new Date();
                              const todayUTC = new Date(
                                today.getTime() +
                                  today.getTimezoneOffset() * 60000
                              );
                              const dueDateUTC = r.dueDate
                                ? new Date(r.dueDate)
                                : null;

                              const isOverdue =
                                r.status === "BORROWED" &&
                                dueDateUTC &&
                                todayUTC > dueDateUTC;

                              if (isOverdue && dueDateUTC) {
                                const todayDateUTC = new Date(
                                  Date.UTC(
                                    todayUTC.getUTCFullYear(),
                                    todayUTC.getUTCMonth(),
                                    todayUTC.getUTCDate()
                                  )
                                );
                                const dueDateOnlyUTC = new Date(
                                  Date.UTC(
                                    dueDateUTC.getUTCFullYear(),
                                    dueDateUTC.getUTCMonth(),
                                    dueDateUTC.getUTCDate()
                                  )
                                );
                                const daysOverdue = Math.floor(
                                  (todayDateUTC.getTime() -
                                    dueDateOnlyUTC.getTime()) /
                                    (1000 * 60 * 60 * 24)
                                );
                                return daysOverdue > 0;
                              }

                              return r.fineAmount > 0; // Use stored fine for returned books
                            }).length
                          }
                        </p>
                        <p className="text-xs text-red-700">With Fines</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2 text-center">
                        <p className="text-lg font-bold text-red-600">
                          $
                          {borrowHistory
                            .reduce((sum, r) => {
                              // Calculate fine using same logic as individual cards
                              const today = new Date();
                              const todayUTC = new Date(
                                today.getTime() +
                                  today.getTimezoneOffset() * 60000
                              );
                              const dueDateUTC = r.dueDate
                                ? new Date(r.dueDate)
                                : null;

                              const isOverdue =
                                r.status === "BORROWED" &&
                                dueDateUTC &&
                                todayUTC > dueDateUTC;

                              if (isOverdue && dueDateUTC) {
                                const todayDateUTC = new Date(
                                  Date.UTC(
                                    todayUTC.getUTCFullYear(),
                                    todayUTC.getUTCMonth(),
                                    todayUTC.getUTCDate()
                                  )
                                );
                                const dueDateOnlyUTC = new Date(
                                  Date.UTC(
                                    dueDateUTC.getUTCFullYear(),
                                    dueDateUTC.getUTCMonth(),
                                    dueDateUTC.getUTCDate()
                                  )
                                );
                                const daysOverdue = Math.floor(
                                  (todayDateUTC.getTime() -
                                    dueDateOnlyUTC.getTime()) /
                                    (1000 * 60 * 60 * 24)
                                );
                                return sum + daysOverdue * 1.0;
                              }

                              return sum + r.fineAmount; // Use stored fine for returned books
                            }, 0)
                            .toFixed(2)}
                        </p>
                        <p className="text-xs text-red-700">Total Fines</p>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-2 text-center">
                        <p className="text-lg font-bold text-purple-600">
                          {borrowHistory.reduce(
                            (sum, r) => sum + r.renewalCount,
                            0
                          )}
                        </p>
                        <p className="text-xs text-purple-700">
                          Total Renewals
                        </p>
                      </div>
                      <div className="rounded-lg bg-indigo-50 p-2 text-center">
                        <p className="text-lg font-bold text-indigo-600">
                          {totalReviews}
                        </p>
                        <p className="text-xs text-indigo-700">Total Reviews</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* History List */}
                {borrowHistory
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || 0).getTime() -
                      new Date(a.createdAt || 0).getTime()
                  )
                  .map((record) => (
                    <BorrowCard key={record.id} record={record} />
                  ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyProfileTabs;
