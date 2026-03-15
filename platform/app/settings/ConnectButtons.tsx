"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  connectLichessUsername,
  connectChessComUsername,
  type ConnectState,
} from "@/app/actions/auth";

interface ConnectButtonsProps {
  lichessUsername: string | null;
  chessComUsername: string | null;
  elo: number | null;
}

export default function ConnectButtons({
  lichessUsername,
  chessComUsername,
  elo,
}: ConnectButtonsProps) {
  const router = useRouter();

  const [eloInput, setEloInput] = useState(String(elo ?? ""));
  const [eloSaving, setEloSaving] = useState(false);
  const [eloSaved, setEloSaved] = useState(false);
  const [eloError, setEloError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const [lichessState, lichessAction, lichessPending] = useActionState<ConnectState, FormData>(
    connectLichessUsername,
    null
  );
  const [ccState, ccAction, ccPending] = useActionState<ConnectState, FormData>(
    connectChessComUsername,
    null
  );

  async function saveElo() {
    const parsed = parseInt(eloInput, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 4000) {
      setEloError("Enter a rating between 0 and 4000.");
      return;
    }
    setEloError(null);
    setEloSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elo: parsed }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEloSaved(true);
      router.refresh();
    } catch {
      setEloError("Failed to save. Try again.");
    } finally {
      setEloSaving(false);
    }
  }

  async function unlink(provider: "lichess" | "chesscom") {
    setUnlinking(provider);
    try {
      await fetch("/api/auth/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      router.refresh();
    } finally {
      setUnlinking(null);
    }
  }

  const isSignedIn = !!(lichessUsername || chessComUsername);

  return (
    <div className="space-y-4">
      {/* Lichess */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
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
                <p className="text-xs text-gray-400">Not connected</p>
              )}
            </div>
          </div>

          {lichessUsername && (
            <button
              onClick={() => unlink("lichess")}
              disabled={unlinking === "lichess"}
              className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
            >
              {unlinking === "lichess" ? "Unlinking…" : "Unlink"}
            </button>
          )}
        </div>

        {!lichessUsername && (
          <form action={lichessAction} className="flex gap-2">
            <input type="hidden" name="callbackUrl" value="/settings" />
            <input
              type="text"
              name="username"
              placeholder="Your Lichess username"
              autoComplete="off"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={lichessPending}
              className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {lichessPending ? "Checking…" : "Connect"}
            </button>
          </form>
        )}

        {lichessState?.error && (
          <p className="text-xs text-red-600 mt-1">{lichessState.error}</p>
        )}
      </div>

      {/* Chess.com */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
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
                <p className="text-xs text-gray-400">Not connected</p>
              )}
            </div>
          </div>

          {chessComUsername && (
            <button
              onClick={() => unlink("chesscom")}
              disabled={unlinking === "chesscom"}
              className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
            >
              {unlinking === "chesscom" ? "Unlinking…" : "Unlink"}
            </button>
          )}
        </div>

        {!chessComUsername && (
          <form action={ccAction} className="flex gap-2">
            <input type="hidden" name="callbackUrl" value="/settings" />
            <input
              type="text"
              name="username"
              placeholder="Your Chess.com username"
              autoComplete="off"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              disabled={ccPending}
              className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {ccPending ? "Checking…" : "Connect"}
            </button>
          </form>
        )}

        {ccState?.error && (
          <p className="text-xs text-red-600 mt-1">{ccState.error}</p>
        )}
      </div>

      {/* Current ELO (when signed in) */}
      {isSignedIn && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">Rating</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={4000}
              value={eloInput || String(elo ?? "")}
              onChange={(e) => setEloInput(e.target.value)}
              placeholder="e.g. 1400"
              className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={saveElo}
              disabled={eloSaving}
              className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {eloSaving ? "Saving…" : "Update"}
            </button>
          </div>
          {eloError && <p className="text-xs text-red-600 mt-1">{eloError}</p>}
          {eloSaved && <p className="text-xs text-green-600 mt-1">Saved!</p>}
          <p className="text-xs text-gray-400 mt-1">
            Used to personalise puzzle difficulty.
          </p>
        </div>
      )}

      {/* Sign out */}
      {isSignedIn && (
        <div className="pt-2 text-center">
          <a href="/api/auth/signout" className="text-xs text-gray-400 hover:underline">
            Sign out
          </a>
        </div>
      )}
    </div>
  );
}
