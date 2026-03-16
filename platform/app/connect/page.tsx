import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ConnectClient from "./ConnectClient";

export const metadata = {
  title: "Connect — Cassandra Chess",
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

  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <span className="w-10 h-10 rounded-lg bg-[#c8942a] inline-flex items-center justify-center text-white font-bold text-lg mb-4">
            C
          </span>
          <h1 className="text-2xl font-bold text-white mb-2">
            Connect your chess account
          </h1>
          <p className="text-gray-400 text-sm">
            We&apos;ll analyse your games and build personalised puzzles.
          </p>
        </div>

        <ConnectClient refCode={ref ?? null} />

        <p className="text-center text-xs text-gray-600 mt-8">
          Already set up?{" "}
          <a href="/home" className="text-[#c8942a] hover:underline">
            Go to dashboard
          </a>
        </p>
      </div>
    </main>
  );
}
