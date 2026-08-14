# University Library Management System — Next.js, TypeScript, PostgreSQL, Drizzle ORM, Auth.js, TanStack Query, Upstash Redis, ImageKit, QStash, Brevo, Resend Full-Stack Project (RBAC + Workflows + Admin + Analytics + Reviews + Reservations + Recommendations + Fines + Borrow Lifecycle & more)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-336791)](https://orm.drizzle.team/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154)](https://tanstack.com/query)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC)](https://tailwindcss.com/)
[![Auth.js](https://img.shields.io/badge/Auth.js-v5-black)](https://authjs.dev/)
[![launch with diploi badge](https://diploi.com/launch.svg)](https://diploi.com/launch/arnobt78/Library-Management-System--NextJS-FullStack)

A production-oriented full-stack **university library** platform (**BookWise**) built with the **Next.js App Router**, **React 19**, **strict TypeScript**, **PostgreSQL + Drizzle ORM**, **Auth.js (NextAuth v5)**, **TanStack Query**, **Upstash Redis** (rate limits only), **ImageKit**, and multi-provider email. It is designed as both a deployable product and an **educational lab**: server-first pages, client hydration, typed mutations, domain invalidation, secure admin operations, and a real borrow + reservation lifecycle.

- **Live demo:** [https://university-library-managment.vercel.app/](https://university-library-managment.vercel.app/)
- **Security:** Private reports → [SECURITY.md](./SECURITY.md) · [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
- **Author:** [Arnob Mahmud](https://www.arnobmahmud.com) · [GitHub @arnobt78](https://github.com/arnobt78) · [LinkedIn @arnob-mahmud-05839655](https://www.linkedin.com/in/arnob-mahmud-05839655/)

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
10. [Backend Layers (Services, Actions, Circulation)](#backend-layers-services-actions-circulation)
11. [Reusable Components](#reusable-components)
12. [Hooks, Cache & Invalidation](#hooks-cache--invalidation)
13. [Authentication & Security Model](#authentication--security-model)
14. [Getting Started](#getting-started)
15. [Environment Variables](#environment-variables)
16. [How to Obtain Each Secret](#how-to-obtain-each-secret)
17. [Demo Test Accounts](#demo-test-accounts)
18. [Scripts & Tooling](#scripts--tooling)
19. [Educational Code Snippets](#educational-code-snippets)
20. [Important Libraries (Beginner Notes)](#important-libraries-beginner-notes)
21. [Reusing Pieces in Other Projects](#reusing-pieces-in-other-projects)
22. [Security](#security)
23. [Contributing & Support](#contributing--support)
24. [Conclusion](#conclusion)
25. [License](#license)

---

## What You Will Learn

This repository is both a **working library product** and a **full-stack learning lab**. As you explore the code, you will practice:

- **App Router** server components (`page.tsx`) for fast first paint vs **`"use client"`** for interactivity
- **Drizzle ORM** schema design, SQL migrations, and typed PostgreSQL access
- **Auth.js v5** credentials login, JWT sessions, and **DB-backed** role/status authority
- **scrypt** password hashing with safe legacy SHA-256 verify + non-fatal rehash-on-login
- **TanStack Query** with SSR `initialData`, `initialDataUpdatedAt`, typed query keys, and mutation-domain invalidation
- **Zod + React Hook Form** for validated auth and book forms
- **shadcn/ui + Tailwind** for public (dark) and admin (light) UI surfaces
- External services: **ImageKit**, **Upstash Redis** (rate limit only), optional **QStash** workflows, **Brevo / Resend**
- Library domain logic: featured hero, borrow lifecycle, **FIFO reservations / waitlist / renewals**, reviews, fines, analytics, user 360
- Operational patterns: cron-secured outbox recovery, health/status routes, Vitest unit + disposable-PostgreSQL integration tests

---

## Features Overview

### Public / student app

| Feature           | What it does                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| Auth              | Sign up / sign in; new accounts often start `PENDING` until admin approval |
| Demo dropdown     | Sign-in Select shows Test User / Test Admin with avatar + email (seeded)   |
| Catalog           | Browse, search/filter, open book detail                                    |
| Featured hero     | Homepage curated `isFeatured` book (else newest active)                    |
| Borrow            | Request → admin approve → due dates / return / renew                       |
| Reservations      | Hold / waitlist / READY notifications (outbox + cron recovery)             |
| Borrow History    | `/my-profile` — active, pending, returned loans + reservations panel       |
| Reviews           | Create / edit / delete own reviews (eligibility rules)                     |
| API docs & status | In-app API documentation and health/metrics pages                          |

### Admin app (`/admin`)

| Feature          | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| Books            | Create / edit / soft-deactivate / hard-delete (secret) / feature on homepage |
| Users            | Approve / reject, roles; user 360 detail at `/admin/users/[id]`              |
| Borrow requests  | Approve / reject / return lifecycle (transactional)                          |
| Account requests | Review “become admin” requests                                               |
| Automation       | Fine config, overdue fines, due/overdue reminders                            |
| Analytics        | Business insights, charts, exports                                           |
| Recommendations  | Generate / refresh trending & personalized data                              |

### Technical features

- Instant UI updates via typed mutation → domain invalidation (+ `router.refresh()` where needed)
- Same-origin tab coherence via data-free `BroadcastChannel` (not cross-device push)
- Rate limiting with Upstash Redis (Redis is **not** a business-data cache)
- Atomic inventory/lifecycle writes with row locks where required
- Vitest unit + disposable-PostgreSQL integration tests
- Vercel-friendly Node runtime (recommend **Node 24.x** on Vercel; app requires `>=20.9.0`)

---

## Technology Stack

| Layer        | Choice                                               | Role                                           |
| ------------ | ---------------------------------------------------- | ---------------------------------------------- |
| Framework    | **Next.js 16.2.12** (App Router)                     | Pages, layouts, Route Handlers, server actions |
| UI           | **React 19.2.8**                                     | Components and hooks                           |
| Language     | **TypeScript ~5.9**                                  | Static typing across app / API / schema        |
| Styling      | **Tailwind CSS 3** + **shadcn/ui** (Radix)           | Utility CSS + accessible primitives            |
| Auth         | **next-auth 5.0.0-beta.32**                          | Credentials provider, JWT session              |
| Passwords    | **Node scrypt** (`lib/auth/password.ts`)             | Memory-hard hashes + legacy upgrade            |
| ORM          | **Drizzle ORM** + **pg**                             | PostgreSQL access                              |
| Client cache | **TanStack Query 5**                                 | Lists, details, mutations, invalidation        |
| Forms        | **react-hook-form** + **Zod 4**                      | Validated forms / inputs                       |
| Media        | **@imagekit/next**                                   | Covers, ID cards, trailers                     |
| Rate limit   | **@upstash/redis** + **ratelimit**                   | Abuse protection                               |
| Jobs         | **@upstash/workflow** / QStash                       | Optional onboarding workflows                  |
| Email        | **Brevo** (primary) + **Resend** (fallback / outbox) | Receipts, reminders, READY mail                |
| Charts       | **Recharts**                                         | Admin analytics                                |
| Icons        | **lucide-react**                                     | UI icons                                       |
| Tests        | **Vitest**                                           | Unit / integration runner                      |

**Runtime:** Node.js `>= 20.9.0` (`package.json` `engines`). On Vercel, prefer **24.x** project + production Node settings.

---

## Keywords Glossary

| Keyword                | Meaning here                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **App Router**         | File-based routing under `app/` (`page.tsx`, `layout.tsx`, `route.ts`)                 |
| **RSC**                | React Server Component — can query the DB on the server                                |
| **Client component**   | `"use client"` — hooks, browser APIs, interactive UI                                   |
| **Server action**      | `"use server"` callable from the client (e.g. book CRUD, circulation)                  |
| **SSR hydration**      | Pass `initialData` (and often `initialDataUpdatedAt`) from `page.tsx` into React Query |
| **Invalidation**       | Mark query keys stale so active observers refetch after CRUD                           |
| **Mutation registry**  | Typed family → query domains + RSC paths (`queryInvalidation` / `revalidateMutation`)  |
| **Featured book**      | `books.is_featured` — at most one curated homepage hero                                |
| **Soft delete**        | `isActive = false` — hide without removing rows                                        |
| **Hard delete**        | Physically delete book + related rows (needs `ADMIN_DELETE_SECRET`)                    |
| **RBAC**               | `USER` vs `ADMIN` (DB role is authoritative over JWT claims alone)                     |
| **BorrowRecordFull**   | Borrow row + nested `book` from an INNER JOIN (profile / API cache type)               |
| **Reservation outbox** | Retry-safe READY email delivery with lease / dead-letter / cron                        |
| **Drizzle**            | TypeScript ORM mapping schema → SQL                                                    |
| **Zod**                | Runtime schema validation                                                              |

---

## Architecture Walkthrough

```text
Browser
  │
  ├─ App Router pages (RSC) ──► PostgreSQL via Drizzle
  │         │
  │         └─ initialData ──► Client components + TanStack Query
  │                                 ├─ fetch /api/* (Node runtime)
  │                                 └─ server actions (admin / circulation)
  │
  ├─ Auth.js session (JWT) + DB role/status checks on privileged writes
  ├─ ImageKit (uploads / CDN)
  ├─ Upstash Redis (rate limit only)
  ├─ Brevo / Resend (+ reservation outbox worker / cron)
  └─ QStash workflows (optional)
```

**Teaching rule used in this codebase:**

1. Load data that can run on the server in `page.tsx`.
2. Put interactive UI in client components.
3. After mutations, use the **typed mutation registry** so related domains and RSC paths stay fresh (active refetch; inactive keys stale until next visit / focus / back navigation).
4. Never trust browser-supplied actor IDs for privileged writes — resolve the current user from the session + database.
5. Keep inventory and lifecycle writes **transactional** so `availableCopies` cannot drift from borrow state.

---

## Project Structure

```text
university-library/
├── app/
│   ├── (auth)/                 # Sign-in / sign-up layouts
│   ├── (root)/                 # Public app (home, books, Borrow History, performance)
│   ├── admin/                  # Admin dashboard (+ users/[id] 360)
│   ├── api/                    # Route Handlers (REST-style JSON)
│   │   ├── auth/               # NextAuth + ImageKit auth
│   │   ├── books/              # Catalog, featured, recommendations
│   │   ├── borrow-records/
│   │   ├── reviews/
│   │   ├── users/
│   │   ├── admin/              # Stats, fines, exports, analytics, …
│   │   ├── cron/               # Reservation notification recovery
│   │   ├── status/             # Health / metrics
│   │   └── workflows/          # Optional QStash onboarding
│   ├── api-docs/ · api-status/
│   ├── fonts/                  # next/font/local (IBM Plex, Bebas)
│   ├── layout.tsx · globals.css
├── components/                 # Feature UI + components/ui (shadcn)
├── constants/                  # Nav, FIELD_*, TEST_ACCOUNTS
├── database/                   # schema.ts, drizzle.ts, redis.ts, seed.ts (retired → seed:reset)
├── hooks/                      # useQueries, useMutations, useSafeMedia, …
├── lib/
│   ├── auth/                   # password (scrypt), authorization, route helpers
│   ├── admin/actions/          # Privileged server operations
│   ├── circulation/            # Reservations, outbox, renewals
│   ├── media/                  # universityCard resolver, upload validation
│   ├── query/keys.ts           # Query-key factory
│   ├── utils/queryInvalidation.ts · revalidateMutation.ts
│   ├── validations.ts          # Zod schemas
│   └── services/               # Fetch helpers for hooks
├── migrations/                 # SQL history (featured, audit, reservations, …)
├── scripts/                    # reset-and-seed.ts (canonical demo reset)
├── docs/                       # PROJECT_WALKTHROUGH and guides
├── .agile-v/                   # Requirements / gates / decisions (agents)
├── auth.ts · proxy.ts
├── dummybooks.json             # 17-book seed catalog
├── .env.example                # Env template (copy → .env)
├── SECURITY.md
└── package.json
```

---

## Database Schema

Defined in [`database/schema.ts`](database/schema.ts):

| Table                  | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `users`                | Accounts, password hash, `status`, `role`, `university_card`, audit fields |
| `books`                | Catalog, copies, `is_active`, **`is_featured`**, cover/video URLs          |
| `borrow_records`       | `PENDING` → `BORROWED` → `RETURNED`, fines, due dates, renewals            |
| `reservations`         | Waitlist / hold / READY lifecycle (FIFO)                                   |
| `reservation_events`   | Outbox / event history for READY delivery                                  |
| `circulation_commands` | Idempotent circulation command ledger                                      |
| `operation_telemetry`  | Bounded ops / SLO telemetry                                                |
| `book_reviews`         | Ratings + comments                                                         |
| `admin_requests`       | Become-admin requests                                                      |
| `system_config`        | Fine amounts and runtime knobs (preserved across `seed:reset`)             |

Enums include account status, role, borrow status, and reservation status.

Apply SQL under `migrations/` (including `0010_reservations.sql` for circulation and `0009_users_audit_fields.sql` for user audit columns) before expecting matching production behavior.

---

## Routes (Pages)

### Public (`app/(root)/`)

| Path          | Description                               |
| ------------- | ----------------------------------------- |
| `/`           | Featured hero + recommendations           |
| `/all-books`  | Full catalog with filters                 |
| `/books/[id]` | Detail, borrow, reserve, reviews          |
| `/my-profile` | **Borrow History** — loans + reservations |

### Auth (`app/(auth)/`)

| Path       | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| `/sign-in` | Credentials login + test-account Select (avatar / name / email) |
| `/sign-up` | Registration + university ID card upload                        |

### Admin (`app/admin/`)

| Path                                   | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| `/admin`                               | Dashboard home                                         |
| `/admin/books` · `/new` · `/[id]/edit` | Book CRUD + featured checkbox                          |
| `/admin/users` · `/admin/users/[id]`   | Users list + 360 profile                               |
| `/admin/book-requests`                 | Borrow approvals                                       |
| `/admin/account-requests`              | Pending user registration approvals (Sign-up Requests) |
| `/admin/automation`                    | Fines & reminders                                      |
| `/admin/business-insights`             | Analytics                                              |

### Meta

| Path          | Description                                 |
| ------------- | ------------------------------------------- |
| `/api-docs`   | API documentation UI                        |
| `/api-status` | Service health + client performance metrics |
| `/too-fast`   | Rate-limit friendly page                    |
| `/make-admin` | Request elevated access                     |

---

## API Endpoints

Route Handlers live under `app/api/**/route.ts` (Node.js runtime where DB access is required). Many **writes** use **server actions** instead of REST PUT/DELETE — that is intentional.

### Books

| Method | Path                           | Notes                               |
| ------ | ------------------------------ | ----------------------------------- |
| `GET`  | `/api/books`                   | List + search / filter / pagination |
| `GET`  | `/api/books/[id]`              | Single book                         |
| `GET`  | `/api/books/featured`          | Featured first, then newest active  |
| `GET`  | `/api/books/genres`            | Distinct genres                     |
| `GET`  | `/api/books/recommendations`   | Personalized / fallback             |
| `GET`  | `/api/books/[id]/borrow-stats` | Borrow counters                     |

### Auth & media

| Method | Path                      | Notes                           |
| ------ | ------------------------- | ------------------------------- |
| `*`    | `/api/auth/[...nextauth]` | Auth.js handlers                |
| `GET`  | `/api/auth/imagekit`      | Upload auth params for ImageKit |

### Borrows, users, reviews

| Method           | Path                                | Notes                                                  |
| ---------------- | ----------------------------------- | ------------------------------------------------------ |
| `GET`            | `/api/borrow-records`               | Authenticated borrow list (INNER JOIN → nested `book`) |
| `GET`            | `/api/users`                        | Authorized user listing (no passwords)                 |
| `GET` / `POST`   | `/api/reviews/[bookId]`             | List / create reviews                                  |
| `GET`            | `/api/reviews/eligibility/[bookId]` | Can current user review?                               |
| `PUT` / `DELETE` | `/api/reviews/edit/[reviewId]`      | Update / delete                                        |
| `DELETE`         | `/api/reviews/delete/[reviewId]`    | Alternate delete path                                  |

### Admin automation & analytics

Under `/api/admin/`: `stats`, `analytics`, `fine-config`, `update-overdue-fines`, `send-due-reminders`, `send-overdue-reminders`, `export/*`, `export-stats`, `reminder-stats`, `generate-recommendations`, `update-trending-books`, `refresh-recommendation-cache`, `borrow-requests`, `admin-requests`.

### Cron / circulation recovery

| Method         | Path                                  | Notes                           |
| -------------- | ------------------------------------- | ------------------------------- |
| `GET` / `POST` | `/api/cron/reservation-notifications` | Secured by `CRON_SECRET` Bearer |

### Status / health

Under `/api/status/`: `health`, `database`, `authentication`, `email-service`, `file-storage`, `external-apis`, `api-server`, `metrics`.

### Workflows

| Method  | Path                        | Notes                                         |
| ------- | --------------------------- | --------------------------------------------- |
| `POST`… | `/api/workflows/onboarding` | Upstash workflow when `ENABLE_WORKFLOWS=true` |

---

## Backend Layers (Services, Actions, Circulation)

Understanding these layers helps you navigate the codebase faster:

| Layer                | Location                                 | Beginner meaning                                                 |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| **Services**         | `lib/services/*.ts`                      | Pure `fetch` helpers used by React Query hooks (no React inside) |
| **Hooks**            | `hooks/useQueries.ts`, `useMutations.ts` | Wire services into TanStack Query                                |
| **Server actions**   | `lib/admin/actions/*`, `lib/actions/*`   | Privileged DB writes with auth + transactions                    |
| **Authorization**    | `lib/auth/authorization.ts`              | Resolve current actor from **DB**, not from the browser          |
| **Borrow lifecycle** | `lib/admin/borrowLifecycle.ts`           | Atomic approve / return / reject with inventory updates          |
| **Circulation**      | `lib/circulation/*`                      | Reservations, renewals, outbox delivery                          |
| **Query keys**       | `lib/query/keys.ts`                      | Single factory so invalidation stays consistent                  |
| **Invalidation**     | `lib/utils/queryInvalidation.ts`         | Mutation family → which caches to refresh                        |

**Example flow — student returns a book:**

1. UI calls a mutation / action.
2. Server verifies session + ownership/admin policy.
3. Transaction updates `borrow_records` and increments `availableCopies`.
4. Typed invalidation refreshes borrow, book, profile, and admin list queries.
5. Same-origin tabs hear a BroadcastChannel ping and stay coherent.

---

## Reusable Components

| Component                                                     | Kind   | Purpose                                        | Reuse tip                                         |
| ------------------------------------------------------------- | ------ | ---------------------------------------------- | ------------------------------------------------- |
| `BookCard` / `BookCover` / `BookList`                         | Mixed  | Catalog tiles & covers                         | Pass cover URL + color; keep sizes consistent     |
| `HomeFeaturedHero` / `HomeRecommendations`                    | Client | Homepage + RQ hydration                        | Feed SSR `initialData`                            |
| `BookBorrowButton` / `ReturnBookButton` / `ReserveBookButton` | Client | Circulation actions                            | Pair with mutation invalidation                   |
| `ReservationsPanel`                                           | Client | Queue / READY UI                               | Works with SSR reservation summary                |
| `ReviewsSection` / `ReviewFormDialog`                         | Client | Reviews CRUD                                   | Check eligibility first                           |
| `AuthForm` / `SignInFormPage` / `SignUpFormPage`              | Client | Auth UX + demo Select                          | Swap Zod schemas for other products               |
| `UserAvatar`                                                  | Client | Local `/images`, remote URL, or ImageKit       | Use with `resolveUniversityCard`                  |
| `MyProfileTabs`                                               | Client | Borrow History tabs                            | Needs `BorrowRecordFull` + `initialDataUpdatedAt` |
| `FileUpload`                                                  | Client | ImageKit picker                                | Needs `/api/auth/imagekit`                        |
| `QueryProvider`                                               | Client | App-wide React Query                           | Mount once in a layout                            |
| `AdminBooksList` / `DeleteBookDialog`                         | Client | Admin grid + secret-gated delete               | Pattern for any destructive op                    |
| `PerformanceDashboard` / `AnalyticsCharts`                    | Client | Ops & charts                                   | Swap data sources freely                          |
| `components/ui/*`                                             | shadcn | Button, Form, Dialog, Select, Avatar, Toast, … | Copy via shadcn CLI                               |

**Composition tip:** Keep shells/static chrome in RSC pages; only the interactive data islands need `"use client"`. That makes navigation feel instant even before network data arrives.

---

## Hooks, Cache & Invalidation

| Piece                             | Role                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- |
| `hooks/useQueries.ts`             | Typed readers with optional SSR `initialData` / `initialDataUpdatedAt` |
| `hooks/useMutations.ts`           | Central mutations, rollback, toasts, registry invalidation             |
| `lib/query/keys.ts`               | Query-key factory / prefixes                                           |
| `lib/utils/queryInvalidation.ts`  | Mutation → domains + BroadcastChannel tab sync                         |
| `lib/utils/revalidateMutation.ts` | RSC path revalidation consumers                                        |

**Learner model:**

1. RSC paints with server data (layout, labels, tables shells appear immediately).
2. Query hooks reuse that data as fresh for `staleTime` when `initialDataUpdatedAt` is set.
3. A successful mutation picks a **typed family** (e.g. `book.write`, `borrow.lifecycle`).
4. Active queries refetch; inactive ones go stale and refresh on navigation / back / focus.
5. Book CRUD may also call `router.refresh()` for the current RSC tree.

**Profile / Borrow History note:** Prefer React Query borrow rows only when nested `book.title` is real — otherwise fall back to SSR props. That avoids the “Unknown Book by Unknown Author” flash from a stale cache missing the JOIN.

**Redis note:** Upstash Redis is for **rate limiting only**. PostgreSQL is the source of truth for catalog and circulation data. There is no Redis business-data invalidation to maintain.

---

## Authentication & Security Model

- Credentials sign-in via Auth.js; passwords hashed with **versioned scrypt** (`hashPassword` / `verifyPassword` in `lib/auth/password.ts`).
- Legacy `salt:hash` SHA-256 still verifies and upgrades on successful login (upgrade write is **non-fatal** so missing audit columns cannot lock users out).
- Unknown emails still run a verify against a fixed dummy scrypt encoding (equal-cost / anti-enumeration). GitGuardian may flag that string — it is **not** a live secret.
- Privileged actions use `lib/auth/authorization.ts` — **current DB** role/status, not stale JWT claims alone.
- User writes enforce ownership; admin actor IDs are server-derived.
- Borrow / fine / hard-delete paths use transactions and row locks where required.
- Hard delete requires `ADMIN_DELETE_SECRET` (never reuse `AUTH_SECRET`).
- Apply migration `0009_users_audit_fields.sql` before code that selects `users.updated_at` / `updated_by`.

Private vulnerability reporting: **[SECURITY.md](./SECURITY.md)**.

---

## Getting Started

### Prerequisites

- Node.js **20.9+** (24.x recommended on Vercel)
- npm
- PostgreSQL (local Docker, Neon, Supabase, Railway, etc.)
- Recommended for full features: ImageKit, Upstash Redis, Brevo and/or Resend

### Do you need a `.env`?

**Yes for a real run.** This project talks to PostgreSQL and signs sessions with Auth.js, so at minimum you need `DATABASE_URL` and `AUTH_SECRET` (plus URL vars). There is **no** zero-config offline mode that skips those.

Optional services (uploads, rate limits, email, workflows, cron) can stay empty until you enable them — those features simply will not work until configured. Start from the template:

```bash
cp .env.example .env
```

Never commit `.env`. Only [`.env.example`](.env.example) with placeholders belongs in git.

### Install & run

```bash
git clone https://github.com/arnobt78/Library-Management-System--NextJS-FullStack.git
cd Library-Management-System--NextJS-FullStack
npm install

# Fill .env (see Environment Variables below)
cp .env.example .env

# Push schema / apply migrations as needed
# (also apply SQL under migrations/, e.g. 0009 + 0010, on each environment)
npm run db:migrate

# Wipe transactional data and seed 17 books + Test User / Test Admin
npm run seed:reset

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
# Optional real DB suite (disposable DB only — never production):
TEST_DATABASE_URL=postgresql://… npm run test:integration
npm audit --audit-level=low
```

---

## Environment Variables

Copy [`.env.example`](.env.example) and fill values. Variables marked **REQUIRED** are needed for their feature group.

### Required for basic local app

| Variable                        | Public? | Purpose                                  |
| ------------------------------- | ------- | ---------------------------------------- |
| `DATABASE_URL`                  | No      | PostgreSQL URI                           |
| `AUTH_SECRET`                   | No      | Auth.js signing secret                   |
| `NEXTAUTH_URL`                  | No      | App origin, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_API_ENDPOINT`      | Yes     | Browser API base (often same origin)     |
| `NEXT_PUBLIC_PROD_API_ENDPOINT` | Yes     | Production origin                        |

### Uploads (ImageKit) — required for media features

| Variable                            | Public? | Purpose                 |
| ----------------------------------- | ------- | ----------------------- |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`   | Yes     | Client upload / display |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Yes     | CDN endpoint            |
| `IMAGEKIT_PRIVATE_KEY`              | No      | Server upload auth      |

### Rate limiting (Upstash Redis)

| Variable                                              | Purpose                                       |
| ----------------------------------------------------- | --------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Preferred REST credentials                    |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN`           | Compatibility aliases used by `lib/config.ts` |

### Email (at least one provider for delivery)

| Variable                                                     | Purpose                               |
| ------------------------------------------------------------ | ------------------------------------- |
| `BREVO_API_KEY` · `BREVO_SENDER_EMAIL` · `BREVO_SENDER_NAME` | Primary transactional email           |
| `RESEND_TOKEN` · `RESEND_SENDER_EMAIL`                       | Fallback / reservation READY delivery |

### Workflows (optional)

| Variable                      | Purpose                    |
| ----------------------------- | -------------------------- |
| `QSTASH_URL` · `QSTASH_TOKEN` | QStash API                 |
| `ENABLE_WORKFLOWS`            | `"true"` to enable locally |

### Admin hard delete & cron

| Variable              | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `ADMIN_DELETE_SECRET` | Typed in delete dialog (distinct from `AUTH_SECRET`) |
| `CRON_SECRET`         | Bearer for `/api/cron/reservation-notifications`     |

### Optional

| Variable                                    | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| `AUTH_TRUST_HOST`                           | `"true"` only behind a trusted proxy     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | If Google OAuth is enabled in `auth.ts`  |
| `TEST_DATABASE_URL`                         | Disposable DB for integration tests only |

Platform-injected values (`NODE_ENV`, `VERCEL`, `VERCEL_URL`) should **not** be hand-set in `.env`.

---

## How to Obtain Each Secret

1. **`AUTH_SECRET` / `ADMIN_DELETE_SECRET` / `CRON_SECRET`**

   ```bash
   openssl rand -base64 32
   # stronger cron example:
   openssl rand -base64 48
   # or:
   npx auth secret
   ```

   Use **different** values for each secret.

2. **`DATABASE_URL`**
   - Local: Docker / Homebrew Postgres → `postgresql://user:pass@localhost:5432/library`
   - Cloud: Neon / Supabase / Railway → copy URI (`sslmode=require` when required)

3. **ImageKit** — [imagekit.io](https://imagekit.io) → Developer → API keys + URL endpoint

4. **Upstash Redis** — [console.upstash.com/redis](https://console.upstash.com/redis) → REST URL + token

5. **QStash** — Upstash → QStash → URL + token ([local QStash docs](https://upstash.com/docs/qstash/howto/local-development))

6. **Brevo** — [app.brevo.com](https://app.brevo.com) → API keys; verify sender

7. **Resend** — [resend.com/api-keys](https://resend.com/api-keys) + domain verification for production

8. **Vercel** — Project → Settings → Environment Variables → paste the same keys for Production / Preview; set Node.js to **24.x** (project + overrides) and redeploy. Cron schedules must respect plan limits (this repo uses a daily reservation recovery cron for Hobby-friendly schedules).

---

## Demo Test Accounts

Shared constants live in `constants/index.ts` as `TEST_ACCOUNTS`. Reset the database and seed books + both accounts with:

```bash
npm run seed:reset
```

That script:

1. Deletes transactional tables in FK-safe order (`reservation_events` → … → `users`)
2. Preserves `system_config`
3. Inserts **17 books** from `dummybooks.json` with `availableCopies = totalCopies` (Algorithms is featured)
4. Inserts Test User + Test Admin with scrypt-hashed passwords and local avatar paths

| Role       | Email            | Password   | Avatar (`university_card`) |
| ---------- | ---------------- | ---------- | -------------------------- |
| Test User  | `test@user.com`  | `12345678` | `/images/profile-img1.png` |
| Test Admin | `test@admin.com` | `12345678` | `/images/profile-img2.png` |

The sign-in Select shows a **circle avatar + name + email**. After login, `UserAvatar` + `resolveUniversityCard` render local `/images/*`, remote `http(s)`, or ImageKit paths correctly.

> Demo passwords are for local/shared demo DBs only — never reuse them as real user credentials in production.

---

## Scripts & Tooling

| Script                     | Command                               | Use                          |
| -------------------------- | ------------------------------------- | ---------------------------- |
| Dev                        | `npm run dev`                         | Local development            |
| Build / Start              | `npm run build` · `npm start`         | Production                   |
| Typecheck / Lint / Test    | `npm run typecheck` · `lint` · `test` | Quality gates                |
| Integration tests          | `npm run test:integration`            | Disposable Postgres only     |
| Reset + seed               | `npm run seed:reset`                  | 17 books + Test User / Admin |
| Drizzle generate / migrate | `npm run db:generate` · `db:migrate`  | Schema tooling               |
| Drizzle studio             | `npm run db:studio`                   | Browse data                  |

> Older one-off scripts (`seed:test-profiles`, `delete-book`, verify/fix helpers) were retired in favor of `seed:reset` and in-app admin flows.

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

### Borrow History: treat SSR data as fresh

```tsx
// components/MyProfileTabs.tsx (concept)
const [ssrTimestamp] = React.useState(() => Date.now());

useUserBorrows(
  userId,
  undefined,
  ssrInitialData, // BorrowRecordFull[] with nested book
  ssrInitialData ? ssrTimestamp : undefined, // initialDataUpdatedAt
);
```

### Invalidate after book mutations

```ts
// Concept from hooks/useMutations.ts + lib/utils/queryInvalidation.ts
onSuccess: async () => {
  await invalidateMutation(queryClient, "book.write");
};
// Book forms may also call router.refresh() for RSC sync
```

### Password hashing (scrypt)

```ts
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const encoded = await hashPassword("correct horse battery staple");
const ok = await verifyPassword("correct horse battery staple", encoded);
```

### Resolve profile / university card images

```ts
import { resolveUniversityCard } from "@/lib/media/universityCard";

const resolved = resolveUniversityCard("/images/profile-img1.png");
// { kind: "local", src: "/images/profile-img1.png" }
```

### Zod book schema (excerpt)

```ts
// lib/validations.ts
export const bookSchema = z.object({
  title: z.string().trim().min(2).max(100),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  // …
});
```

---

## Important Libraries (Beginner Notes)

| Library               | What it is           | How this project uses it                     |
| --------------------- | -------------------- | -------------------------------------------- |
| **Next.js**           | React meta-framework | App Router pages, API routes, server actions |
| **React**             | UI library           | Components; Server vs Client split           |
| **TypeScript**        | Typed JavaScript     | Catch contract bugs before runtime           |
| **Drizzle**           | Type-safe ORM        | `database/schema.ts` → PostgreSQL            |
| **Auth.js**           | Auth toolkit         | Credentials login + JWT session              |
| **TanStack Query**    | Server-state cache   | Lists/details + invalidation after mutations |
| **Zod**               | Schema validation    | Forms and trusted input boundaries           |
| **React Hook Form**   | Form state           | Auth + Book forms with Zod resolver          |
| **ImageKit**          | Media CDN            | Covers, ID cards, video                      |
| **Upstash Redis**     | Serverless Redis     | Rate limits only                             |
| **Resend / Brevo**    | Transactional email  | Reminders + reservation READY mail           |
| **Vitest**            | Test runner          | Unit + integration tests                     |
| **Tailwind / shadcn** | Styling + primitives | Consistent, accessible UI                    |

---

## Reusing Pieces in Other Projects

| Piece                                   | How to reuse                                                           |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `components/ui/*`                       | Copy via shadcn CLI; keep `cn()` in `lib/utils.ts`                     |
| `QueryProvider` + invalidation registry | Drop into any App Router app; standardize mutation `onSuccess`         |
| `UserAvatar` + `resolveUniversityCard`  | Any profile image that may be local, URL, or ImageKit                  |
| `FileUpload` + `/api/auth/imagekit`     | Needs ImageKit env vars                                                |
| `AuthForm` + `lib/auth/password.ts`     | Adapt Zod schemas; keep scrypt verify/rehash pattern                   |
| Drizzle `schema.ts`                     | Start a new DB module; snake_case DB / camelCase TS                    |
| `DeleteBookDialog` pattern              | Any destructive action gated by an env secret                          |
| Circulation outbox pattern              | Retry-safe side effects with lease + cron recovery                     |
| `seed:reset` pattern                    | One atomic wipe + reseed script beats many one-off maintenance scripts |

When porting, keep **SSR `initialData` + typed invalidation** so navigation stays fast and data stays coherent across lists, detail pages, and back-button returns.

---

## Security

- See **[SECURITY.md](./SECURITY.md)** for private vulnerability reporting (`contact@arnobmahmud.com`).
- Never expose `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_DELETE_SECRET`, `IMAGEKIT_PRIVATE_KEY`, Redis/email/cron tokens to the browser.
- Prefer soft-deactivate (`isActive`) for normal catalog removal; hard-delete only for junk/test cleanup.
- Rotate secrets if they leak into git history, logs, or chat.
- Do not store real student PII on a public demo without institutional review.

---

## Contributing & Support

- Repo: [https://github.com/arnobt78/Library-Management-System--NextJS-FullStack](https://github.com/arnobt78/Library-Management-System--NextJS-FullStack)
- Portfolio: [https://www.arnobmahmud.com](https://www.arnobmahmud.com)
- Security contact: [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com) · policy: [SECURITY.md](./SECURITY.md)

Issues and PRs that improve docs, tests, accessibility, or performance are welcome.

---

## Conclusion

**BookWise** is a complete, learning-friendly university library platform: catalog, borrow + reservation lifecycle, reviews, admin operations, featured homepage hero, monitoring pages, scrypt auth, and a modern Next.js data architecture (RSC + TanStack Query + typed invalidation). Use it as a deployable demo, a study reference, or a toolkit of reusable forms, uploads, avatars, and cache-coherence patterns for your next project.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and distribute the code as per the terms of the license.

---

## Happy Coding! 🎉

This is an **open-source project** - feel free to use, enhance, and extend this project further!

If you have any questions or want to share your work, reach out via GitHub or my portfolio at [https://www.arnobmahmud.com](https://www.arnobmahmud.com).
