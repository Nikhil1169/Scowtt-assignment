# Movie Memory

## 1. Project Overview

**Movie Memory** is a small full-stack web app where users sign in with Google, complete a one-time onboarding step (favorite movie title), and land on a dashboard that shows their profile and an AI-generated **fun fact** about that movie. Facts are persisted in Postgres, with **Variant A** behavior: a rolling **60-second cache**, **concurrency-safe** generation, and **graceful degradation** when the LLM API fails.

**Tech stack**

| Layer | Technology |
|--------|------------|
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| Styling | **Tailwind CSS** v4 |
| Database | **PostgreSQL** (Neon) via **Prisma ORM** |
| Auth | **Auth.js / NextAuth v5** (`next-auth@5`), **Google OAuth**, **Prisma adapter** |
| Sessions | **JWT** (Edge-safe middleware; Prisma + adapter in Node handlers only) |
| LLM | **Google Gemini** (`@google/generative-ai`) — server-only; configurable model via env |
| Validation | **Zod** (onboarding favorite-movie title) |
| WebGL (landing) | **ogl** (Prism-style background on `/`) |
| Tests | **Vitest** |

**Note:** The exercise spec often references **OpenAI**; this codebase implements generation with **Gemini**. The caching, locking, and fallback logic in `src/lib/services/movie-fact.ts` are provider-agnostic aside from `src/lib/gemini.ts`.

---

## 2. Setup Instructions

### Prerequisites

- **Node.js** 20+ (see `package.json` / CI expectations)
- **npm** (or compatible package manager)
- Accounts: **Neon** (or any Postgres URL), **Google Cloud** OAuth client, **Google AI Studio** API key for Gemini

### Step-by-step (local)

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd nikhil_dalla
   npm install
   ```

   `postinstall` runs `prisma generate` so the Prisma client is generated under `src/generated/prisma`.

2. **Environment variables**

   Copy the example file and fill in real values:

   ```bash
   cp .env.example .env
   ```

   See **Environment variables** below for the full list and dummy examples.

3. **Database migrations (Neon / Postgres)**

   Point `DATABASE_URL` at your Neon database (SSL recommended for Neon).

   **Development** (creates/applies migrations and updates the DB):

   ```bash
   npx prisma migrate dev
   ```

   **Production / CI** (apply existing migrations only):

   ```bash
   npx prisma migrate deploy
   ```

   **Generate client only** (if you changed schema without migrating yet):

   ```bash
   npx prisma generate
   ```

4. **Google OAuth redirect URIs**

   In Google Cloud Console → OAuth client, add:

   - `http://localhost:3000/api/auth/callback/google` (local)
   - Your production origin + `/api/auth/callback/google` when deployed

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Environment variables (reference — use real secrets locally)

| Variable | Required | Example (dummy) | Purpose |
|----------|----------|-------------------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require` | Neon Postgres connection |
| `AUTH_SECRET` | Yes | `dGVzdC1zZWNyZXQtbWluaW11bS0zMi1jaGFycy1sb25n` | Auth.js session signing (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Yes | `123456789-abc.apps.googleusercontent.com` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | `GOCSPX-dummysecretvalue` | Google OAuth client secret |
| `GEMINI_API_KEY` | Yes | `AIzaSyDummyKeyForReadmeOnly` | Google AI Studio / Gemini API key |
| `AUTH_URL` or `NEXTAUTH_URL` | Deploy | `https://your-app.vercel.app` | Public site URL (Auth.js) |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Override default model (code default: `gemini-2.5-flash`) |
| `MOVIE_FACT_CACHE_MS` | No | `60000` or `0` | Cache window ms (`0` = always call LLM when policy allows) |

Example `.env` skeleton (do not commit real secrets):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
AUTH_SECRET="replace-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-secret"
GEMINI_API_KEY="your-gemini-api-key"
# GEMINI_MODEL="gemini-2.5-flash"
# MOVIE_FACT_CACHE_MS="60000"
```

### Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm test` | Vitest (`vitest run`) |
| `npx prisma studio` | Browse DB in GUI |

---

## 3. Architecture Overview

### Next.js App Router

- **`/`** — Public landing (Prism WebGL background); redirects authenticated users to onboarding or dashboard.
- **`/onboarding`** — Server-validated favorite movie; writes `FavoriteMovie` and sets `User.onboardingCompleted`.
- **`/dashboard`** — Profile + fun fact panel (client fetch to API).

**Middleware** (`src/middleware.ts`) uses a **Prisma-free** Auth config (`src/auth.config.ts`) so it stays Edge-compatible; it redirects unauthenticated users away from `/dashboard` and `/onboarding`.

### API routes

| Route | Role |
|-------|------|
| `GET /api/movie-fact` | Returns a fun fact for the **session user only** (`session.user.id`). No movie IDs from the client. **Node runtime** (`export const runtime = "nodejs"`) for Prisma + Gemini. |
| `/api/auth/[...nextauth]` | Auth.js handlers (Google sign-in/out). |

Business logic for facts lives in **`src/lib/services/movie-fact.ts`**, not in the route handler. LLM calls are isolated in **`src/lib/gemini.ts`**.

### Database schema (Prisma)

- **Auth.js tables:** `User`, `Account`, `Session`, `VerificationToken` (see `prisma/schema.prisma`).
- **App tables:**
  - **`FavoriteMovie`** — one row per user (`userId` unique); `title` from onboarding.
  - **`MovieFact`** — append-only rows (`userId`, `favoriteMovieId`, `content`, `createdAt`) for audit and cache fallback.

Indexes support “latest fact per user+movie” queries.

### Auth flow

- **JWT sessions** with **Prisma adapter** for OAuth account linking and user persistence.
- **`jwt` / `session` callbacks** copy `name`, `email`, and `picture` into the token/session so profile data survives beyond the first response.

---

## 4. Variant Selection: **Variant A (Backend-Focused)**

**Variant A** was implemented: **caching & correctness** on the server, not extra UI features.

**Why this variant**

- **Backend correctness** — Authorization is enforced by always resolving the favorite movie and facts by **`session.user.id`** only; the API does not trust client-supplied movie IDs.
- **Rate limits & 503s** — A **60s rolling cache** reduces duplicate Gemini calls. **Single-flight** (`Map` per user) and **Postgres advisory locks** reduce bursts. **429** is retried once with backoff in `gemini.ts`. On hard failure, the service returns the **last stored fact** when available, otherwise a **clean 503 JSON** message (no secrets leaked).
- **Data integrity** — New facts are written in **short transactions** with `pg_advisory_xact_lock` so concurrent tabs don’t corrupt state; Gemini runs **outside** long DB transactions to avoid Neon/serverless connection issues.

---

## 5. Key Tradeoffs

### 60-second cache window

- **Behavior:** The latest `MovieFact` for `(userId, favoriteMovieId)` is reused if `createdAt` is within **`MOVIE_FACT_CACHE_MS`** (default **60_000** ms). **`CACHE_WINDOW_MS === 0`** disables the time check (always eligible for a new generation subject to locking).
- **Tradeoff:** Rolling window vs fixed clock buckets — simpler mental model and matches “last fact younger than 60s” without extra columns.

### Concurrency / burst protection

1. **In-process single-flight** — `inFlightByUserId` ensures concurrent HTTP requests for the same user **share one** `getOrCreateMovieFact` promise (helps React Strict Mode double-fetch in dev).
2. **Postgres `pg_advisory_xact_lock`** — Short transactions serialize “peek / insert” per `(userId, favoriteMovieId)` so two tabs don’t both insert redundant rows in a race.
3. **Gemini outside transactions** — Avoids holding a DB connection open for the full LLM latency (important on Neon).

**Tradeoff:** Single-flight is per Node process; in multi-instance deploys, advisory locks still protect the DB; duplicate LLM calls across instances are reduced by cache + lock, not eliminated without a distributed lock.

### Failure handling

- **Gemini errors** (timeout, 429 after retry, empty body) → load **most recent** `MovieFact` for that user+movie if any → response `source: "fallback"` when applicable.
- **No rows and LLM failed** → **503** with a generic user-facing string; errors logged server-side.
- **Persist failure after a successful generation** → try same fallback path.

---

## 6. Future Improvements (≈2 more hours)

- **Tests:** Integration tests against a test DB for advisory-lock behavior; API route tests with mocked `auth()`; expand Gemini mocks for 429/timeout paths.
- **UI:** Skeleton/error/retry on the dashboard fact panel; optional “Refresh” with debounce.
- **Observability:** Structured logging (request id, `userId` hash), metrics for cache hit rate and LLM latency.
- **Caching layer:** Redis for cross-instance single-flight or rate limiting (only if product needs multi-region scale).
- **Content:** Stricter prompt validation; optional moderation hook for LLM output.
- **Accessibility:** Audit Prism landing + focus states on auth flows.

---

## 7. AI Usage

### Scaffolding the Base Implementation

I used AI to accelerate the initial setup. By providing my chosen database (Neon DB) and my proposed Prisma schema, I used AI to generate the foundational boilerplate for the Next.js routes, NextAuth integration, and basic database connections.

### Refining the Caching Strategy

For Variant A, I designed and provided the initial caching strategy—combining a 60-second rolling cache window with Postgres advisory locks to safely handle concurrency. When I faced implementation issues, particularly around preventing DB transactions from staying open during the Gemini API calls, I used AI to debug the code and refine my logic to ensure backend correctness.

### UI Integration

I utilized AI to assist in integrating the react-bits library, specifically to implement the WebGL Prism background animation on the landing page. This saved time on frontend styling so I could focus heavily on the backend architecture.

### Code Review & Refinement

While AI generated the initial structure, I manually reviewed, audited, and refined all business logic, database queries, and failure-handling paths to ensure strict adherence to the project's security and authorization requirements.
