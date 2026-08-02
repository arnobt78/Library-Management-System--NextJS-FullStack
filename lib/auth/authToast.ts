/**
 * Deferred auth toasts — survive full-page navigations (signOut redirect)
 * and show on the destination page instead of the auth form mid-transition.
 * Payload includes optional display name for personalized copy.
 */

export const AUTH_TOAST_STORAGE_KEY = "bookwise-auth-toast";

export type AuthToastKind = "welcome" | "signup" | "logout";

export type PendingAuthToast = {
  kind: AuthToastKind;
  name?: string;
};

export function setPendingAuthToast(
  kind: AuthToastKind,
  name?: string
): void {
  try {
    const payload: PendingAuthToast = {
      kind,
      name: name?.trim() || undefined,
    };
    sessionStorage.setItem(AUTH_TOAST_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode / SSR) — toast is best-effort
  }
}

export function peekPendingAuthToast(): PendingAuthToast | null {
  try {
    const raw = sessionStorage.getItem(AUTH_TOAST_STORAGE_KEY);
    if (!raw) return null;

    // Legacy: plain kind string from earlier builds
    if (raw === "welcome" || raw === "signup" || raw === "logout") {
      return { kind: raw };
    }

    const parsed = JSON.parse(raw) as PendingAuthToast;
    if (
      parsed?.kind === "welcome" ||
      parsed?.kind === "signup" ||
      parsed?.kind === "logout"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Reads and clears only when the pending kind is one of `allowed`. */
export function consumePendingAuthToast(
  allowed: AuthToastKind[]
): PendingAuthToast | null {
  const pending = peekPendingAuthToast();
  if (!pending || !allowed.includes(pending.kind)) return null;
  try {
    sessionStorage.removeItem(AUTH_TOAST_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return pending;
}
