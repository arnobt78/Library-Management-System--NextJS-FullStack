// Custom Session type for NextAuth
interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string; // User role (USER or ADMIN) for authorization checks
}

interface Session {
  user?: SessionUser;
  expires?: string;
}
interface Book {
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
  // Enhanced tracking and control fields
  isbn?: string | null;
  publicationYear?: number | null;
  publisher?: string | null;
  language?: string | null;
  pageCount?: number | null;
  edition?: string | null;
  isActive: boolean;
  updatedAt: Date | null;
  updatedBy?: string | null;
  createdAt: Date | null;
}

interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
  universityId: number;
  universityCard: string;
}

interface BookParams {
  title: string;
  author: string;
  genre: string;
  rating: number;
  coverUrl: string;
  coverColor: string;
  description: string;
  totalCopies: number;
  videoUrl: string;
  summary: string;
  // Enhanced optional fields
  isbn?: string;
  publicationYear?: number;
  publisher?: string;
  language?: string;
  pageCount?: number;
  edition?: string;
  isActive?: boolean;
}

interface BorrowBookParams {
  bookId: string;
  userId: string;
}

interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date;
  dueDate: Date | null; // Can be null for pending requests
  returnDate?: Date | null;
  status: "PENDING" | "BORROWED" | "RETURNED";
  // Enhanced tracking and control fields
  borrowedBy?: string | null;
  returnedBy?: string | null;
  fineAmount: number;
  notes?: string | null;
  renewalCount: number;
  lastReminderSent?: Date | null;
  updatedAt: Date | null;
  updatedBy?: string | null;
  createdAt: Date | null;
}
