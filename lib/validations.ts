import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(3, "Full name must be at least 3 characters")
    .max(255, "Full name must be less than 255 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  universityId: z.preprocess(
    (val: number | string | null | undefined) => {
      // Convert empty string, null, or undefined to undefined
      if (val === "" || val === null || val === undefined) {
        return undefined;
      }
      return val;
    },
    z.coerce
      .number({
        required_error: "University ID is required",
        invalid_type_error: "University ID must be a number",
      })
      .int("University ID must be a whole number (no decimals)")
      .min(1, "University ID must be a positive number")
      .max(
        99999999,
        "University ID is too large. Maximum allowed 8-digit number"
      )
  ) as z.ZodType<number, z.ZodTypeDef, number | string | null | undefined>,
  universityCard: z
    .string()
    .min(
      1,
      "University ID Card is required. Please upload your ID card image."
    ),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const bookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Book title is required")
    .min(2, "Book title must be at least 2 characters")
    .max(100, "Book title must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Book description is required")
    .min(10, "Book description must be at least 10 characters")
    .max(1000, "Book description must be less than 1000 characters"),
  author: z
    .string()
    .trim()
    .min(1, "Author name is required")
    .min(2, "Author name must be at least 2 characters")
    .max(100, "Author name must be less than 100 characters"),
  genre: z
    .string()
    .trim()
    .min(1, "Genre is required")
    .min(2, "Genre must be at least 2 characters")
    .max(50, "Genre must be less than 50 characters"),
  rating: z.coerce
    .number({
      required_error: "Rating is required",
      invalid_type_error: "Rating must be a number",
    })
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  totalCopies: z.coerce
    .number({
      required_error: "Total copies is required",
      invalid_type_error: "Total copies must be a number",
    })
    .int("Total copies must be a whole number")
    .positive("Total copies must be a positive number")
    .lte(10000, "Total copies cannot exceed 10,000"),
  coverUrl: z
    .string()
    .min(1, "Book cover image is required. Please upload a cover image."),
  coverColor: z
    .string()
    .trim()
    .min(1, "Primary color is required")
    .regex(
      /^#[0-9A-F]{6}$/i,
      "Primary color must be a valid hex color (e.g., #FF5733)"
    ),
  videoUrl: z
    .string()
    .min(1, "Book trailer is required. Please upload a book trailer video."),
  summary: z
    .string()
    .trim()
    .min(1, "Book summary is required")
    .min(10, "Book summary must be at least 10 characters"),
  // Enhanced fields - all optional
  isbn: z
    .string()
    .trim()
    .max(20, "ISBN must be less than 20 characters")
    .optional(),
  publicationYear: z.coerce
    .number({
      invalid_type_error: "Publication year must be a number",
    })
    .int("Publication year must be a whole number")
    .min(1000, "Publication year must be at least 1000")
    .max(
      new Date().getFullYear(),
      `Publication year cannot exceed ${new Date().getFullYear()}`
    )
    .optional(),
  publisher: z
    .string()
    .trim()
    .max(255, "Publisher name must be less than 255 characters")
    .optional(),
  language: z
    .string()
    .trim()
    .max(50, "Language must be less than 50 characters")
    .optional(),
  pageCount: z.coerce
    .number({
      invalid_type_error: "Page count must be a number",
    })
    .int("Page count must be a whole number")
    .positive("Page count must be a positive number")
    .optional(),
  edition: z
    .string()
    .trim()
    .max(50, "Edition must be less than 50 characters")
    .optional(),
  isActive: z.boolean().optional(),
});
