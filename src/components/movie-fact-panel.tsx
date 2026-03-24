"use client";

import { useEffect, useState } from "react";
import { Card, CardEyebrow } from "@/components/ui-shell";

type ApiOk = { fact: string; source?: string };
type ApiErr = { error: string };

export function MovieFactPanel() {
  const [fact, setFact] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/movie-fact", {
          cache: "no-store",
          signal: ac.signal,
        });
        const data = (await res.json()) as ApiOk & ApiErr;
        if (cancelled) return;
        if (!res.ok) {
          setError("error" in data ? data.error : "Something went wrong.");
          setLoading(false);
          return;
        }
        setFact(data.fact);
        setSource(data.source ?? null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Could not load a fun fact. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardEyebrow>Fun fact</CardEyebrow>
        <div className="flex items-center gap-3 pt-1">
          <span
            className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500/70"
            aria-hidden
          />
          <p className="text-sm text-zinc-400">Loading your fun fact…</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-950/60 bg-red-950/20 ring-red-900/20">
        <CardEyebrow>Error</CardEyebrow>
        <p className="text-sm text-red-300/95" role="alert">
          {error}
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-amber-950/35 bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 ring-amber-950/25">
      <CardEyebrow>Fun fact</CardEyebrow>
      <p className="text-lg leading-relaxed text-zinc-100 sm:text-xl">{fact}</p>
      {source === "fallback" ? (
        <p className="mt-4 rounded-lg border border-zinc-800/90 bg-black/40 px-3 py-2 text-sm text-amber-200/75">
          Showing a previously saved fact while Gemini is unavailable.
        </p>
      ) : null}
    </Card>
  );
}
