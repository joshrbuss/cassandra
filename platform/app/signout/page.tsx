import type { Metadata } from "next";
import SignOutClient from "./SignOutClient";

export const metadata: Metadata = {
  title: "Sign Out — Cassandra Chess",
};

export default function SignOutPage() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <span className="w-10 h-10 rounded-lg bg-[#c8942a] inline-flex items-center justify-center text-white font-bold text-lg mb-6">
          C
        </span>
        <h1 className="text-xl font-bold text-white mb-2">
          Sign out of Cassandra Chess?
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Your puzzles and progress will be here when you come back.
        </p>
        <SignOutClient />
      </div>
    </main>
  );
}
