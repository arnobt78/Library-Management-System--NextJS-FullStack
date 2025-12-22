/**
 * Books Service - Pure API Functions
 *
 * This module contains pure API functions for book-related operations.
 * These functions make fetch calls to API routes and return data.
 * NO React Query logic here - just fetch calls.
 *
 * These functions are reusable across:
 * - Client Components (via React Query hooks)
 * - Server Components (direct API calls)
 * - Server Actions (if needed)
 *
 * Note: API routes for books need to be created if they don't exist yet.
 * These service functions are ready to use once API routes are available.
 */

import { ApiError } from "./apiError";

/**
 * Filters for book list queries
 */
export interface BookFilters {
  search?: string;
  genre?: string;
  author?: string;
  availability?: "available" | "unavailable" | "all";
  rating?: number;
  sort?: "title" | "author" | "rating" | "date";
  page?: number;
  limit?: number;
}

/**
 * Response type for book list queries
 */
export interface BooksListResponse {
  books: Book[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

/**
 * Response type for single book queries
 */
export interface BookResponse {
  book: Book;
}

/**
 * Get all books with optional search and filters
 *
 * Supports:
 * - Search by title/author
 * - Filter by genre, author, availability, rating
 * - Sort by title, author, rating, or date
 * - Pagination
 *
 * @param filters - Optional filters object
 * @returns Promise with books list, total count, and pagination info
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const books = await getBooksList({ search: "react", genre: "Technology" });
 * ```
 */
export async function getBooksList(
  filters: BookFilters = {}
): Promise<BooksListResponse> {
  // Build query parameters
  const params = new URLSearchParams();

  if (filters.search) params.append("search", filters.search);
  if (filters.genre) params.append("genre", filters.genre);
  if (filters.author) params.append("author", filters.author);
  if (filters.availability && filters.availability !== "all") {
    params.append("availability", filters.availability);
  }
  if (filters.rating) params.append("rating", filters.rating.toString());
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/api/books?${queryString}` : "/api/books";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      // If response is not JSON, use statusText
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.books && Array.isArray(data.books)) {
    // New format with pagination object
    if (data.pagination) {
      return {
        books: data.books,
        total: data.pagination.totalBooks || data.books.length,
        page: data.pagination.currentPage || 1,
        totalPages: data.pagination.totalPages || 1,
        limit: data.pagination.booksPerPage || data.books.length,
      };
    }
    // Legacy format with direct properties
    return {
      books: data.books,
      total: data.total || data.books.length,
      page: data.page || 1,
      totalPages: data.totalPages || 1,
      limit: data.limit || data.books.length,
    };
  }

  // If response is just an array, wrap it
  if (Array.isArray(data)) {
    return {
      books: data,
      total: data.length,
      page: 1,
      totalPages: 1,
      limit: data.length,
    };
  }

  throw new ApiError("Invalid response format from books API", 500);
}

/**
 * Get a single book by ID
 *
 * @param bookId - Book ID (UUID)
 * @returns Promise with book data
 * @throws {ApiError} Error with message and status code (404 if not found)
 *
 * @example
 * ```typescript
 * const book = await getBook("123e4567-e89b-12d3-a456-426614174000");
 * ```
 */
export async function getBook(bookId: string): Promise<Book> {
  if (!bookId) {
    throw new ApiError("Book ID is required", 400);
  }

  const response = await fetch(`/api/books/${bookId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.book) {
    return data.book;
  }

  if (data.id) {
    // If response is the book object directly
    return data;
  }

  throw new ApiError("Invalid response format from book API", 500);
}

/**
 * Get book recommendations for a user
 *
 * Fetches personalized book recommendations based on user's reading history.
 *
 * @param userId - User ID (optional, will use current session if not provided)
 * @param limit - Maximum number of recommendations (default: 10)
 * @returns Promise with array of recommended books
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const recommendations = await getBookRecommendations(userId, 5);
 * ```
 */
export async function getBookRecommendations(
  userId?: string,
  limit: number = 10
): Promise<Book[]> {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (limit) params.append("limit", limit.toString());

  const queryString = params.toString();
  const url = queryString
    ? `/api/books/recommendations?${queryString}`
    : `/api/books/recommendations?limit=${limit}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.recommendations && Array.isArray(data.recommendations)) {
    return data.recommendations;
  }

  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from recommendations API", 500);
}

/**
 * Get featured/popular books
 *
 * Fetches books that are featured or popular (e.g., highest rated, most borrowed).
 *
 * @param limit - Maximum number of books (default: 10)
 * @returns Promise with array of featured books
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const featured = await getFeaturedBooks(5);
 * ```
 */
export async function getFeaturedBooks(limit: number = 10): Promise<Book[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());

  const url = `/api/books/featured?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.books && Array.isArray(data.books)) {
    return data.books;
  }

  if (data.featured && Array.isArray(data.featured)) {
    return data.featured;
  }

  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from featured books API", 500);
}

/**
 * Book borrow statistics interface
 */
export interface BookBorrowStats {
  totalBorrows: number;
  activeBorrows: number;
  returnedBorrows: number;
}

/**
 * Get borrow statistics for a specific book
 *
 * Fetches statistics about how many times a book has been borrowed,
 * how many are currently borrowed, and how many have been returned.
 *
 * @param bookId - Book ID (UUID)
 * @returns Promise with borrow statistics
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const stats = await getBookBorrowStats("123e4567-e89b-12d3-a456-426614174000");
 * console.log(`Total borrows: ${stats.totalBorrows}`);
 * ```
 */
export async function getBookBorrowStats(
  bookId: string
): Promise<BookBorrowStats> {
  if (!bookId) {
    throw new ApiError("Book ID is required", 400);
  }

  const response = await fetch(`/api/books/${bookId}/borrow-stats`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.stats) {
    return data.stats;
  }

  if (data.totalBorrows !== undefined) {
    // If response is the stats object directly
    return {
      totalBorrows: data.totalBorrows || 0,
      activeBorrows: data.activeBorrows || 0,
      returnedBorrows: data.returnedBorrows || 0,
    };
  }

  throw new ApiError("Invalid response format from book borrow stats API", 500);
}

/**
 * Get unique genres from all books
 *
 * Useful for building filter dropdowns.
 *
 * @returns Promise with array of unique genre strings
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const genres = await getBookGenres();
 * ```
 */
export async function getBookGenres(): Promise<string[]> {
  const response = await fetch("/api/books/genres", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.genres && Array.isArray(data.genres)) {
    return data.genres;
  }

  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from genres API", 500);
}
