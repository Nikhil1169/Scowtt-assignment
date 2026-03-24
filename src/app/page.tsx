import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import { LandingPrismHero } from "@/components/landing-prism-hero";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true },
    });
    if (user?.onboardingCompleted) {
      redirect("/dashboard");
    }
    redirect("/onboarding");
  }

  return (
    <LandingPrismHero
      primaryCta={
        <SignInButton className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-100 px-8 py-3.5 text-base font-medium text-zinc-900 shadow-lg shadow-black/40 transition hover:bg-white hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/60 active:scale-[0.99] sm:w-auto" />
      }
    />
  );
}
