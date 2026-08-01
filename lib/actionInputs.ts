// Parent: REQ-0025
// Runtime allowlists for browser-supplied server-action identifiers and text.

import { z } from "zod";

const entityIdSchema = z.string().uuid();
const entityIdsSchema = z
  .array(entityIdSchema)
  .min(1)
  .max(100)
  .transform((ids) => [...new Set(ids)]);

export const adminRequestReasonSchema = z.string().trim().min(10).max(1000);

export function parseEntityId(value: unknown): string {
  return entityIdSchema.parse(value);
}

export function parseEntityIds(value: unknown): string[] {
  return entityIdsSchema.parse(value);
}
