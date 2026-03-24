import { auth } from "@/auth";
import { getOrCreateMovieFact } from "@/lib/services/movie-fact";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET returns a fun fact for the signed-in user's favorite movie only (no IDs from client).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getOrCreateMovieFact(session.user.id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    fact: result.fact,
    source: result.source,
  });
}
