import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe(".env.example", () => {
  it("does not mark server-only secrets as NEXT_PUBLIC_*", () => {
    const text = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(text).not.toMatch(/NEXT_PUBLIC_.*(GEMINI|AUTH_SECRET|DATABASE|GOOGLE)/i);
  });
});
