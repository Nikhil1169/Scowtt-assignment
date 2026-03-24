import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { MovieFactPanel } from "@/components/movie-fact-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardEyebrow, PageShell } from "@/components/ui-shell";

function displayName(
  name: string | null | undefined,
  email: string | null | undefined
) {
  if (name?.trim()) return name;
  if (email?.trim()) return email.split("@")[0] ?? "Movie fan";
  return "Movie fan";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { favoriteMovie: true },
  });

  if (!user?.onboardingCompleted || !user.favoriteMovie) {
    redirect("/onboarding");
  }

  return (
    <PageShell>
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <UserAvatar
              src={user.image ?? session.user.image}
              name={session.user.name ?? user.name}
              email={session.user.email ?? user.email}
              size={88}
            />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <CardEyebrow>Your profile</CardEyebrow>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                  {displayName(session.user.name, session.user.email)}
                </h1>
              </div>
              <dl className="space-y-3">
                <div className="rounded-xl border border-zinc-800/80 bg-black/35 px-4 py-3 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Email
                  </dt>
                  <dd className="mt-1 break-all text-sm text-zinc-200 sm:mt-0 sm:text-right">
                    {session.user.email ?? "—"}
                  </dd>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-black/35 px-4 py-3 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Favorite movie
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-amber-300/90 sm:mt-0 sm:text-right">
                    {user.favoriteMovie.title}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="shrink-0 lg:pt-1">
            <SignOutButton />
          </div>
        </div>
      </Card>

      <MovieFactPanel />
    </PageShell>
  );
}
