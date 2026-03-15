"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface Props {
  lichessUsername: string | null;
  chessComUsername: string | null;
}

export default function OnboardingClient({ lichessUsername, chessComUsername }: Props) {
  const [lichessError, setLichessError] = useState<string | null>(null);
  const [ccError, setCcError] = useState<string | null>(null);
  const [lichessPending, setLichessPending] = useState(false);
  const [ccPending, setCcPending] = useState(false);

  const hasLinked = !!(lichessUsername || chessComUsername);

  async function handleLichessSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLichessError(null);
    setLichessPending(true);
    try {
      const form = e.currentTarget;
      const username = (form.elements.namedItem("username") as HTMLInputElement).value.trim();

      const res = await fetch("/api/auth/lichess-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = (await res.json()) as { userId?: string; error?: string };

      if (!res.ok || !data.userId) {
        setLichessError(data.error ?? "Something went wrong. Please try again.");
        setLichessPending(false);
        return;
      }

      await signIn("credentials", { userId: data.userId, callbackUrl: "/dashboard" });
      // signIn redirects — we won't reach here on success
    } catch {
      setLichessError("Something went wrong. Please try again.");
      setLichessPending(false);
    }
  }

  async function handleCcSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCcError(null);
    setCcPending(true);
    try {
      const form = e.currentTarget;
      const username = (form.elements.namedItem("username") as HTMLInputElement).value.trim();

      const res = await fetch("/api/auth/chesscom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = (await res.json()) as { userId?: string; error?: string };

      if (!res.ok || !data.userId) {
        setCcError(data.error ?? "Something went wrong. Please try again.");
        setCcPending(false);
        return;
      }

      await signIn("credentials", { userId: data.userId, callbackUrl: "/dashboard" });
      // signIn redirects — we won't reach here on success
    } catch {
      setCcError("Something went wrong. Please try again.");
      setCcPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Lichess */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Lichess</p>
            {lichessUsername ? (
              <p className="text-xs text-gray-500">
                Connected as{" "}
                <a
                  href={`https://lichess.org/@/${lichessUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {lichessUsername}
                </a>
              </p>
            ) : (
              <p className="text-xs text-gray-400">Enter your username</p>
            )}
          </div>
          {lichessUsername && (
            <span className="ml-auto text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              Connected ✓
            </span>
          )}
        </div>

        {!lichessUsername && (
          <form onSubmit={handleLichessSubmit} className="flex gap-2">
            <input
              type="text"
              name="username"
              placeholder="Your Lichess username"
              autoComplete="off"
              required
              className="flex-1 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={lichessPending}
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {lichessPending ? "Checking…" : "Connect"}
            </button>
          </form>
        )}

        {lichessError && (
          <p className="text-xs text-red-600 mt-2">{lichessError}</p>
        )}
      </div>

      {/* Chess.com */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Chess.com</p>
            {chessComUsername ? (
              <p className="text-xs text-gray-500">
                Connected as{" "}
                <a
                  href={`https://www.chess.com/member/${chessComUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {chessComUsername}
                </a>
              </p>
            ) : (
              <p className="text-xs text-gray-400">Enter your username</p>
            )}
          </div>
          {chessComUsername && (
            <span className="ml-auto text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              Connected ✓
            </span>
          )}
        </div>

        {!chessComUsername && (
          <form onSubmit={handleCcSubmit} className="flex gap-2">
            <input
              type="text"
              name="username"
              placeholder="Your Chess.com username"
              autoComplete="off"
              required
              className="flex-1 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              disabled={ccPending}
              className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {ccPending ? "Checking…" : "Connect"}
            </button>
          </form>
        )}

        {ccError && (
          <p className="text-xs text-red-600 mt-2">{ccError}</p>
        )}
      </div>

      {/* Continue */}
      <a
        href="/dashboard"
        className={`flex items-center justify-center w-full h-12 rounded-full font-semibold transition-colors ${
          hasLinked
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-400 pointer-events-none"
        }`}
        aria-disabled={!hasLinked}
      >
        Continue to my puzzles →
      </a>

      {!hasLinked && (
        <p className="text-center text-xs text-gray-400">
          Connect at least one account to continue.
        </p>
      )}

      {hasLinked && (
        <p className="text-center text-xs text-gray-400 pt-2">
          <a href="/api/auth/signout" className="hover:underline">
            Sign out
          </a>
        </p>
      )}
    </div>
  );
}
