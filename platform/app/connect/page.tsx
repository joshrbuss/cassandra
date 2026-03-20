import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getT, resolveLocale, LOCALE_COOKIE, preloadLocale } from "@/lib/i18n";
import ConnectClient from "./ClientShell";
import CassandraLogo from "@/components/CassandraLogo";

export const metadata = {
  title: "Connect — Cassandra",
  description: "Connect your Chess.com or Lichess account to get personalised puzzles from your own games.",
  openGraph: { title: "Connect — Cassandra", description: "Connect your Chess.com or Lichess account to get personalised puzzles." },
  twitter: { title: "Connect — Cassandra", description: "Connect your Chess.com or Lichess account to get personalised puzzles." },
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const session = await auth();

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lichessUsername: true, chessComUsername: true },
    });
    if (user?.lichessUsername || user?.chessComUsername) {
      redirect("/home");
    }
  }

  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  await preloadLocale(locale);
  const t = getT(locale);

  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <CassandraLogo className="w-10 h-10 mb-4 inline-block" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {t("connect.title")}
          </h1>
          <p className="text-gray-400 text-sm">
            {t("connect.subtitle")}
          </p>
        </div>

        <ConnectClient refCode={ref ?? null} />

        <p className="text-center text-xs text-gray-600 mt-8">
          {t("connect.alreadySetUp")}{" "}
          <a href="/home" className="text-[#c8942a] hover:underline">
            {t("connect.goToDashboard")}
          </a>
        </p>
      </div>
    </main>
  );
}
