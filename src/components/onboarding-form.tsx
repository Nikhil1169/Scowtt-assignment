"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { OnboardingState } from "@/app/onboarding/actions";

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Saving…" : "Continue";
}

type Props = {
  saveAction: (
    prev: OnboardingState,
    formData: FormData
  ) => Promise<OnboardingState>;
};

export function OnboardingForm({ saveAction }: Props) {
  const [state, formAction] = useActionState(saveAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="block text-left text-sm font-medium text-zinc-300">
        Favorite movie
        <input
          name="title"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. The Silence of the Lambs"
          className="mt-2 w-full cursor-text rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </label>
      {state.error ? (
        <p
          className="rounded-lg border border-red-950/60 bg-red-950/35 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-full cursor-pointer rounded-xl bg-amber-600 px-4 py-3.5 font-semibold text-zinc-950 shadow-lg shadow-black/30 transition hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SubmitLabel />
      </button>
    </form>
  );
}
