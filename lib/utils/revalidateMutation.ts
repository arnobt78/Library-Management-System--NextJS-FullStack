import "server-only";

import { revalidatePath } from "next/cache";
import {
  MUTATION_RSC_PATH_REGISTRY,
  type MutationDomainName,
} from "@/lib/utils/queryInvalidation";

export function revalidateMutationPaths(mutation: MutationDomainName): void {
  for (const path of MUTATION_RSC_PATH_REGISTRY[mutation]) {
    if (path.includes("[")) revalidatePath(path, "page");
    else revalidatePath(path);
  }
}
