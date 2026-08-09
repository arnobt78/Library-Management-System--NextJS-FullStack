/**
 * Lendable inventory math — active titles only.
 * Parent: REQ-0033 — Overview / Book Catalog / densify share one rule.
 * Null `isActive` counts as active (DB default). Inactive titles stay in
 * title counts but must not inflate Available / Total / Borrowed copy KPIs.
 */

export type LendableCopyFields = {
  totalCopies: number;
  availableCopies: number;
  isActive?: boolean | null;
};

/** True unless the title is explicitly deactivated. */
export function isBookActive(
  book: { isActive?: boolean | null } | null | undefined,
): boolean {
  return book?.isActive !== false;
}

export type LendableCopySums = {
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
};

/** Sum copy KPIs for the lending pool (active titles only). */
export function sumLendableCopies(
  books: readonly LendableCopyFields[],
): LendableCopySums {
  let totalCopies = 0;
  let availableCopies = 0;
  for (const book of books) {
    if (!isBookActive(book)) continue;
    const total =
      typeof book.totalCopies === "number" && Number.isFinite(book.totalCopies)
        ? book.totalCopies
        : 0;
    const available =
      typeof book.availableCopies === "number" &&
      Number.isFinite(book.availableCopies)
        ? book.availableCopies
        : 0;
    totalCopies += total;
    availableCopies += available;
  }
  return {
    totalCopies,
    availableCopies,
    borrowedCopies: Math.max(0, totalCopies - availableCopies),
  };
}
