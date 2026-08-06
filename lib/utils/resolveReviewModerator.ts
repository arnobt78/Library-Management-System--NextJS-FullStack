/**
 * Resolve moderator attribution for review.moderate densify.
 *
 * Never persist UI placeholder "an admin" into TanStack cache — that stomps a
 * good post-invalidate join (Test Admin + card) when useSession/decisionActor
 * is null (incognito / session lag). Prefer: real caller actor → session →
 * post-invalidate/API row → pre-invalidate cache.
 */

export type ReviewModeratorActor = {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
  universityCard?: string | null;
};

export type ReviewModeratorFields = {
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedByEmail: string | null;
  reviewedByUniversityCard: string | null;
};

/** True when name is missing or the PersonAttribution emptyLabel placeholder. */
export function isWeakModeratorName(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  return !trimmed || trimmed.toLowerCase() === "an admin";
}

function pickName(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (!isWeakModeratorName(c)) return c!.trim();
  }
  return null;
}

function pickEmail(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function pickCard(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c) return c;
  }
  return null;
}

function pickId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c) return c;
  }
  return null;
}

/**
 * Build densify moderator fields without writing "an admin" into cache.
 */
export function resolveReviewModeratorForDensify(args: {
  decisionActor?: ReviewModeratorActor | null;
  sessionUser?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    universityCard?: string | null;
  } | null;
  /** Row after await invalidate (API join — preferred truth). */
  postInvalidate?: Partial<ReviewModeratorFields> | null;
  /** Mutation response moderator fields when API returns them. */
  fromMutation?: Partial<ReviewModeratorFields> | null;
  /** Pre-invalidate cached row (last resort for id continuity). */
  preInvalidate?: Partial<ReviewModeratorFields> | null;
}): ReviewModeratorFields {
  const actor = args.decisionActor;
  const session = args.sessionUser;
  const post = args.postInvalidate;
  const mut = args.fromMutation;
  const pre = args.preInvalidate;

  return {
    reviewedBy: pickId(
      actor?.id,
      session?.id,
      mut?.reviewedBy,
      post?.reviewedBy,
      pre?.reviewedBy,
    ),
    reviewedByName: pickName(
      actor?.fullName,
      session?.name,
      mut?.reviewedByName,
      post?.reviewedByName,
      pre?.reviewedByName,
    ),
    reviewedByEmail: pickEmail(
      actor?.email,
      session?.email,
      mut?.reviewedByEmail,
      post?.reviewedByEmail,
      pre?.reviewedByEmail,
    ),
    reviewedByUniversityCard: pickCard(
      actor?.universityCard,
      session?.universityCard,
      mut?.reviewedByUniversityCard,
      post?.reviewedByUniversityCard,
      pre?.reviewedByUniversityCard,
    ),
  };
}
