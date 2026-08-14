# Portable Auth UI Guide

**Drop this file into any Next.js App Router project** and instruct an agent: implement these UI contracts first, then wire whichever auth provider you choose (Auth.js / NextAuth, Clerk, Auth0, etc.).

This guide merges and replaces:

- Auth UI flicker / hydration patterns
- Sign-in test-credentials Select + Robohash
- Navbar profile DropdownMenu (`modal={false}`) + API Status / API Docs / Logout

Reference implementation (this library repo — examples only):

- `components/AuthForm.tsx` — credentials Select
- `components/ProfileDropdown.tsx` — navbar menu
- `components/UserAvatar.tsx` + `lib/media/avatarFallback.ts` — avatar → Robohash
- `constants/index.ts` — `TEST_ACCOUNTS`
- `constants/navigation.ts` — `UTILITY_NAVIGATION_ITEMS` (API Docs / API Status)

---

## 1. How to use

1. Copy this file into `docs/` of the target project.
2. Tell the agent: **Implement §2 UI contracts exactly.** Keep auth vendor details in §5 appendices.
3. Configure CSP / `next/image` hostnames for `robohash.org` if you use Next Image.
4. Demo accounts are for **non-production** only (§6).

---

## 2. UI contracts (required — provider-agnostic)

### 2.1 Sign-in: test credentials Select

On the **sign-in** page only (not sign-up unless you explicitly want it):

| Requirement | Detail |
|-------------|--------|
| Control | shadcn/ui `Select` (or Radix Select) |
| Options | One row per demo account: **avatar + display name + email** |
| Avatar | Project image URL if set; on missing/error → **Robohash** seeded by email |
| On select | Fill email + password form fields |
| Clear | “Clear Selection” option appears after a choice; clears select + empties fields |
| Robohash URL | `https://robohash.org/{encodeURIComponent(email.toLowerCase())}?set=set1&size={n}x{n}` |

**Portable account shape:**

```ts
type TestAccount = {
  id: string;
  label: string;       // or fullName
  email: string;
  password: string;
  image?: string | null; // local /images/... or remote; optional
};
```

**Select option row (pattern):**

```tsx
<div className="flex items-center gap-2">
  <img
    src={account.image || robohashUrl(account.email, 36)}
    alt=""
    className="size-9 rounded-full object-cover"
    onError={(e) => {
      e.currentTarget.src = robohashUrl(account.email, 36);
    }}
  />
  <div className="min-w-0">
    <p className="truncate text-sm font-medium">{account.label}</p>
    <p className="truncate text-xs opacity-70">{account.email}</p>
  </div>
</div>
```

Prefer a shared `UserAvatar` / `robohashUrl` helper so Select, navbar, and lists stay consistent.

### 2.2 Navbar: profile circle + DropdownMenu

| Requirement | Detail |
|-------------|--------|
| Trigger | Circular avatar button (project image → Robohash → initials) |
| Menu | shadcn `DropdownMenu` |
| **Critical** | Always `modal={false}` — avoids body scroll-lock, sticky-header shift, and open/close flash |
| Align | `align="end"` |

**Menu contents — default order (do not reorder unless product asks):**

1. **Label** — Full name + email (optional third line: project meta)
2. **Separator**
3. **Utility links with Lucide icons** (defaults):
   - **API Documentation** → `/api-docs` (or project equivalent)
   - **API Status** → `/api-status` (or project equivalent)
4. **Separator**
5. **Log out** — icon + label; show spinner while logout is in flight; disable double-submit

```tsx
<DropdownMenu modal={false}>
  <DropdownMenuTrigger asChild>
    <button type="button" className="size-10 overflow-hidden rounded-full border">
      {/* UserAvatar: image → Robohash(email) → initials */}
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56 sm:w-64">
    <DropdownMenuLabel>
      <p className="text-sm font-medium">{fullName}</p>
      <p className="text-xs opacity-70">{email}</p>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link href="/api-docs">{/* FileText icon */} API Docs</Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href="/api-status">{/* Activity icon */} API Status</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onLogout} disabled={loggingOut}>
      {loggingOut ? "Logging out…" : "Logout"}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Keep utility hrefs in a small shared constant (e.g. `UTILITY_NAVIGATION_ITEMS`) so Header and ProfileDropdown stay in sync.

### 2.3 Avatar cascade

1. Primary: stored profile / university card / OAuth picture  
2. Fallback: Robohash(email or stable user id)  
3. Last resort: initials  

Rules:

- `onError` on primary → switch to Robohash (do not leave a broken image)
- For third-party OAuth images, set `referrerPolicy="no-referrer"` when needed
- Allow `robohash.org` in CSP `img-src` and `next.config` `images.remotePatterns`

---

## 3. Flicker / hydration rules

| Symptom | Fix |
|---------|-----|
| Login button flashes before profile on refresh | Persist “was authenticated” (cookie/localStorage) and show avatar **skeleton** until session resolves — never flash Login for a known session |
| Hydration mismatch | Defer localStorage reads until `mounted`; SSR default = Login (or skeleton), not guessed Profile |
| Dropdown opens and page jumps / header sticks wrong | `DropdownMenu modal={false}` (and MultiSelect `modal={false}` if used) |
| OAuth return flash | Set pending flag **before** redirect; clear after session lands |
| Logout UI thrash | Disable button + spinner; clear client “was authenticated” immediately; redirect via provider `signOut` / Clerk `signOut` |

Do **not** use `modal={true}` (Radix default) for the profile menu in apps with sticky headers.

---

## 4. Reference helpers (copy into any project)

```ts
/** Stable robot avatar; same email → same robot. */
export function robohashUrl(email: string, size = 80): string {
  const seed = encodeURIComponent(email.trim().toLowerCase());
  const px = Math.max(40, Math.min(size, 256));
  return `https://robohash.org/${seed}?set=set1&size=${px}x${px}`;
}
```

Wire Select fill:

```ts
function onAccountSelect(id: string, accounts: TestAccount[], form: { setValue: ... }) {
  if (id === "clear") {
    form.setValue("email", "");
    form.setValue("password", "");
    return;
  }
  const account = accounts.find((a) => a.id === id);
  if (!account) return;
  form.setValue("email", account.email);
  form.setValue("password", account.password);
}
```

---

## 5. Provider appendices (pick one)

UI contracts above stay the same. Only session / logout APIs change.

### A. Auth.js / NextAuth v5 (credentials + optional OAuth)

- Credentials provider validates email/password (hash with bcrypt or scrypt).
- Session: JWT strategy; expose `name`, `email`, `image` (and role if needed) on `session.user`.
- Sign-in form: credentials Select (§2.1) then `signIn("credentials", …)` or your server action.
- Navbar: `useSession()` → ProfileDropdown when authenticated.
- Logout: `signOut({ redirect: true, callbackUrl: "/sign-in" })` with pending spinner.
- Optional: Google / GitHub providers; keep same avatar cascade (OAuth image → Robohash).
- Env: `AUTH_SECRET`, `AUTH_URL` / `NEXTAUTH_URL`, provider client IDs/secrets.

### B. Clerk (custom sign-in + guest Select)

- Dashboard: email/password (+ social if needed); create a **test user** matching Select credentials.
- Sign-in UI: custom form or Clerk components; add the **same** credentials Select (§2.1) that fills fields / triggers guest sign-in.
- Navbar: `<UserButton />` **or** custom DropdownMenu (§2.2) using `useUser()` / `useClerk().signOut()` — prefer custom menu if you need API Docs / API Status rows.
- Always `modal={false}` on custom DropdownMenu.
- Env: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, redirect URLs.
- Optional: disable “reject compromised passwords” only for weak demo passwords in **dev**.

### C. Auth0 / other

- Implement §2 UI against your SDK’s session hooks.
- Map profile picture → avatar cascade; logout via vendor SDK; keep utility links + separators identical.

---

## 6. Security

- Demo Select accounts: **local / staging only**; never ship production with shared weak passwords.
- Do not commit real `AUTH_SECRET`, Clerk secrets, or OAuth client secrets.
- Isolate user data by server-side session identity (never trust client-supplied user ids for privileged reads/writes).
- Prefer hashing passwords with a modern KDF (bcrypt / scrypt); rotate demo passwords in shared environments.

---

## 7. Acceptance checklist

Copy into the PR / agent task:

- [ ] Sign-in Select lists demo accounts with **avatar + name + email**
- [ ] Missing/broken image → **Robohash** (stable per email)
- [ ] Selecting an account fills email + password; Clear empties both
- [ ] Navbar shows circular avatar when authenticated
- [ ] Profile `DropdownMenu` uses **`modal={false}`**
- [ ] Menu order: name/email → separator → API Docs + API Status (icons) → separator → Logout
- [ ] Logout shows spinner and does not double-fire
- [ ] Refresh does not flash Login before Profile for an existing session
- [ ] Opening the menu does not shift sticky header / lock body scroll
- [ ] `robohash.org` allowed in CSP / image config if applicable

---

## 8. This repository notes

BookWise-specific extras (optional to port):

- `Become Admin` row when role is USER (`/make-admin`)
- University ID under the profile label
- Light vs dark header `tone` on `ProfileDropdown`
- Seed script keeps `TEST_ACCOUNTS` in sync with the Select (`npm run seed:reset`)

When porting, keep §2 contracts; drop or rename project-specific rows.
