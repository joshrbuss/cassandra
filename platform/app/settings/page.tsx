import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ConnectButtons from "./ConnectButtons";
import ImportedPuzzlesWidget from "./ImportedPuzzlesWidget";
import { getImportedPuzzleCount, getTotalImportedCount } from "@/lib/jobs/importGames";

export const metadata = {
  title: "Account Settings",
};

export default async function SettingsPage() {
  const session = await auth();

  let user: {
    id: string;
    lichessUsername: string | null;
    chessComUsername: string | null;
    elo: number | null;
  } | null = null;

  let thisWeek = 0;
  let total = 0;

  if (session?.userId) {
    [user, thisWeek, total] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, lichessUsername: true, chessComUsername: true, elo: true },
      }),
      getImportedPuzzleCount(session.userId),
      getTotalImportedCount(session.userId),
    ]);
  }

  const hasLinkedAccount = !!(user?.lichessUsername || user?.chessComUsername);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">
            Account Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect your chess accounts to personalise your experience.
          </p>
        </div>

        <ConnectButtons
          lichessUsername={user?.lichessUsername ?? null}
          chessComUsername={user?.chessComUsername ?? null}
          elo={user?.elo ?? null}
        />

        {user && (
          <div className="mt-4">
            <ImportedPuzzlesWidget
              userId={user.id}
              hasLinkedAccount={hasLinkedAccount}
              initialTotal={total}
              initialThisWeek={thisWeek}
            />
          </div>
        )}
      </div>
    </main>
  );
}
