// Parent: REQ-0027; TC-0047
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));

import { MUTATION_RSC_PATH_REGISTRY } from "./queryInvalidation";
import { revalidateMutationPaths } from "./revalidateMutation";

describe("RSC mutation registry", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(Object.keys(MUTATION_RSC_PATH_REGISTRY) as Array<keyof typeof MUTATION_RSC_PATH_REGISTRY>)(
    "revalidates every registered path for %s",
    (mutation) => {
      revalidateMutationPaths(mutation);
      expect(revalidatePath).toHaveBeenCalledTimes(
        MUTATION_RSC_PATH_REGISTRY[mutation].length,
      );
      for (const path of MUTATION_RSC_PATH_REGISTRY[mutation]) {
        expect(revalidatePath).toHaveBeenCalledWith(
          path,
          ...(path.includes("[") ? ["page"] : []),
        );
      }
    },
  );
});
