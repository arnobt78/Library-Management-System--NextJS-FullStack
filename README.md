# University Library Management System - Next.js, TypeScript, Postgres, Drizzle ORM, NextAuth, TanStack Query, Upstash Redis, ImageKit, QStash, Brevo, Resend Full-Stack Project(including Role-Based Access Control + Automated Workflows + Admin Panel + Analytics + Review + Recommendations + Fine Management + User Management + Book Management + Borrow Management + Return Management & more)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-336791)](https://orm.drizzle.team/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154)](https://tanstack.com/query)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC)](https://tailwindcss.com/)
[![launch with diploi badge](https://diploi.com/launch.svg)](https://diploi.com/launch/arnobt78/university-library)

A production-oriented full-stack **university library** platform built with **Next.js App Router**, **TypeScript**, **PostgreSQL (Drizzle ORM)**, **NextAuth**, **TanStack Query**, **Upstash Redis**, **ImageKit**, and multi-provider email. It includes public catalog browsing, borrow workflows, reviews, admin CRUD, featured homepage hero, fines/reminders, analytics, and API health docs.

- **Live demo:** [https://university-library-managment.vercel.app/](https://university-library-managment.vercel.app/)
- **Security:** private vulnerability reports → see [SECURITY.md](./SECURITY.md) · [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
- **Author:** [Arnob Mahmud](https://www.arnobmahmud.com) · [GitHub @arnobt78](https://github.com/arnobt78)

![BookWise screenshot](https://github.com/user-attachments/assets/e495275c-a7b2-45aa-bd37-cd37ca1dadf8)
![BookWise screenshot](https://github.com/user-attachments/assets/e39465de-e514-44c6-b385-29ab210717e9)
![BookWise screenshot](https://github.com/user-attachments/assets/a610b78a-bf72-4371-8f95-abc5c3bf7179)
![BookWise screenshot](https://github.com/user-attachments/assets/22a8f0bb-ac89-4ab7-a93f-630306d946a1)
![BookWise screenshot](https://github.com/user-attachments/assets/89349b88-6b62-4099-8e35-fb90056d6cf4)
![BookWise screenshot](https://github.com/user-attachments/assets/7cdd7016-dd42-4211-bcb2-7abd34caacb1)
![BookWise screenshot](https://github.com/user-attachments/assets/82ed8082-54b6-41d7-a8ab-0ff5fa59646a)
![BookWise screenshot](https://github.com/user-attachments/assets/b025b991-5495-49b1-9b6f-a8c8411e204a)
![BookWise screenshot](https://github.com/user-attachments/assets/c946f818-a44a-4d2e-ba8c-27dea921876e)
![BookWise screenshot](https://github.com/user-attachments/assets/b60521d6-4597-4ad7-a3a3-1cedf41a0d0e)
![BookWise screenshot](https://github.com/user-attachments/assets/864b1033-6aa6-420b-a6a4-7420fec78652)
![BookWise screenshot](https://github.com/user-attachments/assets/854cb805-d12a-4923-8d8a-2832f5594343)
![BookWise screenshot](https://github.com/user-attachments/assets/0eacf5a5-5b47-43cb-8c05-203aba379296)
![BookWise screenshot](https://github.com/user-attachments/assets/9d004d70-20ee-406e-8c90-047e05fabb86)
![BookWise screenshot](https://github.com/user-attachments/assets/beac954e-8ace-452c-9dac-e9518d4ccb14)
![BookWise screenshot](https://github.com/user-attachments/assets/d4d516a9-22d2-4d53-b1bf-9f777cea2906)
![BookWise screenshot](https://github.com/user-attachments/assets/c2218bb1-52d9-4705-a252-85a2287a0b27)
![BookWise screenshot](https://github.com/user-attachments/assets/0a3c6b4d-734e-4450-b322-fec62daec6f6)
![BookWise screenshot](https://github.com/user-attachments/assets/715470c5-db57-4a71-8141-f559bf82ddd1)
![BookWise screenshot](https://github.com/user-attachments/assets/3db52269-da0a-4bef-9216-8451ac2f7676)
![BookWise screenshot](https://github.com/user-attachments/assets/1548d4a8-16fc-49b4-a47d-2ea86f257f30)

## Table of Contents

1. [What You Will Learn](#what-you-will-learn)
2. [Features Overview](#features-overview)
3. [Technology Stack](#technology-stack)
4. [Keywords Glossary](#keywords-glossary)
5. [Architecture Walkthrough](#architecture-walkthrough)
6. [Project Structure](#project-structure)
7. [Database Schema](#database-schema)
8. [Routes (Pages)](#routes-pages)
9. [API Endpoints](#api-endpoints)
10. [Reusable Components](#reusable-components)
11. [Hooks, Cache & Invalidation](#hooks-cache--invalidation)
12. [Getting Started](#getting-started)
13. [Environment Variables](#environment-variables)
14. [How to Obtain Each Secret](#how-to-obtain-each-secret)
15. [Scripts & Tooling](#scripts--tooling)
16. [Educational Code Snippets](#educational-code-snippets)
17. [Reusing Pieces in Other Projects](#reusing-pieces-in-other-projects)
18. [Security](#security)
19. [Contributing & Support](#contributing--support)
20. [Conclusion](#conclusion)
21. [License](#license)

---

## What You Will Learn

This repository is designed both as a **working library product** and as a **learning lab** for full-stack Next.js:

- App Router **server components** (`page.tsx`) for fast first paint vs **client components** for interactivity
- **Drizzle ORM** schema, migrations, and typed queries against PostgreSQL
- **NextAuth (Auth.js) v5** credentials login, JWT sessions, and role checks (`USER` / `ADMIN`)
- **TanStack Query** with SSR `initialData`, infinite `staleTime`, and central invalidation after mutations
- **Zod + React Hook Form** for validated forms
- **shadcn/ui + Tailwind** for consistent admin and public UI
- External services: **ImageKit** uploads, **Upstash Redis** rate limits, **QStash** workflows, **Brevo / Resend** email
- Admin hard-delete gated by `ADMIN_DELETE_SECRET`, featured-book homepage hero, borrow lifecycle, reviews, fines

---

## Features Overview

### Public / student app

| Feature           | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| Auth              | Sign up / sign in; accounts start as `PENDING` until an admin approves |
| Catalog           | Browse all books, search/filter, open book detail                      |
| Featured hero     | Homepage shows curated `isFeatured` book (else newest active)          |
| Borrow            | Request a book → admin approves → due dates / return                   |
| Profile           | Borrowing history, stats, return flows                                 |
| Reviews           | Create / edit / delete own reviews (eligibility rules apply)           |
| API docs & status | In-app API documentation and live health/metrics pages                 |

### Admin app (`/admin`)

| Feature          | What it does                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Books            | Create / edit / soft-deactivate (`isActive`) / hard-delete (secret) / feature on homepage |
| Users            | Approve / reject accounts, manage roles                                                   |
| Borrow requests  | Approve / reject pending loans                                                            |
| Account requests | Review admin-privilege requests                                                           |
| Automation       | Fine config, overdue fine updates, due/overdue reminders                                  |
| Analytics        | Business insights, charts, CSV-style exports                                              |
| Recommendations  | Generate / refresh trending and personalized suggestion data                              |

### Technical features

- Responsive Tailwind layouts (public dark theme + admin light theme)
- Instant UI updates via React Query invalidation + `router.refresh()` after book CRUD
- Rate limiting with Upstash Redis
- TypeScript throughout; Vitest available for tests

---

## Technology Stack

| Layer        | Choice                                      | Role in this project                           |
| ------------ | ------------------------------------------- | ---------------------------------------------- |
| Framework    | **Next.js 16** (App Router)                 | Pages, layouts, Route Handlers, server actions |
| UI library   | **React 19**                                | Components and hooks                           |
| Language     | **TypeScript 5.9**                          | Static typing across app / API / schema        |
| Styling      | **Tailwind CSS 3** + **shadcn/ui**          | Utility CSS + accessible primitives            |
| Auth         | **next-auth 5 (beta)**                      | Credentials provider, JWT session              |
| ORM          | **Drizzle ORM** + **pg**                    | PostgreSQL access                              |
| Client cache | **TanStack Query 5**                        | Lists, details, mutations, invalidation        |
| Forms        | **react-hook-form** + **Zod**               | Validated sign-in/up and book forms            |
| Media        | **@imagekit/next**                          | Covers, ID cards, trailers                     |
| Rate limit   | **@upstash/redis** + **@upstash/ratelimit** | Abuse protection                               |
| Jobs         | **@upstash/workflow** / QStash              | Onboarding workflows when enabled              |
| Email        | **Brevo** (primary) + **Resend** (fallback) | Receipts / reminders                           |
| Charts       | **Recharts**                                | Admin analytics                                |
| Icons        | **lucide-react**                            | UI icons                                       |
| Tests        | **Vitest**                                  | Unit/integration test runner                   |

**Runtime:** Node.js `>= 20.9.0` (see `package.json` `engines`).

---

## Keywords Glossary

| Keyword              | Meaning here                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **App Router**       | Next.js file-based routing under `app/` (`page.tsx`, `layout.tsx`, `route.ts`)              |
| **RSC**              | React Server Component — runs on the server, can talk to DB directly                        |
| **Client component** | Marked `"use client"` — hooks, browser APIs, interactive UI                                 |
| **Server action**    | `"use server"` function callable from the client (e.g. `createBook`)                        |
| **SSR hydration**    | Pass `initialData` from `page.tsx` into React Query so the first paint needs no extra fetch |
| **Invalidation**     | Mark React Query keys stale so active observers refetch after CRUD                          |
| **Featured book**    | `books.is_featured` — curated homepage hero (at most one)                                   |
| **Soft delete**      | `isActive = false` — hide from catalog without removing rows                                |
| **Hard delete**      | Physically delete book + related reviews/borrows (requires secret)                          |
| **RBAC**             | Role-based access control — `USER` vs `ADMIN`                                               |
| **Drizzle**          | TypeScript ORM that generates SQL from schema definitions                                   |
| **Zod**              | Runtime schema validation for forms and inputs                                              |

---

## Architecture Walkthrough

```text
Browser
  │
  ├─ App Router pages (RSC) ──► PostgreSQL via Drizzle
  │         │
  │         └─ pass initialData ──► Client components + TanStack Query
  │                                      │
  │                                      ├─ fetch /api/* (Node runtime)
  │                                      └─ call server actions (admin books, etc.)
  │
  ├─ NextAuth session (JWT)
  ├─ ImageKit (uploads / CDN images)
  ├─ Upstash Redis (rate limit)
  └─ Brevo / Resend / QStash (email & workflows)
```

**Teaching rule used in this codebase:**

1. Put **data loading** that can run on the server in `page.tsx`.
2. Put **interactive UI** in client components.
3. After any mutation, call a shared invalidator (e.g. `invalidateAfterBookChange`) and often `router.refresh()` so RSC trees stay in sync.

---

## Project Structure

```text
university-library/
├── app/
│   ├── (auth)/              # Sign-in / sign-up layouts
│   ├── (root)/              # Public app (home, books, profile, performance)
│   ├── admin/               # Admin dashboard pages
│   ├── api/                 # Route Handlers (REST-style JSON APIs)
│   ├── api-docs/            # Interactive API documentation UI
│   ├── api-status/          # Live service health UI
│   ├── layout.tsx           # Root layout
│   └── globals.css
├── components/              # Shared UI (feature + shadcn ui/)
├── database/
│   ├── schema.ts            # Drizzle tables & enums
│   ├── drizzle.ts           # DB pool
│   ├── redis.ts             # Upstash Redis client
│   └── seed.ts              # Seed script
├── hooks/                   # useQueries, useMutations, performance
├── lib/
│   ├── admin/actions/       # Server actions (books, users, bulk ops)
│   ├── services/            # Fetch helpers used by hooks
│   ├── utils/queryInvalidation.ts
│   ├── validations.ts       # Zod schemas
│   ├── config.ts            # Central env access
│   └── workflow.ts
├── migrations/              # SQL migrations (e.g. is_featured)
├── scripts/                 # One-off maintenance (delete-book, migrate-featured)
├── styles/                  # Admin CSS extras
├── types.d.ts               # Shared Book / BookParams types
├── auth.ts                  # NextAuth config
├── .env.example             # Template for secrets (copy → .env)
├── SECURITY.md              # Private vulnerability reporting
└── package.json
```

---

## Database Schema

Defined in [`database/schema.ts`](database/schema.ts):

| Table            | Purpose                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `users`          | Accounts, hashed password, `status`, `role`, university card               |
| `books`          | Catalog metadata, copies, `is_active`, **`is_featured`**, cover/video URLs |
| `borrow_records` | Loan lifecycle: `PENDING` → `BORROWED` → `RETURNED`, fines, due dates      |
| `book_reviews`   | Per-user ratings + comments                                                |
| `admin_requests` | Requests to become admin                                                   |
| `system_config`  | Runtime config (e.g. fine amounts)                                         |

Enums: `STATUS_ENUM`, `ROLE_ENUM`, `BORROW_STATUS_ENUM`.

---

## Routes (Pages)

### Public (`app/(root)/`)

| Path           | Description                     |
| -------------- | ------------------------------- |
| `/`            | Featured hero + recommendations |
| `/all-books`   | Full catalog with filters       |
| `/books/[id]`  | Book detail, borrow, reviews    |
| `/my-profile`  | User borrowing dashboard        |
| `/performance` | Client performance tooling page |

### Auth (`app/(auth)/`)

| Path       | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `/sign-in` | Credentials login (+ optional test-account dropdown in UI) |
| `/sign-up` | Registration + university card upload                      |

### Admin (`app/admin/`)

| Path                       | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `/admin`                   | Dashboard home                                         |
| `/admin/books`             | All books grid (view / edit / delete / featured badge) |
| `/admin/books/new`         | Create book (+ Feature on homepage checkbox)           |
| `/admin/books/[id]/edit`   | Update book                                            |
| `/admin/users`             | User management                                        |
| `/admin/book-requests`     | Borrow approvals                                       |
| `/admin/account-requests`  | Admin access requests                                  |
| `/admin/automation`        | Fines & reminders                                      |
| `/admin/business-insights` | Analytics                                              |

### Meta

| Path          | Description              |
| ------------- | ------------------------ |
| `/api-docs`   | API documentation UI     |
| `/api-status` | Service health dashboard |
| `/too-fast`   | Rate-limit friendly page |

---

## API Endpoints

Route Handlers live under `app/api/**/route.ts` (Node.js runtime where DB is needed).

### Books

| Method | Path                           | Notes                                      |
| ------ | ------------------------------ | ------------------------------------------ |
| `GET`  | `/api/books`                   | List + search/filter/pagination            |
| `GET`  | `/api/books/[id]`              | Single book                                |
| `GET`  | `/api/books/featured`          | Featured first, then newest active fillers |
| `GET`  | `/api/books/genres`            | Distinct genres                            |
| `GET`  | `/api/books/recommendations`   | Personalized / fallback recs               |
| `GET`  | `/api/books/[id]/borrow-stats` | Borrow counters                            |

Book **writes** (create/update/delete) are primarily **server actions** in `lib/admin/actions/`, not REST POST/PUT/DELETE.

### Auth & media

| Method | Path                      | Notes                           |
| ------ | ------------------------- | ------------------------------- |
| `*`    | `/api/auth/[...nextauth]` | NextAuth handlers               |
| `GET`  | `/api/auth/imagekit`      | Upload auth params for ImageKit |

### Borrows, users, reviews

| Method        | Path                                           | Notes                      |
| ------------- | ---------------------------------------------- | -------------------------- |
| `GET`/`POST`… | `/api/borrow-records`                          | Borrow list / create flows |
| `GET`         | `/api/users`                                   | User listing (authorized)  |
| `GET`         | `/api/reviews/[bookId]`                        | Reviews for a book         |
| `POST`…       | `/api/reviews/edit`, `/delete`, `/eligibility` | Review mutations & checks  |

### Admin automation & analytics

Examples under `/api/admin/`: `stats`, `fine-config`, `update-overdue-fines`, `send-due-reminders`, `send-overdue-reminders`, `export`, `export-stats`, `reminder-stats`, `generate-recommendations`, `update-trending-books`, `refresh-recommendation-cache`, `borrow-requests`, `admin-requests`.

### Status / health

Under `/api/status/`: `health`, `database`, `authentication`, `email-service`, `file-storage`, `external-apis`, `api-server`, `metrics`.

### Workflows

| Method  | Path                        | Notes                                    |
| ------- | --------------------------- | ---------------------------------------- |
| `POST`… | `/api/workflows/onboarding` | Upstash workflow endpoint (when enabled) |

---

## Reusable Components

| Component                               | Kind            | Purpose                                  |
| --------------------------------------- | --------------- | ---------------------------------------- |
| `BookCard`                              | Server          | Catalog tile linking to detail           |
| `BookCover`                             | Client          | ImageKit cover + color frame             |
| `BookList` / `BookCollection`           | Mixed           | Lists with RQ hydration                  |
| `HomeFeaturedHero`                      | Client          | Homepage featured book + RQ              |
| `HomeRecommendations`                   | Client          | Recommendation strip + RQ                |
| `BookOverview` / `BookOverviewContent`  | Server / Client | Hero overview + live book state          |
| `BookBorrowButton` / `ReturnBookButton` | Client          | Loan actions                             |
| `ReviewsSection` / `ReviewForm*`        | Client          | Reviews CRUD UI                          |
| `AuthForm`                              | Client          | Sign-in / sign-up                        |
| `FileUpload`                            | Client          | ImageKit picker                          |
| `QueryProvider`                         | Client          | App-wide React Query                     |
| `AdminBooksList`                        | Client          | Admin book grid + delete                 |
| `DeleteBookDialog`                      | Client          | Secret-gated hard delete                 |
| `components/ui/*`                       | shadcn          | Button, Form, Dialog, Checkbox, Toast, … |

**Reuse tip:** Prefer composing `components/ui/*` + a thin feature component rather than copying markup. Pass `initialData` from RSC pages into hooks to avoid duplicate network calls.

---

## Hooks, Cache & Invalidation

| Hook file                        | Role                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `hooks/useQueries.ts`            | `useBooks`, `useBook`, `useAllBooks`, `useFeaturedBooks`, `useBookRecommendations`, borrows, reviews, admin stats, … |
| `hooks/useMutations.ts`          | `useCreateBook`, `useUpdateBook`, `useDeleteBook`, borrow/review/user mutations                                      |
| `lib/utils/queryInvalidation.ts` | `invalidateAfterBookChange`, `invalidateBooksQueries` (includes `["featured-books"]`), etc.                          |

**Featured books key:** `["featured-books", limit]` — invalidated whenever books change so the homepage hero can update without a full browser reload (combined with `router.refresh()` after admin CRUD).

**Redis note:** Upstash Redis is used for **rate limiting**, not as a full book cache layer.

---

## Getting Started

### Prerequisites

- Node.js **20.9+**
- npm (or pnpm/yarn)
- A PostgreSQL database (local Docker, Neon, Hetzner, etc.)
- Optional but recommended for full features: ImageKit, Upstash Redis, Brevo/Resend

### Install & run

```bash
git clone https://github.com/arnobt78/university-library.git
cd university-library
npm install

# Copy env template and fill values (see below)
cp .env.example .env

# Apply schema / featured migration as needed
npm run db:migrate
# or specifically:
npm run db:migrate-featured

# Optional: seed sample books
npm run seed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

### Quality checks

```bash
npm run typecheck
npm run lint
npm test
```

---

## Environment Variables

**You need a `.env` file for a real run** of this project (database + auth at minimum). There is **no** “zero-config” mode that skips PostgreSQL and `AUTH_SECRET`.

Start from [`.env.example`](.env.example):

```bash
cp .env.example .env
```

Never commit `.env`. Only commit `.env.example` with placeholders.

### Required for basic local app

| Variable                        | Public? | Purpose                                           |
| ------------------------------- | ------- | ------------------------------------------------- |
| `DATABASE_URL`                  | No      | PostgreSQL connection string                      |
| `AUTH_SECRET`                   | No      | NextAuth / Auth.js signing secret                 |
| `NEXTAUTH_URL`                  | No      | App origin, e.g. `http://localhost:3000`          |
| `NEXT_PUBLIC_API_ENDPOINT`      | Yes     | Browser-visible API base (often same as site URL) |
| `NEXT_PUBLIC_PROD_API_ENDPOINT` | Yes     | Production origin                                 |

### Required for uploads (ImageKit)

| Variable                            | Public? | Purpose                      |
| ----------------------------------- | ------- | ---------------------------- |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`   | Yes     | Client upload / display      |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Yes     | CDN URL endpoint             |
| `IMAGEKIT_PRIVATE_KEY`              | No      | Server-side auth for uploads |

### Required for rate limiting (Upstash Redis)

Code reads Redis via `lib/config.ts`:

| Variable              | Purpose                       |
| --------------------- | ----------------------------- |
| `UPSTASH_REDIS_URL`   | REST URL from Upstash console |
| `UPSTASH_REDIS_TOKEN` | REST token                    |

(Some docs also mention `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — align names with what `lib/config.ts` expects: **`UPSTASH_REDIS_URL`** and **`UPSTASH_REDIS_TOKEN`**.)

### Email (optional until you send mail)

| Variable             | Purpose                                 |
| -------------------- | --------------------------------------- |
| `BREVO_API_KEY`      | Primary transactional email             |
| `BREVO_SENDER_EMAIL` | Verified sender                         |
| `BREVO_SENDER_NAME`  | Display name (default BookWise Library) |
| `RESEND_TOKEN`       | Fallback provider                       |

### Workflows (optional)

| Variable           | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `QSTASH_URL`       | QStash API base                                        |
| `QSTASH_TOKEN`     | QStash token                                           |
| `ENABLE_WORKFLOWS` | `"true"` to enable locally; prod may enable by default |

### Admin hard delete

| Variable              | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `ADMIN_DELETE_SECRET` | Typed in admin delete dialog / `npm run delete-book` |

### Optional Google OAuth

| Variable                                    | Purpose                           |
| ------------------------------------------- | --------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Only if you enable Google sign-in |

---

## How to Obtain Each Secret

1. **`AUTH_SECRET` / `ADMIN_DELETE_SECRET`**

   ```bash
   openssl rand -base64 32
   ```

   Use **different** values for each.

2. **`DATABASE_URL`**
   - Local: Docker Postgres or Homebrew Postgres → `postgresql://user:pass@localhost:5432/library`
   - Cloud: Neon / Supabase / Railway / Hetzner → copy the connection string (include `sslmode=require` when required)

3. **ImageKit** — [https://imagekit.io](https://imagekit.io) → Developer options → API keys + URL endpoint

4. **Upstash Redis** — [https://upstash.com](https://upstash.com) → Redis → REST URL + token → map to `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN`

5. **QStash** — Upstash → QStash → token / URL

6. **Brevo** — [https://www.brevo.com](https://www.brevo.com) → SMTP & API → API key; verify a sender

7. **Resend** — [https://resend.com](https://resend.com) → API Keys (+ domain verification for production)

8. **Vercel** — Project → Settings → Environment Variables → paste the same keys for Production / Preview

---

## Scripts & Tooling

| Script             | Command                              | Use                                                                      |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------ |
| Dev server         | `npm run dev`                        | Local development                                                        |
| Build              | `npm run build`                      | Production build                                                         |
| Start              | `npm start`                          | Serve build                                                              |
| Typecheck          | `npm run typecheck`                  | `tsc --noEmit`                                                           |
| Lint               | `npm run lint`                       | ESLint                                                                   |
| Test               | `npm test`                           | Vitest                                                                   |
| Seed               | `npm run seed`                       | Seed DB                                                                  |
| Featured migration | `npm run db:migrate-featured`        | Add `is_featured` column/index                                           |
| Delete book CLI    | `npm run delete-book -- --id <uuid>` | Hard-delete (needs secret); `--force-return` closes active borrows first |
| Drizzle studio     | `npm run db:studio`                  | Browse data                                                              |

---

## Educational Code Snippets

### Server page loads data; client hydrates

```tsx
// app/(root)/page.tsx (Server Component)
const heroBook = await getHomepageHeroBook();

return (
  <HomeFeaturedHero
    initialHero={heroBook ? JSON.parse(JSON.stringify(heroBook)) : null}
    userId={session?.user?.id}
  />
);
```

```tsx
// components/HomeFeaturedHero.tsx ("use client")
const { data } = useFeaturedBooks(1, initialHero ? [initialHero] : []);
const hero = data?.[0] ?? initialHero;
```

### Invalidate after book mutations

```ts
// hooks/useMutations.ts (concept)
onSuccess: () => {
  invalidateAfterBookChange(queryClient); // books, featured-books, borrows, …
};
// BookForm also calls router.refresh() for RSC sync
```

### Featured exclusivity (server action)

When `isFeatured === true`, `createBook` / `updateBook` clear other featured rows in a **transaction**, then save the new featured flag — so the homepage always has at most one curated hero.

### Zod book schema (excerpt)

```ts
// lib/validations.ts
export const bookSchema = z.object({
  title: z.string().trim().min(2).max(100),
  // ...
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});
```

---

## Reusing Pieces in Other Projects

| Piece                                  | How to reuse                                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| `components/ui/*`                      | Copy with shadcn CLI or paste; keep `lib/utils.ts` `cn()` helper    |
| `QueryProvider` + invalidation helpers | Drop into any App Router app; standardize mutation `onSuccess`      |
| `FileUpload` + `/api/auth/imagekit`    | Needs ImageKit env vars; works for any media form                   |
| `AuthForm` + `auth.ts`                 | Adapt Zod schemas and credentials provider                          |
| Drizzle `schema.ts`                    | Start a new DB module; keep snake_case DB / camelCase TS convention |
| Admin `DeleteBookDialog` pattern       | Reuse for any destructive action gated by an env secret             |

When porting, keep the **SSR `initialData` + invalidate** pattern so navigation stays instant and data stays fresh.

---

## Security

- See **[SECURITY.md](./SECURITY.md)** for private vulnerability reporting (`contact@arnobmahmud.com`).
- Do not expose `IMAGEKIT_PRIVATE_KEY`, `DATABASE_URL`, `AUTH_SECRET`, or `ADMIN_DELETE_SECRET` to the client.
- Prefer hard-delete only for junk/test data; soft-deactivate (`isActive`) for normal catalog removal.
- Rotate secrets if they ever leak into git history.

---

## Contributing & Support

- Repo: [https://github.com/arnobt78/university-library](https://github.com/arnobt78/university-library)
- Portfolio: [https://www.arnobmahmud.com](https://www.arnobmahmud.com)
- Security contact: [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)

Issues and PRs that improve docs, tests, accessibility, or performance are welcome.

---

## Conclusion

**BookWise** is a complete learning-friendly library platform: catalog, borrow lifecycle, reviews, admin operations, featured homepage hero, monitoring pages, and a modern Next.js data architecture. Use it as a deployable product, a study reference for App Router + Drizzle + TanStack Query, or a toolkit of reusable forms, uploads, and invalidation patterns for your next project.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and distribute the code as per the terms of the license.

---

## Happy Coding! 🎉

This is an **open-source project** - feel free to use, enhance, and extend this project further!

If you have any questions or want to share your work, reach out via GitHub or my portfolio at [https://www.arnobmahmud.com](https://www.arnobmahmud.com).
