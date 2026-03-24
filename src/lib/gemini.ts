import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";

const GEMINI_TIMEOUT_MS = 25_000;
const MAX_429_RETRIES = 1;

function getGenerativeModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction:
      "You are a film enthusiast. Respond with exactly one interesting, accurate fun fact about the movie named by the user. Plain text only, not more than 6 words. No markdown.",
    generationConfig: {
      maxOutputTokens: 220,
      temperature: 0.7,
    },
  });
}

async function generateMovieFactOnce(movieTitle: string): Promise<string> {
  const model = getGenerativeModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(
      {
        contents: [
          {
            role: "user",
            parts: [{ text: `Movie title: "${movieTitle}"` }],
          },
        ],
      },
      {
        signal: controller.signal,
        timeout: GEMINI_TIMEOUT_MS,
      }
    );

    const text = result.response.text().trim();
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return text;
  } catch (err) {
    if (err instanceof GoogleGenerativeAIFetchError) {
      console.error(
        "[gemini] API error:",
        err.status,
        err.statusText ?? "",
        err.message
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a short fun fact about a movie via Google Gemini (server-only).
 * Retries once on HTTP 429 after a short backoff (helps transient rate limits).
 */
export async function generateMovieFact(movieTitle: string): Promise<string> {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    try {
      return await generateMovieFactOnce(movieTitle);
    } catch (err) {
      const is429 =
        err instanceof GoogleGenerativeAIFetchError && err.status === 429;
      if (is429 && attempt < MAX_429_RETRIES) {
        const backoffMs = 2000 + Math.floor(Math.random() * 1000);
        console.warn(`[gemini] 429 — retrying once in ${backoffMs}ms`);
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("generateMovieFact: exhausted retries");
}
