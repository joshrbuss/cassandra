import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AnalysingClient from "./AnalysingClient";

export const metadata = {
  title: "Analysing your games — Cassandra Chess",
};

export default async function AnalysingPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { lichessUsername: true, chessComUsername: true },
  });

  if (!user?.lichessUsername && !user?.chessComUsername) {
    redirect("/connect");
  }

  const platform = user.chessComUsername ? "Chess.com" : "Lichess";

  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 py-16">
      <AnalysingClient platform={platform} />
    </main>
  );
}
