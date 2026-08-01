// Parent: REQ-0025
// Runtime allowlists for browser-supplied server-action identifiers and text.

import { z } from "zod";

const entityIdSchema = z.string().uuid();
const entityIdsSchema = z
  .array(entityIdSchema)
  .min(1)
  .max(100)
  .transform((ids) => [...new Set(ids)]);
const profilePaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000),
  size: z.coerce.number().int().min(1).max(50),
});

export const adminRequestReasonSchema = z.string().trim().min(10).max(1000);

export function parseEntityId(value: unknown): string {
  return entityIdSchema.parse(value);
}

export function parseEntityIds(value: unknown): string[] {
  return entityIdsSchema.parse(value);
}

export function parseProfilePagination(
  page: unknown,
  size: unknown = 25,
): { page: number; size: number } {
  return profilePaginationSchema.parse({ page, size });
}
