"use client";

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  name: string | null | undefined;
  email: string | null | undefined;
  size?: number;
};

function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "?";
}

/**
 * OAuth avatars use plain <img> with referrerPolicy so Google CDNs load reliably
 * (Next/Image remotePatterns are easy to miss for lh* hosts). Falls back to initials on error.
 */
export function UserAvatar({ src, name, email, size = 72 }: Props) {
  const [loadFailed, setLoadFailed] = useState(false);
  const showPhoto = Boolean(src?.trim()) && !loadFailed;

  if (showPhoto) {
    return (
      <div
        className="shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 ring-1 ring-zinc-600/40"
        style={{ width: size, height: size }}
      >
        {/* OAuth avatars: plain img + no-referrer; avoids hostname allowlist issues */}
        {/* eslint-disable-next-line @next/next/no-img-element -- external Google CDN */}
        <img
          src={src!.trim()}
          alt={name ? `${name}'s profile` : "Profile"}
          width={size}
          height={size}
          className="h-full w-full object-cover object-center"
          referrerPolicy="no-referrer"
          onError={() => setLoadFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-lg font-semibold text-zinc-100 ring-1 ring-zinc-600/40"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name, email)}
    </div>
  );
}
