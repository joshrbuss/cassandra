import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EchoShell from "./EchoShell";

export const metadata = {
  title: "The Echo — What Move Was Just Played?",
  description:
    "See a position and figure out what move was just played to reach it. The Echo trains retrograde analysis — thinking backwards from the result.",
};

export default async function EchoPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const total = await prisma.echoPosition.count();

  if (total === 0) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#c8942a] text-3xl mb-4">&#9194;</p>
        <h1 className="text-xl font-bold text-white mb-2">No Positions Available</h1>
        <p className="text-gray-500 text-sm mb-6">
          The Echo needs pre-seeded positions to work. Run the seeder script first.
        </p>
      </main>
    );
  }

  const skip = Math.floor(Math.random() * total);
  const position = await prisma.echoPosition.findFirst({
    orderBy: { id: "asc" },
    skip,
  });

  if (!position) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#c8942a] text-3xl mb-4">&#9194;</p>
        <h1 className="text-xl font-bold text-white mb-2">No Positions Available</h1>
        <p className="text-gray-500 text-sm mb-6">
          The Echo needs pre-seeded positions to work. Try again later.
        </p>
      </main>
    );
  }

  return (
    <EchoShell
      puzzleId={position.id}
      fenBefore={position.fenBefore}
      fenAfter={position.fenAfter}
      moveSan={position.moveSan}
      moveUci={position.moveUci}
      explanation={position.explanation}
    />
  );
}
