"use client";

import type { ReactNode } from "react";
import Prism from "@/components/prism/Prism";

type Props = {
  /** Google sign-in (server action form). */
  primaryCta: ReactNode;
};

/**
 * Prism WebGL background only, with centered Movie Memory title and sign-in CTA.
 */
export function LandingPrismHero({ primaryCta }: Props) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#030304] text-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 z-0 min-h-dvh"
        aria-hidden
      >
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
          bloom={1.1}
          suspendWhenOffscreen
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-[1] bg-gradient-to-b from-black/25 via-transparent to-black/75"
        aria-hidden
      />

      <main className="pointer-events-auto relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400/85">
          Movie Memory
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Your favorite film, remembered
        </h1>
        <div className="mt-10 flex justify-center">{primaryCta}</div>
      </main>
    </div>
  );
}
