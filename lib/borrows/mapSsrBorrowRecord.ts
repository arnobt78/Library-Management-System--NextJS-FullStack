import type { BorrowRecord } from "@/lib/services/borrows";
import { serializeBorrowTimestamp } from "@/lib/borrows/serializeBorrowTimestamp";

type SsrBorrowRow = {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date | null;
  dueDate: string | Date | null;
  returnDate: string | Date | null;
  approvedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  renewedAt?: string | Date | null;
  status: string;
  borrowedBy: string | null;
  returnedBy: string | null;
  fineAmount: string | null;
  notes: string | null;
  renewalCount: number;
  lastReminderSent: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  createdAt: Date | null;
};

/** Home / catalog / book-detail SSR borrow rows — ISO clocks, not date-only slices. */
export function mapSsrBorrowRecord(record: SsrBorrowRow): BorrowRecord {
  return {
    id: record.id,
    userId: record.userId,
    bookId: record.bookId,
    borrowDate: record.borrowDate,
    dueDate: serializeBorrowTimestamp(record.dueDate),
    returnDate: serializeBorrowTimestamp(record.returnDate),
    approvedAt: serializeBorrowTimestamp(record.approvedAt),
    cancelledAt: serializeBorrowTimestamp(record.cancelledAt),
    renewedAt: serializeBorrowTimestamp(record.renewedAt),
    status: record.status as BorrowRecord["status"],
    borrowedBy: record.borrowedBy,
    returnedBy: record.returnedBy,
    fineAmount: record.fineAmount || "0.00",
    notes: record.notes,
    renewalCount: record.renewalCount,
    lastReminderSent: record.lastReminderSent,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
  };
}
