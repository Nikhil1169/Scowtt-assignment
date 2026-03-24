import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  CACHE_WINDOW_MS,
  getOrCreateMovieFact,
  isWithinCacheWindow,
} from "./movie-fact";
import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/gemini";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    favoriteMovie: { findUnique: vi.fn() },
    movieFact: { findFirst: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/lib/gemini", () => ({
  generateMovieFact: vi.fn(),
}));

const mockedPrisma = vi.mocked(prisma);
const mockedGemini = vi.mocked(generateMovieFact);

/** Prisma client is mocked; nested methods are vi.fn() but TS keeps Prisma types unless cast. */
const mockFindFavorite = mockedPrisma.favoriteMovie.findUnique as Mock;
const mockFindFact = mockedPrisma.movieFact.findFirst as Mock;
const mockTransaction = mockedPrisma.$transaction as Mock;

describe("isWithinCacheWindow", () => {
  it("returns true when fact is newer than the cache window", () => {
    const now = new Date("2025-01-01T12:00:00.000Z").getTime();
    const created = new Date("2025-01-01T11:59:30.000Z");
    expect(isWithinCacheWindow(created, now)).toBe(true);
  });

  it("returns false when fact is older than the cache window", () => {
    const now = new Date("2025-01-01T12:00:00.000Z").getTime();
    const created = new Date(
      new Date("2025-01-01T12:00:00.000Z").getTime() - CACHE_WINDOW_MS - 1
    );
    expect(isWithinCacheWindow(created, now)).toBe(false);
  });
});

describe("getOrCreateMovieFact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached fact without calling Gemini when latest row is within 60s", async () => {
    const userId = "user-a";
    const favorite = {
      id: "fm-1",
      userId,
      title: "Se7en",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const recent = {
      id: "fact-1",
      userId,
      favoriteMovieId: favorite.id,
      content: "cached line",
      createdAt: new Date(),
    };

    mockFindFavorite.mockResolvedValue(favorite);
    mockFindFact.mockResolvedValue(recent);

    const result = await getOrCreateMovieFact(userId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fact).toBe("cached line");
      expect(result.source).toBe("cache");
    }
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("does not return another user's movie: each lookup is scoped by userId", async () => {
    mockFindFavorite.mockImplementation(
      async (args: { where: { userId: string } }) => {
        if (args.where.userId === "user-a") {
          return {
            id: "fm-a",
            userId: "user-a",
            title: "Hereditary",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      }
    );

    mockFindFact.mockResolvedValue(null);
    mockTransaction.mockRejectedValue(new Error("should not run"));

    const result = await getOrCreateMovieFact("user-b");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
    expect(mockFindFavorite).toHaveBeenCalledWith({
      where: { userId: "user-b" },
    });
  });
});
