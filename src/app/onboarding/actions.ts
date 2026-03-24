"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { favoriteMovieTitleSchema } from "@/lib/validation/favorite-movie";
import { redirect } from "next/navigation";

export type OnboardingState = {
  error?: string;
};

/**
 * Validates favorite movie on the server, persists it, and marks onboarding complete.
 * All writes are scoped to the authenticated user id from the session (never from the client).
 */
export async function saveFavoriteMovie(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const raw = formData.get("title");
  const parsed = favoriteMovieTitleSchema.safeParse(
    typeof raw === "string" ? raw : ""
  );

  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0];
    return { error: first ?? "Invalid movie title." };
  }

  const title = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.favoriteMovie.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, title },
      update: { title },
    });
    await tx.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    });
  });

  redirect("/dashboard");
}
