import type { Metadata } from "next";
import SignOutClient from "./SignOutClient";
import CassandraLogo from "@/components/CassandraLogo";

export const metadata: Metadata = {
  title: "Sign Out — Cassandra",
};

export default function SignOutPage() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <CassandraLogo className="w-10 h-10 mb-6 inline-block" />
        <h1 className="text-xl font-bold text-white mb-2">
          Sign out of Cassandra?
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Your puzzles and progress will be here when you come back.
        </p>
        <SignOutClient />
      </div>
    </main>
  );
}
