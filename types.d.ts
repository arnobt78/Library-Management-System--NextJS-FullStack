// Custom Session type for NextAuth
interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string; // User role (USER or ADMIN) for authorization checks
  /** Account approval status from JWT (server-derived) */
  status?: "PENDING" | "APPROVED" | "REJECTED" | string;
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
  /** Curated homepage hero; at most one active featured book */
  isFeatured: boolean;
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
  /** When true, clears featured on all other books in the same write transaction */
  isFeatured?: boolean;
}

interface BorrowBookParams {
  bookId: string;
}

interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date;
  dueDate: Date | null; // Can be null for pending requests
  returnDate?: Date | null;
  status: "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED";
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

// Parent: CR-0003 / REQ-0034 — Support Ticket domain
type TicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface SupportTicketReplyRow {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userUniversityCard: string | null;
  userRole: "USER" | "ADMIN";
  body: string;
  createdAt: string;
}

/** Row shape shared by admin list, personal list, and detail (joins flattened). */
interface SupportTicketListItem {
  id: string;
  subject: string;
  /** Truncated under subject in list densify — always present on list+detail. */
  description: string;
  status: TicketStatusValue;
  priority: TicketPriorityValue;
  userId: string;
  userName: string;
  userEmail: string;
  userUniversityCard: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  assignedToUniversityCard: string | null;
  relatedBookId: string | null;
  relatedBookTitle: string | null;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SupportTicketDetail extends SupportTicketListItem {
  notes: string | null;
  replies: SupportTicketReplyRow[];
  /** Last actor who mutated the ticket (status/assignee/content/notes). */
  updatedById: string | null;
  updatedByName: string | null;
  updatedByEmail: string | null;
  updatedByUniversityCard: string | null;
}

/** Audit row for ticket detail Activity timeline (admin + densified feed). */
interface TicketActivityEvent {
  id: string;
  kind: "created" | "updated" | "replied" | "audit";
  at: string;
  label: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorUniversityCard: string | null;
  detail?: string | null;
}

// Parent: CR-0003 / REQ-0034 — Book Review moderation
type ReviewStatusValue = "PENDING" | "APPROVED" | "REJECTED";

/** Row shape shared by admin moderation queue, My Reviews tab, and detail. */
interface AdminBookReviewItem {
  id: string;
  rating: number;
  comment: string;
  status: ReviewStatusValue;
  bookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  bookCoverColor: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
