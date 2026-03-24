import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { saveFavoriteMovie } from "@/app/onboarding/actions";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardEyebrow,
  CardSubtitle,
  CardTitle,
  PageShell,
} from "@/components/ui-shell";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });

  if (user?.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <PageShell centered>
      <Card className="w-full">
        <CardEyebrow>Onboarding</CardEyebrow>
        <CardTitle>Welcome</CardTitle>
        <CardSubtitle>
          Tell us your favorite movie — we&apos;ll use it for your personalized
          fun fact. The title must be 1–200 characters after trimming spaces.
        </CardSubtitle>
        <div className="mt-8">
          <OnboardingForm saveAction={saveFavoriteMovie} />
        </div>
      </Card>
    </PageShell>
  );
}
