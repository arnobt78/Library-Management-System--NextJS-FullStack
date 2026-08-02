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

A production-oriented full-stack **university library** platform (**BookWise**) built with the **Next.js App Router**, **React 19**, **strict TypeScript**, **PostgreSQL + Drizzle ORM**, **Auth.js (NextAuth v5)**, **TanStack Query**, **Upstash Redis** (rate limits only), **ImageKit**, and multi-provider email. It teaches a real architecture: server-first pages, client hydration, typed mutations, domain invalidation, and secure admin operations.

- **Live demo:** [https://university-library-managment.vercel.app/](https://university-library-managment.vercel.app/)
- **Security:** private reports → [SECURITY.md](./SECURITY.md) · [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
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
12. [Authentication & Security Model](#authentication--security-model)
13. [Getting Started](#getting-started)
14. [Environment Variables](#environment-variables)
15. [How to Obtain Each Secret](#how-to-obtain-each-secret)
16. [Demo Test Accounts](#demo-test-accounts)
17. [Scripts & Tooling](#scripts--tooling)
18. [Educational Code Snippets](#educational-code-snippets)
19. [Important Libraries (Beginner Notes)](#important-libraries-beginner-notes)
20. [Reusing Pieces in Other Projects](#reusing-pieces-in-other-projects)
21. [Security](#security)
22. [Contributing & Support](#contributing--support)
23. [Conclusion](#conclusion)
24. [License](#license)

---

## What You Will Learn

This repository is both a **working library product** and a **full-stack learning lab**:

- **App Router** server components (`page.tsx`) for fast first paint vs **`"use client"`** for interactivity
- **Drizzle ORM** schema, SQL migrations, and typed PostgreSQL access
- **Auth.js v5** credentials login, JWT sessions, DB-backed role/status authority
- **scrypt** password hashing with safe legacy SHA-256 verify + rehash-on-login
- **TanStack Query** with SSR `initialData`, typed query keys, mutation-domain invalidation, same-origin tab sync
- **Zod + React Hook Form** for validated auth and book forms
- **shadcn/ui + Tailwind** for public (dark) and admin (light) UI
- External services: **ImageKit**, **Upstash Redis** (rate limit only), **QStash** workflows, **Brevo / Resend**
- Library domain: featured hero, borrow lifecycle, **reservations / waitlist / renewals**, reviews, fines, analytics, user 360

---

## Features Overview

### Public / student app

| Feature           | What it does                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| Auth              | Sign up / sign in; new accounts often start `PENDING` until admin approval |
| Demo dropdown     | Sign-in Select shows Test User / Test Admin with avatar + email (seeded)   |
| Catalog           | Browse, search/filter, open book detail                                    |
| Featured hero     | Homepage curated `isFeatured` book (else newest active)                    |
| Borrow            | Request → admin approve → due dates / return                               |
| Reservations      | Hold / waitlist / READY notifications (outbox + cron recovery)             |
| Profile           | Borrowing history, reservations panel, stats                               |
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

| Keyword                | Meaning here                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **App Router**         | File-based routing under `app/` (`page.tsx`, `layout.tsx`, `route.ts`)                |
| **RSC**                | React Server Component — can query the DB on the server                               |
| **Client component**   | `"use client"` — hooks, browser APIs, interactive UI                                  |
| **Server action**      | `"use server"` callable from the client (e.g. book CRUD)                              |
| **SSR hydration**      | Pass `initialData` from `page.tsx` into React Query                                   |
| **Invalidation**       | Mark query keys stale so active observers refetch after CRUD                          |
| **Mutation registry**  | Typed family → query domains + RSC paths (`queryInvalidation` / `revalidateMutation`) |
| **Featured book**      | `books.is_featured` — at most one curated homepage hero                               |
| **Soft delete**        | `isActive = false` — hide without removing rows                                       |
| **Hard delete**        | Physically delete book + related rows (needs `ADMIN_DELETE_SECRET`)                   |
| **RBAC**               | `USER` vs `ADMIN` (DB role is authoritative over JWT claims)                          |
| **Reservation outbox** | Retry-safe READY email delivery with lease / dead-letter / cron                       |
| **Drizzle**            | TypeScript ORM mapping schema → SQL                                                   |
| **Zod**                | Runtime schema validation                                                             |

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
  ├─ Auth.js session (JWT) + DB role/status checks
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

---

## Project Structure

```text
university-library/
├── app/
│   ├── (auth)/                 # Sign-in / sign-up
│   ├── (root)/                 # Public app (home, books, profile, performance)
│   ├── admin/                  # Admin dashboard (+ users/[id] 360)
│   ├── api/                    # Route Handlers (REST-style JSON)
│   │   ├── auth/               # NextAuth + ImageKit auth
│   │   ├── books/              # Catalog, featured, recommendations
│   │   ├── borrow-records/
│   │   ├── reviews/
│   │   ├── admin/              # Stats, fines, exports, analytics, …
│   │   ├── cron/               # Reservation notification recovery
│   │   ├── status/             # Health / metrics
│   │   └── workflows/          # Optional QStash onboarding
│   ├── api-docs/ · api-status/
│   ├── fonts/                  # next/font/local (IBM Plex, Bebas)
│   ├── layout.tsx · globals.css
├── components/                 # Feature UI + components/ui (shadcn)
├── constants/                  # Nav, FIELD_*, TEST_ACCOUNTS
├── database/                   # schema.ts, drizzle.ts, redis.ts, seed.ts
├── hooks/                      # useQueries, useMutations, useSafeMedia
├── lib/
│   ├── auth/                   # password (scrypt), authorization
│   ├── admin/actions/          # Privileged server operations
│   ├── circulation/            # Reservations, outbox, renewals
│   ├── media/                  # universityCard resolver, upload validation
│   ├── query/keys.ts           # Query-key factory
│   ├── utils/queryInvalidation.ts · revalidateMutation.ts
│   ├── validations.ts          # Zod schemas
│   └── services/               # Fetch helpers for hooks
├── migrations/                 # SQL (featured, audit, reservations, …)
├── scripts/                    # seed-test-profiles, delete-book, …
├── docs/                       # Walkthrough, guides, playbooks
├── .agile-v/                   # Requirements / gates / decisions (agents)
├── auth.ts · proxy.ts
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
| `borrow_records`       | `PENDING` → `BORROWED` → `RETURNED`, fines, due dates                      |
| `reservations`         | Waitlist / hold / READY lifecycle                                          |
| `reservation_events`   | Reservation event history                                                  |
| `circulation_commands` | Idempotent circulation command ledger                                      |
| `operation_telemetry`  | Bounded ops / SLO telemetry                                                |
| `book_reviews`         | Ratings + comments                                                         |
| `admin_requests`       | Become-admin requests                                                      |
| `system_config`        | Fine amounts and runtime knobs                                             |

Enums include status, role, borrow status, and reservation status.

Apply SQL under `migrations/` (including `0010_reservations.sql` for circulation) before expecting reservation features.

---

## Routes (Pages)

### Public (`app/(root)/`)

| Path           | Description                        |
| -------------- | ---------------------------------- |
| `/`            | Featured hero + recommendations    |
| `/all-books`   | Full catalog with filters          |
| `/books/[id]`  | Detail, borrow, reserve, reviews   |
| `/my-profile`  | Borrowing + reservations dashboard |
| `/performance` | Performance / metrics UI           |

### Auth (`app/(auth)/`)

| Path       | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| `/sign-in` | Credentials login + test-account Select (avatar / name / email) |
| `/sign-up` | Registration + university ID card upload                        |

### Admin (`app/admin/`)

| Path                                   | Description                   |
| -------------------------------------- | ----------------------------- |
| `/admin`                               | Dashboard home                |
| `/admin/books` · `/new` · `/[id]/edit` | Book CRUD + featured checkbox |
| `/admin/users` · `/admin/users/[id]`   | Users list + 360 profile      |
| `/admin/book-requests`                 | Borrow approvals              |
| `/admin/account-requests`              | Admin access requests         |
| `/admin/automation`                    | Fines & reminders             |
| `/admin/business-insights`             | Analytics                     |

### Meta

| Path          | Description              |
| ------------- | ------------------------ |
| `/api-docs`   | API documentation UI     |
| `/api-status` | Service health dashboard |
| `/too-fast`   | Rate-limit friendly page |
| `/make-admin` | Request elevated access  |

---

## API Endpoints

Route Handlers live under `app/api/**/route.ts` (Node.js runtime where DB is needed).

### Books

| Method | Path                           | Notes                               |
| ------ | ------------------------------ | ----------------------------------- |
| `GET`  | `/api/books`                   | List + search / filter / pagination |
| `GET`  | `/api/books/[id]`              | Single book                         |
| `GET`  | `/api/books/featured`          | Featured first, then newest active  |
| `GET`  | `/api/books/genres`            | Distinct genres                     |
| `GET`  | `/api/books/recommendations`   | Personalized / fallback             |
| `GET`  | `/api/books/[id]/borrow-stats` | Borrow counters                     |

Book **writes** are primarily **server actions** in `lib/admin/actions/` (not REST PUT/DELETE).

### Auth & media

| Method | Path                      | Notes                           |
| ------ | ------------------------- | ------------------------------- |
| `*`    | `/api/auth/[...nextauth]` | Auth.js handlers                |
| `GET`  | `/api/auth/imagekit`      | Upload auth params for ImageKit |

### Borrows, users, reviews

| Method          | Path                                           | Notes                     |
| --------------- | ---------------------------------------------- | ------------------------- |
| `GET` / `POST`… | `/api/borrow-records`                          | Borrow list / create      |
| `GET`           | `/api/users`                                   | Authorized user listing   |
| `GET`           | `/api/reviews/[bookId]`                        | Reviews for a book        |
| `POST`…         | `/api/reviews/edit`, `/delete`, `/eligibility` | Review mutations & checks |

### Admin automation & analytics

Under `/api/admin/`: `stats`, `analytics`, `fine-config`, `update-overdue-fines`, `send-due-reminders`, `send-overdue-reminders`, `export/*`, `export-stats`, `reminder-stats`, `generate-recommendations`, `update-trending-books`, `refresh-recommendation-cache`, `borrow-requests`, `admin-requests`.

### Cron / circulation recovery

| Method       | Path                                  | Notes                           |
| ------------ | ------------------------------------- | ------------------------------- |
| `GET`/`POST` | `/api/cron/reservation-notifications` | Secured by `CRON_SECRET` Bearer |

### Status / health

Under `/api/status/`: `health`, `database`, `authentication`, `email-service`, `file-storage`, `external-apis`, `api-server`, `metrics`.

### Workflows

| Method  | Path                        | Notes                         |
| ------- | --------------------------- | ----------------------------- |
| `POST`… | `/api/workflows/onboarding` | Upstash workflow when enabled |

---

## Reusable Components

| Component                                                     | Kind   | Purpose                                          |
| ------------------------------------------------------------- | ------ | ------------------------------------------------ |
| `BookCard` / `BookCover` / `BookList`                         | Mixed  | Catalog tiles & covers                           |
| `HomeFeaturedHero` / `HomeRecommendations`                    | Client | Homepage + RQ hydration                          |
| `BookBorrowButton` / `ReturnBookButton` / `ReserveBookButton` | Client | Circulation actions                              |
| `ReservationsPanel`                                           | Client | Profile / book reservation UI                    |
| `ReviewsSection` / `ReviewFormDialog`                         | Client | Reviews CRUD                                     |
| `AuthForm` / `SignInFormPage` / `SignUpFormPage`              | Client | Auth UX                                          |
| `UserAvatar`                                                  | Client | Local `/images`, remote URL, or ImageKit card    |
| `FileUpload`                                                  | Client | ImageKit picker                                  |
| `QueryProvider`                                               | Client | App-wide React Query + invalidation subscription |
| `AdminBooksList` / `DeleteBookDialog`                         | Client | Admin grid + secret-gated hard delete            |
| `PerformanceDashboard` / `AnalyticsCharts`                    | Client | Ops & charts                                     |
| `components/ui/*`                                             | shadcn | Button, Form, Dialog, Select, Avatar, Toast, …   |

**Reuse tip:** Compose `components/ui/*` + a thin feature wrapper. Pass RSC `initialData` into hooks to avoid duplicate first fetches.

---

## Hooks, Cache & Invalidation

| Piece                             | Role                                                       |
| --------------------------------- | ---------------------------------------------------------- |
| `hooks/useQueries.ts`             | Typed readers with optional SSR `initialData`              |
| `hooks/useMutations.ts`           | Central mutations, rollback, toasts, registry invalidation |
| `lib/query/keys.ts`               | Query-key factory / prefixes                               |
| `lib/utils/queryInvalidation.ts`  | Mutation → domains + BroadcastChannel tab sync             |
| `lib/utils/revalidateMutation.ts` | RSC path revalidation consumers                            |

**Learner model:**

1. RSC paints with server data.
2. Query hooks reuse that data (bounded freshness).
3. A successful mutation picks a **typed family** (e.g. `book.write`, `borrow.lifecycle`).
4. Active queries refetch; inactive ones go stale and refresh on navigation / back / focus.
5. Book CRUD may also call `router.refresh()` for the current RSC tree.

**Redis note:** Upstash Redis is for **rate limiting only**. PostgreSQL is the source of truth for catalog and circulation data.

---

## Authentication & Security Model

- Credentials sign-in via Auth.js; passwords hashed with **versioned scrypt** (`hashPassword` / `verifyPassword` in `lib/auth/password.ts`).
- Legacy `salt:hash` SHA-256 still verifies and upgrades on successful login.
- Privileged actions use `lib/auth/authorization.ts` — **current DB** role/status, not stale JWT claims alone.
- User writes enforce ownership; admin actor IDs are server-derived.
- Borrow / fine / hard-delete paths use transactions and row locks where required.
- Hard delete requires `ADMIN_DELETE_SECRET` (never reuse `AUTH_SECRET`).

---

## Getting Started

### Prerequisites

- Node.js **20.9+** (24.x recommended on Vercel)
- npm
- PostgreSQL (local Docker, Neon, etc.)
- Recommended for full features: ImageKit, Upstash Redis, Brevo and/or Resend

### Install & run

```bash
git clone https://github.com/arnobt78/Library-Management-System--NextJS-FullStack.git
cd Library-Management-System--NextJS-FullStack
npm install

# Copy env template and fill values (see Environment Variables)
cp .env.example .env

# Push / apply schema (and run SQL migrations as needed, e.g. 0010_reservations.sql)
npm run db:migrate

# Optional: seed sample books
npm run seed

# Optional: upsert demo Test User / Test Admin with avatars
npm run seed:test-profiles

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
# Optional real DB suite (disposable DB only):
TEST_DATABASE_URL=postgresql://… npm run test:integration
```

---

## Environment Variables

**You need a `.env` for a real local/production run** (at least PostgreSQL + auth). There is **no** zero-config mode that skips `DATABASE_URL` and `AUTH_SECRET`.

Optional features (uploads, rate limits, email, workflows, cron) can be left empty until you enable them — but those features will not work until configured.

```bash
cp .env.example .env
```

Never commit `.env`. Commit only [`.env.example`](.env.example) with placeholders.

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

### Email

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

| Variable              | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `ADMIN_DELETE_SECRET` | Typed in delete dialog / CLI                     |
| `CRON_SECRET`         | Bearer for `/api/cron/reservation-notifications` |

### Optional

| Variable                                    | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| `AUTH_TRUST_HOST`                           | `"true"` only behind a trusted proxy     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | If Google OAuth is enabled               |
| `TEST_DATABASE_URL`                         | Disposable DB for integration tests only |

Platform-injected values (`NODE_ENV`, `VERCEL`, `VERCEL_URL`) should **not** be hand-set in `.env`.

---

## How to Obtain Each Secret

1. **`AUTH_SECRET` / `ADMIN_DELETE_SECRET` / `CRON_SECRET`**

   ```bash
   openssl rand -base64 32
   # stronger cron example:
   openssl rand -base64 48
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

8. **Vercel** — Project → Settings → Environment Variables → paste the same keys for Production / Preview; set Node.js to **24.x** (project + overrides) and redeploy

---

## Demo Test Accounts

Shared constants live in `constants/index.ts` as `TEST_ACCOUNTS`. Seed (or refresh) them with:

```bash
npm run seed:test-profiles
```

| Role       | Email            | Password   | Avatar (`university_card`) |
| ---------- | ---------------- | ---------- | -------------------------- |
| Test User  | `test@user.com`  | `12345678` | `/images/profile-img1.png` |
| Test Admin | `test@admin.com` | `12345678` | `/images/profile-img2.png` |

The sign-in Select shows a **circle avatar + name + email**. After login, `UserAvatar` + `resolveUniversityCard` render local `/images/*`, remote `http(s)`, or ImageKit paths correctly.

> Demo passwords are for local/shared demo DBs only — never reuse them as real user credentials in production.

---

## Scripts & Tooling

| Script                    | Command                               | Use                                       |
| ------------------------- | ------------------------------------- | ----------------------------------------- |
| Dev                       | `npm run dev`                         | Local development                         |
| Build / Start             | `npm run build` · `npm start`         | Production                                |
| Typecheck / Lint / Test   | `npm run typecheck` · `lint` · `test` | Quality gates                             |
| Seed books                | `npm run seed`                        | Sample catalog                            |
| Seed demo profiles        | `npm run seed:test-profiles`          | Test User / Admin                         |
| Featured migration helper | `npm run db:migrate-featured`         | `is_featured` column/index                |
| Delete book CLI           | `npm run delete-book -- --id <uuid>`  | Hard-delete (+ optional `--force-return`) |
| Drizzle studio            | `npm run db:studio`                   | Browse data                               |

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
// Concept from hooks/useMutations.ts + lib/utils/queryInvalidation.ts
onSuccess: () => {
  invalidateAfterBookChange(queryClient); // typed family → domains + tab broadcast
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

| Library             | What it is           | How this project uses it                     |
| ------------------- | -------------------- | -------------------------------------------- |
| **Next.js**         | React meta-framework | App Router pages, API routes, server actions |
| **React**           | UI library           | Components; Server vs Client split           |
| **TypeScript**      | Typed JavaScript     | Catch contract bugs before runtime           |
| **Drizzle**         | Type-safe ORM        | `database/schema.ts` → PostgreSQL            |
| **Auth.js**         | Auth toolkit         | Credentials login + JWT session              |
| **TanStack Query**  | Server-state cache   | Lists/details + invalidation after mutations |
| **Zod**             | Schema validation    | Forms and trusted input boundaries           |
| **React Hook Form** | Form state           | Auth + Book forms with Zod resolver          |
| **ImageKit**        | Media CDN            | Covers, ID cards, video                      |
| **Upstash Redis**   | Serverless Redis     | Rate limits only                             |
| **Resend / Brevo**  | Transactional email  | Reminders + reservation READY mail           |
| **Vitest**          | Test runner          | Unit + integration tests                     |

---

## Reusing Pieces in Other Projects

| Piece                                   | How to reuse                                                   |
| --------------------------------------- | -------------------------------------------------------------- |
| `components/ui/*`                       | Copy via shadcn CLI; keep `cn()` in `lib/utils.ts`             |
| `QueryProvider` + invalidation registry | Drop into any App Router app; standardize mutation `onSuccess` |
| `UserAvatar` + `resolveUniversityCard`  | Any profile image that may be local, URL, or ImageKit          |
| `FileUpload` + `/api/auth/imagekit`     | Needs ImageKit env vars                                        |
| `AuthForm` + `lib/auth/password.ts`     | Adapt Zod schemas; keep scrypt verify/rehash pattern           |
| Drizzle `schema.ts`                     | Start a new DB module; snake_case DB / camelCase TS            |
| `DeleteBookDialog` pattern              | Any destructive action gated by an env secret                  |
| Circulation outbox pattern              | Retry-safe side effects with lease + cron recovery             |

When porting, keep **SSR `initialData` + typed invalidation** so navigation stays fast and data stays coherent.

---

## Security

- See **[SECURITY.md](./SECURITY.md)** for private vulnerability reporting (`contact@arnobmahmud.com`).
- Never expose `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_DELETE_SECRET`, `IMAGEKIT_PRIVATE_KEY`, Redis/email/cron tokens to the browser.
- Prefer soft-deactivate (`isActive`) for normal catalog removal; hard-delete only for junk/test cleanup.
- Rotate secrets if they leak into git history, logs, or chat.

---

## Contributing & Support

- Repo: [https://github.com/arnobt78/Library-Management-System--NextJS-FullStack](https://github.com/arnobt78/Library-Management-System--NextJS-FullStack)
- Portfolio: [https://www.arnobmahmud.com](https://www.arnobmahmud.com)
- Security contact: [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)

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
