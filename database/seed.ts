/**
 * database/seed.ts — RETIRED
 *
 * This file previously inserted books without resetting the database first,
 * which led to data-integrity issues (available_copies > total_copies, duplicate rows).
 *
 * Use the unified reset-and-seed script instead:
 *
 *   npm run seed:reset
 *
 * That script wipes all transactional data in FK-safe order and re-seeds:
 *   - 17 canonical books (from dummybooks.json) with full schema coverage
 *   - 2 test accounts (Test User + Test Admin) with scrypt-hashed passwords
 */

console.error(
  "This script is retired. Run `npm run seed:reset` instead.\n" +
    "See scripts/reset-and-seed.ts for the full implementation."
);
process.exit(1);
