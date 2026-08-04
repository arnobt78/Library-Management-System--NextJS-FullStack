// Parent: REQ-0023; TC-0033 and TC-0034

import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query/keys";

const state = vi.hoisted(() => ({
  client: null as QueryClient | null,
  borrowBook: vi.fn(),
  invalidateBorrow: vi.fn(),
  borrowError: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => state.client,
  useMutation: (options: unknown) => options,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));
vi.mock("@/lib/admin/actions/book", () => ({ createBook: vi.fn(), updateBook: vi.fn() }));
vi.mock("@/lib/admin/actions/bulk-operations", () => ({ bulkDeleteBooks: vi.fn() }));
vi.mock("@/lib/admin/actions/borrow", () => ({
  approveBorrowRequest: vi.fn(), rejectBorrowRequest: vi.fn(), returnBook: vi.fn(),
}));
vi.mock("@/lib/admin/actions/admin-requests", () => ({
  approveAdminRequest: vi.fn(), rejectAdminRequest: vi.fn(), removeAdminPrivileges: vi.fn(),
}));
vi.mock("@/lib/admin/actions/user", () => ({ updateUserRole: vi.fn(), updateUserStatus: vi.fn() }));
vi.mock("@/lib/actions/registration", () => ({ requestRegistrationReview: vi.fn() }));
vi.mock("@/lib/actions/book", () => ({ borrowBook: state.borrowBook }));
vi.mock("@/lib/services/reviews", () => ({ createReview: vi.fn(), updateReview: vi.fn(), deleteReview: vi.fn() }));
vi.mock("@/lib/services/admin", () => ({
  updateFineConfig: vi.fn(), sendDueReminders: vi.fn(), sendOverdueReminders: vi.fn(),
  updateOverdueFines: vi.fn(), generateAllUserRecommendations: vi.fn(),
  updateTrendingBooks: vi.fn(), refreshRecommendationCache: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({
  resolveActionBookTitle: (explicit?: string | null, cached?: string | null) =>
    explicit?.trim() || cached?.trim() || "this book",
  showToast: {
    error: vi.fn(), success: vi.fn(),
    book: {
      borrowError: state.borrowError,
      borrowSuccess: vi.fn(),
      createSuccess: vi.fn(),
      returnSuccess: vi.fn(),
      returnWithFine: vi.fn(),
      returnError: vi.fn(),
      renewSuccess: vi.fn(),
      renewError: vi.fn(),
      reviewSuccess: vi.fn(),
      reviewError: vi.fn(),
    },
    user: { roleUpdateSuccess: vi.fn(), statusUpdateSuccess: vi.fn() },
    review: { createSuccess: vi.fn(), updateSuccess: vi.fn(), deleteSuccess: vi.fn() },
  },
}));
vi.mock("@/lib/utils/queryInvalidation", () => ({
  invalidateMutation: state.invalidateBorrow,
}));

interface BorrowMutationOptions {
  mutationFn: (variables: BorrowVariables) => Promise<unknown>;
  onMutate: (variables: BorrowVariables) => Promise<BorrowContext>;
  onSuccess: (data: unknown, variables: BorrowVariables, context: BorrowContext) => Promise<void>;
  onError: (error: Error, variables: BorrowVariables, context: BorrowContext) => void;
}

interface BorrowVariables {
  userId: string;
  bookId: string;
  bookTitle: string;
}

interface BorrowContext {
  previousQueries: Array<{ queryKey: QueryKey; data: unknown }>;
  optimisticRecordId: string;
}

describe("borrow mutation cache contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    state.invalidateBorrow.mockResolvedValue(undefined);
  });

  it("invalidates before success settles and restores cache after rejection", async () => {
    const variables: BorrowVariables = {
      userId: "10000000-0000-4000-8000-000000000001",
      bookId: "20000000-0000-4000-8000-000000000001",
      bookTitle: "Book",
    };
    const key = queryKeys.borrows.user(variables.userId);
    const previous = [{ id: "existing", status: "BORROWED" }];
    state.client?.setQueryData(key, previous);

    const { useBorrowBook } = await import("./useMutations");
    const options = useBorrowBook() as unknown as BorrowMutationOptions;
    const context = await options.onMutate(variables);
    expect(state.client?.getQueryData<unknown[]>(key)).toHaveLength(2);

    state.borrowBook.mockResolvedValue({ success: false, error: "rejected" });
    await expect(options.mutationFn(variables)).rejects.toThrow("rejected");
    options.onError(new Error("rejected"), variables, context);
    expect(state.client?.getQueryData(key)).toEqual(previous);

    let invalidationFinished = false;
    state.invalidateBorrow.mockImplementation(async () => {
      await Promise.resolve();
      invalidationFinished = true;
    });
    await options.onSuccess([], variables, context);
    expect(state.invalidateBorrow).toHaveBeenCalledWith(
      state.client,
      "borrow.lifecycle",
    );
    expect(invalidationFinished).toBe(true);
  });
});
