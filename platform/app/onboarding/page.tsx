import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import OnboardingClient from "./OnboardingClient";
import { getT, resolveLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const metadata = {
  title: "Get Started — Cassandra Chess",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const cookieStore = await cookies();
  const t = getT(resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value));
  const session = await auth();

  let lichessUsername: string | null = null;
  let chessComUsername: string | null = null;

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lichessUsername: true, chessComUsername: true },
    });
    lichessUsername = user?.lichessUsername ?? null;
    chessComUsername = user?.chessComUsername ?? null;

    // Already fully set up — send them straight to their dashboard
    if (lichessUsername || chessComUsername) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("onboarding.title")}
          </h1>
          <p className="text-gray-500">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <OnboardingClient
          lichessUsername={lichessUsername}
          chessComUsername={chessComUsername}
          refCode={ref ?? null}
        />

        <p className="text-center text-xs text-gray-400 mt-8">
          {t("onboarding.alreadySetUp")}{" "}
          <a href="/dashboard" className="text-blue-600 hover:underline">
            {t("onboarding.goToDashboard")}
          </a>
        </p>
      </div>
    </main>
  );
}
