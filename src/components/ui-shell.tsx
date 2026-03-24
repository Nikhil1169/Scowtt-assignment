import type { ReactNode } from "react";

/** Full-viewport dark canvas; cards sit above as elevated zinc surfaces. */
export function PageShell({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-950 text-zinc-100 [background-image:radial-gradient(ellipse_110%_70%_at_50%_-15%,rgba(251,191,36,0.06),transparent),linear-gradient(to_bottom,#09090b_0%,#0c0c0e_45%,#000000_100%)]">
      <div
        className={
          centered
            ? "mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14"
            : "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:max-w-4xl lg:py-12"
        }
      >
        {children}
      </div>
    </div>
  );
}

/** Elevated dark card — matches page background hierarchy (zinc-900 on zinc-950). */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800/90 bg-zinc-900/85 p-6 shadow-2xl shadow-black/50 ring-1 ring-zinc-700/35 backdrop-blur-md sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/75">
      {children}
    </p>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
      {children}
    </h1>
  );
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-base leading-relaxed text-zinc-400">{children}</p>
  );
}
