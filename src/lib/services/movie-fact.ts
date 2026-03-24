import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/gemini";

const rawCache = process.env.MOVIE_FACT_CACHE_MS;
const parsed =
  rawCache === undefined || rawCache === ""
    ? 60_000
    : Number.parseInt(rawCache, 10);

/** Rolling window (default 60s). Set `MOVIE_FACT_CACHE_MS=0` to disable cache (Phase 1-style). */
export const CACHE_WINDOW_MS = Number.isFinite(parsed) && parsed >= 0 ? parsed : 60_000;

export type MovieFactSuccess = {
  ok: true;
  fact: string;
  /** cache = served from recent row; generated = new Gemini call; fallback = error path used last stored fact */
  source: "cache" | "generated" | "fallback";
};

export type MovieFactFailure = {
  ok: false;
  error: string;
  status: number;
};

export type MovieFactResult = MovieFactSuccess | MovieFactFailure;

/** Exported for unit tests of the rolling cache window. */
export function isWithinCacheWindow(createdAt: Date, nowMs: number): boolean {
  if (CACHE_WINDOW_MS === 0) return false;
  return nowMs - createdAt.getTime() < CACHE_WINDOW_MS;
}

const TX_SHORT = { maxWait: 10_000, timeout: 15_000 };

/** Coalesce concurrent HTTP handlers (e.g. React Strict Mode double-mount) into one Gemini round-trip. */
const inFlightByUserId = new Map<string, Promise<MovieFactResult>>();

async function withAdvisoryLock<T>(
  userId: string,
  favoriteMovieId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        abs(hashtext(${userId})),
        abs(hashtext(${favoriteMovieId}))
      )
    `;
    return fn(tx);
  }, TX_SHORT);
}

/**
 * Returns a fun fact for the user's favorite movie: rolling 60s cache, advisory lock
 * around DB checks/inserts only (Gemini runs outside transactions so Neon/serverless
 * does not hold a connection open for the full LLM latency).
 */
export async function getOrCreateMovieFact(
  userId: string
): Promise<MovieFactResult> {
  const existing = inFlightByUserId.get(userId);
  if (existing) return existing;

  const promise = getOrCreateMovieFactInner(userId).finally(() => {
    inFlightByUserId.delete(userId);
  });
  inFlightByUserId.set(userId, promise);
  return promise;
}

async function getOrCreateMovieFactInner(
  userId: string
): Promise<MovieFactResult> {
  const favorite = await prisma.favoriteMovie.findUnique({
    where: { userId },
  });

  if (!favorite) {
    return {
      ok: false,
      error: "No favorite movie on file. Complete onboarding first.",
      status: 400,
    };
  }

  const now = Date.now();

  const latest = await prisma.movieFact.findFirst({
    where: { userId, favoriteMovieId: favorite.id },
    orderBy: { createdAt: "desc" },
  });

  if (latest && isWithinCacheWindow(latest.createdAt, now)) {
    return { ok: true, fact: latest.content, source: "cache" };
  }

  // 1) Under lock: see if another request filled the cache while we waited.
  const peek = await withAdvisoryLock(userId, favorite.id, async (tx) => {
    const row = await tx.movieFact.findFirst({
      where: { userId, favoriteMovieId: favorite.id },
      orderBy: { createdAt: "desc" },
    });
    return row;
  });

  if (peek && isWithinCacheWindow(peek.createdAt, Date.now())) {
    return { ok: true, fact: peek.content, source: "cache" };
  }

  // 2) Gemini runs outside any DB transaction (avoids long-held connections / tx timeouts).
  let content: string;
  try {
    content = await generateMovieFact(favorite.title);
  } catch (err) {
    console.error("[movie-fact] Gemini request failed:", err);

    const fallback = await prisma.movieFact.findFirst({
      where: { userId, favoriteMovieId: favorite.id },
      orderBy: { createdAt: "desc" },
    });

    if (fallback) {
      return {
        ok: true,
        fact: fallback.content,
        source: "fallback",
      };
    }

    return {
      ok: false,
      error:
        "We could not load a fun fact right now. Please try again in a moment.",
      status: 503,
    };
  }

  // 3) Under lock: insert, or return fresher row if a concurrent request won the race.
  try {
    const outcome = await withAdvisoryLock(userId, favorite.id, async (tx) => {
      const latestAfter = await tx.movieFact.findFirst({
        where: { userId, favoriteMovieId: favorite.id },
        orderBy: { createdAt: "desc" },
      });

      if (
        latestAfter &&
        isWithinCacheWindow(latestAfter.createdAt, Date.now())
      ) {
        return { fact: latestAfter.content, source: "cache" as const };
      }

      await tx.movieFact.create({
        data: {
          userId,
          favoriteMovieId: favorite.id,
          content,
        },
      });

      return { fact: content, source: "generated" as const };
    });

    return {
      ok: true,
      fact: outcome.fact,
      source: outcome.source,
    };
  } catch (err) {
    console.error("[movie-fact] Failed to persist fact:", err);

    const fallbackOuter = await prisma.movieFact.findFirst({
      where: { userId, favoriteMovieId: favorite.id },
      orderBy: { createdAt: "desc" },
    });

    if (fallbackOuter) {
      return {
        ok: true,
        fact: fallbackOuter.content,
        source: "fallback",
      };
    }

    return {
      ok: false,
      error:
        "We could not load a fun fact right now. Please try again in a moment.",
      status: 503,
    };
  }
}
